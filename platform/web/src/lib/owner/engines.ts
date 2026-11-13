import type { DashKey } from "@/i18n/dashboard";
import type { App, Courier, FoodOrder, FoodOrderStatus, Restaurant, Ride, RideStatus, Shipment, ShipmentStatus } from "../data/types";
import { FOOD_REJECTIONS, SHIPMENT_STATUSES } from "../data/types";
import { deliveryBoard } from "../delivery/board";
import { assignShipment, moveShipment } from "../delivery/flow";
import { courierMayHave, reviewUserId } from "../delivery/review";
import { ACTIVE_STATUSES, COMPANY_STEPS, COURIER_ACTIVE, LOCATION_FRESH_MINUTES, shipmentIdOf, shipmentReference } from "../delivery/service";
import { deliverySettingsOf } from "../delivery/settings";
import { acceptOrder, cancelOrder, readyOrder, rejectOrder } from "../food/flow";
import { FOOD_LIMITS } from "../food/forms";
import { DEFAULT_FOOD_TIMEZONE, FOOD_ACTIVE, FOOD_COMPANY_STEPS, foodOrderIdOf, foodOrderReference, restaurantState } from "../food/service";
import { activeDelay } from "../market/vendor-controls";
import { exactKm } from "../rides/fares";
import { assignRide, cancelByCompany } from "../rides/flow";
import { driverMayHave } from "../rides/review";
import { DRIVER_ACTIVE, RIDE_ACTIVE, rideIdOf, rideReference } from "../rides/service";
import { liveBoard } from "../taxi/board";
import { bodyObject, intParam, invalid, iso, notFound, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { appScope, money } from "./sales";
import { changed, flowDeps, idFrom, initials, invalidStatus, minutesSince, noteOf, placeName, recordStudio, stageJson } from "./studio";

/**
 * 125 The Studio apps' engines in Yallapp Business: a food company's orders
 * and restaurants, a delivery company's shipments and couriers (and a food
 * company's courier jobs), a ride company's rides and drivers. The same
 * movers and checks as the dashboard's actions (app/actions/food.ts,
 * delivery.ts, rides.ts), by "company", with the app's push account.
 */

function searchOf(ctx: OwnerContext): string {
  return (ctx.req.query.get("q") ?? "").trim().slice(0, 80);
}

function filterOf<T extends string>(ctx: OwnerContext, allowed: readonly T[], fallback: T, name = "filter"): T {
  const raw = ctx.req.query.get(name);
  if (raw === null || raw === "") return fallback;
  if (!(allowed as readonly string[]).includes(raw)) throw invalid({ [name]: "The request isn't valid." });
  return raw as T;
}

// Food orders

const FOOD_STATUS_KEY = (status: string) => `food.status_${status}` as DashKey;
const FOOD_FILTERS = {
  new: ["placed"],
  active: FOOD_ACTIVE,
  done: ["delivered"],
  problems: ["rejected", "cancelled", "failed"],
  all: null,
} as const satisfies Record<string, readonly FoodOrderStatus[] | null>;
type FoodFilter = keyof typeof FOOD_FILTERS;

/** The company's steps from a status, as the API names them. */
const STEP_OF: Partial<Record<FoodOrderStatus, "accept" | "reject" | "ready" | "cancel">> = { accepted: "accept", rejected: "reject", ready: "ready", cancelled: "cancel" };
const STEP_TO: Record<"accept" | "reject" | "ready" | "cancel", FoodOrderStatus> = { accept: "accepted", reject: "rejected", ready: "ready", cancel: "cancelled" };
const PREP_CHOICES = [10, 15, 20, 30, 45];

function foodSummary(order: FoodOrder): string {
  return order.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ");
}

async function courierOfJob(ctx: OwnerContext, app: App, shipmentId: number | null): Promise<{ id: number | null; name: string } | null> {
  if (shipmentId === null) return null;
  const job = await ctx.deps.store.getShipment(app.id, shipmentId);
  return job?.courierName ? { id: job.courierId, name: job.courierName } : null;
}

async function foodOrderJson(ctx: OwnerContext, app: App, order: FoodOrder) {
  const card = order.paymentMethod === "card";
  const courier = await courierOfJob(ctx, app, order.shipmentId);
  return {
    id: order.id,
    reference: foodOrderReference(order),
    status: order.status,
    status_label: ctx.t(FOOD_STATUS_KEY(order.status)),
    restaurant: { id: order.restaurantId, name: order.restaurantName },
    customer_name: order.customerName,
    summary: foodSummary(order),
    item_count: order.lines.reduce((n, l) => n + l.quantity, 0),
    total: money(order.totalCents, order.currency),
    payment: { method: order.paymentMethod, paid: order.paymentStatus === "paid", label: ctx.t(card ? "food.payCard" : "food.payCash") },
    distance_km: order.distanceKm,
    placed_at: order.createdAt.toISOString(),
    ready_at: iso(order.readyAt),
    courier: courier && courier.id !== null ? { id: courier.id, name: courier.name } : null,
    shipment_id: order.shipmentId,
    steps: (FOOD_COMPANY_STEPS[order.status] ?? []).map((s) => STEP_OF[s]).filter((s) => s !== undefined),
  };
}

async function foodOrderDetail(ctx: OwnerContext, app: App, order: FoodOrder) {
  const restaurant = order.restaurantId !== null ? await ctx.deps.store.getRestaurant(app.id, order.restaurantId) : null;
  const max = FOOD_LIMITS.maxPrepMinutes;
  return {
    ...(await foodOrderJson(ctx, app, order)),
    lines: order.lines.map((l) => ({ quantity: l.quantity, name: l.name, options: [...l.choices, ...(l.note ? [l.note] : [])], total: money(l.unitCents * l.quantity, order.currency) })),
    subtotal: money(order.subtotalCents, order.currency),
    delivery_fee: money(order.deliveryFeeCents, order.currency),
    customer: { name: order.customerName, phone: order.customerPhone || null, address: [order.dropoff.address, order.dropoff.details].filter(Boolean).join(", "), note: order.notes },
    restaurant_address: restaurant?.address.address ?? null,
    timeline: order.timeline.map((s) => stageJson(ctx, s, FOOD_STATUS_KEY)),
    // A card payment of an order turned down or cancelled is the company's to refund (Dashboard › Paid orders).
    refund_due: order.paymentMethod === "card" && order.paymentStatus === "paid" && (order.status === "rejected" || order.status === "cancelled"),
    prep_choices: PREP_CHOICES.filter((m) => m >= 5 && m <= max),
    rejection_reasons: FOOD_REJECTIONS.map((id) => ({ id, label: ctx.t(`food.reason_${id}` as DashKey) })),
    cash_to_collect: order.paymentMethod === "cash" && order.paymentStatus === "unpaid" && FOOD_ACTIVE.includes(order.status) ? money(order.totalCents, order.currency) : null,
  };
}

export async function listFoodOrders(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "foodOrders");
  const page = paging(ctx.req.query);
  const filter = filterOf<FoodFilter>(ctx, Object.keys(FOOD_FILTERS) as FoodFilter[], "active");
  const q = searchOf(ctx);
  const reference = q ? foodOrderIdOf(q) : null;
  const statuses = FOOD_FILTERS[filter];
  const { store } = ctx.deps;
  const [{ items, total }, fresh, active] = await Promise.all([
    store.listFoodOrders({ appId: app.id, ...(statuses ? { statuses: [...statuses] } : {}), ...(q ? { search: reference ? `F-${reference}` : q } : {}), order: "newest", offset: page.offset, limit: page.perPage }),
    store.listFoodOrders({ appId: app.id, statuses: ["placed"], order: "newest", offset: 0, limit: 1 }),
    store.listFoodOrders({ appId: app.id, statuses: FOOD_ACTIVE, order: "newest", offset: 0, limit: 1 }),
  ]);
  return { status: 200, body: { ...pageJson(page, total), items: await Promise.all(items.map((o) => foodOrderJson(ctx, app, o))), counts: { new: fresh.total, active: active.total } } };
}

