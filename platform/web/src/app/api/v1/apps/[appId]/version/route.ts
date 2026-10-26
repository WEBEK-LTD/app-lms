import { answerVersionCheck } from "@/lib/app/version-policy";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { json } from "@/lib/http";

/** 89.1 GET /api/v1/apps/{app_id}/version (docs/api/platform.yaml: getAppVersionPolicy) */
export async function GET(request: Request, { params }: RouteContext<"/api/v1/apps/[appId]/version">): Promise<Response> {
  const { appId } = await params;
  const result = await answerVersionCheck(await getStore(), {
    appId,
    headers: request.headers,
    query: new URL(request.url).searchParams,
    secret: signingSecret(),
    now: new Date(),
  });
  return json(result.body, result.status, result.retryAfter ? { "retry-after": String(result.retryAfter) } : {});
}
