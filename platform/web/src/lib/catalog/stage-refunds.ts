import { appLabel } from "../app/label";
import type { App, CatalogOrder, OrderStageRefund } from "../data/types";
import { notifyOrderRefund } from "../hosted/auto-notifications";
import type { ServiceAccount, sendPush } from "../hosted/push";
import { pushNotice } from "../owner/push";
import { pushOwnerSafely } from "../owner/push-env";
import { orderRefundOptions, refundOrder, type RefundDeps } from "../refunds/service";
import { formatCents } from "./money";
import { orderNumber } from "./settings";

/**
 * 132 The owner's rule (2026-11-16): when a failed delivery ends with the
 * order cancelled (the failed attempt's "Cancel the order", or Cancel order
 * on an order whose last stage is failed or returned), the customer gets
 * their money back. A card payment the platform can refund through its
 * provider is refunded at once, all of what's left, through the refunds of
 * Dashboard › Orders (recorded on the order and in its refunds); anything
 * else (bank transfer, the owner's own method such as cash on delivery, a
 * provider without refunds, a payment in Yallapp's account, a refund the
 * provider refused) leaves the order "Needs a refund" for the owner, with a
 * notice, until they refund it or mark it refunded. The customer is told
 * when the money goes back. A WordPress shop's order is WooCommerce's own
 * to refund (the plugin flags it).
 */

/** The stages after which cancelling an order gives the money back. */
export const REFUND_AFTER_STAGES = ["failed", "returned"] as const;

export interface StageRefundDeps extends RefundDeps {
  app: App;
  /** The app's push account, to tell the customer (null: the inbox only). */
  account: ServiceAccount | null;
  send?: typeof sendPush;
  /** The dashboard's address, for the notice's link. */
  baseUrl?: string;
}

/**
 * Whether cancelling this order now gives its money back: it's after a
 * failed delivery (175: or the owner chose "Cancel and refund"), and
 * something of it was paid.
 */
export function refundsOnCancel(order: Pick<CatalogOrder, "deliveryStage" | "paidAt" | "totalCents" | "refundedCents" | "stageRefund">, chosen = false): boolean {
  if (!chosen && (!order.deliveryStage || !(REFUND_AFTER_STAGES as readonly string[]).includes(order.deliveryStage))) return false;
  if (order.stageRefund || !order.paidAt) return false;
  return order.totalCents - (order.refundedCents ?? 0) > 0;
}

/** Why a payment can't go back by itself, as the owner reads it, and as a code for the apps' own words. */
function whyManual(order: CatalogOrder, why: string | null, failed: string | null): { why: string; code: NonNullable<OrderStageRefund["whyCode"]> } {
  if (failed) return { why: failed, code: "provider_refused" };
  if (order.manualPayment) return { why: "Paid outside the app: pay it back the same way, then mark it refunded.", code: "paid_outside" };
  if (why) return { why, code: "provider_refused" };
  return { why: "This payment can't be refunded through its provider: refund it in the provider's panel, then mark it refunded.", code: "no_provider" };
}

/**
 * After a cancel: refunds the order when its payment allows it, else marks it
 * "Needs a refund" (with one notice to the owner). Returns what was kept, or
 * null when nothing was owed.
 */
export async function refundAfterFailedDelivery(deps: StageRefundDeps, order: CatalogOrder, opts: { chosen?: boolean } = {}): Promise<OrderStageRefund | null> {
  const { store, app, now } = deps;
  const chosen = opts.chosen === true;
  if (!refundsOnCancel(order, chosen)) return null;
  const cents = order.totalCents - (order.refundedCents ?? 0);
  const options = await orderRefundOptions(deps, app, order);
  let failed: string | null = null;
  if (options.refundable && options.byApi) {
    const note = chosen ? "The order was cancelled and refunded." : "The delivery failed and the order was cancelled.";
    const result = await refundOrder(deps, app, order, { cents, reason: "other", note, method: "api" });
    if (result.ok) {
      const kept: OrderStageRefund = { status: "refunded", cents, at: now.toISOString(), why: null, whyCode: null, refundId: result.refund.id, doneAt: now.toISOString(), doneBy: null };
      await store.updateCatalogOrder(app.id, order.id, { stageRefund: kept, updatedAt: now });
      await tellCustomer(deps, order, cents);
      return kept;
    }
    failed = result.message;
  }
  const reason = whyManual(order, options.why, failed);
  const kept: OrderStageRefund = { status: "needed", cents, at: now.toISOString(), why: reason.why, whyCode: reason.code, refundId: null, doneAt: null, doneBy: null };
  await store.updateCatalogOrder(app.id, order.id, { stageRefund: kept, updatedAt: now });
  await noticeOwner(deps, order, cents, chosen);
  return kept;
}

