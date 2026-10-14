import type { ArtifactKind, Build, BuildStatus, StageKey } from "../data/types";
import type { Plan } from "../plans";
import { bumpPatch } from "../semver";

/**
 * How builds read on the Builds & downloads page, the admin and in emails:
 * plain words for each state, when a build counts as stalled, and why a
 * file can't be downloaded. Pure functions, so they're unit tested.
 */

/** A queued build the pipeline hasn't taken in this long is stalled (it checks every hour, or at once). */
export const QUEUED_STALL_MS = 24 * 60 * 60 * 1000;
/** A running build that reported nothing for this long is stalled (the jobs time out after 60 and 90 minutes). */
export const BUILDING_STALL_MS = 6 * 60 * 60 * 1000;

/** True when a queued or building build stopped moving: it no longer blocks a new build. */
export function isStalled(build: Pick<Build, "status" | "createdAt" | "updatedAt">, now: Date): boolean {
  if (build.status === "queued") return now.getTime() - build.createdAt.getTime() > QUEUED_STALL_MS;
  if (build.status === "building") return now.getTime() - build.updatedAt.getTime() > BUILDING_STALL_MS;
  return false;
}

/** Queued or building, and not stalled: the app's next build waits for it. */
export function isInProgress(build: Pick<Build, "status" | "createdAt" | "updatedAt"> | null | undefined, now: Date): boolean {
  return Boolean(build && (build.status === "queued" || build.status === "building") && !isStalled(build, now));
}

/** What a stalled build says once it's closed. */
export const STALLED_MESSAGE = "This build stopped without finishing, so nothing was published. Start it again with Try again.";

/** Short labels, the same everywhere. */
export const BUILD_STATUS_LABEL: Record<BuildStatus, string> = {
  queued: "Waiting to start",
  building: "Building",
  ready: "Ready",
  failed: "Didn't finish",
};

/** One sentence under the label. */
export function statusExplanation(build: Pick<Build, "status" | "createdAt" | "updatedAt">, now: Date): string {
  if (isStalled(build, now)) {
    return "This build is taking much longer than usual and has probably stopped. You can start it again; our team has been told.";
  }
  switch (build.status) {
    case "queued":
      return "Your build is in the queue and starts within a few minutes. This page shows each step as it runs.";
    case "building":
      return "Your apps are being built and signed. It usually takes 15 to 45 minutes; we email you when it's done.";
    case "ready":
      return "Your files are ready to download below.";
    case "failed":
      return "Nothing was published from this build.";
  }
}

const STAGE_FAILED: Partial<Record<StageKey, string>> = {
  android: "The Android app couldn't be built.",
  ios: "The iOS app couldn't be built.",
  upload_play: "The upload to Google Play didn't work.",
  upload_testflight: "The upload to TestFlight didn't work.",
};

/** Why a build didn't finish, in plain words: the pipeline's message, or what its stages say. */
export function failureReason(build: Pick<Build, "message" | "stages">): string {
  const message = build.message?.trim();
  if (message) return message;
  for (const stage of ["android", "ios", "upload_play", "upload_testflight"] as const) {
    if (build.stages[stage] === "failed") return STAGE_FAILED[stage]!;
  }
  return "The build didn't finish.";
}

/** The version the form suggests: a failed build published nothing, so its version can be tried again. */
export function suggestedVersion(latest: Pick<Build, "status" | "versionName"> | null | undefined): string {
  if (!latest) return "1.0.0";
  return latest.status === "failed" ? latest.versionName : bumpPatch(latest.versionName);
}

/** "8 min", "1 h 5 min": how long a build took (or has been running). */
export function formatDuration(from: Date | null, to: Date | null): string | null {
  if (!from || !to) return null;
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Why a file of the latest successful build can't be downloaded; null when it can. */
export function fileUnavailableReason(input: {
  kind: ArtifactKind;
  /** The latest ready build, or null. */
  build: Pick<Build, "artifacts"> | null;
  /** The app has an App Store Connect key saved. */
  hasAppStoreKey: boolean;
  /** Set when the file exists but links can't be signed. */
  linkProblem: string | null;
}): string | null {
  const { kind, build } = input;
  if (!build) return "Available after your first successful build";
  if (!build.artifacts.some((a) => a.kind === kind)) {
    if (kind === "ipa") {
      return input.hasAppStoreKey
        ? "Not in this build. Start a new build to get the iOS app."
        : "Add your App Store Connect key in App setup › Publishing to get the iOS app";
    }
    if (kind === "store_assets") return "Not in this build. Add an app icon in App setup › Branding, then start a new build.";
    return "Not in this build. Start a new build to get it.";
  }
  return input.linkProblem;
}

/** What each file is for, by plan. */
export function fileDescription(kind: ArtifactKind, plan: Plan | null): string {
  switch (kind) {
    case "apk":
      return "Install it directly on an Android phone to test your app";
    case "aab":
      return plan === "pro" ? "The file for Google Play. On Pro, we upload it for you" : "The file you upload to Google Play";
    case "ipa":
      return plan === "pro"
        ? "The iOS app. On Pro, we upload it to TestFlight for you"
        : "The iOS app. Upload it to App Store Connect with Apple's Transporter app";
    case "keystore":
      return "The keystore and its passwords. Every future update on Google Play needs this same key.";
    case "store_assets":
      return "Store icons, feature graphic, your screenshots and listing text";
  }
}
