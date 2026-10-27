import { createHash, randomUUID } from "node:crypto";
import type { DataStore } from "../data/store";
import type { App, StoreAccountSource, StorePlatform, StoreProduct, StorePurchaseRecord } from "../data/types";
import { AppleBillingError, verifySignedTransaction } from "./apple";
import { acknowledgeProductPurchase, acknowledgeSubscription, GoogleBillingError, googleBillingToken, readProductPurchase, readSubscriptionPurchase, type GoogleBillingDeps } from "./google";
import { deliverPurchase, type DeliveryDeps } from "./delivery";
import { googleKey } from "./keys";

/**
 * 100.3 A purchase the app made with the store's own SDK, checked with the
 * store and kept once (docs/api/openapi.yaml, the Store billing tag):
 * Google's purchase token is read with the Play Developer API (it must be
 * this app's, for this product, paid), Apple's signed transaction is checked
 * offline against Apple's root certificate. The first account that sends a
 * purchase owns it; the access is given on the app's source
 * (lib/store-billing/delivery.ts) before Google is told the purchase was
 * acknowledged, so a purchase whose access couldn't be given is never kept
 * by Google without it (Google refunds an unacknowledged purchase after three
 * days).
 */

export interface PurchaseDeps extends DeliveryDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  fetcher?: typeof fetch;
  /** Apple's trusted roots (tests); Apple Root CA - G3 otherwise. */
  appleRoots?: readonly string[];
}

export interface BillingAccount {
  source: StoreAccountSource;
  id: string;
}

export type BillingFail = { status: 400 | 403 | 404 | 409 | 429 | 503; body: { code: string; message: string } };
const fail = (status: BillingFail["status"], code: string, message: string): BillingFail => ({ status, body: { code, message } });

export const INVALID_RECEIPT = (): BillingFail => fail(400, "invalid_receipt", "This isn't a valid purchase in this app.");
export const STORE_UNAVAILABLE = (): BillingFail => fail(503, "store_unavailable", "The store couldn't be reached. Your purchase is safe: the app will send it again shortly.");
export const PURCHASE_IN_USE = (): BillingFail => fail(409, "purchase_in_use", "This purchase belongs to another account in this app.");

/** What the store says about a purchase, as Yallapp keeps it. */
export interface CheckedPurchase {
  storeKey: string;
  purchaseToken: string | null;
  productId: string;
  transactionId: string | null;
  status: StorePurchaseRecord["status"];
  expiresAt: Date | null;
  /** Google: acknowledged already. Apple needs no acknowledgement. */
  acknowledged: boolean;
  test: boolean;
}

/** Google's purchase tokens are kept by their hash too: the unique key. */
export const tokenKey = (purchaseToken: string) => createHash("sha256").update(purchaseToken).digest("hex");

/** The StoreGrant the app gets (openapi.yaml). */
export function grantOf(purchase: StorePurchaseRecord) {
  return {
    product_id: purchase.productId,
    kind: purchase.kind,
    course_id: purchase.courseId,
    plan_id: purchase.planId,
    status: purchase.status,
    expires_at: purchase.expiresAt?.toISOString() ?? null,
  };
}

/** Reads a Google purchase: a one-time product or a subscription, as the product is. */
export async function readGooglePurchase(google: GoogleBillingDeps, product: Pick<StoreProduct, "productId" | "kind">, purchaseToken: string, now: Date): Promise<CheckedPurchase> {
  if (product.kind === "membership") {
    const sub = await readSubscriptionPurchase(google, purchaseToken);
    if (sub.productId !== product.productId) throw new GoogleBillingError("google_invalid");
    const paidUntil = sub.expiresAt !== null && sub.expiresAt.getTime() > now.getTime();
    // Cancelled (no renewal) and grace keep the access until the end of the paid period; on hold and paused don't.
    const status: StorePurchaseRecord["status"] =
      sub.state === "pending" ? "pending" : (sub.state === "active" || sub.state === "grace" || sub.state === "cancelled") && paidUntil ? "active" : "expired";
    return { storeKey: tokenKey(purchaseToken), purchaseToken, productId: sub.productId, transactionId: sub.latestOrderId, status, expiresAt: sub.expiresAt, acknowledged: sub.acknowledged, test: sub.test };
  }
  const one = await readProductPurchase(google, purchaseToken);
  if (one.productId !== product.productId) throw new GoogleBillingError("google_invalid");
  const status: StorePurchaseRecord["status"] = one.refunded ? "revoked" : one.state === "purchased" ? "active" : one.state === "pending" ? "pending" : "revoked";
  return { storeKey: tokenKey(purchaseToken), purchaseToken, productId: one.productId, transactionId: one.orderId, status, expiresAt: null, acknowledged: one.acknowledged, test: one.test };
}

