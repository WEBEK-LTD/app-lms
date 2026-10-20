import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { buildFileRedirect } from "@/lib/files";

/**
 * GET /api/dashboard/builds/<build>/files/<kind>: a Download button on Builds
 * & downloads. Checks that the build is one of the signed-in client's apps',
 * then redirects to a link on files.yallapp.com.tr signed at this moment, so
 * a page left open for a while never hands out an expired link.
 */
export async function GET(_: Request, { params }: RouteContext<"/api/dashboard/builds/[id]/files/[kind]">): Promise<Response> {
  const { id, kind } = await params;
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  // 60 Only for whoever on the team may open the page it comes from.
  if (!contextCan(context, "settings")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const build = /^[0-9a-f-]{36}$/i.test(id) ? await (await getStore()).getBuild(id) : null;
  const own = build !== null && build.clientId === context.client.id && context.apps.some((app) => app.id === build.appId);
  return buildFileRedirect(own ? build : null, kind, "/dashboard/builds");
}
