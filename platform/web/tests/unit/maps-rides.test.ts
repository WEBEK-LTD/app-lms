import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type MapTilesSetting, type TaxiSettings, type VehicleTypeInput } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { TaxiConnector } from "@/lib/hosted/connectors/taxi";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { platformAppMap, platformMapFor, rideAppMap } from "@/lib/maps/app-map";
import { DEFAULT_RIDES_SETTINGS, EMPTY_DRIVER } from "@/lib/rides/settings";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { DEFAULT_TAXI_SETTINGS, isRideApp, parseTaxiForm, sealGoogleKey } from "@/lib/taxi/settings";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const TAHRIR = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
const TOWER = { address: "Cairo Tower, Zamalek", details: null, lat: 30.0459, lng: 31.2243 };
const PLATFORM: MapTilesSetting = {
  tilesUrl: "https://tiles.platform.test/{z}/{x}/{y}.png?key=k",
  attribution: "© Platform maps © OpenStreetMap contributors",
  searchUrl: "https://search.platform.test",
  routingUrl: "https://route.platform.test",
};
const GOOGLE_KEY = `AIza${"x".repeat(35)}`;

/** A fetch answering the platform's search and routing servers, remembering what was asked. */
function platformServers() {
  const asked: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    asked.push(url);
    if (url.startsWith("https://search.platform.test/search?")) {
      return Response.json([{ osm_type: "way", osm_id: 7, lat: "30.06", lon: "31.25", name: "Ramses Station", display_name: "Ramses Station, Cairo" }]);
    }
    if (url.startsWith("https://route.platform.test/route/v1/driving/")) {
      return Response.json({ code: "Ok", routes: [{ distance: 3_400, duration: 600, geometry: { coordinates: [[31.2357, 30.0444], [31.23, 30.045], [31.2243, 30.0459]] } }] });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { fetcher, asked };
}

describe("112.1 whose map a ride app draws", () => {
  const rides = { id: "a1", vertical: null, connector: { kind: "rides" as const }, demo: false };
  const taxi = { ...rides, vertical: "taxi" as const };
  const own = (taxiSettings: Partial<TaxiSettings>) => ({ taxi: { ...DEFAULT_TAXI_SETTINGS, ...taxiSettings } });

  it("the company's own first, else the platform's for ride hailing apps and the taxi demo only", () => {
    expect(isRideApp(rides)).toBe(true);
    expect(rideAppMap(rides, own({ tilesUrl: "https://tiles.own.test/{z}/{x}/{y}.png" }), KEY, PLATFORM, "ar")).toMatchObject({ source: "company", settings: { tilesUrl: "https://tiles.own.test/{z}/{x}/{y}.png" } });
    expect(rideAppMap(rides, own({}), KEY, PLATFORM, "ar")).toMatchObject({ source: "platform", googleKey: null, language: "ar", settings: { provider: "osm", tilesUrl: PLATFORM.tilesUrl, searchUrl: PLATFORM.searchUrl, routingUrl: PLATFORM.routingUrl } });
    expect(rideAppMap(rides, own({}), KEY, null, "ar")).toBeNull();
    // A taxi company sets its own; Yallapp's demo has none.
    expect(platformMapFor(taxi)).toBe(false);
    expect(rideAppMap(taxi, own({}), KEY, PLATFORM, "en")).toBeNull();
    expect(rideAppMap({ ...taxi, demo: true }, own({}), KEY, PLATFORM, "en")).toMatchObject({ source: "platform" });
    // A Google key that's saved is the company's map.
    const google = rideAppMap(rides, own({ provider: "google", googleKeyEncrypted: sealGoogleKey(rides, GOOGLE_KEY, KEY) }), KEY, PLATFORM, "en");
    expect(google).toMatchObject({ source: "company", googleKey: GOOGLE_KEY });
    // Delivery and food apps: the platform's, without servers it has none.
    expect(platformAppMap({ tilesUrl: PLATFORM.tilesUrl, attribution: null }, "tr")).toMatchObject({ settings: { searchUrl: null, routingUrl: null } });
    expect(platformAppMap(null, "tr")).toBeNull();
  });

  it("lets a ride hailing app leave the tile server empty for the platform's map", () => {
    expect(parseTaxiForm({ provider: "osm", tilesUrl: "" }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: false, errors: { tilesUrl: expect.any(String) } });
    expect(parseTaxiForm({ provider: "osm", tilesUrl: "" }, DEFAULT_TAXI_SETTINGS, { tilesOptional: true })).toMatchObject({ ok: true, value: { tilesUrl: null, attribution: null } });
  });
});

describe("112.1 ride hailing apps on the map", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let economyId: number;
  let servers: ReturnType<typeof platformServers>;

  const settings = (taxi: Partial<TaxiSettings> = {}): DeliverySettings => ({
    ...DEFAULT_DELIVERY_SETTINGS,
    currency: "EGP",
    cash: true,
    card: false,
    timezone: "Africa/Cairo",
    rides: { ...DEFAULT_RIDES_SETTINGS },
    taxi: { ...DEFAULT_TAXI_SETTINGS, ...taxi },
  });
  const economy = (appId: string): VehicleTypeInput => ({
    appId,
    name: "Economy",
    description: null,
    icon: "directions_car",
    imageAssetId: null,
    seats: 4,
    baseCents: 15_00,
    perKmCents: 6_00,
    perMinuteCents: 1_00,
    minCents: 25_00,
    waitPerMinuteCents: 0,
    position: 1,
    active: true,
  });

  beforeEach(async () => {
    ({ store } = await setupClient());
    clearPlatformSettingsCache();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "rides");
    app = {
      ...base,
      backend: "hosted",
      appName: "Masar Rides",
      vertical: null,
      websiteDoneAt: NOW,
      connector: { kind: "rides" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, settings(), NOW);
    economyId = (await store.createVehicleType(economy(app.id), NOW)).id;
    sender = new LogSender();
    now = NOW;
    servers = platformServers();
  });

  afterEach(() => clearPlatformSettingsCache());

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
    connector: new TaxiConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", key: KEY, account: null, maps: { fetcher: servers.fetcher, safe: servers.fetcher } }),
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const device = { id: `install-${phone}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device } });
    const registered = await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name, device } });
    return registered.body as { access_token: string };
  }

  const config = async () => (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { taxi: { map: Record<string, unknown>; live: unknown } | null };
  const usePlatformMap = async (map: MapTilesSetting | null) => {
    await store.setPlatformSetting("maps", map, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
  };

  it("sends Config.taxi on a plain background without any map, then the platform's map with its search and routes", async () => {
    expect((await config()).taxi).toEqual({
      map: { provider: "osm", tiles_url: null, attribution: null, search: false, routes: false },
      live: null,
      nearby_every_seconds: 5,
    });
    await usePlatformMap(PLATFORM);
    expect((await config()).taxi!.map).toEqual({ provider: "osm", tiles_url: PLATFORM.tilesUrl, attribution: PLATFORM.attribution, search: true, routes: true });
    // The company's own map comes first.
    await store.saveDeliverySettings(app.id, settings({ tilesUrl: "https://tiles.own.test/{z}/{x}/{y}.png", attribution: "© Own" }), NOW);
    expect((await config()).taxi!.map).toEqual({ provider: "osm", tiles_url: "https://tiles.own.test/{z}/{x}/{y}.png", attribution: "© Own", search: false, routes: false });
  });

  it("searches places and draws routes on the platform's servers, under /maps and /taxi alike, and prices the ride by the road", async () => {
    expect((await call("GET", "/maps/places", { query: { q: "ramses" } })).body).toMatchObject({ code: "feature_disabled" });
    expect((await call("POST", "/maps/route", { body: { from: TAHRIR, to: TOWER } })).body).toMatchObject({ code: "feature_disabled" });
    await usePlatformMap(PLATFORM);
    const found = await call("GET", "/maps/places", { query: { q: "ramses", lat: "30.04", lng: "31.23" } });
    expect(found.body).toEqual({ items: [{ id: "osm:W7", name: "Ramses Station", address: "Ramses Station, Cairo", lat: 30.06, lng: 31.25 }] });
    expect((await call("GET", "/taxi/places", { query: { q: "ramses" } })).body).toEqual(found.body);
    const route = await call("POST", "/maps/route", { body: { from: TAHRIR, to: TOWER } });
    expect(route.body).toEqual({ distance_km: 3.4, minutes: 10, points: [[30.0444, 31.2357], [30.045, 31.23], [30.0459, 31.2243]] });
    expect(servers.asked.some((u) => u.startsWith("https://route.platform.test/route/v1/driving/31.2357,30.0444;31.2243,30.0459"))).toBe(true);
    // 15 + 6 × 3.4 + 10 × 1 = 45.40: the road's distance and time.
    const estimate = (await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER } })).body as { distance_km: number; options: { fare: string }[] };
    expect([estimate.distance_km, estimate.options[0]!.fare]).toEqual([3.4, "45.40"]);
  });

  it("shows the free cars around the rider", async () => {
    const made = await store.createCourier({ appId: app.id, name: "Omar", phone: "+201005556666", email: null, vehicle: null, active: true, driver: { ...EMPTY_DRIVER, vehicleTypeId: economyId, carModel: "Kia Cerato", carColor: "Silver", plate: "MSR 120" } }, NOW);
    if (!made.ok) throw new Error("duplicate");
    const driver = await signUp("1005556666", "Omar");
    await call("PATCH", "/driver/me", { token: driver.access_token, body: { online: true } });
    await call("PUT", "/driver/location", { token: driver.access_token, body: { lat: 30.0462, lng: 31.2372, heading: 90 } });
    const nearby = await call("GET", "/taxi/nearby", { query: { lat: "30.0444", lng: "31.2357" } });
    expect(nearby.body).toEqual({ items: [{ driver_key: `d${made.courier.id}`, lat: 30.0462, lng: 31.2372, heading: 90, vehicle_type_id: economyId }] });
  });
});
