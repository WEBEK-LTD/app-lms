import type { StudioNode, Translations } from "../pages/types";
import { currencySymbol } from "../money/currencies";
import { APP_WORDS, type AppWord } from "./app-words";

/**
 * 178 The company's vehicle types in a template's list of car classes.
 * Masar Rides's and Lamha Taxi's looks (lib/studio/demo-designs/
 * masar-signature.ts, lamha-signature.ts) draw the car classes riders pick
 * from as Studio elements: a card (or a column) per class with its name, the
 * fare it starts from after the template's own currency ("from E£" and 35)
 * and, on some looks, its seats. Static words, never the company's data:
 * served as they were saved, a company in Istanbul with its own Sedan from
 * ₺120 showed "Economy from E£35" on its home while the ride's quote said
 * "Sedan ₺214.00". Served (hosted `GET /pages`) and drawn on Studio's canvas,
 * such a list the owner left as the template made it follows the company's
 * vehicle types (Dashboard › Vehicle types, those offered): one card per
 * type in their order, at most as many as the template drew, each in the
 * look of the template's card at its place (the first, the chosen one, for
 * the first type), with the type's name, its smallest fare in the company's
 * currency (Ride settings) and its seats. Without a type offered, the
 * template's cards as they are.
 *
 * Whether a list is the template's is read from its words: a card whose
 * class name or fare words the owner changed is theirs, and so is the list.
 */

/** A vehicle type as the cards show it (the offered ones, in the company's order). */
export interface RideClass {
  id: number;
  name: string;
  seats: number;
  /** The smallest fare, in the company's currency. */
  minCents: number;
}

/** The company's car classes for the template's lists; `currency`: Ride settings' (ISO 4217). */
export interface RideClasses {
  list: readonly RideClass[];
  currency: string;
}

/** The words the templates write as car classes: Masar's Economy, Comfort and Van, Lamha's Taxi and XL. */
export const TEMPLATE_CLASS_WORDS = ["rideEconomy", "rideComfort", "rideVan", "sigTaxiClass", "sigXl"] as const satisfies readonly AppWord[];
/** The words before a class's fare: "from E£" (Masar A, Lamha) and "E£" (Masar B). */
const FARE_WORDS = ["sigFareFrom", "sigCurrency"] as const satisfies readonly AppWord[];
/** Masar B's seats under the fare: "from · 4 seats" and "from · 7 seats". */
const SEAT_WORDS = ["sigFromFourSeats", "sigFromSevenSeats"] as const satisfies readonly AppWord[];
/** The template's own currency, the one its words are written in. */
const TEMPLATE_CURRENCY = "EGP";

type Lang = keyof typeof APP_WORDS;
const LANGS = Object.keys(APP_WORDS) as Lang[];
const norm = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase();

function wordOf<W extends AppWord>(words: readonly W[], text: unknown): { word: W; lang: Lang } | null {
  if (typeof text !== "string") return null;
  const t = norm(text);
  for (const word of words) for (const lang of LANGS) if (norm(APP_WORDS[lang][word]) === t) return { word, lang };
  return null;
}

const NUMBER = /^\d{1,6}([.,]\d{1,2})?$/;
const isText = (n: StudioNode) => n.type === "text" && !n.hidden;
const subtree = (n: StudioNode): StudioNode[] => [n, ...(n.children ?? []).flatMap(subtree)];

/** A class's fare: a row of the template's fare words and a number. */
function fareRow(node: StudioNode): boolean {
  const kids = node.children ?? [];
  return node.type === "row" && kids.length === 2 && isText(kids[0]!) && wordOf(FARE_WORDS, kids[0]!.text) !== null && isText(kids[1]!) && NUMBER.test(String(kids[1]!.text ?? "").trim());
}

/** One car class of the template's: one class word, one fare, nothing opening anything but the ride. */
function classCard(node: StudioNode): boolean {
  if (node.type !== "column" && node.type !== "row") return false;
  const nodes = subtree(node);
  if (!nodes.every((n) => !n.action || (n.action.type === "screen" && n.action.screen === "ride"))) return false;
  return nodes.filter((n) => isText(n) && wordOf(TEMPLATE_CLASS_WORDS, n.text) !== null).length === 1 && nodes.filter(fareRow).length === 1;
}

/** A thin line between the classes (Masar B): a row with nothing in it. */
const separator = (node: StudioNode) => node.type === "row" && (node.children ?? []).length === 0 && !node.text;

