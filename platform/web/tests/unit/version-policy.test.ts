import { describe, expect, it } from "vitest";
import { GET as getVersion } from "@/app/api/v1/apps/[appId]/version/route";
import { analyticsKey } from "@/lib/analytics/ingest";
import { newApp } from "@/lib/app/setup";
import { answerVersionCheck, compareVersions, storeUrlFor, versionPolicy, versionSettingsProblems } from "@/lib/app/version-policy";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import { signingSecret } from "@/lib/env";
import { newPublishingRequest } from "@/lib/publishing/steps";
import { appPaused } from "@/lib/app/version-policy";
import { NOW, setupClient } from "./helpers";

const SECRET = "version-test-secret-0123456789abcdef";

describe("89.1 the versions people may use", () => {
  it("compares versions number by number", () => {
    expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0", "1.99.99")).toBe(1);
    expect(compareVersions("1.4", "1.4.0")).toBe(0);
  });

  it("asks older versions to update, and stops the ones below the minimum", () => {
    const app = { androidPackage: "com.ada.app", minVersion: "1.2.0", recommendedVersion: "1.5.0" };
    expect(versionPolicy(app, null, { platform: "android", version: "1.1.9", store: "google_play" })).toEqual({
      update_required: true,
      update_recommended: false,
      minimum_version: "1.2.0",
      recommended_version: "1.5.0",
      store_url: "https://play.google.com/store/apps/details?id=com.ada.app",
    });
    expect(versionPolicy(app, null, { platform: "android", version: "1.4.0", store: null })).toMatchObject({ update_required: false, update_recommended: true });
    expect(versionPolicy(app, null, { platform: "android", version: "1.5.0", store: null })).toMatchObject({ update_required: false, update_recommended: false });
    expect(versionPolicy({ androidPackage: null }, null, { platform: "ios", version: "0.1.0", store: "app_store" })).toEqual({
      update_required: false,
      update_recommended: false,
      minimum_version: null,
      recommended_version: null,
      store_url: null,
    });
  });

  it("sends people to the store they installed from, the App Store page once it's live", () => {
    const request = newPublishingRequest({ id: "a1", clientId: "c1" }, "managed", NOW);
    const app = { androidPackage: "com.ada.app" };
    expect(storeUrlFor(app, request, "android", "galaxy_store")).toBe("https://galaxystore.samsung.com/detail/com.ada.app");
    expect(storeUrlFor(app, request, "android", "appgallery")).toBe("https://appgallery.huawei.com/app/com.ada.app");
    expect(storeUrlFor(app, request, "ios", "app_store")).toBeNull();
    const live = { ...request, ios: { status: "live" as const, note: null, storeUrl: "https://apps.apple.com/app/id6450000001", updatedAt: NOW } };
    expect(storeUrlFor(app, live, "ios", "testflight")).toBe("https://apps.apple.com/app/id6450000001");
  });

  it("checks what the owner saves", () => {
    expect(versionSettingsProblems({ minVersion: "", recommendedVersion: "" })).toEqual({});
    expect(versionSettingsProblems({ minVersion: "one", recommendedVersion: "1.2.0" })).toEqual({ minVersion: "Write a version like 1.4.0." });
    expect(versionSettingsProblems({ minVersion: "2.0.0", recommendedVersion: "1.9.0" })).toEqual({ recommendedVersion: "The recommended version can't be older than the minimum." });
  });

  it("answers the app with its analytics key, and refuses anything else", async () => {
    const store = new MemoryStore();
    const app = { ...newApp("c1", null, NOW), androidPackage: "com.ada.app", minVersion: "1.2.0" };
    await store.createApp(app);
    const headers = (key: string | null) => new Headers({ "x-forwarded-for": "203.0.113.9", ...(key ? { "x-yallapp-analytics-key": key } : {}) });
    const ask = (query: string, key: string | null = analyticsKey(app.id, SECRET)) =>
      answerVersionCheck(store, { appId: app.id, headers: headers(key), query: new URLSearchParams(query), secret: SECRET, now: NOW });
    expect(await ask("platform=android&version=1.0.0&store=google_play")).toMatchObject({ status: 200, body: { update_required: true } });
    expect(await ask("platform=android&version=1.0.0", "x".repeat(32))).toMatchObject({ status: 403, body: { code: "invalid_key" } });
    expect(await ask("platform=web&version=1.0.0")).toMatchObject({ status: 400 });
    expect(await ask("platform=ios&version=latest")).toMatchObject({ status: 400 });
    expect(await ask("platform=ios&version=1.0.0&store=amazon")).toMatchObject({ status: 400 });
    expect(await answerVersionCheck(store, { appId: "00000000-0000-4000-8000-000000000000", headers: headers(null), query: new URLSearchParams("platform=ios&version=1.0.0"), secret: SECRET, now: NOW })).toMatchObject({ status: 404 });
  });

  it("is served at /api/v1/apps/{app_id}/version", async () => {
    const store = await getStore();
    const app = { ...newApp("c1", null, NOW), recommendedVersion: "3.0.0" };
    await store.createApp(app);
    const response = await getVersion(
      new Request(`https://yallapp.test/api/v1/apps/${app.id}/version?platform=ios&version=2.1.0`, { headers: { "x-yallapp-analytics-key": analyticsKey(app.id, signingSecret()) } }),
      { params: Promise.resolve({ appId: app.id }) } as never,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ update_required: false, update_recommended: true, recommended_version: "3.0.0" });
  });

  it("76.6 pauses a WordPress app whose plan isn't active, with how to reach its owner; never the others", async () => {
    const { store, client } = await setupClient({ activeUntil: new Date(NOW.getTime() + 86_400_000) });
    const app = newApp(client.id, null, NOW);
    await store.createApp(app);
    const wordpress = { ...app, backend: "wordpress" as const, appName: "Ada Academy", supportEmail: "help@ada.test" };
    await store.updateApp(app.id, { backend: "wordpress", appName: "Ada Academy", supportEmail: "help@ada.test" }, NOW);
    expect(await appPaused(store, wordpress, NOW)).toBeNull();
    const later = new Date(NOW.getTime() + 2 * 86_400_000);
    expect(await appPaused(store, wordpress, later)).toEqual({
      code: "license_inactive",
      message: "Ada Academy is paused right now. Please contact Ada Academy to bring it back.",
      contact: { name: "Ada Academy", whatsapp: null, email: "help@ada.test" },
    });
    expect(await appPaused(store, { ...wordpress, backend: "hosted" }, later)).toBeNull();
    await store.updateClient(client.id, { status: "suspended" }, NOW);
    expect(await appPaused(store, wordpress, NOW)).toMatchObject({ code: "account_suspended" });
    // The version check carries it.
    const answer = await answerVersionCheck(store, {
      appId: app.id,
      headers: new Headers({ "x-forwarded-for": "203.0.113.10", "x-yallapp-analytics-key": analyticsKey(app.id, SECRET) }),
      query: new URLSearchParams("platform=android&version=1.0.0"),
      secret: SECRET,
      now: NOW,
    });
    expect(answer).toMatchObject({ status: 200, body: { update_required: false, paused: { code: "account_suspended" } } });
  });
});
