import { hmacSha256, safeEqual } from "./tokens";

/**
 * Short-lived signed links for downloads. The signature covers the path, the
 * sorted query parameters and the expiry time, so none of them can be changed.
 */

function canonical(path: string, params: Record<string, string>, expires: number): string {
  const entries = Object.entries(params)
    .filter(([key]) => key !== "sig" && key !== "expires")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `${path}?${entries}&expires=${expires}`;
}

export function signUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string>,
  secret: string,
  ttlSeconds: number,
  now: Date = new Date(),
): string {
  const expires = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const sig = hmacSha256(secret, canonical(path, params, expires));
  const query = new URLSearchParams({ ...params, expires: String(expires), sig });
  return `${baseUrl}${path}?${query.toString()}`;
}

export type SignatureCheck = "valid" | "expired" | "invalid";

export function verifySignedUrl(url: URL, secret: string, now: Date = new Date()): SignatureCheck {
  const sig = url.searchParams.get("sig");
  const expiresRaw = url.searchParams.get("expires");
  if (!sig || !expiresRaw || !/^\d+$/.test(expiresRaw)) return "invalid";
  const expires = Number(expiresRaw);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  const expected = hmacSha256(secret, canonical(url.pathname, params, expires));
  if (!safeEqual(sig, expected)) return "invalid";
  if (expires < Math.floor(now.getTime() / 1000)) return "expired";
  return "valid";
}
