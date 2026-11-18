import { describe, expect, it, vi } from "vitest";
import { checkPasses, checkRoutes, claimAppCheck, appCheckResultSchema, appCheckShown, saveAppCheckResult, CHECK_ROUTES_MAX, CHECK_STALE_MS } from "@/lib/builds/app-check-run";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Build } from "@/lib/data/types";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { previewKey, verifyPreviewToken } from "@/lib/preview/token";
import { appCheckable, checkLanguages, errorsKeyOf, fixHref, reportOf, runAppCheck } from "@/lib/studio/app-check";
import { appCheckAlertKey, tellAppCheck } from "@/lib/studio/app-check-alerts";
import { checkAppOrNull } from "@/lib/studio/app-check-env";
import {
  APP_CHECK_RULES,
  RULE_SEVERITY,
  categoryProblems,
  emptyListProblems,
  isPlaceholderText,
  labelAloneProblems,
  missingPhotoProblems,
  pageLoadProblems,
  placeholderProblems,
  priceProblems,
  sampleDataProblems,
  sampleValues,
  tapProblems,
  templateWordProblems,
  untranslatedProblems,
  type AppProblem,
  type CheckedApp,
} from "@/lib/studio/app-check-rules";
import { updateNode } from "@/lib/studio/edit";
import { en as checkWords, ar as checkWordsAr, tr as checkWordsTr } from "@/i18n/dashboard/app-check";
import { CHECK_NOW, checkDeps, checkProject, publishAs } from "./support/app-check-project";

/**
 * 182 The app check: each rule's error and warning, with the Leqaa QA's bugs
 * (roadmap 152, 156, 157, 161, 164) as fixtures so none can come back
 * unseen; the check on a real project made from Leqaa's template, read
 * through the hosted API in English, Arabic and Turkish; what tells the
 * team and the owner; and the check after a build (the pipeline's side).
 */

vi.useFakeTimers({ toFake: ["Date"], now: CHECK_NOW });
vi.spyOn(console, "error").mockImplementation(() => undefined);

const SHOP: Pick<App, "appType" | "vertical" | "backend" | "connector"> = { appType: "store", vertical: null, backend: "hosted", connector: null } as Pick<App, "appType" | "vertical" | "backend" | "connector">;

function node(type: string, id: string, extra: Record<string, unknown> = {}): StudioNode {
  return { type, id, ...extra } as unknown as StudioNode;
}

function page(slug: string, children: StudioNode[], screen: string | null = null): CheckedApp["pages"][number] {
  const studio = { body: node("column", `${slug}-body`, { children }) } as StudioPage;
  return { slug, screen, studio, result: { status: 200, body: { title: slug, studio } } };
}

function app(lang: string, pages: CheckedApp["pages"], navigation: Record<string, unknown> = {}): CheckedApp {
  return { lang, navigation: { tabs: [{ id: "home", label: "Home", target: { type: "page", page_slug: "home" } }], ...navigation, pages: pages.map((p) => ({ slug: p.slug })) }, pages };
}

const STORE: Pickable = {
  items: { products: [{ id: "11", title: "Blush Garden" }, { id: "12", title: "White Lily" }] },
  categories: { products: [{ id: "4", name: "Roses" }] },
};

describe("182 the rules and their severities", () => {
  it("names each rule's severity: what the customer sees broken is an error", () => {
    expect(APP_CHECK_RULES.filter((r) => RULE_SEVERITY[r] === "error")).toEqual(["page_load", "placeholder", "dead_tap", "tap_page", "tap_screen", "tap_entry", "tap_url", "tap_unknown", "category", "empty_list", "price", "sample_data", "label_alone"]);
    expect(APP_CHECK_RULES.filter((r) => RULE_SEVERITY[r] === "warning")).toEqual(["written_price", "untranslated", "template_word", "missing_photo"]);
  });

  it("has the owner's sentence for every rule in English, Egyptian Arabic and Turkish", () => {
    for (const words of [checkWords, checkWordsAr, checkWordsTr]) for (const rule of APP_CHECK_RULES) expect((words as Record<string, unknown>)[rule], rule).toBeTypeOf("string");
    expect(checkWordsAr.dead_tap).toContain("مش بيفتح");
  });
});

