import { FINGERPRINT, TEAM_ID } from "../links/well-known";
import { z } from "zod";
import type { DataStore } from "../data/store";
import { rolloutAfterReport } from "../publishing/rollout";
import { FAILURE_CODES, type Artifact, type Build, type BuildStages, type BuildStatus, type StageKey } from "../data/types";

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
        // 42
        upload_xiaomi: stageStatus.optional(),
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
    // 87.3 The commit the job builds from.
    source_commit: z.string().regex(/^[0-9a-f]{40}$/).optional(),
    // 87.2 Why it failed, as diagnose.py read the build's output.
    failure: z
      .object({
        code: z.enum(FAILURE_CODES),
        stage: z.enum(["android", "ios", "upload_play", "upload_testflight", "upload_galaxy", "upload_appgallery", "upload_xiaomi"]).optional(),
        log: z.string().max(20_000).optional(),
      })
      .strict()
      .nullable()
      .optional(),
    // 46 Public signing facts for the link files: the upload key's SHA-256 and the Apple Team ID.
    signing: z
      .object({
        android_upload_sha256: z.string().regex(FINGERPRINT).optional(),
        apple_team_id: z.string().regex(TEAM_ID).optional(),
      })
      .strict()
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
    failure: update.failure === undefined ? (build.failure ?? null) : update.failure,
    sourceCommit: update.source_commit ?? build.sourceCommit ?? null,
    startedAt: build.startedAt ?? (status === "building" || FINISHED.includes(status) ? now : null),
    finishedAt: FINISHED.includes(status) ? now : null,
  };
  await store.updateBuild(build.id, patch, now);
  // 89.2 A staged release starts once its store upload is done: kept on the app for the owner's controls.
  if (build.release) {
    const app = await store.getAppById(build.appId);
    const rollout = app ? rolloutAfterReport(app.rollout, build, stages, now) : null;
    if (app && rollout) await store.updateApp(app.id, { rollout }, now);
  }
  return { ok: true, build: { ...build, ...patch, updatedAt: now } };
}

/**
 * 46 Saves what a build reported about the app's signing on the app. True
 * when something changed: the link files (and the site's license status) differ.
 */
export async function saveSigningFacts(store: DataStore, appId: string, signing: PipelineStatusUpdate["signing"], now: Date): Promise<boolean> {
  if (!signing) return false;
  const app = await store.getAppById(appId);
  if (!app) return false;
  const patch: { androidUploadSha256?: string; appleTeamId?: string } = {};
  if (signing.android_upload_sha256 && signing.android_upload_sha256 !== app.androidUploadSha256) patch.androidUploadSha256 = signing.android_upload_sha256;
  if (signing.apple_team_id && signing.apple_team_id !== app.appleTeamId) patch.appleTeamId = signing.apple_team_id;
  if (Object.keys(patch).length === 0) return false;
  await store.updateApp(appId, patch, now);
  return true;
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
    // 87.3
    source_ref: build.sourceRef ?? null,
    source_commit: build.sourceCommit ?? null,
    rebuild_of: build.rebuildOf ?? null,
    // 89.2
    ...(build.release ? { release: { android_rollout: build.release.androidRollout, ios_phased: build.release.iosPhased } } : {}),
    created_at: build.createdAt.toISOString(),
    started_at: build.startedAt?.toISOString() ?? null,
    finished_at: build.finishedAt?.toISOString() ?? null,
  };
}
