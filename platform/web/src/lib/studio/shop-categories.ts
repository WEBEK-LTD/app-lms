import type { Action, StudioEntry, StudioNode, StudioStory, Translations } from "../pages/types";
import { APP_WORDS, type AppWord } from "./app-words";
import { mapTree } from "./tree";

/**
 * 157 The shop's categories in a template's lists of them. Leqaa's looks
 * (lib/studio/demo-designs/leqaa-signature.ts) draw the shop's occasions and
 * collections as Studio elements: the occasions as story rings, as chips
 * and as a ticker, the collections as a bento, as arches and as the edit's
 * cards. Each entry is a word of the template's (`TEMPLATE_CATEGORY_WORDS`,
 * an app word in the dashboard's language with the others as its
 * `translations`) that opens the whole shop: static text, never the shop's
 * data. Served (hosted `GET /pages`) and drawn on Studio's canvas, such a
 * list the owner left as the template made it follows the shop's categories:
 *
 * - once the shop has categories of the owner's own (`ShopCategories.own`),
 *   one entry per category in the shop's order, its name as the shop has it
 *   in every language (no template words left in `translations`), its photo
 *   (its first product's, else the template's), opening it (`Action.category_id`);
 *   each entry in the look of the template's entry at its place (the last
 *   one's past them), the bento keeping its number of tiles;
 * - until then (the demo's categories, or none yet), the template's entries
 *   as they are.
 *
 * And on any page, an element named like one of the shop's categories that
 * opens the whole shop (a ring, a tile, a chip, a card, a button) opens
 * that category: the demo's own on an app started from it, the owner's
 * where they renamed an entry after one of theirs; with no match, the shop.
 *
 * Whether a list is the template's is read from the words in the layout's
 * own language only: an entry whose words the owner changed is theirs, and
 * so is the whole list then, whatever its other languages still say.
 */

/** A category of the shop as the lists show it (`ProductCategory`). */
export interface ShopCategory {
  id: number;
  name: string;
  image_url?: string | null;
}

/** The shop's categories for the template's lists; `own`: the owner's (else the demo's, or none). */
export interface ShopCategories {
  list: readonly ShopCategory[];
  own: boolean;
  /** 209 The sub-categories, for the elements named like one (a skin quiz's result, a brand's mark, Toot's ages) only; never a list's entries; missing: `list` only. */
  subs?: readonly ShopCategory[];
}

/** The words the templates write as the shop's categories: Leqaa's occasions and collections. */
export const TEMPLATE_CATEGORY_WORDS = ["lqLove", "lqBirthday", "lqSympathy", "lqNewBaby", "lqCongrats", "lqSignature", "lqRoses", "lqSeasonal", "lqPlants", "lqGiftSets", "lqTulips"] as const satisfies readonly AppWord[];
/**
 * 209 Words the templates write as the name of one of the demo's
 * categories that open it in any of Studio's languages (Toot's ages: a
 * tile, a chip, a gift finder's result; its birthday gifts, gift boxes,
 * science and play tents), never a list the owner's categories replace
 * (lib/studio/demo-designs/toys-signature.ts).
 */
export const TEMPLATE_CATEGORY_LINK_WORDS = ["tyAge0", "tyAge1", "tyAge3", "tyAge6", "tyAge9", "tyByAge", "tyBirthday", "tyGiftBoxes", "tyStem", "tyPlayTents"] as const satisfies readonly AppWord[];
/** A ticker of the occasions' words (Leqaa's), one per line. */
export const TEMPLATE_CATEGORY_TICKERS = ["lqTicker"] as const satisfies readonly AppWord[];

/** The occasions' own icons on the templates' chips (a heart for love, a cake for a birthday), and the flower a category of the shop's gets in their place. */
export const TEMPLATE_OCCASION_ICONS = ["favorite", "cake", "spa", "child_care", "celebration"] as const;
export const CATEGORY_ICON = "local_florist";

/** At most this many entries in a list that scrolls (rings, chips, arches, cards). */
export const TEMPLATE_CATEGORIES_MAX = 12;

