import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newApp, queueBuild } from "@/lib/app/setup";
import { APP_RELEASE_BUILDS_PER_HOUR, appReleaseOf, behindAppRelease, CLIENT_APP_RELEASE, runAppReleaseBuilds } from "@/lib/builds/app-release";
import { buildChanges } from "@/lib/builds/auto";
import { applyPipelineStatus, buildSummary, pipelineStatusSchema } from "@/lib/builds/pipeline";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Build, BuildStages, PublishingAccount } from "@/lib/data/types";
import { dashboardMessages, knownMessages, knownTranslator } from "@/i18n/dashboard";
import { comparisonRows, INCLUDED_FEATURES, PLAN_FEATURE_IDS, PLAN_FEATURES, PLAN_INFO, PLANS, plansWith, STUDIO_BASE_FEATURES, STUDIO_PLAN_CHOICES } from "@/lib/plans";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { MORE_STORES_AUTO_TEXT } from "@/lib/stores";
import { FEATURE_SWITCHES, LICENSE_FEATURE_SWITCHES } from "@/lib/switches";
import { ACCOUNT_STEP_IDS, ACCOUNT_STEP_TEXT, accountStepLines, accountSteps, apnsKeyState } from "@/lib/publishing/account-steps";
import { accountCounts, accountsOf, DEFAULT_ACCOUNT_LIMIT, moveAppAccount, newAccount, noticeEmailsFor, pickAccount, publishingEmailFor, type AccountDeps } from "@/lib/publishing/accounts";
import { APP_REVIEW_TEXT, appleWords, reasonOf, runAppReviewSubmissions } from "@/lib/publishing/app-review-submit";
import { notePlayRelease, notifyPublishingTeam } from "@/lib/publishing/service";
import { days, KEY, licenseOf, NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const hours = (n: number) => new Date(NOW.getTime() + n * 3_600_000);

function completeApp(clientId: string, patch: Partial<App> = {}): App {
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
    ...patch,
  };
}

describe("138.1 publishing in every plan", () => {
  it("is in every plan, regular and Studio, and stays whatever the team saved", () => {
    expect(INCLUDED_FEATURES).toEqual(["auto_publish"]);
    for (const plan of PLANS) expect(PLAN_INFO[plan].features, plan).toContain("auto_publish");
    expect(STUDIO_BASE_FEATURES).toContain("auto_publish");
    expect(STUDIO_PLAN_CHOICES).not.toContain("auto_publish");
    // A plan saved without it (an edit from before, or with every box unticked) still has it.
    const saved = plansWith({
      growth: { ...PLAN_INFO.growth, features: ["ios"], version: 2, knownFeatures: [...PLAN_FEATURE_IDS] },
      studio_1: { ...PLAN_INFO.studio_1, features: ["studio"], version: 2 },
    });
    expect(saved.growth.features).toEqual(["ios", "auto_publish"]);
    expect(saved.studio_1.features).toContain("auto_publish");
    // Not a switch any more, so a saved switch can't take it away.
    expect(FEATURE_SWITCHES.map((f) => f.id)).not.toContain("auto_publish");
    expect(LICENSE_FEATURE_SWITCHES).not.toContain("auto_publish");
  });

  it("says “We publish for you” on every plan of the pricing table, with the other stores' automatic updates, and drops the row that told plans apart", () => {
    const rows = comparisonRows(PLAN_INFO);
    expect(rows.find((r) => r.label === "Publishing")!.values).toEqual({ starter: "We publish for you", growth: "We publish for you", pro: "We publish for you", business: "We publish for you" });
    expect(rows.find((r) => r.label === MORE_STORES_AUTO_TEXT)!.values).toEqual({ starter: true, growth: true, pro: true, business: true });
    expect(rows.find((r) => r.label === "Automatic store updates")).toBeUndefined();
    expect(PLAN_FEATURES.find((f) => f.id === "auto_publish")!.description).toContain("Google Play and the App Store");
  });
});

