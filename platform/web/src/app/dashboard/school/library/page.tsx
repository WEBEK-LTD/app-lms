import type { Metadata } from "next";
import Link from "next/link";
import { importBooksAction, saveBookAction, saveLibrarySettingsAction } from "@/app/actions/school-library";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { holdLive, LIBRARY_LIMITS, librarySettingsOf } from "@/lib/school/library";
import { BOOKS_CSV_EXAMPLE, bookFormValues } from "@/lib/school/library-forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { AddServiceBox } from "../../delivery/forms";
import { SchoolForm } from "../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { BookFields } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("library.title") };
}

const PER_PAGE = 50;

/** 113.11 The school's library: its books (searched, by category) with their copies on the shelf and out, a new book, books from a sheet, the library's days. */
export default async function SchoolLibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("library.title")} t={t} />;
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = (params.category ?? "").trim();
  const store = await getStore();
  const now = new Date();
  const [all, copies, open, holds, saved, plan] = await Promise.all([
    store.listSchoolBooks(app.id),
    store.listSchoolBookCopies(app.id),
    store.listSchoolBookLoans(app.id, { open: true }),
    store.listSchoolBookHolds(app.id, { statuses: ["waiting", "ready"] }),
    store.getSchoolSettings(app.id),
    appPlan(store, license, now),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const library = librarySettingsOf(settings);
  const shown = all.filter(
    (b) =>
      (!q || b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase()) || (b.isbn ?? "").includes(q.replace(/[\s-]/g, ""))) &&
      (!category || b.category === category),
  );
  const categories = [...new Set(all.map((b) => b.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const list = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const link = (p: number) => `/dashboard/school/library?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const today = schoolToday(settings, now);
  const overdue = open.filter((l) => l.dueOn < today).length;
  const ready = holds.filter((h) => h.status === "ready" && holdLive(h, now)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHead title={t("library.title")} intro={t("library.intro")} />
        <Link href="/dashboard/school/library/desk" className={`${btn.primary} h-10 gap-1.5 px-4 text-sm`}>
          <Icon name="qr_code_scanner" size={18} />
          {t("library.desk")}
        </Link>
      </div>
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      <p className="m-0 text-[15px] font-semibold">{t("library.counts", { books: all.length, copies: copies.length, out: open.length, overdue, ready })}</p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label={t("library.categories")} className="flex flex-wrap gap-1.5">
          {["", ...categories].map((c) => (
            <Link
              key={c || "all"}
              href={`/dashboard/school/library${c ? `?category=${encodeURIComponent(c)}` : ""}`}
              aria-current={c === category ? "page" : undefined}
              className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
                c === category ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
              }`}
            >
              {c || t("library.allBooks")}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex items-end gap-2">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <label htmlFor="f-q" className="sr-only">
            {t("library.search")}
          </label>
          <input id="f-q" name="q" type="search" defaultValue={q} placeholder={t("library.searchBooks")} className="input input-sm w-[220px]" />
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("library.search")}
          </button>
        </form>
      </div>

      <Panel id="h-books" title={t("library.books")}>
        {list.length === 0 ? <p className="m-0 text-[15px] text-muted">{all.length === 0 ? t("library.noBooks") : t("library.noMatch")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-books>
          {list.map((book) => {
            const mine = copies.filter((c) => c.bookId === book.id);
            const out = open.filter((l) => l.bookId === book.id).length;
            return (
              <li key={book.id} className="border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <Link href={`/dashboard/school/library/${book.id}`} className="flex items-center gap-3 text-inherit no-underline hover:[&_.name]:underline">
                  {book.coverAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the school's own picture
                    <img src={assetUrl(book.coverAssetId)} alt="" className="h-14 w-10 shrink-0 rounded border border-line object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid h-14 w-10 shrink-0 place-items-center rounded border border-line bg-sand text-midnight">
                      <Icon name="menu_book" size={20} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="name text-[15px] font-bold">{book.title}</span>
                    <span className="text-[13px] text-muted">
                      {[book.author, book.category, book.shelf ? t("library.shelfIs", { shelf: book.shelf }) : null, t("library.copiesLine", { copies: mine.length, out })].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {book.file ? <Badge tone="info">{t("library.ebookBadge")}</Badge> : null}
                </Link>
              </li>
            );
          })}
        </ul>
        {pages > 1 ? (
          <nav aria-label={t("library.pages")} className="flex items-center justify-between gap-3 text-[15px]">
            {page > 1 ? <Link href={link(page - 1)}>{t("library.previous")}</Link> : <span />}
            <span className="text-muted">{t("library.pageOf", { page, pages })}</span>
            {page < pages ? <Link href={link(page + 1)}>{t("library.next")}</Link> : <span />}
          </nav>
        ) : null}
        {all.length < LIBRARY_LIMITS.books ? (
          <AddServiceBox title={t("library.addBook")} open={all.length === 0}>
            <SchoolForm action={saveBookAction} submit={t("library.add")}>
              <BookFields suffix="-new" values={bookFormValues(null, "")} coverUrl={null} t={t} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="f-book-codes" className="text-sm font-semibold">
                    {t("library.copyCodes")}
                  </label>
                  <textarea id="f-book-codes" name="codes" rows={3} dir="ltr" className="input min-h-[84px] py-2" aria-describedby="f-book-codes-hint" />
                  <span id="f-book-codes-hint" className="text-[13px] text-muted">
                    {t("library.copyCodesHint")}
                  </span>
                </div>
                <Field id="f-book-count" label={t("library.copyCount")} name="count" type="number" min={0} max={LIBRARY_LIMITS.copiesPerBook} defaultValue="1" dir="ltr" hint={t("library.copyCountHint")} />
              </div>
            </SchoolForm>
          </AddServiceBox>
        ) : null}
      </Panel>

      <Panel id="h-import-books" title={t("library.importTitle")} intro={t("library.importIntro")}>
        <pre dir="ltr" className="m-0 overflow-x-auto rounded-xl bg-sand p-3 text-[13px] leading-relaxed">
          {BOOKS_CSV_EXAMPLE}
        </pre>
        <SchoolForm action={importBooksAction} submit={t("library.import")} reset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-books-file" className="text-sm font-semibold">
              {t("library.csvFile")}
            </label>
            <input id="f-books-file" type="file" name="file" accept=".csv,text/csv" className="text-sm" />
          </div>
        </SchoolForm>
      </Panel>

      <Panel id="h-library-settings" title={t("library.settings")} intro={t("library.settingsIntro")}>
        <SchoolForm action={saveLibrarySettingsAction} submit={t("library.save")}>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field id="f-loan-days" label={t("library.loanDays")} name="loanDays" type="number" min={1} max={LIBRARY_LIMITS.maxLoanDays} defaultValue={String(library.loanDays)} dir="ltr" />
            <Field id="f-hold-days" label={t("library.holdDays")} name="holdDays" type="number" min={1} max={LIBRARY_LIMITS.maxHoldDays} defaultValue={String(library.holdDays)} dir="ltr" />
            <Field id="f-max-loans" label={t("library.maxLoans")} name="maxLoans" type="number" min={1} max={LIBRARY_LIMITS.maxLoans} defaultValue={String(library.maxLoans)} dir="ltr" />
            <Field id="f-remind-days" label={t("library.remindDays")} name="remindDays" type="number" min={0} max={LIBRARY_LIMITS.maxRemindDays} defaultValue={String(library.remindDays)} dir="ltr" />
          </div>
        </SchoolForm>
      </Panel>
    </div>
  );
}
