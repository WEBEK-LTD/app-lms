import { runAutoBuilds } from "../builds/auto";
import { runOrderWatches, type OrderWatchReport } from "../hosted/order-watch";
import { syncReviewStatuses, type ReviewSyncReport } from "../publishing/review";
import type { PreflightDeps } from "../builds/preflight";
import { assetUrl } from "../assets";
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
 * announcements that started, and 85.2 the notification campaigns due. 88.3 It reads the App Store's review state of the iPhone versions in review. 68 It also asks the WordPress site of every
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
  /** 87.4 Automatic builds queued, due ones a build wouldn't change, and ones waiting for a running build. */
  builds: { queued: number; nothing: number; later: number };
  /** 88.3 iPhone versions in review whose App Store state was read, and the ones whose status changed. */
  reviews: ReviewSyncReport;
  /** 91.2 Order watches looked at, people told of an order update, watches that ended. */
  orders: OrderWatchReport;
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
  /** 87.4 The checks before the automatic builds, and how the pipeline is started. */
  preflight?: PreflightDeps;
  startPipeline?: () => Promise<unknown>;
  /** 88.3 How App Store Connect is reached (tests: a fake fetch). */
  storeFetch?: typeof fetch;
  /** 91.2 How the connected platforms are reached (tests: a fake fetch). */
  platformFetch?: typeof fetch;
}): Promise<FrequentReport> {
  const notifications = await runScheduledNotifications({ store: deps.store, key: deps.key, now: deps.now, send: deps.send });
  let campaigns: CampaignRunReport = { sent: 0, waiting: 0, failed: 0 };
  try {
    campaigns = await runCampaigns({ store: deps.store, key: deps.key, now: deps.now, send: deps.send, platformUrl: deps.platformUrl ?? appUrl(), site: deps.refresh });
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
  // 87.4 The automatic builds of the latest saves that are due.
  let builds = { queued: 0, nothing: 0, later: 0 };
  try {
    builds = await runAutoBuilds({ store: deps.store, now: deps.now, assetUrl, preflight: deps.preflight, start: deps.startPipeline ?? (async () => undefined) });
  } catch (error) {
    console.error("[frequent] automatic builds", error instanceof Error ? error.message : String(error));
  }
  // 88.3 What the App Store says about the versions in review.
  let reviews: ReviewSyncReport = { checked: 0, changed: 0, failed: 0 };
  try {
    reviews = await syncReviewStatuses({ store: deps.store, key: deps.key, now: deps.now, fetcher: deps.storeFetch });
  } catch (error) {
    console.error("[frequent] review statuses", error instanceof Error ? error.message : String(error));
  }
  // 91.2 Order updates from the connected platforms.
  let orders: OrderWatchReport = { checked: 0, told: 0, ended: 0 };
  try {
    orders = await runOrderWatches({ store: deps.store, key: deps.key, now: deps.now, send: deps.send, fetcher: deps.platformFetch });
  } catch (error) {
    console.error("[frequent] order updates", error instanceof Error ? error.message : String(error));
  }
  return { notifications, announcements, ended, campaigns, automatic, builds, reviews, orders };
}
