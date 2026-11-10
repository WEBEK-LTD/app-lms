import { addDays, minutesOf } from "../bookings/time";
import { VENDOR_DELAY_REASONS, type OpeningPeriod, type Restaurant, type RestaurantPatch, type VendorClosedDates, type VendorDelay, type VendorDelayReason, type VendorEdit, type VendorEditField, type VendorRole } from "../data/types";

/**
 * 115.20 What a marketplace place controls itself, beside busy and paused:
 *
 * - Running late: it keeps taking orders, with 10 to 60 minutes more on every
 *   delivery and pick-up time and a reason customers read (high demand, few
 *   couriers, the weather, or its own short words), for 30 minutes, an hour,
 *   two hours or until it ends it. It ends by itself.
 * - Its weekly hours, its days off (holidays: closed all day on those dates)
 *   and its preparation time, applied at once. Its owner and managers only.
 *   The app's owner sees "Changed by the place" with the values before, and
 *   one click puts them back (one level of undo).
 *
 * Messages are English, as the vendor routes' are.
 */

export const DELAY_MINUTES = [10, 15, 20, 30, 45, 60] as const;
/** How long a delay lasts, in minutes; null (not listed) is until the place ends it. */
export const DELAY_FOR = [30, 60, 120] as const;
export const DELAY_NOTE_MAX = 80;
export const CLOSED_DATES_MAX = 20;
/** The longest single closure, and how far ahead one may start. */
export const CLOSED_SPAN_MAX_DAYS = 92;
export const CLOSED_AHEAD_DAYS = 366;
export const PREP_MIN = 5;
export const PREP_MAX = 180;

/** The roles that manage the place itself: its hours, days off and preparation time. */
export const PLACE_ROLES: readonly VendorRole[] = ["owner", "manager"];

export function mayEditPlace(role: VendorRole | undefined): boolean {
  return PLACE_ROLES.includes(role ?? "manager");
}

// Running late

/** The delay in force at `now`, or null (none, or it ended). */
export function activeDelay(v: Partial<Pick<Restaurant, "delay">>, now: Date): VendorDelay | null {
  const d = v.delay;
  if (!d) return null;
  return d.until && d.until.getTime() <= now.getTime() ? null : d;
}

export function delayMinutes(v: Partial<Pick<Restaurant, "delay">>, now: Date): number {
  return activeDelay(v, now)?.minutes ?? 0;
}

/** Its preparation time with the delay in force: what every delivery and pick-up time starts from. */
export function prepWithDelay(v: Pick<Restaurant, "prepMinutes"> & Partial<Pick<Restaurant, "delay">>, now: Date): number {
  return v.prepMinutes + delayMinutes(v, now);
}

/** Plain text on one line: no markup, no control characters. */
export function plainNote(text: string, max = DELAY_NOTE_MAX): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string; field: string };

/**
 * The delay a place sets: `{ minutes, reason, note, for_minutes }`; null ends
 * it. `for_minutes` 30, 60 or 120, or null (or left out) for until it ends it.
 */
export function parseDelay(input: unknown, now: Date): Checked<VendorDelay | null> {
  if (input === null) return { ok: true, value: null };
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Send the delay, or null to end it.", field: "delay" };
  const b = input as Record<string, unknown>;
  if (!DELAY_MINUTES.includes(b.minutes as (typeof DELAY_MINUTES)[number])) return { ok: false, error: "Choose 10, 15, 20, 30, 45 or 60 minutes.", field: "delay.minutes" };
  if (!VENDOR_DELAY_REASONS.includes(b.reason as VendorDelayReason)) return { ok: false, error: "Choose why: high demand, few couriers, the weather, or your own words.", field: "delay.reason" };
  const reason = b.reason as VendorDelayReason;
  let note: string | null = null;
  if (reason === "other") {
    if (typeof b.note !== "string") return { ok: false, error: "Write the reason customers see.", field: "delay.note" };
    if (b.note.trim().length > DELAY_NOTE_MAX) return { ok: false, error: `Keep the reason under ${DELAY_NOTE_MAX} characters.`, field: "delay.note" };
    note = plainNote(b.note);
    if (!note) return { ok: false, error: "Write the reason customers see.", field: "delay.note" };
  }
  const span = b.for_minutes ?? null;
  if (span !== null && !DELAY_FOR.includes(span as (typeof DELAY_FOR)[number])) return { ok: false, error: "Choose 30 minutes, 1 hour, 2 hours, or until you end it.", field: "delay.for_minutes" };
  return { ok: true, value: { minutes: b.minutes as number, reason, note, until: span === null ? null : new Date(now.getTime() + (span as number) * 60_000), setAt: now } };
}

