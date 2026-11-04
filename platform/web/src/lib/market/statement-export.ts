import type { Lang } from "@/i18n/config";
import { currencyDecimals, formatMinor, fromMinor } from "./currency";
import type { Statement, StatementTotals } from "./statement";
import { writeXlsx, type Cell } from "./xlsx";

/**
 * 115.4 A vendor's statement as CSV, Excel or PDF, in English, Arabic or
 * Turkish. Amounts are written with the currency's own decimals.
 */

type TotalKey = Exclude<keyof StatementTotals, "orders">;

export const TOTALS_ORDER: TotalKey[] = [
  "itemsBefore", "itemDiscounts", "items", "couponsByVendor", "couponsByOwner", "club", "delivery", "deliveryDiscounts", "tax", "tips", "total",
  "paidOnline", "paidCash", "cashHeldByVendor", "commission", "vendorEarns", "ownerEarns", "refundsByVendor", "refundsByOwner", "net",
];

interface Words {
  title: string;
  vendor: string;
  period: string;
  orders: string;
  summary: string;
  order: string;
  date: string;
  payment: string;
  adjustments: string;
  kind: string;
  amount: string;
  bornBy: string;
  owner: string;
  vendorSide: string;
  refund: string;
  compensation: string;
  netOwnerOwes: string;
  netVendorOwes: string;
  pay: Record<"cash" | "card" | "apple_pay" | "google_pay" | "wallet", string>;
  totals: Record<TotalKey, string>;
}

const WORDS: Record<Lang, Words> = {
  en: {
    title: "Statement", vendor: "Vendor", period: "Period", orders: "Orders", summary: "Summary", order: "Order", date: "Date", payment: "Payment",
    adjustments: "Refunds and compensations", kind: "Kind", amount: "Amount", bornBy: "Paid by", owner: "App owner", vendorSide: "Vendor",
    refund: "Refund", compensation: "Compensation", netOwnerOwes: "The app owner owes the vendor", netVendorOwes: "The vendor owes the app owner",
    pay: { cash: "Cash", card: "Card", apple_pay: "Apple Pay", google_pay: "Google Pay", wallet: "Wallet" },
    totals: {
      itemsBefore: "Items before discounts", itemDiscounts: "Item discounts", items: "Items after discounts", couponsByVendor: "Coupons paid by the vendor", couponsByOwner: "Coupons paid by the app owner",
      club: "Club delivery discounts", delivery: "Delivery fees", deliveryDiscounts: "Delivery discounts", tax: "Tax", tips: "Tips", total: "Paid by customers",
      paidOnline: "Paid online or from the wallet", paidCash: "Paid in cash", cashHeldByVendor: "Cash taken by the vendor", commission: "Commission",
      vendorEarns: "The vendor's part", ownerEarns: "The app owner's part", refundsByVendor: "Refunds paid by the vendor", refundsByOwner: "Refunds paid by the app owner", net: "Net",
    },
  },
  ar: {
    title: "كشف حساب", vendor: "المتجر", period: "الفترة", orders: "الطلبات", summary: "الملخص", order: "الطلب", date: "التاريخ", payment: "الدفع",
    adjustments: "المبالغ المستردة والتعويضات", kind: "النوع", amount: "المبلغ", bornBy: "يتحمّله", owner: "صاحب التطبيق", vendorSide: "المتجر",
    refund: "استرداد", compensation: "تعويض", netOwnerOwes: "المستحق للمتجر على صاحب التطبيق", netVendorOwes: "المستحق لصاحب التطبيق على المتجر",
    pay: { cash: "نقدًا", card: "بطاقة", apple_pay: "Apple Pay", google_pay: "Google Pay", wallet: "المحفظة" },
    totals: {
      itemsBefore: "المنتجات قبل الخصومات", itemDiscounts: "خصومات المنتجات", items: "المنتجات بعد الخصومات", couponsByVendor: "قسائم يتحمّلها المتجر", couponsByOwner: "قسائم يتحمّلها صاحب التطبيق",
      club: "خصومات التوصيل للأعضاء", delivery: "رسوم التوصيل", deliveryDiscounts: "خصومات التوصيل", tax: "الضريبة", tips: "الإكراميات", total: "ما دفعه العملاء",
      paidOnline: "مدفوع إلكترونيًا أو من المحفظة", paidCash: "مدفوع نقدًا", cashHeldByVendor: "نقد استلمه المتجر", commission: "العمولة",
      vendorEarns: "نصيب المتجر", ownerEarns: "نصيب صاحب التطبيق", refundsByVendor: "مبالغ مستردة يتحمّلها المتجر", refundsByOwner: "مبالغ مستردة يتحمّلها صاحب التطبيق", net: "الصافي",
    },
  },
  tr: {
    title: "Hesap özeti", vendor: "İşletme", period: "Dönem", orders: "Siparişler", summary: "Özet", order: "Sipariş", date: "Tarih", payment: "Ödeme",
    adjustments: "İadeler ve tazminatlar", kind: "Tür", amount: "Tutar", bornBy: "Karşılayan", owner: "Uygulama sahibi", vendorSide: "İşletme",
    refund: "İade", compensation: "Tazminat", netOwnerOwes: "Uygulama sahibinin işletmeye borcu", netVendorOwes: "İşletmenin uygulama sahibine borcu",
    pay: { cash: "Nakit", card: "Kart", apple_pay: "Apple Pay", google_pay: "Google Pay", wallet: "Cüzdan" },
    totals: {
      itemsBefore: "İndirimlerden önce ürünler", itemDiscounts: "Ürün indirimleri", items: "İndirimlerden sonra ürünler", couponsByVendor: "İşletmenin karşıladığı kuponlar", couponsByOwner: "Uygulama sahibinin karşıladığı kuponlar",
      club: "Kulüp teslimat indirimleri", delivery: "Teslimat ücretleri", deliveryDiscounts: "Teslimat indirimleri", tax: "Vergi", tips: "Bahşişler", total: "Müşterilerin ödediği",
      paidOnline: "Çevrimiçi veya cüzdandan ödenen", paidCash: "Nakit ödenen", cashHeldByVendor: "İşletmenin aldığı nakit", commission: "Komisyon",
      vendorEarns: "İşletmenin payı", ownerEarns: "Uygulama sahibinin payı", refundsByVendor: "İşletmenin karşıladığı iadeler", refundsByOwner: "Uygulama sahibinin karşıladığı iadeler", net: "Net",
    },
  },
};

