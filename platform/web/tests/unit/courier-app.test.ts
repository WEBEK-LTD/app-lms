import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp, queueBuild } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import type { App, DeliverySettings, StoreListing } from "@/lib/data/types";
import { courierAppNameOf, courierBuildConfig, courierListing, courierPackageOf, courierPlistProblem, firebaseHasCourierApp } from "@/lib/delivery/courier-app";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { PLAN_INFO, planSettingOf } from "@/lib/plans";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { days, licenseOf, NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, courierApp: "bundle" };

function deliveryApp(clientId: string): App {
  return {
    ...newApp(clientId, "https://speedy.test", NOW),
    appType: "delivery",
    section: "studio",
    appTypeDoneAt: NOW,
    backend: "hosted",
    connector: { kind: "deliveries" },
    websiteDoneAt: NOW,
    appName: "Speedy Parcels",
    shortName: "Speedy",
    iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
    brandingDoneAt: NOW,
    androidPackage: "com.speedy.app",
    iosBundleId: "com.speedy.app",
    storeTitle: "Speedy Parcels",
    shortDescription: "Send a parcel across town.",
    fullDescription: "Speedy Parcels picks up your parcel and brings it across town, and you follow it on the map.",
    supportEmail: "help@speedy.test",
    privacyUrl: "https://speedy.test/privacy",
    listingDoneAt: NOW,
    publishingDoneAt: NOW,
  };
}

const googleServices = (...packages: string[]) =>
  JSON.stringify({
    project_info: { project_id: "speedy", project_number: "123" },
    client: packages.map((p) => ({ client_info: { mobilesdk_app_id: `1:123:android:${p}`, android_client_info: { package_name: p } }, api_key: [{ current_key: "k" }] })),
  });

async function setup(features: ("delivery" | "courier_app" | "food" | "rides")[] = ["delivery", "courier_app"], food = false, rides = false) {
  const s = await setupClient({ plan: "studio_3", activeUntil: days(60) });
  const store = s.store;
  await store.setPlatformSetting("plans", { studio_3: { ...planSettingOf(PLAN_INFO.studio_3), offered: true, features: [...PLAN_INFO.studio_3.features, ...features] } }, "test", NOW);
  clearPlatformSettingsCache();
  const client = (await store.getClientById(s.client.id))!;
  // 105.1.6 A food delivery company's app has couriers too.
  // 105.2 A ride company's drivers are its couriers.
  const app: App = food
    ? { ...deliveryApp(client.id), appType: "food", connector: { kind: "restaurants" } }
    : rides
      ? { ...deliveryApp(client.id), appType: "rides", connector: { kind: "rides" }, appName: "Cairo Rides" }
      : deliveryApp(client.id);
  await store.createApp(app);
  const license = await licenseOf(store, client.id);
  return { store, client, app, license };
}

describe("104.6 the courier app's names", () => {
  it("names it after the company, within the stores' limit, or as the company chose", () => {
    expect(courierPackageOf("com.speedy.app")).toBe("com.speedy.app.courier");
    expect(courierAppNameOf({ appName: "Speedy Parcels" }, { courierAppName: null })).toBe("Speedy Parcels Courier");
    expect(courierAppNameOf({ appName: "Speedy Parcels" }, { courierAppName: "  Speedy Riders " })).toBe("Speedy Riders");
    const long = courierAppNameOf({ appName: "A very long delivery company name" }, { courierAppName: null });
    expect(long.length).toBeLessThanOrEqual(30);
    expect(long.endsWith(" Courier")).toBe(true);
  });

  it("knows whether the company's Firebase files have the courier app", () => {
    expect(firebaseHasCourierApp(googleServices("com.speedy.app", "com.speedy.app.courier"), "com.speedy.app")).toBe(true);
    expect(firebaseHasCourierApp(googleServices("com.speedy.app"), "com.speedy.app")).toBe(false);
    expect(firebaseHasCourierApp("not json", "com.speedy.app")).toBe(false);
    expect(courierPlistProblem("not a plist", "com.speedy.app")).not.toBeNull();
  });

  it("lists it for the company's couriers only, without the customers' screenshots", () => {
    const listing: StoreListing = {
      storeTitle: "Speedy Parcels",
      shortDescription: "Send a parcel.",
      fullDescription: "…",
      supportEmail: "help@speedy.test",
      privacyUrl: "https://speedy.test/privacy",
      phoneScreenshots: ["a"],
      iphoneScreenshots: ["b"],
    };
    const courier = courierListing(listing, { appName: "Speedy Parcels" }, { courierAppName: null });
    expect(courier).toMatchObject({ storeTitle: "Speedy Parcels Courier", supportEmail: "help@speedy.test", privacyUrl: "https://speedy.test/privacy", phoneScreenshots: [], iphoneScreenshots: [] });
    expect(courier.shortDescription.length).toBeLessThanOrEqual(80);
    expect(courier.fullDescription).toContain("Only Speedy Parcels's couriers can use it.");
  });
});

