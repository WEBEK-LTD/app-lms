import type { CatalogSettings, CatalogTax } from "../data/types";

/**
 * 91.5 The tax of a shop without a website (VAT, KDV): on what the customer
 * pays for the products (after the coupon and points) and the shipping.
 * Included in the prices (the cart and receipt say how much of the total it
 * is) or added to the total.
 */

export const TAX_RATE_MAX_BPS = 10_000;

export function taxOf(settings: Pick<CatalogSettings, "tax">): CatalogTax | null {
  const t = settings.tax;
  return t && t.label.trim() && Number.isInteger(t.rateBps) && t.rateBps > 0 && t.rateBps <= TAX_RATE_MAX_BPS ? t : null;
}

/** "KDV 20%", "VAT 7.5%". */
export function taxLabel(t: CatalogTax): string {
  return `${t.label} ${Number((t.rateBps / 100).toFixed(2))}%`;
}

/** The tax on `baseCents`: inside it when included, on top of it when added. */
export function taxCents(t: CatalogTax, baseCents: number): number {
  if (baseCents <= 0) return 0;
  return t.included ? Math.round((baseCents * t.rateBps) / (10_000 + t.rateBps)) : Math.round((baseCents * t.rateBps) / 10_000);
}