describe("182 placeholders (156: the brackets on an Arabic phone)", () => {
  it("is an error to show a [placeholder] or lorem ipsum, in any language", () => {
    const ar = app("ar", [page("home", [node("text", "review", { text: "[رأي أحد العملاء فيك]" }), node("text", "fill", { text: "Lorem ipsum dolor sit amet" })])]);
    const found = placeholderProblems(ar);
    expect(found.map((p) => [p.severity, p.rule, p.lang, p.page, p.element])).toEqual([
      ["error", "placeholder", "ar", "home", "review"],
      ["error", "placeholder", "ar", "home", "fill"],
    ]);
    expect(found[0]!.values.text).toBe("[رأي أحد العملاء فيك]");
  });

  it("finds one in a tab's label, and leaves numbers in brackets and Studio's layer names alone", () => {
    const en = app("en", [page("home", [node("text", "n", { text: "Step [1] of 3", name: "[Layer]" })])], { tabs: [{ id: "shop", label: "[Shop name]", target: { type: "page", page_slug: "home" } }] });
    expect(placeholderProblems(en).map((p) => p.element)).toEqual(["tab:shop"]);
    for (const text of ["[Customer name]", "[اسم العميل]", "[Müşteri adı]", "Order before [your cut-off time]"]) expect(isPlaceholderText(text), text).toBe(true);
    for (const text of ["Blush Garden", "2 / 5", "[1]"]) expect(isPlaceholderText(text), text).toBe(false);
  });
});

describe("182 taps (152: our bouquet's chips; 161: a story's Open)", () => {
  it("is an error when a button or a story opens nothing", () => {
    const en = app("en", [page("home", [node("button", "chip", { label: "Roses" }), node("stories", "stories", { slides: [{ heading: "New in" }] }), node("button", "ok", { label: "Shop", action: { type: "screen", screen: "search" } })])]);
    expect(tapProblems(SHOP, en, STORE).map((p) => [p.rule, p.element, p.severity])).toEqual([
      ["dead_tap", "chip", "error"],
      ["dead_tap", "stories", "error"],
    ]);
  });

  it("is an error to open a page that isn't served, a screen the app hasn't, an entry the store hasn't, or an address that isn't one", () => {
    const en = app("en", [
      page("home", [
        node("button", "p", { label: "Offers", action: { type: "page", page_slug: "offers" } }),
        node("button", "s", { label: "Rides", action: { type: "screen", screen: "ride" } }),
        node("button", "i", { label: "Our bouquet", action: { type: "item", item: { source: "products", id: "99" } } }),
        node("button", "u", { label: "Site", action: { type: "url", url: "www.example" } }),
        node("button", "good", { label: "Blush", action: { type: "item", item: { source: "products", id: "11" } } }),
        node("button", "out", { label: "Sign out", action: { type: "sign_out" } }),
      ]),
    ]);
    expect(tapProblems(SHOP, en, STORE).map((p) => [p.rule, p.element])).toEqual([
      ["tap_page", "p"],
      ["tap_screen", "s"],
      ["tap_entry", "i"],
      ["tap_url", "u"],
    ]);
  });

  it("doesn't call an entry missing when the store's list read is only its first 50", () => {
    const many: Pickable = { items: { products: Array.from({ length: 50 }, (_, i) => ({ id: String(i + 1), title: `P${i}` })) }, categories: {} };
    const en = app("en", [page("home", [node("button", "i", { label: "Far one", action: { type: "item", item: { source: "products", id: "900" } } })])]);
    expect(tapProblems(SHOP, en, many)).toEqual([]);
  });
});

