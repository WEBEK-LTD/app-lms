import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, ArticleInput } from "@/lib/data/types";
import { ArticlesConnector } from "@/lib/hosted/connectors/articles";
import { announce } from "@/lib/hosted/notify";
import { LogSender } from "@/lib/hosted/otp-sender";
import { emailSignInPossible } from "@/lib/hosted/sign-in-methods";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { breakingNewsText, parseArticleForm, parseCategoryName } from "@/lib/news/forms";
import { itemSourcesFor } from "@/lib/pages/sources";
import { expectContract } from "./contract";
import { NOW, days, setupClient } from "./helpers";

const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

function article(appId: string, overrides: Partial<ArticleInput>): ArticleInput {
  return {
    appId,
    title: "Article",
    excerpt: null,
    body: "<p>Text.</p>",
    imageAssetId: null,
    author: "Ayla Demir",
    categoryIds: [],
    featured: false,
    status: "published",
    publishedAt: NOW,
    ...overrides,
  };
}

describe("23 articles written in the dashboard, on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let ids: Record<string, number>;
  let city: number;
  let sport: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "news"), backend: "hosted", appName: "The Harbour Post", websiteDoneAt: NOW, connector: { kind: "articles" } };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    city = (await store.createArticleCategory({ appId: app.id, name: "City", position: 0, createdAt: NOW })).id;
    sport = (await store.createArticleCategory({ appId: app.id, name: "Sport", position: 1, createdAt: NOW })).id;
    await store.createArticleCategory({ appId: app.id, name: "Empty", position: 2, createdAt: NOW });
    ids = {};
    const add = async (key: string, input: Partial<ArticleInput>) => (ids[key] = (await store.createArticle(article(app.id, input), NOW)).id);
    await add("ferry", {
      title: "Night ferries return",
      excerpt: "Every 40 minutes.",
      body: '<p>Boats every 40 minutes.</p><iframe src="https://www.youtube.com/embed/abc" width="560" height="315" allowfullscreen></iframe><script>alert(1)</script><p><img src="https://cdn.test/a.jpg" alt="Boat"><img src="http://cdn.test/b.jpg"></p>',
      imageAssetId: "img-ferry",
      categoryIds: [city],
      featured: true,
      publishedAt: days(-1),
    });
    await add("match", { title: "A late goal", body: "First paragraph.\n\nSecond paragraph about the match.", categoryIds: [sport, city], publishedAt: days(-2) });
    await add("tram", { title: "Tram line 3 extends", categoryIds: [city], publishedAt: days(-3) });
    await add("draft", { title: "Secret draft", status: "draft", publishedAt: null, categoryIds: [sport] });
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: new ArticlesConnector({ store, app, assetUrl: ASSETS }),
    ...overrides,
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  it("sends Config.news, with breaking news only when push is set up and in the plan", async () => {
    const config = await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } });
    expect((config.body as { news: unknown }).news).toEqual({ show_author: true, show_dates: true, breaking_news_push: false });
    app = { ...app, firebaseServiceAccountEncrypted: "sealed" };
    const withPush = await handleHosted(context({ push: true }), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "ios", app_version: "1" }), body: null, token: null });
    expect((withPush.body as { news: { breaking_news_push: boolean } }).news.breaking_news_push).toBe(true);
  });

  it("serves the home screen: top stories, the latest without repeating them, and a rail per section", async () => {
    const home = await call("GET", "/news/home");
    const body = home.body as { featured: { id: string }[]; latest: { id: string }[]; rails: { category: { name: string; count: number }; articles: { id: string }[] }[] };
    expect(body.featured.map((a) => a.id)).toEqual([String(ids.ferry)]);
    expect(body.latest.map((a) => a.id)).toEqual([String(ids.match), String(ids.tram)]);
    expect(body.rails.map((r) => [r.category.name, r.category.count, r.articles.length])).toEqual([
      ["City", 3, 3],
      ["Sport", 1, 1],
    ]);
  });

  it("lists sections with published articles only", async () => {
    const categories = await call("GET", "/news/categories");
    expect(categories.body).toEqual({
      items: [
        { id: String(city), name: "City", count: 3 },
        { id: String(sport), name: "Sport", count: 1 },
      ],
    });
  });

  it("lists, filters, searches and pages articles; drafts never show", async () => {
    const all = await call("GET", "/news/articles");
    expect((all.body as { items: { title: string }[] }).items.map((a) => a.title)).toEqual(["Night ferries return", "A late goal", "Tram line 3 extends"]);
    const items = (r: HostedResult) => (r.body as { items: { id: string }[] }).items.map((a) => a.id);
    expect(items(await call("GET", "/news/articles", { query: { category: String(sport) } }))).toEqual([String(ids.match)]);
    expect(items(await call("GET", "/news/articles", { query: { search: "MATCH paragraph" } }))).toEqual([String(ids.match)]);
    expect(items(await call("GET", "/news/articles", { query: { search: "secret" } }))).toEqual([]);
    expect(items(await call("GET", "/news/articles", { query: { featured: "true" } }))).toEqual([String(ids.ferry)]);
    expect(items(await call("GET", "/news/articles", { query: { ids: `${ids.tram},${ids.draft},${ids.ferry}` } }))).toEqual([String(ids.tram), String(ids.ferry)]);
    const page2 = await call("GET", "/news/articles", { query: { per_page: "2", page: "2" } });
    expect(page2.body).toMatchObject({ page: 2, per_page: 2, total: 3, total_pages: 2 });
    expect(items(page2)).toEqual([String(ids.tram)]);
    expect((await call("GET", "/news/articles", { query: { search: "x".repeat(101) } })).status).toBe(400);
  });

  it("serves an article like a lesson: cleaned HTML with embed placeholders", async () => {
    const result = await call("GET", "/news/articles/{article_id}", { params: [String(ids.ferry)] });
    const body = result.body as { render_mode: string; html: string; embeds: { placeholder: string; provider: string; aspect_ratio: number; allow_fullscreen: boolean }[]; image_url: string; author: string; categories: { name: string }[]; url: null };
    expect(body).toMatchObject({ render_mode: "native", image_url: ASSETS("img-ferry"), author: "Ayla Demir", categories: [{ name: "City" }], url: null });
    expect(body.html).toContain('<div data-yallapp-embed="yallapp-embed-1"></div>');
    expect(body.html).toContain('<img src="https://cdn.test/a.jpg" alt="Boat">');
    expect(body.html).not.toContain("http://cdn.test");
    expect(body.html).not.toContain("script");
    expect(body.html).not.toContain("alert");
    expect(body.embeds).toEqual([
      { placeholder: "yallapp-embed-1", src: "https://www.youtube.com/embed/abc", provider: "youtube", width: "560", height: "315", aspect_ratio: 1.7778, allow_fullscreen: true },
    ]);
    const plain = await call("GET", "/news/articles/{article_id}", { params: [String(ids.match)] });
    expect((plain.body as { html: string; excerpt: string }).html).toBe("<p>First paragraph.</p><p>Second paragraph about the match.</p>");
    expect((plain.body as { excerpt: string }).excerpt).toBe("First paragraph. Second paragraph about the match.");
    expect((await call("GET", "/news/articles/{article_id}", { params: [String(ids.draft)] })).status).toBe(404);
    expect((await call("GET", "/news/articles/{article_id}", { params: ["999"] })).status).toBe(404);
  });

  it("hides authors when the owner turns them off", async () => {
    await store.saveNewsSettings(app.id, { showAuthor: false, showDates: true }, NOW);
    const result = await call("GET", "/news/articles");
    expect((result.body as { items: { author: string | null }[] }).items.every((a) => a.author === null)).toBe(true);
  });

  it("fills page list blocks with article cards that open in the app", async () => {
    await store.saveAppLayout({
      appId: app.id,
      draft: null,
      published: {
        version: "v1",
        tabs: [],
        pages: [
          {
            slug: "home",
            title: "Home",
            show_title: false,
            updated_at: NOW.toISOString(),
            blocks: [
              { id: "top", type: "items", visibility: "everyone", title: "Top stories", source: "articles", layout: "carousel", see_all: null, query: { category_id: null, featured: true, sort: "newest", limit: 5, ids: [] } },
              { id: "sport", type: "items", visibility: "everyone", title: "Sport", source: "articles", layout: "list", see_all: null, query: { category_id: String(sport), featured: false, sort: "newest", limit: 5, ids: [] } },
              { id: "sections", type: "categories", visibility: "everyone", title: "Sections", source: "articles", style: "chips" },
            ],
          },
        ],
        appearance: null,
        languages: { default: "en", available: ["en"] },
      },
      publishedAt: NOW,
      publishedBy: "test",
      updatedAt: NOW,
    } as never);
    const page = await call("GET", "/pages/{slug}", { params: ["home"], query: { platform: "android" } });
    const blocks = (page.body as { blocks: { id: string; items?: unknown[]; categories?: unknown[] }[] }).blocks;
    expect(blocks.find((b) => b.id === "top")?.items).toEqual([
      { source: "articles", id: String(ids.ferry), title: "Night ferries return", subtitle: "City", image_url: ASSETS("img-ferry"), price_label: null, badge: null, action: { type: "item", item: { source: "articles", id: String(ids.ferry) } } },
    ]);
    expect(blocks.find((b) => b.id === "sport")?.items).toHaveLength(1);
    expect(blocks.find((b) => b.id === "sections")?.categories).toEqual([
      { id: city, name: "City", count: 3 },
      { id: sport, name: "Sport", count: 1 },
    ]);
  });

  it("sends breaking news to the inbox and to phones that allow news", async () => {
    now = new Date(now.getTime() + 61_000);
    const device = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+905321234567")!, device } });
    const registered = await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Mona", device } });
    const token = (registered.body as { access_token: string }).access_token;
    expect((await call("PUT", "/me/push-token", { token, body: { token: "fcm-news", preferences: { announcements: true, news: true } } })).status).toBe(204);

    const pushed: { tokens: unknown[]; data: Record<string, string> }[] = [];
    const text = breakingNewsText({ title: "Night ferries return", excerpt: "Every 40 minutes.", body: "" });
    const sent = await announce({
      store,
      app,
      ...text,
      articleId: String(ids.ferry),
      account: { project_id: "p", client_email: "push@p.iam", private_key: "k" },
      now: new Date(now.getTime() + 1000),
      send: async (_account, tokens, message) => {
        pushed.push({ tokens, data: message.data ?? {} });
        return { sent: tokens.length, invalidTokens: [] };
      },
    });
    expect(sent.pushed).toBe(1);
    expect(pushed).toEqual([{ tokens: ["fcm-news"], data: { type: "article", article_id: String(ids.ferry), notification_id: String(sent.notification.id) } }]);
    now = new Date(now.getTime() + 2000);
    const inbox = await call("GET", "/me/notifications", { token });
    expect(inbox.body).toMatchObject({ items: [{ type: "article", article_id: String(ids.ferry), title: "Night ferries return", body: "Every 40 minutes." }] });

    // A phone that turned news off gets no breaking news, but still gets announcements.
    expect((await call("PUT", "/me/push-token", { token, body: { token: "fcm-news", preferences: { announcements: true, news: false } } })).status).toBe(204);
    pushed.length = 0;
    const send = async (_account: unknown, tokens: unknown[]) => {
      pushed.push({ tokens, data: {} });
      return { sent: tokens.length, invalidTokens: [] };
    };
    const account = { project_id: "p", client_email: "push@p.iam", private_key: "k" };
    await announce({ store, app, title: "Again", body: "News", articleId: String(ids.tram), account, now, send });
    await announce({ store, app, title: "Hello", body: "Announcement", account, now, send });
    expect(pushed.map((p) => p.tokens)).toEqual([[], ["fcm-news"]]);
  });
});

