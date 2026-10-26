import type { Build, FailureCode } from "../data/types";

/**
 * 87.2 Why a build failed, from the pipeline's diagnosis (build/scripts/
 * diagnose.py): what happened and what to do, and the page to do it on.
 * The words are the dashboard's known texts (builds area) and go in the
 * client's email too. `unknown` keeps the pipeline's own message.
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
};

/** What to tell the client about a failure, or null when the diagnosis doesn't know. */
export function failureExplanation(build: Pick<Build, "failure">): { text: string; link: string | null } | null {
  const code = build.failure?.code;
  return code && code !== "unknown" ? FAILURE_TEXT[code] : null;
}
