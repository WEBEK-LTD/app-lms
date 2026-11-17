import { isLifetimeEnd } from "../billing/periods";
import { hasFeature, isIncludedFeature, pagesLimitOf, planFamily, planOffered, planRank, plansInOrder, plansOfFamily, type Plan, type PlanFamily, type PlanInfo } from "../plans";
import { addonBillings, topPlansOf } from "./catalog";
import type { AddonDef, AddonsSetting, AppAddon } from "./types";

/**
 * 133 Who may buy an add-on, and when one an app has is running. The rules
 * are checked on the server each time: the page only shows what passes.
 */

/**
 * The family's top plan: the team's choice (Admin › Add-ons), else the
 * highest offered plan. (Before 138 it was the first plan with "We publish
 * for you"; every plan has it now.)
 */
export function topPlanOf(plans: Record<Plan, PlanInfo>, family: PlanFamily, setting: AddonsSetting | null | undefined): Plan | null {
  const chosen = topPlansOf(setting)?.[family];
  if (chosen && planFamily(chosen) === family) return chosen;
  const ordered = plansInOrder(plansOfFamily(family), plans).filter((id) => planOffered(plans[id]));
  return ordered.at(-1) ?? null;
}

/**
 * 138 An add-on that switches on what every plan includes now (the
 * publishing service, "We publish for you"): never offered, renewed or
 * reminded of again. What apps bought keeps its records.
 */
export function addonRetired(addon: Pick<AddonDef, "kind" | "feature"> | Pick<AppAddon, "kind" | "feature">): boolean {
  return addon.kind !== "quantity" && Boolean(addon.feature) && isIncludedFeature(addon.feature!);
}

/** Whether a plan is below its family's top plan. */
export function belowTop(plans: Record<Plan, PlanInfo>, plan: Plan, setting: AddonsSetting | null | undefined): boolean {
  const top = topPlanOf(plans, planFamily(plan), setting);
  return top !== null && planRank(plan, plans) < planRank(top, plans);
}

/** Whether an add-on an app has is running now: not cancelled, and before its end (none for a one-time one). */
export function addonRunning(addon: Pick<AppAddon, "status" | "activeUntil">, now: Date): boolean {
  return addon.status === "active" && (addon.activeUntil === null || addon.activeUntil.getTime() > now.getTime());
}

/** Whether an add-on that ends can still be renewed: every one with a period, until it is cancelled (an ended one starts again from today); 138 never a retired one. */
export function addonRenewable(addon: Pick<AppAddon, "status" | "activeUntil" | "billing" | "kind" | "feature">): boolean {
  if (addonRetired(addon)) return false;
  return addon.status === "active" && addon.activeUntil !== null && !isLifetimeEnd(addon.activeUntil) && addon.billing !== "once" && addon.billing !== "lifetime";
}

export type AddonRefusal =
  /** Switched off by the team, or no way to pay it is priced. */
  | "not_offered"
  /** For the other family's apps. */
  | "family"
  /** Only below the top plan. */
  | "top_plan"
  /** Only on other plans. */
  | "plan"
  /** The app needs a plan first. */
  | "no_plan"
  /** Bought already, and it can't be bought twice. */
  | "owned"
  /** The plan already has it (the feature, or no limit to add to). */
  | "included";

/**
 * Why the app can't buy the add-on now, or null when it can. `plan` is the
 * app's plan now (null without one), `owned` the add-ons it has.
 */
export function addonRefusal(
  addon: AddonDef,
  input: { plans: Record<Plan, PlanInfo>; plan: PlanInfo | null; family: PlanFamily; owned: AppAddon[]; setting: AddonsSetting | null | undefined; now: Date },
): AddonRefusal | null {
  // 138 What every plan includes is never sold.
  if (addonRetired(addon)) return "included";
  if (!addon.active || !addonBillings(addon).length) return "not_offered";
  if (addon.rule.family !== "both" && addon.rule.family !== input.family) return "family";
  if (!input.plan) return "no_plan";
  if (addon.rule.plans && !addon.rule.plans.includes(input.plan.id)) return "plan";
  if (addon.rule.belowTop && !belowTop(input.plans, input.plan.id, input.setting)) return "top_plan";
  if (!addon.repeatable && input.owned.some((o) => o.addonId === addon.id && addonRunning(o, input.now))) return "owned";
  // A feature the plan has already (a service that switches it on too: the publishing service on a plan that publishes).
  if (addon.kind !== "quantity" && addon.feature && hasFeature(input.plan, addon.feature)) return "included";
  if (addon.kind === "quantity" && addon.limit && limitValue(input.plan, addon.limit, input.family) === null) return "included";
  return null;
}

/** A limit's value on a plan (null: no limit; a regular app's pages on the simple editor: its template's); a team limit the plan doesn't have counts as 0. */
export function limitValue(plan: Pick<PlanInfo, "limits" | "extraLimits" | "features">, limit: string, family: PlanFamily): number | null {
  if (limit.startsWith("x:")) {
    const id = limit.slice(2);
    return plan.extraLimits && id in plan.extraLimits ? (plan.extraLimits[id] ?? null) : 0;
  }
  const l = plan.limits;
  switch (limit) {
    case "pages":
      return family === "studio" ? (l.studioPages ?? null) : pagesLimitOf(plan);
    case "storageGb":
      return l.storageGb;
    case "appUsers":
      return l.appUsers;
    case "languages":
      return l.languages;
    case "sources":
      return l.sources;
    case "teamMembers":
      return l.teamMembers;
    default:
      return null;
  }
}
