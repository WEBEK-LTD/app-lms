import type { OrderMoney } from "../market/money";
import type { Plan, PlanSetting } from "../plans";
import type { BuildConfig } from "../build-config/types";
import type { AppDefaultsSetting, Layout, LayoutBlock, LayoutContent, StudioPage } from "../pages/types";
import type { Design } from "../pages/designs/build";
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
export type AssetKind =
  | "icon"
  | "logo"
  | "play_screenshot"
  | "ios_screenshot"
  | "tablet_screenshot"
  | "ipad_screenshot"
  | "firebase_android"
  | "firebase_ios"
  | "product_image"
  | "huawei_agconnect"
  // 97.2 The files of an owner's own font.
  | "font"
  // 97.3 The logo and pictures exported from a Figma file.
  | "figma_image"
  // 108.2 The pictures of a design brought into Studio (a design file, SVG, Figma, Sketch, Penpot).
  | "design_image"
  // 105.2 A driver's papers (licence, car registration): only the company sees them, never at the public address.
  | "driver_document"
  // 113.12 A photo of a salary's or an advance's receipt: only the school's dashboard sees it.
  | "salary_receipt";
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
  /** 88.2 Missing on builds queued before. */
  language?: string;
  translations?: ListingTranslation[];
  tabletScreenshots?: string[];
  ipadScreenshots?: string[];
  frame?: { background: string; textColor: string; captions: string[] } | null;
}

/** 89.2 A build's release: the share of Google Play's production users first, Apple's phased release. */
export interface BuildRelease {
  /** 0.01 to 1; null: internal testing, as before. */
  androidRollout: number | null;
  iosPhased: boolean;
}

/** 89.2 How the owner releases updates: the first share on Google Play (percent), Apple's phased release. */
export interface StagedRelease {
  androidPercent: number | null;
  iosPhased: boolean;
}

/** 89.2 The release in progress on each store, as last set. */
export interface RolloutState {
  android?: { versionName: string; versionCode: number; fraction: number; status: "inProgress" | "halted" | "completed"; at: string } | null;
  ios?: { versionName: string; state: "waiting" | "ACTIVE" | "PAUSED" | "COMPLETE"; at: string } | null;
}

/** 88.2 The store listing in another of the app's languages. */
export interface ListingTranslation {
  language: string;
  storeTitle: string;
  shortDescription: string;
  fullDescription: string;
  /** The framed screenshots' captions in this language, in order. */
  captions: string[];
}

/** 88.2 Screenshots framed for the stores: their captions, in order (the colours are the app's). */
export interface ScreenshotFrame {
  captions: string[];
}

/**
 * The app's engine: the Flutter module its build includes. "lms" is an
 * Academy app, "store" a Store app, "booking" a Bookings app, "real_estate" a
 * Real estate app (hosted API only), "news" a News & blog app (23), "events"
 * an Events & tickets app (28, hosted API only), "donations" a Charity &
 * donations app (29, hosted API only). What each engine is and offers is in
 * lib/app/kinds.ts.
 */
export type AppType = "lms" | "store" | "booking" | "real_estate" | "news" | "events" | "donations" | "delivery" | "food" | "rides" | "school";

/** 20 The kind of business, on top of the engine: wording, defaults, the demo and marketing, never routes (lib/app/kinds.ts). */
export type AppVertical = "restaurant" | "clinic" | "fitness" | "charity" | "services" | "instructors" | "taxi" | "marketplace";

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
  /** 104 Delivery and courier companies: services, couriers, shipments and settings in the delivery_* tables and shipments; card payments as catalog orders. */
  | { kind: "deliveries" }
  // 105.1 Food delivery from many restaurants.
  | { kind: "restaurants" }
  // 105.2 Ride hailing.
  | { kind: "rides" }
  /** 105.4 Schools: classes, people, timetable, attendance, homework, grades, news and fees in the school_* tables. */
  | { kind: "school" }
  /**
   * A platform connected with keys (ikas, Ticimax, IdeaSoft, Wix, Teachable,
   * Thinkific, SimplyBook) or with OAuth through Yallapp's partner app
   * (Salla, Zid): `settings` holds the values that aren't secret,
   * `secretsEncrypted` the rest as encrypted JSON (lib/hosted/connectors/platforms.ts).
   */
  | { kind: "platform"; platform: string; settings: Record<string, string>; secretsEncrypted: string };

/** 102 A sign-in for the store reviewers on the app's own website or API. */
export interface ReviewAccount {
  /** The user name or email they type. */
  username: string;
  passwordEncrypted: string;
  /** For the reviewers, in English: what to try once signed in. */
  notes: string | null;
  savedAt: string;
}

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
   * 102 WordPress sites and own APIs: the account the owner made for the
   * store reviewers (lib/publishing/review-account.ts), its password encrypted.
   */
  reviewAccount?: ReviewAccount | null;
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
  /** 85.3 The automatic notifications the owner turned off (`lib/hosted/auto-notifications.ts`); missing ones are on. */
  autoNotifications?: Partial<Record<string, boolean>> | null;
  /** 83.4 The versions of the plugin's adapters the site uses (`SiteInfo.adapters`): lms, bookings, store. */
  siteAdapters?: Partial<Record<"lms" | "bookings" | "store", string>> | null;
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

/** 103R Where an app lives: the regular dashboard, or Yallapp Studio (its own projects, editor and plans). */
export type AppSection = "regular" | "studio";

export interface App {
  id: string;
  clientId: string;
  /** 103R A Studio project, paid on a Studio plan; missing: a regular app. */
  section?: AppSection;
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
  /** 89.2 How updates are released (we publish for you); null: internal testing, no phased release. */
  stagedRelease?: StagedRelease | null;
  /** 89.2 The staged release in progress on each store. */
  rollout?: RolloutState | null;
  /** 89.1 Older versions stop at "Update the app"; null: none. */
  minVersion?: string | null;
  /** 89.1 Older versions are asked to update, once per recommended version; null: none. */
  recommendedVersion?: string | null;
  /** 88.2 Google Play tablet screenshots and iPad 13" screenshots (asset IDs, in order); missing before. */
  tabletScreenshotIds?: string[] | null;
  ipadScreenshotIds?: string[] | null;
  /** 88.2 The language the listing texts are written in (an app language code); missing: English. */
  listingLanguage?: string | null;
  /** 88.2 The listing in the app's other languages. */
  listingTranslations?: ListingTranslation[] | null;
  /** 88.2 Screenshots framed for the stores on the app's main colour, with these captions; null: as uploaded. */
  screenshotFrame?: ScreenshotFrame | null;
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
  /** 83.3 The switches the team turned off for the app (lib/app/switches.ts); null or missing: all on. */
  switches?: Partial<Record<string, boolean>> | null;
  /** Services, staff and rules when bookings are managed in the dashboard (connector "bookings"). */
  bookingSetup: BookingSetup | null;
  /** Courses when they're managed in the dashboard (connector "courses"). */
  courseSetup: CourseSetup | null;
  /** 100.2 Courses and memberships sold through the stores; null or missing: off. */
  storeBilling?: StoreBillingSettings | null;
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
  /** 86.4 The weekly summary email; missing: on. */
  weeklySummary?: boolean;
  /** 87.4 When the automatic build of the latest changes starts; null: none waiting. */
  autoBuildDueAt?: Date | null;
  /** 93.1 When the owner hid the guide through the first app on the overview; null or missing: shown. */
  guideHiddenAt?: Date | null;
  /**
   * 116 Where a school's (a university's) or an academy's teachers and staff
   * work: their own app in the bundle (`bundle`, every new project), or the
   * main app with the students and parents (`same`). Null or missing: a
   * project made before the staff app, which stays `same` until the owner
   * switches (lib/school/staff-app.ts).
   */
  staffApp?: StaffAppPlace | null;
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

/** 104.6 Which of the app's builds: the customers' app, or a delivery company's courier app; 115.16 a marketplace's vendor app; 116 a school's or academy's staff app. */
export type BuildVariant = "app" | "courier" | "vendor" | "staff";

/** 116 Where a school's or an academy's staff work (`App.staffApp`). */
export type StaffAppPlace = "bundle" | "same";

export interface Build {
  id: string;
  clientId: string;
  appId: string;
  /** 104.6 The courier app's builds have their own list; missing: the app's. */
  variant?: BuildVariant;
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
  /** 87.2 Why it (or one of its stages) failed, from the pipeline's diagnosis; null or missing: not known. */
  failure?: BuildFailure | null;
  /** 87.3 The commit to build from (a rebuild as it was); null: the newest code. */
  sourceRef?: string | null;
  /** 87.3 The commit the pipeline built it from. */
  sourceCommit?: string | null;
  /** 87.3 The number of the build this one rebuilds as it was. */
  rebuildOf?: number | null;
  /** 89.2 How "We publish for you" releases it (the app's staged release when queued); null: as before. */
  release?: BuildRelease | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedAt: Date;
}

/** 87.2 docs/api/pipeline.yaml FailureCode. */
export const FAILURE_CODES = ["icon", "firebase_android", "firebase_ios", "android_signing", "ios_signing", "apple_key", "apple_agreement", "version_used", "play_permission", "play_app_missing", "infrastructure", "unknown"] as const;
export type FailureCode = (typeof FAILURE_CODES)[number];

export interface BuildFailure {
  code: FailureCode;
  stage?: StageKey;
  /** The end of the build's output, without secrets: the client may read it. */
  log?: string;
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
  /** 91.2 Order updates; on unless turned off. */
  orders?: boolean;
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
  /** 85.1 The app's language on this phone when it last registered for push (missing before). */
  language?: string | null;
  /** 85.1 The country the phone last signed in or registered from (ISO 3166 alpha-2; the IP itself is never kept). */
  country?: string | null;
  /**
   * 112.3 Which of the company's apps registered for push here: its
   * customers' app, or its couriers' or drivers' app (the build's `role`).
   * Null for apps built before, which get every push as they did.
   */
  appRole?: HostedAppRole | null;
  /**
   * 104.8.2 The Yallapp Courier device that opened this session at the
   * company (`CourierDevice.id`): its pushes go through Yallapp Courier's
   * Firebase project, and it ends with that device. Null for the company's own apps.
   */
  courierDeviceId?: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

/** 112.3 The build's role (build config `role`) a device registered from; 115.16 the vendor app's, 116 the staff app's. */
export const HOSTED_APP_ROLES = ["customer", "courier", "driver", "vendor", "staff"] as const;
export type HostedAppRole = (typeof HOSTED_APP_ROLES)[number];

/**
 * 112.3 Whose pushes: the customers' (every push but the couriers' and
 * drivers'), or the second app's (`courier_job`, `ride_offer`; 116 the
 * staff's pushes of a project with the staff app). A device with no role
 * (an app built before) gets both.
 */
export type PushAudience = "customers" | "second";

/** 112.3 Whether a device of this role gets the audience's pushes. */
export function pushAudienceHas(audience: PushAudience, role: HostedAppRole | null): boolean {
  return role === null || (audience === "second" ? role !== "customer" : role === "customer");
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
  /** 85.2 What it opens: a link in the Links format (`<base>/<kind>/<id>`) or another https address. */
  link?: string | null;
  /** 85.2 Its picture, a full address. */
  imageUrl?: string | null;
  /** 85.2 To the people in `notice_recipients` only (a campaign's audience), not everyone. */
  targeted?: boolean;
  /** 85.3 An automatic notification's type and what it opens (`type`, `course_id`, `appointment_id`…), as its push carries them. */
  data?: Record<string, string> | null;
  createdAt: Date;
}

// Catalog: products managed in the dashboard for apps without a website.

/** 37 EGP, SAR and AED for the Egyptian providers; each provider takes some of these (lib/payments/provider.ts). */
export type CatalogCurrency = "TRY" | "USD" | "EUR" | "EGP" | "SAR" | "AED";

/** 37 Who takes a card payment: iyzico, Kashier, Fawaterk, Stripe or PayPal. */
/** 96.1 Stripe and PayPal: only clients' own accounts; Yallapp's plans stay on iyzico, Kashier, Fawaterk, Stripe or PayPal. */
export type PaymentProviderId = "iyzico" | "kashier" | "fawaterk" | "stripe" | "paypal";

/** The gateways Yallapp's own plans can be paid through. */
export type YallappProviderId = "iyzico" | "kashier" | "fawaterk";

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
  /** 91.3 Days after an order is completed during which the customer may ask to return it; null or missing: no returns from the app. */
  returnDays?: number | null;
  /** 91.4 Loyalty points; null or missing: none. */
  loyalty?: LoyaltySettings | null;
  /** 91.5 A tax (VAT, KDV) on the products and shipping; null or missing: none. */
  tax?: CatalogTax | null;
  /** 96.2 Bank transfer and the owner's own method, paid outside Yallapp; null or missing: none. */
  manualPayments?: ManualPaymentSettings | null;
}

/** 96.2 How a customer may pay outside the card page: the owner writes the details, and marks the order paid once the money arrives. */
export interface ManualPaymentSettings {
  /** The bank, account holder, IBAN and anything else the customer needs; null: no bank transfer. */
  bankTransfer: string | null;
  /** The owner's own method ("Cash on delivery", "Vodafone Cash") and what the customer does; null: none. */
  custom: { name: string; instructions: string } | null;
  /** Days the customer has to pay, shown to them; ticket places are held that long. */
  payWithinDays: number;
}

export type ManualPaymentMethod = "bank_transfer" | "custom";

/** 96.2 The method a customer chose for an order, with the details as they were then. */
export interface OrderManualPayment {
  method: ManualPaymentMethod;
  /** "Bank transfer", or the owner's name for their method. */
  name: string;
  instructions: string;
  /** ISO time: when the customer should have paid by. */
  dueAt: string;
}

/** 91.5 The shop's tax: a rate, included in its prices or added at checkout. */
export interface CatalogTax {
  /** "KDV", "VAT". */
  label: string;
  /** Hundredths of a percent: 2000 is 20%. */
  rateBps: number;
  /** The prices include it (shown as "Includes ₺X"); otherwise it's added to the total. */
  included: boolean;
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

/** 96.1 The client's own Stripe account: its secret key (encrypted like the others); test keys run on test data. */
export interface OwnStripePayment {
  provider: "stripe";
  secretKeyEncrypted: string;
  /** A test key (sk_test_…). */
  sandbox: boolean;
}

/** 96.1 The client's own PayPal REST app: its client ID (not a secret) and secret. */
export interface OwnPaypalPayment {
  provider: "paypal";
  clientId: string;
  secretEncrypted: string;
  /** Sandbox credentials. */
  sandbox: boolean;
}

/** The client's own merchant account. */
export type OwnPayment = OwnIyzicoPayment | OwnKashierPayment | OwnFawaterkPayment | OwnStripePayment | OwnPaypalPayment;

export type SubMerchantType = "PERSONAL" | "PRIVATE_COMPANY" | "LIMITED_OR_JOINT_STOCK_COMPANY";

export interface MarketplacePayment {
  provider: "yallapp";
  /**
   * 37 The provider of Yallapp's account the shop joined with; missing:
   * iyzico. Only iyzico pays shops itself (sub-merchants); with Kashier or
   * Fawaterk the team transfers each released share to the shop's IBAN.
   */
  via?: YallappProviderId;
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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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
  /** 91.5 Variations (size, colour): what the customer chooses, and each combination's price and stock; null or missing for none. */
  variants?: CatalogVariants | null;
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CatalogProductInput = Omit<CatalogProduct, "id" | "salesCount" | "createdAt" | "updatedAt">;

/** 91.5 A product's variations: up to three attributes, and the combinations the shop sells. */
export interface CatalogVariants {
  /** "Size: S, M, L", "Colour: Red, Blue" (1 to 3). */
  attributes: { name: string; values: string[] }[];
  items: CatalogVariant[];
}

/** 91.5 One combination: a value of each attribute, in their order. */
export interface CatalogVariant {
  /** Unique within the product, kept when the attributes change. */
  id: number;
  values: string[];
  /** Null: the product's price (and sale price). */
  priceCents: number | null;
  salePriceCents: number | null;
  /** Null: not tracked. */
  stock: number | null;
  sku: string | null;
  /** Not sold when false. */
  active: boolean;
}

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
  /** 91.5 The variation bought (its stock goes down when paid), and its values ("Red, Large"). */
  variantId?: number;
  variant?: string;
  /** 113.1 A course bundle bought (`productId` is the bundle's ID): its courses as they were then. */
  bundle?: OrderBundle;
}

/**
 * 113.1 A bundle's courses on its order line: each course's own price then
 * (the teachers' shares split the bundle's price in proportion to them), and
 * whether the student already had it when ordering (it stays theirs on a
 * refund; the order enrols the others).
 */
export interface OrderBundle {
  courses: { courseId: number; title: string; priceCents: number; owned: boolean }[];
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
  /** 91.1 The coupon applied to it, and what it took off the subtotal; missing: none. */
  couponCode?: string | null;
  discountCents?: number;
  /** 91.3 The return the customer asked for, and the shop's answer; null or missing: none. */
  returnRequest?: OrderReturn | null;
  /** 91.4 Loyalty points used on it and earned by it; null or missing: none. */
  points?: OrderPoints | null;
  /** 91.5 The tax in it (in `totalCents`, added or included); null or missing: none. */
  tax?: { label: string; rateBps: number; included: boolean; cents: number } | null;
  /** 96.2 Paid by bank transfer or the owner's own method: it waits, pending, until the owner marks it paid; null or missing: a card payment. */
  manualPayment?: OrderManualPayment | null;
  /** 96.4 The app's language when the customer checked out ("ar"), for their receipt; null or missing: the app's. */
  lang?: string | null;
}

/** 91.4 An order's loyalty points. */
export interface OrderPoints {
  /** Points taken off the order on the payment page (spent when it is paid). */
  used: number;
  /** What they took off. */
  discountCents: number;
  /** Points credited when it was completed; 0 until then, and again once taken back. */
  earned: number;
  /** The used points were given back (the paid order was cancelled or refunded). */
  givenBack?: boolean;
  /** The earned points were taken back (a return approved, a full refund): never earned again. */
  takenBack?: boolean;
}

/** 91.4 A shop's loyalty points: one point for every `spendPerPointCents` paid for products, each worth `pointValueCents`. */
export interface LoyaltySettings {
  spendPerPointCents: number;
  pointValueCents: number;
  /** The fewest points used at once. */
  minPoints: number;
}

export type LoyaltyReason = "earned" | "used" | "given_back" | "taken_back";

/** 91.4 A change to a customer's points. */
export interface LoyaltyEntry {
  id: number;
  appId: string;
  userId: number;
  orderId: number | null;
  /** Added (positive) or taken (negative). */
  points: number;
  reason: LoyaltyReason;
  createdAt: Date;
}

export type ReturnReason = "damaged" | "wrong_item" | "not_as_described" | "no_longer_needed" | "other";

/** 91.3 A return the customer asked for in the app. Times are ISO strings, as in OrderShipment. */
export interface OrderReturn {
  status: "requested" | "approved" | "declined";
  reason: ReturnReason;
  note: string | null;
  requestedAt: string;
  decidedAt: string | null;
  reply: string | null;
}

/** 91.1 A coupon of a shop without a website: a share or an amount off the subtotal. */
export interface CatalogCoupon {
  id: number;
  appId: string;
  /** Upper case, letters, digits and dashes. */
  code: string;
  kind: "percent" | "amount";
  /** 1–100 for a percentage, cents for an amount. */
  value: number;
  minOrderCents: number | null;
  endsAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: Date;
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
    "status" | "customer" | "updatedAt" | "commissionCents" | "itemTransactionIds" | "payoutApprovedAt" | "fulfilmentStatus" | "paymentProvider" | "providerRef" | "shipment" | "returnRequest" | "points" | "manualPayment"
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
  planProvider: YallappProviderId;
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

/** A client paying an app's Yallapp plan by card, with Yallapp's own account (37 iyzico, Kashier, Fawaterk, Stripe or PayPal). */
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
  /** 95.2 How it was paid; null or missing: by card (or covered by a coupon). */
  method?: PlanPaymentMethod | null;
  /** 95.2 A bank transfer's reference, as the team wrote it. */
  bankReference?: string | null;
  /** 95.2 The admin who recorded the bank transfer. */
  recordedBy?: string | null;
}

/** 95.2 "bank_transfer": the client paid into Yallapp's bank account and the team recorded it. */
export type PlanPaymentMethod = "card" | "bank_transfer";

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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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
  /** 113.7 The lesson it's under (the lesson's discussion); null: the course's. */
  lessonId: number | null;
  /** 113.7 Pinned by the teacher or the academy: first in the list. */
  pinned: boolean;
}

export type CourseQuestionInput = Omit<CourseQuestion, "id" | "answerCount" | "hidden" | "lessonId" | "pinned"> & { lessonId?: number | null };

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
  /** 90.1 Files that come with the lesson. */
  attachments?: CourseAttachment[];
  /** 90.1 Opens this many days after the student enrolled (drip); missing or 0: at once. */
  dripDays?: number | null;
  /** 112.5 Opens at this time for everyone (midnight of the chosen day in the app's time zone); with `dripDays`, the later of the two. */
  opensAt?: string | null;
}

