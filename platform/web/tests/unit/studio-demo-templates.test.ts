import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { ar as studioAr, en as studioEn } from "@/i18n/dashboard/studio";
import { demoKind, PREMIUM_ACADEMY_DEMO, PREMIUM_ACADEMY_TEMPLATE, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoDesign, demoStudioContext } from "@/lib/demo/look";
import { designLayout } from "@/lib/pages/layout";
import { demoLayout, demoSignInBlock } from "@/lib/demo/setup";
import { demoStudioScreens } from "@/lib/demo/screens";
import { servedAppearance } from "@/lib/fonts/look";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { layoutForPlan } from "@/lib/pages/plan";
import { PLAN_INFO } from "@/lib/plans";
import { itemSourcesFor, screenOptionsFor, categorySourcesFor } from "@/lib/pages/sources";
import type { LayoutContent, LayoutPage, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { sourcesIn } from "@/lib/samples/lists";
import { designPages, picturesIn, type DesignFile } from "@/lib/studio/design-file";
import { DEMO_FACTS, DEMO_HOME_TEMPLATES, demoTemplateId, paragraphsOf, studioDemoOf, withDemoFacts } from "@/lib/studio/demo-templates";
import { designedTabs, signatureLooksOf } from "@/lib/studio/demo-designs";
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
  // 123 The premium academy's demo keeps the template it started from.
  const design = id === PREMIUM_ACADEMY_DEMO ? { design: PREMIUM_ACADEMY_TEMPLATE } : {};
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor, brandingDoneAt: NOW, ...design };
}

/** The demos that are their kind's own template; 123 the premium academy is a template's demo (below). */
const KIND_DEMOS = STUDIO_DEMO_TYPES.filter((id) => id !== PREMIUM_ACADEMY_DEMO);

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

/** 124.7 A project as the demo shows it: the demo's own words in its home's brackets. */
function withFacts(id: StudioDemoId, layout: LayoutContent): LayoutContent {
  return { ...layout, pages: layout.pages.map((p) => (p.slug === "home" && p.studio ? { ...p, studio: withDemoFacts(id, p.studio) } : p)) };
}

const demoOf = async (id: StudioDemoId) => demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demoApp(id), "banner-asset");

