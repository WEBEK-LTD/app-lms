import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/icon-names";
import { ENGINES, hostedOnly, KINDS } from "@/lib/app/kinds";
import type { AppBackend } from "@/lib/data/types";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { applyDesign, blockTexts, contactFacts, designById, designFits, DESIGNS, designsFor, missingScreens, sampleTexts, type ContactFacts, type Design } from "@/lib/pages/designs";
import { BLOCK_ICONS } from "@/lib/pages/labels";
import { PAGE_ICONS } from "@/lib/pages/icons";
import { blockTypesFor, categorySourcesFor, itemSourcesFor, screenOptionsFor, SOURCE_SORTS } from "@/lib/pages/sources";
import { BLOCK_TYPES, type LayoutContent } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { NOW } from "./helpers";

/** 33 Ready-made designs: each one is a layout publishing accepts, for every app of its kind. */

const current: Pick<LayoutContent, "appearance" | "languages"> = {
  appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null },
  languages: { default: "en", available: ["en", "ar"] },
};
const facts: ContactFacts = { website: "https://brand.test", email: "hello@brand.test", whatsapp: "+20 100 123 4567" };
const none: ContactFacts = { website: null, email: null, whatsapp: null };

function kindOfDesign(design: Design) {
  const kind = KINDS.find((k) => k.id === design.kind);
  if (!kind) throw new Error(`${design.id}: no kind ${design.kind}`);
  return kind;
}

function backendsOf(design: Design): AppBackend[] {
  return hostedOnly(kindOfDesign(design).engine) ? ["hosted"] : ["hosted", "wordpress"];
}

