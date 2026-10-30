import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type Ride, type RidesSettings, type VehicleTypeInput } from "@/lib/data/types";
import { DEFAULT_TAXI_SETTINGS } from "@/lib/taxi/settings";
import { reviewNotes } from "@/lib/delivery/review";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { RidesConnector } from "@/lib/hosted/connectors/rides";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { commissionOf, discountCents, exactKm, fareCents, finalFare, meterStep, minutesFor, promoFor, roadKm } from "@/lib/rides/fares";
import { advanceRide, SEARCH_MINUTES } from "@/lib/rides/flow";
import { rideIdOf, rideReference } from "@/lib/rides/service";
import { DEFAULT_RIDES_SETTINGS, EMPTY_DRIVER } from "@/lib/rides/settings";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
// Tahrir Square and the Cairo Tower: about 1.1 km apart in a straight line.
const TAHRIR = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
const TOWER = { address: "Cairo Tower, Zamalek", details: "Gate 2", lat: 30.0459, lng: 31.2243 };
// A few hundred metres from Tahrir, and a little further.
const NEAR = { lat: 30.0462, lng: 31.2372 };
const NEARER = { lat: 30.045, lng: 31.236 };
const ALEXANDRIA = { lat: 31.2, lng: 29.9 };

const RIDES: RidesSettings = { ...DEFAULT_RIDES_SETTINGS, commissionBp: 2000, cancelFeeCents: 15_00, cancelFreeMinutes: 2, noShowMinutes: 5, freeWaitMinutes: 3, scheduling: true };
const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", cash: true, card: true, timezone: "Africa/Cairo", rides: RIDES };

const economy = (appId: string, patch: Partial<VehicleTypeInput> = {}): VehicleTypeInput => ({
  appId,
  name: "Economy",
  description: "Everyday rides",
  icon: "directions_car",
  imageAssetId: "car-1",
  seats: 4,
  baseCents: 15_00,
  perKmCents: 6_00,
  perMinuteCents: 1_00,
  minCents: 25_00,
  waitPerMinuteCents: 2_00,
  position: 1,
  active: true,
  ...patch,
});

