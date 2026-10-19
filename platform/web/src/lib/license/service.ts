import { httpsSiteAddress, moveToWordpress } from "../app/wordpress-ready";
import type { DataStore } from "../data/store";
import type { Mailer } from "../notices";
import type { AppType, AppVertical, Client, License, LicenseState, PluginRelease, SignInMethod } from "../data/types";
import { toVertical } from "../app/kinds";
import { chosenEmailSignIn, chosenSignInMethods } from "../hosted/sign-in-methods";
import type { Plan, PlanFeature, PlanInfo } from "../plans";
import { currentPlanId } from "../billing/plan-change";
import { effectivePlans } from "../entitlements";
import { compareVersions, parseVersion } from "../semver";
import { hashLicenseKey, isWellFormedLicenseKey } from "./key";
import { normalizeSiteUrl } from "./site-url";
import { licenseState } from "./status";
import { appLinkTargetOf } from "../links/app";
import { licenseAppLinks } from "../links/well-known";

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
  /** 13.1 The plan's limits (null: unlimited). */
  limits: { app_users: number | null; languages: number | null; sources: number | null } | null;
  /** 18 How people sign in, as the app's owner chose on App sign-in; null: the plugin's own setting. */
  sign_in_methods: SignInMethod[] | null;
  /** 24 How email sign-in works on WordPress, as the owner chose on App sign-in; null: the plugin's own setting. */
  email_sign_in: "code" | "password" | null;
  /** 20 The app's engine and kind of business, so the plugin doesn't guess them; null without an app. */
  app_type: AppType | null;
  vertical: AppVertical | null;
  /** 46 What the site's link files say; null when the app has no package, fingerprint or Team ID yet. */
  app_links: ReturnType<typeof licenseAppLinks>;
  /** 46 The owner's switches for the app: the store's rating prompt, crash reports. */
  review_prompt: boolean;
  crash_reports: boolean;
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
  /** 30 "woocommerce", or "" when the site has no shop; null: the plugin didn't say (before Phase 30). */
  store: string | null;
  /** 30 The booking plugin the plugin reads, or "" for none; null: the plugin didn't say. */
  bookings: string | null;
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

