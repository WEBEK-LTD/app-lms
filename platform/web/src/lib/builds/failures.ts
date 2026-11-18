import type { Build, BuildFailure, FailureCode, StageKey } from "../data/types";

/**
 * 87.2 Why a build failed, from the pipeline's diagnosis (build/scripts/
 * diagnose.py): what happened and what to do, and the page to do it on.
 * The words are the dashboard's known texts (builds area) and go in the
 * client's email too. `unknown` keeps the pipeline's own message.
 *
 * 151 The client's words never name GitHub, a Mac, a runner or the
 * pipeline: what to fix and where, or that it's on our side. The technical
 * cause (the code, the stage, the build's output) is for our team, in the
 * admin (`adminFailureDetail`).
 */
export const FAILURE_TEXT: Record<Exclude<FailureCode, "unknown">, { text: string; link: string | null }> = {
  icon: { text: "The build couldn't use your app's icon. Upload a 1024 × 1024 PNG without transparency on the Branding step, then start the build again.", link: "/dashboard/setup?step=branding" },
  firebase_android: {
    text: "Your google-services.json is for another Android package name. Download it again from Firebase for your app's package name, upload it on the Publishing step, then start the build again.",
    link: "/dashboard/setup?step=publishing",
  },
  firebase_ios: {
    text: "Your GoogleService-Info.plist is for another bundle ID. Download it again from Firebase for your app's bundle ID, upload it on the Publishing step, then start the build again.",
    link: "/dashboard/setup?step=publishing",
  },
  android_signing: { text: "The Android upload key couldn't be opened: its password doesn't match. Upload the keystore with its passwords again on the Publishing step.", link: "/dashboard/setup?step=publishing" },
  ios_signing: {
    text: "The iPhone app couldn't be signed: Apple has no certificate or profile for its bundle ID. Check that the bundle ID exists in your Apple Developer account and that your App Store Connect key has the App Manager role, then start the build again.",
    link: "/dashboard/setup?step=publishing",
  },
  apple_key: { text: "Apple didn't accept your App Store Connect key. Create a new key with the App Manager role in App Store Connect › Users and Access › Integrations and add it on the Publishing step.", link: "/dashboard/setup?step=publishing" },
  apple_agreement: { text: "Apple is waiting for you to accept an updated agreement. Accept it in App Store Connect › Business (or developer.apple.com › Account), then start the build again.", link: null },
  version_used: { text: "The store already has this version. Start the build again with a higher app version.", link: null },
  play_permission: {
    text: "Google Play refused the upload: your service account can't release this app. In Play Console › Users and permissions, give it the Release apps permission for your app, then start the build again.",
    link: "/dashboard/setup?step=publishing",
  },
  play_app_missing: {
    text: "Google Play doesn't have your app yet. Create it in Play Console with your app's package name and upload the first version by hand (the App Bundle below); after that, uploads are automatic.",
    link: "/dashboard/publishing",
  },
  infrastructure: { text: "Our build machine had a problem (its network or its disk), not your app. Start the build again; if it happens again, our team will look.", link: null },
  // 151
  ios_bundle_id_taken: {
    text: "Apple says your iPhone app's bundle ID already belongs to another Apple developer account. Choose a bundle ID of your own (like com.yourbrand.app) on the Store listing step, then start the build again.",
    link: "/dashboard/setup?step=listing",
  },
  ios_certificates_full: {
    text: "Your Apple developer account already has as many distribution certificates as Apple allows. Revoke one you no longer use in developer.apple.com › Certificates, or upload your distribution certificate (.p12) on the Publishing step, then start the build again.",
    link: "/dashboard/setup?step=publishing",
  },
  ios_app_missing: {
    text: "App Store Connect has no app with your iPhone app's bundle ID yet. Create it in App Store Connect › Apps with that bundle ID (see the App Store guide), then start a new build.",
    link: "/dashboard/publishing",
  },
  ios_no_mac_runner: {
    text: "The iPhone app wasn't built this time because of a temporary problem on our side, not in your app. Our team has been told. Try again later with iPhone only.",
    link: null,
  },
};

/** What to tell the client about a failure, or null when the diagnosis doesn't know. */
export function failureExplanation(build: Pick<Build, "failure">): { text: string; link: string | null } | null {
  const code = build.failure?.code;
  return code && code !== "unknown" ? FAILURE_TEXT[code] : null;
}

/** 151 GitHub had no Mac for the build's iOS job: on our side, tried again only by the client (iPhone only). */
export function noMacRunner(build: Pick<Build, "failure">): boolean {
  return build.failure?.code === "ios_no_mac_runner";
}

/** 151 The iPhone app's stages and causes. */
const IPHONE_STAGES: readonly StageKey[] = ["ios", "upload_testflight", "app_review"];
const IPHONE_CODES: readonly FailureCode[] = ["firebase_ios", "ios_signing", "apple_key", "apple_agreement", "ios_bundle_id_taken", "ios_certificates_full", "ios_app_missing", "ios_no_mac_runner"];

/** 151 Whether a failure is the iPhone app's: by its stage, else by its cause. */
export function isIphoneFailure(failure: BuildFailure | null | undefined): boolean {
  if (!failure) return false;
  return failure.stage ? IPHONE_STAGES.includes(failure.stage) : IPHONE_CODES.includes(failure.code);
}

/**
 * 151 Whether the client sees what the build printed (87.2): not for the
 * iPhone app, whose output is Xcode's and fastlane's; they get the cause in
 * plain words, and our team the output in the admin.
 */
export function clientSeesFailureLog(build: Pick<Build, "failure">): boolean {
  return Boolean(build.failure?.log) && !isIphoneFailure(build.failure);
}

/** 151 The technical side of a cause, for our team only (the admin, the team alert). */
const ADMIN_TEXT: Partial<Record<FailureCode, string>> = {
  ios_no_mac_runner:
    "GitHub had no macOS runner for the iOS job: it waited in the queue and GitHub cancelled it before any step ran. Not a build failure; nothing retries it. The client was told to try again later with iPhone only. If it keeps happening, look at GitHub › Actions (macOS capacity, the account's spending limit or concurrency).",
  ios_bundle_id_taken: "Apple refused to register the App ID: the bundle ID belongs to another team.",
  ios_certificates_full: "fastlane couldn't create a distribution certificate: the Apple team has the most it may have.",
  ios_app_missing: "The upload found no app record with this bundle ID in App Store Connect.",
};

/** 151 The admin's line on a build's cause: the reason code and stage, and what it means technically. */
export function adminFailureDetail(build: Pick<Build, "failure">): string | null {
  const failure = build.failure;
  if (!failure) return null;
  const code = `${failure.code}${failure.stage ? ` (${failure.stage})` : ""}`;
  const text = ADMIN_TEXT[failure.code];
  return text ? `${code}: ${text}` : code;
}
