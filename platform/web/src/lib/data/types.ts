import type { Plan, PlanSetting } from "../plans";
import type { BuildConfig } from "../build-config/types";
import type { AppDefaultsSetting, Layout, LayoutContent } from "../pages/types";
import type { AdminRole } from "../admin/permissions";
import type { YallappPrice } from "../billing/prices";

export type ClientStatus = "pending" | "active" | "suspended";
export type LicenseState = "active" | "expired" | "suspended" | "invalid";
export type BuildStatus = "queued" | "building" | "ready" | "failed";
export type StageKey = "queued" | "android" | "ios" | "upload_play" | "upload_testflight" | MoreStoreStage;
/** 35, 36, 42 Uploads to Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps: builds queued before them don't have these stages. */
export type MoreStoreStage = "upload_galaxy" | "upload_appgallery" | "upload_xiaomi";
/** A build's stages. */
export type BuildStages = Record<Exclude<StageKey, MoreStoreStage>, StageStatus> & Partial<Record<MoreStoreStage, StageStatus>>;
export type StageStatus = "pending" | "running" | "done" | "failed" | "skipped";
export type ArtifactKind = "apk" | "aab" | "ipa" | "keystore" | "store_assets";
export type AssetKind = "icon" | "logo" | "play_screenshot" | "ios_screenshot" | "firebase_android" | "firebase_ios" | "product_image" | "huawei_agconnect";
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
  /**
   * 56 The language of the dashboard (and of Yallapp's emails to this person)
   * they chose: "en", "ar" or "tr"; null (or missing) until they choose one,
   * when the `yallapp_lang` cookie, else English, decides (lib/dashboard-lang.ts).
   */
  language?: string | null;
}

