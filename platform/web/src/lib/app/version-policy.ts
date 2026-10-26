import type { DataStore } from "../data/store";
import type { App, PublishingRequest } from "../data/types";
import { ANALYTICS_KEY_HEADER, analyticsKeyMatches } from "../analytics/ingest";
import { ipFromHeaders } from "../http";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";

/**
 * 89.1 Which versions of an app may still be used: the owner's minimum
 * (older ones stop at "Update required") and recommended version (older ones
 * are asked to update, once per recommended version), for every app,
 * answered by Yallapp (docs/api/platform.yaml, getAppVersionPolicy), with
 * the app's page on the store it was installed from.
 */

export const VERSION = /^\d+(\.\d+){0,3}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORES = ["google_play", "app_store", "galaxy_store", "appgallery", "testflight", "other"] as const;
type InstallStore = (typeof STORES)[number];

/** Negative when a is older than b, by each number in turn (1.10 is newer than 1.9). */
export function compareVersions(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/** The app's page on the store it came from; null when there's none yet. */
export function storeUrlFor(app: Pick<App, "androidPackage">, request: PublishingRequest | null, platform: "android" | "ios", store: InstallStore | null): string | null {
  const live = (track: { status: string; storeUrl: string | null } | null | undefined) => (track?.status === "live" && track.storeUrl ? track.storeUrl : null);
  if (platform === "ios") return live(request?.ios);
  const id = app.androidPackage ? encodeURIComponent(app.androidPackage) : null;
  if (store === "galaxy_store") return live(request?.galaxy) ?? (id ? `https://galaxystore.samsung.com/detail/${id}` : null);
  if (store === "appgallery") return live(request?.huawei) ?? (id ? `https://appgallery.huawei.com/app/${id}` : null);
  return live(request?.android) ?? (id ? `https://play.google.com/store/apps/details?id=${id}` : null);
}

export interface VersionPolicy {
  update_required: boolean;
  update_recommended: boolean;
  minimum_version: string | null;
  recommended_version: string | null;
  store_url: string | null;
}

export function versionPolicy(app: Pick<App, "androidPackage" | "minVersion" | "recommendedVersion">, request: PublishingRequest | null, input: { platform: "android" | "ios"; version: string; store: InstallStore | null }): VersionPolicy {
  const minimum = app.minVersion ?? null;
  const recommended = app.recommendedVersion ?? null;
  const required = minimum !== null && compareVersions(input.version, minimum) < 0;
  return {
    update_required: required,
    update_recommended: !required && recommended !== null && compareVersions(input.version, recommended) < 0,
    minimum_version: minimum,
    recommended_version: recommended,
    store_url: storeUrlFor(app, request, input.platform, input.store),
  };
}

/** What the owner may save: versions like 1.4.0, the minimum no newer than the recommended one. */
export function versionSettingsProblems(input: { minVersion: string; recommendedVersion: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.minVersion && !VERSION.test(input.minVersion)) errors.minVersion = "Write a version like 1.4.0.";
  if (input.recommendedVersion && !VERSION.test(input.recommendedVersion)) errors.recommendedVersion = "Write a version like 1.4.0.";
  if (!errors.minVersion && !errors.recommendedVersion && input.minVersion && input.recommendedVersion && compareVersions(input.minVersion, input.recommendedVersion) > 0) {
    errors.recommendedVersion = "The recommended version can't be older than the minimum.";
  }
  return errors;
}

/** GET /api/v1/apps/{app_id}/version: the answer and its status. */
export async function answerVersionCheck(
  store: DataStore,
  input: { appId: string; headers: Headers; query: URLSearchParams; secret: string; now: Date },
): Promise<{ status: number; body: unknown; retryAfter?: number }> {
  const ip = await hitRateLimit(store, RATE_LIMITS.analyticsIp, ipFromHeaders(input.headers), input.now);
  if (!ip.allowed) return { status: 429, body: { code: "rate_limited", message: "Too many requests. Try again shortly.", retry_after_seconds: ip.retryAfter }, retryAfter: ip.retryAfter };
  if (!UUID.test(input.appId)) return { status: 404, body: { code: "not_found", message: "Not found." } };
  const platform = input.query.get("platform");
  const version = input.query.get("version") ?? "";
  const asked = input.query.get("store");
  if (platform !== "android" && platform !== "ios") return { status: 400, body: { code: "invalid_request", message: "platform must be android or ios." } };
  if (!VERSION.test(version)) return { status: 400, body: { code: "invalid_request", message: "version must look like 1.4.0." } };
  if (asked !== null && !(STORES as readonly string[]).includes(asked)) return { status: 400, body: { code: "invalid_request", message: "store isn't one the contract lists." } };
  const app = await store.getAppById(input.appId);
  if (!app) return { status: 404, body: { code: "not_found", message: "Not found." } };
  if (!analyticsKeyMatches(app.id, input.headers.get(ANALYTICS_KEY_HEADER), input.secret)) {
    return { status: 403, body: { code: "invalid_key", message: "The analytics key isn't this app's." } };
  }
  const perApp = await hitRateLimit(store, RATE_LIMITS.analyticsApp, app.id, input.now);
  if (!perApp.allowed) return { status: 429, body: { code: "rate_limited", message: "Too many requests. Try again shortly.", retry_after_seconds: perApp.retryAfter }, retryAfter: perApp.retryAfter };
  return { status: 200, body: versionPolicy(app, await store.getPublishingRequest(app.id), { platform, version, store: (asked as InstallStore | null) ?? null }) };
}
