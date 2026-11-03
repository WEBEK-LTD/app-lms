import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { returnLoanAction } from "@/app/actions/school-library";
import { Badge, btn } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { holdLive, isOverdue } from "@/lib/school/library";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { isSchool, NotSchool, PageHead, Panel } from "../../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("library.personHistory") };
}

/** 113.11 One person's library: the books they have out, what they borrowed before, and their holds. */
export default async function LibraryPersonPage({ params }: PageProps<"/dashboard/school/library/people/[id]">) {
  const { app } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("library.personHistory")} t={t} />;
  const id = Number((await params).id);
  const store = await getStore();
  const person = Number.isSafeInteger(id) ? await store.getSchoolPerson(app.id, id) : null;
  if (!person) notFound();
  const now = new Date();
  const [loans, holds, saved] = await Promise.all([
    store.listSchoolBookLoans(app.id, { personId: person.id, limit: 500 }),
    store.listSchoolBookHolds(app.id, { personId: person.id }),
    store.getSchoolSettings(app.id),
  ]);
  const bookIds = [...new Set([...loans.map((l) => l.bookId), ...holds.map((h) => h.bookId)])];
  const [books, copies] = await Promise.all([store.listSchoolBooks(app.id, { ids: bookIds }), store.listSchoolBookCopies(app.id, { bookIds })]);
  const title = new Map(books.map((b) => [b.id, b.title]));
  const code = new Map(copies.map((c) => [c.id, c.code]));
  const today = schoolToday(schoolSettingsOf(saved, app), now);
  const day = (d: Date | string) => formatDate(lang, typeof d === "string" ? new Date(`${d}T00:00:00Z`) : d);
  const current = loans.filter((l) => l.returnedAt === null);
  const past = loans.filter((l) => l.returnedAt !== null);
  const live = holds.filter((h) => holdLive(h, now));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={person.name} intro={t("library.personIntro", { out: current.length, total: loans.length })} back={{ href: "/dashboard/school/library/desk", label: t("library.desk") }} />

      <Panel id="h-person-out" title={t("library.outNow")} flush>
        {current.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("library.noneOut")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-person-out>
          {current.map((loan) => (
            <li key={loan.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link href={`/dashboard/school/library/${loan.bookId}`} className="text-[15px] font-semibold no-underline">
                  {title.get(loan.bookId) ?? "—"}
                </Link>
                <span className="text-[13px] text-muted">
                  <bdi dir="ltr">{code.get(loan.copyId) ?? ""}</bdi> · {t("library.lentOn", { date: day(loan.lentAt) })} · {t("library.dueOnDate", { date: day(loan.dueOn) })}
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
          ))}
        </ul>
      </Panel>

      <Panel id="h-person-holds" title={t("library.holds")} flush>
        {live.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("library.noHolds")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {live.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
              <span className="min-w-0 flex-1 text-[15px] font-semibold">{title.get(h.bookId) ?? "—"}</span>
              {h.status === "ready" && h.expiresAt ? (
                <Badge tone="info">{t("library.readyUntil", { code: h.copyId ? (code.get(h.copyId) ?? "") : "", date: day(h.expiresAt) })}</Badge>
              ) : (
                <Badge tone="neutral">{t("library.waitingSince", { date: day(h.createdAt) })}</Badge>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="h-person-history" title={t("library.history")} flush>
        {past.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("library.noLoans")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-person-history>
          {past.map((loan) => (
            <li key={loan.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
              <Link href={`/dashboard/school/library/${loan.bookId}`} className="min-w-0 flex-1 text-[15px] font-semibold no-underline">
                {title.get(loan.bookId) ?? "—"}
              </Link>
              <span className="text-[13px] text-muted">
                {t("library.lentOn", { date: day(loan.lentAt) })} · {t("library.returnedOn", { date: day(loan.returnedAt!) })}
                {loan.returnedAt && loan.returnedAt.toISOString().slice(0, 10) > loan.dueOn ? ` · ${t("library.returnedLate")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
