import { hmacSha256, safeEqual } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import { addDays, dayOf } from "./days";
import {
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_ITEM_KINDS,
  MAX_EVENT_AGE_DAYS,
  type AnalyticsEventRow,
  type AnalyticsEventType,
  type AnalyticsItemKind,
} from "./types";

/** 44 The request limits of POST /api/v1/apps/{app_id}/events (docs/api/platform.yaml). */
export const MAX_BATCH_BYTES = 65_536;
export const MAX_BATCH_EVENTS = 100;
/** An event this far ahead of the server's clock is skipped (a phone's clock is rarely right to the second). */
const MAX_AHEAD_MS = 10 * 60_000;

export const ANALYTICS_KEY_HEADER = "x-yallapp-analytics-key";

/**
 * The app's analytics key: a keyed hash of its ID, the same in every build,
 * so no table holds it. It is in every copy of the app and isn't a secret: it
 * keeps out batches made up from an app ID alone; the rate limits do the rest.
 */
export function analyticsKey(appId: string, secret: string): string {
  return hmacSha256(secret, `analytics:v1:${appId}`).slice(0, 32);
}

export function analyticsKeyMatches(appId: string, sent: string | null, secret: string): boolean {
  return Boolean(sent) && safeEqual(sent!.trim(), analyticsKey(appId, secret));
}

