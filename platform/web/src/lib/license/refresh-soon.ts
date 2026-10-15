import { after } from "next/server";
import { getStore } from "../data";
import { encryptionKey } from "../env";
import { refreshSites } from "./refresh";

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
      await refreshSites({ store: await getStore(), key: encryptionKey() }, ids);
    } catch (error) {
      console.error("[license] couldn't ask the site to check its license", error);
    }
  });
}
