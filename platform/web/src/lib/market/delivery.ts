import { randomInt } from "node:crypto";
import { addDays, utcToLocal } from "../bookings/time";
import type { DeliverySettings, MarketCourierTerms, Restaurant, ShipmentPlace, VendorDelivery } from "../data/types";
import { distanceKm } from "../delivery/pricing";
import { deliveryMinutes, deliveryQuote, DEFAULT_FOOD_TIMEZONE, openings, restaurantState } from "../food/service";
import { checkDeliveryArea } from "./areas";
import { percentOf } from "./currency";

/**
 * 115.5 How an order gets to the customer in a marketplace. Each vendor
 * chooses: the app's couriers (the owner's prices, live on the map, and the
 * owner's charge to the vendor) or its own drivers (its fee, fixed or per
 * km, free over an amount, its area by distance; stages for the customer,
 * the map when its driver uses Yallapp Courier). Customers may pick up (no
 * fee, a pick-up code) and order for later within the vendor's hours.
 * Delivery only goes where the marketplace and the vendor deliver
 * (lib/market/areas.ts).
 */

export type MarketVendor = Pick<Restaurant, "address" | "maxKm" | "minOrderCents" | "prepMinutes" | "hours" | "busyUntil" | "active"> &
  Partial<Pick<Restaurant, "delivery" | "paused" | "deliveryAreas">>;

/** 105.1's restaurants and vendors without terms yet: the app's couriers, no pick-up, no orders for later. */
export const APP_COURIERS: VendorDelivery = { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: false, scheduling: false };

export const DEFAULT_COURIER_TERMS: MarketCourierTerms = { customerFee: "delivery_prices", percent: 0, minFee: 0, maxFee: null, freeOver: null, vendorCharge: "none", vendorChargeValue: 0 };

export function vendorDelivery(vendor: Pick<Restaurant, "delivery"> | Partial<Pick<Restaurant, "delivery">>): VendorDelivery {
  return vendor.delivery ?? APP_COURIERS;
}

export function courierTerms(settings: Pick<DeliverySettings, "market">): MarketCourierTerms {
  return { ...DEFAULT_COURIER_TERMS, ...(settings.market ?? {}) };
}

export type DeliveryRefusal = "closed" | "below_min_order" | "too_few_items" | "too_many_items" | "outside_area" | "needs_location" | "no_pickup" | "no_scheduling" | "bad_time";

export interface DeliveryRequest {
  fulfilment: "delivery" | "pickup";
  dropoff: ShipmentPlace | null;
  /** For delivery prices by zone. */
  zoneId?: string | null;
  /** The items after the vendor's discounts, in minor units. */
  items: number;
  /** How many items (a weighed product counts once). */
  itemCount: number;
  /** For later; null: as soon as possible. */
  scheduledFor?: Date | null;
}

export type DeliveryQuote =
  | {
      ok: true;
      fulfilment: "delivery" | "pickup";
      /** Who carries it; null for pick-up. */
      by: "app" | "vendor" | null;
      /** What the customer pays for delivery before club and coupon discounts. */
      fee: number;
      /** What the vendor pays the owner for the app's couriers (money.ts `courierCharge`). */
      courierCharge: number;
      distanceKm: number | null;
      /** Roughly how long from now (or from the scheduled time's start), when known. */
      minutes: number | null;
      /** Whether the customer can follow it on the map: the app's couriers always; the vendor's own drivers once one signs in to Yallapp Courier. */
      liveMap: "always" | "if_driver_signs_in" | "never";
    }
  | { ok: false; refusal: DeliveryRefusal; error: string; field: string | null; limit?: number };

const located = (p: ShipmentPlace | null): p is ShipmentPlace & { lat: number; lng: number } => !!p && p.lat !== null && p.lng !== null;

/** The vendor's own fee: fixed, or a base plus an amount per km after the first. */
export function ownDeliveryFee(terms: VendorDelivery, km: number | null, items: number): number {
  if (terms.freeOver !== null && items >= terms.freeOver) return 0;
  if (terms.feeKind === "fixed" || km === null) return Math.max(0, terms.fee);
  return Math.max(0, terms.fee + Math.round(terms.perKm * Math.max(0, km - 1)));
}

/** What a vendor using the app's couriers pays the owner for one order. */
export function vendorCourierCharge(terms: MarketCourierTerms, items: number, km: number | null): number {
  switch (terms.vendorCharge) {
    case "none":
      return 0;
    case "fixed":
      return Math.max(0, terms.vendorChargeValue);
    case "percent":
      return Math.max(0, percentOf(items, terms.vendorChargeValue));
    case "per_km":
      return km === null ? 0 : Math.max(0, Math.round(terms.vendorChargeValue * km));
  }
}

/**
 * Whether the vendor takes this order, how it gets there and what delivery
 * costs. The vendor's smallest order and fewest or most items apply to
 * pick-up too; the area only to delivery.
 */
