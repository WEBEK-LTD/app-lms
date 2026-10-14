import type { NewsSettings } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { excerptOf, plainText } from "./html";

/** 23 Checks of the dashboard's article, section and settings forms. */

export const ARTICLE_TITLE_MAX = 200;
export const ARTICLE_EXCERPT_MAX = 400;
export const ARTICLE_AUTHOR_MAX = 80;
export const ARTICLE_BODY_MAX = 100_000;
export const ARTICLE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ARTICLE_CATEGORY_NAME_MAX = 60;
export const ARTICLE_CATEGORIES_MAX = 30;

export interface ArticleFields {
  title: string;
  /** The summary as typed, or one made from the body. */
  excerpt: string | null;
  author: string | null;
  body: string;
  categoryIds: number[];
}

type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The article's fields from the form: text values and the ticked sections (only the app's own). */
export function parseArticleForm(values: Record<string, string>, categories: string[], known: Set<number>): Result<ArticleFields> {
  const v = (name: string) => (values[name] ?? "").trim();
  const errors: Record<string, string> = {};
  const title = v("title").replace(/\s+/g, " ");
  if (!title) errors.title = "Enter a title.";
  else if (title.length > ARTICLE_TITLE_MAX) errors.title = `Use at most ${ARTICLE_TITLE_MAX} characters.`;
  const excerpt = v("excerpt").replace(/\s+/g, " ");
  if (excerpt.length > ARTICLE_EXCERPT_MAX) errors.excerpt = `Use at most ${ARTICLE_EXCERPT_MAX} characters.`;
  const author = v("author").replace(/\s+/g, " ");
  if (author.length > ARTICLE_AUTHOR_MAX) errors.author = `Use at most ${ARTICLE_AUTHOR_MAX} characters.`;
  const body = (values.body ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body || !plainText(body)) errors.body = "Write the article.";
  else if (body.length > ARTICLE_BODY_MAX) errors.body = `Use at most ${ARTICLE_BODY_MAX.toLocaleString("en-GB")} characters.`;
  const categoryIds = [...new Set(categories.map(Number))].filter((id) => known.has(id));
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { title, excerpt: excerpt || excerptOf(plainText(body)), author: author || null, body, categoryIds },
  };
}

/** A section's name, or why it isn't valid. */
export function parseCategoryName(value: string, taken: string[]): { ok: true; value: string } | { ok: false; error: string } {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > ARTICLE_CATEGORY_NAME_MAX) return { ok: false, error: `Use at most ${ARTICLE_CATEGORY_NAME_MAX} characters.` };
  if (taken.some((t) => t.toLowerCase() === name.toLowerCase())) return { ok: false, error: "You already have a section with this name." };
  return { ok: true, value: name };
}

export function parseNewsSettings(values: Record<string, string>): NewsSettings {
  return { showAuthor: values.showAuthor === "on", showDates: values.showDates === "on" };
}

/** The push notification of breaking news: the article's title and summary, cut to what phones show. */
export function breakingNewsText(article: { title: string; excerpt: string | null; body: string }): { title: string; body: string } {
  const cut = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);
  const summary = article.excerpt ?? excerptOf(plainText(article.body), NOTIFICATION_BODY_MAX) ?? "";
  return { title: cut(article.title, NOTIFICATION_TITLE_MAX), body: cut(summary || article.title, NOTIFICATION_BODY_MAX) };
}
