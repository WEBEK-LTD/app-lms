import type { Lang } from "../config";
import { flattenMessages, formatMessage, lookup, translateFrom, type MessageValues } from "../format";
import { nestedValue } from "./nested";
import type { Leaves } from "..";
import type { Strings } from "../types";
import * as common from "./common";
import * as analytics from "./analytics";
import * as forms from "./forms";
import * as health from "./health";
import * as kinds from "./kinds";
import * as languages from "./languages";
import * as lib from "./lib";
import * as license from "./license";
import * as nav from "./nav";
import * as notify from "./notify";
import * as overview from "./overview";
import * as media from "./media";
import * as pages from "./pages";
import * as preview from "./preview";
import * as setup from "./setup";

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

/** Every area. A new area is one import and one entry here. */
const AREAS = { common, nav, lib, forms, kinds, overview, license, setup, pages, media, languages, health, preview, analytics, notify } as const;

type Areas = typeof AREAS;
type English = { [K in keyof Areas]: Areas[K]["en"] };

export type DashboardMessages = Strings<English>;
export type DashKey = Leaves<English>;
export type DashT = (key: DashKey, values?: MessageValues) => string;

function catalog(lang: Lang): DashboardMessages {
  return Object.fromEntries(Object.entries(AREAS).map(([name, area]) => [name, area[lang]])) as DashboardMessages;
}

const CATALOGS: Record<Lang, DashboardMessages> = { en: catalog("en"), ar: catalog("ar"), tr: catalog("tr") };

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
  const source = known("en");
  const target = known(lang);
  return (english) => translateFrom(lang, source, target, english, nestedValue(lang, source, target));
}
