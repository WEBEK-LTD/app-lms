import type {
  AppAuthKey,
  AppBackend,
  AppType,
  AppVertical,
  AssetKind,
  CatalogCurrency,
  CatalogFulfilment,
  CatalogOptionGroup,
  CatalogCustomer,
  CatalogOrderLine,
  CatalogOrderStatus,
  CatalogSettings,
  FulfilmentStatus,
  ConnectorConfig,
  HostedSettings,
  PlatformSettingKey,
  PlanPaymentStatus,
  PaymentProviderId,
  BookingSetup,
  CourseSetup,
  BookingStatus,
  IntakeAnswer,
  ClassBookingStatus,
  ClassSessionStatus,
  MembershipPeriod,
  PushPreferences,
  PushProvider,
  OwnerPushPreferences,
  ScheduledNotificationStatus,
  CourseQuestionStatus,
  MoreStoresRow,
  AuditChanges,
  OwnerNoticeKind,
  LinksCheckSnapshot,
  CrashIssueStatus,
  ApiWebhookEvent,
  ApiWebhookStatus,
  PaymentRefund,
  RefundKind,
  // 51 Media and storage
  MediaKind,
  MediaStatus,
  PaidStoragePack,
  PlanPaymentPurpose,
  // 73 Deleted apps and kept billing records
  AppDeletion,
  AppDeletionStatus,
  KeptBillingRecord,
  // 77 Chat
  ChatSettings,
  MediaSource,
  ChatMemberSource,
  ChatConversationKind,
  ChatSenderKind,
  ChatReportReason,
  ChatReportOutcome,
} from "../data/types";
// 11.6 and 11.8
import type { AnnouncementAudience, AnnouncementKind, AnnouncementSeverity, CouponDiscount, CouponRedemption } from "../data/types";
import type { Plan } from "../plans";
import type { Layout, LayoutContent } from "../pages/types";
import type { AdminRole } from "../admin/permissions";
import {
  type AnyMySqlColumn,
  bigint,
  boolean,
  double,
  customType,
  datetime,
  index,
  int,
  mediumtext,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import type { ListingInquiryStatus, ListingPurpose, ListingSettings, ListingStatus } from "../data/types";
// 23 News & blog
import type { ArticleStatus, NewsSettings } from "../data/types";
// 28 Events & tickets
import type { EventSettings, EventStatus, TicketStatus } from "../data/types";
// 29 Charity & donations
import type { CampaignStatus, DonationRecurring, DonationSettings, DonationStatus } from "../data/types";
// 44 Analytics
import type { AnalyticsEventType, AnalyticsItemKind, AnalyticsMetric } from "../analytics/types";
// 14.1 We publish for you
import type { PublishingChecklist, PublishingListing, PublishingMode, PublishingStatus, PublishingStore } from "../data/types";
import type { AppErrorSource, MilestoneKind, ProductDay, SignupSource, TeamAlertKind, WatchedJob } from "../data/types";

/**
 * MySQL schema (MySQL 8.0.13+ and MariaDB 10.3+, the usual cPanel servers).
 * JSON is stored as LONGTEXT and parsed in code, because MariaDB's JSON type
 * is an alias that mysql2 returns as a string. Times are UTC with milliseconds.
 */

const jsonText = <T>(name: string) =>
  customType<{ data: T; driverData: string }>({
    dataType: () => "longtext",
    toDriver: (value) => JSON.stringify(value),
    fromDriver: (value) => JSON.parse(value) as T,
  })(name);

const id = (name: string) => varchar(name, { length: 36 });
const time = (name: string) => datetime(name, { mode: "date", fsp: 3 });
/**
 * An auto-increment id. Not drizzle's serial(): its SQL ("serial AUTO_INCREMENT")
 * is a syntax error on MariaDB, which the production database runs.
 */
const autoId = (name: string) => bigint(name, { mode: "number", unsigned: true }).autoincrement();

export const users = mysqlTable(
  "users",
  {
    id: id("id").primaryKey(),
    email: varchar("email", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    sessionVersion: int("session_version").notNull().default(1),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    lastSignInAt: time("last_sign_in_at"),
    // 56 The dashboard's language this person chose ("en", "ar", "tr"); null until they choose one.
    language: varchar("language", { length: 8 }),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const clients = mysqlTable(
  "clients",
  {
    id: id("id").primaryKey(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    whatsapp: varchar("whatsapp", { length: 32 }).notNull(),
    siteUrl: varchar("site_url", { length: 255 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<"pending" | "active" | "suspended">(),
    paymentNote: text("payment_note"),
    activatedAt: time("activated_at"),
    // 52 The account's country: the currency Yallapp's prices are shown in.
    country: varchar("country", { length: 2 }),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("clients_user_unique").on(t.userId), index("clients_status_idx").on(t.status)],
);

/**
 * One license per app: its plan, end date and key (bound to one site).
 * `app_id` is null only for a license given before the account's first app
 * exists; creating that app takes it (and its plan payments).
 */
export const licenses = mysqlTable(
  "licenses",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    appId: id("app_id").references((): AnyMySqlColumn => apps.id, { onDelete: "cascade" }),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    keyEncrypted: text("key_encrypted").notNull(),
    keyLast4: varchar("key_last4", { length: 4 }).notNull(),
    plan: varchar("plan", { length: 16 }).notNull().$type<Plan>(),
    expiresAt: time("expires_at").notNull(),
    // 13.3 A downgrade that starts when the paid period ends.
    nextPlan: varchar("next_plan", { length: 16 }).$type<Plan>(),
    nextPlanAt: time("next_plan_at"),
    // 68 The end date the WordPress site was last asked to check at (once per end).
    endRefreshedFor: time("end_refreshed_for"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    index("licenses_client_idx").on(t.clientId),
    uniqueIndex("licenses_app_unique").on(t.appId),
    uniqueIndex("licenses_key_hash_unique").on(t.keyHash),
  ],
);

export const activations = mysqlTable("license_activations", {
  licenseId: id("license_id")
    .primaryKey()
    .references(() => licenses.id, { onDelete: "cascade" }),
  siteUrl: varchar("site_url", { length: 255 }).notNull(),
  siteUrlRaw: varchar("site_url_raw", { length: 2048 }).notNull(),
  pluginVersion: varchar("plugin_version", { length: 32 }).notNull(),
  wpVersion: varchar("wp_version", { length: 32 }),
  lms: varchar("lms", { length: 64 }),
  // 30 "" when the site has none, null when the plugin didn't say (before Phase 30).
  store: varchar("store", { length: 64 }),
  bookings: varchar("bookings", { length: 64 }),
  activatedAt: time("activated_at").notNull(),
  lastCheckedAt: time("last_checked_at").notNull(),
});

export const apps = mysqlTable(
  "apps",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    appType: varchar("app_type", { length: 16 }).notNull().$type<AppType>(),
    // 20 The kind of business (lib/app/kinds.ts); null for the engine's own wording.
    vertical: varchar("vertical", { length: 16 }).$type<AppVertical>(),
    siteUrl: varchar("site_url", { length: 255 }),
    backend: varchar("backend", { length: 20 }).notNull().default("wordpress").$type<AppBackend>(),
    apiBaseUrl: varchar("api_base_url", { length: 2048 }),
    setupRequestedAt: time("setup_requested_at"),
    setupNote: text("setup_note"),
    appName: varchar("app_name", { length: 60 }),
    shortName: varchar("short_name", { length: 24 }),
    iconAssetId: id("icon_asset_id"),
    logoAssetId: id("logo_asset_id"),
    primaryColor: varchar("primary_color", { length: 7 }).notNull(),
    splashColor: varchar("splash_color", { length: 7 }).notNull(),
    template: varchar("template", { length: 16 }).notNull().$type<"classic" | "bold" | "minimal">(),
    font: varchar("font", { length: 64 }).notNull(),
    // 33 The ready-made design the owner last started from (lib/pages/designs); null for none.
    design: varchar("design", { length: 40 }),
    androidPackage: varchar("android_package", { length: 150 }),
    iosBundleId: varchar("ios_bundle_id", { length: 155 }),
    storeTitle: varchar("store_title", { length: 60 }),
    shortDescription: varchar("short_description", { length: 160 }),
    fullDescription: text("full_description"),
    supportEmail: varchar("support_email", { length: 191 }),
    privacyUrl: varchar("privacy_url", { length: 2048 }),
    phoneScreenshotIds: jsonText<string[]>("phone_screenshot_ids").notNull().default(sql`('[]')`),
    iphoneScreenshotIds: jsonText<string[]>("iphone_screenshot_ids").notNull().default(sql`('[]')`),
    firebaseAndroidAssetId: id("firebase_android_asset_id"),
    firebaseIosAssetId: id("firebase_ios_asset_id"),
    connector: jsonText<ConnectorConfig>("connector"),
    hostedSettings: jsonText<HostedSettings>("hosted_settings"),
    catalogSettings: jsonText<CatalogSettings>("catalog_settings"),
    // 77 The chat's settings (null: on when the plan has chat, without course groups).
    chatSettings: jsonText<ChatSettings>("chat_settings"),
    bookingSetup: jsonText<BookingSetup>("booking_setup"),
    courseSetup: jsonText<CourseSetup>("course_setup"),
    firebaseServiceAccountEncrypted: text("firebase_service_account_encrypted"),
    googlePlayKeyEncrypted: text("google_play_key_encrypted"),
    googlePlayClientEmail: varchar("google_play_client_email", { length: 191 }),
    ascIssuerId: varchar("asc_issuer_id", { length: 64 }),
    ascKeyId: varchar("asc_key_id", { length: 32 }),
    ascPrivateKeyEncrypted: text("asc_private_key_encrypted"),
    androidUploadKeyEncrypted: text("android_upload_key_encrypted"),
    iosDistributionEncrypted: text("ios_distribution_encrypted"),
    // 35 Samsung Galaxy Store: content ID and Seller Portal service account (private key encrypted).
    galaxyContentId: varchar("galaxy_content_id", { length: 20 }),
    galaxyServiceAccountId: varchar("galaxy_service_account_id", { length: 64 }),
    galaxyKeyEncrypted: text("galaxy_key_encrypted"),
    // 36 Huawei AppGallery: app ID, Connect API client (secret encrypted), agconnect-services.json, Push Kit app secret (encrypted).
    huaweiAppId: varchar("huawei_app_id", { length: 20 }),
    huaweiClientId: varchar("huawei_client_id", { length: 64 }),
    huaweiClientSecretEncrypted: text("huawei_client_secret_encrypted"),
    huaweiAgconnectAssetId: id("huawei_agconnect_asset_id"),
    huaweiPushSecretEncrypted: text("huawei_push_secret_encrypted"),
    // 42 Xiaomi GetApps: the developer account's email, the API private key (encrypted), Xiaomi's public certificate, what's new.
    xiaomiUserName: varchar("xiaomi_user_name", { length: 254 }),
    xiaomiPasswordEncrypted: text("xiaomi_password_encrypted"),
    xiaomiCertificate: text("xiaomi_certificate"),
    xiaomiReleaseNotes: varchar("xiaomi_release_notes", { length: 500 }),
    // 46 Links that open the app: the Play App Signing key's SHA-256 (the owner enters it), the upload key's and the Apple
    // Team ID (the build pipeline reports them; the owner may enter the Team ID), and the last "Check links".
    playSigningSha256: varchar("play_signing_sha256", { length: 95 }),
    androidUploadSha256: varchar("android_upload_sha256", { length: 95 }),
    appleTeamId: varchar("apple_team_id", { length: 10 }),
    linksCheck: jsonText<LinksCheckSnapshot>("links_check"),
    // 46 The owner's switches: the store's own rating prompt after good moments, and crash reports.
    reviewPrompt: boolean("review_prompt").notNull().default(true),
    crashReports: boolean("crash_reports").notNull().default(true),
    // 47 The owner's time zone for Analytics; null: from the account's country.
    timeZone: varchar("time_zone", { length: 64 }),
    appTypeDoneAt: time("app_type_done_at"),
    websiteDoneAt: time("website_done_at"),
    brandingDoneAt: time("branding_done_at"),
    listingDoneAt: time("listing_done_at"),
    publishingDoneAt: time("publishing_done_at"),
    // 14.1 "self" or "managed" (we publish it for the client); null until they choose.
    publishingMode: varchar("publishing_mode", { length: 8 }).$type<PublishingMode>(),
    // 16 Demo apps: set by the admin's Demo apps page only; the build whose APK /demo offers.
    demo: boolean("demo").notNull().default(false),
    demoBuildId: id("demo_build_id"),
    // 73 Deleted by the owner (null: not deleted): left out of every read, purged after 7 days unless restored.
    deletedAt: time("deleted_at"),
    deletedBy: varchar("deleted_by", { length: 191 }),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  // An account can have several apps, listed oldest first.
  (t) => [index("apps_client_idx").on(t.clientId, t.createdAt), index("apps_deleted_idx").on(t.deletedAt)],
);

export const builds = mysqlTable(
  "builds",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    number: int("number").notNull(),
    versionName: varchar("version_name", { length: 32 }).notNull(),
    versionCode: int("version_code").notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<"queued" | "building" | "ready" | "failed">(),
    stages: jsonText<Record<string, string>>("stages").notNull(),
    config: jsonText<Record<string, unknown>>("config").notNull(),
    storeListing: jsonText<Record<string, string>>("store_listing").notNull(),
    autoPublish: boolean("auto_publish").notNull(),
    artifacts: jsonText<unknown[]>("artifacts").notNull(),
    message: text("message"),
    logUrl: varchar("log_url", { length: 2048 }),
    createdAt: time("created_at").notNull(),
    startedAt: time("started_at"),
    finishedAt: time("finished_at"),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    // Numbers and version codes go up per app.
    uniqueIndex("builds_app_number_unique").on(t.appId, t.number),
    index("builds_client_idx").on(t.clientId, t.createdAt),
    index("builds_status_idx").on(t.status, t.createdAt),
  ],
);

export const pluginReleases = mysqlTable(
  "plugin_releases",
  {
    id: id("id").primaryKey(),
    version: varchar("version", { length: 32 }).notNull(),
    changelog: text("changelog").notNull(),
    requiresWp: varchar("requires_wp", { length: 16 }).notNull(),
    requiresPhp: varchar("requires_php", { length: 16 }).notNull(),
    testedWp: varchar("tested_wp", { length: 16 }).notNull(),
    blobKey: varchar("blob_key", { length: 255 }).notNull(),
    size: int("size").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    published: boolean("published").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [uniqueIndex("plugin_releases_version_unique").on(t.version)],
);

export const assets = mysqlTable(
  "assets",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().$type<AssetKind>(),
    blobKey: varchar("blob_key", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 64 }).notNull(),
    size: int("size").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("assets_client_idx").on(t.clientId)],
);

export const resetTokens = mysqlTable(
  "password_reset_tokens",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: time("expires_at").notNull(),
    usedAt: time("used_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("reset_tokens_user_idx").on(t.userId)],
);

export const rateLimits = mysqlTable("rate_limits", {
  bucket: varchar("bucket", { length: 191 }).primaryKey(),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
  hits: int("hits").notNull(),
  updatedAt: time("updated_at").notNull(),
});

// Hosted API (apps with backend "hosted"): the apps' customers, their devices
// and sign-ins, and the notifications sent to them.

export const hostedUsers = mysqlTable(
  "hosted_users",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    // 18 Null for someone who signed up by email.
    phone: varchar("phone", { length: 20 }),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }),
    city: varchar("city", { length: 120 }),
    notificationsReadAt: time("notifications_read_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("hosted_users_phone_unique").on(t.appId, t.phone),
    index("hosted_users_email_idx").on(t.appId, t.email),
    // 61 New users of the day, counted by the database.
    index("hosted_users_created_idx").on(t.appId, t.createdAt),
  ],
);

export const hostedDevices = mysqlTable(
  "hosted_devices",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 64 }).notNull(),
    platform: varchar("platform", { length: 8 }).notNull().$type<"android" | "ios">(),
    name: varchar("name", { length: 100 }).notNull(),
    appVersion: varchar("app_version", { length: 20 }).notNull(),
    pushToken: varchar("push_token", { length: 512 }),
    // 36 Which service the token is from: Firebase ("fcm") or Huawei Push Kit ("hms").
    pushProvider: varchar("push_provider", { length: 4 }).notNull().default("fcm").$type<PushProvider>(),
    pushPreferences: jsonText<PushPreferences>("push_preferences"),
    createdAt: time("created_at").notNull(),
    lastSeenAt: time("last_seen_at").notNull(),
  },
  (t) => [uniqueIndex("hosted_devices_unique").on(t.userId, t.deviceId), index("hosted_devices_app_idx").on(t.appId)],
);

// 34 The keys that sign an own API app's access tokens when Yallapp signs people in.
export const appAuthKeys = mysqlTable(
  "app_auth_keys",
  {
    kid: varchar("kid", { length: 64 }).primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    alg: varchar("alg", { length: 10 }).notNull().$type<"ES256">(),
    publicJwk: jsonText<AppAuthKey["publicJwk"]>("public_jwk").notNull(),
    privateKeyEncrypted: text("private_key_encrypted"),
    createdAt: time("created_at").notNull(),
    retiredAt: time("retired_at"),
  },
  (t) => [index("app_auth_keys_app_idx").on(t.appId, t.createdAt)],
);

export const hostedRefreshTokens = mysqlTable(
  "hosted_refresh_tokens",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    deviceRowId: id("device_row_id")
      .notNull()
      .references(() => hostedDevices.id, { onDelete: "cascade" }),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("hosted_refresh_tokens_device_idx").on(t.deviceRowId)],
);

