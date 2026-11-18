import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { PAY_TOKEN, payStatusOf, type PayStatus } from "@/lib/payments/app-return";
import { platformOrderState } from "@/lib/selling/in-app-pay";

export const dynamic = "force-dynamic";

/**
 * 170 How a payment stands, for the app coming back from the phone's browser
 * sheet (by its return link, or the customer closing the sheet). Asked with
 * the payment's own token, which the app already holds; it says only the
 * state, never the order's contents.
 */
export async function GET(_request: Request, { params }: RouteContext<"/pay/[token]/status">): Promise<Response> {
  const { token } = await params;
  const headers = { "cache-control": "no-store", "content-type": "application/json" };
  if (!PAY_TOKEN.test(token)) return new Response(JSON.stringify({ state: "not_found" } satisfies PayStatus), { status: 404, headers });
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  const state = payStatusOf(order);
  const body: PayStatus = { state };
  if (order && state === "paid") {
    const shop = await platformOrderState(store, { id: order.appId }, order);
    if (shop) body.shop_order = shop.state;
  }
  return new Response(JSON.stringify(body), { status: order ? 200 : 404, headers });
}
