import type { DeliverySettings, DriverDetails, RidesSettings, VehicleType } from "../data/types";

/**
 * 105.2 Ride hailing: how a company prices, matches and cancels rides
 * (`Config.rides`), kept with its delivery settings (currency, cash or card,
 * the drivers' app), with the defaults a new company starts with. Fares,
 * fees and the company's share are the company's own: Yallapp never sets
 * them, so they start at 0.
 */

export const DEFAULT_RIDES_TIMEZONE = "Africa/Cairo";

export const DEFAULT_RIDES_SETTINGS: RidesSettings = {
  fareMode: "upfront",
  scheduling: false,
  matching: "nearest",
  areas: [],
  cancelFreeMinutes: 2,
  cancelFeeCents: 0,
  noShowMinutes: 5,
  freeWaitMinutes: 3,
  pin: false,
  emergencyPhone: null,
  commissionBp: 0,
  matchRadiusKm: 5,
  offerSeconds: 20,
  speedKmh: 25,
  promos: [],
};

export const RIDES_LIMITS = {
  vehicleTypes: 12,
  vehicleTypeName: 60,
  vehicleTypeDescription: 200,
  areas: 30,
  areaName: 60,
  promos: 50,
  promoCode: 40,
  drivers: 2000,
  carField: 40,
  plate: 20,
  documents: 8,
  documentLabel: 60,
  /** The largest fare part or fee a company can enter. */
  maxCents: 100_000_00,
  maxRadiusKm: 500,
  offerSeconds: { min: 10, max: 120 },
  speedKmh: { min: 5, max: 120 },
  minutes: 60,
} as const;

export function ridesSettingsOf(settings: Pick<DeliverySettings, "rides">): RidesSettings {
  return { ...DEFAULT_RIDES_SETTINGS, ...(settings.rides ?? {}) };
}

/** A driver's side as a new driver starts. */
export const EMPTY_DRIVER: DriverDetails = {
  photoAssetId: null,
  vehicleTypeId: null,
  carModel: null,
  carColor: null,
  plate: null,
  commissionBp: null,
  documents: [],
  heading: null,
  ratingSum: 0,
  ratingCount: 0,
};

export function driverOf(courier: { driver?: DriverDetails | null }): DriverDetails {
  return { ...EMPTY_DRIVER, ...(courier.driver ?? {}) };
}

/** Whether a vehicle type has fares: a company that hasn't entered any can't take rides with it yet. */
export function faresSet(type: Pick<VehicleType, "baseCents" | "perKmCents" | "perMinuteCents" | "minCents">): boolean {
  return type.baseCents > 0 || type.perKmCents > 0 || type.perMinuteCents > 0 || type.minCents > 0;
}

/** The vehicle types riders may choose: active, with fares. */
export function offeredTypes(types: VehicleType[]): VehicleType[] {
  return types.filter((t) => t.active && faresSet(t));
}
