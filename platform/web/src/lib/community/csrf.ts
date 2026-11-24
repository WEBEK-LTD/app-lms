/**
 * 231 The website signs members in with a cookie (`yc_access`, SameSite
 * Lax). Lax keeps the cookie off cross-site POSTs, but every subdomain of
 * yallapp.com.tr is the same site; so a cookie-signed request that changes
 * something must come from the community's own pages: its Origin is one of
 * ours, or, without an Origin, the browser says it is same-origin. The
 * app's bearer token needs none of this (a page can't send it).
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function cookieRequestAllowed(method: string, headers: Headers, allowedOrigins: readonly string[]): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  const origin = headers.get("origin");
  if (origin) return allowedOrigins.includes(origin.toLowerCase().replace(/\/+$/, ""));
  return headers.get("sec-fetch-site") === "same-origin";
}

/** The origins the community's pages are served from: its site, Yallapp's (the same pages under /community), and local runs. */
export function communityOrigins(siteUrl: string, yallappUrl: string): string[] {
  const origin = (url: string) => {
    try {
      return new URL(url).origin.toLowerCase();
    } catch {
      return null;
    }
  };
  return [origin(siteUrl), origin(yallappUrl), ...(process.env.NODE_ENV === "production" ? [] : ["http://community.localhost:3000"])].filter((o): o is string => o !== null);
}
