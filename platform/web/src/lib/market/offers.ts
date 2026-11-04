import { randomInt } from "node:crypto";
import type { DataStore } from "../data/store";
import type { MarketClubMember, MarketClubPlan, MarketCoupon, VendorKind } from "../data/types";
import { percentOf } from "./currency";
import type { ClubBenefit, Coupon } from "./money";

/**
 * 115.10 Coupons, the wallet and the club, as the app owner sets them
 * (Yallapp sets no prices). A coupon is checked against the order (dates,
 * smallest order, first order, vendors, kinds, departments, uses in all and
 * per person) and becomes the money engine's coupon; automatic offers apply
 * the best one by themselves. The wallet pays all or part of an order and
 * takes refunds back. The club gives free or cheaper delivery while paid.
 */

export interface CouponContext {
  now: Date;
  vendorId: number;
  vendorKind: VendorKind;
  /** The items after the vendor's discounts, per department (null: none). */
  lines: { departmentId: number | null; total: number }[];
  userId: number | null;
  /** The customer has no earlier completed order in this app. */
  firstOrder: boolean;
  /** Uses so far, in all and the customer's. */
  uses: number;
  userUses: number;
}

export type CouponRefusal = "inactive" | "not_started" | "ended" | "min_order" | "first_order_only" | "wrong_vendor" | "wrong_kind" | "wrong_department" | "used_up" | "user_limit" | "sign_in";

export type CouponCheck = { ok: true; coupon: Coupon; discountBase: number } | { ok: false; refusal: CouponRefusal; error: string };

const MESSAGES: Record<CouponRefusal, string> = {
  inactive: "This code isn't valid.",
  not_started: "This code can't be used yet.",
  ended: "This code has ended.",
  min_order: "Add a little more to use this code.",
  first_order_only: "This code is for a first order.",
  wrong_vendor: "This code isn't for this place.",
  wrong_kind: "This code isn't for this kind of place.",
  wrong_department: "This code is for other products.",
  used_up: "This code has been used up.",
  user_limit: "You've used this code already.",
  sign_in: "Sign in to use this code.",
};

const refuse = (refusal: CouponRefusal): CouponCheck => ({ ok: false, refusal, error: MESSAGES[refusal] });

/** Whether the coupon applies to this order, and as what for the money engine. */
export function checkCoupon(c: MarketCoupon, ctx: CouponContext): CouponCheck {
  if (!c.active) return refuse("inactive");
  if (c.startsAt && ctx.now < c.startsAt) return refuse("not_started");
  if (c.endsAt && ctx.now >= c.endsAt) return refuse("ended");
  if (c.vendorIds.length && !c.vendorIds.includes(ctx.vendorId)) return refuse("wrong_vendor");
  if (c.vendorKinds.length && !c.vendorKinds.includes(ctx.vendorKind)) return refuse("wrong_kind");
  if ((c.firstOrderOnly || c.perUserLimit !== null) && ctx.userId === null) return refuse("sign_in");
  if (c.firstOrderOnly && !ctx.firstOrder) return refuse("first_order_only");
  if (c.usesLimit !== null && ctx.uses >= c.usesLimit) return refuse("used_up");
  if (c.perUserLimit !== null && ctx.userUses >= c.perUserLimit) return refuse("user_limit");
  const items = ctx.lines.reduce((sum, l) => sum + l.total, 0);
  if (items < c.minOrder) return refuse("min_order");
  // Limited to departments: the discount is on those items only.
  const base = c.departmentIds.length ? ctx.lines.filter((l) => l.departmentId !== null && c.departmentIds.includes(l.departmentId)).reduce((sum, l) => sum + l.total, 0) : items;
  if (c.departmentIds.length && base === 0) return refuse("wrong_department");
  if (c.kind === "free_delivery") return { ok: true, coupon: { kind: "free_delivery", value: 0, funder: c.paidBy, code: c.code }, discountBase: base };
  if (c.kind === "percent") {
    let off = percentOf(base, c.value);
    if (c.maxDiscount !== null) off = Math.min(off, c.maxDiscount);
    // An amount the engine takes off the whole items: the same as the percentage of the eligible ones.
    return { ok: true, coupon: base === items ? { kind: "percent", value: c.value, maxDiscount: c.maxDiscount, funder: c.paidBy, code: c.code } : { kind: "amount", value: off, funder: c.paidBy, code: c.code }, discountBase: base };
  }
  return { ok: true, coupon: { kind: "amount", value: Math.min(c.value, base), funder: c.paidBy, code: c.code }, discountBase: base };
}

