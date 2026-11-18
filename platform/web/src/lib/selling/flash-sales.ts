import { centsToDecimal, formatCents, parsePrice } from "../catalog/money";
import { normalizeCouponCode } from "../catalog/coupons";
import type { CatalogCurrency, StoreFlashSale } from "../data/types";

/**
 * 131 Flash sales for every store app: products (or a category's) at a
 * sale price or a share off between two times, maybe for a limited number
 * of units ("only 12 left"). Each product the API sends carries its `sale`
 * (was, now, the share off, when it ends, how many are left):
 *
 * - its own products (no website): Yallapp applies the price, at checkout
 *   too, and counts the units sold when an order is paid;
 * - a connected platform: the platform's own sale (its compare-at price) is
 *   shown as it is, and a Yallapp flash sale over it changes the price the
 *   app shows; the platform's checkout charges its own prices, unless the
 *   sale has the platform's discount code with the same terms, which goes
 *   with the checkout link (the dashboard says so);
 * - WordPress: WooCommerce's own sale price and schedule (the plugin).
 */

export const FLASH_LIMITS = { title: 80, products: 100, percent: 90, units: 100_000 } as const;

/** Whether a sale is on at `now`: turned on, started, not ended and not sold out. */
export function saleOn(sale: StoreFlashSale, now: Date): boolean {
  return sale.active && sale.startsAt.getTime() <= now.getTime() && now.getTime() < sale.endsAt.getTime() && (sale.limit === null || sale.sold < sale.limit);
}

/** Units left at the sale's price; null without a limit. */
export function unitsLeft(sale: Pick<StoreFlashSale, "limit" | "sold">): number | null {
  return sale.limit === null ? null : Math.max(0, sale.limit - sale.sold);
}

/** Whether a product is in a sale: one of its products, or of its category. */
export function covers(sale: Pick<StoreFlashSale, "productIds" | "categoryId">, product: { id: number; categoryIds?: number[] }): boolean {
  if (sale.productIds.includes(product.id)) return true;
  return sale.categoryId !== null && (product.categoryIds ?? []).includes(sale.categoryId);
}

/** The price in a sale of a product that costs `regularCents`; null when the sale wouldn't lower it. */
export function salePrice(sale: Pick<StoreFlashSale, "discount">, regularCents: number): number | null {
  const now = sale.discount.kind === "percent" ? Math.round((regularCents * (100 - sale.discount.percent)) / 100) : sale.discount.cents;
  return now >= 0 && now < regularCents ? now : null;
}

/** The sale on now that gives a product its lowest price, with that price; null for none. */
export function bestSale(sales: StoreFlashSale[], product: { id: number; categoryIds?: number[] }, regularCents: number, now: Date): { sale: StoreFlashSale; cents: number } | null {
  let best: { sale: StoreFlashSale; cents: number } | null = null;
  for (const sale of sales) {
    if (!saleOn(sale, now) || !covers(sale, product)) continue;
    const cents = salePrice(sale, regularCents);
    if (cents !== null && (!best || cents < best.cents)) best = { sale, cents };
  }
  return best;
}

const money = (cents: number, currency: string) => formatCents(cents, currency as CatalogCurrency);

/** `ProductSale` in the contract: was, now, the share off, when it ends and how many are left. */
export function saleJson(input: { wasCents: number; nowCents: number; currency: string; endsAt: Date | null; startsAt?: Date | null; remaining: number | null; total: number | null; flashSaleId: number | null }) {
  return {
    // 161 Its currency: the hosted API adds `display`, its prices in the customer's (lib/money/display.ts).
    currency: input.currency,
    was: centsToDecimal(input.wasCents),
    was_formatted: money(input.wasCents, input.currency),
    now: centsToDecimal(input.nowCents),
    now_formatted: money(input.nowCents, input.currency),
    percent_off: input.wasCents > 0 ? Math.max(1, Math.round(((input.wasCents - input.nowCents) * 100) / input.wasCents)) : 0,
    starts_at: input.startsAt ? input.startsAt.toISOString() : null,
    ends_at: input.endsAt ? input.endsAt.toISOString() : null,
    remaining: input.remaining,
    total: input.total,
    flash_sale_id: input.flashSaleId,
  };
}

