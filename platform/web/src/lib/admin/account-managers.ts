import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { addDays, localToUtc, minutesOf, timeOf, utcToLocal } from "../bookings/time";
import { isTimeZone } from "../analytics/zone";
import type { AccountManagerCall, StaffHours, StaffProfile } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";
import { whatsappUrl } from "../contact-lines";

/**
 * 125 VIP: Yallapp's account managers. A team member's contact card (Admin ›
 * Team: photo, WhatsApp, phone, working hours, and "Account manager"), the
 * client's manager chosen in Admin › Clients, and the calls clients ask for
 * in Yallapp Business at free times of the manager's hours (30-minute steps,
 * the next 5 working days), which the team confirms or moves in Admin.
 */

export const DEFAULT_STAFF_TIMEZONE = "Europe/Istanbul";
/** A call's length, and the step between free times. */
export const CALL_MINUTES = 30;
/** Free times start at least this long from now. */
export const CALL_LEAD_MINUTES = 60;
/** The working days offered. */
export const CALL_DAYS = 5;
/** Asked-for calls a business may have waiting at once. */
export const CALLS_WAITING_MAX = 3;
export const CALL_NOTE_MAX = 500;

export const STAFF_PHOTO_PREFIX = "staff-photos/";
/** A photo's file name: what /api/staff/photo/<name> serves. */
export const STAFF_PHOTO_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export type ProfileForm = Pick<StaffProfile, "whatsapp" | "phone" | "hours" | "accountManager">;

/** Admin › Team's contact card: numbers in E.164, the days (1 Monday … 7 Sunday) and hours, and whether they manage accounts. */
export function readProfileForm(form: Record<string, string | string[]>): { ok: true; value: ProfileForm } | { ok: false; errors: Record<string, string> } {
  const text = (name: string) => {
    const v = form[name];
    return (Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).trim();
  };
  const errors: Record<string, string> = {};
  const phoneOf = (name: string): string | null => {
    const raw = text(name);
    if (!raw) return null;
    const phone = parseAnyPhone(raw.startsWith("+") || raw.startsWith("00") ? raw : `+${raw}`, "90");
    if (!phone) errors[name] = "Enter the number with its country code, like +90 532 123 45 67.";
    return phone?.e164 ?? null;
  };
  const whatsapp = phoneOf("whatsapp");
  const phone = phoneOf("phone");
  const rawDays = form.days;
  const days = [...new Set((Array.isArray(rawDays) ? rawDays : rawDays ? [rawDays] : []).map(Number))].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort((a, b) => a - b);
  const from = text("from");
  const to = text("to");
  const timezone = text("timezone") || DEFAULT_STAFF_TIMEZONE;
  const accountManager = text("accountManager") === "on";
  let hours: StaffHours | null = null;
  if (days.length || from || to) {
    if (!TIME.test(from) || !TIME.test(to) || minutesOf(from)! + CALL_MINUTES > minutesOf(to)!) errors.hours = "Enter when they start and finish, like 10:00 and 18:00.";
    if (!days.length) errors.days = "Choose the days they work.";
    if (!isTimeZone(timezone)) errors.timezone = "Choose a time zone.";
    hours = { days, from, to, timezone };
  }
  if (accountManager && !hours) errors.hours = "An account manager needs their working hours, for clients' calls.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { whatsapp, phone, hours, accountManager } };
}

/** The weekday's short name (ISO weekday, 1 Monday) in a language. */
function dayName(lang: Lang, isoDay: number): string {
  // 2026-11-16 is a Monday.
  return formatDate(lang, new Date(Date.UTC(2026, 10, 15 + isoDay, 12)), { weekday: "short", timeZone: "UTC" });
}

/** "Sun–Thu, 10:00–18:00": the days in runs (a run may cross from Sunday to Monday), then the hours. */
export function hoursLabel(hours: StaffHours | null, lang: Lang): string | null {
  if (!hours || !hours.days.length) return null;
  const set = new Set(hours.days);
  // Start at a working day whose day before isn't one, so a week like Sun–Thu stays one run.
  const start = [1, 2, 3, 4, 5, 6, 7].find((d) => set.has(d) && !set.has(d === 1 ? 7 : d - 1)) ?? 1;
  const order = Array.from({ length: 7 }, (_, i) => ((start - 1 + i) % 7) + 1).filter((d) => set.has(d));
  const runs: number[][] = [];
  for (const d of order) {
    const last = runs.at(-1);
    if (last && (last.at(-1)! % 7) + 1 === d) last.push(d);
    else runs.push([d]);
  }
  const days = runs.map((r) => (r.length > 2 ? `${dayName(lang, r[0]!)}–${dayName(lang, r.at(-1)!)}` : r.map((d) => dayName(lang, d)).join(lang === "ar" ? "، " : ", "))).join(lang === "ar" ? "، " : ", ");
  return `${days}${lang === "ar" ? "، " : ", "}${hours.from}–${hours.to}`;
}

export function managerWhatsappUrl(profile: Pick<StaffProfile, "whatsapp">): string | null {
  return profile.whatsapp ? whatsappUrl(profile.whatsapp) : null;
}

/** ISO weekday (1 Monday … 7 Sunday) of a YYYY-MM-DD date. */
function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export interface FreeDay {
  date: string;
  label: string;
  times: string[];
}

/**
 * The manager's free times: the next working days (up to `CALL_DAYS` with a
 * free time), in 30-minute steps of their hours, without those taken by a
 * call that isn't cancelled, or starting within the next hour.
 */
export function freeTimes(hours: StaffHours, taken: readonly Pick<AccountManagerCall, "date" | "time" | "status">[], now: Date, lang: Lang): FreeDay[] {
  const from = minutesOf(hours.from);
  const to = minutesOf(hours.to);
  if (from === null || to === null) return [];
  const busy = new Set(taken.filter((c) => c.status !== "cancelled").map((c) => `${c.date} ${c.time}`));
  const earliest = now.getTime() + CALL_LEAD_MINUTES * 60_000;
  const today = utcToLocal(now, hours.timezone).date;
  const out: FreeDay[] = [];
  for (let i = 0; i < 21 && out.length < CALL_DAYS; i += 1) {
    const date = addDays(today, i);
    if (!hours.days.includes(isoWeekday(date))) continue;
    const times: string[] = [];
    for (let m = from; m + CALL_MINUTES <= to; m += CALL_MINUTES) {
      const time = timeOf(m);
      if (busy.has(`${date} ${time}`)) continue;
      if (localToUtc(date, time, hours.timezone).getTime() < earliest) continue;
      times.push(time);
    }
    if (!times.length) continue;
    out.push({ date, label: formatDate(lang, new Date(`${date}T12:00:00Z`), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }), times });
  }
  return out;
}

/** The time zones the team picks from. */
export const STAFF_TIMEZONES = ["Europe/Istanbul", "Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "UTC"];
