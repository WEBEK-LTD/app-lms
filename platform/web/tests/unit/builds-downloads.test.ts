import { createHmac } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { newApp, queueBuild } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { activateClient } from "@/lib/admin/clients";
import { notifyBuildFinished } from "@/lib/builds/notify";
import { applyPipelineStatus, buildSummary, pipelineStatusSchema } from "@/lib/builds/pipeline";
import {
  BUILD_STATUS_LABEL,
  BUILDING_STALL_MS,
  failureReason,
  fileDescription,
  fileUnavailableReason,
  formatDuration,
  isInProgress,
  isStalled,
  QUEUED_STALL_MS,
  STALLED_MESSAGE,
  suggestedVersion,
} from "@/lib/builds/view";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import { BuildRunningError } from "@/lib/data/store";
import type { App, Build } from "@/lib/data/types";
import { buildFileRedirect, dashboardFileHref, isArtifactKind } from "@/lib/files";
import { KEY, NOW, days, licenseOf, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const later = (ms: number) => new Date(NOW.getTime() + ms);

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

const build = (patch: Partial<Build> = {}): Build => ({
  id: "0f8e5a52-6c1b-4c39-9d7e-5b0c0e9a1a11",
  clientId: "c1",
  appId: "a1",
  number: 3,
  versionName: "1.0.2",
  versionCode: 3,
  status: "queued",
  stages: { queued: "done", android: "pending", ios: "skipped", upload_play: "skipped", upload_testflight: "skipped" },
  config: {} as Build["config"],
  storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
  autoPublish: false,
  artifacts: [],
  message: null,
  logUrl: null,
  createdAt: NOW,
  startedAt: null,
  finishedAt: null,
  updatedAt: NOW,
  ...patch,
});

describe("how builds read on Builds & downloads", () => {
  it("labels every status in plain words", () => {
    expect(BUILD_STATUS_LABEL).toEqual({ queued: "Waiting to start", building: "Building", ready: "Ready", failed: "Didn't finish" });
  });

  it("counts a build as stalled after a day in the queue or six hours without a report", () => {
    expect(isStalled(build({ status: "queued" }), later(QUEUED_STALL_MS))).toBe(false);
    expect(isStalled(build({ status: "queued" }), later(QUEUED_STALL_MS + 1))).toBe(true);
    // Building: counted from the last report, not from when it was queued.
    const running = build({ status: "building", createdAt: days(-2), updatedAt: NOW });
    expect(isStalled(running, later(BUILDING_STALL_MS))).toBe(false);
    expect(isStalled(running, later(BUILDING_STALL_MS + 1))).toBe(true);
    expect(isStalled(build({ status: "failed", updatedAt: days(-9) }), NOW)).toBe(false);
    expect(isInProgress(running, NOW)).toBe(true);
    expect(isInProgress(running, days(1))).toBe(false);
    expect(isInProgress(null, NOW)).toBe(false);
  });

  it("explains a failure with the pipeline's message, else with the stage that failed", () => {
    expect(failureReason(build({ status: "failed", message: "  The Android app couldn't be built. " }))).toBe("The Android app couldn't be built.");
    expect(failureReason(build({ status: "failed", stages: { ...build().stages, ios: "failed" } }))).toBe("The iOS app couldn't be built.");
    expect(failureReason(build({ status: "failed", stages: { ...build().stages, upload_play: "failed" } }))).toBe("The upload to Google Play didn't work.");
    expect(failureReason(build({ status: "failed" }))).toBe("The build didn't finish.");
  });

  it("suggests the same version after a failed build, the next one after a ready build", () => {
    expect(suggestedVersion(null)).toBe("1.0.0");
    expect(suggestedVersion(build({ status: "failed" }))).toBe("1.0.2");
    expect(suggestedVersion(build({ status: "ready" }))).toBe("1.0.3");
    expect(suggestedVersion(build({ status: "building" }))).toBe("1.0.3");
  });

  it("formats how long a build took", () => {
    expect(formatDuration(NOW, null)).toBeNull();
    expect(formatDuration(NOW, later(20_000))).toBe("under a minute");
    expect(formatDuration(NOW, later(12 * 60_000))).toBe("12 min");
    expect(formatDuration(NOW, later(65 * 60_000))).toBe("1 h 5 min");
    expect(formatDuration(NOW, later(120 * 60_000))).toBe("2 h");
  });

  it("says why each file can't be downloaded", () => {
    const ready = build({ status: "ready", artifacts: [{ kind: "apk", url: "https://files.yallapp.com.tr/builds/x/app.apk" }] });
    expect(fileUnavailableReason({ kind: "apk", build: null, hasAppStoreKey: false, linkProblem: null })).toBe("Available after your first successful build");
    expect(fileUnavailableReason({ kind: "apk", build: ready, hasAppStoreKey: false, linkProblem: null })).toBeNull();
    expect(fileUnavailableReason({ kind: "apk", build: ready, hasAppStoreKey: false, linkProblem: "Downloads aren't configured yet" })).toBe(
      "Downloads aren't configured yet",
    );
    expect(fileUnavailableReason({ kind: "ipa", build: ready, hasAppStoreKey: false, linkProblem: null })).toMatch(/Add your App Store Connect key/);
    expect(fileUnavailableReason({ kind: "ipa", build: ready, hasAppStoreKey: true, linkProblem: null })).toMatch(/Start a new build to get the iOS app/);
    expect(fileUnavailableReason({ kind: "keystore", build: ready, hasAppStoreKey: false, linkProblem: null })).toMatch(/Not in this build/);
  });

  it("describes the iOS app by plan: TestFlight with \"We publish for you\", Transporter without", () => {
    expect(fileDescription("ipa", true)).toMatch(/TestFlight/);
    expect(fileDescription("ipa", false)).toMatch(/Transporter/);
    expect(fileDescription("aab", false)).toBe("The file you upload to Google Play");
  });
});

describe("queueing builds safely", () => {
  async function ready(plan: "starter" | "growth" | "pro" = "growth", patch: Partial<App> = {}) {
    const { store, client } = await setupClient({ plan, activeUntil: days(60) });
    const app = { ...completeApp(client.id), ...patch };
    await store.createApp(app);
    const c = (await store.getClientById(client.id))!;
    const license = await licenseOf(store, client.id);
    return { store, client: c, app, license };
  }

  it("doesn't show an iOS stage without an App Store Connect key", async () => {
    const { store, client, app, license } = await ready();
    const first = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl);
    expect(first.ok && first.build.stages).toMatchObject({ android: "pending", ios: "skipped" });
    await store.updateBuild(first.ok ? first.build.id : "", { status: "ready" }, NOW);
    const withKey = { ...app, ascPrivateKeyEncrypted: "v1.x", ascIssuerId: "i", ascKeyId: "K" };
    const second = await queueBuild(store, { client, app: withKey, license, versionName: "1.0.1" }, NOW, assetUrl);
    expect(second.ok && second.build.stages).toMatchObject({ ios: "pending" });
  });

  it("87.1 doesn't queue a build the checks before it stop, and says why", async () => {
    const { store, client, app, license } = await ready();
    // The icon the app points at can't be read.
    const deps = { key: Buffer.alloc(32, 7), readAsset: async () => null };
    const stopped = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl, deps);
    expect(stopped).toMatchObject({ ok: false, reason: "preflight" });
    if (stopped.ok || stopped.reason !== "preflight") return;
    expect(stopped.checks.map((c) => [c.key, c.level])).toEqual([
      ["icon", "error"],
      ["firebase", "warning"],
    ]);
    expect(await store.listBuildsByApp(app.id, 5)).toEqual([]);
  });

  it("87.3 keeps the code a build was made from, and rebuilds it as it was", async () => {
    const { store, client, app, license } = await ready();
    const first = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl);
    if (!first.ok) throw new Error("not queued");
    const commit = "a".repeat(40);
    const applied = await applyPipelineStatus(store, first.build, pipelineStatusSchema.parse({ status: "building", source_commit: commit }), NOW);
    expect(applied.ok && applied.build.sourceCommit).toBe(commit);
    await store.updateBuild(first.build.id, { status: "ready", finishedAt: NOW }, NOW);
    const made = (await store.getBuild(first.build.id))!;
    // The app changed since: the rebuild keeps the config it had, with a new version, and the same code.
    const changed = { ...app, appName: "Another name" };
    const again = await queueBuild(store, { client, app: changed, license, versionName: "1.0.1", from: made }, NOW, assetUrl);
    if (!again.ok) throw new Error(`not queued: ${again.reason}`);
    expect(again.build).toMatchObject({ sourceRef: commit, rebuildOf: made.number, versionName: "1.0.1" });
    expect(again.build.config).toMatchObject({ app_name: made.config.app_name, version_name: "1.0.1" });
    expect(again.build.config.app_name).not.toBe("Another name");
    expect(buildSummary(again.build)).toMatchObject({ source_ref: commit, rebuild_of: made.number, source_commit: null });
    // A build without a known commit can't be rebuilt as it was.
    await store.updateBuild(again.build.id, { status: "ready", finishedAt: NOW }, NOW);
    const unknown = (await store.getBuild(again.build.id))!;
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.2", from: { ...unknown, sourceCommit: null } }, NOW, assetUrl)).toMatchObject({ ok: false, reason: "invalid_config" });
    expect(pipelineStatusSchema.safeParse({ source_commit: "abc" }).success).toBe(false);
  });

  it("closes a build that stopped reporting, so the app isn't blocked for ever", async () => {
    const { store, client, app, license } = await ready();
    const first = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl);
    if (!first.ok) throw new Error("not queued");
    await applyPipelineStatus(store, first.build, { status: "building" }, NOW);
    // Still running an hour later: a new build waits.
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0" }, later(60 * 60_000), assetUrl)).toMatchObject({ reason: "build_running" });
    // Six hours without a report: closed as not finished, and the same version can be tried again.
    const retry = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, later(BUILDING_STALL_MS + 60_000), assetUrl);
    expect(retry.ok && retry.build).toMatchObject({ number: 2, versionCode: 2, status: "queued" });
    expect(await store.getBuild(first.build.id)).toMatchObject({ status: "failed", message: STALLED_MESSAGE });
    // A late report from the stopped run can't change it any more.
    const late = await applyPipelineStatus(store, (await store.getBuild(first.build.id))!, { status: "ready" }, days(1));
    expect(late).toMatchObject({ ok: false, code: "build_finished" });
  });

  it("queues one build when two start at once", async () => {
    const { store, client, app, license } = await ready();
    const results = await Promise.all([
      queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl),
      queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ reason: "build_running" });
    expect(await store.listBuildsByApp(app.id, 10)).toHaveLength(1);
  });

  it("refuses an exclusive build while one is queued, in the store itself", async () => {
    const { store, client, app, license } = await ready();
    const first = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, assetUrl);
    if (!first.ok) throw new Error("not queued");
    const { number: _n, versionCode: _v, ...input } = first.build;
    void _n;
    void _v;
    await expect(store.createBuild({ ...input, id: "1f8e5a52-6c1b-4c39-9d7e-5b0c0e9a1a12" }, { exclusive: true })).rejects.toBeInstanceOf(BuildRunningError);
  });

  it("refuses new builds without an active license, also for a suspended account", async () => {
    const { store, client, app, license } = await ready();
    expect(await queueBuild(store, { client, app, license, versionName: "1.0.0" }, days(61), assetUrl)).toMatchObject({ reason: "license_inactive" });
    expect(await queueBuild(store, { client: { ...client, status: "suspended" }, app, license, versionName: "1.0.0" }, NOW, assetUrl)).toMatchObject({
      reason: "license_inactive",
    });
  });

  it("lists finished builds newest first for the admin, the queue oldest first for the pipeline", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "A", email: "a@a.test", whatsapp: "+905446731942", siteUrl: "https://a.test", password: null }, NOW);
    await activateClient(store, { clientId: client.id, plan: "starter", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const app = completeApp(client.id);
    await store.createApp(app);
    for (let i = 0; i < 3; i++) {
      const b = await store.createBuild({ ...build({ appId: app.id, clientId: client.id, createdAt: days(i) }), id: `0f8e5a52-6c1b-4c39-9d7e-5b0c0e9a1a2${i}` });
      await store.updateBuild(b.id, { status: "ready" }, days(i));
    }
    expect((await store.listBuilds({ status: "ready", limit: 2, newestFirst: true })).map((b) => b.number)).toEqual([3, 2]);
    expect((await store.listBuilds({ status: "ready", limit: 2 })).map((b) => b.number)).toEqual([1, 2]);
  });
});

