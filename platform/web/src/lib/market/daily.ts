import type { DataStore } from "../data/store";
import { deliverySettingsOf } from "../delivery/settings";
import { clubDue } from "./offers";
import { remindClubRenewals, type ClubNotifyDeps } from "./club-notify";
import { releaseScheduled } from "./flow";
import { marketTimezone } from "./settings";

/**
 * 115 The marketplace's daily work (the daily job): 115.62 the club's
 * renewal reminders (3 days before the end and on the last day, each once,
 * with a payment link), memberships whose paid period ended expire (D6:
 * nothing is charged by itself; renewals are counted), vendors' web
 * sign-ins past their time are forgotten, and orders for later whose
 * preparation is due reach their vendor (the frequent job does this too,
 * closer to the time).
 */
export async function runMarketDaily(
  store: DataStore,
  now: Date,
  deps: Omit<ClubNotifyDeps, "store" | "now"> = { platformUrl: "" },
): Promise<{ apps: number; expired: number; renewals: number; reminded: number; released: number }> {
  await store.purgeVendorWeb(now);
  let apps = 0;
  let expired = 0;
  let renewals = 0;
  let reminded = 0;
  let released = 0;
  for (const app of await store.listApps()) {
    if (app.connector?.kind !== "restaurants") continue;
    apps++;
    const zone = marketTimezone(deliverySettingsOf(await store.getDeliverySettings(app.id)));
    reminded += await remindClubRenewals({ ...deps, store, now }, app, zone);
    const due = await clubDue(store, app.id, now);
    expired += due.expired;
    renewals += due.renewals.length;
    released += await releaseScheduled(store, app.id, now);
  }
  return { apps, expired, renewals, reminded, released };
}
