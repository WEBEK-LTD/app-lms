import { randomUUID } from "node:crypto";
import { keyContext } from "../builds/signing";
import { decrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import { appUrl } from "../env";
import type { App, StoreBillingSettings, StoreProduct, StoreProductSync } from "../data/types";
import { storeBillingSource } from "./access";
import { findAppleAppId, removeFromSale, setNotificationUrls, territoryFor, upsertNonConsumable, upsertSubscription as upsertAppleSubscription } from "./apple";
import { deactivateProduct, GoogleBillingError, googleBillingToken, playDefaultLanguage, upsertOneTimeProduct, upsertSubscription, type GoogleBillingDeps } from "./google";
import { needsSync, reconcileProducts, storesOf, wantedFromCourses, wantedPrice } from "./products";

/**
 * 100.2 Makes the app's store products in the owner's Google Play and App
 * Store accounts, and keeps them in step: new and changed products are
 * created or updated at their price, products no longer sold are stopped.
 * Each store's result is kept on the product; a refused key stops that
 * store's run (every product would fail the same way). Run by the frequent
 * job and by "Update the stores now".
 */

export interface SyncDeps {
  store: Pick<DataStore, "listStoreProducts" | "getStoreProduct" | "saveStoreProduct" | "updateApp">;
  key: Buffer;
  now: Date;
  fetcher?: typeof fetch;
  /** At most this many store calls' worth of products per store (a run stays short); the rest wait for the next one. */
  limit?: number;
  /** Try failed products again now (the owner asked). */
  force?: boolean;
}

export interface SyncReport {
  done: number;
  failed: number;
  /** Products still waiting for a store (over the limit). */
  waiting: number;
}

const DEFAULT_LIMIT = 10;

/** The dashboard's courses on the hosted API, as store products (the plugin sends a WordPress site's). */
export async function reconcileHostedCourses(store: SyncDeps["store"], app: App, now: Date): Promise<void> {
  if (storeBillingSource(app) !== "courses") return;
  const existing = await store.listStoreProducts(app.id);
  for (const product of reconcileProducts(app.id, existing, wantedFromCourses(app.courseSetup), now, randomUUID)) await store.saveStoreProduct(product);
}

const errorCode = (error: unknown, fallback: string): string => (error instanceof GoogleBillingError ? error.code : error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : fallback);
/** Codes after which the store's other products would fail the same way. */
const FATAL = new Set(["google_key", "google_refused", "unreadable", "apple_refused", "apple_no_app"]);

function syncOf(status: StoreProductSync["status"], now: Date, extra: Partial<StoreProductSync> = {}): StoreProductSync {
  return { status, storeState: null, price: null, error: null, at: now.toISOString(), ...extra };
}

interface StoreRun {
  which: "google" | "apple";
  /** Makes or changes the product in the store; its state and the price kept there. */
  upsert(product: StoreProduct): Promise<{ state: string; price: string | null }>;
  stop(product: StoreProduct): Promise<void>;
}

async function runEach(deps: SyncDeps, due: StoreProduct[], open: () => Promise<StoreRun>): Promise<SyncReport & { error: string | null }> {
  const limit = deps.limit ?? DEFAULT_LIMIT;
  const report = { done: 0, failed: 0, waiting: Math.max(0, due.length - limit), error: null as string | null };
  if (due.length === 0) return report;
  let run: StoreRun;
  try {
    run = await open();
  } catch (error) {
    report.error = errorCode(error, "failed");
    return report;
  }
  for (const product of due.slice(0, limit)) {
    let sync: StoreProductSync;
    try {
      if (product.active) {
        const result = await run.upsert(product);
        sync = syncOf("synced", deps.now, { storeState: result.state, price: result.price });
      } else {
        await run.stop(product);
        sync = syncOf("stopped", deps.now, { price: product[run.which]?.price ?? null });
      }
      report.done += 1;
    } catch (error) {
      const code = errorCode(error, `${run.which}_failed`);
      sync = syncOf("failed", deps.now, { error: code, price: product[run.which]?.price ?? null, storeState: product[run.which]?.storeState ?? null });
      report.failed += 1;
      if (FATAL.has(code)) report.error = code;
    }
    // As it is now: the other store's result, or a change from the source while this one ran, stays.
    const fresh = (await deps.store.getStoreProduct(product.appId, product.productId)) ?? product;
    await deps.store.saveStoreProduct({ ...fresh, [run.which]: sync });
    if (report.error) break;
  }
  return report;
}

const description = (product: StoreProduct) => product.title;

function googleRun(deps: SyncDeps, app: App, fetcher: typeof fetch): () => Promise<StoreRun> {
  return async () => {
    let json: string;
    try {
      json = decrypt(app.googlePlayKeyEncrypted ?? "", deps.key, keyContext.googlePlay(app.id));
    } catch {
      throw { code: "unreadable" };
    }
    const token = await googleBillingToken(fetcher, json, deps.now);
    const google: GoogleBillingDeps = { fetcher, token, packageName: app.androidPackage ?? "" };
    let language: string | null = null;
    const languageCode = async () => (language ??= await playDefaultLanguage(google));
    return {
      which: "google",
      async upsert(product) {
        const input = { productId: product.productId, title: product.title, description: description(product), price: { currency: product.currency, amount: wantedPrice(product) }, languageCode: await languageCode() };
        return product.kind === "membership" && product.period ? upsertSubscription(google, { ...input, period: product.period }) : upsertOneTimeProduct(google, input);
      },
      stop: (product) => deactivateProduct(google, { productId: product.productId, type: product.kind === "membership" ? "subscription" : "one_time" }),
    };
  };
}

/** One subscription group holds all of an app's memberships: a person changes plan inside it. */
export const APPLE_GROUP = "Memberships";

/** Where Apple sends the app's App Store Server Notifications (platform.yaml). */
export function appleNotificationsUrl(appId: string, base = appUrl()): string {
  return `${base}/api/v1/billing/notifications/apple/${appId}`;
}

/** The App Store Connect key of the app, read. */
export function appleCredentials(app: App, key: Buffer) {
  try {
    return { keyId: app.ascKeyId ?? "", issuerId: app.ascIssuerId ?? "", privateKey: decrypt(app.ascPrivateKeyEncrypted ?? "", key, keyContext.appStore(app.id)) };
  } catch {
    throw { code: "unreadable" };
  }
}

/**
 * The app's ID in App Store Connect (kept once found), with its notifications
 * pointed at Yallapp (set once, again when the address changes).
 */
export async function appleAppOf(deps: { store: Pick<DataStore, "updateApp">; now: Date }, app: App, fetcher: typeof fetch, credentials: ReturnType<typeof appleCredentials>): Promise<string> {
  const settings: StoreBillingSettings = { enabled: false, ...app.storeBilling };
  const appId = settings.appleAppId ?? (await findAppleAppId(fetcher, credentials, app.iosBundleId ?? "", deps.now));
  const url = appleNotificationsUrl(app.id);
  if (settings.appleNotificationsUrl !== url) await setNotificationUrls(fetcher, credentials, appId, url, deps.now);
  if (settings.appleAppId !== appId || settings.appleNotificationsUrl !== url) {
    app.storeBilling = { ...settings, appleAppId: appId, appleNotificationsUrl: url };
    await deps.store.updateApp(app.id, { storeBilling: app.storeBilling }, deps.now);
  }
  return appId;
}

function appleRun(deps: SyncDeps, app: App, fetcher: typeof fetch): () => Promise<StoreRun> {
  return async () => {
    const credentials = appleCredentials(app, deps.key);
    const appId = await appleAppOf(deps, app, fetcher, credentials);
    return {
      which: "apple",
      async upsert(product) {
        const price = { currency: product.currency, amount: Number(wantedPrice(product)) };
        const input = { appId, productId: product.productId, referenceName: product.title, title: product.title, description: description(product), price };
        const result =
          product.kind === "membership" && product.period
            ? await upsertAppleSubscription(fetcher, credentials, { ...input, groupReferenceName: APPLE_GROUP, period: product.period }, deps.now)
            : await upsertNonConsumable(fetcher, credentials, input, deps.now);
        // Apple's price is in its base territory's currency: kept only when that is the app's.
        const same = territoryFor(product.currency) !== "USA" || product.currency === "USD";
        return { state: result.state, price: same ? result.price : null };
      },
      stop: (product) => removeFromSale(fetcher, credentials, { appId, productId: product.productId, type: product.kind === "membership" ? "subscription" : "one_time", groupReferenceName: APPLE_GROUP }, deps.now),
    };
  };
}

/** Brings the stores in step with the app's products; returns what happened in each. */
export async function syncStoreProducts(deps: SyncDeps, app: App): Promise<{ google: SyncReport; apple: SyncReport }> {
  const fetcher = deps.fetcher ?? fetch;
  await reconcileHostedCourses(deps.store, app, deps.now);
  const products = await deps.store.listStoreProducts(app.id);
  const stores = storesOf(app);
  const due = (which: "google" | "apple") => products.filter((p) => needsSync(p, p[which], deps.force ? undefined : deps.now));
  const empty = { done: 0, failed: 0, waiting: 0, error: null as string | null };
  const google = stores.google ? await runEach(deps, due("google"), googleRun(deps, app, fetcher)) : empty;
  const apple = stores.apple ? await runEach(deps, due("apple"), appleRun(deps, app, fetcher)) : empty;
  const at = deps.now.toISOString();
  // A store that refused (or worked) says so on the page until the next run.
  const check = (run: typeof google, current: StoreBillingSettings["googleCheck"]) => (run.error ? { at, error: run.error } : run.done > 0 ? { at, error: null } : (current ?? null));
  const settings: StoreBillingSettings = {
    enabled: false,
    ...app.storeBilling,
    googleCheck: check(google, app.storeBilling?.googleCheck),
    appleCheck: check(apple, app.storeBilling?.appleCheck),
    syncedAt: at,
  };
  await deps.store.updateApp(app.id, { storeBilling: settings }, deps.now);
  return { google: { done: google.done, failed: google.failed, waiting: google.waiting }, apple: { done: apple.done, failed: apple.failed, waiting: apple.waiting } };
}

export interface StoreProductsRunReport {
  apps: number;
  done: number;
  failed: number;
}

/**
 * 100.2 The frequent job's part: every app selling in the app whose plan
 * still has it gets its waiting products made or changed in the stores
 * (failed ones after an hour). One app's trouble never stops the others.
 */
export async function runStoreProductSync(deps: Omit<SyncDeps, "store" | "force"> & { store: SyncDeps["store"] & Pick<DataStore, "listStoreBillingApps" | "getLicenseForApp"> }, plans: (license: Awaited<ReturnType<DataStore["getLicenseForApp"]>>) => Promise<boolean>): Promise<StoreProductsRunReport> {
  const report: StoreProductsRunReport = { apps: 0, done: 0, failed: 0 };
  for (const app of await deps.store.listStoreBillingApps()) {
    if (!storeBillingSource(app)) continue;
    if (!(await plans(await deps.store.getLicenseForApp(app.clientId, app.id)))) continue;
    try {
      const result = await syncStoreProducts(deps, app);
      if (result.google.done + result.google.failed + result.apple.done + result.apple.failed > 0) report.apps += 1;
      report.done += result.google.done + result.apple.done;
      report.failed += result.google.failed + result.apple.failed;
    } catch (error) {
      console.error("[store products]", app.id, error instanceof Error ? error.message : String(error));
    }
  }
  return report;
}
