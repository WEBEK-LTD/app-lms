import { buildHasIos } from "@/lib/app/setup";
import { buildSecrets, isBuilding } from "@/lib/builds/signing";
import { encryptionKey } from "@/lib/env";
import { errorResponse, json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";
import { appReviewSecret, type AppReviewSecret } from "@/lib/publishing/app-review-secret";
import type { App } from "@/lib/data/types";

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
  // 102.2 The reviewers' sign-in, with the client's contact, for App Review Information: only to builds that upload ("We publish for you").
  let appReview: ((target: App, key: Buffer) => AppReviewSecret | null) | undefined;
  if (build.autoPublish) {
    const [publishing, client] = await Promise.all([store.getPublishingRequest(app.id), store.getClientById(app.clientId)]);
    const user = client ? await store.getUserById(client.userId) : null;
    appReview = (target, key) => appReviewSecret(target, key, { listingNotes: publishing?.listing.reviewNotes ?? null, client, user });
  }
  return json(buildSecrets(app, encryptionKey(), { ios: buildHasIos(build), autoPublish: build.autoPublish, appReview }));
}
