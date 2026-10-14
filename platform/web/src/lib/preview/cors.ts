/**
 * 17 Cross-origin access for the app preview. The preview runs at
 * `<platform>/preview-app/`, so it normally shares its origin with the
 * hosted API and the preview config, and the browser needs nothing. These
 * headers cover the platform's other addresses (yallapp.com.tr is served
 * through a proxy, and Netlify gives every deploy its own address). Only the
 * platform's own origins are allowed; no cookies are involved.
 */

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

/** The platform's own origins: APP_URL and the addresses Netlify gives this deploy. */
export function previewOrigins(appUrl: string, env: Record<string, string | undefined> = process.env): string[] {
  const list = [appUrl, env.URL, env.DEPLOY_PRIME_URL, env.DEPLOY_URL].map(originOf).filter((o): o is string => o !== null);
  return [...new Set(list)];
}

/** The headers the app sends besides the ones browsers always allow. */
export const PREVIEW_ALLOWED_HEADERS = "Authorization, Content-Type, Accept-Language, If-None-Match, X-Yallapp-Preview";

/** CORS headers for a response to `origin`, when it is one of the platform's. */
export function corsHeaders(origin: string | null, allowed: string[], methods = "GET, POST, PUT, PATCH, DELETE, OPTIONS"): Record<string, string> {
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": methods,
    "access-control-allow-headers": PREVIEW_ALLOWED_HEADERS,
    "access-control-expose-headers": "ETag, X-Yallapp-Plugin-Version",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

/** The answer to a CORS preflight. */
export function preflight(origin: string | null, allowed: string[], methods?: string): Response {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store", ...corsHeaders(origin, allowed, methods) } });
}
