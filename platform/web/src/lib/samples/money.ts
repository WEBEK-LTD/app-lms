/**
 * 110.2 Sample prices in the app's own currency. The sample content is
 * priced in Turkish lira or Egyptian pounds, as the demo apps are; a price
 * moves to another currency by the exchange rate and by what things cost
 * there (a café's coffee costs less in Cairo than in Dubai), then is rounded
 * the way a shop would write it.
 */

/** About how many of each currency a US dollar buys, and how much things cost there against the US (1). */
const CURRENCIES: Record<string, { perUsd: number; level: number }> = {
  USD: { perUsd: 1, level: 1 },
  EUR: { perUsd: 0.86, level: 0.95 },
  GBP: { perUsd: 0.75, level: 1 },
  TRY: { perUsd: 43, level: 0.55 },
  EGP: { perUsd: 50, level: 0.3 },
  SAR: { perUsd: 3.75, level: 0.9 },
  AED: { perUsd: 3.67, level: 1 },
  KWD: { perUsd: 0.31, level: 1 },
  QAR: { perUsd: 3.64, level: 1 },
  BHD: { perUsd: 0.38, level: 0.9 },
  OMR: { perUsd: 0.38, level: 0.85 },
  JOD: { perUsd: 0.71, level: 0.6 },
  MAD: { perUsd: 9.2, level: 0.45 },
};

/** A currency's figures; one Yallapp doesn't know is read as the US dollar. */
const figures = (currency: string) => CURRENCIES[currency.toUpperCase()] ?? CURRENCIES.USD!;

/** Rounded as a price list would have it: 0.05 under one, halves under 20, then whole numbers, fives, tens and three digits. */
export function roundPrice(units: number): number {
  if (units <= 0) return 0;
  const step = units < 1 ? 0.05 : units < 20 ? 0.5 : units < 100 ? 1 : units < 1000 ? 5 : units < 10_000 ? 10 : 10 ** (Math.floor(Math.log10(units)) - 2);
  return Math.max(step, Math.round(units / step) * step);
}

/** A sample price in cents of `from` as the same price, in cents, of `to`; 0 stays 0. */
export function samplePrice(cents: number, from: string, to: string): number {
  if (cents <= 0) return 0;
  if (from.toUpperCase() === to.toUpperCase()) return cents;
  const a = figures(from);
  const b = figures(to);
  const usd = cents / 100 / a.perUsd / a.level;
  return Math.round(roundPrice(usd * b.level * b.perUsd) * 100);
}
