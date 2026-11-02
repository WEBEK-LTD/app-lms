import { notFound } from "next/navigation";
import { deleteArticleAction, setArticleFeaturedAction, setArticleStatusAction } from "@/app/actions/articles";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, PageHeader, Section } from "@/components/ui";
import { DetailLayout } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ArticleStatus } from "@/lib/data/types";
import { ARTICLE_AUTHOR_MAX, ARTICLE_BODY_MAX, ARTICLE_EXCERPT_MAX, ARTICLE_IMAGE_MAX_BYTES, ARTICLE_TITLE_MAX } from "@/lib/news/forms";
import { ArticleForm, type ArticleFormValues } from "./forms";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";

export function ArticleStatusBadge({ status, t }: { status: ArticleStatus; t: DashboardText["t"] }) {
  return status === "published" ? <Badge tone="success">{t("articles.publishedFilter")}</Badge> : <Badge tone="neutral">{t("articles.draft")}</Badge>;
}

/** 23 Writing (id null) or editing an article. */
export async function ArticlePage({ id, breaking }: { id: number | null; breaking?: string }) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "articles") notFound();
  const store = await getStore();
  const [article, categories] = await Promise.all([id !== null ? store.getArticle(app.id, id) : Promise.resolve(null), store.listArticleCategories(app.id)]);
  if (id !== null && !article) notFound();
  const values: ArticleFormValues = article
    ? {
        id: article.id,
        title: article.title,
        excerpt: article.excerpt ?? "",
        author: article.author ?? "",
        body: article.body,
        categoryIds: article.categoryIds,
        image: article.imageAssetId ? { url: assetUrl(article.imageAssetId) } : null,
        published: article.status === "published",
      }
    : { id: null, title: "", excerpt: "", author: "", body: "", categoryIds: [], image: null, published: false };
  const push = app.firebaseServiceAccountEncrypted !== null;
  const { t, k } = await dashboardText();
  const header = <PageHeader back={{ href: "/dashboard/articles", label: t("articles.title") }} title={article ? article.title : t("articles.newArticle")} />;
  const form = (
    <section aria-label={t("articles.article")} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5 sm:p-6">
      <ArticleForm
        article={values}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        limits={{ title: ARTICLE_TITLE_MAX, excerpt: ARTICLE_EXCERPT_MAX, author: ARTICLE_AUTHOR_MAX, body: ARTICLE_BODY_MAX, imageMb: ARTICLE_IMAGE_MAX_BYTES / 1024 / 1024 }}
        push={push}
      />
    </section>
  );
  const notice = breaking ? (
    <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
      {t("articles.publishedOnly", { status: k(breaking) })}
    </p>
  ) : null;
  if (!article) {
    return (
      <div className="flex max-w-[860px] flex-col gap-6">
        {/* The page kit: the header, then the form in its parts. */}
        {header}
        {notice}
        {form}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the form, and at the side where the article is. */}
      {header}
      {notice}
      <DetailLayout
        main={form}
        side={
          <Section
            titleId="h-status"
            title={t("articles.status")}
            actions={
              <>
                <ArticleStatusBadge status={article.status} t={t} />
                {article.featured ? <Badge tone="info">{t("articles.topStory")}</Badge> : null}
              </>
            }
          >
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">
              {article.status === "published"
                ? t(article.featured ? "articles.isPublishedTop" : "articles.isPublished")
                : t(article.featured ? "articles.isDraftTop" : "articles.isDraft")}
            </p>
            <div className="flex flex-col gap-2.5">
              {article.status === "published" ? (
                <form action={setArticleStatusAction}>
                  <input type="hidden" name="id" value={article.id} />
                  <input type="hidden" name="status" value="draft" />
                  <SubmitButton variant="secondary" className="h-10 w-full" pendingText={t("common.saving")}>
                    {t("articles.unpublish")}
                  </SubmitButton>
                </form>
              ) : (
                <form action={setArticleStatusAction} className="flex flex-col gap-2.5 rounded-xl bg-sand p-3.5">
                  <input type="hidden" name="id" value={article.id} />
                  <input type="hidden" name="status" value="published" />
                  <label className="flex cursor-pointer items-center gap-2 text-[15px]">
                    <input type="checkbox" name="breaking" className="h-4 w-4 accent-midnight" />
                    {t("articles.sendBreaking")}
                  </label>
                  <SubmitButton className="h-10 w-full" pendingText={t("articles.publishing")}>
                    {t("articles.publish")}
                  </SubmitButton>
                </form>
              )}
              <form action={setArticleFeaturedAction}>
                <input type="hidden" name="id" value={article.id} />
                <input type="hidden" name="featured" value={article.featured ? "off" : "on"} />
                <SubmitButton variant="secondary" className="h-10 w-full" pendingText={t("common.saving")}>
                  <Icon name="star" size={18} />
                  {article.featured ? t("articles.removeTop") : t("articles.makeTop")}
                </SubmitButton>
              </form>
              <form action={deleteArticleAction}>
                <input type="hidden" name="id" value={article.id} />
                <SubmitButton variant="danger" className="h-10 w-full" pendingText={t("common.deleting")}>
                  {t("common.delete")}
                </SubmitButton>
              </form>
            </div>
          </Section>
        }
      />
    </div>
  );
}
