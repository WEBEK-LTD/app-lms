import { storeAndLimit } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { json, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { startSiteBillingSession } from "@/lib/store-billing/sessions";

/** 100.3 POST /api/v1/billing/sessions (docs/api/platform.yaml: startBillingSession) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.billingSessionsIp);
  if (limited) return limited;
  const result = await startSiteBillingSession(store, await readJson(request), { now: new Date(), platformUrl: appUrl() });
  return json(result.body, result.status);
}
