import type { Funder, OrderMoney } from "./money";

/**
 * 115.4 A vendor's statement for a period: its orders' money added up, the
 * refunds and compensations after them, and what each side owes the other.
 * How the owner and the vendor then settle is theirs; this is the account.
 */

export interface StatementOrder {
  id: number;
  reference: string;
  /** When it was delivered or picked up (orders count in the period they were completed). */
  at: Date;
  payment: "cash" | "card" | "apple_pay" | "google_pay" | "wallet";
  money: OrderMoney;
}

export interface StatementAdjustment {
  orderId: number;
  reference: string;
  at: Date;
  kind: "refund" | "compensation";
  /** Positive: given back to the customer. */
  amount: number;
  /** Who bears it: the vendor (taken off what it is owed) or the owner. */
  funder: Funder;
}

export interface StatementTotals {
  orders: number;
  itemsBefore: number;
  itemDiscounts: number;
  items: number;
  couponsByOwner: number;
  couponsByVendor: number;
  club: number;
  delivery: number;
  deliveryDiscounts: number;
  tax: number;
  tips: number;
  total: number;
  /** Paid online (card, Apple Pay, Google Pay) or from the wallet: held by the owner. */
  paidOnline: number;
  /** Paid in cash: held by whoever took it. */
  paidCash: number;
  /** Cash the vendor took itself (its own driver, pick-up). */
  cashHeldByVendor: number;
  commission: number;
  /** 115.5 What vendors paid the owner for the app's couriers. */
  courierCharges: number;
  vendorEarns: number;
  ownerEarns: number;
  refundsByVendor: number;
  refundsByOwner: number;
  /** After refunds: what the owner owes the vendor (positive), or the vendor owes the owner (negative). */
  net: number;
}

export interface Statement {
  from: Date;
  to: Date;
  currency: string;
  totals: StatementTotals;
  orders: StatementOrder[];
  adjustments: StatementAdjustment[];
}

const ZERO: StatementTotals = {
  orders: 0, itemsBefore: 0, itemDiscounts: 0, items: 0, couponsByOwner: 0, couponsByVendor: 0, club: 0, delivery: 0, deliveryDiscounts: 0, tax: 0, tips: 0, total: 0,
  paidOnline: 0, paidCash: 0, cashHeldByVendor: 0, commission: 0, courierCharges: 0, vendorEarns: 0, ownerEarns: 0, refundsByVendor: 0, refundsByOwner: 0, net: 0,
};

/** The statement of the orders completed and adjustments made in [from, to). */
export function buildStatement(input: { from: Date; to: Date; currency: string; orders: StatementOrder[]; adjustments: StatementAdjustment[] }): Statement {
  const inside = (at: Date) => at >= input.from && at < input.to;
  const orders = input.orders.filter((o) => inside(o.at)).sort((a, b) => a.at.getTime() - b.at.getTime() || a.id - b.id);
  const adjustments = input.adjustments.filter((a) => inside(a.at)).sort((a, b) => a.at.getTime() - b.at.getTime());
  const t: StatementTotals = { ...ZERO };
  for (const o of orders) {
    const m = o.money;
    t.orders += 1;
    t.itemsBefore += m.itemsBefore;
    t.itemDiscounts += m.itemDiscounts;
    t.items += m.items;
    if (m.coupon) t[m.coupon.funder === "owner" ? "couponsByOwner" : "couponsByVendor"] += m.coupon.amount;
    t.club += m.club;
    t.delivery += m.delivery;
    t.deliveryDiscounts += m.deliveryDiscount;
    t.tax += m.tax;
    t.tips += m.tip;
    t.total += m.total;
    if (o.payment === "cash") {
      t.paidCash += m.payNow;
      t.paidOnline += m.wallet;
      if (m.split.collectedBy === "vendor") t.cashHeldByVendor += m.payNow;
    } else {
      t.paidOnline += m.total;
    }
    t.commission += m.split.commission;
    t.courierCharges += m.split.courierCharge ?? 0;
    t.vendorEarns += m.split.vendorEarns;
    t.ownerEarns += m.split.ownerEarns;
    t.net += m.split.dueToVendor;
  }
  for (const a of adjustments) {
    if (a.funder === "vendor") {
      t.refundsByVendor += a.amount;
      t.net -= a.amount;
    } else {
      t.refundsByOwner += a.amount;
    }
  }
  return { from: input.from, to: input.to, currency: input.currency, totals: t, orders, adjustments };
}
