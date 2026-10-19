import type { DataStore } from "../data/store";
import { addDays, dayOf, dayRange } from "./days";
import { MAX_EVENT_AGE_DAYS, MAX_KEYS_PER_DAY, RAW_RETENTION_DAYS, type AnalyticsDailyRow, type AnalyticsEventRow } from "./types";

/** 44 The returns counted for each cohort of first opens: the day after, a week and 30 days later. */
export const RETENTION_DAYS = [1, 7, 30] as const;

type AnalyticsStore = Pick<
  DataStore,
  | "listAnalyticsEvents"
  | "countAnalyticsActive"
  | "countAnalyticsReturning"
  | "saveAnalyticsDaily"
  | "listAnalyticsDaily"
  | "listAnalyticsEventDays"
  | "listAnalyticsAppIds"
  | "purgeAnalyticsEvents"
>;

function topRows(metric: AnalyticsDailyRow["metric"], counts: Map<string, { value: number; label: string | null }>): AnalyticsDailyRow[] {
  return [...counts.entries()]
    .sort((a, b) => b[1].value - a[1].value || a[0].localeCompare(b[0]))
    .slice(0, MAX_KEYS_PER_DAY)
    .map(([key, { value, label }]) => ({ metric, key, label, value }));
}

function bump(map: Map<string, { value: number; label: string | null }>, key: string, by = 1, label: string | null = null) {
  const entry = map.get(key);
  if (entry) {
    entry.value += by;
    if (label) entry.label = label;
  } else map.set(key, { value: by, label });
}

/**
 * The totals of one day from its raw events (pure, so it is tested on its
 * own). Splits (platform, system, version, country, language) count each
 * install once a day, with what it last sent that day; screens, items and
 * actions count events.
 */
export function totalsOfDay(events: readonly AnalyticsEventRow[]): AnalyticsDailyRow[] {
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  const installs = new Set<string>();
  const firstOpens = new Set<string>();
  const latest = new Map<string, AnalyticsEventRow>();
  let sessions = 0;
  const screens = new Map<string, { value: number; label: string | null }>();
  const items = new Map<string, { value: number; label: string | null }>();
  const counts = new Map<string, { value: number; label: string | null }>();
  const value = new Map<string, { value: number; label: string | null }>();
  const pushOpens = new Map<string, { installs: Set<string>; label: string | null }>();

  for (const event of sorted) {
    installs.add(event.installId);
    latest.set(event.installId, event);
    bump(counts, event.type);
    switch (event.type) {
      case "app_open":
        sessions += 1;
        if (event.firstOpen) firstOpens.add(event.installId);
        break;
      case "screen_view":
        if (event.screen) bump(screens, event.screen);
        break;
      case "item_view":
        if (event.itemKind && event.itemId) bump(items, `${event.itemKind}:${event.itemId}`, 1, event.title);
        break;
      case "purchase_click":
        if (event.amountCents !== null && event.currency) bump(value, event.currency, event.amountCents);
        break;
      case "push_open": {
        const key = event.notificationId ? `id:${event.notificationId}` : `type:${event.pushType ?? "other"}`;
        const entry = pushOpens.get(key) ?? { installs: new Set<string>(), label: event.pushType };
        entry.installs.add(event.installId);
        pushOpens.set(key, entry);
        break;
      }
      default:
        break;
    }
  }

  const split = (metric: AnalyticsDailyRow["metric"], of: (e: AnalyticsEventRow) => string | null) => {
    const map = new Map<string, { value: number; label: string | null }>();
    for (const event of latest.values()) bump(map, of(event) ?? "unknown");
    return topRows(metric, map);
  };

  const rows: AnalyticsDailyRow[] = [
    { metric: "installs", key: "", label: null, value: firstOpens.size },
    { metric: "active", key: "", label: null, value: installs.size },
    { metric: "sessions", key: "", label: null, value: sessions },
    ...split("platform", (e) => e.platform),
    ...split("os", (e) => e.osVersion),
    ...split("version", (e) => e.appVersion),
    ...split("country", (e) => e.country),
    ...split("language", (e) => e.language),
    ...topRows("screen", screens),
    ...topRows("item", items),
    ...topRows("event", counts),
    ...topRows("checkout_value", value),
  ];
  for (const [key, entry] of pushOpens) rows.push({ metric: "push_open", key, label: entry.label, value: entry.installs.size });
  return rows;
}

/**
 * Counts one day: its totals, the installs active over the 7 and 30 days
 * that end with it, and the returns of the cohorts that first opened the
 * app 1, 7 and 30 days before (written on the cohort's day). A finished day
 * is marked as counted.
 */
