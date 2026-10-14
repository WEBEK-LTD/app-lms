import { NextResponse } from "next/server";
import { can } from "@/lib/admin/permissions";
import { getAdminRole } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { buildFileRedirect } from "@/lib/files";

/** GET /api/admin/builds/<build>/files/<kind>: the admin's file links, signed when clicked like the client's. */
export async function GET(_: Request, { params }: RouteContext<"/api/admin/builds/[id]/files/[kind]">): Promise<Response> {
  const { id, kind } = await params;
  if (!can(await getAdminRole(), "view")) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  const build = /^[0-9a-f-]{36}$/i.test(id) ? await (await getStore()).getBuild(id) : null;
  return buildFileRedirect(build, kind, "/admin/builds?status=all");
}
