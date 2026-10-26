import { describe, expect, it } from "vitest";
import { newApp, queueBuild } from "@/lib/app/setup";
import { AUTO_BUILD_WAIT_MINUTES, buildChanges, runAutoBuilds, scheduleAutoBuild } from "@/lib/builds/auto";
import type { App } from "@/lib/data/types";
import { days, licenseOf, NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

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

async function built(plan: "growth" | "pro" = "growth") {
  const setup = await setupClient({ plan, activeUntil: days(60) });
  const store = setup.store;
  const client = (await store.getClientById(setup.client.id))!;
  const app = completeApp(client.id);
  await store.createApp(app);
  const license = await licenseOf(store, client.id);
  const first = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl);
  if (!first.ok) throw new Error(`not queued: ${first.reason}`);
  await store.updateBuild(first.build.id, { status: "ready", finishedAt: NOW }, NOW);
  return { store, client, app, last: (await store.getBuild(first.build.id))! };
}

describe("87.4 automatic builds only for changes that need one", () => {
  it("knows what a new build would bring", async () => {
    const { client, app, last: made } = await built();
    // As made on a plan where Yallapp publishes for the client.
    const last = { ...made, autoPublish: true };
    expect(buildChanges(app, client, last, assetUrl)).toEqual([]);
    // Pages, texts and settings reach the app without one.
    expect(buildChanges({ ...app, chatSettings: { enabled: false } as never }, client, last, assetUrl)).toEqual([]);
    expect(buildChanges({ ...app, appName: "Ada School" }, client, last, assetUrl)).toEqual(["app"]);
    expect(buildChanges({ ...app, primaryColor: "#123456" }, client, last, assetUrl)).toEqual(["app"]);
    // The listing goes to the stores only when Yallapp publishes for the client.
    expect(buildChanges({ ...app, shortDescription: "Learn anywhere." }, client, made, assetUrl)).toEqual([]);
    expect(buildChanges({ ...app, shortDescription: "Learn anywhere." }, client, last, assetUrl)).toEqual(["listing"]);
    expect(buildChanges({ ...app, googlePlayKeyEncrypted: "v1.x" }, client, last, assetUrl)).toEqual(["stores"]);
  });

  it("puts several saves in one build, a few minutes after the last", async () => {
    const { store, client, app } = await built();
    const started: number[] = [];
    const deps = (now: Date) => ({ store, now, assetUrl, start: async () => void started.push(now.getTime()) });
    await store.updateApp(app.id, { appName: "Ada School" }, NOW);
    await scheduleAutoBuild(store, app, NOW);
    // Another save 6 minutes later moves the build later.
    await store.updateApp(app.id, { shortName: "Ada S" }, minutes(6));
    expect(await scheduleAutoBuild(store, app, minutes(6))).toEqual(minutes(6 + AUTO_BUILD_WAIT_MINUTES));
    expect(await runAutoBuilds(deps(minutes(AUTO_BUILD_WAIT_MINUTES)))).toEqual({ queued: 0, nothing: 0, later: 0 });
    expect(await runAutoBuilds(deps(minutes(6 + AUTO_BUILD_WAIT_MINUTES)))).toEqual({ queued: 1, nothing: 0, later: 0 });
    const builds = await store.listBuildsByApp(app.id, 5);
    expect(builds).toHaveLength(2);
    expect(builds[0]!.config).toMatchObject({ app_name: "Ada School", short_name: "Ada S", version_name: "1.0.1" });
    expect(started).toHaveLength(1);
    expect((await store.getAppById(app.id))!.autoBuildDueAt).toBeNull();
    void client;
  });

  it("waits for a running build, and skips one a build wouldn't change", async () => {
    const { store, app } = await built();
    const deps = (now: Date) => ({ store, now, assetUrl, start: async () => undefined });
    // Nothing changed since the last build: nothing to build.
    await scheduleAutoBuild(store, app, NOW);
    expect(await runAutoBuilds(deps(minutes(AUTO_BUILD_WAIT_MINUTES)))).toEqual({ queued: 0, nothing: 1, later: 0 });
    // A build is running: the automatic one waits for it.
    await store.updateApp(app.id, { appName: "Ada School" }, NOW);
    const last = (await store.listBuildsByApp(app.id, 1))[0]!;
    await store.updateBuild(last.id, { status: "building", finishedAt: null }, minutes(AUTO_BUILD_WAIT_MINUTES));
    await scheduleAutoBuild(store, app, minutes(AUTO_BUILD_WAIT_MINUTES));
    expect(await runAutoBuilds(deps(minutes(2 * AUTO_BUILD_WAIT_MINUTES)))).toEqual({ queued: 0, nothing: 0, later: 1 });
    expect((await store.getAppById(app.id))!.autoBuildDueAt).toEqual(minutes(3 * AUTO_BUILD_WAIT_MINUTES));
  });
});
