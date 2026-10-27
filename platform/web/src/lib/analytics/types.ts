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
  // 86.2 The app opened from one of its links tapped outside it.
  "link_open",
] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const ANALYTICS_ITEM_KINDS = ["course", "lesson", "product", "service", "class", "membership", "listing", "article", "event", "campaign", "page"] as const;
export type AnalyticsItemKind = (typeof ANALYTICS_ITEM_KINDS)[number];

/** 86.2 The store an install came from (`app_open` with `first_open`). */
export const INSTALL_STORES = ["google_play", "app_store", "galaxy_store", "appgallery", "testflight", "other"] as const;
export type InstallStore = (typeof INSTALL_STORES)[number];
/** 86.2 How a link reached the app (`link_open`): a QR code says `utm_medium=qr`. */
export const LINK_SOURCES = ["link", "qr"] as const;
export type LinkSource = (typeof LINK_SOURCES)[number];

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
  /** 86.2 `app_open` with `first_open`: the store; `link_open`: link or qr. */
  source?: InstallStore | LinkSource | null;
  /** 86.2 A link's `utm_campaign` and `utm_source` (`link_open`). */
  campaign?: string | null;
  referrer?: string | null;
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
  // 85.3 Automatic notifications by kind: the people notified, and the phones the push reached.
  "auto_sent",
  "auto_pushed",
  // 86.2 Where people come from: installs by store, links opened by source (link, qr), by campaign and by referrer.
  "install_store",
  "link_source",
  "utm_campaign",
  "utm_source",
  // 86.4 A WordPress site's shop totals (lib/analytics/site-sales.ts).
  "site_orders",
  "site_revenue",
  "site_refunds",
  "site_refunded",
  // 86.4 The weekly summary went out (key: the week's first day).
  "weekly_mail",
  // Book-keeping: the day was counted (value: when), or got late events since.
  "done",
  "dirty",
  // 98.1 Today so far was counted (value: when); with "dirty", today got events since.
  "counted",
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
