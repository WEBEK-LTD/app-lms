/**
 * 44 Usage statistics for app owners (docs/api/platform.yaml, tag Analytics).
 * The wire names are the contract's; rows are what the data store keeps.
 */

export const ANALYTICS_EVENT_TYPES = [
  "app_open",
  "screen_view",
  "item_view",
  "add_to_cart",
  "purchase_click",
  "enroll",
  "book",
  "donate",
  "ticket",
  "search",
  "push_open",
  "share",
  // 62 A screenshot while protected content was open (iPhone only; Android blocks them).
  "screenshot",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const ANALYTICS_ITEM_KINDS = ["course", "lesson", "product", "service", "class", "membership", "listing", "article", "event", "campaign", "page"] as const;
export type AnalyticsItemKind = (typeof ANALYTICS_ITEM_KINDS)[number];

/** The events that mean "took a step" towards buying, joining or giving (the funnel's middle step). */
export const INTENT_EVENTS = ["add_to_cart", "enroll", "book", "ticket", "donate"] as const satisfies readonly AnalyticsEventType[];

/** One raw event as stored: never the IP, never a search text. */
export interface AnalyticsEventRow {
  appId: string;
  installId: string;
  type: AnalyticsEventType;
  at: Date;
  /** The UTC day of `at`, YYYY-MM-DD. */
  day: string;
  platform: "android" | "ios";
  appVersion: string;
  osVersion: string | null;
  /** The language only ("ar", "en"). */
  language: string | null;
  /** ISO 3166-1 alpha-2 from the request's IP when it arrived, or null. */
  country: string | null;
  firstOpen: boolean;
  screen: string | null;
  itemKind: AnalyticsItemKind | null;
  itemId: string | null;
  title: string | null;
  amountCents: number | null;
  currency: string | null;
  notificationId: string | null;
  pushType: string | null;
}

/** One daily total: a metric, an optional key (a screen, a country…) and its value. */
export interface AnalyticsDailyRow {
  metric: AnalyticsMetric;
  key: string;
  /** A name to show with the key (an item's title, a notification's title). */
  label: string | null;
  value: number;
}

export interface AnalyticsDailyRecord extends AnalyticsDailyRow {
  day: string;
}

export const ANALYTICS_METRICS = [
  // Computed from the raw events of a day.
  "installs",
  "active",
  "active_7",
  "active_30",
  "sessions",
  "platform",
  "os",
  "version",
  "country",
  "language",
  "screen",
  "item",
  "event",
  "checkout_value",
  "push_open",
  // 62 Screenshots of protected content, by `lesson:<id>` (or `other`).
  "screenshot",
  // Written on the cohort's day when the day N later is counted.
  "ret_d1",
  "ret_d7",
  "ret_d30",
  // Counted when they happen, never recomputed.
  "search",
  "push_sent",
  // Book-keeping: the day was counted (value: when), or got late events since.
  "done",
  "dirty",
] as const;
export type AnalyticsMetric = (typeof ANALYTICS_METRICS)[number];

/**
 * Raw events are kept this many days on every plan (72: 40 before). Daily
 * totals are kept as long as the app's plan says (`PlanLimits.analyticsMonths`,
 * lib/analytics/retention.ts), and go with the app.
 */
export const RAW_RETENTION_DAYS = 90;
/** The phone drops events older than this, and so does the platform. */
export const MAX_EVENT_AGE_DAYS = 7;
/** At most this many keys per metric and day (items, screens, searches). */
export const MAX_KEYS_PER_DAY = 200;
