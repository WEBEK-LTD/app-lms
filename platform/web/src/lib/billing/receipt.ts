import { COMPANY_PLACE, COMPANY } from "../company";
import type { CouponRedemption, PlanPayment } from "../data/types";
import { PROVIDER_NAME } from "../payments/provider";
import { formatAmount } from "./prices";

/**
 * 52 A plan payment's receipt, as the client's dashboard shows it: the
 * amount charged (pounds with Kashier) and, when the client saw another
 * currency (dollars outside Egypt), that price as "about".
 */

/** "YA-1A2B3C4D": the payment's short reference. */
export function receiptNumber(payment: Pick<PlanPayment, "id">): string {
  return `YA-${payment.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function planReceiptRows(input: {
  payment: PlanPayment;
  planName: string;
  appName: string;
  billedTo: { name: string; email: string };
  paidOn: string;
  coupon?: Pick<CouponRedemption, "code" | "discountCents" | "currency"> | null;
}): [string, string][] {
  const { payment } = input;
  const provider = PROVIDER_NAME[payment.paymentProvider ?? "iyzico"];
  const rows: [string, string][] = [
    ["Receipt", receiptNumber(payment)],
    ["Date", input.paidOn],
    ["Issued by", `${COMPANY.name}, ${COMPANY_PLACE}`],
    ["Billed to", `${input.billedTo.name} (${input.billedTo.email})`],
    ["App", input.appName],
    ["Plan", `${input.planName}, ${payment.months === 1 ? "1 month" : "1 year"}`],
  ];
  if (input.coupon) rows.push(["Coupon", `${input.coupon.code}, ${formatAmount(input.coupon.discountCents, input.coupon.currency)} off`]);
  rows.push(["Amount charged", formatAmount(payment.amountCents, payment.currency)]);
  if (payment.shownCents && payment.shownCurrency && payment.shownCurrency !== payment.currency) {
    rows.push(["Price shown", `About ${formatAmount(payment.shownCents, payment.shownCurrency)}. Your bank may have converted the charge at its own rate.`]);
  }
  rows.push(
    payment.amountCents > 0
      ? ["Paid with", `Card, through ${provider}${payment.paymentId ? ` (reference ${payment.paymentId})` : ""}`]
      : ["Paid with", "The coupon covered the whole price: no card payment."],
  );
  return rows;
}
