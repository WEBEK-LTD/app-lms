import { randomUUID } from "node:crypto";
import { createLocalJWKSet, decodeJwt, jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { copiedAppRow } from "@/lib/apps/copy";
import { purgeAppFiles } from "@/lib/apps/deletion";
import { MemoryStore } from "@/lib/data/memory";
import type { App, FirebaseProject } from "@/lib/data/types";
import { checkYallappFirebase } from "@/lib/firebase/check";
import { mergeGoogleServices, sameFile } from "@/lib/firebase/files";
import { firebaseSlotsFor, usesYallappFirebase, wantedFirebaseApps, yallappFirebaseFits } from "@/lib/firebase/mode";
import { chooseProject, DEFAULT_MAX_APPS, POOL_LOW_ROOM, poolLow, poolOf, poolRoom } from "@/lib/firebase/pool";
import { alertKeyOf, keepPoolStocked, nextProjectId, poolRoles, retryDelayMs, type ProjectDeps } from "@/lib/firebase/projects";
import { firebaseDisplayName, firebaseSetUp, removeAppFirebase, RETRY_FAILED_MS, runFirebaseRegistrations, syncAppFirebase, type FirebaseDeps } from "@/lib/firebase/register";
import { cloudProjects, keyUidOf, projectNumberOf, withRoles } from "@/lib/google/cloud-projects";
import { endpointsAt } from "@/lib/google/endpoints";
import { forgetFederatedTokens, type Federation } from "@/lib/google/federation";
import { appRecordOf, firebaseManagement } from "@/lib/google/firebase-management";
import { ensurePlatformKey, platformJwks, signPlatformJwt } from "@/lib/google/platform-keys";
import { checkGoogleServiceInfoPlist, checkGoogleServicesJson } from "@/lib/store-files";
import { FakeGoogle } from "./fake-google";
import { KEY, NOW } from "./helpers";

/**
 * 136 Yallapp's Firebase: the Firebase Management and Cloud project clients
 * against a fake Google, the pool's room, registering a client's apps (with
 * the bundle's second apps), saving their files only when they change,
 * registering again when a package name changes, the frequent job's
 * retries, removal when the app is purged, a copy's fresh start, and the
 * pool's next project made by the platform step by step.
 */

const PROVIDER = "projects/123456789012/locations/global/workloadIdentityPools/yallapp-platform/providers/platform";
const PUSH = "yallapp-push-sender@yallapp-firebase.iam.gserviceaccount.com";
const APPS = "yallapp-firebase-apps@yallapp-firebase.iam.gserviceaccount.com";
const PARENT = "organizations/555000111222";
const endpoints = endpointsAt("https://google.test");

function project(projectId: string, patch: Partial<FirebaseProject> = {}): FirebaseProject {
  return { projectId, projectNumber: "100200300400", apiKeyId: `key-${projectId}`, maxApps: DEFAULT_MAX_APPS, status: "open", createdBy: "team", creation: null, checkedAt: null, checkProblem: null, createdAt: NOW, updatedAt: NOW, ...patch };
}

async function world(options: { polls?: number } = {}) {
  forgetFederatedTokens();
  const store = new MemoryStore();
  const google = new FakeGoogle({
    provider: PROVIDER,
    accounts: { "push-sender": PUSH, "firebase-apps": APPS },
    pollsUntilDone: options.polls ?? 0,
    creatableParents: [PARENT],
    // The signature with the issuer's keys, at the time the assertion says it was made.
    verify: async (jwt) => (await jwtVerify(jwt, createLocalJWKSet(platformJwks(await store.listPlatformSigningKeys("gcp-wif"), new Date())), { currentDate: new Date(((decodeJwt(jwt).iat ?? 0) + 1) * 1000) })).payload,
  });
  const federation: Federation = { provider: PROVIDER, issuer: "https://yallapp.com.tr/oidc", endpoints, sign: async (claims) => signPlatformJwt(await ensurePlatformKey(store, "gcp-wif", KEY, new Date()), KEY, claims) };
  const { federatedAccessToken, CLOUD_PLATFORM_SCOPE } = await import("@/lib/google/federation");
  const token = () => federatedAccessToken(federation, { serviceAccount: APPS, subject: "firebase-apps", scopes: [CLOUD_PLATFORM_SCOPE], fetcher: google.fetch });
  const management = firebaseManagement({ token, endpoints, fetcher: google.fetch });
  const cloud = cloudProjects({ token, endpoints, fetcher: google.fetch });
  const files = new Map<string, Buffer>();
  const saved: string[] = [];
  let clock = NOW;
  const deps: FirebaseDeps = {
    store,
    now: () => clock,
    management,
    saveFile: async (clientId, kind, data) => {
      const id = randomUUID();
      files.set(id, data);
      saved.push(kind);
      await store.createAsset({ id, clientId, kind, blobKey: `assets/${clientId}/${id}`, contentType: "application/json", size: data.length, createdAt: clock });
      return id;
    },
    readAsset: async (id) => files.get(id) ?? null,
    wait: async () => undefined,
  };
  const projects: ProjectDeps = { store, now: () => clock, cloud, management, accounts: { parent: PARENT, pushAccount: PUSH, appsAccount: APPS }, wait: async () => undefined };
  const user = await store.createUser({ email: `owner-${randomUUID()}@yallapp.test`, name: "Owner", passwordHash: null, now: NOW });
  const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
  return { store, google, federation, management, cloud, deps, projects, files, saved, client, tick: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
}

async function hostedApp(w: Awaited<ReturnType<typeof world>>, patch: Partial<App> = {}): Promise<App> {
  const app: App = { ...newApp(w.client.id, null, NOW, "delivery"), backend: "hosted", connector: { kind: "catalog" } as App["connector"], pushSetup: "yallapp", appName: "Kargo", androidPackage: "com.kargo.app", iosBundleId: "com.kargo.ios", ...patch };
  await w.store.createApp(app);
  return app;
}

describe("136 the Firebase Management and Cloud project clients", () => {
  it("adds an app, reads its operation, finds it by package across pages, reads its file and removes it", async () => {
    const w = await world({ polls: 1 });
    w.google.addProject("yallapp-push-01", "100200300400");
    const op = await w.management.createApp("yallapp-push-01", "android", { identifier: "com.a.app", displayName: "A", apiKeyId: "key-yallapp-push-01" });
    expect(op.done).toBe(false);
    expect(w.google.calls.at(-1)).toMatchObject({ method: "POST", path: "/firebase/v1beta1/projects/yallapp-push-01/androidApps", authorization: `Bearer ya29.${APPS}`, body: { packageName: "com.a.app", displayName: "A", apiKeyId: "key-yallapp-push-01" } });
    const done = await w.management.getOperation(op.name);
    expect(done.done).toBe(true);
    const record = appRecordOf("android", done.response)!;
    expect(record.identifier).toBe("com.a.app");
    for (const pkg of ["com.b.app", "com.c.app", "com.d.app"]) await w.management.createApp("yallapp-push-01", "android", { identifier: pkg, displayName: pkg, apiKeyId: "key-yallapp-push-01" });
    // Two a page in the fake: the fourth is on the second page.
    expect((await w.management.findApp("yallapp-push-01", "android", "com.d.app"))?.identifier).toBe("com.d.app");
    expect(await w.management.findApp("yallapp-push-01", "android", "com.zz.app")).toBeNull();
    const config = await w.management.getConfig("yallapp-push-01", "android", record.appId);
    expect(config.filename).toBe("google-services.json");
    expect(checkGoogleServicesJson(config.contents, "com.a.app")).toBeNull();
    await w.management.removeApp("yallapp-push-01", "android", record.appId);
    expect(w.google.calls.at(-1)).toMatchObject({ path: `/firebase/v1beta1/projects/yallapp-push-01/androidApps/${record.appId}:remove`, body: { allowMissing: true, immediate: true } });
    expect(await w.management.findApp("yallapp-push-01", "android", "com.a.app")).toBeNull();
    // iOS: the bundle ID and the team.
    await w.management.createApp("yallapp-push-01", "ios", { identifier: "com.a.ios", displayName: "A", apiKeyId: "key-yallapp-push-01", teamId: "ABCDE12345" });
    expect(w.google.calls.at(-1)!.body).toEqual({ bundleId: "com.a.ios", displayName: "A", apiKeyId: "key-yallapp-push-01", teamId: "ABCDE12345" });
  });

  it("creates a project, turns on its APIs, makes the push-only key and gives the roles", async () => {
    const w = await world();
    const op = await w.cloud.createProject({ projectId: "yallapp-push-02", displayName: "Yallapp Push 02", parent: PARENT });
    const number = projectNumberOf(op.response)!;
    expect(number).toMatch(/^\d+$/);
    await w.cloud.enableServices(number, ["fcm.googleapis.com"]);
    const key = await w.cloud.createPushKey(number, "Yallapp apps (push only)");
    expect(keyUidOf(key.response)).toMatch(/^0000-yallapp-push-02-/);
    expect(w.google.calls.at(-1)!.body).toEqual({ displayName: "Yallapp apps (push only)", restrictions: { apiTargets: [{ service: "firebaseinstallations.googleapis.com" }, { service: "fcmregistrations.googleapis.com" }] } });
    const policy = await w.cloud.getIamPolicy("yallapp-push-02");
    const next = withRoles(policy, poolRoles({ pushAccount: PUSH, appsAccount: APPS }));
    expect(next.changed).toBe(true);
    expect(withRoles(next.policy, poolRoles({ pushAccount: PUSH, appsAccount: APPS })).changed).toBe(false);
    await w.cloud.setIamPolicy("yallapp-push-02", next.policy);
    expect(w.google.projects.get("yallapp-push-02")!.policy.bindings).toEqual(
      expect.arrayContaining([
        { role: "roles/owner", members: [`serviceAccount:${APPS}`] },
        { role: "roles/firebasecloudmessaging.admin", members: [`serviceAccount:${PUSH}`] },
        { role: "roles/firebase.admin", members: [`serviceAccount:${APPS}`] },
      ]),
    );
    expect(await w.cloud.testPermissions(PARENT, ["resourcemanager.projects.create"])).toEqual(["resourcemanager.projects.create"]);
    expect(await w.cloud.testPermissions("folders/9", ["resourcemanager.projects.create"])).toEqual([]);
    await expect(w.cloud.createProject({ projectId: "x-project-3", displayName: "X", parent: "folders/9" })).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });
});

describe("136 the pool and the apps of a bundle", () => {
  it("chooses the first open project with room for the app's possible apps, and says when it runs low", () => {
    const projects = [project("p-full-1", { maxApps: 6 }), project("p-closed-2", { status: "closed" }), project("p-open-3")];
    const pool = poolOf(projects, { "p-full-1": 2, "p-open-3": 26 });
    expect(pool.map((p) => p.room)).toEqual([4, 0, 2]);
    expect(chooseProject(pool, 2)?.projectId).toBe("p-full-1");
    expect(chooseProject(pool, 6)).toBeNull();
    expect(poolRoom(pool)).toBe(6);
    expect(poolLow(pool)).toBe(true);
    expect(poolLow(poolOf([project("p-big-4")], {}))).toBe(28 < POOL_LOW_ROOM);
    // A project still being made (no key yet) takes no app.
    expect(chooseProject(poolOf([project("p-new-5", { apiKeyId: "" })], {}), 2)).toBeNull();
  });

  it("counts the places an app may take and lists the apps it has now", () => {
    expect(firebaseSlotsFor({ appType: "lms", vertical: null })).toBe(2);
    expect(firebaseSlotsFor({ appType: "delivery", vertical: null })).toBe(4);
    expect(firebaseSlotsFor({ appType: "food", vertical: null })).toBe(6);
    expect(firebaseSlotsFor({ appType: "school", vertical: null })).toBe(4);
    const rides = { ...newApp("c", null, NOW, "rides"), androidPackage: "com.r.app", iosBundleId: "com.r.ios" };
    expect(wantedFirebaseApps(rides, { courierApp: "same", marketApp: null } as never)).toEqual([
      { variant: "customer", platform: "android", identifier: "com.r.app" },
      { variant: "customer", platform: "ios", identifier: "com.r.ios" },
      { variant: "driver", platform: "android", identifier: "com.r.app.driver" },
      { variant: "driver", platform: "ios", identifier: "com.r.ios.driver" },
    ]);
    const school = { ...newApp("c", null, NOW, "school"), androidPackage: "com.s.app", iosBundleId: null, staffApp: "bundle" as const };
    expect(wantedFirebaseApps(school, null)).toEqual([
      { variant: "customer", platform: "android", identifier: "com.s.app" },
      { variant: "staff", platform: "android", identifier: "com.s.app.staff" },
    ]);
    // Only on the hosted API in Phase 1: WordPress sites send their own pushes until the relay.
    expect(yallappFirebaseFits({ backend: "wordpress" })).toBe(false);
    expect(usesYallappFirebase({ backend: "hosted", pushSetup: "yallapp" })).toBe(true);
    expect(usesYallappFirebase({ backend: "hosted", pushSetup: null })).toBe(false);
    expect(usesYallappFirebase({ backend: "custom_api", pushSetup: "yallapp" })).toBe(false);
  });

  it("keeps only the client's packages in google-services.json, and compares files as text", () => {
    const file = (pkgs: string[]) => JSON.stringify({ project_info: { project_id: "p", project_number: "1" }, client: pkgs.map((p) => ({ client_info: { mobilesdk_app_id: `1:1:android:${p}`, android_client_info: { package_name: p } }, api_key: [{ current_key: "k" }] })), configuration_version: "1" });
    const merged = mergeGoogleServices([file(["com.a.app", "com.other.app"]), file(["com.a.app.courier", "com.a.app"])], ["com.a.app", "com.a.app.courier"])!;
    expect((JSON.parse(merged) as { client: { client_info: { android_client_info: { package_name: string } } }[] }).client.map((c) => c.client_info.android_client_info.package_name)).toEqual(["com.a.app", "com.a.app.courier"]);
    expect(merged).not.toContain("com.other.app");
    expect(mergeGoogleServices(["not json"], ["com.a.app"])).toBeNull();
    expect(sameFile("a\r\nb\n", "a\nb")).toBe(true);
    expect(sameFile(null, "a")).toBe(false);
  });

  it("names the next project after the pool's last", () => {
    expect(nextProjectId([])).toBe("yallapp-push-01");
    expect(nextProjectId([{ projectId: "yallapp-push-01" }, { projectId: "yallapp-push-07" }, { projectId: "other-1" }])).toBe("yallapp-push-08");
    expect(nextProjectId([{ projectId: "yallapp-push-01" }], new Set(["yallapp-push-02"]))).toBe("yallapp-push-03");
    expect([1, 2, 3, 10].map(retryDelayMs)).toEqual([15 * 60_000, 30 * 60_000, 60 * 60_000, 6 * 3600_000]);
  });
});

describe("136 registering a client's apps", () => {
  it("registers the customers' and couriers' apps, and saves one google-services.json and both plists", async () => {
    const w = await world();
    w.google.addProject("yallapp-push-01", "100200300400");
    // Another client in the same project: its package must never reach this client's file.
    await w.management.createApp("yallapp-push-01", "android", { identifier: "com.someone.else", displayName: "Else", apiKeyId: "key-yallapp-push-01" });
    await w.store.saveFirebaseProject(project("yallapp-push-01"));
    const app = await hostedApp(w);
    const result = await syncAppFirebase(w.deps, app);
    expect(result).toEqual({ state: "ready", changed: true, problem: null });
    const saved = (await w.store.getAppById(app.id))!;
    expect(saved.firebaseProjectId).toBe("yallapp-push-01");
    const rows = await w.store.listAppFirebaseApps(app.id);
    expect(rows.map((r) => [r.variant, r.platform, r.identifier, r.status])).toEqual([
      ["customer", "android", "com.kargo.app", "ready"],
      ["customer", "ios", "com.kargo.ios", "ready"],
      ["courier", "android", "com.kargo.app.courier", "ready"],
      ["courier", "ios", "com.kargo.ios.courier", "ready"],
    ]);
    const android = w.files.get(saved.firebaseAndroidAssetId!)!.toString("utf8");
    expect(checkGoogleServicesJson(android, "com.kargo.app")).toBeNull();
    expect(checkGoogleServicesJson(android, "com.kargo.app.courier")).toBeNull();
    expect(android).not.toContain("com.someone.else");
    expect(checkGoogleServiceInfoPlist(w.files.get(saved.firebaseIosAssetId!)!.toString("utf8"), "com.kargo.ios")).toBeNull();
    const courier = (await w.store.getDeliverySettings(app.id))!.courierFirebaseIosAssetId!;
    expect(checkGoogleServiceInfoPlist(w.files.get(courier)!.toString("utf8"), "com.kargo.ios.courier")).toBeNull();
    // The console's name says whose it is.
    expect(w.google.projects.get("yallapp-push-01")!.android.find((a) => a.identifier === "com.kargo.app.courier")!.displayName).toBe(firebaseDisplayName(app, "courier"));
    expect(await firebaseSetUp(w.store, saved)).toBe(true);

    // Run again: nothing new is added or saved, and a set-up app costs no call to Google from the frequent job.
    const calls = w.google.calls.length;
    expect(await syncAppFirebase(w.deps, saved)).toEqual({ state: "ready", changed: false, problem: null });
    expect(w.saved).toHaveLength(3);
    const before = w.google.calls.length;
    expect(await runFirebaseRegistrations(w.deps)).toEqual({ apps: 0, ready: 0, failed: 0 });
    expect(w.google.calls.length).toBe(before);
    expect(calls).toBeGreaterThan(0);
  });

  it("waits for Firebase's operation, and the frequent job finishes it", async () => {
    const w = await world({ polls: 5 });
    w.google.addProject("yallapp-push-01", "100200300400");
    await w.store.saveFirebaseProject(project("yallapp-push-01"));
    const app = await hostedApp(w, { appType: "lms", iosBundleId: null });
    // No time to wait: the operation is kept on the row.
    expect((await syncAppFirebase({ ...w.deps, budgetMs: 0 }, app)).state).toBe("pending");
    const [row] = await w.store.listAppFirebaseApps(app.id);
    expect(row).toMatchObject({ status: "pending", operation: expect.stringMatching(/^operations\//), firebaseAppId: null });
    expect((await w.store.getAppById(app.id))!.firebaseAndroidAssetId).toBeNull();
    // The frequent job reads it until it's done, then saves the file.
    let report = await runFirebaseRegistrations(w.deps);
    for (let i = 0; i < 5 && report.ready === 0; i++) report = await runFirebaseRegistrations(w.deps);
    expect(report.ready).toBe(1);
    expect((await w.store.listAppFirebaseApps(app.id))[0]).toMatchObject({ status: "ready", operation: null });
    expect((await w.store.getAppById(app.id))!.firebaseAndroidAssetId).not.toBeNull();
    // Only one Firebase app was made for the package.
    expect(w.google.projects.get("yallapp-push-01")!.android.filter((a) => a.identifier === "com.kargo.app")).toHaveLength(1);
  });

  it("keeps Google's reason when it fails, tries again after 15 minutes from the frequent job, at once when the owner saves", async () => {
    const w = await world();
    w.google.addProject("yallapp-push-01", "100200300400");
    await w.store.saveFirebaseProject(project("yallapp-push-01"));
    const app = await hostedApp(w, { appType: "lms", iosBundleId: null });
    w.google.failures.push({ match: /^POST \/firebase\/v1beta1\/projects\/yallapp-push-01\/androidApps$/, status: 429, code: "RESOURCE_EXHAUSTED", message: "Quota exceeded", times: 2 });
    expect(await syncAppFirebase(w.deps, app)).toMatchObject({ state: "failed", problem: "RESOURCE_EXHAUSTED: Quota exceeded (HTTP 429)" });
    expect((await w.store.listAppFirebaseApps(app.id))[0]).toMatchObject({ status: "failed", error: "RESOURCE_EXHAUSTED: Quota exceeded (HTTP 429)" });
    // The frequent job leaves it for 15 minutes.
    const creates = () => w.google.calls.filter((c) => c.method === "POST" && c.path.endsWith("/androidApps")).length;
    await runFirebaseRegistrations(w.deps);
    expect(creates()).toBe(1);
    w.tick(RETRY_FAILED_MS + 1000);
    expect(await runFirebaseRegistrations(w.deps)).toMatchObject({ apps: 1, failed: 1 });
    expect(creates()).toBe(2);
    // The owner's save tries at once; Google answers now.
    expect((await syncAppFirebase(w.deps, app)).state).toBe("ready");
  });

  it("registers again when the package name changes: the old Firebase app is removed", async () => {
    const w = await world();
    w.google.addProject("yallapp-push-01", "100200300400");
    await w.store.saveFirebaseProject(project("yallapp-push-01"));
    const app = await hostedApp(w, { appType: "lms" });
    await syncAppFirebase(w.deps, app);
    const first = (await w.store.getAppById(app.id))!;
    // As the Store listing step does: the files go with the old names.
    await w.store.updateApp(app.id, { androidPackage: "com.kargo.next", firebaseAndroidAssetId: null }, NOW);
    expect((await syncAppFirebase(w.deps, (await w.store.getAppById(app.id))!)).state).toBe("ready");
    const fake = w.google.projects.get("yallapp-push-01")!;
    expect(fake.android.map((a) => a.identifier)).toEqual(["com.kargo.next"]);
    expect(fake.ios.map((a) => a.identifier)).toEqual(["com.kargo.ios"]);
    const next = (await w.store.getAppById(app.id))!;
    expect(next.firebaseAndroidAssetId).not.toBe(first.firebaseAndroidAssetId);
    expect(checkGoogleServicesJson(w.files.get(next.firebaseAndroidAssetId!)!.toString("utf8"), "com.kargo.next")).toBeNull();
    // The iPhone file didn't change: not saved again.
    expect(next.firebaseIosAssetId).toBe(first.firebaseIosAssetId);
  });

  it("waits for room, marks a project full, and leaves the client's own Firebase alone", async () => {
    const w = await world();
    w.google.addProject("yallapp-push-01", "100200300400");
    const app = await hostedApp(w, { appType: "lms" });
    expect((await syncAppFirebase(w.deps, app)).state).toBe("no_room");
    await w.store.saveFirebaseProject(project("yallapp-push-01", { maxApps: 2 }));
    expect((await syncAppFirebase(w.deps, app)).state).toBe("ready");
    expect((await w.store.getFirebaseProject("yallapp-push-01"))!.status).toBe("full");
    const own = await hostedApp(w, { pushSetup: null, appType: "lms", androidPackage: "com.own.app" });
    expect((await syncAppFirebase(w.deps, own)).state).toBe("off");
    const wordpress = await hostedApp(w, { backend: "wordpress", appType: "lms", androidPackage: "com.wp.app" });
    expect((await syncAppFirebase(w.deps, wordpress)).state).toBe("off");
  });

  it("removes the app's Firebase apps when it's purged, and a copy starts with none", async () => {
    const w = await world();
    w.google.addProject("yallapp-push-01", "100200300400");
    await w.store.saveFirebaseProject(project("yallapp-push-01"));
    const app = await hostedApp(w, { appType: "lms" });
    await syncAppFirebase(w.deps, app);
    const saved = (await w.store.getAppById(app.id))!;
    const copy = copiedAppRow(saved, { id: randomUUID(), clientId: saved.clientId, name: "Copy" }, new Map(), NOW);
    expect(copy).toMatchObject({ pushSetup: "yallapp", firebaseProjectId: null, firebaseAndroidAssetId: null, firebaseIosAssetId: null, androidPackage: null });
    // Google refuses: the purge stops, for the next try.
    w.google.failures.push({ match: /:remove$/, status: 503, code: "UNAVAILABLE", message: "Try later", times: 1 });
    const purge = { store: w.store, now: NOW, media: null, blobs: { delete: async () => undefined }, removeBuildFolder: null, firebase: w.management };
    await expect(purgeAppFiles(purge, saved)).rejects.toThrow("UNAVAILABLE");
    await purgeAppFiles(purge, saved);
    expect(await w.store.listAppFirebaseApps(app.id)).toEqual([]);
    expect(w.google.projects.get("yallapp-push-01")!.android).toEqual([]);
    expect(w.google.projects.get("yallapp-push-01")!.ios).toEqual([]);
    expect(await removeAppFirebase({ store: w.store, management: w.management }, app.id)).toBe(0);
  });
});

describe("136 the pool's next project, made by the platform", () => {
  it("is made step by step when the pool runs low, then takes clients", async () => {
    const w = await world();
    const report = await keepPoolStocked(w.projects);
    expect(report).toMatchObject({ started: "yallapp-push-01", project: "yallapp-push-01", step: "open", problem: null });
    const made = (await w.store.getFirebaseProject("yallapp-push-01"))!;
    expect(made).toMatchObject({ status: "open", createdBy: "platform", creation: null, maxApps: 28 });
    expect(made.projectNumber).toMatch(/^\d+$/);
    const fake = w.google.projects.get("yallapp-push-01")!;
    expect(fake).toMatchObject({ parent: PARENT, firebase: true });
    expect([...fake.services]).toEqual(expect.arrayContaining(["firebase.googleapis.com", "fcm.googleapis.com", "fcmregistrations.googleapis.com", "firebaseinstallations.googleapis.com"]));
    expect(fake.keys.map((k) => k.uid)).toEqual([made.apiKeyId]);
    expect(fake.policy.bindings.find((b) => b.role === "roles/firebasecloudmessaging.admin")?.members).toEqual([`serviceAccount:${PUSH}`]);
    // The pool has room now: nothing new.
    expect(await keepPoolStocked(w.projects)).toMatchObject({ started: null, project: null });
    // And a client's apps go in it.
    const app = await hostedApp(w, { appType: "lms" });
    expect((await syncAppFirebase(w.deps, app)).state).toBe("ready");
    expect((await w.store.getAppById(app.id))!.firebaseProjectId).toBe("yallapp-push-01");
  });

  it("goes on across runs while Google is slow", async () => {
    const w = await world({ polls: 2 });
    w.projects.budgetMs = 0;
    let report = await keepPoolStocked(w.projects);
    expect(report).toMatchObject({ project: "yallapp-push-01", step: "create" });
    for (let i = 0; i < 20 && report.step !== "open"; i++) report = await keepPoolStocked(w.projects);
    expect(report.step).toBe("open");
    expect(w.google.calls.filter((c) => c.method === "POST" && c.path === "/cloudresourcemanager/v3/projects")).toHaveLength(1);
  });

  it("shows Google's exact reason, alerts the team once, and waits longer each time", async () => {
    const w = await world();
    const mail = vi.fn(async () => undefined);
    w.projects.mail = mail;
    w.google.failures.push({ match: /^POST \/cloudresourcemanager\/v3\/projects$/, status: 429, code: "RESOURCE_EXHAUSTED", message: "Project creation quota exceeded." });
    await keepPoolStocked(w.projects);
    let creating = (await w.store.getFirebaseProject("yallapp-push-01"))!;
    expect(creating.creation).toMatchObject({ step: "create", attempts: 1, problem: "RESOURCE_EXHAUSTED: Project creation quota exceeded. (HTTP 429)", nextTryAt: new Date(NOW.getTime() + 15 * 60_000).toISOString() });
    // Not before its time.
    await keepPoolStocked(w.projects);
    expect((await w.store.getFirebaseProject("yallapp-push-01"))!.creation!.attempts).toBe(1);
    w.tick(15 * 60_000 + 1);
    await keepPoolStocked(w.projects);
    creating = (await w.store.getFirebaseProject("yallapp-push-01"))!;
    expect(creating.creation).toMatchObject({ attempts: 2, nextTryAt: new Date(NOW.getTime() + 15 * 60_000 + 1 + 30 * 60_000).toISOString() });
    // One alert, mailed once, counted again.
    const alerts = await w.store.listTeamAlerts({ open: true, limit: 10 });
    expect(alerts.filter((a) => a.key === alertKeyOf("yallapp-push-01"))).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: "firebase", link: "/admin/settings/firebase" });
    expect(alerts[0]!.detail).toContain("Project creation quota exceeded.");
    expect(mail).toHaveBeenCalledTimes(1);
    // Google lets it through: the project is made, the alert closes.
    w.google.failures.length = 0;
    expect(await keepPoolStocked(w.projects, { force: true })).toMatchObject({ step: "open" });
    expect((await w.store.listTeamAlerts({ open: true, limit: 10 })).filter((a) => a.key === alertKeyOf("yallapp-push-01"))).toEqual([]);
  });

  it("from the frequent job: makes the project, registers the apps, and alerts the team only when apps wait and none can be made", async () => {
    const w = await world();
    const app = await hostedApp(w, { appType: "lms" });
    const { runFrequentJobs } = await import("@/lib/jobs/frequent");
    // No organization or folder: nothing can be made, the app waits, the team is told.
    const alone = await runFrequentJobs({ store: w.store, key: KEY, now: NOW, ownerPush: { store: w.store, now: NOW, account: null }, firebase: { registrations: w.deps, projects: null } });
    expect(alone.firebase).toEqual({ registrations: { apps: 1, ready: 0, failed: 0, waiting: 1 }, projects: null });
    expect((await w.store.listTeamAlerts({ open: true, limit: 10 })).map((a) => a.key)).toEqual(["firebase_pool_full"]);
    // With one: the pool's first project is made, then the app goes in it, in the same run.
    const run = await runFrequentJobs({ store: w.store, key: KEY, now: NOW, ownerPush: { store: w.store, now: NOW, account: null }, firebase: { registrations: w.deps, projects: w.projects } });
    expect(run.firebase).toMatchObject({ registrations: { apps: 1, ready: 1 }, projects: { started: "yallapp-push-01", step: "open" } });
    expect((await w.store.getAppById(app.id))!.firebaseProjectId).toBe("yallapp-push-01");
  });

  it("takes the next name when its own is someone else's", async () => {
    const w = await world();
    // Taken by another Google Cloud customer: the apps account can't see it.
    w.google.failures.push({ match: /^POST \/cloudresourcemanager\/v3\/projects$/, status: 409, code: "ALREADY_EXISTS", message: "Requested entity already exists", times: 1 });
    expect(await keepPoolStocked(w.projects)).toMatchObject({ project: "yallapp-push-02", step: "open" });
    expect(await w.store.getFirebaseProject("yallapp-push-01")).toBeNull();
  });
});

describe("136 Admin's Check", () => {
  beforeEach(() => forgetFederatedTokens());
  afterEach(() => forgetFederatedTokens());

  it("signs in as both accounts, reads each project and asks whether projects can be made", async () => {
    const w = await world();
    w.google.addProject("yallapp-push-01", "100200300400");
    await w.store.saveFirebaseProject(project("yallapp-push-01"));
    await w.store.saveFirebaseProject(project("yallapp-push-09", { projectNumber: "1" }));
    const check = await checkYallappFirebase({ store: w.store, now: () => NOW, federation: w.federation, accounts: { pushAccount: PUSH, appsAccount: APPS, parent: PARENT }, management: w.management, cloud: w.cloud, fetcher: w.google.fetch });
    expect(check.lines.map((l) => [l.label, l.ok])).toEqual([
      ["Push sender", true],
      ["Apps account", true],
      ["Project yallapp-push-01", true],
      ["Project yallapp-push-09", false],
      ["Creating projects", true],
    ]);
    expect(check.ok).toBe(false);
    expect((await w.store.getFirebaseProject("yallapp-push-09"))!.checkProblem).toContain("PERMISSION_DENIED");
    expect((await w.store.getFirebaseProject("yallapp-push-01"))!).toMatchObject({ checkedAt: NOW, checkProblem: null });
    // Without a parent, or one the account can't create under.
    const none = await checkYallappFirebase({ store: w.store, now: () => NOW, federation: w.federation, accounts: { pushAccount: PUSH, appsAccount: APPS, parent: "folders/42" }, management: w.management, cloud: w.cloud, fetcher: w.google.fetch });
    expect(none.lines.at(-1)).toMatchObject({ label: "Creating projects", ok: false, detail: expect.stringContaining("Project Creator") });
  });
});
