import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import type { FlowDeps } from "../delivery/flow";
import { notifyDeps } from "../delivery/flow";
import { clubDue } from "./offers";
import { releaseScheduled } from "./flow";
import { expireUnpaidMarketOrders } from "./expire";
import { backfillSearchNames } from "./search-backfill";
import { remindClubRenewals } from "./notify";

/** How the marketplace's jobs reach phones: tests pass a fake push and account; left out, each app's own. */
export type MarketJobPush = Pick<FlowDeps, "send" | "account">;

async function marketplaces(store: DataStore): Promise<App[]> {
  return (await store.listApps()).filter((app) => app.connector?.kind === "restaurants");
}

/**
 * 115 The marketplace's daily work (the daily job): club memberships whose
 * paid period ended expire (renewals are counted for the payments layer),
 * 115.22 members are reminded 3 days before their plan's period ends and on
 * its last day (`club_renewal`, once each; nothing is charged), vendors' web
 * sign-ins past their time are forgotten, and orders for later still due are
 * released (115.21 the frequent job releases them on time; this only
 * catches up after a gap, and each order is released once).
 */
export async function runMarketDaily(store: DataStore, now: Date, push: MarketJobPush = {}): Promise<{ apps: number; expired: number; renewals: number; reminded: number; released: number }> {
  await store.purgeVendorWeb(now);
  // 115.29 Older products' search names, a few batches a day until none is left.
  await backfillSearchNames(store).catch((e: unknown) => console.error(`[market] search names: ${e instanceof Error ? e.message : String(e)}`));
  let apps = 0;
  let expired = 0;
  let renewals = 0;
  let reminded = 0;
  let released = 0;
  for (const app of await marketplaces(store)) {
    apps++;
    const due = await clubDue(store, app.id, now);
    expired += due.expired;
    renewals += due.renewals.length;
    reminded += await remindClubRenewals(notifyDeps({ store, app, now, ...push }), now).catch((e: unknown) => {
      console.error(`[market] club reminders: ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    });
    released += await releaseScheduled({ store, app, now, ...push });
  }
  return { apps, expired, renewals, reminded, released };
}

/**
 * 115.21 The marketplace's frequent work (the frequent job, every 5
 * minutes): orders for later reach their vendor when their preparation
 * should start (their time less the vendor's preparation), the vendor's staff
 * and the customer told. Two runs at once release and announce each order
 * once (lib/market/flow.ts `releaseScheduled`).
 */
export async function runMarketFrequent(store: DataStore, now: Date, push: MarketJobPush = {}): Promise<{ apps: number; released: number }> {
  let apps = 0;
  let released = 0;
  for (const app of await marketplaces(store)) {
    apps++;
    try {
      released += await releaseScheduled({ store, app, now, ...push });
      // 115.24 Online orders left unpaid give back their stock and coupon.
      await expireUnpaidMarketOrders(store, app.id, now);
    } catch (error) {
      // One app's trouble never stops the others' orders.
      console.error(`[market] orders for later of ${app.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { apps, released };
}
