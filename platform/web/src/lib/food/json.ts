import { centsToDecimal, formatCents } from "../catalog/money";
import type { Courier, DeliverySettings, Dish, FoodOrder, Restaurant, RestaurantMenu, Shipment, ShipmentPlace } from "../data/types";
import { COURIER_ACTIVE, readPlace, visibleLocation } from "../delivery/service";
import { DEFAULT_FOOD_TIMEZONE, foodLineJson, foodOrderReference, restaurantRating, type CartLineInput, type RestaurantState } from "./service";

/**
 * 105.1 What the app reads and sends for food orders (tags Food and
 * Restaurant in docs/api/openapi.yaml).
 */

type Read<T> = { ok: true; value: T } | { ok: false; error: string };
type AssetUrl = (assetId: string) => string;

const placeJson = (p: ShipmentPlace) => ({ address: p.address, details: p.details, lat: p.lat, lng: p.lng });
const asset = (id: string | null, assetUrl: AssetUrl) => (id ? assetUrl(id) : null);
const record = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function text(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) || null : null;
}

/** `FoodConfig`. */
export function foodConfig(settings: DeliverySettings, map: { tilesUrl: string; attribution: string | null } | null) {
  return {
    currency: settings.currency,
    timezone: settings.timezone ?? DEFAULT_FOOD_TIMEZONE,
    cuisines: (settings.cuisines ?? []).map((c) => ({ id: c.id, name: c.name })),
    payment: { cash: settings.cash, card: settings.card },
    tracking: settings.tracking,
    courier_job: settings.foodCourierJob ?? "accepted",
    // 105.1.6 Where the couriers work: in this app, or in the company's courier app.
    courier_app: settings.courierApp,
    map: { tiles_url: map?.tilesUrl ?? null, attribution: map?.tilesUrl ? map.attribution : null },
  };
}

/** What the list shows of a restaurant near the customer. */
export interface RestaurantNear {
  state: RestaurantState;
  distanceKm: number | null;
  /** Null when it isn't known (no position, or prices by area). */
  feeCents: number | null;
  delivers: boolean | null;
  deliveryMinutes: number | null;
}

/** `RestaurantSummary`. */
export function restaurantSummaryJson(r: Restaurant, near: RestaurantNear, settings: DeliverySettings, assetUrl: AssetUrl) {
  const names = new Map((settings.cuisines ?? []).map((c) => [c.id, c.name]));
  return {
    id: r.id,
    name: r.name,
    logo_url: asset(r.logoAssetId, assetUrl),
    cover_url: asset(r.coverAssetId, assetUrl),
    cuisines: r.cuisines.map((id) => names.get(id)).filter((n): n is string => !!n),
    rating: restaurantRating(r),
    ratings_count: r.ratingCount,
    open: near.state.open,
    opens_at: near.state.open ? null : (near.state.opensAt?.toISOString() ?? null),
    busy: near.state.busy,
    prep_minutes: r.prepMinutes,
    delivery_minutes: near.deliveryMinutes,
    min_order: r.minOrderCents > 0 ? centsToDecimal(r.minOrderCents) : null,
    min_order_formatted: r.minOrderCents > 0 ? formatCents(r.minOrderCents, settings.currency) : null,
    delivery_fee_formatted: near.feeCents === null ? null : formatCents(near.feeCents, settings.currency),
    distance_km: near.distanceKm,
    delivers: near.delivers,
  };
}

function dishJson(d: Dish, currency: DeliverySettings["currency"], assetUrl: AssetUrl) {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    image_url: asset(d.imageAssetId, assetUrl),
    price: centsToDecimal(d.priceCents),
    price_formatted: formatCents(d.priceCents, currency),
    available: d.available,
    popular: d.popular,
    choice_groups: d.choiceGroups.map((g) => ({
      id: g.id,
      name: g.name,
      min: g.min,
      max: g.max,
      choices: g.choices.map((c) => ({
        id: c.id,
        name: c.name,
        extra: centsToDecimal(c.extraCents),
        extra_formatted: c.extraCents > 0 ? `+${formatCents(c.extraCents, currency)}` : null,
        available: c.available,
      })),
    })),
  };
}

/** `Restaurant`: the summary with its address, hours and menu. */
export function restaurantJson(r: Restaurant, menu: RestaurantMenu, near: RestaurantNear, settings: DeliverySettings, assetUrl: AssetUrl) {
  return {
    ...restaurantSummaryJson(r, near, settings, assetUrl),
    description: r.description,
    address: placeJson(r.address),
    phone: r.phone,
    hours: r.hours.map((h) => ({ day: h.day, opens: h.opens, closes: h.closes })),
    menu: menu.sections.map((s) => ({ id: s.id, name: s.name, dishes: s.dishes.map((d) => dishJson(d, settings.currency, assetUrl)) })),
  };
}

const stagesJson = (order: FoodOrder) => order.timeline.map((s) => ({ status: s.status, at: s.at, note: s.note ?? null }));

/** The courier the customer and the restaurant see: the name, and the phone while the courier has the job. */
function courierOf(job: Shipment | null, courier: Courier | null) {
  if (!job?.courierName) return null;
  return { name: job.courierName, phone: COURIER_ACTIVE.includes(job.status) ? (courier?.phone ?? null) : null };
}

