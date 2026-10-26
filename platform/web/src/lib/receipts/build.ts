import { ltrSpan } from "../arabic-shape";
import { taxLabel } from "../catalog/tax";
import { formatAmount } from "../billing/prices";
import { receiptNumber } from "../billing/receipt";
import { formatCents } from "../catalog/money";
import { orderNumber } from "../catalog/settings";
import { COMPANY } from "../company";
import type { App, CatalogOrder, ContactSetting, CouponRedemption, Donation, PaymentProviderId, PlanPayment } from "../data/types";
import { donationReference } from "../donations/service";
import { whatsappLines } from "../contact-lines";
import { PROVIDER_NAME } from "../payments/provider";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import type { ReceiptDocument, ReceiptItem, ReceiptParty, ReceiptTotal } from "./pdf";
import { receiptWord, type ReceiptWordKey } from "./words";

/**
 * 71 What each receipt says, in the payer's language, for lib/receipts/pdf.ts:
 * a client's plan or storage payment to Yallapp, a customer's order from a
 * business (products, a restaurant's order, tickets, paid courses,
 * memberships; through the business's own account or, 37, Yallapp's), and a
 * donation to a charity. Amounts are written as everywhere else
 * (`formatAmount` for Yallapp's prices, `formatCents` for a business's), the
 * date in the account's or app's time zone. No tax lines: the system has
 * none. Yallapp's details are its name, city, website and the contact
 * details set in the admin, with the lines the team adds there for invoices
 * (Settings › Invoices); nothing is made up.
 */

type W = (key: ReceiptWordKey, values?: Record<string, string>) => string;

const wordsFor =
  (lang: Lang): W =>
  (key, values) =>
    receiptWord(lang, key, values);

