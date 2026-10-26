import { COMPANY_PLACE, COMPANY } from "../company";
import type { CouponRedemption, PlanPayment } from "../data/types";
import { PROVIDER_NAME } from "../payments/provider";
import { formatAmount } from "./prices";

/**
 * 52 A plan payment's receipt, as the client's dashboard shows it: the
 * amount charged (pounds with Kashier) and, when the client saw another
 * currency (dollars outside Egypt), that price as "about".
 */

/** 51 The storage packs a payment paid for: "+25 GB and +100 GB". */
function packList(payment: Pick<PlanPayment, "storagePacks">): string {
  const names = (payment.storagePacks ?? []).map((p) => `+${p.gb} GB`);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
}

/** 51 What a plan payment paid for, in payment lists: "Growth · 1 year", "Storage +25 GB", or "Growth · 1 year · storage +25 GB". */
export function paymentWhat(payment: Pick<PlanPayment, "months" | "purpose" | "storagePacks">, planName: string): string {
  if (payment.purpose === "storage") return `Storage ${packList(payment)}`;
  const plan = `${planName} · ${payment.months === 1 ? "1 month" : "1 year"}`;
  return payment.storagePacks?.length ? `${plan} · storage ${packList(payment)}` : plan;
}

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
  const rows: [string, string][] = [
    ["Receipt", receiptNumber(payment)],
    ["Date", input.paidOn],
    ["Issued by", `${COMPANY.name}, ${COMPANY_PLACE}`],
    ["Billed to", `${input.billedTo.name} (${input.billedTo.email})`],
    ["App", input.appName],
  ];
  // 51 A storage pack payment, or storage packs renewed with the plan.
  if (payment.purpose === "storage") rows.push(["Storage", `${packList(payment)} for the Media library, until the plan's period ends`]);
  else {
    rows.push(["Plan", `${input.planName}, ${payment.months === 1 ? "1 month" : "1 year"}`]);
    if (payment.storagePacks?.length) rows.push(["Storage renewed", packList(payment)]);
  }
  if (input.coupon) rows.push(["Coupon", `${input.coupon.code}, ${formatAmount(input.coupon.discountCents, input.coupon.currency)} off`]);
  rows.push(["Amount charged", formatAmount(payment.amountCents, payment.currency)]);
  if (payment.shownCents && payment.shownCurrency && payment.shownCurrency !== payment.currency) {
    rows.push(["Price shown", `About ${formatAmount(payment.shownCents, payment.shownCurrency)}. Your bank may have converted the charge at its own rate.`]);
  }
  rows.push(["Paid with", paidWith(payment)]);
  return rows;
}

/** How a plan payment was paid, as the receipt and the admin's lists say it (the dashboard translates it). */
export function paidWith(payment: Pick<PlanPayment, "amountCents" | "paymentProvider" | "paymentId" | "method" | "bankReference">): string {
  // 95.2 Recorded by the team once the transfer arrived.
  if (payment.method === "bank_transfer") return payment.bankReference ? `Bank transfer to Yallapp (reference ${payment.bankReference})` : "Bank transfer to Yallapp";
  if (payment.amountCents === 0) return "The coupon covered the whole price: no card payment.";
  const provider = PROVIDER_NAME[payment.paymentProvider ?? "iyzico"];
  return `Card, through ${provider}${payment.paymentId ? ` (reference ${payment.paymentId})` : ""}`;
}