async function ownFoodOrder(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "foodOrders");
  const order = await ctx.deps.store.getFoodOrder(app.id, intParam(params.food_order_id));
  if (!order) throw notFound();
  return { app, order };
}

export async function getFoodOrder(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownFoodOrder(ctx, params);
  return { status: 200, body: await foodOrderDetail(ctx, app, order) };
}

/** Dashboard › Food orders' steps (app/actions/food.ts `foodOrderStepAction`), by the company. */
export async function stepFoodOrder(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, order } = await ownFoodOrder(ctx, params);
  const body = bodyObject(ctx.req.body);
  const step = body.step;
  if (step !== "accept" && step !== "reject" && step !== "ready" && step !== "cancel") throw invalid({ step: "The request isn't valid." });
  const note = noteOf(body.note);
  if (typeof body.note === "string" && body.note.trim().length > 300) throw invalid({ note: "Keep it under 300 characters." });
  if (!(FOOD_COMPANY_STEPS[order.status] ?? []).includes(STEP_TO[step])) throw invalidStatus("This order can't move to that stage now.");
  const deps = flowDeps(ctx, app);
  let moved;
  if (step === "accept") {
    const minutes = body.prep_minutes;
    const max = FOOD_LIMITS.maxPrepMinutes;
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 5 || minutes > max) throw invalid({ prep_minutes: `Enter the minutes from 5 to ${max}.` });
    moved = await acceptOrder(deps, order, minutes, "company");
  } else if (step === "reject") {
    const reason = FOOD_REJECTIONS.find((r) => r === body.reason);
    if (!reason) throw invalid({ reason: "Choose why it can't be taken." });
    moved = await rejectOrder(deps, order, reason, note, "company");
  } else if (step === "ready") {
    moved = await readyOrder(deps, order, "company");
  } else {
    moved = await cancelOrder(deps, order, "company", note);
  }
  if (!moved.ok) throw changed("This order changed meanwhile. Reload the page.");
  await recordStudio(ctx, app, `food_order.${step}`, { type: "food_order", id: order.id }, `Moved food order ${foodOrderReference(order)} to ${STEP_TO[step]}`);
  return { status: 200, body: await foodOrderDetail(ctx, app, (await ctx.deps.store.getFoodOrder(app.id, order.id)) ?? moved.order) };
}

