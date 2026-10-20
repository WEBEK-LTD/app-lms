import { parseIcu, type IcuNode } from "@/lib/i18n/icu";
import { LANG_INFO, type Lang } from "./config";

/**
 * 55 Filling messages and writing numbers, dates and lists in a language,
 * without any catalog: safe in client components (56: the dashboard's
 * client components get their catalog from the server, components/dashboard-i18n.tsx).
 * `@/i18n` re-exports all of it.
 */

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

/** A message by its dotted key, in a catalog. */
export function lookup(messages: object, key: string): string {
  let at: unknown = messages;
  for (const part of key.split(".")) at = (at as Record<string, unknown> | undefined)?.[part];
  if (typeof at !== "string") throw new Error(`Unknown message ${key}`);
  return at;
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * 56 A date that shared code wrote in English ("31 Mar 2027", "31 March
 * 2027"), written again in a language; any other text as it is. For the
 * values of known texts (notices are saved in English).
 */
export function relocalizeDate(lang: Lang, text: string): string {
  const match = text.match(/^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/);
  if (!match || lang === "en") return text;
  const short = MONTHS.indexOf(match[2]!);
  const month = short >= 0 ? short : MONTHS_LONG.indexOf(match[2]!);
  if (month < 0) return text;
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
  return formatDate(lang, date, { day: "numeric", month: short >= 0 ? "short" : "long", year: "numeric", timeZone: "UTC" });
}

/** Every message of a catalog (or a part of one) by its dotted key. */
export function flattenMessages(value: object, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof inner === "string") out.set(name, inner);
    else if (inner && typeof inner === "object") for (const [k, v] of flattenMessages(inner, name)) out.set(k, v);
  }
  return out;
}

const patterns = new Map<string, { regex: RegExp; names: string[] } | null>();

function patternOf(message: string): { regex: RegExp; names: string[] } | null {
  let cached = patterns.get(message);
  if (cached === undefined) {
    if (!message.includes("{")) cached = null;
    else {
      // "Use at least {min} characters." matches "Use at least 10 characters.".
      const names: string[] = [];
      const source = message.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, (_, name: string) => {
        names.push(name);
        return "([\\s\\S]+?)";
      });
      cached = { regex: new RegExp(`^${source}$`), names };
    }
    patterns.set(message, cached);
  }
  return cached;
}

/**
 * The translation of a known English message (an error a server action
 * returns, possibly with names or numbers in it): `source` and `target` are
 * the same part of the English and the other catalog. Other texts stay as
 * they are.
 */
export function translateFrom(lang: Lang, source: object, target: object, english: string, mapValue: (value: string) => string = (v) => v): string {
  if (lang === "en" || !english) return english;
  const from = source instanceof Map ? (source as Map<string, string>) : flattenMessages(source);
  const to = target instanceof Map ? (target as Map<string, string>) : flattenMessages(target);
  for (const [key, message] of from) if (message === english) return to.get(key) ?? english;
  for (const [key, message] of from) {
    const pattern = patternOf(message);
    if (!pattern) continue;
    const match = english.match(pattern.regex);
    const translated = to.get(key);
    if (match && translated) {
      const values: MessageValues = {};
      pattern.names.forEach((name, i) => (values[name] = mapValue(match[i + 1]!)));
      return formatMessage(lang, translated, values);
    }
  }
  return english;
}
