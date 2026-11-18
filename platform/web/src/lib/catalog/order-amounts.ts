import type { CatalogOrder } from "../data/types";
import { formatCents } from "./money";
import { taxLabel } from "./tax";

type AmountsOrder = Pick<
  CatalogOrder,
  "subtotalCents" | "shippingCents" | "totalCents" | "currency" | "couponCode" | "discountCents" | "points" | "tax" | "delivery"
>;

/**
 * 173 `Order.amounts` for the app: what the total is made of, so the lines
 * the order screen draws add up to it. The subtotal, the coupon and the
 * points taken off, the delivery without the slot's fee (with the zone it
 * was priced for), the slot's fee, an added tax, the total. `shippingCents`
 * holds the slot's fee (`delivery.feeCents`), so it is taken out of the
 * delivery line here; the receipt and the owner's panel show them together.
 */
export function orderAmountsJson(order: AmountsOrder) {
  const m = (cents: number) => formatCents(cents, order.currency);
  const slotCents = Math.max(0, Math.min(order.delivery?.feeCents ?? 0, order.shippingCents));
  const shippingCents = order.shippingCents - slotCents;
  const discount = order.discountCents ?? 0;
  const points = order.points?.used ? order.points : null;
  return {
    subtotal: m(order.subtotalCents),
    discount: discount > 0 ? { code: order.couponCode ?? null, amount: m(discount) } : null,
    points: points ? { used: points.used, amount: m(points.discountCents) } : null,
    shipping: shippingCents > 0 ? { zone: order.delivery?.shipping?.zone ?? null, amount: m(shippingCents) } : null,
    slot_fee: slotCents > 0 ? m(slotCents) : null,
    fees: [] as { label: string; amount: string }[],
    tax: order.tax?.cents ? { label: taxLabel(order.tax), included: order.tax.included, amount: m(order.tax.cents) } : null,
    total: m(order.totalCents),
  };
}
