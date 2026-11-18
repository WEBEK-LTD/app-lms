import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardLang } from "@/lib/dashboard-lang";
import { errorResponse } from "@/lib/http";
import { pdfResponse } from "@/lib/receipts/service";
import { payoutReceiptPdf } from "@/lib/studio-market/payout-mail";

/** 106.11 A sent payout's receipt as a PDF, in the dashboard's language: the designer's own only (the account's owner). */
export async function GET(_request: Request, { params }: RouteContext<"/designer/money/payouts/[id]/pdf">): Promise<Response> {
  const { id } = await params;
  const context = await clientFor("billing");
  if (!context || !mayUseDashboard(context) || !/^[0-9a-f-]{36}$/i.test(id)) return errorResponse(404, "not_found", "Not found.");
  const store = await getStore();
  const [designer, payout] = await Promise.all([store.getTemplateDesignerByClient(context.client.id), store.getDesignerPayout(id)]);
  if (!designer || !payout || payout.designerId !== designer.id) return errorResponse(404, "not_found", "Not found.");
  const receipt = await payoutReceiptPdf(store, payout, await dashboardLang());
  if (!receipt) return errorResponse(404, "not_found", "Not found.");
  return pdfResponse(receipt);
}
