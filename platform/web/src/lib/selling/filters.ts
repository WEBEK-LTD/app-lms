import { centsToDecimal, formatCents } from "../catalog/money";
import { wordIn } from "../catalog/product-langs";
import { servedPrice, variantMax, variantsOf } from "../catalog/variants";
import type { CatalogCurrency, CatalogProduct } from "../data/types";

/**
 * 212 A shop's listing filters (Yallapp's own shop): its products' sizes,
 * colours and other choices, the price range and the brands, for the
 * reusable filter element (`GET /store/filters`), and the products of
 * `GET /store/products` that match them: `size`, `colour` and `f.<key>`
 * (values separated by commas, any of them), `min_price` and `max_price`
 * (in the shop's currency), `brand`, `in_stock=1`. A product with
 * variations matches when one variation it sells now has all the choices
 * asked for; a product without matches no choice. Connected platforms
 * filter by price only (their lists don't carry the choices).
 */

/** The names a size or a colour choice goes by, in English, Arabic and Turkish. */
const SIZE_NAMES = ["size", "sizes", "shoe size", "المقاس", "مقاس", "المقاسات", "الحجم", "حجم", "beden", "boyut", "numara", "ölçü"];
const COLOUR_NAMES = ["colour", "color", "colours", "colors", "اللون", "لون", "الألوان", "renk", "renkler"];

