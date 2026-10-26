"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readCustomer, startPayment } from "@/lib/catalog/payment";
import { chooseManualPayment, isManualMethod } from "@/lib/catalog/manual";
import { sendManualOrderMails } from "@/lib/catalog/manual-mail";
import { checkoutAccount, payLinkExpired } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ipFromHeaders } from "@/lib/http";
import { PaymentError } from "@/lib/payments/errors";
import { callbackUrls } from "@/lib/payments/routes";
import { settleOrderPayment } from "@/lib/payments/settle";
import { withDemoChecked } from "@/lib/demo/apps";
import { placeDemoOrder } from "@/lib/demo/checkout";
import { HoldEndedError } from "@/lib/events/holds";
import { noteAppError } from "@/lib/watch/app-errors";

/** 16 A demo app's payment page: places the order without taking any payment. */
export async function demoPayAction(token: string): Promise<void> {
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  const found = order ? await store.getAppById(order.appId) : null;
  const app = found ? await withDemoChecked(store, found) : null;
  if (!order || !app?.demo || order.status !== "pending" || payLinkExpired(order, new Date())) redirect(`/pay/${token}`);
  await placeDemoOrder(store, app, order, new Date());
  redirect(`/pay/${token}/order-received`);
}

/** The payment page's form: saves the customer's details and sends them to the provider's page (37 iyzico, Kashier, Fawaterk, Stripe or PayPal), or 96.2 places the order to pay by bank transfer or the owner's own method. */
export async function payAction(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["name", "phone", "email", "city", "address"].map((k) => [k, String(formData.get(k) ?? "")]));
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  if (!order) return { message: "This payment link isn't valid." };
  const now = new Date();
  if (order.status !== "pending") redirect(`/pay/${token}`);
  // 96.2 Already placed to pay by bank transfer or the owner's own method: its details are on the order's page.
  if (order.manualPayment) redirect(`/pay/${token}/order-received`);
  if (payLinkExpired(order, now)) return { message: "This payment link has expired. Go back to the app and check out again." };
  const app = await store.getAppById(order.appId);
  const method = String(formData.get("method") ?? "card");
  // 96.2 Bank transfer or the owner's own method: the order waits for the owner to mark it paid.
  if (app && isManualMethod(method)) {
    const settings = app.catalogSettings?.manualPayments;
    const checked = readCustomer(app, values);
    if (!checked.ok) return { errors: checked.errors, values };
    let chosen;
    try {
      chosen = settings ? await chooseManualPayment({ store, app, settings, order, customer: checked.customer, method, now }) : null;
    } catch (e) {
      if (e instanceof HoldEndedError) return { message: "The places held for this order were released. Go back to the app and get your tickets again." };
      throw e;
    }
    if (!chosen) return { message: "This payment method isn't offered any more. Choose another one.", values };
    const placed = await store.getCatalogOrder(app.id, order.id);
    if (placed) await sendManualOrderMails(store, app, placed, chosen);
    redirect(`/pay/${token}/order-received`);
  }
  const account = app ? await checkoutAccount(store, app, encryptionKey()) : null;
  if (!app || !account) return { message: "This shop can't take payments right now. Please try again later.", values };
  const checked = readCustomer(app, values);
  if (!checked.ok) return { errors: checked.errors, values };
  // 37 A Kashier or Fawaterk payment started earlier may have gone through without its redirect or webhook: read it back before starting another.
  if (order.providerRef && order.paymentProvider && order.paymentProvider !== "iyzico") {
    const earlier = await settleOrderPayment(token, { provider: order.paymentProvider });
    if (earlier.status === "paid" || earlier.status === "already_paid") redirect(earlier.path);
  }
  let pageUrl: string;
  try {
    pageUrl = await startPayment({
      store,
      app,
      account,
      urls: paymentApiUrls(),
      now,
      order,
      customer: checked.customer,
      ip: ipFromHeaders(await headers()),
      callbackUrls: callbackUrls(appUrl(), "order", account.account.provider, token),
    });
  } catch (e) {
    if (e instanceof HoldEndedError) return { message: "The places held for this order were released. Go back to the app and get your tickets again." };
    if (!(e instanceof PaymentError)) throw e;
    // 78.4 Counted for the team.
    await noteAppError(store, { clientId: app.clientId, appId: app.id, source: "payment", code: `${account.account.provider}_start_failed`, detail: e.message }, now);
    return { message: "The card payment couldn't start. Please try again in a moment.", values };
  }
  redirect(pageUrl);
}