describe("138.2 Google Play for everyone", () => {
  it("queues every build for production, records where it went, and leaves a draft to the first release by hand", async () => {
    const setup = await setupClient({ plan: "starter", activeUntil: days(60) });
    const store = setup.store;
    const client = (await store.getClientById(setup.client.id))!;
    const app = completeApp(client.id, { googlePlayKeyEncrypted: "v1.x" });
    await store.createApp(app);
    const queued = await queueBuild(store, { client, app, license: await licenseOf(store, client.id), versionName: "1.0.0" }, NOW, assetUrl);
    if (!queued.ok) throw new Error(queued.reason);
    // Starter too: production for everyone, made with the current Yallapp release.
    expect(queued.build.autoPublish).toBe(true);
    expect(queued.build.stages.upload_play).toBe("pending");
    expect(queued.build.release).toMatchObject({ androidRollout: 1, iosPhased: false, appRelease: CLIENT_APP_RELEASE });
    expect(buildSummary(queued.build)).toMatchObject({ auto_publish: true, release: { android_rollout: 1, ios_phased: false } });
    await store.updateBuild(queued.build.id, { status: "building" }, NOW);
    const building = (await store.getBuild(queued.build.id))!;
    // The pipeline says it's a draft: the app's first release isn't out yet.
    expect(pipelineStatusSchema.safeParse({ play: { track: "production", status: "published" } }).success).toBe(false);
    const draft = await applyPipelineStatus(store, building, pipelineStatusSchema.parse({ stages: { upload_play: "done" }, play: { track: "production", status: "draft" } }), NOW);
    expect(draft.ok && draft.build.release?.play).toEqual({ track: "production", status: "draft" });
    expect(draft.ok && buildSummary(draft.build).play).toEqual({ track: "production", status: "draft" });
    // Nothing to follow on Google Play for a draft.
    expect((await store.getAppById(app.id))!.rollout?.android ?? null).toBeNull();

    // The publishing team (and the app's account) is told once; a release that went out clears it.
    const sent: { to: string; values: Record<string, unknown> }[] = [];
    const send = (async (_key: string, to: string, values: Record<string, unknown>) => void sent.push({ to, values })) as never;
    await notePlayRelease(store, draft.ok ? draft.build : building, NOW, send);
    await notePlayRelease(store, draft.ok ? draft.build : building, hours(1), send);
    expect(sent).toHaveLength(1);
    expect(String(sent[0]!.values.event)).toContain("first Google Play release (version 1.0.0) waiting as a draft");
    expect((await store.getAppById(app.id))!.rollout?.playDraftNotifiedAt).toBe(NOW.toISOString());
    await notePlayRelease(store, { appId: app.id, versionName: "1.0.1", release: { androidRollout: 1, iosPhased: false, play: { track: "production", status: "completed" } } }, hours(2), send);
    expect((await store.getAppById(app.id))!.rollout?.playDraftNotifiedAt).toBeNull();
  });
});

