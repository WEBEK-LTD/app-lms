import { utcToLocal } from "../bookings/time";
import { randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { MarketClubMember, MarketClubPlan, MarketOrder } from "../data/types";
import { payUrlFor } from "../delivery/payment";
import { CLUB_PAY_LINE } from "./flow";

/**
 * 115.61 and 115.62 The delivery club for its members (D6: it renews by a
 * reminder and a payment link, at the owner's prices; nothing is charged by
 * itself). What it saved a member is read from their orders: the delivery
 * fees they didn't pay and the members' offers they used, this month and
 * since they first joined. The daily job's `club_renewal` reminder
 * (lib/market/notify.ts, 3 days before the end and on the last day, each
 * once) carries the payment link made here.
 */

export interface ClubSavings {
  /** Since they first joined: delivery not paid plus members' offers. */
  total: number;
  /** The same, in this month of the app's time zone. */
  thisMonth: number;
  /** Delivery fees not paid, since joining. */
  delivery: number;
  /** Members' offers, since joining. */
  offers: number;
  /** Orders delivered with their delivery free by the club, of all delivered orders, since joining. */
  freeDeliveries: number;
  deliveries: number;
  /** What they paid for the club, in all. */
  paid: number;
}

const DONE: MarketOrder["status"][] = ["delivered", "picked_up"];

/** The month of a moment in the app's time zone, as "2026-11". */
function monthOf(at: Date, zone: string): string {
  return utcToLocal(at, zone).date.slice(0, 7);
}

/** What one completed order saved a member: its delivery the club took off, and a members' offer's discount. */
export function orderSaving(order: Pick<MarketOrder, "money" | "couponCode">, memberCodes: ReadonlySet<string>): { delivery: number; offers: number } {
  const delivery = Math.max(0, order.money.club ?? 0);
  const offers = order.couponCode && memberCodes.has(order.couponCode.toUpperCase()) ? Math.max(0, order.money.coupon?.amount ?? 0) : 0;
  return { delivery, offers };
}

/** The member's savings, from their orders completed since they first joined. */
export async function clubSavings(store: DataStore, appId: string, member: MarketClubMember, now: Date, zone: string): Promise<ClubSavings> {
  const out: ClubSavings = { total: 0, thisMonth: 0, delivery: 0, offers: 0, freeDeliveries: 0, deliveries: 0, paid: member.paidTotal ?? 0 };
  if (!member.startedAt) return out;
  const memberCodes = new Set((await store.listMarketCoupons(appId)).filter((c) => c.membersOnly && c.code).map((c) => c.code!.toUpperCase()));
  const month = monthOf(now, zone);
  for (let offset = 0; offset < 5000; offset += 200) {
    const { items } = await store.listMarketOrders({ appId, userId: member.userId, statuses: DONE, completedSince: member.startedAt, limit: 200, offset });
    for (const o of items) {
      const saved = orderSaving(o, memberCodes);
      out.delivery += saved.delivery;
      out.offers += saved.offers;
      if (o.fulfilment === "delivery") {
        out.deliveries += 1;
        if (o.money.delivery > 0 && saved.delivery >= o.money.delivery) out.freeDeliveries += 1;
      }
      if (o.completedAt && monthOf(o.completedAt, zone) === month) out.thisMonth += saved.delivery + saved.offers;
    }
    if (items.length < 200) break;
  }
  out.total = out.delivery + out.offers;
  return out;
}

/** How a membership reads in the owner's members list. */
export type MemberState = "active" | "renewed" | "ending" | "ended" | "waiting";

export function memberState(member: MarketClubMember, now: Date): MemberState {
  if (member.status === "pending") return member.paidUntil && member.paidUntil > now ? "active" : "waiting";
  if (member.status === "expired" || !member.paidUntil || member.paidUntil <= now) return "ended";
  if (member.status === "cancelled") return "ending";
  return (member.periods ?? 0) > 1 ? "renewed" : "active";
}

/**
 * 115.62 The renewal's payment link: one line on the app's payment page
 * (/pay/[token], so every gateway the app has takes it), paid for the plan
 * at the owner's price; once paid, lib/market/flow.ts `payClubMembership`
 * runs the next period from the current end, or from that day if it ended.
 */
export async function clubPayLink(store: DataStore, input: { appId: string; platformUrl: string; userId: number; lang: string | null; plan: MarketClubPlan }, now: Date): Promise<string> {
  const token = randomToken(24);
  await store.createCatalogOrder({
    lang: input.lang,
    appId: input.appId,
    tokenHash: sha256Hex(token),
    userId: input.userId,
    status: "pending",
    lines: [{ productId: CLUB_PAY_LINE(input.plan.id), name: input.plan.name.slice(0, 200), quantity: 1, unitCents: input.plan.price, imageAssetId: null, digital: true }],
    subtotalCents: input.plan.price,
    shippingCents: 0,
    totalCents: input.plan.price,
    currency: input.plan.currency as "EGP",
    customer: null,
    paymentId: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
  });
  return payUrlFor(input.platformUrl, token);
}
