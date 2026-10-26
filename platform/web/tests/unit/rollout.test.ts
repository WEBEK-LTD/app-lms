import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildReleaseOf, newApp } from "@/lib/app/setup";
import { keyContext } from "@/lib/builds/signing";
import { buildSummary } from "@/lib/builds/pipeline";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Build, BuildStages } from "@/lib/data/types";
import { changeRollout, nextFraction, RolloutError, rolloutAfterReport } from "@/lib/publishing/rollout";
import { NOW } from "./helpers";

const KEY = Buffer.alloc(32, 9);
const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const stages = (extra: Partial<BuildStages>): BuildStages => ({ queued: "done", android: "done", ios: "done", upload_play: "skipped", upload_testflight: "skipped", ...extra });

interface Call {
  url: string;
  method: string;
  body: string | null;
}

/** Google's and Apple's APIs, answering as they do, recording the calls. */
function stores() {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET", body: typeof init.body === "string" ? init.body : null });
    const u = String(url);
    if (u === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "ya29.token" });
    if (u.endsWith("/edits") && init.method === "POST") return Response.json({ id: "edit-1" });
    if (u.includes("/edits/edit-1")) return Response.json({});
    if (u.includes("/apps?filter")) return Response.json({ data: [{ id: "6450000001" }] });
    if (u.includes("/appStoreVersions?")) return Response.json({ data: [{ id: "v2", attributes: { createdDate: "2026-10-20T00:00:00Z" } }] });
    if (u.endsWith("/appStoreVersionPhasedRelease")) return Response.json({ data: { id: "phase-1" } });
    if (u.includes("/appStoreVersionPhasedReleases/phase-1")) return Response.json({ data: { id: "phase-1" } });
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

function appWithKeys(): App {
  const base = newApp("c1", null, NOW);
  return {
    ...base,
    androidPackage: "com.ada.app",
    iosBundleId: "com.ada.app",
    googlePlayKeyEncrypted: encrypt(JSON.stringify({ client_email: "release@ada.iam.gserviceaccount.com", private_key: rsa }), KEY, keyContext.googlePlay(base.id)),
    ascKeyId: "2X9R4HXF34",
    ascIssuerId: "57246542-96fe-1a63-e053-0824d011072a",
    ascPrivateKeyEncrypted: encrypt(ec, KEY, keyContext.appStore(base.id)),
  };
}

