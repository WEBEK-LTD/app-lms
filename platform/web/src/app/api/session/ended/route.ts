import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LANG_COOKIE, preferredLang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth/session";
import { SIGNED_IN_COOKIE } from "@/lib/auth/signed-in-cookie";
import { appUrl } from "@/lib/env";

/**
 * 62 GET /api/session/ended: where the dashboard and the admin send someone
 * whose session ended on the server (signed out on another device, a new
 * password, an expired session). The cookies that are left (the session and
 * the readable "signed in" one the public pages read to show Dashboard) go,
 * then the sign-in page opens in the person's language. Someone still signed
 * in keeps their cookies.
 */
export async function GET(): Promise<Response> {
  const jar = await cookies();
  const signIn = new URL(localePath(preferredLang(null, jar.get(LANG_COOKIE)?.value), "/sign-in"), appUrl());
  const response = NextResponse.redirect(signIn, 303);
  response.headers.set("cache-control", "no-store");
  if (await getCurrentUser()) return response;
  for (const name of [SESSION_COOKIE, SIGNED_IN_COOKIE]) if (jar.has(name)) response.cookies.delete(name);
  return response;
}
