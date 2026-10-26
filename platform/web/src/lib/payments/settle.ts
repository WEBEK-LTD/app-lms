import "server-only";
import { pushOwnerSafely } from "../owner/push-env";
import { pushDonation, pushNewOrder, pushPlanPayment } from "../owner/push";
import { formatAmount } from "../billing/prices";
import { sendPlanPaidMail } from "../billing/plan-mail";
import { completePlanPayment } from "../billing/plan-payment";
import { sendStoragePaidMail } from "../media/mail";
import { fulfilmentOf } from "../catalog/fulfilment";
import { completePayment, deliverPaidOrder, newOrderMailValues } from "../catalog/payment";
import { accountForOrder } from "../catalog/settings";
import { awaitingManualPayment } from "../catalog/manual";
import { sha256Hex } from "../crypto/tokens";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, Donation, PaymentProviderId, PlanPayment } from "../data/types";
import { completeDonationPayment, donationAccount, donationReceiptValues } from "../donations/payment";
import { receiptUrl } from "../donations/service";
import { emailLangOf, sendTemplate } from "../email/send";
import { getDashT } from "@/i18n/dashboard";
import { appUrl, encryptionKey, paymentApiUrls } from "../env";
import { yallappAccountFor } from "../settings/platform";
import type { PaymentAccount } from "./provider";
import { refreshSitesSoon } from "../license/refresh-soon";
import { donationReceiptPdf, receiptAttachment, sendOrderReceipt } from "../receipts/service";

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
  return settlePlanRecord(store, payment, trigger);
}

/** 80.3 A plan payment found by the pending-payments check, or by its link's token. */
export async function settlePlanRecord(store: DataStore, payment: PlanPayment, trigger: Trigger): Promise<Settled> {
  const client = await store.getClientById(payment.clientId);
  // 51 Storage packs come back to the Media page.
  const page = client?.status !== "active" ? "/pending" : payment.purpose === "storage" ? "/dashboard/media" : "/dashboard/license";
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
  // 58 Yallapp Business: the payment's receipt reaches the owner's phone too.
  if (outcome.kind === "paid" || outcome.kind === "storage_paid") {
    const app = payment.appId ? await store.getAppById(payment.appId) : null;
    await pushOwnerSafely((d) => pushPlanPayment(d, client.id, app, formatAmount(payment.amountCents, payment.currency), payment.id));
  }
  if (outcome.kind === "storage_paid") {
    await sendStoragePaidMail(store, client, outcome);
    return { status: "paid", path: "/dashboard/media?payment=paid", paidApp: payment.appId };
  }
  if (outcome.kind === "paid") await sendPlanPaidMail(store, client, outcome);
  // The dashboard opens on the app that was paid for.
  const paidApp = outcome.kind === "paid" ? (outcome.activation.app?.id ?? null) : payment.appId;
  // 31 A new plan's features reach the app's WordPress site at once.
  if (outcome.kind === "paid") refreshSitesSoon([paidApp]);
  // 51 A storage payment confirmed before (Kashier's and Fawaterk's webhook usually arrives first) also comes back to Media.
  return { status: outcome.kind, path: payment.purpose === "storage" ? "/dashboard/media?payment=paid" : "/dashboard/license?payment=paid", paidApp };
}

/**
 * What follows an order's payment, once: what it delivers, the owner's email
 * and push, and the customer's receipt. 96.2 Also when the owner marks an
 * order paid by bank transfer or their own method.
 */
export async function afterOrderPaid(store: DataStore, app: App, order: CatalogOrder): Promise<void> {
  // Courses enrol the student, 27 a gym's membership starts, 28 tickets are issued only now, after the payment was confirmed.
  await deliverPaidOrder(store, app, order, new Date(), appUrl());
  const client = await store.getClientById(app.clientId);
  const owner = client ? await store.getUserById(client.userId) : null;
  const paid = await store.getCatalogOrder(app.id, order.id);
  if (owner && paid) {
    const lang = emailLangOf(owner);
    const values = newOrderMailValues(paid, app.appName ?? getDashT(lang)("emails.yourAppName"), `${appUrl()}/dashboard/orders`, fulfilmentOf(app)?.timezone, lang);
    await sendTemplate("new_order", owner.email, values, { lang }).catch(() => {
      // The order is paid either way; the dashboard lists it.
    });
  }
  // 58 And to the owner's phone (Yallapp Business).
  if (paid) await pushOwnerSafely((d) => pushNewOrder(d, app, paid));
  // 71 The customer gets their receipt, its PDF attached.
  if (paid) await sendOrderReceipt(store, app, paid);
}

/**
 * 96.2 The owner marks an order paid by bank transfer or their own method:
 * it is paid and delivered like a card payment, once. False when it wasn't
 * waiting for such a payment (paid meanwhile, or cancelled).
 */
export async function markManualOrderPaid(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<boolean> {
  if (!awaitingManualPayment(order)) return false;
  const changed = await store.payCatalogOrder(app.id, order.id, `manual-${order.id}`, now);
  if (changed) await afterOrderPaid(store, app, order);
  return changed;
}

/** A shop's order: products, paid courses, memberships, tickets, a restaurant's order. */
export async function settleOrderPayment(token: string, trigger: Trigger): Promise<Settled> {
  const back = `/pay/${encodeURIComponent(token)}`;
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  if (!order) return { status: "not_found", path: back };
  return settleOrderRecord(store, order, trigger, back);
}

/** 80.3 An order found by the pending-payments check (`back`: its payment page, unknown there), or by its link's token. */
export async function settleOrderRecord(store: DataStore, order: CatalogOrder, trigger: Trigger, back = "/"): Promise<Settled> {
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
  if (outcome === "paid") await afterOrderPaid(store, app, order);
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
  return settleDonationRecord(store, donation, trigger, back);
}

/** 80.3 A donation found by the pending-payments check (`back`: its page, unknown there), or by its link's token. */
export async function settleDonationRecord(store: DataStore, donation: Donation, trigger: Trigger, back = "/"): Promise<Settled> {
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
    // 58 The charity's owner hears of it on their phone (Yallapp Business).
    if (paid) await pushOwnerSafely((d) => pushDonation(d, app, paid));
    if (paid?.donorEmail) {
      const values = donationReceiptValues(paid, app.appName ?? "the charity", receiptUrl(appUrl(), paid.receiptCode));
      // 71 With the receipt's PDF, in the app's language; without it if it can't be made.
      const attachments = await receiptAttachment(() => donationReceiptPdf(store, app, paid));
      await sendTemplate("donation_receipt", paid.donorEmail, values, { app, attachments }).catch(() => {
        // The donation is paid either way; the receipt page and the app have it.
      });
    }
  }
  if (outcome === "failed") return failed;
  if (outcome === "pending") return { status: "pending", path: `${back}?payment=pending` };
  return { status: outcome, path: `${back}/thank-you` };
}
