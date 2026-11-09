import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { StudioNode } from "@/lib/pages/types";
import { itemSourcesFor } from "@/lib/pages/sources";
import { parseStudioPage } from "@/lib/pages/validate";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { studioDemoOf } from "@/lib/studio/demo-templates";
import { applyWholeDesign, DESIGN_THEMES, designName, designsFor, keepContent, makeDesign } from "@/lib/studio/designs";
import { TEMPLATES } from "@/lib/studio/sections";
import type { SectionWord } from "@/lib/studio/sections";
import { NOW } from "./helpers";

const words = { home: "Home", template: (id: string) => `[${id}]`, theme: (id: string) => `<${id}>` };
const languages = { default: "en" as const, available: ["en" as const] };

describe("108.7 whole designs", () => {
  it("offers each project type six looks of its own pages, each laid out its own way", () => {
    const food = designsFor({ type: "food", vertical: null }).filter((d) => !d.demo);
    expect(food).toHaveLength(DESIGN_THEMES.length);
    expect(food.map((d) => d.id)).toEqual(DESIGN_THEMES.map((t) => `yallapp-${t.id}`));
    expect(food[0]!.templates).toEqual(["food", "food_offers", "food_brand", "brand", "contact"]);
    // Not only other colours: another first page, the pages in another order, lists and categories shown another way.
    expect(new Set(food.map((d) => d.templates[0])).size).toBeGreaterThanOrEqual(3);
    expect(new Set(DESIGN_THEMES.map((t) => JSON.stringify(t.layout))).size).toBe(DESIGN_THEMES.length);
    expect(designsFor(null).map((d) => d.templates)).toEqual(DESIGN_THEMES.map(() => ["brand", "contact"]));
  });

  it("templates = demos: a kind with a Studio demo gets the demo first, the demo's own page only, in the demo's colour and font", () => {
    const zad = designsFor({ type: "food", vertical: "marketplace" });
    // Nothing added around the demo: the one page the demo has.
    expect(zad[0]).toMatchObject({ id: "demo-marketplace", demo: "marketplace", templates: ["demo_marketplace"] });
    expect(zad[0]!.theme).toMatchObject({ accent: DEMO_BRANDS.marketplace.primaryColor, font: DEMO_BRANDS.marketplace.font, background: null });
    expect(designName(zad[0]!, { ...words, demo: (name) => `Like our demo: ${name}` })).toBe("Like our demo: Zad");
    for (const kind of KINDS) {
      const demo = studioDemoOf({ type: kind.engine, vertical: kind.vertical });
      const designs = designsFor({ type: kind.engine, vertical: kind.vertical });
      expect(designs.filter((d) => d.demo).map((d) => d.demo), kind.id).toEqual(demo ? [demo] : []);
      if (!demo) continue;
      // The demo's design starts with the very page the demo shows, as it is.
      const ctx = { brand: "#1F4E5F", source: null, w: (word: SectionWord) => `[${word}]`, newId: (() => { let n = 0; return () => `n${++n}`; })() };
      const file = makeDesign(designs[0]!, ctx, words, languages);
      const tpl = TEMPLATES.find((x) => x.id === `demo_${demo}`)!;
      let m = 0;
      const plain = tpl.make({ ...ctx, brand: DEMO_BRANDS[demo].primaryColor, newId: () => `n${++m}` });
      // As it is: its own header, background and corners.
      expect(file.pages.map((p) => p.studio), kind.id).toEqual([plain]);
      expect(file.demo, kind.id).toBe(demo);
      expect(file.look, kind.id).toEqual({ font: DEMO_BRANDS[demo].font, secondary_color: DEMO_BRANDS[demo].secondaryColor });
    }
  });

  it("makes designs the page checker takes, for every project type and look", () => {
    for (const kind of KINDS) {
      const app = { ...newApp("c1", null, NOW, kind.engine, kind.vertical), backend: "hosted" as const };
      const ctx = { brand: "#1F4E5F", source: itemSourcesFor(app)[0] ?? null, w: (word: SectionWord) => `[${word}]` };
      for (const design of designsFor({ type: kind.engine, vertical: kind.vertical })) {
        const file = makeDesign(design, ctx, words, languages);
        expect(file.look).toEqual({ font: design.theme.font, secondary_color: design.demo ? DEMO_BRANDS[design.demo].secondaryColor : design.theme.accent });
        for (const page of file.pages) {
          const parsed = parseStudioPage(page.studio, app, languages);
          expect(parsed.ok ? [] : parsed.errors, `${kind.id} › ${design.id} › ${page.slug}`).toEqual([]);
          // A demo's page keeps its own background.
          if (!design.demo) expect(page.studio.background ?? null).toBe(design.theme.background);
          if (page.studio.header && design.theme.header) expect(page.studio.header.type).toBe(design.theme.header);
        }
      }
    }
  });

  it("keeps the texts and pictures that were changed, in reading order", () => {
    const from: StudioNode = {
      id: "a",
      type: "column",
      children: [
        { id: "t1", type: "text", text: "My shop", translations: { ar: { text: "متجري" } } },
        { id: "b1", type: "button", text: "Buy now" },
        { id: "i1", type: "image", image_url: "https://example.com/mine.jpg" },
      ],
    };
    const into: StudioNode = {
      id: "b",
      type: "column",
      children: [
        { id: "x", type: "row", children: [{ id: "t2", type: "text", text: "Welcome" }, { id: "t3", type: "text", text: "Second" }] },
        { id: "i2", type: "image", image_url: null },
        { id: "b2", type: "button", text: "Start" },
      ],
    };
    const kept = keepContent(from, into);
    expect(kept.children![0]!.children!.map((c) => c.text)).toEqual(["My shop", "Second"]);
    expect(kept.children![0]!.children![0]!.translations).toEqual({ ar: { text: "متجري" } });
    expect(kept.children![1]!.image_url).toBe("https://example.com/mine.jpg");
    expect(kept.children![2]!.text).toBe("Buy now");
  });
});

