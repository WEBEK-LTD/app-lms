import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { isCheckinRole, monthCsv, monthReport } from "@/lib/school/checkin";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";

/**
 * 113.2 GET /api/dashboard/school/checkins?month=&role=: the month's report
 * (each person's school days, present, late, left early, absent, excused and
 * on leave) as a CSV file, for the signed-in client's current app only.
 */
export async function GET(request: Request): Promise<Response> {
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  if (!contextCan(context, "settings")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const app = context.app;
  if (!app || app.connector?.kind !== "school") return new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const query = new URL(request.url).searchParams;
  const store = await getStore();
  const now = new Date();
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const asked = query.get("month") ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : schoolToday(settings, now).slice(0, 7);
  const role = query.get("role") ?? "";
  const [report, classes] = await Promise.all([monthReport(store, app, month, now, isCheckinRole(role) ? { roles: [role] } : undefined), store.listSchoolClasses(app.id)]);
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const csv = monthCsv(
    report.rows,
    (r) => (r.role === "student" ? (r.person.classId ? (className.get(r.person.classId) ?? "") : "") : [r.person.jobTitle, r.person.department].filter(Boolean).join(" · ")),
    (await dashboardText()).k,
  );
  // A byte order mark, so spreadsheets read names in any language correctly.
  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="check-ins-${month}${isCheckinRole(role) ? `-${role}` : ""}.csv"`,
      "cache-control": "no-store",
    },
  });
}
