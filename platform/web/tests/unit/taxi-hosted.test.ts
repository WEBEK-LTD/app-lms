import { createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encrypt } from "@/lib/crypto/encryption";
import { encryptionKey } from "@/lib/env";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type TaxiSettings, type VehicleTypeInput } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { TaxiConnector } from "@/lib/hosted/connectors/taxi";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { ServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { DEFAULT_RIDES_SETTINGS, EMPTY_DRIVER } from "@/lib/rides/settings";
import { checkLiveDatabase, customToken, LIVE_RULES, liveDatabase, LiveError } from "@/lib/taxi/live";
import { checkMap, decodePolyline, routeBetween, searchPlaces, thin, type MapAccess } from "@/lib/taxi/maps";
import { databaseUrlOf, DEFAULT_TAXI_SETTINGS, googleKeyOf, isTaxiApp, maskedKey, parseTaxiForm, sealGoogleKey, taxiOn } from "@/lib/taxi/settings";
import { PLAN_INFO } from "@/lib/plans";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const ACCOUNT: ServiceAccount = { project_id: "lamha-taxi", client_email: "app@lamha-taxi.iam.gserviceaccount.com", private_key: privateKey };
const GOOGLE_KEY = `AIza${"x".repeat(35)}`;
const DATABASE = "https://lamha-taxi-default-rtdb.firebaseio.com";
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const TAHRIR = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
const TOWER = { address: "Cairo Tower, Zamalek", details: null, lat: 30.0459, lng: 31.2243 };
const NEAR = { lat: 30.04623, lng: 31.23718 };
const FAR = { lat: 30.2, lng: 31.5 };
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
/** A Google tiles session made in a test lasts till then (the config asks with the clock's time). */
const SESSION_ENDS = Date.UTC(2099, 0, 1);

/** Google's own example polyline: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453). */
const POLYLINE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

/** A fetch answering by address, remembering what was asked. */
function fakeFetch(answer: (url: string, init: RequestInit) => { status?: number; json?: unknown; type?: string } | null) {
  const calls: Call[] = [];
  const fetcher = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    calls.push({ url, method: init.method ?? "GET", headers, body: typeof init.body === "string" ? JSON.parse(init.body) : (init.body ?? null) });
    if (url === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "ya29.token", expires_in: 3600 }), { status: 200 });
    const found = answer(url, init) ?? { status: 404, json: { error: "Not found" } };
    if (found.type) return new Response(new Uint8Array([137, 80, 78, 71]), { status: found.status ?? 200, headers: { "content-type": found.type } });
    return new Response(found.json === undefined ? "null" : JSON.stringify(found.json), { status: found.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fetcher, calls };
}

const access = (settings: Partial<TaxiSettings>, googleKey: string | null = null): MapAccess => ({ settings: { ...DEFAULT_TAXI_SETTINGS, ...settings }, googleKey, language: "ar" });

