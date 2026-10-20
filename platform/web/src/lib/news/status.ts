import type { DataStore } from "../data/store";
import type { Article, ArticleStatus } from "../data/types";

/**
 * Publishing or unpublishing an article, for Dashboard › Articles and 58
 * the Owner API: the first publication keeps its date. Returns the patch
 * made, or null when nothing changed.
 */
export async function changeArticleStatus(store: DataStore, article: Article, status: unknown, now: Date): Promise<Partial<Article> | null> {
  if ((status !== "published" && status !== "draft") || article.status === status) return null;
  const patch = { status: status as ArticleStatus, ...(status === "published" && !article.publishedAt ? { publishedAt: now } : {}) };
  await store.updateArticle(article.appId, article.id, patch, now);
  return patch;
}
