import type { Courier } from "../data/types";

/**
 * 110.5 Lamha Taxi, Studio's live taxi demo (105.9). A demo app's riders
 * are anywhere in the world, and its drivers are nobody's phones, so the
 * demo's drivers (lib/demo/content.ts TAXI_DEMO_DRIVERS) have no position
 * of their own: the free taxis a rider sees are those drivers driving up
 * and down streets around the place the rider asks about, worked out from
 * the time, so every look a few seconds later finds them a little further.
 * They are never offered a ride (they are never online); the demo account's
 * rides go to its own test driver, as in a store review.
 */

/** The street each driver drives up and down: its middle (km east and north of the place), its direction and its length. */
const STREETS: { east: number; north: number; bearing: number; km: number }[] = [
  { east: 0.25, north: 0.15, bearing: 90, km: 1.1 },
  { east: -0.4, north: 0.35, bearing: 0, km: 1.3 },
  { east: 0.6, north: -0.45, bearing: 30, km: 1.2 },
  { east: -0.75, north: -0.3, bearing: 120, km: 1 },
  { east: 0.1, north: 0.9, bearing: 60, km: 1.4 },
  { east: 1.05, north: 0.4, bearing: 0, km: 1.1 },
  { east: -1.2, north: 0.85, bearing: 90, km: 1.2 },
  { east: 0.45, north: -1.3, bearing: 150, km: 1.3 },
];

/** City speed, in km an hour. */
const SPEED_KMH = 24;

const KM_PER_DEGREE = 111.32;

/** Where the demo's i-th driver is now, and the way they drive, around `at`. */
export function demoTaxiPosition(index: number, at: { lat: number; lng: number }, now: Date): { lat: number; lng: number; heading: number } {
  const street = STREETS[index % STREETS.length]!;
  // A later lap of the same streets for drivers past the eighth, further out.
  const ring = 1 + Math.floor(index / STREETS.length) * 0.6;
  // Up the street and back: 0 to 2, then again; a different moment for each driver.
  const laps = (now.getTime() / 3_600_000) * (SPEED_KMH / street.km) + index * 0.37;
  const along = laps % 2;
  const going = along < 1;
  const part = (going ? along : 2 - along) - 0.5;
  const rad = (street.bearing * Math.PI) / 180;
  const east = street.east * ring + Math.sin(rad) * part * street.km;
  const north = street.north * ring + Math.cos(rad) * part * street.km;
  const lat = at.lat + north / KM_PER_DEGREE;
  const lng = at.lng + east / (KM_PER_DEGREE * Math.max(0.2, Math.cos((at.lat * Math.PI) / 180)));
  return { lat, lng, heading: going ? street.bearing : (street.bearing + 180) % 360 };
}

/** The demo's drivers placed around `at` now, in the order the company added them. */
export function demoTaxisAround(drivers: readonly Courier[], at: { lat: number; lng: number }, now: Date): (Courier & { lat: number; lng: number })[] {
  return [...drivers]
    .sort((a, b) => a.id - b.id)
    .map((driver, index) => {
      const spot = demoTaxiPosition(index, at, now);
      return { ...driver, lat: spot.lat, lng: spot.lng, locatedAt: now, driver: driver.driver ? { ...driver.driver, heading: spot.heading } : driver.driver };
    });
}
