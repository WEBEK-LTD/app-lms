import { storeAndLimit, toResponse } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { json, noContent, readJson } from "@/lib/http";
import { parseSiteInfo } from "@/lib/license/service";
import { pluginLayout } from "@/lib/pages/plugin";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** POST /api/v1/apps/layout (docs/api/platform.yaml: getAppLayout) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.licenseIp);
  if (limited) return limited;
  const parsed = parseSiteInfo(await readJson(request));
  if (!parsed.ok) return toResponse(parsed.result);
  const result = await pluginLayout(store, parsed.value, request.headers.get("if-none-match"), new Date(), appUrl());
  if (result.status === 204) return noContent();
  if (result.status === 304) return new Response(null, { status: 304, headers: { "cache-control": "no-store" } });
  if (result.status === 200) return json(result.body, 200, { etag: `"${result.etag}"` });
  return json(result.body, result.status);
}
