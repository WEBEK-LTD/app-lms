import type { Lang } from "@/i18n/config";
import { appEmailHtml, cardRow, escapeHtml, heading, hexColour, paragraph, pill, sides, tintColour } from "./app-email-shell";

/**
 * 198 The customer's receipt email after paying a business (an order of
 * products, a restaurant's order, tickets, a course, a membership), as a
 * premium HTML email in the business's own look: its logo (else its name in
 * its colour) at the top, the order as a card with its lines and total, and
 * the receipt as the attached PDF, never a link. In the customer's language
 * (Arabic right to left), by day and by night: the email says it has both
 * looks (`color-scheme`), a mail app in dark mode takes the dark colours
 * (`prefers-color-scheme`, Outlook's `[data-ogsc]`), and the light colours
 * stay readable where a mail app turns them around by itself (Gmail).
 * Tables and inline styles, at most 600 px wide, for every mail app.
 */

export interface OrderReceiptEmailInput {
  lang: Lang;
  /** The business's name (the app's name). */
  shopName: string;
  /** The app's logo, else its icon, as a public address; null for none. */
  logoUrl: string | null;
  /** The app's main colour (#RRGGBB). */
  brand: string;
  customerName: string;
  orderNumber: string;
  /** The day it was paid, in the customer's language. */
  date: string;
  total: string;
  /** The order's lines, one per item, then a coupon, points, shipping or the tax: "Name × 1: ₺10.00". */
  lines: readonly string[];
  /** How a restaurant's order is collected or delivered, when it says. */
  note?: string | null;
}

interface Words {
  subject: (shop: string, order: string) => string;
  preheader: (order: string) => string;
  title: string;
  hello: (name: string) => string;
  intro: (shop: string) => string;
  order: string;
  date: string;
  total: string;
  attached: string;
  keep: (shop: string) => string;
  footer: (shop: string) => string;
}

const WORDS: Record<Lang, Words> = {
  en: {
    subject: (shop, order) => `Your receipt from ${shop} · order ${order}`,
    preheader: (order) => `Payment received for order ${order}. Your receipt is attached.`,
    title: "Thank you for your order",
    hello: (name) => `Dear ${name},`,
    intro: (shop) => `Thank you for your order from ${shop}. We received your payment.`,
    order: "Order",
    date: "Date",
    total: "Total",
    attached: "Your receipt is attached to this email as a PDF.",
    keep: (shop) => `Keep this email for your records. If you have a question about your order, contact ${shop} and give the order number above.`,
    footer: (shop) => `Sent by ${shop}`,
  },
  ar: {
    subject: (shop, order) => `إيصالك من ${shop} · الطلب ${order}`,
    preheader: (order) => `تم استلام الدفع للطلب ${order}. إيصالك مرفق.`,
    title: "شكرًا لطلبك",
    hello: (name) => `عزيزي ${name}،`,
    intro: (shop) => `شكرًا لطلبك من ${shop}. لقد استلمنا دفعتك.`,
    order: "الطلب",
    date: "التاريخ",
    total: "الإجمالي",
    attached: "إيصالك مرفق بهذا البريد كملف PDF.",
    keep: (shop) => `احتفظ بهذا البريد في سجلاتك. إن كان لديك سؤال عن طلبك، فتواصل مع ${shop} واذكر رقم الطلب أعلاه.`,
    footer: (shop) => `أُرسل من ${shop}`,
  },
  tr: {
    subject: (shop, order) => `${shop} makbuzunuz · sipariş ${order}`,
    preheader: (order) => `${order} numaralı siparişin ödemesi alındı. Makbuzunuz ektedir.`,
    title: "Siparişiniz için teşekkürler",
    hello: (name) => `Sayın ${name},`,
    intro: (shop) => `${shop} siparişiniz için teşekkür ederiz. Ödemenizi aldık.`,
    order: "Sipariş",
    date: "Tarih",
    total: "Toplam",
    attached: "Makbuzunuz bu e-postaya PDF olarak eklenmiştir.",
    keep: (shop) => `Bu e-postayı kayıtlarınız için saklayın. Siparişinizle ilgili bir sorunuz olursa ${shop} ile iletişime geçin ve yukarıdaki sipariş numarasını belirtin.`,
    footer: (shop) => `${shop} tarafından gönderildi`,
  },
};

/** A line "Name × 1: ₺10.00" as its words and its amount (the last ": " splits them). */
function splitLine(line: string): { label: string; amount: string } {
  const at = line.lastIndexOf(": ");
  return at > 0 ? { label: line.slice(0, at), amount: line.slice(at + 2) } : { label: line, amount: "" };
}

