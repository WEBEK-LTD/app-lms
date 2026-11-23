import type { App, OwnerDevice, OwnerLiveActivity, OwnerPushKind } from "../data/types";
import { sendPush } from "../hosted/push";
import { PUSH_PERMISSION } from "../team/permissions";
import { bodyObject, invalid, type OwnerContext, type OwnerResult } from "./http";
import { ownerLang } from "./lang";
import { devicesFor, type OwnerPushDeps, type Words } from "./push";
import { getDashT, knownTranslator } from "@/i18n/dashboard";

/**
 * 214 A new order on an iPhone's lock screen and Dynamic Island (Yallapp
 * Business's Live Activity, business/ios/ShopWidget/OrderLiveActivity.swift),
 * through FCM's `apns.live_activity_token`:
 *
 *   - The app gives its push-to-start token (iOS 17.2) and each order
 *     activity's token: `PUT /me/live-activity`.
 *   - A new order starts the activity on the phones that would hear of it
 *     ("start", with the order's number, the customer's first name, the
 *     total and when it was placed; the phone counts the waiting time).
 *   - Accepted, turned down or cancelled anywhere (the app, another phone,
 *     the dashboard), it ends on every phone ("end"). Opening it in the app
 *     ends it there by itself.
 *
 * Best effort, as every owner push: it never holds up what caused it.
 */

/** The new orders that show as a Live Activity. */
export const LIVE_KINDS = ["new_order", "new_food_order", "new_market_order"] as const;
export type LiveKind = (typeof LIVE_KINDS)[number];

/** The ActivityAttributes type in the app. */
export const LIVE_ATTRIBUTES_TYPE = "OrderActivityAttributes";

/** Activity tokens kept per phone (the newest), and how long (an activity lives 8 hours at most). */
export const LIVE_ORDERS_MAX = 20;
const LIVE_HOURS = 12;
const TOKEN = /^[0-9a-f]{16,512}$/i;

export interface LiveOrder {
  appId: string;
  kind: LiveKind;
  orderId: string;
  /** "1042", "F-1047", "M-1003". */
  number: string;
  /** The customer's full name; only the first name goes. */
  customer: string;
  /** The total as the shop writes it ("₺250.00"), per language. */
  total: (lang: Words["lang"]) => string;
  placedAt: Date;
}

const isLiveKind = (kind: unknown): kind is LiveKind => typeof kind === "string" && (LIVE_KINDS as readonly string[]).includes(kind);

/** The first name only: the lock screen is seen by whoever is near the phone. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, 40) ?? "";
}

/** Drops the activities over 12 hours old and keeps the newest 20. */
function fresh(orders: OwnerLiveActivity["orders"], now: Date): OwnerLiveActivity["orders"] {
  const since = now.getTime() - LIVE_HOURS * 3600_000;
  return orders.filter((o) => Date.parse(o.at) >= since).slice(-LIVE_ORDERS_MAX);
}

/** Reads `PUT /me/live-activity`: `start_token` (a hex token or null), `orders` [{ app_id, kind, order_id, token | null }]. */
export function readLiveActivity(body: unknown, current: OwnerLiveActivity | null | undefined, now: Date): { ok: true; value: OwnerLiveActivity } | { ok: false; field: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, field: "body" };
  const b = body as Record<string, unknown>;
  let start = current?.start ?? null;
  if ("start_token" in b) {
    if (b.start_token !== null && (typeof b.start_token !== "string" || !TOKEN.test(b.start_token))) return { ok: false, field: "start_token" };
    start = (b.start_token as string | null)?.toLowerCase() ?? null;
  }
  let orders = [...(current?.orders ?? [])];
  if ("orders" in b) {
    if (!Array.isArray(b.orders) || b.orders.length > LIVE_ORDERS_MAX) return { ok: false, field: "orders" };
    for (const [i, raw] of b.orders.entries()) {
      const o = (raw ?? {}) as Record<string, unknown>;
      if (typeof o.app_id !== "string" || !o.app_id || o.app_id.length > 64) return { ok: false, field: `orders.${i}.app_id` };
      if (!isLiveKind(o.kind)) return { ok: false, field: `orders.${i}.kind` };
      if (typeof o.order_id !== "string" || !/^[0-9]{1,12}$/.test(o.order_id)) return { ok: false, field: `orders.${i}.order_id` };
      if (o.token !== null && (typeof o.token !== "string" || !TOKEN.test(o.token))) return { ok: false, field: `orders.${i}.token` };
      const same = (x: OwnerLiveActivity["orders"][number]) => x.appId === o.app_id && x.kind === o.kind && x.orderId === o.order_id;
      orders = orders.filter((x) => !same(x));
      if (typeof o.token === "string") orders.push({ appId: o.app_id, kind: o.kind, orderId: o.order_id, token: o.token.toLowerCase(), at: now.toISOString() });
    }
  }
  return { ok: true, value: { start, orders: fresh(orders, now) } };
}

