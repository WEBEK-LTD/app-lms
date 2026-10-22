import type { DataStore } from "../data/store";
import type { WatchedJob } from "../data/types";

/**
 * 78.3 Each run of a scheduled job is recorded (`job_runs`): when it started
 * and finished, whether it went well and what it did (its JSON answer), so
 * Admin › Watching shows them and a job that stopped running is noticed.
 */

const SUMMARY_MAX = 4000;

/** Runs a job's work, recording its run. The work's error is recorded and thrown again; recording never fails the work. */
export async function recordJobRun<T>(store: DataStore, job: WatchedJob, clock: () => Date, work: () => Promise<T>): Promise<T> {
  let id: number | null = null;
  try {
    id = await store.startJobRun(job, clock());
  } catch (error) {
    console.error(`[watch] ${job} run`, error instanceof Error ? error.message : String(error));
  }
  const finish = async (result: { ok: boolean; summary: string | null; error: string | null }) => {
    if (id === null) return;
    try {
      await store.finishJobRun(id, { finishedAt: clock(), ...result });
    } catch (error) {
      console.error(`[watch] ${job} run`, error instanceof Error ? error.message : String(error));
    }
  };
  try {
    const result = await work();
    await finish({ ok: true, summary: summaryOf(result), error: null });
    return result;
  } catch (error) {
    await finish({ ok: false, summary: null, error: (error instanceof Error ? error.message : String(error)).slice(0, 500) });
    throw error;
  }
}

function summaryOf(result: unknown): string | null {
  if (result === undefined) return null;
  try {
    const text = JSON.stringify(result);
    return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX - 1)}…` : text;
  } catch {
    return null;
  }
}

/** The build pipeline asked for builds: noted as a run of its own. */
export async function notePipelinePoll(store: DataStore, now: Date, builds: number): Promise<void> {
  try {
    const id = await store.startJobRun("pipeline", now);
    await store.finishJobRun(id, { finishedAt: now, ok: true, summary: JSON.stringify({ builds }), error: null });
  } catch (error) {
    console.error("[watch] pipeline", error instanceof Error ? error.message : String(error));
  }
}

/** How long each job may go without a good run before it counts as missing. */
export const JOB_EXPECTED_MS: Record<WatchedJob, number> = {
  // Once a day at 06:10 UTC: two hours' slack.
  daily: 26 * 3_600_000,
  // Every 5 minutes.
  frequent: 20 * 60_000,
  webhooks: 20 * 60_000,
  // GitHub runs the hourly schedule late, often hours late; the platform starts it at once with GITHUB_DISPATCH_TOKEN.
  pipeline: 8 * 3_600_000,
  // 79.2 Runs only when values need moving to the current key; never watched for being late.
  rekey: 365 * 86_400_000,
};

export const JOB_LABEL: Record<WatchedJob, string> = {
  daily: "Daily job",
  frequent: "Frequent job (every 5 minutes)",
  webhooks: "API webhooks (every 5 minutes)",
  pipeline: "Build pipeline (asks for builds)",
  rekey: "Encryption keys (moving values to the current key)",
};

/** Each job's last good run and whether it is late; a job with no run recorded yet isn't late (recording starts with Phase 78). */
export function jobStates(last: Partial<Record<WatchedJob, Date>>, now: Date, jobs: WatchedJob[]): { job: WatchedJob; last: Date | null; late: boolean }[] {
  return jobs.map((job) => {
    const at = last[job] ?? null;
    return { job, last: at, late: at !== null && now.getTime() - at.getTime() > JOB_EXPECTED_MS[job] };
  });
}
