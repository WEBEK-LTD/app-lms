import type { Metadata } from "next";
import Link from "next/link";
import { importBooksAction, saveBookAction, saveLibrarySettingsAction } from "@/app/actions/school-library";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, btn } from "@/components/ui";
import { ItemRow, PageGroup, Stat, StatRow } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { ChipLinks, ListBar, Pager, SearchForm } from "@/components/page-kit-c";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { holdLive, LIBRARY_LIMITS, librarySettingsOf } from "@/lib/school/library";
import { BOOKS_CSV_EXAMPLE, bookFormValues } from "@/lib/school/library-forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
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

  const canAdd = all.length < LIBRARY_LIMITS.books;
  const has = all.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the books by category, then the import and settings. */}
      <PageHead
        title={t("library.title")}
        intro={t("library.intro")}
        actions={
          <>
            <Link href="/dashboard/school/library/desk" className={`${btn.secondary} h-11 gap-1.5 px-4`}>
              <Icon name="qr_code_scanner" size={18} />
              {t("library.desk")}
            </Link>
            {has && canAdd ? (
              <SheetButton target="new-book" icon="add">
                {t("library.addBook")}
              </SheetButton>
            ) : null}
          </>
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {has ? (
        <StatRow label={t("library.counts", { books: all.length, copies: copies.length, out: open.length, overdue, ready })}>
          <Stat icon="menu_book" tone="accent" label={t("library.books")} value={all.length} hint={t("library.statCopies", { count: copies.length })} />
          <Stat icon="logout" label={t("library.statOut")} value={open.length} href="/dashboard/school/library/desk" />
          <Stat icon="warning" tone={overdue ? "warn" : "neutral"} label={t("library.statOverdue")} value={overdue} href="/dashboard/school/library/desk" />
          <Stat icon="bookmark" tone="success" label={t("library.statReady")} value={ready} href="/dashboard/school/library/desk" />
        </StatRow>
      ) : null}

      <Panel id="h-books" title={t("library.books")} flush>
        {has ? (
          <ListBar>
            <ChipLinks
              label={t("library.categories")}
              items={["", ...categories].map((c) => ({
                href: `/dashboard/school/library${c ? `?category=${encodeURIComponent(c)}` : ""}`,
                label: c || t("library.allBooks"),
                count: c ? all.filter((b) => b.category === c).length : all.length,
                current: c === category,
              }))}
            />
            <SearchForm label={t("library.search")} placeholder={t("library.searchBooks")} defaultValue={q} keep={category ? { category } : {}} button={t("library.search")} />
          </ListBar>
        ) : null}
        {list.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="menu_book" title={all.length === 0 ? t("library.noBooks") : t("library.noMatch")} />
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col p-0" data-books>
          {list.map((book) => {
            const mine = copies.filter((c) => c.bookId === book.id);
            const out = open.filter((l) => l.bookId === book.id).length;
            return (
              <ItemRow
                key={book.id}
                href={`/dashboard/school/library/${book.id}`}
                media={
                  book.coverAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- the school's own picture
                    <img src={assetUrl(book.coverAssetId)} alt="" className="h-14 w-10 shrink-0 rounded-md border border-line-soft object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid h-14 w-10 shrink-0 place-items-center rounded-md bg-tile-2 text-ink-3">
                      <Icon name="menu_book" size={20} />
                    </span>
                  )
                }
                title={book.title}
                badges={book.file ? <Badge tone="info">{t("library.ebookBadge")}</Badge> : null}
                meta={[book.author, book.category, book.shelf ? t("library.shelfIs", { shelf: book.shelf }) : null].filter(Boolean).join(" · ")}
                aside={<span className="rounded-full bg-sand px-2.5 py-1 text-xs font-bold text-ink-3">{t("library.copiesLine", { copies: mine.length, out })}</span>}
              />
            );
          })}
        </ul>
        {pages > 1 ? (
          <Pager
            label={t("library.pages")}
            prev={page > 1 ? { href: link(page - 1), label: t("library.previous") } : null}
            next={page < pages ? { href: link(page + 1), label: t("library.next") } : null}
            text={t("library.pageOf", { page, pages })}
          />
        ) : null}
      </Panel>

      {canAdd ? (
        // One place in the page either way, so the form that adds the first book keeps its message.
        <Sheet id="new-book" inline={!has} title={t("library.addBook")}>
          <SchoolForm action={saveBookAction} submit={t("library.add")} sheet>
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
        </Sheet>
      ) : null}

      <PageGroup title={t("library.groupMore")}>
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
      </PageGroup>
    </div>
  );
}
