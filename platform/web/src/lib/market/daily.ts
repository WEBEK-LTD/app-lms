import type { DataStore } from "../data/store";
import { clubDue } from "./offers";
import { releaseScheduled } from "./flow";

/**
 * 115 The marketplace's daily work (the daily job): club memberships whose
 * paid period ended expire (renewals are counted for the payments layer),
 * vendors' web sign-ins past their time are forgotten, and orders for later
 * whose preparation is due reach their vendor (the frequent job does this
 * too, closer to the time).
 */
export async function runMarketDaily(store: DataStore, now: Date): Promise<{ apps: number; expired: number; renewals: number; released: number }> {
  await store.purgeVendorWeb(now);
  let apps = 0;
  let expired = 0;
  let renewals = 0;
  let released = 0;
  for (const app of await store.listApps()) {
    if (app.connector?.kind !== "restaurants") continue;
    apps++;
    const due = await clubDue(store, app.id, now);
    expired += due.expired;
    renewals += due.renewals.length;
    released += await releaseScheduled(store, app.id, now);
  }
  return { apps, expired, renewals, released };
}