describe("182 categories (157: the template's categories are the shop's)", () => {
  it("is an error to show or filter by a category the store hasn't", () => {
    const served = app("en", [page("home", [node("categories", "cats", { source: "products", categories: [{ id: "4", name: "Roses" }, { id: "77", name: "Sympathy" }] })])]);
    const draft = { pages: [{ slug: "home", studio: { body: node("column", "b", { children: [node("items", "list", { source: "products", query: { category_id: "88" } })] }) } }] } as unknown as LayoutContent;
    expect(categoryProblems(draft, served, STORE).map((p) => [p.rule, p.element, p.values.target])).toEqual([
      ["category", "list", "88"],
      ["category", "cats", "Sympathy"],
    ]);
  });
});

describe("182 bound lists (164: \"Picked for you\" over nothing)", () => {
  const draft = { pages: [{ slug: "wishlist", studio: { body: node("column", "b", { children: [node("text", "title", { text: "اخترناها لك" }), node("items", "picked", { source: "products", name: "Picked for you" })] }) } }] } as unknown as LayoutContent;

  it("is an error when the list is served empty", () => {
    const served = app("ar", [page("wishlist", [node("text", "title", { text: "اخترناها لك" }), node("items", "picked", { source: "products", items: [] })])]);
    expect(emptyListProblems(draft, served).map((p) => [p.severity, p.rule, p.element, p.lang])).toEqual([["error", "empty_list", "picked", "ar"]]);
  });

  it("is an error when the list is left out but its title stays", () => {
    const served = app("ar", [page("wishlist", [node("text", "title", { text: "اخترناها لك", heads: "picked" })])]);
    expect(emptyListProblems(draft, served).map((p) => [p.rule, p.element])).toEqual([["empty_list", "title"]]);
  });

  it("is fine filled, or left out with its title", () => {
    expect(emptyListProblems(draft, app("ar", [page("wishlist", [node("text", "title", { text: "x" }), node("items", "picked", { source: "products", items: [{ id: "11" }] })])]))).toEqual([]);
    expect(emptyListProblems(draft, app("ar", [page("wishlist", [])]))).toEqual([]);
  });
});

describe("182 prices (161: the whole app in the customer's currency)", () => {
  it("is an error for an entry priced only as a text; a price written in an element's words is a warning", () => {
    const served = app("en", [
      page("home", [
        node("items", "list", {
          source: "products",
          items: [
            { id: "11", title: "Blush Garden", price_label: "₺590.00" },
            { id: "12", title: "White Lily", price_label: "₺450.00", price: { amount: "450.00", currency: "TRY", display: { currency: "USD" } } },
          ],
        }),
        node("text", "promo", { text: "Bouquets from ₺590" }),
        node("text", "fine", { text: "Free delivery over 2 km" }),
      ]),
    ]);
    const found = priceProblems(served);
    expect(found.map((p) => [p.severity, p.rule, p.element])).toEqual([
      ["error", "price", "list"],
      ["warning", "written_price", "promo"],
    ]);
    expect(found[0]!.values.entry).toBe("Blush Garden");
    // The guard asks for a price in the customer's currency too.
    expect(priceProblems(app("en", [page("home", [node("items", "l", { items: [{ id: "1", price_label: "x", price: { amount: "1.00", currency: "TRY" } }] })])]), "USD").map((p) => p.rule)).toEqual(["price"]);
  });
});