/**
 * The owner refunded it themselves ("I refunded it"): recorded as a refund
 * made outside (when the order's refunds can record one) and the order no
 * longer needs a refund; the customer is told.
 */
export async function markStageRefunded(deps: StageRefundDeps, order: CatalogOrder, by: string): Promise<{ ok: true; order: CatalogOrder } | { ok: false; message: string }> {
  const { store, app, now } = deps;
  const due = order.stageRefund;
  if (!due || due.status !== "needed") return { ok: false, message: "This order doesn't need a refund." };
  const left = order.totalCents - (order.refundedCents ?? 0);
  let refundId: number | null = null;
  if (left > 0) {
    const options = await orderRefundOptions(deps, app, order);
    if (options.refundable && options.manual) {
      const result = await refundOrder(deps, app, order, { cents: left, reason: "other", note: "Refunded by the business after the failed delivery.", method: "manual" });
      if (!result.ok) return { ok: false, message: result.message };
      refundId = result.refund.id;
    }
  }
  const fresh = (await store.getCatalogOrder(app.id, order.id)) ?? order;
  await store.updateCatalogOrder(app.id, order.id, { stageRefund: { ...due, status: "recorded", refundId: refundId ?? due.refundId, doneAt: now.toISOString(), doneBy: by }, updatedAt: now });
  await tellCustomer(deps, fresh, due.cents);
  return { ok: true, order: (await store.getCatalogOrder(app.id, order.id)) ?? fresh };
}

/** Where the refund is, as the apps read it: refunded fully through the refunds form also counts as refunded. */
export function stageRefundStatus(order: Pick<CatalogOrder, "stageRefund" | "totalCents" | "refundedCents">): OrderStageRefund["status"] | null {
  const due = order.stageRefund;
  if (!due) return null;
  if (due.status === "needed" && order.totalCents - (order.refundedCents ?? 0) <= 0) return "recorded";
  return due.status;
}

async function tellCustomer(deps: StageRefundDeps, order: CatalogOrder, cents: number): Promise<void> {
  try {
    await notifyOrderRefund({ store: deps.store, key: deps.key, now: deps.now, send: deps.send }, deps.app, order, formatCents(cents, order.currency));
  } catch (e) {
    console.error(`[orders] the refund notice failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
  }
}

async function noticeOwner(deps: StageRefundDeps, order: CatalogOrder, cents: number, chosen: boolean): Promise<void> {
  const { store, app, now } = deps;
  const number = orderNumber(order);
  const notice = await store.createOwnerNotice({
    clientId: app.clientId,
    appId: app.id,
    kind: "order_refund_due",
    dedupeKey: `order_refund_due:${order.id}`,
    title: `${appLabel(app)}: refund order ${number}`,
    body: `${chosen ? `Order ${number} was cancelled with a refund.` : `The delivery of order ${number} failed and the order was cancelled.`} Its payment couldn't be refunded by itself: pay back ${formatCents(cents, order.currency)} to the customer, then mark it refunded on the order.`,
    linkUrl: `${(deps.baseUrl ?? "").replace(/\/+$/, "")}/dashboard/orders`,
    linkLabel: "See orders",
    tone: "warn",
    createdAt: now,
    emailedAt: null,
    dismissedAt: null,
    resolvedAt: null,
  });
  if (notice) await pushOwnerSafely((d) => pushNotice(d, notice), store);
}
