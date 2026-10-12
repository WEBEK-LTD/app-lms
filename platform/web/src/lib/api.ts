import "server-only";
import { signUrl } from "./crypto/signed-url";
import { getStore } from "./data";
import type { DataStore } from "./data/store";
import type { PluginRelease } from "./data/types";
import { appUrl, signingSecret } from "./env";
import { ipFromHeaders, json, noContent, rateLimited } from "./http";
import type { ApiResult } from "./license/service";
import { hitRateLimit, type RateLimitRule } from "./rate-limit";

/** Turns a service result into a response. */
export function toResponse<T>(result: ApiResult<T>): Response {
  if (result.status === 204) return noContent();
  return json(result.body, result.status);
}

/** Applies a per-IP rate limit; returns a 429 response when it's exceeded. */
export async function limitByIp(store: DataStore, request: Request, rule: RateLimitRule): Promise<Response | null> {
  const result = await hitRateLimit(store, rule, ipFromHeaders(request.headers));
  return result.allowed ? null : rateLimited(result.retryAfter);
}

export async function storeAndLimit(request: Request, rule: RateLimitRule): Promise<{ store: DataStore; limited: Response | null }> {
  const store = await getStore();
  return { store, limited: await limitByIp(store, request, rule) };
}

export const PLUGIN_DOWNLOAD_PATH = "/api/v1/plugin/download";

/** Signed, expiring link to a plugin release zip. */
export function pluginDownloadUrl(release: PluginRelease, ttlSeconds: number): string {
  return signUrl(appUrl(), PLUGIN_DOWNLOAD_PATH, { release: release.id }, signingSecret(), ttlSeconds);
}