export const hostedChallenges = mysqlTable(
  "hosted_challenges",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 8 }).notNull().$type<"otp" | "signup">(),
    phone: varchar("phone", { length: 20 }),
    // 18 Email sign-in.
    email: varchar("email", { length: 191 }),
    codeHash: varchar("code_hash", { length: 64 }),
    attempts: int("attempts").notNull(),
    review: boolean("review").notNull(),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("hosted_challenges_expires_idx").on(t.expiresAt)],
);

export const hostedNotifications = mysqlTable(
  "hosted_notifications",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    // 23 Breaking news: the article it opens.
    articleId: varchar("article_id", { length: 64 }),
    // 28 An event that changed or was cancelled, told to its ticket holders.
    eventId: bigint("event_id", { mode: "number", unsigned: true }),
    // 29 A campaign update: the campaign it opens.
    campaignId: bigint("campaign_id", { mode: "number", unsigned: true }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("hosted_notifications_app_idx").on(t.appId, t.createdAt)],
);

// Catalog: products managed in the dashboard for apps without a website.

export const catalogCategories = mysqlTable(
  "catalog_categories",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    position: int("position").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("catalog_categories_app_idx").on(t.appId)],
);

export const catalogProducts = mysqlTable(
  "catalog_products",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull(),
    priceCents: bigint("price_cents", { mode: "number", unsigned: true }).notNull(),
    salePriceCents: bigint("sale_price_cents", { mode: "number", unsigned: true }),
    categoryIds: jsonText<number[]>("category_ids").notNull(),
    imageAssetIds: jsonText<string[]>("image_asset_ids").notNull(),
    stock: int("stock"),
    digital: boolean("digital").notNull(),
    featured: boolean("featured").notNull(),
    active: boolean("active").notNull(),
    sku: varchar("sku", { length: 64 }),
    // 26 A dish's choices (size, extras), as JSON; null for none.
    optionGroups: jsonText<CatalogOptionGroup[]>("option_groups"),
    salesCount: int("sales_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("catalog_products_app_idx").on(t.appId, t.createdAt)],
);

export const catalogOrders = mysqlTable(
  "catalog_orders",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "set null" }),
    status: varchar("status", { length: 16 }).notNull().$type<CatalogOrderStatus>(),
    lines: jsonText<CatalogOrderLine[]>("lines").notNull(),
    subtotalCents: bigint("subtotal_cents", { mode: "number", unsigned: true }).notNull(),
    shippingCents: bigint("shipping_cents", { mode: "number", unsigned: true }).notNull(),
    totalCents: bigint("total_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    customer: jsonText<CatalogCustomer>("customer"),
    paymentId: varchar("payment_id", { length: 64 }),
    createdAt: time("created_at").notNull(),
    paidAt: time("paid_at"),
    updatedAt: time("updated_at").notNull(),
    commissionCents: bigint("commission_cents", { mode: "number", unsigned: true }),
    itemTransactionIds: jsonText<string[]>("item_transaction_ids"),
    payoutApprovedAt: time("payout_approved_at"),
    // 26 A restaurant's order: pickup or delivery (JSON) and where it is in the kitchen; null for other orders.
    fulfilment: jsonText<CatalogFulfilment>("fulfilment"),
    fulfilmentStatus: varchar("fulfilment_status", { length: 24 }).$type<FulfilmentStatus>(),
    // 37 Who takes the payment (null: iyzico) and its reference there (Kashier's session, Fawaterk's invoice).
    paymentProvider: varchar("payment_provider", { length: 16 }).$type<PaymentProviderId>(),
    providerRef: varchar("provider_ref", { length: 191 }),
    // 47 What was refunded so far (payment_refunds).
    refundedCents: bigint("refunded_cents", { mode: "number", unsigned: true }).notNull().default(0),
  },
  (t) => [
    uniqueIndex("catalog_orders_token_unique").on(t.tokenHash),
    index("catalog_orders_app_idx").on(t.appId, t.createdAt),
    index("catalog_orders_user_idx").on(t.appId, t.userId),
    // 61 The day's paid orders, summed by the database.
    index("catalog_orders_paid_idx").on(t.appId, t.paidAt),
  ],
);

