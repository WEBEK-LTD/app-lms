import "server-only";
import { sendPlanPaidMail } from "../billing/plan-mail";
import { completePlanPayment } from "../billing/plan-payment";
import { fulfilmentOf } from "../catalog/fulfilment";
import { completePayment, deliverPaidOrder, newOrderMailValues } from "../catalog/payment";
import { accountForOrder } from "../catalog/settings";
import { sha256Hex } from "../crypto/tokens";
import { getStore } from "../data";
import type { PaymentProviderId } from "../data/types";
import { completeDonationPayment, donationAccount, donationReceiptValues } from "../donations/payment";
import { receiptUrl } from "../donations/service";
import { sendTemplate } from "../email/send";
import { appUrl, encryptionKey, paymentApiUrls } from "../env";
import { yallappAccountFor } from "../settings/platform";
import type { PaymentAccount } from "./provider";
import { refreshSitesSoon } from "../license/refresh-soon";

/**
 * 37 What happens when a provider calls back: iyzico's callback (POST with
 * its token), Kashier's and Fawaterk's redirect (GET) and webhook (POST).
 * Each finds the payment by the token in its address, takes the account
 * the payment started with, reads the payment back from the provider and,
 * the first time it is confirmed, delivers it (plan, order, donation) and
 * sends its email. The same settle function serves every trigger, so a
 * redirect and a webhook arriving together deliver once.
 */

export interface Trigger {
  /** The provider whose route was called: a payment started with another provider is not settled here. */
  provider: PaymentProviderId;
  /** iyzico: the token its callback posted. */
  iyzicoToken?: string;
  /** Kashier's session or Fawaterk's invoice named by a webhook. */
  providerRef?: string | null;
  /** A webhook's signature check, with the account the payment started with; false: nothing is done. */
  verify?: (account: PaymentAccount) => boolean;
}

export type SettleStatus = "paid" | "already_paid" | "pending" | "failed" | "not_found" | "rejected";

export interface Settled {
  status: SettleStatus;
  /** Where to send the customer (redirects and iyzico's callback), on this site. */
  path: string;
  /** Plans: the app that was paid for, to open the dashboard on. */
  paidApp?: string | null;
}

/** A plan payment (Yallapp's account). */
export async function settlePlanPayment(token: string, trigger: Trigger): Promise<Settled> {
  const store = await getStore();
  const payment = await store.getPlanPaymentByToken(sha256Hex(token));
  if (!payment) return { status: "not_found", path: "/pending" };
  const client = await store.getClientById(payment.clientId);
  const page = client?.status === "active" ? "/dashboard/license" : "/pending";
  const failed: Settled = { status: "failed", path: `${page}?payment=failed` };
  if ((payment.paymentProvider ?? "iyzico") !== trigger.provider) return failed;
  const account = await yallappAccountFor(store, trigger.provider, encryptionKey());
  if (!client || !account) return failed;
  if (trigger.verify && !trigger.verify(account)) return { status: "rejected", path: page };
  const outcome = await completePlanPayment({
    store,
    account,
    urls: paymentApiUrls(),
    now: new Date(),
    payment,
    iyzicoToken: trigger.iyzicoToken,
    providerRef: trigger.providerRef,
    encryptionKey: encryptionKey(),
  });
  if (outcome.kind === "failed") return failed;
  if (outcome.kind === "pending") return { status: "pending", path: `${page}?payment=pending` };
  if (outcome.kind === "paid") await sendPlanPaidMail(store, client, outcome);
  // The dashboard opens on the app that was paid for.
  const paidApp = outcome.kind === "paid" ? (outcome.activation.app?.id ?? null) : payment.appId;
  // 31 A new plan's features reach the app's WordPress site at once.
  if (outcome.kind === "paid") refreshSitesSoon([paidApp]);
  return { status: outcome.kind, path: "/dashboard/license?payment=paid", paidApp };
}

/** A shop's order: products, paid courses, memberships, tickets, a restaurant's order. */
export async function settleOrderPayment(token: string, trigger: Trigger): Promise<Settled> {
  const back = `/pay/${encodeURIComponent(token)}`;
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  if (!order) return { status: "not_found", path: back };
  const failed: Settled = { status: "failed", path: `${back}?payment=failed` };
  if ((order.paymentProvider ?? "iyzico") !== trigger.provider) return failed;
  const app = await store.getAppById(order.appId);
  const account = app ? await accountForOrder(store, app, order, encryptionKey()) : null;
  if (!app || !account) return failed;
  if (trigger.verify && !trigger.verify(account.account)) return { status: "rejected", path: back };
  const outcome = await completePayment({
    store,
    app,
    account,
    urls: paymentApiUrls(),
    now: new Date(),
    order,
    iyzicoToken: trigger.iyzicoToken,
    providerRef: trigger.providerRef,
  });
  if (outcome === "paid") {
    // Courses enrol the student, 27 a gym's membership starts, 28 tickets are issued only now, after the provider confirmed the payment.
    await deliverPaidOrder(store, app, order, new Date(), appUrl());
    const client = await store.getClientById(app.clientId);
    const owner = client ? await store.getUserById(client.userId) : null;
    const paid = await store.getCatalogOrder(app.id, order.id);
    if (owner && paid) {
      await sendTemplate("new_order", owner.email, newOrderMailValues(paid, app.appName ?? "your app", `${appUrl()}/dashboard/orders`, fulfilmentOf(app)?.timezone)).catch(() => {
        // The order is paid either way; the dashboard lists it.
      });
    }
  }
  if (outcome === "failed") return failed;
  if (outcome === "pending") return { status: "pending", path: `${back}?payment=pending` };
  return { status: outcome, path: `${back}/order-received` };
}

/** A donation, into the charity's own account. */
export async function settleDonationPayment(token: string, trigger: Trigger): Promise<Settled> {
  const back = `/give/${encodeURIComponent(token)}`;
  const store = await getStore();
  const donation = await store.getDonationByToken(sha256Hex(token));
  if (!donation) return { status: "not_found", path: back };
  const failed: Settled = { status: "failed", path: `${back}?payment=failed` };
  if ((donation.paymentProvider ?? "iyzico") !== trigger.provider) return failed;
  const app = await store.getAppById(donation.appId);
  const account = app ? donationAccount(app, encryptionKey()) : null;
  if (!app || !account || account.provider !== trigger.provider) return failed;
  if (trigger.verify && !trigger.verify(account)) return { status: "rejected", path: back };
  const outcome = await completeDonationPayment({
    store,
    account,
    donation,
    iyzicoToken: trigger.iyzicoToken,
    providerRef: trigger.providerRef,
    now: new Date(),
    urls: paymentApiUrls(),
  });
  if (outcome === "paid") {
    const paid = await store.getDonation(app.id, donation.id);
    if (paid?.donorEmail) {
      const values = donationReceiptValues(paid, app.appName ?? "the charity", receiptUrl(appUrl(), paid.receiptCode));
      await sendTemplate("donation_receipt", paid.donorEmail, values, { app }).catch(() => {
        // The donation is paid either way; the receipt page and the app have it.
      });
    }
  }
  if (outcome === "failed") return failed;
  if (outcome === "pending") return { status: "pending", path: `${back}?payment=pending` };
  return { status: outcome, path: `${back}/thank-you` };
}
