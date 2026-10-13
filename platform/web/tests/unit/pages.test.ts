import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { suspendClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_RULES, type App, type AppType, type CourseSetup } from "@/lib/data/types";
import { BookingsConnector } from "@/lib/hosted/connectors/bookings";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { registerItemSource, unregisterItemSource } from "@/lib/hosted/pages/items";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { cleanBlockHtml } from "@/lib/pages/html";
import { discardDraft, hasUnpublishedChanges, layoutVersion, loadLayout, lookAndLanguages, publishLayout, saveDraft } from "@/lib/pages/layout";
import { duplicatePage, renamePageLinks, switchDefaultLanguage, textIn, uniqueSlug, withText } from "@/lib/pages/model";
import { pluginLayout } from "@/lib/pages/plugin";
import { pickLanguage, translated } from "@/lib/pages/translate";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import type { LayoutBlock, LayoutContent } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { expectContract } from "./contract";
import { NOW, days, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

// Each test has its own store; the settings cache is per process.
beforeEach(() => clearPlatformSettingsCache());

const lmsHosted = { appType: "lms" as AppType, backend: "hosted" as const };
const storeWp = { appType: "store" as AppType, backend: "wordpress" as const };

function layoutWith(blocks: unknown[], extra: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    appearance: { template: "bold", theme_mode: "dark", user_can_change_mode: false, secondary_color: "#e8b04b", font: "Outfit", corners: "round", cards: "elevated" },
    languages: { default: "en", available: ["en", "ar"] },
    tabs: [
      { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" }, translations: { ar: { label: "الرئيسية" } } },
      { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
    ],
    pages: [{ slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), translations: { ar: { title: "الرئيسية" } }, blocks }],
    ...extra,
  };
}

function parse(value: unknown, app: { appType: AppType; backend: App["backend"] } = lmsHosted) {
  return parseLayoutContent(value, { app, now: NOW });
}

function errorsOf(value: unknown, app: { appType: AppType; backend: App["backend"] } = lmsHosted): string[] {
  const result = parse(value, app);
  return result.ok ? [] : result.errors;
}

describe("block HTML", () => {
  it("keeps simple formatting and links, drops everything else", () => {
    expect(cleanBlockHtml('<p onclick="x()">Hi <b>there</b> <a href="https://a.test/x" target="_blank" style="color:red">link</a></p>')).toBe(
      '<p>Hi <b>there</b> <a href="https://a.test/x">link</a></p>',
    );
    expect(cleanBlockHtml('<script>alert(1)</script><p>ok</p><style>p{}</style><iframe src="x"></iframe>')).toBe("<p>ok</p>");
    expect(cleanBlockHtml('<a href="javascript:alert(1)">x</a><a href="jav&#x61;script:alert(1)">y</a>')).toBe("<a>x</a><a>y</a>");
    expect(cleanBlockHtml("<img src=x onerror=alert(1)><div>Text</div> 1 < 2 & 3")).toBe("Text 1 &lt; 2 &amp; 3");
    expect(cleanBlockHtml("<ul><li>One<li>Two</ul><p>Open")).toBe("<ul><li>One<li>Two</li></li></ul><p>Open</p>");
    expect(cleanBlockHtml("Plain &amp; simple &copy;")).toBe("Plain &amp; simple &copy;");
  });
});

describe("layout validation", () => {
  it("accepts every default layout", () => {
    for (const [appType, backend] of [
      ["lms", "hosted"],
      ["lms", "wordpress"],
      ["store", "hosted"],
      ["store", "wordpress"],
      ["booking", "hosted"],
      ["real_estate", "hosted"],
    ] as const) {
      const app = { ...newApp("c", null, NOW, appType as AppType), backend };
      const result = parse(defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), app);
      expect(result.ok, `${appType} ${backend}: ${JSON.stringify(result)}`).toBe(true);
    }
  });

  it("rebuilds blocks from known fields and cleans their HTML", () => {
    const result = parse(
      layoutWith([
        { id: "t1", type: "text", visibility: "everyone", html: "<p>Hello<script>x</script></p>", extra: "dropped", translations: { ar: { html: "<p>مرحبا</p><script>x</script>", bogus: "x" }, de: { html: "Hallo" } } },
        { id: "b1", type: "button", visibility: "signed_out", label: " Sign up ", style: "filled", icon: "person", action: { type: "url", url: "https://academy.test/join", open_in: "browser", junk: 1 } },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [text, button] = result.value.pages[0]!.blocks;
    expect(text).toEqual({ id: "t1", type: "text", visibility: "everyone", title: null, html: "<p>Hello</p>", translations: { ar: { html: "<p>مرحبا</p>" } } });
    expect(button).toMatchObject({ label: "Sign up", action: { type: "url", url: "https://academy.test/join", open_in: "browser" } });
    expect(button!.action).not.toHaveProperty("junk");
    expect(result.value.appearance.secondary_color).toBe("#E8B04B");
  });

  it("explains what's wrong", () => {
    expect(errorsOf(layoutWith([], { tabs: [{ id: "a", label: "A", icon: "home", target: { type: "screen", screen: "account" } }] }))).toContain("Tabs: the app needs 2 to 5 tabs.");
    const sixTabs = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, label: "Tab", icon: "home", target: { type: "screen", screen: "account" } }));
    expect(errorsOf(layoutWith([], { tabs: sixTabs }))).toContain("Tabs: the app needs 2 to 5 tabs.");
    expect(errorsOf(layoutWith([], { tabs: [sixTabs[0], { ...sixTabs[1], icon: "Home Icon!" }] }))).toContain("Tab 2: choose an icon.");
    expect(errorsOf(layoutWith([], { tabs: [sixTabs[0], { ...sixTabs[1], target: { type: "page", page_slug: "missing" } }] }))).toContain("Tab 2: choose a page that exists.");
    const twice = layoutWith([]);
    twice.pages = [...(twice.pages as unknown[]), { slug: "home", title: "Again", show_title: true, blocks: [] }];
    expect(errorsOf(twice).join(" ")).toContain("another page already has the address home");
    expect(errorsOf(layoutWith([], { pages: [{ slug: "Bad Slug", title: "X", show_title: true, blocks: [] }], tabs: sixTabs.slice(0, 2) })).join(" ")).toContain("the address must be");
    expect(errorsOf(layoutWith([{ id: "x", type: "banner", visibility: "everyone", image_url: "http://insecure.test/a.png" }]))).toEqual([
      'Page "Home", block 1 (Banner): an image address must be a full https address.',
    ]);
    expect(errorsOf(layoutWith([{ id: "x", type: "button", visibility: "everyone", label: "Go", style: "filled", action: { type: "url", url: "javascript:alert(1)" } }]))).toEqual([
      'Page "Home", block 1 (Button): enter a full web address starting with https://.',
    ]);
    expect(errorsOf(layoutWith([{ id: "x", type: "marquee", visibility: "everyone" }]))[0]).toContain("this kind of block isn't available");
    // Products aren't in an Academy app; posts aren't on the hosted API; listings are Real estate only.
    for (const source of ["products", "posts", "listings"]) {
      expect(errorsOf(layoutWith([{ id: "x", type: "items", visibility: "everyone", source, layout: "grid", query: { limit: 5 } }]))).toEqual([
        'Page "Home", block 1 (List): choose what the list shows.',
      ]);
    }
    expect(errorsOf(layoutWith([{ id: "x", type: "items", visibility: "everyone", source: "posts", layout: "grid", query: { limit: 5 } }]), { appType: "lms", backend: "wordpress" })).toEqual([]);
    expect(errorsOf(layoutWith([{ id: "x", type: "items", visibility: "everyone", source: "courses", layout: "grid", query: { limit: 31 } }]))[0]).toContain("show 1 to 30 entries");
    expect(errorsOf(layoutWith([{ id: "x", type: "continue_learning", visibility: "signed_in" }]), storeWp)[0]).toContain("Continue learning blocks aren't available");
    const many = Array.from({ length: 41 }, (_, i) => ({ id: `s${i}`, type: "spacer", visibility: "everyone", size: "small" }));
    expect(errorsOf(layoutWith(many))).toContain('Page "Home": a page can have at most 40 blocks.');
    expect(errorsOf(layoutWith([{ id: "s", type: "spacer", visibility: "everyone", size: "small" }, { id: "s", type: "spacer", visibility: "everyone", size: "small" }]))).toContain(
      'Page "Home", block 2: two blocks have the same ID.',
    );
    expect(errorsOf(layoutWith([], { appearance: { template: "fancy" } })).length).toBeGreaterThan(3);
  });
});

