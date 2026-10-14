import type { DataStore } from "../../data/store";
import type { NewsSettings } from "../../data/types";
import { FeedError, feedUrlProblem, readFeed, type Feed } from "../../news/feed";
import { handleNews, newsConfig, type NewsArticle, type NewsSource } from "../../news/service";
import { newsSettingsOf } from "./articles";
import { registerPlatform, type PlatformConnector } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * 23 "Your site's RSS feed" for News & blog apps: the articles of any
 * website's RSS or Atom feed (lib/news/feed.ts), served with the News
 * endpoints. The feed is read at most every 5 minutes per server instance;
 * a feed that can't be read leaves the lists empty until it can.
 */

type Fetch = typeof fetch;

export const FEED_CACHE_MS = 5 * 60_000;

const cache = new Map<string, { at: number; feed: Feed }>();
/** Reads under way, so requests at the same moment share one. */
const reading = new Map<string, Promise<Feed>>();

/** For tests. */
export function clearFeedCache(): void {
  cache.clear();
  reading.clear();
}

export class FeedConnector implements PlatformConnector, NewsSource {
  constructor(
    private readonly feedUrl: string,
    private readonly deps: { appId: string; store: DataStore; fetcher: Fetch; resolve?: (host: string) => Promise<string[]>; now?: () => number },
  ) {}

  private async feed(fresh = false): Promise<Feed> {
    const now = (this.deps.now ?? Date.now)();
    const cached = cache.get(this.feedUrl);
    if (!fresh && cached && now - cached.at < FEED_CACHE_MS) return cached.feed;
    const pending = fresh ? undefined : reading.get(this.feedUrl);
    if (pending) return pending;
    const read = (async () => {
      try {
        const feed = await readFeed(this.feedUrl, { fetcher: this.deps.fetcher, resolve: this.deps.resolve });
        cache.set(this.feedUrl, { at: now, feed });
        if (cache.size > 500) cache.delete(cache.keys().next().value!);
        return feed;
      } catch (e) {
        throw new ConnectorError(e instanceof FeedError ? e.message : "The feed can't be read.");
      } finally {
        if (!fresh) reading.delete(this.feedUrl);
      }
    })();
    if (!fresh) reading.set(this.feedUrl, read);
    return read;
  }

  get siteHost(): string | null {
    try {
      return new URL(this.feedUrl).hostname;
    } catch {
      return null;
    }
  }

  async check(): Promise<string> {
    const feed = await this.feed(true);
    if (feed.articles.length === 0) throw new ConnectorError("The feed has no articles yet. Publish one on your website, then try again.");
    return feed.title;
  }

  async config() {
    // The feed can't tell the app when an article is new, so there's no breaking news push.
    return { news: newsConfig(await this.settings(), false) };
  }

  settings(): Promise<NewsSettings> {
    return newsSettingsOf(this.deps.store, this.deps.appId);
  }

  async articles(): Promise<NewsArticle[]> {
    return (await this.feed()).articles;
  }

  async categories() {
    return (await this.feed()).categories;
  }

  handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    return handleNews(this, request);
  }
}

registerPlatform({
  id: "rss",
  name: "RSS feed",
  appType: "news",
  summary: "Most websites have one: WordPress at /feed, Ghost at /rss, Blogger, Substack and Medium too. Articles show in the app a few minutes after they're on your site.",
  fields: [
    {
      name: "feedUrl",
      label: "Your site's RSS feed",
      hint: "The full address of your RSS or Atom feed, starting with https://",
      secret: false,
      placeholder: "https://your-news-site.com/feed",
    },
  ],
  normalize(values) {
    const feedUrl = (values.feedUrl ?? "").trim();
    const problem = feedUrlProblem(feedUrl);
    return problem ? { errors: { feedUrl: problem } } : { values: { feedUrl: new URL(feedUrl).toString() } };
  },
  create(values, deps) {
    return new FeedConnector(values.feedUrl ?? "", { appId: deps.appId, store: deps.store, fetcher: deps.fetcher });
  },
  explain(error) {
    return error instanceof ConnectorError ? `We couldn't read your feed: ${error.message}` : null;
  },
});
