import { safeEqual } from "./crypto/tokens";
import { trustedProxySecret } from "./env";

const IP = /^[0-9a-f.:]{2,45}$/i;

/**
 * The visitor's IP. Behind our own reverse proxy (yallapp.com.tr on host.webek.org),
 * that's the X-Yallapp-Client-Ip it sends with the shared secret; otherwise the IP
 * Netlify saw, or the first X-Forwarded-For hop.
 */
export function ipFromHeaders(list: Headers, proxySecret: string | undefined = trustedProxySecret()): string {
  if (proxySecret) {
    const sent = list.get("x-yallapp-proxy-secret");
    const ip = list.get("x-yallapp-client-ip")?.trim();
    if (sent && ip && IP.test(ip) && safeEqual(sent, proxySecret)) return ip;
  }
  return (
    list.get("x-nf-client-connection-ip") ??
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    list.get("x-real-ip") ??
    "unknown"
  );
}

const NO_STORE = { "cache-control": "no-store" };

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

export function errorResponse(status: number, code: string, message: string, extraHeaders: Record<string, string> = {}): Response {
  return json({ code, message }, status, extraHeaders);
}

export function rateLimited(retryAfter: number): Response {
  return errorResponse(429, "rate_limited", "Too many requests. Try again shortly.", { "retry-after": String(retryAfter) });
}

/** Reads a JSON body of at most `maxBytes`. Returns undefined when it isn't JSON. */
export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** Checks `Authorization: Bearer <token>` against the expected token in constant time. */
export function hasBearerToken(request: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return Boolean(match?.[1]) && safeEqual(match![1]!.trim(), expected);
}
