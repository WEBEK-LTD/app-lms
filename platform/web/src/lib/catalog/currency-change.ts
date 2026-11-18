import type { DataStore } from "../data/store";
import type { App, CatalogProduct, CatalogSettings, CatalogVariants } from "../data/types";
import { currencyDigits } from "../money/currencies";
import { rateBetween, rateText, type Rates } from "../money/rates";

/**
 * 175 Changing a shop's currency (Products › Settings): prices are kept as
 * whole cents with no currency of their own, so a new currency alone kept
 * every number (₺2,290 became MAD 2,290). The owner chooses on saving:
 * convert every price at the day's rate (Phase 149's rates), or keep the
 * numbers. Converting covers the products, their variations and options,
 * sale prices, the add-ons (products too), the shipping fees (flat, by
 * city, by distance, by weight, the least and the free-from amount), the
 * delivery slots' fees, a restaurant's delivery fee and minimum, loyalty's
 * amounts, the coupons with an amount (and every coupon's minimum) and the
 * flash sales with one price. Each amount is rounded for the currency.
 */

/** The day's rate from the shop's currency to another, as the owner reads it; null without a rate for both. */
export function conversionOf(rates: Rates, from: string, to: string): { rate: number; text: string } | null {
  if (from === to) return null;
  const rate = rateBetween(rates, from, to);
  return rate ? { rate, text: rateText(rate, from, to) } : null;
}

/**
 * An amount at `rate`, rounded the way a shop prices in `to`: whole units
 * for a currency without minor units and for amounts of 10 or more,
 * else to the tenth (0.30, 4.50). Never below one minor unit when the
 * amount wasn't zero.
 */
export function convertPrice(cents: number, rate: number, to: string): number {
  if (cents === 0) return 0;
  const raw = cents * rate;
  const step = currencyDigits(to) === 0 || raw >= 1000 ? 100 : 10;
  const rounded = Math.round(raw / step) * step;
  return rounded > 0 ? rounded : step;
}

const opt = (cents: number | null | undefined, rate: number, to: string): number | null => (cents === null || cents === undefined ? null : convertPrice(cents, rate, to));

function variantsAt(variants: CatalogVariants | null | undefined, rate: number, to: string): CatalogVariants | null | undefined {
  if (!variants) return variants;
  return { ...variants, items: variants.items.map((v) => ({ ...v, priceCents: opt(v.priceCents, rate, to), salePriceCents: opt(v.salePriceCents, rate, to) })) };
}

/** A product's prices at `rate`: its price, sale price, variations and options. */
export function productAt(product: Pick<CatalogProduct, "priceCents" | "salePriceCents" | "variants" | "optionGroups">, rate: number, to: string): Pick<CatalogProduct, "priceCents" | "salePriceCents" | "variants" | "optionGroups"> {
  return {
    priceCents: convertPrice(product.priceCents, rate, to),
    salePriceCents: opt(product.salePriceCents, rate, to),
    variants: variantsAt(product.variants, rate, to),
    optionGroups: product.optionGroups ? product.optionGroups.map((g) => ({ ...g, options: g.options.map((o) => ({ ...o, priceDeltaCents: convertPrice(o.priceDeltaCents, rate, to) })) })) : product.optionGroups,
  };
}

/** The shop settings' amounts at `rate` (shipping, slots, a restaurant's fees, loyalty). */
export function settingsAt(settings: CatalogSettings, rate: number, to: string): CatalogSettings {
  const at = (cents: number) => convertPrice(cents, rate, to);
  return {
    ...settings,
    shippingCents: at(settings.shippingCents),
    freeShippingOverCents: opt(settings.freeShippingOverCents, rate, to),
    ...(settings.cityPrices ? { cityPrices: settings.cityPrices.map((c) => ({ ...c, cents: at(c.cents) })) } : {}),
    ...(settings.otherCityCents !== undefined ? { otherCityCents: opt(settings.otherCityCents, rate, to) } : {}),
    ...(settings.distancePricing ? { distancePricing: { ...settings.distancePricing, baseCents: at(settings.distancePricing.baseCents), perKmCents: at(settings.distancePricing.perKmCents) } } : {}),
    ...(settings.weightPricing ? { weightPricing: { ...settings.weightPricing, perKgCents: at(settings.weightPricing.perKgCents) } } : {}),
    ...(settings.shippingMinCents !== undefined ? { shippingMinCents: opt(settings.shippingMinCents, rate, to) } : {}),
    ...(settings.delivery ? { delivery: { ...settings.delivery, slots: settings.delivery.slots.map((s) => ({ ...s, feeCents: opt(s.feeCents, rate, to) })) } } : {}),
    ...(settings.fulfilment ? { fulfilment: { ...settings.fulfilment, deliveryFeeCents: at(settings.fulfilment.deliveryFeeCents), minOrderCents: opt(settings.fulfilment.minOrderCents, rate, to) } } : {}),
    ...(settings.loyalty ? { loyalty: { ...settings.loyalty, spendPerPointCents: at(settings.loyalty.spendPerPointCents), pointValueCents: at(settings.loyalty.pointValueCents) } } : {}),
  };
}

export interface ConvertReport {
  products: number;
  coupons: number;
  flashSales: number;
}

/**
 * Converts what the shop keeps in its own records to `to` at `rate`:
 * every product (the add-ons are products), the coupons and the flash
 * sales. The settings are converted by the caller with `settingsAt`, in the
 * same save as the new currency.
 */
export async function convertShopRecords(store: DataStore, app: Pick<App, "id">, rate: number, to: string, now: Date): Promise<ConvertReport> {
  const report: ConvertReport = { products: 0, coupons: 0, flashSales: 0 };
  for (const product of await store.listCatalogProducts(app.id)) {
    await store.updateCatalogProduct(app.id, product.id, productAt(product, rate, to), now);
    report.products += 1;
  }
  for (const coupon of await store.listCatalogCoupons(app.id)) {
    const patch = { minOrderCents: opt(coupon.minOrderCents, rate, to), ...(coupon.kind === "amount" ? { value: convertPrice(coupon.value, rate, to) } : {}) };
    if (coupon.kind === "amount" || coupon.minOrderCents !== null) {
      await store.updateCatalogCoupon(app.id, coupon.id, patch);
      report.coupons += 1;
    }
  }
  for (const sale of await store.listFlashSales(app.id)) {
    if (sale.discount.kind !== "price") continue;
    await store.updateFlashSale(app.id, sale.id, { discount: { kind: "price", cents: convertPrice(sale.discount.cents, rate, to) }, updatedAt: now });
    report.flashSales += 1;
  }
  return report;
}

/** The log line of a currency change. */
export function currencyChangeLine(from: string, to: string, conversion: { text: string } | null): string {
  return conversion ? `Changed the shop's currency from ${from} to ${to}, prices converted at ${conversion.text}` : `Changed the shop's currency from ${from} to ${to}, prices kept as they were`;
}