describe("105.9 the Maps & live form", () => {
  it("takes a Google key, or keeps the saved one; OpenStreetMap needs the tile server", () => {
    expect(parseTaxiForm({ provider: "google", googleKey: "nope" }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: false, errors: { googleKey: expect.stringContaining("AIza") } });
    expect(parseTaxiForm({ provider: "google" }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: false, errors: { googleKey: "Enter your Google Maps API key." } });
    expect(parseTaxiForm({ provider: "google", googleKey: ` ${GOOGLE_KEY} ` }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: true, googleKey: GOOGLE_KEY, value: { provider: "google" } });
    expect(parseTaxiForm({ provider: "google" }, { ...DEFAULT_TAXI_SETTINGS, googleKeyEncrypted: "sealed" })).toMatchObject({ ok: true, googleKey: null });
    expect(parseTaxiForm({ provider: "osm" }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: false, errors: { tilesUrl: "Enter your tile server's address." } });
    expect(parseTaxiForm({ provider: "osm", tilesUrl: "http://tiles.test/{z}/{x}/{y}.png" }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: false, errors: { tilesUrl: expect.any(String) } });
    expect(parseTaxiForm({ provider: "osm", tilesUrl: "https://tiles.test/{z}/{x}.png" }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: false });
    const osm = parseTaxiForm(
      { provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", searchUrl: "https://search.lamha.test/", routingUrl: "https://route.lamha.test", databaseUrl: `${DATABASE.toUpperCase()}/` },
      DEFAULT_TAXI_SETTINGS,
    );
    expect(osm).toEqual({
      ok: true,
      googleKey: null,
      value: {
        provider: "osm",
        tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap contributors",
        searchUrl: "https://search.lamha.test",
        routingUrl: "https://route.lamha.test",
        databaseUrl: DATABASE,
      },
    });
    expect(parseTaxiForm({ provider: "osm", tilesUrl: "https://tiles.test/{z}/{x}/{y}.png", searchUrl: "https://s.test/?q=1" }, DEFAULT_TAXI_SETTINGS)).toMatchObject({ ok: false, errors: { searchUrl: expect.any(String) } });
  });

  it("knows a Realtime Database's address", () => {
    expect(databaseUrlOf("https://lamha-taxi-default-rtdb.firebaseio.com/")).toBe(DATABASE);
    expect(databaseUrlOf("https://lamha-taxi-default-rtdb.europe-west1.firebasedatabase.app")).toBe("https://lamha-taxi-default-rtdb.europe-west1.firebasedatabase.app");
    expect(databaseUrlOf("https://lamha.firebasedatabase.app")).toBeNull();
    expect(databaseUrlOf("https://lamha.us.firebaseio.com")).toBeNull();
    expect(databaseUrlOf("http://lamha.firebaseio.com")).toBeNull();
    expect(databaseUrlOf("https://evil.test/.firebaseio.com")).toBeNull();
    expect(databaseUrlOf("https://lamha.firebaseio.com.evil.test")).toBeNull();
  });

  it("keeps the Google key sealed and shows only its ends", () => {
    const app = { id: "app-1" };
    const sealed = sealGoogleKey(app, GOOGLE_KEY, KEY);
    expect(sealed).not.toContain("AIza");
    expect(googleKeyOf(app, { ...DEFAULT_TAXI_SETTINGS, googleKeyEncrypted: sealed }, KEY)).toBe(GOOGLE_KEY);
    expect(googleKeyOf({ id: "app-2" }, { ...DEFAULT_TAXI_SETTINGS, googleKeyEncrypted: sealed }, KEY)).toBeNull();
    expect(maskedKey(GOOGLE_KEY)).toBe(`AIza${"•".repeat(16)}xxx`);
  });

  it("is a taxi app with the rides engine and the taxi vertical, on plans with live taxis", () => {
    expect(isTaxiApp({ vertical: "taxi", connector: { kind: "rides" } })).toBe(true);
    expect(isTaxiApp({ vertical: null, connector: { kind: "rides" } })).toBe(false);
    expect(taxiOn({ demo: false }, PLAN_INFO.pro)).toBe(false);
    expect(taxiOn({ demo: false }, { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "taxi"] })).toBe(true);
    expect(taxiOn({ demo: true }, PLAN_INFO.pro)).toBe(true);
  });
});

