import "server-only";
import { githubDispatch } from "@/lib/env";

const WORKFLOW = "build-apps.yml";

/**
 * Starts the build workflow now (build/README.md). Best effort: if GitHub
 * can't be reached, the workflow's schedule picks the build up within the hour.
 */
export async function startPipeline(): Promise<boolean> {
  try {
    // Inside the try: a misconfigured token never fails the request that queued the build.
    const config = githubDispatch();
    if (!config) return false;
    const response = await fetch(`https://api.github.com/repos/${config.repository}/actions/workflows/${WORKFLOW}/dispatches`, {
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
    if (!response.ok) console.error(`Starting the build workflow failed: GitHub answered ${response.status}.`);
    return response.ok;
  } catch (error) {
    console.error("Starting the build workflow failed:", error instanceof Error ? error.message : error);
    return false;
  }
}
