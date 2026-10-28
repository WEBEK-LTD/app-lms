import { addDays, localToUtc, minutesOf, utcToLocal } from "../bookings/time";
import { centsToDecimal, formatCents } from "../catalog/money";
import type {
  DeliverySettings,
  FoodOrder,
  FoodOrderLine,
  FoodOrderStage,
  FoodOrderStatus,
  OpeningPeriod,
  Restaurant,
  RestaurantMenu,
  ShipmentPlace,
} from "../data/types";
import { distanceKm, quoteShipment } from "../delivery/pricing";
import { findChoice, findDish } from "./menu";

/**
 * 105.1 Food orders as the app reads them (tags Food and Restaurant in
 * docs/api/openapi.yaml): restaurants open or not, a cart priced line by
 * line, the delivery fee from the restaurant by the company's delivery
 * prices (Phase 104), and the order's stages.
 */

export const DEFAULT_FOOD_TIMEZONE = "Africa/Cairo";

/** "F-1042". */
export function foodOrderReference(order: Pick<FoodOrder, "id">): string {
  return `F-${1000 + order.id}`;
}

/** The order's ID in a reference ("F-1042", "1042"); null when it isn't one. */
export function foodOrderIdOf(reference: string): number | null {
  const match = /^f?-?(\d{4,15})$/i.exec(reference.trim());
  const n = match ? Number(match[1]) - 1000 : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Not yet delivered, turned down, cancelled or failed. */
export const FOOD_ACTIVE: FoodOrderStatus[] = ["awaiting_payment", "placed", "accepted", "ready", "picked_up", "on_the_way"];
/** The customer may cancel until the restaurant accepts it. */
export const FOOD_CANCELLABLE: FoodOrderStatus[] = ["awaiting_payment", "placed"];
/** The restaurant's lists. */
export const RESTAURANT_NEW: FoodOrderStatus[] = ["placed"];
export const RESTAURANT_ACTIVE: FoodOrderStatus[] = ["accepted", "ready"];
export const RESTAURANT_DONE: FoodOrderStatus[] = ["picked_up", "on_the_way", "delivered", "rejected", "cancelled", "failed"];
/** The stages the company may move an order to from each stage (Dashboard › Food orders). */
export const FOOD_COMPANY_STEPS: Partial<Record<FoodOrderStatus, FoodOrderStatus[]>> = {
  awaiting_payment: ["cancelled"],
  placed: ["accepted", "rejected", "cancelled"],
  accepted: ["ready", "cancelled"],
  ready: ["cancelled"],
  failed: ["cancelled"],
};

export function foodStage(status: FoodOrderStatus, now: Date, by: FoodOrderStage["by"], note: string | null = null): FoodOrderStage {
  return { status, at: now.toISOString(), by, ...(note ? { note } : {}) };
}

const WEEK: OpeningPeriod["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Each opening from `fromDate` for `days` days, as instants, soonest first; a period past midnight ends the next day. */
function openings(hours: OpeningPeriod[], timezone: string, fromDate: string, days: number): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  for (let d = -1; d < days; d += 1) {
    const date = addDays(fromDate, d);
    const day = WEEK[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
    for (const period of hours.filter((p) => p.day === day)) {
      const opens = minutesOf(period.opens);
      const closes = minutesOf(period.closes);
      if (opens === null || closes === null || opens === closes) continue;
      const start = localToUtc(date, period.opens, timezone);
      const end = localToUtc(closes > opens ? date : addDays(date, 1), period.closes, timezone);
      out.push({ start, end });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface RestaurantState {
  /** Within its hours. */
  inHours: boolean;
  /** Busy for a while: no new orders. */
  busy: boolean;
  /** Taking orders now. */
  open: boolean;
  /** While closed: the next opening within 7 days. */
  opensAt: Date | null;
}

/** Whether the restaurant takes orders at `now`, in the company's time zone. */
export function restaurantState(restaurant: Pick<Restaurant, "hours" | "busyUntil" | "active">, timezone: string, now: Date): RestaurantState {
  const today = utcToLocal(now, timezone).date;
  const all = openings(restaurant.hours, timezone, today, 8);
  const inHours = all.some((o) => now >= o.start && now < o.end);
  const busy = restaurant.busyUntil !== null && restaurant.busyUntil > now;
  const next = inHours ? null : (all.find((o) => o.start > now)?.start ?? null);
  return { inHours, busy, open: restaurant.active && inHours && !busy, opensAt: next };
}

/** The delivery fee from the restaurant to the drop-off, or why it doesn't deliver there. */
export function deliveryQuote(
  settings: DeliverySettings,
  restaurant: Pick<Restaurant, "address" | "maxKm">,
  dropoff: ShipmentPlace,
  zoneId: string | null,
): { ok: true; cents: number; distanceKm: number | null } | { ok: false; error: string; field: string | null } {
  const quote = quoteShipment(settings, { pickup: restaurant.address, dropoff, zoneId, service: null });
  if (!quote.ok) return { ok: false, error: quote.error === "Set the pickup place on the map or use your location." ? "This restaurant can't take deliveries yet." : quote.error, field: quote.field === "pickup" ? null : quote.field };
  if (restaurant.maxKm !== null && quote.distanceKm !== null && quote.distanceKm > restaurant.maxKm) {
    return { ok: false, error: `This restaurant delivers up to ${restaurant.maxKm} km. You are ${quote.distanceKm} km away.`, field: "dropoff" };
  }
  return { ok: true, cents: quote.cents, distanceKm: quote.distanceKm };
}

/** The distance from the restaurant to a position, when both are known. */
export function distanceFrom(restaurant: Pick<Restaurant, "address">, at: { lat: number; lng: number } | null): number | null {
  const a = restaurant.address;
  return at && a.lat !== null && a.lng !== null ? distanceKm({ lat: a.lat, lng: a.lng }, at) : null;
}

/** Roughly how long until it arrives: preparing, then a courier at about 25 km/h plus 10 minutes. */
export function deliveryMinutes(prepMinutes: number, km: number | null): number | null {
  return km === null ? null : prepMinutes + 10 + Math.ceil((km / 25) * 60);
}

export interface CartLineInput {
  dishId: number;
  quantity: number;
  choices: number[];
  note: string | null;
}

export type PricedCart =
  | { ok: true; lines: FoodOrderLine[]; subtotalCents: number }
  | { ok: false; code: "invalid_request" | "unavailable_item"; error: string; field: string };

/** Each line at today's prices, its choices checked against the dish's groups. */
export function priceCart(menu: RestaurantMenu, lines: CartLineInput[]): PricedCart {
  const out: FoodOrderLine[] = [];
  let subtotal = 0;
  for (const [i, line] of lines.entries()) {
    const field = `lines[${i}]`;
    const dish = findDish(menu, line.dishId);
    if (!dish) return { ok: false, code: "invalid_request", error: "One of the dishes isn't on the menu any more. Refresh the menu.", field };
    if (!dish.available) return { ok: false, code: "unavailable_item", error: `${dish.name} is sold out for now.`, field };
    const chosen: { group: string; name: string; extraCents: number; groupId: number }[] = [];
    for (const id of new Set(line.choices)) {
      const found = findChoice(dish, id);
      if (!found) return { ok: false, code: "invalid_request", error: `One of the choices for ${dish.name} isn't offered any more.`, field };
      if (!found.choice.available) return { ok: false, code: "unavailable_item", error: `${found.choice.name} is sold out for now.`, field };
      const groupId = dish.choiceGroups.find((g) => g.choices.some((c) => c.id === id))!.id;
      chosen.push({ group: found.group, name: found.choice.name, extraCents: found.choice.extraCents, groupId });
    }
    for (const group of dish.choiceGroups) {
      const n = chosen.filter((c) => c.groupId === group.id).length;
      if (n < group.min) return { ok: false, code: "invalid_request", error: `Choose ${group.min === 1 ? "one" : `at least ${group.min}`} for ${group.name} (${dish.name}).`, field };
      if (n > group.max) return { ok: false, code: "invalid_request", error: `Choose up to ${group.max} for ${group.name} (${dish.name}).`, field };
    }
    const unitCents = dish.priceCents + chosen.reduce((sum, c) => sum + c.extraCents, 0);
    subtotal += unitCents * line.quantity;
    out.push({ dishId: dish.id, name: dish.name, quantity: line.quantity, choices: chosen.map((c) => `${c.group}: ${c.name}`), note: line.note, unitCents });
  }
  return { ok: true, lines: out, subtotalCents: subtotal };
}

/** The company's share of a subtotal at the restaurant's rate (basis points), rounded to the cent. */
export function commissionOf(subtotalCents: number, commissionBp: number): number {
  return Math.round((subtotalCents * commissionBp) / 10_000);
}

// What the app reads

export function foodLineJson(line: FoodOrderLine, currency: FoodOrder["currency"]) {
  const total = line.unitCents * line.quantity;
  return {
    dish_id: line.dishId,
    name: line.name,
    quantity: line.quantity,
    choices: line.choices,
    note: line.note,
    unit_price: centsToDecimal(line.unitCents),
    total: centsToDecimal(total),
    total_formatted: formatCents(total, currency),
  };
}

export function restaurantRating(r: Pick<Restaurant, "ratingSum" | "ratingCount">): number | null {
  return r.ratingCount > 0 ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10 : null;
}
