import { applyPipelineStatus, buildSummary, pipelineStatusSchema } from "@/lib/builds/pipeline";
import type { DataStore } from "@/lib/data/store";
import { appUrl } from "@/lib/env";
import { errorResponse, json, readJson } from "@/lib/http";
import { sendMail } from "@/lib/mail";
import { authorizePipeline } from "@/lib/pipeline-auth";

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

  const finished = result.build.status !== build.status && (result.build.status === "ready" || result.build.status === "failed");
  if (finished) await notifyClient(store, result.build.clientId, result.build.number, result.build.status === "ready").catch(() => undefined);
  return json(buildSummary(result.build));
}

async function notifyClient(store: DataStore, clientId: string, number: number, ready: boolean): Promise<void> {
  const client = await store.getClientById(clientId);
  const user = client ? await store.getUserById(client.userId) : null;
  if (!user) return;
  await sendMail({
    to: user.email,
    subject: ready ? `Build #${number} of your app is ready` : `Build #${number} of your app didn't finish`,
    text: ready
      ? `Hello ${user.name},\n\nBuild #${number} is ready. Your files are on the Builds & downloads page:\n${appUrl()}/dashboard/builds\n\nYallapp`
      : `Hello ${user.name},\n\nBuild #${number} didn't finish. We've been notified and will look into it. You can follow it here:\n${appUrl()}/dashboard/builds\n\nYallapp`,
  });
}
