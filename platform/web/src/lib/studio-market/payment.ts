import "server-only";
import { formatDate } from "@/components/ui";
import { appLabel } from "../app/label";
import { formatAmount } from "../billing/prices";
import { getBlobStore } from "../blobs";
import { sha256Hex } from "../crypto/tokens";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import type { PaymentProviderId, TemplateLicence, TemplateOrder } from "../data/types";
import { emailLangOf, sendTemplate } from "../email/send";
import { appPlan } from "../entitlements";
import { appUrl, encryptionKey, paymentApiUrls } from "../env";
import { PROVIDER_NAME } from "../payments/provider";
import type { Settled, Trigger } from "../payments/settle";
import { yallappAccountFor } from "../settings/platform";
import { completeTemplateOrder, deliverTemplateOrder, type DeliverDeps, type OrderOutcome } from "./checkout";
import { marketMailLines } from "./mail";
import { pictureCopying } from "./media-read";
import { formatUsd } from "./plans";
import { templateText } from "./templates";

/**
 * 106.2 A template's payment coming back from the gateway: its redirect
 * (GET) and its webhook (POST) to /api/pay/<gateway>/template/<token>, and
 * iyzico's callback (lib/payments/provider-route.ts). The order is found by
 * its link's token, the payment read back with Yallapp's account it started
 * with, and delivered once; then the buyer's receipt.
 */

const MINE = "/dashboard/studio-market/mine";

export function deliverDeps(store: DataStore, now: Date): DeliverDeps {
  return {
    store,
    blobs: getBlobStore(),
    now,
    ...pictureCopying(),
    appsOf: (clientId) => store.listAppsByClient(clientId),
    planOf: async (clientId, appId) => appPlan(store, await store.getLicenseForApp(clientId, appId), now),
  };
}

function notice(outcome: OrderOutcome): string {
  if (outcome.kind === "pending") return `${MINE}?error=pending`;
  if (outcome.kind === "failed") return `${MINE}?error=failed`;
  const order = outcome.order;
  if (order.kind === "renew") return `${MINE}?done=renewed`;
  if (!order.appId) return `${MINE}?done=paidLater`;
  return `${MINE}?done=${order.appliedAt ? "paidApplied" : order.applyError ? "paidNotApplied" : "paidApplied"}`;
}

export async function settleTemplatePayment(token: string, trigger: Trigger): Promise<Settled> {
  const store = await getStore();
  const order = await store.getTemplateOrderByToken(sha256Hex(token));
  if (!order) return { status: "not_found", path: MINE };
  return settleTemplateRecord(store, order, trigger);
}

export async function settleTemplateRecord(store: DataStore, order: TemplateOrder, trigger: Trigger): Promise<Settled> {
  const failed: Settled = { status: "failed", path: `${MINE}?error=failed` };
  if (order.paymentProvider !== trigger.provider) return failed;
  const account = await yallappAccountFor(store, trigger.provider, encryptionKey());
  if (!account) return failed;
  if (trigger.verify && !trigger.verify(account)) return { status: "rejected", path: MINE };
  const now = new Date();
  let outcome = await completeTemplateOrder({ ...deliverDeps(store, now), account, urls: paymentApiUrls() }, order, { providerRef: trigger.providerRef, iyzicoToken: trigger.iyzicoToken });
  // Paid before, but its delivery was cut short (a few minutes ago at least, so two calls at once don't both deliver): delivered now.
  if (outcome.kind === "already_paid" && !outcome.order.startsAt && outcome.order.paidAt && now.getTime() - outcome.order.paidAt.getTime() > 2 * 60 * 1000) {
    outcome = await deliverTemplateOrder(deliverDeps(store, now), outcome.order);
  }
  if (outcome.kind === "paid") await sendTemplateReceipt(store, outcome.order, outcome.licence);
  const status = outcome.kind === "paid" ? "paid" : outcome.kind === "already_paid" ? "already_paid" : outcome.kind;
  return { status, path: notice(outcome) };
}

/** The buyer's receipt, in their language. Never fails the payment. */
export async function sendTemplateReceipt(store: DataStore, order: TemplateOrder, licence: TemplateLicence): Promise<void> {
  try {
    const [client, template, designer] = await Promise.all([store.getClientById(order.clientId), store.getMarketTemplate(order.templateId), store.getTemplateDesigner(order.designerId)]);
    const user = client ? await store.getUserById(client.userId) : null;
    if (!user || !template) return;
    const lang = emailLangOf(user);
    const lines = marketMailLines(lang);
    const app = order.appId ? await store.getAppById(order.appId) : null;
    const amount = formatAmount(order.amountCents, order.currency);
    const usd = order.currency === "USD" ? null : formatUsd(order.grossCents);
    const outcome = order.kind === "renew" ? "renewed" : !order.appId ? "later" : order.appliedAt ? "applied" : "failed";
    await sendTemplate(
      "market_template_receipt",
      user.email,
      {
        name: user.name,
        template_name: templateText(template, lang).title,
        designer_name: designer?.name ?? "",
        plan: lines.plan(order.plan),
        amount_line: lines.paid(amount, PROVIDER_NAME[order.paymentProvider as PaymentProviderId] ?? order.paymentProvider, usd),
        ends_line: lines.ends(licence.endsAt ? formatDate(licence.endsAt, lang) : null),
        app_line: lines.app(outcome, app ? appLabel(app) : ""),
        order_id: order.id,
        templates_url: `${appUrl()}${MINE}`,
      },
      { lang },
    );
  } catch (error) {
    console.error("[mail] Studio Market receipt failed", error);
  }
}
