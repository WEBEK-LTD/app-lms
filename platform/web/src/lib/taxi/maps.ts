import type { TaxiSettings } from "../data/types";
import { safeFetch } from "../net/safe-fetch";

/**
 * 105.9 The map of a live taxi app, from the company's own provider:
 *
 * - Google Maps, with the company's API key: the app draws Google's 2D
 *   tiles (Map Tiles API, with a session made here); place search (Places
 *   API) and routes (Routes API) are asked here, so the key does more than
 *   draw tiles only on Yallapp's servers.
 * - OpenStreetMap: the company's tile server, and optionally its Nominatim
 *   search and OSRM routing servers (OpenStreetMap's own servers aren't for
 *   apps). Those are the company's addresses, so they are called through
 *   `safeFetch`.
 */

type Fetch = typeof fetch;

export interface MapPlace {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface MapRoute {
  distanceKm: number;
  minutes: number;
  /** `[lat, lng]` pairs, at most `ROUTE_POINTS`. */
  points: [number, number][];
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** The provider failed or has no answer: `map_unavailable` (502), or `no_route`. */
export class MapError extends Error {
  constructor(
    message: string,
    readonly code: "map_unavailable" | "no_route" | "not_found" = "map_unavailable",
  ) {
    super(message);
  }
}

export const PLACES_MAX = 8;
export const ROUTE_POINTS = 500;
const CALL_MS = 6000;
/** A Map Tiles session is made again this long before it expires. */
const SESSION_MARGIN_MS = 24 * 3600_000;
/** OpenStreetMap servers want to know who calls them. */
const USER_AGENT = "Yallapp taxi (https://yallapp.com.tr)";

export interface MapDeps {
  /** Google's own servers. */
  fetcher?: Fetch;
  /** The company's servers (OpenStreetMap): public addresses only. */
  safe?: Fetch;
}

const googleFetch = (deps: MapDeps) => deps.fetcher ?? fetch;
const companyFetch = (deps: MapDeps): Fetch => deps.safe ?? ((input, init) => safeFetch(input as string, init));

/** The region Google's tiles are drawn for, from the company's currency. */
export function regionOf(currency: string): string {
  return ({ EGP: "EG", TRY: "TR", SAR: "SA", AED: "AE", EUR: "DE" } as Record<string, string>)[currency] ?? "US";
}

// Google

/** A Map Tiles API session: the token the tile addresses carry, and when it ends. */
export async function createTilesSession(key: string, options: { language: string; region: string }, deps: MapDeps = {}): Promise<{ token: string; expiresAt: Date }> {
  const response = await googleCall(deps, `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mapType: "roadmap", language: options.language, region: options.region }),
  });
  const body = (await response.json()) as { session?: string; expiry?: string };
  if (!body.session || !body.expiry) throw new MapError("Google didn't give a map session.");
  return { token: body.session, expiresAt: new Date(Number(body.expiry) * 1000) };
}

/** Whether the saved session still lasts long enough for an app opened now. */
export function sessionValid(session: TaxiSettings["googleSession"], now: Date): boolean {
  return session !== null && new Date(session.expiresAt).getTime() - SESSION_MARGIN_MS > now.getTime();
}

export function googleTilesUrl(key: string, session: string): string {
  return `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(session)}&key=${encodeURIComponent(key)}`;
}

async function googleCall(deps: MapDeps, url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await googleFetch(deps)(url, { ...init, signal: AbortSignal.timeout(CALL_MS) });
  } catch {
    throw new MapError("Google Maps didn't answer.");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const said = /"message"\s*:\s*"([^"]{1,300})"/.exec(text)?.[1];
    throw new MapError(said ? `Google Maps: ${said}` : `Google Maps answered with HTTP ${response.status}.`);
  }
  return response;
}

async function googlePlaces(key: string, input: { q: string; near: LatLng | null; session: string | null; language: string }, deps: MapDeps): Promise<MapPlace[]> {
  const response = await googleCall(deps, "https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      input: input.q,
      languageCode: input.language,
      ...(input.session ? { sessionToken: input.session } : {}),
      ...(input.near ? { locationBias: { circle: { center: { latitude: input.near.lat, longitude: input.near.lng }, radius: 30000 } } } : {}),
    }),
  });
  const body = (await response.json()) as {
    suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }[];
  };
  return (body.suggestions ?? []).flatMap((s) => {
    const p = s.placePrediction;
    if (!p?.placeId) return [];
    const name = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
    return name ? [{ id: p.placeId, name, address: p.structuredFormat?.secondaryText?.text ?? null, lat: null, lng: null }] : [];
  });
}

async function googlePlace(key: string, id: string, session: string | null, language: string, deps: MapDeps): Promise<MapPlace> {
  if (!/^[A-Za-z0-9_-]{1,300}$/.test(id)) throw new MapError("Place not found.", "not_found");
  const query = new URLSearchParams({ languageCode: language, ...(session ? { sessionToken: session } : {}) });
  const response = await googleCall(deps, `https://places.googleapis.com/v1/places/${id}?${query}`, {
    headers: { "x-goog-api-key": key, "x-goog-fieldmask": "id,displayName,formattedAddress,location" },
  });
  const body = (await response.json()) as { id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number } };
  if (typeof body.location?.latitude !== "number" || typeof body.location.longitude !== "number") throw new MapError("Place not found.", "not_found");
  return { id, name: body.displayName?.text ?? body.formattedAddress ?? "", address: body.formattedAddress ?? null, lat: body.location.latitude, lng: body.location.longitude };
}

