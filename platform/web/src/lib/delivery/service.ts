import { centsToDecimal, formatCents } from "../catalog/money";
import type { Courier, DeliveryService, DeliverySettings, PackageSize, Shipment, ShipmentPlace, ShipmentStage, ShipmentStatus } from "../data/types";
import { PACKAGE_SIZES } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";

/**
 * 104 Shipments as the app reads them (tags Delivery and Courier in
 * docs/api/openapi.yaml), what a customer sends, and how a shipment moves
 * from one stage to the next.
 */

/** "S-1042". */
export function shipmentReference(shipment: Pick<Shipment, "id">): string {
  return `S-${1000 + shipment.id}`;
}

/** The shipment's ID in a reference the company or the customer typed ("S-1042", "1042"); null when it isn't one. */
export function shipmentIdOf(reference: string): number | null {
  const match = /^s?-?(\d{4,15})$/i.exec(reference.trim());
  const n = match ? Number(match[1]) - 1000 : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Not yet delivered, failed or cancelled. */
export const ACTIVE_STATUSES: ShipmentStatus[] = ["awaiting_payment", "pending", "assigned", "picked_up", "on_the_way"];
/** With a courier, on its way. */
export const COURIER_ACTIVE: ShipmentStatus[] = ["assigned", "picked_up", "on_the_way"];
/** Where the courier's position is shown to the customer (live tracking). */
export const LIVE_STATUSES: ShipmentStatus[] = ["picked_up", "on_the_way"];
/** The customer may cancel until a courier has it. */
export const CANCELLABLE: ShipmentStatus[] = ["awaiting_payment", "pending"];
/** A position older than this isn't shown. */
export const LOCATION_FRESH_MINUTES = 10;

/** The steps a courier may take from each stage ("released" gives the job back). */
export const COURIER_STEPS: Partial<Record<ShipmentStatus, (ShipmentStatus | "released")[]>> = {
  assigned: ["picked_up", "released"],
  picked_up: ["on_the_way", "delivered", "failed"],
  on_the_way: ["delivered", "failed"],
};

/** The stages the company may move a shipment to from each stage (Dashboard › Shipments). */
export const COMPANY_STEPS: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  awaiting_payment: ["cancelled"],
  pending: ["cancelled"],
  assigned: ["pending", "picked_up", "cancelled"],
  picked_up: ["on_the_way", "delivered", "failed"],
  on_the_way: ["delivered", "failed"],
  failed: ["pending", "cancelled"],
};

export function stage(status: ShipmentStatus, now: Date, by: ShipmentStage["by"], note: string | null = null): ShipmentStage {
  return { status, at: now.toISOString(), by, ...(note ? { note } : {}) };
}

// Reading what the app sends

export type Read<T> = { ok: true; value: T } | { ok: false; error: string };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

function coordinate(value: unknown, limit: number): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit) return undefined;
  return Math.round(value * 1e6) / 1e6;
}

export function readPlace(value: unknown, which: "pickup" | "dropoff"): Read<ShipmentPlace> {
  const body = record(value);
  const name = which === "pickup" ? "pickup" : "drop-off";
  const address = text(body.address, 300);
  if (!address || address.length < 3) return { ok: false, error: `Enter the ${name} address.` };
  const lat = coordinate(body.lat, 90);
  const lng = coordinate(body.lng, 180);
  if (lat === undefined || lng === undefined || (lat === null) !== (lng === null)) return { ok: false, error: `The ${name} place's location isn't valid. Set it again.` };
  return { ok: true, value: { address, details: text(body.details, 200), lat, lng } };
}

export interface QuoteRequest {
  serviceId: number | null;
  zoneId: string | null;
  pickup: ShipmentPlace;
  dropoff: ShipmentPlace;
}

export function readQuoteRequest(value: unknown): Read<QuoteRequest> {
  const body = record(value);
  const pickup = readPlace(body.pickup, "pickup");
  if (!pickup.ok) return pickup;
  const dropoff = readPlace(body.dropoff, "dropoff");
  if (!dropoff.ok) return dropoff;
  const serviceId = body.service_id === null || body.service_id === undefined ? null : Number(body.service_id);
  if (serviceId !== null && !(Number.isSafeInteger(serviceId) && serviceId > 0)) return { ok: false, error: "Choose a service." };
  const zoneId = typeof body.zone_id === "string" && body.zone_id ? body.zone_id.slice(0, 32) : null;
  return { ok: true, value: { serviceId, zoneId, pickup: pickup.value, dropoff: dropoff.value } };
}

export interface ShipmentRequest extends QuoteRequest {
  recipientName: string;
  recipientPhone: string;
  packageSize: PackageSize;
  packageDescription: string | null;
  notes: string | null;
  payment: "cash" | "card";
}

export function readShipmentRequest(value: unknown, defaultCountryCode: string): Read<ShipmentRequest> {
  const quote = readQuoteRequest(value);
  if (!quote.ok) return quote;
  const body = record(value);
  const recipient = record(body.recipient);
  const name = text(recipient.name, 80);
  if (!name || name.length < 2) return { ok: false, error: "Enter the recipient's name." };
  const phone = typeof recipient.phone === "string" ? parseAnyPhone(recipient.phone.slice(0, 24), defaultCountryCode) : null;
  if (!phone) return { ok: false, error: "Enter the recipient's mobile number." };
  const pack = record(body.package);
  const size = PACKAGE_SIZES.find((s) => s === pack.size);
  if (!size) return { ok: false, error: "Choose the parcel's size." };
  if (body.payment !== "cash" && body.payment !== "card") return { ok: false, error: "Choose how you'll pay." };
  return {
    ok: true,
    value: {
      ...quote.value,
      recipientName: name,
      recipientPhone: phone.e164,
      packageSize: size,
      packageDescription: text(pack.description, 200),
      notes: text(body.notes, 300),
      payment: body.payment,
    },
  };
}

