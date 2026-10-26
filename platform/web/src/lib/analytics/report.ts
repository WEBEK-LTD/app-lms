import type { DataStore } from "../data/store";
import { refreshAnalytics, RETENTION_DAYS } from "./aggregate";
import { addDays, dayOf, dayRange, daysBetween, isDay } from "./days";
import { INTENT_EVENTS, type AnalyticsDailyRecord, type AnalyticsItemKind, type AnalyticsMetric } from "./types";

/** 44 The date ranges of Dashboard › Analytics. */
export const RANGE_PRESETS = [7, 30, 90] as const;
export const MAX_RANGE_DAYS = 366;

export interface AnalyticsRange {
  /** "7", "30", "90" or "custom". */
  preset: string;
  from: string;
  to: string;
  days: number;
  previous: { from: string; to: string };
  /** 72 The first day the app's plan keeps (null: all of them), and whether the range asked for started earlier and was cut there. */
  keptFrom?: string | null;
  limited?: boolean;
}

/** The range from the page's query (`range`, `from`, `to`); last 30 days by default. 47 Days are in the app's time zone. */
export function rangeFrom(
  query: { range?: string | null; from?: string | null; to?: string | null },
  now: Date,
  zone = "UTC",
  /** 72 The first day the app's plan keeps (lib/analytics/retention.ts): the range starts no earlier. */
  keptFrom: string | null = null,
): AnalyticsRange {
  const today = dayOf(now, zone);
  let preset = query.range ?? "30";
  let from: string;
  let to = today;
  if (preset === "custom" && isDay(query.from) && isDay(query.to)) {
    to = query.to > today ? today : query.to;
    from = query.from > to ? to : query.from;
    if (daysBetween(from, to) > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
  } else {
    const n = (RANGE_PRESETS as readonly number[]).includes(Number(preset)) ? Number(preset) : 30;
    preset = String(n);
    from = addDays(today, -(n - 1));
  }
  const limited = keptFrom !== null && from < keptFrom;
  if (limited) {
    from = keptFrom;
    if (to < from) to = from;
  }
  const days = daysBetween(from, to);
  return { preset, from, to, days, previous: { from: addDays(from, -days), to: addDays(from, -1) }, keptFrom, limited };
}

export interface Kpis {
  installs: number;
  /** Average daily active users. */
  activeAvg: number;
  /** Installs active in the 7 and 30 days that end with the range's last day. */
  weekly: number;
  monthly: number;
  sessions: number;
  /** Sessions per active user per day. */
  sessionsPerUser: number;
}

export interface Share {
  key: string;
  label: string;
  value: number;
  share: number;
}

export interface RetentionPoint {
  days: (typeof RETENTION_DAYS)[number];
  /** First opens in the range whose day N is over. */
  cohort: number;
  returned: number;
  /** null when no cohort is complete yet. */
  rate: number | null;
}

export interface PushRow {
  id: string;
  title: string;
  sentDay: string;
  pushed: number;
  opened: number;
  rate: number | null;
}

export interface AnalyticsReport {
  range: AnalyticsRange;
  hasData: boolean;
  kpis: Kpis;
  previous: Kpis;
  daily: { day: string; active: number; installs: number; sessions: number; previousActive: number | null }[];
  retention: RetentionPoint[];
  platforms: Share[];
  systems: Share[];
  versions: Share[];
  countries: Share[];
  languages: Share[];
  screens: Share[];
  items: { kind: AnalyticsItemKind | "other"; id: string; title: string; views: number }[];
  funnel: { step: "view" | "intent" | "checkout"; value: number; rate: number | null }[];
  checkoutValue: { currency: string; cents: number }[];
  push: PushRow[];
  pushFromSite: { type: string; opened: number }[];
  searches: { query: string; count: number }[];
  /** 62 Screenshots of protected content, by lesson (`kind` "other": elsewhere in the app), the most first. */
  screenshots: { kind: AnalyticsItemKind | "other"; id: string; title: string; count: number }[];
  /** 86.2 Where people come from. */
  sources: SourcesReport;
  /** 86.3 The automatic notifications (85.3) by kind: people notified, phones reached, and opens. */
  auto: AutoRow[];
}

export interface AutoRow {
  kind: string;
  people: number;
  pushed: number;
  opened: number;
  rate: number | null;
}

/** The ways into the app, keys of `SourcesReport.opens`. */
export const OPEN_SOURCES = ["push", "link", "qr", "direct"] as const;
export type OpenSource = (typeof OPEN_SOURCES)[number];

export interface SourcesReport {
  /** First opens by the store the app came from (labels are the stores' names). */
  installs: Share[];
  /** Sessions by how they began: a notification, a link, a QR code, or the app opened on its own (the rest). */
  opens: (Share & { key: OpenSource })[];
  /** Links opened by their `utm_campaign` and `utm_source`, the most first. */
  campaigns: { name: string; opens: number }[];
  referrers: { name: string; opens: number }[];
}

const STORE_NAMES: Record<string, string> = {
  google_play: "Google Play",
  app_store: "App Store",
  galaxy_store: "Galaxy Store",
  appgallery: "AppGallery",
  testflight: "TestFlight",
  other: "Other",
  unknown: "Unknown",
};

/** 86.2 Where people come from, from the range's daily totals (pure). */
export function sourcesOf(current: AnalyticsDailyRecord[], sessions: number): SourcesReport {
  const links = sumBy(current, "link_source");
  const counted = {
    push: sumBy(current, "event").get("push_open") ?? 0,
    link: links.get("link") ?? 0,
    qr: links.get("qr") ?? 0,
  };
  // A notification or a link may open an app already running: the rest of the sessions are never below 0.
  const direct = Math.max(0, sessions - counted.push - counted.link - counted.qr);
  const values: Record<OpenSource, number> = { ...counted, direct };
  const total = OPEN_SOURCES.reduce((sum, key) => sum + values[key], 0);
  const top = (map: Map<string, number>) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP)
      .map(([name, opens]) => ({ name, opens }));
  return {
    installs: shares(sumBy(current, "install_store"), (k) => STORE_NAMES[k] ?? k),
    opens: total === 0 ? [] : OPEN_SOURCES.filter((key) => values[key] > 0).map((key) => ({ key, label: key, value: values[key], share: values[key] / total })),
    campaigns: top(sumBy(current, "utm_campaign")),
    referrers: top(sumBy(current, "utm_source")),
  };
}

