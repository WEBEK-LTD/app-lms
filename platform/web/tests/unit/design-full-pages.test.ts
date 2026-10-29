import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { applyDesign, blockTexts, DESIGNS, sampleTexts, type ContactFacts } from "@/lib/pages/designs";
import type { LayoutBlock, LayoutContent } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { NOW } from "./helpers";

/** 110.3 Every ready-made design is a whole app its owner only edits: its pages are full, in the business's own voice. */

const current: Pick<LayoutContent, "appearance" | "languages"> = {
  appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null },
  languages: { default: "en", available: ["en", "ar"] },
};
const facts: ContactFacts = { website: "https://brand.test", email: "hello@brand.test", whatsapp: null };
const base = "https://yallapp.test";

/** The pages each kind has besides home, About us, Contact and Questions. */
const OWN_PAGES: Record<string, string[]> = {
  academy: ["pricing"],
  instructors: ["pricing"],
  store: ["offers", "delivery"],
  restaurant: ["catering"],
  bookings: ["prices"],
  services: ["prices"],
  clinic: ["doctors", "patients"],
  fitness: ["timetable", "plans"],
  real_estate: ["areas", "valuation"],
  news: [],
  events: ["visit", "hire"],
  charity: ["work", "volunteer"],
  delivery: ["how-it-works", "join"],
  food: ["how-it-works", "join"],
  rides: ["how-it-works", "join"],
  taxi: ["how-it-works", "join"],
  school: ["admissions"],
};

const words = (html: string) => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

