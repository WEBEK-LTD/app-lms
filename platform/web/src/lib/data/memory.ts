import { clientAccountState, longestLicense } from "../license/status";
import { newId } from "../crypto/tokens";
import { membershipActive, membershipFreezeSet, membershipToUse } from "../bookings/memberships";
import type { AnalyticsDailyRecord, AnalyticsDailyRow, AnalyticsEventRow, AnalyticsMetric } from "../analytics/types";
import type { AppAuthKey, AppLayoutRecord, AppLayoutVersion, AppLayoutVersionSummary, OwnFont, PendingPayment, SavedSection, StudioTemplate, StoreProduct, StorePurchaseRecord, StorePurchaseEvent, StoreBillingItem, BillingSession } from "./types";
import type { CampaignSend, HostedCart, HostedOrderWatch, NotificationCampaign, NotificationCampaignPatch, NotificationCampaignStatus } from "./types";
import type { LoyaltyEntry, LoyaltyReason } from "./types";
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
  AdminMember,
  AdminMemberRow,
  AuditEntry,
  AuditQuery,
} from "./types";
// 11.3, 11.4, 11.6 and 11.8
import type { Announcement, AnnouncementPatch, Coupon, CouponPatch, CouponRedemption, EmailTemplateRecord, SiteContentRecord } from "./types";
// 23 News & blog
import type { Article, ArticleCategory, ArticleInput, NewsSettings } from "./types";
// 28 Events & tickets
import type { CheckInResult, EventInput, EventRecord, EventSettings, EventTicket, TicketClaim, TicketClaimRefusal, TicketType, TicketTypeInput } from "./types";
// 29 Charity & donations
import type { Campaign, CampaignInput, Donation, DonationInput, DonationPatch, DonationSettings, DonationStatus } from "./types";
import type { Courier, CourierInput, CourierPatch, DeliveryService, DeliveryServiceInput, DeliverySettings, Shipment, ShipmentInput, ShipmentPatch, ShipmentQuery, ShipmentStatus } from "./types";
// 10.7 Listings
import type { Listing, ListingFavorite, ListingInput, ListingInquiry, ListingInquiryMessage, ListingInquiryRow, ListingInquiryStatus, ListingSettings } from "./types";
import type { PublishingEvent, PublishingRequest } from "./types";
import type { ChatConversation, ChatConversationKind, ChatConversationPatch, ChatMember, ChatMemberSource, ChatMessage, ChatParticipant, ChatReport, ChatReportOutcome, ChatSession, ChatUploadInfo } from "./types";
import type { AppError, ClientMilestone, JobRun, MilestoneKind, ProductDay, RekeyCell, TeamAlert, TeamAlertKind, WatchedJob } from "./types";
import { candidatesIn, needsRekey } from "../crypto/rekey";
import type { OwnerDevice, OwnerDevicePatch } from "./types";
import type { TeamActivity, TeamInvitation, TeamInvitationPatch, TeamMember, TeamMemberRow } from "./types";
import type { BookingAppointmentMove, PaidTotals, ScheduledNotification, ScheduledNotificationPatch, ScheduledNotificationStatus } from "./types";
import type { DemoPurgeCounts } from "./types";
import type { AccountDeletionClose, AccountDeletionRequest, AccountDeletionStatus } from "./types";
import type { AppDeletion, AppDeletionStatus, KeptBillingRecord } from "./types";
import { assetIdsIn } from "./asset-ids";
import type { CourseAnswer, CourseAnswerInput, CourseQuestion, CourseQuestionInput, CourseQuestionStatus, CourseReview, CourseReviewPatch, MemberCheckIn } from "./types";
// 46 Links and crash reports
import type { AppLinkTarget, CrashIssue, CrashIssueStatus, CrashReportInput } from "./types";
import type { ApiWebhook, ApiWebhookEvent, ApiWebhookPatch } from "./types";
import type { PaymentRefund, RefundKind } from "./types";
import type { CouponClaimLimits, UserSession, UserTwoFactor } from "./types";
import { mergeCrash } from "../crashes/report";
// 51 Media and storage
import type { MediaFile, MediaFilePatch, MediaKind, MediaStatus, StoragePack, StoragePackPatch } from "./types";

const clone = <T>(value: T): T => structuredClone(value);

/** 79.2 Where each listed cell of a store is, to write it back (kept out of the store's own fields). */
const rekeySlots = new WeakMap<object, Map<string, { get(): unknown; set(text: string): void }>>();
const slotId = (cell: Pick<RekeyCell, "table" | "key" | "column">) => `${cell.table}|${cell.key}|${cell.column}`;

