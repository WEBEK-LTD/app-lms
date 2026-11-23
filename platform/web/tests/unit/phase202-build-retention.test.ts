import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { liveStoreUrl, storeUrlFor } from "@/lib/app/version-policy";
import { FILES_REMOVED, fileUnavailableReason } from "@/lib/builds/view";
import {
  buildsToClear,
  liveStoreLinks,
  NO_STORE_LINKS,
  offeredBuilds,
  runBuildRetention,
  stillMoving,
  storeLinkFor,
  uploadedToStore,
  type StoreLinks,
} from "@/lib/builds/retention";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Artifact, Build, BuildStages, BuildVariant } from "@/lib/data/types";
import { newPublishingRequest } from "@/lib/publishing/steps";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { NOW } from "./helpers";

/**
 * 202 Old build files leave the files host: each app (and each of its apps)
 * keeps its latest ready build's files, until that build is on a store where
 * the app is live, when the Builds page shows the store's link instead.
 */

const PLAY = "https://play.google.com/store/apps/details?id=com.ada.academy";
const APPLE = "https://apps.apple.com/app/id1234567890";
const LIVE: StoreLinks = { android: PLAY, ios: APPLE };

const ANDROID_FILES = (id: string): Artifact[] => [
  { kind: "apk", url: `https://files.yallapp.test/builds/${id}/app.apk` },
  { kind: "aab", url: `https://files.yallapp.test/builds/${id}/app.aab` },
  { kind: "store_assets", url: `https://files.yallapp.test/builds/${id}/store-assets.zip` },
];
const KEYSTORE = (id: string): Artifact => ({ kind: "keystore", url: `https://files.yallapp.test/builds/${id}/android-upload-key.zip` });
const IPA = (id: string): Artifact => ({ kind: "ipa", url: `https://files.yallapp.test/builds/${id}/app.ipa` });

const STAGES: BuildStages = { queued: "done", android: "done", ios: "done", upload_play: "skipped", upload_testflight: "skipped", app_review: "skipped" };

let numbers = 0;
function build(overrides: Partial<Build> & { files?: (id: string) => Artifact[] } = {}): Build {
  const id = overrides.id ?? randomUUID();
  const { files, ...rest } = overrides;
  numbers += 1;
  return {
    id,
    clientId: "client-1",
    appId: "app-1",
    number: numbers,
    versionName: `1.0.${numbers}`,
    versionCode: numbers,
    status: "ready",
    stages: { ...STAGES },
    config: {} as Build["config"],
    storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
    autoPublish: true,
    artifacts: files ? files(id) : [...ANDROID_FILES(id), IPA(id)],
    message: null,
    logUrl: null,
    createdAt: NOW,
    startedAt: NOW,
    finishedAt: NOW,
    updatedAt: NOW,
    ...rest,
  };
}

const ids = (list: Build[]) => list.map((b) => b.id).sort();

