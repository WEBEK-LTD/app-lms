import type {
  AppBackend,
  AppType,
  AppVertical,
  AssetKind,
  CatalogCurrency,
  CatalogCustomer,
  CatalogOrderLine,
  CatalogOrderStatus,
  CatalogSettings,
  ConnectorConfig,
  HostedSettings,
  PlatformSettingKey,
  PlanPaymentStatus,
  BookingSetup,
  CourseSetup,
  BookingStatus,
  PushPreferences,
  AuditChanges,
  OwnerNoticeKind,
} from "../data/types";
// 11.6 and 11.8
import type { AnnouncementAudience, AnnouncementSeverity, CouponDiscount, CouponRedemption } from "../data/types";
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
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import type { ListingInquiryStatus, ListingPurpose, ListingSettings, ListingStatus } from "../data/types";
// 14.1 We publish for you
import type { PublishingChecklist, PublishingListing, PublishingMode, PublishingStatus, PublishingStore } from "../data/types";

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
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  // An account can have several apps, listed oldest first.
  (t) => [index("apps_client_idx").on(t.clientId, t.createdAt)],
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
  (t) => [uniqueIndex("hosted_users_phone_unique").on(t.appId, t.phone), index("hosted_users_email_idx").on(t.appId, t.email)],
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
    pushPreferences: jsonText<PushPreferences>("push_preferences"),
    createdAt: time("created_at").notNull(),
    lastSeenAt: time("last_seen_at").notNull(),
  },
  (t) => [uniqueIndex("hosted_devices_unique").on(t.userId, t.deviceId), index("hosted_devices_app_idx").on(t.appId)],
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
  },
  (t) => [
    uniqueIndex("catalog_orders_token_unique").on(t.tokenHash),
    index("catalog_orders_app_idx").on(t.appId, t.createdAt),
    index("catalog_orders_user_idx").on(t.appId, t.userId),
  ],
);

/** Settings the team edits in the admin; secrets inside `value` are encrypted. */
export const platformSettings = mysqlTable("platform_settings", {
  key: varchar("setting_key", { length: 32 }).primaryKey().$type<PlatformSettingKey>(),
  value: jsonText<unknown>("value").notNull(),
  updatedAt: time("updated_at").notNull(),
  updatedBy: varchar("updated_by", { length: 191 }).notNull(),
});

/** Clients paying an app's plan by card (Yallapp's iyzico account). */
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
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [
    index("booking_appointments_app_start_idx").on(t.appId, t.startAt),
    index("booking_appointments_user_idx").on(t.appId, t.userId, t.startAt),
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
    linkUrl: varchar("link_url", { length: 500 }),
    linkLabel: varchar("link_label", { length: 60 }),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at"),
    emailedAt: time("emailed_at"),
    emailedCount: int("emailed_count").notNull().default(0),
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
