import { newApp } from "../app/setup";
import type { App } from "../data/types";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "../pages/defaults";
import { picture, type Design } from "../pages/designs/build";
import type { ItemSource, LayoutBlock } from "../pages/types";
import { DEMO_BRANDS } from "./content";
import { ALL_DEMO_TYPES, demoKind, isStudioDemo, PREMIUM_ACADEMY_DEMO, type DemoId, type StudioDemoId } from "./constants";
import { DEMO_BANNER_ART } from "./design-art";
import { en as studioWords } from "../../i18n/dashboard/studio";
import type { SectionContext, SectionWord } from "../studio/sections";

/**
 * Templates = demos. Each demo app's pages and look are this design, so the
 * app an owner starts from "Like our demo" is the app they tried, and the
 * two can't drift apart (tests/unit/demo-designs.test.ts). Its pictures are
 * the demo's own drawn pictures (public/design-pictures). The demo then only
 * adds how to sign in to it (lib/demo/setup.ts demoLayout). A Studio demo's
 * home is a Studio page instead, its kind's own designed page
 * (lib/studio/sections.ts demoStudioPage), which the demo and a project
 * started from it both make: its design's home has no blocks.
 */

/** The design id of a demo's look: `demo-<demo>`. */
export function demoDesignId(id: DemoId): string {
  return `demo-${id}`;
}

/** The fixed date the designs are made at; the date never reaches a page. */
const MADE_AT = new Date("2026-01-01T00:00:00Z");

/** The welcome banner and the sentence about the business, with `{app}` where the app's name goes. */
function demoHomeBlocks(id: DemoId): { banner: LayoutBlock; welcome: string } {
  const brand = DEMO_BRANDS[id];
  return {
    banner: {
      id: "demo-banner",
      type: "banner",
      visibility: "everyone",
      title: null,
      image_url: picture(DEMO_BANNER_ART[brand.banner.picture] ?? `art-${brand.banner.picture}.png`),
      heading: brand.banner.heading,
      subheading: brand.banner.subheading,
      action: null,
    },
    welcome: `<h2>Welcome to {app}</h2><p>${escapeHtml(brand.welcome)}</p>`,
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/** The demo's design: the pages its kind starts with, the banner and welcome on its home, and the demo's look and colours. */
export function demoDesign(id: DemoId): Design {
  const brand = DEMO_BRANDS[id];
  const kind = demoKind(id);
  const app: App = { ...newApp("demo", null, MADE_AT, kind.engine, kind.vertical), appName: "{app}", brandingDoneAt: MADE_AT };
  const base = defaultLayout(app, BUILT_IN_APP_DEFAULTS, MADE_AT);
  const { banner, welcome } = demoHomeBlocks(id);
  // A Studio demo's home is its Studio page (lib/studio/sections.ts demoStudioPage), never blocks made for it.
  const home = (blocks: LayoutBlock[]): LayoutBlock[] => (isStudioDemo(id) ? [] : [banner, ...blocks.map((b) => (b.id === "welcome" ? { ...b, html: welcome } : b))]);
  const pages = base.pages.map((p, i) => ({
    slug: p.slug,
    title: p.title,
    show_title: p.show_title,
    blocks: i === 0 ? home(p.blocks) : p.blocks,
  }));
  return {
    id: demoDesignId(id),
    kind: kind.id,
    name: `Like our demo: ${brand.appName}`,
    description: brand.banner.heading,
    look: { template: brand.template, font: brand.font, corners: brand.corners, cards: brand.cards, secondary_color: brand.secondaryColor },
    tabs: structuredClone(base.tabs),
    ...(base.menu?.length ? { menu: structuredClone(base.menu) } : {}),
    pages,
    palettes: [{ id: "design", name: "The design's colours", primary: brand.primaryColor, secondary: brand.secondaryColor }],
    recommended: true,
  };
}

/** 123 The demos with a design of pages: all but the premium academy, whose design is its Studio template (`academy_premium`), never a page design an academy's owner would take. */
export const DEMO_DESIGN_TYPES: readonly DemoId[] = ALL_DEMO_TYPES.filter((id) => id !== PREMIUM_ACADEMY_DEMO);

/** Every demo's design, in the demos' order. */
export const DEMO_DESIGNS: readonly Design[] = DEMO_DESIGN_TYPES.map(demoDesign);

/** The demo whose design this is (`demo-<demo>`), for its sample entries (lib/samples/demo.ts); null for any other design. */
export function demoOfDesign(designId: string | null | undefined): DemoId | null {
  return DEMO_DESIGN_TYPES.find((id) => demoDesignId(id) === designId) ?? null;
}

/**
 * How a Studio demo's template is made for the demo itself: its brand's
 * colour and name, its main list (`source`, as a project's), the
 * template's words in English (the demos' language) and Yallapp's pictures
 * at `pictureBase`. Its elements' ids are numbered, so the demo's page is
 * the same each time it's made.
 */
export function demoStudioContext(id: StudioDemoId, pictureBase: string, source: ItemSource | null = null): SectionContext {
  const brand = DEMO_BRANDS[id];
  let n = 0;
  return {
    brand: brand.primaryColor,
    source,
    app: brand.appName,
    lang: "en",
    w: (word: SectionWord) => String(studioWords[`w_${word}`]).replaceAll("{app}", brand.appName),
    picture: (file: string) => `${pictureBase}/design-pictures/${file}`,
    newId: () => `demo-${++n}`,
  };
}
