import type { AddonRule, CatalogProduct, LangText, StoreAddonSettings, StoreSectionTitles } from "../data/types";

/**
 * 131 Gift add-ons for every store app: products sold only with another
 * (chocolates, a greeting card, a vase, a teddy, balloons). An add-on is
 * never listed on its own (product lists, search, categories, the home's
 * sections, related products, a flash sale's list), never bought alone (a
 * cart or checkout of add-ons only fails with `addon_needs_item`), and is
 * offered as "Add a little more" with the products the owner chose: all of
 * them, some categories' or some products. In the cart it is a line linked
 * to the line it goes with (`addon_of`), counted in the weight and totals.
 *
 * - Yallapp's own products: "Sell only as an add-on" on the product's page
 *   (`CatalogProduct.addon`, `addonFor`);
 * - WooCommerce: the same on WooCommerce's product screen (the plugin), the
 *   website's own shop unchanged;
 * - a connected platform: the owner's list of its products, one of its
 *   categories (a collection) or a tag where the platform gives tags
 *   (Shopify), in Delivery & offers (`CatalogSettings.addons`).
 */

export const ADDON_LIMITS = { products: 100, categories: 50, tag: 40, offered: 12 } as const;

export const ALL_PRODUCTS: AddonRule = { offerWith: "all", categoryIds: [], productIds: [] };

export const ADDON_NEEDS_ITEM = "Add-ons go with a gift: add the item they go with to your cart first.";
export const ADDON_NOT_OFFERED = "This add-on doesn't go with the items in your cart.";

/** Whether an add-on is offered with a product (its ID and its categories'). */
export function offeredWith(rule: AddonRule | null | undefined, main: { id: number; categoryIds?: number[] }): boolean {
  const r = rule ?? ALL_PRODUCTS;
  switch (r.offerWith) {
    case "all":
      return true;
    case "categories":
      return (main.categoryIds ?? []).some((c) => r.categoryIds.includes(c));
    case "products":
      return r.productIds.includes(main.id);
  }
}

/** Yallapp's own add-ons offered with `main`, in the shop's order; at most a dozen. */
export function ownAddonsFor(products: CatalogProduct[], main: Pick<CatalogProduct, "id" | "categoryIds">): CatalogProduct[] {
  return products.filter((p) => p.active && p.addon && p.id !== main.id && offeredWith(p.addonFor, main)).slice(0, ADDON_LIMITS.offered);
}

export type AddonLine = { productId: number; addonOf?: number | null; addon: boolean };

/**
 * A cart's add-on lines, checked: `needs_item` when nothing in it is a main
 * item; else each add-on line's problem (its main line missing, or not one
 * it goes with), by index. `offered(addonIndex, mainProductId)` answers
 * whether the add-on goes with that main item.
 */
export function checkAddonLines(lines: AddonLine[], offered: (index: number, mainId: number) => boolean): { needsItem: boolean; problems: Map<number, string> } {
  const mains = lines.filter((l) => !l.addon).map((l) => l.productId);
  const problems = new Map<number, string>();
  if (lines.some((l) => l.addon) && mains.length === 0) return { needsItem: true, problems };
  lines.forEach((l, i) => {
    if (!l.addon) return;
    // Linked to a main line: that one; an older app's line without a link: any main line it goes with.
    const candidates = l.addonOf ? mains.filter((m) => m === l.addonOf) : mains;
    if (candidates.length === 0) problems.set(i, ADDON_NEEDS_ITEM);
    else if (!candidates.some((m) => offered(i, m))) problems.set(i, ADDON_NOT_OFFERED);
  });
  return { needsItem: false, problems };
}

