/**
 * 135.1 Every active ISO 4217 currency an app can sell in, with its minor
 * units (how many digits after the point): the Japanese yen and the Korean
 * won have none, the Kuwaiti, Bahraini, Jordanian, Iraqi and Libyan dinars,
 * the Omani rial and the Tunisian dinar three, the rest two. Funds, metals
 * and test codes (BOV, XAU, XTS…) and withdrawn ones (HRK, BGN, ANG, SLL,
 * ZWL…) are left out. Names come from the browser's or the server's own
 * list in the dashboard's language (Intl.DisplayNames), so nothing here is
 * translated by hand.
 *
 * Amounts stay in hundredths of the unit everywhere ("cents"), whatever the
 * currency, so no column changes: a yen amount is a multiple of 100 (¥450
 * is 45000) and a dinar amount goes to the hundredth (1.250 KWD is 125),
 * shown with its three digits. lib/catalog/money.ts parses and formats them.
 */

/** Active ISO 4217 codes, A–Z. */
export const ISO_CURRENCIES: readonly string[] = (
  "AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK " +
  "DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS " +
  "KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD " +
  "OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP " +
  "TRY TTD TWD TZS UAH UGX USD UYU UZS VED VES VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG"
).split(" ");

const ISO_SET: ReadonlySet<string> = new Set(ISO_CURRENCIES);

/** ISO 4217's minor units of 0 (no fractions). */
const ZERO_DIGITS: ReadonlySet<string> = new Set(["BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]);
/** ISO 4217's minor units of 3 (thousandths: fils, baisa, millimes). */
const THREE_DIGITS: ReadonlySet<string> = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

/** 135.3 The ones most apps sell in, first in every list, in this order. */
export const PREFERRED_CURRENCIES = ["EGP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "TRY", "USD", "EUR", "GBP"] as const;

/** Whether `value` is one of the active ISO 4217 codes above ("KWD"; never "kwd" or "XAU"). */
export function isCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && ISO_SET.has(value);
}

/** The code typed or sent in any case ("kwd"), when it is one; null otherwise. */
export function currencyCodeOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return ISO_SET.has(code) ? code : null;
}

/** Digits after the point: 0 (JPY), 3 (KWD) or 2. */
export function currencyDigits(currency: string): 0 | 2 | 3 {
  const code = currency.toUpperCase();
  if (ZERO_DIGITS.has(code)) return 0;
  if (THREE_DIGITS.has(code)) return 3;
  return 2;
}

/** The smallest amount kept, in cents: 100 for a whole-unit currency (one yen), else 1. */
export function centsStep(currency: string): number {
  return currencyDigits(currency) === 0 ? 100 : 1;
}

/** Cents rounded to what the currency can hold (half up): whole yen for the yen. */
export function roundToCurrency(cents: number, currency: string): number {
  const step = centsStep(currency);
  return Math.round(cents / step) * step;
}

/**
 * Whole minor units (fils, yen) kept elsewhere (the marketplace, lib/market)
 * as our cents: a yen is 100, a fils a tenth of a cent (rounded half up).
 */
export function minorToCents(minor: number, decimals: number): number {
  return Math.round((minor * 100) / 10 ** decimals);
}

/** Dashboard languages that name currencies; others read the English names. */
type NameLocale = "en" | "ar" | "tr";

const names = new Map<string, Intl.DisplayNames | null>();
function displayNames(locale: string): Intl.DisplayNames | null {
  if (!names.has(locale)) {
    try {
      names.set(locale, new Intl.DisplayNames([locale], { type: "currency", fallback: "none" }));
    } catch {
      names.set(locale, null);
    }
  }
  return names.get(locale) ?? null;
}

/** "Kuwaiti Dinar", "دينار كويتي", "Kuveyt dinarı"; the English name where the language has none, else the code. */
export function currencyName(currency: string, locale: string = "en"): string {
  const name = displayNames(locale)?.of(currency) ?? displayNames("en")?.of(currency);
  return name && name !== currency ? name : currency;
}

const symbols = new Map<string, string>();
/** "$", "E£", "KWD", "د.ك.‏": the short sign the language writes; the code where it has none. */
export function currencySymbol(currency: string, locale: string = "en"): string {
  const key = `${locale}:${currency}`;
  let symbol = symbols.get(key);
  if (symbol === undefined) {
    try {
      const part = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency");
      symbol = part?.value.replace(/[‎‏؜]/g, "").trim() || currency;
    } catch {
      symbol = currency;
    }
    symbols.set(key, symbol);
  }
  return symbol;
}

export interface CurrencyOption {
  code: string;
  name: string;
  /** The short sign, or the code where it has none (then not shown twice). */
  symbol: string;
  /** One of PREFERRED_CURRENCIES. */
  usual: boolean;
}

const optionLists = new Map<string, CurrencyOption[]>();

/**
 * 135.3 Every currency for a picker in the dashboard's language: the usual
 * ones first in PREFERRED_CURRENCIES' order, then all the others A–Z by
 * their name in that language.
 */
export function currencyOptions(locale: NameLocale | string = "en"): CurrencyOption[] {
  const cached = optionLists.get(locale);
  if (cached) return cached;
  const option = (code: string, usual: boolean): CurrencyOption => ({ code, name: currencyName(code, locale), symbol: currencySymbol(code, locale), usual });
  const usual = PREFERRED_CURRENCIES.map((code) => option(code, true));
  const collator = new Intl.Collator(locale);
  const others = ISO_CURRENCIES.filter((code) => !(PREFERRED_CURRENCIES as readonly string[]).includes(code))
    .map((code) => option(code, false))
    .sort((a, b) => collator.compare(a.name, b.name) || a.code.localeCompare(b.code));
  const list = [...usual, ...others];
  optionLists.set(locale, list);
  return list;
}

/** Whether an option matches what was typed in the picker's search: its name, code or sign, any case. */
export function matchesCurrency(option: Pick<CurrencyOption, "code" | "name" | "symbol">, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  return option.code.toLowerCase().includes(q) || option.name.toLocaleLowerCase().includes(q) || option.symbol.toLocaleLowerCase() === q;
}
