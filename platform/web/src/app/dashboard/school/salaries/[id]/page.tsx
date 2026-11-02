import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addLineAction, answerLineAction, deleteDraftAction, finalisePayslipAction, recordPaymentAction, removePaymentAction, savePayslipNoteAction } from "@/app/actions/school-salaries";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import type { DashT } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolPayslip, SchoolPayslipLine } from "@/lib/data/types";
import { leftToPay, payslipNumber, payslipTotals, SALARY_LIMITS } from "@/lib/school/salaries";
import { schoolSettingsOf } from "@/lib/school/settings";
import { schoolToday } from "@/lib/school/service";
import { AddServiceBox } from "../../../delivery/forms";
import { Choice, SchoolForm } from "../../forms";
import { isSchool, NotSchool, PageHead, Panel } from "../../parts";
import { lineLabel, monthLabel, PayFields, RecordLine, SheetBadge } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("salaries.payslip") };
}

const SOURCE_KEYS = { office: null, absence: "salaries.fromAbsences", lateness: "salaries.fromLateness", advance: "salaries.fromAdvance" } as const;

/** A line of the sheet; on a draft, the office accepts it (at its amount or another), dismisses it, or removes its own. */
function LineRow({ payslip, line, editable, t }: { payslip: SchoolPayslip; line: SchoolPayslipLine; editable: boolean; t: DashT }) {
  const sign = line.kind === "bonus" ? "+" : "−";
  const source = SOURCE_KEYS[line.source];
  const muted = line.status !== "accepted";
  return (
    <li data-line={line.source} className="flex flex-col gap-2 border-t border-line-soft py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
          <span className={`text-[15px] font-semibold ${muted ? "text-muted" : ""}`}>{lineLabel(line, t)}</span>
          <span className="text-[13px] text-muted">
            {[
              t(line.kind === "bonus" ? "salaries.bonus" : line.kind === "advance" ? "salaries.advance" : "salaries.deduction"),
              source ? t(source) : null,
              line.suggestedCents !== null && line.suggestedCents !== line.cents && line.status === "accepted" ? t("salaries.suggestedWas", { amount: formatCents(line.suggestedCents, payslip.currency) }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span dir="ltr" className={`text-[15px] ${muted ? "text-muted line-through" : "font-semibold"}`}>
          {sign}
          {formatCents(line.cents, payslip.currency)}
        </span>
        {line.status === "suggested" ? <Badge tone="warn">{t("salaries.suggested")}</Badge> : null}
        {line.status === "dismissed" ? <Badge tone="neutral">{t("salaries.dismissed")}</Badge> : null}
      </div>
      {editable && line.status !== "dismissed" ? (
        <details className="rounded-xl border border-line p-3" open={line.status === "suggested"}>
          <summary className="cursor-pointer text-[14px] font-semibold">{line.status === "suggested" ? t("salaries.answer") : t("salaries.change")}</summary>
          <SchoolForm action={answerLineAction} submit={t("salaries.save")} className="pt-3">
            <input type="hidden" name="id" value={payslip.id} />
            <input type="hidden" name="line" value={line.id} />
            <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
              <legend className="sr-only">{lineLabel(line, t)}</legend>
              {(["accept", "dismiss"] as const).map((a) => (
                <label key={a} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand has-[:checked]:font-bold">
                  <input type="radio" name="answer" value={a} defaultChecked={a === "accept"} className="h-4 w-4 accent-midnight" />
                  {t(a === "accept" ? (line.status === "suggested" ? "salaries.accept" : "salaries.keep") : line.source === "office" ? "salaries.removeLine" : "salaries.dismiss")}
                </label>
              ))}
            </fieldset>
            <Field id={`f-line-${line.id}`} label={t("salaries.amount")} name="amount" defaultValue={(line.cents / 100).toFixed(2)} inputMode="decimal" dir="ltr" />
          </SchoolForm>
        </details>
      ) : null}
    </li>
  );
}

/**
 * 113.12 A person's payslip for a month: the base and allowances, the
 * suggestions to answer, bonuses and deductions, advances taken back, the
 * net; made final (the person sees it in the app) and the payments written
 * down as paid out, with who recorded each and a photo of its receipt.
 */
export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("salaries");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("salaries.payslip")} t={t} />;
  const { id } = await params;
  const store = await getStore();
  const payslip = /^\d{1,15}$/.test(id) ? await store.getSchoolPayslip(app.id, Number(id)) : null;
  if (!payslip) notFound();
  const [monthRow, saved] = await Promise.all([store.getSchoolSalaryMonth(app.id, payslip.month), store.getSchoolSettings(app.id)]);
  const today = schoolToday(schoolSettingsOf(saved, app), new Date());
  const locked = Boolean(monthRow?.lockedAt);
  const editable = payslip.status === "draft" && !locked;
  const totals = payslipTotals(payslip);
  const fmt = (cents: number) => formatCents(cents, payslip.currency);
  const left = leftToPay(payslip);
  const a = payslip.attendance;
  const row = "flex flex-wrap items-center justify-between gap-2 border-t border-line-soft py-2.5";
  const bonuses = payslip.lines.filter((l) => l.kind === "bonus");
  const deductions = payslip.lines.filter((l) => l.kind !== "bonus");

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={t("salaries.payslipOf", { name: payslip.personName, month: monthLabel(lang, payslip.month) })}
        intro={[payslipNumber(payslip), payslip.jobTitle, payslip.department, t(payslip.role === "teacher" ? "salaries.teacher" : "salaries.staffMember")].filter(Boolean).join(" · ")}
        back={{ href: `/dashboard/school/salaries?month=${payslip.month}`, label: t("salaries.monthSheets", { month: monthLabel(lang, payslip.month) }) }}
        actions={
          <a href={`/api/dashboard/school/salaries/${payslip.id}/pdf`} className={`${btn.secondary} h-11 gap-1.5 px-4 text-sm`}>
            <Icon name="download" size={18} />
            {t("salaries.downloadPdf")}
          </a>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SheetBadge payslip={payslip} t={t} />
        {payslip.finalAt ? <span className="text-[14px] text-muted">{t("salaries.finalBy", { by: payslip.finalBy ?? "—", date: payslip.finalAt.toISOString().slice(0, 10) })}</span> : null}
        {payslip.status === "draft" ? <span className="text-[14px] text-muted">{t("salaries.draftHint")}</span> : null}
        {locked && payslip.status === "draft" ? <span className="text-[14px] text-muted">{t("salaries.monthIsLocked")}</span> : null}
      </div>

      <Panel id="h-sheet" title={t("salaries.sheet")} intro={a ? t("salaries.daysLine", { working: a.workingDays, present: a.present, absent: a.absent, late: a.late, early: a.leftEarly, leave: a.leave, excused: a.excused }) : t("salaries.noDays")}>
        <ul className="m-0 flex list-none flex-col p-0" data-sheet>
          <li className={`${row} border-t-0`}>
            <span className="text-[15px] font-semibold">{t("salaries.base")}</span>
            <span dir="ltr" className="text-[15px] font-semibold">
              {fmt(payslip.baseCents)}
            </span>
          </li>
          {payslip.allowances.map((al, i) => (
            <li key={i} className={row}>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{al.name}</span>
                <span className="text-[13px] text-muted">{t("salaries.allowance")}</span>
              </span>
              <span dir="ltr" className="text-[15px] font-semibold">
                +{fmt(al.cents)}
              </span>
            </li>
          ))}
          {[...bonuses, ...deductions].map((line) => (
            <LineRow key={line.id} payslip={payslip} line={line} editable={editable} t={t} />
          ))}
        </ul>
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line pt-3 text-[15px]" data-net>
          <dt>{t("salaries.gross")}</dt>
          <dd className="m-0 text-end" dir="ltr">
            {fmt(totals.gross)}
          </dd>
          <dt>{t("salaries.deductions")}</dt>
          <dd className="m-0 text-end" dir="ltr">
            −{fmt(totals.deductions + totals.advances)}
          </dd>
          <dt className="font-bold">{t("salaries.net")}</dt>
          <dd className="m-0 text-end font-bold" dir="ltr">
            {fmt(payslip.netCents)}
          </dd>
        </dl>
        {payslip.note ? <p className="m-0 text-[14px] whitespace-pre-line text-ink-4">{payslip.note}</p> : null}
        {editable ? (
          <>
            <AddServiceBox title={t("salaries.addLine")} open={false}>
              <SchoolForm action={addLineAction} submit={t("salaries.add")} reset>
                <input type="hidden" name="id" value={payslip.id} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Choice
                    id="f-line-kind"
                    name="kind"
                    label={t("salaries.lineKind")}
                    options={[
                      { value: "bonus", label: t("salaries.bonus") },
                      { value: "deduction", label: t("salaries.deduction") },
                    ]}
                  />
                  <Field id="f-line-label" label={t("salaries.lineFor")} name="label" maxLength={SALARY_LIMITS.label} placeholder={t("salaries.lineExample")} />
                  <Field id="f-line-amount" label={t("salaries.amount")} name="amount" inputMode="decimal" dir="ltr" />
                </div>
              </SchoolForm>
            </AddServiceBox>
            <AddServiceBox title={t("salaries.payslipNote")} open={false}>
              <SchoolForm action={savePayslipNoteAction} submit={t("salaries.save")}>
                <input type="hidden" name="id" value={payslip.id} />
                <label htmlFor="f-payslip-note" className="sr-only">
                  {t("salaries.payslipNote")}
                </label>
                <textarea id="f-payslip-note" name="note" rows={2} maxLength={SALARY_LIMITS.note} defaultValue={payslip.note ?? ""} className="input min-h-16 py-3" />
              </SchoolForm>
            </AddServiceBox>
            <div className="flex flex-wrap gap-3">
              <SchoolForm action={finalisePayslipAction} submit={t("salaries.finalise")}>
                <input type="hidden" name="id" value={payslip.id} />
              </SchoolForm>
              <SchoolForm action={deleteDraftAction} submit={t("salaries.deleteDraft")}>
                <input type="hidden" name="id" value={payslip.id} />
              </SchoolForm>
            </div>
          </>
        ) : null}
      </Panel>

      <Panel id="h-payments" title={t("salaries.payments")} intro={t("salaries.paymentsIntro")}>
        {payslip.payments.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("salaries.noPayments")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-payments>
          {payslip.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-line-soft py-2.5 first:border-t-0">
              <RecordLine record={p} money={fmt(p.cents)} t={t} />
              <SchoolForm action={removePaymentAction} submit={t("salaries.removePayment")}>
                <input type="hidden" name="id" value={payslip.id} />
                <input type="hidden" name="payment" value={p.id} />
              </SchoolForm>
            </li>
          ))}
        </ul>
        {payslip.payments.length ? <p className="m-0 text-[15px] font-semibold">{t("salaries.paidLeft", { paid: fmt(payslip.paidCents), left: fmt(left) })}</p> : null}
        {left <= 0 && payslip.payments.length ? (
          <p role="status" className="m-0 text-[15px] text-muted">
            {t("salaries.paidInFull")}
          </p>
        ) : null}
        {left > 0 && (payslip.status !== "draft" || !locked) ? (
          <AddServiceBox title={t("salaries.recordPayment")} open={payslip.status === "final"}>
            <SchoolForm action={recordPaymentAction} submit={t("salaries.recordPaid")} reset>
              <input type="hidden" name="id" value={payslip.id} />
              {payslip.status === "draft" ? <p className="m-0 text-[14px] text-muted">{t("salaries.payFinalises")}</p> : null}
              <PayFields suffix="-payslip" amount={(left / 100).toFixed(2)} today={today} t={t} />
            </SchoolForm>
          </AddServiceBox>
        ) : null}
      </Panel>
    </div>
  );
}
