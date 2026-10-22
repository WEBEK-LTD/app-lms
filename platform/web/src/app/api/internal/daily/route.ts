import { runAnalyticsNightly } from "@/lib/analytics/aggregate";
import { purgeAnalyticsHistory } from "@/lib/analytics/retention";
import { appZone } from "@/lib/analytics/zone";
import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import { appUrl, internalJobSecret } from "@/lib/env";
import { errorResponse, hasBearerToken, json } from "@/lib/http";
import { runDailyNotices } from "@/lib/notices";
import { effectivePlans } from "@/lib/entitlements";
import { cancelStaleUploads } from "@/lib/media/files";
import { getMediaStorage } from "@/lib/media/storage";
import { sweepMediaFolders } from "@/lib/media/sweep";
import { noticeEndedPacks } from "@/lib/media/usage";
import { runAccountDeletions } from "@/lib/account/purge";
import { runAppPurges } from "@/lib/apps/deletion";
import { accountPurgeDeps, purgeDeps } from "@/lib/apps/purge-env";
import { runChatRetention } from "@/lib/chat/retention";
import { recordAllMilestones } from "@/lib/milestones/record";
import { recordProductDay } from "@/lib/admin/product-days";
import { recordJobRun } from "@/lib/watch/runs";
import { runWatch } from "@/lib/watch/watch";
import { dispatchSet, teamMail } from "@/lib/watch/env";
import type { DataStore } from "@/lib/data/store";
import { APP_ERROR_DAYS } from "@/lib/watch/app-errors";

/**
 * POST /api/internal/daily (roadmap 13.4): the daily job. Netlify's scheduled
 * function `netlify/functions/daily-notices.mts` calls it once a day with
 * `Authorization: Bearer $INTERNAL_JOB_SECRET`. It applies downgrades whose
 * date came, sends the plan-ending reminders (7 days, 1 day, the day) and
 * the app users notices, each once. 44 Then it counts each app's usage
 * statistics for the finished days and deletes raw events older than 90
 * days (72: 40 before), then each app's daily totals older than its plan
 * keeps them (72, lib/analytics/retention.ts), in batches. 51 Then storage packs that ended are looked at (a notice and an
 * email when the files are over the storage left) and uploads left unfinished
 * for two days are cancelled. 58 Devices signed out of Yallapp Business by
 * time (their refresh token ended) are deleted. 62 The media server's
 * folders of apps that no longer exist are removed after a week. 73 Apps
 * deleted by their owner more than 7 days ago are purged (their files and
 * rows), and the accounts whose deletion was asked for more than 7 days ago
 * are deleted, keeping their billing records (lib/account/purge.ts). 77 Chat
 * messages over a year old go unless kept, and the business hears 30 days
 * before (lib/chat/retention.ts). 78 Every account's milestones are
 * recorded, before deleted apps are purged (lib/milestones), then the day's
 * snapshot for Admin › Product (lib/admin/product-days.ts). 78.3 Each run is
 * recorded; job runs older than 30 days go, and the watch checks that the
 * frequent job runs (lib/watch). Safe to call again.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const store = await getStore();
  const now = new Date();
  // 78.3 Recorded as a run (lib/watch/runs.ts).
  return json(await recordJobRun(store, "daily", () => new Date(), () => runDaily(store, now)));
}

async function runDaily(store: DataStore, now: Date) {
  const deps = { store, baseUrl: appUrl(), mail: sendTemplate, now };
  const report = await runDailyNotices(deps);
  // 47 Each app's days in its time zone.
  const analytics = await runAnalyticsNightly(store, now, undefined, async (appId) => {
    const app = await store.getAppById(appId);
    return app ? appZone(store, app) : "UTC";
  });
  // 72 Daily totals kept as long as each app's plan says.
  const analyticsHistory = await purgeAnalyticsHistory(store, await effectivePlans(store), now);
  const media = {
    storageNotices: (await noticeEndedPacks(deps, await effectivePlans(store))).length,
    uploadsCancelled: await cancelStaleUploads({ store, storage: getMediaStorage(), now }),
    folders: await sweepMediaFolders({ store, storage: getMediaStorage(), now }).catch((e: unknown) => {
      console.error(`[daily] media folders: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
  };
  // 77 Chat messages kept a year, with a notice 30 days before.
  const chat = await runChatRetention({ ...deps, storage: getMediaStorage() }).catch((e: unknown) => {
    console.error(`[daily] chat: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  });
  // 58 Yallapp Business devices whose refresh token ended are forgotten.
  const ownerDevicesPurged = await store.purgeOwnerDevices(now);
  // 70 Website sessions whose 14 days are over.
  const sessionsPurged = await store.deleteExpiredUserSessions(now);
  // 78 Milestones, from what the data shows, while deleted apps still have their builds.
  const milestones = await recordAllMilestones(store, now).catch((e: unknown) => {
    console.error(`[daily] milestones: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  });
  // 78.2 Who has a plan running today.
  const productDay = await recordProductDay(store, now)
    .then((d) => ({ day: d.day, clients: d.clients, withPlan: d.activeClientIds.length }))
    .catch((e: unknown) => {
      console.error(`[daily] product day: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    });
  // 73 Deleted apps past their 7 days, then accounts whose deletion is due.
  const apps = await runAppPurges(purgeDeps(store, now));
  const accounts = await runAccountDeletions(accountPurgeDeps(store, now));
  // 78.3 Job runs kept 30 days; the frequent job checked (it checks the others).
  const jobRunsPurged = await store.deleteJobRunsBefore(new Date(now.getTime() - 30 * 86_400_000));
  // 78.4 Apps' errors not seen for 90 days.
  const appErrorsPurged = await store.deleteAppErrorsBefore(new Date(now.getTime() - APP_ERROR_DAYS * 86_400_000));
  const watch = await runWatch({ store, now, mail: teamMail, jobs: ["frequent"], dispatch: dispatchSet() });
  return { ...report, analytics: { ...analytics, history: analyticsHistory }, media, chat, milestones, productDay, ownerDevicesPurged, sessionsPurged, deleted: { apps, accounts }, jobRunsPurged, appErrorsPurged, watch };
}