/** A fake App Store Connect, with one app, one build and what each call did. */
function fakeAppStore(options: { processing?: string; released?: boolean; itemError?: { status: number; body: unknown }; encryption?: boolean | null } = {}) {
  const calls: string[] = [];
  const state = {
    processing: options.processing ?? "VALID",
    encryption: options.encryption === undefined ? null : options.encryption,
    versions: [
      ...(options.released ? [{ id: "v-old", attributes: { versionString: "1.0.0", appVersionState: "READY_FOR_DISTRIBUTION", releaseType: "AFTER_APPROVAL" } }] : []),
    ] as { id: string; attributes: Record<string, unknown> }[],
    phase: null as { id: string; attributes: Record<string, unknown> } | null,
    whatsNew: {} as Record<string, string>,
    attached: null as string | null,
    review: null as Record<string, unknown> | null,
    submission: null as string | null,
    items: [] as string[],
    submitted: false,
  };
  const json = (status: number, body: unknown) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const path = url.pathname.replace(/^\/v1/, "");
    const body = init?.body ? (JSON.parse(String(init.body)) as { data: { attributes?: Record<string, unknown>; relationships?: Record<string, { data: { id: string } }> } }) : null;
    calls.push(`${method} ${path}`);
    // Every call carries the key's token, never the key itself.
    expect(String((init?.headers as Record<string, string>).authorization)).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    if (path === "/apps") return json(200, { data: url.searchParams.get("filter[bundleId]") === "com.adaacademy.app" ? [{ id: "app-1" }] : [] });
    if (path === "/builds") return json(200, { data: [{ id: "build-1", attributes: { processingState: state.processing, usesNonExemptEncryption: state.encryption } }] });
    if (path === "/builds/build-1" && method === "PATCH") {
      state.encryption = body!.data.attributes!.usesNonExemptEncryption as boolean;
      return json(200, {});
    }
    if (path === "/apps/app-1/appStoreVersions") return json(200, { data: state.versions });
    if (path === "/appStoreVersions" && method === "POST") {
      const made = { id: "v-new", attributes: { ...body!.data.attributes, appVersionState: "PREPARE_FOR_SUBMISSION" } };
      state.versions.push(made);
      return json(201, { data: made });
    }
    const version = /^\/appStoreVersions\/([^/]+)(\/.*)?$/.exec(path);
    if (version && !version[2] && method === "PATCH") {
      const v = state.versions.find((x) => x.id === version[1])!;
      Object.assign(v.attributes, body!.data.attributes);
      return json(200, { data: v });
    }
    if (version?.[2] === "/appStoreVersionPhasedRelease") return json(200, { data: state.phase });
    if (path === "/appStoreVersionPhasedReleases" && method === "POST") {
      state.phase = { id: "phase-1", attributes: body!.data.attributes! };
      return json(201, { data: state.phase });
    }
    if (version?.[2] === "/appStoreVersionLocalizations") return json(200, { data: ["en-US", "ar-SA"].map((locale) => ({ id: `loc-${locale}`, attributes: { locale, whatsNew: state.whatsNew[locale] ?? null } })) });
    const loc = /^\/appStoreVersionLocalizations\/loc-(.+)$/.exec(path);
    if (loc && method === "PATCH") {
      state.whatsNew[loc[1]!] = String(body!.data.attributes!.whatsNew);
      return json(200, {});
    }
    if (version?.[2] === "/appStoreReviewDetail") return state.review ? json(200, { data: { id: "rd-1", attributes: state.review } }) : json(404, { errors: [{ status: "404" }] });
    if (path === "/appStoreReviewDetails" && method === "POST") {
      state.review = body!.data.attributes!;
      return json(201, { data: { id: "rd-1" } });
    }
    if (version?.[2] === "/build") return json(200, { data: state.attached ? { id: state.attached } : null });
    if (version?.[2] === "/relationships/build" && method === "PATCH") {
      state.attached = (body as unknown as { data: { id: string } }).data.id;
      return json(204, null);
    }
    if (path === "/reviewSubmissions" && method === "GET") return json(200, { data: state.submission && !state.submitted ? [{ id: state.submission }] : [] });
    if (path === "/reviewSubmissions" && method === "POST") {
      state.submission = "sub-1";
      return json(201, { data: { id: "sub-1" } });
    }
    if (path === "/reviewSubmissions/sub-1/items") return json(200, { data: state.items.map((id) => ({ id: `item-${id}`, relationships: { appStoreVersion: { data: { id } } } })) });
    if (path === "/reviewSubmissionItems" && method === "POST") {
      if (options.itemError) return json(options.itemError.status, options.itemError.body);
      state.items.push(body!.data.relationships!.appStoreVersion!.data.id);
      return json(201, { data: { id: "item-1" } });
    }
    if (path === "/reviewSubmissions/sub-1" && method === "PATCH") {
      state.submitted = true;
      const v = state.versions.find((x) => x.id === state.items[0])!;
      v.attributes.appVersionState = "WAITING_FOR_REVIEW";
      return json(200, { data: { id: "sub-1" } });
    }
    return json(404, { errors: [{ status: "404", detail: `No route ${method} ${path}` }] });
  }) as typeof fetch;
  return { fetcher, calls, state };
}