describe("182 pages that don't load, missing photos, template words", () => {
  it("is an error when a page the navigation lists doesn't load", () => {
    const served = app("tr", [page("home", []), { slug: "offers", screen: null, studio: null, result: { status: 500 } }]);
    expect(pageLoadProblems(served).map((p) => [p.severity, p.page, p.values.status])).toEqual([["error", "offers", "500"]]);
  });

  it("warns of an empty photo, not of one bound to its entry", () => {
    const served = app("en", [page("home", [node("image", "empty"), node("image", "bound", { bind: { field: "image" } }), node("image", "ok", { image_url: "https://x.test/a.jpg" }), node("gallery", "g", { images: [{ image_url: "" }] })])]);
    expect(missingPhotoProblems(served).map((p) => [p.severity, p.element])).toEqual([
      ["warning", "empty"],
      ["warning", "g"],
    ]);
  });

  it("warns of a demo's name left in a business's app, never in the demo itself", () => {
    const served = app("en", [page("home", [node("text", "brand", { text: "Welcome to Leqaa" }), node("text", "lale", { text: "Lale Flowers, since 1990" }), node("items", "l", { items: [{ id: "1", title: "Leqaa box" }] })])]);
    expect(templateWordProblems({ appName: "Rose Corner" }, served).map((p) => [p.severity, p.element])).toEqual([
      ["warning", "brand"],
      ["warning", "lale"],
    ]);
    expect(templateWordProblems({ appName: "Leqaa", demo: true }, served)).toEqual([]);
  });

  it("warns of the owner's text shown as it is in another of the app's languages", () => {
    const en = app("en", [page("home", [node("text", "review", { text: "The best flowers in town, every time" }), node("text", "name", { text: "Rose Corner" }), node("text", "num", { text: "24/7" })])]);
    const ar = app("ar", [page("home", [node("text", "review", { text: "The best flowers in town, every time" }), node("text", "name", { text: "Rose Corner" }), node("text", "num", { text: "24/7" })])]);
    const found = untranslatedProblems(en, ar, "Rose Corner");
    expect(found.map((p) => [p.severity, p.rule, p.lang, p.element])).toEqual([["warning", "untranslated", "ar", "review"]]);
    expect(untranslatedProblems(en, en)).toEqual([]);
  });
});

describe("182 a template's or a demo's own data where the business's belongs (176–179)", () => {
  it("collects the sample values from the templates' and demos' own words, in each language", () => {
    const known = sampleValues();
    for (const text of ["Hannah Clarke", "Deniz Kaya", "FRESH15", "ZAD20", "Delivery EGP 25", "Open every day from 08:00 to 23:00. Pickup in Moda, delivery in Kadıköy.", "Free delivery on orders over ₺1,500.", "Parents' evening for Grade 5 in the main hall"]) expect(known.has(text), text).toBe(true);
    expect([...known].some((t) => /[\u0600-\u06FF]/.test(t))).toBe(true);
    for (const text of ["See all", "Start now", "Shop by category", "Welcome to {app}"]) expect(known.has(text), text).toBe(false);
  });

  it("is an error to show one as an element's words, a whole text or one of its lines; not a store's own entry, not in a demo", () => {
    const served = app("en", [
      page("home", [
        node("text", "teacher", { text: "Hannah Clarke" }),
        node("coupon", "code", { title: "FRESH15" }),
        node("marquee", "ticker", { text: "Sports day\nParents' evening for Grade 5 in the main hall" }),
        node("text", "welcome", { text: "Open every day from 08:00 to 23:00. Pickup in Moda, delivery in Kadıköy." }),
        node("items", "list", { items: [{ id: "1", title: "Hannah Clarke" }] }),
        node("text", "own", { text: "Our teachers, every day" }),
      ]),
    ]);
    expect(sampleDataProblems({}, served).map((p) => [p.severity, p.rule, p.element])).toEqual([
      ["error", "sample_data", "teacher"],
      ["error", "sample_data", "code"],
      ["error", "sample_data", "ticker"],
      ["error", "sample_data", "welcome"],
    ]);
    expect(sampleDataProblems({ demo: true }, served)).toEqual([]);
  });

  it("is an error when a label or icon is left alone once its placeholder value was dropped", () => {
    const row = (children: StudioNode[]) => node("row", "deliver", { children });
    const draft = { pages: [{ slug: "home", studio: { body: node("column", "b", { children: [row([node("text", "label", { text: "Deliver to" }), node("text", "value", { text: "[Your address]" }), node("icon", "chev")])] }) } }] } as unknown as LayoutContent;
    const alone = app("en", [page("home", [row([node("text", "label", { text: "Deliver to" }), node("icon", "chev")])])]);
    expect(labelAloneProblems(draft, alone).map((p) => [p.severity, p.rule, p.element, p.values.text])).toEqual([["error", "label_alone", "deliver", "Deliver to"]]);
    const filled = app("en", [page("home", [row([node("text", "label", { text: "Deliver to" }), node("text", "value", { text: "12 Nile St" }), node("icon", "chev")])])]);
    expect(labelAloneProblems(draft, filled)).toEqual([]);
    expect(labelAloneProblems(draft, app("en", [page("home", [])]))).toEqual([]);
    // A list's title the servers mark goes with its list on the phone.
    expect(labelAloneProblems(draft, app("en", [page("home", [row([node("text", "label", { text: "Deliver to", heads: "list" })])])]))).toEqual([]);
  });
});

