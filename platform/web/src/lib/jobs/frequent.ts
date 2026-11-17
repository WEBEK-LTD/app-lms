import { runAutoBuilds } from "../builds/auto";
import { runAutoScreenshots } from "../app/auto-screenshots-jobs";
import { runAppReleaseBuilds, type AppReleaseReport } from "../builds/app-release";
import { askPipelineAgain, type AskAgainReport } from "../builds/ask-again";
import type { PipelineRuns } from "../builds/dispatch";
import { queueBuild } from "../app/setup";
import { runAppReviewSubmissions, type AppReviewReport } from "../publishing/app-review-submit";
import { noteAppReviewSent, notifyPublishingWork } from "../publishing/service";
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
import { runPrimeChecks, type PrimeRunReport } from "../owner/prime-jobs";
import { planHasStoreBilling } from "../store-billing/access";
import { runStoreProductSync, type StoreProductsRunReport } from "../store-billing/sync";
import { runStorePurchases, type PurchasesRunReport } from "../store-billing/jobs";
import { appPlan } from "../entitlements";
import { runRideTicks } from "../rides/tick";
import { runLibraryReminders } from "../school/library";
import { runSchoolReminders } from "../school/reminders";
import { runMailCampaigns, type MailRunDeps, type MailRunReport } from "../mailing/campaigns";
import { runFirebaseRegistrations, type FirebaseDeps, type FirebaseRunReport } from "../firebase/register";
import { keepPoolStocked, type ProjectDeps, type ProjectRunReport } from "../firebase/projects";
import { raiseAlert, type TeamMail } from "../watch/alerts";

