import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, AppType, Build, Client, License, StageKey, StageStatus, StoreListing } from "../data/types";
import type { BuildConfig } from "../build-config/types";
import { validateBuildConfig, type ConfigError } from "../build-config/validate";
import type { Plan } from "../plans";
import { compareVersions } from "../semver";
import { appUrl } from "../env";
import { hostedApiUrl } from "../hosted/urls";

export const SETUP_STEPS = ["app-type", "website", "branding", "listing", "publishing"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export const STEP_LABEL: Record<SetupStep, string> = {
  "app-type": "App type",
  website: "Website",
  branding: "Branding",
  listing: "Store listing",
  publishing: "Publishing",
};

export function isSetupStep(value: unknown): value is SetupStep {
  return typeof value === "string" && (SETUP_STEPS as readonly string[]).includes(value);
}

export const APP_TYPES: readonly AppType[] = ["lms", "store", "booking"];

/** What clients call each app type. */
export const APP_TYPE_NAMES: Record<AppType, string> = { lms: "Academy", store: "Store", booking: "Bookings" };

export function isAppType(value: unknown): value is AppType {
  return typeof value === "string" && (APP_TYPES as readonly string[]).includes(value);
}

export function newApp(clientId: string, siteUrl: string | null, now: Date, appType: AppType = "lms"): App {
  return {
    id: newId(),
    clientId,
    appType,
    siteUrl,
    backend: "wordpress",
    apiBaseUrl: null,
    setupRequestedAt: null,
    setupNote: null,
    appName: null,
    shortName: null,
    iconAssetId: null,
    logoAssetId: null,
    primaryColor: "#0E0D24",
    splashColor: "#F4EFE6",
    template: "classic",
    font: "Bricolage Grotesque",
    androidPackage: null,
    iosBundleId: null,
    storeTitle: null,
    shortDescription: null,
    fullDescription: null,
    supportEmail: null,
    privacyUrl: null,
    phoneScreenshotIds: [],
    iphoneScreenshotIds: [],
    firebaseAndroidAssetId: null,
    firebaseIosAssetId: null,
    connector: null,
    hostedSettings: null,
    catalogSettings: null,
    bookingSetup: null,
    courseSetup: null,
    firebaseServiceAccountEncrypted: null,
    googlePlayKeyEncrypted: null,
    googlePlayClientEmail: null,
    ascIssuerId: null,
    ascKeyId: null,
    ascPrivateKeyEncrypted: null,
    androidUploadKeyEncrypted: null,
    iosDistributionEncrypted: null,
    appTypeDoneAt: now,
    websiteDoneAt: null,
    brandingDoneAt: null,
    listingDoneAt: null,
    publishingDoneAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function hasStoreKeys(app: App): { play: boolean; appStore: boolean } {
  return {
    play: Boolean(app.googlePlayKeyEncrypted),
    appStore: Boolean(app.ascPrivateKeyEncrypted && app.ascIssuerId && app.ascKeyId),
  };
}

/** Which steps are complete. Pro needs at least one store key to finish publishing. */
export function stepStatus(app: App | null, plan: Plan | null): Record<SetupStep, boolean> {
  if (!app) return { "app-type": false, website: false, branding: false, listing: false, publishing: false };
  const keys = hasStoreKeys(app);
  return {
    "app-type": Boolean(app.appTypeDoneAt),
    website: websiteReady(app),
    branding: Boolean(app.brandingDoneAt && app.appName && app.shortName && app.iconAssetId),
    listing: Boolean(app.listingDoneAt && app.androidPackage && app.iosBundleId && app.storeTitle),
    publishing: Boolean(app.publishingDoneAt) && (plan !== "pro" || keys.play || keys.appStore),
  };
}

/**
 * The Website step is done when the app has somewhere to get its content:
 * a WordPress site, a custom API or the hosted API. A WordPress set-up our team hasn't
 * finished yet keeps it open, so no build starts against a missing site.
 */
export function websiteReady(app: App): boolean {
  // The hosted API needs no website: our team switches the app to it.
  if (app.backend === "hosted") return true;
  if (!app.websiteDoneAt || !app.siteUrl) return false;
  if (app.backend === "custom_api") return Boolean(app.apiBaseUrl);
  return app.backend === "wordpress";
}

export function isSetupComplete(app: App | null, plan: Plan | null): boolean {
  return Object.values(stepStatus(app, plan)).every(Boolean);
}

/** The first incomplete step, or null when setup is done. */
export function nextStep(app: App | null, plan: Plan | null): SetupStep | null {
  const status = stepStatus(app, plan);
  return SETUP_STEPS.find((step) => !status[step]) ?? null;
}

export function storeListingOf(app: App, assetUrl: (assetId: string) => string): StoreListing | null {
  if (!app.storeTitle || !app.shortDescription || !app.fullDescription || !app.supportEmail || !app.privacyUrl) return null;
  return {
    storeTitle: app.storeTitle,
    shortDescription: app.shortDescription,
    fullDescription: app.fullDescription,
    supportEmail: app.supportEmail,
    privacyUrl: app.privacyUrl,
    phoneScreenshots: app.phoneScreenshotIds.map(assetUrl),
    iphoneScreenshots: app.iphoneScreenshotIds.map(assetUrl),
  };
}

/** Builds the config from the wizard data. Secrets are never part of it. */
export function buildConfigFor(
  app: App,
  client: Pick<Client, "id">,
  version: { name: string; code: number },
  assetUrl: (assetId: string) => string,
): BuildConfig {
  const branding: BuildConfig["branding"] = {
    primary_color: app.primaryColor,
    splash_color: app.splashColor,
    template: app.template,
    font: app.font as BuildConfig["branding"]["font"],
  };
  if (app.iconAssetId) branding.icon_url = assetUrl(app.iconAssetId);
  if (app.logoAssetId) branding.logo_url = assetUrl(app.logoAssetId);
  const firebase: NonNullable<BuildConfig["firebase"]> = {};
  if (app.firebaseAndroidAssetId) firebase.android_config_url = assetUrl(app.firebaseAndroidAssetId);
  if (app.firebaseIosAssetId) firebase.ios_config_url = assetUrl(app.firebaseIosAssetId);
  return {
    schema_version: 1,
    client_id: client.id,
    app_type: app.appType,
    ...(app.backend === "custom_api" && app.apiBaseUrl ? { api_base_url: app.apiBaseUrl } : {}),
    ...(app.backend === "hosted" ? { api_base_url: hostedApiUrl(appUrl(), app.id) } : {}),
    app_name: app.appName ?? "",
    short_name: app.shortName ?? "",
    // Apps without a website link to the platform.
    site_url: app.siteUrl ?? (app.backend === "hosted" ? appUrl() : ""),
    android_package: app.androidPackage ?? "",
    ios_bundle_id: app.iosBundleId ?? "",
    version_name: version.name,
    version_code: version.code,
    branding,
    ...(Object.keys(firebase).length > 0 ? { firebase } : {}),
  };
}

export function initialStages(autoPublish: boolean, app: App): Record<StageKey, StageStatus> {
  const keys = hasStoreKeys(app);
  return {
    queued: "done",
    android: "pending",
    ios: "pending",
    upload_play: autoPublish && keys.play ? "pending" : "skipped",
    upload_testflight: autoPublish && keys.appStore ? "pending" : "skipped",
  };
}

export type QueueBuildResult =
  | { ok: true; build: Build }
  | { ok: false; reason: "setup_incomplete" | "license_inactive" | "build_running" | "version_too_low" | "invalid_config"; errors?: ConfigError[] };

/** Validates the config against the schema and queues a build with a snapshot of it. */
export async function queueBuild(
  store: DataStore,
  input: { client: Client; app: App; license: License | null; versionName: string },
  now: Date,
  assetUrl: (assetId: string) => string,
): Promise<QueueBuildResult> {
  const { client, app, license } = input;
  if (client.status !== "active" || !license || license.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "license_inactive" };
  }
  if (!isSetupComplete(app, license.plan)) return { ok: false, reason: "setup_incomplete" };
  const previous = await store.listBuildsByClient(client.id, 1);
  const last = previous[0];
  if (last && (last.status === "queued" || last.status === "building")) return { ok: false, reason: "build_running" };
  if (last && compareVersions(input.versionName, last.versionName) < 0) return { ok: false, reason: "version_too_low" };

  // The store assigns the final version code; 1 is a valid placeholder for validation.
  const config = buildConfigFor(app, client, { name: input.versionName, code: 1 }, assetUrl);
  const validation = validateBuildConfig(config);
  if (!validation.ok) return { ok: false, reason: "invalid_config", errors: validation.errors };
  const listing = storeListingOf(app, assetUrl);
  if (!listing) return { ok: false, reason: "setup_incomplete" };

  const autoPublish = license.plan === "pro";
  const build = await store.createBuild({
    id: newId(),
    clientId: client.id,
    appId: app.id,
    versionName: input.versionName,
    status: "queued",
    stages: initialStages(autoPublish, app),
    config: validation.config,
    storeListing: listing,
    autoPublish,
    artifacts: [],
    message: null,
    logUrl: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    updatedAt: now,
  });
  return { ok: true, build };
}