describe("download buttons", () => {
  afterEach(() => {
    delete process.env.FILES_SIGNING_SECRET;
    delete process.env.FILES_BASE_URL;
    vi.unstubAllEnvs();
  });

  it("redirect to a link signed at the moment of the click", () => {
    process.env.FILES_SIGNING_SECRET = "files-signing-secret-0123456789abcdef";
    const ready = build({ status: "ready", artifacts: [{ kind: "aab", url: "https://files.yallapp.com.tr/builds/x/app-release.aab" }] });
    const response = buildFileRedirect(ready, "aab", "/dashboard/builds", NOW);
    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const location = new URL(response.headers.get("location")!);
    const expires = Number(location.searchParams.get("expires"));
    expect(expires).toBe(Math.floor(NOW.getTime() / 1000) + 15 * 60);
    expect(location.searchParams.get("sig")).toBe(
      createHmac("sha256", "files-signing-secret-0123456789abcdef").update(`/builds/x/app-release.aab?expires=${expires}`).digest("hex"),
    );
  });

  it("go back to the page when the file isn't there or links can't be signed", () => {
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    const ready = build({ status: "ready", artifacts: [{ kind: "apk", url: "https://files.yallapp.com.tr/builds/x/app.apk" }] });
    // No FILES_SIGNING_SECRET.
    expect(buildFileRedirect(ready, "apk", "/dashboard/builds", NOW).headers.get("location")).toBe("https://yallapp.com.tr/dashboard/builds?download=unavailable");
    process.env.FILES_SIGNING_SECRET = "files-signing-secret-0123456789abcdef";
    expect(buildFileRedirect(ready, "ipa", "/dashboard/builds", NOW).headers.get("location")).toBe("https://yallapp.com.tr/dashboard/builds?download=unavailable");
    expect(buildFileRedirect(ready, "../secret", "/admin/builds?status=all", NOW).headers.get("location")).toBe(
      "https://yallapp.com.tr/admin/builds?status=all&download=unavailable",
    );
    expect(buildFileRedirect(null, "apk", "/dashboard/builds", NOW).headers.get("location")).toMatch(/download=unavailable$/);
  });

  it("know the file kinds", () => {
    expect(isArtifactKind("keystore")).toBe(true);
    expect(isArtifactKind("exe")).toBe(false);
    expect(dashboardFileHref("b1", "apk")).toBe("/api/dashboard/builds/b1/files/apk");
  });
});