/** A search shows only once it was made at least this many times in the range. */
export const MIN_SEARCH_COUNT = 2;
const TOP = 10;
const SPLIT_TOP = 6;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

function nameOf(kind: "country" | "language" | "platform", key: string): string {
  if (key === "unknown") return "Unknown";
  if (kind === "platform") return key === "ios" ? "iOS" : key === "android" ? "Android" : key;
  try {
    return (kind === "country" ? regionNames : languageNames).of(kind === "country" ? key.toUpperCase() : key) ?? key;
  } catch {
    return key;
  }
}

function sumBy(rows: AnalyticsDailyRecord[], metric: AnalyticsMetric): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) if (row.metric === metric) map.set(row.key, (map.get(row.key) ?? 0) + row.value);
  return map;
}

function shares(map: Map<string, number>, label: (key: string) => string, top = SPLIT_TOP): Share[] {
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = sorted.slice(0, top).map(([key, value]) => ({ key, label: label(key), value, share: value / total }));
  const rest = sorted.slice(top).reduce((sum, [, value]) => sum + value, 0);
  if (rest > 0) head.push({ key: "other", label: "Other", value: rest, share: rest / total });
  return head;
}

function kpisOf(rows: AnalyticsDailyRecord[], from: string, to: string): Kpis {
  const inRange = rows.filter((r) => r.day >= from && r.day <= to);
  const total = (metric: AnalyticsMetric) => inRange.filter((r) => r.metric === metric && r.key === "").reduce((a, r) => a + r.value, 0);
  const at = (metric: AnalyticsMetric, day: string) => inRange.find((r) => r.metric === metric && r.day === day)?.value ?? 0;
  const activeSum = total("active");
  const sessions = total("sessions");
  return {
    installs: total("installs"),
    activeAvg: activeSum / Math.max(1, daysBetween(from, to)),
    weekly: at("active_7", to),
    monthly: at("active_30", to),
    sessions,
    sessionsPerUser: activeSum === 0 ? 0 : sessions / activeSum,
  };
}

