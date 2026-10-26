import { appZone } from "../analytics/zone";
import { dayOf } from "../analytics/days";
import { addDays, localToUtc, utcToLocal, weekdayOf } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, CampaignSend, License, NotificationCampaign } from "../data/types";
import { appPlan } from "../entitlements";
import { appIsActive } from "../license/status";
import { sendCampaignToSite, type SiteDeps } from "../license/campaign-site";
import { siteLinkBase, yallappLinkBase } from "../links/table";
import { hasFeature } from "../plans";
import { hitRateLimit, RATE_LIMITS, rateLimitHits } from "../rate-limit";
import { isEveryone, parseAudience, resolveAudience, type AudienceError } from "./audiences";
import { announce, serviceAccountOf } from "./notify";
import type { sendPush } from "./push";
import { readSendAt } from "./scheduled-notifications";
import { appMaySend, checkNotificationText, PLAN_ENDED_MESSAGE } from "./send-notification";

/**
 * 85.2 Notification campaigns (Dashboard › App notifications › Campaigns):
 * a title and message with a picture and what it opens, to an audience
 * (85.1), saved as a draft, sent now, at a date and time, or every week on a
 * day and time in the app's time zone. Each send is one inbox notification
 * (to everyone, or to the audience's people only) and a push to their
 * phones, counted with the app's other notifications in the hourly limit
 * (10 an hour, as before; every plan, as the owner decided on 2026-10-22).
 * Each send keeps how many people it went to and how many phones the push
 * reached or missed; opens come from the app's analytics (`push_open` by
 * notification), counted each night.
 *
 * The frequent job (every 5 minutes) sends those whose time came, once each
 * (a conditional update takes it), as the notifications sent later (61) do.
 */

export const CAMPAIGN_LIMITS = { waiting: 20, kept: 200 } as const;
const STALE_MS = 30 * 60_000;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Why a campaign wasn't saved or sent (English: the dashboard's `known` texts). */
export const CAMPAIGN_TEXTS = {
  nobody: "No one is in this audience yet. Choose other people, or send it later.",
  limited: "You've sent many notifications in a short time. Try again in an hour.",
  tooMany: `You have ${CAMPAIGN_LIMITS.waiting} campaigns waiting to be sent. Stop or cancel one to add another.`,
  notWaiting: "This campaign was already sent, stopped or changed. Open it again to see where it is.",
  stoppedHalfway: "Sending stopped halfway. Check the numbers before sending it again.",
  noLongerHosted: "The app no longer sends notifications from Yallapp.",
  link: "Enter an address that starts with https://, or choose a page of your app.",
  page: "Choose one of your app's pages.",
  image: "Choose a picture from your Media.",
  weekly: "Choose a day and a time.",
  audience: "Choose who gets it.",
  // 85.4 WordPress apps: through the site.
  wordpressEveryone: "Apps on WordPress send campaigns to everyone who uses the app.",
  siteFailed: "Your website couldn't be reached, so nothing was sent. Check that it's online with the Yallapp plugin active, then try again.",
  siteOldPlugin: "Your website's Yallapp plugin is too old to send campaigns. Update it in WordPress, then try again.",
} as const;

export type CampaignWhen = "draft" | "now" | "later" | "weekly";

export interface CampaignInput {
  title: unknown;
  body: unknown;
  /** "none", "page" (with `page`, a page's slug) or "link" (with `url`). */
  open: unknown;
  page?: unknown;
  url?: unknown;
  imageUrl?: unknown;
  audience: unknown;
  when: unknown;
  /** "later": the date and time; "weekly": the weekday (0 Sunday) and time. */
  date?: unknown;
  time?: unknown;
  weekday?: unknown;
}

export type CampaignResult =
  | { ok: true; campaign: NotificationCampaign; send?: CampaignSend; message: string }
  | { ok: false; errors?: Record<string, string>; message?: string; inactive?: boolean; limited?: boolean; campaign?: NotificationCampaign };

export interface CampaignDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  /** Yallapp's address (pictures and app links are on it). */
  platformUrl: string;
  send?: typeof sendPush;
  /** 85.4 How WordPress sites are reached (tests: a fake fetch, or LICENSE_REFRESH_TEST_URL). */
  site?: Pick<SiteDeps, "fetcher" | "resolve" | "testSiteUrl">;
}

