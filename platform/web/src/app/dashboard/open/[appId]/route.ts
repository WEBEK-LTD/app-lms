import { NextResponse } from "next/server";
import { APP_COOKIE, getClientContext } from "@/lib/auth/session";
import { appUrl, secureCookies } from "@/lib/env";

/** The pages an email may open on a given app. */
const PAGES: Record<string, string> = {
  builds: "/dashboard/builds",
  publishing: "/dashboard/publishing",
  license: "/dashboard/license",
  setup: "/dashboard/setup",
};

/**
 * GET /dashboard/open/<appId>?to=builds: links in emails about one app (an
 * account can have several). Makes it the dashboard's current app, then
 * opens the page. The choice only counts when the app is the signed-in
 * client's own (getClientContext checks it on every request), so a signed-out
 * visitor keeps it through signing in.
 */
export async function GET(request: Request, { params }: RouteContext<"/dashboard/open/[appId]">): Promise<Response> {
  const { appId } = await params;
  const to = PAGES[new URL(request.url).searchParams.get("to") ?? ""] ?? "/dashboard";
  const context = await getClientContext();
  const own = context?.apps.some((app) => app.id === appId) ?? false;
  const response = NextResponse.redirect(new URL(context ? to : "/sign-in", appUrl()), 303);
  response.headers.set("cache-control", "no-store");
  if (/^[0-9a-f-]{36}$/i.test(appId) && (own || !context)) {
    response.cookies.set(APP_COOKIE, appId, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60 });
  }
  return response;
}