/** Settings the team edits in the admin; secrets inside `value` are encrypted. */
export const platformSettings = mysqlTable("platform_settings", {
  key: varchar("setting_key", { length: 32 }).primaryKey().$type<PlatformSettingKey>(),
  value: jsonText<unknown>("value").notNull(),
  updatedAt: time("updated_at").notNull(),
  updatedBy: varchar("updated_by", { length: 191 }).notNull(),
});

/** Clients paying an app's plan by card (Yallapp's account: iyzico, 37 Kashier or Fawaterk). */
export const planPayments = mysqlTable(
  "plan_payments",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** The app whose plan it pays; null for a payment before the account's first app (creating it fills this in). */
    appId: id("app_id").references(() => apps.id, { onDelete: "set null" }),
    plan: varchar("plan", { length: 16 }).notNull().$type<Plan>(),
    months: int("months").notNull().$type<1 | 12>(),
    amountCents: bigint("amount_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    status: varchar("status", { length: 16 }).notNull().$type<PlanPaymentStatus>(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    paymentId: varchar("payment_id", { length: 64 }),
    createdAt: time("created_at").notNull(),
    paidAt: time("paid_at"),
    // 37 Who takes the payment (null: iyzico) and its reference there.
    paymentProvider: varchar("payment_provider", { length: 16 }).$type<PaymentProviderId>(),
    providerRef: varchar("provider_ref", { length: 191 }),
    // 52 The price as the client saw it, when another currency than the charge (dollars outside Egypt).
    shownCents: bigint("shown_cents", { mode: "number", unsigned: true }),
    shownCurrency: varchar("shown_currency", { length: 3 }).$type<CatalogCurrency>(),
    // 51 A plan (with the storage packs renewed with it) or storage packs only (null: a plan).
    purpose: varchar("purpose", { length: 8 }).$type<PlanPaymentPurpose>(),
    storagePacks: jsonText<PaidStoragePack[]>("storage_packs"),
  },
  (t) => [
    uniqueIndex("plan_payments_token_unique").on(t.tokenHash),
    index("plan_payments_client_idx").on(t.clientId, t.createdAt),
    index("plan_payments_app_idx").on(t.appId, t.createdAt),
  ],
);

/** Appointments of apps whose bookings are managed in the dashboard. */
export const bookingAppointments = mysqlTable(
  "booking_appointments",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "set null" }),
    serviceId: int("service_id").notNull(),
    staffId: int("staff_id").notNull(),
    serviceName: varchar("service_name", { length: 120 }).notNull(),
    staffName: varchar("staff_name", { length: 120 }).notNull(),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    // 19 Someone who signed in by email has no phone: their email is kept instead.
    customerPhone: varchar("customer_phone", { length: 24 }),
    customerEmail: varchar("customer_email", { length: 191 }),
    startAt: time("start_at").notNull(),
    endAt: time("end_at").notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<BookingStatus>(),
    priceCents: bigint("price_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    notes: text("notes"),
    // 21 A clinic's intake answers (health data): never in emails or notifications.
    answers: jsonText<IntakeAnswer[]>("answers_json"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    index("booking_appointments_app_start_idx").on(t.appId, t.startAt),
    index("booking_appointments_user_idx").on(t.appId, t.userId, t.startAt),
  ],
);

/** 27 Group classes made from the weekly timetable (apps.booking_setup.classTemplates), one row per class so spots are counted and locked. */
export const classSessions = mysqlTable(
  "class_sessions",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    templateId: int("template_id"),
    serviceId: int("service_id").notNull(),
    staffId: int("staff_id").notNull(),
    serviceName: varchar("service_name", { length: 120 }).notNull(),
    staffName: varchar("staff_name", { length: 120 }).notNull(),
    startAt: time("start_at").notNull(),
    endAt: time("end_at").notNull(),
    capacity: int("capacity").notNull(),
    // Spots taken: raised only by a conditional update below the capacity.
    bookedCount: int("booked_count").notNull().default(0),
    status: varchar("status", { length: 16 }).notNull().$type<ClassSessionStatus>(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("class_sessions_template_start_unique").on(t.appId, t.templateId, t.startAt), index("class_sessions_app_start_idx").on(t.appId, t.startAt)],
);

/** 27 Customers' spots in classes: one row per class and customer. */
export const classBookings = mysqlTable(
  "class_bookings",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    sessionId: bigint("session_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => classSessions.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "set null" }),
    membershipId: bigint("membership_id", { mode: "number", unsigned: true }),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 24 }),
    customerEmail: varchar("customer_email", { length: 191 }),
    status: varchar("status", { length: 16 }).notNull().$type<ClassBookingStatus>(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("class_bookings_session_user_unique").on(t.sessionId, t.userId), index("class_bookings_user_idx").on(t.appId, t.userId)],
);

/** 27 Customers' memberships of a gym or studio. */
export const memberships = mysqlTable(
  "memberships",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    planId: int("plan_id").notNull(),
    planName: varchar("plan_name", { length: 120 }).notNull(),
    period: varchar("period", { length: 16 }).notNull().$type<MembershipPeriod>(),
    creditsLeft: int("credits_left"),
    status: varchar("status", { length: 16 }).notNull().$type<"active" | "cancelled">(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at"),
    orderId: bigint("order_id", { mode: "number", unsigned: true }),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    // 63 A hash of the member code (lib/bookings/member-codes.ts), so a typed code is one indexed lookup; set when the code is first shown or used.
    codeHash: varchar("code_hash", { length: 32 }),
    // 64 A freeze (lib/bookings/freeze.ts): from the start of a gym's day until the start of the day it's back (null: until unfrozen).
    frozenFrom: time("frozen_from"),
    frozenUntil: time("frozen_until"),
  },
  (t) => [
    index("memberships_user_idx").on(t.appId, t.userId),
    uniqueIndex("memberships_order_unique").on(t.orderId),
    index("memberships_code_idx").on(t.appId, t.codeHash),
  ],
);

