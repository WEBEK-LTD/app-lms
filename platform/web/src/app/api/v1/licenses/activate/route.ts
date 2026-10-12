import { storeAndLimit, toResponse } from "@/lib/api";
import { readJson } from "@/lib/http";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** POST /api/v1/licenses/activate (docs/api/platform.yaml: activateLicense) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.licenseIp);
  if (limited) return limited;
  const parsed = parseSiteInfo(await readJson(request));
  if (!parsed.ok) return toResponse(parsed.result);
  return toResponse(await activateLicense(store, parsed.value, new Date()));
}