const { privateKey: p8 } = generateKeyPairSync("ec", { namedCurve: "P-256", privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });

async function iphoneBuild(options: { phased?: boolean; stages?: Partial<BuildStages>; versionName?: string } = {}) {
  const store = new MemoryStore();
  const base = completeApp("client-1");
  const app: App = { ...base, ascKeyId: "2X9R4HXF34", ascIssuerId: "69a6de7e-0000-4000-8000-000000000000", ascPrivateKeyEncrypted: encrypt(p8, KEY, keyContext.appStore(base.id)) };
  await store.createApp(app);
  const build = await store.createBuild({
    id: `b-${options.versionName ?? "1.0.1"}`,
    clientId: app.clientId,
    appId: app.id,
    versionName: options.versionName ?? "1.0.1",
    status: "ready",
    stages: { queued: "done", android: "done", ios: "done", upload_play: "done", upload_testflight: "done", app_review: "pending", ...options.stages } as BuildStages,
    config: { ios_bundle_id: "com.adaacademy.app" } as unknown as Build["config"],
    storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
    autoPublish: true,
    artifacts: [],
    message: null,
    logUrl: null,
    release: { androidRollout: 1, iosPhased: options.phased ?? false },
    createdAt: NOW,
    startedAt: NOW,
    finishedAt: NOW,
    updatedAt: NOW,
  });
  return { store, app, build };
}

