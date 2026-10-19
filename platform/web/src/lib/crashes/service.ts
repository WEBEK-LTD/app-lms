import type { DataStore } from "../data/store";
import type { App, CrashIssue } from "../data/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { crashDay, crashFreeShare, parseCrashBatch } from "./report";

/**
 * 46 `POST /crashes` of the hosted API (docs/api/openapi.yaml, tag Crash
 * reports), for every app whatever its backend, and what the dashboard shows.
 */

export const CRASH_RATE_LIMITS = {
  /** Per app: a bad release on many phones still fits, a flood doesn't. */
  app: { name: "crashes:app", limit: 600, windowSeconds: 60 * 60 },
  /** Per address: one phone sends a batch on start and on each new error, at most once per run each. */
  ip: { name: "crashes:ip", limit: 30, windowSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>;

/** The largest body taken: 10 reports with their stacks. */
export const CRASH_BODY_MAX = 128 * 1024;

export type CrashAnswer = { status: 204 } | { status: 400 | 413 | 429; body: { code: string; message: string; retry_after_seconds?: number } };

export async function receiveCrashReports(store: DataStore, app: App, raw: string, ip: string, now: Date): Promise<CrashAnswer> {
  if (raw.length > CRASH_BODY_MAX) return { status: 413, body: { code: "invalid_request", message: "The request is too large." } };
  for (const [rule, subject] of [
    [CRASH_RATE_LIMITS.ip, ip],
    [CRASH_RATE_LIMITS.app, app.id],
  ] as const) {
    const limit = await hitRateLimit(store, rule, subject, now);
    if (!limit.allowed) {
      return { status: 429, body: { code: "rate_limited", message: "Too many crash reports. Try again later.", retry_after_seconds: limit.retryAfter } };
    }
  }
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return { status: 400, body: { code: "invalid_request", message: "The request body must be JSON." } };
  }
  const parsed = parseCrashBatch(body, now);
  if (!parsed.ok) return { status: 400, body: { code: "invalid_request", message: parsed.message } };
  // The owner turned crash reports off: taken and dropped, so the app doesn't keep them.
  if (app.crashReports === false) return { status: 204 };
  // The same fingerprint twice in one batch counts twice; the app sends each at most once per run.
  await store.recordCrashReports(app.id, parsed.batch.reports, { day: crashDay(now), sessions: parsed.batch.sessions, crashed: parsed.batch.crashed }, now);
  return { status: 204 };
}

export interface Stability {
  /** Crash-free runs over the last 30 days, in percent; null without runs counted. */
  crashFree: number | null;
  sessions: number;
  /** Open groups, most reports first. */
  top: CrashIssue[];
  open: number;
}

/** The owner's "Stability" card: the last 30 days. */
export async function stabilityOf(store: DataStore, appId: string, now: Date): Promise<Stability> {
  const since = crashDay(new Date(now.getTime() - 29 * 86_400_000));
  const [totals, open] = await Promise.all([store.crashSessionTotals(appId, since), store.listCrashIssues({ appId, status: "open", limit: 200 })]);
  const recent = open.filter((i) => i.lastSeenAt.getTime() >= now.getTime() - 30 * 86_400_000);
  return {
    crashFree: crashFreeShare(totals),
    sessions: totals.sessions,
    top: [...recent].sort((a, b) => b.count - a.count || b.lastSeenAt.getTime() - a.lastSeenAt.getTime()).slice(0, 3),
    open: recent.length,
  };
}
