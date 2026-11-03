import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { lockMonthAction, makeSheetsAction, reopenMonthAction, saveSalarySettingsAction } from "@/app/actions/school-salaries";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { ItemList, ItemRow, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { checkinSettingsOf } from "@/lib/school/checkin";
import { allowancesOf, isMonth, isWorkerRole, monthBefore, monthOpenForSheets, monthTotals, salarySettingsOf } from "@/lib/school/salaries";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { monthLabel, SheetBadge } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("salaries.title") };
}

/**
 * 113.12 Salaries, recorded by hand: the month's payslips (made from each
 * person's salary, its suggestions answered, locked, paid), its totals and
 * CSV file, the teachers and staff with their salaries, and the rules for
 * deductions suggested from check-in. Nothing here moves money.
 */
export default async function SalariesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { app, license } = await requireClient("salaries");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("salaries.title")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const now = new Date();
  const saved = await store.getSchoolSettings(app.id);
  const settings = schoolSettingsOf(saved, app);
  const current = schoolToday(settings, now).slice(0, 7);
  const month = isMonth(params.month) && monthOpenForSheets(params.month, current) ? params.month : current;
  const [people, salaries, sheets, monthRow, plan] = await Promise.all([
    store.listSchoolPeople(app.id),
    store.listSchoolSalaries(app.id),
    store.listSchoolPayslips(app.id, { month }),
    store.getSchoolSalaryMonth(app.id, month),
    appPlan(store, license, now),
  ]);
  const workers = people.filter((p) => isWorkerRole(p.role)).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  const salaryOf = new Map(salaries.map((s) => [s.personId, s]));
  const totals = monthTotals(sheets);
  const locked = monthRow?.lockedAt ?? null;
  const rules = salarySettingsOf(settings);
  const checkinOn = checkinSettingsOf(settings).on;
  const head = "py-2 pe-4 text-start font-semibold";
  const cell = "py-2 pe-4";
  const previous = monthBefore(month);
  const next = monthBefore(month, -1);
  const waiting = (p: (typeof sheets)[number]) => p.lines.filter((l) => l.status === "suggested").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("salaries.title")} intro={t("salaries.intro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      <p role="note" className="m-0 flex gap-2.5 rounded-xl border border-line bg-sand px-4 py-3 text-[15px] leading-relaxed">
        <Icon name="info" size={22} className="shrink-0 text-muted" />
        <span>{t("salaries.byHand")}</span>
      </p>

      {/* The page kit: the month's numbers (per currency), the months, the payslips, the people, then the rules. */}
      {totals.length ? (
        <StatRow label={t("salaries.monthSheets", { month: monthLabel(lang, month) })}>
          {totals.slice(0, 1).map((total) => (
            <Fragment key={total.currency}>
              <Stat icon="groups" label={t("salaries.people")} value={total.people} />
              <Stat icon="payments" tone="accent" label={t("salaries.colNet")} value={<span dir="ltr">{formatCents(total.net, total.currency)}</span>} />
              <Stat icon="check_circle" tone="success" label={t("salaries.colPaid")} value={<span dir="ltr">{formatCents(total.paid, total.currency)}</span>} />
              <Stat icon="hourglass_top" tone={total.left > 0 ? "warn" : "neutral"} label={t("salaries.statLeft")} value={<span dir="ltr">{formatCents(total.left, total.currency)}</span>} />
            </Fragment>
          ))}
        </StatRow>
      ) : null}

      <nav aria-label={t("salaries.months")} className="flex flex-wrap items-end gap-2">
        {monthOpenForSheets(previous, current) ? (
          <Link href={`/dashboard/school/salaries?month=${previous}`} className={`${btn.secondary} h-10 gap-1 px-3 text-sm`}>
            <Icon name="chevron_left" size={18} className="rtl:rotate-180" />
            {monthLabel(lang, previous)}
          </Link>
        ) : null}
        <form method="get" className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-month" className="text-sm font-semibold">
              {t("salaries.month")}
            </label>
            <input id="f-month" name="month" type="month" dir="ltr" defaultValue={month} max={current} min={monthBefore(current, 24)} className="input input-sm" />
          </div>
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("salaries.show")}
          </button>
        </form>
        {next <= current ? (
          <Link href={`/dashboard/school/salaries?month=${next}`} className={`${btn.secondary} h-10 gap-1 px-3 text-sm`}>
            {monthLabel(lang, next)}
            <Icon name="chevron_right" size={18} className="rtl:rotate-180" />
          </Link>
        ) : null}
      </nav>

      <Panel
        id="h-month"
        title={t("salaries.monthSheets", { month: monthLabel(lang, month) })}
        intro={locked ? t("salaries.lockedIntro", { by: monthRow?.lockedBy ?? "—", date: locked.toISOString().slice(0, 10) }) : t("salaries.sheetsIntro")}
      >
        <div className="flex flex-wrap items-start gap-3">
          {locked ? null : (
            <SchoolForm action={makeSheetsAction} submit={sheets.length ? t("salaries.makeAgain") : t("salaries.make")}>
              <input type="hidden" name="month" value={month} />
            </SchoolForm>
          )}
          {/* One form that locks and opens again, kept in its place so what it answered stays shown after the month changes. */}
          {locked || sheets.length ? (
            <SchoolForm action={locked ? reopenMonthAction : lockMonthAction} submit={t(locked ? "salaries.reopen" : "salaries.lock")}>
              <input type="hidden" name="month" value={month} />
            </SchoolForm>
          ) : null}
          {sheets.length ? (
            <a href={`/api/dashboard/school/salaries?month=${month}`} className={`${btn.secondary} h-10 px-4 text-sm`}>
              <Icon name="download" size={18} />
              {t("salaries.downloadCsv")}
            </a>
          ) : null}
        </div>
        {locked ? null : <p className="m-0 text-[14px] text-muted">{t("salaries.lockHint")}</p>}
        {sheets.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("salaries.noSheets")}</p> : null}
        {totals.map((total) => (
          <p key={total.currency} data-totals={total.currency} className="m-0 text-[15px] font-semibold">
            {t("salaries.totalsLine", {
              people: total.people,
              gross: formatCents(total.gross, total.currency),
              deductions: formatCents(total.deductions + total.advances, total.currency),
              net: formatCents(total.net, total.currency),
              paid: formatCents(total.paid, total.currency),
              left: formatCents(total.left, total.currency),
            })}
          </p>
        ))}
        {sheets.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-line">
                  <th className={head}>{t("salaries.colName")}</th>
                  <th className={head}>{t("salaries.colNet")}</th>
                  <th className={head}>{t("salaries.colPaid")}</th>
                  <th className={head}>{t("salaries.colState")}</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((p) => (
                  <tr key={p.id} data-payslip={p.id} className="border-b border-line-soft">
                    <td className={cell}>
                      <span className="flex flex-col">
                        <Link href={`/dashboard/school/salaries/${p.id}`} className="font-semibold">
                          {p.personName}
                        </Link>
                        <span className="text-[12px] text-muted">{[p.jobTitle, p.department].filter(Boolean).join(" · ") || t(p.role === "teacher" ? "salaries.teacher" : "salaries.staffMember")}</span>
                      </span>
                    </td>
                    <td className={cell} dir="ltr">
                      {formatCents(p.netCents, p.currency)}
                    </td>
                    <td className={cell} dir="ltr">
                      {formatCents(p.paidCents, p.currency)}
                    </td>
                    <td className={cell}>
                      <span className="flex flex-wrap gap-1">
                        <SheetBadge payslip={p} t={t} />
                        {waiting(p) ? <Badge tone="warn">{t("salaries.toAnswer", { count: waiting(p) })}</Badge> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel id="h-salary-people" title={t("salaries.people")} intro={t("salaries.peopleIntro")} flush>
        {workers.length === 0 ? (
          <div className="p-5 sm:p-6">
            <FirstNote text={t("salaries.noWorkers")} href="/dashboard/school/people?role=staff" />
          </div>
        ) : null}
        <ItemList>
          {workers.map((person, i) => {
            const salary = salaryOf.get(person.id);
            return (
              <ItemRow
                key={person.id}
                data-person={person.id}
                href={`/dashboard/school/salaries/people/${person.id}`}
                media={<Thumb icon={person.role === "teacher" ? "menu_book" : "home_work"} shape="round" tint={i} />}
                title={person.name}
                meta={[
                  person.jobTitle ?? t(person.role === "teacher" ? "salaries.teacher" : "salaries.staffMember"),
                  salary
                    ? salary.allowances.length
                      ? t("salaries.salaryWithAllowances", { amount: formatCents(salary.monthlyCents, salary.currency), allowances: formatCents(allowancesOf(salary), salary.currency) })
                      : t("salaries.salaryLine", { amount: formatCents(salary.monthlyCents, salary.currency) })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                aside={
                  <>
                    {salary ? null : <Badge tone="warn">{t("salaries.noSalary")}</Badge>}
                    {person.active ? null : <Badge tone="neutral">{t("salaries.inactive")}</Badge>}
                  </>
                }
              />
            );
          })}
        </ItemList>
      </Panel>

      <PageGroup title={t("salaries.rules")}>
      <Panel id="h-salary-rules" title={t("salaries.rules")} intro={t("salaries.rulesIntro")}>
        {checkinOn ? null : <FirstNote text={t("salaries.checkinOff")} href="/dashboard/school/checkin/settings" />}
        <SchoolForm action={saveSalarySettingsAction} submit={t("salaries.saveRules")}>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="absenceOn" defaultChecked={rules.absence.on} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("salaries.absenceOn")}</span>
              <span className="text-[14px] text-muted">{t("salaries.absenceHint")}</span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="f-absence-days" label={t("salaries.absenceDays")} name="absenceDays" inputMode="decimal" defaultValue={String(rules.absence.days)} dir="ltr" />
          </div>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="lateOn" defaultChecked={rules.lateness.on} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="font-semibold">{t("salaries.lateOn")}</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="f-late-every" label={t("salaries.lateEvery")} name="lateEvery" type="number" min={1} max={31} defaultValue={String(rules.lateness.every)} dir="ltr" />
            <Field id="f-late-days" label={t("salaries.lateDays")} name="lateDays" inputMode="decimal" defaultValue={String(rules.lateness.days)} dir="ltr" />
          </div>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="countEarly" defaultChecked={rules.lateness.countEarly} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="font-semibold">{t("salaries.countEarly")}</span>
          </label>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="withAllowances" defaultChecked={rules.dayPayWithAllowances} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("salaries.withAllowances")}</span>
              <span className="text-[14px] text-muted">{t("salaries.dayPayHint")}</span>
            </span>
          </label>
        </SchoolForm>
      </Panel>
      </PageGroup>
    </div>
  );
}