describe("138.3 the iPhone version sent to App Review", () => {
  it("waits for Apple's processing, then sends the version, with export compliance, a phased release and What's New, once", async () => {
    const { store, build } = await iphoneBuild({ phased: true });
    const apple = fakeAppStore({ processing: "PROCESSING", released: true });
    const told: string[] = [];
    const sent: string[] = [];
    const deps = (now: Date) => ({ store, key: KEY, now, fetcher: apple.fetcher, tell: async (_app: App, event: string) => void told.push(event), sent: async (_app: App, b: Build) => void sent.push(b.id) });

    expect(await runAppReviewSubmissions(deps(NOW))).toMatchObject({ looked: 1, waiting: 1 });
    let saved = (await store.getBuild(build.id))!;
    expect(saved.stages.app_review).toBe("pending");
    expect(saved.release?.appReview).toMatchObject({ state: "waiting", reason: "processing" });
    // Not looked at again before ten minutes.
    expect((await runAppReviewSubmissions(deps(new Date(NOW.getTime() + 5 * 60_000)))).looked).toBe(0);

    apple.state.processing = "VALID";
    const later = new Date(NOW.getTime() + 11 * 60_000);
    expect(await runAppReviewSubmissions(deps(later))).toMatchObject({ looked: 1, submitted: 1 });
    saved = (await store.getBuild(build.id))!;
    expect(saved.stages.app_review).toBe("done");
    expect(saved.release?.appReview).toMatchObject({ state: "submitted", submittedAt: later.toISOString(), versionId: "v-new", submissionId: "sub-1" });
    expect(apple.state.encryption).toBe(false);
    expect(apple.state.versions.find((v) => v.id === "v-new")!.attributes).toMatchObject({ versionString: "1.0.1", releaseType: "AFTER_APPROVAL", appVersionState: "WAITING_FOR_REVIEW" });
    expect(apple.state.phase).toMatchObject({ attributes: { phasedReleaseState: "INACTIVE" } });
    expect(apple.state.whatsNew).toEqual({ "en-US": "Improvements and fixes.", "ar-SA": "تحسينات وإصلاحات." });
    expect(apple.state.attached).toBe("build-1");
    expect(apple.state.submitted).toBe(true);
    expect(sent).toEqual([build.id]);
    expect(told).toEqual([]);
    // Done: never sent twice.
    const before = apple.calls.length;
    expect((await runAppReviewSubmissions(deps(new Date(later.getTime() + 60 * 60_000)))).looked).toBe(0);
    expect(apple.calls.length).toBe(before);
  });

  it("tells in plain words what Apple's API can't do, and the publishing team once", async () => {
    const { store, build } = await iphoneBuild();
    const apple = fakeAppStore({
      itemError: { status: 409, body: { errors: [{ status: "409", code: "STATE_ERROR.ENTITY_STATE_INVALID", title: "The version can't be added", detail: "You must provide information about your app's privacy practices in App Store Connect." }] } },
    });
    const told: string[] = [];
    const deps = (now: Date) => ({ store, key: KEY, now, fetcher: apple.fetcher, tell: async (_app: App, event: string) => void told.push(event) });
    expect(await runAppReviewSubmissions(deps(NOW))).toMatchObject({ blocked: 1 });
    const saved = (await store.getBuild(build.id))!;
    expect(saved.stages.app_review).toBe("pending");
    expect(saved.release?.appReview).toMatchObject({ state: "blocked", reason: "app_privacy", emailed: "app_privacy" });
    expect(told).toEqual([`has an iPhone version (1.0.1) that can't go to App Review yet: ${APP_REVIEW_TEXT.app_privacy}`]);
    // Looked at again each hour (a fix is picked up), the team told only once.
    expect((await runAppReviewSubmissions(deps(new Date(NOW.getTime() + 30 * 60_000)))).looked).toBe(0);
    expect(await runAppReviewSubmissions(deps(hours(1)))).toMatchObject({ blocked: 1 });
    expect(told).toHaveLength(1);
    // Export compliance: the build has an answer already, so it's left as it is.
    expect(apple.state.encryption).toBe(false);
  });

  it("reads Apple's errors as reasons, and keeps the reasons in the dashboard's languages", () => {
    expect(reasonOf(401, "")).toBe("key");
    expect(reasonOf(409, "The age rating declaration is incomplete")).toBe("age_rating");
    expect(reasonOf(409, "Missing export compliance for the build")).toBe("export_compliance");
    expect(reasonOf(409, "Screenshots are required for iPhone 6.9")).toBe("screenshots");
    expect(reasonOf(409, "The Paid Applications agreement has expired")).toBe("agreement");
    expect(reasonOf(409, "Something else")).toBe("other");
    expect(appleWords({ errors: [{ title: "A", detail: "B", meta: { associatedErrors: { "/v1/x": [{ detail: "C" }] } } }] })).toBe("A · B · C");
    // Every reason is a text the dashboard translates.
    const known = new Set(knownMessages(dashboardMessages("en")).values());
    for (const text of Object.values(APP_REVIEW_TEXT)) {
      expect(known, text).toContain(text);
      expect(knownTranslator("ar")(text), text).not.toBe(text);
      expect(knownTranslator("tr")(text), text).not.toBe(text);
    }
  });

  it("leaves an older build for the newest, and builds that never reached TestFlight", async () => {
    const { store, app, build } = await iphoneBuild();
    const older = await store.createBuild({ ...build, id: "b-old", versionName: "1.0.0", createdAt: new Date(NOW.getTime() - 3_600_000) });
    const failed = await store.createBuild({ ...build, id: "b-tf", versionName: "1.0.2", appId: app.id, variant: "courier", stages: { ...build.stages, upload_testflight: "failed" }, createdAt: new Date(NOW.getTime() + 60_000) });
    const apple = fakeAppStore();
    const report = await runAppReviewSubmissions({ store, key: KEY, now: NOW, fetcher: apple.fetcher });
    expect(report).toMatchObject({ submitted: 1, skipped: 2 });
    expect((await store.getBuild(older.id))!.stages.app_review).toBe("skipped");
    expect((await store.getBuild(failed.id))!.stages.app_review).toBe("skipped");
    expect((await store.getBuild(build.id))!.stages.app_review).toBe("done");
  });
});

