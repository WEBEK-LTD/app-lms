import { createHmac } from "node:crypto";
import { revealLicenseKey } from "../admin/clients";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { httpsSiteAddress } from "../app/wordpress-ready";
import type { DataStore } from "../data/store";
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
    const url = license && activation ? refreshUrl(activation.siteUrlRaw) : null;
    if (!license || !url) return "no_site";
    const addresses = await (deps.resolve ?? resolveHost)(new URL(url).hostname);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return "private_address";
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
