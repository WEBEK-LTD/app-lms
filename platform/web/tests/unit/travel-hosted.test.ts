import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type TravelSettings } from "@/lib/data/types";
import { TravelConnector } from "@/lib/hosted/connectors/travel";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { isTrip } from "@/lib/travel/bookings";
import { parseTravelSettingsForm, travelSettingsFormValues } from "@/lib/travel/forms";
import { addDays, freeUnits, nightCents, seatCents, stayPrice } from "@/lib/travel/pricing";
import { DEFAULT_TRAVEL_SETTINGS, screensOff, TRAVEL_LIMITS, travelSettingsOf, travelTabLabels } from "@/lib/travel/settings";
import { FLIGHT_SOURCES, HOTEL_SOURCES } from "@/lib/travel/sources";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";
import { flightInput, hotelInput, roomInput } from "./travel-fixtures";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const SETTINGS: TravelSettings = { ...DEFAULT_TRAVEL_SETTINGS, currency: "USD", memberOffPercent: 5, bundleOffPercent: 10, transfer: { cents: 48_00, note: "Driver waits with your name" }, bagCents: 30_00, mealCents: 12_00 };

describe("126 travel prices", () => {
  it("prices a room's nights, taxes, the member and bundle prices, and what is free", () => {
    const room = { ...roomInput("a", 1), id: 7, createdAt: NOW, updatedAt: NOW, prices: { "2026-11-15": 200_00 }, closed: ["2026-11-20"], openUntil: "2026-12-31" };
    expect(nightCents(room, null, "2026-11-14")).toBe(150_00);
    expect(nightCents(room, { extraCents: 18_00 }, "2026-11-15")).toBe(218_00);
    expect(nightCents(room, null, "2026-11-20")).toBeNull();
    expect(nightCents(room, null, "2027-01-01")).toBeNull();
    const p = stayPrice([{ cents: 168_00 }, { cents: 168_00 }, { cents: 168_00 }], 1, { taxBp: 1750 }, { member: true, bundle: false }, { memberOffPercent: 5, bundleOffPercent: 10 });
    // 3 × 168 = 504, taxes 88.20, member price 25.20 off.
    expect(p).toMatchObject({ nightsCents: 504_00, taxCents: 88_20, memberCents: 25_20, bundleCents: 0, totalCents: 567_00 });
    expect(seatCents({ firstRow: 10, rows: 10, layout: "ABC DEF", extraRows: [12], extraCents: 24_00, seatCents: 10_00, blocked: [] }, { seat: "fee" }, "14A")).toBe(10_00);
    expect(seatCents({ firstRow: 10, rows: 10, layout: "ABC DEF", extraRows: [12], extraCents: 24_00, seatCents: 10_00, blocked: [] }, { seat: "standard" }, "12C")).toBe(24_00);
    expect(seatCents({ firstRow: 10, rows: 10, layout: "ABC DEF", extraRows: [12], extraCents: 24_00, seatCents: 10_00, blocked: [] }, { seat: "any" }, "12C")).toBe(0);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    const held = { stay: { roomId: 7, checkIn: "2026-11-14", checkOut: "2026-11-16", rooms: 1 } } as never;
    expect(freeUnits(room, [held], "2026-11-15", "2026-11-17")).toBe(1);
    expect(freeUnits(room, [held, held], "2026-11-15", "2026-11-17")).toBe(0);
    expect(freeUnits(room, [held, held], "2026-11-16", "2026-11-17")).toBe(2);
  });

  it("keeps one part on, the sources not connected yet off, and the tabs of each mode as approved", () => {
    expect(travelSettingsOf({ hotels: false, flights: false })).toMatchObject({ hotels: true, flights: false });
    expect(travelSettingsOf({ hotelSource: "supplier", flightSource: "provider" })).toMatchObject({ hotelSource: "dashboard", flightSource: "fixed" });
    expect(HOTEL_SOURCES.filter((s) => s.connected).map((s) => s.id)).toEqual(["dashboard"]);
    expect(FLIGHT_SOURCES.filter((s) => s.connected).map((s) => s.id)).toEqual(["fixed"]);
    expect(travelTabLabels("both")).toEqual(["Explore", "Stays", "Flights", "Trips", "Account"]);
    expect(travelTabLabels("hotels")).toEqual(["Explore", "Saved", "Bookings", "Messages", "Account"]);
    expect(travelTabLabels("flights")).toEqual(["Search", "Alerts", "Trips", "Help", "Account"]);
    expect(screensOff("hotels")).toContain("flights");
    expect(screensOff("flights")).toContain("stays");
  });
});

