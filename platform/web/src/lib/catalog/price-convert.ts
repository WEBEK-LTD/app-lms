import { currencyDigits } from "../money/currencies";

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
