import type { DataStore } from "../data/store";
import type { App, CatalogOrder, MarketOrder, MarketOrderStage, MarketOrderStatus, Shipment } from "../data/types";
import { announceWaiting, moveShipment, settingsOf, type FlowDeps } from "../delivery/flow";
import { stage } from "../delivery/service";
import { cashCollector } from "./payments";
import { marketOrderReference } from "./json";
import { priceOrder, type Tax } from "./money";
import { commissionOfVendor } from "./cart";
import { returnToWallet } from "./offers";

/**
 * 115 How a marketplace order moves. The customer places it (cash, the
 * wallet, or online: then it waits for its payment); the vendor accepts it
 * with the minutes it needs, or turns it down; groceries and shops pick it
 * (each line picked, weighed, swapped for the customer's choice or left
 * out, never above the agreed tolerance); it is ready, then handed over to
 * the app's courier (104's job, followed on the map), the vendor's own driver
 * (followed by stages) or the customer at pick-up (with the code). Each move
 * is made only while the order is still where the mover saw it. A cancelled
 * or turned-down order gives back what the wallet paid and its coupon's use.
 */

export type MoveResult = { ok: true; order: MarketOrder } | { ok: false; reason: "changed" | "invalid"; error?: string };

export const CUSTOMER_CANCELLABLE: MarketOrderStatus[] = ["awaiting_payment", "scheduled", "placed"];
export const VENDOR_NEW: MarketOrderStatus[] = ["placed"];
export const VENDOR_ACTIVE: MarketOrderStatus[] = ["accepted", "picking", "ready"];
export const VENDOR_DONE: MarketOrderStatus[] = ["on_the_way", "delivered", "picked_up", "rejected", "cancelled"];
export const MARKET_ACTIVE: MarketOrderStatus[] = ["awaiting_payment", "scheduled", "placed", "accepted", "picking", "ready", "on_the_way"];

export function marketStage(status: MarketOrderStatus, now: Date, by: MarketOrderStage["by"]): MarketOrderStage {
  return { status, at: now.toISOString(), by };
}

async function move(store: DataStore, order: MarketOrder, patch: Partial<MarketOrder> & { status: MarketOrderStatus }, by: MarketOrderStage["by"], now: Date): Promise<MoveResult> {
  const full = { ...patch, timeline: [...order.timeline, marketStage(patch.status, now, by)], updatedAt: now };
  if (!(await store.updateMarketOrder(order.appId, order.id, full, { statuses: [order.status] }))) return { ok: false, reason: "changed" };
  return { ok: true, order: { ...order, ...full } };
}

/** Gives back what an order that won't be made took: the wallet's part and the coupon's use. */
async function giveBack(store: DataStore, order: MarketOrder, now: Date): Promise<void> {
  if (order.userId !== null && order.money.wallet > 0) await returnToWallet(store, { appId: order.appId, userId: order.userId, orderId: order.id, amount: order.money.wallet }, now);
  if (order.couponCode || order.money.coupon) {
    for (const c of await store.listMarketCoupons(order.appId)) await store.releaseMarketCouponUse(order.appId, c.id, order.id);
  }
}

/** The app's courier job that carries the order: from the vendor to the customer, cash to collect when unpaid. */
export async function makeMarketCourierJob(deps: FlowDeps, order: MarketOrder): Promise<Shipment | null> {
  if (order.shipmentId !== null || order.vendorId === null || order.fulfilment !== "delivery" || order.deliveryBy !== "app" || !order.dropoff) return null;
  const vendor = await deps.store.getRestaurant(deps.app.id, order.vendorId);
  if (!vendor) return null;
  const settings = await settingsOf(deps);
  const unpaid = order.paymentStatus === "unpaid" && order.paymentMethod === "cash";
  const shipment = await deps.store.createShipment({
    appId: deps.app.id,
    userId: order.userId,
    senderName: vendor.name,
    senderPhone: vendor.phone,
    serviceId: null,
    serviceName: null,
    pickup: vendor.address,
    dropoff: order.dropoff,
    zoneId: null,
    zoneName: null,
    distanceKm: order.distanceKm,
    packageSize: "small",
    packageDescription: `Order ${marketOrderReference(order)}`,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    notes: order.notes,
    priceCents: unpaid ? order.money.payNow : 0,
    currency: settings.currency,
    paymentMethod: unpaid ? "cash" : "card",
    paymentStatus: unpaid ? "unpaid" : "paid",
    orderId: null,
    status: "pending",
    courierId: null,
    courierName: null,
    timeline: [stage("pending", deps.now, "company")],
    lang: order.lang,
    foodOrderId: null,
    createdAt: deps.now,
    updatedAt: deps.now,
  });
  await deps.store.updateMarketOrder(deps.app.id, order.id, { shipmentId: shipment.id, updatedAt: deps.now });
  await announceWaiting(deps, shipment).catch(() => undefined);
  return shipment;
}

