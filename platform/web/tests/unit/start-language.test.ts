import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { KINDS, kindById } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { startDraftIn, startLanguages, withMainLanguage, wordsLangOf } from "@/lib/app/start-language";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { ALL_DEMO_TYPES, isStudioDemo, type DemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { startLooks } from "@/lib/demo/picker";
import { demoLanguages, makeFromDemo } from "@/lib/demo/start";
import { inMainLanguage, withBuiltInTexts } from "@/lib/pages/builtin";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { lookAndLanguages, loadLayout, saveDraft, servedLayout } from "@/lib/pages/layout";
import { switchDefaultLanguage } from "@/lib/pages/model";
import type { LayoutContent, StudioNode } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { PLAN_INFO } from "@/lib/plans";
import { APP_WORDS, appWords, type AppWord } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES, templatesFor } from "@/lib/studio/sections";

/**
 * 132.40 Someone who signs up in Arabic or Turkish gets apps in their
 * language: each new app's main language is theirs, with English after it
 * (and the demo's other languages), its pages written in it, Studio's
 * template words in Modern Standard Arabic or Turkish with the others as
 * translations, Yallapp's tabs and texts in it, and the app (and its
 * preview) answering in it before its first publish too. An English
 * dashboard's apps are made as before; the owner can still change all of it.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "start-language-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-16T10:00:00Z");

/** The app's words in English that its Arabic or Turkish write otherwise: one of them on such a page is a word left in English. */
const ENGLISH = new Set(
  Object.entries(APP_WORDS.en)
    .filter(([key, text]) => APP_WORDS.ar[key as AppWord] !== text && APP_WORDS.tr[key as AppWord] !== text)
    .flatMap(([, text]) => [text, ...text.split("\n")])
    .filter((text) => /[A-Za-z]{2}/.test(text) && !text.includes("{")),
);
const DEFAULT_TABS = new Set(["Home", "Explore", "Account", "Shop", "Cart", "Courses", "My courses", "Services", "Bookings", "Orders"]);

/** Every text a Studio page shows (not its translations). */
function shown(node: unknown, key = ""): { key: string; text: string }[] {
  if (typeof node === "string") return [{ key, text: node }];
  if (Array.isArray(node)) return node.flatMap((x) => shown(x, key));
  if (node && typeof node === "object") return Object.entries(node).flatMap(([k, v]) => (k === "translations" ? [] : shown(v, k)));
  return [];
}
const TEXT_KEYS = new Set(["text", "title", "subtitle", "label", "heading", "subheading"]);
function englishLeft(layout: LayoutContent): string[] {
  const pages = layout.pages.flatMap((p) => [...(p.show_title ? [{ key: "title", text: p.title }] : []), ...(p.studio ? shown(p.studio) : [])]);
  return [...pages.filter((s) => TEXT_KEYS.has(s.key) && ENGLISH.has(s.text)).map((s) => s.text), ...layout.tabs.map((t) => t.label).filter((l) => ENGLISH.has(l) || DEFAULT_TABS.has(l))];
}

function valid(app: App, layout: unknown) {
  const parsed = parseLayoutContent(layout, { app, now: NOW, ownFonts: [] });
  return parsed.ok ? [] : parsed.errors.slice(0, 5);
}

