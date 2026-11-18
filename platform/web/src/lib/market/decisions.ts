import type { DataStore } from "../data/store";
import type { App, MarketOrder } from "../data/types";
import { ownPaymentAccount } from "../catalog/settings";
import { notifyDeps } from "../delivery/flow";
import { tellComplaint } from "./notify";
import type { DecisionDeps } from "./complaints";
import { personalCoupon } from "./offers";
import { refundMarketToCard } from "./settlement";

/**
 * 115.9 What support's decision on a complaint is carried out with: a refund
 * on the order's payment through the app's own gateway (47's refunds), and a
 * one-person coupon for a compensation. The dashboard's complaint queue
 * (115.12) passes these to `decideComplaint`. 115.22 And the customer is
 * told of the decision (`complaint_update`).
 */
export function complaintDecisionDeps(store: DataStore, app: App, key: Buffer, input: { ip: string; now: Date }): DecisionDeps {
  return {
    tell: (complaint) => tellComplaint(notifyDeps({ store, app, now: input.now }), complaint, "decision"),
    refundToPayment: async (order: MarketOrder, amount: number, complaintId: number) => {
      if (!ownPaymentAccount(app, key)) return { ok: false, error: "The app's payments aren't set up, so the refund can't go back to the card. Refund to the wallet instead." };
      const earlier = (await store.listMarketComplaints({ appId: app.id, orderId: order.id, limit: 100, offset: 0 })).items
        .filter((c) => c.id !== complaintId && c.decision?.to === "payment")
        .reduce((sum, c) => sum + (c.decision?.amount ?? 0), 0) + (order.money.settlement?.toCard ?? 0);
      // 115.29 Through the shop order that took the payment, as 47's refunds.
      return refundMarketToCard({ store, app, key, ip: input.ip, now: input.now }, order, { cents: amount, refundedBefore: earlier, note: `Complaint ${complaintId}` });
    },
    makeCoupon: async (order: MarketOrder, amount: number, complaintId: number) => {
      if (order.userId === null) throw new Error("The order has no customer account to give a coupon to.");
      const coupon = await personalCoupon(store, { appId: app.id, userId: order.userId, amount, currency: order.currency, funder: "owner", title: `Sorry about order ${order.id}`, prefix: `C${complaintId}`.slice(0, 8) }, input.now);
      return coupon.code ?? "";
    },
  };
}
