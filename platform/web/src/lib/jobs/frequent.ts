import type { DataStore } from "../data/store";
import { appUrl } from "../env";
import { runAutoNotifications, type AutoRunReport } from "../hosted/auto-notifications";
import { runCampaigns, type CampaignRunReport } from "../hosted/campaigns";
import { runScheduledNotifications, type ScheduledRunReport } from "../hosted/scheduled-notifications";
import type { sendPush } from "../hosted/push";
import { refreshEndedSites, type EndedRefreshResult, type RefreshDeps } from "../license/refresh";
import { pushStartedAnnouncements, type OwnerPushDeps } from "../owner/push";

/**
 * 61 The frequent job: `netlify/functions/frequent-jobs.mts` calls `POST
 * /api/internal/frequent` every 5 minutes with INTERNAL_JOB_SECRET. It sends
 * the app notifications whose time came and pushes to the owners' phones the
 * announcements that started, and 85.2 the notification campaigns due. 68 It also asks the WordPress site of every
 * plan that just ended to check its license now (once per end), so the app
 * pauses there within minutes. Safe to run twice at once: each notification,
 * announcement and ended plan is taken by one run.
 */
export interface FrequentReport {
  notifications: ScheduledRunReport;
  announcements: { announcements: number; phones: number };
  /** 68 Plans that ended since the last runs, and their WordPress sites asked to check. */
  ended: EndedRefreshResult;
  /** 85.2 Notification campaigns whose time came. */
  campaigns: CampaignRunReport;
  /** 85.3 Automatic notifications that went out, by kind. */
  automatic: AutoRunReport;
}

export async function runFrequentJobs(deps: {
  store: DataStore;
  key: Buffer;
  now: Date;
  send?: typeof sendPush;
  ownerPush: OwnerPushDeps;
  /** 68 How the sites are reached (tests: a fake fetch, or LICENSE_REFRESH_TEST_URL). */
  refresh?: Pick<RefreshDeps, "fetcher" | "resolve" | "testSiteUrl">;
  /** 85.2 Yallapp's address (tests); appUrl() otherwise. */
  platformUrl?: string;
}): Promise<FrequentReport> {
  const notifications = await runScheduledNotifications({ store: deps.store, key: deps.key, now: deps.now, send: deps.send });
  let campaigns: CampaignRunReport = { sent: 0, waiting: 0, failed: 0 };
  try {
    campaigns = await runCampaigns({ store: deps.store, key: deps.key, now: deps.now, send: deps.send, platformUrl: deps.platformUrl ?? appUrl() });
  } catch (error) {
    // One campaign that can't go out never stops the rest of the job.
    console.error("[frequent] campaigns", error instanceof Error ? error.message : String(error));
  }
  let automatic: AutoRunReport = {};
  try {
    automatic = await runAutoNotifications({ store: deps.store, key: deps.key, now: deps.now, send: deps.send });
  } catch (error) {
    console.error("[frequent] automatic notifications", error instanceof Error ? error.message : String(error));
  }
  let announcements = { announcements: 0, phones: 0 };
  try {
    announcements = await pushStartedAnnouncements(deps.ownerPush);
  } catch (error) {
    // Pushes to owners never fail the job's other work.
    console.error("[frequent] announcements", error instanceof Error ? error.message : String(error));
  }
  let ended: EndedRefreshResult = { ended: 0, asked: 0, sent: 0 };
  try {
    ended = await refreshEndedSites({ store: deps.store, key: deps.key, now: deps.now, ...deps.refresh });
  } catch (error) {
    // A site that isn't told now still pauses on its own (the plugin compares the end date) and at its next check.
    console.error("[frequent] ended plans", error instanceof Error ? error.message : String(error));
  }
  return { notifications, announcements, ended, campaigns, automatic };
}
