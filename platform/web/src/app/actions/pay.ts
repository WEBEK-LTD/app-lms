"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readCustomer, startPayment } from "@/lib/catalog/payment";
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

/** The payment page's form: saves the customer's details and sends them to the provider's page (37 iyzico, Kashier or Fawaterk). */
export async function payAction(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["name", "phone", "email", "city", "address"].map((k) => [k, String(formData.get(k) ?? "")]));
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  if (!order) return { message: "This payment link isn't valid." };
  const now = new Date();
  if (order.status !== "pending") redirect(`/pay/${token}`);
  if (payLinkExpired(order, now)) return { message: "This payment link has expired. Go back to the app and check out again." };
  const app = await store.getAppById(order.appId);
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
    if (!(e instanceof PaymentError)) throw e;
    return { message: "The card payment couldn't start. Please try again in a moment.", values };
  }
  redirect(pageUrl);
}
