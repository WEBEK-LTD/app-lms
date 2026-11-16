import { NextResponse } from "next/server";
import { NEXT_COOKIE, NEXT_TTL_SECONDS, safeNext } from "@/lib/apps/move-link";
import { appUrl, secureCookies } from "@/lib/env";

/**
 * 132.113 GET /api/app-moves/sign-in?to=<a move's page>: the owner opened
 * the email's link without being signed in. Remembers the page for 15
 * minutes and opens the sign-in; after it, they land on the page.
 */
export async function GET(request: Request): Promise<Response> {
  const to = safeNext(new URL(request.url).searchParams.get("to"));
  const response = NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (to) response.cookies.set(NEXT_COOKIE, to, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: NEXT_TTL_SECONDS });
  return response;
}
