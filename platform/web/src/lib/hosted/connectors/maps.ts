import type { App } from "../../data/types";
import type { DataStore } from "../../data/store";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { platformAppMap } from "../../maps/app-map";
import { located } from "../../rides/fares";
import { platformSetting } from "../../settings/platform";
import { addressAt, canRoute, canSearch, MapError, placeById, routeBetween, searchPlaces, type MapAccess, type MapDeps, type MapPlace } from "../../taxi/maps";
import { error } from "./common";
import type { ConnectorRequest, ConnectorResult } from "./types";

/**
 * 112 Place search and routes on an app's map, through Yallapp (tag Maps):
 * `GET /maps/places`, `GET /maps/places/{place_id}`, 112.6 `GET /maps/address`
 * (the place at a position, for "My location") and `POST /maps/route`, for
 * ride, taxi, delivery and food apps alike, on the map their app draws
 * (lib/maps/app-map.ts). 105.9's `/taxi/places` and `/taxi/route` are the
 * same, for the taxi apps built before.
 */

/** Each person's place searches and routes (they cost the company on Google, and the platform on its servers). */
export const MAP_LIMITS: Record<"places" | "route", RateLimitRule> = {
  places: { name: "taxi-places", limit: 120, windowSeconds: 10 * 60 },
  route: { name: "taxi-route", limit: 60, windowSeconds: 10 * 60 },
};

export interface MapEndpointDeps {
  store: DataStore;
  app: Pick<App, "id">;
  /** The app's map now, in the asker's language; null without one. */
  access: (language: string) => Promise<MapAccess | null>;
  maps?: MapDeps;
}

const noSearch = () => error(403, "feature_disabled", "Place search isn't set up in this app.");
const noRoutes = () => error(403, "feature_disabled", "Routes aren't set up in this app.");
const tooMany = () => error(429, "rate_limited", "Too many requests. Please wait a moment.");

function mapProblem(e: unknown): ConnectorResult {
  if (e instanceof MapError) {
    if (e.code === "not_found") return error(404, "not_found", "Place not found.");
    return error(502, e.code, e.code === "no_route" ? "There's no road between these places." : "The map isn't answering right now. Please try again.");
  }
  throw e;
}

export const coordinate = (value: string | null, max: number): number | null => {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
};

function latLngOf(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== "object") return null;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  return typeof lat === "number" && typeof lng === "number" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

const placeJson = (p: MapPlace) => ({ id: p.id, name: p.name, address: p.address, lat: p.lat, lng: p.lng });

/** Whether a request is one of the map's: `/maps/…`, or with [taxi] 105.9's `/taxi/places…` and `/taxi/route`. */
export function isMapRequest(path: string[], taxi = false): boolean {
  if (path[0] === "maps") return true;
  return taxi && path[0] === "taxi" && (path[1] === "places" || path[1] === "route");
}

/** Answers a map request (see [isMapRequest]); 404 for any other path under `/maps`. */
export async function handleMapRequest(deps: MapEndpointDeps, request: ConnectorRequest): Promise<ConnectorResult> {
  const [, part, id] = request.path;
  if (request.method === "GET" && part === "places" && request.path.length === 2) return places(deps, request);
  if (request.method === "GET" && part === "places" && request.path.length === 3) return place(deps, request, id!);
  if (request.method === "GET" && part === "address" && request.path.length === 2) return address(deps, request);
  if (request.method === "POST" && part === "route" && request.path.length === 2) return route(deps, request);
  return error(404, "not_found", "Not found.");
}

async function limited(deps: MapEndpointDeps, rule: RateLimitRule, request: ConnectorRequest): Promise<boolean> {
  // Signed-in people by account; others share the app's guest allowance, ten times one person's.
  const subject = request.user ? `${deps.app.id}:u${request.user.id}` : `${deps.app.id}:guests`;
  const result = await hitRateLimit(deps.store, request.user ? rule : { ...rule, limit: rule.limit * 10 }, subject, request.now);
  return !result.allowed;
}

