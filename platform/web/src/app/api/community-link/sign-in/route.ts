import { NextResponse } from "next/server";
import { NEXT_COOKIE, NEXT_TTL_SECONDS, safeNext } from "@/lib/apps/move-link";
import { appUrl, secureCookies } from "@/lib/env";

/**
 * 231 GET /api/community-link/sign-in?state=…&return=…: a community member
 * opened the link page without being signed in to Yallapp. Remembers the
 * page for 15 minutes and opens the sign-in; after it, they land on it.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  // 231 "Continue with Yallapp" comes here too, with its sign-in request instead of a link's state.
  const page =
    params.get("mode") === "signin"
      ? `/link-community?mode=signin&request=${encodeURIComponent(params.get("request") ?? "")}`
      : `/link-community?state=${params.get("state") ?? ""}&return=${params.get("return") === "app" ? "app" : "web"}`;
  const to = safeNext(page);
  const response = NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (to) response.cookies.set(NEXT_COOKIE, to, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: NEXT_TTL_SECONDS });
  return response;
}