export function quoteMarketDelivery(settings: DeliverySettings, vendor: MarketVendor, request: DeliveryRequest, now: Date): DeliveryQuote {
  const terms = vendorDelivery(vendor);
  const timezone = settings.timezone ?? DEFAULT_FOOD_TIMEZONE;
  if (request.scheduledFor) {
    if (!terms.scheduling) return { ok: false, refusal: "no_scheduling", error: "This place doesn't take orders for later.", field: "scheduled_for" };
    if (!isSlotOpen(vendor, timezone, request.scheduledFor, now)) return { ok: false, refusal: "bad_time", error: "Choose one of the times shown.", field: "scheduled_for" };
  } else {
    const state = restaurantState(vendor, timezone, now);
    if (!state.open || vendor.paused) return { ok: false, refusal: "closed", error: "This place isn't taking orders right now.", field: null };
  }
  if (vendor.minOrderCents > 0 && request.items < vendor.minOrderCents) {
    return { ok: false, refusal: "below_min_order", error: "Add a little more to reach this place's smallest order.", field: "items", limit: vendor.minOrderCents };
  }
  if (terms.minItems !== null && request.itemCount < terms.minItems) return { ok: false, refusal: "too_few_items", error: `This place takes orders of ${terms.minItems} items or more.`, field: "items", limit: terms.minItems };
  if (terms.maxItems !== null && request.itemCount > terms.maxItems) return { ok: false, refusal: "too_many_items", error: `This place takes orders of up to ${terms.maxItems} items.`, field: "items", limit: terms.maxItems };

  if (request.fulfilment === "pickup") {
    if (!terms.pickup) return { ok: false, refusal: "no_pickup", error: "This place doesn't do pick-up.", field: "fulfilment" };
    return { ok: true, fulfilment: "pickup", by: null, fee: 0, courierCharge: 0, distanceKm: null, minutes: vendor.prepMinutes, liveMap: "never" };
  }

  // 115 Only where the marketplace and the vendor deliver: their areas need the address on the map.
  if (!located(request.dropoff)) return { ok: false, refusal: "needs_location", error: "Set your address on the map.", field: "dropoff" };
  const area = checkDeliveryArea(settings, vendor, request.dropoff);
  if (!area.ok) return { ok: false, refusal: "outside_area", error: area.error, field: "dropoff", ...(area.limit !== undefined ? { limit: area.limit } : {}) };

  if (terms.by === "vendor") {
    const km = located(vendor.address) ? distanceKm(vendor.address, request.dropoff) : null;
    return { ok: true, fulfilment: "delivery", by: "vendor", fee: ownDeliveryFee(terms, km, request.items), courierCharge: 0, distanceKm: km, minutes: deliveryMinutes(vendor.prepMinutes, km), liveMap: "if_driver_signs_in" };
  }

  // The app's couriers: the owner's prices and area.
  const market = courierTerms(settings);
  // The vendor's area is checked above; the owner's furthest distance still applies here.
  const base = deliveryQuote(settings, { address: vendor.address, maxKm: null }, request.dropoff, request.zoneId ?? null);
  if (!base.ok) return { ok: false, refusal: base.field === "dropoff" && /up to/.test(base.error) ? "outside_area" : "needs_location", error: base.error, field: base.field };
  let fee = base.cents;
  if (market.customerFee === "percent") {
    fee = Math.max(market.minFee, percentOf(request.items, market.percent));
    if (market.maxFee !== null) fee = Math.min(fee, market.maxFee);
  }
  if (market.freeOver !== null && request.items >= market.freeOver) fee = 0;
  return {
    ok: true,
    fulfilment: "delivery",
    by: "app",
    fee,
    courierCharge: vendorCourierCharge(market, request.items, base.distanceKm),
    distanceKm: base.distanceKm,
    minutes: deliveryMinutes(vendor.prepMinutes, base.distanceKm),
    liveMap: "always",
  };
}

/** A four-digit code the customer shows at pick-up. */
export function pickupCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export interface Slot {
  start: Date;
  end: Date;
}

/**
 * The times a customer may order for, over the next `days` days: windows of
 * `stepMinutes` within the vendor's hours, starting no sooner than its
 * preparation (plus `leadMinutes`, e.g. the ride) from now.
 */
export function orderSlots(vendor: Pick<Restaurant, "hours" | "prepMinutes">, timezone: string, now: Date, options: { days?: number; stepMinutes?: number; leadMinutes?: number } = {}): Slot[] {
  const step = Math.max(5, options.stepMinutes ?? 30) * 60_000;
  const earliest = now.getTime() + (vendor.prepMinutes + (options.leadMinutes ?? 0)) * 60_000;
  const days = Math.max(1, options.days ?? 3);
  const today = utcToLocal(now, timezone).date;
  const lastDay = addDays(today, days);
  const starts = new Set<number>();
  for (const o of openings(vendor.hours, timezone, today, days)) {
    for (let t = o.start.getTime(); t + step <= o.end.getTime(); t += step) {
      if (t >= earliest && utcToLocal(new Date(t), timezone).date < lastDay) starts.add(t);
    }
  }
  return [...starts].sort((a, b) => a - b).map((t) => ({ start: new Date(t), end: new Date(t + step) }));
}

/** Whether an order for later at `at` falls in one of the vendor's slots. */
export function isSlotOpen(vendor: Pick<Restaurant, "hours" | "prepMinutes">, timezone: string, at: Date, now: Date): boolean {
  return orderSlots(vendor, timezone, now, { days: 7, stepMinutes: 5 }).some((s) => at >= s.start && at < s.end);
}