/** The delay as customers read it (`MarketVendorSummary.delay`): null when there's none at `now`. */
export function delayJson(v: Partial<Pick<Restaurant, "delay">>, now: Date): { minutes: number; reason: VendorDelayReason; note: string | null; until: string | null } | null {
  const d = activeDelay(v, now);
  return d ? { minutes: d.minutes, reason: d.reason, note: d.reason === "other" ? d.note : null, until: d.until ? d.until.toISOString() : null } : null;
}

const REASON_WORDS: Record<"en" | "ar" | "tr", Record<Exclude<VendorDelayReason, "other">, string> & { late: string }> = {
  en: { demand: "high demand", couriers: "few couriers", weather: "the weather", late: "Running about {n} min late: {reason}" },
  ar: { demand: "طلب مرتفع", couriers: "قلة المندوبين", weather: "الطقس", late: "تأخير نحو {n} دقيقة: {reason}" },
  tr: { demand: "yoğun talep", couriers: "az kurye", weather: "hava durumu", late: "Yaklaşık {n} dk gecikme: {reason}" },
};

/** "Running about 20 min late: high demand", for the web panel and the dashboard. */
export function delayText(d: Pick<VendorDelay, "minutes" | "reason" | "note">, lang: "en" | "ar" | "tr"): string {
  const w = REASON_WORDS[lang];
  const reason = d.reason === "other" ? (d.note ?? "") : w[d.reason];
  return w.late.replace("{n}", String(d.minutes)).replace("{reason}", reason);
}

// Days off

const isDate = (text: unknown): text is string => {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const t = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === text;
};

/** The days off from today on (the ones past are dropped), soonest first. */
export function upcomingClosedDates(closed: readonly VendorClosedDates[] | null | undefined, today: string): VendorClosedDates[] {
  return (closed ?? []).filter((c) => c.to >= today).sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/** Whether the place is off all day on this local date. */
export function closedOn(closed: readonly VendorClosedDates[] | null | undefined, date: string): boolean {
  return (closed ?? []).some((c) => date >= c.from && date <= c.to);
}

/** The place's days off: `[{ from, to }]` as local dates, each up to 92 days, starting within a year; the ones past are dropped. */
export function parseClosedDates(input: unknown, today: string): Checked<VendorClosedDates[]> {
  if (!Array.isArray(input)) return { ok: false, error: "Send the days off as a list of dates from and to.", field: "closed_dates" };
  const out: VendorClosedDates[] = [];
  for (const [i, raw] of input.entries()) {
    const field = `closed_dates[${i}]`;
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const from = r.from;
    const to = r.to ?? r.from;
    if (!isDate(from) || !isDate(to)) return { ok: false, error: "Enter the dates like 2026-12-31.", field };
    if (to < from) return { ok: false, error: "The last day off comes after the first.", field };
    const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
    if (span > CLOSED_SPAN_MAX_DAYS) return { ok: false, error: `Close for up to ${CLOSED_SPAN_MAX_DAYS} days at a time.`, field };
    if (from > addDays(today, CLOSED_AHEAD_DAYS)) return { ok: false, error: "Set days off within the next year.", field };
    if (to < today) continue;
    if (!out.some((c) => c.from === from && c.to === to)) out.push({ from, to });
  }
  if (out.length > CLOSED_DATES_MAX) return { ok: false, error: `Set up to ${CLOSED_DATES_MAX} days off at a time.`, field: "closed_dates" };
  return { ok: true, value: upcomingClosedDates(out, today) };
}

// Weekly hours

const DAYS: OpeningPeriod["day"][] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** The weekly hours as the vendor routes send them (`Restaurant.hours`): up to two periods a day; a day left out is closed. */
export function parseHoursList(input: unknown): Checked<OpeningPeriod[]> {
  if (!Array.isArray(input) || input.length > 14) return { ok: false, error: "Send the hours as a list of days with when they open and close.", field: "hours" };
  const out: OpeningPeriod[] = [];
  for (const [i, raw] of input.entries()) {
    const field = `hours[${i}]`;
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    if (!DAYS.includes(r.day as OpeningPeriod["day"])) return { ok: false, error: "Choose a day of the week.", field };
    if (typeof r.opens !== "string" || typeof r.closes !== "string" || minutesOf(r.opens) === null || minutesOf(r.closes) === null || r.opens === r.closes) {
      return { ok: false, error: "Enter when it opens and when it closes, like 10:00 and 23:30.", field };
    }
    const day = r.day as OpeningPeriod["day"];
    if (out.filter((h) => h.day === day).length >= 2) return { ok: false, error: "Up to two periods a day.", field };
    out.push({ day, opens: r.opens, closes: r.closes });
  }
  return { ok: true, value: out.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.opens.localeCompare(b.opens)) };
}

