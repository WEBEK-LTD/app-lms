import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { demoKind, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoStudioContext } from "@/lib/demo/look";
import { demoLayout, demoSignInBlock } from "@/lib/demo/setup";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { layoutForPlan } from "@/lib/pages/plan";
import { PLAN_INFO } from "@/lib/plans";
import { itemSourcesFor, screenOptionsFor, categorySourcesFor } from "@/lib/pages/sources";
import type { LayoutContent, LayoutPage, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { sourcesIn } from "@/lib/samples/lists";
import { designPages } from "@/lib/studio/design-file";
import { DEMO_HOME_TEMPLATES, demoTemplateId, marketHome, paragraphsOf, studioDemoOf } from "@/lib/studio/demo-templates";
import { applyWholeDesign, demoProjectLook, designsFor, makeDesign } from "@/lib/studio/designs";
import { demoStudioPage, TEMPLATES, templatesFor, type SectionContext, type SectionWord } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * Templates = demos, for Yallapp Studio. A Studio demo is its kind's own
 * designed page (Zad's the marketplace home approved in 115.14), never a
 * page generated for it, and the template a project starts from and the
 * "Like our demo" whole design are the whole demo: its pages, tabs and look.
 * These fail the moment the demo and either drift apart (ids, the demo's
 * note on how to sign in and its accounts aside).
 */

const NOW = new Date("2026-11-09T10:00:00Z");
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

function demoApp(id: StudioDemoId): App {
  const kind = demoKind(id);
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor, brandingDoneAt: NOW };
}

/** A client's new Studio project of the demo's kind, named as the demo so the two can be compared. */
function projectApp(id: StudioDemoId): App {
  const kind = demoKind(id);
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor };
}

const kindOf = (id: StudioDemoId) => ({ type: demoKind(id).engine, vertical: demoKind(id).vertical });

