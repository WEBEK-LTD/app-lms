import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings } from "@/lib/data/types";
import { parseCourierForm, parseDeliverySettings, parseServiceForm, parseZones, zonesText } from "@/lib/delivery/forms";
import { coordinatesIn, isMapsLink, locateMapLink } from "@/lib/delivery/locate";
import { deliveryServicePageItems } from "@/lib/delivery/page-items";
import { distanceKm, quoteShipment } from "@/lib/delivery/pricing";
import { reviewNotes } from "@/lib/delivery/review";
import { shipmentIdOf, shipmentReference } from "@/lib/delivery/service";
import { DEFAULT_DELIVERY_SETTINGS, pricesSet } from "@/lib/delivery/settings";
import { DeliveryConnector } from "@/lib/hosted/connectors/delivery";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { blockTypesFor, itemSourcesFor } from "@/lib/pages/sources";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
// Tahrir Square and the Cairo Tower: about 1.5 km apart.
const TAHRIR = { address: "Tahrir Square, Cairo", details: "Gate 2", lat: 30.0444, lng: 31.2357 };
const TOWER = { address: "Cairo Tower, Zamalek", lat: 30.0459, lng: 31.2243 };

const SETTINGS: DeliverySettings = {
  ...DEFAULT_DELIVERY_SETTINGS,
  currency: "EGP",
  pricing: "distance",
  baseCents: 20_00,
  perKmCents: 10_00,
  minCents: 30_00,
  maxKm: 50,
  zones: [
    { id: "z1", name: "Maadi", cents: 45_00 },
    { id: "z2", name: "Zamalek", cents: 60_00 },
  ],
  cash: true,
  card: true,
};

