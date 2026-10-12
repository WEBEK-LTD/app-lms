import { errorResponse, json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/** GET /api/v1/builds/{id}/config (docs/api/pipeline.yaml): the build config snapshot, valid against docs/build-config.schema.json. */
export async function GET(request: Request, { params }: RouteContext<"/api/v1/builds/[id]/config">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const build = await auth.store.getBuild((await params).id);
  if (!build) return errorResponse(404, "build_not_found", "There's no build with this ID.");
  return json(build.config);
}
