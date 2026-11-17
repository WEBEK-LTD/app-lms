import { z } from "zod";
import { finishRun } from "@/lib/app/auto-screenshots-jobs";
import { errorResponse, json, readJson } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";

const body = z.object({ status: z.enum(["done", "failed"]), message: z.string().max(2000).nullish() });

/** POST /api/v1/screenshots/{id}/status (docs/api/pipeline.yaml, 139): the run finished, done or failed. */
export async function POST(request: Request, { params }: RouteContext<"/api/v1/screenshots/[id]/status">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const parsed = body.safeParse(await readJson(request, 8_000));
  if (!parsed.success) return errorResponse(400, "invalid_body", "Send status done or failed, with an optional message.");
  const result = await finishRun(auth.store, (await params).id, parsed.data, new Date());
  if (!result.ok) return errorResponse(404, "run_not_found", "There's no screenshots run going on with this ID.");
  return json({ state: result.auto.state, made_at: result.auto.madeAt, shots: result.auto.shots.length });
}