/** 30 A plugin the site may run: "" is none, null (missing) is not reported, undefined is not a string. */
function reportedPlugin(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > 64) return undefined;
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
  const store = reportedPlugin(input.store);
  const bookings = reportedPlugin(input.bookings);
  if (store === undefined) return { ok: false, result: bad("store must be a string.") };
  if (bookings === undefined) return { ok: false, result: bad("bookings must be a string.") };
  return {
    ok: true,
    value: { licenseKey, siteUrlRaw: siteUrlRaw.trim(), siteUrl, pluginVersion: pluginVersion.trim(), wpVersion, lms, store, bookings },
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** 18, 20 What the license status tells about the license's app. */
interface AppFacts {
  methods: SignInMethod[] | null;
  emailSignIn: "code" | "password" | null;
  appType: AppType | null;
  vertical: AppVertical | null;
  /** 46 */
  appLinks: ReturnType<typeof licenseAppLinks>;
  reviewPrompt: boolean;
  crashReports: boolean;
}

function statusBody(
  facts: AppFacts,
  plans: Record<Plan, PlanInfo>,
  state: LicenseState,
  license: License | null,
  now: Date,
  message: string | null,
): LicenseStatusBody {
  const plan = license ? plans[currentPlanId(license, now)] : null;
  return {
    status: state,
    plan: plan?.id ?? null,
    features: state === "active" && plan ? [...plan.features] : [],
    limits: plan ? { app_users: plan.limits.appUsers, languages: plan.limits.languages, sources: plan.limits.sources } : null,
    sign_in_methods: facts.methods,
    email_sign_in: facts.emailSignIn,
    app_type: facts.appType,
    vertical: facts.vertical,
    app_links: facts.appLinks,
    review_prompt: facts.reviewPrompt,
    crash_reports: facts.crashReports,
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

/** 18 The owner's sign-in methods for the license's app (null until they choose); 24 how email works; 20 its engine and vertical. */
async function appFactsOf(store: DataStore, license: License): Promise<AppFacts> {
  const app = license.appId ? await store.getAppById(license.appId) : null;
  if (!app) return { methods: null, emailSignIn: null, appType: null, vertical: null, appLinks: null, reviewPrompt: true, crashReports: true };
  return {
    methods: chosenSignInMethods(app),
    emailSignIn: chosenEmailSignIn(app),
    appType: app.appType,
    vertical: toVertical(app.vertical),
    // 46 Links that open the app, and the owner's switches.
    appLinks: licenseAppLinks(appLinkTargetOf(app)),
    reviewPrompt: app.reviewPrompt !== false,
    crashReports: app.crashReports !== false,
  };
}

async function findLicense(store: DataStore, key: string): Promise<{ license: License; client: Client } | null> {
  const license = await store.getLicenseByHash(hashLicenseKey(key));
  if (!license) return null;
  const client = await store.getClientById(license.clientId);
  return client ? { license, client } : null;
}

/**
 * 19 What an activation may tell the app's owner: when the app waited for the
 * WordPress site our team set up, the plugin activating its license means the
 * site is ready. Without it (tests), the app still moves, without an email.
 */
export interface ActivationOptions {
  mail?: Mailer;
  baseUrl?: string;
}

export async function activateLicense(store: DataStore, site: SiteInfo, now: Date, options: ActivationOptions = {}): Promise<ApiResult<LicenseStatusBody>> {
  const plans = await effectivePlans(store);
  const found = await findLicense(store, site.licenseKey);
  if (!found) return notFound;
  const { license, client } = found;
  const facts = await appFactsOf(store, license);
  const state = licenseState(client, license, now);
  if (state !== "active") {
    return { status: 200, body: statusBody(facts, plans, state, license, now, inactiveMessage(state, license)) };
  }
  const claim = await store.claimActivation({
    licenseId: license.id,
    siteUrl: site.siteUrl,
    siteUrlRaw: site.siteUrlRaw,
    pluginVersion: site.pluginVersion,
    wpVersion: site.wpVersion,
    lms: site.lms,
    store: site.store,
    bookings: site.bookings,
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
  // 19 The app waited for its WordPress site: this is it.
  const app = license.appId ? await store.getAppById(license.appId) : null;
  const siteUrl = httpsSiteAddress(site.siteUrlRaw);
  if (app?.backend === "setup_requested" && siteUrl) {
    try {
      await moveToWordpress({ store, now, baseUrl: options.baseUrl ?? "", mail: options.mail ?? (async () => undefined) }, app, siteUrl);
    } catch (error) {
      // The activation stands; our team can still mark the site ready.
      console.error("[license] the app couldn't be moved to its WordPress site", error);
    }
  }
  return { status: 200, body: statusBody(facts, plans, "active", license, now, null) };
}

export async function checkLicense(store: DataStore, site: SiteInfo, now: Date): Promise<ApiResult<LicenseStatusBody>> {
  const plans = await effectivePlans(store);
  const found = await findLicense(store, site.licenseKey);
  if (!found) return notFound;
  const { license, client } = found;
  const facts = await appFactsOf(store, license);
  const state = licenseState(client, license, now);
  if (state !== "active") {
    return { status: 200, body: statusBody(facts, plans, state, license, now, inactiveMessage(state, license)) };
  }
  const activation = await store.getActivation(license.id);
  if (!activation) {
    return { status: 200, body: statusBody(facts, plans, "invalid", license, now, "This license isn't activated on this site. Activate it in the plugin settings.") };
  }
  if (activation.siteUrl !== site.siteUrl) {
    return {
      status: 200,
      body: statusBody(facts, plans, "invalid", license, now, `This license is active on ${activation.siteUrl}, not on this site.`),
    };
  }
  await store.touchActivation(license.id, {
    pluginVersion: site.pluginVersion,
    wpVersion: site.wpVersion,
    lms: site.lms,
    store: site.store,
    bookings: site.bookings,
    lastCheckedAt: now,
  });
  return { status: 200, body: statusBody(facts, plans, "active", license, now, null) };
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