/** The vendor accepts a new order with the minutes it needs; groceries and shops then pick it. */
export async function acceptMarketOrder(deps: FlowDeps, order: MarketOrder, prepMinutes: number): Promise<MoveResult> {
  if (order.status !== "placed") return { ok: false, reason: "changed" };
  const picking = order.vendorKind !== "restaurant";
  const moved = await move(deps.store, order, { status: picking ? "picking" : "accepted", prepMinutes, readyAt: new Date(deps.now.getTime() + prepMinutes * 60_000) }, "vendor", deps.now);
  if (!moved.ok) return moved;
  const job = await makeMarketCourierJob(deps, moved.order);
  if (job) moved.order.shipmentId = job.id;
  return moved;
}

export const VENDOR_REJECTIONS = ["closing", "too_busy", "items_unavailable", "outside_area", "other"] as const;

/** The vendor turns a new order down: the wallet's part and the coupon come back; an online payment is the owner's to refund. */
export async function rejectMarketOrder(deps: FlowDeps, order: MarketOrder, reason: (typeof VENDOR_REJECTIONS)[number], note: string | null): Promise<MoveResult> {
  if (order.status !== "placed") return { ok: false, reason: "changed" };
  const moved = await move(deps.store, order, { status: "rejected", rejection: { reason, note } }, "vendor", deps.now);
  if (moved.ok) await giveBack(deps.store, moved.order, deps.now);
  return moved;
}

/** Cancels the order: the customer before the vendor accepted it, the owner any time before it left. */
export async function cancelMarketOrder(deps: FlowDeps, order: MarketOrder, by: "customer" | "owner"): Promise<MoveResult> {
  const allowed: MarketOrderStatus[] = by === "customer" ? CUSTOMER_CANCELLABLE : [...CUSTOMER_CANCELLABLE, "accepted", "picking", "ready"];
  if (!allowed.includes(order.status)) return { ok: false, reason: "changed" };
  const moved = await move(deps.store, order, { status: "cancelled" }, by, deps.now);
  if (!moved.ok) return moved;
  await giveBack(deps.store, moved.order, deps.now);
  if (order.shipmentId !== null) {
    const job = await deps.store.getShipment(deps.app.id, order.shipmentId);
    if (job && ["pending", "assigned", "failed"].includes(job.status)) await moveShipment(deps, job, "cancelled", "company", "The order was cancelled.").catch(() => undefined);
  }
  return moved;
}

export interface PickedLine {
  lineId: number;
  outcome: "picked" | "substituted" | "missing";
  pickedQuantity: number | null;
  substitute: { productId: number; quantity: number } | null;
}

