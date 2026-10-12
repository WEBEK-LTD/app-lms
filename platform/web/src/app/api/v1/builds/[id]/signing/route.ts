import { isBuilding, saveSigningKeys, signingKeysSchema } from "@/lib/builds/signing";
import { encryptionKey } from "@/lib/env";
import { errorResponse, noContent, readJson } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

/**
 * PUT /api/v1/builds/{id}/signing (docs/api/pipeline.yaml): saves the signing
 * keys the pipeline created, encrypted, for every later build of the app.
 * Only while the build is `building`. A saved key is never overwritten
 * (409 key_exists): see saveSigningKeys.
 */
export async function PUT(request: Request, { params }: RouteContext<"/api/v1/builds/[id]/signing">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const { store } = auth;
  const build = await store.getBuild((await params).id);
  const app = build ? await store.getAppById(build.appId) : null;
  if (!build || !app) return errorResponse(404, "build_not_found", "There's no build with this ID.");

  // Room for two 20,000-character keystores, their passwords and the JSON around them.
  const body = await readJson(request, 64_000);
  const parsed = signingKeysSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errorResponse(400, "invalid_request", issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid signing keys.");
  }
  if (!isBuilding(build)) {
    return errorResponse(409, "build_not_building", `Build ${build.id} is ${build.status}. Keys can only be saved while it's building.`);
  }
  const result = await saveSigningKeys(store, app, parsed.data, encryptionKey(), new Date());
  if (!result.ok) return errorResponse(409, result.code, result.message);
  return noContent();
}