describe("languages", () => {
  const languages = { default: "en" as const, available: ["en" as const, "ar" as const] };

  it("picks the app's language from Accept-Language", () => {
    expect(pickLanguage("ar", languages)).toBe("ar");
    expect(pickLanguage("ar-EG,ar;q=0.9,en;q=0.8", languages)).toBe("ar");
    expect(pickLanguage("tr-TR, en;q=0.5", languages)).toBe("en");
    expect(pickLanguage("en;q=0.2, ar;q=0.9", languages)).toBe("ar");
    expect(pickLanguage("ar;q=0", languages)).toBe("en");
    expect(pickLanguage(null, languages)).toBe("en");
    expect(pickLanguage("de", { default: "tr", available: ["tr"] })).toBe("tr");
  });

  it("uses translations and falls back to the default text", () => {
    const block: LayoutBlock = { id: "b", type: "banner", visibility: "everyone", heading: "Welcome", subheading: "Learn", image_url: "https://a.test/x.png", translations: { ar: { heading: "أهلا" } } };
    expect(translated(block, "ar", "en")).toEqual({ id: "b", type: "banner", visibility: "everyone", heading: "أهلا", subheading: "Learn", image_url: "https://a.test/x.png" });
    expect(translated(block, "en", "en")).toMatchObject({ heading: "Welcome" });
    expect(translated(block, "tr", "en")).toMatchObject({ heading: "Welcome" });
  });

  it("edits per language and swaps texts when the default changes", () => {
    let block: LayoutBlock = { id: "b", type: "text", visibility: "everyone", html: "<p>Hello</p>" };
    block = withText(block, "html", "<p>مرحبا</p>", "ar", "en");
    expect(textIn(block, "html", "ar", "en")).toBe("<p>مرحبا</p>");
    expect(withText(block, "html", "", "ar", "en")).not.toHaveProperty("translations");
    const layout = parse(layoutWith([block]));
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    const arabic = switchDefaultLanguage(layout.value, "ar");
    expect(arabic.languages).toEqual({ default: "ar", available: ["ar", "en"] });
    expect(arabic.pages[0]).toMatchObject({ title: "الرئيسية", translations: { en: { title: "Home" } } });
    expect(arabic.pages[0]!.blocks[0]).toMatchObject({ html: "<p>مرحبا</p>", translations: { en: { html: "<p>Hello</p>" } } });
    expect(arabic.tabs[1]).toMatchObject({ label: "Account", translations: { en: { label: "Account" } } });
    expect(switchDefaultLanguage(arabic, "en").pages[0]).toMatchObject({ title: "Home", translations: { ar: { title: "الرئيسية" } } });
  });
});

