import { randomUUID } from "node:crypto";
import type { GoogleEndpoints } from "./endpoints";
import { GoogleApiError, googleJson, type Fetch } from "./http";
import type { PlatformClaims } from "./platform-keys";

/**
 * 136 Keyless access to Google through Workload Identity Federation, with the
 * platform as its own OpenID Connect issuer (lib/google/platform-keys.ts):
 *
 * 1. The platform signs a 5-minute ES256 assertion: `iss` its issuer,
 *    `sub` who asks (`push-sender` or `firebase-apps`, the only two the
 *    provider's attribute condition lets in), `aud` the provider.
 * 2. Google's Security Token Service exchanges it for a federated token.
 * 3. The IAM credentials API gives the service account's access token for
 *    it (an hour), to the scopes asked.
 *
 * Tokens are kept until a minute before they expire, one per service account
 * and scopes, per warm server. A passing failure of the exchange (Google or
 * the platform's issuer out of reach for a moment) is tried again twice.
 * Nothing here is a secret Google issued: turning
 * the provider off in Google Cloud stops it at once.
 */

export const WIF_SUBJECTS = { push: "push-sender", apps: "firebase-apps" } as const;
export type WifSubject = (typeof WIF_SUBJECTS)[keyof typeof WIF_SUBJECTS];

export const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
export const MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
/** How long an assertion is valid. */
export const ASSERTION_SECONDS = 300;
/** How long the service account's token is asked for. */
export const TOKEN_LIFETIME_SECONDS = 3600;

export interface Federation {
  /** `projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>`. */
  provider: string;
  /** The platform's issuer, `<APP_URL>/oidc`. */
  issuer: string;
  endpoints: GoogleEndpoints;
  /** Signs the assertion with the platform's key. */
  sign(claims: PlatformClaims): Promise<string>;
}

/** The provider's default allowed audience, which the assertion's `aud` must be. */
export const assertionAudience = (provider: string) => `https://iam.googleapis.com/${provider}`;
/** The audience the token exchange names. */
export const stsAudience = (provider: string) => `//iam.googleapis.com/${provider}`;

/** Which step of the exchange failed, and Google's words. */
export class FederationError extends Error {
  constructor(
    readonly step: "sign" | "exchange" | "impersonate",
    message: string,
    readonly googleError?: GoogleApiError,
  ) {
    super(message);
    this.name = "FederationError";
  }
}

const STEP_TEXT: Record<FederationError["step"], string> = {
  sign: "The platform couldn't sign its assertion",
  exchange: "Google's token service didn't accept the platform's assertion",
  impersonate: "Google didn't give the service account's token",
};

export interface FederatedToken {
  token: string;
  /** When it expires (ms since the epoch). */
  expiresAt: number;
}

/**
 * Delays before the second and third tries of the token exchange. Google's
 * token service reads the platform's discovery document and key set at each
 * exchange (or from its cache): when it can't reach them for a moment it
 * answers `invalid_grant: Error connecting to the given credential's issuer`.
 */
export const EXCHANGE_RETRY_DELAYS_MS = [1_000, 3_000] as const;

/** Google's words when it couldn't reach the issuer (not a refusal of the assertion). */
const ISSUER_UNREACHABLE = /\b(?:error connecting to|(?:could ?not|couldn't|unable to|failed to|cannot|can't) (?:connect to|reach)|timed? ?out (?:connecting to|reaching))\b[^.]*\bissuer\b/i;

/**
 * Whether a failed token exchange is worth another try: Google couldn't be
 * reached or timed out, it was busy (429, 5xx), or it couldn't reach the
 * platform's issuer. A refusal (a wrong audience, a bad signature, a subject
 * not let in) is never tried again.
 */
