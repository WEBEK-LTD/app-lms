import { addDays, dayOf, daysBetween, isDay } from "../analytics/days";
import type { DataStore } from "../data/store";
import type { App, Membership } from "../data/types";
import { membershipActive, membershipFreezeSet, membershipFrozen } from "./memberships";
import { bookingSetup } from "./setup";
import { localToUtc } from "./time";

/**
 * 64 Frozen memberships of a gym (Dashboard › Members, the Owner API and
 * Yallapp Business): from a day (today or later) until the day it's back,
 * or until the gym unfreezes it. While frozen the door says "Frozen" and
 * classes can't be booked. The end date moves later by the days frozen,
 * the common gym rule: with an end day at once by the whole freeze; without
 * one when it is unfrozen, by the days from its first day to today (today
 * isn't frozen any more). Unfreezing a freeze with an end early gives back
 * the days it no longer takes; one that hadn't started is just removed.
 * Days are the gym's days in its time zone. Each change is one conditional
 * update in the store, so two at once change the end once.
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

export type FreezeResult = { ok: true; membership: Membership } | { ok: false; status: 400 | 409; errors: Record<string, string> };

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
export async function freezeMembership(store: DataStore, app: App, m: Membership, input: { from: unknown; until: unknown }, now: Date): Promise<FreezeResult> {
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
  const done = await store.freezeMembership(app.id, m.id, { from: start, until: end, shiftDays, now });
  if (!done) return { ok: false, status: 409, errors: { from: "This membership is already frozen." } };
  return { ok: true, membership: (await store.getMembership(app.id, m.id)) ?? m };
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
  if (!m.frozenFrom || !membershipFreezeSet(m, now)) return { ok: false, status: 409, errors: { from: "This membership isn't frozen." } };
  const done = await store.unfreezeMembership(app.id, m.id, { from: m.frozenFrom, shiftDays: unfreezeShift(app, m, now), now });
  if (!done) return { ok: false, status: 409, errors: { from: "This membership isn't frozen." } };
  return { ok: true, membership: (await store.getMembership(app.id, m.id)) ?? m };
}

/** What the dashboard, the Owner API and the apps say of a freeze: frozen now, or to come, with its days. */
export function freezeOf(m: Membership, now: Date): { now: boolean; from: Date; until: Date | null } | null {
  if (!m.frozenFrom || !membershipFreezeSet(m, now)) return null;
  return { now: membershipFrozen(m, now), from: m.frozenFrom, until: m.frozenUntil ?? null };
}
