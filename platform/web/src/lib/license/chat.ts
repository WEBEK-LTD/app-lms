import { chatBaseUrl, chatAvailable } from "../chat/access";
import { forgetChatMember, startSiteSession } from "../chat/service";
import type { DataStore } from "../data/store";
import type { App, License } from "../data/types";
import { effectivePlans, planOfLicense } from "../entitlements";
import type { MediaStorage } from "../media/storage";
import { hashLicenseKey } from "./key";
import { parseSiteInfo, type SiteInfo } from "./service";
import { licenseUsesSite } from "./site";
import { licenseState } from "./status";

/**
 * 77 The chat of a WordPress app (platform.yaml, the Chat tag): the plugin
 * gets an hour's chat token for a person signed in on the site, and tells
 * Yallapp when a person's account is deleted. The license must be active on
 * the site that asks.
 */

export type Fail = { status: 400 | 403 | 404 | 429; body: { code: string; message: string; retry_after_seconds?: number } };
const fail = (status: Fail["status"], code: string, message: string, extra: Record<string, number> = {}): Fail => ({ status, body: { code, message, ...extra } });

const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const userId = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null);

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The license of the site, active there, with its app (85.4 also for campaign reports). */
export async function siteApp(store: DataStore, site: SiteInfo, now: Date): Promise<{ ok: true; license: License; app: App } | { ok: false; result: Fail }> {
  const license = await store.getLicenseByHash(hashLicenseKey(site.licenseKey));
  const client = license ? await store.getClientById(license.clientId) : null;
  if (!license || !client) return { ok: false, result: fail(404, "license_not_found", "This license key doesn't exist. Check it in your Yallapp dashboard.") };
  if (licenseState(client, license, now) !== "active") return { ok: false, result: fail(403, "license_inactive", "This license isn't active.") };
  const activation = await store.getActivation(license.id);
  if (!activation || activation.siteUrl !== site.siteUrl || !(await licenseUsesSite(store, license))) {
    return { ok: false, result: fail(403, "license_inactive", "This license isn't active on this site.") };
  }
  const app = license.appId ? await store.getAppById(license.appId) : null;
  if (!app) return { ok: false, result: fail(404, "not_found", "This license has no app yet.") };
  return { ok: true, license, app };
}

export interface ChatSessionBody {
  token: string;
  expires_at: string;
  base_url: string;
}

/** POST /api/v1/chat/sessions (startChatSession). */
export async function siteChatSession(store: DataStore, body: unknown, deps: { now: Date; platformUrl: string }): Promise<{ status: 200; body: ChatSessionBody } | Fail> {
  const site = parseSiteInfo(body);
  if (!site.ok) return fail(400, "invalid_request", site.result.body.message);
  const input = record(body);
  const user = record(input.user);
  const id = userId(user.id);
  const name = typeof user.name === "string" ? user.name.trim() : "";
  if (!id || !name) return fail(400, "invalid_request", "user needs its WordPress ID and name.");
  if (input.courses !== undefined && (!Array.isArray(input.courses) || input.courses.length > 500)) return fail(400, "invalid_request", "courses is a list of at most 500 courses.");
  const courses: { id: number; title: string; imageUrl: string | null }[] = [];
  for (const raw of (input.courses as unknown[] | undefined) ?? []) {
    const course = record(raw);
    const courseId = userId(course.id);
    const title = typeof course.title === "string" ? course.title.trim() : "";
    if (!courseId || !title) return fail(400, "invalid_request", "Each course needs its ID and title.");
    courses.push({ id: courseId, title, imageUrl: httpUrl(course.image_url) });
  }
  const found = await siteApp(store, site.value, deps.now);
  if (!found.ok) return found.result;
  const plan = planOfLicense(await effectivePlans(store), found.license, deps.now);
  if (!chatAvailable(found.app, plan)) return fail(403, "chat_not_available", "Chat isn't available in this app.");
  const started = await startSiteSession({ store, now: deps.now }, found.app, { userId: id, name, imageUrl: httpUrl(user.image_url), courses });
  if (!started.ok) return fail(429, "rate_limited", started.message, started.retryAfter !== undefined ? { retry_after_seconds: started.retryAfter } : {});
  return {
    status: 200,
    body: { token: started.value.token, expires_at: started.value.expiresAt.toISOString(), base_url: chatBaseUrl(deps.platformUrl, found.app.id) },
  };
}

/** POST /api/v1/chat/members/forget (forgetChatMember): 204 also for someone who never chatted. */
export async function forgetSiteMember(store: DataStore, body: unknown, deps: { now: Date; storage: MediaStorage | null }): Promise<{ status: 204 } | Fail> {
  const site = parseSiteInfo(body);
  if (!site.ok) return fail(400, "invalid_request", site.result.body.message);
  const id = userId(record(body).user_id);
  if (!id) return fail(400, "invalid_request", "user_id must be the WordPress user's ID.");
  const found = await siteApp(store, site.value, deps.now);
  if (!found.ok) return found.result;
  const member = await store.findChatMember(found.app.id, "wordpress", String(id));
  if (member) await forgetChatMember({ store, storage: deps.storage }, found.app, member);
  return { status: 204 };
}
