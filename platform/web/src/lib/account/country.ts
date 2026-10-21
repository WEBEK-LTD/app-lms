import { getCountries } from "libphonenumber-js";
import type { Lang } from "@/i18n/config";

/**
 * 73 The account's country (52.9): `clients.country`, saved from the
 * request at sign-up since Phase 52. Clients who signed up before have none
 * (their prices followed the request's country), and nobody could change it:
 * the owner now sets it on Dashboard › Your account, and our team on the
 * client's page. It decides the currency Yallapp's prices are shown in
 * (pounds in Egypt, dollars elsewhere: lib/billing/display.ts), the WhatsApp
 * number shown (72, lib/contact.ts) and, without an app's own time zone, the
 * time zone of the receipts (71). Countries are ISO 3166-1 alpha-2 codes, named
 * in the page's language by the browser's and Node's own data (Intl.DisplayNames).
 */

const CODES: readonly string[] = getCountries()
  .map((c) => String(c))
  .filter((c) => /^[A-Z]{2}$/.test(c));

/** A country code we know, upper case, or null. */
export function parseCountry(value: unknown): string | null {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return CODES.includes(code) ? code : null;
}

/** The country's name in `lang` ("Egypt", "مصر", "Mısır"); the code itself when unknown. */
export function countryName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every country, sorted by its name in `lang`. */
export function countryOptions(lang: Lang): { code: string; name: string }[] {
  const collator = new Intl.Collator(lang);
  return CODES.map((code) => ({ code, name: countryName(code, lang) })).sort((a, b) => collator.compare(a.name, b.name));
}

export const COUNTRY_MESSAGES = {
  saved: "Your country was saved.",
  invalid: "Choose a country from the list.",
  owner: "Only the owner of this business can change its country.",
} as const;
