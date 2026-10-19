import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, internalJobSecret } from "@/lib/env";
import { runApiWebhooks } from "@/lib/hosted/api-webhooks";
import { errorResponse, hasBearerToken, json } from "@/lib/http";

/**
 * POST /api/internal/webhooks (roadmap 49): the webhook job. Netlify's
 * scheduled function `netlify/functions/api-webhooks.mts` calls it every 5
 * minutes with `Authorization: Bearer $INTERNAL_JOB_SECRET`. It tries the
 * signed notices to apps' own APIs that are due again (`account.deleted`,
 * lib/hosted/api-webhooks.ts) and deletes those older than 30 days. Safe to
 * call again: each notice is taken by one run at a time.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const store = await getStore();
  const report = await runApiWebhooks({ store, encryptionKey: encryptionKey(), platformUrl: appUrl(), now: () => new Date() });
  return json(report);
}