describe("132.40 the languages a new app starts with", () => {
  it("puts an Arabic or Turkish owner's language first, English next, then the ones it would have had", () => {
    const en = { default: "en", available: ["en"] };
    expect(startLanguages("ar", en)).toEqual({ default: "ar", available: ["ar", "en"] });
    expect(startLanguages("tr", en)).toEqual({ default: "tr", available: ["tr", "en"] });
    expect(startLanguages("ar", { default: "en", available: ["en", "ar", "tr"] })).toEqual({ default: "ar", available: ["ar", "en", "tr"] });
    expect(startLanguages("ar", { default: "en", available: ["en", "tr"] })).toEqual({ default: "ar", available: ["ar", "en", "tr"] });
    expect(startLanguages("tr", { default: "en", available: ["en", "ar"] })).toEqual({ default: "tr", available: ["tr", "en", "ar"] });
    // An English owner's apps start as before, the team's defaults or the demo's as they are.
    expect(startLanguages("en", { default: "en", available: ["en", "ar"] })).toEqual({ default: "en", available: ["en", "ar"] });
    expect(startLanguages("en", { default: "tr", available: ["tr", "en"] })).toEqual({ default: "tr", available: ["tr", "en"] });
  });

  it("writes Studio's words in the main language when Studio has them in it", () => {
    expect(wordsLangOf({ default: "ar" }, "en")).toBe("ar");
    expect(wordsLangOf({ default: "tr" }, "ar")).toBe("tr");
    expect(wordsLangOf({ default: "fr" }, "ar")).toBe("ar");
    expect(wordsLangOf(null, "tr")).toBe("tr");
  });

  it("gives a demo's languages with the owner's first, at most the plan's", () => {
    expect(demoLanguages("store", null)).toEqual({ default: "en", available: [...DEMO_BRANDS.store.languages] });
    expect(demoLanguages("store", null, "ar")).toEqual({ default: "ar", available: ["ar", "en", ...DEMO_BRANDS.store.languages.filter((l) => l !== "en" && l !== "ar")] });
    // The Starter plan has one language: the owner's.
    expect(demoLanguages("food", PLAN_INFO.starter, "tr")).toEqual({ default: "tr", available: ["tr"] });
  });

  it("makes Arabic the main language on Languages: added first, or in the last one's place when the plan is full", () => {
    expect(withMainLanguage({ default: "en", available: ["en", "tr"] }, "ar", null)).toEqual({ languages: { default: "ar", available: ["ar", "en", "tr"] }, dropped: null });
    expect(withMainLanguage({ default: "en", available: ["en", "ar"] }, "ar", 1)).toEqual({ languages: { default: "ar", available: ["en", "ar"] }, dropped: null });
    expect(withMainLanguage({ default: "en", available: ["en"] }, "ar", 1)).toEqual({ languages: { default: "ar", available: ["ar"] }, dropped: "en" });
    expect(withMainLanguage({ default: "en", available: ["en", "fr", "de"] }, "tr", 3)).toEqual({ languages: { default: "tr", available: ["tr", "en", "fr"] }, dropped: "de" });
  });
});

describe("132.40 Yallapp's own texts in the main language", () => {
  it.each(["ar", "tr"] as const)("writes every kind's default tabs and home in %s, with English kept, and the draft saves", (lang) => {
    for (const kind of KINDS) {
      const app = { ...newApp("c", null, NOW, kind.engine, kind.vertical), appName: "Nour" };
      const base = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
      const layout = inMainLanguage({ ...base, languages: startLanguages(lang, base.languages) });
      expect(layout.languages.default, kind.id).toBe(lang);
      expect(layout.tabs.map((t) => t.label).filter((l) => DEFAULT_TABS.has(l)), kind.id).toEqual([]);
      const home = layout.tabs.find((t) => t.id === "home")!;
      expect(home.translations?.en?.label, kind.id).toBe(base.tabs.find((t) => t.id === "home")!.label);
      // The other language Yallapp has is kept too, for when the owner adds it.
      expect(home.translations?.[lang === "ar" ? "tr" : "ar"]?.label, kind.id).toBeTruthy();
      expect(valid(app, layout), kind.id).toEqual([]);
      // What the app shows is what the editor shows.
      const served = withBuiltInTexts({ version: "x", ...layout });
      expect(served.tabs.map((t) => t.label)).toEqual(layout.tabs.map((t) => t.label));
    }
  });

  it("leaves an English layout, and the owner's own texts, as they are", () => {
    const app = { ...newApp("c", null, NOW, "store", null), appName: "Nour" };
    const base = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
    expect(inMainLanguage(base)).toBe(base);
    const own = { ...base, languages: { default: "ar", available: ["ar"] }, tabs: base.tabs.map((t) => ({ ...t, label: `${t.label} ★` })), pages: [] };
    expect(inMainLanguage(own).tabs).toEqual(own.tabs);
  });

  it("switching the main language swaps a Studio page's texts too, and back", () => {
    const node: StudioNode = { id: "t", type: "text", text: "Order now", translations: { ar: { text: "اطلب الآن" }, tr: { text: "Hemen sipariş verin" } } };
    const layout: LayoutContent = {
      ...defaultLayout(newApp("c", null, NOW, "store", null), BUILT_IN_APP_DEFAULTS, NOW),
      languages: { default: "en", available: ["en", "ar", "tr"] },
      pages: [{ slug: "home", title: "Home", show_title: false, updated_at: NOW.toISOString(), blocks: [], studio: { header: { type: "title", title: "Hello", translations: { ar: { title: "مرحبًا" } } }, body: { id: "b", type: "column", children: [node] } } }],
    };
    const ar = switchDefaultLanguage(layout, "ar");
    const text = ar.pages[0]!.studio!.body.children![0]!;
    expect(text.text).toBe("اطلب الآن");
    expect(text.translations).toEqual({ en: { text: "Order now" }, tr: { text: "Hemen sipariş verin" } });
    expect(ar.pages[0]!.studio!.header).toMatchObject({ title: "مرحبًا", translations: { en: { title: "Hello" } } });
    const back = switchDefaultLanguage({ ...ar, languages: { default: "ar", available: ["ar", "en", "tr"] } }, "en");
    expect(back.pages[0]!.studio!.body.children![0]).toEqual(node);
  });
});

