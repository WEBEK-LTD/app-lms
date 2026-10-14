import type { DataStore } from "../data/store";
import type { License } from "../data/types";
import { comparePlans, isPlan, type Plan, type PlanInfo } from "../plans";

/**
 * Moving an app to another plan (roadmap 13.3).
 *
 * - **Upgrade** (a higher plan, while the current one is active): starts at
 *   once. The client pays the new plan's full price for a full period, and
 *   the days left on the old plan are credited at their value: what those
 *   days cost on the old plan buys days on the new one (list prices, both
 *   with a card price in the same currency; otherwise the days carry over
 *   one for one). Example: 100 days left of ₺1,200/year (₺329) on a
 *   ₺3,600/year plan add 33 days.
 * - **Downgrade** (a lower plan): never takes days away. It starts when the
 *   paid period ends (`nextPlan` from `nextPlanAt`). Choosing it without
 *   paying schedules it; paying for it now adds its period after the current
 *   end, from which the lower plan applies.
 * - **Same plan**, or any plan after the license ended: the period is added
 *   after the current end (or from today), as before. Paying for the current
 *   plan cancels a scheduled downgrade.
 */

const DAY = 86_400_000;

/** The new end date: `months` after the later of now and the current end. */
export function extendedUntil(currentEnd: Date | null, months: 1 | 12, now: Date): Date {
  const base = new Date(Math.max(now.getTime(), currentEnd?.getTime() ?? 0));
  const end = new Date(base);
  end.setUTCMonth(end.getUTCMonth() + months);
  // A month after 31 January is the last day of February, not 3 March.
  if (end.getUTCDate() !== base.getUTCDate()) end.setUTCDate(0);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/** The plan a license is on now: a scheduled downgrade counts from its date, even before the daily job writes it. */
export function currentPlanId(license: Pick<License, "plan" | "nextPlan" | "nextPlanAt">, now: Date): Plan {
  if (license.nextPlan && isPlan(license.nextPlan) && license.nextPlanAt && license.nextPlanAt.getTime() <= now.getTime()) return license.nextPlan;
  return license.plan;
}

/** A downgrade waiting for the end of the period, or null. */
export function scheduledPlan(license: Pick<License, "plan" | "nextPlan" | "nextPlanAt"> | null, now: Date): { plan: Plan; at: Date } | null {
  if (!license?.nextPlan || !license.nextPlanAt || !isPlan(license.nextPlan)) return null;
  if (license.nextPlanAt.getTime() <= now.getTime()) return null;
  return { plan: license.nextPlan, at: license.nextPlanAt };
}

function active(license: Pick<License, "expiresAt"> | null, now: Date): license is License {
  return license !== null && license.expiresAt.getTime() > now.getTime();
}

/** Days of `to` that the time left on `from` is worth (see the rule above). */
export function creditDays(from: PlanInfo, to: PlanInfo, remainingMs: number, now: Date): number {
  if (remainingMs <= 0) return 0;
  const remainingDays = remainingMs / DAY;
  const priced = from.priceCents !== null && to.priceCents !== null && from.priceCents > 0 && to.priceCents > 0 && from.currency === to.currency;
  if (!priced) return Math.floor(remainingDays);
  const perDay = (plan: PlanInfo) => plan.priceCents! / ((extendedUntil(null, plan.billingMonths, now).getTime() - now.getTime()) / DAY);
  return Math.floor((remainingDays * perDay(from)) / perDay(to));
}

export type PlanChangeKind = "activate" | "renew" | "upgrade" | "downgrade";

export interface PlanChange {
  kind: PlanChangeKind;
  /** The license's plan after the payment. */
  plan: Plan;
  activeUntil: Date;
  /** A downgrade that starts later (null clears any scheduled one). */
  nextPlan: Plan | null;
  nextPlanAt: Date | null;
  /** Upgrade: days of the new plan credited for the old plan's unused days. */
  creditDays: number;
}

/**
 * What a paid period of `paid` does to the app's license (none yet: its
 * first activation). `months` is the payment's period.
 */
export function planChangeFor(
  license: Pick<License, "plan" | "expiresAt" | "nextPlan" | "nextPlanAt"> | null,
  paid: PlanInfo,
  months: 1 | 12,
  plans: Record<Plan, PlanInfo>,
  now: Date,
): PlanChange {
  if (!license || !active(license as License, now)) {
    return { kind: license ? "renew" : "activate", plan: paid.id, activeUntil: extendedUntil(license?.expiresAt ?? null, months, now), nextPlan: null, nextPlanAt: null, creditDays: 0 };
  }
  const current = currentPlanId(license, now);
  const direction = comparePlans(current, paid.id);
  if (direction === 0) {
    return { kind: "renew", plan: current, activeUntil: extendedUntil(license.expiresAt, months, now), nextPlan: null, nextPlanAt: null, creditDays: 0 };
  }
  if (direction > 0) {
    const credit = creditDays(plans[current], paid, license.expiresAt.getTime() - now.getTime(), now);
    const end = extendedUntil(null, months, now);
    return { kind: "upgrade", plan: paid.id, activeUntil: new Date(end.getTime() + credit * DAY), nextPlan: null, nextPlanAt: null, creditDays: credit };
  }
  return {
    kind: "downgrade",
    plan: current,
    activeUntil: extendedUntil(license.expiresAt, months, now),
    nextPlan: paid.id,
    nextPlanAt: license.expiresAt,
    creditDays: 0,
  };
}

export type ScheduleResult = { ok: true; at: Date } | { ok: false; error: string };

/** A downgrade without paying now: the app moves to `to` when the paid period ends. */
export async function scheduleDowngrade(store: DataStore, license: License, to: Plan, now: Date): Promise<ScheduleResult> {
  if (!active(license, now)) return { ok: false, error: "This plan has ended. Choose a plan and pay for it to start again." };
  if (comparePlans(currentPlanId(license, now), to) >= 0) return { ok: false, error: "Choose a lower plan, or upgrade by card." };
  await store.updateLicense(license.id, { nextPlan: to, nextPlanAt: license.expiresAt }, now);
  return { ok: true, at: license.expiresAt };
}

export async function cancelScheduledPlan(store: DataStore, license: License, now: Date): Promise<void> {
  await store.updateLicense(license.id, { nextPlan: null, nextPlanAt: null }, now);
}

/** The daily job: downgrades whose date came are written into the license's plan. */
export async function applyDuePlanChanges(store: DataStore, now: Date): Promise<number> {
  let applied = 0;
  for (const license of await store.listLicenses()) {
    if (!license.nextPlan || !license.nextPlanAt || license.nextPlanAt.getTime() > now.getTime()) continue;
    await store.updateLicense(license.id, isPlan(license.nextPlan) ? { plan: license.nextPlan, nextPlan: null, nextPlanAt: null } : { nextPlan: null, nextPlanAt: null }, now);
    applied++;
  }
  return applied;
}