describe("89.2 staged releases", () => {
  it("moves through the shares 1, 2, 5, 10, 20, 50 and 100 percent", () => {
    expect(nextFraction(0.01)).toBe(0.02);
    expect(nextFraction(0.1)).toBe(0.2);
    expect(nextFraction(0.5)).toBe(1);
    expect(nextFraction(1)).toBe(1);
  });

  it("gives each build the owner's choice, and tells the pipeline", () => {
    expect(buildReleaseOf({ stagedRelease: null })).toBeNull();
    expect(buildReleaseOf({ stagedRelease: { androidPercent: null, iosPhased: false } })).toBeNull();
    expect(buildReleaseOf({ stagedRelease: { androidPercent: 10, iosPhased: true } })).toEqual({ androidRollout: 0.1, iosPhased: true });
    const build = { id: "b1", clientId: "c1", appId: "a1", number: 3, versionName: "1.3.0", versionCode: 3, status: "queued", autoPublish: true, stages: stages({}), artifacts: [], message: null, logUrl: null, release: { androidRollout: 0.05, iosPhased: false }, createdAt: NOW, startedAt: null, finishedAt: null } as unknown as Build;
    expect(buildSummary(build)).toMatchObject({ release: { android_rollout: 0.05, ios_phased: false } });
    expect(buildSummary({ ...build, release: null })).not.toHaveProperty("release");
  });

  it("starts the release on the app once the store upload is done", () => {
    const build = { release: { androidRollout: 0.1, iosPhased: true }, versionName: "1.3.0", versionCode: 3 };
    expect(rolloutAfterReport(null, build, stages({ upload_play: "running" }), NOW)).toBeNull();
    expect(rolloutAfterReport(null, build, stages({ upload_play: "done", upload_testflight: "done" }), NOW)).toEqual({
      android: { versionName: "1.3.0", versionCode: 3, fraction: 0.1, status: "inProgress", at: NOW.toISOString() },
      ios: { versionName: "1.3.0", state: "waiting", at: NOW.toISOString() },
    });
    // Reported twice: nothing new.
    const started = rolloutAfterReport(null, build, stages({ upload_play: "done" }), NOW);
    expect(rolloutAfterReport(started, build, stages({ upload_play: "done" }), NOW)).toBeNull();
    expect(rolloutAfterReport(null, { ...build, release: null }, stages({ upload_play: "done" }), NOW)).toBeNull();
  });

  it("continues, stops and completes a Google Play release through the Android Publisher API", async () => {
    const store = new MemoryStore();
    const app = { ...appWithKeys(), rollout: { android: { versionName: "1.3.0", versionCode: 3, fraction: 0.1, status: "inProgress" as const, at: NOW.toISOString() } } };
    await store.createApp(app);
    const google = stores();
    const next = await changeRollout({ store, key: KEY, now: NOW, fetcher: google.fetcher }, app, "android", "continue");
    expect(next.android).toMatchObject({ fraction: 0.2, status: "inProgress" });
    expect(google.calls.map((c) => `${c.method} ${c.url.replace("https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.ada.app", "")}`)).toEqual([
      "POST https://oauth2.googleapis.com/token",
      "POST /edits",
      "PUT /edits/edit-1/tracks/production",
      "POST /edits/edit-1:commit",
    ]);
    expect(JSON.parse(google.calls[2]!.body!)).toEqual({ track: "production", releases: [{ versionCodes: ["3"], status: "inProgress", userFraction: 0.2 }] });
    expect(new URLSearchParams(google.calls[0]!.body!).get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect((await store.getAppById(app.id))!.rollout!.android).toMatchObject({ fraction: 0.2 });

    const stopped = await changeRollout({ store, key: KEY, now: NOW, fetcher: stores().fetcher }, { ...app, rollout: next }, "android", "stop");
    expect(stopped.android).toMatchObject({ status: "halted", fraction: 0.2 });
    const all = stores();
    const done = await changeRollout({ store, key: KEY, now: NOW, fetcher: all.fetcher }, { ...app, rollout: stopped }, "android", "complete");
    expect(done.android).toMatchObject({ status: "completed", fraction: 1 });
    expect(JSON.parse(all.calls[2]!.body!).releases[0]).toEqual({ versionCodes: ["3"], status: "completed" });
    await expect(changeRollout({ store, key: KEY, now: NOW, fetcher: stores().fetcher }, { ...app, rollout: done }, "android", "continue")).rejects.toThrow(RolloutError);
  });

  it("pauses, resumes and completes Apple's phased release through App Store Connect", async () => {
    const store = new MemoryStore();
    const app = { ...appWithKeys(), rollout: { ios: { versionName: "1.3.0", state: "ACTIVE" as const, at: NOW.toISOString() } } };
    await store.createApp(app);
    const apple = stores();
    const paused = await changeRollout({ store, key: KEY, now: NOW, fetcher: apple.fetcher }, app, "ios", "stop");
    expect(paused.ios).toMatchObject({ state: "PAUSED" });
    const patch = apple.calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toBe("https://api.appstoreconnect.apple.com/v1/appStoreVersionPhasedReleases/phase-1");
    expect(JSON.parse(patch.body!)).toEqual({ data: { type: "appStoreVersionPhasedReleases", id: "phase-1", attributes: { phasedReleaseState: "PAUSED" } } });
    expect((await changeRollout({ store, key: KEY, now: NOW, fetcher: stores().fetcher }, { ...app, rollout: paused }, "ios", "resume")).ios).toMatchObject({ state: "ACTIVE" });
    expect((await changeRollout({ store, key: KEY, now: NOW, fetcher: stores().fetcher }, { ...app, rollout: paused }, "ios", "complete")).ios).toMatchObject({ state: "COMPLETE" });
  });

  it("says plainly when a store refuses or a key is missing", async () => {
    const store = new MemoryStore();
    const refused = (async () => new Response("{}", { status: 403 })) as unknown as typeof fetch;
    const app = { ...appWithKeys(), rollout: { android: { versionName: "1.3.0", versionCode: 3, fraction: 0.1, status: "inProgress" as const, at: NOW.toISOString() } } };
    await expect(changeRollout({ store, key: KEY, now: NOW, fetcher: refused }, app, "android", "continue")).rejects.toMatchObject({ code: "google_key" });
    await expect(changeRollout({ store, key: KEY, now: NOW, fetcher: refused }, { ...app, googlePlayKeyEncrypted: null }, "android", "continue")).rejects.toMatchObject({ code: "no_key" });
    await expect(changeRollout({ store, key: KEY, now: NOW, fetcher: refused }, { ...app, rollout: null }, "ios", "stop")).rejects.toMatchObject({ code: "nothing" });
  });
});
