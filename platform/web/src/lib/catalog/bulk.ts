import type { CatalogCategory, CatalogProduct, CatalogProductInput } from "../data/types";

/**
 * 132.12 The categories' new order: the ids asked for that are the app's,
 * once each, then the app's other categories in their current order (a
 * category added meanwhile keeps a place).
 */
export function categoryOrder(categories: Pick<CatalogCategory, "id">[], ids: number[]): number[] {
  const known = new Set(categories.map((c) => c.id));
  const first = [...new Set(ids)].filter((id) => known.has(id));
  const asked = new Set(first);
  return [...first, ...categories.map((c) => c.id).filter((id) => !asked.has(id))];
}

/** 132.11 Bulk actions on the Products list. */
export const BULK_OPS = ["publish", "hide", "delete", "category", "price"] as const;
export type BulkOp = (typeof BULK_OPS)[number];

export function isBulkOp(value: unknown): value is BulkOp {
  return typeof value === "string" && (BULK_OPS as readonly string[]).includes(value);
}

/** The most a price can change at once, in percent (down to a tenth of the price, up to six times it). */
export const PRICE_CHANGE = { min: -90, max: 500 } as const;
/** The highest price the product form takes, in cents (9,999,999.99). */
const PRICE_MAX_CENTS = 999_999_999;

/** "10", "-15", "+7.5" or "7,5" as a percent within PRICE_CHANGE; null for anything else (and 0). */
export function parsePercent(text: string): number | null {
  const t = text.trim().replace(",", ".").replace(/^\+/, "");
  if (!/^-?\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  if (n === 0 || n < PRICE_CHANGE.min || n > PRICE_CHANGE.max) return null;
  return n;
}

const scale = (cents: number, factor: number) => Math.max(0, Math.round(cents * factor));

/**
 * A product's prices changed by `percent`: its price, its sale price and each
 * variation's own prices (a sale stays lower than the price: both change by
 * the same share). Null when a price would go over the highest one.
 */
export function changedPrices(product: Pick<CatalogProduct, "priceCents" | "salePriceCents" | "variants">, percent: number): Pick<CatalogProductInput, "priceCents" | "salePriceCents" | "variants"> | null {
  const factor = 1 + percent / 100;
  const priceCents = scale(product.priceCents, factor);
  const salePriceCents = product.salePriceCents === null ? null : scale(product.salePriceCents, factor);
  const variants = product.variants
    ? {
        ...product.variants,
        items: product.variants.items.map((v) => ({
          ...v,
          priceCents: v.priceCents === null ? null : scale(v.priceCents, factor),
          salePriceCents: v.salePriceCents === null ? null : scale(v.salePriceCents, factor),
        })),
      }
    : (product.variants ?? null);
  const all = [priceCents, salePriceCents ?? 0, ...(variants?.items ?? []).flatMap((v) => [v.priceCents ?? 0, v.salePriceCents ?? 0])];
  if (all.some((c) => c > PRICE_MAX_CENTS)) return null;
  // A sale that rounding made equal to the price is no sale.
  return { priceCents, salePriceCents: salePriceCents !== null && salePriceCents >= priceCents ? null : salePriceCents, variants };
}

/** 132.11 Photos kept in the order the editor put them (the first is the cover); ids it didn't list keep their place after them. */
export function orderedImages(kept: string[], order: string[]): string[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return kept
    .map((id, i) => ({ id, i }))
    .sort((a, b) => (rank.get(a.id) ?? order.length + a.i) - (rank.get(b.id) ?? order.length + b.i))
    .map((x) => x.id);
}
