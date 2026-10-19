import { calculateJwkThumbprint, createLocalJWKSet, exportJWK, exportPKCS8, generateKeyPair, importPKCS8, jwtVerify, SignJWT, type JWK } from "jose";
import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { AppAuthKey, HostedUser } from "../data/types";
import { yallappSignsIn } from "./sign-in-methods";
import { hostedApiUrl } from "./urls";

/**
 * 34 "Yallapp signs people in" for an app whose content comes from the
 * client's own API: Yallapp's hosted API serves the sign-in, account and
 * device endpoints for the app (lib/hosted/service.ts) and its access tokens
 * are JWTs signed with ES256 by a key pair of that app only. The client's API
 * checks them with the app's public keys, published at
 * `<hosted API>/.well-known/jwks.json`, and reads who signed in from the
 * claims. Refresh tokens stay opaque and single use.
 *
 * - `iss` is Yallapp's address, `aud` the app's ID: a token of one app is
 *   never valid for another.
 * - `sub` is the person's Yallapp user ID (a string, as RFC 7519 has it);
 *   `phone` and `email` only when proven by a code; `name`; `iat` and `exp`
 *   (15 minutes, like the hosted API's access tokens). `did` (the signed-in
 *   device) is Yallapp's own and missing from test tokens.
 * - Private keys never leave the server: PKCS#8, encrypted with
 *   ENCRYPTION_KEY and the context `app-auth-key:<app id>`. Replacing the key
 *   retires the current one (its private key is dropped at once); its public
 *   key stays published for a day, so tokens it signed and cached key sets
 *   keep working until they expire.
 */

export const SIGN_IN_ALG = "ES256";
/** How long a retired key stays published. */
export const RETIRED_KEY_SECONDS = 86_400;
/** How long the key set may be cached (Cache-Control max-age). */
export const JWKS_MAX_AGE_SECONDS = 300;

/** The claims of an access token Yallapp signs for an own API app. */
export interface YallappClaims {
  iss: string;
  aud: string;
  sub: string;
  /** The signed-in device (Yallapp's row ID). Missing from test tokens. */
  did?: string;
  /** E.164, proven by a code. */
  phone?: string;
  /** Lowercase, proven by a code. */
  email?: string;
  name: string;
  iat: number;
  exp: number;
}

export { yallappSignsIn };

/** The issuer (`iss`): Yallapp's address, without a trailing slash. */
export function tokenIssuer(platformUrl: string): string {
  return platformUrl.replace(/\/+$/, "");
}

/** Where the app's public keys are published. */
export function jwksUrl(platformUrl: string, appId: string): string {
  return `${hostedApiUrl(platformUrl, appId)}/.well-known/jwks.json`;
}

const keyContext = (appId: string) => `app-auth-key:${appId}`;

/** A new key pair for the app, the private key encrypted. */
export async function newAuthKey(appId: string, encryptionKey: Buffer, now: Date): Promise<AppAuthKey> {
  const { publicKey, privateKey } = await generateKeyPair(SIGN_IN_ALG, { extractable: true });
  const jwk = await exportJWK(publicKey);
  const publicJwk = { kty: jwk.kty!, crv: jwk.crv!, x: jwk.x!, y: jwk.y! };
  return {
    kid: await calculateJwkThumbprint(publicJwk),
    appId,
    alg: SIGN_IN_ALG,
    publicJwk,
    privateKeyEncrypted: encrypt(await exportPKCS8(privateKey), encryptionKey, keyContext(appId)),
    createdAt: now,
    retiredAt: null,
  };
}

/** The key that signs now: the newest one not retired. */
export function signingKey(keys: readonly AppAuthKey[]): AppAuthKey | null {
  return keys.find((k) => k.retiredAt === null && k.privateKeyEncrypted) ?? null;
}

/** The keys to publish: those signing now and those retired less than a day ago. */
export function publishedKeys(keys: readonly AppAuthKey[], now: Date): AppAuthKey[] {
  return keys.filter((k) => k.retiredAt === null || now.getTime() - k.retiredAt.getTime() < RETIRED_KEY_SECONDS * 1000);
}

/** The JSON Web Key Set (RFC 7517) of the app's published keys, newest first. Public parts only. */
export function jwksOf(keys: readonly AppAuthKey[], now: Date): { keys: JWK[] } {
  return {
    keys: publishedKeys(keys, now).map((k) => ({ kty: k.publicJwk.kty, crv: k.publicJwk.crv, x: k.publicJwk.x, y: k.publicJwk.y, kid: k.kid, alg: k.alg, use: "sig" })),
  };
}

/** The app's signing key, made when it has none. */
export async function ensureAuthKey(store: DataStore, appId: string, encryptionKey: Buffer, now: Date): Promise<AppAuthKey> {
  const current = signingKey(await store.listAppAuthKeys(appId));
  if (current) return current;
  const key = await newAuthKey(appId, encryptionKey, now);
  await store.createAppAuthKey(key);
  return key;
}

