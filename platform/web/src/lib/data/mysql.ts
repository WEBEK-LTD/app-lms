import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import type { DatabaseConfig } from "../env";
import { newId } from "../crypto/tokens";
import { accountState } from "../license/status";
import type { BuildConfig } from "../build-config/types";
import * as schema from "../db/schema";
import type {
  AppPatch,
  BuildPatch,
  ClaimResult,
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
import { DuplicateEmailError } from "./store";
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
  StageKey,
  StageStatus,
  StoreListing,
  User,
} from "./types";

type Db = MySql2Database<typeof schema>;

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

  async createClient(input: { userId: string; whatsapp: string; siteUrl: string; now: Date }): Promise<Client> {
    const client: Client = {
      id: newId(),
      userId: input.userId,
      whatsapp: input.whatsapp,
      siteUrl: input.siteUrl,
      status: "pending",
      paymentNote: null,
      activatedAt: null,
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
    const licenseRows = await this.run((db) => db.select().from(schema.licenses).where(inArray(schema.licenses.clientId, ids)));
    const licenseIds = licenseRows.map((l) => l.id);
    const activationRows = licenseIds.length
      ? await this.run((db) => db.select().from(schema.activations).where(inArray(schema.activations.licenseId, licenseIds)))
      : [];
    const buildRows = await this.run((db) =>
      db
        .select()
        .from(schema.builds)
        .where(
          and(
            inArray(schema.builds.clientId, ids),
            eq(schema.builds.number, sql`(select max(b2.number) from builds b2 where b2.client_id = ${schema.builds.clientId})`),
          ),
        ),
    );
    const licenseByClient = new Map(licenseRows.map((l) => [l.clientId, l]));
    const activationByLicense = new Map(activationRows.map((a) => [a.licenseId, a]));
    const buildByClient = new Map(buildRows.map((b) => [b.clientId, toBuild(b)]));
    return base
      .map((row) => {
        const license = licenseByClient.get(row.client.id) ?? null;
        return {
          client: row.client,
          user: row.user,
          license,
          activation: license ? (activationByLicense.get(license.id) ?? null) : null,
          latestBuild: buildByClient.get(row.client.id) ?? null,
        };
      })
      .filter((row) => input.filter === "all" || accountState(row.client, row.license, input.now) === input.filter);
  }

  async countClients(now: Date): Promise<Record<ClientFilter, number>> {
    const rows = await this.run((db) =>
      db
        .select({ status: schema.clients.status, expiresAt: schema.licenses.expiresAt })
        .from(schema.clients)
        .leftJoin(schema.licenses, eq(schema.licenses.clientId, schema.clients.id)),
    );
    const counts: Record<ClientFilter, number> = { all: 0, pending: 0, active: 0, expired: 0 };
    for (const row of rows) {
      counts.all += 1;
      const state = accountState({ status: row.status }, row.expiresAt ? { expiresAt: row.expiresAt } : null, now);
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

  async getLicenseByClientId(clientId: string): Promise<License | null> {
    const rows = await this.run((db) =>
      db.select().from(schema.licenses).where(eq(schema.licenses.clientId, clientId)).limit(1),
    );
    return rows[0] ?? null;
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
      lastCheckedAt: activation.lastCheckedAt,
    };
    await this.run((db) =>
      db.update(schema.activations).set(patch).where(eq(schema.activations.licenseId, activation.licenseId)),
    );
    return { ok: true, activation: { ...existing, ...patch } };
  }

  async touchActivation(
    licenseId: string,
    patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "lastCheckedAt">,
  ): Promise<void> {
    await this.run((db) => db.update(schema.activations).set(patch).where(eq(schema.activations.licenseId, licenseId)));
  }

  async deleteActivation(licenseId: string): Promise<void> {
    await this.run((db) => db.delete(schema.activations).where(eq(schema.activations.licenseId, licenseId)));
  }

  async createApp(app: App): Promise<void> {
    await this.run((db) => db.insert(schema.apps).values(app));
  }

  async getAppByClientId(clientId: string): Promise<App | null> {
    const rows = await this.run((db) => db.select().from(schema.apps).where(eq(schema.apps.clientId, clientId)).limit(1));
    return rows[0] ?? null;
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

  async createBuild(input: Omit<Build, "number" | "versionCode">): Promise<Build> {
    return this.run((db) =>
      db.transaction(async (tx) => {
        const [previous] = await tx
          .select({
            number: sql<number | null>`max(${schema.builds.number})`,
            versionCode: sql<number | null>`max(${schema.builds.versionCode})`,
          })
          .from(schema.builds)
          .where(eq(schema.builds.clientId, input.clientId))
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

  async listBuildsByClient(clientId: string, limit: number): Promise<Build[]> {
    const rows = await this.run((db) =>
      db.select().from(schema.builds).where(eq(schema.builds.clientId, clientId)).orderBy(desc(schema.builds.number)).limit(limit),
    );
    return rows.map(toBuild);
  }

  async listBuilds(input: { status?: BuildStatus; limit: number }): Promise<Build[]> {
    const rows = await this.run((db) =>
      db
        .select()
        .from(schema.builds)
        .where(input.status ? eq(schema.builds.status, input.status) : undefined)
        .orderBy(asc(schema.builds.createdAt))
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
    phone: string;
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
}

function toBuild(row: typeof schema.builds.$inferSelect): Build {
  return {
    ...row,
    stages: row.stages as Record<StageKey, StageStatus>,
    config: row.config as unknown as BuildConfig,
    storeListing: row.storeListing as unknown as StoreListing,
    artifacts: row.artifacts as Artifact[],
  };
}