/**
 * The report for a range from the daily totals of the range and the one
 * before it (pure). `today` is the day of the report: a cohort's return is
 * counted only once its day N is over.
 */
export function buildReport(
  rows: AnalyticsDailyRecord[],
  range: AnalyticsRange,
  today: string,
  sent: { id: number; title: string; createdAt: Date }[] = [],
): AnalyticsReport {
  const current = rows.filter((r) => r.day >= range.from && r.day <= range.to);
  const kpis = kpisOf(rows, range.from, range.to);
  const previous = kpisOf(rows, range.previous.from, range.previous.to);
  const value = (metric: AnalyticsMetric, day: string) => rows.find((r) => r.metric === metric && r.key === "" && r.day === day)?.value ?? 0;
  const previousHasData = rows.some((r) => r.day <= range.previous.to && r.metric === "active" && r.value > 0);

  const daily = dayRange(range.from, range.to).map((day, index) => ({
    day,
    active: value("active", day),
    installs: value("installs", day),
    sessions: value("sessions", day),
    previousActive: previousHasData ? value("active", addDays(range.previous.from, index)) : null,
  }));

  const retention = RETENTION_DAYS.map((n): RetentionPoint => {
    let cohort = 0;
    let returned = 0;
    for (const day of dayRange(range.from, range.to)) {
      // Day N of this cohort must be over.
      if (addDays(day, n) >= today) continue;
      cohort += value("installs", day);
      returned += value(`ret_d${n}`, day);
    }
    return { days: n, cohort, returned, rate: cohort === 0 ? null : Math.min(1, returned / cohort) };
  });

  // Items: their views in the range, named by their latest title.
  const itemViews = sumBy(current, "item");
  const titles = new Map<string, string>();
  for (const row of [...current].sort((a, b) => a.day.localeCompare(b.day))) if (row.metric === "item" && row.label) titles.set(row.key, row.label);
  const items = [...itemViews.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP)
    .map(([key, views]) => {
      const [kind, ...rest] = key.split(":");
      const id = rest.join(":");
      return { kind: (kind || "other") as AnalyticsItemKind | "other", id, title: titles.get(key) ?? `#${id}`, views };
    });

  const events = sumBy(current, "event");
  const views = events.get("item_view") ?? 0;
  const intent = INTENT_EVENTS.reduce((sum, type) => sum + (events.get(type) ?? 0), 0);
  const checkout = events.get("purchase_click") ?? 0;
  const funnel: AnalyticsReport["funnel"] = [
    { step: "view", value: views, rate: null },
    { step: "intent", value: intent, rate: views === 0 ? null : intent / views },
    { step: "checkout", value: checkout, rate: views === 0 ? null : checkout / views },
  ];
  const checkoutValue = [...sumBy(current, "checkout_value").entries()].map(([currency, cents]) => ({ currency, cents })).sort((a, b) => b.cents - a.cents);

  // Push: what the owner sent in the range (devices pushed), with the installs that opened it.
  const opens = sumBy(rows.filter((r) => r.day >= range.from), "push_open");
  const sentRows = current.filter((r) => r.metric === "push_sent");
  const sentTitles = new Map(sent.map((n) => [String(n.id), n.title]));
  const pushedById = new Map<string, { pushed: number; day: string; label: string | null }>();
  for (const row of sentRows) {
    const entry = pushedById.get(row.key) ?? { pushed: 0, day: row.day, label: row.label };
    entry.pushed += row.value;
    pushedById.set(row.key, entry);
  }
  const push = [...pushedById.entries()]
    .map(([id, entry]): PushRow => {
      const opened = opens.get(`id:${id}`) ?? 0;
      return {
        id,
        title: sentTitles.get(id) ?? entry.label ?? `Notification ${id}`,
        sentDay: entry.day,
        pushed: entry.pushed,
        opened,
        rate: entry.pushed === 0 ? null : Math.min(1, opened / entry.pushed),
      };
    })
    .sort((a, b) => b.sentDay.localeCompare(a.sentDay) || Number(b.id) - Number(a.id))
    .slice(0, 20);
  const pushFromSite = [...sumBy(current, "push_open").entries()]
    .filter(([key]) => key.startsWith("type:"))
    .map(([key, opened]) => ({ type: key.slice(5), opened }))
    .sort((a, b) => b.opened - a.opened);
  // Opens of notifications with an ID the platform didn't send (a website's own) count with their type.
  for (const [key, opened] of sumBy(current, "push_open")) {
    if (!key.startsWith("id:") || pushedById.has(key.slice(3))) continue;
    const type = current.find((r) => r.metric === "push_open" && r.key === key)?.label ?? "other";
    const found = pushFromSite.find((p) => p.type === type);
    if (found) found.opened += opened;
    else pushFromSite.push({ type, opened });
  }

  // 86.3 Automatic notifications by kind: their opens carry the kind as their type, never a notification ID.
  const autoPeople = sumBy(current, "auto_sent");
  const autoPushed = sumBy(current, "auto_pushed");
  const auto = [...new Set([...autoPeople.keys(), ...autoPushed.keys()])]
    .map((kind): AutoRow => {
      const pushed = autoPushed.get(kind) ?? 0;
      const opened = opens.get(`type:${kind}`) ?? 0;
      return { kind, people: autoPeople.get(kind) ?? 0, pushed, opened, rate: pushed === 0 ? null : Math.min(1, opened / pushed) };
    })
    .sort((a, b) => b.people - a.people || a.kind.localeCompare(b.kind));
  const autoKinds = new Set(auto.map((a) => a.kind));

  const searches = [...sumBy(current, "search").entries()]
    .filter(([, count]) => count >= MIN_SEARCH_COUNT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP)
    .map(([query, count]) => ({ query, count }));

  // 62 Screenshots of protected content, named by the lesson's latest title.
  const shotTitles = new Map<string, string>();
  for (const row of [...current].sort((a, b) => a.day.localeCompare(b.day))) if (row.metric === "screenshot" && row.label) shotTitles.set(row.key, row.label);
  const screenshots = [...sumBy(current, "screenshot").entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP * 2)
    .map(([key, count]) => {
      if (key === "other") return { kind: "other" as const, id: "", title: "", count };
      const [kind, ...rest] = key.split(":");
      const id = rest.join(":");
      return { kind: (kind || "other") as AnalyticsItemKind | "other", id, title: shotTitles.get(key) ?? `#${id}`, count };
    });

  return {
    range,
    hasData: current.some((r) => r.metric === "active" && r.value > 0),
    kpis,
    previous,
    daily,
    retention,
    platforms: shares(sumBy(current, "platform"), (k) => nameOf("platform", k)),
    systems: shares(sumBy(current, "os"), (k) => (k === "unknown" ? "Unknown" : k)),
    versions: shares(sumBy(current, "version"), (k) => (k === "unknown" ? "Unknown" : k)),
    countries: shares(sumBy(current, "country"), (k) => nameOf("country", k), 8),
    languages: shares(sumBy(current, "language"), (k) => nameOf("language", k)),
    screens: shares(sumBy(current, "screen"), (k) => screenName(k), TOP),
    items,
    funnel,
    checkoutValue,
    push,
    // A website's own notifications, without the app's automatic ones.
    pushFromSite: pushFromSite.filter((p) => !autoKinds.has(p.type)),
    searches,
    screenshots,
    sources: sourcesOf(current, kpis.sessions),
    auto,
  };
}

/** A screen kind as the dashboard says it: "course_list" → "Course list". */
export function screenName(kind: string): string {
  if (kind === "other") return "Other";
  const words = kind.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Brings the totals up to date, then reads the range and the one before it. */
export async function loadReport(
  store: Pick<
    DataStore,
    | "listAnalyticsEvents"
    | "countAnalyticsActive"
    | "countAnalyticsReturning"
    | "saveAnalyticsDaily"
    | "listAnalyticsDaily"
    | "listAnalyticsEventDays"
    | "listAnalyticsAppIds"
    | "purgeAnalyticsEvents"
    | "listHostedBroadcasts"
  >,
  appId: string,
  range: AnalyticsRange,
  now: Date,
  zone = "UTC",
): Promise<AnalyticsReport> {
  // The last day of each period gives its weekly and monthly users.
  await refreshAnalytics(store, appId, now, [range.to, range.previous.to], zone);
  const [rows, sent] = await Promise.all([store.listAnalyticsDaily(appId, range.previous.from, range.to), store.listHostedBroadcasts(appId, 100)]);
  return buildReport(rows, range, dayOf(now, zone), sent);
}
