import { claimRun } from "@/lib/app/auto-screenshots-jobs";
import { appUrl, signingSecret } from "@/lib/env";
import { errorResponse, json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/** POST /api/v1/screenshots/{id}/claim (docs/api/pipeline.yaml, 139): the run starts; the app preview's link and the shots to take. */
export async function POST(request: Request, { params }: RouteContext<"/api/v1/screenshots/[id]/claim">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const result = await claimRun(auth.store, (await params).id, new Date(), { url: appUrl(), signingSecret: signingSecret() });
  if (!result.ok) {
    return result.reason === "not_ready"
      ? errorResponse(409, "not_ready", "The app has no content or name yet: the run was closed.")
      : errorResponse(404, "run_not_found", "There's no screenshots run waiting with this ID.");
  }
  return json(result.plan);
}
