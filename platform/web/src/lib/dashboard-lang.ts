import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { LANG_COOKIE, LANG_INFO, preferredLang, type Lang } from "@/i18n/config";
import { formatDate, formatNumber } from "@/i18n/format";
import { getDashT, knownTranslator, type DashT } from "@/i18n/dashboard";
import { getCurrentUser } from "./auth/session";
import type { BellWords } from "./updates-view";

/**
 * 56 The client dashboard's language on the server: the signed-in person's
 * choice (`users.language`; our team member managing a client's dashboard
 * sees it in their own), else the `yallapp_lang` cookie, else English.
 * Cached for one request, like the session.
 *
 *   const { t, k, lang } = await dashboardText();
 *   t("nav.overview")           // a text of the dashboard's catalogs (src/i18n/dashboard)
 *   k(notice.title)             // an English text from shared code (a notice, a label), translated when known
 */
/** A choice made in this request (the language switcher's action), ahead of the user read earlier in it. */
const chosenNow = cache((): { lang: Lang | null } => ({ lang: null }));

/** The language switcher saved `lang`: the page it renders again is in it. */
export function setLangForThisRequest(lang: Lang): void {
  chosenNow().lang = lang;
}

export const dashboardLang = cache(async (): Promise<Lang> => {
  const chosen = chosenNow().lang;
  if (chosen) return chosen;
  const user = await getCurrentUser();
  const cookie = (await cookies()).get(LANG_COOKIE)?.value;
  return preferredLang(user?.language, cookie);
});

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

export const dashboardText = cache(async (): Promise<DashboardText> => dashboardTextFor(await dashboardLang()));
