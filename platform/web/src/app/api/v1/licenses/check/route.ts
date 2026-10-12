import { storeAndLimit, toResponse } from "@/lib/api";
import { readJson } from "@/lib/http";
import { checkLicense, parseSiteInfo } from "@/lib/license/service";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** POST /api/v1/licenses/check (docs/api/platform.yaml: checkLicense) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.licenseIp);
  if (limited) return limited;
  const parsed = parseSiteInfo(await readJson(request));
  if (!parsed.ok) return toResponse(parsed.result);
  return toResponse(await checkLicense(store, parsed.value, new Date()));
}
