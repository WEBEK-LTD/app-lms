import { applyPipelineStatus, buildSummary, pipelineStatusSchema, saveSigningFacts } from "@/lib/builds/pipeline";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { forgetLinkTargets } from "@/lib/links/files";
import { notifyBuildFinished } from "@/lib/builds/notify";
import { errorResponse, json, readJson } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";
import { noteMilestones } from "@/lib/milestones/record";
import { notePlayRelease } from "@/lib/publishing/service";
import { teamMail } from "@/lib/watch/env";
import { alertNoMac } from "@/lib/watch/watch";

/** POST /api/v1/builds/{id}/status (docs/api/pipeline.yaml): the pipeline reports progress and artifacts. */
export async function POST(request: Request, { params }: RouteContext<"/api/v1/builds/[id]/status">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const { store } = auth;
  const build = await store.getBuild((await params).id);
  if (!build) return errorResponse(404, "build_not_found", "There's no build with this ID.");

  const body = await readJson(request, 64_000);
  const parsed = pipelineStatusSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errorResponse(400, "invalid_request", issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid status report.");
  }
  const result = await applyPipelineStatus(store, build, parsed.data, new Date());
  if (!result.ok) return errorResponse(409, result.code, result.message);
  // 46 The upload key's fingerprint and the Team ID go into the link files, here and on the client's site.
  if (await saveSigningFacts(store, build.appId, parsed.data.signing, new Date())) {
    forgetLinkTargets();
    refreshSitesSoon([build.appId]);
  }

  // 138 A Google Play draft (the app's first release, sent by hand): the app's publishing account and the team are told once.
  if (parsed.data.play) await notePlayRelease(store, result.build, new Date()).catch((error: unknown) => console.error("[publishing] play draft notice", error instanceof Error ? error.message : String(error)));
  // Finished just now: the client is emailed, and the team too when it failed.
  const finished = result.build.status !== build.status && (result.build.status === "ready" || result.build.status === "failed");
  if (finished) await notifyBuildFinished(store, result.build).catch(() => undefined);
  // 151 GitHub had no Mac for the iOS job: the team's one alert for this build (never built again by itself).
  if (finished) await alertNoMac(store, result.build, new Date(), teamMail).catch(() => undefined);
  // 78 The first build, the first that worked, the first upload to a store.
  if (result.build.status !== build.status) await noteMilestones(store, build.clientId);
  return json(buildSummary(result.build));
}
