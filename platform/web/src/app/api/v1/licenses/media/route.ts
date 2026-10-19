import { storeAndLimit } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { json, readJson } from "@/lib/http";
import { mediaLinks, parseMediaLinksRequest } from "@/lib/license/media";
import { getMediaStorage } from "@/lib/media/storage";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** 51 POST /api/v1/licenses/media (docs/api/platform.yaml: mediaLinks) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.mediaLinksIp);
  if (limited) return limited;
  const parsed = parseMediaLinksRequest(await readJson(request), appUrl());
  if (!parsed.ok) return json(parsed.result.body, parsed.result.status);
  const result = await mediaLinks(store, parsed.value, { storage: getMediaStorage(), baseUrl: appUrl(), now: new Date() });
  const retry = "retry_after_seconds" in result.body ? result.body.retry_after_seconds : undefined;
  return json(result.body, result.status, retry ? { "retry-after": String(retry) } : {});
}
