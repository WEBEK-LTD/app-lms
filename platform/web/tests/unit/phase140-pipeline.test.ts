import { afterEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { BuildConfig } from "@/lib/build-config/types";
import { ASK_AGAIN_AFTER_MS, askPipelineAgain } from "@/lib/builds/ask-again";
import { pipelineRuns } from "@/lib/builds/dispatch";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { App, Build } from "@/lib/data/types";
import { runFrequentJobs } from "@/lib/jobs/frequent";

/**
 * 140 Builds never left in the queue: a build still queued 10 minutes after it
 * was queued, with no run of the build workflow going, has GitHub asked again
 * (17 November: Leqaa #2 waited 3 hours, left over from a full run, while
 * GitHub's hourly schedule didn't run).
 */

const NOW = new Date("2026-11-17T18:30:00.000Z");
const MIN = 60_000;
const KEY = Buffer.alloc(32, 7);
const ago = (ms: number) => new Date(NOW.getTime() - ms);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function storeWithApp(): Promise<{ store: MemoryStore; app: App }> {
  const store = new MemoryStore();
  const app = { ...newApp("client-1", null, ago(48 * 60 * MIN)), appName: "Leqaa" };
  await store.createApp(app);
  return { store, app };
}

async function queue(store: DataStore, app: App, at: Date, status: Build["status"] = "queued"): Promise<Build> {
  return store.createBuild({
    id: crypto.randomUUID(),
    clientId: app.clientId,
    appId: app.id,
    versionName: "1.0.0",
    status,
    stages: { queued: "pending", android: "pending", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" },
    config: {} as BuildConfig,
    storeListing: { storeTitle: "Leqaa", shortDescription: "", fullDescription: "", supportEmail: "a@a.test", privacyUrl: "https://a.test", phoneScreenshots: [], iphoneScreenshots: [] },
    autoPublish: false,
    artifacts: [],
    message: null,
    logUrl: null,
    createdAt: at,
    startedAt: null,
    finishedAt: null,
    updatedAt: at,
  });
}

describe("140 asking the build pipeline again", () => {
  it("asks only for a build queued 10 minutes or more, with no run going nor one just made", async () => {
    const { store, app } = await storeWithApp();
    const start = vi.fn().mockResolvedValue(true);
    const runs = vi.fn().mockResolvedValue({ going: false, latestAt: ago(3 * 60 * MIN) });

    // Nothing queued, or queued 9 minutes ago (the ask made then may still be starting): nothing asked, GitHub not read.
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 0, asked: false });
    await queue(store, app, ago(9 * MIN));
    await queue(store, app, ago(3 * 60 * MIN), "building");
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 0, asked: false });
    expect(runs).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();

    // Left over for 3 hours, no run going: asked.
    await queue(store, app, ago(182 * MIN));
    await queue(store, app, ago(ASK_AGAIN_AFTER_MS));
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 2, asked: true });
    expect(start).toHaveBeenCalledTimes(1);

    // A run going (or waiting its turn) takes the queue when it starts: not asked again.
    runs.mockResolvedValue({ going: true, latestAt: ago(30 * MIN) });
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 2, asked: false });
    // A run made less than 10 minutes ago took what it could (or failed at once): not asked every 5 minutes.
    runs.mockResolvedValue({ going: false, latestAt: ago(4 * MIN) });
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 2, asked: false });
    expect(start).toHaveBeenCalledTimes(1);
    // No run ever made: asked.
    runs.mockResolvedValue({ going: false, latestAt: null });
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 2, asked: true });

    // GitHub can't say: asked all the same; a refused ask isn't counted as asked.
    runs.mockResolvedValue(null);
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 2, asked: true });
    start.mockResolvedValue(false);
    expect(await askPipelineAgain({ store, now: NOW, start, runs })).toEqual({ waiting: 2, asked: false });
    expect(start).toHaveBeenCalledTimes(4);
  });

  it("is part of the frequent job when the pipeline can be started", async () => {
    const { store, app } = await storeWithApp();
    await queue(store, app, ago(182 * MIN));
    const startPipeline = vi.fn().mockResolvedValue(true);
    const pipelineRuns = vi.fn().mockResolvedValue({ going: false, latestAt: ago(3 * 60 * MIN) });
    const report = await runFrequentJobs({ store, key: KEY, now: NOW, ownerPush: { store, now: NOW, account: null }, startPipeline, pipelineRuns });
    expect(report.pipeline).toEqual({ waiting: 1, asked: true });
    expect(startPipeline).toHaveBeenCalled();

    // Without a way to read GitHub's runs (tests, an older deploy's deps): nothing is asked.
    const without = await runFrequentJobs({ store, key: KEY, now: NOW, ownerPush: { store, now: NOW, account: null }, startPipeline: vi.fn() });
    expect(without.pipeline).toEqual({ waiting: 0, asked: false });
  });
});

describe("140 the build workflow's latest runs", () => {
  const runs = (...list: { status: string; created_at?: string }[]) => new Response(JSON.stringify({ total_count: list.length, workflow_runs: list }), { status: 200 });

  it("can't say without a token, and doesn't call GitHub", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "");
    expect(await pipelineRuns()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the latest runs: one not completed is a run going, and when the latest was made", async () => {
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "github_pat_test");
    const fetch = vi.fn().mockResolvedValue(runs({ status: "completed", created_at: "2026-11-17T18:20:54Z" }, { status: "completed", created_at: "2026-11-17T15:18:09Z" }));
    vi.stubGlobal("fetch", fetch);
    expect(await pipelineRuns()).toEqual({ going: false, latestAt: new Date("2026-11-17T18:20:54Z") });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/repos/WEBEK-LTD/app-lms/actions/workflows/build-apps.yml/runs?per_page=20&exclude_pull_requests=true");
    expect(init.method).toBeUndefined();
    expect(init.headers.Authorization).toBe("Bearer github_pat_test");

    // Waiting its turn behind another run, waiting for a runner (a Mac), or running.
    for (const status of ["pending", "queued", "in_progress", "waiting", "requested"]) {
      fetch.mockResolvedValueOnce(runs({ status: "completed", created_at: "2026-11-17T18:00:00Z" }, { status, created_at: "2026-11-17T17:00:00Z" }));
      expect(await pipelineRuns()).toEqual({ going: true, latestAt: new Date("2026-11-17T18:00:00Z") });
    }
    fetch.mockResolvedValueOnce(runs());
    expect(await pipelineRuns()).toEqual({ going: false, latestAt: null });
    fetch.mockResolvedValueOnce(runs({ status: "completed" }));
    expect(await pipelineRuns()).toEqual({ going: false, latestAt: null });
  });

  it("can't say when GitHub refuses or can't be reached, and never throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("GITHUB_DISPATCH_TOKEN", "github_pat_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
    expect(await pipelineRuns()).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await pipelineRuns()).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));
    expect(await pipelineRuns()).toBeNull();
  });
});
