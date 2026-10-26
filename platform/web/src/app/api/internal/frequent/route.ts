import { startPipeline } from "@/lib/builds/dispatch";
import { preflightDeps } from "@/lib/builds/preflight-env";
import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import { appUrl, encryptionKey, integrationChecksOn, internalJobSecret, licenseRefreshTestUrl, paymentApiUrls } from "@/lib/env";
import { runIntegrationChecks } from "@/lib/integrations/schedule";
import { checkPendingPayments } from "@/lib/payments/pending";
import { errorResponse, hasBearerToken, json } from "@/lib/http";
import { runFrequentJobs } from "@/lib/jobs/frequent";
import { runRekey } from "@/lib/jobs/rekey";
import { ownerPushDeps } from "@/lib/owner/push-env";
import { recordJobRun } from "@/lib/watch/runs";
import { alertFailedScheduledPushes, runWatch } from "@/lib/watch/watch";
import { dispatchSet, teamMail } from "@/lib/watch/env";

/**
 * POST /api/internal/frequent (roadmap 61): the frequent job. Netlify's
 * scheduled function `netlify/functions/frequent-jobs.mts` calls it every 5
 * minutes with `Authorization: Bearer $INTERNAL_JOB_SECRET`. It sends the
 * notifications to apps' users whose time came (Send later) and pushes the
 * announcements that started to the owners' phones (Yallapp Business), each
 * once, and 68 asks the WordPress sites of plans that just ended to check
 * their license (lib/jobs/frequent.ts). 78.3 Each run is recorded, then the
 * watch looks at builds, the other jobs, crashes and failed pushes
 * (lib/watch). 79.2 Then, when there are any, it moves encrypted values to the
 * current key for a few seconds (lib/jobs/rekey.ts). 80.2 Then a few apps'
 * connections are checked again, each app once a day (lib/integrations/schedule.ts).
 * 80.3 And payments left pending are asked about at their provider (lib/payments/pending.ts).
 * Safe to call again, also at the same time.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const store = await getStore();
  const now = new Date();
  // 78.3 Recorded as a run; then the watch: builds, the other jobs, crashes and failed pushes.
  const report = await recordJobRun(store, "frequent", () => new Date(), async () => {
    const jobs = await runFrequentJobs({
      store,
      key: encryptionKey(),
      now,
      ownerPush: await ownerPushDeps(now, store),
      refresh: { testSiteUrl: licenseRefreshTestUrl() },
      // 87.4 Automatic builds: the checks before them, and the pipeline started at once.
      preflight: preflightDeps(store),
      startPipeline,
    });
    await alertFailedScheduledPushes(store, jobs.notifications.failed, now, teamMail);
    const watch = await runWatch({ store, now, mail: teamMail, jobs: ["daily", "webhooks", "pipeline"], dispatch: dispatchSet(), crashes: true });
    // 79.2 A few seconds of moving encrypted values to the current key, when there is any to move.
    const rekey = await runRekey(store, encryptionKey(), { budgetMs: 5000 }).catch((error: unknown) => {
      console.error("[rekey]", error instanceof Error ? error.message : String(error));
      return null;
    });
    // 80.2 A few apps' connections checked again, once a day each.
    const integrations = integrationChecksOn()
      ? await runIntegrationChecks({ store, encryptionKey: encryptionKey(), now, baseUrl: appUrl(), mail: sendTemplate, teamMail, paymentUrls: paymentApiUrls(), budgetMs: 5000, limit: 10 }).catch((error: unknown) => {
          console.error("[integrations]", error instanceof Error ? error.message : String(error));
          return null;
        })
      : null;
    // 80.3 Payments whose provider never called back, asked about.
    const pendingPayments = await checkPendingPayments({ store, now, budgetMs: 5000, limit: 20 }).catch((error: unknown) => {
      console.error("[payments] pending", error instanceof Error ? error.message : String(error));
      return null;
    });
    return { ...jobs, watch, rekey: rekey && { moved: rekey.moved, failed: rekey.failed, done: rekey.done }, integrations, pendingPayments };
  });
  return json(report);
}
