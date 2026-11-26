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
  const community = isCommunityHost(request.headers.get("host"));
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
  ],
};
