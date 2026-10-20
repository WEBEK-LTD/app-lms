import { appZone } from "../analytics/zone";
import { isDate, localToUtc, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, ScheduledNotification } from "../data/types";
import { RATE_LIMITS, rateLimitHits } from "../rate-limit";
import type { sendPush } from "./push";
import { checkNotificationText, sendAppNotification } from "./send-notification";

/**
 * 61 Notifications to everyone who uses the app, sent later: Dashboard › App
 * notifications › Send later and the Owner API (Yallapp Business). The time
 * is a date and time in the app's time zone (Analytics', roadmap 47). The
 * frequent job (`/api/internal/frequent`, every 5 minutes) sends those whose
 * time came through `sendAppNotification`, so the words, the inbox, push and
 * the hourly limit are those of sending now: a notification that finds the
 * hour's 10 used waits for the next run. Each one is taken by one run only
 * (a conditional update), so running the job twice never sends it twice.
 */

/** At most this many waiting per app. */
export const SCHEDULED_MAX = 50;
/** Up to this many days ahead. */
export const SCHEDULE_MAX_DAYS = 90;
/** A run that took one and stopped for this long leaves it failed, never sent twice. */
const STALE_MS = 30 * 60_000;
/** Shown on the dashboard and in the app: waiting, being sent, or stopped halfway. */
export const LISTED_STATUSES = ["scheduled", "sending", "failed"] as const;

export type ScheduleResult = { ok: true; notification: ScheduledNotification } | { ok: false; errors?: Record<string, string>; message?: string; conflict?: boolean };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The instant of a local date and time in the app's zone, with what's wrong with it. */
export function readSendAt(input: { date: unknown; time: unknown }, zone: string, now: Date): { sendAt: Date } | { error: string } {
  const date = typeof input.date === "string" ? input.date.trim() : "";
  const time = typeof input.time === "string" ? input.time.trim() : "";
  if (!isDate(date) || !TIME.test(time)) return { error: "Choose a date and time." };
  const sendAt = localToUtc(date, time, zone);
  // A time skipped by a clock change comes back on another local time: not one the owner chose.
  if (utcToLocal(sendAt, zone).time !== time) return { error: "Choose a date and time." };
  if (sendAt.getTime() <= now.getTime()) return { error: "Choose a time later than now." };
  if (sendAt.getTime() > now.getTime() + SCHEDULE_MAX_DAYS * 86_400_000) return { error: `Choose a time within the next ${SCHEDULE_MAX_DAYS} days.` };
  return { sendAt };
}

/** The local date and time a notification goes out, in the app's zone. */
export function localSendAt(notification: Pick<ScheduledNotification, "sendAt">, zone: string): { date: string; time: string } {
  const local = utcToLocal(notification.sendAt, zone);
  return { date: local.date, time: local.time };
}

function read(input: { title: unknown; body: unknown; date: unknown; time: unknown }, zone: string, now: Date) {
  const text = checkNotificationText(input);
  const when = readSendAt(input, zone, now);
  const errors = { ...text.errors, ...("error" in when ? { send_at: when.error } : {}) };
  return { title: text.title, body: text.body, sendAt: "sendAt" in when ? when.sendAt : null, errors };
}

