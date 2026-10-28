import type { FoodOrder, FoodOrderStage, FoodRejection, Shipment } from "../data/types";
import { announceWaiting, moveShipment, notifyDeps, settingsOf, type FlowDeps } from "../delivery/flow";
import { stage } from "../delivery/service";
import { tellFoodCustomer, tellRestaurant } from "./notify";
import { DEFAULT_FOOD_TIMEZONE, foodOrderReference, foodStage } from "./service";

/**
 * 105.1 How a food order moves: the restaurant accepts it (with the minutes
 * it needs) or turns it down, marks it ready; the courier job is made when
 * the company chose (`DeliverySettings.foodCourierJob`), then the order
 * follows the job (lib/food/sync.ts). Each change is made only while the
 * order is still where the mover saw it.
 */

export type FoodMoveResult = { ok: true; order: FoodOrder } | { ok: false; reason: "changed" };

async function timezoneOf(deps: FlowDeps): Promise<string> {
  return (await settingsOf(deps)).timezone ?? DEFAULT_FOOD_TIMEZONE;
}

/** A new order reached the restaurant (paid by card, or cash): the customer and the restaurant hear of it. */
export async function announceOrder(deps: FlowDeps, order: FoodOrder): Promise<void> {
  const n = notifyDeps(deps);
  await tellFoodCustomer(n, order, await timezoneOf(deps));
  await tellRestaurant(n, order);
}

async function move(deps: FlowDeps, order: FoodOrder, patch: Partial<FoodOrder> & { status: FoodOrder["status"] }, by: FoodOrderStage["by"], note: string | null = null): Promise<FoodMoveResult> {
  const full = { ...patch, timeline: [...order.timeline, foodStage(patch.status, deps.now, by, note)], updatedAt: deps.now };
  if (!(await deps.store.updateFoodOrder(deps.app.id, order.id, full, { statuses: [order.status] }))) return { ok: false, reason: "changed" };
  return { ok: true, order: { ...order, ...full } };
}

/** The courier job that delivers the order: from the restaurant to the customer, cash to collect when it is unpaid. */
export async function makeCourierJob(deps: FlowDeps, order: FoodOrder): Promise<Shipment | null> {
  if (order.shipmentId !== null || order.restaurantId === null) return null;
  const restaurant = await deps.store.getRestaurant(deps.app.id, order.restaurantId);
  if (!restaurant) return null;
  const settings = await settingsOf(deps);
  const shipment = await deps.store.createShipment({
    appId: deps.app.id,
    userId: order.userId,
    senderName: restaurant.name,
    senderPhone: restaurant.phone,
    serviceId: null,
    serviceName: null,
    pickup: restaurant.address,
    dropoff: order.dropoff,
    zoneId: order.zoneId,
    zoneName: settings.zones.find((z) => z.id === order.zoneId)?.name ?? null,
    distanceKm: order.distanceKm,
    packageSize: "small",
    packageDescription: `Food order ${foodOrderReference(order)}`,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    notes: order.notes,
    // What the courier collects in cash: the whole order.
    priceCents: order.totalCents,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderId: null,
    status: "pending",
    courierId: null,
    courierName: null,
    timeline: [stage("pending", deps.now, "company")],
    lang: order.lang,
    foodOrderId: order.id,
    createdAt: deps.now,
    updatedAt: deps.now,
  });
  await deps.store.updateFoodOrder(deps.app.id, order.id, { shipmentId: shipment.id, updatedAt: deps.now });
  await announceWaiting(deps, shipment);
  return shipment;
}

/** The restaurant accepts a new order with the minutes it needs. */
export async function acceptOrder(deps: FlowDeps, order: FoodOrder, prepMinutes: number, by: FoodOrderStage["by"]): Promise<FoodMoveResult> {
  if (order.status !== "placed") return { ok: false, reason: "changed" };
  const moved = await move(deps, order, { status: "accepted", readyAt: new Date(deps.now.getTime() + prepMinutes * 60_000) }, by);
  if (!moved.ok) return moved;
  await tellFoodCustomer(notifyDeps(deps), moved.order, await timezoneOf(deps));
  if (((await settingsOf(deps)).foodCourierJob ?? "accepted") === "accepted") {
    const job = await makeCourierJob(deps, moved.order);
    if (job) moved.order.shipmentId = job.id;
  }
  return moved;
}

/** The restaurant turns a new order down; a card payment is the company's to refund. */
export async function rejectOrder(deps: FlowDeps, order: FoodOrder, reason: FoodRejection, note: string | null, by: FoodOrderStage["by"]): Promise<FoodMoveResult> {
  if (order.status !== "placed") return { ok: false, reason: "changed" };
  const moved = await move(deps, order, { status: "rejected", rejection: { reason, note } }, by, note);
  if (moved.ok) await tellFoodCustomer(notifyDeps(deps), moved.order, await timezoneOf(deps));
  return moved;
}

/** The order is ready for the courier; its job is made now when the company makes them once orders are ready. */
export async function readyOrder(deps: FlowDeps, order: FoodOrder, by: FoodOrderStage["by"]): Promise<FoodMoveResult> {
  if (order.status !== "accepted") return { ok: false, reason: "changed" };
  const moved = await move(deps, order, { status: "ready" }, by);
  if (!moved.ok) return moved;
  if (moved.order.shipmentId === null) {
    const job = await makeCourierJob(deps, moved.order);
    if (job) moved.order.shipmentId = job.id;
  }
  return moved;
}

/** Cancels the order (the customer before it is accepted, the company until it is picked up), and its courier job. */
export async function cancelOrder(deps: FlowDeps, order: FoodOrder, by: FoodOrderStage["by"], note: string | null = null): Promise<FoodMoveResult> {
  if (!["awaiting_payment", "placed", "accepted", "ready", "failed"].includes(order.status)) return { ok: false, reason: "changed" };
  const moved = await move(deps, order, { status: "cancelled" }, by, note);
  if (!moved.ok) return moved;
  if (order.shipmentId !== null) {
    const job = await deps.store.getShipment(deps.app.id, order.shipmentId);
    if (job && ["pending", "assigned", "failed"].includes(job.status)) await moveShipment(deps, job, "cancelled", "company", "The food order was cancelled.");
  }
  await tellFoodCustomer(notifyDeps(deps), moved.order, await timezoneOf(deps));
  return moved;
}
