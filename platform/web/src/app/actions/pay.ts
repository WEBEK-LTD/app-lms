"use server";

import { PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { chargedAmount, cityOptionalFor, readCustomer, startPayment } from "@/lib/catalog/payment";
import { payErrors, payLangOf, payMessage } from "@/lib/catalog/pay-words";
import { formatCents } from "@/lib/catalog/money";
import { chooseManualPayment, isManualMethod } from "@/lib/catalog/manual";
import { sendManualOrderMails } from "@/lib/catalog/manual-mail";
import { checkoutAccount, payLinkExpired } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, paymentApiUrls, stripeJsUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ipFromHeaders } from "@/lib/http";
import { PaymentError } from "@/lib/payments/errors";
import { StripeError } from "@/lib/payments/stripe";
import { callbackUrls } from "@/lib/payments/routes";
import { settleOrderPayment } from "@/lib/payments/settle";
import { withDemoChecked } from "@/lib/demo/apps";
import { placeDemoOrder } from "@/lib/demo/checkout";
import { HoldEndedError } from "@/lib/events/holds";
import { noteAppError } from "@/lib/watch/app-errors";
import { revalidatePath } from "next/cache";
import { quoteBeforePayment } from "@/lib/selling/in-app-pay";
import { inAppPayDeps } from "@/lib/selling/in-app-pay-env";
import { pushNewOrder } from "@/lib/owner/push";
import { pushOwnerSafely } from "@/lib/owner/push-env";

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

/**
 * 144 The payment page's state: with Stripe's card form to mount in the
 * page, once the details are in; 153 or iyzico's (its Checkout Form's
 * script) or Kashier's (its session's page, in a frame), with the
 * provider's own page for when it can't load, and Kashier's way back.
 */
export interface PayState extends FormState {
  stripe?: { clientSecret: string; publishableKey: string; jsUrl: string };
  iyzico?: { formContent: string; pageUrl: string };
  kashier?: { frameUrl: string; pageUrl: string; returnUrl: string };
}

/**
 * The payment page's form: saves the customer's details and sends them to
 * the provider's page (37 iyzico, Kashier, Fawaterk, Stripe or PayPal), 144
 * or with Stripe (153 iyzico, Kashier) shows its card form in the page, or
 * 96.2 places the order to pay by bank transfer or the owner's own method.
 * `hosted` (Stripe's form couldn't load) asks for Stripe's own page.
 */
/**
 * The payment page's form. 168 Its answers (each field's error, the
 * page's message) in the customer's language, the order's.
 */
export async function payAction(token: string, previous: PayState, formData: FormData): Promise<PayState> {
  const state = await payActionIn(token, previous, formData);
  const order = await (await getStore()).getCatalogOrderByToken(sha256Hex(token));
  const lang = payLangOf(order);
  if (lang === "en") return state;
  return { ...state, ...(state.message ? { message: payMessage(state.message, lang) } : {}), ...(state.errors ? { errors: payErrors(state.errors, lang) } : {}) };
}

async function payActionIn(token: string, _: PayState, formData: FormData): Promise<PayState> {
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
  // 134 A connected store's payment in the app is by card only: its platform's order is made once it's paid.
  const platformOrder = app ? await store.getStorePlatformOrder(app.id, order.id) : null;
  // 96.2 Bank transfer or the owner's own method: the order waits for the owner to mark it paid.
  if (app && isManualMethod(method) && !platformOrder) {
    const settings = app.catalogSettings?.manualPayments;
    const checked = readCustomer(app, values, { cityOptional: cityOptionalFor(order) });
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
    // 132 The owner's phones hear of it too: it waits for them to mark it paid.
    if (placed) await pushOwnerSafely((d) => pushNewOrder(d, app, placed), store);
    redirect(`/pay/${token}/order-received`);
  }
  const account = app ? await checkoutAccount(store, app, encryptionKey()) : null;
  if (!app || !account) return { message: "This shop can't take payments right now. Please try again later.", values };
  // 135.4 Never a currency the gateway doesn't take: said so, nothing sent.
  const charged = chargedAmount(order);
  if (!providerTakes(account.account.provider, charged.currency)) {
    return { message: `${PROVIDER_NAME[account.account.provider]} doesn't take payments in ${charged.currency}, so this shop can't take card payments for now. Choose another way to pay, or go back to the app.`, values };
  }
  const checked = readCustomer(app, values, { cityOptional: cityOptionalFor(order) });
  if (!checked.ok) return { errors: checked.errors, values };
  // 37 A Kashier or Fawaterk payment started earlier may have gone through without its redirect or webhook: read it back before starting another.
  if (order.providerRef && order.paymentProvider && order.paymentProvider !== "iyzico") {
    const earlier = await settleOrderPayment(token, { provider: order.paymentProvider });
    if (earlier.status === "paid" || earlier.status === "already_paid") redirect(earlier.path);
  }
  // 134 The platform prices it for this address (its shipping and tax) and checks the stock right before the payment.
  let payable = order;
  if (platformOrder) {
    const quoted = await quoteBeforePayment(inAppPayDeps(store, now), app, order, checked.customer);
    if (quoted && !quoted.ok) return { message: quoted.message, values };
    const fresh = await store.getCatalogOrder(app.id, order.id);
    if (!fresh) return { message: "This payment link isn't valid." };
    payable = fresh;
    if (quoted?.changed) {
      revalidatePath(`/pay/${token}`);
      return { message: `With the shipping and tax for your address, the total is ${formatCents(fresh.totalCents, fresh.currency)}. Check it, then tap Pay.`, values };
    }
  }
  const urls = callbackUrls(appUrl(), "order", account.account.provider, token);
  let started;
  try {
    started = await startPayment({
      store,
      app,
      account,
      urls: paymentApiUrls(),
      now,
      order: payable,
      customer: checked.customer,
      ip: ipFromHeaders(await headers()),
      callbackUrls: urls,
      hosted: formData.get("hosted") === "1",
    });
  } catch (e) {
    if (e instanceof HoldEndedError) return { message: "The places held for this order were released. Go back to the app and get your tickets again." };
    if (!(e instanceof PaymentError)) throw e;
    // 78.4 Counted for the team.
    await noteAppError(store, { clientId: app.clientId, appId: app.id, source: "payment", code: `${account.account.provider}_start_failed`, detail: e.message }, now);
    // 148 An order under the least the card can be charged: said so, with Stripe's own words (trying again would fail the same way).
    if (e instanceof StripeError && e.tooSmall) return { message: `This order is under the least amount a card can be charged (${e.message}) Add to your order, or choose another way to pay.`, values };
    return { message: "The card payment couldn't start. Please try again in a moment.", values };
  }
  // 144 Stripe's card form, in this page.
  if (started.stripe) return { values, stripe: { ...started.stripe, jsUrl: stripeJsUrl() } };
  // 153 iyzico's or Kashier's, in this page too; their own page if it can't load.
  if (started.embed?.provider === "iyzico") return { values, iyzico: { formContent: started.embed.formContent, pageUrl: started.url } };
  if (started.embed?.provider === "kashier") return { values, kashier: { frameUrl: started.embed.frameUrl, pageUrl: started.url, returnUrl: urls.returnUrl } };
  redirect(started.url);
}