/** How much a checked coupon takes off, for choosing between offers (free delivery is worth the fee). */
export function couponWorth(check: Extract<CouponCheck, { ok: true }>, deliveryFee: number): number {
  const c = check.coupon;
  if (c.kind === "free_delivery") return deliveryFee;
  if (c.kind === "percent") return Math.min(percentOf(check.discountBase, c.value), c.maxDiscount ?? Number.MAX_SAFE_INTEGER);
  return c.value;
}

/** A typed code: found, then checked with its uses counted. */
export async function couponFromCode(store: DataStore, appId: string, code: string, ctx: Omit<CouponContext, "uses" | "userUses">): Promise<CouponCheck & { record?: MarketCoupon }> {
  const found = code.trim() ? await store.findMarketCouponByCode(appId, code) : null;
  if (!found) return refuse("inactive");
  const uses = await store.countMarketCouponUses(appId, found.id);
  const userUses = ctx.userId !== null ? await store.countMarketCouponUses(appId, found.id, ctx.userId) : 0;
  const check = checkCoupon(found, { ...ctx, uses, userUses });
  return check.ok ? { ...check, record: found } : check;
}

/** The automatic offer worth the most to this order, if any applies. */
export async function bestAutomaticOffer(store: DataStore, appId: string, ctx: Omit<CouponContext, "uses" | "userUses">, deliveryFee: number): Promise<{ record: MarketCoupon; check: Extract<CouponCheck, { ok: true }> } | null> {
  let best: { record: MarketCoupon; check: Extract<CouponCheck, { ok: true }>; worth: number } | null = null;
  for (const record of await store.listMarketCoupons(appId, { active: true, automatic: true })) {
    const uses = record.usesLimit !== null ? await store.countMarketCouponUses(appId, record.id) : 0;
    const userUses = record.perUserLimit !== null && ctx.userId !== null ? await store.countMarketCouponUses(appId, record.id, ctx.userId) : 0;
    const check = checkCoupon(record, { ...ctx, uses, userUses });
    if (!check.ok) continue;
    const worth = couponWorth(check, deliveryFee);
    if (worth > 0 && (!best || worth > best.worth)) best = { record, check, worth };
  }
  return best ? { record: best.record, check: best.check } : null;
}

/** Counts the use when the order is placed; false when someone took the last one meanwhile. */
export async function redeemCoupon(store: DataStore, coupon: MarketCoupon, order: { id: number; userId: number | null }, discount: number, now: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  const used = await store.useMarketCoupon({ appId: coupon.appId, couponId: coupon.id, orderId: order.id, userId: order.userId, discount, createdAt: now }, { usesLimit: coupon.usesLimit, perUserLimit: coupon.perUserLimit });
  if (used.ok || used.reason === "duplicate") return { ok: true };
  return { ok: false, error: MESSAGES[used.reason] };
}

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A one-person coupon worth `amount` (a complaint's compensation), usable once, for 90 days. */
export async function personalCoupon(store: DataStore, input: { appId: string; userId: number; amount: number; currency: string; funder: "owner" | "vendor"; title: string; prefix?: string }, now: Date): Promise<MarketCoupon> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `${input.prefix ?? "SORRY"}-${Array.from({ length: 6 }, () => CODE_LETTERS[randomInt(0, CODE_LETTERS.length)]).join("")}`;
    const made = await store.createMarketCoupon({
      appId: input.appId, code, title: input.title.slice(0, 120), kind: "amount", value: input.amount, maxDiscount: null, minOrder: 0, currency: input.currency, paidBy: input.funder,
      firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: 1, perUserLimit: 1, startsAt: now, endsAt: new Date(now.getTime() + 90 * 86_400_000), active: true, createdAt: now, updatedAt: now,
    });
    if (made) return made;
  }
  throw new Error("No free coupon code was found.");
}

// The wallet

/** Pays (part of) an order from the wallet once; the amount actually taken (never more than the balance). */
export async function payFromWallet(store: DataStore, input: { appId: string; userId: number; orderId: number; amount: number }, now: Date): Promise<number> {
  const balance = await store.walletBalance(input.appId, input.userId);
  const take = Math.max(0, Math.min(balance, input.amount));
  if (take === 0) return 0;
  const added = await store.addWalletEntry({ appId: input.appId, userId: input.userId, kind: "payment", amount: -take, label: "Order", orderId: input.orderId, complaintId: null, key: `order:${input.orderId}:pay`, createdAt: now });
  if (added.ok) return take;
  if (added.reason === "duplicate") return take;
  return 0;
}

