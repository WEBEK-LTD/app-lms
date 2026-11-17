import { describe, expect, it } from "vitest";
import { initialStages, iosBuildAvailable, newApp, queueBuild } from "@/lib/app/setup";
import { runAppReleaseBuilds } from "@/lib/builds/app-release";
import { runAutoBuilds } from "@/lib/builds/auto";
import { buildSummary } from "@/lib/builds/pipeline";
import { buildOnly } from "@/lib/builds/view";
import type { App } from "@/lib/data/types";
import { knownTranslator } from "@/i18n/dashboard";
import { PLAN_INFO } from "@/lib/plans";
import { days, licenseOf, NOW, setupClient } from "./helpers";

/**
 * 142 Builds › "Android only" and "iPhone only" next to "Start new build"
 * (the owner, 17 November): once the app has both apps (iOS on its plan and
 * the App Store Connect key saved), each can be built alone; Start new build
 * still builds both.
 */

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const APPLE = { ascKeyId: "2X9R4HXF34", ascIssuerId: "69a6de7e-0000-4000-8000-000000000000", ascPrivateKeyEncrypted: "v1.apple" };

function completeApp(clientId: string, patch: Partial<App> = {}): App {
  return {
    ...newApp(clientId, "https://flowers.test", NOW),
    websiteDoneAt: NOW,
    appName: "Kech Flora",
    shortName: "Kech",
    iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
    brandingDoneAt: NOW,
    androidPackage: "com.kechflora.app",
    iosBundleId: "com.kechflora.app",
    storeTitle: "Kech Flora",
    shortDescription: "Flowers delivered today.",
    fullDescription: "Kech Flora brings fresh bouquets and gifts to your door, the same day or the next.",
    supportEmail: "help@flowers.test",
    privacyUrl: "https://flowers.test/privacy",
    listingDoneAt: NOW,
    publishingDoneAt: NOW,
    googlePlayKeyEncrypted: "v1.play",
    ...patch,
  };
}

async function shop(plan: "starter" | "growth" = "growth", patch: Partial<App> = APPLE) {
  const setup = await setupClient({ plan, activeUntil: days(60) });
  const store = setup.store;
  const client = (await store.getClientById(setup.client.id))!;
  const app = completeApp(client.id, patch);
  await store.createApp(app);
  const license = await licenseOf(store, client.id);
  return { store, client, app, license };
}

