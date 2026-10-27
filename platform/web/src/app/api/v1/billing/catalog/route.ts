import { storeAndLimit } from "@/lib/api";
import { json, noContent, readJson } from "@/lib/http";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { receiveSiteCatalog } from "@/lib/store-billing/catalog";

/** 100.2 POST /api/v1/billing/catalog (docs/api/platform.yaml: sendBillingCatalog) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.billingCatalogIp);
  if (limited) return limited;
  // 1,000 courses and 50 plans with their courses.
  const result = await receiveSiteCatalog(store, await readJson(request, 1_048_576), new Date());
  return result.status === 204 ? noContent() : json(result.body, result.status);
}