/** A cancelled or turned-down order gives back what the wallet paid, once. */
export async function returnToWallet(store: DataStore, input: { appId: string; userId: number; orderId: number; amount: number }, now: Date): Promise<boolean> {
  if (input.amount <= 0) return false;
  const added = await store.addWalletEntry({ appId: input.appId, userId: input.userId, kind: "refund", amount: input.amount, label: "Order cancelled", orderId: input.orderId, complaintId: null, key: `order:${input.orderId}:return`, createdAt: now });
  return added.ok;
}

// The club

function addPeriod(from: Date, period: MarketClubPlan["period"]): Date {
  const d = new Date(from);
  if (period === "month") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}

/** A member's delivery benefit now: while paid, by the plan they are on. */
export function clubBenefit(member: MarketClubMember | null, plan: MarketClubPlan | null, now: Date): ClubBenefit | null {
  if (!member || !plan || member.planId !== plan.id) return null;
  if (!["active", "cancelled"].includes(member.status) || !member.paidUntil || member.paidUntil <= now) return null;
  if (plan.freeDeliveryOver !== null) return { kind: "free_delivery", minItems: plan.freeDeliveryOver || null };
  if (plan.deliveryDiscountPercent) return { kind: "delivery_percent", value: plan.deliveryDiscountPercent };
  return null;
}

/** Joining once paid (115.11 takes the payment): active until the end of the first period. */
export async function joinClub(store: DataStore, plan: MarketClubPlan, userId: number, paymentRef: string, now: Date): Promise<MarketClubMember> {
  const current = await store.getMarketClubMember(plan.appId, userId);
  const stillPaid = current && current.paidUntil && current.paidUntil > now && current.planId === plan.id;
  return store.saveMarketClubMember(
    { appId: plan.appId, userId, planId: plan.id, status: "active", renews: true, startedAt: current?.startedAt ?? now, paidUntil: addPeriod(stillPaid ? current!.paidUntil! : now, plan.period), paymentRef, saved: current?.saved ?? 0 },
    now,
  );
}

/** A renewal paid: the next period from the end of the current one. */
export async function renewClub(store: DataStore, plan: MarketClubPlan, member: MarketClubMember, paymentRef: string, now: Date): Promise<MarketClubMember> {
  const from = member.paidUntil && member.paidUntil > now ? member.paidUntil : now;
  return store.saveMarketClubMember({ ...member, status: "active", paidUntil: addPeriod(from, plan.period), paymentRef }, now);
}

/** Cancelling stops renewal; the benefit stays until the paid period ends. */
export async function cancelClub(store: DataStore, member: MarketClubMember, now: Date): Promise<MarketClubMember> {
  return store.saveMarketClubMember({ ...member, status: member.paidUntil && member.paidUntil > now ? "cancelled" : "expired", renews: false }, now);
}

/** The daily job: members whose paid period ended and who don't renew become expired; those who renew are due a payment. */
export async function clubDue(store: DataStore, appId: string, now: Date): Promise<{ expired: number; renewals: MarketClubMember[] }> {
  let expired = 0;
  const renewals: MarketClubMember[] = [];
  for (const status of ["active", "cancelled"] as const) {
    // Read them all first: expiring one moves it out of this list.
    const members: MarketClubMember[] = [];
    for (let offset = 0; ; offset += 500) {
      const { items } = await store.listMarketClubMembers(appId, { status, limit: 500, offset });
      members.push(...items);
      if (items.length < 500) break;
    }
    for (const m of members) {
      if (!m.paidUntil || m.paidUntil > now) continue;
      if (m.renews && status === "active") renewals.push(m);
      else {
        await store.saveMarketClubMember({ ...m, status: "expired", renews: false }, now);
        expired++;
      }
    }
  }
  return { expired, renewals };
}

/** After an order: what the club saved the member. */
export async function recordClubSaving(store: DataStore, appId: string, userId: number | null, saved: number, now: Date): Promise<void> {
  if (userId !== null && saved > 0) await store.addMarketClubSaving(appId, userId, saved, now);
}
