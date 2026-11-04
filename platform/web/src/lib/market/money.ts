import { allocate, percentOf } from "./currency";

/**
 * 115.4 The marketplace's money. Every order is priced in lines the
 * customer sees (items, their discounts, the coupon, the club, delivery,
 * tax, tip, wallet, total) and split for the statements between the app's
 * owner and the vendor: who paid each discount, the vendor's commission,
 * the delivery fee and its share, the tax, and who collected the money. How
 * the owner and the vendor then settle is theirs, outside Yallapp; these
 * numbers say what each owes the other.
 *
 * All amounts are whole minor units of the app's one currency (currency.ts).
 */

export type Funder = "owner" | "vendor";

export interface PricedItem {
  /** The price of one unit (or one kilo or litre) after the vendor's own item discount. */
  unitPrice: number;
  /** Before the item's discount, when it has one (a struck-through price). The vendor pays item discounts. */
  wasUnitPrice?: number | null;
  /** Units, or a weighed amount (1.25 kg). */
  quantity: number;
}

export interface Commission {
  /** `percent` of the items after the vendor's discounts, or a `fixed` amount per order. */
  kind: "percent" | "fixed";
  /** The percentage (12.5) or the amount in minor units. */
  value: number;
}

export interface Coupon {
  kind: "percent" | "amount" | "free_delivery";
  /** The percentage, or the amount in minor units; ignored for free delivery. */
  value: number;
  /** The most a percentage coupon takes off, in minor units. */
  maxDiscount?: number | null;
  funder: Funder;
  code?: string | null;
}

export interface ClubBenefit {
  /** Free delivery, or a percentage off it. */
  kind: "free_delivery" | "delivery_percent";
  value?: number;
  /** Only when the items come to at least this. */
  minItems?: number | null;
}

export interface Tax {
  /** The rate, e.g. 14 for 14%. */
  ratePercent: number;
  /** Prices already include it (it is shown, not added). */
  included: boolean;
  /** Whether the delivery fee is taxed too. */
  onDelivery: boolean;
  label: string;
}

export interface PriceInput {
  items: PricedItem[];
  /** The delivery fee before discounts; 0 for pick-up. */
  deliveryFee: number;
  /** Who delivers: the app's couriers (the fee is the owner's) or the vendor's own drivers (the vendor's). Null for pick-up. */
  deliveryBy: "app" | "vendor" | null;
  /** The vendor's commission to the owner. */
  commission: Commission;
  coupon?: Coupon | null;
  club?: ClubBenefit | null;
  tax?: Tax | null;
  tip?: number;
  /** The wallet's balance, when the customer uses it. */
  wallet?: number;
  /** Who takes the customer's money: the owner (online, or the app's courier's cash) or the vendor (cash to its own driver or at pick-up). */
  collectedBy: Funder;
  /** 115.5 What the vendor pays the owner for the app's couriers on this order, besides its commission (lib/market/delivery.ts). */
  courierCharge?: number;
}

export type PriceLineKind = "items" | "item_discounts" | "coupon" | "club" | "delivery" | "delivery_discount" | "tax" | "tip" | "wallet" | "total";

export interface PriceLine {
  kind: PriceLineKind;
  amount: number;
}

export interface OrderMoney {
  /** What the customer sees, in order; discounts negative; ends with the total. */
  lines: PriceLine[];
  /** Items at their prices before the vendor's item discounts. */
  itemsBefore: number;
  /** The vendor's item discounts (positive). */
  itemDiscounts: number;
  /** Items after the vendor's item discounts. */
  items: number;
  coupon: { amount: number; onItems: number; onDelivery: number; funder: Funder } | null;
  club: number;
  delivery: number;
  deliveryDiscount: number;
  tax: number;
  tip: number;
  total: number;
  wallet: number;
  /** What is left to pay after the wallet. */
  payNow: number;
  split: Split;
}

export interface Split {
  /** The vendor's commission to the owner. */
  commission: number;
  /** 115.5 What the vendor pays the owner for the app's couriers (0 otherwise). Orders priced before 115.5 have none. */
  courierCharge?: number;
  /** The part of the items' money that is the vendor's, after its commission and the discounts it pays, with its tax. */
  vendorEarns: number;
  /** The owner's part: commission, the app couriers' delivery, less the discounts the owner pays (it can be negative). Tips stay outside. */
  ownerEarns: number;
  /** Who took the customer's money, and so who owes the other. */
  collectedBy: Funder;
  /** What the owner owes the vendor for this order (positive), or the vendor owes the owner (negative), with the vendor's tips and who holds the money counted. */
  dueToVendor: number;
}

function lineTotal(item: PricedItem, price: number): number {
  return Math.round(price * item.quantity + 1e-9);
}