describe("108.7 a whole design applied", () => {
  const page = (slug: string, text: string, link?: string): import("@/lib/pages/types").LayoutPage => ({
    slug,
    title: slug.toUpperCase(),
    show_title: false,
    updated_at: "2026-01-01T00:00:00.000Z",
    blocks: [],
    studio: { body: { id: `${slug}-root`, type: "column", children: [{ id: `${slug}-t`, type: "text", text }, ...(link ? [{ id: `${slug}-b`, type: "button" as const, text: "Go", action: { type: "page" as const, page_slug: link } }] : [])] } },
  });
  const current = {
    appearance: { font: "Cairo" } as never,
    languages,
    tabs: [],
    pages: [page("home", "My shop"), page("about", "About us"), { slug: "old", title: "Old", show_title: false, updated_at: "", blocks: [{ id: "b", type: "text" } as never] }],
  } as unknown as import("@/lib/pages/types").LayoutContent;
  const fitted = [page("home-2", "Welcome", "contact-2"), page("brand-2", "Our story"), page("contact-2", "Call us", "home-2")];

  it("gives the project's pages the design's, keeping their addresses; adds the rest; takes its look", () => {
    const next = applyWholeDesign(current, fitted, { font: "Tajawal", secondary_color: "#C2410C" }, { mode: "project", openSlug: "home", pageIndex: 0, keep: false, now: "now" });
    expect(next.pages.map((p) => p.slug)).toEqual(["home", "about", "old", "contact-2"]);
    expect(next.pages[0]!.studio!.body.children![0]!.text).toBe("Welcome");
    // Links follow: the design's contact page was added under its own address; its link home goes to the project's home.
    expect(next.pages[0]!.studio!.body.children![1]!.action).toEqual({ type: "page", page_slug: "contact-2" });
    expect(next.pages[3]!.studio!.body.children![1]!.action).toEqual({ type: "page", page_slug: "home" });
    // A page that isn't Studio's stays.
    expect(next.pages[2]!.blocks).toHaveLength(1);
    expect(next.appearance).toMatchObject({ font_family: "Tajawal", secondary_color: "#C2410C" });
  });

  it("keeps the project's texts when asked, and changes only the open page for one page", () => {
    const kept = applyWholeDesign(current, fitted, undefined, { mode: "project", openSlug: "home", pageIndex: 0, keep: true, now: "now" });
    expect(kept.pages[0]!.studio!.body.children![0]!.text).toBe("My shop");
    const one = applyWholeDesign(current, fitted, { font: "Tajawal" }, { mode: "page", openSlug: "about", pageIndex: 2, keep: false, now: "now" });
    expect(one.pages.map((p) => p.studio?.body.children?.[0]?.text)).toEqual(["My shop", "Call us", undefined]);
    // Its link to a page of the design the project hasn't goes; the look stays.
    expect(one.pages[1]!.studio!.body.children![1]).not.toHaveProperty("action");
    expect(one.appearance).not.toHaveProperty("font_family");
  });
});
