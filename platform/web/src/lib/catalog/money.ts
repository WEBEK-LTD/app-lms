import type { CatalogCurrency } from "../data/types";

export const CATALOG_CURRENCIES: CatalogCurrency[] = ["TRY", "USD", "EUR"];

const formatters = new Map<CatalogCurrency, Intl.NumberFormat>();

/** "₺1,234.50" */
export function formatCents(cents: number, currency: CatalogCurrency): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" });
    formatters.set(currency, formatter);
  }
  return formatter.format(cents / 100);
}

/** "1234.50", as the API's amounts. */
export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Parses a price typed in the dashboard ("450", "450.5", "1,250.00",
 * "1.250,00") into cents; null when it isn't a price.
 */
export function parsePrice(value: string): number | null {
  let text = value.trim().replace(/[\s₺$€]/g, "");
  if (!/^\d[\d.,]*$/.test(text)) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);
  // A separator followed by exactly 1 or 2 digits is the decimal point.
  if (decimalAt >= 0 && text.length - decimalAt - 1 <= 2) {
    text = `${text.slice(0, decimalAt).replace(/[.,]/g, "")}.${text.slice(decimalAt + 1)}`;
  } else {
    text = text.replace(/[.,]/g, "");
  }
  const cents = Math.round(Number(text) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= 100_000_000_00 ? cents : null;
}
