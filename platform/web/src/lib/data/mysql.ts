import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lt, lte, not, or, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import type { DatabaseConfig } from "../env";
import { newId } from "../crypto/tokens";
import { membershipToUse } from "../bookings/memberships";
import { clientAccountState, longestLicense } from "../license/status";
import type { BuildConfig } from "../build-config/types";
import * as schema from "../db/schema";
import type { AnalyticsDailyRecord, AnalyticsDailyRow, AnalyticsEventRow, AnalyticsMetric } from "../analytics/types";
import type { AppAuthKey, AppLayoutRecord } from "./types";
import type { MoreStore, MoreStoresRow, PublishingEvent, PublishingRequest, PublishingTrack } from "./types";
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
import type { OwnerNotice, OwnerNoticeKind, OwnerNoticePatch } from "./types";
import type { DemoPurgeCounts } from "./types";
// 46 Links and crash reports
import type { AppLinkTarget, CrashIssue, CrashIssueStatus, CrashReportInput } from "./types";
import type { ApiWebhook, ApiWebhookPatch } from "./types";
import { mergeCrash } from "../crashes/report";
import type {
  Activation,
  App,
  Artifact,
  Asset,
  Build,
  BuildStatus,
  CatalogCategory,
  CatalogOrder,
  CatalogOrderPatch,
  CatalogOrderStatus,
  CatalogProduct,
  CatalogProductInput,
  PlatformSetting,
  PlanPayment,
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
 * at most one connection per function instance, closed about a second after
 * the last query (maxIdle 0), and TLS with certificate verification.
 */
export function createPool(config: DatabaseConfig): mysql.Pool {
  return mysql.createPool({
    uri: config.url,
    connectionLimit: 1,
    maxIdle: 0,
    idleTimeout: 5_000,
    queueLimit: 50,
    connectTimeout: 10_000,
    enableKeepAlive: false,
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
        .where(eq(schema.apps.backend, "setup_requested"))
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
        db.select().from(schema.apps).where(inArray(schema.apps.clientId, ids)).orderBy(asc(schema.apps.createdAt), asc(schema.apps.id)),
      ),
      this.run((db) => db.select().from(schema.licenses).where(inArray(schema.licenses.clientId, ids))),
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
        .leftJoin(schema.licenses, eq(schema.licenses.clientId, schema.clients.id))
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
        .where(and(eq(schema.licenses.clientId, clientId), appId === null ? isNull(schema.licenses.appId) : eq(schema.licenses.appId, appId)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async listLicensesByClient(clientId: string): Promise<License[]> {
    return this.run((db) =>
      db.select().from(schema.licenses).where(eq(schema.licenses.clientId, clientId)).orderBy(asc(schema.licenses.createdAt)),
    );
  }

  async getLicenseByHash(keyHash: string): Promise<License | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.licenses).where(eq(schema.licenses.keyHash, keyHash)).limit(1),
    );
    return rows[0] ?? null;
  }

  async updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.licenses).set({ ...patch, updatedAt: now }).where(eq(schema.licenses.id, id)));
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
        const [existing] = await tx.select({ n: count() }).from(schema.apps).where(eq(schema.apps.clientId, app.clientId));
        await tx.insert(schema.apps).values(app);
        if (Number(existing?.n ?? 0) > 0) return;
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
      db.select().from(schema.apps).where(eq(schema.apps.clientId, clientId)).orderBy(asc(schema.apps.createdAt), asc(schema.apps.id)),
    );
  }

  async getAppById(id: string): Promise<App | null> {
    const rows = await this.run((db) => db.select().from(schema.apps).where(eq(schema.apps.id, id)).limit(1));
    return rows[0] ?? null;
  }

  async updateApp(id: string, patch: AppPatch, now: Date): Promise<void> {
    await this.run((db) => db.update(schema.apps).set({ ...patch, updatedAt: now }).where(eq(schema.apps.id, id)));
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

  async listBuildsByApp(appId: string, limit: number): Promise<Build[]> {
    const rows = await this.run((db) =>
      db.select().from(schema.builds).where(eq(schema.builds.appId, appId)).orderBy(desc(schema.builds.number)).limit(limit),
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
    return and(
      eq(schema.hostedNotifications.appId, appId),
      or(isNull(schema.hostedNotifications.userId), eq(schema.hostedNotifications.userId, userId)),
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
        .where(and(eq(schema.hostedNotifications.appId, appId), isNull(schema.hostedNotifications.userId)))
        .orderBy(desc(schema.hostedNotifications.createdAt), desc(schema.hostedNotifications.id))
        .limit(limit),
    );
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
        }
        return true;
      }),
    );
  }

  async listCatalogOrders(input: {
    appId: string;
    userId?: number;
    statuses?: CatalogOrderStatus[];
    offset: number;
    limit: number;
  }): Promise<{ items: CatalogOrder[]; total: number }> {
    const where = and(
      eq(schema.catalogOrders.appId, input.appId),
      input.userId !== undefined ? eq(schema.catalogOrders.userId, input.userId) : undefined,
      input.statuses ? inArray(schema.catalogOrders.status, input.statuses) : undefined,
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
          const pick = membershipToUse(mine, input.now);
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

  async enrollInCourse(input: CourseEnrollment): Promise<boolean> {
    const [result] = await this.run((db) => db.insert(schema.courseEnrollments).ignore().values(input));
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

  async listPlanPayments(input: { clientId?: string; appId?: string; limit: number }): Promise<PlanPayment[]> {
    return (await this.run((db) =>
      db
        .select()
        .from(schema.planPayments)
        .where(
          and(
            input.clientId ? eq(schema.planPayments.clientId, input.clientId) : undefined,
            input.appId ? eq(schema.planPayments.appId, input.appId) : undefined,
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

  async cancelTickets(appId: string, input: { ids?: number[]; eventId?: number }, now: Date): Promise<number> {
    if (input.ids === undefined && input.eventId === undefined) return 0;
    if (input.ids !== undefined && input.ids.length === 0) return 0;
    const t = schema.eventTickets;
    const [result] = await this.run((db) =>
      db
        .update(t)
        .set({ status: "cancelled", cancelledAt: now })
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
    return this.run((db) => db.select().from(schema.apps).orderBy(asc(schema.apps.createdAt)));
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
    // Dismissals go with it (foreign key on delete cascade).
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

  // 13 Plans, limits and owner notices

  async listLicenses(): Promise<License[]> {
    return this.run((db) => db.select().from(schema.licenses));
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
        .where(or(isNotNull(a.androidPackage), isNotNull(a.iosBundleId)))
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

  async listApiWebhooks(appId: string, limit: number): Promise<ApiWebhook[]> {
    const w = schema.apiWebhooks;
    return this.run((db) => db.select().from(w).where(eq(w.appId, appId)).orderBy(desc(w.createdAt), asc(w.id)).limit(limit));
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
    return {
      donations: donations.affectedRows,
      orders: orders.affectedRows,
      appointments: appointments.affectedRows,
      inquiries: inquiries.affectedRows,
      favorites: favorites.affectedRows,
      enrollments: enrollments.affectedRows,
      progress: progress.affectedRows,
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

  async purgeAnalyticsEvents(beforeDay: string): Promise<number> {
    const t = schema.analyticsEvents;
    const [result] = await this.run((db) => db.delete(t).where(lt(t.day, beforeDay)));
    return result.affectedRows;
  }
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
    android: { status: row.androidStatus, note: row.androidNote, storeUrl: row.androidStoreUrl, updatedAt: row.androidUpdatedAt },
    ios: { status: row.iosStatus, note: row.iosNote, storeUrl: row.iosStoreUrl, updatedAt: row.iosUpdatedAt },
    ...moreStoresFromRow(row.moreStores),
    teamNotes: row.teamNotes,
    requestedAt: row.requestedAt,
    readyAt: row.readyAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** 35, 36, 42 The Galaxy Store, AppGallery and Xiaomi GetApps tracks, kept as JSON (no migration for a new store). */
function moreStoresFromRow(row: MoreStoresRow | null): Pick<PublishingRequest, MoreStore> {
  const track = (value: MoreStoresRow[MoreStore]) => (value ? { ...value, updatedAt: value.updatedAt ? new Date(value.updatedAt) : null } : null);
  return { galaxy: track(row?.galaxy), huawei: track(row?.huawei), xiaomi: track(row?.xiaomi) };
}

function moreStoresToRow(request: PublishingRequest): MoreStoresRow | null {
  const track = (value: PublishingTrack | null | undefined) => (value ? { ...value, updatedAt: value.updatedAt?.toISOString() ?? null } : null);
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
