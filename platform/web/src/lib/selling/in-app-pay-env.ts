import "server-only";
import type { DataStore } from "../data/store";
import { appUrl, encryptionKey, licenseRefreshTestUrl } from "../env";
import type { PlaceDeps } from "./in-app-pay";

/** 134 How the server reaches the stores' WordPress sites for payments in the app (tests: LICENSE_REFRESH_TEST_URL's fake site). */
export function inAppPayDeps(store: DataStore, now: Date = new Date()): PlaceDeps {
  return { store, key: encryptionKey(), now, baseUrl: appUrl(), site: { testSiteUrl: licenseRefreshTestUrl() } };
}
