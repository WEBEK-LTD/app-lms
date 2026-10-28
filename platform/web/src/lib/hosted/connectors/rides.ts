import { randomInt } from "node:crypto";
import { paymentsSetUp } from "../../catalog/settings";
import { centsToDecimal, formatCents } from "../../catalog/money";
import { randomToken } from "../../crypto/tokens";
import type { Courier, DeliverySettings, HostedUser, Ride, RidesSettings, VehicleType } from "../../data/types";
import { localToUtc, utcToLocal } from "../../bookings/time";
import { courierWho } from "../../delivery/service";
import { deliverySettingsOf } from "../../delivery/settings";
import { discountCents, exactKm, fareCents, located, meterStep, minutesFor, promoFor, roadKm, ROAD_FACTOR } from "../../rides/fares";
import { acceptRide, advanceRide, arriveRide, cancelByDriver, cancelByRider, candidatesFor, completeRide, declineRide, offerNext, startRide } from "../../rides/flow";
import { ridePayLink } from "../../rides/payment";
import { reviewDriverFor } from "../../rides/review";
import {
  DRIVER_ACTIVE,
  DRIVER_STEPS,
  driverJson,
  driverRideJson,
  readEstimateRequest,
  readRideRequest,
  RIDE_ACTIVE,
  RIDE_DONE,
  rideJson,
  ridesConfig,
  rideStage,
  vehicleTypeJson,
  type EstimateRequest,
} from "../../rides/service";
import { DEFAULT_RIDES_TIMEZONE, driverOf, offeredTypes, ridesSettingsOf } from "../../rides/settings";
import { platformSetting } from "../../settings/platform";
import { error, intParam } from "./common";
import type { DeliveryDeps } from "./delivery";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

export interface RidesDeps extends Omit<DeliveryDeps, "delivery"> {
  /** The plan has ride apps (default true). */
  rides?: boolean;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const rideNotFound = () => error(404, "not_found", "Ride not found.");
const notDriver = () => error(403, "not_driver", "This account isn't one of our drivers.");
const unavailable = () => error(503, "rides_unavailable", "We aren't taking rides in the app yet. Please try again later.");
const changed = () => error(409, "invalid_status", "This ride changed meanwhile. Pull to refresh.");
/** The driver's "done" list goes back this far. */
const DONE_DAYS = 30;
/** A completed ride may be rated for this long. */
const RATING_DAYS = 7;
/** At most one position every this many seconds is kept. */
const LOCATION_SECONDS = 3;
/** How far ahead a ride may be asked for. */
const SCHEDULE_MIN_MINUTES = 30;
const SCHEDULE_MAX_DAYS = 7;
/** Searching rides moved on when a driver looks for offers, at most this many. */
const ADVANCE_BATCH = 50;

/**
 * 105.2 Ride hailing: riders see the fare of each of the company's vehicle
 * types, ask for a ride now or later, follow the driver, cancel, pay (cash
 * to the driver, or by card on the company's payment page once it ends) and
 * rate the driver; the company's drivers (people it added by number, with
 * their car) go online, get the rides offered to them one at a time, nearest
 * first (lib/rides/flow.ts), move them on and see what they made.
 * Everything a driver does is checked against the driver the signed-in
 * person is.
 */
export class RidesConnector implements Connector {
  constructor(private readonly deps: RidesDeps) {}

  private async settings(): Promise<{ settings: DeliverySettings; rides: RidesSettings }> {
    const settings = deliverySettingsOf(await this.deps.store.getDeliverySettings(this.deps.app.id));
    return { settings, rides: ridesSettingsOf(settings) };
  }

  private async types(): Promise<VehicleType[]> {
    return offeredTypes(await this.deps.store.listVehicleTypes(this.deps.app.id));
  }

