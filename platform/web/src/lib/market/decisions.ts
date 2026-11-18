import type { DataStore } from "../data/store";
import type { App, MarketCoupon, MarketOrder } from "../data/types";
import { ownPaymentAccount } from "../catalog/settings";
import { notifyDeps } from "../delivery/flow";
import { tellComplaint } from "./notify";
import type { DecisionDeps } from "./complaints";
import { COMPLAINT_COUPON_DAYS, refundableToPayment } from "./complaints";
import { refundMarketPayment } from "./payments";

/**
 * 115.9 What support's decision on a complaint is carried out with: a refund
 * on the order's payment through the app's own gateway (47's refunds), and a
 * one-use coupon at the order's place (115.52). The dashboard's complaint queue
 * (115.12) passes these to `decideComplaint`. 115.22 And the customer is
 * told of the decision (`complaint_update`).
 */
export function complaintDecisionDeps(store: DataStore, app: App, key: Buffer, input: { ip: string; now: Date }): DecisionDeps {
  return {
    tell: (complaint) => tellComplaint(notifyDeps({ store, app, now: input.now }), complaint, "decision"),
    refundToPayment: async (order: MarketOrder, amount: number, complaintId: number) => {
      const account = ownPaymentAccount(app, key);
      if (!account) return { ok: false, error: "The app's payments aren't set up, so the refund can't go back to the card. Refund to the wallet instead." };
      const others = (await store.listMarketComplaints({ appId: app.id, orderId: order.id, limit: 100, offset: 0 })).items.filter((c) => c.id !== complaintId);
      const earlier = order.money.payNow - refundableToPayment(order, others);
      const done = await refundMarketPayment(account, order, { cents: amount, refundedBefore: earlier, paymentId: null, note: `Complaint ${complaintId}`, ip: input.ip, now: input.now });
      return done.ok ? { ok: true } : { ok: false, error: done.error };
    },
    makeCoupon: (order: MarketOrder, amount: number, complaintId: number) => complaintCoupon(store, order, amount, complaintId, input.now),
  };
}

const COMPLAINT_COUPON_TITLE = "Sorry about order ";

/** A coupon support gave after a complaint (this one's or 115.9's earlier ones): one customer's, never a public offer. */
export function isComplaintCoupon(c: Pick<MarketCoupon, "title">): boolean {
  return c.title.startsWith(COMPLAINT_COUPON_TITLE);
}

/**
 * 115.52 A complaint's coupon: SORRY-<the order's number>, worth the amount,
 * at the order's place, once, for COMPLAINT_COUPON_DAYS, with no smallest
 * order; the owner bears it unless support said the place does (the
 * statement counts the decision, not the coupon).
 */
export async function complaintCoupon(store: DataStore, order: MarketOrder, amount: number, complaintId: number, now: Date): Promise<{ code: string; endsAt: Date }> {
  if (order.userId === null) throw new Error("The order has no customer account to give a coupon to.");
  const endsAt = new Date(now.getTime() + COMPLAINT_COUPON_DAYS * 86_400_000);
  const base = `SORRY-${1000 + order.id}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const made = await store.createMarketCoupon({
      appId: order.appId,
      code,
      title: `${COMPLAINT_COUPON_TITLE}${1000 + order.id}`,
      kind: "amount",
      value: amount,
      maxDiscount: null,
      minOrder: 0,
      currency: order.currency,
      paidBy: "owner",
      firstOrderOnly: false,
      vendorIds: order.vendorId !== null ? [order.vendorId] : [],
      vendorKinds: [],
      departmentIds: [],
      usesLimit: 1,
      perUserLimit: 1,
      startsAt: now,
      endsAt,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    if (made?.code) return { code: made.code, endsAt };
  }
  throw new Error(`No free coupon code was found for complaint ${complaintId}.`);
}
