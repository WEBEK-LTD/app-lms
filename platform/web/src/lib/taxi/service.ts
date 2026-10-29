import type { DataStore } from "../data/store";
import type { App, Courier, DeliverySettings, RidesSettings, TaxiSettings } from "../data/types";
import { isReviewCourier } from "../delivery/review";
import type { ServiceAccount } from "../hosted/push";
import { exactKm } from "../rides/fares";
import { DRIVER_ACTIVE } from "../rides/service";
import { createTilesSession, googleTilesUrl, regionOf, sessionValid, type MapDeps } from "./maps";
import { driverKey, liveRoot } from "./live";
import { NEARBY_EVERY_SECONDS, taxiSettingsOf } from "./settings";

/** 105.9 What a live taxi app is told (`Config.taxi`) and the free taxis around a rider. */

/** Positions older than this aren't shown. */
export const NEARBY_FRESH_SECONDS = 60;
export const NEARBY_MAX = 30;

export interface TaxiConfigInput {
  store: DataStore;
  app: App;
  settings: DeliverySettings;
  /** The company's Google key, opened. */
  googleKey: string | null;
  account: ServiceAccount | null;
  language: string;
  now: Date;
  maps?: MapDeps;
}

/**
 * `Config.taxi`. Google's tiles need a session, made here when the saved one
 * ends within a day and saved with the settings; a session that can't be
 * made leaves the map empty rather than the app closed.
 */
export async function taxiConfig(input: TaxiConfigInput) {
  const taxi = taxiSettingsOf(input.settings);
  let tilesUrl: string | null = null;
  let attribution: string | null = null;
  if (taxi.provider === "google") {
    if (input.googleKey) {
      let session = taxi.googleSession;
      if (!sessionValid(session, input.now)) {
        try {
          const made = await createTilesSession(input.googleKey, { language: input.language, region: regionOf(input.settings.currency) }, input.maps);
          session = { token: made.token, expiresAt: made.expiresAt.toISOString() };
          await input.store.saveDeliverySettings(input.app.id, { ...input.settings, taxi: { ...taxi, googleSession: session } }, input.now);
        } catch {
          session = null;
        }
      }
      if (session) {
        tilesUrl = googleTilesUrl(input.googleKey, session.token);
        attribution = `Map data ©${input.now.getUTCFullYear()} Google`;
      }
    }
  } else if (taxi.tilesUrl) {
    tilesUrl = taxi.tilesUrl;
    attribution = taxi.attribution;
  }
  const google = taxi.provider === "google" && input.googleKey !== null;
  return {
    map: {
      provider: taxi.provider,
      tiles_url: tilesUrl,
      attribution,
      search: google || (taxi.provider === "osm" && taxi.searchUrl !== null),
      routes: google || (taxi.provider === "osm" && taxi.routingUrl !== null),
    },
    live: liveOf(input.app, taxi, input.account),
    nearby_every_seconds: NEARBY_EVERY_SECONDS,
  };
}

/** The live database the app uses, when the company set one and the app has its service account. */
export function liveOf(app: Pick<App, "id">, taxi: TaxiSettings, account: ServiceAccount | null): { database_url: string; root: string } | null {
  return taxi.databaseUrl && account ? { database_url: taxi.databaseUrl, root: liveRoot(app) } : null;
}

/** About 10 metres. */
const round = (n: number) => Math.round(n * 10_000) / 10_000;

/**
 * The online drivers with no ride and a position under a minute old, within
 * the company's matching distance of the place, nearest first. The review
 * driver (store reviewers') is never shown to anyone.
 */
export async function nearbyTaxis(store: DataStore, app: App, rides: RidesSettings, at: { lat: number; lng: number }, now: Date) {
  const [drivers, going] = await Promise.all([
    store.listCouriers(app.id),
    store.listRides({ appId: app.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 2000 }),
  ]);
  const busy = new Set(going.items.map((r) => r.driverId));
  const fresh = now.getTime() - NEARBY_FRESH_SECONDS * 1000;
  const found: { driver: Courier; km: number }[] = [];
  for (const driver of drivers) {
    if (!driver.active || !driver.onDuty || !driver.driver || busy.has(driver.id) || isReviewCourier(app, driver)) continue;
    if (driver.lat === null || driver.lng === null || !driver.locatedAt || driver.locatedAt.getTime() < fresh) continue;
    const km = exactKm(at, { lat: driver.lat, lng: driver.lng });
    if (km <= rides.matchRadiusKm) found.push({ driver, km });
  }
  found.sort((a, b) => a.km - b.km || a.driver.id - b.driver.id);
  return {
    items: found.slice(0, NEARBY_MAX).map(({ driver }) => ({
      driver_key: driverKey(driver.id),
      lat: round(driver.lat!),
      lng: round(driver.lng!),
      heading: driver.driver?.heading ?? null,
      vehicle_type_id: driver.driver?.vehicleTypeId ?? null,
    })),
  };
}