/** 64 The same instant, or both missing (a null-safe comparison, as `<=>`). */
const sameTime = (a: Date | null, b: Date | null): boolean => (a === null || b === null ? a === b : a.getTime() === b.getTime());

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
  // 34
  private appAuthKeys = new Map<string, AppAuthKey>();
  private hostedChallenges = new Map<string, HostedChallenge>();
  private hostedNotifications = new Map<number, HostedNotification>();
  private notificationRecipients = new Map<number, Set<number>>();
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
  // 27 Classes and memberships
  private classSessions = new Map<number, ClassSession>();
  private classBookings = new Map<number, ClassBooking>();
  private memberships = new Map<number, Membership>();
  private nextClassId = 1;
  private courseEnrollments: CourseEnrollment[] = [];
  private lessonProgress = new Map<string, LessonProgress>();
  // 90.1
  private quizAttempts: QuizAttempt[] = [];
  private catalogCoupons: CatalogCoupon[] = [];
  // 44 Analytics: raw events, and daily totals keyed by app, day, metric and key.
  private analyticsEvents: AnalyticsEventRow[] = [];
  private analyticsDaily = new Map<string, AnalyticsDailyRecord & { appId: string }>();

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
      language: null,
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
    const licenses = this.liveLicenses().filter((l) => l.clientId === client.id);
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
      const state = clientAccountState(client, this.liveLicenses().filter((l) => l.clientId === client.id), now);
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

  /** 73 Licenses of apps that aren't deleted (and those given before the first app). */
  private liveLicenses(): License[] {
    return [...this.licenses.values()].filter((l) => l.appId === null || !this.deletedApps.has(l.appId));
  }

  async getLicenseForApp(clientId: string, appId: string | null): Promise<License | null> {
    for (const license of this.liveLicenses()) {
      if (license.clientId === clientId && license.appId === appId) return clone(license);
    }
    return null;
  }

  async listLicensesByClient(clientId: string): Promise<License[]> {
    return this.liveLicenses()
      .filter((l) => l.clientId === clientId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone);
  }

  async getLicenseByHash(keyHash: string): Promise<License | null> {
    for (const license of this.liveLicenses()) {
      if (license.keyHash === keyHash) return clone(license);
    }
    return null;
  }

  async updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void> {
    const license = this.licenses.get(id);
    if (license) this.licenses.set(id, clone({ ...license, ...patch, updatedAt: now }));
  }

  async listLicensesEndedBetween(from: Date, to: Date): Promise<License[]> {
    return this.liveLicenses()
      .filter((l) => l.appId !== null && l.expiresAt.getTime() > from.getTime() && l.expiresAt.getTime() <= to.getTime())
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
      .map(clone);
  }

  async claimLicenseEndRefresh(licenseId: string, expiresAt: Date, now: Date): Promise<boolean> {
    const license = this.licenses.get(licenseId);
    if (!license || license.expiresAt.getTime() !== expiresAt.getTime() || expiresAt.getTime() > now.getTime()) return false;
    if (license.endRefreshedFor && license.endRefreshedFor.getTime() === expiresAt.getTime()) return false;
    this.licenses.set(licenseId, clone({ ...license, endRefreshedFor: new Date(expiresAt) }));
    return true;
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
          store: activation.store,
          bookings: activation.bookings,
          lastCheckedAt: activation.lastCheckedAt,
        }
      : activation;
    this.activations.set(activation.licenseId, clone(next));
    return { ok: true, activation: clone(next) };
  }

  async touchActivation(
    licenseId: string,
    patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "store" | "bookings" | "lastCheckedAt">,
  ): Promise<void> {
    const activation = this.activations.get(licenseId);
    if (activation) this.activations.set(licenseId, clone({ ...activation, ...patch }));
  }

  async deleteActivation(licenseId: string): Promise<void> {
    this.activations.delete(licenseId);
  }

  async createApp(app: App): Promise<void> {
    if (this.apps.has(app.id) || this.deletedApps.has(app.id)) throw new Error("Duplicate app ID");
    // 103R.3 A Studio project is on Studio's own plans: only the first regular app takes what came before it.
    const first = app.section !== "studio" && this.appsOf(app.clientId).every((a) => a.section === "studio");
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

  async listAssetsByClient(clientId: string): Promise<Asset[]> {
    return [...this.assets.values()].filter((a) => a.clientId === clientId).map(clone);
  }

  async deleteAsset(id: string): Promise<void> {
    this.assets.delete(id);
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
    // 27 Spots in classes stay counted; memberships go with the account.
    for (const booking of this.classBookings.values()) {
      if (booking.appId === appId && booking.userId === id) booking.userId = null;
    }
    for (const [key, m] of this.memberships) if (m.appId === appId && m.userId === id) this.memberships.delete(key);
    // 63 Their check-ins, reviews, questions and answers go with the account, as in the database.
    for (const [key, c] of this.memberCheckIns) if (c.appId === appId && c.userId === id) this.memberCheckIns.delete(key);
    for (const [key, r] of this.courseReviews) if (r.appId === appId && r.userId === id) this.courseReviews.delete(key);
    for (const [key, q] of this.courseQuestions) if (q.appId === appId && q.userId === id) this.deleteQuestion(key);
    for (const [key, a] of this.courseAnswers) if (a.appId === appId && a.userId === id) this.courseAnswers.delete(key);
    // 91.4 Their points go with the account.
    this.loyaltyBalances.delete(`${appId}:${id}`);
    this.loyaltyEntries = this.loyaltyEntries.filter((e) => !(e.appId === appId && e.userId === id));
    // 28 Tickets stay with the organiser, with their holder's name.
    for (const ticket of this.tickets.values()) {
      if (ticket.appId === appId && ticket.userId === id) ticket.userId = null;
    }
    // 29 So do donations, with the charity.
    for (const donation of this.donations.values()) {
      if (donation.appId === appId && donation.userId === id) donation.userId = null;
    }
    // 104 And shipments, with the delivery company.
    for (const shipment of this.shipments.values()) {
      if (shipment.appId === appId && shipment.userId === id) shipment.userId = null;
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

  async listAppHostedDevices(appId: string): Promise<HostedDevice[]> {
    return [...this.hostedDevices.values()].filter((d) => d.appId === appId).map(clone);
  }

  async listHostedUserIds(appId: string): Promise<{ id: number; createdAt: Date }[]> {
    return [...this.hostedUsers.values()].filter((u) => u.appId === appId).map((u) => ({ id: u.id, createdAt: new Date(u.createdAt) }));
  }

  async listAudienceUserIds(input: { appId: string; who: "buyers" | "students" | "members"; courseId?: number | null; now: Date }): Promise<number[]> {
    const ids = new Set<number>();
    if (input.who === "buyers") {
      for (const o of this.catalogOrders.values()) if (o.appId === input.appId && o.userId !== null && o.paidAt) ids.add(o.userId);
    } else if (input.who === "students") {
      for (const e of this.courseEnrollments) if (e.appId === input.appId && (input.courseId == null || e.courseId === input.courseId)) ids.add(e.userId);
    } else {
      for (const m of this.memberships.values()) {
        if (m.appId === input.appId && m.status === "active" && (m.endsAt === null || m.endsAt > input.now)) ids.add(m.userId);
      }
    }
    return [...ids].sort((a, b) => a - b);
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
          n.appId === appId &&
          (n.userId === userId || (n.userId === null && (!n.targeted || this.notificationRecipients.get(n.id)?.has(userId) === true))) &&
          n.createdAt.getTime() > after.getTime(),
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

  async addHostedNotificationRecipients(appId: string, notificationId: number, userIds: number[]): Promise<void> {
    const n = this.hostedNotifications.get(notificationId);
    if (!n || n.appId !== appId) return;
    const set = this.notificationRecipients.get(notificationId) ?? new Set<number>();
    for (const id of userIds) set.add(id);
    this.notificationRecipients.set(notificationId, set);
  }

  async listHostedBroadcasts(appId: string, limit: number): Promise<HostedNotification[]> {
    return [...this.hostedNotifications.values()]
      .filter((n) => n.appId === appId && n.userId === null && !n.targeted)
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

  // 34 Keys that sign own API apps' access tokens

  async listAppAuthKeys(appId: string): Promise<AppAuthKey[]> {
    return [...this.appAuthKeys.values()]
      .filter((k) => k.appId === appId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.kid.localeCompare(a.kid))
      .map(clone);
  }

  async createAppAuthKey(key: AppAuthKey): Promise<void> {
    this.appAuthKeys.set(key.kid, clone(key));
  }

  async retireAppAuthKeys(appId: string, now: Date): Promise<void> {
    for (const key of this.appAuthKeys.values()) {
      if (key.appId === appId && key.retiredAt === null) {
        key.retiredAt = new Date(now);
        key.privateKeyEncrypted = null;
      }
    }
  }

  async deleteAppAuthKeysRetiredBefore(appId: string, before: Date): Promise<void> {
    for (const [kid, key] of this.appAuthKeys) {
      if (key.appId === appId && key.retiredAt !== null && key.retiredAt < before) this.appAuthKeys.delete(kid);
    }
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

  async listCatalogCoupons(appId: string): Promise<CatalogCoupon[]> {
    return this.catalogCoupons.filter((c) => c.appId === appId).map(clone).sort((a, b) => b.id - a.id);
  }

  async getCatalogCouponByCode(appId: string, code: string): Promise<CatalogCoupon | null> {
    const found = this.catalogCoupons.find((c) => c.appId === appId && c.code === code);
    return found ? clone(found) : null;
  }

  async createCatalogCoupon(input: Omit<CatalogCoupon, "id" | "usedCount">): Promise<CatalogCoupon | null> {
    if (this.catalogCoupons.some((c) => c.appId === input.appId && c.code === input.code)) return null;
    const coupon: CatalogCoupon = { ...clone(input), id: this.catalogCoupons.length + 1, usedCount: 0 };
    this.catalogCoupons.push(coupon);
    return clone(coupon);
  }

  async setCatalogCouponActive(appId: string, id: number, active: boolean): Promise<void> {
    const found = this.catalogCoupons.find((c) => c.appId === appId && c.id === id);
    if (found) found.active = active;
  }

  async deleteCatalogCoupon(appId: string, id: number): Promise<void> {
    this.catalogCoupons = this.catalogCoupons.filter((c) => !(c.appId === appId && c.id === id));
  }

  async useCatalogCoupon(appId: string, id: number): Promise<boolean> {
    const found = this.catalogCoupons.find((c) => c.appId === appId && c.id === id);
    if (!found || (found.maxUses !== null && found.usedCount >= found.maxUses)) return false;
    found.usedCount += 1;
    return true;
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
      // 91.5 And the variation's own stock.
      const variant = line.variantId !== undefined ? product.variants?.items.find((v) => v.id === line.variantId) : undefined;
      if (variant && variant.stock !== null) variant.stock = Math.max(0, variant.stock - line.quantity);
    }
    return true;
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
    const all = [...this.catalogOrders.values()]
      .filter(
        (o) =>
          o.appId === input.appId &&
          (input.userId === undefined || o.userId === input.userId) &&
          (!input.statuses || input.statuses.includes(o.status) || (input.awaitingManual === true && o.status === "pending" && Boolean(o.manualPayment))) &&
          (!input.manualOnly || Boolean(o.manualPayment)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
    return { items: all.slice(input.offset, input.offset + input.limit).map(clone), total: all.length };
  }

  // 47 Refunds

  private refunds = new Map<number, PaymentRefund>();
  private nextRefundId = 1;

  async recordRefund(input: Omit<PaymentRefund, "id">): Promise<PaymentRefund | null> {
    const now = input.createdAt;
    if (input.kind === "order") {
      const order = this.catalogOrders.get(input.targetId);
      if (!order || order.appId !== input.appId) return null;
      const refunded = (order.refundedCents ?? 0) + input.amountCents;
      if (input.amountCents <= 0 || refunded > order.totalCents) return null;
      order.refundedCents = refunded;
      if (refunded === order.totalCents) order.status = "refunded";
      if (order.commissionCents !== null && input.commissionCents) order.commissionCents = Math.max(0, order.commissionCents - input.commissionCents);
      order.updatedAt = now;
    } else {
      const donation = this.donations.get(input.targetId);
      if (!donation || donation.appId !== input.appId || (donation.status !== "paid" && donation.status !== "refunded")) return null;
      const refunded = (donation.refundedCents ?? 0) + input.amountCents;
      if (input.amountCents <= 0 || refunded > donation.amountCents) return null;
      const full = refunded === donation.amountCents;
      const campaign = donation.campaignId !== null ? this.campaigns.get(donation.campaignId) : undefined;
      if (campaign) {
        campaign.raisedCents = Math.max(0, campaign.raisedCents - input.amountCents);
        const another =
          donation.donorEmail !== null &&
          [...this.donations.values()].some(
            (d) => d.id !== donation.id && d.appId === donation.appId && d.campaignId === donation.campaignId && d.status === "paid" && d.donorEmail === donation.donorEmail,
          );
        if (full && !another) campaign.donorCount = Math.max(0, campaign.donorCount - 1);
      }
      Object.assign(donation, { refundedCents: refunded, updatedAt: now, ...(full ? { status: "refunded" } : {}) });
    }
    const refund: PaymentRefund = { ...clone(input), id: this.nextRefundId++ };
    this.refunds.set(refund.id, clone(refund));
    return refund;
  }

  async listRefunds(appId: string, kind: RefundKind, targetIds: number[]): Promise<PaymentRefund[]> {
    return [...this.refunds.values()]
      .filter((r) => r.appId === appId && r.kind === kind && targetIds.includes(r.targetId))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
      .map(clone);
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

  async moveBookingAppointment(appId: string, id: number, move: BookingAppointmentMove): Promise<boolean> {
    const appointment = this.bookingAppointments.get(id);
    if (!appointment || appointment.appId !== appId || !ACTIVE_BOOKING_STATUSES.includes(appointment.status)) return false;
    for (const other of this.bookingAppointments.values()) {
      if (
        other.id !== id &&
        other.appId === appId &&
        other.staffId === move.staffId &&
        ACTIVE_BOOKING_STATUSES.includes(other.status) &&
        other.startAt < move.endAt &&
        move.startAt < other.endAt
      ) {
        return false;
      }
    }
    this.bookingAppointments.set(id, clone({ ...appointment, ...move }));
    return true;
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

  // 27 Classes and memberships. Each method changes everything in one synchronous step, so concurrent calls can't interleave.

  async createClassSession(input: Omit<ClassSession, "id">): Promise<ClassSession | null> {
    for (const other of this.classSessions.values()) {
      if (other.appId === input.appId && input.templateId !== null && other.templateId === input.templateId && other.startAt.getTime() === input.startAt.getTime()) return null;
    }
    const session: ClassSession = { ...clone(input), id: this.nextClassId++ };
    this.classSessions.set(session.id, clone(session));
    return session;
  }

  async getClassSession(appId: string, id: number): Promise<ClassSession | null> {
    const session = this.classSessions.get(id);
    return session && session.appId === appId ? clone(session) : null;
  }

  async listClassSessions(input: { appId: string; startFrom?: Date; startBefore?: Date }): Promise<ClassSession[]> {
    return [...this.classSessions.values()]
      .filter((s) => s.appId === input.appId)
      .filter((s) => !input.startFrom || s.startAt >= input.startFrom)
      .filter((s) => !input.startBefore || s.startAt < input.startBefore)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id - b.id)
      .map(clone);
  }

  async updateClassSession(appId: string, id: number, patch: ClassSessionPatch): Promise<void> {
    const session = this.classSessions.get(id);
    if (!session || session.appId !== appId) return;
    const next = { ...session, ...clone(patch) };
    next.capacity = Math.max(next.capacity, session.bookedCount);
    this.classSessions.set(id, next);
  }

  async deleteClassSession(appId: string, id: number): Promise<boolean> {
    const session = this.classSessions.get(id);
    if (!session || session.appId !== appId || session.bookedCount > 0) return false;
    this.classSessions.delete(id);
    for (const [key, b] of this.classBookings) if (b.sessionId === id) this.classBookings.delete(key);
    return true;
  }

  async bookClass(input: BookClassInput): Promise<BookClassResult> {
    const session = this.classSessions.get(input.sessionId);
    if (!session || session.appId !== input.appId) return { ok: false, reason: "not_found" };
    const existing = [...this.classBookings.values()].find((b) => b.sessionId === session.id && b.userId === input.userId);
    if (existing?.status === "booked") return { ok: true, booking: clone(existing), session: clone(session) };
    if (session.status !== "scheduled") return { ok: false, reason: "cancelled" };
    if (session.startAt < input.bookableFrom) return { ok: false, reason: "too_late" };
    if (session.bookedCount >= session.capacity) return { ok: false, reason: "full" };
    let membershipId: number | null = null;
    if (input.membershipRequired) {
      const mine = [...this.memberships.values()].filter((m) => m.appId === input.appId && m.userId === input.userId);
      // 64 Frozen or not on the class's own day.
      const pick = membershipToUse(mine, input.now, session.startAt);
      if (!pick.ok) return { ok: false, reason: pick.reason };
      const membership = this.memberships.get(pick.membership.id)!;
      if (membership.creditsLeft !== null) membership.creditsLeft -= 1;
      membership.updatedAt = input.now;
      membershipId = membership.id;
    }
    session.bookedCount += 1;
    session.updatedAt = input.now;
    const fields = {
      membershipId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      status: "booked" as const,
      updatedAt: input.now,
    };
    const booking: ClassBooking = existing
      ? { ...existing, ...fields }
      : { id: this.nextClassId++, appId: input.appId, sessionId: session.id, userId: input.userId, createdAt: input.now, ...fields };
    this.classBookings.set(booking.id, clone(booking));
    return { ok: true, booking: clone(booking), session: clone(session) };
  }

  /** Marks a spot cancelled, frees it and gives its credit back. */
  private releaseSpot(booking: ClassBooking, now: Date): void {
    booking.status = "cancelled";
    booking.updatedAt = now;
    const session = this.classSessions.get(booking.sessionId);
    if (session) session.bookedCount = Math.max(0, session.bookedCount - 1);
    const membership = booking.membershipId === null ? null : this.memberships.get(booking.membershipId);
    if (membership && membership.creditsLeft !== null) {
      membership.creditsLeft += 1;
      membership.updatedAt = now;
    }
  }

  async cancelClassBooking(input: { appId: string; sessionId: number; userId: number; now: Date }): Promise<ClassBooking | null> {
    const booking = [...this.classBookings.values()].find(
      (b) => b.appId === input.appId && b.sessionId === input.sessionId && b.userId === input.userId && b.status === "booked",
    );
    if (!booking) return null;
    this.releaseSpot(booking, input.now);
    return clone(booking);
  }

  async cancelClassSession(appId: string, id: number, now: Date): Promise<ClassBooking[]> {
    const session = this.classSessions.get(id);
    if (!session || session.appId !== appId || session.status === "cancelled") return [];
    session.status = "cancelled";
    session.updatedAt = now;
    const released: ClassBooking[] = [];
    for (const booking of this.classBookings.values()) {
      if (booking.sessionId !== id || booking.status !== "booked") continue;
      released.push(clone(booking));
      this.releaseSpot(booking, now);
    }
    return released;
  }

  async listClassBookings(input: { appId: string; sessionIds?: number[]; userId?: number; status?: ClassBookingStatus }): Promise<ClassBooking[]> {
    return [...this.classBookings.values()]
      .filter((b) => b.appId === input.appId)
      .filter((b) => !input.sessionIds || input.sessionIds.includes(b.sessionId))
      .filter((b) => input.userId === undefined || b.userId === input.userId)
      .filter((b) => !input.status || b.status === input.status)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
      .map(clone);
  }

  async createMembership(input: Omit<Membership, "id">): Promise<Membership> {
    const membership: Membership = { ...clone(input), id: this.nextClassId++ };
    this.memberships.set(membership.id, clone(membership));
    return membership;
  }

  async getMembership(appId: string, id: number): Promise<Membership | null> {
    const membership = this.memberships.get(id);
    return membership && membership.appId === appId ? clone(membership) : null;
  }

  async listMemberships(input: { appId: string; userId?: number; limit?: number }): Promise<Membership[]> {
    return [...this.memberships.values()]
      .filter((m) => m.appId === input.appId && (input.userId === undefined || m.userId === input.userId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .slice(0, input.limit ?? 500)
      .map(clone);
  }

  async updateMembership(appId: string, id: number, patch: MembershipPatch): Promise<void> {
    const membership = this.memberships.get(id);
    if (membership && membership.appId === appId) this.memberships.set(id, { ...membership, ...clone(patch) });
  }

  async addMembershipCredits(appId: string, id: number, credits: number, now: Date): Promise<void> {
    const membership = this.memberships.get(id);
    if (!membership || membership.appId !== appId || membership.creditsLeft === null) return;
    membership.creditsLeft = Math.max(0, membership.creditsLeft + credits);
    membership.updatedAt = now;
  }

  // 63 Members at the door

  private memberCheckIns = new Map<number, MemberCheckIn>();
  private nextMemberCheckInId = 1;

  async checkInMember(input: Omit<MemberCheckIn, "id">): Promise<{ ok: true; checkIn: MemberCheckIn } | { ok: false; checkIn: MemberCheckIn }> {
    const there = [...this.memberCheckIns.values()].find((c) => c.appId === input.appId && c.userId === input.userId && c.day === input.day);
    if (there) return { ok: false, checkIn: clone(there) };
    const row: MemberCheckIn = { ...clone(input), id: this.nextMemberCheckInId++ };
    this.memberCheckIns.set(row.id, row);
    return { ok: true, checkIn: clone(row) };
  }

  async listMemberCheckIns(appId: string, day: string): Promise<MemberCheckIn[]> {
    return [...this.memberCheckIns.values()]
      .filter((c) => c.appId === appId && c.day === day)
      .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id - a.id)
      .map(clone);
  }

  async countMemberCheckInsOnDay(appId: string, day: string): Promise<number> {
    return [...this.memberCheckIns.values()].filter((c) => c.appId === appId && c.day === day).length;
  }

  /** 63 Whether a membership can get in now (as the database orders them). */
  /** Current: active, started and not ended (64 frozen ones too, as the dashboard's Members). */
  private usable(m: Membership, now: Date): boolean {
    return membershipActive(m, now);
  }

  async listMembershipsPage(input: { appId: string; userIds?: number[]; now: Date; offset: number; limit: number }): Promise<{ items: Membership[]; total: number }> {
    const all = [...this.memberships.values()]
      .filter((m) => m.appId === input.appId && (!input.userIds || input.userIds.includes(m.userId)))
      .sort(
        (a, b) =>
          Number(!this.usable(a, input.now)) - Number(!this.usable(b, input.now)) || b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
      );
    return { items: all.slice(input.offset, input.offset + input.limit).map(clone), total: all.length };
  }

  async findMembershipByCodeHash(appId: string, codeHash: string): Promise<Membership | null> {
    const found = [...this.memberships.values()].find((m) => m.appId === appId && m.codeHash === codeHash);
    return found ? clone(found) : null;
  }

  async listMembershipsWithoutCodeHash(appId: string, now: Date, limit: number): Promise<Membership[]> {
    return [...this.memberships.values()]
      .filter((m) => m.appId === appId && !m.codeHash && membershipActive(m, now))
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map(clone);
  }

  async setMembershipCodeHash(appId: string, id: number, codeHash: string): Promise<void> {
    const m = this.memberships.get(id);
    if (m && m.appId === appId) m.codeHash = codeHash;
  }

  async freezeMembership(appId: string, id: number, input: { from: Date; until: Date | null; endsAt: Date | null; previousEndsAt: Date | null; now: Date }): Promise<boolean> {
    const m = this.memberships.get(id);
    if (!m || m.appId !== appId || m.status !== "active" || membershipFreezeSet(m, input.now) || !sameTime(m.endsAt, input.previousEndsAt)) return false;
    this.memberships.set(id, { ...m, frozenFrom: new Date(input.from), frozenUntil: input.until ? new Date(input.until) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, updatedAt: input.now });
    return true;
  }

  async unfreezeMembership(appId: string, id: number, input: { from: Date; until: Date | null; endsAt: Date | null; previousEndsAt: Date | null; now: Date }): Promise<boolean> {
    const m = this.memberships.get(id);
    if (
      !m ||
      m.appId !== appId ||
      m.status !== "active" ||
      !sameTime(m.frozenFrom ?? null, input.from) ||
      !sameTime(m.frozenUntil ?? null, input.until) ||
      !membershipFreezeSet(m, input.now) ||
      !sameTime(m.endsAt, input.previousEndsAt)
    )
      return false;
    this.memberships.set(id, { ...m, frozenFrom: null, frozenUntil: null, endsAt: input.endsAt ? new Date(input.endsAt) : null, updatedAt: input.now });
    return true;
  }

  // 63 Course questions and reviews

  private courseReviews = new Map<number, CourseReview>();
  private nextCourseReviewId = 1;
  private courseQuestions = new Map<number, CourseQuestion>();
  private nextCourseQuestionId = 1;
  private courseAnswers = new Map<number, CourseAnswer>();
  private nextCourseAnswerId = 1;

  private deleteQuestion(id: number) {
    this.courseQuestions.delete(id);
    for (const [key, a] of this.courseAnswers) if (a.questionId === id) this.courseAnswers.delete(key);
  }

  async saveCourseReview(input: { appId: string; courseId: number; userId: number; rating: number; text: string; now: Date }): Promise<CourseReview> {
    const there = [...this.courseReviews.values()].find((r) => r.appId === input.appId && r.courseId === input.courseId && r.userId === input.userId);
    const row: CourseReview = there
      ? { ...there, rating: input.rating, text: input.text, updatedAt: input.now }
      : {
          id: this.nextCourseReviewId++,
          appId: input.appId,
          courseId: input.courseId,
          userId: input.userId,
          rating: input.rating,
          text: input.text,
          hidden: false,
          replyText: null,
          replyAt: null,
          createdAt: input.now,
          updatedAt: input.now,
        };
    this.courseReviews.set(row.id, clone(row));
    return clone(row);
  }

  async getCourseReview(appId: string, id: number): Promise<CourseReview | null> {
    const row = this.courseReviews.get(id);
    return row && row.appId === appId ? clone(row) : null;
  }

  async getCourseReviewOf(appId: string, courseId: number, userId: number): Promise<CourseReview | null> {
    const row = [...this.courseReviews.values()].find((r) => r.appId === appId && r.courseId === courseId && r.userId === userId);
    return row ? clone(row) : null;
  }

  async listCourseReviews(input: { appId: string; courseIds?: number[]; hidden?: boolean; unreplied?: boolean; offset: number; limit: number }): Promise<{ items: CourseReview[]; total: number }> {
    const all = [...this.courseReviews.values()]
      .filter(
        (r) =>
          r.appId === input.appId &&
          (!input.courseIds || input.courseIds.includes(r.courseId)) &&
          (input.hidden === undefined || r.hidden === input.hidden) &&
          (!input.unreplied || r.replyText === null),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
    return { items: all.slice(input.offset, input.offset + input.limit).map(clone), total: all.length };
  }

  async countCourseRatings(appId: string): Promise<{ courseId: number; rating: number; count: number }[]> {
    const counts = new Map<string, { courseId: number; rating: number; count: number }>();
    for (const r of this.courseReviews.values()) {
      if (r.appId !== appId || r.hidden) continue;
      const key = `${r.courseId}:${r.rating}`;
      const row = counts.get(key) ?? { courseId: r.courseId, rating: r.rating, count: 0 };
      row.count++;
      counts.set(key, row);
    }
    return [...counts.values()];
  }

  async updateCourseReview(appId: string, id: number, patch: CourseReviewPatch): Promise<void> {
    const row = this.courseReviews.get(id);
    if (row && row.appId === appId) this.courseReviews.set(id, clone({ ...row, ...patch }));
  }

  async createCourseQuestion(input: CourseQuestionInput): Promise<CourseQuestion> {
    const row: CourseQuestion = { ...clone(input), hidden: false, id: this.nextCourseQuestionId++, answerCount: 0 };
    this.courseQuestions.set(row.id, clone(row));
    return row;
  }

  /** 63 The question with its answers counted now (a deleted student's answers go with their account; 64 hidden ones aren't counted). */
  private counted(q: CourseQuestion): CourseQuestion {
    let n = 0;
    for (const a of this.courseAnswers.values()) if (a.questionId === q.id && !a.hidden) n++;
    return { ...clone(q), answerCount: n };
  }

  async getCourseQuestion(appId: string, id: number): Promise<CourseQuestion | null> {
    const row = this.courseQuestions.get(id);
    return row && row.appId === appId ? this.counted(row) : null;
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
    const at = (q: CourseQuestion) => (input.order === "created" ? q.createdAt : q.updatedAt).getTime();
    const all = [...this.courseQuestions.values()]
      .filter(
        (q) =>
          q.appId === input.appId &&
          (!input.courseIds || input.courseIds.includes(q.courseId)) &&
          (!input.status || q.status === input.status) &&
          (input.hidden === undefined || q.hidden === input.hidden) &&
          (input.viewerId === undefined || !q.hidden || q.userId === input.viewerId),
      )
      .sort((a, b) => at(b) - at(a) || b.id - a.id);
    return { items: all.slice(input.offset, input.offset + input.limit).map((q) => this.counted(q)), total: all.length };
  }

  async addCourseAnswer(input: CourseAnswerInput, status: CourseQuestionStatus): Promise<CourseAnswer> {
    const row: CourseAnswer = { ...clone(input), hidden: false, id: this.nextCourseAnswerId++ };
    this.courseAnswers.set(row.id, clone(row));
    const question = this.courseQuestions.get(input.questionId);
    if (question && question.appId === input.appId) this.courseQuestions.set(question.id, { ...question, status, updatedAt: input.createdAt });
    return row;
  }

  async setCourseQuestionHidden(appId: string, id: number, hidden: boolean): Promise<boolean> {
    const row = this.courseQuestions.get(id);
    if (!row || row.appId !== appId) return false;
    this.courseQuestions.set(id, { ...row, hidden });
    return true;
  }

  async setCourseAnswerHidden(appId: string, questionId: number, id: number, hidden: boolean): Promise<boolean> {
    const row = this.courseAnswers.get(id);
    if (!row || row.appId !== appId || row.questionId !== questionId || row.userId === null) return false;
    this.courseAnswers.set(id, { ...row, hidden });
    return true;
  }

  async listCourseAnswers(appId: string, questionId: number): Promise<CourseAnswer[]> {
    return [...this.courseAnswers.values()]
      .filter((a) => a.appId === appId && a.questionId === questionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
      .map(clone);
  }

  async enrollInCourse(input: CourseEnrollment): Promise<boolean> {
    if (this.courseEnrollments.some((e) => e.appId === input.appId && e.userId === input.userId && e.courseId === input.courseId)) return false;
    this.courseEnrollments.push(clone(input));
    return true;
  }

  async leaveCourse(appId: string, userId: number, courseId: number): Promise<boolean> {
    const index = this.courseEnrollments.findIndex((e) => e.appId === appId && e.userId === userId && e.courseId === courseId);
    if (index < 0) return false;
    this.courseEnrollments.splice(index, 1);
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

  async createQuizAttempt(input: Omit<QuizAttempt, "id">): Promise<QuizAttempt> {
    const attempt = { ...clone(input), id: this.quizAttempts.length + 1 };
    this.quizAttempts.push(attempt);
    return clone(attempt);
  }

  async getQuizAttempt(appId: string, id: number): Promise<QuizAttempt | null> {
    const found = this.quizAttempts.find((a) => a.appId === appId && a.id === id);
    return found ? clone(found) : null;
  }

  async submitQuizAttempt(appId: string, id: number, result: Pick<QuizAttempt, "answers" | "scorePercent" | "passed" | "submittedAt">): Promise<boolean> {
    const found = this.quizAttempts.find((a) => a.appId === appId && a.id === id);
    if (!found || found.submittedAt) return false;
    Object.assign(found, clone(result));
    return true;
  }

  async listQuizAttempts(input: { appId: string; userId?: number; courseId?: number; quizId?: number }): Promise<QuizAttempt[]> {
    return this.quizAttempts
      .filter(
        (a) =>
          a.appId === input.appId &&
          (input.userId === undefined || a.userId === input.userId) &&
          (input.courseId === undefined || a.courseId === input.courseId) &&
          (input.quizId === undefined || a.quizId === input.quizId),
      )
      .sort((a, b) => b.id - a.id)
      .map(clone);
  }

  async deleteQuizAttempts(input: { appId: string; userId: number; courseId: number }): Promise<number> {
    const before = this.quizAttempts.length;
    this.quizAttempts = this.quizAttempts.filter((a) => !(a.appId === input.appId && a.userId === input.userId && a.courseId === input.courseId));
    return before - this.quizAttempts.length;
  }

  async deleteLessonProgress(input: { appId: string; userId: number; courseId: number }): Promise<number> {
    let deleted = 0;
    for (const [key, p] of this.lessonProgress) {
      if (p.appId === input.appId && p.userId === input.userId && p.courseId === input.courseId) {
        this.lessonProgress.delete(key);
        deleted++;
      }
    }
    return deleted;
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

  async listPlanPayments(input: { clientId?: string; appId?: string; id?: string; status?: PlanPaymentStatus; limit: number }): Promise<PlanPayment[]> {
    return [...this.planPayments.values()]
      .filter(
        (p) =>
          (!input.clientId || p.clientId === input.clientId) &&
          (!input.appId || p.appId === input.appId) &&
          (!input.id || p.id === input.id) &&
          (!input.status || p.status === input.status),
      )
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

  // 28 Events & tickets

  private events = new Map<number, EventRecord>();
  private nextEventId = 1;
  private ticketTypes = new Map<number, TicketType>();
  private nextTicketTypeId = 1;
  private tickets = new Map<number, EventTicket>();
  private nextTicketId = 1;
  private eventSettings = new Map<string, EventSettings>();

  async listEvents(appId: string): Promise<EventRecord[]> {
    return [...this.events.values()]
      .filter((e) => e.appId === appId)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.id - b.id)
      .map(clone);
  }

  async getEvent(appId: string, id: number): Promise<EventRecord | null> {
    const event = this.events.get(id);
    return event && event.appId === appId ? clone(event) : null;
  }

  async createEvent(input: EventInput, now: Date): Promise<EventRecord> {
    const event: EventRecord = { ...clone(input), id: this.nextEventId++, createdAt: now, updatedAt: now };
    this.events.set(event.id, clone(event));
    return event;
  }

  async updateEvent(appId: string, id: number, patch: Partial<EventInput>, now: Date): Promise<void> {
    const event = this.events.get(id);
    if (event && event.appId === appId) this.events.set(id, clone({ ...event, ...patch, appId, id, updatedAt: now }));
  }

  async deleteEvent(appId: string, id: number): Promise<void> {
    if (this.events.get(id)?.appId !== appId) return;
    this.events.delete(id);
    for (const [key, t] of this.ticketTypes) if (t.eventId === id) this.ticketTypes.delete(key);
    for (const [key, t] of this.tickets) if (t.eventId === id) this.tickets.delete(key);
  }

  async listTicketTypes(appId: string, eventId?: number): Promise<TicketType[]> {
    return [...this.ticketTypes.values()]
      .filter((t) => t.appId === appId && (eventId === undefined || t.eventId === eventId))
      .sort((a, b) => a.eventId - b.eventId || a.position - b.position || a.id - b.id)
      .map(clone);
  }

  async createTicketType(input: TicketTypeInput, now: Date): Promise<TicketType> {
    const type: TicketType = { ...clone(input), id: this.nextTicketTypeId++, createdAt: now };
    this.ticketTypes.set(type.id, clone(type));
    return type;
  }

  async updateTicketType(appId: string, id: number, patch: Partial<Omit<TicketTypeInput, "appId" | "eventId">>): Promise<void> {
    const type = this.ticketTypes.get(id);
    if (type && type.appId === appId) this.ticketTypes.set(id, clone({ ...type, ...patch, id, appId, eventId: type.eventId }));
  }

  async deleteTicketType(appId: string, id: number): Promise<void> {
    if (this.ticketTypes.get(id)?.appId !== appId) return;
    this.ticketTypes.delete(id);
    for (const [key, t] of this.tickets) if (t.ticketTypeId === id) this.tickets.delete(key);
  }

  /** Whether a ticket takes a place: issued, used, or held for a payment that may still come. */
  private holdsPlace(t: EventTicket, now: Date): boolean {
    return t.status === "valid" || t.status === "used" || (t.status === "pending" && t.holdUntil !== null && t.holdUntil.getTime() > now.getTime());
  }

  async claimTickets(claim: TicketClaim): Promise<{ ok: true; tickets: EventTicket[] } | { ok: false; reason: TicketClaimRefusal }> {
    // No await between the count and the write: claims can't interleave in one process.
    const event = this.events.get(claim.eventId);
    const type = this.ticketTypes.get(claim.ticketTypeId);
    if (!event || event.appId !== claim.appId || event.status !== "published" || !type || type.eventId !== event.id) return { ok: false, reason: "not_on_sale" };
    const holding = [...this.tickets.values()].filter((t) => t.eventId === event.id && this.holdsPlace(t, claim.now));
    const wanted = claim.tickets.length;
    if (event.capacity !== null && holding.length + wanted > event.capacity) return { ok: false, reason: "sold_out" };
    if (type.capacity !== null && holding.filter((t) => t.ticketTypeId === type.id).length + wanted > type.capacity) return { ok: false, reason: "sold_out" };
    const issued = claim.tickets.map((t): EventTicket => ({
      id: this.nextTicketId++,
      appId: claim.appId,
      eventId: event.id,
      ticketTypeId: type.id,
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
    for (const t of issued) this.tickets.set(t.id, clone(t));
    return { ok: true, tickets: issued.map(clone) };
  }

  async countTicketPlaces(appId: string, now: Date): Promise<{ eventId: number; ticketTypeId: number; count: number }[]> {
    const counts = new Map<number, { eventId: number; ticketTypeId: number; count: number }>();
    for (const t of this.tickets.values()) {
      if (t.appId !== appId || !this.holdsPlace(t, now)) continue;
      const row = counts.get(t.ticketTypeId) ?? { eventId: t.eventId, ticketTypeId: t.ticketTypeId, count: 0 };
      row.count++;
      counts.set(t.ticketTypeId, row);
    }
    return [...counts.values()];
  }

  async listTickets(input: { appId: string; eventId?: number; userId?: number; orderId?: number }): Promise<EventTicket[]> {
    return [...this.tickets.values()]
      .filter(
        (t) =>
          t.appId === input.appId &&
          (input.eventId === undefined || t.eventId === input.eventId) &&
          (input.userId === undefined || t.userId === input.userId) &&
          (input.orderId === undefined || t.orderId === input.orderId),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
      .map(clone);
  }

  async getTicketByCode(appId: string, code: string): Promise<EventTicket | null> {
    const ticket = [...this.tickets.values()].find((t) => t.appId === appId && t.code === code);
    return ticket ? clone(ticket) : null;
  }

  async issueOrderTickets(appId: string, orderId: number, now: Date): Promise<{ issued: number; released: number }> {
    // No await: nothing can claim a place in between, in one process.
    const pending = [...this.tickets.values()].filter((t) => t.appId === appId && t.orderId === orderId && t.status === "pending");
    const held = pending.filter((t) => this.holdsPlace(t, now));
    const lapsed = pending.filter((t) => !this.holdsPlace(t, now));
    for (const t of held) {
      t.status = "valid";
      t.holdUntil = null;
    }
    if (lapsed.length === 0) return { issued: held.length, released: 0 };
    // 49 Paid after the hold ended: only while the places are still free.
    const event = this.events.get(lapsed[0]!.eventId);
    const holding = [...this.tickets.values()].filter((t) => t.eventId === lapsed[0]!.eventId && this.holdsPlace(t, now));
    let free = event !== undefined && event.status === "published" && (event.capacity === null || holding.length + lapsed.length <= event.capacity);
    for (const typeId of new Set(lapsed.map((t) => t.ticketTypeId))) {
      const type = this.ticketTypes.get(typeId);
      const wanted = lapsed.filter((t) => t.ticketTypeId === typeId).length;
      if (!type || (type.capacity !== null && holding.filter((t) => t.ticketTypeId === typeId).length + wanted > type.capacity)) free = false;
    }
    for (const t of lapsed) {
      t.status = free ? "valid" : "cancelled";
      t.cancelledAt = free ? null : now;
      t.holdUntil = null;
    }
    return free ? { issued: pending.length, released: 0 } : { issued: held.length, released: lapsed.length };
  }

  async holdOrderTickets(appId: string, orderId: number, until: Date, now: Date): Promise<number> {
    let held = 0;
    for (const t of this.tickets.values()) {
      if (t.appId === appId && t.orderId === orderId && t.status === "pending" && this.holdsPlace(t, now)) {
        t.holdUntil = until;
        held++;
      }
    }
    return held;
  }

  async checkInTicket(appId: string, code: string, now: Date): Promise<CheckInResult> {
    const ticket = [...this.tickets.values()].find((t) => t.appId === appId && t.code === code);
    if (!ticket) return { ok: false, reason: "not_found" };
    if (ticket.status !== "valid") return { ok: false, reason: ticket.status, ticket: clone(ticket) };
    ticket.status = "used";
    ticket.usedAt = now;
    return { ok: true, ticket: clone(ticket) };
  }

  async cancelTickets(appId: string, input: { ids?: number[]; eventId?: number; refunded?: boolean }, now: Date): Promise<number> {
    if (input.ids === undefined && input.eventId === undefined) return 0;
    let cancelled = 0;
    for (const t of this.tickets.values()) {
      if (t.appId !== appId || t.status !== "valid") continue;
      if (input.ids !== undefined && !input.ids.includes(t.id)) continue;
      if (input.eventId !== undefined && t.eventId !== input.eventId) continue;
      t.status = "cancelled";
      t.cancelledAt = now;
      if (input.refunded) t.refundedAt = now;
      cancelled++;
    }
    return cancelled;
  }

  async getEventSettings(appId: string): Promise<EventSettings | null> {
    const settings = this.eventSettings.get(appId);
    return settings ? clone(settings) : null;
  }

  async saveEventSettings(appId: string, settings: EventSettings, now: Date): Promise<void> {
    void now;
    this.eventSettings.set(appId, clone(settings));
  }

  // 29 Charity & donations

  private campaigns = new Map<number, Campaign>();
  private nextCampaignId = 1;
  private donations = new Map<number, Donation>();
  private nextDonationId = 1;
  private donationSettings = new Map<string, DonationSettings>();

  async listCampaigns(appId: string): Promise<Campaign[]> {
    return [...this.campaigns.values()]
      .filter((c) => c.appId === appId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .map(clone);
  }

  async getCampaign(appId: string, id: number): Promise<Campaign | null> {
    const campaign = this.campaigns.get(id);
    return campaign && campaign.appId === appId ? clone(campaign) : null;
  }

  async createCampaign(input: CampaignInput, now: Date): Promise<Campaign> {
    const campaign: Campaign = { ...clone(input), id: this.nextCampaignId++, raisedCents: 0, donorCount: 0, createdAt: now, updatedAt: now };
    this.campaigns.set(campaign.id, clone(campaign));
    return campaign;
  }

  async updateCampaign(appId: string, id: number, patch: Partial<CampaignInput>, now: Date): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (!campaign || campaign.appId !== appId) return;
    const { raisedCents, donorCount } = campaign;
    this.campaigns.set(id, clone({ ...campaign, ...patch, appId, id, raisedCents, donorCount, updatedAt: now }));
  }

  async deleteCampaign(appId: string, id: number): Promise<void> {
    if (this.campaigns.get(id)?.appId !== appId) return;
    this.campaigns.delete(id);
    for (const donation of this.donations.values()) if (donation.campaignId === id) donation.campaignId = null;
  }

  async setCampaignTotals(appId: string, id: number, totals: Pick<Campaign, "raisedCents" | "donorCount">): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (campaign && campaign.appId === appId) this.campaigns.set(id, { ...campaign, raisedCents: totals.raisedCents, donorCount: totals.donorCount });
  }

  async createDonation(input: DonationInput): Promise<Donation> {
    if ([...this.donations.values()].some((d) => d.tokenHash === input.tokenHash || d.receiptCode === input.receiptCode)) {
      throw new Error("Duplicate donation token.");
    }
    const donation: Donation = { ...clone(input), id: this.nextDonationId++ };
    this.donations.set(donation.id, clone(donation));
    return donation;
  }

  async getDonation(appId: string, id: number): Promise<Donation | null> {
    const donation = this.donations.get(id);
    return donation && donation.appId === appId ? clone(donation) : null;
  }

  async getDonationByToken(tokenHash: string): Promise<Donation | null> {
    const donation = [...this.donations.values()].find((d) => d.tokenHash === tokenHash);
    return donation ? clone(donation) : null;
  }

  async getDonationByReceipt(receiptCode: string): Promise<Donation | null> {
    const donation = [...this.donations.values()].find((d) => d.receiptCode === receiptCode);
    return donation ? clone(donation) : null;
  }

  async updateDonation(appId: string, id: number, patch: DonationPatch): Promise<void> {
    const donation = this.donations.get(id);
    if (donation && donation.appId === appId) this.donations.set(id, clone({ ...donation, ...patch, appId, id }));
  }

  async payDonation(appId: string, id: number, paymentId: string, now: Date, options: { count?: boolean } = {}): Promise<boolean> {
    const donation = this.donations.get(id);
    if (!donation || donation.appId !== appId || donation.status !== "pending") return false;
    const firstFromDonor =
      donation.donorEmail === null ||
      ![...this.donations.values()].some(
        (d) => d.id !== id && d.appId === appId && d.campaignId === donation.campaignId && d.status === "paid" && d.donorEmail === donation.donorEmail,
      );
    this.donations.set(id, { ...donation, status: "paid", paymentId, paidAt: now, updatedAt: now });
    const campaign = donation.campaignId !== null ? this.campaigns.get(donation.campaignId) : undefined;
    if (campaign && options.count !== false) {
      campaign.raisedCents += donation.amountCents;
      if (firstFromDonor) campaign.donorCount += 1;
    }
    return true;
  }

  async listDonations(input: {
    appId: string;
    campaignId?: number;
    userId?: number;
    statuses?: DonationStatus[];
    offset: number;
    limit: number;
  }): Promise<{ items: Donation[]; total: number }> {
    const all = [...this.donations.values()]
      .filter(
        (d) =>
          d.appId === input.appId &&
          (input.campaignId === undefined || d.campaignId === input.campaignId) &&
          (input.userId === undefined || d.userId === input.userId) &&
          (!input.statuses || input.statuses.includes(d.status)),
      )
      .sort((a, b) => (b.paidAt ?? b.createdAt).getTime() - (a.paidAt ?? a.createdAt).getTime() || b.id - a.id);
    return { items: all.slice(input.offset, input.offset + input.limit).map(clone), total: all.length };
  }

  async listCampaignDonorUserIds(appId: string, campaignId: number): Promise<number[]> {
    const ids = new Set<number>();
    for (const d of this.donations.values()) {
      if (d.appId === appId && d.campaignId === campaignId && d.status === "paid" && d.userId !== null) ids.add(d.userId);
    }
    return [...ids].sort((a, b) => a - b);
  }

  async getDonationSettings(appId: string): Promise<DonationSettings | null> {
    const settings = this.donationSettings.get(appId);
    return settings ? clone(settings) : null;
  }

  async saveDonationSettings(appId: string, settings: DonationSettings, now: Date): Promise<void> {
    void now;
    this.donationSettings.set(appId, clone(settings));
  }

  // 104 Delivery and courier companies

  private deliverySettings = new Map<string, DeliverySettings>();
  private deliveryServices = new Map<number, DeliveryService>();
  private nextDeliveryServiceId = 1;
  private couriers = new Map<number, Courier>();
  private nextCourierId = 1;
  private shipments = new Map<number, Shipment>();
  private nextShipmentId = 1;

  async getDeliverySettings(appId: string): Promise<DeliverySettings | null> {
    const settings = this.deliverySettings.get(appId);
    return settings ? clone(settings) : null;
  }

  async saveDeliverySettings(appId: string, settings: DeliverySettings, now: Date): Promise<void> {
    void now;
    this.deliverySettings.set(appId, clone(settings));
  }

  async listDeliveryServices(appId: string): Promise<DeliveryService[]> {
    return [...this.deliveryServices.values()]
      .filter((s) => s.appId === appId)
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map(clone);
  }

  async getDeliveryService(appId: string, id: number): Promise<DeliveryService | null> {
    const service = this.deliveryServices.get(id);
    return service && service.appId === appId ? clone(service) : null;
  }

  async createDeliveryService(input: DeliveryServiceInput, now: Date): Promise<DeliveryService> {
    const service: DeliveryService = { ...clone(input), id: this.nextDeliveryServiceId++, createdAt: now, updatedAt: now };
    this.deliveryServices.set(service.id, clone(service));
    return service;
  }

  async updateDeliveryService(appId: string, id: number, patch: Partial<DeliveryServiceInput>, now: Date): Promise<void> {
    const service = this.deliveryServices.get(id);
    if (service && service.appId === appId) this.deliveryServices.set(id, clone({ ...service, ...patch, appId, id, updatedAt: now }));
  }

  async deleteDeliveryService(appId: string, id: number): Promise<void> {
    if (this.deliveryServices.get(id)?.appId !== appId) return;
    this.deliveryServices.delete(id);
    for (const shipment of this.shipments.values()) if (shipment.appId === appId && shipment.serviceId === id) shipment.serviceId = null;
  }

  async listCouriers(appId: string): Promise<Courier[]> {
    return [...this.couriers.values()]
      .filter((c) => c.appId === appId)
      .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
      .map(clone);
  }

  async getCourier(appId: string, id: number): Promise<Courier | null> {
    const courier = this.couriers.get(id);
    return courier && courier.appId === appId ? clone(courier) : null;
  }

  async findCourier(appId: string, who: { phone: string | null; email: string | null }): Promise<Courier | null> {
    const found = [...this.couriers.values()].find(
      (c) => c.appId === appId && (who.phone ? c.phone === who.phone : who.email !== null && c.email === who.email.toLowerCase()),
    );
    return found ? clone(found) : null;
  }

  private courierTaken(appId: string, id: number | null, phone: string | null, email: string | null): boolean {
    return [...this.couriers.values()].some((c) => c.appId === appId && c.id !== id && ((phone !== null && c.phone === phone) || (email !== null && c.email === email)));
  }

  async createCourier(input: CourierInput, now: Date): Promise<{ ok: true; courier: Courier } | { ok: false; reason: "duplicate" }> {
    if (this.courierTaken(input.appId, null, input.phone, input.email)) return { ok: false, reason: "duplicate" };
    const courier: Courier = { ...clone(input), id: this.nextCourierId++, onDuty: false, lat: null, lng: null, locatedAt: null, createdAt: now, updatedAt: now };
    this.couriers.set(courier.id, clone(courier));
    return { ok: true, courier };
  }

  async updateCourier(appId: string, id: number, patch: CourierPatch, now: Date): Promise<{ ok: boolean; reason?: "duplicate" }> {
    const courier = this.couriers.get(id);
    if (!courier || courier.appId !== appId) return { ok: false };
    const next = { ...courier, ...clone(patch), appId, id, updatedAt: now };
    if (("phone" in patch || "email" in patch) && this.courierTaken(appId, id, next.phone, next.email)) return { ok: false, reason: "duplicate" };
    this.couriers.set(id, next);
    return { ok: true };
  }

  async deleteCourier(appId: string, id: number, now: Date): Promise<void> {
    if (this.couriers.get(id)?.appId !== appId) return;
    this.couriers.delete(id);
    for (const shipment of this.shipments.values()) {
      if (shipment.appId !== appId || shipment.courierId !== id) continue;
      shipment.courierId = null;
      if (shipment.status === "assigned") {
        shipment.status = "pending";
        shipment.timeline = [...shipment.timeline, { status: "pending", at: now.toISOString(), by: "company" }];
        shipment.updatedAt = now;
      }
    }
  }

  async createShipment(input: ShipmentInput): Promise<Shipment> {
    const shipment: Shipment = { ...clone(input), id: this.nextShipmentId++ };
    this.shipments.set(shipment.id, clone(shipment));
    return shipment;
  }

  async getShipment(appId: string, id: number): Promise<Shipment | null> {
    const shipment = this.shipments.get(id);
    return shipment && shipment.appId === appId ? clone(shipment) : null;
  }

  async listShipments(query: ShipmentQuery): Promise<{ items: Shipment[]; total: number }> {
    const search = query.search?.trim().toLowerCase() ?? "";
    const reference = /^s-?(\d+)$/i.exec(search);
    const all = [...this.shipments.values()]
      .filter(
        (s) =>
          s.appId === query.appId &&
          (query.userId === undefined || s.userId === query.userId) &&
          (query.courierId === undefined || s.courierId === query.courierId) &&
          (!query.statuses || query.statuses.includes(s.status)) &&
          (!query.unassigned || s.courierId === null) &&
          (!query.since || s.createdAt.getTime() >= query.since.getTime()) &&
          (!query.updatedSince || s.updatedAt.getTime() >= query.updatedSince.getTime()) &&
          (!search ||
            (reference ? s.id === Number(reference[1]) : [s.senderName, s.senderPhone ?? "", s.recipientName, s.recipientPhone].some((v) => v.toLowerCase().includes(search)))),
      )
      .sort((a, b) => (query.order === "newest" ? b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id : a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id));
    return { items: all.slice(query.offset, query.offset + query.limit).map(clone), total: all.length };
  }

  async updateShipment(appId: string, id: number, patch: ShipmentPatch, expect: { statuses?: ShipmentStatus[]; courierId?: number | null } = {}): Promise<boolean> {
    const shipment = this.shipments.get(id);
    if (!shipment || shipment.appId !== appId) return false;
    if (expect.statuses && !expect.statuses.includes(shipment.status)) return false;
    if (expect.courierId !== undefined && shipment.courierId !== expect.courierId) return false;
    this.shipments.set(id, clone({ ...shipment, ...patch, appId, id }));
    return true;
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
  // 82.4 Publish history

  private layoutVersions = new Map<string, AppLayoutVersion[]>();

  async addLayoutVersion(version: AppLayoutVersion, keep: number): Promise<void> {
    const list = (this.layoutVersions.get(version.appId) ?? []).filter((v) => v.number !== version.number);
    list.push(clone(version));
    list.sort((a, b) => b.number - a.number);
    this.layoutVersions.set(version.appId, list.slice(0, keep));
  }

  async listLayoutVersions(appId: string): Promise<AppLayoutVersionSummary[]> {
    return (this.layoutVersions.get(appId) ?? []).map(({ layout: _layout, ...summary }) => (void _layout, clone(summary)));
  }

  async getLayoutVersion(appId: string, number: number): Promise<AppLayoutVersion | null> {
    const version = (this.layoutVersions.get(appId) ?? []).find((v) => v.number === number);
    return version ? clone(version) : null;
  }

  // 84.3 Saved sections

  private savedSections: SavedSection[] = [];

  async listSavedSections(clientId: string): Promise<SavedSection[]> {
    return this.savedSections.filter((s) => s.clientId === clientId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(clone);
  }

  async createSavedSection(section: SavedSection): Promise<void> {
    this.savedSections.push(clone(section));
  }

  private studioTemplates: StudioTemplate[] = [];

  async listStudioTemplates(clientId: string): Promise<StudioTemplate[]> {
    return this.studioTemplates.filter((s) => s.clientId === clientId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(clone);
  }

  async createStudioTemplate(template: StudioTemplate): Promise<void> {
    this.studioTemplates.push(clone(template));
  }

  async deleteStudioTemplate(clientId: string, id: string): Promise<boolean> {
    const before = this.studioTemplates.length;
    this.studioTemplates = this.studioTemplates.filter((s) => !(s.clientId === clientId && s.id === id));
    return this.studioTemplates.length < before;
  }

  // 97.2 Own fonts

  private ownFonts: OwnFont[] = [];

  async listOwnFonts(appId: string): Promise<OwnFont[]> {
    return this.ownFonts.filter((f) => f.appId === appId).sort((a, b) => a.family.localeCompare(b.family)).map(clone);
  }

  async saveOwnFont(font: OwnFont): Promise<void> {
    // As the database's unique name per app: the same name replaces that row, keeping its id.
    const same = this.ownFonts.find((f) => f.id !== font.id && f.appId === font.appId && f.family.toLowerCase() === font.family.toLowerCase());
    const saved = same ? { ...clone(font), id: same.id } : clone(font);
    this.ownFonts = [...this.ownFonts.filter((f) => f.id !== font.id && f.id !== same?.id), saved];
  }

  async deleteOwnFont(appId: string, id: string): Promise<boolean> {
    const before = this.ownFonts.length;
    this.ownFonts = this.ownFonts.filter((f) => !(f.appId === appId && f.id === id));
    return this.ownFonts.length < before;
  }

  // 100.2 Store products

  private storeProducts: StoreProduct[] = [];

  async listStoreProducts(appId: string): Promise<StoreProduct[]> {
    return this.storeProducts
      .filter((p) => p.appId === appId)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title) || a.productId.localeCompare(b.productId))
      .map(clone);
  }

  async getStoreProduct(appId: string, productId: string): Promise<StoreProduct | null> {
    const found = this.storeProducts.find((p) => p.appId === appId && p.productId === productId);
    return found ? clone(found) : null;
  }

  async saveStoreProduct(product: StoreProduct): Promise<void> {
    const same = this.storeProducts.find((p) => p.appId === product.appId && p.productId === product.productId);
    const saved = clone({ ...product, id: same?.id ?? product.id });
    this.storeProducts = [...this.storeProducts.filter((p) => p !== same), saved];
  }

  // 100.3 Store purchases and billing sessions

  private storePurchases = new Map<string, StorePurchaseRecord>();
  private billingSessions = new Map<string, BillingSession>();

  async getStorePurchase(appId: string, platform: StorePurchaseRecord["platform"], storeKey: string): Promise<StorePurchaseRecord | null> {
    const found = [...this.storePurchases.values()].find((p) => p.appId === appId && p.platform === platform && p.storeKey === storeKey);
    return found ? clone(found) : null;
  }

  async createStorePurchase(purchase: StorePurchaseRecord): Promise<StorePurchaseRecord> {
    const same = await this.getStorePurchase(purchase.appId, purchase.platform, purchase.storeKey);
    if (same) return same;
    this.storePurchases.set(purchase.id, clone(purchase));
    return clone(purchase);
  }

  async saveStorePurchase(purchase: StorePurchaseRecord): Promise<void> {
    if (this.storePurchases.has(purchase.id)) this.storePurchases.set(purchase.id, clone(purchase));
  }

  async listAccountStorePurchases(appId: string, accountSource: StorePurchaseRecord["accountSource"], accountId: string): Promise<StorePurchaseRecord[]> {
    return [...this.storePurchases.values()]
      .filter((p) => p.appId === appId && p.accountSource === accountSource && p.accountId === accountId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(clone);
  }

  async listUndeliveredStorePurchases(before: Date, limit: number): Promise<StorePurchaseRecord[]> {
    return [...this.storePurchases.values()]
      .filter((p) => !p.delivered && p.updatedAt.getTime() < before.getTime())
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async listEndingStorePurchases(before: Date, limit: number): Promise<StorePurchaseRecord[]> {
    return [...this.storePurchases.values()]
      .filter((p) => p.status === "active" && p.expiresAt !== null && p.expiresAt.getTime() < before.getTime())
      .sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime())
      .slice(0, limit)
      .map(clone);
  }

  private storePurchaseEvents: StorePurchaseEvent[] = [];

  async addStorePurchaseEvent(event: StorePurchaseEvent): Promise<void> {
    this.storePurchaseEvents.push(clone(event));
  }

  async listStorePurchaseEvents(appId: string, from: Date, to: Date): Promise<StorePurchaseEvent[]> {
    return this.storePurchaseEvents
      .filter((e) => e.appId === appId && !e.test && e.at.getTime() >= from.getTime() && e.at.getTime() < to.getTime())
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map(clone);
  }

  // 100.7 What the owner listed as sold in the app

  private storeBillingItems: StoreBillingItem[] = [];

  async listStoreBillingItems(appId: string): Promise<StoreBillingItem[]> {
    return this.storeBillingItems
      .filter((i) => i.appId === appId)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title) || a.itemId.localeCompare(b.itemId))
      .map(clone);
  }

  async saveStoreBillingItem(item: StoreBillingItem): Promise<void> {
    const same = this.storeBillingItems.find((i) => i.appId === item.appId && i.kind === item.kind && i.itemId === item.itemId);
    const saved = clone({ ...item, id: same?.id ?? item.id, createdAt: same?.createdAt ?? item.createdAt });
    this.storeBillingItems = [...this.storeBillingItems.filter((i) => i !== same), saved];
  }

  async createBillingSession(session: BillingSession): Promise<void> {
    this.billingSessions.set(session.tokenHash, clone(session));
  }

  async getBillingSession(tokenHash: string): Promise<BillingSession | null> {
    const found = this.billingSessions.get(tokenHash);
    return found ? clone(found) : null;
  }

  async deleteSavedSection(clientId: string, id: string): Promise<boolean> {
    const before = this.savedSections.length;
    this.savedSections = this.savedSections.filter((s) => !(s.clientId === clientId && s.id === id));
    return this.savedSections.length < before;
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

  async listPendingPayments(query: { startedAfter: Date; startedBefore: Date; checkedBefore: Date; limit: number }): Promise<PendingPayment[]> {
    const due = (r: { status: string; createdAt: Date; providerRef?: string | null; providerCheckedAt?: Date | null }) =>
      r.status === "pending" &&
      Boolean(r.providerRef) &&
      r.createdAt.getTime() >= query.startedAfter.getTime() &&
      r.createdAt.getTime() <= query.startedBefore.getTime() &&
      (!r.providerCheckedAt || r.providerCheckedAt.getTime() <= query.checkedBefore.getTime());
    const all: PendingPayment[] = [
      ...[...this.catalogOrders.values()].filter(due).map((record) => ({ kind: "order" as const, record: clone(record) })),
      ...[...this.planPayments.values()].filter(due).map((record) => ({ kind: "plan" as const, record: clone(record) })),
      ...[...this.donations.values()].filter(due).map((record) => ({ kind: "donation" as const, record: clone(record) })),
    ];
    return all.sort((a, b) => a.record.createdAt.getTime() - b.record.createdAt.getTime()).slice(0, query.limit);
  }

  async markPaymentChecked(kind: PendingPayment["kind"], id: string | number, now: Date): Promise<void> {
    const map = (kind === "order" ? this.catalogOrders : kind === "plan" ? this.planPayments : this.donations) as Map<string | number, { providerCheckedAt?: Date | null }>;
    const record = map.get(id);
    if (record) map.set(id, { ...record, providerCheckedAt: now });
  }

  async listAppsToCheck(before: Date, limit: number): Promise<App[]> {
    const at = (a: App) => a.integrationsCheckedAt?.getTime() ?? -Infinity;
    return [...this.apps.values()]
      .filter((a) => !a.demo && !a.deletedAt && at(a) <= before.getTime())
      .sort((a, b) => at(a) - at(b) || a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async listStoreBillingApps(): Promise<App[]> {
    return [...this.apps.values()]
      .filter((a) => !a.demo && !a.deletedAt && a.storeBilling?.enabled)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone);
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

  async claimCouponRedemption(redemption: CouponRedemption, limits: CouponClaimLimits, payment?: PlanPayment): Promise<boolean> {
    // 70 Counted and saved without awaiting in between: one claim at a time.
    const counted = this.couponRedemptions.filter(
      (r) => r.couponId === redemption.couponId && (r.status === "redeemed" || (r.status === "pending" && r.createdAt.getTime() > limits.pendingSince.getTime())),
    );
    if (limits.maxRedemptions !== null && counted.length >= limits.maxRedemptions) return false;
    if (limits.maxPerClient !== null && counted.filter((r) => r.clientId === redemption.clientId).length >= limits.maxPerClient) return false;
    if (payment) this.planPayments.set(payment.id, clone(payment));
    this.couponRedemptions.push(clone(redemption));
    return true;
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
    for (const read of this.updateReads.values()) read.delete(`announcement:${id}`);
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

  // 57 The dashboard's bell: per user, item → when it was first read.
  private updateReads = new Map<string, Map<string, Date>>();

  async markUpdatesRead(input: { userId: string; items: string[]; now: Date }): Promise<void> {
    if (!input.items.length) return;
    const read = this.updateReads.get(input.userId) ?? new Map<string, Date>();
    for (const item of input.items) if (!read.has(item)) read.set(item, new Date(input.now));
    this.updateReads.set(input.userId, read);
  }

  async listReadUpdates(userId: string, items: string[]): Promise<string[]> {
    const read = this.updateReads.get(userId);
    return read ? [...new Set(items)].filter((item) => read.has(item)) : [];
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
    return this.liveLicenses().map(clone);
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

  // 46 Links that open the app and crash reports
  private crashIssues = new Map<string, CrashIssue>();
  private crashRuns = new Map<string, { sessions: number; crashed: number }>();

  async listAppLinkTargets(): Promise<AppLinkTarget[]> {
    return [...this.apps.values()]
      .filter((a) => a.androidPackage || a.iosBundleId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        androidPackage: a.androidPackage,
        iosBundleId: a.iosBundleId,
        playSigningSha256: a.playSigningSha256 ?? null,
        androidUploadSha256: a.androidUploadSha256 ?? null,
        appleTeamId: a.appleTeamId ?? null,
      }));
  }

  async recordCrashReports(appId: string, reports: CrashReportInput[], runs: { day: string; sessions: number; crashed: number }): Promise<void> {
    for (const report of reports) {
      const existing = [...this.crashIssues.values()].find((i) => i.appId === appId && i.fingerprint === report.fingerprint) ?? null;
      const merged = mergeCrash(existing, appId, report);
      this.crashIssues.set(merged.id, clone(merged));
    }
    if (runs.sessions > 0 || runs.crashed > 0) {
      const key = `${appId}:${runs.day}`;
      const day = this.crashRuns.get(key) ?? { sessions: 0, crashed: 0 };
      this.crashRuns.set(key, { sessions: day.sessions + runs.sessions, crashed: day.crashed + runs.crashed });
    }
  }

  async listCrashIssues(input: { appId?: string; status?: CrashIssueStatus; limit: number }): Promise<CrashIssue[]> {
    return [...this.crashIssues.values()]
      .filter((i) => (input.appId === undefined || i.appId === input.appId) && (input.status === undefined || i.status === input.status))
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime() || a.id.localeCompare(b.id))
      .slice(0, input.limit)
      .map(clone);
  }

  async getCrashIssue(id: string): Promise<CrashIssue | null> {
    const issue = this.crashIssues.get(id);
    return issue ? clone(issue) : null;
  }

  async setCrashIssueStatus(id: string, status: CrashIssueStatus, now: Date): Promise<void> {
    const issue = this.crashIssues.get(id);
    if (issue) this.crashIssues.set(id, { ...issue, status, resolvedAt: status === "resolved" ? now : null });
  }

  async crashSessionTotals(appId: string, sinceDay: string): Promise<{ sessions: number; crashed: number }> {
    let sessions = 0;
    let crashed = 0;
    for (const [key, day] of this.crashRuns) {
      const [app, date = ""] = key.split(":");
      if (app === appId && date >= sinceDay) {
        sessions += day.sessions;
        crashed += day.crashed;
      }
    }
    return { sessions, crashed };
  }

  // 16 Demo apps
  async purgeDemoActivity(appId: string, before: Date): Promise<DemoPurgeCounts> {
    const old = (date: Date) => date.getTime() < before.getTime();
    const counts: DemoPurgeCounts = {
      orders: 0,
      appointments: 0,
      inquiries: 0,
      favorites: 0,
      enrollments: 0,
      progress: 0,
      devices: 0,
      notifications: 0,
      classBookings: 0,
      memberships: 0,
      tickets: 0,
      donations: 0,
      questions: 0,
      reviews: 0,
    };
    // 28 Tickets first: a ticket of a deleted order goes with it.
    for (const [id, ticket] of this.tickets) {
      if (ticket.appId === appId && old(ticket.createdAt)) {
        this.tickets.delete(id);
        counts.tickets++;
      }
    }
    // 27 Spots taken more than a day ago are freed; memberships bought then are gone.
    for (const [id, booking] of this.classBookings) {
      if (booking.appId !== appId || !old(booking.updatedAt)) continue;
      const session = this.classSessions.get(booking.sessionId);
      if (session && booking.status === "booked") session.bookedCount = Math.max(0, session.bookedCount - 1);
      this.classBookings.delete(id);
      counts.classBookings++;
    }
    for (const [id, membership] of this.memberships) {
      if (membership.appId === appId && old(membership.createdAt)) {
        this.memberships.delete(id);
        for (const [key, c] of this.memberCheckIns) if (c.membershipId === id) this.memberCheckIns.delete(key);
        counts.memberships++;
      }
    }
    // 63 Visitors' questions and reviews of demo academies.
    for (const [id, question] of this.courseQuestions) {
      if (question.appId === appId && old(question.createdAt)) {
        this.deleteQuestion(id);
        counts.questions++;
      }
    }
    for (const [id, review] of this.courseReviews) {
      if (review.appId === appId && old(review.createdAt)) {
        this.courseReviews.delete(id);
        counts.reviews++;
      }
    }
    for (const [id, donation] of this.donations) {
      if (donation.appId === appId && old(donation.createdAt)) {
        this.donations.delete(id);
        counts.donations++;
      }
    }
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
    // 90.1 Quiz attempts count with the progress.
    const attempts = this.quizAttempts.length;
    this.quizAttempts = this.quizAttempts.filter((a) => !(a.appId === appId && old(a.startedAt)));
    counts.progress += attempts - this.quizAttempts.length;
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

  // 44 Analytics for app owners

  async insertAnalyticsEvents(events: AnalyticsEventRow[]): Promise<void> {
    for (const event of events) this.analyticsEvents.push({ ...event, at: new Date(event.at) });
  }

  async listAnalyticsEvents(appId: string, day: string): Promise<AnalyticsEventRow[]> {
    return this.analyticsEvents.filter((e) => e.appId === appId && e.day === day).map((e) => ({ ...e, at: new Date(e.at) }));
  }

  async countAnalyticsActive(appId: string, fromDay: string, toDay: string): Promise<number> {
    return new Set(this.analyticsEvents.filter((e) => e.appId === appId && e.day >= fromDay && e.day <= toDay).map((e) => e.installId)).size;
  }

  async countAnalyticsVersions(appId: string, fromDay: string): Promise<{ version: string; installs: number }[]> {
    const latest = new Map<string, AnalyticsEventRow>();
    for (const e of this.analyticsEvents) {
      if (e.appId !== appId || e.day < fromDay) continue;
      const seen = latest.get(e.installId);
      if (!seen || e.at.getTime() > seen.at.getTime()) latest.set(e.installId, e);
    }
    const counts = new Map<string, number>();
    for (const e of latest.values()) counts.set(e.appVersion, (counts.get(e.appVersion) ?? 0) + 1);
    return [...counts].map(([version, installs]) => ({ version, installs })).sort((a, b) => b.installs - a.installs || a.version.localeCompare(b.version));
  }

  async countAnalyticsReturning(appId: string, cohortDay: string, day: string): Promise<number> {
    const cohort = new Set(
      this.analyticsEvents.filter((e) => e.appId === appId && e.day === cohortDay && e.type === "app_open" && e.firstOpen).map((e) => e.installId),
    );
    return new Set(this.analyticsEvents.filter((e) => e.appId === appId && e.day === day && cohort.has(e.installId)).map((e) => e.installId)).size;
  }

  private analyticsKey(appId: string, day: string, metric: string, key: string): string {
    return JSON.stringify([appId, day, metric, key]);
  }

  async saveAnalyticsDaily(appId: string, day: string, rows: AnalyticsDailyRow[]): Promise<void> {
    for (const row of rows) this.analyticsDaily.set(this.analyticsKey(appId, day, row.metric, row.key), { ...row, appId, day });
  }

  async addAnalyticsDaily(appId: string, day: string, row: AnalyticsDailyRow): Promise<void> {
    const key = this.analyticsKey(appId, day, row.metric, row.key);
    const found = this.analyticsDaily.get(key);
    this.analyticsDaily.set(key, { ...row, appId, day, label: row.label ?? found?.label ?? null, value: (found?.value ?? 0) + row.value });
  }

  async listAnalyticsDaily(appId: string, fromDay: string, toDay: string, metrics?: AnalyticsMetric[]): Promise<AnalyticsDailyRecord[]> {
    return [...this.analyticsDaily.values()]
      .filter((r) => r.appId === appId && r.day >= fromDay && r.day <= toDay && (!metrics || metrics.includes(r.metric)))
      .sort((a, b) => a.day.localeCompare(b.day))
      .map(({ day, metric, key, label, value }) => ({ day, metric, key, label, value }));
  }

  async listAnalyticsEventDays(appId: string, fromDay: string): Promise<string[]> {
    return [...new Set(this.analyticsEvents.filter((e) => e.appId === appId && e.day >= fromDay).map((e) => e.day))].sort();
  }

  async listAnalyticsAppIds(fromDay: string): Promise<string[]> {
    return [...new Set(this.analyticsEvents.filter((e) => e.day >= fromDay).map((e) => e.appId))];
  }

  async purgeAnalyticsEvents(beforeDay: string, limit = Infinity): Promise<number> {
    let deleted = 0;
    this.analyticsEvents = this.analyticsEvents.filter((e) => {
      if (e.day >= beforeDay || deleted >= limit) return true;
      deleted += 1;
      return false;
    });
    return deleted;
  }

  async purgeAnalyticsDaily(appId: string, beforeDay: string, limit: number): Promise<number> {
    let deleted = 0;
    for (const [key, row] of this.analyticsDaily) {
      if (deleted >= limit) break;
      if (row.appId !== appId || row.day >= beforeDay) continue;
      this.analyticsDaily.delete(key);
      deleted += 1;
    }
    return deleted;
  }

  // 49 Signed notices to an app's own API
  private apiWebhooks = new Map<string, ApiWebhook>();

  async createApiWebhook(webhook: ApiWebhook): Promise<void> {
    this.apiWebhooks.set(webhook.id, clone(webhook));
  }

  async getApiWebhook(id: string): Promise<ApiWebhook | null> {
    const found = this.apiWebhooks.get(id);
    return found ? clone(found) : null;
  }

  async listDueApiWebhooks(now: Date, limit: number): Promise<ApiWebhook[]> {
    return [...this.apiWebhooks.values()]
      .filter((w) => w.status === "pending" && w.nextAttemptAt !== null && w.nextAttemptAt.getTime() <= now.getTime())
      .sort((a, b) => a.nextAttemptAt!.getTime() - b.nextAttemptAt!.getTime() || a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async claimApiWebhook(id: string, until: Date, now: Date): Promise<boolean> {
    const found = this.apiWebhooks.get(id);
    if (!found || found.status !== "pending" || found.nextAttemptAt === null || found.nextAttemptAt.getTime() > now.getTime()) return false;
    found.nextAttemptAt = until;
    return true;
  }

  async updateApiWebhook(id: string, patch: ApiWebhookPatch): Promise<void> {
    const found = this.apiWebhooks.get(id);
    if (found) this.apiWebhooks.set(id, clone({ ...found, ...patch }));
  }

  async listApiWebhooks(appId: string, limit: number, events?: ApiWebhookEvent[]): Promise<ApiWebhook[]> {
    return [...this.apiWebhooks.values()]
      .filter((w) => w.appId === appId && (!events || events.includes(w.event)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async purgeApiWebhooks(before: Date): Promise<number> {
    let removed = 0;
    for (const [id, w] of this.apiWebhooks) {
      if (w.createdAt.getTime() < before.getTime()) {
        this.apiWebhooks.delete(id);
        removed++;
      }
    }
    return removed;
  }

  // 51 Videos and pictures hosted by Yallapp
  private mediaFiles = new Map<string, MediaFile>();
  private storagePacks = new Map<string, StoragePack>();

  async createMediaFile(file: MediaFile): Promise<void> {
    this.mediaFiles.set(file.id, clone(file));
  }

  async getMediaFile(appId: string, id: string): Promise<MediaFile | null> {
    const file = this.mediaFiles.get(id);
    return file && file.appId === appId ? clone(file) : null;
  }

  async getMediaFileById(id: string): Promise<MediaFile | null> {
    const file = this.mediaFiles.get(id);
    return file ? clone(file) : null;
  }

  async listMediaFiles(appId: string, input: { kind?: MediaKind; status?: MediaStatus; limit?: number } = {}): Promise<MediaFile[]> {
    return [...this.mediaFiles.values()]
      .filter((f) => f.appId === appId && (!input.kind || f.kind === input.kind) && (!input.status || f.status === input.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id))
      .slice(0, input.limit ?? 1000)
      .map(clone);
  }

  async updateMediaFile(appId: string, id: string, patch: MediaFilePatch): Promise<void> {
    const file = this.mediaFiles.get(id);
    if (file && file.appId === appId) this.mediaFiles.set(id, { ...file, ...clone(patch) });
  }

  async deleteMediaFile(appId: string, id: string): Promise<void> {
    if (this.mediaFiles.get(id)?.appId !== appId) return;
    this.mediaFiles.delete(id);
    // 77 As the foreign key cascades.
    this.chatUploads.delete(id);
  }

  async mediaUsage(appId: string): Promise<number> {
    let total = 0;
    for (const file of this.mediaFiles.values()) if (file.appId === appId) total += file.sizeBytes;
    // 97.2 Own fonts count too.
    for (const font of this.ownFonts) if (font.appId === appId) total += font.sizeBytes;
    return total;
  }

  async listStaleMediaUploads(before: Date, limit: number): Promise<MediaFile[]> {
    return [...this.mediaFiles.values()]
      .filter((f) => f.status === "uploading" && f.updatedAt.getTime() < before.getTime())
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async createStoragePack(pack: StoragePack): Promise<void> {
    this.storagePacks.set(pack.id, clone(pack));
  }

  async listStoragePacks(appId: string): Promise<StoragePack[]> {
    return [...this.storagePacks.values()]
      .filter((p) => p.appId === appId)
      .sort((a, b) => b.activeUntil.getTime() - a.activeUntil.getTime() || a.id.localeCompare(b.id))
      .map(clone);
  }

  async updateStoragePack(id: string, patch: StoragePackPatch): Promise<void> {
    const pack = this.storagePacks.get(id);
    if (pack) this.storagePacks.set(id, { ...pack, ...clone(patch) });
  }

  async deleteStoragePack(appId: string, id: string): Promise<void> {
    if (this.storagePacks.get(id)?.appId === appId) this.storagePacks.delete(id);
  }

  async listEndedStoragePacks(now: Date, limit: number): Promise<StoragePack[]> {
    return [...this.storagePacks.values()]
      .filter((p) => p.activeUntil.getTime() < now.getTime() && p.endedNoticeAt === null)
      .sort((a, b) => a.activeUntil.getTime() - b.activeUntil.getTime())
      .slice(0, limit)
      .map(clone);
  }

  // 58 Yallapp Business: devices signed in with the dashboard's account
  private ownerDevices = new Map<string, OwnerDevice>();

  async createOwnerDevice(device: OwnerDevice): Promise<void> {
    this.ownerDevices.set(device.id, clone(device));
  }

  async getOwnerDevice(id: string): Promise<OwnerDevice | null> {
    const device = this.ownerDevices.get(id);
    return device ? clone(device) : null;
  }

  async findOwnerDeviceByRefresh(refreshHash: string): Promise<OwnerDevice | null> {
    for (const device of this.ownerDevices.values()) if (device.refreshHash === refreshHash) return clone(device);
    return null;
  }

  async rotateOwnerRefresh(id: string, oldHash: string, next: { refreshHash: string; refreshExpiresAt: Date; lastSeenAt: Date }): Promise<boolean> {
    const device = this.ownerDevices.get(id);
    if (!device || device.refreshHash !== oldHash) return false;
    Object.assign(device, clone(next));
    return true;
  }

  async updateOwnerDevice(id: string, patch: OwnerDevicePatch): Promise<void> {
    const device = this.ownerDevices.get(id);
    if (device) Object.assign(device, clone(patch));
  }

  async listOwnerDevices(userId: string): Promise<OwnerDevice[]> {
    return [...this.ownerDevices.values()]
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
      .map(clone);
  }

  async deleteOwnerDevice(userId: string, id: string): Promise<boolean> {
    const device = this.ownerDevices.get(id);
    if (!device || device.userId !== userId) return false;
    return this.ownerDevices.delete(id);
  }

  async deleteOwnerDevices(userId: string): Promise<number> {
    let count = 0;
    for (const [id, device] of this.ownerDevices) if (device.userId === userId && this.ownerDevices.delete(id)) count += 1;
    return count;
  }

  async clearOwnerPushToken(token: string, exceptId: string | null): Promise<void> {
    for (const device of this.ownerDevices.values()) if (device.pushToken === token && device.id !== exceptId) device.pushToken = null;
  }

  async purgeOwnerDevices(now: Date): Promise<number> {
    let count = 0;
    for (const [id, device] of this.ownerDevices) if (device.refreshExpiresAt.getTime() <= now.getTime() && this.ownerDevices.delete(id)) count += 1;
    return count;
  }

  async deleteOwnerDevicesOfClient(userId: string, clientId: string): Promise<number> {
    let count = 0;
    for (const [id, device] of this.ownerDevices) if (device.userId === userId && device.clientId === clientId && this.ownerDevices.delete(id)) count += 1;
    return count;
  }

  async listOwnerDevicesOfClient(clientId: string): Promise<OwnerDevice[]> {
    return [...this.ownerDevices.values()].filter((d) => d.clientId === clientId).map(clone);
  }

  // 60 Team members for clients

  private teamMembers: TeamMember[] = [];
  private teamInvitations = new Map<string, TeamInvitation>();
  private teamActivity: TeamActivity[] = [];
  private nextTeamActivityId = 1;

  async listTeamMembers(clientId: string): Promise<TeamMemberRow[]> {
    const rows: TeamMemberRow[] = [];
    for (const member of this.teamMembers.filter((m) => m.clientId === clientId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      const user = await this.getUserById(member.userId);
      if (user) rows.push({ member: clone(member), user });
    }
    return rows;
  }

  async getTeamMember(clientId: string, userId: string): Promise<TeamMember | null> {
    const member = this.teamMembers.find((m) => m.clientId === clientId && m.userId === userId);
    return member ? clone(member) : null;
  }

  async listMembershipsOfUser(userId: string): Promise<TeamMember[]> {
    return this.teamMembers
      .filter((m) => m.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone);
  }

  async saveTeamMember(member: TeamMember): Promise<void> {
    const index = this.teamMembers.findIndex((m) => m.clientId === member.clientId && m.userId === member.userId);
    if (index >= 0) this.teamMembers[index] = clone(member);
    else this.teamMembers.push(clone(member));
  }

  async deleteTeamMember(clientId: string, userId: string): Promise<boolean> {
    const before = this.teamMembers.length;
    this.teamMembers = this.teamMembers.filter((m) => !(m.clientId === clientId && m.userId === userId));
    return this.teamMembers.length < before;
  }

  async createTeamInvitation(invitation: TeamInvitation): Promise<void> {
    this.teamInvitations.set(invitation.id, clone(invitation));
  }

  async getTeamInvitation(clientId: string, id: string): Promise<TeamInvitation | null> {
    const invitation = this.teamInvitations.get(id);
    return invitation && invitation.clientId === clientId ? clone(invitation) : null;
  }

  async getTeamInvitationByToken(tokenHash: string): Promise<TeamInvitation | null> {
    for (const invitation of this.teamInvitations.values()) if (invitation.tokenHash === tokenHash) return clone(invitation);
    return null;
  }

  async listOpenTeamInvitations(clientId: string): Promise<TeamInvitation[]> {
    return [...this.teamInvitations.values()]
      .filter((i) => i.clientId === clientId && !i.acceptedAt && !i.cancelledAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(clone);
  }

  async updateTeamInvitation(clientId: string, id: string, patch: TeamInvitationPatch): Promise<void> {
    const invitation = this.teamInvitations.get(id);
    if (invitation && invitation.clientId === clientId) Object.assign(invitation, clone(patch));
  }

  async acceptTeamInvitation(id: string, tokenHash: string, now: Date): Promise<boolean> {
    const invitation = this.teamInvitations.get(id);
    if (!invitation || invitation.tokenHash !== tokenHash || invitation.acceptedAt || invitation.cancelledAt || invitation.expiresAt.getTime() <= now.getTime()) return false;
    invitation.acceptedAt = now;
    return true;
  }

  async addTeamActivity(entry: Omit<TeamActivity, "id">): Promise<void> {
    this.teamActivity.push({ ...clone(entry), id: this.nextTeamActivityId++ });
  }

  async listTeamActivity(clientId: string, input: { limit: number; offset?: number; actorId?: string }): Promise<{ items: TeamActivity[]; total: number }> {
    const all = this.teamActivity
      .filter((a) => a.clientId === clientId && (!input.actorId || a.actorId === input.actorId))
      .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id - a.id);
    const offset = input.offset ?? 0;
    return { items: all.slice(offset, offset + input.limit).map(clone), total: all.length };
  }
  // 61 Today's numbers counted from every row, as the database's aggregates

  async sumPaidCatalogOrders(appId: string, from: Date, to: Date): Promise<PaidTotals> {
    const paid = new Set(["processing", "completed", "cancelled", "refunded"]);
    return paidTotals(
      [...this.catalogOrders.values()]
        .filter((o) => o.appId === appId && paid.has(o.status) && within(o.paidAt, from, to))
        .map((o) => ({ currency: o.currency, cents: o.totalCents - (o.refundedCents ?? 0) })),
    );
  }

  async sumPaidDonations(appId: string, from: Date, to: Date): Promise<PaidTotals> {
    return paidTotals(
      [...this.donations.values()]
        .filter((d) => d.appId === appId && (d.status === "paid" || d.status === "refunded") && within(d.paidAt, from, to))
        .map((d) => ({ currency: d.currency, cents: d.amountCents - (d.refundedCents ?? 0) })),
    );
  }

  async countHostedUsersCreated(appId: string, from: Date, to: Date): Promise<number> {
    return [...this.hostedUsers.values()].filter((u) => u.appId === appId && within(u.createdAt, from, to)).length;
  }

  async sumRefunds(appId: string, from: Date, to: Date): Promise<PaidTotals> {
    return paidTotals([...this.refunds.values()].filter((r) => r.appId === appId && within(r.createdAt, from, to)).map((r) => ({ currency: r.currency, cents: r.amountCents })));
  }

  async countEnrollmentsInWindow(appId: string, from: Date, to: Date): Promise<{ total: number; paid: number }> {
    const rows = this.courseEnrollments.filter((e) => e.appId === appId && within(e.enrolledAt, from, to));
    return { total: rows.length, paid: rows.filter((e) => e.source === "paid").length };
  }

  async countAppointmentsMade(appId: string, from: Date, to: Date): Promise<number> {
    return [...this.bookingAppointments.values()].filter((a) => a.appId === appId && within(a.createdAt, from, to)).length;
  }

  async countTicketsInWindow(appId: string, from: Date, to: Date): Promise<{ issued: number; checkedIn: number }> {
    const tickets = [...this.tickets.values()].filter((t) => t.appId === appId);
    return {
      issued: tickets.filter((t) => (t.status === "valid" || t.status === "used") && within(t.createdAt, from, to)).length,
      checkedIn: tickets.filter((t) => within(t.usedAt, from, to)).length,
    };
  }

  // 61 Notifications sent later

  private scheduledNotifications = new Map<number, ScheduledNotification>();
  private nextScheduledId = 1;

  async createScheduledNotification(input: Omit<ScheduledNotification, "id">): Promise<ScheduledNotification> {
    const row: ScheduledNotification = { ...clone(input), id: this.nextScheduledId++ };
    this.scheduledNotifications.set(row.id, clone(row));
    return row;
  }

  async getScheduledNotification(appId: string, id: number): Promise<ScheduledNotification | null> {
    const row = this.scheduledNotifications.get(id);
    return row && row.appId === appId ? clone(row) : null;
  }

  async listScheduledNotifications(appId: string, statuses: ScheduledNotificationStatus[]): Promise<ScheduledNotification[]> {
    return [...this.scheduledNotifications.values()]
      .filter((n) => n.appId === appId && statuses.includes(n.status))
      .sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime() || a.id - b.id)
      .map(clone);
  }

  async listDueScheduledNotifications(now: Date, limit: number): Promise<ScheduledNotification[]> {
    return [...this.scheduledNotifications.values()]
      .filter((n) => n.status === "scheduled" && n.sendAt.getTime() <= now.getTime())
      .sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime() || a.id - b.id)
      .slice(0, limit)
      .map(clone);
  }

  async listStaleScheduledNotifications(before: Date): Promise<ScheduledNotification[]> {
    return [...this.scheduledNotifications.values()].filter((n) => n.status === "sending" && n.claimedAt !== null && n.claimedAt.getTime() < before.getTime()).map(clone);
  }

  async updateScheduledNotification(appId: string, id: number, expect: ScheduledNotificationStatus, patch: ScheduledNotificationPatch): Promise<boolean> {
    const row = this.scheduledNotifications.get(id);
    if (!row || row.appId !== appId || row.status !== expect) return false;
    this.scheduledNotifications.set(id, clone({ ...row, ...patch }));
    return true;
  }

  // 85.3 Automatic notifications

  private autoNotices = new Set<string>();
  private hostedCarts = new Map<string, HostedCart>();

  async claimAutoNotice(input: { appId: string; kind: string; ref: string; userId: number; now: Date }): Promise<boolean> {
    const key = JSON.stringify([input.appId, input.kind, input.ref, input.userId]);
    if (this.autoNotices.has(key)) return false;
    this.autoNotices.add(key);
    return true;
  }

  async saveHostedCart(appId: string, userId: number, items: number, now: Date): Promise<void> {
    const key = `${appId}:${userId}`;
    const found = this.hostedCarts.get(key);
    this.hostedCarts.set(key, { appId, userId, items, updatedAt: new Date(now), remindedAt: found?.remindedAt ?? null });
  }

  async listLeftHostedCarts(after: Date, before: Date, limit: number): Promise<HostedCart[]> {
    return [...this.hostedCarts.values()]
      .filter((c) => c.items > 0 && c.updatedAt >= after && c.updatedAt < before && (c.remindedAt === null || c.remindedAt < c.updatedAt))
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async markHostedCartReminded(appId: string, userId: number, seenAt: Date, now: Date): Promise<boolean> {
    const cart = this.hostedCarts.get(`${appId}:${userId}`);
    if (!cart || cart.updatedAt.getTime() !== seenAt.getTime()) return false;
    this.hostedCarts.set(`${appId}:${userId}`, { ...cart, remindedAt: new Date(now) });
    return true;
  }

  // 91.2 Order watches

  private orderWatches = new Map<string, HostedOrderWatch>();

  async watchHostedOrders(appId: string, userId: number, until: Date): Promise<void> {
    const key = `${appId}:${userId}`;
    const found = this.orderWatches.get(key);
    if (found) {
      if (until > found.until) found.until = new Date(until);
      return;
    }
    this.orderWatches.set(key, { appId, userId, orders: {}, checkedAt: null, until: new Date(until) });
  }

  async listDueOrderWatches(checkedBefore: Date, now: Date, limit: number): Promise<HostedOrderWatch[]> {
    return [...this.orderWatches.values()]
      .filter((w) => w.until > now && (w.checkedAt === null || w.checkedAt < checkedBefore))
      .sort((a, b) => (a.checkedAt?.getTime() ?? 0) - (b.checkedAt?.getTime() ?? 0))
      .slice(0, limit)
      .map(clone);
  }

  async saveOrderWatch(appId: string, userId: number, orders: Record<string, string>, checkedAt: Date): Promise<void> {
    const found = this.orderWatches.get(`${appId}:${userId}`);
    if (found) Object.assign(found, { orders: { ...orders }, checkedAt: new Date(checkedAt) });
  }

  async deleteEndedOrderWatches(now: Date): Promise<number> {
    let n = 0;
    for (const [key, w] of this.orderWatches) {
      if (w.until <= now) {
        this.orderWatches.delete(key);
        n++;
      }
    }
    return n;
  }

  // 91.4 Loyalty points

  private loyaltyBalances = new Map<string, number>();
  private loyaltyEntries: LoyaltyEntry[] = [];

  async getLoyaltyBalance(appId: string, userId: number): Promise<number> {
    return this.loyaltyBalances.get(`${appId}:${userId}`) ?? 0;
  }

  async changeLoyaltyPoints(input: { appId: string; userId: number; orderId: number | null; points: number; reason: LoyaltyReason; now: Date }): Promise<number> {
    const key = `${input.appId}:${input.userId}`;
    const balance = this.loyaltyBalances.get(key) ?? 0;
    const change = Math.max(input.points, -balance);
    if (change === 0) return 0;
    this.loyaltyBalances.set(key, balance + change);
    this.loyaltyEntries.push({ id: this.loyaltyEntries.length + 1, appId: input.appId, userId: input.userId, orderId: input.orderId, points: change, reason: input.reason, createdAt: new Date(input.now) });
    return change;
  }

  async listLoyaltyEntries(appId: string, userId: number, limit: number): Promise<LoyaltyEntry[]> {
    return this.loyaltyEntries
      .filter((e) => e.appId === appId && e.userId === userId)
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map(clone);
  }

  // 85.2 Notification campaigns

  private notificationCampaigns = new Map<number, NotificationCampaign>();
  private nextNotificationCampaignId = 1;
  private campaignSends: CampaignSend[] = [];
  private nextCampaignSendId = 1;

  async createNotificationCampaign(input: Omit<NotificationCampaign, "id">): Promise<NotificationCampaign> {
    const row: NotificationCampaign = { ...clone(input), id: this.nextNotificationCampaignId++ };
    this.notificationCampaigns.set(row.id, clone(row));
    return row;
  }

  async getNotificationCampaign(appId: string, id: number): Promise<NotificationCampaign | null> {
    const row = this.notificationCampaigns.get(id);
    return row && row.appId === appId ? clone(row) : null;
  }

  async listNotificationCampaigns(appId: string, limit: number): Promise<NotificationCampaign[]> {
    return [...this.notificationCampaigns.values()]
      .filter((c) => c.appId === appId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .slice(0, limit)
      .map(clone);
  }

  async updateNotificationCampaign(appId: string, id: number, expect: NotificationCampaignStatus | null, patch: NotificationCampaignPatch): Promise<boolean> {
    const row = this.notificationCampaigns.get(id);
    if (!row || row.appId !== appId || (expect !== null && row.status !== expect)) return false;
    this.notificationCampaigns.set(id, clone({ ...row, ...patch }));
    return true;
  }

  async deleteNotificationCampaign(appId: string, id: number): Promise<boolean> {
    const row = this.notificationCampaigns.get(id);
    if (!row || row.appId !== appId) return false;
    this.notificationCampaigns.delete(id);
    this.campaignSends = this.campaignSends.filter((s) => s.campaignId !== id);
    return true;
  }

  async listDueNotificationCampaigns(now: Date, limit: number): Promise<NotificationCampaign[]> {
    return [...this.notificationCampaigns.values()]
      .filter((c) => c.status === "scheduled" && c.sendAt !== null && c.sendAt.getTime() <= now.getTime())
      .sort((a, b) => a.sendAt!.getTime() - b.sendAt!.getTime() || a.id - b.id)
      .slice(0, limit)
      .map(clone);
  }

  async listStaleNotificationCampaigns(before: Date): Promise<NotificationCampaign[]> {
    return [...this.notificationCampaigns.values()].filter((c) => c.status === "sending" && c.claimedAt !== null && c.claimedAt.getTime() < before.getTime()).map(clone);
  }

  async createCampaignSend(input: Omit<CampaignSend, "id">): Promise<CampaignSend> {
    const row: CampaignSend = { ...clone(input), id: this.nextCampaignSendId++ };
    this.campaignSends.push(clone(row));
    return row;
  }

  async updateCampaignSend(appId: string, id: number, patch: Partial<Pick<CampaignSend, "notificationId" | "recipients" | "reportedAt">>): Promise<void> {
    const row = this.campaignSends.find((s) => s.appId === appId && s.id === id);
    if (row) Object.assign(row, clone(patch));
  }

  async deleteCampaignSend(appId: string, id: number): Promise<void> {
    this.campaignSends = this.campaignSends.filter((s) => !(s.appId === appId && s.id === id));
  }

  async reportCampaignSend(appId: string, id: number, numbers: { pushed: number; failed: number }, now: Date): Promise<CampaignSend | null> {
    const row = this.campaignSends.find((s) => s.appId === appId && s.id === id);
    if (!row || row.reportedAt !== null) return null;
    Object.assign(row, { ...numbers, reportedAt: new Date(now) });
    return clone(row);
  }

  async listCampaignSends(appId: string, campaignIds: number[]): Promise<CampaignSend[]> {
    return this.campaignSends
      .filter((s) => s.appId === appId && campaignIds.includes(s.campaignId))
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime() || b.id - a.id)
      .map(clone);
  }

  // 61 Announcements pushed when they start

  async claimAnnouncementPush(id: string, now: Date): Promise<boolean> {
    const announcement = this.announcements.get(id);
    if (!announcement || announcement.pushedAt) return false;
    this.announcements.set(id, clone({ ...announcement, pushedAt: now }));
    return true;
  }

  // 66 Requests to delete a Yallapp account

  private accountDeletions = new Map<string, AccountDeletionRequest>();

  async createAccountDeletionRequest(request: AccountDeletionRequest): Promise<boolean> {
    if (request.status === "pending" && (await this.getOpenAccountDeletionRequest(request.clientId))) return false;
    this.accountDeletions.set(request.id, clone(request));
    return true;
  }

  async getAccountDeletionRequest(id: string): Promise<AccountDeletionRequest | null> {
    const request = this.accountDeletions.get(id);
    return request ? clone(request) : null;
  }

  async getOpenAccountDeletionRequest(clientId: string): Promise<AccountDeletionRequest | null> {
    for (const request of this.accountDeletions.values()) if (request.clientId === clientId && request.status === "pending") return clone(request);
    return null;
  }

  async listAccountDeletionRequests(statuses: AccountDeletionStatus[], limit: number): Promise<AccountDeletionRequest[]> {
    return [...this.accountDeletions.values()]
      .filter((r) => !statuses.length || statuses.includes(r.status))
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime() || b.id.localeCompare(a.id))
      .slice(0, limit)
      .map(clone);
  }

  async closeAccountDeletionRequest(id: string, close: AccountDeletionClose): Promise<boolean> {
    const request = this.accountDeletions.get(id);
    if (!request || request.status !== "pending") return false;
    this.accountDeletions.set(id, clone({ ...request, ...close }));
    return true;
  }

  // 70 Sessions kept on the server, and two-step sign-in
  private userSessions = new Map<string, UserSession>();
  private twoFactor = new Map<string, UserTwoFactor>();
  /** By user: code hash → when it was used (null: unused). */
  private recoveryCodes = new Map<string, Map<string, Date | null>>();

  async createUserSession(session: UserSession): Promise<void> {
    this.userSessions.set(session.idHash, clone(session));
  }

  async getUserSession(idHash: string): Promise<UserSession | null> {
    const session = this.userSessions.get(idHash);
    return session ? clone(session) : null;
  }

  async deleteUserSession(idHash: string): Promise<void> {
    this.userSessions.delete(idHash);
  }

  async deleteUserSessions(userId: string): Promise<number> {
    let count = 0;
    for (const [key, session] of this.userSessions) if (session.userId === userId && this.userSessions.delete(key)) count += 1;
    return count;
  }

  async deleteExpiredUserSessions(now: Date): Promise<number> {
    let count = 0;
    for (const [key, session] of this.userSessions) if (session.expiresAt.getTime() <= now.getTime() && this.userSessions.delete(key)) count += 1;
    return count;
  }

  async getTwoFactor(userId: string): Promise<UserTwoFactor | null> {
    const record = this.twoFactor.get(userId);
    return record ? clone(record) : null;
  }

  async saveTwoFactorSetup(userId: string, secretEncrypted: string, now: Date): Promise<boolean> {
    const existing = this.twoFactor.get(userId);
    if (existing?.enabledAt) return false;
    this.twoFactor.set(userId, { userId, secretEncrypted, enabledAt: null, lastStep: 0, createdAt: existing?.createdAt ?? now, updatedAt: now });
    return true;
  }

  async enableTwoFactor(userId: string, step: number, recoveryHashes: string[], now: Date): Promise<boolean> {
    const existing = this.twoFactor.get(userId);
    if (!existing || existing.enabledAt) return false;
    this.twoFactor.set(userId, { ...existing, enabledAt: now, lastStep: step, updatedAt: now });
    this.recoveryCodes.set(userId, new Map(recoveryHashes.map((hash) => [hash, null])));
    return true;
  }

  async useTwoFactorStep(userId: string, step: number, now: Date): Promise<boolean> {
    const existing = this.twoFactor.get(userId);
    if (!existing?.enabledAt || existing.lastStep >= step) return false;
    this.twoFactor.set(userId, { ...existing, lastStep: step, updatedAt: now });
    return true;
  }

  async useRecoveryCode(userId: string, codeHash: string, now: Date): Promise<boolean> {
    const codes = this.recoveryCodes.get(userId);
    if (!codes || !codes.has(codeHash) || codes.get(codeHash) !== null) return false;
    codes.set(codeHash, now);
    return true;
  }

  async replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
    this.recoveryCodes.set(userId, new Map(codeHashes.map((hash) => [hash, null])));
  }

  async countUnusedRecoveryCodes(userId: string): Promise<number> {
    return [...(this.recoveryCodes.get(userId)?.values() ?? [])].filter((used) => used === null).length;
  }

  async deleteTwoFactor(userId: string): Promise<boolean> {
    this.recoveryCodes.delete(userId);
    return this.twoFactor.delete(userId);
  }

  // 73 Deleting an app: a deleted app moves out of `apps` (so every read leaves it out) until it is restored or purged.
  private deletedApps = new Map<string, App>();
  private appDeletions = new Map<string, AppDeletion>();
  private keptBilling = new Map<string, KeptBillingRecord>();

  async softDeleteApp(deletion: AppDeletion): Promise<boolean> {
    const app = this.apps.get(deletion.appId);
    if (!app || app.clientId !== deletion.clientId) return false;
    this.apps.delete(app.id);
    this.deletedApps.set(app.id, clone({ ...app, deletedAt: deletion.deletedAt, deletedBy: deletion.deletedBy }));
    this.appDeletions.set(deletion.id, clone(deletion));
    return true;
  }

  async restoreDeletedApp(deletionId: string, by: string, now: Date): Promise<boolean> {
    const deletion = this.appDeletions.get(deletionId);
    const app = deletion ? this.deletedApps.get(deletion.appId) : undefined;
    if (!deletion || deletion.status !== "waiting" || !app) return false;
    this.deletedApps.delete(app.id);
    this.apps.set(app.id, clone({ ...app, deletedAt: null, deletedBy: null, updatedAt: now }));
    this.appDeletions.set(deletionId, clone({ ...deletion, status: "restored", closedAt: now, closedBy: by }));
    return true;
  }

  async getAppDeletion(id: string): Promise<AppDeletion | null> {
    const deletion = this.appDeletions.get(id);
    return deletion ? clone(deletion) : null;
  }

  async listAppDeletions(input: { statuses: AppDeletionStatus[]; clientId?: string; limit: number }): Promise<AppDeletion[]> {
    return [...this.appDeletions.values()]
      .filter((d) => (!input.statuses.length || input.statuses.includes(d.status)) && (!input.clientId || d.clientId === input.clientId))
      .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime() || b.id.localeCompare(a.id))
      .slice(0, input.limit)
      .map(clone);
  }

  async listDueAppDeletions(now: Date, limit: number): Promise<AppDeletion[]> {
    return [...this.appDeletions.values()]
      .filter((d) => d.status === "waiting" && d.purgeAfter.getTime() <= now.getTime())
      .sort((a, b) => a.purgeAfter.getTime() - b.purgeAfter.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async getAppIncludingDeleted(id: string): Promise<App | null> {
    const app = this.apps.get(id) ?? this.deletedApps.get(id);
    return app ? clone(app) : null;
  }

  async listAppsByClientIncludingDeleted(clientId: string): Promise<App[]> {
    return [...this.apps.values(), ...this.deletedApps.values()]
      .filter((a) => a.clientId === clientId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .map(clone);
  }

  async purgeDeletedApp(deletionId: string, by: string, now: Date, pendingBuilds: string[]): Promise<boolean> {
    const deletion = this.appDeletions.get(deletionId);
    if (!deletion || deletion.status !== "waiting") return false;
    this.appDeletions.set(deletionId, clone({ ...deletion, status: "purged", closedAt: now, closedBy: by, pendingBuilds }));
    this.cascadeApp(deletion.appId);
    return true;
  }

  async createAppDeletionRecord(deletion: AppDeletion): Promise<void> {
    this.appDeletions.set(deletion.id, clone(deletion));
  }

  async setAppDeletionPendingBuilds(id: string, builds: string[]): Promise<void> {
    const deletion = this.appDeletions.get(id);
    if (deletion) this.appDeletions.set(id, clone({ ...deletion, pendingBuilds: builds }));
  }

  async listAppDeletionsWithPendingBuilds(limit: number): Promise<AppDeletion[]> {
    return [...this.appDeletions.values()]
      .filter((d) => d.status === "purged" && d.pendingBuilds.length > 0)
      .sort((a, b) => a.deletedAt.getTime() - b.deletedAt.getTime())
      .slice(0, limit)
      .map(clone);
  }

  async listAppAssetReferences(appId: string): Promise<string[]> {
    // Every row of the app, as the database's foreign keys would find them.
    const rows: unknown[] = [];
    for (const table of this.tables()) for (const row of table.rows()) if (row.appId === appId) rows.push(row);
    const app = this.apps.get(appId) ?? this.deletedApps.get(appId);
    if (app) rows.push(app);
    return assetIdsIn(JSON.stringify(rows));
  }

  async keepBillingRecords(records: KeptBillingRecord[]): Promise<void> {
    for (const record of records) this.keptBilling.set(record.id, clone(record));
  }

  async listKeptBillingRecords(input: { clientId?: string; limit: number }): Promise<KeptBillingRecord[]> {
    return [...this.keptBilling.values()]
      .filter((r) => !input.clientId || r.clientId === input.clientId)
      .sort((a, b) => b.keptAt.getTime() - a.keptAt.getTime() || (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0))
      .slice(0, input.limit)
      .map(clone);
  }

  async getKeptBillingRecord(id: string): Promise<KeptBillingRecord | null> {
    const record = this.keptBilling.get(id);
    return record ? clone(record) : null;
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    if (!this.users.has(userId)) return false;
    const clientIds = [...this.clients.values()].filter((c) => c.userId === userId).map((c) => c.id);
    for (const clientId of clientIds) {
      for (const app of [...this.apps.values(), ...this.deletedApps.values()]) if (app.clientId === clientId) this.cascadeApp(app.id);
      for (const license of this.licenses.values()) if (license.clientId === clientId) this.activations.delete(license.id);
      // Their payments go with the client, as `on delete cascade` does: the caller keeps them first.
      for (const table of this.tables()) table.remove((row) => row.clientId === clientId);
      for (const dismissed of this.announcementDismissals.values()) dismissed.delete(clientId);
      this.clients.delete(clientId);
    }
    // Their sessions, two-step sign-in, phones, reset links and team memberships elsewhere.
    for (const table of this.tables()) table.remove((row) => row.userId === userId);
    this.recoveryCodes.delete(userId);
    this.updateReads.delete(userId);
    this.users.delete(userId);
    return true;
  }

  // 77 Chat. Participants and blocks carry their app (as the rows they belong to do in MySQL) so an app's deletion takes them.
  private chatMembers = new Map<string, ChatMember>();
  private chatConversations = new Map<string, ChatConversation>();
  private chatParticipants = new Map<string, ChatParticipant & { appId: string }>();
  private chatMessages = new Map<number, ChatMessage>();
  private nextChatMessageId = 1;
  private chatReports = new Map<string, ChatReport>();
  private chatBlocks = new Map<string, { appId: string; memberId: string; blockedId: string; createdAt: Date }>();
  private chatSessions = new Map<string, ChatSession>();
  private chatUploads = new Map<string, ChatUploadInfo>();

  private static participantKey = (conversationId: string, memberId: string) => `${conversationId}|${memberId}`;
  private static bare = ({ appId: _appId, ...participant }: ChatParticipant & { appId: string }): ChatParticipant => (void _appId, clone(participant));

  async upsertChatMember(input: { appId: string; source: ChatMemberSource; externalId: string; name: string; imageUrl: string | null }, now: Date): Promise<ChatMember> {
    const found = [...this.chatMembers.values()].find((m) => m.appId === input.appId && m.source === input.source && m.externalId === input.externalId);
    if (found) {
      const updated = { ...found, name: input.name, imageUrl: input.imageUrl, updatedAt: now };
      this.chatMembers.set(found.id, updated);
      return clone(updated);
    }
    const member: ChatMember = { id: newId(), ...input, blockedAt: null, createdAt: now, updatedAt: now };
    this.chatMembers.set(member.id, member);
    return clone(member);
  }

  async getChatMember(appId: string, id: string): Promise<ChatMember | null> {
    const member = this.chatMembers.get(id);
    return member && member.appId === appId ? clone(member) : null;
  }

  async findChatMember(appId: string, source: ChatMemberSource, externalId: string): Promise<ChatMember | null> {
    const found = [...this.chatMembers.values()].find((m) => m.appId === appId && m.source === source && m.externalId === externalId);
    return found ? clone(found) : null;
  }

  async listChatMembersByIds(appId: string, ids: string[]): Promise<ChatMember[]> {
    return ids.map((id) => this.chatMembers.get(id)).filter((m): m is ChatMember => Boolean(m) && m!.appId === appId).map(clone);
  }

  async setChatMemberBlocked(appId: string, id: string, blockedAt: Date | null, now: Date): Promise<boolean> {
    const member = this.chatMembers.get(id);
    if (!member || member.appId !== appId) return false;
    this.chatMembers.set(id, { ...member, blockedAt, updatedAt: now });
    return true;
  }

  async deleteChatMember(appId: string, id: string): Promise<void> {
    const member = this.chatMembers.get(id);
    if (!member || member.appId !== appId) return;
    // As the foreign keys cascade: their direct conversation (and its messages), messages, places, reports, blocks, sessions, uploads.
    const direct = [...this.chatConversations.values()].filter((c) => c.memberId === id).map((c) => c.id);
    for (const [key, message] of this.chatMessages) if (message.memberId === id || direct.includes(message.conversationId)) this.chatMessages.delete(key);
    for (const conversationId of direct) this.chatConversations.delete(conversationId);
    for (const [key, p] of this.chatParticipants) if (p.memberId === id || direct.includes(p.conversationId)) this.chatParticipants.delete(key);
    for (const [key, r] of this.chatReports) if (r.reporterId === id || !this.chatMessages.has(r.messageId)) this.chatReports.delete(key);
    for (const [key, b] of this.chatBlocks) if (b.memberId === id || b.blockedId === id) this.chatBlocks.delete(key);
    for (const [key, session] of this.chatSessions) if (session.memberId === id) this.chatSessions.delete(key);
    for (const [key, upload] of this.chatUploads) if (upload.memberId === id) this.chatUploads.delete(key);
    this.chatMembers.delete(id);
    this.refreshLastMessages(appId);
  }

  /** Each conversation's last message, after messages were removed. */
  private refreshLastMessages(appId: string): void {
    for (const conversation of this.chatConversations.values()) {
      if (conversation.appId !== appId) continue;
      const last = [...this.chatMessages.values()].filter((m) => m.conversationId === conversation.id).sort((a, b) => b.id - a.id)[0];
      this.chatConversations.set(conversation.id, { ...conversation, lastMessageId: last?.id ?? null, lastMessageAt: last?.createdAt ?? null });
    }
  }

  async ensureDirectConversation(appId: string, memberId: string, now: Date): Promise<ChatConversation> {
    let conversation = [...this.chatConversations.values()].find((c) => c.appId === appId && c.kind === "direct" && c.memberId === memberId);
    if (!conversation) {
      conversation = { id: newId(), appId, kind: "direct", memberId, courseKey: null, title: null, imageUrl: null, lastMessageId: null, lastMessageAt: null, businessReadId: null, keepUntil: null, noticeFor: null, createdAt: now, updatedAt: now };
      this.chatConversations.set(conversation.id, conversation);
    }
    await this.addChatParticipant(conversation.id, memberId, now);
    return clone(conversation);
  }

  async ensureGroupConversation(input: { appId: string; courseKey: string; title: string; imageUrl: string | null }, now: Date): Promise<ChatConversation> {
    const found = [...this.chatConversations.values()].find((c) => c.appId === input.appId && c.kind === "group" && c.courseKey === input.courseKey);
    if (found) {
      if (found.title === input.title && found.imageUrl === input.imageUrl) return clone(found);
      const updated = { ...found, title: input.title, imageUrl: input.imageUrl, updatedAt: now };
      this.chatConversations.set(found.id, updated);
      return clone(updated);
    }
    const conversation: ChatConversation = { id: newId(), appId: input.appId, kind: "group", memberId: null, courseKey: input.courseKey, title: input.title, imageUrl: input.imageUrl, lastMessageId: null, lastMessageAt: null, businessReadId: null, keepUntil: null, noticeFor: null, createdAt: now, updatedAt: now };
    this.chatConversations.set(conversation.id, conversation);
    return clone(conversation);
  }

  async getChatConversation(appId: string, id: string): Promise<ChatConversation | null> {
    const conversation = this.chatConversations.get(id);
    return conversation && conversation.appId === appId ? clone(conversation) : null;
  }

  async updateChatConversation(id: string, patch: ChatConversationPatch): Promise<void> {
    const conversation = this.chatConversations.get(id);
    if (conversation) this.chatConversations.set(id, { ...conversation, ...patch });
  }

  async listChatConversations(appId: string, input: { kind?: ChatConversationKind; limit: number }): Promise<ChatConversation[]> {
    return [...this.chatConversations.values()]
      .filter((c) => c.appId === appId && c.lastMessageId !== null && (!input.kind || c.kind === input.kind))
      .sort((a, b) => (b.lastMessageId ?? 0) - (a.lastMessageId ?? 0))
      .slice(0, input.limit)
      .map(clone);
  }

  async listMemberConversations(appId: string, memberId: string): Promise<{ conversation: ChatConversation; participant: ChatParticipant }[]> {
    const out: { conversation: ChatConversation; participant: ChatParticipant }[] = [];
    for (const participant of this.chatParticipants.values()) {
      if (participant.memberId !== memberId || participant.appId !== appId) continue;
      const conversation = this.chatConversations.get(participant.conversationId);
      if (conversation) out.push({ conversation: clone(conversation), participant: MemoryStore.bare(participant) });
    }
    return out;
  }

  async setMemberGroups(appId: string, memberId: string, conversationIds: string[], now: Date): Promise<void> {
    const wanted = new Set(conversationIds);
    for (const [key, participant] of this.chatParticipants) {
      if (participant.memberId !== memberId || participant.appId !== appId) continue;
      if (this.chatConversations.get(participant.conversationId)?.kind === "group" && !wanted.has(participant.conversationId)) this.chatParticipants.delete(key);
    }
    for (const id of wanted) await this.addChatParticipant(id, memberId, now);
  }

  async addChatParticipant(conversationId: string, memberId: string, now: Date): Promise<void> {
    const key = MemoryStore.participantKey(conversationId, memberId);
    const conversation = this.chatConversations.get(conversationId);
    if (!conversation || this.chatParticipants.has(key)) return;
    this.chatParticipants.set(key, { appId: conversation.appId, conversationId, memberId, readId: null, joinedAt: now });
  }

  async getChatParticipant(conversationId: string, memberId: string): Promise<ChatParticipant | null> {
    const participant = this.chatParticipants.get(MemoryStore.participantKey(conversationId, memberId));
    return participant ? MemoryStore.bare(participant) : null;
  }

  async listChatParticipants(conversationId: string): Promise<ChatParticipant[]> {
    return [...this.chatParticipants.values()].filter((p) => p.conversationId === conversationId).map(MemoryStore.bare);
  }

  async setChatRead(conversationId: string, memberId: string, messageId: number): Promise<void> {
    const key = MemoryStore.participantKey(conversationId, memberId);
    const participant = this.chatParticipants.get(key);
    if (participant && (participant.readId === null || participant.readId < messageId)) this.chatParticipants.set(key, { ...participant, readId: messageId });
  }

  async createChatMessage(input: Omit<ChatMessage, "id">): Promise<{ message: ChatMessage; created: boolean }> {
    if (input.clientId) {
      const same = [...this.chatMessages.values()].find((m) => m.conversationId === input.conversationId && m.clientId === input.clientId);
      if (same) return { message: clone(same), created: false };
    }
    const message: ChatMessage = { id: this.nextChatMessageId++, ...input };
    this.chatMessages.set(message.id, message);
    const conversation = this.chatConversations.get(input.conversationId);
    if (conversation) this.chatConversations.set(conversation.id, { ...conversation, lastMessageId: message.id, lastMessageAt: message.createdAt, updatedAt: message.createdAt });
    return { message: clone(message), created: true };
  }

  async getChatMessage(appId: string, id: number): Promise<ChatMessage | null> {
    const message = this.chatMessages.get(id);
    return message && message.appId === appId ? clone(message) : null;
  }

  async listChatMessages(conversationId: string, input: { after?: number; before?: number; limit: number; hideFrom?: string[] }): Promise<ChatMessage[]> {
    const hidden = new Set(input.hideFrom ?? []);
    const all = [...this.chatMessages.values()].filter((m) => m.conversationId === conversationId && !(m.memberId && hidden.has(m.memberId)));
    if (input.after !== undefined) return all.filter((m) => m.id > input.after!).sort((a, b) => a.id - b.id).slice(0, input.limit).map(clone);
    return all
      .filter((m) => input.before === undefined || m.id < input.before)
      .sort((a, b) => b.id - a.id)
      .slice(0, input.limit)
      .map(clone);
  }

  async countChatUnread(conversationId: string, afterId: number | null, input: { notFromMember?: string; fromMembersOnly?: boolean; hideFrom?: string[] }): Promise<number> {
    const hidden = new Set(input.hideFrom ?? []);
    let count = 0;
    for (const m of this.chatMessages.values()) {
      if (m.conversationId !== conversationId || m.deletedAt || (afterId !== null && m.id <= afterId)) continue;
      if (input.fromMembersOnly && m.senderKind !== "member") continue;
      if (input.notFromMember && m.memberId === input.notFromMember) continue;
      if (m.memberId && hidden.has(m.memberId)) continue;
      count += 1;
    }
    return count;
  }

  async deleteChatMessage(appId: string, id: number, now: Date): Promise<boolean> {
    const message = this.chatMessages.get(id);
    if (!message || message.appId !== appId || message.deletedAt) return false;
    this.chatMessages.set(id, { ...message, text: null, mediaId: null, durationSeconds: null, deletedAt: now });
    return true;
  }

  async clearChatConversation(appId: string, conversationId: string): Promise<string[]> {
    const media: string[] = [];
    for (const [id, m] of this.chatMessages) {
      if (m.appId !== appId || m.conversationId !== conversationId) continue;
      if (m.mediaId) media.push(m.mediaId);
      this.chatMessages.delete(id);
    }
    for (const [key, r] of this.chatReports) if (r.conversationId === conversationId) this.chatReports.delete(key);
    const conversation = this.chatConversations.get(conversationId);
    if (conversation && conversation.appId === appId) this.chatConversations.set(conversationId, { ...conversation, lastMessageId: null, lastMessageAt: null });
    return media;
  }

  async listChatMediaOfMember(appId: string, memberId: string): Promise<string[]> {
    const direct = new Set([...this.chatConversations.values()].filter((c) => c.appId === appId && c.memberId === memberId).map((c) => c.id));
    const media = [...this.chatMessages.values()].filter((m) => m.appId === appId && m.mediaId && (m.memberId === memberId || direct.has(m.conversationId))).map((m) => m.mediaId!);
    for (const upload of this.chatUploads.values()) if (upload.appId === appId && upload.memberId === memberId) media.push(upload.mediaId);
    return [...new Set(media)];
  }

  async deleteChatMessagesBefore(conversationId: string, before: Date): Promise<string[]> {
    const media: string[] = [];
    let appId: string | null = null;
    for (const [id, m] of this.chatMessages) {
      if (m.conversationId !== conversationId || m.createdAt.getTime() >= before.getTime()) continue;
      if (m.mediaId) media.push(m.mediaId);
      appId = m.appId;
      this.chatMessages.delete(id);
    }
    for (const [key, r] of this.chatReports) if (!this.chatMessages.has(r.messageId)) this.chatReports.delete(key);
    if (appId) this.refreshLastMessages(appId);
    return media;
  }

  async listChatConversationsWithMessagesBefore(
    olderThan: Date,
    limit: number,
    input: { appId?: string; notKeptAt?: Date } = {},
  ): Promise<{ conversation: ChatConversation; oldest: Date }[]> {
    const oldest = new Map<string, Date>();
    for (const m of this.chatMessages.values()) {
      if (input.appId && m.appId !== input.appId) continue;
      const seen = oldest.get(m.conversationId);
      if (!seen || m.createdAt.getTime() < seen.getTime()) oldest.set(m.conversationId, m.createdAt);
    }
    const kept = (c: ChatConversation | undefined) => Boolean(input.notKeptAt && c?.keepUntil && c.keepUntil.getTime() > input.notKeptAt.getTime());
    return [...oldest]
      .filter(([id, at]) => at.getTime() < olderThan.getTime() && this.chatConversations.has(id) && !kept(this.chatConversations.get(id)))
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .slice(0, limit)
      .map(([id, at]) => ({ conversation: clone(this.chatConversations.get(id)!), oldest: at }));
  }

  async createChatReport(report: ChatReport): Promise<boolean> {
    if ([...this.chatReports.values()].some((r) => r.messageId === report.messageId && r.reporterId === report.reporterId)) return false;
    this.chatReports.set(report.id, clone(report));
    return true;
  }

  async getChatReport(appId: string, id: string): Promise<ChatReport | null> {
    const report = this.chatReports.get(id);
    return report && report.appId === appId ? clone(report) : null;
  }

  async listChatReports(appId: string, input: { status: "open" | "closed"; limit: number }): Promise<ChatReport[]> {
    return [...this.chatReports.values()]
      .filter((r) => r.appId === appId && r.status === input.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, input.limit)
      .map(clone);
  }

  async countOpenChatReports(appId: string): Promise<number> {
    return [...this.chatReports.values()].filter((r) => r.appId === appId && r.status === "open").length;
  }

  async closeChatReports(appId: string, messageId: number, outcome: ChatReportOutcome, by: string, now: Date): Promise<number> {
    let closed = 0;
    for (const [id, r] of this.chatReports) {
      if (r.appId !== appId || r.messageId !== messageId || r.status !== "open") continue;
      this.chatReports.set(id, { ...r, status: "closed", outcome, closedBy: by, closedAt: now });
      closed += 1;
    }
    return closed;
  }

  async listChatBlocks(memberId: string): Promise<string[]> {
    return [...this.chatBlocks.values()].filter((b) => b.memberId === memberId).map((b) => b.blockedId);
  }

  async setChatBlock(memberId: string, blockedId: string, blocked: boolean, now: Date): Promise<void> {
    const key = `${memberId}|${blockedId}`;
    const member = this.chatMembers.get(memberId);
    if (!blocked) this.chatBlocks.delete(key);
    else if (member && !this.chatBlocks.has(key)) this.chatBlocks.set(key, { appId: member.appId, memberId, blockedId, createdAt: now });
  }

  async createChatSession(session: ChatSession): Promise<void> {
    this.chatSessions.set(session.tokenHash, clone(session));
  }

  async getChatSession(tokenHash: string): Promise<ChatSession | null> {
    const session = this.chatSessions.get(tokenHash);
    return session ? clone(session) : null;
  }

  async deleteExpiredChatSessions(now: Date): Promise<number> {
    let deleted = 0;
    for (const [key, session] of this.chatSessions) {
      if (session.expiresAt.getTime() > now.getTime()) continue;
      this.chatSessions.delete(key);
      deleted += 1;
    }
    return deleted;
  }

  async createChatUpload(upload: ChatUploadInfo): Promise<void> {
    this.chatUploads.set(upload.mediaId, clone(upload));
  }

  async getChatUpload(mediaId: string): Promise<ChatUploadInfo | null> {
    const upload = this.chatUploads.get(mediaId);
    return upload && this.mediaFiles.has(mediaId) ? clone(upload) : null;
  }

  async listUnsentChatUploads(before: Date, limit: number): Promise<string[]> {
    const sent = new Set([...this.chatMessages.values()].map((m) => m.mediaId).filter(Boolean));
    return [...this.chatUploads.values()]
      .filter((u) => u.createdAt.getTime() < before.getTime() && !sent.has(u.mediaId))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
      .map((u) => u.mediaId);
  }
  // 78 Milestones: kept under their client (not their app), so an app's deletion leaves them, as in MySQL.
  private milestones = new Map<string, { clientId: string; milestone: ClientMilestone }>();

  async addClientMilestones(rows: ClientMilestone[]): Promise<number> {
    let added = 0;
    for (const row of rows) {
      const key = `${row.clientId}|${row.kind}|${row.ref}`;
      if (this.milestones.has(key) || !this.clients.has(row.clientId)) continue;
      this.milestones.set(key, { clientId: row.clientId, milestone: clone(row) });
      added++;
    }
    return added;
  }

  async listClientMilestones(clientId: string): Promise<ClientMilestone[]> {
    return this.sortedMilestones().filter((m) => m.clientId === clientId);
  }

  async listMilestones(input: { since?: Date; kinds?: MilestoneKind[] }): Promise<ClientMilestone[]> {
    return this.sortedMilestones().filter((m) => (!input.since || m.at.getTime() >= input.since.getTime()) && (!input.kinds || input.kinds.includes(m.kind)));
  }

  // 78.2 Kept with no client or app: an account's deletion leaves the day's counts.
  private productDays = new Map<string, { snapshot: ProductDay }>();

  async saveProductDay(day: ProductDay): Promise<void> {
    this.productDays.set(day.day, { snapshot: clone(day) });
  }

  async listProductDays(since: string): Promise<ProductDay[]> {
    return [...this.productDays.values()]
      .map((r) => clone(r.snapshot))
      .filter((d) => d.day >= since)
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  // 78.3 Watching: kept under no client or app.
  private jobRuns = new Map<number, { run: JobRun }>();
  private nextJobRunId = 1;
  private teamAlerts = new Map<string, { alert: TeamAlert }>();

  async startJobRun(job: WatchedJob, startedAt: Date): Promise<number> {
    const id = this.nextJobRunId++;
    this.jobRuns.set(id, { run: { id, job, startedAt, finishedAt: null, ok: null, summary: null, error: null } });
    return id;
  }

  async finishJobRun(id: number, result: { finishedAt: Date; ok: boolean; summary: string | null; error: string | null }): Promise<void> {
    const row = this.jobRuns.get(id);
    if (row) row.run = { ...row.run, ...result };
  }

  async listJobRuns(input: { job?: WatchedJob; limit: number }): Promise<JobRun[]> {
    return [...this.jobRuns.values()]
      .map((r) => r.run)
      .filter((r) => !input.job || r.job === input.job)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime() || b.id - a.id)
      .slice(0, input.limit)
      .map(clone);
  }

  async lastGoodJobRuns(): Promise<Partial<Record<WatchedJob, Date>>> {
    const last: Partial<Record<WatchedJob, Date>> = {};
    for (const { run } of this.jobRuns.values()) {
      if (run.ok && run.finishedAt && (!last[run.job] || run.finishedAt.getTime() > last[run.job]!.getTime())) last[run.job] = run.finishedAt;
    }
    return last;
  }

  async deleteJobRunsBefore(before: Date): Promise<number> {
    let deleted = 0;
    for (const [id, { run }] of this.jobRuns) {
      if (run.startedAt.getTime() < before.getTime()) {
        this.jobRuns.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async raiseTeamAlert(input: Pick<TeamAlert, "kind" | "key" | "title" | "detail" | "link">, now: Date): Promise<{ alert: TeamAlert; created: boolean }> {
    const open = [...this.teamAlerts.values()].find((r) => r.alert.key === input.key && !r.alert.resolvedAt);
    if (open) {
      open.alert = { ...open.alert, title: input.title, detail: input.detail, link: input.link, count: open.alert.count + 1, lastSeenAt: now };
      return { alert: clone(open.alert), created: false };
    }
    const alert: TeamAlert = { id: newId(), ...input, count: 1, createdAt: now, lastSeenAt: now, resolvedAt: null, resolvedBy: null, emailedAt: null };
    this.teamAlerts.set(alert.id, { alert });
    return { alert: clone(alert), created: true };
  }

  async markTeamAlertEmailed(id: string, at: Date): Promise<void> {
    const row = this.teamAlerts.get(id);
    if (row) row.alert = { ...row.alert, emailedAt: at };
  }

  async listTeamAlerts(input: { open: boolean; limit: number }): Promise<TeamAlert[]> {
    return [...this.teamAlerts.values()]
      .map((r) => r.alert)
      .filter((a) => (input.open ? !a.resolvedAt : Boolean(a.resolvedAt)))
      .sort((a, b) => (input.open ? b.lastSeenAt.getTime() - a.lastSeenAt.getTime() : b.resolvedAt!.getTime() - a.resolvedAt!.getTime()))
      .slice(0, input.limit)
      .map(clone);
  }

  async countOpenTeamAlerts(): Promise<number> {
    return [...this.teamAlerts.values()].filter((r) => !r.alert.resolvedAt).length;
  }

  async resolveTeamAlert(id: string, by: string, now: Date): Promise<boolean> {
    const row = this.teamAlerts.get(id);
    if (!row || row.alert.resolvedAt) return false;
    row.alert = { ...row.alert, resolvedAt: now, resolvedBy: by };
    return true;
  }

  async resolveTeamAlertsExcept(kind: TeamAlertKind, keep: string[], by: string, now: Date): Promise<number> {
    let closed = 0;
    for (const row of this.teamAlerts.values()) {
      if (row.alert.kind === kind && !row.alert.resolvedAt && !keep.includes(row.alert.key)) {
        row.alert = { ...row.alert, resolvedAt: now, resolvedBy: by };
        closed++;
      }
    }
    return closed;
  }

  // 78.4 Errors per app: kept under their client and app, so their deletion takes them (as in MySQL).
  private appErrors = new Map<string, AppError>();

  async recordAppError(input: Pick<AppError, "clientId" | "appId" | "source" | "code" | "message">, now: Date): Promise<void> {
    if (!this.clients.has(input.clientId) || (input.appId && !this.apps.has(input.appId) && !this.deletedApps.has(input.appId))) return;
    const found = [...this.appErrors.values()].find((e) => e.clientId === input.clientId && e.appId === input.appId && e.source === input.source && e.code === input.code);
    if (found) {
      this.appErrors.set(found.id, { ...found, message: input.message, count: found.count + 1, lastAt: now });
      return;
    }
    const error: AppError = { id: newId(), ...input, count: 1, firstAt: now, lastAt: now };
    this.appErrors.set(error.id, error);
  }

  async listAppErrors(input: { clientId?: string; appId?: string; since?: Date; limit: number }): Promise<AppError[]> {
    return [...this.appErrors.values()]
      .filter((e) => (!input.clientId || e.clientId === input.clientId) && (!input.appId || e.appId === input.appId) && (!input.since || e.lastAt.getTime() >= input.since.getTime()))
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
      .slice(0, input.limit)
      .map(clone);
  }

  async deleteAppErrorsBefore(before: Date): Promise<number> {
    let deleted = 0;
    for (const [id, e] of this.appErrors) {
      if (e.lastAt.getTime() < before.getTime()) {
        this.appErrors.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  // 79.2 Every string in every collection of the store, wherever it is in its row.
  async listCellsToRekey(input: { currentKeyId: string; after: string | null; limit: number }): Promise<{ cells: RekeyCell[]; next: string | null }> {
    const cells: RekeyCell[] = [];
    // Kept across pages (a cell listed earlier is still written back); each slot reads its value when used.
    const slots = rekeySlots.get(this) ?? new Map<string, { get(): unknown; set(text: string): void }>();
    const isPlain = (v: unknown): v is object => typeof v === "object" && v !== null && !(v instanceof Date) && !Buffer.isBuffer(v);
    const walk = (holder: unknown, path: string, found: (column: string, slot: { get(): unknown; set(text: string): void }) => void): void => {
      const visit = (value: unknown, column: string, get: () => unknown, set: (text: string) => void) => {
        if (typeof value === "string") {
          if (needsRekey(value, input.currentKeyId)) found(column, { get, set });
        } else if (isPlain(value)) walk(value, column, found);
      };
      if (holder instanceof Map) {
        for (const [k, v] of holder) visit(v, `${path}/${String(k)}`, () => holder.get(k), (text) => holder.set(k, text));
      } else if (Array.isArray(holder)) {
        holder.forEach((v, i) => visit(v, `${path}/${i}`, () => holder[i], (text) => (holder[i] = text)));
      } else if (isPlain(holder)) {
        const record = holder as Record<string, unknown>;
        for (const k of Object.keys(record)) visit(record[k], `${path}/${k}`, () => record[k], (text) => (record[k] = text));
      }
    };
    for (const table of Object.keys(this).sort()) {
      const collection = (this as unknown as Record<string, unknown>)[table];
      const rows: [unknown, unknown][] = collection instanceof Map ? [...collection.entries()] : Array.isArray(collection) ? collection.map((v, i) => [i, v]) : [];
      for (const [rowKey, row] of rows) {
        const key = JSON.stringify(rowKey);
        const holder = collection as Map<unknown, unknown> | unknown[];
        const found = (column: string, slot: { get(): unknown; set(text: string): void }) => {
          const text = slot.get() as string;
          const cell: RekeyCell = { table, column, key, text, candidates: candidatesIn([rowKey, row]) };
          cells.push(cell);
          slots.set(slotId(cell), slot);
        };
        if (typeof row === "string") {
          if (needsRekey(row, input.currentKeyId))
            found("", {
              get: () => (holder instanceof Map ? holder.get(rowKey) : holder[rowKey as number]),
              set: (text) => (holder instanceof Map ? holder.set(rowKey, text) : (holder[rowKey as number] = text)),
            });
        } else walk(row, "", found);
      }
    }
    rekeySlots.set(this, slots);
    // In order of where they are: cells moved since drop out without moving the others.
    const rest = cells.sort((a, b) => (slotId(a) < slotId(b) ? -1 : 1)).filter((c) => input.after === null || slotId(c) > input.after);
    const page = rest.slice(0, input.limit);
    return { cells: page.map(clone), next: rest.length > page.length ? slotId(page[page.length - 1]!) : null };
  }

  async updateRekeyedCell(cell: RekeyCell, text: string): Promise<boolean> {
    const slot = rekeySlots.get(this)?.get(slotId(cell));
    if (!slot || slot.get() !== cell.text) return false;
    slot.set(text);
    return true;
  }

  private sortedMilestones(): ClientMilestone[] {
    return [...this.milestones.values()].map((r) => clone(r.milestone)).sort((a, b) => a.at.getTime() - b.at.getTime() || a.kind.localeCompare(b.kind));
  }


  /** Every table holding rows, but the records that outlive what they name (no foreign keys in MySQL). */
  private tables(): { rows(): Record<string, unknown>[]; remove(match: (row: Record<string, unknown>) => boolean): void }[] {
    const kept = new Set<unknown>([this.appDeletions, this.keptBilling, this.accountDeletions, this.auditEntries, this.deletedApps, this.apps, this.platformSettings]);
    const tables: { rows(): Record<string, unknown>[]; remove(match: (row: Record<string, unknown>) => boolean): void }[] = [];
    const isRow = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !(value instanceof Map) && !(value instanceof Set);
    for (const key of Object.keys(this) as (keyof this)[]) {
      const value = this[key] as unknown;
      if (kept.has(value)) continue;
      if (value instanceof Map) {
        const map = value as Map<unknown, unknown>;
        tables.push({
          rows: () => [...map.values()].filter(isRow),
          remove: (match) => {
            for (const [k, row] of map) if (isRow(row) && match(row)) map.delete(k);
          },
        });
      } else if (Array.isArray(value)) {
        tables.push({
          rows: () => (this[key] as unknown[]).filter(isRow),
          remove: (match) => {
            (this as Record<keyof this, unknown>)[key] = (this[key] as unknown[]).filter((row) => !(isRow(row) && match(row)));
          },
        });
      }
    }
    return tables;
  }

  /** Deletes an app and its rows as `on delete cascade` does; its plan payments stay, without their app (`set null`). */
  private cascadeApp(appId: string): void {
    for (const [id, payment] of this.planPayments) if (payment.appId === appId) this.planPayments.set(id, { ...payment, appId: null });
    for (const license of this.licenses.values()) if (license.appId === appId) this.activations.delete(license.id);
    for (const table of this.tables()) table.remove((row) => row.appId === appId);
    this.apps.delete(appId);
    this.deletedApps.delete(appId);
  }
}

/** 61 Whether `at` is in [from, to). */
function within(at: Date | null | undefined, from: Date, to: Date): boolean {
  return Boolean(at) && at!.getTime() >= from.getTime() && at!.getTime() < to.getTime();
}

/** 61 How many and the sum per currency (currencies in alphabetical order, as the database groups them). */
function paidTotals(rows: { currency: string; cents: number }[]): PaidTotals {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.cents);
  return { count: rows.length, totals: [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, cents]) => ({ currency, cents })) };
}