/** Prices one order. Totals always add up: no rounding is lost between the lines. */
export function priceOrder(input: PriceInput): OrderMoney {
  const itemsBefore = input.items.reduce((sum, i) => sum + lineTotal(i, i.wasUnitPrice != null && i.wasUnitPrice > i.unitPrice ? i.wasUnitPrice : i.unitPrice), 0);
  const items = input.items.reduce((sum, i) => sum + lineTotal(i, i.unitPrice), 0);
  const itemDiscounts = itemsBefore - items;

  // The club's benefit is on delivery.
  const delivery = input.deliveryBy ? input.deliveryFee : 0;
  let club = 0;
  if (input.club && delivery > 0 && (input.club.minItems == null || items >= input.club.minItems)) {
    club = input.club.kind === "free_delivery" ? delivery : Math.min(delivery, percentOf(delivery, input.club.value ?? 0));
  }
  const deliveryAfterClub = delivery - club;

  // The coupon: off the items (never below zero), or the delivery.
  let coupon: OrderMoney["coupon"] = null;
  if (input.coupon) {
    const c = input.coupon;
    if (c.kind === "free_delivery") {
      if (deliveryAfterClub > 0) coupon = { amount: deliveryAfterClub, onItems: 0, onDelivery: deliveryAfterClub, funder: c.funder };
    } else {
      let off = c.kind === "percent" ? percentOf(items, c.value) : c.value;
      if (c.kind === "percent" && c.maxDiscount != null) off = Math.min(off, c.maxDiscount);
      off = Math.max(0, Math.min(off, items));
      if (off > 0) coupon = { amount: off, onItems: off, onDelivery: 0, funder: c.funder };
    }
  }
  const itemsAfterCoupon = items - (coupon?.onItems ?? 0);
  const deliveryCharged = deliveryAfterClub - (coupon?.onDelivery ?? 0);
  const deliveryDiscount = club + (coupon?.onDelivery ?? 0);

  // Tax on what the customer pays for the items (and the delivery when taxed).
  let tax = 0;
  const taxed = input.tax ? itemsAfterCoupon + (input.tax.onDelivery ? deliveryCharged : 0) : 0;
  if (input.tax && input.tax.ratePercent > 0) {
    tax = input.tax.included ? taxed - Math.round((taxed * 100) / (100 + input.tax.ratePercent) + 1e-9) : percentOf(taxed, input.tax.ratePercent);
  }
  const addedTax = input.tax && !input.tax.included ? tax : 0;
  const tip = Math.max(0, input.tip ?? 0);
  const total = itemsAfterCoupon + deliveryCharged + addedTax + tip;
  const wallet = Math.max(0, Math.min(input.wallet ?? 0, total));
  const payNow = total - wallet;

  const lines: PriceLine[] = [{ kind: "items", amount: itemsBefore }];
  if (itemDiscounts > 0) lines.push({ kind: "item_discounts", amount: -itemDiscounts });
  if (coupon && coupon.onItems > 0) lines.push({ kind: "coupon", amount: -coupon.onItems });
  if (input.deliveryBy) lines.push({ kind: "delivery", amount: delivery });
  if (club > 0) lines.push({ kind: "club", amount: -club });
  if (coupon && coupon.onDelivery > 0) lines.push({ kind: "delivery_discount", amount: -coupon.onDelivery });
  if (tax > 0) lines.push({ kind: "tax", amount: input.tax!.included ? tax : addedTax });
  if (tip > 0) lines.push({ kind: "tip", amount: tip });
  if (wallet > 0) lines.push({ kind: "wallet", amount: -wallet });
  lines.push({ kind: "total", amount: total });

  return {
    lines,
    itemsBefore,
    itemDiscounts,
    items,
    coupon,
    club,
    delivery,
    deliveryDiscount,
    tax,
    tip,
    total,
    wallet,
    payNow,
    split: splitOrder(input, { items, coupon, club, delivery, deliveryCharged, tax, addedTax, tip, total, payNow }),
  };
}

function splitOrder(
  input: PriceInput,
  m: { items: number; coupon: OrderMoney["coupon"]; club: number; delivery: number; deliveryCharged: number; tax: number; addedTax: number; tip: number; total: number; payNow: number },
): Split {
  const coupon = m.coupon;
  const vendorPays = coupon?.funder === "vendor";
  // The commission is on the items after the vendor's own discounts and the coupons it pays; an owner's coupon doesn't lower it.
  const base = Math.max(0, m.items - (vendorPays ? coupon!.onItems : 0));
  const commission = input.commission.kind === "percent" ? percentOf(base, input.commission.value) : Math.min(base, Math.max(0, input.commission.value));

  // Added tax goes to the seller of what it is on: the items' to the vendor, the delivery's to whoever delivers. Included tax is inside the prices already.
  let itemsTax = 0;
  let deliveryTax = 0;
  if (m.addedTax > 0 && input.tax) {
    [itemsTax, deliveryTax] = allocate(m.addedTax, [m.items - (coupon?.onItems ?? 0), input.tax.onDelivery ? m.deliveryCharged : 0]) as [number, number];
  }

  // The vendor's items, less its commission and the item coupon it pays.
  let vendorEarns = m.items - commission - (vendorPays ? coupon!.onItems : 0) + itemsTax;
  // Its own delivery: the whole fee, less a delivery coupon it pays (the club and the owner's coupons are the owner's to pay).
  if (input.deliveryBy === "vendor") vendorEarns += m.delivery - (vendorPays ? coupon!.onDelivery : 0) + deliveryTax;
  // 115.5 The app's couriers: what the vendor pays the owner for them.
  const courierCharge = input.deliveryBy === "app" ? Math.max(0, Math.round(input.courierCharge ?? 0)) : 0;
  vendorEarns -= courierCharge;
  // Tips go to whoever carries the order: the vendor's driver, or the vendor at pick-up; the app's courier otherwise.
  const vendorTip = input.deliveryBy === "app" ? 0 : m.tip;
  const ownerEarns = m.total - m.tip - vendorEarns;
  // The collector holds what was paid now; the owner holds the wallet's part.
  const held = input.collectedBy === "vendor" ? m.payNow : 0;
  return { commission, courierCharge, vendorEarns, ownerEarns, collectedBy: input.collectedBy, dueToVendor: vendorEarns + vendorTip - held };
}