export function transientExchangeError(error: unknown): boolean {
  if (!(error instanceof GoogleApiError)) return false;
  if (error.httpStatus === 0 || error.httpStatus === 429 || error.httpStatus >= 500) return true;
  return error.httpStatus === 400 && error.code === "invalid_grant" && ISSUER_UNREACHABLE.test(error.message);
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Signs an assertion and exchanges it for the service account's access token. Throws FederationError. */
export async function exchangeForAccessToken(
  federation: Federation,
  input: { serviceAccount: string; subject: WifSubject; scopes: string[]; fetcher?: Fetch; now?: Date; sleep?: (ms: number) => Promise<void> },
): Promise<FederatedToken> {
  const fetcher = input.fetcher ?? fetch;
  const sleep = input.sleep ?? pause;
  const started = (input.now ?? new Date()).getTime();
  const begun = Date.now();
  let federated: { access_token?: string } = {};
  // The exchange, tried again on a passing failure only, with a fresh assertion (a new jti) each time.
  for (let attempt = 1; ; attempt++) {
    const iat = Math.floor((started + (Date.now() - begun)) / 1000);
    let assertion: string;
    try {
      assertion = await federation.sign({ iss: federation.issuer, sub: input.subject, aud: assertionAudience(federation.provider), iat, exp: iat + ASSERTION_SECONDS, jti: randomUUID() });
    } catch (error) {
      throw new FederationError("sign", `${STEP_TEXT.sign}: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      federated = await googleJson(fetcher, `${federation.endpoints.sts}/v1/token`, {
        form: {
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          audience: stsAudience(federation.provider),
          scope: CLOUD_PLATFORM_SCOPE,
          requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
          subject_token: assertion,
          subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        },
      });
      break;
    } catch (error) {
      const delay = EXCHANGE_RETRY_DELAYS_MS[attempt - 1];
      if (delay === undefined || !transientExchangeError(error)) throw wrap("exchange", error);
      console.warn("[google] token exchange failed for a moment, trying again", { attempt, subject: input.subject, problem: error instanceof Error ? error.message : String(error) });
      await sleep(delay);
    }
  }
  if (!federated.access_token) throw new FederationError("exchange", `${STEP_TEXT.exchange}: no token came back.`);
  let account: { accessToken?: string; expireTime?: string };
  try {
    account = await googleJson(fetcher, `${federation.endpoints.iamCredentials}/v1/projects/-/serviceAccounts/${encodeURIComponent(input.serviceAccount)}:generateAccessToken`, {
      token: federated.access_token,
      body: { scope: input.scopes, lifetime: `${TOKEN_LIFETIME_SECONDS}s` },
    });
  } catch (error) {
    throw wrap("impersonate", error);
  }
  if (!account.accessToken) throw new FederationError("impersonate", `${STEP_TEXT.impersonate}: no token came back.`);
  const expires = account.expireTime ? Date.parse(account.expireTime) : NaN;
  return { token: account.accessToken, expiresAt: Number.isFinite(expires) ? expires : started + TOKEN_LIFETIME_SECONDS * 1000 };
}

function wrap(step: FederationError["step"], error: unknown): FederationError {
  const cause = error instanceof GoogleApiError ? error : undefined;
  return new FederationError(step, `${STEP_TEXT[step]}: ${error instanceof Error ? error.message : String(error)}`, cause);
}

/** Tokens by service account and scopes, kept until a minute before they expire (one per warm server). */
const tokens = new Map<string, FederatedToken>();

/** The service account's access token, reused while it lasts. */
export async function federatedAccessToken(
  federation: Federation,
  input: { serviceAccount: string; subject: WifSubject; scopes: string[]; fetcher?: Fetch; now?: Date; fresh?: boolean; sleep?: (ms: number) => Promise<void> },
): Promise<string> {
  const now = (input.now ?? new Date()).getTime();
  const key = `${federation.provider}\n${input.serviceAccount}\n${[...input.scopes].sort().join(" ")}`;
  const kept = tokens.get(key);
  if (!input.fresh && kept && kept.expiresAt - 60_000 > now) return kept.token;
  const token = await exchangeForAccessToken(federation, input);
  tokens.set(key, token);
  return token.token;
}

/** Tests: forgets the kept tokens. */
export function forgetFederatedTokens(): void {
  tokens.clear();
}
