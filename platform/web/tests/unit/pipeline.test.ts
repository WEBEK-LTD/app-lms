import { describe, expect, it } from "vitest";
import { applyPipelineStatus, pipelineStatusSchema } from "@/lib/builds/pipeline";
import { hasBearerToken } from "@/lib/http";
import type { Build } from "@/lib/data/types";
import { MemoryStore } from "@/lib/data/memory";
import { NOW, days } from "./helpers";

async function queuedBuild(store: MemoryStore): Promise<Build> {
  return store.createBuild({
    id: "b1",
    clientId: "c1",
    appId: "a1",
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
}

describe("pipeline status reports", () => {
  it("moves a build through building to ready with artifacts", async () => {
    const store = new MemoryStore();
    const build = await queuedBuild(store);
    const building = await applyPipelineStatus(store, build, { status: "building", stages: { android: "running" } }, days(1));
    expect(building.ok && building.build).toMatchObject({ status: "building", startedAt: days(1), finishedAt: null });
    const update = pipelineStatusSchema.parse({
      status: "ready",
      stages: { android: "done", ios: "done" },
      artifacts: [{ kind: "apk", url: "https://files.yallapp.com.tr/b1/app.apk", size: 100 }],
      log_url: "https://github.com/x/y/actions/runs/1",
    });
    const ready = await applyPipelineStatus(store, (await store.getBuild("b1"))!, update, days(2));
    expect(ready.ok).toBe(true);
    const stored = await store.getBuild("b1");
    expect(stored).toMatchObject({ status: "ready", startedAt: days(1), finishedAt: days(2) });
    expect(stored?.stages).toMatchObject({ queued: "done", android: "done", ios: "done", upload_play: "skipped" });
    expect(stored?.artifacts[0]?.kind).toBe("apk");
  });

  it("doesn't change finished builds", async () => {
    const store = new MemoryStore();
    const build = await queuedBuild(store);
    await applyPipelineStatus(store, build, { status: "failed", message: "Gradle failed" }, NOW);
    const again = await applyPipelineStatus(store, (await store.getBuild("b1"))!, { status: "building" }, NOW);
    expect(again).toMatchObject({ ok: false, code: "build_finished" });
  });

  it("validates reports strictly", () => {
    expect(pipelineStatusSchema.safeParse({ status: "done" }).success).toBe(false);
    expect(pipelineStatusSchema.safeParse({ stages: { deploy: "done" } }).success).toBe(false);
    expect(pipelineStatusSchema.safeParse({ artifacts: [{ kind: "apk", url: "http://insecure" }] }).success).toBe(false);
    expect(pipelineStatusSchema.safeParse({ extra: 1 }).success).toBe(false);
    expect(pipelineStatusSchema.safeParse({}).success).toBe(true);
  });

  it("checks the pipeline bearer token", () => {
    const request = (auth?: string) => new Request("https://x.test", { headers: auth ? { authorization: auth } : {} });
    expect(hasBearerToken(request("Bearer token-123"), "token-123")).toBe(true);
    expect(hasBearerToken(request("bearer token-123"), "token-123")).toBe(true);
    expect(hasBearerToken(request("Bearer token-124"), "token-123")).toBe(false);
    expect(hasBearerToken(request(), "token-123")).toBe(false);
    expect(hasBearerToken(request("Bearer token-123"), undefined)).toBe(false);
  });
});