/** "21 October 2026 at 14:05 (GMT+3)" in the language, in `zone`; the offset as GMT in every language, read left to right. */
export function receiptDate(lang: Lang, at: Date, zone: string): string {
  const when = formatDate(lang, at, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  return `${when} ${ltrSpan(`(${offset})`)}`;
}

function provider(id: PaymentProviderId | null | undefined): string {
  return PROVIDER_NAME[id ?? "iyzico"];
}

/** Yallapp as the seller of its plans: its name and city, the team's lines for invoices, its website and contact details. */
export function yallappSeller(lang: Lang, contact: ContactSetting, invoiceLines: string[]): ReceiptParty {
  const w = wordsFor(lang);
  return {
    label: w("from"),
    name: COMPANY.name,
    lines: [
      ...invoiceLines.map((l) => l.trim()).filter(Boolean),
      w("place"),
      ltrSpan(COMPANY.website.replace(/^https:\/\//, "")),
      ltrSpan(contact.email),
      // 72 Both of Yallapp's WhatsApp numbers, each with where it's for.
      w("whatsappEgypt", { number: ltrSpan(whatsappLines(contact).egypt.display) }),
      w("whatsappOutside", { number: ltrSpan(contact.whatsapp) }),
    ],
  };
}

/** A business as the seller: its app's name and how its customers reach it (the app's support email and WhatsApp). */
export function businessSeller(lang: Lang, app: Pick<App, "appName" | "supportEmail" | "hostedSettings">): ReceiptParty {
  const w = wordsFor(lang);
  const whatsapp = app.hostedSettings?.supportWhatsapp ?? null;
  return {
    label: w("from"),
    name: app.appName?.trim() || "—",
    lines: [...(app.supportEmail ? [ltrSpan(app.supportEmail)] : []), ...(whatsapp ? [w("whatsapp", { number: ltrSpan(whatsapp) })] : [])],
  };
}

function statusOf(w: W, input: { refunded: boolean; refundedCents: number; demo: boolean }): ReceiptDocument["status"] {
  if (input.demo) return { label: w("demo"), tone: "demo" };
  if (input.refunded) return { label: w("refundedAll"), tone: "refunded" };
  if (input.refundedCents > 0) return { label: w("refundedPart"), tone: "partly" };
  return { label: w("paid"), tone: "paid" };
}

function cardRows(w: W, id: PaymentProviderId | null | undefined, reference: string | null): [string, string][] {
  return [[w("paidWith"), w("cardThrough", { provider: provider(id) })], ...(reference ? ([[w("reference"), ltrSpan(reference)]] as [string, string][]) : [])];
}

/** 95.2 A plan payment: by card, covered by a coupon, or a bank transfer the team recorded. */
function planPaymentRows(w: W, payment: PlanPayment): [string, string][] {
  if (payment.method === "bank_transfer") {
    return [[w("paidWith"), w("bankTransfer")], ...(payment.bankReference ? ([[w("reference"), ltrSpan(payment.bankReference)]] as [string, string][]) : [])];
  }
  return payment.amountCents > 0 ? cardRows(w, payment.paymentProvider, payment.paymentId) : [[w("paidWith"), w("couponCovered")]];
}

const money = (text: string) => ltrSpan(text);
const minus = (text: string) => ltrSpan(`−${text}`);

/** 51 "+25 GB and +100 GB" as the receipt writes it. */
function packs(payment: Pick<PlanPayment, "storagePacks">): string {
  return (payment.storagePacks ?? []).map((p) => ltrSpan(`+${p.gb} GB`)).join(", ");
}

export interface PlanReceiptInput {
  lang: Lang;
  payment: PlanPayment;
  /** The plan's name as the dashboard shows it. */
  planName: string;
  appName: string | null;
  billedTo: { name: string; email: string };
  coupon: Pick<CouponRedemption, "code" | "discountCents" | "currency"> | null;
  zone: string;
  contact: ContactSetting;
  invoiceLines: string[];
}

/** A client's payment to Yallapp: a plan (with the storage packs renewed with it) or storage packs. */
export function planReceipt(input: PlanReceiptInput): ReceiptDocument {
  const { lang, payment } = input;
  const w = wordsFor(lang);
  const number = receiptNumber(payment);
  const fmt = (cents: number) => money(formatAmount(cents, payment.currency));
  const packCents = (payment.storagePacks ?? []).reduce((sum, p) => sum + p.cents, 0);
  // A coupon in the charge's currency is taken off the plan's price; one in another currency is only named.
  const discount = input.coupon && input.coupon.currency === payment.currency ? input.coupon.discountCents : 0;
  const items: ReceiptItem[] = [];
  const packItems: ReceiptItem[] = (payment.storagePacks ?? []).map((p) => ({ name: w("storageItem", { packs: ltrSpan(`+${p.gb} GB`) }), detail: w("storageDetail"), quantity: 1, amount: fmt(p.cents) }));
  if (payment.purpose === "storage") items.push(...packItems);
  else {
    const planCents = payment.amountCents + discount - packCents;
    const planItem = { name: w("planItem", { plan: input.planName }), detail: w(payment.months === 1 ? "oneMonth" : "oneYear"), quantity: 1 };
    // What the plan cost is what is left of the charge; if that doesn't add up (it always should), one line with the charge.
    if (planCents >= 0) items.push({ ...planItem, amount: fmt(planCents) }, ...packItems);
    else items.push({ ...planItem, detail: [planItem.detail, payment.storagePacks?.length ? w("storageRenewed", { packs: packs(payment) }) : ""].filter(Boolean).join(" · "), amount: fmt(payment.amountCents) });
  }
  const totals: ReceiptTotal[] = [];
  if (discount > 0) {
    totals.push({ label: w("subtotal"), value: fmt(payment.amountCents + discount) });
    totals.push({ label: w("coupon", { code: ltrSpan(input.coupon!.code) }), value: minus(formatAmount(discount, payment.currency)) });
  } else if (input.coupon) {
    totals.push({ label: w("coupon", { code: ltrSpan(input.coupon.code) }), value: minus(formatAmount(input.coupon.discountCents, input.coupon.currency)) });
  }
  totals.push({ label: w("total"), value: fmt(payment.amountCents), strong: true });
  const notes: string[] = [];
  if (payment.shownCents && payment.shownCurrency && payment.shownCurrency !== payment.currency) {
    notes.push(w("priceShown", { amount: money(formatAmount(payment.shownCents, payment.shownCurrency)) }));
  }
  return {
    lang,
    title: w("receipt"),
    numberLine: `${w("number")} ${ltrSpan(number)}`,
    headerLines: [`${w("date")}: ${receiptDate(lang, payment.paidAt ?? payment.createdAt, input.zone)}`],
    status: statusOf(w, { refunded: false, refundedCents: 0, demo: false }),
    seller: yallappSeller(lang, input.contact, input.invoiceLines),
    buyer: { label: w("billedTo"), name: input.billedTo.name, lines: [ltrSpan(input.billedTo.email)] },
    facts: input.appName ? [[w("app"), input.appName]] : [],
    columns: { item: w("item"), quantity: w("quantity"), amount: w("amount") },
    items,
    totals,
    payment: { label: w("payment"), rows: planPaymentRows(w, payment) },
    notes,
    footer: w("thanksYallapp"),
    accent: "#FF5A1F",
    meta: { title: `${w("receipt")} ${number}`, author: COMPANY.name },
  };
}

export interface OrderReceiptInput {
  lang: Lang;
  app: Pick<App, "appName" | "supportEmail" | "hostedSettings" | "primaryColor" | "demo">;
  order: CatalogOrder;
  zone: string;
}

/** A customer's order from a business: products, a restaurant's order, tickets, paid courses, a membership. */
export function orderReceipt(input: OrderReceiptInput): ReceiptDocument {
  const { lang, order, app } = input;
  const w = wordsFor(lang);
  const number = orderNumber(order);
  const fmt = (cents: number) => money(formatCents(cents, order.currency));
  const items: ReceiptItem[] = order.lines.map((line) => ({
    name: line.name,
    detail: line.options?.length ? line.options.map((o) => o.name).join(", ") : null,
    quantity: line.quantity,
    amount: fmt(line.unitCents * line.quantity),
  }));
  const totals: ReceiptTotal[] = [];
  // 91.1 The coupon and 91.4 the loyalty points, so the lines add up to the total.
  const coupon = order.discountCents ?? 0;
  const points = order.points?.discountCents ?? 0;
  if (order.shippingCents > 0 || coupon > 0 || points > 0 || (order.tax && !order.tax.included)) {
    totals.push({ label: w("subtotal"), value: fmt(order.subtotalCents) });
    if (coupon > 0) totals.push({ label: w("coupon", { code: ltrSpan(order.couponCode ?? "") }), value: minus(formatCents(coupon, order.currency)) });
    if (points > 0) totals.push({ label: w("points", { points: String(order.points!.used) }), value: minus(formatCents(points, order.currency)) });
    if (order.shippingCents > 0) totals.push({ label: w(order.fulfilment ? "deliveryFee" : "shipping"), value: fmt(order.shippingCents) });
  }
  // 91.5 An added tax is a line; one inside the prices says how much of the total it is.
  if (order.tax && !order.tax.included) totals.push({ label: taxLabel(order.tax), value: fmt(order.tax.cents) });
  totals.push({ label: w("total"), value: fmt(order.totalCents), strong: true });
  if (order.tax?.included) totals.push({ label: w("taxIncluded", { tax: taxLabel(order.tax) }), value: fmt(order.tax.cents) });
  const refunded = order.refundedCents ?? 0;
  if (refunded > 0) totals.push({ label: w("refunded"), value: minus(formatCents(refunded, order.currency)), danger: true });
  const facts: [string, string][] = [];
  // 26 A restaurant's order: picked up, or delivered where.
  if (order.fulfilment) {
    const address = order.fulfilment.address ? [order.fulfilment.address.address, order.fulfilment.address.district].filter(Boolean).join(", ") : "";
    facts.push([w("collection"), order.fulfilment.type === "pickup" ? w("pickup") : address ? w("deliveryTo", { address }) : w("delivery")]);
  }
  const customer = order.customer;
  const notes: string[] = [];
  if (refunded > 0) notes.push(w("refundedNote", { amount: money(formatCents(refunded, order.currency)) }));
  // 37 Sold through Yallapp's account: the money went there first.
  if (order.commissionCents !== null && !app.demo) notes.push(w("marketplace", { shop: app.appName?.trim() || "—" }));
  return {
    lang,
    title: w("receipt"),
    numberLine: `${w("orderNumber", { number: ltrSpan(number) })}`,
    headerLines: [`${w("date")}: ${receiptDate(lang, order.paidAt ?? order.createdAt, input.zone)}`],
    status: statusOf(w, { refunded: order.status === "refunded", refundedCents: refunded, demo: Boolean(app.demo) }),
    seller: businessSeller(lang, app),
    buyer: customer
      ? {
          label: w("customer"),
          name: customer.name,
          lines: [ltrSpan(customer.email), ltrSpan(customer.phone), [customer.address, customer.city].filter(Boolean).join(", ")].filter(Boolean),
        }
      : null,
    facts,
    columns: { item: w("item"), quantity: w("quantity"), amount: w("amount") },
    items,
    totals,
    payment: { label: w("payment"), rows: app.demo ? [[w("paidWith"), w("demo")]] : cardRows(w, order.paymentProvider, order.paymentId) },
    notes,
    footer: w("thanks"),
    accent: app.primaryColor,
    meta: { title: `${w("receipt")} ${number}`, author: app.appName?.trim() || COMPANY.name },
  };
}

export interface DonationReceiptInput {
  lang: Lang;
  app: Pick<App, "appName" | "supportEmail" | "hostedSettings" | "primaryColor" | "demo">;
  donation: Donation;
  zone: string;
}

/** A donation to a charity's campaign. It states what was given; it makes no tax claims. */
export function donationReceipt(input: DonationReceiptInput): ReceiptDocument {
  const { lang, donation, app } = input;
  const w = wordsFor(lang);
  const reference = donationReference(donation);
  const fmt = (cents: number) => money(formatCents(cents, donation.currency));
  const refunded = donation.refundedCents ?? 0;
  const org = app.appName?.trim() || "—";
  const totals: ReceiptTotal[] = [{ label: w("total"), value: fmt(donation.amountCents), strong: true }];
  if (refunded > 0) totals.push({ label: w("refunded"), value: minus(formatCents(refunded, donation.currency)), danger: true });
  return {
    lang,
    title: w("donationReceipt"),
    numberLine: `${w("number")} ${ltrSpan(reference)}`,
    headerLines: [`${w("date")}: ${receiptDate(lang, donation.paidAt ?? donation.createdAt, input.zone)}`],
    status: statusOf(w, { refunded: donation.status === "refunded", refundedCents: refunded, demo: Boolean(app.demo) }),
    seller: businessSeller(lang, app),
    buyer: donation.donorName || donation.donorEmail ? { label: w("donor"), name: donation.donorName ?? "—", lines: donation.donorEmail ? [ltrSpan(donation.donorEmail)] : [] } : null,
    facts: [[w("campaign"), donation.campaignTitle]],
    columns: { item: w("item"), quantity: w("quantity"), amount: w("amount") },
    items: [{ name: w("donation"), detail: `${donation.campaignTitle} · ${w(donation.recurring === "monthly" ? "monthly" : "oneTime")}`, quantity: 1, amount: fmt(donation.amountCents) }],
    totals,
    payment: { label: w("payment"), rows: app.demo ? [[w("paidWith"), w("demo")]] : cardRows(w, donation.paymentProvider, donation.paymentId) },
    notes: refunded > 0 ? [w("refundedNote", { amount: money(formatCents(refunded, donation.currency)) })] : [],
    footer: w("thanksDonation", { org }),
    accent: app.primaryColor,
    meta: { title: `${w("donationReceipt")} ${reference}`, author: org },
  };
}

/** The file's name: "receipt-YA-1A2B3C4D.pdf". */
export function receiptFilename(number: string): string {
  return `receipt-${number.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}