export async function aggregateDay(store: AnalyticsStore, appId: string, day: string, now: Date, zone = "UTC"): Promise<void> {
  const events = await store.listAnalyticsEvents(appId, day);
  const rows = totalsOfDay(events);
  const [week, month] = await Promise.all([
    store.countAnalyticsActive(appId, addDays(day, -6), day),
    store.countAnalyticsActive(appId, addDays(day, -29), day),
  ]);
  rows.push({ metric: "active_7", key: "", label: null, value: week }, { metric: "active_30", key: "", label: null, value: month });
  const finished = day < dayOf(now, zone);
  if (finished) rows.push({ metric: "done", key: "", label: null, value: Math.floor(now.getTime() / 1000) }, { metric: "dirty", key: "", label: null, value: 0 });
  await store.saveAnalyticsDaily(appId, day, rows);
  for (const n of RETENTION_DAYS) {
    const cohort = addDays(day, -n);
    // The cohort's first opens are still in the raw events (kept 40 days).
    if (cohort < addDays(dayOf(now, zone), -RAW_RETENTION_DAYS + 1)) continue;
    const returned = await store.countAnalyticsReturning(appId, cohort, day);
    await store.saveAnalyticsDaily(appId, cohort, [{ metric: `ret_d${n}`, key: "", label: null, value: returned }]);
  }
}

/**
 * The finished days an app's totals still need: those of the last week
 * (events come up to 7 days late) and any older day with raw events, never
 * counted or with late events since they were; plus `also` (a report's
 * last days, for their weekly and monthly users) while their raw events
 * are kept.
 */
export async function daysToCount(
  store: Pick<DataStore, "listAnalyticsDaily" | "listAnalyticsEventDays">,
  appId: string,
  now: Date,
  also: string[] = [],
  zone = "UTC",
): Promise<string[]> {
  const today = dayOf(now, zone);
  const oldest = addDays(today, -RAW_RETENTION_DAYS + 1);
  const yesterday = addDays(today, -1);
  const [rows, eventDays] = await Promise.all([store.listAnalyticsDaily(appId, oldest, yesterday, ["done", "dirty"]), store.listAnalyticsEventDays(appId, oldest)]);
  const done = new Set(rows.filter((r) => r.metric === "done" && r.value > 0).map((r) => r.day));
  const dirty = new Set(rows.filter((r) => r.metric === "dirty" && r.value > 0).map((r) => r.day));
  const candidates = new Set([...dayRange(addDays(today, -MAX_EVENT_AGE_DAYS - 1), yesterday), ...eventDays, ...also.filter((day) => day >= oldest)]);
  return [...candidates].filter((day) => day < today && (!done.has(day) || dirty.has(day))).sort();
}

/**
 * Brings an app's totals up to date before a report: the finished days that
 * need it (so the report is right even before the nightly count ran) and
 * today so far.
 */
export async function refreshAnalytics(store: AnalyticsStore, appId: string, now: Date, also: string[] = [], zone = "UTC"): Promise<void> {
  for (const day of await daysToCount(store, appId, now, also, zone)) await aggregateDay(store, appId, day, now, zone);
  await aggregateDay(store, appId, dayOf(now, zone), now, zone);
}

/**
 * The nightly count (POST /api/internal/daily): every app with events in the
 * last week gets its finished days counted, then raw events older than 40
 * days are deleted. Stops before `budgetMs`; what is left is counted when
 * the owner opens Analytics, or the next night.
 */
export async function runAnalyticsNightly(
  store: AnalyticsStore,
  now: Date,
  budgetMs = 15_000,
  /** 47 Each app's time zone (lib/analytics/zone.ts); UTC without it. */
  zoneOf: (appId: string) => Promise<string> = async () => "UTC",
): Promise<{ apps: number; days: number; purged: number; finished: boolean }> {
  const started = Date.now();
  const today = dayOf(now);
  const appIds = await store.listAnalyticsAppIds(addDays(today, -MAX_EVENT_AGE_DAYS - 1));
  let apps = 0;
  let days = 0;
  let finished = true;
  for (const appId of appIds) {
    if (Date.now() - started > budgetMs) {
      finished = false;
      break;
    }
    const zone = await zoneOf(appId);
    const due = await daysToCount(store, appId, now, [], zone);
    for (const day of due) await aggregateDay(store, appId, day, now, zone);
    apps += 1;
    days += due.length;
  }
  const purged = await store.purgeAnalyticsEvents(addDays(today, -RAW_RETENTION_DAYS + 1));
  return { apps, days, purged, finished };
}