// Restaurants

async function foodTimezone(ctx: OwnerContext, app: App): Promise<string> {
  return deliverySettingsOf(await ctx.deps.store.getDeliverySettings(app.id)).timezone ?? DEFAULT_FOOD_TIMEZONE;
}

function restaurantJson(ctx: OwnerContext, r: Restaurant, timezone: string) {
  const { now } = ctx.deps;
  const state = restaurantState(r, timezone, now);
  const label = !r.active || r.paused ? ctx.t("food.paused") : state.busy ? ctx.t("food.busyNow") : state.open ? ctx.t("food.openNow") : ctx.t("food.closedNow");
  return {
    id: r.id,
    name: r.name,
    active: r.active,
    open: state.open && r.paused !== true,
    busy_until: state.busy ? iso(r.busyUntil) : null,
    delayed: activeDelay(r, now) !== null,
    opens_at: iso(state.opensAt),
    state_label: label,
  };
}

export async function listRestaurants(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "restaurants");
  const [all, timezone] = await Promise.all([ctx.deps.store.listRestaurants(app.id), foodTimezone(ctx, app)]);
  return { status: 200, body: { items: [...all].sort((a, b) => a.position - b.position || a.id - b.id).map((r) => restaurantJson(ctx, r, timezone)) } };
}

