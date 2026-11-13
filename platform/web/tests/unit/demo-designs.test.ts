import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { ALL_DEMO_TYPES, demoKind, isStudioDemo } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { DEMO_DESIGN_TYPES, DEMO_DESIGNS, demoDesign, demoDesignId, demoStudioContext } from "@/lib/demo/look";
import { demoLayout } from "@/lib/demo/setup";
import { designsForApp } from "@/lib/pages/designs/catalog";
import { withBuiltInTexts } from "@/lib/pages/builtin";
import { designLayout } from "@/lib/pages/layout";
import { parseLayoutContent } from "@/lib/pages/validate";
import { demoPageTabs, demoTabPages } from "@/lib/studio/demo-pages";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";

/**
 * Templates = demos: each demo app is its own design, the one an owner
 * starts from as "Like our demo". These fail when the two drift apart.
 */

const NOW = new Date("2026-11-09T10:00:00Z");

function demoApp(id: (typeof ALL_DEMO_TYPES)[number]): App {
  const kind = demoKind(id);
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, appName: DEMO_BRANDS[id].appName, brandingDoneAt: NOW };
}

/** A layout without the dates, which change each time it's made. */
function pagesOf(layout: { pages: { slug: string; title: string; blocks: unknown[] }[]; tabs: unknown[] }) {
  return { tabs: layout.tabs, pages: layout.pages.map((p) => ({ slug: p.slug, title: p.title, blocks: p.blocks })) };
}

describe("templates = demos", () => {
  it("has a design for every demo, its kind's", () => {
    expect(DEMO_DESIGNS.map((d) => d.id)).toEqual(DEMO_DESIGN_TYPES.map(demoDesignId));
    for (const id of DEMO_DESIGN_TYPES) expect(demoDesign(id).kind).toBe(demoKind(id).id);
    // 123 But the premium academy's: its design is its Studio template (tests/unit/studio-demo-templates.test.ts), never a design of pages offered to an academy.
    expect(DEMO_DESIGN_TYPES).toEqual(ALL_DEMO_TYPES.filter((id) => id !== "premium_academy"));
  });

  it.each(DEMO_DESIGN_TYPES)("the %s demo is exactly its design, with only how to sign in added", async (id) => {
    const app = demoApp(id);
    const demo = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, app, "banner-asset");
    // "Like our demo" taken by an app that had another look and other pages.
    const other = { appearance: { template: "classic" as const, theme_mode: "system" as const, user_can_change_mode: true, secondary_color: null, font: "Bricolage Grotesque" as const, corners: "sharp" as const, cards: "flat" as const }, languages: { default: "en" as const, available: ["en" as const] } };
    const design = designLayout(app, demoDesign(id), other, NOW);
    // 120 A Studio demo's pages after its home are its tabs' Studio pages, drawn around their screens (tests/unit/studio-demo-templates.test.ts): set apart, with the tabs opening them.
    const own = demo.pages.filter((p) => !p.studio?.screen);
    const withoutSignIn = { ...demo, pages: own.map((p, i) => (i === 0 ? { ...p, blocks: p.blocks.filter((b) => b.id !== "demo-sign-in") } : p)) };
    // Every page with its blocks (a Studio demo's home has none: it is its kind's designed Studio page, tests/unit/studio-demo-templates.test.ts), the tabs and the side menu.
    // 128 With the pages of its own a tab opens (Zad's Shops), and its tabs as its own design has them.
    const ownPages = isStudioDemo(id) ? demoTabPages(design.tabs, demoStudioContext(id, "https://yallapp.test")).filter((p) => !p.studio.screen).map((p) => ({ ...p, blocks: [] })) : [];
    expect(pagesOf(withoutSignIn)).toEqual(pagesOf(isStudioDemo(id) ? { ...design, pages: [...design.pages, ...ownPages], tabs: demoPageTabs(design.tabs, { lang: "en", demo: id }) } : design));
    if (!isStudioDemo(id)) expect(own).toHaveLength(demo.pages.length);
    expect(demo.menu ?? []).toEqual(design.menu ?? []);
    // The demo's look is the design's.
    const look = demoDesign(id).look;
    const lookOf = (l: typeof demo) => ({ template: l.appearance.template, font: l.appearance.font, corners: l.appearance.corners, cards: l.appearance.cards, secondary_color: l.appearance.secondary_color });
    expect(lookOf(demo)).toEqual({ template: look.template, font: look.font, corners: look.corners, cards: look.cards, secondary_color: look.secondary_color });
    expect(lookOf(design)).toEqual(lookOf(demo));
  });

  it.each(ALL_DEMO_TYPES.filter((id) => !isStudioDemo(id)))("the %s design, taken by an owner, is a valid layout with their name and the demo's banner", (id) => {
    const app = { ...demoApp(id), appName: "Corner Bakery", demo: false };
    const layout = designLayout(app, demoDesign(id), { appearance: { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "flat" }, languages: { default: "en", available: ["en"] } }, NOW);
    const home = layout.pages[0]!;
    expect(home.blocks[0]).toMatchObject({ type: "banner", heading: DEMO_BRANDS[id].banner.heading });
    expect(JSON.stringify(home.blocks)).toContain("Welcome to Corner Bakery");
    expect(JSON.stringify(layout)).not.toContain("{app}");
    const checked = parseLayoutContent(layout, { app: { ...app, backend: "hosted" }, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });

  it("offers the demo's design first, before the other designs of its kind, and keeps them all", async () => {
    const store = new MemoryStore();
    for (const id of DEMO_DESIGN_TYPES) {
      const list = await designsForApp(store, demoApp(id));
      expect(list[0]?.id).toBe(demoDesignId(id));
      expect(list[0]?.recommended).toBe(true);
    }
    // The built-in designs are all still there.
    const school = await designsForApp(store, demoApp("school"));
    expect(school.length).toBeGreaterThan(1);
    expect((await designsForApp(store, demoApp("lms"))).map((d) => d.id)).not.toContain("demo-premium_academy");
  });
});

describe("templates = demos: a demo's home in Arabic and Turkish", () => {
  it.each(ALL_DEMO_TYPES.filter((id) => !isStudioDemo(id)))("the %s design's banner and welcome come in the app's other languages", (id) => {
    const app: App = { ...newApp("c1", null, NOW, demoKind(id).engine, demoKind(id).vertical), appName: "Nour", brandingDoneAt: NOW };
    const layout = designLayout(app, demoDesign(id), { appearance: { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "flat" }, languages: { default: "en", available: ["en", "ar", "tr"] } }, NOW);
    const served = withBuiltInTexts({ version: "v1", ...layout, languages: { default: "en", available: ["en", "ar", "tr"] } });
    const [banner, ...rest] = served.pages[0]!.blocks;
    expect(banner!.heading).toBe(DEMO_BRANDS[id].banner.heading);
    expect(banner!.translations?.ar?.heading, id).toMatch(/[؀-ۿ]/);
    expect(banner!.translations?.ar?.subheading, id).toMatch(/[؀-ۿ]/);
    expect(banner!.translations?.tr?.heading, id).toBeTruthy();
    expect(banner!.translations?.tr?.heading, id).not.toBe(banner!.heading);
    const welcome = rest.find((b) => b.id === "welcome")!;
    expect(welcome.translations?.ar?.html, id).toContain("مرحبًا بك في Nour");
    expect(welcome.translations?.tr?.html, id).toContain("Nour uygulamasına hoş geldiniz");
  });
});
