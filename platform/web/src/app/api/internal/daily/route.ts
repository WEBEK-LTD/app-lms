import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import { appUrl, internalJobSecret } from "@/lib/env";
import { errorResponse, hasBearerToken, json } from "@/lib/http";
import { runDailyNotices } from "@/lib/notices";

/**
 * POST /api/internal/daily (roadmap 13.4): the daily job. Netlify's scheduled
 * function `netlify/functions/daily-notices.mts` calls it once a day with
 * `Authorization: Bearer $INTERNAL_JOB_SECRET`. It applies downgrades whose
 * date came, sends the plan-ending reminders (7 days, 1 day, the day) and
 * the app users notices, each once. Safe to call again.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const report = await runDailyNotices({ store: await getStore(), baseUrl: appUrl(), mail: sendTemplate, now: new Date() });
  return json(report);
}
