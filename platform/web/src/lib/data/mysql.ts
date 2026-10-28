import { and, asc, count, desc, eq, getTableColumns, gt, gte, inArray, isNotNull, isNull, like, lt, lte, ne, not, or, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import type { DatabaseConfig } from "../env";
import { newId } from "../crypto/tokens";
import { membershipToUse } from "../bookings/memberships";
import { clientAccountState, longestLicense } from "../license/status";
import type { BuildConfig } from "../build-config/types";
import * as schema from "../db/schema";
import type { AnalyticsDailyRecord, AnalyticsDailyRow, AnalyticsEventRow, AnalyticsMetric } from "../analytics/types";
import type { AppAuthKey, AppLayoutRecord, AppLayoutVersion, AppLayoutVersionSummary, OwnFont, SavedSection, StudioTemplate, StoreProduct, StorePurchaseRecord, StorePurchaseEvent, StoreBillingItem, BillingSession } from "./types";
import type {
  FoodOrder,
  FoodOrderInput,
  FoodOrderPatch,
  FoodOrderQuery,
  FoodOrderStatus,
  FoodStatementRow,
  Restaurant,
  RestaurantInput,
  RestaurantMenu,
  RestaurantPatch,
  RestaurantStaff,
  RestaurantStaffInput,
} from "./types";
import { dishNamesOf } from "../food/menu";
import type { AppDeletion, AppDeletionStatus, KeptBillingRecord } from "./types";
import type { ChatConversation, ChatConversationKind, ChatConversationPatch, ChatMember, ChatMemberSource, ChatMessage, ChatParticipant, ChatReport, ChatReportOutcome, ChatSession, ChatUploadInfo } from "./types";
import type { AppError, ClientMilestone, JobRun, MilestoneKind, ProductDay, RekeyCell, TeamAlert, TeamAlertKind, WatchedJob } from "./types";
import { candidatesIn, needsRekey } from "../crypto/rekey";
import { assetIdsIn } from "./asset-ids";
import type { CourseAnswer, CourseAnswerInput, CourseQuestion, CourseQuestionInput, CourseQuestionStatus, CourseReview, CourseReviewPatch, MemberCheckIn } from "./types";
import type { MoreStore, MoreStoresRow, PublishingEvent, PublishingRequest, PublishingTrack, ReviewsRow } from "./types";
import type {
  AppPatch,
  BuildPatch,
  ClaimResult,
  ClientAppRow,
  ClientFilter,
  ClientPatch,
  ClientRow,
  DataStore,
  HostedDevicePatch,
  LicensePatch,
  ReleasePatch,
  SetupRequestRow,
  SigningKeyColumn,
  SigningKeysPatch,
  UserPatch,
} from "./store";
import { BuildRunningError, DuplicateEmailError } from "./store";
import type { Courier, CourierInput, CourierPatch, DeliveryService, DeliveryServiceInput, DeliverySettings, Shipment, ShipmentInput, ShipmentPatch, ShipmentQuery, ShipmentStatus } from "./types";
// 51 Media and storage
import type { MediaFile, MediaFilePatch, MediaKind, MediaStatus, StoragePack, StoragePackPatch } from "./types";
import type { OwnerNotice, OwnerNoticeKind, OwnerNoticePatch } from "./types";
import type { DemoPurgeCounts } from "./types";
// 46 Links and crash reports
import type { AppLinkTarget, CrashIssue, CrashIssueStatus, CrashReportInput } from "./types";
import type { ApiWebhook, ApiWebhookEvent, ApiWebhookPatch } from "./types";
import type { PaymentRefund, RefundKind } from "./types";
import type { OwnerDevice, OwnerDevicePatch } from "./types";
import type { TeamActivity, TeamInvitation, TeamInvitationPatch, TeamMember, TeamMemberRow } from "./types";
import type { AccountDeletionClose, AccountDeletionRequest, AccountDeletionStatus } from "./types";
import type { CouponClaimLimits, UserSession, UserTwoFactor } from "./types";
import type { BookingAppointmentMove, PaidTotals, ScheduledNotification, ScheduledNotificationPatch, ScheduledNotificationStatus } from "./types";
import type { CampaignSend, HostedCart, HostedOrderWatch, NotificationCampaign, NotificationCampaignPatch, NotificationCampaignStatus } from "./types";
import type { LoyaltyEntry, LoyaltyReason } from "./types";
import { mergeCrash } from "../crashes/report";
import type {
  Activation,
  App,
  Artifact,
  Asset,
  Build,
  BuildVariant,
  BuildStatus,
  CatalogCategory,
  CatalogOrder,
  CatalogOrderPatch,
  CatalogOrderStatus,
  CatalogProduct,
  CatalogProductInput,
  PlatformSetting,
  PendingPayment,
  PlanPayment,
  PlanPaymentStatus,
  BookingAppointment,
  BookingAppointmentPatch,
  BookingStatus,
  BookClassInput,
  BookClassResult,
  ClassBooking,
  ClassBookingStatus,
  ClassSession,
  ClassSessionPatch,
  Membership,
  MembershipPatch,
  CourseEnrollment,
  LessonProgress,
  QuizAttempt,
  CatalogCoupon,
  PlatformSettingKey,
  PlatformSettingValues,
  Client,
  HostedChallenge,
  HostedDevice,
  HostedNotification,
  HostedRefreshToken,
  HostedUser,
  HostedUserPatch,
  License,
  PluginRelease,
  ResetToken,
  BuildStages,
  StoreListing,
  User,
  AdminMember,
  AdminMemberRow,
  AuditEntry,
  AuditQuery,
} from "./types";
import { ACTIVE_BOOKING_STATUSES } from "./types";
// 11.3, 11.4, 11.6 and 11.8
import type { Announcement, AnnouncementPatch, Coupon, CouponPatch, CouponRedemption, EmailTemplateRecord, SiteContentRecord } from "./types";
// 23 News & blog
import type { Article, ArticleCategory, ArticleInput, NewsSettings } from "./types";
// 28 Events & tickets
import type { CheckInResult, EventInput, EventRecord, EventSettings, EventTicket, TicketClaim, TicketClaimRefusal, TicketType, TicketTypeInput } from "./types";
// 29 Charity & donations
import type { Campaign, CampaignInput, Donation, DonationInput, DonationPatch, DonationSettings, DonationStatus } from "./types";
// 10.7 Listings
import type { Listing, ListingFavorite, ListingInput, ListingInquiry, ListingInquiryMessage, ListingInquiryRow, ListingInquiryStatus, ListingSettings } from "./types";

type Db = MySql2Database<typeof schema>;

/** 27 Rolls a class booking back when the class has no spot left. */
class ClassFullError extends Error {}

/**
 * Pool settings for Netlify functions talking to cPanel MySQL:
 * at most one connection per function instance and TLS with certificate
 * verification. 98.1 A warm instance keeps its connection for the next
 * request for up to 30 seconds (each new connection costs its TCP, TLS and
 * sign-in round trips, often more than the request's queries), with TCP
 * keep-alive; a connection the server or a frozen function dropped is
 * opened again (`run`'s retry). Up to 50 queries wait for that connection
 * (DATABASE_QUEUE_LIMIT changes it; the e2e suites on MariaDB, one `next
 * start` for every request, lift it).
 */
export function createPool(config: DatabaseConfig): mysql.Pool {
  return mysql.createPool({
    uri: config.url,
    connectionLimit: 1,
    maxIdle: 1,
    idleTimeout: 30_000,
    queueLimit: config.queueLimit ?? 50,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    timezone: "Z",
    dateStrings: false,
    charset: "utf8mb4_unicode_ci",
    ssl: config.ssl === "required" ? { rejectUnauthorized: true, minVersion: "TLSv1.2", ...(config.ca ? { ca: config.ca } : {}) } : undefined,
  });
}

const RETRYABLE = new Set(["PROTOCOL_CONNECTION_LOST", "ECONNRESET", "EPIPE", "ETIMEDOUT", "ER_CON_COUNT_ERROR"]);

function errorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export class MysqlStore implements DataStore {
  private db: Db;

  constructor(pool: mysql.Pool) {
    this.db = drizzle({ client: pool, schema, mode: "default" });
  }

  /** Retries once when a pooled connection was closed while the function was frozen. */
  private async run<T>(operation: (db: Db) => Promise<T>): Promise<T> {
    try {
      return await operation(this.db);
    } catch (error) {
      const code = errorCode(error);
      if (code && RETRYABLE.has(code)) return operation(this.db);
      throw error;
    }
  }

  async createUser(input: { email: string; name: string; passwordHash: string | null; now: Date }): Promise<User> {
    const user: User = {
      id: newId(),
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash,
      sessionVersion: 1,
      createdAt: input.now,
      updatedAt: input.now,
      lastSignInAt: null,
      language: null,
    };
    try {
      await this.run((db) => db.insert(schema.users).values(user));
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") throw new DuplicateEmailError();
      throw error;
    }
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = await this.run((db) => db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1),
    );
    return rows[0] ?? null;
  }

  async updateUser(id: string, patch: UserPatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.users).set({ ...patch, updatedAt: now }).where(eq(schema.users.id, id)));
  }

  async createClient(input: { userId: string; whatsapp: string; siteUrl: string; country?: string | null; now: Date }): Promise<Client> {
    const client: Client = {
      id: newId(),
      userId: input.userId,
      whatsapp: input.whatsapp,
      siteUrl: input.siteUrl,
      status: "pending",
      paymentNote: null,
      activatedAt: null,
      country: input.country ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    };
    await this.run((db) => db.insert(schema.clients).values(client));
    return client;
  }

  async getClientById(id: string): Promise<Client | null> {
    const rows = await this.run((db) => db.select().from(schema.clients).where(eq(schema.clients.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async getClientByUserId(userId: string): Promise<Client | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.clients).where(eq(schema.clients.userId, userId)).limit(1),
    );
    return rows[0] ?? null;
  }

  async updateClient(id: string, patch: ClientPatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.clients).set({ ...patch, updatedAt: now }).where(eq(schema.clients.id, id)));
  }

  async listSetupRequests(): Promise<SetupRequestRow[]> {
    const rows = await this.run((db) =>
      db
        .select({ client: schema.clients, user: schema.users, app: schema.apps })
        .from(schema.apps)
        .innerJoin(schema.clients, eq(schema.clients.id, schema.apps.clientId))
        .innerJoin(schema.users, eq(schema.users.id, schema.clients.userId))
        .where(and(eq(schema.apps.backend, "setup_requested"), liveApp()))
        .orderBy(asc(schema.apps.setupRequestedAt))
        .limit(200),
    );
    return rows;
  }

  async listClients(input: { filter: ClientFilter; query?: string; now: Date }): Promise<ClientRow[]> {
    const query = input.query?.trim();
    const pattern = query ? `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
    const base = await this.run((db) =>
      db
        .select({ client: schema.clients, user: schema.users })
        .from(schema.clients)
        .innerJoin(schema.users, eq(schema.users.id, schema.clients.userId))
        .where(
          and(
            input.filter === "pending" ? eq(schema.clients.status, "pending") : undefined,
            input.filter === "active" || input.filter === "expired" ? eq(schema.clients.status, "active") : undefined,
            pattern
              ? or(
                  like(schema.users.name, pattern),
                  like(schema.users.email, pattern),
                  like(schema.clients.whatsapp, pattern),
                  like(schema.clients.siteUrl, pattern),
                )
              : undefined,
          ),
        )
        .orderBy(desc(schema.clients.createdAt))
        .limit(500),
    );
    if (base.length === 0) return [];
    const ids = base.map((row) => row.client.id);
    const [appRows, licenseRows] = await Promise.all([
      this.run((db) =>
        db.select().from(schema.apps).where(and(inArray(schema.apps.clientId, ids), liveApp())).orderBy(asc(schema.apps.createdAt), asc(schema.apps.id)),
      ),
      this.run((db) => db.select().from(schema.licenses).where(and(inArray(schema.licenses.clientId, ids), liveLicense()))),
    ]);
    const licenseIds = licenseRows.map((l) => l.id);
    const appIds = appRows.map((a) => a.id);
    const [activationRows, buildRows] = await Promise.all([
      licenseIds.length
        ? this.run((db) => db.select().from(schema.activations).where(inArray(schema.activations.licenseId, licenseIds)))
        : Promise.resolve([]),
      appIds.length
        ? this.run((db) =>
            db
              .select()
              .from(schema.builds)
              .where(
                and(
                  inArray(schema.builds.appId, appIds),
                  eq(schema.builds.number, sql`(select max(b2.number) from builds b2 where b2.app_id = ${schema.builds.appId})`),
                ),
              ),
          )
        : Promise.resolve([]),
    ]);
    const activationByLicense = new Map(activationRows.map((a) => [a.licenseId, a]));
    const buildByApp = new Map(buildRows.map((b) => [b.appId, toBuild(b)]));
    return base
      .map((row) => {
        const licenses = licenseRows.filter((l) => l.clientId === row.client.id);
        const entry = (app: App | null): ClientAppRow => {
          const license = licenses.find((l) => l.appId === (app?.id ?? null)) ?? null;
          return {
            app,
            license,
            activation: license ? (activationByLicense.get(license.id) ?? null) : null,
            latestBuild: app ? (buildByApp.get(app.id) ?? null) : null,
          };
        };
        const apps = appRows.filter((a) => a.clientId === row.client.id).map(entry);
        if (licenses.some((l) => l.appId === null)) apps.push(entry(null));
        return { client: row.client, user: row.user, license: longestLicense(licenses), apps };
      })
      .filter((row) => input.filter === "all" || clientAccountState(row.client, row.license ? [row.license] : [], input.now) === input.filter);
  }

  async countClients(now: Date): Promise<Record<ClientFilter, number>> {
    // One row per client, with the end of their longest license: it decides the account's state.
    const rows = await this.run((db) =>
      db
        .select({ status: schema.clients.status, expiresAt: sql<Date | null>`max(${schema.licenses.expiresAt})`.mapWith(schema.licenses.expiresAt) })
        .from(schema.clients)
        .leftJoin(schema.licenses, and(eq(schema.licenses.clientId, schema.clients.id), liveLicense()))
        .groupBy(schema.clients.id, schema.clients.status),
    );
    const counts: Record<ClientFilter, number> = { all: 0, pending: 0, active: 0, expired: 0 };
    for (const row of rows) {
      counts.all += 1;
      const state = clientAccountState({ status: row.status }, row.expiresAt ? [{ expiresAt: row.expiresAt }] : [], now);
      if (state !== "suspended") counts[state] += 1;
    }
    return counts;
  }

  async createLicense(license: License): Promise<void> {
    await this.run((db) => db.insert(schema.licenses).values(license));
  }

  async getLicenseById(id: string): Promise<License | null> {
    const rows = await this.run((db) => db.select().from(schema.licenses).where(eq(schema.licenses.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async getLicenseForApp(clientId: string, appId: string | null): Promise<License | null> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.licenses)
        .where(and(eq(schema.licenses.clientId, clientId), appId === null ? isNull(schema.licenses.appId) : eq(schema.licenses.appId, appId), liveLicense()))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async listLicensesByClient(clientId: string): Promise<License[]> {
    return this.run((db) =>
      db.select().from(schema.licenses).where(and(eq(schema.licenses.clientId, clientId), liveLicense())).orderBy(asc(schema.licenses.createdAt)),
    );
  }

  async getLicenseByHash(keyHash: string): Promise<License | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.licenses).where(and(eq(schema.licenses.keyHash, keyHash), liveLicense())).limit(1),
    );
    return rows[0] ?? null;
  }

  async updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.licenses).set({ ...patch, updatedAt: now }).where(eq(schema.licenses.id, id)));
  }

  async listLicensesEndedBetween(from: Date, to: Date): Promise<License[]> {
    const t = schema.licenses;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(isNotNull(t.appId), gt(t.expiresAt, from), lte(t.expiresAt, to), liveLicense()))
        .orderBy(asc(t.expiresAt)),
    );
  }

  async claimLicenseEndRefresh(licenseId: string, expiresAt: Date, now: Date): Promise<boolean> {
    if (expiresAt.getTime() > now.getTime()) return false;
    const t = schema.licenses;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set({ endRefreshedFor: expiresAt })
        .where(and(eq(t.id, licenseId), eq(t.expiresAt, expiresAt), or(isNull(t.endRefreshedFor), not(eq(t.endRefreshedFor, expiresAt))))),
    );
    return result.affectedRows === 1;
  }

  async getActivation(licenseId: string): Promise<Activation | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.activations).where(eq(schema.activations.licenseId, licenseId)).limit(1),
    );
    return rows[0] ?? null;
  }

  async claimActivation(activation: Activation): Promise<ClaimResult> {
    const [result] = await this.run((db) => db.insert(schema.activations).ignore().values(activation));
    if (result.affectedRows === 1) return { ok: true, activation };
    const existing = await this.getActivation(activation.licenseId);
    if (!existing) {
      // Released between the insert and the read: try once more.
      const [retry] = await this.run((db) => db.insert(schema.activations).ignore().values(activation));
      if (retry.affectedRows === 1) return { ok: true, activation };
      const current = await this.getActivation(activation.licenseId);
      if (!current) throw new Error("Could not record the activation");
      return current.siteUrl === activation.siteUrl ? { ok: true, activation: current } : { ok: false, existing: current };
    }
    if (existing.siteUrl !== activation.siteUrl) return { ok: false, existing };
    const patch = {
      siteUrlRaw: activation.siteUrlRaw,
      pluginVersion: activation.pluginVersion,
      wpVersion: activation.wpVersion,
      lms: activation.lms,
      store: activation.store,
      bookings: activation.bookings,
      lastCheckedAt: activation.lastCheckedAt,
    };
    await this.run((db) =>
      db.update(schema.activations).set(patch).where(eq(schema.activations.licenseId, activation.licenseId)),
    );
    return { ok: true, activation: { ...existing, ...patch } };
  }

  async touchActivation(
    licenseId: string,
    patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "store" | "bookings" | "lastCheckedAt">,
  ): Promise<void> {
    await this.run((db) => db.update(schema.activations).set(patch).where(eq(schema.activations.licenseId, licenseId)));
  }

  async deleteActivation(licenseId: string): Promise<void> {
    await this.run((db) => db.delete(schema.activations).where(eq(schema.activations.licenseId, licenseId)));
  }

  async createApp(app: App): Promise<void> {
    await this.run((db) =>
      db.transaction(async (tx) => {
        // Locks the account's row, so two apps created at once can't both be "the first".
        await tx.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.id, app.clientId)).for("update");
        // 103R.3 A Studio project is on Studio's own plans: only the first regular app takes what came before it.
        const [existing] = await tx.select({ n: count() }).from(schema.apps).where(and(eq(schema.apps.clientId, app.clientId), ne(schema.apps.section, "studio")));
        await tx.insert(schema.apps).values(app);
        if (app.section === "studio" || Number(existing?.n ?? 0) > 0) return;
        // The account's first app takes what was paid and given before it existed.
        await tx
          .update(schema.licenses)
          .set({ appId: app.id })
          .where(and(eq(schema.licenses.clientId, app.clientId), isNull(schema.licenses.appId)));
        await tx
          .update(schema.planPayments)
          .set({ appId: app.id })
          .where(and(eq(schema.planPayments.clientId, app.clientId), isNull(schema.planPayments.appId)));
      }),
    );
  }

  async listAppsByClient(clientId: string): Promise<App[]> {
    return this.run((db) =>
      db.select().from(schema.apps).where(and(eq(schema.apps.clientId, clientId), liveApp())).orderBy(asc(schema.apps.createdAt), asc(schema.apps.id)),
    );
  }

  async getAppById(id: string): Promise<App | null> {
    const rows = await this.run((db) => db.select().from(schema.apps).where(and(eq(schema.apps.id, id), liveApp())).limit(1));
    return rows[0] ?? null;
  }

  async updateApp(id: string, patch: AppPatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.apps).set({ ...patch, updatedAt: now }).where(and(eq(schema.apps.id, id), liveApp())));
  }

  async saveSigningKeys(appId: string, keys: SigningKeysPatch, now: Date): Promise<boolean> {
    const columns = Object.keys(keys) as SigningKeyColumn[];
    if (columns.length === 0) return false;
    // `... is null` on every column in the same statement: a key that is already saved is never replaced.
    const [result] = await this.run((db) =>
      db
        .update(schema.apps)
        .set({ ...keys, updatedAt: now })
        .where(and(eq(schema.apps.id, appId), ...columns.map((column) => isNull(schema.apps[column])))),
    );
    return result.affectedRows === 1;
  }

  async createBuild(input: Omit<Build, "number" | "versionCode">, options: { exclusive?: boolean } = {}): Promise<Build> {
    return this.run((db) =>
      db.transaction(async (tx) => {
        if (options.exclusive) {
          // A locking read: a second "Start new build" for the same app waits here, then sees the first one.
          const running = await tx
            .select({ id: schema.builds.id })
            .from(schema.builds)
            .where(and(eq(schema.builds.appId, input.appId), inArray(schema.builds.status, ["queued", "building"])))
            .limit(1)
            .for("update");
          if (running.length > 0) throw new BuildRunningError();
        }
        const [previous] = await tx
          .select({
            number: sql<number | null>`max(${schema.builds.number})`,
            versionCode: sql<number | null>`max(${schema.builds.versionCode})`,
          })
          .from(schema.builds)
          .where(eq(schema.builds.appId, input.appId))
          .for("update");
        const number = Number(previous?.number ?? 0) + 1;
        const versionCode = Number(previous?.versionCode ?? 0) + 1;
        const build: Build = { ...input, number, versionCode, config: { ...input.config, version_code: versionCode } };
        await tx.insert(schema.builds).values({
          ...build,
          config: build.config as unknown as Record<string, unknown>,
          storeListing: build.storeListing as unknown as Record<string, string>,
        });
        return build;
      }),
    );
  }

  async getBuild(id: string): Promise<Build | null> {
    const rows = await this.run((db) => db.select().from(schema.builds).where(eq(schema.builds.id, id)).limit(1));
    return rows[0] ? toBuild(rows[0]) : null;
  }

  async listBuildsByApp(appId: string, limit: number, variant: BuildVariant | "all" = "app"): Promise<Build[]> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.builds)
        .where(and(eq(schema.builds.appId, appId), variant === "all" ? undefined : eq(schema.builds.variant, variant)))
        .orderBy(desc(schema.builds.number))
        .limit(limit),
    );
    return rows.map(toBuild);
  }

  async listBuilds(input: { status?: BuildStatus; limit: number; newestFirst?: boolean }): Promise<Build[]> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.builds)
        .where(input.status ? eq(schema.builds.status, input.status) : undefined)
        .orderBy(input.newestFirst ? desc(schema.builds.createdAt) : asc(schema.builds.createdAt))
        .limit(input.limit),
    );
    return rows.map(toBuild);
  }

  async updateBuild(id: string, patch: BuildPatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.builds).set({ ...patch, updatedAt: now }).where(eq(schema.builds.id, id)));
  }

  async createRelease(release: PluginRelease): Promise<void> {
    await this.run((db) => db.insert(schema.pluginReleases).values(release));
  }

  async getRelease(id: string): Promise<PluginRelease | null> {
    const rows = await this.run((db) => db.select().from(schema.pluginReleases).where(eq(schema.pluginReleases.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async getReleaseByVersion(version: string): Promise<PluginRelease | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.pluginReleases).where(eq(schema.pluginReleases.version, version)).limit(1),
    );
    return rows[0] ?? null;
  }

  async listReleases(): Promise<PluginRelease[]> {
    return this.run((db) => db.select().from(schema.pluginReleases).orderBy(desc(schema.pluginReleases.createdAt)));
  }

  async updateRelease(id: string, patch: ReleasePatch): Promise<void> {
    await this.run((db) => db.update(schema.pluginReleases).set(patch).where(eq(schema.pluginReleases.id, id)));
  }

  async deleteRelease(id: string): Promise<void> {
    await this.run((db) => db.delete(schema.pluginReleases).where(eq(schema.pluginReleases.id, id)));
  }

  async createAsset(asset: Asset): Promise<void> {
    await this.run((db) => db.insert(schema.assets).values(asset));
  }

  async getAsset(id: string): Promise<Asset | null> {
    const rows = await this.run((db) => db.select().from(schema.assets).where(eq(schema.assets.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async listAssetsByClient(clientId: string): Promise<Asset[]> {
    return this.run((db) => db.select().from(schema.assets).where(eq(schema.assets.clientId, clientId)));
  }

  async deleteAsset(id: string): Promise<void> {
    await this.run((db) => db.delete(schema.assets).where(eq(schema.assets.id, id)));
  }

  async createResetToken(token: ResetToken): Promise<void> {
    await this.run((db) => db.insert(schema.resetTokens).values(token));
  }

  async getResetToken(tokenHash: string): Promise<ResetToken | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.resetTokens).where(eq(schema.resetTokens.tokenHash, tokenHash)).limit(1),
    );
    return rows[0] ?? null;
  }

  async consumeResetToken(tokenHash: string, now: Date): Promise<boolean> {
    const [result] = await this.run((db) =>
      db
        .update(schema.resetTokens)
        .set({ usedAt: now })
        .where(and(eq(schema.resetTokens.tokenHash, tokenHash), isNull(schema.resetTokens.usedAt))),
    );
    return result.affectedRows === 1;
  }

  async createHostedUser(input: {
    appId: string;
    phone: string | null;
    name: string;
    email: string | null;
    city: string | null;
    now: Date;
  }): Promise<HostedUser | null> {
    const row = {
      appId: input.appId,
      phone: input.phone,
      name: input.name,
      email: input.email,
      city: input.city,
      notificationsReadAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    };
    // 18 An email account: one per address (no unique index, so emails typed at phone sign-up never clash).
    if (input.phone === null && (!input.email || (await this.getHostedEmailUser(input.appId, input.email)))) return null;
    try {
      const [result] = await this.run((db) => db.insert(schema.hostedUsers).values(row));
      return { id: Number(result.insertId), ...row };
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return null;
      throw error;
    }
  }

  async getHostedUser(appId: string, id: number): Promise<HostedUser | null> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.hostedUsers)
        .where(and(eq(schema.hostedUsers.appId, appId), eq(schema.hostedUsers.id, id)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async getHostedUserByPhone(appId: string, phone: string): Promise<HostedUser | null> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.hostedUsers)
        .where(and(eq(schema.hostedUsers.appId, appId), eq(schema.hostedUsers.phone, phone)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async getHostedEmailUser(appId: string, email: string): Promise<HostedUser | null> {
    const t = schema.hostedUsers;
    const rows = await this.run((db) =>
      db.select().from(t).where(and(eq(t.appId, appId), isNull(t.phone), eq(t.email, email))).orderBy(asc(t.id)).limit(1),
    );
    return rows[0] ?? null;
  }

  async updateHostedUser(appId: string, id: number, patch: HostedUserPatch, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.hostedUsers)
        .set({ ...patch, updatedAt: now })
        .where(and(eq(schema.hostedUsers.appId, appId), eq(schema.hostedUsers.id, id))),
    );
  }

  async deleteHostedUser(appId: string, id: number): Promise<void> {
    // Devices, refresh tokens and the customer's own notifications cascade.
    await this.run((db) =>
      db.delete(schema.hostedUsers).where(and(eq(schema.hostedUsers.appId, appId), eq(schema.hostedUsers.id, id))),
    );
  }

  async createHostedDevice(device: HostedDevice): Promise<void> {
    await this.run((db) => db.insert(schema.hostedDevices).values(device));
  }

  async getHostedDevice(appId: string, id: string): Promise<HostedDevice | null> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.hostedDevices)
        .where(and(eq(schema.hostedDevices.appId, appId), eq(schema.hostedDevices.id, id)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async findHostedDevice(appId: string, userId: number, deviceId: string): Promise<HostedDevice | null> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.hostedDevices)
        .where(
          and(
            eq(schema.hostedDevices.appId, appId),
            eq(schema.hostedDevices.userId, userId),
            eq(schema.hostedDevices.deviceId, deviceId),
          ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async listHostedDevices(appId: string, userId: number): Promise<HostedDevice[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.hostedDevices)
        .where(and(eq(schema.hostedDevices.appId, appId), eq(schema.hostedDevices.userId, userId)))
        .orderBy(desc(schema.hostedDevices.lastSeenAt)),
    );
  }

  async updateHostedDevice(appId: string, id: string, patch: HostedDevicePatch): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.hostedDevices)
        .set(patch)
        .where(and(eq(schema.hostedDevices.appId, appId), eq(schema.hostedDevices.id, id))),
    );
  }

  async listAppHostedDevices(appId: string): Promise<HostedDevice[]> {
    return this.run((db) => db.select().from(schema.hostedDevices).where(eq(schema.hostedDevices.appId, appId)));
  }

  async listHostedUserIds(appId: string): Promise<{ id: number; createdAt: Date }[]> {
    return this.run((db) => db.select({ id: schema.hostedUsers.id, createdAt: schema.hostedUsers.createdAt }).from(schema.hostedUsers).where(eq(schema.hostedUsers.appId, appId)));
  }

  async listAudienceUserIds(input: { appId: string; who: "buyers" | "students" | "members"; courseId?: number | null; now: Date }): Promise<number[]> {
    const rows: { userId: number | null }[] = await this.run((db) => {
      if (input.who === "buyers") {
        return db
          .selectDistinct({ userId: schema.catalogOrders.userId })
          .from(schema.catalogOrders)
          .where(and(eq(schema.catalogOrders.appId, input.appId), isNotNull(schema.catalogOrders.userId), isNotNull(schema.catalogOrders.paidAt)));
      }
      if (input.who === "students") {
        return db
          .selectDistinct({ userId: schema.courseEnrollments.userId })
          .from(schema.courseEnrollments)
          .where(and(eq(schema.courseEnrollments.appId, input.appId), input.courseId == null ? undefined : eq(schema.courseEnrollments.courseId, input.courseId)));
      }
      return db
        .selectDistinct({ userId: schema.memberships.userId })
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.appId, input.appId),
            eq(schema.memberships.status, "active"),
            or(isNull(schema.memberships.endsAt), gt(schema.memberships.endsAt, input.now)),
          ),
        );
    });
    return rows.flatMap((r) => (r.userId === null ? [] : [Number(r.userId)])).sort((a, b) => a - b);
  }

  async deleteHostedDevice(appId: string, id: string): Promise<void> {
    // Its refresh tokens cascade.
    await this.run((db) =>
      db.delete(schema.hostedDevices).where(and(eq(schema.hostedDevices.appId, appId), eq(schema.hostedDevices.id, id))),
    );
  }

  async listHostedPushDevices(appId: string, userIds: number[] | null): Promise<HostedDevice[]> {
    if (userIds !== null && userIds.length === 0) return [];
    return this.run((db) =>
      db
        .select()
        .from(schema.hostedDevices)
        .where(
          and(
            eq(schema.hostedDevices.appId, appId),
            isNotNull(schema.hostedDevices.pushToken),
            userIds === null ? undefined : inArray(schema.hostedDevices.userId, userIds),
          ),
        ),
    );
  }

  async clearHostedPushToken(appId: string, token: string): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.hostedDevices)
        .set({ pushToken: null })
        .where(and(eq(schema.hostedDevices.appId, appId), eq(schema.hostedDevices.pushToken, token))),
    );
  }

  async createHostedRefreshToken(token: HostedRefreshToken): Promise<void> {
    await this.run((db) => db.insert(schema.hostedRefreshTokens).values(token));
  }

  async takeHostedRefreshToken(tokenHash: string): Promise<HostedRefreshToken | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.hostedRefreshTokens).where(eq(schema.hostedRefreshTokens.tokenHash, tokenHash)).limit(1),
    );
    const token = rows[0];
    if (!token) return null;
    // Whoever deletes the row owns the token: a replay racing this one gets nothing.
    const [result] = await this.run((db) =>
      db.delete(schema.hostedRefreshTokens).where(eq(schema.hostedRefreshTokens.tokenHash, tokenHash)),
    );
    return result.affectedRows === 1 ? token : null;
  }

  async createHostedChallenge(challenge: HostedChallenge): Promise<void> {
    await this.run((db) => db.insert(schema.hostedChallenges).values(challenge));
  }

  async getHostedChallenge(tokenHash: string): Promise<HostedChallenge | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.hostedChallenges).where(eq(schema.hostedChallenges.tokenHash, tokenHash)).limit(1),
    );
    return rows[0] ?? null;
  }

  async addHostedChallengeAttempt(tokenHash: string): Promise<number> {
    await this.run((db) =>
      db
        .update(schema.hostedChallenges)
        .set({ attempts: sql`${schema.hostedChallenges.attempts} + 1` })
        .where(eq(schema.hostedChallenges.tokenHash, tokenHash)),
    );
    const challenge = await this.getHostedChallenge(tokenHash);
    return challenge ? challenge.attempts : Number.MAX_SAFE_INTEGER;
  }

  async deleteHostedChallenge(tokenHash: string): Promise<void> {
    await this.run((db) => db.delete(schema.hostedChallenges).where(eq(schema.hostedChallenges.tokenHash, tokenHash)));
  }

  async purgeHostedExpired(now: Date): Promise<void> {
    await this.run((db) => db.delete(schema.hostedChallenges).where(lte(schema.hostedChallenges.expiresAt, now)));
    await this.run((db) => db.delete(schema.hostedRefreshTokens).where(lte(schema.hostedRefreshTokens.expiresAt, now)));
  }

  async createHostedNotification(input: Omit<HostedNotification, "id">): Promise<HostedNotification> {
    const [result] = await this.run((db) => db.insert(schema.hostedNotifications).values(input));
    return { id: Number(result.insertId), ...input };
  }

  private hostedInboxWhere(appId: string, userId: number) {
    const n = schema.hostedNotifications;
    const r = schema.hostedNotificationRecipients;
    return and(
      eq(n.appId, appId),
      or(
        eq(n.userId, userId),
        and(isNull(n.userId), eq(n.targeted, false)),
        // 85.2 A campaign to some people: theirs only.
        and(isNull(n.userId), eq(n.targeted, true), sql`exists (select 1 from ${r} where ${r.notificationId} = ${n.id} and ${r.userId} = ${userId})`),
      ),
    );
  }

  async listHostedNotifications(input: {
    appId: string;
    userId: number;
    since: Date;
    page: number;
    perPage: number;
  }): Promise<{ items: HostedNotification[]; total: number }> {
    const where = and(this.hostedInboxWhere(input.appId, input.userId), gte(schema.hostedNotifications.createdAt, input.since));
    const [items, totals] = await Promise.all([
      this.run((db) =>
        db
          .select()
          .from(schema.hostedNotifications)
          .where(where)
          .orderBy(desc(schema.hostedNotifications.createdAt), desc(schema.hostedNotifications.id))
          .limit(input.perPage)
          .offset((input.page - 1) * input.perPage),
      ),
      this.run((db) => db.select({ n: count() }).from(schema.hostedNotifications).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }

  async countHostedNotificationsAfter(input: { appId: string; userId: number; after: Date }): Promise<number> {
    const rows = await this.run((db) =>
      db
        .select({ n: count() })
        .from(schema.hostedNotifications)
        .where(and(this.hostedInboxWhere(input.appId, input.userId), gt(schema.hostedNotifications.createdAt, input.after))),
    );
    return rows[0]?.n ?? 0;
  }

  async listHostedBroadcasts(appId: string, limit: number): Promise<HostedNotification[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.hostedNotifications)
        .where(and(eq(schema.hostedNotifications.appId, appId), isNull(schema.hostedNotifications.userId), eq(schema.hostedNotifications.targeted, false)))
        .orderBy(desc(schema.hostedNotifications.createdAt), desc(schema.hostedNotifications.id))
        .limit(limit),
    );
  }

  async addHostedNotificationRecipients(appId: string, notificationId: number, userIds: number[]): Promise<void> {
    const ids = [...new Set(userIds)];
    for (let i = 0; i < ids.length; i += 1000) {
      const batch = ids.slice(i, i + 1000).map((userId) => ({ notificationId, appId, userId }));
      await this.run((db) => db.insert(schema.hostedNotificationRecipients).ignore().values(batch));
    }
  }

  async countHostedUsers(appId: string): Promise<number> {
    const rows = await this.run((db) =>
      db.select({ n: count() }).from(schema.hostedUsers).where(eq(schema.hostedUsers.appId, appId)),
    );
    return rows[0]?.n ?? 0;
  }

  async countHostedEmailOnlyUsers(appId: string): Promise<number> {
    const rows = await this.run((db) =>
      db
        .select({ n: count() })
        .from(schema.hostedUsers)
        .where(and(eq(schema.hostedUsers.appId, appId), isNull(schema.hostedUsers.phone))),
    );
    return rows[0]?.n ?? 0;
  }

  // 34 Keys that sign own API apps' access tokens

  async listAppAuthKeys(appId: string): Promise<AppAuthKey[]> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.appAuthKeys)
        .where(eq(schema.appAuthKeys.appId, appId))
        .orderBy(desc(schema.appAuthKeys.createdAt), desc(schema.appAuthKeys.kid)),
    );
    return rows.map((row) => ({ ...row, alg: "ES256" as const }));
  }

  async createAppAuthKey(key: AppAuthKey): Promise<void> {
    await this.run((db) => db.insert(schema.appAuthKeys).values(key));
  }

  async retireAppAuthKeys(appId: string, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.appAuthKeys)
        .set({ retiredAt: now, privateKeyEncrypted: null })
        .where(and(eq(schema.appAuthKeys.appId, appId), isNull(schema.appAuthKeys.retiredAt))),
    );
  }

  async deleteAppAuthKeysRetiredBefore(appId: string, before: Date): Promise<void> {
    await this.run((db) =>
      db.delete(schema.appAuthKeys).where(and(eq(schema.appAuthKeys.appId, appId), isNotNull(schema.appAuthKeys.retiredAt), lt(schema.appAuthKeys.retiredAt, before))),
    );
  }

  // Catalog

  async listCatalogCategories(appId: string): Promise<CatalogCategory[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.catalogCategories)
        .where(eq(schema.catalogCategories.appId, appId))
        .orderBy(asc(schema.catalogCategories.position), asc(schema.catalogCategories.id)),
    );
  }

  async createCatalogCategory(input: { appId: string; name: string; now: Date }): Promise<CatalogCategory> {
    const rows = await this.run((db) =>
      db
        .select({ next: sql<number | null>`max(${schema.catalogCategories.position}) + 1` })
        .from(schema.catalogCategories)
        .where(eq(schema.catalogCategories.appId, input.appId)),
    );
    const values = { appId: input.appId, name: input.name, position: Number(rows[0]?.next ?? 0), createdAt: input.now };
    const [result] = await this.run((db) => db.insert(schema.catalogCategories).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async renameCatalogCategory(appId: string, id: number, name: string): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.catalogCategories)
        .set({ name })
        .where(and(eq(schema.catalogCategories.appId, appId), eq(schema.catalogCategories.id, id))),
    );
  }

  async deleteCatalogCategory(appId: string, id: number, now: Date): Promise<void> {
    await this.run((db) =>
      db.delete(schema.catalogCategories).where(and(eq(schema.catalogCategories.appId, appId), eq(schema.catalogCategories.id, id))),
    );
    for (const product of await this.listCatalogProducts(appId)) {
      if (product.categoryIds.includes(id)) {
        await this.updateCatalogProduct(appId, product.id, { categoryIds: product.categoryIds.filter((c) => c !== id) }, now);
      }
    }
  }

  async listCatalogProducts(appId: string): Promise<CatalogProduct[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.catalogProducts)
        .where(eq(schema.catalogProducts.appId, appId))
        .orderBy(desc(schema.catalogProducts.createdAt), desc(schema.catalogProducts.id)),
    );
  }

  async getCatalogProduct(appId: string, id: number): Promise<CatalogProduct | null> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.catalogProducts)
        .where(and(eq(schema.catalogProducts.appId, appId), eq(schema.catalogProducts.id, id)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async createCatalogProduct(input: CatalogProductInput, now: Date): Promise<CatalogProduct> {
    const values = { ...input, salesCount: 0, createdAt: now, updatedAt: now };
    const [result] = await this.run((db) => db.insert(schema.catalogProducts).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async updateCatalogProduct(appId: string, id: number, input: Partial<CatalogProductInput>, now: Date): Promise<void> {
    const { appId: _ignored, ...patch } = input;
    void _ignored;
    await this.run((db) =>
      db
        .update(schema.catalogProducts)
        .set({ ...patch, updatedAt: now })
        .where(and(eq(schema.catalogProducts.appId, appId), eq(schema.catalogProducts.id, id))),
    );
  }

  async deleteCatalogProduct(appId: string, id: number): Promise<void> {
    await this.run((db) =>
      db.delete(schema.catalogProducts).where(and(eq(schema.catalogProducts.appId, appId), eq(schema.catalogProducts.id, id))),
    );
  }

  async listCatalogCoupons(appId: string): Promise<CatalogCoupon[]> {
    const t = schema.catalogCoupons;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(desc(t.id)));
  }

  async getCatalogCouponByCode(appId: string, code: string): Promise<CatalogCoupon | null> {
    const t = schema.catalogCoupons;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.code, code))).limit(1));
    return row ?? null;
  }

  async createCatalogCoupon(input: Omit<CatalogCoupon, "id" | "usedCount">): Promise<CatalogCoupon | null> {
    try {
      const [result] = await this.run((db) => db.insert(schema.catalogCoupons).values({ ...input, usedCount: 0 }));
      return { id: Number(result.insertId), ...input, usedCount: 0 };
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return null;
      throw error;
    }
  }

  async setCatalogCouponActive(appId: string, id: number, active: boolean): Promise<void> {
    const t = schema.catalogCoupons;
    await this.run((db) => db.update(t).set({ active }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteCatalogCoupon(appId: string, id: number): Promise<void> {
    const t = schema.catalogCoupons;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async useCatalogCoupon(appId: string, id: number): Promise<boolean> {
    const t = schema.catalogCoupons;
    // One statement, so two orders paid at once can't both take the last use.
    const [done] = await this.run((db) =>
      db
        .update(t)
        .set({ usedCount: sql`${t.usedCount} + 1` })
        .where(and(eq(t.appId, appId), eq(t.id, id), or(isNull(t.maxUses), lt(t.usedCount, t.maxUses)))),
    );
    return done.affectedRows > 0;
  }

  async createCatalogOrder(input: Omit<CatalogOrder, "id">): Promise<CatalogOrder> {
    const [result] = await this.run((db) => db.insert(schema.catalogOrders).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getCatalogOrder(appId: string, id: number): Promise<CatalogOrder | null> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.catalogOrders)
        .where(and(eq(schema.catalogOrders.appId, appId), eq(schema.catalogOrders.id, id)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async getCatalogOrderByToken(tokenHash: string): Promise<CatalogOrder | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.catalogOrders).where(eq(schema.catalogOrders.tokenHash, tokenHash)).limit(1),
    );
    return rows[0] ?? null;
  }

  async updateCatalogOrder(appId: string, id: number, patch: CatalogOrderPatch): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.catalogOrders)
        .set(patch)
        .where(and(eq(schema.catalogOrders.appId, appId), eq(schema.catalogOrders.id, id))),
    );
  }

  async payCatalogOrder(appId: string, id: number, paymentId: string, now: Date): Promise<boolean> {
    return this.run((db) =>
      db.transaction(async (tx) => {
        const [result] = await tx
          .update(schema.catalogOrders)
          .set({ status: "processing", paymentId, paidAt: now, updatedAt: now })
          .where(
            and(eq(schema.catalogOrders.appId, appId), eq(schema.catalogOrders.id, id), eq(schema.catalogOrders.status, "pending")),
          );
        if (result.affectedRows !== 1) return false;
        const [order] = await tx.select().from(schema.catalogOrders).where(eq(schema.catalogOrders.id, id)).limit(1);
        for (const line of order?.lines ?? []) {
          await tx
            .update(schema.catalogProducts)
            .set({
              salesCount: sql`${schema.catalogProducts.salesCount} + ${line.quantity}`,
              stock: sql`case when ${schema.catalogProducts.stock} is null then null else greatest(${schema.catalogProducts.stock} - ${line.quantity}, 0) end`,
            })
            .where(and(eq(schema.catalogProducts.appId, appId), eq(schema.catalogProducts.id, line.productId)));
          // 91.5 The variation's own stock, in the product's row (locked while it changes).
          if (line.variantId !== undefined) {
            const [row] = await tx
              .select({ variants: schema.catalogProducts.variants })
              .from(schema.catalogProducts)
              .where(and(eq(schema.catalogProducts.appId, appId), eq(schema.catalogProducts.id, line.productId)))
              .for("update");
            const variant = row?.variants?.items.find((v) => v.id === line.variantId);
            if (row?.variants && variant && variant.stock !== null) {
              variant.stock = Math.max(0, variant.stock - line.quantity);
              await tx
                .update(schema.catalogProducts)
                .set({ variants: row.variants })
                .where(and(eq(schema.catalogProducts.appId, appId), eq(schema.catalogProducts.id, line.productId)));
            }
          }
        }
        return true;
      }),
    );
  }

  async listCatalogOrders(input: {
    appId: string;
    userId?: number;
    statuses?: CatalogOrderStatus[];
    manualOnly?: boolean;
    awaitingManual?: boolean;
    offset: number;
    limit: number;
  }): Promise<{ items: CatalogOrder[]; total: number }> {
    const t = schema.catalogOrders;
    const statuses = input.statuses ? inArray(t.status, input.statuses) : undefined;
    const where = and(
      eq(t.appId, input.appId),
      input.userId !== undefined ? eq(t.userId, input.userId) : undefined,
      statuses && input.awaitingManual ? or(statuses, and(eq(t.status, "pending"), isNotNull(t.manualPayment))) : statuses,
      input.manualOnly ? isNotNull(schema.catalogOrders.manualPayment) : undefined,
    );
    const [items, totals] = await Promise.all([
      this.run((db) =>
        db
          .select()
          .from(schema.catalogOrders)
          .where(where)
          .orderBy(desc(schema.catalogOrders.createdAt), desc(schema.catalogOrders.id))
          .limit(input.limit)
          .offset(input.offset),
      ),
      this.run((db) => db.select({ n: count() }).from(schema.catalogOrders).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }

  // 47 Refunds

  async recordRefund(input: Omit<PaymentRefund, "id">): Promise<PaymentRefund | null> {
    if (input.amountCents <= 0) return null;
    const now = input.createdAt;
    return this.run((db) =>
      db.transaction(async (tx) => {
        if (input.kind === "order") {
          const o = schema.catalogOrders;
          // The total is checked in the same statement: two refunds at once never refund more than was paid.
          const [result] = await tx
            .update(o)
            .set({
              refundedCents: sql`${o.refundedCents} + ${input.amountCents}`,
              status: sql`case when ${o.refundedCents} + ${input.amountCents} = ${o.totalCents} then 'refunded' else ${o.status} end`,
              ...(input.commissionCents ? { commissionCents: sql`case when ${o.commissionCents} is null then null else greatest(cast(${o.commissionCents} as signed) - ${input.commissionCents}, 0) end` } : {}),
              updatedAt: now,
            })
            .where(and(eq(o.appId, input.appId), eq(o.id, input.targetId), sql`${o.refundedCents} + ${input.amountCents} <= ${o.totalCents}`));
          if (result.affectedRows !== 1) return null;
        } else {
          const d = schema.donations;
          const c = schema.campaigns;
          const [donation] = await tx
            .select()
            .from(d)
            .where(and(eq(d.appId, input.appId), eq(d.id, input.targetId)))
            .for("update");
          if (!donation || (donation.status !== "paid" && donation.status !== "refunded")) return null;
          const refunded = donation.refundedCents + input.amountCents;
          if (refunded > donation.amountCents) return null;
          const full = refunded === donation.amountCents;
          await tx
            .update(d)
            .set({ refundedCents: refunded, updatedAt: now, ...(full ? { status: "refunded" as const } : {}) })
            .where(eq(d.id, donation.id));
          if (donation.campaignId !== null) {
            const [another] =
              donation.donorEmail === null
                ? [{ n: 0 }]
                : await tx
                    .select({ n: count() })
                    .from(d)
                    .where(
                      and(
                        eq(d.appId, input.appId),
                        eq(d.campaignId, donation.campaignId),
                        eq(d.status, "paid"),
                        eq(d.donorEmail, donation.donorEmail),
                        not(eq(d.id, donation.id)),
                      ),
                    );
            await tx
              .update(c)
              .set({
                raisedCents: sql`greatest(cast(${c.raisedCents} as signed) - ${input.amountCents}, 0)`,
                ...(full && (another?.n ?? 0) === 0 ? { donorCount: sql`greatest(cast(${c.donorCount} as signed) - 1, 0)` } : {}),
              })
              .where(and(eq(c.appId, input.appId), eq(c.id, donation.campaignId)));
          }
        }
        const [result] = await tx.insert(schema.paymentRefunds).values(input);
        return { id: Number(result.insertId), ...input };
      }),
    );
  }

  async listRefunds(appId: string, kind: RefundKind, targetIds: number[]): Promise<PaymentRefund[]> {
    if (targetIds.length === 0) return [];
    const t = schema.paymentRefunds;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.kind, kind), inArray(t.targetId, targetIds)))
        .orderBy(asc(t.createdAt), asc(t.id)),
    );
  }

  // Platform settings

  async createBookingAppointment(input: Omit<BookingAppointment, "id">): Promise<BookingAppointment | null> {
    return this.run((db) =>
      db.transaction(async (tx) => {
        // One booking at a time per app: the app's row is the lock.
        await tx.select({ id: schema.apps.id }).from(schema.apps).where(eq(schema.apps.id, input.appId)).for("update");
        const [clash] = await tx
          .select({ id: schema.bookingAppointments.id })
          .from(schema.bookingAppointments)
          .where(
            and(
              eq(schema.bookingAppointments.appId, input.appId),
              eq(schema.bookingAppointments.staffId, input.staffId),
              inArray(schema.bookingAppointments.status, ACTIVE_BOOKING_STATUSES),
              lt(schema.bookingAppointments.startAt, input.endAt),
              gt(schema.bookingAppointments.endAt, input.startAt),
            ),
          )
          .limit(1);
        if (clash) return null;
        const [result] = await tx.insert(schema.bookingAppointments).values(input);
        return { ...input, id: Number(result.insertId) };
      }),
    );
  }

  async getBookingAppointment(appId: string, id: number): Promise<BookingAppointment | null> {
    const [row] = await this.run((db) =>
      db
        .select()
        .from(schema.bookingAppointments)
        .where(and(eq(schema.bookingAppointments.appId, appId), eq(schema.bookingAppointments.id, id)))
        .limit(1),
    );
    return row ?? null;
  }

  async updateBookingAppointment(appId: string, id: number, patch: BookingAppointmentPatch): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.bookingAppointments)
        .set(patch)
        .where(and(eq(schema.bookingAppointments.appId, appId), eq(schema.bookingAppointments.id, id))),
    );
  }

  async listBookingAppointments(input: {
    appId: string;
    userId?: number;
    scope?: { kind: "upcoming" | "past"; now: Date };
    statuses?: BookingStatus[];
    startFrom?: Date;
    startBefore?: Date;
    offset: number;
    limit: number;
  }): Promise<{ items: BookingAppointment[]; total: number }> {
    const t = schema.bookingAppointments;
    const upcoming = input.scope ? and(inArray(t.status, ACTIVE_BOOKING_STATUSES), gte(t.startAt, input.scope.now)) : undefined;
    const where = and(
      eq(t.appId, input.appId),
      input.userId !== undefined ? eq(t.userId, input.userId) : undefined,
      input.statuses ? inArray(t.status, input.statuses) : undefined,
      input.startFrom ? gte(t.startAt, input.startFrom) : undefined,
      input.startBefore ? lt(t.startAt, input.startBefore) : undefined,
      input.scope ? (input.scope.kind === "upcoming" ? upcoming : not(upcoming!)) : undefined,
    );
    const past = input.scope?.kind === "past";
    const [items, totals] = await Promise.all([
      this.run((db) =>
        db
          .select()
          .from(t)
          .where(where)
          .orderBy(past ? desc(t.startAt) : asc(t.startAt), asc(t.id))
          .limit(input.limit)
          .offset(input.offset),
      ),
      this.run((db) => db.select({ n: count() }).from(t).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }

  // 27 Classes and memberships

  async createClassSession(input: Omit<ClassSession, "id">): Promise<ClassSession | null> {
    // The unique key (app, timetable entry, start) makes a class once, also when two runs make the same weeks.
    const [result] = await this.run((db) => db.insert(schema.classSessions).ignore().values(input));
    return result.affectedRows === 1 ? { ...input, id: Number(result.insertId) } : null;
  }

  async getClassSession(appId: string, id: number): Promise<ClassSession | null> {
    const t = schema.classSessions;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async listClassSessions(input: { appId: string; startFrom?: Date; startBefore?: Date }): Promise<ClassSession[]> {
    const t = schema.classSessions;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(
          and(eq(t.appId, input.appId), input.startFrom ? gte(t.startAt, input.startFrom) : undefined, input.startBefore ? lt(t.startAt, input.startBefore) : undefined),
        )
        .orderBy(asc(t.startAt), asc(t.id))
        .limit(5000),
    );
  }

  async updateClassSession(appId: string, id: number, patch: ClassSessionPatch): Promise<void> {
    const t = schema.classSessions;
    const { capacity, ...rest } = patch;
    await this.run((db) =>
      db
        .update(t)
        .set({ ...rest, ...(capacity !== undefined ? { capacity: sql`greatest(${capacity}, ${t.bookedCount})` } : {}) })
        .where(and(eq(t.appId, appId), eq(t.id, id))),
    );
  }

  async deleteClassSession(appId: string, id: number): Promise<boolean> {
    const t = schema.classSessions;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id), eq(t.bookedCount, 0))));
    return result.affectedRows === 1;
  }

  async bookClass(input: BookClassInput): Promise<BookClassResult> {
    const s = schema.classSessions;
    const b = schema.classBookings;
    const m = schema.memberships;
    return this.run((db) =>
      db.transaction(async (tx) => {
        // The class's row is the lock: one booking of this class at a time.
        const [session] = await tx
          .select()
          .from(s)
          .where(and(eq(s.appId, input.appId), eq(s.id, input.sessionId)))
          .for("update");
        if (!session) return { ok: false, reason: "not_found" } as const;
        const [existing] = await tx
          .select()
          .from(b)
          .where(and(eq(b.sessionId, session.id), eq(b.userId, input.userId)))
          .limit(1);
        if (existing?.status === "booked") return { ok: true, booking: existing, session } as const;
        if (session.status !== "scheduled") return { ok: false, reason: "cancelled" } as const;
        if (session.startAt < input.bookableFrom) return { ok: false, reason: "too_late" } as const;
        if (session.bookedCount >= session.capacity) return { ok: false, reason: "full" } as const;
        let membershipId: number | null = null;
        if (input.membershipRequired) {
          // The customer's memberships are locked too, so two classes booked at once can't both use the last credit.
          const mine = await tx
            .select()
            .from(m)
            .where(and(eq(m.appId, input.appId), eq(m.userId, input.userId)))
            .for("update");
          // 64 Frozen or not on the class's own day.
          const pick = membershipToUse(mine, input.now, session.startAt);
          if (!pick.ok) return { ok: false, reason: pick.reason } as const;
          if (pick.membership.creditsLeft !== null) {
            const [used] = await tx
              .update(m)
              .set({ creditsLeft: sql`${m.creditsLeft} - 1`, updatedAt: input.now })
              .where(and(eq(m.id, pick.membership.id), gt(m.creditsLeft, 0)));
            if (used.affectedRows !== 1) return { ok: false, reason: "no_credits" } as const;
          }
          membershipId = pick.membership.id;
        }
        // Raised only while below the capacity, whatever happened since the read.
        const [taken] = await tx
          .update(s)
          .set({ bookedCount: sql`${s.bookedCount} + 1`, updatedAt: input.now })
          .where(and(eq(s.id, session.id), eq(s.status, "scheduled"), lt(s.bookedCount, s.capacity)));
        // Thrown to roll back the credit used above.
        if (taken.affectedRows !== 1) throw new ClassFullError();
        const fields = {
          membershipId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          status: "booked" as const,
          updatedAt: input.now,
        };
        let booking: ClassBooking;
        if (existing) {
          await tx.update(b).set(fields).where(eq(b.id, existing.id));
          booking = { ...existing, ...fields };
        } else {
          const row = { appId: input.appId, sessionId: session.id, userId: input.userId, createdAt: input.now, ...fields };
          const [inserted] = await tx.insert(b).values(row);
          booking = { ...row, id: Number(inserted.insertId) };
        }
        return { ok: true, booking, session: { ...session, bookedCount: session.bookedCount + 1, updatedAt: input.now } } as const;
      }),
    ).catch((e: unknown) => {
      if (e instanceof ClassFullError) return { ok: false, reason: "full" } as const;
      throw e;
    });
  }

  /** In a transaction: frees a spot and gives its credit back. */
  private async releaseSpot(tx: Parameters<Parameters<Db["transaction"]>[0]>[0], booking: ClassBooking, now: Date): Promise<void> {
    const s = schema.classSessions;
    const m = schema.memberships;
    await tx.update(schema.classBookings).set({ status: "cancelled", updatedAt: now }).where(eq(schema.classBookings.id, booking.id));
    await tx
      .update(s)
      .set({ bookedCount: sql`greatest(${s.bookedCount} - 1, 0)`, updatedAt: now })
      .where(eq(s.id, booking.sessionId));
    if (booking.membershipId !== null) {
      await tx
        .update(m)
        .set({ creditsLeft: sql`${m.creditsLeft} + 1`, updatedAt: now })
        .where(and(eq(m.id, booking.membershipId), isNotNull(m.creditsLeft)));
    }
  }

  async cancelClassBooking(input: { appId: string; sessionId: number; userId: number; now: Date }): Promise<ClassBooking | null> {
    const b = schema.classBookings;
    return this.run((db) =>
      db.transaction(async (tx) => {
        await tx.select({ id: schema.classSessions.id }).from(schema.classSessions).where(eq(schema.classSessions.id, input.sessionId)).for("update");
        const [booking] = await tx
          .select()
          .from(b)
          .where(and(eq(b.appId, input.appId), eq(b.sessionId, input.sessionId), eq(b.userId, input.userId), eq(b.status, "booked")))
          .for("update");
        if (!booking) return null;
        await this.releaseSpot(tx, booking, input.now);
        return { ...booking, status: "cancelled" as const, updatedAt: input.now };
      }),
    );
  }

  async cancelClassSession(appId: string, id: number, now: Date): Promise<ClassBooking[]> {
    const s = schema.classSessions;
    const b = schema.classBookings;
    return this.run((db) =>
      db.transaction(async (tx) => {
        const [session] = await tx
          .select()
          .from(s)
          .where(and(eq(s.appId, appId), eq(s.id, id)))
          .for("update");
        if (!session || session.status === "cancelled") return [];
        await tx.update(s).set({ status: "cancelled", updatedAt: now }).where(eq(s.id, id));
        const booked = await tx
          .select()
          .from(b)
          .where(and(eq(b.sessionId, id), eq(b.status, "booked")))
          .for("update");
        for (const booking of booked) await this.releaseSpot(tx, booking, now);
        return booked;
      }),
    );
  }

  async listClassBookings(input: { appId: string; sessionIds?: number[]; userId?: number; status?: ClassBookingStatus }): Promise<ClassBooking[]> {
    if (input.sessionIds && input.sessionIds.length === 0) return [];
    const b = schema.classBookings;
    return this.run((db) =>
      db
        .select()
        .from(b)
        .where(
          and(
            eq(b.appId, input.appId),
            input.sessionIds ? inArray(b.sessionId, input.sessionIds) : undefined,
            input.userId !== undefined ? eq(b.userId, input.userId) : undefined,
            input.status ? eq(b.status, input.status) : undefined,
          ),
        )
        .orderBy(asc(b.createdAt), asc(b.id))
        .limit(10_000),
    );
  }

  async createMembership(input: Omit<Membership, "id">): Promise<Membership> {
    const [result] = await this.run((db) => db.insert(schema.memberships).values(input));
    return { ...input, id: Number(result.insertId) };
  }

  async getMembership(appId: string, id: number): Promise<Membership | null> {
    const m = schema.memberships;
    const [row] = await this.run((db) => db.select().from(m).where(and(eq(m.appId, appId), eq(m.id, id))).limit(1));
    return row ?? null;
  }

  async listMemberships(input: { appId: string; userId?: number; limit?: number }): Promise<Membership[]> {
    const m = schema.memberships;
    return this.run((db) =>
      db
        .select()
        .from(m)
        .where(and(eq(m.appId, input.appId), input.userId !== undefined ? eq(m.userId, input.userId) : undefined))
        .orderBy(desc(m.createdAt), desc(m.id))
        .limit(input.limit ?? 500),
    );
  }

  async updateMembership(appId: string, id: number, patch: MembershipPatch): Promise<void> {
    const m = schema.memberships;
    await this.run((db) => db.update(m).set(patch).where(and(eq(m.appId, appId), eq(m.id, id))));
  }

  async addMembershipCredits(appId: string, id: number, credits: number, now: Date): Promise<void> {
    const m = schema.memberships;
    await this.run((db) =>
      db
        .update(m)
        .set({ creditsLeft: sql`greatest(${m.creditsLeft} + ${credits}, 0)`, updatedAt: now })
        .where(and(eq(m.appId, appId), eq(m.id, id), isNotNull(m.creditsLeft))),
    );
  }

  // 63 Members at the door

  async checkInMember(input: Omit<MemberCheckIn, "id">): Promise<{ ok: true; checkIn: MemberCheckIn } | { ok: false; checkIn: MemberCheckIn }> {
    const c = schema.memberCheckIns;
    // The unique key (app, user, day) lets one of two scans at once in; the other reads the row that won.
    const [result] = await this.run((db) => db.insert(c).ignore().values(input));
    if (result.affectedRows === 1) return { ok: true, checkIn: { ...input, id: Number(result.insertId) } };
    const [row] = await this.run((db) =>
      db
        .select()
        .from(c)
        .where(and(eq(c.appId, input.appId), eq(c.userId, input.userId), eq(c.day, input.day)))
        .limit(1),
    );
    if (!row) throw new Error("The check-in was refused but isn't there.");
    return { ok: false, checkIn: row };
  }

  async listMemberCheckIns(appId: string, day: string): Promise<MemberCheckIn[]> {
    const c = schema.memberCheckIns;
    return this.run((db) =>
      db
        .select()
        .from(c)
        .where(and(eq(c.appId, appId), eq(c.day, day)))
        .orderBy(desc(c.at), desc(c.id))
        .limit(2000),
    );
  }

  async countMemberCheckInsOnDay(appId: string, day: string): Promise<number> {
    const c = schema.memberCheckIns;
    const [row] = await this.run((db) =>
      db
        .select({ n: count() })
        .from(c)
        .where(and(eq(c.appId, appId), eq(c.day, day))),
    );
    return Number(row?.n ?? 0);
  }

  async listMembershipsPage(input: { appId: string; userIds?: number[]; now: Date; offset: number; limit: number }): Promise<{ items: Membership[]; total: number }> {
    const m = schema.memberships;
    if (input.userIds && input.userIds.length === 0) return { items: [], total: 0 };
    const where = and(eq(m.appId, input.appId), input.userIds ? inArray(m.userId, input.userIds) : undefined);
    // The current ones first (lib/bookings/memberships.ts membershipActive: 64 frozen ones too, a freeze without an end holding the end).
    const held = sql`(${m.frozenFrom} <= ${input.now} and ${m.frozenUntil} is null)`;
    const usable = sql`case when ${m.status} = 'active' and ${m.startsAt} <= ${input.now} and (${m.endsAt} is null or ${m.endsAt} > ${input.now} or ${held}) then 0 else 1 end`;
    const [items, [total]] = await Promise.all([
      this.run((db) => db.select().from(m).where(where).orderBy(usable, desc(m.createdAt), desc(m.id)).limit(input.limit).offset(input.offset)),
      this.run((db) => db.select({ n: count() }).from(m).where(where)),
    ]);
    return { items, total: Number(total?.n ?? 0) };
  }

  async findMembershipByCodeHash(appId: string, codeHash: string): Promise<Membership | null> {
    const m = schema.memberships;
    const [row] = await this.run((db) => db.select().from(m).where(and(eq(m.appId, appId), eq(m.codeHash, codeHash))).limit(1));
    return row ?? null;
  }

  async listMembershipsWithoutCodeHash(appId: string, now: Date, limit: number): Promise<Membership[]> {
    const m = schema.memberships;
    return this.run((db) =>
      db
        .select()
        .from(m)
        // 64 With those frozen without an end, whose end waits (lib/bookings/memberships.ts membershipActive).
        .where(
          and(
            eq(m.appId, appId),
            isNull(m.codeHash),
            eq(m.status, "active"),
            lte(m.startsAt, now),
            or(isNull(m.endsAt), gt(m.endsAt, now), and(lte(m.frozenFrom, now), isNull(m.frozenUntil))),
          ),
        )
        .orderBy(desc(m.id))
        .limit(limit),
    );
  }

  async setMembershipCodeHash(appId: string, id: number, codeHash: string): Promise<void> {
    const m = schema.memberships;
    await this.run((db) => db.update(m).set({ codeHash }).where(and(eq(m.appId, appId), eq(m.id, id))));
  }

  async freezeMembership(appId: string, id: number, input: { from: Date; until: Date | null; endsAt: Date | null; previousEndsAt: Date | null; now: Date }): Promise<boolean> {
    const m = schema.memberships;
    // Only while active, with no freeze now or to come and the end that was read: of two at once, one moves the end.
    const [result] = await this.run((db) =>
      db
        .update(m)
        .set({ frozenFrom: input.from, frozenUntil: input.until, endsAt: input.endsAt, updatedAt: input.now })
        .where(
          and(
            eq(m.appId, appId),
            eq(m.id, id),
            eq(m.status, "active"),
            or(isNull(m.frozenFrom), lte(m.frozenUntil, input.now)),
            input.previousEndsAt ? eq(m.endsAt, input.previousEndsAt) : isNull(m.endsAt),
          ),
        ),
    );
    return result.affectedRows === 1;
  }

  async unfreezeMembership(appId: string, id: number, input: { from: Date; until: Date | null; endsAt: Date | null; previousEndsAt: Date | null; now: Date }): Promise<boolean> {
    const m = schema.memberships;
    // Only the freeze that was read (its first day and the day it's back), while it isn't over, on an
    // active membership with the end that was read: of two at once, one moves the end.
    const [result] = await this.run((db) =>
      db
        .update(m)
        .set({ frozenFrom: null, frozenUntil: null, endsAt: input.endsAt, updatedAt: input.now })
        .where(
          and(
            eq(m.appId, appId),
            eq(m.id, id),
            eq(m.status, "active"),
            eq(m.frozenFrom, input.from),
            input.until ? and(eq(m.frozenUntil, input.until), gt(m.frozenUntil, input.now)) : isNull(m.frozenUntil),
            input.previousEndsAt ? eq(m.endsAt, input.previousEndsAt) : isNull(m.endsAt),
          ),
        ),
    );
    return result.affectedRows === 1;
  }

  // 63 Course questions and reviews

  async saveCourseReview(input: { appId: string; courseId: number; userId: number; rating: number; text: string; now: Date }): Promise<CourseReview> {
    const r = schema.courseReviews;
    await this.run((db) =>
      db
        .insert(r)
        .values({ appId: input.appId, courseId: input.courseId, userId: input.userId, rating: input.rating, text: input.text, hidden: false, replyText: null, replyAt: null, createdAt: input.now, updatedAt: input.now })
        .onDuplicateKeyUpdate({ set: { rating: input.rating, text: input.text, updatedAt: input.now } }),
    );
    const saved = await this.getCourseReviewOf(input.appId, input.courseId, input.userId);
    if (!saved) throw new Error("The review wasn't saved.");
    return saved;
  }

  async getCourseReview(appId: string, id: number): Promise<CourseReview | null> {
    const r = schema.courseReviews;
    const [row] = await this.run((db) => db.select().from(r).where(and(eq(r.appId, appId), eq(r.id, id))).limit(1));
    return row ?? null;
  }

  async getCourseReviewOf(appId: string, courseId: number, userId: number): Promise<CourseReview | null> {
    const r = schema.courseReviews;
    const [row] = await this.run((db) =>
      db
        .select()
        .from(r)
        .where(and(eq(r.appId, appId), eq(r.courseId, courseId), eq(r.userId, userId)))
        .limit(1),
    );
    return row ?? null;
  }

  async listCourseReviews(input: { appId: string; courseIds?: number[]; hidden?: boolean; unreplied?: boolean; offset: number; limit: number }): Promise<{ items: CourseReview[]; total: number }> {
    const r = schema.courseReviews;
    if (input.courseIds && input.courseIds.length === 0) return { items: [], total: 0 };
    const where = and(
      eq(r.appId, input.appId),
      input.courseIds ? inArray(r.courseId, input.courseIds) : undefined,
      input.hidden !== undefined ? eq(r.hidden, input.hidden) : undefined,
      input.unreplied ? isNull(r.replyText) : undefined,
    );
    const [items, [total]] = await Promise.all([
      this.run((db) => db.select().from(r).where(where).orderBy(desc(r.createdAt), desc(r.id)).limit(input.limit).offset(input.offset)),
      this.run((db) => db.select({ n: count() }).from(r).where(where)),
    ]);
    return { items, total: Number(total?.n ?? 0) };
  }

  async countCourseRatings(appId: string): Promise<{ courseId: number; rating: number; count: number }[]> {
    const r = schema.courseReviews;
    const rows = await this.run((db) =>
      db
        .select({ courseId: r.courseId, rating: r.rating, n: count() })
        .from(r)
        .where(and(eq(r.appId, appId), eq(r.hidden, false)))
        .groupBy(r.courseId, r.rating),
    );
    return rows.map((row) => ({ courseId: row.courseId, rating: row.rating, count: Number(row.n) }));
  }

  async updateCourseReview(appId: string, id: number, patch: CourseReviewPatch): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    const r = schema.courseReviews;
    await this.run((db) => db.update(r).set(patch).where(and(eq(r.appId, appId), eq(r.id, id))));
  }

  async createCourseQuestion(input: CourseQuestionInput): Promise<CourseQuestion> {
    const [result] = await this.run((db) => db.insert(schema.courseQuestions).values({ ...input, hidden: false }));
    return { ...input, hidden: false, id: Number(result.insertId), answerCount: 0 };
  }

  /** 63 A question's columns with its answers counted (a deleted student's answers go with their account; 64 hidden ones aren't counted). */
  private questionColumns() {
    const q = schema.courseQuestions;
    // Written out with the tables' names: inside the subquery an unqualified `id` would be the answer's.
    return {
      ...getTableColumns(q),
      answerCount: sql<number>`(select count(*) from \`course_answers\` where \`course_answers\`.\`question_id\` = \`course_questions\`.\`id\` and \`course_answers\`.\`hidden\` = false)`.mapWith(Number),
    };
  }

  async getCourseQuestion(appId: string, id: number): Promise<CourseQuestion | null> {
    const q = schema.courseQuestions;
    const [row] = await this.run((db) =>
      db
        .select(this.questionColumns())
        .from(q)
        .where(and(eq(q.appId, appId), eq(q.id, id)))
        .limit(1),
    );
    return row ?? null;
  }

  async listCourseQuestions(input: {
    appId: string;
    courseIds?: number[];
    status?: CourseQuestionStatus;
    hidden?: boolean;
    viewerId?: number;
    order: "created" | "updated";
    offset: number;
    limit: number;
  }): Promise<{ items: CourseQuestion[]; total: number }> {
    const q = schema.courseQuestions;
    if (input.courseIds && input.courseIds.length === 0) return { items: [], total: 0 };
    const where = and(
      eq(q.appId, input.appId),
      input.courseIds ? inArray(q.courseId, input.courseIds) : undefined,
      input.status ? eq(q.status, input.status) : undefined,
      input.hidden !== undefined ? eq(q.hidden, input.hidden) : undefined,
      // 64 A student sees the shown questions and their own.
      input.viewerId !== undefined ? or(eq(q.hidden, false), eq(q.userId, input.viewerId)) : undefined,
    );
    const order = input.order === "created" ? [desc(q.createdAt), desc(q.id)] : [desc(q.updatedAt), desc(q.id)];
    const [items, [total]] = await Promise.all([
      this.run((db) =>
        db
          .select(this.questionColumns())
          .from(q)
          .where(where)
          .orderBy(...order)
          .limit(input.limit)
          .offset(input.offset),
      ),
      this.run((db) => db.select({ n: count() }).from(q).where(where)),
    ]);
    return { items, total: Number(total?.n ?? 0) };
  }

  async addCourseAnswer(input: CourseAnswerInput, status: CourseQuestionStatus): Promise<CourseAnswer> {
    const q = schema.courseQuestions;
    return this.run((db) =>
      db.transaction(async (tx) => {
        // The question's row first: inserting the answer would take a shared lock on it (its key), and
        // two answers at once would then deadlock wanting to update it.
        await tx
          .update(q)
          .set({ status, updatedAt: input.createdAt })
          .where(and(eq(q.appId, input.appId), eq(q.id, input.questionId)));
        const [result] = await tx.insert(schema.courseAnswers).values({ ...input, hidden: false });
        return { ...input, hidden: false, id: Number(result.insertId) };
      }),
    );
  }

  async setCourseQuestionHidden(appId: string, id: number, hidden: boolean): Promise<boolean> {
    const q = schema.courseQuestions;
    const [found] = await this.run((db) => db.select({ id: q.id }).from(q).where(and(eq(q.appId, appId), eq(q.id, id))).limit(1));
    if (!found) return false;
    await this.run((db) => db.update(q).set({ hidden }).where(and(eq(q.appId, appId), eq(q.id, id))));
    return true;
  }

  async setCourseAnswerHidden(appId: string, questionId: number, id: number, hidden: boolean): Promise<boolean> {
    const a = schema.courseAnswers;
    // A student's answer only: the business's own are never hidden.
    const where = and(eq(a.appId, appId), eq(a.questionId, questionId), eq(a.id, id), isNotNull(a.userId));
    const [found] = await this.run((db) => db.select({ id: a.id }).from(a).where(where).limit(1));
    if (!found) return false;
    await this.run((db) => db.update(a).set({ hidden }).where(where));
    return true;
  }

  async listCourseAnswers(appId: string, questionId: number): Promise<CourseAnswer[]> {
    const a = schema.courseAnswers;
    return this.run((db) =>
      db
        .select()
        .from(a)
        .where(and(eq(a.appId, appId), eq(a.questionId, questionId)))
        .orderBy(asc(a.createdAt), asc(a.id))
        .limit(500),
    );
  }

  async enrollInCourse(input: CourseEnrollment): Promise<boolean> {
    const [result] = await this.run((db) => db.insert(schema.courseEnrollments).ignore().values(input));
    return result.affectedRows === 1;
  }

  async leaveCourse(appId: string, userId: number, courseId: number): Promise<boolean> {
    const t = schema.courseEnrollments;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.userId, userId), eq(t.courseId, courseId))));
    return result.affectedRows === 1;
  }

  async listCourseEnrollments(input: { appId: string; userId?: number; courseId?: number }): Promise<CourseEnrollment[]> {
    const t = schema.courseEnrollments;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(
          and(
            eq(t.appId, input.appId),
            input.userId !== undefined ? eq(t.userId, input.userId) : undefined,
            input.courseId !== undefined ? eq(t.courseId, input.courseId) : undefined,
          ),
        )
        .orderBy(desc(t.enrolledAt)),
    );
  }

  async saveLessonProgress(input: LessonProgress): Promise<void> {
    const t = schema.lessonProgress;
    await this.run((db) =>
      db
        .insert(t)
        .values(input)
        .onDuplicateKeyUpdate({
          set: {
            positionSeconds: input.positionSeconds,
            updatedAt: input.updatedAt,
            // A completed lesson stays completed.
            completedAt: sql`coalesce(${t.completedAt}, values(${t.completedAt}))`,
          },
        }),
    );
  }

  async listLessonProgress(input: { appId: string; userId: number; courseId?: number }): Promise<LessonProgress[]> {
    const t = schema.lessonProgress;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, input.appId), eq(t.userId, input.userId), input.courseId !== undefined ? eq(t.courseId, input.courseId) : undefined)),
    );
  }

  async createQuizAttempt(input: Omit<QuizAttempt, "id">): Promise<QuizAttempt> {
    const [result] = await this.run((db) => db.insert(schema.quizAttempts).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getQuizAttempt(appId: string, id: number): Promise<QuizAttempt | null> {
    const t = schema.quizAttempts;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async submitQuizAttempt(appId: string, id: number, result: Pick<QuizAttempt, "answers" | "scorePercent" | "passed" | "submittedAt">): Promise<boolean> {
    const t = schema.quizAttempts;
    // Only an attempt not yet submitted: a second submit changes nothing.
    const [done] = await this.run((db) => db.update(t).set(result).where(and(eq(t.appId, appId), eq(t.id, id), isNull(t.submittedAt))));
    return done.affectedRows > 0;
  }

  async listQuizAttempts(input: { appId: string; userId?: number; courseId?: number; quizId?: number }): Promise<QuizAttempt[]> {
    const t = schema.quizAttempts;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(
          and(
            eq(t.appId, input.appId),
            input.userId !== undefined ? eq(t.userId, input.userId) : undefined,
            input.courseId !== undefined ? eq(t.courseId, input.courseId) : undefined,
            input.quizId !== undefined ? eq(t.quizId, input.quizId) : undefined,
          ),
        )
        .orderBy(desc(t.id)),
    );
  }

  async deleteQuizAttempts(input: { appId: string; userId: number; courseId: number }): Promise<number> {
    const t = schema.quizAttempts;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.appId, input.appId), eq(t.userId, input.userId), eq(t.courseId, input.courseId))));
    return result.affectedRows;
  }

  async deleteLessonProgress(input: { appId: string; userId: number; courseId: number }): Promise<number> {
    const t = schema.lessonProgress;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.appId, input.appId), eq(t.userId, input.userId), eq(t.courseId, input.courseId))));
    return result.affectedRows;
  }

  async listMarketplaceOrders(limit: number): Promise<CatalogOrder[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.catalogOrders)
        .where(and(isNotNull(schema.catalogOrders.commissionCents), isNotNull(schema.catalogOrders.paidAt)))
        .orderBy(desc(schema.catalogOrders.paidAt))
        .limit(limit),
    );
  }

  async createPlanPayment(payment: PlanPayment): Promise<void> {
    await this.run((db) => db.insert(schema.planPayments).values(payment));
  }

  async getPlanPaymentByToken(tokenHash: string): Promise<PlanPayment | null> {
    const [row] = await this.run((db) => db.select().from(schema.planPayments).where(eq(schema.planPayments.tokenHash, tokenHash)).limit(1));
    return (row as PlanPayment | undefined) ?? null;
  }

  async payPlanPayment(id: string, paymentId: string, now: Date): Promise<boolean> {
    const [result] = await this.run((db) =>
      db
        .update(schema.planPayments)
        .set({ status: "paid", paymentId, paidAt: now })
        .where(and(eq(schema.planPayments.id, id), eq(schema.planPayments.status, "pending"))),
    );
    return result.affectedRows === 1;
  }

  async failPlanPayment(id: string): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.planPayments)
        .set({ status: "failed" })
        .where(and(eq(schema.planPayments.id, id), eq(schema.planPayments.status, "pending"))),
    );
  }

  async listPlanPayments(input: { clientId?: string; appId?: string; id?: string; status?: PlanPaymentStatus; limit: number }): Promise<PlanPayment[]> {
    return (await this.run((db) =>
      db
        .select()
        .from(schema.planPayments)
        .where(
          and(
            input.clientId ? eq(schema.planPayments.clientId, input.clientId) : undefined,
            input.appId ? eq(schema.planPayments.appId, input.appId) : undefined,
            input.id ? eq(schema.planPayments.id, input.id) : undefined,
            input.status ? eq(schema.planPayments.status, input.status) : undefined,
          ),
        )
        .orderBy(desc(schema.planPayments.createdAt))
        .limit(input.limit),
    )) as PlanPayment[];
  }

  async listPlatformSettings(): Promise<PlatformSetting[]> {
    return (await this.run((db) => db.select().from(schema.platformSettings))) as PlatformSetting[];
  }

  async setPlatformSetting<K extends PlatformSettingKey>(key: K, value: PlatformSettingValues[K] | null, updatedBy: string, now: Date): Promise<void> {
    if (value === null) {
      await this.run((db) => db.delete(schema.platformSettings).where(eq(schema.platformSettings.key, key)));
      return;
    }
    await this.run((db) =>
      db
        .insert(schema.platformSettings)
        .values({ key, value, updatedAt: now, updatedBy })
        .onDuplicateKeyUpdate({ set: { value, updatedAt: now, updatedBy } }),
    );
  }

  async hitRateLimit(bucket: string, windowStart: number, now: Date): Promise<number> {
    // Assignments run left to right: `hits` must read the old window_start.
    await this.run((db) =>
      db.execute(
        sql`insert into rate_limits (bucket, window_start, hits, updated_at) values (${bucket}, ${windowStart}, 1, ${now})
            on duplicate key update hits = if(window_start = values(window_start), hits + 1, 1),
            window_start = values(window_start), updated_at = values(updated_at)`,
      ),
    );
    if (Math.random() < 0.01) {
      // Occasionally drop windows older than a day.
      await this.run((db) =>
        db.delete(schema.rateLimits).where(sql`${schema.rateLimits.windowStart} < ${windowStart - 86_400_000}`),
      );
    }
    const rows = await this.run((db) =>
      db.select({ hits: schema.rateLimits.hits }).from(schema.rateLimits).where(eq(schema.rateLimits.bucket, bucket)).limit(1),
    );
    return rows[0]?.hits ?? 1;
  }

  async peekRateLimit(bucket: string, windowStart: number): Promise<number> {
    const t = schema.rateLimits;
    const rows = await this.run((db) =>
      db.select({ hits: t.hits }).from(t).where(and(eq(t.bucket, bucket), eq(t.windowStart, windowStart))).limit(1),
    );
    return rows[0]?.hits ?? 0;
  }

  // 23 News & blog

  async listArticles(appId: string): Promise<Article[]> {
    const t = schema.articles;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(desc(t.createdAt), desc(t.id)));
  }

  async getArticle(appId: string, id: number): Promise<Article | null> {
    const t = schema.articles;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async createArticle(input: ArticleInput, now: Date): Promise<Article> {
    const values = { ...input, createdAt: now, updatedAt: now };
    const [result] = await this.run((db) => db.insert(schema.articles).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async updateArticle(appId: string, id: number, patch: Partial<ArticleInput>, now: Date): Promise<void> {
    const { appId: _ignored, ...rest } = patch;
    void _ignored;
    const t = schema.articles;
    await this.run((db) => db.update(t).set({ ...rest, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteArticle(appId: string, id: number): Promise<void> {
    const t = schema.articles;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async listArticleCategories(appId: string): Promise<ArticleCategory[]> {
    const t = schema.articleCategories;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(asc(t.position), asc(t.id)));
  }

  async createArticleCategory(input: Omit<ArticleCategory, "id">): Promise<ArticleCategory> {
    const [result] = await this.run((db) => db.insert(schema.articleCategories).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async updateArticleCategory(appId: string, id: number, patch: Partial<Pick<ArticleCategory, "name" | "position">>): Promise<void> {
    const t = schema.articleCategories;
    if (Object.keys(patch).length === 0) return;
    await this.run((db) => db.update(t).set(patch).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteArticleCategory(appId: string, id: number): Promise<void> {
    const t = schema.articleCategories;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
    // Categories are a JSON list on each article: the few that had it lose it.
    const a = schema.articles;
    const rows = await this.run((db) => db.select({ id: a.id, categoryIds: a.categoryIds }).from(a).where(eq(a.appId, appId)));
    for (const row of rows) {
      if (!row.categoryIds.includes(id)) continue;
      const categoryIds = row.categoryIds.filter((c) => c !== id);
      await this.run((db) => db.update(a).set({ categoryIds }).where(and(eq(a.appId, appId), eq(a.id, row.id))));
    }
  }

  async getNewsSettings(appId: string): Promise<NewsSettings | null> {
    const t = schema.newsSettings;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.appId, appId)).limit(1));
    return row?.settings ?? null;
  }

  async saveNewsSettings(appId: string, settings: NewsSettings, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .insert(schema.newsSettings)
        .values({ appId, settings, updatedAt: now })
        .onDuplicateKeyUpdate({ set: { settings, updatedAt: now } }),
    );
  }

  // 28 Events & tickets

  async listEvents(appId: string): Promise<EventRecord[]> {
    const t = schema.events;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(asc(t.startAt), asc(t.id)));
  }

  async getEvent(appId: string, id: number): Promise<EventRecord | null> {
    const t = schema.events;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async createEvent(input: EventInput, now: Date): Promise<EventRecord> {
    const values = { ...input, createdAt: now, updatedAt: now };
    const [result] = await this.run((db) => db.insert(schema.events).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async updateEvent(appId: string, id: number, patch: Partial<EventInput>, now: Date): Promise<void> {
    const { appId: _ignored, ...rest } = patch;
    void _ignored;
    const t = schema.events;
    await this.run((db) => db.update(t).set({ ...rest, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteEvent(appId: string, id: number): Promise<void> {
    // Its ticket types and tickets cascade.
    const t = schema.events;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async listTicketTypes(appId: string, eventId?: number): Promise<TicketType[]> {
    const t = schema.eventTicketTypes;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eventId !== undefined ? eq(t.eventId, eventId) : undefined))
        .orderBy(asc(t.eventId), asc(t.position), asc(t.id)),
    );
  }

  async createTicketType(input: TicketTypeInput, now: Date): Promise<TicketType> {
    const values = { ...input, createdAt: now };
    const [result] = await this.run((db) => db.insert(schema.eventTicketTypes).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async updateTicketType(appId: string, id: number, patch: Partial<Omit<TicketTypeInput, "appId" | "eventId">>): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    const t = schema.eventTicketTypes;
    await this.run((db) => db.update(t).set(patch).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteTicketType(appId: string, id: number): Promise<void> {
    const t = schema.eventTicketTypes;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async claimTickets(claim: TicketClaim): Promise<{ ok: true; tickets: EventTicket[] } | { ok: false; reason: TicketClaimRefusal }> {
    const e = schema.events;
    const tt = schema.eventTicketTypes;
    const tk = schema.eventTickets;
    return this.run((db) =>
      db.transaction(async (tx) => {
        // One claim at a time per event: the event's row is the lock, so the
        // counts below already include the tickets of a claim that just ended.
        const [event] = await tx
          .select({ id: e.id, status: e.status, capacity: e.capacity })
          .from(e)
          .where(and(eq(e.appId, claim.appId), eq(e.id, claim.eventId)))
          .for("update");
        const [type] = await tx
          .select({ id: tt.id, capacity: tt.capacity })
          .from(tt)
          .where(and(eq(tt.appId, claim.appId), eq(tt.id, claim.ticketTypeId), eq(tt.eventId, claim.eventId)))
          .limit(1);
        if (!event || event.status !== "published" || !type) return { ok: false as const, reason: "not_on_sale" as const };
        const holdsPlace = or(inArray(tk.status, ["valid", "used"]), and(eq(tk.status, "pending"), gt(tk.holdUntil, claim.now)));
        const counts = await tx
          .select({ ticketTypeId: tk.ticketTypeId, n: count() })
          .from(tk)
          .where(and(eq(tk.eventId, claim.eventId), holdsPlace))
          .groupBy(tk.ticketTypeId);
        const total = counts.reduce((sum, c) => sum + Number(c.n), 0);
        const ofType = Number(counts.find((c) => c.ticketTypeId === type.id)?.n ?? 0);
        const wanted = claim.tickets.length;
        if (event.capacity !== null && total + wanted > event.capacity) return { ok: false as const, reason: "sold_out" as const };
        if (type.capacity !== null && ofType + wanted > type.capacity) return { ok: false as const, reason: "sold_out" as const };
        const rows = claim.tickets.map((t) => ({
          appId: claim.appId,
          eventId: claim.eventId,
          ticketTypeId: claim.ticketTypeId,
          userId: claim.userId,
          orderId: claim.orderId,
          code: t.code,
          holderName: t.holderName,
          priceCents: claim.priceCents,
          status: claim.status,
          holdUntil: claim.holdUntil,
          usedAt: null,
          cancelledAt: null,
          createdAt: claim.now,
        }));
        await tx.insert(tk).values(rows);
        const saved = await tx
          .select()
          .from(tk)
          .where(
            inArray(
              tk.code,
              rows.map((r) => r.code),
            ),
          )
          .orderBy(asc(tk.id));
        return { ok: true as const, tickets: saved };
      }),
    );
  }

  async countTicketPlaces(appId: string, now: Date): Promise<{ eventId: number; ticketTypeId: number; count: number }[]> {
    const t = schema.eventTickets;
    const rows = await this.run((db) =>
      db
        .select({ eventId: t.eventId, ticketTypeId: t.ticketTypeId, count: count() })
        .from(t)
        .where(and(eq(t.appId, appId), or(inArray(t.status, ["valid", "used"]), and(eq(t.status, "pending"), gt(t.holdUntil, now)))))
        .groupBy(t.eventId, t.ticketTypeId),
    );
    return rows.map((r) => ({ eventId: r.eventId, ticketTypeId: r.ticketTypeId, count: Number(r.count) }));
  }

  async listTickets(input: { appId: string; eventId?: number; userId?: number; orderId?: number }): Promise<EventTicket[]> {
    const t = schema.eventTickets;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(
          and(
            eq(t.appId, input.appId),
            input.eventId !== undefined ? eq(t.eventId, input.eventId) : undefined,
            input.userId !== undefined ? eq(t.userId, input.userId) : undefined,
            input.orderId !== undefined ? eq(t.orderId, input.orderId) : undefined,
          ),
        )
        .orderBy(asc(t.createdAt), asc(t.id)),
    );
  }

  async getTicketByCode(appId: string, code: string): Promise<EventTicket | null> {
    const t = schema.eventTickets;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.code, code))).limit(1));
    return row ?? null;
  }

  async issueOrderTickets(appId: string, orderId: number, now: Date): Promise<{ issued: number; released: number }> {
    const e = schema.events;
    const tt = schema.eventTicketTypes;
    const tk = schema.eventTickets;
    // The event first, outside the transaction: the transaction's first read is
    // the lock, so its counts see every claim that ended before it got it.
    const [first] = await this.run((db) =>
      db
        .select({ eventId: tk.eventId })
        .from(tk)
        .where(and(eq(tk.appId, appId), eq(tk.orderId, orderId), eq(tk.status, "pending")))
        .limit(1),
    );
    if (!first) return { issued: 0, released: 0 };
    return this.run((db) =>
      db.transaction(async (tx) => {
        // The event's row is the lock, as for a claim: no place is taken while this counts.
        const [event] = await tx
          .select({ id: e.id, status: e.status, capacity: e.capacity })
          .from(e)
          .where(and(eq(e.appId, appId), eq(e.id, first.eventId)))
          .for("update");
        const pending = await tx
          .select()
          .from(tk)
          .where(and(eq(tk.appId, appId), eq(tk.orderId, orderId), eq(tk.status, "pending")));
        const lapsed = pending.filter((t) => t.holdUntil === null || t.holdUntil.getTime() <= now.getTime());
        const held = pending.length - lapsed.length;
        if (held > 0) {
          await tx
            .update(tk)
            .set({ status: "valid", holdUntil: null })
            .where(and(eq(tk.appId, appId), eq(tk.orderId, orderId), eq(tk.status, "pending"), gt(tk.holdUntil, now)));
        }
        if (lapsed.length === 0) return { issued: held, released: 0 };
        // 49 Paid after the hold ended: only while the places are still free.
        const holdsPlace = or(inArray(tk.status, ["valid", "used"]), and(eq(tk.status, "pending"), gt(tk.holdUntil, now)));
        const counts = await tx
          .select({ ticketTypeId: tk.ticketTypeId, n: count() })
          .from(tk)
          .where(and(eq(tk.eventId, first.eventId), holdsPlace))
          .groupBy(tk.ticketTypeId);
        const total = counts.reduce((sum, c) => sum + Number(c.n), 0);
        let free = Boolean(event) && event!.status === "published" && (event!.capacity === null || total + lapsed.length <= event!.capacity);
        for (const typeId of new Set(lapsed.map((t) => t.ticketTypeId))) {
          const [type] = await tx.select({ capacity: tt.capacity }).from(tt).where(and(eq(tt.appId, appId), eq(tt.id, typeId))).limit(1);
          const wanted = lapsed.filter((t) => t.ticketTypeId === typeId).length;
          const taken = Number(counts.find((c) => c.ticketTypeId === typeId)?.n ?? 0);
          if (!type || (type.capacity !== null && taken + wanted > type.capacity)) free = false;
        }
        await tx
          .update(tk)
          .set(free ? { status: "valid", holdUntil: null } : { status: "cancelled", holdUntil: null, cancelledAt: now })
          .where(
            and(
              eq(tk.appId, appId),
              inArray(
                tk.id,
                lapsed.map((t) => t.id),
              ),
              eq(tk.status, "pending"),
            ),
          );
        return free ? { issued: pending.length, released: 0 } : { issued: held, released: lapsed.length };
      }),
    );
  }

  async holdOrderTickets(appId: string, orderId: number, until: Date, now: Date): Promise<number> {
    const t = schema.eventTickets;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set({ holdUntil: until })
        .where(and(eq(t.appId, appId), eq(t.orderId, orderId), eq(t.status, "pending"), gt(t.holdUntil, now))),
    );
    return result.affectedRows;
  }

  async checkInTicket(appId: string, code: string, now: Date): Promise<CheckInResult> {
    const t = schema.eventTickets;
    // Only a valid ticket changes: of two scans at once, one wins and the other sees it used.
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set({ status: "used", usedAt: now })
        .where(and(eq(t.appId, appId), eq(t.code, code), eq(t.status, "valid"))),
    );
    const ticket = await this.getTicketByCode(appId, code);
    if (!ticket) return { ok: false, reason: "not_found" };
    if (result.affectedRows === 1) return { ok: true, ticket };
    return { ok: false, reason: ticket.status === "valid" ? "used" : ticket.status, ticket };
  }

  async cancelTickets(appId: string, input: { ids?: number[]; eventId?: number; refunded?: boolean }, now: Date): Promise<number> {
    if (input.ids === undefined && input.eventId === undefined) return 0;
    if (input.ids !== undefined && input.ids.length === 0) return 0;
    const t = schema.eventTickets;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set({ status: "cancelled", cancelledAt: now, ...(input.refunded ? { refundedAt: now } : {}) })
        .where(
          and(
            eq(t.appId, appId),
            eq(t.status, "valid"),
            input.ids !== undefined ? inArray(t.id, input.ids) : undefined,
            input.eventId !== undefined ? eq(t.eventId, input.eventId) : undefined,
          ),
        ),
    );
    return result.affectedRows;
  }

  async getEventSettings(appId: string): Promise<EventSettings | null> {
    const t = schema.eventSettings;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.appId, appId)).limit(1));
    return row?.settings ?? null;
  }

  async saveEventSettings(appId: string, settings: EventSettings, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .insert(schema.eventSettings)
        .values({ appId, settings, updatedAt: now })
        .onDuplicateKeyUpdate({ set: { settings, updatedAt: now } }),
    );
  }

  // 29 Charity & donations

  async listCampaigns(appId: string): Promise<Campaign[]> {
    const t = schema.campaigns;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(desc(t.createdAt), desc(t.id)));
  }

  async getCampaign(appId: string, id: number): Promise<Campaign | null> {
    const t = schema.campaigns;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async createCampaign(input: CampaignInput, now: Date): Promise<Campaign> {
    const values = { ...input, raisedCents: 0, donorCount: 0, createdAt: now, updatedAt: now };
    const [result] = await this.run((db) => db.insert(schema.campaigns).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async updateCampaign(appId: string, id: number, patch: Partial<CampaignInput>, now: Date): Promise<void> {
    // Totals only change when a donation is paid (payDonation).
    const { appId: _ignored, ...rest } = patch as Partial<Campaign>;
    void _ignored;
    delete rest.raisedCents;
    delete rest.donorCount;
    const t = schema.campaigns;
    await this.run((db) => db.update(t).set({ ...rest, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteCampaign(appId: string, id: number): Promise<void> {
    const t = schema.campaigns;
    // Donations keep their title; their campaign_id is set to null by the foreign key.
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async setCampaignTotals(appId: string, id: number, totals: Pick<Campaign, "raisedCents" | "donorCount">): Promise<void> {
    const t = schema.campaigns;
    await this.run((db) =>
      db.update(t).set({ raisedCents: totals.raisedCents, donorCount: totals.donorCount }).where(and(eq(t.appId, appId), eq(t.id, id))),
    );
  }

  async createDonation(input: DonationInput): Promise<Donation> {
    const [result] = await this.run((db) => db.insert(schema.donations).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getDonation(appId: string, id: number): Promise<Donation | null> {
    const t = schema.donations;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async getDonationByToken(tokenHash: string): Promise<Donation | null> {
    const t = schema.donations;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.tokenHash, tokenHash)).limit(1));
    return row ?? null;
  }

  async getDonationByReceipt(receiptCode: string): Promise<Donation | null> {
    const t = schema.donations;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.receiptCode, receiptCode)).limit(1));
    return row ?? null;
  }

  async updateDonation(appId: string, id: number, patch: DonationPatch): Promise<void> {
    const t = schema.donations;
    if (Object.keys(patch).length === 0) return;
    await this.run((db) => db.update(t).set(patch).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async payDonation(appId: string, id: number, paymentId: string, now: Date, options: { count?: boolean } = {}): Promise<boolean> {
    const d = schema.donations;
    const c = schema.campaigns;
    return this.run((db) =>
      db.transaction(async (tx) => {
        const [result] = await tx
          .update(d)
          .set({ status: "paid", paymentId, paidAt: now, updatedAt: now })
          .where(and(eq(d.appId, appId), eq(d.id, id), eq(d.status, "pending")));
        if (result.affectedRows !== 1) return false;
        const [donation] = await tx.select().from(d).where(eq(d.id, id)).limit(1);
        if (!donation || donation.campaignId === null || options.count === false) return true;
        // The donor counts once per campaign: unless an earlier paid donation has the same email.
        const [earlier] =
          donation.donorEmail === null
            ? [{ n: 0 }]
            : await tx
                .select({ n: count() })
                .from(d)
                .where(
                  and(
                    eq(d.appId, appId),
                    eq(d.campaignId, donation.campaignId),
                    eq(d.status, "paid"),
                    eq(d.donorEmail, donation.donorEmail),
                    not(eq(d.id, id)),
                  ),
                );
        await tx
          .update(c)
          .set({
            raisedCents: sql`${c.raisedCents} + ${donation.amountCents}`,
            ...((earlier?.n ?? 0) === 0 ? { donorCount: sql`${c.donorCount} + 1` } : {}),
          })
          .where(and(eq(c.appId, appId), eq(c.id, donation.campaignId)));
        return true;
      }),
    );
  }

  async listDonations(input: {
    appId: string;
    campaignId?: number;
    userId?: number;
    statuses?: DonationStatus[];
    offset: number;
    limit: number;
  }): Promise<{ items: Donation[]; total: number }> {
    const t = schema.donations;
    const where = and(
      eq(t.appId, input.appId),
      input.campaignId !== undefined ? eq(t.campaignId, input.campaignId) : undefined,
      input.userId !== undefined ? eq(t.userId, input.userId) : undefined,
      input.statuses ? inArray(t.status, input.statuses) : undefined,
    );
    const [items, totals] = await Promise.all([
      this.run((db) =>
        db
          .select()
          .from(t)
          .where(where)
          .orderBy(desc(sql`coalesce(${t.paidAt}, ${t.createdAt})`), desc(t.id))
          .limit(input.limit)
          .offset(input.offset),
      ),
      this.run((db) => db.select({ n: count() }).from(t).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }

  async listCampaignDonorUserIds(appId: string, campaignId: number): Promise<number[]> {
    const t = schema.donations;
    const rows = await this.run((db) =>
      db
        .selectDistinct({ userId: t.userId })
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.campaignId, campaignId), eq(t.status, "paid"), isNotNull(t.userId)))
        .orderBy(asc(t.userId)),
    );
    return rows.map((r) => r.userId).filter((id): id is number => id !== null);
  }

  async getDonationSettings(appId: string): Promise<DonationSettings | null> {
    const t = schema.donationSettings;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.appId, appId)).limit(1));
    return row?.settings ?? null;
  }

  async saveDonationSettings(appId: string, settings: DonationSettings, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .insert(schema.donationSettings)
        .values({ appId, settings, updatedAt: now })
        .onDuplicateKeyUpdate({ set: { settings, updatedAt: now } }),
    );
  }

  // 104 Delivery and courier companies

  async getDeliverySettings(appId: string): Promise<DeliverySettings | null> {
    const t = schema.deliverySettings;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.appId, appId)).limit(1));
    return row?.settings ?? null;
  }

  async saveDeliverySettings(appId: string, settings: DeliverySettings, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .insert(schema.deliverySettings)
        .values({ appId, settings, updatedAt: now })
        .onDuplicateKeyUpdate({ set: { settings, updatedAt: now } }),
    );
  }

  async listDeliveryServices(appId: string): Promise<DeliveryService[]> {
    const t = schema.deliveryServices;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(asc(t.position), asc(t.id)));
  }

  async getDeliveryService(appId: string, id: number): Promise<DeliveryService | null> {
    const t = schema.deliveryServices;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async createDeliveryService(input: DeliveryServiceInput, now: Date): Promise<DeliveryService> {
    const values = { ...input, createdAt: now, updatedAt: now };
    const [result] = await this.run((db) => db.insert(schema.deliveryServices).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async updateDeliveryService(appId: string, id: number, patch: Partial<DeliveryServiceInput>, now: Date): Promise<void> {
    const { appId: _ignored, ...rest } = patch;
    void _ignored;
    const t = schema.deliveryServices;
    await this.run((db) => db.update(t).set({ ...rest, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteDeliveryService(appId: string, id: number): Promise<void> {
    const t = schema.deliveryServices;
    // Shipments keep its name; their service_id is set to null by the foreign key.
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async listCouriers(appId: string): Promise<Courier[]> {
    const t = schema.couriers;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(asc(t.name), asc(t.id)));
  }

  async getCourier(appId: string, id: number): Promise<Courier | null> {
    const t = schema.couriers;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async findCourier(appId: string, who: { phone: string | null; email: string | null }): Promise<Courier | null> {
    const t = schema.couriers;
    const match = who.phone ? eq(t.phone, who.phone) : who.email ? eq(t.email, who.email.toLowerCase()) : null;
    if (!match) return null;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), match)).limit(1));
    return row ?? null;
  }

  async createCourier(input: CourierInput, now: Date): Promise<{ ok: true; courier: Courier } | { ok: false; reason: "duplicate" }> {
    const values = { ...input, onDuty: false, lat: null, lng: null, locatedAt: null, createdAt: now, updatedAt: now };
    try {
      const [result] = await this.run((db) => db.insert(schema.couriers).values(values));
      return { ok: true, courier: { id: Number(result.insertId), ...values } };
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return { ok: false, reason: "duplicate" };
      throw error;
    }
  }

  async updateCourier(appId: string, id: number, patch: CourierPatch, now: Date): Promise<{ ok: boolean; reason?: "duplicate" }> {
    const t = schema.couriers;
    try {
      const [result] = await this.run((db) => db.update(t).set({ ...patch, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
      return { ok: result.affectedRows === 1 };
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return { ok: false, reason: "duplicate" };
      throw error;
    }
  }

  async deleteCourier(appId: string, id: number, now: Date): Promise<void> {
    const s = schema.shipments;
    const t = schema.couriers;
    await this.run((db) =>
      db.transaction(async (tx) => {
        // Jobs they hadn't picked up yet wait for a courier again; the others keep the name.
        const waiting = await tx.select({ id: s.id, timeline: s.timeline }).from(s).where(and(eq(s.appId, appId), eq(s.courierId, id), eq(s.status, "assigned")));
        for (const row of waiting) {
          await tx
            .update(s)
            .set({ status: "pending", courierId: null, timeline: [...row.timeline, { status: "pending", at: now.toISOString(), by: "company" }], updatedAt: now })
            .where(and(eq(s.id, row.id), eq(s.status, "assigned")));
        }
        await tx.delete(t).where(and(eq(t.appId, appId), eq(t.id, id)));
      }),
    );
  }

  async createShipment(input: ShipmentInput): Promise<Shipment> {
    const [result] = await this.run((db) => db.insert(schema.shipments).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getShipment(appId: string, id: number): Promise<Shipment | null> {
    const t = schema.shipments;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async listShipments(query: ShipmentQuery): Promise<{ items: Shipment[]; total: number }> {
    const t = schema.shipments;
    const search = query.search?.trim() ?? "";
    const reference = /^s-?(\d{1,15})$/i.exec(search);
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const where = and(
      eq(t.appId, query.appId),
      query.userId !== undefined ? eq(t.userId, query.userId) : undefined,
      query.notUserId !== undefined ? or(isNull(t.userId), ne(t.userId, query.notUserId)) : undefined,
      query.courierId !== undefined ? eq(t.courierId, query.courierId) : undefined,
      query.statuses ? inArray(t.status, query.statuses) : undefined,
      query.unassigned ? isNull(t.courierId) : undefined,
      query.since ? gte(t.createdAt, query.since) : undefined,
      query.updatedSince ? gte(t.updatedAt, query.updatedSince) : undefined,
      !search
        ? undefined
        : reference
          ? eq(t.id, Number(reference[1]))
          : or(like(t.senderName, pattern), like(t.senderPhone, pattern), like(t.recipientName, pattern), like(t.recipientPhone, pattern)),
    );
    const order = query.order === "newest" ? [desc(t.createdAt), desc(t.id)] : [asc(t.createdAt), asc(t.id)];
    const [items, totals] = await Promise.all([
      this.run((db) =>
        db
          .select()
          .from(t)
          .where(where)
          .orderBy(...order)
          .limit(query.limit)
          .offset(query.offset),
      ),
      this.run((db) => db.select({ n: count() }).from(t).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }

  async updateShipment(appId: string, id: number, patch: ShipmentPatch, expect: { statuses?: ShipmentStatus[]; courierId?: number | null } = {}): Promise<boolean> {
    const t = schema.shipments;
    if (Object.keys(patch).length === 0) return false;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set(patch)
        .where(
          and(
            eq(t.appId, appId),
            eq(t.id, id),
            expect.statuses ? inArray(t.status, expect.statuses) : undefined,
            expect.courierId === undefined ? undefined : expect.courierId === null ? isNull(t.courierId) : eq(t.courierId, expect.courierId),
          ),
        ),
    );
    return result.affectedRows === 1;
  }

  // 105.1 Food delivery from many restaurants

  /** A restaurant's columns without its menu (read on its own). */
  private restaurantColumns() {
    const { menu: _menu, dishNames: _dishNames, ...columns } = getTableColumns(schema.restaurants);
    void _menu;
    void _dishNames;
    return columns;
  }

  async listRestaurants(appId: string, filter: { q?: string } = {}): Promise<Restaurant[]> {
    const t = schema.restaurants;
    const q = filter.q?.trim().toLowerCase() ?? "";
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    return this.run((db) =>
      db
        .select(this.restaurantColumns())
        .from(t)
        .where(and(eq(t.appId, appId), q ? or(like(t.name, pattern), like(t.dishNames, pattern)) : undefined))
        .orderBy(asc(t.position), asc(t.id)),
    );
  }

  async getRestaurant(appId: string, id: number): Promise<Restaurant | null> {
    const t = schema.restaurants;
    const [row] = await this.run((db) => db.select(this.restaurantColumns()).from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async getRestaurantMenu(appId: string, id: number): Promise<RestaurantMenu | null> {
    const t = schema.restaurants;
    const [row] = await this.run((db) => db.select({ menu: t.menu }).from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row?.menu ?? null;
  }

  async createRestaurant(input: RestaurantInput, menu: RestaurantMenu, now: Date): Promise<Restaurant> {
    const values = { ...input, busyUntil: null, ratingSum: 0, ratingCount: 0, createdAt: now, updatedAt: now };
    const [result] = await this.run((db) => db.insert(schema.restaurants).values({ ...values, menu, dishNames: dishNamesOf(menu) }));
    return { id: Number(result.insertId), ...values };
  }

  async updateRestaurant(appId: string, id: number, patch: RestaurantPatch, now: Date): Promise<void> {
    const t = schema.restaurants;
    const { appId: _ignored, ...rest } = patch as RestaurantPatch & { appId?: string };
    void _ignored;
    await this.run((db) => db.update(t).set({ ...rest, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async saveRestaurantMenu(appId: string, id: number, menu: RestaurantMenu, now: Date): Promise<void> {
    const t = schema.restaurants;
    await this.run((db) => db.update(t).set({ menu, dishNames: dishNamesOf(menu), updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteRestaurant(appId: string, id: number): Promise<void> {
    const t = schema.restaurants;
    // Its staff go with it (foreign key); its orders keep its name, their restaurant_id set to null.
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async addRestaurantRating(appId: string, id: number, stars: number): Promise<void> {
    const t = schema.restaurants;
    await this.run((db) =>
      db
        .update(t)
        .set({ ratingSum: sql`${t.ratingSum} + ${stars}`, ratingCount: sql`${t.ratingCount} + 1` })
        .where(and(eq(t.appId, appId), eq(t.id, id))),
    );
  }

  async listRestaurantStaff(appId: string, restaurantId?: number): Promise<RestaurantStaff[]> {
    const t = schema.restaurantStaff;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), restaurantId === undefined ? undefined : eq(t.restaurantId, restaurantId)))
        .orderBy(asc(t.name), asc(t.id)),
    );
  }

  async findRestaurantStaff(appId: string, who: { phone: string | null; email: string | null }): Promise<RestaurantStaff | null> {
    const t = schema.restaurantStaff;
    const match = who.phone ? eq(t.phone, who.phone) : who.email ? eq(t.email, who.email.toLowerCase()) : null;
    if (!match) return null;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), match)).limit(1));
    return row ?? null;
  }

  async createRestaurantStaff(input: RestaurantStaffInput, now: Date): Promise<{ ok: true; staff: RestaurantStaff } | { ok: false; reason: "duplicate" }> {
    const values = { ...input, createdAt: now, updatedAt: now };
    try {
      const [result] = await this.run((db) => db.insert(schema.restaurantStaff).values(values));
      return { ok: true, staff: { id: Number(result.insertId), ...values } };
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return { ok: false, reason: "duplicate" };
      throw error;
    }
  }

  async updateRestaurantStaff(appId: string, id: number, patch: Partial<Pick<RestaurantStaff, "name" | "phone" | "email" | "active">>, now: Date): Promise<{ ok: boolean; reason?: "duplicate" }> {
    const t = schema.restaurantStaff;
    try {
      const [result] = await this.run((db) => db.update(t).set({ ...patch, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
      return { ok: result.affectedRows === 1 };
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return { ok: false, reason: "duplicate" };
      throw error;
    }
  }

  async deleteRestaurantStaff(appId: string, id: number): Promise<void> {
    const t = schema.restaurantStaff;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async createFoodOrder(input: FoodOrderInput): Promise<FoodOrder> {
    const [result] = await this.run((db) => db.insert(schema.foodOrders).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getFoodOrder(appId: string, id: number): Promise<FoodOrder | null> {
    const t = schema.foodOrders;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async listFoodOrders(query: FoodOrderQuery): Promise<{ items: FoodOrder[]; total: number }> {
    const t = schema.foodOrders;
    const search = query.search?.trim() ?? "";
    const reference = /^f-?(\d{1,15})$/i.exec(search);
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const where = and(
      eq(t.appId, query.appId),
      query.userId !== undefined ? eq(t.userId, query.userId) : undefined,
      query.restaurantId !== undefined ? eq(t.restaurantId, query.restaurantId) : undefined,
      query.statuses ? inArray(t.status, query.statuses) : undefined,
      query.since ? gte(t.createdAt, query.since) : undefined,
      query.until ? lt(t.createdAt, query.until) : undefined,
      query.updatedSince ? gte(t.updatedAt, query.updatedSince) : undefined,
      !search ? undefined : reference ? eq(t.id, Number(reference[1])) : or(like(t.customerName, pattern), like(t.customerPhone, pattern), like(t.restaurantName, pattern)),
    );
    const order = query.order === "newest" ? [desc(t.createdAt), desc(t.id)] : [asc(t.createdAt), asc(t.id)];
    const [items, totals] = await Promise.all([
      this.run((db) =>
        db
          .select()
          .from(t)
          .where(where)
          .orderBy(...order)
          .limit(query.limit)
          .offset(query.offset),
      ),
      this.run((db) => db.select({ n: count() }).from(t).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }

  async updateFoodOrder(appId: string, id: number, patch: FoodOrderPatch, expect: { statuses?: FoodOrderStatus[] } = {}): Promise<boolean> {
    const t = schema.foodOrders;
    if (Object.keys(patch).length === 0) return false;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set(patch)
        .where(and(eq(t.appId, appId), eq(t.id, id), expect.statuses ? inArray(t.status, expect.statuses) : undefined)),
    );
    return result.affectedRows === 1;
  }

  async foodStatement(appId: string, since: Date, until: Date): Promise<FoodStatementRow[]> {
    const t = schema.foodOrders;
    const rows = await this.run((db) =>
      db
        .select({
          restaurantId: t.restaurantId,
          restaurantName: sql<string>`max(${t.restaurantName})`,
          orders: count(),
          subtotalCents: sql<string>`sum(${t.subtotalCents})`,
          deliveryFeeCents: sql<string>`sum(${t.deliveryFeeCents})`,
          commissionCents: sql<string>`sum(${t.commissionCents})`,
          cashSubtotalCents: sql<string>`sum(case when ${t.paymentMethod} = 'cash' then ${t.subtotalCents} else 0 end)`,
        })
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.status, "delivered"), gte(t.createdAt, since), lt(t.createdAt, until)))
        .groupBy(t.restaurantId, sql`case when ${t.restaurantId} is null then ${t.restaurantName} else '' end`),
    );
    return rows
      .map((r) => {
        const subtotalCents = Number(r.subtotalCents ?? 0);
        const cashSubtotalCents = Number(r.cashSubtotalCents ?? 0);
        return {
          restaurantId: r.restaurantId,
          restaurantName: r.restaurantName,
          orders: r.orders,
          subtotalCents,
          deliveryFeeCents: Number(r.deliveryFeeCents ?? 0),
          commissionCents: Number(r.commissionCents ?? 0),
          cashSubtotalCents,
          cardSubtotalCents: subtotalCents - cashSubtotalCents,
        };
      })
      .sort((a, b) => b.subtotalCents - a.subtotalCents || a.restaurantName.localeCompare(b.restaurantName));
  }

  // 10.7 Listings

  async listListings(appId: string): Promise<Listing[]> {
    const t = schema.listings;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(desc(t.createdAt), desc(t.id)));
  }

  async getListing(appId: string, id: number): Promise<Listing | null> {
    const t = schema.listings;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async createListing(input: ListingInput, now: Date): Promise<Listing> {
    const values = { ...input, createdAt: now, updatedAt: now };
    const [result] = await this.run((db) => db.insert(schema.listings).values(values));
    return { id: Number(result.insertId), ...values };
  }

  async updateListing(appId: string, id: number, patch: Partial<ListingInput>, now: Date): Promise<void> {
    const { appId: _ignored, ...rest } = patch;
    void _ignored;
    const t = schema.listings;
    await this.run((db) => db.update(t).set({ ...rest, updatedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async getListingSettings(appId: string): Promise<ListingSettings | null> {
    const t = schema.listingSettings;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.appId, appId)).limit(1));
    return row?.settings ?? null;
  }

  async saveListingSettings(appId: string, settings: ListingSettings, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .insert(schema.listingSettings)
        .values({ appId, settings, updatedAt: now })
        .onDuplicateKeyUpdate({ set: { settings, updatedAt: now } }),
    );
  }

  async addListingFavorite(favorite: ListingFavorite): Promise<void> {
    await this.run((db) => db.insert(schema.listingFavorites).ignore().values(favorite));
  }

  async removeListingFavorite(appId: string, userId: number, listingId: number): Promise<void> {
    const t = schema.listingFavorites;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.userId, userId), eq(t.listingId, listingId))));
  }

  async listListingFavorites(appId: string, userId: number): Promise<ListingFavorite[]> {
    const t = schema.listingFavorites;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.userId, userId)))
        .orderBy(desc(t.createdAt), desc(t.listingId)),
    );
  }

  async createListingInquiry(input: Omit<ListingInquiry, "id">): Promise<ListingInquiry> {
    const [result] = await this.run((db) => db.insert(schema.listingInquiries).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getListingInquiry(appId: string, id: number): Promise<ListingInquiry | null> {
    const t = schema.listingInquiries;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async findOpenListingInquiry(appId: string, userId: number, listingId: number): Promise<ListingInquiry | null> {
    const t = schema.listingInquiries;
    const [row] = await this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.userId, userId), eq(t.listingId, listingId), eq(t.status, "open")))
        .orderBy(desc(t.id))
        .limit(1),
    );
    return row ?? null;
  }

  async updateListingInquiry(appId: string, id: number, patch: Partial<Pick<ListingInquiry, "status" | "updatedAt">>): Promise<void> {
    const t = schema.listingInquiries;
    await this.run((db) => db.update(t).set(patch).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async addListingInquiryMessage(input: Omit<ListingInquiryMessage, "id" | "readAt">): Promise<ListingInquiryMessage> {
    const values = { ...input, readAt: null };
    const [result] = await this.run((db) => db.insert(schema.listingInquiryMessages).values(values));
    const t = schema.listingInquiries;
    await this.run((db) => db.update(t).set({ updatedAt: input.createdAt }).where(and(eq(t.appId, input.appId), eq(t.id, input.inquiryId))));
    return { id: Number(result.insertId), ...values };
  }

  async listListingInquiryMessages(appId: string, inquiryId: number): Promise<ListingInquiryMessage[]> {
    const t = schema.listingInquiryMessages;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.inquiryId, inquiryId)))
        .orderBy(asc(t.createdAt), asc(t.id)),
    );
  }

  async markListingInquiryRead(appId: string, inquiryId: number, from: "user" | "office", now: Date): Promise<void> {
    const t = schema.listingInquiryMessages;
    await this.run((db) =>
      db
        .update(t)
        .set({ readAt: now })
        .where(and(eq(t.appId, appId), eq(t.inquiryId, inquiryId), eq(t.from, from), isNull(t.readAt))),
    );
  }

  async listListingInquiries(input: {
    appId: string;
    userId?: number;
    status?: ListingInquiryStatus;
    offset: number;
    limit: number;
  }): Promise<{ items: ListingInquiryRow[]; total: number }> {
    const t = schema.listingInquiries;
    const where = and(
      eq(t.appId, input.appId),
      input.userId !== undefined ? eq(t.userId, input.userId) : undefined,
      input.status ? eq(t.status, input.status) : undefined,
    );
    const [inquiries, totals] = await Promise.all([
      this.run((db) => db.select().from(t).where(where).orderBy(desc(t.updatedAt), desc(t.id)).limit(input.limit).offset(input.offset)),
      this.run((db) => db.select({ n: count() }).from(t).where(where)),
    ]);
    const m = schema.listingInquiryMessages;
    const ids = inquiries.map((i) => i.id);
    const messages = ids.length
      ? await this.run((db) => db.select().from(m).where(and(eq(m.appId, input.appId), inArray(m.inquiryId, ids))).orderBy(asc(m.createdAt), asc(m.id)))
      : [];
    const items = inquiries.map((inquiry): ListingInquiryRow => {
      const own = messages.filter((message) => message.inquiryId === inquiry.id);
      return {
        ...inquiry,
        lastMessage: own[own.length - 1] ?? null,
        unreadByUser: own.filter((message) => message.from === "office" && !message.readAt).length,
        unreadByOffice: own.filter((message) => message.from === "user" && !message.readAt).length,
      };
    });
    return { items, total: totals[0]?.n ?? 0 };
  }

  async countUnreadListingInquiries(appId: string): Promise<number> {
    const t = schema.listingInquiryMessages;
    const rows = await this.run((db) =>
      db
        .select({ n: sql<number>`count(distinct ${t.inquiryId})` })
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.from, "user"), isNull(t.readAt))),
    );
    return Number(rows[0]?.n ?? 0);
  }

  // 10.4 Pages, looks and languages

  async getAppLayout(appId: string): Promise<AppLayoutRecord | null> {
    const rows = await this.run((db) => db.select().from(schema.appLayouts).where(eq(schema.appLayouts.appId, appId)).limit(1));
    return rows[0] ?? null;
  }

  async saveAppLayout(layout: AppLayoutRecord): Promise<void> {
    const { appId: _key, ...set } = layout;
    void _key;
    await this.run((db) => db.insert(schema.appLayouts).values(layout).onDuplicateKeyUpdate({ set }));
  }

  // 82.4 Publish history

  async addLayoutVersion(version: AppLayoutVersion, keep: number): Promise<void> {
    const t = schema.appLayoutVersions;
    await this.run((db) => db.insert(t).values(version).onDuplicateKeyUpdate({ set: { layout: version.layout, publishedAt: version.publishedAt, publishedBy: version.publishedBy } }));
    // Older than the last `keep`: gone.
    await this.run((db) => db.delete(t).where(and(eq(t.appId, version.appId), lte(t.number, version.number - keep))));
  }

  async listLayoutVersions(appId: string): Promise<AppLayoutVersionSummary[]> {
    const t = schema.appLayoutVersions;
    return this.run((db) =>
      db.select({ appId: t.appId, number: t.number, publishedAt: t.publishedAt, publishedBy: t.publishedBy }).from(t).where(eq(t.appId, appId)).orderBy(desc(t.number)),
    );
  }

  async getLayoutVersion(appId: string, number: number): Promise<AppLayoutVersion | null> {
    const t = schema.appLayoutVersions;
    const rows = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.number, number))).limit(1));
    return rows[0] ?? null;
  }

  // 84.3 Saved sections

  async listSavedSections(clientId: string): Promise<SavedSection[]> {
    const t = schema.savedSections;
    return this.run((db) => db.select().from(t).where(eq(t.clientId, clientId)).orderBy(desc(t.createdAt)));
  }

  async createSavedSection(section: SavedSection): Promise<void> {
    await this.run((db) => db.insert(schema.savedSections).values(section));
  }

  async listStudioTemplates(clientId: string): Promise<StudioTemplate[]> {
    const t = schema.studioTemplates;
    return this.run((db) => db.select().from(t).where(eq(t.clientId, clientId)).orderBy(desc(t.createdAt)));
  }

  async createStudioTemplate(template: StudioTemplate): Promise<void> {
    await this.run((db) => db.insert(schema.studioTemplates).values(template));
  }

  async deleteStudioTemplate(clientId: string, id: string): Promise<boolean> {
    const t = schema.studioTemplates;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.clientId, clientId), eq(t.id, id))));
    return result.affectedRows > 0;
  }

  // 97.2 Own fonts

  async listOwnFonts(appId: string): Promise<OwnFont[]> {
    const t = schema.ownFonts;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(asc(t.family)));
  }

  async saveOwnFont(font: OwnFont): Promise<void> {
    const { id: _id, ...rest } = font;
    void _id;
    await this.run((db) => db.insert(schema.ownFonts).values(font).onDuplicateKeyUpdate({ set: rest }));
  }

  async deleteOwnFont(appId: string, id: string): Promise<boolean> {
    const t = schema.ownFonts;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
    return result.affectedRows > 0;
  }

  // 100.2 Store products

  async listStoreProducts(appId: string): Promise<StoreProduct[]> {
    const t = schema.storeProducts;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(asc(t.kind), asc(t.title), asc(t.productId)));
  }

  async getStoreProduct(appId: string, productId: string): Promise<StoreProduct | null> {
    const t = schema.storeProducts;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.productId, productId))).limit(1));
    return row ?? null;
  }

  async saveStoreProduct(product: StoreProduct): Promise<void> {
    // The unique (app, product ID) keeps the first id.
    const { id: _id, appId: _appId, productId: _productId, createdAt: _createdAt, ...rest } = product;
    void _id;
    void _appId;
    void _productId;
    void _createdAt;
    await this.run((db) => db.insert(schema.storeProducts).values(product).onDuplicateKeyUpdate({ set: rest }));
  }

  // 100.7 What the owner listed as sold in the app

  async listStoreBillingItems(appId: string): Promise<StoreBillingItem[]> {
    const t = schema.storeBillingItems;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(asc(t.kind), asc(t.title), asc(t.itemId)));
  }

  async saveStoreBillingItem(item: StoreBillingItem): Promise<void> {
    // The unique (app, kind, item ID) keeps the first id and creation time.
    const { id: _id, appId: _appId, kind: _kind, itemId: _itemId, createdAt: _createdAt, ...rest } = item;
    void _id;
    void _appId;
    void _kind;
    void _itemId;
    void _createdAt;
    await this.run((db) => db.insert(schema.storeBillingItems).values(item).onDuplicateKeyUpdate({ set: rest }));
  }

  // 100.3 Store purchases and billing sessions

  async getStorePurchase(appId: string, platform: StorePurchaseRecord["platform"], storeKey: string): Promise<StorePurchaseRecord | null> {
    const t = schema.storePurchases;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.platform, platform), eq(t.storeKey, storeKey))).limit(1));
    return row ?? null;
  }

  async createStorePurchase(purchase: StorePurchaseRecord): Promise<StorePurchaseRecord> {
    // The unique (app, platform, store key) keeps the first.
    await this.run((db) => db.insert(schema.storePurchases).ignore().values(purchase));
    return (await this.getStorePurchase(purchase.appId, purchase.platform, purchase.storeKey)) ?? purchase;
  }

  async saveStorePurchase(purchase: StorePurchaseRecord): Promise<void> {
    const { id, ...rest } = purchase;
    await this.run((db) => db.update(schema.storePurchases).set(rest).where(eq(schema.storePurchases.id, id)));
  }

  async listAccountStorePurchases(appId: string, accountSource: StorePurchaseRecord["accountSource"], accountId: string): Promise<StorePurchaseRecord[]> {
    const t = schema.storePurchases;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.accountSource, accountSource), eq(t.accountId, accountId)))
        .orderBy(desc(t.createdAt)),
    );
  }

  async listUndeliveredStorePurchases(before: Date, limit: number): Promise<StorePurchaseRecord[]> {
    const t = schema.storePurchases;
    return this.run((db) => db.select().from(t).where(and(eq(t.delivered, false), lt(t.updatedAt, before))).orderBy(asc(t.updatedAt)).limit(limit));
  }

  async listEndingStorePurchases(before: Date, limit: number): Promise<StorePurchaseRecord[]> {
    const t = schema.storePurchases;
    return this.run((db) => db.select().from(t).where(and(eq(t.status, "active"), isNotNull(t.expiresAt), lt(t.expiresAt, before))).orderBy(asc(t.expiresAt)).limit(limit));
  }

  async addStorePurchaseEvent(event: StorePurchaseEvent): Promise<void> {
    await this.run((db) => db.insert(schema.storePurchaseEvents).values(event));
  }

  async listStorePurchaseEvents(appId: string, from: Date, to: Date): Promise<StorePurchaseEvent[]> {
    const t = schema.storePurchaseEvents;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.test, false), gte(t.at, from), lt(t.at, to)))
        .orderBy(asc(t.at)),
    );
  }

  async createBillingSession(session: BillingSession): Promise<void> {
    await this.run((db) => db.insert(schema.billingSessions).values(session));
  }

  async getBillingSession(tokenHash: string): Promise<BillingSession | null> {
    const [row] = await this.run((db) => db.select().from(schema.billingSessions).where(eq(schema.billingSessions.tokenHash, tokenHash)).limit(1));
    return row ?? null;
  }

  async deleteSavedSection(clientId: string, id: string): Promise<boolean> {
    const t = schema.savedSections;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.clientId, clientId), eq(t.id, id))));
    return result.affectedRows > 0;
  }

  // 11.7 Admin team and audit log

  async listAdminMembers(): Promise<AdminMemberRow[]> {
    return this.run((db) =>
      db
        .select({ member: schema.adminMembers, user: schema.users })
        .from(schema.adminMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.adminMembers.userId))
        .orderBy(asc(schema.adminMembers.addedAt)),
    );
  }

  async getAdminMember(userId: string): Promise<AdminMember | null> {
    const rows = await this.run((db) => db.select().from(schema.adminMembers).where(eq(schema.adminMembers.userId, userId)).limit(1));
    return rows[0] ?? null;
  }

  async saveAdminMember(member: AdminMember): Promise<void> {
    await this.run((db) =>
      db
        .insert(schema.adminMembers)
        .values(member)
        .onDuplicateKeyUpdate({ set: { role: member.role, addedBy: member.addedBy, updatedAt: member.updatedAt } }),
    );
  }

  async deleteAdminMember(userId: string): Promise<void> {
    await this.run((db) => db.delete(schema.adminMembers).where(eq(schema.adminMembers.userId, userId)));
  }

  async createAuditEntry(entry: Omit<AuditEntry, "id">): Promise<AuditEntry> {
    const [result] = await this.run((db) => db.insert(schema.adminAuditLog).values(entry));
    return { id: Number(result.insertId), ...entry };
  }

  async listAuditEntries(query: AuditQuery): Promise<{ items: AuditEntry[]; total: number }> {
    const t = schema.adminAuditLog;
    const actor = query.actor?.trim();
    const where = and(
      actor ? like(t.actorEmail, `%${actor.replace(/[\\%_]/g, (c) => `\\${c}`)}%`) : undefined,
      query.action ? eq(t.action, query.action) : undefined,
      query.targetType ? eq(t.targetType, query.targetType) : undefined,
      query.targetId ? eq(t.targetId, query.targetId) : undefined,
      query.clientId ? eq(t.clientId, query.clientId) : undefined,
      query.from ? gte(t.at, query.from) : undefined,
      query.to ? lt(t.at, query.to) : undefined,
    );
    const [items, totals] = await Promise.all([
      this.run((db) => db.select().from(t).where(where).orderBy(desc(t.at), desc(t.id)).limit(query.limit).offset(query.offset)),
      this.run((db) => db.select({ n: count() }).from(t).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }

  // 11.1 Overview

  async listApps(): Promise<App[]> {
    return this.run((db) => db.select().from(schema.apps).where(liveApp()).orderBy(asc(schema.apps.createdAt)));
  }

  async listPendingPayments(query: { startedAfter: Date; startedBefore: Date; checkedBefore: Date; limit: number }): Promise<PendingPayment[]> {
    const where = (t: typeof schema.catalogOrders | typeof schema.planPayments | typeof schema.donations) =>
      and(
        eq(t.status, "pending"),
        isNotNull(t.providerRef),
        gte(t.createdAt, query.startedAfter),
        lte(t.createdAt, query.startedBefore),
        or(isNull(t.providerCheckedAt), lte(t.providerCheckedAt, query.checkedBefore)),
      );
    const [orders, plans, donations] = await Promise.all([
      this.run((db) => db.select().from(schema.catalogOrders).where(where(schema.catalogOrders)).orderBy(asc(schema.catalogOrders.createdAt)).limit(query.limit)),
      this.run((db) => db.select().from(schema.planPayments).where(where(schema.planPayments)).orderBy(asc(schema.planPayments.createdAt)).limit(query.limit)),
      this.run((db) => db.select().from(schema.donations).where(where(schema.donations)).orderBy(asc(schema.donations.createdAt)).limit(query.limit)),
    ]);
    const all: PendingPayment[] = [
      ...orders.map((record) => ({ kind: "order" as const, record: record as CatalogOrder })),
      ...plans.map((record) => ({ kind: "plan" as const, record: record as PlanPayment })),
      ...donations.map((record) => ({ kind: "donation" as const, record: record as Donation })),
    ];
    return all.sort((a, b) => a.record.createdAt.getTime() - b.record.createdAt.getTime()).slice(0, query.limit);
  }

  async markPaymentChecked(kind: PendingPayment["kind"], id: string | number, now: Date): Promise<void> {
    if (kind === "order") await this.run((db) => db.update(schema.catalogOrders).set({ providerCheckedAt: now }).where(eq(schema.catalogOrders.id, Number(id))));
    else if (kind === "plan") await this.run((db) => db.update(schema.planPayments).set({ providerCheckedAt: now }).where(eq(schema.planPayments.id, String(id))));
    else await this.run((db) => db.update(schema.donations).set({ providerCheckedAt: now }).where(eq(schema.donations.id, Number(id))));
  }

  async listAppsToCheck(before: Date, limit: number): Promise<App[]> {
    const checked = schema.apps.integrationsCheckedAt;
    // NULL sorts first in ascending order: apps never checked come first.
    return this.run((db) =>
      db
        .select()
        .from(schema.apps)
        .where(and(liveApp(), eq(schema.apps.demo, false), or(isNull(checked), lte(checked, before))))
        .orderBy(asc(checked), asc(schema.apps.createdAt))
        .limit(limit),
    );
  }

  async listStoreBillingApps(): Promise<App[]> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.apps)
        .where(and(liveApp(), eq(schema.apps.demo, false), isNotNull(schema.apps.storeBilling)))
        .orderBy(asc(schema.apps.createdAt)),
    );
    return rows.filter((app) => app.storeBilling?.enabled);
  }

  async listBuildsSince(since: Date): Promise<Build[]> {
    const rows = await this.run((db) => db.select().from(schema.builds).where(gte(schema.builds.createdAt, since)).orderBy(desc(schema.builds.createdAt)));
    return rows.map(toBuild);
  }

  async listPaidPlanPaymentsSince(since: Date): Promise<PlanPayment[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.planPayments)
        .where(and(eq(schema.planPayments.status, "paid"), gte(schema.planPayments.paidAt, since))),
    );
  }

  async listMarketplaceOrdersSince(since: Date): Promise<CatalogOrder[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.catalogOrders)
        .where(and(isNotNull(schema.catalogOrders.commissionCents), gte(schema.catalogOrders.paidAt, since))),
    );
  }

  async countHostedUsersByApp(): Promise<Record<string, number>> {
    const rows = await this.run((db) =>
      db.select({ appId: schema.hostedUsers.appId, n: count() }).from(schema.hostedUsers).groupBy(schema.hostedUsers.appId),
    );
    return Object.fromEntries(rows.map((r) => [r.appId, r.n]));
  }

  // 11.2 Client page

  async listHostedUsers(input: { appId: string; query?: string; offset: number; limit: number }): Promise<{ items: HostedUser[]; total: number }> {
    const t = schema.hostedUsers;
    const q = input.query?.trim();
    const pattern = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
    const where = and(eq(t.appId, input.appId), pattern ? or(like(t.name, pattern), like(t.phone, pattern), like(t.email, pattern)) : undefined);
    const [items, totals] = await Promise.all([
      this.run((db) => db.select().from(t).where(where).orderBy(desc(t.createdAt), desc(t.id)).limit(input.limit).offset(input.offset)),
      this.run((db) => db.select({ n: count() }).from(t).where(where)),
    ]);
    return { items, total: totals[0]?.n ?? 0 };
  }


  // 11.3 Website content

  async listSiteContent(): Promise<SiteContentRecord[]> {
    return this.run((db) => db.select().from(schema.siteContent));
  }

  async getSiteContent(key: string): Promise<SiteContentRecord | null> {
    const rows = await this.run((db) => db.select().from(schema.siteContent).where(eq(schema.siteContent.key, key)).limit(1));
    return rows[0] ?? null;
  }

  async setSiteContent(key: string, fields: Record<string, string> | null, updatedBy: string, now: Date): Promise<void> {
    if (fields === null) {
      await this.run((db) => db.delete(schema.siteContent).where(eq(schema.siteContent.key, key)));
      return;
    }
    await this.run((db) =>
      db
        .insert(schema.siteContent)
        .values({ key, fields, updatedAt: now, updatedBy })
        .onDuplicateKeyUpdate({ set: { fields, updatedAt: now, updatedBy } }),
    );
  }

  // 11.4 Email templates

  async listEmailTemplates(): Promise<EmailTemplateRecord[]> {
    return this.run((db) => db.select().from(schema.emailTemplates));
  }

  async getEmailTemplate(key: string): Promise<EmailTemplateRecord | null> {
    const rows = await this.run((db) => db.select().from(schema.emailTemplates).where(eq(schema.emailTemplates.key, key)).limit(1));
    return rows[0] ?? null;
  }

  async setEmailTemplate(key: string, template: { subject: string; body: string } | null, updatedBy: string, now: Date): Promise<void> {
    if (template === null) {
      await this.run((db) => db.delete(schema.emailTemplates).where(eq(schema.emailTemplates.key, key)));
      return;
    }
    const set = { subject: template.subject, body: template.body, updatedAt: now, updatedBy };
    await this.run((db) => db.insert(schema.emailTemplates).values({ key, ...set }).onDuplicateKeyUpdate({ set }));
  }

  // 11.6 Coupons

  async createCoupon(coupon: Coupon): Promise<boolean> {
    try {
      await this.run((db) => db.insert(schema.coupons).values(coupon));
      return true;
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return false;
      throw error;
    }
  }

  async updateCoupon(id: string, patch: CouponPatch, now: Date): Promise<boolean> {
    try {
      await this.run((db) => db.update(schema.coupons).set({ ...patch, updatedAt: now }).where(eq(schema.coupons.id, id)));
      return true;
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return false;
      throw error;
    }
  }

  async getCoupon(id: string): Promise<Coupon | null> {
    const rows = await this.run((db) => db.select().from(schema.coupons).where(eq(schema.coupons.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    const rows = await this.run((db) => db.select().from(schema.coupons).where(eq(schema.coupons.code, code)).limit(1));
    return rows[0] ?? null;
  }

  async listCoupons(): Promise<Coupon[]> {
    return this.run((db) => db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt)));
  }

  async createCouponRedemption(redemption: CouponRedemption): Promise<void> {
    await this.run((db) => db.insert(schema.couponRedemptions).values(redemption));
  }

  async claimCouponRedemption(redemption: CouponRedemption, limits: CouponClaimLimits, payment?: PlanPayment): Promise<boolean> {
    const t = schema.couponRedemptions;
    return this.run((db) =>
      db.transaction(async (tx) => {
        // 70 The coupon's row is locked until the use is saved: two payments at once count one after the other.
        const locked = await tx.select({ id: schema.coupons.id }).from(schema.coupons).where(eq(schema.coupons.id, redemption.couponId)).for("update");
        if (!locked.length) return false;
        const counted = or(eq(t.status, "redeemed"), and(eq(t.status, "pending"), gt(t.createdAt, limits.pendingSince)));
        if (limits.maxRedemptions !== null) {
          const [all] = await tx.select({ n: count() }).from(t).where(and(eq(t.couponId, redemption.couponId), counted));
          if (Number(all?.n ?? 0) >= limits.maxRedemptions) return false;
        }
        if (limits.maxPerClient !== null) {
          const [mine] = await tx.select({ n: count() }).from(t).where(and(eq(t.couponId, redemption.couponId), eq(t.clientId, redemption.clientId), counted));
          if (Number(mine?.n ?? 0) >= limits.maxPerClient) return false;
        }
        if (payment) await tx.insert(schema.planPayments).values(payment);
        await tx.insert(t).values(redemption);
        return true;
      }),
    );
  }

  async settleCouponRedemption(paymentId: string, status: "redeemed" | "failed", now: Date): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.couponRedemptions)
        .set({ status, redeemedAt: status === "redeemed" ? now : null })
        .where(and(eq(schema.couponRedemptions.paymentId, paymentId), eq(schema.couponRedemptions.status, "pending"))),
    );
  }

  async listCouponRedemptions(input: { couponId?: string; clientId?: string }): Promise<CouponRedemption[]> {
    return this.run((db) =>
      db
        .select()
        .from(schema.couponRedemptions)
        .where(
          and(
            input.couponId !== undefined ? eq(schema.couponRedemptions.couponId, input.couponId) : undefined,
            input.clientId !== undefined ? eq(schema.couponRedemptions.clientId, input.clientId) : undefined,
          ),
        )
        .orderBy(desc(schema.couponRedemptions.createdAt)),
    );
  }

  // 11.8 Announcements

  async createAnnouncement(announcement: Announcement): Promise<void> {
    await this.run((db) => db.insert(schema.announcements).values(announcement));
  }

  async updateAnnouncement(id: string, patch: AnnouncementPatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.announcements).set({ ...patch, updatedAt: now }).where(eq(schema.announcements.id, id)));
  }

  async deleteAnnouncement(id: string): Promise<void> {
    // Dismissals go with it (foreign key on delete cascade); 57 its reads in the bell too.
    await this.run((db) => db.delete(schema.updateReads).where(eq(schema.updateReads.item, `announcement:${id}`)));
    await this.run((db) => db.delete(schema.announcements).where(eq(schema.announcements.id, id)));
  }

  async getAnnouncement(id: string): Promise<Announcement | null> {
    const rows = await this.run((db) => db.select().from(schema.announcements).where(eq(schema.announcements.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async listAnnouncements(): Promise<Announcement[]> {
    return this.run((db) => db.select().from(schema.announcements).orderBy(desc(schema.announcements.startsAt)));
  }

  async dismissAnnouncement(input: { announcementId: string; clientId: string; now: Date }): Promise<void> {
    if (!(await this.getAnnouncement(input.announcementId))) return;
    await this.run((db) =>
      db
        .insert(schema.announcementDismissals)
        .values({ announcementId: input.announcementId, clientId: input.clientId, dismissedAt: input.now })
        .onDuplicateKeyUpdate({ set: { announcementId: input.announcementId } }),
    );
  }

  async listDismissedAnnouncementIds(clientId: string): Promise<string[]> {
    const rows = await this.run((db) =>
      db
        .select({ id: schema.announcementDismissals.announcementId })
        .from(schema.announcementDismissals)
        .where(eq(schema.announcementDismissals.clientId, clientId)),
    );
    return rows.map((r) => r.id);
  }

  // 57 The dashboard's bell

  async markUpdatesRead(input: { userId: string; items: string[]; now: Date }): Promise<void> {
    const items = [...new Set(input.items)];
    if (!items.length) return;
    await this.run((db) =>
      db
        .insert(schema.updateReads)
        .values(items.map((item) => ({ userId: input.userId, item, readAt: input.now })))
        // Read before: keeps its first time.
        .onDuplicateKeyUpdate({ set: { item: sql`${schema.updateReads.item}` } }),
    );
  }

  async listReadUpdates(userId: string, items: string[]): Promise<string[]> {
    const wanted = [...new Set(items)];
    if (!wanted.length) return [];
    const rows = await this.run((db) =>
      db
        .select({ item: schema.updateReads.item })
        .from(schema.updateReads)
        .where(and(eq(schema.updateReads.userId, userId), inArray(schema.updateReads.item, wanted))),
    );
    return rows.map((r) => r.item);
  }

  // 13 Plans, limits and owner notices

  async listLicenses(): Promise<License[]> {
    return this.run((db) => db.select().from(schema.licenses).where(liveLicense()));
  }

  async createOwnerNotice(notice: Omit<OwnerNotice, "id">): Promise<OwnerNotice | null> {
    try {
      const [result] = await this.run((db) => db.insert(schema.ownerNotices).values(notice));
      return { id: Number(result.insertId), ...notice };
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return null;
      throw error;
    }
  }

  async listOwnerNotices(input: { clientId: string; appId?: string; open?: boolean; limit?: number }): Promise<OwnerNotice[]> {
    const n = schema.ownerNotices;
    return this.run((db) =>
      db
        .select()
        .from(n)
        .where(
          and(
            eq(n.clientId, input.clientId),
            input.appId === undefined ? undefined : eq(n.appId, input.appId),
            input.open ? and(isNull(n.dismissedAt), isNull(n.resolvedAt)) : undefined,
          ),
        )
        .orderBy(desc(n.createdAt), desc(n.id))
        .limit(input.limit ?? 100),
    );
  }

  async countOwnerNotices(appId: string, kind: OwnerNoticeKind): Promise<number> {
    const n = schema.ownerNotices;
    const [row] = await this.run((db) => db.select({ total: count() }).from(n).where(and(eq(n.appId, appId), eq(n.kind, kind))));
    return Number(row?.total ?? 0);
  }

  async updateOwnerNotice(clientId: string, id: number, patch: OwnerNoticePatch): Promise<void> {
    const n = schema.ownerNotices;
    await this.run((db) => db.update(n).set(patch).where(and(eq(n.id, id), eq(n.clientId, clientId))));
  }

  async resolveOwnerNotices(appId: string, kinds: OwnerNoticeKind[], now: Date): Promise<void> {
    if (!kinds.length) return;
    const n = schema.ownerNotices;
    await this.run((db) => db.update(n).set({ resolvedAt: now }).where(and(eq(n.appId, appId), inArray(n.kind, kinds), isNull(n.resolvedAt))));
  }

  // 46 Links that open the app and crash reports
  async listAppLinkTargets(): Promise<AppLinkTarget[]> {
    const a = schema.apps;
    return this.run((db) =>
      db
        .select({
          id: a.id,
          androidPackage: a.androidPackage,
          iosBundleId: a.iosBundleId,
          playSigningSha256: a.playSigningSha256,
          androidUploadSha256: a.androidUploadSha256,
          appleTeamId: a.appleTeamId,
        })
        .from(a)
        .where(and(or(isNotNull(a.androidPackage), isNotNull(a.iosBundleId)), liveApp()))
        .orderBy(asc(a.createdAt), asc(a.id)),
    );
  }

  async recordCrashReports(appId: string, reports: CrashReportInput[], runs: { day: string; sessions: number; crashed: number }): Promise<void> {
    const c = schema.crashIssues;
    await this.run((db) =>
      db.transaction(async (tx) => {
        // Locks the app's row, so two batches with the same new fingerprint can't both start a group.
        await tx.select({ id: schema.apps.id }).from(schema.apps).where(eq(schema.apps.id, appId)).for("update");
        for (const report of reports) {
          const [row] = await tx
            .select()
            .from(c)
            .where(and(eq(c.appId, appId), eq(c.fingerprint, report.fingerprint)))
            .limit(1);
          const merged = mergeCrash(row ?? null, appId, report);
          if (row) await tx.update(c).set(merged).where(eq(c.id, row.id));
          else await tx.insert(c).values(merged);
        }
        if (runs.sessions > 0 || runs.crashed > 0) {
          await tx.execute(
            sql`insert into crash_sessions (app_id, day, sessions, crashed) values (${appId}, ${runs.day}, ${runs.sessions}, ${runs.crashed})
                on duplicate key update sessions = sessions + values(sessions), crashed = crashed + values(crashed)`,
          );
        }
      }),
    );
  }

  async listCrashIssues(input: { appId?: string; status?: CrashIssueStatus; limit: number }): Promise<CrashIssue[]> {
    const c = schema.crashIssues;
    const where = and(input.appId === undefined ? undefined : eq(c.appId, input.appId), input.status === undefined ? undefined : eq(c.status, input.status));
    return this.run((db) => db.select().from(c).where(where).orderBy(desc(c.lastSeenAt), asc(c.id)).limit(input.limit));
  }

  async getCrashIssue(id: string): Promise<CrashIssue | null> {
    const rows = await this.run((db) => db.select().from(schema.crashIssues).where(eq(schema.crashIssues.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async setCrashIssueStatus(id: string, status: CrashIssueStatus, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .update(schema.crashIssues)
        .set({ status, resolvedAt: status === "resolved" ? now : null })
        .where(eq(schema.crashIssues.id, id)),
    );
  }

  // 49 Signed notices to an app's own API
  async createApiWebhook(webhook: ApiWebhook): Promise<void> {
    await this.run((db) => db.insert(schema.apiWebhooks).values(webhook));
  }

  async getApiWebhook(id: string): Promise<ApiWebhook | null> {
    const rows = await this.run((db) => db.select().from(schema.apiWebhooks).where(eq(schema.apiWebhooks.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async listDueApiWebhooks(now: Date, limit: number): Promise<ApiWebhook[]> {
    const w = schema.apiWebhooks;
    return this.run((db) =>
      db
        .select()
        .from(w)
        .where(and(eq(w.status, "pending"), lte(w.nextAttemptAt, now)))
        .orderBy(asc(w.nextAttemptAt), asc(w.createdAt))
        .limit(limit),
    );
  }

  async claimApiWebhook(id: string, until: Date, now: Date): Promise<boolean> {
    const w = schema.apiWebhooks;
    const [result] = await this.run((db) =>
      db
        .update(w)
        .set({ nextAttemptAt: until })
        .where(and(eq(w.id, id), eq(w.status, "pending"), lte(w.nextAttemptAt, now))),
    );
    return result.affectedRows === 1;
  }

  async updateApiWebhook(id: string, patch: ApiWebhookPatch): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    await this.run((db) => db.update(schema.apiWebhooks).set(patch).where(eq(schema.apiWebhooks.id, id)));
  }

  async listApiWebhooks(appId: string, limit: number, events?: ApiWebhookEvent[]): Promise<ApiWebhook[]> {
    const w = schema.apiWebhooks;
    if (events && events.length === 0) return [];
    return this.run((db) =>
      db
        .select()
        .from(w)
        .where(events ? and(eq(w.appId, appId), inArray(w.event, events)) : eq(w.appId, appId))
        .orderBy(desc(w.createdAt), asc(w.id))
        .limit(limit),
    );
  }

  async purgeApiWebhooks(before: Date): Promise<number> {
    const [result] = await this.run((db) => db.delete(schema.apiWebhooks).where(lt(schema.apiWebhooks.createdAt, before)));
    return result.affectedRows;
  }

  async crashSessionTotals(appId: string, sinceDay: string): Promise<{ sessions: number; crashed: number }> {
    const r = schema.crashSessions;
    const [row] = await this.run((db) =>
      db
        .select({ sessions: sql<string | null>`sum(${r.sessions})`, crashed: sql<string | null>`sum(${r.crashed})` })
        .from(r)
        .where(and(eq(r.appId, appId), gte(r.day, sinceDay))),
    );
    return { sessions: Number(row?.sessions ?? 0), crashed: Number(row?.crashed ?? 0) };
  }

  // 16 Demo apps
  async purgeDemoActivity(appId: string, before: Date): Promise<DemoPurgeCounts> {
    const s = schema;
    // Each statement is limited to the one app; messages and refresh tokens cascade.
    // 28 Tickets first: a ticket of a deleted order goes with it.
    const [tickets] = await this.run((db) => db.delete(s.eventTickets).where(and(eq(s.eventTickets.appId, appId), lt(s.eventTickets.createdAt, before))));
    const [orders] = await this.run((db) => db.delete(s.catalogOrders).where(and(eq(s.catalogOrders.appId, appId), lt(s.catalogOrders.createdAt, before))));
    const [appointments] = await this.run((db) =>
      db.delete(s.bookingAppointments).where(and(eq(s.bookingAppointments.appId, appId), lt(s.bookingAppointments.createdAt, before))),
    );
    const [inquiries] = await this.run((db) =>
      db.delete(s.listingInquiries).where(and(eq(s.listingInquiries.appId, appId), lt(s.listingInquiries.createdAt, before))),
    );
    const [favorites] = await this.run((db) =>
      db.delete(s.listingFavorites).where(and(eq(s.listingFavorites.appId, appId), lt(s.listingFavorites.createdAt, before))),
    );
    const [enrollments] = await this.run((db) =>
      db.delete(s.courseEnrollments).where(and(eq(s.courseEnrollments.appId, appId), lt(s.courseEnrollments.enrolledAt, before))),
    );
    const [progress] = await this.run((db) =>
      db.delete(s.lessonProgress).where(and(eq(s.lessonProgress.appId, appId), lt(s.lessonProgress.updatedAt, before))),
    );
    // 90.1 Quiz attempts count with the progress.
    const [attempts] = await this.run((db) => db.delete(s.quizAttempts).where(and(eq(s.quizAttempts.appId, appId), lt(s.quizAttempts.startedAt, before))));
    const [notifications] = await this.run((db) =>
      db
        .delete(s.hostedNotifications)
        .where(and(eq(s.hostedNotifications.appId, appId), isNotNull(s.hostedNotifications.userId), lt(s.hostedNotifications.createdAt, before))),
    );
    const [devices] = await this.run((db) =>
      db.delete(s.hostedDevices).where(and(eq(s.hostedDevices.appId, appId), lt(s.hostedDevices.lastSeenAt, before))),
    );
    // 27 Spots taken more than a day ago are freed (the classes count what's left); memberships bought then are gone.
    const [classBookings] = await this.run((db) =>
      db.delete(s.classBookings).where(and(eq(s.classBookings.appId, appId), lt(s.classBookings.updatedAt, before))),
    );
    if (classBookings.affectedRows > 0) {
      await this.run((db) =>
        db
          .update(s.classSessions)
          .set({
            bookedCount: sql`(select count(*) from ${s.classBookings} where ${s.classBookings.sessionId} = ${s.classSessions.id} and ${s.classBookings.status} = 'booked')`,
          })
          .where(eq(s.classSessions.appId, appId)),
      );
    }
    const [memberships] = await this.run((db) => db.delete(s.memberships).where(and(eq(s.memberships.appId, appId), lt(s.memberships.createdAt, before))));
    const [donations] = await this.run((db) => db.delete(s.donations).where(and(eq(s.donations.appId, appId), lt(s.donations.createdAt, before))));
    // 63 Visitors' questions (their answers cascade) and reviews of demo academies.
    const [questions] = await this.run((db) => db.delete(s.courseQuestions).where(and(eq(s.courseQuestions.appId, appId), lt(s.courseQuestions.createdAt, before))));
    const [reviews] = await this.run((db) => db.delete(s.courseReviews).where(and(eq(s.courseReviews.appId, appId), lt(s.courseReviews.createdAt, before))));
    return {
      questions: questions.affectedRows,
      reviews: reviews.affectedRows,
      donations: donations.affectedRows,
      orders: orders.affectedRows,
      appointments: appointments.affectedRows,
      inquiries: inquiries.affectedRows,
      favorites: favorites.affectedRows,
      enrollments: enrollments.affectedRows,
      progress: progress.affectedRows + attempts.affectedRows,
      devices: devices.affectedRows,
      notifications: notifications.affectedRows,
      classBookings: classBookings.affectedRows,
      memberships: memberships.affectedRows,
      tickets: tickets.affectedRows,
    };
  }

  // 14.1 We publish for you
  async getPublishingRequest(appId: string): Promise<PublishingRequest | null> {
    const t = schema.publishingRequests;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.appId, appId)).limit(1));
    return row ? toPublishingRequest(row) : null;
  }

  async savePublishingRequest(request: PublishingRequest): Promise<void> {
    const row = fromPublishingRequest(request);
    // Everything but the key and the creation time.
    const update: Partial<typeof row> = { ...row };
    delete update.appId;
    delete update.createdAt;
    await this.run((db) => db.insert(schema.publishingRequests).values(row).onDuplicateKeyUpdate({ set: update }));
  }

  async listManagedPublishingRequests(): Promise<PublishingRequest[]> {
    const t = schema.publishingRequests;
    const rows = await this.run((db) => db.select().from(t).where(eq(t.mode, "managed")).orderBy(asc(t.requestedAt), asc(t.appId)));
    return rows.map(toPublishingRequest);
  }

  async addPublishingEvent(event: Omit<PublishingEvent, "id">): Promise<PublishingEvent> {
    const [result] = await this.run((db) => db.insert(schema.publishingEvents).values(event));
    return { id: Number(result.insertId), ...event };
  }

  async listPublishingEvents(appId: string): Promise<PublishingEvent[]> {
    const t = schema.publishingEvents;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(desc(t.at), desc(t.id)));
  }

  // 44 Analytics for app owners

  async insertAnalyticsEvents(events: AnalyticsEventRow[]): Promise<void> {
    if (events.length === 0) return;
    await this.run((db) => db.insert(schema.analyticsEvents).values(events));
  }

  async listAnalyticsEvents(appId: string, day: string): Promise<AnalyticsEventRow[]> {
    const t = schema.analyticsEvents;
    const rows = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.day, day))));
    return rows.map((row) => {
      const event: AnalyticsEventRow & { id?: number } = { ...row, firstOpen: Boolean(row.firstOpen) };
      delete event.id;
      return event;
    });
  }

  async countAnalyticsActive(appId: string, fromDay: string, toDay: string): Promise<number> {
    const t = schema.analyticsEvents;
    const rows = await this.run((db) =>
      db
        .select({ n: sql<number>`count(distinct ${t.installId})` })
        .from(t)
        .where(and(eq(t.appId, appId), gte(t.day, fromDay), lte(t.day, toDay))),
    );
    return Number(rows[0]?.n ?? 0);
  }

  async countAnalyticsVersions(appId: string, fromDay: string): Promise<{ version: string; installs: number }[]> {
    // Each install's latest event (the newest first, one per install), then its version.
    const [rows] = (await this.run((db) =>
      db.execute(
        sql`select app_version as version, count(*) as n from (
              select app_version, row_number() over (partition by install_id order by at desc) as rn
              from analytics_events where app_id = ${appId} and day >= ${fromDay}
            ) latest where rn = 1 group by app_version order by n desc, app_version`,
      ),
    )) as unknown as [{ version: string; n: number | string }[]];
    return rows.map((r) => ({ version: String(r.version), installs: Number(r.n) }));
  }

  async countAnalyticsReturning(appId: string, cohortDay: string, day: string): Promise<number> {
    const [rows] = (await this.run((db) =>
      db.execute(
        sql`select count(distinct e.install_id) as n from analytics_events e
            where e.app_id = ${appId} and e.day = ${day} and e.install_id in (
              select f.install_id from analytics_events f
              where f.app_id = ${appId} and f.day = ${cohortDay} and f.type = 'app_open' and f.first_open = true)`,
      ),
    )) as unknown as [{ n: number | string }[]];
    return Number(rows[0]?.n ?? 0);
  }

  async saveAnalyticsDaily(appId: string, day: string, rows: AnalyticsDailyRow[]): Promise<void> {
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200).map((row) => ({ appId, day, metric: row.metric, key: row.key, label: row.label, value: row.value }));
      await this.run((db) =>
        db
          .insert(schema.analyticsDaily)
          .values(chunk)
          .onDuplicateKeyUpdate({ set: { value: sql`values(${schema.analyticsDaily.value})`, label: sql`values(${schema.analyticsDaily.label})` } }),
      );
    }
  }

  async addAnalyticsDaily(appId: string, day: string, row: AnalyticsDailyRow): Promise<void> {
    const t = schema.analyticsDaily;
    await this.run((db) =>
      db
        .insert(t)
        .values({ appId, day, metric: row.metric, key: row.key, label: row.label, value: row.value })
        .onDuplicateKeyUpdate({ set: { value: sql`${t.value} + values(${t.value})`, label: sql`coalesce(values(${t.label}), ${t.label})` } }),
    );
  }

  async listAnalyticsDaily(appId: string, fromDay: string, toDay: string, metrics?: AnalyticsMetric[]): Promise<AnalyticsDailyRecord[]> {
    const t = schema.analyticsDaily;
    if (metrics && metrics.length === 0) return [];
    const rows = await this.run((db) =>
      db
        .select({ day: t.day, metric: t.metric, key: t.key, label: t.label, value: t.value })
        .from(t)
        .where(and(eq(t.appId, appId), gte(t.day, fromDay), lte(t.day, toDay), ...(metrics ? [inArray(t.metric, metrics)] : [])))
        .orderBy(asc(t.day)),
    );
    return rows.map((row) => ({ ...row, value: Number(row.value) }));
  }

  async listAnalyticsEventDays(appId: string, fromDay: string): Promise<string[]> {
    const t = schema.analyticsEvents;
    const rows = await this.run((db) =>
      db
        .selectDistinct({ day: t.day })
        .from(t)
        .where(and(eq(t.appId, appId), gte(t.day, fromDay)))
        .orderBy(asc(t.day)),
    );
    return rows.map((row) => row.day);
  }

  async listAnalyticsAppIds(fromDay: string): Promise<string[]> {
    const t = schema.analyticsEvents;
    const rows = await this.run((db) => db.selectDistinct({ appId: t.appId }).from(t).where(gte(t.day, fromDay)));
    return rows.map((row) => row.appId);
  }

  async purgeAnalyticsEvents(beforeDay: string, limit?: number): Promise<number> {
    const t = schema.analyticsEvents;
    // 72 In batches (the day index), so one delete never holds the table for long.
    const [result] = await this.run((db) => (limit === undefined ? db.delete(t).where(lt(t.day, beforeDay)) : db.delete(t).where(lt(t.day, beforeDay)).limit(limit)));
    return result.affectedRows;
  }

  async purgeAnalyticsDaily(appId: string, beforeDay: string, limit: number): Promise<number> {
    const t = schema.analyticsDaily;
    // 72 The primary key starts with (app_id, day): one app's oldest rows, a batch at a time.
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), lt(t.day, beforeDay))).limit(limit));
    return result.affectedRows;
  }

  // 51 Videos and pictures hosted by Yallapp
  async createMediaFile(file: MediaFile): Promise<void> {
    await this.run((db) => db.insert(schema.mediaFiles).values(file));
  }

  async getMediaFile(appId: string, id: string): Promise<MediaFile | null> {
    const m = schema.mediaFiles;
    const [row] = await this.run((db) => db.select().from(m).where(and(eq(m.appId, appId), eq(m.id, id))).limit(1));
    return row ?? null;
  }

  async getMediaFileById(id: string): Promise<MediaFile | null> {
    const [row] = await this.run((db) => db.select().from(schema.mediaFiles).where(eq(schema.mediaFiles.id, id)).limit(1));
    return row ?? null;
  }

  async listMediaFiles(appId: string, input: { kind?: MediaKind; status?: MediaStatus; limit?: number } = {}): Promise<MediaFile[]> {
    const m = schema.mediaFiles;
    return this.run((db) =>
      db
        .select()
        .from(m)
        .where(and(eq(m.appId, appId), input.kind ? eq(m.kind, input.kind) : undefined, input.status ? eq(m.status, input.status) : undefined))
        .orderBy(desc(m.createdAt), asc(m.id))
        .limit(input.limit ?? 1000),
    );
  }

  async updateMediaFile(appId: string, id: string, patch: MediaFilePatch): Promise<void> {
    if (!Object.keys(patch).length) return;
    const m = schema.mediaFiles;
    await this.run((db) => db.update(m).set(patch).where(and(eq(m.appId, appId), eq(m.id, id))));
  }

  async deleteMediaFile(appId: string, id: string): Promise<void> {
    const m = schema.mediaFiles;
    await this.run((db) => db.delete(m).where(and(eq(m.appId, appId), eq(m.id, id))));
  }

  async mediaUsage(appId: string): Promise<number> {
    const m = schema.mediaFiles;
    const f = schema.ownFonts;
    const [[row], [fonts]] = await Promise.all([
      this.run((db) => db.select({ total: sql<string | null>`sum(${m.sizeBytes})` }).from(m).where(eq(m.appId, appId))),
      // 97.2 Own fonts count too.
      this.run((db) => db.select({ total: sql<string | null>`sum(${f.sizeBytes})` }).from(f).where(eq(f.appId, appId))),
    ]);
    return Number(row?.total ?? 0) + Number(fonts?.total ?? 0);
  }

  async listStaleMediaUploads(before: Date, limit: number): Promise<MediaFile[]> {
    const m = schema.mediaFiles;
    return this.run((db) =>
      db
        .select()
        .from(m)
        .where(and(eq(m.status, "uploading"), lt(m.updatedAt, before)))
        .orderBy(asc(m.updatedAt))
        .limit(limit),
    );
  }

  async createStoragePack(pack: StoragePack): Promise<void> {
    await this.run((db) => db.insert(schema.storagePacks).values(pack));
  }

  async listStoragePacks(appId: string): Promise<StoragePack[]> {
    const p = schema.storagePacks;
    return this.run((db) => db.select().from(p).where(eq(p.appId, appId)).orderBy(desc(p.activeUntil), asc(p.id)));
  }

  async updateStoragePack(id: string, patch: StoragePackPatch): Promise<void> {
    if (!Object.keys(patch).length) return;
    await this.run((db) => db.update(schema.storagePacks).set(patch).where(eq(schema.storagePacks.id, id)));
  }

  async deleteStoragePack(appId: string, id: string): Promise<void> {
    const p = schema.storagePacks;
    await this.run((db) => db.delete(p).where(and(eq(p.appId, appId), eq(p.id, id))));
  }

  async listEndedStoragePacks(now: Date, limit: number): Promise<StoragePack[]> {
    const p = schema.storagePacks;
    return this.run((db) =>
      db
        .select()
        .from(p)
        .where(and(lt(p.activeUntil, now), isNull(p.endedNoticeAt)))
        .orderBy(asc(p.activeUntil))
        .limit(limit),
    );
  }
  // 58 Yallapp Business: devices signed in with the dashboard's account
  async createOwnerDevice(device: OwnerDevice): Promise<void> {
    await this.run((db) => db.insert(schema.ownerDevices).values(device));
  }

  async getOwnerDevice(id: string): Promise<OwnerDevice | null> {
    const d = schema.ownerDevices;
    const [row] = await this.run((db) => db.select().from(d).where(eq(d.id, id)).limit(1));
    return row ?? null;
  }

  async findOwnerDeviceByRefresh(refreshHash: string): Promise<OwnerDevice | null> {
    const d = schema.ownerDevices;
    const [row] = await this.run((db) => db.select().from(d).where(eq(d.refreshHash, refreshHash)).limit(1));
    return row ?? null;
  }

  async rotateOwnerRefresh(id: string, oldHash: string, next: { refreshHash: string; refreshExpiresAt: Date; lastSeenAt: Date }): Promise<boolean> {
    const d = schema.ownerDevices;
    const [result] = await this.run((db) => db.update(d).set(next).where(and(eq(d.id, id), eq(d.refreshHash, oldHash))));
    return result.affectedRows === 1;
  }

  async updateOwnerDevice(id: string, patch: OwnerDevicePatch): Promise<void> {
    if (!Object.keys(patch).length) return;
    await this.run((db) => db.update(schema.ownerDevices).set(patch).where(eq(schema.ownerDevices.id, id)));
  }

  async listOwnerDevices(userId: string): Promise<OwnerDevice[]> {
    const d = schema.ownerDevices;
    return this.run((db) => db.select().from(d).where(eq(d.userId, userId)).orderBy(desc(d.lastSeenAt), asc(d.id)));
  }

  async deleteOwnerDevice(userId: string, id: string): Promise<boolean> {
    const d = schema.ownerDevices;
    const [result] = await this.run((db) => db.delete(d).where(and(eq(d.userId, userId), eq(d.id, id))));
    return result.affectedRows === 1;
  }

  async deleteOwnerDevices(userId: string): Promise<number> {
    const d = schema.ownerDevices;
    const [result] = await this.run((db) => db.delete(d).where(eq(d.userId, userId)));
    return result.affectedRows;
  }

  async clearOwnerPushToken(token: string, exceptId: string | null): Promise<void> {
    const d = schema.ownerDevices;
    await this.run((db) =>
      db
        .update(d)
        .set({ pushToken: null })
        .where(exceptId ? and(eq(d.pushToken, token), not(eq(d.id, exceptId))) : eq(d.pushToken, token)),
    );
  }

  async purgeOwnerDevices(now: Date): Promise<number> {
    const d = schema.ownerDevices;
    const [result] = await this.run((db) => db.delete(d).where(lte(d.refreshExpiresAt, now)));
    return result.affectedRows;
  }

  async deleteOwnerDevicesOfClient(userId: string, clientId: string): Promise<number> {
    const d = schema.ownerDevices;
    const [result] = await this.run((db) => db.delete(d).where(and(eq(d.userId, userId), eq(d.clientId, clientId))));
    return result.affectedRows;
  }

  async listOwnerDevicesOfClient(clientId: string): Promise<OwnerDevice[]> {
    const d = schema.ownerDevices;
    return this.run((db) => db.select().from(d).where(eq(d.clientId, clientId)));
  }

  // 60 Team members for clients

  async listTeamMembers(clientId: string): Promise<TeamMemberRow[]> {
    const m = schema.teamMembers;
    return this.run((db) =>
      db.select({ member: m, user: schema.users }).from(m).innerJoin(schema.users, eq(schema.users.id, m.userId)).where(eq(m.clientId, clientId)).orderBy(asc(m.createdAt), asc(m.userId)),
    );
  }

  async getTeamMember(clientId: string, userId: string): Promise<TeamMember | null> {
    const m = schema.teamMembers;
    const [row] = await this.run((db) => db.select().from(m).where(and(eq(m.clientId, clientId), eq(m.userId, userId))).limit(1));
    return row ?? null;
  }

  async listMembershipsOfUser(userId: string): Promise<TeamMember[]> {
    const m = schema.teamMembers;
    return this.run((db) => db.select().from(m).where(eq(m.userId, userId)).orderBy(asc(m.createdAt), asc(m.clientId)));
  }

  async saveTeamMember(member: TeamMember): Promise<void> {
    // The key and when they joined stay; the rest is replaced.
    const set = { role: member.role, areas: member.areas, appIds: member.appIds, addedBy: member.addedBy, updatedAt: member.updatedAt };
    await this.run((db) => db.insert(schema.teamMembers).values(member).onDuplicateKeyUpdate({ set }));
  }

  async deleteTeamMember(clientId: string, userId: string): Promise<boolean> {
    const m = schema.teamMembers;
    const [result] = await this.run((db) => db.delete(m).where(and(eq(m.clientId, clientId), eq(m.userId, userId))));
    return result.affectedRows === 1;
  }

  async createTeamInvitation(invitation: TeamInvitation): Promise<void> {
    await this.run((db) => db.insert(schema.teamInvitations).values(invitation));
  }

  async getTeamInvitation(clientId: string, id: string): Promise<TeamInvitation | null> {
    const i = schema.teamInvitations;
    const [row] = await this.run((db) => db.select().from(i).where(and(eq(i.clientId, clientId), eq(i.id, id))).limit(1));
    return row ?? null;
  }

  async getTeamInvitationByToken(tokenHash: string): Promise<TeamInvitation | null> {
    const i = schema.teamInvitations;
    const [row] = await this.run((db) => db.select().from(i).where(eq(i.tokenHash, tokenHash)).limit(1));
    return row ?? null;
  }

  async listOpenTeamInvitations(clientId: string): Promise<TeamInvitation[]> {
    const i = schema.teamInvitations;
    return this.run((db) =>
      db
        .select()
        .from(i)
        .where(and(eq(i.clientId, clientId), isNull(i.acceptedAt), isNull(i.cancelledAt)))
        .orderBy(desc(i.createdAt), asc(i.id)),
    );
  }

  async updateTeamInvitation(clientId: string, id: string, patch: TeamInvitationPatch): Promise<void> {
    if (!Object.keys(patch).length) return;
    const i = schema.teamInvitations;
    await this.run((db) => db.update(i).set(patch).where(and(eq(i.clientId, clientId), eq(i.id, id))));
  }

  async acceptTeamInvitation(id: string, tokenHash: string, now: Date): Promise<boolean> {
    const i = schema.teamInvitations;
    const [result] = await this.run((db) =>
      db
        .update(i)
        .set({ acceptedAt: now })
        .where(and(eq(i.id, id), eq(i.tokenHash, tokenHash), isNull(i.acceptedAt), isNull(i.cancelledAt), gt(i.expiresAt, now))),
    );
    return result.affectedRows === 1;
  }

  async addTeamActivity(entry: Omit<TeamActivity, "id">): Promise<void> {
    await this.run((db) => db.insert(schema.teamActivity).values(entry));
  }

  async listTeamActivity(clientId: string, input: { limit: number; offset?: number; actorId?: string }): Promise<{ items: TeamActivity[]; total: number }> {
    const a = schema.teamActivity;
    const where = input.actorId ? and(eq(a.clientId, clientId), eq(a.actorId, input.actorId)) : eq(a.clientId, clientId);
    const [items, [counted]] = await Promise.all([
      this.run((db) =>
        db
          .select()
          .from(a)
          .where(where)
          .orderBy(desc(a.at), desc(a.id))
          .limit(input.limit)
          .offset(input.offset ?? 0),
      ),
      this.run((db) => db.select({ n: count() }).from(a).where(where)),
    ]);
    return { items, total: counted?.n ?? 0 };
  }

  // 61 Moving an appointment

  async moveBookingAppointment(appId: string, id: number, move: BookingAppointmentMove): Promise<boolean> {
    const t = schema.bookingAppointments;
    return this.run((db) =>
      db.transaction(async (tx) => {
        // One booking at a time per app, as createBookingAppointment: the app's row is the lock.
        await tx.select({ id: schema.apps.id }).from(schema.apps).where(eq(schema.apps.id, appId)).for("update");
        const [clash] = await tx
          .select({ id: t.id })
          .from(t)
          .where(and(eq(t.appId, appId), eq(t.staffId, move.staffId), not(eq(t.id, id)), inArray(t.status, ACTIVE_BOOKING_STATUSES), lt(t.startAt, move.endAt), gt(t.endAt, move.startAt)))
          .limit(1);
        if (clash) return false;
        const [result] = await tx
          .update(t)
          .set(move)
          .where(and(eq(t.appId, appId), eq(t.id, id), inArray(t.status, ACTIVE_BOOKING_STATUSES)));
        return result.affectedRows === 1;
      }),
    );
  }

  // 61 Today's numbers: sums and counts in the database

  private async paidTotals(
    table: typeof schema.catalogOrders | typeof schema.donations,
    amount: typeof schema.catalogOrders.totalCents | typeof schema.donations.amountCents,
    where: ReturnType<typeof and>,
  ): Promise<PaidTotals> {
    const rows = await this.run((db) =>
      db
        .select({ currency: table.currency, n: count(), cents: sql<string | null>`sum(${amount} - ${table.refundedCents})` })
        .from(table)
        .where(where)
        .groupBy(table.currency)
        .orderBy(asc(table.currency)),
    );
    return { count: rows.reduce((sum, r) => sum + Number(r.n), 0), totals: rows.map((r) => ({ currency: r.currency, cents: Number(r.cents ?? 0) })) };
  }

  async sumPaidCatalogOrders(appId: string, from: Date, to: Date): Promise<PaidTotals> {
    const t = schema.catalogOrders;
    return this.paidTotals(t, t.totalCents, and(eq(t.appId, appId), inArray(t.status, ["processing", "completed", "cancelled", "refunded"]), gte(t.paidAt, from), lt(t.paidAt, to)));
  }

  async sumPaidDonations(appId: string, from: Date, to: Date): Promise<PaidTotals> {
    const t = schema.donations;
    return this.paidTotals(t, t.amountCents, and(eq(t.appId, appId), inArray(t.status, ["paid", "refunded"]), gte(t.paidAt, from), lt(t.paidAt, to)));
  }

  async countHostedUsersCreated(appId: string, from: Date, to: Date): Promise<number> {
    const t = schema.hostedUsers;
    const [row] = await this.run((db) => db.select({ n: count() }).from(t).where(and(eq(t.appId, appId), gte(t.createdAt, from), lt(t.createdAt, to))));
    return row?.n ?? 0;
  }

  async sumRefunds(appId: string, from: Date, to: Date): Promise<PaidTotals> {
    const t = schema.paymentRefunds;
    const rows = await this.run((db) =>
      db
        .select({ currency: t.currency, n: count(), cents: sql<string | null>`sum(${t.amountCents})` })
        .from(t)
        .where(and(eq(t.appId, appId), gte(t.createdAt, from), lt(t.createdAt, to)))
        .groupBy(t.currency)
        .orderBy(asc(t.currency)),
    );
    return { count: rows.reduce((sum, r) => sum + Number(r.n), 0), totals: rows.map((r) => ({ currency: r.currency, cents: Number(r.cents ?? 0) })) };
  }

  async countEnrollmentsInWindow(appId: string, from: Date, to: Date): Promise<{ total: number; paid: number }> {
    const t = schema.courseEnrollments;
    const [row] = await this.run((db) =>
      db
        .select({ total: count(), paid: sql<string | null>`sum(case when ${t.source} = 'paid' then 1 else 0 end)` })
        .from(t)
        .where(and(eq(t.appId, appId), gte(t.enrolledAt, from), lt(t.enrolledAt, to))),
    );
    return { total: Number(row?.total ?? 0), paid: Number(row?.paid ?? 0) };
  }

  async countAppointmentsMade(appId: string, from: Date, to: Date): Promise<number> {
    const t = schema.bookingAppointments;
    const [row] = await this.run((db) => db.select({ n: count() }).from(t).where(and(eq(t.appId, appId), gte(t.createdAt, from), lt(t.createdAt, to))));
    return row?.n ?? 0;
  }

  async countTicketsInWindow(appId: string, from: Date, to: Date): Promise<{ issued: number; checkedIn: number }> {
    const t = schema.eventTickets;
    const [issued, checkedIn] = await Promise.all([
      this.run((db) => db.select({ n: count() }).from(t).where(and(eq(t.appId, appId), inArray(t.status, ["valid", "used"]), gte(t.createdAt, from), lt(t.createdAt, to)))),
      this.run((db) => db.select({ n: count() }).from(t).where(and(eq(t.appId, appId), gte(t.usedAt, from), lt(t.usedAt, to)))),
    ]);
    return { issued: issued[0]?.n ?? 0, checkedIn: checkedIn[0]?.n ?? 0 };
  }

  // 61 Notifications sent later

  async createScheduledNotification(input: Omit<ScheduledNotification, "id">): Promise<ScheduledNotification> {
    const [result] = await this.run((db) => db.insert(schema.scheduledNotifications).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getScheduledNotification(appId: string, id: number): Promise<ScheduledNotification | null> {
    const t = schema.scheduledNotifications;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async listScheduledNotifications(appId: string, statuses: ScheduledNotificationStatus[]): Promise<ScheduledNotification[]> {
    if (statuses.length === 0) return [];
    const t = schema.scheduledNotifications;
    return this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), inArray(t.status, statuses))).orderBy(asc(t.sendAt), asc(t.id)).limit(500));
  }

  async listDueScheduledNotifications(now: Date, limit: number): Promise<ScheduledNotification[]> {
    const t = schema.scheduledNotifications;
    return this.run((db) => db.select().from(t).where(and(eq(t.status, "scheduled"), lte(t.sendAt, now))).orderBy(asc(t.sendAt), asc(t.id)).limit(limit));
  }

  async listStaleScheduledNotifications(before: Date): Promise<ScheduledNotification[]> {
    const t = schema.scheduledNotifications;
    return this.run((db) => db.select().from(t).where(and(eq(t.status, "sending"), lt(t.claimedAt, before))).limit(500));
  }

  async updateScheduledNotification(appId: string, id: number, expect: ScheduledNotificationStatus, patch: ScheduledNotificationPatch): Promise<boolean> {
    const t = schema.scheduledNotifications;
    const [result] = await this.run((db) => db.update(t).set(patch).where(and(eq(t.appId, appId), eq(t.id, id), eq(t.status, expect))));
    return result.affectedRows === 1;
  }

  // 85.3 Automatic notifications

  async claimAutoNotice(input: { appId: string; kind: string; ref: string; userId: number; now: Date }): Promise<boolean> {
    const [result] = await this.run((db) =>
      db.insert(schema.autoNotices).ignore().values({ appId: input.appId, kind: input.kind, ref: input.ref.slice(0, 64), userId: input.userId, sentAt: input.now }),
    );
    return result.affectedRows === 1;
  }

  async saveHostedCart(appId: string, userId: number, items: number, now: Date): Promise<void> {
    await this.run((db) =>
      db
        .insert(schema.hostedCarts)
        .values({ appId, userId, items, updatedAt: now, remindedAt: null })
        .onDuplicateKeyUpdate({ set: { items, updatedAt: now } }),
    );
  }

  async listLeftHostedCarts(after: Date, before: Date, limit: number): Promise<HostedCart[]> {
    const t = schema.hostedCarts;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(gt(t.items, 0), gte(t.updatedAt, after), lt(t.updatedAt, before), or(isNull(t.remindedAt), lt(t.remindedAt, t.updatedAt))))
        .orderBy(asc(t.updatedAt))
        .limit(limit),
    );
  }

  async markHostedCartReminded(appId: string, userId: number, seenAt: Date, now: Date): Promise<boolean> {
    const t = schema.hostedCarts;
    const [result] = await this.run((db) => db.update(t).set({ remindedAt: now }).where(and(eq(t.appId, appId), eq(t.userId, userId), eq(t.updatedAt, seenAt))));
    return result.affectedRows === 1;
  }

  // 91.2 Order watches

  async watchHostedOrders(appId: string, userId: number, until: Date): Promise<void> {
    const t = schema.hostedOrderWatches;
    await this.run((db) =>
      db
        .insert(t)
        .values({ appId, userId, orders: {}, checkedAt: null, until })
        .onDuplicateKeyUpdate({ set: { until: sql`GREATEST(${t.until}, VALUES(${t.until}))` } }),
    );
  }

  async listDueOrderWatches(checkedBefore: Date, now: Date, limit: number): Promise<HostedOrderWatch[]> {
    const t = schema.hostedOrderWatches;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(gt(t.until, now), or(isNull(t.checkedAt), lt(t.checkedAt, checkedBefore))))
        .orderBy(asc(t.checkedAt))
        .limit(limit),
    );
  }

  async saveOrderWatch(appId: string, userId: number, orders: Record<string, string>, checkedAt: Date): Promise<void> {
    const t = schema.hostedOrderWatches;
    await this.run((db) => db.update(t).set({ orders, checkedAt }).where(and(eq(t.appId, appId), eq(t.userId, userId))));
  }

  async deleteEndedOrderWatches(now: Date): Promise<number> {
    const t = schema.hostedOrderWatches;
    const [result] = await this.run((db) => db.delete(t).where(lte(t.until, now)));
    return result.affectedRows;
  }

  // 91.4 Loyalty points

  async getLoyaltyBalance(appId: string, userId: number): Promise<number> {
    const t = schema.loyaltyBalances;
    const [row] = await this.run((db) => db.select({ balance: t.balance }).from(t).where(and(eq(t.appId, appId), eq(t.userId, userId))).limit(1));
    return row?.balance ?? 0;
  }

  async changeLoyaltyPoints(input: { appId: string; userId: number; orderId: number | null; points: number; reason: LoyaltyReason; now: Date }): Promise<number> {
    const t = schema.loyaltyBalances;
    return this.run((db) =>
      db.transaction(async (tx) => {
        // The row is locked while it changes, so two orders at once can't both spend the same points.
        await tx.insert(t).values({ appId: input.appId, userId: input.userId, balance: 0, updatedAt: input.now }).onDuplicateKeyUpdate({ set: { appId: sql`${t.appId}` } });
        const [row] = await tx
          .select({ balance: t.balance })
          .from(t)
          .where(and(eq(t.appId, input.appId), eq(t.userId, input.userId)))
          .for("update");
        const balance = row?.balance ?? 0;
        const change = Math.max(input.points, -balance);
        if (change === 0) return 0;
        await tx
          .update(t)
          .set({ balance: balance + change, updatedAt: input.now })
          .where(and(eq(t.appId, input.appId), eq(t.userId, input.userId)));
        await tx.insert(schema.loyaltyEntries).values({ appId: input.appId, userId: input.userId, orderId: input.orderId, points: change, reason: input.reason, createdAt: input.now });
        return change;
      }),
    );
  }

  async listLoyaltyEntries(appId: string, userId: number, limit: number): Promise<LoyaltyEntry[]> {
    const t = schema.loyaltyEntries;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(and(eq(t.appId, appId), eq(t.userId, userId)))
        .orderBy(desc(t.id))
        .limit(limit),
    );
  }

  // 85.2 Notification campaigns

  async createNotificationCampaign(input: Omit<NotificationCampaign, "id">): Promise<NotificationCampaign> {
    const [result] = await this.run((db) => db.insert(schema.notificationCampaigns).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async getNotificationCampaign(appId: string, id: number): Promise<NotificationCampaign | null> {
    const t = schema.notificationCampaigns;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))).limit(1));
    return row ?? null;
  }

  async listNotificationCampaigns(appId: string, limit: number): Promise<NotificationCampaign[]> {
    const t = schema.notificationCampaigns;
    return this.run((db) => db.select().from(t).where(eq(t.appId, appId)).orderBy(desc(t.createdAt), desc(t.id)).limit(limit));
  }

  async updateNotificationCampaign(appId: string, id: number, expect: NotificationCampaignStatus | null, patch: NotificationCampaignPatch): Promise<boolean> {
    const t = schema.notificationCampaigns;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set(patch)
        .where(and(eq(t.appId, appId), eq(t.id, id), expect === null ? undefined : eq(t.status, expect))),
    );
    return result.affectedRows === 1;
  }

  async deleteNotificationCampaign(appId: string, id: number): Promise<boolean> {
    const t = schema.notificationCampaigns;
    const [result] = await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
    return result.affectedRows === 1;
  }

  async listDueNotificationCampaigns(now: Date, limit: number): Promise<NotificationCampaign[]> {
    const t = schema.notificationCampaigns;
    return this.run((db) => db.select().from(t).where(and(eq(t.status, "scheduled"), lte(t.sendAt, now))).orderBy(asc(t.sendAt), asc(t.id)).limit(limit));
  }

  async listStaleNotificationCampaigns(before: Date): Promise<NotificationCampaign[]> {
    const t = schema.notificationCampaigns;
    return this.run((db) => db.select().from(t).where(and(eq(t.status, "sending"), lt(t.claimedAt, before))).limit(500));
  }

  async createCampaignSend(input: Omit<CampaignSend, "id">): Promise<CampaignSend> {
    const [result] = await this.run((db) => db.insert(schema.campaignSends).values(input));
    return { id: Number(result.insertId), ...input };
  }

  async updateCampaignSend(appId: string, id: number, patch: Partial<Pick<CampaignSend, "notificationId" | "recipients" | "reportedAt">>): Promise<void> {
    const t = schema.campaignSends;
    await this.run((db) => db.update(t).set(patch).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async deleteCampaignSend(appId: string, id: number): Promise<void> {
    const t = schema.campaignSends;
    await this.run((db) => db.delete(t).where(and(eq(t.appId, appId), eq(t.id, id))));
  }

  async reportCampaignSend(appId: string, id: number, numbers: { pushed: number; failed: number }, now: Date): Promise<CampaignSend | null> {
    const t = schema.campaignSends;
    const [result] = await this.run((db) => db.update(t).set({ ...numbers, reportedAt: now }).where(and(eq(t.appId, appId), eq(t.id, id), isNull(t.reportedAt))));
    if (result.affectedRows !== 1) return null;
    const [row] = await this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), eq(t.id, id))));
    return row ?? null;
  }

  async listCampaignSends(appId: string, campaignIds: number[]): Promise<CampaignSend[]> {
    if (campaignIds.length === 0) return [];
    const t = schema.campaignSends;
    return this.run((db) => db.select().from(t).where(and(eq(t.appId, appId), inArray(t.campaignId, campaignIds))).orderBy(desc(t.sentAt), desc(t.id)).limit(5000));
  }

  // 61 Announcements pushed when they start

  async claimAnnouncementPush(id: string, now: Date): Promise<boolean> {
    const t = schema.announcements;
    const [result] = await this.run((db) => db.update(t).set({ pushedAt: now }).where(and(eq(t.id, id), isNull(t.pushedAt))));
    return result.affectedRows === 1;
  }

  // 66 Requests to delete a Yallapp account

  async createAccountDeletionRequest(request: AccountDeletionRequest): Promise<boolean> {
    // `open_client_id` is unique: a second open request for the client is refused by the database.
    try {
      await this.run((db) => db.insert(schema.accountDeletionRequests).values({ ...request, openClientId: request.status === "pending" ? request.clientId : null }));
      return true;
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return false;
      throw error;
    }
  }

  async getAccountDeletionRequest(id: string): Promise<AccountDeletionRequest | null> {
    const t = schema.accountDeletionRequests;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.id, id)).limit(1));
    return row ? toAccountDeletion(row) : null;
  }

  async getOpenAccountDeletionRequest(clientId: string): Promise<AccountDeletionRequest | null> {
    const t = schema.accountDeletionRequests;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.openClientId, clientId)).limit(1));
    return row ? toAccountDeletion(row) : null;
  }

  async listAccountDeletionRequests(statuses: AccountDeletionStatus[], limit: number): Promise<AccountDeletionRequest[]> {
    const t = schema.accountDeletionRequests;
    const rows = await this.run((db) =>
      db
        .select()
        .from(t)
        .where(statuses.length ? inArray(t.status, statuses) : undefined)
        .orderBy(desc(t.requestedAt), desc(t.id))
        .limit(limit),
    );
    return rows.map(toAccountDeletion);
  }

  async closeAccountDeletionRequest(id: string, close: AccountDeletionClose): Promise<boolean> {
    const t = schema.accountDeletionRequests;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set({ ...close, openClientId: null })
        .where(and(eq(t.id, id), eq(t.status, "pending"))),
    );
    return result.affectedRows === 1;
  }

  // 70 Sessions kept on the server, and two-step sign-in

  async createUserSession(session: UserSession): Promise<void> {
    await this.run((db) => db.insert(schema.userSessions).values(session));
  }

  async getUserSession(idHash: string): Promise<UserSession | null> {
    const rows = await this.run((db) => db.select().from(schema.userSessions).where(eq(schema.userSessions.idHash, idHash)).limit(1));
    return rows[0] ?? null;
  }

  async deleteUserSession(idHash: string): Promise<void> {
    await this.run((db) => db.delete(schema.userSessions).where(eq(schema.userSessions.idHash, idHash)));
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const [result] = await this.run((db) => db.delete(schema.userSessions).where(eq(schema.userSessions.userId, userId)));
    return result.affectedRows;
  }

  async deleteExpiredUserSessions(now: Date): Promise<number> {
    const [result] = await this.run((db) => db.delete(schema.userSessions).where(lte(schema.userSessions.expiresAt, now)));
    return result.affectedRows;
  }

  async getTwoFactor(userId: string): Promise<UserTwoFactor | null> {
    const rows = await this.run((db) => db.select().from(schema.userTwoFactor).where(eq(schema.userTwoFactor.userId, userId)).limit(1));
    return rows[0] ?? null;
  }

  async saveTwoFactorSetup(userId: string, secretEncrypted: string, now: Date): Promise<boolean> {
    const t = schema.userTwoFactor;
    // A waiting setup is replaced; one that is on never is.
    const [updated] = await this.run((db) => db.update(t).set({ secretEncrypted, lastStep: 0, updatedAt: now }).where(and(eq(t.userId, userId), isNull(t.enabledAt))));
    if (updated.affectedRows === 1) return true;
    try {
      await this.run((db) => db.insert(t).values({ userId, secretEncrypted, enabledAt: null, lastStep: 0, createdAt: now, updatedAt: now }));
      return true;
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return false;
      throw error;
    }
  }

  async enableTwoFactor(userId: string, step: number, recoveryHashes: string[], now: Date): Promise<boolean> {
    const t = schema.userTwoFactor;
    return this.run((db) =>
      db.transaction(async (tx) => {
        const [result] = await tx.update(t).set({ enabledAt: now, lastStep: step, updatedAt: now }).where(and(eq(t.userId, userId), isNull(t.enabledAt)));
        if (result.affectedRows !== 1) return false;
        await tx.delete(schema.userRecoveryCodes).where(eq(schema.userRecoveryCodes.userId, userId));
        if (recoveryHashes.length) await tx.insert(schema.userRecoveryCodes).values(recoveryHashes.map((codeHash) => ({ userId, codeHash, usedAt: null, createdAt: now })));
        return true;
      }),
    );
  }

  async useTwoFactorStep(userId: string, step: number, now: Date): Promise<boolean> {
    const t = schema.userTwoFactor;
    const [result] = await this.run((db) => db.update(t).set({ lastStep: step, updatedAt: now }).where(and(eq(t.userId, userId), isNotNull(t.enabledAt), lt(t.lastStep, step))));
    return result.affectedRows === 1;
  }

  async useRecoveryCode(userId: string, codeHash: string, now: Date): Promise<boolean> {
    const t = schema.userRecoveryCodes;
    const [result] = await this.run((db) => db.update(t).set({ usedAt: now }).where(and(eq(t.userId, userId), eq(t.codeHash, codeHash), isNull(t.usedAt))));
    return result.affectedRows === 1;
  }

  async replaceRecoveryCodes(userId: string, codeHashes: string[], now: Date): Promise<void> {
    await this.run((db) =>
      db.transaction(async (tx) => {
        await tx.delete(schema.userRecoveryCodes).where(eq(schema.userRecoveryCodes.userId, userId));
        if (codeHashes.length) await tx.insert(schema.userRecoveryCodes).values(codeHashes.map((codeHash) => ({ userId, codeHash, usedAt: null, createdAt: now })));
      }),
    );
  }

  async countUnusedRecoveryCodes(userId: string): Promise<number> {
    const t = schema.userRecoveryCodes;
    const [row] = await this.run((db) => db.select({ n: count() }).from(t).where(and(eq(t.userId, userId), isNull(t.usedAt))));
    return Number(row?.n ?? 0);
  }

  async deleteTwoFactor(userId: string): Promise<boolean> {
    return this.run((db) =>
      db.transaction(async (tx) => {
        await tx.delete(schema.userRecoveryCodes).where(eq(schema.userRecoveryCodes.userId, userId));
        const [result] = await tx.delete(schema.userTwoFactor).where(eq(schema.userTwoFactor.userId, userId));
        return result.affectedRows === 1;
      }),
    );
  }

  // 73 Deleting an app

  async softDeleteApp(deletion: AppDeletion): Promise<boolean> {
    const a = schema.apps;
    return this.run((db) =>
      db.transaction(async (tx) => {
        // `deleted_at is null` in the same statement: of two deletions at once, one marks it.
        const [result] = await tx
          .update(a)
          .set({ deletedAt: deletion.deletedAt, deletedBy: deletion.deletedBy, updatedAt: deletion.deletedAt })
          .where(and(eq(a.id, deletion.appId), eq(a.clientId, deletion.clientId), isNull(a.deletedAt)));
        if (result.affectedRows !== 1) return false;
        await tx.insert(schema.appDeletions).values(toAppDeletionRow(deletion));
        return true;
      }),
    );
  }

  async restoreDeletedApp(deletionId: string, by: string, now: Date): Promise<boolean> {
    const d = schema.appDeletions;
    return this.run((db) =>
      db.transaction(async (tx) => {
        const rows = await tx.select().from(d).where(eq(d.id, deletionId)).for("update");
        const deletion = rows[0];
        if (!deletion || deletion.status !== "waiting") return false;
        const [result] = await tx.update(d).set({ status: "restored", openAppId: null, closedAt: now, closedBy: by }).where(and(eq(d.id, deletionId), eq(d.status, "waiting")));
        if (result.affectedRows !== 1) return false;
        await tx.update(schema.apps).set({ deletedAt: null, deletedBy: null, updatedAt: now }).where(eq(schema.apps.id, deletion.appId));
        return true;
      }),
    );
  }

  async getAppDeletion(id: string): Promise<AppDeletion | null> {
    const rows = await this.run((db) => db.select().from(schema.appDeletions).where(eq(schema.appDeletions.id, id)).limit(1));
    return rows[0] ? toAppDeletion(rows[0]) : null;
  }

  async listAppDeletions(input: { statuses: AppDeletionStatus[]; clientId?: string; limit: number }): Promise<AppDeletion[]> {
    const d = schema.appDeletions;
    const rows = await this.run((db) =>
      db
        .select()
        .from(d)
        .where(and(input.statuses.length ? inArray(d.status, input.statuses) : undefined, input.clientId ? eq(d.clientId, input.clientId) : undefined))
        .orderBy(desc(d.deletedAt), desc(d.id))
        .limit(input.limit),
    );
    return rows.map(toAppDeletion);
  }

  async listDueAppDeletions(now: Date, limit: number): Promise<AppDeletion[]> {
    const d = schema.appDeletions;
    const rows = await this.run((db) =>
      db
        .select()
        .from(d)
        .where(and(eq(d.status, "waiting"), lte(d.purgeAfter, now)))
        .orderBy(asc(d.purgeAfter))
        .limit(limit),
    );
    return rows.map(toAppDeletion);
  }

  async getAppIncludingDeleted(id: string): Promise<App | null> {
    const rows = await this.run((db) => db.select().from(schema.apps).where(eq(schema.apps.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async listAppsByClientIncludingDeleted(clientId: string): Promise<App[]> {
    return this.run((db) => db.select().from(schema.apps).where(eq(schema.apps.clientId, clientId)).orderBy(asc(schema.apps.createdAt), asc(schema.apps.id)));
  }

  async purgeDeletedApp(deletionId: string, by: string, now: Date, pendingBuilds: string[]): Promise<boolean> {
    const d = schema.appDeletions;
    return this.run((db) =>
      db.transaction(async (tx) => {
        const rows = await tx.select().from(d).where(eq(d.id, deletionId)).for("update");
        const deletion = rows[0];
        if (!deletion || deletion.status !== "waiting") return false;
        await tx.update(d).set({ status: "purged", openAppId: null, closedAt: now, closedBy: by, pendingBuilds }).where(eq(d.id, deletionId));
        // Everything of the app goes with its row (on delete cascade); plan payments stay, without their app (set null).
        await tx.delete(schema.apps).where(and(eq(schema.apps.id, deletion.appId), isNotNull(schema.apps.deletedAt)));
        return true;
      }),
    );
  }

  async createAppDeletionRecord(deletion: AppDeletion): Promise<void> {
    await this.run((db) => db.insert(schema.appDeletions).values(toAppDeletionRow(deletion)));
  }

  async setAppDeletionPendingBuilds(id: string, builds: string[]): Promise<void> {
    await this.run((db) => db.update(schema.appDeletions).set({ pendingBuilds: builds }).where(eq(schema.appDeletions.id, id)));
  }

  async listAppDeletionsWithPendingBuilds(limit: number): Promise<AppDeletion[]> {
    const d = schema.appDeletions;
    const rows = await this.run((db) =>
      db
        .select()
        .from(d)
        .where(and(eq(d.status, "purged"), sql`${d.pendingBuilds} <> '[]'`))
        .orderBy(asc(d.deletedAt))
        .limit(limit),
    );
    return rows.map(toAppDeletion);
  }

  async listAppAssetReferences(appId: string): Promise<string[]> {
    const s = schema;
    const rows = await this.run((db) =>
      Promise.all([
        db.select().from(s.apps).where(eq(s.apps.id, appId)),
        db.select().from(s.appLayouts).where(eq(s.appLayouts.appId, appId)),
        db.select({ ids: s.catalogProducts.imageAssetIds }).from(s.catalogProducts).where(eq(s.catalogProducts.appId, appId)),
        db.select({ ids: s.listings.imageAssetIds }).from(s.listings).where(eq(s.listings.appId, appId)),
        db.select({ id: s.articles.imageAssetId }).from(s.articles).where(eq(s.articles.appId, appId)),
        db.select({ ids: s.events.imageAssetIds }).from(s.events).where(eq(s.events.appId, appId)),
        db.select({ ids: s.campaigns.imageAssetIds }).from(s.campaigns).where(eq(s.campaigns.appId, appId)),
        db.select().from(s.newsSettings).where(eq(s.newsSettings.appId, appId)),
        db.select().from(s.eventSettings).where(eq(s.eventSettings.appId, appId)),
        db.select().from(s.donationSettings).where(eq(s.donationSettings.appId, appId)),
        db.select().from(s.listingSettings).where(eq(s.listingSettings.appId, appId)),
        // 97.2 Own fonts' files.
        db.select({ files: s.ownFonts.files }).from(s.ownFonts).where(eq(s.ownFonts.appId, appId)),
      ]),
    );
    return assetIdsIn(JSON.stringify(rows));
  }

  // 73 Deleting a Yallapp account

  async keepBillingRecords(records: KeptBillingRecord[]): Promise<void> {
    if (!records.length) return;
    const t = schema.keptBillingRecords;
    await this.run((db) =>
      db
        .insert(t)
        .values(records)
        .onDuplicateKeyUpdate({ set: { details: sql`values(${t.details})`, receipt: sql`values(${t.receipt})`, keptAt: sql`values(${t.keptAt})` } }),
    );
  }

  async listKeptBillingRecords(input: { clientId?: string; limit: number }): Promise<KeptBillingRecord[]> {
    const t = schema.keptBillingRecords;
    return this.run((db) =>
      db
        .select()
        .from(t)
        .where(input.clientId ? eq(t.clientId, input.clientId) : undefined)
        .orderBy(desc(t.keptAt), desc(t.paidAt))
        .limit(input.limit),
    );
  }

  async getKeptBillingRecord(id: string): Promise<KeptBillingRecord | null> {
    const rows = await this.run((db) => db.select().from(schema.keptBillingRecords).where(eq(schema.keptBillingRecords.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    // The client, its apps (deleted ones too) and every row of theirs go with the user (on delete cascade).
    const [result] = await this.run((db) => db.delete(schema.users).where(eq(schema.users.id, userId)));
    return result.affectedRows === 1;
  }

  // 77 Chat

  async upsertChatMember(input: { appId: string; source: ChatMemberSource; externalId: string; name: string; imageUrl: string | null }, now: Date): Promise<ChatMember> {
    const c = schema.chatMembers;
    const row = { id: newId(), ...input, blockedAt: null, createdAt: now, updatedAt: now };
    await this.run((db) => db.insert(c).values(row).onDuplicateKeyUpdate({ set: { name: input.name, imageUrl: input.imageUrl, updatedAt: now } }));
    return (await this.findChatMember(input.appId, input.source, input.externalId))!;
  }

  async getChatMember(appId: string, id: string): Promise<ChatMember | null> {
    const c = schema.chatMembers;
    const [row] = await this.run((db) => db.select().from(c).where(and(eq(c.appId, appId), eq(c.id, id))).limit(1));
    return row ?? null;
  }

  async findChatMember(appId: string, source: ChatMemberSource, externalId: string): Promise<ChatMember | null> {
    const c = schema.chatMembers;
    const [row] = await this.run((db) => db.select().from(c).where(and(eq(c.appId, appId), eq(c.source, source), eq(c.externalId, externalId))).limit(1));
    return row ?? null;
  }

  async listChatMembersByIds(appId: string, ids: string[]): Promise<ChatMember[]> {
    if (ids.length === 0) return [];
    const c = schema.chatMembers;
    return this.run((db) => db.select().from(c).where(and(eq(c.appId, appId), inArray(c.id, ids))));
  }

  async setChatMemberBlocked(appId: string, id: string, blockedAt: Date | null, now: Date): Promise<boolean> {
    const c = schema.chatMembers;
    const [result] = await this.run((db) => db.update(c).set({ blockedAt, updatedAt: now }).where(and(eq(c.appId, appId), eq(c.id, id))));
    return result.affectedRows === 1;
  }

  async deleteChatMember(appId: string, id: string): Promise<void> {
    // Their direct conversation, messages, places, reports, blocks, sessions and uploads go with them (on delete cascade).
    const c = schema.chatMembers;
    await this.run((db) => db.delete(c).where(and(eq(c.appId, appId), eq(c.id, id))));
    await this.refreshLastMessages(appId);
  }

  /** Each conversation's last message, after messages were removed. */
  private async refreshLastMessages(appId: string, conversationId?: string): Promise<void> {
    const conv = schema.chatConversations;
    await this.run((db) =>
      db
        .update(conv)
        .set({
          lastMessageId: sql`(select max(m.id) from chat_messages m where m.conversation_id = ${conv.id})`,
          lastMessageAt: sql`(select max(m.created_at) from chat_messages m where m.conversation_id = ${conv.id})`,
        })
        .where(conversationId ? and(eq(conv.appId, appId), eq(conv.id, conversationId)) : eq(conv.appId, appId)),
    );
  }

  async ensureDirectConversation(appId: string, memberId: string, now: Date): Promise<ChatConversation> {
    const conv = schema.chatConversations;
    const find = async () => (await this.run((db) => db.select().from(conv).where(and(eq(conv.appId, appId), eq(conv.memberId, memberId))).limit(1)))[0];
    let conversation = await find();
    if (!conversation) {
      const row = { id: newId(), appId, kind: "direct" as const, memberId, courseKey: null, title: null, imageUrl: null, lastMessageId: null, lastMessageAt: null, businessReadId: null, keepUntil: null, noticeFor: null, createdAt: now, updatedAt: now };
      try {
        await this.run((db) => db.insert(conv).values(row));
      } catch (error) {
        // Two at once: the other one made it.
        if (errorCode(error) !== "ER_DUP_ENTRY") throw error;
      }
      conversation = (await find())!;
    }
    await this.addChatParticipant(conversation.id, memberId, now);
    return conversation;
  }

  async ensureGroupConversation(input: { appId: string; courseKey: string; title: string; imageUrl: string | null }, now: Date): Promise<ChatConversation> {
    const conv = schema.chatConversations;
    const row = { id: newId(), appId: input.appId, kind: "group" as const, memberId: null, courseKey: input.courseKey, title: input.title, imageUrl: input.imageUrl, lastMessageId: null, lastMessageAt: null, businessReadId: null, keepUntil: null, noticeFor: null, createdAt: now, updatedAt: now };
    await this.run((db) => db.insert(conv).values(row).onDuplicateKeyUpdate({ set: { title: input.title, imageUrl: input.imageUrl } }));
    const [found] = await this.run((db) => db.select().from(conv).where(and(eq(conv.appId, input.appId), eq(conv.courseKey, input.courseKey))).limit(1));
    return found!;
  }

  async getChatConversation(appId: string, id: string): Promise<ChatConversation | null> {
    const conv = schema.chatConversations;
    const [row] = await this.run((db) => db.select().from(conv).where(and(eq(conv.appId, appId), eq(conv.id, id))).limit(1));
    return row ?? null;
  }

  async updateChatConversation(id: string, patch: ChatConversationPatch): Promise<void> {
    if (Object.keys(patch).length === 0) return;
    await this.run((db) => db.update(schema.chatConversations).set(patch).where(eq(schema.chatConversations.id, id)));
  }

  async listChatConversations(appId: string, input: { kind?: ChatConversationKind; limit: number }): Promise<ChatConversation[]> {
    const conv = schema.chatConversations;
    return this.run((db) =>
      db
        .select()
        .from(conv)
        .where(and(eq(conv.appId, appId), isNotNull(conv.lastMessageId), input.kind ? eq(conv.kind, input.kind) : undefined))
        .orderBy(desc(conv.lastMessageId))
        .limit(input.limit),
    );
  }

  async listMemberConversations(appId: string, memberId: string): Promise<{ conversation: ChatConversation; participant: ChatParticipant }[]> {
    const conv = schema.chatConversations;
    const p = schema.chatParticipants;
    const rows = await this.run((db) =>
      db
        .select({ conversation: conv, participant: p })
        .from(p)
        .innerJoin(conv, eq(conv.id, p.conversationId))
        .where(and(eq(p.memberId, memberId), eq(conv.appId, appId))),
    );
    return rows;
  }

  async setMemberGroups(appId: string, memberId: string, conversationIds: string[], now: Date): Promise<void> {
    const conv = schema.chatConversations;
    const p = schema.chatParticipants;
    const groups = await this.run((db) =>
      db
        .select({ id: p.conversationId })
        .from(p)
        .innerJoin(conv, eq(conv.id, p.conversationId))
        .where(and(eq(p.memberId, memberId), eq(conv.appId, appId), eq(conv.kind, "group"))),
    );
    const leave = groups.map((g) => g.id).filter((id) => !conversationIds.includes(id));
    if (leave.length > 0) await this.run((db) => db.delete(p).where(and(eq(p.memberId, memberId), inArray(p.conversationId, leave))));
    for (const id of conversationIds) await this.addChatParticipant(id, memberId, now);
  }

  async addChatParticipant(conversationId: string, memberId: string, now: Date): Promise<void> {
    await this.run((db) => db.insert(schema.chatParticipants).ignore().values({ conversationId, memberId, readId: null, joinedAt: now }));
  }

  async getChatParticipant(conversationId: string, memberId: string): Promise<ChatParticipant | null> {
    const p = schema.chatParticipants;
    const [row] = await this.run((db) => db.select().from(p).where(and(eq(p.conversationId, conversationId), eq(p.memberId, memberId))).limit(1));
    return row ?? null;
  }

  async listChatParticipants(conversationId: string): Promise<ChatParticipant[]> {
    const p = schema.chatParticipants;
    return this.run((db) => db.select().from(p).where(eq(p.conversationId, conversationId)));
  }

  async setChatRead(conversationId: string, memberId: string, messageId: number): Promise<void> {
    const p = schema.chatParticipants;
    await this.run((db) =>
      db
        .update(p)
        .set({ readId: messageId })
        .where(and(eq(p.conversationId, conversationId), eq(p.memberId, memberId), or(isNull(p.readId), lt(p.readId, messageId)))),
    );
  }

  async createChatMessage(input: Omit<ChatMessage, "id">): Promise<{ message: ChatMessage; created: boolean }> {
    const m = schema.chatMessages;
    const conv = schema.chatConversations;
    let id: number;
    try {
      const [result] = await this.run((db) => db.insert(m).values(input));
      id = Number(result.insertId);
    } catch (error) {
      if (errorCode(error) !== "ER_DUP_ENTRY" || !input.clientId) throw error;
      const [same] = await this.run((db) => db.select().from(m).where(and(eq(m.conversationId, input.conversationId), eq(m.clientId, input.clientId!))).limit(1));
      return { message: same!, created: false };
    }
    // Never back: of two messages at once, the conversation keeps the later one.
    await this.run((db) =>
      db
        .update(conv)
        .set({ lastMessageId: id, lastMessageAt: input.createdAt, updatedAt: input.createdAt })
        .where(and(eq(conv.id, input.conversationId), or(isNull(conv.lastMessageId), lt(conv.lastMessageId, id)))),
    );
    return { message: { id, ...input }, created: true };
  }

  async getChatMessage(appId: string, id: number): Promise<ChatMessage | null> {
    const m = schema.chatMessages;
    const [row] = await this.run((db) => db.select().from(m).where(and(eq(m.appId, appId), eq(m.id, id))).limit(1));
    return row ?? null;
  }

  async listChatMessages(conversationId: string, input: { after?: number; before?: number; limit: number; hideFrom?: string[] }): Promise<ChatMessage[]> {
    const m = schema.chatMessages;
    const hide = input.hideFrom && input.hideFrom.length > 0 ? or(isNull(m.memberId), not(inArray(m.memberId, input.hideFrom))) : undefined;
    if (input.after !== undefined) {
      return this.run((db) =>
        db
          .select()
          .from(m)
          .where(and(eq(m.conversationId, conversationId), gt(m.id, input.after!), hide))
          .orderBy(asc(m.id))
          .limit(input.limit),
      );
    }
    return this.run((db) =>
      db
        .select()
        .from(m)
        .where(and(eq(m.conversationId, conversationId), input.before !== undefined ? lt(m.id, input.before) : undefined, hide))
        .orderBy(desc(m.id))
        .limit(input.limit),
    );
  }

  async countChatUnread(conversationId: string, afterId: number | null, input: { notFromMember?: string; fromMembersOnly?: boolean; hideFrom?: string[] }): Promise<number> {
    const m = schema.chatMessages;
    const [row] = await this.run((db) =>
      db
        .select({ n: count() })
        .from(m)
        .where(
          and(
            eq(m.conversationId, conversationId),
            isNull(m.deletedAt),
            afterId !== null ? gt(m.id, afterId) : undefined,
            input.fromMembersOnly ? eq(m.senderKind, "member") : undefined,
            input.notFromMember ? or(isNull(m.memberId), not(eq(m.memberId, input.notFromMember))) : undefined,
            input.hideFrom && input.hideFrom.length > 0 ? or(isNull(m.memberId), not(inArray(m.memberId, input.hideFrom))) : undefined,
          ),
        ),
    );
    return Number(row?.n ?? 0);
  }

  async deleteChatMessage(appId: string, id: number, now: Date): Promise<boolean> {
    const m = schema.chatMessages;
    const [result] = await this.run((db) =>
      db
        .update(m)
        .set({ text: null, mediaId: null, durationSeconds: null, deletedAt: now })
        .where(and(eq(m.appId, appId), eq(m.id, id), isNull(m.deletedAt))),
    );
    return result.affectedRows === 1;
  }

  async clearChatConversation(appId: string, conversationId: string): Promise<string[]> {
    const m = schema.chatMessages;
    const where = and(eq(m.appId, appId), eq(m.conversationId, conversationId));
    const media = await this.run((db) => db.select({ id: m.mediaId }).from(m).where(and(where, isNotNull(m.mediaId))));
    await this.run((db) => db.delete(m).where(where));
    await this.run((db) =>
      db
        .update(schema.chatConversations)
        .set({ lastMessageId: null, lastMessageAt: null })
        .where(and(eq(schema.chatConversations.appId, appId), eq(schema.chatConversations.id, conversationId))),
    );
    return media.map((r) => r.id!);
  }

  async listChatMediaOfMember(appId: string, memberId: string): Promise<string[]> {
    const m = schema.chatMessages;
    const conv = schema.chatConversations;
    const sent = await this.run((db) =>
      db
        .select({ id: m.mediaId })
        .from(m)
        .leftJoin(conv, eq(conv.id, m.conversationId))
        .where(and(eq(m.appId, appId), isNotNull(m.mediaId), or(eq(m.memberId, memberId), eq(conv.memberId, memberId)))),
    );
    const u = schema.chatUploads;
    const uploads = await this.run((db) => db.select({ id: u.mediaId }).from(u).where(and(eq(u.appId, appId), eq(u.memberId, memberId))));
    return [...new Set([...sent.map((r) => r.id!), ...uploads.map((r) => r.id)])];
  }

  async deleteChatMessagesBefore(conversationId: string, before: Date): Promise<string[]> {
    const m = schema.chatMessages;
    const where = and(eq(m.conversationId, conversationId), lt(m.createdAt, before));
    const rows = await this.run((db) => db.select({ id: m.mediaId, appId: m.appId }).from(m).where(where));
    if (rows.length === 0) return [];
    await this.run((db) => db.delete(m).where(where));
    await this.refreshLastMessages(rows[0]!.appId, conversationId);
    return rows.map((r) => r.id).filter((id): id is string => Boolean(id));
  }

  async listChatConversationsWithMessagesBefore(
    olderThan: Date,
    limit: number,
    input: { appId?: string; notKeptAt?: Date } = {},
  ): Promise<{ conversation: ChatConversation; oldest: Date }[]> {
    const m = schema.chatMessages;
    const conv = schema.chatConversations;
    const where = and(
      input.appId ? eq(m.appId, input.appId) : undefined,
      input.notKeptAt ? or(isNull(conv.keepUntil), lte(conv.keepUntil, input.notKeptAt)) : undefined,
    );
    const oldest = await this.run((db) =>
      db
        .select({ conversationId: m.conversationId, oldest: sql<Date>`min(${m.createdAt})`.mapWith(m.createdAt) })
        .from(m)
        .innerJoin(conv, eq(conv.id, m.conversationId))
        .where(where)
        .groupBy(m.conversationId)
        .having(lt(sql`min(${m.createdAt})`, olderThan))
        .orderBy(asc(sql`min(${m.createdAt})`))
        .limit(limit),
    );
    if (oldest.length === 0) return [];
    const conversations = await this.run((db) =>
      db
        .select()
        .from(conv)
        .where(
          inArray(
            conv.id,
            oldest.map((o) => o.conversationId),
          ),
        ),
    );
    const byId = new Map(conversations.map((c) => [c.id, c]));
    return oldest.filter((o) => byId.has(o.conversationId)).map((o) => ({ conversation: byId.get(o.conversationId)!, oldest: o.oldest }));
  }

  async createChatReport(report: ChatReport): Promise<boolean> {
    try {
      await this.run((db) => db.insert(schema.chatReports).values(report));
      return true;
    } catch (error) {
      if (errorCode(error) === "ER_DUP_ENTRY") return false;
      throw error;
    }
  }

  async getChatReport(appId: string, id: string): Promise<ChatReport | null> {
    const r = schema.chatReports;
    const [row] = await this.run((db) => db.select().from(r).where(and(eq(r.appId, appId), eq(r.id, id))).limit(1));
    return row ?? null;
  }

  async listChatReports(appId: string, input: { status: "open" | "closed"; limit: number }): Promise<ChatReport[]> {
    const r = schema.chatReports;
    return this.run((db) =>
      db
        .select()
        .from(r)
        .where(and(eq(r.appId, appId), eq(r.status, input.status)))
        .orderBy(desc(r.createdAt))
        .limit(input.limit),
    );
  }

  async countOpenChatReports(appId: string): Promise<number> {
    const r = schema.chatReports;
    const [row] = await this.run((db) => db.select({ n: count() }).from(r).where(and(eq(r.appId, appId), eq(r.status, "open"))));
    return Number(row?.n ?? 0);
  }

  async closeChatReports(appId: string, messageId: number, outcome: ChatReportOutcome, by: string, now: Date): Promise<number> {
    const r = schema.chatReports;
    const [result] = await this.run((db) =>
      db
        .update(r)
        .set({ status: "closed", outcome, closedBy: by, closedAt: now })
        .where(and(eq(r.appId, appId), eq(r.messageId, messageId), eq(r.status, "open"))),
    );
    return result.affectedRows;
  }

  async listChatBlocks(memberId: string): Promise<string[]> {
    const b = schema.chatBlocks;
    const rows = await this.run((db) => db.select({ id: b.blockedId }).from(b).where(eq(b.memberId, memberId)));
    return rows.map((r) => r.id);
  }

  async setChatBlock(memberId: string, blockedId: string, blocked: boolean, now: Date): Promise<void> {
    const b = schema.chatBlocks;
    if (blocked) await this.run((db) => db.insert(b).ignore().values({ memberId, blockedId, createdAt: now }));
    else await this.run((db) => db.delete(b).where(and(eq(b.memberId, memberId), eq(b.blockedId, blockedId))));
  }

  async createChatSession(session: ChatSession): Promise<void> {
    await this.run((db) => db.insert(schema.chatSessions).values(session));
  }

  async getChatSession(tokenHash: string): Promise<ChatSession | null> {
    const t = schema.chatSessions;
    const [row] = await this.run((db) => db.select().from(t).where(eq(t.tokenHash, tokenHash)).limit(1));
    return row ?? null;
  }

  async deleteExpiredChatSessions(now: Date): Promise<number> {
    const t = schema.chatSessions;
    const [result] = await this.run((db) => db.delete(t).where(lte(t.expiresAt, now)));
    return result.affectedRows;
  }

  async createChatUpload(upload: ChatUploadInfo): Promise<void> {
    await this.run((db) => db.insert(schema.chatUploads).values(upload));
  }

  async getChatUpload(mediaId: string): Promise<ChatUploadInfo | null> {
    const u = schema.chatUploads;
    const [row] = await this.run((db) => db.select().from(u).where(eq(u.mediaId, mediaId)).limit(1));
    return row ?? null;
  }

  async listUnsentChatUploads(before: Date, limit: number): Promise<string[]> {
    const u = schema.chatUploads;
    const m = schema.chatMessages;
    const rows = await this.run((db) =>
      db
        .select({ id: u.mediaId })
        .from(u)
        .leftJoin(m, eq(m.mediaId, u.mediaId))
        .where(and(lt(u.createdAt, before), isNull(m.id)))
        .orderBy(asc(u.createdAt))
        .limit(limit),
    );
    return rows.map((r) => r.id);
  }
  // 78 Milestones

  async addClientMilestones(rows: ClientMilestone[]): Promise<number> {
    if (rows.length === 0) return 0;
    const [result] = await this.run((db) => db.insert(schema.clientMilestones).ignore().values(rows));
    return result.affectedRows;
  }

  async listClientMilestones(clientId: string): Promise<ClientMilestone[]> {
    const m = schema.clientMilestones;
    return this.run((db) => db.select().from(m).where(eq(m.clientId, clientId)).orderBy(asc(m.at), asc(m.kind)));
  }

  async listMilestones(input: { since?: Date; kinds?: MilestoneKind[] }): Promise<ClientMilestone[]> {
    if (input.kinds?.length === 0) return [];
    const m = schema.clientMilestones;
    const where = and(input.since ? gte(m.at, input.since) : undefined, input.kinds ? inArray(m.kind, input.kinds) : undefined);
    return this.run((db) => db.select().from(m).where(where).orderBy(asc(m.at), asc(m.kind)));
  }
  async saveProductDay(day: ProductDay, now: Date): Promise<void> {
    const { day: key, ...snapshot } = day;
    await this.run((db) => db.insert(schema.productDays).values({ day: key, snapshot, updatedAt: now }).onDuplicateKeyUpdate({ set: { snapshot, updatedAt: now } }));
  }

  async listProductDays(since: string): Promise<ProductDay[]> {
    const p = schema.productDays;
    const rows = await this.run((db) => db.select().from(p).where(gte(p.day, since)).orderBy(asc(p.day)));
    return rows.map((r) => ({ day: r.day, ...r.snapshot }));
  }
  // 78.3 Watching

  async startJobRun(job: WatchedJob, startedAt: Date): Promise<number> {
    const [result] = await this.run((db) => db.insert(schema.jobRuns).values({ job, startedAt }));
    return Number(result.insertId);
  }

  async finishJobRun(id: number, result: { finishedAt: Date; ok: boolean; summary: string | null; error: string | null }): Promise<void> {
    await this.run((db) => db.update(schema.jobRuns).set(result).where(eq(schema.jobRuns.id, id)));
  }

  async listJobRuns(input: { job?: WatchedJob; limit: number }): Promise<JobRun[]> {
    const r = schema.jobRuns;
    const rows = await this.run((db) =>
      db
        .select()
        .from(r)
        .where(input.job ? eq(r.job, input.job) : undefined)
        .orderBy(desc(r.startedAt), desc(r.id))
        .limit(input.limit),
    );
    return rows.map((row) => ({ ...row, ok: row.ok === null ? null : Boolean(row.ok) }));
  }

  async lastGoodJobRuns(): Promise<Partial<Record<WatchedJob, Date>>> {
    const r = schema.jobRuns;
    const rows = await this.run((db) =>
      db
        .select({ job: r.job, at: sql<Date>`max(${r.finishedAt})`.mapWith(r.finishedAt) })
        .from(r)
        .where(eq(r.ok, true))
        .groupBy(r.job),
    );
    return Object.fromEntries(rows.filter((row) => row.at).map((row) => [row.job, row.at]));
  }

  async deleteJobRunsBefore(before: Date): Promise<number> {
    const [result] = await this.run((db) => db.delete(schema.jobRuns).where(lt(schema.jobRuns.startedAt, before)));
    return result.affectedRows;
  }

  async raiseTeamAlert(input: Pick<TeamAlert, "kind" | "key" | "title" | "detail" | "link">, now: Date): Promise<{ alert: TeamAlert; created: boolean }> {
    const a = schema.teamAlerts;
    const [result] = await this.run((db) =>
      db
        .insert(a)
        .values({ id: newId(), ...input, count: 1, createdAt: now, lastSeenAt: now, resolvedAt: null, resolvedBy: null, emailedAt: null, openKey: input.key })
        .onDuplicateKeyUpdate({ set: { title: input.title, detail: input.detail, link: input.link, count: sql`${a.count} + 1`, lastSeenAt: now } }),
    );
    const [row] = await this.run((db) => db.select().from(a).where(eq(a.openKey, input.key)).limit(1));
    // One row inserted: 1; an open one updated: 2.
    return { alert: teamAlertOf(row!), created: result.affectedRows === 1 };
  }

  async markTeamAlertEmailed(id: string, at: Date): Promise<void> {
    await this.run((db) => db.update(schema.teamAlerts).set({ emailedAt: at }).where(eq(schema.teamAlerts.id, id)));
  }

  async listTeamAlerts(input: { open: boolean; limit: number }): Promise<TeamAlert[]> {
    const a = schema.teamAlerts;
    const rows = await this.run((db) =>
      db
        .select()
        .from(a)
        .where(input.open ? isNull(a.resolvedAt) : isNotNull(a.resolvedAt))
        .orderBy(input.open ? desc(a.lastSeenAt) : desc(a.resolvedAt))
        .limit(input.limit),
    );
    return rows.map(teamAlertOf);
  }

  async countOpenTeamAlerts(): Promise<number> {
    const a = schema.teamAlerts;
    const [row] = await this.run((db) => db.select({ n: count() }).from(a).where(isNull(a.resolvedAt)));
    return row?.n ?? 0;
  }

  async resolveTeamAlert(id: string, by: string, now: Date): Promise<boolean> {
    const a = schema.teamAlerts;
    const [result] = await this.run((db) => db.update(a).set({ resolvedAt: now, resolvedBy: by, openKey: null }).where(and(eq(a.id, id), isNull(a.resolvedAt))));
    return result.affectedRows === 1;
  }

  async resolveTeamAlertsExcept(kind: TeamAlertKind, keep: string[], by: string, now: Date): Promise<number> {
    const a = schema.teamAlerts;
    const [result] = await this.run((db) =>
      db
        .update(a)
        .set({ resolvedAt: now, resolvedBy: by, openKey: null })
        .where(and(eq(a.kind, kind), isNull(a.resolvedAt), keep.length ? not(inArray(a.key, keep)) : undefined)),
    );
    return result.affectedRows;
  }
  // 78.4 Errors per app

  async recordAppError(input: Pick<AppError, "clientId" | "appId" | "source" | "code" | "message">, now: Date): Promise<void> {
    const e = schema.appErrors;
    // An app or account gone (deleted meanwhile) fails its foreign key: ignored.
    await this.run((db) =>
      db
        .insert(e)
        .ignore()
        .values({ id: newId(), ...input, appKey: input.appId ?? "", count: 1, firstAt: now, lastAt: now })
        .onDuplicateKeyUpdate({ set: { message: input.message, count: sql`${e.count} + 1`, lastAt: now } }),
    );
  }

  async listAppErrors(input: { clientId?: string; appId?: string; since?: Date; limit: number }): Promise<AppError[]> {
    const e = schema.appErrors;
    const rows = await this.run((db) =>
      db
        .select()
        .from(e)
        .where(and(input.clientId ? eq(e.clientId, input.clientId) : undefined, input.appId ? eq(e.appId, input.appId) : undefined, input.since ? gte(e.lastAt, input.since) : undefined))
        .orderBy(desc(e.lastAt))
        .limit(input.limit),
    );
    return rows.map(({ appKey: _appKey, ...row }) => (void _appKey, row));
  }

  async deleteAppErrorsBefore(before: Date): Promise<number> {
    const [result] = await this.run((db) => db.delete(schema.appErrors).where(lt(schema.appErrors.lastAt, before)));
    return result.affectedRows;
  }

  // 79.2 Every text column of every table with a primary key, read in pages by key; MySQL's REGEXP picks the cells, JavaScript checks them.
  async listCellsToRekey(input: { currentKeyId: string; after: string | null; limit: number }): Promise<{ cells: RekeyCell[]; next: string | null }> {
    if (!/^[A-Za-z0-9_-]{8}$/.test(input.currentKeyId)) throw new Error("Invalid key ID");
    const columns = await this.rekeyColumns();
    const pattern = `(?-i)v1\\.[A-Za-z0-9_-]{16}\\.|v2\\.(?!${input.currentKeyId}\\.)[A-Za-z0-9_-]{8}\\.`;
    let at: { i: number; last: unknown[] | null } = input.after ? (JSON.parse(input.after) as { i: number; last: unknown[] | null }) : { i: 0, last: null };
    const cells: RekeyCell[] = [];
    let queries = 0;
    while (at.i < columns.length && cells.length < input.limit && queries < 25) {
      const c = columns[at.i]!;
      const pk = c.pk.map((k) => sql.identifier(k));
      const after = at.last
        ? sql` and (${sql.join(pk, sql`, `)}) > (${sql.join(
            at.last.map((v) => sql`${v}`),
            sql`, `,
          )})`
        : sql``;
      const want = input.limit - cells.length;
      const [rows] = (await this.run((db) =>
        db.execute(
          sql`select * from ${sql.identifier(c.table)} where ${sql.identifier(c.column)} regexp ${pattern}${after} order by ${sql.join(pk, sql`, `)} limit ${want}`,
        ),
      )) as unknown as [Record<string, unknown>[]];
      queries++;
      for (const row of rows) {
        const text = row[c.column];
        const key = c.pk.map((k) => (row[k] instanceof Date ? (row[k] as Date).toISOString() : row[k]));
        at = { i: at.i, last: c.pk.map((k) => row[k]) };
        if (typeof text !== "string" || !needsRekey(text, input.currentKeyId)) continue;
        cells.push({ table: c.table, column: c.column, key: JSON.stringify(key), text, candidates: candidatesIn(Object.values(row)) });
      }
      if (rows.length < want) at = { i: at.i + 1, last: null };
    }
    return { cells, next: at.i < columns.length ? JSON.stringify(at) : null };
  }

  async updateRekeyedCell(cell: RekeyCell, text: string): Promise<boolean> {
    const columns = await this.rekeyColumns();
    const c = columns.find((col) => col.table === cell.table && col.column === cell.column);
    if (!c) return false;
    const key = JSON.parse(cell.key) as unknown[];
    if (key.length !== c.pk.length) return false;
    const where = c.pk.map((k, i) => sql`${sql.identifier(k)} = ${key[i]}`);
    const [result] = (await this.run((db) =>
      db.execute(
        sql`update ${sql.identifier(c.table)} set ${sql.identifier(c.column)} = ${text} where ${sql.join(where, sql` and `)} and ${sql.identifier(c.column)} = ${cell.text}`,
      ),
    )) as unknown as [{ affectedRows: number }];
    return result.affectedRows === 1;
  }

  private rekeyColumnsCache: { at: number; columns: { table: string; column: string; pk: string[] }[] } | null = null;

  /** The text columns that can hold an encrypted value (long enough), with their table's primary key. */
  private async rekeyColumns(): Promise<{ table: string; column: string; pk: string[] }[]> {
    if (this.rekeyColumnsCache && Date.now() - this.rekeyColumnsCache.at < 60_000) return this.rekeyColumnsCache.columns;
    const [cols] = (await this.run((db) =>
      db.execute(
        sql`select table_name as t, column_name as c from information_schema.columns
            where table_schema = database() and data_type in ('varchar', 'text', 'mediumtext', 'longtext', 'json')
              and (character_maximum_length is null or character_maximum_length >= 60) and table_name <> '__drizzle_migrations'
            order by table_name, column_name`,
      ),
    )) as unknown as [{ t: string; c: string }[]];
    const [keys] = (await this.run((db) =>
      db.execute(
        sql`select table_name as t, column_name as c from information_schema.key_column_usage
            where table_schema = database() and constraint_name = 'PRIMARY' order by table_name, ordinal_position`,
      ),
    )) as unknown as [{ t: string; c: string }[]];
    const pks = new Map<string, string[]>();
    for (const k of keys) pks.set(k.t, [...(pks.get(k.t) ?? []), k.c]);
    const columns = cols.filter((c) => pks.has(c.t)).map((c) => ({ table: c.t, column: c.c, pk: pks.get(c.t)! }));
    this.rekeyColumnsCache = { at: Date.now(), columns };
    return columns;
  }




}

/** 73 Apps that aren't deleted. */
function liveApp() {
  return isNull(schema.apps.deletedAt);
}

/** 73 Licenses of apps that aren't deleted (and those given before the account's first app). */
function liveLicense() {
  const l = schema.licenses;
  const a = schema.apps;
  return sql`(${l.appId} is null or ${l.appId} not in (select ${a.id} from ${a} where ${a.deletedAt} is not null))`;
}

function toAppDeletionRow(deletion: AppDeletion): typeof schema.appDeletions.$inferInsert {
  return { ...deletion, openAppId: deletion.status === "waiting" ? deletion.appId : null };
}

function toAppDeletion(row: typeof schema.appDeletions.$inferSelect): AppDeletion {
  return {
    id: row.id,
    appId: row.appId,
    clientId: row.clientId,
    appName: row.appName,
    reason: row.reason,
    deletedBy: row.deletedBy,
    deletedAt: row.deletedAt,
    purgeAfter: row.purgeAfter,
    status: row.status,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    pendingBuilds: row.pendingBuilds ?? [],
  };
}

function toAccountDeletion(row: typeof schema.accountDeletionRequests.$inferSelect): AccountDeletionRequest {
  return {
    id: row.id,
    clientId: row.clientId,
    userId: row.userId,
    email: row.email,
    name: row.name,
    lang: row.lang,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requestedAt,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    teamNote: row.teamNote,
  };
}

/**
 * 19 When the last email to the publishing team failed: kept in the checklist
 * JSON under this key (not a step), so it needs no column of its own.
 */
const TEAM_EMAIL_FAILED = "_teamEmailFailedAt";

function toPublishingRequest(row: typeof schema.publishingRequests.$inferSelect): PublishingRequest {
  const { [TEAM_EMAIL_FAILED]: failed, ...checklist } = row.checklist ?? {};
  return {
    appId: row.appId,
    clientId: row.clientId,
    mode: row.mode,
    firebaseBy: row.firebaseBy,
    checklist,
    teamEmailFailedAt: failed ? new Date(failed) : null,
    listing: row.listing,
    android: { status: row.androidStatus, note: row.androidNote, storeUrl: row.androidStoreUrl, updatedAt: row.androidUpdatedAt, ...reviewFromRow(row.reviews?.android) },
    ios: { status: row.iosStatus, note: row.iosNote, storeUrl: row.iosStoreUrl, updatedAt: row.iosUpdatedAt, ...reviewFromRow(row.reviews?.ios) },
    ...moreStoresFromRow(row.moreStores),
    teamNotes: row.teamNotes,
    requestedAt: row.requestedAt,
    readyAt: row.readyAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** 88.3 What the store said about a Google Play or App Store version. */
function reviewFromRow(row: ReviewsRow["android"]): Pick<PublishingTrack, "rejection" | "storeState" | "checkedAt"> {
  return { rejection: row?.rejection ?? null, storeState: row?.storeState ?? null, checkedAt: row?.checkedAt ? new Date(row.checkedAt) : null };
}

function reviewsToRow(request: PublishingRequest): ReviewsRow | null {
  const one = (track: PublishingTrack) =>
    track.rejection || track.storeState || track.checkedAt ? { rejection: track.rejection ?? null, storeState: track.storeState ?? null, checkedAt: track.checkedAt?.toISOString() ?? null } : undefined;
  const row: ReviewsRow = { android: one(request.android), ios: one(request.ios) };
  return row.android || row.ios ? row : null;
}

/** 35, 36, 42 The Galaxy Store, AppGallery and Xiaomi GetApps tracks, kept as JSON (no migration for a new store). */
function moreStoresFromRow(row: MoreStoresRow | null): Pick<PublishingRequest, MoreStore> {
  const track = (value: MoreStoresRow[MoreStore]): PublishingTrack | null => {
    if (!value) return null;
    const { checkedAt, ...rest } = value;
    return { ...rest, updatedAt: value.updatedAt ? new Date(value.updatedAt) : null, ...(checkedAt ? { checkedAt: new Date(checkedAt) } : {}) };
  };
  return { galaxy: track(row?.galaxy), huawei: track(row?.huawei), xiaomi: track(row?.xiaomi) };
}

function moreStoresToRow(request: PublishingRequest): MoreStoresRow | null {
  const track = (value: PublishingTrack | null | undefined) => {
    if (!value) return null;
    const { checkedAt, ...rest } = value;
    return { ...rest, updatedAt: value.updatedAt?.toISOString() ?? null, ...(checkedAt ? { checkedAt: checkedAt.toISOString() } : {}) };
  };
  if (!request.galaxy && !request.huawei && !request.xiaomi) return null;
  return { galaxy: track(request.galaxy), huawei: track(request.huawei), xiaomi: track(request.xiaomi) };
}

function fromPublishingRequest(request: PublishingRequest): typeof schema.publishingRequests.$inferInsert {
  return {
    appId: request.appId,
    clientId: request.clientId,
    mode: request.mode,
    firebaseBy: request.firebaseBy,
    checklist: request.teamEmailFailedAt ? { ...request.checklist, [TEAM_EMAIL_FAILED]: request.teamEmailFailedAt.toISOString() } : request.checklist,
    listing: request.listing,
    androidStatus: request.android.status,
    androidNote: request.android.note,
    androidStoreUrl: request.android.storeUrl,
    androidUpdatedAt: request.android.updatedAt,
    iosStatus: request.ios.status,
    iosNote: request.ios.note,
    iosStoreUrl: request.ios.storeUrl,
    iosUpdatedAt: request.ios.updatedAt,
    moreStores: moreStoresToRow(request),
    reviews: reviewsToRow(request),
    teamNotes: request.teamNotes,
    requestedAt: request.requestedAt,
    readyAt: request.readyAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function toBuild(row: typeof schema.builds.$inferSelect): Build {
  return {
    ...row,
    stages: row.stages as BuildStages,
    config: row.config as unknown as BuildConfig,
    storeListing: row.storeListing as unknown as StoreListing,
    artifacts: row.artifacts as Artifact[],
  };
}

/** 78.3 A team alert row without its open key. */
function teamAlertOf({ openKey: _openKey, ...row }: typeof schema.teamAlerts.$inferSelect): TeamAlert {
  void _openKey;
  return row;
}
