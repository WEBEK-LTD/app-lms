import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App, AppFirebaseApp, FirebaseProject } from "@/lib/data/types";
import { ensurePlatformKey, platformJwks, RETIRED_PLATFORM_KEY_SECONDS, rotatePlatformKey } from "@/lib/google/platform-keys";
import { KEY } from "./helpers";

/**
 * 136 Yallapp's Firebase on MySQL or MariaDB (migration 0138): the
 * platform's issuer keys, the pool of projects (with a project the platform
 * is making), each app's registered apps keyed by app, variant and platform,
 * the counts per project, and the app's choice.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date(Math.floor(Date.now() / 1000) * 1000);

describe.skipIf(!url)("136 Yallapp's Firebase on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  it("keeps, rotates and publishes the platform's issuer keys", async () => {
    // One set of keys per database: a run before this one left its own.
    await store.retirePlatformSigningKeys("gcp-wif", NOW);
    await store.deletePlatformSigningKeysRetiredBefore("gcp-wif", new Date(NOW.getTime() + 3650 * 86_400_000));
    expect(await store.listPlatformSigningKeys("gcp-wif")).toEqual([]);
    const first = await ensurePlatformKey(store, "gcp-wif", KEY, NOW);
    expect((await ensurePlatformKey(store, "gcp-wif", KEY, NOW)).kid).toBe(first.kid);
    const later = new Date(NOW.getTime() + 60_000);
    const second = await rotatePlatformKey(store, "gcp-wif", KEY, later);
    const keys = await store.listPlatformSigningKeys("gcp-wif");
    expect(keys[0]).toEqual(second);
    expect(keys.find((k) => k.kid === first.kid)).toMatchObject({ privateKeyEncrypted: null, retiredAt: later });
    expect(platformJwks(keys, later).keys.map((k) => k.kid)).toEqual(expect.arrayContaining([first.kid, second.kid]));
    await rotatePlatformKey(store, "gcp-wif", KEY, new Date(later.getTime() + (RETIRED_PLATFORM_KEY_SECONDS + 10) * 1000));
    expect((await store.listPlatformSigningKeys("gcp-wif")).map((k) => k.kid)).not.toContain(first.kid);
  });

  it("keeps the pool, the app's apps in it and the app's choice", async () => {
    const suffix = randomUUID().slice(0, 8);
    const projectId = `yallapp-push-${suffix}`;
    const made: FirebaseProject = {
      projectId,
      projectNumber: "",
      apiKeyId: "",
      maxApps: 28,
      status: "creating",
      createdBy: "platform",
      creation: { step: "services", operation: "operations/acf.1", attempts: 1, problem: "RESOURCE_EXHAUSTED: quota", failedAt: NOW.toISOString(), nextTryAt: null },
      checkedAt: null,
      checkProblem: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    await store.saveFirebaseProject(made);
    expect(await store.getFirebaseProject(projectId)).toEqual(made);
    const open: FirebaseProject = { ...made, projectNumber: "100200300400", apiKeyId: "key-uid-1", status: "open", creation: null, checkedAt: NOW, checkProblem: null };
    await store.saveFirebaseProject(open);
    expect(await store.getFirebaseProject(projectId)).toEqual(open);
    expect((await store.listFirebaseProjects()).map((p) => p.projectId)).toContain(projectId);

    const user = await store.createUser({ email: `firebase-${suffix}@yallapp.test`, name: "Owner", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = { ...newApp(client.id, null, NOW, "delivery"), backend: "hosted", pushSetup: "yallapp", firebaseProjectId: projectId, androidPackage: `com.k${suffix}.app` };
    await store.createApp(app);
    expect(await store.getAppById(app.id)).toMatchObject({ pushSetup: "yallapp", firebaseProjectId: projectId });
    // An app made before: no choice saved, the client's own Firebase.
    const before: App = newApp(client.id, null, NOW, "lms");
    await store.createApp(before);
    expect(await store.getAppById(before.id)).toMatchObject({ pushSetup: null, firebaseProjectId: null });

    const row = (variant: AppFirebaseApp["variant"], platform: AppFirebaseApp["platform"], patch: Partial<AppFirebaseApp> = {}): AppFirebaseApp => ({
      appId: app.id,
      variant,
      platform,
      firebaseProjectId: projectId,
      identifier: `${app.androidPackage}${variant === "customer" ? "" : `.${variant}`}`,
      firebaseAppId: null,
      operation: "operations/fa.1",
      status: "pending",
      error: null,
      apnsConfiguredAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...patch,
    });
    await store.saveAppFirebaseApp(row("courier", "ios"));
    await store.saveAppFirebaseApp(row("customer", "android"));
    await store.saveAppFirebaseApp(row("customer", "ios"));
    // The same app, variant and platform: replaced, never twice.
    await store.saveAppFirebaseApp(row("customer", "android", { firebaseAppId: "1:100200300400:android:abc", operation: null, status: "ready" }));
    const rows = await store.listAppFirebaseApps(app.id);
    expect(rows.map((r) => [r.variant, r.platform, r.status])).toEqual([
      ["customer", "android", "ready"],
      ["customer", "ios", "pending"],
      ["courier", "ios", "pending"],
    ]);
    expect(rows[0]).toEqual(row("customer", "android", { firebaseAppId: "1:100200300400:android:abc", operation: null, status: "ready" }));
    expect((await store.countAppFirebaseAppsByProject())[projectId]).toBe(3);
    await store.deleteAppFirebaseApp(app.id, "courier", "ios");
    expect((await store.countAppFirebaseAppsByProject())[projectId]).toBe(2);
    // A project the platform was making under a taken name goes.
    await store.deleteFirebaseProject(projectId);
    expect(await store.getFirebaseProject(projectId)).toBeNull();
  });
});
