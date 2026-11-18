import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import { zoneOffsetMinutes } from "../time/zones";

/**
 * 106.11 When payouts happen, as the owner decided (18 November 2026):
 * "بتتحول الفلوس كل يوم 1 في الشهر", the money goes out on the 1st of every
 * month. The payout of the 1st covers the sales paid up to the end of the
 * month before, cut off at midnight Istanbul time (Europe/Istanbul); a sale
 * paid on the 1st or later waits for the next 1st. A run is named by its
 * month: "2026-12" is the payout of 1 December 2026, for the sales paid
 * before 1 December 00:00 in Istanbul (30 November 21:00 UTC).
 */

export const PAYOUT_ZONE = "Europe/Istanbul";

const pad = (n: number) => String(n).padStart(2, "0");

/** The year and month (1–12) a moment is in, in Istanbul. */
export function istanbulMonth(at: Date): { year: number; month: number } {
  const local = new Date(at.getTime() + zoneOffsetMinutes(PAYOUT_ZONE, at) * 60_000);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1 };
}

/** The moment a month's 1st begins in Istanbul (00:00 there); month 13 is the next year's January. */
export function monthStart(year: number, month: number): Date {
  const midnight = Date.UTC(year, month - 1, 1);
  // Istanbul's offset then (its zone has kept UTC+3 since 2016; read, not assumed), checked at the moment found.
  let at = midnight - zoneOffsetMinutes(PAYOUT_ZONE, new Date(midnight)) * 60_000;
  at = midnight - zoneOffsetMinutes(PAYOUT_ZONE, new Date(at)) * 60_000;
  return new Date(at);
}

const parse = (period: string): { year: number; month: number } => {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new RangeError(`Not a payout month: ${period}`);
  return { year: Number(m[1]), month: Number(m[2]) };
};

/** The run of the month a moment is in, in Istanbul: "2026-12" from 1 December 00:00 there. */
export function payoutPeriod(now: Date): string {
  const { year, month } = istanbulMonth(now);
  return `${year}-${pad(month)}`;
}

/** The run after this one: "2027-01" after "2026-12". */
export function nextPeriod(period: string): string {
  const { year, month } = parse(period);
  return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
}

/** The cut-off of a run: its 1st at 00:00 in Istanbul. Only the sales paid before it go in it. */
export function periodCutoff(period: string): Date {
  const { year, month } = parse(period);
  return monthStart(year, month);
}

/** The first run a sale goes in: the 1st after the month it was paid in (Istanbul). */
export function salePeriod(earnedAt: Date): string {
  return nextPeriod(payoutPeriod(earnedAt));
}

/** "1 December 2026": the run's day, in the language. */
export function payoutDayOf(period: string, lang: Lang): string {
  const { year, month } = parse(period);
  return formatDate(lang, new Date(Date.UTC(year, month - 1, 1)), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "30 November 2026": the last day whose sales go in the run. */
export function lastSalesDayOf(period: string, lang: Lang): string {
  const { year, month } = parse(period);
  return formatDate(lang, new Date(Date.UTC(year, month - 1, 0)), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
