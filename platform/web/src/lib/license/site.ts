import { usesPlugin } from "../app/label";
import type { DataStore } from "../data/store";
import type { License } from "../data/types";

/**
 * 75 Whether the license's app may use its key on a WordPress site: an app on
 * WordPress, one waiting for the site our team sets up, or a license whose
 * app doesn't exist yet. Apps on the hosted API, a store platform or their
 * own API never use the key, so the platform refuses it from any site.
 */
export async function licenseUsesSite(store: DataStore, license: License): Promise<boolean> {
  if (!license.appId) return true;
  return usesPlugin(await store.getAppById(license.appId));
}

export const NOT_FOR_SITE_MESSAGE =
  "This app doesn't run on a WordPress site, so its license isn't used on one. To move the app to WordPress, choose WordPress in your Yallapp dashboard (App setup › Website) first.";