describe("110.3 full ready-made designs", () => {
  it("covers every kind", () => {
    expect(Object.keys(OWN_PAGES).sort()).toEqual(KINDS.map((k) => k.id).sort());
  });

  for (const design of DESIGNS) {
    it(`${design.id} has every page of its kind, filled`, () => {
      const slugs = design.pages.map((p) => p.slug);
      for (const slug of ["home", "about", "contact", "faq", ...OWN_PAGES[design.kind]!]) expect(slugs, `${design.id} ${slug}`).toContain(slug);
      const pageOf = (slug: string) => design.pages.find((p) => p.slug === slug)!;
      const one = (slug: string, type: LayoutBlock["type"]) => pageOf(slug).blocks.filter((b) => b.type === type);

      // Home: 8 to 12 blocks, three slides with real words, three believable quotes, four to six questions.
      const home = pageOf("home").blocks;
      expect(home.length, design.id).toBeGreaterThanOrEqual(8);
      expect(home.length, design.id).toBeLessThanOrEqual(12);
      const slider = home.find((b) => b.type === "slider")!;
      expect(slider.slides!.length, design.id).toBe(3);
      for (const s of slider.slides!) expect(s.heading && s.subheading, design.id).toBeTruthy();
      const quotes = home.find((b) => b.type === "testimonials")!.quotes!;
      expect(quotes.length, design.id).toBe(3);
      for (const q of quotes) {
        expect(q.role, design.id).toBeTruthy();
        expect(q.rating, design.id).toBeGreaterThanOrEqual(4);
        expect(words(q.text), design.id).toBeGreaterThanOrEqual(6);
      }
      const questions = home.find((b) => b.type === "faq")!.questions!;
      expect(questions.length, design.id).toBeGreaterThanOrEqual(4);
      expect(questions.length, design.id).toBeLessThanOrEqual(6);
      expect(home.some((b) => b.type === "contact"), design.id).toBe(true);

      // About us: a story of about 80 words, three or four people with pictures, numbers and six to eight photos.
      expect(words(one("about", "text")[0]!.html!), design.id).toBeGreaterThanOrEqual(55);
      const people = one("about", "team")[0]!.people!;
      expect(people.length, design.id).toBeGreaterThanOrEqual(3);
      expect(people.length, design.id).toBeLessThanOrEqual(4);
      for (const p of people) expect(p.photo_url, `${design.id} ${p.name}`).toMatch(/^picture:art-/);
      expect(one("about", "stats"), design.id).toHaveLength(1);
      const photos = one("about", "gallery")[0]!.images!;
      expect(photos.length, design.id).toBeGreaterThanOrEqual(6);
      expect(photos.length, design.id).toBeLessThanOrEqual(8);

      // Contact: words, the map, the hours (a newsroom has none), a form and the contact details.
      expect(pageOf("contact").blocks.map((b) => b.type), design.id).toEqual(expect.arrayContaining(["text", "map", "form", "contact", ...(design.kind === "news" ? [] : ["hours"])]));
      // Questions: six to eight.
      const faq = one("faq", "faq")[0]!.questions!;
      expect(faq.length, design.id).toBeGreaterThanOrEqual(6);
      expect(faq.length, design.id).toBeLessThanOrEqual(8);

      // The home page's header shows the app's logo or name.
      expect(["logo", "centered"], design.id).toContain(design.look.header?.layout);
      // Each page but home opens from a tab or the side menu.
      const opened = new Set([...design.tabs, ...(design.menu ?? [])].map((t) => (t.target.type === "page" ? t.target.page_slug : null)));
      for (const slug of slugs.filter((s) => s !== "home")) expect(opened.has(slug), `${design.id} ${slug}`).toBe(true);
    });
  }

  it("has sample texts in the business's voice, never instructions or placeholders", () => {
    for (const design of DESIGNS) {
      const layout = applyDesign(design, { appName: "Nile", facts, current, now: NOW });
      // A form's questions ask for names, so they're left out here.
      const texts = layout.pages.flatMap((p) => p.blocks.filter((b) => b.type !== "form").map((b) => blockTexts(b))).join(" ");
      for (const p of layout.pages.flatMap((pg) => pg.blocks.flatMap((b) => b.people ?? []))) expect(p.name, design.id).not.toBe("Your name");
      expect(texts, design.id).not.toMatch(/\bWrite (?:what|how|who|about|your|a few|the|this|today|why|which|here)\b|"[A-Z][a-z ]+'s (?:name|role)"|\bAI\b|\b[Ll]orem\b/);
    }
  });

  it("fills in Yallapp's drawn pictures at the platform's address, and leaves them out without it", () => {
    for (const design of DESIGNS) {
      const kind = KINDS.find((k) => k.id === design.kind)!;
      const layout = applyDesign(design, { appName: "Nile", facts, current, now: NOW, pictureBase: base });
      const blocks = layout.pages.flatMap((p) => p.blocks);
      for (const b of blocks) {
        for (const p of b.people ?? []) if (p.photo_url) expect(p.photo_url, design.id).toMatch(new RegExp(`^${base}/design-pictures/art-[a-z0-9-]+\\.png$`));
        for (const c of b.cards ?? []) if (c.image_url) expect(c.image_url, design.id).toMatch(new RegExp(`^${base}/design-pictures/art-[a-z0-9-]+\\.png$`));
        for (const i of b.images ?? []) expect(i.image_url, design.id).toMatch(new RegExp(`^${base}/design-pictures/art-[a-z0-9-]+\\.png$`));
      }
      const parsed = parseLayoutContent(layout, { app: { appType: kind.engine, backend: "hosted", vertical: kind.vertical }, now: NOW });
      expect(parsed.ok ? [] : parsed.errors, design.id).toEqual([]);
      const bare = applyDesign(design, { appName: "Nile", facts, current, now: NOW }).pages.flatMap((p) => p.blocks);
      expect(bare.some((b) => b.type === "gallery"), design.id).toBe(false);
      expect(bare.flatMap((b) => [...(b.people ?? []).map((p) => p.photo_url), ...(b.cards ?? []).map((c) => c.image_url)]).filter(Boolean), design.id).toEqual([]);
    }
  });

  it("marks the cards, photos, map and forms as samples until the owner changes them", () => {
    const layout = applyDesign(DESIGNS.find((d) => d.id === "restaurant-menu")!, { appName: "Nile", facts, current, now: NOW, pictureBase: base });
    const samples = sampleTexts(layout);
    const contact = layout.pages.find((p) => p.slug === "contact")!;
    const map = contact.blocks.find((b) => b.type === "map")!;
    expect(samples["contact/map"]).toBe(blockTexts(map));
    // Moving the pin makes it the owner's.
    expect(blockTexts({ ...map, latitude: 30.05, longitude: 31.24 })).not.toBe(samples["contact/map"]);
    expect(samples["contact/message"]).toBeDefined();
    const gallery = layout.pages.find((p) => p.slug === "about")!.blocks.find((b) => b.type === "gallery")!;
    expect(blockTexts({ ...gallery, images: [{ image_url: "https://yallapp.test/api/v1/assets/mine", caption: null }] })).not.toBe(samples["about/photos"]);
    expect(samples["home/specials"]).toBeDefined();
  });
});