describe("104 delivery prices", () => {
  it("measures the straight line, rounded up to the next 100 metres", () => {
    expect(distanceKm(TAHRIR, TOWER)).toBe(1.2);
    expect(distanceKm(TAHRIR, TAHRIR)).toBe(0);
    // Cairo to Alexandria, about 180 km.
    expect(distanceKm(TAHRIR, { lat: 31.2001, lng: 29.9187 })).toBeGreaterThan(175);
  });

  it("prices by distance, by area or one price, plus the service's amount", () => {
    const place = (p: { address: string; lat: number; lng: number }) => ({ address: p.address, details: null, lat: p.lat, lng: p.lng });
    const service = { id: 1, appId: "a", name: "Express", description: null, imageAssetId: null, extraCents: 25_00, eta: null, position: 1, active: true, createdAt: NOW, updatedAt: NOW };
    const input = { pickup: place(TAHRIR), dropoff: place(TOWER), zoneId: null, service: null };
    // 20 + 10 × 1.2 = 32, over the 30 minimum.
    expect(quoteShipment(SETTINGS, input)).toMatchObject({ ok: true, cents: 32_00, distanceKm: 1.2 });
    expect(quoteShipment(SETTINGS, { ...input, service })).toMatchObject({ ok: true, cents: 57_00 });
    expect(quoteShipment({ ...SETTINGS, baseCents: 0 }, input)).toMatchObject({ ok: true, cents: 30_00 });
    expect(quoteShipment(SETTINGS, { ...input, dropoff: { ...input.dropoff, lat: null, lng: null } })).toMatchObject({ ok: false, field: "dropoff" });
    expect(quoteShipment({ ...SETTINGS, maxKm: 1 }, input)).toMatchObject({ ok: false, error: "We deliver up to 1 km. These places are 1.2 km apart." });
    const zone = { ...SETTINGS, pricing: "zone" as const };
    expect(quoteShipment(zone, { ...input, zoneId: "z2" })).toMatchObject({ ok: true, cents: 60_00, zone: { name: "Zamalek" } });
    expect(quoteShipment(zone, { ...input, zoneId: null })).toMatchObject({ ok: false, field: "zone_id" });
    expect(quoteShipment(zone, { ...input, zoneId: "z9" })).toMatchObject({ ok: false, field: "zone_id" });
    // A place without coordinates is fine by area or one price.
    const noMap = { ...input, dropoff: { ...input.dropoff, lat: null, lng: null } };
    expect(quoteShipment({ ...SETTINGS, pricing: "fixed", fixedCents: 50_00 }, { ...noMap, service })).toMatchObject({ ok: true, cents: 75_00, distanceKm: null });
    expect(pricesSet(DEFAULT_DELIVERY_SETTINGS)).toBe(false);
    expect(pricesSet(SETTINGS)).toBe(true);
  });

  it("reads the dashboard's forms", () => {
    expect(parseZones("Maadi, 45\nZamalek، 60.50\n\n", [])).toEqual({ zones: [{ id: "z1", name: "Maadi", cents: 45_00 }, { id: "z2", name: "Zamalek", cents: 60_50 }], error: null });
    // Zones keep their IDs by name.
    expect(parseZones("New Cairo, 80\nMaadi, 50", SETTINGS.zones).zones).toEqual([
      { id: "z3", name: "New Cairo", cents: 80_00 },
      { id: "z1", name: "Maadi", cents: 50_00 },
    ]);
    expect(parseZones("Maadi 45", []).error).toContain("Maadi 45");
    expect(parseZones("Maadi, 45\nmaadi, 50", []).error).toBe('"maadi" is there twice.');
    expect(zonesText(SETTINGS.zones)).toBe("Maadi, 45.00\nZamalek, 60.00");
    const form = { currency: "EGP", pricing: "zone", zones: "Maadi, 45", cash: "on", tracking: "live", assignment: "open", courierApp: "same" };
    const parsed = parseDeliverySettings(form, DEFAULT_DELIVERY_SETTINGS, false);
    expect(parsed).toMatchObject({ ok: true, value: { pricing: "zone", zones: [{ name: "Maadi", cents: 45_00 }], cash: true, card: false, tracking: "live", assignment: "open" } });
    expect(parseDeliverySettings({ ...form, cash: "" }, DEFAULT_DELIVERY_SETTINGS, false)).toMatchObject({ ok: false, errors: { cash: "Choose at least one way to pay." } });
    expect(parseDeliverySettings({ ...form, zones: "" }, DEFAULT_DELIVERY_SETTINGS, false)).toMatchObject({ ok: false, errors: { zones: expect.any(String) } });
    expect(parseDeliverySettings({ ...form, pricing: "distance" }, DEFAULT_DELIVERY_SETTINGS, false)).toMatchObject({ ok: false, errors: { perKm: "Enter a price." } });
    // The second app for couriers needs it in the plan.
    expect(parseDeliverySettings({ ...form, courierApp: "bundle" }, DEFAULT_DELIVERY_SETTINGS, false)).toMatchObject({ ok: false, errors: { courierApp: expect.any(String) } });
    expect(parseDeliverySettings({ ...form, courierApp: "bundle" }, DEFAULT_DELIVERY_SETTINGS, true).ok).toBe(true);
    // 104.6 Its own name, within the stores' limit; the iPhone Firebase file stays as saved.
    expect(parseDeliverySettings({ ...form, courierApp: "bundle", courierAppName: " Speedy Riders " }, { ...DEFAULT_DELIVERY_SETTINGS, courierFirebaseIosAssetId: "plist-1" }, true)).toMatchObject({
      ok: true,
      value: { courierAppName: "Speedy Riders", courierFirebaseIosAssetId: "plist-1" },
    });
    expect(parseDeliverySettings({ ...form, courierApp: "bundle", courierAppName: "x".repeat(31) }, DEFAULT_DELIVERY_SETTINGS, true)).toMatchObject({ ok: false, errors: { courierAppName: expect.any(String) } });
    expect(parseServiceForm({ name: "Same-day", extra: "25", eta: "Within 4 hours", active: "on" })).toEqual({ ok: true, value: { name: "Same-day", description: null, extraCents: 25_00, eta: "Within 4 hours", active: true } });
    expect(parseCourierForm({ name: "Omar", phone: "0100 123 4567" }, "+20", false)).toEqual({ ok: true, value: { name: "Omar", phone: "+201001234567", email: null, vehicle: null } });
    expect(parseCourierForm({ name: "Omar", phone: "" }, "+20", false)).toMatchObject({ ok: false, errors: { phone: expect.any(String) } });
    expect(parseCourierForm({ name: "Omar", email: "omar@courier.test" }, "+20", true)).toMatchObject({ ok: true, value: { email: "omar@courier.test", phone: null } });
  });

  it("reads coordinates from maps links, and follows only the maps' own short links", async () => {
    expect(coordinatesIn("https://www.google.com/maps/place/Cairo+Tower/@30.0459,31.2243,17z/data=!3m1")).toEqual({ lat: 30.0459, lng: 31.2243 });
    expect(coordinatesIn("https://maps.google.com/?q=30.0444,31.2357")).toEqual({ lat: 30.0444, lng: 31.2357 });
    expect(coordinatesIn("https://maps.apple.com/?ll=30.0444,31.2357&q=Pin")).toEqual({ lat: 30.0444, lng: 31.2357 });
    expect(coordinatesIn("https://www.google.com/maps/place/x/data=!4m5!3d30.0459!4d31.2243")).toEqual({ lat: 30.0459, lng: 31.2243 });
    expect(coordinatesIn("30.0444, 31.2357")).toEqual({ lat: 30.0444, lng: 31.2357 });
    expect(coordinatesIn("https://example.com/nothing")).toBeNull();
    expect(isMapsLink("https://maps.app.goo.gl/AbC123")).toBe(true);
    expect(isMapsLink("https://evil.test/maps")).toBe(false);
    const asked: string[] = [];
    const fetcher = (async (url: string) => {
      asked.push(url);
      if (url === "https://maps.app.goo.gl/AbC123") return new Response(null, { status: 302, headers: { location: "https://www.google.com/maps/place/x/@30.0459,31.2243,15z" } });
      return new Response(null, { status: 302, headers: { location: "https://evil.test/@1,2" } });
    }) as unknown as typeof fetch;
    expect(await locateMapLink("https://maps.app.goo.gl/AbC123", fetcher)).toEqual({ lat: 30.0459, lng: 31.2243 });
    expect(await locateMapLink("https://evil.test/x", fetcher)).toBeNull();
    expect(asked).toEqual(["https://maps.app.goo.gl/AbC123"]);
  });

  it("has references customers can type", () => {
    expect(shipmentReference({ id: 42 })).toBe("S-1042");
    expect(shipmentIdOf("S-1042")).toBe(42);
    expect(shipmentIdOf("s1042")).toBe(42);
    expect(shipmentIdOf("1042")).toBe(42);
    expect(shipmentIdOf("Omar")).toBeNull();
  });
});

