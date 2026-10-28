import type { DeliveryService, DeliverySettings, DeliveryZone, ShipmentPlace } from "../data/types";

/**
 * 104 What a shipment costs, as the company set it: by the straight-line
 * distance between the two places, by the drop-off zone, or one fixed
 * price, plus what the chosen service adds.
 */

const EARTH_KM = 6371.0088;

/** The great-circle distance in kilometres, rounded up to the next 100 metres. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.ceil(km * 10) / 10;
}

const located = (p: ShipmentPlace): p is ShipmentPlace & { lat: number; lng: number } => p.lat !== null && p.lng !== null;

export type QuoteResult =
  | { ok: true; cents: number; distanceKm: number | null; zone: DeliveryZone | null }
  | { ok: false; error: string; field: "pickup" | "dropoff" | "zone_id" | "service_id" | null };

/** The price of sending between two places with a service; the error is for the customer. */
export function quoteShipment(
  settings: DeliverySettings,
  input: { pickup: ShipmentPlace; dropoff: ShipmentPlace; zoneId: string | null; service: DeliveryService | null },
): QuoteResult {
  const km = located(input.pickup) && located(input.dropoff) ? distanceKm(input.pickup, input.dropoff) : null;
  const extra = input.service?.extraCents ?? 0;
  switch (settings.pricing) {
    case "fixed":
      return { ok: true, cents: settings.fixedCents + extra, distanceKm: km, zone: null };
    case "zone": {
      if (!input.zoneId) return { ok: false, error: "Choose the area it goes to.", field: "zone_id" };
      const zone = settings.zones.find((z) => z.id === input.zoneId);
      if (!zone) return { ok: false, error: "We don't deliver to that area. Choose another one.", field: "zone_id" };
      return { ok: true, cents: zone.cents + extra, distanceKm: km, zone };
    }
    case "distance": {
      if (!located(input.pickup)) return { ok: false, error: "Set the pickup place on the map or use your location.", field: "pickup" };
      if (!located(input.dropoff)) return { ok: false, error: "Set the drop-off place on the map or paste its maps link.", field: "dropoff" };
      if (km === null) return { ok: false, error: "Set both places.", field: null };
      if (settings.maxKm !== null && km > settings.maxKm) {
        return { ok: false, error: `We deliver up to ${settings.maxKm} km. These places are ${km} km apart.`, field: "dropoff" };
      }
      const cents = Math.max(settings.minCents, settings.baseCents + Math.round(settings.perKmCents * km));
      return { ok: true, cents: cents + extra, distanceKm: km, zone: null };
    }
  }
}