export function parsePrepMinutes(input: unknown): Checked<number> {
  return typeof input === "number" && Number.isInteger(input) && input >= PREP_MIN && input <= PREP_MAX
    ? { ok: true, value: input }
    : { ok: false, error: `Enter the minutes from ${PREP_MIN} to ${PREP_MAX}.`, field: "prep_minutes" };
}

// What the place changed, and the owner's Undo

export interface PlaceChange {
  hours?: OpeningPeriod[];
  closedDates?: VendorClosedDates[];
  prepMinutes?: number;
}

type PlaceValues = VendorEdit["previous"];

const valuesOf = (v: Pick<Restaurant, "hours" | "prepMinutes"> & Partial<Pick<Restaurant, "closedDates">>): PlaceValues => ({ hours: v.hours, closedDates: v.closedDates ?? [], prepMinutes: v.prepMinutes });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const differing = (a: PlaceValues, b: PlaceValues): VendorEditField[] => [
  ...(same(a.hours, b.hours) ? [] : (["hours"] as const)),
  ...(same(a.closedDates, b.closedDates) ? [] : (["closed_dates"] as const)),
  ...(a.prepMinutes === b.prepMinutes ? [] : (["prep_minutes"] as const)),
];

/**
 * What to save when the place changes its hours, days off or preparation
 * time: the new values, and what they were before (kept from the place's
 * first change since the owner last saved, undid or kept them). Null when
 * nothing changed. Back as the owner had them: no "changed" notice.
 */
export function placeChangePatch(v: Restaurant, change: PlaceChange, by: string | null, now: Date): RestaurantPatch | null {
  const current = valuesOf(v);
  const next: PlaceValues = { hours: change.hours ?? current.hours, closedDates: change.closedDates ?? current.closedDates, prepMinutes: change.prepMinutes ?? current.prepMinutes };
  if (!differing(current, next).length) return null;
  const previous = v.vendorEdit?.previous ?? current;
  const fields = differing(previous, next);
  return {
    ...(change.hours ? { hours: next.hours } : {}),
    ...(change.closedDates ? { closedDates: next.closedDates.length ? next.closedDates : null } : {}),
    ...(change.prepMinutes !== undefined ? { prepMinutes: next.prepMinutes } : {}),
    vendorEdit: fields.length ? { at: now, by, fields, previous } : null,
  };
}

/** The owner's Undo: the values the place changed, back as they were. Null without a change to undo. */
export function undoPlaceChangePatch(v: Pick<Restaurant, "vendorEdit">): RestaurantPatch | null {
  const e = v.vendorEdit;
  if (!e) return null;
  return {
    ...(e.fields.includes("hours") ? { hours: e.previous.hours } : {}),
    ...(e.fields.includes("closed_dates") ? { closedDates: e.previous.closedDates.length ? e.previous.closedDates : null } : {}),
    ...(e.fields.includes("prep_minutes") ? { prepMinutes: e.previous.prepMinutes } : {}),
    vendorEdit: null,
  };
}

/**
 * After the owner saves some of these values themselves: what they changed
 * isn't the place's change any more (saving the same value again keeps the
 * notice); with nothing left, the notice goes.
 */
export function afterOwnerEdit(v: Restaurant, change: PlaceChange): Pick<RestaurantPatch, "vendorEdit"> {
  const e = v.vendorEdit;
  if (!e) return {};
  const current = valuesOf(v);
  const next: PlaceValues = { hours: change.hours ?? current.hours, closedDates: change.closedDates ?? current.closedDates, prepMinutes: change.prepMinutes ?? current.prepMinutes };
  const touched = new Set(differing(current, next));
  if (!touched.size) return {};
  const fields = e.fields.filter((f) => !touched.has(f));
  // What the owner set is the value to go back to from now on.
  const previous: PlaceValues = {
    hours: touched.has("hours") ? next.hours : e.previous.hours,
    closedDates: touched.has("closed_dates") ? next.closedDates : e.previous.closedDates,
    prepMinutes: touched.has("prep_minutes") ? next.prepMinutes : e.previous.prepMinutes,
  };
  return { vendorEdit: fields.length ? { ...e, fields, previous } : null };
}
