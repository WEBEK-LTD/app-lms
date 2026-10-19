/**
 * 44 Days as YYYY-MM-DD, the unit of every analytics total. 47 A day is the
 * owner's day: each event is filed under the date in the app's time zone
 * when it arrives (lib/analytics/zone.ts); "UTC" by default.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** The date of `date` in `zone` (an IANA time zone). */
export function dayOf(date: Date, zone = "UTC"): string {
  if (zone === "UTC") return date.toISOString().slice(0, 10);
  let formatter = formatters.get(zone);
  if (!formatter) {
    // en-CA writes dates as YYYY-MM-DD.
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatters.set(zone, formatter);
  }
  return formatter.format(date);
}

export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && dayOf(date) === value;
}

/** Calendar arithmetic on the labels (no zone involved). */
export function addDays(day: string, days: number): string {
  return dayOf(new Date(Date.parse(`${day}T00:00:00Z`) + days * MS_PER_DAY));
}

/** Days from `from` to `to`, both included (0 when `to` is before `from`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY) + 1;
}

/** Every day from `from` to `to`, both included. */
export function dayRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}
