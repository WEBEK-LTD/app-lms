import type { DataStore } from "../data/store";
import type { App, StorePurchaseRecord } from "../data/types";
import { listVoidedPurchases } from "./google";
import { storeBillingSource } from "./access";
import { storesOf } from "./products";
import { applyChecked, googleFor, savePurchaseChange, readGooglePurchase, settlePurchase, tokenKey, type CheckedPurchase, type PurchaseDeps } from "./purchases";

/**
 * 100.3 The frequent job's part for purchases: access not given or taken
 * back yet is tried again (sooner for new changes, then less often); every
 * hour, Google's voided purchases (refunds, chargebacks) of each app are
 * read, and memberships past the end of their paid period are read again
 * (Google) or ended a day later without a renewal (Apple tells Yallapp of
 * renewals in its notifications, and the app sends them too).
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface PurchasesRunReport {
  delivered: number;
  refunds: number;
  ended: number;
  failed: number;
}

/** A change waiting for the source is tried again after a quarter of its age: 1 minute at first, at most a day. */
export function retryDue(purchase: Pick<StorePurchaseRecord, "updatedAt" | "createdAt">, now: Date): boolean {
  const waited = now.getTime() - purchase.updatedAt.getTime();
  const age = now.getTime() - purchase.createdAt.getTime();
  return waited >= Math.min(DAY, Math.max(MINUTE, age / 4));
}

export async function runStorePurchases(deps: PurchaseDeps & { store: DataStore }, limit = 50): Promise<PurchasesRunReport> {
  const report: PurchasesRunReport = { delivered: 0, refunds: 0, ended: 0, failed: 0 };
  const apps = new Map<string, App | null>();
  const appOf = async (id: string) => {
    if (!apps.has(id)) apps.set(id, await deps.store.getAppById(id));
    return apps.get(id) ?? null;
  };
  const settle = async (app: App, purchase: StorePurchaseRecord) => {
    const settled = await settlePurchase(deps, app, purchase);
    if (settled.ok) report.delivered += 1;
    else report.failed += 1;
  };

  // Access that couldn't be given or taken back yet.
  for (const purchase of await deps.store.listUndeliveredStorePurchases(new Date(deps.now.getTime() - MINUTE), limit)) {
    const app = await appOf(purchase.appId);
    // 100.7 A notice to the client's own API keeps its own tries (the webhook job): each run only looks whether it was delivered.
    if (!app || (!retryDue(purchase, deps.now) && storeBillingSource(app) !== "own_api")) continue;
    await settle(app, purchase);
  }

  // Every hour: Google's refunds of each app selling in the app.
  for (const app of await deps.store.listStoreBillingApps()) {
    if (!storesOf(app).google) continue;
    const last = app.storeBilling?.voidedReadAt ? Date.parse(app.storeBilling.voidedReadAt) : null;
    if (last !== null && deps.now.getTime() - last < HOUR) continue;
    try {
      const google = await googleFor(deps, app);
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const page = await listVoidedPurchases(google, { since: new Date(last ?? deps.now.getTime() - DAY), pageToken, now: deps.now });
        for (const voided of page.items) {
          const purchase = await deps.store.getStorePurchase(app.id, "android", tokenKey(voided.purchaseToken));
          if (!purchase || purchase.status === "revoked") continue;
          const checked: CheckedPurchase = { storeKey: purchase.storeKey, purchaseToken: purchase.purchaseToken, productId: purchase.productId, transactionId: purchase.transactionId, status: "revoked", expiresAt: purchase.expiresAt, acknowledged: purchase.acknowledged, test: purchase.test };
          const next = { ...applyChecked(purchase, checked, deps.now), reason: voided.reason === "refund" ? ("refunded" as const) : ("revoked" as const) };
          await savePurchaseChange(deps, purchase, next);
          report.refunds += 1;
          await settle(app, next);
        }
        pageToken = page.nextPageToken ?? undefined;
        pages += 1;
      } while (pageToken && pages < 10);
      await deps.store.updateApp(app.id, { storeBilling: { enabled: false, ...app.storeBilling, voidedReadAt: deps.now.toISOString() } }, deps.now);
    } catch (error) {
      console.error("[store billing] voided purchases", app.id, error instanceof Error ? error.message : String(error));
    }
  }

  // Memberships past their paid period: renewed, in grace, or ended.
  for (const purchase of await deps.store.listEndingStorePurchases(deps.now, limit)) {
    const app = await appOf(purchase.appId);
    if (!app) continue;
    try {
      let checked: CheckedPurchase | null = null;
      if (purchase.platform === "android" && purchase.purchaseToken) {
        checked = await readGooglePurchase(await googleFor(deps, app), { productId: purchase.productId, kind: purchase.kind }, purchase.purchaseToken, deps.now);
      } else if (purchase.platform === "ios" && purchase.expiresAt && deps.now.getTime() - purchase.expiresAt.getTime() >= DAY) {
        checked = { storeKey: purchase.storeKey, purchaseToken: null, productId: purchase.productId, transactionId: purchase.transactionId, status: "expired", expiresAt: purchase.expiresAt, acknowledged: true, test: purchase.test };
      }
      if (!checked) continue;
      const next = applyChecked(purchase, checked, deps.now);
      if (next.status !== "active") report.ended += 1;
      await savePurchaseChange(deps, purchase, next);
      if (!next.delivered) await settle(app, next);
    } catch (error) {
      report.failed += 1;
      console.error("[store billing] ending membership", app.id, error instanceof Error ? error.message : String(error));
    }
  }
  return report;
}
