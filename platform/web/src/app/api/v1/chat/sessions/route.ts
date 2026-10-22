import { storeAndLimit } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { json, readJson } from "@/lib/http";
import { siteChatSession } from "@/lib/license/chat";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** 77 POST /api/v1/chat/sessions (docs/api/platform.yaml: startChatSession) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.chatSessionsIp);
  if (limited) return limited;
  const result = await siteChatSession(store, await readJson(request), { now: new Date(), platformUrl: appUrl() });
  const retry = "retry_after_seconds" in result.body ? result.body.retry_after_seconds : undefined;
  return json(result.body, result.status, retry ? { "retry-after": String(retry) } : {});
}
