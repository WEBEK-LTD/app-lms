import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ICON_NAMES } from "@/components/icon-names";
import { storyCopyFor } from "@/content/stories";
import { LANGS } from "@/i18n/config";
import { isLocalizedPath, localePath } from "@/i18n/paths";
import { MemoryStore } from "@/lib/data/memory";
import { APP_SCREENS, SCREEN_ALT } from "@/lib/marketing";
import { STUDIO_SOLUTIONS } from "@/lib/marketing";
import { AGENCY, competitorsOf, YALLAPP } from "@/site/story/competitors";
import { photosOf } from "@/site/story/photos";
import { photoSlots, STORIES, storyScreens } from "@/site/story/stories";
import { STORY_IDS, storyPath } from "@/site/story/types";

/**
 * The Studio story pages (/yallapp-studio/<story>): their words in every
 * language match their shape item by item, every screen and photo they
 * show is there, the comparison names its sources, and each page renders
 * in English, Arabic and Turkish.
 */

const PUBLIC = path.join(__dirname, "../../public");
const store = new MemoryStore();

vi.mock("@/lib/data", () => ({ getStore: async () => store }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined, has: () => false }),
  headers: async () => new Headers(),
}));

const { StoryPage } = await import("@/site/story/page");
const { renderToReadableStream } = await import("react-dom/server");

async function render(lang: (typeof LANGS)[number], id: string): Promise<string> {
  const element = await StoryPage({ lang, id });
  let failure: unknown = null;
  const stream = await renderToReadableStream(element, { onError: (error) => void (failure ??= error) });
  await stream.allReady;
  const html = await new Response(stream).text();
  if (failure) throw failure;
  return html;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("the Studio story pages", () => {
  it("have one address per story in every language", () => {
    for (const id of STORY_IDS) {
      expect(isLocalizedPath(storyPath(id))).toBe(true);
      expect(localePath("ar", storyPath(id))).toBe(`/ar/yallapp-studio/${id}`);
      expect(localePath("tr", storyPath(id))).toBe(`/tr/yallapp-studio/${id}`);
    }
  });

  for (const lang of LANGS) {
    it(`${lang}: the words follow each story's shape item by item`, () => {
      const copy = storyCopyFor(lang);
      for (const id of STORY_IDS) {
        const shape = STORIES[id];
        const t = copy.stories[id];
        expect(t.chapters, id).toHaveLength(shape.chapters.length);
        expect(t.stats, id).toHaveLength(shape.stats.length);
        expect(t.systems, id).toHaveLength(shape.systems.length);
        shape.systems.forEach((s, i) => expect(t.systems[i]!.features, `${id} ${i}`).toHaveLength(s.features.length));
        expect(t.bundleNodes, id).toHaveLength(shape.bundle.length);
        for (const slot of photoSlots(shape)) expect(t.photos[slot], `${id} ${slot}`).toBeTruthy();
        expect(t.metaDescription.length, id).toBeLessThanOrEqual(170);
        // Public pages say "multi-vendor", never "marketplace" (phase 72).
        expect(JSON.stringify(t), id).not.toMatch(/marketplace/i);
      }
      expect(JSON.stringify(copy.ui)).not.toMatch(/marketplace/i);
    });

    it(`${lang}: no assistant or model words, and no hosts but ours`, () => {
      const text = JSON.stringify(storyCopyFor(lang));
      expect(text).not.toMatch(/\bAI\b|artificial intelligence|machine learning|ذكاء اصطناعي|yapay zek|GPT|Claude|seamless|cutting-edge|revolutioni[sz]e/i);
      expect(text).not.toMatch(/https?:\/\//);
    });
  }

  it("show only real screens and icons that exist", () => {
    for (const id of STORY_IDS) {
      const shape = STORIES[id];
      for (const screen of storyScreens(shape)) {
        expect(APP_SCREENS, screen).toContain(screen);
        expect(SCREEN_ALT[screen], screen).toBeTruthy();
        expect(existsSync(path.join(PUBLIC, "screens", `${screen}.png`)), screen).toBe(true);
      }
      const icons = [shape.icon, ...shape.chapters.map((c) => c.icon), ...shape.systems.flatMap((s) => [s.icon, ...s.features]), ...shape.bundle];
      for (const icon of icons) expect(ICON_NAMES, `${id} ${icon}`).toContain(icon);
    }
  });

  it("show a photo only with its file and its credit", () => {
    for (const id of STORY_IDS) {
      const slots = photoSlots(STORIES[id]);
      for (const photo of photosOf(id)) {
        expect(existsSync(path.join(PUBLIC, photo.src)), photo.src).toBe(true);
        expect(photo.src).toBe(`/stories/${id}/${photo.slot}.jpg`);
        expect(photo.credit.creator, photo.slot).toBeTruthy();
        expect(photo.credit.license, photo.slot).toBeTruthy();
        expect(photo.credit.source, photo.slot).toMatch(/^https:\/\//);
        expect(slots.length).toBeGreaterThan(0);
      }
    }
  });

  it("compare with companies that make such apps, each with its own pages as sources, in every language", () => {
    for (const id of STORY_IDS) {
      const columns = competitorsOf(id);
      expect(columns.length).toBeGreaterThanOrEqual(3);
      for (const column of [...columns, { ...AGENCY, name: "agency", sources: [] }, { ...YALLAPP[id], name: "yallapp", sources: [], published: AGENCY.published }]) {
        for (const row of ["kind", "apps", "ownName", "pricing", "published", "arabic"] as const) {
          for (const lang of LANGS) expect(column[row][lang], `${id} ${column.name} ${row} ${lang}`).toBeTruthy();
        }
      }
      for (const c of columns) {
        expect(c.sources.length, c.name).toBeGreaterThan(0);
        for (const url of c.sources) expect(url, c.name).toMatch(/^https:\/\//);
        // No prices quoted: several vendors give different ones on their own pages.
        expect(JSON.stringify(c).replace(/https:[^"]+/g, ""), c.name).not.toMatch(/[$€£]\s?\d|\d\s?(USD|EGP)/);
      }
    }
  });

  it("are linked from every Studio solution page they tell", () => {
    const ids = new Set(STUDIO_SOLUTIONS.map((s) => s.id));
    for (const id of STORY_IDS) for (const s of STORIES[id].solutions) expect(ids.has(s), s).toBe(true);
  });

  for (const lang of LANGS) {
    it(`${lang}: each page renders with its title, its scenes, its screens, the plans and the demo`, async () => {
      const copy = storyCopyFor(lang);
      for (const id of STORY_IDS) {
        const html = await render(lang, id);
        const t = copy.stories[id];
        expect(html, id).toContain(escape(t.title));
        for (const chapter of t.chapters) expect(html, `${id} ${chapter.time}`).toContain(escape(chapter.title));
        for (const screen of storyScreens(STORIES[id])) expect(html, `${id} ${screen}`).toContain(`data-screen="${screen}"`);
        expect(html).toContain('id="plans"');
        expect(html).toContain(`${localePath(lang, "/demo/studio")}#`);
        expect(html).toContain(escape(copy.ui.creditsTitle));
        // The words on the page (not the sources' addresses) say "multi-vendor", never "marketplace".
        const words = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
        expect(words, id).not.toMatch(/marketplace/i);
      }
    });
  }
});
