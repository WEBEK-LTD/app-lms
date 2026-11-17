import { queuedRuns } from "@/lib/app/auto-screenshots-jobs";
import { json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/** GET /api/v1/screenshots/queue (docs/api/pipeline.yaml, 139): the store screenshot runs waiting, oldest first. */
export async function GET(request: Request): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") ?? "10") || 10, 1), 50);
  return json({ runs: await queuedRuns(auth.store, limit) });
}
