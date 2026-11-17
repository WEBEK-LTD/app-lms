import "server-only";
import { githubDispatch } from "@/lib/env";

const WORKFLOW = "build-apps.yml";
/** 139 The store screenshots' workflow: Linux only, never the macOS minutes. */
const SCREENSHOTS_WORKFLOW = "store-screenshots.yml";

/**
 * Starts the build workflow now (build/README.md). Best effort: if GitHub
 * can't be reached, the workflow's schedule picks the build up within the hour.
 */
export async function startPipeline(): Promise<boolean> {
  return dispatch(WORKFLOW);
}

/** 140 The build workflow's latest runs, as the platform needs them to ask again. */
export interface PipelineRuns {
  /** A run hasn't finished: waiting its turn, waiting for a runner, or running. */
  going: boolean;
  /** When the latest run was made, if there is one. */
  latestAt: Date | null;
}

/**
 * 140 Reads the build workflow's latest runs. Runs go one at a time, so a run
 * going takes the queue's builds itself or keeps a waiting run from starting.
 * null when GitHub can't be asked (no token, a refusal, no answer).
 */
export async function pipelineRuns(): Promise<PipelineRuns | null> {
  try {
    const config = githubDispatch();
    if (!config) return null;
    const response = await fetch(`https://api.github.com/repos/${config.repository}/actions/workflows/${WORKFLOW}/runs?per_page=20&exclude_pull_requests=true`, {
      headers: githubHeaders(config.token),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Reading the ${WORKFLOW} runs failed: GitHub answered ${response.status}.`);
      return null;
    }
    const body = (await response.json()) as { workflow_runs?: { status?: string; created_at?: string }[] };
    const runs = body.workflow_runs ?? [];
    // Newest first: the run going and the one waiting its turn are among the latest, after any replaced waiting runs.
    const made = runs.map((run) => Date.parse(run.created_at ?? "")).filter((time) => Number.isFinite(time));
    return { going: runs.some((run) => run.status !== "completed"), latestAt: made.length ? new Date(Math.max(...made)) : null };
  } catch (error) {
    console.error(`Reading the ${WORKFLOW} runs failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** 139 Starts the store screenshots' workflow now; its hourly schedule takes the runs otherwise. */
export async function startScreenshots(): Promise<boolean> {
  return dispatch(SCREENSHOTS_WORKFLOW);
}

async function dispatch(workflow: string): Promise<boolean> {
  try {
    // Inside the try: a misconfigured token never fails the request that queued the build.
    const config = githubDispatch();
    if (!config) return false;
    const response = await fetch(`https://api.github.com/repos/${config.repository}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: { ...githubHeaders(config.token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error(`Starting the ${workflow} workflow failed: GitHub answered ${response.status}.`);
    return response.ok;
  } catch (error) {
    console.error(`Starting the ${workflow} workflow failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}

function githubHeaders(token: string): Record<string, string> {
  return { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" };
}
