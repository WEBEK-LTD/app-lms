import type { Lang } from "@/i18n/config";

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

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** A colour as #RRGGBB, else the platform's own. */
function hex(colour: string): string {
  return /^#[0-9a-f]{6}$/i.test(colour.trim()) ? colour.trim().toUpperCase() : "#5B3FD6";
}

/** The brand colour mixed toward white (t 0..1), for its soft tints. */
function tint(colour: string, t: number): string {
  const c = hex(colour);
  const ch = (i: number) => Math.round(parseInt(c.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + 255 * t);
  return `#${[0, 1, 2].map((i) => ch(i).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

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

/** The HTML part. */
export function orderReceiptHtml(input: OrderReceiptEmailInput): string {
  const w = WORDS[input.lang];
  const rtl = input.lang === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const start = rtl ? "right" : "left";
  const end = rtl ? "left" : "right";
  const brand = hex(input.brand);
  const soft = tint(brand, 0.9);
  const shop = escape(input.shopName);
  const font = rtl ? "Tahoma,'Segoe UI',Arial,sans-serif" : "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const head = input.logoUrl
    ? `<img src="${escape(input.logoUrl)}" width="64" height="64" alt="${shop}" style="display:block;width:64px;height:64px;border-radius:16px;border:0;outline:none;text-decoration:none;margin:0 auto;object-fit:cover" />`
    : `<div class="ylp-brand" style="font-size:24px;font-weight:800;letter-spacing:-0.2px;color:${brand}">${shop}</div>`;

  const rows = input.lines
    .map(splitLine)
    .map(
      ({ label, amount }) =>
        `<tr><td class="ylp-line" style="padding:10px 0;border-bottom:1px solid #ECEAF2;font-size:15px;line-height:1.45;color:#24223A;text-align:${start}">${escape(label)}</td>` +
        `<td class="ylp-line ylp-amount" style="padding:10px 0;border-bottom:1px solid #ECEAF2;font-size:15px;line-height:1.45;color:#24223A;text-align:${end};white-space:nowrap;font-weight:600">${escape(amount)}</td></tr>`,
    )
    .join("");

  const meta = (label: string, value: string) =>
    `<td class="ylp-meta" style="padding:0 0 0 0;vertical-align:top;text-align:${start}"><div class="ylp-muted" style="font-size:12px;letter-spacing:0.4px;text-transform:uppercase;color:#6E6A85">${escape(label)}</div>` +
    `<div class="ylp-text" style="font-size:15px;font-weight:700;color:#24223A;margin-top:2px">${escape(value)}</div></td>`;

  const note = input.note
    ? `<tr><td class="ylp-text" style="padding:16px 0 0 0;font-size:14px;line-height:1.55;color:#24223A;text-align:${start}">${escape(input.note).replace(/\n/g, "<br>")}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="${input.lang}" dir="${dir}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escape(w.subject(input.shopName, input.orderNumber))}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  @media (max-width: 620px) { .ylp-card { border-radius:0 !important; } .ylp-pad { padding-left:20px !important; padding-right:20px !important; } }
  @media (prefers-color-scheme: dark) {
    .ylp-page { background:#121019 !important; }
    .ylp-card { background:#1D1A28 !important; border-color:#2E2A3D !important; }
    .ylp-text, .ylp-line { color:#EDE9F6 !important; }
    .ylp-muted { color:#A9A3BF !important; }
    .ylp-line { border-color:#2E2A3D !important; }
    .ylp-sum { background:#262235 !important; }
    .ylp-total { color:#FFFFFF !important; }
    .ylp-brand { color:${tint(brand, 0.35)} !important; }
    .ylp-pill { background:#262235 !important; color:#EDE9F6 !important; }
  }
  [data-ogsc] .ylp-page { background:#121019 !important; }
  [data-ogsc] .ylp-card { background:#1D1A28 !important; }
  [data-ogsc] .ylp-text, [data-ogsc] .ylp-line { color:#EDE9F6 !important; }
  [data-ogsc] .ylp-muted { color:#A9A3BF !important; }
  [data-ogsc] .ylp-sum { background:#262235 !important; }
  [data-ogsc] .ylp-total { color:#FFFFFF !important; }
</style>
</head>
<body class="ylp-page" style="margin:0;padding:0;background:#F4F2F8;font-family:${font}" dir="${dir}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(w.preheader(input.orderNumber))}</div>
<table role="presentation" class="ylp-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F2F8">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td align="center" style="padding:4px 0 20px 0">${head}</td></tr>
<tr><td>
<table role="presentation" class="ylp-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E7E4EF;border-radius:20px;overflow:hidden">
<tr><td style="height:6px;line-height:6px;font-size:0;background:${brand}">&nbsp;</td></tr>
<tr><td class="ylp-pad" style="padding:30px 32px 8px 32px;text-align:${start}" dir="${dir}">
<div class="ylp-pill" style="display:inline-block;padding:6px 12px;border-radius:999px;background:${soft};color:${brand};font-size:13px;font-weight:700">✓ ${escape(w.order)} #${escape(input.orderNumber)}</div>
<h1 class="ylp-text" style="margin:16px 0 8px 0;font-size:24px;line-height:1.3;font-weight:800;color:#24223A">${escape(w.title)}</h1>
<p class="ylp-text" style="margin:0 0 6px 0;font-size:15px;line-height:1.6;color:#24223A">${escape(w.hello(input.customerName))}</p>
<p class="ylp-muted" style="margin:0;font-size:15px;line-height:1.6;color:#5C5874">${escape(w.intro(input.shopName))}</p>
</td></tr>
<tr><td class="ylp-pad" style="padding:20px 32px 0 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}"><tr>${meta(w.order, `#${input.orderNumber}`)}${meta(w.date, input.date)}</tr></table>
</td></tr>
<tr><td class="ylp-pad" style="padding:18px 32px 0 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="${dir}">${rows}</table>
</td></tr>
<tr><td class="ylp-pad" style="padding:16px 32px 0 32px">
<table role="presentation" class="ylp-sum" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${soft};border-radius:14px" dir="${dir}"><tr>
<td class="ylp-text" style="padding:16px 18px;font-size:15px;font-weight:700;color:#24223A;text-align:${start}">${escape(w.total)}</td>
<td class="ylp-total" style="padding:16px 18px;font-size:20px;font-weight:800;color:#24223A;text-align:${end};white-space:nowrap">${escape(input.total)}</td>
</tr></table>
</td></tr>
${note ? `<tr><td class="ylp-pad" style="padding:0 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${note}</table></td></tr>` : ""}
<tr><td class="ylp-pad" style="padding:22px 32px 30px 32px;text-align:${start}" dir="${dir}">
<p class="ylp-text" style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#24223A;font-weight:600">📎 ${escape(w.attached)}</p>
<p class="ylp-muted" style="margin:0;font-size:13px;line-height:1.6;color:#6E6A85">${escape(w.keep(input.shopName))}</p>
</td></tr>
</table>
</td></tr>
<tr><td align="center" class="ylp-muted" style="padding:18px 8px 0 8px;font-size:12px;line-height:1.6;color:#8A86A0">${escape(w.footer(input.shopName))}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
