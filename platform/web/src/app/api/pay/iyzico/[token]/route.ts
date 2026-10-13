import { completePayment, newOrderMail } from "@/lib/catalog/payment";
import { accountForOrder } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";
import { sendMail } from "@/lib/mail";

/**
 * Where iyzico sends the customer back after the card payment, with its
 * token. The order is marked paid only after iyzico confirms the payment.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/iyzico/[token]">): Promise<Response> {
  const { token } = await params;
  const back = (path: string) => Response.redirect(`${appUrl()}/pay/${encodeURIComponent(token)}${path}`, 303);
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  if (!order) return Response.redirect(`${appUrl()}/pay/${encodeURIComponent(token)}`, 303);
  const app = await store.getAppById(order.appId);
  const account = app ? await accountForOrder(store, app, order, encryptionKey()) : null;
  if (!app || !account || typeof iyzicoToken !== "string" || iyzicoToken === "") return back("?payment=failed");
  const outcome = await completePayment({ store, app, account, baseUrl: iyzicoApiUrl(), now: new Date(), order, iyzicoToken });
  if (outcome === "paid") {
    const client = await store.getClientById(app.clientId);
    const owner = client ? await store.getUserById(client.userId) : null;
    const paid = await store.getCatalogOrder(app.id, order.id);
    if (owner && paid) {
      await sendMail({ to: owner.email, ...newOrderMail(paid, app.appName ?? "your app", `${appUrl()}/dashboard/orders`) }).catch(() => {
        // The order is paid either way; the dashboard lists it.
      });
    }
  }
  return outcome === "failed" ? back("?payment=failed") : back("/order-received");
}