export function statementWords(lang: Lang): Words {
  return WORDS[lang];
}

function day(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** The summary's rows: [label, amount]. The net says which way it goes. */
export function summaryRows(statement: Statement, lang: Lang): [string, string][] {
  const w = WORDS[lang];
  const decimals = currencyDecimals(statement.currency);
  const rows: [string, string][] = [[w.orders, String(statement.totals.orders)]];
  for (const key of TOTALS_ORDER) {
    const value = statement.totals[key];
    if (key === "net") rows.push([value >= 0 ? w.netOwnerOwes : w.netVendorOwes, fromMinor(Math.abs(value), decimals)]);
    else rows.push([w.totals[key], fromMinor(value, decimals)]);
  }
  return rows;
}

/** One row per order, then one per adjustment. */
export function orderRows(statement: Statement, lang: Lang, timezone: string): Cell[][] {
  const w = WORDS[lang];
  const d = currencyDecimals(statement.currency);
  const n = (minor: number) => Number(fromMinor(minor, d));
  const head: Cell[] = [w.order, w.date, w.payment, w.totals.itemsBefore, w.totals.itemDiscounts, w.totals.couponsByVendor, w.totals.couponsByOwner, w.totals.delivery, w.totals.deliveryDiscounts, w.totals.tax, w.totals.tips, w.totals.total, w.totals.commission, w.totals.vendorEarns, w.totals.ownerEarns, w.totals.net];
  const rows: Cell[][] = [head];
  for (const o of statement.orders) {
    const m = o.money;
    rows.push([
      o.reference, day(o.at, timezone), w.pay[o.payment], n(m.itemsBefore), n(m.itemDiscounts),
      n(m.coupon?.funder === "vendor" ? m.coupon.amount : 0), n(m.coupon?.funder === "owner" ? m.coupon.amount : 0),
      n(m.delivery), n(m.deliveryDiscount), n(m.tax), n(m.tip), n(m.total), n(m.split.commission), n(m.split.vendorEarns), n(m.split.ownerEarns), n(m.split.dueToVendor),
    ]);
  }
  return rows;
}

export function adjustmentRows(statement: Statement, lang: Lang, timezone: string): Cell[][] {
  const w = WORDS[lang];
  const d = currencyDecimals(statement.currency);
  const rows: Cell[][] = [[w.order, w.date, w.kind, w.amount, w.bornBy]];
  for (const a of statement.adjustments) rows.push([a.reference, day(a.at, timezone), a.kind === "refund" ? w.refund : w.compensation, Number(fromMinor(a.amount, d)), a.funder === "vendor" ? w.vendorSide : w.owner]);
  return rows;
}

function csvCell(cell: Cell): string {
  if (cell === null) return "";
  const text = typeof cell === "number" ? String(cell) : cell;
  // A leading =, +, - or @ would be read as a formula by spreadsheet programs.
  const safe = typeof cell === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The orders as CSV (UTF-8 with its mark, so Excel reads Arabic right). */
export function statementCsv(statement: Statement, lang: Lang, timezone: string): string {
  const lines = [...orderRows(statement, lang, timezone), [], ...adjustmentRows(statement, lang, timezone), [], ...summaryRows(statement, lang)];
  return `﻿${lines.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** The statement as an Excel workbook: Summary, Orders, and Refunds and compensations. */
export function statementXlsx(statement: Statement, lang: Lang, timezone: string, vendorName: string): Uint8Array {
  const w = WORDS[lang];
  const rtl = lang === "ar";
  const head: Cell[][] = [[w.title, ""], [w.vendor, vendorName], [w.period, `${day(statement.from, timezone)} – ${day(new Date(statement.to.getTime() - 1), timezone)}`], ["", statement.currency]];
  return writeXlsx([
    { name: w.summary, rows: [...head, ...summaryRows(statement, lang)], rtl },
    { name: w.orders, rows: orderRows(statement, lang, timezone), rtl },
    { name: w.adjustments, rows: adjustmentRows(statement, lang, timezone), rtl },
  ]);
}

/** "EGP 1,250.00" for the PDF. */
export function statementAmount(statement: Statement, minor: number, lang: Lang): string {
  return formatMinor(minor, statement.currency, lang === "ar" ? "ar-EG-u-nu-latn" : lang);
}
