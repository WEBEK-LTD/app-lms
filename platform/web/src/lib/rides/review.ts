import type { DataStore } from "../data/store";
import type { App, Courier, HostedUser, Ride } from "../data/types";
import { isReviewCourier, isReviewUser, REVIEW_COURIER_NAME } from "../delivery/review";
import { EMPTY_DRIVER, offeredTypes } from "./settings";

/**
 * 105.2 The store reviewers try both sides of a ride app with the app's
 * review number (or email) from App sign-in: as a rider they ask for rides;
 * as a driver ("App Review", made the first time they open the driver's
 * screens, with the company's first vehicle type) they get them. The review
 * account's rides are offered to the review driver only, wherever they are,
 * and the company's drivers never see them.
 */

/** Whether a driver may be offered this ride: the review driver the review account's only, the others never those. */
export function driverMayHave(app: Pick<App, "hostedSettings">, driver: Pick<Courier, "phone" | "email">, ride: Pick<Ride, "userId">, reviewId: number | null): boolean {
  const review = ride.userId !== null && ride.userId === reviewId;
  return isReviewCourier(app, driver) ? review : !review;
}

/** The review driver, made the first time the reviewers open the driver's screens. */
export async function reviewDriverFor(store: DataStore, app: App, user: HostedUser, now: Date): Promise<Courier | null> {
  if (!isReviewUser(app, user)) return null;
  const who = user.phone ? { phone: user.phone, email: null } : { phone: null, email: user.email?.toLowerCase() ?? null };
  const found = await store.findCourier(app.id, who);
  const type = offeredTypes(await store.listVehicleTypes(app.id))[0] ?? null;
  if (found) {
    // A review driver made before the company had a vehicle type gets its first one.
    if (type && !found.driver?.vehicleTypeId) {
      const driver = { ...EMPTY_DRIVER, ...(found.driver ?? {}), vehicleTypeId: type.id };
      await store.updateCourier(app.id, found.id, { driver }, now);
      return { ...found, driver };
    }
    return found;
  }
  const driver = { ...EMPTY_DRIVER, vehicleTypeId: type?.id ?? null, carModel: "Sample car", carColor: null, plate: "REVIEW" };
  const made = await store.createCourier({ appId: app.id, name: REVIEW_COURIER_NAME, phone: who.phone, email: who.email, vehicle: null, active: true, driver }, now);
  return made.ok ? made.courier : store.findCourier(app.id, who);
}
