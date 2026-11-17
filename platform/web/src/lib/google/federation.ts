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
 * and scopes, per warm server. Nothing here is a secret Google issued: turning
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

/** Signs an assertion and exchanges it for the service account's access token. Throws FederationError. */
export async function exchangeForAccessToken(
  federation: Federation,
  input: { serviceAccount: string; subject: WifSubject; scopes: string[]; fetcher?: Fetch; now?: Date },
): Promise<FederatedToken> {
  const fetcher = input.fetcher ?? fetch;
  const now = input.now ?? new Date();
  const iat = Math.floor(now.getTime() / 1000);
  let assertion: string;
  try {
    assertion = await federation.sign({ iss: federation.issuer, sub: input.subject, aud: assertionAudience(federation.provider), iat, exp: iat + ASSERTION_SECONDS, jti: randomUUID() });
  } catch (error) {
    throw new FederationError("sign", `${STEP_TEXT.sign}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let federated: { access_token?: string };
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
  } catch (error) {
    throw wrap("exchange", error);
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
  return { token: account.accessToken, expiresAt: Number.isFinite(expires) ? expires : now.getTime() + TOKEN_LIFETIME_SECONDS * 1000 };
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
  input: { serviceAccount: string; subject: WifSubject; scopes: string[]; fetcher?: Fetch; now?: Date; fresh?: boolean },
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
