import { countryName } from "../account/country";
import { KINDS, kindOf } from "../app/kinds";
import type { DataStore } from "../data/store";
import type { PublishingStore } from "../data/types";
import { demoClientId } from "../demo/apps";
import { DEMO_BRANDS } from "../demo/content";
import type { DemoId } from "../demo/constants";
import { kindNameFor } from "../marketing-lang";
import { getPlans } from "../settings/platform";
import { APP_STORES, STORE_FACTS, type AppStore } from "../stores";
import { formatMessage, messagesFor, type Lang, type MessageValues } from "@/i18n";
import { maskedName, maskFullName } from "./names";
import { liveSetting } from "./settings";
import {
  DEMO_VISIT_DAYS,
  LIVE_FEED_DAYS,
  LIVE_FEED_MAX,
  LIVE_PER_KIND_MAX,
  LIVE_SHOW_SECONDS,
  type LiveActivitySetting,
  type LiveFeed,
  type LiveItem,
  type LiveKind,
  type LivePart,
} from "./types";

/**
 * The website's live activity feed (GET /api/live-activity): what really
 * happened lately, read from the records, in the visitor's language.
 *
 * - Subscriptions: plans paid by clients who ticked "Show my first name and
 *   plan on Yallapp's website" (`plan_payments.show_on_site`), and the
 *   customers the team added by hand with their agreement and didn't hide.
 *   The first name and the last name's initial only, the plan, the city or
 *   country when known.
 * - Demos: sign-ins to a demo app (`demo_visits`, 7 days), with the country
 *   the request came from. Never a name.
 * - Apps gone live on a store (the `store_live` milestone, the store from
 *   Publishing): the kind of app and the store only, never whose it is.
 * - New accounts (the `signed_up` milestone): the account's country only.
 * - Facts, only when there is none of the above: the number of kinds of
 *   app and of app stores, counted from the code.
 *
 * The demo apps' own account is never shown.
 */

/** One activity before it is put in words. */
export type LiveEvent =
  /** `day`: only the day is known (an entry the team added), so the card says "today" or "3 days ago", never hours. */
  | { kind: "subscription"; name: string; plan: string; city: string | null; country: string | null; at: Date; day?: true }
  | { kind: "demo"; demo: DemoId; country: string | null; at: Date }
  | { kind: "published"; kindName: string; store: AppStore; at: Date }
  | { kind: "account"; country: string | null; at: Date }
  | { kind: "fact"; fact: "kinds" | "stores"; count: number; at: null };

const DAY_MS = 86_400_000;

/** Publishing's stores as the website names them. */
const STORE_OF: Record<PublishingStore, AppStore> = { android: "google_play", ios: "app_store", galaxy: "galaxy_store", huawei: "appgallery", xiaomi: "getapps" };

/** The true counts the facts state, from the code: every kind of app the picker offers, every store Yallapp publishes to. */
export function liveFacts(): Extract<LiveEvent, { kind: "fact" }>[] {
  return [
    { kind: "fact", fact: "kinds", count: KINDS.length, at: null },
    { kind: "fact", fact: "stores", count: APP_STORES.length, at: null },
  ];
}

async function subscriptions(store: DataStore, since: Date, demoId: string | null): Promise<LiveEvent[]> {
  const plans = await getPlans(store);
  const out: LiveEvent[] = [];
  const seen = new Set<string>();
  // Paid plans whose client allowed it, the latest first, once per client.
  const payments = (await store.listPaidPlanPaymentsSince(since))
    .filter((p) => p.showOnSite === true && p.paidAt && (p.purpose ?? "plan") === "plan" && p.clientId !== demoId)
    .sort((a, b) => b.paidAt!.getTime() - a.paidAt!.getTime());
  for (const payment of payments) {
    if (seen.has(payment.clientId) || out.length >= LIVE_PER_KIND_MAX) continue;
    seen.add(payment.clientId);
    const client = await store.getClientById(payment.clientId);
    const user = client ? await store.getUserById(client.userId) : null;
    const name = maskFullName(user?.name);
    const plan = plans[payment.plan]?.name;
    if (!client || client.status === "suspended" || !name || !plan) continue;
    out.push({ kind: "subscription", name, plan, city: null, country: client.country ?? null, at: payment.paidAt! });
  }
  // The team's entries: only with the customer's agreement, and not hidden.
  for (const entry of await store.listLiveActivityEntries()) {
    if (!entry.consent || entry.hidden || entry.agreedAt.getTime() < since.getTime()) continue;
    if (entry.clientId && seen.has(entry.clientId)) continue;
    const name = maskedName(entry.firstName, entry.lastInitial);
    const plan = plans[entry.plan]?.name;
    if (!name || !plan) continue;
    if (entry.clientId) seen.add(entry.clientId);
    out.push({ kind: "subscription", name, plan, city: entry.city, country: entry.country, at: entry.agreedAt, day: true });
  }
  return out;
}

