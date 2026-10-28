import { createPrivateKey } from "node:crypto";
import { decrypt } from "../crypto/encryption";
import type { App } from "../data/types";
import { readPngInfo } from "../png";
import { REVIEW_LINK } from "../publishing/readiness";
import { hasReviewSignIn } from "../publishing/review-account";
import { checkGoogleServiceInfoPlist, checkGoogleServicesJson } from "../store-files";
import { androidUploadKeySchema, iosDistributionSchema, keyContext } from "./signing";

/**
 * 87.1 What a build would trip over, checked before it is queued: the icon,
 * the Firebase files against the app's package name and bundle ID (they may
 * have changed since the files were uploaded), the App Store Connect key and
 * the signing keys the pipeline will use. An error stops the build with what
 * to do and where; a warning only says what won't work. The words are the
 * dashboard's known texts (builds area), so they show in its language.
 */

export const PREFLIGHT_TEXT = {
  noIcon: "Your app has no icon yet. Upload one on the Branding step.",
  iconUnreadable: "Your app's icon can't be read. Upload it again on the Branding step.",
  iconSize: "Your app's icon must be a 1024 × 1024 PNG without transparency. Upload a new one on the Branding step.",
  firebaseAndroid: "Your Firebase file for Android doesn't match the app: {problem} Upload the right google-services.json on the Publishing step.",
  firebaseIos: "Your Firebase file for iPhone doesn't match the app: {problem} Upload the right GoogleService-Info.plist on the Publishing step.",
  firebaseMissing: "Push notifications won't reach phones until you add your Firebase files on the Publishing step.",
  appleKeyMissing: "The iPhone app can't be sent to App Store Connect until you add your App Store Connect key on the Publishing step.",
  appleKeyInvalid: "Your App Store Connect key can't be used: {problem} Add it again on the Publishing step.",
  iosCertificateInvalid: "Your iPhone distribution certificate can't be read. Upload the .p12 file again on the Publishing step.",
  androidKeyInvalid: "Your Android upload key can't be read. Upload the keystore again on the Publishing step.",
  reviewMissing: "Google Play and the App Store turn down apps their reviewers can't sign in to. Add your store review account on the Publishing page.",
} as const;

export interface PreflightCheck {
  key: "icon" | "firebase_android" | "firebase_ios" | "firebase" | "apple_key" | "ios_certificate" | "android_key" | "review";
  level: "error" | "warning";
  /** The English text (a known text of the builds area), with its values. */
  message: string;
  values?: Record<string, string>;
  /** Where to fix it. */
  link: string;
}

export interface PreflightDeps {
  /** The bytes of an upload (the icon, the Firebase files); null when it's gone. */
  readAsset: (assetId: string) => Promise<Buffer | null>;
  key: Buffer;
}