/** A grocery's or shop's picking: each line picked (weighed), swapped or left out; the order priced again, never above the agreed tolerance. */
export async function pickMarketOrder(store: DataStore, order: MarketOrder, picked: PickedLine[], tolerancePercent: number, tax: Tax | null, now: Date): Promise<MoveResult> {
  if (order.status !== "picking" && order.status !== "accepted") return { ok: false, reason: "changed" };
  const lines = order.lines.map((l) => ({ ...l }));
  for (const p of picked) {
    const line = lines.find((l) => l.id === p.lineId);
    if (!line) return { ok: false, reason: "invalid", error: "One of the lines isn't on this order." };
    if (p.outcome === "missing") {
      Object.assign(line, { outcome: "missing", pickedQuantity: 0, substitute: null, total: 0 });
      continue;
    }
    if (p.outcome === "substituted") {
      if (line.ifMissing === "remove") return { ok: false, reason: "invalid", error: "The customer asked to leave this one out if it's missing." };
      if (!p.substitute) return { ok: false, reason: "invalid", error: "Choose what you're bringing instead." };
      if (line.ifMissing === "chosen" && p.substitute.productId !== line.substituteProductId) return { ok: false, reason: "invalid", error: "Bring the item the customer chose." };
      const sub = await store.getMarketProduct(order.appId, p.substitute.productId);
      if (!sub || sub.vendorId !== order.vendorId) return { ok: false, reason: "invalid", error: "That item isn't sold here." };
      // Never more than what was agreed for the line.
      const total = Math.min(Math.round(sub.price * p.substitute.quantity + 1e-9), line.total);
      Object.assign(line, { outcome: "substituted", pickedQuantity: 0, substitute: { productId: sub.id, name: sub.name, quantity: p.substitute.quantity, total }, total });
      continue;
    }
    const quantity = p.pickedQuantity ?? line.quantity;
    if (quantity <= 0) return { ok: false, reason: "invalid", error: "Enter what you picked." };
    const exact = Math.round(line.unitPrice * quantity + 1e-9);
    const cap = Math.round((line.unitPrice * line.quantity * (100 + tolerancePercent)) / 100 + 1e-9);
    Object.assign(line, { outcome: "picked", pickedQuantity: quantity, substitute: null, total: Math.min(exact, cap) });
  }
  // The money again from the picked lines, keeping the coupon, club, delivery and tax as they were.
  const m = order.money;
  const vendor = order.vendorId !== null ? await store.getRestaurant(order.appId, order.vendorId) : null;
  const items = lines.map((l) => ({ unitPrice: l.total, wasUnitPrice: null, quantity: 1 }));
  const money = priceOrder({
    items,
    deliveryFee: m.delivery,
    deliveryBy: order.deliveryBy,
    commission: vendor ? commissionOfVendor(vendor) : { kind: "fixed", value: m.split.commission },
    // The coupon keeps what it took off (never more than the items now), the club its share of the delivery.
    coupon: m.coupon ? (m.coupon.onDelivery > 0 ? { kind: "free_delivery", value: 0, funder: m.coupon.funder } : { kind: "amount", value: m.coupon.onItems, funder: m.coupon.funder }) : null,
    club: m.club > 0 ? (m.club >= m.delivery ? { kind: "free_delivery" } : { kind: "delivery_percent", value: (m.club * 100) / Math.max(1, m.delivery) }) : null,
    tax,
    tip: m.tip,
    wallet: m.wallet,
    collectedBy: m.split.collectedBy,
    courierCharge: m.split.courierCharge ?? 0,
  });
  const patch = { lines, money, updatedAt: now };
  if (!(await store.updateMarketOrder(order.appId, order.id, patch, { statuses: [order.status] }))) return { ok: false, reason: "changed" };
  return { ok: true, order: { ...order, ...patch } };
}

/** The order is ready: for the courier, the vendor's driver or the customer. */
export async function readyMarketOrder(deps: FlowDeps, order: MarketOrder): Promise<MoveResult> {
  if (order.status !== "accepted" && order.status !== "picking") return { ok: false, reason: "changed" };
  const moved = await move(deps.store, order, { status: "ready", readyAt: deps.now }, "vendor", deps.now);
  if (!moved.ok) return moved;
  if (moved.order.shipmentId === null) {
    const job = await makeMarketCourierJob(deps, moved.order);
    if (job) moved.order.shipmentId = job.id;
  }
  return moved;
}

/** Handed over: to the vendor's own driver (on its way), or to the customer at pick-up with the code. The app's courier takes it in Yallapp Courier. */
export async function handOverMarketOrder(deps: FlowDeps, order: MarketOrder, code: string | null): Promise<MoveResult> {
  if (order.status !== "ready") return { ok: false, reason: "changed" };
  if (order.fulfilment === "pickup") {
    if (!order.pickupCode || code !== order.pickupCode) return { ok: false, reason: "invalid", error: "That isn't the order's pick-up code." };
    const paid = order.paymentMethod === "cash" ? { paymentStatus: "paid" as const } : {};
    return move(deps.store, order, { status: "picked_up", completedAt: deps.now, ...paid }, "vendor", deps.now);
  }
  if (order.deliveryBy !== "vendor") return { ok: false, reason: "invalid", error: "The app's courier takes this order in the courier app." };
  return move(deps.store, order, { status: "on_the_way" }, "vendor", deps.now);
}

