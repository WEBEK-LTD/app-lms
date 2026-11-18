import { ltrSpan } from "../arabic-shape";
import { COMPANY } from "../company";
import type { ContactSetting, DesignerPayout, TemplateDesigner } from "../data/types";
import { yallappSeller } from "../receipts/build";
import type { ReceiptDocument } from "../receipts/pdf";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";

/**
 * 106.11 A payout's receipt, in the designer's language (Arabic as every
 * receipt and email: Modern Standard): what Yallapp sent them, for which
 * month, to which account (masked), the bank's reference and the day. As a
 * PDF (lib/receipts/pdf.ts) from the designer area and with the email.
 */

type Words = {
  title: string;
  number: string;
  date: string;
  sent: string;
  paidTo: string;
  month: string;
  method: string;
  swift: string;
  reference: string;
  account: string;
  item: string;
  quantity: string;
  amount: string;
  earnings: string;
  earningsDetail: string;
  total: string;
  transfer: string;
  share: string;
  arrive: string;
  footer: string;
};

const WORDS: Record<Lang, Words> = {
  en: {
    title: "Payout receipt",
    number: "No.",
    date: "Sent on",
    sent: "Sent",
    paidTo: "Paid to",
    month: "Month",
    method: "SWIFT bank transfer",
    swift: "SWIFT/BIC",
    reference: "Bank reference",
    account: "Account",
    item: "Item",
    quantity: "Qty",
    amount: "Amount",
    earnings: "Studio Market earnings, {month}",
    earningsDetail: "Your 75% of your template sales",
    total: "Paid out",
    transfer: "Transfer",
    share: "Yallapp's 25% of each sale covers taxes, the payment gateway's fees and the banks' fees, the intermediary banks' too: you get exactly 75%.",
    arrive: "A SWIFT transfer can take a few working days to reach the account.",
    footer: "Thank you for designing for Studio Market.",
  },
  ar: {
    title: "إيصال دفعة",
    number: "رقم",
    date: "تاريخ الإرسال",
    sent: "أُرسلت",
    paidTo: "دُفعت إلى",
    month: "الشهر",
    method: "تحويل بنكي SWIFT",
    swift: "SWIFT/BIC",
    reference: "مرجع البنك",
    account: "الحساب",
    item: "البند",
    quantity: "الكمية",
    amount: "المبلغ",
    earnings: "أرباح ماركت Studio، {month}",
    earningsDetail: "حصتك البالغة 75% من مبيعات تمبلتاتك",
    total: "المدفوع",
    transfer: "التحويل",
    share: "تغطي حصة Yallapp البالغة 25% من كل عملية بيع الضرائب ورسوم بوابة الدفع ورسوم البنوك، ومنها البنوك الوسيطة: وتحصل أنت على 75% بالضبط.",
    arrive: "قد يستغرق تحويل SWIFT بضعة أيام عمل حتى يصل إلى الحساب.",
    footer: "شكرًا لتصميمك لماركت Studio.",
  },
  tr: {
    title: "Ödeme makbuzu",
    number: "No.",
    date: "Gönderim tarihi",
    sent: "Gönderildi",
    paidTo: "Alıcı",
    month: "Dönem",
    method: "SWIFT banka havalesi",
    swift: "SWIFT/BIC",
    reference: "Banka referansı",
    account: "Hesap",
    item: "Kalem",
    quantity: "Adet",
    amount: "Tutar",
    earnings: "Studio Market kazançları, {month}",
    earningsDetail: "Şablon satışlarınızın %75’i",
    total: "Ödenen",
    transfer: "Havale",
    share: "Yallapp’in her satıştan aldığı %25; vergileri, ödeme altyapısının ücretlerini ve aracı bankalarınki dahil banka ücretlerini karşılar: siz tam %75 alırsınız.",
    arrive: "Bir SWIFT havalesinin hesaba ulaşması birkaç iş günü sürebilir.",
    footer: "Studio Market için tasarladığınız için teşekkürler.",
  },
};

/** "December 2026" (the payout's month) in the language. */
export function payoutMonth(period: string, lang: Lang): string {
  return formatDate(lang, new Date(`${period}-01T00:00:00.000Z`), { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "3 December 2026": the day the bank sent it. */
export function payoutDay(day: string, lang: Lang): string {
  return formatDate(lang, new Date(`${day}T00:00:00.000Z`), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const thousands = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** "$1,300.00": a payout always with its cents, from whole cents (no floating point). */
export function payoutAmount(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new RangeError("Not a whole, positive number of cents");
  const rest = cents % 100;
  return `$${thousands.format((cents - rest) / 100)}.${String(rest).padStart(2, "0")}`;
}

/** "YP-5B0C6D1E": the receipt's number. */
export function payoutNumber(payout: Pick<DesignerPayout, "id">): string {
  return `YP-${payout.id.slice(0, 8).toUpperCase()}`;
}

export function payoutReceiptFilename(payout: Pick<DesignerPayout, "id">): string {
  return `yallapp-payout-${payoutNumber(payout)}.pdf`;
}

export function payoutReceipt(input: { lang: Lang; payout: DesignerPayout; designer: Pick<TemplateDesigner, "name">; contact: ContactSetting; invoiceLines: string[] }): ReceiptDocument {
  const { lang, payout } = input;
  const w = WORDS[lang] ?? WORDS.en;
  const month = payoutMonth(payout.period, lang);
  const amount = ltrSpan(payoutAmount(payout.amountCents));
  const number = payoutNumber(payout);
  return {
    lang,
    title: w.title,
    numberLine: `${w.number} ${ltrSpan(number)}`,
    headerLines: payout.sentOn ? [`${w.date}: ${payoutDay(payout.sentOn, lang)}`] : [],
    status: { label: w.sent, tone: "paid" },
    seller: yallappSeller(lang, input.contact, input.invoiceLines),
    buyer: { label: w.paidTo, name: payout.payeeName, lines: [input.designer.name, payout.bankName, ltrSpan(payout.accountHint)] },
    facts: [
      [w.month, month],
      [w.reference, ltrSpan(payout.bankReference ?? "")],
    ],
    columns: { item: w.item, quantity: w.quantity, amount: w.amount },
    items: [{ name: w.earnings.replace("{month}", month), detail: w.earningsDetail, quantity: 1, amount }],
    totals: [{ label: w.total, value: amount, strong: true }],
    payment: {
      label: w.transfer,
      rows: [
        [w.transfer, w.method],
        [w.account, `${payout.bankName} · ${ltrSpan(payout.accountHint)}`],
        [w.swift, ltrSpan(payout.swift)],
        [w.reference, ltrSpan(payout.bankReference ?? "")],
      ],
    },
    notes: [w.share, w.arrive],
    footer: w.footer,
    accent: "#FF5A1F",
    meta: { title: `${w.title} ${number}`, author: COMPANY.name },
  };
}