describe("182 the check fails open", () => {
  const appOf = { id: "1c9d3f42-6c51-4f7e-9d0a-3a1e2b4c5d6e", appName: "Rose Corner" } as App;

  it("lets Publish and the build go ahead when the checker throws, and tells the team", async () => {
    const store = new MemoryStore();
    const report = await checkAppOrNull(store, appOf, { draft: true }, CHECK_NOW, { check: async () => { throw new Error("boom"); }, mail: null });
    expect(report).toBeNull();
    const alerts = await store.listTeamAlerts({ open: true, limit: 10 });
    expect(alerts.map((a) => [a.kind, a.key])).toEqual([["app_check", `app_check_failed:${appOf.id}`]]);
    expect(alerts[0]!.detail).toContain("On Publish: Error: boom");
  });

  it("and when it takes too long", async () => {
    vi.useRealTimers();
    try {
      const store = new MemoryStore();
      const report = await checkAppOrNull(store, appOf, { draft: false }, CHECK_NOW, { check: () => new Promise(() => undefined), timeoutMs: 50, mail: null });
      expect(report).toBeNull();
      expect((await store.listTeamAlerts({ open: true, limit: 10 }))[0]!.detail).toContain("Before a build: Error: The check took longer than 0 s.");
    } finally {
      vi.useFakeTimers({ toFake: ["Date"], now: CHECK_NOW });
    }
  });
});

describe("182 the report", () => {
  it("counts each problem once, errors first, with a fingerprint of the errors only", () => {
    const p = (rule: AppProblem["rule"], element: string): AppProblem => ({ severity: RULE_SEVERITY[rule], rule, lang: "en", page: "home", element, path: `/pages/home ${element}`, values: {} });
    const report = reportOf([p("untranslated", "a"), p("dead_tap", "b"), p("dead_tap", "b")], ["en"], CHECK_NOW);
    expect(report.problems.map((x) => x.rule)).toEqual(["dead_tap", "untranslated"]);
    expect([report.errors, report.warnings]).toEqual([1, 1]);
    expect(report.errorsKey).toBe(errorsKeyOf([p("dead_tap", "b")]));
    expect(reportOf([p("untranslated", "a")], ["en"], CHECK_NOW).errorsKey).toBe("");
  });

  it("links Fix to Studio on the element, its page and language; the tabs for a tab", () => {
    expect(fixHref({ page: "wishlist", element: "picked", lang: "ar" })).toBe("/studio/editor?page=wishlist&select=picked&lang=ar");
    expect(fixHref({ page: null, element: "tab:shop", lang: null })).toBe("/studio/editor?select=tabs");
  });

  it("reads the main language first and checks only apps Yallapp serves", () => {
    expect(checkLanguages({ languages: { default: "ar", available: ["en", "ar", "tr"] } } as LayoutContent)).toEqual(["ar", "en", "tr"]);
    expect(appCheckable({ backend: "hosted" })).toBe(true);
    expect(appCheckable({ backend: "wordpress" })).toBe(false);
  });
});