/** The dashboard's words in English, as a project made in English gets them (createStudioProjectAction). */
function englishContext(app: App): SectionContext {
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "en", w: (word: SectionWord) => String(studioEn[`w_${word}`]).replaceAll("{app}", app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}` };
}

/** A Studio element without its id, which differs each time a page is made. */
function stripNode(n: StudioNode): unknown {
  const { id: _id, children, card, ...rest } = n;
  void _id;
  return { ...rest, ...(children ? { children: children.map(stripNode) } : {}), ...(card ? { card: stripNode(card) } : {}) };
}

const withoutIds = (page: StudioPage): unknown => ({ ...page, body: stripNode(page.body) });

/** A Studio page without the demo's note on how to sign in. */
function withoutNote(page: StudioPage): StudioPage {
  return { ...page, body: { ...page.body, children: (page.body.children ?? []).filter((n) => n.visibility !== "signed_out") } };
}

/** A page without its translations, to compare with a template made in one language. */
function untranslated(node: StudioNode): StudioNode {
  const { translations: _t, children, ...rest } = node;
  void _t;
  return { ...rest, ...(children ? { children: children.map(untranslated) } : {}) } as StudioNode;
}

/** What a client gets: pages (their Studio pages without ids and the demo's note), tabs, menu and look. */
function whole(layout: Pick<LayoutContent, "pages" | "tabs" | "menu" | "appearance">) {
  return {
    pages: layout.pages.map((p: LayoutPage) => ({ slug: p.slug, title: p.title, show_title: p.show_title, blocks: p.blocks, studio: p.studio ? withoutIds(withoutNote(p.studio)) : null })),
    tabs: layout.tabs,
    menu: layout.menu ?? [],
    look: { template: layout.appearance.template, font: layout.appearance.font, font_family: layout.appearance.font_family ?? null, corners: layout.appearance.corners, cards: layout.appearance.cards, secondary_color: layout.appearance.secondary_color },
  };
}

const demoOf = async (id: StudioDemoId) => demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demoApp(id), "banner-asset");

const texts = (page: StudioPage) => allNodes(page).flatMap((n) => [n.text, n.title].filter((x): x is string => Boolean(x)));

describe("Studio templates = Studio demos", () => {
  it("has a template for every Studio demo, and none for another kind", () => {
    expect(TEMPLATES.filter((t) => t.demo).map((t) => t.demo).sort()).toEqual([...STUDIO_DEMO_TYPES].sort());
    for (const id of STUDIO_DEMO_TYPES) expect(studioDemoOf(kindOf(id))).toBe(id);
    for (const kind of KINDS) {
      const demo = studioDemoOf({ type: kind.engine, vertical: kind.vertical });
      if (!(STUDIO_DEMO_TYPES as readonly string[]).includes(kind.id)) expect(demo, kind.id).toBeNull();
    }
  });

  it.each(STUDIO_DEMO_TYPES)("offers the %s demo's template first, recommended, and keeps every template it had", (id) => {
    const list = templatesFor(kindOf(id));
    expect(list[0]).toMatchObject({ id: demoTemplateId(id), demo: id, recommended: true });
    expect(list.filter((t) => t.demo).map((t) => t.id)).toEqual([demoTemplateId(id)]);
    // The templates it had before, in their order, after it: none removed.
    const others = TEMPLATES.filter((t) => !t.demo);
    const own = others.filter((t) => t.fits && (!t.fits.types || t.fits.types.includes(kindOf(id).type)) && (!t.fits.verticals || (kindOf(id).vertical !== null && t.fits.verticals.includes(kindOf(id).vertical!))));
    const best = own.some((t) => t.fits?.verticals) ? own.filter((t) => t.fits?.verticals) : own;
    expect(list.slice(1).map((t) => t.id)).toEqual([...best, ...others.filter((t) => !t.fits)].map((t) => t.id));
    for (const old of ["market", "market_offers", "market_grocery", "delivery", "food", "ride", "teachers", "school", "university", "brand", "contact", "blank"]) expect(TEMPLATES.some((t) => t.id === old), old).toBe(true);
  });

  it.each(STUDIO_DEMO_TYPES)("the %s demo's home is its kind's designed page, with only how to sign in added", async (id) => {
    const layout = await demoOf(id);
    const home = layout.pages[0]!;
    expect(home.blocks).toEqual([]);
    const source = itemSourcesFor(demoApp(id))[0] ?? null;
    expect(home.studio).toEqual(demoStudioPage(id, demoStudioContext(id, appUrl(), source), [demoSignInBlock()]));
    // The note, for people not signed in, right after the page's first element.
    const note = home.studio!.body.children![1]!;
    expect(note.visibility).toBe("signed_out");
    expect(texts({ body: note }).join(" ")).toMatch(/^This is a demo app\./);
    // Without it: the kind's own template (Zad's the approved marketplace home), as it is.
    const ctx = demoStudioContext(id, appUrl(), source);
    const own = DEMO_HOME_TEMPLATES[id];
    const designed = own === "market_home" ? marketHome(ctx) : TEMPLATES.find((t) => t.id === own)!.make(ctx);
    const page = withoutNote(home.studio!);
    expect(withoutIds({ ...page, body: untranslated(page.body) })).toEqual(withoutIds(designed));
    // Nothing generated for the demo: no banner of the brand's words, no welcome over one list.
    expect(texts(home.studio!)).not.toContain(DEMO_BRANDS[id].banner.heading);
    expect(texts(home.studio!)).not.toContain(DEMO_BRANDS[id].welcome);
    // The whole demo layout is one the platform takes.
    const checked = parseLayoutContent(layout, { app: demoApp(id), now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it.each(STUDIO_DEMO_TYPES)("the %s template is the whole demo: a project started from it has the demo's pages, tabs and look", async (id) => {
    const demo = await demoOf(id);
    const app = projectApp(id);
    const template = templatesFor(kindOf(id))[0]!;
    const ready = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
    const project = startLayout(app, template, ready, NOW, englishContext(app));
    expect(whole(project)).toEqual(whole(demo));
    // The demo's own colour, and its look as the demo app has it.
    expect(app.primaryColor).toBe(DEMO_BRANDS[id].primaryColor);
    expect(project.appearance).toMatchObject({ template: DEMO_BRANDS[id].template, font: DEMO_BRANDS[id].font, corners: DEMO_BRANDS[id].corners, cards: DEMO_BRANDS[id].cards, secondary_color: DEMO_BRANDS[id].secondaryColor });
    const checked = parseLayoutContent(project, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it.each(STUDIO_DEMO_TYPES)("\"Like our demo\" (the %s demo's whole design) makes a project the demo, nothing added", async (id) => {
    const demo = await demoOf(id);
    const app = projectApp(id);
    const design = designsFor(kindOf(id))[0]!;
    expect(design).toMatchObject({ demo: id, templates: [demoTemplateId(id)] });
    // A project that started blank, with other tabs and look.
    const blank = startLayout(app, TEMPLATES.find((t) => t.id === "blank")!, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, englishContext(app));
    const current: LayoutContent = { ...blank, languages: LANGS, tabs: blank.tabs.slice(0, 2), appearance: { ...blank.appearance, template: "classic", corners: "sharp", cards: "flat", font_family: "Cairo", secondary_color: "#000000" } };
    const file = makeDesign(design, { ...englishContext(app), brand: "#123456" }, { home: "Home", template: (t) => t, theme: (t) => t }, LANGS);
    expect(file.demo).toBe(id);
    let n = 0;
    const fitted = designPages(file, { sources: itemSourcesFor(app), categorySources: categorySourcesFor(app), screens: screenOptionsFor(app).map((s) => s.value), newId: () => `n${++n}`, pages: current.pages, languages: LANGS, pictures: new Map(), now: NOW.toISOString() });
    const applied = applyWholeDesign(current, fitted, file.look, { mode: "project", openSlug: "home", pageIndex: 0, keep: false, now: NOW.toISOString(), demo: demoProjectLook(id, demo.tabs) });
    expect(whole(applied).pages.map((p) => p.studio)).toEqual(whole(demo).pages.map((p) => p.studio));
    expect(applied.tabs).toEqual(demo.tabs);
    expect(whole(applied).look).toEqual(whole(demo).look);
  });

  it.each(STUDIO_DEMO_TYPES)("the %s template, taken by an owner, is a page the platform takes, with their name", (id) => {
    const kind = demoKind(id);
    const app = { ...newApp("c1", null, NOW, kind.engine, kind.vertical), backend: "hosted" as const, appName: "Corner Bakery" };
    const page = TEMPLATES.find((t) => t.demo === id)!.make({ ...englishContext({ ...app, primaryColor: "#1F4E5F" }), app: "Corner Bakery" });
    const parsed = parseStudioPage(page, app, LANGS);
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    expect(JSON.stringify(page)).not.toContain("{app}");
    expect(JSON.stringify(page)).not.toContain(DEMO_BRANDS[id].appName);
  });

  it.each(STUDIO_DEMO_TYPES)("the %s demo's phone gets its Studio home on the demos' Business plan, lists and all", async (id) => {
    const app = demoApp(id);
    const layout = await demoOf(id);
    const served = layoutForPlan({ version: "v1", ...layout }, app, PLAN_INFO.business, BUILT_IN_APP_DEFAULTS);
    expect(served.pages[0]!.studio).toEqual(layout.pages[0]!.studio);
    // An owner's project on a plan without Studio still doesn't get one.
    const owner = layoutForPlan({ version: "v1", ...layout }, { ...app, demo: false }, PLAN_INFO.business, BUILT_IN_APP_DEFAULTS);
    expect(owner.pages[0]!.studio).toBeUndefined();
  });

  it("reads a text block's headings and paragraphs as plain words", () => {
    expect(paragraphsOf("<h2>Welcome to {app}</h2><p><strong>This is a demo app.</strong> Sign in &amp; enjoy &quot;it&quot;.</p>")).toEqual([
      { heading: true, text: "Welcome to {app}" },
      { heading: false, text: 'This is a demo app. Sign in & enjoy "it".' },
    ]);
    expect(paragraphsOf("loose <p>kept</p> <script>x</script><p>cut")).toEqual([{ heading: false, text: "kept" }]);
  });
});

describe("Zad: the approved marketplace home", () => {
  /** The approved picture (mobile/test/screenshots/market_screenshots_test.dart), top to bottom. */
  const APPROVED = [
    { market: { section: "address" }, title: "Hungry? Order in minutes." },
    { market: { section: "kinds" } },
    { market: { section: "offers" }, title: "Today's offers" },
    { market: { section: "vendors", style: "spotlight", kind: "restaurant", sort: "fastest", limit: 6 }, title: "Fastest near you", text: "Hot food at your door in under 30 min" },
    { market: { section: "cuisines" }, title: "What's your mood?" },
    { market: { section: "club" }, title: "Free delivery on every order", text: "Join the club for free delivery and members' offers." },
    { market: { section: "vendors", style: "tiles", kind: "grocery", limit: 6 }, title: "Supermarkets & shops", text: "Groceries in about 20 minutes" },
    { market: { section: "reorder" }, title: "Order again" },
    { market: { section: "vendors", style: "list", kind: "restaurant" }, title: "All restaurants" },
  ];

  it("shows every part of the approved home, in its order, in Zad's colour and font, with the demo's tabs", async () => {
    const layout = await demoOf("marketplace");
    const page = layout.pages[0]!.studio!;
    expect(page.header ?? null).toBeNull();
    expect(page).toMatchObject({ background: "#F6F3EE", dark_background: "#0F0E1A" });
    const markets = page.body.children!.filter((n) => n.type === "market");
    expect(markets.map((n) => ({ market: n.market, ...(n.title ? { title: n.title } : {}), ...(n.text ? { text: n.text } : {}) }))).toEqual(APPROVED);
    // Only the note on how to sign in besides them, under the top.
    expect(page.body.children!.map((n) => n.type)).toEqual(["market", "column", ...APPROVED.slice(1).map(() => "market")]);
    expect(page.body.children![1]!.visibility).toBe("signed_out");
    expect(layout.appearance).toMatchObject({ font: DEMO_BRANDS.marketplace.font, template: DEMO_BRANDS.marketplace.template, secondary_color: DEMO_BRANDS.marketplace.secondaryColor });
    expect(demoApp("marketplace").primaryColor).toBe("#1E6B52");
    expect(layout.tabs.map((t) => t.target.type === "page" ? t.target.page_slug : t.target.screen)).toEqual(["home", "restaurants", "food_orders", "account"]);
    // Its titles in Arabic and Turkish as well.
    const hungry = markets[0]!;
    expect(hungry.translations).toEqual({ ar: { title: studioAr.w_mHungry }, tr: { title: studioTr.w_mHungry } });
    // Its places are the restaurants' list: a project started from it gets Zad's places as samples.
    expect(sourcesIn(page).has("restaurants")).toBe(true);
  });

  it("is the page the app's widget test draws (mobile/test/support/zad_demo_home.json)", async () => {
    const layout = await demoOf("marketplace");
    const file = join(process.cwd(), "..", "..", "mobile", "test", "support", "zad_demo_home.json");
    const page = `${JSON.stringify(layout.pages[0]!.studio, null, 2)}\n`;
    if (process.env.YALLAPP_WRITE_ZAD_HOME) writeFileSync(file, page);
    expect(readFileSync(file, "utf8")).toBe(page);
  });
});

describe("templates = demos: the demos' pages in Arabic and Turkish", () => {
  it("writes them in the dashboard's language, the others kept as translations the page checker takes", () => {
    const languages = { default: "ar" as const, available: ["ar" as const, "en" as const, "tr" as const] };
    for (const id of STUDIO_DEMO_TYPES) {
      const app = { ...demoApp(id), appName: "Nour" };
      const ctx: SectionContext = { brand: "#123456", source: itemSourcesFor(app)[0] ?? null, app: "Nour", lang: "ar", w: (word) => String(studioAr[`w_${word}`]).replaceAll("{app}", "Nour") };
      const page = demoStudioPage(id, ctx);
      const written = allNodes(page).filter((n) => (n.text || n.title) && n.type !== "items");
      expect(written.length, id).toBeGreaterThan(0);
      for (const n of written) {
        // Arabic on the Arabic page, with English and Turkish kept.
        for (const value of [n.text, n.title].filter(Boolean)) expect(value, `${id}: ${value}`).toMatch(/[؀-ۿ]|^\d+$/);
        if (/^\d+$/.test(n.text ?? "")) continue;
        expect(Object.keys(n.translations ?? {}).sort(), `${id}: ${n.text ?? n.title}`).toEqual(["en", "tr"]);
      }
      const parsed = parseStudioPage(page, app, languages);
      expect(parsed.ok ? [] : parsed.errors, id).toEqual([]);
    }
  });

  it("gives the demo apps, made in English, their Arabic and Turkish too", () => {
    for (const id of STUDIO_DEMO_TYPES) {
      const page = demoStudioPage(id, demoStudioContext(id, appUrl(), itemSourcesFor(demoApp(id))[0] ?? null));
      const titled = allNodes(page).filter((n) => (n.text && !/^\d+$/.test(n.text)) || (n.type === "market" && n.title));
      for (const n of titled) {
        expect(n.translations?.ar, `${id}: ${n.text ?? n.title}`).toBeTruthy();
        expect(Object.values(n.translations!.ar!).join(" "), `${id}: ${n.text ?? n.title}`).toMatch(/[؀-ۿ]/);
        expect(n.translations?.tr, `${id}: ${n.text ?? n.title}`).toBeTruthy();
      }
    }
  });
});