/** 90.1 A file with a lesson: a file of the app's Media library (a PDF, a picture) or an https address, with the name the student sees. */
export interface CourseAttachment {
  name: string;
  url: string;
}

/** 90.1 A quiz's question: one right answer, several, or true or false; 112.5 or a short written answer. */
export interface CourseQuizQuestion {
  id: number;
  text: string;
  type: "single_choice" | "multiple_choice" | "true_false" | "short_answer";
  /** Empty for a short answer. */
  options: { id: string; text: string; correct: boolean }[];
  /** 112.5 A short answer's accepted answers, matched without case, accents' marks or extra spaces. */
  accepted?: string[];
}

/** 90.1 A quiz at the end of a topic. */
export interface CourseQuiz {
  id: number;
  title: string;
  /** The score that passes, 1 to 100. */
  passPercent: number;
  /** Null: as many attempts as the student wants. */
  attemptsAllowed: number | null;
  timeLimitMinutes: number | null;
  questions: CourseQuizQuestion[];
  /** 112.5 Each attempt has the questions and their answers in its own order. */
  shuffle?: boolean;
  /** 112.5 After submitting, the student sees each question with their answer and the right one. */
  showAnswers?: boolean;
  /** 112.5 This many questions drawn at random from the course's question bank for each attempt, besides its own. */
  bankPicks?: number;
  /** 113.7 A timed exam: open between two times, its time limit kept by the server, results maybe shown once it closes. */
  exam?: CourseExam | null;
}

/** 113.7 A quiz taken as an exam. */
export interface CourseExam {
  /** Opens and closes at these times (null: from now, or never closes). */
  opensAt: string | null;
  closesAt: string | null;
  /** Students see their scores (and the review) only once it closes. */
  resultsAfterClose: boolean;
}

/** 112.5 An assignment in a section: the student hands in a text, a file or both, and the teacher grades it. */
export interface CourseAssignment {
  id: number;
  title: string;
  instructions: string;
  /** Due this many days after the student enrolled; null: no due date (or `dueAt`). */
  dueDays: number | null;
  /** Due at this time for everyone; with `dueDays`, the earlier of the two. */
  dueAt?: string | null;
  /** The highest score, 1 to 1000. */
  maxPoints: number;
  /** The score that counts it as done; null: any grade does. */
  passPoints: number | null;
  attachments?: CourseAttachment[];
  /** 113.7 Graded with a rubric: each criterion's level gives its points; `maxPoints` is their highest levels added up. */
  rubric?: RubricCriterion[];
  /** 113.7 How many times a student may hand it in (another try after a grade); missing: once. */
  attemptsAllowed?: number;
}

/** 113.7 A rubric's criterion and its levels (the highest first, as the teacher wrote them). */
export interface RubricCriterion {
  id: number;
  title: string;
  levels: { id: number; label: string; points: number }[];
}

/** 112.5 A live class in a section: a meeting at a time, on Zoom, Google Meet or any meeting link. */
export interface CourseLiveSession {
  id: number;
  title: string;
  startsAt: string;
  durationMinutes: number;
  /** The https meeting link, given to the course's students from 15 minutes before it starts. */
  meetingUrl: string;
  notes: string;
  /** The recording, once there is one. */
  recordingUrl?: string | null;
}

export interface CourseTopic {
  id: number;
  title: string;
  lessons: CourseLesson[];
  /** 90.1 Quizzes after the topic's lessons. */
  quizzes?: CourseQuiz[];
  /** 112.5 Assignments and live classes. */
  assignments?: CourseAssignment[];
  live?: CourseLiveSession[];
  /** 112.5 The items' IDs in the owner's order; items left out follow: lessons, quizzes, assignments, live classes. */
  order?: number[];
}

/** 90.1 A student's attempt at a quiz: started, then submitted with its score. */
export interface QuizAttempt {
  id: number;
  appId: string;
  userId: number;
  courseId: number;
  quizId: number;
  /** The option IDs chosen for each question ID; null until submitted. */
  answers: Record<string, string[]> | null;
  scorePercent: number | null;
  passed: boolean | null;
  startedAt: Date;
  submittedAt: Date | null;
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
  /** 90.1 Students who finish it get a certificate (missing: false). */
  certificate?: boolean;
  /** 90.1 Days a student keeps access after enrolling; missing or null: always. */
  accessDays?: number | null;
  /** 112.5 Each lesson, quiz and assignment opens once the one before it is done (missing: false). */
  sequential?: boolean;
  /** 112.5 The certificate's signature line: the name (and title) of who signs it. */
  certificateSigner?: string | null;
  /** 112.5 Groups of students who start together: drip days and due dates count from the cohort's start. */
  cohorts?: CourseCohort[];
  /** 112.5 Questions the course's quizzes draw from at random (`CourseQuiz.bankPicks`); IDs from 1001. */
  questionBank?: CourseQuizQuestion[];
  /** 105.3 The academy's teacher whose course it is; missing or null: the academy's own. */
  teacherId?: number | null;
  /**
   * 105.3 A teacher's course before the academy published it: a draft, sent
   * for review, or sent back (`reviewNote` says why). Missing or null once
   * published: then `active` says whether it shows (`hidden` when not).
   */
  teacherStage?: "draft" | "in_review" | "returned" | null;
  reviewNote?: string | null;
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  /** 113.7 Courses to finish before enrolling in this one. */
  prerequisites?: number[];
  /** 113.7 What finishes the course (missing: `all`): its lessons, also its quizzes passed, also its assignments done. */
  completeWhen?: "lessons" | "quizzes" | "all";
  /** 113.7 The final score (quizzes' best and assignments' grades, as percents) that finishes it too; null: none. */
  minFinalScore?: number | null;
  createdAt: string;
}

/** 113.7 A learning path: courses taken one after another, shown with the student's progress. */
export interface LearningPath {
  id: number;
  title: string;
  description: string;
  courseIds: number[];
  /** Each course of the path waits for the one before it. */
  inOrder: boolean;
  active: boolean;
}

export interface CourseSetup {
  currency: CatalogCurrency;
  /** 110.2 `sample`: a sample category, removed with the sample courses. */
  categories: { id: number; name: string; sample?: boolean }[];
  courses: Course[];
  /** The next ID for a category, course, topic or lesson. */
  nextId: number;
  /** 105.3 Academies with many teachers: people may apply to teach from the app (missing: false). */
  teachersApply?: boolean;
  /** 113.7 Learning paths. */
  paths?: LearningPath[];
  /** 113.7 Points, badges and the courses' leaderboards in the app (missing: off). */
  gamification?: boolean;
  /** 113.1 Courses sold together at one price; missing: none. */
  bundles?: CourseBundle[];
}

/**
 * 113.1 A bundle: several of the academy's courses sold together at one
 * price the owner sets. Its ID comes from `CourseSetup.nextId`, so it is
 * never a course's. Buying it enrols the student in each of its courses.
 */
export interface CourseBundle {
  id: number;
  title: string;
  description: string;
  imageAssetId: string | null;
  /** In the owner's order; only published courses are shown and enrolled in. */
  courseIds: number[];
  /** The owner's price, more than 0. */
  priceCents: number;
  /** Shown in the app. */
  active: boolean;
  createdAt: string;
}

export const DEFAULT_COURSE_SETUP: CourseSetup = { currency: "TRY", categories: [], courses: [], nextId: 1 };

/** 112.5 A cohort: its name and when it starts (midnight of its first day in the app's time zone). */
export interface CourseCohort {
  id: number;
  name: string;
  startsAt: string;
}

/** 112.5 What a student handed in for an assignment, and its grade: one per student and assignment. */
export type AssignmentStatus = "submitted" | "graded" | "returned";

export interface AssignmentSubmission {
  id: number;
  appId: string;
  userId: number;
  courseId: number;
  assignmentId: number;
  text: string;
  /** A file of the app's Media library the student sent (a photo or a PDF). */
  file: { fileId: string; name: string; kind: "image" | "pdf" } | null;
  /** `returned`: the teacher asks for it again (with feedback); the student can hand it in again then. */
  status: AssignmentStatus;
  score: number | null;
  feedback: string | null;
  submittedAt: Date;
  gradedAt: Date | null;
  /** Who graded it (the dashboard's person). */
  gradedBy: string | null;
  /** 113.7 Which time it was handed in after a grade (1 the first). */
  attempt: number;
  /** 113.7 The rubric's level chosen for each criterion (by its ID), when graded with one. */
  rubric: Record<string, number> | null;
}

/** 113.7 Handed in: the first attempt and no rubric unless said. */
export type AssignmentSubmissionInput = Omit<AssignmentSubmission, "id" | "attempt" | "rubric"> & Partial<Pick<AssignmentSubmission, "attempt" | "rubric">>;