describe("23 article forms and rules", () => {
  it("checks articles and makes a summary when there's none", () => {
    const known = new Set([1, 2]);
    const ok = parseArticleForm({ title: "  A   title ", body: "<p>One <b>two</b> three.</p>", excerpt: "", author: "" }, ["1", "3", "1"], known);
    expect(ok).toEqual({ ok: true, value: { title: "A title", excerpt: "One two three.", author: null, body: "<p>One <b>two</b> three.</p>", categoryIds: [1] } });
    const bad = parseArticleForm({ title: "", body: "<p> </p>", excerpt: "x".repeat(401) }, [], known);
    expect(bad).toEqual({ ok: false, errors: { title: "Enter a title.", body: "Write the article.", excerpt: "Use at most 400 characters." } });
    expect(parseCategoryName("  Sport ", [])).toEqual({ ok: true, value: "Sport" });
    expect(parseCategoryName("sport", ["Sport"])).toMatchObject({ ok: false });
    const long = breakingNewsText({ title: "T".repeat(80), excerpt: null, body: `<p>${"word ".repeat(80)}</p>` });
    expect(long.title).toHaveLength(65);
    expect(long.body.length).toBeLessThanOrEqual(240);
  });

  it("lists articles in pages instead of blog posts, and keeps email sign-in with a feed", () => {
    expect(itemSourcesFor({ appType: "news", backend: "wordpress" })).toEqual(["articles"]);
    expect(itemSourcesFor({ appType: "news", backend: "hosted" })).toEqual(["articles"]);
    const rss = { backend: "hosted" as const, demo: false, connector: { kind: "platform" as const, platform: "rss", settings: {}, secretsEncrypted: "" } };
    expect(emailSignInPossible(rss)).toBe(true);
    expect(emailSignInPossible({ ...rss, connector: { kind: "articles" } })).toBe(true);
  });
});
