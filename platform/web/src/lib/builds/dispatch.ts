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
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
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
