import type { AppType, AssetKind } from "../data/types";
import {
  bigint,
  boolean,
  customType,
  datetime,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

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
