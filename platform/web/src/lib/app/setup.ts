import { newId } from "../crypto/tokens";
import { BuildRunningError, type DataStore } from "../data/store";
import { isInProgress, STALLED_MESSAGE } from "../builds/view";
import type { App, AppType, AppVertical, Build, BuildStages, Client, License, StoreListing } from "../data/types";
import type { BuildConfig } from "../build-config/types";
import { validateBuildConfig, type ConfigError } from "../build-config/validate";
import { hasFeature, isPlan, PLAN_INFO, type Plan, type PlanInfo } from "../plans";
import { currentPlanId } from "../billing/plan-change";
import { effectivePlans } from "../entitlements";
import { compareVersions } from "../semver";
import { appUrl } from "../env";
import { hostedApiUrl } from "../hosted/urls";
import { hostedOnly } from "./kinds";

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

export function newApp(clientId: string, siteUrl: string | null, now: Date, appType: AppType = "lms", vertical: AppVertical | null = null): App {
  return {
    id: newId(),
    clientId,
    appType,
    vertical,
    // Clients may sign up without a website (stored as ""): the app then starts without one.
    siteUrl: siteUrl || null,
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
    publishingMode: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function hasStoreKeys(app: App): { play: boolean; appStore: boolean; galaxy: boolean; appGallery: boolean } {
  return {
    play: Boolean(app.googlePlayKeyEncrypted),
    appStore: Boolean(app.ascPrivateKeyEncrypted && app.ascIssuerId && app.ascKeyId),
    // 35, 36 Samsung Galaxy Store and Huawei AppGallery upload keys.
    galaxy: Boolean(app.galaxyKeyEncrypted && app.galaxyContentId && app.galaxyServiceAccountId),
    appGallery: Boolean(app.huaweiClientSecretEncrypted && app.huaweiClientId && app.huaweiAppId),
  };
}

/** Whether we publish the app for the client on this plan ("We publish for you"). */
export function managedPublishing(plan: Plan | null, plans: Record<Plan, PlanInfo> = PLAN_INFO): boolean {
  return plan !== null && isPlan(plan) && hasFeature(plans[plan], "auto_publish");
}

/**
 * Which steps are complete. With "We publish for you" on the plan, publishing
 * needs at least one store key, unless our team publishes the app through
 * invitations to the client's store accounts (14.1, publishingMode "managed").
 */
export function stepStatus(app: App | null, plan: Plan | null, plans: Record<Plan, PlanInfo> = PLAN_INFO): Record<SetupStep, boolean> {
  if (!app) return { "app-type": false, website: false, branding: false, listing: false, publishing: false };
  const keys = hasStoreKeys(app);
  const managed = managedPublishing(plan, plans);
  return {
    "app-type": Boolean(app.appTypeDoneAt),
    website: websiteReady(app),
    branding: Boolean(app.brandingDoneAt && app.appName && app.shortName && app.iconAssetId),
    listing: Boolean(app.listingDoneAt && app.androidPackage && app.iosBundleId && app.storeTitle),
    publishing: Boolean(app.publishingDoneAt) && (!managed || keys.play || keys.appStore || app.publishingMode === "managed"),
  };
}

/**
 * The Website step is done when the app has somewhere to get its content:
 * a WordPress site, a custom API or the hosted API. A WordPress set-up our team hasn't
 * finished yet keeps it open, so no build starts against a missing site.
 */
export function websiteReady(app: App): boolean {
  // The hosted API needs no website, but something to serve: content managed here or a connected platform (19).
  // An app our team moved to it without one would build empty.
  if (app.backend === "hosted") return Boolean(app.connector);
  // Real estate apps only run on the hosted API.
  if (hostedOnly(app.appType)) return false;
  if (!app.websiteDoneAt || !app.siteUrl) return false;
  if (app.backend === "custom_api") return Boolean(app.apiBaseUrl);
  return app.backend === "wordpress";
}

export function isSetupComplete(app: App | null, plan: Plan | null, plans: Record<Plan, PlanInfo> = PLAN_INFO): boolean {
  return Object.values(stepStatus(app, plan, plans)).every(Boolean);
}

/** The first incomplete step, or null when setup is done. */
export function nextStep(app: App | null, plan: Plan | null, plans: Record<Plan, PlanInfo> = PLAN_INFO): SetupStep | null {
  const status = stepStatus(app, plan, plans);
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
  // 36 Huawei Push Kit, for phones without Google Play services.
  const huawei = app.huaweiAgconnectAssetId ? { agconnect_config_url: assetUrl(app.huaweiAgconnectAssetId) } : null;
  return {
    schema_version: 1,
    client_id: client.id,
    app_type: app.appType,
    // 20 The kind of business, when the app has one.
    ...(app.vertical ? { vertical: app.vertical } : {}),
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
    ...(huawei ? { huawei } : {}),
  };
}

/** The stages a new build starts with. Without iOS on the app's plan (13.1), the iOS stages are skipped from the start. */
export function initialStages(autoPublish: boolean, app: App, ios = true): BuildStages {
  const keys = hasStoreKeys(app);
  return {
    queued: "done",
    android: "pending",
    // No iOS app without iOS on the plan, or without an App Store Connect key (the pipeline skips it): don't show it as waiting.
    ios: ios && keys.appStore ? "pending" : "skipped",
    upload_play: autoPublish && keys.play ? "pending" : "skipped",
    upload_testflight: ios && autoPublish && keys.appStore ? "pending" : "skipped",
    // 35, 36 Only with "We publish for you" and the store's keys, like Google Play.
    upload_galaxy: autoPublish && keys.galaxy ? "pending" : "skipped",
    upload_appgallery: autoPublish && keys.appGallery ? "pending" : "skipped",
  };
}

/** Whether a build includes the iOS app (its plan had iOS when it was queued). */
export function buildHasIos(build: Pick<Build, "stages">): boolean {
  return build.stages.ios !== "skipped";
}

export type QueueBuildResult =
  | { ok: true; build: Build }
  | { ok: false; reason: "setup_incomplete" | "license_inactive" | "build_running" | "version_too_low" | "invalid_config"; errors?: ConfigError[] };

/** Validates the config against the schema and queues a build with a snapshot of it. `license` is the app's own. */
export async function queueBuild(
  store: DataStore,
  input: { client: Client; app: App; license: License | null; versionName: string },
  now: Date,
  assetUrl: (assetId: string) => string,
): Promise<QueueBuildResult> {
  const { client, app, license } = input;
  // Each app builds on its own plan: never on another app's license.
  if (
    client.status !== "active" ||
    !license ||
    (license.appId !== null && license.appId !== app.id) ||
    app.clientId !== client.id ||
    license.expiresAt.getTime() <= now.getTime()
  ) {
    return { ok: false, reason: "license_inactive" };
  }
  // 13.1 The app's plan as it is now (a scheduled downgrade counts from its date), without switched-off features.
  const plans = await effectivePlans(store);
  const planId = currentPlanId(license, now);
  const plan = plans[planId];
  if (!isSetupComplete(app, planId, plans)) return { ok: false, reason: "setup_incomplete" };
  const previous = await store.listBuildsByApp(app.id, 1);
  const last = previous[0];
  if (isInProgress(last, now)) return { ok: false, reason: "build_running" };
  if (last && compareVersions(input.versionName, last.versionName) < 0) return { ok: false, reason: "version_too_low" };

  // The store assigns the final version code; 1 is a valid placeholder for validation.
  const config = buildConfigFor(app, client, { name: input.versionName, code: 1 }, assetUrl);
  const validation = validateBuildConfig(config);
  if (!validation.ok) return { ok: false, reason: "invalid_config", errors: validation.errors };
  const listing = storeListingOf(app, assetUrl);
  if (!listing) return { ok: false, reason: "setup_incomplete" };

  // "We publish for you" and the iOS app come with the plan (and its switches, 11.5).
  const autoPublish = hasFeature(plan, "auto_publish");
  const ios = hasFeature(plan, "ios");
  // A build that stopped without reporting (a cancelled or crashed run) mustn't block the app for ever: close it.
  if (last && (last.status === "queued" || last.status === "building")) {
    await store.updateBuild(last.id, { status: "failed", message: STALLED_MESSAGE, finishedAt: now }, now);
  }
  let build: Build;
  try {
    build = await store.createBuild(
      {
        id: newId(),
        clientId: client.id,
        appId: app.id,
        versionName: input.versionName,
        status: "queued",
        stages: initialStages(autoPublish, app, ios),
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
      },
      // Two clicks (or the client and our team) at once queue one build, not two.
      { exclusive: true },
    );
  } catch (error) {
    if (error instanceof BuildRunningError) return { ok: false, reason: "build_running" };
    throw error;
  }
  return { ok: true, build };
}
