import type { PeriodKey } from "./periods";

/**
 * 133 Suggested prices. The owner asked for prices to start from ("put
 * prices in yourself, I'll edit them"), so a billing period the team hasn't
 * priced gets one worked out from the plan's own prices, never a fixed
 * number:
 *
 * - Y, a year: the plan's 1-year price, else its 1-month price × 12 × 0.8;
 * - M, a month: the plan's 1-month price, else Y / 12 × 1.25;
 * - 1 month: M; 1 year: Y;
 * - 6 months: M × 6 × 0.9, and never more than Y × 0.6;
 * - 2 years: Y × 2 × 0.85; 3 years: Y × 3 × 0.75;
 * - lifetime: Y × 4.
 *
 * Pounds are rounded to the nearest EGP 50, dollars to the nearest dollar.
 * Each currency is worked out from the plan's prices in that currency, so
 * a plan without its own dollar prices keeps showing its pounds at the
 * team's rate. Whatever the team types for a period always wins (Admin ›
 * Plans shows the suggestion prefilled, and saving keeps it as the team's).
 *
 * This file is shared with the admin's plan form, so it stays free of
 * anything server-side.
 */

/** The plan's own 1-month and 1-year prices in one currency (piastres or cents); null: none. */
export interface SuggestionBase {
  month: number | null;
  year: number | null;
}

/** What a suggestion is rounded to: EGP 50 and $1. */
export const SUGGESTION_STEP = { EGP: 5_000, USD: 100 } as const;

/** A price as a fraction, so the rounding is exact (a price of EGP 3,375 becomes 3,400, never 3,350). */
type Fraction = readonly [numerator: number, denominator: number];

const times = ([n, d]: Fraction, by: number, over: number): Fraction => [n * by, d * over];

/** The suggested price for a period, in the base's currency; null without a monthly or yearly price to work from. */
export function suggestedPrice(base: SuggestionBase, key: PeriodKey, currency: keyof typeof SUGGESTION_STEP): number | null {
  const month = base.month && base.month > 0 ? base.month : null;
  const year = base.year && base.year > 0 ? base.year : null;
  if (!month && !year) return null;
  // Y = 12 × 0.8 = 48/5 months; M = 1.25 / 12 = 5/48 of a year.
  const y: Fraction = year ? [year, 1] : times([month!, 1], 48, 5);
  const m: Fraction = month ? [month, 1] : times([year!, 1], 5, 48);
  let price: Fraction;
  if (key === "1") price = m;
  else if (key === "12") price = y;
  else if (key === "6") {
    // 6 × 0.9 = 27/5 months, at most 0.6 = 3/5 of a year.
    const six = times(m, 27, 5);
    const cap = times(y, 3, 5);
    price = six[0] * cap[1] <= cap[0] * six[1] ? six : cap;
  } else if (key === "24") price = times(y, 17, 10);
  else if (key === "36") price = times(y, 9, 4);
  else price = times(y, 4, 1);
  const step = SUGGESTION_STEP[currency];
  const rounded = Math.round(price[0] / (price[1] * step)) * step;
  return rounded > 0 ? rounded : null;
}