// What the app reads

const placeJson = (p: ShipmentPlace) => ({ address: p.address, details: p.details, lat: p.lat, lng: p.lng });
const stagesJson = (timeline: ShipmentStage[]) => timeline.map((s) => ({ status: s.status, at: s.at, note: s.note ?? null }));

/** `Config.delivery`. */
export function deliveryConfig(settings: DeliverySettings, map: { tilesUrl: string; attribution: string | null } | null) {
  return {
    currency: settings.currency,
    pricing: settings.pricing,
    zones: settings.pricing === "zone" ? settings.zones.map((z) => ({ id: z.id, name: z.name, price_formatted: formatCents(z.cents, settings.currency) })) : [],
    max_distance_km: settings.pricing === "distance" ? settings.maxKm : null,
    payment: { cash: settings.cash, card: settings.card },
    tracking: settings.tracking,
    assignment: settings.assignment,
    courier_app: settings.courierApp,
    map: { tiles_url: map?.tilesUrl ?? null, attribution: map?.tilesUrl ? map.attribution : null },
  };
}

export function deliveryServiceJson(service: DeliveryService, currency: DeliverySettings["currency"], assetUrl: (id: string) => string) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    image_url: service.imageAssetId ? assetUrl(service.imageAssetId) : null,
    extra: centsToDecimal(service.extraCents),
    extra_formatted: service.extraCents > 0 ? `+${formatCents(service.extraCents, currency)}` : null,
    eta: service.eta,
  };
}

/** The courier's position the customer may see: live tracking, while the courier has the parcel, and recent. */
export function visibleLocation(shipment: Shipment, courier: Courier | null, settings: DeliverySettings, now: Date) {
  if (settings.tracking !== "live" || !LIVE_STATUSES.includes(shipment.status)) return null;
  if (!courier || courier.lat === null || courier.lng === null || !courier.locatedAt) return null;
  if (now.getTime() - courier.locatedAt.getTime() > LOCATION_FRESH_MINUTES * 60_000) return null;
  return { lat: courier.lat, lng: courier.lng, updated_at: courier.locatedAt.toISOString() };
}

/** `Shipment`, as its customer sees it. */
export function shipmentJson(shipment: Shipment, extra: { courier?: Courier | null; settings?: DeliverySettings; now?: Date } = {}) {
  const active = COURIER_ACTIVE.includes(shipment.status);
  return {
    id: shipment.id,
    reference: shipmentReference(shipment),
    status: shipment.status,
    service: shipment.serviceName ? { id: shipment.serviceId, name: shipment.serviceName } : null,
    pickup: placeJson(shipment.pickup),
    dropoff: placeJson(shipment.dropoff),
    zone: shipment.zoneId && shipment.zoneName ? { id: shipment.zoneId, name: shipment.zoneName } : null,
    distance_km: shipment.distanceKm,
    package: { size: shipment.packageSize, description: shipment.packageDescription },
    recipient: { name: shipment.recipientName, phone: shipment.recipientPhone },
    notes: shipment.notes,
    price: centsToDecimal(shipment.priceCents),
    price_formatted: formatCents(shipment.priceCents, shipment.currency),
    currency: shipment.currency,
    payment: { method: shipment.paymentMethod, status: shipment.paymentStatus },
    courier: shipment.courierName ? { name: shipment.courierName, phone: active ? (extra.courier?.phone ?? null) : null } : null,
    courier_location: extra.settings && extra.now ? visibleLocation(shipment, extra.courier ?? null, extra.settings, extra.now) : null,
    timeline: stagesJson(shipment.timeline),
    created_at: shipment.createdAt.toISOString(),
  };
}

/** `Courier`. */
export function courierJson(courier: Courier, settings: DeliverySettings, deliveredToday: number) {
  return {
    id: courier.id,
    name: courier.name,
    phone: courier.phone,
    vehicle: courier.vehicle,
    on_duty: courier.onDuty,
    assignment: settings.assignment,
    delivered_today: deliveredToday,
  };
}

/** `CourierJob`: phone numbers only once the job is the courier's. */
export function courierJobJson(shipment: Shipment, mine: boolean) {
  const collect = shipment.paymentMethod === "cash" && shipment.paymentStatus === "unpaid" ? shipment.priceCents : 0;
  return {
    id: shipment.id,
    reference: shipmentReference(shipment),
    status: shipment.status,
    service: shipment.serviceName,
    pickup: placeJson(shipment.pickup),
    dropoff: placeJson(shipment.dropoff),
    distance_km: shipment.distanceKm,
    package: { size: shipment.packageSize, description: shipment.packageDescription },
    notes: shipment.notes,
    sender: { name: shipment.senderName, phone: mine ? shipment.senderPhone : null },
    recipient: { name: shipment.recipientName, phone: mine ? shipment.recipientPhone : null },
    collect: centsToDecimal(collect),
    collect_formatted: collect > 0 ? formatCents(collect, shipment.currency) : null,
    created_at: shipment.createdAt.toISOString(),
    timeline: stagesJson(shipment.timeline),
  };
}

/** Whether a signed-in person is this courier: by their proven number, or by email for an account without one. */
export function courierWho(user: { phone: string | null; email: string | null }): { phone: string | null; email: string | null } {
  return user.phone ? { phone: user.phone, email: null } : { phone: null, email: user.email };
}
