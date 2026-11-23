import { importPKCS8, SignJWT, type JWK } from "jose";
import { decrypt } from "../crypto/encryption";
import { currentKey, ES256, keySetOf, newEs256Key } from "../crypto/es256-keys";
import type { DataStore } from "../data/store";
import type { PlatformKeyPurpose, PlatformSigningKey } from "../data/types";

/**
 * 136 The platform as its own OpenID Connect issuer, `<APP_URL>/oidc`: Google's
 * Workload Identity Federation trusts the ES256 assertions it signs and
 * gives a service account's access token for them (lib/google/federation.ts).
 * No Google key exists anywhere: the private keys are the platform's own,
 * stored encrypted with ENCRYPTION_KEY (context `platform-signing-key:<purpose>`),
 * the public keys published at `/oidc/jwks.json`. A key replaced stays
 * published for two days, as nobody documents how long Google keeps a key
 * set it read.
 */

export const PLATFORM_KEY_ALG = ES256;
/** How long a retired key stays published: longer than any cache of the key set we know of. */
export const RETIRED_PLATFORM_KEY_SECONDS = 2 * 86_400;
/** How long the key set and the discovery document may be cached (Cache-Control max-age). */
export const OIDC_MAX_AGE_SECONDS = 300;
/** 216 How long after that a cache may still serve them while it fetches them again (stale-while-revalidate). */
export const OIDC_STALE_SECONDS = 3600;
/** 216 Cache-Control of the discovery document and the key set. */
export const OIDC_CACHE_CONTROL = `public, max-age=${OIDC_MAX_AGE_SECONDS}, stale-while-revalidate=${OIDC_STALE_SECONDS}`;
/** 216 How long one server keeps the key set it computed (`/oidc/jwks.json` reads no database meanwhile). */
export const JWKS_MEMORY_SECONDS = 60;

export const platformKeyContext = (purpose: PlatformKeyPurpose) => `platform-signing-key:${purpose}`;

/** The issuer (`iss`): the platform's address and `/oidc`. */
export function oidcIssuer(platformUrl: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/oidc`;
}

/** The discovery document Google reads at `<issuer>/.well-known/openid-configuration`. */
export function openIdConfiguration(platformUrl: string) {
  const issuer = oidcIssuer(platformUrl);
  return {
    issuer,
    jwks_uri: `${issuer}/jwks.json`,
    id_token_signing_alg_values_supported: [PLATFORM_KEY_ALG],
    response_types_supported: ["id_token"],
    subject_types_supported: ["public"],
    claims_supported: ["iss", "sub", "aud", "iat", "exp", "jti"],
  };
}

export async function newPlatformKey(purpose: PlatformKeyPurpose, encryptionKey: Buffer, now: Date): Promise<PlatformSigningKey> {
  return { ...(await newEs256Key(encryptionKey, platformKeyContext(purpose))), purpose, alg: PLATFORM_KEY_ALG, createdAt: now, retiredAt: null };
}

/** The key set of the published keys, newest first. Public parts only. */
export function platformJwks(keys: readonly PlatformSigningKey[], now: Date): { keys: JWK[] } {
  return keySetOf(keys, now, RETIRED_PLATFORM_KEY_SECONDS);
}

/** The key that signs now, made when there is none. */
export async function ensurePlatformKey(store: DataStore, purpose: PlatformKeyPurpose, encryptionKey: Buffer, now: Date): Promise<PlatformSigningKey> {
  const current = currentKey(await store.listPlatformSigningKeys(purpose));
  if (current) return current;
  const key = await newPlatformKey(purpose, encryptionKey, now);
  await store.createPlatformSigningKey(key);
  forgetPublishedJwks();
  return key;
}

/** 216 The key set `/oidc/jwks.json` served last, per purpose, and when it was computed. */
const published = new Map<PlatformKeyPurpose, { at: number; jwks: { keys: JWK[] } }>();

/**
 * 216 The key set to publish, kept JWKS_MEMORY_SECONDS by this server so
 * Google's reads cost no database query; the first key is made when there is
 * none. A key made or rotated here forgets it at once.
 */
export async function publishedPlatformJwks(load: () => Promise<DataStore>, encryptionKey: () => Buffer, now: Date, purpose: PlatformKeyPurpose = "gcp-wif"): Promise<{ keys: JWK[] }> {
  const kept = published.get(purpose);
  if (kept && now.getTime() - kept.at >= 0 && now.getTime() - kept.at < JWKS_MEMORY_SECONDS * 1000) return kept.jwks;
  const store = await load();
  let keys = await store.listPlatformSigningKeys(purpose);
  if (!keys.some((k) => k.retiredAt === null)) {
    await ensurePlatformKey(store, purpose, encryptionKey(), now);
    keys = await store.listPlatformSigningKeys(purpose);
  }
  const jwks = platformJwks(keys, now);
  if (jwks.keys.length > 0) published.set(purpose, { at: now.getTime(), jwks });
  return jwks;
}

/** 216 Forgets the kept key set (a key made or rotated; tests). */
export function forgetPublishedJwks(): void {
  published.clear();
}

/** Replaces the signing key: the current one is retired (still published two days), older retired ones are deleted. */
export async function rotatePlatformKey(store: DataStore, purpose: PlatformKeyPurpose, encryptionKey: Buffer, now: Date): Promise<PlatformSigningKey> {
  await store.deletePlatformSigningKeysRetiredBefore(purpose, new Date(now.getTime() - RETIRED_PLATFORM_KEY_SECONDS * 1000));
  const key = await newPlatformKey(purpose, encryptionKey, now);
  await store.retirePlatformSigningKeys(purpose, now);
  await store.createPlatformSigningKey(key);
  forgetPublishedJwks();
  return key;
}

/** The claims of an assertion the platform signs for Google. */
export interface PlatformClaims {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
}

/** Signs the claims with the key (`kid` in the header). */
export async function signPlatformJwt(key: PlatformSigningKey, encryptionKey: Buffer, claims: PlatformClaims): Promise<string> {
  if (!key.privateKeyEncrypted) throw new Error("This key no longer signs.");
  const privateKey = await importPKCS8(decrypt(key.privateKeyEncrypted, encryptionKey, platformKeyContext(key.purpose)), PLATFORM_KEY_ALG);
  return new SignJWT({})
    .setProtectedHeader({ alg: PLATFORM_KEY_ALG, typ: "JWT", kid: key.kid })
    .setIssuer(claims.iss)
    .setSubject(claims.sub)
    .setAudience(claims.aud)
    .setIssuedAt(claims.iat)
    .setExpirationTime(claims.exp)
    .setJti(claims.jti)
    .sign(privateKey);
}