/** 113.7 A student's own note on a lesson, at a place in its video maybe; only they see it. */
export interface LessonNote {
  id: number;
  appId: string;
  userId: number;
  courseId: number;
  lessonId: number;
  text: string;
  positionSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 113.7 A lesson the student bookmarked. */
export interface LessonBookmark {
  appId: string;
  userId: number;
  courseId: number;
  lessonId: number;
  createdAt: Date;
}

export interface CourseEnrollment {
  appId: string;
  userId: number;
  courseId: number;
  /** How they got in: a free course, a payment (order number), or our client adding them. */
  source: "free" | "paid" | "manual";
  enrolledAt: Date;
  /** 112.5 The course's cohort the student learns with (`Course.cohorts`); missing or null: none. */
  cohortId?: number | null;
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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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

/** 82.4 One of an app's last publishes: the layout apps got then. */
export interface AppLayoutVersion {
  appId: string;
  /** The publish count it was published with (its `Layout.version` ends with it). */
  number: number;
  layout: Layout;
  publishedAt: Date;
  /** Email of whoever published it. */
  publishedBy: string | null;
}

/** 82.4 A publish in the history list, without its layout. */
export type AppLayoutVersionSummary = Omit<AppLayoutVersion, "layout">;

/** 84.3 Blocks an account saved together, to add again to any page of its apps. */
export interface SavedSection {
  id: string;
  clientId: string;
  name: string;
  blocks: LayoutBlock[];
  createdAt: Date;
  /** Email of whoever saved it. */
  createdBy: string | null;
}

/** 103R A Studio page an account saved as its own template, for any of its Studio pages. */
export interface StudioTemplate {
  id: string;
  clientId: string;
  name: string;
  page: StudioPage;
  createdAt: Date;
  /** Email of whoever saved it. */
  createdBy: string | null;
}

/** 108.7 A whole design an account keeps for its Studio projects; the design file is in the file store. */
export interface StudioDesign {
  id: string;
  clientId: string;
  name: string;
  /** Saved from a project, or imported from a file or another tool. */
  source: "saved" | "imported";
  pages: number;
  blobKey: string;
  sizeBytes: number;
  createdAt: Date;
  /** Email of whoever kept it. */
  createdBy: string | null;
}

/** 97.2 A font the owner uploaded for an app's look; its files are assets of kind "font". */
export interface OwnFont {
  id: string;
  appId: string;
  /** Its name in the app's look (`Appearance.font_family`): never a free font's or a bundled one's. */
  family: string;
  /** Up to four, by weight; one variable file (weight null) draws every weight. */
  files: OwnFontFile[];
  /** All its files, counted in the app's Media storage. */
  sizeBytes: number;
  /** Email of whoever confirmed that the font's licence allows its use in apps. */
  licenceConfirmedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnFontFile {
  assetId: string;
  weight: number | null;
  sizeBytes: number;
}

// 100.2 Store billing: courses and memberships sold through Google Play and the App Store

/** 113.1 `bundle`: a course bundle, one-time like a course (`planId` is the bundle's ID). */
export type StoreProductKind = "course" | "membership" | "bundle";
export type StorePlatform = "android" | "ios";

/** How a product stands in one store, after Yallapp last made or changed it there. */
export interface StoreProductSync {
  /** synced: on sale at `price`; failed: the store refused (see `error`); stopped: no longer sold. */
  status: "synced" | "failed" | "stopped";
  /** The store's own word for it, as its console shows (Apple: READY_TO_SUBMIT, APPROVED…; Google: ACTIVE…). */
  storeState: string | null;
  /** The price the store has, a decimal string in the app's currency; null before the first sync. */
  price: string | null;
  /** Why it failed (StoreSyncErrorCode); null when it didn't. */
  error: string | null;
  at: string;
}

/**
 * 100.2 A paid course (one-time product) or membership plan (subscription)
 * the app sells through the stores, made in the owner's Google Play and App
 * Store accounts under the same product ID. Never deleted: one no longer on
 * sale is stopped in the stores and kept for the people who bought it.
 */
export interface StoreProduct {
  id: string;
  appId: string;
  /** The ID in both stores (course_12, plan_pmpro_3); never changes or comes back for something else. */
  productId: string;
  kind: StoreProductKind;
  /** The course's ID on the app's source (a course). */
  courseId: number | null;
  /** The plan's ID on the site, as the plugin sent it (a membership); 113.1 the bundle's ID (a bundle). */
  planId: string | null;
  title: string;
  /** Monthly or yearly (a membership). */
  period: "month" | "year" | null;
  /** The courses a membership opens. */
  courseIds: number[];
  currency: string;
  /** The site's price, a decimal string. */
  sitePrice: string;
  /** The price the owner chose instead; null: the store price nearest the site's. */
  ownPrice: string | null;
  /** Still sold on the source; false: stopped in the stores. */
  active: boolean;
  google: StoreProductSync | null;
  apple: StoreProductSync | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 100.3 Whose purchase it is: a person of the hosted API (also Yallapp's sign-in for an app on its own API) or a WordPress user. */
export type StoreAccountSource = "hosted" | "wordpress";

/**
 * 100.3 A purchase made in Google Play or the App Store, checked with the
 * store and kept once (one per app, platform and store purchase): Google's
 * purchase token, or Apple's original transaction ID. It belongs to the
 * account that sent it first and gives that account the access; refunds,
 * revocations and ended subscriptions take it back.
 */
export interface StorePurchaseRecord {
  id: string;
  appId: string;
  platform: StorePlatform;
  /** Google: the purchase token's SHA-256; Apple: the original transaction ID. */
  storeKey: string;
  /** Google's purchase token, to read the purchase again (renewals, refunds). */
  purchaseToken: string | null;
  productId: string;
  kind: StoreProductKind;
  courseId: number | null;
  planId: string | null;
  accountSource: StoreAccountSource;
  accountId: string;
  /** Google's order ID, or Apple's latest transaction ID. */
  transactionId: string | null;
  status: "active" | "pending" | "expired" | "revoked";
  /** Memberships: the end of the paid period. */
  expiresAt: Date | null;
  /** Google: acknowledged (else refunded after three days). */
  acknowledged: boolean;
  /** Access given on the app's source (hosted enrolment, the site, the client's API) for the current status. */
  delivered: boolean;
  /** Why it ended: refunded, revoked or expired. */
  reason: "refunded" | "revoked" | "expired" | null;
  /** A store test purchase (license tester, sandbox). */
  test: boolean;
  /**
   * 100.7 Teachable or Thinkific: the courses Yallapp enrolled the person in
   * for this purchase, never ones they had already (bought on the school's
   * website), so taking it back leaves those. Missing or null: none.
   */
  grantedCourseIds?: number[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 100.7 One thing the owner sells in the app, listed on Dashboard › In-app
 * purchases, for apps whose source can't say it (an app on its own API) or
 * can't price it (Teachable, Thinkific): a course (its ID in the owner's
 * system) or a membership plan (its ID, period and the courses it opens).
 * Its store product is made from it as from the plugin's catalog. Never
 * deleted: a stopped item stops its product, and can be sold again.
 */
export interface StoreBillingItem {
  id: string;
  appId: string;
  /** 113.1 Never a bundle: bundles are the dashboard's courses' (hosted API). */
  kind: Exclude<StoreProductKind, "bundle">;
  /** The course's ID (a whole number, as text) or the plan's ID, as the owner's system has it. */
  itemId: string;
  title: string;
  /** The price on the owner's site, a decimal string. */
  price: string;
  currency: string;
  /** A membership's period. */
  period: "month" | "year" | null;
  /** The courses a membership opens. */
  courseIds: number[];
  /** Sold; false: stopped by the owner (on Teachable or Thinkific, also a school's course the owner stopped). */
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** 100.6 What happened to a store purchase, for sales in Analytics and Yallapp Business. */
export type StorePurchaseEventKind = "bought" | "renewed" | "refunded" | "revoked" | "expired";

/** 100.6 One change of a store purchase, with what it brought in (the store price then; Google and Apple keep their fee). */
export interface StorePurchaseEvent {
  id: string;
  appId: string;
  purchaseId: string;
  platform: StorePlatform;
  kind: StorePurchaseEventKind;
  productId: string;
  /** Bought and renewed: the price, in cents of `currency`; null when unknown. */
  amountCents: number | null;
  currency: string | null;
  /** A store test purchase: left out of sales. */
  test: boolean;
  at: Date;
}

/** 100.3 An hour's store billing token for a person signed in on a WordPress site (platform.yaml POST /billing/sessions). */
export interface BillingSession {
  tokenHash: string;
  appId: string;
  /** The WordPress user's ID. */
  userId: number;
  name: string;
  email: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/** 100.2 The app's store billing state, kept on the app. */
export interface StoreBillingSettings {
  /** The owner turned selling in the app on (every plan but Starter). */
  enabled: boolean;
  /** The app's ID in App Store Connect, found by its bundle ID. */
  appleAppId?: string | null;
  /** The App Store Server Notifications URL Yallapp set, and when. */
  appleNotificationsUrl?: string | null;
  /** The last check of each store's key, and its error code (null: fine). */
  googleCheck?: { at: string; error: string | null } | null;
  appleCheck?: { at: string; error: string | null } | null;
  /** When the products were last made or changed in the stores. */
  syncedAt?: string | null;
  /** 100.3 Up to when Google's voided purchases were read. */
  voidedReadAt?: string | null;
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

/** 84.4 The team's designs (Admin › Designs): its own, and the built-in ones it hid. */
export interface DesignsSetting {
  custom: Design[];
  hidden: string[];
}

export interface PlatformSettingValues {
  designs: DesignsSetting;
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
export type MoreStoresRow = Partial<Record<MoreStore, (Omit<PublishingTrack, "updatedAt" | "checkedAt"> & { updatedAt: string | null; checkedAt?: string | null }) | null>>;

/** Publishing on one store. */
export interface PublishingTrack {
  status: PublishingStatus;
  /** The team's note to the client: why it was rejected, what's next. Shown on the dashboard and in the email. */
  note: string | null;
  /** The app's public store page, once it's live. */
  storeUrl: string | null;
  /** When the status last changed; null while it's the first one. */
  updatedAt: Date | null;
  /** 88.3 Why the store turned it down (lib/publishing/review.ts), when the team or the store said. */
  rejection?: RejectionReason | null;
  /** 88.3 The store's own state of the version, as last read from it (App Store Connect's `appVersionState`). */
  storeState?: string | null;
  /** 88.3 When the store was last asked. */
  checkedAt?: Date | null;
}

/** 88.3 Why a store turned an app down: the common reasons, each with what to do (lib/publishing/review.ts). */
export const REJECTION_REASONS = ["sign_in", "incomplete", "metadata", "purchases", "account_deletion", "privacy", "minimum", "content_rating", "binary", "other"] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

/** 88.3 What the stores said about the Google Play and App Store versions, kept as JSON. */
export type ReviewsRow = Partial<Record<"android" | "ios", { rejection: RejectionReason | null; storeState: string | null; checkedAt: string | null }>>;

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

/** 104 The map tiles delivery apps draw live tracking on (admin Settings › Maps); none until the team sets them. */
export interface MapTilesSetting {
  /** With {z}, {x} and {y} (and {s} for subdomains). */
  tilesUrl: string;
  attribution: string | null;
  /** 112 A Nominatim search server: places found by name in the apps on this map. */
  searchUrl?: string | null;
  /** 112 An OSRM routing server: the routes drawn and their distance and time. */
  routingUrl?: string | null;
}

export interface PlatformSettingValues {
  maps: MapTilesSetting;
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
  /** Studio's demos: parcels sent, food orders and rides. */
  shipments: number;
  foodOrders: number;
  rides: number;
  /** 110.5 The academy with many teachers: teachers visitors followed and rated. */
  teacherFollows: number;
  teacherReviews: number;
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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ArticleInput = Omit<Article, "id" | "createdAt" | "updatedAt">;

export interface ArticleCategory {
  id: number;
  appId: string;
  name: string;
  position: number;
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
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
  /** 96.4 The app's language when the donor started it ("ar"), for their receipt; null or missing: the app's. */
  lang?: string | null;
}

export type DonationInput = Omit<Donation, "id">;

export type DonationPatch = Partial<Pick<Donation, "donorName" | "donorEmail" | "donorPhone" | "status" | "updatedAt" | "paymentProvider" | "providerRef">>;

/** How the app takes donations (`Config.donations`). */
export interface DonationSettings {
  currency: CatalogCurrency;
  /** "browser": the iPhone app's button opens the donation page in the browser; "off": no donate button on iPhone. */
  iosMode: "browser" | "off";
}

// 104 Delivery and courier companies

export const DELIVERY_PRICINGS = ["distance", "zone", "fixed"] as const;
export type DeliveryPricing = (typeof DELIVERY_PRICINGS)[number];
export const DELIVERY_TRACKINGS = ["stages", "live"] as const;
export type DeliveryTracking = (typeof DELIVERY_TRACKINGS)[number];
export const DELIVERY_ASSIGNMENTS = ["dispatch", "open"] as const;
export type DeliveryAssignment = (typeof DELIVERY_ASSIGNMENTS)[number];
/** Where the couriers' screens are: the company's app, its second app for couriers, or the shared Yallapp Courier app. */
export const COURIER_APPS = ["same", "bundle", "yallapp_courier"] as const;
export type CourierApp = (typeof COURIER_APPS)[number];

/** A drop-off zone with its price (pricing by zone). */
export interface DeliveryZone {
  id: string;
  name: string;
  cents: number;
}

/** How the company prices, takes payment and follows shipments (`Config.delivery`), one row per app. */
export interface DeliverySettings {
  currency: CatalogCurrency;
  pricing: DeliveryPricing;
  /** Pricing "fixed": the one price. */
  fixedCents: number;
  /** Pricing "distance": a start price, then per kilometre in a straight line, never under the minimum. */
  baseCents: number;
  perKmCents: number;
  minCents: number;
  /** The furthest it delivers; null: no limit. */
  maxKm: number | null;
  /** Pricing "zone". */
  zones: DeliveryZone[];
  cash: boolean;
  card: boolean;
  tracking: DeliveryTracking;
  assignment: DeliveryAssignment;
  courierApp: CourierApp;
  /** 104.6 The courier app's name in the stores; null: "<app name> Courier". */
  courierAppName?: string | null;
  /** 104.6 The courier iPhone app's GoogleService-Info.plist (an asset); null: no pushes on the courier iPhone app. */
  courierFirebaseIosAssetId?: string | null;
  /** 112.3 The second app's own icon (an `icon` asset: PNG, 1024 × 1024); null: the customers' app's icon. */
  courierIconAssetId?: string | null;
  /** 105.1 Food apps: the cuisines restaurants are filed under, in the company's order. */
  cuisines?: Cuisine[];
  /** 105.1 Food apps: when an order's courier job is made (default `accepted`). */
  foodCourierJob?: FoodCourierJob;
  /** 105.1 Food apps: the IANA time zone restaurants' opening hours are in (default Africa/Cairo). 105.2 Ride apps: scheduled rides and earnings. */
  timezone?: string;
  /** 105.2 Ride apps: how rides are priced, matched and cancelled. */
  rides?: RidesSettings;
  /** 105.9 Live taxi apps: the map and the live database. */
  taxi?: TaxiSettings;
  /** 115.5 Marketplace apps: the app's couriers' terms (lib/market/delivery.ts); absent: the Delivery prices above, no charge to vendors. */
  market?: MarketCourierTerms;
  /** 115 Marketplace apps: country, taxes, payment ways, pick-up, orders for later, the club and the wallet (lib/market/settings.ts); absent: the defaults. */
  marketApp?: MarketAppSettings;
}

/** 115 A marketplace's settings, as the app owner sets them in Studio › Settings (115.12). Amounts in the currency's minor units. */
export interface MarketAppSettings {
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** ISO 4217; null: the Delivery settings' currency. */
  currency: string | null;
  tax: { ratePercent: number; included: boolean; onDelivery: boolean; label: string };
  /** lib/market/payments.ts `MarketPaymentSettings`. */
  payment: { gateway: PaymentProviderId | null; cash: boolean; cashMax: number | null; applePay: boolean; googlePay: boolean };
  pickup: boolean;
  scheduling: { enabled: boolean; daysAhead: number };
  club: boolean;
  wallet: boolean;
  /** How far a weighed item may go above what was ordered (percent). */
  weightTolerancePercent: number;
  /** Vendors' own app in the bundle, or the Vendor tab in the customer app. */
  vendorApp: "same" | "bundle";
  /**
   * 115 Every product needs its photo: products and dishes without one are
   * hidden from customers. On unless the owner turns it off (lib/market/photos.ts `photosRequired`).
   */
  requirePhotos?: boolean;
  /**
   * 115.18 Places make their own coupons and offers in their panel, paid by
   * them and for their own items only; on unless the owner turns it off,
   * with the largest percentage they may give (null: up to 100).
   */
  vendorCoupons?: { enabled: boolean; maxPercent: number | null };
  /**
   * 115 The named areas the marketplace serves (lib/market/areas.ts), each a
   * circle around its centre; places that deliver by area choose among
   * them. None (or absent): the marketplace is open everywhere, and each
   * place's own area decides.
   */
  serviceAreas?: MarketServiceArea[];
}

/** 115 A named area the marketplace serves: within `km` of its centre. */
export interface MarketServiceArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  km: number;
}

/**
 * 115.5 The app's couriers in a marketplace, as the owner sets them: what
 * customers pay for delivery (the Delivery prices above, or a percentage of
 * the items) and what a vendor that uses them pays the owner per order,
 * besides its commission. Amounts in the currency's minor units.
 */
export interface MarketCourierTerms {
  customerFee: "delivery_prices" | "percent";
  /** For `percent`: of the items after discounts, never under `minFee` nor over `maxFee`. */
  percent: number;
  minFee: number;
  maxFee: number | null;
  /** Free delivery with the app's couriers from this items' total; null: never. */
  freeOver: number | null;
  /** The vendor's charge: none, a fixed amount, a percentage of the items, or an amount per km. */
  vendorCharge: "none" | "fixed" | "percent" | "per_km";
  vendorChargeValue: number;
}

/** 105.9 Whose map a live taxi app draws. */
export type TaxiMapProvider = "google" | "osm";

/** 105.9 A live taxi app's map and live database (Dashboard › Maps & live). */
export interface TaxiSettings {
  provider: TaxiMapProvider;
  /** Google: the company's API key, sealed (`taxiMapsKeyContext`). */
  googleKeyEncrypted: string | null;
  /** Google: the Map Tiles API session the app's tiles use, until it expires (ISO time). */
  googleSession: { token: string; expiresAt: string } | null;
  /** OpenStreetMap: the company's tile server, with {z}, {x} and {y}. */
  tilesUrl: string | null;
  /** OpenStreetMap: what the map shows for its data and tiles. */
  attribution: string | null;
  /** OpenStreetMap: a Nominatim search server; null: no place search. */
  searchUrl: string | null;
  /** OpenStreetMap: an OSRM routing server; null: no routes. */
  routingUrl: string | null;
  /** The company's Firebase Realtime Database; null: the app asks Yallapp. */
  databaseUrl: string | null;
}

/** A service the customer chooses (same-day, express, documents), adding its own amount to the price. */
export interface DeliveryService {
  id: number;
  appId: string;
  name: string;
  description: string | null;
  imageAssetId: string | null;
  extraCents: number;
  /** How long it takes, as the company words it ("Within 4 hours"). */
  eta: string | null;
  position: number;
  /** Hidden from the app when false. */
  active: boolean;
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryServiceInput = Omit<DeliveryService, "id" | "createdAt" | "updatedAt">;

/** A courier of the company: whoever signs in to the app with this number (or, in apps signing in by email only, this email). */
export interface Courier {
  id: number;
  appId: string;
  name: string;
  /** E.164. */
  phone: string | null;
  /** Lowercase. */
  email: string | null;
  vehicle: string | null;
  /** Paused couriers can't use the courier screens. */
  active: boolean;
  /** Offered new jobs and told of them. */
  onDuty: boolean;
  /** The last position the app sent while a job was on the way; cleared when none is. 105.2 A driver's: while online. */
  lat: number | null;
  lng: number | null;
  locatedAt: Date | null;
  /** 105.2 Ride apps: the driver's side (null for couriers). */
  driver?: DriverDetails | null;
  /** 104.8.2 When they last opened the company in Yallapp Courier; null: never. */
  hubSignedInAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CourierInput = Pick<Courier, "appId" | "name" | "phone" | "email" | "vehicle" | "active"> & Partial<Pick<Courier, "driver">>;
export type CourierPatch = Partial<Pick<Courier, "name" | "phone" | "email" | "vehicle" | "active" | "onDuty" | "lat" | "lng" | "locatedAt" | "driver" | "hubSignedInAt">>;

export const SHIPMENT_STATUSES = ["awaiting_payment", "pending", "assigned", "picked_up", "on_the_way", "delivered", "failed", "cancelled"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export const PACKAGE_SIZES = ["small", "medium", "large"] as const;
export type PackageSize = (typeof PACKAGE_SIZES)[number];

export interface ShipmentPlace {
  address: string;
  /** Building, floor, flat, a landmark. */
  details: string | null;
  lat: number | null;
  lng: number | null;
}

/** A stage the shipment went through. `at` is an ISO string. */
export interface ShipmentStage {
  status: ShipmentStatus;
  at: string;
  note?: string | null;
  /** Who moved it: the customer, the courier, the company (dashboard) or the payment. */
  by?: "customer" | "courier" | "company" | "payment";
}

export interface Shipment {
  id: number;
  appId: string;
  /** The customer; null once they deleted their account. */
  userId: number | null;
  senderName: string;
  /** E.164; the customer's when they signed in by phone. */
  senderPhone: string | null;
  serviceId: number | null;
  serviceName: string | null;
  pickup: ShipmentPlace;
  dropoff: ShipmentPlace;
  zoneId: string | null;
  zoneName: string | null;
  distanceKm: number | null;
  packageSize: PackageSize;
  packageDescription: string | null;
  recipientName: string;
  /** E.164. */
  recipientPhone: string;
  notes: string | null;
  priceCents: number;
  currency: CatalogCurrency;
  paymentMethod: "cash" | "card";
  paymentStatus: "unpaid" | "paid" | "refunded";
  /** Paid by card: the catalog order of its last payment link (its line's productId is the shipment's ID). */
  orderId: number | null;
  status: ShipmentStatus;
  courierId: number | null;
  /** Kept when the courier is deleted. */
  courierName: string | null;
  timeline: ShipmentStage[];
  /** The app's language when the customer sent it ("ar"), for what they are told. */
  lang: string | null;
  /** 105.1 The food order this job delivers; null for a parcel. */
  foodOrderId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ShipmentInput = Omit<Shipment, "id">;
export type ShipmentPatch = Partial<Pick<Shipment, "status" | "courierId" | "courierName" | "timeline" | "paymentStatus" | "orderId" | "userId" | "updatedAt">>;

/** Which shipments a list holds. */
export interface ShipmentQuery {
  appId: string;
  userId?: number;
  /** 104.7 Not this customer's (the store review account's, for the company's own couriers). */
  notUserId?: number;
  courierId?: number;
  statuses?: ShipmentStatus[];
  /** Only those without a courier. */
  unassigned?: boolean;
  /** Created at or after. */
  since?: Date;
  /** Updated at or after. */
  updatedSince?: Date;
  /** The reference ("S-12"), the sender's or recipient's name or number. */
  search?: string;
  order: "newest" | "oldest";
  offset: number;
  limit: number;
}

// 105.1 Food delivery from many restaurants

/** When a food order's courier job is made: once the restaurant accepts it, or once it is ready. */
export const FOOD_COURIER_JOBS = ["accepted", "ready"] as const;
export type FoodCourierJob = (typeof FOOD_COURIER_JOBS)[number];

/** A cuisine the company files its restaurants under (`FoodConfig.cuisines`). */
export interface Cuisine {
  id: string;
  name: string;
  /** 110.2 Added with the sample restaurants, and removed with them. */
  sample?: boolean;
}

/** A period a restaurant is open, in the app's time zone; `closes` before `opens` runs past midnight. */
export interface OpeningPeriod {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  /** "HH:MM". */
  opens: string;
  closes: string;
}

export interface DishChoice {
  id: number;
  name: string;
  extraCents: number;
  available: boolean;
}

export interface DishChoiceGroup {
  id: number;
  name: string;
  /** 1 or more: required. */
  min: number;
  max: number;
  choices: DishChoice[];
}

export interface Dish {
  id: number;
  name: string;
  description: string | null;
  imageAssetId: string | null;
  priceCents: number;
  /** False while sold out. */
  available: boolean;
  popular: boolean;
  choiceGroups: DishChoiceGroup[];
}

export interface MenuSection {
  id: number;
  name: string;
  dishes: Dish[];
}

/** A restaurant's menu: its sections in order; IDs are unique within the restaurant and never reused (`nextId`). */
export interface RestaurantMenu {
  sections: MenuSection[];
  nextId: number;
}

export interface Restaurant {
  id: number;
  appId: string;
  name: string;
  description: string | null;
  logoAssetId: string | null;
  coverAssetId: string | null;
  /** `Cuisine` ids. */
  cuisines: string[];
  address: ShipmentPlace;
  /** E.164. */
  phone: string | null;
  hours: OpeningPeriod[];
  /** How long it usually takes to prepare an order. */
  prepMinutes: number;
  /** The smallest subtotal; 0 for none. */
  minOrderCents: number;
  /**
   * The furthest it delivers, in a straight line; null: the company's limit
   * (`DeliverySettings.maxKm`). 115 In a marketplace, its delivery radius
   * from its address (lib/market/areas.ts); null without `deliveryAreas`:
   * saved before places had to set one, taken as 10 km.
   */
  maxKm: number | null;
  /** The company's share of each order's subtotal, in basis points (1250 = 12.5%). */
  commissionBp: number;
  /** Hidden from the app when false. */
  active: boolean;
  /** No new orders until then ("busy"). */
  busyUntil: Date | null;
  ratingSum: number;
  ratingCount: number;
  position: number;
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  /** 115.3 In a marketplace (the `marketplace` feature), what it is; 105.1's restaurants are `restaurant`. */
  kind?: VendorKind;
  /** 115.3 Who delivers and on what terms; null: the app's couriers at the app's Delivery prices (105.1). */
  delivery?: VendorDelivery | null;
  /** 115.3 A fixed commission per order in minor units, instead of `commissionBp`. */
  commissionFixed?: number | null;
  /** 115.3 Its tax rate in basis points when it differs from the app's; null: the app's. */
  taxRateBp?: number | null;
  /** 115.3 Not taking orders until the vendor or the owner turns it back on. */
  paused?: boolean;
  /** 115.3 Its district, shown to customers (its exact place only for pick-up). */
  area?: string | null;
  /** 115 Where it delivers by area: the marketplace's `serviceAreas` it chose (their IDs); null or empty: by distance (`maxKm`). */
  deliveryAreas?: string[] | null;
  /** 115.20 Running late: extra minutes on every delivery and pick-up time, with a reason customers see; still taking orders (lib/market/vendor-controls.ts). */
  delay?: VendorDelay | null;
  /** 115.20 Days off (holidays): closed all day on these dates, in the app's time zone. */
  closedDates?: VendorClosedDates[] | null;
  /** 115.20 The place itself last changed its hours, days off or preparation time: when, who, and the values before, for the owner's Undo. */
  vendorEdit?: VendorEdit | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 115.20 Why a place is running late, as customers read it. */
export type VendorDelayReason = "demand" | "couriers" | "weather" | "other";
export const VENDOR_DELAY_REASONS: readonly VendorDelayReason[] = ["demand", "couriers", "weather", "other"];

/** 115.20 A place running late: `minutes` more on its times until `until` (null: until it ends it). */
export interface VendorDelay {
  minutes: number;
  reason: VendorDelayReason;
  /** The place's own words for `other` (plain text, up to 80 characters); null otherwise. */
  note: string | null;
  until: Date | null;
  setAt: Date;
}

/** 115.20 Closed from `from` to `to` ("YYYY-MM-DD", both included), in the app's time zone. */
export interface VendorClosedDates {
  from: string;
  to: string;
}

/** 115.20 What the place changed itself, and what it was before (one level of undo for the owner). */
export interface VendorEdit {
  at: Date;
  /** The staff member's name. */
  by: string | null;
  fields: VendorEditField[];
  previous: { hours: OpeningPeriod[]; closedDates: VendorClosedDates[]; prepMinutes: number };
}

export type VendorEditField = "hours" | "closed_dates" | "prep_minutes";

/** 115.3 What a marketplace vendor sells: dishes (a menu), or products in departments and aisles. */
export type VendorKind = "restaurant" | "grocery" | "shop";

/** 115.3 A vendor's delivery: by the app's couriers (the owner's prices) or by its own drivers (its prices). */
export interface VendorDelivery {
  by: "app" | "vendor";
  /** For its own drivers: a fixed fee, or a base plus an amount per km. */
  feeKind: "fixed" | "per_km";
  /** The fixed fee, or the base, in minor units. */
  fee: number;
  /** Per km after the first, in minor units (`per_km`). */
  perKm: number;
  /** Free delivery from this subtotal; null for never. */
  freeOver: number | null;
  /** The fewest and most items an order may have; null for no limit. */
  minItems: number | null;
  maxItems: number | null;
  /** Customers may pick orders up. */
  pickup: boolean;
  /** Customers may order for later. */
  scheduling: boolean;
}

export type RestaurantInput = Omit<Restaurant, "id" | "busyUntil" | "ratingSum" | "ratingCount" | "createdAt" | "updatedAt">;
export type RestaurantPatch = Partial<Omit<Restaurant, "id" | "appId" | "createdAt">>;

/** A restaurant's staff: whoever signs in with this number (or email) works for it. */
export interface RestaurantStaff {
  id: number;
  appId: string;
  restaurantId: number;
  name: string;
  /** E.164. */
  phone: string | null;
  /** Lowercase. */
  email: string | null;
  active: boolean;
  /** 115.3 What they may do: everything (`owner`), all but staff (`manager`), orders and stock (`orders`), picking only (`picker`). 105.1's staff are `manager`. */
  role?: VendorRole;
  createdAt: Date;
  updatedAt: Date;
}

export type VendorRole = "owner" | "manager" | "orders" | "picker";

/** 115.3 A grocery's or shop's department (Fruit & vegetables), in its order. */
export interface MarketDepartment {
  id: number;
  appId: string;
  vendorId: number;
  name: string;
  imageAssetId: string | null;
  position: number;
}

/** 115.3 An aisle in a department (Fresh fruit). */
export interface MarketAisle {
  id: number;
  appId: string;
  vendorId: number;
  departmentId: number;
  name: string;
  position: number;
}

export type MarketUnit = "item" | "kg" | "g" | "l";

/** 115.3 A grocery's or shop's product. Prices in minor units of the app's currency. */
export interface MarketProduct {
  id: number;
  appId: string;
  vendorId: number;
  departmentId: number | null;
  aisleId: number | null;
  name: string;
  description: string | null;
  brand: string | null;
  /** The vendor's own code, unique within the vendor; imports update by it. */
  sku: string | null;
  barcode: string | null;
  imageAssetId: string | null;
  /**
   * A picture by link (from an import): fetched once into `imageAssetId` by
   * lib/market/photos.ts, never shown to customers as it is.
   */
  imageUrl: string | null;
  /** 115 More photos after the main one (`imageAssetId`), in order; null for none. */
  galleryAssetIds?: string[] | null;
  /** 115 Why the picture link couldn't be fetched; null while it waits or once it is fetched. */
  photoError?: string | null;
  price: number;
  /** Before its discount (struck through); null for none. */
  wasPrice: number | null;
  unit: MarketUnit;
  /** The amount added each time (1 for items, 0.25 for a quarter kilo). */
  step: number;
  maxQuantity: number | null;
  /** Counted stock; null when not counted (then `inStock` alone says). */
  stock: number | null;
  inStock: boolean;
  tags: string[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketProductInput = Omit<MarketProduct, "id" | "createdAt" | "updatedAt">;

export interface MarketProductQuery {
  appId: string;
  vendorId: number;
  departmentId?: number;
  aisleId?: number;
  q?: string;
  /** A barcode or SKU. */
  code?: string;
  outOfStock?: boolean;
  /** 115 Only products with an uploaded main photo (what customers see when photos are required). */
  withPhoto?: boolean;
  /** 115 Only products still without an uploaded main photo (the panel's "No photo" filter). */
  withoutPhoto?: boolean;
  page: number;
  perPage: number;
}

export type RestaurantStaffInput = Pick<RestaurantStaff, "appId" | "restaurantId" | "name" | "phone" | "email" | "active"> & { role?: VendorRole };

export const FOOD_ORDER_STATUSES = ["awaiting_payment", "placed", "accepted", "ready", "picked_up", "on_the_way", "delivered", "rejected", "cancelled", "failed"] as const;
export type FoodOrderStatus = (typeof FOOD_ORDER_STATUSES)[number];
export const FOOD_REJECTIONS = ["closing", "too_busy", "item_unavailable", "other"] as const;
export type FoodRejection = (typeof FOOD_REJECTIONS)[number];

/** A line of a food order as it was ordered, its prices kept. */
export interface FoodOrderLine {
  dishId: number | null;
  name: string;
  quantity: number;
  /** "Size: Large". */
  choices: string[];
  note: string | null;
  /** With its choices. */
  unitCents: number;
}

/** A stage the order went through. `at` is an ISO string. */
export interface FoodOrderStage {
  status: FoodOrderStatus;
  at: string;
  note?: string | null;
  by?: "customer" | "restaurant" | "courier" | "company" | "payment";
}

export interface FoodOrder {
  id: number;
  appId: string;
  restaurantId: number | null;
  /** Kept when the restaurant is deleted. */
  restaurantName: string;
  /** The customer; null once they deleted their account. */
  userId: number | null;
  customerName: string;
  /** E.164, where the courier calls. */
  customerPhone: string;
  lines: FoodOrderLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  /** The company's share of the subtotal, at the restaurant's rate when ordered. */
  commissionCents: number;
  currency: CatalogCurrency;
  paymentMethod: "cash" | "card";
  paymentStatus: "unpaid" | "paid" | "refunded";
  /** Paid by card: the catalog order of its last payment link. */
  orderId: number | null;
  status: FoodOrderStatus;
  dropoff: ShipmentPlace;
  zoneId: string | null;
  distanceKm: number | null;
  notes: string | null;
  /** Once accepted. */
  readyAt: Date | null;
  rejection: { reason: FoodRejection; note: string | null } | null;
  /** Its courier job, once made. */
  shipmentId: number | null;
  rating: { restaurant: number; courier: number | null; comment: string | null; at: string } | null;
  timeline: FoodOrderStage[];
  lang: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FoodOrderInput = Omit<FoodOrder, "id">;
export type FoodOrderPatch = Partial<Pick<FoodOrder, "status" | "paymentStatus" | "orderId" | "readyAt" | "rejection" | "shipmentId" | "rating" | "timeline" | "userId" | "updatedAt">>;

// 115.3 The marketplace's orders, complaints and wallet

export const MARKET_ORDER_STATUSES = ["awaiting_payment", "scheduled", "placed", "accepted", "picking", "ready", "on_the_way", "delivered", "picked_up", "rejected", "cancelled"] as const;
export type MarketOrderStatus = (typeof MARKET_ORDER_STATUSES)[number];

export interface MarketOrderLine {
  id: number;
  /** A dish's id (restaurants) or a product's id (groceries and shops). */
  productId: number;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unit: MarketUnit;
  choices: string[];
  note: string | null;
  unitPrice: number;
  wasUnitPrice: number | null;
  total: number;
  ifMissing: "similar" | "chosen" | "remove";
  substituteProductId: number | null;
  /** Once picked. */
  outcome: "picked" | "substituted" | "missing" | null;
  pickedQuantity: number | null;
  substitute: { productId: number; name: string; quantity: number; total: number } | null;
}

export interface MarketOrderStage {
  status: MarketOrderStatus;
  at: string;
  by: "customer" | "vendor" | "courier" | "owner" | "system";
}

/** 115.3 A marketplace order, with its money as priced (lib/market/money.ts `OrderMoney`) kept as it was. */
export interface MarketOrder {
  id: number;
  appId: string;
  vendorId: number | null;
  /** Kept when the vendor is deleted. */
  vendorName: string;
  vendorKind: VendorKind;
  userId: number | null;
  customerName: string;
  /** E.164; the app's support and the app's courier may see it, never the vendor. */
  customerPhone: string;
  fulfilment: "delivery" | "pickup";
  deliveryBy: "app" | "vendor" | null;
  scheduledFor: Date | null;
  lines: MarketOrderLine[];
  /** The priced order (`OrderMoney`), in minor units of `currency`. */
  money: OrderMoney;
  currency: string;
  paymentMethod: "cash" | "card" | "apple_pay" | "google_pay" | "wallet";
  paymentStatus: "unpaid" | "paid" | "partly_refunded" | "refunded";
  /** The gateway payment's reference, once one is started. */
  paymentRef: string | null;
  couponCode: string | null;
  status: MarketOrderStatus;
  dropoff: ShipmentPlace | null;
  distanceKm: number | null;
  notes: string | null;
  pickupCode: string | null;
  prepMinutes: number | null;
  readyAt: Date | null;
  rejection: { reason: "closing" | "too_busy" | "items_unavailable" | "outside_area" | "other"; note: string | null } | null;
  /** The app's courier job, once made. */
  shipmentId: number | null;
  rating: { vendor: number; courier: number | null; comment: string | null; at: string } | null;
  timeline: MarketOrderStage[];
  /** When it was delivered or picked up (statements count it then). */
  completedAt: Date | null;
  lang: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketOrderInput = Omit<MarketOrder, "id">;
export type MarketOrderPatch = Partial<
  Pick<MarketOrder, "status" | "paymentStatus" | "paymentRef" | "lines" | "money" | "prepMinutes" | "readyAt" | "rejection" | "shipmentId" | "rating" | "timeline" | "completedAt" | "userId" | "updatedAt">
>;

export interface MarketOrderQuery {
  appId: string;
  userId?: number;
  vendorId?: number;
  statuses?: MarketOrderStatus[];
  /** Completed in [since, until): for statements. */
  completedSince?: Date;
  completedUntil?: Date;
  createdSince?: Date;
  order?: "newest" | "oldest";
  limit: number;
  offset: number;
}

export const COMPLAINT_REASONS = ["late", "missing_items", "wrong_items", "quality", "damaged", "not_delivered", "charged_wrong", "courier", "other"] as const;
export type ComplaintReason = (typeof COMPLAINT_REASONS)[number];
export type ComplaintStatus = "open" | "in_review" | "waiting_for_customer" | "resolved" | "rejected";

export interface ComplaintDecision {
  outcome: "refund" | "partial_refund" | "compensation" | "no_refund";
  /** Minor units; null for no refund. */
  amount: number | null;
  to: "payment" | "wallet" | "coupon" | null;
  couponCode: string | null;
  /** Who bears it in the vendor's statement. */
  funder: "owner" | "vendor";
  /** Support's words to the customer. */
  reason: string | null;
  by: string;
  at: Date;
}

/** 115.3 A complaint on a marketplace order, handled by the app owner's support. */
export interface MarketComplaint {
  id: number;
  appId: string;
  orderId: number;
  vendorId: number | null;
  userId: number | null;
  reason: ComplaintReason;
  text: string;
  lineIds: number[];
  photoAssetIds: string[];
  status: ComplaintStatus;
  /** The support team member it is assigned to (a dashboard user's email). */
  assignee: string | null;
  /** The vendor may read it (and the decision). */
  sharedWithVendor: boolean;
  messages: { id: number; from: "customer" | "support"; text: string; by: string | null; at: string }[];
  /** The team's own notes, never shown to the customer or the vendor. */
  notes: { text: string; by: string; at: string }[];
  decision: ComplaintDecision | null;
  /** Last answer from support, for the queue's timers. */
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketComplaintInput = Omit<MarketComplaint, "id">;
export type MarketComplaintPatch = Partial<Pick<MarketComplaint, "status" | "assignee" | "sharedWithVendor" | "messages" | "notes" | "decision" | "answeredAt" | "photoAssetIds" | "userId" | "updatedAt">>;

export interface MarketComplaintQuery {
  appId: string;
  userId?: number;
  vendorId?: number;
  orderId?: number;
  statuses?: ComplaintStatus[];
  assignee?: string;
  limit: number;
  offset: number;
}

/** 115.3 A wallet entry: positive in (refund, credit), negative out (paid an order, expired). */
export interface WalletEntry {
  id: number;
  appId: string;
  userId: number;
  kind: "refund" | "credit" | "payment" | "expired";
  amount: number;
  label: string;
  orderId: number | null;
  complaintId: number | null;
  /** Makes an entry once: the same key is never added twice. */
  key: string;
  createdAt: Date;
}

// 115.3 (part 3) Coupons, the club, joining forms and the vendors' web sign-in

/** 115.10 A coupon: a code the customer types, or automatic (no code) when its conditions hold. Amounts in the currency's minor units. */
export interface MarketCoupon {
  id: number;
  appId: string;
  /** Uppercase; null for an automatic offer. */
  code: string | null;
  title: string;
  kind: "percent" | "amount" | "free_delivery";
  /** A percentage (0–100) for `percent`, an amount for `amount`, unused for `free_delivery`. */
  value: number;
  /** The most a percentage takes off. */
  maxDiscount: number | null;
  /** The smallest items' total it needs. */
  minOrder: number;
  currency: string;
  /** Who bears the discount in the statements. */
  paidBy: "owner" | "vendor";
  firstOrderOnly: boolean;
  /** Empty: every vendor. */
  vendorIds: number[];
  /** Empty: every kind. */
  vendorKinds: VendorKind[];
  /** Empty: every department (groceries and shops); a vendor's own coupon may name its menu's sections here. */
  departmentIds: number[];
  /** 115.18 Only these products or dishes of the vendor's (empty or missing: every one). */
  productIds?: number[] | null;
  /** 115.18 Made by this vendor in its panel: always for it alone and paid by it. */
  createdByVendorId?: number | null;
  /** 115.18 Paused by the app's owner: off until the owner allows it again, whatever the vendor does. */
  ownerPaused?: boolean;
  /** Uses in all and per person; null: no limit. */
  usesLimit: number | null;
  perUserLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketCouponInput = Omit<MarketCoupon, "id">;
export type MarketCouponPatch = Partial<Omit<MarketCoupon, "id" | "appId" | "createdAt">>;

/** One order's use of a coupon (an order uses a coupon once; a cancelled order gives the use back). */
export interface MarketCouponUse {
  id: number;
  appId: string;
  couponId: number;
  orderId: number;
  userId: number | null;
  discount: number;
  createdAt: Date;
}

export type MarketCouponUseResult = { ok: true; use: MarketCouponUse } | { ok: false; reason: "duplicate" | "used_up" | "user_limit" };

/** 115.10 One of the app owner's club plans, at the owner's price (Yallapp sets none). */
export interface MarketClubPlan {
  id: number;
  appId: string;
  name: string;
  description: string | null;
  period: "month" | "year";
  price: number;
  currency: string;
  /** Free delivery on orders whose items reach this amount (0: always); null: no free delivery. */
  freeDeliveryOver: number | null;
  /** A percentage off delivery when it isn't free; null: none. */
  deliveryDiscountPercent: number | null;
  perks: string[];
  active: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketClubPlanInput = Omit<MarketClubPlan, "id">;
export type MarketClubPlanPatch = Partial<Omit<MarketClubPlan, "id" | "appId" | "createdAt">>;

/** A customer's club membership (one per customer and app). */
export interface MarketClubMember {
  id: number;
  appId: string;
  userId: number;
  planId: number | null;
  status: "pending" | "active" | "cancelled" | "expired";
  /** Renews at the end of the paid period. */
  renews: boolean;
  startedAt: Date | null;
  paidUntil: Date | null;
  paymentRef: string | null;
  /** What the club saved them, in all. */
  saved: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketClubMemberInput = Omit<MarketClubMember, "id" | "createdAt" | "updatedAt">;

export const APPLICATION_FIELD_KINDS = ["text", "long_text", "phone", "email", "number", "list", "yes_no", "file", "logo", "place", "hours", "documents"] as const;
export type ApplicationFieldKind = (typeof APPLICATION_FIELD_KINDS)[number];

export interface ApplicationField {
  /** Stable within the form (answers are kept by it). */
  key: string;
  kind: ApplicationFieldKind;
  label: string;
  help: string | null;
  required: boolean;
  /** For `list`. */
  options: string[];
}

/** 115.6 The app owner's form for joining as a vendor; its link (by `token`) is on Yallapp's site only. */
export interface MarketApplicationForm {
  id: number;
  appId: string;
  title: string;
  intro: string | null;
  /** The kinds of vendor it is for. */
  kinds: VendorKind[];
  fields: ApplicationField[];
  /** Random, URL-safe: the form's public link. */
  token: string;
  open: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketApplicationFormInput = Omit<MarketApplicationForm, "id">;
export type MarketApplicationFormPatch = Partial<Pick<MarketApplicationForm, "title" | "intro" | "kinds" | "fields" | "open" | "token" | "updatedAt">>;

export type MarketApplicationStatus = "new" | "more_info" | "accepted" | "rejected";

/** 115.6 A vendor's answers to a joining form. */
export interface MarketApplication {
  id: number;
  appId: string;
  formId: number;
  status: MarketApplicationStatus;
  businessName: string;
  kind: VendorKind;
  /** Lowercase: where the decision is emailed and the first staff member's sign-in. */
  email: string;
  /** By field key: text, numbers, yes or no, a place, hours, or asset ids for files. */
  answers: Record<string, unknown>;
  fileAssetIds: string[];
  /** What the team asked for (more_info) or why it was turned down. */
  message: string | null;
  /** The vendor made when accepted. */
  vendorId: number | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketApplicationInput = Omit<MarketApplication, "id">;
export type MarketApplicationPatch = Partial<Pick<MarketApplication, "status" | "answers" | "fileAssetIds" | "message" | "vendorId" | "decidedBy" | "decidedAt" | "updatedAt">>;

/** 115.7 A sign-in code sent to a vendor staff member's email for the vendors' web panel. */
export interface VendorWebChallenge {
  tokenHash: string;
  appId: string;
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

/** 115.7 A vendor staff member signed in to the vendors' web panel (the cookie holds the id; only its hash is kept). */
export interface VendorWebSession {
  idHash: string;
  appId: string;
  vendorId: number;
  staffId: number;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
}

/** One restaurant's delivered orders over a period: what it sold and what the company keeps. */
export interface FoodStatementRow {
  restaurantId: number | null;
  restaurantName: string;
  orders: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  commissionCents: number;
  /** Subtotals paid in cash to the company's couriers (the company owes the restaurant these, less commission). */
  cashSubtotalCents: number;
  /** Subtotals paid by card into the company's account. */
  cardSubtotalCents: number;
}

/** Which food orders a list holds. */
export interface FoodOrderQuery {
  appId: string;
  userId?: number;
  /** 105.1 Not this customer's (the store review account's). */
  notUserId?: number;
  restaurantId?: number;
  statuses?: FoodOrderStatus[];
  /** Created at or after, and before. */
  since?: Date;
  until?: Date;
  /** Updated at or after. */
  updatedSince?: Date;
  /** The reference ("F-12"), the customer's name or number, or the restaurant's name. */
  search?: string;
  order: "newest" | "oldest";
  offset: number;
  limit: number;
}

// 105.2 Ride hailing

export const RIDE_FARE_MODES = ["upfront", "metered"] as const;
export type RideFareMode = (typeof RIDE_FARE_MODES)[number];
export const RIDE_MATCHINGS = ["nearest", "dispatch"] as const;
export type RideMatching = (typeof RIDE_MATCHINGS)[number];

/** Where pickups may be: a circle on the map. */
export interface RideArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

/** A promo code riders type: a share off the fare, at most an amount, until a date, for a number of rides. */
export interface RidePromo {
  code: string;
  percentOff: number;
  /** null: no limit. */
  maxOffCents: number | null;
  /** null: no end. */
  endsAt: string | null;
  /** How many rides may use it in all; null: no limit. Each rider once. */
  maxRides: number | null;
  active: boolean;
}

/** How a ride company prices, matches and cancels (`Config.rides`); every amount is the company's. */
export interface RidesSettings {
  fareMode: RideFareMode;
  scheduling: boolean;
  matching: RideMatching;
  /** Empty: pickups anywhere. */
  areas: RideArea[];
  /** After a driver accepted, how long the rider may cancel for free. */
  cancelFreeMinutes: number;
  /** Charged after that, and for a no-show; 0 for none. */
  cancelFeeCents: number;
  /** How long a driver waits at the pickup before they may cancel for a no-show. */
  noShowMinutes: number;
  /** Waiting at the pickup is charged after this many minutes. */
  freeWaitMinutes: number;
  /** The rider tells the driver a 4-digit code to start. */
  pin: boolean;
  /** E.164; null: the phone's emergency number. */
  emergencyPhone: string | null;
  /** The company's share of each fare, in basis points (2000 = 20%), unless a driver has their own. */
  commissionBp: number;
  /** How far from the pickup an online driver may be to be offered a ride. */
  matchRadiusKm: number;
  /** How long each driver has to accept. */
  offerSeconds: number;
  /** The usual speed in town, for estimates. */
  speedKmh: number;
  promos: RidePromo[];
}

/** A paper of the driver's the company keeps (licence, car registration), an asset. */
export interface DriverDocument {
  label: string;
  assetId: string;
}

/** A driver's side of a courier row in a ride app. */
export interface DriverDetails {
  photoAssetId: string | null;
  vehicleTypeId: number | null;
  carModel: string | null;
  carColor: string | null;
  plate: string | null;
  /** The company's share of this driver's fares, in basis points; null: the company's (`RidesSettings.commissionBp`). */
  commissionBp: number | null;
  documents: DriverDocument[];
  /** Degrees from north, with the last position. */
  heading: number | null;
  ratingSum: number;
  ratingCount: number;
}

/** A kind of vehicle riders choose (economy, comfort, van), with its fares. */
export interface VehicleType {
  id: number;
  appId: string;
  name: string;
  description: string | null;
  /** A Material Symbols (Rounded) name. */
  icon: string;
  imageAssetId: string | null;
  seats: number;
  baseCents: number;
  perKmCents: number;
  perMinuteCents: number;
  /** The smallest fare. */
  minCents: number;
  /** Per minute of waiting at the pickup after the free minutes. */
  waitPerMinuteCents: number;
  position: number;
  /** Hidden from the app when false. */
  active: boolean;
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleTypeInput = Omit<VehicleType, "id" | "createdAt" | "updatedAt">;

/** A vehicle type's fares, kept on each ride as they were when it was asked for. */
export type RideFares = Pick<VehicleType, "baseCents" | "perKmCents" | "perMinuteCents" | "minCents" | "waitPerMinuteCents">;

export const RIDE_STATUSES = ["scheduled", "searching", "accepted", "arrived", "in_progress", "completed", "cancelled", "no_driver"] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

/** A stage the ride went through. `at` is an ISO string. */
export interface RideStage {
  status: RideStatus;
  at: string;
  note?: string | null;
  by?: "rider" | "driver" | "company" | "payment" | "system";
}

export interface RideCancellation {
  by: "rider" | "driver" | "company";
  reason: string | null;
  /** Charged to the rider, added to their next ride; 0 for none. */
  feeCents: number;
}

export interface Ride {
  id: number;
  appId: string;
  /** The rider; null once they deleted their account. */
  userId: number | null;
  riderName: string;
  /** E.164, where the driver calls. */
  riderPhone: string | null;
  vehicleTypeId: number | null;
  /** Kept when the type is deleted. */
  vehicleTypeName: string;
  vehicleTypeIcon: string;
  fares: RideFares;
  fareMode: RideFareMode;
  pickup: ShipmentPlace;
  dropoff: ShipmentPlace;
  scheduledAt: Date | null;
  /** By road, estimated. */
  estimateKm: number;
  estimateMinutes: number;
  /** The fare given when asked: with the discount and any previous fee. */
  quotedCents: number;
  promoCode: string | null;
  discountCents: number;
  /** An unpaid cancellation fee of the rider's carried into this ride, and the ride it came from. */
  previousFeeCents: number;
  previousFeeRideId: number | null;
  /** Once completed: the fare charged, the distance and minutes it was worked out from, the minutes waited past the free ones. */
  finalCents: number | null;
  /** Measured from the driver's positions during the ride. */
  meterKm: number;
  rideMinutes: number | null;
  waitMinutes: number | null;
  /** Once completed: the company's share of the fare (without the previous fee, which is all the company's). */
  commissionBp: number | null;
  commissionCents: number | null;
  currency: CatalogCurrency;
  paymentMethod: "cash" | "card";
  paymentStatus: "unpaid" | "paid" | "refunded";
  /** Paid by card: the catalog order of its last payment link. */
  orderId: number | null;
  status: RideStatus;
  /** The code the rider tells the driver, when the company asks for one. */
  pin: string | null;
  notes: string | null;
  driverId: number | null;
  /** Kept when the driver is deleted. */
  driverName: string | null;
  /** The driver it is offered to now, until when; the drivers who let it go. */
  offeredTo: number | null;
  offerExpiresAt: Date | null;
  declinedBy: number[];
  /** When it was last offered to drivers (asked now, or its time came). */
  searchingSince: Date | null;
  cancellation: RideCancellation | null;
  /** A cancelled ride's fee: the ride it was carried into. */
  feeCarriedTo: number | null;
  /** For the share link; null once the ride ended. */
  shareToken: string | null;
  rating: { driver: number; comment: string | null; at: string } | null;
  timeline: RideStage[];
  lang: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RideInput = Omit<Ride, "id">;
export type RidePatch = Partial<Omit<Ride, "id" | "appId" | "createdAt">>;

/** Which rides a list holds. */
export interface RideQuery {
  appId: string;
  userId?: number;
  /** Not this rider's (the store review account's). */
  notUserId?: number;
  driverId?: number;
  offeredTo?: number;
  statuses?: RideStatus[];
  promoCode?: string;
  /** Created at or after, and before. */
  since?: Date;
  until?: Date;
  /** Updated at or after. */
  updatedSince?: Date;
  /** The reference ("R-12"), the rider's name or number, or the driver's name. */
  search?: string;
  order: "newest" | "oldest";
  offset: number;
  limit: number;
}

/** One driver's completed rides over a period: what they drove and what the company keeps. */
export interface RideStatementRow {
  driverId: number | null;
  driverName: string;
  rides: number;
  /** Fares without previous fees. */
  faresCents: number;
  /** All the driver collected in cash (previous fees too). */
  cashCents: number;
  /** Paid by card into the company's account. */
  cardCents: number;
  commissionCents: number;
  /** Previous cancellation fees collected with these rides (the company's). */
  feesCents: number;
}

/**
 * 49 A signed notice Yallapp sends an app's own API (roadmap 34.8): today
 * `account.deleted` when a person deletes their account in an app Yallapp
 * signs people in to. Retried with backoff (lib/hosted/api-webhooks.ts),
 * listed on App sign-in › For your developer, kept 30 days (`api_webhooks`).
 */
/** 100.7 `purchase.completed` and `purchase.revoked`: a store purchase gives or takes access in the client's system. */
export type ApiWebhookEvent = "account.deleted" | "purchase.completed" | "purchase.revoked";

/** 100.7 What a purchase notice carries besides its event. */
export interface ApiWebhookData {
  /** The change of the purchase it tells of; the notice is dropped when the purchase changed again before it was delivered. */
  purchase?: { id: string; platform: StorePlatform; storeKey: string; status: StorePurchaseRecord["status"]; expiresAt: string | null };
  /** The event's claim (`events["purchase.completed"]`). */
  event?: Record<string, unknown>;
}
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
  /** 100.7 A purchase notice's change and claim; null or missing for `account.deleted`. */
  data?: ApiWebhookData | null;
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

// 104.8.2 Yallapp Courier: one courier app for every company that picks it (lib/courier-hub)

/** 104.8.2 A person signed in to Yallapp Courier with a code to their mobile number or email; the companies' couriers with it are theirs. */
export interface CourierAccount {
  id: string;
  /** E.164; null for an email account. */
  phone: string | null;
  /** Lowercase; null for a phone account. */
  email: string | null;
  createdAt: Date;
  lastSignInAt: Date;
}

/** 104.8.2 A phone signed in to Yallapp Courier: one per sign-in, with the hash of its refresh token (rotated on each use) and its push token. */
export interface CourierDevice {
  id: string;
  accountId: string;
  /** The ID the app generated for this install; the company sessions it opens use it too. */
  deviceId: string;
  platform: "android" | "ios";
  name: string;
  appVersion: string;
  refreshHash: string;
  refreshExpiresAt: Date;
  pushToken: string | null;
  pushProvider: PushProvider;
  createdAt: Date;
  lastSeenAt: Date;
}

export type CourierDevicePatch = Partial<Pick<CourierDevice, "platform" | "name" | "appVersion" | "pushToken" | "pushProvider" | "lastSeenAt">>;

/** 104.8.2 A sign-in code sent to a number or address (kept hashed); the review account's has none. */
export interface CourierChallenge {
  tokenHash: string;
  phone: string | null;
  email: string | null;
  codeHash: string | null;
  attempts: number;
  review: boolean;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * 104.8.2 Yallapp Courier in Admin › Settings: the stores' review account (a
 * number or an email, with a fixed code; nothing is sent to it) and 104.8.3
 * the app's store links once it is published.
 */
export interface CourierHubSetting {
  reviewPhone: string | null;
  reviewEmail: string | null;
  reviewCode: string | null;
  playUrl: string | null;
  appStoreUrl: string | null;
}

export interface PlatformSettingValues {
  courierHub: CourierHubSetting;
}

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

// 85.3 Automatic notifications

/** 85.3 A cart in the app, as the app reports it: how many items, and when it last changed. */
export interface HostedCart {
  appId: string;
  userId: number;
  items: number;
  updatedAt: Date;
  /** When "You left something in your cart" went out for it; a change after that may bring another. */
  remindedAt: Date | null;
}

/**
 * 91.2 A person's orders on a connected platform, watched for some days after
 * they check out from the app: what each order looked like last time, so a
 * change (shipped, completed, cancelled, refunded) is told once.
 */
export interface HostedOrderWatch {
  appId: string;
  userId: number;
  /** Each order's last seen state, by order ID. */
  orders: Record<string, string>;
  /** Null before the first look (the orders seen then aren't told). */
  checkedAt: Date | null;
  /** Watched until then. */
  until: Date;
}

// 85.2 Notification campaigns

/** 85.1 Who a campaign goes to (lib/hosted/audiences.ts). */
export interface NotificationAudience {
  who: "everyone" | "buyers" | "students" | "members" | "inactive";
  courseId: number | null;
  inactiveDays: number | null;
  languages: string[];
  platforms: ("android" | "ios")[];
  countries: string[];
}

/**
 * 85.2 A draft is kept to send later; "scheduled" waits for `sendAt` (once,
 * or the next week's time); "sending" is taken by one run; "sent" went out
 * (once); "stopped" is a weekly one the owner stopped; "failed" was refused
 * when its time came (the reason in `result`).
 */
export type NotificationCampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "stopped" | "failed";

export interface NotificationCampaign {
  id: number;
  appId: string;
  title: string;
  body: string;
  /** A picture from the app's Media (public) or Yallapp's pictures: its address on yallapp.com.tr. */
  imageUrl: string | null;
  /** What it opens: a link in the Links format, or another https address; null opens the app. */
  link: string | null;
  audience: NotificationAudience;
  repeat: "once" | "weekly";
  /** When it goes out next: once, the time chosen; weekly, the next week's. Null for a draft or one sent at once. */
  sendAt: Date | null;
  /** Weekly: the day (0 Sunday … 6 Saturday) and time ("18:30") in the app's time zone. */
  weekday: number | null;
  time: string | null;
  status: NotificationCampaignStatus;
  claimedAt: Date | null;
  lastSentAt: Date | null;
  /** Why it failed, or what the last send said (English, as the dashboard's `known` texts). */
  result: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationCampaignPatch = Partial<Omit<NotificationCampaign, "id" | "appId" | "createdAt" | "createdBy">>;

/** 85.2 One time a campaign went out: the inbox notification, and how it went. */
export interface CampaignSend {
  id: number;
  campaignId: number;
  appId: string;
  notificationId: number;
  sentAt: Date;
  /** People it went to (their inboxes). */
  recipients: number;
  /** Phones the push reached, and phones it didn't. */
  pushed: number;
  failed: number;
  /** 85.4 When the numbers came: at once on the hosted API; a WordPress site reports them once its batches are sent (null until then). */
  reportedAt: Date | null;
}

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

export type ChatConversationKind = "direct" | "group" | "school";

/** 77 A person and the business (`direct`), or a course's group; 113.6 a school's teacher and a parent or a student (`school`). */
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
  /** 113.6 A school conversation's teacher and the parent or student (school people's IDs). */
  schoolTeacherId?: number | null;
  schoolPersonId?: number | null;
  /** 113.6 The teacher wrote in it (a family may answer when only teachers start). */
  teacherWroteAt?: Date | null;
  /** 113.6 The administration closed it: read, but nothing more is sent. */
  closedAt?: Date | null;
  closedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatConversationPatch = Partial<Pick<ChatConversation, "title" | "imageUrl" | "lastMessageId" | "lastMessageAt" | "businessReadId" | "keepUntil" | "noticeFor" | "teacherWroteAt" | "closedAt" | "closedBy" | "updatedAt">>;

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

export type TeamAlertKind = "build_waiting" | "build_stalled" | "job_missing" | "job_failed" | "crash_spike" | "push_failed" | "health" | "integration" | "mail_slow";

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

// 105.3 Academies with many teachers

export const TEACHER_STATUSES = ["applied", "active", "suspended", "declined"] as const;
export type TeacherStatus = (typeof TEACHER_STATUSES)[number];

/**
 * One of an academy's teachers: added by the academy by number (or email),
 * or someone who applied from the app (`applied` until the academy answers).
 * Whoever signs in with the number is the teacher.
 */
export interface Teacher {
  id: number;
  appId: string;
  name: string;
  /** E.164. */
  phone: string | null;
  /** Lowercase. */
  email: string | null;
  /** The app user who applied, or who last used the Teacher screens. */
  userId: number | null;
  photoAssetId: string | null;
  bio: string;
  subjects: string[];
  status: TeacherStatus;
  /** The teacher's share of their courses' sales, in basis points (0 to 10000), set by the academy. */
  shareBp: number;
  /** Shown first in the app's list of teachers. */
  featured: boolean;
  /** The academy's note when it declined an application. */
  note: string | null;
  /** 110.2 A sample teacher (lib/samples): nobody signs in as one; saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TeacherInput = Pick<Teacher, "appId" | "name" | "phone" | "email" | "userId" | "photoAssetId" | "bio" | "subjects" | "status" | "shareBp" | "featured" | "sample">;
export type TeacherPatch = Partial<Pick<Teacher, "name" | "phone" | "email" | "userId" | "photoAssetId" | "bio" | "subjects" | "status" | "shareBp" | "featured" | "note" | "sample">>;

/** A student's review of a teacher; one per student and teacher. */
export interface TeacherReview {
  id: number;
  appId: string;
  teacherId: number;
  userId: number;
  rating: number;
  text: string;
  /** Hidden by the academy: only its author sees it. */
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 105.4 Schools

/** Who a person is at a school. One person may be on the list twice (a teacher who is also a parent). 113.3 `staff`: who works at the school and doesn't teach. */
export type SchoolRole = "student" | "parent" | "teacher" | "staff";
export const SCHOOL_ROLES: readonly SchoolRole[] = ["student", "parent", "teacher", "staff"];

/** The school's settings (school_settings). */
export interface SchoolSettings {
  /** IANA, for today's lessons and attendance. */
  timezone: string;
  currency: string;
  /** The current term; attendance and grades default to it. */
  term: { name: string; startsOn: string; endsOn: string } | null;
  /** Parents get a push when their child is marked absent or late. */
  absenceAlerts: boolean;
  /** Fees can be paid by card on the school's payment page. */
  feesByCard: boolean;
  /** 113.2 Checking in and out from the app; left out: off (lib/school/checkin.ts). */
  checkin?: SchoolCheckinSettings;
  /** 113.6 Messages between teachers and families; missing: as `DEFAULT_SCHOOL_MESSAGES` (off). */
  messages?: SchoolMessageSettings;
  /** 113.10 When families are told the bus is near; left out: the defaults (lib/school/bus.ts). */
  bus?: SchoolBusSettings;
  /** 113.11 The library's loan and hold days; left out: the defaults (lib/school/library.ts). */
  library?: SchoolLibrarySettings;
  /** 113.12 The deductions suggested from check-in; left out: off (lib/school/salaries.ts). */
  salaries?: SchoolSalarySettings;
  /** 113.8 Which behaviour notes parents get a push for; "all" when not set. */
  behaviourAlerts?: SchoolBehaviourAlerts;
  /** 113.8 The school saved its behaviour categories once: the suggested ones aren't added again. */
  behaviourCategoriesSet?: boolean;
  /** Templates = demos: the sample school a project started from the school demo got (lib/samples/demo.ts); missing: none. */
  sampleSchool?: SchoolSample;
}

/** The classes, subjects and people added as a sample school, removed together with "Remove all samples". */
export interface SchoolSample {
  classIds: number[];
  subjectIds: number[];
  personIds: number[];
}

/** 113.2 How people check in: the gate's QR code, inside the school's area, either one, or both at once. */
export type SchoolCheckinMethods = "qr" | "location" | "either" | "both";
export const SCHOOL_CHECKIN_METHODS: readonly SchoolCheckinMethods[] = ["qr", "location", "either", "both"];

/** 113.2 A school day's times, in minutes from midnight: it starts, late from, it ends, leaving early before. */
export interface SchoolDayTimes {
  startMinute: number;
  lateMinute: number;
  endMinute: number;
  earlyMinute: number;
}

/** 113.2 Checking in and out at the school. */
export interface SchoolCheckinSettings {
  on: boolean;
  methods: SchoolCheckinMethods;
  /** The school's place and how far from it counts as inside, in metres. */
  place: { lat: number; lng: number; radiusM: number } | null;
  /** The school's days, 1 Monday … 7 Sunday. */
  days: number[];
  students: SchoolDayTimes;
  /** Teachers and staff, unless their own working hours say otherwise. */
  staff: SchoolDayTimes;
  /** Parents are told when their child checks in and out. */
  parentAlerts: boolean;
  /** Turning this up makes every gate code new (when a gate screen's link went where it shouldn't). */
  gateKey: number;
  /** The first day counted: days before it are never absent. */
  since: string | null;
}

/** 113.3 When a teacher or a member of staff works. */
export interface SchoolWorkHours {
  /** 1 Monday … 7 Sunday. */
  days: number[];
  startMinute: number;
  endMinute: number;
}

/** 113.6 Whom teachers write to and hear from in the app (the administration and its teachers always can). */
export type SchoolMessagesWith = "none" | "parents" | "parents_students";
export const SCHOOL_MESSAGES_WITH: readonly SchoolMessagesWith[] = ["none", "parents", "parents_students"];

/** 113.6 The school's rules for messages between teachers, parents and students (lib/school/messages). */
export interface SchoolMessageSettings {
  with: SchoolMessagesWith;
  /** Who may write first: the teacher only, or both sides. */
  startedBy: "teacher" | "both";
  /** When messages can be sent, in the school's time zone; null: at any time. Outside them a message is refused, with when it can be sent. */
  hours: { from: number; to: number; days: number[] } | null;
  /** A teacher may write to a whole class's parents (or students) at once; the replies come back one by one. */
  classBroadcast: boolean;
  /** Photos, voice messages and files, besides text. */
  attachments: boolean;
  /** The administration may read the conversations (the app tells everyone); else only one with a reported message. */
  adminReads: boolean;
}

export interface SchoolClass {
  id: number;
  appId: string;
  /** "Grade 5 A". */
  name: string;
  /** "Grade 5", to group classes; null when the school doesn't. */
  grade: string | null;
  /** The class's own teacher. */
  homeroomTeacherId: number | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolSubject {
  id: number;
  appId: string;
  name: string;
  createdAt: Date;
}

/** A student, parent or teacher the school added. Whoever signs in with their number (or email) is them. */
export interface SchoolPerson {
  id: number;
  appId: string;
  role: SchoolRole;
  name: string;
  /** E.164. */
  phone: string | null;
  /** Lowercase. */
  email: string | null;
  /** The app user who last signed in as them. */
  userId: number | null;
  /** A student's class. */
  classId: number | null;
  /** The school's own number for a student. */
  code: string | null;
  photoAssetId: string | null;
  active: boolean;
  /** 113.3 A teacher's or staff member's job ("Nurse"), department ("Office"; 113.6 the administration writes to a department at once), working hours (else the school's staff times) and duties. */
  jobTitle?: string | null;
  department?: string | null;
  workHours?: SchoolWorkHours | null;
  duties?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SchoolPersonInput = Pick<SchoolPerson, "appId" | "role" | "name" | "phone" | "email" | "classId" | "code" | "photoAssetId" | "active"> &
  Partial<Pick<SchoolPerson, "jobTitle" | "department" | "workHours" | "duties">>;
export type SchoolPersonPatch = Partial<Pick<SchoolPerson, "name" | "phone" | "email" | "userId" | "classId" | "code" | "photoAssetId" | "active" | "jobTitle" | "department" | "workHours" | "duties">>;

/** A parent's child. */
export interface SchoolFamilyLink {
  appId: string;
  parentId: number;
  studentId: number;
}

/** A lesson in a class's weekly timetable. */
export interface SchoolPeriod {
  id: number;
  appId: string;
  classId: number;
  subjectId: number;
  teacherId: number | null;
  /** 1 Monday … 7 Sunday. */
  weekday: number;
  /** Minutes from midnight. */
  startMinute: number;
  endMinute: number;
  room: string | null;
}

export type SchoolAttendanceStatus = "present" | "absent" | "late" | "excused";
export const SCHOOL_ATTENDANCE_STATUSES: readonly SchoolAttendanceStatus[] = ["present", "absent", "late", "excused"];

/** A student's mark on a school day; one per student and day. */
export interface SchoolAttendance {
  appId: string;
  classId: number;
  studentId: number;
  /** YYYY-MM-DD in the school's time zone. */
  date: string;
  status: SchoolAttendanceStatus;
  note: string | null;
  /** The teacher who took it; null from the dashboard. */
  takenBy: number | null;
  updatedAt: Date;
}

/** A file in the school's Media library, attached to homework or handed in. */
export interface SchoolFileRef {
  fileId: string;
  name: string;
  kind: "image" | "pdf";
}

export interface SchoolHomework {
  id: number;
  appId: string;
  classId: number;
  subjectId: number;
  teacherId: number | null;
  title: string;
  text: string;
  dueOn: string;
  files: SchoolFileRef[];
  createdAt: Date;
}

/** What a student handed in, and the teacher's mark; one per student and homework. */
export interface SchoolSubmission {
  appId: string;
  homeworkId: number;
  studentId: number;
  text: string;
  file: SchoolFileRef | null;
  /** Null when the teacher marked it without anything handed in. */
  submittedAt: Date | null;
  late: boolean;
  mark: string | null;
  feedback: string | null;
  markedAt: Date | null;
}

export type SchoolAssessmentKind = "exam" | "quiz" | "assignment";
export const SCHOOL_ASSESSMENT_KINDS: readonly SchoolAssessmentKind[] = ["exam", "quiz", "assignment"];

export interface SchoolAssessment {
  id: number;
  appId: string;
  classId: number;
  subjectId: number;
  teacherId: number | null;
  kind: SchoolAssessmentKind;
  title: string;
  date: string;
  maxScore: number;
  createdAt: Date;
}

export interface SchoolScore {
  appId: string;
  assessmentId: number;
  studentId: number;
  score: number;
  note: string | null;
  updatedAt: Date;
}

/** The school's news: to everyone, a class, or one student and their family; 113.3 or to its teachers and staff only. */
export interface SchoolAnnouncement {
  id: number;
  appId: string;
  audience: "school" | "class" | "student" | "staff";
  classId: number | null;
  studentId: number | null;
  title: string;
  body: string;
  /** The teacher who wrote it; null: the school. */
  teacherId: number | null;
  /** 110.2 A sample entry (lib/samples): saving it in the dashboard makes it the owner's. */
  sample?: boolean;
  createdAt: Date;
}

// 113.8 The school's calendar, the exams' timetable and behaviour

export type SchoolEventKind = "event" | "holiday" | "exam";
export const SCHOOL_EVENT_KINDS: readonly SchoolEventKind[] = ["event", "holiday", "exam"];
/** Who an event is for: everyone, a grade's classes, one class, or the people who work at the school. */
export type SchoolEventAudience = "school" | "grade" | "class" | "staff";
export const SCHOOL_EVENT_AUDIENCES: readonly SchoolEventAudience[] = ["school", "grade", "class", "staff"];

/** A day or days on the school's calendar: an event, a holiday or break (no school), or exam days. */
export interface SchoolEvent {
  id: number;
  appId: string;
  kind: SchoolEventKind;
  title: string;
  notes: string | null;
  /** YYYY-MM-DD; `endsOn` the same day for one day. */
  startsOn: string;
  endsOn: string;
  /** Minutes from midnight; null: all day. */
  startMinute: number | null;
  endMinute: number | null;
  place: string | null;
  audience: SchoolEventAudience;
  /** The grade (`SchoolClass.grade`) of a grade's event. */
  grade: string | null;
  classId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SchoolEventInput = Omit<SchoolEvent, "id" | "createdAt" | "updatedAt">;

/** An exam in the exams' timetable, for a class or every class of a grade; families see it once published. */
export interface SchoolExam {
  id: number;
  appId: string;
  classId: number | null;
  grade: string | null;
  subjectId: number;
  /** YYYY-MM-DD in the school's time zone. */
  date: string;
  startMinute: number;
  durationMinutes: number;
  room: string | null;
  /** What it covers and what to bring. */
  notes: string | null;
  published: boolean;
  publishedAt: Date | null;
  /** The day-before reminder went out. */
  remindedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SchoolExamInput = Pick<SchoolExam, "appId" | "classId" | "grade" | "subjectId" | "date" | "startMinute" | "durationMinutes" | "room" | "notes">;

export type SchoolBehaviourKind = "positive" | "negative";
/** Which notes parents are told of. */
export type SchoolBehaviourAlerts = "all" | "negative" | "none";
export const SCHOOL_BEHAVIOUR_ALERTS: readonly SchoolBehaviourAlerts[] = ["all", "negative", "none"];

/** A kind of merit or note the school defines, with its points (negative for a negative note). */
export interface SchoolBehaviourCategory {
  id: number;
  appId: string;
  name: string;
  kind: SchoolBehaviourKind;
  points: number;
  position: number;
  active: boolean;
  createdAt: Date;
}

/** A merit or a note on a student, by a teacher or the school. */
export interface SchoolBehaviourNote {
  id: number;
  appId: string;
  studentId: number;
  /** The student's class when it was written. */
  classId: number | null;
  categoryId: number | null;
  /** Kept as written, should the category change. */
  categoryName: string;
  kind: SchoolBehaviourKind;
  points: number;
  note: string | null;
  /** The teacher who wrote it; null: the school. */
  teacherId: number | null;
  createdAt: Date;
}

export type SchoolFeeStatus = "due" | "paid" | "cancelled";

/** An amount the school asks of a student's family; every amount is the school's. */
export interface SchoolFee {
  id: number;
  appId: string;
  studentId: number;
  title: string;
  amountCents: number;
  dueOn: string | null;
  status: SchoolFeeStatus;
  paidAt: Date | null;
  paidBy: "card" | "office" | null;
  /** The card payment's order. */
  orderId: number | null;
  /** The receipt's address code, made when it is paid. */
  receiptCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}


// 113.5 Reports between the administration and the teachers

/**
 * A unit of the syllabus of a subject in a grade (the classes' `grade`, else
 * a class's own name); its lessons or topics are SchoolSyllabusTopic.
 */
export interface SchoolSyllabusUnit {
  id: number;
  appId: string;
  subjectId: number;
  grade: string;
  title: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A lesson or topic of a unit, with the days the plan gives it (a week or another range). */
export interface SchoolSyllabusTopic {
  id: number;
  appId: string;
  unitId: number;
  title: string;
  /** YYYY-MM-DD. */
  startsOn: string;
  endsOn: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A topic a class covered, on a day; one per class and topic. */
export interface SchoolTopicProgress {
  appId: string;
  classId: number;
  topicId: number;
  coveredOn: string;
  note: string | null;
  /** The teacher who marked it; null from the dashboard. */
  teacherId: number | null;
  updatedAt: Date;
}

export type SchoolReportKind = "student" | "class";
export const SCHOOL_REPORT_KINDS: readonly SchoolReportKind[] = ["student", "class"];

export type SchoolReportFieldType = "text" | "choice" | "rating";
export const SCHOOL_REPORT_FIELD_TYPES: readonly SchoolReportFieldType[] = ["text", "choice", "rating"];

/** A field of a report template: written text, one of the choices, or a rating from 1 to 5. */
export interface SchoolReportField {
  /** Stable within the template ("f1", "f2"…), the key of the answers. */
  id: string;
  label: string;
  type: SchoolReportFieldType;
  /** A choice field's choices. */
  options: string[];
  required: boolean;
}

/** The school's report template, for teachers' reports on a student or on a class. */
export interface SchoolReportTemplate {
  id: number;
  appId: string;
  kind: SchoolReportKind;
  name: string;
  fields: SchoolReportField[];
  createdAt: Date;
  updatedAt: Date;
}

/** A draft, sent to the administration, sent back for changes, or approved. */
export type SchoolReportStatus = "draft" | "sent" | "returned" | "approved";
export const SCHOOL_REPORT_STATUSES: readonly SchoolReportStatus[] = ["draft", "sent", "returned", "approved"];

/** A comment on a report: the administration's or the teacher's (when they send it again). */
export interface SchoolReportComment {
  by: "school" | "teacher";
  name: string;
  text: string;
  at: string;
}

/** A teacher's report to the administration, on a student or on a class, written on a template. */
export interface SchoolReport {
  id: number;
  appId: string;
  kind: SchoolReportKind;
  /** The template it was written on; its name and fields are kept with the report. */
  templateId: number | null;
  templateName: string;
  fields: SchoolReportField[];
  answers: Record<string, string | number>;
  teacherId: number | null;
  teacherName: string;
  /** A student report's student. */
  studentId: number | null;
  /** The class it is about (a student's class when it was written). */
  classId: number | null;
  subjectId: number | null;
  /** The period it covers (YYYY-MM-DD), when it has one. */
  periodFrom: string | null;
  periodTo: string | null;
  status: SchoolReportStatus;
  comments: SchoolReportComment[];
  sentAt: Date | null;
  /** When the administration first opened it after it was sent. */
  readAt: Date | null;
  /** Sent back or approved. */
  reviewedAt: Date | null;
  /** Shared with the student's parents (an approved student report only). */
  sharedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 113.2 Checking in and out

export type SchoolCheckinMethod = "qr" | "location" | "office";

/** A correction by the school's office, kept on the day's record. */
export interface SchoolCheckinCorrection {
  /** ISO time. */
  at: string;
  /** Who made it (their name, else their email). */
  by: string;
  reason: string;
  /** What changed, in English: "In 07:55 → 07:40". */
  change: string;
}

/** A person's day at the gate: one per person and day. */
export interface SchoolCheckin {
  appId: string;
  personId: number;
  role: "student" | "teacher" | "staff";
  /** YYYY-MM-DD in the school's time zone. */
  date: string;
  inAt: Date | null;
  inMethod: SchoolCheckinMethod | null;
  outAt: Date | null;
  outMethod: SchoolCheckinMethod | null;
  late: boolean;
  leftEarly: boolean;
  /** The office's mark for the day; null: as they checked in. */
  mark: "absent" | "excused" | null;
  corrections: SchoolCheckinCorrection[];
  updatedAt: Date;
}

// 113.3 Leave requests

export type SchoolLeaveKind = "sick" | "annual" | "other";
export const SCHOOL_LEAVE_KINDS: readonly SchoolLeaveKind[] = ["sick", "annual", "other"];
export type SchoolLeaveStatus = "pending" | "approved" | "refused" | "cancelled";

/** A teacher's or staff member's request for days off, answered in the dashboard. */
export interface SchoolLeave {
  id: number;
  appId: string;
  personId: number;
  kind: SchoolLeaveKind;
  startsOn: string;
  endsOn: string;
  note: string | null;
  /** A photo or PDF of a document (a doctor's note). */
  file: SchoolFileRef | null;
  status: SchoolLeaveStatus;
  /** The school's note with its answer. */
  answer: string | null;
  answeredBy: string | null;
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 113.10 The school bus

export type SchoolBusTrip = "morning" | "afternoon";
export const SCHOOL_BUS_TRIPS: readonly SchoolBusTrip[] = ["morning", "afternoon"];

/** 113.10 When a family is told the bus is near their stop: within a distance, or within minutes. */
export interface SchoolBusSettings {
  nearBy: "distance" | "minutes";
  nearMeters: number;
  nearMinutes: number;
}

/** 113.10 A bus route: its bus (plate, seats), its driver and its supervisor (people of the school who aren't students or parents). */
export interface SchoolBusRoute {
  id: number;
  appId: string;
  name: string;
  plate: string;
  capacity: number;
  driverId: number | null;
  supervisorId: number | null;
  active: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 113.10 A stop of a route, in order: its place on the map and the bus's time there on each trip. */
export interface SchoolBusStop {
  id: number;
  appId: string;
  routeId: number;
  name: string;
  lat: number;
  lng: number;
  /** Minutes from midnight; null: the trip doesn't stop here. */
  morningMinute: number | null;
  afternoonMinute: number | null;
  position: number;
}

/** 113.10 A student's stop on a trip: one per student and trip. */
export interface SchoolBusRider {
  appId: string;
  studentId: number;
  trip: SchoolBusTrip;
  routeId: number;
  stopId: number;
}

export type SchoolBusRunStatus = "running" | "done";

/** 113.10 A route's trip on a school day: started by the driver in the app, with the bus's last position while it runs. One per route, day and trip. */
export interface SchoolBusRun {
  id: number;
  appId: string;
  routeId: number;
  trip: SchoolBusTrip;
  /** YYYY-MM-DD in the school's time zone. */
  date: string;
  status: SchoolBusRunStatus;
  startedAt: Date;
  endedAt: Date | null;
  /** The person who started it. */
  startedBy: number | null;
  lat: number | null;
  lng: number | null;
  locatedAt: Date | null;
  /** The stops the bus reached. */
  passedStopIds: number[];
  /** The stops whose families were told the bus is near. */
  toldStopIds: number[];
}

export type SchoolBusMarkStatus = "boarded" | "off" | "absent";
export const SCHOOL_BUS_MARKS: readonly SchoolBusMarkStatus[] = ["boarded", "off", "absent"];

/** 113.10 A student on a trip: got on, got off, or absent, as the driver or the supervisor marked it. */
export interface SchoolBusMark {
  appId: string;
  runId: number;
  studentId: number;
  status: SchoolBusMarkStatus;
  boardedAt: Date | null;
  offAt: Date | null;
  markedBy: number | null;
  updatedAt: Date;
}

// 113.11 The library

/** 113.11 How long a loan and a hold last, how many books one person borrows at once, and when the reminder goes. */
export interface SchoolLibrarySettings {
  loanDays: number;
  holdDays: number;
  maxLoans: number;
  /** The reminder goes this many days before the due date. */
  remindDays: number;
}

/** 113.11 A book of the school's library; its copies are on the shelf, its e-book (a PDF of the Media library) reads in the app. */
export interface SchoolBook {
  id: number;
  appId: string;
  title: string;
  author: string;
  isbn: string | null;
  coverAssetId: string | null;
  shelf: string | null;
  category: string | null;
  language: string | null;
  description: string | null;
  file: SchoolFileRef | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 113.11 One copy of a book, with its own code (the label on it). */
export interface SchoolBookCopy {
  id: number;
  appId: string;
  bookId: number;
  code: string;
  note: string | null;
  createdAt: Date;
}

/** 113.11 A copy lent at the desk to a person of the school; open until it is returned. */
export interface SchoolBookLoan {
  id: number;
  appId: string;
  bookId: number;
  copyId: number;
  personId: number;
  lentAt: Date;
  dueOn: string;
  returnedAt: Date | null;
  /** The day the reminder before the due date went. */
  dueToldOn: string | null;
  /** The day the last overdue reminder went. */
  overdueToldOn: string | null;
}

export type SchoolBookHoldStatus = "waiting" | "ready" | "collected" | "cancelled" | "expired";

/** 113.11 A book reserved from the app: waiting for a copy, then a copy held for the school's days. */
export interface SchoolBookHold {
  id: number;
  appId: string;
  bookId: number;
  personId: number;
  status: SchoolBookHoldStatus;
  copyId: number | null;
  readyAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// 113.4 The parent's area: permission slips, absence excuses and pick-up

/** Who a permission slip is for: everyone, a grade's classes, or one class. */
export type SchoolSlipAudience = "school" | "grade" | "class";

/** A permission slip the school sends the parents to sign, yes or no, by its due date. */
export interface SchoolSlip {
  id: number;
  appId: string;
  title: string;
  details: string | null;
  /** YYYY-MM-DD: answers are taken to the end of this day. */
  dueOn: string;
  /** "E£150, paid at the office"; the slip takes no payment. */
  feeNote: string | null;
  audience: SchoolSlipAudience;
  grade: string | null;
  classId: number | null;
  /** The day-before reminder went to the parents who hadn't answered. */
  remindedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SchoolSlipInput = Pick<SchoolSlip, "appId" | "title" | "details" | "dueOn" | "feeNote" | "audience" | "grade" | "classId">;

/** A parent's answer for one child; one per slip and student (answered again, it is replaced). */
export interface SchoolSlipAnswer {
  appId: string;
  slipId: number;
  studentId: number;
  answer: "yes" | "no";
  /** The name the parent signed with. */
  signedName: string;
  /** The parent who answered. */
  parentId: number | null;
  answeredAt: Date;
}

export type SchoolExcuseStatus = "pending" | "accepted" | "declined" | "cancelled";

/** A parent's excuse for a child's absence (a day or several), accepted or declined by the school. */
export interface SchoolExcuse {
  id: number;
  appId: string;
  studentId: number;
  /** The parent who sent it. */
  parentId: number | null;
  startsOn: string;
  endsOn: string;
  reason: string;
  /** A photo or PDF (a doctor's note). */
  file: SchoolFileRef | null;
  status: SchoolExcuseStatus;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Someone a child's parents allow to pick the child up. */
export interface SchoolPickupPerson {
  name: string;
  /** "Grandmother". */
  relation: string | null;
  /** As typed. */
  phone: string | null;
  photo: SchoolFileRef | null;
}

/** A child's pick-up list; one per student. */
export interface SchoolPickup {
  appId: string;
  studentId: number;
  people: SchoolPickupPerson[];
  /** Who changed it last (a parent's name, or the school's). */
  updatedBy: string | null;
  updatedAt: Date;
}

/** "Today X picks up": one day's pick-up, one per student and day. */
export interface SchoolPickupNote {
  appId: string;
  studentId: number;
  date: string;
  name: string;
  relation: string | null;
  phone: string | null;
  note: string | null;
  /** Who wrote it (a parent's name, or the school's). */
  writtenBy: string | null;
  createdAt: Date;
}

// 113.12 Salaries, recorded by hand: written down as paid out and paid in, never through a payment gateway; nothing moves money.

/** 113.12 An allowance on a salary ("Transport"), as the school set it. */
export interface SchoolSalaryAllowance {
  name: string;
  cents: number;
}

/** 113.12 A teacher's or staff member's salary: the monthly amount, its currency and the allowances. */
export interface SchoolSalary {
  appId: string;
  personId: number;
  monthlyCents: number;
  currency: CatalogCurrency;
  allowances: SchoolSalaryAllowance[];
  note: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}

/** 113.12 How a payment or an advance was handed over (or paid back): cash, or a bank transfer the school made itself. */
export type SchoolPayMethod = "cash" | "bank";
export const SCHOOL_PAY_METHODS: readonly SchoolPayMethod[] = ["cash", "bank"];

/** 113.12 Money written down as handed over or paid back: the amount, how, the day, who recorded it, a note and a photo of the receipt. */
export interface SchoolPayRecord {
  /** A short random ID within its list. */
  id: string;
  cents: number;
  method: SchoolPayMethod;
  /** YYYY-MM-DD, the day it was handed over. */
  paidOn: string;
  note: string | null;
  /** A `salary_receipt` asset: only the school's dashboard sees it. */
  receiptAssetId: string | null;
  /** Who recorded it (the dashboard's user). */
  by: string;
  /** ISO, when it was recorded. */
  at: string;
}

export type SchoolPayslipLineKind = "bonus" | "deduction" | "advance";
/** Written by the office, or suggested from 113.2's absences and lateness, or an advance's instalment. */
export type SchoolPayslipLineSource = "office" | "absence" | "lateness" | "advance";
/** A suggestion waits for the office (not counted); accepted counts; dismissed is kept so it isn't suggested again. */
export type SchoolPayslipLineStatus = "suggested" | "accepted" | "dismissed";

/** 113.12 A line of the month's sheet beyond the base and allowances. */
export interface SchoolPayslipLine {
  id: string;
  kind: SchoolPayslipLineKind;
  source: SchoolPayslipLineSource;
  status: SchoolPayslipLineStatus;
  label: string;
  cents: number;
  /** What was suggested, kept when the office changed the amount. */
  suggestedCents: number | null;
  /** The absences or late days a suggestion counted. */
  count: number | null;
  /** The advance an instalment takes back. */
  advanceId: number | null;
}

/** 113.12 The month's days at work, from check-in (113.2), when the sheet was made. */
export interface SchoolPayslipAttendance {
  /** The person's working days in the whole month. */
  workingDays: number;
  /** Their school days counted so far (to the day the sheet was made). */
  days: number;
  present: number;
  late: number;
  leftEarly: number;
  absent: number;
  excused: number;
  leave: number;
}

/** draft: the office still changes it; final: locked, the person sees it in the app; paid: final and paid in full. */
export type SchoolPayslipStatus = "draft" | "final" | "paid";

/** 113.12 A person's sheet for a month: base, allowances, bonuses, deductions, advances taken back and the net; payments recorded on it. */
export interface SchoolPayslip {
  id: number;
  appId: string;
  /** No foreign key: a payslip stays when the person is removed, with their name. */
  personId: number;
  /** YYYY-MM. */
  month: string;
  personName: string;
  role: "teacher" | "staff";
  jobTitle: string | null;
  department: string | null;
  currency: CatalogCurrency;
  baseCents: number;
  allowances: SchoolSalaryAllowance[];
  lines: SchoolPayslipLine[];
  attendance: SchoolPayslipAttendance | null;
  netCents: number;
  status: SchoolPayslipStatus;
  payments: SchoolPayRecord[];
  paidCents: number;
  note: string | null;
  finalAt: Date | null;
  finalBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 113.12 A month locked: its sheets are final, none is made or changed until it's opened again. */
export interface SchoolSalaryMonth {
  appId: string;
  month: string;
  lockedAt: Date | null;
  lockedBy: string | null;
  updatedAt: Date;
}

/** 113.12 An advance handed over to a person, taken back from their payslips in instalments (or paid back at the office). */
export interface SchoolSalaryAdvance {
  id: number;
  appId: string;
  /** No foreign key, like a payslip's. */
  personId: number;
  personName: string;
  currency: CatalogCurrency;
  amountCents: number;
  /** Taken back each month from `startsMonth`. */
  instalmentCents: number;
  startsMonth: string;
  /** How it was handed over. */
  given: SchoolPayRecord;
  /** Paid back outside the payslips. */
  repayments: SchoolPayRecord[];
  createdAt: Date;
  updatedAt: Date;
}

/** 113.12 The deductions suggested from check-in; off until the school turns them on. A person in the office accepts or changes each one. */
export interface SchoolSalarySettings {
  /** Each absence without an excuse (approved leave and excused days aren't absences) suggests `days` of a day's pay. */
  absence: { on: boolean; days: number };
  /** Every `every` late arrivals (and leaving early, when `countEarly`) suggest `days` of a day's pay. */
  lateness: { on: boolean; every: number; days: number; countEarly: boolean };
  /** A day's pay: the base (and the allowances, when on) over the person's working days in the month. */
  dayPayWithAllowances: boolean;
}

// 113.9 Universities (a school in university mode, the uni_* tables)

/** A letter of the university's grading scale. */
export interface UniGrade {
  /** "A", "B+", "F", "W". */
  letter: string;
  /** 4.0 … 0. */
  points: number;
  /** The least percent that gives it; null: given by hand only (W, I). */
  minPercent: number | null;
  /** It counts in the GPA (a withdrawal doesn't). */
  gpa: boolean;
  /** It passes the course: its credits are earned and it meets a prerequisite. */
  passes: boolean;
}

/** The university's settings (uni_settings). */
export interface UniSettings {
  /** The school is a university: faculties, programs, registration each term, results by term. */
  enabled: boolean;
  scale: UniGrade[];
  /** The term the app and the dashboard open on; null: today's term, else the next one. */
  currentTermId: number | null;
  /** A full section takes a waiting list. */
  waitlist: boolean;
}

export interface UniFaculty {
  id: number;
  appId: string;
  name: string;
  code: string | null;
  createdAt: Date;
}

export interface UniDepartment {
  id: number;
  appId: string;
  facultyId: number;
  name: string;
  code: string | null;
  createdAt: Date;
}

/** A course of a program's study plan, in the year it is planned for. */
export interface UniPlanCourse {
  courseId: number;
  /** 1 … the program's years. */
  year: number;
  /** Elective when false. */
  required: boolean;
}

export interface UniProgram {
  id: number;
  appId: string;
  departmentId: number;
  name: string;
  code: string | null;
  /** "BSc", "BA", "MSc". */
  degree: string;
  creditsRequired: number;
  years: number;
  /** The least and the most credits a student takes in a term. */
  minTermCredits: number;
  maxTermCredits: number;
  plan: UniPlanCourse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UniCourse {
  id: number;
  appId: string;
  departmentId: number | null;
  /** "CS101", unique at the university. */
  code: string;
  title: string;
  credits: number;
  /** The codes of the courses passed first. */
  prerequisites: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A term of an academic year, with its registration window and its add/drop deadline. */
export interface UniTerm {
  id: number;
  appId: string;
  name: string;
  /** "2026/2027". */
  academicYear: string;
  startsOn: string;
  endsOn: string;
  /** Students register (add sections) from this day to `registrationCloses`. */
  registrationOpens: string;
  registrationCloses: string;
  /** The last day a section is dropped (and added after the advisor sends it back). */
  dropUntil: string;
  createdAt: Date;
}

/** A section's weekly lecture. */
export interface UniMeeting {
  /** 1 Monday … 7 Sunday. */
  weekday: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
}

/** A course taught in a term: its lecturer, seats and weekly lectures. */
export interface UniSection {
  id: number;
  appId: string;
  termId: number;
  courseId: number;
  /** "01". */
  code: string;
  /** A school teacher (school_people). */
  lecturerId: number | null;
  seats: number;
  meetings: UniMeeting[];
  /** Its grades are out to its students. */
  resultsPublishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A student's place at the university: their program and their advisor (a lecturer). */
export interface UniStudent {
  appId: string;
  studentId: number;
  programId: number | null;
  advisorId: number | null;
  /** The academic year they started, "2025/2026". */
  startYear: string | null;
  updatedAt: Date;
}

export type UniRegistrationStatus = "draft" | "submitted" | "approved" | "returned";
export const UNI_REGISTRATION_STATUSES: readonly UniRegistrationStatus[] = ["draft", "submitted", "approved", "returned"];

/** A student's registration for a term, approved or sent back by their advisor. */
export interface UniRegistration {
  appId: string;
  termId: number;
  studentId: number;
  status: UniRegistrationStatus;
  /** The advisor's note when they send it back. */
  note: string | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
  /** The advisor; null: the office. */
  decidedBy: number | null;
  updatedAt: Date;
}

/** pending: asked for, waiting for the advisor (its seat held); enrolled: approved or added by the office. */
export type UniEnrolmentStatus = "pending" | "enrolled" | "waitlisted" | "dropped";
export const UNI_ENROLMENT_STATUSES: readonly UniEnrolmentStatus[] = ["pending", "enrolled", "waitlisted", "dropped"];

/** A student in a section; one per section and student, with its grade. */
export interface UniEnrolment {
  id: number;
  appId: string;
  termId: number;
  sectionId: number;
  courseId: number;
  studentId: number;
  status: UniEnrolmentStatus;
  addedBy: "student" | "office";
  addedAt: Date;
  droppedAt: Date | null;
  /** A letter of the scale. */
  grade: string | null;
  /** The percent it came from, when the lecturer gave one. */
  mark: number | null;
  gradedAt: Date | null;
  updatedAt: Date;
}

/** A student's mark at a section's lecture on a day. */
export interface UniAttendance {
  appId: string;
  sectionId: number;
  studentId: number;
  date: string;
  status: SchoolAttendanceStatus;
  note: string | null;
  takenBy: number | null;
  updatedAt: Date;
}
