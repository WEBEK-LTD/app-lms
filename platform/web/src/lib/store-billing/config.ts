import type { App, StoreProduct } from "../data/types";
import type { PlanInfo } from "../plans";
import { storeBillingOn } from "./access";
import { readyIn } from "./hosted";

/** 100.3 Where an app's Store billing endpoints are: Yallapp's hosted API for the app, as for the chat. */
export function billingBaseUrl(platformUrl: string, appId: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/api/app/${appId}`;
}

/**
 * `Config.store_billing` (openapi.yaml StoreBillingConfig): present when the
 * app sells in the app and at least one product is ready in this platform's
 * store; missing means no buying in the app for digital content.
 */
export function storeBillingConfig(
  app: App,
  plan: PlanInfo | null | undefined,
  platformUrl: string,
  options: { session: "access_token" | "site"; ready: boolean; termsUrl: string | null },
): { base_url: string; session: "access_token" | "site"; terms_url: string | null } | null {
  if (!storeBillingOn(app, plan) || !options.ready) return null;
  return { base_url: billingBaseUrl(platformUrl, app.id), session: options.session, terms_url: options.termsUrl };
}

/**
 * `LicenseStatus.store_billing` (platform.yaml): what a WordPress site sells
 * in the app, on which platforms, and each product's course or plan on the
 * site. Null when the app doesn't sell in the app or nothing is ready.
 */
export function licenseStoreBilling(app: App, plan: PlanInfo | null | undefined, products: StoreProduct[], platformUrl: string) {
  if (!storeBillingOn(app, plan)) return null;
  const platforms = (["android", "ios"] as const).filter((platform) => products.some((p) => readyIn(p, platform)));
  if (platforms.length === 0) return null;
  return {
    base_url: billingBaseUrl(platformUrl, app.id),
    platforms: [...platforms],
    products: products.filter((p) => platforms.some((platform) => readyIn(p, platform))).map((p) => ({ product_id: p.productId, kind: p.kind, course_id: p.courseId, plan_id: p.planId })),
  };
}
