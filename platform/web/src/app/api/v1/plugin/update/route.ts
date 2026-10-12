import { limitByIp, pluginDownloadUrl, toResponse } from "@/lib/api";
import { getStore } from "@/lib/data";
import { noContent } from "@/lib/http";
import { parseUpdateQuery, pluginUpdate } from "@/lib/license/service";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** Download links in update responses stay valid long enough for WordPress's update cycle. */
const DOWNLOAD_TTL_SECONDS = 24 * 60 * 60;

/**
 * GET /api/v1/plugin/update (docs/api/platform.yaml: getPluginUpdate)
 * The contract has no 429 for this endpoint: a rate-limited caller gets 204
 * ("no update information"), which the WordPress updater already handles.
 */
export async function GET(request: Request): Promise<Response> {
  const parsed = parseUpdateQuery(new URL(request.url).searchParams);
  if (!parsed.ok) return toResponse(parsed.result);
  const store = await getStore();
  if (await limitByIp(store, request, RATE_LIMITS.updateIp)) return noContent();
  return toResponse(await pluginUpdate(store, parsed.value, new Date(), (release) => pluginDownloadUrl(release, DOWNLOAD_TTL_SECONDS)));
}
