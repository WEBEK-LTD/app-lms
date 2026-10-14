import type { DataStore } from "../../data/store";
import type { App, Article, ArticleCategory, NewsSettings } from "../../data/types";
import { DEFAULT_NEWS_SETTINGS, handleNews, newsConfig, type NewsArticle, type NewsSource } from "../../news/service";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface ArticlesDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
}

/** The app's news settings as saved, or the defaults. */
export async function newsSettingsOf(store: DataStore, appId: string): Promise<NewsSettings> {
  return { ...DEFAULT_NEWS_SETTINGS, ...((await store.getNewsSettings(appId)) ?? {}) };
}

/** An article written in the dashboard, as the News endpoints serve it. */
export function newsArticleOf(article: Article, categories: Map<number, ArticleCategory>, assetUrl: (id: string) => string): NewsArticle {
  return {
    id: String(article.id),
    title: article.title,
    excerpt: article.excerpt,
    author: article.author,
    publishedAt: article.publishedAt,
    imageUrl: article.imageAssetId ? assetUrl(article.imageAssetId) : null,
    categories: article.categoryIds
      .map((id) => categories.get(id))
      .filter((c): c is ArticleCategory => c !== undefined)
      .map((c) => ({ id: String(c.id), name: c.name })),
    url: null,
    featured: article.featured,
    body: article.body,
  };
}

/** Published articles, newest published first. */
export function publishedArticles(articles: Article[]): Article[] {
  return articles
    .filter((a) => a.status === "published")
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) || b.id - a.id);
}

/**
 * 23 News & blog apps without a website: the articles and categories
 * written on the dashboard's Articles page. Only published articles are
 * served; bodies are cleaned whenever they're served (lib/news/html.ts).
 */
export class ArticlesConnector implements Connector, NewsSource {
  constructor(private readonly deps: ArticlesDeps) {}

  async config() {
    // Breaking news is sent from the dashboard with the app's Firebase account (the hosted API adds the plan's push).
    return { news: newsConfig(await this.settings(), this.deps.app.firebaseServiceAccountEncrypted !== null) };
  }

  settings(): Promise<NewsSettings> {
    return newsSettingsOf(this.deps.store, this.deps.app.id);
  }

  async categories() {
    return (await this.deps.store.listArticleCategories(this.deps.app.id)).map((c) => ({ id: String(c.id), name: c.name }));
  }

  async articles(): Promise<NewsArticle[]> {
    const { store, app, assetUrl } = this.deps;
    const [articles, categories] = await Promise.all([store.listArticles(app.id), store.listArticleCategories(app.id)]);
    const byId = new Map(categories.map((c) => [c.id, c]));
    return publishedArticles(articles).map((a) => newsArticleOf(a, byId, assetUrl));
  }

  handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    return handleNews(this, request);
  }
}
