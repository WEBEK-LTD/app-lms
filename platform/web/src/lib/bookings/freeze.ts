import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { addDays, dayOf, daysBetween, isDay } from "../analytics/days";
import type { DataStore } from "../data/store";
import type { App, Membership } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import { membershipActive, membershipFreezeSet, membershipFrozen } from "./memberships";
import { appLang } from "./reschedule";
import { bookingSetup } from "./setup";
import { localToUtc, utcToLocal } from "./time";

/**
 * 64 Frozen memberships of a gym (Dashboard › Members, the Owner API and
 * Yallapp Business): from a day (today or later) until the day it's back,
 * or until the gym unfreezes it. While frozen the door says "Frozen" and
 * classes can't be booked. The end date moves later by the days frozen,
 * the common gym rule: with an end day at once by the whole freeze; without
 * one when it is unfrozen, by the days from its first day to today (today
 * isn't frozen any more). Unfreezing a freeze with an end early gives back
 * the days it no longer takes; one that hadn't started is just removed.
 * Days are the gym's days in its time zone, and the end keeps its time of
 * day there (across a change of clocks too). Each change is one conditional
 * update in the store (the freeze and the end that were read), so two at
 * once change the end once. Classes the membership booked that start inside
 * the freeze are cancelled when it is set: their spots and credits go back
 * and the member is told in the app's inbox and on their phones.
 */

/** A freeze starts at most this many days ahead. */
export const FREEZE_AHEAD_DAYS = 90;
/** And lasts at most this many days. */
export const FREEZE_MAX_DAYS = 365;

/** The days from `from` to `to`, `to` not counted (0 when the same day). */
const gap = (from: string, to: string) => daysBetween(from, to) - 1;

function zoneOf(app: App): string {
  return bookingSetup(app).rules.timezone;
}

/** The start of a gym's day, as stored. */
export function dayStart(app: App, day: string): Date {
  return localToUtc(day, "00:00", zoneOf(app));
}

/** The gym's day of a stored instant. */
export function gymDayOf(app: App, at: Date): string {
  return dayOf(at, zoneOf(app));
}

export type FreezeResult = { ok: true; membership: Membership; released: number } | { ok: false; status: 400 | 409; errors: Record<string, string> };

/** The end moved by whole gym days, at the same time of day in the gym's time zone; null stays null. */
export function shiftEnd(app: App, endsAt: Date | null, days: number): Date | null {
  if (!endsAt || days === 0) return endsAt;
  const zone = zoneOf(app);
  const local = utcToLocal(endsAt, zone);
  return localToUtc(addDays(local.date, days), local.time, zone);
}

/** 64 Telling members of the classes a freeze cancelled; null: the inbox only. */
export interface FreezeNotify {
  /** The app's Firebase account (serviceAccountOf). */
  account: ServiceAccount | null;
  send?: typeof sendPush;
}

/** What the member reads when a freeze cancels a class they booked, in the app's language. */
export function freezeReleasedMessage(lang: Lang, className: string, when: string): { title: string; body: string } {
  switch (lang) {
    case "ar":
      return { title: "أُلغي حجز حصتك", body: `${className}، ${when}: عضويتك مجمّدة في ذلك اليوم، فأُعيد مكانك وأي رصيد حصص استُخدم له.` };
    case "tr":
      return { title: "Ders rezervasyonunuz iptal edildi", body: `${className}, ${when}: üyeliğiniz o gün dondurulmuş olduğundan yeriniz ve kullandığı ders hakkı geri verildi.` };
    default:
      return { title: "Your class booking is cancelled", body: `${className} on ${when}: your membership is frozen that day, so your spot was given back, with any class credit it used.` };
  }
}

/**
 * Cancels the classes the membership booked that start inside the freeze
 * (and haven't started), giving back their spots and credits through the
 * store's own cancelling, and tells the member. Returns how many.
 */
