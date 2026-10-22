import { NextResponse, type NextRequest } from "next/server";
import { newNonce, noncePolicy, themeScriptHash } from "./lib/csp-nonce";

/**
 * 69.12 The signed-in pages (the dashboard, the admin) and the sign-in forms
 * limit scripts to this request's nonce: an injected script can't run there.
 * Next.js reads the nonce from the request's policy and puts it on its own
 * scripts. These pages are rendered for each request anyway; the website's
 * pages stay static, with the policy of next.config.ts.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const policy = noncePolicy(newNonce(), await themeScriptHash(), process.env.NODE_ENV === "development");
  const headers = new Headers(request.headers);
  headers.set("content-security-policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?:ar/|tr/)?(?:dashboard|admin|sign-in|sign-up|reset-password|pending|team/join)(?:/.*)?)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
