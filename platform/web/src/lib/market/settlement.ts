import type { DataStore } from "../data/store";
import type { App, MarketOrder } from "../data/types";
import { ownPaymentAccount } from "../catalog/settings";
import { paymentApiUrls } from "../env";
import { formatMinor } from "./currency";
import { marketOrderReference } from "./json";
import type { OrderMoney, Settlement } from "./money";
import { refundMarketPayment } from "./payments";

/**
 * 115.29 Weighed orders settled with what was paid (the owner's decision D1).
 *
 * - Card, Apple Pay, Google Pay and wallet orders are charged the estimate at
 *   checkout. Once picked, the order comes to its weighed lines and accepted
 *   substitutes, less the lines left out, never more than was paid (the
 *   picking caps each line at its estimate). When it's ready and comes to
 *   less, the difference goes back on its own: to the card through the app's
 *   gateway (47's refunds), and to the wallet for what the wallet paid, or
 *   for all of it when the card's refund fails or the gateway has none.
 * - It's settled once (the order's `settled_at`, taken atomically), written to
 *   the order's money (a `refund` price line, `money.settlement`) and the
 *   wallet's ledger (`order:{id}:settle`, added once).
 * - Cash orders pay what they come to, at most the estimate plus the
 *   vendor's tolerance; the courier's job collects that amount.
 */

export type CardRefund = (order: MarketOrder, cents: number) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface SettleDeps {
  store: DataStore;
  app: App;
  now: Date;
  /** The card's refund; missing: no gateway, so the wallet. */
  refundToCard?: CardRefund;
}

/** What an order paid online or from the wallet before picking changed its price. */
export function chargedOf(order: Pick<MarketOrder, "money">): NonNullable<OrderMoney["charged"]> {
  return order.money.charged ?? { total: order.money.total, payNow: order.money.payNow, wallet: order.money.wallet };
}

/** Whether the customer's money was taken before picking: online, or all from the wallet. */
export function paidAhead(order: Pick<MarketOrder, "paymentMethod">): boolean {
  return order.paymentMethod !== "cash";
}

/** What will go back once it's settled: the card's part and the wallet's (0 when nothing does). */
export function settlementDue(order: Pick<MarketOrder, "money" | "paymentMethod" | "paymentStatus">): { toCard: number; toWallet: number } {
  if (!paidAhead(order) || !order.money.charged) return { toCard: 0, toWallet: 0 };
  const c = order.money.charged;
  const online = order.paymentMethod === "wallet" ? 0 : order.paymentStatus === "unpaid" ? 0 : c.payNow;
  return { toCard: Math.max(0, online - order.money.payNow), toWallet: Math.max(0, c.wallet - order.money.wallet) };
}

/** The app's own gateway, as complaints' refunds use it (lib/market/decisions.ts). */
export function gatewayRefund(store: DataStore, app: App, key: Buffer, ip: string, now: Date): CardRefund | undefined {
  const account = ownPaymentAccount(app, key);
  if (!account) return undefined;
  return async (order, cents) => {
    const charged = chargedOf(order);
    // Against what the card paid, not the lower total after picking.
    const done = await refundMarketPayment(account, { ...order, money: { ...order.money, payNow: charged.payNow } }, { cents, refundedBefore: 0, paymentId: order.paymentRef, note: `Weighed ${marketOrderReference(order)}`, ip, now }, { urls: paymentApiUrls() });
    return done.ok ? { ok: true } : { ok: false, error: done.error };
  };
}

export type SettleResult = { settled: false; reason: "nothing" | "unpaid" | "done" } | { settled: true; order: MarketOrder; settlement: Settlement };

/** Settles a ready grocery or shop order with what it was charged, once; a cash order's courier collects what it now comes to. */
export async function settleWeighedOrder(deps: SettleDeps, order: MarketOrder): Promise<SettleResult> {
  const { store, app, now } = deps;
  if (order.vendorKind === "restaurant") return { settled: false, reason: "nothing" };
  if (!paidAhead(order)) {
    await collectOnDelivery(store, order, now);
    return { settled: false, reason: "nothing" };
  }
  if (order.paymentStatus === "unpaid") return { settled: false, reason: "unpaid" };
  const due = settlementDue(order);
  if (due.toCard + due.toWallet <= 0) return { settled: false, reason: "nothing" };
  // One run settles it; another at the same time finds it taken.
  if (!(await store.claimMarketSettlement(app.id, order.id, now))) return { settled: false, reason: "done" };
  let toCard = due.toCard;
  let toWallet = due.toWallet;
  let cardError: string | null = null;
  if (toCard > 0) {
    let refunded: { ok: true } | { ok: false; error: string };
    try {
      refunded = deps.refundToCard ? await deps.refundToCard(order, toCard) : { ok: false, error: "The app's gateway has no refunds." };
    } catch (error) {
      refunded = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    if (!refunded.ok) {
      cardError = refunded.error.slice(0, 200);
      console.error(`[market] weighed refund of order ${order.id} to the card: ${cardError}; to the wallet instead`);
      toWallet += toCard;
      toCard = 0;
    }
  }
  if (toWallet > 0 && order.userId !== null) {
    await store.addWalletEntry({ appId: app.id, userId: order.userId, kind: "refund", amount: toWallet, label: `Weighed for less: ${marketOrderReference(order)}`, orderId: order.id, complaintId: null, key: `order:${order.id}:settle`, createdAt: now });
  }
  const charged = chargedOf(order);
  const settlement: Settlement = { paid: charged.total, final: order.money.total, toCard, toWallet, cardError, at: now.toISOString() };
  const money: OrderMoney = {
    ...order.money,
    lines: [...order.money.lines.filter((l) => l.kind !== "refund"), { kind: "refund", amount: -(toCard + toWallet) }],
    settlement,
  };
  const paymentStatus = order.paymentStatus === "refunded" ? "refunded" : "partly_refunded";
  await store.updateMarketOrder(app.id, order.id, { money, paymentStatus, updatedAt: now });
  return { settled: true, order: { ...order, money, paymentStatus, settledAt: now }, settlement };
}

/** A cash order's courier job collects what the order comes to once picked. */
async function collectOnDelivery(store: DataStore, order: MarketOrder, now: Date): Promise<void> {
  if (order.shipmentId === null || order.paymentStatus !== "unpaid") return;
  const job = await store.getShipment(order.appId, order.shipmentId);
  if (!job || job.paymentStatus !== "unpaid" || job.priceCents === order.money.payNow) return;
  if (["delivered", "cancelled"].includes(job.status)) return;
  await store.updateShipment(order.appId, job.id, { priceCents: order.money.payNow, updatedAt: now });
}

/** The words the customer's "picked" message adds: what goes back, when anything does. */
export function refundWords(order: Pick<MarketOrder, "money" | "paymentMethod" | "paymentStatus" | "currency">, lang: string): string {
  const due = settlementDue(order);
  const total = due.toCard + due.toWallet;
  return total > 0 ? formatMinor(total, order.currency, lang === "ar" ? "ar-EG-u-nu-latn" : lang) : "";
}
