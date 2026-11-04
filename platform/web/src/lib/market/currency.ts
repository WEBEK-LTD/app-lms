/**
 * 115.4 Money in any currency. Amounts are kept as whole minor units (cents,
 * piastres, fils) so sums never drift; each currency has its own number of
 * decimals (ISO 4217: 2 for EGP and TRY, 0 for JPY and KRW, 3 for KWD, BHD,
 * OMR, JOD, TND and LYD), read from the platform's Intl data so every
 * currency works, not only those Yallapp knew of.
 */

/** Currencies whose ISO 4217 minor units differ from what some Intl builds report. */
const DECIMALS_OVERRIDE: Record<string, number> = { KWD: 3, BHD: 3, OMR: 3, JOD: 3, TND: 3, LYD: 3, IQD: 3, JPY: 0, KRW: 0, CLP: 0, ISK: 0, VND: 0, UGX: 0, XAF: 0, XOF: 0, PYG: 0, RWF: 0, KMF: 0, GNF: 0, DJF: 0, VUV: 0, XPF: 0 };

/** Whether `code` is a currency the platform can format (three capital letters Intl knows). */
export function isCurrencyCode(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

/** The currency's minor units: 2 unless it has another number. */
export function currencyDecimals(code: string): number {
  if (code in DECIMALS_OVERRIDE) return DECIMALS_OVERRIDE[code]!;
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
    return typeof digits === "number" ? Math.min(3, Math.max(0, digits)) : 2;
  } catch {
    return 2;
  }
}

/** "125.5" or "125.50" to 12550 minor units at 2 decimals; null for anything that isn't a plain amount. */
export function toMinor(text: string, decimals: number): number | null {
  const value = text.trim().replace(/,/g, "");
  const match = /^(-)?(\d{1,13})(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const fraction = match[3] ?? "";
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) return null;
  const minor = Number(match[2]!) * 10 ** decimals + Number((fraction + "000").slice(0, decimals) || "0");
  return match[1] ? -minor : minor;
}

/** 12550 at 2 decimals to "125.50"; -500 to "-5.00"; 3 decimals "1.250". */
export function fromMinor(minor: number, decimals: number): string {
  if (!Number.isSafeInteger(minor)) throw new RangeError(`Not a whole amount: ${minor}`);
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  if (decimals === 0) return `${sign}${abs}`;
  const unit = 10 ** decimals;
  return `${sign}${Math.floor(abs / unit)}.${String(abs % unit).padStart(decimals, "0")}`;
}

/** "EGP 125.50" in the page's language, the currency's own decimals always written. */
export function formatMinor(minor: number, currency: string, locale = "en"): string {
  const decimals = currencyDecimals(currency);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code", minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      .format(minor / 10 ** decimals)
      .replace(/ /g, " ");
  } catch {
    return `${currency} ${fromMinor(minor, decimals)}`;
  }
}

/** A percentage of an amount, rounded half away from zero to a whole minor unit. Percent may have decimals (12.5). */
export function percentOf(minor: number, percent: number): number {
  const exact = (minor * percent) / 100;
  return Math.sign(exact) * Math.round(Math.abs(exact) + 1e-9);
}

/**
 * Splits `total` across `weights` in proportion, in whole minor units that
 * always add up to `total` (largest remainders get the leftover units).
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (sum === 0) return weights.map((_, i) => (i === 0 ? total : 0));
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const exact = weights.map((w) => (abs * w) / sum);
  const out = exact.map((x) => Math.floor(x + 1e-9));
  let left = abs - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x + 1e-9) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) {
    const j = order[k]!.i;
    out[j] = (out[j] ?? 0) + 1;
  }
  return out.map((x) => x * sign);
}
