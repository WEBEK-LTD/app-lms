import { formatCents } from "../catalog/money";
import type { Courier, Ride, RidePatch, RideStage, RidesSettings } from "../data/types";
import { isReviewCourier, reviewUserId } from "../delivery/review";
import { notifyDeps, settingsOf, type FlowDeps } from "../delivery/flow";
import { commissionOf, exactKm, finalFare, located, stageAt } from "./fares";
import { tellDriver, tellRider } from "./notify";
import { driverMayHave } from "./review";
import { DRIVER_ACTIVE, MATCH_FRESH_MINUTES, rideStage, RIDER_CANCELLABLE } from "./service";
import { ridesSettingsOf } from "./settings";
import { publishOffer, publishRide } from "../taxi/publish";

/**
 * 105.2 How a ride moves, whoever moves it (the rider, a driver, the company
 * on the dashboard, the payment, time): each change is made only while the
 * ride is still where the mover saw it, so a ride offered to one driver is
 * accepted once, and the people it concerns are told.
 *
 * Matching (`RidesSettings.matching` `nearest`): the ride is offered to one
 * online driver of its vehicle type at a time, nearest to the pickup first,
 * each for `offerSeconds`; one who lets it go, or lets the time run out, is
 * not asked again. Time moves rides on when anyone looks at them (the rider,
 * a driver) and every minute (lib/rides/tick.ts): an offer that ran out goes
 * to the next driver, a scheduled ride starts looking 15 minutes before its
 * time, and a ride nobody took in `SEARCH_MINUTES` ends as `no_driver`.
 */

/** A ride nobody takes in this long ends as `no_driver` (nearest matching). */
export const SEARCH_MINUTES = 5;
/** A scheduled ride starts looking for a driver this long before its time. */
export const SCHEDULE_LEAD_MINUTES = 15;

export type RideMoveResult = { ok: true; ride: Ride } | { ok: false; reason: "changed" };

export async function ridesOf(deps: FlowDeps): Promise<{ settings: Awaited<ReturnType<typeof settingsOf>>; rides: RidesSettings }> {
  const settings = await settingsOf(deps);
  return { settings, rides: ridesSettingsOf(settings) };
}

async function move(deps: FlowDeps, ride: Ride, patch: RidePatch & { status: Ride["status"] }, by: RideStage["by"], note: string | null = null, expect: { offeredTo?: number | null; driverId?: number | null } = {}): Promise<RideMoveResult> {
  const timeline = patch.status === ride.status && !note ? ride.timeline : [...ride.timeline, rideStage(patch.status, deps.now, by, note)];
  const full: RidePatch = { ...patch, timeline, updatedAt: deps.now };
  if (!(await deps.store.updateRide(deps.app.id, ride.id, full, { statuses: [ride.status], ...expect }))) return { ok: false, reason: "changed" };
  const moved = { ...ride, ...full } as Ride;
  // 105.9 A live taxi app's rider and driver see the change at once.
  await publishRide(deps, moved);
  return { ok: true, ride: moved };
}

/** The drivers busy now: with a ride that isn't over, or offered one that is still waiting for their answer. */
async function busyDrivers(deps: FlowDeps): Promise<Set<number>> {
  const { items } = await deps.store.listRides({ appId: deps.app.id, statuses: ["searching", ...DRIVER_ACTIVE], order: "oldest", offset: 0, limit: 2000 });
  const busy = new Set<number>();
  for (const r of items) {
    if (r.driverId !== null && DRIVER_ACTIVE.includes(r.status)) busy.add(r.driverId);
    if (r.offeredTo !== null && r.offerExpiresAt && r.offerExpiresAt.getTime() > deps.now.getTime()) busy.add(r.offeredTo);
  }
  return busy;
}

/**
 * The drivers who may be offered the ride, nearest first: active, online,
 * of its vehicle type, with a recent position within the company's distance
 * of the pickup, free, and not one who let it go. The review account's ride
 * goes to the review driver, wherever they are.
 */
