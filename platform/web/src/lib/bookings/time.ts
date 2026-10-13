/** Local dates and times in a business's time zone, without a date library. */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isTimeZone(value: string): boolean {
  try {
    formatter(value);
    return true;
  } catch {
    return false;
  }
}

function parts(utc: Date, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(utc)) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Minutes the zone is ahead of UTC at this instant. */
function offsetMinutes(utc: Date, timeZone: string): number {
  const p = parts(utc, timeZone);
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utc.getTime() / 1000) * 1000) / 60_000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The instant of a local date and time ("2026-10-19", "09:30") in the zone. */
export function localToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, min] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = offsetMinutes(new Date(guess), timeZone);
  const utc = guess - first * 60_000;
  const second = offsetMinutes(new Date(utc), timeZone);
  return new Date(second === first ? utc : guess - second * 60_000);
}

/** The local date, time and weekday (0 is Sunday) of an instant in the zone. */
export function utcToLocal(utc: Date, timeZone: string): { date: string; time: string; weekday: number } {
  const p = parts(utc, timeZone);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
    weekday: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(),
  };
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
}

/** "09:30" to minutes after midnight; null when it isn't a time. */
export function minutesOf(time: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function timeOf(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