describe("138.4 Yallapp's own app updates", () => {
  it("count a build made with an older release as an app change", async () => {
    expect(appReleaseOf({ release: null })).toBe(1);
    expect(behindAppRelease({ release: { androidRollout: 1, iosPhased: false, appRelease: CLIENT_APP_RELEASE } })).toBe(false);
    expect(behindAppRelease({ release: { androidRollout: 1, iosPhased: false, appRelease: CLIENT_APP_RELEASE } }, CLIENT_APP_RELEASE + 1)).toBe(true);
  });

  it("rebuild active apps that built before, a few an hour", async () => {
    const setup = await setupClient({ plan: "growth", activeUntil: days(60) });
    const store = setup.store;
    const client = (await store.getClientById(setup.client.id))!;
    const license = await licenseOf(store, client.id);
    const apps: App[] = [];
    for (let i = 0; i < APP_RELEASE_BUILDS_PER_HOUR + 2; i++) {
      const app = completeApp(client.id, { id: `00000000-0000-4000-8000-00000000000${i}`, androidPackage: `com.ada${i}.app`, iosBundleId: `com.ada${i}.app` });
      await store.createApp(app);
      // The first app takes the client's license; each other one gets its own.
      if (!(await store.getLicenseForApp(client.id, app.id))) await store.createLicense({ ...license!, id: `lic-${i}`, appId: app.id, keyHash: `hash-${i}` });
      const first = await queueBuild(store, { client, app, license: (await store.getLicenseForApp(client.id, app.id))!, versionName: "1.0.0" }, NOW, assetUrl);
      if (!first.ok) throw new Error(first.reason);
      await store.updateBuild(first.build.id, { status: "ready", finishedAt: NOW }, NOW);
      apps.push(app);
    }
    // One that never built successfully is left alone.
    const neverBuilt = completeApp(client.id, { id: "00000000-0000-4000-8000-0000000000ff", androidPackage: "com.never.app", iosBundleId: "com.never.app" });
    await store.createApp(neverBuilt);
    const started: number[] = [];
    const release = CLIENT_APP_RELEASE + 1;
    const run = (now: Date) =>
      runAppReleaseBuilds({
        store,
        now,
        assetUrl,
        release,
        start: async () => void started.push(now.getTime()),
        queue: ({ client: c, app, license: l, variant, versionName, appRelease }) => queueBuild(store, { client: c, app, license: l, variant, versionName, cause: "app_release", appRelease }, now, assetUrl),
      });
    const first = await run(hours(1));
    expect(first.queued).toBe(APP_RELEASE_BUILDS_PER_HOUR);
    expect(started).toHaveLength(1);
    const queued = (await store.listBuilds({ limit: 50, newestFirst: true })).filter((b) => b.release?.cause === "app_release");
    expect(queued).toHaveLength(APP_RELEASE_BUILDS_PER_HOUR);
    expect(queued.every((b) => b.versionName === "1.0.1" && b.release?.appRelease === release)).toBe(true);
    // The hour is full: the others wait.
    for (const b of queued) await store.updateBuild(b.id, { status: "ready", finishedAt: hours(1) }, hours(1));
    expect((await run(new Date(hours(1).getTime() + 30 * 60_000))).queued).toBe(0);
    // The next hour, the rest.
    expect((await run(hours(2.5))).queued).toBe(2);
    expect((await store.listBuildsByApp(neverBuilt.id, 5)).length).toBe(0);
    // The owner's own automatic builds see it too.
    const last = (await store.listBuildsByApp(apps[0]!.id, 1))[0]!;
    expect(buildChanges(apps[0]!, client, { ...last, release: { ...last.release!, appRelease: CLIENT_APP_RELEASE - 1 } }, assetUrl)).toContain("app");
    expect(buildChanges(apps[0]!, client, { ...last, release: { ...last.release!, appRelease: CLIENT_APP_RELEASE } }, assetUrl)).not.toContain("app");
  });
});

