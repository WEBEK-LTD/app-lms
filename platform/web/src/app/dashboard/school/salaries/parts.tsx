import { Field } from "@/components/form";
import { Badge } from "@/components/ui";
import type { DashT } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import type { SchoolPayslip, SchoolPayslipLine } from "@/lib/data/types";
import { paidState, SALARY_LIMITS } from "@/lib/school/salaries";

/** 113.12 What the salary pages share: a month's name, a sheet's state, a line's name and the fields of money handed over. */

/** "November 2026" in the dashboard's language. */
export function monthLabel(lang: Lang, month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return formatDate(lang, new Date(Date.UTC(y, m - 1, 1)), { month: "long", year: "numeric", timeZone: "UTC" });
}

export function SheetBadge({ payslip, t }: { payslip: Pick<SchoolPayslip, "status" | "netCents" | "paidCents">; t: DashT }) {
  if (payslip.status === "draft") return <Badge tone="neutral">{t("salaries.draft")}</Badge>;
  const state = paidState(payslip);
  if (state === "paid") return <Badge tone="success">{t("salaries.paid")}</Badge>;
  if (state === "part_paid") return <Badge tone="info">{t("salaries.partPaid")}</Badge>;
  return <Badge tone="warn">{t("salaries.finalUnpaid")}</Badge>;
}

/** A line's name: the office's words, else what it was suggested from. */
export function lineLabel(line: Pick<SchoolPayslipLine, "source" | "label" | "count">, t: DashT): string {
  if (line.source === "absence") return t("salaries.lineAbsence", { count: line.count ?? 0 });
  if (line.source === "lateness") return t("salaries.lineLateness", { count: line.count ?? 0 });
  if (line.source === "advance") return t("salaries.lineAdvance");
  return line.label;
}

/** The amount, cash or a bank transfer, the day, a note and a photo of the receipt: money handed over or paid back. */
export function PayFields({ suffix, amount, today, t }: { suffix: string; amount: string; today: string; t: DashT }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`f-pay-amount${suffix}`} label={t("salaries.amount")} name="amount" defaultValue={amount} inputMode="decimal" dir="ltr" required />
      <Field id={`f-pay-on${suffix}`} label={t("salaries.paidOn")} name="paidOn" type="date" defaultValue={today} max={today} dir="ltr" required />
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0 sm:col-span-2">
        <legend className="mb-1.5 text-sm font-semibold">{t("salaries.method")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {(["cash", "bank"] as const).map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand has-[:checked]:font-bold">
              <input type="radio" name="method" value={m} defaultChecked={m === "cash"} className="h-4 w-4 accent-midnight" />
              {t(m === "cash" ? "salaries.cash" : "salaries.bank")}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id={`f-pay-note${suffix}`} label={t("salaries.noteOptional")} name="note" maxLength={SALARY_LIMITS.note} className="sm:col-span-2" />
      <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
        <label htmlFor={`f-pay-receipt${suffix}`} className="text-sm font-semibold">
          {t("salaries.receipt")}
        </label>
        <input id={`f-pay-receipt${suffix}`} type="file" name="receipt" accept="image/png,image/jpeg,application/pdf" className="text-sm" aria-describedby={`f-pay-receipt${suffix}-hint`} />
        <span id={`f-pay-receipt${suffix}-hint`} className="text-[13px] text-muted">
          {t("salaries.receiptHint")}
        </span>
      </div>
    </div>
  );
}

/** Who wrote a payment down and when, with its receipt. */
export function RecordLine({ record, money, t }: { record: { method: "cash" | "bank"; paidOn: string; by: string; note: string | null; receiptAssetId: string | null }; money: string; t: DashT }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-[15px] font-bold">
        {money} · {t(record.method === "cash" ? "salaries.cash" : "salaries.bank")} · <span dir="ltr">{record.paidOn}</span>
      </span>
      <span className="text-[13px] text-muted">{[t("salaries.recordedBy", { by: record.by }), record.note].filter(Boolean).join(" · ")}</span>
      {record.receiptAssetId ? (
        <a href={`/api/dashboard/school/salaries/receipts/${record.receiptAssetId}`} target="_blank" rel="noreferrer" className="text-[14px]">
          {t("salaries.seeReceipt")}
        </a>
      ) : null}
    </span>
  );
}
