import { getCountryCallingCode, isSupportedCountry } from "libphonenumber-js";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type HostedSettings } from "../data/types";
import { isMarketplaceApp } from "../market/plan";
import { marketSettingsOf } from "../market/settings";

/**
 * 160.8 The country code the app's sign-in shows first
 * (`Config.auth.default_country_code`), and the App sign-in form with it.
 *
 * Leqaa's tester: a shop selling in MAD that delivers only to Morocco opened
 * on +90, the platform's own default, because every settings save wrote the
 * defaults back (`withSettings`), and a code nobody chose looked like one.
 * In order:
 *
 * 1. The owner's choice: a code they typed on App sign-in › Phone and
 *    devices (`countryCodeChosen`). Saved before 160 without the flag, any
 *    code but the platform's default counts as chosen; the platform's own
 *    (+90) doesn't, so those apps get the better default by themselves.
 * 2. The shop's country: the first country it delivers to (Delivery &
 *    offers' areas, in the owner's order), else the country of its
 *    currency (MAD: Morocco), unless it's the platform's default currency
 *    or one many countries share (EUR, the X… codes). 177 An app that
 *    sells through the delivery settings instead of a catalog (a
 *    marketplace, food, delivery): a marketplace's country (Marketplace
 *    settings), else the country of the delivery settings' currency once
 *    the owner saved them. Zad's projects opened their sign-in on +90 in a
 *    marketplace in Egypt.
 * 3. The owner's own country (the account's, from sign-up and billing).
 * 4. The platform's default.
 */

/** The platform's own default, as before 160. */
export const PLATFORM_COUNTRY_CODE = DEFAULT_HOSTED_SETTINGS.defaultCountryCode;

export type CountryCodeSource = "chosen" | "shop" | "owner" | "platform";

/** A country's calling code (ISO 3166-1 alpha-2), like "+212" for MA; null for none. */
export function callingCodeOf(country: string | null | undefined): string | null {
  const iso = country?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(iso) || !isSupportedCountry(iso)) return null;
  return `+${getCountryCallingCode(iso)}`;
}

/** The country of a currency: its ISO 4217 code's first letters (MAD: MA); null for one many countries share. */
export function countryOfCurrency(currency: string | null | undefined): string | null {
  const code = currency?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{3}$/.test(code) || code === "EUR" || code.startsWith("X")) return null;
  const iso = code.slice(0, 2);
  return isSupportedCountry(iso) ? iso : null;
}

/** Whether the owner chose the app's country code themselves. */
export function countryCodeChosen(saved: Pick<HostedSettings, "defaultCountryCode" | "countryCodeChosen"> | null | undefined): boolean {
  if (!saved?.defaultCountryCode) return false;
  if (typeof saved.countryCodeChosen === "boolean") return saved.countryCodeChosen;
  return saved.defaultCountryCode !== PLATFORM_COUNTRY_CODE;
}

/** The shop's country code: where it delivers first, else its currency's country. */
export function shopCountryCode(app: Pick<App, "catalogSettings">): string | null {
  const catalog = app.catalogSettings;
  if (!catalog) return null;
  for (const area of catalog.areas ?? []) {
    const code = callingCodeOf(area.country);
    if (code) return code;
  }
  if (!catalog.currency || catalog.currency === DEFAULT_CATALOG_SETTINGS.currency) return null;
  return callingCodeOf(countryOfCurrency(catalog.currency));
}

/** 177 The country code of an app that sells through its delivery settings: a marketplace's country, else the saved settings' currency's. */
export function serviceCountryCode(app: Pick<App, "vertical" | "connector">, delivery: Pick<DeliverySettings, "currency" | "marketApp"> | null | undefined): string | null {
  if (!delivery) return null;
  if (isMarketplaceApp(app)) {
    const code = callingCodeOf(marketSettingsOf(delivery).country);
    if (code) return code;
  }
  return callingCodeOf(countryOfCurrency(delivery.currency));
}

/** What the app sells by, besides its catalog: its saved delivery settings (177). */
export type CountryCodeApp = Pick<App, "hostedSettings" | "catalogSettings"> & Partial<Pick<App, "vertical" | "connector">>;

/** The code the app's sign-in shows first, and where it comes from. */
export function appCountryCode(app: CountryCodeApp, ownerCountry?: string | null, delivery?: Pick<DeliverySettings, "currency" | "marketApp"> | null): { code: string; source: CountryCodeSource } {
  const saved = app.hostedSettings;
  if (saved && countryCodeChosen(saved)) return { code: saved.defaultCountryCode, source: "chosen" };
  return derivedCountryCode(app, ownerCountry, delivery);
}

/** The code the app would have without the owner's choice. */
export function derivedCountryCode(
  app: Pick<App, "catalogSettings"> & Partial<Pick<App, "vertical" | "connector">>,
  ownerCountry?: string | null,
  delivery?: Pick<DeliverySettings, "currency" | "marketApp"> | null,
): { code: string; source: Exclude<CountryCodeSource, "chosen"> } {
  const shop = shopCountryCode(app) ?? serviceCountryCode({ vertical: app.vertical ?? null, connector: app.connector ?? null }, delivery);
  if (shop) return { code: shop, source: "shop" };
  const owner = callingCodeOf(ownerCountry);
  if (owner) return { code: owner, source: "owner" };
  return { code: PLATFORM_COUNTRY_CODE, source: "platform" };
}

/**
 * 206.2 The country code a phone number typed without one belongs to: the
 * one the app's sign-in shows first (`appCountryCode`), so a courier,
 * teacher, driver, student or buyer typed as "0612 345 678" in a Moroccan
 * shop is +212, as they sign in, not the platform's +90. Where the owner's
 * country isn't known (the app's own connectors), the shop's country, then
 * the platform's.
 */
export function appPhoneCode(app: Pick<App, "hostedSettings" | "catalogSettings">, ownerCountry?: string | null): string {
  return appCountryCode(app, ownerCountry).code;
}
