import type { Ride, RideFares, RidePromo, RidesSettings } from "../data/types";

/**
 * 105.2 What a ride costs, by the company's fares for its vehicle type: a
 * start, then per kilometre and per minute, never under the smallest fare,
 * plus waiting at the pickup past the free minutes. Before the ride the
 * distance is the straight line taken a third longer (no road map is
 * read), at the company's usual speed. `upfront`: that fare is the fare;
 * `metered`: the fare is worked out at the end from the distance the
 * driver's positions measured and the minutes the ride took.
 */

/** Roads are longer than the straight line. */
export const ROAD_FACTOR = 1.3;

const round1 = (km: number) => Math.round(km * 10) / 10;

const EARTH_KM = 6371.0088;

/** The great-circle distance in kilometres, unrounded (the meter adds many short steps). */
export function exactKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Point {
  lat: number;
  lng: number;
}

export const located = (p: { lat: number | null; lng: number | null }): p is Point => p.lat !== null && p.lng !== null;

/** The distance by road between two places, estimated. */
export function roadKm(from: Point, to: Point): number {
  return round1(exactKm(from, to) * ROAD_FACTOR);
}

/** How long a drive of `km` takes at the usual speed, at least a minute. */
export function minutesFor(km: number, speedKmh: number): number {
  return Math.max(1, Math.ceil((km / Math.max(1, speedKmh)) * 60));
}

/** The fare for a distance and minutes, never under the smallest. */
export function fareCents(fares: RideFares, km: number, minutes: number): number {
  return Math.max(fares.minCents, fares.baseCents + Math.round(fares.perKmCents * km) + fares.perMinuteCents * minutes);
}

/** The promo code's share off a fare, at most its limit. */
export function discountCents(promo: RidePromo | null, fare: number): number {
  if (!promo) return 0;
  const off = Math.round((fare * promo.percentOff) / 100);
  return Math.min(fare, promo.maxOffCents === null ? off : Math.min(off, promo.maxOffCents));
}

/** The minutes waited at the pickup past the free ones, from arriving to starting. */
export function chargedWaitMinutes(arrivedAt: Date | null, startedAt: Date | null, freeWaitMinutes: number): number {
  if (!arrivedAt || !startedAt) return 0;
  const waited = Math.floor((startedAt.getTime() - arrivedAt.getTime()) / 60_000);
  return Math.max(0, waited - freeWaitMinutes);
}

/** When the ride reached a stage, from its timeline (the last time). */
export function stageAt(ride: Pick<Ride, "timeline">, status: Ride["status"]): Date | null {
  const found = [...ride.timeline].reverse().find((s) => s.status === status);
  return found ? new Date(found.at) : null;
}

export interface FinalFare {
  finalCents: number;
  /** As charged. */
  km: number;
  rideMinutes: number;
  waitMinutes: number;
  discountCents: number;
}

/** The fare once the ride ends at `now`. */
export function finalFare(ride: Ride, settings: Pick<RidesSettings, "freeWaitMinutes">, now: Date): FinalFare {
  const startedAt = stageAt(ride, "in_progress");
  const rideMinutes = startedAt ? Math.max(1, Math.ceil((now.getTime() - startedAt.getTime()) / 60_000)) : ride.estimateMinutes;
  const waitMinutes = chargedWaitMinutes(stageAt(ride, "arrived"), startedAt, settings.freeWaitMinutes);
  const wait = waitMinutes * ride.fares.waitPerMinuteCents;
  if (ride.fareMode === "upfront") {
    return { finalCents: ride.quotedCents + wait, km: ride.estimateKm, rideMinutes, waitMinutes, discountCents: ride.discountCents };
  }
  // Without positions from the driver's app, the estimate stands in for the meter.
  const km = ride.meterKm >= 0.1 ? round1(ride.meterKm) : ride.estimateKm;
  const fare = fareCents(ride.fares, km, rideMinutes) + wait;
  const discount = Math.min(ride.discountCents, fare);
  return { finalCents: fare - discount + ride.previousFeeCents, km, rideMinutes, waitMinutes, discountCents: discount };
}

/** The company's share of the driver's fare (a previous fee is all the company's). */
export function commissionOf(finalCents: number, previousFeeCents: number, bp: number): number {
  return Math.round((Math.max(0, finalCents - previousFeeCents) * bp) / 10_000);
}

/** A step the driver's app measured: kept only when it is a plausible move (not a jump of the position). */
export function meterStep(from: Point | null, to: Point, seconds: number): number {
  if (!from || seconds <= 0) return 0;
  const km = exactKm(from, to);
  // Faster than 200 km/h is a jump of the position, not a drive.
  return km / (seconds / 3600) > 200 ? 0 : km;
}

/** The promo code a rider typed, as the company has it: active, not ended. */
export function promoFor(settings: Pick<RidesSettings, "promos">, code: string | null, now: Date): RidePromo | null {
  if (!code) return null;
  const wanted = code.trim().toUpperCase();
  const promo = settings.promos.find((p) => p.code.toUpperCase() === wanted);
  if (!promo || !promo.active) return null;
  if (promo.endsAt && Date.parse(promo.endsAt) <= now.getTime()) return null;
  return promo;
}
