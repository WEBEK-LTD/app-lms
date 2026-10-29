import type { Metadata } from "next";
import Link from "next/link";
import { changeArticleCategoryAction } from "@/app/actions/articles";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { newsSettingsOf } from "@/lib/hosted/connectors/articles";
import { fold } from "@/lib/listings/search";
import { AddCategoryForm, NewsSettingsForm, RenameCategoryForm } from "./forms";
import { ArticleStatusBadge } from "./article-page";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("articles.title") };
}

const STATUS_FILTERS: { value: string; label: DashKey }[] = [
  { value: "all", label: "articles.all" },
  { value: "published", label: "articles.publishedFilter" },
  { value: "draft", label: "articles.drafts" },
];

/** 23 The articles of a News & blog app without a website, its sections and how articles show in the app. */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; saved?: string; published?: string; breaking?: string; deleted?: string } & SampleQuery>;
}) {
  const { app } = await requireClient("catalog");
  const { t, k, date } = await dashboardText();
  if (!app || app.connector?.kind !== "articles") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("articles.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("articles.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const query = await searchParams;
  const { q = "", status = "all", saved, published, breaking, deleted } = query;
  const store = await getStore();
  const [all, categories, settings] = await Promise.all([store.listArticles(app.id), store.listArticleCategories(app.id), newsSettingsOf(store, app.id)]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const words = fold(q.trim()).split(/\s+/).filter(Boolean);
  const articles = all
    .filter((a) => (status === "all" || a.status === status) && words.every((w) => fold(`${a.title} ${a.author ?? ""}`).includes(w)))
    .sort((a, b) => (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime() || b.id - a.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("articles.title")}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("articles.intro")}</p>
        </div>
        <Link href="/dashboard/articles/new" className={`${btn.primary} h-11`}>
          <Icon name="add" size={20} />
          {t("articles.write")}
        </Link>
      </div>

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {breaking
            ? t(published ? "articles.publishedBreaking" : "articles.savedBreaking", { title: saved, status: k(breaking) })
            : t(published ? "articles.published" : "articles.saved", { title: saved })}
        </p>
      ) : null}
      {deleted ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("articles.deleted", { title: deleted })}
        </p>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="articles" query={query} />

      <section aria-labelledby="h-articles" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-articles" className="m-0 text-lg font-bold">
          {t("articles.count", { count: all.length })}
        </h2>
        <form method="get" className="flex flex-wrap items-end gap-3" role="search">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <label htmlFor="f-q" className="text-sm font-semibold">
              {t("articles.search")}
            </label>
            <input id="f-q" name="q" type="search" defaultValue={q} placeholder={t("articles.searchPlaceholder")} className="input input-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-status" className="text-sm font-semibold">
              {t("articles.status")}
            </label>
            <select id="f-status" name="status" defaultValue={status} className="input input-sm">
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.label)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${btn.secondary} h-10`}>
            <Icon name="search" size={20} />
            {t("common.search")}
          </button>
        </form>
        {all.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("articles.noArticles")}</p>
        ) : articles.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("articles.noMatch")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {articles.map((a) => (
              <li key={a.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/articles/${a.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  {a.imageAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(a.imageAssetId)} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                      <Icon name="newspaper" size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{a.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {[
                        a.publishedAt ? date(a.publishedAt) : t("articles.started", { date: date(a.createdAt) }),
                        a.author,
                        a.categoryIds
                          .map((id) => names.get(id))
                          .filter(Boolean)
                          .join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <SampleBadge sample={a.sample} />
                  {a.featured ? <Badge tone="info">{t("articles.topStory")}</Badge> : null}
                  <ArticleStatusBadge status={a.status} t={t} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="sections" aria-labelledby="h-sections" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-sections" className="m-0 text-lg font-bold">
            {t("articles.sections")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("articles.sectionsText")}</p>
        </div>
        {categories.length ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {categories.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-end gap-2 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                <RenameCategoryForm category={{ id: c.id, name: c.name }} />
                <form action={changeArticleCategoryAction} className="flex gap-1">
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="secondary" className="h-10 w-10 px-0" name="op" value="up" disabled={i === 0} pendingText="…">
                    <Icon name="arrow_upward" size={18} />
                    <span className="sr-only">{t("articles.moveUp", { name: c.name })}</span>
                  </SubmitButton>
                  <SubmitButton variant="secondary" className="h-10 w-10 px-0" name="op" value="down" disabled={i === categories.length - 1} pendingText="…">
                    <Icon name="arrow_downward" size={18} />
                    <span className="sr-only">{t("articles.moveDown", { name: c.name })}</span>
                  </SubmitButton>
                  <SubmitButton variant="secondary" className="h-10 w-10 px-0 text-danger" name="op" value="delete" pendingText="…">
                    <Icon name="delete" size={18} />
                    <span className="sr-only">{t("articles.deleteName", { name: c.name })}</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
        <AddCategoryForm />
      </section>

      <section aria-labelledby="h-news-settings" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-news-settings" className="m-0 text-lg font-bold">
            {t("articles.inApp")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("articles.inAppText")}</p>
        </div>
        <NewsSettingsForm settings={settings} />
      </section>
    </div>
  );
}
