import { receiveEvents } from "@/lib/analytics/service";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { json } from "@/lib/http";

/** 44 POST /api/v1/apps/{app_id}/events (docs/api/platform.yaml: sendAnalyticsEvents) */
export async function POST(request: Request, { params }: RouteContext<"/api/v1/apps/[appId]/events">): Promise<Response> {
  const { appId } = await params;
  const result = await receiveEvents(await getStore(), {
    appId,
    headers: request.headers,
    raw: await request.text(),
    secret: signingSecret(),
    now: new Date(),
  });
  return json(result.body, result.status, result.retryAfter ? { "retry-after": String(result.retryAfter) } : {});
}