describe("182 the check on a real project, Leqaa's template", () => {
  it("reads it in en, ar and tr; finds a button the owner left with nothing to open, and no longer once it's fixed", async () => {
    const p = await checkProject("flowers_signature_a");
    const first = await runAppCheck(checkDeps(p), { app: p.app, layout: p.draft }, CHECK_NOW);
    expect(first.langs).toEqual(["en", "ar", "tr"]);
    // What the template itself has is phase182-templates.test.ts's: here, only what the owner changes.
    const before = first.errorsKey;

    // The owner adds a button on Home and publishes without choosing what it opens.
    const home = p.draft.pages.find((pg) => pg.slug === "home")!;
    const body = home.studio!.body;
    const broken = { ...p.draft, pages: p.draft.pages.map((pg) => (pg.slug === "home" ? { ...pg, studio: updateNode(pg.studio!, body.id, { children: [...(body.children ?? []), node("button", "n182dead", { label: "Order now", text: "Order now" })] }) } : pg)) };
    await publishAs(p, broken as LayoutContent);
    const second = await runAppCheck(checkDeps(p), { app: p.app, layout: p.draft }, CHECK_NOW);
    const dead = second.problems.filter((x) => x.rule === "dead_tap");
    expect(dead.map((x) => [x.severity, x.page, x.element])).toEqual([["error", "home", "n182dead"]]);
    expect(fixHref(dead[0]!)).toBe("/studio/editor?page=home&select=n182dead");

    // Fixed: it opens the shop.
    const fixed = { ...p.draft, pages: p.draft.pages.map((pg) => (pg.slug === "home" ? { ...pg, studio: updateNode(pg.studio!, "n182dead", { action: { type: "screen", screen: "search" } }) } : pg)) };
    await publishAs(p, fixed as LayoutContent);
    const third = await runAppCheck(checkDeps(p), { app: p.app, layout: p.draft }, CHECK_NOW);
    expect(third.problems.filter((x) => x.rule === "dead_tap")).toEqual([]);
    expect(third.errorsKey).toBe(before);
  }, 60_000);

  it("finds a placeholder of the owner's own that the servers don't know", async () => {
    const p = await checkProject("shop");
    const home = p.draft.pages.find((pg) => pg.slug === "home")!;
    const body = home.studio!.body;
    const layout = { ...p.draft, pages: p.draft.pages.map((pg) => (pg.slug === "home" ? { ...pg, studio: updateNode(pg.studio!, body.id, { children: [...(body.children ?? []), node("text", "n182ph", { text: "Call us on [your number]" })] }) } : pg)) };
    await publishAs(p, layout as LayoutContent);
    const report = await runAppCheck(checkDeps(p), { app: p.app, layout: p.draft }, CHECK_NOW);
    expect(report.problems.filter((x) => x.rule === "placeholder" && x.element === "n182ph").map((x) => x.lang).sort()).toEqual(["ar", "en", "tr"]);
  }, 60_000);
});

describe("182 telling the team and the owner (automatic builds, apps made before)", () => {
  const appOf = { id: "0b9d3f42-6c51-4f7e-9d0a-3a1e2b4c5d6e", appName: "Rose Corner", demo: false } as App;
  const error = (element: string): AppProblem => ({ severity: "error", rule: "dead_tap", lang: null, page: "home", element, path: `/pages/home ${element}`, values: {} });

  it("raises one alert per set of errors and emails the owner once for it; a new set replaces it; none closes it", async () => {
    const store = new MemoryStore();
    const owner = vi.fn(async () => undefined);
    const deps = { store, now: CHECK_NOW, ownerMail: owner };
    const one = reportOf([error("a")], ["en"], CHECK_NOW);
    expect(await tellAppCheck(deps, appOf, one)).toBe("raised");
    expect(await tellAppCheck({ ...deps, now: new Date(CHECK_NOW.getTime() + 3_600_000) }, appOf, one)).toBe("seen");
    expect(owner).toHaveBeenCalledTimes(1);
    const open = await store.listTeamAlerts({ open: true, limit: 10 });
    expect(open.map((a) => [a.kind, a.key, a.count])).toEqual([["app_check", appCheckAlertKey(appOf.id, one.errorsKey), 2]]);
    expect(open[0]!.link).toBe(`/admin/app-check?app=${appOf.id}`);

    const two = reportOf([error("a"), error("b")], ["en"], CHECK_NOW);
    expect(await tellAppCheck(deps, appOf, two)).toBe("raised");
    expect(owner).toHaveBeenCalledTimes(2);
    expect((await store.listTeamAlerts({ open: true, limit: 10 })).map((a) => a.key)).toEqual([appCheckAlertKey(appOf.id, two.errorsKey)]);

    expect(await tellAppCheck(deps, appOf, reportOf([], ["en"], CHECK_NOW))).toBe("clean");
    expect(await store.listTeamAlerts({ open: true, limit: 10 })).toEqual([]);
  });
});

