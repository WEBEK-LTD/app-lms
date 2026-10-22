import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { BuildConfig } from "@/lib/build-config/types";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { App, Build, TeamAlert } from "@/lib/data/types";
import { announce } from "@/lib/hosted/notify";
import type { sendPush } from "@/lib/hosted/push";
import { raiseAlert } from "@/lib/watch/alerts";
import { deepHealth, type HealthDeps } from "@/lib/watch/health";
import { jobStates, notePipelinePoll, recordJobRun } from "@/lib/watch/runs";
import { alertFailedScheduledPushes, BUILD_WAITING_MS, runWatch } from "@/lib/watch/watch";
import { watchStoreSuite } from "./watch-store-suite";
import { setupClient } from "./helpers";

/**
 * 78.3 Watching: each job's runs, the deep health check, and the alerts the
 * team gets (builds waiting or stopped, a job that didn't run, a crash spike,
 * failed pushes), emailed once and closed when the problem goes.
 */

const NOW = new Date("2026-10-22T12:00:00.000Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("78.3 watching on the memory store", () => {
  const store = new MemoryStore();
  watchStoreSuite(() => store);
});

describe("78.3 job runs", () => {
  it("records a run that worked, with its answer, and one that failed, thrown again", async () => {
    const store = new MemoryStore();
    let t = NOW.getTime();
    const clock = () => new Date((t += 1000));
    expect(await recordJobRun(store, "daily", clock, async () => ({ reminders: 2 }))).toEqual({ reminders: 2 });
    await expect(
      recordJobRun(store, "frequent", clock, async () => {
        throw new Error("database gone");
      }),
    ).rejects.toThrow("database gone");
    const [failed, done] = await store.listJobRuns({ limit: 5 });
    expect(done).toMatchObject({ job: "daily", ok: true, summary: '{"reminders":2}', error: null });
    expect(done!.finishedAt!.getTime() - done!.startedAt.getTime()).toBe(1000);
    expect(failed).toMatchObject({ job: "frequent", ok: false, summary: null, error: "database gone" });
    expect((await store.lastGoodJobRuns()).frequent).toBeUndefined();

    // A long answer is cut; recording that fails never fails the work.
    await recordJobRun(store, "webhooks", clock, async () => "x".repeat(5000));
    expect((await store.listJobRuns({ job: "webhooks", limit: 1 }))[0]!.summary).toHaveLength(4000);
    const broken = { startJobRun: async () => Promise.reject(new Error("no")), finishJobRun: async () => undefined } as unknown as DataStore;
    expect(await recordJobRun(broken, "daily", clock, async () => 7)).toBe(7);
  });

  it("notes the pipeline asking for builds, and says which jobs are late", async () => {
    const store = new MemoryStore();
    await notePipelinePoll(store, ago(9 * HOUR), 0);
    const last = await store.lastGoodJobRuns();
    expect(last.pipeline).toEqual(ago(9 * HOUR));
    expect(jobStates({ ...last, daily: ago(25 * HOUR), frequent: ago(21 * MIN) }, NOW, ["daily", "frequent", "webhooks", "pipeline"])).toEqual([
      { job: "daily", last: ago(25 * HOUR), late: false },
      { job: "frequent", last: ago(21 * MIN), late: true },
      // Never recorded: not late (recording starts with this phase).
      { job: "webhooks", last: null, late: false },
      { job: "pipeline", last: ago(9 * HOUR), late: true },
    ]);
  });
});

async function appWithBuilds(store: DataStore, clientId: string): Promise<App> {
  const app = { ...newApp(clientId, null, ago(30 * HOUR)), appName: "Ada Academy" };
  await store.createApp(app);
  return app;
}

