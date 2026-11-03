import type { Metadata } from "next";
import { addSchoolFeeAction, cancelSchoolFeeAction, markSchoolFeePaidAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, btn } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { ChipLinks, ListBar, Pager, SearchForm } from "@/components/page-kit-c";
import type { DashKey } from "@/i18n/dashboard";
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

  const showKey = (st: SchoolFeeStatus): DashKey => (st === "due" ? "school.feeDue" : st === "paid" ? "school.feePaid" : "school.feeCancelled");
  const countOf = (st: SchoolFeeStatus) => fees.filter((f) => f.status === st).length;
  const has = fees.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the fees by status, then adding one. */}
      <PageHead
        title={t("school.fees")}
        intro={t("school.feesIntro")}
        actions={
          has && active.length ? (
            <SheetButton target="new-fee" icon="add">
              {t("school.addFee")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {feesByCardReady(app, plan, settings) ? (
        <p role="note" className="m-0 flex gap-2.5 rounded-xl bg-success-bg px-4 py-3 text-[15px] leading-relaxed text-success">
          <Icon name="credit_card" size={22} className="shrink-0" />
          <span>{t("school.byCardOn")}</span>
        </p>
      ) : (
        <FirstNote text={t("school.byCardOff")} href="/dashboard/school/settings" />
      )}

      <StatRow label={t("school.fees")}>
        <Stat icon="payments" tone="accent" label={t("school.statDueAmount")} value={<span dir="ltr">{formatCents(dueTotal, currency)}</span>} />
        <Stat icon="hourglass_top" tone="warn" label={t("school.feeDue")} value={countOf("due")} href={link("due")} />
        <Stat icon="check_circle" tone="success" label={t("school.feePaid")} value={countOf("paid")} href={link("paid")} />
        <Stat icon="cancel" label={t("school.feeCancelled")} value={countOf("cancelled")} href={link("cancelled")} />
      </StatRow>

      <Panel id="h-fees" title={t(showKey(show))} flush>
        <ListBar>
          <ChipLinks label={t("school.fees")} items={SHOWS.map((st) => ({ href: link(st), label: t(showKey(st)), count: countOf(st), current: st === show }))} />
          {has ? <SearchForm label={t("school.search")} placeholder={t("school.searchFees")} defaultValue={params.q ?? ""} keep={{ show }} button={t("school.search")} /> : null}
        </ListBar>
        {list.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon={q ? "search" : "receipt_long"} title={t("school.noFees")} />
          </div>
        ) : (
          <ItemList>
            {list.map((fee, i) => {
              const who = student.get(fee.studentId);
              return (
                <ItemRow
                  key={fee.id}
                  media={<Thumb icon="receipt_long" shape="square" tint={i} />}
                  title={
                    <>
                      {fee.title} · <span dir="ltr">{formatCents(fee.amountCents, currency)}</span>
                    </>
                  }
                  badges={fee.status === "cancelled" ? <Badge tone="neutral">{t("school.feeCancelled")}</Badge> : null}
                  meta={[feeReference(fee), who ? `${who.name}${who.classId ? ` (${className.get(who.classId) ?? ""})` : ""}` : null].filter(Boolean).join(" · ")}
                  extra={
                    fee.dueOn || fee.paidAt
                      ? [fee.dueOn ? t("school.dueOn", { date: fee.dueOn }) : null, fee.paidAt ? t(fee.paidBy === "card" ? "school.paidByCard" : "school.paidAtSchool", { date: fee.paidAt.toISOString().slice(0, 10) }) : null].filter(Boolean).join(" · ")
                      : null
                  }
                  actions={
                    <>
                      {fee.status === "paid" && fee.receiptCode ? (
                        <a href={feeReceiptUrl(appUrl(), fee.receiptCode)} target="_blank" rel="noopener" className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                          <Icon name="receipt_long" size={18} />
                          {t("school.receipt")}
                        </a>
                      ) : null}
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
                    </>
                  }
                />
              );
            })}
          </ItemList>
        )}
        {pages > 1 ? (
          <Pager
            label={t("school.pages")}
            prev={page > 1 ? { href: link(show, page - 1), label: t("school.previous") } : null}
            next={page < pages ? { href: link(show, page + 1), label: t("school.next") } : null}
            text={t("school.pageOf", { page, pages })}
          />
        ) : null}
      </Panel>

      {active.length === 0 ? (
        <FirstNote text={t("school.studentsFirst")} href="/dashboard/school/people" />
      ) : (
        // One place in the page either way, so the form that adds the first fee keeps its message.
        <Sheet id="new-fee" inline={!has} title={t("school.addFee")} description={t("school.addFeeIntro")}>
          <SchoolForm action={addSchoolFeeAction} submit={t("school.add")} reset sheet>
            <div className="grid gap-4 sm:grid-cols-2">
              <Choice id="f-to" name="to" label={t("school.feeFor")} options={toOptions} empty={t("school.choose")} className="sm:col-span-2" />
              <Field id="f-title" label={t("school.feeTitle")} name="title" maxLength={120} placeholder={t("school.feeTitleExample")} required />
              <Field id="f-amount" label={t("school.amount", { currency })} name="amount" inputMode="decimal" dir="ltr" required />
              <Field id="f-due" label={t("school.dueOptional")} name="dueOn" type="date" dir="ltr" />
            </div>
          </SchoolForm>
        </Sheet>
      )}
    </div>
  );
}
