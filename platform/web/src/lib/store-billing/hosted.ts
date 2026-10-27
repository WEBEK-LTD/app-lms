import type { App, StorePlatform, StoreProduct } from "../data/types";
import type { PlanInfo } from "../plans";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { storeBillingOn } from "./access";
import { restorePurchases, submitPurchase, type BillingAccount, type PurchaseDeps } from "./purchases";

/**
 * 100.3 The Store billing endpoints of the hosted API (openapi.yaml, the
 * Store billing tag), for every app that sells in the app: the products
 * ready in this platform's store, and the purchases the app sends.
 */

export interface BillingRequest {
  method: string;
  path: string[];
  query: URLSearchParams;
  body: unknown;
}

export type BillingResult = { status: number; body: unknown };

const failure = (status: number, code: string, message: string): BillingResult => ({ status, body: { code, message } });

/** A product the store sells now on this platform: on sale on the source and made in that store. */
export function readyIn(product: StoreProduct, platform: StorePlatform): boolean {
  const sync = platform === "android" ? product.google : product.apple;
  return product.active && sync?.status === "synced";
}

/** The StoreProduct the app reads (openapi.yaml). */
export function productJson(product: StoreProduct) {
  return {
    product_id: product.productId,
    type: product.kind === "membership" ? "subscription" : "one_time",
    kind: product.kind,
    course_id: product.courseId,
    plan_id: product.planId,
    title: product.title,
    period: product.period,
    course_ids: product.courseIds,
  };
}

const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const shortText = (value: unknown, max: number): string | null => (typeof value === "string" && value.length > 0 && value.length <= max ? value : null);

export async function handleBillingRoute(
  deps: PurchaseDeps & { app: App; plan: PlanInfo | null | undefined },
  req: BillingRequest,
  account: BillingAccount | null,
): Promise<BillingResult> {
  const { app } = deps;
  const route = `${req.method} /${req.path.join("/")}`;
  if (!["GET /billing/products", "POST /billing/purchases", "POST /billing/purchases/restore"].includes(route)) return failure(404, "not_found", "This isn't available in this app.");
  if (!storeBillingOn(app, deps.plan)) return failure(403, "feature_disabled", "This app doesn't sell in the app.");
  const platform = req.query.get("platform");
  if (platform !== "android" && platform !== "ios") return failure(400, "invalid_request", "Unknown platform.");

  if (route === "GET /billing/products") {
    const products = (await deps.store.listStoreProducts(app.id)).filter((p) => readyIn(p, platform));
    return { status: 200, body: { items: products.map(productJson) } };
  }

  if (!account) return failure(401, "invalid_token", "Your session has ended. Please sign in again.");
  const limited = await hitRateLimit(deps.store, RATE_LIMITS.billingPurchases, `${app.id}:${account.source}:${account.id}`, deps.now);
  if (!limited.allowed) return { status: 429, body: { code: "rate_limited", message: "Too many purchases sent. Try again in a few minutes.", retry_after_seconds: limited.retryAfter } };
  const body = record(req.body);

  if (route === "POST /billing/purchases") {
    const productId = shortText(body.product_id, 100);
    const purchaseToken = body.purchase_token == null ? null : shortText(body.purchase_token, 2000);
    const signedTransaction = body.signed_transaction == null ? null : shortText(body.signed_transaction, 20_000);
    if (!productId) return failure(400, "invalid_request", "product_id is missing.");
    const result = await submitPurchase(deps, app, account, platform, { productId, purchaseToken, signedTransaction });
    return result.ok ? { status: 200, body: result.grant } : result.fail;
  }

  const list = (value: unknown, max: number, length: number): string[] | null => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > max) return null;
    const items = value.map((v) => shortText(v, length));
    return items.every((v): v is string => v !== null) ? items : null;
  };
  const purchaseTokens = list(body.purchase_tokens, 100, 2000);
  const signedTransactions = list(body.signed_transactions, 100, 20_000);
  if (!purchaseTokens || !signedTransactions) return failure(400, "invalid_request", "Send at most 100 purchase tokens or signed transactions.");
  const result = await restorePurchases(deps, app, account, platform, { purchaseTokens, signedTransactions });
  return result.ok ? { status: 200, body: { items: result.grants } } : result.fail;
}
