import type { DataStore } from "../data/store";
import type { ExchangeRatesSetting, RateOverridesSetting } from "../data/types";
import { platformSetting } from "../settings/platform";
import { isCurrencyCode, roundToCurrency } from "./currencies";
import { RATES_SOURCE, RATES_SOURCE_URL } from "./source";

/**
 * 133.6 The day's exchange rates. The daily job (app/api/internal/daily)
 * reads them once a day from ExchangeRate-API's open access endpoint
 * (no key; about 160 currencies, every Arab and Gulf one among them;
 * updated once a day; caching and commercial conversion allowed, with
 * "Rates By Exchange Rate API" shown where the rates are used, and no
 * re-distribution of the table: components/rates-attribution.tsx). They are kept
 * in the platform settings with their date (`exchangeRates`); a failed
 * read keeps the last good rates and says when it failed. Requests never
 * fetch them: the hosted API reads the saved table (cached 30 seconds,
 * lib/settings/platform.ts). The team's overrides (Admin › Settings ›
 * Currencies, `rateOverrides`) replace a currency's rate until removed.
 *
 * Every rate is units of that currency for one US dollar, as the source
 * gives them; converting EGP to KWD goes through the dollar.
 */

export { RATES_ATTRIBUTION, RATES_SOURCE, RATES_SOURCE_URL } from "./source";

/** The source's address; EXCHANGE_RATES_URL (local tests: a fake server) replaces it. */
function sourceUrl(): string {
  const url = process.env.EXCHANGE_RATES_URL?.trim();
  if (url && process.env.NETLIFY === "true" && !url.startsWith("https://")) throw new Error("EXCHANGE_RATES_URL must be https on Netlify.");
  return url || RATES_SOURCE_URL;
}

export interface FetchedRates {
  rates: Record<string, number>;
  /** The source's day, "2026-11-16" (UTC). */
  date: string;
}

/** Reads the table from the source: units per dollar for every ISO currency it has. Throws with a short reason. */
export async function fetchRates(fetcher: typeof fetch = fetch, url = sourceUrl()): Promise<FetchedRates> {
  let response: Response;
  try {
    response = await fetcher(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new Error("The rates' source can't be reached.");
  }
  if (!response.ok) throw new Error(`The rates' source answered HTTP ${response.status}.`);
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error("The rates' source didn't answer JSON.");
  }
  const body = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  if (body.result !== "success" || body.base_code !== "USD" || !body.rates || typeof body.rates !== "object") {
    throw new Error(`The rates' source refused: ${typeof body["error-type"] === "string" ? body["error-type"] : "no rates"}.`);
  }
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(body.rates as Record<string, unknown>)) {
    if (isCurrencyCode(code) && typeof value === "number" && Number.isFinite(value) && value > 0) rates[code] = value;
  }
  rates.USD = 1;
  if (Object.keys(rates).length < 20) throw new Error("The rates' source sent too few currencies.");
  const unix = typeof body.time_last_update_unix === "number" ? body.time_last_update_unix : null;
  const date = (unix ? new Date(unix * 1000) : new Date()).toISOString().slice(0, 10);
  return { rates, date };
}

export interface RefreshResult {
  ok: boolean;
  /** The saved table's day after this run (the last good one when it failed); null: none yet. */
  date: string | null;
  currencies: number;
  error?: string;
}

/**
 * Reads the day's rates and saves them; on failure the last good table
 * stays, with the failure noted. The daily job and Admin's "Refresh now".
 */
export async function refreshRates(deps: { store: DataStore; now: Date; fetcher?: typeof fetch; by?: string }): Promise<RefreshResult> {
  const saved = (await platformSetting(deps.store, "exchangeRates", { fresh: true }))?.value ?? null;
  try {
    const fetched = await fetchRates(deps.fetcher);
    const value: ExchangeRatesSetting = { rates: fetched.rates, date: fetched.date, fetchedAt: deps.now.toISOString(), source: RATES_SOURCE, failedAt: null, failure: null };
    await deps.store.setPlatformSetting("exchangeRates", value, deps.by ?? "daily job", deps.now);
    return { ok: true, date: value.date, currencies: Object.keys(value.rates).length };
  } catch (e) {
    const failure = e instanceof Error ? e.message : String(e);
    if (saved) await deps.store.setPlatformSetting("exchangeRates", { ...saved, failedAt: deps.now.toISOString(), failure }, deps.by ?? "daily job", deps.now);
    return { ok: false, date: saved?.date ?? null, currencies: saved ? Object.keys(saved.rates).length : 0, error: failure };
  }
}

/** The rates in use: the day's table with the team's overrides on top. */
export interface Rates {
  /** Units per dollar. */
  perDollar: Record<string, number>;
  /** The table's day; an override doesn't change it. */
  date: string | null;
  /** The codes the team set by hand. */
  overridden: string[];
}

export function ratesOf(table: ExchangeRatesSetting | null, overrides: RateOverridesSetting | null): Rates {
  const perDollar: Record<string, number> = { ...(table?.rates ?? {}) };
  const overridden: string[] = [];
  for (const [code, value] of Object.entries(overrides?.rates ?? {})) {
    if (isCurrencyCode(code) && code !== "USD" && Number.isFinite(value) && value > 0) {
      perDollar[code] = value;
      overridden.push(code);
    }
  }
  // The dollar is the table's unit.
  if (Object.keys(perDollar).length) perDollar.USD = 1;
  return { perDollar, date: table?.date ?? null, overridden };
}

/** The saved rates with the overrides (cached 30 seconds, never fetched here). */
export async function currentRates(store: DataStore): Promise<Rates> {
  const [table, overrides] = await Promise.all([platformSetting(store, "exchangeRates"), platformSetting(store, "rateOverrides")]);
  return ratesOf(table?.value ?? null, overrides?.value ?? null);
}

/** Units of `to` for one unit of `from`; null when either has no rate. */
export function rateBetween(rates: Rates, from: string, to: string): number | null {
  if (from === to) return 1;
  const a = rates.perDollar[from];
  const b = rates.perDollar[to];
  if (!a || !b) return null;
  return b / a;
}

/** Cents of `from` as cents of `to` at `rate`, rounded to what `to` holds (whole yen). */
export function convertCents(cents: number, rate: number, to: string): number {
  return roundToCurrency(Math.round(cents * rate), to);
}

/** "1 EGP = 0.0206 USD": a rate with enough digits to read (4 significant). */
export function rateText(rate: number, from: string, to: string): string {
  const digits = rate >= 100 ? 2 : rate >= 1 ? 4 : Math.min(8, 3 - Math.floor(Math.log10(rate)));
  return `1 ${from} = ${rate.toFixed(digits)} ${to}`;
}
