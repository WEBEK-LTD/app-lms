import type { DataStore } from "../data/store";
import type { Client, License, LicenseState, PluginRelease } from "../data/types";
import { PLAN_INFO, type Plan, type PlanFeature } from "../plans";
import { compareVersions, parseVersion } from "../semver";
import { hashLicenseKey, isWellFormedLicenseKey } from "./key";
import { normalizeSiteUrl } from "./site-url";
import { licenseState } from "./status";

/**
 * The license and update API from docs/api/platform.yaml, independent of HTTP
 * so it can be tested directly. Route handlers turn results into responses.
 */

export interface ApiError {
  code: "invalid_request" | "license_not_found" | "license_in_use" | "rate_limited";
  message: string;
}

export interface LicenseStatusBody {
  status: LicenseState;
  plan: Plan | null;
  features: PlanFeature[];
  expires_at: string | null;
  checked_at: string;
  message: string | null;
}

export interface PluginReleaseBody {
  version: string;
  download_url: string;
  requires: string;
  requires_php: string;
  tested: string;
  changelog_html: string;
}

export type ApiResult<T> =
  | { status: 200; body: T }
  | { status: 204 }
  | { status: 400 | 404 | 409 | 429; body: ApiError };

export interface SiteInfo {
  licenseKey: string;
  siteUrlRaw: string;
  siteUrl: string;
  pluginVersion: string;
  wpVersion: string | null;
  lms: string | null;
}

const bad = (message: string): { status: 400; body: ApiError } => ({
  status: 400,
  body: { code: "invalid_request", message },
});

const notFound: { status: 404; body: ApiError } = {
  status: 404,
  body: { code: "license_not_found", message: "This license key doesn't exist. Check it in your Yallapp dashboard." },
};

function optionalString(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > max) return undefined;
  return value.trim();
}

/** Validates the SiteInfo request body. */
export function parseSiteInfo(body: unknown): { ok: true; value: SiteInfo } | { ok: false; result: { status: 400; body: ApiError } } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, result: bad("Send a JSON object with license_key, site_url and plugin_version.") };
  }
  const input = body as Record<string, unknown>;
  const { license_key: licenseKey, site_url: siteUrlRaw, plugin_version: pluginVersion } = input;
  if (typeof licenseKey !== "string" || !licenseKey.trim()) return { ok: false, result: bad("license_key is required.") };
  if (!isWellFormedLicenseKey(licenseKey)) return { ok: false, result: bad("license_key is not a Yallapp license key.") };
  if (typeof siteUrlRaw !== "string") return { ok: false, result: bad("site_url is required.") };
  const siteUrl = normalizeSiteUrl(siteUrlRaw);
  if (!siteUrl) return { ok: false, result: bad("site_url must be an http or https URL.") };
  if (typeof pluginVersion !== "string" || !parseVersion(pluginVersion) || pluginVersion.length > 32) {
    return { ok: false, result: bad("plugin_version must be a version like 0.1.0.") };
  }
  const wpVersion = optionalString(input.wp_version, 32);
  const lms = optionalString(input.lms, 64);
  if (wpVersion === undefined) return { ok: false, result: bad("wp_version must be a string.") };
  if (lms === undefined) return { ok: false, result: bad("lms must be a string.") };
  return {
    ok: true,
    value: { licenseKey, siteUrlRaw: siteUrlRaw.trim(), siteUrl, pluginVersion: pluginVersion.trim(), wpVersion, lms },
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function statusBody(state: LicenseState, license: License | null, now: Date, message: string | null): LicenseStatusBody {
  return {
    status: state,
    plan: license?.plan ?? null,
    features: state === "active" && license ? [...PLAN_INFO[license.plan].features] : [],
    expires_at: license ? license.expiresAt.toISOString() : null,
    checked_at: now.toISOString(),
    message,
  };
}

function inactiveMessage(state: LicenseState, license: License): string {
  switch (state) {
    case "expired":
      return `Your Yallapp plan ended on ${formatDate(license.expiresAt)}. Message us on WhatsApp to renew.`;
    case "suspended":
      return "This license is suspended. Contact Yallapp support.";
    default:
      return "This license isn't active yet. Contact Yallapp support.";
  }
}

async function findLicense(store: DataStore, key: string): Promise<{ license: License; client: Client } | null> {
  const license = await store.getLicenseByHash(hashLicenseKey(key));
  if (!license) return null;
  const client = await store.getClientById(license.clientId);
  return client ? { license, client } : null;
}

export async function activateLicense(store: DataStore, site: SiteInfo, now: Date): Promise<ApiResult<LicenseStatusBody>> {
  const found = await findLicense(store, site.licenseKey);
  if (!found) return notFound;
  const { license, client } = found;
  const state = licenseState(client, license, now);
  if (state !== "active") {
    return { status: 200, body: statusBody(state, license, now, inactiveMessage(state, license)) };
  }
  const claim = await store.claimActivation({
    licenseId: license.id,
    siteUrl: site.siteUrl,
    siteUrlRaw: site.siteUrlRaw,
    pluginVersion: site.pluginVersion,
    wpVersion: site.wpVersion,
    lms: site.lms,
    activatedAt: now,
    lastCheckedAt: now,
  });
  if (!claim.ok) {
    return {
      status: 409,
      body: {
        code: "license_in_use",
        message: `This license is active on ${claim.existing.siteUrl}. Deactivate it there, or release it from your Yallapp dashboard, then try again.`,
      },
    };
  }
  return { status: 200, body: statusBody("active", license, now, null) };
}

export async function checkLicense(store: DataStore, site: SiteInfo, now: Date): Promise<ApiResult<LicenseStatusBody>> {
  const found = await findLicense(store, site.licenseKey);
  if (!found) return notFound;
  const { license, client } = found;
  const state = licenseState(client, license, now);
  if (state !== "active") {
    return { status: 200, body: statusBody(state, license, now, inactiveMessage(state, license)) };
  }
  const activation = await store.getActivation(license.id);
  if (!activation) {
    return { status: 200, body: statusBody("invalid", license, now, "This license isn't activated on this site. Activate it in the plugin settings.") };
  }
  if (activation.siteUrl !== site.siteUrl) {
    return {
      status: 200,
      body: statusBody("invalid", license, now, `This license is active on ${activation.siteUrl}, not on this site.`),
    };
  }
  await store.touchActivation(license.id, {
    pluginVersion: site.pluginVersion,
    wpVersion: site.wpVersion,
    lms: site.lms,
    lastCheckedAt: now,
  });
  return { status: 200, body: statusBody("active", license, now, null) };
}

export async function deactivateLicense(store: DataStore, body: unknown): Promise<ApiResult<never>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Send a JSON object with license_key and site_url.");
  const { license_key: key, site_url: siteUrlRaw } = body as Record<string, unknown>;
  if (typeof key !== "string" || !isWellFormedLicenseKey(key)) return bad("license_key is not a Yallapp license key.");
  const siteUrl = typeof siteUrlRaw === "string" ? normalizeSiteUrl(siteUrlRaw) : null;
  if (!siteUrl) return bad("site_url must be an http or https URL.");
  const found = await findLicense(store, key);
  if (!found) return notFound;
  const activation = await store.getActivation(found.license.id);
  // Only the site the license is bound to can release it. Anything else is a no-op.
  if (activation && activation.siteUrl === siteUrl) await store.deleteActivation(found.license.id);
  return { status: 204 };
}

