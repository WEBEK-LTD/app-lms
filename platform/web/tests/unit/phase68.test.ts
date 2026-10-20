import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DELETE as hostedDelete, GET as hostedGet, POST as hostedPost } from "@/app/api/app/[appId]/[...path]/route";
import { GET as queueGet } from "@/app/api/v1/builds/queue/route";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { PLAN_ENDED_BEFORE_START, SUSPENDED_BEFORE_START, takeQueuedBuilds } from "@/lib/builds/queue";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { App, Build, BuildStatus, License } from "@/lib/data/types";
import { knownTranslator } from "@/i18n/dashboard";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { sendPush } from "@/lib/hosted/push";
import { PLAN_ENDED_SCHEDULED, runScheduledNotifications, scheduleAppNotification } from "@/lib/hosted/scheduled-notifications";
import { PLAN_ENDED_MESSAGE, sendAppNotification } from "@/lib/hosted/send-notification";
import { handleHosted, OPEN_WHILE_PAUSED, type HostedContext, type HostedRequest } from "@/lib/hosted/service";
import { runFrequentJobs } from "@/lib/jobs/frequent";
import { ENDED_REFRESH, refreshEndedSites } from "@/lib/license/refresh";
import { appIsActive } from "@/lib/license/status";
import { expectContract } from "./contract";
import { days, KEY, NOW, setupClient } from "./helpers";

/**
 * 68 An ended plan stops the app everywhere: the hosted API pauses on the
 * plan's real end date (nothing passed in), account deletion keeps working,
 * notifications stop (now, later, from the dashboard's code and the Owner
 * API's), the pipeline doesn't take a build queued before the end, and the
 * WordPress site is asked to check its license once when the plan ends.
 */

const HOUR = 3_600_000;
const PUBLIC = ["93.184.216.34"];

describe("68 one question: is the app active", () => {
  it("compares the plan's end with now, and needs an active account", () => {
    const license = { expiresAt: days(1) };
    expect(appIsActive(license, { status: "active" }, NOW)).toBe(true);
    expect(appIsActive(license, { status: "active" }, days(1))).toBe(false);
    expect(appIsActive(license, { status: "active" }, days(2))).toBe(false);
    expect(appIsActive(license, { status: "suspended" }, NOW)).toBe(false);
    expect(appIsActive(license, { status: "pending" }, NOW)).toBe(false);
    expect(appIsActive(null, { status: "active" }, NOW)).toBe(false);
    expect(appIsActive(license, null, NOW)).toBe(false);
  });

  it("leaves open only what deleting one's account needs", () => {
    expect([...OPEN_WHILE_PAUSED].sort()).toEqual(["DELETE /me", "POST /auth/logout", "POST /auth/refresh"]);
  });
});