/** Some colours' swatches, by their name in any of the three languages. */
const SWATCHES: Record<string, string> = {
  black: "#111111", "أسود": "#111111", siyah: "#111111",
  white: "#ffffff", "أبيض": "#ffffff", beyaz: "#ffffff",
  red: "#d32f2f", "أحمر": "#d32f2f", "kırmızı": "#d32f2f",
  blue: "#1e63d6", "أزرق": "#1e63d6", mavi: "#1e63d6",
  navy: "#1b2a4a", "كحلي": "#1b2a4a", lacivert: "#1b2a4a",
  green: "#2e7d32", "أخضر": "#2e7d32", "yeşil": "#2e7d32",
  yellow: "#f5c518", "أصفر": "#f5c518", "sarı": "#f5c518",
  pink: "#f06292", "وردي": "#f06292", pembe: "#f06292",
  purple: "#7b1fa2", "بنفسجي": "#7b1fa2", mor: "#7b1fa2",
  orange: "#f57c00", "برتقالي": "#f57c00", turuncu: "#f57c00",
  brown: "#6d4c41", "بني": "#6d4c41", kahverengi: "#6d4c41",
  beige: "#d9c3a5", "بيج": "#d9c3a5", bej: "#d9c3a5",
  grey: "#9e9e9e", gray: "#9e9e9e", "رمادي": "#9e9e9e", gri: "#9e9e9e",
  gold: "#c9a227", "ذهبي": "#c9a227", "altın": "#c9a227",
  silver: "#c0c0c0", "فضي": "#c0c0c0", "gümüş": "#c0c0c0",
  cream: "#f3ead6", "كريمي": "#f3ead6", krem: "#f3ead6",
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleLowerCase("tr");

/** A choice's key in the filters: `size`, `colour`, or its own name in lower case. */
export function facetKey(attributeName: string): string {
  const n = norm(attributeName);
  if (SIZE_NAMES.includes(n)) return "size";
  if (COLOUR_NAMES.includes(n)) return "colour";
  return n.slice(0, 40);
}

export function swatchOf(value: string): string | null {
  return SWATCHES[norm(value)] ?? null;
}

export interface ListingFilters {
  /** Choice key → the values asked for (lower case). */
  choices: Map<string, Set<string>>;
  minCents: number | null;
  maxCents: number | null;
  brands: Set<string>;
  inStock: boolean;
}

const list = (v: string | null) =>
  (v ?? "")
    .split(",")
    .map(norm)
    .filter(Boolean)
    .slice(0, 20);

function cents(v: string | null): number | null {
  if (v === null || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1e10 ? Math.round(n * 100) : null;
}

/** The filters asked for; null when none. */
export function readListingFilters(query: URLSearchParams): ListingFilters | null {
  const choices = new Map<string, Set<string>>();
  const add = (key: string, values: string[]) => {
    if (!values.length) return;
    const set = choices.get(key) ?? new Set<string>();
    for (const v of values) set.add(v);
    choices.set(key, set);
  };
  add("size", list(query.get("size")));
  add("colour", [...list(query.get("colour")), ...list(query.get("color"))]);
  for (const [name, value] of query) if (name.startsWith("f.") && name.length > 2) add(facetKey(name.slice(2)), list(value));
  const f: ListingFilters = {
    choices,
    minCents: cents(query.get("min_price")),
    maxCents: cents(query.get("max_price")),
    brands: new Set(list(query.get("brand"))),
    inStock: query.get("in_stock") === "1" || query.get("in_stock") === "true",
  };
  return choices.size || f.minCents !== null || f.maxCents !== null || f.brands.size || f.inStock ? f : null;
}

/** Whether a product matches the filters (its price as served: its sale, its variations' range). */
export function matchesFilters(p: CatalogProduct, f: ListingFilters): boolean {
  const { low, high } = servedPrice(p);
  if (f.minCents !== null && high < f.minCents) return false;
  if (f.maxCents !== null && low > f.maxCents) return false;
  if (f.brands.size && !(p.brand && f.brands.has(norm(p.brand)))) return false;
  const variants = variantsOf(p);
  if (!variants) {
    if (f.choices.size) return false;
    return !f.inStock || p.stock === null || p.stock > 0;
  }
  const keys = variants.attributes.map((a) => facetKey(a.name));
  for (const key of f.choices.keys()) if (!keys.includes(key)) return false;
  return variants.items.some((v) => {
    if (!v.active) return false;
    const max = variantMax(p, v);
    if ((f.inStock || f.choices.size) && max !== null && max <= 0) return false;
    return [...f.choices].every(([key, wanted]) => {
      const i = keys.indexOf(key);
      return i >= 0 && wanted.has(norm(v.values[i] ?? ""));
    });
  });
}

/** `GET /store/filters`: what the products listed can be filtered by. */
export function facetsJson(products: CatalogProduct[], currency: CatalogCurrency, lang: string | null) {
  const facets = new Map<string, { key: string; name: string; kind: "size" | "colour" | "choice"; values: Map<string, { value: string; label: string; count: number }> }>();
  const brands = new Map<string, { value: string; count: number }>();
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    const { low, high } = servedPrice(p);
    min = Math.min(min, low);
    max = Math.max(max, high);
    if (p.brand?.trim()) {
      const b = brands.get(norm(p.brand)) ?? { value: p.brand.trim(), count: 0 };
      b.count++;
      brands.set(norm(p.brand), b);
    }
    const variants = variantsOf(p);
    if (!variants) continue;
    variants.attributes.forEach((a, i) => {
      const key = facetKey(a.name);
      const facet = facets.get(key) ?? { key, name: wordIn(p, lang, a.name), kind: key === "size" ? "size" : key === "colour" ? "colour" : "choice", values: new Map() };
      const sold = new Set(variants.items.filter((v) => v.active).map((v) => norm(v.values[i] ?? "")));
      for (const value of a.values) {
        if (!sold.has(norm(value))) continue;
        const row = facet.values.get(norm(value)) ?? { value, label: wordIn(p, lang, value), count: 0 };
        row.count++;
        facet.values.set(norm(value), row);
      }
      facets.set(key, facet);
    });
  }
  const order = (k: string) => (k === "size" ? 0 : k === "colour" ? 1 : 2);
  return {
    choices: [...facets.values()]
      .filter((f) => f.values.size > 1 || (f.values.size === 1 && products.length > 1))
      .sort((a, b) => order(a.key) - order(b.key) || a.key.localeCompare(b.key))
      .slice(0, 6)
      .map((f) => ({
        key: f.key,
        name: f.name,
        kind: f.kind,
        values: [...f.values.values()].slice(0, 40).map((v) => ({ ...v, ...(f.kind === "colour" ? { swatch: swatchOf(v.value) } : {}) })),
      })),
    price:
      products.length && min < Infinity
        ? { min: centsToDecimal(Math.floor(min / 100) * 100, currency), max: centsToDecimal(Math.ceil(max / 100) * 100, currency), currency, min_formatted: formatCents(Math.floor(min / 100) * 100, currency), max_formatted: formatCents(Math.ceil(max / 100) * 100, currency) }
        : null,
    brands: [...brands.values()].sort((a, b) => b.count - a.count).slice(0, 30),
    sorts: ["newest", "popular", "price_asc", "price_desc", "rating"],
  };
}
