import type { Plan } from "../plans";
import type { BuildConfig } from "../build-config/types";

export type ClientStatus = "pending" | "active" | "suspended";
export type LicenseState = "active" | "expired" | "suspended" | "invalid";
export type BuildStatus = "queued" | "building" | "ready" | "failed";
export type StageKey = "queued" | "android" | "ios" | "upload_play" | "upload_testflight";
export type StageStatus = "pending" | "running" | "done" | "failed" | "skipped";
export type ArtifactKind = "apk" | "aab" | "ipa" | "keystore" | "store_assets";
export type AssetKind = "icon" | "logo";
export type AppTemplate = "classic" | "bold" | "minimal";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  /** Bumped on password change; sessions carrying an older value are rejected. */
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date | null;
}

export interface Client {
  id: string;
  userId: string;
  whatsapp: string;
  siteUrl: string;
  status: ClientStatus;
  paymentNote: string | null;
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface License {
  id: string;
  clientId: string;
  /** SHA-256 of the normalised key, for lookups. */
  keyHash: string;
  /** The key, AES-256-GCM encrypted, so the client can always see it. */
  keyEncrypted: string;
  keyLast4: string;
  plan: Plan;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activation {
  licenseId: string;
  /** Normalised, e.g. `academy.com/learn`. */
  siteUrl: string;
  /** As sent by the plugin. */
  siteUrlRaw: string;
  pluginVersion: string;
  wpVersion: string | null;
  lms: string | null;
  activatedAt: Date;
  lastCheckedAt: Date;
}

export interface StoreListing {
  storeTitle: string;
  shortDescription: string;
  fullDescription: string;
  supportEmail: string;
  privacyUrl: string;
}

export interface App {
  id: string;
  clientId: string;
  appType: "lms";
  siteUrl: string | null;
  appName: string | null;
  shortName: string | null;
  iconAssetId: string | null;
  logoAssetId: string | null;
  primaryColor: string;
  splashColor: string;
  template: AppTemplate;
  font: string;
  androidPackage: string | null;
  iosBundleId: string | null;
  storeTitle: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  supportEmail: string | null;
  privacyUrl: string | null;
  /** Encrypted Google Play service account JSON. Never leaves the server. */
  googlePlayKeyEncrypted: string | null;
  googlePlayClientEmail: string | null;
  ascIssuerId: string | null;
  ascKeyId: string | null;
  /** Encrypted App Store Connect .p8 key. Never leaves the server. */
  ascPrivateKeyEncrypted: string | null;
  appTypeDoneAt: Date | null;
  websiteDoneAt: Date | null;
  brandingDoneAt: Date | null;
  listingDoneAt: Date | null;
  publishingDoneAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Artifact {
  kind: ArtifactKind;
  url: string;
  size?: number;
  sha256?: string;
}

export interface Build {
  id: string;
  clientId: string;
  appId: string;
  number: number;
  versionName: string;
  versionCode: number;
  status: BuildStatus;
  stages: Record<StageKey, StageStatus>;
  config: BuildConfig;
  storeListing: StoreListing;
  autoPublish: boolean;
  artifacts: Artifact[];
  message: string | null;
  logUrl: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedAt: Date;
}

export interface PluginRelease {
  id: string;
  version: string;
  changelog: string;
  requiresWp: string;
  requiresPhp: string;
  testedWp: string;
  blobKey: string;
  size: number;
  sha256: string;
  published: boolean;
  createdAt: Date;
}

export interface Asset {
  id: string;
  clientId: string;
  kind: AssetKind;
  blobKey: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

export interface ResetToken {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
