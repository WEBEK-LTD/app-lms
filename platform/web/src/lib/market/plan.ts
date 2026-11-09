import type { App } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 115.13 A marketplace project (Studio kind `marketplace`): the food engine
 * with the vertical `marketplace`, so a food delivery project grows into one
 * with its restaurants, menus, couriers and orders kept, and goes back the
 * same way. Its plan needs `market` (not `marketplace`, 9.5's removed feature); Yallapp's own demo apps always
 * have it, and keep the marketplace's routes as they had them before.
 */

/** A marketplace project: the food engine with the vertical `marketplace`. */
export function isMarketplaceApp(app: Pick<App, "vertical" | "connector">): boolean {
  return app.vertical === "marketplace" && app.connector?.kind === "restaurants";
}

/** A food delivery project, which can grow into a marketplace. */
export function isFoodEngineApp(app: Pick<App, "connector">): boolean {
  return app.connector?.kind === "restaurants";
}

/** Whether the plan has marketplaces (no plan given: nothing to check). */
export function marketplaceInPlan(app: Pick<App, "demo">, plan: PlanInfo | null | undefined): boolean {
  return plan === undefined || app.demo === true || (plan !== null && hasFeature(plan, "market"));
}

/** The hosted API's marketplace routes and `Config.market`: a marketplace project on a plan with marketplaces, or a demo app. */
export function marketplaceOn(app: Pick<App, "vertical" | "connector" | "demo">, plan: PlanInfo | null | undefined): boolean {
  if (!isFoodEngineApp(app)) return false;
  if (app.demo === true) return true;
  return isMarketplaceApp(app) && marketplaceInPlan(app, plan);
}

/**
 * The food routes underneath a marketplace: a plan with food delivery, or
 * a marketplace project on a plan with marketplaces (the marketplace
 * extends food delivery, so it needs nothing more).
 */
export function foodRoutesOn(app: Pick<App, "vertical" | "connector" | "demo">, plan: PlanInfo | null | undefined): boolean {
  if (app.demo === true || plan === undefined) return true;
  if (!plan) return false;
  return hasFeature(plan, "food") || (isMarketplaceApp(app) && hasFeature(plan, "market"));
}