/** Adds one for later. */
export async function scheduleAppNotification(
  deps: { store: DataStore; now: Date },
  app: App,
  input: { title: unknown; body: unknown; date: unknown; time: unknown; createdBy: string | null },
): Promise<ScheduleResult> {
  const { store, now } = deps;
  const zone = await appZone(store, app);
  const { title, body, sendAt, errors } = read(input, zone, now);
  if (Object.keys(errors).length || !sendAt) return { ok: false, errors };
  const waiting = await store.listScheduledNotifications(app.id, ["scheduled", "sending"]);
  if (waiting.length >= SCHEDULED_MAX) {
    return { ok: false, conflict: true, message: `You have ${SCHEDULED_MAX} notifications waiting to be sent. Cancel one to add another.` };
  }
  const notification = await store.createScheduledNotification({
    appId: app.id,
    title,
    body,
    sendAt,
    status: "scheduled",
    createdBy: input.createdBy,
    claimedAt: null,
    sentAt: null,
    notificationId: null,
    result: null,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, notification };
}

/** Changes the words or the time of one still waiting. */
export async function editScheduledNotification(
  deps: { store: DataStore; now: Date },
  app: App,
  id: number,
  input: { title: unknown; body: unknown; date: unknown; time: unknown },
): Promise<ScheduleResult | null> {
  const { store, now } = deps;
  const saved = await store.getScheduledNotification(app.id, id);
  if (!saved) return null;
  if (saved.status !== "scheduled") return { ok: false, conflict: true, message: "This notification was already sent or cancelled." };
  const { title, body, sendAt, errors } = read(input, await appZone(store, app), now);
  if (Object.keys(errors).length || !sendAt) return { ok: false, errors };
  if (!(await store.updateScheduledNotification(app.id, id, "scheduled", { title, body, sendAt, updatedAt: now }))) {
    return { ok: false, conflict: true, message: "This notification was already sent or cancelled." };
  }
  return { ok: true, notification: (await store.getScheduledNotification(app.id, id))! };
}

/** Cancels one still waiting: "cancelled", "gone" (not this app's) or "too_late" (being sent or sent). */
export async function cancelScheduledNotification(deps: { store: DataStore; now: Date }, app: App, id: number): Promise<"cancelled" | "gone" | "too_late"> {
  const saved = await deps.store.getScheduledNotification(app.id, id);
  if (!saved) return "gone";
  if (saved.status === "cancelled") return "cancelled";
  if (saved.status !== "scheduled") return "too_late";
  const done = await deps.store.updateScheduledNotification(app.id, id, "scheduled", { status: "cancelled", updatedAt: deps.now });
  return done ? "cancelled" : "too_late";
}

export interface ScheduledRunReport {
  sent: number;
  /** Due but held back: the hour's limit was used, or the account isn't active. */
  waiting: number;
  cancelled: number;
  failed: number;
}

/** The frequent job's part: sends what is due, once each. */
export async function runScheduledNotifications(deps: { store: DataStore; key: Buffer; now: Date; send?: typeof sendPush }): Promise<ScheduledRunReport> {
  const { store, now } = deps;
  const report: ScheduledRunReport = { sent: 0, waiting: 0, cancelled: 0, failed: 0 };
  // A run that stopped halfway: never sent again, the owner sees it failed.
  for (const stale of await store.listStaleScheduledNotifications(new Date(now.getTime() - STALE_MS))) {
    const failed = await store.updateScheduledNotification(stale.appId, stale.id, "sending", {
      status: "failed",
      result: "Sending stopped halfway. Check the sent notifications before sending it again.",
      updatedAt: now,
    });
    if (failed) report.failed += 1;
  }
  for (const due of await store.listDueScheduledNotifications(now, 200)) {
    const app = await store.getAppById(due.appId);
    if (!app || app.backend !== "hosted") {
      if (await store.updateScheduledNotification(due.appId, due.id, "scheduled", { status: "cancelled", result: "The app no longer sends notifications from Yallapp.", updatedAt: now })) report.cancelled += 1;
      continue;
    }
    // As the dashboard: only an active account sends.
    const client = await store.getClientById(app.clientId);
    if (client?.status !== "active") {
      report.waiting += 1;
      continue;
    }
    // The hour's limit is used: it waits for a later run, without counting a try.
    if ((await rateLimitHits(store, RATE_LIMITS.hostedNotify, app.id, now)) >= RATE_LIMITS.hostedNotify.limit) {
      report.waiting += 1;
      continue;
    }
    if (!(await store.updateScheduledNotification(app.id, due.id, "scheduled", { status: "sending", claimedAt: now, updatedAt: now }))) continue;
    const license = await store.getLicenseForApp(app.clientId, app.id);
    const result = await sendAppNotification({ store, key: deps.key, now, send: deps.send }, app, license, { title: due.title, body: due.body });
    if (result.ok) {
      await store.updateScheduledNotification(app.id, due.id, "sending", { status: "sent", sentAt: now, notificationId: result.notificationId, result: result.message, updatedAt: now });
      report.sent += 1;
    } else if (result.limited) {
      await store.updateScheduledNotification(app.id, due.id, "sending", { status: "scheduled", claimedAt: null, updatedAt: now });
      report.waiting += 1;
    } else {
      await store.updateScheduledNotification(app.id, due.id, "sending", { status: "failed", result: result.message ?? Object.values(result.errors ?? {}).join(" "), updatedAt: now });
      report.failed += 1;
    }
  }
  return report;
}
