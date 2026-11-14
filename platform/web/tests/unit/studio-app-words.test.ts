import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { demoKind, PREMIUM_ACADEMY_DEMO, PREMIUM_ACADEMY_TEMPLATE, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoStudioScreens } from "@/lib/demo/screens";
import { demoLayout } from "@/lib/demo/setup";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import { APP_WORDS, appWord, appWords, premiumAppWords, type AppWord } from "@/lib/studio/app-words";
import { DEMO_FACTS, withDemoFacts } from "@/lib/studio/demo-templates";
import { signatureDesigns } from "@/lib/studio/demo-designs";
import { ELEMENTS, newNode, type NewText } from "@/lib/studio/elements";
import { PREMIUM_MAPS } from "@/lib/studio/premium-maps";
import { PREMIUM_WORDS_EN } from "@/lib/studio/premium-motion";
import { premiumWordEn } from "@/lib/studio/premium-content";
import { PAGE_TEMPLATES } from "@/lib/studio/page-templates";
import { SECTIONS, TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";

/**
 * 128.11 The Arabic a template, a ready section or a demo puts INTO the app
 * is Modern Standard Arabic, as the app's own; only the dashboard and
 * Studio's editor speak Egyptian. These fail on an Egyptian-only form
 * (دلوقتي, عايز, إزاي, اللي…) in the app words (lib/studio/app-words.ts),
 * in any template, section or whole project made in Arabic, or in any demo
 * app's Arabic translations. 130.42 And every one of the eighteen Signature
 * looks, a whole project made in Arabic: no Egyptian form, no word left in
 * English.
 */

const NOW = new Date("2026-11-13T10:00:00Z");

/** Egyptian-only words (and spellings), each a whole word, with و ف ب before it. */
const EGYPTIAN = [
  "دلوقتي",
  "دلوقت",
  "عايز",
  "عايزة",
  "عايزين",
  "عاوز",
  "إزاي",
  "ازاي",
  "بتاع",
  "بتاعة",
  "بتاعت",
  "فين",
  "مش",
  "كده",
  "كدا",
  "اللي",
  "شوف",
  "شوفي",
  "دوّر",
  "دوّري",
  "منين",
  "هنا",
  "اتسوّق",
  "اتسوق",
  "النهارده",
  "إيه",
  "ليه",
  "عشان",
  "علشان",
  "لحد",
  "جوه",
  "بس",
  "ببلاش",
  "أيوه",
  "إحنا",
  "احنا",
  "إنتو",
  "انتو",
  "ده",
  "دي",
  "تاني",
  "كتير",
  "اتعلم",
  "ابعت",
  "ابعتلنا",
  "قولنا",
  "كلمنا",
  "كلّمنا",
  "جاي",
  "جاية",
  "الجاية",
  "زباين",
  "دقايق",
  "تلاتة",
  "تلات",
  "الاتنين",
  "اتنين",
  "لاقي",
  "هنيجي",
  "اقرا",
  "الأبلكيشن",
  "مشوار",
  "مشاويري",
  "مشاويرك",
  "سواق",
  "السواق",
  "طازة",
  "إديته",
  "دوس",
];
const LETTER = "[\\u0621-\\u064A\\u064B-\\u0652\\u0670]";
/** Those that take an ending as well (بتاعك، عايزين، شوفي). */
const WITH_ENDINGS = ["بتاع", "عايز", "عاوز", "شوف", "دوّر", "اتسوّق", "ابعت", "مشاوير"];
const EGYPTIAN_FORM = new RegExp(`(?<!${LETTER})(?:و|ف|ب)?(?:(?:${EGYPTIAN.join("|")})|(?:${WITH_ENDINGS.join("|")})(?:ك|كي|ه|ها|نا|كم|هم|ي|ين|ة|ات|لنا|نا))(?!${LETTER})`, "u");

/** The Egyptian-only forms in `text`, if any. */
function egyptian(text: string): string | null {
  return text.match(EGYPTIAN_FORM)?.[0] ?? null;
}

/** Every string in `value` that has Arabic in it, where it is. */
function arabicIn(value: unknown, at = "", out: { at: string; text: string }[] = []): { at: string; text: string }[] {
  if (typeof value === "string") {
    if (/[؀-ۿ]/u.test(value)) out.push({ at, text: value });
  } else if (Array.isArray(value)) value.forEach((v, i) => arabicIn(v, `${at}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) arabicIn(v, at ? `${at}.${k}` : k, out);
  return out;
}

/** 130.42 The app's words in English (each line of them too) that its Arabic writes otherwise: one of them on an Arabic page is a word left in English. */
const ENGLISH_APP_WORDS = new Set(
  Object.entries(APP_WORDS.en)
    .filter(([key, text]) => APP_WORDS.ar[key as AppWord] !== text)
    .flatMap(([, text]) => [text, ...text.split("\n")])
    .filter((text) => /[A-Za-z]{2}/.test(text) && !text.includes("{")),
);

const offending = (value: unknown) =>
  arabicIn(value)
    .map(({ at, text }) => ({ at, text, form: egyptian(text) }))
    .filter((x) => x.form);

function projectApp(engine: App["appType"], vertical: App["vertical"]): App {
  return { ...newApp("client", null, NOW, engine, vertical), section: "studio", backend: "hosted", appName: "نور" };
}

function arabicContext(app: App): SectionContext {
  let n = 0;
  return { brand: "#1F4E5F", source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "ar", w: appWords("ar", app.appName!), picture: (f) => `https://files.test/design-pictures/${f}`, newId: () => `n${++n}` };
}

function demoApp(id: StudioDemoId): App {
  const kind = demoKind(id);
  const design = id === PREMIUM_ACADEMY_DEMO ? { design: PREMIUM_ACADEMY_TEMPLATE } : {};
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor, brandingDoneAt: NOW, ...design };
}

describe("The Arabic that templates put into the app is Modern Standard Arabic (128.11)", () => {
  it("knows the Egyptian forms QA found, with their prefixes, and leaves MSA alone", () => {
    for (const text of ["اتسوّق دلوقتي", "شوف الكل", "دوّر على فندق", "رحلتك الجاية تبدأ منين؟", "كل اللي محتاجه", "مش لاقي سؤالك؟", "أتابع طلبي إزاي؟", "الكورس بتاعك", "اسألنا هنا", "عايز تسافر؟", "كده تمام", "وفين؟"]) {
      expect(egyptian(text), text).not.toBeNull();
    }
    for (const text of ["تسوّق الآن", "عرض الكل", "ابحث عن إقامة", "من أين تبدأ حكايتك القادمة؟", "مرحبًا بك في {app}", "دور المعلم", "أين طلبي؟", "كيف أتابع طلبي؟", "مدرسة النخلة"]) {
      expect(egyptian(text), text).toBeNull();
    }
  });

  it("has no Egyptian form in the app words' Arabic, and every word in English, Arabic and Turkish", () => {
    const words = Object.keys(APP_WORDS.en);
    expect(words.length).toBeGreaterThan(250);
    for (const dict of [APP_WORDS.ar, APP_WORDS.tr]) expect(Object.keys(dict).sort()).toEqual([...words].sort());
    expect(Object.entries(APP_WORDS.ar).filter(([, text]) => egyptian(text))).toEqual([]);
    for (const facts of Object.values(DEMO_FACTS)) expect(offending(facts)).toEqual([]);
  });

  it("writes no Egyptian form into any template, section or whole project made in Arabic, for every kind", () => {
    const bad: unknown[] = [];
    let seen = 0;
    const check = (value: unknown, where: Record<string, string>) => {
      seen += arabicIn(value).length;
      for (const x of offending(value)) bad.push({ ...where, ...x });
    };
    for (const kind of KINDS) {
      const app = projectApp(kind.engine, kind.vertical);
      const ready = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
      for (const template of [...templatesFor({ type: kind.engine, vertical: kind.vertical }), ...PAGE_TEMPLATES]) {
        check(template.make(arabicContext(app)), { kind: kind.id, template: template.id });
        // The whole project it starts: its other pages, its tabs, its screens.
        check(startLayout(app, template, ready, NOW, arabicContext(app)), { kind: kind.id, project: template.id });
      }
      for (const section of SECTIONS) check(section.make(arabicContext(app)), { kind: kind.id, section: section.id });
    }
    expect(seen).toBeGreaterThan(1000);
    expect(bad).toEqual([]);
  });

  it("starts every premium element and premium map with the app's words, in Modern Standard Arabic (129)", () => {
    const premium = ELEMENTS.filter((e) => e.group === "premium");
    expect(premium.length).toBeGreaterThan(15);
    const newText = (lang: string) => (key: NewText) => appWord(lang, `new${key.charAt(0).toUpperCase()}${key.slice(1)}` as AppWord, "نور");
    // The English first words the app words keep, so none is left in English once the editor speaks another language.
    const english = new Set(
      Object.entries(APP_WORDS.en)
        .filter(([key]) => /^(motion|premium|map)[A-Z]/.test(key))
        .flatMap(([, text]) => [text, ...text.split("\n")]),
    );
    expect(english.size).toBeGreaterThan(50);
    const made = (lang: string) => {
      let n = 0;
      const newId = () => `n${++n}`;
      const w = premiumAppWords(lang, "نور");
      return [
        ...premium.map((e) => ({ at: `${e.type}${e.preset ? `:${e.preset}` : ""}`, node: newNode(e.type, { source: null, brand: "#1F4E5F", text: newText(lang), newId, preset: e.preset, premiumWords: w.motion, premium: w.content }) })),
        ...PREMIUM_MAPS.map((m) => ({ at: `map:${m.id}`, node: m.make({ newId, words: w.map }) })),
      ];
    };
    const bad: unknown[] = [];
    let seen = 0;
    const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
    for (const { at: element, node } of made("ar")) {
      seen += arabicIn(node).length;
      for (const x of offending(node)) bad.push({ element, ...x });
      for (const left of strings(node)) if (english.has(left)) bad.push({ element, english: left });
    }
    expect(seen).toBeGreaterThan(60);
    expect(bad).toEqual([]);
    // In English, the words they start with when the editor gives none.
    const w = premiumAppWords("en", "نور");
    for (const key of Object.keys(PREMIUM_WORDS_EN) as (keyof typeof PREMIUM_WORDS_EN)[]) expect(w.motion(key)).toBe(PREMIUM_WORDS_EN[key]);
    for (const key of ["quote", "planFeatures", "ctaButton", "glassText"] as const) expect(w.content(key)).toBe(premiumWordEn(key));
    expect(JSON.stringify(made("tr"))).not.toMatch(/[؀-ۿ]/u);
  });

  // ——— 130.42 The eighteen Signature looks, whole projects made in Arabic ———
  it.each(signatureDesigns().map((d) => [d.demo, d.variant] as const))("the %s demo's Signature look %s, a whole project made in Arabic, is Modern Standard Arabic with no English left", (demo, look) => {
    const kind = demoKind(demo);
    const app = { ...projectApp(kind.engine, kind.vertical), appName: DEMO_BRANDS[demo].appName };
    const template = TEMPLATES.find((t) => t.id === `${demo}_signature_${look}`)!;
    const ctx = { ...arabicContext(app), app: app.appName! };
    const layout = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, ctx);
    // As /start makes it from the demo: the demo's own words in the template's brackets.
    const filled = { ...layout, pages: layout.pages.map((p) => (p.studio ? { ...p, studio: withDemoFacts(demo, p.studio, "ar") } : p)) };
    const screens = demoStudioScreens(demo, "https://files.test", look);
    const project = { layout: filled, screens: { sign_in: { title: screens.sign_in?.title.ar, subtitle: screens.sign_in?.subtitle.ar } } };
    expect(arabicIn(project).length).toBeGreaterThan(10);
    expect(offending(project)).toEqual([]);
    // No word of the app's left in English (or Turkish) where the Arabic is written: every text, title and list entry the app shows.
    const strings = (v: unknown, key = ""): { key: string; text: string }[] =>
      typeof v === "string" ? [{ key, text: v }] : Array.isArray(v) ? v.flatMap((x) => strings(x, key)) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => (k === "translations" ? [] : strings(x, k))) : [];
    const shown = new Set(["text", "title", "subtitle", "label", "heading", "subheading"]);
    const left = filled.pages
      // A page's own title shows only where it has a header (its title there) or shows it.
      .flatMap((p) => [...(p.show_title ? [{ key: "title", text: p.title }] : []), ...(p.studio ? strings(p.studio) : [])])
      .filter((s) => shown.has(s.key) && ENGLISH_APP_WORDS.has(s.text));
    expect(left.map((s) => s.text)).toEqual([]);
    for (const tab of filled.tabs) expect(ENGLISH_APP_WORDS.has(tab.label), `${demo} ${look} tab ${tab.label}`).toBe(false);
  });
  // ——— end 130.42 ———

  it.each(STUDIO_DEMO_TYPES)("the %s demo app's Arabic has no Egyptian form (its pages, tabs, note and sign-in screens)", async (id) => {
    const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demoApp(id), "banner-asset");
    expect(arabicIn(layout).length).toBeGreaterThan(5);
    expect(offending(layout)).toEqual([]);
    expect(offending(demoStudioScreens(id, "https://files.test"))).toEqual([]);
  });
});
