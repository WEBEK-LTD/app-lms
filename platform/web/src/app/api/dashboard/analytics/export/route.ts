import { NextResponse } from "next/server";
import { reportCsv } from "@/lib/analytics/csv";
import { loadReport, rangeFrom } from "@/lib/analytics/report";
import { itemWord } from "@/lib/analytics/words";
import { zoneOf } from "@/lib/analytics/zone";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";

/**
 * 44 GET /api/dashboard/analytics/export?range=30 (or range=custom&from&to):
 * the current app's analytics for the range as a CSV file. Totals only.
 */
export async function GET(request: Request): Promise<Response> {
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  // 60 Only for whoever on the team may open the page it comes from.
  if (!contextCan(context, "analytics")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const app = context.app;
  if (!app) return new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const query = new URL(request.url).searchParams;
  const now = new Date();
  // 47 Days in the app's time zone.
  const store = await getStore();
  const zone = zoneOf(app, context.client);
  const range = rangeFrom({ range: query.get("range"), from: query.get("from"), to: query.get("to") }, now, zone);
  const report = await loadReport(store, app.id, range, now, zone);
  // A byte order mark, so spreadsheets read titles in any language correctly.
  return new Response(`﻿${reportCsv(report, itemWord)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="analytics-${range.from}-to-${range.to}.csv"`,
      "cache-control": "no-store",
    },
  });
}
