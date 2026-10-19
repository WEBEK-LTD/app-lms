import type { PaymentProviderId, PlanPayment } from "../data/types";

/**
 * 52 Yallapp's own prices: the plans clients pay Yallapp for, and any
 * add-on (anything sold with a `YallappPrice`). One place for the money
 * rules, so every page, payment and receipt agrees:
 *
 * - The team sets each price in Egyptian pounds: the amount charged.
 * - People in Egypt see pounds; everyone else sees US dollars. The dollar
 *   price is the team's own figure, or the pounds at the team's exchange
 *   rate, rounded to whole dollars.
 * - Everyone is charged in pounds through Kashier (or Fawaterk). Only if
 *   the team chooses iyzico for Yallapp's payments, which takes no pounds,
 *   is the dollar price charged.
 *
 * Not for what app owners sell to their own customers: their apps keep
 * their own currency settings.
 */

/** What a visitor sees prices in. */
export type DisplayCurrency = "EGP" | "USD";

/** The currency the team sets prices in, and what Kashier charges. */
export const PRICE_CURRENCY = "EGP" as const;

export interface Money {
  cents: number;
  currency: DisplayCurrency;
}

/** A price as the team set it. */
export interface YallappPrice {
  /** What is charged, in piastres (EGP cents). */
  egpCents: number;
  /** The dollar price shown outside Egypt, entered by hand; null: the pounds at the exchange rate. */
  usdCents: number | null;
}

/** Egypt sees pounds; every other country, and an unknown one, sees dollars. */
export function displayCurrencyFor(country: string | null | undefined): DisplayCurrency {
  return country?.trim().toUpperCase() === "EG" ? "EGP" : "USD";
}

/**
 * The dollar price: the team's own, or the pounds at `egpPerUsd` (pounds for
 * one dollar) rounded to whole dollars, never under $1. Null when neither
 * is set.
 */
export function usdCentsOf(price: YallappPrice, egpPerUsd: number | null | undefined): number | null {
  if (price.usdCents !== null) return price.usdCents;
  if (!egpPerUsd || !Number.isFinite(egpPerUsd) || egpPerUsd <= 0) return null;
  return Math.max(100, Math.round(price.egpCents / egpPerUsd / 100) * 100);
}

/** The price in the visitor's currency; pounds when there's no dollar price yet. */
export function shownPrice(price: YallappPrice, display: DisplayCurrency, egpPerUsd: number | null | undefined): Money {
  if (display === "USD") {
    const usd = usdCentsOf(price, egpPerUsd);
    if (usd !== null) return { cents: usd, currency: "USD" };
  }
  return { cents: price.egpCents, currency: "EGP" };
}

/** What each of Yallapp's gateways charges in: pounds, except iyzico (no pounds), which takes dollars. */
export function chargeCurrencyFor(provider: PaymentProviderId): DisplayCurrency {
  return provider === "iyzico" ? "USD" : "EGP";
}

/** What is charged with this gateway; null when it charges dollars and there's no dollar price. */
export function chargedPrice(price: YallappPrice, provider: PaymentProviderId, egpPerUsd: number | null | undefined): Money | null {
  if (chargeCurrencyFor(provider) === "EGP") return { cents: price.egpCents, currency: "EGP" };
  const usd = usdCentsOf(price, egpPerUsd);
  return usd === null ? null : { cents: usd, currency: "USD" };
}

/**
 * The shown price after a coupon lowered the charged one from `chargedFull`
 * to `chargedNow`: in the same proportion, to the cent (the charged amount
 * itself when both are in one currency).
 */
export function lowerShown(shownFull: Money, chargedFull: Money, chargedNow: number): Money {
  if (shownFull.currency === chargedFull.currency) return { cents: chargedNow, currency: shownFull.currency };
  if (chargedFull.cents <= 0) return shownFull;
  return { cents: Math.round((shownFull.cents * chargedNow) / chargedFull.cents), currency: shownFull.currency };
}

const formatters = new Map<string, Intl.NumberFormat>();

