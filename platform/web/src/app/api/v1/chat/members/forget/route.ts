import { storeAndLimit } from "@/lib/api";
import { json, noContent, readJson } from "@/lib/http";
import { forgetSiteMember } from "@/lib/license/chat";
import { getMediaStorage } from "@/lib/media/storage";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** 77 POST /api/v1/chat/members/forget (docs/api/platform.yaml: forgetChatMember) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.chatSessionsIp);
  if (limited) return limited;
  const result = await forgetSiteMember(store, await readJson(request), { now: new Date(), storage: getMediaStorage() });
  return result.status === 204 ? noContent() : json(result.body, result.status);
}