async function changeRestaurant(ctx: OwnerContext, params: Record<string, string>, which: "open" | "end_delay"): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "restaurants");
  const { store, now } = ctx.deps;
  const restaurant = await store.getRestaurant(app.id, intParam(params.restaurant_id));
  if (!restaurant) throw notFound();
  // openRestaurantAction clears the busy time; endDelayAction the running-late notice.
  await store.updateRestaurant(app.id, restaurant.id, which === "open" ? { busyUntil: null } : { delay: null }, now);
  await recordStudio(ctx, app, which === "open" ? "restaurant.open" : "restaurant.end_delay", { type: "restaurant", id: restaurant.id }, which === "open" ? `Opened ${restaurant.name} for new orders` : `Ended the delay notice of ${restaurant.name}`);
  return { status: 200, body: restaurantJson(ctx, (await store.getRestaurant(app.id, restaurant.id))!, await foodTimezone(ctx, app)) };
}

export const openRestaurant = (ctx: OwnerContext, params: Record<string, string>) => changeRestaurant(ctx, params, "open");
export const endRestaurantDelay = (ctx: OwnerContext, params: Record<string, string>) => changeRestaurant(ctx, params, "end_delay");

// Shipments and couriers

const SHIPMENT_STATUS_KEY = (status: string) => `delivery.status_${status}` as DashKey;
const SHIPMENT_FILTERS = {
  waiting: ["pending"],
  active: ACTIVE_STATUSES,
  done: ["delivered"],
  problems: ["failed", "cancelled"],
  all: null,
} as const satisfies Record<string, readonly ShipmentStatus[] | null>;
type ShipmentFilter = keyof typeof SHIPMENT_FILTERS;

function lastStageAt(timeline: { at: string }[], fallback: Date): Date {
  const last = timeline.at(-1);
  return last ? new Date(last.at) : fallback;
}

function shipmentJson(ctx: OwnerContext, s: Shipment) {
  const cash = s.paymentMethod === "cash";
  return {
    id: s.id,
    reference: shipmentReference(s),
    status: s.status,
    status_label: ctx.t(SHIPMENT_STATUS_KEY(s.status)),
    pickup: { name: s.senderName, address: s.pickup.address },
    dropoff: { name: s.recipientName, address: s.dropoff.address },
    distance_km: s.distanceKm,
    price: money(s.priceCents, s.currency),
    payment: { method: s.paymentMethod, label: ctx.t(cash ? "delivery.payCash" : "delivery.payCard") },
    collect: cash && s.paymentStatus === "unpaid" ? money(s.priceCents, s.currency) : null,
    courier: s.courierName ? { id: s.courierId, name: s.courierName } : null,
    food_order: s.foodOrderId ? { id: s.foodOrderId, reference: foodOrderReference({ id: s.foodOrderId }) } : null,
    created_at: s.createdAt.toISOString(),
    waiting_minutes: s.status === "pending" ? minutesSince(lastStageAt(s.timeline, s.updatedAt), ctx.deps.now) : null,
    statuses: COMPANY_STEPS[s.status] ?? [],
    assignable: s.status === "pending" || s.status === "assigned",
  };
}

function shipmentDetail(ctx: OwnerContext, s: Shipment) {
  return {
    ...shipmentJson(ctx, s),
    timeline: s.timeline.map((stage) => stageJson(ctx, stage, SHIPMENT_STATUS_KEY)),
    note: s.notes,
    recipient: { name: s.recipientName, phone: s.recipientPhone || null },
  };
}