describe("editing pages", () => {
  it("makes unique addresses, copies pages and follows renamed ones", () => {
    expect(uniqueSlug("Our Courses!", ["home"])).toBe("our-courses");
    expect(uniqueSlug("Home", ["home", "home-2"])).toBe("home-3");
    expect(uniqueSlug("Çalışma Saatleri", [])).toBe("calisma-saatleri");
    expect(uniqueSlug("مرحبا", [])).toBe("page");
    const app = { ...newApp("c", null, NOW, "lms"), backend: "hosted" as const };
    const layout = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
    const copy = duplicatePage(layout.pages[0]!, ["home"], NOW);
    expect(copy).toMatchObject({ slug: "home-copy", title: "Home (copy)" });
    expect(copy.blocks.map((b) => b.id)).not.toEqual(layout.pages[0]!.blocks.map((b) => b.id));
    const renamed = renamePageLinks(layout, "home", "start");
    expect(renamed.pages[0]!.slug).toBe("start");
    expect(renamed.tabs[0]!.target).toEqual({ type: "page", page_slug: "start" });
  });
});

describe("drafts and publishing", () => {
  it("starts from the defaults, saves drafts and publishes new versions", async () => {
    const { store, client } = await setupClient();
    const app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted" as const, appName: "Lale Academy" };
    await store.createApp(app);
    await store.setPlatformSetting(
      "appDefaults",
      { appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, template: "minimal", corners: "sharp" }, languages: { default: "en", available: ["en", "tr"] } },
      "admin@yallapp.test",
      NOW,
    );
    clearPlatformSettingsCache();
    const first = await loadLayout(store, app, NOW);
    expect(first.draft.appearance).toMatchObject({ template: "minimal", corners: "sharp", secondary_color: null });
    expect(first.draft.languages).toEqual({ default: "en", available: ["en", "tr"] });
    expect(first.draft.pages[0]!.blocks[0]).toMatchObject({ type: "text", html: "<h2>Welcome to Lale Academy</h2>" });
    expect(first.published).toBeNull();
    expect((await lookAndLanguages(store, app)).appearance.template).toBe("minimal");

    const later = days(1);
    const edited = { ...first.draft, pages: [{ ...first.draft.pages[0]!, title: "Start" }, { slug: "about", title: "About", show_title: true, updated_at: NOW.toISOString(), blocks: [] }] };
    const saved = await saveDraft(store, app, edited, later);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.draft.pages.map((p) => p.updated_at)).toEqual([later.toISOString(), later.toISOString()]);
    expect((await saveDraft(store, app, { ...edited, tabs: [] }, later)).ok).toBe(false);

    const published = await publishLayout(store, app, undefined, "owner@lale.test", days(2));
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    expect(published.value.published?.version).toBe(layoutVersion(days(2), 1));
    expect(published.value.published?.version).toBe("2026-10-14T10:00:00Z.1");
    expect(hasUnpublishedChanges(published.value)).toBe(false);
    // An unchanged page keeps its time.
    expect(published.value.published!.pages[1]!.updated_at).toBe(later.toISOString());

    await saveDraft(store, app, { ...published.value.draft, appearance: { ...published.value.draft.appearance, template: "bold" } }, days(3));
    expect(hasUnpublishedChanges((await store.getAppLayout(app.id))!)).toBe(true);
    expect((await lookAndLanguages(store, app)).appearance.template).toBe("minimal");
    const discarded = await discardDraft(store, app, days(3));
    expect(discarded.draft.appearance.template).toBe("minimal");
    expect(hasUnpublishedChanges(discarded)).toBe(false);
    const again = await publishLayout(store, app, discarded.draft, "owner@lale.test", days(4));
    expect(again.ok && again.value.published?.version).toBe("2026-10-16T10:00:00Z.2");
  });
});

