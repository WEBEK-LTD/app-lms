import type { DataStore } from "../data/store";
import type { App, Courier, DeliverySettings, HostedUser } from "../data/types";
import { isReviewUser, reviewCourierFor } from "../delivery/review";
import { courierWho } from "../delivery/service";
import { deliverySettingsOf } from "../delivery/settings";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 104.8.2 Which companies' couriers work in Yallapp Courier: delivery
 * projects whose Delivery settings › where couriers work is Yallapp Courier,
 * on a plan with `delivery`. Read on every call of a session Yallapp Courier
 * opened, so a company that leaves it, or pauses or removes the courier,
 * ends that session at its next call.
 */

/** Whether the company's couriers work in Yallapp Courier (its plan aside). */
export function onYallappCourier(app: Pick<App, "appType">, settings: Pick<DeliverySettings, "courierApp">): boolean {
  return app.appType === "delivery" && settings.courierApp === "yallapp_courier";
}

/** Whether the plan has delivery; Yallapp's own demo apps have Studio's project types on any plan. */
export const deliveryOnPlan = (app: Pick<App, "demo">, plan: PlanInfo | null): boolean => hasFeature(plan, "delivery") || app.demo === true;

/**
 * 104.8.2 Studio's demo delivery company is the stores' reviewers' (lib/courier-hub/review.ts):
 * their session there is its own review account, the courier "App Review" of 104.7.
 */
export function isDemoReviewSession(app: Pick<App, "demo" | "appType" | "hostedSettings">, user: Pick<HostedUser, "phone" | "email">): boolean {
  return app.demo === true && app.appType === "delivery" && isReviewUser(app, user);
}

export type HubCourierState = "ok" | "gone" | "paused";

/** Whether the person may keep a session Yallapp Courier opened at the company: it is still on Yallapp Courier and they are its active courier. */
export async function hubCourierAt(deps: { store: DataStore; app: App; plan: PlanInfo | null; now: Date }, user: HostedUser): Promise<HubCourierState> {
  const courier = await hubCourierOf(deps, user);
  return !courier ? "gone" : courier.active ? "ok" : "paused";
}

/** The person's courier at the company while it is on Yallapp Courier (active or paused); null otherwise. */
export async function hubCourierOf(deps: { store: DataStore; app: App; plan: PlanInfo | null; now: Date }, user: HostedUser): Promise<Courier | null> {
  const { store, app } = deps;
  if (isDemoReviewSession(app, user)) return reviewCourierFor(store, app, user, deps.now);
  if (!deliveryOnPlan(app, deps.plan) || !onYallappCourier(app, deliverySettingsOf(await store.getDeliverySettings(app.id)))) return null;
  return store.findCourier(app.id, courierWho(user));
}