/** The vendor's own driver delivered it (from the vendor's screens). */
export async function deliveredByVendor(deps: FlowDeps, order: MarketOrder): Promise<MoveResult> {
  if (order.status !== "on_the_way" || order.deliveryBy !== "vendor") return { ok: false, reason: "changed" };
  const paid = order.paymentMethod === "cash" ? { paymentStatus: "paid" as const } : {};
  return move(deps.store, order, { status: "delivered", completedAt: deps.now, ...paid }, "vendor", deps.now);
}

/** The order follows its courier job: on its way once picked up, delivered when the job is. Made when it's read. */
export async function syncWithJob(store: DataStore, order: MarketOrder, job: Shipment | null, now: Date): Promise<MarketOrder> {
  if (!job || order.deliveryBy !== "app") return order;
  const next: MarketOrderStatus | null =
    job.status === "delivered" ? "delivered" : (job.status === "picked_up" || job.status === "on_the_way") && ["accepted", "picking", "ready"].includes(order.status) ? "on_the_way" : null;
  if (!next || next === order.status || order.status === "delivered" || order.status === "cancelled") return order;
  const patch: Partial<MarketOrder> & { status: MarketOrderStatus } = { status: next, ...(next === "delivered" ? { completedAt: now, ...(order.paymentMethod === "cash" ? { paymentStatus: "paid" as const } : {}) } : {}) };
  const moved = await move(store, order, patch, "courier", now);
  return moved.ok ? moved.order : order;
}

/** Who holds the customer's money for this order. */
export function collectedByOf(order: Pick<MarketOrder, "paymentMethod" | "fulfilment" | "deliveryBy">): "owner" | "vendor" {
  return order.paymentMethod === "cash" ? cashCollector(order) : "owner";
}

/** Marks a market order's gateway payment (the shop order's line carries the market order's id as a negative product id). */
export const MARKET_PAY_LINE = (orderId: number) => -orderId;

/** A paid shop order of a marketplace: its market order is paid and goes to the vendor (once). */
export async function payMarketOrder(store: DataStore, app: App, paid: CatalogOrder, now: Date): Promise<MarketOrder | null> {
  const productId = paid.lines[0]?.productId;
  if (app.connector?.kind !== "restaurants" || productId === undefined || productId >= 0) return null;
  const order = await store.getMarketOrder(app.id, -productId);
  if (!order || order.paymentMethod === "cash" || order.paymentStatus !== "unpaid") return null;
  await store.updateCatalogOrder(app.id, paid.id, { status: "completed", updatedAt: now });
  if (order.status !== "awaiting_payment") {
    await store.updateMarketOrder(app.id, order.id, { paymentStatus: "paid", updatedAt: now }, { statuses: [order.status] });
    return null;
  }
  const status: MarketOrderStatus = order.scheduledFor ? "scheduled" : "placed";
  const timeline = [...order.timeline, marketStage(status, now, "system")];
  const changed = await store.updateMarketOrder(app.id, order.id, { status, paymentStatus: "paid", timeline, updatedAt: now }, { statuses: ["awaiting_payment"] });
  return changed ? { ...order, status, paymentStatus: "paid", timeline, updatedAt: now } : null;
}

/** Orders for later reach their vendor when their preparation should start. */
export async function releaseScheduled(store: DataStore, appId: string, now: Date): Promise<number> {
  const due = await store.listMarketOrders({ appId, statuses: ["scheduled"], order: "oldest", limit: 200, offset: 0 });
  let released = 0;
  for (const o of due.items) {
    if (!o.scheduledFor) continue;
    const start = o.scheduledFor.getTime() - (o.prepMinutes ?? 30) * 60_000 - 15 * 60_000;
    if (start > now.getTime()) continue;
    const moved = await move(store, o, { status: "placed" }, "system", now);
    if (moved.ok) released++;
  }
  return released;
}
