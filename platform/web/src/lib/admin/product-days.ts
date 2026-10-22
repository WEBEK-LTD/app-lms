import type { DataStore } from "../data/store";
import type { ProductDay } from "../data/types";
import { demoClientId } from "../demo/apps";
import { accountState } from "../license/status";
import { clientsByState, withoutDemo } from "./overview";

/**
 * 78.2 The daily job's snapshot for Admin › Product (`product_days`): the
 * clients by state and which of them have a plan running, the apps, and the
 * apps that have been live. Who had a plan when can't be worked out again
 * later (a license's end date moves on with each renewal), so it is kept
 * each day; the demo apps' account isn't counted. Saved again the same day,
 * it replaces that day's.
 */
export async function recordProductDay(store: DataStore, now: Date): Promise<ProductDay> {
  const [allRows, live, demoId] = await Promise.all([store.listClients({ filter: "all", now }), store.listMilestones({ kinds: ["store_live"] }), demoClientId(store)]);
  const { rows } = withoutDemo(allRows, [], demoId);
  const states = clientsByState(rows, now);
  const day: ProductDay = {
    day: now.toISOString().slice(0, 10),
    clients: rows.length,
    ...states,
    apps: rows.reduce((sum, row) => sum + row.apps.filter((entry) => entry.app).length, 0),
    appsLive: new Set(live.filter((m) => m.clientId !== demoId).map((m) => m.ref)).size,
    activeClientIds: rows.filter((row) => accountState(row.client, row.license, now) === "active").map((row) => row.client.id).sort(),
  };
  await store.saveProductDay(day, now);
  return day;
}
