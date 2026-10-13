import type {
  AppBackend,
  AppType,
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
} from "../data/types";
import {
  bigint,
  boolean,
  serial,
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
// 10.7 Listings
import { double } from "drizzle-orm/mysql-core";
import type { ListingInquiryStatus, ListingPurpose, ListingSettings, ListingStatus } from "../data/types";

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

export const licenses = mysqlTable(
  "licenses",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    keyEncrypted: text("key_encrypted").notNull(),
    keyLast4: varchar("key_last4", { length: 4 }).notNull(),
    plan: varchar("plan", { length: 16 }).notNull().$type<"starter" | "pro">(),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("licenses_client_unique").on(t.clientId), uniqueIndex("licenses_key_hash_unique").on(t.keyHash)],
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
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("apps_client_unique").on(t.clientId)],
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
    uniqueIndex("builds_client_number_unique").on(t.clientId, t.number),
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
    id: serial("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 191 }),
    city: varchar("city", { length: 120 }),
    notificationsReadAt: time("notifications_read_at"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("hosted_users_phone_unique").on(t.appId, t.phone)],
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
    phone: varchar("phone", { length: 20 }).notNull(),
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
    id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
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

/** Clients paying their plan by card (Yallapp's iyzico account). */
export const planPayments = mysqlTable(
  "plan_payments",
  {
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    plan: varchar("plan", { length: 16 }).notNull().$type<"starter" | "pro">(),
    months: int("months").notNull().$type<1 | 12>(),
    amountCents: bigint("amount_cents", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().$type<CatalogCurrency>(),
    status: varchar("status", { length: 16 }).notNull().$type<PlanPaymentStatus>(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    paymentId: varchar("payment_id", { length: 64 }),
    createdAt: time("created_at").notNull(),
    paidAt: time("paid_at"),
  },
  (t) => [uniqueIndex("plan_payments_token_unique").on(t.tokenHash), index("plan_payments_client_idx").on(t.clientId, t.createdAt)],
);

/** Appointments of apps whose bookings are managed in the dashboard. */
export const bookingAppointments = mysqlTable(
  "booking_appointments",
  {
    id: serial("id").primaryKey(),
    appId: id("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number", unsigned: true }).references(() => hostedUsers.id, { onDelete: "set null" }),
    serviceId: int("service_id").notNull(),
    staffId: int("staff_id").notNull(),
    serviceName: varchar("service_name", { length: 120 }).notNull(),
    staffName: varchar("staff_name", { length: 120 }).notNull(),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 24 }).notNull(),
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
    id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
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
    id: serial("id").primaryKey(),
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
