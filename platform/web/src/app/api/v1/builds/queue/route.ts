import { notifyBuildFinished } from "@/lib/builds/notify";
import { buildSummary } from "@/lib/builds/pipeline";
import { APP_DELETED_BEFORE_START, takeQueuedBuilds } from "@/lib/builds/queue";
import { json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";
import { notePipelinePoll } from "@/lib/watch/runs";

/**
 * GET /api/v1/builds/queue (docs/api/pipeline.yaml): queued builds, oldest
 * first. 68 Each one's app plan is checked again: a build whose plan ended
 * (or whose account was suspended) since it was queued is closed as failed,
 * its client emailed, and it isn't listed.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? "20") || 20, 1), 100);
  const queued = await auth.store.listBuilds({ status: "queued", limit });
  const { builds, closed } = await takeQueuedBuilds(auth.store, queued, new Date());
  // The client hears why (in their language); our team has nothing to look at. 73 Not for an app the owner deleted.
  for (const build of closed) if (build.message !== APP_DELETED_BEFORE_START) await notifyBuildFinished(auth.store, build, { team: false }).catch(() => undefined);
  // 78.3 The pipeline is alive: noted, so Admin › Watching sees when it last asked.
  await notePipelinePoll(auth.store, new Date(), builds.length);
  return json({ builds: builds.map(buildSummary) });
}
