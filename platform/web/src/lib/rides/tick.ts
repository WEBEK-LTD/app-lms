import type { DataStore } from "../data/store";
import type { sendPush } from "../hosted/push";
import { advanceRide, SCHEDULE_LEAD_MINUTES } from "./flow";

/**
 * 105.2 Rides moved on with time by the frequent job, for when nobody looks
 * at them (riders and drivers move them on whenever their apps ask): a
 * scheduled ride whose time came starts looking for a driver, an offer that
 * ran out goes to the next driver, and a ride nobody took ends.
 */

export async function runRideTicks(deps: { store: DataStore; now: Date; send?: typeof sendPush; limit?: number }): Promise<{ looked: number; moved: number }> {
  const due = await deps.store.listDueRides(new Date(deps.now.getTime() + SCHEDULE_LEAD_MINUTES * 60_000), deps.limit ?? 200);
  const apps = new Map<string, Awaited<ReturnType<DataStore["getAppById"]>>>();
  let moved = 0;
  for (const ride of due) {
    if (!apps.has(ride.appId)) apps.set(ride.appId, await deps.store.getAppById(ride.appId));
    const app = apps.get(ride.appId);
    if (!app || app.connector?.kind !== "rides") continue;
    try {
      const next = await advanceRide({ store: deps.store, app, now: deps.now, send: deps.send }, ride);
      if (next.status !== ride.status || next.offeredTo !== ride.offeredTo) moved += 1;
    } catch (error) {
      // One ride that can't move never stops the others.
      console.error("[rides] tick", ride.id, error instanceof Error ? error.message : String(error));
    }
  }
  return { looked: due.length, moved };
}
