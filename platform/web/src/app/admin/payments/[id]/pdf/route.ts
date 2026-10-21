import { NextResponse } from "next/server";
import { getAdminRole, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/admin/permissions";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { pdfResponse, planReceiptPdf } from "@/lib/receipts/service";

export const dynamic = "force-dynamic";

/**
 * 71 GET /admin/payments/<id>/pdf: a client's plan or storage payment as the
 * receipt they got, in their language, for anyone on our team (the
 * Payments page and a client's page are read-only for everyone).
 */
export async function GET(_request: Request, { params }: RouteContext<"/admin/payments/[id]/pdf">): Promise<Response> {
  const { id } = await params;
  if (!(await getCurrentUser())) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!can(await getAdminRole(), "view")) return new Response("Not found.", { status: 404 });
  const store = await getStore();
  const payment = (await store.listPlanPayments({ id, limit: 1 })).find((p) => p.id === id && p.status === "paid");
  const receipt = payment ? await planReceiptPdf(store, payment) : null;
  return receipt ? pdfResponse(receipt) : new Response("Not found.", { status: 404 });
}