/** Whether this element is a template's list of car classes, as the template left it. */
export function templateClassList(node: StudioNode): boolean {
  if (node.hidden || node.type !== "row") return false;
  const kids = node.children ?? [];
  const cards = kids.filter(classCard);
  return cards.length >= 2 && kids.every((k) => classCard(k) || separator(k));
}

/** Whether a page has one (so the company's types are read only for those pages). */
export function showsRideClasses(body: StudioNode): boolean {
  return subtree(body).some(templateClassList);
}

/** The fare as the cards write it: 35, or 35.50. */
function amount(cents: number): string {
  const whole = Math.round(cents) % 100 === 0;
  return whole ? String(Math.round(cents / 100)) : (cents / 100).toFixed(2);
}

/** The template's fare word in `lang`, in the company's currency ("from ₺"). */
function fareWord(word: (typeof FARE_WORDS)[number], lang: Lang, currency: string): string {
  const text = APP_WORDS[lang][word];
  if (currency === TEMPLATE_CURRENCY) return text;
  const sign = APP_WORDS[lang].sigCurrency;
  return text.includes(sign) ? text.replace(sign, currencySymbol(currency, lang)) : text;
}

/** A text as served: these words in every language at once, none of the template's left in `translations`. */
function plain(node: StudioNode, text: string): StudioNode {
  const { translations: _t, ...rest } = node;
  void _t;
  const kept: Translations = {};
  for (const [l, texts] of Object.entries(node.translations ?? {})) {
    const others = Object.fromEntries(Object.entries(texts ?? {}).filter(([f]) => f !== "text"));
    if (Object.keys(others).length) kept[l as keyof Translations] = others;
  }
  return { ...rest, text, ...(Object.keys(kept).length ? { translations: kept } : {}) } as StudioNode;
}

/** The template's card at its place, made the company's class `c`. */
function cardFor(card: StudioNode, c: RideClass, currency: string, lang: Lang, key: string): StudioNode {
  const fareRows = new Set(subtree(card).filter(fareRow).flatMap((r) => (r.children ?? []).map((k) => k.id)));
  const fill = (node: StudioNode): StudioNode => {
    const id = `${node.id}-${key}`;
    if (isText(node)) {
      if (wordOf(TEMPLATE_CLASS_WORDS, node.text)) return { ...plain(node, c.name), id };
      const fare = wordOf(FARE_WORDS, node.text);
      if (fare && fareRows.has(node.id)) return { ...plain(node, fareWord(fare.word, lang, currency)), id };
      if (fareRows.has(node.id)) return { ...plain(node, amount(c.minCents)), id };
      const seats = wordOf(SEAT_WORDS, node.text);
      if (seats) return { ...plain(node, APP_WORDS[lang][seats.word].replace(/\d+/, String(c.seats))), id };
      // Masar A's seats beside the person icon.
      if (/^\d{1,2}$/.test(String(node.text ?? "").trim())) return { ...plain(node, String(c.seats)), id };
      return { ...node, id };
    }
    return { ...node, id, ...(node.name && wordOf(TEMPLATE_CLASS_WORDS, node.name) ? { name: c.name } : {}), ...(node.children ? { children: node.children.map(fill) } : {}) };
  };
  return fill(card);
}

/** The list made the company's: one card per type (as many as the template drew at most), separators kept between them. */
function listFor(node: StudioNode, classes: RideClasses, lang: Lang): StudioNode {
  const kids = node.children ?? [];
  const cards = kids.filter(classCard);
  const line = kids.find(separator);
  const shown = classes.list.slice(0, cards.length);
  const children: StudioNode[] = [];
  shown.forEach((c, i) => {
    if (i > 0 && line) children.push({ ...line, id: `${line.id}-${c.id}` });
    children.push(cardFor(cards[Math.min(i, cards.length - 1)]!, c, classes.currency, lang, `t${c.id}`));
  });
  return { ...node, ...(node.name && wordOf(TEMPLATE_CLASS_WORDS, node.name) && shown[0] ? { name: shown[0].name } : {}), children };
}

/** `body` with the template's lists of car classes made the company's, in `lang`; as it is without a type offered. */
export function withRideClassesIn(body: StudioNode, classes: RideClasses | null, lang: string): StudioNode {
  if (!classes || classes.list.length === 0) return body;
  const l: Lang = (LANGS as string[]).includes(lang) ? (lang as Lang) : "en";
  const walk = (node: StudioNode): StudioNode => {
    if (templateClassList(node)) return listFor(node, classes, l);
    return node.children ? { ...node, children: node.children.map(walk) } : node;
  };
  return walk(body);
}
