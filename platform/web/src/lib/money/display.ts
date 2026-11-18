import { formatCents, centsToDecimal } from "../catalog/money";
import type { CatalogSettings } from "../data/types";
import { currencyCodeOf, isCurrencyCode } from "./currencies";
import { convertCents, rateBetween, type Rates } from "./rates";

/**
 * 135.5 Prices in the customer's own currency on the hosted API. The app
 * asks for one with `?currency=USD` or the `X-Currency` header (the phone's
 * region by default, the customer's pick in the app); an app that asks for
 * none, or for the shop's own, gets the shop's prices only, as before 135.
 * Every price keeps its amount in the shop's currency and adds `display`:
 * the same price in the customer's, at the day's rate, with the rate and
 * its date. Only what Yallapp sells itself (the dashboard's shop, menu,
 * courses, events and bookings), never a connected platform's prices.
 */

/** What the request asked for: a valid ISO code, or null. */
export function requestedCurrency(query: URLSearchParams | null | undefined, headers: Headers | null | undefined): string | null {
  return currencyCodeOf(query?.get("currency")) ?? currencyCodeOf(headers?.get("x-currency"));
}

/**
 * 149 The app's rule for customers' currencies (the owner's, per app):
 * whether prices show in the customer's currency at all, and in which
 * (empty: any with a rate). The shop's own is always allowed.
 */
export interface CustomerCurrencyRule {
  enabled: boolean;
  currencies: string[];
}

/** 149 The rule saved with the app's catalog settings; missing (every app before 149, an app without a shop): on, any currency. */
export function customerCurrencyRule(settings: Pick<CatalogSettings, "showInCustomerCurrency" | "customerCurrencies"> | null | undefined): CustomerCurrencyRule {
  const currencies = [...new Set((settings?.customerCurrencies ?? []).filter(isCurrencyCode))];
  return { enabled: settings?.showInCustomerCurrency !== false, currencies };
}

/** 149 Whether prices may show (and be charged) in `code`: the switch on, and any currency or one of the list; the shop's own always. */
export function customerCurrencyAllowed(rule: CustomerCurrencyRule, code: string, shop?: string | null): boolean {
  if (shop && code === shop) return true;
  return rule.enabled && (rule.currencies.length === 0 || rule.currencies.includes(code));
}

/** 149 `Config.customer_currency`: the rule, for the app (older apps rely on the server's answers alone). */
export function customerCurrencyConfigJson(rule: CustomerCurrencyRule) {
  return { enabled: rule.enabled, currencies: rule.enabled ? rule.currencies : [] };
}

/** The customer's currency for a request, with the rates in use. */
export interface DisplayCurrency {
  currency: string;
  rates: Rates;
}

/** `display` on a price: the shop's amount in the customer's currency. */
export interface DisplayMoneyJson {
  currency: string;
  amount: string;
  formatted: string;
  /** Units of the customer's currency for one of the shop's. */
  rate: number;
  rate_date: string | null;
}

/**
 * Converts the shop's prices for one request: null when the customer asked
 * for nothing, for the shop's own currency, or for one without a rate (the
 * app then shows the shop's prices only).
 */
export class Shown {
  private constructor(
    readonly base: string,
    readonly currency: string,
    readonly rate: number,
    readonly rateDate: string | null,
  ) {}

  static for(base: string, display: DisplayCurrency | null | undefined): Shown | null {
    if (!display || display.currency === base) return null;
    const rate = rateBetween(display.rates, base, display.currency);
    if (!rate) return null;
    return new Shown(base, display.currency, rate, display.rates.date);
  }

  /** 161 At a rate kept with something (an order's, on the day it was placed). */
  static at(base: string, currency: string, rate: number, rateDate: string | null): Shown | null {
    if (currency === base || !(rate > 0)) return null;
    return new Shown(base, currency, rate, rateDate);
  }

  /** The shop's cents in the customer's currency, rounded to its digits. */
  cents(cents: number): number {
    return convertCents(cents, this.rate, this.currency);
  }

  /** "$12.40" for 600.00 EGP. */
  formatted(cents: number): string {
    return formatCents(this.cents(cents), this.currency);
  }