const ids = (text: string | undefined, max: number) =>
  [
    ...new Set(
      (text ?? "")
        .split(/[\s,]+/)
        .map((x) => Number(x))
        .filter((x) => Number.isSafeInteger(x) && x > 0),
    ),
  ].slice(0, max);

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** What an add-on goes with, from a form: `offerWith` and the chosen `addonCategory` / `addonProduct` values (or ID lists). */
export function parseAddonRule(v: { offerWith?: string; categoryIds?: string[] | string; productIds?: string[] | string }): Parsed<AddonRule> {
  const list = (x: string[] | string | undefined, max: number) => ids(Array.isArray(x) ? x.join(",") : x, max);
  const offerWith = v.offerWith === "categories" || v.offerWith === "products" ? v.offerWith : "all";
  const categoryIds = offerWith === "categories" ? list(v.categoryIds, ADDON_LIMITS.categories) : [];
  const productIds = offerWith === "products" ? list(v.productIds, ADDON_LIMITS.products) : [];
  if (offerWith === "categories" && categoryIds.length === 0) return { ok: false, errors: { addonFor: "Choose the categories it goes with, or offer it with every product." } };
  if (offerWith === "products" && productIds.length === 0) return { ok: false, errors: { addonFor: "Choose the products it goes with, or offer it with every product." } };
  return { ok: true, value: { offerWith, categoryIds, productIds } };
}

const TAG = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{0,39}$/u;

/** Delivery & offers' add-ons of a connected platform: its product IDs, a category, a tag, and what they go with. */
export function parseAddonSettings(v: Record<string, string>, offer: { categoryIds?: string[]; productIds?: string[] }): Parsed<StoreAddonSettings> {
  const errors: Record<string, string> = {};
  const productIds = ids(v.addonProductIds, ADDON_LIMITS.products);
  const categoryText = (v.addonCategoryId ?? "").trim();
  const categoryId = categoryText === "" ? null : Number(categoryText);
  if (categoryId !== null && (!Number.isSafeInteger(categoryId) || categoryId < 1)) errors.addonCategoryId = "Choose a category, or leave it empty.";
  const tagText = (v.addonTag ?? "").replace(/\s+/g, " ").trim();
  if (tagText !== "" && !TAG.test(tagText)) errors.addonTag = `Use up to ${ADDON_LIMITS.tag} letters, digits, spaces, dots or dashes, as the tag is on your platform.`;
  const rule = parseAddonRule({ offerWith: v.offerWith, categoryIds: offer.categoryIds ?? v.offerCategoryIds, productIds: offer.productIds ?? v.offerProductIds });
  if (!rule.ok) Object.assign(errors, rule.errors);
  if (Object.keys(errors).length || !rule.ok) return { ok: false, errors };
  return { ok: true, value: { productIds, categoryId: categoryId ?? null, tag: tagText || null, offerWith: rule.value } };
}

/** Whether a connected platform's shop has add-ons set. */
export function hasAddons(s: StoreAddonSettings | null | undefined): s is StoreAddonSettings {
  return Boolean(s && (s.productIds.length > 0 || s.categoryId !== null || s.tag));
}

// Titles the owner words

export const TITLE_MAX = 40;

/** Words per language, trimmed, at most 40 characters each; null when none. */
export function cleanLangText(input: unknown): LangText | null {
  if (!input || typeof input !== "object") return null;
  const out: LangText = {};
  for (const [lang, text] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[a-z]{2,3}$/.test(lang) || typeof text !== "string") continue;
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean) out[lang] = [...clean].slice(0, TITLE_MAX).join("");
  }
  return Object.keys(out).length ? out : null;
}

/** A form's `<prefix>_<lang>` fields as words per language; an error when one is too long. */
export function langTextOfForm(v: Record<string, string>, prefix: string, languages: string[]): { value: LangText | null; error: string | null } {
  const raw: Record<string, string> = {};
  let error: string | null = null;
  for (const lang of languages) {
    const text = (v[`${prefix}_${lang}`] ?? "").replace(/\s+/g, " ").trim();
    if ([...text].length > TITLE_MAX) error = `Keep each title to ${TITLE_MAX} characters.`;
    raw[lang] = text;
  }
  return { value: cleanLangText(raw), error };
}

/** `StoreConfig.titles`: the owner's titles per language (null: the app's words). */
export function sectionTitlesJson(t: StoreSectionTitles | null | undefined) {
  return { addons: cleanLangText(t?.addons), gift_card: cleanLangText(t?.card), delivery: cleanLangText(t?.delivery) };
}

/** Words in a language: that one's, else the default language's, else null. */
export function inLanguage(text: LangText | null | undefined, lang: string | null | undefined, fallback: string | null = null): string | null {
  if (!text) return fallback;
  return (lang ? text[lang] : undefined) ?? fallback;
}