describe("105.2 ride fares", () => {
  it("estimates the road a third longer than the straight line, at the usual speed, never under the smallest fare", () => {
    expect(exactKm(TAHRIR, TOWER)).toBeCloseTo(1.105, 2);
    expect(roadKm(TAHRIR, TOWER)).toBe(1.4);
    expect(minutesFor(1.4, 25)).toBe(4);
    expect(minutesFor(0, 25)).toBe(1);
    const fares = { baseCents: 15_00, perKmCents: 6_00, perMinuteCents: 1_00, minCents: 25_00, waitPerMinuteCents: 2_00 };
    // 15 + 6 × 1.4 + 4 = 27.40.
    expect(fareCents(fares, 1.4, 4)).toBe(27_40);
    expect(fareCents(fares, 0.2, 1)).toBe(25_00);
    expect(discountCents({ code: "HALF", percentOff: 50, maxOffCents: 10_00, endsAt: null, maxRides: null, active: true }, 27_40)).toBe(10_00);
    expect(discountCents({ code: "TEN", percentOff: 10, maxOffCents: null, endsAt: null, maxRides: null, active: true }, 27_40)).toBe(2_74);
    expect(commissionOf(42_40, 15_00, 2000)).toBe(5_48);
    expect(rideReference({ id: 51 })).toBe("R-2051");
    expect(rideIdOf("r-2051")).toBe(51);
    expect(rideIdOf("taxi")).toBeNull();
  });

  it("reads promo codes as the company has them: active, not ended, any case", () => {
    const promos = [
      { code: "WELCOME", percentOff: 20, maxOffCents: null, endsAt: null, maxRides: null, active: true },
      { code: "OLD", percentOff: 20, maxOffCents: null, endsAt: "2026-01-01T00:00:00Z", maxRides: null, active: true },
      { code: "OFF", percentOff: 20, maxOffCents: null, endsAt: null, maxRides: null, active: false },
    ];
    expect(promoFor({ promos }, "welcome", NOW)?.code).toBe("WELCOME");
    expect(promoFor({ promos }, "OLD", NOW)).toBeNull();
    expect(promoFor({ promos }, "OFF", NOW)).toBeNull();
    expect(promoFor({ promos }, null, NOW)).toBeNull();
  });

  it("works out the final fare: upfront with waiting, or by the meter and the minutes", () => {
    const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
    const ride = {
      fares: { baseCents: 15_00, perKmCents: 6_00, perMinuteCents: 1_00, minCents: 25_00, waitPerMinuteCents: 2_00 },
      fareMode: "upfront",
      quotedCents: 27_40,
      discountCents: 0,
      previousFeeCents: 0,
      estimateKm: 1.4,
      estimateMinutes: 4,
      meterKm: 0,
      timeline: [
        { status: "accepted", at: at(0) },
        { status: "arrived", at: at(5) },
        { status: "in_progress", at: at(10) },
      ],
    } as unknown as Ride;
    // Waited 5 minutes, 3 free: 2 × 2.00 more.
    expect(finalFare(ride, { freeWaitMinutes: 3 }, new Date(NOW.getTime() + 20 * 60_000))).toEqual({ finalCents: 31_40, km: 1.4, rideMinutes: 10, waitMinutes: 2, discountCents: 0 });
    // By the meter: 3.2 km and 10 minutes, plus the waiting, less 5.00 off, plus a 15.00 fee from before.
    const metered = { ...ride, fareMode: "metered", meterKm: 3.24, discountCents: 5_00, previousFeeCents: 15_00 } as Ride;
    expect(finalFare(metered, { freeWaitMinutes: 3 }, new Date(NOW.getTime() + 20 * 60_000))).toEqual({ finalCents: (15_00 + 19_20 + 10_00 + 4_00) - 5_00 + 15_00, km: 3.2, rideMinutes: 10, waitMinutes: 2, discountCents: 5_00 });
    // Without the meter, the estimate.
    expect(finalFare({ ...metered, meterKm: 0 }, { freeWaitMinutes: 3 }, new Date(NOW.getTime() + 20 * 60_000)).km).toBe(1.4);
  });

  it("measures the meter in steps, and leaves out a jump of the position", () => {
    expect(meterStep(TAHRIR, NEAR, 10)).toBeCloseTo(exactKm(TAHRIR, NEAR), 6);
    expect(meterStep(TAHRIR, ALEXANDRIA, 10)).toBe(0);
    expect(meterStep(null, NEAR, 10)).toBe(0);
  });
});