export async function listShipments(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "shipments");
  const page = paging(ctx.req.query);
  const filter = filterOf<ShipmentFilter>(ctx, Object.keys(SHIPMENT_FILTERS) as ShipmentFilter[], "active");
  const q = searchOf(ctx);
  const reference = q ? shipmentIdOf(q) : null;
  const statuses = SHIPMENT_FILTERS[filter];
  const { store, now } = ctx.deps;
  const [{ items, total }, settings] = await Promise.all([
    store.listShipments({ appId: app.id, ...(statuses ? { statuses: [...statuses] } : {}), ...(q ? { search: reference ? `S-${reference}` : q } : {}), order: "newest", offset: page.offset, limit: page.perPage }),
    store.getDeliverySettings(app.id).then(deliverySettingsOf),
  ]);
  const board = await deliveryBoard(store, app, settings, now);
  return {
    status: 200,
    body: { ...pageJson(page, total), items: items.map((s) => shipmentJson(ctx, s)), counts: { on_duty: board.counts.onDuty, on_the_way: board.counts.onTheWay, waiting: board.counts.waiting, today: board.counts.today } },
  };
}

async function ownShipment(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "shipments");
  const shipment = await ctx.deps.store.getShipment(app.id, intParam(params.shipment_id));
  if (!shipment) throw notFound();
  return { app, shipment };
}

export async function getShipment(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { shipment } = await ownShipment(ctx, params);
  return { status: 200, body: shipmentDetail(ctx, shipment) };
}

/** Dashboard › Shipments' "Give to a courier" (app/actions/delivery.ts `assignShipmentAction`). */
export async function assignOneShipment(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, shipment } = await ownShipment(ctx, params);
  const { store } = ctx.deps;
  const courierId = idFrom(bodyObject(ctx.req.body).courier_id);
  const courier = courierId !== null ? await store.getCourier(app.id, courierId) : null;
  if (!courier || !courier.active || courier.driver) throw invalid({ courier_id: "Choose one of your active couriers." });
  if (shipment.status !== "pending" && shipment.status !== "assigned") throw invalidStatus("Only a shipment waiting for a courier, or not picked up yet, can be given to a courier.");
  // 104.7 The store review account's parcels go to the review courier only, and it gets no others.
  if (!courierMayHave(app, courier, shipment, await reviewUserId(store, app))) throw invalid({ courier_id: "The store review courier only gets the store review account's parcels." });
  const moved = await assignShipment(flowDeps(ctx, app), shipment, courier, "company");
  if (!moved.ok) throw changed("This shipment changed meanwhile. Reload the page.");
  await recordStudio(ctx, app, "shipment.assign", { type: "shipment", id: shipment.id }, `Gave shipment ${shipmentReference(shipment)} to ${courier.name}`);
  return { status: 200, body: shipmentDetail(ctx, (await store.getShipment(app.id, shipment.id)) ?? moved.shipment) };
}

/** Dashboard › Shipments' next stage (app/actions/delivery.ts `moveShipmentAction`). */
export async function moveOneShipment(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, shipment } = await ownShipment(ctx, params);
  const body = bodyObject(ctx.req.body);
  const status = SHIPMENT_STATUSES.find((s) => s === body.status);
  if (!status) throw invalid({ status: "The request isn't valid." });
  if (typeof body.note === "string" && body.note.trim().length > 300) throw invalid({ note: "Keep it under 300 characters." });
  if (!(COMPANY_STEPS[shipment.status] ?? []).includes(status)) throw invalidStatus("This shipment can't move to that stage now.");
  const moved = await moveShipment(flowDeps(ctx, app), shipment, status, "company", noteOf(body.note));
  if (!moved.ok) throw changed("This shipment changed meanwhile. Reload the page.");
  await recordStudio(ctx, app, "shipment.move", { type: "shipment", id: shipment.id }, `Moved shipment ${shipmentReference(shipment)} to ${status}`);
  return { status: 200, body: shipmentDetail(ctx, (await ctx.deps.store.getShipment(app.id, shipment.id)) ?? moved.shipment) };
}

function freshAt(c: Courier, now: Date, minutes: number): { lat: number; lng: number } | null {
  return c.lat !== null && c.lng !== null && c.locatedAt && c.locatedAt.getTime() >= now.getTime() - minutes * 60_000 ? { lat: c.lat, lng: c.lng } : null;
}

const round1 = (km: number) => Math.round(km * 10) / 10;