export async function candidatesFor(deps: FlowDeps, ride: Ride, rides: RidesSettings): Promise<{ driver: Courier; km: number | null }[]> {
  const [all, busy, reviewId] = await Promise.all([deps.store.listCouriers(deps.app.id), busyDrivers(deps), reviewUserId(deps.store, deps.app)]);
  const fresh = deps.now.getTime() - MATCH_FRESH_MINUTES * 60_000;
  const found: { driver: Courier; km: number | null }[] = [];
  for (const driver of all) {
    if (!driver.active || !driver.onDuty || !driver.driver || busy.has(driver.id) || ride.declinedBy.includes(driver.id)) continue;
    if (!driverMayHave(deps.app, driver, ride, reviewId)) continue;
    if (isReviewCourier(deps.app, driver)) {
      found.push({ driver, km: null });
      continue;
    }
    if (driver.driver.vehicleTypeId !== ride.vehicleTypeId) continue;
    if (driver.lat === null || driver.lng === null || !driver.locatedAt || driver.locatedAt.getTime() < fresh || !located(ride.pickup)) continue;
    const km = exactKm(ride.pickup, { lat: driver.lat, lng: driver.lng });
    if (km <= rides.matchRadiusKm) found.push({ driver, km: Math.round(km * 10) / 10 });
  }
  return found.sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || a.driver.id - b.driver.id);
}

/** Offers a searching ride to the next driver; ends it as `no_driver` when nobody took it in time. */
export async function offerNext(deps: FlowDeps, ride: Ride): Promise<Ride> {
  if (ride.status !== "searching" || ride.offeredTo !== null) return ride;
  const { rides } = await ridesOf(deps);
  if (rides.matching === "dispatch") return ride;
  const [next] = await candidatesFor(deps, ride, rides);
  if (next) {
    const patch: RidePatch = { offeredTo: next.driver.id, offerExpiresAt: new Date(deps.now.getTime() + rides.offerSeconds * 1000), updatedAt: deps.now };
    if (!(await deps.store.updateRide(deps.app.id, ride.id, patch, { statuses: ["searching"], offeredTo: null }))) return (await deps.store.getRide(deps.app.id, ride.id)) ?? ride;
    const offered = { ...ride, ...patch } as Ride;
    await publishOffer(deps, offered, next.driver.id);
    await tellDriver(notifyDeps(deps), offered, next.driver, "offer");
    return offered;
  }
  const since = ride.searchingSince ?? ride.createdAt;
  if (deps.now.getTime() - since.getTime() < SEARCH_MINUTES * 60_000) return ride;
  const ended = await move(deps, ride, { status: "no_driver", offeredTo: null, offerExpiresAt: null, shareToken: null }, "system", null, { offeredTo: null });
  if (!ended.ok) return (await deps.store.getRide(deps.app.id, ride.id)) ?? ride;
  await releaseFee(deps, ended.ride);
  await tellRider(notifyDeps(deps), ended.ride);
  return ended.ride;
}

/** Moves a ride on with time: its time came, its offer ran out, or nobody took it. */
export async function advanceRide(deps: FlowDeps, ride: Ride): Promise<Ride> {
  if (ride.status === "scheduled") {
    if (!ride.scheduledAt || ride.scheduledAt.getTime() - SCHEDULE_LEAD_MINUTES * 60_000 > deps.now.getTime()) return ride;
    const moved = await move(deps, ride, { status: "searching", searchingSince: deps.now }, "system");
    if (!moved.ok) return (await deps.store.getRide(deps.app.id, ride.id)) ?? ride;
    return offerNext(deps, moved.ride);
  }
  if (ride.status !== "searching") return ride;
  if (ride.offeredTo !== null && ride.offerExpiresAt && ride.offerExpiresAt.getTime() <= deps.now.getTime()) {
    const patch: RidePatch = { offeredTo: null, offerExpiresAt: null, declinedBy: [...ride.declinedBy, ride.offeredTo], updatedAt: deps.now };
    if (!(await deps.store.updateRide(deps.app.id, ride.id, patch, { statuses: ["searching"], offeredTo: ride.offeredTo }))) return (await deps.store.getRide(deps.app.id, ride.id)) ?? ride;
    return offerNext(deps, { ...ride, ...patch } as Ride);
  }
  return offerNext(deps, ride);
}

/** The driver accepts the ride offered to them, while the offer stands. */
export async function acceptRide(deps: FlowDeps, ride: Ride, driver: Courier): Promise<RideMoveResult> {
  if (ride.status !== "searching" || ride.offeredTo !== driver.id || !ride.offerExpiresAt || ride.offerExpiresAt.getTime() <= deps.now.getTime()) return { ok: false, reason: "changed" };
  const moved = await move(deps, ride, { status: "accepted", driverId: driver.id, driverName: driver.name, offeredTo: null, offerExpiresAt: null }, "driver", null, { offeredTo: driver.id });
  if (moved.ok) await tellRider(notifyDeps(deps), moved.ride, { driver });
  return moved;
}