describe("105.2 ride apps on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let rides: boolean;
  let economyId: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "rides");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile Rides",
      websiteDoneAt: NOW,
      connector: { kind: "rides" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    economyId = (await store.createVehicleType(economy(app.id), NOW)).id;
    sender = new LogSender();
    now = NOW;
    rides = true;
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: new RidesConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", rides }),
    ...overrides,
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number; roles?: string[] } };
  }

  /** A driver of the company, signed in, online where `at` is. */
  async function driverAt(phone: string, name: string, at: { lat: number; lng: number }, patch: Partial<typeof EMPTY_DRIVER> = {}) {
    const made = await store.createCourier({ appId: app.id, name, phone: `+20${phone}`, email: null, vehicle: null, active: true, driver: { ...EMPTY_DRIVER, vehicleTypeId: economyId, carModel: "Toyota Corolla", carColor: "White", plate: "ABC 123", photoAssetId: "face-1", ...patch } }, NOW);
    if (!made.ok) throw new Error("duplicate");
    const session = await signUp(phone, name);
    expect((await call("PATCH", "/driver/me", { token: session.access_token, body: { online: true } })).body).toMatchObject({ online: true });
    expect((await call("PUT", "/driver/location", { token: session.access_token, body: { ...at, heading: 90 } })).status).toBe(204);
    return { ...session, id: made.courier.id };
  }

  /** The online drivers' apps keep sending where they are. */
  async function keepSending() {
    for (const c of await store.listCouriers(app.id)) if (c.onDuty && c.lat !== null) await store.updateCourier(app.id, c.id, { locatedAt: now }, now);
  }
  const ask = async (token: string, extra: Record<string, unknown> = {}) => {
    await keepSending();
    return call("POST", "/rides", { query: { platform: "android" }, token, body: { pickup: TAHRIR, dropoff: TOWER, vehicle_type_id: economyId, payment: "cash", ...extra } });
  };
  const offers = async (token: string) => {
    await keepSending();
    return ((await call("GET", "/driver/offers", { token })).body as { items: Record<string, unknown>[] }).items;
  };
  const step = (token: string, id: number, body: Record<string, unknown>) => call("POST", "/driver/rides/{ride_id}/status", { params: [String(id)], token, body });
  const inbox = async (userId: number) =>
    (await store.listHostedNotifications({ appId: app.id, userId, since: new Date(0), page: 1, perPage: 30 })).items.map((n) => [n.title, n.data?.type]).reverse();
  const later = (seconds: number) => {
    now = new Date(now.getTime() + seconds * 1000);
  };

  it("sends Config.rides: vehicle types, payment, how fares, matching and cancelling work, the map", async () => {
    await store.createVehicleType(economy(app.id, { name: "No fares yet", baseCents: 0, perKmCents: 0, perMinuteCents: 0, minCents: 0, position: 2 }), NOW);
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(config.rides).toEqual({
      currency: "EGP",
      timezone: "Africa/Cairo",
      vehicle_types: [{ id: economyId, name: "Economy", description: "Everyday rides", icon: "directions_car", image_url: ASSETS("car-1"), seats: 4 }],
      payment: { cash: true, card: true },
      fare_mode: "upfront",
      scheduling: true,
      matching: "nearest",
      areas: [],
      cancellation: { free_minutes: 2, fee_formatted: "E£15.00", no_show_minutes: 5 },
      pin: false,
      emergency_phone: null,
      driver_app: "same",
      map: { tiles_url: null, attribution: null },
    });
    expect(config).not.toHaveProperty("delivery");
  });

  it("gives each vehicle type's fare, with how soon the nearest free driver would be there, and checks the area, time and promo code", async () => {
    const estimate = await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER } });
    expect(estimate.body).toEqual({
      distance_km: 1.4,
      minutes: 4,
      currency: "EGP",
      discount_formatted: null,
      previous_fee_formatted: null,
      options: [
        {
          vehicle_type: { id: economyId, name: "Economy", description: "Everyday rides", icon: "directions_car", image_url: ASSETS("car-1"), seats: 4 },
          fare: "27.40",
          fare_formatted: "E£27.40",
          available: false,
          pickup_minutes: null,
        },
      ],
    });
    await driverAt("1005556666", "Omar Said", NEAR);
    await keepSending();
    const near = (await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER } })).body as { options: Record<string, unknown>[] };
    expect(near.options[0]).toMatchObject({ available: true, pickup_minutes: 1 });
    // Places without coordinates, outside the company's areas, a time too soon, an unknown code.
    expect((await call("POST", "/rides/estimate", { body: { pickup: { address: "Somewhere" }, dropoff: TOWER } })).status).toBe(400);
    await store.saveDeliverySettings(app.id, { ...SETTINGS, rides: { ...RIDES, areas: [{ id: "alex", name: "Alexandria", ...ALEXANDRIA, radiusKm: 20 }], promos: [{ code: "WELCOME", percentOff: 50, maxOffCents: 10_00, endsAt: null, maxRides: null, active: true }] } }, NOW);
    expect((await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER } })).body).toMatchObject({ code: "outside_service_area" });
    await store.saveDeliverySettings(app.id, { ...SETTINGS, rides: { ...RIDES, promos: [{ code: "WELCOME", percentOff: 50, maxOffCents: 10_00, endsAt: null, maxRides: null, active: true }] } }, NOW);
    const soon = await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER, scheduled_at: new Date(now.getTime() + 10 * 60_000).toISOString() } });
    expect(soon.status).toBe(400);
    const promo = (await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER, promo_code: "welcome" } })).body as { discount_formatted: string; options: { fare: string }[] };
    expect([promo.discount_formatted, promo.options[0]!.fare]).toEqual(["E£10.00", "17.40"]);
    expect((await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER, promo_code: "NOPE" } })).body).toMatchObject({ code: "invalid_request", details: { field: "promo_code" } });
    // Without a vehicle type with fares, no rides yet.
    await store.updateVehicleType(app.id, economyId, { active: false }, NOW);
    expect((await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER } })).body).toMatchObject({ code: "rides_unavailable" });
  });

  it("offers a ride to the nearest free driver first; one who lets it go is not asked again; the next one accepts and the ride goes to the drop-off", async () => {
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    const sara = await driverAt("1007778888", "Sara Adel", NEARER);
    expect(omar.user.roles).toEqual(["driver"]);
    const rider = await signUp("1001112222", "Karim Hassan");
    expect(rider.user.roles).toEqual([]);
    const asked = await ask(rider.access_token, { notes: "At gate 2" });
    expect(asked.status).toBe(201);
    const ride = asked.body as Record<string, unknown>;
    expect(ride).toMatchObject({ status: "searching", reference: expect.stringMatching(/^R-\d+$/), fare: "27.40", final: false, payment: { method: "cash", status: "unpaid" }, driver: null, notes: "At gate 2" });
    expect(ride.share_url).toMatch(/^https:\/\/yallapp\.test\/r\/[A-Za-z0-9_-]+$/);
    const id = ride.id as number;
    // Sara is nearer: hers first, with the rider's number hidden.
    expect(await offers(omar.access_token)).toEqual([]);
    const offered = await offers(sara.access_token);
    expect(offered).toEqual([expect.objectContaining({ id, status: "searching", fare_formatted: "E£27.40", collect: "27.40", rider: { name: "Karim Hassan", phone: null, rating: null }, offer_expires_at: new Date(now.getTime() + 20_000).toISOString() })]);
    expect(await inbox(sara.user.id)).toEqual([["New ride request", "ride_offer"]]);
    // Another driver can't take it.
    expect((await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(id)], token: omar.access_token })).body).toMatchObject({ code: "offer_expired" });
    expect((await call("POST", "/driver/rides/{ride_id}/decline", { params: [String(id)], token: sara.access_token })).status).toBe(204);
    expect(await offers(sara.access_token)).toEqual([]);
    expect((await offers(omar.access_token)).map((r) => r.id)).toEqual([id]);
    const accepted = await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(id)], token: omar.access_token });
    expect(accepted.body).toMatchObject({ status: "accepted", rider: { name: "Karim Hassan", phone: "+201001112222" }, offer_expires_at: null });
    // The rider sees the driver, the car and where it is.
    const following = (await call("GET", "/me/rides/{ride_id}", { params: [String(id)], token: rider.access_token })).body as Record<string, unknown>;
    expect(following).toMatchObject({
      status: "accepted",
      driver: { name: "Omar Said", phone: "+201005556666", photo_url: ASSETS("face-1"), rating: null, car: { model: "Toyota Corolla", color: "White", plate: "ABC 123" } },
      driver_location: { lat: NEAR.lat, lng: NEAR.lng, heading: 90 },
      pickup_minutes: 1,
    });
    // Not the driver's to go offline now.
    expect((await call("PATCH", "/driver/me", { token: omar.access_token, body: { online: false } })).body).toMatchObject({ code: "ride_in_progress" });
    // Can't start before arriving.
    expect((await step(omar.access_token, id, { status: "in_progress" })).body).toMatchObject({ code: "invalid_status" });
    expect((await step(omar.access_token, id, { status: "arrived" })).body).toMatchObject({ status: "arrived" });
    later(60);
    expect((await step(omar.access_token, id, { status: "in_progress" })).body).toMatchObject({ status: "in_progress" });
    // The meter: positions along the way.
    later(10);
    await call("PUT", "/driver/location", { token: omar.access_token, body: { lat: 30.0455, lng: 31.231 } });
    later(10);
    await call("PUT", "/driver/location", { token: omar.access_token, body: { lat: TOWER.lat, lng: TOWER.lng } });
    expect((await store.getRide(app.id, id))!.meterKm).toBeGreaterThan(0.5);
    later(8 * 60);
    const done = await step(omar.access_token, id, { status: "completed" });
    // Upfront: the fare given, no waiting past the free minutes; cash, paid.
    expect(done.body).toMatchObject({ status: "completed", fare: "27.40", final: true, collect: "27.40", payment: { method: "cash", status: "paid" }, rider: { phone: null } });
    const saved = (await store.getRide(app.id, id))!;
    expect(saved).toMatchObject({ finalCents: 27_40, commissionBp: 2000, commissionCents: 5_48, shareToken: null });
    const mine = (await call("GET", "/me/rides/{ride_id}", { params: [String(id)], token: rider.access_token })).body as Record<string, unknown>;
    expect(mine).toMatchObject({ status: "completed", share_url: null, driver: { name: "Omar Said", phone: null }, driver_location: null });
    expect((await inbox(rider.user.id)).map(([title]) => title)).toEqual(["Your driver is on the way", "Your driver is here", "You've arrived"]);
    // The driver's day: 27.40 less 20%.
    expect((await call("GET", "/driver/me", { token: omar.access_token })).body).toMatchObject({ online: true, active_ride_id: null, today: { rides: 1, earned_formatted: "E£21.92" } });
    const week = (await call("GET", "/driver/earnings", { token: omar.access_token, query: { period: "week" } })).body;
    expect(week).toMatchObject({ period: "week", from: "2026-10-12", rides: 1, fares_formatted: "E£27.40", cash_formatted: "E£27.40", company_share_formatted: "E£5.48", earned_formatted: "E£21.92", days: [{ date: "2026-10-12", rides: 1 }] });
    // The rider rates the driver, once.
    expect((await call("POST", "/me/rides/{ride_id}/rating", { params: [String(id)], token: rider.access_token, body: { driver: 5, comment: "Smooth" } })).body).toMatchObject({ rating: { driver: 5, comment: "Smooth" } });
    expect((await call("POST", "/me/rides/{ride_id}/rating", { params: [String(id)], token: rider.access_token, body: { driver: 4 } })).body).toMatchObject({ code: "already_rated" });
    expect((await call("GET", "/driver/me", { token: omar.access_token })).body).toMatchObject({ rating: 5, ratings_count: 1 });
    // Riders can't use the driver's screens.
    expect((await call("GET", "/driver/me", { token: rider.access_token })).body).toMatchObject({ code: "not_driver" });
    expect((await call("GET", "/driver/rides", { token: omar.access_token, query: { scope: "done" } })).body).toMatchObject({ total: 1 });
  });

  it("passes the ride on when an offer runs out, ends it when nobody takes it, and checks the rider's code to start", async () => {
    await store.saveDeliverySettings(app.id, { ...SETTINGS, rides: { ...RIDES, pin: true } }, NOW);
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    const rider = await signUp("1001112222", "Karim Hassan");
    const id = ((await ask(rider.access_token)).body as { id: number; pin: string }).id;
    const pin = (await store.getRide(app.id, id))!.pin!;
    expect(pin).toMatch(/^\d{4}$/);
    expect((await call("GET", "/me/rides/{ride_id}", { params: [String(id)], token: rider.access_token })).body).toMatchObject({ pin });
    expect((await offers(omar.access_token)).map((r) => r.id)).toEqual([id]);
    // 20 seconds pass: Omar is out, and nobody else is near.
    later(25);
    expect(await offers(omar.access_token)).toEqual([]);
    expect((await store.getRide(app.id, id))!.declinedBy).toEqual([omar.id]);
    later(SEARCH_MINUTES * 60);
    const ended = (await call("GET", "/me/rides/{ride_id}", { params: [String(id)], token: rider.access_token })).body;
    expect(ended).toMatchObject({ status: "no_driver", share_url: null });
    expect((await inbox(rider.user.id)).map(([title]) => title)).toEqual(["No driver is free"]);
    // A new ride: accepted, then started with the rider's code only.
    const again = ((await ask(rider.access_token)).body as { id: number }).id;
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(again)], token: omar.access_token });
    await step(omar.access_token, again, { status: "arrived" });
    const code = (await store.getRide(app.id, again))!.pin!;
    expect((await step(omar.access_token, again, { status: "in_progress", pin: code === "0000" ? "1111" : "0000" })).body).toMatchObject({ code: "wrong_pin" });
    expect((await step(omar.access_token, again, { status: "in_progress", pin: code })).body).toMatchObject({ status: "in_progress" });
    // Once started, the code isn't shown, and the rider can't cancel.
    expect((await call("GET", "/me/rides/{ride_id}", { params: [String(again)], token: rider.access_token })).body).toMatchObject({ pin: null });
    expect((await call("POST", "/me/rides/{ride_id}/cancel", { params: [String(again)], token: rider.access_token })).body).toMatchObject({ code: "not_cancellable" });
  });

  it("cancels for free at first, then with the company's fee, which the rider's next ride carries and settles", async () => {
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    const rider = await signUp("1001112222", "Karim Hassan");
    // While searching: free, and only one ride at a time.
    const first = ((await ask(rider.access_token)).body as { id: number }).id;
    expect((await ask(rider.access_token)).body).toMatchObject({ code: "ride_in_progress" });
    expect((await call("POST", "/me/rides/{ride_id}/cancel", { params: [String(first)], token: rider.access_token, body: { reason: "changed_plans" } })).body).toMatchObject({ status: "cancelled", fare: "0.00", cancellation: { by: "rider", reason: "changed_plans", fee_formatted: null } });
    expect(await inbox(omar.user.id)).toEqual([["New ride request", "ride_offer"], ["Ride cancelled", "ride_offer"]]);
    // Accepted 3 minutes ago: the fee.
    const second = ((await ask(rider.access_token)).body as { id: number }).id;
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(second)], token: omar.access_token });
    later(3 * 60);
    expect((await call("POST", "/me/rides/{ride_id}/cancel", { params: [String(second)], token: rider.access_token })).body).toMatchObject({ status: "cancelled", fare: "15.00", final: true, cancellation: { fee_formatted: "E£15.00" } });
    // The next ride carries it.
    const estimate = (await call("POST", "/rides/estimate", { token: rider.access_token, body: { pickup: TAHRIR, dropoff: TOWER } })).body as { previous_fee_formatted: string; options: { fare: string }[] };
    expect([estimate.previous_fee_formatted, estimate.options[0]!.fare]).toEqual(["E£15.00", "42.40"]);
    const third = ((await ask(rider.access_token)).body as { id: number; fare: string }).id;
    expect((await store.getRide(app.id, second))!.feeCarriedTo).toBe(third);
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(third)], token: omar.access_token });
    await step(omar.access_token, third, { status: "arrived" });
    await step(omar.access_token, third, { status: "in_progress" });
    later(5 * 60);
    expect((await step(omar.access_token, third, { status: "completed" })).body).toMatchObject({ fare: "42.40", collect: "42.40" });
    // 20% of the fare without the fee.
    expect((await store.getRide(app.id, third))!.commissionCents).toBe(5_48);
    expect((await store.getRide(app.id, second))!.paymentStatus).toBe("paid");
    expect((await call("POST", "/rides/estimate", { token: rider.access_token, body: { pickup: TAHRIR, dropoff: TOWER } })).body).toMatchObject({ previous_fee_formatted: null });
    // A statement per driver: the fare, the fee apart.
    const statement = await store.rideStatement(app.id, new Date(0), new Date(now.getTime() + 1));
    expect(statement).toEqual([{ driverId: omar.id, driverName: "Omar Said", rides: 1, faresCents: 27_40, cashCents: 42_40, cardCents: 0, commissionCents: 5_48, feesCents: 15_00 }]);
  });

  it("lets a driver cancel for a no-show only after waiting, and gives a ride they can't do to the next driver", async () => {
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    const sara = await driverAt("1007778888", "Sara Adel", NEAR);
    const rider = await signUp("1001112222", "Karim Hassan");
    const id = ((await ask(rider.access_token)).body as { id: number }).id;
    const first = (await offers(omar.access_token)).length ? omar : sara;
    const second = first === omar ? sara : omar;
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(id)], token: first.access_token });
    // Can't make it: back to looking, and the other driver gets it.
    expect((await step(first.access_token, id, { status: "cancelled" })).body).toMatchObject({ code: "invalid_request" });
    expect((await step(first.access_token, id, { status: "cancelled", reason: "other", note: "Flat tyre" })).body).toMatchObject({ status: "searching" });
    expect((await inbox(rider.user.id)).map(([title]) => title)).toEqual(["Your driver is on the way", "Finding you another driver"]);
    expect((await offers(second.access_token)).map((r) => r.id)).toEqual([id]);
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(id)], token: second.access_token });
    await step(second.access_token, id, { status: "arrived" });
    later(60);
    expect((await step(second.access_token, id, { status: "cancelled", reason: "rider_no_show" })).body).toMatchObject({ code: "invalid_status" });
    later(5 * 60);
    expect((await step(second.access_token, id, { status: "cancelled", reason: "rider_no_show" })).body).toMatchObject({ status: "cancelled", fare_formatted: "E£15.00" });
    expect((await store.getRide(app.id, id))!.cancellation).toEqual({ by: "driver", reason: "rider_no_show", feeCents: 15_00 });
  });

  it("asks for a card ride's fare once it ends, on the company's payment page", async () => {
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    const rider = await signUp("1001112222", "Karim Hassan");
    const id = ((await ask(rider.access_token, { payment: "card" })).body as { id: number }).id;
    expect((await call("POST", "/me/rides/{ride_id}/pay", { params: [String(id)], token: rider.access_token })).body).toMatchObject({ code: "not_payable" });
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(id)], token: omar.access_token });
    await step(omar.access_token, id, { status: "arrived" });
    await step(omar.access_token, id, { status: "in_progress" });
    later(5 * 60);
    expect((await step(omar.access_token, id, { status: "completed" })).body).toMatchObject({ collect: "0.00", collect_formatted: null, payment: { method: "card", status: "unpaid" } });
    const link = await call("POST", "/me/rides/{ride_id}/pay", { params: [String(id)], token: rider.access_token });
    expect((link.body as { url: string }).url).toMatch(/^https:\/\/yallapp\.test\/pay\//);
    const ride = (await store.getRide(app.id, id))!;
    const order = (await store.getCatalogOrder(app.id, ride.orderId!))!;
    expect(order).toMatchObject({ totalCents: 27_40, lines: [{ productId: id, quantity: 1 }] });
    await deliverPaidOrder(store, app, { ...order, status: "processing" }, now);
    expect((await store.getRide(app.id, id))!.paymentStatus).toBe("paid");
  });

  it("starts looking for a driver 15 minutes before a ride asked for later", async () => {
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    const rider = await signUp("1001112222", "Karim Hassan");
    const at = new Date(now.getTime() + 2 * 3_600_000);
    const asked = await ask(rider.access_token, { scheduled_at: at.toISOString() });
    expect(asked.body).toMatchObject({ status: "scheduled", scheduled_at: at.toISOString() });
    const id = (asked.body as { id: number }).id;
    // A scheduled ride doesn't stop the rider from asking for one now.
    expect((await ask(rider.access_token)).status).toBe(201);
    expect(await offers(omar.access_token)).toHaveLength(1);
    later(60 * 60);
    expect((await advanceRide({ store, app, now }, (await store.getRide(app.id, id))!)).status).toBe("scheduled");
    now = new Date(at.getTime() - 14 * 60_000);
    expect((await advanceRide({ store, app, now }, (await store.getRide(app.id, id))!)).status).toBe("searching");
  });

  it("offers the store review account's rides to the review driver only, and never to the company's drivers", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: "+201009990000", reviewCode: "246810" } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1009990000" } });
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: (requested.body as { request_id: string }).request_id, code: "246810", device: { ...DEVICE, id: "install-review" } } });
    const reviewer = (await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name: "App Review", device: { ...DEVICE, id: "install-review" } } })).body as { access_token: string; user: { roles: string[] } };
    expect(reviewer.user.roles).toEqual(["driver"]);
    expect((await call("GET", "/driver/me", { token: reviewer.access_token })).body).toMatchObject({ name: "App Review", vehicle_type: { id: economyId, name: "Economy" } });
    // Offline, nothing; online, the reviewers' own ride, wherever they are.
    const id = ((await ask(reviewer.access_token)).body as { id: number }).id;
    expect(await offers(omar.access_token)).toEqual([]);
    expect(await offers(reviewer.access_token)).toEqual([]);
    await call("PATCH", "/driver/me", { token: reviewer.access_token, body: { online: true } });
    expect((await offers(reviewer.access_token)).map((r) => r.id)).toEqual([id]);
    // A real rider's ride never goes to the reviewers.
    const rider = await signUp("1001112222", "Karim Hassan");
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(id)], token: reviewer.access_token });
    const real = ((await ask(rider.access_token)).body as { id: number }).id;
    expect((await offers(omar.access_token)).map((r) => r.id)).toEqual([real]);
  });

  it("105.2.6 offers the review driver a sample ride in the drivers' app, and the reviewers' notes say how to try both sides", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: "+201009990000", reviewCode: "246810" } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    await store.saveDeliverySettings(app.id, { ...SETTINGS, courierApp: "bundle" }, NOW);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1009990000" } });
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: (requested.body as { request_id: string }).request_id, code: "246810", device: { ...DEVICE, id: "install-review" } } });
    const reviewer = (await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name: "App Review", device: { ...DEVICE, id: "install-review" } } })).body as { access_token: string };
    await call("PATCH", "/driver/me", { token: reviewer.access_token, body: { online: true } });
    const [sample] = await offers(reviewer.access_token);
    expect(sample).toMatchObject({ status: "searching", payment: { method: "card", status: "paid" }, rider: { name: "App Review (sample)" } });
    // The same one while it is offered; it goes through every step.
    expect((await offers(reviewer.access_token)).map((r) => r.id)).toEqual([sample!.id]);
    const steps = ["arrived", "in_progress", "completed"];
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(sample!.id)], token: reviewer.access_token });
    for (const status of steps) {
      const moved = await call("POST", "/driver/rides/{ride_id}/status", { params: [String(sample!.id)], token: reviewer.access_token, body: { status, pin: status === "in_progress" ? "1234" : null } });
      expect(moved.body).toMatchObject({ status });
    }
    // Another once it is done; a real driver never gets one.
    expect((await offers(reviewer.access_token))[0]?.id).not.toBe(sample!.id);
    const omar = await driverAt("1005556666", "Omar Said", NEAR);
    expect(await offers(omar.access_token)).toEqual([]);

    const notes = reviewNotes(app, { ...SETTINGS, courierApp: "bundle" })!;
    expect(notes.customer).toContain("Nile Rides is a ride service.");
    expect(notes.customer).not.toContain("Driver mode");
    expect(notes.courier).toContain("Nile Rides Driver is for Nile Rides's drivers only");
    expect(notes.courier).toContain("a sample ride is offered");
    expect(reviewNotes(app, SETTINGS)!.customer).toContain("Account › Driver mode");
    // 105.9.6 A live taxi app's notes walk through the map and both roles.
    const taxi = reviewNotes({ ...app, vertical: "taxi" }, SETTINGS)!.customer;
    expect(taxi).toContain("Nile Rides is a taxi service on a live map.");
    expect(taxi).toContain("a map with the company's free taxis around you");
    expect(taxi).toContain("Set the pickup (use your location or a maps link)");
    expect(taxi).toContain("a test driver that riders never see on the map: Account › Driver mode");
    expect(taxi).toContain("accept the offer before its countdown ends");
    const searching = reviewNotes({ ...app, vertical: "taxi" }, { ...SETTINGS, taxi: { ...DEFAULT_TAXI_SETTINGS, searchUrl: "https://search.example.com" } })!.customer;
    expect(searching).toContain("Tap Where to? and search for a place");
    expect(reviewNotes(app, SETTINGS)!.customer).not.toContain("taxi");
  });

  it("refuses everything when the plan has no ride apps", async () => {
    rides = false;
    const rider = await signUp("1001112222", "Karim Hassan");
    expect((await call("POST", "/rides/estimate", { token: rider.access_token, body: { pickup: TAHRIR, dropoff: TOWER } })).body).toMatchObject({ code: "feature_disabled" });
  });
});