export interface Client {
  id: string;
  userId: string;
  whatsapp: string;
  siteUrl: string;
  status: ClientStatus;
  paymentNote: string | null;
  activatedAt: Date | null;
  /**
   * 52 The account's country (ISO 3166-1 alpha-2): set from the request at
   * sign-up and from the billing country on the payment form. It decides
   * the currency Yallapp's prices are shown in, before the request's own.
   */
  country?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An app's license: its plan, end date and key. Each app of an account has its own. */
export interface License {
  id: string;
  clientId: string;
  /**
   * The app it belongs to. Null only for a license given before the
   * account's first app existed: creating that app takes it.
   */
  appId: string | null;
  /** SHA-256 of the normalised key, for lookups. */
  keyHash: string;
  /** The key, AES-256-GCM encrypted, so the client can always see it. */
  keyEncrypted: string;
  keyLast4: string;
  plan: Plan;
  expiresAt: Date;
  /**
   * 13.3 A downgrade waiting for the end of the paid period: from
   * `nextPlanAt` on, the license is on `nextPlan` (the daily job writes it
   * into `plan`; `currentPlanId` reads it before then).
   */
  nextPlan?: Plan | null;
  nextPlanAt?: Date | null;
  /**
   * 68 The end date at which the app's WordPress site was asked to check its
   * license (`POST /license/refresh`): once per end, by the frequent job.
   */
  endRefreshedFor?: Date | null;
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
  /** 30 The shop plugin the site runs ("woocommerce") or "" for none; null: not reported (plugins before Phase 30). */
  store: string | null;
  /** 30 The booking plugin the plugin reads ("amelia", "latepoint"…) or "" for none; null: not reported. */
  bookings: string | null;
  activatedAt: Date;
  lastCheckedAt: Date;
}

export interface StoreListing {
  storeTitle: string;
  shortDescription: string;
  fullDescription: string;
  supportEmail: string;
  privacyUrl: string;
  /** Asset URLs, in store order. Missing on builds queued before screenshots existed. */
  phoneScreenshots?: string[];
  iphoneScreenshots?: string[];
}

/**
 * The app's engine: the Flutter module its build includes. "lms" is an
 * Academy app, "store" a Store app, "booking" a Bookings app, "real_estate" a
 * Real estate app (hosted API only), "news" a News & blog app (23), "events"
 * an Events & tickets app (28, hosted API only), "donations" a Charity &
 * donations app (29, hosted API only). What each engine is and offers is in
 * lib/app/kinds.ts.
 */
export type AppType = "lms" | "store" | "booking" | "real_estate" | "news" | "events" | "donations";

/** 20 The kind of business, on top of the engine: wording, defaults, the demo and marketing, never routes (lib/app/kinds.ts). */
export type AppVertical = "restaurant" | "clinic" | "fitness" | "charity";

/**
 * Where the app's content comes from: the Yallapp plugin on the client's
 * WordPress site, the client's own API (docs/api/openapi.yaml), a WordPress
 * site our team sets up for them (requested, not ready yet), or our hosted
 * API (`/api/app/{id}`), which signs customers in itself.
 */
export type AppBackend = "wordpress" | "custom_api" | "setup_requested" | "hosted";

/**
 * The platform that serves a hosted-API app's content. The access token is
 * stored encrypted (context `app:connector:<app id>`).
 */
export type ConnectorConfig =
  /** Shopify: the Storefront API token, and optionally an Admin API token (read_orders, read_customers) for order history. */
  | { kind: "shopify"; shopDomain: string; storefrontTokenEncrypted: string; adminTokenEncrypted?: string | null }
  /** No website: the products the client adds in the dashboard (catalog_* tables). */
  | { kind: "catalog" }
  /** No website: services, staff and hours set in the dashboard (`bookingSetup`), appointments in booking_appointments. */
  | { kind: "bookings" }
  /** No website: courses set in the dashboard (`courseSetup`), enrolments and progress in course_enrollments and lesson_progress. */
  | { kind: "courses" }
  /** Real estate: listings, the office settings, favorites and inquiries in the listing_* tables. */
  | { kind: "listings" }
  /** 23 News & blog: articles written in the dashboard (articles, article_categories, news_settings). */
  | { kind: "articles" }
  /** 28 Events & tickets: events, ticket types, tickets and settings in the event_* tables. */
  | { kind: "events" }
  /** 29 Charity & donations: campaigns and donations (campaigns, donations, donation_settings), paid into the charity's own iyzico account (`catalogSettings.payment`). */
  | { kind: "campaigns" }
  /**
   * A platform connected with keys (ikas, Ticimax, IdeaSoft, Wix, Teachable,
   * Thinkific, SimplyBook) or with OAuth through Yallapp's partner app
   * (Salla, Zid): `settings` holds the values that aren't secret,
   * `secretsEncrypted` the rest as encrypted JSON (lib/hosted/connectors/platforms.ts).
   */
  | { kind: "platform"; platform: string; settings: Record<string, string>; secretsEncrypted: string };

/** Sign-in and account rules of the hosted API, set per app. */
export interface HostedSettings {
  /** Asked at sign-up besides the name. */
  signupFields: ("email" | "city")[];
  signupAllowed: boolean;
  defaultCountryCode: string;
  /** Devices per customer; 0 for no limit. */
  deviceLimit: number;
  supportWhatsapp: string | null;
  termsUrl: string | null;
  /** App store review access: this number signs in with `reviewCode`, no message sent. */
  reviewPhone: string | null;
  reviewCode: string | null;
  /** 19 App store review access for email sign-in: this address signs in with `reviewCode`, no email sent. */
  reviewEmail?: string | null;
  /**
   * 18 How people sign in, as the owner chose on App sign-in (hosted and
   * WordPress apps). Missing until they choose: phone on the hosted API, the
   * plugin's own setting on WordPress.
   */
  signInMethods?: SignInMethod[];
  /** 18 The owner's own WhatsApp number on WABEK, for this app's phone codes; Yallapp's sender when missing. */
  whatsappSender?: AppWhatsappSender | null;
  /**
   * 19 When the owner's own WhatsApp number last failed to send a code (ISO
   * time). Yallapp's sender sent that code instead; cleared when the owner
   * saves a key, sends a test code that arrives, or goes back to Yallapp's number.
   */
  whatsappFailedAt?: string | null;
  /** 19 Own API apps: how the API signs people in, as the last API check on the Website step found it. */
  apiSignIn?: ApiSignInSnapshot | null;
  /**
   * 24 WordPress apps: how email sign-in works, as the owner chose on App
   * sign-in: `code` (anyone, a code by email; new people get an account) or
   * `password` (existing accounts). Missing: the plugin's own setting.
   */
  emailSignIn?: "code" | "password" | null;
  /** 24 The owner's own email server for emails to the app's users; Yallapp's server when missing. */
  mailServer?: AppMailServer | null;
  /**
   * 24 When the own email server last failed to send (ISO time), and why in
   * plain words (no secrets). Yallapp's server sent that email instead;
   * cleared when the owner saves the server or a test email goes out.
   */
  mailFailedAt?: string | null;
  mailFailedReason?: string | null;
  /**
   * 34 Own API apps: who signs people in. `api` (missing): the client's API
   * serves the sign-in endpoints. `yallapp`: Yallapp does, with the rules
   * above, and gives the app signed tokens the client's API checks with the
   * app's public keys (lib/hosted/app-auth.ts).
   */
  signInBy?: "api" | "yallapp" | null;
  /**
   * 45 Academy apps: whether students may save lessons for offline viewing,
   * as the owner chose on the Courses page. Missing until they choose: on for
   * courses managed in Yallapp, the plugin's own setting on WordPress. Needs
   * offline mode in the plan either way (lib/courses/downloads.ts).
   */
  offlineDownloads?: boolean | null;
  /**
   * 48 WordPress apps: the site's own paths that open the app on Android
   * (permalink bases like `/courses/`), as the plugin reported them with its
   * last license check. The next build lists them (`links.site_paths`).
   */
  sitePaths?: string[] | null;
  /**
   * 81.2 WordPress apps: what the site looks like, as the plugin reported it
   * with its last license check (`SiteInfo.brand`): for a draft app made
   * from it (81.3).
   */
  siteBrand?: SiteBrandReport | null;
  /**
   * 53 Screenshots and screen recording in the app, as the owner chose on the
   * Screen protection page: `off`, `content` (course content only, academies)
   * or `app` (every screen). Missing until they choose: off, or the plugin's
   * own setting on WordPress (lib/app/screen-protection.ts).
   */
  screenProtection?: "off" | "content" | "app" | null;
  /**
   * 72 Hide the video sites' own players (their branding and controls), as
   * the owner chose on the Screen protection page, at their own risk (it may
   * break YouTube's terms). Missing: false, each site's normal player
   * (lib/app/video-branding.ts).
   */
  hideVideoBranding?: boolean;
}

/**
 * 24 The owner's own email server (SMTP). The password is encrypted with the
 * context `app-smtp:<app id>` and never shown again.
 */
export interface AppMailServer {
  /** The service picked on the form (lib/email/app-mail-presets.ts), or "custom". */
  preset: string;
  host: string;
  port: number;
  security: "ssl" | "starttls" | "none";
  username: string;
  passwordEncrypted: string;
  fromName: string;
  fromAddress: string;
  replyTo: string | null;
  savedAt: string;
}

/** 19 What an own API's `GET /config` advertised for sign-in at the last API check. */
export interface ApiSignInSnapshot {
  checkedAt: string;
  /** The API address that was checked; shown only while it's the app's saved address. */
  baseUrl: string;
  methods: SignInMethod[];
  emailSignIn: "code" | "password" | null;
  previewSignIn: boolean;
}

export type SignInMethod = "phone" | "email";

/**
 * 34 A key pair that signs the access tokens of an own API app when Yallapp
 * signs people in. The private key (PKCS#8) is encrypted with the context
 * `app-auth-key:<app id>` and dropped when the key is retired; the public key
 * stays published for a day after that (`app_auth_keys`).
 */
export interface AppAuthKey {
  /** The key's JWK thumbprint (RFC 7638), sent as `kid`. */
  kid: string;
  appId: string;
  alg: "ES256";
  /** The public key as a JWK (kty, crv, x, y). */
  publicJwk: { kty: string; crv: string; x: string; y: string };
  privateKeyEncrypted: string | null;
  createdAt: Date;
  /** When a newer key replaced it; null for the key that signs now. */
  retiredAt: Date | null;
}

/** The owner's WABEK account: the API key encrypted (context `app-whatsapp:<app id>`), never shown again. */
export interface AppWhatsappSender {
  apiKeyEncrypted: string;
  /** The WABEK instance (number) that sends; WABEK picks one when null. */
  instanceId: string | null;
  /** The key's last 4 characters, to recognise it. */
  keyLast4: string;
  savedAt: string;
}

export const DEFAULT_HOSTED_SETTINGS: HostedSettings = {
  signupFields: [],
  signupAllowed: true,
  defaultCountryCode: "+90",
  deviceLimit: 2,
  supportWhatsapp: null,
  termsUrl: null,
  reviewPhone: null,
  reviewCode: null,
};

export interface App {
  id: string;
  clientId: string;
  appType: AppType;
  /** 20 The kind of business (null: the engine's own wording); chosen with the app type. */
  vertical?: AppVertical | null;
  siteUrl: string | null;
  backend: AppBackend;
  /** The client's own API base URL (backend "custom_api"). */
  apiBaseUrl: string | null;
  /** When the client asked our team to set up WordPress, and what they told us. */
  setupRequestedAt: Date | null;
  setupNote: string | null;
  appName: string | null;
  shortName: string | null;
  iconAssetId: string | null;
  logoAssetId: string | null;
  primaryColor: string;
  splashColor: string;
  template: AppTemplate;
  font: string;
  /** 33 The ready-made design (lib/pages/designs) the owner last started from; null for none. */
  design?: string | null;
  androidPackage: string | null;
  iosBundleId: string | null;
  storeTitle: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  supportEmail: string | null;
  privacyUrl: string | null;
  /** Store screenshots (asset IDs, in order): Google Play phone screenshots and iPhone 6.9" screenshots. */
  phoneScreenshotIds: string[];
  iphoneScreenshotIds: string[];
  /** Firebase config files (assets): google-services.json and GoogleService-Info.plist. Push is off without them. */
  firebaseAndroidAssetId: string | null;
  firebaseIosAssetId: string | null;
  /** Where a hosted-API app's content comes from; null until one is connected. */
  connector: ConnectorConfig | null;
  /** Hosted API rules (backend "hosted"); null means the defaults. */
  hostedSettings: HostedSettings | null;
  /** Encrypted Firebase service account JSON, for push from the hosted API. Never leaves the server. */
  firebaseServiceAccountEncrypted: string | null;
  /** Shop settings when the products are managed in the dashboard (connector "catalog"). */
  catalogSettings: CatalogSettings | null;
  /** 77 The chat's settings; null: on (when the plan has chat), without course groups. */
  chatSettings?: ChatSettings | null;
  /** Services, staff and rules when bookings are managed in the dashboard (connector "bookings"). */
  bookingSetup: BookingSetup | null;
  /** Courses when they're managed in the dashboard (connector "courses"). */
  courseSetup: CourseSetup | null;
  /** Encrypted Google Play service account JSON. Never leaves the server. */
  googlePlayKeyEncrypted: string | null;
  googlePlayClientEmail: string | null;
  ascIssuerId: string | null;
  ascKeyId: string | null;
  /** Encrypted App Store Connect .p8 key. Never leaves the server. */
  ascPrivateKeyEncrypted: string | null;
  /**
   * Encrypted JSON of the Android upload key the build pipeline created
   * (AndroidUploadKey in docs/api/pipeline.yaml). Set once, never replaced.
   */
  androidUploadKeyEncrypted: string | null;
  /** Encrypted JSON of the iOS distribution certificate (IosDistribution in docs/api/pipeline.yaml). Set once, never replaced. */
  iosDistributionEncrypted: string | null;
  /**
   * 35 Samsung Galaxy Store: the app's content ID in Seller Portal and the
   * Seller Portal service account (its private key encrypted). Used to upload
   * builds on plans with "We publish for you".
   */
  galaxyContentId?: string | null;
  galaxyServiceAccountId?: string | null;
  galaxyKeyEncrypted?: string | null;
  /**
   * 36 Huawei AppGallery: the app ID, the Connect API client for uploads (its
   * secret encrypted), agconnect-services.json (an asset, like the Firebase
   * files) and the app secret Huawei Push Kit sends with (encrypted).
   */
  huaweiAppId?: string | null;
  huaweiClientId?: string | null;
  huaweiClientSecretEncrypted?: string | null;
  huaweiAgconnectAssetId?: string | null;
  huaweiPushSecretEncrypted?: string | null;
  /**
   * 42 Xiaomi GetApps: the developer account's email, the automatic publishing
   * API's private key (encrypted), Xiaomi's public certificate (PEM, public)
   * and what's new in each update. Used to upload builds on plans with "We
   * publish for you".
   */
  xiaomiUserName?: string | null;
  xiaomiPasswordEncrypted?: string | null;
  xiaomiCertificate?: string | null;
  xiaomiReleaseNotes?: string | null;
  /**
   * 46 Links that open the app: the SHA-256 fingerprint of the Play App
   * Signing key (the owner copies it from Play Console), the upload key's
   * (reported by the build pipeline), both as uppercase hex pairs with
   * colons, and the Apple Team ID (reported by the iOS build or entered by the
   * owner). Public values: they're in the link files.
   */
  playSigningSha256?: string | null;
  androidUploadSha256?: string | null;
  appleTeamId?: string | null;
  /** 46 The last "Check links" on the dashboard. */
  linksCheck?: LinksCheckSnapshot | null;
  /** 80.1 The last test of each connection (Dashboard › Integrations, lib/integrations). */
  integrationChecks?: IntegrationChecks | null;
  /** 80.2 When the daily checks last looked at the app's connections; null: not yet. */
  integrationsCheckedAt?: Date | null;
  /** 46 The owner's switches (missing means on): the store's rating prompt after good moments, and crash reports. */
  reviewPrompt?: boolean;
  crashReports?: boolean;
  /** 47 The owner's IANA time zone, which Analytics counts days in; null or missing: from the account's country (lib/analytics/zone.ts). */
  timeZone?: string | null;
  appTypeDoneAt: Date | null;
  websiteDoneAt: Date | null;
  brandingDoneAt: Date | null;
  listingDoneAt: Date | null;
  publishingDoneAt: Date | null;
  /**
   * 14.1 Who publishes the app on the stores: the client ("self", with our
   * guides), or our team ("managed", through invitations to the client's own
   * store accounts; see PublishingRequest). Null until the client chooses.
   */
  publishingMode: PublishingMode | null;
  /**
   * 16 A demo app people can try before they pay (lib/demo): set only by the
   * admin's Demo apps page. It signs in with the public demo number only,
   * never takes card payments, and what visitors add is deleted after a day.
   */
  demo?: boolean;
  /** 16 The ready build whose APK /demo offers for download; null until the team picks one. */
  demoBuildId?: string | null;
  /**
   * 73 When the owner deleted the app (null: it isn't). A deleted app is gone
   * for everyone at once (the store leaves it out of every read) and its rows
   * and files are purged 7 days later unless our team restores it.
   */
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 46 One check of "Check links": what was looked at and what was wrong, in plain words. */
export interface LinksCheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

export interface LinksCheckSnapshot {
  /** ISO time of the check. */
  at: string;
  ok: boolean;
  checks: LinksCheckItem[];
}

/** 46 A crash group: the reports of one fingerprint for one app. */
export type CrashIssueStatus = "open" | "resolved";

export interface CrashIssue {
  id: string;
  appId: string;
  fingerprint: string;
  /** The error's type and message, scrubbed. */
  title: string;
  stack: string;
  library: string | null;
  screen: string | null;
  fatal: boolean;
  /** android and/or ios. */
  platforms: string[];
  /** App versions it was seen in, as "1.4.0 (14)", newest last, at most 20. */
  versions: string[];
  /** The last report's system, as "Android 14" or "iOS 18.1". */
  lastOs: string | null;
  count: number;
  status: CrashIssueStatus;
  firstSeenAt: Date;
  lastSeenAt: Date;
  resolvedAt: Date | null;
}

/** 46 A report as the store saves it: already checked and scrubbed (lib/crashes). */
export interface CrashReportInput {
  fingerprint: string;
  title: string;
  stack: string;
  library: string | null;
  screen: string | null;
  fatal: boolean;
  platform: "android" | "ios";
  version: string;
  os: string | null;
  at: Date;
}

/** 46 What a WordPress site and the platform's own link files need to know about an app. */
export interface AppLinkTarget {
  id: string;
  androidPackage: string | null;
  iosBundleId: string | null;
  playSigningSha256: string | null;
  androidUploadSha256: string | null;
  appleTeamId: string | null;
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
  stages: BuildStages;
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

/** A customer of a hosted-API app, signed in with their phone number. */
export interface HostedUser {
  id: number;
  appId: string;
  /** E.164, for example +905321234567. Null for someone who signed up by email (18). */
  phone: string | null;
  name: string;
  /** Lowercase. For an account made by email sign-in (no phone), the address it signs in with. */
  email: string | null;
  city: string | null;
  /** Notifications created up to then count as read. */
  notificationsReadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type HostedUserPatch = Partial<Pick<HostedUser, "name" | "email" | "city" | "notificationsReadAt">>;

export interface PushPreferences {
  announcements?: boolean;
  new_lessons?: boolean;
  daily_reminder?: boolean;
  /** 23 New articles (News & blog apps). */
  news?: boolean;
  /** 29 Updates about campaigns the user gave to (Charity & donations apps); off unless the app says true. */
  donations?: boolean;
}

/** A signed-in device of a hosted-API customer. */
export interface HostedDevice {
  /** Our row ID; the access token carries it. */
  id: string;
  appId: string;
  userId: number;
  /** The ID the app generated for this install. */
  deviceId: string;
  platform: "android" | "ios";
  name: string;
  appVersion: string;
  pushToken: string | null;
  /** 36 Where the token is from: Firebase ("fcm", the default) or Huawei Push Kit ("hms"). */
  pushProvider?: PushProvider;
  pushPreferences: PushPreferences | null;
  createdAt: Date;
  lastSeenAt: Date;
}

/** 36 The push service a device token belongs to. */
export type PushProvider = "fcm" | "hms";

/** A refresh token (stored hashed). Single use: rotating deletes it. */
export interface HostedRefreshToken {
  tokenHash: string;
  appId: string;
  userId: number;
  deviceRowId: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * A pending sign-in: "otp" waits for the code sent to `phone`; "signup" lets
 * a verified number create an account. Looked up by the hash of its token.
 */
export interface HostedChallenge {
  tokenHash: string;
  appId: string;
  kind: "otp" | "signup";
  /** The number, or null for an email sign-in (18). */
  phone: string | null;
  /** 18 The email address of an email sign-in, lowercase. */
  email: string | null;
  /** HMAC of the code ("otp" only). */
  codeHash: string | null;
  attempts: number;
  /** App store review number: the review code works, no message was sent. */
  review: boolean;
  expiresAt: Date;
  createdAt: Date;
}

/** A notification in customers' inboxes: to one customer, or to everyone when `userId` is null. */
export interface HostedNotification {
  id: number;
  appId: string;
  userId: number | null;
  title: string;
  body: string;
  /** 23 Breaking news: the article the notification opens. Missing or null for announcements. */
  articleId?: string | null;
  /** 28 An event that changed or was cancelled, told to its ticket holders. Missing or null otherwise. */
  eventId?: number | null;
  /** 29 A campaign update: the campaign the notification opens. Missing or null otherwise. */
  campaignId?: number | null;
  createdAt: Date;
}

// Catalog: products managed in the dashboard for apps without a website.

/** 37 EGP, SAR and AED for the Egyptian providers; each provider takes some of these (lib/payments/provider.ts). */
export type CatalogCurrency = "TRY" | "USD" | "EUR" | "EGP" | "SAR" | "AED";

/** 37 Who takes a card payment: iyzico, Kashier or Fawaterk. */
export type PaymentProviderId = "iyzico" | "kashier" | "fawaterk";

export interface CatalogSettings {
  currency: CatalogCurrency;
  /** Flat shipping for orders with physical products. */
  shippingCents: number;
  /** Orders at or above this subtotal ship free; null means never. */
  freeShippingOverCents: number | null;
  /**
   * Card payments: through the client's own merchant account (37 iyzico,
   * Kashier or Fawaterk), or through Yallapp's (marketplace: the shop gets
   * each sale minus Yallapp's commission; with iyzico it's a sub-merchant).
   */
  payment: OwnPayment | MarketplacePayment | null;
  /** 26 Pickup and delivery of a restaurant or café (vertical restaurant); missing until saved (the defaults apply). */
  fulfilment?: FulfilmentSettings | null;
}

/** 26 How a restaurant's orders are collected, and when its kitchen takes them. */
export interface FulfilmentSettings {
  pickup: boolean;
  delivery: boolean;
  pickupAddress: string | null;
  /** The smallest subtotal for a delivery; null for none. */
  minOrderCents: number | null;
  /** Added to deliveries. */
  deliveryFeeCents: number;
  /** Districts or postcodes it delivers to; empty: anywhere. */
  deliveryAreas: string[];
  /** Where it delivers, in the owner's words ("Within 3 km of Moda"). */
  deliveryNote: string | null;
  prepMinutes: number;
  /** The kitchen's IANA time zone. */
  timezone: string;
  /** Opening hours per weekday, Sunday first (7 entries), as bookings' working hours. */
  hours: TimeRange[][];
  /** Orders "as soon as possible" while open. */
  asap: boolean;
  /** Orders for a later time, every `slotStepMinutes`, up to `maxDaysAhead` days ahead (0: today). */
  scheduled: boolean;
  slotStepMinutes: number;
  maxDaysAhead: number;
}

/** 26 A choice made before adding a product to the cart (a dish's size or extras). */
export interface CatalogOptionGroup {
  /** Unique within the product. */
  id: string;
  name: string;
  /** At least this many options (0: optional). */
  min: number;
  max: number;
  options: CatalogOption[];
}

export interface CatalogOption {
  /** Unique within the product. */
  id: string;
  name: string;
  /** Added to the unit price. */
  priceDeltaCents: number;
}

export interface OwnIyzicoPayment {
  provider: "iyzico";
  /** Encrypted with context `app:payment:<app id>`. */
  apiKeyEncrypted: string;
  secretKeyEncrypted: string;
  sandbox: boolean;
}

/** 37 The client's own Kashier account: its merchant ID, Payment API key and secret key (encrypted like iyzico's). */
export interface OwnKashierPayment {
  provider: "kashier";
  /** MID-XXXX-XXXX; not a secret. */
  merchantId: string;
  apiKeyEncrypted: string;
  secretKeyEncrypted: string;
  /** Test keys (Kashier's test API). */
  sandbox: boolean;
}

/** 37 The client's own Fawaterk account: its API key (encrypted like iyzico's). */
export interface OwnFawaterkPayment {
  provider: "fawaterk";
  apiKeyEncrypted: string;
  /** A staging key (Fawaterk's staging API). */
  sandbox: boolean;
}

/** The client's own merchant account. */
export type OwnPayment = OwnIyzicoPayment | OwnKashierPayment | OwnFawaterkPayment;

export type SubMerchantType = "PERSONAL" | "PRIVATE_COMPANY" | "LIMITED_OR_JOINT_STOCK_COMPANY";

export interface MarketplacePayment {
  provider: "yallapp";
  /**
   * 37 The provider of Yallapp's account the shop joined with; missing:
   * iyzico. Only iyzico pays shops itself (sub-merchants); with Kashier or
   * Fawaterk the team transfers each released share to the shop's IBAN.
   */
  via?: PaymentProviderId;
  /** iyzico's key for the shop as a sub-merchant of Yallapp's account; empty with Kashier or Fawaterk. */
  subMerchantKey: string;
  subMerchantType: SubMerchantType;
  /** Who gets paid, as shown to the shop and the team. */
  payeeName: string;
  ibanLast4: string;
  /** 37 Kashier or Fawaterk: the payee's details for the team's transfers (PayoutDetails as JSON, encrypted with context `app:payment:<app id>`). */
  payoutEncrypted?: string;
  /** Whether the sub-merchant was made with Yallapp's sandbox keys. */
  sandbox: boolean;
  joinedAt: string;
}

export const DEFAULT_CATALOG_SETTINGS: CatalogSettings = {
  currency: "TRY",
  shippingCents: 0,
  freeShippingOverCents: null,
  payment: null,
};

export interface CatalogCategory {
  id: number;
  appId: string;
  name: string;
  position: number;
  createdAt: Date;
}

export interface CatalogProduct {
  id: number;
  appId: string;
  name: string;
  /** Plain text; paragraphs separated by blank lines. */
  description: string;
  priceCents: number;
  /** Lower price while on sale; null when not on sale. */
  salePriceCents: number | null;
  categoryIds: number[];
  imageAssetIds: string[];
  /** Units in stock; null means not tracked. */
  stock: number | null;
  /** Nothing to ship (and not sold in the iPhone app). */
  digital: boolean;
  featured: boolean;
  /** Hidden from the app when false. */
  active: boolean;
  sku: string | null;
  /** 26 Options chosen before adding to the cart; null or missing for none. */
  optionGroups?: CatalogOptionGroup[] | null;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CatalogProductInput = Omit<CatalogProduct, "id" | "salesCount" | "createdAt" | "updatedAt">;

export type CatalogOrderStatus = "pending" | "processing" | "completed" | "cancelled" | "failed" | "refunded";

export interface CatalogOrderLine {
  productId: number;
  name: string;
  quantity: number;
  unitCents: number;
  imageAssetId: string | null;
  digital: boolean;
  /** 26 The options chosen, as priced when ordered (in `unitCents`). */
  options?: { group: string; name: string; priceDeltaCents: number }[];
}

export interface CatalogCustomer {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
}

/**
 * An order from the app. It starts "pending" when the app asks for a checkout
 * link; the payment page fills in the customer and turns it "processing" once
 * the card payment succeeds.
 */
export interface CatalogOrder {
  id: number;
  appId: string;
  /** Hash of the token in the payment page link. */
  tokenHash: string;
  userId: number | null;
  status: CatalogOrderStatus;
  lines: CatalogOrderLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: CatalogCurrency;
  customer: CatalogCustomer | null;
  paymentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date;
  /** Yallapp's commission when the shop sells through Yallapp's account; null with the shop's own account. */
  commissionCents: number | null;
  /** iyzico's transaction per basket item, approved to release the shop's share; null for none. */
  itemTransactionIds: string[] | null;
  /** When the shop's share was approved for payout. */
  payoutApprovedAt: Date | null;
  /** 26 How a restaurant's order is collected; null or missing for other orders. */
  fulfilment?: CatalogFulfilment | null;
  /** 26 Where a restaurant's order is; null or missing for other orders. */
  fulfilmentStatus?: FulfilmentStatus | null;
  /** 37 Who takes the payment, set when it starts; null or missing: iyzico. */
  paymentProvider?: PaymentProviderId | null;
  /** 37 The provider's own reference for the started payment (Kashier's session, Fawaterk's invoice), read back to confirm it. */
  providerRef?: string | null;
  /** 80.3 When the pending-payments check last asked the provider about it; null or missing: never. */
  providerCheckedAt?: Date | null;
  /** 47 What was refunded so far (PaymentRefund); missing: nothing. All of it: the status is "refunded". */
  refundedCents?: number;
  /** 80.4 How the shop shipped it (any carrier, any country); null or missing until it is shipped. */
  shipment?: OrderShipment | null;
}

/**
 * 80.4 An order's shipment, as the shop entered it: no carrier account is
 * needed. At least one of the tracking link, the tracking number and the
 * waybill (its number, or a link to it).
 */
export interface OrderShipment {
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  waybill: string | null;
  /** ISO time it was marked shipped, or last changed. */
  shippedAt: string;
}

/** 47 What a refund is of: a shop's order (products, paid courses, memberships, tickets, a restaurant's order) or a donation. */
export type RefundKind = "order" | "donation";

/**
 * 47 A refund the owner made from the dashboard: through the provider's API
 * ("api": iyzico, Kashier), or in the provider's panel and recorded here
 * ("manual": Fawaterk, or when the API can't).
 */
export interface PaymentRefund {
  id: number;
  appId: string;
  kind: RefundKind;
  /** The order's or donation's ID. */
  targetId: number;
  amountCents: number;
  currency: CatalogCurrency;
  /** lib/payments/refund.ts REFUND_REASONS. */
  reason: string;
  /** The owner's words; null for none. */
  note: string | null;
  provider: PaymentProviderId;
  method: "api" | "manual";
  /** The provider's calls: iyzico's cancel or a refund per item, with their references. Empty for "manual". */
  parts: { kind: "cancel" | "refund"; transactionId: string | null; cents: number; reference: string }[];
  /** The provider's reference (the parts' references, or what the owner entered); null for none. */
  providerRef: string | null;
  /** Marketplace orders: Yallapp's commission given back with it (proportionally); null otherwise. */
  commissionCents: number | null;
  /** What it took back: tickets cancelled, courses left, memberships ended (their IDs). */
  revoked: { tickets: number[]; courses: number[]; memberships: number[] };
  /** Who made it: the owner, or a team member managing the dashboard. */
  byUserId: string | null;
  byEmail: string;
  createdAt: Date;
}

/** 26 Where a restaurant's order is: forward only, or cancelled. */
export type FulfilmentStatus = "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";

/** 26 How the customer gets a restaurant's order. The delivery fee is the order's `shippingCents`. */
export interface CatalogFulfilment {
  type: "pickup" | "delivery";
  /** Null: as soon as possible. */
  scheduledFor: string | null;
  address: { address: string; district: string | null; notes: string | null } | null;
}

export type CatalogOrderPatch = Partial<
  Pick<
    CatalogOrder,
    "status" | "customer" | "updatedAt" | "commissionCents" | "itemTransactionIds" | "payoutApprovedAt" | "fulfilmentStatus" | "paymentProvider" | "providerRef" | "shipment"
  >
>;

// Platform settings the team edits in the admin (secrets encrypted with context `platform:<key>`).

export type OtpSetting =
  | { kind: "whatsapp"; accessTokenEncrypted: string; phoneNumberId: string; template: string; language: string }
  | { kind: "webhook"; url: string; secretEncrypted: string }
  /** WABEK sends the code on WhatsApp from one of the account's numbers; null instance: WABEK picks one. */
  | { kind: "waabek"; apiKeyEncrypted: string; baseUrl: string; instanceId?: string | null }
  /** No codes are sent: sign-in on the hosted API fails with provider_error. */
  | { kind: "off" };

export interface SmtpSetting {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  passEncrypted: string | null;
  from: string;
}

/** Yallapp's own iyzico merchant account (plan payments and the marketplace). */
export interface YallappIyzicoSetting {
  apiKeyEncrypted: string;
  secretKeyEncrypted: string;
  sandbox: boolean;
}

/** 37 Yallapp's own Kashier account. */
export interface YallappKashierSetting {
  merchantId: string;
  apiKeyEncrypted: string;
  secretKeyEncrypted: string;
  sandbox: boolean;
}

/** 37 Yallapp's own Fawaterk account. */
export interface YallappFawaterkSetting {
  apiKeyEncrypted: string;
  sandbox: boolean;
}

/** 37 Which of Yallapp's accounts takes marketplace sales (and plan payments until Phase 52 gave them their own setting, `billing`); unset: iyzico. */
export interface PaymentProviderSetting {
  provider: PaymentProviderId;
}

/**
 * 52 Yallapp's own billing: the gateway its plans and add-ons are paid
 * through (unset: Kashier, in Egyptian pounds), and the exchange rate that
 * turns their pound prices into the dollar prices shown outside Egypt.
 */
export interface YallappBillingSetting {
  planProvider: PaymentProviderId;
  /** Egyptian pounds for one US dollar; null: only prices with their own dollar figure show in dollars. */
  egpPerUsd: number | null;
}

export interface PlatformSettingValues {
  otp: OtpSetting;
  smtp: SmtpSetting;
  iyzico: YallappIyzicoSetting;
  /** 37 Yallapp's Kashier and Fawaterk accounts, and which of its accounts takes payments. */
  kashier: YallappKashierSetting;
  fawaterk: YallappFawaterkSetting;
  paymentProvider: PaymentProviderSetting;
  /** 52 The gateway for Yallapp's own plans and add-ons, and the pound-to-dollar rate. */
  billing: YallappBillingSetting;
  /** The team's edits to the plans; plans without one keep the defaults in code. */
  plans: Partial<Record<Plan, PlanSetting>>;
  /** Shops selling through Yallapp's iyzico account; off until set. */
  marketplace: MarketplaceSetting;
  /** How clients reach Yallapp, shown across the website and the dashboard. */
  contact: ContactSetting;
  // 11.9 Defaults for new apps
  /** The look and languages new apps start with. */
  appDefaults: AppDefaultsSetting;
}

export interface ContactSetting {
  /** As shown, like +90 544 673 19 42. 72 The number for customers outside Egypt (and wherever the country isn't known). */
  whatsapp: string;
  /** 72 The number for customers in Egypt, as shown, like +20 104 256 0010. Missing in settings saved before Phase 72: the default. */
  whatsappEgypt?: string;
  email: string;
}

export interface MarketplaceSetting {
  /** Yallapp's share of each sale, in percent (0 to 50). */
  commissionPercent: number;
}

export type PlatformSettingKey = keyof PlatformSettingValues;

export interface PlatformSetting<K extends PlatformSettingKey = PlatformSettingKey> {
  key: K;
  value: PlatformSettingValues[K];
  updatedAt: Date;
  /** Email of the admin who saved it. */
  updatedBy: string;
}

export type PlanPaymentStatus = "pending" | "paid" | "failed";

/** A client paying an app's Yallapp plan by card, with Yallapp's own account (37 iyzico, Kashier or Fawaterk). */
export interface PlanPayment {
  id: string;
  clientId: string;
  /** The app whose plan it pays; null when paid before the account's first app existed (creating that app fills it in). */
  appId: string | null;
  plan: Plan;
  /** How long the payment extends the license. */
  months: 1 | 12;
  amountCents: number;
  currency: CatalogCurrency;
  status: PlanPaymentStatus;
  /** SHA-256 of the token in the callback address. */
  tokenHash: string;
  /** The provider's payment ID once paid. */
  paymentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
  /** 37 Who takes the payment; null or missing: iyzico (every payment before Phase 37). */
  paymentProvider?: PaymentProviderId | null;
  /** 37 The provider's own reference for the started payment, read back to confirm it. */
  providerRef?: string | null;
  /** 80.3 When the pending-payments check last asked the provider about it; null or missing: never. */
  providerCheckedAt?: Date | null;
  /**
   * 52 The price as the client saw it, when it was in another currency than
   * the charge (dollars outside Egypt): the receipt shows it as "about".
   */
  shownCents?: number | null;
  shownCurrency?: CatalogCurrency | null;
  /** 51 What it pays: the plan (with the storage packs renewed with it), or only storage packs. Missing: "plan". */
  purpose?: PlanPaymentPurpose | null;
  /** 51 The storage packs it pays for (bought now, or renewed with the plan); null or missing: none. */
  storagePacks?: PaidStoragePack[] | null;
}

// Bookings managed in the dashboard (connector "bookings").

export interface BookingRules {
  /** The business's IANA time zone. */
  timezone: string;
  currency: CatalogCurrency;
  maxDaysAhead: number;
  minMinutesAhead: number;
  /** Customers can cancel up to this many minutes before; null: not in the app. */
  cancelBeforeMinutes: number | null;
  /** Free times start every this many minutes. */
  slotStepMinutes: number;
  /** Customers can leave a note. */
  notes: boolean;
  /** New appointments are approved at once; otherwise they wait for the business. */
  autoApprove: boolean;
}

export interface BookingCategory {
  id: number;
  name: string;
}

export interface BookingService {
  id: number;
  categoryId: number | null;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  imageAssetId: string | null;
  color: string | null;
  active: boolean;
}

/** Opening hours of one day, like { start: "09:00", end: "17:00" }. */
export interface TimeRange {
  start: string;
  end: string;
}

export interface BookingStaff {
  id: number;
  name: string;
  title: string | null;
  imageAssetId: string | null;
  serviceIds: number[];
  /** Working hours per weekday, Sunday first (7 entries). */
  hours: TimeRange[][];
  /** Days off, as local dates (YYYY-MM-DD). */
  daysOff: string[];
  active: boolean;
  /** 21 A profile shown in the app (a doctor's fields, languages and introduction); missing in setups saved before. */
  specialties?: string[];
  languages?: string[];
  bio?: string | null;
}

/** 21 A question customers answer when booking (a clinic's intake form). */
export interface IntakeField {
  /** The key of its answer, like "reason". */
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "choice";
  /** The choices of a "choice" field. */
  options: string[];
  required: boolean;
}

/** 21 An answer, with the question as it was asked when booking. Health data: never in notifications. */
export interface IntakeAnswer {
  id: string;
  label: string;
  value: string;
}

/** Everything the business sets up in the dashboard, kept with the app (small, edited by one person). */
export interface BookingSetup {
  rules: BookingRules;
  categories: BookingCategory[];
  services: BookingService[];
  staff: BookingStaff[];
  /** The next ID for a category, service or staff member. */
  nextId: number;
  /** 21 Questions asked when booking, in order; missing in setups saved before (none). */
  intakeFields?: IntakeField[];
  /** 27 The weekly class timetable (a gym's or studio's group classes); missing: none. */
  classTemplates?: ClassTemplate[];
  /** 27 Membership plans sold in the app, in order; missing: none. */
  membershipPlans?: MembershipPlan[];
  /** 27 Booking a class needs an active membership ("Classes need a membership"); missing: false. */
  membershipRequired?: boolean;
}

/** 27 A class on the weekly timetable: the classes of the next weeks are made from it. */
export interface ClassTemplate {
  id: number;
  /** The service it is (its name, picture and colour), and its coach. */
  serviceId: number;
  staffId: number;
  /** 0 is Sunday. */
  weekday: number;
  /** The local start, like "07:30". */
  time: string;
  durationMinutes: number;
  capacity: number;
  active: boolean;
}

export type MembershipPeriod = "month" | "quarter" | "year" | "pack";

/** 27 A membership plan: unlimited or a number of classes, for a period or as a pack (no end). */
export interface MembershipPlan {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  period: MembershipPeriod;
  /** Classes it includes; null for unlimited (never for a pack). */
  credits: number | null;
  /** On sale in the app. */
  active: boolean;
}

export const DEFAULT_BOOKING_RULES: BookingRules = {
  timezone: "Europe/Istanbul",
  currency: "TRY",
  maxDaysAhead: 60,
  minMinutesAhead: 60,
  cancelBeforeMinutes: 24 * 60,
  slotStepMinutes: 30,
  notes: true,
  autoApprove: true,
};

export const DEFAULT_BOOKING_SETUP: BookingSetup = { rules: DEFAULT_BOOKING_RULES, categories: [], services: [], staff: [], nextId: 1 };

export type BookingStatus = "approved" | "pending" | "cancelled" | "rejected" | "no_show" | "completed";

/** Appointments that hold their time. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["approved", "pending"];

export interface BookingAppointment {
  id: number;
  appId: string;
  /** The app customer who booked; null once their account is gone. */
  userId: number | null;
  serviceId: number;
  staffId: number;
  /** Names when booked, so the history survives edits. */
  serviceName: string;
  staffName: string;
  customerName: string;
  /** E.164; null for someone who signed in by email (19). */
  customerPhone: string | null;
  /** 19 The address of someone who signed in by email; null otherwise. */
  customerEmail: string | null;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  priceCents: number;
  currency: CatalogCurrency;
  notes: string | null;
  /** 21 Answers to the intake questions; null when none were asked. Shown to the customer and on the dashboard only. */
  answers: IntakeAnswer[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingAppointmentPatch = Partial<Pick<BookingAppointment, "status" | "updatedAt">>;

/** 61 A new time (and maybe another staff member) for an appointment. */
export type BookingAppointmentMove = Pick<BookingAppointment, "staffId" | "staffName" | "startAt" | "endAt" | "updatedAt">;

// 27 Group classes and memberships (bookings managed in the dashboard).

export type ClassSessionStatus = "scheduled" | "cancelled";

/** One class on a day, made from a timetable entry; its own row so spots can be counted and locked. */
export interface ClassSession {
  id: number;
  appId: string;
  /** The timetable entry it was made from; null once that entry is gone. */
  templateId: number | null;
  serviceId: number;
  staffId: number;
  /** Names when made or last updated, so the history survives edits. */
  serviceName: string;
  staffName: string;
  startAt: Date;
  endAt: Date;
  capacity: number;
  /** Spots taken; never above the capacity. */
  bookedCount: number;
  status: ClassSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ClassSessionPatch = Partial<Pick<ClassSession, "templateId" | "serviceId" | "staffId" | "serviceName" | "staffName" | "endAt" | "capacity" | "updatedAt">>;

export type ClassBookingStatus = "booked" | "cancelled";

/** A customer's spot in a class (one row per class and customer). */
export interface ClassBooking {
  id: number;
  appId: string;
  sessionId: number;
  /** Null once their account is gone. */
  userId: number | null;
  /** The membership whose credit it used; null when none was used. */
  membershipId: number | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  status: ClassBookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Why a spot wasn't booked. */
export type BookClassFailure = "not_found" | "cancelled" | "too_late" | "full" | "membership_required" | "membership_frozen" | "no_credits";

export type BookClassResult = { ok: true; booking: ClassBooking; session: ClassSession } | { ok: false; reason: BookClassFailure };

/** What booking a spot needs. */
export interface BookClassInput {
  appId: string;
  sessionId: number;
  userId: number;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  /** An active membership is needed, and a credit is used when it has credits. */
  membershipRequired: boolean;
  /** Classes starting before this can't be booked any more. */
  bookableFrom: Date;
  now: Date;
}

/** A customer's membership. "Expired" isn't stored: an active one whose end has passed. */
export interface Membership {
  id: number;
  appId: string;
  userId: number;
  /** The plan, with its name and period when bought. */
  planId: number;
  planName: string;
  period: MembershipPeriod;
  /** Null for unlimited classes. */
  creditsLeft: number | null;
  status: "active" | "cancelled";
  startsAt: Date;
  /** Null for a pack of classes. */
  endsAt: Date | null;
  /** The paid order that started it; null when the business added it. */
  orderId: number | null;
  createdAt: Date;
  updatedAt: Date;
  /** 63 The hash of its member code (lib/bookings/member-codes.ts), once the code was shown or used; null before. */
  codeHash?: string | null;
  /**
   * 64 A freeze (lib/bookings/freeze.ts): from the start of a gym's day
   * until the start of the day it's back, or until unfrozen (`frozenUntil`
   * null). Kept after a freeze with an end is over; null when none was set.
   */
  frozenFrom?: Date | null;
  frozenUntil?: Date | null;
}

export type MembershipPatch = Partial<Pick<Membership, "status" | "endsAt" | "updatedAt">>;

/**
 * 63 A member checked in at the door of a gym: once a member (the app's user)
 * a day in the gym's time zone, whatever membership or phone did it.
 */
export interface MemberCheckIn {
  id: number;
  appId: string;
  membershipId: number;
  userId: number;
  /** The gym's day, YYYY-MM-DD. */
  day: string;
  at: Date;
  /** Who let them in (the dashboard's or Yallapp Business's person). */
  byName: string;
}

// 63 Questions and reviews of courses managed in the dashboard.

/** A student's review of a course; one per student and course. */
export interface CourseReview {
  id: number;
  appId: string;
  courseId: number;
  userId: number;
  rating: number;
  text: string;
  /** Hidden by the business: only its author sees it. */
  hidden: boolean;
  /** The business's public reply. */
  replyText: string | null;
  replyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseReviewPatch = Partial<Pick<CourseReview, "hidden" | "replyText" | "replyAt" | "updatedAt">>;

/** `open`: waiting for the business (new, or the student wrote again after its answer). */
export type CourseQuestionStatus = "open" | "answered";

export interface CourseQuestion {
  id: number;
  appId: string;
  courseId: number;
  userId: number;
  text: string;
  status: CourseQuestionStatus;
  /** 64 Hidden by the business: only its author sees it in the app. */
  hidden: boolean;
  /** Counted from its answers when read (a deleted student's answers go with their account); 64 the hidden ones aren't. */
  answerCount: number;
  createdAt: Date;
  /** The latest question or answer. */
  updatedAt: Date;
}

export type CourseQuestionInput = Omit<CourseQuestion, "id" | "answerCount" | "hidden">;

/** An answer under a question: a student's (`userId`), or the business's (`userId` null). */
export interface CourseAnswer {
  id: number;
  appId: string;
  questionId: number;
  userId: number | null;
  text: string;
  /** 64 Hidden by the business (a student's answer only): only its author sees it in the app. */
  hidden: boolean;
  createdAt: Date;
}

export type CourseAnswerInput = Omit<CourseAnswer, "id" | "hidden">;

// Courses managed in the dashboard (connector "courses").

export interface CourseLesson {
  id: number;
  title: string;
  /** A YouTube, Vimeo or direct video address; null for a text lesson. */
  videoUrl: string | null;
  /** Plain text shown under the video, or the whole lesson. */
  text: string;
  durationMinutes: number | null;
  /** Open to everyone, before enrolling. */
  preview: boolean;
}

export interface CourseTopic {
  id: number;
  title: string;
  lessons: CourseLesson[];
}

export interface Course {
  id: number;
  title: string;
  description: string;
  imageAssetId: string | null;
  /** 0 for a free course. Paid courses are bought on Android only, on the payment page. */
  priceCents: number;
  categoryIds: number[];
  instructorName: string | null;
  level: string | null;
  topics: CourseTopic[];
  active: boolean;
  /** 73 Students who finished it can start it again (missing: true). */
  canRestart?: boolean;
  createdAt: string;
}

export interface CourseSetup {
  currency: CatalogCurrency;
  categories: { id: number; name: string }[];
  courses: Course[];
  /** The next ID for a category, course, topic or lesson. */
  nextId: number;
}

export const DEFAULT_COURSE_SETUP: CourseSetup = { currency: "TRY", categories: [], courses: [], nextId: 1 };

export interface CourseEnrollment {
  appId: string;
  userId: number;
  courseId: number;
  /** How they got in: a free course, a payment (order number), or our client adding them. */
  source: "free" | "paid" | "manual";
  enrolledAt: Date;
}

export interface LessonProgress {
  appId: string;
  userId: number;
  courseId: number;
  lessonId: number;
  positionSeconds: number;
  completedAt: Date | null;
  updatedAt: Date;
}

// 10.7 Listings: property listings managed in the dashboard (connector "listings", Real estate apps).

export type ListingPurpose = "sale" | "rent";
export type ListingStatus = "draft" | "published" | "archived";
export type ListingAreaUnit = "m2" | "ft2";

export interface Listing {
  id: number;
  appId: string;
  /** The office's own code, like NH-1042. */
  reference: string | null;
  title: string;
  /** As the office wrote it: plain text or simple HTML, cleaned whenever it's served (lib/listings/html.ts). */
  description: string;
  purpose: ListingPurpose;
  /** A property type key (lib/listings/types.ts), like "apartment". */
  type: string;
  priceCents: number;
  /** ISO 4217, like EGP. */
  currency: string;
  /** For rent: per month or per year; null for sale. */
  pricePeriod: "month" | "year" | null;
  negotiable: boolean;
  city: string;
  district: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** In the office's area unit. */
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  yearBuilt: number | null;
  furnished: boolean | null;
  /** Amenities, like "Elevator" or "Garden". */
  features: string[];
  /** Photos (asset IDs), in the order the app shows them. */
  imageAssetIds: string[];
  videoUrl: string | null;
  featured: boolean;
  /** Only published listings are in the app. */
  status: ListingStatus;
  /** When it was first published: the app's "newest" order. */
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingInput = Omit<Listing, "id" | "createdAt" | "updatedAt">;

/** The office's settings, sent to the app as `Config.listings`. */
export interface ListingSettings {
  currency: string;
  areaUnit: ListingAreaUnit;
  contactName: string;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactEmail: string | null;
  /** Whether app users can message the office. */
  messages: boolean;
}

export interface ListingFavorite {
  appId: string;
  userId: number;
  listingId: number;
  createdAt: Date;
}

export type ListingInquiryStatus = "open" | "closed";

/** A conversation between an app user and the office about one listing. */
export interface ListingInquiry {
  id: number;
  appId: string;
  listingId: number;
  userId: number;
  status: ListingInquiryStatus;
  createdAt: Date;
  /** The latest message or status change. */
  updatedAt: Date;
}

export interface ListingInquiryMessage {
  id: number;
  appId: string;
  inquiryId: number;
  from: "user" | "office";
  text: string;
  /** When the other side saw it. */
  readAt: Date | null;
  createdAt: Date;
}

/** A conversation as lists show it: the latest message and what each side hasn't read. */
export interface ListingInquiryRow extends ListingInquiry {
  lastMessage: ListingInquiryMessage | null;
  /** Office messages the user hasn't seen. */
  unreadByUser: number;
  /** User messages the office hasn't seen. */
  unreadByOffice: number;
}

// 10.4 Pages, looks and languages

/**
 * An app's pages, tabs, look and languages: the draft the client edits in the
 * dashboard and the copy apps get, from their last publish.
 */
export interface AppLayoutRecord {
  appId: string;
  draft: LayoutContent;
  draftUpdatedAt: Date;
  /** Null until the first publish. */
  published: Layout | null;
  publishedAt: Date | null;
  /** Email of whoever published last. */
  publishedBy: string | null;
  /** How many times the layout was published; part of the version. */
  publishCount: number;
}

// 11.7 Admin team and audit log

/** Someone of the WEBEK team in the super admin pages, besides SUPER_ADMIN_EMAILS (always owners). */
export interface AdminMember {
  userId: string;
  role: AdminRole;
  /** Email of the owner who invited them or last changed their role. */
  addedBy: string;
  addedAt: Date;
  updatedAt: Date;
}

export interface AdminMemberRow {
  member: AdminMember;
  user: User;
}

/** Changed fields of an audit entry, secrets redacted. */
export interface AuditChanges {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/** One change made in the admin: who, when, what and to what. */
export interface AuditEntry {
  id: number;
  at: Date;
  /** The team member's user ID; null once their account is gone. */
  actorId: string | null;
  actorEmail: string;
  /** A key from lib/admin/audit-actions.ts, like client.activate. */
  action: string;
  targetType: string;
  targetId: string | null;
  /** The client the change concerns, for their page in the admin. */
  clientId: string | null;
  summary: string;
  changes: AuditChanges | null;
}

export interface AuditQuery {
  /** Part of the team member's email. */
  actor?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  clientId?: string;
  /** Entries at or after `from` and before `to`. */
  from?: Date;
  to?: Date;
  offset: number;
  limit: number;
}

// 11.5 Switches

/**
 * App types, websites and features the team switched off (keys like
 * `app_type:store`, `website:ikas`, `feature:push`; lib/switches.ts), for
 * everyone or per plan. Everything not listed is on.
 */
export interface SwitchesSetting {
  off: string[];
  offByPlan: Partial<Record<Plan, string[]>>;
}

/** Merged into the settings above. */
export interface PlatformSettingValues {
  switches: SwitchesSetting;
}

/** 62 The daily job's look at the media folders: folders of apps that no longer exist, and when each was first seen (lib/media/sweep.ts). */
export interface MediaSweepSetting {
  orphans: Record<string, string>;
}

export interface PlatformSettingValues {
  mediaSweep: MediaSweepSetting;
}


// 11.3 Website content

/** The team's edit of one page or section of yallapp.com.tr (lib/content/site.ts); pages without one show the text in code. */
export interface SiteContentRecord {
  key: string;
  /** Every field of the page, as saved. */
  fields: Record<string, string>;
  updatedAt: Date;
  /** Email of the admin who saved it. */
  updatedBy: string;
}

// 11.4 Email templates

/** The team's edit of one email (lib/email/templates.ts); emails without one use the text in code. */
export interface EmailTemplateRecord {
  key: string;
  subject: string;
  body: string;
  updatedAt: Date;
  updatedBy: string;
}

// 11.6 Coupons

export type CouponDiscount =
  | { kind: "percent"; percent: number }
  /** Cents off per currency; a plan in a currency without an amount gets no discount. */
  | { kind: "fixed"; amounts: Partial<Record<CatalogCurrency, number>> };

/** A discount on plan card payments. */
export interface Coupon {
  id: string;
  /** Upper case; clients may type it in any case. */
  code: string;
  /** For the team only. */
  note: string;
  discount: CouponDiscount;
  /** The plans it applies to; null for every plan. */
  plans: Plan[] | null;
  /** Billing periods in months it applies to; null for every period. */
  periods: (1 | 12)[] | null;
  validFrom: Date | null;
  validUntil: Date | null;
  /** Uses across every client; null for no limit. */
  maxRedemptions: number | null;
  /** Uses per client; null for no limit. */
  maxPerClient: number | null;
  /** Only for an app's first payment: an app never activated (see checkCoupon). */
  firstPaymentOnly: boolean;
  /** Off: clients can't use it anymore. */
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type CouponPatch = Partial<Omit<Coupon, "id" | "createdAt" | "createdBy">>;

/**
 * A coupon used on a plan payment: "pending" while the client is on
 * iyzico's page, "redeemed" once the payment is paid (at once for a free
 * one), "failed" when the payment fails.
 */
export interface CouponRedemption {
  couponId: string;
  /** The plan payment (plan_payments.id). */
  paymentId: string;
  clientId: string;
  code: string;
  plan: Plan;
  /** The plan's price before the coupon, and what the coupon took off. */
  fullCents: number;
  discountCents: number;
  currency: CatalogCurrency;
  status: "pending" | "redeemed" | "failed";
  createdAt: Date;
  redeemedAt: Date | null;
}

// 11.8 Announcements

export type AnnouncementSeverity = "info" | "warning";

/** 57 What an announcement is, shown as a chip in the dashboard's bell: an update, an announcement (the default), maintenance or an offer. */
export type AnnouncementKind = "update" | "announcement" | "maintenance" | "offer";

/** Which clients see an announcement. */
export type AnnouncementAudience =
  | { kind: "all" }
  | { kind: "plan"; plans: Plan[] }
  | { kind: "app_type"; appTypes: AppType[] }
  | { kind: "state"; states: ("pending" | "active" | "expired" | "suspended")[] };

export interface Announcement {
  id: string;
  title: string;
  /** Markdown (lib/content/markdown.ts), rendered without HTML. */
  body: string;
  audience: AnnouncementAudience;
  severity: AnnouncementSeverity;
  /** 57 Its chip in the bell ("announcement" for every announcement from before Phase 57). */
  kind: AnnouncementKind;
  /** 57 Also on the overview's banner until closed (as before Phase 57); false: only in the bell and the list. */
  showAsBanner: boolean;
  /** 57 Optional Arabic and Turkish title and message (`announcementText` falls back to English). */
  titleAr: string | null;
  bodyAr: string | null;
  titleTr: string | null;
  bodyTr: string | null;
  /** An optional link under the text. */
  linkUrl: string | null;
  linkLabel: string | null;
  /** Shown from this time, until `endsAt` when set. */
  startsAt: Date;
  endsAt: Date | null;
  /** When it was emailed to its audience, and to how many clients. */
  emailedAt: Date | null;
  emailedCount: number;
  /** 61 When it was pushed to the owners' phones (Yallapp Business): at creation when live, else by the frequent job when it starts. */
  pushedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type AnnouncementPatch = Partial<Omit<Announcement, "id" | "createdAt" | "createdBy">>;

// 14.1 We publish for you

export type PublishingMode = "self" | "managed";

/** The stores, as the publishing service tracks them: Google Play, the App Store and (35, 36, 42) the extra Android stores. */
export type PublishingStore = "android" | "ios" | MoreStore;

/** 35, 36, 42 Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps: only when the client asks for them. */
export type MoreStore = "galaxy" | "huawei" | "xiaomi";

/** Where publishing on one store stands, as the team moves it along. */
export type PublishingStatus = "waiting_client" | "accounts_ready" | "submitted" | "in_review" | "live" | "rejected";

/** The client's checklist (lib/publishing/steps.ts): when each step was ticked, as ISO times. */
export type PublishingChecklist = Partial<Record<string, string>>;

/** Store listing details the setup wizard doesn't ask for. Everything else comes from the app's Store listing step. */
export interface PublishingListing {
  /** Google Play's category, like "Education". */
  playCategory: string | null;
  /** The App Store's primary category, like "Education". */
  appStoreCategory: string | null;
  /** Notes for the content rating questionnaires: violence, user content, purchases, ads, data collected… */
  contentRatingNotes: string | null;
  /** For the stores' reviewers, like how to sign in. */
  reviewNotes: string | null;
}

/** 35, 36 How the extra stores' tracks are kept (publishing_requests.more_stores): dates as ISO strings. */
export type MoreStoresRow = Partial<Record<MoreStore, (Omit<PublishingTrack, "updatedAt"> & { updatedAt: string | null }) | null>>;

/** Publishing on one store. */
export interface PublishingTrack {
  status: PublishingStatus;
  /** The team's note to the client: why it was rejected, what's next. Shown on the dashboard and in the email. */
  note: string | null;
  /** The app's public store page, once it's live. */
  storeUrl: string | null;
  /** When the status last changed; null while it's the first one. */
  updatedAt: Date | null;
}

/**
 * An app the client asked us to publish (or decided to publish themselves).
 * We never store, or ask for, the client's Google or Apple passwords: the
 * client invites our team email to their own accounts.
 */
export interface PublishingRequest {
  appId: string;
  clientId: string;
  mode: PublishingMode;
  /** Who creates the Firebase project for push notifications. */
  firebaseBy: "client" | "team";
  checklist: PublishingChecklist;
  listing: PublishingListing;
  android: PublishingTrack;
  ios: PublishingTrack;
  /** 35, 36 Galaxy Store and AppGallery: null (or absent) when the client doesn't want the app there. */
  galaxy?: PublishingTrack | null;
  huawei?: PublishingTrack | null;
  /** 42 Xiaomi GetApps, the same way. */
  xiaomi?: PublishingTrack | null;
  /** The team's own notes, never shown to the client. */
  teamNotes: string | null;
  /** When the client chose "Publish it for me" (the queue's order). */
  requestedAt: Date | null;
  /** When the client finished the checklist; null while steps are open. */
  readyAt: Date | null;
  /**
   * 19 When the last email to the publishing team wasn't sent (SMTP missing or
   * failing); null (or absent) once one goes out. Shown on the request in the admin.
   */
  teamEmailFailedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One status change, for the history on the dashboard and in the admin. 19 Or
 * the client choosing how the app is published: store "mode", status the
 * mode they chose ("managed" or "self").
 */
export interface PublishingEvent {
  id: number;
  appId: string;
  store: PublishingStore | "mode";
  status: PublishingStatus | PublishingMode;
  note: string | null;
  /** The team member who changed it (or the client, for a mode change). */
  actorEmail: string;
  at: Date;
}

/** The platform setting for the publishing service (admin Settings). */
export interface PublishingSetting {
  /** The address clients invite to their Google Play, App Store Connect and Firebase accounts. */
  teamEmail: string;
}

export interface PlatformSettingValues {
  publishing: PublishingSetting;
}

/**
 * 71 What Yallapp's receipts say under its name (admin Settings › Invoices):
 * the lines the team writes, like a legal name, an address or a tax number.
 * None until the team sets them: nothing is made up.
 */
export interface InvoiceSetting {
  lines: string[];
}

export interface PlatformSettingValues {
  invoice: InvoiceSetting;
}

// 25 Salla and Zid stores

/**
 * Yallapp's partner app on a store platform (Salla Partners, Zid Partner
 * Dashboard): stores connect to it with OAuth. Secrets are encrypted with the
 * context `platform:<key>`.
 */
export interface PartnerAppSetting {
  clientId: string;
  clientSecretEncrypted: string;
  /** Signs the platform's webhooks; null when not set. */
  webhookSecretEncrypted: string | null;
}

export interface PlatformSettingValues {
  sallaApp: PartnerAppSetting;
  zidApp: PartnerAppSetting;
}

// 13 Plans, limits and owner notices

/**
 * What the dashboard tells an app's owner, also sent by email: app users near
 * or at the plan's limit, and the plan ending in 7 days, tomorrow or today.
 */
export type OwnerNoticeKind =
  | "app_users_80"
  | "app_users_100"
  | "plan_ends_7"
  | "plan_ends_1"
  | "plan_ends_0"
  // 19 The WordPress site our team set up is ready; the app's own API failed its last check.
  | "wordpress_ready"
  | "api_check_failed"
  // 49 A ticket payment came after its places were released and the event was full.
  | "ticket_refund_due"
  // 51 Media and storage: a storage pack ended while the app's files are over what it now has.
  | "storage_pack_ended"
  // 77 Chat messages are deleted within 30 days unless the business keeps them.
  | "chat_expiring"
  // 80.2 A daily check found one of the app's connections broken (one per connection; `integration_failed:<key>:<n>`).
  | "integration_failed";

export interface OwnerNotice {
  id: number;
  clientId: string;
  appId: string;
  kind: OwnerNoticeKind;
  /**
   * Unique per app: one notice (and one email) per crossing of a limit or per
   * license period, e.g. `plan_ends_7:2027-03-31T23:59:59.999Z`.
   */
  dedupeKey: string;
  title: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  tone: "info" | "warn";
  createdAt: Date;
  emailedAt: Date | null;
  /** The owner closed it in the dashboard. */
  dismissedAt: Date | null;
  /** No longer true (users went below the threshold, the plan was renewed): hidden. */
  resolvedAt: Date | null;
}

export type OwnerNoticePatch = Partial<Pick<OwnerNotice, "emailedAt" | "dismissedAt" | "resolvedAt">>;

// 16 Demo apps people can try

/** Where the demo apps live (lib/demo): the account the admin's Demo apps page made. */
export interface DemoSetting {
  /** The "Yallapp demos" account. Only this account's apps marked `demo` are demo apps. */
  clientId: string;
}

export interface PlatformSettingValues {
  demo: DemoSetting;
}

/** What the daily job deleted from one demo app: visitors' activity from before a time. */
export interface DemoPurgeCounts {
  orders: number;
  appointments: number;
  inquiries: number;
  favorites: number;
  enrollments: number;
  progress: number;
  devices: number;
  notifications: number;
  /** 27 Spots in classes, and memberships. */
  classBookings: number;
  memberships: number;
  /** 28 Tickets of demo Events & tickets apps. */
  tickets: number;
  /** 29 Demo donations (nothing was charged; campaign totals never counted them). */
  donations: number;
  /** 63 Visitors' course questions (with their answers) and reviews. */
  questions: number;
  reviews: number;
}

// 23 News & blog apps: articles written in the dashboard

export type ArticleStatus = "draft" | "published";

export interface Article {
  id: number;
  appId: string;
  title: string;
  /** A short summary in plain text; made from the body when empty. */
  excerpt: string | null;
  /** As the editor wrote it: simple HTML, cleaned whenever it's served (lib/news/html.ts). */
  body: string;
  imageAssetId: string | null;
  /** The author's name as shown in the app. */
  author: string | null;
  /** Categories (article_categories), in the order chosen. */
  categoryIds: number[];
  featured: boolean;
  /** Only published articles are in the app. */
  status: ArticleStatus;
  /** When it was first published: the app's "newest" order. */
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ArticleInput = Omit<Article, "id" | "createdAt" | "updatedAt">;

export interface ArticleCategory {
  id: number;
  appId: string;
  name: string;
  position: number;
  createdAt: Date;
}

/** How articles show in the app (`Config.news`), for articles written in the dashboard or read from a feed. */
export interface NewsSettings {
  showAuthor: boolean;
  showDates: boolean;
}

// 28 Events & tickets apps: events, ticket types and tickets managed in the dashboard

/** Draft: only the organiser sees it. Published: in the app. Cancelled: in the app as cancelled, no tickets sold. */
export type EventStatus = "draft" | "published" | "cancelled";

export interface EventRecord {
  id: number;
  appId: string;
  title: string;
  /** As the organiser wrote it: simple HTML, cleaned whenever it's served (lib/news/html.ts). */
  description: string;
  /** One category name, or none. The app's filters list the ones in use. */
  category: string | null;
  /** Pictures; the first one is the cover. */
  imageAssetIds: string[];
  startAt: Date;
  endAt: Date;
  /** Where it happens; null for an online-only event (digital content on iOS). */
  venueName: string | null;
  venueAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  /** The link to join online; sent only to ticket holders. */
  onlineUrl: string | null;
  organiser: string | null;
  /** Places across every ticket type; null for no limit beyond the ticket types' own. */
  capacity: number | null;
  status: EventStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EventInput = Omit<EventRecord, "id" | "createdAt" | "updatedAt">;

export interface TicketType {
  id: number;
  appId: string;
  eventId: number;
  name: string;
  /** 0 for free tickets (taken in the app). */
  priceCents: number;
  /** Tickets of this type; null for no limit (the event's own limit still counts). */
  capacity: number | null;
  /** No sales after this moment; the event's start ends sales anyway. */
  saleEndsAt: Date | null;
  maxPerOrder: number;
  position: number;
  createdAt: Date;
}

export type TicketTypeInput = Omit<TicketType, "id" | "createdAt">;

/**
 * pending: places held for a paid order until `holdUntil` (not a ticket yet);
 * valid: issued; used: checked in at the door; cancelled: by the holder, the
 * organiser or with the event.
 */
export type TicketStatus = "pending" | "valid" | "used" | "cancelled";

export interface EventTicket {
  id: number;
  appId: string;
  eventId: number;
  ticketTypeId: number;
  /** The app user who got it; null after they deleted their account. */
  userId: number | null;
  /** The paid order (catalog_orders) it came with; null for free tickets. */
  orderId: number | null;
  /** 12 random characters (lib/events/codes.ts), unique. */
  code: string;
  holderName: string;
  priceCents: number;
  status: TicketStatus;
  /** Pending tickets hold their place until then. */
  holdUntil: Date | null;
  usedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  /** 47 Cancelled because the organiser refunded it; null or missing otherwise. */
  refundedAt?: Date | null;
}

/** Tickets to take in one go: they all get a place, or none does. */
export interface TicketClaim {
  appId: string;
  eventId: number;
  ticketTypeId: number;
  userId: number | null;
  orderId: number | null;
  /** One per ticket, with its code. */
  tickets: { code: string; holderName: string }[];
  priceCents: number;
  status: "pending" | "valid";
  holdUntil: Date | null;
  now: Date;
}

/** Why tickets couldn't be taken: not enough places, or the event or ticket type is gone or not on sale. */
export type TicketClaimRefusal = "sold_out" | "not_on_sale";

/** The check-in at the door: the ticket now used, or why not. */
export type CheckInResult =
  | { ok: true; ticket: EventTicket }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "used" | "cancelled" | "pending"; ticket: EventTicket };

/** How events show and sell in the app (`Config.events`), one row per app. */
export interface EventSettings {
  currency: CatalogCurrency;
  /** IANA time zone the organiser's days and times are in. */
  timeZone: string;
  showMap: boolean;
  /** Free tickets can be cancelled until this many hours before the start; null: never. */
  allowCancelHours: number | null;
}

// 29 Charity & donations apps: campaigns and donations managed in the dashboard

/** Drafts aren't in the app; open campaigns take donations until they're closed or their end date passes. */
export type CampaignStatus = "draft" | "open" | "closed";

export interface Campaign {
  id: number;
  appId: string;
  title: string;
  /** A sentence or two in plain text; made from the story when empty. */
  summary: string | null;
  /** As the charity wrote it: simple HTML, cleaned whenever it's served (lib/news/html.ts). */
  story: string;
  /** Pictures; the first is the cover. */
  imageAssetIds: string[];
  /** Null: no goal (the app shows what was raised, without a bar). */
  goalCents: number | null;
  /** Amounts to choose from in the app, smallest first. */
  presetCents: number[];
  allowCustomAmount: boolean;
  /** The smallest donation. */
  minCents: number;
  /** After this moment the campaign takes no donations. */
  endsAt: Date | null;
  status: CampaignStatus;
  featured: boolean;
  /** Confirmed donations only: added when a payment is confirmed. */
  raisedCents: number;
  /** People who gave, counted once per email address. */
  donorCount: number;
  /** When it was first opened: the app's "newest" order. */
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignInput = Omit<Campaign, "id" | "createdAt" | "updatedAt" | "raisedCents" | "donorCount">;

export type DonationStatus = "pending" | "paid" | "failed" | "refunded";

/** One-off only for now: monthly donations need a subscription the payment integration doesn't have yet (roadmap 29). */
export type DonationRecurring = "none" | "monthly";

export interface Donation {
  id: number;
  appId: string;
  /** Null once the campaign is deleted; the title stays. */
  campaignId: number | null;
  campaignTitle: string;
  /** Hash of the token in the donation page link. */
  tokenHash: string;
  /** The receipt page's address (/receipts/<code>): random, not guessable. */
  receiptCode: string;
  /** The app user who started it, when signed in. */
  userId: number | null;
  amountCents: number;
  currency: CatalogCurrency;
  recurring: DonationRecurring;
  /** Left off the campaign's recent donations; the charity still sees the name. */
  anonymous: boolean;
  message: string | null;
  /** Asked on the donation page, for the receipt. */
  donorName: string | null;
  /** Lowercase. */
  donorEmail: string | null;
  donorPhone: string | null;
  status: DonationStatus;
  paymentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date;
  /** 37 Who takes the payment; null or missing: iyzico. */
  paymentProvider?: PaymentProviderId | null;
  /** 37 The provider's own reference for the started payment, read back to confirm it. */
  providerRef?: string | null;
  /** 80.3 When the pending-payments check last asked the provider about it; null or missing: never. */
  providerCheckedAt?: Date | null;
  /** 47 What was refunded so far; missing: nothing. All of it: the status is "refunded". */
  refundedCents?: number;
}

export type DonationInput = Omit<Donation, "id">;

export type DonationPatch = Partial<Pick<Donation, "donorName" | "donorEmail" | "donorPhone" | "status" | "updatedAt" | "paymentProvider" | "providerRef">>;

/** How the app takes donations (`Config.donations`). */
export interface DonationSettings {
  currency: CatalogCurrency;
  /** "browser": the iPhone app's button opens the donation page in the browser; "off": no donate button on iPhone. */
  iosMode: "browser" | "off";
}

/**
 * 49 A signed notice Yallapp sends an app's own API (roadmap 34.8): today
 * `account.deleted` when a person deletes their account in an app Yallapp
 * signs people in to. Retried with backoff (lib/hosted/api-webhooks.ts),
 * listed on App sign-in › For your developer, kept 30 days (`api_webhooks`).
 */
export type ApiWebhookEvent = "account.deleted";
/** pending: waiting for its next try; delivered: the API answered 2xx; failed: no more tries. */
export type ApiWebhookStatus = "pending" | "delivered" | "failed";

export interface ApiWebhook {
  /** Also the notice's `jti` and `Yallapp-Delivery`: the same on every try. */
  id: string;
  appId: string;
  event: ApiWebhookEvent;
  /** The person's `sub` (Yallapp user ID), as in their access tokens. */
  subject: string;
  status: ApiWebhookStatus;
  attempts: number;
  /** When it's tried next; null once delivered or failed. */
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  /** The API's HTTP status at the last try; null when it couldn't be reached. */
  lastStatus: number | null;
  /** Why the last try failed, in plain words; null after a delivery. */
  lastError: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
}

export type ApiWebhookPatch = Partial<Pick<ApiWebhook, "status" | "attempts" | "nextAttemptAt" | "lastAttemptAt" | "lastStatus" | "lastError" | "deliveredAt">>;

// 51 Videos and pictures hosted by Yallapp, with storage per plan

/** 77 `audio` (voice messages) and `file` (documents) come from the chat only. */
export type MediaKind = "video" | "image" | "pdf" | "audio" | "file";

/** 77 Where a Media file came from: the Media library, or a message in the app's chat. */
export type MediaSource = "library" | "chat";

/** "uploading" until the browser's upload is checked and completed; its size counts (reserved) all along. */
export type MediaStatus = "uploading" | "ready";

/** A file in an app's Media library, kept in Yallapp's object storage (lib/media). */
export interface MediaFile {
  id: string;
  appId: string;
  /** The owner's name for it (the file's name at first). */
  name: string;
  kind: MediaKind;
  contentType: string;
  /** What it takes of the app's storage: the size announced while uploading, the real size once ready. */
  sizeBytes: number;
  /** Where it is in the media folder on Yallapp's server: <app>/<id>.<ext>. */
  storageKey: string;
  status: MediaStatus;
  /**
   * Anyone with its link may open it (/m/<id>): pictures, and videos the
   * owner put on a page. Otherwise only signed links made for a student who
   * may open the lesson.
   */
  public: boolean;
  /** 77 Uploaded to the Media library, or sent in the chat. */
  source: MediaSource;
  createdAt: Date;
  updatedAt: Date;
}

export type MediaFilePatch = Partial<Pick<MediaFile, "name" | "sizeBytes" | "status" | "public" | "updatedAt">>;

/** A storage pack an app has: extra gigabytes until a date (the end of the plan's paid period when bought). */
export interface StoragePack {
  id: string;
  appId: string;
  clientId: string;
  /** The offer it came from (StoragePackOffer.id). */
  offer: string;
  gb: number;
  activeUntil: Date;
  /** The card payment that bought or last renewed it; null when the team added it. */
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** When the owner was told it ended (once per end date). */
  endedNoticeAt: Date | null;
}

export type StoragePackPatch = Partial<Pick<StoragePack, "activeUntil" | "paymentId" | "updatedAt" | "endedNoticeAt">>;

export type PlanPaymentPurpose = "plan" | "storage";

/** One storage pack a card payment pays for. */
export interface PaidStoragePack {
  offer: string;
  gb: number;
  /** What this pack costs in the payment. */
  cents: number;
  /** The pack renewed by the payment; null: a new pack. */
  packId: string | null;
}

/** A storage pack owners can buy: extra gigabytes for a monthly price. */
export interface StoragePackOffer {
  id: string;
  gb: number;
  /**
   * 51 A month's price, set like the plans' (52): pounds charged, an
   * optional dollar figure shown outside Egypt (lib/billing/prices.ts).
   * Null: not sold by card (the team adds it by hand).
   */
  price: YallappPrice | null;
}

export interface StoragePacksSetting {
  offers: StoragePackOffer[];
}

export interface PlatformSettingValues {
  /** 51 The storage packs and their prices. Unset: the defaults in lib/media/packs.ts. */
  storagePacks: StoragePacksSetting;
}

// 58 Yallapp Business: the owners' own app (lib/owner)

/** 58 The kinds of push Yallapp Business sends to an owner's phone; each can be turned off per device. */
export const OWNER_PUSH_KINDS = ["new_order", "new_booking", "new_message", "new_chat_message", "new_review", "payment_received", "build_finished", "yallapp_updates", "account_notices"] as const;
export type OwnerPushKind = (typeof OWNER_PUSH_KINDS)[number];
/** Missing kinds are on. */
export type OwnerPushPreferences = Partial<Record<OwnerPushKind, boolean>>;

/**
 * 58 A device signed in to Yallapp Business with the dashboard's account:
 * one per sign-in. It holds the hash of its refresh token (rotated on each
 * use), the user's session version when it signed in (a password change
 * signs it out) and its push token and choices.
 */
export interface OwnerDevice {
  id: string;
  userId: string;
  clientId: string;
  name: string;
  platform: "android" | "ios";
  appVersion: string | null;
  /** The request's language when it signed in (Accept-Language), for pushes when the person chose none. */
  language: string | null;
  refreshHash: string;
  refreshExpiresAt: Date;
  sessionVersion: number;
  pushToken: string | null;
  pushProvider: PushProvider;
  pushPreferences: OwnerPushPreferences | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export type OwnerDevicePatch = Partial<Pick<OwnerDevice, "name" | "appVersion" | "language" | "pushToken" | "pushProvider" | "pushPreferences" | "lastSeenAt" | "clientId">>;

// 61 Notifications to an app's users sent later, and today's numbers by query.

/**
 * 61 Where a notification sent later is: waiting for its time, taken by the
 * frequent job (`sending`), sent, cancelled by the owner, or stopped while
 * sending (`failed`, never sent twice).
 */
export type ScheduledNotificationStatus = "scheduled" | "sending" | "sent" | "cancelled" | "failed";

/** 61 A notification to everyone who uses the app, sent by the frequent job at `sendAt`. */
export interface ScheduledNotification {
  id: number;
  appId: string;
  title: string;
  body: string;
  sendAt: Date;
  status: ScheduledNotificationStatus;
  /** Who scheduled it (a dashboard user), for the record. */
  createdBy: string | null;
  /** When the frequent job took it. */
  claimedAt: Date | null;
  sentAt: Date | null;
  /** The inbox notification it became. */
  notificationId: number | null;
  /** What sending said ("Sent. … went to 12 phones."), English as the dashboard's. */
  result: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledNotificationPatch = Partial<Pick<ScheduledNotification, "title" | "body" | "sendAt" | "status" | "claimedAt" | "sentAt" | "notificationId" | "result" | "updatedAt">>;

/** 61 What was paid in a window: how many, and the amounts less refunds per currency. */
export interface PaidTotals {
  count: number;
  totals: { currency: string; cents: number }[];
}

// 60 Team members for clients (lib/team)

/** Someone who works with a client: their role there and what they may do (lib/team/permissions.ts). The owner has no row. */
export interface TeamMember {
  clientId: string;
  userId: string;
  role: "manager" | "staff";
  /** Staff's areas (TeamArea); empty for managers, who have all of them. */
  areas: string[];
  /** The client's apps they work on; null for all of them. */
  appIds: string[] | null;
  /** Email of who invited them or last changed their access. */
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberRow {
  member: TeamMember;
  user: User;
}

/**
 * An invitation to a client's team: single use, for 7 days. The link carries
 * a random token; only its SHA-256 is kept. Resending gives a new token (the
 * old link stops working) and 7 more days.
 */
export interface TeamInvitation {
  id: string;
  clientId: string;
  /** Lowercase. */
  email: string;
  name: string;
  role: "manager" | "staff";
  areas: string[];
  appIds: string[] | null;
  tokenHash: string;
  /** The language of the email and the page it opens ("en", "ar" or "tr"). */
  lang: string;
  /** The user who invited (the owner, or Yallapp's team managing the dashboard). */
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  sentAt: Date;
  createdAt: Date;
}

export type TeamInvitationPatch = Partial<Pick<TeamInvitation, "name" | "role" | "areas" | "appIds" | "tokenHash" | "lang" | "expiresAt" | "cancelledAt" | "sentAt">>;

/** One thing someone on a client's team did, for the Team page's activity (lib/team/activity.ts). */
export interface TeamActivity {
  id: number;
  clientId: string;
  appId: string | null;
  /** Null once their account is gone. */
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  /** A key from lib/team/activity.ts, like order.status. */
  action: string;
  targetType: string;
  targetId: string | null;
  /** One English line, like "Order 1042: Processing → Completed". */
  summary: string;
  at: Date;
}

/** 66 A request to delete a Yallapp account (lib/account/deletion.ts). */
export type AccountDeletionStatus = "pending" | "done" | "cancelled";

// 73 Deleting an app (the owner, from the dashboard) and the billing records kept when an account goes.

/** `waiting`: deleted, restorable until `purgeAfter`; `restored`; `purged`: its rows and files are gone. */
export type AppDeletionStatus = "waiting" | "restored" | "purged";

/** 73 The record of an app's deletion: it has no foreign keys, so it outlives the app. */
export interface AppDeletion {
  id: string;
  appId: string;
  clientId: string;
  /** The app's name when it was deleted. */
  appName: string;
  /** `owner`: the owner deleted it in the dashboard; `account`: it went with its Yallapp account. */
  reason: "owner" | "account";
  /** The owner's email, or our team member's for an account deletion they carried out. */
  deletedBy: string;
  deletedAt: Date;
  /** The daily job purges it from then on; "Delete now" in the admin earlier. */
  purgeAfter: Date;
  status: AppDeletionStatus;
  closedAt: Date | null;
  /** Who restored or purged it: our team member's email, or "daily job". */
  closedBy: string | null;
  /** Build folders on the files host that weren't removed yet (the daily job tries again). */
  pendingBuilds: string[];
}

/**
 * 73 A paid plan payment kept when its account is deleted, as accounting and
 * tax laws require: the payment, who paid, the coupon, and the receipt as it
 * was made for them (its PDF can be made again from it). No foreign keys.
 */
export interface KeptBillingRecord {
  /** The plan payment's ID. */
  id: string;
  clientId: string;
  userId: string;
  appId: string | null;
  /** "YA-1A2B3C4D". */
  receiptNumber: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  buyerCountry: string | null;
  amountCents: number;
  currency: CatalogCurrency;
  status: PlanPaymentStatus;
  paidAt: Date | null;
  /** The payment row and its coupon as they were (dates as ISO text). */
  details: { payment: Record<string, unknown>; coupon: Record<string, unknown> | null; appName: string | null };
  /** The receipt (lib/receipts/build.ts) in the client's language; null when it couldn't be made. */
  receipt: Record<string, unknown> | null;
  keptAt: Date;
}

export interface AccountDeletionRequest {
  id: string;
  clientId: string;
  /** The account's owner, who asked. */
  userId: string;
  /** Their email and name when they asked (kept after the account is deleted, as the record of the request). */
  email: string;
  name: string;
  /** Their dashboard language when they asked ("en", "ar" or "tr"): the emails to them. */
  lang: string;
  /** Why they're leaving, if they said. */
  reason: string | null;
  status: AccountDeletionStatus;
  requestedAt: Date;
  closedAt: Date | null;
  /** Our team member's email, or the client's own when they cancelled it. */
  closedBy: string | null;
  /** Our team's note (shown in the admin only). */
  teamNote: string | null;
}

/** How a request is closed: done (the account was deleted) or cancelled. */
export interface AccountDeletionClose {
  status: Exclude<AccountDeletionStatus, "pending">;
  closedAt: Date;
  closedBy: string;
  teamNote: string | null;
}

// 70 Two-step sign-in and sessions kept on the server

/** 70 A website session: the SHA-256 of the random ID in the session cookie. */
export interface UserSession {
  idHash: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

/** 70 A person's authenticator-app secret (encrypted); `enabledAt` null while the setup waits for its first code. */
export interface UserTwoFactor {
  userId: string;
  secretEncrypted: string;
  enabledAt: Date | null;
  /** The last 30-second step whose code was used (each code works once). */
  lastStep: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 70 Sign-in rules for Yallapp's own team (Admin › Settings). */
export interface SecuritySetting {
  /** Everyone on the admin team sets up two-step sign-in before they can use the admin. */
  requireTeamTwoStep: boolean;
}

export interface PlatformSettingValues {
  /** 70 Two-step sign-in required for the team. Unset: not required. */
  security: SecuritySetting;
}

/** 70 The limits a coupon's use is claimed against (lib/billing/coupons.ts). */
export interface CouponClaimLimits {
  maxRedemptions: number | null;
  maxPerClient: number | null;
  /** Pending uses started after this still hold their place. */
  pendingSince: Date;
}

// 77 Chat in the app

/** 77 The chat's settings for an app (the dashboard's Chat page); null: on, without course groups. */
export interface ChatSettings {
  enabled: boolean;
  /** Academies: a group for each course, with its students. */
  courseGroups: boolean;
}

/** 77 Who a chat member is where the app signs people in. */
export type ChatMemberSource = "hosted" | "wordpress";

/** 77 A person using the app who chatted (or opened the chat). */
export interface ChatMember {
  id: string;
  appId: string;
  source: ChatMemberSource;
  /** The hosted user's ID, or the WordPress user's ID, as text. */
  externalId: string;
  name: string;
  imageUrl: string | null;
  /** The business stopped them from sending. */
  blockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatConversationKind = "direct" | "group";

/** 77 A person and the business (`direct`), or a course's group. */
export interface ChatConversation {
  id: string;
  appId: string;
  kind: ChatConversationKind;
  /** The person, in a direct conversation. */
  memberId: string | null;
  /** A group's course: `wordpress:<course ID>` or `hosted:<course ID>`. */
  courseKey: string | null;
  /** A group's title (the course's) and picture. */
  title: string | null;
  imageUrl: string | null;
  lastMessageId: number | null;
  lastMessageAt: Date | null;
  /** The last message the business read. */
  businessReadId: number | null;
  /** The business keeps its messages until then, also those older than a year. */
  keepUntil: Date | null;
  /** The day of the oldest message the last "deleted soon" notice was about. */
  noticeFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatConversationPatch = Partial<Pick<ChatConversation, "title" | "imageUrl" | "lastMessageId" | "lastMessageAt" | "businessReadId" | "keepUntil" | "noticeFor" | "updatedAt">>;

/** 77 A member in a conversation, with what they read. */
export interface ChatParticipant {
  conversationId: string;
  memberId: string;
  readId: number | null;
  joinedAt: Date;
}

export type ChatSenderKind = "member" | "business";

export interface ChatMessage {
  /** Increasing: later messages have greater IDs. */
  id: number;
  appId: string;
  conversationId: string;
  senderKind: ChatSenderKind;
  /** The member who wrote it (`member`). */
  memberId: string | null;
  /** Who on the team wrote a business message (shown to the team only). */
  teamUserId: string | null;
  teamName: string | null;
  /** The sender's idempotency key. */
  clientId: string | null;
  text: string | null;
  /** A Media file (source `chat` from the app, or the library from the business). */
  mediaId: string | null;
  durationSeconds: number | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export type ChatReportReason = "spam" | "abuse" | "inappropriate" | "other";
export type ChatReportOutcome = "dismissed" | "deleted" | "blocked";

export interface ChatReport {
  id: string;
  appId: string;
  messageId: number;
  conversationId: string;
  reporterId: string;
  reason: ChatReportReason;
  note: string | null;
  status: "open" | "closed";
  outcome: ChatReportOutcome | null;
  closedBy: string | null;
  createdAt: Date;
  closedAt: Date | null;
}

/** 77 A WordPress person's chat token: the hash of a random secret, for an hour. */
export interface ChatSession {
  tokenHash: string;
  appId: string;
  memberId: string;
  expiresAt: Date;
  createdAt: Date;
}

/** 77 A chat upload from the app: who sent it, and a voice message's length. */
export interface ChatUploadInfo {
  mediaId: string;
  appId: string;
  memberId: string;
  durationSeconds: number | null;
  createdAt: Date;
}


/**
 * 78 A moment on a client's way to a published, paid app (lib/milestones):
 * each kind once per account or app, a renewal once per payment. Recorded
 * when it happens and from what the data shows (older accounts), and kept
 * when the app is deleted, so the numbers keep their history.
 */
export type MilestoneKind =
  | "signed_up"
  | "step_app_type"
  | "step_website"
  | "step_branding"
  | "step_listing"
  | "step_publishing"
  | "setup_done"
  | "first_build"
  | "build_ready"
  | "store_upload"
  | "store_live"
  | "paid"
  | "renewed";

export interface ClientMilestone {
  clientId: string;
  kind: MilestoneKind;
  /** What it is about: the app's ID, "" for the account's own (signed_up, paid), the payment's ID for a renewal. */
  ref: string;
  appId: string | null;
  at: Date;
  /** signed_up: where the sign-up came from. */
  source: SignupSource | null;
}

/** 78 Where a sign-up came from: the campaign link's UTM values, the website that sent them, or a page of ours (`from`, like "demo"). */
export interface SignupSource {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** The other website's host name (never the full address). */
  referrer: string | null;
  from: string | null;
}

/**
 * 78.2 What the daily job saw on a day (`product_days`), for the numbers that
 * can't be worked out again later: which clients had a plan running.
 */
export interface ProductDay {
  /** YYYY-MM-DD, UTC. */
  day: string;
  clients: number;
  /** Clients by account state (lib/license/status). */
  pending: number;
  active: number;
  expired: number;
  suspended: number;
  apps: number;
  /** Apps that have been live in a store (their milestone). */
  appsLive: number;
  /** The clients with a plan running (state "active"). */
  activeClientIds: string[];
}

/** 78.3 The scheduled work Yallapp watches (lib/watch): its three jobs, and the build pipeline asking for builds. */
export type WatchedJob = "daily" | "frequent" | "webhooks" | "pipeline" | "rekey";

/** 78.3 One run of a scheduled job. */
export interface JobRun {
  id: number;
  job: WatchedJob;
  startedAt: Date;
  /** Null while it runs (or when it died without finishing). */
  finishedAt: Date | null;
  ok: boolean | null;
  /** What it did, as its JSON answer (cut to 4,000 characters). */
  summary: string | null;
  error: string | null;
}

export type TeamAlertKind = "build_waiting" | "build_stalled" | "job_missing" | "job_failed" | "crash_spike" | "push_failed" | "health" | "integration";

/**
 * 78.3 Something the team should look at (lib/watch), in the admin's bell
 * and emailed once when it opens. One open alert per key; it closes by
 * itself when the problem goes, or when the team marks it done.
 */
export interface TeamAlert {
  id: string;
  kind: TeamAlertKind;
  /** What it's about, so the same problem doesn't open twice: "build_waiting:<build id>", "job_missing:daily"… */
  key: string;
  title: string;
  detail: string;
  /** A page of the admin to open, like /admin/builds. */
  link: string | null;
  /** How many times it was seen while open. */
  count: number;
  createdAt: Date;
  lastSeenAt: Date;
  resolvedAt: Date | null;
  /** "watch" when it closed by itself, else the team member's email. */
  resolvedBy: string | null;
  emailedAt: Date | null;
}

/** 78.4 Where an app's error came from (lib/watch/app-errors.ts). */
export type AppErrorSource = "platform" | "server" | "wordpress" | "mail" | "whatsapp" | "sign_in" | "webhook" | "payment" | "push";

/**
 * 78.4 An error of one client's app, counted: one row per app, source and
 * code, with when it was first and last seen and its last message. Kept 90
 * days after it was last seen.
 */
export interface AppError {
  id: string;
  clientId: string;
  /** Null for an error of the account rather than one app. */
  appId: string | null;
  source: AppErrorSource;
  /** What failed, in a word: "shop_unavailable", "refresh_failed", "unhandled"… */
  code: string;
  /** The last message (never a key, a code sent to someone, or a customer's details). */
  message: string;
  count: number;
  firstAt: Date;
  lastAt: Date;
}

/**
 * 79.2 A database cell holding encrypted values that aren't on the current key
 * (lib/jobs/rekey.ts): where it is, its text, and the row's short strings the
 * values' contexts may be built from.
 */
export interface RekeyCell {
  table: string;
  column: string;
  /** The row's primary key, as JSON. */
  key: string;
  text: string;
  candidates: string[];
}

/** 80 A connection of an app (Dashboard › Integrations, lib/integrations). */
export type IntegrationKey = "website" | "payments" | "whatsapp" | "mail" | "push" | "huawei_push" | "google_play" | "app_store" | "galaxy" | "appgallery" | "xiaomi";

/** 80 How a connection's last test went: a code the dashboard words in each language, what it named, and the details. */
export interface IntegrationCheck {
  at: string;
  ok: boolean;
  code: string;
  /** What the code names (a shop's name, an address), or null. */
  subject: string | null;
  /** What failed, one line each (technical, as the other side said it). */
  problems: string[];
}

export type IntegrationChecks = Partial<Record<IntegrationKey, IntegrationCheck>>;

/** 80.3 A payment still pending at its provider, for the pending-payments check (lib/payments/pending.ts). */
export type PendingPayment = { kind: "order"; record: CatalogOrder } | { kind: "plan"; record: PlanPayment } | { kind: "donation"; record: Donation };

/** 81.2 A WordPress site's look, as its plugin reports it (docs/api/platform.yaml `SiteInfo.brand`). */
export interface SiteBrandReport {
  name: string;
  tagline: string;
  logoUrl: string | null;
  iconUrl: string | null;
  colors: string[];
  menus: { location: string; items: { title: string; url: string; children: { title: string; url: string }[] }[] }[];
}
