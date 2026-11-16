import { storeAndLimit } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { json, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { startSiteStorePayment } from "@/lib/selling/in-app-pay";

/** 134 POST /api/v1/store/payments (docs/api/platform.yaml: startStorePayment) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.storePaymentsIp);
  if (limited) return limited;
  const result = await startSiteStorePayment(store, await readJson(request), { now: new Date(), platformUrl: appUrl() });
  return json(result.body, result.status);
}
