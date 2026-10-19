import type { Plan, PlanSetting } from "../plans";
import type { BuildConfig } from "../build-config/types";
import type { AppDefaultsSetting, Layout, LayoutContent } from "../pages/types";
import type { AdminRole } from "../admin/permissions";

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
    "status" | "customer" | "updatedAt" | "commissionCents" | "itemTransactionIds" | "payoutApprovedAt" | "fulfilmentStatus" | "paymentProvider" | "providerRef"
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

/** 37 Which of Yallapp's accounts takes plan payments and marketplace sales; unset: iyzico. */
export interface PaymentProviderSetting {
  provider: PaymentProviderId;
}

export interface PlatformSettingValues {
  otp: OtpSetting;
  smtp: SmtpSetting;
  iyzico: YallappIyzicoSetting;
  /** 37 Yallapp's Kashier and Fawaterk accounts, and which of its accounts takes payments. */
  kashier: YallappKashierSetting;
  fawaterk: YallappFawaterkSetting;
  paymentProvider: PaymentProviderSetting;
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
  /** As shown, like +90 544 673 19 42. */
  whatsapp: string;
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
export type BookClassFailure = "not_found" | "cancelled" | "too_late" | "full" | "membership_required" | "no_credits";

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
}

export type MembershipPatch = Partial<Pick<Membership, "status" | "endsAt" | "updatedAt">>;

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
  /** An optional link under the text. */
  linkUrl: string | null;
  linkLabel: string | null;
  /** Shown from this time, until `endsAt` when set. */
  startsAt: Date;
  endsAt: Date | null;
  /** When it was emailed to its audience, and to how many clients. */
  emailedAt: Date | null;
  emailedCount: number;
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
  | "api_check_failed";

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
}

export type DonationInput = Omit<Donation, "id">;

export type DonationPatch = Partial<Pick<Donation, "donorName" | "donorEmail" | "donorPhone" | "status" | "updatedAt" | "paymentProvider" | "providerRef">>;

/** How the app takes donations (`Config.donations`). */
export interface DonationSettings {
  currency: CatalogCurrency;
  /** "browser": the iPhone app's button opens the donation page in the browser; "off": no donate button on iPhone. */
  iosMode: "browser" | "off";
}
