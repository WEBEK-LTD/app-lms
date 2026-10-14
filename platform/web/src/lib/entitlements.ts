import { currentPlanId } from "./billing/plan-change";
import type { DataStore } from "./data/store";
import type { License } from "./data/types";
import { hasFeature, type Plan, type PlanFeature, type PlanInfo } from "./plans";
import { getPlans } from "./settings/platform";
import { getSwitches, plansWithSwitches } from "./switches";

/**
 * What an app may use (roadmap 13.1): its license's plan as the team set it
 * in the admin, without the features switched off for that plan (11.5). A
 * feature the plan doesn't have disappears from the app quietly; the
 * dashboard shows it with an "Upgrade" hint.
 */

/** The plans as apps get them: the team's edits, minus switched-off features. */
export async function effectivePlans(store: DataStore): Promise<Record<Plan, PlanInfo>> {
  return plansWithSwitches(await getPlans(store), await getSwitches(store));
}

/** The plan an app is on now (a scheduled downgrade counts from its date); null without a license. */
export function planOfLicense(plans: Record<Plan, PlanInfo>, license: Pick<License, "plan" | "nextPlan" | "nextPlanAt"> | null, now: Date): PlanInfo | null {
  return license ? (plans[currentPlanId(license, now)] ?? null) : null;
}

export async function appPlan(store: DataStore, license: Pick<License, "plan" | "nextPlan" | "nextPlanAt"> | null, now: Date): Promise<PlanInfo | null> {
  return license ? planOfLicense(await effectivePlans(store), license, now) : null;
}

export function allows(plan: PlanInfo | null, feature: PlanFeature): boolean {
  return hasFeature(plan, feature);
}

/** Whether `used` is still below the limit (null: unlimited). */
export function withinLimit(limit: number | null, used: number): boolean {
  return limit === null || used < limit;
}
