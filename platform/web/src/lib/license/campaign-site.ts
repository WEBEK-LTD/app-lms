import { createHash, createHmac } from "node:crypto";
import { revealLicenseKey } from "../admin/clients";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { httpsSiteAddress } from "../app/wordpress-ready";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { pinnedFetch } from "../net/safe-fetch";
import { normalizeLicenseKey } from "./key";

/**
 * 85.4 A campaign of a WordPress app goes through its site: the site keeps
 * its people's push tokens. `POST /wp-json/yallapp/v1/campaigns/send`
 * (openapi.yaml, sendCampaign), signed with the license key like the chat's
 * notify; the plugin puts it in everyone's inbox, queues the pushes and
 * reports the numbers later (`POST /api/v1/campaigns/report`).
 */

export const CAMPAIGN_PATH = "/wp-json/yallapp/v1/campaigns/send";
const TIMEOUT_MS = 10_000;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface SiteDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  fetcher?: Fetch;
  resolve?: (host: string) => Promise<string[]>;
  /** Local tests only (LICENSE_REFRESH_TEST_URL): every site is this fake site. */
  testSiteUrl?: string | null;
}

export interface SiteCampaign {
  send_id: number;
  title: string;
  body: string;
  link: string | null;
  image_url: string | null;
}

export type SiteCampaignResult =
  | { ok: true; notificationId: number; people: number; batches: number }
  | { ok: false; reason: "no_site" | "private_address" | "old_plugin" | "failed" };

/** Lowercase hex HMAC-SHA256 of `yallapp-campaign:<timestamp>:<sha256 of the campaign JSON>`, keyed with the license key in capitals. */
export function campaignSignature(licenseKey: string, timestamp: number, campaignJson: string): string {
  const digest = createHash("sha256").update(campaignJson).digest("hex");
  return createHmac("sha256", normalizeLicenseKey(licenseKey)).update(`yallapp-campaign:${timestamp}:${digest}`).digest("hex");
}

export async function sendCampaignToSite(deps: SiteDeps, app: App, campaign: SiteCampaign): Promise<SiteCampaignResult> {
  const license = await deps.store.getLicenseForApp(app.clientId, app.id);
  const activation = license ? await deps.store.getActivation(license.id) : null;
  const base = deps.testSiteUrl ? deps.testSiteUrl.replace(/\/+$/, "") : activation ? httpsSiteAddress(activation.siteUrlRaw) : null;
  if (!license || !activation || !base) return { ok: false, reason: "no_site" };
  const url = `${base}${CAMPAIGN_PATH}`;
  if (!deps.testSiteUrl) {
    const addresses = await (deps.resolve ?? resolveHost)(new URL(url).hostname);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return { ok: false, reason: "private_address" };
  }
  const fetcher = deps.fetcher ?? (deps.testSiteUrl ? fetch : pinnedFetch(undefined, deps.resolve));
  const json = JSON.stringify(campaign);
  const timestamp = Math.floor(deps.now.getTime() / 1000);
  try {
    const response = await fetcher(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json", "content-type": "application/json" },
      // The campaign as it was signed: the site hashes these bytes.
      body: `{"timestamp":${timestamp},"signature":"${campaignSignature(revealLicenseKey(license, deps.key), timestamp, json)}","campaign":${json}}`,
    });
    // A plugin from before 85.4 has no such route.
    if (response.status === 404) return { ok: false, reason: "old_plugin" };
    if (response.status !== 202 && response.status !== 200) return { ok: false, reason: "failed" };
    const answer = (await response.json().catch(() => null)) as { notification_id?: unknown; people?: unknown; batches?: unknown } | null;
    const n = (v: unknown) => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : 0);
    return { ok: true, notificationId: n(answer?.notification_id), people: n(answer?.people), batches: n(answer?.batches) };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
