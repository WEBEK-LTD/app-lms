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

/** Whether a membership counts now: not cancelled, started and not ended. */
export function membershipActive(m: Pick<Membership, "status" | "startsAt" | "endsAt">, now: Date): boolean {
  return m.status === "active" && m.startsAt <= now && (m.endsAt === null || m.endsAt > now);
}

/** What the app and the dashboard show: active, expired or cancelled. */
export function membershipStatus(m: Pick<Membership, "status" | "startsAt" | "endsAt">, now: Date): "active" | "expired" | "cancelled" {
  if (m.status === "cancelled") return "cancelled";
  return m.endsAt !== null && m.endsAt <= now ? "expired" : "active";
}

/**
 * The membership a class booking uses: an unlimited one first, else the
 * one with credits left that ends first (packs last). Used inside the
 * stores' booking step.
 */
export function membershipToUse(
  memberships: Membership[],
  now: Date,
): { ok: true; membership: Membership } | { ok: false; reason: "membership_required" | "no_credits" } {
  const active = memberships.filter((m) => membershipActive(m, now));
  if (active.length === 0) return { ok: false, reason: "membership_required" };
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
