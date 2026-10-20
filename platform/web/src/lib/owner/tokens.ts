import { hmacSha256, randomToken, safeEqual, sha256Hex } from "../crypto/tokens";

/**
 * 58 Yallapp Business tokens. The access token is signed, not stored: it
 * names the device and when it ends, and the device is read back on every
 * request (so a signed-out device stops at once). The refresh token is a
 * random secret the server keeps only as its SHA-256, replaced each time it
 * is used.
 *
 * Access: `yo1.<device id>.<expires, unix seconds>.<signature>`.
 */

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_DAYS = 60;
const REFRESH_PREFIX = "yor1_";
const ACCESS = /^yo1\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/;

/** The key for owner access tokens only, so they can't pass for any other signature. */
export function accessKey(signingSecret: string): string {
  return hmacSha256(signingSecret, "owner-access-token");
}

export function createAccessToken(deviceId: string, key: string, now: Date): { token: string; expiresAt: Date } {
  const expires = Math.floor(now.getTime() / 1000) + ACCESS_TTL_SECONDS;
  const payload = `yo1.${deviceId.toLowerCase()}.${expires}`;
  return { token: `${payload}.${hmacSha256(key, `owner:${payload}`)}`, expiresAt: new Date(expires * 1000) };
}

/** The device an access token names, when its signature is right and it hasn't ended. */
export function readAccessToken(token: string | null | undefined, key: string, now: Date): string | null {
  const match = ACCESS.exec((token ?? "").trim());
  if (!match) return null;
  const [, deviceId, expires, signature] = match as unknown as [string, string, string, string];
  if (!safeEqual(signature, hmacSha256(key, `owner:yo1.${deviceId}.${expires}`))) return null;
  if (Number(expires) * 1000 <= now.getTime()) return null;
  return deviceId;
}

export function newRefreshToken(now: Date): { token: string; hash: string; expiresAt: Date } {
  const token = `${REFRESH_PREFIX}${randomToken(32)}`;
  return { token, hash: refreshHash(token), expiresAt: new Date(now.getTime() + REFRESH_TTL_DAYS * 86_400_000) };
}

/** What the store keeps of a refresh token; null for something that can't be one. */
export function refreshHash(token: string): string;
export function refreshHash(token: unknown): string | null;
export function refreshHash(token: unknown): string | null {
  if (typeof token !== "string" || !token.startsWith(REFRESH_PREFIX) || token.length > 100) return null;
  return sha256Hex(token);
}
