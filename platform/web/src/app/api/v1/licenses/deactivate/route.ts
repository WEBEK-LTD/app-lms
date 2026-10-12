import { storeAndLimit, toResponse } from "@/lib/api";
import { readJson } from "@/lib/http";
import { deactivateLicense } from "@/lib/license/service";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** POST /api/v1/licenses/deactivate (docs/api/platform.yaml: deactivateLicense) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.licenseIp);
  if (limited) return limited;
  return toResponse(await deactivateLicense(store, await readJson(request)));
}
