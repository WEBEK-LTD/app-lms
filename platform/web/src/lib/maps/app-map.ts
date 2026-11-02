import type { App, DeliverySettings, MapTilesSetting, TaxiSettings } from "../data/types";
import type { MapAccess } from "../taxi/maps";
import { DEFAULT_TAXI_SETTINGS, googleKeyOf, isTaxiApp, taxiSettingsOf } from "../taxi/settings";

/**
 * 112 Whose map an app with places draws, searches and routes on:
 *
 * - a live taxi app (105.9): the company's own (Maps & live); Yallapp's demo
 *   app, which has none, the platform's;
 * - a ride hailing app (112.1): the company's own when it set one on Maps &
 *   live, else the platform's (Admin › Settings › Maps);
 * - delivery and food apps (112.2): the platform's.
 *
 * The platform's map is tiles and, when the team set them, its search
 * (Nominatim) and routing (OSRM) servers.
 */

export type MapSource = "company" | "platform";

export interface AppMap extends MapAccess {
  source: MapSource;
}

/** The company's own map is set: its Google key, or its tile server. */
export function companyMapSet(taxi: TaxiSettings, googleKey: string | null): boolean {
  return taxi.provider === "google" ? googleKey !== null : taxi.tilesUrl !== null;
}

/** The platform's map as map settings; null until the team sets its tiles. */
export function platformMapSettings(map: MapTilesSetting | null | undefined): TaxiSettings | null {
  if (!map?.tilesUrl) return null;
  return {
    ...DEFAULT_TAXI_SETTINGS,
    provider: "osm",
    tilesUrl: map.tilesUrl,
    attribution: map.attribution,
    searchUrl: map.searchUrl ?? null,
    routingUrl: map.routingUrl ?? null,
  };
}

/** The platform's map comes after the company's for ride hailing apps, and for Yallapp's own taxi demo. */
export function platformMapFor(app: Pick<App, "vertical" | "connector" | "demo">): boolean {
  return !isTaxiApp(app) || app.demo === true;
}

/** The company's Google key, opened; null without one or when it can't be opened. */
function companyKey(app: Pick<App, "id">, taxi: TaxiSettings, key: Buffer | null): string | null {
  if (taxi.provider !== "google" || !key) return null;
  try {
    return googleKeyOf(app, taxi, key);
  } catch {
    return null;
  }
}

/** A ride or taxi app's map, or null when there's none to draw. */
export function rideAppMap(
  app: Pick<App, "id" | "vertical" | "connector" | "demo">,
  settings: Pick<DeliverySettings, "taxi">,
  key: Buffer | null,
  platformMap: MapTilesSetting | null | undefined,
  language: string,
): AppMap | null {
  const taxi = taxiSettingsOf(settings);
  const googleKey = companyKey(app, taxi, key);
  if (companyMapSet(taxi, googleKey)) return { source: "company", settings: taxi, googleKey, language };
  const platform = platformMapFor(app) ? platformMapSettings(platformMap) : null;
  return platform ? { source: "platform", settings: platform, googleKey: null, language } : null;
}

/** A delivery or food app's map: the platform's. */
export function platformAppMap(platformMap: MapTilesSetting | null | undefined, language: string): AppMap | null {
  const settings = platformMapSettings(platformMap);
  return settings ? { source: "platform", settings, googleKey: null, language } : null;
}
