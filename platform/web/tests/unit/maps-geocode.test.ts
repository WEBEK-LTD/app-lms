import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { MapTilesSetting } from "@/lib/data/types";
import { mapConfigJson } from "@/lib/delivery/service";
import { platformAppMap } from "@/lib/maps/app-map";
import { handleMapRequest } from "@/lib/hosted/connectors/maps";
import { addressAt, canSearch, clearAddressCache, maptilerKeyOf, osmSearches, placeById, searchPlaces, type MapAccess } from "@/lib/taxi/maps";

const KEY = "AbCdEf123456";
const MAPTILER: MapTilesSetting = { tilesUrl: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${KEY}`, attribution: "© MapTiler © OpenStreetMap contributors", searchUrl: null, routingUrl: null };
const NOMINATIM: MapTilesSetting = { ...MAPTILER, searchUrl: "https://search.platform.test" };
const OTHER: MapTilesSetting = { tilesUrl: "https://tiles.platform.test/{z}/{x}/{y}.png", attribution: null, searchUrl: null, routingUrl: null };
const HERE = { lat: 30.0444, lng: 31.2357 };
const NOW = new Date("2026-11-03T12:00:00Z");

/** A fake map server: answers by the URL, and keeps what was asked. */
function servers(answer: (url: URL) => unknown) {
  const asked: URL[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    asked.push(url);
    const body = answer(url);
    return body === undefined ? new Response("no", { status: 500 }) : new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { asked, deps: { fetcher, safe: fetcher } };
}

const feature = (id: string, text: string, placeName: string, center: [number, number]) => ({ id, text, place_name: placeName, center });

const access = (map: MapTilesSetting, language = "ar"): MapAccess => platformAppMap(map, language)!;

beforeEach(() => clearAddressCache());

describe("112.6 MapTiler's tiles search with MapTiler's geocoding and the same key", () => {
  it("finds the key only in a MapTiler tile address", () => {
    expect(maptilerKeyOf(MAPTILER.tilesUrl)).toBe(KEY);
    expect(maptilerKeyOf(OTHER.tilesUrl)).toBeNull();
    expect(maptilerKeyOf("http://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=AbCdEf123456")).toBeNull();
    expect(maptilerKeyOf("https://api.maptiler.com.evil.test/{z}/{x}/{y}.png?key=AbCdEf123456")).toBeNull();
    expect(maptilerKeyOf("https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=…")).toBeNull();
    expect(maptilerKeyOf(null)).toBeNull();
  });

  it("says the apps can search with MapTiler's tiles, or a search server, and not with other tiles alone", () => {
    expect(osmSearches(MAPTILER)).toBe(true);
    expect(osmSearches(NOMINATIM)).toBe(true);
    expect(osmSearches(OTHER)).toBe(false);
    expect(mapConfigJson(MAPTILER)).toMatchObject({ search: true, routes: false });
    expect(mapConfigJson(OTHER)).toMatchObject({ search: false });
    expect(canSearch(access(MAPTILER))).toBe(true);
    expect(canSearch(access(OTHER))).toBe(false);
  });

  it("searches places by name near the person, in their language, from Yallapp's servers", async () => {
    const map = servers((url) => (url.pathname.startsWith("/geocoding/") ? { features: [feature("poi.1", "Mall of Egypt", "Mall of Egypt, Wahat Road, Giza", [30.97, 29.97]), { id: "bad" }] } : undefined));
    const places = await searchPlaces(access(MAPTILER), { q: "Mall of", near: HERE, session: null }, map.deps);
    expect(places).toEqual([{ id: "mt:poi.1", name: "Mall of Egypt", address: "Mall of Egypt, Wahat Road, Giza", lat: 29.97, lng: 30.97 }]);
    const url = map.asked[0]!;
    expect(url.origin).toBe("https://api.maptiler.com");
    expect(url.pathname).toBe("/geocoding/Mall%20of.json");
    expect(url.searchParams.get("key")).toBe(KEY);
    expect(url.searchParams.get("language")).toBe("ar");
    expect(url.searchParams.get("proximity")).toBe(`${HERE.lng},${HERE.lat}`);
    // Its places come with their position: none to look up.
    await expect(placeById(access(MAPTILER), "mt:poi.1", null, map.deps)).rejects.toMatchObject({ code: "not_found" });
  });

  it("names the place at the person's position, keeps it for a while, and keeps the position asked", async () => {
    const map = servers((url) => ({ features: [feature("address.9", "Talaat Harb Street", "Talaat Harb Street, Downtown, Cairo", [31.2358, 30.0445])], _: url }));
    const first = await addressAt(access(MAPTILER), HERE, map.deps, NOW);
    expect(first).toEqual({ id: "mt:address.9", name: "Talaat Harb Street", address: "Talaat Harb Street, Downtown, Cairo", lat: HERE.lat, lng: HERE.lng });
    expect(map.asked[0]!.pathname).toBe(`/geocoding/${HERE.lng},${HERE.lat}.json`);
    expect(await addressAt(access(MAPTILER), HERE, map.deps, NOW)).toEqual(first);
    expect(map.asked).toHaveLength(1);
    // Another language is asked again.
    await addressAt(access(MAPTILER, "tr"), HERE, map.deps, NOW);
    expect(map.asked).toHaveLength(2);
  });

  it("asks the search server's /reverse first when there is one", async () => {
    const map = servers((url) => (url.pathname === "/reverse" ? { osm_type: "way", osm_id: 42, lat: "30.0444", lon: "31.2357", name: "", display_name: "Tahrir Square, Cairo, Egypt" } : undefined));
    expect(await addressAt(access(NOMINATIM), HERE, map.deps, NOW)).toEqual({ id: "osm:W42", name: "Tahrir Square", address: "Tahrir Square, Cairo, Egypt", lat: 30.0444, lng: 31.2357 });
    expect(map.asked[0]!.origin).toBe("https://search.platform.test");
    expect(map.asked[0]!.searchParams.get("accept-language")).toBe("ar");
    const empty = servers(() => ({ error: "Unable to geocode" }));
    clearAddressCache();
    expect(await addressAt(access(NOMINATIM), HERE, empty.deps, NOW)).toBeNull();
  });

  it("asks Google's Geocoding API on a company's Google map", async () => {
    const google = servers((url) => (url.pathname === "/maps/api/geocode/json" ? { status: "OK", results: [{ place_id: "g1", formatted_address: "26 July St, Zamalek, Cairo" }] } : undefined));
    const map: MapAccess = { ...access(OTHER), settings: { ...access(OTHER).settings, provider: "google" }, googleKey: "google-key" };
    expect(await addressAt(map, HERE, google.deps, NOW)).toEqual({ id: "g1", name: "26 July St", address: "26 July St, Zamalek, Cairo", lat: HERE.lat, lng: HERE.lng });
    expect(google.asked[0]!.searchParams.get("latlng")).toBe(`${HERE.lat},${HERE.lng}`);
  });
});

describe("112.6 GET /maps/address", () => {
  const request = (query: string) => ({ method: "GET", path: ["maps", "address"], query: new URLSearchParams(query), body: null, user: null, now: NOW, lang: "ar" });

  it("answers the place, 404 without one, 403 without search and 400 without a position", async () => {
    const store = new MemoryStore();
    const named = servers(() => ({ features: [feature("address.9", "Talaat Harb Street", "Talaat Harb Street, Cairo", [31.2358, 30.0445])] }));
    const deps = { store, app: { id: "a" }, access: async (language: string) => platformAppMap(MAPTILER, language), maps: named.deps };
    expect(await handleMapRequest(deps, request(`lat=${HERE.lat}&lng=${HERE.lng}`))).toEqual({ status: 200, body: { id: "mt:address.9", name: "Talaat Harb Street", address: "Talaat Harb Street, Cairo", lat: HERE.lat, lng: HERE.lng } });
    expect((await handleMapRequest(deps, request("lat=200&lng=31"))).status).toBe(400);
    const nothing = servers(() => ({ features: [] }));
    expect((await handleMapRequest({ ...deps, maps: nothing.deps }, request("lat=10&lng=10"))).status).toBe(404);
    expect((await handleMapRequest({ ...deps, access: async (language: string) => platformAppMap(OTHER, language) }, request("lat=10&lng=10"))).status).toBe(403);
    const down = servers(() => undefined);
    expect(await handleMapRequest({ ...deps, maps: down.deps }, request("lat=11&lng=11"))).toMatchObject({ status: 502 });
  });
});
