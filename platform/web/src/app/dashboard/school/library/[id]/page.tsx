import type { Metadata } from "next";
import { DetailLayout } from "@/components/page-kit";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addCopiesAction, deleteBookAction, deleteCopyAction, returnLoanAction, saveBookAction } from "@/app/actions/school-library";
import { Field } from "@/components/form";
import { Badge, btn } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { bookShelf, holdLive, isOverdue, LIBRARY_LIMITS } from "@/lib/school/library";
import { bookFormValues } from "@/lib/school/library-forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../../chat/forms";
import { SchoolForm } from "../../forms";
import { AddSheet, isSchool, NotSchool, PageHead, Panel } from "../../parts";
import { BookFields } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("library.title") };
}

/** 113.11 A book: its details, cover and e-book, its copies with their codes (on the shelf, out, held), who reserved it, and its loans. */
export default async function LibraryBookPage({ params }: PageProps<"/dashboard/school/library/[id]">) {
  const { app } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("library.title")} t={t} />;
  const id = Number((await params).id);
  const store = await getStore();
  const book = Number.isSafeInteger(id) ? await store.getSchoolBook(app.id, id) : null;
  if (!book) notFound();
  const now = new Date();
  const [shelf, loans, holds, people, saved] = await Promise.all([
    bookShelf(store, app.id, book.id, now),
    store.listSchoolBookLoans(app.id, { bookId: book.id, limit: 200 }),
    store.listSchoolBookHolds(app.id, { bookId: book.id, statuses: ["waiting", "ready"] }),
    store.listSchoolPeople(app.id),
    store.getSchoolSettings(app.id),
  ]);
  const today = schoolToday(schoolSettingsOf(saved, app), now);
  const person = new Map(people.map((p) => [p.id, p]));
  const code = new Map(shelf.copies.map((c) => [c.id, c.code]));
  const day = (d: Date | string) => formatDate(lang, typeof d === "string" ? new Date(`${d}T00:00:00Z`) : d);
  const live = holds.filter((h) => holdLive(h, now));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={book.title} intro={`${book.author} · ${t("library.copiesLine", { copies: shelf.copies.length, out: shelf.onLoan.size })}`} back={{ href: "/dashboard/school/library", label: t("library.title") }} />

      {/* The page kit: the main parts beside a narrower side that goes below on phones. */}
      <DetailLayout
        main={
          <>
          <Panel id="h-copies" title={t("library.copies")} intro={t("library.copiesIntro")}>
            {shelf.copies.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("library.noCopies")}</p> : null}
            <ul className="m-0 flex list-none flex-col p-0" data-copies>
              {shelf.copies.map((copy) => {
                const loan = shelf.onLoan.get(copy.id);
                const held = shelf.heldFor.get(copy.id);
                return (
                  <li key={copy.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                    <bdi dir="ltr" className="min-w-0 flex-1 font-mono text-[15px] font-bold">
                      {copy.code}
                    </bdi>
                    {loan ? (
                      <Badge tone={isOverdue(loan, today) ? "danger" : "warn"}>{t("library.outTo", { name: person.get(loan.personId)?.name ?? "—", date: day(loan.dueOn) })}</Badge>
                    ) : held ? (
                      <Badge tone="info">{t("library.heldFor", { name: person.get(held.personId)?.name ?? "—" })}</Badge>
                    ) : (
                      <Badge tone="success">{t("library.onShelf")}</Badge>
                    )}
                    {loan ? null : (
                      <form action={deleteCopyAction}>
                        <input type="hidden" name="id" value={copy.id} />
                        <input type="hidden" name="bookId" value={book.id} />
                        <ConfirmButton confirm={t("library.deleteCopy", { code: copy.code })} className={`${btn.danger} h-8 px-3 text-sm`}>
                          {t("library.remove")}
                        </ConfirmButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            {shelf.copies.length < LIBRARY_LIMITS.copiesPerBook ? (
              <AddSheet title={t("library.addCopies")} inline={shelf.copies.length === 0}>
                <SchoolForm action={addCopiesAction} submit={t("library.add")} reset sheet>
                  <input type="hidden" name="bookId" value={book.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label htmlFor="f-copy-codes" className="text-sm font-semibold">
                        {t("library.copyCodes")}
                      </label>
                      <textarea id="f-copy-codes" name="codes" rows={3} dir="ltr" className="input min-h-[84px] py-2" aria-describedby="f-copy-codes-hint" />
                      <span id="f-copy-codes-hint" className="text-[13px] text-muted">
                        {t("library.copyCodesHint")}
                      </span>
                    </div>
                    <Field id="f-copy-count" label={t("library.copyCount")} name="count" type="number" min={1} max={LIBRARY_LIMITS.copiesPerBook} dir="ltr" hint={t("library.copyCountHint")} />
                  </div>
                </SchoolForm>
              </AddSheet>
            ) : null}
          </Panel>
          <Panel id="h-holds" title={t("library.holds")} intro={t("library.holdsIntro")}>
            {live.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("library.noHolds")}</p> : null}
            <ol className="m-0 flex list-none flex-col p-0">
              {live.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                  <Link href={`/dashboard/school/library/people/${h.personId}`} className="min-w-0 flex-1 text-[15px] font-semibold no-underline">
                    {person.get(h.personId)?.name ?? "—"}
                  </Link>
                  {h.status === "ready" && h.expiresAt ? (
                    <Badge tone="info">{t("library.readyUntil", { code: h.copyId ? (code.get(h.copyId) ?? "") : "", date: day(h.expiresAt) })}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("library.waitingSince", { date: day(h.createdAt) })}</Badge>
                  )}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel id="h-book" title={t("library.editBook")}>
            <SchoolForm action={saveBookAction} submit={t("library.save")}>
              <input type="hidden" name="id" value={book.id} />
              <BookFields suffix="" values={bookFormValues(book, book.file ? mediaLink(appUrl(), book.file.fileId) : "")} coverUrl={book.coverAssetId ? assetUrl(book.coverAssetId) : null} t={t} />
            </SchoolForm>
            <form action={deleteBookAction} className="flex justify-end">
              <input type="hidden" name="id" value={book.id} />
              <ConfirmButton confirm={t("library.deleteBook", { title: book.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                {t("library.deleteBookButton")}
              </ConfirmButton>
            </form>
          </Panel>
          </>
        }
        side={
          <>
          <Panel id="h-book-loans" title={t("library.loansOfBook")}>
            {loans.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("library.noLoans")}</p> : null}
            <ul className="m-0 flex list-none flex-col p-0" data-book-loans>
              {loans.map((loan) => (
                <li key={loan.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={`/dashboard/school/library/people/${loan.personId}`} className="text-[15px] font-semibold no-underline">
                      {person.get(loan.personId)?.name ?? "—"}
                    </Link>
                    <span className="text-[13px] text-muted">
                      {[code.get(loan.copyId), t("library.lentOn", { date: day(loan.lentAt) }), loan.returnedAt ? t("library.returnedOn", { date: day(loan.returnedAt) }) : t("library.dueOnDate", { date: day(loan.dueOn) })].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {loan.returnedAt === null ? (
                    <>
                      {isOverdue(loan, today) ? <Badge tone="danger">{t("library.overdue")}</Badge> : null}
                      <form action={returnLoanAction}>
                        <input type="hidden" name="id" value={loan.id} />
                        <button type="submit" className={`${btn.secondary} h-8 px-3 text-sm`}>
                          {t("library.markReturned")}
                        </button>
                      </form>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
          </>
        }
      />
    </div>
  );
}
