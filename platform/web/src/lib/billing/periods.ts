import { formatMoney, type Money, type YallappPrice } from "./prices";

/**
 * 133 Billing periods of Yallapp's own plans and add-ons. Kashier takes no
 * subscriptions, so each period is paid once, in advance: 1, 6, 12, 24 or
 * 36 months, or once for life. The team switches each period on per plan
 * (and per add-on) and gives it its own price; a plan's period the team
 * hasn't priced has a suggested one, worked out from the plan's own prices
 * (suggested-prices.ts), and an add-on's period without a price is never
 * offered. The per-month equivalent and the saving are worked out from the
 * prices, never typed.
 *
 * A payment keeps its period in `PlanPayment.months`: the months, or 0 for
 * a lifetime payment (and an add-on's one-time payment).
 */

/** The periods, shortest first; "lifetime" is paid once and never ends. */
export const PERIOD_KEYS = ["1", "6", "12", "24", "36", "lifetime"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

/** A payment's months for a lifetime (or one-time) payment. */
export const LIFETIME_MONTHS = 0;

/** The months a payment can cover: 0 is a lifetime (or one-time) payment. */
export type PeriodMonths = 1 | 6 | 12 | 24 | 36 | 0;
export const PERIOD_MONTHS: readonly PeriodMonths[] = [1, 6, 12, 24, 36, 0];

/**
 * The end date a lifetime license or add-on is given. The database keeps
 * every end date as a date, so "for life" is a day no one will reach;
 * pages show it as "For life", never as the date.
 */
export const LIFETIME_END = new Date("2999-12-31T23:59:59.999Z");

/** Whether an end date is a lifetime's. */
export function isLifetimeEnd(date: Date | null | undefined): boolean {
  return Boolean(date && date.getUTCFullYear() >= 2900);
}

export function isPeriodKey(value: unknown): value is PeriodKey {
  return typeof value === "string" && (PERIOD_KEYS as readonly string[]).includes(value);
}

export function isPeriodMonths(value: unknown): value is PeriodMonths {
  return typeof value === "number" && (PERIOD_MONTHS as readonly number[]).includes(value);
}

/** The months a period covers; null for lifetime. */
export function monthsOfPeriod(key: PeriodKey): number | null {
  return key === "lifetime" ? null : Number(key);
}

/** A period's months as a payment keeps them (0: lifetime). */
export function paymentMonthsOf(key: PeriodKey): PeriodMonths {
  return key === "lifetime" ? LIFETIME_MONTHS : (Number(key) as PeriodMonths);
}

/** The period of a payment's months; null for months no period has (none are stored). */
export function periodOfMonths(months: number): PeriodKey | null {
  if (months === LIFETIME_MONTHS) return "lifetime";
  const key = String(months);
  return isPeriodKey(key) ? key : null;
}

/**
 * The new end date: `months` after the later of now and the current end
 * (a month after 31 January is the last day of February), at the end of
 * that day; for life with 0 months.
 */
export function periodEnd(currentEnd: Date | null, months: number, now: Date): Date {
  if (months === LIFETIME_MONTHS || isLifetimeEnd(currentEnd)) return new Date(LIFETIME_END);
  const base = new Date(Math.max(now.getTime(), currentEnd?.getTime() ?? 0));
  const end = new Date(base);
  end.setUTCMonth(end.getUTCMonth() + months);
  if (end.getUTCDate() !== base.getUTCDate()) end.setUTCDate(0);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

// The words, in English: the website, the admin and the receipts' rows.

const LABEL: Record<PeriodKey, string> = { "1": "1 month", "6": "6 months", "12": "1 year", "24": "2 years", "36": "3 years", lifetime: "Lifetime" };
/** What a price is "per": "EGP 1,500 / 6 months". */
const UNIT: Record<PeriodKey, string> = { "1": "month", "6": "6 months", "12": "year", "24": "2 years", "36": "3 years", lifetime: "lifetime" };

/** "1 month", "6 months", "1 year", "2 years", "3 years" or "Lifetime". */
export function periodLabel(key: PeriodKey): string {
  return LABEL[key];
}

/** "month", "6 months", "year", "2 years", "3 years" or "lifetime": what the price is for. */
export function periodUnit(key: PeriodKey): string {
  return UNIT[key];
}

/** A payment's period in words: "1 month" … "3 years", "Lifetime"; other months as "N months". */
export function monthsLabel(months: number): string {
  const key = periodOfMonths(months);
  return key ? LABEL[key] : `${months} months`;
}

// The maths: never typed in by the team, always worked out from its prices.

/** What a period's price comes to per month, to the cent; null for lifetime. */
export function perMonth(price: Money, key: PeriodKey): Money | null {
  const months = monthsOfPeriod(key);
  if (!months) return null;
  return { cents: Math.round(price.cents / months), currency: price.currency };
}

/**
 * The saving of a period against paying the reference month by month for
 * the same months, in whole percent (rounded down, so it never promises
 * more than it is); null when there's no saving, for lifetime, or when the
 * two aren't in one currency.
 */
export function savingPercent(price: Money, key: PeriodKey, reference: { price: Money; key: PeriodKey } | null): number | null {
  const months = monthsOfPeriod(key);
  if (!months || !reference || reference.key === key) return null;
  const refMonths = monthsOfPeriod(reference.key);
  if (!refMonths || reference.price.currency !== price.currency || reference.price.cents <= 0) return null;
  // The reference's price per month, times this period's months.
  const full = (reference.price.cents * months) / refMonths;
  if (full <= price.cents) return null;
  const percent = Math.floor(((full - price.cents) / full) * 100);
  return percent >= 1 ? percent : null;
}

/** One of a plan's (or an add-on's) periods: its key and price. */
export interface PricedPeriod {
  key: PeriodKey;
  price: YallappPrice;
}

/**
 * What a saving is counted against: the shortest period that isn't
 * lifetime (the monthly price when there is one). Null with a single
 * period, or only lifetime.
 */
export function savingReference<T extends { key: PeriodKey }>(periods: T[]): T | null {
  const timed = periods.filter((p) => p.key !== "lifetime").sort((a, b) => Number(a.key) - Number(b.key));
  return timed.length > 1 ? timed[0]! : null;
}

/** A period as a page shows it: the price, per month and the saving, in the visitor's currency. */
export interface ShownPeriod {
  key: PeriodKey;
  shown: Money;
  /** "EGP 1,500". */
  price: string;
  /** "EGP 250": the price per month; null for lifetime or a month. */
  perMonth: string | null;
  /** Whole percent saved against the shortest period; null without a saving. */
  saving: number | null;
}

/** The periods shown in one currency, with per month and the saving worked out. */
export function shownPeriods(periods: { key: PeriodKey; shown: Money }[]): ShownPeriod[] {
  const reference = savingReference(periods);
  return periods.map((p) => {
    const month = p.key === "1" ? null : perMonth(p.shown, p.key);
    return {
      key: p.key,
      shown: p.shown,
      price: formatMoney(p.shown),
      perMonth: month ? formatMoney(month) : null,
      saving: savingPercent(p.shown, p.key, reference ? { price: reference.shown, key: reference.key } : null),
    };
  });
}

/** Periods in their order, shortest first and lifetime last. */
export function sortPeriods<T extends { key: PeriodKey }>(periods: T[]): T[] {
  return [...periods].sort((a, b) => PERIOD_KEYS.indexOf(a.key) - PERIOD_KEYS.indexOf(b.key));
}
