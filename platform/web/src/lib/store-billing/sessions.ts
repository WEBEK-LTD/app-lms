import { randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { allows, effectivePlans, planOfLicense } from "../entitlements";
import { siteApp, type Fail } from "../license/chat";
import { parseSiteInfo } from "../license/service";
import { storeBillingOn } from "./access";
import { billingBaseUrl } from "./config";
import type { BillingAccount } from "./purchases";

/**
 * 100.3 Store billing for people signed in on a WordPress site: the plugin
 * asks Yallapp for an hour's token for the signed-in person
 * (platform.yaml POST /api/v1/billing/sessions), as for the chat, and the
 * app sends it to the Store billing endpoints.
 */

export const BILLING_SESSION_SECONDS = 60 * 60;

const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const fail = (status: Fail["status"], code: string, message: string): Fail => ({ status, body: { code, message } });

/** The WordPress user of a billing token; null when it's unknown, another app's or expired. */
export async function accountForBillingToken(store: Pick<DataStore, "getBillingSession">, app: Pick<App, "id">, token: string | null, now: Date): Promise<BillingAccount | null> {
  if (!token) return null;
  const session = await store.getBillingSession(sha256Hex(token));
  if (!session || session.appId !== app.id || session.expiresAt.getTime() <= now.getTime()) return null;
  return { source: "wordpress", id: String(session.userId) };
}

/** POST /api/v1/billing/sessions (startBillingSession). */
export async function startSiteBillingSession(store: DataStore, body: unknown, deps: { now: Date; platformUrl: string }): Promise<{ status: 200; body: { token: string; expires_at: string; base_url: string } } | Fail> {
  const site = parseSiteInfo(body);
  if (!site.ok) return fail(400, "invalid_request", site.result.body.message);
  const user = record(record(body).user);
  const id = typeof user.id === "number" && Number.isSafeInteger(user.id) && user.id > 0 ? user.id : null;
  const name = typeof user.name === "string" ? user.name.trim().slice(0, 120) : "";
  const email = typeof user.email === "string" && user.email.length <= 191 && user.email.includes("@") ? user.email.trim() : null;
  if (!id || !name) return fail(400, "invalid_request", "user needs its WordPress ID and name.");
  const now = deps.now;
  const found = await siteApp(store, site.value, now);
  if (!found.ok) return found.result;
  const plan = planOfLicense(await effectivePlans(store), found.license, now);
  if (!allows(plan, "store_billing") || !storeBillingOn(found.app, plan)) return fail(403, "feature_disabled", "This app doesn't sell in the app.");
  const token = randomToken(32);
  const expiresAt = new Date(now.getTime() + BILLING_SESSION_SECONDS * 1000);
  await store.createBillingSession({ tokenHash: sha256Hex(token), appId: found.app.id, userId: id, name: name || "—", email, expiresAt, createdAt: now });
  return { status: 200, body: { token, expires_at: expiresAt.toISOString(), base_url: billingBaseUrl(deps.platformUrl, found.app.id) } };
}
