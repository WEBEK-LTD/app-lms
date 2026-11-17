import type { DataStore } from "../data/store";
import type { PipelineRuns } from "./dispatch";

/** 140 How long a queued build waits before the platform asks GitHub again. */
export const ASK_AGAIN_AFTER_MS = 10 * 60_000;

export interface AskAgainReport {
  /** Queued builds that waited 10 minutes or more. */
  waiting: number;
  /** Whether GitHub was asked to start the build workflow. */
  asked: boolean;
}

/**
 * 140 Builds never left in the queue: a build still queued 10 minutes after it
 * was queued, with no run of the build workflow going, has GitHub asked to
 * start a run again (the frequent job, every 5 minutes). A run takes 5 builds
 * (`platform.py queue`) and runs go one at a time, so asks made while one runs
 * are folded into a single waiting run, and GitHub's hourly schedule often
 * doesn't run at all: a build left over waited for the next build queued.
 * With a run going, nothing is asked: it, or the run waiting its turn, takes
 * the queue when it starts. Nor within 10 minutes of the latest run: it took
 * what it could, and a pipeline that fails at once (its token refused) isn't
 * started every 5 minutes. When GitHub can't say, it's asked all the same.
 */
export async function askPipelineAgain(deps: {
  store: DataStore;
  now: Date;
  start: () => Promise<unknown>;
  runs: () => Promise<PipelineRuns | null>;
}): Promise<AskAgainReport> {
  const queued = await deps.store.listBuilds({ status: "queued", limit: 100 });
  const waiting = queued.filter((build) => deps.now.getTime() - build.createdAt.getTime() >= ASK_AGAIN_AFTER_MS).length;
  if (waiting === 0) return { waiting, asked: false };
  const runs = await deps.runs();
  if (runs?.going) return { waiting, asked: false };
  if (runs?.latestAt && deps.now.getTime() - runs.latestAt.getTime() < ASK_AGAIN_AFTER_MS) return { waiting, asked: false };
  return { waiting, asked: (await deps.start()) !== false };
}
