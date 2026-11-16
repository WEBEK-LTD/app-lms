import { currentPlanId } from "./billing/plan-change";
import type { DataStore } from "./data/store";
import type { License } from "./data/types";
import { hasFeature, planFamily, type Plan, type PlanFeature, type PlanInfo } from "./plans";
import { getPlans } from "./settings/platform";
import { getSwitches, licenseFeatures, plansWithSwitches } from "./switches";
import { withAddons } from "./addons/effects";
import type { AppAddon } from "./addons/types";

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

/**
 * The plan an app is on now, as it may use it: 133 with its add-ons
 * running (more of a limit, a feature switched on), the switches still
 * holding (a feature switched off stays off).
 */
export async function appPlan(store: DataStore, license: (Pick<License, "plan" | "nextPlan" | "nextPlanAt"> & Partial<Pick<License, "appId">>) | null, now: Date): Promise<PlanInfo | null> {
  if (!license) return null;
  const plan = planOfLicense(await effectivePlans(store), license, now);
  if (!plan || !license.appId) return plan;
  return planWithAddons(plan, await store.listAppAddons({ appId: license.appId }), await getSwitches(store), now);
}

/** 133 A plan (switches applied) with an app's add-ons; the add-ons' features pass the switches too. */
export function planWithAddons(plan: PlanInfo, addons: readonly AppAddon[], switches: Parameters<typeof licenseFeatures>[1], now: Date): PlanInfo {
  if (!addons.length) return plan;
  const withThem = withAddons(plan, addons, planFamily(plan.id), now);
  return withThem === plan ? plan : { ...withThem, features: licenseFeatures(withThem.features, switches, plan.id) };
}

/** 133 The plan of an app's license with its add-ons, from plans already read (`effectivePlans`). */
export async function appPlanFrom(store: DataStore, plans: Record<Plan, PlanInfo>, license: Pick<License, "plan" | "nextPlan" | "nextPlanAt" | "appId"> | null, now: Date): Promise<PlanInfo | null> {
  const plan = planOfLicense(plans, license, now);
  if (!plan || !license?.appId) return plan;
  return planWithAddons(plan, await store.listAppAddons({ appId: license.appId }), await getSwitches(store), now);
}

export function allows(plan: PlanInfo | null, feature: PlanFeature): boolean {
  return hasFeature(plan, feature);
}

/** Whether `used` is still below the limit (null: unlimited). */
export function withinLimit(limit: number | null, used: number): boolean {
  return limit === null || used < limit;
}

/** 133 The plans with the app's own plan carrying its add-ons: for code that reads the plan from the record (the license API). */
export async function plansForApp(store: DataStore, plans: Record<Plan, PlanInfo>, license: Pick<License, "plan" | "nextPlan" | "nextPlanAt" | "appId"> | null, now: Date): Promise<Record<Plan, PlanInfo>> {
  const plan = await appPlanFrom(store, plans, license, now);
  return plan && license && plan !== plans[currentPlanId(license, now)] ? { ...plans, [currentPlanId(license, now)]: plan } : plans;
}
