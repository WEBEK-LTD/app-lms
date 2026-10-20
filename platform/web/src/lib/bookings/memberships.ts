import type { Membership, MembershipPeriod, MembershipPlan } from "../data/types";
import { parsePrice } from "../catalog/money";

/**
 * 27 Memberships of a gym or studio: plans (unlimited or a number of
 * classes, for a month, three months, a year, or a pack without an end)
 * and the memberships customers hold.
 */

export const MEMBERSHIP_PERIODS: readonly MembershipPeriod[] = ["month", "quarter", "year", "pack"];

export const PERIOD_LABELS: Record<MembershipPeriod, string> = {
  month: "Monthly",
  quarter: "Every 3 months",
  year: "Yearly",
  pack: "Class pack (no end date)",
};

/** Months each period lasts; a pack has no end. */
const PERIOD_MONTHS: Record<MembershipPeriod, number | null> = { month: 1, quarter: 3, year: 12, pack: null };

/** When a membership bought at `start` ends (same day of the month, or the month's last day), or null for a pack. */
export function membershipEnd(period: MembershipPeriod, start: Date): Date | null {
  const months = PERIOD_MONTHS[period];
  if (months === null) return null;
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}

type MembershipTimes = Pick<Membership, "status" | "startsAt" | "endsAt" | "frozenFrom" | "frozenUntil">;

/** 64 Frozen now: a freeze that started and isn't over (lib/bookings/freeze.ts). */
export function membershipFrozen(m: Pick<Membership, "frozenFrom" | "frozenUntil">, now: Date): boolean {
  return !!m.frozenFrom && m.frozenFrom.getTime() <= now.getTime() && (!m.frozenUntil || now.getTime() < m.frozenUntil.getTime());
}

/** 64 A freeze now or to come (one that ended is only kept). */
export function membershipFreezeSet(m: Pick<Membership, "frozenFrom" | "frozenUntil">, now: Date): boolean {
  return !!m.frozenFrom && (!m.frozenUntil || now.getTime() < m.frozenUntil.getTime());
}

/** Past its end. 64 A freeze without an end that started holds the end (it moves when unfrozen). */
function ended(m: MembershipTimes, now: Date): boolean {
  if (m.endsAt === null || m.endsAt > now) return false;
  return !(m.frozenFrom && !m.frozenUntil && m.frozenFrom <= now);
}

/** Whether a membership counts now: not cancelled, started and not ended (64 frozen ones count, but book no classes). */
export function membershipActive(m: MembershipTimes, now: Date): boolean {
  return m.status === "active" && m.startsAt <= now && !ended(m, now);
}

/** What the app and the dashboard show: active, expired or cancelled (64 a frozen one is active; membershipFrozen says so). */
export function membershipStatus(m: MembershipTimes, now: Date): "active" | "expired" | "cancelled" {
  if (m.status === "cancelled") return "cancelled";
  return ended(m, now) ? "expired" : "active";
}

/**
 * The membership a class booking uses: an unlimited one first, else the
 * one with credits left that ends first (packs last). Used inside the
 * stores' booking step. 64 Active now, and not frozen when the class
 * starts (`classAt`): a freeze from tomorrow doesn't stop today's class,
 * and one that ends on Friday doesn't stop Saturday's.
 */
export function membershipToUse(
  memberships: Membership[],
  now: Date,
  classAt: Date = now,
): { ok: true; membership: Membership } | { ok: false; reason: "membership_required" | "membership_frozen" | "no_credits" } {
  const counting = memberships.filter((m) => membershipActive(m, now));
  if (counting.length === 0) return { ok: false, reason: "membership_required" };
  // 64 A frozen membership books no classes.
  const active = counting.filter((m) => !membershipFrozen(m, classAt));
  if (active.length === 0) return { ok: false, reason: "membership_frozen" };
  const usable = active
    .filter((m) => m.creditsLeft === null || m.creditsLeft > 0)
    .sort(
      (a, b) =>
        Number(a.creditsLeft !== null) - Number(b.creditsLeft !== null) ||
        (a.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
        a.id - b.id,
    );
  return usable[0] ? { ok: true, membership: usable[0] } : { ok: false, reason: "no_credits" };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The Membership plans page's form. Credits empty: unlimited (not for a pack). */
export function parseMembershipPlan(v: Record<string, string>): Parsed<Omit<MembershipPlan, "id">> {
  const errors: Record<string, string> = {};
  const name = (v.name ?? "").trim();
  if (name.length < 2 || name.length > 80) errors.name = "Enter a name of up to 80 characters.";
  const price = parsePrice((v.price ?? "").trim());
  if (price === null || price <= 0) errors.price = "Enter a price, like 1500.";
  const period = v.period as MembershipPeriod;
  if (!MEMBERSHIP_PERIODS.includes(period)) errors.period = "Choose how long it lasts.";
  const creditsText = (v.credits ?? "").trim();
  const credits = creditsText === "" ? null : /^\d{1,4}$/.test(creditsText) ? Number(creditsText) : Number.NaN;
  if (credits !== null && (!Number.isInteger(credits) || credits < 1 || credits > 1000)) errors.credits = "Enter 1 to 1000 classes, or leave it empty for unlimited.";
  else if (credits === null && period === "pack") errors.credits = "A class pack needs a number of classes.";
  const description = (v.description ?? "").trim();
  if (description.length > 500) errors.description = "Use at most 500 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, description, priceCents: price!, period, credits, active: v.active === "on" } };
}

/** "Unlimited classes" or "10 classes". */
export function creditsText(credits: number | null): string {
  return credits === null ? "Unlimited classes" : credits === 1 ? "1 class" : `${credits} classes`;
}