describe("202 which builds keep their files", () => {
  beforeEach(() => {
    numbers = 0;
  });

  it("keeps only the newest ready build's files and clears every older one", () => {
    const a = build();
    const b = build({ status: "failed", artifacts: [IPA("x")] });
    const c = build();
    const d = build();
    const list = [d, c, b, a];
    expect(offeredBuilds(list).android?.id).toBe(d.id);
    expect(ids(buildsToClear(list, NO_STORE_LINKS))).toEqual(ids([a, b, c]));
  });

  it("never touches a build still queued, building, uploading or waiting for App Review", () => {
    const old = build();
    const queued = build({ status: "queued", artifacts: ANDROID_FILES("q") });
    const building = build({ status: "building", artifacts: ANDROID_FILES("b") });
    const uploading = build({ stages: { ...STAGES, upload_play: "running" } });
    const reviewing = build({ stages: { ...STAGES, upload_testflight: "done", app_review: "pending" } });
    const newest = build();
    for (const moving of [queued, building, uploading, reviewing]) expect(stillMoving(moving)).toBe(true);
    expect(stillMoving(newest)).toBe(false);
    expect(ids(buildsToClear([newest, reviewing, uploading, building, queued, old], LIVE))).toEqual(ids([old]));
  });

  it("keeps the latest ready build's files while a new build runs, and the new one's until it's on the store", () => {
    const current = build({ stages: { ...STAGES, upload_play: "done" }, files: (id) => ANDROID_FILES(id) });
    const next = build({ status: "building", artifacts: [] });
    expect(buildsToClear([next, current], NO_STORE_LINKS)).toEqual([]);
    // Ready, but its Google Play upload failed: its files stay and show.
    const failedUpload = { ...next, status: "ready" as const, stages: { ...STAGES, upload_play: "failed" as const }, artifacts: ANDROID_FILES(next.id) };
    expect(ids(buildsToClear([failedUpload, current], LIVE))).toEqual(ids([current]));
    expect(storeLinkFor(failedUpload, "android", LIVE)).toBeNull();
  });

  it("removes the latest build's files once it's on the store and the app is live there", () => {
    const iphone = build({ release: { androidRollout: null, iosPhased: false, only: "ios" }, stages: { ...STAGES, android: "skipped", upload_testflight: "done", app_review: "done" }, files: (id) => [IPA(id)] });
    expect(uploadedToStore(iphone, "ios")).toBe(true);
    expect(ids(buildsToClear([iphone], LIVE))).toEqual(ids([iphone]));
    // Not live on the App Store yet (or the store's page unknown): kept.
    expect(buildsToClear([iphone], { android: PLAY, ios: null })).toEqual([]);
    // On TestFlight, App Review not sent yet: kept.
    const waiting = { ...iphone, stages: { ...iphone.stages, app_review: "failed" as const } };
    expect(uploadedToStore(waiting, "ios")).toBe(false);
    expect(buildsToClear([waiting], LIVE)).toEqual([]);
  });

  it("removes a build's folder only when every file in it is replaced, and never for the upload key", () => {
    // Uploaded to Google Play, the iPhone app not: the folder stays for the .ipa.
    const android = build({ stages: { ...STAGES, upload_play: "done" } });
    expect(buildsToClear([android], LIVE)).toEqual([]);
    // Both stores: everything but the upload key is replaced, so the folder stays for it.
    const both = build({ stages: { ...STAGES, upload_play: "done", upload_testflight: "done", app_review: "done" }, files: (id) => [...ANDROID_FILES(id), KEYSTORE(id), IPA(id)] });
    expect(buildsToClear([both], LIVE)).toEqual([]);
    // Without the key in it: it goes.
    const noKey = build({ stages: { ...STAGES, upload_play: "done", upload_testflight: "done", app_review: "done" } });
    expect(ids(buildsToClear([noKey], LIVE))).toEqual(ids([noKey]));
    // An older build's key is replaced by the newer build's.
    const older = build({ files: (id) => [...ANDROID_FILES(id), KEYSTORE(id)] });
    const newer = build({ files: (id) => [...ANDROID_FILES(id), KEYSTORE(id)] });
    expect(ids(buildsToClear([newer, older], NO_STORE_LINKS))).toEqual(ids([older]));
  });

  it("keeps each platform's latest files when a build was made for one platform alone", () => {
    const both = build();
    const android = build({ release: { androidRollout: null, iosPhased: false, only: "android" }, files: (id) => ANDROID_FILES(id) });
    const offered = offeredBuilds([android, both]);
    expect(offered.android?.id).toBe(android.id);
    expect(offered.ios?.id).toBe(both.id);
    // `both` still holds the iPhone app the page offers.
    expect(buildsToClear([android, both], NO_STORE_LINKS)).toEqual([]);
  });

  it("shows a store's link only when the store is live, for the app's own builds", () => {
    const request = newPublishingRequest({ id: "app-1", clientId: "client-1" }, "managed", NOW);
    expect(liveStoreLinks(request)).toEqual({ android: null, ios: null });
    const live = { ...request, android: { status: "live" as const, note: null, storeUrl: PLAY, updatedAt: NOW }, ios: { status: "in_review" as const, note: null, storeUrl: APPLE, updatedAt: NOW } };
    expect(liveStoreLinks(live)).toEqual({ android: PLAY, ios: null });
    expect(liveStoreLinks(live, "courier")).toEqual({ android: null, ios: null });
    expect(liveStoreLinks(null)).toEqual({ android: null, ios: null });
    expect(liveStoreUrl(live.android)).toBe(PLAY);
    expect(storeUrlFor({ androidPackage: "com.ada.academy" }, live, "android", null)).toBe(PLAY);
    expect(storeUrlFor({ androidPackage: "com.ada.academy" }, live, "ios", null)).toBeNull();
    const uploaded = build({ stages: { ...STAGES, upload_play: "done" } });
    expect(storeLinkFor(uploaded, "android", liveStoreLinks(live))).toBe(PLAY);
    expect(storeLinkFor(uploaded, "ios", liveStoreLinks(live))).toBeNull();
    expect(storeLinkFor(build(), "android", liveStoreLinks(live))).toBeNull();
    expect(storeLinkFor(null, "android", liveStoreLinks(live))).toBeNull();
  });

  it("says the files were removed, in the dashboard's languages", () => {
    const removed = { artifacts: [] };
    expect(fileUnavailableReason({ kind: "apk", build: removed, hasAppStoreKey: true, linkProblem: null, filesRemoved: true })).toBe(FILES_REMOVED);
    expect(fileUnavailableReason({ kind: "apk", build: removed, hasAppStoreKey: true, linkProblem: null })).toBe("Not in this build. Start a new build to get it.");
    expect(knownTranslator("ar")(FILES_REMOVED)).not.toBe(FILES_REMOVED);
    expect(knownTranslator("tr")(FILES_REMOVED)).not.toBe(FILES_REMOVED);
    for (const lang of ["en", "ar", "tr"] as const) {
      const t = getDashT(lang);
      expect(t("builds.filesRemoved", { date: "1" })).toContain("1");
      expect(t("builds.openStore", { store: "Google Play" })).toContain("Google Play");
      expect(t("builds.onGooglePlay")).toContain("Google Play");
      expect(t("builds.onAppStore")).toContain("App Store");
    }
  });
});

