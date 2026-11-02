import { ltrSpan } from "../arabic-shape";
import { formatCents } from "../catalog/money";
import type { App, SchoolPayslip, SchoolPayslipLine } from "../data/types";
import { businessSeller } from "../receipts/build";
import { renderReceiptPdf, type ReceiptDocument, type ReceiptItem, type ReceiptTotal } from "../receipts/pdf";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import { leftToPay, paidState, payslipNumber, payslipTotals } from "./salaries";

/**
 * 113.12 A payslip as a PDF, laid out by the receipts' PDF (lib/receipts/pdf.ts:
 * Arabic joined and right to left): the school, the person, the month, the
 * base and allowances, bonuses, deductions and advances taken back, the net,
 * and the payments as the school wrote them down. A record only: it says the
 * school paid by hand, never that money moved through Yallapp.
 */

const WORDS = {
  en: {
    title: "Payslip",
    number: "No.",
    month: "Month",
    issued: "Issued",
    employee: "Employee",
    job: "Job",
    department: "Department",
    teacher: "Teacher",
    staff: "Staff",
    item: "Item",
    amount: "Amount",
    base: "Base salary",
    bonus: "Bonus",
    deduction: "Deduction",
    absences: "Absences ({count})",
    lateness: "Late arrivals ({count})",
    advance: "Advance taken back",
    gross: "Gross",
    deductions: "Deductions",
    net: "Net pay",
    paidSoFar: "Paid",
    left: "Left to pay",
    payment: "Payments",
    noPayment: "Not paid yet",
    cash: "Cash",
    bank: "Bank transfer",
    paidOn: "{method}, {date}",
    days: "Days",
    daysLine: "{working} working days · {present} present · {absent} absent · {late} late · {leave} on leave",
    paid: "Paid",
    partPaid: "Partly paid",
    unpaid: "Not paid yet",
    record: "The school records its salaries by hand: this payslip is its record of what it pays.",
    footer: "Issued by {school}.",
  },
  ar: {
    title: "قسيمة راتب",
    number: "رقم",
    month: "الشهر",
    issued: "تاريخ الإصدار",
    employee: "الموظف",
    job: "الوظيفة",
    department: "القسم",
    teacher: "معلم",
    staff: "موظف",
    item: "البند",
    amount: "المبلغ",
    base: "الراتب الأساسي",
    bonus: "مكافأة",
    deduction: "خصم",
    absences: "الغياب ({count})",
    lateness: "التأخير ({count})",
    advance: "قسط سلفة",
    gross: "الإجمالي",
    deductions: "الخصومات",
    net: "صافي الراتب",
    paidSoFar: "المدفوع",
    left: "المتبقي",
    payment: "الدفعات",
    noPayment: "لم يُدفع بعد",
    cash: "نقدًا",
    bank: "تحويل بنكي",
    paidOn: "{method}، {date}",
    days: "الأيام",
    daysLine: "{working} يوم عمل · {present} حضور · {absent} غياب · {late} تأخير · {leave} إجازة",
    paid: "مدفوع",
    partPaid: "مدفوع جزئيًا",
    unpaid: "لم يُدفع بعد",
    record: "تسجّل المدرسة الرواتب يدويًا: هذه القسيمة سجلّها لما تدفعه.",
    footer: "صادرة عن {school}.",
  },
  tr: {
    title: "Maaş bordrosu",
    number: "No.",
    month: "Ay",
    issued: "Düzenlenme",
    employee: "Çalışan",
    job: "Görev",
    department: "Bölüm",
    teacher: "Öğretmen",
    staff: "Personel",
    item: "Kalem",
    amount: "Tutar",
    base: "Temel maaş",
    bonus: "Prim",
    deduction: "Kesinti",
    absences: "Devamsızlık ({count})",
    lateness: "Geç kalma ({count})",
    advance: "Avans kesintisi",
    gross: "Brüt",
    deductions: "Kesintiler",
    net: "Net ödeme",
    paidSoFar: "Ödenen",
    left: "Kalan",
    payment: "Ödemeler",
    noPayment: "Henüz ödenmedi",
    cash: "Nakit",
    bank: "Banka havalesi",
    paidOn: "{method}, {date}",
    days: "Günler",
    daysLine: "{working} iş günü · {present} geldi · {absent} gelmedi · {late} geç · {leave} izinli",
    paid: "Ödendi",
    partPaid: "Kısmen ödendi",
    unpaid: "Henüz ödenmedi",
    record: "Okul maaşları elle kaydeder: bu bordro, okulun ödediklerinin kaydıdır.",
    footer: "{school} tarafından düzenlendi.",
  },
} as const satisfies Record<Lang, Record<string, string>>;

type Key = keyof (typeof WORDS)["en"];

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** "November 2026" in the language. */
export function monthTitle(lang: Lang, month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return formatDate(lang, new Date(Date.UTC(y, m - 1, 1)), { month: "long", year: "numeric", timeZone: "UTC" });
}

