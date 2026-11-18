import type { DataStore } from "../data/store";
import type { App, Build, BuildVariant, Client, License } from "../data/types";
import { currentPlanId } from "../billing/plan-change";
import { effectivePlans } from "../entitlements";
import { appIsActive } from "../license/status";
import { bumpPatch } from "../semver";
import type { PreflightDeps } from "./preflight";
import { buildOnly, isInProgress } from "./view";

/**
 * 138 Yallapp's own app updates reach every client's app by themselves.
 *
 * `CLIENT_APP_RELEASE` is the release of the client app's code (mobile/)
 * that clients' apps should be on. Bump it, in the same change, when a
 * change to mobile/ should reach the stores: once the platform runs with
 * the new number, the frequent job gives each active app whose last
 * successful build was made with an older release a new build, a few an
 * hour (`APP_RELEASE_BUILDS_PER_HOUR`: the iPhone builds use paid macOS
 * minutes). Each build goes to the stores as any other: Google Play's
 * production, and App Review on the App Store (lib/publishing/app-review-submit.ts).
 *
 * The release is kept on each build (`release.appRelease`), not in the
 * build config: the app's build config is checked key by key by mobile/'s
 * tool, and nothing in the app changes with the number itself.
 */
export const CLIENT_APP_RELEASE = 7;
/*
 * The releases:
 * 1  Builds before Phase 138.
 * 2  132.187 An order shipped in the dashboard shows as shipped in the app
 *    (#427), and 136 the iPhone's push token sent straight to Apple with
 *    the client's APNs key: the app sends its APNs token (#433).
 * 3  141 The keyboard opens only when asked: a screen, sheet or dialog
 *    opening over a text field, or another tab, closes it, so it doesn't
 *    open again by itself on the way back; a drag that scrolls closes it;
 *    and 143 the premium sign-in's buttons in the app's main colour (not
 *    the second colour's gold).
 * 4  145 The app audit: what the owner publishes shows when the app comes
 *    back on screen (not only after it's started again); a page around a
 *    tab's screen is the tab's (a shop's bouquets, not "Courses"); Studio's
 *    bag, buttons and lists as set; controls that did nothing do what they
 *    show; delivery days in the shop's time; and pictures faster.
 * 5  147 A search opens with its keyboard closed (Leqaa's and Kech Flora's
 *    Bouquets tab brought it up by itself): it comes up only on a tap.
 * 6  149 Prices in the customer's currency, per app: with
 *    the owner's switch off the app hides Settings › Currency and sends no
 *    `X-Currency`; with the owner's list, the picker shows only those and
 *    a region's currency outside it isn't sent.
 * 7  157 A template's rings, chips and tiles of the shop's categories open
 *    the shop filtered to the category they show (`Action.category_id`),
 *    and the shop's own chips follow the dashboard when the app comes back
 *    on screen or the shop is pulled down.
 */

/** Builds made before 138 count as this release, so shipping 138 rebuilds nothing by itself. */
const BEFORE_RELEASES = 1;

/** How many apps get a build for a new Yallapp release each hour, at most. */
export const APP_RELEASE_BUILDS_PER_HOUR = 4;

/** A build that couldn't be queued (a check failed, sample entries) is tried again after this long. */
export const APP_RELEASE_RETRY_HOURS = 24;

const HOUR = 3_600_000;

/** The Yallapp app release a build was made with. */
export function appReleaseOf(build: Pick<Build, "release">): number {
  const release = build.release?.appRelease;
  return typeof release === "number" && Number.isFinite(release) ? release : BEFORE_RELEASES;
}

/** Whether a build was made with an older Yallapp app release than the current one. */
export function behindAppRelease(build: Pick<Build, "release">, current = CLIENT_APP_RELEASE): boolean {
  return appReleaseOf(build) < current;
}

