import { clientAccountState, longestLicense } from "../license/status";
import { newId } from "../crypto/tokens";
import type { AppLayoutRecord } from "./types";
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
import { ACTIVE_BOOKING_STATUSES } from "./types";
import type {
  Activation,
  App,
  Asset,
  Build,
  BuildStatus,
  Client,
  HostedChallenge,
  HostedDevice,
  HostedNotification,
  CatalogCategory,
  CatalogOrder,
  CatalogOrderPatch,
  CatalogOrderStatus,
  CatalogProduct,
  CatalogProductInput,
  PlatformSetting,
  PlatformSettingKey,
  PlatformSettingValues,
  HostedRefreshToken,
  HostedUser,
  HostedUserPatch,
  License,
  OwnerNotice,
  OwnerNoticeKind,
  OwnerNoticePatch,
  PluginRelease,
  ResetToken,
  User,
  PlanPayment,
  BookingAppointment,
  BookingAppointmentPatch,
  BookingStatus,
  CourseEnrollment,
  LessonProgress,
  AdminMember,
  AdminMemberRow,
  AuditEntry,
  AuditQuery,
} from "./types";
// 11.3, 11.4, 11.6 and 11.8
import type { Announcement, AnnouncementPatch, Coupon, CouponPatch, CouponRedemption, EmailTemplateRecord, SiteContentRecord } from "./types";
// 23 News & blog
import type { Article, ArticleCategory, ArticleInput, NewsSettings } from "./types";
// 10.7 Listings
import type { Listing, ListingFavorite, ListingInput, ListingInquiry, ListingInquiryMessage, ListingInquiryRow, ListingInquiryStatus, ListingSettings } from "./types";
import type { PublishingEvent, PublishingRequest } from "./types";
import type { DemoPurgeCounts } from "./types";

const clone = <T>(value: T): T => structuredClone(value);

/**
 * In-memory store for tests and local runs (YALLAPP_DATA=memory).
 * Data lives as long as the process. Values are cloned on the way in and out
 * so callers can't mutate stored records by accident, as with a real database.
 */
export class MemoryStore implements DataStore {
  private users = new Map<string, User>();
  private clients = new Map<string, Client>();
  private licenses = new Map<string, License>();
  private activations = new Map<string, Activation>();
  private apps = new Map<string, App>();
  private builds = new Map<string, Build>();
  private releases = new Map<string, PluginRelease>();
  private assets = new Map<string, Asset>();
  private resetTokens = new Map<string, ResetToken>();
  private rateLimits = new Map<string, { windowStart: number; hits: number }>();
  private hostedUsers = new Map<number, HostedUser>();
  private hostedDevices = new Map<string, HostedDevice>();
  private hostedTokens = new Map<string, HostedRefreshToken>();
  private hostedChallenges = new Map<string, HostedChallenge>();
  private hostedNotifications = new Map<number, HostedNotification>();
  private nextHostedUserId = 1;
  private nextHostedNotificationId = 1;
  private catalogCategories = new Map<number, CatalogCategory>();
  private catalogProducts = new Map<number, CatalogProduct>();
  private catalogOrders = new Map<number, CatalogOrder>();
  private nextCatalogId = 1;
  private platformSettings = new Map<PlatformSettingKey, PlatformSetting>();
  private planPayments = new Map<string, PlanPayment>();
  private bookingAppointments = new Map<number, BookingAppointment>();
  private nextBookingId = 1;
  private courseEnrollments: CourseEnrollment[] = [];
  private lessonProgress = new Map<string, LessonProgress>();