describe("132.40 a new regular app in the owner's language", () => {
  it.each(["ar", "tr"] as const)("starts its draft in %s, and the app answers in it before its first publish", async (lang) => {
    const store = new MemoryStore();
    const app: App = { ...newApp("c", null, NOW, "store", null), backend: "hosted" };
    await store.createApp(app);
    await startDraftIn(store, app, startLanguages(lang, BUILT_IN_APP_DEFAULTS.languages), NOW);
    const draft = (await loadLayout(store, app, NOW)).draft;
    expect(draft.languages).toEqual({ default: lang, available: [lang, "en"] });
    expect(draft.tabs[0]!.label).not.toBe("Home");
    // Before its first publish the app (and the preview of what's published) has the draft's languages.
    const served = await servedLayout(store, app);
    expect(served.version).toMatch(/^default\./);
    expect(served.languages.default).toBe(lang);
    expect(served.tabs[0]!.label).toBe(draft.tabs[0]!.label);
    expect((await lookAndLanguages(store, app)).languages).toMatchObject({ default: lang, available: [lang, "en"] });
  });

  it("an app made before keeps the team's defaults until it has a draft", async () => {
    const store = new MemoryStore();
    const app: App = { ...newApp("c", null, NOW, "store", null), backend: "hosted" };
    await store.createApp(app);
    expect((await servedLayout(store, app)).languages.default).toBe("en");
    expect((await lookAndLanguages(store, app)).languages.default).toBe("en");
  });
});

describe("132.40 an app from a demo on /start, in the owner's language", () => {
  const lists = ALL_DEMO_TYPES.flatMap((demo) => (["ar", "tr"] as const).map((lang) => [demo, lang] as const));

  it.each(lists)("%s in %s: main language, English next, its pages written in it", { timeout: 60_000 }, async (demo, lang) => {
    const store = new MemoryStore();
    const made = await makeFromDemo(store, { clientId: "c1", plan: null, lang }, { demo, name: lang === "ar" ? "نور" : "Nur", colour: "#1F4E5F", logoAssetId: null, iconAssetId: null }, NOW);
    const draft = (await store.getAppLayout(made.app.id))!.draft;
    expect(draft.languages.default).toBe(lang);
    expect(draft.languages.available.slice(0, 2)).toEqual([lang, "en"]);
    for (const l of DEMO_BRANDS[demo].languages) expect(draft.languages.available).toContain(l);
    expect(valid(made.app, draft)).toEqual([]);
    expect(englishLeft(draft)).toEqual([]);
    if (isStudioDemo(demo)) {
      expect(made.app.section).toBe("studio");
      const home = draft.pages.find((p) => p.slug === "home")!;
      const words = shown(home.studio).filter((s) => TEXT_KEYS.has(s.key));
      expect(words.length).toBeGreaterThan(3);
      if (lang === "ar") expect(words.some((s) => /[؀-ۿ]/.test(s.text))).toBe(true);
    }
    // The samples are in the main language too (lib/samples/seed.ts reads it).
  });

  it.each(ALL_DEMO_TYPES.filter((d) => startLooks(d).length).flatMap((d) => startLooks(d).map((look) => [d, look] as const)))("%s look %s in Arabic", { timeout: 60_000 }, async (demo, look) => {
    const store = new MemoryStore();
    const made = await makeFromDemo(store, { clientId: "c1", plan: null, lang: "ar" }, { demo, name: "نور", colour: "#1F4E5F", logoAssetId: null, iconAssetId: null, look }, NOW);
    const draft = (await store.getAppLayout(made.app.id))!.draft;
    expect(draft.languages.default).toBe("ar");
    expect(englishLeft(draft)).toEqual([]);
    expect(valid(made.app, draft)).toEqual([]);
  });

  it.each(["store", "food", "lms", "flowers"] as DemoId[])("%s for an English owner is the demo, as before", async (demo) => {
    const store = new MemoryStore();
    const made = await makeFromDemo(store, { clientId: "c1", plan: null, lang: "en" }, { demo, name: "Nour", colour: "#1F4E5F", logoAssetId: null, iconAssetId: null }, NOW);
    const draft = (await store.getAppLayout(made.app.id))!.draft;
    expect(draft.languages).toEqual({ default: DEMO_BRANDS[demo].languages[0], available: [...DEMO_BRANDS[demo].languages] });
    expect(draft.tabs.find((t) => t.id === "home")?.label).toBe("Home");
  });
});

