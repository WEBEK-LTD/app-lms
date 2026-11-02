import type { DataStore } from "../data/store";
import type { App, Courier, DeliverySettings, MapTilesSetting, RidesSettings, TaxiSettings } from "../data/types";
import { isReviewCourier } from "../delivery/review";
import type { ServiceAccount } from "../hosted/push";
import { demoTaxisAround } from "../demo/taxi";
import { companyMapSet, platformMapFor, platformMapSettings } from "../maps/app-map";
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
  /** Admin › Settings › Maps: drawn by ride hailing apps without a map of their own (112.1) and by Yallapp's own taxi demo app (110.5). */
  platformMap?: MapTilesSetting | null;
}

/**
 * `Config.taxi`. Google's tiles need a session, made here when the saved one
 * ends within a day and saved with the settings; a session that can't be
 * made leaves the map empty rather than the app closed. 112.1 A company
 * without a map of its own draws the platform's when its app may
 * (lib/maps/app-map.ts), with the platform's search and routes.
 */
export async function taxiConfig(input: TaxiConfigInput) {
  const taxi = taxiSettingsOf(input.settings);
  const company = companyMapSet(taxi, input.googleKey);
  const platform = !company && platformMapFor(input.app) ? platformMapSettings(input.platformMap) : null;
  let tilesUrl: string | null = null;
  let attribution: string | null = null;
  if (company && taxi.provider === "google") {
    let session = taxi.googleSession;
    if (!sessionValid(session, input.now)) {
      try {
        const made = await createTilesSession(input.googleKey!, { language: input.language, region: regionOf(input.settings.currency) }, input.maps);
        session = { token: made.token, expiresAt: made.expiresAt.toISOString() };
        await input.store.saveDeliverySettings(input.app.id, { ...input.settings, taxi: { ...taxi, googleSession: session } }, input.now);
      } catch {
        session = null;
      }
    }
    if (session) {
      tilesUrl = googleTilesUrl(input.googleKey!, session.token);
      attribution = `Map data ©${input.now.getUTCFullYear()} Google`;
    }
  } else if (company) {
    tilesUrl = taxi.tilesUrl;
    attribution = taxi.attribution;
  } else if (platform) {
    // Without any, the app shows the plain ride screens.
    tilesUrl = platform.tilesUrl;
    attribution = platform.attribution;
  }
  const google = company && taxi.provider === "google";
  const osm = company ? taxi : platform;
  return {
    map: {
      provider: platform ? ("osm" as const) : taxi.provider,
      tiles_url: tilesUrl,
      attribution,
      search: google || (osm !== null && osm.searchUrl !== null),
      routes: google || (osm !== null && osm.routingUrl !== null),
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
 * driver (store reviewers') is never shown to anyone. 110.5 In Yallapp's
 * demo app, its drivers drive around the place (lib/demo/taxi.ts).
 */
export async function nearbyTaxis(store: DataStore, app: App, rides: RidesSettings, at: { lat: number; lng: number }, now: Date) {
  const [all, going] = await Promise.all([
    store.listCouriers(app.id),
    store.listRides({ appId: app.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 2000 }),
  ]);
  const drivers = app.demo === true ? demoTaxisAround(all.filter((d) => d.active && d.driver && !isReviewCourier(app, d)), at, now).map((d) => ({ ...d, onDuty: true })) : all;
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