async function googleRoute(key: string, from: LatLng, to: LatLng, deps: MapDeps): Promise<MapRoute> {
  const point = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
  const response = await googleCall(deps, "https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key, "x-goog-fieldmask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline" },
    body: JSON.stringify({ origin: point(from), destination: point(to), travelMode: "DRIVE", routingPreference: "TRAFFIC_AWARE" }),
  });
  const body = (await response.json()) as { routes?: { distanceMeters?: number; duration?: string; polyline?: { encodedPolyline?: string } }[] };
  const route = body.routes?.[0];
  if (!route || typeof route.distanceMeters !== "number") throw new MapError("There's no road between these places.", "no_route");
  return {
    distanceKm: Math.round(route.distanceMeters / 100) / 10,
    minutes: Math.max(1, Math.round(parseFloat(route.duration ?? "0") / 60)),
    points: thin(decodePolyline(route.polyline?.encodedPolyline ?? "")),
  };
}

/** Google's encoded polyline as `[lat, lng]` pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const next = (): number | null => {
    let result = 0;
    let shift = 0;
    for (;;) {
      if (index >= encoded.length) return null;
      const b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) break;
    }
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    const dLat = next();
    const dLng = next();
    if (dLat === null || dLng === null) break;
    lat += dLat;
    lng += dLng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** At most `ROUTE_POINTS` of a line, evenly, keeping its ends. */
export function thin(points: [number, number][], max = ROUTE_POINTS): [number, number][] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]!);
}

// OpenStreetMap

async function companyCall(deps: MapDeps, url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await companyFetch(deps)(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(CALL_MS) });
  } catch {
    throw new MapError("The map server didn't answer.");
  }
  if (!response.ok) throw new MapError(`The map server answered with HTTP ${response.status}.`);
  try {
    return await response.json();
  } catch {
    throw new MapError("The map server's answer isn't JSON.");
  }
}

interface NominatimPlace {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
}

function nominatimPlace(p: NominatimPlace): MapPlace | null {
  const type = p.osm_type?.[0]?.toUpperCase();
  const lat = Number(p.lat);
  const lng = Number(p.lon);
  if (!type || !p.osm_id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const address = p.display_name ?? null;
  return { id: `osm:${type}${p.osm_id}`, name: p.name || address?.split(",")[0] || "", address, lat, lng };
}

async function osmPlaces(searchUrl: string, input: { q: string; near: LatLng | null; language: string }, deps: MapDeps): Promise<MapPlace[]> {
  const query = new URLSearchParams({ q: input.q, format: "jsonv2", limit: String(PLACES_MAX), "accept-language": input.language });
  if (input.near) {
    // About 30 km around the rider, preferred but not required.
    const d = 0.3;
    query.set("viewbox", [input.near.lng - d, input.near.lat + d, input.near.lng + d, input.near.lat - d].join(","));
  }
  const body = await companyCall(deps, `${searchUrl}/search?${query}`);
  return (Array.isArray(body) ? (body as NominatimPlace[]) : []).flatMap((p) => nominatimPlace(p) ?? []);
}

async function osmPlace(searchUrl: string, id: string, language: string, deps: MapDeps): Promise<MapPlace> {
  const match = /^osm:([NWR]\d{1,15})$/.exec(id);
  if (!match) throw new MapError("Place not found.", "not_found");
  const body = await companyCall(deps, `${searchUrl}/lookup?${new URLSearchParams({ osm_ids: match[1]!, format: "jsonv2", "accept-language": language })}`);
  const place = Array.isArray(body) ? nominatimPlace(body[0] as NominatimPlace) : null;
  if (!place) throw new MapError("Place not found.", "not_found");
  return place;
}

async function osmRoute(routingUrl: string, from: LatLng, to: LatLng, deps: MapDeps): Promise<MapRoute> {
  const body = (await companyCall(deps, `${routingUrl}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`)) as {
    code?: string;
    routes?: { distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }[];
  };
  const route = body.routes?.[0];
  if (body.code !== "Ok" || !route || typeof route.distance !== "number") throw new MapError("There's no road between these places.", "no_route");
  return {
    distanceKm: Math.round(route.distance / 100) / 10,
    minutes: Math.max(1, Math.round((route.duration ?? 0) / 60)),
    points: thin((route.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng] as [number, number])),
  };
}

