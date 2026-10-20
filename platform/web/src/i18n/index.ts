import { type Lang } from "./config";
import { formatMessage, lookup, translateFrom, type MessageValues } from "./format";
import { ar } from "./messages/ar";
import { en, type Messages } from "./messages/en";
import { tr } from "./messages/tr";

/**
 * 55 Translations of yallapp.com.tr (and, from Phase 56, the client
 * dashboard), for server and client code:
 *
 *   const m = messagesFor(lang);  m.nav.pricing            // a plain text
 *   const t = getT(lang);         t("plans.startWith", { plan: "Pro" })
 *   formatNumber(lang, 10000)     // "10,000", "10.000" in Turkish
 *
 * English (messages/en.ts) is the source; ar.ts and tr.ts have the same keys
 * and placeholders. Client components get the texts they need as props from
 * the server, so the catalogs stay out of the browser's bundles. 56 The
 * dashboard's texts are in ./dashboard (its own catalogs, the same rules);
 * the formatters are in ./format, which has no catalog.
 */

export * from "./config";
export * from "./format";
export type { Messages };

const CATALOGS: Record<Lang, Messages> = { en, ar, tr };

export function messagesFor(lang: Lang): Messages {
  return CATALOGS[lang];
}

/** "nav.pricing", "plans.startWith"…: every message's dotted key. */
export type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

export type Translate = (key: MessageKey, values?: MessageValues) => string;

/** `t(key, values)` for a language. */
export function getT(lang: Lang): Translate {
  const messages = messagesFor(lang);
  return (key, values) => formatMessage(lang, lookup(messages, key), values);
}

/**
 * The translation of a known English message (an error a form's server
 * action returns, possibly with numbers in it), from one catalog section;
 * other texts stay as they are.
 */
export function translateKnown(lang: Lang, section: "formErrors", english: string): string {
  if (lang === "en") return english;
  return translateFrom(lang, en[section], messagesFor(lang)[section], english);
}