// 209 Without the marks that keep a range left to right in Arabic ("0\u200e–\u200e6"): an owner's "0–6" is the same name.
const norm = (text: string) => text.normalize("NFC").replace(/[\u200e\u200f\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
const LANGS = Object.keys(APP_WORDS) as (keyof typeof APP_WORDS)[];

/** Each of the words in every language, to the word. */
const WORD_OF = new Map<string, AppWord>(TEMPLATE_CATEGORY_WORDS.flatMap((word) => LANGS.map((lang) => [norm(APP_WORDS[lang][word]), word] as const)));
// 209 And the words that only link (Toot's ages).
const LINK_WORD_OF = new Map<string, AppWord>(TEMPLATE_CATEGORY_LINK_WORDS.flatMap((word) => LANGS.map((lang) => [norm(APP_WORDS[lang][word]), word] as const)));
const TICKERS = new Set(TEMPLATE_CATEGORY_TICKERS.flatMap((word) => LANGS.map((lang) => norm(APP_WORDS[lang][word]))));

/** The template's category word a text is, in any of its languages; null for any other text. */
export function categoryWordOf(text: string | null | undefined): AppWord | null {
  return typeof text === "string" ? (WORD_OF.get(norm(text)) ?? null) : null;
}

/** A tap that opens the whole shop, as the templates' entries do (or none). */
function opensShop(action: Action | null | undefined): boolean {
  return !action || (action.type === "screen" && action.screen === "search" && !action.category_id);
}

/** 157 What opens a category of the shop: the shop, filtered to it (an app before 157 opens the shop). */
export function categoryAction(category: Pick<ShopCategory, "id">): Action {
  return { type: "screen", screen: "search", category_id: String(category.id) };
}

type ListKind = "stories" | "bento" | "children" | "ticker";

const isText = (n: StudioNode) => n.type === "text";
const subtree = (n: StudioNode): StudioNode[] => [n, ...(n.children ?? []).flatMap(subtree)];

/** One entry of a list of children: it opens the shop, nothing in it opens anything else, and one text in it is a category word. */
function childEntry(child: StudioNode): boolean {
  const nodes = subtree(child);
  if (!nodes.every((n) => opensShop(n.action))) return false;
  return nodes.filter((n) => isText(n) && categoryWordOf(n.text) !== null).length === 1;
}

/** Which of the template's lists of the shop's categories this element is, as the template left it; null for any other element. */
export function templateCategoryList(node: StudioNode): ListKind | null {
  if (node.hidden) return null;
  if (node.type === "stories") {
    const slides = node.slides ?? [];
    return slides.length > 0 && slides.every((s) => opensShop(s.action) && categoryWordOf(s.heading) !== null) ? "stories" : null;
  }
  if (node.type === "bento") {
    const entries = node.entries ?? [];
    return entries.length > 0 && entries.every((e) => opensShop(e.action) && categoryWordOf(e.title) !== null) ? "bento" : null;
  }
  if (node.type === "marquee") return typeof node.text === "string" && TICKERS.has(norm(node.text)) ? "ticker" : null;
  if (node.type === "row" || node.type === "slider") {
    const kids = node.children ?? [];
    return kids.length >= 2 && kids.every((k) => k.type === kids[0]!.type) && kids.every(childEntry) ? "children" : null;
  }
  return null;
}

/** An entry without `fields` in its other languages: the shop's name is the same in all of them. */
function untranslated<T extends { translations?: Translations }>(entry: T, fields: readonly string[]): T {
  if (!entry.translations) return entry;
  const translations: Translations = {};
  for (const [lang, texts] of Object.entries(entry.translations)) {
    const kept = Object.fromEntries(Object.entries(texts ?? {}).filter(([field]) => !fields.includes(field)));
    if (Object.keys(kept).length) translations[lang as keyof Translations] = kept;
  }
  const { translations: _t, ...rest } = entry;
  void _t;
  return (Object.keys(translations).length ? { ...rest, translations } : rest) as T;
}

/**
 * The shop's category an entry's words name: the one with that name, or,
 * for one of the template's words, the one named as the word is in any of
 * its languages (the demo's "Love" for the Arabic "حب").
 */
export function namesakeOf(text: string | null | undefined, list: readonly ShopCategory[]): ShopCategory | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const own = list.find((c) => norm(c.name) === norm(text));
  if (own) return own;
  const word = categoryWordOf(text) ?? (typeof text === "string" ? (LINK_WORD_OF.get(norm(text)) ?? null) : null);
  if (!word) return null;
  const names = new Set(LANGS.map((lang) => norm(APP_WORDS[lang][word])));
  return list.find((c) => names.has(norm(c.name))) ?? null;
}

/** The first photo of an element or of what it holds. */
function photoOf(node: StudioNode): string | null {
  return subtree(node).find((n) => (n.type === "image" || n.type === "photo_hero") && n.image_url)?.image_url ?? null;
}

/** Two figures for a place in a list ("01"), as the edit's cards number theirs. */
const place = (i: number) => String(i + 1).padStart(2, "0");

/** A template's child entry made one category's: its word the category's name, its first photo the category's, its number its place, an occasion's icon the flower, opening the category. */
function childFor(template: StudioNode, at: number, i: number, category: ShopCategory, fallbackPhoto: string | null): StudioNode {
  const photo = category.image_url ?? fallbackPhoto;
  let photoDone = false;
  const visit = (n: StudioNode): StudioNode => {
    let out: StudioNode = { ...n, ...(i !== at ? { id: `${n.id}-${i}` } : {}) };
    if (isText(out) && categoryWordOf(out.text) !== null) out = { ...untranslated(out, ["text"]), text: category.name };
    else if (isText(out) && out.text?.trim() === place(at) && i !== at) out = { ...untranslated(out, ["text"]), text: place(i) };
    else if (out.type === "icon" && out.icon && (TEMPLATE_OCCASION_ICONS as readonly string[]).includes(out.icon)) out = { ...out, icon: CATEGORY_ICON };
    if (!photoDone && photo && (out.type === "image" || out.type === "photo_hero") && out.image_url) {
      out = { ...out, image_url: photo };
      photoDone = true;
    }
    return out.children ? { ...out, children: out.children.map(visit) } : out;
  };
  return { ...visit(template), name: category.name, action: categoryAction(category) };
}

/** A bento's sizes with no hole left in a grid of two columns: a single small tile at the foot spans both. */
function filledSizes(entries: StudioEntry[], columns: number): StudioEntry[] {
  if (columns !== 2) return entries;
  let trailing = 0;
  for (let i = entries.length - 1; i >= 0 && (entries[i]!.size ?? "small") === "small"; i--) trailing++;
  return trailing % 2 === 1 ? entries.map((e, i) => (i === entries.length - 1 ? { ...e, size: "wide" as const } : e)) : entries;
}

/**
 * 157 The element as the shop's categories make it (see above): a
 * template's list of them, untouched, follows the owner's categories or
 * links to the demo's; any other element as it is.
 */
export function withShopCategories(node: StudioNode, shop: ShopCategories | null): StudioNode {
  const kind = templateCategoryList(node);
  if (!kind || !shop) return node;
  const follow = shop.own && shop.list.length > 0;
  const list = shop.list.slice(0, TEMPLATE_CATEGORIES_MAX);
  switch (kind) {
    case "stories": {
      const slides = node.slides!;
      if (!follow) return node;
      const made = list.map((c, i): StudioStory => {
        const template = slides[Math.min(i, slides.length - 1)]!;
        return { ...untranslated(template, ["heading", "subheading"]), heading: c.name, subheading: null, image_url: c.image_url ?? slides[i % slides.length]!.image_url ?? null, action: categoryAction(c) };
      });
      return { ...node, slides: made };
    }
    case "bento": {
      const entries = node.entries!;
      if (!follow) return node;
      const made = list.slice(0, entries.length).map((c, i): StudioEntry => {
        const template = entries[i]!;
        const subtitle = categoryWordOf(template.subtitle) ? null : template.subtitle;
        return { ...untranslated(template, ["title", ...(subtitle ? [] : ["subtitle"])]), title: c.name, subtitle: subtitle ?? null, image_url: c.image_url ?? template.image_url ?? null, action: categoryAction(c) };
      });
      return { ...node, entries: filledSizes(made, node.columns ?? 2) };
    }
    case "ticker":
      return follow ? { ...untranslated(node, ["text"]), text: list.map((c) => c.name).join("\n") } : node;
    case "children": {
      const kids = node.children!;
      if (!follow) return node;
      return { ...node, children: list.map((c, i) => childFor(kids[Math.min(i, kids.length - 1)]!, Math.min(i, kids.length - 1), i, c, photoOf(kids[i % kids.length]!))) };
    }
  }
}

/** At most this many texts in an element whose one category name links it (a chip, an arch, a card), so a whole section never does. */
const LINKED_TEXTS_MAX = 4;

/** The name of an element that opens the shop: its own words (a button's, a text's), or the one category name among its few texts. */
function linkedName(node: StudioNode, list: readonly ShopCategory[]): ShopCategory | null {
  if (!node.action || !opensShop(node.action)) return null;
  if (node.type === "text" || node.type === "button") return namesakeIn(node.text, node.translations, "text", list);
  const texts = subtree(node).filter(isText);
  if (!texts.length || texts.length > LINKED_TEXTS_MAX) return null;
  const named = texts.map((t) => namesakeIn(t.text, t.translations, "text", list)).filter((c): c is ShopCategory => c !== null);
  return named.length === 1 ? named[0]! : null;
}

/**
 * 157 An element named like one of the shop's categories opens it: a ring,
 * a tile or an entry whose words are a category's name (or one of the
 * template's words for it), a chip, an arch or a card that opens the whole
 * shop with one of them among its texts. Any other tap as it is: one with
 * no matching category still opens the shop.
 */
export function withCategoryLinks(node: StudioNode, list: readonly ShopCategory[]): StudioNode {
  // One the owner picked that the shop no longer lists (deleted, or with no products): the shop.
  const known = new Set(list.map((c) => String(c.id)));
  const kept = <T extends { action?: Action | null }>(entry: T): T => (entry.action?.type === "screen" && entry.action.category_id && !known.has(entry.action.category_id) ? { ...entry, action: SHOP_ACTION } : entry);
  let out = kept(node);
  if (node.slides?.length) out = { ...out, slides: node.slides.map((s) => (s.action && opensShop(s.action) ? linkedEntry(s, s.heading, list, null) : kept(s))) };
  if (node.entries?.length) out = { ...out, entries: node.entries.map((e) => (e.action && opensShop(e.action) ? linkedEntry(e, e.title, list, "title") : kept(e))) };
  const category = list.length ? linkedName(out, list) : null;
  return category ? { ...out, action: categoryAction(category) } : out;
}

/** The whole shop, as a template's entries open it. */
const SHOP_ACTION: Action = { type: "screen", screen: "search" };

function linkedEntry<T extends { action?: Action | null; translations?: Translations }>(entry: T, name: string | null | undefined, list: readonly ShopCategory[], field: string | null): T {
  // 209 An entry (a skin quiz's result) by its words in the app's other languages too; a story ring by its own.
  const category = field ? namesakeIn(name, entry.translations, field, list) : namesakeOf(name, list);
  return category ? { ...entry, action: categoryAction(category) } : entry;
}

/**
 * 209 The shop's category named as these words, or as their translation in
 * one of the app's other languages: the page's elements are linked before
 * they are translated, and the shop's categories are read in the language
 * asked for (a skin quiz's "Dry" opens the shop's "جافة" in Arabic).
 */
function namesakeIn(text: string | null | undefined, translations: Translations | undefined, field: string, list: readonly ShopCategory[]): ShopCategory | null {
  const own = namesakeOf(text, list);
  if (own || !translations) return own;
  for (const words of Object.values(translations)) {
    const found = namesakeOf((words as Record<string, unknown> | undefined)?.[field] as string | undefined, list);
    if (found) return found;
  }
  return null;
}

/** Whether a page has anything the shop's categories change: a template's list of them, or an element that opens the shop (at a category or not). */
export function showsShopCategories(body: StudioNode): boolean {
  const opens = (a: Action | null | undefined) => a?.type === "screen" && a.screen === "search";
  return subtree(body).some((n) => templateCategoryList(n) !== null || opens(n.action) || (n.slides ?? []).some((s) => opens(s.action)) || (n.entries ?? []).some((e) => opens(e.action)));
}

/**
 * 157 A page's elements as the shop's categories make them: the template's
 * lists of them first (`withShopCategories`), then every element named
 * like one of them opening it (`withCategoryLinks`).
 */
export function withShopCategoriesIn(body: StudioNode, shop: ShopCategories | null): StudioNode {
  if (!shop) return body;
  const lists = mapTree(body, (n) => withShopCategories(n, shop)) ?? body;
  // 209 An element named like a sub-category (a skin type, a brand, an age) opens it too.
  const named = shop.subs?.length ? [...shop.list, ...shop.subs] : shop.list;
  return mapTree(lists, (n) => (n.hidden ? n : withCategoryLinks(n, named))) ?? lists;
}