describe("104 delivery apps on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let delivery: boolean;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "delivery");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile Express",
      websiteDoneAt: NOW,
      connector: { kind: "deliveries" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    sender = new LogSender();
    now = NOW;
    delivery = true;
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
    connector: new DeliveryConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", delivery }),
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

  const send = (token: string, body: Record<string, unknown> = {}) =>
    call("POST", "/delivery/shipments", {
      query: { platform: "android" },
      token,
      body: { pickup: TAHRIR, dropoff: TOWER, recipient: { name: "Mona Adel", phone: "0101 555 0000" }, package: { size: "small", description: "Documents" }, payment: "cash", ...body },
    });

  it("sends Config.delivery: prices, payment, tracking and where couriers work", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(config.delivery).toEqual({
      currency: "EGP",
      pricing: "distance",
      zones: [],
      max_distance_km: 50,
      payment: { cash: true, card: true },
      tracking: "stages",
      assignment: "dispatch",
      courier_app: "same",
      map: { tiles_url: null, attribution: null },
    });
    await store.saveDeliverySettings(app.id, { ...SETTINGS, pricing: "zone" }, NOW);
    const zoned = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { delivery: { zones: unknown[] } };
    expect(zoned.delivery.zones).toEqual([
      { id: "z1", name: "Maadi", price_formatted: "E£45.00" },
      { id: "z2", name: "Zamalek", price_formatted: "E£60.00" },
    ]);
  });

  it("lists the company's services and prices a shipment", async () => {
    await store.createDeliveryService({ appId: app.id, name: "Express", description: "Within 2 hours", imageAssetId: "img-1", extraCents: 25_00, eta: "2 hours", position: 1, active: true }, NOW);
    const hidden = await store.createDeliveryService({ appId: app.id, name: "Night", description: null, imageAssetId: null, extraCents: 0, eta: null, position: 2, active: false }, NOW);
    const services = (await call("GET", "/delivery/services")).body as { items: { name: string; extra_formatted: string | null; image_url: string | null }[] };
    expect(services.items).toEqual([expect.objectContaining({ name: "Express", extra: "25.00", extra_formatted: "+E£25.00", image_url: ASSETS("img-1"), eta: "2 hours" })]);
    const express = (await store.listDeliveryServices(app.id))[0]!;
    // With services, one is chosen.
    expect((await call("POST", "/delivery/quote", { body: { pickup: TAHRIR, dropoff: TOWER } })).status).toBe(400);
    expect((await call("POST", "/delivery/quote", { body: { pickup: TAHRIR, dropoff: TOWER, service_id: hidden.id } })).status).toBe(400);
    const quote = await call("POST", "/delivery/quote", { body: { pickup: TAHRIR, dropoff: TOWER, service_id: express.id } });
    expect(quote.body).toEqual({ price: "57.00", price_formatted: "E£57.00", currency: "EGP", distance_km: 1.2 });
    // A page's list of services.
    const items = await deliveryServicePageItems(app.id, { category_id: null, featured: false, ids: [], sort: "newest", limit: 10 }, { store, assetUrl: ASSETS });
    expect(items).toEqual([{ source: "delivery_services", id: String(express.id), title: "Express", subtitle: "2 hours", image_url: ASSETS("img-1"), price_label: null, badge: "+E£25.00", action: { type: "item", item: { source: "delivery_services", id: String(express.id) } } }]);
    expect(itemSourcesFor(app)).toEqual(["delivery_services"]);
    expect(blockTypesFor(app)).toContain("items");
    expect(blockTypesFor(app)).not.toContain("search");
  });

  it("takes a cash shipment, tells the customer, and lets them follow and cancel it until a courier has it", async () => {
    const customer = await signUp("1001112222", "Karim Hassan");
    expect(customer.user.roles).toEqual([]);
    expect((await call("POST", "/delivery/shipments", { query: { platform: "android" }, body: {} })).status).toBe(401);
    const sent = await send(customer.access_token, { notes: "Ring twice" });
    expect(sent.status).toBe(201);
    const body = sent.body as { shipment: Record<string, unknown>; pay_url: string | null };
    expect(body.pay_url).toBeNull();
    expect(body.shipment).toMatchObject({
      status: "pending",
      price: "32.00",
      distance_km: 1.2,
      recipient: { name: "Mona Adel", phone: "+201015550000" },
      payment: { method: "cash", status: "unpaid" },
      notes: "Ring twice",
      courier: null,
    });
    const id = body.shipment.id as number;
    const inbox = await store.listHostedNotifications({ appId: app.id, userId: customer.user.id, since: new Date(0), page: 1, perPage: 10 });
    expect(inbox.items.map((n) => [n.title, n.data?.type, n.data?.shipment_id])).toEqual([["We got your shipment", "shipment_update", String(id)]]);
    const mine = await call("GET", "/me/shipments", { token: customer.access_token, query: { active: "true" } });
    expect((mine.body as { items: { id: number }[] }).items.map((s) => s.id)).toEqual([id]);
    // Someone else's shipment isn't theirs.
    const other = await signUp("1003334444", "Laila");
    expect((await call("GET", "/me/shipments/{shipment_id}", { params: [String(id)], token: other.access_token })).status).toBe(404);
    const cancelled = await call("POST", "/me/shipments/{shipment_id}/cancel", { params: [String(id)], token: customer.access_token });
    expect((cancelled.body as { status: string }).status).toBe("cancelled");
    // Refused: bad recipient, a payment the company doesn't take, prices not set.
    expect((await send(customer.access_token, { recipient: { name: "M", phone: "1" } })).status).toBe(400);
    await store.saveDeliverySettings(app.id, { ...SETTINGS, cash: false }, NOW);
    expect((await send(customer.access_token)).status).toBe(400);
    await store.saveDeliverySettings(app.id, DEFAULT_DELIVERY_SETTINGS, NOW);
    const unavailable = await send(customer.access_token);
    expect([unavailable.status, (unavailable.body as { code: string }).code]).toEqual([503, "delivery_unavailable"]);
  });

  it("knows its couriers by their proven number, and refuses everyone else the courier's screens", async () => {
    const created = await store.createCourier({ appId: app.id, name: "Omar Said", phone: "+201005556666", email: null, vehicle: "Motorbike", active: true }, NOW);
    expect(created.ok).toBe(true);
    expect((await store.createCourier({ appId: app.id, name: "Twin", phone: "+201005556666", email: null, vehicle: null, active: true }, NOW)).ok).toBe(false);
    const customer = await signUp("1001112222", "Karim Hassan");
    const refused = await call("GET", "/courier/me", { token: customer.access_token });
    expect([refused.status, (refused.body as { code: string }).code]).toEqual([403, "not_courier"]);
    expect((await call("GET", "/courier/jobs", { token: customer.access_token, query: { scope: "active" } })).status).toBe(403);
    const omar = await signUp("1005556666", "Omar");
    expect(omar.user.roles).toEqual(["courier"]);
    expect(((await call("GET", "/me", { token: omar.access_token })).body as { roles: string[] }).roles).toEqual(["courier"]);
    const me = await call("GET", "/courier/me", { token: omar.access_token });
    expect(me.body).toEqual({ id: expect.any(Number), name: "Omar Said", phone: "+201005556666", vehicle: "Motorbike", on_duty: false, assignment: "dispatch", delivered_today: 0 });
    // A paused courier isn't one.
    await store.updateCourier(app.id, (created as { courier: { id: number } }).courier.id, { active: false }, NOW);
    expect((await call("GET", "/courier/me", { token: omar.access_token })).status).toBe(403);
    expect(((await call("GET", "/me", { token: omar.access_token })).body as { roles: string[] }).roles).toEqual([]);
  });

  it("lets couriers on duty take waiting jobs, the first one only, and move them to the door", async () => {
    await store.saveDeliverySettings(app.id, { ...SETTINGS, assignment: "open", tracking: "live" }, NOW);
    await store.createCourier({ appId: app.id, name: "Omar Said", phone: "+201005556666", email: null, vehicle: null, active: true }, NOW);
    await store.createCourier({ appId: app.id, name: "Hany", phone: "+201007778888", email: null, vehicle: null, active: true }, NOW);
    const customer = await signUp("1001112222", "Karim Hassan");
    const omar = await signUp("1005556666", "Omar");
    const hany = await signUp("1007778888", "Hany");
    const id = ((await send(customer.access_token)).body as { shipment: { id: number } }).shipment.id;
    // Off duty: nothing to take.
    expect(((await call("GET", "/courier/jobs", { token: omar.access_token, query: { scope: "available" } })).body as { items: unknown[] }).items).toEqual([]);
    expect((await call("POST", "/courier/jobs/{shipment_id}/accept", { params: [String(id)], token: omar.access_token })).status).toBe(403);
    for (const token of [omar.access_token, hany.access_token]) await call("PATCH", "/courier/me", { token, body: { on_duty: true } });
    const available = (await call("GET", "/courier/jobs", { token: omar.access_token, query: { scope: "available" } })).body as { items: Record<string, unknown>[] };
    // No numbers before taking it.
    expect(available.items).toEqual([expect.objectContaining({ id, sender: { name: "Karim Hassan", phone: null }, recipient: { name: "Mona Adel", phone: null }, collect: "32.00", collect_formatted: "E£32.00" })]);
    const taken = await call("POST", "/courier/jobs/{shipment_id}/accept", { params: [String(id)], token: omar.access_token });
    expect(taken.body).toMatchObject({ status: "assigned", sender: { phone: "+201001112222" }, recipient: { phone: "+201015550000" } });
    const late = await call("POST", "/courier/jobs/{shipment_id}/accept", { params: [String(id)], token: hany.access_token });
    expect([late.status, (late.body as { code: string }).code]).toEqual([409, "job_taken"]);
    expect((await call("GET", "/courier/jobs/{shipment_id}", { params: [String(id)], token: hany.access_token })).status).toBe(404);
    // The customer can't cancel any more, and sees who's coming.
    expect((await call("POST", "/me/shipments/{shipment_id}/cancel", { params: [String(id)], token: customer.access_token })).status).toBe(409);
    const step = (status: string, note?: string) => call("POST", "/courier/jobs/{shipment_id}/status", { params: [String(id)], token: omar.access_token, body: { status, note } });
    expect((await step("delivered")).status).toBe(409);
    // No position is kept before the parcel is with the courier.
    await call("PUT", "/courier/location", { token: omar.access_token, body: { lat: 30.05, lng: 31.23 } });
    expect((await store.findCourier(app.id, { phone: "+201005556666", email: null }))!.lat).toBeNull();
    expect((await step("picked_up")).status).toBe(200);
    now = new Date(now.getTime() + 10_000);
    expect((await call("PUT", "/courier/location", { token: omar.access_token, body: { lat: 30.045, lng: 31.23 } })).status).toBe(204);
    const follow = (await call("GET", "/me/shipments/{shipment_id}", { params: [String(id)], token: customer.access_token })).body as Record<string, unknown>;
    expect(follow).toMatchObject({ status: "picked_up", courier: { name: "Omar Said", phone: "+201005556666" }, courier_location: { lat: 30.045, lng: 31.23 } });
    expect((await step("on_the_way")).status).toBe(200);
    expect((await step("failed")).status).toBe(400);
    const delivered = await step("delivered");
    expect(delivered.body).toMatchObject({ status: "delivered", collect: "0.00", collect_formatted: null });
    const done = (await call("GET", "/me/shipments/{shipment_id}", { params: [String(id)], token: customer.access_token })).body as Record<string, unknown>;
    // Cash is paid once delivered; the courier's position is gone.
    expect(done).toMatchObject({ status: "delivered", payment: { method: "cash", status: "paid" }, courier: { name: "Omar Said", phone: null }, courier_location: null });
    expect((done.timeline as { status: string }[]).map((s) => s.status)).toEqual(["pending", "assigned", "picked_up", "on_the_way", "delivered"]);
    expect((await store.findCourier(app.id, { phone: "+201005556666", email: null }))!.lat).toBeNull();
    expect(((await call("GET", "/courier/me", { token: omar.access_token })).body as { delivered_today: number }).delivered_today).toBe(1);
    expect(((await call("GET", "/courier/jobs", { token: omar.access_token, query: { scope: "done" } })).body as { total: number }).total).toBe(1);
    const told = await store.listHostedNotifications({ appId: app.id, userId: customer.user.id, since: new Date(0), page: 1, perPage: 20 });
    expect(told.items.map((n) => n.title).reverse()).toEqual(["We got your shipment", "A courier has your shipment", "Your parcel was picked up", "Your parcel is on the way", "Delivered"]);
  });

  it("104.7 makes the store review account a test courier with its own parcels and a sample job", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: "+201009990000", reviewCode: "424242" } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    await store.saveDeliverySettings(app.id, { ...SETTINGS, assignment: "open", courierApp: "bundle" }, NOW);
    await store.createCourier({ appId: app.id, name: "Omar Said", phone: "+201005556666", email: null, vehicle: null, active: true }, NOW);
    const customer = await signUp("1001112222", "Karim Hassan");
    const omar = await signUp("1005556666", "Omar");
    // The reviewers sign in with the fixed code; no message is sent.
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1009990000" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    expect(sender.sent.has("+201009990000")).toBe(false);
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: "424242", device: { ...DEVICE, id: "install-review" } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const reviewer = (await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Reviewer", device: { ...DEVICE, id: "install-review" } } })).body as { access_token: string };
    // A courier from the start, named for what it is.
    expect(((await call("GET", "/me", { token: reviewer.access_token })).body as { roles: string[] }).roles).toEqual(["courier"]);
    expect((await call("GET", "/courier/me", { token: reviewer.access_token })).body).toMatchObject({ name: "App Review", phone: "+201009990000" });

    // With nothing to do, a sample job is given to it, and only one at a time.
    const active = (await call("GET", "/courier/jobs", { token: reviewer.access_token, query: { scope: "active" } })).body as { items: { id: number; status: string }[] };
    expect(active.items).toEqual([expect.objectContaining({ status: "assigned" })]);
    expect(((await call("GET", "/courier/jobs", { token: reviewer.access_token, query: { scope: "active" } })).body as { total: number }).total).toBe(1);
    const sample = active.items[0]!.id;
    for (const status of ["picked_up", "on_the_way", "delivered"]) {
      expect((await call("POST", "/courier/jobs/{shipment_id}/status", { params: [String(sample)], token: reviewer.access_token, body: { status } })).status).toBe(200);
    }
    // The company's couriers never see it.
    expect((await call("GET", "/courier/jobs/{shipment_id}", { params: [String(sample)], token: omar.access_token })).status).toBe(404);

    // The reviewers' own parcels go to the review courier only, a customer's never.
    for (const token of [omar.access_token, reviewer.access_token]) await call("PATCH", "/courier/me", { token, body: { on_duty: true } });
    const own = ((await send(reviewer.access_token)).body as { shipment: { id: number } }).shipment.id;
    const real = ((await send(customer.access_token)).body as { shipment: { id: number } }).shipment.id;
    const waiting = async (token: string) => ((await call("GET", "/courier/jobs", { token, query: { scope: "available" } })).body as { items: { id: number }[] }).items.map((j) => j.id);
    expect(await waiting(omar.access_token)).toEqual([real]);
    expect(await waiting(reviewer.access_token)).toEqual([own]);
    expect((await call("POST", "/courier/jobs/{shipment_id}/accept", { params: [String(own)], token: omar.access_token })).status).toBe(404);
    expect((await call("POST", "/courier/jobs/{shipment_id}/accept", { params: [String(real)], token: reviewer.access_token })).status).toBe(404);
    expect((await call("POST", "/courier/jobs/{shipment_id}/accept", { params: [String(own)], token: reviewer.access_token })).status).toBe(200);
    // Only the review courier heard of the reviewers' parcel.
    const omarUser = (await store.getHostedUserByPhone(app.id, "+201005556666"))!;
    const toldOmar = await store.listHostedNotifications({ appId: app.id, userId: omarUser.id, since: new Date(0), page: 1, perPage: 20 });
    expect(toldOmar.items).toHaveLength(1);

    // The notes for both apps' reviewers.
    const notes = reviewNotes(app, { courierApp: "bundle", courierAppName: null, assignment: "open" })!;
    expect(notes.customer).toContain("+201009990000");
    expect(notes.customer).toContain("424242");
    expect(notes.courier).toContain("Nile Express Courier is for Nile Express's couriers only");
    expect(reviewNotes(app, { courierApp: "same", courierAppName: null, assignment: "open" })!.courier).toBeNull();
    expect(reviewNotes({ ...app, hostedSettings: { ...app.hostedSettings!, reviewCode: null } }, { courierApp: "same", courierAppName: null, assignment: "open" })).toBeNull();
  });

  it("gives a card shipment a payment page, and sends it to couriers once paid", async () => {
    await store.saveDeliverySettings(app.id, { ...SETTINGS, assignment: "open" }, NOW);
    await store.createCourier({ appId: app.id, name: "Omar Said", phone: "+201005556666", email: null, vehicle: null, active: true }, NOW);
    const omar = await signUp("1005556666", "Omar");
    await call("PATCH", "/courier/me", { token: omar.access_token, body: { on_duty: true } });
    const customer = await signUp("1001112222", "Karim Hassan");
    const sent = (await send(customer.access_token, { payment: "card" })).body as { shipment: { id: number; status: string }; pay_url: string };
    expect(sent.shipment.status).toBe("awaiting_payment");
    expect(sent.pay_url).toMatch(/^https:\/\/yallapp\.test\/pay\/[A-Za-z0-9_-]{32}$/);
    // Waiting for the payment, it isn't offered to couriers.
    expect(((await call("GET", "/courier/jobs", { token: omar.access_token, query: { scope: "available" } })).body as { total: number }).total).toBe(0);
    const again = await call("POST", "/me/shipments/{shipment_id}/pay", { params: [String(sent.shipment.id)], token: customer.access_token });
    expect((again.body as { url: string }).url).not.toBe(sent.pay_url);
    const shipment = (await store.getShipment(app.id, sent.shipment.id))!;
    const order = (await store.getCatalogOrder(app.id, shipment.orderId!))!;
    expect(order).toMatchObject({ totalCents: 32_00, currency: "EGP", lines: [{ productId: shipment.id, name: "Delivery S-1001", digital: true }] });
    await store.payCatalogOrder(app.id, order.id, "pay-1", NOW);
    await deliverPaidOrder(store, app, order, NOW);
    const paid = (await store.getShipment(app.id, shipment.id))!;
    expect(paid).toMatchObject({ status: "pending", paymentStatus: "paid", orderId: order.id });
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("completed");
    expect(((await call("GET", "/courier/jobs", { token: omar.access_token, query: { scope: "available" } })).body as { total: number }).total).toBe(1);
    const courierInbox = await store.listHostedNotifications({ appId: app.id, userId: omar.user.id, since: new Date(0), page: 1, perPage: 10 });
    expect(courierInbox.items.map((n) => [n.title, n.data?.type])).toEqual([["A new job is waiting", "courier_job"]]);
    expect((await call("POST", "/me/shipments/{shipment_id}/pay", { params: [String(shipment.id)], token: customer.access_token })).status).toBe(409);
  });

  it("answers feature_disabled while delivery isn't in the plan", async () => {
    delivery = false;
    const result = await call("GET", "/delivery/services");
    expect([result.status, (result.body as { code: string }).code]).toEqual([403, "feature_disabled"]);
  });
});