/** The couriers (never a ride app's drivers), on duty first, then nearest to the shipment's pickup, then by name. */
export async function listCouriers(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "shipments");
  const { store, now } = ctx.deps;
  const raw = ctx.req.query.get("shipment_id");
  let shipment: Shipment | null = null;
  if (raw !== null && raw !== "") {
    const id = idFrom(raw);
    if (id === null) throw invalid({ shipment_id: "The request isn't valid." });
    shipment = await store.getShipment(app.id, id);
    if (!shipment) throw notFound();
  }
  const [couriers, busy, reviewId] = await Promise.all([
    store.listCouriers(app.id),
    store.listShipments({ appId: app.id, statuses: COURIER_ACTIVE, order: "oldest", offset: 0, limit: 2000 }),
    shipment ? reviewUserId(store, app) : Promise.resolve(null),
  ]);
  const jobs = new Map<number, number>();
  for (const s of busy.items) if (s.courierId !== null) jobs.set(s.courierId, (jobs.get(s.courierId) ?? 0) + 1);
  const pickup = shipment && shipment.pickup.lat !== null && shipment.pickup.lng !== null ? { lat: shipment.pickup.lat, lng: shipment.pickup.lng } : null;
  const items = couriers
    .filter((c) => !c.driver && (!shipment || courierMayHave(app, c, shipment, reviewId)))
    .map((c) => {
      const at = pickup ? freshAt(c, now, LOCATION_FRESH_MINUTES) : null;
      const activeJobs = jobs.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        initials: initials(c.name),
        phone: c.phone,
        active: c.active,
        on_duty: c.onDuty,
        active_jobs: activeJobs,
        distance_km: at && pickup ? round1(exactKm(at, pickup)) : null,
        state: !c.active ? ("paused" as const) : !c.onDuty ? ("off" as const) : activeJobs > 0 ? ("busy" as const) : ("free" as const),
      };
    })
    .sort((a, b) => Number(b.active && b.on_duty) - Number(a.active && a.on_duty) || (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9) || a.name.localeCompare(b.name));
  return { status: 200, body: { items } };
}

// Rides and drivers

const RIDE_STATUS_KEY = (status: string) => `rides.status_${status}` as DashKey;
const RIDE_FILTERS = {
  now: RIDE_ACTIVE.filter((s) => s !== "scheduled"),
  scheduled: ["scheduled"],
  done: ["completed"],
  problems: ["cancelled", "no_driver"],
  all: null,
} as const satisfies Record<string, readonly RideStatus[] | null>;
type RideFilter = keyof typeof RIDE_FILTERS;
const GIVABLE: RideStatus[] = ["searching", "accepted", "arrived"];
const CANCELLABLE: RideStatus[] = ["scheduled", "searching", "accepted", "arrived", "in_progress"];

function carOf(driver: Courier | null): string | null {
  const d = driver?.driver;
  if (!d) return null;
  return [d.carColor, d.carModel].filter(Boolean).join(" ") || null;
}

function rideJson(ctx: OwnerContext, ride: Ride, driver: Courier | null) {
  const { now } = ctx.deps;
  const started = ride.status === "in_progress" ? ride.timeline.findLast((s) => s.status === "in_progress") : undefined;
  return {
    id: ride.id,
    reference: rideReference(ride),
    status: ride.status,
    status_label: ctx.t(RIDE_STATUS_KEY(ride.status)),
    vehicle_type: ride.vehicleTypeName || null,
    pickup: { name: placeName(ride.pickup.address), address: ride.pickup.address },
    dropoff: { name: placeName(ride.dropoff.address), address: ride.dropoff.address },
    distance_km: ride.fareMode === "metered" && ride.meterKm >= 0.1 ? round1(ride.meterKm) : ride.estimateKm,
    quoted: money(ride.quotedCents, ride.currency),
    final: ride.finalCents !== null ? money(ride.finalCents, ride.currency) : null,
    rider_name: ride.riderName,
    payment_label: ctx.t(ride.paymentMethod === "cash" ? "rides.payCash" : "food.payCard"),
    driver: ride.driverName ? { id: ride.driverId, name: ride.driverName, phone: driver?.phone ?? null, plate: driver?.driver?.plate ?? null, vehicle: carOf(driver) } : null,
    searching_minutes: ride.status === "searching" ? minutesSince(ride.searchingSince ?? lastStageAt(ride.timeline, ride.updatedAt), now) : null,
    scheduled_for: iso(ride.scheduledAt),
    eta: started ? new Date(new Date(started.at).getTime() + ride.estimateMinutes * 60_000).toISOString() : null,
    givable: GIVABLE.includes(ride.status),
    cancellable: CANCELLABLE.includes(ride.status),
    updated_at: ride.updatedAt.toISOString(),
  };
}

