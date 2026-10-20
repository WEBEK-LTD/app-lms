import { LANG_INFO, type Lang } from "@/i18n/config";
import { formatDate, formatNumber } from "@/i18n/format";
import { getDashT, knownTranslator, type DashT } from "@/i18n/dashboard";
import type { BellWords } from "./updates-view";

/**
 * 56 The client dashboard's words in a language, without the request: the
 * dashboard's pages get them through `dashboardText()` (lib/dashboard-lang.ts),
 * 58 the Owner API and the pushes to the owner's phone for the person's language.
 */
export interface DashboardText {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: DashT;
  /** An English text from shared code (lib labels, notices, server action messages), in the dashboard's language when known. */
  k: (english: string) => string;
  /** "19 Oct 2026" in the language. */
  date: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  /** "1,234", Turkish "1.234": Latin digits in every language. */
  num: (value: number, options?: Intl.NumberFormatOptions) => string;
}

export const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };

export function dashboardTextFor(lang: Lang): DashboardText {
  return {
    lang,
    dir: LANG_INFO[lang].dir,
    t: getDashT(lang),
    k: knownTranslator(lang),
    date: (date, options = SHORT_DATE) => formatDate(lang, date, options),
    num: (value, options) => formatNumber(lang, value, options),
  };
}

const KIND_KEY = {
  update: "nav.kindUpdate",
  announcement: "nav.kindAnnouncement",
  maintenance: "nav.kindMaintenance",
  offer: "nav.kindOffer",
  account: "nav.kindAccount",
} as const;

/** 57 The bell's words in the dashboard's language. */
export function bellWords(text: DashboardText): BellWords {
  return { lang: text.lang, k: text.k, date: (at) => text.date(at), kind: (kind) => text.t(KIND_KEY[kind]) };
}