async function releaseFrozenClasses(store: DataStore, app: App, m: Membership, from: Date, until: Date | null, now: Date, notify: FreezeNotify | null): Promise<number> {
  const booked = (await store.listClassBookings({ appId: app.id, userId: m.userId, status: "booked" })).filter((b) => b.membershipId === m.id);
  const lang = booked.length ? await appLang(store, app.id) : "en";
  const zone = zoneOf(app);
  let released = 0;
  for (const booking of booked) {
    const session = await store.getClassSession(app.id, booking.sessionId);
    if (!session || session.startAt.getTime() <= now.getTime() || session.startAt < from || (until && session.startAt >= until)) continue;
    const cancelled = await store.cancelClassBooking({ appId: app.id, sessionId: session.id, userId: m.userId, now });
    if (!cancelled) continue;
    released += 1;
    try {
      const when = formatDate(lang, session.startAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: zone });
      const text = freezeReleasedMessage(lang, session.serviceName, when);
      const title = text.title.slice(0, NOTIFICATION_TITLE_MAX);
      const body = text.body.slice(0, NOTIFICATION_BODY_MAX);
      const notification = await store.createHostedNotification({ appId: app.id, userId: m.userId, title, body, createdAt: now });
      if (!notify?.account) continue;
      const tokens = (await store.listHostedPushDevices(app.id, [m.userId])).map(pushTarget);
      if (tokens.length === 0) continue;
      const result = await (notify.send ?? sendPush)(notify.account, tokens, { title, body, data: { type: "announcement", notification_id: String(notification.id) } }, { now });
      for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    } catch (error) {
      // The class is cancelled either way; the app shows it.
      console.error(`[freeze] couldn't tell the member of app ${app.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return released;
}

/** Why a membership can't be frozen now, or null. */
function cannotFreeze(m: Membership, now: Date): string | null {
  if (!membershipActive(m, now)) return "Only an active membership can be frozen.";
  if (membershipFreezeSet(m, now)) return "This membership is already frozen.";
  return null;
}

/**
 * Freezes a membership from the day `from` (YYYY-MM-DD) until the day
 * `until`, when it's back, or (empty) until it is unfrozen.
 */
export async function freezeMembership(store: DataStore, app: App, m: Membership, input: { from: unknown; until: unknown }, now: Date, notify: FreezeNotify | null = null): Promise<FreezeResult> {
  const refused = cannotFreeze(m, now);
  if (refused) return { ok: false, status: 409, errors: { from: refused } };
  const today = gymDayOf(app, now);
  const errors: Record<string, string> = {};
  const from = typeof input.from === "string" ? input.from.trim() : "";
  const untilText = typeof input.until === "string" ? input.until.trim() : input.until === null || input.until === undefined ? "" : "-";
  if (!isDay(from)) errors.from = "Choose the first frozen day.";
  else if (from < today) errors.from = "Choose today or a later day.";
  else if (from > addDays(today, FREEZE_AHEAD_DAYS)) errors.from = `Choose a day within ${FREEZE_AHEAD_DAYS} days.`;
  else if (m.endsAt && dayStart(app, from).getTime() >= m.endsAt.getTime()) errors.from = "Choose a day before the membership ends.";
  let until: string | null = null;
  if (untilText) {
    if (!isDay(untilText)) errors.until = "Choose the day it's back, or leave it empty.";
    else if (!errors.from && untilText <= from) errors.until = "Choose a day after the first frozen day.";
    else if (!errors.from && gap(from, untilText) > FREEZE_MAX_DAYS) errors.until = `A freeze lasts at most ${FREEZE_MAX_DAYS} days.`;
    else until = untilText;
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, errors };
  const start = dayStart(app, from);
  const end = until ? dayStart(app, until) : null;
  const shiftDays = until ? gap(from, until) : 0;
  const done = await store.freezeMembership(app.id, m.id, { from: start, until: end, endsAt: shiftEnd(app, m.endsAt, shiftDays), previousEndsAt: m.endsAt, now });
  if (!done) return { ok: false, status: 409, errors: { from: "This membership is already frozen." } };
  const released = await releaseFrozenClasses(store, app, m, start, end, now, notify);
  return { ok: true, membership: (await store.getMembership(app.id, m.id)) ?? m, released };
}

/** The days the end moves when unfrozen now (negative: given back). */
export function unfreezeShift(app: App, m: Pick<Membership, "frozenFrom" | "frozenUntil">, now: Date): number {
  if (!m.frozenFrom) return 0;
  const from = gymDayOf(app, m.frozenFrom);
  const until = m.frozenUntil ? gymDayOf(app, m.frozenUntil) : null;
  // Not started yet: the whole freeze goes.
  if (now.getTime() < m.frozenFrom.getTime()) return until ? -gap(from, until) : 0;
  const today = gymDayOf(app, now);
  // Back today: the days from its first day to yesterday were frozen.
  return until ? -gap(today, until) : gap(from, today);
}

/** Unfreezes a membership now (or removes a freeze to come). */
export async function unfreezeMembership(store: DataStore, app: App, m: Membership, now: Date): Promise<FreezeResult> {
  // A cancelled membership keeps its end where it is.
  if (m.status !== "active" || !m.frozenFrom || !membershipFreezeSet(m, now)) return { ok: false, status: 409, errors: { from: "This membership isn't frozen." } };
  const done = await store.unfreezeMembership(app.id, m.id, {
    from: m.frozenFrom,
    until: m.frozenUntil ?? null,
    endsAt: shiftEnd(app, m.endsAt, unfreezeShift(app, m, now)),
    previousEndsAt: m.endsAt,
    now,
  });
  if (!done) return { ok: false, status: 409, errors: { from: "This membership isn't frozen." } };
  return { ok: true, membership: (await store.getMembership(app.id, m.id)) ?? m, released: 0 };
}

/** What the dashboard, the Owner API and the apps say of a freeze: frozen now, or to come, with its days (only on an active membership). */
export function freezeOf(m: Membership, now: Date): { now: boolean; from: Date; until: Date | null } | null {
  if (m.status !== "active" || !m.frozenFrom || !membershipFreezeSet(m, now)) return null;
  return { now: membershipFrozen(m, now), from: m.frozenFrom, until: m.frozenUntil ?? null };
}
