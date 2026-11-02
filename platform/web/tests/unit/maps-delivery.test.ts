import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type MapTilesSetting, type Shipment, type ShipmentInput } from "@/lib/data/types";
import { deliveryBoard } from "@/lib/delivery/board";
import { deliveryConfig, mapConfigJson, visibleLocation } from "@/lib/delivery/service";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { demoCourierPosition } from "@/lib/demo/courier";
import { foodOrderJson } from "@/lib/food/json";
import { DeliveryConnector } from "@/lib/hosted/connectors/delivery";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const NASR = { address: "12 Abbas El Akkad St, Nasr City", details: null, lat: 30.0561, lng: 31.3301 };
const MAADI = { address: "9 Road 233, Maadi", details: null, lat: 29.9602, lng: 31.2569 };
const PLATFORM: MapTilesSetting = { tilesUrl: "https://tiles.platform.test/{z}/{x}/{y}.png", attribution: "© Platform", searchUrl: null, routingUrl: "https://route.platform.test" };
const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", pricing: "fixed", fixedCents: 50_00, cash: true, card: false, tracking: "live", timezone: "Africa/Cairo" };

function shipment(overrides: Partial<ShipmentInput>): ShipmentInput {
  return {
    appId: "a",
    userId: null,
    senderName: "Omar",
    senderPhone: "+201005556667",
    serviceId: null,
    serviceName: null,
    pickup: NASR,
    dropoff: MAADI,
    zoneId: null,
    zoneName: null,
    distanceKm: 12.4,
    packageSize: "small",
    packageDescription: null,
    recipientName: "Mona",
    recipientPhone: "+201001234567",
    notes: null,
    priceCents: 50_00,
    currency: "EGP",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    orderId: null,
    status: "pending",
    courierId: null,
    courierName: null,
    timeline: [{ status: "pending", at: NOW.toISOString() }],
    lang: "en",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("112.2 the platform's map in delivery and food apps", () => {
  it("says whether its search and routes work", () => {
    expect(mapConfigJson(null)).toEqual({ tiles_url: null, attribution: null, search: false, routes: false });
    expect(mapConfigJson(PLATFORM)).toEqual({ tiles_url: PLATFORM.tilesUrl, attribution: "© Platform", search: false, routes: true });
    expect(deliveryConfig(SETTINGS, PLATFORM).map).toMatchObject({ routes: true });
  });

  it("moves Studio's demo courier from the pickup to the door, short of it until delivered", () => {
    const picked = new Date(NOW.getTime() - 10 * 60_000).toISOString();
    const going = shipment({ status: "on_the_way", timeline: [{ status: "picked_up", at: picked }] }) as Shipment;
    expect(demoCourierPosition({ ...going, status: "assigned" }, NOW)).toBeNull();
    // Ten minutes at 24 km/h: 4 of the ~13.2 km.
    const now = demoCourierPosition(going, NOW)!;
    expect(now.lat).toBeLessThan(NASR.lat);
    expect(now.lat).toBeGreaterThan(MAADI.lat);
    const later = demoCourierPosition(going, new Date(NOW.getTime() + 3 * 3600_000))!;
    expect(later.lat).toBeCloseTo(NASR.lat + (MAADI.lat - NASR.lat) * 0.95, 6);
    // Only in the demo apps, and only without a real position.
    expect(visibleLocation({ ...going, id: 1 }, null, SETTINGS, NOW)).toBeNull();
    expect(visibleLocation({ ...going, id: 1 }, null, SETTINGS, NOW, { demo: true })).toEqual({ ...now, updated_at: NOW.toISOString() });
    expect(visibleLocation({ ...going, id: 1 }, null, { ...SETTINGS, tracking: "stages" }, NOW, { demo: true })).toBeNull();
  });

  it("tells a food order's customer where the food comes from", () => {
    const order = { id: 3, appId: "a", restaurantId: 1, restaurantName: "Abou Tarek", status: "on_the_way", lines: [], subtotalCents: 0, deliveryFeeCents: 0, totalCents: 0, currency: "EGP", paymentMethod: "cash", paymentStatus: "unpaid", dropoff: MAADI, notes: null, readyAt: null, rejection: null, rating: null, timeline: [], createdAt: NOW, updatedAt: NOW, shipmentId: 9 } as unknown as Parameters<typeof foodOrderJson>[0];
    expect(foodOrderJson(order, { job: { ...shipment({ status: "on_the_way" }), id: 9 } }).pickup).toEqual(NASR);
    expect(foodOrderJson(order).pickup).toBeNull();
  });
});

describe("112.2 delivery apps on the map", () => {
  let store: MemoryStore;
  let app: App;
  let asked: string[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    clearPlatformSettingsCache();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "delivery");
    app = {
      ...base,
      backend: "hosted",
      appName: "Sahm Express",
      websiteDoneAt: NOW,
      connector: { kind: "deliveries" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    asked = [];
  });

  afterEach(() => clearPlatformSettingsCache());

  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    asked.push(url);
    if (url.startsWith("https://route.platform.test/route/v1/driving/")) {
      return Response.json({ code: "Ok", routes: [{ distance: 13_200, duration: 1_500, geometry: { coordinates: [[31.3301, 30.0561], [31.29, 30.01], [31.2569, 29.9602]] } }] });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: new DeliveryConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", maps: { safe: fetcher } }),
  });

  async function call(method: string, route: string, body?: unknown): Promise<HostedResult> {
    const query = new URLSearchParams(route === "/config" ? { platform: "android", app_version: "1.0.0" } : {});
    const result = await handleHosted(context(), { method, path: route.split("/").filter(Boolean), query, body, token: null });
    expectContract(method, route, result);
    return result;
  }

  it("sends the platform's map and draws the road between the places through it", async () => {
    expect((await call("POST", "/maps/route", { from: NASR, to: MAADI })).body).toMatchObject({ code: "feature_disabled" });
    await store.setPlatformSetting("maps", PLATFORM, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
    const config = (await call("GET", "/config")).body as { delivery: { map: unknown } };
    expect(config.delivery.map).toEqual({ tiles_url: PLATFORM.tilesUrl, attribution: "© Platform", search: false, routes: true });
    expect((await call("POST", "/maps/route", { from: NASR, to: MAADI })).body).toEqual({
      distance_km: 13.2,
      minutes: 25,
      points: [
        [30.0561, 31.3301],
        [30.01, 31.29],
        [29.9602, 31.2569],
      ],
    });
    expect(asked).toHaveLength(1);
    // No search server: places by name aren't there.
    expect((await handleHosted(context(), { method: "GET", path: ["maps", "places"], query: new URLSearchParams({ q: "maadi" }), body: undefined, token: null })).body).toMatchObject({ code: "feature_disabled" });
  });

  it("puts the couriers with a parcel and the jobs waiting on the dashboard's live map", async () => {
    const made = await store.createCourier({ appId: app.id, name: "Karim", phone: "+201112223334", email: null, vehicle: "Motorbike", active: true }, NOW);
    if (!made.ok) throw new Error("duplicate");
    const karim = made.courier;
    await store.updateCourier(app.id, karim.id, { onDuty: true, lat: 30.01, lng: 31.29, locatedAt: NOW }, NOW);
    const waiting = await store.createShipment(shipment({ appId: app.id }));
    const going = await store.createShipment(shipment({ appId: app.id, status: "on_the_way", courierId: karim.id, courierName: "Karim", timeline: [{ status: "picked_up", at: NOW.toISOString() }] }));
    await store.createShipment(shipment({ appId: app.id, status: "delivered", updatedAt: NOW }));

    const board = await deliveryBoard(store, app, SETTINGS, NOW);
    expect(board.counts).toEqual({ onDuty: 1, onTheWay: 1, waiting: 1, today: 1 });
    expect(board.couriers).toEqual([{ id: karim.id, name: "Karim", lat: 30.01, lng: 31.29, jobId: going.id, locatedAt: NOW.toISOString() }]);
    expect(board.jobs.map((j) => [j.id, j.status, j.lat])).toEqual([
      [waiting.id, "pending", NASR.lat],
      [going.id, "on_the_way", NASR.lat],
    ]);

    // A position over ten minutes old isn't on the map; in Studio's demo the demo courier drives the way.
    const later = new Date(NOW.getTime() + 11 * 60_000);
    expect((await deliveryBoard(store, app, SETTINGS, later)).couriers).toEqual([]);
    const demo = await deliveryBoard(store, { ...app, demo: true }, SETTINGS, later);
    expect(demo.couriers).toHaveLength(1);
    expect(demo.couriers[0]!.lat).toBeLessThan(NASR.lat);
  });
});
