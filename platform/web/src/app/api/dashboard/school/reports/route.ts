import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { classGradebook, gradebookCsv, reportPeriod } from "@/lib/school/report-cards";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";

/**
 * 112.5 GET /api/dashboard/school/reports?class=&from=&to=: a class's
 * gradebook over the period as a CSV file, for the signed-in client's
 * current app only.
 */
export async function GET(request: Request): Promise<Response> {
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  if (!contextCan(context, "settings")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const app = context.app;
  const query = new URL(request.url).searchParams;
  const store = await getStore();
  const klass = app && app.connector?.kind === "school" ? (await store.listSchoolClasses(app.id)).find((c) => c.id === Number(query.get("class"))) : undefined;
  if (!app || !klass) return new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const period = reportPeriod(settings, { from: query.get("from") ?? undefined, to: query.get("to") ?? undefined }, schoolToday(settings, new Date()));
  const book = await classGradebook(store, app, klass.id, period);
  const name = klass.name.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).toLowerCase() || "class";
  // A byte order mark, so spreadsheets read names in any language correctly.
  return new Response(`﻿${gradebookCsv(book, (await dashboardText()).k)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="grades-${name}-${period.from}-${period.to}.csv"`,
      "cache-control": "no-store",
    },
  });
}
