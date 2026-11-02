import { localToUtc, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, DeliverySettings, Shipment, ShipmentStatus } from "../data/types";
import { demoCourierPosition } from "../demo/courier";
import { isReviewCourier, reviewUserId } from "./review";
import { COURIER_ACTIVE, LOCATION_FRESH_MINUTES, shipmentReference } from "./service";

/**
 * 112.2 The dashboard's live map of a delivery or food company (as 105.9's
 * for taxis, lib/taxi/board.ts): its couriers where they are with a parcel,
 * the jobs waiting for a courier at their pickup, and the jobs on the way.
 * Positions are Yallapp's copy (kept while a parcel is on the way); in
 * Studio's demo apps the demo courier drives the way (lib/demo/courier.ts).
 * The store reviewers' parcels and courier are never on it (but for the
 * demo apps, which are all theirs).
 */

/** The jobs on the list and the map, at most. */
export const DELIVERY_BOARD_MAX = 50;
/** Asked again this often by the page. */
export const DELIVERY_BOARD_EVERY_SECONDS = 10;

/** Jobs on the "jobs now" list: waiting for a courier, or with one. */
const NOW_STATUSES: ShipmentStatus[] = ["pending", ...COURIER_ACTIVE];

export interface BoardCourier {
  id: number;
  name: string;
  lat: number;
  lng: number;
  /** The job they have the parcel of. */
  jobId: number | null;
  locatedAt: string;
}

export interface BoardJob {
  id: number;
  reference: string;
  status: ShipmentStatus;
  courierName: string | null;
  from: string;
  to: string;
  /** The pickup, when it has a position: waiting jobs show there. */
  lat: number | null;
  lng: number | null;
  /** The drop-off. */
  toLat: number | null;
  toLng: number | null;
  /** Waiting since, or the last stage. */
  since: string;
}

export interface DeliveryBoard {
  couriers: BoardCourier[];
  jobs: BoardJob[];
  counts: { onDuty: number; onTheWay: number; waiting: number; today: number };
  at: string;
}

function sinceOf(job: Shipment): Date {
  const last = job.timeline.at(-1);
  return last ? new Date(last.at) : job.updatedAt;
}

export async function deliveryBoard(store: DataStore, app: App, settings: Pick<DeliverySettings, "timezone">, now: Date): Promise<DeliveryBoard> {
  const timezone = settings.timezone ?? "Africa/Cairo";
  const startOfDay = localToUtc(utcToLocal(now, timezone).date, "00:00", timezone);
  // Studio's demo apps are all the review account's (the visitor is the customer and the courier).
  const demo = app.demo === true;
  const reviewer = demo ? null : await reviewUserId(store, app);
  const [couriers, going, today] = await Promise.all([
    store.listCouriers(app.id),
    store.listShipments({ appId: app.id, statuses: NOW_STATUSES, ...(reviewer !== null ? { notUserId: reviewer } : {}), order: "oldest", offset: 0, limit: 2000 }),
    store.listShipments({ appId: app.id, statuses: ["delivered"], updatedSince: startOfDay, ...(reviewer !== null ? { notUserId: reviewer } : {}), order: "newest", offset: 0, limit: 1 }),
  ]);
  const staff = couriers.filter((c) => c.active && !c.driver && (demo || !isReviewCourier(app, c)));
  const ids = new Set(staff.map((c) => c.id));
  const jobs = going.items.filter((s) => s.courierId === null || ids.has(s.courierId));
  const carrying = new Map(jobs.filter((s) => s.courierId !== null && (s.status === "picked_up" || s.status === "on_the_way")).map((s) => [s.courierId!, s]));
  const fresh = now.getTime() - LOCATION_FRESH_MINUTES * 60_000;
  const onMap: BoardCourier[] = [];
  for (const c of staff) {
    const job = carrying.get(c.id) ?? null;
    let at = c.lat !== null && c.lng !== null && c.locatedAt && c.locatedAt.getTime() >= fresh ? { lat: c.lat, lng: c.lng, locatedAt: c.locatedAt } : null;
    if (!at && demo && job) {
      const demo = demoCourierPosition(job, now);
      at = demo ? { ...demo, locatedAt: now } : null;
    }
    if (at) onMap.push({ id: c.id, name: c.name, lat: at.lat, lng: at.lng, jobId: job?.id ?? null, locatedAt: at.locatedAt.toISOString() });
  }
  return {
    couriers: onMap,
    jobs: jobs.slice(0, DELIVERY_BOARD_MAX).map(
      (s): BoardJob => ({
        id: s.id,
        reference: shipmentReference(s),
        status: s.status,
        courierName: s.courierName,
        from: s.pickup.address,
        to: s.dropoff.address,
        lat: s.pickup.lat,
        lng: s.pickup.lng,
        toLat: s.dropoff.lat,
        toLng: s.dropoff.lng,
        since: sinceOf(s).toISOString(),
      }),
    ),
    counts: {
      onDuty: staff.filter((c) => c.onDuty).length,
      onTheWay: jobs.filter((s) => s.status === "picked_up" || s.status === "on_the_way").length,
      waiting: jobs.filter((s) => s.status === "pending").length,
      today: today.total,
    },
    at: now.toISOString(),
  };
}