async function places(deps: MapEndpointDeps, request: ConnectorRequest): Promise<ConnectorResult> {
  const q = (request.query.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 100) return error(400, "invalid_request", "Type at least 2 letters.");
  const lat = coordinate(request.query.get("lat"), 90);
  const lng = coordinate(request.query.get("lng"), 180);
  const session = (request.query.get("session") ?? "").slice(0, 64) || null;
  const access = await deps.access(request.lang ?? "en");
  if (!access || !canSearch(access)) return noSearch();
  if (await limited(deps, MAP_LIMITS.places, request)) return tooMany();
  try {
    const items = await searchPlaces(access, { q, near: lat !== null && lng !== null ? { lat, lng } : null, session }, deps.maps);
    return { status: 200, body: { items: items.map(placeJson) } };
  } catch (e) {
    return mapProblem(e);
  }
}

async function place(deps: MapEndpointDeps, request: ConnectorRequest, id: string): Promise<ConnectorResult> {
  if (id.length > 300) return error(404, "not_found", "Place not found.");
  const access = await deps.access(request.lang ?? "en");
  if (!access || !canSearch(access)) return noSearch();
  if (await limited(deps, MAP_LIMITS.places, request)) return tooMany();
  try {
    return { status: 200, body: placeJson(await placeById(access, id, (request.query.get("session") ?? "").slice(0, 64) || null, deps.maps)) };
  } catch (e) {
    return mapProblem(e);
  }
}

/** 112.6 The place at the person's position, named; 404 when the map has none there. */
async function address(deps: MapEndpointDeps, request: ConnectorRequest): Promise<ConnectorResult> {
  const lat = coordinate(request.query.get("lat"), 90);
  const lng = coordinate(request.query.get("lng"), 180);
  if (lat === null || lng === null) return error(400, "invalid_request", "Give the position's lat and lng.");
  const access = await deps.access(request.lang ?? "en");
  if (!access || !canSearch(access)) return noSearch();
  if (await limited(deps, MAP_LIMITS.places, request)) return tooMany();
  try {
    const found = await addressAt(access, { lat, lng }, deps.maps, request.now);
    return found ? { status: 200, body: placeJson(found) } : error(404, "not_found", "No address here.");
  } catch (e) {
    return mapProblem(e);
  }
}

async function route(deps: MapEndpointDeps, request: ConnectorRequest): Promise<ConnectorResult> {
  const body = (request.body ?? {}) as { from?: unknown; to?: unknown };
  const from = latLngOf(body.from);
  const to = latLngOf(body.to);
  if (!from || !to || !located(from) || !located(to)) return error(400, "invalid_request", "Give both places' lat and lng.");
  const access = await deps.access(request.lang ?? "en");
  if (!access || !canRoute(access)) return noRoutes();
  if (await limited(deps, MAP_LIMITS.route, request)) return tooMany();
  try {
    const found = await routeBetween(access, from, to, deps.maps);
    return { status: 200, body: { distance_km: found.distanceKm, minutes: found.minutes, points: found.points } };
  } catch (e) {
    return mapProblem(e);
  }
}

/** 112.2 A delivery or food app's map endpoints: the platform's map. */
export function platformMapEndpoints(deps: { store: DataStore; app: Pick<App, "id">; maps?: MapDeps }): MapEndpointDeps {
  return {
    store: deps.store,
    app: deps.app,
    access: async (language) => platformAppMap((await platformSetting(deps.store, "maps"))?.value ?? null, language),
    maps: deps.maps,
  };
}

/** The map's flags for an app's config: what draws it, and whether search and routes work. */
export function mapFlags(access: MapAccess | null): { search: boolean; routes: boolean } {
  return { search: access !== null && canSearch(access), routes: access !== null && canRoute(access) };
}