/** `FoodOrder`, as its customer sees it. */
export function foodOrderJson(
  order: FoodOrder,
  extra: { restaurant?: Restaurant | null; job?: Shipment | null; courier?: Courier | null; settings?: DeliverySettings; now?: Date; assetUrl?: AssetUrl } = {},
) {
  const job = extra.job ?? null;
  return {
    id: order.id,
    reference: foodOrderReference(order),
    status: order.status,
    restaurant: {
      id: order.restaurantId,
      name: order.restaurantName,
      logo_url: extra.restaurant && extra.assetUrl ? asset(extra.restaurant.logoAssetId, extra.assetUrl) : null,
      phone: extra.restaurant?.phone ?? null,
    },
    lines: order.lines.map((l) => foodLineJson(l, order.currency)),
    subtotal_formatted: formatCents(order.subtotalCents, order.currency),
    delivery_fee_formatted: formatCents(order.deliveryFeeCents, order.currency),
    total: centsToDecimal(order.totalCents),
    total_formatted: formatCents(order.totalCents, order.currency),
    currency: order.currency,
    payment: { method: order.paymentMethod, status: order.paymentStatus },
    dropoff: placeJson(order.dropoff),
    notes: order.notes,
    ready_at: order.readyAt?.toISOString() ?? null,
    rejection: order.rejection ? { reason: order.rejection.reason, note: order.rejection.note } : null,
    courier: courierOf(job, extra.courier ?? null),
    courier_location: job && extra.settings && extra.now ? visibleLocation(job, extra.courier ?? null, extra.settings, extra.now) : null,
    rating: order.rating ? { restaurant: order.rating.restaurant, courier: order.rating.courier, comment: order.rating.comment } : null,
    timeline: stagesJson(order),
    created_at: order.createdAt.toISOString(),
  };
}

/** `RestaurantOrder`, as the restaurant's staff see it: the customer's first name only, no address. */
export function restaurantOrderJson(order: FoodOrder, job: Shipment | null = null, courier: Courier | null = null) {
  return {
    id: order.id,
    reference: foodOrderReference(order),
    status: order.status,
    lines: order.lines.map((l) => foodLineJson(l, order.currency)),
    subtotal_formatted: formatCents(order.subtotalCents, order.currency),
    customer: { name: order.customerName.split(" ")[0] || order.customerName },
    notes: order.notes,
    payment: { method: order.paymentMethod, status: order.paymentStatus },
    ready_at: order.readyAt?.toISOString() ?? null,
    courier: courierOf(job, courier),
    created_at: order.createdAt.toISOString(),
    timeline: stagesJson(order),
  };
}

export interface CartRequest {
  restaurantId: number;
  lines: CartLineInput[];
  dropoff: ShipmentPlace;
  zoneId: string | null;
}

const positiveInt = (v: unknown, max: number): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 1 && v <= max ? v : null);

/** `FoodCartInput`. */
export function readCart(value: unknown): Read<CartRequest> {
  const body = record(value);
  const restaurantId = positiveInt(body.restaurant_id, Number.MAX_SAFE_INTEGER);
  if (restaurantId === null) return { ok: false, error: "Choose a restaurant." };
  if (!Array.isArray(body.lines) || body.lines.length === 0) return { ok: false, error: "Your cart is empty." };
  if (body.lines.length > 50) return { ok: false, error: "Order up to 50 different dishes at a time." };
  const lines: CartLineInput[] = [];
  for (const raw of body.lines) {
    const line = record(raw);
    const dishId = positiveInt(line.dish_id, Number.MAX_SAFE_INTEGER);
    if (dishId === null) return { ok: false, error: "One of the dishes isn't on the menu any more. Refresh the menu." };
    const quantity = positiveInt(line.quantity, 50);
    if (quantity === null) return { ok: false, error: "Order from 1 to 50 of a dish." };
    const choices = line.choices === undefined || line.choices === null ? [] : line.choices;
    if (!Array.isArray(choices) || choices.length > 30 || choices.some((c) => positiveInt(c, Number.MAX_SAFE_INTEGER) === null)) {
      return { ok: false, error: "One of the choices isn't offered any more. Refresh the menu." };
    }
    lines.push({ dishId, quantity, choices: choices as number[], note: text(line.note, 200) });
  }
  const dropoff = readPlace(body.dropoff, "dropoff");
  if (!dropoff.ok) return dropoff;
  const zoneId = typeof body.zone_id === "string" && body.zone_id ? body.zone_id.slice(0, 32) : null;
  return { ok: true, value: { restaurantId, lines, dropoff: dropoff.value, zoneId } };
}

export interface FoodOrderRequest extends CartRequest {
  payment: "cash" | "card";
  phone: string | null;
  notes: string | null;
}

/** `FoodOrderInput`; the phone is checked by the caller. */
export function readFoodOrder(value: unknown): Read<FoodOrderRequest> {
  const cart = readCart(value);
  if (!cart.ok) return cart;
  const body = record(value);
  if (body.payment !== "cash" && body.payment !== "card") return { ok: false, error: "Choose how you'll pay." };
  return { ok: true, value: { ...cart.value, payment: body.payment, phone: typeof body.phone === "string" ? body.phone.slice(0, 24) : null, notes: text(body.notes, 300) } };
}
