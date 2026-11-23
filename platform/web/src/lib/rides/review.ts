import type { DataStore } from "../data/store";
import { randomToken } from "../crypto/tokens";
import type { App, Courier, DeliverySettings, HostedUser, Ride } from "../data/types";
import { isReviewCourier, isReviewUser, REVIEW_COURIER_NAME } from "../delivery/review";
import { fareCents } from "./fares";
import { SAMPLE_CAR, SAMPLE_DROPOFF, SAMPLE_FALLBACK_CENTS, SAMPLE_KM, SAMPLE_MINUTES, SAMPLE_NOTE, SAMPLE_PICKUP, SAMPLE_RIDER_NAME } from "./sample";
import { rideStage } from "./service";
import { EMPTY_DRIVER, offeredTypes, ridesSettingsOf } from "./settings";

export { SAMPLE_RIDER_NAME };

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
  const driver = { ...EMPTY_DRIVER, vehicleTypeId: type?.id ?? null, carModel: SAMPLE_CAR, carColor: null, plate: "REVIEW" };
  const made = await store.createCourier({ appId: app.id, name: REVIEW_COURIER_NAME, phone: who.phone, email: who.email, vehicle: null, active: true, driver }, now);
  return made.ok ? made.courier : store.findCourier(app.id, who);
}

/**
 * A sample ride offered to the review driver when they are online with no
 * ride (in the drivers' app the reviewers have no riders' app to ask for
 * one): from the review account, paid by card, offered for the company's
 * usual time. 220 At the driver's vehicle type's fares for 3 km and 10
 * minutes (E£0.00 before, its fares all zero), else 50 of the company's
 * currency; left out of the drivers' statements.
 */
export async function createSampleRide(store: DataStore, app: App, settings: DeliverySettings, driver: Courier, user: HostedUser, now: Date): Promise<Ride> {
  const rides = ridesSettingsOf(settings);
  const type = driver.driver?.vehicleTypeId ? await store.getVehicleType(app.id, driver.driver.vehicleTypeId) : null;
  const fares = type
    ? { baseCents: type.baseCents, perKmCents: type.perKmCents, perMinuteCents: type.perMinuteCents, minCents: type.minCents, waitPerMinuteCents: type.waitPerMinuteCents }
    : { baseCents: 0, perKmCents: 0, perMinuteCents: 0, minCents: 0, waitPerMinuteCents: 0 };
  const quoted = fareCents(fares, SAMPLE_KM, SAMPLE_MINUTES);
  // Without fares, one set price (upfront, so the end of the ride keeps it).
  const priced = quoted > 0 ? fares : { ...fares, baseCents: SAMPLE_FALLBACK_CENTS, minCents: SAMPLE_FALLBACK_CENTS };
  return store.createRide({
    appId: app.id,
    userId: user.id,
    riderName: SAMPLE_RIDER_NAME,
    riderPhone: user.phone,
    vehicleTypeId: type?.id ?? null,
    vehicleTypeName: type?.name ?? "Car",
    vehicleTypeIcon: type?.icon ?? "directions_car",
    fares: priced,
    fareMode: "upfront",
    pickup: { address: SAMPLE_PICKUP, details: SAMPLE_NOTE, lat: null, lng: null },
    dropoff: { address: SAMPLE_DROPOFF, details: null, lat: null, lng: null },
    scheduledAt: null,
    estimateKm: SAMPLE_KM,
    estimateMinutes: SAMPLE_MINUTES,
    quotedCents: quoted > 0 ? quoted : SAMPLE_FALLBACK_CENTS,
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
