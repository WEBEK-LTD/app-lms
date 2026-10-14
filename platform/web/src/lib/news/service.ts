import type { NewsSettings } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { fold } from "../listings/search";
import { articleBody, excerptOf, plainText } from "./html";

/**
 * 23 The News endpoints of the hosted API (tag News in docs/api/openapi.yaml),
 * the same for articles written in the dashboard and articles read from a
 * feed: each source gives its published articles, newest first, and its
 * categories; this answers GET /news/home, /news/categories, /news/articles
 * and /news/articles/{id}.
 */

export interface NewsArticle {
  /** Digits only: the article's number, or a number made from a feed entry's ID. */
  id: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  publishedAt: Date | null;
  imageUrl: string | null;
  categories: { id: string; name: string }[];
  /** The article on the website, for sharing. */
  url: string | null;
  featured: boolean;
  /** As written or as the feed has it: cleaned when served. */
  body: string;
}

export interface NewsCategoryInfo {
  id: string;
  name: string;
}

export interface NewsSource {
  /** Published articles, newest first. */
  articles(): Promise<NewsArticle[]>;
  /** Categories, in their order. */
  categories(): Promise<NewsCategoryInfo[]>;
  settings(): Promise<NewsSettings>;
  /** The website's host, for embeds of the same site. */
  siteHost?: string | null;
}

export const DEFAULT_NEWS_SETTINGS: NewsSettings = { showAuthor: true, showDates: true };

export const HOME_FEATURED = 5;
export const HOME_LATEST = 20;
export const HOME_RAIL = 10;

/** `Config.news`. */
export function newsConfig(settings: NewsSettings, breakingNewsPush: boolean) {
  return { show_author: settings.showAuthor, show_dates: settings.showDates, breaking_news_push: breakingNewsPush };
}

export function articleSummaryJson(a: NewsArticle, settings: NewsSettings) {
  return {
    id: a.id,
    title: a.title,
    excerpt: a.excerpt ?? excerptOf(plainText(a.body)),
    author: settings.showAuthor ? a.author : null,
    published_at: a.publishedAt ? a.publishedAt.toISOString() : null,
    image_url: a.imageUrl,
    categories: a.categories.map((c) => ({ id: c.id, name: c.name })),
    url: a.url,
    featured: a.featured,
  };
}

export function articleJson(a: NewsArticle, settings: NewsSettings, siteHost: string | null = null) {
  return { ...articleSummaryJson(a, settings), ...articleBody(a.body, siteHost) };
}

/** Categories with published articles, with how many each has. */
export function categoriesWithCounts(categories: NewsCategoryInfo[], articles: NewsArticle[]): { id: string; name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const a of articles) for (const c of a.categories) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
  return categories.filter((c) => (counts.get(c.id) ?? 0) > 0).map((c) => ({ id: c.id, name: c.name, count: counts.get(c.id)! }));
}

/** GET /news/home: featured (or the newest), the latest without repeating them, and a rail per category. */
export function newsHome(articles: NewsArticle[], categories: NewsCategoryInfo[], settings: NewsSettings) {
  const flagged = articles.filter((a) => a.featured);
  const featured = (flagged.length ? flagged : articles).slice(0, HOME_FEATURED);
  const shown = new Set(featured.map((a) => a.id));
  const latest = articles.filter((a) => !shown.has(a.id)).slice(0, HOME_LATEST);
  const rails = categoriesWithCounts(categories, articles).map((category) => ({
    category,
    articles: articles
      .filter((a) => a.categories.some((c) => c.id === category.id))
      .slice(0, HOME_RAIL)
      .map((a) => articleSummaryJson(a, settings)),
  }));
  return {
    featured: featured.map((a) => articleSummaryJson(a, settings)),
    latest: latest.map((a) => articleSummaryJson(a, settings)),
    rails,
  };
}

/** The articles GET /news/articles asks for, or why the request isn't valid. */
export function filterArticles(articles: NewsArticle[], query: URLSearchParams): NewsArticle[] | { error: string } {
  const search = (query.get("search") ?? "").trim();
  if (search.length > 100) return { error: "Search for up to 100 characters." };
  const category = (query.get("category") ?? "").trim();
  const ids = (query.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length > 30) return { error: "Ask for up to 30 articles at a time." };
  if (ids.length) {
    const byId = new Map(articles.map((a) => [a.id, a]));
    return ids.map((id) => byId.get(id)).filter((a): a is NewsArticle => a !== undefined);
  }
  const words = fold(search).split(/\s+/).filter(Boolean);
  const featured = query.get("featured") === "true";
  return articles.filter(
    (a) =>
      (!category || a.categories.some((c) => c.id === category)) &&
      (!featured || a.featured) &&
      (words.length === 0 || words.every((w) => fold(`${a.title} ${a.excerpt ?? ""} ${plainText(a.body)}`).includes(w))),
  );
}

/** Answers the News endpoints from a source, or null for other paths. */
export async function handleNews(source: NewsSource, request: ConnectorRequest): Promise<ConnectorResult | null> {
  if (request.method !== "GET" || request.path[0] !== "news") return null;
  const route = request.path.slice(1);
  if (route.length === 1 && route[0] === "home") {
    const [articles, categories, settings] = await Promise.all([source.articles(), source.categories(), source.settings()]);
    return { status: 200, body: newsHome(articles, categories, settings) };
  }
  if (route.length === 1 && route[0] === "categories") {
    const [articles, categories] = await Promise.all([source.articles(), source.categories()]);
    return { status: 200, body: { items: categoriesWithCounts(categories, articles) } };
  }
  if (route.length === 1 && route[0] === "articles") {
    const [articles, settings] = await Promise.all([source.articles(), source.settings()]);
    const found = filterArticles(articles, request.query);
    if ("error" in found) return error(400, "invalid_request", found.error);
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: found.length,
        total_pages: Math.max(1, Math.ceil(found.length / perPage)),
        items: found.slice((page - 1) * perPage, page * perPage).map((a) => articleSummaryJson(a, settings)),
      },
    };
  }
  if (route.length === 2 && route[0] === "articles") {
    const id = route[1]!;
    const [articles, settings] = await Promise.all([source.articles(), source.settings()]);
    const article = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? articles.find((a) => a.id === id) : undefined;
    if (!article) return error(404, "not_found", "Article not found.");
    return { status: 200, body: articleJson(article, settings, source.siteHost ?? null) };
  }
  return null;
}
