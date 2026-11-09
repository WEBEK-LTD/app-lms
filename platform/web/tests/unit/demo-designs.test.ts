import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { ALL_DEMO_TYPES, demoKind, isStudioDemo } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { DEMO_DESIGNS, demoDesign, demoDesignId } from "@/lib/demo/look";
import { demoLayout } from "@/lib/demo/setup";
import { designsForApp } from "@/lib/pages/designs/catalog";
import { designLayout } from "@/lib/pages/layout";
import { parseLayoutContent } from "@/lib/pages/validate";
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
    expect(DEMO_DESIGNS.map((d) => d.id)).toEqual(ALL_DEMO_TYPES.map(demoDesignId));
    for (const id of ALL_DEMO_TYPES) expect(demoDesign(id).kind).toBe(demoKind(id).id);
  });

  it.each(ALL_DEMO_TYPES)("the %s demo is exactly its design, with only how to sign in added", async (id) => {
    const app = demoApp(id);
    const demo = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, app, "banner-asset");
    const design = designLayout(app, demoDesign(id), demo, NOW);
    const withoutSignIn = { ...demo, pages: demo.pages.map((p, i) => (i === 0 ? { ...p, blocks: p.blocks.filter((b) => b.id !== "demo-sign-in") } : p)) };
    // A Studio demo's home is its Studio template instead (tests/unit/studio-demo-templates.test.ts).
    const blocksOf = (layout: typeof design) => (isStudioDemo(id) ? { ...layout, pages: layout.pages.map((p, i) => (i === 0 ? { ...p, blocks: [] } : p)) } : layout);
    expect(pagesOf(withoutSignIn)).toEqual(pagesOf(blocksOf(design)));
    // The demo's look is the design's.
    const look = demoDesign(id).look;
    expect(demo.appearance).toMatchObject({ template: look.template, font: look.font, corners: look.corners, cards: look.cards, secondary_color: look.secondary_color });
  });

  it.each(ALL_DEMO_TYPES)("the %s design, taken by an owner, is a valid layout with their name and the demo's banner", (id) => {
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
    for (const id of ALL_DEMO_TYPES) {
      const list = await designsForApp(store, demoApp(id));
      expect(list[0]?.id).toBe(demoDesignId(id));
      expect(list[0]?.recommended).toBe(true);
    }
    // The built-in designs are all still there.
    const school = await designsForApp(store, demoApp("school"));
    expect(school.length).toBeGreaterThan(1);
  });
});
