import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { App, ContactMessage, ContactSettings, ContactSide } from "../data/types";
import { asLang, courierUser, pushOnly, type DeliveryNotifyDeps } from "../delivery/notify";
import { shipmentReference } from "../delivery/service";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import type { Connector, ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { error } from "../hosted/connectors/common";
import { QUICK_REPLIES, isQuickReply, quickWords } from "./quick";
import { contactSettingsOf, contactWaysJson, courierThread, customerThread, firstName, isOpen, type CustomerOrder, type Found, type Thread } from "./thread";

/**
 * 184.3 The chat on a courier job's thread, for its customer (from their
 * order) and its courier (from the job):
 *
 *   GET  …/contact            the thread: the ways, who the other side is, the newest messages, reads
 *   GET  …/contact/messages   newer messages (`?after=`), asked every `poll_after_seconds` while it's open
 *   POST …/contact/messages   a message: text, a quick reply's code or a location; `client_id` against double sends
 *   POST …/contact/read       how far this side has read
 *
 * on `/me/market-orders/{id}`, `/me/food-orders/{id}`, `/me/shipments/{id}`
 * (the customer) and `/courier/jobs/{id}` (the courier).
 */

export interface ChatDeps {
  store: DataStore;
  app: App;
  /** The pushes to the other side (lib/delivery/flow.ts notifyDeps); none when left out. */
  notify?: (now: Date) => DeliveryNotifyDeps;
}

/** How often the open screen asks for new messages. */
export const POLL_AFTER_SECONDS = 4;
/** The newest messages a thread opens with, and the most a page of new ones holds. */
export const PAGE = 50;
export const TEXT_MAX = 1000;

/** 30 messages a minute per person per thread: a chat, not a flood. */
const SEND_LIMIT: RateLimitRule = { name: "contact_message", limit: 30, windowSeconds: 60 };

type Where = { side: "customer"; order: CustomerOrder } | { side: "courier"; jobId: number };

/** The contact path's thread and what's asked of it, or null when the path isn't a contact one. */
export function contactPath(path: string[]): { where: Where; rest: string[] } | null {
  if (path.length < 4 || path[3] !== "contact" || !/^\d{1,15}$/.test(path[2] ?? "")) return null;
  const id = Number(path[2]);
  const rest = path.slice(4);
  if (path[0] === "me" && path[1] === "market-orders") return { where: { side: "customer", order: { kind: "market", id } }, rest };
  if (path[0] === "me" && path[1] === "food-orders") return { where: { side: "customer", order: { kind: "food", id } }, rest };
  if (path[0] === "me" && path[1] === "shipments") return { where: { side: "customer", order: { kind: "shipment", id } }, rest };
  if (path[0] === "courier" && path[1] === "jobs") return { where: { side: "courier", jobId: id }, rest };
  return null;
}

const fail = error;

/** Answers a contact path; null for any other. */
export async function handleContact(deps: ChatDeps, request: ConnectorRequest): Promise<ConnectorResult | null> {
  const parsed = contactPath(request.path);
  if (!parsed) return null;
  const route = `${request.method} /${parsed.rest.join("/")}`;
  if (!["GET /", "GET /messages", "POST /messages", "POST /read"].includes(route)) return fail(404, "not_found", "Not found.");
  const settings = contactSettingsOf(deps.app.id, await deps.store.getContactSettings(deps.app.id));
  if (!settings.chat) return fail(403, "contact_off", "Chat isn't available in this app.");
  const found: Found =
    parsed.where.side === "customer"
      ? await customerThread(deps.store, deps.app, request.user, parsed.where.order)
      : await courierThread(deps.store, deps.app, request.user, parsed.where.jobId, request.now);
  if (!found.ok) return fail(found.status, found.code, found.message);
  const thread = found.thread;
  if (route === "GET /") return { status: 200, body: await threadJson(deps, thread, settings, request.now) };
  if (route === "GET /messages") return messages(deps, thread, request);
  if (route === "POST /read") return read(deps, thread, request);
  return send(deps, thread, request);
}

/** The messages this side may read: the conversation with the courier who has the job now. */
function list(deps: ChatDeps, thread: Thread, options: { afterId?: number; limit: number }) {
  return deps.store.listContactMessages(deps.app.id, thread.job.id, { courierId: thread.courier.id, ...options });
}

async function threadJson(deps: ChatDeps, thread: Thread, settings: ContactSettings, now: Date) {
  const items = await list(deps, thread, { limit: PAGE });
  const reads = await deps.store.listContactReads(deps.app.id, thread.job.id);
  const other: ContactSide = thread.side === "customer" ? "courier" : "customer";
  const mine = reads.find((r) => r.side === thread.side)?.lastReadId ?? 0;
  const unread = (await list(deps, thread, { afterId: mine, limit: 100 })).filter((m) => m.sender === other).length;
  return {
    ways: contactWaysJson(settings, thread.job, now),
    open: isOpen(thread.window, now),
    opened_at: thread.window.opensAt?.toISOString() ?? null,
    closes_at: thread.window.closesAt?.toISOString() ?? null,
    me: thread.side,
    // First names only, each way (Phase 115: the customer sees the courier's first name).
    other: thread.side === "customer" ? { role: "courier", name: firstName(thread.courier.name) } : { role: "customer", name: firstName(thread.job.recipientName) },
    reference: shipmentReference(thread.job),
    unread,
    read: readJson(reads, thread.side),
    poll_after_seconds: POLL_AFTER_SECONDS,
    quick_replies: quickRepliesFor(thread.side),
    items: items.map((m) => messageJson(m, thread.side)),
  };
}

function quickRepliesFor(side: ContactSide): string[] {
  return [...QUICK_REPLIES[side]];
}

/** How far each side has read: the app draws "read" up to `other_last_read_id`. */
function readJson(reads: { side: ContactSide; lastReadId: number; readAt: Date }[], side: ContactSide) {
  const mine = reads.find((r) => r.side === side);
  const theirs = reads.find((r) => r.side !== side);
  return { my_last_read_id: mine?.lastReadId ?? 0, other_last_read_id: theirs?.lastReadId ?? 0, other_read_at: theirs?.readAt.toISOString() ?? null };
}

export function messageJson(m: ContactMessage, viewer: ContactSide | "support") {
  return {
    id: m.id,
    client_id: m.clientId,
    from: m.sender,
    mine: viewer !== "support" && m.sender === viewer,
    kind: m.kind,
    text: m.body,
    quick: m.quick,
    location: m.lat !== null && m.lng !== null ? { lat: m.lat, lng: m.lng } : null,
    created_at: m.createdAt.toISOString(),
  };
}

async function messages(deps: ChatDeps, thread: Thread, request: ConnectorRequest): Promise<ConnectorResult> {
  const after = request.query.get("after");
  const afterId = after !== null && /^\d{1,15}$/.test(after) ? Number(after) : undefined;
  const items = await list(deps, thread, afterId !== undefined ? { afterId, limit: PAGE } : { limit: PAGE });
  const reads = await deps.store.listContactReads(deps.app.id, thread.job.id);
  return {
    status: 200,
    body: { open: isOpen(thread.window, request.now), closes_at: thread.window.closesAt?.toISOString() ?? null, read: readJson(reads, thread.side), poll_after_seconds: POLL_AFTER_SECONDS, items: items.map((m) => messageJson(m, thread.side)) },
  };
}

async function read(deps: ChatDeps, thread: Thread, request: ConnectorRequest): Promise<ConnectorResult> {
  const id = (request.body as { last_read_id?: unknown } | null)?.last_read_id;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 0) return fail(400, "invalid_request", "Send last_read_id.");
  // Only up to what this side can see: never past the conversation's newest message.
  const newest = (await list(deps, thread, { limit: 1 }))[0]?.id ?? 0;
  await deps.store.markContactRead(deps.app.id, thread.job.id, thread.side, Math.min(id, newest), request.now);
  return { status: 204 };
}