const KEY_ID = /^[A-Z0-9]{10}$/;
const ISSUER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The checks for a build with (or without) the iPhone app, sent to the stores for the client or not. */
export async function preflightChecks(deps: PreflightDeps, app: App, build: { ios: boolean; autoPublish: boolean }): Promise<PreflightCheck[]> {
  const out: PreflightCheck[] = [];
  const add = (key: PreflightCheck["key"], level: PreflightCheck["level"], message: string, link: string, values?: Record<string, string>) =>
    out.push({ key, level, message, link, ...(values ? { values } : {}) });

  // The icon the stores and the phone show.
  if (!app.iconAssetId) add("icon", "error", PREFLIGHT_TEXT.noIcon, "/dashboard/setup?step=branding");
  else {
    const data = await deps.readAsset(app.iconAssetId);
    const png = data ? readPngInfo(data) : null;
    if (!data) add("icon", "error", PREFLIGHT_TEXT.iconUnreadable, "/dashboard/setup?step=branding");
    else if (!png || png.width !== 1024 || png.height !== 1024 || png.hasTransparency) add("icon", "error", PREFLIGHT_TEXT.iconSize, "/dashboard/setup?step=branding");
  }

  // 102 A sign-in for the stores' reviewers, required for every app.
  if (!hasReviewSignIn(app)) add("review", "error", PREFLIGHT_TEXT.reviewMissing, REVIEW_LINK);

  // Firebase, against the package name and bundle ID the build will use.
  const notifications = "/dashboard/setup?step=publishing";
  if (app.firebaseAndroidAssetId && app.androidPackage) {
    const data = await deps.readAsset(app.firebaseAndroidAssetId);
    const problem = data ? checkGoogleServicesJson(data.toString("utf8"), app.androidPackage) : "The file is gone.";
    if (problem) add("firebase_android", "error", PREFLIGHT_TEXT.firebaseAndroid, notifications, { problem });
  }
  if (build.ios && app.firebaseIosAssetId && app.iosBundleId) {
    const data = await deps.readAsset(app.firebaseIosAssetId);
    const problem = data ? checkGoogleServiceInfoPlist(data.toString("utf8"), app.iosBundleId) : "The file is gone.";
    if (problem) add("firebase_ios", "error", PREFLIGHT_TEXT.firebaseIos, notifications, { problem });
  }
  if (!app.firebaseAndroidAssetId && !(build.ios && app.firebaseIosAssetId)) add("firebase", "warning", PREFLIGHT_TEXT.firebaseMissing, notifications);

  // The App Store Connect key: the iPhone app is uploaded with it.
  const publishing = "/dashboard/setup?step=publishing";
  if (build.ios) {
    if (!app.ascPrivateKeyEncrypted || !app.ascKeyId || !app.ascIssuerId) {
      if (build.autoPublish) add("apple_key", "warning", PREFLIGHT_TEXT.appleKeyMissing, publishing);
    } else {
      const problem = appleKeyProblem(app, deps.key);
      if (problem) add("apple_key", "error", PREFLIGHT_TEXT.appleKeyInvalid, publishing, { problem });
    }
    if (app.iosDistributionEncrypted && !readable(() => iosDistributionSchema.parse(JSON.parse(decrypt(app.iosDistributionEncrypted!, deps.key, keyContext.iosDistribution(app.id)))).p12_base64)) {
      add("ios_certificate", "error", PREFLIGHT_TEXT.iosCertificateInvalid, publishing);
    }
  }
  if (app.androidUploadKeyEncrypted && !readable(() => androidUploadKeySchema.parse(JSON.parse(decrypt(app.androidUploadKeyEncrypted!, deps.key, keyContext.androidUploadKey(app.id)))).keystore_base64)) {
    add("android_key", "error", PREFLIGHT_TEXT.androidKeyInvalid, publishing);
  }
  return out;
}

/** A key file decodes to DER (a PKCS#12 bundle or a keystore starts with 0x30, a JKS with FEEDFEED). */
function readable(base64: () => string): boolean {
  try {
    const der = Buffer.from(base64(), "base64");
    return der.length > 16 && (der[0] === 0x30 || der.readUInt32BE(0) === 0xfeedfeed);
  } catch {
    return false;
  }
}

function appleKeyProblem(app: App, key: Buffer): string | null {
  if (!KEY_ID.test(app.ascKeyId ?? "")) return "the key ID is 10 letters and numbers, like 2X9R4HXF34.";
  if (!ISSUER.test(app.ascIssuerId ?? "")) return "the issuer ID looks like 57246542-96fe-1a63-e053-0824d011072a.";
  try {
    const pem = decrypt(app.ascPrivateKeyEncrypted!, key, keyContext.appStore(app.id));
    const parsed = createPrivateKey(pem);
    if (parsed.asymmetricKeyType !== "ec") return "it isn't the .p8 file App Store Connect gives.";
  } catch {
    return "it isn't the .p8 file App Store Connect gives.";
  }
  return null;
}

/** The checks that stop the build. */
export function blocking(checks: readonly PreflightCheck[]): PreflightCheck[] {
  return checks.filter((c) => c.level === "error");
}

/** A check's English text with its values (the dashboard translates it as a known text). */
export function renderCheck(check: Pick<PreflightCheck, "message" | "values">): string {
  return check.message.replace(/\{(\w+)\}/g, (whole, name: string) => check.values?.[name] ?? whole);
}
