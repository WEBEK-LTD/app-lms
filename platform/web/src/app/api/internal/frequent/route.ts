import { pipelineRuns, startPipeline, startScreenshots } from "@/lib/builds/dispatch";
import { preflightDeps } from "@/lib/builds/preflight-env";
import { getStore } from "@/lib/data";
import { appMailDelivered, sendAppMail, sendTemplate } from "@/lib/email/send";
import { appUrl, encryptionKey, integrationChecksOn, internalJobSecret, licenseRefreshTestUrl, paymentApiUrls, signingSecret } from "@/lib/env";
import { openMailer } from "@/lib/mail";
import { getPlans } from "@/lib/settings/platform";
import { runIntegrationChecks } from "@/lib/integrations/schedule";
import { checkPendingPayments } from "@/lib/payments/pending";
import { fetchWaitingPhotos } from "@/lib/market/photos";
import { safeFetcher } from "@/lib/net/safe-fetch";
import { errorResponse, hasBearerToken, json } from "@/lib/http";
import { runFrequentJobs } from "@/lib/jobs/frequent";
import { runRekey } from "@/lib/jobs/rekey";
import { ownerPushDeps } from "@/lib/owner/push-env";
import { recordJobRun } from "@/lib/watch/runs";
import { alertFailedScheduledPushes, runWatch } from "@/lib/watch/watch";
import { dispatchSet, teamMail } from "@/lib/watch/env";
import { poolParent, yallappFirebase } from "@/lib/firebase/env";

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
 * 115 Then a few picture links from marketplace imports become products' photos (lib/market/photos.ts).
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
      // 140 A build waiting 10 minutes with no run going: the pipeline asked again.
      pipelineRuns,
      // 139 The store screenshots' workflow, started once when a run was queued.
      startScreenshots,
      // 114 Email campaigns due start; netlify/functions/mail-campaigns.mts sends the rest every minute.
      mail: await mailDeps(store),
      // 136 Yallapp's Firebase, when it's set up here.
      firebase: await firebaseJobDeps(store),
      // 212 "It's back" emailed too, when the app's email goes out.
      stockMail: async (app, to, mail) => {
        if (app.demo || !(await appMailDelivered(store, app))) return;
        await sendAppMail(store, app, { to, subject: mail.subject, text: mail.text });
      },
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
    // 115 Picture links from marketplace imports fetched into products' photos, a few each run.
    const productPhotos = await fetchWaitingPhotos({ store, now: () => new Date(), fetcher: safeFetcher(), budgetMs: 5000, limit: 30 }).catch((error: unknown) => {
      console.error("[photos]", error instanceof Error ? error.message : String(error));
      return null;
    });
    return { ...jobs, watch, rekey: rekey && { moved: rekey.moved, failed: rekey.failed, done: rekey.done }, integrations, pendingPayments, productPhotos };
  });
  return json(report);
}

/** 136 Yallapp's Firebase for the frequent job: null when it isn't set up here (nothing calls Google then). */
async function firebaseJobDeps(store: Awaited<ReturnType<typeof getStore>>) {
  const firebase = yallappFirebase(store);
  return firebase ? { registrations: firebase.registrations(), projects: firebase.projects(await poolParent(store), teamMail), mail: teamMail } : null;
}

/** 114 How the frequent job sends email campaigns; without SIGNING_SECRET they wait (their links couldn't be signed). */
async function mailDeps(store: Awaited<ReturnType<typeof getStore>>) {
  let secret: string;
  try {
    secret = signingSecret();
  } catch {
    return undefined;
  }
  return { now: () => new Date(), baseUrl: appUrl(), secret, mailer: () => openMailer(store), plans: await getPlans(store) };
}
