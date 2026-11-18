import type { DataStore } from "../data/store";
import type { App, ContactSettings, ContactSide, Courier, HostedUser, Shipment, ShipmentStatus } from "../data/types";
import { courierWho } from "../delivery/service";
import { courierMayHave, reviewCourierFor, reviewUserId } from "../delivery/review";

/**
 * 184 A courier job's thread: its customer and the courier who has it reach
 * each other, and nobody else. Every courier job is the app's own (a place
 * that delivers itself makes none), so a store never has a side here.
 *
 * - The thread opens when a courier is given the job (its last `assigned`
 *   stage) and closes 2 hours after the job ends (delivered, couldn't be
 *   delivered, or cancelled). Messages are written only while it's open.
 * - A job given to another courier starts a new conversation: each courier
 *   reads only the messages written while they had it.
 * - The customer reads their order's thread after it closes; the courier
 *   reads it only while it's open.
 */

/** How long after the job ends the chat stays open. */
export const CHAT_AFTER_MS = 2 * 60 * 60 * 1000;

/** The stages that end a job. */
export const ENDED: ShipmentStatus[] = ["delivered", "failed", "cancelled"];

/** What a never-saved app has: chat on, calls off (the owner's decision, 18 November 2026). */
export function contactSettingsOf(appId: string, saved: ContactSettings | null): ContactSettings {
  return saved ?? { appId, chat: true, appCall: false, phoneCall: false, updatedAt: new Date(0) };
}

export interface ThreadWindow {
  /** When the courier who has the job was given it; null: no courier yet. */
  opensAt: Date | null;
  /** 2 hours after the job ended; null while it hasn't. */
  closesAt: Date | null;
}

/** The thread's window, from the job's stages. */
export function threadWindow(job: Pick<Shipment, "status" | "courierId" | "timeline" | "updatedAt">): ThreadWindow {
  const assigned = [...job.timeline].reverse().find((s) => s.status === "assigned");
  const opensAt = job.courierId !== null && assigned ? new Date(assigned.at) : null;
  if (!ENDED.includes(job.status)) return { opensAt, closesAt: null };
  const ended = [...job.timeline].reverse().find((s) => s.status === job.status);
  const endedAt = ended ? new Date(ended.at) : job.updatedAt;
  return { opensAt, closesAt: new Date(endedAt.getTime() + CHAT_AFTER_MS) };
}

/** Whether messages may be written now. */
export function isOpen(window: ThreadWindow, now: Date): boolean {
  return window.opensAt !== null && now.getTime() >= window.opensAt.getTime() && (window.closesAt === null || now.getTime() < window.closesAt.getTime());
}

/** Whether the job is still on its way: calls are offered only then (184.5, 184.6). */
export function onItsWay(job: Pick<Shipment, "status" | "courierId">): boolean {
  return job.courierId !== null && ["assigned", "picked_up", "on_the_way"].includes(job.status);
}

/** The ways the app shows on the order and the job (the contract's `ContactWays`), or null with no courier. */
export function contactWaysJson(settings: ContactSettings, job: Pick<Shipment, "status" | "courierId" | "timeline" | "updatedAt"> | null, now: Date) {
  if (!job || job.courierId === null) return null;
  const window = threadWindow(job);
  const open = isOpen(window, now);
  return {
    chat: settings.chat && open,
    // The calls come with 184.5 and 184.6 (then: the owner's switch, while the job is on its way); never offered before.
    app_call: false,
    phone_call: false,
    chat_until: window.closesAt ? window.closesAt.toISOString() : null,
  };
}

/** The thread the signed-in person may reach, as which side. */
export interface Thread {
  job: Shipment;
  side: ContactSide;
  /** The courier who has the job. */
  courier: Courier;
  window: ThreadWindow;
}

export type Found = { ok: true; thread: Thread } | { ok: false; status: 401 | 403 | 404 | 409; code: string; message: string };

const notFound: Found = { ok: false, status: 404, code: "not_found", message: "Order not found." };
const noCourier: Found = { ok: false, status: 409, code: "no_courier", message: "You can write once a courier has your order." };

/** Where the customer's order is: which of their orders, by its kind. */
export type CustomerOrder = { kind: "market" | "food" | "shipment"; id: number };

/** The customer's side of their order's thread. Only the order's own customer; anyone else finds nothing. */
export async function customerThread(store: DataStore, app: App, user: HostedUser | null, order: CustomerOrder): Promise<Found> {
  if (!user) return { ok: false, status: 401, code: "invalid_token", message: "Your session has ended. Please sign in again." };
  let job: Shipment | null = null;
  if (order.kind === "market") {
    const o = await store.getMarketOrder(app.id, order.id);
    if (!o || o.userId !== user.id) return notFound;
    job = o.shipmentId !== null ? await store.getShipment(app.id, o.shipmentId) : null;
  } else if (order.kind === "food") {
    const o = await store.getFoodOrder(app.id, order.id);
    if (!o || o.userId !== user.id) return notFound;
    job = o.shipmentId !== null ? await store.getShipment(app.id, o.shipmentId) : null;
  } else {
    job = await store.getShipment(app.id, order.id);
    // A food or marketplace order's job is reached from the order itself.
    if (!job || job.userId !== user.id || job.foodOrderId) return notFound;
    if (await isMarketJob(store, app, job)) return notFound;
  }
  if (!job || job.userId !== user.id) return job ? notFound : noCourier;
  const courier = job.courierId !== null ? await store.getCourier(app.id, job.courierId) : null;
  const window = threadWindow(job);
  if (!courier || window.opensAt === null) return noCourier;
  return { ok: true, thread: { job, side: "customer", courier, window } };
}

/** The courier's side of a job's thread: only the active courier who has the job now, and only while it's open. */
export async function courierThread(store: DataStore, app: App, user: HostedUser | null, jobId: number, now: Date): Promise<Found> {
  if (!user) return { ok: false, status: 401, code: "invalid_token", message: "Your session has ended. Please sign in again." };
  const found = (await store.findCourier(app.id, courierWho(user))) ?? (await reviewCourierFor(store, app, user, now));
  const courier = found && found.active ? found : null;
  if (!courier) return { ok: false, status: 403, code: "not_courier", message: "This account isn't one of our couriers." };
  const job = await store.getShipment(app.id, jobId);
  if (!job || job.courierId !== courier.id || !courierMayHave(app, courier, job, await reviewUserId(store, app))) {
    return { ok: false, status: 404, code: "not_found", message: "Job not found." };
  }
  const window = threadWindow(job);
  // The courier keeps the customer's words and place only while the chat is open.
  if (!isOpen(window, now)) return { ok: false, status: 404, code: "not_found", message: "This chat has closed." };
  return { ok: true, thread: { job, side: "courier", courier, window } };
}

/** Whether a job carries a marketplace order (its customer reaches it from the order). */
async function isMarketJob(store: DataStore, app: App, job: Shipment): Promise<boolean> {
  if (job.userId === null) return false;
  const orders = await store.listMarketOrders({ appId: app.id, userId: job.userId, order: "newest", limit: 50, offset: 0 });
  return orders.items.some((o) => o.shipmentId === job.id);
}

/** A first name, as each side sees the other. */
export function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "";
}
