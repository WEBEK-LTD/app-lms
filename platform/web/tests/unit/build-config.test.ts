import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { APP_TYPE_NAMES, buildConfigFor, isAppType, isSetupComplete, newApp, nextStep, queueBuild, stepStatus } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import type { BuildConfig } from "@/lib/build-config/types";
import type { App } from "@/lib/data/types";
import { readPngInfo, isSvg } from "@/lib/png";
import { appStoreKeySchema, brandingSchema, googlePlayKeySchema, listingSchema, websiteSchema } from "@/lib/validation";
import { NOW, days, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;

function validConfig(): BuildConfig {
  return {
    schema_version: 1,
    client_id: "c1",
    app_type: "lms",
    app_name: "Ada Academy",
    short_name: "Ada",
    site_url: "https://academy.test",
    android_package: "com.adaacademy.app",
    ios_bundle_id: "com.adaacademy.app",
    version_name: "1.0.0",
    version_code: 1,
    branding: {
      primary_color: "#0E0D24",
      splash_color: "#F4EFE6",
      template: "classic",
      font: "Bricolage Grotesque",
      icon_url: "https://yallapp.com.tr/api/v1/assets/abc",
    },
  };
}

function completeApp(clientId: string): App {
  return {
    ...newApp(clientId, "https://academy.test", NOW),
    websiteDoneAt: NOW,
    appName: "Ada Academy",
    shortName: "Ada",
    iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
    brandingDoneAt: NOW,
    androidPackage: "com.adaacademy.app",
    iosBundleId: "com.adaacademy.app",
    storeTitle: "Ada Academy",
    shortDescription: "Learn with Ada on your phone.",
    fullDescription: "Ada Academy brings every course, lesson and quiz to your phone, synced with the website.",
    supportEmail: "help@academy.test",
    privacyUrl: "https://academy.test/privacy",
    listingDoneAt: NOW,
    publishingDoneAt: NOW,
  };
}

describe("build config schema", () => {
  it("is an exact copy of docs/build-config.schema.json", () => {
    const docs = readFileSync(path.resolve(__dirname, "../../../../docs/build-config.schema.json"), "utf8");
    const copy = readFileSync(path.resolve(__dirname, "../../src/lib/build-config/build-config.schema.json"), "utf8");
    expect(JSON.parse(copy)).toEqual(JSON.parse(docs));
  });

  it("accepts a complete config", () => {
    expect(validateBuildConfig(validConfig())).toMatchObject({ ok: true });
  });

  it.each<[string, (c: BuildConfig) => unknown]>([
    ["http site", (c) => ({ ...c, site_url: "http://academy.test" })],
    ["long app name", (c) => ({ ...c, app_name: "x".repeat(31) })],
    ["long short name", (c) => ({ ...c, short_name: "x".repeat(13) })],
    ["uppercase package", (c) => ({ ...c, android_package: "com.Ada.app" })],
    ["single-segment package", (c) => ({ ...c, android_package: "adaacademy" })],
    ["bundle id with underscore", (c) => ({ ...c, ios_bundle_id: "com.ada_academy.app" })],
    ["version name", (c) => ({ ...c, version_name: "1.0" })],
    ["version code 0", (c) => ({ ...c, version_code: 0 })],
    ["color", (c) => ({ ...c, branding: { ...c.branding, primary_color: "#FFF" } })],
    ["template", (c) => ({ ...c, branding: { ...c.branding, template: "fancy" } })],
    ["font", (c) => ({ ...c, branding: { ...c.branding, font: "Comic Sans" } })],
    ["icon url", (c) => ({ ...c, branding: { ...c.branding, icon_url: "not a url" } })],
    ["extra property", (c) => ({ ...c, google_play_key: "secret" })],
    ["schema version", (c) => ({ ...c, schema_version: 2 })],
    ["app type", (c) => ({ ...c, app_type: "salon" })],
  ])("rejects %s", (_name, change) => {
    const result = validateBuildConfig(change(validConfig()));
    expect(result.ok).toBe(false);
  });

  it("builds Store apps", () => {
    const app = { ...completeApp("c1"), appType: "store" as const };
    const config = buildConfigFor(app, { id: "c1" }, { name: "1.0.0", code: 1 }, assetUrl);
    expect(config.app_type).toBe("store");
    expect(validateBuildConfig(config).ok).toBe(true);
    expect(newApp("c1", null, NOW, "store").appType).toBe("store");
    expect(newApp("c1", null, NOW).appType).toBe("lms");
    expect(isAppType("store")).toBe(true);
    expect(isAppType("salon")).toBe(false);
  });

  it("builds Bookings apps", () => {
    const app = { ...completeApp("c1"), appType: "booking" as const };
    const config = buildConfigFor(app, { id: "c1" }, { name: "1.0.0", code: 1 }, assetUrl);
    expect(config.app_type).toBe("booking");
    expect(validateBuildConfig(config).ok).toBe(true);
    expect(isAppType("booking")).toBe(true);
    expect(APP_TYPE_NAMES.booking).toBe("Bookings");
  });

  it("builds Real estate apps, on the hosted API only", () => {
    const wordpress = { ...completeApp("c1"), appType: "real_estate" as const };
    // A Real estate app has no WordPress side: the Website step stays open until it runs on the hosted API.
    expect(stepStatus(wordpress, "starter").website).toBe(false);
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    const app = { ...wordpress, backend: "hosted" as const, siteUrl: null, connector: { kind: "listings" as const } };
    expect(isSetupComplete(app, "starter")).toBe(true);
    const config = buildConfigFor(app, { id: "c1" }, { name: "1.0.0", code: 1 }, assetUrl);
    expect(config.app_type).toBe("real_estate");
    expect(config).toMatchObject({ api_base_url: `https://yallapp.com.tr/api/app/${app.id}`, site_url: "https://yallapp.com.tr" });
    expect(validateBuildConfig(config).ok).toBe(true);
    vi.unstubAllEnvs();
    expect(isAppType("real_estate")).toBe(true);
    expect(APP_TYPE_NAMES.real_estate).toBe("Real estate");
  });

  it("builds the config from wizard data without secrets", async () => {
    const app = { ...completeApp("c1"), googlePlayKeyEncrypted: "v1.secret", logoAssetId: "logo-1" };
    const config = buildConfigFor(app, { id: "c1" }, { name: "1.2.3", code: 7 }, assetUrl);
    expect(validateBuildConfig(config).ok).toBe(true);
    expect(config.branding.logo_url).toBe(assetUrl("logo-1"));
    expect(JSON.stringify(config)).not.toContain("secret");
  });
});

describe("setup wizard", () => {
  it("tracks steps and the next one to do", () => {
    const app = newApp("c1", "https://academy.test", NOW);
    expect(nextStep(null, "starter")).toBe("app-type");
    expect(nextStep(app, "starter")).toBe("website");
    const done = completeApp("c1");
    expect(isSetupComplete(done, "starter")).toBe(true);
    // Pro needs at least one store key to finish publishing.
    expect(stepStatus(done, "pro").publishing).toBe(false);
    expect(isSetupComplete({ ...done, googlePlayKeyEncrypted: "v1.x" }, "pro")).toBe(true);
  });

  it("validates each step with the schema's rules", () => {
    expect(websiteSchema.safeParse({ backend: "wordpress", siteUrl: "http://academy.test" }).success).toBe(false);
    expect(websiteSchema.safeParse({ backend: "wordpress", siteUrl: "academy.test" }).success).toBe(true);

    const branding = {
      appName: "Ada Academy",
      shortName: "Ada",
      primaryColor: "#0E0D24",
      splashColor: "#FFFFFF",
      template: "bold",
      font: "Outfit",
      iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
      logoAssetId: "",
    };
    expect(brandingSchema.safeParse(branding).success).toBe(true);
    expect(brandingSchema.safeParse({ ...branding, shortName: "Thirteen chars" }).success).toBe(false);
    expect(brandingSchema.safeParse({ ...branding, iconAssetId: "" }).success).toBe(false);
    expect(brandingSchema.safeParse({ ...branding, font: "Arial" }).success).toBe(false);

    const listing = {
      androidPackage: "com.adaacademy.app",
      iosBundleId: "com.ada-academy.app",
      storeTitle: "Ada Academy",
      shortDescription: "Learn with Ada on your phone.",
      fullDescription: "x".repeat(60),
      supportEmail: "help@academy.test",
      privacyUrl: "https://academy.test/privacy",
    };
    expect(listingSchema.safeParse(listing).success).toBe(true);
    expect(listingSchema.safeParse({ ...listing, androidPackage: "com.ada-academy.app" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...listing, shortDescription: "x".repeat(81) }).success).toBe(false);
    expect(listingSchema.safeParse({ ...listing, privacyUrl: "http://academy.test/privacy" }).success).toBe(false);
  });

  it("checks store keys", () => {
    const serviceAccount = JSON.stringify({ type: "service_account", client_email: "ci@project.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n" });
    const parsed = googlePlayKeySchema.safeParse(serviceAccount);
    expect(parsed.success && parsed.data.clientEmail).toBe("ci@project.iam.gserviceaccount.com");
    expect(googlePlayKeySchema.safeParse("{}").success).toBe(false);
    expect(googlePlayKeySchema.safeParse("not json").success).toBe(false);
    const appStore = { issuerId: "69a6de7e-1234-47e3-e053-5b8c7c11a4d1", keyId: "2X9R4HXF34" };
    const pem = (key: ReturnType<typeof generateKeyPairSync>["privateKey"]) => String(key.export({ type: "pkcs8", format: "pem" }));
    const p8 = pem(generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey);
    expect(appStoreKeySchema.safeParse({ ...appStore, privateKey: p8 }).success).toBe(true);
    expect(appStoreKeySchema.safeParse({ ...appStore, privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----" }).success).toBe(false);
    expect(appStoreKeySchema.safeParse({ ...appStore, privateKey: pem(generateKeyPairSync("ec", { namedCurve: "secp384r1" }).privateKey) }).success).toBe(false);
    expect(appStoreKeySchema.safeParse({ ...appStore, privateKey: pem(generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey) }).success).toBe(false);
    expect(appStoreKeySchema.safeParse({ issuerId: "nope", keyId: "2X9R4HXF34", privateKey: p8 }).success).toBe(false);
  });
});

describe("queueing builds", () => {
  it("queues a build with a validated snapshot and increasing version codes", async () => {
    const { store, client } = await setupClient({ plan: "pro" });
    const app = { ...completeApp(client.id), googlePlayKeyEncrypted: "v1.x" };
    await store.createApp(app);
    const c = (await store.getClientById(client.id))!;
    const license = await store.getLicenseByClientId(client.id);

    const first = await queueBuild(store, { client: c, app, license, versionName: "1.0.0" }, NOW, assetUrl);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.build).toMatchObject({ number: 1, versionCode: 1, status: "queued", autoPublish: true });
    expect(first.build.config.version_code).toBe(1);
    expect(first.build.stages).toMatchObject({ queued: "done", upload_play: "pending", upload_testflight: "skipped" });

    // One build at a time.
    expect(await queueBuild(store, { client: c, app, license, versionName: "1.0.1" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "build_running" });
    await store.updateBuild(first.build.id, { status: "ready" }, NOW);

    expect(await queueBuild(store, { client: c, app, license, versionName: "0.9.0" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "version_too_low" });
    const second = await queueBuild(store, { client: c, app, license, versionName: "1.0.0" }, NOW, assetUrl);
    expect(second.ok && second.build).toMatchObject({ number: 2, versionCode: 2 });

    // Changing the app later doesn't change the snapshot.
    await store.updateApp(app.id, { appName: "Renamed" }, NOW);
    expect((await store.getBuild(first.build.id))?.config.app_name).toBe("Ada Academy");
  });

  it("refuses when setup is incomplete or the plan expired", async () => {
    const { store, client } = await setupClient({ activeUntil: days(1) });
    const c = (await store.getClientById(client.id))!;
    const license = await store.getLicenseByClientId(client.id);
    const incomplete = newApp(client.id, "https://academy.test", NOW);
    expect(await queueBuild(store, { client: c, app: incomplete, license, versionName: "1.0.0" }, NOW, assetUrl)).toMatchObject({ reason: "setup_incomplete" });
    expect(await queueBuild(store, { client: c, app: completeApp(client.id), license, versionName: "1.0.0" }, days(2), assetUrl)).toMatchObject({ reason: "license_inactive" });
  });
});

describe("uploaded images", () => {
  function png(width: number, height: number, colorType: number, extraChunk?: string): Buffer {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0);
    ihdr.write("IHDR", 4, "ascii");
    ihdr.writeUInt32BE(width, 8);
    ihdr.writeUInt32BE(height, 12);
    ihdr.writeUInt8(8, 16);
    ihdr.writeUInt8(colorType, 17);
    const chunks = [signature, ihdr];
    if (extraChunk) {
      const chunk = Buffer.alloc(13);
      chunk.writeUInt32BE(1, 0);
      chunk.write(extraChunk, 4, "ascii");
      chunks.push(chunk);
    }
    const idat = Buffer.alloc(12);
    idat.write("IDAT", 4, "ascii");
    chunks.push(idat);
    return Buffer.concat(chunks);
  }

  it("reads PNG size and transparency", () => {
    expect(readPngInfo(png(1024, 1024, 2))).toMatchObject({ width: 1024, height: 1024, hasTransparency: false });
    expect(readPngInfo(png(1024, 1024, 6))?.hasTransparency).toBe(true);
    expect(readPngInfo(png(1024, 1024, 3, "tRNS"))?.hasTransparency).toBe(true);
    expect(readPngInfo(Buffer.from("GIF89a"))).toBeNull();
  });

  it("recognises SVG files", () => {
    expect(isSvg(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe(true);
    expect(isSvg(Buffer.from("<html><svg></svg></html>"))).toBe(false);
  });
});