type Draft = Pick<ContactMessage, "kind" | "body" | "quick" | "lat" | "lng" | "clientId">;

/** Reads a message from the app: text, one of this side's quick replies, or a location (with words, if any). */
export function readDraft(side: ContactSide, value: unknown): { ok: true; draft: Draft } | { ok: false; error: string } {
  const b = (value ?? {}) as Record<string, unknown>;
  const clientId = b.client_id === undefined || b.client_id === null ? null : b.client_id;
  if (clientId !== null && (typeof clientId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(clientId))) return { ok: false, error: "client_id is up to 64 letters, digits, dashes or underscores." };
  const text = typeof b.text === "string" ? b.text.replace(/\r\n/g, "\n").trim() : null;
  if (text !== null && text.length > TEXT_MAX) return { ok: false, error: `A message is up to ${TEXT_MAX} characters.` };
  if (b.kind === "text") {
    if (!text) return { ok: false, error: "Write a message." };
    return { ok: true, draft: { kind: "text", body: text, quick: null, lat: null, lng: null, clientId: clientId as string | null } };
  }
  if (b.kind === "quick") {
    if (!isQuickReply(side, b.quick)) return { ok: false, error: "Unknown quick reply." };
    return { ok: true, draft: { kind: "quick", body: null, quick: b.quick, lat: null, lng: null, clientId: clientId as string | null } };
  }
  if (b.kind === "location") {
    const at = (b.location ?? {}) as { lat?: unknown; lng?: unknown };
    const lat = at.lat, lng = at.lng;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { ok: false, error: "Send the location's lat and lng." };
    }
    return { ok: true, draft: { kind: "location", body: text || null, quick: null, lat, lng, clientId: clientId as string | null } };
  }
  return { ok: false, error: "kind is text, quick or location." };
}