function rideDetail(ctx: OwnerContext, ride: Ride, driver: Courier | null) {
  return { ...rideJson(ctx, ride, driver), timeline: ride.timeline.map((s) => stageJson(ctx, s, RIDE_STATUS_KEY)) };
}

export async function listRides(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "rides");
  const page = paging(ctx.req.query);
  const filter = filterOf<RideFilter>(ctx, Object.keys(RIDE_FILTERS) as RideFilter[], "now");
  const q = searchOf(ctx);
  const reference = q ? rideIdOf(q) : null;
  const statuses = RIDE_FILTERS[filter];
  const { store, now } = ctx.deps;
  const [{ items, total }, couriers, settings] = await Promise.all([
    store.listRides({ appId: app.id, ...(statuses ? { statuses: [...statuses] } : {}), ...(q ? { search: reference ? `R-${reference}` : q } : {}), order: "newest", offset: page.offset, limit: page.perPage }),
    store.listCouriers(app.id),
    store.getDeliverySettings(app.id).then(deliverySettingsOf),
  ]);
  const board = await liveBoard(store, app, settings, now);
  const byId = new Map(couriers.map((c) => [c.id, c]));
  return {
    status: 200,
    body: {
      ...pageJson(page, total),
      items: items.map((r) => rideJson(ctx, r, r.driverId !== null ? (byId.get(r.driverId) ?? null) : null)),
      counts: { free: board.counts.free, on_ride: board.counts.onRide, searching: board.counts.searching, today: board.counts.today },
    },
  };
}

async function ownRide(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "rides");
  const ride = await ctx.deps.store.getRide(app.id, intParam(params.ride_id));
  if (!ride) throw notFound();
  return { app, ride };
}

async function rideAnswer(ctx: OwnerContext, app: App, id: number, fallback: Ride): Promise<OwnerResult> {
  const ride = (await ctx.deps.store.getRide(app.id, id)) ?? fallback;
  const driver = ride.driverId !== null ? await ctx.deps.store.getCourier(app.id, ride.driverId) : null;
  return { status: 200, body: rideDetail(ctx, ride, driver) };
}

export async function getRide(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, ride } = await ownRide(ctx, params);
  return rideAnswer(ctx, app, ride.id, ride);
}

/** Dashboard › Rides' "Give to a driver" (app/actions/rides.ts `assignRideAction`). */
export async function assignOneRide(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, ride } = await ownRide(ctx, params);
  const { store } = ctx.deps;
  const driverId = idFrom(bodyObject(ctx.req.body).driver_id);
  const driver = driverId !== null ? await store.getCourier(app.id, driverId) : null;
  if (!driver || !driver.active) throw invalid({ driver_id: "Choose one of your active drivers." });
  if (!GIVABLE.includes(ride.status)) throw invalidStatus("Only a ride looking for a driver, or not started yet, can be given to a driver.");
  if (!driverMayHave(app, driver, ride, await reviewUserId(store, app))) throw invalid({ driver_id: "The store review driver only gets the store review account's rides." });
  const busy = await store.listRides({ appId: app.id, driverId: driver.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 1 });
  if (busy.items.some((r) => r.id !== ride.id)) throw invalid({ driver_id: "This driver is on another ride." });
  const moved = await assignRide(flowDeps(ctx, app), ride, driver);
  if (!moved.ok) throw changed("This ride changed meanwhile. Reload the page.");
  await recordStudio(ctx, app, "ride.assign", { type: "ride", id: ride.id }, `Gave ride ${rideReference(ride)} to ${driver.name}`);
  return rideAnswer(ctx, app, ride.id, moved.ride);
}

