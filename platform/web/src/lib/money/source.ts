/**
 * 133.6 Where the day's rates come from (lib/money/rates.ts reads them):
 * ExchangeRate-API's open access endpoint, and the attribution its terms
 * ask for where the rates are shown. A module of its own so pages and
 * client components can show it without the server code.
 */
export const RATES_SOURCE_URL = "https://open.er-api.com/v6/latest/USD";
export const RATES_SOURCE = "ExchangeRate-API";
export const RATES_ATTRIBUTION = { text: "Rates By Exchange Rate API", href: "https://www.exchangerate-api.com" } as const;