/** The next time on a weekday (0 Sunday) at a local time, after `after`. */
export function nextWeekly(weekday: number, time: string, zone: string, after: Date): Date {
  const today = utcToLocal(after, zone).date;
  for (let d = 0; d <= 7; d += 1) {
    const date = addDays(today, d);
    if (weekdayOf(date) !== weekday) continue;
    const at = localToUtc(date, time, zone);
    if (at.getTime() > after.getTime()) return at;
  }
  return localToUtc(addDays(today, 14), time, zone);
}

/** What the campaign opens: nothing (the app), one of its pages, or an https address. */
function readLink(app: App, input: CampaignInput, platformUrl: string, pages: string[]): { link: string | null } | { error: string } {
  if (input.open === "page") {
    const slug = typeof input.page === "string" ? input.page.trim() : "";
    if (!pages.includes(slug)) return { error: CAMPAIGN_TEXTS.page };
    // 85.4 A WordPress app's links are on its site (`<site>/a`).
    const base = (app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null) ?? yallappLinkBase(platformUrl, app.id);
    return { link: `${base}/page/${encodeURIComponent(slug)}` };
  }
  if (input.open === "link") {
    const raw = typeof input.url === "string" ? input.url.trim() : "";
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || raw.length > 500 || !url.hostname.includes(".")) return { error: CAMPAIGN_TEXTS.link };
      return { link: url.toString() };
    } catch {
      return { error: CAMPAIGN_TEXTS.link };
    }
  }
  return { link: null };
}

