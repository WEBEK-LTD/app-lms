import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * 231 Sign in with Apple and Google: the identity token the app or website
 * got from the provider, checked against the provider's public keys, its
 * issuer and our audiences (the app's bundle id, the website's service id,
 * the OAuth client ids), all from the environment. No key is ever kept in
 * the code: the audiences are public ids; the keys are the providers'.
 *
 * - COMMUNITY_APPLE_AUDIENCES: the bundle id and the Services ID, comma-separated.
 * - COMMUNITY_GOOGLE_CLIENT_IDS: the iOS, Android and web client ids, comma-separated.
 *
 * Tests pass a verifier made with `jwtVerifier` and their own key set.
 */
export interface VerifiedIdentity {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  /** Apple's hidden "private relay" address. */
  privateEmail: boolean;
  name: string | null;
  /** Apple: the SHA-256 of the nonce the app gave it, to compare with the raw one sent to us. */
  nonce: string | null;
}

export type IdTokenVerifier = (idToken: string) => Promise<VerifiedIdentity | null>;

export const APPLE_ISSUER = "https://appleid.apple.com";
export const APPLE_JWKS = "https://appleid.apple.com/auth/keys";
export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
export const GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";

const truthy = (value: unknown) => value === true || value === "true";

/** A verifier for one provider: its keys, issuers and our audiences. */
export function jwtVerifier(keys: JWTVerifyGetKey, issuer: string | string[], audience: string[]): IdTokenVerifier {
  return async (idToken) => {
    try {
      const { payload } = await jwtVerify(idToken, keys, { issuer, audience, clockTolerance: 60 });
      if (typeof payload.sub !== "string" || payload.sub === "") return null;
      const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
      return {
        subject: payload.sub,
        email,
        emailVerified: email !== null && truthy(payload.email_verified),
        privateEmail: truthy(payload.is_private_email),
        name: typeof payload.name === "string" ? payload.name : null,
        nonce: typeof payload.nonce === "string" ? payload.nonce : null,
      };
    } catch {
      return null;
    }
  };
}

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

let apple: IdTokenVerifier | null | undefined;
let google: IdTokenVerifier | null | undefined;

/** Apple's verifier from the environment; null when COMMUNITY_APPLE_AUDIENCES isn't set. */
export function appleVerifier(): IdTokenVerifier | null {
  if (apple === undefined) {
    const audiences = list(process.env.COMMUNITY_APPLE_AUDIENCES);
    apple = audiences.length ? jwtVerifier(createRemoteJWKSet(new URL(APPLE_JWKS)), APPLE_ISSUER, audiences) : null;
  }
  return apple;
}

/** Google's verifier from the environment; null when COMMUNITY_GOOGLE_CLIENT_IDS isn't set. */
export function googleVerifier(): IdTokenVerifier | null {
  if (google === undefined) {
    const audiences = list(process.env.COMMUNITY_GOOGLE_CLIENT_IDS);
    google = audiences.length ? jwtVerifier(createRemoteJWKSet(new URL(GOOGLE_JWKS)), GOOGLE_ISSUERS, audiences) : null;
  }
  return google;
}
