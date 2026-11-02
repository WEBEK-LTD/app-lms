import type { Metadata } from "next";
import Link from "next/link";
import { changeArticleCategoryAction } from "@/app/actions/articles";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, PageHeader, Section, btn } from "@/components/ui";
import { ItemRow, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { newsSettingsOf } from "@/lib/hosted/connectors/articles";
import { AddCategoryForm, NewsSettingsForm, RenameCategoryForm } from "./forms";
import { ArticleStatusBadge } from "./article-page";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("articles.title") };
}

/** 23 The articles of a News & blog app without a website, its sections and how articles show in the app. */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; published?: string; breaking?: string; deleted?: string } & SampleQuery>;
}) {
  const { app } = await requireClient("catalog");
  const { t, k, date } = await dashboardText();
  if (!app || app.connector?.kind !== "articles") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("articles.title")} description={richText(t("articles.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })} />
      </div>
    );
  }
  const query = await searchParams;
  const { saved, published, breaking, deleted } = query;
  const store = await getStore();
  const [all, categories, settings] = await Promise.all([store.listArticles(app.id), store.listArticleCategories(app.id), newsSettingsOf(store, app.id)]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const articles = [...all].sort((a, b) => (b.publishedAt ?? b.createdAt).getTime() - (a.publishedAt ?? a.createdAt).getTime() || b.id - a.id);
  const has = all.length > 0;
  const live = all.filter((a) => a.status === "published").length;
  const writeLink = (
    <Link href="/dashboard/articles/new" className={`${btn.main} h-11`}>
      <Icon name="add" size={20} />
      {t("articles.write")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its one main action, the numbers, the articles, then the sections and how they show. */}
      <PageHeader title={t("articles.title")} description={t("articles.intro")} actions={has ? writeLink : null} />

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

      {has ? (
        <StatRow label={t("articles.title")}>
          <Stat icon="newspaper" label={t("articles.statArticles")} value={all.length} />
          <Stat icon="check_circle" tone="success" label={t("articles.publishedFilter")} value={live} />
          <Stat icon="edit" tone="warn" label={t("articles.drafts")} value={all.length - live} />
          <Stat icon="star" tone="accent" label={t("articles.statFeatured")} value={all.filter((a) => a.featured).length} />
        </StatRow>
      ) : null}

      <Section titleId="h-articles" title={t("articles.count", { count: all.length })} flush>
        {has ? (
          <FilterList
            allLabel={t("articles.all")}
            searchLabel={t("articles.searchPlaceholder")}
            noMatch={t("articles.noMatch")}
            filters={[
              { value: "published", label: t("articles.publishedFilter") },
              { value: "draft", label: t("articles.drafts") },
            ]}
            items={articles.map((a, i) => ({
              id: a.id,
              text: [a.title, a.author, ...a.categoryIds.map((id) => names.get(id))].filter(Boolean).join(" "),
              group: a.status,
              node: (
                <ItemRow
                  href={`/dashboard/articles/${a.id}`}
                  media={<Thumb src={a.imageAssetId ? assetUrl(a.imageAssetId) : null} icon="newspaper" tint={i} />}
                  title={a.title}
                  badges={
                    <>
                      <SampleBadge sample={a.sample} />
                      {a.featured ? <Badge tone="info">{t("articles.topStory")}</Badge> : null}
                    </>
                  }
                  meta={[
                    a.publishedAt ? date(a.publishedAt) : t("articles.started", { date: date(a.createdAt) }),
                    a.author,
                    a.categoryIds
                      .map((id) => names.get(id))
                      .filter(Boolean)
                      .join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  aside={<ArticleStatusBadge status={a.status} t={t} />}
                />
              ),
            }))}
          />
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon="newspaper" title={t("articles.noArticles")} action={writeLink} />
          </div>
        )}
      </Section>

      <PageGroup title={t("articles.groupSettings")}>
        <div className="flex flex-wrap items-start gap-5">
          <Section id="sections" titleId="h-sections" title={t("articles.sections")} description={t("articles.sectionsText")} className="flex-[1_1_380px]">
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
          </Section>

          <Section titleId="h-news-settings" title={t("articles.inApp")} description={t("articles.inAppText")} className="flex-[1_1_320px]">
            <NewsSettingsForm settings={settings} />
          </Section>
        </div>
      </PageGroup>
    </div>
  );
}
