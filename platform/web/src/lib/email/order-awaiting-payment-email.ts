import type { Lang } from "@/i18n/config";
import { appEmailHtml, cardRow, escapeHtml, heading, hexColour, paragraph, pill, sides, tintColour } from "./app-email-shell";
import { metaRow, orderLinesTable, totalBox } from "./order-receipt-email";

/**
 * 200 The "how to pay" email to a customer who chose a bank transfer or the
 * business's own method (cash on delivery, a wallet), in the receipt's look
 * (198): the business's logo, the order as a card with its lines and total,
 * then the amount to pay by its day and the business's details for it in a
 * box of their own. In the customer's language (Arabic right to left), by
 * day and by night.
 */

export interface AwaitingPaymentEmailInput {
  lang: Lang;
  /** The business's name (the app's name). */
  shopName: string;
  /** The app's logo, else its icon, as a public address; null for none. */
  logoUrl: string | null;
  /** The app's main colour (#RRGGBB). */
  brand: string;
  customerName: string;
  orderNumber: string;
  /** The method's name as the business wrote it ("Cash on delivery"), or "Bank transfer". */
  method: string;
  /** The business's details for it, in its own words. */
  instructions: string;
  /** The day to pay by, in the customer's language. */
  dueDate: string;
  total: string;
  /** The order's lines, one per item, then a coupon, points or shipping: "Name × 1: ₺10.00". */
  lines: readonly string[];
}

interface Words {
  subject: (shop: string, order: string) => string;
  preheader: (total: string, due: string) => string;
  badge: string;
  title: string;
  hello: (name: string) => string;
  intro: (shop: string, method: string) => string;
  order: string;
  method: string;
  total: string;
  payBy: (total: string, due: string) => string;
  reference: (order: string) => string;
  then: (shop: string) => string;
  footer: (shop: string) => string;
  bankTransfer: string;
}

const WORDS: Record<Lang, Words> = {
  en: {
    subject: (shop, order) => `Your order ${order} from ${shop}: how to pay`,
    preheader: (total, due) => `Please pay ${total} by ${due}.`,
    badge: "Waiting for payment",
    title: "Thank you for your order",
    hello: (name) => `Dear ${name},`,
    intro: (shop, method) => `Thank you for your order from ${shop}. You chose to pay by ${method}.`,
    order: "Order",
    method: "Payment",
    total: "Total",
    payBy: (total, due) => `Please pay ${total} by ${due}:`,
    reference: (order) => `Give the order number ${order} with your payment.`,
    then: (shop) => `${shop} confirms your order once the payment arrives, and you get your receipt then.`,
    footer: (shop) => `Sent by ${shop}`,
    bankTransfer: "Bank transfer",
  },
  ar: {
    subject: (shop, order) => `طلبك ${order} من ${shop}: طريقة الدفع`,
    preheader: (total, due) => `يُرجى دفع ${total} قبل ${due}.`,
    badge: "بانتظار الدفع",
    title: "شكرًا لطلبك",
    hello: (name) => `عزيزي ${name}،`,
    intro: (shop, method) => `شكرًا لطلبك من ${shop}. اخترت الدفع عبر ${method}.`,
    order: "الطلب",
    method: "الدفع",
    total: "الإجمالي",
    payBy: (total, due) => `يُرجى دفع ${total} قبل ${due}:`,
    reference: (order) => `اذكر رقم الطلب ${order} مع دفعتك.`,
    then: (shop) => `سيؤكد ${shop} طلبك فور وصول الدفعة، وستصلك الفاتورة حينها.`,
    footer: (shop) => `أُرسل من ${shop}`,
    bankTransfer: "التحويل البنكي",
  },
  tr: {
    subject: (shop, order) => `${shop} siparişiniz ${order}: nasıl ödenir`,
    preheader: (total, due) => `Lütfen ${total} tutarını ${due} tarihine kadar ödeyin.`,
    badge: "Ödeme bekleniyor",
    title: "Siparişiniz için teşekkürler",
    hello: (name) => `Sayın ${name},`,
    intro: (shop, method) => `${shop} siparişiniz için teşekkür ederiz. Ödeme yöntemi olarak ${method} seçtiniz.`,
    order: "Sipariş",
    method: "Ödeme",
    total: "Toplam",
    payBy: (total, due) => `Lütfen ${total} tutarını ${due} tarihine kadar ödeyin:`,
    reference: (order) => `Ödemenizle birlikte ${order} sipariş numarasını belirtin.`,
    then: (shop) => `Ödeme ulaştığında ${shop} siparişinizi onaylar ve makbuzunuzu o zaman alırsınız.`,
    footer: (shop) => `${shop} tarafından gönderildi`,
    bankTransfer: "Banka havalesi",
  },
};