async function demos(store: DataStore, now: Date): Promise<LiveEvent[]> {
  const visits = await store.listDemoVisitsSince(new Date(now.getTime() - DEMO_VISIT_DAYS * DAY_MS), 500);
  const out: LiveEvent[] = [];
  const seen = new Set<string>();
  for (const visit of visits) {
    const key = `${visit.demo}:${visit.country ?? ""}`;
    if (seen.has(key) || !DEMO_BRANDS[visit.demo]) continue;
    seen.add(key);
    out.push({ kind: "demo", demo: visit.demo, country: visit.country, at: visit.at });
  }
  return out;
}

async function published(store: DataStore, since: Date, demoId: string | null): Promise<LiveEvent[]> {
  const live = (await store.listMilestones({ since, kinds: ["store_live"] })).filter((m) => m.clientId !== demoId && m.appId);
  const out: LiveEvent[] = [];
  for (const milestone of live.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 20)) {
    const app = await store.getAppById(milestone.appId!);
    if (!app || app.demo || app.deletedAt) continue;
    // The store it went live on first.
    const events = (await store.listPublishingEvents(app.id)).filter((e) => e.status === "live" && e.store !== "mode").sort((a, b) => a.at.getTime() - b.at.getTime());
    const first = events[0]?.store as PublishingStore | undefined;
    if (!first || !STORE_OF[first]) continue;
    const kind = kindOf(app);
    out.push({ kind: "published", kindName: kind.demo?.name ?? kind.name, store: STORE_OF[first], at: milestone.at });
  }
  return out;
}

async function accounts(store: DataStore, since: Date, demoId: string | null): Promise<LiveEvent[]> {
  const signedUp = (await store.listMilestones({ since, kinds: ["signed_up"] })).filter((m) => m.clientId !== demoId);
  const out: LiveEvent[] = [];
  for (const milestone of signedUp.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 20)) {
    const client = await store.getClientById(milestone.clientId);
    if (!client || client.status === "suspended") continue;
    out.push({ kind: "account", country: client.country ?? null, at: milestone.at });
  }
  return out;
}

/**
 * The activities the settings allow, the latest first: at most
 * LIVE_PER_KIND_MAX of a kind and LIVE_FEED_MAX in all; the facts only when
 * there is nothing else.
 */
export async function collectLiveEvents(store: DataStore, setting: LiveActivitySetting, now: Date): Promise<LiveEvent[]> {
  if (!setting.on) return [];
  const since = new Date(now.getTime() - LIVE_FEED_DAYS * DAY_MS);
  const demoId = await demoClientId(store);
  const wants = (kind: LiveKind) => setting.kinds.includes(kind);
  // One source that can't be read (a deploy preview on a database the new
  // tables haven't reached yet) leaves the others, and then the facts.
  const none = (): LiveEvent[] => [];
  const lists = await Promise.all([
    wants("subscription") ? subscriptions(store, since, demoId).catch(none) : [],
    wants("demo") ? demos(store, now).catch(none) : [],
    wants("published") ? published(store, since, demoId).catch(none) : [],
    wants("account") ? accounts(store, since, demoId).catch(none) : [],
  ]);
  const events = lists
    .flatMap((list) => list.filter((e) => e.at && e.at.getTime() <= now.getTime() + 60_000).slice(0, LIVE_PER_KIND_MAX))
    .sort((a, b) => b.at!.getTime() - a.at!.getTime())
    .slice(0, LIVE_FEED_MAX);
  if (events.length || !wants("fact")) return events;
  return liveFacts();
}

