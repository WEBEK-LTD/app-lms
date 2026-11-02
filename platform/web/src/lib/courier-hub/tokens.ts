import { hmacSha256, randomToken, safeEqual, sha256Hex } from "../crypto/tokens";

/**
 * 104.8.2 Yallapp Courier's tokens, as Yallapp Business's (lib/owner/tokens.ts):
 * the access token is signed, not stored, and names the device, which is read
 * back on every request (a signed-out device stops at once); the refresh
 * token is a random secret kept only as its SHA-256, replaced each time.
 *
 * Access: `yc1.<device id>.<expires, unix seconds>.<signature>`.
 */

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_DAYS = 60;
const REFRESH_PREFIX = "ycr1_";
const ACCESS = /^yc1\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/;

/** The key for Yallapp Courier's access tokens only, so they can't pass for any other signature. */
export function accessKey(signingSecret: string): string {
  return hmacSha256(signingSecret, "courier-hub-access-token");
}

export function createAccessToken(deviceId: string, key: string, now: Date): { token: string; expiresAt: Date } {
  const expires = Math.floor(now.getTime() / 1000) + ACCESS_TTL_SECONDS;
  const payload = `yc1.${deviceId.toLowerCase()}.${expires}`;
  return { token: `${payload}.${hmacSha256(key, `courier:${payload}`)}`, expiresAt: new Date(expires * 1000) };
}

/** The device an access token names, when its signature is right and it hasn't ended. */
export function readAccessToken(token: string | null | undefined, key: string, now: Date): string | null {
  const match = ACCESS.exec((token ?? "").trim());
  if (!match) return null;
  const [, deviceId, expires, signature] = match as unknown as [string, string, string, string];
  if (!safeEqual(signature, hmacSha256(key, `courier:yc1.${deviceId}.${expires}`))) return null;
  if (Number(expires) * 1000 <= now.getTime()) return null;
  return deviceId;
}

export function newRefreshToken(now: Date): { token: string; hash: string; expiresAt: Date } {
  const token = `${REFRESH_PREFIX}${randomToken(32)}`;
  return { token, hash: sha256Hex(token), expiresAt: new Date(now.getTime() + REFRESH_TTL_DAYS * 86_400_000) };
}

/** What the store keeps of a refresh token; null for something that can't be one. */
export function refreshHash(token: unknown): string | null {
  if (typeof token !== "string" || !token.startsWith(REFRESH_PREFIX) || token.length > 100) return null;
  return sha256Hex(token);
}
