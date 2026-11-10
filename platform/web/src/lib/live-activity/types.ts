import type { DemoId } from "../demo/constants";
import type { Plan } from "../plans";

/**
 * The website's live activity card (Admin › Live activity): a small card in
 * the bottom start corner of the marketing pages that shows, one at a time,
 * something that really happened on Yallapp. Every card comes from a record:
 * a plan paid by a client who allowed it, a customer the team added by hand
 * with their agreement, a demo signed in to, an app gone live on a store, a
 * new account, or a count read from the code when there is nothing else.
 * Nothing here is ever made up.
 */

/** The kinds of card, in the admin's order. */
export const LIVE_KINDS = ["subscription", "demo", "published", "account", "fact"] as const;
export type LiveKind = (typeof LIVE_KINDS)[number];

/** In the admin (English). */
export const LIVE_KIND_LABEL: Record<LiveKind, string> = {
  subscription: "Subscriptions (paid with consent, and manual entries)",
  demo: "Someone trying a demo (city or country only)",
  published: "An app going live on a store (kind and store only)",
  account: "A new account (country only)",
  fact: "Facts from the code, only when there is nothing else",
};

export function isLiveKind(value: unknown): value is LiveKind {
  return typeof value === "string" && (LIVE_KINDS as readonly string[]).includes(value);
}

/** Where the card shows: every marketing page, or only the home and pricing pages (in every language). */
export const LIVE_PAGES = ["all", "home_pricing"] as const;
export type LivePages = (typeof LIVE_PAGES)[number];

export const LIVE_PAGES_LABEL: Record<LivePages, string> = {
  all: "All marketing pages",
  home_pricing: "Only the home and pricing pages",
};

/** The team's settings for the card (platform setting `liveActivity`). */
export interface LiveActivitySetting {
  on: boolean;
  kinds: LiveKind[];
  pages: LivePages;
  /** How long after a page opens the first card shows. */
  firstDelaySeconds: number;
  /** The pause between two cards. */
  gapSeconds: number;
  /** The most cards one visitor sees in a visit (the browser tab's session). */
  maxPerVisit: number;
}

/** Without a saved setting: on, every kind, every marketing page. */
export const LIVE_DEFAULTS: LiveActivitySetting = {
  on: true,
  kinds: [...LIVE_KINDS],
  pages: "all",
  firstDelaySeconds: 8,
  gapSeconds: 20,
  maxPerVisit: 5,
};

/** What the team can choose for the timings. */
export const LIVE_LIMITS = {
  firstDelaySeconds: { min: 0, max: 120 },
  gapSeconds: { min: 5, max: 600 },
  maxPerVisit: { min: 1, max: 20 },
} as const;

/** How long each card stays (the ember line shrinks over it). */
export const LIVE_SHOW_SECONDS = 6;
/** The most cards the public feed returns. */
export const LIVE_FEED_MAX = 10;
/** The most cards of one kind in the feed, so one kind doesn't fill it. */
export const LIVE_PER_KIND_MAX = 4;
/** How far back the feed looks for subscriptions, manual entries, apps gone live and new accounts. */
export const LIVE_FEED_DAYS = 30;
/** Demo sign-ins are kept this long, then deleted by the daily job. */
export const DEMO_VISIT_DAYS = 7;

/**
 * A customer the team adds by hand (a client who signed up offline, after a
 * meeting, and pays later), shown on the website like a subscription. Only
 * the last name's initial is kept. `consent` is the box "This customer
 * agreed to be shown on the website": without it the entry can't be saved,
 * and it never shows.
 */
export interface LiveActivityEntry {
  id: string;
  firstName: string;
  /** One letter, or null when the team gave none. */
  lastInitial: string | null;
  plan: Plan;
  city: string | null;
  /** ISO 3166-1 alpha-2. */
  country: string | null;
  /** The day they subscribed or agreed. */
  agreedAt: Date;
  /** The client's account, when there is one. */
  clientId: string | null;
  consent: boolean;
  /** Hidden by the team: kept, never shown. */
  hidden: boolean;
  /** The admin who added it (their email). */
  createdBy: string;
  createdAt: Date;
}

/**
 * A visitor signing in to a demo app with the demo number: which demo, the
 * country the request came from (lib/geo.ts; the IP is never kept) and when.
 * Nothing else: no device, no phone, no name. Kept DEMO_VISIT_DAYS.
 */
export interface DemoVisit {
  id: number;
  demo: DemoId;
  country: string | null;
  at: Date;
}

/** A piece of a card's sentence; `em` is drawn in ember (the plan, the demo, the store). */
export interface LivePart {
  text: string;
  em?: true;
}

/**
 * One card as the public feed sends it: only words already safe to show.
 * Never an email, a phone, a full last name, a client's or app's name, or an id of ours.
 */
export interface LiveItem {
  /** An opaque key for the browser (the card's position in this feed). */
  key: string;
  kind: LiveKind;
  /** The avatar: a first name's initial, or a Material Symbols name. */
  avatar: { letter: string } | { icon: "smartphone" | "rocket_launch" | "account_circle" | "apps" };
  tone: "ember" | "night" | "ok" | "earth";
  text: LivePart[];
  /** The line under it, before the time: the city or country of a subscription ("Istanbul", "Türkiye"), the kind of an app gone live ("School app"), or null. */
  detail: string | null;
  /** When it happened (ISO), for "2 hours ago" in the visitor's language; null for a fact. */
  at: string | null;
  /** Only the day is known: "today", "yesterday", "3 days ago". */
  day?: true;
}

/** GET /api/live-activity: the settings the browser needs, and the cards in the visitor's language. */
export interface LiveFeed {
  on: boolean;
  pages: LivePages;
  firstDelayMs: number;
  gapMs: number;
  showMs: number;
  maxPerVisit: number;
  items: LiveItem[];
  words: { region: string; close: string; brand: string };
}
