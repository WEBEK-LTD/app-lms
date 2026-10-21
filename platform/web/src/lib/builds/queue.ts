import type { DataStore } from "../data/store";
import type { Build, StageStatus } from "../data/types";
import { appIsActive } from "../license/status";
import { applyPipelineStatus, type PipelineStatusUpdate } from "./pipeline";

/**
 * 68 The pipeline takes a queued build only while its app's plan is active.
 * A build queued before the plan ended (or before the account was suspended)
 * is closed as failed (`license_inactive` in docs/api/pipeline.yaml) with a
 * message for the client, and left out of `GET /builds/queue`. Both messages
 * are `known` texts in English, Arabic and Turkish (i18n/dashboard/builds.ts).
 */
export const PLAN_ENDED_BEFORE_START = "The app's plan ended before this build started. Renew the plan, then start the build again.";
export const SUSPENDED_BEFORE_START = "The account was suspended before this build started.";
/** 73 The owner deleted the app after queuing the build. */
export const APP_DELETED_BEFORE_START = "The app was deleted before this build started.";

export interface QueueTake {
  /** Builds the pipeline may take. */
  builds: Build[];
  /** Builds closed because their app's plan isn't active any more. */
  closed: Build[];
}

/** Checks each queued build's app plan again, closing the ones that can't be built. */
export async function takeQueuedBuilds(store: DataStore, queued: readonly Build[], now: Date): Promise<QueueTake> {
  const take: QueueTake = { builds: [], closed: [] };
  for (const build of queued) {
    if (build.status !== "queued") continue;
    const [client, license, app] = await Promise.all([store.getClientById(build.clientId), store.getLicenseForApp(build.clientId, build.appId), store.getAppById(build.appId)]);
    if (app && appIsActive(license, client, now)) {
      take.builds.push(build);
      continue;
    }
    // Nothing ran: the queue stage failed and the rest never started.
    const stages = Object.fromEntries(Object.entries(build.stages).map(([key, value]) => [key, key === "queued" ? "failed" : value === "pending" ? "skipped" : value])) as Record<string, StageStatus>;
    const result = await applyPipelineStatus(
      store,
      build,
      {
        status: "failed",
        stages: stages as PipelineStatusUpdate["stages"],
        message: !app ? APP_DELETED_BEFORE_START : client?.status === "suspended" ? SUSPENDED_BEFORE_START : PLAN_ENDED_BEFORE_START,
      },
      now,
    );
    if (result.ok) take.closed.push(result.build);
  }
  return take;
}
