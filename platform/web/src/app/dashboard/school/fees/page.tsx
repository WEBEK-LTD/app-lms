import type { Metadata } from "next";
import Link from "next/link";
import { addSchoolFeeAction, cancelSchoolFeeAction, markSchoolFeePaidAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { Badge, btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolFeeStatus } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { feeReceiptUrl, feeReference } from "@/lib/school/service";
import { feesByCardReady, schoolCurrency, schoolSettingsOf } from "@/lib/school/settings";
import { appUrl } from "@/lib/env";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.fees") };
}

const SHOWS = ["due", "paid", "cancelled"] as const;
const PER_PAGE = 50;

/** 105.4 What the school asks of each family: added here, paid by card in the app or at the school, each with its receipt. */
export default async function SchoolFeesPage({ searchParams }: { searchParams: Promise<{ show?: string; q?: string; page?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.fees")} t={t} />;
  const params = await searchParams;
  const show: SchoolFeeStatus = (SHOWS as readonly string[]).includes(params.show ?? "") ? (params.show as SchoolFeeStatus) : "due";
  const q = (params.q ?? "").trim().toLowerCase();
  const store = await getStore();
  const [fees, students, classes, saved, plan] = await Promise.all([
    store.listSchoolFees(app.id),
    store.listSchoolPeople(app.id, { role: "student" }),
    store.listSchoolClasses(app.id),
    store.getSchoolSettings(app.id),
    appPlan(store, license, new Date()),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const currency = schoolCurrency(settings);
  const student = new Map(students.map((s) => [s.id, s]));
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const shown = fees
    .filter((f) => f.status === show)
    .filter((f) => !q || f.title.toLowerCase().includes(q) || (student.get(f.studentId)?.name ?? "").toLowerCase().includes(q) || feeReference(f).toLowerCase() === q);
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const list = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const dueTotal = fees.filter((f) => f.status === "due").reduce((sum, f) => sum + f.amountCents, 0);
  const link = (s: SchoolFeeStatus, p = 1) => `/dashboard/school/fees?show=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`;
  const active = students.filter((s) => s.active);
  const toOptions = [
    ...classes.map((c) => ({ value: `class:${c.id}`, label: t("school.wholeClass", { name: c.name }) })),
    ...active.map((s) => ({ value: `student:${s.id}`, label: s.classId ? `${s.name} (${className.get(s.classId) ?? ""})` : s.name })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.fees")} intro={t("school.feesIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {feesByCardReady(app, plan, settings) ? (
        <p role="note" className="m-0 max-w-[860px] rounded-xl bg-success-bg px-4 py-3 text-[15px] leading-relaxed text-success">
          {t("school.byCardOn")}
        </p>
      ) : (
        <FirstNote text={t("school.byCardOff")} href="/dashboard/school/settings" />
      )}
      <p className="m-0 text-[15px] font-semibold">{t("school.dueTotal", { amount: formatCents(dueTotal, currency) })}</p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label={t("school.fees")} className="flex flex-wrap gap-1.5">
          {SHOWS.map((s) => (
            <Link
              key={s}
              href={link(s)}
              aria-current={s === show ? "page" : undefined}
              className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
                s === show ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
              }`}
            >
              {t(s === "due" ? "school.feeDue" : s === "paid" ? "school.feePaid" : "school.feeCancelled")} ({fees.filter((f) => f.status === s).length})
            </Link>
          ))}
        </nav>
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="show" value={show} />
          <label htmlFor="f-q" className="sr-only">
            {t("school.search")}
          </label>
          <input id="f-q" name="q" type="search" defaultValue={params.q ?? ""} placeholder={t("school.searchFees")} className="input input-sm w-[220px]" />
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("school.search")}
          </button>
        </form>
      </div>

      <Panel id="h-fees" title={t(show === "due" ? "school.feeDue" : show === "paid" ? "school.feePaid" : "school.feeCancelled")}>
        {list.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noFees")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {list.map((fee) => {
            const who = student.get(fee.studentId);
            return (
              <li key={fee.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">
                    {fee.title} · <span dir="ltr">{formatCents(fee.amountCents, currency)}</span>
                  </span>
                  <span className="text-[13px] text-muted">
                    {[
                      feeReference(fee),
                      who ? `${who.name}${who.classId ? ` (${className.get(who.classId) ?? ""})` : ""}` : null,
                      fee.dueOn ? t("school.dueOn", { date: fee.dueOn }) : null,
                      fee.paidAt ? t(fee.paidBy === "card" ? "school.paidByCard" : "school.paidAtSchool", { date: fee.paidAt.toISOString().slice(0, 10) }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {fee.status === "paid" && fee.receiptCode ? (
                  <a href={feeReceiptUrl(appUrl(), fee.receiptCode)} target="_blank" rel="noopener" className="text-[15px]">
                    {t("school.receipt")}
                  </a>
                ) : null}
                {fee.status === "cancelled" ? <Badge tone="neutral">{t("school.feeCancelled")}</Badge> : null}
                {fee.status === "due" ? (
                  <>
                    <form action={markSchoolFeePaidAction}>
                      <input type="hidden" name="id" value={fee.id} />
                      <ConfirmButton confirm={t("school.confirmPaid", { title: fee.title, name: who?.name ?? "" })} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                        {t("school.markPaid")}
                      </ConfirmButton>
                    </form>
                    <form action={cancelSchoolFeeAction}>
                      <input type="hidden" name="id" value={fee.id} />
                      <ConfirmButton confirm={t("school.confirmCancelFee", { title: fee.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("school.cancelFee")}
                      </ConfirmButton>
                    </form>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
        {pages > 1 ? (
          <nav aria-label={t("school.pages")} className="flex items-center justify-between gap-3 text-[15px]">
            {page > 1 ? <Link href={link(show, page - 1)}>{t("school.previous")}</Link> : <span />}
            <span className="text-muted">{t("school.pageOf", { page, pages })}</span>
            {page < pages ? <Link href={link(show, page + 1)}>{t("school.next")}</Link> : <span />}
          </nav>
        ) : null}
      </Panel>

      <Panel id="h-add-fee" title={t("school.addFee")} intro={t("school.addFeeIntro")}>
        {active.length === 0 ? (
          <FirstNote text={t("school.studentsFirst")} href="/dashboard/school/people" />
        ) : (
          <AddServiceBox title={t("school.addFee")} open={fees.length === 0}>
            <SchoolForm action={addSchoolFeeAction} submit={t("school.add")} reset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Choice id="f-to" name="to" label={t("school.feeFor")} options={toOptions} empty={t("school.choose")} className="sm:col-span-2" />
                <Field id="f-title" label={t("school.feeTitle")} name="title" maxLength={120} placeholder={t("school.feeTitleExample")} required />
                <Field id="f-amount" label={t("school.amount", { currency })} name="amount" inputMode="decimal" dir="ltr" required />
                <Field id="f-due" label={t("school.dueOptional")} name="dueOn" type="date" dir="ltr" />
              </div>
            </SchoolForm>
          </AddServiceBox>
        )}
      </Panel>
    </div>
  );
}