export interface UpdateQuery {
  licenseKey: string;
  siteUrl: string;
  version: string;
}

export function parseUpdateQuery(params: URLSearchParams): { ok: true; value: UpdateQuery } | { ok: false; result: { status: 400; body: ApiError } } {
  const licenseKey = params.get("license_key");
  const siteUrlRaw = params.get("site_url");
  const version = params.get("version");
  if (!licenseKey || !siteUrlRaw || !version) {
    return { ok: false, result: bad("license_key, site_url and version are required.") };
  }
  if (!isWellFormedLicenseKey(licenseKey)) return { ok: false, result: bad("license_key is not a Yallapp license key.") };
  const siteUrl = normalizeSiteUrl(siteUrlRaw);
  if (!siteUrl) return { ok: false, result: bad("site_url must be an http or https URL.") };
  if (!parseVersion(version)) return { ok: false, result: bad("version must be a version like 0.1.0.") };
  return { ok: true, value: { licenseKey, siteUrl, version } };
}

/** The newest published release, by version number. */
export function latestRelease(releases: PluginRelease[]): PluginRelease | null {
  return (
    releases
      .filter((release) => release.published)
      .sort((a, b) => compareVersions(b.version, a.version))[0] ?? null
  );
}

/**
 * 200 with the newer release, or 204 when the site is up to date, the license
 * isn't active, or the license isn't bound to this site.
 */
export async function pluginUpdate(
  store: DataStore,
  query: UpdateQuery,
  now: Date,
  downloadUrl: (release: PluginRelease, license: License) => string,
): Promise<ApiResult<PluginReleaseBody>> {
  const found = await findLicense(store, query.licenseKey);
  if (!found) return { status: 204 };
  const { license, client } = found;
  if (licenseState(client, license, now) !== "active") return { status: 204 };
  const activation = await store.getActivation(license.id);
  if (!activation || activation.siteUrl !== query.siteUrl) return { status: 204 };
  const release = latestRelease(await store.listReleases());
  if (!release || compareVersions(release.version, query.version) <= 0) return { status: 204 };
  return {
    status: 200,
    body: {
      version: release.version,
      download_url: downloadUrl(release, license),
      requires: release.requiresWp,
      requires_php: release.requiresPhp,
      tested: release.testedWp,
      changelog_html: changelogToHtml(release.changelog),
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Plain-text changelog to simple HTML: lines starting with "-" or "*" become list items. */
export function changelogToHtml(changelog: string): string {
  const lines = changelog.split(/\r?\n/).map((line) => line.trim());
  const html: string[] = [];
  let inList = false;
  for (const line of lines) {
    const item = /^[-*]\s+(.*)$/.exec(line);
    if (item) {
      if (!inList) html.push("<ul>");
      inList = true;
      html.push(`<li>${escapeHtml(item[1] ?? "")}</li>`);
      continue;
    }
    if (inList) html.push("</ul>");
    inList = false;
    if (line) html.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) html.push("</ul>");
  return html.join("");
}
