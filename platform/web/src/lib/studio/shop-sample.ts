import { addDays, dayOf } from "../analytics/days";
import { DEFAULT_ZONE, zoneOfPhone } from "../analytics/zone";
import { countryOfPhone } from "../app/country-defaults";
import { catalogSettings } from "../catalog/settings";
import type { App } from "../data/types";
import { rateBetween, type Rates } from "../money/rates";
import { countryNames } from "../selling/countries";
import { STARTER_CITIES } from "../selling/shipping";
import type { ShopSample } from "./shop-sample-types";

/**
 * 175 Studio's samples drawn as the shop's own (report #6: the gift
 * checkout showed E£, "Tomorrow, 15 Nov" and Cairo in a Moroccan shop in
 * dirhams): its currency (the sample's pounds at the day's rate, when
 * there is one), tomorrow from today in the shop's time zone, and its
 * country and city (its first delivery area, else the owner's country and
 * its first city). Null for an app that doesn't sell from Yallapp.
 */
export function shopSampleOf(app: App | null, owner: { whatsapp?: string | null } | null, rates: Rates, now: Date): ShopSample | null {
  if (!app || app.connector?.kind !== "catalog") return null;
  const settings = catalogSettings(app);
  const zone = settings.delivery?.timezone ?? zoneOfPhone(owner?.whatsapp) ?? DEFAULT_ZONE;
  const area = settings.areas?.[0] ?? null;
  const country = area?.country ?? countryOfPhone(owner?.whatsapp);
  const typed = area?.cities?.[0] ?? null;
  const starter = country ? STARTER_CITIES[country]?.[0] : undefined;
  const city = typed ? { en: typed, ar: typed, tr: typed } : (starter ?? null);
  return {
    currency: settings.currency,
    rate: settings.currency === "EGP" ? 1 : rateBetween(rates, "EGP", settings.currency),
    country: country ? countryNames(country) : null,
    city,
    tomorrow: addDays(dayOf(now, zone), 1),
  };
}