export interface AppReleaseDeps {
  store: DataStore;
  now: Date;
  assetUrl: (id: string) => string;
  preflight?: PreflightDeps;
  /** Starts the pipeline once when something was queued. */
  start: () => Promise<unknown>;
  /** Tests: another release or rate. */
  release?: number;
  perHour?: number;
  /** The queueing itself (lib/app/setup.ts queueBuild with `cause: "app_release"`), passed in to keep this module light. */
  queue: (input: { client: Client; app: App; license: License; variant: BuildVariant; versionName: string; appRelease: number }) => Promise<{ ok: boolean }>;
}

export interface AppReleaseReport {
  /** Builds queued for the new release now. */
  queued: number;
  /** Apps still behind, waiting for the next hours. */
  waiting: number;
  /** Builds that couldn't be queued (tried again in a day). */
  refused: number;
}

/** How many builds were queued for a Yallapp release in the last hour. */
async function queuedLastHour(store: DataStore, now: Date): Promise<number> {
  const recent = await store.listBuilds({ limit: 200, newestFirst: true });
  return recent.filter((b) => b.release?.cause === "app_release" && now.getTime() - b.createdAt.getTime() < HOUR).length;
}

const VARIANTS: readonly BuildVariant[] = ["app", "courier", "vendor", "staff"];

/**
 * The frequent job: a few apps a run, until every active app that built
 * successfully before is on the current release. Only apps whose client is
 * active, whose license runs and whose last successful build is older; never
 * while a build of the app is running; demo apps never.
 */
export async function runAppReleaseBuilds(deps: AppReleaseDeps): Promise<AppReleaseReport> {
  const { store, now } = deps;
  const current = deps.release ?? CLIENT_APP_RELEASE;
  const report: AppReleaseReport = { queued: 0, waiting: 0, refused: 0 };
  let room = (deps.perHour ?? APP_RELEASE_BUILDS_PER_HOUR) - (await queuedLastHour(store, now));
  const plans = await effectivePlans(store);
  for (const app of await store.listApps()) {
    if (app.deletedAt || app.demo) continue;
    const client = await store.getClientById(app.clientId);
    const license = client ? await store.getLicenseForApp(client.id, app.id) : null;
    if (!client || !license || !appIsActive(license, client, now) || !plans[currentPlanId(license, now)]) continue;
    // One build at a time for the app, whichever of its apps.
    if (isInProgress((await store.listBuildsByApp(app.id, 1, "all"))[0] ?? null, now)) {
      report.waiting += 1;
      continue;
    }
    for (const variant of VARIANTS) {
      const builds = await store.listBuildsByApp(app.id, 20, variant);
      const newest = builds[0];
      // 142 The newest build of both apps decides: one started for a single platform left the other on its release.
      const both = builds.find((b) => !buildOnly(b)) ?? newest;
      // Only apps (and their second apps) that built successfully before, whose newest build is on an older release.
      if (!newest || !both || !builds.some((b) => b.status === "ready") || !behindAppRelease(both, current)) continue;
      const tried = newest.release?.appReleaseTried;
      if (tried && tried.release === current && now.getTime() - Date.parse(tried.at) < APP_RELEASE_RETRY_HOURS * HOUR) continue;
      if (room <= 0) {
        report.waiting += 1;
        break;
      }
      const result = await deps.queue({ client, app, license, variant, versionName: appReleaseVersion(newest), appRelease: current });
      if (result.ok) {
        report.queued += 1;
        room -= 1;
      } else {
        report.refused += 1;
        // Kept on the build it would have followed, so it isn't tried every five minutes.
        await store.updateBuild(newest.id, { release: { ...(newest.release ?? { androidRollout: null, iosPhased: false }), appReleaseTried: { release: current, at: now.toISOString() } } }, now);
      }
      // One build per app a run: the next of its apps waits for this one.
      break;
    }
  }
  if (report.queued > 0) await deps.start();
  return report;
}

/** The version a Yallapp-release build gets: the last one's patch up. */
export function appReleaseVersion(last: Pick<Build, "versionName">): string {
  return bumpPatch(last.versionName);
}
