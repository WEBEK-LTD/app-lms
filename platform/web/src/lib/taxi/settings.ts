import { decrypt, encrypt } from "../crypto/encryption";
import type { App, DeliverySettings, TaxiMapProvider, TaxiSettings } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 105.9 A live taxi app (Studio kind `taxi`: the rides engine with the
 * vertical `taxi`): whose map it draws (the company's Google Maps key, or
 * its OpenStreetMap tile server with its search and routing servers) and
 * the company's Firebase Realtime Database its positions move through, kept
 * with its delivery settings. Nothing here is Yallapp's: a company that set
 * nothing gets a working app that asks Yallapp every few seconds, without a
 * map behind the taxis.
 */

export const DEFAULT_TAXI_SETTINGS: TaxiSettings = {
  provider: "osm",
  googleKeyEncrypted: null,
  googleSession: null,
  tilesUrl: null,
  attribution: null,
  searchUrl: null,
  routingUrl: null,
  databaseUrl: null,
};

export const TAXI_LIMITS = {
  googleKey: 100,
  url: 300,
  attribution: 120,
} as const;

/** How often the app asks `GET /taxi/nearby` without a live database. */
export const NEARBY_EVERY_SECONDS = 5;

export const taxiMapsKeyContext = (appId: string) => `app:${appId}:taxi-maps-key`;

export function taxiSettingsOf(settings: Pick<DeliverySettings, "taxi">): TaxiSettings {
  return { ...DEFAULT_TAXI_SETTINGS, ...(settings.taxi ?? {}) };
}

/** A live taxi app: the rides engine with the vertical `taxi`. */
export function isTaxiApp(app: Pick<App, "vertical" | "connector">): boolean {
  return app.vertical === "taxi" && app.connector?.kind === "rides";
}

/** Its plan has live taxi apps (no plan: a check that doesn't depend on one); demos always. */
export function taxiOn(app: Pick<App, "demo">, plan: PlanInfo | null | undefined): boolean {
  return plan === undefined || hasFeature(plan, "taxi") || app.demo === true;
}

/** The company's Google key, opened; null when none is saved or it can't be opened. */
export function googleKeyOf(app: Pick<App, "id">, settings: TaxiSettings, key: Buffer): string | null {
  if (!settings.googleKeyEncrypted) return null;
  try {
    return decrypt(settings.googleKeyEncrypted, key, taxiMapsKeyContext(app.id));
  } catch {
    return null;
  }
}

export function sealGoogleKey(app: Pick<App, "id">, value: string, key: Buffer): string {
  return encrypt(value, key, taxiMapsKeyContext(app.id));
}

/** The key as the dashboard shows it: its first four and last three characters. */
export function maskedKey(value: string): string {
  return value.length <= 10 ? "•".repeat(value.length) : `${value.slice(0, 4)}${"•".repeat(16)}${value.slice(-3)}`;
}

/** Google API keys: "AIza" and 35 more characters. */
export const GOOGLE_KEY = /^AIza[0-9A-Za-z_-]{35}$/;

/** A Realtime Database's address: `https://<name>.firebaseio.com` or `https://<name>.<region>.firebasedatabase.app`. */
const DATABASE_URL = /^https:\/\/([a-z0-9][a-z0-9-]{0,62})(\.[a-z0-9-]{1,63})?\.(firebaseio\.com|firebasedatabase\.app)$/;

/** The database's address as saved (lowercase, no slash at the end), or null when it isn't one. */
export function databaseUrlOf(value: string): string | null {
  const url = value.trim().toLowerCase().replace(/\/+$/, "");
  const match = DATABASE_URL.exec(url);
  if (!match) return null;
  // firebaseio.com addresses have no region; firebasedatabase.app ones always do.
  if (match[3] === "firebaseio.com" ? match[2] !== undefined : match[2] === undefined) return null;
  return url;
}

/** An https address the company's servers answer on; null when it isn't one. */
function httpsUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

export function tilesUrlOk(value: string): boolean {
  const url = httpsUrl(value.replaceAll("{z}", "0").replaceAll("{x}", "0").replaceAll("{y}", "0"));
  return url !== null && ["{z}", "{x}", "{y}"].every((part) => value.includes(part)) && value.length <= TAXI_LIMITS.url;
}

/** A search or routing server's base address, without a slash at the end; null when it isn't one. */
export function serverUrlOf(value: string): string | null {
  const url = httpsUrl(value);
  if (!url || value.length > TAXI_LIMITS.url || url.search || url.hash) return null;
  return url.toString().replace(/\/+$/, "");
}

export type TaxiFormValues = Partial<Record<"provider" | "googleKey" | "tilesUrl" | "attribution" | "searchUrl" | "routingUrl" | "databaseUrl", string>>;

/**
 * The Maps & live form: the provider and its fields, and the database. A
 * Google key left empty keeps the saved one; the tile server is needed for
 * OpenStreetMap. Fields of the other provider are kept as they were.
 */
export function parseTaxiForm(
  values: TaxiFormValues,
  saved: TaxiSettings,
): { ok: true; value: Omit<TaxiSettings, "googleKeyEncrypted" | "googleSession">; googleKey: string | null } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const provider: TaxiMapProvider = values.provider === "google" ? "google" : "osm";
  const text = (v: string | undefined) => (v ?? "").trim();
  let googleKey: string | null = null;
  const tilesUrl = text(values.tilesUrl);
  const attribution = text(values.attribution);
  const searchUrl = text(values.searchUrl);
  const routingUrl = text(values.routingUrl);
  const databaseUrl = text(values.databaseUrl);
  if (provider === "google") {
    const typed = text(values.googleKey);
    if (typed) {
      if (!GOOGLE_KEY.test(typed)) errors.googleKey = "This isn't a Google API key. It starts with AIza and has 39 characters.";
      else googleKey = typed;
    } else if (!saved.googleKeyEncrypted) errors.googleKey = "Enter your Google Maps API key.";
  } else {
    if (!tilesUrl) errors.tilesUrl = "Enter your tile server's address.";
    else if (!tilesUrlOk(tilesUrl)) errors.tilesUrl = "Enter an https address with {z}, {x} and {y}, like https://tiles.example.com/{z}/{x}/{y}.png.";
    if (attribution.length > TAXI_LIMITS.attribution) errors.attribution = `Up to ${TAXI_LIMITS.attribution} characters.`;
    if (searchUrl && !serverUrlOf(searchUrl)) errors.searchUrl = "Enter your search server's https address.";
    if (routingUrl && !serverUrlOf(routingUrl)) errors.routingUrl = "Enter your routing server's https address.";
  }
  const database = databaseUrl ? databaseUrlOf(databaseUrl) : null;
  if (databaseUrl && !database) errors.databaseUrl = "Enter your database's address, like https://your-app-default-rtdb.firebaseio.com.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    googleKey,
    value:
      provider === "google"
        ? { provider, tilesUrl: saved.tilesUrl, attribution: saved.attribution, searchUrl: saved.searchUrl, routingUrl: saved.routingUrl, databaseUrl: database }
        : {
            provider,
            tilesUrl,
            attribution: attribution || "© OpenStreetMap contributors",
            searchUrl: searchUrl ? serverUrlOf(searchUrl) : null,
            routingUrl: routingUrl ? serverUrlOf(routingUrl) : null,
            databaseUrl: database,
          },
  };
}
