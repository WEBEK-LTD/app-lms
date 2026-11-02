import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { advancePlanAction, deleteAdvanceAction, giveAdvanceAction, removeSalaryAction, repayAdvanceAction, saveSalaryAction } from "@/app/actions/school-salaries";
import { Field } from "@/components/form";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES, formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { advanceBalance, isWorkerRole, SALARY_LIMITS } from "@/lib/school/salaries";
import { salaryFormValues } from "@/lib/school/salary-forms";
import { schoolCurrency, schoolSettingsOf } from "@/lib/school/settings";
import { schoolToday } from "@/lib/school/service";
import { AddServiceBox } from "../../../../delivery/forms";
import { Choice, SchoolForm } from "../../../forms";
import { isSchool, NotSchool, PageHead, Panel } from "../../../parts";
import { monthLabel, PayFields, RecordLine, SheetBadge } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("salaries.title") };
}

/** 113.12 A teacher's or staff member's salary and allowances, their advances (handed over, taken back, paid back) and their payslips. */
export default async function SalaryPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("salaries");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("salaries.title")} t={t} />;
  const { id } = await params;
  const store = await getStore();
  const person = /^\d{1,15}$/.test(id) ? await store.getSchoolPerson(app.id, Number(id)) : null;
  if (!person || !isWorkerRole(person.role)) notFound();
  const [salary, advances, payslips, saved] = await Promise.all([
    store.getSchoolSalary(app.id, person.id),
    store.listSchoolSalaryAdvances(app.id, { personId: person.id }),
    store.listSchoolPayslips(app.id, { personId: person.id }),
    store.getSchoolSettings(app.id),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const today = schoolToday(settings, new Date());
  const values = salaryFormValues(salary, schoolCurrency(settings));
  // The allowances written, and room for two more.
  const rows = Math.min(SALARY_LIMITS.allowances, (salary?.allowances.length ?? 0) + 2);

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={person.name} intro={[person.jobTitle, person.department, t(person.role === "teacher" ? "salaries.teacher" : "salaries.staffMember")].filter(Boolean).join(" · ")} back={{ href: "/dashboard/school/salaries", label: t("salaries.title") }} />

      <Panel id="h-salary" title={t("salaries.salary")} intro={t("salaries.salaryIntro")}>
        <SchoolForm action={saveSalaryAction} submit={t("salaries.save")}>
          <input type="hidden" name="personId" value={person.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="f-monthly" label={t("salaries.monthly")} name="monthly" defaultValue={values.monthly} inputMode="decimal" dir="ltr" required />
            <Choice id="f-currency" name="currency" label={t("salaries.currency")} options={CATALOG_CURRENCIES.map((c) => ({ value: c, label: c }))} defaultValue={values.currency} />
          </div>
          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-1 text-sm font-semibold">{t("salaries.allowances")}</legend>
            {Array.from({ length: rows }, (_, i) => i + 1).map((i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-2">
                <Field id={`f-allowance-name-${i}`} label={t("salaries.allowanceName", { n: i })} name={`allowanceName${i}`} defaultValue={values[`allowanceName${i}`]} maxLength={SALARY_LIMITS.name} placeholder={t("salaries.allowanceExample")} />
                <Field id={`f-allowance-amount-${i}`} label={t("salaries.allowanceAmount", { n: i })} name={`allowanceAmount${i}`} defaultValue={values[`allowanceAmount${i}`]} inputMode="decimal" dir="ltr" />
              </div>
            ))}
          </fieldset>
          <Field id="f-salary-note" label={t("salaries.noteOptional")} name="note" defaultValue={values.note} maxLength={SALARY_LIMITS.note} />
          {salary ? <p className="m-0 text-[13px] text-muted">{t("salaries.changedBy", { by: salary.updatedBy ?? "—", date: salary.updatedAt.toISOString().slice(0, 10) })}</p> : null}
        </SchoolForm>
        {salary ? (
          <AddServiceBox title={t("salaries.removeSalary")} open={false}>
            <SchoolForm action={removeSalaryAction} submit={t("salaries.remove")}>
              <input type="hidden" name="personId" value={person.id} />
              <p className="m-0 text-[14px] text-muted">{t("salaries.removeSalaryHint")}</p>
            </SchoolForm>
          </AddServiceBox>
        ) : null}
      </Panel>

      <Panel id="h-advances" title={t("salaries.advances")} intro={t("salaries.advancesIntro")}>
        {advances.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("salaries.noAdvances")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-advances>
          {advances.map((a) => {
            const balance = advanceBalance(a, payslips);
            const fmt = (cents: number) => formatCents(cents, a.currency);
            return (
              <li key={a.id} data-advance={a.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <RecordLine record={a.given} money={fmt(a.amountCents)} t={t} />
                <span className="text-[14px]">
                  {t("salaries.advanceLine", { instalment: fmt(a.instalmentCents), from: monthLabel(lang, a.startsMonth), taken: fmt(balance.fromPayslips + balance.repaid), left: fmt(balance.left) })}
                </span>
                {a.repayments.length ? (
                  <ul className="m-0 flex list-none flex-col gap-1.5 ps-3">
                    {a.repayments.map((r) => (
                      <li key={r.id}>
                        <RecordLine record={r} money={t("salaries.paidBack", { amount: fmt(r.cents) })} t={t} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {balance.left > 0 ? (
                  <div className="flex flex-col gap-2">
                    <AddServiceBox title={t("salaries.changePlan")} open={false}>
                      <SchoolForm action={advancePlanAction} submit={t("salaries.save")}>
                        <input type="hidden" name="id" value={a.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field id={`f-plan-instalment-${a.id}`} label={t("salaries.instalment")} name="instalment" defaultValue={(a.instalmentCents / 100).toFixed(2)} inputMode="decimal" dir="ltr" />
                          <Field id={`f-plan-month-${a.id}`} label={t("salaries.startsMonth")} name="startsMonth" type="month" defaultValue={a.startsMonth} dir="ltr" />
                        </div>
                      </SchoolForm>
                    </AddServiceBox>
                    <AddServiceBox title={t("salaries.repay")} open={false}>
                      <SchoolForm action={repayAdvanceAction} submit={t("salaries.recordRepay")} reset>
                        <input type="hidden" name="id" value={a.id} />
                        <PayFields suffix={`-repay-${a.id}`} amount={(balance.left / 100).toFixed(2)} today={today} t={t} />
                      </SchoolForm>
                    </AddServiceBox>
                  </div>
                ) : (
                  <span className="text-[14px] font-semibold text-success">{t("salaries.advanceDone")}</span>
                )}
                {balance.fromPayslips === 0 && a.repayments.length === 0 ? (
                  <AddServiceBox title={t("salaries.removeAdvance")} open={false}>
                    <SchoolForm action={deleteAdvanceAction} submit={t("salaries.remove")}>
                      <input type="hidden" name="id" value={a.id} />
                      <p className="m-0 text-[14px] text-muted">{t("salaries.removeAdvanceHint")}</p>
                    </SchoolForm>
                  </AddServiceBox>
                ) : null}
              </li>
            );
          })}
        </ul>
        {salary ? (
          <AddServiceBox title={t("salaries.giveAdvance")} open={advances.length === 0}>
            <SchoolForm action={giveAdvanceAction} submit={t("salaries.recordAdvance")} reset>
              <input type="hidden" name="personId" value={person.id} />
              <PayFields suffix="-advance" amount="" today={today} t={t} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="f-advance-instalment" label={t("salaries.instalment")} name="instalment" inputMode="decimal" dir="ltr" required hint={t("salaries.instalmentHint", { currency: salary.currency })} />
                <Field id="f-advance-month" label={t("salaries.startsMonth")} name="startsMonth" type="month" defaultValue={today.slice(0, 7)} dir="ltr" required />
              </div>
            </SchoolForm>
          </AddServiceBox>
        ) : (
          <p className="m-0 text-[15px] text-muted">{t("salaries.salaryFirst")}</p>
        )}
      </Panel>

      <Panel id="h-person-payslips" title={t("salaries.payslips")}>
        {payslips.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("salaries.noPayslips")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {payslips.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 border-t border-line-soft py-2.5 first:border-t-0">
              <Link href={`/dashboard/school/salaries/${p.id}`} className="min-w-[160px] flex-1 text-[15px] font-bold">
                {monthLabel(lang, p.month)}
              </Link>
              <span dir="ltr" className="text-[15px]">
                {formatCents(p.netCents, p.currency)}
              </span>
              <SheetBadge payslip={p} t={t} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