describe("104.6 building the courier app", () => {
  beforeEach(() => vi.stubEnv("APP_URL", "https://yallapp.com.tr"));
  afterEach(() => vi.unstubAllEnvs());

  it("builds the courier's screens under their own package, next to the customers' app", async () => {
    const { store, client, app, license } = await setup();
    // Not before the company chooses a second app in its name.
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "courier" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "courier_app_off" });
    await store.saveDeliverySettings(app.id, { ...SETTINGS, courierAppName: "Speedy Riders", courierFirebaseIosAssetId: "plist-1" }, NOW);
    const queued = await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "courier" }, NOW, assetUrl);
    if (!queued.ok) throw new Error(`not queued: ${queued.reason}`);
    expect(queued.build.variant).toBe("courier");
    expect(queued.build.config).toMatchObject({
      role: "courier",
      app_name: "Speedy Riders",
      android_package: "com.speedy.app.courier",
      ios_bundle_id: "com.speedy.app.courier",
      firebase: { ios_config_url: assetUrl("plist-1") },
    });
    expect(queued.build.config.links).toBeUndefined();
    expect(validateBuildConfig(queued.build.config).ok).toBe(true);
    expect(queued.build.storeListing).toMatchObject({ storeTitle: "Speedy Riders", phoneScreenshots: [] });

    // One build at a time across both apps; versions go up within each.
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.1" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "build_running" });
    await store.updateBuild(queued.build.id, { status: "ready", finishedAt: NOW }, NOW);
    const customers = await queueBuild(store, { client, app, license, versionName: "0.9.0" }, NOW, assetUrl);
    if (!customers.ok) throw new Error(`not queued: ${customers.reason}`);
    expect(customers.build.variant ?? "app").toBe("app");
    expect(customers.build.config).toMatchObject({ android_package: "com.speedy.app" });
    expect(customers.build.config.role ?? "customer").toBe("customer");
    await store.updateBuild(customers.build.id, { status: "ready", finishedAt: NOW }, NOW);
    expect(await queueBuild(store, { client, app, license, versionName: "0.9.0", variant: "courier" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "version_too_low" });

    // Each list holds its own app's builds.
    expect((await store.listBuildsByApp(app.id, 10)).map((b) => b.id)).toEqual([customers.build.id]);
    expect((await store.listBuildsByApp(app.id, 10, "courier")).map((b) => b.id)).toEqual([queued.build.id]);
    expect(await store.listBuildsByApp(app.id, 10, "all")).toHaveLength(2);
  });

  it("105.1.6 builds a food delivery company's courier app the same way", async () => {
    const { store, client, app, license } = await setup(["food", "courier_app"], true);
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "courier" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "courier_app_off" });
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    const queued = await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "courier" }, NOW, assetUrl);
    if (!queued.ok) throw new Error(`not queued: ${queued.reason}`);
    expect(queued.build.config).toMatchObject({ app_type: "food", role: "courier", app_name: "Speedy Parcels Courier", android_package: "com.speedy.app.courier" });
    expect(validateBuildConfig(queued.build.config).ok).toBe(true);
  });

  it("105.2 builds a ride company's drivers' app the same way, as the drivers'", async () => {
    const { store, client, app, license } = await setup(["rides", "courier_app"], false, true);
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "courier" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "courier_app_off" });
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    const queued = await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "courier" }, NOW, assetUrl);
    if (!queued.ok) throw new Error(`not queued: ${queued.reason}`);
    expect(queued.build.config).toMatchObject({ app_type: "rides", role: "driver", app_name: "Cairo Rides Driver", android_package: "com.speedy.app.driver", ios_bundle_id: "com.speedy.app.driver" });
    expect(validateBuildConfig(queued.build.config).ok).toBe(true);
    expect(queued.build.storeListing).toMatchObject({ storeTitle: "Cairo Rides Driver", shortDescription: "For Cairo Rides's drivers: ride offers, pickups and earnings." });
    expect(queued.build.storeListing.fullDescription).toContain("Only Cairo Rides's drivers can use it.");
    expect(firebaseHasCourierApp(googleServices("com.speedy.app", "com.speedy.app.driver"), "com.speedy.app", "driver")).toBe(true);
    expect(firebaseHasCourierApp(googleServices("com.speedy.app", "com.speedy.app.courier"), "com.speedy.app", "driver")).toBe(false);
    expect(courierPlistProblem("not a plist", "com.speedy.app", "driver")).not.toBeNull();
  });

  it("needs the courier app on the plan", async () => {
    const { store, client, app, license } = await setup(["delivery"]);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0", variant: "courier" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "courier_app_off" });
  });

  it("keeps Firebase on Android only when the company's file lists the courier app", () => {
    const base = { app_name: "Speedy Parcels", short_name: "Speedy", android_package: "com.speedy.app", ios_bundle_id: "com.speedy.app", firebase: { android_config_url: "a", ios_config_url: "i" }, links: { domain: "x" } } as never;
    const without = courierBuildConfig(base, { appName: "Speedy Parcels" }, { courierAppName: null, courierFirebaseIosAssetId: null }, { android: false, iosConfigUrl: null });
    expect(without.firebase).toBeUndefined();
    expect(without.short_name).toBe("Speedy Parce");
    const withAndroid = courierBuildConfig(base, { appName: "Speedy Parcels" }, { courierAppName: null, courierFirebaseIosAssetId: null }, { android: true, iosConfigUrl: null });
    expect(withAndroid.firebase).toEqual({ android_config_url: "a" });
  });
});
