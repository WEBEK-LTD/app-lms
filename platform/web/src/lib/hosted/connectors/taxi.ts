import type { HostedUser } from "../../data/types";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { located } from "../../rides/fares";
import { DRIVER_ACTIVE, RIDE_ACTIVE } from "../../rides/service";
import { customToken, driverKey, liveRoot, type LiveClaims } from "../../taxi/live";
import { canRoute, canSearch, MapError, placeById, routeBetween, searchPlaces, type MapAccess, type MapDeps, type MapPlace } from "../../taxi/maps";
import { nearbyTaxis, taxiConfig } from "../../taxi/service";
import { googleKeyOf, taxiSettingsOf } from "../../taxi/settings";
import type { ServiceAccount } from "../push";
import { error } from "./common";
import { RidesConnector, type RidesDeps } from "./rides";
import type { ConnectorRequest, ConnectorResult } from "./types";

export interface TaxiDeps extends RidesDeps {
  /** Opens the company's Google key. */
  key: Buffer;
  /** The app's Firebase service account: live tokens and the database. */
  account: ServiceAccount | null;
  maps?: MapDeps;
}

/** Each person's place searches and routes (they cost the company on Google). */
export const TAXI_LIMITS: Record<"places" | "route", RateLimitRule> = {
  places: { name: "taxi-places", limit: 120, windowSeconds: 10 * 60 },
  route: { name: "taxi-route", limit: 60, windowSeconds: 10 * 60 },
};

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
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

