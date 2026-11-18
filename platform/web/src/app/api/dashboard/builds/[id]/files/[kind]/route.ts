import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { planNeededFor } from "@/lib/builds/view";
import { buildFileRedirect } from "@/lib/files";
import { appPlanActive } from "@/lib/license/status";

/**
 * GET /api/dashboard/builds/<build>/files/<kind>: a Download button on Builds
 * & downloads. Checks that the build is one of the signed-in client's apps',
 * then redirects to a link on files.yallapp.com.tr signed at this moment, so
 * a page left open for a while never hands out an expired link. 187 The app's
 * own files (APK, AAB, IPA, store files) only while it has a paid plan.
 */
export async function GET(_: Request, { params }: RouteContext<"/api/dashboard/builds/[id]/files/[kind]">): Promise<Response> {
  const { id, kind } = await params;
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  // 60 Only for whoever on the team may open the page it comes from.
  if (!contextCan(context, "settings")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const store = await getStore();
  const build = /^[0-9a-f-]{36}$/i.test(id) ? await store.getBuild(id) : null;
  const app = build ? context.apps.find((a) => a.id === build.appId) : undefined;
  const own = build !== null && build.clientId === context.client.id && app !== undefined;
  // 187 The app itself only while it has a paid plan (our team managing the account aside).
  if (own && app && !context.staff && planNeededFor(kind) && !(await appPlanActive(store, app, new Date()))) {
    return new Response(null, { status: 303, headers: { location: new URL("/dashboard/builds?download=plan", appUrl()).toString(), "cache-control": "no-store" } });
  }
  return buildFileRedirect(own ? build : null, kind, "/dashboard/builds");
}
