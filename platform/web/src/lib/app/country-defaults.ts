import { DEFAULT_ZONE, zoneOfPhone } from "../analytics/zone";
import { DEFAULT_CATALOG_SETTINGS, type CatalogCurrency, type CatalogSettings } from "../data/types";
import { DEFAULT_DELIVERY } from "../selling/delivery";

/**
 * 175 A new shop's starting point from where its owner is (report #7: a
 * Moroccan shop started in liras, on Istanbul's time, with Istanbul's
 * coordinates in the map's hint): the currency and the delivery time zone
 * of the owner's country, from their WhatsApp number's calling code (the
 * zones of lib/analytics/zone.ts), else the template's, else the platform's
 * (TRY, Europe/Istanbul). Only for a shop that has saved nothing: an
 * existing shop keeps what it saved. The sign-in country code is Phase 160's.
 */

/** The currency of each calling code's country (the countries of zone.ts). */
const CURRENCY_BY_CALLING_CODE: [string, CatalogCurrency][] = [
  ["+966", "SAR"],
  ["+971", "AED"],
  ["+974", "QAR"],
  ["+965", "KWD"],
  ["+973", "BHD"],
  ["+968", "OMR"],
  ["+962", "JOD"],
  ["+964", "IQD"],
  ["+212", "MAD"],
  ["+213", "DZD"],
  ["+216", "TND"],
  ["+218", "LYD"],
  ["+20", "EGP"],
  ["+90", "TRY"],
  ["+44", "GBP"],
  ["+49", "EUR"],
  ["+33", "EUR"],
  ["+31", "EUR"],
];

/** The ISO country of each calling code. */
const COUNTRY_BY_CALLING_CODE: [string, string][] = [
  ["+966", "SA"],
  ["+971", "AE"],
  ["+974", "QA"],
  ["+965", "KW"],
  ["+973", "BH"],
  ["+968", "OM"],
  ["+962", "JO"],
  ["+964", "IQ"],
  ["+212", "MA"],
  ["+213", "DZ"],
  ["+216", "TN"],
  ["+218", "LY"],
  ["+20", "EG"],
  ["+90", "TR"],
  ["+44", "GB"],
  ["+49", "DE"],
  ["+33", "FR"],
  ["+31", "NL"],
];

/** The account's country (ISO 3166-1 alpha-2), from its WhatsApp number; null when unknown. */
export function countryOfPhone(phone: string | null | undefined): string | null {
  const digits = `+${(phone ?? "").replace(/\D+/g, "")}`;
  return COUNTRY_BY_CALLING_CODE.find(([code]) => digits.startsWith(code))?.[1] ?? null;
}

/** The currency of the account's country, from its WhatsApp number; null when unknown. */
export function currencyOfPhone(phone: string | null | undefined): CatalogCurrency | null {
  const digits = `+${(phone ?? "").replace(/\D+/g, "")}`;
  return CURRENCY_BY_CALLING_CODE.find(([code]) => digits.startsWith(code))?.[1] ?? null;
}

/** What a template starts in when the owner's country says nothing (the Studio demos sell in pounds, in Cairo). */
export interface TemplateMoney {
  currency: CatalogCurrency;
  zone: string;
}

export const DEMO_TEMPLATE_MONEY: TemplateMoney = { currency: "EGP", zone: "Africa/Cairo" };

/** A new shop's catalog settings: the owner's country's currency and delivery time zone, else the template's, else the platform's. */
export function startingCatalogSettings(owner: { whatsapp?: string | null } | null | undefined, template?: TemplateMoney | null): CatalogSettings {
  const currency = currencyOfPhone(owner?.whatsapp) ?? template?.currency ?? DEFAULT_CATALOG_SETTINGS.currency;
  const zone = zoneOfPhone(owner?.whatsapp) ?? template?.zone ?? DEFAULT_ZONE;
  return { ...DEFAULT_CATALOG_SETTINGS, currency, delivery: { ...DEFAULT_DELIVERY, timezone: zone } };
}

/** A point in each zone's main city, for the "like 33.5731 and -7.5898" of the map's fields. */
const POINT_BY_ZONE: Record<string, [string, string]> = {
  "Europe/Istanbul": ["41.0369", "28.9850"],
  "Africa/Casablanca": ["33.5731", "-7.5898"],
  "Africa/Cairo": ["30.0444", "31.2357"],
  "Asia/Riyadh": ["24.7136", "46.6753"],
  "Asia/Dubai": ["25.2048", "55.2708"],
  "Asia/Qatar": ["25.2854", "51.5310"],
  "Asia/Kuwait": ["29.3759", "47.9774"],
  "Asia/Bahrain": ["26.2285", "50.5860"],
  "Asia/Muscat": ["23.5880", "58.3829"],
  "Asia/Amman": ["31.9539", "35.9106"],
  "Asia/Beirut": ["33.8938", "35.5018"],
  "Asia/Baghdad": ["33.3152", "44.3661"],
  "Africa/Algiers": ["36.7538", "3.0588"],
  "Africa/Tunis": ["36.8065", "10.1815"],
  "Africa/Tripoli": ["32.8872", "13.1913"],
  "Europe/London": ["51.5072", "-0.1276"],
  "Europe/Berlin": ["52.5200", "13.4050"],
  "Europe/Paris": ["48.8566", "2.3522"],
  "Europe/Amsterdam": ["52.3676", "4.9041"],
};

/** The map hint's example point for the shop's time zone (Istanbul's when it has none of these). */
export function hintPointOf(zone: string | null | undefined): { lat: string; lng: string } {
  const [lat, lng] = POINT_BY_ZONE[zone ?? ""] ?? POINT_BY_ZONE[DEFAULT_ZONE]!;
  return { lat, lng };
}