const coordinate = (value: string | null, max: number): number | null => {
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

/**
 * 105.9 A live taxi app: everything of ride hailing (lib/hosted/connectors/
 * rides.ts), its fares from the route's real distance and time when the
 * company's map has routes, plus `Config.taxi` and the `/taxi` endpoints:
 * the token for the company's live database, the free taxis around a place,
 * and place search and routes through the company's map provider.
 */
export class TaxiConnector extends RidesConnector {
  constructor(private readonly taxiDeps: TaxiDeps) {
    super(taxiDeps);
  }

  private async access(language: string): Promise<MapAccess> {
    const { settings } = await this.settings();
    const taxi = taxiSettingsOf(settings);
    return { settings: taxi, googleKey: taxi.provider === "google" ? googleKeyOf(this.taxiDeps.app, taxi, this.taxiDeps.key) : null, language };
  }

  async config() {
    const base = await super.config();
    const { settings } = await this.settings();
    const taxi = taxiSettingsOf(settings);
    return {
      ...base,
      taxi: await taxiConfig({
        store: this.taxiDeps.store,
        app: this.taxiDeps.app,
        settings,
        googleKey: taxi.provider === "google" ? googleKeyOf(this.taxiDeps.app, taxi, this.taxiDeps.key) : null,
        account: this.taxiDeps.account,
        language: "en",
        now: new Date(),
        maps: this.taxiDeps.maps,
      }),
    };
  }

  protected async routeOf(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<{ km: number; minutes: number } | null> {
    const access = await this.access("en");
    if (!canRoute(access)) return null;
    try {
      const route = await routeBetween(access, from, to, this.taxiDeps.maps);
      return { km: route.distanceKm, minutes: route.minutes };
    } catch {
      // The map's trouble doesn't stop a ride: the straight line's estimate is used.
      return null;
    }
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    if (request.path[0] !== "taxi") return super.handle(request);
    if (this.taxiDeps.rides === false) return error(403, "feature_disabled", "Rides aren't available in this app right now.");
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "POST /taxi/live-token":
        return this.liveToken(request);
      case "GET /taxi/nearby":
        return this.nearby(request);
      case "GET /taxi/places":
        return this.places(request);
      case "POST /taxi/route":
        return this.route(request);
    }
    if (request.method === "GET" && request.path.length === 3 && request.path[1] === "places") return this.place(request, request.path[2]!);
    return error(404, "not_found", "Not found.");
  }

  private async limited(rule: RateLimitRule, request: ConnectorRequest): Promise<boolean> {
    // Signed-in people by account; others share the app's guest allowance, ten times one person's.
    const subject = request.user ? `${this.taxiDeps.app.id}:u${request.user.id}` : `${this.taxiDeps.app.id}:guests`;
    const result = await hitRateLimit(this.taxiDeps.store, request.user ? rule : { ...rule, limit: rule.limit * 10 }, subject, request.now);
    return !result.allowed;
  }

  private async liveToken(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const { settings } = await this.settings();
    const taxi = taxiSettingsOf(settings);
    if (!taxi.databaseUrl || !this.taxiDeps.account) return error(403, "feature_disabled", "This app has no live database.");
    const claims = await this.claimsFor(request.user, request.now);
    const made = customToken(this.taxiDeps.account, `u${request.user.id}`, claims, request.now);
    return {
      status: 200,
      body: {
        token: made.token,
        database_url: taxi.databaseUrl,
        root: liveRoot(this.taxiDeps.app),
        expires_at: made.expiresAt.toISOString(),
        role: claims.role,
        driver_key: claims.driver_key ?? null,
        ride_id: claims.ride ? Number(claims.ride) : null,
        follow: claims.follow ?? null,
      },
    };
  }

  /** A driver's own key and ride; a rider's ride that isn't over and its driver. */
  private async claimsFor(user: HostedUser, now: Date): Promise<LiveClaims> {
    const { store, app } = this.taxiDeps;
    const driver = await this.driverOf(user, now);
    if (driver) {
      const { items } = await store.listRides({ appId: app.id, driverId: driver.id, statuses: DRIVER_ACTIVE, order: "newest", offset: 0, limit: 1 });
      return { app: app.id, role: "driver", driver_key: driverKey(driver.id), ...(items[0] ? { ride: String(items[0].id) } : {}) };
    }
    const { items } = await store.listRides({ appId: app.id, userId: user.id, statuses: RIDE_ACTIVE, order: "newest", offset: 0, limit: 1 });
    const ride = items[0];
    return {
      app: app.id,
      role: "rider",
      ...(ride ? { ride: String(ride.id) } : {}),
      ...(ride && ride.driverId !== null && DRIVER_ACTIVE.includes(ride.status) ? { follow: driverKey(ride.driverId) } : {}),
    };
  }

  private async nearby(request: ConnectorRequest): Promise<ConnectorResult> {
    const lat = coordinate(request.query.get("lat"), 90);
    const lng = coordinate(request.query.get("lng"), 180);
    if (lat === null || lng === null) return error(400, "invalid_request", "Give the place's lat and lng.");
    const { rides } = await this.settings();
    return { status: 200, body: await nearbyTaxis(this.taxiDeps.store, this.taxiDeps.app, rides, { lat, lng }, request.now) };
  }

  private async places(request: ConnectorRequest): Promise<ConnectorResult> {
    const q = (request.query.get("q") ?? "").trim();
    if (q.length < 2 || q.length > 100) return error(400, "invalid_request", "Type at least 2 letters.");
    const lat = coordinate(request.query.get("lat"), 90);
    const lng = coordinate(request.query.get("lng"), 180);
    const session = (request.query.get("session") ?? "").slice(0, 64) || null;
    const access = await this.access(request.lang ?? "en");
    if (!canSearch(access)) return noSearch();
    if (await this.limited(TAXI_LIMITS.places, request)) return tooMany();
    try {
      const items = await searchPlaces(access, { q, near: lat !== null && lng !== null ? { lat, lng } : null, session }, this.taxiDeps.maps);
      return { status: 200, body: { items: items.map(placeJson) } };
    } catch (e) {
      return mapProblem(e);
    }
  }

  private async place(request: ConnectorRequest, id: string): Promise<ConnectorResult> {
    if (id.length > 300) return error(404, "not_found", "Place not found.");
    const access = await this.access(request.lang ?? "en");
    if (!canSearch(access)) return noSearch();
    if (await this.limited(TAXI_LIMITS.places, request)) return tooMany();
    try {
      return { status: 200, body: placeJson(await placeById(access, id, (request.query.get("session") ?? "").slice(0, 64) || null, this.taxiDeps.maps)) };
    } catch (e) {
      return mapProblem(e);
    }
  }

  private async route(request: ConnectorRequest): Promise<ConnectorResult> {
    const body = (request.body ?? {}) as { from?: unknown; to?: unknown };
    const from = latLngOf(body.from);
    const to = latLngOf(body.to);
    if (!from || !to || !located(from) || !located(to)) return error(400, "invalid_request", "Give both places' lat and lng.");
    const access = await this.access(request.lang ?? "en");
    if (!canRoute(access)) return noRoutes();
    if (await this.limited(TAXI_LIMITS.route, request)) return tooMany();
    try {
      const route = await routeBetween(access, from, to, this.taxiDeps.maps);
      return { status: 200, body: { distance_km: route.distanceKm, minutes: route.minutes, points: route.points } };
    } catch (e) {
      return mapProblem(e);
    }
  }
}
