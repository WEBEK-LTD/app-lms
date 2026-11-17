import { storeAndLimit } from "@/lib/api";
import { encryptionKey } from "@/lib/env";
import { json, readJson } from "@/lib/http";
import { parsePushRelayRequest, PUSH_RELAY_BODY_BYTES, relayPush } from "@/lib/license/push-relay";
import { RATE_LIMITS } from "@/lib/rate-limit";

/** POST /api/v1/push/send (docs/api/platform.yaml: sendPush) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.pushRelayIp);
  if (limited) return limited;
  const parsed = parsePushRelayRequest(await readJson(request, PUSH_RELAY_BODY_BYTES));
  if (!parsed.ok) return json(parsed.result.body, parsed.result.status);
  const result = await relayPush(store, parsed.value, { encryptionKey: encryptionKey(), now: new Date() });
  if (result.status === 200) return json(result.body);
  const retry = result.body.retry_after_seconds;
  return json(result.body, result.status, retry ? { "retry-after": String(retry) } : {});
}