describe("126 travel apps on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let travel: boolean;
  let hotelId: number;
  let roomId: number;
  let outId: number;
  let backId: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "travel");
    app = {
      ...base,
      backend: "hosted",
      appName: "Safra",
      websiteDoneAt: NOW,
      connector: { kind: "travel" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    await store.saveTravelSettings(app.id, SETTINGS, NOW);
    hotelId = (await store.createTravelHotel(hotelInput(app.id), NOW)).id;
    roomId = (await store.createTravelRoom(roomInput(app.id, hotelId), NOW)).id;
    outId = (await store.createTravelFlight(flightInput(app.id), NOW)).id;
    backId = (await store.createTravelFlight(flightInput(app.id, { number: "SF 690", from: flightInput(app.id).to, to: flightInput(app.id).from, departs: "2026-11-18T18:40", arrives: "2026-11-18T19:45" }), NOW)).id;
    sender = new LogSender();
    now = NOW;
    travel = true;
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
    connector: new TravelConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", travel, signingSecret: "test-signing" }),
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
    return (registered.body as { access_token: string }).access_token;
  }

  /** Signs in again, once time moved past the session. */
  async function signIn(phone: string) {
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    return (verified.body as { access_token: string }).access_token;
  }

  const stay = (patch: Record<string, unknown> = {}) => ({ hotel_id: hotelId, room_id: roomId, rate_id: "bb", check_in: "2026-11-14", check_out: "2026-11-17", guests: 2, rooms: 1, ...patch });
  const travellers = [{ first_name: "Layla", last_name: "Hassan" }];
  const contact = { name: "Layla Hassan", email: "layla@example.com", phone: "+201000000000" };

  it("sends Config.travel: the mode, the payments, the saving, the transfer, the one hotel, the font", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(config.travel).toMatchObject({
      mode: "both",
      hotels: true,
      flights: true,
      currency: "USD",
      single_hotel_id: hotelId,
      payment: { now: true, at_hotel: true },
      member_off_percent: 5,
      bundle_off_percent: 10,
      transfer: { price: "48.00", price_formatted: "$48.00", note: "Driver waits with your name" },
      themes: ["Desert", "Spa"],
      amenities: [
        { id: "pool", icon: "pool" },
        { id: "spa", icon: "spa" },
        { id: "wifi", icon: "wifi" },
        { id: "breakfast", icon: "free_breakfast" },
        { id: "shuttle", icon: "airport_shuttle" },
      ],
    });
    expect((config.travel as { display_font: { family: string } }).display_font.family).toBe("Fraunces");
    // Flights only: no hotel part.
    await store.saveTravelSettings(app.id, { ...SETTINGS, hotels: false }, NOW);
    const flightsOnly = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { travel: Record<string, unknown> };
    expect(flightsOnly.travel).toMatchObject({ mode: "flights", single_hotel_id: null, transfer: null, bundle_off_percent: 0 });
    expect((await call("GET", "/travel/hotels")).status).toBe(404);
  });

  it("searches hotels with each one's cheapest stay for the dates, taxes in, and its page with every rate", async () => {
    const search = await call("GET", "/travel/hotels", { query: { city: "luxor", check_in: "2026-11-14", check_out: "2026-11-17", guests: "2" } });
    const found = search.body as { items: Record<string, unknown>[]; total: number; nights: number };
    expect(found.total).toBe(1);
    expect(found.nights).toBe(3);
    // Room only, 3 × 150 = 450, plus 17.5% taxes.
    expect(found.items[0]).toMatchObject({ name: "Nile Garden Resort", free_cancellation: true, pay_at_hotel: true, breakfast: true, from_nightly_formatted: "$150.00", price: { nights: 3, total: "528.75", member: false } });
    expect(found.items[0]!.photo_urls).toEqual([ASSETS("pool-1"), ASSETS("suite-1")]);
    expect(((await call("GET", "/travel/hotels", { query: { city: "Istanbul" } })).body as { total: number }).total).toBe(0);
    expect((await call("GET", "/travel/hotels", { query: { check_in: "2026-11-17", check_out: "2026-11-14" } })).status).toBe(400);
    // Signed in: the member price.
    const token = await signUp("1001112222", "Layla Hassan");
    const member = (await call("GET", "/travel/hotels", { token, query: { check_in: "2026-11-14", check_out: "2026-11-17" } })).body as { items: { price: Record<string, unknown> }[] };
    expect(member.items[0]!.price).toMatchObject({ total: "506.25", was_total_formatted: "$528.75", member: true });
    const page = (await call("GET", "/travel/hotels/{hotel_id}", { params: [String(hotelId)], query: { check_in: "2026-11-14", check_out: "2026-11-17" } })).body as { rooms: { rates: { id: string; free_cancel_until: string | null; price: { total: string } }[]; left: number | null }[] };
    expect(page.rooms[0]!.left).toBe(2);
    expect(page.rooms[0]!.rates.map((r) => [r.id, r.free_cancel_until, r.price.total])).toEqual([
      ["room", null, "528.75"],
      ["bb", "2026-11-12", "592.20"],
    ]);
    expect((await call("GET", "/travel/hotels/{hotel_id}", { params: ["999"] })).status).toBe(404);
  });

  it("finds return flights with their fares, the best, cheapest and fastest, the month's prices and the seats", async () => {
    const result = (await call("GET", "/travel/flights", { query: { from: "CAI", to: "lxr", depart: "2026-11-14", return: "2026-11-18", adults: "2" } })).body as {
      items: { id: string; fares: { id: string; price: string; seats_left: number | null }[]; tags: string[] }[];
      cheapest_formatted: string;
    };
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe(`${outId}-${backId}`);
    expect(result.items[0]!.tags).toEqual(["best", "cheapest", "fastest"]);
    expect(result.items[0]!.fares.map((f) => [f.id, f.price, f.seats_left])).toEqual([
      ["light", "240.00", 3],
      ["standard", "300.00", null],
      ["flex", "400.00", 4],
    ]);
    expect(result.cheapest_formatted).toBe("$240.00");
    const month = (await call("GET", "/travel/flights/calendar", { query: { from: "CAI", to: "LXR", month: "2026-11", nights: "4" } })).body as { days: { date: string; price: string | null }[] };
    expect(month.days).toHaveLength(30);
    expect(month.days.find((d) => d.price !== null)).toMatchObject({ date: "2026-11-14", price: "240.00" });
    const seats = (await call("GET", "/travel/flights/{flight_id}/seats", { params: [String(outId)] })).body as { columns: string[]; rows: { number: number; extra_legroom: boolean; seats: { id: string; taken: boolean }[] }[] };
    expect(seats.columns).toEqual(["A", "B", "C", "", "D", "E", "F"]);
    expect(seats.rows[0]!.seats[0]).toEqual({ id: "10A", taken: true });
    expect(seats.rows[2]!.extra_legroom).toBe(true);
  });

  it("prices a trip as one: the fares, the stay less the bundle and member prices, the transfer", async () => {
    const token = await signUp("1001112222", "Layla Hassan");
    const quote = (await call("POST", "/travel/quote", { token, body: { stay: stay(), flight: { outbound_id: outId, inbound_id: backId, fare: "standard", travellers: 2, seats_out: ["12C", "12D"], bags: 1 }, transfer: true } })).body as {
      lines: { kind: string; amount: string }[];
      total: string;
      saving_formatted: string;
      payment: { at_hotel: boolean };
      refundable: boolean;
    };
    expect(quote.lines.map((l) => [l.kind, l.amount])).toEqual([
      ["fare", "600.00"],
      ["seats", "48.00"],
      ["bags", "30.00"],
      ["nights", "504.00"],
      ["taxes", "88.20"],
      ["member", "-25.20"],
      ["bundle", "-50.40"],
      ["transfer", "48.00"],
    ]);
    expect(quote.total).toBe("1242.60");
    expect(quote.saving_formatted).toBe("$75.60");
    expect(quote.payment.at_hotel).toBe(false);
    expect(quote.refundable).toBe(true);
    expect((await call("POST", "/travel/quote", { body: { flight: { outbound_id: outId, fare: "standard", seats_out: ["10A"] } } })).status).toBe(409);
  });

  it("books a stay paid at the hotel, never more rooms than there are, and cancels it for free while it can", async () => {
    const token = await signUp("1001112222", "Layla Hassan");
    const book = (body: Record<string, unknown>) => call("POST", "/me/travel/bookings", { token, body: { travellers, contact, payment: "at_hotel", ...body } });
    const first = await book({ stay: stay() });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ kind: "stay", status: "confirmed", payment: { method: "at_hotel", status: "at_hotel", due: null }, can_cancel: true, can_change: true, stay: { nights: 3, free_cancel_until: "2026-11-12" } });
    expect((first.body as { reference: string }).reference).toMatch(/^T-[2-9A-Z]{6}$/);
    expect((await book({ stay: stay({ rate_id: "room" }) })).status).toBe(409);
    expect((await book({ stay: stay(), payment: "now" })).status).toBe(201);
    // Both rooms taken on the 15th.
    const third = await book({ stay: stay({ check_in: "2026-11-15", check_out: "2026-11-16" }) });
    expect(third.body).toMatchObject({ code: "not_available" });
    const id = (first.body as { id: number }).id;
    const changed = await call("POST", "/me/travel/bookings/{booking_id}/change", { token, params: [String(id)], body: { check_in: "2026-11-20", check_out: "2026-11-22" } });
    // 2 × 168 = 336, taxes 58.80, the member price 16.80 off.
    expect(changed.body).toMatchObject({ stay: { check_in: "2026-11-20", nights: 2 }, total: "378.00" });
    const cancelled = await call("POST", "/me/travel/bookings/{booking_id}/cancel", { token, params: [String(id)] });
    expect(cancelled.body).toMatchObject({ status: "cancelled", can_cancel: false, cancellation: { by: "customer", refund_formatted: null } });
    expect((await call("GET", "/me/travel/bookings", { token })).body).toMatchObject({ total: 1 });
    expect((await call("GET", "/me/travel/bookings", { token, query: { scope: "past" } })).body).toMatchObject({ total: 1 });
  });

  it("books a flight paid now, holds the seats for 30 minutes, confirms it once paid and opens the boarding passes", async () => {
    let token = await signUp("1001112222", "Layla Hassan");
    const made = await call("POST", "/me/travel/bookings", { token, body: { flight: { outbound_id: outId, fare: "light", travellers: 1, seats_out: ["14A"] }, travellers, contact, payment: "now" } });
    expect(made.body).toMatchObject({ kind: "flight", status: "awaiting_payment", payment: { due: "130.00" }, flights: [{ leg: "out", seats: ["14A"], fare_name: "Light" }], passes_open: false });
    const id = (made.body as { id: number }).id;
    // The seat is held.
    const seats = (await call("GET", "/travel/flights/{flight_id}/seats", { params: [String(outId)] })).body as { rows: { seats: { id: string; taken: boolean }[] }[] };
    expect(seats.rows[4]!.seats[0]).toEqual({ id: "14A", taken: true });
    const link = await call("POST", "/me/travel/bookings/{booking_id}/pay", { token, params: [String(id)] });
    expect((link.body as { url: string }).url).toMatch(/^https:\/\/yallapp\.test\/pay\//);
    const booking = (await store.getTravelBooking(app.id, id))!;
    const order = (await store.getCatalogOrder(app.id, booking.orderId!))!;
    expect(order).toMatchObject({ totalCents: 130_00, lines: [{ productId: id }] });
    await deliverPaidOrder(store, app, { ...order, status: "processing" }, now);
    expect((await call("GET", "/me/travel/bookings/{booking_id}", { token, params: [String(id)] })).body).toMatchObject({ status: "confirmed", payment: { status: "paid", due: null, paid_formatted: "$130.00" } });
    expect((await call("GET", "/me/travel/bookings/{booking_id}/passes", { token, params: [String(id)] })).status).toBe(409);
    // A light fare can't be refunded.
    expect((await call("GET", "/me/travel/bookings/{booking_id}", { token, params: [String(id)] })).body).toMatchObject({ cancel_refund_formatted: null });
    // Two days before: check-in opens.
    now = new Date("2026-11-12T12:00:00Z");
    token = await signIn("1001112222");
    const passes = (await call("GET", "/me/travel/bookings/{booking_id}/passes", { token, params: [String(id)] })).body as { items: Record<string, unknown>[] };
    expect(passes.items).toHaveLength(1);
    expect(passes.items[0]).toMatchObject({ leg: "out", passenger: "LAYLA HASSAN", seat: "14A", group: 4, fare_name: "Light" });
    expect(passes.items[0]!.code).toMatch(/^YT1\.T-[2-9A-Z]{6}\.\d+\.1\.[\w-]{10}$/);
    // The company moves the flight: the booking shows it.
    await store.updateTravelFlight(app.id, outId, { status: "delayed", gate: "B12", statusNote: "Gate changed to B12" }, now);
    expect((await call("GET", "/me/travel/bookings/{booking_id}", { token, params: [String(id)] })).body).toMatchObject({ flights: [{ status: "delayed", gate: "B12", status_note: "Gate changed to B12" }] });
  });

  it("releases an unpaid booking after its hold, and changes seats with what they cost", async () => {
    let token = await signUp("1001112222", "Layla Hassan");
    const made = await call("POST", "/me/travel/bookings", { token, body: { flight: { outbound_id: outId, fare: "standard", travellers: 1 }, travellers, contact, payment: "now" } });
    const id = (made.body as { id: number }).id;
    const seated = await call("PUT", "/me/travel/bookings/{booking_id}/seats", { token, params: [String(id)], body: { leg: "out", seats: ["12A"] } });
    expect(seated.body).toMatchObject({ flights: [{ seats: ["12A"] }], total: "174.00" });
    expect((await call("PUT", "/me/travel/bookings/{booking_id}/seats", { token, params: [String(id)], body: { leg: "out", seats: ["10A"] } })).status).toBe(409);
    now = new Date(now.getTime() + 31 * 60_000);
    token = await signIn("1001112222");
    expect((await call("GET", "/me/travel/bookings/{booking_id}", { token, params: [String(id)] })).body).toMatchObject({ status: "cancelled", cancellation: { by: "unpaid" } });
  });

  it("takes a review after the stay, saves hotels and watches a route's price", async () => {
    let token = await signUp("1001112222", "Layla Hassan");
    const made = await call("POST", "/me/travel/bookings", { token, body: { stay: stay(), travellers, contact, payment: "at_hotel" } });
    const id = (made.body as { id: number }).id;
    expect((await call("POST", "/me/travel/bookings/{booking_id}/review", { token, params: [String(id)], body: { score: 9 } })).status).toBe(409);
    now = new Date("2026-11-19T10:00:00Z");
    token = await signIn("1001112222");
    const reviewed = await call("POST", "/me/travel/bookings/{booking_id}/review", { token, params: [String(id)], body: { score: 9, staff: 10, clean: 9, location: 9, value: 8, trip: "couple", text: "The staff remembered our names." } });
    expect(reviewed.body).toMatchObject({ status: "completed", stay: { can_review: false, review: { name: "Layla", score: 9 } } });
    expect((await call("GET", "/travel/hotels/{hotel_id}", { params: [String(hotelId)] })).body).toMatchObject({ score: 9, reviews: 1, scores: { staff: 10, value: 8 }, quote: { text: "The staff remembered our names." } });
    expect((await call("PUT", "/me/travel/saved/{hotel_id}", { token, params: [String(hotelId)] })).status).toBe(204);
    expect((await call("GET", "/me/travel/saved", { token })).body).toMatchObject({ items: [{ id: hotelId, saved: true }] });
    expect((await call("DELETE", "/me/travel/saved/{hotel_id}", { token, params: [String(hotelId)] })).status).toBe(204);
    now = new Date(NOW.getTime() + 3600_000);
    token = await signIn("1001112222");
    const alert = await call("POST", "/me/travel/alerts", { token, body: { kind: "flight", from: "CAI", to: "LXR", month: "2026-11", nights: 4, travellers: 1 } });
    expect(alert.body).toMatchObject({ kind: "flight", from: { code: "CAI", city: "Cairo" }, to: { code: "LXR" }, price: "240.00", direction: "same" });
    await store.updateTravelFlight(app.id, outId, { fares: flightInput(app.id).fares.map((f) => (f.id === "light" ? { ...f, cents: 100_00 } : f)) }, now);
    expect((await call("GET", "/me/travel/alerts", { token })).body).toMatchObject({ items: [{ price: "220.00", change_formatted: "−$20.00", direction: "down", advice: "book_now" }] });
    expect((await call("GET", "/travel/explore", { token })).body).toMatchObject({ from: { code: "CAI" }, destinations: [{ city: "Luxor", code: "LXR", hotels: 1 }], alert: { direction: "down" } });
    const alertId = (alert.body as { id: number }).id;
    expect((await call("DELETE", "/me/travel/alerts/{alert_id}", { token, params: [String(alertId)] })).status).toBe(204);
    expect((await call("GET", "/me/travel/alerts", { token })).body).toMatchObject({ items: [] });
  });

  it("126.10 lowers the refund again when a change raises the total back, and the pay link is one order", async () => {
    const token = await signUp("1001112222", "Layla Hassan");
    const made = await call("POST", "/me/travel/bookings", { token, body: { stay: stay({ check_out: "2026-11-19" }), travellers, contact, payment: "now" } });
    const id = (made.body as { id: number }).id;
    const link = await call("POST", "/me/travel/bookings/{booking_id}/pay", { token, params: [String(id)] });
    // Tapped again: the same link to the same order.
    expect((await call("POST", "/me/travel/bookings/{booking_id}/pay", { token, params: [String(id)] })).body).toEqual(link.body);
    const order = (await store.getCatalogOrder(app.id, (await store.getTravelBooking(app.id, id))!.orderId!))!;
    await deliverPaidOrder(store, app, { ...order, status: "processing" }, now);
    const paid = (await store.getTravelBooking(app.id, id))!;
    expect(paid).toMatchObject({ status: "confirmed", paymentStatus: "paid", paidCents: paid.totalCents, refundCents: 0 });
    const shorter = await call("POST", "/me/travel/bookings/{booking_id}/change", { token, params: [String(id)], body: { check_in: "2026-11-14", check_out: "2026-11-15" } });
    expect(shorter.body).toMatchObject({ payment: { status: "refund_due" } });
    const short = (await store.getTravelBooking(app.id, id))!;
    expect(short.refundCents).toBe(paid.paidCents - short.totalCents);
    const back = await call("POST", "/me/travel/bookings/{booking_id}/change", { token, params: [String(id)], body: { check_in: "2026-11-14", check_out: "2026-11-19" } });
    expect(back.body).toMatchObject({ payment: { status: "paid", due: null } });
    expect((await store.getTravelBooking(app.id, id))!).toMatchObject({ refundCents: 0, paymentStatus: "paid", totalCents: paid.totalCents });
  });

  it("126.10 prices a stay and a flight as one trip only when the flight lands where and when the stay starts", async () => {
    const token = await signUp("1001112222", "Layla Hassan");
    const kinds = async (body: Record<string, unknown>) => ((await call("POST", "/travel/quote", { token, body })).body as { lines: { kind: string }[] }).lines.map((l) => l.kind);
    const flight = { outbound_id: outId, inbound_id: backId, fare: "standard", travellers: 2 };
    // Lands the day before check-in, leaves on check-out day: one trip.
    expect(await kinds({ stay: stay({ check_in: "2026-11-15", check_out: "2026-11-18" }), flight, transfer: true })).toEqual(["fare", "nights", "taxes", "member", "bundle", "transfer"]);
    // A stay a week later than the flight: no bundle price, no transfer.
    expect(await kinds({ stay: stay({ check_in: "2026-11-20", check_out: "2026-11-22" }), flight: { ...flight, inbound_id: null }, transfer: true })).toEqual(["fare", "nights", "taxes", "member"]);
    // Back two days after check-out: not one trip.
    expect(await kinds({ stay: stay({ check_in: "2026-11-14", check_out: "2026-11-16" }), flight, transfer: true })).toEqual(["fare", "nights", "taxes", "member"]);
    const city = { city: "Luxor" };
    const out = { to: { code: "LXR", city: "Luxor", airport: null, terminal: null }, arrives: "2026-11-14T11:20" };
    const home = { from: { code: "LXR", city: "Luxor", airport: null, terminal: null }, departs: "2026-11-18T18:40" };
    expect(isTrip({ checkIn: "2026-11-14", checkOut: "2026-11-18" }, city, out, home)).toBe(true);
    expect(isTrip({ checkIn: "2026-11-16", checkOut: "2026-11-18" }, city, out, home)).toBe(false);
    expect(isTrip({ checkIn: "2026-11-14", checkOut: "2026-11-18" }, { city: "Aswan" }, out, null)).toBe(false);
    expect(isTrip({ checkIn: "2026-11-14", checkOut: "2026-11-18" }, city, out, null)).toBe(true);
  });

  it("126.10 signs the boarding passes with a key made from the platform's signing secret", async () => {
    let token = await signUp("1001112222", "Layla Hassan");
    const made = await call("POST", "/me/travel/bookings", { token, body: { flight: { outbound_id: outId, fare: "light", travellers: 1 }, travellers, contact, payment: "now" } });
    const id = (made.body as { id: number }).id;
    await store.updateTravelBooking(app.id, id, { status: "confirmed", paymentStatus: "paid", paidCents: 120_00, holdUntil: null }, { statuses: ["awaiting_payment"] }, now);
    now = new Date("2026-11-13T12:00:00Z");
    token = await signIn("1001112222");
    const passes = (await call("GET", "/me/travel/bookings/{booking_id}/passes", { token, params: [String(id)] })).body as { items: { code: string }[] };
    const reference = (made.body as { reference: string }).reference;
    const body = `${reference}.${outId}.1`;
    const key = createHmac("sha256", "test-signing").update(`travel-passes:${app.id}`).digest("base64url");
    expect(passes.items[0]!.code).toBe(`YT1.${body}.${createHmac("sha256", key).update(`${app.id}.${body}`).digest("base64url").slice(0, 10)}`);
    expect(passes.items[0]!.code).not.toBe(`YT1.${body}.${createHmac("sha256", `test-signing:${app.id}`).update(body).digest("base64url").slice(0, 10)}`);
  });

  it("126.10 counts today, the sale and cancel deadlines and the flights' times in the company's time zone", async () => {
    expect(travelSettingsOf(null).timeZone).toBe("Europe/Istanbul");
    expect(travelSettingsOf({}, { timeZone: "Asia/Dubai" }).timeZone).toBe("Asia/Dubai");
    expect(travelSettingsOf({ timeZone: "Africa/Cairo" }, { timeZone: "Asia/Dubai" }).timeZone).toBe("Africa/Cairo");
    expect(travelSettingsOf({ timeZone: "Mars/Base" }).timeZone).toBe("Europe/Istanbul");
    const form = travelSettingsFormValues(travelSettingsOf(SETTINGS));
    expect(parseTravelSettingsForm({ ...form, timeZone: "Africa/Cairo" })).toMatchObject({ ok: true, value: { timeZone: "Africa/Cairo" } });
    expect(parseTravelSettingsForm({ ...form, timeZone: "Mars/Base" })).toMatchObject({ ok: false, errors: { timeZone: "Choose a time zone." } });
    // 05:30 UTC is 08:30 in Istanbul: SF 691 leaves at 10:15 there, in less than two hours, so it isn't sold anymore.
    now = new Date("2026-11-14T05:30:00Z");
    const search = { from: "CAI", to: "LXR", depart: "2026-11-14" };
    expect(((await call("GET", "/travel/flights", { query: search })).body as { items: unknown[] }).items).toHaveLength(0);
    // In Cairo (an hour behind) it leaves in 2 h 45: still sold.
    await store.saveTravelSettings(app.id, { ...SETTINGS, timeZone: "Africa/Cairo" }, now);
    expect(((await call("GET", "/travel/flights", { query: search })).body as { items: unknown[] }).items).toHaveLength(1);
    const token = await signUp("1001112222", "Layla Hassan");
    const made = await call("POST", "/me/travel/bookings", { token, body: { flight: { outbound_id: outId, fare: "light", travellers: 1 }, travellers, contact, payment: "now" } });
    expect(made.body).toMatchObject({ starts: "2026-11-14T10:15", starts_at: "2026-11-14T08:15:00.000Z" });
    // In Auckland it's already the 14th: the 13th has passed.
    await store.saveTravelSettings(app.id, { ...SETTINGS, timeZone: "Pacific/Auckland" }, now);
    now = new Date("2026-11-13T12:00:00Z");
    expect((await call("GET", "/travel/hotels", { query: { check_in: "2026-11-13", check_out: "2026-11-15" } })).status).toBe(400);
    expect((await call("GET", "/travel/hotels", { query: { check_in: "2026-11-14", check_out: "2026-11-15" } })).status).toBe(200);
  });

  it("126.10 completes a flight-only booking once it has landed, and keeps a trip with a flight back open after check-out", async () => {
    let token = await signUp("1001112222", "Layla Hassan");
    const flightOnly = await call("POST", "/me/travel/bookings", { token, body: { flight: { outbound_id: outId, fare: "light", travellers: 1 }, travellers, contact, payment: "now" } });
    const trip = await call("POST", "/me/travel/bookings", { token, body: { stay: stay(), flight: { outbound_id: outId, inbound_id: backId, fare: "standard", travellers: 1 }, travellers, contact, payment: "now" } });
    for (const made of [flightOnly, trip]) {
      const b = (await store.getTravelBooking(app.id, (made.body as { id: number }).id))!;
      await store.updateTravelBooking(app.id, b.id, { status: "confirmed", paymentStatus: "paid", paidCents: b.totalCents, holdUntil: null }, { statuses: ["awaiting_payment"] }, now);
    }
    // The day after check-out (the 17th), before the flight back leaves at 18:40.
    now = new Date("2026-11-18T13:00:00Z");
    token = await signIn("1001112222");
    expect((await call("GET", "/me/travel/bookings/{booking_id}", { token, params: [String((flightOnly.body as { id: number }).id)] })).body).toMatchObject({ status: "completed" });
    const tripId = String((trip.body as { id: number }).id);
    expect((await call("GET", "/me/travel/bookings/{booking_id}", { token, params: [tripId] })).body).toMatchObject({ status: "confirmed", passes_open: true });
    expect((await call("GET", "/me/travel/bookings/{booking_id}/passes", { token, params: [tripId] })).status).toBe(200);
  });

  it("126.10 prices stays up to TRAVEL_LIMITS.priceDays ahead", async () => {
    const last = addDays("2026-10-12", TRAVEL_LIMITS.priceDays);
    expect((await call("GET", "/travel/hotels", { query: { check_in: last, check_out: addDays(last, 1) } })).status).toBe(200);
    expect((await call("GET", "/travel/hotels", { query: { check_in: addDays(last, 1), check_out: addDays(last, 2) } })).body).toMatchObject({ code: "invalid_request" });
  });

  it("answers feature_disabled when travel isn't in the plan", async () => {
    travel = false;
    expect((await call("GET", "/travel/places")).status).toBe(403);
  });
});
