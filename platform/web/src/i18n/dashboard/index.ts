import type { Lang } from "../config";
import { flattenMessages, formatMessage, lookup, relocalizeDate, translateFrom, type MessageValues } from "../format";
import type { Leaves } from "..";
import type { Strings } from "../types";
import * as common from "./common";
import * as nav from "./nav";

/**
 * 56 The client dashboard's texts in English (the source), Arabic and
 * Turkish, one file per area (`./common.ts`, `./courses.ts`, …), each with
 * `en` (`as const`), `ar` and `tr` side by side; ar and tr have the type
 * `Strings<typeof en>`, so a missing key fails the type check, and
 * tests/unit/dashboard-i18n.test.ts checks placeholders and marked words.
 *
 * - Server components: `const { t } = await dashboardText()` (lib/dashboard-lang.ts).
 * - Client components: `const t = useDashT()` (components/dashboard-i18n.tsx);
 *   the layout gives them the catalog of the person's language.
 * - `known` parts hold English texts that shared code produces (server
 *   actions' messages, lib labels, notices): `k(english)` on the server and
 *   `FormMessage`/`FieldError` in the browser translate them by their English
 *   text, with `{name}` parts filled from it.
 *
 * Keys are `area.key`, e.g. `t("nav.overview")`. The admin stays in English
 * and doesn't use these.
 */

const en = {
  common: common.en,
  nav: nav.en,
} as const;

export type DashboardMessages = Strings<typeof en>;
export type DashKey = Leaves<typeof en>;
export type DashT = (key: DashKey, values?: MessageValues) => string;

const ar: DashboardMessages = {
  common: common.ar,
  nav: nav.ar,
};

const tr: DashboardMessages = {
  common: common.tr,
  nav: nav.tr,
};

const CATALOGS: Record<Lang, DashboardMessages> = { en, ar, tr };

export function dashboardMessages(lang: Lang): DashboardMessages {
  return CATALOGS[lang];
}

/** `t(key, values)` for a language. */
export function getDashT(lang: Lang): DashT {
  const messages = dashboardMessages(lang);
  return (key, values) => formatMessage(lang, lookup(messages, key), values);
}

/** Whether a dotted key is in a `known` part. */
export const isKnownKey = (key: string) => key.split(".").includes("known");

/** The `known` texts of a catalog by their dotted keys. */
export function knownMessages(messages: DashboardMessages): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, text] of flattenMessages(messages)) if (isKnownKey(key)) out.set(key, text);
  return out;
}

const knownCache = new Map<Lang, Map<string, string>>();
function known(lang: Lang): Map<string, string> {
  let map = knownCache.get(lang);
  if (!map) knownCache.set(lang, (map = knownMessages(CATALOGS[lang])));
  return map;
}

/** The English `known` texts, for the browser to translate server messages (components/dashboard-i18n.tsx). */
export function knownEnglish(): Record<string, string> {
  return Object.fromEntries(known("en"));
}

/** An English text from shared code in a language, when the catalogs know it; else as it is. */
export function knownTranslator(lang: Lang): (english: string) => string {
  if (lang === "en") return (english) => english;
  return (english) => translateFrom(lang, known("en"), known(lang), english, (value) => relocalizeDate(lang, value));
}
