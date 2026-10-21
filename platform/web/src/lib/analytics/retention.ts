import { currentPlanId } from "../billing/plan-change";
import type { DataStore } from "../data/store";
import type { License } from "../data/types";
import { PLAN_INFO, type Plan, type PlanInfo } from "../plans";
import { dayOf } from "./days";

/**
 * 72 How long analytics are kept, by plan. Single events (each app open,
 * screen or search) are kept 90 days on every plan (`RAW_RETENTION_DAYS`);
 * the daily totals made from them as long as the app's plan says
 * (`PlanLimits.analyticsMonths`, edited in Admin › Plans; by default 3 months
 * on Starter, 1 year on Growth, 2 years on Pro, 3 years on Business). The
 * daily job deletes what is older, in batches, and the Analytics page starts
 * no earlier than what is kept.
 */

/** Rows deleted in one statement. */
export const PURGE_BATCH = 5000;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The first day whose daily totals are kept, `months` calendar months before
 * `today` (the same day of the month, or the month's last day); null when
 * they are kept until the app is deleted.
 */
export function analyticsKeptFrom(today: string, months: number | null): string | null {
  if (months === null) return null;
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const index = year * 12 + (month - 1) - months;
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${pad(m)}-${pad(Math.min(day, last))}`;
}

/** What the Analytics page can show for an app on `plan`: the first day kept (in the app's zone) and the months; null: everything. */
export function analyticsKeep(plan: Pick<PlanInfo, "limits"> | null | undefined, now: Date, zone = "UTC", plans?: Record<Plan, Pick<PlanInfo, "limits">>): { from: string | null; months: number | null } {
  const months = keptMonths(plan, plans);
  return { from: analyticsKeptFrom(dayOf(now, zone), months), months };
}

/** The months a plan keeps (an app without a plan keeps what the first plan keeps). */
export function keptMonths(plan: Pick<PlanInfo, "limits"> | null | undefined, plans: Record<Plan, Pick<PlanInfo, "limits">> = PLAN_INFO): number | null {
  return (plan ?? plans.starter).limits.analyticsMonths;
}

type RetentionStore = Pick<DataStore, "purgeAnalyticsEvents" | "purgeAnalyticsDaily" | "listApps" | "listLicenses">;

/** Raw events of days before `beforeDay`, a batch at a time until none are left or `deadline` (epoch ms) passes. */
export async function purgeRawEvents(store: Pick<DataStore, "purgeAnalyticsEvents">, beforeDay: string, deadline: number, batch = PURGE_BATCH): Promise<{ deleted: number; finished: boolean }> {
  let deleted = 0;
  for (;;) {
    const n = await store.purgeAnalyticsEvents(beforeDay, batch);
    deleted += n;
    if (n < batch) return { deleted, finished: true };
    if (Date.now() > deadline) return { deleted, finished: false };
  }
}

/**
 * The daily job: each app's daily totals older than its plan keeps, a batch
 * at a time, until `budgetMs` is spent (what is left goes the next day).
 * The plan is the app's license's (a downgrade waiting for its date doesn't
 * count yet); an app without one keeps what Starter keeps.
 */
export async function purgeAnalyticsHistory(
  store: RetentionStore,
  plans: Record<Plan, PlanInfo>,
  now: Date,
  options: { budgetMs?: number; batch?: number } = {},
): Promise<{ apps: number; deleted: number; finished: boolean }> {
  const deadline = Date.now() + (options.budgetMs ?? 10_000);
  const batch = options.batch ?? PURGE_BATCH;
  const today = dayOf(now);
  const [apps, licenses] = await Promise.all([store.listApps(), store.listLicenses()]);
  const planOf = new Map<string, License["plan"]>();
  for (const license of licenses) if (license.appId) planOf.set(license.appId, currentPlanId(license, now));
  let deleted = 0;
  let touched = 0;
  for (const app of apps) {
    const plan = planOf.get(app.id);
    const from = analyticsKeptFrom(today, keptMonths(plan ? plans[plan] : null, plans));
    if (!from) continue;
    let appDeleted = 0;
    for (;;) {
      if (Date.now() > deadline) return { apps: touched + (appDeleted ? 1 : 0), deleted, finished: false };
      const n = await store.purgeAnalyticsDaily(app.id, from, batch);
      deleted += n;
      appDeleted += n;
      if (n < batch) break;
    }
    if (appDeleted) touched += 1;
  }
  return { apps: touched, deleted, finished: true };
}