  private get canTakeCards(): boolean {
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  private flow(now: Date) {
    return { store: this.deps.store, app: this.deps.app, now };
  }

  async config() {
    const [{ settings, rides }, types, maps] = await Promise.all([this.settings(), this.types(), platformSetting(this.deps.store, "maps")]);
    return {
      rides: ridesConfig({ ...settings, card: settings.card && this.canTakeCards }, rides, types, maps?.value ?? null, this.deps.assetUrl),
      features: { orders: settings.card && this.canTakeCards },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const path = request.path;
    const mine = path[0] === "me" && path[1] === "rides";
    if (path[0] !== "rides" && path[0] !== "driver" && !mine) return null;
    if (this.deps.rides === false) return error(403, "feature_disabled", "Rides aren't available in this app right now.");
    const route = `${request.method} /${path.join("/")}`;
    switch (route) {
      case "POST /rides/estimate":
        return this.estimate(request);
      case "POST /rides":
        return this.ask(request);
      case "GET /me/rides":
        return this.myRides(request);
      case "GET /driver/me":
        return this.driverMe(request);
      case "PATCH /driver/me":
        return this.online(request);
      case "PUT /driver/location":
        return this.location(request);
      case "GET /driver/offers":
        return this.offers(request);
      case "GET /driver/rides":
        return this.driverRides(request);
      case "GET /driver/earnings":
        return this.earnings(request);
    }
    const id = path[2] && /^\d{1,15}$/.test(path[2]) ? Number(path[2]) : null;
    if (id !== null) {
      if (mine) {
        if (request.method === "GET" && path.length === 3) return this.myRide(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "cancel") return this.cancel(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "pay") return this.pay(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "rating") return this.rate(request, id);
      }
      if (path[0] === "driver" && path[1] === "rides") {
        if (request.method === "GET" && path.length === 3) return this.driverRide(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "accept") return this.accept(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "decline") return this.decline(request, id);
        if (request.method === "POST" && path.length === 4 && path[3] === "status") return this.step(request, id);
      }
    }
    return error(404, "not_found", "Not found.");
  }

  // The rider

  /** An unpaid cancellation fee of the rider's that no ride carries yet, the newest. */
  private async unpaidFee(user: HostedUser): Promise<Ride | null> {
    const { items } = await this.deps.store.listRides({ appId: this.deps.app.id, userId: user.id, statuses: ["cancelled"], order: "newest", offset: 0, limit: 20 });
    return items.find((r) => (r.cancellation?.feeCents ?? 0) > 0 && r.paymentStatus === "unpaid" && r.feeCarriedTo === null) ?? null;
  }

  /** The places, time and promo code checked, with what every vehicle type costs; or the error to answer with. */
  private async price(input: EstimateRequest, user: HostedUser | null, now: Date) {
    const [{ settings, rides }, types] = await Promise.all([this.settings(), this.types()]);
    if (types.length === 0) return { error: unavailable() };
    if (!located(input.pickup) || !located(input.dropoff)) return { error: error(400, "invalid_request", "Set both places on the map.") };
    if (rides.areas.length > 0 && !rides.areas.some((a) => exactKm(input.pickup as { lat: number; lng: number }, a) <= a.radiusKm)) {
      return { error: error(400, "outside_service_area", "We don't pick up there yet. Choose a pickup in our area.") };
    }
    if (input.scheduledAt) {
      if (!rides.scheduling) return { error: error(400, "invalid_request", "Rides can't be booked for later. Ask for one now.") };
      const ahead = input.scheduledAt.getTime() - now.getTime();
      if (ahead < SCHEDULE_MIN_MINUTES * 60_000 || ahead > SCHEDULE_MAX_DAYS * 86_400_000) {
        return { error: error(400, "invalid_request", `Choose a time from ${SCHEDULE_MIN_MINUTES} minutes to ${SCHEDULE_MAX_DAYS} days from now.`) };
      }
    }
    const promo = promoFor(rides, input.promoCode, now);
    if (input.promoCode) {
      const bad = () => ({ error: { status: 400, body: { code: "invalid_request", message: "This promo code isn't valid.", details: { field: "promo_code" } } } });
      if (!promo) return bad();
      const used = (statuses: Ride["status"][], userId?: number) =>
        this.deps.store.listRides({ appId: this.deps.app.id, promoCode: promo.code, statuses, ...(userId !== undefined ? { userId } : {}), order: "newest", offset: 0, limit: 1 });
      const live: Ride["status"][] = [...RIDE_ACTIVE, "completed"];
      if (user && (await used(live, user.id)).total > 0) return { error: { status: 400, body: { code: "invalid_request", message: "You already used this promo code.", details: { field: "promo_code" } } } };
      if (promo.maxRides !== null && (await used(live)).total >= promo.maxRides) return bad();
    }
    const previous = user ? await this.unpaidFee(user) : null;
    const previousFeeCents = previous?.cancellation?.feeCents ?? 0;
    const km = roadKm(input.pickup as { lat: number; lng: number }, input.dropoff as { lat: number; lng: number });
    const minutes = minutesFor(km, rides.speedKmh);
    const options = types.map((type) => {
      const fare = fareCents(type, km, minutes);
      const discount = discountCents(promo, fare);
      return { type, fareCents: fare - discount + previousFeeCents, discountCents: discount };
    });
    return { settings, rides, types, promo, previous, previousFeeCents, km, minutes, options };
  }

  private async estimate(request: ConnectorRequest): Promise<ConnectorResult> {
    const read = readEstimateRequest(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const priced = await this.price(read.value, request.user, request.now);
    if ("error" in priced) return priced.error!;
    const { settings, rides, km, minutes, options, previousFeeCents } = priced;
    const c = settings.currency;
    // The nearest free driver of each type, for "available" and how soon they'd be there.
    const probe = { ...this.probeRide(read.value), userId: request.user?.id ?? null } as Ride;
    const nearest = new Map<number, number | null>();
    for (const option of options) {
      const [first] = await candidatesFor(this.flow(request.now), { ...probe, vehicleTypeId: option.type.id }, rides);
      nearest.set(option.type.id, first ? (first.km === null ? 0 : first.km) : -1);
    }
    const maxDiscount = Math.max(0, ...options.map((o) => o.discountCents));
    return {
      status: 200,
      body: {
        distance_km: km,
        minutes,
        currency: c,
        discount_formatted: maxDiscount > 0 ? formatCents(maxDiscount, c) : null,
        previous_fee_formatted: previousFeeCents > 0 ? formatCents(previousFeeCents, c) : null,
        options: options.map((o) => {
          const near = nearest.get(o.type.id) ?? -1;
          return {
            vehicle_type: vehicleTypeJson(o.type, this.deps.assetUrl),
            fare: centsToDecimal(o.fareCents),
            fare_formatted: formatCents(o.fareCents, c),
            available: near >= 0,
            pickup_minutes: near >= 0 ? minutesFor(near * ROAD_FACTOR, rides.speedKmh) : null,
          };
        }),
      },
    };
  }

  /** A ride not yet made, for finding the drivers near its pickup. */
  private probeRide(input: EstimateRequest): Partial<Ride> {
    return { id: 0, pickup: input.pickup, declinedBy: [], vehicleTypeId: null };
  }

  private async ask(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const read = readRideRequest(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const input = read.value;
    const { store, app } = this.deps;
    const priced = await this.price(input, request.user, request.now);
    if ("error" in priced) return priced.error!;
    const { settings, rides, km, minutes, previous, previousFeeCents, promo } = priced;
    const option = priced.options.find((o) => o.type.id === input.vehicleTypeId);
    if (!option) return error(400, "invalid_request", "That vehicle type isn't offered any more. Choose another one.");
    if (input.payment === "cash" && !settings.cash) return error(400, "invalid_request", "Cash isn't taken. Pay by card.");
    if (input.payment === "card" && !settings.card) return error(400, "invalid_request", "Cards aren't taken. Pay the driver in cash.");
    if (input.payment === "card" && !this.canTakeCards) return error(503, "payments_unavailable", "Card payments aren't available right now. Please try again later.");
    const going = await store.listRides({ appId: app.id, userId: request.user.id, statuses: ["searching", ...DRIVER_ACTIVE], order: "newest", offset: 0, limit: 1 });
    if (!input.scheduledAt && going.total > 0) return error(409, "ride_in_progress", "You already have a ride on the way.");
    const status = input.scheduledAt ? "scheduled" : "searching";
    const type = option.type;
    const created = await store.createRide({
      appId: app.id,
      userId: request.user.id,
      riderName: request.user.name || "Rider",
      riderPhone: request.user.phone,
      vehicleTypeId: type.id,
      vehicleTypeName: type.name,
      vehicleTypeIcon: type.icon,
      fares: { baseCents: type.baseCents, perKmCents: type.perKmCents, perMinuteCents: type.perMinuteCents, minCents: type.minCents, waitPerMinuteCents: type.waitPerMinuteCents },
      fareMode: rides.fareMode,
      pickup: input.pickup,
      dropoff: input.dropoff,
      scheduledAt: input.scheduledAt,
      estimateKm: km,
      estimateMinutes: minutes,
      quotedCents: option.fareCents,
      promoCode: promo?.code ?? null,
      discountCents: option.discountCents,
      previousFeeCents,
      previousFeeRideId: previous?.id ?? null,
      finalCents: null,
      meterKm: 0,
      rideMinutes: null,
      waitMinutes: null,
      commissionBp: null,
      commissionCents: null,
      currency: settings.currency,
      paymentMethod: input.payment,
      paymentStatus: "unpaid",
      orderId: null,
      status,
      pin: rides.pin ? String(randomInt(0, 10_000)).padStart(4, "0") : null,
      notes: input.notes,
      driverId: null,
      driverName: null,
      offeredTo: null,
      offerExpiresAt: null,
      declinedBy: [],
      searchingSince: status === "searching" ? request.now : null,
      cancellation: null,
      feeCarriedTo: null,
      shareToken: randomToken(18),
      rating: null,
      timeline: [rideStage(status, request.now, "rider")],
      lang: request.lang ?? null,
      createdAt: request.now,
      updatedAt: request.now,
    });
    if (previous) await store.updateRide(app.id, previous.id, { feeCarriedTo: created.id, updatedAt: request.now });
    const ride = status === "searching" ? await offerNext(this.flow(request.now), created) : created;
    return { status: 201, body: await this.riderJson(ride, request.now) };
  }

  private async ownRide(request: ConnectorRequest, id: number): Promise<Ride | null> {
    const ride = await this.deps.store.getRide(this.deps.app.id, id);
    return ride && ride.userId === request.user?.id ? ride : null;
  }

  /** The ride as its rider sees it, with its driver and where they are. */
  private async riderJson(ride: Ride, now: Date) {
    const driver = ride.driverId !== null ? await this.deps.store.getCourier(this.deps.app.id, ride.driverId) : null;
    let pickupMinutes: number | null = null;
    if (ride.status === "accepted" && driver && driver.lat !== null && driver.lng !== null && located(ride.pickup)) {
      const { rides } = await this.settings();
      pickupMinutes = minutesFor(exactKm({ lat: driver.lat, lng: driver.lng }, ride.pickup) * ROAD_FACTOR, rides.speedKmh);
    }
    return rideJson(ride, { driver, now, platformUrl: this.deps.platformUrl, pickupMinutes, assetUrl: this.deps.assetUrl });
  }

  private async myRides(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const active = request.query.get("active") === "true";
    const { items, total } = await this.deps.store.listRides({
      appId: this.deps.app.id,
      userId: request.user.id,
      ...(active ? { statuses: RIDE_ACTIVE } : {}),
      order: "newest",
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    const json = await Promise.all(items.map(async (r) => this.riderJson(await advanceRide(this.flow(request.now), r), request.now)));
    return { status: 200, body: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), items: json } };
  }

  private async myRide(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const ride = await this.ownRide(request, id);
    if (!ride) return rideNotFound();
    return { status: 200, body: await this.riderJson(await advanceRide(this.flow(request.now), ride), request.now) };
  }

  private async cancel(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const ride = await this.ownRide(request, id);
    if (!ride) return rideNotFound();
    if (ride.status === "cancelled") return { status: 200, body: await this.riderJson(ride, request.now) };
    const reasons = ["changed_plans", "driver_late", "driver_asked", "wrong_place", "other"];
    const raw = (request.body as { reason?: unknown } | null)?.reason;
    const reason = typeof raw === "string" && reasons.includes(raw) ? raw : null;
    const refused = () => error(409, "not_cancellable", "This ride has started. Ask the driver to end it.");
    const moved = await cancelByRider(this.flow(request.now), ride, reason);
    if (!moved.ok) return refused();
    return { status: 200, body: await this.riderJson(moved.ride, request.now) };
  }

  private async pay(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const ride = await this.ownRide(request, id);
    if (!ride) return rideNotFound();
    if (ride.status !== "completed" || ride.paymentMethod !== "card" || ride.paymentStatus !== "unpaid") return error(409, "not_payable", "This ride has nothing to pay.");
    if (!this.canTakeCards) return error(503, "payments_unavailable", "Card payments aren't available right now. Please try again later.");
    const link = await ridePayLink(this.deps.store, this.deps.app, ride, this.deps.platformUrl, request.now);
    return { status: 200, body: { url: link.url } };
  }

  private async rate(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const ride = await this.ownRide(request, id);
    if (!ride) return rideNotFound();
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
    const stars = typeof body.driver === "number" && Number.isInteger(body.driver) && body.driver >= 1 && body.driver <= 5 ? body.driver : null;
    if (stars === null) return error(400, "invalid_request", "Choose a rating from 1 to 5.");
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) || null : null;
    if (ride.status !== "completed") return error(409, "not_ratable", "You can rate a ride once it's over.");
    if (ride.rating) return error(409, "already_rated", "You already rated this ride.");
    const ended = [...ride.timeline].reverse().find((s) => s.status === "completed");
    if (ended && request.now.getTime() - Date.parse(ended.at) > RATING_DAYS * 86_400_000) return error(409, "not_ratable", "Rides can be rated within 7 days.");
    const rating = { driver: stars, comment, at: request.now.toISOString() };
    if (!(await this.deps.store.updateRide(this.deps.app.id, ride.id, { rating, updatedAt: request.now }, { statuses: ["completed"] }))) return error(409, "not_ratable", "You can rate a ride once it's over.");
    if (ride.driverId !== null) await this.deps.store.addDriverRating(this.deps.app.id, ride.driverId, stars, request.now);
    return { status: 200, body: await this.riderJson({ ...ride, rating, updatedAt: request.now }, request.now) };
  }

  // The driver

  /** The driver the signed-in person is, or null. Suspended drivers aren't. The store review account is a driver too. */
  private async driverOf(user: HostedUser | null, now: Date): Promise<Courier | null> {
    if (!user) return null;
    const found = (await this.deps.store.findCourier(this.deps.app.id, courierWho(user))) ?? (await reviewDriverFor(this.deps.store, this.deps.app, user, now));
    return found && found.active ? found : null;
  }

  private async withDriver(request: ConnectorRequest, then: (driver: Courier) => Promise<ConnectorResult>): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const driver = await this.driverOf(request.user, request.now);
    return driver ? then(driver) : notDriver();
  }

  /** The driver's ride that isn't over, if any. */
  private async activeRide(driver: Courier): Promise<Ride | null> {
    const { items } = await this.deps.store.listRides({ appId: this.deps.app.id, driverId: driver.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 1 });
    return items[0] ?? null;
  }

  /** The driver's completed rides whose end falls in `[since, until)`. */
  private async completedBetween(driver: Courier, since: Date, until: Date): Promise<Ride[]> {
    const { items } = await this.deps.store.listRides({ appId: this.deps.app.id, driverId: driver.id, statuses: ["completed"], updatedSince: since, order: "newest", offset: 0, limit: 5000 });
    return items.filter((r) => {
      const at = [...r.timeline].reverse().find((s) => s.status === "completed");
      const t = at ? Date.parse(at.at) : r.updatedAt.getTime();
      return t >= since.getTime() && t < until.getTime();
    });
  }

  /** What the driver keeps of a ride: the fare without a previous fee, less the company's share. */
  private earned(ride: Ride): number {
    return Math.max(0, (ride.finalCents ?? 0) - ride.previousFeeCents - (ride.commissionCents ?? 0));
  }

  private async meJson(driver: Courier, now: Date) {
    const { settings } = await this.settings();
    const timezone = settings.timezone ?? DEFAULT_RIDES_TIMEZONE;
    const since = localToUtc(utcToLocal(now, timezone).date, "00:00", timezone);
    const [types, today, active] = await Promise.all([this.deps.store.listVehicleTypes(this.deps.app.id), this.completedBetween(driver, since, new Date(now.getTime() + 1)), this.activeRide(driver)]);
    return driverJson(driver, types, { rides: today.length, earnedCents: today.reduce((sum, r) => sum + this.earned(r), 0) }, settings.currency, active?.id ?? null, this.deps.assetUrl);
  }

  private driverMe(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => ({ status: 200, body: await this.meJson(driver, request.now) }));
  }

  private online(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const online = (request.body as { online?: unknown } | null)?.online;
      if (typeof online !== "boolean") return error(400, "invalid_request", "Say whether you're online.");
      if (!online) {
        if (await this.activeRide(driver)) return error(409, "ride_in_progress", "Finish your ride before going offline.");
        // Offline: their position goes, and a ride offered to them goes to the next driver.
        const offered = await this.deps.store.listRides({ appId: this.deps.app.id, offeredTo: driver.id, statuses: ["searching"], order: "oldest", offset: 0, limit: 5 });
        for (const ride of offered.items) await declineRide(this.flow(request.now), ride, driver);
        await this.deps.store.updateCourier(this.deps.app.id, driver.id, { onDuty: false, lat: null, lng: null, locatedAt: null }, request.now);
        return { status: 200, body: await this.meJson({ ...driver, onDuty: false, lat: null, lng: null, locatedAt: null }, request.now) };
      }
      await this.deps.store.updateCourier(this.deps.app.id, driver.id, { onDuty: true }, request.now);
      return { status: 200, body: await this.meJson({ ...driver, onDuty: true }, request.now) };
    });
  }

