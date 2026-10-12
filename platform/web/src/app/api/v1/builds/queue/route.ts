import { buildSummary } from "@/lib/builds/pipeline";
import { json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/** GET /api/v1/builds/queue (docs/api/pipeline.yaml): queued builds, oldest first. */
export async function GET(request: Request): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? "20") || 20, 1), 100);
  const builds = await auth.store.listBuilds({ status: "queued", limit });
  return json({ builds: builds.map(buildSummary) });
}