/** "EGP 1,500" or "$29"; with piastres or cents only when there are some ("EGP 1,499.50", "$23.20"). */
export function formatMoney(money: Money): string {
  const whole = money.cents % 100 === 0;
  const key = `${money.currency}:${whole}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currency,
      // The site is English: pounds as "EGP 1,500"; "ج.م" is for Arabic pages only.
      currencyDisplay: money.currency === "EGP" ? "code" : "narrowSymbol",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(money.cents / 100);
}

/** A stored amount of Yallapp's (a plan payment, a coupon's use): "EGP 1,500" or "$29"; older amounts in other currencies as the catalog writes them ("₺4,800.00"). */
export function formatAmount(cents: number, currency: string): string {
  if (currency === "EGP" || currency === "USD") return formatMoney({ cents, currency });
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * The line on the payment form when the charge isn't in the shown currency:
 * "You'll be charged EGP 1,500 (about $30); your bank may convert it." Null
 * when they're the same.
 */
export function chargeLine(charged: Money, shown: Money): string | null {
  if (charged.currency === shown.currency) return null;
  return `You'll be charged ${formatMoney(charged)} (about ${formatMoney(shown)}); your bank may convert it.`;
}

/** 52 What a client sees and pays for one item: the shown price, the charge, and the line between them when they differ. */
export interface Offer {
  shown: Money;
  charged: Money;
  line: string | null;
}

/** The offer for a price with this gateway; null when the gateway can't charge it (iyzico without a dollar price). */
export function offerFor(price: YallappPrice, display: DisplayCurrency, provider: PaymentProviderId, egpPerUsd: number | null | undefined): Offer | null {
  const charged = chargedPrice(price, provider, egpPerUsd);
  if (!charged) return null;
  const shown = shownPrice(price, display, egpPerUsd);
  return { shown, charged, line: chargeLine(charged, shown) };
}

/** The offer after a coupon lowered the charge to `chargedNow`. */
export function loweredOffer(offer: Offer, chargedNow: number): Offer {
  const charged = { cents: chargedNow, currency: offer.charged.currency };
  const shown = lowerShown(offer.shown, offer.charged, chargedNow);
  return { shown, charged, line: chargeLine(charged, shown) };
}

/** 51 An offer for several months of a monthly price (a storage pack until the plan's period ends): the shown and the charged price each times `months`. */
export function timesOffer(offer: Offer, months: number): Offer {
  const charged = { cents: offer.charged.cents * months, currency: offer.charged.currency };
  const shown = { cents: offer.shown.cents * months, currency: offer.shown.currency };
  return { shown, charged, line: chargeLine(charged, shown) };
}

/**
 * 51 Items paid together (a plan and the storage packs renewed with it):
 * the charges add up (one gateway, one currency), and so do the shown
 * prices when they're all in one currency; otherwise the total shows as
 * charged.
 */
export function sumOffers(offers: Offer[]): Offer {
  const first = offers[0];
  if (!first) throw new Error("Nothing to add up");
  if (offers.some((o) => o.charged.currency !== first.charged.currency)) throw new Error("The items aren't charged in one currency");
  const charged = { cents: offers.reduce((sum, o) => sum + o.charged.cents, 0), currency: first.charged.currency };
  const shown = offers.every((o) => o.shown.currency === first.shown.currency)
    ? { cents: offers.reduce((sum, o) => sum + o.shown.cents, 0), currency: first.shown.currency }
    : charged;
  return { shown, charged, line: chargeLine(charged, shown) };
}

/** 52 The shown price, kept on a payment when it isn't in the charge's currency (the receipt shows it as "about"). */
export function shownOf(offer: Pick<Offer, "charged" | "shown">): Pick<PlanPayment, "shownCents" | "shownCurrency"> {
  return offer.shown.currency === offer.charged.currency ? { shownCents: null, shownCurrency: null } : { shownCents: offer.shown.cents, shownCurrency: offer.shown.currency };
}

/** The team's exchange rate as typed ("50.5"): pounds for one dollar, or null for none. Undefined when it isn't a rate. */
export function readRate(text: string): number | null | undefined {
  const value = text.trim().replace(/,/g, "");
  if (!value) return null;
  if (!/^\d{1,5}(\.\d{1,4})?$/.test(value)) return undefined;
  const rate = Number(value);
  return rate > 0 && rate <= 100_000 ? rate : undefined;
}