describe("202 the daily job", () => {
  let store: MemoryStore;
  let folders: string[];
  let down: Set<string>;
  const remover = async (buildId: string) => {
    if (down.has(buildId)) throw new Error("The files host answered 500.");
    folders.push(buildId);
  };

  async function seedApp(name: string): Promise<App> {
    const app: App = { ...newApp("client-1", null, NOW, "lms"), appName: name };
    await store.createApp(app);
    return app;
  }
  async function seedBuild(app: App, overrides: Partial<Build> & { variant?: BuildVariant } = {}): Promise<Build> {
    const id = randomUUID();
    const { number: _n, versionCode: _v, ...input } = build({ id, appId: app.id, ...overrides });
    void _n;
    void _v;
    return store.createBuild(input);
  }

  beforeEach(() => {
    numbers = 0;
    store = new MemoryStore();
    folders = [];
    down = new Set();
  });

  it("removes builds/<id> of the older builds only, per app and variant, and marks them", async () => {
    const app = await seedApp("Ada Academy");
    const old = await seedBuild(app);
    const latest = await seedBuild(app);
    const courierOld = await seedBuild(app, { variant: "courier" });
    const courierLatest = await seedBuild(app, { variant: "courier" });
    const running = await seedBuild(app, { status: "building", artifacts: [] });
    const report = await runBuildRetention({ store, now: NOW, removeBuildFolder: remover });
    expect(report).toEqual({ removed: 2, failed: 0, appsFailed: 0, ran: true });
    expect(folders.sort()).toEqual([old.id, courierOld.id].sort());
    const after = await store.listBuildsByApp(app.id, 50, "all");
    const byId = new Map(after.map((b) => [b.id, b]));
    expect(byId.get(old.id)!.artifacts).toEqual([]);
    expect(byId.get(old.id)!.release?.filesRemovedAt).toBe(NOW.toISOString());
    expect(byId.get(latest.id)!.artifacts.length).toBeGreaterThan(0);
    expect(byId.get(courierLatest.id)!.artifacts.length).toBeGreaterThan(0);
    expect(byId.get(running.id)!.status).toBe("building");
    // Again: nothing more to remove.
    folders = [];
    expect((await runBuildRetention({ store, now: NOW, removeBuildFolder: remover })).removed).toBe(0);
    expect(folders).toEqual([]);
  });

  it("removes the latest build's folder once it's on a live store, the courier app's never", async () => {
    const app = await seedApp("Ada Academy");
    const onStore = { ...STAGES, android: "skipped" as const, upload_testflight: "done" as const, app_review: "done" as const };
    const iphone = await seedBuild(app, { release: { androidRollout: null, iosPhased: false, only: "ios" }, stages: onStore, artifacts: [IPA("x")] });
    const courier = await seedBuild(app, { variant: "courier", release: { androidRollout: null, iosPhased: false, only: "ios" }, stages: onStore, artifacts: [IPA("y")] });
    const request = newPublishingRequest(app, "managed", NOW);
    await store.savePublishingRequest({ ...request, ios: { status: "live", note: null, storeUrl: APPLE, updatedAt: NOW } });
    await runBuildRetention({ store, now: NOW, removeBuildFolder: remover });
    expect(folders).toEqual([iphone.id]);
    void courier;
  });

  it("goes on with the other builds and apps when one fails, and tries again the next day", async () => {
    const first = await seedApp("Ada Academy");
    const second = await seedApp("Ada Shop");
    const stuck = await seedBuild(first);
    await seedBuild(first);
    const other = await seedBuild(second);
    await seedBuild(second);
    down.add(stuck.id);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = await runBuildRetention({ store, now: NOW, removeBuildFolder: remover });
    expect(report).toMatchObject({ removed: 1, failed: 1 });
    expect(folders).toEqual([other.id]);
    expect((await store.listBuildsByApp(first.id, 50, "all")).find((b) => b.id === stuck.id)!.artifacts.length).toBeGreaterThan(0);
    // An app whose builds can't be read doesn't stop the others.
    const read = store.listBuildsByApp.bind(store);
    vi.spyOn(store, "listBuildsByApp").mockImplementation(async (appId, limit, variant) => {
      if (appId === first.id) throw new Error("The database didn't answer.");
      return read(appId, limit, variant);
    });
    const third = await seedApp("Ada Cafe");
    const thirdOld = await seedBuild(third);
    await seedBuild(third);
    folders = [];
    expect(await runBuildRetention({ store, now: NOW, removeBuildFolder: remover })).toMatchObject({ removed: 1, appsFailed: 1 });
    expect(folders).toEqual([thirdOld.id]);
    vi.restoreAllMocks();
    down.clear();
    folders = [];
    expect((await runBuildRetention({ store, now: NOW, removeBuildFolder: remover })).removed).toBe(1);
    expect(folders).toEqual([stuck.id]);
    error.mockRestore();
  });

  it("stops at its limit for the day", async () => {
    const app = await seedApp("Ada Academy");
    for (let i = 0; i < 4; i++) await seedBuild(app);
    expect((await runBuildRetention({ store, now: NOW, removeBuildFolder: remover }, 2)).removed).toBe(2);
    expect((await runBuildRetention({ store, now: NOW, removeBuildFolder: remover }, 2)).removed).toBe(1);
  });

  it("without the files host set up, logs and removes nothing", async () => {
    const app = await seedApp("Ada Academy");
    await seedBuild(app);
    await seedBuild(app);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runBuildRetention({ store, now: NOW, removeBuildFolder: null })).toEqual({ removed: 0, failed: 0, appsFailed: 0, ran: false });
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
    expect((await store.listBuildsByApp(app.id, 50, "all")).every((b) => b.artifacts.length > 0)).toBe(true);
  });
});
