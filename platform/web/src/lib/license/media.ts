import type { DataStore } from "../data/store";
import { isMediaId, parseMediaLink, resolveMedia, type ResolvedMedia } from "../media/files";
import type { MediaStorage } from "../media/storage";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { hashLicenseKey } from "./key";
import { parseSiteInfo, type SiteInfo } from "./service";
import { licenseUsesSite } from "./site";
import { licenseState } from "./status";

/**
 * 51 POST /api/v1/licenses/media (docs/api/platform.yaml: mediaLinks): a
 * WordPress site plays videos from its app's Yallapp Media library in
 * Tutor LMS, LearnPress and the other LMSs' lessons. The plugin checks that
 * the student may open the lesson, then asks here, with its license, for
 * links signed for that request: short-lived, to play (4 hours) or to save
 * for offline viewing (15 minutes). Only the license's own app's files.
 */

export const MEDIA_LINKS_MAX = 20;

export interface MediaLinksRequest {
  site: SiteInfo;
  /** Yallapp links (https://yallapp.com.tr/m/<id>) or bare IDs. */
  media: string[];
  purpose: "play" | "download";
}

type Fail = { status: 400 | 403 | 404 | 429 | 503; body: { code: string; message: string; retry_after_seconds?: number } };

const fail = (status: Fail["status"], code: string, message: string, extra: Record<string, number> = {}): Fail => ({ status, body: { code, message, ...extra } });

export function parseMediaLinksRequest(body: unknown, baseUrl: string): { ok: true; value: MediaLinksRequest } | { ok: false; result: Fail } {
  const site = parseSiteInfo(body);
  if (!site.ok) return { ok: false, result: fail(400, "invalid_request", site.result.body.message) };
  const input = body as Record<string, unknown>;
  const purpose = input.purpose ?? "play";
  if (purpose !== "play" && purpose !== "download") return { ok: false, result: fail(400, "invalid_request", 'purpose must be "play" or "download".') };
  if (!Array.isArray(input.media) || input.media.length < 1 || input.media.length > MEDIA_LINKS_MAX) {
    return { ok: false, result: fail(400, "invalid_request", `media must be a list of 1 to ${MEDIA_LINKS_MAX} Yallapp media links.`) };
  }
  const media: string[] = [];
  for (const item of input.media) {
    const value = typeof item === "string" ? item.trim() : "";
    const id = isMediaId(value) ? value : parseMediaLink(value, baseUrl);
    if (!id) return { ok: false, result: fail(400, "invalid_request", "Each media item must be a Yallapp media link, like https://yallapp.com.tr/m/<id>.") };
    media.push(id);
  }
  return { ok: true, value: { site: site.value, media: [...new Set(media)], purpose } };
}

export interface MediaLinksResult {
  status: 200;
  body: {
    items: { id: string; kind: string; url: string; expires_at: string; size_bytes: number; mime_type: string; name: string }[];
    /** IDs that aren't this app's ready files (deleted, or still uploading). */
    missing: string[];
  };
}

export async function mediaLinks(
  store: DataStore,
  request: MediaLinksRequest,
  deps: { storage: MediaStorage | null; baseUrl: string; now: Date },
): Promise<MediaLinksResult | Fail> {
  const license = await store.getLicenseByHash(hashLicenseKey(request.site.licenseKey));
  const client = license ? await store.getClientById(license.clientId) : null;
  if (!license || !client) return fail(404, "license_not_found", "This license key doesn't exist. Check it in your Yallapp dashboard.");
  if (licenseState(client, license, deps.now) !== "active") return fail(403, "license_inactive", "This license isn't active, so its videos can't play.");
  const activation = await store.getActivation(license.id);
  if (!activation || activation.siteUrl !== request.site.siteUrl || !(await licenseUsesSite(store, license))) {
    return fail(403, "license_inactive", "This license isn't active on this site.");
  }
  if (!license.appId) return fail(404, "not_found", "This license has no app yet.");
  const hit = await hitRateLimit(store, RATE_LIMITS.mediaLinksLicense, license.id, deps.now);
  if (!hit.allowed) return fail(429, "rate_limited", "Too many media requests. Try again shortly.", { retry_after_seconds: hit.retryAfter });
  if (!deps.storage) return fail(503, "media_unavailable", "Media isn't available right now.");
  const items: MediaLinksResult["body"]["items"] = [];
  const missing: string[] = [];
  for (const id of request.media) {
    const resolved: ResolvedMedia | null = await resolveMedia({ store, storage: deps.storage, baseUrl: deps.baseUrl }, license.appId, `${deps.baseUrl}/m/${id}`, request.purpose);
    if (!resolved) {
      missing.push(id);
      continue;
    }
    items.push({
      id: resolved.id,
      kind: resolved.kind,
      url: resolved.url,
      expires_at: resolved.expiresAt.toISOString(),
      size_bytes: resolved.sizeBytes,
      mime_type: resolved.mimeType,
      name: resolved.name,
    });
  }
  return { status: 200, body: { items, missing } };
}
