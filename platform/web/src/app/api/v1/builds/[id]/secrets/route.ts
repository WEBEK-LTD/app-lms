import { buildHasIos } from "@/lib/app/setup";
import { buildSecrets, isBuilding } from "@/lib/builds/signing";
import { encryptionKey } from "@/lib/env";
import { errorResponse, json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/**
 * GET /api/v1/builds/{id}/secrets (docs/api/pipeline.yaml): the signing keys
 * from earlier builds and the client's store keys, decrypted. Only while the
 * build is `building`.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/v1/builds/[id]/secrets">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const { store } = auth;
  const build = await store.getBuild((await params).id);
  const app = build ? await store.getAppById(build.appId) : null;
  if (!build || !app) return errorResponse(404, "build_not_found", "There's no build with this ID.");
  if (!isBuilding(build)) {
    return errorResponse(409, "build_not_building", `Build ${build.id} is ${build.status}. Keys are only available while it's building.`);
  }
  return json(buildSecrets(app, encryptionKey(), { ios: buildHasIos(build) }));
}