describe("105.9 the company's map", () => {
  it("decodes Google's polylines and thins long lines, keeping their ends", () => {
    expect(decodePolyline(POLYLINE)).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
    const line = Array.from({ length: 1001 }, (_, i) => [i, i] as [number, number]);
    const thinned = thin(line, 500);
    expect(thinned).toHaveLength(500);
    expect([thinned[0], thinned[499]]).toEqual([
      [0, 0],
      [1000, 1000],
    ]);
  });

  it("asks Google Places and Routes with the company's key", async () => {
    const { fetcher, calls } = fakeFetch((url) => {
      if (url === "https://places.googleapis.com/v1/places:autocomplete")
        return { json: { suggestions: [{ placePrediction: { placeId: "ChIJmall", structuredFormat: { mainText: { text: "Mall of Egypt" }, secondaryText: { text: "6th of October" } } } }, { queryPrediction: {} }] } };
      if (url.startsWith("https://places.googleapis.com/v1/places/ChIJmall")) return { json: { id: "ChIJmall", displayName: { text: "Mall of Egypt" }, formattedAddress: "Wahat Road", location: { latitude: 29.97, longitude: 31.02 } } };
      if (url === "https://routes.googleapis.com/directions/v2:computeRoutes") return { json: { routes: [{ distanceMeters: 14_230, duration: "1310s", polyline: { encodedPolyline: POLYLINE } }] } };
      return null;
    });
    const google = access({ provider: "google" }, GOOGLE_KEY);
    expect(await searchPlaces(google, { q: "mall", near: TAHRIR, session: "s1" }, { fetcher })).toEqual([{ id: "ChIJmall", name: "Mall of Egypt", address: "6th of October", lat: null, lng: null }]);
    expect(calls[0]).toMatchObject({ headers: { "x-goog-api-key": GOOGLE_KEY }, body: { input: "mall", sessionToken: "s1", languageCode: "ar", locationBias: { circle: { center: { latitude: 30.0444, longitude: 31.2357 } } } } });
    expect(await routeBetween(google, TAHRIR, TOWER, { fetcher })).toEqual({ distanceKm: 14.2, minutes: 22, points: decodePolyline(POLYLINE) });
    expect(calls[1]!.headers["x-goog-fieldmask"]).toBe("routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline");
  });

  it("asks the company's own OpenStreetMap servers, through the public-only fetch", async () => {
    const { fetcher: safe, calls } = fakeFetch((url) => {
      if (url.startsWith("https://search.lamha.test/search?")) return { json: [{ osm_type: "node", osm_id: 42, lat: "30.06", lon: "31.25", name: "Ramses Station", display_name: "Ramses Station, Cairo" }, { osm_type: "way" }] };
      if (url.startsWith("https://route.lamha.test/route/v1/driving/31.2357,30.0444;31.2243,30.0459"))
        return { json: { code: "Ok", routes: [{ distance: 2_510, duration: 400, geometry: { coordinates: [[31.2357, 30.0444], [31.2243, 30.0459]] } }] } };
      return null;
    });
    const osm = access({ provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", searchUrl: "https://search.lamha.test", routingUrl: "https://route.lamha.test" });
    expect(await searchPlaces(osm, { q: "ramses", near: null, session: null }, { safe })).toEqual([{ id: "osm:N42", name: "Ramses Station", address: "Ramses Station, Cairo", lat: 30.06, lng: 31.25 }]);
    expect(calls[0]!.headers["user-agent"]).toContain("Yallapp");
    expect(await routeBetween(osm, TAHRIR, TOWER, { safe })).toEqual({ distanceKm: 2.5, minutes: 7, points: [[30.0444, 31.2357], [30.0459, 31.2243]] });
  });

  it("tests each part the company set up and says why one fails", async () => {
    const { fetcher: safe } = fakeFetch((url) => (url === "https://tiles.lamha.test/0/0/0.png" ? { type: "image/png" } : url.startsWith("https://search.lamha.test") ? { status: 500 } : null));
    expect(await checkMap(access({ provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", searchUrl: "https://search.lamha.test" }), { region: "EG" }, { safe })).toEqual([
      { part: "tiles", ok: true, problem: null },
      { part: "search", ok: false, problem: "The map server answered with HTTP 500." },
    ]);
    const { fetcher } = fakeFetch((url) =>
      url.startsWith("https://tile.googleapis.com/v1/createSession")
        ? { json: { session: "sess", expiry: "1893456000" } }
        : { status: 403, json: { error: { message: "Places API (New) has not been used in project 1 before or it is disabled." } } },
    );
    const checks = await checkMap(access({ provider: "google" }, GOOGLE_KEY), { region: "EG" }, { fetcher });
    expect(checks.map((c) => [c.part, c.ok])).toEqual([
      ["tiles", true],
      ["search", false],
      ["routes", false],
    ]);
    expect(checks[1]!.problem).toBe("Google Maps: Places API (New) has not been used in project 1 before or it is disabled.");
  });
});

describe("105.9 the company's live database", () => {
  it("signs custom tokens Firebase accepts, with the claims the rules check", () => {
    const { token, expiresAt } = customToken(ACCOUNT, "u7", { app: "app-1", role: "rider", ride: "12", follow: "d3" }, NOW);
    const [header, body, signature] = token.split(".");
    expect(createVerify("RSA-SHA256").update(`${header}.${body}`).verify(publicKey, signature!, "base64url")).toBe(true);
    const claims = JSON.parse(Buffer.from(body!, "base64url").toString());
    expect(claims).toEqual({
      iss: ACCOUNT.client_email,
      sub: ACCOUNT.client_email,
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      iat: NOW.getTime() / 1000,
      exp: NOW.getTime() / 1000 + 3600,
      uid: "u7",
      claims: { app: "app-1", role: "rider", ride: "12", follow: "d3" },
    });
    expect(expiresAt.getTime()).toBe(NOW.getTime() + 3600_000);
    expect(JSON.parse(LIVE_RULES).rules.yallapp.$app.rides.$ride[".read"]).toContain("auth.token.ride === $ride");
  });

  it("writes, reads back and removes under the app's root with the service account's token", async () => {
    let kept: unknown = null;
    const { fetcher, calls } = fakeFetch((url, init) => {
      if (url !== `${DATABASE}/yallapp/app-1/check.json`) return null;
      if (init.method === "PUT") kept = JSON.parse(String(init.body));
      if (init.method === "DELETE") kept = null;
      return { json: init.method === "DELETE" ? null : kept };
    });
    const database = liveDatabase({ id: "app-1" }, { databaseUrl: DATABASE }, ACCOUNT, { fetcher, now: () => NOW })!;
    await checkLiveDatabase(database, NOW);
    expect(calls.filter((c) => c.url.startsWith(DATABASE)).map((c) => c.method)).toEqual(["PUT", "GET", "DELETE"]);
    expect(calls[1]!.headers.authorization).toBe("Bearer ya29.token");
    expect(liveDatabase({ id: "app-1" }, { databaseUrl: null }, ACCOUNT)).toBeNull();
    expect(liveDatabase({ id: "app-1" }, { databaseUrl: DATABASE }, null)).toBeNull();
  });

  it("says when the database isn't the app's Firebase project's", async () => {
    const { fetcher } = fakeFetch(() => ({ status: 401, json: { error: "Permission denied" } }));
    const database = liveDatabase({ id: "app-1" }, { databaseUrl: "https://other-project.firebaseio.com" }, { ...ACCOUNT, client_email: "other@x.iam.gserviceaccount.com" }, { fetcher })!;
    await expect(checkLiveDatabase(database, NOW)).rejects.toThrow(LiveError);
    await expect(checkLiveDatabase(database, NOW)).rejects.toThrow("Is the database in the same Firebase project as the app?");
  });
});

describe("105.9 live taxi apps on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let economyId: number;
  let maps: ReturnType<typeof fakeFetch>;
  let live: ReturnType<typeof fakeFetch>;
  let rides: boolean;

  const settingsWith = (taxi: Partial<TaxiSettings>): DeliverySettings => ({
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
    icon: "local_taxi",
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
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "rides");
    app = {
      ...base,
      backend: "hosted",
      appName: "Lamha Taxi",
      vertical: "taxi",
      websiteDoneAt: NOW,
      connector: { kind: "rides" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS },
      firebaseServiceAccountEncrypted: encrypt(JSON.stringify({ type: "service_account", ...ACCOUNT }), encryptionKey(), `${SERVICE_ACCOUNT_CONTEXT}:${base.id}`),
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, settingsWith({ provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors" }), NOW);
    economyId = (await store.createVehicleType(economy(app.id), NOW)).id;
    sender = new LogSender();
    now = NOW;
    rides = true;
    maps = fakeFetch((url) => {
      if (url.startsWith("https://tile.googleapis.com/v1/createSession")) return { json: { session: "sess-1", expiry: String(SESSION_ENDS / 1000) } };
      if (url === "https://routes.googleapis.com/directions/v2:computeRoutes") return { json: { routes: [{ distanceMeters: 2_000, duration: "540s", polyline: { encodedPolyline: POLYLINE } }] } };
      if (url.startsWith("https://search.lamha.test/search?")) return { json: [{ osm_type: "node", osm_id: 42, lat: "30.06", lon: "31.25", name: "Ramses Station", display_name: "Ramses Station, Cairo" }] };
      return null;
    });
    live = fakeFetch((url) => (url.startsWith(DATABASE) ? { json: null } : null));
    vi.stubGlobal("fetch", live.fetcher);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    connector: new TaxiConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", rides, key: KEY, account: ACCOUNT, maps: { fetcher: maps.fetcher, safe: maps.fetcher } }),
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
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  async function driverAt(phone: string, name: string, at: { lat: number; lng: number }) {
    const made = await store.createCourier({ appId: app.id, name, phone: `+20${phone}`, email: null, vehicle: null, active: true, driver: { ...EMPTY_DRIVER, vehicleTypeId: economyId, carModel: "Hyundai Elantra", carColor: "White", plate: "TRQ 482" } }, NOW);
    if (!made.ok) throw new Error("duplicate");
    const session = await signUp(phone, name);
    await call("PATCH", "/driver/me", { token: session.access_token, body: { online: true } });
    expect((await call("PUT", "/driver/location", { token: session.access_token, body: { ...at, heading: 90 } })).status).toBe(204);
    return { ...session, id: made.courier.id };
  }

  const config = async () => (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;

  it("sends Config.taxi: the company's OpenStreetMap tiles, and its live database", async () => {
    expect((await config()).taxi).toEqual({
      map: { provider: "osm", tiles_url: "https://tiles.lamha.test/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors", search: false, routes: false },
      live: null,
      nearby_every_seconds: 5,
    });
    await store.saveDeliverySettings(app.id, settingsWith({ provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", searchUrl: "https://search.lamha.test", databaseUrl: DATABASE }), NOW);
    expect((await config()).taxi).toMatchObject({ map: { search: true, routes: false }, live: { database_url: DATABASE, root: `yallapp/${app.id}` } });
  });

  it("makes a Google tiles session once and keeps it with the settings", async () => {
    await store.saveDeliverySettings(app.id, settingsWith({ provider: "google", googleKeyEncrypted: sealGoogleKey(app, GOOGLE_KEY, KEY) }), NOW);
    const taxi = (await config()).taxi as { map: Record<string, unknown> };
    expect(taxi.map).toEqual({
      provider: "google",
      tiles_url: `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=sess-1&key=${GOOGLE_KEY}`,
      attribution: "Map data ©2026 Google",
      search: true,
      routes: true,
    });
    expect(maps.calls[0]!.body).toEqual({ mapType: "roadmap", language: "en", region: "EG" });
    expect((await store.getDeliverySettings(app.id))!.taxi!.googleSession).toEqual({ token: "sess-1", expiresAt: new Date(SESSION_ENDS).toISOString() });
    await config();
    expect(maps.calls.filter((c) => c.url.includes("createSession"))).toHaveLength(1);
  });

  it("shows the free taxis around a place, nearest first, without the busy or far ones", async () => {
    await driverAt("1005557777", "Far Away", FAR);
    const omar = await driverAt("1005556666", "Omar", NEAR);
    const nearby = await call("GET", "/taxi/nearby", { query: { lat: "30.0444", lng: "31.2357" } });
    expect(nearby.body).toEqual({ items: [{ driver_key: `d${omar.id}`, lat: 30.0462, lng: 31.2372, heading: 90, vehicle_type_id: economyId }] });
    // A minute later without a new position: not shown.
    now = new Date(now.getTime() + 61_000);
    expect((await call("GET", "/taxi/nearby", { query: { lat: "30.0444", lng: "31.2357" } })).body).toEqual({ items: [] });
    expect((await call("GET", "/taxi/nearby", { query: { lat: "91", lng: "0" } })).status).toBe(400);
  });

  it("gives riders and drivers a live token whose claims follow the ride", async () => {
    const rider = await signUp("1001112222", "Mona");
    expect((await call("POST", "/taxi/live-token", { token: rider.access_token })).body).toMatchObject({ code: "feature_disabled" });
    await store.saveDeliverySettings(app.id, settingsWith({ provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", databaseUrl: DATABASE }), NOW);
    expect((await call("POST", "/taxi/live-token")).status).toBe(401);
    const first = (await call("POST", "/taxi/live-token", { token: rider.access_token })).body as Record<string, unknown>;
    expect(first).toMatchObject({ database_url: DATABASE, root: `yallapp/${app.id}`, role: "rider", driver_key: null, ride_id: null, follow: null });
    const driver = await driverAt("1005556666", "Omar", NEAR);
    const asked = (await call("POST", "/rides", { query: { platform: "android" }, token: rider.access_token, body: { pickup: TAHRIR, dropoff: TOWER, vehicle_type_id: economyId, payment: "cash" } })).body as { id: number };
    expect((await call("POST", "/taxi/live-token", { token: rider.access_token })).body).toMatchObject({ ride_id: asked.id, follow: null });
    // Offered to the driver: written to their offers.
    expect(live.calls.find((c) => c.url === `${DATABASE}/yallapp/${app.id}/offers/d${driver.id}.json`)).toMatchObject({ method: "PUT", body: { ride_id: asked.id } });
    await call("POST", "/driver/rides/{ride_id}/accept", { params: [String(asked.id)], token: driver.access_token });
    expect(live.calls.filter((c) => c.url === `${DATABASE}/yallapp/${app.id}/rides/${asked.id}.json`).at(-1)).toMatchObject({ method: "PUT", body: { status: "accepted", driver_key: `d${driver.id}` } });
    expect((await call("POST", "/taxi/live-token", { token: rider.access_token })).body).toMatchObject({ role: "rider", ride_id: asked.id, follow: `d${driver.id}` });
    const own = (await call("POST", "/taxi/live-token", { token: driver.access_token })).body as { token: string };
    expect(own).toMatchObject({ role: "driver", driver_key: `d${driver.id}`, ride_id: asked.id, follow: null });
    expect(JSON.parse(Buffer.from(own.token.split(".")[1]!, "base64url").toString()).claims).toEqual({ app: app.id, role: "driver", driver_key: `d${driver.id}`, ride: String(asked.id) });
  });

  it("searches places and routes on the company's map, and prices the ride by the route", async () => {
    expect((await call("GET", "/taxi/places", { query: { q: "ramses" } })).body).toMatchObject({ code: "feature_disabled" });
    expect((await call("POST", "/taxi/route", { body: { from: TAHRIR, to: TOWER } })).body).toMatchObject({ code: "feature_disabled" });
    await store.saveDeliverySettings(app.id, settingsWith({ provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", searchUrl: "https://search.lamha.test" }), NOW);
    expect((await call("GET", "/taxi/places", { query: { q: "ramses", lat: "30.04", lng: "31.23" } })).body).toEqual({ items: [{ id: "osm:N42", name: "Ramses Station", address: "Ramses Station, Cairo", lat: 30.06, lng: 31.25 }] });
    expect((await call("GET", "/taxi/places", { query: { q: "r" } })).status).toBe(400);
    await store.saveDeliverySettings(app.id, settingsWith({ provider: "google", googleKeyEncrypted: sealGoogleKey(app, GOOGLE_KEY, KEY) }), NOW);
    expect((await call("POST", "/taxi/route", { body: { from: TAHRIR, to: TOWER } })).body).toEqual({ distance_km: 2, minutes: 9, points: decodePolyline(POLYLINE) });
    // 15 + 6 × 2 + 9 × 1 = 36.00: the route's 2 km and 9 minutes, not the straight line's.
    const estimate = (await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER } })).body as { distance_km: number; minutes: number; options: { fare: string }[] };
    expect([estimate.distance_km, estimate.minutes, estimate.options[0]!.fare]).toEqual([2, 9, "36.00"]);
  });

  it("limits each person's searches", async () => {
    await store.saveDeliverySettings(app.id, settingsWith({ provider: "osm", tilesUrl: "https://tiles.lamha.test/{z}/{x}/{y}.png", searchUrl: "https://search.lamha.test" }), NOW);
    const rider = await signUp("1001112222", "Mona");
    for (let i = 0; i < 120; i++) expect((await call("GET", "/taxi/places", { query: { q: "ramses" }, token: rider.access_token })).status).toBe(200);
    expect((await call("GET", "/taxi/places", { query: { q: "ramses" }, token: rider.access_token })).body).toMatchObject({ code: "rate_limited" });
  });

  it("waits for the plan: everything of the app answers feature_disabled", async () => {
    rides = false;
    expect((await call("GET", "/taxi/nearby", { query: { lat: "30.0444", lng: "31.2357" } })).body).toMatchObject({ code: "feature_disabled" });
    expect((await call("POST", "/rides/estimate", { body: { pickup: TAHRIR, dropoff: TOWER } })).body).toMatchObject({ code: "feature_disabled" });
  });
});
