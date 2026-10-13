import type { App, ListingAreaUnit, ListingSettings } from "../data/types";

/** The property types an office can pick, in the order the dashboard and the app's filters show them. */
export const PROPERTY_TYPES = [
  { key: "apartment", label: "Apartment" },
  { key: "villa", label: "Villa" },
  { key: "house", label: "House" },
  { key: "townhouse", label: "Townhouse" },
  { key: "duplex", label: "Duplex" },
  { key: "penthouse", label: "Penthouse" },
  { key: "studio", label: "Studio" },
  { key: "chalet", label: "Chalet" },
  { key: "land", label: "Land" },
  { key: "office", label: "Office" },
  { key: "shop", label: "Shop" },
  { key: "warehouse", label: "Warehouse" },
  { key: "building", label: "Building" },
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number]["key"];

const LABELS = new Map<string, string>(PROPERTY_TYPES.map((t) => [t.key, t.label]));

export function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === "string" && LABELS.has(value);
}

export function propertyTypeLabel(key: string): string {
  return LABELS.get(key) ?? key;
}

/** Currencies offices price in. */
export const LISTING_CURRENCIES = ["TRY", "EGP", "USD", "EUR", "GBP", "AED", "SAR"] as const;

export const AREA_UNITS: { key: ListingAreaUnit; label: string; symbol: string }[] = [
  { key: "m2", label: "Square metres (m²)", symbol: "m²" },
  { key: "ft2", label: "Square feet (ft²)", symbol: "ft²" },
];

export function areaSymbol(unit: ListingAreaUnit): string {
  return unit === "ft2" ? "ft²" : "m²";
}

/** The office's settings, or the defaults until they're saved. */
export function listingSettingsFor(app: App, saved: ListingSettings | null): ListingSettings {
  return (
    saved ?? {
      currency: "TRY",
      areaUnit: "m2",
      contactName: app.appName ?? "Our office",
      contactPhone: null,
      contactWhatsapp: null,
      contactEmail: null,
      messages: true,
    }
  );
}

/** `Config.listings`. */
export function listingsConfig(settings: ListingSettings) {
  return {
    currency: settings.currency,
    area_unit: settings.areaUnit,
    contact: {
      name: settings.contactName,
      phone: settings.contactPhone,
      whatsapp: settings.contactWhatsapp,
      email: settings.contactEmail,
    },
    messages: settings.messages,
  };
}
