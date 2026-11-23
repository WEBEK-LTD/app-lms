import type { App, Restaurant, ShopPause, ShopPauses } from "../data/types";
import type { DataStore } from "../data/store";

/**
 * 214 "Pause the shop": no new orders for 15 minutes, 30 minutes, an hour or
 * until reopened, with an optional reason customers read. It reopens by
 * itself when the time ends. Orders already placed (scheduled ones too)
 * stay as they are.
 *
 * - A shop (a catalog app: a store, a restaurant's own app, a flower shop):
 *   the whole app (`App.shopPause.app`); its checkout refuses new orders
 *   (`shop_paused`), its order times say closed until then.
 * - A food app's restaurant or a marketplace's place: that place only
 *   (`App.shopPause.places[id]`), and its `busyUntil` set to the end (a
 *   year ahead until reopened), so the food and marketplace checkouts and the
 *   customer app (every release) already treat it as not taking orders.
 *   Reopening clears `busyUntil` again.
 */

export const PAUSE_MINUTES = [15, 30, 60] as const;
export const PAUSE_REASON_MAX = 80;
/** Until reopened, a place's `busyUntil` is this far ahead. */
const UNTIL_REOPENED_MS = 365 * 86_400_000;

export interface ActivePause {
  until: Date | null;
  reason: string | null;
  at: Date;
}

function active(p: ShopPause | null | undefined, now: Date): ActivePause | null {
  if (!p) return null;
  const until = p.until ? new Date(p.until) : null;
  if (until && until.getTime() <= now.getTime()) return null;
  return { until, reason: p.reason ?? null, at: new Date(p.at) };
}

/** The whole app's pause in force at `now`, or null. */
export function appPause(app: Pick<App, "shopPause">, now: Date): ActivePause | null {
  return active(app.shopPause?.app, now);
}

/** A restaurant's or a marketplace place's pause in force at `now`, or null. */
export function placePause(app: Pick<App, "shopPause">, placeId: number, now: Date): ActivePause | null {
  return active(app.shopPause?.places?.[String(placeId)], now);
}

/** Plain text on one line, at most PAUSE_REASON_MAX characters; null for none. */
export function pauseReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, PAUSE_REASON_MAX) : null;
}

/** What the pause says to customers: "We're not taking orders right now", with when it ends and why. */
export function pauseMessage(pause: ActivePause, name: string | null = null): string {
  const who = name ? `${name} isn't` : "We're not";
  const back = pause.until ? ` Back at ${pause.until.toISOString().slice(11, 16)} UTC.` : "";
  return `${who} taking orders right now.${pause.reason ? ` ${pause.reason}` : ""}${back}`;
}

export function pauseJson(pause: ActivePause | null) {
  return pause ? { until: pause.until?.toISOString() ?? null, reason: pause.reason, since: pause.at.toISOString() } : null;
}

function withPause(current: ShopPauses | null | undefined, key: "app" | number, value: ShopPause | null): ShopPauses {
  const next: ShopPauses = { app: current?.app ?? null, places: { ...(current?.places ?? {}) } };
  if (key === "app") next.app = value;
  else if (value) next.places![String(key)] = value;
  else delete next.places![String(key)];
  return next;
}

/** Pauses the whole app (minutes: 15, 30, 60, or null until reopened). */
export async function pauseApp(store: DataStore, app: App, input: { minutes: number | null; reason: string | null }, now: Date): Promise<ShopPauses> {
  const pause: ShopPause = { until: input.minutes === null ? null : new Date(now.getTime() + input.minutes * 60_000).toISOString(), reason: input.reason, at: now.toISOString() };
  const next = withPause(app.shopPause, "app", pause);
  await store.updateApp(app.id, { shopPause: next }, now);
  return next;
}

/** Pauses one restaurant or marketplace place; its checkout refuses orders through `busyUntil`. */
export async function pausePlace(store: DataStore, app: App, place: Pick<Restaurant, "id">, input: { minutes: number | null; reason: string | null }, now: Date): Promise<ShopPauses> {
  const until = input.minutes === null ? null : new Date(now.getTime() + input.minutes * 60_000);
  const pause: ShopPause = { until: until?.toISOString() ?? null, reason: input.reason, at: now.toISOString() };
  const next = withPause(app.shopPause, place.id, pause);
  await store.updateApp(app.id, { shopPause: next }, now);
  await store.updateRestaurant(app.id, place.id, { busyUntil: until ?? new Date(now.getTime() + UNTIL_REOPENED_MS) }, now);
  return next;
}

/** Reopens the whole app (placeId null) or one place now. */
export async function reopen(store: DataStore, app: App, placeId: number | null, now: Date): Promise<ShopPauses> {
  const next = withPause(app.shopPause, placeId ?? "app", null);
  await store.updateApp(app.id, { shopPause: next }, now);
  if (placeId !== null) await store.updateRestaurant(app.id, placeId, { busyUntil: null }, now);
  return next;
}

/** Reads `{ minutes, reason }`: 15, 30 or 60 minutes, or null until reopened. */
export function readPause(body: Record<string, unknown>): { ok: true; minutes: number | null; reason: string | null } | { ok: false; field: string; error: string } {
  const minutes = body.minutes;
  if (minutes !== null && !(PAUSE_MINUTES as readonly unknown[]).includes(minutes)) return { ok: false, field: "minutes", error: "Pause for 15, 30 or 60 minutes, or null until you reopen." };
  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== "string") return { ok: false, field: "reason", error: "Send the reason as text." };
  return { ok: true, minutes: minutes as number | null, reason: pauseReason(body.reason) };
}
