/**
 * 55 The languages of yallapp.com.tr and (Phase 56) the client dashboard:
 * English, the default and the source of every text, Arabic and Turkish.
 * Client apps have their own list of languages (lib/i18n/locales.ts); this
 * one is only for Yallapp's own pages. Safe in server and client code.
 */

export const LANGS = ["en", "ar", "tr"] as const;
export type Lang = (typeof LANGS)[number];

/** English pages keep their addresses; the others live under /ar and /tr. */
export const DEFAULT_LANG: Lang = "en";
export const PREFIXED_LANGS = ["ar", "tr"] as const satisfies readonly Lang[];
export type PrefixedLang = (typeof PREFIXED_LANGS)[number];

export interface LangInfo {
  /** In English, for the admin. */
  name: string;
  /** In the language itself: what the language switcher shows. */
  nativeName: string;
  dir: "ltr" | "rtl";
  /** Open Graph's `og:locale`. */
  ogLocale: string;
  /**
   * The locale for Intl number and date formats. Arabic pages write numbers
   * with Latin digits (0-9), as yallapp.com.tr's prices do (lib/billing/prices.ts).
   */
  intl: string;
}

export const LANG_INFO: Record<Lang, LangInfo> = {
  en: { name: "English", nativeName: "English", dir: "ltr", ogLocale: "en_US", intl: "en-US" },
  ar: { name: "Arabic", nativeName: "العربية", dir: "rtl", ogLocale: "ar_EG", intl: "ar-EG-u-nu-latn" },
  tr: { name: "Turkish", nativeName: "Türkçe", dir: "ltr", ogLocale: "tr_TR", intl: "tr-TR" },
};

/**
 * The language a visitor chose with the switcher (or on a sign-in page in
 * that language), readable by the browser and the server. It only remembers
 * a choice: pages never redirect by it or by the browser's languages.
 */
export const LANG_COOKIE = "yallapp_lang";
/** One year. */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export function isPrefixedLang(value: unknown): value is PrefixedLang {
  return typeof value === "string" && (PREFIXED_LANGS as readonly string[]).includes(value);
}

/** A language from untrusted input (a cookie, a form field, a route parameter); English otherwise. */
export function langOf(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

/**
 * 56 The dashboard's language for a signed-in person: the language they
 * chose (saved on their user, so it follows them to other devices), else the
 * one the `yallapp_lang` cookie remembers, else English.
 */
export function preferredLang(userLanguage: string | null | undefined, cookieLang: string | null | undefined): Lang {
  if (isLang(userLanguage)) return userLanguage;
  if (isLang(cookieLang)) return cookieLang;
  return DEFAULT_LANG;
}

/** The `Set-Cookie`/`document.cookie` text that remembers a language choice. */
export function langCookie(lang: Lang): string {
  return `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** The language a `Cookie` header (or `document.cookie`) remembers, if any. */
export function langFromCookie(cookie: string | null | undefined): Lang | null {
  const match = cookie?.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([a-z]{2})(?:;|$)`));
  return match && isLang(match[1]) ? match[1] : null;
}
