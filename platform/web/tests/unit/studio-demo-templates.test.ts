import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { demoKind, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { DEMO_BANNER_ART } from "@/lib/demo/design-art";
import { demoDesign, demoStudioContext } from "@/lib/demo/look";
import { demoLayout, demoSignInBlock } from "@/lib/demo/setup";
import { STUDIO_DEMO_HOMES, STUDIO_DEMO_WORDS, studioDemoTexts } from "@/lib/demo/studio-homes";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { designLayout } from "@/lib/pages/layout";
import { layoutForPlan } from "@/lib/pages/plan";
import { PLAN_INFO } from "@/lib/plans";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { LayoutBlock, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { DEMO_TEMPLATES, demoStudioPage, demoTemplateId, paragraphsOf, studioDemoBlocks, studioDemoOf } from "@/lib/studio/demo-templates";
import { TEMPLATES, templatesFor, type SectionWord } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

/**
 * Templates = demos, for Yallapp Studio: each Studio demo's home is its
 * kind's first template, made with the demo's name. These fail when the
 * demo and the template a project starts from drift apart.
 */

const NOW = new Date("2026-11-09T10:00:00Z");

function demoApp(id: StudioDemoId): App {
  const kind = demoKind(id);
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor, brandingDoneAt: NOW };
}

const kindOf = (id: StudioDemoId) => ({ type: demoKind(id).engine, vertical: demoKind(id).vertical });

/** A Studio page without its elements' ids, which differ each time a template is made. */
function withoutIds(page: StudioPage): unknown {
  const strip = (n: StudioNode): unknown => {
    const { id: _id, children, card, ...rest } = n;
    void _id;
    return { ...rest, ...(children ? { children: children.map(strip) } : {}), ...(card ? { card: strip(card) } : {}) };
  };
  return { ...page, body: strip(page.body) };
}

const texts = (page: StudioPage) => allNodes(page).flatMap((n) => (n.text ? [n.text] : []));

describe("Studio templates = Studio demos", () => {
  it("has a template for every Studio demo, and none for another kind", () => {
    expect(DEMO_TEMPLATES.map((t) => t.demo).sort()).toEqual([...STUDIO_DEMO_TYPES].sort());
    for (const id of STUDIO_DEMO_TYPES) expect(studioDemoOf(kindOf(id))).toBe(id);
    for (const kind of KINDS) {
      const demo = studioDemoOf({ type: kind.engine, vertical: kind.vertical });
      if (!(STUDIO_DEMO_TYPES as readonly string[]).includes(kind.id)) expect(demo, kind.id).toBeNull();
    }
  });

  it.each(STUDIO_DEMO_TYPES)("offers the %s demo's template first, recommended, and keeps every template it had", (id) => {
    const list = templatesFor(kindOf(id));
    expect(list[0]).toMatchObject({ id: demoTemplateId(id), demo: id, recommended: true });
    // Only its own demo.
    expect(list.filter((t) => t.demo).map((t) => t.id)).toEqual([demoTemplateId(id)]);
    // The templates it had before, in their order, after it.
    const others = TEMPLATES.filter((t) => !t.demo);
    const own = others.filter((t) => t.fits && (!t.fits.types || t.fits.types.includes(kindOf(id).type)) && (!t.fits.verticals || (kindOf(id).vertical !== null && t.fits.verticals.includes(kindOf(id).vertical!))));
    const best = own.some((t) => t.fits?.verticals) ? own.filter((t) => t.fits?.verticals) : own;
    expect(list.slice(1).map((t) => t.id)).toEqual([...best, ...others.filter((t) => !t.fits)].map((t) => t.id));
  });

  it.each(STUDIO_DEMO_TYPES)("the %s demo's home is its template, with only how to sign in added", async (id) => {
    const app = demoApp(id);
    const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, app, "banner-asset");
    const home = layout.pages[0]!;
    expect(home.studio).toBeTruthy();
    expect(home.blocks).toEqual([]);
    expect(home.studio).toEqual(demoStudioPage(id, demoStudioContext(id, appUrl()), [demoSignInBlock()]));
    // Without the sign-in note it's exactly the template an owner starts from.
    const template = DEMO_TEMPLATES.find((t) => t.demo === id)!;
    const made = template.make(demoStudioContext(id, appUrl()));
    const children = home.studio!.body.children!;
    const withoutNote = { ...home.studio!, body: { ...home.studio!.body, children: children.filter((n) => n.visibility !== "signed_out") } };
    expect(withoutIds(withoutNote)).toEqual(withoutIds(made));
  });

  it.each(STUDIO_DEMO_TYPES)("the %s demo's Studio home says and lists what its blocks do", async (id) => {
    const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demoApp(id), "banner-asset");
    const home = layout.pages[0]!;
    const words = texts(home.studio!);
    const home0 = STUDIO_DEMO_HOMES[id];
    expect(words).toEqual(expect.arrayContaining([home0.heading, home0.subheading, home0.welcome, `Welcome to ${DEMO_BRANDS[id].appName}`]));
    expect(words.some((w) => w.startsWith("This is a demo app."))).toBe(true);
    for (const block of studioDemoBlocks(id)) {
      if (block.type === "items" || block.type === "categories") {
        expect(words, block.id).toContain(block.title);
        expect(allNodes(home.studio!).some((n) => n.type === block.type && n.source === block.source), block.id).toBe(true);
      }
    }
    // The banner shows the demo's own picture.
    const banner = home.studio!.body.children![0]!;
    expect(banner.image_background_url).toBe(`${appUrl()}/design-pictures/${home0.file}`);
    // The whole demo layout, Studio page and all, is one the platform takes.
    const checked = parseLayoutContent(layout, { app: demoApp(id), now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it.each(STUDIO_DEMO_TYPES)("the %s demo's blocks are its design's, and its banner picture is drawn", (id) => {
    expect(demoDesign(id).pages[0]!.blocks).toEqual(studioDemoBlocks(id));
    const home = STUDIO_DEMO_HOMES[id];
    expect(home.file).toBe(DEMO_BANNER_ART[home.picture] ?? `art-${home.picture}.png`);
    expect(existsSync(join(process.cwd(), "public", "design-pictures", home.file))).toBe(true);
    // The brand the demo is set up with reads the same banner.
    expect(DEMO_BRANDS[id].banner).toEqual({ picture: home.picture, heading: home.heading, subheading: home.subheading });
    expect(DEMO_BRANDS[id].welcome).toBe(home.welcome);
  });

  it.each(STUDIO_DEMO_TYPES)("the %s template, taken by an owner, is a page the platform takes, with their name", (id) => {
    const kind = demoKind(id);
    const app = { ...newApp("c1", null, NOW, kind.engine, kind.vertical), backend: "hosted" as const, appName: "Corner Bakery" };
    const ctx = { brand: "#1F4E5F", source: itemSourcesFor(app)[0] ?? null, app: "Corner Bakery", w: (word: SectionWord) => (word === "heroTitle" ? "Welcome to Corner Bakery" : `[${word}]`), picture: (f: string) => `${appUrl()}/design-pictures/${f}` };
    const page = DEMO_TEMPLATES.find((t) => t.demo === id)!.make(ctx);
    const parsed = parseStudioPage(page, app, { default: "en", available: ["en"] });
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    expect(texts(page)).toContain("Welcome to Corner Bakery");
    expect(JSON.stringify(page)).not.toContain("{app}");
    // The design an owner of a regular page gets from the same demo is valid too.
    const layout = designLayout(app, demoDesign(id), { appearance: { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "flat" }, languages: { default: "en", available: ["en"] } }, NOW);
    const withStudio = { ...layout, pages: layout.pages.map((p, i) => (i === 0 ? { ...p, blocks: [], studio: page } : p)) };
    const checked = parseLayoutContent(withStudio, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it.each(STUDIO_DEMO_TYPES)("the %s demo's phone gets its Studio home on the demos' Business plan, lists and all", async (id) => {
    const app = demoApp(id);
    const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, app, "banner-asset");
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
    // Words outside a heading or paragraph, and an unclosed tag, are left out.
    expect(paragraphsOf("loose <p>kept</p> <script>x</script><p>cut")).toEqual([{ heading: false, text: "kept" }]);
  });

  it("draws a block Studio has no element for as nothing, never a broken element", () => {
    const blocks: LayoutBlock[] = [{ id: "continue", type: "continue_learning", visibility: "signed_in", title: "Continue learning" }];
    const page = demoStudioPage("instructors", { brand: "#000000", source: null, w: (w) => w }, blocks);
    expect(allNodes(page).some((n) => n.text === "Continue learning")).toBe(false);
  });
});

describe("templates = demos: the demos' first pages in Arabic and Turkish", () => {
  const studioAr = { heroTitle: "أهلًا بيك في {app}", seeAll: "شوف الكل" };

  it("has every text of each demo's first page in Arabic and Turkish", () => {
    for (const id of STUDIO_DEMO_TYPES) {
      for (const en of studioDemoTexts(id)) {
        const ar = STUDIO_DEMO_WORDS[id].ar[en];
        const tr = STUDIO_DEMO_WORDS[id].tr[en];
        expect(ar, `${id} ar: ${en}`).toMatch(/[؀-ۿ]/);
        expect(tr?.trim(), `${id} tr: ${en}`).toBeTruthy();
        expect(tr, `${id} tr: ${en}`).not.toMatch(/[؀-ۿ]/);
        expect(tr, `${id} tr: ${en}`).not.toBe(en);
      }
      // Nothing left over that the page doesn't show.
      const texts = new Set(studioDemoTexts(id));
      expect(Object.keys(STUDIO_DEMO_WORDS[id].ar).filter((en) => !texts.has(en)), id).toEqual([]);
      expect(Object.keys(STUDIO_DEMO_WORDS[id].tr).sort(), id).toEqual(Object.keys(STUDIO_DEMO_WORDS[id].ar).sort());
    }
  });

  it("writes them in the dashboard's language, the others kept as translations the page checker takes", () => {
    const languages = { default: "ar" as const, available: ["ar" as const, "en" as const, "tr" as const] };
    for (const id of STUDIO_DEMO_TYPES) {
      const app = demoApp(id);
      const ctx = { brand: "#123456", source: itemSourcesFor(app)[0] ?? null, app: "Nour", lang: "ar" as const, w: (word: SectionWord) => (word in studioAr ? studioAr[word as keyof typeof studioAr].replace("{app}", "Nour") : `[${word}]`) };
      const page = demoStudioPage(id, ctx);
      const texts = allNodes(page).filter((n) => (n.type === "text" || n.type === "button" || n.type === "search") && n.text);
      const banner = texts.find((n) => n.translations?.en?.text === STUDIO_DEMO_HOMES[id].heading)!;
      expect(banner.text, id).toBe(STUDIO_DEMO_WORDS[id].ar[STUDIO_DEMO_HOMES[id].heading]);
      expect(banner.translations?.tr?.text, id).toBe(STUDIO_DEMO_WORDS[id].tr[STUDIO_DEMO_HOMES[id].heading]);
      const welcome = texts.find((n) => n.text === "أهلًا بيك في Nour")!;
      expect(welcome.translations, id).toEqual({ en: { text: "Welcome to Nour" }, tr: { text: "Nour'e hoş geldiniz" } });
      // No English left on the Arabic page.
      for (const n of texts) expect(n.text, `${id}: ${n.text}`).toMatch(/[؀-ۿ]|^Nour$/);
      const parsed = parseStudioPage(page, app, languages);
      expect(parsed.ok ? [] : parsed.errors, id).toEqual([]);
      if (parsed.ok) expect(allNodes(parsed.value).find((n) => n.text === banner.text)?.translations?.en?.text, id).toBe(STUDIO_DEMO_HOMES[id].heading);
    }
  });

  it("gives the demo apps, made in English, their Arabic and Turkish too", () => {
    for (const id of STUDIO_DEMO_TYPES) {
      const page = demoStudioPage(id, demoStudioContext(id, appUrl()));
      const banner = allNodes(page).find((n) => n.text === STUDIO_DEMO_HOMES[id].heading)!;
      expect(banner.translations, id).toEqual({ ar: { text: STUDIO_DEMO_WORDS[id].ar[banner.text!] }, tr: { text: STUDIO_DEMO_WORDS[id].tr[banner.text!] } });
    }
  });
});
