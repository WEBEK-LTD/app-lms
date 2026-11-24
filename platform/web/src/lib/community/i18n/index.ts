import { COMMUNITY_LANGUAGES, type CommunityLanguage } from "../types";
import { BASE_WORDS } from "./base";
import { QA_WORDS } from "./qa";
import { TRUST_WORDS } from "./trust";
import { WEB_WORDS } from "./web";

/**
 * 231 Yallapp Community's words: English first, Arabic (MSA) and Turkish
 * when the member picks them. Each area keeps its own dictionary (base.ts
 * A, qa.ts B, trust.ts C, web.ts F); keys are English, namespaced by area
 * ("error.not_found", "qa.…", "trust.…", "web.…"). A word missing in Arabic
 * or Turkish falls back to English. `{name}` in a word is filled from `vars`.
 *
 * The Flutter app keeps its own strings (community/lib/l10n); these are what
 * the server writes: error messages, notifications, emails, section names.
 */
export type CommunityWords = Record<string, string>;
export type CommunityDictionary = Record<CommunityLanguage, CommunityWords>;

const ALL: CommunityDictionary[] = [BASE_WORDS, QA_WORDS, TRUST_WORDS, WEB_WORDS];

const merged: CommunityDictionary = {
  en: Object.assign({}, ...ALL.map((d) => d.en)) as CommunityWords,
  ar: Object.assign({}, ...ALL.map((d) => d.ar)) as CommunityWords,
  tr: Object.assign({}, ...ALL.map((d) => d.tr)) as CommunityWords,
};

/** The word for `key` in `lang` (else English, else the key itself), with `{name}`s filled. */
export function t(lang: CommunityLanguage, key: string, vars?: Record<string, string | number>): string {
  const word = merged[lang][key] ?? merged.en[key] ?? key;
  return vars ? word.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all)) : word;
}

/** Whether `key` has a word (in English at least). */
export function hasWord(key: string): boolean {
  return key in merged.en;
}

/** An error's message by its code ("error.{code}"), else the generic one. */
export function errorMessage(lang: CommunityLanguage, code: string): string {
  return hasWord(`error.${code}`) ? t(lang, `error.${code}`) : t(lang, "error.generic");
}

export function isCommunityLanguage(value: unknown): value is CommunityLanguage {
  return typeof value === "string" && (COMMUNITY_LANGUAGES as readonly string[]).includes(value);
}

/** The first of en, ar, tr in an Accept-Language header, by its order; English when none. */
export function languageFromHeader(header: string | null | undefined): CommunityLanguage {
  if (!header) return "en";
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag = "", ...rest] = part.trim().split(";");
      const q = rest.map((r) => /^q=([\d.]+)$/.exec(r.trim())?.[1]).find(Boolean);
      return { lang: tag.toLowerCase().split("-")[0] ?? "", q: q ? Number(q) : 1 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.map((x) => x.lang).find(isCommunityLanguage) ?? "en";
}

/** Right to left: Arabic. */
export function isRtl(lang: CommunityLanguage): boolean {
  return lang === "ar";
}

/** Every key per language, for the tests that check Arabic and Turkish have them all. */
export function allWords(): CommunityDictionary {
  return merged;
}
