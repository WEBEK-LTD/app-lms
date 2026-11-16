import type { CatalogCurrency } from "../data/types";
import { currencyDigits, ISO_CURRENCIES } from "../money/currencies";

/**
 * 133.1 Every active ISO 4217 currency (lib/money/currencies.ts): an app
 * sells in any of them. 37 Each payment gateway takes some
 * (lib/payments/provider.ts); before 133 these were TRY, USD, EUR, EGP, SAR
 * and AED, and Yallapp's own plans and invoices still are (BILLING_CURRENCIES).
 */
export const CATALOG_CURRENCIES: CatalogCurrency[] = [...ISO_CURRENCIES];

/** Yallapp's own plans, invoices and coupons: the currencies its accounts take. */
export const BILLING_CURRENCIES: CatalogCurrency[] = ["TRY", "USD", "EUR", "EGP", "SAR", "AED"];

const formatters = new Map<string, (amount: number) => string>();

/** "₺1,234.50", "KWD 1.250", "¥1,250": each currency with its own digits. */
export function formatCents(cents: number, currency: CatalogCurrency): string {
  let format = formatters.get(currency);
  if (!format) {
    const digits = currencyDigits(currency);
    try {
      const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol", minimumFractionDigits: digits, maximumFractionDigits: digits });
      format = (amount) => formatter.format(amount);
    } catch {
      // A code this server's Intl doesn't know: the code and the number.
      const plain = new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
      format = (amount) => `${currency} ${plain.format(amount)}`;
    }
    formatters.set(currency, format);
  }
  return format(cents / 100);
}

/** "1234.50", "1.250" (KWD), "1250" (JPY), as the API's amounts; two digits when no currency is given. */
export function centsToDecimal(cents: number, currency?: string | null): string {
  return (cents / 100).toFixed(currency ? currencyDigits(currency) : 2);
}

/**
 * Parses a price typed in the dashboard ("450", "450.5", "1,250.00",
 * "1.250,00") into cents; null when it isn't a price. 133.2 With the
 * currency, as many digits after the point as it has: "1.250" is one dinar
 * and a quarter in KWD (kept to the hundredth, so "1.255" isn't a price),
 * and 1,250 yen in JPY, where a fraction isn't a price. Without it: two.
 */
export function parsePrice(value: string, currency?: string | null): number | null {
  const digits = currency ? currencyDigits(currency) : 2;
  let text = value.trim().replace(/[\s₺$€£¥]/g, "");
  if (currency) text = text.replace(new RegExp(`^${currency}|${currency}$`, "i"), "");
  if (!/^\d[\d.,]*$/.test(text)) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);
  const after = decimalAt >= 0 ? text.length - decimalAt - 1 : 0;
  // A separator used once, or the last of two kinds ("1.250,5"), followed by
  // up to the currency's digits (at least two, so "450.50" reads the same in
  // yen) is the decimal point; the others group thousands.
  const separator = decimalAt >= 0 ? text[decimalAt]! : "";
  const once = separator !== "" && text.indexOf(separator) === decimalAt;
  const mixed = lastComma >= 0 && lastDot >= 0;
  const isDecimal = decimalAt >= 0 && after >= 1 && after <= Math.max(2, digits) && (after <= 2 || once || mixed);
  if (isDecimal) {
    text = `${text.slice(0, decimalAt).replace(/[.,]/g, "")}.${text.slice(decimalAt + 1)}`;
  } else {
    text = text.replace(/[.,]/g, "");
  }
  // Thousandths: only whole hundredths are kept (1.250, not 1.255).
  const scaled = Number(text) * 1000;
  if (!Number.isFinite(scaled)) return null;
  const thousandths = Math.round(scaled);
  if (thousandths % 10 !== 0) return null;
  const cents = thousandths / 10;
  // A whole-unit currency: no fractions (¥450, not ¥450.5).
  if (digits === 0 && cents % 100 !== 0) return null;
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= 100_000_000_00 ? cents : null;
}

/** "450.50", "1.250", "1250": how a price is shown back in a form field, in its currency's digits. */
export function priceInput(cents: number | null | undefined, currency?: string | null): string {
  if (cents === null || cents === undefined) return "";
  return centsToDecimal(cents, currency);
}
