import { localToUtc, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, DeliverySettings, Ride, RideStatus } from "../data/types";
import { isReviewCourier } from "../delivery/review";
import { DEFAULT_RIDES_TIMEZONE } from "../rides/settings";
import { DRIVER_ACTIVE } from "../rides/service";

/**
 * 105.9 The dashboard's live map: the company's online drivers where they
 * are (free or on a ride), the rides waiting for a driver at their pickup,
 * and the rides going on now. Read from Yallapp's own copy of the
 * positions (each driver's last one), so it works with or without the
 * company's live database; the page asks again every few seconds.
 */

/** A driver's position older than this isn't on the map. */
export const BOARD_FRESH_MINUTES = 5;
/** The rides going on now, at most. */
export const BOARD_RIDES_MAX = 50;
/** Asked again this often by the page. */
export const BOARD_EVERY_SECONDS = 5;

/** Rides on the "rides now" list: waiting for a driver, or with one. */
const NOW_STATUSES: RideStatus[] = ["searching", ...DRIVER_ACTIVE];

export type BoardDriverState = "free" | "on_ride";

export interface BoardDriver {
  id: number;
  name: string;
  lat: number;
  lng: number;
  heading: number | null;
  state: BoardDriverState;
  rideId: number | null;
  locatedAt: string;
}

export interface BoardRide {
  id: number;
  status: RideStatus;
  riderName: string;
  driverName: string | null;
  from: string;
  to: string;
  /** The pickup, when it has a position: waiting rides show there. */
  lat: number | null;
  lng: number | null;
  /** Searching since, or the last stage. */
  since: string;
  offers: number;
  estimateKm: number;
  estimateMinutes: number;
}

export interface Board {
  drivers: BoardDriver[];
  rides: BoardRide[];
  counts: { free: number; onRide: number; searching: number; today: number };
  at: string;
}

function sinceOf(ride: Ride): Date {
  if (ride.status === "searching" && ride.searchingSince) return ride.searchingSince;
  const last = ride.timeline.at(-1);
  return last ? new Date(last.at) : ride.updatedAt;
}

export async function liveBoard(store: DataStore, app: App, settings: Pick<DeliverySettings, "timezone">, now: Date): Promise<Board> {
  const timezone = settings.timezone ?? DEFAULT_RIDES_TIMEZONE;
  const startOfDay = localToUtc(utcToLocal(now, timezone).date, "00:00", timezone);
  const [couriers, going, today] = await Promise.all([
    store.listCouriers(app.id),
    store.listRides({ appId: app.id, statuses: NOW_STATUSES, order: "oldest", offset: 0, limit: 2000 }),
    store.listRides({ appId: app.id, statuses: ["completed"], since: startOfDay, order: "newest", offset: 0, limit: 1 }),
  ]);
  const rideOf = new Map(going.items.filter((r) => r.driverId !== null && DRIVER_ACTIVE.includes(r.status)).map((r) => [r.driverId!, r]));
  const fresh = now.getTime() - BOARD_FRESH_MINUTES * 60_000;
  const drivers: BoardDriver[] = [];
  for (const c of couriers) {
    if (!c.active || !c.onDuty || !c.driver || isReviewCourier(app, c)) continue;
    if (c.lat === null || c.lng === null || !c.locatedAt || c.locatedAt.getTime() < fresh) continue;
    const ride = rideOf.get(c.id) ?? null;
    drivers.push({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      heading: c.driver.heading ?? null,
      state: ride ? "on_ride" : "free",
      rideId: ride?.id ?? null,
      locatedAt: c.locatedAt.toISOString(),
    });
  }
  const reviewer = new Set(couriers.filter((c) => isReviewCourier(app, c)).map((c) => c.id));
  const rides = going.items
    .filter((r) => r.driverId === null || !reviewer.has(r.driverId))
    .slice(0, BOARD_RIDES_MAX)
    .map(
      (r): BoardRide => ({
        id: r.id,
        status: r.status,
        riderName: r.riderName,
        driverName: r.driverName,
        from: r.pickup.address,
        to: r.dropoff.address,
        lat: r.pickup.lat,
        lng: r.pickup.lng,
        since: sinceOf(r).toISOString(),
        offers: r.declinedBy.length + (r.offeredTo !== null ? 1 : 0),
        estimateKm: r.estimateKm,
        estimateMinutes: r.estimateMinutes,
      }),
    );
  return {
    drivers,
    rides,
    counts: {
      free: drivers.filter((d) => d.state === "free").length,
      onRide: drivers.filter((d) => d.state === "on_ride").length,
      searching: going.items.filter((r) => r.status === "searching").length,
      today: today.total,
    },
    at: now.toISOString(),
  };
}