describe("142 a build of one platform's app", () => {
  it("skips the other platform's stages, the other Android stores with Android", () => {
    const app = completeApp("c1", { ...APPLE, galaxyKeyEncrypted: "v1.g", galaxyContentId: "000000123", galaxyServiceAccountId: "sa" });
    expect(initialStages(true, app, true)).toMatchObject({ android: "pending", ios: "pending", upload_play: "pending", upload_testflight: "pending", app_review: "pending", upload_galaxy: "pending" });
    expect(initialStages(true, app, true, "android")).toMatchObject({ android: "pending", upload_play: "pending", upload_galaxy: "pending", ios: "skipped", upload_testflight: "skipped", app_review: "skipped" });
    expect(initialStages(true, app, true, "ios")).toMatchObject({ android: "skipped", upload_play: "skipped", upload_galaxy: "skipped", upload_appgallery: "skipped", upload_xiaomi: "skipped", ios: "pending", upload_testflight: "pending", app_review: "pending" });
  });

  it("offers the iPhone alone only with iOS on the plan and the App Store Connect key", () => {
    expect(iosBuildAvailable(completeApp("c1", APPLE), PLAN_INFO.growth)).toBe(true);
    expect(iosBuildAvailable(completeApp("c1", APPLE), PLAN_INFO.starter)).toBe(false);
    expect(iosBuildAvailable(completeApp("c1"), PLAN_INFO.growth)).toBe(false);
    expect(iosBuildAvailable(completeApp("c1", APPLE), null)).toBe(false);
  });

  it("queues the iPhone app alone, the Android app alone, or both, and tells the pipeline", async () => {
    const { store, client, app, license } = await shop();
    const ios = await queueBuild(store, { client, app, license, versionName: "1.0.0", only: "ios" }, NOW, assetUrl);
    if (!ios.ok) throw new Error(ios.reason);
    expect(buildOnly(ios.build)).toBe("ios");
    expect(ios.build.stages).toMatchObject({ android: "skipped", upload_play: "skipped", ios: "pending", upload_testflight: "pending" });
    expect(buildSummary(ios.build)).toMatchObject({ android: false, ios: true, only: "ios" });
    // Released as any other build: to everyone on Google Play (not this one), App Review after TestFlight.
    expect(ios.build.release).toMatchObject({ androidRollout: 1, only: "ios" });
    await store.updateBuild(ios.build.id, { status: "ready", finishedAt: NOW }, NOW);

    const android = await queueBuild(store, { client, app, license, versionName: "1.0.1", only: "android" }, minutes(30), assetUrl);
    if (!android.ok) throw new Error(android.reason);
    expect(buildSummary(android.build)).toMatchObject({ android: true, ios: false, only: "android" });
    await store.updateBuild(android.build.id, { status: "ready", finishedAt: minutes(31) }, minutes(31));

    const both = await queueBuild(store, { client, app, license, versionName: "1.0.2" }, minutes(60), assetUrl);
    if (!both.ok) throw new Error(both.reason);
    expect(buildOnly(both.build)).toBeNull();
    expect(both.build.release?.only).toBeUndefined();
    expect(buildSummary(both.build)).toMatchObject({ android: true, ios: true, only: null });
  });

  it("refuses the iPhone alone without the iPhone app, in plain words in every language", async () => {
    const noKey = await shop("growth", {});
    expect(await queueBuild(noKey.store, { client: noKey.client, app: noKey.app, license: noKey.license, versionName: "1.0.0", only: "ios" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "ios_unavailable" });
    const noIos = await shop("starter");
    expect(await queueBuild(noIos.store, { client: noIos.client, app: noIos.app, license: noIos.license, versionName: "1.0.0", only: "ios" }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "ios_unavailable" });
    // Android alone always builds.
    expect(await queueBuild(noIos.store, { client: noIos.client, app: noIos.app, license: noIos.license, versionName: "1.0.0", only: "android" }, NOW, assetUrl)).toMatchObject({ ok: true });
    const message = "The iPhone app needs your App Store Connect key in App setup › Publishing, on a plan with the iOS app.";
    for (const lang of ["ar", "tr"] as const) expect(knownTranslator(lang)(message), lang).not.toBe(message);
  });
});

describe("142 the automatic builds read the last build of both apps", () => {
  it("rebuilds a change an iPhone-only build doesn't cover", async () => {
    const { store, client, app, license } = await shop();
    const first = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl);
    if (!first.ok) throw new Error(first.reason);
    await store.updateBuild(first.build.id, { status: "ready", finishedAt: NOW }, NOW);
    // The owner renames the app and builds the iPhone app alone: Android still has the old name.
    await store.updateApp(app.id, { appName: "Kech Flora Shop" }, minutes(1));
    const renamed = (await store.getAppById(app.id))!;
    const ios = await queueBuild(store, { client, app: renamed, license, versionName: "1.0.1", only: "ios" }, minutes(2), assetUrl);
    if (!ios.ok) throw new Error(ios.reason);
    await store.updateBuild(ios.build.id, { status: "ready", finishedAt: minutes(20) }, minutes(20));
    await store.updateApp(app.id, { autoBuildDueAt: minutes(25) }, minutes(21));
    const run = await runAutoBuilds({ store, now: minutes(30), assetUrl, start: async () => undefined });
    expect(run.queued).toBe(1);
    const latest = (await store.listBuildsByApp(app.id, 1))[0]!;
    expect(latest.versionName).toBe("1.0.2");
    expect(buildOnly(latest)).toBeNull();
  });

  it("gives an app whose last build of both is on an older Yallapp release its new build", async () => {
    const { store, client, app, license } = await shop();
    const first = await queueBuild(store, { client, app, license, versionName: "1.0.0", appRelease: 1 }, NOW, assetUrl);
    if (!first.ok) throw new Error(first.reason);
    await store.updateBuild(first.build.id, { status: "ready", finishedAt: NOW }, NOW);
    // Android alone on the current release: the iPhone app is still on the old one.
    const android = await queueBuild(store, { client, app, license, versionName: "1.0.1", only: "android" }, minutes(5), assetUrl);
    if (!android.ok) throw new Error(android.reason);
    await store.updateBuild(android.build.id, { status: "ready", finishedAt: minutes(15) }, minutes(15));
    const queued: string[] = [];
    const report = await runAppReleaseBuilds({
      store,
      now: minutes(60),
      assetUrl,
      start: async () => undefined,
      queue: async ({ versionName }) => {
        queued.push(versionName);
        return { ok: true };
      },
    });
    expect(report.queued).toBe(1);
    // The version goes on from the newest build.
    expect(queued).toEqual(["1.0.2"]);
  });
});
