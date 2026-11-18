import { claimAppCheck } from "@/lib/builds/app-check-run";
import { appUrl, signingSecret } from "@/lib/env";
import { errorResponse, json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/** POST /api/v1/builds/{id}/app-check/claim (docs/api/pipeline.yaml, 182): the check after the build starts; the preview link and what to open. */
export async function POST(request: Request, { params }: RouteContext<"/api/v1/builds/[id]/app-check/claim">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const build = await auth.store.getBuild((await params).id);
  if (!build) return errorResponse(404, "build_not_found", "There's no build with this ID.");
  const result = await claimAppCheck(auth.store, build, new Date(), { url: appUrl(), signingSecret: signingSecret() });
  if (!result.ok) return errorResponse(409, result.code, result.message);
  return json(result.plan);
}