/** A picture on Yallapp's own address (the Media library made public, or Yallapp's pictures). */
function readImage(input: CampaignInput, platformUrl: string): { imageUrl: string | null } | { error: string } {
  const raw = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  if (!raw) return { imageUrl: null };
  try {
    const url = new URL(raw);
    const own = new URL(platformUrl);
    if (url.origin !== own.origin || raw.length > 500 || !/^\/(m|api\/v1\/assets|design-pictures)\//.test(url.pathname)) return { error: CAMPAIGN_TEXTS.image };
    return { imageUrl: url.toString() };
  } catch {
    return { error: CAMPAIGN_TEXTS.image };
  }
}

const AUDIENCE_MESSAGES: Record<AudienceError, string> = {
  who: CAMPAIGN_TEXTS.audience,
  course: "Choose one of your courses.",
  inactive_days: CAMPAIGN_TEXTS.audience,
  languages: "Choose languages from the list.",
  platforms: CAMPAIGN_TEXTS.audience,
  countries: "Choose countries from the list.",
};

type Read = { fields: Omit<NotificationCampaign, "id" | "appId" | "status" | "claimedAt" | "lastSentAt" | "result" | "createdBy" | "createdAt" | "updatedAt">; when: CampaignWhen };

async function read(deps: CampaignDeps, app: App, input: CampaignInput, pages: string[]): Promise<{ ok: true; value: Read } | { ok: false; errors: Record<string, string> }> {
  const { title, body, errors } = checkNotificationText(input);
  const link = readLink(app, input, deps.platformUrl, pages);
  if ("error" in link) errors[input.open === "page" ? "page" : "url"] = link.error;
  const image = readImage(input, deps.platformUrl);
  if ("error" in image) errors.image = image.error;
  const audience = parseAudience(input.audience, app);
  if (!audience.ok) errors.audience = AUDIENCE_MESSAGES[audience.error];
  // 85.4 The site keeps its people: a WordPress app's campaign goes to everyone.
  else if (app.backend === "wordpress" && !isEveryone(audience.audience)) errors.audience = CAMPAIGN_TEXTS.wordpressEveryone;
  const when: CampaignWhen = input.when === "now" || input.when === "later" || input.when === "weekly" ? input.when : "draft";
  const zone = await appZone(deps.store, app);
  let sendAt: Date | null = null;
  let weekday: number | null = null;
  let time: string | null = null;
  if (when === "later") {
    const at = readSendAt({ date: input.date, time: input.time }, zone, deps.now);
    if ("error" in at) errors.send_at = at.error;
    else sendAt = at.sendAt;
  } else if (when === "weekly") {
    const day = Number(input.weekday);
    const t = typeof input.time === "string" ? input.time.trim() : "";
    if (!Number.isInteger(day) || day < 0 || day > 6 || !TIME.test(t)) errors.send_at = CAMPAIGN_TEXTS.weekly;
    else {
      weekday = day;
      time = t;
      sendAt = nextWeekly(day, t, zone, deps.now);
    }
  }
  if (Object.keys(errors).length || !audience.ok || "error" in link || "error" in image) return { ok: false, errors };
  return {
    ok: true,
    value: {
      when,
      fields: { title, body, imageUrl: image.imageUrl, link: link.link, audience: audience.audience, repeat: when === "weekly" ? "weekly" : "once", sendAt, weekday, time },
    },
  };
}

/**
 * Saves a new campaign, or changes one not sent yet (a draft, or one
 * waiting), and sends it at once when asked.
 */
export async function saveCampaign(
  deps: CampaignDeps,
  app: App,
  license: License | null,
  input: CampaignInput,
  options: { id?: number; by: string | null; pages: string[] },
): Promise<CampaignResult> {
  const { store, now } = deps;
  const existing = options.id ? await store.getNotificationCampaign(app.id, options.id) : null;
  if (options.id && (!existing || (existing.status !== "draft" && existing.status !== "scheduled"))) return { ok: false, message: CAMPAIGN_TEXTS.notWaiting };
  const parsed = await read(deps, app, input, options.pages);
  if (!parsed.ok) return parsed;
  const { fields, when } = parsed.value;
  // 68 Nothing is sent or scheduled once the app's plan has ended; a draft can still be kept.
  if (when !== "draft" && !(await appMaySend(store, app, now))) return { ok: false, inactive: true, message: PLAN_ENDED_MESSAGE };
  if (when === "later" || when === "weekly") {
    const waiting = (await store.listNotificationCampaigns(app.id, CAMPAIGN_LIMITS.kept)).filter((c) => c.status === "scheduled" && c.id !== existing?.id);
    if (waiting.length >= CAMPAIGN_LIMITS.waiting) return { ok: false, message: CAMPAIGN_TEXTS.tooMany };
  }
  const status = when === "later" || when === "weekly" ? "scheduled" : "draft";
  let campaign: NotificationCampaign;
  if (existing) {
    if (!(await store.updateNotificationCampaign(app.id, existing.id, existing.status, { ...fields, status, result: null, updatedAt: now }))) return { ok: false, message: CAMPAIGN_TEXTS.notWaiting };
    campaign = (await store.getNotificationCampaign(app.id, existing.id))!;
  } else {
    campaign = await store.createNotificationCampaign({ appId: app.id, ...fields, status, claimedAt: null, lastSentAt: null, result: null, createdBy: options.by, createdAt: now, updatedAt: now });
  }
  if (when !== "now") {
    const message = when === "draft" ? "Saved as a draft." : when === "weekly" ? "Saved. It goes out every week at the time you chose." : "Scheduled. It goes out at the time you chose.";
    return { ok: true, campaign, message };
  }
  return sendCampaignNow(deps, app, license, campaign);
}

/** Sends a draft now (the dashboard's Send now). */
export async function sendCampaignNow(deps: CampaignDeps, app: App, license: License | null, campaign: NotificationCampaign): Promise<CampaignResult> {
  const { store, now } = deps;
  if (campaign.status !== "draft") return { ok: false, message: CAMPAIGN_TEXTS.notWaiting };
  if (!(await appMaySend(store, app, now))) return { ok: false, inactive: true, message: PLAN_ENDED_MESSAGE, campaign };
  const people = app.backend === "wordpress" ? null : await resolveAudience(store, app, campaign.audience, now);
  if (people !== null && people.length === 0) return { ok: false, message: CAMPAIGN_TEXTS.nobody, campaign };
  const limit = await hitRateLimit(store, RATE_LIMITS.hostedNotify, app.id, now);
  if (!limit.allowed) return { ok: false, limited: true, message: CAMPAIGN_TEXTS.limited, campaign };
  if (!(await store.updateNotificationCampaign(app.id, campaign.id, "draft", { status: "sending", claimedAt: now, updatedAt: now }))) return { ok: false, message: CAMPAIGN_TEXTS.notWaiting };
  const send = await deliver(deps, app, license, campaign, people);
  if (!send.row) {
    // The site didn't take it: still a draft, to send again.
    await store.updateNotificationCampaign(app.id, campaign.id, "sending", { status: "draft", claimedAt: null, result: send.message, updatedAt: now });
    return { ok: false, message: send.message, campaign };
  }
  await store.updateNotificationCampaign(app.id, campaign.id, "sending", { status: "sent", sendAt: null, lastSentAt: now, result: send.message, updatedAt: now });
  return { ok: true, campaign: (await store.getNotificationCampaign(app.id, campaign.id))!, send: send.row, message: send.message };
}

/** One send: the inbox notification, the push, its numbers (none when a WordPress site didn't take it). */
async function deliver(deps: CampaignDeps, app: App, license: License | null, campaign: NotificationCampaign, people: number[] | null): Promise<{ row: CampaignSend | null; message: string }> {
  const { store, now } = deps;
  if (app.backend === "wordpress") return deliverToSite(deps, app, campaign);
  // 13.1 Push comes with the plan; without it the notification still reaches the inboxes.
  const push = hasFeature(await appPlan(store, license, now), "push");
  const result = await announce({
    store,
    app,
    title: campaign.title,
    body: campaign.body,
    account: push ? serviceAccountOf(app, deps.key) : null,
    now,
    send: deps.send,
    userIds: people,
    link: campaign.link,
    imageUrl: campaign.imageUrl,
  });
  const recipients = people === null ? await store.countHostedUsers(app.id) : people.length;
  const row = await store.createCampaignSend({
    campaignId: campaign.id,
    appId: app.id,
    notificationId: result.notification.id,
    sentAt: now,
    recipients,
    pushed: result.pushed,
    failed: Math.max(0, result.targets - result.pushed),
    reportedAt: now,
  });
  const message = result.pushError ? `Added to the inboxes. People: ${recipients}. ${result.pushError}` : `Sent. People: ${recipients}. Phones the push reached: ${result.pushed}.`;
  return { row, message };
}

/**
 * 85.4 A WordPress app's send: the site puts it in everyone's inbox and
 * pushes it in batches, then reports the numbers (`reportCampaignSend`).
 */
async function deliverToSite(deps: CampaignDeps, app: App, campaign: NotificationCampaign): Promise<{ row: CampaignSend | null; message: string }> {
  const { store, now } = deps;
  const row = await store.createCampaignSend({ campaignId: campaign.id, appId: app.id, notificationId: 0, sentAt: now, recipients: 0, pushed: 0, failed: 0, reportedAt: null });
  const answer = await sendCampaignToSite(
    { store, key: deps.key, now, ...deps.site },
    app,
    { send_id: row.id, title: campaign.title, body: campaign.body, link: campaign.link, image_url: campaign.imageUrl },
  );
  if (!answer.ok) {
    await store.deleteCampaignSend(app.id, row.id);
    return { row: null, message: answer.reason === "old_plugin" ? CAMPAIGN_TEXTS.siteOldPlugin : CAMPAIGN_TEXTS.siteFailed };
  }
  // Nothing to push (push off on the site, or no phone with a token): no report will come.
  const patch = { notificationId: answer.notificationId, recipients: answer.people, ...(answer.batches === 0 ? { reportedAt: now } : {}) };
  await store.updateCampaignSend(app.id, row.id, patch);
  return { row: { ...row, ...patch }, message: `Sent to your website: it's in everyone's inbox, and the push goes to ${answer.people} people's phones. The numbers show here once your website has sent it.` };
}

/** Stops a weekly campaign, or takes one waiting back to a draft (nothing goes out). */
export async function stopCampaign(store: DataStore, app: App, id: number, now: Date): Promise<boolean> {
  const campaign = await store.getNotificationCampaign(app.id, id);
  if (!campaign || campaign.status !== "scheduled") return false;
  const patch = campaign.repeat === "weekly" ? { status: "stopped" as const, sendAt: null, updatedAt: now } : { status: "draft" as const, sendAt: null, updatedAt: now };
  return store.updateNotificationCampaign(app.id, id, "scheduled", patch);
}

/** Deletes one that isn't going out now: its numbers go with it; what people received stays in their inboxes. */
export async function deleteCampaign(store: DataStore, app: App, id: number): Promise<boolean> {
  const campaign = await store.getNotificationCampaign(app.id, id);
  if (!campaign || campaign.status === "sending") return false;
  return store.deleteNotificationCampaign(app.id, id);
}

export interface CampaignStats {
  sends: number;
  recipients: number;
  pushed: number;
  failed: number;
  /** Phones that opened it from the notification (analytics, counted each night). */
  opened: number;
  lastSentAt: Date | null;
  /** 85.4 Sends a WordPress site hasn't reported yet. */
  waiting: number;
}

/** Each campaign's numbers, summed over its sends. */
export async function campaignStats(store: DataStore, app: App, campaigns: NotificationCampaign[], now: Date): Promise<Map<number, CampaignStats>> {
  const sends = await store.listCampaignSends(
    app.id,
    campaigns.map((c) => c.id),
  );
  const stats = new Map<number, CampaignStats>(campaigns.map((c) => [c.id, { sends: 0, recipients: 0, pushed: 0, failed: 0, opened: 0, lastSentAt: null, waiting: 0 }]));
  if (sends.length === 0) return stats;
  const zone = await appZone(store, app);
  const first = sends.reduce((min, s) => (s.sentAt < min ? s.sentAt : min), sends[0]!.sentAt);
  const opens = new Map<string, number>();
  for (const row of await store.listAnalyticsDaily(app.id, dayOf(first, zone), dayOf(now, zone), ["push_open"])) opens.set(row.key, (opens.get(row.key) ?? 0) + row.value);
  for (const send of sends) {
    const entry = stats.get(send.campaignId);
    if (!entry) continue;
    entry.sends += 1;
    entry.recipients += send.recipients;
    entry.pushed += send.pushed;
    entry.failed += send.failed;
    if (send.reportedAt === null) entry.waiting += 1;
    entry.opened += opens.get(`id:${send.notificationId}`) ?? 0;
    if (!entry.lastSentAt || send.sentAt > entry.lastSentAt) entry.lastSentAt = send.sentAt;
  }
  return stats;
}

export interface CampaignRunReport {
  sent: number;
  waiting: number;
  failed: number;
}

/** The frequent job's part: sends the campaigns whose time came, once each. */
export async function runCampaigns(deps: CampaignDeps): Promise<CampaignRunReport> {
  const { store, now } = deps;
  const report: CampaignRunReport = { sent: 0, waiting: 0, failed: 0 };
  for (const stale of await store.listStaleNotificationCampaigns(new Date(now.getTime() - STALE_MS))) {
    if (await store.updateNotificationCampaign(stale.appId, stale.id, "sending", { status: "failed", result: CAMPAIGN_TEXTS.stoppedHalfway, updatedAt: now })) report.failed += 1;
  }
  for (const due of await store.listDueNotificationCampaigns(now, 100)) {
    const app = await store.getAppById(due.appId);
    const fail = async (result: string) => {
      if (await store.updateNotificationCampaign(due.appId, due.id, "scheduled", { status: "failed", sendAt: null, result, updatedAt: now })) report.failed += 1;
    };
    if (!app || (app.backend !== "hosted" && app.backend !== "wordpress")) {
      await fail(CAMPAIGN_TEXTS.noLongerHosted);
      continue;
    }
    const client = await store.getClientById(app.clientId);
    // As the dashboard: only an active account sends; a suspended one waits.
    if (client?.status !== "active") {
      report.waiting += 1;
      continue;
    }
    const license = await store.getLicenseForApp(app.clientId, app.id);
    // 68 The plan has ended: not sent late after a renewal; the owner sees why.
    if (!appIsActive(license, client, now)) {
      await fail(PLAN_ENDED_MESSAGE);
      continue;
    }
    // The hour's limit is used: it waits for a later run.
    if ((await rateLimitHits(store, RATE_LIMITS.hostedNotify, app.id, now)) >= RATE_LIMITS.hostedNotify.limit) {
      report.waiting += 1;
      continue;
    }
    if (!(await store.updateNotificationCampaign(app.id, due.id, "scheduled", { status: "sending", claimedAt: now, updatedAt: now }))) continue;
    const people = app.backend === "wordpress" ? null : await resolveAudience(store, app, due.audience, now);
    const next = due.repeat === "weekly" && due.weekday !== null && due.time ? nextWeekly(due.weekday, due.time, await appZone(store, app), now) : null;
    if (people !== null && people.length === 0) {
      // Nobody this time: a weekly one tries again next week.
      await store.updateNotificationCampaign(app.id, due.id, "sending", next ? { status: "scheduled", sendAt: next, claimedAt: null, result: CAMPAIGN_TEXTS.nobody, updatedAt: now } : { status: "failed", sendAt: null, result: CAMPAIGN_TEXTS.nobody, updatedAt: now });
      if (!next) report.failed += 1;
      continue;
    }
    await hitRateLimit(store, RATE_LIMITS.hostedNotify, app.id, now);
    const send = await deliver(deps, app, license, due, people);
    if (!send.row) {
      // The site didn't take it: a weekly one tries next week; one sent later fails, with why.
      await store.updateNotificationCampaign(app.id, due.id, "sending", next ? { status: "scheduled", sendAt: next, claimedAt: null, result: send.message, updatedAt: now } : { status: "failed", sendAt: null, result: send.message, updatedAt: now });
      report.failed += 1;
      continue;
    }
    await store.updateNotificationCampaign(
      app.id,
      due.id,
      "sending",
      next ? { status: "scheduled", sendAt: next, claimedAt: null, lastSentAt: now, result: send.message, updatedAt: now } : { status: "sent", sendAt: null, lastSentAt: now, result: send.message, updatedAt: now },
    );
    report.sent += 1;
  }
  return report;
}