describe("ready-made designs", () => {
  it("has three or four designs for every kind, with unique IDs", () => {
    for (const kind of KINDS) {
      const count = DESIGNS.filter((d) => d.kind === kind.id).length;
      expect(count, kind.id).toBeGreaterThanOrEqual(3);
      expect(count, kind.id).toBeLessThanOrEqual(4);
    }
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
    for (const d of DESIGNS) {
      expect(d.id, d.id).toMatch(/^[a-z0-9-]{3,40}$/);
      expect(d.name.length, d.id).toBeLessThanOrEqual(24);
      expect(d.description.length, d.id).toBeLessThanOrEqual(110);
    }
  });

  it("offers each app the designs of its kind", () => {
    expect(designsFor({ appType: "lms" }).map((d) => d.id)).toEqual(["academy-classic", "academy-online", "academy-coaching", "academy-kids"]);
    expect(designsFor({ appType: "store", vertical: "restaurant" }).every((d) => d.kind === "restaurant")).toBe(true);
    expect(designsFor({ appType: "booking", vertical: "clinic" }).every((d) => d.kind === "clinic")).toBe(true);
    expect(designFits(designById("fitness-gym")!, { appType: "booking", vertical: "fitness" })).toBe(true);
    expect(designFits(designById("fitness-gym")!, { appType: "booking", vertical: null })).toBe(false);
    expect(designById("nope")).toBeNull();
  });

  for (const design of DESIGNS) {
    for (const backend of backendsOf(design)) {
      it(`${design.id} is valid for a ${backend} ${design.kind} app`, () => {
        const kind = kindOfDesign(design);
        const app = { appType: kind.engine, backend, vertical: kind.vertical };
        for (const contact of [facts, none]) {
          const layout = applyDesign(design, { appName: "Nile & Co", facts: contact, current, now: NOW });
          const parsed = parseLayoutContent(layout, { app, now: NOW });
          expect(parsed.ok ? [] : parsed.errors, design.id).toEqual([]);
          // Nothing is lost or changed by the validator.
          if (parsed.ok) expect(parsed.value.pages.map((p) => p.blocks.length)).toEqual(layout.pages.map((p) => p.blocks.length));
        }
        const layout = applyDesign(design, { appName: "Nile & Co", facts, current, now: NOW });
        const blocks = layout.pages.flatMap((p) => p.blocks);
        // Every block type, list, order, screen and icon is one this app has.
        const types = blockTypesFor(app);
        const screens = screenOptionsFor(app).filter((s) => !s.alias).map((s) => s.value);
        for (const b of blocks) {
          expect(types, `${design.id} ${b.id}`).toContain(b.type);
          if (b.type === "items") {
            expect(itemSourcesFor(app)).toContain(b.source);
            expect(SOURCE_SORTS[b.source!], `${design.id} ${b.id}`).toContain(b.query!.sort);
          }
          if (b.type === "categories") expect(categorySourcesFor(app)).toContain(b.source);
          for (const l of b.links ?? []) expect(PAGE_ICONS as readonly string[], `${design.id} ${l.icon}`).toContain(l.icon);
          if (b.icon) expect(PAGE_ICONS as readonly string[]).toContain(b.icon);
        }
        for (const t of layout.tabs) {
          expect(PAGE_ICONS as readonly string[], `${design.id} tab ${t.icon}`).toContain(t.icon);
          if (t.target.type === "screen") expect(screens, `${design.id} tab ${t.id}`).toContain(t.target.screen);
        }
        const actions = [...layout.tabs.map((t) => t.target), ...blocks.flatMap((b) => [b.action, b.see_all, ...(b.links ?? []).map((l) => l.action), ...(b.slides ?? []).map((s) => s.action)])];
        for (const a of actions) if (a?.type === "screen") expect(screens, `${design.id} ${a.screen}`).toContain(a.screen);
        // Every design shows its engine's own content.
        expect(blocks.some((b) => b.type === "items" && b.source === ENGINES[kind.engine].pages.source), design.id).toBe(true);
        // Nothing course-related outside Academy apps.
        if (kind.engine !== "lms") expect(blocks.some((b) => b.type === "continue_learning")).toBe(false);
      });
    }
  }

  it("keeps the app's languages and its own look settings, and fills in its name, dates and contact details", () => {
    const design = designById("academy-coaching")!;
    const layout = applyDesign(design, { appName: "Ada <Academy>", facts, current: { ...current, appearance: { ...current.appearance, theme_mode: "dark" } }, now: NOW });
    expect(layout.languages).toEqual(current.languages);
    expect(layout.appearance).toMatchObject({ theme_mode: "dark", template: "minimal", corners: "sharp", font: "Plus Jakarta Sans", secondary_color: "#0F766E" });
    const home = layout.pages[0]!.blocks;
    expect(home.find((b) => b.id === "welcome")!.html).toContain("from Ada &lt;Academy&gt;.");
    expect(home.find((b) => b.type === "countdown")!.ends_at).toBe("2026-11-11T10:00:00Z");
    const about = layout.pages.find((p) => p.slug === "about")!;
    expect(about.blocks.find((b) => b.type === "contact")).toMatchObject({ website: "https://brand.test", email: "hello@brand.test", whatsapp: "+20 100 123 4567", phone: null });
    // Without contact details the Contact block is left out.
    const bare = applyDesign(design, { appName: null, facts: none, current, now: NOW });
    expect(bare.pages.find((p) => p.slug === "about")!.blocks.some((b) => b.type === "contact")).toBe(false);
    expect(bare.pages[0]!.blocks.find((b) => b.id === "welcome")!.html).toContain("from our app.");
  });

  it("38.21 leaves out a hosted academy's Wishlist, keeping Orders and the rest", () => {
    const design = designById("academy-classic")!;
    const missing = missingScreens({ connector: { kind: "courses" } as never });
    expect(missing).toEqual(["favorites"]);
    expect(missingScreens({ connector: null })).toEqual([]);
    const links = (layout: ReturnType<typeof applyDesign>) => layout.pages.flatMap((p) => p.blocks.flatMap((b) => b.links ?? [])).map((l) => l.label);
    const hosted = applyDesign(design, { appName: "Ada", facts, current, now: NOW, missingScreens: missing });
    expect(links(hosted)).not.toContain("Wishlist");
    expect(links(hosted)).toContain("Orders");
    expect(links(applyDesign(design, { appName: "Ada", facts, current, now: NOW }))).toContain("Wishlist");
  });

  it("reads contact details the app already shows", () => {
    expect(contactFacts({ siteUrl: "https://ada.test", supportEmail: "help@ada.test", hostedSettings: null })).toEqual({ website: "https://ada.test", email: "help@ada.test", whatsapp: null });
    expect(contactFacts({ siteUrl: "http://plain.test", supportEmail: null, hostedSettings: null }).website).toBeNull();
  });

  it("knows which blocks still have the design's sample texts", () => {
    const layout = applyDesign(designById("bookings-salon")!, { appName: "Salon", facts, current, now: NOW });
    const samples = sampleTexts(layout);
    const team = layout.pages[0]!.blocks.find((b) => b.type === "team")!;
    expect(samples["home/team"]).toBe(blockTexts(team));
    expect(blockTexts({ ...team, people: [{ ...team.people![0]!, name: "Leyla" }, team.people![1]!] })).not.toBe(samples["home/team"]);
    // Lists and contact details aren't samples.
    expect(Object.keys(samples)).not.toContain("home/services");
    expect(Object.keys(samples)).not.toContain("home/contact");
  });
});

