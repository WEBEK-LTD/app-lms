import { NextResponse } from "next/server";
import { getAdminRole, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/admin/permissions";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { orderReceiptPdf, pdfResponse } from "@/lib/receipts/service";

export const dynamic = "force-dynamic";

/**
 * 71 GET /admin/payments/orders/<app>/<order>/pdf: a shop's sale through
 * Yallapp's account (Payments › Shop sales) as the customer's receipt, for
 * anyone on our team.
 */
export async function GET(_request: Request, { params }: RouteContext<"/admin/payments/orders/[appId]/[orderId]/pdf">): Promise<Response> {
  const { appId, orderId } = await params;
  if (!(await getCurrentUser())) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!can(await getAdminRole(), "view")) return new Response("Not found.", { status: 404 });
  const store = await getStore();
  const id = /^\d{1,15}$/.test(orderId) ? Number(orderId) : null;
  const app = id !== null ? await store.getAppById(appId) : null;
  const order = app && id !== null ? await store.getCatalogOrder(app.id, id) : null;
  const receipt = app && order ? await orderReceiptPdf(store, app, order) : null;
  return receipt ? pdfResponse(receipt) : new Response("Not found.", { status: 404 });
}