/** The receipt email's subject in the customer's language. */
export function orderReceiptSubject(lang: Lang, shopName: string, orderNumber: string): string {
  return WORDS[lang].subject(shopName, orderNumber);
}

/** The text part, for mail apps without HTML: the same words, and no link. */
export function orderReceiptText(input: OrderReceiptEmailInput): string {
  const w = WORDS[input.lang];
  return [
    w.hello(input.customerName),
    "",
    w.intro(input.shopName),
    "",
    ...input.lines,
    `${w.total}: ${input.total}`,
    `${w.date}: ${input.date}`,
    `${w.order}: ${input.orderNumber}`,
    ...(input.note ? ["", input.note] : []),
    "",
    w.attached,
    w.keep(input.shopName),
  ].join("\n");
}

/** 200 The order's lines as a table: the words at the start, the amount at the end. */
export function orderLinesTable(lang: Lang, lines: readonly string[]): string {
  const { dir, start, end } = sides(lang);
  const rows = lines
    .map(splitLine)
    .map(
      ({ label, amount }) =>
        `<tr><td class="ylp-line" style="padding:10px 0;border-bottom:1px solid #ECEAF2;font-size:15px;line-height:1.45;color:#24223A;text-align:${start}">${escapeHtml(label)}</td>` +
        `<td class="ylp-line ylp-amount" style="padding:10px 0;border-bottom:1px solid #ECEAF2;font-size:15px;line-height:1.45;color:#24223A;text-align:${end};white-space:nowrap;font-weight:600">${escapeHtml(amount)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">${rows}</table>`;
}

/** 200 The total in the app's soft colour. */
export function totalBox(lang: Lang, brand: string, label: string, total: string): string {
  const { dir, start, end } = sides(lang);
  return (
    `<table role="presentation" class="ylp-sum" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${tintColour(brand, 0.9)};border-radius:14px" dir="${dir}"><tr>` +
    `<td class="ylp-text" style="padding:16px 18px;font-size:15px;font-weight:700;color:#24223A;text-align:${start}">${escapeHtml(label)}</td>` +
    `<td class="ylp-total" style="padding:16px 18px;font-size:20px;font-weight:800;color:#24223A;text-align:${end};white-space:nowrap">${escapeHtml(total)}</td></tr></table>`
  );
}

/** 200 Two labelled values side by side (Order, Date). */
export function metaRow(lang: Lang, pairs: ReadonlyArray<readonly [string, string]>): string {
  const { dir, start } = sides(lang);
  const cell = ([label, value]: readonly [string, string]) =>
    `<td class="ylp-meta" style="vertical-align:top;text-align:${start}"><div class="ylp-muted" style="font-size:12px;letter-spacing:0.4px;text-transform:uppercase;color:#6E6A85">${escapeHtml(label)}</div>` +
    `<div class="ylp-text" style="font-size:15px;font-weight:700;color:#24223A;margin-top:2px">${escapeHtml(value)}</div></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}"><tr>${pairs.map(cell).join("")}</tr></table>`;
}

/** The HTML part, in the shared look of the app's emails (app-email-shell.ts). */
export function orderReceiptHtml(input: OrderReceiptEmailInput): string {
  const w = WORDS[input.lang];
  const brand = hexColour(input.brand);

  const rows = [
    cardRow(input.lang, pill(brand, `✓ ${w.order} #${input.orderNumber}`) + heading(w.title) + paragraph(w.hello(input.customerName), { margin: "0 0 6px 0" }) + paragraph(w.intro(input.shopName), { muted: true, margin: "0" }), "30px 32px 8px 32px"),
    cardRow(input.lang, metaRow(input.lang, [[w.order, `#${input.orderNumber}`], [w.date, input.date]]), "20px 32px 0 32px"),
    cardRow(input.lang, orderLinesTable(input.lang, input.lines), "18px 32px 0 32px"),
    cardRow(input.lang, totalBox(input.lang, brand, w.total, input.total), "16px 32px 0 32px"),
    ...(input.note ? [cardRow(input.lang, paragraph(input.note, { size: 14, margin: "0" }), "16px 32px 0 32px")] : []),
    cardRow(input.lang, paragraph(`📎 ${w.attached}`, { size: 14, strong: true }) + paragraph(w.keep(input.shopName), { muted: true, size: 13, margin: "0" }), "22px 32px 30px 32px"),
  ].join("\n");

  return appEmailHtml({
    lang: input.lang,
    appName: input.shopName,
    logoUrl: input.logoUrl,
    brand,
    title: w.subject(input.shopName, input.orderNumber),
    preheader: w.preheader(input.orderNumber),
    rows,
    footer: w.footer(input.shopName),
  });
}
