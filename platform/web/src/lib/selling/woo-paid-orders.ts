import { createHmac } from "node:crypto";
import { revealLicenseKey } from "../admin/clients";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { httpsSiteAddress } from "../app/wordpress-ready";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { normalizeLicenseKey } from "../license/key";
import { pinnedFetch } from "../net/safe-fetch";

/**
 * 134 Yallapp asks the store's WordPress site, through the Yallapp plugin,
 * to price an order paid inside the app (`quote`, right before the payment,
 * with the customer's address) and to create it once the payment is
 * verified (`create`): `POST /wp-json/yallapp/v1/store/paid-orders`
 * (openapi.yaml, storePaidOrder), signed like `POST /billing/access`: the
 * headers `Yallapp-Timestamp` and `Yallapp-Signature`, the lowercase hex
 * HMAC-SHA256 of `yallapp-store-order:<timestamp>:<raw body>`, keyed with
 * the license key in capitals. The site creates one order per `reference`,
 * whatever the number of tries.
 */

export const PAID_ORDERS_PATH = "/wp-json/yallapp/v1/store/paid-orders";
const TIMEOUT_MS = 15_000;

export interface WooSiteDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  /** How the WordPress site is reached (tests: a fake fetch, or LICENSE_REFRESH_TEST_URL's site). */
  site?: { fetcher?: (url: string, init?: RequestInit) => Promise<Response>; resolve?: (host: string) => Promise<string[]>; testSiteUrl?: string | null };
}

/** What the site answered: its JSON with a 2xx, or why not (`unreachable` when it couldn't be asked or didn't answer). */
export type WooAnswer = { ok: true; body: Record<string, unknown> } | { ok: false; status: number | null; code: string; message: string; details?: unknown };

/** Lowercase hex HMAC-SHA256 of `yallapp-store-order:<timestamp>:<raw body>`, keyed with the license key in capitals. */
export function paidOrderSignature(licenseKey: string, timestamp: number, body: string): string {
  return createHmac("sha256", normalizeLicenseKey(licenseKey)).update(`yallapp-store-order:${timestamp}:${body}`).digest("hex");
}

const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** Sends one signed request to the app's site; never throws. */
export async function callPaidOrders(deps: WooSiteDeps, app: App, payload: Record<string, unknown>): Promise<WooAnswer> {
  const unreachable = (message: string): WooAnswer => ({ ok: false, status: null, code: "unreachable", message });
  const license = await deps.store.getLicenseForApp(app.clientId, app.id);
  const activation = license ? await deps.store.getActivation(license.id) : null;
  const testSite = deps.site?.testSiteUrl;
  const base = testSite ? testSite.replace(/\/+$/, "") : activation ? httpsSiteAddress(activation.siteUrlRaw) : null;
  if (!license || !activation || !base) return unreachable("The app's WordPress site isn't connected with its license.");
  const url = `${base}${PAID_ORDERS_PATH}`;
  if (!testSite) {
    const addresses = await (deps.site?.resolve ?? resolveHost)(new URL(url).hostname).catch(() => [] as string[]);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return unreachable("The site's address can't be reached.");
  }
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(deps.now.getTime() / 1000);
  const fetcher = deps.site?.fetcher ?? (testSite ? fetch : pinnedFetch(undefined, deps.site?.resolve));
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "yallapp-timestamp": String(timestamp),
        "yallapp-signature": paidOrderSignature(revealLicenseKey(license, deps.key), timestamp, body),
      },
      body,
    });
  } catch {
    return unreachable("The site didn't answer.");
  }
  const data = record(await response.json().catch(() => null));
  if (response.status >= 200 && response.status < 300) return { ok: true, body: data };
  const code = typeof data.code === "string" && /^[a-z0-9_]{1,64}$/.test(data.code) ? data.code : response.status === 404 ? "plugin_outdated" : `http_${response.status}`;
  const message = typeof data.message === "string" && data.message.trim() ? data.message.trim().slice(0, 300) : `The site answered HTTP ${response.status}.`;
  return { ok: false, status: response.status, code, message, details: data.details };
}
