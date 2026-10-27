import { usesPlugin } from "../app/label";
import type { App } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 100.2 Which apps sell in the app through the stores: academies whose
 * courses are in the dashboard (the hosted API) or on a WordPress site, on a
 * plan with in-app purchases (every plan but Starter), once the owner turned
 * it on.
 */

export type StoreBillingSource = "courses" | "site";

/** Where the app's paid courses and plans come from; null: it can't sell through the stores (yet). */
export function storeBillingSource(app: Pick<App, "appType" | "backend" | "connector">): StoreBillingSource | null {
  if (app.appType !== "lms") return null;
  if (app.backend === "hosted" && app.connector?.kind === "courses") return "courses";
  if (usesPlugin(app)) return "site";
  return null;
}

export function planHasStoreBilling(plan: PlanInfo | null | undefined): boolean {
  return Boolean(plan && hasFeature(plan, "store_billing"));
}

/** The app sells through the stores now. */
export function storeBillingOn(app: Pick<App, "appType" | "backend" | "connector" | "storeBilling">, plan: PlanInfo | null | undefined): boolean {
  return planHasStoreBilling(plan) && storeBillingSource(app) !== null && Boolean(app.storeBilling?.enabled);
}
