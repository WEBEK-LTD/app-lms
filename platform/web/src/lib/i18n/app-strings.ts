import data from "./app-strings.json";
import { checkTranslation } from "./icu";
import { isLanguageCode, languageName } from "./locales";
import { LAYOUT_LIMITS, type InterfaceStrings } from "../pages/types";

/**
 * 43 The app's own interface strings (every key of mobile/lib/l10n/app_en.arb,
 * copied by scripts/app-strings.mjs): the English text, Yallapp's Arabic
 * and Turkish, a description and the placeholders the app passes. The
 * owner's translations of them live in the layout (`strings`) and reach the
 * app as string packs (lib/i18n/packs.ts).
 */

export interface AppString {
  key: string;
  en: string;
  ar: string | null;
  tr: string | null;
  description?: string;
  /** Placeholder name, then its type in the app ("String", "int"). */
  placeholders?: Record<string, string>;
}

export const APP_STRINGS: readonly AppString[] = (data as { strings: AppString[] }).strings;

const BY_KEY = new Map(APP_STRINGS.map((s) => [s.key, s]));

export function appString(key: string): AppString | null {
  return BY_KEY.get(key) ?? null;
}

/** Yallapp's own text for a key in a language it ships, or null. */
export function builtInString(entry: AppString, lang: string): string | null {
  if (lang === "en") return entry.en;
  if (lang === "ar") return entry.ar;
  if (lang === "tr") return entry.tr;
  return null;
}

/**
 * Checks the owner's interface strings (`LayoutContent.strings`): known
 * languages and keys, valid placeholders and plurals, and the size limits.
 * Empty strings are dropped; `fail` gets each problem, saying where.
 */
export function parseInterfaceStrings(value: unknown, fail: (where: string, message: string) => void): InterfaceStrings {
  const out: InterfaceStrings = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("Translations", "the app's texts must be a list per language.");
    return out;
  }
  for (const [lang, texts] of Object.entries(value as Record<string, unknown>)) {
    if (!isLanguageCode(lang)) {
      fail("Translations", `${lang} isn't a language apps support.`);
      continue;
    }
    if (!texts || typeof texts !== "object" || Array.isArray(texts)) continue;
    const where = `Translations (${languageName(lang)})`;
    const kept: Record<string, string> = {};
    for (const [key, raw] of Object.entries(texts as Record<string, unknown>)) {
      const entry = appString(key);
      // A key the app no longer has is dropped quietly: the app would never ask for it.
      if (!entry || typeof raw !== "string") continue;
      const text = raw.trim();
      if (!text) continue;
      if (text.length > LAYOUT_LIMITS.stringChars) {
        fail(where, `${key} can have at most ${LAYOUT_LIMITS.stringChars} characters.`);
        continue;
      }
      const check = checkTranslation(entry.en, text, entry.placeholders ?? {});
      if (check.errors.length) {
        fail(where, `${key}: ${check.errors[0]}`);
        continue;
      }
      kept[key] = text;
    }
    if (JSON.stringify(kept).length > LAYOUT_LIMITS.stringsBytes) {
      fail(where, "the texts are too long together.");
      continue;
    }
    if (Object.keys(kept).length) out[lang] = kept;
  }
  return out;
}