async function queue(store: DataStore, app: App, input: { at: Date; status?: Build["status"] }): Promise<Build> {
  return store.createBuild({
    id: crypto.randomUUID(),
    clientId: app.clientId,
    appId: app.id,
    versionName: "1.0.0",
    status: input.status ?? "queued",
    stages: { queued: "pending", android: "pending", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" },
    config: {} as BuildConfig,
    storeListing: { storeTitle: "Ada", shortDescription: "", fullDescription: "", supportEmail: "a@a.test", privacyUrl: "https://a.test", phoneScreenshots: [], iphoneScreenshots: [] },
    autoPublish: false,
    artifacts: [],
    message: null,
    logUrl: null,
    createdAt: input.at,
    startedAt: null,
    finishedAt: null,
    updatedAt: input.at,
  });
}

describe("78.3 the watch's alerts", () => {
  it("a build waiting for the pipeline: one alert, emailed once, closed when it's taken; a stopped one", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    const app = await appWithBuilds(store, client.id);
    const waiting = await queue(store, app, { at: ago(BUILD_WAITING_MS + 15 * MIN) });
    await queue(store, app, { at: ago(10 * MIN) });
    const stopped = await queue(store, app, { at: ago(25 * HOUR) });
    const mailed: TeamAlert[] = [];
    const mail = async (a: TeamAlert) => void mailed.push(a);

    expect(await runWatch({ store, now: NOW, mail, jobs: [], dispatch: false })).toEqual({ alerts: 2, closed: 0 });
    const open = await store.listTeamAlerts({ open: true, limit: 10 });
    const wait = open.find((a) => a.key === `build_waiting:${waiting.id}`)!;
    expect(wait).toMatchObject({ kind: "build_waiting", title: "Build Ada Academy #1 waits for the pipeline", link: "/admin/builds", emailedAt: NOW });
    expect(wait.detail).toContain("45 minutes ago");
    expect(wait.detail).toContain("GITHUB_DISPATCH_TOKEN isn't set");
    expect(open.find((a) => a.key === `build_stalled:${stopped.id}`)).toMatchObject({ title: "Build Ada Academy #3 stopped" });
    expect(mailed.map((a) => a.kind).sort()).toEqual(["build_stalled", "build_waiting"]);

    // Five minutes later: the same, counted, not emailed again.
    await runWatch({ store, now: new Date(NOW.getTime() + 5 * MIN), mail, jobs: [], dispatch: true });
    expect(mailed).toHaveLength(2);
    const again = (await store.listTeamAlerts({ open: true, limit: 10 })).find((a) => a.id === wait.id)!;
    expect(again.count).toBe(2);
    expect(again.detail).toContain("asks GitHub to start the pipeline at once");

    // The pipeline took it, and the stopped one was closed: both alerts close.
    await store.updateBuild(waiting.id, { status: "building" }, NOW);
    await store.updateBuild(stopped.id, { status: "failed", finishedAt: NOW }, NOW);
    expect(await runWatch({ store, now: new Date(NOW.getTime() + 10 * MIN), mail, jobs: [], dispatch: true })).toEqual({ alerts: 0, closed: 2 });
    expect(await store.countOpenTeamAlerts()).toBe(0);
    expect((await store.listTeamAlerts({ open: false, limit: 5 }))[0]).toMatchObject({ resolvedBy: "watch" });
  });

  it("a job that didn't run, closed when it runs again; only the jobs asked about", async () => {
    const store = new MemoryStore();
    const run = async (job: "daily" | "frequent", at: Date) => {
      const id = await store.startJobRun(job, at);
      await store.finishJobRun(id, { finishedAt: at, ok: true, summary: null, error: null });
    };
    await run("daily", ago(30 * HOUR));
    await run("frequent", ago(30 * MIN));
    expect(await runWatch({ store, now: NOW, jobs: ["daily"], dispatch: true })).toEqual({ alerts: 1, closed: 0 });
    const [missing] = await store.listTeamAlerts({ open: true, limit: 5 });
    expect(missing).toMatchObject({ key: "job_missing:daily", title: "Daily job hasn't run" });
    expect(missing!.detail).toContain("2026-10-21 06:00 UTC");

    await run("daily", NOW);
    expect(await runWatch({ store, now: NOW, jobs: ["daily"], dispatch: true })).toEqual({ alerts: 0, closed: 1 });
    // The frequent job is late too, but only the daily job checks it.
    expect(await runWatch({ store, now: NOW, jobs: ["frequent"], dispatch: true })).toEqual({ alerts: 1, closed: 0 });
  });

  it("an app's crashes jump today: one alert a day; a usual day doesn't", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    const app = await appWithBuilds(store, client.id);
    const calm = await appWithBuilds(store, client.id);
    const day = (d: Date) => d.toISOString().slice(0, 10);
    for (let i = 1; i <= 7; i++) await store.recordCrashReports(app.id, [], { day: day(ago(i * 24 * HOUR)), sessions: 100, crashed: 1 });
    await store.recordCrashReports(app.id, [], { day: day(NOW), sessions: 100, crashed: 12 });
    // 6% every day: no jump.
    for (let i = 0; i <= 7; i++) await store.recordCrashReports(calm.id, [], { day: day(ago(i * 24 * HOUR)), sessions: 100, crashed: 6 });

    expect(await runWatch({ store, now: NOW, jobs: [], dispatch: true, crashes: true })).toEqual({ alerts: 1, closed: 0 });
    const [spike] = await store.listTeamAlerts({ open: true, limit: 5 });
    expect(spike).toMatchObject({ kind: "crash_spike", key: `crash_spike:${app.id}:2026-10-22`, title: "Ada Academy crashes more today", link: `/admin/crashes?app=${app.id}` });
    expect(spike!.detail).toBe("12 of 100 sessions crashed today (12%), against 1% in the 7 days before.");
  });

  it("failed pushes: scheduled ones a day at a time, an app's own in the bell only", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    const app = await appWithBuilds(store, client.id);
    const mailed: TeamAlert[] = [];
    await alertFailedScheduledPushes(store, 0, NOW, async (a) => void mailed.push(a));
    await alertFailedScheduledPushes(store, 3, NOW, async (a) => void mailed.push(a));
    await alertFailedScheduledPushes(store, 1, new Date(NOW.getTime() + HOUR), async (a) => void mailed.push(a));
    expect(mailed).toHaveLength(1);
    expect((await store.listTeamAlerts({ open: true, limit: 5 }))[0]).toMatchObject({ key: "push_failed:scheduled:2026-10-22", count: 2 });

    const failing = (async () => {
      throw new Error("The service account was deleted");
    }) as typeof sendPush;
    const result = await announce({ store, app, title: "Hi", body: "There", account: { projectId: "p", clientEmail: "c@p.iam", privateKey: "k" } as never, now: NOW, send: failing });
    expect(result.pushError).toBe("The service account was deleted");
    const appAlert = (await store.listTeamAlerts({ open: true, limit: 5 })).find((a) => a.key.startsWith("push_failed:app:"))!;
    expect(appAlert).toMatchObject({ title: "Ada Academy: notifications couldn't be pushed", emailedAt: null, link: `/admin/clients/${client.id}` });
    // 78.4 And on the app's errors.
    expect(await store.listAppErrors({ appId: app.id, limit: 5 })).toEqual([expect.objectContaining({ source: "push", code: "push_failed", message: "The service account was deleted" })]);
  });

  it("an alert whose email fails stays open, not marked emailed; raising never throws", async () => {
    const store = new MemoryStore();
    const alert = await raiseAlert(store, { kind: "health", key: "health:x", title: "t", detail: "d", link: null }, NOW, async () => {
      throw new Error("SMTP down");
    });
    expect(alert).toMatchObject({ emailedAt: null });
    const broken = { raiseTeamAlert: async () => Promise.reject(new Error("no")) } as unknown as DataStore;
    expect(await raiseAlert(broken, { kind: "health", key: "k", title: "t", detail: "d", link: null }, NOW)).toBeNull();
  });
});

