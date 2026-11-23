import type { BuildFolderRemover } from "../apps/build-files";
import { liveStoreUrl } from "../app/version-policy";
import type { DataStore } from "../data/store";
import type { ArtifactKind, Build, BuildPlatform, PublishingRequest } from "../data/types";
import { trackOf } from "../publishing/steps";
import { buildOnly } from "./view";

/**
 * 202 Old build files leave the files host. Every build uploads its files to
 * `builds/<build id>/` on files.yallapp.com.tr (build/scripts/upload.sh);
 * the daily job keeps only what the Builds page offers: for each app and each
 * of its apps (`Build.variant`), the files of its latest ready build for
 * Android and for the iPhone (the same build unless one was started for one
 * platform alone, 142). Every other finished build's folder is removed
 * (the same signed DELETE as an app's purge, lib/apps/build-files.ts) and its
 * `artifacts` emptied, with `release.filesRemovedAt` for the page.
 *
 * Once that latest build is on its store (Google Play's upload done; the
 * iPhone app on TestFlight, and sent to App Review when the platform sends
 * it) and the app is live there (its publishing request's track), the Builds
 * page shows the store's link in place of those files, and they can go too.
 * The files host removes whole folders only, so the latest build's folder
 * goes only when every file in it is replaced by a live store's link: the
 * upload key (keystore) never is, since it's the owner's and every update on
 * Google Play needs it, so an Android build that holds it stays until a newer
 * one replaces it. A new build's files stay, and show, until it's on the store.
 *
 * Nothing still moving is touched: a build queued or building, a stage
 * running, or an iPhone version waiting for App Review.
 */

/** Removals per run, so a first run over years of builds stays short (the rest go on the next days). */
export const RETENTION_REMOVALS_PER_RUN = 200;

/** The platform a file is for: the iOS app's is the .ipa; the rest come with the Android app. */
export function platformOf(kind: ArtifactKind): BuildPlatform {
  return kind === "ipa" ? "ios" : "android";
}

/** Whether a live store's page stands in for this file: the app and its store files, never the upload key. */
export function storeReplaces(kind: ArtifactKind): boolean {
  return kind !== "keystore";
}

/** The app's store pages, each only once the app is live there; null for the other apps of a project (their store pages aren't kept). */
export type StoreLinks = Record<BuildPlatform, string | null>;

export const NO_STORE_LINKS: StoreLinks = { android: null, ios: null };

export function liveStoreLinks(request: PublishingRequest | null, variant: Build["variant"] = "app"): StoreLinks {
  if (!request || (variant ?? "app") !== "app") return NO_STORE_LINKS;
  return { android: liveStoreUrl(trackOf(request, "android")), ios: liveStoreUrl(trackOf(request, "ios")) };
}

/**
 * Whether this build's app for the platform went to its store: the upload to
 * Google Play done; for the iPhone, TestFlight's done and App Review's sent
 * (or not sent by the platform for this build).
 */
export function uploadedToStore(build: Pick<Build, "status" | "stages">, platform: BuildPlatform): boolean {
  if (build.status !== "ready") return false;
  if (platform === "android") return build.stages.upload_play === "done";
  const review = build.stages.app_review;
  return build.stages.upload_testflight === "done" && (review === undefined || review === "done" || review === "skipped");
}

/** Still moving: queued or building (stalled too), a stage running, or a ready iPhone version waiting for App Review. */
export function stillMoving(build: Pick<Build, "status" | "stages">): boolean {
  if (build.status === "queued" || build.status === "building") return true;
  if (Object.values(build.stages).includes("running")) return true;
  return build.status === "ready" && build.stages.app_review === "pending";
}

/** The store link the Builds page shows in place of a build's files for the platform; null: its files. */
export function storeLinkFor(build: Pick<Build, "status" | "stages"> | null, platform: BuildPlatform, links: StoreLinks): string | null {
  return build && links[platform] && uploadedToStore(build, platform) ? links[platform] : null;
}

/** The builds whose files the page offers for each platform: the newest ready one that made it (as the Builds page reads them). */
export function offeredBuilds(builds: Build[]): Record<BuildPlatform, Build | null> {
  const ready = [...builds].sort((a, b) => b.number - a.number).filter((b) => b.status === "ready");
  return {
    android: ready.find((b) => buildOnly(b) !== "ios") ?? null,
    ios: ready.find((b) => buildOnly(b) !== "android") ?? null,
  };
}

/**
 * The builds of one app (one variant) whose folder can go: finished, not
 * moving, with files, and every file either not offered any more or offered
 * by a live store's link instead.
 */
export function buildsToClear(builds: Build[], links: StoreLinks): Build[] {
  const offered = offeredBuilds(builds);
  return builds.filter((build) => {
    if (build.artifacts.length === 0 || stillMoving(build)) return false;
    return build.artifacts.every((file) => {
      const platform = platformOf(file.kind);
      if (offered[platform]?.id !== build.id) return true;
      return storeReplaces(file.kind) && storeLinkFor(build, platform, links) !== null;
    });
  });
}

export interface RetentionDeps {
  store: DataStore;
  now: Date;
  /** The files host's remover (lib/apps/purge-env.ts); null when it isn't set up here (FILES_SIGNING_SECRET). */
  removeBuildFolder: BuildFolderRemover | null;
}

export interface RetentionReport {
  /** Build folders removed from the files host. */
  removed: number;
  /** Folders the files host didn't confirm: tried again on the next run. */
  failed: number;
  /** Apps whose builds couldn't be read: the others went on. */
  appsFailed: number;
  /** False when the files host isn't set up here: nothing was looked at. */
  ran: boolean;
}

/** The daily job: removes the folders `buildsToClear` finds, app by app, at most `limit` per run. */
export async function runBuildRetention(deps: RetentionDeps, limit = RETENTION_REMOVALS_PER_RUN): Promise<RetentionReport> {
  const report: RetentionReport = { removed: 0, failed: 0, appsFailed: 0, ran: false };
  const remove = deps.removeBuildFolder;
  if (!remove) {
    console.error("[builds] the files host isn't set up here (FILES_SIGNING_SECRET): old build files stay.");
    return report;
  }
  report.ran = true;
  const { store, now } = deps;
  for (const app of await store.listApps()) {
    if (report.removed + report.failed >= limit) break;
    try {
      const builds = await store.listBuildsByApp(app.id, 5000, "all");
      if (!builds.some((b) => b.artifacts.length > 0)) continue;
      const request = await store.getPublishingRequest(app.id);
      const variants = new Map<string, Build[]>();
      for (const build of builds) variants.set(build.variant ?? "app", [...(variants.get(build.variant ?? "app") ?? []), build]);
      for (const [variant, list] of variants) {
        for (const build of buildsToClear(list, liveStoreLinks(request, variant as Build["variant"]))) {
          if (report.removed + report.failed >= limit) break;
          try {
            // Only `builds/<build id>/`: the remover signs that path for this build's ID and nothing else.
            await remove(build.id);
          } catch (e) {
            console.error(`[builds] build folder ${build.id}: ${e instanceof Error ? e.message : String(e)}`);
            report.failed += 1;
            continue;
          }
          await store.updateBuild(build.id, { artifacts: [], release: { ...(build.release ?? { androidRollout: null, iosPhased: false }), filesRemovedAt: now.toISOString() } }, now);
          report.removed += 1;
        }
      }
    } catch (e) {
      console.error(`[builds] old build files of app ${app.id}: ${e instanceof Error ? e.message : String(e)}`);
      report.appsFailed += 1;
    }
  }
  return report;
}