/** `PUT /me/live-activity`: this phone's tokens. */
export async function setLiveActivity(ctx: OwnerContext): Promise<OwnerResult> {
  const read = readLiveActivity(bodyObject(ctx.req.body), ctx.device.liveActivity, ctx.deps.now);
  if (!read.ok) throw invalid({ [read.field]: "Check this value." });
  await ctx.deps.store.updateOwnerDevice(ctx.device.id, { liveActivity: read.value });
  return { status: 200, body: { start: read.value.start !== null, orders: read.value.orders.length } };
}

const seconds = (d: Date) => Math.floor(d.getTime() / 1000);

/** The phones of the people who hear of [kind] on [app] that can show a Live Activity. */
async function livePhones(deps: OwnerPushDeps, app: Pick<App, "id" | "clientId">, kind: OwnerPushKind) {
  const found = await devicesFor(deps.store, app.clientId, kind, PUSH_PERMISSION[kind], app.id, deps.now);
  return found.filter(({ device }) => device.platform === "ios" && device.pushProvider === "fcm" && device.pushToken && device.liveActivity);
}

async function send(deps: OwnerPushDeps, device: OwnerDevice, live: NonNullable<Parameters<typeof sendPush>[2]["liveActivity"]>, words: { title: string; body: string }) {
  const message = { title: words.title, body: words.body, data: {}, liveActivity: live };
  await deps.capture?.({ to: [device.id], message: { ...message, data: { live: live.event } } });
  if (!deps.account) return 0;
  // A refused activity token says nothing of the phone's push token: nothing is forgotten here.
  return (await (deps.send ?? sendPush)(deps.account, [device.pushToken!], message, { now: deps.now })).sent;
}

/** A new order: its Live Activity starts on the phones that hear of it (iOS 17.2 and later). */
export async function startOrderActivities(deps: OwnerPushDeps, app: Pick<App, "id" | "clientId" | "demo">, order: LiveOrder, title: (w: Words) => string): Promise<number> {
  if (app.demo) return 0;
  try {
    let sent = 0;
    for (const { device, language } of await livePhones(deps, app, order.kind)) {
      if (!device.liveActivity?.start) continue;
      const lang = ownerLang(language, device.language);
      const words: Words = { lang, t: getDashT(lang), k: knownTranslator(lang) };
      const total = order.total(lang);
      const customer = firstName(order.customer);
      sent += await send(
        deps,
        device,
        {
          token: device.liveActivity.start,
          event: "start",
          timestamp: seconds(deps.now),
          contentState: { waiting: true },
          attributesType: LIVE_ATTRIBUTES_TYPE,
          attributes: { appId: app.id, kind: order.kind, orderId: order.orderId, number: order.number, customer, total, placedAt: seconds(order.placedAt), lang },
          // Quiet: the order's own push rings.
          alert: { title: title(words), body: [customer, total].filter(Boolean).join(" · ") },
        },
        { title: title(words), body: total },
      );
    }
    return sent;
  } catch (error) {
    console.error("[owner-live]", error instanceof Error ? error.message : String(error));
    return 0;
  }
}

/** The order was answered (accepted, turned down, cancelled): its Live Activity ends on every phone. */
export async function endOrderActivities(deps: OwnerPushDeps, app: Pick<App, "id" | "clientId">, kind: LiveKind, orderId: string): Promise<number> {
  // Nothing can go (no Firebase here, nothing captured): no need to look.
  if (!deps.account && !deps.capture) return 0;
  try {
    let sent = 0;
    for (const { device } of await livePhones(deps, app, kind)) {
      const live = device.liveActivity!;
      const mine = live.orders.filter((o) => o.appId === app.id && o.kind === kind && o.orderId === orderId);
      if (mine.length === 0) continue;
      await deps.store.updateOwnerDevice(device.id, { liveActivity: { ...live, orders: live.orders.filter((o) => !mine.includes(o)) } });
      for (const o of mine) {
        sent += await send(deps, device, { token: o.token, event: "end", timestamp: seconds(deps.now), contentState: { waiting: false }, dismissalDate: seconds(deps.now) }, { title: "", body: "" });
      }
    }
    return sent;
  } catch (error) {
    console.error("[owner-live]", error instanceof Error ? error.message : String(error));
    return 0;
  }
}