/** Students of courses managed in the dashboard. */
export const courseEnrollments = mysqlTable(
  "course_enrollments",
  {
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    courseId: int("course_id").notNull(),
    source: varchar("source", { length: 16 }).notNull().$type<"free" | "paid" | "manual">(),
    enrolledAt: time("enrolled_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.appId, t.userId, t.courseId] }), index("course_enrollments_course_idx").on(t.appId, t.courseId)],
);

export const lessonProgress = mysqlTable(
  "lesson_progress",
  {
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    courseId: int("course_id").notNull(),
    lessonId: int("lesson_id").notNull(),
    positionSeconds: int("position_seconds").notNull(),
    completedAt: time("completed_at"),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.appId, t.userId, t.lessonId] }), index("lesson_progress_course_idx").on(t.appId, t.userId, t.courseId)],
);

// 10.7 Listings: property listings of Real estate apps, managed in the dashboard.

export const listings = mysqlTable(
  "listings",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    reference: varchar("reference", { length: 40 }),
    title: varchar("title", { length: 150 }).notNull(),
    description: text("description").notNull(),
    purpose: varchar("purpose", { length: 8 }).notNull().$type<ListingPurpose>(),
    type: varchar("type", { length: 24 }).notNull(),
    priceCents: bigint("price_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    pricePeriod: varchar("price_period", { length: 8 }).$type<"month" | "year">(),
    negotiable: boolean("negotiable").notNull(),
    city: varchar("city", { length: 80 }).notNull(),
    district: varchar("district", { length: 80 }),
    address: varchar("address", { length: 200 }),
    latitude: double("latitude"),
    longitude: double("longitude"),
    area: double("area"),
    bedrooms: int("bedrooms"),
    bathrooms: int("bathrooms"),
    floor: int("floor"),
    yearBuilt: int("year_built"),
    furnished: boolean("furnished"),
    features: jsonText<string[]>("features").notNull(),
    imageAssetIds: jsonText<string[]>("image_asset_ids").notNull(),
    videoUrl: varchar("video_url", { length: 500 }),
    featured: boolean("featured").notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<ListingStatus>(),
    publishedAt: time("published_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("listings_app_idx").on(t.appId, t.status, t.createdAt)],
);

// 23 News & blog apps: articles written in the dashboard.

export const articleCategories = mysqlTable(
  "article_categories",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    position: int("position").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("article_categories_app_idx").on(t.appId, t.position)],
);

export const articles = mysqlTable(
  "articles",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    excerpt: varchar("excerpt", { length: 400 }),
    body: mediumtext("body").notNull(),
    imageAssetId: id("image_asset_id"),
    author: varchar("author", { length: 80 }),
    categoryIds: jsonText<number[]>("category_ids").notNull(),
    featured: boolean("featured").notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<ArticleStatus>(),
    publishedAt: time("published_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("articles_app_idx").on(t.appId, t.status, t.publishedAt)],
);

/** How articles show in the app (Config.news), one row per app. */
export const newsSettings = mysqlTable("news_settings", {
  appId: id("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  settings: jsonText<NewsSettings>("settings").notNull(),
  updatedAt: time("updated_at").notNull(),
});

// 28 Events & tickets apps: events, ticket types and tickets managed in the dashboard.

export const events = mysqlTable(
  "events",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 150 }).notNull(),
    description: mediumtext("description").notNull(),
    category: varchar("category", { length: 60 }),
    imageAssetIds: jsonText<string[]>("image_asset_ids").notNull(),
    startAt: time("start_at").notNull(),
    endAt: time("end_at").notNull(),
    venueName: varchar("venue_name", { length: 150 }),
    venueAddress: varchar("venue_address", { length: 250 }),
    latitude: double("latitude"),
    longitude: double("longitude"),
    onlineUrl: varchar("online_url", { length: 500 }),
    organiser: varchar("organiser", { length: 120 }),
    capacity: int("capacity"),
    status: varchar("status", { length: 16 }).notNull().$type<EventStatus>(),
    publishedAt: time("published_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("events_app_idx").on(t.appId, t.status, t.startAt)],
);

export const eventTicketTypes = mysqlTable(
  "event_ticket_types",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    eventId: bigint("event_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    priceCents: bigint("price_cents", { mode: "number", unsigned: true }).notNull(),
    capacity: int("capacity"),
    saleEndsAt: time("sale_ends_at"),
    maxPerOrder: int("max_per_order").notNull(),
    position: int("position").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("event_ticket_types_event_idx").on(t.eventId, t.position)],
);

export const eventTickets = mysqlTable(
  "event_tickets",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    eventId: bigint("event_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketTypeId: bigint("ticket_type_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => eventTicketTypes.id, { onDelete: "cascade" }),
    // The holder keeps their ticket's record for the organiser after deleting their account.
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "set null" }),
    orderId: bigint("order_id", { mode: "number", unsigned: true }).references(() => catalogOrders.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 16 }).notNull(),
    holderName: varchar("holder_name", { length: 80 }).notNull(),
    priceCents: bigint("price_cents", { mode: "number", unsigned: true }).notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<TicketStatus>(),
    holdUntil: time("hold_until"),
    usedAt: time("used_at"),
    cancelledAt: time("cancelled_at"),
    createdAt: time("created_at").notNull(),
    // 47 Cancelled because the organiser refunded it.
    refundedAt: time("refunded_at"),
  },
  (t) => [
    uniqueIndex("event_tickets_code_unique").on(t.code),
    index("event_tickets_event_idx").on(t.eventId, t.ticketTypeId, t.status),
    index("event_tickets_user_idx").on(t.appId, t.userId),
    index("event_tickets_order_idx").on(t.orderId),
    // 61 Tickets issued and checked in during the day, counted by the database.
    index("event_tickets_created_idx").on(t.appId, t.createdAt),
    index("event_tickets_used_idx").on(t.appId, t.usedAt),
  ],
);