/** 128 A design's pictures on the web kept where they are, as the editor keeps them (app/studio/editor/editor.tsx): the demos' photos. */
const platformPictures = (file: DesignFile) => new Map(file.pages.flatMap((p) => picturesIn(p.studio)).filter((u) => /^https?:\/\//.test(u)).map((u) => [u, u] as const));

const texts = (page: StudioPage) => allNodes(page).flatMap((n) => [n.text, n.title].filter((x): x is string => Boolean(x)));

describe("Studio templates = Studio demos", () => {
  it("has a template for every Studio demo, and none for another kind", () => {
    // 130 Each demo's own, then its Signature looks (each a template of its own, `<demo>_signature_<look>`).
    expect(TEMPLATES.filter((t) => t.demo && !t.look).map((t) => t.demo).sort()).toEqual([...KIND_DEMOS].sort());
    for (const t of TEMPLATES.filter((x) => x.look)) expect(t.id).toBe(`${t.demo}_signature_${t.look}`);
    for (const id of KIND_DEMOS) expect(studioDemoOf(kindOf(id))).toBe(id);
    for (const kind of KINDS) {
      const demo = studioDemoOf({ type: kind.engine, vertical: kind.vertical });
      if (!(STUDIO_DEMO_TYPES as readonly string[]).includes(kind.id)) expect(demo, kind.id).toBeNull();
    }
  });

  it.each(KIND_DEMOS)("offers the %s demo's template first, recommended, and keeps every template it had", (id) => {
    const list = templatesFor(kindOf(id));
    expect(list[0]).toMatchObject({ id: demoTemplateId(id), demo: id, recommended: true });
    // 130 Then its Signature looks, A then B.
    expect(list.filter((t) => t.demo).map((t) => t.id)).toEqual([demoTemplateId(id), ...signatureLooksOf(id).map((look) => `${id}_signature_${look}`)]);
    // The templates it had before, in their order, after it: none removed.
    const others = TEMPLATES.filter((t) => !t.demo);
    const own = others.filter((t) => t.fits && (!t.fits.types || t.fits.types.includes(kindOf(id).type)) && (!t.fits.verticals || (kindOf(id).vertical !== null && t.fits.verticals.includes(kindOf(id).vertical!))));
    const best = own.some((t) => t.fits?.verticals) ? own.filter((t) => t.fits?.verticals) : own;
    expect(list.slice(1 + signatureLooksOf(id).length).map((t) => t.id)).toEqual([...best, ...others.filter((t) => !t.fits)].map((t) => t.id));
    for (const old of ["market", "market_offers", "market_grocery", "delivery", "food", "ride", "teachers", "school", "university", "brand", "contact", "blank"]) expect(TEMPLATES.some((t) => t.id === old), old).toBe(true);
  });

  it.each(KIND_DEMOS)("the %s demo's home is its kind's designed page, with only how to sign in added", async (id) => {
    const layout = await demoOf(id);
    const home = layout.pages[0]!;
    expect(home.blocks).toEqual([]);
    const source = itemSourcesFor(demoApp(id))[0] ?? null;
    // 124.7 With the demo's own words where the template asks the owner for theirs.
    expect(home.studio).toEqual(withDemoFacts(id, demoStudioPage(id, demoStudioContext(id, appUrl(), source), [demoSignInBlock()])));
    // The note, for people not signed in, right after the page's first element.
    const note = home.studio!.body.children![1]!;
    expect(note.visibility).toBe("signed_out");
    expect(texts({ body: note }).join(" ")).toMatch(/^This is a demo app\./);
    // Without it: the kind's own template (128 Sofra Eats's and Zad's the approved photo-first homes), as it is.
    const ctx = demoStudioContext(id, appUrl(), source);
    const designed = TEMPLATES.find((t) => t.id === DEMO_HOME_TEMPLATES[id])!.make(ctx);
    const page = withoutNote(home.studio!);
    const facts = withDemoFacts(id, designed);
    expect(withoutIds({ ...page, body: untranslated(page.body) })).toEqual(withoutIds({ ...facts, body: untranslated(facts.body) }));
    // Nothing generated for the demo: no banner of the brand's words, no welcome over one list.
    // (130 Unless the template says them itself: Masar A's "Where to?".)
    if (!texts(designed).includes(DEMO_BRANDS[id].banner.heading)) expect(texts(home.studio!)).not.toContain(DEMO_BRANDS[id].banner.heading);
    expect(texts(home.studio!)).not.toContain(DEMO_BRANDS[id].welcome);
    // The whole demo layout is one the platform takes.
    const checked = parseLayoutContent(layout, { app: demoApp(id), now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it.each(KIND_DEMOS)("the %s template is the whole demo: a project started from it has the demo's pages, tabs and look", async (id) => {
    const demo = await demoOf(id);
    const app = projectApp(id);
    const template = templatesFor(kindOf(id))[0]!;
    const ready = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
    const project = startLayout(app, template, ready, NOW, englishContext(app));
    expect(whole(withFacts(id, project))).toEqual(whole(demo));
    // The project keeps the template's brackets for the owner's own words.
    if (DEMO_FACTS[id]) expect(JSON.stringify(project.pages[0]!.studio)).toMatch(/\[[^\]]+\]/);
    // The demo's own colour, and its look as the demo app has it.
    expect(app.primaryColor).toBe(DEMO_BRANDS[id].primaryColor);
    expect(project.appearance).toMatchObject({ template: DEMO_BRANDS[id].template, font: DEMO_BRANDS[id].font, corners: DEMO_BRANDS[id].corners, cards: DEMO_BRANDS[id].cards, secondary_color: DEMO_BRANDS[id].secondaryColor });
    const checked = parseLayoutContent(project, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it.each(KIND_DEMOS)("\"Like our demo\" (the %s demo's whole design) makes a project the demo, nothing added", async (id) => {
    const demo = await demoOf(id);
    const app = projectApp(id);
    const design = designsFor(kindOf(id))[0]!;
    expect(design).toMatchObject({ demo: id, templates: [demoTemplateId(id)] });
    // A project that started blank, with other tabs and look.
    const blank = startLayout(app, TEMPLATES.find((t) => t.id === "blank")!, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, englishContext(app));
    const current: LayoutContent = { ...blank, languages: LANGS, tabs: blank.tabs.slice(0, 2), appearance: { ...blank.appearance, template: "classic", corners: "sharp", cards: "flat", font_family: "Cairo", secondary_color: "#000000" } };
    // The demo's own tabs, as the editor has them (app/studio/editor/page.tsx).
    const demoTabs = designLayout(app, demoDesign(id), current, NOW).tabs;
    const file = makeDesign(design, { ...englishContext(app), brand: "#123456" }, { home: "Home", template: (t) => t, theme: (t) => t }, LANGS, demoTabs);
    expect(file.demo).toBe(id);
    let n = 0;
    const fitted = designPages(file, { sources: itemSourcesFor(app), categorySources: categorySourcesFor(app), screens: screenOptionsFor(app).map((s) => s.value), newId: () => `n${++n}`, pages: current.pages, languages: LANGS, pictures: platformPictures(file), now: NOW.toISOString() });
    const applied = applyWholeDesign(current, fitted, file.look, { mode: "project", openSlug: "home", pageIndex: 0, keep: false, now: NOW.toISOString(), demo: demoProjectLook(id, demoTabs), designSlugs: file.pages.map((p) => p.slug) });
    // 120 Every page of the demo, its tabs' pages too, each where its tab opens it.
    const studioOf = (l: LayoutContent, slug: string) => whole(l).pages.find((p) => p.slug === slug)?.studio ?? null;
    const opened = (l: LayoutContent) => l.tabs.map((t) => (t.target.type === "page" ? studioOf(l, t.target.page_slug!) : t.target));
    expect(opened(withFacts(id, applied))).toEqual(opened(demo));
    expect(whole(applied).pages.filter((p) => p.studio).length).toBe(whole(demo).pages.filter((p) => p.studio).length);
    const named = (l: LayoutContent) => l.tabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon, translations: t.translations }));
    expect(named(applied)).toEqual(named(demo));
    expect(applied.tab_bar).toEqual(demo.tab_bar);
    const checked = parseLayoutContent(applied, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    expect(whole(applied).look).toEqual(whole(demo).look);
  });

  it.each(KIND_DEMOS)("every tab of the %s demo opens a Studio page, those after the home drawn around the tab's screen", async (id) => {
    const demo = await demoOf(id);
    const app = demoApp(id);
    // 128 The tabs as the demo's own design has them (Zad's Shops and Cart).
    const before = designedTabs(designLayout(app, demoDesign(id), demo, NOW).tabs, { demo: id });
    expect(demo.tabs.map((t) => t.id)).toEqual(before.map((t) => t.id));
    demo.tabs.forEach((tab, i) => {
      expect(tab.target.type, tab.id).toBe("page");
      const page = demo.pages.find((p) => p.slug === (tab.target.type === "page" ? tab.target.page_slug : ""));
      expect(page?.studio, tab.id).toBeTruthy();
      const was = before[i]!.target;
      if (i === 0) {
        expect(page!.slug).toBe("home");
        expect(page!.studio!.screen).toBeUndefined();
        return;
      }
      // The screen the tab opened before, now under the page's elements; 128 or a page of the demo's own (Zad's Shops).
      if (was.type === "page") {
        expect(page!.slug).toBe(was.page_slug);
        expect(page!.studio!.screen).toBeUndefined();
        expect(page!.studio!.header).toMatchObject({ type: "title", title: page!.title });
      } else {
        expect(was.type).toBe("screen");
        expect(page!.studio!.screen).toBe(was.type === "screen" ? was.screen : null);
      }
      if (page!.studio!.screen === "account") {
        // The account screen keeps its own top, set with the sign-in screen.
        expect(page!.studio!.header ?? null).toBeNull();
        expect(page!.studio!.body.children).toEqual([]);
      } else {
        expect(page!.studio!.header).toMatchObject({ type: "title", title: page!.title });
        expect(page!.studio!.header!.translations?.ar?.title).toBeTruthy();
      }
      // The tab's name and the page's title in Arabic and Turkish too.
      expect(tab.translations?.ar?.label, tab.id).toBeTruthy();
      expect(tab.translations?.tr?.label, tab.id).toBeTruthy();
      expect(page!.translations?.ar?.title).toBe(tab.translations?.ar?.label);
    });
    // The bar the demo was designed with.
    expect(demo.tab_bar).toBeTruthy();
  });

  it.each(KIND_DEMOS)("the %s template, taken by an owner, is a page the platform takes, with their name", (id) => {
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

describe("123 The premium academy's demo: the project its template starts", () => {
  it("is its template's project, with only how to sign in added on its home", async () => {
    const demo = await demoOf(PREMIUM_ACADEMY_DEMO);
    const app = { ...projectApp(PREMIUM_ACADEMY_DEMO), primaryColor: DEMO_BRANDS[PREMIUM_ACADEMY_DEMO].primaryColor };
    const template = TEMPLATES.find((t) => t.id === PREMIUM_ACADEMY_TEMPLATE)!;
    const ctx = demoStudioContext(PREMIUM_ACADEMY_DEMO, appUrl(), itemSourcesFor(app)[0] ?? null);
    const project = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, ctx, null);
    expect(whole(demo)).toEqual(whole(project));
    expect(demo.tab_bar).toEqual(project.tab_bar);
    // The note, for people not signed in, right after the home's first element.
    const note = demo.pages[0]!.studio!.body.children![1]!;
    expect(note.visibility).toBe("signed_out");
    expect(texts({ body: note }).join(" ")).toMatch(/^This is a demo app\./);
    // 128.8 In the template's Manrope (Arabic in Alexandria) and gold, in the demo's languages.
    expect(demo.appearance).toMatchObject({ font: "Manrope", arabic_font: "Alexandria", secondary_color: "#B8893A", theme_mode: "system", user_can_change_mode: true });
    expect(demo.languages?.available).toEqual(["en", "ar", "tr"]);
    const checked = parseLayoutContent(demo, { app: demoApp(PREMIUM_ACADEMY_DEMO), now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it("is the project the app's website pictures draw (mobile/test/support/premium_academy_demo.json)", async () => {
    const layout = await demoOf(PREMIUM_ACADEMY_DEMO);
    const file = join(process.cwd(), "..", "..", "mobile", "test", "support", "premium_academy_demo.json");
    // As the hosted API serves it: the template's fonts with their files (none for Manrope, which the app has).
    const served = { ...layout, appearance: servedAppearance(layout.appearance, appUrl()) };
    const data = `${JSON.stringify({ screens: demoStudioScreens(PREMIUM_ACADEMY_DEMO, appUrl()), layout: served }, null, 1)}\n`;
    if (process.env.YALLAPP_WRITE_PREMIUM_ACADEMY) writeFileSync(file, data);
    expect(readFileSync(file, "utf8")).toBe(data);
  });

  // 124.7 The other Studio demos too: the website's pictures of each draw the demo as it is.
  it.each([
    ["delivery", "sahm"],
    ["food", "sofra"],
    // 128 Zad's whole project too, not only its home.
    ["marketplace", "zad"],
    ["rides", "masar"],
    ["taxi", "lamha"],
    ["school", "nakhla"],
    ["instructors", "rawaq"],
    // 126 Safra.
    ["travel", "safra"],
  ] as const)("the %s demo is the project the app's website pictures draw (mobile/test/support/%s_demo.json)", async (id, brand) => {
    const layout = await demoOf(id);
    const file = join(process.cwd(), "..", "..", "mobile", "test", "support", `${brand}_demo.json`);
    // As the hosted API serves it: the look with the files of its free fonts (none for the app's own fonts).
    const served = { ...layout, appearance: servedAppearance(layout.appearance, appUrl()) };
    const data = `${JSON.stringify({ screens: demoStudioScreens(id, appUrl()), layout: served }, null, 1)}\n`;
    if (process.env.YALLAPP_WRITE_STUDIO_DEMOS) writeFileSync(file, data);
    expect(readFileSync(file, "utf8")).toBe(data);
  });

  it("lists a school's news as cards of words, never as picture tiles (school news has no pictures)", async () => {
    // The school template's news: cards of words.
    const template = TEMPLATES.find((t) => t.id === "school")!.make(englishContext(projectApp("school")));
    const news = allNodes(template).find((n) => n.type === "items")!;
    expect(news).toMatchObject({ source: "school_news", layout: "list" });
    const binds = allNodes({ body: news.card! }).map((n) => n.bind).filter(Boolean);
    expect(binds).toEqual(["badge", "title", "subtitle"]);
  });

  it("128 is the home approved for Nakhla School: the photo, the family's greeting, the children, today's card, this week in photos", async () => {
    const layout = await demoOf("school");
    const page = layout.pages[0]!.studio!;
    expect(page.header).toEqual({ type: "transparent", buttons: ["notifications"] });
    expect(page).toMatchObject({ background: "#F4F6F9", dark_background: "#09131F" });
    const [hero, note, children, today, week, tiles] = page.body.children!;
    expect(hero).toMatchObject({ type: "stack", height: 250, image_background_url: `${appUrl()}/demo-screens/nakhla-school.jpg`, scrim: { color: "#0A1E34", from: 0.5, middle: 0.15, at: 40, to: 0.9 } });
    expect(allNodes({ body: hero! }).find((n) => n.type === "school")).toMatchObject({ school: { section: "greeting" }, text: "Welcome to Nakhla School" });
    expect(note!.visibility).toBe("signed_out");
    expect(children).toMatchObject({ type: "school", school: { section: "children" }, visibility: "signed_in" });
    expect(today).toMatchObject({ type: "school", school: { section: "today" }, visibility: "signed_in", radius: 22, background: "#FFFFFF", dark_background: "#122033" });
    expect(texts({ body: week! })).toEqual(["At school this week", "All news"]);
    expect(tiles).toMatchObject({ type: "row", scroll: true });
    expect(tiles!.children!.map((t) => t.image_background_url)).toEqual([`${appUrl()}/stories/school/school-graduation-1.jpg`, `${appUrl()}/stories/school/school-teacher.jpg`]);
    expect(texts({ body: tiles! })).toEqual(["Science fair on Friday", "Parents' evening"]);
    // The approved bar and font.
    expect(layout.tab_bar).toMatchObject({ design: "classic", active: "#1F4E79", dark_active: "#9CC3EA" });
    expect(layout.appearance.font).toBe("Manrope");
  });

  it("128 is the home approved for Rawaq Academy: the library, the teachers in circles, this month's popular courses, and its Teachers tab", async () => {
    const layout = await demoOf("instructors");
    const page = layout.pages[0]!.studio!;
    expect(page.header).toEqual({ type: "transparent", buttons: ["search"] });
    const [hero, , meet, people, popular, courses] = page.body.children!;
    expect(hero).toMatchObject({ type: "stack", height: 300, image_background_url: `${appUrl()}/demo-screens/rawaq-library.jpg` });
    expect(texts({ body: hero! })).toEqual(["Learn from people who do it", "Real teachers.\nReal skills."]);
    expect(texts({ body: meet! })).toEqual(["Meet the teachers", "All teachers"]);
    expect(texts({ body: people! })).toEqual(["DK", "Deniz", "HC", "Hannah", "OF", "Omar", "YA", "Yasmin"]);
    expect(texts({ body: popular! })).toEqual(["Popular this month"]);
    expect(courses).toMatchObject({ type: "items", source: "courses", layout: "carousel" });
    expect(layout.tabs.map((t) => t.id)).toEqual(["home", "teachers", "learning", "account"]);
    expect(layout.pages.find((p) => p.slug === "teachers")!.studio).toMatchObject({ screen: "teachers", background: "#F5F4EE", header: { title: "Teachers", background: "#FFFFFF", dark_background: "#15221C" } });
    // Its courses, lessons and cart in the premium looks.
    expect(demoStudioScreens("instructors", appUrl())).toMatchObject({ sign_in: { style: "premium" }, account_menu: { header: "academy" }, looks: { catalog: "explore", my_courses: "premium", lesson: "premium" } });
  });

  it.each(STUDIO_DEMO_TYPES)("draws every icon of the %s demo's pages and tabs in the app (mobile/lib/core/theme/symbol_names.dart)", async (id) => {
    const layout = await demoOf(id);
    const dart = readFileSync(join(process.cwd(), "..", "..", "mobile", "lib", "core", "theme", "symbol_names.dart"), "utf8");
    const icons = new Set([...layout.tabs.map((t) => t.icon), ...layout.pages.flatMap((p) => (p.studio ? allNodes(p.studio).map((n) => n.icon) : []))].filter((i): i is string => Boolean(i)));
    for (const icon of icons) expect(dart, `${id}: ${icon}`).toContain(`'${icon}':`);
  });

  it("is told apart from the academy's own demo by its template, and isn't offered as a template twice", () => {
    expect(TEMPLATES.filter((t) => t.id === PREMIUM_ACADEMY_TEMPLATE)).toHaveLength(1);
    expect(TEMPLATES.some((t) => t.demo === PREMIUM_ACADEMY_DEMO)).toBe(false);
  });
});

describe("128 Sofra Eats and Zad: the photo-first homes approved on 13 November 2026", () => {
  const photos = (page: StudioPage) => allNodes(page).flatMap((n) => [n.image_url, n.image_background_url].filter((u): u is string => Boolean(u)));

  it("Sofra Eats: the photo hero with the search over its edge, the cuisines, the order on its way, the restaurants loved near you, the floating pill", async () => {
    const layout = await demoOf("food");
    const page = layout.pages[0]!.studio!;
    expect(page.header ?? null).toBeNull();
    expect(page).toMatchObject({ background: "#FBF7F2", dark_background: "#17100C" });
    const [hero, note, cuisines, live, head, loved] = page.body.children!;
    expect(note!.visibility).toBe("signed_out");
    // The table's photo under a shade, its words at the foot, the search card over its edge.
    const photo = allNodes({ body: hero! }).find((n) => n.image_background_url)!;
    expect(photo).toMatchObject({ height: 330, scrim: { color: "#140A05", from: 0.55, middle: 0.05, at: 38, to: 0.75 } });
    expect(photo.image_background_url).toMatch(/\/demo-screens\/sofra-mezze\.jpg$/);
    expect(texts({ body: hero! })).toEqual(expect.arrayContaining(["Deliver to", "Home · Zamalek", "Sofra Eats", "Tonight’s table\nis set.", "Dishes, restaurants or cuisines"]));
    expect(texts({ body: cuisines! })).toEqual(["Grill", "Pizza", "Kofta", "Tawook", "Sweets"]);
    expect(allNodes({ body: cuisines! }).filter((n) => n.type === "image").map((n) => n.radius)).toEqual([29, 29, 29, 29, 29]);
    expect(live).toMatchObject({ type: "live_status", live_status: { source: "food_order" }, background: "#D2552B", visibility: "signed_in" });
    expect(texts({ body: head! })).toEqual(["Loved near you", "See all"]);
    expect(loved).toMatchObject({ type: "items", source: "restaurants", layout: "carousel" });
    // Every photo one of Yallapp's own, served by the platform.
    for (const url of photos(page)) expect(url).toMatch(/^https?:\/\/[^/]+\/demo-(photos|screens)\/[a-z-]+\.jpg$/);
    expect(layout.tab_bar).toMatchObject({ design: "float", background: "#2A1810", dark_background: "#F7EDE6", active: "#D2552B", labels: "active", radius: 22, margin: 12 });
    expect(layout.appearance.font).toBe("Manrope");
    // The pages after it in its language: the cuisines over the restaurants, the order on its way over the orders.
    const over = (screen: string) => layout.pages.find((p) => p.studio?.screen === screen)!.studio!;
    expect(over("restaurants").body.children!.map((n) => n.type)).toEqual(["row"]);
    expect(over("food_orders").body.children!.map((n) => n.type)).toEqual(["live_status"]);
    expect(over("food_orders").header).toMatchObject({ background: "#FBF7F2", dark_background: "#17100C" });
  });

  it("Zad: the green bar with the soonest time, this week's offer on a photo, the department tiles, the places as chips, five named tabs", async () => {
    const layout = await demoOf("marketplace");
    const page = layout.pages[0]!.studio!;
    expect(page.header ?? null).toBeNull();
    expect(page).toMatchObject({ background: "#F6F3EE", dark_background: "#0D1712" });
    const [bar, note, offer, tiles, head, places] = page.body.children!;
    expect(bar).toMatchObject({ type: "market", market: { section: "address", style: "bar" }, text: "Search products and shops", color: "#1E6B52" });
    expect(note!.visibility).toBe("signed_out");
    expect(offer).toMatchObject({ type: "stack", height: 150, radius: 22, scrim: { angle: 90 } });
    expect(texts({ body: offer! })).toEqual(["This week", "Fresh fruit, 15% off", "Shop now"]);
    expect(tiles).toMatchObject({ type: "grid", columns: 2 });
    expect(texts({ body: tiles! })).toEqual(["Fruit", "Picked this morning", "Vegetables", "Farm fresh", "Bakery", "Baked today", "Dairy", "Milk, cheese, eggs"]);
    expect(texts({ body: head! })).toEqual(["Places near you", "See all"]);
    expect(places).toMatchObject({ type: "market", market: { section: "vendors", style: "chips", sort: "nearest" } });
    expect(layout.appearance.font).toBe("Manrope");
    expect(demoApp("marketplace").primaryColor).toBe("#1E6B52");
    // Home, Shops (a page of its own), Cart, Orders and Account, every tab named.
    expect(layout.tabs.map((t) => [t.label, t.icon])).toEqual([
      ["Home", "home"],
      ["Shops", "grid_view"],
      ["Cart", "shopping_bag"],
      ["Orders", "receipt_long"],
      ["Account", "person"],
    ]);
    expect(layout.tab_bar).toMatchObject({ design: "classic", active: "#1E6B52", labels: "always" });
    const shops = layout.pages.find((p) => p.slug === "shops")!.studio!;
    expect(shops.body.children!.map((n) => n.market?.section)).toEqual(["kinds", "vendors", "club"]);
    expect(layout.pages.find((p) => p.studio?.screen === "cart")).toBeTruthy();
    expect(layout.pages.find((p) => p.studio?.screen === "food_orders")!.studio!.body.children!.map((n) => n.live_status?.source)).toEqual(["market_order"]);
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

  it("offers both homes to every food delivery project and every marketplace, which the platform takes", () => {
    for (const [id, tpl] of [["food", "food_photo"], ["marketplace", "market_photo"]] as const) {
      const app = { ...projectApp(id), appName: "Corner Kitchen" };
      expect(templatesFor(kindOf(id)).map((t) => t.id)).toContain(tpl);
      const page = TEMPLATES.find((t) => t.id === tpl)!.make(englishContext(app));
      const parsed = parseStudioPage(page, app, LANGS);
      expect(parsed.ok ? [] : parsed.errors, id).toEqual([]);
      // The owner's own words go in the brackets.
      expect(JSON.stringify(page)).toMatch(/\[[^\]]+\]/);
    }
  });
});

describe("templates = demos: the demos' pages in Arabic and Turkish", () => {
  it("writes them in the dashboard's language, the others kept as translations the page checker takes", () => {
    const languages = { default: "ar" as const, available: ["ar" as const, "en" as const, "tr" as const] };
    for (const id of STUDIO_DEMO_TYPES) {
      const app = { ...demoApp(id), appName: "Nour" };
      const ctx: SectionContext = { brand: "#123456", source: itemSourcesFor(app)[0] ?? null, app: "Nour", lang: "ar", w: (word) => String(studioAr[`w_${word}`]).replaceAll("{app}", "Nour") };
      const page = demoStudioPage(id, ctx);
      // 128 The app's own name (Sofra Eats's over its photo, a wordmark, a name on a pill) is the same in every language; 128.8 a card's rating shows its own text only as the mark before the star ("·"), no words.
      const written = allNodes(page).filter((n) => (n.text || n.title) && n.type !== "items" && n.text !== "Nour" && n.bind !== "rating");
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
      const titled = allNodes(page).filter((n) => (n.text && !/^\d+$/.test(n.text) && n.text !== DEMO_BRANDS[id].appName && n.bind !== "rating") || (n.type === "market" && n.title));
      for (const n of titled) {
        expect(n.translations?.ar, `${id}: ${n.text ?? n.title}`).toBeTruthy();
        expect(Object.values(n.translations!.ar!).join(" "), `${id}: ${n.text ?? n.title}`).toMatch(/[؀-ۿ]/);
        expect(n.translations?.tr, `${id}: ${n.text ?? n.title}`).toBeTruthy();
      }
    }
  });
});