describe("68 the hosted API route with a plan that really ended", () => {
  let store: DataStore;
  let app: App;
  let license: License;

  beforeAll(async () => {
    store = await getStore();
    const now = new Date();
    const { client } = await registerClient(store, { name: "Ended Shop", email: "ended@shop.test", whatsapp: "+905446731903", siteUrl: "", password: null }, now);
    app = { ...newApp(client.id, null, now, "store"), backend: "hosted", appName: "Ended Shop", supportEmail: "help@ended.test" };
    await store.createApp(app);
    license = (await activateClient(store, { clientId: client.id, appId: app.id, plan: "growth", activeUntil: new Date(now.getTime() + HOUR), paymentNote: "" }, KEY, now)).license;
  });

  const params = (path: string[]) => ({ params: Promise.resolve({ appId: app.id, path }) });
  const config = () => hostedGet(new Request(`https://yallapp.test/api/app/${app.id}/config?platform=android&app_version=1.0.0`), params(["config"]));

  it("answers while the plan runs and pauses once its end date has passed", async () => {
    expect((await config()).status).toBe(200);
    // The end date moves into the past, as time does: nothing tells the API but the date.
    await store.updateLicense(license.id, { expiresAt: new Date(Date.now() - 60_000) }, new Date());
    const paused = await config();
    expect(paused.status).toBe(503);
    const body = (await paused.json()) as { code: string; message: string; contact: { name: string; email: string | null } };
    expect(body).toMatchObject({ code: "license_inactive", contact: { name: "Ended Shop", email: "help@ended.test" } });
    expect(body.message).toBe("Ended Shop is paused right now. Please contact Ended Shop to bring it back.");
    // Everything else is paused too…
    expect((await hostedGet(new Request(`https://yallapp.test/api/app/${app.id}/me`), params(["me"]))).status).toBe(503);
    expect((await hostedPost(new Request(`https://yallapp.test/api/app/${app.id}/auth/otp/request`, { method: "POST", body: JSON.stringify({ country_code: "+90", phone: "5321234567" }) }), params(["auth", "otp", "request"]))).status).toBe(503);
    // …except deleting one's account and what it needs: here without a session, so 401, not 503.
    expect((await hostedDelete(new Request(`https://yallapp.test/api/app/${app.id}/me`, { method: "DELETE" }), params(["me"]))).status).toBe(401);
    const refresh = await hostedPost(new Request(`https://yallapp.test/api/app/${app.id}/auth/refresh`, { method: "POST", body: JSON.stringify({ refresh_token: "nope" }) }), params(["auth", "refresh"]));
    expect(refresh.status).toBe(401);
  });
});