/** Checks an Apple signed transaction: Apple's, this app's, this product. */
export function readAppleTransaction(app: Pick<App, "iosBundleId">, productId: string, jws: string, deps: Pick<PurchaseDeps, "now" | "appleRoots">): CheckedPurchase {
  const tx = verifySignedTransaction(jws, { bundleId: app.iosBundleId ?? "", now: deps.now, ...(deps.appleRoots ? { rootCertificates: deps.appleRoots } : {}) });
  if (tx.productId !== productId) throw new AppleBillingError("apple_invalid", "another product's transaction");
  const status: StorePurchaseRecord["status"] = tx.revocationDate ? "revoked" : tx.expiresDate && tx.expiresDate.getTime() <= deps.now.getTime() ? "expired" : "active";
  return {
    storeKey: tx.originalTransactionId,
    purchaseToken: null,
    productId: tx.productId,
    transactionId: tx.transactionId,
    status,
    expiresAt: tx.expiresDate,
    acknowledged: true,
    test: tx.environment === "Sandbox",
  };
}

/** The Play Developer API with the app's service account. */
export async function googleFor(deps: Pick<PurchaseDeps, "key" | "now" | "fetcher">, app: App): Promise<GoogleBillingDeps> {
  const fetcher = deps.fetcher ?? fetch;
  return { fetcher, token: await googleBillingToken(fetcher, googleKey(app, deps.key), deps.now), packageName: app.androidPackage ?? "" };
}

const storeCodes = new Set(["google_invalid", "google_not_found", "apple_invalid", "apple_not_found"]);
/** A store error as the app hears it: not a valid purchase, or the store couldn't be reached. */
function failOf(error: unknown): BillingFail {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (storeCodes.has(code)) return INVALID_RECEIPT();
  if (code === "" && !(error instanceof GoogleBillingError) && !(error instanceof AppleBillingError)) throw error;
  return STORE_UNAVAILABLE();
}

/** Checks a purchase the app sent with the store; the product must be one of the app's. */
export async function checkPurchase(
  deps: PurchaseDeps,
  app: App,
  platform: StorePlatform,
  input: { productId: string; purchaseToken?: string | null; signedTransaction?: string | null },
): Promise<{ ok: true; product: StoreProduct; checked: CheckedPurchase } | { ok: false; fail: BillingFail }> {
  const product = await deps.store.getStoreProduct(app.id, input.productId);
  if (!product) return { ok: false, fail: INVALID_RECEIPT() };
  try {
    if (platform === "android") {
      if (!input.purchaseToken) return { ok: false, fail: fail(400, "invalid_request", "purchase_token is missing.") };
      return { ok: true, product, checked: await readGooglePurchase(await googleFor(deps, app), product, input.purchaseToken, deps.now) };
    }
    if (!input.signedTransaction) return { ok: false, fail: fail(400, "invalid_request", "signed_transaction is missing.") };
    return { ok: true, product, checked: readAppleTransaction(app, product.productId, input.signedTransaction, deps) };
  } catch (error) {
    return { ok: false, fail: failOf(error) };
  }
}

/**
 * Keeps what the store said about a purchase: its status, the end of its
 * paid period, its latest transaction. A change the source must hear about
 * (given, taken back, renewed) waits until it is delivered.
 */
export function applyChecked(purchase: StorePurchaseRecord, checked: CheckedPurchase, now: Date): StorePurchaseRecord {
  const changed = purchase.status !== checked.status || (purchase.expiresAt?.getTime() ?? null) !== (checked.expiresAt?.getTime() ?? null);
  const reason = checked.status === "revoked" ? (purchase.reason ?? "refunded") : checked.status === "expired" ? "expired" : null;
  return {
    ...purchase,
    status: checked.status,
    expiresAt: checked.expiresAt,
    transactionId: checked.transactionId ?? purchase.transactionId,
    purchaseToken: checked.purchaseToken ?? purchase.purchaseToken,
    acknowledged: purchase.acknowledged || checked.acknowledged,
    reason,
    delivered: changed ? false : purchase.delivered,
    updatedAt: changed ? now : purchase.updatedAt,
  };
}

/**
 * Gives (or takes back) the access on the source when it changed, then
 * acknowledges an active Google purchase. False when the source couldn't be
 * reached: the purchase stays waiting and nothing is acknowledged.
 */
export async function settlePurchase(deps: PurchaseDeps, app: App, purchase: StorePurchaseRecord): Promise<{ ok: boolean; purchase: StorePurchaseRecord }> {
  let current = purchase;
  if (!current.delivered && current.status !== "pending") {
    const delivered = await deliverPurchase(deps, app, current);
    current = { ...current, delivered, updatedAt: deps.now };
    await deps.store.saveStorePurchase(current);
    if (!delivered) return { ok: false, purchase: current };
  }
  if (current.platform === "android" && current.status === "active" && !current.acknowledged && current.purchaseToken) {
    try {
      const google = await googleFor(deps, app);
      if (current.kind === "membership") await acknowledgeSubscription(google, { productId: current.productId, purchaseToken: current.purchaseToken });
      else await acknowledgeProductPurchase(google, { productId: current.productId, purchaseToken: current.purchaseToken });
      current = { ...current, acknowledged: true, updatedAt: deps.now };
      await deps.store.saveStorePurchase(current);
    } catch (error) {
      console.error("[store billing] acknowledge", app.id, error instanceof Error ? error.message : String(error));
      return { ok: false, purchase: current };
    }
  }
  return { ok: true, purchase: current };
}

