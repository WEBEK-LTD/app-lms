import type { DataStore } from "../data/store";
import { ipFromHeaders } from "../http";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { analyticsKeyMatches, ANALYTICS_KEY_HEADER, countryFromHeaders, MAX_BATCH_BYTES, parseBatch, storeBatch } from "./ingest";
import { appZone } from "./zone";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EventsResult {
  status: 202 | 400 | 403 | 404 | 413 | 429;
  body: { accepted: number; dropped: number } | { code: string; message: string; retry_after_seconds?: number };
  retryAfter?: number;
}

/**
 * 44 POST /api/v1/apps/{app_id}/events (docs/api/platform.yaml:
 * sendAnalyticsEvents): checks the limits, the app and its analytics key,
 * then the batch, and stores it with the country of the request. The IP
 * is used for the per-IP limit (as a counter key) and never stored with
 * the events.
 */
export async function receiveEvents(
  store: DataStore,
  input: { appId: string; headers: Headers; raw: string; secret: string; now: Date },
): Promise<EventsResult> {
  const limited = (retryAfter: number): EventsResult => ({
    status: 429,
    body: { code: "rate_limited", message: "Too many requests. Try again shortly.", retry_after_seconds: retryAfter },
    retryAfter,
  });
  const ip = await hitRateLimit(store, RATE_LIMITS.analyticsIp, ipFromHeaders(input.headers), input.now);
  if (!ip.allowed) return limited(ip.retryAfter);
  if (!UUID.test(input.appId)) return { status: 404, body: { code: "not_found", message: "Not found." } };
  if (input.raw.length > MAX_BATCH_BYTES) return { status: 413, body: { code: "invalid_request", message: "The request is too large (64 KB at most)." } };
  const app = await store.getAppById(input.appId);
  if (!app) return { status: 404, body: { code: "not_found", message: "Not found." } };
  if (!analyticsKeyMatches(app.id, input.headers.get(ANALYTICS_KEY_HEADER), input.secret)) {
    return { status: 403, body: { code: "invalid_key", message: "The analytics key isn't this app's." } };
  }
  const perApp = await hitRateLimit(store, RATE_LIMITS.analyticsApp, app.id, input.now);
  if (!perApp.allowed) return limited(perApp.retryAfter);
  let body: unknown;
  try {
    body = JSON.parse(input.raw) as unknown;
  } catch {
    return { status: 400, body: { code: "invalid_request", message: "The request body must be JSON." } };
  }
  // 47 Events are filed under the app's days (its time zone).
  const zone = await appZone(store, app);
  const parsed = parseBatch(body, input.now, zone);
  if (!parsed.ok) return { status: 400, body: { code: "invalid_request", message: parsed.message } };
  const installId = parsed.events[0]?.installId ?? String((body as { install_id?: unknown }).install_id);
  const perInstall = await hitRateLimit(store, RATE_LIMITS.analyticsInstall, `${app.id}:${installId}`, input.now);
  if (!perInstall.allowed) return limited(perInstall.retryAfter);
  await storeBatch(store, app.id, parsed, countryFromHeaders(input.headers), input.now, zone);
  return { status: 202, body: { accepted: parsed.events.length, dropped: parsed.dropped } };
}