describe("132.40 a Studio project from Studio's own steps, in the owner's language", () => {
  it.each(["ar", "tr"] as const)("every kind's templates in %s: the main language, its words in it with English as translations", { timeout: 120_000 }, async (lang) => {
    const store = new MemoryStore();
    const bad: unknown[] = [];
    for (const kind of KINDS) {
      for (const template of templatesFor({ type: kind.engine, vertical: kind.vertical })) {
        const name = lang === "ar" ? "نور" : "Nur";
        const languages = startLanguages(lang, BUILT_IN_APP_DEFAULTS.languages);
        const app = await makeStudioProject(store, { clientId: "c1", name, kind, source: "catalog", template, words: appWords(lang, name), lang, languages }, NOW);
        const draft = (await store.getAppLayout(app.id))!.draft;
        const where = `${kind.id}/${template.id}`;
        if (draft.languages.default !== lang) bad.push({ where, languages: draft.languages });
        const problems = valid(app, draft);
        if (problems.length) bad.push({ where, problems });
        const left = englishLeft(draft);
        if (left.length) bad.push({ where, left });
        // The home's words have their English for the app's English users.
        const home = draft.pages.find((p) => p.slug === "home")!.studio!;
        const texts = shown(home.body).filter((s) => s.key === "text" && s.text.trim());
        const translated = JSON.stringify(home.body).includes('"en":{');
        if (texts.length && !translated) bad.push({ where, english: "none" });
      }
    }
    expect(bad).toEqual([]);
  });

  it("an English owner's project is made as before", async () => {
    const store = new MemoryStore();
    const kind = kindById("store")!;
    const template = TEMPLATES.find((t) => t.id === "shop")!;
    const app = await makeStudioProject(store, { clientId: "c1", name: "Nour", kind, source: "catalog", template, words: appWords("en", "Nour"), lang: "en" }, NOW);
    const draft = (await store.getAppLayout(app.id))!.draft;
    expect(draft.languages).toEqual(BUILT_IN_APP_DEFAULTS.languages);
    expect(draft.tabs[0]!.label).toBe("Home");
    // In English, as the checks above would find it in an Arabic or Turkish one.
    expect(englishLeft(draft).length).toBeGreaterThan(3);
  });

  it("a project's draft saved in Arabic keeps its Arabic through a later save", async () => {
    const store = new MemoryStore();
    const kind = kindById("food")!;
    const template = templatesFor({ type: kind.engine, vertical: kind.vertical })[0]!;
    const app = await makeStudioProject(store, { clientId: "c1", name: "نور", kind, source: "catalog", template, words: appWords("ar", "نور"), lang: "ar", languages: startLanguages("ar", BUILT_IN_APP_DEFAULTS.languages) }, NOW);
    const before = (await store.getAppLayout(app.id))!.draft;
    const saved = await saveDraft(store, app, before, NOW);
    expect(saved.ok).toBe(true);
    expect(englishLeft((await store.getAppLayout(app.id))!.draft)).toEqual([]);
  });
});
