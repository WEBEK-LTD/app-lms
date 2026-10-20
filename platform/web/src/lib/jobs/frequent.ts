import type { DataStore } from "../data/store";
import { runScheduledNotifications, type ScheduledRunReport } from "../hosted/scheduled-notifications";
import type { sendPush } from "../hosted/push";
import { pushStartedAnnouncements, type OwnerPushDeps } from "../owner/push";

/**
 * 61 The frequent job: `netlify/functions/frequent-jobs.mts` calls `POST
 * /api/internal/frequent` every 5 minutes with INTERNAL_JOB_SECRET. It sends
 * the app notifications whose time came and pushes to the owners' phones the
 * announcements that started. Safe to run twice at once: each notification
 * and each announcement is taken by one run.
 */
export interface FrequentReport {
  notifications: ScheduledRunReport;
  announcements: { announcements: number; phones: number };
}

export async function runFrequentJobs(deps: { store: DataStore; key: Buffer; now: Date; send?: typeof sendPush; ownerPush: OwnerPushDeps }): Promise<FrequentReport> {
  const notifications = await runScheduledNotifications({ store: deps.store, key: deps.key, now: deps.now, send: deps.send });
  let announcements = { announcements: 0, phones: 0 };
  try {
    announcements = await pushStartedAnnouncements(deps.ownerPush);
  } catch (error) {
    // Pushes to owners never fail the job's other work.
    console.error("[frequent] announcements", error instanceof Error ? error.message : String(error));
  }
  return { notifications, announcements };
}
