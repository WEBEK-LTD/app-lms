import type { PlanFamily, PlanFeature, PlanInfo, PlanLimits } from "../plans";
import { addonRunning, limitValue } from "./rules";
import type { AppAddon } from "./types";

/**
 * 133 What an app's add-ons do to its plan while they run: quantity add-ons
 * add to the plan's limits (a limit with no limit stays so), feature
 * add-ons (and services that switch one on) add the feature. Everything
 * that holds an app to its plan reads the plan through here
 * (lib/entitlements.ts `appPlan`), so the limits and features rise and fall
 * with the add-ons.
 */

/** How much the running add-ons add to each limit. */
export function addonTotals(addons: readonly AppAddon[], now: Date): Map<string, number> {
  const totals = new Map<string, number>();
  for (const a of addons) {
    if (a.kind !== "quantity" || !a.limit || !a.amount || !addonRunning(a, now)) continue;
    totals.set(a.limit, (totals.get(a.limit) ?? 0) + a.amount);
  }
  return totals;
}

/** The features the running add-ons switch on. */
export function addonFeatures(addons: readonly AppAddon[], now: Date): PlanFeature[] {
  return [...new Set(addons.filter((a) => a.feature && addonRunning(a, now)).map((a) => a.feature!))];
}

const add = (value: number | null, extra: number | undefined): number | null => (value === null || !extra ? value : value + extra);

/** The plan with the app's running add-ons; the plan itself when none run. */
export function withAddons<P extends PlanInfo>(plan: P, addons: readonly AppAddon[], family: PlanFamily, now: Date): P {
  const totals = addonTotals(addons, now);
  const features = addonFeatures(addons, now).filter((f) => !plan.features.includes(f));
  if (!totals.size && !features.length) return plan;
  const l = plan.limits;
  const limits: PlanLimits = {
    ...l,
    appUsers: add(l.appUsers, totals.get("appUsers")),
    languages: add(l.languages, totals.get("languages")),
    sources: add(l.sources, totals.get("sources")),
    storageGb: add(l.storageGb, totals.get("storageGb")),
    teamMembers: add(l.teamMembers, totals.get("teamMembers")),
  };
  const pages = totals.get("pages");
  if (pages) {
    // A Studio project's Pages per project; a regular app's pages (the simple editor's template pages when the plan sets none).
    if (family === "studio") limits.studioPages = add(l.studioPages ?? null, pages);
    else {
      const base = limitValue(plan, "pages", family);
      if (base !== null) limits.pages = base + pages;
    }
  }
  let extraLimits = plan.extraLimits;
  for (const [limit, amount] of totals) {
    if (!limit.startsWith("x:")) continue;
    const id = limit.slice(2);
    const base = limitValue(plan, limit, family);
    if (base !== null) extraLimits = { ...extraLimits, [id]: base + amount };
  }
  return { ...plan, limits, features: [...plan.features, ...features], ...(extraLimits ? { extraLimits } : {}) };
}
