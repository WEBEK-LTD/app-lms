import { announcementsFor, announcementText, type AudienceSubject } from "./announcements";
import { appLabel } from "./app/label";
import { formatAmount } from "./billing/prices";
import { paymentWhat } from "./billing/receipt";
import { inlineText, parseMarkdown, type Block } from "./content/markdown";
import type { DataStore } from "./data/store";
import type { Announcement, App, Build, OwnerNotice, PlanPayment } from "./data/types";
import type { AccountTopic, UpdateKind } from "./updates-words";
import { planName, type Plan } from "./plans";
import { getPlans } from "./settings/platform";

/**
 * 57 The dashboard's bell, "Notifications from Yallapp": what the team
 * sends clients (Admin › Announcements: updates, announcements, maintenance,
 * offers) and what happened to the account ("Your account": the notices the
 * platform already gives owners, finished builds and payments received).
 * Read state is per person (`update_reads`): everyone who opens a client's
 * dashboard has their own. Opening the bell marks what it shows as read;
 * opening the full list (Dashboard › Announcements) marks everything on it.
 * Closing a banner on the overview is separate (`announcement_dismissals`).
 */

export { UPDATE_KIND_LABEL, badgeText, bellLabel, type AccountTopic, type UpdateKind } from "./updates-words";

export interface UpdateItem {
  /** `announcement:<id>`, `notice:<id>`, `build:<id>` or `payment:<id>`: what `update_reads` keeps. */
  key: string;
  kind: UpdateKind;
  topic: AccountTopic | null;
  title: string;
  /** Markdown for announcements (rendered without HTML), plain text for account items. */
  body: string;
  /** The text on one line, at most about 160 characters: for the bell. */
  summary: string;
  /** The language of the title and text (57: an announcement in Arabic or Turkish when asked and written). */
  lang: "en" | "ar" | "tr";
  at: Date;
  linkUrl: string | null;
  linkLabel: string | null;
  tone: "info" | "warn";
  /** The app it is about, when the account has more than one. */
  app: string | null;
  /** Counts in the bell: a live announcement or a recent account item (an ended announcement is only in the list). */
  current: boolean;
  unread: boolean;
}

/** How long account items stay in the bell and the list. */
export const NOTICE_DAYS = 60;
export const BUILD_DAYS = 14;
export const PAYMENT_DAYS = 30;
/** Finished builds per app; announcements in the full list. */
export const BUILDS_PER_APP = 3;
export const HISTORY_LIMIT = 100;
/** Items in the bell's panel; the rest are on the full list. */
export const BELL_LIMIT = 8;

const DAY = 86_400_000;
const KEY = /^(?:(?:announcement|build|payment):[0-9a-f-]{36}|notice:\d{1,18})$/i;

/** Whether a string is an item key the bell makes (anything else is ignored when marking read). */
export function isUpdateKey(value: unknown): value is string {
  return typeof value === "string" && KEY.test(value);
}