async function send(deps: ChatDeps, thread: Thread, request: ConnectorRequest): Promise<ConnectorResult> {
  if (!isOpen(thread.window, request.now)) return fail(409, "contact_closed", "This chat has closed.");
  const read = readDraft(thread.side, request.body);
  if (!read.ok) return fail(400, "invalid_request", read.error);
  const limit = await hitRateLimit(deps.store, SEND_LIMIT, `${deps.app.id}:${thread.job.id}:${thread.side}`, request.now);
  if (!limit.allowed) return fail(429, "rate_limited", "Too many messages. Wait a moment and try again.");
  const { message, created } = await deps.store.createContactMessage({
    appId: deps.app.id,
    shipmentId: thread.job.id,
    courierId: thread.courier.id,
    sender: thread.side,
    ...read.draft,
    createdAt: request.now,
  });
  if (created) {
    // Writing counts as having read what came before.
    await deps.store.markContactRead(deps.app.id, thread.job.id, thread.side, message.id, request.now);
    await tellOtherSide(deps, thread, message, request.now).catch(() => 0);
  }
  return { status: created ? 201 : 200, body: messageJson(message, thread.side) };
}

const TITLE: Record<ContactSide, Record<Lang, (name: string) => string>> = {
  // To the customer, from the courier.
  courier: { en: (n) => `${n}, your courier`, ar: (n) => `${n}، مندوب التوصيل`, tr: (n) => `${n}, kuryeniz` },
  // To the courier, from the customer.
  customer: { en: (n) => `${n}, your customer`, ar: (n) => `${n}، العميل`, tr: (n) => `${n}, müşteriniz` },
};

const LOCATION: Record<Lang, string> = { en: "Shared a location", ar: "شارك موقعًا", tr: "Bir konum paylaştı" };

/** One push to the other side's phones, in their language: who wrote and what (a quick reply in their own words). */
export async function tellOtherSide(deps: ChatDeps, thread: Thread, message: ContactMessage, now: Date): Promise<number> {
  if (!deps.notify) return 0;
  const n = deps.notify(now);
  const appLanguage = await appLang(deps.store, deps.app.id);
  const writer = thread.side === "customer" ? firstName(thread.job.recipientName) : firstName(thread.courier.name);
  const words = (lang: Lang) => ({
    title: TITLE[thread.side][lang](writer),
    body: message.kind === "quick" ? quickWords(message.quick ?? "", lang) : message.kind === "location" ? (message.body ?? LOCATION[lang]) : (message.body ?? ""),
  });
  const data = { type: "contact_message", shipment_id: String(thread.job.id), message_id: String(message.id) };
  if (thread.side === "courier") {
    if (thread.job.userId === null) return 0;
    const lang = asLang(thread.job.lang) ?? appLanguage;
    return pushOnly(n, thread.job.userId, words(lang), { ...data, to: "customer", ...(await orderOf(deps, thread)) }, "customers");
  }
  const user = await courierUser(deps.store, thread.courier);
  if (!user) return 0;
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id], "second");
  return pushOnly(n, user.id, words(asLang(devices[0]?.language) ?? appLanguage), { ...data, to: "courier" }, "second");
}

/** Which of the customer's orders the push opens. */
async function orderOf(deps: ChatDeps, thread: Thread): Promise<Record<string, string>> {
  if (thread.job.foodOrderId) return { food_order_id: String(thread.job.foodOrderId) };
  if (thread.job.userId !== null) {
    const orders = await deps.store.listMarketOrders({ appId: deps.app.id, userId: thread.job.userId, order: "newest", limit: 50, offset: 0 });
    const market = orders.items.find((o) => o.shipmentId === thread.job.id);
    if (market) return { market_order_id: String(market.id) };
  }
  return {};
}

/** 184.4 Support's read of a job's thread from the order in the dashboard: every conversation on it, oldest first. */
export async function supportThread(store: DataStore, appId: string, shipmentId: number) {
  const items = await store.listContactMessages(appId, shipmentId, { limit: 500 });
  return items.map((m) => ({ ...messageJson(m, "support"), courier_id: m.courierId }));
}

/**
 * 184.3 The chat in front of a delivery or food app's connector: the contact paths are answered here,
 * everything else by the connector as before. `enabled`: the app's plan has its deliveries.
 */
export function withContact(inner: Connector, deps: ChatDeps & { enabled: boolean }): Connector {
  const wrapped: Connector = Object.create(inner) as Connector;
  wrapped.handle = async (request) => {
    if (contactPath(request.path)) {
      if (!deps.enabled) return fail(403, "feature_disabled", "Deliveries aren't available in this app right now.");
      return handleContact(deps, request);
    }
    return inner.handle(request);
  };
  return wrapped;
}
