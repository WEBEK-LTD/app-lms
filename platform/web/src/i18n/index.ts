import { parseIcu, type IcuNode } from "@/lib/i18n/icu";
import { LANG_INFO, type Lang } from "./config";
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
 * the server, so the catalogs stay out of the browser's bundles.
 */

export * from "./config";
export type { Messages };

const CATALOGS: Record<Lang, Messages> = { en, ar, tr };

export function messagesFor(lang: Lang): Messages {
  return CATALOGS[lang];
}

/** "nav.pricing", "plans.startWith"…: every message's dotted key. */
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Leaves<Messages>;

export type MessageValues = Record<string, string | number>;

const parsed = new Map<string, IcuNode[]>();
const pluralRules = new Map<Lang, Intl.PluralRules>();

function rules(lang: Lang): Intl.PluralRules {
  let r = pluralRules.get(lang);
  if (!r) pluralRules.set(lang, (r = new Intl.PluralRules(LANG_INFO[lang].intl)));
  return r;
}

function render(lang: Lang, nodes: IcuNode[], values: MessageValues): string {
  let out = "";
  for (const node of nodes) {
    if (typeof node === "string") out += node;
    else if (node.kind === "arg") {
      const value = values[node.name];
      out += value === undefined ? `{${node.name}}` : typeof value === "number" ? formatNumber(lang, value) : value;
    } else {
      const value = values[node.name];
      let option: IcuNode[] | undefined;
      if (node.kind === "plural") {
        const n = Number(value);
        option = node.options[`=${n}`] ?? node.options[rules(lang).select(n)] ?? node.options.other;
      } else option = node.options[String(value)] ?? node.options.other;
      out += render(lang, option ?? [], values);
    }
  }
  return out;
}

/** A message with its placeholders filled in; numbers are written the language's way. */
export function formatMessage(lang: Lang, message: string, values: MessageValues = {}): string {
  if (!message.includes("{")) return message;
  let nodes = parsed.get(message);
  if (!nodes) parsed.set(message, (nodes = parseIcu(message)));
  return render(lang, nodes, values);
}

/** A message by its dotted key, in a language. */
export function lookup(messages: Messages, key: string): string {
  let at: unknown = messages;
  for (const part of key.split(".")) at = (at as Record<string, unknown> | undefined)?.[part];
  if (typeof at !== "string") throw new Error(`Unknown message ${key}`);
  return at;
}

export type Translate = (key: MessageKey, values?: MessageValues) => string;

/** `t(key, values)` for a language. */
export function getT(lang: Lang): Translate {
  const messages = messagesFor(lang);
  return (key, values) => formatMessage(lang, lookup(messages, key), values);
}

/**
 * A number in a language's format, always with Latin digits: "10,000",
 * Turkish "10.000". Prices have their own format (lib/billing/prices.ts,
 * the same in every language).
 */
export function formatNumber(lang: Lang, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LANG_INFO[lang].intl, options).format(value);
}

/** A date in a language: "19 October 2026", "19 أكتوبر 2026", "19 Ekim 2026". */
export function formatDate(lang: Lang, date: Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : LANG_INFO[lang].intl, options).format(date);
}

/** "a, b and c" in a language. */
export function formatList(lang: Lang, items: string[], type: "conjunction" | "disjunction" = "conjunction"): string {
  return new Intl.ListFormat(LANG_INFO[lang].intl, { style: "long", type }).format(items);
}

/**
 * The translation of a known English message (an error a form's server
 * action returns, possibly with numbers in it), from one catalog section;
 * other texts stay as they are.
 */
export function translateKnown(lang: Lang, section: "formErrors", english: string): string {
  if (lang === "en") return english;
  const source = en[section] as Record<string, string>;
  const target = messagesFor(lang)[section] as Record<string, string>;
  for (const [key, message] of Object.entries(source)) {
    if (message === english) return target[key] ?? english;
    if (!message.includes("{")) continue;
    // "Use at least {min} characters." matches "Use at least 10 characters.".
    const names: string[] = [];
    const pattern = message.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, (_, name: string) => {
      names.push(name);
      return "(.+?)";
    });
    const match = english.match(new RegExp(`^${pattern}$`));
    if (match && target[key]) {
      const values: MessageValues = {};
      names.forEach((name, i) => (values[name] = match[i + 1]!));
      return formatMessage(lang, target[key], values);
    }
  }
  return english;
}
