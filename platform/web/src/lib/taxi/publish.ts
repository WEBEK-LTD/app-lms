import { encryptionKey } from "../env";
import type { Ride } from "../data/types";
import type { FlowDeps } from "../delivery/flow";
import { deliverySettingsOf } from "../delivery/settings";
import { serviceAccountOf } from "../hosted/notify";
import { driverKey, liveDatabase, rideNode, type LiveDatabase } from "./live";
import { isTaxiApp, taxiSettingsOf } from "./settings";

/**
 * 105.9 What Yallapp writes to a live taxi app's database as rides move: a
 * ride's stage (`rides/<id>`, read by its rider and driver) and the ride
 * offered to a driver (`offers/<driver_key>`). The apps take a change there
 * as the sign to ask the hosted API again, so a write that fails only makes
 * them wait for their next look; it never stops the ride.
 */

async function databaseOf(deps: FlowDeps): Promise<LiveDatabase | null> {
  if (!isTaxiApp(deps.app)) return null;
  const taxi = taxiSettingsOf(deliverySettingsOf(await deps.store.getDeliverySettings(deps.app.id)));
  if (!taxi.databaseUrl) return null;
  let account = deps.account;
  if (account === undefined) {
    try {
      account = serviceAccountOf(deps.app, encryptionKey());
    } catch {
      account = null;
    }
  }
  return liveDatabase(deps.app, taxi, account ?? null);
}

async function quietly(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (e) {
    console.error(`[taxi] a live write failed: ${e instanceof Error ? e.message : "unknown error"}`);
  }
}

/** The ride's stage, for its rider's and driver's apps. */
export async function publishRide(deps: FlowDeps, ride: Ride): Promise<void> {
  const database = await databaseOf(deps);
  if (database) await quietly(() => database.put(`rides/${ride.id}`, rideNode(ride, deps.now)));
}

/** A ride offered to a driver, until when. */
export async function publishOffer(deps: FlowDeps, ride: Ride, driverId: number): Promise<void> {
  const database = await databaseOf(deps);
  if (database) await quietly(() => database.put(`offers/${driverKey(driverId)}`, { ride_id: ride.id, expires_at: ride.offerExpiresAt?.getTime() ?? null, at: deps.now.getTime() }));
}