  async createUser(input: { email: string; name: string; passwordHash: string | null; now: Date }): Promise<User> {
    const email = input.email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === email) throw new DuplicateEmailError();
    }
    const user: User = {
      id: newId(),
      email,
      name: input.name,
      passwordHash: input.passwordHash,
      sessionVersion: 1,
      createdAt: input.now,
      updatedAt: input.now,
      lastSignInAt: null,
    };
    this.users.set(user.id, clone(user));
    return clone(user);
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? clone(user) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const wanted = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === wanted) return clone(user);
    }
    return null;
  }

  async updateUser(id: string, patch: UserPatch, now: Date): Promise<void> {
    const user = this.users.get(id);
    if (user) this.users.set(id, clone({ ...user, ...patch, updatedAt: now }));
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
    this.clients.set(client.id, clone(client));
    return clone(client);
  }

  async getClientById(id: string): Promise<Client | null> {
    const client = this.clients.get(id);
    return client ? clone(client) : null;
  }

  async getClientByUserId(userId: string): Promise<Client | null> {
    for (const client of this.clients.values()) {
      if (client.userId === userId) return clone(client);
    }
    return null;
  }

  async updateClient(id: string, patch: ClientPatch, now: Date): Promise<void> {
    const client = this.clients.get(id);
    if (client) this.clients.set(id, clone({ ...client, ...patch, updatedAt: now }));
  }

  private appsOf(clientId: string): App[] {
    return [...this.apps.values()]
      .filter((a) => a.clientId === clientId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  }

  private rowFor(client: Client): ClientRow | null {
    const user = this.users.get(client.userId);
    if (!user) return null;
    const licenses = [...this.licenses.values()].filter((l) => l.clientId === client.id);
    const entry = (app: App | null): ClientAppRow => {
      const license = licenses.find((l) => l.appId === (app?.id ?? null)) ?? null;
      const latestBuild = app ? ([...this.builds.values()].filter((b) => b.appId === app.id).sort((a, b) => b.number - a.number)[0] ?? null) : null;
      return {
        app: app ? clone(app) : null,
        license: license ? clone(license) : null,
        activation: license ? clone(this.activations.get(license.id) ?? null) : null,
        latestBuild: latestBuild ? clone(latestBuild) : null,
      };
    };
    const apps = this.appsOf(client.id).map(entry);
    if (licenses.some((l) => l.appId === null)) apps.push(entry(null));
    const longest = longestLicense(licenses);
    return { client: clone(client), user: clone(user), license: longest ? clone(longest) : null, apps };
  }

  async listClients(input: { filter: ClientFilter; query?: string; now: Date }): Promise<ClientRow[]> {
    const query = input.query?.trim().toLowerCase();
    const rows: ClientRow[] = [];
    for (const client of this.clients.values()) {
      const row = this.rowFor(client);
      if (!row) continue;
      if (input.filter !== "all" && clientAccountState(row.client, row.license ? [row.license] : [], input.now) !== input.filter) continue;
      if (query) {
        const haystack = [row.user.name, row.user.email, row.client.whatsapp, row.client.siteUrl].join(" ").toLowerCase();
        if (!haystack.includes(query)) continue;
      }
      rows.push(row);
    }
    return rows.sort((a, b) => b.client.createdAt.getTime() - a.client.createdAt.getTime());
  }

  async listSetupRequests(): Promise<SetupRequestRow[]> {
    const rows: SetupRequestRow[] = [];
    for (const app of this.apps.values()) {
      if (app.backend !== "setup_requested") continue;
      const client = this.clients.get(app.clientId);
      const user = client ? this.users.get(client.userId) : undefined;
      if (client && user) rows.push({ client: clone(client), user: clone(user), app: clone(app) });
    }
    return rows.sort((a, b) => (a.app.setupRequestedAt?.getTime() ?? 0) - (b.app.setupRequestedAt?.getTime() ?? 0));
  }

  async countClients(now: Date): Promise<Record<ClientFilter, number>> {
    const counts: Record<ClientFilter, number> = { all: 0, pending: 0, active: 0, expired: 0 };
    for (const client of this.clients.values()) {
      const state = clientAccountState(client, [...this.licenses.values()].filter((l) => l.clientId === client.id), now);
      counts.all += 1;
      if (state !== "suspended") counts[state] += 1;
    }
    return counts;
  }

  async createLicense(license: License): Promise<void> {
    for (const existing of this.licenses.values()) {
      if (license.appId !== null && existing.appId === license.appId) throw new Error("App already has a license");
      if (license.appId === null && existing.clientId === license.clientId && existing.appId === null) throw new Error("Client already has a license without an app");
      if (existing.keyHash === license.keyHash) throw new Error("Duplicate license key");
    }
    if (license.appId !== null && this.apps.get(license.appId)?.clientId !== license.clientId) throw new Error("The app isn't the client's");
    this.licenses.set(license.id, clone(license));
  }

  async getLicenseById(id: string): Promise<License | null> {
    const license = this.licenses.get(id);
    return license ? clone(license) : null;
  }

  async getLicenseForApp(clientId: string, appId: string | null): Promise<License | null> {
    for (const license of this.licenses.values()) {
      if (license.clientId === clientId && license.appId === appId) return clone(license);
    }
    return null;
  }

  async listLicensesByClient(clientId: string): Promise<License[]> {
    return [...this.licenses.values()]
      .filter((l) => l.clientId === clientId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone);
  }

  async getLicenseByHash(keyHash: string): Promise<License | null> {
    for (const license of this.licenses.values()) {
      if (license.keyHash === keyHash) return clone(license);
    }
    return null;
  }

  async updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void> {
    const license = this.licenses.get(id);
    if (license) this.licenses.set(id, clone({ ...license, ...patch, updatedAt: now }));
  }

  async getActivation(licenseId: string): Promise<Activation | null> {
    const activation = this.activations.get(licenseId);
    return activation ? clone(activation) : null;
  }

  async claimActivation(activation: Activation): Promise<ClaimResult> {
    const existing = this.activations.get(activation.licenseId);
    if (existing && existing.siteUrl !== activation.siteUrl) return { ok: false, existing: clone(existing) };
    const next: Activation = existing
      ? {
          ...existing,
          siteUrlRaw: activation.siteUrlRaw,
          pluginVersion: activation.pluginVersion,
          wpVersion: activation.wpVersion,
          lms: activation.lms,
          lastCheckedAt: activation.lastCheckedAt,
        }
      : activation;
    this.activations.set(activation.licenseId, clone(next));
    return { ok: true, activation: clone(next) };
  }

  async touchActivation(
    licenseId: string,
    patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "lastCheckedAt">,
  ): Promise<void> {
    const activation = this.activations.get(licenseId);
    if (activation) this.activations.set(licenseId, clone({ ...activation, ...patch }));
  }

  async deleteActivation(licenseId: string): Promise<void> {
    this.activations.delete(licenseId);
  }

  async createApp(app: App): Promise<void> {
    if (this.apps.has(app.id)) throw new Error("Duplicate app ID");
    const first = this.appsOf(app.clientId).length === 0;
    this.apps.set(app.id, clone(app));
    if (!first) return;
    // The account's first app takes what was paid and given before it existed.
    for (const [id, license] of this.licenses) {
      if (license.clientId === app.clientId && license.appId === null) this.licenses.set(id, { ...license, appId: app.id });
    }
    for (const [id, payment] of this.planPayments) {
      if (payment.clientId === app.clientId && payment.appId === null) this.planPayments.set(id, { ...payment, appId: app.id });
    }
  }

  async listAppsByClient(clientId: string): Promise<App[]> {
    return this.appsOf(clientId).map(clone);
  }

  async getAppById(id: string): Promise<App | null> {
    const app = this.apps.get(id);
    return app ? clone(app) : null;
  }

  async updateApp(id: string, patch: AppPatch, now: Date): Promise<void> {
    const app = this.apps.get(id);
    if (app) this.apps.set(id, clone({ ...app, ...patch, updatedAt: now }));
  }

  async saveSigningKeys(appId: string, keys: SigningKeysPatch, now: Date): Promise<boolean> {
    const app = this.apps.get(appId);
    const columns = Object.keys(keys) as SigningKeyColumn[];
    if (!app || columns.length === 0 || columns.some((column) => app[column] !== null)) return false;
    this.apps.set(appId, clone({ ...app, ...keys, updatedAt: now }));
    return true;
  }

  async createBuild(input: Omit<Build, "number" | "versionCode">, options: { exclusive?: boolean } = {}): Promise<Build> {
    const previous = [...this.builds.values()].filter((b) => b.appId === input.appId);
    if (options.exclusive && previous.some((b) => b.status === "queued" || b.status === "building")) throw new BuildRunningError();
    const number = previous.reduce((max, b) => Math.max(max, b.number), 0) + 1;
    const versionCode = previous.reduce((max, b) => Math.max(max, b.versionCode), 0) + 1;
    const build: Build = {
      ...input,
      number,
      versionCode,
      config: { ...input.config, version_code: versionCode },
    };
    this.builds.set(build.id, clone(build));
    return clone(build);
  }

  async getBuild(id: string): Promise<Build | null> {
    const build = this.builds.get(id);
    return build ? clone(build) : null;
  }

  async listBuildsByApp(appId: string, limit: number): Promise<Build[]> {
    return [...this.builds.values()]
      .filter((b) => b.appId === appId)
      .sort((a, b) => b.number - a.number)
      .slice(0, limit)
      .map(clone);
  }

  async listBuilds(input: { status?: BuildStatus; limit: number; newestFirst?: boolean }): Promise<Build[]> {
    return [...this.builds.values()]
      .filter((b) => !input.status || b.status === input.status)
      .sort((a, b) => (a.createdAt.getTime() - b.createdAt.getTime()) * (input.newestFirst ? -1 : 1))
      .slice(0, input.limit)
      .map(clone);
  }

  async updateBuild(id: string, patch: BuildPatch, now: Date): Promise<void> {
    const build = this.builds.get(id);
    if (build) this.builds.set(id, clone({ ...build, ...patch, updatedAt: now }));
  }

  async createRelease(release: PluginRelease): Promise<void> {
    for (const existing of this.releases.values()) {
      if (existing.version === release.version) throw new Error("This version already exists");
    }
    this.releases.set(release.id, clone(release));
  }

  async getRelease(id: string): Promise<PluginRelease | null> {
    const release = this.releases.get(id);
    return release ? clone(release) : null;
  }

  async getReleaseByVersion(version: string): Promise<PluginRelease | null> {
    for (const release of this.releases.values()) {
      if (release.version === version) return clone(release);
    }
    return null;
  }

  async listReleases(): Promise<PluginRelease[]> {
    return [...this.releases.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(clone);
  }

  async updateRelease(id: string, patch: ReleasePatch): Promise<void> {
    const release = this.releases.get(id);
    if (release) this.releases.set(id, clone({ ...release, ...patch }));
  }

  async deleteRelease(id: string): Promise<void> {
    this.releases.delete(id);
  }

  async createAsset(asset: Asset): Promise<void> {
    this.assets.set(asset.id, clone(asset));
  }

  async getAsset(id: string): Promise<Asset | null> {
    const asset = this.assets.get(id);
    return asset ? clone(asset) : null;
  }

  async createResetToken(token: ResetToken): Promise<void> {
    this.resetTokens.set(token.tokenHash, clone(token));
  }

  async getResetToken(tokenHash: string): Promise<ResetToken | null> {
    const token = this.resetTokens.get(tokenHash);
    return token ? clone(token) : null;
  }

  async consumeResetToken(tokenHash: string, now: Date): Promise<boolean> {
    const token = this.resetTokens.get(tokenHash);
    if (!token || token.usedAt) return false;
    this.resetTokens.set(tokenHash, { ...token, usedAt: now });
    return true;
  }

  async hitRateLimit(bucket: string, windowStart: number): Promise<number> {
    const entry = this.rateLimits.get(bucket);
    if (!entry || entry.windowStart !== windowStart) {
      this.rateLimits.set(bucket, { windowStart, hits: 1 });
      return 1;
    }
    entry.hits += 1;
    return entry.hits;
  }

  async peekRateLimit(bucket: string, windowStart: number): Promise<number> {
    const entry = this.rateLimits.get(bucket);
    return entry && entry.windowStart === windowStart ? entry.hits : 0;
  }

  async createHostedUser(input: {
    appId: string;
    phone: string | null;
    name: string;
    email: string | null;
    city: string | null;
    now: Date;
  }): Promise<HostedUser | null> {
    if (input.phone !== null && (await this.getHostedUserByPhone(input.appId, input.phone))) return null;
    if (input.phone === null && (!input.email || (await this.getHostedEmailUser(input.appId, input.email)))) return null;
    const user: HostedUser = {
      id: this.nextHostedUserId++,
      appId: input.appId,
      phone: input.phone,
      name: input.name,
      email: input.email,
      city: input.city,
      notificationsReadAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    };
    this.hostedUsers.set(user.id, clone(user));
    return clone(user);
  }

  async getHostedUser(appId: string, id: number): Promise<HostedUser | null> {
    const user = this.hostedUsers.get(id);
    return user && user.appId === appId ? clone(user) : null;
  }

  async getHostedUserByPhone(appId: string, phone: string): Promise<HostedUser | null> {
    for (const user of this.hostedUsers.values()) {
      if (user.appId === appId && user.phone === phone) return clone(user);
    }
    return null;
  }

  async getHostedEmailUser(appId: string, email: string): Promise<HostedUser | null> {
    for (const user of this.hostedUsers.values()) {
      if (user.appId === appId && user.phone === null && user.email === email) return clone(user);
    }
    return null;
  }

  async updateHostedUser(appId: string, id: number, patch: HostedUserPatch, now: Date): Promise<void> {
    const user = this.hostedUsers.get(id);
    if (user && user.appId === appId) this.hostedUsers.set(id, clone({ ...user, ...patch, updatedAt: now }));
  }

  async deleteHostedUser(appId: string, id: number): Promise<void> {
    const user = this.hostedUsers.get(id);
    if (!user || user.appId !== appId) return;
    this.hostedUsers.delete(id);
    for (const device of [...this.hostedDevices.values()]) {
      if (device.userId === id) await this.deleteHostedDevice(appId, device.id);
    }
    for (const [key, n] of this.hostedNotifications) {
      if (n.userId === id) this.hostedNotifications.delete(key);
    }
    // Orders stay with the shop; they no longer belong to an account.
    for (const order of this.catalogOrders.values()) {
      if (order.appId === appId && order.userId === id) order.userId = null;
    }
    this.forgetListingUser(appId, id);
  }

  async createHostedDevice(device: HostedDevice): Promise<void> {
    this.hostedDevices.set(device.id, clone(device));
  }

  async getHostedDevice(appId: string, id: string): Promise<HostedDevice | null> {
    const device = this.hostedDevices.get(id);
    return device && device.appId === appId ? clone(device) : null;
  }

  async findHostedDevice(appId: string, userId: number, deviceId: string): Promise<HostedDevice | null> {
    for (const device of this.hostedDevices.values()) {
      if (device.appId === appId && device.userId === userId && device.deviceId === deviceId) return clone(device);
    }
    return null;
  }

  async listHostedDevices(appId: string, userId: number): Promise<HostedDevice[]> {
    return [...this.hostedDevices.values()]
      .filter((d) => d.appId === appId && d.userId === userId)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
      .map(clone);
  }

  async updateHostedDevice(appId: string, id: string, patch: HostedDevicePatch): Promise<void> {
    const device = this.hostedDevices.get(id);
    if (device && device.appId === appId) this.hostedDevices.set(id, clone({ ...device, ...patch }));
  }

  async deleteHostedDevice(appId: string, id: string): Promise<void> {
    const device = this.hostedDevices.get(id);
    if (!device || device.appId !== appId) return;
    this.hostedDevices.delete(id);
    for (const [hash, token] of this.hostedTokens) {
      if (token.deviceRowId === id) this.hostedTokens.delete(hash);
    }
  }

  async listHostedPushDevices(appId: string, userIds: number[] | null): Promise<HostedDevice[]> {
    return [...this.hostedDevices.values()]
      .filter((d) => d.appId === appId && d.pushToken && (userIds === null || userIds.includes(d.userId)))
      .map(clone);
  }

  async clearHostedPushToken(appId: string, token: string): Promise<void> {
    for (const device of this.hostedDevices.values()) {
      if (device.appId === appId && device.pushToken === token) device.pushToken = null;
    }
  }

  async createHostedRefreshToken(token: HostedRefreshToken): Promise<void> {
    this.hostedTokens.set(token.tokenHash, clone(token));
  }

  async takeHostedRefreshToken(tokenHash: string): Promise<HostedRefreshToken | null> {
    const token = this.hostedTokens.get(tokenHash);
    if (!token) return null;
    this.hostedTokens.delete(tokenHash);
    return clone(token);
  }

  async createHostedChallenge(challenge: HostedChallenge): Promise<void> {
    this.hostedChallenges.set(challenge.tokenHash, clone(challenge));
  }

  async getHostedChallenge(tokenHash: string): Promise<HostedChallenge | null> {
    const challenge = this.hostedChallenges.get(tokenHash);
    return challenge ? clone(challenge) : null;
  }

  async addHostedChallengeAttempt(tokenHash: string): Promise<number> {
    const challenge = this.hostedChallenges.get(tokenHash);
    if (!challenge) return Number.MAX_SAFE_INTEGER;
    challenge.attempts += 1;
    return challenge.attempts;
  }

  async deleteHostedChallenge(tokenHash: string): Promise<void> {
    this.hostedChallenges.delete(tokenHash);
  }

  async purgeHostedExpired(now: Date): Promise<void> {
    for (const [hash, c] of this.hostedChallenges) {
      if (c.expiresAt.getTime() <= now.getTime()) this.hostedChallenges.delete(hash);
    }
    for (const [hash, t] of this.hostedTokens) {
      if (t.expiresAt.getTime() <= now.getTime()) this.hostedTokens.delete(hash);
    }
  }

  async createHostedNotification(input: Omit<HostedNotification, "id">): Promise<HostedNotification> {
    const notification: HostedNotification = { ...input, id: this.nextHostedNotificationId++ };
    this.hostedNotifications.set(notification.id, clone(notification));
    return clone(notification);
  }

  private hostedInbox(appId: string, userId: number, after: Date): HostedNotification[] {
    return [...this.hostedNotifications.values()]
      .filter(
        (n) =>
          n.appId === appId && (n.userId === null || n.userId === userId) && n.createdAt.getTime() > after.getTime(),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  }

  async listHostedNotifications(input: {
    appId: string;
    userId: number;
    since: Date;
    page: number;
    perPage: number;
  }): Promise<{ items: HostedNotification[]; total: number }> {
    const all = this.hostedInbox(input.appId, input.userId, new Date(input.since.getTime() - 1));
    const start = (input.page - 1) * input.perPage;
    return { items: all.slice(start, start + input.perPage).map(clone), total: all.length };
  }

  async countHostedNotificationsAfter(input: { appId: string; userId: number; after: Date }): Promise<number> {
    return this.hostedInbox(input.appId, input.userId, input.after).length;
  }

  async listHostedBroadcasts(appId: string, limit: number): Promise<HostedNotification[]> {
    return [...this.hostedNotifications.values()]
      .filter((n) => n.appId === appId && n.userId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .slice(0, limit)
      .map(clone);
  }

  async countHostedUsers(appId: string): Promise<number> {
    return [...this.hostedUsers.values()].filter((u) => u.appId === appId).length;
  }

  async countHostedEmailOnlyUsers(appId: string): Promise<number> {
    return [...this.hostedUsers.values()].filter((u) => u.appId === appId && u.phone === null).length;
  }

  // Catalog

  async listCatalogCategories(appId: string): Promise<CatalogCategory[]> {
    return [...this.catalogCategories.values()]
      .filter((c) => c.appId === appId)
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map(clone);
  }

  async createCatalogCategory(input: { appId: string; name: string; now: Date }): Promise<CatalogCategory> {
    const position = Math.max(0, ...[...this.catalogCategories.values()].filter((c) => c.appId === input.appId).map((c) => c.position + 1));
    const category: CatalogCategory = { id: this.nextCatalogId++, appId: input.appId, name: input.name, position, createdAt: input.now };
    this.catalogCategories.set(category.id, clone(category));
    return category;
  }

  async renameCatalogCategory(appId: string, id: number, name: string): Promise<void> {
    const category = this.catalogCategories.get(id);
    if (category && category.appId === appId) category.name = name;
  }

  async deleteCatalogCategory(appId: string, id: number, now: Date): Promise<void> {
    const category = this.catalogCategories.get(id);
    if (!category || category.appId !== appId) return;
    this.catalogCategories.delete(id);
    for (const product of this.catalogProducts.values()) {
      if (product.appId === appId && product.categoryIds.includes(id)) {
        product.categoryIds = product.categoryIds.filter((c) => c !== id);
        product.updatedAt = now;
      }
    }
  }

  async listCatalogProducts(appId: string): Promise<CatalogProduct[]> {
    return [...this.catalogProducts.values()]
      .filter((p) => p.appId === appId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .map(clone);
  }

  async getCatalogProduct(appId: string, id: number): Promise<CatalogProduct | null> {
    const product = this.catalogProducts.get(id);
    return product && product.appId === appId ? clone(product) : null;
  }

  async createCatalogProduct(input: CatalogProductInput, now: Date): Promise<CatalogProduct> {
    const product: CatalogProduct = { ...clone(input), id: this.nextCatalogId++, salesCount: 0, createdAt: now, updatedAt: now };
    this.catalogProducts.set(product.id, clone(product));
    return product;
  }

  async updateCatalogProduct(appId: string, id: number, input: Partial<CatalogProductInput>, now: Date): Promise<void> {
    const product = this.catalogProducts.get(id);
    if (product && product.appId === appId) this.catalogProducts.set(id, clone({ ...product, ...input, appId, id, updatedAt: now }));
  }

  async deleteCatalogProduct(appId: string, id: number): Promise<void> {
    const product = this.catalogProducts.get(id);
    if (product && product.appId === appId) this.catalogProducts.delete(id);
  }

  async createCatalogOrder(input: Omit<CatalogOrder, "id">): Promise<CatalogOrder> {
    const order: CatalogOrder = { ...clone(input), id: this.nextCatalogId++ };
    this.catalogOrders.set(order.id, clone(order));
    return order;
  }

  async getCatalogOrder(appId: string, id: number): Promise<CatalogOrder | null> {
    const order = this.catalogOrders.get(id);
    return order && order.appId === appId ? clone(order) : null;
  }

  async getCatalogOrderByToken(tokenHash: string): Promise<CatalogOrder | null> {
    for (const order of this.catalogOrders.values()) if (order.tokenHash === tokenHash) return clone(order);
    return null;
  }

  async updateCatalogOrder(appId: string, id: number, patch: CatalogOrderPatch): Promise<void> {
    const order = this.catalogOrders.get(id);
    if (order && order.appId === appId) this.catalogOrders.set(id, clone({ ...order, ...patch }));
  }

  async payCatalogOrder(appId: string, id: number, paymentId: string, now: Date): Promise<boolean> {
    const order = this.catalogOrders.get(id);
    if (!order || order.appId !== appId || order.status !== "pending") return false;
    Object.assign(order, { status: "processing", paymentId, paidAt: now, updatedAt: now });
    for (const line of order.lines) {
      const product = this.catalogProducts.get(line.productId);
      if (!product || product.appId !== appId) continue;
      product.salesCount += line.quantity;
      if (product.stock !== null) product.stock = Math.max(0, product.stock - line.quantity);
    }
    return true;
  }

  async listCatalogOrders(input: {
    appId: string;
    userId?: number;
    statuses?: CatalogOrderStatus[];
    offset: number;
    limit: number;
  }): Promise<{ items: CatalogOrder[]; total: number }> {
    const all = [...this.catalogOrders.values()]
      .filter(
        (o) =>
          o.appId === input.appId &&
          (input.userId === undefined || o.userId === input.userId) &&
          (!input.statuses || input.statuses.includes(o.status)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
    return { items: all.slice(input.offset, input.offset + input.limit).map(clone), total: all.length };
  }

  // Platform settings

  async createBookingAppointment(input: Omit<BookingAppointment, "id">): Promise<BookingAppointment | null> {
    for (const other of this.bookingAppointments.values()) {
      if (
        other.appId === input.appId &&
        other.staffId === input.staffId &&
        ACTIVE_BOOKING_STATUSES.includes(other.status) &&
        other.startAt < input.endAt &&
        input.startAt < other.endAt
      ) {
        return null;
      }
    }
    const appointment: BookingAppointment = { ...clone(input), id: this.nextBookingId++ };
    this.bookingAppointments.set(appointment.id, clone(appointment));
    return appointment;
  }

  async getBookingAppointment(appId: string, id: number): Promise<BookingAppointment | null> {
    const appointment = this.bookingAppointments.get(id);
    return appointment && appointment.appId === appId ? clone(appointment) : null;
  }

  async updateBookingAppointment(appId: string, id: number, patch: BookingAppointmentPatch): Promise<void> {
    const appointment = this.bookingAppointments.get(id);
    if (appointment && appointment.appId === appId) this.bookingAppointments.set(id, clone({ ...appointment, ...patch }));
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
    const active = (a: BookingAppointment) => ACTIVE_BOOKING_STATUSES.includes(a.status);
    const all = [...this.bookingAppointments.values()]
      .filter((a) => a.appId === input.appId)
      .filter((a) => input.userId === undefined || a.userId === input.userId)
      .filter((a) => !input.statuses || input.statuses.includes(a.status))
      .filter((a) => !input.startFrom || a.startAt >= input.startFrom)
      .filter((a) => !input.startBefore || a.startAt < input.startBefore)
      .filter((a) => {
        if (!input.scope) return true;
        const upcoming = active(a) && a.startAt >= input.scope.now;
        return input.scope.kind === "upcoming" ? upcoming : !upcoming;
      })
      .sort((a, b) => (input.scope?.kind === "past" ? b.startAt.getTime() - a.startAt.getTime() : a.startAt.getTime() - b.startAt.getTime()) || a.id - b.id);
    return { items: all.slice(input.offset, input.offset + input.limit).map(clone), total: all.length };
  }

  async enrollInCourse(input: CourseEnrollment): Promise<boolean> {
    if (this.courseEnrollments.some((e) => e.appId === input.appId && e.userId === input.userId && e.courseId === input.courseId)) return false;
    this.courseEnrollments.push(clone(input));
    return true;
  }

  async listCourseEnrollments(input: { appId: string; userId?: number; courseId?: number }): Promise<CourseEnrollment[]> {
    return this.courseEnrollments
      .filter((e) => e.appId === input.appId && (input.userId === undefined || e.userId === input.userId) && (input.courseId === undefined || e.courseId === input.courseId))
      .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime())
      .map(clone);
  }

  async saveLessonProgress(input: LessonProgress): Promise<void> {
    const key = `${input.appId}:${input.userId}:${input.lessonId}`;
    const saved = this.lessonProgress.get(key);
    this.lessonProgress.set(key, clone({ ...input, completedAt: saved?.completedAt ?? input.completedAt }));
  }

  async listLessonProgress(input: { appId: string; userId: number; courseId?: number }): Promise<LessonProgress[]> {
    return [...this.lessonProgress.values()]
      .filter((p) => p.appId === input.appId && p.userId === input.userId && (input.courseId === undefined || p.courseId === input.courseId))
      .map(clone);
  }

  async listMarketplaceOrders(limit: number): Promise<CatalogOrder[]> {
    return [...this.catalogOrders.values()]
      .filter((o) => o.commissionCents !== null && o.paidAt !== null)
      .sort((a, b) => b.paidAt!.getTime() - a.paidAt!.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async createPlanPayment(payment: PlanPayment): Promise<void> {
    this.planPayments.set(payment.id, clone(payment));
  }

  async getPlanPaymentByToken(tokenHash: string): Promise<PlanPayment | null> {
    for (const payment of this.planPayments.values()) if (payment.tokenHash === tokenHash) return clone(payment);
    return null;
  }

  async payPlanPayment(id: string, paymentId: string, now: Date): Promise<boolean> {
    const payment = this.planPayments.get(id);
    if (!payment || payment.status !== "pending") return false;
    this.planPayments.set(id, { ...payment, status: "paid", paymentId, paidAt: now });
    return true;
  }

  async failPlanPayment(id: string): Promise<void> {
    const payment = this.planPayments.get(id);
    if (payment?.status === "pending") this.planPayments.set(id, { ...payment, status: "failed" });
  }

  async listPlanPayments(input: { clientId?: string; appId?: string; limit: number }): Promise<PlanPayment[]> {
    return [...this.planPayments.values()]
      .filter((p) => (!input.clientId || p.clientId === input.clientId) && (!input.appId || p.appId === input.appId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, input.limit)
      .map(clone);
  }

  async listPlatformSettings(): Promise<PlatformSetting[]> {
    return [...this.platformSettings.values()].map(clone);
  }

  async setPlatformSetting<K extends PlatformSettingKey>(key: K, value: PlatformSettingValues[K] | null, updatedBy: string, now: Date): Promise<void> {
    if (value === null) this.platformSettings.delete(key);
    else this.platformSettings.set(key, clone({ key, value, updatedAt: now, updatedBy }) as PlatformSetting);
  }

  // 23 News & blog

  private articles = new Map<number, Article>();
  private nextArticleId = 1;
  private articleCategories = new Map<number, ArticleCategory>();
  private nextArticleCategoryId = 1;
  private newsSettings = new Map<string, NewsSettings>();

  async listArticles(appId: string): Promise<Article[]> {
    return [...this.articles.values()]
      .filter((a) => a.appId === appId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .map(clone);
  }

  async getArticle(appId: string, id: number): Promise<Article | null> {
    const article = this.articles.get(id);
    return article && article.appId === appId ? clone(article) : null;
  }

  async createArticle(input: ArticleInput, now: Date): Promise<Article> {
    const article: Article = { ...clone(input), id: this.nextArticleId++, createdAt: now, updatedAt: now };
    this.articles.set(article.id, clone(article));
    return article;
  }

  async updateArticle(appId: string, id: number, patch: Partial<ArticleInput>, now: Date): Promise<void> {
    const article = this.articles.get(id);
    if (article && article.appId === appId) this.articles.set(id, clone({ ...article, ...patch, appId, id, updatedAt: now }));
  }

  async deleteArticle(appId: string, id: number): Promise<void> {
    if (this.articles.get(id)?.appId === appId) this.articles.delete(id);
  }

  async listArticleCategories(appId: string): Promise<ArticleCategory[]> {
    return [...this.articleCategories.values()]
      .filter((c) => c.appId === appId)
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map(clone);
  }

  async createArticleCategory(input: Omit<ArticleCategory, "id">): Promise<ArticleCategory> {
    const category: ArticleCategory = { ...clone(input), id: this.nextArticleCategoryId++ };
    this.articleCategories.set(category.id, clone(category));
    return category;
  }

  async updateArticleCategory(appId: string, id: number, patch: Partial<Pick<ArticleCategory, "name" | "position">>): Promise<void> {
    const category = this.articleCategories.get(id);
    if (category && category.appId === appId) this.articleCategories.set(id, clone({ ...category, ...patch }));
  }

  async deleteArticleCategory(appId: string, id: number): Promise<void> {
    if (this.articleCategories.get(id)?.appId !== appId) return;
    this.articleCategories.delete(id);
    for (const article of this.articles.values()) {
      if (article.appId === appId && article.categoryIds.includes(id)) article.categoryIds = article.categoryIds.filter((c) => c !== id);
    }
  }

  async getNewsSettings(appId: string): Promise<NewsSettings | null> {
    const settings = this.newsSettings.get(appId);
    return settings ? clone(settings) : null;
  }

  async saveNewsSettings(appId: string, settings: NewsSettings, now: Date): Promise<void> {
    void now;
    this.newsSettings.set(appId, clone(settings));
  }

  // 10.7 Listings

  private listings = new Map<number, Listing>();
  private nextListingId = 1;
  private listingSettings = new Map<string, ListingSettings>();
  private listingFavorites: ListingFavorite[] = [];
  private listingInquiries = new Map<number, ListingInquiry>();
  private listingMessages = new Map<number, ListingInquiryMessage>();
  private nextListingInquiryId = 1;

  /** Called when a hosted user is deleted: their favorites and conversations go with them, as in MySQL. */
  private forgetListingUser(appId: string, userId: number): void {
    this.listingFavorites = this.listingFavorites.filter((f) => !(f.appId === appId && f.userId === userId));
    for (const [id, inquiry] of this.listingInquiries) {
      if (inquiry.appId !== appId || inquiry.userId !== userId) continue;
      this.listingInquiries.delete(id);
      for (const [messageId, message] of this.listingMessages) if (message.inquiryId === id) this.listingMessages.delete(messageId);
    }
  }

  async listListings(appId: string): Promise<Listing[]> {
    return [...this.listings.values()]
      .filter((l) => l.appId === appId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .map(clone);
  }

  async getListing(appId: string, id: number): Promise<Listing | null> {
    const listing = this.listings.get(id);
    return listing && listing.appId === appId ? clone(listing) : null;
  }

  async createListing(input: ListingInput, now: Date): Promise<Listing> {
    const listing: Listing = { ...clone(input), id: this.nextListingId++, createdAt: now, updatedAt: now };
    this.listings.set(listing.id, clone(listing));
    return listing;
  }

  async updateListing(appId: string, id: number, patch: Partial<ListingInput>, now: Date): Promise<void> {
    const listing = this.listings.get(id);
    if (listing && listing.appId === appId) this.listings.set(id, clone({ ...listing, ...patch, appId, id, updatedAt: now }));
  }

  async getListingSettings(appId: string): Promise<ListingSettings | null> {
    const settings = this.listingSettings.get(appId);
    return settings ? clone(settings) : null;
  }

  async saveListingSettings(appId: string, settings: ListingSettings, now: Date): Promise<void> {
    void now; // Kept with the row in MySQL only.
    this.listingSettings.set(appId, clone(settings));
  }

  async addListingFavorite(favorite: ListingFavorite): Promise<void> {
    const exists = this.listingFavorites.some(
      (f) => f.appId === favorite.appId && f.userId === favorite.userId && f.listingId === favorite.listingId,
    );
    if (!exists) this.listingFavorites.push(clone(favorite));
  }

  async removeListingFavorite(appId: string, userId: number, listingId: number): Promise<void> {
    this.listingFavorites = this.listingFavorites.filter((f) => !(f.appId === appId && f.userId === userId && f.listingId === listingId));
  }

  async listListingFavorites(appId: string, userId: number): Promise<ListingFavorite[]> {
    return this.listingFavorites
      .filter((f) => f.appId === appId && f.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.listingId - a.listingId)
      .map(clone);
  }

  async createListingInquiry(input: Omit<ListingInquiry, "id">): Promise<ListingInquiry> {
    const inquiry: ListingInquiry = { ...clone(input), id: this.nextListingInquiryId++ };
    this.listingInquiries.set(inquiry.id, clone(inquiry));
    return inquiry;
  }

  async getListingInquiry(appId: string, id: number): Promise<ListingInquiry | null> {
    const inquiry = this.listingInquiries.get(id);
    return inquiry && inquiry.appId === appId ? clone(inquiry) : null;
  }

  async findOpenListingInquiry(appId: string, userId: number, listingId: number): Promise<ListingInquiry | null> {
    const open = [...this.listingInquiries.values()]
      .filter((i) => i.appId === appId && i.userId === userId && i.listingId === listingId && i.status === "open")
      .sort((a, b) => b.id - a.id);
    return open[0] ? clone(open[0]) : null;
  }

  async updateListingInquiry(appId: string, id: number, patch: Partial<Pick<ListingInquiry, "status" | "updatedAt">>): Promise<void> {
    const inquiry = this.listingInquiries.get(id);
    if (inquiry && inquiry.appId === appId) this.listingInquiries.set(id, clone({ ...inquiry, ...patch }));
  }

  async addListingInquiryMessage(input: Omit<ListingInquiryMessage, "id" | "readAt">): Promise<ListingInquiryMessage> {
    const message: ListingInquiryMessage = { ...clone(input), id: this.nextListingInquiryId++, readAt: null };
    this.listingMessages.set(message.id, clone(message));
    const inquiry = this.listingInquiries.get(input.inquiryId);
    if (inquiry && inquiry.appId === input.appId) inquiry.updatedAt = input.createdAt;
    return message;
  }

  async listListingInquiryMessages(appId: string, inquiryId: number): Promise<ListingInquiryMessage[]> {
    return [...this.listingMessages.values()]
      .filter((m) => m.appId === appId && m.inquiryId === inquiryId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
      .map(clone);
  }

  async markListingInquiryRead(appId: string, inquiryId: number, from: "user" | "office", now: Date): Promise<void> {
    for (const message of this.listingMessages.values()) {
      if (message.appId === appId && message.inquiryId === inquiryId && message.from === from && !message.readAt) message.readAt = now;
    }
  }

  async listListingInquiries(input: {
    appId: string;
    userId?: number;
    status?: ListingInquiryStatus;
    offset: number;
    limit: number;
  }): Promise<{ items: ListingInquiryRow[]; total: number }> {
    const all = [...this.listingInquiries.values()]
      .filter((i) => i.appId === input.appId && (input.userId === undefined || i.userId === input.userId) && (!input.status || i.status === input.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id);
    const rows = all.slice(input.offset, input.offset + input.limit).map((inquiry): ListingInquiryRow => {
      const messages = [...this.listingMessages.values()]
        .filter((m) => m.inquiryId === inquiry.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);
      return {
        ...clone(inquiry),
        lastMessage: messages.length ? clone(messages[messages.length - 1]!) : null,
        unreadByUser: messages.filter((m) => m.from === "office" && !m.readAt).length,
        unreadByOffice: messages.filter((m) => m.from === "user" && !m.readAt).length,
      };
    });
    return { items: rows, total: all.length };
  }

  async countUnreadListingInquiries(appId: string): Promise<number> {
    const unread = new Set<number>();
    for (const message of this.listingMessages.values()) {
      if (message.appId === appId && message.from === "user" && !message.readAt) unread.add(message.inquiryId);
    }
    return unread.size;
  }

  // 10.4 Pages, looks and languages
  private appLayouts = new Map<string, AppLayoutRecord>();

  async getAppLayout(appId: string): Promise<AppLayoutRecord | null> {
    const layout = this.appLayouts.get(appId);
    return layout ? clone(layout) : null;
  }

  async saveAppLayout(layout: AppLayoutRecord): Promise<void> {
    this.appLayouts.set(layout.appId, clone(layout));
  }

  // 11.7 Admin team and audit log
  private adminMembers = new Map<string, AdminMember>();
  private auditEntries: AuditEntry[] = [];

  async listAdminMembers(): Promise<AdminMemberRow[]> {
    const rows: AdminMemberRow[] = [];
    for (const member of [...this.adminMembers.values()].sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime())) {
      const user = this.users.get(member.userId);
      if (user) rows.push({ member: clone(member), user: clone(user) });
    }
    return rows;
  }

  async getAdminMember(userId: string): Promise<AdminMember | null> {
    const member = this.adminMembers.get(userId);
    return member && this.users.has(userId) ? clone(member) : null;
  }

  async saveAdminMember(member: AdminMember): Promise<void> {
    this.adminMembers.set(member.userId, clone(member));
  }

  async deleteAdminMember(userId: string): Promise<void> {
    this.adminMembers.delete(userId);
  }

  async createAuditEntry(entry: Omit<AuditEntry, "id">): Promise<AuditEntry> {
    const saved: AuditEntry = { ...clone(entry), id: this.auditEntries.length + 1 };
    this.auditEntries.push(saved);
    return clone(saved);
  }

  async listAuditEntries(query: AuditQuery): Promise<{ items: AuditEntry[]; total: number }> {
    const actor = query.actor?.toLowerCase();
    const matches = this.auditEntries
      .filter(
        (e) =>
          (!actor || e.actorEmail.toLowerCase().includes(actor)) &&
          (!query.action || e.action === query.action) &&
          (!query.targetType || e.targetType === query.targetType) &&
          (!query.targetId || e.targetId === query.targetId) &&
          (!query.clientId || e.clientId === query.clientId) &&
          (!query.from || e.at.getTime() >= query.from.getTime()) &&
          (!query.to || e.at.getTime() < query.to.getTime()),
      )
      .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id - a.id);
    return { items: matches.slice(query.offset, query.offset + query.limit).map(clone), total: matches.length };
  }

  // 11.1 Overview
  async listApps(): Promise<App[]> {
    return [...this.apps.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map(clone);
  }

  async listBuildsSince(since: Date): Promise<Build[]> {
    return [...this.builds.values()]
      .filter((b) => b.createdAt.getTime() >= since.getTime())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(clone);
  }

  async listPaidPlanPaymentsSince(since: Date): Promise<PlanPayment[]> {
    return [...this.planPayments.values()].filter((p) => p.status === "paid" && p.paidAt && p.paidAt.getTime() >= since.getTime()).map(clone);
  }

  async listMarketplaceOrdersSince(since: Date): Promise<CatalogOrder[]> {
    return [...this.catalogOrders.values()]
      .filter((o) => o.commissionCents !== null && o.paidAt !== null && o.paidAt.getTime() >= since.getTime())
      .map(clone);
  }

  async countHostedUsersByApp(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const user of this.hostedUsers.values()) counts[user.appId] = (counts[user.appId] ?? 0) + 1;
    return counts;
  }

  // 11.2 Client page
  async listHostedUsers(input: { appId: string; query?: string; offset: number; limit: number }): Promise<{ items: HostedUser[]; total: number }> {
    const q = input.query?.trim().toLowerCase();
    const matches = [...this.hostedUsers.values()]
      .filter(
        (u) =>
          u.appId === input.appId &&
          (!q || u.name.toLowerCase().includes(q) || (u.phone ?? "").includes(q) || (u.email ?? "").toLowerCase().includes(q)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
    return { items: matches.slice(input.offset, input.offset + input.limit).map(clone), total: matches.length };
  }


  // 11.3 Website content
  private siteContent = new Map<string, SiteContentRecord>();

  async listSiteContent(): Promise<SiteContentRecord[]> {
    return [...this.siteContent.values()].map(clone);
  }

  async getSiteContent(key: string): Promise<SiteContentRecord | null> {
    const record = this.siteContent.get(key);
    return record ? clone(record) : null;
  }

  async setSiteContent(key: string, fields: Record<string, string> | null, updatedBy: string, now: Date): Promise<void> {
    if (fields === null) this.siteContent.delete(key);
    else this.siteContent.set(key, clone({ key, fields, updatedAt: now, updatedBy }));
  }

  // 11.4 Email templates
  private emailTemplates = new Map<string, EmailTemplateRecord>();

  async listEmailTemplates(): Promise<EmailTemplateRecord[]> {
    return [...this.emailTemplates.values()].map(clone);
  }

  async getEmailTemplate(key: string): Promise<EmailTemplateRecord | null> {
    const record = this.emailTemplates.get(key);
    return record ? clone(record) : null;
  }

  async setEmailTemplate(key: string, template: { subject: string; body: string } | null, updatedBy: string, now: Date): Promise<void> {
    if (template === null) this.emailTemplates.delete(key);
    else this.emailTemplates.set(key, { key, subject: template.subject, body: template.body, updatedAt: now, updatedBy });
  }

  // 11.6 Coupons
  private coupons = new Map<string, Coupon>();
  private couponRedemptions: CouponRedemption[] = [];

  private codeTaken(code: string, exceptId: string | null): boolean {
    for (const coupon of this.coupons.values()) if (coupon.code === code && coupon.id !== exceptId) return true;
    return false;
  }

  async createCoupon(coupon: Coupon): Promise<boolean> {
    if (this.codeTaken(coupon.code, null)) return false;
    this.coupons.set(coupon.id, clone(coupon));
    return true;
  }

  async updateCoupon(id: string, patch: CouponPatch, now: Date): Promise<boolean> {
    const coupon = this.coupons.get(id);
    if (!coupon) return true;
    if (patch.code !== undefined && this.codeTaken(patch.code, id)) return false;
    this.coupons.set(id, clone({ ...coupon, ...patch, updatedAt: now }));
    return true;
  }

  async getCoupon(id: string): Promise<Coupon | null> {
    const coupon = this.coupons.get(id);
    return coupon ? clone(coupon) : null;
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    for (const coupon of this.coupons.values()) if (coupon.code === code) return clone(coupon);
    return null;
  }

  async listCoupons(): Promise<Coupon[]> {
    return [...this.coupons.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(clone);
  }

  async createCouponRedemption(redemption: CouponRedemption): Promise<void> {
    this.couponRedemptions.push(clone(redemption));
  }

  async settleCouponRedemption(paymentId: string, status: "redeemed" | "failed", now: Date): Promise<void> {
    for (const r of this.couponRedemptions) {
      if (r.paymentId === paymentId && r.status === "pending") {
        r.status = status;
        r.redeemedAt = status === "redeemed" ? now : null;
      }
    }
  }

  async listCouponRedemptions(input: { couponId?: string; clientId?: string }): Promise<CouponRedemption[]> {
    return this.couponRedemptions
      .filter((r) => (input.couponId === undefined || r.couponId === input.couponId) && (input.clientId === undefined || r.clientId === input.clientId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(clone);
  }

  // 11.8 Announcements
  private announcements = new Map<string, Announcement>();
  private announcementDismissals = new Map<string, Set<string>>();

  async createAnnouncement(announcement: Announcement): Promise<void> {
    this.announcements.set(announcement.id, clone(announcement));
  }

  async updateAnnouncement(id: string, patch: AnnouncementPatch, now: Date): Promise<void> {
    const announcement = this.announcements.get(id);
    if (announcement) this.announcements.set(id, clone({ ...announcement, ...patch, updatedAt: now }));
  }

  async deleteAnnouncement(id: string): Promise<void> {
    this.announcements.delete(id);
    for (const dismissed of this.announcementDismissals.values()) dismissed.delete(id);
  }

  async getAnnouncement(id: string): Promise<Announcement | null> {
    const announcement = this.announcements.get(id);
    return announcement ? clone(announcement) : null;
  }

  async listAnnouncements(): Promise<Announcement[]> {
    return [...this.announcements.values()].sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()).map(clone);
  }

  async dismissAnnouncement(input: { announcementId: string; clientId: string; now: Date }): Promise<void> {
    if (!this.announcements.has(input.announcementId)) return;
    const dismissed = this.announcementDismissals.get(input.clientId) ?? new Set<string>();
    dismissed.add(input.announcementId);
    this.announcementDismissals.set(input.clientId, dismissed);
  }

  async listDismissedAnnouncementIds(clientId: string): Promise<string[]> {
    return [...(this.announcementDismissals.get(clientId) ?? [])];
  }

  // 14.1 We publish for you
  private publishingRequests = new Map<string, PublishingRequest>();
  private publishingEvents: PublishingEvent[] = [];
  private nextPublishingEventId = 1;

  async getPublishingRequest(appId: string): Promise<PublishingRequest | null> {
    const request = this.publishingRequests.get(appId);
    return request ? clone(request) : null;
  }

  async savePublishingRequest(request: PublishingRequest): Promise<void> {
    // Like the foreign keys: only for an existing app of that client.
    const app = this.apps.get(request.appId);
    if (!app || app.clientId !== request.clientId) throw new Error("Unknown app");
    this.publishingRequests.set(request.appId, clone(request));
  }

  async listManagedPublishingRequests(): Promise<PublishingRequest[]> {
    return [...this.publishingRequests.values()]
      .filter((r) => r.mode === "managed" && this.apps.has(r.appId))
      .sort((a, b) => (a.requestedAt?.getTime() ?? 0) - (b.requestedAt?.getTime() ?? 0))
      .map(clone);
  }

  async addPublishingEvent(event: Omit<PublishingEvent, "id">): Promise<PublishingEvent> {
    const saved = { ...event, id: this.nextPublishingEventId++ };
    this.publishingEvents.push(clone(saved));
    return saved;
  }

  async listPublishingEvents(appId: string): Promise<PublishingEvent[]> {
    return this.publishingEvents
      .filter((e) => e.appId === appId)
      .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id - a.id)
      .map(clone);
  }

  // 13 Plans, limits and owner notices
  private ownerNotices = new Map<number, OwnerNotice>();
  private nextOwnerNoticeId = 1;

  async listLicenses(): Promise<License[]> {
    return [...this.licenses.values()].map(clone);
  }

  async createOwnerNotice(notice: Omit<OwnerNotice, "id">): Promise<OwnerNotice | null> {
    for (const existing of this.ownerNotices.values()) {
      if (existing.appId === notice.appId && existing.dedupeKey === notice.dedupeKey) return null;
    }
    const saved: OwnerNotice = { ...notice, id: this.nextOwnerNoticeId++ };
    this.ownerNotices.set(saved.id, clone(saved));
    return clone(saved);
  }

  async listOwnerNotices(input: { clientId: string; appId?: string; open?: boolean; limit?: number }): Promise<OwnerNotice[]> {
    return [...this.ownerNotices.values()]
      .filter(
        (n) =>
          n.clientId === input.clientId &&
          (input.appId === undefined || n.appId === input.appId) &&
          (!input.open || (n.dismissedAt === null && n.resolvedAt === null)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .slice(0, input.limit ?? 100)
      .map(clone);
  }

  async countOwnerNotices(appId: string, kind: OwnerNoticeKind): Promise<number> {
    return [...this.ownerNotices.values()].filter((n) => n.appId === appId && n.kind === kind).length;
  }

  async updateOwnerNotice(clientId: string, id: number, patch: OwnerNoticePatch): Promise<void> {
    const notice = this.ownerNotices.get(id);
    if (notice && notice.clientId === clientId) this.ownerNotices.set(id, clone({ ...notice, ...patch }));
  }

  async resolveOwnerNotices(appId: string, kinds: OwnerNoticeKind[], now: Date): Promise<void> {
    for (const [id, notice] of this.ownerNotices) {
      if (notice.appId === appId && kinds.includes(notice.kind) && notice.resolvedAt === null) this.ownerNotices.set(id, { ...notice, resolvedAt: now });
    }
  }

  // 16 Demo apps
  async purgeDemoActivity(appId: string, before: Date): Promise<DemoPurgeCounts> {
    const old = (date: Date) => date.getTime() < before.getTime();
    const counts: DemoPurgeCounts = { orders: 0, appointments: 0, inquiries: 0, favorites: 0, enrollments: 0, progress: 0, devices: 0, notifications: 0 };
    for (const [id, order] of this.catalogOrders) {
      if (order.appId === appId && old(order.createdAt)) {
        this.catalogOrders.delete(id);
        counts.orders++;
      }
    }
    for (const [id, appointment] of this.bookingAppointments) {
      if (appointment.appId === appId && old(appointment.createdAt)) {
        this.bookingAppointments.delete(id);
        counts.appointments++;
      }
    }
    for (const [id, inquiry] of this.listingInquiries) {
      if (inquiry.appId !== appId || !old(inquiry.createdAt)) continue;
      this.listingInquiries.delete(id);
      for (const [messageId, message] of this.listingMessages) if (message.inquiryId === id) this.listingMessages.delete(messageId);
      counts.inquiries++;
    }
    const favorites = this.listingFavorites.length;
    this.listingFavorites = this.listingFavorites.filter((f) => !(f.appId === appId && old(f.createdAt)));
    counts.favorites = favorites - this.listingFavorites.length;
    const enrollments = this.courseEnrollments.length;
    this.courseEnrollments = this.courseEnrollments.filter((e) => !(e.appId === appId && old(e.enrolledAt)));
    counts.enrollments = enrollments - this.courseEnrollments.length;
    for (const [key, progress] of this.lessonProgress) {
      if (progress.appId === appId && old(progress.updatedAt)) {
        this.lessonProgress.delete(key);
        counts.progress++;
      }
    }
    for (const [id, notification] of this.hostedNotifications) {
      if (notification.appId === appId && notification.userId !== null && old(notification.createdAt)) {
        this.hostedNotifications.delete(id);
        counts.notifications++;
      }
    }
    for (const device of [...this.hostedDevices.values()]) {
      if (device.appId === appId && old(device.lastSeenAt)) {
        await this.deleteHostedDevice(appId, device.id);
        counts.devices++;
      }
    }
    return counts;
  }
}