describe("68 a signed-in person deletes their account while the app is paused", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient({ activeUntil: days(1) }));
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Rose Shop", websiteDoneAt: NOW };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
  });

  /** As the route does: whether the app is active comes from the stored license and the clock. */
  async function call(method: string, route: string, body?: unknown, token?: string, check = true) {
    const client = (await store.getClientById(app.clientId))!;
    const license = await store.getLicenseForApp(client.id, app.id);
    const ctx: HostedContext = {
      store,
      app,
      active: appIsActive(license, client, now),
      suspended: client.status === "suspended",
      now,
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender,
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
    };
    const req: HostedRequest = { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(route === "/config" ? { platform: "android", app_version: "1.0.0" } : {}), body, token: token ?? null };
    const result = await handleHosted(ctx, req);
    if (check) expectContract(method, route, result);
    return result;
  }

  it("renews the session and deletes the account after the plan ended; nothing else answers", async () => {
    const device = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5321234567" });
    const code = sender.sent.get("+905321234567")!;
    const verified = await call("POST", "/auth/otp/verify", { request_id: (requested.body as { request_id: string }).request_id, code, device });
    const registered = await call("POST", "/auth/register", { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Sara Yilmaz", device });
    expect(registered.status).toBe(201);
    const tokens = registered.body as { access_token: string; refresh_token: string };
    expect(await store.countHostedUsers(app.id)).toBe(1);

    // Two days later the plan has ended (and the 15-minute access token too).
    now = days(2);
    expect((await call("GET", "/config")).body).toMatchObject({ code: "license_inactive" });
    // (The contract describes the paused 503 once, in Unavailable and its introduction.)
    expect((await call("GET", "/me", undefined, tokens.access_token, false)).status).toBe(503);
    expect((await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5321234568" }, undefined, false)).status).toBe(503);
    const renewed = await call("POST", "/auth/refresh", { refresh_token: tokens.refresh_token });
    expect(renewed.status).toBe(200);
    const deleted = await call("DELETE", "/me", undefined, (renewed.body as { access_token: string }).access_token);
    expect(deleted.status).toBe(204);
    expect(await store.countHostedUsers(app.id)).toBe(0);
  });

  it("signs out while paused, and a suspended account's users can delete too", async () => {
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    await store.updateClient(client.id, { status: "suspended" }, NOW);
    expect((await call("GET", "/config")).body).toMatchObject({ code: "account_suspended" });
    expect((await call("POST", "/auth/logout")).status).toBe(401);
    expect((await call("DELETE", "/me")).status).toBe(401);
  });
});

describe("68 notifications stop when the plan ends", () => {
  let store: MemoryStore;
  let app: App;
  let pushed: number;
  const send = (async (_account, targets) => {
    pushed += targets.length;
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;

  beforeEach(async () => {
    ({ store } = await setupClient({ activeUntil: days(1) }));
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Rose Shop", websiteDoneAt: NOW, timeZone: "UTC" } as App;
    await store.createApp(app);
    pushed = 0;
  });

  const licenseOf = async () => (await store.getLicenseForApp(app.clientId, app.id))!;

  it("sends now while the plan runs, and nothing after its end", async () => {
    expect(await sendAppNotification({ store, key: KEY, now: NOW, send }, app, await licenseOf(), { title: "Hi", body: "There" })).toMatchObject({ ok: true });
    const after = await sendAppNotification({ store, key: KEY, now: days(2), send }, app, await licenseOf(), { title: "Late", body: "News" });
    expect(after).toEqual({ ok: false, inactive: true, message: PLAN_ENDED_MESSAGE });
    expect((await store.listHostedBroadcasts(app.id, 10)).map((n) => n.title)).toEqual(["Hi"]);
    expect(pushed).toBe(0);
  });

  it("doesn't send one scheduled before the end whose time comes after it, and says why", async () => {
    const made = await scheduleAppNotification({ store, now: NOW }, app, { title: "Sale", body: "Tomorrow", date: "2026-10-14", time: "09:00", createdBy: null });
    expect(made.ok).toBe(true);
    const report = await runScheduledNotifications({ store, key: KEY, now: days(3), send });
    expect(report).toEqual({ sent: 0, waiting: 0, cancelled: 0, failed: 1 });
    const [failed] = await store.listScheduledNotifications(app.id, ["failed"]);
    expect(failed).toMatchObject({ title: "Sale", status: "failed", result: PLAN_ENDED_SCHEDULED, sentAt: null });
    expect(await store.listHostedBroadcasts(app.id, 10)).toEqual([]);
    // Running again changes nothing: it is never sent late.
    expect(await runScheduledNotifications({ store, key: KEY, now: days(4), send })).toEqual({ sent: 0, waiting: 0, cancelled: 0, failed: 0 });
    // Nothing new is scheduled until the plan is renewed.
    expect(await scheduleAppNotification({ store, now: days(3) }, app, { title: "Again", body: "Hi", date: "2026-10-20", time: "09:00", createdBy: null })).toMatchObject({ ok: false, inactive: true });
    expect(pushed).toBe(0);
  });

  it("says so in Arabic and Turkish on the dashboard", () => {
    for (const text of [PLAN_ENDED_MESSAGE, PLAN_ENDED_SCHEDULED, PLAN_ENDED_BEFORE_START, SUSPENDED_BEFORE_START]) {
      expect(knownTranslator("ar")(text)).not.toBe(text);
      expect(knownTranslator("tr")(text)).not.toBe(text);
    }
  });
});

describe("68 the pipeline doesn't take a build queued before the plan ended", () => {
  const TOKEN = "pipeline-token-for-unit-tests-0123456789";
  let store: DataStore;

  beforeAll(async () => {
    process.env.BUILD_PIPELINE_TOKEN = TOKEN;
    store = await getStore();
  });

  afterAll(() => {
    delete process.env.BUILD_PIPELINE_TOKEN;
  });

  async function queuedApp(name: string, activeFor: number): Promise<{ app: App; build: Build; license: License }> {
    const now = new Date();
    const { client } = await registerClient(store, { name, email: `${newId()}@builds.test`, whatsapp: "+905446731904", siteUrl: "", password: null }, now);
    const app = { ...newApp(client.id, null, now, "store"), backend: "hosted" as const, appName: name };
    await store.createApp(app);
    const { license } = await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: new Date(now.getTime() + activeFor), paymentNote: "" }, KEY, now);
    const status: BuildStatus = "queued";
    const build = await store.createBuild({
      id: newId(),
      clientId: client.id,
      appId: app.id,
      versionName: "1.0.0",
      status,
      stages: { queued: "done", android: "pending", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" },
      config: {} as Build["config"],
      storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
      autoPublish: false,
      artifacts: [],
      message: null,
      logUrl: null,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      updatedAt: now,
    });
    return { app, build, license };
  }

  it("closes it as failed with the reason and lists only builds whose plan runs", async () => {
    const running = await queuedApp("Running Shop", 30 * 86_400_000);
    const ended = await queuedApp("Ended Builds", HOUR);
    // The plan ends after the build was queued.
    await store.updateLicense(ended.license.id, { expiresAt: new Date(Date.now() - 1000) }, new Date());
    const response = await queueGet(new Request("https://yallapp.test/api/v1/builds/queue", { headers: { authorization: `Bearer ${TOKEN}` } }));
    expect(response.status).toBe(200);
    const ids = ((await response.json()) as { builds: { id: string }[] }).builds.map((b) => b.id);
    expect(ids).toContain(running.build.id);
    expect(ids).not.toContain(ended.build.id);
    const closed = await store.getBuild(ended.build.id);
    expect(closed).toMatchObject({ status: "failed", message: PLAN_ENDED_BEFORE_START, stages: { queued: "failed", android: "skipped", ios: "skipped" } });
    expect(closed!.finishedAt).not.toBeNull();
    // A later claim by the pipeline is refused: the build is finished.
    expect((await store.getBuild(running.build.id))!.status).toBe("queued");
  });

  it("names a suspension when the account was suspended", async () => {
    const memory = new MemoryStore();
    const { client } = await registerClient(memory, { name: "S", email: "s@builds.test", whatsapp: "+905446731905", siteUrl: "", password: null }, NOW);
    const app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted" as const };
    await memory.createApp(app);
    await activateClient(memory, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const build = await memory.createBuild({
      id: newId(),
      clientId: client.id,
      appId: app.id,
      versionName: "1.0.0",
      status: "queued",
      stages: { queued: "done", android: "pending", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" },
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
    });
    expect((await takeQueuedBuilds(memory, [build], NOW)).builds).toHaveLength(1);
    await memory.updateClient(client.id, { status: "suspended" }, NOW);
    const take = await takeQueuedBuilds(memory, [build], NOW);
    expect(take.builds).toEqual([]);
    expect(take.closed[0]).toMatchObject({ status: "failed", message: SUSPENDED_BEFORE_START });
  });
});

describe("68 the WordPress site hears at once when its plan ends", () => {
  interface Sent {
    url: string;
  }

  function fakeFetch() {
    const sent: Sent[] = [];
    const fetcher = async (url: string) => {
      sent.push({ url });
      return new Response("{}", { status: 202 });
    };
    return { sent, fetcher };
  }

  async function wordpressApp(store: MemoryStore, email: string, site: string, activeUntil: Date, backend: App["backend"] = "wordpress") {
    const { client } = await registerClient(store, { name: "Ada", email, whatsapp: "+905446731942", siteUrl: `https://${site}`, password: null }, NOW);
    const app: App = { ...newApp(client.id, `https://${site}`, NOW, "lms"), backend };
    await store.createApp(app);
    const { license } = await activateClient(store, { clientId: client.id, appId: app.id, plan: "growth", activeUntil, paymentNote: "" }, KEY, NOW);
    await store.claimActivation({
      licenseId: license.id,
      siteUrl: site,
      siteUrlRaw: `https://${site}/`,
      pluginVersion: "0.4.6",
      wpVersion: "7.1.3",
      lms: "tutor",
      store: "",
      bookings: "",
      activatedAt: NOW,
      lastCheckedAt: NOW,
    });
    return { app, license };
  }

  it("asks each site once per end, a renewed plan's next end again, and leaves others alone", async () => {
    const store = new MemoryStore();
    const ends = new Date(NOW.getTime() + HOUR);
    const ada = await wordpressApp(store, "ada@a.test", "ada.test", ends);
    await wordpressApp(store, "bo@b.test", "bo.test", days(60));
    await wordpressApp(store, "old@c.test", "old.test", days(-10));
    const hosted = await wordpressApp(store, "hosted@d.test", "hosted.test", ends, "hosted");
    const { sent, fetcher } = fakeFetch();
    const deps = { store, key: KEY, fetcher, resolve: async () => PUBLIC };

    // Before the end: nothing.
    expect(await refreshEndedSites({ ...deps, now: NOW })).toEqual({ ended: 0, asked: 0, sent: 0 });
    // Five minutes after it: the site of the ended plan (the hosted app's end is recorded, nothing to call).
    const after = new Date(ends.getTime() + 5 * 60_000);
    expect(await refreshEndedSites({ ...deps, now: after })).toEqual({ ended: 2, asked: 1, sent: 1 });
    expect(sent.map((s) => s.url)).toEqual(["https://ada.test/wp-json/yallapp/v1/license/refresh"]);
    // The next runs don't ask again, two at once neither.
    const again = await Promise.all([refreshEndedSites({ ...deps, now: new Date(after.getTime() + 5 * 60_000) }), refreshEndedSites({ ...deps, now: new Date(after.getTime() + 5 * 60_000) })]);
    expect(again.map((r) => r.asked)).toEqual([0, 0]);
    expect(sent).toHaveLength(1);
    expect((await store.getLicenseById(hosted.license.id))!.endRefreshedFor).toEqual(ends);

    // Renewed for a month, it ends again: asked once more.
    const next = days(31);
    await store.updateLicense(ada.license.id, { expiresAt: next }, after);
    expect(await refreshEndedSites({ ...deps, now: days(29) })).toMatchObject({ asked: 0 });
    expect(await refreshEndedSites({ ...deps, now: new Date(next.getTime() + 60_000) })).toMatchObject({ ended: 1, asked: 1 });
    expect(sent).toHaveLength(2);
  });

  it("looks back three days at most, and the frequent job reports it", async () => {
    const store = new MemoryStore();
    await wordpressApp(store, "late@a.test", "late.test", days(-4));
    await wordpressApp(store, "recent@a.test", "recent.test", days(-2));
    const { sent, fetcher } = fakeFetch();
    expect(ENDED_REFRESH.lookbackMs).toBe(3 * 86_400_000);
    const report = await runFrequentJobs({ store, key: KEY, now: NOW, ownerPush: { store, now: NOW, account: null }, refresh: { fetcher, resolve: async () => PUBLIC } });
    expect(report.ended).toEqual({ ended: 1, asked: 1, sent: 1 });
    expect(sent.map((s) => s.url)).toEqual(["https://recent.test/wp-json/yallapp/v1/license/refresh"]);
  });

  it("stops within its time and leaves the rest for the next run", async () => {
    const store = new MemoryStore();
    for (let i = 0; i < 7; i += 1) await wordpressApp(store, `s${i}@a.test`, `s${i}.test`, days(-1));
    const { sent, fetcher } = fakeFetch();
    let tick = 0;
    const first = await refreshEndedSites({ store, key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC, clock: () => (tick++ < 4 ? 0 : 60_000) }, { ...ENDED_REFRESH, batchSize: 2 });
    expect(first.asked).toBeLessThan(7);
    const second = await refreshEndedSites({ store, key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC });
    expect(first.asked + second.asked).toBe(7);
    expect(new Set(sent.map((s) => s.url)).size).toBe(7);
  });
});