describe("78.3 the deep health check", () => {
  const base = (over: Partial<HealthDeps>, store = new MemoryStore()): HealthDeps => ({
    store,
    now: NOW,
    mediaGate: "https://files.yallapp.test/media",
    filesHost: "https://files.yallapp.test",
    email: true,
    ownerPush: "ok",
    pipelineToken: true,
    dispatchToken: true,
    fetcher: (async (url: string) =>
      String(url).endsWith("/media/ping") ? new Response("Yallapp media gate 3\n", { status: 200 }) : new Response("Forbidden", { status: 403 })) as typeof fetch,
    ...over,
  });

  it("says each part is fine, with the jobs' last runs", async () => {
    const store = new MemoryStore();
    for (const job of ["daily", "frequent", "webhooks", "pipeline"] as const) {
      const id = await store.startJobRun(job, ago(MIN));
      await store.finishJobRun(id, { finishedAt: ago(MIN), ok: true, summary: null, error: null });
    }
    const checks = await deepHealth(base({}, store));
    expect(checks.map((c) => [c.key, c.ok])).toEqual([
      ["database", true],
      ["media", true],
      ["files", true],
      ["email", true],
      ["push", true],
      ["pipeline", true],
      ["job:daily", true],
      ["job:frequent", true],
      ["job:webhooks", true],
    ]);
    expect(checks.find((c) => c.key === "media")!.detail).toBe("Yallapp media gate 3 answers.");
    expect(checks.find((c) => c.key === "pipeline")!.detail).toBe("Last asked for builds 2026-10-22 11:59 UTC.");
  });

  it("names what's wrong", async () => {
    const checks = await deepHealth(
      base({
        email: false,
        ownerPush: "invalid",
        dispatchToken: false,
        fetcher: (async (url: string) => {
          if (String(url).includes("/media/")) return new Response("Not Found", { status: 404 });
          throw new Error("ENOTFOUND files.yallapp.test");
        }) as typeof fetch,
      }),
    );
    const by = Object.fromEntries(checks.map((c) => [c.key, c]));
    expect(by.media).toMatchObject({ ok: false, detail: "Answered 404, not the gate." });
    expect(by.files).toMatchObject({ ok: false, detail: "Unreachable: ENOTFOUND files.yallapp.test" });
    expect(by.email).toMatchObject({ ok: false });
    expect(by.push).toMatchObject({ ok: false, detail: "OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT isn't a Firebase service account key." });
    expect(by.pipeline!.ok).toBe(false);
    expect(by.pipeline!.detail).toContain("GITHUB_DISPATCH_TOKEN isn't set");
    expect(by["job:daily"]).toMatchObject({ ok: false, detail: "No run recorded yet." });
    // Local runs keep files on this server.
    expect((await deepHealth(base({ mediaGate: null, filesHost: null })))[1]).toMatchObject({ key: "media", ok: true });
  });
});