// Either

export interface MapAccess {
  settings: TaxiSettings;
  /** The company's Google key, opened. */
  googleKey: string | null;
  language: string;
}

export function canSearch(access: MapAccess): boolean {
  return access.settings.provider === "google" ? access.googleKey !== null : access.settings.searchUrl !== null;
}

export function canRoute(access: MapAccess): boolean {
  return access.settings.provider === "google" ? access.googleKey !== null : access.settings.routingUrl !== null;
}

export async function searchPlaces(access: MapAccess, input: { q: string; near: LatLng | null; session: string | null }, deps: MapDeps = {}): Promise<MapPlace[]> {
  const places =
    access.settings.provider === "google"
      ? await googlePlaces(access.googleKey!, { ...input, language: access.language }, deps)
      : await osmPlaces(access.settings.searchUrl!, { ...input, language: access.language }, deps);
  return places.slice(0, PLACES_MAX);
}

export async function placeById(access: MapAccess, id: string, session: string | null, deps: MapDeps = {}): Promise<MapPlace> {
  return access.settings.provider === "google" ? googlePlace(access.googleKey!, id, session, access.language, deps) : osmPlace(access.settings.searchUrl!, id, access.language, deps);
}

export async function routeBetween(access: MapAccess, from: LatLng, to: LatLng, deps: MapDeps = {}): Promise<MapRoute> {
  return access.settings.provider === "google" ? googleRoute(access.googleKey!, from, to, deps) : osmRoute(access.settings.routingUrl!, from, to, deps);
}

/** One line of the Maps & live page's test. */
export interface MapCheck {
  part: "tiles" | "search" | "routes";
  ok: boolean;
  /** Why not, when not. */
  problem: string | null;
}

/** A place every check looks up: central Cairo, and a short drive from it. */
const CHECK_FROM: LatLng = { lat: 30.0444, lng: 31.2357 };
const CHECK_TO: LatLng = { lat: 30.0626, lng: 31.2497 };

async function checked(part: MapCheck["part"], run: () => Promise<unknown>): Promise<MapCheck> {
  try {
    await run();
    return { part, ok: true, problem: null };
  } catch (e) {
    return { part, ok: false, problem: e instanceof MapError ? e.message : "It didn't answer." };
  }
}

/** Tries each part the company set up: the tiles, the search and the routes. */
export async function checkMap(access: MapAccess, options: { region: string }, deps: MapDeps = {}): Promise<MapCheck[]> {
  const { settings } = access;
  if (settings.provider === "google") {
    if (!access.googleKey) return [{ part: "tiles", ok: false, problem: "Enter your Google Maps API key." }];
    return Promise.all([
      checked("tiles", () => createTilesSession(access.googleKey!, { language: access.language, region: options.region }, deps)),
      checked("search", () => searchPlaces(access, { q: "Cairo", near: CHECK_FROM, session: null }, deps)),
      checked("routes", () => routeBetween(access, CHECK_FROM, CHECK_TO, deps)),
    ]);
  }
  const checks: Promise<MapCheck>[] = [
    checked("tiles", async () => {
      if (!settings.tilesUrl) throw new MapError("Enter your tile server's address.");
      let response: Response;
      try {
        response = await companyFetch(deps)(settings.tilesUrl.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0"), {
          headers: { "user-agent": USER_AGENT },
          signal: AbortSignal.timeout(CALL_MS),
        });
      } catch {
        throw new MapError("The tile server didn't answer.");
      }
      await response.body?.cancel().catch(() => undefined);
      if (!response.ok) throw new MapError(`The tile server answered with HTTP ${response.status}.`);
      if (!(response.headers.get("content-type") ?? "").startsWith("image/")) throw new MapError("The tile server didn't answer with a picture.");
    }),
  ];
  if (settings.searchUrl) checks.push(checked("search", () => searchPlaces(access, { q: "Cairo", near: CHECK_FROM, session: null }, deps)));
  if (settings.routingUrl) checks.push(checked("routes", () => routeBetween(access, CHECK_FROM, CHECK_TO, deps)));
  return Promise.all(checks);
}
