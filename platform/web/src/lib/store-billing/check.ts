import type { DataStore } from "../data/store";
import type { App, StoreBillingSettings } from "../data/types";
import { checkGoogleBilling, googleBillingToken } from "./google";
import { storesOf } from "./products";
import { appleCredentials, googleKey } from "./keys";
import { appleAppOf } from "./sync";

/**
 * 100.2 "Check" on In-app purchases: whether each store's key (from the
 * Publishing step) may manage the app's products. Google: a read of its
 * one-time products. Apple: the app found by its bundle ID, and its App Store
 * Server Notifications pointed at Yallapp. The results stay on the app.
 */

const codeOf = (error: unknown, fallback: string) => (error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : fallback);

export async function checkStoreKeys(deps: { store: Pick<DataStore, "updateApp">; key: Buffer; now: Date; fetcher?: typeof fetch }, app: App): Promise<{ ok: boolean; google: string | null; apple: string | null }> {
  const fetcher = deps.fetcher ?? fetch;
  const stores = storesOf(app);
  const at = deps.now.toISOString();
  let google: string | null = null;
  let apple: string | null = null;
  if (stores.google) {
    try {
      const token = await googleBillingToken(fetcher, googleKey(app, deps.key), deps.now);
      await checkGoogleBilling({ fetcher, token, packageName: app.androidPackage ?? "" });
    } catch (error) {
      google = codeOf(error, "google_failed");
    }
  }
  if (stores.apple) {
    try {
      await appleAppOf(deps, app, fetcher, appleCredentials(app, deps.key));
    } catch (error) {
      apple = codeOf(error, "apple_failed");
    }
  }
  const settings: StoreBillingSettings = {
    enabled: false,
    ...app.storeBilling,
    ...(stores.google ? { googleCheck: { at, error: google } } : {}),
    ...(stores.apple ? { appleCheck: { at, error: apple } } : {}),
  };
  await deps.store.updateApp(app.id, { storeBilling: settings }, deps.now);
  return { ok: google === null && apple === null, google, apple };
}