/**
 * 61 The frequent job: `netlify/functions/frequent-jobs.mts` calls `POST
 * /api/internal/frequent` every 5 minutes with INTERNAL_JOB_SECRET. It sends
 * the app notifications whose time came and pushes to the owners' phones the
 * announcements that started, and 85.2 the notification campaigns due. 105.2 It moves rides on with time. 113.8 It reminds schools' families of tomorrow's exams, 113.4 and parents of the permission slips due tomorrow. 88.3 It reads the App Store's review state of the iPhone versions in review. 138 It sends iPhone builds on TestFlight to App Review once Apple has processed them, and gives a few apps a run their build for a new release of Yallapp's own app. 100.2 It makes or changes the in-app products waiting for the stores, 100.3 and keeps purchases' access in step. 68 It also asks the WordPress site of every
 * plan that just ended to check its license now (once per end), so the app
 * pauses there within minutes. 136 It registers apps in Yallapp's Firebase
 * and makes the pool's next project when it runs low. Safe to run twice at once: each notification,
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
  /** 139 Store screenshot runs queued, due ones whose screens didn't change, runs that stopped and were closed. */
  screenshots: { queued: number; same: number; stalled: number };
  /** 88.3 iPhone versions in review whose App Store state was read, and the ones whose status changed. */
  reviews: ReviewSyncReport;
  /** 138 iPhone builds sent to App Review, still waiting for Apple, or blocked on something to do by hand. */
  appReview: AppReviewReport;
  /** 138 Builds queued for a new release of Yallapp's own app, apps waiting their turn, builds that couldn't be queued. */
  appRelease: AppReleaseReport;
  /** 140 Builds queued 10 minutes or more, and whether GitHub was asked again to start the build workflow. */
  pipeline: AskAgainReport;
  /** 91.2 Order watches looked at, people told of an order update, watches that ended. */
  orders: OrderWatchReport;
  /** 100.2 Store products made or changed in Google Play and the App Store. */
  storeProducts: StoreProductsRunReport;
  /** 100.3 Access given or taken back on the source, Google's refunds, memberships that ended. */
  storePurchases: PurchasesRunReport;
  /** 105.2 Rides looked at and moved on with time (scheduled ones due, offers that ran out, nobody found). */
  rides: { looked: number; moved: number };
  /** 113.11 Library loans looked at, and reminders sent (due soon, overdue). */
  library: { looked: number; told: number };
  /** 113.8 Tomorrow's exams whose reminder went to their students and families; 113.4 slips due tomorrow whose reminder went to the parents. */
  school: { exams: number; slips: number };
  /** 114 Email campaigns started on time, and a few seconds of their emails (the minute job sends the rest). */
  mail: MailRunReport | null;
  /** 125 Prime: the people whose smart alerts were checked, the alerts pushed and the morning briefs sent. */
  prime: PrimeRunReport;
  /** 136 Yallapp's Firebase, when it's set up: apps registered further, and the pool's next project being made. */
  firebase?: { registrations: FirebaseRunReport; projects: ProjectRunReport | null };
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
  /** 140 The build workflow's latest runs (null: GitHub can't say); with startPipeline, a build waiting 10 minutes asks again. */
  pipelineRuns?: () => Promise<PipelineRuns | null>;
  /** 139 How the store screenshots' workflow is started. */
  startScreenshots?: () => Promise<unknown>;
  /** 88.3 How App Store Connect is reached (tests: a fake fetch). */
  storeFetch?: typeof fetch;
  /** 91.2 How the connected platforms are reached (tests: a fake fetch). */
  platformFetch?: typeof fetch;
  /** 114 How email campaigns are sent; left out, they wait for their own job. */
  mail?: Omit<MailRunDeps, "store" | "budgetMs">;
  /** 136 Yallapp's Firebase (lib/firebase/env.ts); left out when it isn't set up: nothing calls Google. */
  firebase?: { registrations: FirebaseDeps; projects: ProjectDeps | null; mail?: TeamMail | null } | null;
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
  // 139 The store screenshots made from the apps, when what shows on them changed.
  let screenshots = { queued: 0, same: 0, stalled: 0 };
  try {
    screenshots = await runAutoScreenshots({ store: deps.store, now: deps.now, start: deps.startScreenshots ?? (async () => undefined) });
  } catch (error) {
    console.error("[frequent] store screenshots", error instanceof Error ? error.message : String(error));
  }
  // 138 Yallapp's own app updated: a few active apps a run get their new build.
  let appRelease: AppReleaseReport = { queued: 0, waiting: 0, refused: 0 };
  try {
    appRelease = await runAppReleaseBuilds({
      store: deps.store,
      now: deps.now,
      assetUrl,
      preflight: deps.preflight,
      start: deps.startPipeline ?? (async () => undefined),
      queue: async ({ client, app, license, variant, versionName, appRelease }) => queueBuild(deps.store, { client, app, license, versionName, variant, cause: "app_release", appRelease }, deps.now, assetUrl, deps.preflight),
    });
  } catch (error) {
    console.error("[frequent] app release builds", error instanceof Error ? error.message : String(error));
  }
  // 140 A build still queued after 10 minutes, with no run of the build workflow going: GitHub is asked again.
  let pipeline: AskAgainReport = { waiting: 0, asked: false };
  if (deps.startPipeline && deps.pipelineRuns) {
    try {
      pipeline = await askPipelineAgain({ store: deps.store, now: deps.now, start: deps.startPipeline, runs: deps.pipelineRuns });
    } catch (error) {
      console.error("[frequent] build pipeline", error instanceof Error ? error.message : String(error));
    }
  }
  // 138 iPhone builds on TestFlight sent to App Review, once Apple has processed them.
  let appReview: AppReviewReport = { looked: 0, submitted: 0, waiting: 0, blocked: 0, skipped: 0 };
  try {
    appReview = await runAppReviewSubmissions({
      store: deps.store,
      key: deps.key,
      now: deps.now,
      fetcher: deps.storeFetch,
      tell: (app, event) => notifyPublishingWork(deps.store, app, event),
      sent: (app, build, now) => noteAppReviewSent(deps.store, app, build, now),
    });
  } catch (error) {
    console.error("[frequent] app review", error instanceof Error ? error.message : String(error));
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
  // 100.2 The in-app products waiting for Google Play or the App Store.
  let storeProducts: StoreProductsRunReport = { apps: 0, done: 0, failed: 0 };
  try {
    storeProducts = await runStoreProductSync({ store: deps.store, key: deps.key, now: deps.now, fetcher: deps.storeFetch, platformFetch: deps.platformFetch }, async (license) =>
      planHasStoreBilling(await appPlan(deps.store, license, deps.now)),
    );
  } catch (error) {
    console.error("[frequent] store products", error instanceof Error ? error.message : String(error));
  }
  // 100.3 Purchases: access waiting for the source, refunds, memberships past their paid period.
  let storePurchases: PurchasesRunReport = { delivered: 0, refunds: 0, ended: 0, failed: 0 };
  try {
    storePurchases = await runStorePurchases({
      store: deps.store,
      key: deps.key,
      now: deps.now,
      fetcher: deps.storeFetch,
      site: deps.refresh,
      // 100.7 The notices to apps' own APIs, and Teachable and Thinkific enrolments.
      api: { fetcher: deps.platformFetch, platformUrl: deps.platformUrl },
    });
  } catch (error) {
    console.error("[frequent] store purchases", error instanceof Error ? error.message : String(error));
  }
  // 105.2 Rides nobody looked at lately, moved on with time.
  let rides = { looked: 0, moved: 0 };
  try {
    rides = await runRideTicks({ store: deps.store, now: deps.now, send: deps.send });
  } catch (error) {
    console.error("[frequent] rides", error instanceof Error ? error.message : String(error));
  }
  // 113.11 The library's reminders: a book due soon, a book overdue.
  let library = { looked: 0, told: 0 };
  try {
    library = await runLibraryReminders({ store: deps.store, now: deps.now, send: deps.send });
  } catch (error) {
    console.error("[frequent] library", error instanceof Error ? error.message : String(error));
  }
  // 113.8 Schools: the day-before reminders of exams.
  let school = { exams: 0, slips: 0 };
  try {
    school = await runSchoolReminders({ store: deps.store, now: deps.now, send: deps.send });
  } catch (error) {
    console.error("[frequent] school", error instanceof Error ? error.message : String(error));
  }
  // 114 Email campaigns whose time came start, and a few of their emails go.
  let mail: MailRunReport | null = null;
  if (deps.mail) {
    try {
      mail = await runMailCampaigns({ ...deps.mail, store: deps.store, budgetMs: 3000 });
    } catch (error) {
      console.error("[frequent] email campaigns", error instanceof Error ? error.message : String(error));
    }
  }
  // 125 Prime's smart alerts and morning briefs, each once.
  let prime: PrimeRunReport = { people: 0, alerts: 0, briefs: 0 };
  try {
    prime = await runPrimeChecks(deps.ownerPush);
  } catch (error) {
    console.error("[frequent] prime", error instanceof Error ? error.message : String(error));
  }
  // 131 The deliveries asked for in the apps of connected shops are kept 60 days.
  try {
    await deps.store.deleteStoreDeliveriesBefore(new Date(deps.now.getTime() - 60 * 86_400_000));
  } catch (error) {
    console.error("[frequent] store deliveries", error instanceof Error ? error.message : String(error));
  }
  // 136 Yallapp's Firebase: the pool's next project when it runs low, then the apps not set up yet, each a step further.
  let firebase: FrequentReport["firebase"];
  if (deps.firebase) {
    let projects: ProjectRunReport | null = null;
    if (deps.firebase.projects) {
      try {
        projects = await keepPoolStocked(deps.firebase.projects);
      } catch (error) {
        console.error("[frequent] firebase projects", error instanceof Error ? error.message : String(error));
      }
    }
    let registrations: FirebaseRunReport = { apps: 0, ready: 0, failed: 0 };
    try {
      registrations = await runFirebaseRegistrations(deps.firebase.registrations);
    } catch (error) {
      console.error("[frequent] firebase apps", error instanceof Error ? error.message : String(error));
    }
    firebase = { registrations, projects };
    // Apps wait for room and the platform can't make a project (no organization or folder set): the one time a person is needed.
    if (registrations.waiting && !deps.firebase.projects) {
      await raiseAlert(
        deps.store,
        {
          kind: "firebase",
          key: "firebase_pool_full",
          title: "Apps are waiting for room in Yallapp's Firebase",
          detail: `${registrations.waiting} ${registrations.waiting === 1 ? "app waits" : "apps wait"} for a project with room. Set where new projects are made, or add a project made by hand, in Admin › Settings › Yallapp Firebase projects.`,
          link: "/admin/settings/firebase",
        },
        deps.now,
        deps.firebase.mail,
      );
    }
  }
  return { notifications, announcements, ended, campaigns, automatic, builds, screenshots, reviews, appReview, appRelease, pipeline, orders, storeProducts, storePurchases, rides, library, school, mail, prime, ...(firebase ? { firebase } : {}) };
}
