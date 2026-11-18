import type { App } from "../../data/types";
import type { DataStore } from "../../data/store";
import { deliverySettingsOf } from "../../delivery/settings";
import { offeredTypes } from "../../rides/settings";
import type { RideClasses } from "../../studio/ride-classes";

/**
 * 178 The company's vehicle types offered to riders (Dashboard › Vehicle
 * types, in its order) and its currency (Ride settings), for a template's car
 * classes (lib/studio/ride-classes.ts); null for an app without rides.
 */
export async function rideClassesOf(app: Pick<App, "id" | "appType">, store: Pick<DataStore, "listVehicleTypes" | "getDeliverySettings">): Promise<RideClasses | null> {
  if (app.appType !== "rides") return null;
  const [types, settings] = await Promise.all([store.listVehicleTypes(app.id), store.getDeliverySettings(app.id)]);
  const list = offeredTypes(types)
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map((t) => ({ id: t.id, name: t.name, seats: t.seats, minCents: t.minCents, ...(t.sample ? { sample: true } : {}) }));
  return { list, currency: deliverySettingsOf(settings).currency };
}
