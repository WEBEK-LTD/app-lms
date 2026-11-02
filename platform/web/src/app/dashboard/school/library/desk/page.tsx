import type { Metadata } from "next";
import { Stat, StatRow } from "@/components/page-kit";
import Link from "next/link";
import { lendBookAction, returnBookAction, returnLoanAction } from "@/app/actions/school-library";
import { Field } from "@/components/form";
import { Badge, btn } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolBookLoan } from "@/lib/data/types";
import { holdLive, isOverdue, librarySettingsOf } from "@/lib/school/library";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { SchoolForm } from "../../forms";
import { isSchool, NotSchool, PageHead, Panel } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("library.desk") };
}

/** 113.11 The library's desk: a copy lent by the student's code (or name) and the copy's code, a copy returned by its code, the books held to collect, overdue and out now. */
export default async function LibraryDeskPage() {
  const { app } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("library.desk")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [open, holds, books, copies, people, saved] = await Promise.all([
    store.listSchoolBookLoans(app.id, { open: true }),
    store.listSchoolBookHolds(app.id, { statuses: ["ready"] }),
    store.listSchoolBooks(app.id),
    store.listSchoolBookCopies(app.id),
    store.listSchoolPeople(app.id),
    store.getSchoolSettings(app.id),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const library = librarySettingsOf(settings);
  const today = schoolToday(settings, now);
  const title = new Map(books.map((b) => [b.id, b.title]));
  const code = new Map(copies.map((c) => [c.id, c.code]));
  const person = new Map(people.map((p) => [p.id, p]));
  const day = (d: Date | string) => formatDate(lang, typeof d === "string" ? new Date(`${d}T00:00:00Z`) : d);
  const overdue = open.filter((l) => isOverdue(l, today)).sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const out = open.filter((l) => !isOverdue(l, today)).sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const ready = holds.filter((h) => holdLive(h, now));

  const loanRow = (loan: SchoolBookLoan) => {
    const who = person.get(loan.personId);
    return (
      <li key={loan.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link href={`/dashboard/school/library/${loan.bookId}`} className="text-[15px] font-semibold no-underline">
            {title.get(loan.bookId) ?? "—"}
          </Link>
          <span className="text-[13px] text-muted">
            <Link href={`/dashboard/school/library/people/${loan.personId}`} className="text-inherit">
              {who?.name ?? "—"}
            </Link>
            {who?.code ? ` (${who.code})` : ""} · <bdi dir="ltr">{code.get(loan.copyId) ?? ""}</bdi> · {t("library.dueOnDate", { date: day(loan.dueOn) })}
          </span>
        </span>
        {isOverdue(loan, today) ? <Badge tone="danger">{t("library.overdue")}</Badge> : null}
        <form action={returnLoanAction}>
          <input type="hidden" name="id" value={loan.id} />
          <button type="submit" className={`${btn.secondary} h-8 px-3 text-sm`}>
            {t("library.markReturned")}
          </button>
        </form>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("library.desk")} intro={t("library.deskIntro", { days: library.loanDays, max: library.maxLoans })} back={{ href: "/dashboard/school/library", label: t("library.title") }} />

      {/* The page kit: the desk's numbers, lending and taking back side by side, then the lists. */}
      <StatRow label={t("library.desk")}>
        <Stat icon="bookmark" tone="success" label={t("library.toCollect")} value={ready.length} />
        <Stat icon="warning" tone={overdue.length ? "warn" : "neutral"} label={t("library.overdueTitle")} value={overdue.length} />
        <Stat icon="logout" tone="accent" label={t("library.outNow")} value={out.length} />
      </StatRow>
      <div className="grid gap-5 md:grid-cols-2">
        <Panel id="h-lend" title={t("library.lend")}>
          <SchoolForm action={lendBookAction} submit={t("library.lendButton")} reset>
            <Field id="f-lend-who" label={t("library.who")} name="who" hint={t("library.whoHint")} autoComplete="off" required />
            <Field id="f-lend-copy" label={t("library.copyCode")} name="copy" dir="ltr" autoComplete="off" required />
          </SchoolForm>
        </Panel>
        <Panel id="h-return" title={t("library.return")}>
          <SchoolForm action={returnBookAction} submit={t("library.returnButton")} reset>
            <Field id="f-return-copy" label={t("library.copyCode")} name="copy" dir="ltr" autoComplete="off" required />
          </SchoolForm>
        </Panel>
      </div>

      <Panel id="h-ready" title={t("library.toCollect")} intro={t("library.toCollectIntro")} flush>
        {ready.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("library.noneToCollect")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-ready>
          {ready.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
              <span className="min-w-0 flex-1 text-[15px]">
                <b>{title.get(h.bookId) ?? "—"}</b> · {person.get(h.personId)?.name ?? "—"}
              </span>
              <Badge tone="info">{t("library.readyUntil", { code: h.copyId ? (code.get(h.copyId) ?? "") : "", date: h.expiresAt ? day(h.expiresAt) : "" })}</Badge>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="h-overdue" title={t("library.overdueTitle")} flush>
        {overdue.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("library.noneOverdue")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-overdue>
          {overdue.map(loanRow)}
        </ul>
      </Panel>

      <Panel id="h-out" title={t("library.outNow")} flush>
        {out.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("library.noneOut")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-out>
          {out.map(loanRow)}
        </ul>
      </Panel>
    </div>
  );
}
