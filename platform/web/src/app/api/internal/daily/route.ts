import { runAnalyticsNightly } from "@/lib/analytics/aggregate";
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

/**
 * POST /api/internal/daily (roadmap 13.4): the daily job. Netlify's scheduled
 * function `netlify/functions/daily-notices.mts` calls it once a day with
 * `Authorization: Bearer $INTERNAL_JOB_SECRET`. It applies downgrades whose
 * date came, sends the plan-ending reminders (7 days, 1 day, the day) and
 * the app users notices, each once. 44 Then it counts each app's usage
 * statistics for the finished days and deletes raw events older than 40
 * days. 51 Then storage packs that ended are looked at (a notice and an
 * email when the files are over the storage left) and uploads left unfinished
 * for two days are cancelled. 58 Devices signed out of Yallapp Business by
 * time (their refresh token ended) are deleted. 62 The media server's
 * folders of apps that no longer exist are removed after a week. Safe to
 * call again.
 */
export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request, internalJobSecret())) {
    return errorResponse(401, "unauthorized", "A valid job token is required.", { "www-authenticate": 'Bearer realm="yallapp-internal"' });
  }
  const store = await getStore();
  const now = new Date();
  const deps = { store, baseUrl: appUrl(), mail: sendTemplate, now };
  const report = await runDailyNotices(deps);
  // 47 Each app's days in its time zone.
  const analytics = await runAnalyticsNightly(store, now, undefined, async (appId) => {
    const app = await store.getAppById(appId);
    return app ? appZone(store, app) : "UTC";
  });
  const media = {
    storageNotices: (await noticeEndedPacks(deps, await effectivePlans(store))).length,
    uploadsCancelled: await cancelStaleUploads({ store, storage: getMediaStorage(), now }),
    folders: await sweepMediaFolders({ store, storage: getMediaStorage(), now }).catch((e: unknown) => {
      console.error(`[daily] media folders: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
  };
  // 58 Yallapp Business devices whose refresh token ended are forgotten.
  const ownerDevicesPurged = await store.purgeOwnerDevices(now);
  // 70 Website sessions whose 14 days are over.
  const sessionsPurged = await store.deleteExpiredUserSessions(now);
  return json({ ...report, analytics, media, ownerDevicesPurged, sessionsPurged });
}
