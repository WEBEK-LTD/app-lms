import type { DataStore } from "../data/store";
import { randomToken } from "../crypto/tokens";
import type { App, Courier, DeliverySettings, HostedUser, Ride } from "../data/types";
import { isReviewCourier, isReviewUser, REVIEW_COURIER_NAME } from "../delivery/review";
import { rideStage } from "./service";
import { EMPTY_DRIVER, offeredTypes, ridesSettingsOf } from "./settings";

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

/**
 * A sample ride offered to the review driver when they are online with no
 * ride (in the drivers' app the reviewers have no riders' app to ask for
 * one): from the review account, paid by card, offered for the company's
 * usual time.
 */
export async function createSampleRide(store: DataStore, app: App, settings: DeliverySettings, driver: Courier, user: HostedUser, now: Date): Promise<Ride> {
  const rides = ridesSettingsOf(settings);
  const type = driver.driver?.vehicleTypeId ? await store.getVehicleType(app.id, driver.driver.vehicleTypeId) : null;
  return store.createRide({
    appId: app.id,
    userId: user.id,
    riderName: "App Review (sample)",
    riderPhone: user.phone,
    vehicleTypeId: type?.id ?? null,
    vehicleTypeName: type?.name ?? "Car",
    vehicleTypeIcon: type?.icon ?? "directions_car",
    fares: { baseCents: 0, perKmCents: 0, perMinuteCents: 0, minCents: 0, waitPerMinuteCents: 0 },
    fareMode: "upfront",
    pickup: { address: "Sample pickup, 1 Example Street", details: "Sample ride for the store review", lat: null, lng: null },
    dropoff: { address: "Sample drop-off, 2 Example Street", details: null, lat: null, lng: null },
    scheduledAt: null,
    estimateKm: 3,
    estimateMinutes: 10,
    quotedCents: 0,
    promoCode: null,
    discountCents: 0,
    previousFeeCents: 0,
    previousFeeRideId: null,
    finalCents: null,
    meterKm: 0,
    rideMinutes: null,
    waitMinutes: null,
    commissionBp: null,
    commissionCents: null,
    currency: settings.currency,
    paymentMethod: "card",
    paymentStatus: "paid",
    orderId: null,
    status: "searching",
    pin: rides.pin ? "1234" : null,
    notes: null,
    driverId: null,
    driverName: null,
    offeredTo: driver.id,
    offerExpiresAt: new Date(now.getTime() + rides.offerSeconds * 1000),
    declinedBy: [],
    searchingSince: now,
    cancellation: null,
    feeCarriedTo: null,
    shareToken: randomToken(18),
    rating: null,
    timeline: [rideStage("searching", now, "rider")],
    lang: null,
    createdAt: now,
    updatedAt: now,
  });
}
