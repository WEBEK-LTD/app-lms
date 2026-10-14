import { assetUrl } from "@/lib/assets";
import { getStore } from "@/lib/data";
import { appUrl, signingSecret } from "@/lib/env";
import { ipFromHeaders, json, rateLimited } from "@/lib/http";
import { corsHeaders, preflight, previewOrigins } from "@/lib/preview/cors";
import { previewConfigResult } from "@/lib/preview/service";
import { previewKey } from "@/lib/preview/token";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/** GET /api/preview/{token}/config (docs/api/platform.yaml: getPreviewConfig): the app preview's build config. */
export async function GET(request: Request, { params }: RouteContext<"/api/preview/[token]/config">): Promise<Response> {
  const cors = corsHeaders(request.headers.get("origin"), previewOrigins(appUrl()), "GET, OPTIONS");
  const store = await getStore();
  const limit = await hitRateLimit(store, RATE_LIMITS.previewIp, ipFromHeaders(request.headers));
  if (!limit.allowed) {
    const limited = rateLimited(limit.retryAfter);
    for (const [name, value] of Object.entries(cors)) limited.headers.set(name, value);
    return limited;
  }
  const { token } = await params;
  const result = await previewConfigResult(store, token, new Date(), { key: previewKey(signingSecret()), platformUrl: appUrl(), assetUrl });
  return json(result.body, result.status, { ...cors, "x-robots-tag": "noindex" });
}

export function OPTIONS(request: Request): Response {
  return preflight(request.headers.get("origin"), previewOrigins(appUrl()), "GET, OPTIONS");
}
