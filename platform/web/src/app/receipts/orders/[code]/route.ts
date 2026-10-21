import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { readOrderReceiptCode } from "@/lib/receipts/links";
import { customerLang, orderReceiptPdf, pdfResponse } from "@/lib/receipts/service";

export const dynamic = "force-dynamic";

/**
 * 71 GET /receipts/orders/<app>.<order>.<signature>: a paid order's receipt
 * as a PDF, from the receipt email, the order page after paying and the
 * app's order (`Order.receipt_url`). Only a link signed by us opens one. In
 * the language asked for (`lang`, else the browser's) when the app has it,
 * else the app's.
 */
export async function GET(request: Request, { params }: RouteContext<"/receipts/orders/[code]">): Promise<Response> {
  const { code } = await params;
  const named = readOrderReceiptCode(code, signingSecret());
  if (!named) return new Response("Not found.", { status: 404 });
  const store = await getStore();
  const app = await store.getAppById(named.appId);
  const order = app ? await store.getCatalogOrder(app.id, named.orderId) : null;
  if (!app || !order) return new Response("Not found.", { status: 404 });
  const wanted = new URL(request.url).searchParams.get("lang") ?? request.headers.get("accept-language");
  const receipt = await orderReceiptPdf(store, app, order, await customerLang(store, app, wanted));
  return receipt ? pdfResponse(receipt) : new Response("Not found.", { status: 404 });
}
