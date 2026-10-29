import { centsToDecimal, formatCents } from "../catalog/money";
import type { CatalogCurrency, Courier, DeliverySettings, Ride, RideStage, RideStatus, RidesSettings, ShipmentPlace, VehicleType } from "../data/types";
import { readPlace, type Read } from "../delivery/service";
import { driverOf } from "./settings";

/**
 * 105.2 Rides as the app reads them (tags Rides and Driver in
 * docs/api/openapi.yaml), what a rider asks for, and the stages of a ride.
 */

/** "R-2051". */
export function rideReference(ride: Pick<Ride, "id">): string {
  return `R-${2000 + ride.id}`;
}

/** The ride's ID in a reference the company typed ("R-2051", "2051"); null when it isn't one. */
export function rideIdOf(reference: string): number | null {
  const match = /^r?-?(\d{4,15})$/i.exec(reference.trim());
  const n = match ? Number(match[1]) - 2000 : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Not yet over (scheduled ones too). */
export const RIDE_ACTIVE: RideStatus[] = ["scheduled", "searching", "accepted", "arrived", "in_progress"];
/** A driver has it and it isn't over. */
export const DRIVER_ACTIVE: RideStatus[] = ["accepted", "arrived", "in_progress"];
/** Over. */
export const RIDE_DONE: RideStatus[] = ["completed", "cancelled", "no_driver"];
/** The rider may cancel until it starts. */
export const RIDER_CANCELLABLE: RideStatus[] = ["scheduled", "searching", "accepted", "arrived"];
/** A driver's position older than this isn't shown. */
export const DRIVER_FRESH_MINUTES = 2;
/** A driver's position older than this doesn't count for matching. */
export const MATCH_FRESH_MINUTES = 2;

/** The steps a driver may take from each stage. */
export const DRIVER_STEPS: Partial<Record<RideStatus, ("arrived" | "in_progress" | "completed" | "cancelled")[]>> = {
  accepted: ["arrived", "cancelled"],
  arrived: ["in_progress", "cancelled"],
  in_progress: ["completed"],
};

export function rideStage(status: RideStatus, now: Date, by: RideStage["by"], note: string | null = null): RideStage {
  return { status, at: now.toISOString(), by, ...(note ? { note } : {}) };
}

// Reading what the app sends

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

export interface EstimateRequest {
  pickup: ShipmentPlace;
  dropoff: ShipmentPlace;
  scheduledAt: Date | null;
  promoCode: string | null;
}

export function readEstimateRequest(value: unknown): Read<EstimateRequest> {
  const body = record(value);
  const pickup = readPlace(body.pickup, "pickup");
  if (!pickup.ok) return pickup;
  const dropoff = readPlace(body.dropoff, "dropoff");
  if (!dropoff.ok) return dropoff;
  if (pickup.value.lat === null) return { ok: false, error: "Set the pickup on the map or use your location." };
  if (dropoff.value.lat === null) return { ok: false, error: "Set where you're going on the map." };
  let scheduledAt: Date | null = null;
  if (body.scheduled_at !== null && body.scheduled_at !== undefined) {
    const at = typeof body.scheduled_at === "string" ? new Date(body.scheduled_at) : null;
    if (!at || Number.isNaN(at.getTime())) return { ok: false, error: "Choose when you want the ride." };
    scheduledAt = at;
  }
  const promoCode = text(body.promo_code, 40);
  return { ok: true, value: { pickup: pickup.value, dropoff: dropoff.value, scheduledAt, promoCode: promoCode ? promoCode.toUpperCase() : null } };
}

export interface RideRequest extends EstimateRequest {
  vehicleTypeId: number;
  payment: "cash" | "card";
  notes: string | null;
}

export function readRideRequest(value: unknown): Read<RideRequest> {
  const estimate = readEstimateRequest(value);
  if (!estimate.ok) return estimate;
  const body = record(value);
  const vehicleTypeId = Number(body.vehicle_type_id);
  if (!Number.isSafeInteger(vehicleTypeId) || vehicleTypeId <= 0) return { ok: false, error: "Choose a vehicle type." };
  if (body.payment !== "cash" && body.payment !== "card") return { ok: false, error: "Choose how you'll pay." };
  return { ok: true, value: { ...estimate.value, vehicleTypeId, payment: body.payment, notes: text(body.notes, 300) } };
}

// What the app reads

const placeJson = (p: ShipmentPlace) => ({ address: p.address, details: p.details, lat: p.lat, lng: p.lng });
const stagesJson = (timeline: RideStage[]) => timeline.map((s) => ({ status: s.status, at: s.at, note: s.note ?? null }));
const money = (cents: number, currency: CatalogCurrency) => ({ value: centsToDecimal(cents), formatted: formatCents(cents, currency) });

export function vehicleTypeJson(type: VehicleType, assetUrl: (id: string) => string) {
  return {
    id: type.id,
    name: type.name,
    description: type.description,
    icon: type.icon,
    image_url: type.imageAssetId ? assetUrl(type.imageAssetId) : null,
    seats: type.seats,
  };
}

/** `Config.rides`. */
export function ridesConfig(
  settings: DeliverySettings,
  rides: RidesSettings,
  types: VehicleType[],
  map: { tilesUrl: string; attribution: string | null } | null,
  assetUrl: (id: string) => string,
) {
  return {
    currency: settings.currency,
    timezone: settings.timezone ?? "Africa/Cairo",
    vehicle_types: types.map((t) => vehicleTypeJson(t, assetUrl)),
    payment: { cash: settings.cash, card: settings.card },
    fare_mode: rides.fareMode,
    scheduling: rides.scheduling,
    matching: rides.matching,
    areas: rides.areas.map((a) => ({ id: a.id, name: a.name, lat: a.lat, lng: a.lng, radius_km: a.radiusKm })),
    cancellation: {
      free_minutes: rides.cancelFreeMinutes,
      fee_formatted: rides.cancelFeeCents > 0 ? formatCents(rides.cancelFeeCents, settings.currency) : null,
      no_show_minutes: rides.noShowMinutes,
    },
    pin: rides.pin,
    emergency_phone: rides.emergencyPhone,
    // The Yallapp Courier app isn't for drivers: a company that chose it has them in its own app.
    driver_app: settings.courierApp === "bundle" ? "bundle" : "same",
    map: { tiles_url: map?.tilesUrl ?? null, attribution: map?.tilesUrl ? map.attribution : null },
  };
}

/** The driver's rating, to one decimal; null before any. */
export function ratingOf(courier: Courier | null): number | null {
  const d = courier ? driverOf(courier) : null;
  return d && d.ratingCount > 0 ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : null;
}

/** The fare shown: the final one once the ride is completed or charged a fee, else the one given when asked. */
function shownFare(ride: Ride): { cents: number; final: boolean } {
  if (ride.status === "completed" && ride.finalCents !== null) return { cents: ride.finalCents, final: true };
  if (ride.status === "cancelled") return { cents: ride.cancellation?.feeCents ?? 0, final: true };
  return { cents: ride.quotedCents, final: false };
}

/** The driver's position the rider may see: from accepting until the ride ends, and recent. */
export function visibleDriverLocation(ride: Ride, driver: Courier | null, now: Date) {
  if (!DRIVER_ACTIVE.includes(ride.status) || !driver || driver.lat === null || driver.lng === null || !driver.locatedAt) return null;
  if (now.getTime() - driver.locatedAt.getTime() > DRIVER_FRESH_MINUTES * 60_000) return null;
  return { lat: driver.lat, lng: driver.lng, heading: driver.driver?.heading ?? null, updated_at: driver.locatedAt.toISOString() };
}

/** `Ride`, as its rider sees it. */
export function rideJson(
  ride: Ride,
  extra: { driver?: Courier | null; now?: Date; platformUrl?: string; pickupMinutes?: number | null; assetUrl?: (id: string) => string } = {},
) {
  const fare = shownFare(ride);
  const active = DRIVER_ACTIVE.includes(ride.status);
  const d = extra.driver ? driverOf(extra.driver) : null;
  return {
    id: ride.id,
    reference: rideReference(ride),
    status: ride.status,
    vehicle_type: { id: ride.vehicleTypeId, name: ride.vehicleTypeName, icon: ride.vehicleTypeIcon },
    pickup: placeJson(ride.pickup),
    dropoff: placeJson(ride.dropoff),
    scheduled_at: ride.scheduledAt?.toISOString() ?? null,
    distance_km: ride.status === "completed" ? ride.meterKm >= 0.1 && ride.fareMode === "metered" ? Math.round(ride.meterKm * 10) / 10 : ride.estimateKm : ride.estimateKm,
    minutes: ride.status === "completed" && ride.rideMinutes !== null ? ride.rideMinutes : ride.estimateMinutes,
    fare: money(fare.cents, ride.currency).value,
    fare_formatted: money(fare.cents, ride.currency).formatted,
    final: fare.final,
    currency: ride.currency,
    payment: { method: ride.paymentMethod, status: ride.paymentStatus },
    pin: ride.pin && RIDE_ACTIVE.includes(ride.status) && ride.status !== "in_progress" ? ride.pin : null,
    notes: ride.notes,
    driver: ride.driverName
      ? {
          name: ride.driverName,
          phone: active ? (extra.driver?.phone ?? null) : null,
          photo_url: d?.photoAssetId && extra.assetUrl ? extra.assetUrl(d.photoAssetId) : null,
          rating: ratingOf(extra.driver ?? null),
          car: { model: d?.carModel ?? null, color: d?.carColor ?? null, plate: d?.plate ?? null },
        }
      : null,
    driver_location: extra.now ? visibleDriverLocation(ride, extra.driver ?? null, extra.now) : null,
    pickup_minutes: ride.status === "accepted" ? (extra.pickupMinutes ?? null) : null,
    share_url: ride.shareToken && extra.platformUrl && RIDE_ACTIVE.includes(ride.status) ? `${extra.platformUrl.replace(/\/+$/, "")}/r/${ride.shareToken}` : null,
    cancellation: ride.cancellation
      ? {
          by: ride.cancellation.by,
          reason: ride.cancellation.reason,
          fee_formatted: ride.cancellation.feeCents > 0 ? formatCents(ride.cancellation.feeCents, ride.currency) : null,
        }
      : null,
    rating: ride.rating ? { driver: ride.rating.driver, comment: ride.rating.comment } : null,
    timeline: stagesJson(ride.timeline),
    created_at: ride.createdAt.toISOString(),
  };
}

/** `DriverRide`: the rider's number only while the ride is the driver's and not over. */
export function driverRideJson(ride: Ride, extra: { mine: boolean; pickupKm?: number | null }) {
  const fare = shownFare(ride);
  // Cash: the fare given, then the final one once the ride ends.
  const collect = ride.paymentMethod !== "cash" ? 0 : ride.status === "completed" ? (ride.finalCents ?? 0) : ride.status === "searching" || DRIVER_ACTIVE.includes(ride.status) ? ride.quotedCents : 0;
  const offered = ride.status === "searching" && ride.offerExpiresAt !== null && !extra.mine;
  return {
    id: ride.id,
    reference: rideReference(ride),
    status: ride.status,
    vehicle_type: ride.vehicleTypeName,
    pickup: placeJson(ride.pickup),
    dropoff: placeJson(ride.dropoff),
    distance_km: ride.estimateKm,
    minutes: ride.status === "completed" && ride.rideMinutes !== null ? ride.rideMinutes : ride.estimateMinutes,
    fare: centsToDecimal(fare.cents),
    fare_formatted: formatCents(fare.cents, ride.currency),
    final: fare.final,
    payment: { method: ride.paymentMethod, status: ride.paymentStatus },
    collect: centsToDecimal(collect),
    collect_formatted: collect > 0 ? formatCents(collect, ride.currency) : null,
    notes: ride.notes,
    rider: { name: ride.riderName, phone: extra.mine && DRIVER_ACTIVE.includes(ride.status) ? ride.riderPhone : null, rating: null },
    offer_expires_at: offered ? ride.offerExpiresAt!.toISOString() : null,
    pickup_km: offered || ride.status === "accepted" ? (extra.pickupKm ?? null) : null,
    waiting_since: ride.status === "arrived" ? ([...ride.timeline].reverse().find((s) => s.status === "arrived")?.at ?? null) : null,
    started_at: [...ride.timeline].reverse().find((s) => s.status === "in_progress")?.at ?? null,
    timeline: stagesJson(ride.timeline),
    created_at: ride.createdAt.toISOString(),
  };
}

/** `Driver`. */
export function driverJson(courier: Courier, types: VehicleType[], today: { rides: number; earnedCents: number }, currency: CatalogCurrency, activeRideId: number | null, assetUrl: (id: string) => string) {
  const d = driverOf(courier);
  const type = d.vehicleTypeId === null ? null : (types.find((t) => t.id === d.vehicleTypeId) ?? null);
  return {
    id: courier.id,
    name: courier.name,
    phone: courier.phone,
    photo_url: d.photoAssetId ? assetUrl(d.photoAssetId) : null,
    vehicle_type: type ? { id: type.id, name: type.name } : null,
    car: { model: d.carModel, color: d.carColor, plate: d.plate },
    online: courier.onDuty,
    rating: ratingOf(courier),
    ratings_count: d.ratingCount,
    active_ride_id: activeRideId,
    today: { rides: today.rides, earned_formatted: formatCents(today.earnedCents, currency) },
  };
}
