import { formatAmount } from "../../billing/prices";
import { appEmailHtml, cardRow, escapeHtml, heading, paragraph, pill } from "../../email/app-email-shell";
import { COMMUNITY_BRAND, type CommunityLang } from "../trust/notifications";

/** 233 A course's receipt, by email, in the buyer's language: what was bought, what was paid, when, and the order's number. */

const WORDS: Record<CommunityLang, { subject: (t: string) => string; thanks: string; course: string; paid: string; date: string; order: string; open: string; footer: string; locale: string }> = {
  en: { subject: (t) => `Your receipt: ${t}`, thanks: "Thank you. Your course is unlocked on the website and in the app.", course: "Course", paid: "Paid", date: "Date", order: "Order", open: "Start learning", footer: "Yallapp Community", locale: "en-GB" },
  ar: { subject: (t) => `إيصالك: ${t}`, thanks: "شكرًا لك. فُتحت الدورة على الموقع وفي التطبيق.", course: "الدورة", paid: "المبلغ المدفوع", date: "التاريخ", order: "رقم الطلب", open: "ابدأ التعلّم", footer: "مجتمع Yallapp", locale: "ar" },
  tr: { subject: (t) => `Makbuzunuz: ${t}`, thanks: "Teşekkürler. Kursunuz web sitesinde ve uygulamada açıldı.", course: "Kurs", paid: "Ödenen", date: "Tarih", order: "Sipariş", open: "Öğrenmeye başla", footer: "Yallapp Community", locale: "tr-TR" },
};

export function courseReceiptEmail(input: { lang: CommunityLang; title: string; amountCents: number; currency: string; paidAt: Date; orderId: string; link: string }): { subject: string; text: string; html: string } {
  const w = WORDS[input.lang];
  const amount = formatAmount(input.amountCents, input.currency, { exact: true });
  const date = new Intl.DateTimeFormat(w.locale, { dateStyle: "long", timeZone: "UTC" }).format(input.paidAt);
  const order = input.orderId.slice(0, 8).toUpperCase();
  const lines: [string, string][] = [
    [w.course, input.title],
    [w.paid, amount],
    [w.date, date],
    [w.order, order],
  ];
  const subject = w.subject(input.title).slice(0, 120);
  const text = [w.thanks, "", ...lines.map(([k, v]) => `${k}: ${v}`), "", `${w.open}: ${input.link}`].join("\n");
  const rows = [
    cardRow(input.lang, heading(escapeHtml(w.thanks)), "32px 32px 8px"),
    cardRow(input.lang, lines.map(([k, v]) => paragraph(`${escapeHtml(k)}: <strong>${escapeHtml(v)}</strong>`)).join(""), "8px 32px 8px"),
    cardRow(input.lang, `<a href="${escapeHtml(input.link)}" style="text-decoration:none">${pill(COMMUNITY_BRAND, escapeHtml(w.open))}</a>`, "8px 32px 28px"),
  ].join("");
  const html = appEmailHtml({ lang: input.lang, appName: w.footer, logoUrl: null, brand: COMMUNITY_BRAND, title: subject, preheader: w.thanks, rows, footer: w.footer });
  return { subject, text, html };
}