/** Cents from a decimal amount the API sent ("129.90"); null when it isn't one. */
export function centsOf(amount: unknown): number | null {
  if (typeof amount !== "string" && typeof amount !== "number") return null;
  const n = Number(amount);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

interface PriceJson {
  amount: string;
  regular_amount: string | null;
  regular_formatted?: string | null;
  currency: string;
  formatted: string;
  on_sale: boolean;
  range: boolean;
}

/**
 * A product from any source as the app gets it, with its `sale`: a flash
 * sale on now over its price (the price shown changes), else the source's
 * own sale (its compare-at price) as it is. Products already carrying a
 * `sale` keep it.
 */
export function withSale<T extends { id: number; price?: PriceJson | null; sale?: unknown; categories?: { id: number }[] }>(
  product: T,
  sales: StoreFlashSale[],
  now: Date,
  categoryIds?: number[],
): T & { sale?: unknown } {
  const price = product.price;
  if (!price || price.range) return product.sale !== undefined ? product : { ...product, sale: null };
  const current = centsOf(price.amount);
  const regular = centsOf(price.regular_amount) ?? current;
  if (current === null || regular === null) return { ...product, sale: product.sale ?? null };
  const best = bestSale(sales, { id: product.id, categoryIds: categoryIds ?? product.categories?.map((c) => c.id) }, regular, now);
  if (best && best.cents < current) {
    return {
      ...product,
      price: {
        ...price,
        amount: centsToDecimal(best.cents),
        formatted: money(best.cents, price.currency),
        regular_amount: centsToDecimal(regular),
        regular_formatted: money(regular, price.currency),
        on_sale: true,
      },
      sale: saleJson({ wasCents: regular, nowCents: best.cents, currency: price.currency, endsAt: best.sale.endsAt, startsAt: best.sale.startsAt, remaining: unitsLeft(best.sale), total: best.sale.limit, flashSaleId: best.sale.id }),
    };
  }
  if (product.sale !== undefined && product.sale !== null) return product;
  if (price.on_sale && regular > current) {
    return { ...product, sale: saleJson({ wasCents: regular, nowCents: current, currency: price.currency, endsAt: null, remaining: null, total: null, flashSaleId: null }) };
  }
  return { ...product, sale: null };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** A date and time typed in the form ("2026-11-20T09:00") in the shop's time zone offset given in minutes; null when it isn't one. */
function localTime(value: string, offsetMinutes: number): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const at = new Date(`${value}:00Z`);
  return Number.isNaN(at.getTime()) ? null : new Date(at.getTime() - offsetMinutes * 60_000);
}

/** The dashboard's flash sale form. `offsetMinutes`: the shop's time zone's offset from UTC now. */
export function parseFlashSaleForm(
  v: Record<string, string>,
  offsetMinutes: number,
): Parsed<Pick<StoreFlashSale, "title" | "productIds" | "categoryId" | "discount" | "startsAt" | "endsAt" | "limit" | "platformCode">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").replace(/\s+/g, " ").trim();
  if (title.length < 2 || title.length > FLASH_LIMITS.title) errors.title = `Give it a name of up to ${FLASH_LIMITS.title} characters.`;
  const productIds = (v.productIds ?? "")
    .split(/[\s,]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isSafeInteger(x) && x > 0);
  const unique = [...new Set(productIds)].slice(0, FLASH_LIMITS.products);
  const categoryText = (v.categoryId ?? "").trim();
  const categoryId = categoryText === "" ? null : Number(categoryText);
  if (categoryId !== null && (!Number.isSafeInteger(categoryId) || categoryId < 1)) errors.categoryId = "Choose a category.";
  if (unique.length === 0 && categoryId === null) errors.productIds = "Choose the products on sale, or a category.";
  let discount: StoreFlashSale["discount"] = { kind: "percent", percent: 0 };
  if (v.kind === "price") {
    const cents = parsePrice(v.value ?? "");
    if (cents === null || cents <= 0) errors.value = "Enter the sale price, like 299.";
    else discount = { kind: "price", cents };
  } else {
    const percent = Number((v.value ?? "").trim());
    if (!Number.isInteger(percent) || percent < 1 || percent > FLASH_LIMITS.percent) errors.value = `Enter a share off from 1 to ${FLASH_LIMITS.percent}.`;
    else discount = { kind: "percent", percent };
  }
  const startsAt = localTime((v.startsAt ?? "").trim(), offsetMinutes);
  const endsAt = localTime((v.endsAt ?? "").trim(), offsetMinutes);
  if (!startsAt) errors.startsAt = "Choose when it starts.";
  if (!endsAt) errors.endsAt = "Choose when it ends.";
  else if (startsAt && endsAt.getTime() <= startsAt.getTime()) errors.endsAt = "It must end after it starts.";
  const limitText = (v.limit ?? "").trim();
  const limit = limitText === "" ? null : Number(limitText);
  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > FLASH_LIMITS.units)) errors.limit = "Enter how many units are on sale, or leave it empty for no limit.";
  const codeText = (v.platformCode ?? "").trim();
  const platformCode = codeText === "" ? null : normalizeCouponCode(codeText);
  if (codeText !== "" && !platformCode) errors.platformCode = "Use 2 to 50 letters, digits or dashes, as the code is on your platform.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, productIds: unique, categoryId, discount, startsAt: startsAt!, endsAt: endsAt!, limit, platformCode } };
}

/** `FlashSale` in the contract (`GET /store/flash-sales`). */
export function flashSaleJson(sale: StoreFlashSale, products: unknown[], now: Date, lang?: string | null) {
  return {
    id: sale.id,
    // 131 In the app's language when the owner wrote it there.
    title: (lang ? sale.titles?.[lang] : undefined) ?? sale.title,
    titles: sale.titles ?? null,
    starts_at: sale.startsAt.toISOString(),
    ends_at: sale.endsAt.toISOString(),
    live: saleOn(sale, now),
    percent_off: sale.discount.kind === "percent" ? sale.discount.percent : null,
    remaining: unitsLeft(sale),
    total: sale.limit,
    products,
  };
}

/** The sales the app lists: on now, or starting within a day, soonest ending first. */
export function listedSales(sales: StoreFlashSale[], now: Date): StoreFlashSale[] {
  const day = now.getTime() + 86_400_000;
  return sales
    .filter((s) => s.active && s.endsAt.getTime() > now.getTime() && s.startsAt.getTime() <= day && (s.limit === null || s.sold < s.limit))
    .sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());
}