/** The words of some Markdown on one line, cut at a word: "Builds pause tonight from 22:00…". */
export function summaryOf(markdown: string, max = 160): string {
  const words = (blocks: Block[]): string[] =>
    blocks.flatMap((b) =>
      b.t === "p" || b.t === "h" ? [inlineText(b.c)] : b.t === "ul" || b.t === "ol" ? b.items.map(inlineText) : b.t === "quote" ? words(b.blocks) : b.t === "pre" ? [b.v] : [],
    );
  const text = words(parseMarkdown(markdown)).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

function announcementItem(a: Announcement, lang: string, now: Date): Omit<UpdateItem, "unread"> {
  const text = announcementText(a, lang);
  return {
    key: `announcement:${a.id}`,
    kind: a.kind,
    topic: null,
    title: text.title,
    body: text.body,
    summary: summaryOf(text.body),
    lang: text.lang,
    at: a.startsAt,
    linkUrl: a.linkUrl,
    linkLabel: a.linkLabel,
    tone: a.severity === "warning" ? "warn" : "info",
    app: null,
    current: a.endsAt === null || a.endsAt.getTime() > now.getTime(),
  };
}

const NOTICE_TOPIC: Record<OwnerNotice["kind"], AccountTopic> = {
  app_users_80: "users",
  app_users_100: "users",
  plan_ends_7: "plan",
  plan_ends_1: "plan",
  plan_ends_0: "plan",
  wordpress_ready: "site",
  api_check_failed: "site",
  ticket_refund_due: "payment",
  storage_pack_ended: "storage",
  chat_expiring: "chat",
  integration_failed: "site",
};

/** Notice links are full addresses for the emails; in the dashboard they stay on this site. */
function localLink(url: string | null): string | null {
  return url ? url.replace(/^https?:\/\/[^/]+/, "") || "/" : null;
}

export interface AccountSources {
  apps: Pick<App, "id" | "appName">[];
  notices: OwnerNotice[];
  builds: Build[];
  payments: PlanPayment[];
  /** The plans' names as the team set them (the defaults when left out). */
  planNames?: Record<Plan, string>;
}

/**
 * The account's own items: the owner notices that are still true (also the
 * ones closed on the overview), builds that finished and payments received,
 * each for a while (NOTICE_DAYS, BUILD_DAYS, PAYMENT_DAYS).
 */
export function accountItems(sources: AccountSources, now: Date): Omit<UpdateItem, "unread">[] {
  const several = sources.apps.length > 1;
  const appName = (appId: string | null) => {
    if (!several || !appId) return null;
    const app = sources.apps.find((a) => a.id === appId);
    return app ? appLabel(app) : null;
  };
  const since = (days: number) => now.getTime() - days * DAY;
  const items: Omit<UpdateItem, "unread">[] = [];
  for (const n of sources.notices) {
    if (n.resolvedAt !== null || n.createdAt.getTime() < since(NOTICE_DAYS)) continue;
    items.push({
      key: `notice:${n.id}`,
      kind: "account",
      topic: NOTICE_TOPIC[n.kind] ?? "notice",
      title: n.title,
      body: n.body,
      summary: n.body,
      lang: "en",
      at: n.createdAt,
      linkUrl: localLink(n.linkUrl),
      linkLabel: n.linkUrl ? (n.linkLabel ?? "Open") : null,
      tone: n.tone,
      app: appName(n.appId),
      current: true,
    });
  }
  const perApp = new Map<string, number>();
  for (const b of [...sources.builds].sort((x, y) => (y.finishedAt?.getTime() ?? 0) - (x.finishedAt?.getTime() ?? 0))) {
    if ((b.status !== "ready" && b.status !== "failed") || !b.finishedAt || b.finishedAt.getTime() < since(BUILD_DAYS)) continue;
    const count = perApp.get(b.appId) ?? 0;
    if (count >= BUILDS_PER_APP) continue;
    perApp.set(b.appId, count + 1);
    const version = `${b.versionName} (${b.versionCode})`;
    const ready = b.status === "ready";
    const text = ready ? `Version ${version} is ready to download and publish.` : `Version ${version} didn't finish. See what went wrong on Builds & downloads.`;
    items.push({
      key: `build:${b.id}`,
      kind: "account",
      topic: ready ? "build_ready" : "build_failed",
      title: ready ? "Your app build is ready" : "Your app build failed",
      body: text,
      summary: text,
      lang: "en",
      at: b.finishedAt,
      linkUrl: `/dashboard/open?app=${b.appId}&to=builds`,
      linkLabel: "Open Builds & downloads",
      tone: ready ? "info" : "warn",
      app: appName(b.appId),
      current: true,
    });
  }
  for (const p of sources.payments) {
    if (p.status !== "paid" || !p.paidAt || p.paidAt.getTime() < since(PAYMENT_DAYS)) continue;
    const text = `${paymentWhat(p, sources.planNames?.[p.plan] ?? planName(p.plan))}: ${formatAmount(p.amountCents, p.currency)}.`;
    items.push({
      key: `payment:${p.id}`,
      kind: "account",
      topic: "payment",
      title: "Payment received",
      body: text,
      summary: text,
      lang: "en",
      at: p.paidAt,
      linkUrl: `/dashboard/license/receipts/${p.id}`,
      linkLabel: "See the receipt",
      tone: "info",
      app: appName(p.appId),
      current: true,
    });
  }
  return items;
}

export interface UpdatesInput {
  announcements: Announcement[];
  subject: AudienceSubject;
  account: AccountSources;
  /** The keys this person read. */
  read: Iterable<string>;
  /** The language to show announcements in (57: "en" until the dashboard follows the user's, Phase 56). */
  lang: string;
}

export interface Updates {
  /** Newest first: live announcements and account items, then ended announcements are only in `all`. */
  current: UpdateItem[];
  /** The full list: every announcement that started for this client (at most HISTORY_LIMIT) and the account items, newest first. */
  all: UpdateItem[];
  /** Unread among `current`: the bell's badge. */
  unread: number;
}

/** Everything for one person: what's in the bell, the full list, and how many are unread. */
export function buildUpdates(input: UpdatesInput, now: Date): Updates {
  const { history } = announcementsFor(input.announcements, input.subject, [], now);
  const read = new Set(input.read);
  const all = [...history.slice(0, HISTORY_LIMIT).map((a) => announcementItem(a, input.lang, now)), ...accountItems(input.account, now)]
    .sort((a, b) => b.at.getTime() - a.at.getTime() || a.key.localeCompare(b.key))
    .map((item) => ({ ...item, unread: item.current && !read.has(item.key) }));
  const current = all.filter((item) => item.current);
  return { current, all, unread: current.filter((item) => item.unread).length };
}

/** Who is reading and which account: the signed-in person (our team member managing a dashboard reads for themselves). */
export interface UpdatesReader {
  userId: string;
  clientId: string;
  apps: App[];
  subject: AudienceSubject;
  lang: string;
  /**
   * 60 What of the account this person sees (lib/team/permissions.ts): notices
   * and builds are the app's settings, payments to Yallapp are the owner's.
   * Missing: everything (the owner, our team).
   */
  sees?: { notices: boolean; builds: boolean; payments: boolean };
}

/** Loads a person's updates from the store. */
export async function loadUpdates(store: DataStore, reader: UpdatesReader, now: Date): Promise<Updates> {
  const sees = reader.sees ?? { notices: true, builds: true, payments: true };
  // 60 A member limited to some apps sees those apps' notices (and the account's own).
  const appIds = new Set(reader.apps.map((a) => a.id));
  const [announcements, notices, payments, builds, plans] = await Promise.all([
    store.listAnnouncements(),
    sees.notices ? store.listOwnerNotices({ clientId: reader.clientId, limit: 50 }).then((list) => list.filter((n) => !n.appId || appIds.has(n.appId))) : [],
    sees.payments ? store.listPlanPayments({ clientId: reader.clientId, limit: 20 }) : [],
    sees.builds ? Promise.all(reader.apps.map((a) => store.listBuildsByApp(a.id, 10, "all"))).then((lists) => lists.flat()) : [],
    getPlans(store),
  ]);
  const planNames = Object.fromEntries(Object.entries(plans).map(([id, info]) => [id, info.name])) as Record<Plan, string>;
  const input: UpdatesInput = { announcements, subject: reader.subject, account: { apps: reader.apps, notices, builds, payments, planNames }, read: [], lang: reader.lang };
  // Only the reads of what is listed now are looked up.
  const keys = buildUpdates(input, now).all.map((item) => item.key);
  return buildUpdates({ ...input, read: await store.listReadUpdates(reader.userId, keys) }, now);
}

/** Marks items read for a person: the given keys (only well-formed ones, at most 200). */
export async function markRead(store: DataStore, userId: string, keys: unknown[], now: Date): Promise<void> {
  const items = [...new Set(keys.filter(isUpdateKey))].slice(0, 200);
  if (items.length) await store.markUpdatesRead({ userId, items, now });
}
