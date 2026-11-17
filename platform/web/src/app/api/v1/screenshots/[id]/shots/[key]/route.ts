import { saveRunShot } from "@/lib/app/auto-screenshots-jobs";
import { screenshotSaver } from "@/lib/app/auto-screenshots-assets";
import { errorResponse, json } from "@/lib/http";
import { authorizePipeline } from "@/lib/pipeline-auth";
import { SCREENSHOT_MAX_BYTES } from "@/lib/store-files";

/**
 * PUT /api/v1/screenshots/{id}/shots/{key} (docs/api/pipeline.yaml, 139):
 * one screenshot of the run, a PNG or JPEG at its device's store size. The
 * owner's own screenshot in that place is kept (409).
 */
export async function PUT(request: Request, { params }: RouteContext<"/api/v1/screenshots/[id]/shots/[key]">): Promise<Response> {
  const auth = await authorizePipeline(request);
  if ("response" in auth) return auth.response;
  const { id, key } = await params;
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > SCREENSHOT_MAX_BYTES) return errorResponse(413, "too_large", `A screenshot can be at most ${SCREENSHOT_MAX_BYTES / 1024 / 1024} MB.`);
  const data = Buffer.from(await request.arrayBuffer());
  if (data.length === 0) return errorResponse(422, "invalid_image", "Send the screenshot as the request body.");
  if (data.length > SCREENSHOT_MAX_BYTES) return errorResponse(413, "too_large", `A screenshot can be at most ${SCREENSHOT_MAX_BYTES / 1024 / 1024} MB.`);
  const result = await saveRunShot(auth.store, id, decodeURIComponent(key), data, new Date(), screenshotSaver(auth.store));
  if (!result.ok) return errorResponse(result.status, result.code, result.message);
  return json({ asset_id: result.assetId });
}