  private location(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
      const { lat, lng } = body;
      if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return error(400, "invalid_request", "The position isn't valid.");
      }
      const heading = typeof body.heading === "number" && Number.isFinite(body.heading) && body.heading >= 0 && body.heading <= 360 ? Math.round(body.heading) : null;
      // Offline: nothing is kept.
      if (!driver.onDuty) return { status: 204 };
      if (driver.locatedAt && request.now.getTime() - driver.locatedAt.getTime() < LOCATION_SECONDS * 1000) return { status: 204 };
      const round = (n: number) => Math.round(n * 1e6) / 1e6;
      const to = { lat: round(lat), lng: round(lng) };
      // During a ride, the step since the last position counts on the meter.
      const ride = await this.activeRide(driver);
      if (ride?.status === "in_progress" && driver.lat !== null && driver.lng !== null && driver.locatedAt) {
        const step = meterStep({ lat: driver.lat, lng: driver.lng }, to, (request.now.getTime() - driver.locatedAt.getTime()) / 1000);
        if (step > 0) await this.deps.store.updateRide(this.deps.app.id, ride.id, { meterKm: ride.meterKm + step }, { statuses: ["in_progress"], driverId: driver.id });
      }
      await this.deps.store.updateCourier(this.deps.app.id, driver.id, { ...to, locatedAt: request.now, driver: { ...driverOf(driver), heading } }, request.now);
      return { status: 204 };
    });
  }

  /** Searching and scheduled rides moved on with time, so a driver who just came online gets one. */
  private async moveRidesOn(now: Date): Promise<void> {
    const { items } = await this.deps.store.listRides({ appId: this.deps.app.id, statuses: ["searching", "scheduled"], order: "oldest", offset: 0, limit: ADVANCE_BATCH });
    for (const ride of items) {
      if (ride.status === "searching" && ride.offeredTo !== null && ride.offerExpiresAt && ride.offerExpiresAt.getTime() > now.getTime()) continue;
      await advanceRide(this.flow(now), ride);
    }
  }

  private async pickupKm(driver: Courier, ride: Ride): Promise<number | null> {
    if (driver.lat === null || driver.lng === null || !located(ride.pickup)) return null;
    return Math.round(exactKm({ lat: driver.lat, lng: driver.lng }, ride.pickup) * 10) / 10;
  }

  private offers(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      if (!driver.onDuty) return { status: 200, body: { items: [] } };
      await this.moveRidesOn(request.now);
      const { items } = await this.deps.store.listRides({ appId: this.deps.app.id, offeredTo: driver.id, statuses: ["searching"], order: "oldest", offset: 0, limit: 1 });
      const live = items.filter((r) => r.offerExpiresAt && r.offerExpiresAt.getTime() > request.now.getTime());
      const json = await Promise.all(live.map(async (r) => driverRideJson(r, { mine: false, pickupKm: await this.pickupKm(driver, r) })));
      return { status: 200, body: { items: json } };
    });
  }

  private driverRides(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const scope = request.query.get("scope");
      if (scope !== "active" && scope !== "done") return error(400, "invalid_request", "Unknown list.");
      const page = intParam(request.query, "page", 1, 10_000);
      const perPage = intParam(request.query, "per_page", 20, 50);
      const since = new Date(request.now.getTime() - DONE_DAYS * 86_400_000);
      const { items, total } = await this.deps.store.listRides({
        appId: this.deps.app.id,
        driverId: driver.id,
        statuses: scope === "active" ? DRIVER_ACTIVE : RIDE_DONE,
        ...(scope === "done" ? { updatedSince: since } : {}),
        order: scope === "active" ? "oldest" : "newest",
        offset: (page - 1) * perPage,
        limit: perPage,
      });
      const json = await Promise.all(items.map(async (r) => driverRideJson(r, { mine: true, pickupKm: await this.pickupKm(driver, r) })));
      return { status: 200, body: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), items: json } };
    });
  }

  /** A ride the driver may see: theirs, or the one offered to them now. */
  private async visibleRide(driver: Courier, id: number, now: Date): Promise<{ ride: Ride; mine: boolean } | null> {
    let ride = await this.deps.store.getRide(this.deps.app.id, id);
    if (!ride) return null;
    if (ride.driverId === driver.id) return { ride, mine: true };
    ride = await advanceRide(this.flow(now), ride);
    if (ride.status === "searching" && ride.offeredTo === driver.id) return { ride, mine: false };
    return null;
  }

  private driverRide(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const found = await this.visibleRide(driver, id, request.now);
      return found ? { status: 200, body: driverRideJson(found.ride, { mine: found.mine, pickupKm: await this.pickupKm(driver, found.ride) }) } : rideNotFound();
    });
  }

  private accept(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const ride = await this.deps.store.getRide(this.deps.app.id, id);
      if (!ride) return rideNotFound();
      if (ride.driverId === driver.id) return { status: 200, body: driverRideJson(ride, { mine: true, pickupKm: await this.pickupKm(driver, ride) }) };
      if (await this.activeRide(driver)) return error(409, "ride_in_progress", "Finish your ride first.");
      const moved = await acceptRide(this.flow(request.now), ride, driver);
      if (!moved.ok) return error(409, "offer_expired", "This ride went to another driver.");
      return { status: 200, body: driverRideJson(moved.ride, { mine: true, pickupKm: await this.pickupKm(driver, moved.ride) }) };
    });
  }

  private decline(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const ride = await this.deps.store.getRide(this.deps.app.id, id);
      if (!ride) return rideNotFound();
      await declineRide(this.flow(request.now), ride, driver);
      return { status: 204 };
    });
  }

  private step(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const body = (request.body && typeof request.body === "object" ? request.body : {}) as Record<string, unknown>;
      const status = body.status;
      const note = typeof body.note === "string" ? body.note.replace(/\s+/g, " ").trim().slice(0, 300) || null : null;
      if (status !== "arrived" && status !== "in_progress" && status !== "completed" && status !== "cancelled") return error(400, "invalid_request", "Unknown stage.");
      const ride = await this.deps.store.getRide(this.deps.app.id, id);
      if (!ride || ride.driverId !== driver.id) return rideNotFound();
      if (!(DRIVER_STEPS[ride.status] ?? []).includes(status)) return error(409, "invalid_status", "This ride can't move to that stage now.");
      const deps = this.flow(request.now);
      let moved: { ok: true; ride: Ride } | { ok: false; reason: string };
      if (status === "arrived") moved = await arriveRide(deps, ride, "driver");
      else if (status === "in_progress") {
        if (ride.pin && body.pin !== ride.pin) return error(400, "wrong_pin", "That code isn't right. Ask the rider for the code in their app.");
        moved = await startRide(deps, ride, "driver");
      } else if (status === "completed") moved = await completeRide(deps, ride, driver, "driver");
      else {
        const reason = body.reason === "rider_no_show" || body.reason === "other" ? body.reason : null;
        if (!reason) return error(400, "invalid_request", "Say why you're cancelling.");
        moved = await cancelByDriver(deps, ride, driver, reason, note);
        if (!moved.ok && moved.reason === "too_soon") {
          const { rides } = await this.settings();
          return error(409, "invalid_status", `Wait ${rides.noShowMinutes} minutes at the pickup before cancelling for a no-show.`);
        }
      }
      if (!moved.ok) return changed();
      return { status: 200, body: driverRideJson(moved.ride, { mine: moved.ride.driverId === driver.id, pickupKm: await this.pickupKm(driver, moved.ride) }) };
    });
  }

  private earnings(request: ConnectorRequest): Promise<ConnectorResult> {
    return this.withDriver(request, async (driver) => {
      const period = request.query.get("period");
      if (period !== "today" && period !== "week" && period !== "month") return error(400, "invalid_request", "Unknown period.");
      const { settings } = await this.settings();
      const timezone = settings.timezone ?? DEFAULT_RIDES_TIMEZONE;
      const today = utcToLocal(request.now, timezone).date;
      const day = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
      const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
      const from = period === "today" ? today : period === "week" ? day(today, -weekday) : `${today.slice(0, 8)}01`;
      const rides = await this.completedBetween(driver, localToUtc(from, "00:00", timezone), new Date(request.now.getTime() + 1));
      const c = settings.currency;
      const days = new Map<string, { rides: number; earned: number }>();
      for (const r of rides) {
        const at = [...r.timeline].reverse().find((s) => s.status === "completed")?.at;
        const date = utcToLocal(at ? new Date(at) : r.updatedAt, timezone).date;
        const row = days.get(date) ?? { rides: 0, earned: 0 };
        row.rides += 1;
        row.earned += this.earned(r);
        days.set(date, row);
      }
      const fares = rides.reduce((sum, r) => sum + (r.finalCents ?? 0) - r.previousFeeCents, 0);
      const share = rides.reduce((sum, r) => sum + (r.commissionCents ?? 0), 0);
      const cash = rides.filter((r) => r.paymentMethod === "cash").reduce((sum, r) => sum + (r.finalCents ?? 0), 0);
      return {
        status: 200,
        body: {
          period,
          from,
          to: today,
          rides: rides.length,
          fares_formatted: formatCents(fares, c),
          cash_formatted: formatCents(cash, c),
          company_share_formatted: formatCents(share, c),
          earned_formatted: formatCents(Math.max(0, fares - share), c),
          days: [...days.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, row]) => ({ date, rides: row.rides, earned_formatted: formatCents(row.earned, c) })),
        },
      };
    });
  }
}

/** Whether the signed-in person drives for the company (`User.roles` `driver`): an active driver, or the store review account. */
export async function isDriver(deps: Pick<RidesDeps, "store" | "app">, user: HostedUser, now: Date): Promise<boolean> {
  const found = (await deps.store.findCourier(deps.app.id, courierWho(user))) ?? (await reviewDriverFor(deps.store, deps.app, user, now));
  return Boolean(found?.active);
}
