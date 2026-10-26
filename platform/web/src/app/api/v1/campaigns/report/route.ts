import { storeAndLimit } from "@/lib/api";
import { json, noContent, readJson } from "@/lib/http";
import { reportSiteCampaign } from "@/lib/license/campaign-report";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** 85.4 POST /api/v1/campaigns/report (docs/api/platform.yaml: reportCampaign) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.chatSessionsIp);
  if (limited) return limited;
  const result = await reportSiteCampaign(store, await readJson(request), new Date());
  return result.status === 204 ? noContent() : json(result.body, result.status);
}
