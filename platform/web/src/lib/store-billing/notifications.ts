import type { App, StorePurchaseRecord } from "../data/types";
import { verifyNotification } from "./apple";
import { GoogleBillingError, parseDeveloperNotification, verifyPubSubPush } from "./google";
import { applyChecked, googleFor, readGooglePurchase, settlePurchase, tokenKey, type CheckedPurchase, type PurchaseDeps } from "./purchases";

/**
 * 100.3 What the stores tell Yallapp about the purchases it kept (platform.yaml
 * googleBillingNotification and appleBillingNotification). Google's push is
 * checked by its OIDC token, and only says which purchase to read again from
 * Google; Apple's notification is signed data, checked against Apple's root.
 * A purchase Yallapp doesn't know (the app hasn't sent it yet) is left for
 * the app to send.
 */

export type NoticeResult = { status: 200 | 204 | 400 | 401 | 404 | 503; body?: { code: string; message: string } };

const answer = (status: NoticeResult["status"], code?: string, message?: string): NoticeResult => (code ? { status, body: { code, message: message ?? code } } : { status });

/** Changes a kept purchase as the store now says, and gives or takes the access. */
async function update(deps: PurchaseDeps, app: App, purchase: StorePurchaseRecord, checked: CheckedPurchase, reason: StorePurchaseRecord["reason"] = null): Promise<boolean> {
  let next = applyChecked(purchase, checked, deps.now);
  if (reason && next.status === "revoked") next = { ...next, reason };
  if (next !== purchase) await deps.store.saveStorePurchase(next);
  return (await settlePurchase(deps, app, next)).ok;
}

export async function handleGoogleNotification(
  deps: PurchaseDeps & { audience: string; pushEmail: string | null; apps: () => Promise<App[]> },
  authorization: string | null,
  body: unknown,
): Promise<NoticeResult> {
  if (!deps.pushEmail) return answer(401, "invalid_signature", "Google Play's notifications aren't set up.");
  try {
    const email = await verifyPubSubPush(authorization, { audience: deps.audience, now: deps.now, fetcher: deps.fetcher ?? fetch });
    if (email.toLowerCase() !== deps.pushEmail) return answer(401, "invalid_signature", "Not sent by Yallapp's Pub/Sub subscription.");
  } catch (error) {
    if (error instanceof GoogleBillingError && error.code === "google_failed") return answer(503, "store_unavailable", "Google's certificates couldn't be read.");
    return answer(401, "invalid_signature", "Not sent by Google.");
  }
  const message = body && typeof body === "object" ? (body as { message?: { data?: unknown } }).message : undefined;
  const notice = typeof message?.data === "string" ? parseDeveloperNotification(message.data) : null;
  // Something Yallapp can't use: Pub/Sub stops sending it.
  if (!notice || notice.test) return answer(204);
  const app = (await deps.apps()).find((a) => a.androidPackage === notice.packageName);
  const token = notice.oneTime?.purchaseToken ?? notice.subscription?.purchaseToken ?? notice.voided?.purchaseToken;
  if (!app || !token) return answer(204);
  const purchase = await deps.store.getStorePurchase(app.id, "android", tokenKey(token));
  if (!purchase) return answer(204);
  if (notice.voided) {
    const checked: CheckedPurchase = { storeKey: purchase.storeKey, purchaseToken: token, productId: purchase.productId, transactionId: purchase.transactionId, status: "revoked", expiresAt: purchase.expiresAt, acknowledged: purchase.acknowledged, test: purchase.test };
    return (await update(deps, app, purchase, checked, "refunded")) ? answer(204) : answer(503, "store_unavailable", "The access couldn't be taken back yet.");
  }
  try {
    const checked = await readGooglePurchase(await googleFor(deps, app), { productId: purchase.productId, kind: purchase.kind }, token, deps.now);
    return (await update(deps, app, purchase, checked)) ? answer(204) : answer(503, "store_unavailable", "The access couldn't be changed yet.");
  } catch (error) {
    console.error("[store billing] google notification", app.id, error instanceof Error ? error.message : String(error));
    return answer(503, "store_unavailable", "Google Play couldn't be reached.");
  }
}

/** Apple's notification types that take the access back, with the reason kept. */
const REVOKING: Record<string, StorePurchaseRecord["reason"]> = { REFUND: "refunded", REVOKE: "revoked" };

export async function handleAppleNotification(deps: PurchaseDeps, app: App | null, body: unknown): Promise<NoticeResult> {
  if (!app || !app.iosBundleId) return answer(404, "not_found", "Not found.");
  const signed = body && typeof body === "object" ? (body as { signedPayload?: unknown }).signedPayload : undefined;
  if (typeof signed !== "string" || signed.length > 100_000) return answer(400, "invalid_request", "signedPayload is missing.");
  let notice;
  try {
    notice = verifyNotification(signed, { bundleId: app.iosBundleId, now: deps.now, ...(deps.appleRoots ? { rootCertificates: deps.appleRoots } : {}) });
  } catch {
    return answer(400, "invalid_signature", "Not signed by the App Store for this app.");
  }
  const tx = notice.transaction;
  if (!tx) return answer(200);
  const purchase = await deps.store.getStorePurchase(app.id, "ios", tx.originalTransactionId);
  if (!purchase) return answer(200);
  const reason = REVOKING[notice.notificationType] ?? null;
  const expired = tx.expiresDate !== null && tx.expiresDate.getTime() <= deps.now.getTime();
  const checked: CheckedPurchase = {
    storeKey: purchase.storeKey,
    purchaseToken: null,
    productId: purchase.productId,
    transactionId: tx.transactionId,
    status: tx.revocationDate || reason ? "revoked" : expired || notice.notificationType === "EXPIRED" ? "expired" : "active",
    expiresAt: tx.expiresDate,
    acknowledged: true,
    test: tx.environment === "Sandbox",
  };
  return (await update(deps, app, purchase, checked, reason)) ? answer(200) : answer(503, "store_unavailable", "The access couldn't be changed yet.");
}