const ACCOUNTS: PublishingAccount[] = [
  { ...newAccount("publishing-a@yallapp.test", NOW), id: "acc-a", limit: 2 },
  { ...newAccount("publishing-b@yallapp.test", NOW), id: "acc-b", limit: 2 },
  { ...newAccount("publishing-c@yallapp.test", NOW), id: "acc-c", limit: 5, active: false },
];

describe("138.6 the publishing accounts", () => {
  async function pool(accounts = ACCOUNTS) {
    const store = new MemoryStore();
    await store.setPlatformSetting("publishingAccounts", { accounts }, "team@yallapp.test", NOW);
    await store.setPlatformSetting("publishing", { teamEmail: "publishing-team@yallapp.test" }, "team@yallapp.test", NOW);
    // Settings are kept for a few seconds per instance: read the new ones now.
    clearPlatformSettingsCache();
    const assigned: string[] = [];
    const deps: AccountDeps = { store, now: NOW, teamEmail: async () => "publishing-team@yallapp.test", assigned: async (app, account) => void assigned.push(`${app.id}:${account.email}`) };
    const make = async (i: number) => {
      const app = completeApp("client-1", { id: `10000000-0000-4000-8000-00000000000${i}` });
      await store.createApp(app);
      return app;
    };
    return { store, deps, make, assigned };
  }

  it("picks the active account with the fewest apps under its limit", () => {
    expect(accountsOf({ accounts: [...ACCOUNTS, { ...ACCOUNTS[0]!, id: "dup" }, { id: "x", email: "not an email", limit: 1, active: true, addedAt: "" }] })).toHaveLength(3);
    expect(newAccount(" Publishing-D@Yallapp.test ", NOW)).toMatchObject({ email: "publishing-d@yallapp.test", limit: DEFAULT_ACCOUNT_LIMIT, active: true });
    expect(pickAccount(ACCOUNTS, new Map())!.id).toBe("acc-a");
    expect(pickAccount(ACCOUNTS, new Map([["acc-a", 1]]))!.id).toBe("acc-b");
    expect(pickAccount(ACCOUNTS, new Map([["acc-a", 2], ["acc-b", 2]]))).toBeNull();
  });

  it("gives each app one account the first time it's needed, keeps it, and balances them", async () => {
    const { store, deps, make, assigned } = await pool();
    const one = await make(1);
    const two = await make(2);
    // Two requests at once for the same app: one account.
    const [a, b] = await Promise.all([publishingEmailFor(deps, one), publishingEmailFor(deps, one)]);
    expect(a.email).toBe(b.email);
    expect(a.email).toBe("publishing-a@yallapp.test");
    expect(assigned).toEqual([`${one.id}:publishing-a@yallapp.test`]);
    expect((await publishingEmailFor(deps, two)).email).toBe("publishing-b@yallapp.test");
    expect(accountCounts(await store.listApps())).toEqual(new Map([["acc-a", 1], ["acc-b", 1]]));
    // Only reading: an app without one isn't given one.
    const three = await make(3);
    expect(await publishingEmailFor({ ...deps, assign: false }, three)).toEqual({ email: "publishing-team@yallapp.test", account: null });
    // The team moves an app; it keeps the new one.
    await moveAppAccount(store, one.id, "acc-b", NOW);
    expect((await publishingEmailFor(deps, one)).email).toBe("publishing-b@yallapp.test");
    // Notices go to the app's account and the team.
    expect(await noticeEmailsFor(deps, one)).toEqual(["publishing-b@yallapp.test", "publishing-team@yallapp.test"]);
  });

  it("falls back to the team email and opens one alert when every account is full", async () => {
    const { store, deps, make } = await pool([{ ...ACCOUNTS[0]!, limit: 1 }]);
    await publishingEmailFor(deps, await make(1));
    expect(await publishingEmailFor(deps, await make(2))).toEqual({ email: "publishing-team@yallapp.test", account: null });
    await publishingEmailFor(deps, await make(3));
    const alerts = await store.listTeamAlerts({ open: true, limit: 10 });
    expect(alerts.map((a) => [a.kind, a.count])).toEqual([["publishing_full", 2]]);
    // Room again: the next app gets an account, and the alert closes.
    await store.setPlatformSetting("publishingAccounts", { accounts: [{ ...ACCOUNTS[0]!, limit: 5 }] }, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
    expect((await publishingEmailFor(deps, await make(4))).account?.id).toBe("acc-a");
    expect(await store.listTeamAlerts({ open: true, limit: 10 })).toEqual([]);
  });

  it("sends the publishing team's emails to the app's account too", async () => {
    const { store, make } = await pool();
    const app = await make(1);
    const sent: { key: string; to: string }[] = [];
    const send = (async (key: string, to: string) => void sent.push({ key, to })) as never;
    await notifyPublishingTeam(store, { user: { name: "Ada", email: "ada@academy.test" }, client: { whatsapp: "+905446731942" }, app, event: "asked us to publish their app" }, send);
    // The account was given now: it's told the app and its steps, then both get the request.
    expect(sent).toEqual([
      { key: "publishing_assigned", to: "publishing-a@yallapp.test" },
      { key: "publishing_request", to: "publishing-a@yallapp.test" },
      { key: "publishing_request", to: "publishing-team@yallapp.test" },
    ]);
  });

  it("lists the account's one-time steps, ticked when the platform can tell", () => {
    // An app with no iPhone app takes no APNs key: that step isn't its.
    const app: App = { ...newApp("client-1", null, NOW, "lms"), id: "app-1", rollout: null };
    expect(accountSteps({ app, builds: [] })).toEqual([
      { id: "play_first_release", state: "todo" },
      { id: "app_privacy", state: "todo" },
    ]);
    expect(apnsKeyState(app)).toBeNull();
    const draft = { stages: {} as BuildStages, release: { androidRollout: 1, iosPhased: false, play: { track: "production" as const, status: "draft" as const } } };
    expect(accountSteps({ app, builds: [draft] })[0]!.state).toBe("todo");
    const out = { stages: { app_review: "done" } as BuildStages, release: { androidRollout: 1, iosPhased: false, play: { track: "production" as const, status: "completed" as const } } };
    expect(accountSteps({ app, builds: [draft, out] }).map((s) => s.state)).toEqual(["done", "done"]);
    expect(accountStepLines(accountSteps({ app, builds: [out] }))).toBe("");

    // 136.20 An iPhone app whose notifications Yallapp sets up: to do until its APNs key is saved, then done.
    const iphone: App = { ...app, backend: "hosted", iosBundleId: "com.academy.app", pushSetup: "yallapp" };
    expect(apnsKeyState(iphone)).toBe("todo");
    expect(accountStepLines(accountSteps({ app: iphone, builds: [out] }))).toBe(`- ${ACCOUNT_STEP_TEXT.en.apns_key}`);
    const keyed: App = { ...iphone, apnsKeyEncrypted: "sealed", apnsKeyId: "ABC123DEFG", apnsTeamId: "TEAM123456" };
    expect(accountSteps({ app: keyed, builds: [out] }).map((s) => [s.id, s.state])).toEqual([
      ["play_first_release", "done"],
      ["app_privacy", "done"],
      ["apns_key", "done"],
    ]);
    // With the client's own Firebase the key goes in their Firebase project: not a step here.
    expect(apnsKeyState({ ...iphone, pushSetup: null })).toBeNull();
    // 136.46 A WordPress site in Yallapp's mode takes the key once its plugin relays the pushes.
    expect(apnsKeyState({ ...iphone, backend: "wordpress" })).toBeNull();
    expect(apnsKeyState({ ...iphone, backend: "wordpress", pushRelayAt: NOW })).toBe("todo");
    for (const lang of ["ar", "tr"] as const) for (const id of ACCOUNT_STEP_IDS) expect(ACCOUNT_STEP_TEXT[lang][id], `${lang} ${id}`).toBeTruthy();
  });
});
