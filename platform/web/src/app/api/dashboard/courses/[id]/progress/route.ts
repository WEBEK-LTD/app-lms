import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { courseReport, courseReportCsv } from "@/lib/courses/report";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";

/**
 * 90.2 GET /api/dashboard/courses/<course>/progress: each student's progress
 * and quiz results in a course managed in Yallapp, as a CSV file, for the
 * signed-in client's current app only.
 */
export async function GET(_: Request, { params }: RouteContext<"/api/dashboard/courses/[id]/progress">): Promise<Response> {
  const { id } = await params;
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  // Only for whoever on the team may open the Courses pages.
  if (!contextCan(context, "catalog")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const app = context.app;
  const course = app && app.connector?.kind === "courses" && /^\d{1,9}$/.test(id) ? courseSetup(app).courses.find((c) => c.id === Number(id)) : undefined;
  if (!app || !course) return new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const rows = await courseReport(await getStore(), app, course);
  const name = course.title.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).toLowerCase() || "course";
  // A byte order mark, so spreadsheets read names in any language correctly.
  return new Response(`﻿${courseReportCsv(course, rows, (await dashboardText()).k)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="students-${name}.csv"`,
      "cache-control": "no-store",
    },
  });
}
