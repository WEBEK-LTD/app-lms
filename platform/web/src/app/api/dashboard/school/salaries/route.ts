import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { isMonth, payslipsCsv } from "@/lib/school/salaries";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";

const text = (body: string, status: number) => new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/**
 * 113.12 GET /api/dashboard/school/salaries?month=: the month's payslips
 * (base, allowances, bonuses, deductions, advances, the net, what is paid
 * and how) as a CSV file, for those of the client's team given Salaries.
 */
export async function GET(request: Request): Promise<Response> {
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  if (!contextCan(context, "salaries")) return text("Ask the owner for access.", 403);
  const app = context.app;
  if (!app || app.connector?.kind !== "school") return text("Not found.", 404);
  const store = await getStore();
  const asked = new URL(request.url).searchParams.get("month") ?? "";
  const month = isMonth(asked) ? asked : schoolToday(schoolSettingsOf(await store.getSchoolSettings(app.id), app), new Date()).slice(0, 7);
  const csv = payslipsCsv(await store.listSchoolPayslips(app.id, { month }), (await dashboardText()).k);
  // A byte order mark, so spreadsheets read names in any language correctly.
  return new Response(`﻿${csv}`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="salaries-${month}.csv"`, "cache-control": "no-store" },
  });
}
