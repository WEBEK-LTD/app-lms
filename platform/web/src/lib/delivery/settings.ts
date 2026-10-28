import type { DeliverySettings } from "../data/types";

/**
 * 104 Delivery and courier companies: how a company prices, takes payment
 * and follows its shipments (`Config.delivery`), with the defaults a new
 * company starts with. Prices are the company's own: Yallapp never sets them.
 */

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  currency: "EGP",
  pricing: "fixed",
  fixedCents: 0,
  baseCents: 0,
  perKmCents: 0,
  minCents: 0,
  maxKm: null,
  zones: [],
  cash: true,
  card: false,
  tracking: "stages",
  assignment: "dispatch",
  courierApp: "same",
  courierAppName: null,
  courierFirebaseIosAssetId: null,
};

export const DELIVERY_LIMITS = {
  zones: 60,
  zoneName: 80,
  services: 30,
  serviceName: 80,
  serviceDescription: 300,
  eta: 60,
  couriers: 500,
  courierName: 80,
  vehicle: 60,
  /** The largest price or amount a company can enter. */
  maxCents: 100_000_00,
  maxKm: 2000,
  /** 104.6 The stores' limit for an app's name. */
  courierAppName: 30,
  /** 105.1 Food apps. */
  cuisines: 40,
  cuisineName: 40,
} as const;

export function deliverySettingsOf(saved: DeliverySettings | null): DeliverySettings {
  return { ...DEFAULT_DELIVERY_SETTINGS, ...(saved ?? {}) };
}

/** Whether the prices are set: a company that hasn't entered any can't take shipments yet. */
export function pricesSet(settings: DeliverySettings): boolean {
  switch (settings.pricing) {
    case "fixed":
      return settings.fixedCents > 0;
    case "distance":
      return settings.baseCents > 0 || settings.perKmCents > 0 || settings.minCents > 0;
    case "zone":
      return settings.zones.length > 0;
  }
}

/** A tile address the app can use: https, with {z}, {x} and {y}. */
export function validTilesUrl(value: string): boolean {
  if (value.length > 500 || !/^https:\/\/[^\s]+$/.test(value)) return false;
  return ["{z}", "{x}", "{y}"].every((part) => value.includes(part));
}
