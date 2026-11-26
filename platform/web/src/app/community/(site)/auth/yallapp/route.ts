import { NextResponse } from "next/server";
import { cmLinks } from "@/components/community/site/links";
import { safeNext, YALLAPP_COOKIE } from "@/lib/community/site-yallapp";
import { randomToken } from "@/lib/crypto/tokens";
import { pkceChallenge, SITE_SIGNIN_PATH } from "@/lib/community/base/yallapp-signin";
import { communitySiteUrl } from "@/lib/community/deps";
import { communityApi } from "@/lib/community/site-client";
import { secureCookies } from "@/lib/env";

/**
 * 231 "Continue with Yallapp" on the community's website: a fresh state and
 * PKCE verifier, kept in an httpOnly cookie for 10 minutes, then Yallapp's
 * approval page. It comes back to ./callback.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = randomToken(24);
  const verifier = randomToken(32);
  const r = await communityApi<{ authorize_url?: string }>("POST", "/auth/yallapp/start", {
    body: { redirect_uri: `${communitySiteUrl()}${SITE_SIGNIN_PATH}`, code_challenge: pkceChallenge(verifier), code_challenge_method: "S256", state },
  });
  if (r.status !== 200 || !r.body.authorize_url) return NextResponse.redirect(new URL(`${cmLinks.signIn()}?error=yallapp`, url), 303);
  const response = NextResponse.redirect(r.body.authorize_url, 303);
  response.cookies.set(YALLAPP_COOKIE, JSON.stringify({ state, verifier, next: safeNext(url.searchParams.get("next")) }), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
