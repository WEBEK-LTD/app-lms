import { getStore } from "@/lib/data";
import { encryptionKey, internalJobSecret, licenseRefreshTestUrl } from "@/lib/env";
import { errorResponse, hasBearerToken, json } from "@/lib/http";
import { runFrequentJobs } from "@/lib/jobs/frequent";
import { ownerPushDeps } from "@/lib/owner/push-env";

/**
 * POST /api/internal/frequent (roadmap 61): the frequent job. Netlify's
 * scheduled function `netlify/functions/frequent-jobs.mts` calls it every 5
 * minutes with `Authorization: Bearer $INTERNAL_JOB_SECRET`. It sends the
 * notifications to apps' users whose time came (Send later) and pushes the
 * announcements that started to the owners' phones (Yallapp Business), each
 * once, and 68 asks the WordPress sites of plans that just ended to check
 * their license (lib/jobs/frequent.ts). Safe to call again, also at the same time.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const store = await getStore();
  const now = new Date();
  const report = await runFrequentJobs({ store, key: encryptionKey(), now, ownerPush: await ownerPushDeps(now, store), refresh: { testSiteUrl: licenseRefreshTestUrl() } });
  return json(report);
}
