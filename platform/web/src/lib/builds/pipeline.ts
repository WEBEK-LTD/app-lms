import { z } from "zod";
import type { DataStore } from "../data/store";
import type { Artifact, Build, BuildStages, BuildStatus, StageKey } from "../data/types";

/** What the build pipeline may report: see docs/api/pipeline.yaml. */
const stageStatus = z.enum(["pending", "running", "done", "failed", "skipped"]);

export const pipelineStatusSchema = z
  .object({
    status: z.enum(["queued", "building", "ready", "failed"]).optional(),
    stages: z
      .object({
        queued: stageStatus.optional(),
        android: stageStatus.optional(),
        ios: stageStatus.optional(),
        upload_play: stageStatus.optional(),
        upload_testflight: stageStatus.optional(),
        // 35, 36
        upload_galaxy: stageStatus.optional(),
        upload_appgallery: stageStatus.optional(),
      })
      .strict()
      .optional(),
    message: z.string().max(2000).nullable().optional(),
    log_url: z
      .string()
      .max(2048)
      .refine((value) => /^https:\/\//.test(value), "log_url must be an https URL")
      .nullable()
      .optional(),
    artifacts: z
      .array(
        z
          .object({
            kind: z.enum(["apk", "aab", "ipa", "keystore", "store_assets"]),
            url: z
              .string()
              .max(2048)
              .refine((value) => /^https:\/\//.test(value), "url must be an https URL"),
            size: z.number().int().nonnegative().optional(),
            sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
          })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();

export type PipelineStatusUpdate = z.infer<typeof pipelineStatusSchema>;

const FINISHED: BuildStatus[] = ["ready", "failed"];

export type ApplyResult = { ok: true; build: Build } | { ok: false; code: "build_finished"; message: string };

/** Applies a status report. Finished builds (ready or failed) can't change any more. */
export async function applyPipelineStatus(
  store: DataStore,
  build: Build,
  update: PipelineStatusUpdate,
  now: Date,
): Promise<ApplyResult> {
  if (FINISHED.includes(build.status)) {
    return { ok: false, code: "build_finished", message: `Build ${build.id} is already ${build.status}.` };
  }
  const status = update.status ?? build.status;
  const stages: BuildStages = { ...build.stages };
  for (const [key, value] of Object.entries(update.stages ?? {})) {
    if (value) stages[key as StageKey] = value;
  }
  const artifacts: Artifact[] = update.artifacts ?? build.artifacts;
  const patch = {
    status,
    stages,
    artifacts,
    message: update.message === undefined ? build.message : update.message,
    logUrl: update.log_url === undefined ? build.logUrl : update.log_url,
    startedAt: build.startedAt ?? (status === "building" || FINISHED.includes(status) ? now : null),
    finishedAt: FINISHED.includes(status) ? now : null,
  };
  await store.updateBuild(build.id, patch, now);
  return { ok: true, build: { ...build, ...patch, updatedAt: now } };
}

/** The JSON the pipeline gets about a build (without the config). */
export function buildSummary(build: Build) {
  return {
    id: build.id,
    client_id: build.clientId,
    app_id: build.appId,
    number: build.number,
    version_name: build.versionName,
    version_code: build.versionCode,
    status: build.status,
    auto_publish: build.autoPublish,
    // 13.1 Whether the build's plan includes the iOS app.
    ios: build.stages.ios !== "skipped",
    stages: build.stages,
    artifacts: build.artifacts,
    message: build.message,
    log_url: build.logUrl,
    created_at: build.createdAt.toISOString(),
    started_at: build.startedAt?.toISOString() ?? null,
    finished_at: build.finishedAt?.toISOString() ?? null,
  };
}