describe("block icons", () => {
  const dart = readFileSync(path.join(__dirname, "../../../../mobile/lib/core/theme/symbol_names.dart"), "utf8");
  it("puts every icon the editor offers in the site's icon font and in the app", () => {
    for (const icon of PAGE_ICONS) {
      expect(ICON_NAMES as readonly string[], icon).toContain(icon);
      expect(dart, icon).toContain(`'${icon}':`);
    }
    for (const type of BLOCK_TYPES) expect(ICON_NAMES as readonly string[], type).toContain(BLOCK_ICONS[type]);
  });
});

describe("99.1 each design's own colours, pictures and social links", () => {
  const base = "https://yallapp.test";
  const pictures = readdirSync(path.resolve(__dirname, "../../public/design-pictures"));

  it("offers its own main and second colour first, then the owner's main colour with its second one", () => {
    for (const design of DESIGNS) {
      const [own, yours, other] = design.palettes!;
      expect(own, design.id).toMatchObject({ id: "design", primary: expect.stringMatching(/^#[0-9A-F]{6}$/), secondary: design.look.secondary_color });
      expect(yours, design.id).toMatchObject({ id: "yours", primary: null, secondary: design.look.secondary_color });
      expect(other!.primary, design.id).toMatch(/^#[0-9A-F]{6}$/);
    }
    // No two designs of a kind look alike: each has its own main colour.
    for (const kind of KINDS) {
      const mains = DESIGNS.filter((d) => d.kind === kind.id).map((d) => d.palettes![0]!.primary);
      expect(new Set(mains).size, kind.id).toBe(mains.length);
    }
  });

  it("starts every home page with its pictures, and a design publishing accepts", () => {
    for (const design of DESIGNS) {
      expect(pictures, design.id).toEqual(expect.arrayContaining([`${design.id}-1.jpg`, `${design.id}-2.jpg`]));
      const layout = applyDesign(design, { appName: "Nile", facts, current, now: NOW, pictureBase: base });
      const home = layout.pages.find((p) => p.slug === "home")!;
      const hero = home.blocks.find((b) => b.type === "slider" || b.type === "banner");
      expect(hero, design.id).toBeDefined();
      for (const block of layout.pages.flatMap((p) => p.blocks)) {
        if (block.type === "banner") expect(block.image_url, design.id).toMatch(new RegExp(`^${base}/design-pictures/${design.id}-[12]\\.jpg$`));
        for (const slide of block.slides ?? []) expect(slide.image_url, design.id).toMatch(new RegExp(`^${base}/design-pictures/${design.id}-[12]\\.jpg$`));
      }
      // A banner welcoming to the app, after a search box that leads the page.
      if (hero!.type === "banner") {
        expect(hero!.heading, design.id).toBe("Welcome to Nile");
        expect(home.blocks.indexOf(hero!), design.id).toBe(home.blocks[0]!.type === "search" ? 1 : 0);
      }
      const checked = parseLayoutContent(layout, { app: { appType: kindOfDesign(design).engine, backend: "hosted" }, now: NOW, ownFonts: [] });
      expect(checked.ok ? null : checked.errors, design.id).toBeNull();
    }
  });

  it("puts the business's social profiles on the Contact page, and nothing without them", () => {
    const social = [{ network: "instagram" as const, url: "https://instagram.com/nile" }];
    for (const design of DESIGNS) {
      const withThem = applyDesign(design, { appName: "Nile", facts, current, now: NOW, social });
      expect(withThem.pages.find((p) => p.slug === "contact")!.blocks.at(-1), design.id).toMatchObject({ type: "social", profiles: social });
      const without = applyDesign(design, { appName: "Nile", facts, current, now: NOW });
      expect(without.pages.flatMap((p) => p.blocks).some((b) => b.type === "social"), design.id).toBe(false);
    }
  });
});
