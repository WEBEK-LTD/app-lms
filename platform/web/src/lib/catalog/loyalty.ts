import type { DataStore } from "../data/store";
import type { App, CatalogCurrency, CatalogOrder, CatalogSettings, LoyaltyEntry, LoyaltySettings, OrderPoints } from "../data/types";
import { allows, appPlan } from "../entitlements";
import { centsToDecimal, formatCents } from "./money";
import { catalogSettings } from "./settings";

/**
 * 91.4 Loyalty points of shops without a website, on every plan but Starter
 * (the plan feature `loyalty`): one point for every `spendPerPointCents`
 * paid for products (the order's total less shipping: after its coupon and
 * points), credited when the order is completed; each worth
 * `pointValueCents` off a later order once the customer has `minPoints`.
 * Points are used when the order is paid, given back when a paid order that
 * used them is cancelled or refunded in full, and taken back when an order
 * that earned them is refunded in full or its return approved.
 */

export const LOYALTY_LIMITS = {
  /** The most one point can cost: 100,000.00. */
  spendMaxCents: 10_000_000,
  /** The most one point can be worth: 1,000.00. */
  valueMaxCents: 100_000,
  minPointsMax: 1_000_000,
};
export const LOYALTY_HISTORY = 50;

/** The shop's points when it has them and its plan does; null otherwise. */
export function loyaltyOf(settings: Pick<CatalogSettings, "loyalty">, planHasLoyalty: boolean): LoyaltySettings | null {
  const l = settings.loyalty;
  if (!planHasLoyalty || !l) return null;
  const ok = (n: number, max: number) => Number.isInteger(n) && n >= 1 && n <= max;
  return ok(l.spendPerPointCents, LOYALTY_LIMITS.spendMaxCents) && ok(l.pointValueCents, LOYALTY_LIMITS.valueMaxCents) && ok(l.minPoints, LOYALTY_LIMITS.minPointsMax) ? l : null;
}

/** The app's points now: its shop's settings, on its license's plan. */
export async function appLoyalty(store: DataStore, app: App, now: Date): Promise<LoyaltySettings | null> {
  const settings = catalogSettings(app);
  if (!settings.loyalty) return null;
  const plan = await appPlan(store, await store.getLicenseForApp(app.clientId, app.id), now);
  return loyaltyOf(settings, allows(plan, "loyalty"));
}

/** `StoreConfig.loyalty`. */
export function loyaltyConfigJson(l: LoyaltySettings | null, currency: CatalogCurrency) {
  if (!l) return null;
  return {
    enabled: true,
    spend_per_point: centsToDecimal(l.spendPerPointCents),
    spend_per_point_formatted: formatCents(l.spendPerPointCents, currency),
    point_value: centsToDecimal(l.pointValueCents),
    point_value_formatted: formatCents(l.pointValueCents, currency),
    min_points: l.minPoints,
  };
}

/** How many of `balance` points an order of `productsCents` (after its coupon) can take, and what they take off. */
export function usablePoints(l: LoyaltySettings, balance: number, productsCents: number): { points: number; valueCents: number } {
  if (balance < l.minPoints || productsCents <= 0) return { points: 0, valueCents: 0 };
  const points = Math.min(balance, Math.floor(productsCents / l.pointValueCents));
  if (points < l.minPoints) return { points: 0, valueCents: 0 };
  return { points, valueCents: points * l.pointValueCents };
}

/** The points an order earns: what was paid for its products. */
export function pointsToEarn(l: LoyaltySettings, order: Pick<CatalogOrder, "totalCents" | "shippingCents">): number {
  return Math.floor(Math.max(0, order.totalCents - order.shippingCents) / l.spendPerPointCents);
}

/** `Order.points`. */
export function orderPointsJson(points: OrderPoints | null | undefined, currency: CatalogCurrency) {
  if (!points || (points.used === 0 && points.earned === 0)) return null;
  return { used: points.used, discount: points.discountCents > 0 ? formatCents(points.discountCents, currency) : null, earned: points.earned };
}

/** `PointsAccount`. */
export function pointsAccountJson(l: LoyaltySettings, balance: number, entries: LoyaltyEntry[], numbers: Map<number, string>, currency: CatalogCurrency) {
  return {
    balance,
    value: formatCents(balance * l.pointValueCents, currency),
    entries: entries.map((e) => ({
      points: e.points,
      reason: e.reason,
      order_id: e.orderId,
      order_number: e.orderId !== null ? (numbers.get(e.orderId) ?? null) : null,
      created_at: e.createdAt.toISOString(),
    })),
  };
}

/** A paid order spends the points it used (as many as are left, never below 0). */
export async function spendOrderPoints(store: DataStore, order: CatalogOrder, now: Date): Promise<void> {
  const used = order.points?.used ?? 0;
  if (order.userId === null || used <= 0) return;
  await store.changeLoyaltyPoints({ appId: order.appId, userId: order.userId, orderId: order.id, points: -used, reason: "used", now });
}

/** A completed order credits its points, once. The number credited, 0 for none. */
export async function earnOrderPoints(store: DataStore, l: LoyaltySettings | null, order: CatalogOrder, now: Date): Promise<number> {
  if (!l || order.userId === null || order.paidAt === null || (order.points?.earned ?? 0) > 0 || order.points?.takenBack) return 0;
  const points = pointsToEarn(l, order);
  if (points <= 0) return 0;
  const added = await store.changeLoyaltyPoints({ appId: order.appId, userId: order.userId, orderId: order.id, points, reason: "earned", now });
  const next: OrderPoints = { used: order.points?.used ?? 0, discountCents: order.points?.discountCents ?? 0, earned: added, ...(order.points?.givenBack ? { givenBack: true } : {}) };
  await store.updateCatalogOrder(order.appId, order.id, { points: next });
  return added;
}

/**
 * Undoes an order's points: takes back what it earned (a return approved, a
 * full refund) and, with `giveBackUsed`, gives back what it used (a paid order
 * cancelled or refunded in full). Each once.
 */
export async function undoOrderPoints(store: DataStore, order: CatalogOrder, giveBackUsed: boolean, now: Date): Promise<void> {
  const p = order.points;
  if (order.userId === null || !p) return;
  const next: OrderPoints = { ...p };
  if (p.earned > 0) {
    await store.changeLoyaltyPoints({ appId: order.appId, userId: order.userId, orderId: order.id, points: -p.earned, reason: "taken_back", now });
    next.earned = 0;
    next.takenBack = true;
  }
  if (giveBackUsed && p.used > 0 && !p.givenBack && order.paidAt !== null) {
    await store.changeLoyaltyPoints({ appId: order.appId, userId: order.userId, orderId: order.id, points: p.used, reason: "given_back", now });
    next.givenBack = true;
  }
  if (next.earned !== p.earned || next.givenBack !== p.givenBack) await store.updateCatalogOrder(order.appId, order.id, { points: next });
}
