import { usesPlugin } from "../app/label";
import type { App } from "../data/types";
import { yallappSignsIn } from "../hosted/sign-in-methods";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 100.2 Which apps sell in the app through the stores: academies whose
 * courses are in the dashboard (the hosted API) or on a WordPress site, on a
 * plan with in-app purchases (every plan but Starter), once the owner turned
 * it on. 100.7 Also academies on their own API that Yallapp signs people in
 * to, and schools on Teachable or Thinkific (hosted connector apps).
 */

/**
 * Where the app's paid courses and plans come from, and where their access
 * is given: `courses` the dashboard's courses; `site` the WordPress plugin;
 * `own_api` the owner's list on In-app purchases, with access through the
 * signed `purchase.completed` and `purchase.revoked` notices to the client's
 * API; `teachable` and `thinkific` the school's courses (and the owner's
 * list), with access through the school's enrolment API.
 */
export type StoreBillingSource = "courses" | "site" | "own_api" | "teachable" | "thinkific";

/** The sources whose products come (at least partly) from the owner's list on In-app purchases. */
export const LISTED_SOURCES: readonly StoreBillingSource[] = ["own_api", "teachable", "thinkific"];

type SourceFields = Pick<App, "appType" | "backend" | "connector" | "apiBaseUrl" | "hostedSettings">;

/** Where the app's paid courses and plans come from; null: it can't sell through the stores (yet). */
export function storeBillingSource(app: SourceFields): StoreBillingSource | null {
  if (app.appType !== "lms") return null;
  if (app.backend === "hosted" && app.connector?.kind === "courses") return "courses";
  if (app.backend === "hosted" && app.connector?.kind === "platform" && (app.connector.platform === "teachable" || app.connector.platform === "thinkific")) return app.connector.platform;
  if (usesPlugin(app)) return "site";
  // 100.7 The purchases are Yallapp's accounts' (its sign-in), and the notices go to the API's address.
  if (app.backend === "custom_api" && app.apiBaseUrl && yallappSignsIn({ backend: app.backend, hostedSettings: app.hostedSettings })) return "own_api";
  return null;
}

/** 100.7 An academy on its own API that could sell in the app once Yallapp signs people in. */
export function needsYallappSignIn(app: SourceFields): boolean {
  return app.appType === "lms" && app.backend === "custom_api" && storeBillingSource(app) === null;
}

export function planHasStoreBilling(plan: PlanInfo | null | undefined): boolean {
  return Boolean(plan && hasFeature(plan, "store_billing"));
}

/** The app sells through the stores now. */
export function storeBillingOn(app: SourceFields & Pick<App, "storeBilling">, plan: PlanInfo | null | undefined): boolean {
  return planHasStoreBilling(plan) && storeBillingSource(app) !== null && Boolean(app.storeBilling?.enabled);
}
