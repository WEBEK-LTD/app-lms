import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type TravelSettings } from "@/lib/data/types";
import { TravelConnector } from "@/lib/hosted/connectors/travel";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { DEFAULT_TRAVEL_SETTINGS } from "@/lib/travel/settings";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";
import { flightInput, hotelInput, roomInput } from "./travel-fixtures";

/**
 * 126 The travel API's answers the app's widget tests show
 * (mobile/test/support/travel_api.json): a hotel with its rooms, a return
 * flight with its fares and seats, a stay + flight priced and booked, its
 * boarding passes and two price alerts, as the hosted API serves them, so
 * the app is tested against what the platform really sends.
 * YALLAPP_WRITE_TRAVEL_API=1 writes the file again.
 */
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const SETTINGS: TravelSettings = { ...DEFAULT_TRAVEL_SETTINGS, currency: "USD", memberOffPercent: 5, bundleOffPercent: 10, transfer: { cents: 48_00, note: "Driver waits with your name" }, bagCents: 30_00, mealCents: 12_00 };

it("is what the app's travel tests show (mobile/test/support/travel_api.json)", async () => {
  const { store } = await setupClient();
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const base = newApp(client.id, null, NOW, "travel");
  const app = {
    ...base,
    backend: "hosted" as const,
    appName: "Safra",
    websiteDoneAt: NOW,
    connector: { kind: "travel" as const },
    hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
    catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
  };
  await store.createApp(app);
  await store.saveTravelSettings(app.id, SETTINGS, NOW);
  const hotelId = (await store.createTravelHotel(hotelInput(app.id), NOW)).id;
  await store.createTravelHotel(hotelInput(app.id, { name: "Old Town House", city: "Luxor", kind: "boutique", stars: 4, featured: false, position: 2 }), NOW).then((h) => store.createTravelRoom(roomInput(app.id, h.id, { name: "Courtyard room", nightlyCents: 90_00 }), NOW));
  const roomId = (await store.createTravelRoom(roomInput(app.id, hotelId), NOW)).id;
  const outId = (await store.createTravelFlight(flightInput(app.id, { checkInOpen: true, gate: "B12", boardsAt: "09:35", status: "on_time" }), NOW)).id;
  const backId = (await store.createTravelFlight(flightInput(app.id, { number: "SF 690", from: flightInput(app.id).to, to: flightInput(app.id).from, departs: "2026-11-18T18:40", arrives: "2026-11-18T19:45" }), NOW)).id;
  const sender = new LogSender();
  let now = NOW;
  const context = (): HostedContext => ({
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
    connector: new TravelConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", travel: true, signingSecret: "test-signing" }),
  });
  const out: Record<string, unknown> = {};
  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}) {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result.body as Record<string, unknown>;
  }
  const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  now = new Date(now.getTime() + 61_000);
  const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1001112222" } });
  const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requested.request_id, code: sender.sent.get("+201001112222")!, device: DEVICE } });
  const registered = await call("POST", "/auth/register", { body: { signup_token: verified.signup_token, name: "Layla Hassan", device: DEVICE } });
  const token = registered.access_token as string;
  out.config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).travel;
  out.explore = await call("GET", "/travel/explore", { query: { from: "CAI" } });
  out.places = await call("GET", "/travel/places");
  const stayQuery = { check_in: "2026-11-14", check_out: "2026-11-17", guests: "2" };
  out.hotels = await call("GET", "/travel/hotels", { query: stayQuery, token });
  out.hotel = await call("GET", "/travel/hotels/{hotel_id}", { params: [String(hotelId)], query: stayQuery, token });
  out.flights = await call("GET", "/travel/flights", { query: { from: "CAI", to: "LXR", depart: "2026-11-14", return: "2026-11-18", adults: "2" } });
  out.calendar = await call("GET", "/travel/flights/calendar", { query: { from: "CAI", to: "LXR", month: "2026-11", nights: "4", adults: "2" } });
  out.seats = await call("GET", "/travel/flights/{flight_id}/seats", { params: [String(outId)] });
  const choice = {
    stay: { hotel_id: hotelId, room_id: roomId, rate_id: "bb", check_in: "2026-11-14", check_out: "2026-11-18", guests: 2, rooms: 1 },
    flight: { outbound_id: outId, inbound_id: backId, fare: "standard", travellers: 2, seats_out: ["14A", "14B"], seats_back: [null, null], bags: 1, meals: 0 },
    transfer: true,
  };
  out.quote = await call("POST", "/travel/quote", { body: choice, token });
  out.stayQuote = await call("POST", "/travel/quote", { body: { stay: choice.stay }, token });
  const booking = await call("POST", "/me/travel/bookings", {
    token,
    body: { ...choice, travellers: [{ first_name: "Layla", last_name: "Hassan" }, { first_name: "Omar", last_name: "Hassan" }], contact: { name: "Layla Hassan", email: "layla@example.com", phone: "+201001112222" }, requests: ["late_arrival"], payment: "now" },
  });
  out.unpaid = booking;
  await store.updateTravelBooking(app.id, booking.id as number, { status: "confirmed", paymentStatus: "paid", paidCents: (await store.getTravelBooking(app.id, booking.id as number))!.totalCents, holdUntil: null }, { statuses: ["awaiting_payment"] }, now);
  out.booking = await call("GET", "/me/travel/bookings/{booking_id}", { params: [String(booking.id)], token });
  out.bookings = await call("GET", "/me/travel/bookings", { token });
  out.passes = await call("GET", "/me/travel/bookings/{booking_id}/passes", { params: [String(booking.id)], token });
  await call("POST", "/me/travel/alerts", { token, body: { kind: "flight", from: "CAI", to: "LXR", month: "2026-11", travellers: 2, nights: 4 } });
  await call("POST", "/me/travel/alerts", { token, body: { kind: "anywhere", from: "CAI", max_price: "600" } });
  out.alerts = await call("GET", "/me/travel/alerts", { token });
  // The booking's reference is drawn at random (and the passes' codes sign it): the file has its own.
  const data = `${JSON.stringify(out, null, 1)}\n`.replaceAll(booking.reference as string, "T-SAFRA1").replace(/"YT1\.T-SAFRA1\.(\d+)\.(\d+)\.[A-Za-z0-9_-]+"/g, '"YT1.T-SAFRA1.$1.$2.signed"');
  const file = join(process.cwd(), "..", "..", "mobile", "test", "support", "travel_api.json");
  if (process.env.YALLAPP_WRITE_TRAVEL_API) writeFileSync(file, data);
  expect(readFileSync(file, "utf8")).toBe(data);
});
