import { after } from "next/server";
import { getStore } from "../data";
import { encryptionKey, licenseRefreshTestUrl } from "../env";
import type { Plan } from "../plans";
import { refreshPlanSites, refreshSites } from "./refresh";

/**
 * 31 After the owner's save has answered, asks the WordPress sites of these
 * apps to check their license now (lib/license/refresh.ts). The save never
 * waits for it and never fails because of it. Called by every dashboard and
 * admin action that changes what the license status carries (the app type,
 * sign-in choices, the plan or the account's status) or publishes pages.
 */
export function refreshSitesSoon(appIds: readonly (string | null | undefined)[]): void {
  const ids = appIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return;
  after(async () => {
    try {
      await refreshSites({ store: await getStore(), key: encryptionKey(), testSiteUrl: licenseRefreshTestUrl() }, ids);
    } catch (error) {
      console.error("[license] couldn't ask the site to check its license", error);
    }
  });
}

/**
 * 47 After the team's edit of what a plan includes has answered, asks every
 * WordPress site on that plan to check its license, in batches
 * (refreshPlanSites). Sites it doesn't reach in time get it at their next check.
 */
export function refreshPlanSitesSoon(plan: Plan): void {
  after(async () => {
    try {
      const result = await refreshPlanSites({ store: await getStore(), key: encryptionKey(), testSiteUrl: licenseRefreshTestUrl() }, plan);
      if (result.left > 0) console.info(`[license] ${plan}: ${result.left} of ${result.apps} WordPress sites get the plan's change at their next check`);
    } catch (error) {
      console.error("[license] couldn't ask the plan's sites to check their license", error);
    }
  });
}
