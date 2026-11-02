import type { HostedUser } from "../../data/types";
import { platformMapFor, rideAppMap } from "../../maps/app-map";
import { DRIVER_ACTIVE, RIDE_ACTIVE } from "../../rides/service";
import { customToken, driverKey, liveRoot, type LiveClaims } from "../../taxi/live";
import { canRoute, routeBetween, type MapAccess, type MapDeps } from "../../taxi/maps";
import { nearbyTaxis, taxiConfig } from "../../taxi/service";
import { googleKeyOf, taxiSettingsOf } from "../../taxi/settings";
import { platformSetting } from "../../settings/platform";
import type { ServiceAccount } from "../push";
import { error } from "./common";
import { coordinate, handleMapRequest, isMapRequest, MAP_LIMITS } from "./maps";
import { RidesConnector, type RidesDeps } from "./rides";
import type { ConnectorRequest, ConnectorResult } from "./types";

export interface TaxiDeps extends RidesDeps {
  /** Opens the company's Google key. */
  key: Buffer;
  /** The app's Firebase service account: live tokens and the database. */
  account: ServiceAccount | null;
  maps?: MapDeps;
}

/** 105.9 Each person's place searches and routes: lib/hosted/connectors/maps.ts. */
export const TAXI_LIMITS = MAP_LIMITS;

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");

/**
 * 105.9 A live taxi app: everything of ride hailing (lib/hosted/connectors/
 * rides.ts), its fares from the route's real distance and time when the
 * company's map has routes, plus `Config.taxi` and the `/taxi` endpoints:
 * the token for the company's live database, the free taxis around a place,
 * and place search and routes through the company's map provider. 112.1
 * Every ride app is served here (ride hailing too): the same map (the
 * company's, else the platform's), routes, places, free cars around and
 * live database, each kind on its own plan feature.
 */
export class TaxiConnector extends RidesConnector {
  constructor(private readonly taxiDeps: TaxiDeps) {
    super(taxiDeps);
  }

  /** 112.1 The platform's map, for apps that may draw it. */
  private async platformMap() {
    return platformMapFor(this.taxiDeps.app) ? ((await platformSetting(this.taxiDeps.store, "maps"))?.value ?? null) : null;
  }

  private async access(language: string): Promise<MapAccess | null> {
    const [{ settings }, platform] = await Promise.all([this.settings(), this.platformMap()]);
    return rideAppMap(this.taxiDeps.app, settings, this.taxiDeps.key, platform, language);
  }

  async config() {
    const [base, { settings }, platform] = await Promise.all([super.config(), this.settings(), this.platformMap()]);
    const taxi = taxiSettingsOf(settings);
    let googleKey: string | null = null;
    try {
      googleKey = taxi.provider === "google" ? googleKeyOf(this.taxiDeps.app, taxi, this.taxiDeps.key) : null;
    } catch {
      googleKey = null;
    }
    return {
      ...base,
      taxi: await taxiConfig({
        store: this.taxiDeps.store,
        app: this.taxiDeps.app,
        settings,
        googleKey,
        account: this.taxiDeps.account,
        language: "en",
        now: new Date(),
        maps: this.taxiDeps.maps,
        platformMap: platform,
      }),
    };
  }

  protected async routeOf(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<{ km: number; minutes: number } | null> {
    const access = await this.access("en");
    if (!access || !canRoute(access)) return null;
    try {
      const route = await routeBetween(access, from, to, this.taxiDeps.maps);
      return { km: route.distanceKm, minutes: route.minutes };
    } catch {
      // The map's trouble doesn't stop a ride: the straight line's estimate is used.
      return null;
    }
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    if (request.path[0] !== "taxi" && request.path[0] !== "maps") return super.handle(request);
    if (this.taxiDeps.rides === false) return error(403, "feature_disabled", "Rides aren't available in this app right now.");
    // 112 Places and routes: `/maps/…`, and 105.9's `/taxi/places` and `/taxi/route`.
    if (isMapRequest(request.path, true)) {
      return handleMapRequest({ store: this.taxiDeps.store, app: this.taxiDeps.app, access: (language) => this.access(language), maps: this.taxiDeps.maps }, request);
    }
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "POST /taxi/live-token":
        return this.liveToken(request);
      case "GET /taxi/nearby":
        return this.nearby(request);
    }
    return error(404, "not_found", "Not found.");
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
}