/** The build config's `analytics` for an app, or null when the platform isn't on https (local runs). */
export function analyticsBuildConfig(appId: string, platformUrl: string, secret: string): { events_url: string; key: string } | null {
  if (!/^https:\/\//.test(platformUrl)) return null;
  return { events_url: `${platformUrl.replace(/\/+$/, "")}/api/v1/apps/${appId}/events`, key: analyticsKey(appId, secret) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCREEN = /^[a-z][a-z0-9_]{0,39}$/;
const PUSH_TYPE = /^[a-z][a-z0-9_]{0,31}$/;
const CURRENCY = /^[A-Z]{3}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

const BATCH_FIELDS = new Set(["install_id", "platform", "app_version", "os_version", "locale", "events"]);
const EVENT_FIELDS = new Set(["type", "at", "first_open", "screen", "item_kind", "item_id", "title", "amount", "currency", "query", "notification_id", "push_type"]);
/** Events that carry an item. */
const ITEM_EVENTS = new Set<AnalyticsEventType>(["item_view", "add_to_cart", "purchase_click", "enroll", "book", "donate", "ticket", "share", "screenshot"]);

/** A search text as it is counted: one line, lower case, without texts that look like a phone number or an email address. */
export function normalizeQuery(value: string): string | null {
  const text = value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en").slice(0, 80);
  if (text.length < 2) return null;
  // Someone may search for a person by number or address: such a text is never kept.
  if (text.includes("@") || (text.match(/\d/g)?.length ?? 0) >= 6) return null;
  return text;
}

/** The language of a locale ("ar_EG", "en-GB" → "ar", "en"), or null. */
export function languageOf(locale: unknown): string | null {
  if (typeof locale !== "string") return null;
  const match = /^([a-zA-Z]{2,3})(?:[-_].*)?$/.exec(locale.trim());
  return match ? match[1]!.toLowerCase() : null;
}

export interface ParsedBatch {
  events: Omit<AnalyticsEventRow, "appId" | "country">[];
  /** Search texts to count, per day. Never stored with the install. */
  searches: { day: string; query: string }[];
  dropped: number;
}

type Failure = { ok: false; message: string };

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  // No control characters (they would break the CSV export and the pages).
  const text = value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
  return text === "" ? null : text;
}

/**
 * Checks a batch against the contract (AnalyticsBatch). One invalid event
 * fails the batch, so a broken build is noticed; events too old or ahead
 * are only skipped and counted.
 */
export function parseBatch(body: unknown, now: Date, zone = "UTC"): ({ ok: true } & ParsedBatch) | Failure {
  const fail = (message: string): Failure => ({ ok: false, message });
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("The body must be a JSON object.");
  const batch = body as Record<string, unknown>;
  for (const key of Object.keys(batch)) if (!BATCH_FIELDS.has(key)) return fail(`Unknown field "${key}".`);
  if (typeof batch.install_id !== "string" || !UUID.test(batch.install_id)) return fail("install_id must be a version 4 UUID.");
  if (batch.platform !== "android" && batch.platform !== "ios") return fail("platform must be android or ios.");
  if (typeof batch.app_version !== "string" || batch.app_version.trim() === "" || batch.app_version.length > 32) return fail("app_version must be a text of at most 32 characters.");
  if (batch.os_version !== undefined && (typeof batch.os_version !== "string" || batch.os_version.length > 32)) return fail("os_version must be a text of at most 32 characters.");
  if (batch.locale !== undefined && (typeof batch.locale !== "string" || batch.locale.length > 16)) return fail("locale must be a text of at most 16 characters.");
  if (!Array.isArray(batch.events) || batch.events.length === 0) return fail("events must list at least one event.");
  if (batch.events.length > MAX_BATCH_EVENTS) return fail(`At most ${MAX_BATCH_EVENTS} events per request.`);

  const installId = batch.install_id.toLowerCase();
  const common = {
    installId,
    platform: batch.platform,
    appVersion: cleanText(batch.app_version, 32) ?? "unknown",
    osVersion: cleanText(batch.os_version, 32),
    language: languageOf(batch.locale),
  } as const;
  const oldest = now.getTime() - MAX_EVENT_AGE_DAYS * 86_400_000;
  const newest = now.getTime() + MAX_AHEAD_MS;
  const events: ParsedBatch["events"] = [];
  const searches: ParsedBatch["searches"] = [];
  let dropped = 0;

  for (const [index, raw] of batch.events.entries()) {
    const where = `events[${index}]`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(`${where} must be an object.`);
    const event = raw as Record<string, unknown>;
    for (const key of Object.keys(event)) if (!EVENT_FIELDS.has(key)) return fail(`${where}: unknown field "${key}".`);
    const type = event.type;
    if (typeof type !== "string" || !(ANALYTICS_EVENT_TYPES as readonly string[]).includes(type)) return fail(`${where}.type isn't a known event.`);
    if (typeof event.at !== "string" || !ISO_TIME.test(event.at) || Number.isNaN(Date.parse(event.at))) return fail(`${where}.at must be a date-time.`);
    if (event.first_open !== undefined && typeof event.first_open !== "boolean") return fail(`${where}.first_open must be true or false.`);
    if (event.screen !== undefined && (typeof event.screen !== "string" || !SCREEN.test(event.screen))) return fail(`${where}.screen must be a screen kind like "home".`);
    if (event.item_kind !== undefined && !(ANALYTICS_ITEM_KINDS as readonly unknown[]).includes(event.item_kind)) return fail(`${where}.item_kind isn't a known kind.`);
    if (event.item_id !== undefined && (typeof event.item_id !== "string" || event.item_id.length < 1 || event.item_id.length > 64)) return fail(`${where}.item_id must be 1 to 64 characters.`);
    if (event.title !== undefined && (typeof event.title !== "string" || event.title.length > 120)) return fail(`${where}.title must be at most 120 characters.`);
    if (event.amount !== undefined && (typeof event.amount !== "number" || !Number.isFinite(event.amount) || event.amount < 0 || event.amount > 100_000_000)) return fail(`${where}.amount must be a number from 0.`);
    if (event.currency !== undefined && (typeof event.currency !== "string" || !CURRENCY.test(event.currency))) return fail(`${where}.currency must be a 3-letter code.`);
    if (event.query !== undefined && (typeof event.query !== "string" || event.query.length > 80)) return fail(`${where}.query must be at most 80 characters.`);
    if (event.notification_id !== undefined && (typeof event.notification_id !== "string" || event.notification_id.length > 64)) return fail(`${where}.notification_id must be at most 64 characters.`);
    if (event.push_type !== undefined && (typeof event.push_type !== "string" || !PUSH_TYPE.test(event.push_type))) return fail(`${where}.push_type must be a type like "announcement".`);

    const at = new Date(event.at);
    if (at.getTime() < oldest || at.getTime() > newest) {
      dropped += 1;
      continue;
    }
    const t = type as AnalyticsEventType;
    // 47 Filed under the day in the app's time zone.
    const day = dayOf(at, zone);
    const hasItem = ITEM_EVENTS.has(t) && typeof event.item_kind === "string" && typeof event.item_id === "string";
    const amount = hasItem && typeof event.amount === "number" && typeof event.currency === "string" ? Math.round(event.amount * 100) : null;
    events.push({
      ...common,
      type: t,
      at,
      day,
      firstOpen: t === "app_open" && event.first_open === true,
      screen: t === "screen_view" && typeof event.screen === "string" ? event.screen : null,
      itemKind: hasItem ? (event.item_kind as AnalyticsItemKind) : null,
      itemId: hasItem ? cleanText(event.item_id, 64) : null,
      title: hasItem ? cleanText(event.title, 120) : null,
      amountCents: amount,
      currency: amount === null ? null : (event.currency as string),
      notificationId: t === "push_open" ? cleanText(event.notification_id, 64) : null,
      pushType: t === "push_open" && typeof event.push_type === "string" ? event.push_type : null,
    });
    if (t === "search" && typeof event.query === "string") {
      const query = normalizeQuery(event.query);
      if (query) searches.push({ day, query });
    }
  }
  return { ok: true, events, searches, dropped };
}

/** The visitor's country (lib/geo.ts); the IP itself is never kept. */
export { countryFromHeaders } from "../geo";

/**
 * Stores a parsed batch: the events, the day's search counts, and marks
 * days already counted as changed so the next count includes the late events.
 */
export async function storeBatch(
  store: Pick<DataStore, "insertAnalyticsEvents" | "addAnalyticsDaily">,
  appId: string,
  batch: ParsedBatch,
  country: string | null,
  now: Date,
  zone = "UTC",
): Promise<void> {
  if (batch.events.length > 0) await store.insertAnalyticsEvents(batch.events.map((event) => ({ ...event, appId, country })));
  for (const { day, query } of batch.searches) {
    await store.addAnalyticsDaily(appId, day, { metric: "search", key: query, label: null, value: 1 });
  }
  const today = dayOf(now, zone);
  const late = new Set(batch.events.map((e) => e.day).filter((day) => day < today && day >= addDays(today, -MAX_EVENT_AGE_DAYS - 1)));
  for (const day of late) await store.addAnalyticsDaily(appId, day, { metric: "dirty", key: "", label: null, value: 1 });
}
