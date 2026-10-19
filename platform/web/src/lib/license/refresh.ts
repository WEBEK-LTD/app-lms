import { createHmac } from "node:crypto";
import { revealLicenseKey } from "../admin/clients";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { httpsSiteAddress } from "../app/wordpress-ready";
import { currentPlanId } from "../billing/plan-change";
import type { DataStore } from "../data/store";
import type { Plan } from "../plans";
import { normalizeLicenseKey } from "./key";

/**
 * 31 Settings reach a WordPress site within seconds. The plugin learns the
 * app's type, sign-in choices and plan from its license check, which runs
 * twice a day. When the owner saves one of those (or publishes the app's
 * pages), the platform asks the site to check now: `POST /license/refresh`
 * on the plugin (docs/api/openapi.yaml, refreshLicense), signed with the
 * license key both sides know. The site then pulls its status and layout as
 * usual and trusts nothing in the request. Fire and forget: 5 seconds at
 * most, https only, never a private address, no redirects, and a failure
 * never reaches the owner (the site still gets it at its next check).
 */

export const REFRESH_PATH = "/wp-json/yallapp/v1/license/refresh";
export const REFRESH_TIMEOUT_MS = 5000;

/** Lowercase hex HMAC-SHA256 of `yallapp-license-refresh:<timestamp>`, keyed with the license key in capitals. */
export function refreshSignature(licenseKey: string, timestamp: number): string {
  return createHmac("sha256", normalizeLicenseKey(licenseKey)).update(`yallapp-license-refresh:${timestamp}`).digest("hex");
}

/** Where the plugin listens, on the https address of the site the license is active on; null for an address that can't be one. */
export function refreshUrl(siteUrlRaw: string): string | null {
  const base = httpsSiteAddress(siteUrlRaw);
  return base ? `${base}${REFRESH_PATH}` : null;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Resolve = (host: string) => Promise<string[]>;

export interface RefreshDeps {
  store: DataStore;
  /** The platform's encryption key, which opens the stored license key. */
  key: Buffer;
  now?: Date;
  fetcher?: Fetch;
  resolve?: Resolve;
  /** 47 Local tests only (LICENSE_REFRESH_TEST_URL, refused on Netlify): every site's refresh goes to this fake site instead. */
  testSiteUrl?: string | null;
}

/**
 * - `sent`: the site took it (202), or (429) checked moments ago and checks again when its 30 seconds are over;
 * - `not_wordpress`: the app's content isn't on a WordPress site, so there's nothing to tell;
 * - `no_site`: the license isn't active on a site yet;
 * - `private_address`: the site's address points to a private network;
 * - `failed`: no answer within 5 seconds, a redirect, or another answer. The site gets it at its next check.
 */
export type RefreshOutcome = "sent" | "not_wordpress" | "no_site" | "private_address" | "failed";

/** Asks the WordPress site of an app to check its license now. Never throws. */
export async function refreshSite(deps: RefreshDeps, appId: string): Promise<RefreshOutcome> {
  try {
    const app = await deps.store.getAppById(appId);
    if (!app || app.backend !== "wordpress") return "not_wordpress";
    const license = await deps.store.getLicenseForApp(app.clientId, app.id);
    const activation = license ? await deps.store.getActivation(license.id) : null;
    const url = license && activation ? (deps.testSiteUrl ? `${deps.testSiteUrl.replace(/\/+$/, "")}${REFRESH_PATH}` : refreshUrl(activation.siteUrlRaw)) : null;
    if (!license || !url) return "no_site";
    if (!deps.testSiteUrl) {
      const addresses = await (deps.resolve ?? resolveHost)(new URL(url).hostname);
      if (addresses.length === 0 || addresses.some(isPrivateAddress)) return "private_address";
    }
    const timestamp = Math.floor((deps.now ?? new Date()).getTime() / 1000);
    const response = await (deps.fetcher ?? fetch)(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ timestamp, signature: refreshSignature(revealLicenseKey(license, deps.key), timestamp) }),
    });
    await response.body?.cancel().catch(() => undefined);
    return response.status === 202 || response.status === 429 ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

/** The WordPress sites of several apps (an account's apps when its status changes), one after another. */
export async function refreshSites(deps: RefreshDeps, appIds: readonly string[]): Promise<RefreshOutcome[]> {
  const outcomes: RefreshOutcome[] = [];
  for (const id of new Set(appIds)) outcomes.push(await refreshSite(deps, id));
  return outcomes;
}

/** 47 How a plan's sites are asked: a few at once, with a pause between batches, within the time a request may run on. */
export const PLAN_REFRESH = { batchSize: 5, pauseMs: 1000, maxSites: 500, budgetMs: 20_000 };

export interface PlanRefreshResult {
  /** WordPress apps whose license is on the plan now. */
  apps: number;
  sent: number;
  /** Not asked: over the batch budget; they get it at their next check, within 12 hours. */
  left: number;
}

/**
 * 47 When the team edits what a plan includes, every WordPress site on that
 * plan gets the signed refresh: the apps whose license is on the plan now
 * (a scheduled downgrade counts from its date), in batches of `batchSize`
 * at once with `pauseMs` between batches, so neither the sites nor our
 * outgoing connections are flooded. It stops at `maxSites` or after
 * `budgetMs`: the rest get the change at their next license check.
 */
export async function refreshPlanSites(
  deps: RefreshDeps & { sleep?: (ms: number) => Promise<void>; clock?: () => number },
  plan: Plan,
  limits: typeof PLAN_REFRESH = PLAN_REFRESH,
): Promise<PlanRefreshResult> {
  const now = deps.now ?? new Date();
  const licenses = (await deps.store.listLicenses()).filter((l) => l.appId && l.expiresAt.getTime() > now.getTime() && currentPlanId(l, now) === plan);
  const appIds: string[] = [];
  for (const license of licenses) {
    const app = await deps.store.getAppById(license.appId!);
    if (app?.backend === "wordpress") appIds.push(app.id);
  }
  const clock = deps.clock ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const started = clock();
  let sent = 0;
  let asked = 0;
  const last = Math.min(appIds.length, limits.maxSites);
  for (let i = 0; i < last; i += limits.batchSize) {
    if (i > 0) {
      if (clock() - started + limits.pauseMs > limits.budgetMs) break;
      await sleep(limits.pauseMs);
    }
    const batch = appIds.slice(i, Math.min(i + limits.batchSize, last));
    const outcomes = await Promise.all(batch.map((id) => refreshSite(deps, id)));
    asked += batch.length;
    sent += outcomes.filter((o) => o === "sent").length;
  }
  return { apps: appIds.length, sent, left: appIds.length - asked };
}
