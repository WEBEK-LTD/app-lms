import { NextResponse } from "next/server";
import { getAdminRole, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/admin/permissions";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { receiptFilename } from "@/lib/receipts/build";
import { renderReceiptPdf, type ReceiptDocument } from "@/lib/receipts/pdf";
import { pdfResponse } from "@/lib/receipts/service";

export const dynamic = "force-dynamic";

/**
 * 73 GET /admin/payments/kept/<id>/pdf: the receipt of a payment kept for
 * billing after its account was deleted (Admin › Account deletion › Done),
 * made again from the receipt kept with it, for anyone on our team.
 */
export async function GET(_request: Request, { params }: RouteContext<"/admin/payments/kept/[id]/pdf">): Promise<Response> {
  const { id } = await params;
  if (!(await getCurrentUser())) return NextResponse.redirect(new URL("/sign-in", appUrl()), 303);
  if (!can(await getAdminRole(), "view")) return new Response("Not found.", { status: 404 });
  const record = await (await getStore()).getKeptBillingRecord(id);
  if (!record?.receipt) return new Response("Not found.", { status: 404 });
  return pdfResponse({ pdf: await renderReceiptPdf(record.receipt as unknown as ReceiptDocument), filename: receiptFilename(record.receiptNumber) });
}