/** "{name} subscribed to <em>{plan}</em>" as parts, the `<em>` ones drawn in ember; values are never read as markup. */
export function partsOf(lang: Lang, message: string, values: MessageValues = {}): LivePart[] {
  const parts: LivePart[] = [];
  const pattern = /<em>([\s\S]*?)<\/em>/g;
  let last = 0;
  for (const match of message.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: formatMessage(lang, message.slice(last, match.index), values) });
    parts.push({ text: formatMessage(lang, match[1]!, values), em: true });
    last = match.index + match[0].length;
  }
  if (last < message.length) parts.push({ text: formatMessage(lang, message.slice(last), values) });
  return parts.filter((p) => p.text);
}

/** A name, place or brand kept in its own direction inside the sentence ("Selin K." in an Arabic one). */
const isolate = (text: string) => `\u2068${text}\u2069`;

/** The activities as the cards the browser shows, in `lang`: only words safe to show. */
export function liveItems(events: LiveEvent[], lang: Lang): LiveItem[] {
  const w = messagesFor(lang).live;
  const place = (city: string | null, country: string | null) => city ?? (country ? countryName(country, lang) : null);
  return events.map((event, index): LiveItem => {
    const key = `${event.kind}-${index}`;
    const at = event.at ? event.at.toISOString() : null;
    switch (event.kind) {
      case "subscription":
        return {
          key,
          kind: event.kind,
          avatar: { letter: [...event.name][0]!.toLocaleUpperCase() },
          tone: "ember",
          text: partsOf(lang, w.subscribed, { name: isolate(event.name), plan: isolate(event.plan) }),
          detail: place(event.city, event.country),
          at,
          ...(event.day ? { day: true as const } : {}),
        };
      case "demo": {
        const where = place(null, event.country);
        const demo = DEMO_BRANDS[event.demo].appName;
        return { key, kind: event.kind, avatar: { icon: "smartphone" }, tone: "ok", text: partsOf(lang, where ? w.trying : w.tryingNowhere, { place: isolate(where ?? ""), demo: isolate(demo) }), detail: null, at };
      }
      case "published":
        return {
          key,
          kind: event.kind,
          avatar: { icon: "rocket_launch" },
          tone: "night",
          text: partsOf(lang, w.published, { store: isolate(STORE_FACTS[event.store].short) }),
          detail: formatMessage(lang, w.publishedKind, { kind: kindNameFor(lang, event.kindName) }),
          at,
        };
      case "account": {
        const where = place(null, event.country);
        return { key, kind: event.kind, avatar: { icon: "account_circle" }, tone: "earth", text: partsOf(lang, where ? w.account : w.accountNowhere, { place: isolate(where ?? "") }), detail: null, at };
      }
      case "fact":
        return { key, kind: event.kind, avatar: { icon: "apps" }, tone: "earth", text: partsOf(lang, event.fact === "kinds" ? w.factKinds : w.factStores, { count: event.count }), detail: null, at: null };
    }
  });
}

/** The feed as GET /api/live-activity sends it. */
export function liveFeedOf(setting: LiveActivitySetting, events: LiveEvent[], lang: Lang): LiveFeed {
  const w = messagesFor(lang).live;
  const items = setting.on ? liveItems(events, lang) : [];
  return {
    on: setting.on && items.length > 0,
    pages: setting.pages,
    firstDelayMs: setting.firstDelaySeconds * 1000,
    gapMs: setting.gapSeconds * 1000,
    showMs: LIVE_SHOW_SECONDS * 1000,
    maxPerVisit: setting.maxPerVisit,
    items,
    words: { region: w.region, close: w.close, brand: w.brand },
  };
}

const CACHE_MS = 60_000;
let cache: { at: number; setting: LiveActivitySetting; events: LiveEvent[] } | null = null;

/** The feed in `lang`, its records read at most once a minute per server instance. */
export async function liveFeed(store: DataStore, lang: Lang, now: Date = new Date()): Promise<LiveFeed> {
  if (!cache || now.getTime() - cache.at >= CACHE_MS || now.getTime() < cache.at) {
    const setting = await liveSetting(store);
    cache = { at: now.getTime(), setting, events: await collectLiveEvents(store, setting, now) };
  }
  return liveFeedOf(cache.setting, cache.events, lang);
}

/** After the team changes the card's settings or entries: this instance reads them again. */
export function clearLiveFeedCache(): void {
  cache = null;
}