/** How events show and sell in the app (Config.events), one row per app. */
export const eventSettings = mysqlTable("event_settings", {
  appId: id("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  settings: jsonText<EventSettings>("settings").notNull(),
  updatedAt: time("updated_at").notNull(),
});

// 29 Charity & donations apps: campaigns and donations managed in the dashboard.

export const campaigns = mysqlTable(
  "campaigns",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    summary: varchar("summary", { length: 300 }),
    story: mediumtext("story").notNull(),
    imageAssetIds: jsonText<string[]>("image_asset_ids").notNull(),
    goalCents: bigint("goal_cents", { mode: "number", unsigned: true }),
    presetCents: jsonText<number[]>("preset_cents").notNull(),
    allowCustomAmount: boolean("allow_custom_amount").notNull(),
    minCents: bigint("min_cents", { mode: "number", unsigned: true }).notNull(),
    endsAt: time("ends_at"),
    status: varchar("status", { length: 16 }).notNull().$type<CampaignStatus>(),
    featured: boolean("featured").notNull(),
    // Confirmed donations only, added in the same transaction that marks one paid.
    raisedCents: bigint("raised_cents", { mode: "number", unsigned: true }).notNull().default(0),
    donorCount: int("donor_count").notNull().default(0),
    publishedAt: time("published_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("campaigns_app_idx").on(t.appId, t.status, t.publishedAt)],
);

export const donations = mysqlTable(
  "donations",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    campaignId: bigint("campaign_id", { mode: "number", unsigned: true }).references(() => campaigns.id, { onDelete: "set null" }),
    campaignTitle: varchar("campaign_title", { length: 120 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    receiptCode: varchar("receipt_code", { length: 48 }).notNull(),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "set null" }),
    amountCents: bigint("amount_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    recurring: varchar("recurring", { length: 16 }).notNull().$type<DonationRecurring>(),
    anonymous: boolean("anonymous").notNull(),
    message: varchar("message", { length: 280 }),
    donorName: varchar("donor_name", { length: 80 }),
    donorEmail: varchar("donor_email", { length: 191 }),
    donorPhone: varchar("donor_phone", { length: 24 }),
    status: varchar("status", { length: 16 }).notNull().$type<DonationStatus>(),
    paymentId: varchar("payment_id", { length: 64 }),
    createdAt: time("created_at").notNull(),
    paidAt: time("paid_at"),
    updatedAt: time("updated_at").notNull(),
    // 37 Who takes the payment (null: iyzico) and its reference there.
    paymentProvider: varchar("payment_provider", { length: 16 }).$type<PaymentProviderId>(),
    providerRef: varchar("provider_ref", { length: 191 }),
    // 47 What was refunded so far (payment_refunds).
    refundedCents: bigint("refunded_cents", { mode: "number", unsigned: true }).notNull().default(0),
  },
  (t) => [
    uniqueIndex("donations_token_unique").on(t.tokenHash),
    uniqueIndex("donations_receipt_unique").on(t.receiptCode),
    index("donations_app_idx").on(t.appId, t.status, t.createdAt),
    index("donations_campaign_idx").on(t.campaignId, t.donorEmail),
    index("donations_user_idx").on(t.appId, t.userId),
    // 61 The day's donations, summed by the database.
    index("donations_paid_idx").on(t.appId, t.paidAt),
  ],
);

/** How the app takes donations (Config.donations), one row per app. */
export const donationSettings = mysqlTable("donation_settings", {
  appId: id("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  settings: jsonText<DonationSettings>("settings").notNull(),
  updatedAt: time("updated_at").notNull(),
});

/** The office's settings (Config.listings), one row per app. */
export const listingSettings = mysqlTable("listing_settings", {
  appId: id("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  settings: jsonText<ListingSettings>("settings").notNull(),
  updatedAt: time("updated_at").notNull(),
});

export const listingFavorites = mysqlTable(
  "listing_favorites",
  {
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    listingId: bigint("listing_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.appId, t.userId, t.listingId] }), index("listing_favorites_user_idx").on(t.appId, t.userId, t.createdAt)],
);

export const listingInquiries = mysqlTable(
  "listing_inquiries",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    listingId: bigint("listing_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 8 }).notNull().$type<ListingInquiryStatus>(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    index("listing_inquiries_app_idx").on(t.appId, t.updatedAt),
    index("listing_inquiries_user_idx").on(t.appId, t.userId, t.updatedAt),
  ],
);

export const listingInquiryMessages = mysqlTable(
  "listing_inquiry_messages",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    inquiryId: bigint("inquiry_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => listingInquiries.id, { onDelete: "cascade" }),
    from: varchar("sender", { length: 8 }).notNull().$type<"user" | "office">(),
    text: text("text").notNull(),
    readAt: time("read_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("listing_inquiry_messages_inquiry_idx").on(t.inquiryId, t.createdAt)],
);

// 10.4 Pages, looks and languages

/** An app's pages, tabs, look and languages: the dashboard's draft and the published copy (AppLayoutRecord). */
export const appLayouts = mysqlTable("app_layouts", {
  appId: id("app_id")
    .primaryKey()
    .references(() => apps.id, { onDelete: "cascade" }),
  draft: jsonText<LayoutContent>("draft").notNull(),
  draftUpdatedAt: time("draft_updated_at").notNull(),
  published: jsonText<Layout>("published"),
  publishedAt: time("published_at"),
  publishedBy: varchar("published_by", { length: 191 }),
  publishCount: int("publish_count").notNull().default(0),
});

// 11.7 Admin team and audit log

/** The WEBEK team in the super admin pages, besides SUPER_ADMIN_EMAILS (always owners). */
export const adminMembers = mysqlTable("admin_members", {
  userId: id("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull().$type<AdminRole>(),
  addedBy: varchar("added_by", { length: 191 }).notNull(),
  addedAt: time("added_at").notNull(),
  updatedAt: time("updated_at").notNull(),
});

/**
 * Every change made in the admin. No foreign keys: entries outlive the
 * people and clients they name. `changes` never holds secret values.
 */
export const adminAuditLog = mysqlTable(
  "admin_audit_log",
  {
    id: autoId("id").primaryKey(),
    at: time("at").notNull(),
    actorId: id("actor_id"),
    actorEmail: varchar("actor_email", { length: 191 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 64 }),
    clientId: id("client_id"),
    summary: varchar("summary", { length: 500 }).notNull(),
    changes: jsonText<AuditChanges>("changes"),
  },
  (t) => [
    index("admin_audit_log_at_idx").on(t.at),
    index("admin_audit_log_actor_idx").on(t.actorEmail, t.at),
    index("admin_audit_log_action_idx").on(t.action, t.at),
    index("admin_audit_log_target_idx").on(t.targetType, t.targetId),
    index("admin_audit_log_client_idx").on(t.clientId, t.at),
  ],
);


// 11.3 Website content

/** The team's edits of yallapp.com.tr's texts, one row per page or section. */
export const siteContent = mysqlTable("site_content", {
  key: varchar("content_key", { length: 64 }).primaryKey(),
  fields: jsonText<Record<string, string>>("fields").notNull(),
  updatedAt: time("updated_at").notNull(),
  updatedBy: varchar("updated_by", { length: 191 }).notNull(),
});

// 11.4 Email templates

/** The team's edits of the emails the platform sends, one row per email. */
export const emailTemplates = mysqlTable("email_templates", {
  key: varchar("template_key", { length: 64 }).primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  updatedAt: time("updated_at").notNull(),
  updatedBy: varchar("updated_by", { length: 191 }).notNull(),
});

// 11.6 Coupons

export const coupons = mysqlTable(
  "coupons",
  {
    id: id("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    note: varchar("note", { length: 200 }).notNull(),
    discount: jsonText<CouponDiscount>("discount").notNull(),
    plans: jsonText<Plan[] | null>("plans"),
    periods: jsonText<(1 | 12)[] | null>("periods"),
    validFrom: time("valid_from"),
    validUntil: time("valid_until"),
    maxRedemptions: int("max_redemptions"),
    maxPerClient: int("max_per_client"),
    firstPaymentOnly: boolean("first_payment_only").notNull(),
    active: boolean("active").notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    createdBy: varchar("created_by", { length: 191 }).notNull(),
  },
  (t) => [uniqueIndex("coupons_code_unique").on(t.code)],
);

/** Coupons used on plan payments. */
export const couponRedemptions = mysqlTable(
  "coupon_redemptions",
  {
    paymentId: id("payment_id")
      .primaryKey()
      .references(() => planPayments.id, { onDelete: "cascade" }),
    couponId: id("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 40 }).notNull(),
    plan: varchar("plan", { length: 16 }).notNull().$type<Plan>(),
    fullCents: bigint("full_cents", { mode: "number", unsigned: true }).notNull(),
    discountCents: bigint("discount_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    status: varchar("status", { length: 16 }).notNull().$type<CouponRedemption["status"]>(),
    createdAt: time("created_at").notNull(),
    redeemedAt: time("redeemed_at"),
  },
  (t) => [index("coupon_redemptions_coupon_idx").on(t.couponId, t.createdAt), index("coupon_redemptions_client_idx").on(t.clientId, t.couponId)],
);

// 11.8 Announcements

export const announcements = mysqlTable(
  "announcements",
  {
    id: id("id").primaryKey(),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    audience: jsonText<AnnouncementAudience>("audience").notNull(),
    severity: varchar("severity", { length: 16 }).notNull().$type<AnnouncementSeverity>(),
    // 57 Its chip in the dashboard's bell, whether it is also a banner, and the Arabic and Turkish texts.
    kind: varchar("kind", { length: 16 }).notNull().default("announcement").$type<AnnouncementKind>(),
    showAsBanner: boolean("show_as_banner").notNull().default(true),
    titleAr: varchar("title_ar", { length: 120 }),
    bodyAr: text("body_ar"),
    titleTr: varchar("title_tr", { length: 120 }),
    bodyTr: text("body_tr"),
    linkUrl: varchar("link_url", { length: 500 }),
    linkLabel: varchar("link_label", { length: 60 }),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at"),
    emailedAt: time("emailed_at"),
    emailedCount: int("emailed_count").notNull().default(0),
    // 61 When it went to the owners' phones (at creation when live, else when it started).
    pushedAt: time("pushed_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    createdBy: varchar("created_by", { length: 191 }).notNull(),
  },
  (t) => [index("announcements_starts_idx").on(t.startsAt)],
);

/** Announcements a client closed on their dashboard. */
export const announcementDismissals = mysqlTable(
  "announcement_dismissals",
  {
    announcementId: id("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    dismissedAt: time("dismissed_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.announcementId] })],
);

/**
 * 57 What each person has read in the dashboard's bell ("Notifications from
 * Yallapp"): per user, not per client, so everyone who opens a client's
 * dashboard (our team too) has their own. `item` is the bell's key of what
 * was read: `announcement:<id>`, or one of the account's own items
 * (`notice:<id>`, `build:<id>`, `payment:<id>`); an announcement's reads are
 * deleted with it. Separate from closing a banner (`announcement_dismissals`).
 */
export const updateReads = mysqlTable(
  "update_reads",
  {
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    item: varchar("item", { length: 64 }).notNull(),
    readAt: time("read_at").notNull(),
  },
  // The item's own index: deleting an announcement deletes its reads.
  (t) => [primaryKey({ columns: [t.userId, t.item] }), index("update_reads_item_idx").on(t.item)],
);

// 14.1 We publish for you

/**
 * An app the client asked us to publish, one row per app: their checklist,
 * the extra listing details, and the status on each store. No passwords:
 * clients invite our team email to their own store accounts.
 */
export const publishingRequests = mysqlTable(
  "publishing_requests",
  {
    appId: id("app_id")
      .primaryKey()
      .references(() => apps.id, { onDelete: "cascade" }),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    mode: varchar("mode", { length: 8 }).notNull().$type<PublishingMode>(),
    firebaseBy: varchar("firebase_by", { length: 8 }).notNull().$type<"client" | "team">(),
    checklist: jsonText<PublishingChecklist>("checklist").notNull(),
    listing: jsonText<PublishingListing>("listing").notNull(),
    androidStatus: varchar("android_status", { length: 16 }).notNull().$type<PublishingStatus>(),
    androidNote: text("android_note"),
    androidStoreUrl: varchar("android_store_url", { length: 2048 }),
    androidUpdatedAt: time("android_updated_at"),
    iosStatus: varchar("ios_status", { length: 16 }).notNull().$type<PublishingStatus>(),
    iosNote: text("ios_note"),
    iosStoreUrl: varchar("ios_store_url", { length: 2048 }),
    iosUpdatedAt: time("ios_updated_at"),
    // 35, 36 Samsung Galaxy Store and Huawei AppGallery, when the client wants the app there too.
    moreStores: jsonText<MoreStoresRow>("more_stores"),
    teamNotes: text("team_notes"),
    requestedAt: time("requested_at"),
    readyAt: time("ready_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("publishing_requests_queue_idx").on(t.mode, t.requestedAt)],
);

/** Each status change on a store, for the history the client and the team see. */
export const publishingEvents = mysqlTable(
  "publishing_events",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    // 19 Also "mode" with the mode chosen ("managed" or "self") as the status.
    store: varchar("store", { length: 8 }).notNull().$type<PublishingStore | "mode">(),
    status: varchar("status", { length: 16 }).notNull().$type<PublishingStatus | PublishingMode>(),
    note: text("note"),
    actorEmail: varchar("actor_email", { length: 191 }).notNull(),
    at: time("at").notNull(),
  },
  (t) => [index("publishing_events_app_idx").on(t.appId, t.at)],
);

// 13 Plans, limits and owner notices: what the dashboard and emails tell an app's owner.
export const ownerNotices = mysqlTable(
  "owner_notices",
  {
    id: autoId("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull().$type<OwnerNoticeKind>(),
    dedupeKey: varchar("dedupe_key", { length: 100 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    linkUrl: varchar("link_url", { length: 500 }),
    linkLabel: varchar("link_label", { length: 60 }),
    tone: varchar("tone", { length: 8 }).notNull().$type<"info" | "warn">(),
    createdAt: time("created_at").notNull(),
    emailedAt: time("emailed_at"),
    dismissedAt: time("dismissed_at"),
    resolvedAt: time("resolved_at"),
  },
  (t) => [uniqueIndex("owner_notices_app_key_unique").on(t.appId, t.dedupeKey), index("owner_notices_client_idx").on(t.clientId, t.createdAt)],
);

// 44 Analytics for app owners: raw usage events for 90 days (72: 40 before; never
// an IP or a search text), and daily totals for as long as the app's plan keeps
// them (72, lib/analytics/retention.ts), at most until the app is deleted.

export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    installId: varchar("install_id", { length: 36 }).notNull(),
    type: varchar("type", { length: 16 }).notNull().$type<AnalyticsEventType>(),
    at: time("at").notNull(),
    day: varchar("day", { length: 10 }).notNull(),
    platform: varchar("platform", { length: 8 }).notNull().$type<"android" | "ios">(),
    appVersion: varchar("app_version", { length: 32 }).notNull(),
    osVersion: varchar("os_version", { length: 32 }),
    language: varchar("language", { length: 3 }),
    country: varchar("country", { length: 2 }),
    firstOpen: boolean("first_open").notNull(),
    screen: varchar("screen", { length: 40 }),
    itemKind: varchar("item_kind", { length: 16 }).$type<AnalyticsItemKind>(),
    itemId: varchar("item_id", { length: 64 }),
    title: varchar("title", { length: 120 }),
    amountCents: bigint("amount_cents", { mode: "number", unsigned: true }),
    currency: varchar("currency", { length: 3 }),
    notificationId: varchar("notification_id", { length: 64 }),
    pushType: varchar("push_type", { length: 32 }),
  },
  (t) => [index("analytics_events_app_day_idx").on(t.appId, t.day, t.installId), index("analytics_events_day_idx").on(t.day)],
);

export const analyticsDaily = mysqlTable(
  "analytics_daily",
  {
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    day: varchar("day", { length: 10 }).notNull(),
    metric: varchar("metric", { length: 16 }).notNull().$type<AnalyticsMetric>(),
    key: varchar("key", { length: 100 }).notNull(),
    label: varchar("label", { length: 120 }),
    value: bigint("value", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.appId, t.day, t.metric, t.key] })],
);

// 46 Crash reports from the apps, grouped by fingerprint, and the app runs counted for the crash-free share.
export const crashIssues = mysqlTable(
  "crash_issues",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    stack: text("stack").notNull(),
    library: varchar("library", { length: 60 }),
    screen: varchar("screen", { length: 80 }),
    fatal: boolean("fatal").notNull(),
    platforms: jsonText<string[]>("platforms").notNull(),
    versions: jsonText<string[]>("versions").notNull(),
    lastOs: varchar("last_os", { length: 60 }),
    count: int("count").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<CrashIssueStatus>(),
    firstSeenAt: time("first_seen_at").notNull(),
    lastSeenAt: time("last_seen_at").notNull(),
    resolvedAt: time("resolved_at"),
  },
  (t) => [uniqueIndex("crash_issues_app_fingerprint_unique").on(t.appId, t.fingerprint), index("crash_issues_last_seen_idx").on(t.lastSeenAt)],
);

export const crashSessions = mysqlTable(
  "crash_sessions",
  {
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    day: varchar("day", { length: 10 }).notNull(),
    sessions: int("sessions").notNull(),
    crashed: int("crashed").notNull(),
  },
  (t) => [primaryKey({ columns: [t.appId, t.day] })],
);

// 49 Signed notices to an app's own API (account.deleted), with their tries; kept 30 days.

export const apiWebhooks = mysqlTable(
  "api_webhooks",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 32 }).notNull().$type<ApiWebhookEvent>(),
    subject: varchar("subject", { length: 64 }).notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<ApiWebhookStatus>(),
    attempts: int("attempts").notNull(),
    nextAttemptAt: time("next_attempt_at"),
    lastAttemptAt: time("last_attempt_at"),
    lastStatus: int("last_status"),
    lastError: varchar("last_error", { length: 200 }),
    createdAt: time("created_at").notNull(),
    deliveredAt: time("delivered_at"),
  },
  (t) => [index("api_webhooks_due_idx").on(t.status, t.nextAttemptAt), index("api_webhooks_app_idx").on(t.appId, t.createdAt)],
);

// 47 Refunds made from the dashboard: of an order (catalog_orders) or a donation, through the provider's API or recorded.
export const paymentRefunds = mysqlTable(
  "payment_refunds",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().$type<RefundKind>(),
    targetId: bigint("target_id", { mode: "number", unsigned: true }).notNull(),
    amountCents: bigint("amount_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    reason: varchar("reason", { length: 32 }).notNull(),
    note: varchar("note", { length: 300 }),
    provider: varchar("provider", { length: 16 }).notNull().$type<PaymentProviderId>(),
    method: varchar("method", { length: 8 }).notNull().$type<PaymentRefund["method"]>(),
    parts: jsonText<PaymentRefund["parts"]>("parts").notNull(),
    providerRef: varchar("provider_ref", { length: 191 }),
    commissionCents: bigint("commission_cents", { mode: "number", unsigned: true }),
    revoked: jsonText<PaymentRefund["revoked"]>("revoked").notNull(),
    byUserId: varchar("by_user_id", { length: 36 }),
    byEmail: varchar("by_email", { length: 191 }).notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("payment_refunds_target_idx").on(t.appId, t.kind, t.targetId)],
);

// 51 Videos and pictures hosted by Yallapp: each app's Media library and its storage packs.
export const mediaFiles = mysqlTable(
  "media_files",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    kind: varchar("kind", { length: 8 }).notNull().$type<MediaKind>(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number", unsigned: true }).notNull(),
    storageKey: varchar("storage_key", { length: 300 }).notNull(),
    status: varchar("status", { length: 12 }).notNull().$type<MediaStatus>(),
    public: boolean("public").notNull().default(false),
    // 77 The Media library, or a message in the chat.
    source: varchar("source", { length: 8 }).notNull().default("library").$type<MediaSource>(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("media_files_app_idx").on(t.appId, t.createdAt), index("media_files_status_idx").on(t.status, t.updatedAt)],
);

export const storagePacks = mysqlTable(
  "storage_packs",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    offer: varchar("offer", { length: 32 }).notNull(),
    gb: int("gb").notNull(),
    activeUntil: time("active_until").notNull(),
    paymentId: id("payment_id"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    endedNoticeAt: time("ended_notice_at"),
  },
  (t) => [index("storage_packs_app_idx").on(t.appId, t.activeUntil), index("storage_packs_until_idx").on(t.activeUntil)],
);

// 58 Yallapp Business

/**
 * 58 Devices signed in to Yallapp Business (the owners' own app) with the
 * dashboard's account: one row per sign-in, deleted on sign-out. The refresh
 * token is kept only as its SHA-256 (unique, rotated on each use); access
 * tokens are signed and checked against the row on every request, so a
 * signed-out device stops at once. `session_version` is the user's when it
 * signed in: a password change signs every device out.
 */
export const ownerDevices = mysqlTable(
  "owner_devices",
  {
    id: id("id").primaryKey(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    platform: varchar("platform", { length: 8 }).notNull().$type<"android" | "ios">(),
    appVersion: varchar("app_version", { length: 20 }),
    language: varchar("language", { length: 8 }),
    refreshHash: varchar("refresh_hash", { length: 64 }).notNull(),
    refreshExpiresAt: time("refresh_expires_at").notNull(),
    sessionVersion: int("session_version").notNull(),
    pushToken: varchar("push_token", { length: 512 }),
    pushProvider: varchar("push_provider", { length: 4 }).notNull().default("fcm").$type<PushProvider>(),
    pushPreferences: jsonText<OwnerPushPreferences>("push_preferences"),
    createdAt: time("created_at").notNull(),
    lastSeenAt: time("last_seen_at").notNull(),
  },
  (t) => [
    uniqueIndex("owner_devices_refresh_unique").on(t.refreshHash),
    index("owner_devices_user_idx").on(t.userId, t.lastSeenAt),
    index("owner_devices_push_idx").on(t.pushToken),
    index("owner_devices_expires_idx").on(t.refreshExpiresAt),
  ],
);

// 60 Team members for clients (lib/team)

/** Who works with a client besides its owner: role, areas and apps (lib/team/permissions.ts). */
export const teamMembers = mysqlTable(
  "team_members",
  {
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull().$type<"manager" | "staff">(),
    areas: jsonText<string[]>("areas").notNull(),
    // Null: every app of the client.
    appIds: jsonText<string[]>("app_ids"),
    addedBy: varchar("added_by", { length: 191 }).notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.userId] }), index("team_members_user_idx").on(t.userId)],
);

/** Invitations to a client's team: the token's SHA-256, single use, 7 days. */
export const teamInvitations = mysqlTable(
  "team_invitations",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    role: varchar("role", { length: 16 }).notNull().$type<"manager" | "staff">(),
    areas: jsonText<string[]>("areas").notNull(),
    appIds: jsonText<string[]>("app_ids"),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    lang: varchar("lang", { length: 8 }).notNull(),
    invitedBy: id("invited_by").notNull(),
    expiresAt: time("expires_at").notNull(),
    acceptedAt: time("accepted_at"),
    cancelledAt: time("cancelled_at"),
    sentAt: time("sent_at").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [uniqueIndex("team_invitations_token_unique").on(t.tokenHash), index("team_invitations_client_idx").on(t.clientId, t.createdAt)],
);

/** What people on a client's team did (order steps, refunds, notifications sent, the team's changes). */
export const teamActivity = mysqlTable(
  "team_activity",
  {
    id: autoId("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    appId: id("app_id"),
    actorId: id("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: varchar("actor_name", { length: 120 }).notNull(),
    actorEmail: varchar("actor_email", { length: 191 }).notNull(),
    action: varchar("action", { length: 48 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 64 }),
    summary: varchar("summary", { length: 500 }).notNull(),
    at: time("at").notNull(),
  },
  (t) => [
    index("team_activity_client_idx").on(t.clientId, t.at),
    index("team_activity_actor_idx").on(t.actorId),
    // 64 The Team page's activity of one person, newest first, and its count.
    index("team_activity_client_actor_idx").on(t.clientId, t.actorId, t.at),
  ],
);

/**
 * 61 Notifications to everyone who uses an app, sent later by the frequent
 * job (lib/hosted/scheduled-notifications.ts). A row is taken by one run
 * (`scheduled` to `sending`, a conditional update) and kept once sent.
 */
export const scheduledNotifications = mysqlTable(
  "scheduled_notifications",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    sendAt: time("send_at").notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<ScheduledNotificationStatus>(),
    createdBy: varchar("created_by", { length: 36 }),
    claimedAt: time("claimed_at"),
    sentAt: time("sent_at"),
    notificationId: bigint("notification_id", { mode: "number", unsigned: true }),
    result: varchar("result", { length: 500 }),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("scheduled_notifications_due_idx").on(t.status, t.sendAt), index("scheduled_notifications_app_idx").on(t.appId, t.status, t.sendAt)],
);

/**
 * 63 A gym's members checked in at the door: one row per app user and day in
 * the gym's time zone (the unique key makes two scans at once count once).
 */
export const memberCheckIns = mysqlTable(
  "member_check_ins",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    membershipId: bigint("membership_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    day: varchar("day", { length: 10 }).notNull(),
    at: time("at").notNull(),
    byName: varchar("by_name", { length: 120 }).notNull(),
  },
  // The day's list and count read (app, day); the same key makes a member count once a day.
  (t) => [uniqueIndex("member_check_ins_day_unique").on(t.appId, t.day, t.userId)],
);

/** 63 Students' reviews of courses managed in the dashboard: one per student and course. */
export const courseReviews = mysqlTable(
  "course_reviews",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    courseId: int("course_id").notNull(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    rating: int("rating").notNull(),
    text: text("text").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    replyText: text("reply_text"),
    replyAt: time("reply_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("course_reviews_student_unique").on(t.appId, t.courseId, t.userId), index("course_reviews_app_idx").on(t.appId, t.createdAt)],
);

/** 63 Questions students ask in courses managed in the dashboard. */
export const courseQuestions = mysqlTable(
  "course_questions",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    courseId: int("course_id").notNull(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => hostedUsers.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<CourseQuestionStatus>(),
    // 64 Hidden by the business: only its author sees it.
    hidden: boolean("hidden").notNull().default(false),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    index("course_questions_course_idx").on(t.appId, t.courseId, t.createdAt),
    index("course_questions_app_idx").on(t.appId, t.status, t.updatedAt),
    index("course_questions_hidden_idx").on(t.appId, t.hidden, t.status, t.updatedAt),
  ],
);

/** 63 Answers under a question: a student's, or the business's (`user_id` null). */
export const courseAnswers = mysqlTable(
  "course_answers",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    questionId: bigint("question_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => courseQuestions.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    // 64 Hidden by the business: only its author sees it.
    hidden: boolean("hidden").notNull().default(false),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("course_answers_question_idx").on(t.questionId, t.createdAt)],
);

/**
 * 66 Requests to delete a Yallapp account (Dashboard › Your account), handled
 * by Yallapp's team in Admin › Account deletion. No foreign keys: the record
 * of the request outlives the account it deleted. `open_client_id` is the
 * client while the request is open and null once it is closed, so a client
 * has at most one open request (unique; MySQL allows many nulls).
 */
export const accountDeletionRequests = mysqlTable(
  "account_deletion_requests",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id").notNull(),
    userId: id("user_id").notNull(),
    openClientId: id("open_client_id"),
    email: varchar("email", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    // The dashboard language of the person who asked ("en", "ar" or "tr"): the emails to them.
    lang: varchar("lang", { length: 8 }).notNull(),
    reason: text("reason"),
    status: varchar("status", { length: 16 }).notNull().$type<"pending" | "done" | "cancelled">(),
    requestedAt: time("requested_at").notNull(),
    closedAt: time("closed_at"),
    // Who closed it: our team member's email, or the client's own when they cancelled it.
    closedBy: varchar("closed_by", { length: 191 }),
    teamNote: text("team_note"),
  },
  (t) => [
    uniqueIndex("account_deletion_requests_open_unique").on(t.openClientId),
    index("account_deletion_requests_status_idx").on(t.status, t.requestedAt),
    index("account_deletion_requests_client_idx").on(t.clientId, t.requestedAt),
  ],
);

/**
 * 73 Deleted apps: the record of each deletion (no foreign keys, so it
 * outlives the app). `open_app_id` is set while it waits, so an app has one
 * waiting deletion; the daily job purges it after `purge_after`.
 */
export const appDeletions = mysqlTable(
  "app_deletions",
  {
    id: id("id").primaryKey(),
    appId: id("app_id").notNull(),
    clientId: id("client_id").notNull(),
    openAppId: id("open_app_id"),
    appName: varchar("app_name", { length: 120 }).notNull(),
    reason: varchar("reason", { length: 16 }).notNull().$type<AppDeletion["reason"]>(),
    deletedBy: varchar("deleted_by", { length: 191 }).notNull(),
    deletedAt: time("deleted_at").notNull(),
    purgeAfter: time("purge_after").notNull(),
    status: varchar("status", { length: 16 }).notNull().$type<AppDeletionStatus>(),
    closedAt: time("closed_at"),
    closedBy: varchar("closed_by", { length: 191 }),
    pendingBuilds: jsonText<string[]>("pending_builds").notNull(),
  },
  (t) => [
    uniqueIndex("app_deletions_open_unique").on(t.openAppId),
    index("app_deletions_status_idx").on(t.status, t.purgeAfter),
    index("app_deletions_client_idx").on(t.clientId, t.deletedAt),
  ],
);

/**
 * 73 Paid plan payments kept when their account is deleted, as accounting and
 * tax laws require (no foreign keys): who paid, the payment and its coupon,
 * and the receipt as it was made, to make its PDF again.
 */
export const keptBillingRecords = mysqlTable(
  "kept_billing_records",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id").notNull(),
    userId: id("user_id").notNull(),
    appId: id("app_id"),
    receiptNumber: varchar("receipt_number", { length: 16 }).notNull(),
    buyerName: varchar("buyer_name", { length: 120 }).notNull(),
    buyerEmail: varchar("buyer_email", { length: 191 }).notNull(),
    buyerWhatsapp: varchar("buyer_whatsapp", { length: 32 }).notNull(),
    buyerCountry: varchar("buyer_country", { length: 2 }),
    amountCents: bigint("amount_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    status: varchar("status", { length: 16 }).notNull().$type<PlanPaymentStatus>(),
    paidAt: time("paid_at"),
    details: jsonText<KeptBillingRecord["details"]>("details").notNull(),
    receipt: jsonText<KeptBillingRecord["receipt"]>("receipt"),
    keptAt: time("kept_at").notNull(),
  },
  (t) => [index("kept_billing_records_client_idx").on(t.clientId, t.paidAt), index("kept_billing_records_kept_idx").on(t.keptAt)],
);

/**
 * 70 Website sessions kept on the server: the sealed cookie carries a random
 * session ID, and only its SHA-256 is stored here. Signing out deletes the
 * row, so a copy of the cookie stops working; "Sign out of all devices"
 * deletes every row of the person. Expired rows go with the daily job.
 */
export const userSessions = mysqlTable(
  "user_sessions",
  {
    idHash: varchar("id_hash", { length: 64 }).primaryKey(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: time("created_at").notNull(),
    expiresAt: time("expires_at").notNull(),
  },
  (t) => [index("user_sessions_user_idx").on(t.userId), index("user_sessions_expires_idx").on(t.expiresAt)],
);

/**
 * 70 Two-step sign-in with an authenticator app (RFC 6238). The secret is
 * encrypted with ENCRYPTION_KEY (context `two-step:<user id>`); `enabled_at`
 * stays null until a first code confirms the setup. `last_step` is the last
 * 30-second step whose code was used: each code works once (claimed by a
 * conditional update).
 */
export const userTwoFactor = mysqlTable("user_two_factor", {
  userId: id("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secretEncrypted: varchar("secret_encrypted", { length: 255 }).notNull(),
  enabledAt: time("enabled_at"),
  lastStep: bigint("last_step", { mode: "number", unsigned: true }).notNull().default(0),
  createdAt: time("created_at").notNull(),
  updatedAt: time("updated_at").notNull(),
});

/** 70 One-time recovery codes for two-step sign-in, kept as SHA-256 hashes; each works once. */
export const userRecoveryCodes = mysqlTable(
  "user_recovery_codes",
  {
    userId: id("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    usedAt: time("used_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.codeHash] })],
);

/** 77 The people using an app who chat: hosted users or WordPress users. */
export const chatMembers = mysqlTable(
  "chat_members",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 12 }).notNull().$type<ChatMemberSource>(),
    externalId: varchar("external_id", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    blockedAt: time("blocked_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("chat_members_person_unique").on(t.appId, t.source, t.externalId)],
);

/** 77 A person and the business, or a course's group. */
export const chatConversations = mysqlTable(
  "chat_conversations",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 8 }).notNull().$type<ChatConversationKind>(),
    memberId: id("member_id").references(() => chatMembers.id, { onDelete: "cascade" }),
    courseKey: varchar("course_key", { length: 60 }),
    title: varchar("title", { length: 200 }),
    imageUrl: varchar("image_url", { length: 500 }),
    lastMessageId: bigint("last_message_id", { mode: "number", unsigned: true }),
    lastMessageAt: time("last_message_at"),
    businessReadId: bigint("business_read_id", { mode: "number", unsigned: true }),
    keepUntil: time("keep_until"),
    noticeFor: time("notice_for"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("chat_conversations_direct_unique").on(t.appId, t.memberId),
    uniqueIndex("chat_conversations_group_unique").on(t.appId, t.courseKey),
    index("chat_conversations_recent_idx").on(t.appId, t.lastMessageAt),
  ],
);

/** 77 Who is in a conversation, and what they read. */
export const chatParticipants = mysqlTable(
  "chat_participants",
  {
    conversationId: id("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    memberId: id("member_id")
      .notNull()
      .references(() => chatMembers.id, { onDelete: "cascade" }),
    readId: bigint("read_id", { mode: "number", unsigned: true }),
    joinedAt: time("joined_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.memberId] }), index("chat_participants_member_idx").on(t.memberId)],
);

export const chatMessages = mysqlTable(
  "chat_messages",
  {
    id: autoId("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    conversationId: id("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    senderKind: varchar("sender_kind", { length: 8 }).notNull().$type<ChatSenderKind>(),
    memberId: id("member_id").references(() => chatMembers.id, { onDelete: "cascade" }),
    teamUserId: id("team_user_id"),
    teamName: varchar("team_name", { length: 120 }),
    clientId: varchar("client_id", { length: 64 }),
    text: text("text"),
    mediaId: id("media_id"),
    durationSeconds: int("duration_seconds"),
    deletedAt: time("deleted_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    index("chat_messages_conversation_idx").on(t.conversationId, t.id),
    uniqueIndex("chat_messages_client_unique").on(t.conversationId, t.clientId),
    index("chat_messages_created_idx").on(t.appId, t.createdAt),
    index("chat_messages_media_idx").on(t.mediaId),
  ],
);

export const chatReports = mysqlTable(
  "chat_reports",
  {
    id: id("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    messageId: bigint("message_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    conversationId: id("conversation_id").notNull(),
    reporterId: id("reporter_id")
      .notNull()
      .references(() => chatMembers.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 16 }).notNull().$type<ChatReportReason>(),
    note: varchar("note", { length: 500 }),
    status: varchar("status", { length: 8 }).notNull().$type<"open" | "closed">(),
    outcome: varchar("outcome", { length: 12 }).$type<ChatReportOutcome>(),
    closedBy: varchar("closed_by", { length: 191 }),
    createdAt: time("created_at").notNull(),
    closedAt: time("closed_at"),
  },
  (t) => [uniqueIndex("chat_reports_once_unique").on(t.messageId, t.reporterId), index("chat_reports_app_idx").on(t.appId, t.status, t.createdAt)],
);

/** 77 Members a member doesn't want to see (their own choice, in groups). */
export const chatBlocks = mysqlTable(
  "chat_blocks",
  {
    memberId: id("member_id")
      .notNull()
      .references(() => chatMembers.id, { onDelete: "cascade" }),
    blockedId: id("blocked_id")
      .notNull()
      .references(() => chatMembers.id, { onDelete: "cascade" }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.blockedId] })],
);

/** 77 WordPress people's chat tokens (hashes), for an hour. */
export const chatSessions = mysqlTable(
  "chat_sessions",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    memberId: id("member_id")
      .notNull()
      .references(() => chatMembers.id, { onDelete: "cascade" }),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("chat_sessions_expiry_idx").on(t.expiresAt)],
);

/** 77 Files sent from the app: who uploaded them, and a voice message's length. */
export const chatUploads = mysqlTable(
  "chat_uploads",
  {
    mediaId: id("media_id")
      .primaryKey()
      .references(() => mediaFiles.id, { onDelete: "cascade" }),
    appId: id("app_id").notNull(),
    memberId: id("member_id")
      .notNull()
      .references(() => chatMembers.id, { onDelete: "cascade" }),
    durationSeconds: int("duration_seconds"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("chat_uploads_member_idx").on(t.memberId)],
);


/**
 * 78 Each client's milestones (lib/milestones): one row per kind and what it
 * is about (`ref`: the app, "" for the account, the payment of a renewal).
 * No foreign key to the app: a deleted app's milestones stay, as the account's
 * history; the account's deletion takes them.
 */
export const clientMilestones = mysqlTable(
  "client_milestones",
  {
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 24 }).notNull().$type<MilestoneKind>(),
    ref: varchar("ref", { length: 36 }).notNull(),
    appId: id("app_id"),
    at: time("at").notNull(),
    source: jsonText<SignupSource>("source"),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.kind, t.ref] }), index("client_milestones_kind_at_idx").on(t.kind, t.at)],
);

/** 78.2 What the daily job saw each day (lib/admin/product-days.ts): the clients with a plan running, for Admin › Product's months. */
export const productDays = mysqlTable("product_days", {
  day: varchar("day", { length: 10 }).primaryKey(),
  snapshot: jsonText<Omit<ProductDay, "day">>("snapshot").notNull(),
  updatedAt: time("updated_at").notNull(),
});

/** 78.3 Each run of a scheduled job (lib/watch/runs.ts), kept 30 days. */
export const jobRuns = mysqlTable(
  "job_runs",
  {
    id: autoId("id").primaryKey(),
    job: varchar("job", { length: 16 }).notNull().$type<WatchedJob>(),
    startedAt: time("started_at").notNull(),
    finishedAt: time("finished_at"),
    ok: boolean("ok"),
    summary: text("summary"),
    error: varchar("error", { length: 500 }),
  },
  (t) => [index("job_runs_job_started_idx").on(t.job, t.startedAt)],
);

/** 78.3 What the team should look at (lib/watch/alerts.ts): one open alert per key. */
export const teamAlerts = mysqlTable(
  "team_alerts",
  {
    id: id("id").primaryKey(),
    kind: varchar("kind", { length: 24 }).notNull().$type<TeamAlertKind>(),
    key: varchar("key", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    detail: text("detail").notNull(),
    link: varchar("link", { length: 300 }),
    count: int("count").notNull(),
    createdAt: time("created_at").notNull(),
    lastSeenAt: time("last_seen_at").notNull(),
    resolvedAt: time("resolved_at"),
    resolvedBy: varchar("resolved_by", { length: 254 }),
    emailedAt: time("emailed_at"),
    // Null once resolved, so one open alert per key and any number of closed ones.
    openKey: varchar("open_key", { length: 120 }),
  },
  (t) => [uniqueIndex("team_alerts_open_key_unique").on(t.openKey), index("team_alerts_resolved_idx").on(t.resolvedAt, t.lastSeenAt)],
);

/** 78.4 Each app's errors, counted per source and code (lib/watch/app-errors.ts); kept 90 days after last seen. */
export const appErrors = mysqlTable(
  "app_errors",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    appId: id("app_id").references(() => apps.id, { onDelete: "cascade" }),
    // The app's ID, or "" for the account's: part of the unique key (a null wouldn't be).
    appKey: varchar("app_key", { length: 36 }).notNull(),
    source: varchar("source", { length: 16 }).notNull().$type<AppErrorSource>(),
    code: varchar("code", { length: 64 }).notNull(),
    message: varchar("message", { length: 500 }).notNull(),
    count: int("count").notNull(),
    firstAt: time("first_at").notNull(),
    lastAt: time("last_at").notNull(),
  },
  (t) => [uniqueIndex("app_errors_unique").on(t.clientId, t.appKey, t.source, t.code), index("app_errors_last_idx").on(t.lastAt)],
);
