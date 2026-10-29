import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { suspendClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_RULES, type App, type AppType, type CourseSetup } from "@/lib/data/types";
import { BookingsConnector } from "@/lib/hosted/connectors/bookings";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { registerItemSource, unregisterItemSource } from "@/lib/hosted/pages/items";
import { registerPlatformItemSources } from "@/lib/hosted/pages/sources";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { cleanBlockHtml } from "@/lib/pages/html";
import { discardDraft, hasUnpublishedChanges, layoutVersion, loadLayout, lookAndLanguages, publishLayout, saveDraft } from "@/lib/pages/layout";
import { duplicatePage, renamePageLinks, switchDefaultLanguage, textIn, uniqueSlug, withText } from "@/lib/pages/model";
import { pluginLayout } from "@/lib/pages/plugin";
import { pickLanguage, translated } from "@/lib/pages/translate";
import { layoutForPlan } from "@/lib/pages/plan";
import { PLAN_INFO } from "@/lib/plans";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { DICTIONARY_VERSION } from "@/lib/i18n/builtin";
import type { LayoutBlock, LayoutContent } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { APP_TYPES, hostedOnly, KINDS } from "@/lib/app/kinds";
import { appOpensScreen, itemSourcesFor, listHint, screenOptionsFor, SOURCE_SORTS } from "@/lib/pages/sources";
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
        { id: "t1", type: "text", visibility: "everyone", html: "<p>Hello<script>x</script></p>", extra: "dropped", translations: { ar: { html: "<p>مرحبا</p><script>x</script>", bogus: "x" }, xx: { html: "Hallo" } } },
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
    expect(errorsOf(layoutWith([], { tabs: [{ id: "a", label: "A", icon: "home", target: { type: "screen", screen: "account" } }] }))).toContain("Tabs: the app needs 2 to 10 tabs.");
    // 109 Up to ten: past five, the app shows four and More.
    const sixTabs = Array.from({ length: 11 }, (_, i) => ({ id: `t${i}`, label: "Tab", icon: "home", target: { type: "screen", screen: "account" } }));
    expect(errorsOf(layoutWith([], { tabs: sixTabs }))).toContain("Tabs: the app needs 2 to 10 tabs.");
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

  it("103R checks a Studio page: its elements, their sizes and colours, and no blocks beside it", () => {
    const page = (studio: unknown, blocks: unknown[] = []) => layoutWith(blocks, { pages: [{ slug: "home", title: "Home", show_title: true, blocks, studio }] });
    const text = { id: "t", type: "text", text: "Hi", translations: { ar: { text: "مرحبا" } }, font: { weight: 800, size: 20 }, color: "#ffffff" };
    const button = { id: "b", type: "button", text: "Order now", width: "fill", height: 46, padding: { top: 14, end: 24, bottom: 14, start: 24 }, radius: 14, shadow: "medium", action: { type: "screen", screen: "courses" }, platforms: ["android", "ios"], motion: { enter: "slide_up", press: "shrink" } };
    const body = { id: "root", type: "column", gap: 12, children: [{ id: "row", type: "row", align: "between", children: [text] }, button] };
    const ok = parse(page({ header: { type: "logo_actions", buttons: ["cart", "account", "cart"] }, body, background: "#fbf8f2" }));
    expect(ok.ok ? [] : ok.errors).toEqual([]);
    const studio = ok.ok ? ok.value.pages[0]!.studio : undefined;
    expect(studio).toEqual({
      header: { type: "logo_actions", buttons: ["cart", "account"] },
      background: "#FBF8F2",
      body: {
        id: "root",
        type: "column",
        gap: 12,
        children: [
          { id: "row", type: "row", align: "between", children: [{ id: "t", type: "text", text: "Hi", translations: { ar: { text: "مرحبا" } }, font: { weight: 800, size: 20 }, color: "#FFFFFF" }] },
          // Both platforms is the default; a press and an entrance are kept.
          { id: "b", type: "button", text: "Order now", width: "fill", height: 46, padding: { top: 14, end: 24, bottom: 14, start: 24 }, radius: 14, shadow: "medium", action: { type: "screen", screen: "courses" }, motion: { enter: "slide_up", press: "shrink" } },
        ],
      },
    });
    const where = 'Page "Home", page';
    expect(errorsOf(page({ body: { id: "t", type: "text", text: "Hi" } }))).toEqual(['Page "Home": the page must start with a row, a column or another layout.']);
    expect(errorsOf(page({ body: { ...body, children: [{ ...text, type: "marquee" }] } }))).toEqual([`${where} › 1: this kind of element isn't available.`]);
    expect(errorsOf(page({ body: { ...body, children: [{ id: "i", type: "image", image_url: "javascript:x" }] } }))).toEqual([`${where} › 1: the picture's address must be a full https address.`]);
    expect(errorsOf(page({ body: { ...body, children: [text, text] } }))).toEqual([`${where} › 2: two elements have the same ID.`]);
    expect(errorsOf(page({ body: { ...body, children: [{ ...text, width: "wide" }] } }))).toEqual([`${where} › 1: the width must be fill, hug or 0 to 4000.`]);
    expect(errorsOf(page({ body: { ...body, children: [{ ...text, children: [text] }] } }))).toEqual([`${where} › 1: only rows, columns and other layouts hold elements.`]);
    // Products aren't in an academy; a list's card takes texts from the list, nothing else does.
    expect(errorsOf(page({ body: { ...body, children: [{ id: "l", type: "items", source: "products", query: { limit: 4 } }] } }))).toEqual([`${where} › 1: choose what the list shows.`]);
    const list = { id: "l", type: "items", source: "courses", layout: "grid", columns: 2, query: { limit: 4 }, card: { id: "card", type: "column", children: [{ id: "ct", type: "text", bind: "title" }, { id: "ci", type: "image", bind: "image" }] } };
    const withList = parse(page({ body: { ...body, children: [list] } }));
    expect(withList.ok && withList.value.pages[0]!.studio!.body.children![0]!.card!.children!.map((n) => n.bind)).toEqual(["title", "image"]);
    expect(errorsOf(page({ body: { ...body, children: [{ ...text, bind: "title" }] } }))).toEqual([`${where} › 1: only a list's card takes its texts from the list.`]);
    expect(errorsOf(page({ body }, [{ id: "s", type: "spacer", visibility: "everyone", size: "small" }]))).toEqual(['Page "Home": a Studio page has its elements instead of blocks.']);
    const deep = Array.from({ length: 14 }).reduce<Record<string, unknown>>((inner, _, i) => ({ id: `c${i}`, type: "column", children: [inner] }), { id: "leaf", type: "spacer" });
    expect(errorsOf(page({ body: deep })).some((e) => e.includes("nested at most 12 deep"))).toBe(true);
  });

  it("103R serves a Studio page only with Studio on the app's plan, within its sources", () => {
    const app = { ...newApp("c", null, NOW, "lms"), backend: "hosted" as const };
    const studio = {
      body: {
        id: "root",
        type: "column" as const,
        children: [
          { id: "b", type: "button" as const, text: "Go", action: { type: "item" as const, item: { source: "products" as const, id: "7" } } },
          { id: "l", type: "items" as const, source: "products" as const, layout: "grid" as const, query: { limit: 4 } },
          { id: "c", type: "items" as const, source: "courses" as const, layout: "grid" as const, query: { limit: 4 } },
        ],
      },
    };
    const layout = { version: "v1", ...(layoutWith([], { pages: [{ slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), blocks: [], studio }] }) as unknown as LayoutContent) };
    const without = layoutForPlan(layout, app, PLAN_INFO.pro, BUILT_IN_APP_DEFAULTS);
    expect(without.pages[0]!.studio).toBeUndefined();
    const withStudio = layoutForPlan(layout, app, { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "studio"] }, BUILT_IN_APP_DEFAULTS);
    // An academy has no products: the tap to one is dropped, the products list left out.
    expect(withStudio.pages[0]!.studio!.body.children!.map((n) => [n.id, n.action ?? null])).toEqual([
      ["b", null],
      ["c", null],
    ]);
  });

  it("101 keeps the header: its layout and up to four buttons, each once", () => {
    const look = (layoutWith([]).appearance as Record<string, unknown>);
    const withHeader = (header: unknown) => layoutWith([], { appearance: { ...look, header } });
    const result = parse(withHeader({ layout: "search", icons: ["cart", "account", "cart"], extra: 1 }));
    expect(result.ok && result.value.appearance.header).toEqual({ layout: "search", icons: ["cart", "account"] });
    // Missing or null: the template's header.
    const plain = parse(layoutWith([]));
    expect(plain.ok && "header" in plain.value.appearance).toBe(false);
    expect(errorsOf(withHeader(null))).toEqual([]);
    expect(errorsOf(withHeader({ layout: "banner", icons: [] }))).toEqual(["Look: choose the header."]);
    expect(errorsOf(withHeader({ layout: "logo", icons: ["wishlist"] }))).toEqual(["Look: a header button isn't one the app has."]);
    expect(errorsOf(withHeader({ layout: "logo", icons: ["search", "cart", "notifications", "chat", "account"] }))).toEqual(["Look: keep at most 4 buttons in the header."]);
  });
});

