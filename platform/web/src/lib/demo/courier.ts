import type { Shipment } from "../data/types";

/**
 * 112.2 Sahm Express and Sofra Eats, Studio's delivery and food demos: the
 * visitor is also the courier, and nobody's phone sends a position while
 * they follow their parcel or their food, so the demo's courier drives the
 * straight way from the pickup to the drop-off at city speed from the time
 * the parcel was picked up, stopping just short of the door until it's
 * marked delivered. Worked out from the time, never kept.
 */

/** City speed, in km an hour. */
const SPEED_KMH = 24;
/** How far along the way the courier waits for "delivered". */
const LAST = 0.95;

const KM_PER_DEGREE = 111.32;

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const north = (b.lat - a.lat) * KM_PER_DEGREE;
  const east = (b.lng - a.lng) * KM_PER_DEGREE * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot(north, east);
}

/** Where the demo's courier is now with this parcel; null before it's picked up or without both places. */
export function demoCourierPosition(shipment: Pick<Shipment, "status" | "pickup" | "dropoff" | "timeline">, now: Date): { lat: number; lng: number } | null {
  if (shipment.status !== "picked_up" && shipment.status !== "on_the_way") return null;
  const { pickup, dropoff } = shipment;
  if (pickup.lat === null || pickup.lng === null || dropoff.lat === null || dropoff.lng === null) return null;
  const from = { lat: pickup.lat, lng: pickup.lng };
  const to = { lat: dropoff.lat, lng: dropoff.lng };
  const since = shipment.timeline.find((s) => s.status === "picked_up")?.at;
  const started = since ? new Date(since).getTime() : now.getTime();
  const minutes = Math.max(0, (now.getTime() - started) / 60_000);
  const whole = Math.max(km(from, to), 0.1);
  const part = Math.min(LAST, (minutes / 60) * SPEED_KMH / whole);
  return { lat: from.lat + (to.lat - from.lat) * part, lng: from.lng + (to.lng - from.lng) * part };
}