/** Replaces the app's signing key: the current one is retired (still published for a day), older retired ones are deleted. */
export async function rotateAuthKey(store: DataStore, appId: string, encryptionKey: Buffer, now: Date): Promise<AppAuthKey> {
  await store.deleteAppAuthKeysRetiredBefore(appId, new Date(now.getTime() - RETIRED_KEY_SECONDS * 1000));
  const key = await newAuthKey(appId, encryptionKey, now);
  await store.retireAppAuthKeys(appId, now);
  await store.createAppAuthKey(key);
  return key;
}

/** Signs the claims with the key. */
export async function signWithKey(key: AppAuthKey, encryptionKey: Buffer, claims: YallappClaims): Promise<string> {
  if (!key.privateKeyEncrypted) throw new Error("This key no longer signs.");
  const privateKey = await importPKCS8(decrypt(key.privateKeyEncrypted, encryptionKey, keyContext(key.appId)), SIGN_IN_ALG);
  const { iss, aud, sub, iat, exp, ...rest } = claims;
  return new SignJWT({ ...rest })
    .setProtectedHeader({ alg: SIGN_IN_ALG, typ: "JWT", kid: key.kid })
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject(sub)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(privateKey);
}

/** 49 The claims of a Security Event Token (RFC 8417) Yallapp sends an app's own API (lib/hosted/api-webhooks.ts). */
export interface SecurityEventClaims {
  iss: string;
  /** `<app ID>:events`: never an access token's audience. */
  aud: string;
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  events: Record<string, Record<string, never>>;
}

/** 49 Signs a notice with the app's key, as `secevent+jwt`. */
export async function signSecurityEvent(key: AppAuthKey, encryptionKey: Buffer, claims: SecurityEventClaims): Promise<string> {
  if (!key.privateKeyEncrypted) throw new Error("This key no longer signs.");
  const privateKey = await importPKCS8(decrypt(key.privateKeyEncrypted, encryptionKey, keyContext(key.appId)), SIGN_IN_ALG);
  return new SignJWT({ events: claims.events })
    .setProtectedHeader({ alg: SIGN_IN_ALG, typ: "secevent+jwt", kid: key.kid })
    .setIssuer(claims.iss)
    .setAudience(claims.aud)
    .setSubject(claims.sub)
    .setJti(claims.jti)
    .setIssuedAt(claims.iat)
    .setExpirationTime(claims.exp)
    .sign(privateKey);
}

/** The claims, or null when the token isn't one of these keys', is for another app or issuer, or has expired. */
export async function verifyWithKeys(
  token: string,
  keys: readonly AppAuthKey[],
  expected: { issuer: string; audience: string; now: Date },
): Promise<YallappClaims | null> {
  const set = jwksOf(keys, expected.now);
  if (set.keys.length === 0) return null;
  try {
    const { payload } = await jwtVerify(token, createLocalJWKSet(set), {
      issuer: expected.issuer,
      audience: expected.audience,
      algorithms: [SIGN_IN_ALG],
      currentDate: expected.now,
      requiredClaims: ["sub", "iat", "exp"],
    });
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number" || typeof payload.iat !== "number") return null;
    return payload as unknown as YallappClaims;
  } catch {
    return null;
  }
}

/** The person's claims: `phone` always proven (phone accounts sign in by code), `email` only for an account made by email sign-in. */
export function personClaims(user: Pick<HostedUser, "phone" | "email" | "name">): Pick<YallappClaims, "phone" | "email" | "name"> {
  return {
    ...(user.phone ? { phone: user.phone } : {}),
    // 34 An address typed at a phone sign-up was never proven: never sent, so nobody is matched by it.
    ...(user.phone === null && user.email ? { email: user.email } : {}),
    name: user.name,
  };
}

/** What the hosted API needs to sign and check an app's tokens, with its keys read once per request. */
export interface AppSignIn {
  issuer: string;
  /** Where the app sends sign-in and account calls: the hosted API's address for the app. */
  baseUrl: string;
  sign(claims: Omit<YallappClaims, "iss" | "aud">): Promise<string>;
  verify(token: string): Promise<YallappClaims | null>;
}

export function appSignIn(store: DataStore, appId: string, options: { encryptionKey: Buffer; platformUrl: string; now: () => Date }): AppSignIn {
  const issuer = tokenIssuer(options.platformUrl);
  let keys: Promise<AppAuthKey[]> | null = null;
  const load = () => (keys ??= store.listAppAuthKeys(appId));
  return {
    issuer,
    baseUrl: hostedApiUrl(options.platformUrl, appId),
    async sign(claims) {
      const key = signingKey(await load()) ?? (await ensureAuthKey(store, appId, options.encryptionKey, options.now()));
      return signWithKey(key, options.encryptionKey, { iss: issuer, aud: appId, ...claims });
    },
    async verify(token) {
      return verifyWithKeys(token, await load(), { issuer, audience: appId, now: options.now() });
    },
  };
}
