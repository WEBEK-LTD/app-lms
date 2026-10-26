import type { CatalogProduct, CatalogVariant, CatalogVariants } from "../data/types";

/**
 * 91.5 Variations of products in shops without a website: up to three
 * attributes (Size, Colour) and the combinations the shop sells, each with
 * its own price (or the product's), stock and SKU. In the app they are the
 * same attributes and variations as a WooCommerce variable product: the
 * customer chooses a value of each, and the cart line names the variation.
 * The product's own stock, when set, still caps every variation.
 */

export const VARIANT_LIMITS = { attributes: 3, values: 20, items: 100, name: 40, sku: 64 };

const CENTS_MAX = 100_000_000;

/** The product's variations when it has any the app can sell (at least one attribute and one combination). */
export function variantsOf(product: Pick<CatalogProduct, "variants">): CatalogVariants | null {
  const v = product.variants;
  return v && v.attributes.length > 0 && v.items.length > 0 ? v : null;
}

/** What one variation sells for now, and before its sale. */
export function variantPrices(product: Pick<CatalogProduct, "priceCents" | "salePriceCents">, v: CatalogVariant): { now: number; regular: number } {
  const regular = v.priceCents ?? product.priceCents;
  const sale = v.priceCents !== null ? v.salePriceCents : product.salePriceCents;
  return { now: sale !== null && sale < regular ? sale : regular, regular };
}

/** "Red, Large". */
export function variantLabel(v: Pick<CatalogVariant, "values">): string {
  return v.values.join(", ");
}

/** How many of a variation can be bought: its stock and the product's; null when neither is tracked. */
export function variantMax(product: Pick<CatalogProduct, "stock">, v: CatalogVariant): number | null {
  const limits = [product.stock, v.stock].filter((n): n is number => n !== null);
  return limits.length ? Math.min(...limits) : null;
}

/** The variations a customer can choose now: on, with stock. */
export function sellableVariants(product: Pick<CatalogProduct, "variants" | "stock">): CatalogVariant[] {
  const v = variantsOf(product);
  return v ? v.items.filter((item) => item.active && (variantMax(product, item) ?? 1) > 0) : [];
}

/** `ProductDetail.attributes`: slugged a1 to a3, each value its own option. */
export function attributesJson(v: CatalogVariants) {
  return v.attributes.map((a, i) => ({
    slug: `a${i + 1}`,
    name: a.name,
    variation: true,
    options: a.values.map((value) => ({ value, label: value })),
  }));
}

/** A variation's `attributes`: slug to value. */
export function variationAttributes(v: CatalogVariants, item: CatalogVariant): Record<string, string> {
  return Object.fromEntries(v.attributes.map((_, i) => [`a${i + 1}`, item.values[i] ?? ""]));
}

type Parsed = { ok: true; variants: CatalogVariants | null } | { ok: false; message: string };

const asText = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");
const asCents = (x: unknown): number | null | undefined => {
  if (x === null || x === undefined || x === "") return null;
  return typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= CENTS_MAX ? x : undefined;
};

/**
 * The dashboard's variations, as its editor sends them (JSON): attributes
 * with their values, and the combinations with prices in cents. Combinations
 * must use the attributes' values; ids stay as they were and new ones get
 * the next free number. An empty list is no variations.
 */
export function parseVariants(raw: string): Parsed {
  if (raw.trim() === "") return { ok: true, variants: null };
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return { ok: false, message: "The variations couldn't be read. Please try again." };
  }
  const data = (input ?? {}) as { attributes?: unknown; items?: unknown };
  const rawAttributes = Array.isArray(data.attributes) ? data.attributes : [];
  const attributes: CatalogVariants["attributes"] = [];
  for (const a of rawAttributes) {
    const name = asText((a as { name?: unknown }).name, VARIANT_LIMITS.name);
    const values = [...new Set((Array.isArray((a as { values?: unknown }).values) ? ((a as { values: unknown[] }).values) : []).map((x) => asText(x, VARIANT_LIMITS.name)).filter(Boolean))];
    if (!name && values.length === 0) continue;
    if (!name || values.length === 0) return { ok: false, message: "Give each variation a name, like Size, and its values, like S, M, L." };
    if (values.length > VARIANT_LIMITS.values) return { ok: false, message: "Use at most 20 values for each variation." };
    attributes.push({ name, values });
  }
  if (attributes.length === 0) return { ok: true, variants: null };
  if (attributes.length > VARIANT_LIMITS.attributes) return { ok: false, message: "Use at most 3 variations, like Size and Colour." };
  if (new Set(attributes.map((a) => a.name.toLocaleLowerCase("tr"))).size !== attributes.length) return { ok: false, message: "Give each variation a different name." };
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length > VARIANT_LIMITS.items) return { ok: false, message: "Use at most 100 combinations." };
  const items: CatalogVariant[] = [];
  const seen = new Set<string>();
  let nextId = Math.max(0, ...rawItems.map((i) => Number((i as { id?: unknown }).id)).filter((n) => Number.isSafeInteger(n) && n > 0)) + 1;
  for (const raw of rawItems) {
    const i = raw as Record<string, unknown>;
    const values = Array.isArray(i.values) ? i.values.map((x) => asText(x, VARIANT_LIMITS.name)) : [];
    if (values.length !== attributes.length || values.some((value, n) => !attributes[n]!.values.includes(value))) continue;
    const key = values.join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    const priceCents = asCents(i.priceCents);
    const salePriceCents = asCents(i.salePriceCents);
    const stock = i.stock === null || i.stock === undefined || i.stock === "" ? null : typeof i.stock === "number" && Number.isInteger(i.stock) && i.stock >= 0 && i.stock <= 1_000_000 ? i.stock : undefined;
    if (priceCents === undefined || salePriceCents === undefined) return { ok: false, message: "Enter each combination's price like 450 or 450.50, or leave it empty for the product's price." };
    if (salePriceCents !== null && priceCents === null) return { ok: false, message: "Enter a combination's price before its sale price." };
    if (stock === undefined) return { ok: false, message: "Enter each combination's stock as a whole number, or leave it empty." };
    const id = Number(i.id);
    items.push({
      id: Number.isSafeInteger(id) && id > 0 && !items.some((x) => x.id === id) ? id : nextId++,
      values,
      priceCents,
      salePriceCents,
      stock,
      sku: asText(i.sku, VARIANT_LIMITS.sku) || null,
      active: i.active !== false,
    });
  }
  if (items.length === 0) return { ok: false, message: "Add at least one combination the customer can buy." };
  return { ok: true, variants: { attributes, items } };
}

/** Every combination of the attributes' values, in order (the editor's "Add all"). */
export function allCombinations(attributes: CatalogVariants["attributes"]): string[][] {
  return attributes.reduce<string[][]>((acc, a) => acc.flatMap((prefix) => a.values.map((value) => [...prefix, value])), [[]]).filter((c) => c.length === attributes.length);
}