describe("182 the check after a build (pipeline)", () => {
  async function built(languages = { default: "en", available: ["en", "ar", "tr"] }) {
    const p = await checkProject("shop");
    const layout = { ...p.draft, languages: { ...p.draft.languages, ...languages } };
    await p.store.saveAppLayout({ ...(await p.store.getAppLayout(p.app.id))!, published: { version: "v1", ...layout } } as never);
    const build = await p.store.createBuild({
      id: "6f1c2d3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f",
      clientId: p.app.clientId,
      appId: p.app.id,
      variant: "app",
      versionName: "1.0.1",
      status: "building",
      stages: { queued: "done", android: "running", ios: "skipped", upload_play: "pending", upload_testflight: "skipped" },
      config: {} as Build["config"],
      storeListing: {} as Build["storeListing"],
      autoPublish: true,
      artifacts: [],
      message: null,
      logUrl: null,
      createdAt: CHECK_NOW,
      startedAt: CHECK_NOW,
      finishedAt: null,
      updatedAt: CHECK_NOW,
    } as Omit<Build, "number" | "versionCode">);
    return { p, build };
  }

  it("checks the main language at 1.0 and Arabic (else another, else the main one) at 1.3", () => {
    const l = (d: string, a: string[]) => ({ languages: { default: d, available: a } }) as LayoutContent;
    expect(checkPasses(l("en", ["en", "tr", "ar"]))).toEqual([{ lang: "en", scale: 1 }, { lang: "ar", scale: 1.3 }]);
    expect(checkPasses(l("tr", ["tr", "en"]))).toEqual([{ lang: "tr", scale: 1 }, { lang: "en", scale: 1.3 }]);
    expect(checkPasses(l("ar", ["ar"]))).toEqual([{ lang: "ar", scale: 1 }, { lang: "ar", scale: 1.3 }]);
  });

  it("opens Home, every page, the screens of the tabs and the kind's lists, at most 40", () => {
    const routes = checkRoutes({ appType: "store" }, { pages: [{ slug: "home" }, { slug: "wishlist" }, { slug: "our bouquet" }], tabs: [{ id: "cart", target: { type: "screen", screen: "cart" } }, { id: "acc", target: { type: "screen", screen: "account" } }], menu: [] } as unknown as LayoutContent);
    expect(routes).toEqual(["/", "/page/wishlist", "/page/our%20bouquet", "/cart", "/account", "/shop"]);
    const many = checkRoutes({ appType: "store" }, { pages: Array.from({ length: 60 }, (_, i) => ({ slug: `p${i}` })), tabs: [], menu: [] } as unknown as LayoutContent);
    expect(many.length).toBe(CHECK_ROUTES_MAX);
  });

  it("claims with a read-only preview link in check mode, then keeps what was found on the build and tells the team", async () => {
    const { p, build } = await built();
    const claimed = await claimAppCheck(p.store, build, CHECK_NOW, { url: "https://yallapp.test/", signingSecret: "s3cret" });
    if (!claimed.ok) throw new Error(claimed.message);
    const url = new URL(claimed.plan.preview_url);
    expect(url.pathname).toBe("/preview-app/index.html");
    expect(url.searchParams.get("check")).toBe("1");
    expect(verifyPreviewToken(url.searchParams.get("token"), previewKey("s3cret"), CHECK_NOW, p.app.id).ok).toBe(true);
    expect(claimed.plan.viewport).toEqual({ width: 360, height: 800 });
    expect(claimed.plan.passes).toEqual([{ lang: "en", scale: 1 }, { lang: "ar", scale: 1.3 }]);
    expect(claimed.plan.routes[0]).toBe("/");
    expect((await p.store.getBuild(build.id))!.stages.app_check).toBe("running");

    const input = appCheckResultSchema.parse({
      status: "done",
      passes: [{ lang: "en", scale: 1, routes: 6 }, { lang: "ar", scale: 1.3, routes: 6 }],
      issues: [
        { kind: "overflow", lang: "ar", scale: 1.3, route: "/page/orders", message: "A RenderFlex overflowed by 18.0 pixels on the right." },
        { kind: "overflow", lang: "ar", scale: 1.3, route: "/page/orders", message: "A RenderFlex overflowed by 18.0 pixels on the right." },
      ],
      check_mode: true,
    });
    // Taken after the build finished too: the check never holds it.
    await p.store.updateBuild(build.id, { status: "ready", finishedAt: CHECK_NOW }, CHECK_NOW);
    const saved = await saveAppCheckResult(p.store, (await p.store.getBuild(build.id))!, input, CHECK_NOW);
    expect(saved.issues).toHaveLength(1);
    const after = (await p.store.getBuild(build.id))!;
    expect([after.status, after.stages.app_check, after.appCheck?.status, after.appCheck?.checkMode]).toEqual(["ready", "done", "done", true]);
    const alerts = await p.store.listTeamAlerts({ open: true, limit: 10 });
    expect(alerts.map((a) => a.kind)).toEqual(["app_check"]);
    expect(alerts[0]!.detail).toContain("overflow [ar 1.3] /page/orders");

    // A clean check later closes it.
    await saveAppCheckResult(p.store, after, appCheckResultSchema.parse({ status: "done", passes: [{ lang: "en", scale: 1, routes: 6 }], issues: [] }), CHECK_NOW);
    expect(await p.store.listTeamAlerts({ open: true, limit: 10 })).toEqual([]);
  }, 60_000);

  it("refuses a build still queued or failed, and shows a check that never reported as not finished", async () => {
    const { p, build } = await built();
    for (const status of ["queued", "failed"] as const) {
      const claimed = await claimAppCheck(p.store, { ...build, status }, CHECK_NOW, { url: "https://yallapp.test", signingSecret: "s" });
      expect(claimed.ok ? "ok" : claimed.code).toBe("build_not_built");
    }
    const running = { appCheck: { status: "running" as const, at: CHECK_NOW.toISOString(), passes: [], issues: [] } };
    expect(appCheckShown(running, new Date(CHECK_NOW.getTime() + 60_000))?.status).toBe("running");
    expect(appCheckShown(running, new Date(CHECK_NOW.getTime() + CHECK_STALE_MS + 1))?.status).toBe("failed");
    expect(appCheckShown({ appCheck: null }, CHECK_NOW)).toBeNull();
  }, 60_000);

  it("takes only the pipeline contract's result", () => {
    expect(appCheckResultSchema.safeParse({ status: "done", issues: [{ kind: "crash", lang: "en", scale: 1, route: "/", message: "x" }] }).success).toBe(false);
    expect(appCheckResultSchema.safeParse({ status: "done", extra: 1 }).success).toBe(false);
    expect(appCheckResultSchema.parse({ status: "failed", message: "No screen opened." })).toEqual({ status: "failed", passes: [], issues: [], message: "No screen opened." });
  });
});