  json(cents: number): DisplayMoneyJson {
    const converted = this.cents(cents);
    return { currency: this.currency, amount: centsToDecimal(converted, this.currency), formatted: formatCents(converted, this.currency), rate: this.rate, rate_date: this.rateDate };
  }
}

/** `display` for a price, or null (no conversion asked or possible). */
export function displayJson(shown: Shown | null, cents: number | null | undefined): DisplayMoneyJson | null {
  return shown && typeof cents === "number" ? shown.json(cents) : null;
}

/** 135.5 The connectors whose prices Yallapp sets itself (the dashboard's shop, bookings, courses, events, menus); a connected platform's never. */
// 180.12 travel; 180.13 listings and donations too.
export const DISPLAY_CONNECTORS: ReadonlySet<string> = new Set(["catalog", "bookings", "courses", "events", "restaurants", "travel", "listings", "campaigns"]);

const DECIMAL = /^\d{1,13}(?:\.\d{1,3})?$/;

/** Cents from an API amount ("1234.50", "1.250", "1250"). */
const centsOf = (amount: string) => Math.round(Number(amount) * 100);

/** The formatted key that goes with an amount key in a money object: amount→formatted, subtotal_amount→subtotal, total→total_formatted. */
function formattedKey(object: Record<string, unknown>, key: string): string | null {
  const candidates = key === "amount" ? ["formatted"] : key.endsWith("_amount") ? [`${key.slice(0, -7)}_formatted`, key.slice(0, -7)] : [`${key}_formatted`];
  return candidates.find((k) => typeof object[k] === "string" && !DECIMAL.test(object[k] as string)) ?? null;
}

/**
 * Adds `display` to every money object in a body: an object with an ISO
 * `currency` and amounts each paired with its formatted text (a price's
 * `amount` and `formatted`, a cart's `total_amount` and `total`, a food
 * cart's `total` and `total_formatted`). `display` holds the same keys in
 * the customer's currency, with the rate and its date. An object that
 * already has `display` (an order: its rate on the day it was placed) is
 * left as it is. Changes `body` in place and returns it.
 */
export function addDisplayPrices<T>(body: T, display: DisplayCurrency | null | undefined): T {
  if (!display) return body;
  const cache = new Map<string, Shown | null>();
  return addDisplayPricesWith(body, (base) => {
    if (!cache.has(base)) cache.set(base, Shown.for(base, display));
    return cache.get(base)!;
  });
}

/**
 * 161 [addDisplayPrices] with the conversion given: `shownFor` the
 * currency of a money object (null: left as it is). An order's lines at the
 * order's own rate, for one (lib/hosted/connectors/catalog.ts).
 */
export function addDisplayPricesWith<T>(body: T, shownFor: (base: string) => Shown | null): T {
  const visit = (value: unknown, depth: number) => {
    if (depth > 12 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    const object = value as Record<string, unknown>;
    for (const child of Object.values(object)) visit(child, depth + 1);
    const base = currencyCodeOf(object.currency);
    if (!base || base !== object.currency || "display" in object) return;
    const shown = shownFor(base);
    if (!shown) return;
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(object)) {
      if (typeof raw !== "string" || !DECIMAL.test(raw)) continue;
      const text = formattedKey(object, key);
      if (!text) continue;
      const cents = shown.cents(centsOf(raw));
      out[key] = centsToDecimal(cents, shown.currency);
      out[text] = formatCents(cents, shown.currency);
    }
    if (Object.keys(out).length === 0) return;
    // A range of prices ("E£100 – E£200"): both ends.
    if (object.range === true && typeof object.max_amount === "string" && DECIMAL.test(object.max_amount) && typeof out.formatted === "string") {
      const high = shown.cents(centsOf(object.max_amount));
      out.max_amount = centsToDecimal(high, shown.currency);
      out.formatted = `${out.formatted} – ${formatCents(high, shown.currency)}`;
    }
    object.display = { currency: shown.currency, ...out, rate: shown.rate, rate_date: shown.rateDate };
  };
  visit(body, 0);
  return body;
}