describe("POST /apps/layout", () => {
  async function setup() {
    const { store, client, licenseKey } = await setupClient();
    const site = (url = "https://academy.test") => {
      const parsed = parseSiteInfo({ license_key: licenseKey, site_url: url, plugin_version: "0.3.0" });
      if (!parsed.ok) throw new Error("bad site");
      return parsed.value;
    };
    await activateLicense(store, site(), NOW);
    const app = newApp(client.id, "https://academy.test", NOW, "lms");
    await store.createApp(app);
    return { store, client, app, site };
  }

  it("answers 204, then 200 with the layout, then 304 for the same version", async () => {
    const { store, app, site } = await setup();
    const nothing = await pluginLayout(store, site(), null, NOW);
    expect(nothing.status).toBe(204);
    expectPlatformContract("POST", "/apps/layout", nothing);

    const blocks = [
      { id: "posts", type: "items", visibility: "everyone", title: "From the blog", source: "posts", layout: "list", query: { limit: 5, sort: "newest" } },
      { id: "courses", type: "items", visibility: "everyone", source: "courses", layout: "carousel", query: { ids: ["12", "7"], limit: 2 } },
    ];
    expect((await publishLayout(store, app, layoutWith(blocks), "owner@academy.test", NOW)).ok).toBe(true);
    const result = await pluginLayout(store, site(), null, NOW);
    expect(result.status).toBe(200);
    expectPlatformContract("POST", "/apps/layout", result);
    if (result.status !== 200) return;
    expect(result.etag).toBe(result.body.version);
    expect(result.body.pages[0]!.blocks[1]).toMatchObject({ query: { ids: ["12", "7"], category_id: null, featured: false, sort: "newest", limit: 2 } });
    expect(result.body.tabs[0]!.translations).toEqual({ ar: { label: "الرئيسية" } });

    expect((await pluginLayout(store, site(), `"${result.body.version}"`, NOW)).status).toBe(304);
    expect((await pluginLayout(store, site(), `W/"other", ${result.body.version}`, NOW)).status).toBe(304);
    expect((await pluginLayout(store, site(), '"2020-01-01T00:00:00Z.1"', NOW)).status).toBe(200);
  });

  it("refuses other sites and inactive licenses", async () => {
    const { store, client, site } = await setup();
    const other = await pluginLayout(store, site("https://other.test"), null, NOW);
    expect(other.status).toBe(403);
    expectPlatformContract("POST", "/apps/layout", other);
    await suspendClient(store, client.id, NOW);
    expect((await pluginLayout(store, site(), null, NOW)).status).toBe(403);
    const parsed = parseSiteInfo({ license_key: "YALL-2222-3333-4444", site_url: "https://academy.test", plugin_version: "0.3.0" });
    if (!parsed.ok) throw new Error("bad site");
    const unknown = await pluginLayout(store, parsed.value, null, NOW);
    expect(unknown.status).toBe(404);
    expectPlatformContract("POST", "/apps/layout", unknown);
    expect((await pluginLayout(store, site(), null, days(60))).status).toBe(403);
  });
});