/** The driver lets the ride offered to them go to the next driver. */
export async function declineRide(deps: FlowDeps, ride: Ride, driver: Courier): Promise<void> {
  if (ride.status !== "searching" || ride.offeredTo !== driver.id) return;
  const patch: RidePatch = { offeredTo: null, offerExpiresAt: null, declinedBy: [...ride.declinedBy, driver.id], updatedAt: deps.now };
  if (await deps.store.updateRide(deps.app.id, ride.id, patch, { statuses: ["searching"], offeredTo: driver.id })) await offerNext(deps, { ...ride, ...patch } as Ride);
}

/** The company gives the ride to a driver (Dashboard › Rides): a searching one, or one not started from another driver. */
export async function assignRide(deps: FlowDeps, ride: Ride, driver: Courier): Promise<RideMoveResult> {
  if (!["searching", "accepted", "arrived"].includes(ride.status)) return { ok: false, reason: "changed" };
  const before = ride.driverId;
  const moved = await move(deps, ride, { status: "accepted", driverId: driver.id, driverName: driver.name, offeredTo: null, offerExpiresAt: null }, "company", null, { driverId: ride.driverId });
  if (!moved.ok) return moved;
  const n = notifyDeps(deps);
  await tellDriver(n, moved.ride, driver, "given");
  if (before !== driver.id) await tellRider(n, moved.ride, { driver });
  return moved;
}

/** Gives the unpaid fee this ride carried back to the ride it came from: this one won't collect it. */
async function releaseFee(deps: FlowDeps, ride: Ride): Promise<void> {
  if (ride.previousFeeRideId === null || ride.previousFeeCents === 0) return;
  const from = await deps.store.getRide(deps.app.id, ride.previousFeeRideId);
  if (from && from.feeCarriedTo === ride.id) await deps.store.updateRide(deps.app.id, from.id, { feeCarriedTo: null, updatedAt: deps.now });
}

/** The fee this ride carried is paid with it. */
export async function settleFee(deps: FlowDeps, ride: Ride): Promise<void> {
  if (ride.previousFeeRideId === null || ride.previousFeeCents === 0) return;
  const from = await deps.store.getRide(deps.app.id, ride.previousFeeRideId);
  if (from && from.feeCarriedTo === ride.id && from.paymentStatus === "unpaid") await deps.store.updateRide(deps.app.id, from.id, { paymentStatus: "paid", updatedAt: deps.now });
}

/** The driver reached the pickup. */
export async function arriveRide(deps: FlowDeps, ride: Ride, by: RideStage["by"]): Promise<RideMoveResult> {
  if (ride.status !== "accepted") return { ok: false, reason: "changed" };
  const moved = await move(deps, ride, { status: "arrived" }, by, null, { driverId: ride.driverId });
  if (moved.ok) await tellRider(notifyDeps(deps), moved.ride);
  return moved;
}

/** The rider is in: the ride starts. */
export async function startRide(deps: FlowDeps, ride: Ride, by: RideStage["by"]): Promise<RideMoveResult> {
  if (ride.status !== "arrived") return { ok: false, reason: "changed" };
  return move(deps, ride, { status: "in_progress", meterKm: 0 }, by, null, { driverId: ride.driverId });
}

/** The ride ends at the drop-off: the final fare, the company's share; a cash ride is paid. */
export async function completeRide(deps: FlowDeps, ride: Ride, driver: Courier | null, by: RideStage["by"]): Promise<RideMoveResult> {
  if (ride.status !== "in_progress") return { ok: false, reason: "changed" };
  const { rides } = await ridesOf(deps);
  const fare = finalFare(ride, rides, deps.now);
  const bp = driver?.driver?.commissionBp ?? rides.commissionBp;
  const paid = ride.paymentMethod === "cash" || fare.finalCents === 0;
  const moved = await move(
    deps,
    ride,
    {
      status: "completed",
      finalCents: fare.finalCents,
      discountCents: fare.discountCents,
      rideMinutes: fare.rideMinutes,
      waitMinutes: fare.waitMinutes,
      commissionBp: bp,
      commissionCents: commissionOf(fare.finalCents, ride.previousFeeCents, bp),
      paymentStatus: paid ? "paid" : "unpaid",
      shareToken: null,
    },
    by,
    null,
    { driverId: ride.driverId },
  );
  if (!moved.ok) return moved;
  if (paid) await settleFee(deps, moved.ride);
  await tellRider(notifyDeps(deps), moved.ride, { fare: formatCents(fare.finalCents, ride.currency) });
  return moved;
}

