import { NextResponse, type NextRequest } from "next/server";
import { newNonce, noncePolicy, themeScriptHash } from "./lib/csp-nonce";

/**
 * 231 Yallapp Community's website: requests to its host
 * (community.yallapp.com.tr, and community.localhost for local runs) are
 * served by the pages under src/app/community/: "/" there is
 * "/community", "/qa" is "/community/qa". Its API, /api/community/v1, and
 * Next's own files keep their paths.
 */
export const COMMUNITY_HOSTS = ["community.yallapp.com.tr", "community.localhost"];

export function isCommunityHost(host: string | null): boolean {
  const name = (host ?? "").toLowerCase().split(":")[0] ?? "";
  return COMMUNITY_HOSTS.includes(name);
}

/**
 * 231 Behind our own reverse proxy (deploy/apache-proxy-community.conf) the
 * platform sees Netlify's host, not the visitor's: the proxy names it in
 * X-Yallapp-Host, believed only with the proxy's shared secret
 * (TRUSTED_PROXY_SECRET, as for the visitor's IP).
 */
export const FORWARDED_HOST = "x-yallapp-host";
const PROXY_SECRET = "x-yallapp-proxy-secret";

/** Constant time for equal lengths, so a guessed secret learns nothing from the timing. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Whether the request is for the community's host: its own Host, or our proxy's X-Yallapp-Host with the shared secret. */
export function isCommunityRequest(headers: Headers, secret: string | undefined = process.env.TRUSTED_PROXY_SECRET): boolean {
  if (isCommunityHost(headers.get("host"))) return true;
  const named = headers.get(FORWARDED_HOST);
  const sent = headers.get(PROXY_SECRET);
  return Boolean(named && secret && secret.length >= 32 && sent && isCommunityHost(named) && sameSecret(sent, secret));
}

/** The page under src/app/community/ that serves a path on the community's host. */
export function communityPath(pathname: string): string {
  if (pathname === "/community" || pathname.startsWith("/community/")) return pathname;
  return pathname === "/" ? "/community" : `/community${pathname}`;
}

/**
 * 69.12 The signed-in pages (the dashboard, the admin) and the sign-in forms
 * limit scripts to this request's nonce: an injected script can't run there.
 * Next.js reads the nonce from the request's policy and puts it on its own
 * scripts. These pages are rendered for each request anyway; the website's
 * pages stay static, with the policy of next.config.ts. 231 The
 * community's pages are signed-in pages too.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const policy = noncePolicy(newNonce(), await themeScriptHash(), process.env.NODE_ENV === "development");
  const headers = new Headers(request.headers);
  headers.set("content-security-policy", policy);
  // 103R The page asked for, so the dashboard can send a Studio project's pages to Studio.
  headers.set("x-yallapp-path", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  // 231 The public folder's files (/brand/…, /favicon.svg) are the same on every host; only pages and the sitemap are the community's.
  const file = /\.[a-z0-9]+$/i.test(request.nextUrl.pathname) && request.nextUrl.pathname !== "/sitemap.xml";
  const community = !file && isCommunityRequest(request.headers);
  // A visitor's own X-Yallapp-Host goes no further than here.
  if (!community) headers.delete(FORWARDED_HOST);
  const response = community
    ? NextResponse.rewrite(new URL(`${communityPath(request.nextUrl.pathname)}${request.nextUrl.search}`, request.url), { request: { headers } })
    : NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?:ar/|tr/)?(?:dashboard|studio|admin|sign-in|sign-up|reset-password|pending|start|team/join)(?:/.*)?|link-community)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    // 231 Every page on the community's host (not its API, nor Next's files); its sitemap.xml is its own (app/community/sitemap.ts).
    {
      source: "/((?!api/|_next/|favicon\\.ico|robots\\.txt).*)",
      has: [{ type: "host", value: "community\\.(?:yallapp\\.com\\.tr|localhost)" }],
    },
    // 231 The same pages through our reverse proxy, which names the host in X-Yallapp-Host
    // (believed only with its secret; a visitor's own is dropped above).
    {
      source: "/((?!api/|_next/|favicon\\.ico|robots\\.txt).*)",
      has: [{ type: "header", key: "x-yallapp-host" }],
    },
  ],
};