function academy(): CourseSetup {
  return {
    currency: "TRY",
    categories: [{ id: 1, name: "Languages" }],
    courses: [
      {
        id: 10,
        title: "Turkish for Beginners",
        description: "",
        imageAssetId: "img-tr",
        priceCents: 0,
        categoryIds: [1],
        instructorName: "Selin Arslan",
        level: null,
        active: true,
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [
          {
            id: 11,
            title: "Hello",
            lessons: [
              { id: 12, title: "Greetings", videoUrl: null, text: "Merhaba!", durationMinutes: 8, preview: true },
              { id: 13, title: "Numbers", videoUrl: null, text: "Bir.", durationMinutes: 5, preview: false },
            ],
          },
        ],
      },
      {
        id: 20,
        title: "Business English",
        description: "",
        imageAssetId: null,
        priceCents: 45000,
        categoryIds: [1],
        instructorName: null,
        level: null,
        active: true,
        createdAt: "2026-10-05T10:00:00.000Z",
        topics: [],
      },
    ],
    nextId: 40,
  };
}

describe("pages on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", appName: "Lale Academy", connector: { kind: "courses" }, courseSetup: academy() };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
  });

  afterEach(() => unregisterItemSource("listings"));

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl,
    platformUrl: "https://yallapp.test",
    connector:
      app.connector?.kind === "courses"
        ? new CoursesConnector({ store, app, assetUrl, platformUrl: "https://yallapp.test" })
        : app.connector?.kind === "bookings"
          ? new BookingsConnector({ store, app, assetUrl })
          : null,
  });

  async function call(route: string, options: { params?: string[]; token?: string; headers?: Record<string, string>; query?: Record<string, string> } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method: "GET",
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? { platform: "android" }),
      body: undefined,
      token: options.token ?? null,
      headers: new Headers(options.headers ?? {}),
    });
    if (result.status !== 304) expectContract("GET", route, result);
    return result;
  }

  async function signUp(): Promise<string> {
    now = new Date(now.getTime() + 61_000);
    const ctx = () => context();
    const request = await handleHosted(ctx(), { method: "POST", path: ["auth", "otp", "request"], query: new URLSearchParams(), body: { country_code: "+90", phone: "5321234567" }, token: null });
    const requestId = (request.body as { request_id: string }).request_id;
    const device = { id: "install-1", platform: "android", name: "Pixel", app_version: "1.0.0" };
    const verified = await handleHosted(ctx(), {
      method: "POST",
      path: ["auth", "otp", "verify"],
      query: new URLSearchParams(),
      body: { request_id: requestId, code: sender.sent.get("+905321234567")!, device },
      token: null,
    });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await handleHosted(ctx(), { method: "POST", path: ["auth", "register"], query: new URLSearchParams(), body: { signup_token: signupToken, name: "Deniz", device }, token: null });
    return (registered.body as { access_token: string }).access_token;
  }

  const blocks = [
    { id: "hello", type: "text", visibility: "everyone", html: "<p>Hello</p>", translations: { ar: { html: "<p>مرحبا</p>" } } },
    { id: "join", type: "button", visibility: "signed_out", label: "Sign up", style: "filled", icon: "person", action: { type: "screen", screen: "account" } },
    { id: "continue", type: "continue_learning", visibility: "signed_in", title: "Continue learning", translations: { ar: { title: "تابع التعلم" } } },
    { id: "cheap", type: "items", visibility: "everyone", title: "Courses", source: "courses", layout: "carousel", see_all: { type: "screen", screen: "courses" }, query: { sort: "price_desc", limit: 5 } },
    { id: "picked", type: "items", visibility: "everyone", source: "courses", layout: "grid", query: { ids: ["20", "999", "10"], limit: 3 } },
    { id: "cats", type: "categories", visibility: "everyone", source: "courses", style: "tiles" },
    { id: "find", type: "search", visibility: "everyone", source: "courses", placeholder: "Search courses", translations: { ar: { placeholder: "ابحث" } } },
    { id: "banner", type: "banner", visibility: "everyone", image_url: "https://cdn.test/b.png", heading: "Welcome", action: null },
    { id: "gap", type: "spacer", visibility: "everyone", size: "large" },
  ];

  it("serves the default pages and look until something is published", async () => {
    const nav = await call("/pages");
    expect(nav.status).toBe(200);
    const body = nav.body as { version: string; tabs: { id: string; target: unknown }[]; pages: { slug: string }[] };
    expect(body.version).toMatch(/^default\.[0-9a-f]{16}$/);
    expect(body.tabs.map((t) => t.id)).toEqual(["home", "courses", "learning", "account"]);
    expect(body.pages).toEqual([{ slug: "home", title: "Home", updated_at: app.createdAt.toISOString() }]);
    // The same defaults give the same version.
    expect((await call("/pages")).body).toMatchObject({ version: body.version });
    const home = (await call("/pages/{slug}", { params: ["home"] })).body as { blocks: { id: string }[] };
    expect(home.blocks.map((b) => b.id)).toEqual(["welcome", "search", "new-courses", "categories"]);
    const config = await handleHosted(context(), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "ios", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", config);
    expect(config.body).toMatchObject({ appearance: { template: "classic", theme_mode: "system", secondary_color: null }, languages: { default: "en", available: ["en"] } });
  });

  it("lists services of a bookings app", async () => {
    app = {
      ...app,
      appType: "booking",
      connector: { kind: "bookings" },
      bookingSetup: {
        rules: { ...DEFAULT_BOOKING_RULES, timezone: "Europe/Istanbul" },
        categories: [{ id: 1, name: "Hair" }],
        services: [
          { id: 10, categoryId: 1, name: "Haircut", description: "", durationMinutes: 30, priceCents: 30000, imageAssetId: null, color: null, active: true },
          { id: 11, categoryId: 1, name: "Colouring", description: "", durationMinutes: 90, priceCents: 90000, imageAssetId: null, color: null, active: true },
        ],
        staff: [{ id: 20, name: "Ayşe", title: null, imageAssetId: null, serviceIds: [10, 11], hours: [[], [], [], [], [], [], []], daysOff: [], active: true }],
        nextId: 30,
      },
    };
    const nav = (await call("/pages")).body as { tabs: { id: string; target: unknown }[] };
    expect(nav.tabs.map((t) => t.target)).toEqual([
      { type: "page", page_slug: "home" },
      { type: "screen", screen: "services" },
      { type: "screen", screen: "appointments" },
      { type: "screen", screen: "account" },
    ]);
    await publishLayout(
      store,
      app,
      layoutWith([
        { id: "all", type: "items", visibility: "everyone", source: "services", layout: "list", query: { sort: "price_desc", limit: 5 } },
        { id: "picked", type: "items", visibility: "everyone", source: "services", layout: "grid", query: { ids: ["10"], limit: 1 } },
        { id: "cats", type: "categories", visibility: "everyone", source: "services" },
      ]),
      "owner@salon.test",
      NOW,
    );
    const page = (await call("/pages/{slug}", { params: ["home"] })).body as { blocks: Record<string, unknown>[] };
    expect(page.blocks[0]).toMatchObject({
      items: [
        { source: "services", id: "11", title: "Colouring", subtitle: "90 min", action: { type: "item", item: { source: "services", id: "11" } } },
        { id: "10", title: "Haircut", subtitle: "30 min" },
      ],
    });
    expect(page.blocks[1]).toMatchObject({ items: [{ id: "10" }] });
    expect(page.blocks[2]).toMatchObject({ categories: [{ id: 1, name: "Hair" }] });
  });

  it("serves the published navigation with a version, in the asked language", async () => {
    expect((await publishLayout(store, app, layoutWith(blocks), "owner@lale.test", NOW)).ok).toBe(true);
    const nav = await call("/pages");
    expect(nav.status).toBe(200);
    expect(nav.headers).toMatchObject({ vary: "Accept-Language", etag: `"${layoutVersion(NOW, 1)}"` });
    expect(nav.body).toEqual({
      version: layoutVersion(NOW, 1),
      tabs: [
        { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
        { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
      ],
      pages: [{ slug: "home", title: "Home", updated_at: NOW.toISOString() }],
    });
    const arabic = await call("/pages", { headers: { "accept-language": "ar-EG,ar;q=0.9" } });
    expect(arabic.body).toMatchObject({ tabs: [{ label: "الرئيسية" }, { label: "Account" }], pages: [{ title: "الرئيسية" }] });
    // Turkish isn't turned on: the default language.
    expect((await call("/pages", { headers: { "accept-language": "tr" } })).body).toMatchObject({ pages: [{ title: "Home" }] });
    expect((await call("/pages", { headers: { "if-none-match": `"${layoutVersion(NOW, 1)}"` } })).status).toBe(304);
    expect((await call("/pages", { query: {} })).status).toBe(400);

    const config = await handleHosted(context(), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", config);
    expect(config.body).toMatchObject({
      appearance: { template: "bold", theme_mode: "dark", user_can_change_mode: false, secondary_color: "#E8B04B", font: "Outfit", corners: "round", cards: "elevated" },
      languages: { default: "en", available: ["en", "ar"] },
    });
  });

  it("resolves the blocks of a page for each visitor", async () => {
    await publishLayout(store, app, layoutWith(blocks), "owner@lale.test", NOW);
    const page = await call("/pages/{slug}", { params: ["home"] });
    expect(page.headers).toMatchObject({ vary: "Accept-Language" });
    const body = page.body as { slug: string; title: string; show_title: boolean; blocks: Record<string, unknown>[] };
    expect(body).toMatchObject({ slug: "home", title: "Home", show_title: true });
    // Signed out: no "continue learning".
    expect(body.blocks.map((b) => b.id)).toEqual(["hello", "join", "cheap", "picked", "cats", "find", "banner", "gap"]);
    expect(body.blocks[0]).toEqual({ id: "hello", type: "text", title: null, html: "<p>Hello</p>" });
    expect(body.blocks[2]).toMatchObject({
      source: "courses",
      layout: "carousel",
      see_all: { type: "screen", screen: "courses" },
      items: [
        { source: "courses", id: "20", title: "Business English", price_label: "₺450.00", action: { type: "course", course_id: 20 } },
        { source: "courses", id: "10", title: "Turkish for Beginners", subtitle: "Selin Arslan", image_url: assetUrl("img-tr"), price_label: "Free" },
      ],
    });
    expect((body.blocks[3]!.items as { id: string }[]).map((i) => i.id)).toEqual(["20", "10"]);
    expect(body.blocks[4]).toMatchObject({ style: "tiles", categories: [{ id: 1, name: "Languages", count: 2 }] });
    expect(body.blocks[6]).not.toHaveProperty("action");
    expect(body.blocks[6]).not.toHaveProperty("visibility");

    const arabic = (await call("/pages/{slug}", { params: ["home"], headers: { "accept-language": "ar" } })).body as typeof body;
    expect(arabic.title).toBe("الرئيسية");
    expect(arabic.blocks[0]).toMatchObject({ html: "<p>مرحبا</p>" });
    expect(arabic.blocks.find((b) => b.id === "find")).toMatchObject({ placeholder: "ابحث" });

    const token = await signUp();
    let signedIn = (await call("/pages/{slug}", { params: ["home"], token })).body as typeof body;
    // No course in progress yet.
    expect(signedIn.blocks.map((b) => b.id)).not.toContain("continue");
    expect(signedIn.blocks.map((b) => b.id)).not.toContain("join");
    const user = (await store.getHostedUserByPhone(app.id, "+905321234567"))!;
    await store.enrollInCourse({ appId: app.id, userId: user.id, courseId: 10, source: "free", enrolledAt: now });
    await store.saveLessonProgress({ appId: app.id, userId: user.id, courseId: 10, lessonId: 12, positionSeconds: 30, completedAt: now, updatedAt: now });
    signedIn = (await call("/pages/{slug}", { params: ["home"], token, headers: { "accept-language": "ar" } })).body as typeof body;
    expect(signedIn.blocks.find((b) => b.id === "continue")).toMatchObject({ title: "تابع التعلم", course: { course: { id: 10 }, progress: { percent: 50 } } });

    expect((await call("/pages/{slug}", { params: ["missing"] })).status).toBe(404);
  });

  it("leaves out lists it can't fill", async () => {
    await publishLayout(store, app, layoutWith(blocks), "owner@lale.test", NOW);
    app = { ...app, connector: null };
    const body = (await call("/pages/{slug}", { params: ["home"] })).body as { blocks: { id: string }[] };
    expect(body.blocks.map((b) => b.id)).toEqual(["hello", "join", "banner", "gap"]);
  });

  it("fills listings from a registered source only", async () => {
    app = { ...app, appType: "real_estate" as AppType, connector: null };
    await store.updateApp(app.id, { appType: app.appType, connector: null }, NOW);
    const listings = [
      { id: "new", type: "items", visibility: "everyone", source: "listings", layout: "list", query: { limit: 2 } },
      { id: "find", type: "search", visibility: "everyone", source: "listings", placeholder: "Search properties" },
    ];
    await publishLayout(store, app, layoutWith(listings), "owner@office.test", NOW);
    expect(((await call("/pages/{slug}", { params: ["home"] })).body as { blocks: unknown[] }).blocks).toEqual([]);
    const seen: unknown[] = [];
    registerItemSource("listings", async (ctx, query) => {
      seen.push({ ctx, query });
      return [{ source: "listings", id: "7", title: "Flat in Maadi", subtitle: "Maadi · 185 m²", price_label: "EGP 4,250,000", action: { type: "item", item: { source: "listings", id: "7" } } }];
    });
    const body = (await call("/pages/{slug}", { params: ["home"], headers: { "accept-language": "ar" } })).body as { blocks: Record<string, unknown>[] };
    expect(body.blocks.map((b) => b.id)).toEqual(["new", "find"]);
    expect(body.blocks[0]).toMatchObject({ items: [{ id: "7", title: "Flat in Maadi" }] });
    expect(seen).toEqual([{ ctx: { appId: app.id, userId: null, lang: "ar" }, query: { category_id: null, featured: false, sort: "newest", limit: 2, ids: [] } }]);
  });
});

describe("app defaults", () => {
  it("uses the template and font the client picked in Branding", () => {
    const app = { ...newApp("c", null, NOW, "lms"), template: "bold" as const, font: "Lexend", brandingDoneAt: NOW };
    const layout: LayoutContent = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
    expect(layout.appearance).toMatchObject({ template: "bold", font: "Lexend" });
    expect(defaultLayout({ ...app, brandingDoneAt: null }, BUILT_IN_APP_DEFAULTS, NOW).appearance).toMatchObject({ template: "classic", font: "Bricolage Grotesque" });
  });
});