/** A line's name: the office's words, else what it was suggested from. */
export function lineName(lang: Lang, line: Pick<SchoolPayslipLine, "source" | "label" | "count" | "kind">): string {
  const w = WORDS[lang];
  if (line.source === "absence") return fill(w.absences, { count: line.count ?? 0 });
  if (line.source === "lateness") return fill(w.lateness, { count: line.count ?? 0 });
  if (line.source === "advance") return w.advance;
  return line.label || w[line.kind === "bonus" ? "bonus" : "deduction"];
}

export function payslipDocument(input: { lang: Lang; app: Pick<App, "appName" | "supportEmail" | "hostedSettings" | "primaryColor" | "demo">; payslip: SchoolPayslip }): ReceiptDocument {
  const { lang, payslip: p, app } = input;
  const w = (key: Key, values: Record<string, string | number> = {}) => fill(WORDS[lang][key], values);
  const fmt = (cents: number) => ltrSpan(formatCents(cents, p.currency));
  const minus = (cents: number) => ltrSpan(`−${formatCents(cents, p.currency)}`);
  const t = payslipTotals(p);
  const accepted = p.lines.filter((l) => l.status === "accepted" && l.cents > 0);
  const items: ReceiptItem[] = [
    { name: w("base"), amount: fmt(p.baseCents) },
    ...p.allowances.map((a) => ({ name: a.name, amount: fmt(a.cents) })),
    ...accepted.filter((l) => l.kind === "bonus").map((l) => ({ name: lineName(lang, l), detail: w("bonus"), amount: fmt(l.cents) })),
    ...accepted.filter((l) => l.kind !== "bonus").map((l) => ({ name: lineName(lang, l), detail: l.kind === "advance" ? null : w("deduction"), amount: minus(l.cents) })),
  ];
  const totals: ReceiptTotal[] = [
    { label: w("gross"), value: fmt(t.gross) },
    ...(t.deductions + t.advances > 0 ? [{ label: w("deductions"), value: minus(t.deductions + t.advances), danger: true }] : []),
    { label: w("net"), value: fmt(p.netCents), strong: true },
  ];
  if (p.paidCents > 0 && leftToPay(p) > 0) totals.push({ label: w("paidSoFar"), value: fmt(p.paidCents) }, { label: w("left"), value: fmt(leftToPay(p)), danger: true });
  const state = paidState(p);
  const number = payslipNumber(p);
  const school = app.appName?.trim() || "—";
  const facts: [string, string][] = [[w("month"), monthTitle(lang, p.month)]];
  if (p.attendance) {
    const a = p.attendance;
    facts.push([w("days"), w("daysLine", { working: a.workingDays, present: a.present, absent: a.absent, late: a.late, leave: a.leave })]);
  }
  return {
    lang,
    title: w("title"),
    numberLine: `${w("number")} ${ltrSpan(number)}`,
    headerLines: [`${w("month")}: ${monthTitle(lang, p.month)}`, `${w("issued")}: ${formatDate(lang, p.finalAt ?? p.updatedAt)}`],
    status: { label: w(state === "paid" ? "paid" : state === "part_paid" ? "partPaid" : "unpaid"), tone: state === "paid" ? "paid" : "partly" },
    seller: businessSeller(lang, app),
    buyer: { label: w("employee"), name: p.personName, lines: [w(p.role === "teacher" ? "teacher" : "staff"), p.jobTitle ? `${w("job")}: ${p.jobTitle}` : "", p.department ? `${w("department")}: ${p.department}` : ""].filter(Boolean) },
    facts,
    columns: { item: w("item"), quantity: "", amount: w("amount") },
    items,
    totals,
    payment: {
      label: w("payment"),
      rows: p.payments.length ? p.payments.map((x) => [w("paidOn", { method: w(x.method), date: ltrSpan(x.paidOn) }), fmt(x.cents)] as [string, string]) : [[w("payment"), w("noPayment")]],
    },
    notes: [...(p.note ? [p.note] : []), w("record")],
    footer: w("footer", { school }),
    accent: app.primaryColor,
    meta: { title: `${w("title")} ${number}`, author: school },
  };
}

/** "payslip-PS-2026-11-42.pdf". */
export const payslipFilename = (p: Pick<SchoolPayslip, "id" | "month">) => `payslip-${payslipNumber(p)}.pdf`;

/** The payslip's PDF file as a response: shown in the browser or the app's viewer, never cached. */
export async function payslipPdfResponse(input: { lang: Lang; app: Pick<App, "appName" | "supportEmail" | "hostedSettings" | "primaryColor" | "demo">; payslip: SchoolPayslip }, disposition: "inline" | "attachment" = "inline"): Promise<Response> {
  const pdf = await renderReceiptPdf(payslipDocument(input));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${disposition}; filename="${payslipFilename(input.payslip)}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
