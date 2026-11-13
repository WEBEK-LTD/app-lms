import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import { ar as startAr, en as startEn, tr as startTr } from "@/i18n/dashboard/start";
import { en as studioEn } from "@/i18n/dashboard/studio";
import { BRAND_SWATCHES, dominantColour, encodeRgbPng, isDark, swatchesFor } from "@/lib/brand-colour";
import { MemoryStore } from "@/lib/data/memory";
import { ALL_DEMO_TYPES, DEMO_TYPES, demoKind, isStudioDemo, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoDesign, demoDesignId } from "@/lib/demo/look";
import { businessOf, demoFacts, regularPageCount, demoItems, demoOfSlug, pickerPath, pickerSections, productOf, sameBusiness, screensOf, slugOf } from "@/lib/demo/picker";
import { firstStepsView, makeFromDemo, shortNameOf, startedFromDemo, type DemoMaker } from "@/lib/demo/start";
import { readPngInfo } from "@/lib/png";
import { getDashT } from "@/i18n/dashboard";
import { countList, sampleTotal } from "@/lib/samples/lists";
import { allNodes } from "@/lib/studio/tree";
import { DEMO_FACTS, withDemoFacts } from "@/lib/studio/demo-templates";

/**
 * 127 Choosing your app from our real demos (/start): the page shows every
 * demo we have, each once, in its own product's section, and nothing else;
 * each with its real screenshots and facts counted from the demo; and
 * starting from one makes the whole demo, in its own product.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "start-picker-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-13T10:00:00Z");
const ROOT = join(__dirname, "../..");

function maker(_name: string, lang?: "en" | "ar" | "tr"): DemoMaker {
  return { clientId: "client-1", plan: null, ...(lang ? { lang } : {}) };
}

describe("the demos the page shows", () => {
  const { editor, studio } = pickerSections();

  it("are every demo we have, each exactly once, in its own product's section, and nothing else", () => {
    const all = [...editor, ...studio];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...ALL_DEMO_TYPES].sort());
    expect([...editor].sort()).toEqual([...DEMO_TYPES].sort());
    expect([...studio].sort()).toEqual([...STUDIO_DEMO_TYPES].sort());
    for (const id of editor) expect(isStudioDemo(id), id).toBe(false);
    for (const id of studio) expect(isStudioDemo(id), id).toBe(true);
    for (const id of all) expect(productOf(id)).toBe(isStudioDemo(id) ? "studio" : "editor");
  });

  it("are the ten App editor demos and the eight Studio demos, by their names, in the approved order", () => {
    expect(editor.map((id) => DEMO_BRANDS[id].appName)).toEqual([
      "Nour Academy",
      "Lale Flowers",
      "Defne Café",
      "Studio Nur",
      "Kardelen Clinic",
      "Pulse Studio",
      "Nile Homes",
      "The Harbour Post",
      "Kuzey Culture Centre",
      "Bereket Food Bank",
    ]);
    expect(studio.map((id) => DEMO_BRANDS[id].appName)).toEqual(["Ufuq Academy", "Rawaq Academy", "Sofra Eats", "Zad", "Sahm Express", "Masar Rides", "Lamha Taxi", "Nakhla School"]);
  });

  it("each have their own real screenshots, the first on their card", () => {
    for (const id of ALL_DEMO_TYPES) {
      const screens = screensOf(id);
      expect(screens.length, id).toBeGreaterThanOrEqual(2);
      for (const s of screens) expect(existsSync(join(ROOT, "public/screens", `${s}.png`)), `${id} ${s}`).toBe(true);
    }
    expect(screensOf("lms")).toEqual(["academy-home", "academy-course", "academy-lesson"]);
    expect(screensOf("premium_academy")[0]).toBe("premium-home");
  });

  it("each have their card's words in English, Arabic and Turkish, and a business with a name", () => {
    for (const id of ALL_DEMO_TYPES) {
      for (const words of [startEn, startAr, startTr]) {
        const card = (words.cards as Record<string, { name: string; line: string }>)[id];
        expect(card?.name, id).toBeTruthy();
        expect(card?.line, id).toBeTruthy();
        expect((words.business as Record<string, string>)[businessOf(id)], id).toBeTruthy();
      }
    }
  });

  it("count them in each language", () => {
    expect(getDashT("en")("start.apps", { count: editor.length })).toBe("10 apps");
    expect(getDashT("ar")("start.apps", { count: studio.length })).toBe("8 تطبيقات");
    expect(getDashT("tr")("start.apps", { count: 8 })).toBe("8 uygulama");
    expect(getDashT("en")("start.items.courses.count", { count: 6 })).toBe("6 courses with lessons");
    expect(getDashT("en")("start.comesPages", { count: 24 })).toBe("All 24 pages and tabs");
    expect(getDashT("en")("start.first.itemsText", { demo: "Nour Academy", items: getDashT("en")("start.items.courses.has", { count: 6 }) })).toBe("Your app has Nour Academy's 6 courses. Change them, or add yours and remove theirs.");
  });

  it("each open their own page, by the /demo page's address", () => {
    for (const id of ALL_DEMO_TYPES) {
      expect(demoOfSlug(slugOf(id))).toBe(id);
      expect(pickerPath({ demo: id })).toBe(`/start/${slugOf(id)}`);
      expect(pickerPath({ demo: id, make: true, adding: true })).toBe(`/start/${slugOf(id)}/make?new=1`);
    }
    expect(pickerPath({ adding: true, product: "studio" })).toBe("/start?new=1&for=studio");
    expect(demoOfSlug("nothing")).toBeNull();
  });

  it("group by business: the teaching demos with each other, every product's own", () => {
    expect(sameBusiness("lms")).toEqual(["premium_academy", "instructors"]);
    expect(sameBusiness("store")).toEqual(["marketplace"]);
    expect(sameBusiness("restaurant")).toEqual(["food"]);
    expect(sameBusiness("rides")).toEqual(["taxi"]);
    for (const id of ALL_DEMO_TYPES) expect(sameBusiness(id)).not.toContain(id);
  });
});

describe("a demo's facts", () => {
  it("count its pages from what an app started from it gets", () => {
    for (const id of DEMO_TYPES) expect(demoFacts(id).pages, id).toBe(regularPageCount(demoKind(id).engine, demoDesign(id).pages.map((p) => p.slug)));
    for (const id of DEMO_TYPES) expect(demoFacts(id).pages, id).toBeGreaterThan(5);
    for (const id of STUDIO_DEMO_TYPES) expect(demoFacts(id).pages, id).toBeGreaterThan(5);
    for (const id of ALL_DEMO_TYPES) expect(demoFacts(id).languages).toEqual(DEMO_BRANDS[id].languages);
  });

  it("count its entries as the demo makes them", { timeout: 240_000 }, async () => {
    for (const id of ALL_DEMO_TYPES) {
      const store = new MemoryStore();
      const made = await makeFromDemo(store, maker("Selin's"), { demo: id, name: "Selin's", colour: "#1F5C4A", logoAssetId: null, iconAssetId: null }, NOW);
      const app = (await store.getAppById(made.app.id))!;
      const items = demoItems(id);
      const counted =
        id === "school" ? { samples: (await store.listSchoolClasses(app.id)).length } : await countList(store, app, items.list);
      expect(counted.samples, id).toBe(items.count);
      expect(items.count, id).toBeGreaterThan(0);
      // And its pages: as many as the page says.
      const slugs = (await store.getAppLayout(app.id))!.draft.pages.map((p) => p.slug);
      expect(isStudioDemo(id) ? slugs.length : regularPageCount(app.appType, slugs), id).toBe(demoFacts(id).pages);
    }
  });
});

describe("starting from a demo", () => {
  it.each(DEMO_TYPES)("an App editor demo (%s) makes a regular app on the demo's design with its entries, opened in the dashboard's editor", async (id) => {
    const store = new MemoryStore();
    const { app, open } = await makeFromDemo(store, maker("Selin's"), { demo: id, name: "Selin's Academy", colour: "#1F5C4A", logoAssetId: "logo-1", iconAssetId: "icon-1" }, NOW);
    expect(open).toBe("/dashboard/pages?from=demo");
    const kind = demoKind(id);
    expect(app).toMatchObject({ section: "regular", backend: "hosted", siteUrl: null, appType: kind.engine, vertical: kind.vertical, appName: "Selin's Academy", shortName: "Selin's", primaryColor: "#1F5C4A", logoAssetId: "logo-1", iconAssetId: "icon-1", design: demoDesignId(id) });
    expect(app.brandingDoneAt).toEqual(NOW);
    expect(app.websiteDoneAt).toEqual(NOW);
    const layout = (await store.getAppLayout(app.id))!.draft;
    const design = demoDesign(id);
    // Its pages, tabs and look: the demo's.
    expect(layout.pages.map((p) => p.slug)).toEqual(design.pages.map((p) => p.slug));
    expect(layout.tabs.map((t) => t.id)).toEqual(design.tabs.map((t) => t.id));
    expect(layout.appearance).toMatchObject({ template: design.look.template, corners: design.look.corners, cards: design.look.cards, secondary_color: design.look.secondary_color });
    expect(layout.languages.available).toEqual(DEMO_BRANDS[id].languages);
    // Its real content, marked the demo's.
    expect(await sampleTotal(store, app)).toBeGreaterThan(0);
    expect(startedFromDemo(app)).toBe(id);
    // No fill-ins in brackets left on its pages.
    expect(JSON.stringify(layout.pages)).not.toMatch(/"\[[^"\]]*\]/);
  });

  it.each(STUDIO_DEMO_TYPES)("a Studio demo (%s) makes a Studio project from the demo's template, with the demo's words and entries, opened in Studio's editor", async (id) => {
    const store = new MemoryStore();
    const { app, open } = await makeFromDemo(store, maker("Selin's"), { demo: id, name: "Selin's", colour: "#B4235A", logoAssetId: null, iconAssetId: null }, NOW);
    expect(open).toBe("/studio/editor?from=demo");
    const kind = demoKind(id);
    expect(app).toMatchObject({ section: "studio", backend: "hosted", appType: kind.engine, vertical: kind.vertical, appName: "Selin's", primaryColor: "#B4235A" });
    // Without an icon the branding waits.
    expect(app.brandingDoneAt ?? null).toBeNull();
    // Its sign-in screen and account menu, as the demo has them.
    expect(app.hostedSettings?.studioScreens).toBeTruthy();
    const layout = (await store.getAppLayout(app.id))!.draft;
    expect(layout.pages.length).toBe(demoFacts(id).pages);
    expect(layout.pages.filter((p) => p.studio).length).toBeGreaterThan(1);
    // No brackets for the owner to fill: the demo's own words, in every language.
    for (const page of layout.pages) {
      if (!page.studio) continue;
      for (const node of allNodes(page.studio)) {
        for (const value of [node.text, node.title, ...Object.values(node.translations ?? {}).flatMap((x) => Object.values(x ?? {}))]) {
          if (typeof value === "string") expect(value, `${id} ${page.slug}`).not.toMatch(/^\[|\[(Your|Number)/);
        }
      }
    }
    expect(await sampleTotal(store, app)).toBeGreaterThan(0);
    expect(startedFromDemo(app)).toBe(id);
  });

  it.each(["en", "ar", "tr"] as const)("leaves no brackets in a Studio project made in %s either (the demo's main language, English, unless asked)", async (lang) => {
    const store = new MemoryStore();
    const { app } = await makeFromDemo(store, maker("Sahm", lang === "en" ? undefined : lang), { demo: "delivery", name: "Sahm", colour: "#B4235A", logoAssetId: null, iconAssetId: null }, NOW);
    const home = (await store.getAppLayout(app.id))!.draft.pages.find((p) => p.slug === "home")!;
    const texts = allNodes(home.studio!).map((n) => n.text ?? "");
    // 128 The approved home's route card picks up at the demo's own street.
    expect(texts).toContain(DEMO_FACTS.delivery!.deliveryFrom![lang]);
    expect(texts.join(" ")).not.toMatch(/\[/);
  });

  it("puts the demo's words for its brackets in the page's own language", () => {
    const page = { body: { id: "b", type: "column" as const, children: [{ id: "t", type: "text" as const, text: "[العنوان ومواعيد العمل]" }] } };
    const filled = withDemoFacts("delivery", page, "ar");
    const facts = DEMO_FACTS.delivery!.contactText!;
    expect(filled.body.children![0]).toMatchObject({ text: facts.ar, translations: { en: { text: facts.en }, tr: { text: facts.tr } } });
    // In English, as the demo app has always shown them.
    expect(withDemoFacts("delivery", { body: { ...page.body, children: [{ id: "t", type: "text", text: String(studioEn.w_contactText) }] } }).body.children![0]).toMatchObject({ text: facts.en, translations: { ar: { text: facts.ar }, tr: { text: facts.tr } } });
  });

  it("starts the first steps: shown until done or hidden, the name, logo and colour done", async () => {
    const store = new MemoryStore();
    const { app } = await makeFromDemo(store, maker("Lale"), { demo: "store", name: "Lale", colour: "#B03A5B", logoAssetId: null, iconAssetId: "icon-1" }, NOW);
    const view = (await firstStepsView(store, app))!;
    expect(view).toMatchObject({ demo: "store", done: { brand: true, items: false, photos: false, stores: false }, own: 0 });
    expect(view.samples).toBe(demoItems("store").count);
    // Hidden: not shown again.
    await store.updateApp(app.id, { hostedSettings: { ...app.hostedSettings!, firstSteps: { ...app.hostedSettings!.firstSteps!, hiddenAt: NOW.toISOString() } } }, NOW);
    expect(await firstStepsView(store, (await store.getAppById(app.id))!)).toBeNull();
  });

  it("shortens the name under the icon", () => {
    expect(shortNameOf("Lale")).toBe("Lale");
    expect(shortNameOf("Selin's Academy of Arts")).toBe("Selin's");
    expect(shortNameOf("Supercalifragilistic")).toBe("Supercalifra");
  });
});

describe("the colour taken from the logo, and the icon made from it", () => {
  const pixels = (rgb: [number, number, number], n: number, alpha = 255) => Array.from({ length: n }, () => [...rgb, alpha]).flat();

  it("is the logo's main colour that isn't white, black or grey", () => {
    const logo = [...pixels([255, 255, 255], 500), ...pixels([31, 92, 74], 300), ...pixels([255, 90, 31], 100), ...pixels([20, 20, 20], 400), ...pixels([200, 0, 0], 900, 0)];
    expect(dominantColour(logo)).toBe("#1F5C4A");
    expect(dominantColour(pixels([0, 0, 0], 100))).toBeNull();
    expect(dominantColour([])).toBeNull();
  });

  it("offers five swatches: the logo's first, then the approved ones that don't look the same", () => {
    expect(swatchesFor("#1F5C4A")).toEqual([...BRAND_SWATCHES]);
    const s = swatchesFor("#24476B");
    expect(s[0]).toBe("#24476B");
    expect(s).toHaveLength(5);
    expect(new Set(s).size).toBe(5);
    expect(isDark("#0E0D24")).toBe(true);
    expect(isDark("#F4EFE6")).toBe(false);
  });

  it("makes an icon the stores take: 1024 × 1024, RGB, no transparency, the pixels drawn", async () => {
    const size = 1024;
    const rgba = new Uint8Array(size * size * 4);
    for (let i = 0; i < rgba.length; i += 4) rgba.set([31, 92, 74, 255], i);
    const png = Buffer.from(await encodeRgbPng(rgba, size, size, async (data) => new Uint8Array(deflateSync(data))));
    expect(readPngInfo(png)).toEqual({ width: size, height: size, colorType: 2, hasTransparency: false });
    // The pixels: each row filter 0, then RGB.
    const idat = png.indexOf("IDAT");
    const length = png.readUInt32BE(idat - 4);
    const raw = inflateSync(png.subarray(idat + 4, idat + 4 + length));
    expect([...raw.subarray(0, 4)]).toEqual([0, 31, 92, 74]);
    expect(raw.length).toBe((size * 3 + 1) * size);
  });
});
