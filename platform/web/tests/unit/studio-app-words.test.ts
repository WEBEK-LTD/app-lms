import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { itemSourcesFor } from "@/lib/pages/sources";
import { APP_WORDS, appWords } from "@/lib/studio/app-words";
import { DEMO_FACTS } from "@/lib/studio/demo-templates";
import { designsFor, makeDesign } from "@/lib/studio/designs";
import type { SectionContext } from "@/lib/studio/sections";

/**
 * 128.11 The Arabic a template, a ready section or a demo puts INTO the app
 * is Modern Standard Arabic, as the app's own; only the dashboard and
 * Studio's editor speak Egyptian. These fail on an Egyptian-only form
 * (دلوقتي, عايز, إزاي, اللي…) in the app words (lib/studio/app-words.ts),
 * in any template, section or whole project made in Arabic, or in any demo
 * app's Arabic translations.
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

});

/**
 * 130.30 The premium whole designs' words (lib/studio/premium-designs.ts):
 * each kind's and the designs' own, in the app's Modern Standard Arabic, and
 * every design made in Arabic for every kind, its texts and translations.
 */
describe("130.30 the premium whole designs write Modern Standard Arabic into the app", () => {
  it("has every design word in English, Arabic and Turkish, none Egyptian", () => {
    const own = Object.keys(APP_WORDS.en).filter((k) => k.startsWith("pd"));
    expect(own.length).toBeGreaterThan(240);
    for (const k of own) {
      const ar = (APP_WORDS.ar as Record<string, string>)[k]!;
      expect(ar, k).toMatch(/[\u0600-\u06FF]/);
      expect(egyptian(ar), `${k}: ${ar}`).toBeNull();
      expect((APP_WORDS.tr as Record<string, string>)[k], k).toBeTruthy();
    }
  });

  it("writes no Egyptian form into any whole design made in Arabic, for every kind and look", () => {
    const bad: unknown[] = [];
    let seen = 0;
    for (const kind of KINDS) {
      const app = projectApp(kind.engine, kind.vertical);
      for (const design of designsFor({ type: kind.engine, vertical: kind.vertical }).filter((d) => !d.demo)) {
        const file = makeDesign(design, arabicContext(app), { home: "الرئيسية", template: (id) => id, theme: (id) => id }, { default: "ar", available: ["ar", "en", "tr"] });
        seen += arabicIn(file.pages).length;
        for (const x of offending(file.pages)) bad.push({ kind: kind.id, design: design.id, ...x });
      }
    }
    expect(seen).toBeGreaterThan(2000);
    expect(bad).toEqual([]);
  });
});
