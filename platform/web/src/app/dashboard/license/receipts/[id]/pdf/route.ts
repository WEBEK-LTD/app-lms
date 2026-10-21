import { NextResponse } from "next/server";
import { contextCan, getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardLang } from "@/lib/dashboard-lang";
import { appUrl } from "@/lib/env";
import { pdfResponse, planReceiptPdf } from "@/lib/receipts/service";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

/**
 * 71 GET /dashboard/license/receipts/<id>/pdf: "Download PDF" on a plan or
 * storage payment's receipt, in the dashboard's language. Only one of the
 * account's own paid payments, for whoever on its team may see billing (a
 * member kept to some apps: only theirs); anything else is not found.
 */
export async function GET(_request: Request, { params }: RouteContext<"/dashboard/license/receipts/[id]/pdf">): Promise<Response> {
  const { id } = await params;
  const context = await getClientContext();
  if (!context) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!mayUseDashboard(context)) return NextResponse.redirect(new URL("/pending", appUrl()), 303);
  if (!contextCan(context, "billing")) return new Response("Ask the owner for access.", { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } });
  const store = await getStore();
  const payment = (await store.listPlanPayments({ clientId: context.client.id, id, limit: 1 })).find((p) => p.id === id && p.status === "paid");
  if (!payment || payment.clientId !== context.client.id) return notFound();
  // 60 A team member kept to some apps sees the receipts of those apps.
  if (payment.appId && !context.apps.some((a) => a.id === payment.appId)) return notFound();
  const receipt = await planReceiptPdf(store, payment, await dashboardLang());
  return receipt ? pdfResponse(receipt) : notFound();
}
