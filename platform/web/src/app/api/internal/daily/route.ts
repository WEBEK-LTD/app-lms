import { runAnalyticsNightly } from "@/lib/analytics/aggregate";
import { appZone } from "@/lib/analytics/zone";
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
 * the app users notices, each once. 44 Then it counts each app's usage
 * statistics for the finished days and deletes raw events older than 40
 * days. Safe to call again.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const store = await getStore();
  const now = new Date();
  const report = await runDailyNotices({ store, baseUrl: appUrl(), mail: sendTemplate, now });
  // 47 Each app's days in its time zone.
  const analytics = await runAnalyticsNightly(store, now, undefined, async (appId) => {
    const app = await store.getAppById(appId);
    return app ? appZone(store, app) : "UTC";
  });
  return json({ ...report, analytics });
}