/** "Bank transfer" in the customer's language (the business names its own method itself). */
export function bankTransferName(lang: Lang): string {
  return WORDS[lang].bankTransfer;
}

/** The subject in the customer's language. */
export function awaitingPaymentSubject(lang: Lang, shopName: string, orderNumber: string): string {
  return WORDS[lang].subject(shopName, orderNumber);
}

/** The text part, for mail apps without HTML: the same words. */
export function awaitingPaymentText(input: AwaitingPaymentEmailInput): string {
  const w = WORDS[input.lang];
  return [
    w.hello(input.customerName),
    "",
    w.intro(input.shopName, input.method),
    "",
    ...input.lines,
    `${w.total}: ${input.total}`,
    `${w.order}: ${input.orderNumber}`,
    "",
    w.payBy(input.total, input.dueDate),
    "",
    input.instructions,
    "",
    `${w.reference(input.orderNumber)} ${w.then(input.shopName)}`,
  ].join("\n");
}

/** The HTML part, in the shared look of the app's emails (app-email-shell.ts). */
export function awaitingPaymentHtml(input: AwaitingPaymentEmailInput): string {
  const w = WORDS[input.lang];
  const { dir, start } = sides(input.lang);
  const brand = hexColour(input.brand);
  // The business's details, in its own words, in a box drawn with the app's colour.
  const details =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="border:1px solid ${tintColour(brand, 0.7)};border-radius:14px"><tr>` +
    `<td style="padding:16px 18px;text-align:${start}">` +
    paragraph(w.payBy(input.total, input.dueDate), { strong: true, size: 14, margin: "0 0 10px 0" }) +
    `<div class="ylp-text" style="font-size:15px;line-height:1.6;color:#24223A;white-space:pre-wrap;word-break:break-word">${escapeHtml(input.instructions).replace(/\n/g, "<br>")}</div>` +
    `</td></tr></table>`;

  const rows = [
    cardRow(input.lang, pill(brand, `⏳ ${w.badge}`) + heading(w.title) + paragraph(w.hello(input.customerName), { margin: "0 0 6px 0" }) + paragraph(w.intro(input.shopName, input.method), { muted: true, margin: "0" }), "30px 32px 8px 32px"),
    cardRow(input.lang, metaRow(input.lang, [[w.order, `#${input.orderNumber}`], [w.method, input.method]]), "20px 32px 0 32px"),
    cardRow(input.lang, orderLinesTable(input.lang, input.lines), "18px 32px 0 32px"),
    cardRow(input.lang, totalBox(input.lang, brand, w.total, input.total), "16px 32px 0 32px"),
    cardRow(input.lang, details, "18px 32px 0 32px"),
    cardRow(input.lang, paragraph(w.reference(input.orderNumber), { size: 14, strong: true }) + paragraph(w.then(input.shopName), { muted: true, size: 13, margin: "0" }), "22px 32px 30px 32px"),
  ].join("\n");

  return appEmailHtml({
    lang: input.lang,
    appName: input.shopName,
    logoUrl: input.logoUrl,
    brand,
    title: w.subject(input.shopName, input.orderNumber),
    preheader: w.preheader(input.total, input.dueDate),
    rows,
    footer: w.footer(input.shopName),
  });
}