/** POST /billing/purchases: check, keep once, give the access, acknowledge; the same purchase again answers the same grant. */
export async function submitPurchase(
  deps: PurchaseDeps,
  app: App,
  account: BillingAccount,
  platform: StorePlatform,
  input: { productId: string; purchaseToken?: string | null; signedTransaction?: string | null },
): Promise<{ ok: true; grant: ReturnType<typeof grantOf> } | { ok: false; fail: BillingFail }> {
  const result = await checkPurchase(deps, app, platform, input);
  if (!result.ok) return result;
  const { product, checked } = result;
  const existing = await deps.store.getStorePurchase(app.id, platform, checked.storeKey);
  if (existing && (existing.accountSource !== account.source || existing.accountId !== account.id)) return { ok: false, fail: PURCHASE_IN_USE() };
  const kept =
    existing ??
    (await deps.store.createStorePurchase({
      id: randomUUID(),
      appId: app.id,
      platform,
      storeKey: checked.storeKey,
      purchaseToken: checked.purchaseToken,
      productId: product.productId,
      kind: product.kind,
      courseId: product.courseId,
      planId: product.planId,
      accountSource: account.source,
      accountId: account.id,
      transactionId: checked.transactionId,
      status: checked.status,
      expiresAt: checked.expiresAt,
      acknowledged: checked.acknowledged,
      delivered: false,
      reason: null,
      test: checked.test,
      createdAt: deps.now,
      updatedAt: deps.now,
    }));
  // Two sends at once: the other one kept it first, for its account.
  if (kept.accountSource !== account.source || kept.accountId !== account.id) return { ok: false, fail: PURCHASE_IN_USE() };
  const updated = existing ? applyChecked(kept, checked, deps.now) : kept;
  if (updated !== kept) await deps.store.saveStorePurchase(updated);
  const settled = await settlePurchase(deps, app, updated);
  if (!settled.ok) return { ok: false, fail: STORE_UNAVAILABLE() };
  return { ok: true, grant: grantOf(settled.purchase) };
}

/**
 * POST /billing/purchases/restore: every purchase the store has for the
 * person; the grants of this account still active. One owned by another
 * account is left out, never moved.
 */
export async function restorePurchases(
  deps: PurchaseDeps,
  app: App,
  account: BillingAccount,
  platform: StorePlatform,
  input: { purchaseTokens: string[]; signedTransactions: string[] },
): Promise<{ ok: true; grants: ReturnType<typeof grantOf>[] } | { ok: false; fail: BillingFail }> {
  const grants = new Map<string, ReturnType<typeof grantOf>>();
  const sent =
    platform === "android"
      ? input.purchaseTokens.map((token) => ({ token, productId: null as string | null }))
      : input.signedTransactions.map((jws) => ({ jws, productId: productOfJws(jws) }));
  for (const item of sent) {
    let productId = item.productId;
    if ("token" in item) {
      // Google's token doesn't say its product: the kept purchase does, else Google does (one read for each kind).
      const known = await deps.store.getStorePurchase(app.id, "android", tokenKey(item.token));
      productId = known?.productId ?? (await googleProductOf(deps, app, item.token));
    }
    if (!productId) continue;
    const result = await submitPurchase(deps, app, account, platform, { productId, purchaseToken: "token" in item ? item.token : null, signedTransaction: "jws" in item ? item.jws : null });
    if (result.ok) grants.set(result.grant.product_id, result.grant);
    else if (result.fail.status === 503) return result;
  }
  // And what this account bought before, still active.
  for (const purchase of await deps.store.listAccountStorePurchases(app.id, account.source, account.id)) {
    if (purchase.platform === platform && purchase.status === "active" && !grants.has(purchase.productId)) grants.set(purchase.productId, grantOf(purchase));
  }
  return { ok: true, grants: [...grants.values()].filter((g) => g.status === "active") };
}

/** The product a Google purchase token is for: a one-time product, else a subscription; null when Google knows neither. */
async function googleProductOf(deps: PurchaseDeps, app: App, purchaseToken: string): Promise<string | null> {
  try {
    const google = await googleFor(deps, app);
    try {
      return (await readProductPurchase(google, purchaseToken)).productId;
    } catch (error) {
      if (!(error instanceof GoogleBillingError) || (error.code !== "google_not_found" && error.code !== "google_invalid")) throw error;
      return (await readSubscriptionPurchase(google, purchaseToken)).productId;
    }
  } catch {
    return null;
  }
}

/** The product ID an Apple JWS claims (checked properly when it's submitted). */
function productOfJws(jws: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(jws.split(".")[1] ?? "", "base64url").toString("utf8")) as { productId?: unknown };
    return typeof payload.productId === "string" ? payload.productId : null;
  } catch {
    return null;
  }
}