describe("31 only what the app's type has", () => {
  const tabsTo = (screen: string) => ({
    tabs: [
      { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
      { id: "x", label: "X", icon: "star", target: { type: "screen", screen } },
    ],
  });
  const app = (appType: AppType, backend: App["backend"] = "hosted") => ({ appType, backend });

  it("accepts the default layout of every kind", () => {
    for (const kind of KINDS) {
      for (const backend of hostedOnly(kind.engine) ? (["hosted"] as const) : (["hosted", "wordpress"] as const)) {
        const made = { ...newApp("c", null, NOW, kind.engine, kind.vertical), backend };
        const result = parse(defaultLayout(made, BUILT_IN_APP_DEFAULTS, NOW), made);
        expect(result.ok, `${kind.id} ${backend}: ${JSON.stringify(result)}`).toBe(true);
      }
    }
  });

  it("refuses screens the app can't open, saying which", () => {
    expect(errorsOf(layoutWith([], tabsTo("cart")), app("news"))).toEqual(['Tab 2: this app has no "Cart" screen. Choose another screen.']);
    expect(errorsOf(layoutWith([], tabsTo("my_courses")), app("store", "wordpress"))).toEqual(['Tab 2: this app has no "My courses" screen. Choose another screen.']);
    expect(errorsOf(layoutWith([], tabsTo("appointments")), lmsHosted)).toEqual(['Tab 2: this app has no "Appointments" screen. Choose another screen.']);
    expect(errorsOf(layoutWith([{ id: "b", type: "button", visibility: "everyone", label: "Go", style: "filled", action: { type: "screen", screen: "tickets" } }]), app("donations"))).toEqual([
      'Page "Home", block 1 (Button): this app has no "My tickets" screen. Choose another screen.',
    ]);
    expect(errorsOf(layoutWith([], tabsTo("nowhere")), app("news"))).toEqual(["Tab 2: choose a screen."]);
  });

  it("keeps the older names a module still opens", () => {
    // News apps opened "courses" as the articles and "favorites" as the saved ones before Phase 31.
    expect(errorsOf(layoutWith([], tabsTo("courses")), app("news"))).toEqual([]);
    expect(errorsOf(layoutWith([], tabsTo("favorites")), app("news"))).toEqual([]);
    expect(errorsOf(layoutWith([], tabsTo("orders")), app("events"))).toEqual([]);
    expect(errorsOf(layoutWith([], tabsTo("search")), app("booking"))).toEqual([]);
  });

  it("opens courses only in Academy apps", () => {
    const button = { id: "b", type: "button", visibility: "everyone", label: "Go", style: "filled", action: { type: "course", course_id: 12 } };
    expect(errorsOf(layoutWith([button]), lmsHosted)).toEqual([]);
    expect(errorsOf(layoutWith([button]), storeWp)).toEqual(['Page "Home", block 1 (Button): this app has no courses. Choose what happens on tap.']);
  });

  it("sorts each list only the ways its entries can be sorted", () => {
    const list = (source: string, sort: string) => ({ id: "l", type: "items", visibility: "everyone", source, layout: "grid", query: { limit: 5, sort } });
    const sortOf = (source: string, sort: string, appType: AppType, backend: App["backend"] = "hosted") => {
      const result = parse(layoutWith([list(source, sort)]), app(appType, backend));
      if (!result.ok) throw new Error(result.errors.join(" "));
      return result.value.pages[0]!.blocks[0]!.query!.sort;
    };
    expect(sortOf("articles", "price_asc", "news")).toBe("newest");
    expect(sortOf("articles", "popular", "news")).toBe("popular");
    expect(sortOf("posts", "price_desc", "lms", "wordpress")).toBe("newest");
    expect(sortOf("events", "popular", "events")).toBe("newest");
    expect(sortOf("campaigns", "price_asc", "donations")).toBe("newest");
    expect(sortOf("listings", "price_asc", "real_estate")).toBe("price_asc");
    expect(sortOf("services", "popular", "booking")).toBe("newest");
    expect(sortOf("courses", "price_desc", "lms")).toBe("price_desc");
    expect(sortOf("products", "popular", "store")).toBe("popular");
    expect(SOURCE_SORTS.articles).not.toContain("price_asc");
  });

  it("offers the screens each engine has, in its words", () => {
    const offered = (appType: AppType) => screenOptionsFor({ appType }).filter((o) => !o.alias);
    expect(offered("store").map((o) => o.value)).not.toContain("my_courses");
    expect(offered("store").find((o) => o.value === "courses")?.label).toBe("All products");
    expect(offered("real_estate").find((o) => o.value === "courses")?.label).toBe("All listings");
    expect(offered("news").map((o) => o.value)).toEqual(["articles", "search", "bookmarks", "account", "settings", "notifications"]);
    expect(screenOptionsFor({ appType: "news" }).find((o) => o.value === "courses")).toEqual({ value: "courses", label: "All articles", alias: true });
    for (const appType of APP_TYPES) {
      // Every app has an Account screen: what a new tab or button opens first.
      expect(offered(appType).map((o) => o.value), appType).toContain("account");
      expect(appOpensScreen({ appType }, "account")).toBe(true);
    }
  });

  it("names only this app's content in the List block's hint", () => {
    expect(listHint(itemSourcesFor({ appType: "store", backend: "hosted" }))).toBe("Products");
    expect(listHint(itemSourcesFor({ appType: "lms", backend: "wordpress" }))).toBe("Courses or blog posts");
    expect(listHint(itemSourcesFor({ appType: "booking", backend: "wordpress" }))).toBe("Services or blog posts");
    expect(listHint(["courses", "products", "posts"])).toBe("Courses, products or blog posts");
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
    // 43 The owner's order stays.
    expect(arabic.languages).toEqual({ default: "ar", available: ["en", "ar"] });
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
    const header = { layout: "logo", icons: ["search", "cart"] };
    expect((await publishLayout(store, app, layoutWith(blocks, { appearance: { ...(layoutWith([]).appearance as object), header } }), "owner@academy.test", NOW)).ok).toBe(true);
    const result = await pluginLayout(store, site(), null, NOW);
    expect(result.status).toBe(200);
    expectPlatformContract("POST", "/apps/layout", result);
    if (result.status !== 200) return;
    expect(result.etag).toBe(result.body.version);
    expect(result.body.pages[0]!.blocks[1]).toMatchObject({ query: { ids: ["12", "7"], category_id: null, featured: false, sort: "newest", limit: 2 } });
    expect(result.body.tabs[0]!.translations).toEqual({ ar: { label: "الرئيسية" } });
    // 101 The header goes to the plugin with the look.
    expect(result.body.appearance.header).toEqual(header);

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

  it("101 serves the header chosen in the look", async () => {
    const look = { ...(layoutWith([]).appearance as Record<string, unknown>), header: { layout: "centered", icons: ["notifications", "account"] } };
    expect((await publishLayout(store, app, layoutWith(blocks, { appearance: look }), "owner@lale.test", NOW)).ok).toBe(true);
    const config = await handleHosted(context(), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "ios", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", config);
    expect(config.body).toMatchObject({ appearance: { header: { layout: "centered", icons: ["notifications", "account"] } } });
  });

  it("103R serves a Studio page in the language asked for, with its lists filled", async () => {
    const studio = {
      header: { type: "title_search", title: "Lessons", translations: { ar: { title: "الدروس" } } },
      background: "#ffffff",
      body: {
        id: "root",
        type: "column",
        children: [
          { id: "hero", type: "stack", height: 300, background: "#1f4e5f", children: [{ id: "title", type: "text", text: "Learn faster", font: { size: 32, weight: 800 }, color: "#ffffff", translations: { ar: { text: "تعلم أسرع" } } }] },
          { id: "go", type: "button", text: "Courses", background: "#e8b04b", radius: 24, action: { type: "screen", screen: "courses" } },
          { id: "list", type: "items", source: "courses", layout: "carousel", query: { limit: 5 } },
          // 107.2 More style, and an element hidden in the app.
          {
            id: "chips",
            type: "row",
            scroll: true,
            rotation: -4,
            corners: { top_start: 20, bottom_end: 20 },
            overlay: { color: "#0e0d24", opacity: 0.35 },
            children: [{ id: "old", type: "text", text: "EGP 300", font: { strike: true, uppercase: true } }],
          },
          { id: "draft", type: "text", text: "Coming soon", hidden: true },
          // 107.3 Questions that open, a countdown and a list with icons.
          { id: "faq", type: "accordion", children: [{ id: "q1", type: "column", title: "How long?", translations: { ar: { title: "قد إيه؟" } }, children: [{ id: "a1", type: "text", text: "Two days." }] }] },
          { id: "sale", type: "countdown", ends_at: "2026-11-05T19:00:00Z", text: "It ended." },
          { id: "perks", type: "bullets", text: "Free delivery\nPay on delivery", icon: "local_shipping" },
        ],
      },
    };
    const page = { slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), blocks: [], studio };
    expect((await publishLayout(store, app, layoutWith([], { pages: [page] }), "owner@lale.test", NOW)).ok).toBe(true);
    type Node = Record<string, unknown> & { children?: Node[] };
    type Served = { blocks: unknown[]; studio: { background: string; header: Record<string, unknown>; body: Node } };
    const served = (await call("/pages/{slug}", { params: ["home"] })).body as Served;
    expect(served.blocks).toEqual([]);
    expect(served.studio.background).toBe("#FFFFFF");
    expect(served.studio.header).toEqual({ type: "title_search", title: "Lessons" });
    const [hero, go, list] = served.studio.body.children!;
    expect(hero!.children![0]).toMatchObject({ text: "Learn faster", color: "#FFFFFF" });
    expect(hero!.children![0]).not.toHaveProperty("translations");
    expect(go).toMatchObject({ action: { type: "screen", screen: "courses" } });
    expect((list!.items as unknown[]).length).toBeGreaterThan(0);
    expect(list).not.toHaveProperty("query");
    expect(served.studio.body.children!.map((n) => n.id)).toEqual(["hero", "go", "list", "chips", "faq", "sale", "perks"]);
    expect(served.studio.body.children![4]!.children![0]).toMatchObject({ title: "How long?" });
    expect(served.studio.body.children![5]).toMatchObject({ type: "countdown", ends_at: "2026-11-05T19:00:00.000Z" });
    expect(served.studio.body.children![3]).toMatchObject({ scroll: true, rotation: -4, corners: { top_start: 20, bottom_end: 20 }, overlay: { color: "#0E0D24", opacity: 0.35 } });
    expect(served.studio.body.children![3]!.children![0]).toMatchObject({ font: { strike: true, uppercase: true } });
    const arabic = (await call("/pages/{slug}", { params: ["home"], headers: { "accept-language": "ar" } })).body as Served;
    expect(arabic.studio.body.children![0]!.children![0]).toMatchObject({ text: "تعلم أسرع" });
    expect(arabic.studio.body.children![4]!.children![0]).toMatchObject({ title: "قد إيه؟" });
    expect(arabic.studio.header.title).toBe("الدروس");
  });

  it("103R takes the answers of a form element on a Studio page", async () => {
    const studio = {
      body: {
        id: "root",
        type: "column",
        children: [{ id: "contact", type: "form", form: { send_to: "email", submit_label: "Send", fields: [{ id: "name", kind: "text", label: "Name", required: true }] } }],
      },
    };
    const page = { slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), blocks: [], studio };
    expect((await publishLayout(store, app, layoutWith([], { pages: [page] }), "owner@lale.test", NOW)).ok).toBe(true);
    const sent: unknown[] = [];
    const post = (path: string, answers: unknown) =>
      handleHosted({ ...context(), onFormAnswers: async (input) => void sent.push(input) }, { method: "POST", path: path.split("/").filter(Boolean), query: new URLSearchParams(), body: { answers }, token: null, headers: new Headers() });
    const wrong = await post("/forms/home/contact", { name: " " });
    expect(wrong.status).toBe(400);
    expect((await post("/forms/home/contact", { name: "Ayşe" })).status).toBe(202);
    expect(sent).toEqual([{ title: "Home", lines: [{ label: "Name", value: "Ayşe" }], user: null, replyTo: null }]);
    // Only a form element: not the page's own column.
    expect((await post("/forms/home/root", { name: "Ayşe" })).status).toBe(404);
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
        { source: "services", id: "11", title: "Colouring", subtitle: "1 h 30 min", action: { type: "item", item: { source: "services", id: "11" } } },
        { id: "10", title: "Haircut", subtitle: "30 min" },
      ],
    });
    expect(page.blocks[1]).toMatchObject({ items: [{ id: "10" }] });
    expect(page.blocks[2]).toMatchObject({ categories: [{ id: 1, name: "Hair" }] });
  });

  it("serves the published navigation with a version, in the asked language", async () => {
    expect((await publishLayout(store, app, layoutWith(blocks), "owner@lale.test", NOW)).ok).toBe(true);
    // 43 The version carries Yallapp's translations, which the served layout has.
    const served = `${layoutVersion(NOW, 1)}~t${DICTIONARY_VERSION}`;
    const nav = await call("/pages");
    expect(nav.status).toBe(200);
    expect(nav.headers).toMatchObject({ vary: "Accept-Language", etag: `"${served}"` });
    expect(nav.body).toEqual({
      version: served,
      tabs: [
        { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
        { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
      ],
      more: [],
      menu: [],
      pages: [{ slug: "home", title: "Home", updated_at: NOW.toISOString() }],
    });
    const arabic = await call("/pages", { headers: { "accept-language": "ar-EG,ar;q=0.9" } });
    // 43 The owner's Arabic, and Yallapp's for "Account", which the owner didn't translate.
    expect(arabic.body).toMatchObject({ tabs: [{ label: "الرئيسية" }, { label: "الحساب" }], pages: [{ title: "الرئيسية" }] });
    // Turkish isn't turned on: the default language.
    expect((await call("/pages", { headers: { "accept-language": "tr" } })).body).toMatchObject({ pages: [{ title: "Home" }] });
    expect((await call("/pages", { headers: { "if-none-match": `"${served}"` } })).status).toBe(304);
    // Each language has its own version: switching language never gets a 304 for the old texts.
    expect(arabic.body).toMatchObject({ version: `${served}.ar` });
    expect(
      (await call("/pages", { headers: { "accept-language": "ar", "if-none-match": `"${served}"` } })).status,
    ).toBe(200);
    expect(
      (await call("/pages", { headers: { "accept-language": "ar", "if-none-match": `"${served}.ar"` } })).status,
    ).toBe(304);
    expect((await call("/pages", { query: {} })).status).toBe(400);

    const config = await handleHosted(context(), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", config);
    expect(config.body).toMatchObject({
      appearance: { template: "bold", theme_mode: "dark", user_can_change_mode: false, secondary_color: "#E8B04B", font: "Outfit", corners: "round", cards: "elevated" },
      languages: { default: "en", available: ["en", "ar"] },
    });
  });

  it("82.5 serves the side menu, the owner's own icons and each block's look", async () => {
    const icon = "https://yallapp.test/m/icon-star.png";
    const layout = layoutWith(
      [
        { id: "hello", type: "text", visibility: "everyone", html: "<p>Hello</p>", look: { background: "tint", spacing: "large" } },
        { id: "plain", type: "text", visibility: "everyone", html: "<p>Plain</p>", look: { background: "none", spacing: "medium" } },
        { id: "links", type: "quick_links", visibility: "everyone", style: "grid", links: [{ icon: "star", icon_url: icon, label: "Offers", action: { type: "page", page_slug: "home" } }] },
      ],
      {
        menu: [
          { id: "about", label: "About us", icon: "info", icon_url: icon, target: { type: "page", page_slug: "home" }, translations: { ar: { label: "من نحن" } } },
          { id: "orders", label: "Orders", icon: "receipt_long", target: { type: "screen", screen: "orders" } },
        ],
      },
    );
    expect((await publishLayout(store, app, layout, "owner@lale.test", NOW)).ok).toBe(true);
    const nav = await call("/pages");
    expect((nav.body as { menu: unknown[] }).menu).toEqual([
      { id: "about", label: "About us", icon: "info", icon_url: icon, target: { type: "page", page_slug: "home" } },
      { id: "orders", label: "Orders", icon: "receipt_long", target: { type: "screen", screen: "orders" } },
    ]);
    expect((await call("/pages", { headers: { "accept-language": "ar" } })).body).toMatchObject({ menu: [{ label: "من نحن" }, { label: "الطلبات" }] });
    const home = await call("/pages/{slug}", { params: ["home"] });
    const served = (home.body as { blocks: { id: string; look?: unknown; links?: unknown[] }[] }).blocks;
    expect(served.find((b) => b.id === "hello")!.look).toEqual({ background: "tint", spacing: "large" });
    // The usual look isn't stored, nor sent.
    expect(served.find((b) => b.id === "plain")).not.toHaveProperty("look");
    expect(served.find((b) => b.id === "links")!.links).toEqual([{ icon: "star", icon_url: icon, label: "Offers", action: { type: "page", page_slug: "home" } }]);
  });

  it("109 serves the first four tabs and More past five, the rest in its list, and the tab bar's look", async () => {
    const screen = (id: string, s: string) => ({ id, label: s, icon: "star", target: { type: "screen", screen: s } });
    const tabs = [
      { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
      screen("courses", "courses"),
      screen("mine", "my_courses"),
      screen("search", "search"),
      screen("alerts", "notifications"),
      screen("settings", "settings"),
      screen("account", "account"),
    ];
    const tab_bar = { background: "#0e0d24", active: "#FF5A1F", radius: 16, margin: 12, font: "Cairo", labels: "active", center: "courses" };
    expect((await publishLayout(store, app, layoutWith([], { tabs, tab_bar }), "owner@lale.test", NOW)).ok).toBe(true);
    const nav = (await call("/pages", { headers: { "accept-language": "ar" } })).body as { tabs: { id: string; label: string; icon: string; target: unknown }[]; more: { id: string }[]; tab_bar: unknown };
    expect(nav.tabs.map((t) => t.id)).toEqual(["home", "courses", "mine", "search", "more"]);
    expect(nav.tabs[4]).toEqual({ id: "more", label: "المزيد", icon: "apps", target: { type: "more" } });
    expect(nav.more.map((t) => t.id)).toEqual(["alerts", "settings", "account"]);
    expect(nav.tab_bar).toEqual({ background: "#0E0D24", active: "#FF5A1F", radius: 16, margin: 12, font: "Cairo", labels: "active", center: "courses" });
  });

  it("109 checks the tab bar's look and keeps the usual look out of it", () => {
    const tabs = Array.from({ length: 11 }, (_, i) => ({ id: `t${i}`, label: `Tab ${i}`, icon: "star", target: { type: "page", page_slug: "home" } }));
    expect(errorsOf(layoutWith([], { tabs }))).toContain("Tabs: the app needs 2 to 10 tabs.");
    expect(errorsOf(layoutWith([], { tabs: tabs.slice(0, 10) }))).toEqual([]);
    expect(errorsOf(layoutWith([], { tab_bar: { background: "blue", radius: 40, labels: "sometimes", center: "nowhere" } }))).toEqual([
      "Tabs: a colour of the tab bar isn't a colour.",
      "Tabs: the tab bar's corners must be 0 to 32.",
      "Tabs: choose when the tabs' names show.",
      "Tabs: the tab in the middle isn't one of the tabs.",
    ]);
    const parsed = parse(layoutWith([], { tab_bar: { radius: 0, margin: 0, labels: "always", background: null } }));
    expect(parsed.ok && parsed.value).not.toHaveProperty("tab_bar");
    // A plan that leaves the middle tab out leaves out the round button, not the rest of the look.
    const kept = parse(layoutWith([], { tab_bar: { radius: 12, center: "home" } }));
    expect(kept.ok && kept.value.tab_bar).toEqual({ radius: 12, center: "home" });
  });

  it("99.3 serves the block's text position, size, corners and picture fit, the page's background and picture, and only the blocks shown now", async () => {
    const header = "https://yallapp.test/m/top.jpg";
    const later = new Date(NOW.getTime() + 86_400_000).toISOString();
    const earlier = new Date(NOW.getTime() - 86_400_000).toISOString();
    const layout = layoutWith([
      { id: "styled", type: "text", visibility: "everyone", html: "<p>Styled</p>", look: { background: "none", spacing: "medium", align: "center", text_size: "large", corners: "round", image_fit: "contain" } },
      { id: "usual", type: "text", visibility: "everyone", html: "<p>Usual</p>", look: { background: "none", spacing: "medium", align: "start", text_size: "medium", corners: "app", image_fit: "cover" } },
      { id: "soon", type: "text", visibility: "everyone", html: "<p>Soon</p>", show: { from: later } },
      { id: "over", type: "text", visibility: "everyone", html: "<p>Over</p>", show: { until: earlier } },
      { id: "now", type: "text", visibility: "everyone", html: "<p>Now</p>", show: { from: earlier, until: later } },
      { id: "iphone", type: "text", visibility: "everyone", html: "<p>iPhone</p>", show: { platforms: ["ios"] } },
      { id: "arabic", type: "text", visibility: "everyone", html: "<p>Arabic</p>", show: { languages: ["ar"] } },
    ]);
    (layout.pages as Record<string, unknown>[])[0] = { ...(layout.pages as Record<string, unknown>[])[0], background: "tint", header_image_url: header };
    expect((await publishLayout(store, app, layout, "owner@lale.test", NOW)).ok).toBe(true);
    const ids = (r: HostedResult) => (r.body as { blocks: { id: string }[] }).blocks.map((b) => b.id);
    const home = await call("/pages/{slug}", { params: ["home"] });
    expect(home.body).toMatchObject({ background: "tint", header_image_url: header });
    const served = (home.body as { blocks: { id: string; look?: unknown; show?: unknown }[] }).blocks;
    expect(served.find((b) => b.id === "styled")!.look).toEqual({ background: "none", spacing: "medium", align: "center", text_size: "large", corners: "round", image_fit: "contain" });
    expect(served.find((b) => b.id === "usual")).not.toHaveProperty("look");
    expect(ids(home)).toEqual(["styled", "usual", "now"]);
    expect(served.some((b) => "show" in b)).toBe(false);
    expect(ids(await call("/pages/{slug}", { params: ["home"], query: { platform: "ios" } }))).toEqual(["styled", "usual", "now", "iphone"]);
    expect(ids(await call("/pages/{slug}", { params: ["home"], headers: { "accept-language": "ar" } }))).toEqual(["styled", "usual", "now", "arabic"]);
  });

  it("99.4 serves cards, a gallery, a location, a divider and a form, in the language asked for", async () => {
    const layout = layoutWith([
      { id: "cards", type: "cards", visibility: "everyone", columns: 3, cards: [{ title: "Swimming", text: "Mornings", image_url: "https://yallapp.test/m/pool.jpg", action: { type: "page", page_slug: "home" }, translations: { ar: { title: "السباحة" } } }] },
      { id: "photos", type: "gallery", visibility: "everyone", images: [{ image_url: "https://yallapp.test/m/1.jpg", caption: "Our hall", translations: { ar: { caption: "قاعتنا" } } }] },
      { id: "where", type: "map", visibility: "everyone", latitude: 41.0082, longitude: 28.9784, name: "Moda branch", address: "Moda, Istanbul" },
      { id: "line", type: "divider", visibility: "everyone", style: "dots" },
      { id: "ask", type: "form", visibility: "everyone", title: "Ask us", send_to: "email", fields: [{ id: "name", kind: "text", label: "Name", required: true, translations: { ar: { label: "الاسم" } } }] },
    ]);
    expect((await publishLayout(store, app, layout, "owner@lale.test", NOW)).ok).toBe(true);
    const ar = await call("/pages/{slug}", { params: ["home"], headers: { "accept-language": "ar" } });
    const blocks = (ar.body as { blocks: Record<string, unknown>[] }).blocks;
    expect(blocks.map((b) => b.type)).toEqual(["cards", "gallery", "map", "divider", "form"]);
    expect(blocks[0]).toMatchObject({ columns: 3, cards: [{ title: "السباحة", text: "Mornings" }] });
    expect(blocks[1]).toMatchObject({ columns: 3, images: [{ caption: "قاعتنا" }] });
    expect(blocks[2]).toMatchObject({ latitude: 41.0082, longitude: 28.9784, name: "Moda branch" });
    expect(blocks[3]).toMatchObject({ style: "dots" });
    expect(blocks[4]).toMatchObject({ send_to: "email", fields: [{ id: "name", label: "الاسم", required: true, options: null }] });
    expect(JSON.stringify(blocks)).not.toContain("translations");
  });

  it("99.4 checks a form's answers, emails them to the business, and limits how often", async () => {
    const layout = layoutWith([
      {
        id: "ask",
        type: "form",
        visibility: "everyone",
        title: "Book a trial",
        send_to: "email",
        fields: [
          { id: "name", kind: "text", label: "Name", required: true },
          { id: "email", kind: "email", label: "Email", required: true },
          { id: "phone", kind: "phone", label: "Phone", required: false },
          { id: "age", kind: "number", label: "Age", required: false },
          { id: "day", kind: "choice", label: "Day", required: true, options: ["Saturday", "Sunday"] },
        ],
      },
      { id: "chat", type: "form", visibility: "everyone", send_to: "chat", fields: [{ id: "q", kind: "long_text", label: "Question", required: true }] },
    ]);
    expect((await publishLayout(store, app, layout, "owner@lale.test", NOW)).ok).toBe(true);
    const sent: unknown[] = [];
    const post = async (path: string, answers: unknown, extra: Partial<HostedContext> = {}, headers: Record<string, string> = {}) => {
      const result = await handleHosted({ ...context(), onFormAnswers: async (input) => void sent.push(input), ...extra }, { method: "POST", path: path.split("/").filter(Boolean), query: new URLSearchParams(), body: { answers }, token: null, headers: new Headers(headers) });
      // 202 has no body to check.
      if (result.status !== 202) expectContract("POST", "/forms/{slug}/{block_id}", result);
      return result;
    };
    const wrong = await post("/forms/home/ask", { name: " ", email: "nope", phone: "12", age: "ten", day: "Monday" }, {}, { "accept-language": "ar" });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toMatchObject({ code: "invalid_answers", details: { fields: { name: "يُرجى تعبئة هذا الحقل.", email: "أدخل بريدًا إلكترونيًا صحيحًا.", phone: "أدخل رقم هاتف صحيحًا.", age: "أدخل رقمًا.", day: "اختر أحد الخيارات." } } });
    expect(sent).toEqual([]);

    const ok = await post("/forms/home/ask", { name: "Ayşe", email: "ayse@example.com", day: "Sunday", unknown: "ignored" });
    expect(ok.status).toBe(202);
    expect(sent).toEqual([{ title: "Book a trial", lines: [{ label: "Name", value: "Ayşe" }, { label: "Email", value: "ayse@example.com" }, { label: "Day", value: "Sunday" }], user: null, replyTo: "ayse@example.com" }]);

    expect((await post("/forms/home/chat", { q: "Hi" })).status).toBe(400);
    expect((await post("/forms/home/missing", { q: "Hi" })).status).toBe(404);
    expect((await post("/forms/home/ask", { name: "A", email: "a@example.com", day: "Saturday" }, { onFormAnswers: async () => Promise.reject(new Error("smtp")) })).status).toBe(503);
    // 5 answers a minute from one address.
    for (let i = 0; i < 3; i++) expect((await post("/forms/home/ask", { name: "A", email: "a@example.com", day: "Saturday" })).status).toBe(202);
    const limited = await post("/forms/home/ask", { name: "A", email: "a@example.com", day: "Saturday" });
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ code: "rate_limited" });
  });

  it("83.3 the team's switches leave out the side menu, own icons and looks, and /config says which are off", async () => {
    const icon = "https://yallapp.test/m/icon-star.png";
    const layout = layoutWith(
      [
        { id: "hello", type: "text", visibility: "everyone", html: "<p>Hello</p>", look: { background: "tint", spacing: "large" } },
        { id: "links", type: "quick_links", visibility: "everyone", style: "grid", links: [{ icon: "star", icon_url: icon, label: "Offers", action: { type: "page", page_slug: "home" } }] },
      ],
      { menu: [{ id: "about", label: "About us", icon: "info", icon_url: icon, target: { type: "page", page_slug: "home" } }] },
    );
    expect((await publishLayout(store, app, layout, "owner@lale.test", NOW)).ok).toBe(true);
    const on = await call("/pages");
    expect((on.body as { menu: unknown[] }).menu).toHaveLength(1);
    const config = async () => (await call("/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { switches: Record<string, boolean> };
    expect((await config()).switches).toEqual({ chat: true, side_menu: true, block_looks: true, own_icons: true });

    app = { ...app, switches: { side_menu: false, own_icons: false, block_looks: false } };
    const off = await call("/pages");
    expect((off.body as { menu: unknown[] }).menu).toEqual([]);
    // A new version, so the app's cached copy isn't reused.
    expect((off.body as { version: string }).version).not.toBe((on.body as { version: string }).version);
    const served = ((await call("/pages/{slug}", { params: ["home"] })).body as { blocks: { id: string; look?: unknown; links?: { icon_url?: string }[] }[] }).blocks;
    expect(served.find((b) => b.id === "hello")).not.toHaveProperty("look");
    expect(served.find((b) => b.id === "links")!.links![0]).not.toHaveProperty("icon_url");
    expect((await config()).switches).toEqual({ chat: true, side_menu: false, block_looks: false, own_icons: false });
  });

  it("82.5 checks the look, the icons' addresses and the side menu", () => {
    const bad = parse(
      layoutWith([{ id: "x", type: "text", visibility: "everyone", html: "<p>x</p>", look: { background: "neon", spacing: "huge" } }], {
        menu: Array.from({ length: 13 }, (_, i) => ({ id: `m${i}`, label: `Entry ${i}`, icon: "info", icon_url: "http://insecure.test/i.png", target: { type: "page", page_slug: "home" } })),
      }),
    );
    expect(bad.ok).toBe(false);
    const errors = bad.ok ? [] : bad.errors.join("\n");
    expect(errors).toContain("choose the background from the list.");
    expect(errors).toContain("choose the spacing from the list.");
    expect(errors).toContain("the side menu can have at most 12 entries.");
    expect(errors).toContain("Menu entry 1: The icon's picture address must be a full https address.");
    // No menu: none stored.
    const none = parse(layoutWith([], { menu: [] }));
    expect(none.ok && none.value).not.toHaveProperty("menu");
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
    expect(seen).toEqual([{ ctx: { appId: app.id, userId: null, lang: "ar", store, now }, query: { category_id: null, featured: false, sort: "newest", limit: 2, ids: [] } }]);
  });

  it("fills listings blocks from the office's published listings", async () => {
    app = { ...app, appType: "real_estate", connector: { kind: "listings" } };
    await store.updateApp(app.id, { appType: "real_estate", connector: { kind: "listings" } }, NOW);
    registerPlatformItemSources();
    const base = {
      appId: app.id, reference: null, description: "", purpose: "sale" as const, type: "apartment", priceCents: 4_250_000_00, currency: "EGP",
      pricePeriod: null, negotiable: false, city: "Cairo", district: "Maadi", address: null, latitude: null, longitude: null, area: 185,
      bedrooms: 3, bathrooms: 2, floor: null, yearBuilt: null, furnished: null, features: [], imageAssetIds: [], videoUrl: null, featured: false,
    };
    const flat = await store.createListing({ ...base, title: "Flat in Maadi", status: "published", publishedAt: NOW }, NOW);
    await store.createListing({ ...base, title: "Draft villa", status: "draft", publishedAt: null }, NOW);
    await publishLayout(
      store,
      app,
      layoutWith([{ id: "new", type: "items", visibility: "everyone", source: "listings", layout: "list", query: { sort: "newest", limit: 5 } }]),
      "office@nile.test",
      NOW,
    );
    const page = (await call("/pages/{slug}", { params: ["home"] })).body as { blocks: Record<string, unknown>[] };
    expect(page.blocks[0]).toMatchObject({
      source: "listings",
      items: [{ source: "listings", id: String(flat.id), title: "Flat in Maadi", subtitle: "Maadi · 185 m²", price_label: "EGP 4,250,000" }],
    });
    expect(page.blocks[0]?.items).toHaveLength(1);
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

describe("99.3 the editor's new settings, checked", () => {
  it("keeps a block's look only where it differs, and refuses values not on the lists", () => {
    const ok = parse(layoutWith([{ id: "a", type: "text", visibility: "everyone", html: "<p>A</p>", look: { background: "none", spacing: "medium", align: "end", corners: "sharp" } }]));
    expect(ok.ok && ok.value.pages[0]!.blocks[0]!.look).toEqual({ background: "none", spacing: "medium", align: "end", corners: "sharp" });
    const bad = parse(layoutWith([{ id: "a", type: "text", visibility: "everyone", html: "<p>A</p>", look: { background: "none", spacing: "medium", text_size: "huge" } }]));
    expect(bad.ok ? [] : bad.errors.join(" ")).toContain("choose the text size from the list.");
  });

  it("keeps when a block shows: dates with a zone in order, Android or iPhone, the app's languages; none when it always shows", () => {
    const at = (show: unknown) => parse(layoutWith([{ id: "a", type: "text", visibility: "everyone", html: "<p>A</p>", show }]));
    const ok = at({ from: "2026-11-01T09:00:00.000Z", until: "2026-11-02T09:00:00+03:00", platforms: ["ios"], languages: ["ar"] });
    expect(ok.ok && ok.value.pages[0]!.blocks[0]!.show).toEqual({ from: "2026-11-01T09:00:00Z", until: "2026-11-02T06:00:00Z", platforms: ["ios"], languages: ["ar"] });
    // Both platforms, every language, nothing set: always.
    const always = at({ from: null, until: "", platforms: ["android", "ios"], languages: ["en", "ar"] });
    expect(always.ok && always.value.pages[0]!.blocks[0]).not.toHaveProperty("show");
    const errors = (show: unknown) => {
      const r = at(show);
      return r.ok ? "" : r.errors.join(" ");
    };
    expect(errors({ from: "2026-11-02T09:00:00Z", until: "2026-11-01T09:00:00Z" })).toContain("the end must come after the start.");
    expect(errors({ from: "next week" })).toContain("The start must be a date and time.");
    expect(errors({ from: "2026-11-01T09:00" })).toContain("The start must be a date and time.");
    expect(errors({ platforms: ["web"] })).toContain("choose Android, iPhone or both.");
    expect(errors({ languages: ["fr"] })).toContain("choose languages the app has.");
  });

  it("keeps a page's background and header picture, and refuses a picture that isn't https", () => {
    const page = (extra: Record<string, unknown>) => parse(layoutWith([], { pages: [{ slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), blocks: [], ...extra }] }));
    const ok = page({ background: "surface", header_image_url: "https://yallapp.test/m/top.jpg" });
    expect(ok.ok && ok.value.pages[0]).toMatchObject({ background: "surface", header_image_url: "https://yallapp.test/m/top.jpg" });
    const none = page({ background: "none", header_image_url: null });
    expect(none.ok && none.value.pages[0]).not.toHaveProperty("background");
    expect(none.ok && none.value.pages[0]).not.toHaveProperty("header_image_url");
    expect(page({ header_image_url: "http://yallapp.test/m/top.jpg" }).ok).toBe(false);
    expect(page({ background: "primary" }).ok).toBe(false);
  });
});

describe("99.4 the new blocks, checked", () => {
  const one = (block: Record<string, unknown>) => parse(layoutWith([{ id: "b", visibility: "everyone", ...block }]));
  const errors = (block: Record<string, unknown>) => {
    const r = one(block);
    return r.ok ? "" : r.errors.join(" ");
  };

  it("keeps good cards, photos, a place, a divider and a form", () => {
    for (const block of [
      { type: "cards", columns: 3, cards: [{ title: "A", text: null, image_url: null, action: null }] },
      { type: "gallery", columns: 2, images: [{ image_url: "https://yallapp.test/m/1.jpg", caption: null }] },
      { type: "map", latitude: 30.0444, longitude: 31.2357, name: "Cairo", address: null },
      { type: "divider", style: "dashed" },
      { type: "form", send_to: "chat", fields: [{ id: "pick", kind: "choice", label: "Pick", required: false, options: ["A", "B"] }] },
    ]) {
      const r = one(block);
      expect(r.ok ? null : r.errors, block.type).toBeNull();
    }
  });

  it("refuses what the app couldn't show or send", () => {
    expect(errors({ type: "cards", cards: [] })).toContain("add a card.");
    expect(errors({ type: "cards", cards: [{ title: "" }] })).toContain("add a title");
    expect(errors({ type: "gallery", images: [{ image_url: "http://yallapp.test/1.jpg" }] })).toContain("https");
    expect(errors({ type: "map", latitude: 0, longitude: 0 })).toContain("enter the place's latitude and longitude.");
    expect(errors({ type: "map", latitude: 95, longitude: 10 })).toContain("the latitude must be a number from -90 to 90.");
    expect(errors({ type: "form", send_to: "fax", fields: [{ id: "a", kind: "text", label: "A" }] })).toContain("choose where the answers go.");
    expect(errors({ type: "form", send_to: "email", fields: [{ id: "a", kind: "text", label: "A" }, { id: "a", kind: "text", label: "B" }] })).toContain("two fields have the same ID.");
    expect(errors({ type: "form", send_to: "email", fields: [{ id: "a", kind: "choice", label: "A", options: ["Only"] }] })).toContain("give 2 to 10 choices.");
    expect(errors({ type: "form", send_to: "email", fields: [{ id: "a", kind: "date", label: "A" }] })).toContain("choose the kind of answer.");
  });
});
