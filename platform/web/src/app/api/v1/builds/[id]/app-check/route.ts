import { appCheckResultSchema, saveAppCheckResult } from "@/lib/builds/app-check-run";
import { errorResponse, json, readJson } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";
import { teamMail } from "@/lib/watch/env";

/**
 * POST /api/v1/builds/{id}/app-check (docs/api/pipeline.yaml, 182): what the
 * check after the build found. Taken whatever the build's state: the check
 * never holds the build, so it usually reports after the build finished.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/v1/builds/[id]/app-check">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const build = await auth.store.getBuild((await params).id);
  if (!build) return errorResponse(404, "build_not_found", "There's no build with this ID.");
  const parsed = appCheckResultSchema.safeParse(await readJson(request, 256_000));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errorResponse(400, "invalid_request", issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid check result.");
  }
  const saved = await saveAppCheckResult(auth.store, build, parsed.data, new Date(), teamMail);
  return json({ id: build.id, status: saved.status, issues: saved.issues.length });
}