/** Whether the rider pays the company's fee for cancelling now: a driver accepted more than the free minutes ago. */
export function riderFeeCents(ride: Ride, rides: RidesSettings, now: Date): number {
  if (rides.cancelFeeCents <= 0 || (ride.status !== "accepted" && ride.status !== "arrived")) return 0;
  const accepted = stageAt(ride, "accepted");
  return accepted && now.getTime() - accepted.getTime() > rides.cancelFreeMinutes * 60_000 ? rides.cancelFeeCents : 0;
}

/** The rider cancels before the ride starts; after the free minutes the company's fee is charged, added to their next ride. */
export async function cancelByRider(deps: FlowDeps, ride: Ride, reason: string | null): Promise<RideMoveResult> {
  if (!RIDER_CANCELLABLE.includes(ride.status)) return { ok: false, reason: "changed" };
  const { rides } = await ridesOf(deps);
  const feeCents = riderFeeCents(ride, rides, deps.now);
  const moved = await move(deps, ride, { status: "cancelled", cancellation: { by: "rider", reason, feeCents }, offeredTo: null, offerExpiresAt: null, shareToken: null, paymentStatus: "unpaid" }, "rider");
  if (!moved.ok) return moved;
  await releaseFee(deps, moved.ride);
  const driverId = ride.driverId ?? ride.offeredTo;
  if (driverId !== null) {
    const driver = await deps.store.getCourier(deps.app.id, driverId);
    if (driver) await tellDriver(notifyDeps(deps), moved.ride, driver, "cancelled");
  }
  return moved;
}

/**
 * The driver cancels before the ride starts: for a rider who didn't show up
 * (once they waited the company's minutes; the rider is charged the fee),
 * or for another reason, when the ride looks for another driver.
 */
export async function cancelByDriver(deps: FlowDeps, ride: Ride, driver: Courier, reason: "rider_no_show" | "other", note: string | null): Promise<RideMoveResult | { ok: false; reason: "too_soon" }> {
  if (ride.driverId !== driver.id || (ride.status !== "accepted" && ride.status !== "arrived")) return { ok: false, reason: "changed" };
  const { rides } = await ridesOf(deps);
  if (reason === "rider_no_show") {
    const arrived = stageAt(ride, "arrived");
    if (ride.status !== "arrived" || !arrived || deps.now.getTime() - arrived.getTime() < rides.noShowMinutes * 60_000) return { ok: false, reason: "too_soon" };
    const moved = await move(deps, ride, { status: "cancelled", cancellation: { by: "driver", reason, feeCents: rides.cancelFeeCents }, shareToken: null, paymentStatus: "unpaid" }, "driver", note, { driverId: driver.id });
    if (!moved.ok) return moved;
    await releaseFee(deps, moved.ride);
    await tellRider(notifyDeps(deps), moved.ride);
    return moved;
  }
  const moved = await move(
    deps,
    ride,
    { status: "searching", driverId: null, driverName: null, declinedBy: [...ride.declinedBy, driver.id], searchingSince: deps.now, offeredTo: null, offerExpiresAt: null },
    "driver",
    note,
    { driverId: driver.id },
  );
  if (!moved.ok) return moved;
  await tellRider(notifyDeps(deps), moved.ride, { looking: true });
  return { ok: true, ride: await offerNext(deps, moved.ride) };
}

/** The company cancels a ride that isn't over (no fee). */
export async function cancelByCompany(deps: FlowDeps, ride: Ride, note: string | null): Promise<RideMoveResult> {
  if (!["scheduled", "searching", "accepted", "arrived", "in_progress"].includes(ride.status)) return { ok: false, reason: "changed" };
  const moved = await move(deps, ride, { status: "cancelled", cancellation: { by: "company", reason: note, feeCents: 0 }, offeredTo: null, offerExpiresAt: null, shareToken: null }, "company", note);
  if (!moved.ok) return moved;
  await releaseFee(deps, moved.ride);
  const n = notifyDeps(deps);
  await tellRider(n, moved.ride);
  const driverId = ride.driverId ?? ride.offeredTo;
  if (driverId !== null) {
    const driver = await deps.store.getCourier(deps.app.id, driverId);
    if (driver) await tellDriver(n, moved.ride, driver, "cancelled");
  }
  return moved;
}
