import type { DataStore } from "../data/store";
import { hashLicenseKey } from "../license/key";
import type { SiteInfo } from "../license/service";
import { licenseState } from "../license/status";
import type { Layout } from "./types";

/**
 * POST /apps/layout (docs/api/platform.yaml: getAppLayout): the published
 * layout of the app whose license is active on the plugin's site.
 */

export type LayoutResult =
  | { status: 200; body: Layout; etag: string }
  | { status: 204 }
  | { status: 304 }
  | { status: 403 | 404; body: { code: string; message: string } };

/** The versions in an `If-None-Match` header, without quotes or `W/`. */
export function etagValues(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((v) => v.trim().replace(/^W\//, "").replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
}

export async function pluginLayout(store: DataStore, site: SiteInfo, ifNoneMatch: string | null, now: Date): Promise<LayoutResult> {
  const license = await store.getLicenseByHash(hashLicenseKey(site.licenseKey));
  const client = license ? await store.getClientById(license.clientId) : null;
  if (!license || !client) {
    return { status: 404, body: { code: "license_not_found", message: "This license key doesn't exist. Check it in your Yallapp dashboard." } };
  }
  const activation = licenseState(client, license, now) === "active" ? await store.getActivation(license.id) : null;
  if (!activation || activation.siteUrl !== site.siteUrl) {
    return { status: 403, body: { code: "license_inactive", message: "This license isn't active on this site." } };
  }
  const app = await store.getAppByClientId(client.id);
  const layout = app ? (await store.getAppLayout(app.id))?.published : null;
  if (!layout) return { status: 204 };
  if (etagValues(ifNoneMatch).includes(layout.version)) return { status: 304 };
  return { status: 200, body: layout, etag: layout.version };
}