/** Dashboard › Rides' "Cancel the ride" (app/actions/rides.ts `cancelRideAction`, no fee). */
export async function cancelOneRide(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, ride } = await ownRide(ctx, params);
  const body = bodyObject(ctx.req.body);
  if (typeof body.note === "string" && body.note.trim().length > 300) throw invalid({ note: "Keep it under 300 characters." });
  if (!CANCELLABLE.includes(ride.status)) throw invalidStatus("This ride can't be cancelled now.");
  const moved = await cancelByCompany(flowDeps(ctx, app), ride, noteOf(body.note));
  if (!moved.ok) throw changed("This ride changed meanwhile. Reload the page.");
  await recordStudio(ctx, app, "ride.cancel", { type: "ride", id: ride.id }, `Cancelled ride ${rideReference(ride)}`);
  return rideAnswer(ctx, app, ride.id, moved.ride);
}

/** The drivers, ranked as the dashboard's ride page ranks them: free and online of the ride's type first, nearest first. */
export async function listDrivers(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "rides");
  const { store } = ctx.deps;
  const raw = ctx.req.query.get("ride_id");
  let ride: Ride | null = null;
  if (raw !== null && raw !== "") {
    const id = idFrom(raw);
    if (id === null) throw invalid({ ride_id: "The request isn't valid." });
    ride = await store.getRide(app.id, id);
    if (!ride) throw notFound();
  }
  const [couriers, busy, types] = await Promise.all([
    store.listCouriers(app.id),
    store.listRides({ appId: app.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 2000 }),
    store.listVehicleTypes(app.id),
  ]);
  const onRide = new Set(busy.items.filter((r) => !ride || r.id !== ride.id).map((r) => r.driverId));
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const pickup = ride && ride.pickup.lat !== null && ride.pickup.lng !== null ? { lat: ride.pickup.lat, lng: ride.pickup.lng } : null;
  const items = couriers
    .filter((c) => c.driver)
    .map((c) => {
      const d = c.driver!;
      const state = !c.active ? ("suspended" as const) : onRide.has(c.id) ? ("on_ride" as const) : c.onDuty ? ("free" as const) : ("offline" as const);
      const km = pickup && c.onDuty && c.lat !== null && c.lng !== null ? round1(exactKm({ lat: c.lat, lng: c.lng }, pickup)) : null;
      const sameType = ride !== null && d.vehicleTypeId !== null && d.vehicleTypeId === ride.vehicleTypeId;
      // The dashboard's rank: online before offline, of the ride's type first; on a ride and paused drivers can't take it.
      const rank = state === "free" || state === "offline" ? (c.onDuty ? 0 : 2) + (sameType ? 0 : 1) : state === "on_ride" ? 4 : 5;
      return {
        rank,
        json: {
          id: c.id,
          name: c.name,
          initials: initials(c.name),
          phone: c.phone,
          vehicle: d.plate || d.carModel || d.vehicleTypeId !== null ? { plate: d.plate, model: [d.carColor, d.carModel].filter(Boolean).join(" ") || null, type: d.vehicleTypeId !== null ? (typeName.get(d.vehicleTypeId) ?? null) : null } : null,
          state,
          distance_km: km,
          same_type: sameType,
        },
      };
    })
    .sort((a, b) => a.rank - b.rank || (a.json.distance_km ?? 1e9) - (b.json.distance_km ?? 1e9) || a.json.name.localeCompare(b.json.name))
    .map((x) => x.json);
  return { status: 200, body: { items } };
}