describe("build emails", () => {
  it("email the client with the app and the reason, and the team when it failed", async () => {
    const dir = path.join(tmpdir(), `yallapp-build-mail-${Date.now()}`);
    process.env.YALLAPP_MAIL_DIR = dir;
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    vi.stubEnv("SUPER_ADMIN_EMAILS", "team@yallapp.test");
    try {
      const store = await getStore();
      const { client } = await registerClient(
        store,
        { name: "Grace", email: `grace-${Date.now()}@academy.test`, whatsapp: "+905446731942", siteUrl: "https://g.test", password: null },
        NOW,
      );
      const app = completeApp(client.id);
      await store.createApp(app);
      const failed = build({ clientId: client.id, appId: app.id, status: "failed", message: "The Android app couldn't be built.", logUrl: "https://github.com/x/y/actions/runs/9" });
      await notifyBuildFinished(store, failed);
      const mails = await Promise.all((await readdir(dir)).map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as Record<string, string>));
      const toClient = mails.find((m) => m.to !== "team@yallapp.test")!;
      expect(toClient.subject).toBe("Ada Academy: build #3 didn't finish");
      expect(toClient.text).toContain("The Android app couldn't be built.");
      expect(toClient.text).toContain(`https://yallapp.com.tr/dashboard/open/${app.id}?to=builds`);
      // The private build log only goes to the team.
      expect(toClient.text).not.toContain("github.com");
      const toTeam = mails.find((m) => m.to === "team@yallapp.test")!;
      expect(toTeam.subject).toBe("Build problem: Ada Academy #3");
      expect(toTeam.text).toContain("Build log: https://github.com/x/y/actions/runs/9");

      // Marked by the team itself: only the client hears about it.
      await rm(dir, { recursive: true, force: true });
      await notifyBuildFinished(store, failed, { team: false });
      expect((await readdir(dir)).length).toBe(1);
    } finally {
      delete process.env.YALLAPP_MAIL_DIR;
      vi.unstubAllEnvs();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
