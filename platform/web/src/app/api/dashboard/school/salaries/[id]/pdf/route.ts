import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { dashboardLang } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { payslipPdfResponse } from "@/lib/school/salary-pdf";

/** 113.12 GET /api/dashboard/school/salaries/<id>/pdf: a payslip's PDF in the dashboard's language, for those given Salaries. */
export async function GET(_request: Request, { params }: RouteContext<"/api/dashboard/school/salaries/[id]/pdf">): Promise<Response> {
  const { id } = await params;
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  const app = context.app;
  const notFound = new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!contextCan(context, "salaries") || !app || app.connector?.kind !== "school" || !/^\d{1,15}$/.test(id)) return notFound;
  const payslip = await (await getStore()).getSchoolPayslip(app.id, Number(id));
  if (!payslip) return notFound;
  return payslipPdfResponse({ lang: await dashboardLang(), app, payslip }, "attachment");
}
