import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp, queueBuild } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import type { App, DeliverySettings, StoreListing } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { DEFAULT_MARKET_SETTINGS } from "@/lib/market/settings";
import { firebaseHasVendorApp, hasVendorApp, vendorAppNameOf, vendorListing, vendorPackageOf } from "@/lib/market/vendor-app";
import { PLAN_INFO, planSettingOf } from "@/lib/plans";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { days, licenseOf, NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const BUNDLE: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, marketApp: { ...DEFAULT_MARKET_SETTINGS, vendorApp: "bundle" } };

function marketApp(clientId: string): App {
  return {
    ...newApp(clientId, "https://souq.test", NOW),
    appType: "food",
    section: "studio",
    appTypeDoneAt: NOW,
    backend: "hosted",
    connector: { kind: "restaurants" },
    websiteDoneAt: NOW,
    appName: "Souq Now",
    shortName: "Souq",
    iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
    brandingDoneAt: NOW,
    androidPackage: "com.souq.app",
    iosBundleId: "com.souq.app",
    storeTitle: "Souq Now",
    shortDescription: "Food and groceries to your door.",
    fullDescription: "Souq Now brings food from the restaurants and groceries from the shops near you, and you follow your order on the map.",
    supportEmail: "help@souq.test",
    privacyUrl: "https://souq.test/privacy",
    listingDoneAt: NOW,
    publishingDoneAt: NOW,
  };
}

const googleServices = (...packages: string[]) =>
  JSON.stringify({
    project_info: { project_id: "souq", project_number: "123" },
    client: packages.map((p) => ({ client_info: { mobilesdk_app_id: `1:123:android:${p}`, android_client_info: { package_name: p } }, api_key: [{ current_key: "k" }] })),
  });

async function setup(withFood = true) {
  const s = await setupClient({ plan: "studio_3", activeUntil: days(60) });
  const store = s.store;
  const features = PLAN_INFO.studio_3.features.filter((f) => f !== "food");
  await store.setPlatformSetting("plans", { studio_3: { ...planSettingOf(PLAN_INFO.studio_3), offered: true, features: withFood ? [...features, "food", "courier_app"] : features } }, "test", NOW);
  clearPlatformSettingsCache();
  const client = (await store.getClientById(s.client.id))!;
  const app = marketApp(client.id);
  await store.createApp(app);
  const license = await licenseOf(store, client.id);
  return { store, client, app, license };
}

describe("115.16 the vendor app's names", () => {
  it("is the marketplace's own name with Partner, its package with .vendor", () => {
    expect(vendorPackageOf("com.souq.app")).toBe("com.souq.app.vendor");
    expect(vendorAppNameOf({ appName: "Souq Now" })).toBe("Souq Now Partner");
    const long = vendorAppNameOf({ appName: "A very long marketplace name indeed" });
    expect(long.length).toBeLessThanOrEqual(30);
    expect(long.endsWith(" Partner")).toBe(true);
    expect(firebaseHasVendorApp(googleServices("com.souq.app", "com.souq.app.vendor"), "com.souq.app")).toBe(true);
    expect(firebaseHasVendorApp(googleServices("com.souq.app"), "com.souq.app")).toBe(false);
  });

  it("exists only for marketplaces that put their places in an app of their own", () => {
    expect(hasVendorApp({ appType: "food" }, BUNDLE)).toBe(true);
    expect(hasVendorApp({ appType: "food" }, DEFAULT_DELIVERY_SETTINGS)).toBe(false);
    expect(hasVendorApp({ appType: "delivery" }, BUNDLE)).toBe(false);
  });

  it("is listed for the places only, without the customers' screenshots", () => {
    const listing: StoreListing = { storeTitle: "Souq Now", shortDescription: "…", fullDescription: "…", supportEmail: "help@souq.test", privacyUrl: "https://souq.test/privacy", phoneScreenshots: ["a"], iphoneScreenshots: ["b"] };
    const vendor = vendorListing(listing, { appName: "Souq Now", appType: "food" });
    expect(vendor).toMatchObject({ storeTitle: "Souq Now Partner", supportEmail: "help@souq.test", phoneScreenshots: [], iphoneScreenshots: [] });
    expect(vendor.shortDescription.length).toBeLessThanOrEqual(80);
    expect(vendor.fullDescription).toContain("Only Souq Now's places can use it.");
  });
});

describe("115.16 building the vendor app", () => {
  beforeEach(() => vi.stubEnv("APP_URL", "https://yallapp.com.tr"));
  afterEach(() => vi.unstubAllEnvs());

  it("builds the vendor's screens under their own package, next to the customers' app", async () => {
    // Not while the places use a tab in the customers' app.
    const { store, client, app, license } = await setup();
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "vendor" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "vendor_app_off" });
    await store.saveDeliverySettings(app.id, BUNDLE, NOW);
    const queued = await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "vendor" }, NOW, assetUrl);
    if (!queued.ok) throw new Error(`not queued: ${queued.reason}`);
    expect(queued.build.variant).toBe("vendor");
    expect(queued.build.config).toMatchObject({ role: "vendor", app_name: "Souq Now Partner", android_package: "com.souq.app.vendor", ios_bundle_id: "com.souq.app.vendor" });
    expect(queued.build.config.links).toBeUndefined();
    expect(validateBuildConfig(queued.build.config).ok).toBe(true);
    expect(queued.build.storeListing).toMatchObject({ storeTitle: "Souq Now Partner", phoneScreenshots: [] });
    // Its own list of builds.
    expect((await store.listBuildsByApp(app.id, 10, "vendor")).map((b) => b.id)).toEqual([queued.build.id]);
    expect(await store.listBuildsByApp(app.id, 10)).toEqual([]);
  });

  it("needs a plan with food delivery", async () => {
    const { store, client, app, license } = await setup(false);
    await store.saveDeliverySettings(app.id, BUNDLE, NOW);
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "vendor" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "vendor_app_off" });
  });
});
