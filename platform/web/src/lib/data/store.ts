import type {
  Activation,
  App,
  Asset,
  Build,
  BuildStatus,
  CatalogCategory,
  CatalogOrder,
  CatalogOrderPatch,
  CatalogOrderStatus,
  PlanPayment,
  BookingAppointment,
  BookingAppointmentPatch,
  BookingStatus,
  CourseEnrollment,
  LessonProgress,
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
  PlatformSetting,
  PlatformSettingKey,
  PlatformSettingValues,
  PluginRelease,
  ResetToken,
  User,
  AdminMember,
  AdminMemberRow,
  AuditEntry,
  AuditQuery,
} from "./types";

export type ClientFilter = "all" | "pending" | "active" | "expired";

export interface ClientRow {
  client: Client;
  user: User;
  license: License | null;
  activation: Activation | null;
  latestBuild: Build | null;
}

/** A client who asked the team to set up WordPress for their app. */
export interface SetupRequestRow {
  client: Client;
  user: User;
  app: App;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

/** A device of a hosted-API customer: what the API may change. */
export type HostedDevicePatch = Partial<Pick<HostedDevice, "platform" | "name" | "appVersion" | "pushToken" | "pushPreferences" | "lastSeenAt">>;

export type ClaimResult = { ok: true; activation: Activation } | { ok: false; existing: Activation };

export type UserPatch = Partial<Pick<User, "name" | "passwordHash" | "sessionVersion" | "lastSignInAt">>;
export type ClientPatch = Partial<Pick<Client, "whatsapp" | "siteUrl" | "status" | "paymentNote" | "activatedAt">>;
export type LicensePatch = Partial<Pick<License, "plan" | "expiresAt" | "keyHash" | "keyEncrypted" | "keyLast4">>;
export type AppPatch = Partial<Omit<App, "id" | "clientId" | "createdAt" | SigningKeyColumn>>;
/** Signing keys created by the build pipeline. Written only through `saveSigningKeys`, which never replaces one. */
export type SigningKeyColumn = "androidUploadKeyEncrypted" | "iosDistributionEncrypted";
export type SigningKeysPatch = Partial<Record<SigningKeyColumn, string>>;
export type BuildPatch = Partial<
  Pick<Build, "status" | "stages" | "artifacts" | "message" | "logUrl" | "startedAt" | "finishedAt">
>;
export type ReleasePatch = Partial<Pick<PluginRelease, "changelog" | "requiresWp" | "requiresPhp" | "testedWp" | "published">>;

/**
 * Every read and write the platform does. Two implementations:
 * `MemoryStore` (YALLAPP_DATA=memory: tests and local runs) and
 * `MysqlStore` (production, MySQL on host.webek.org through Drizzle).
 */
export interface DataStore {
  // Users
  createUser(input: { email: string; name: string; passwordHash: string | null; now: Date }): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, patch: UserPatch, now: Date): Promise<void>;

  // Clients
  createClient(input: { userId: string; whatsapp: string; siteUrl: string; now: Date }): Promise<Client>;
  getClientById(id: string): Promise<Client | null>;
  getClientByUserId(userId: string): Promise<Client | null>;
  updateClient(id: string, patch: ClientPatch, now: Date): Promise<void>;
  listClients(input: { filter: ClientFilter; query?: string; now: Date }): Promise<ClientRow[]>;
  countClients(now: Date): Promise<Record<ClientFilter, number>>;
  /** Open WordPress set-up requests, oldest first. */
  listSetupRequests(): Promise<SetupRequestRow[]>;

  // Licenses
  createLicense(license: License): Promise<void>;
  getLicenseById(id: string): Promise<License | null>;
  getLicenseByClientId(clientId: string): Promise<License | null>;
  getLicenseByHash(keyHash: string): Promise<License | null>;
  updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void>;

  // Activations (one site per license)
  getActivation(licenseId: string): Promise<Activation | null>;
  /** Binds the license to a site unless it is bound to another one. Atomic. */
  claimActivation(activation: Activation): Promise<ClaimResult>;
  touchActivation(licenseId: string, patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "lastCheckedAt">): Promise<void>;
  deleteActivation(licenseId: string): Promise<void>;

  // Apps
  createApp(app: App): Promise<void>;
  getAppByClientId(clientId: string): Promise<App | null>;
  getAppById(id: string): Promise<App | null>;
  updateApp(id: string, patch: AppPatch, now: Date): Promise<void>;
  /**
   * Saves pipeline-created signing keys only if none of the given kinds is
   * saved yet, atomically. Returns false (and saves nothing) otherwise.
   */
  saveSigningKeys(appId: string, keys: SigningKeysPatch, now: Date): Promise<boolean>;

  // Builds
  /** Assigns the next per-client build number and version code. */
  createBuild(build: Omit<Build, "number" | "versionCode">): Promise<Build>;
  getBuild(id: string): Promise<Build | null>;
  listBuildsByClient(clientId: string, limit: number): Promise<Build[]>;
  listBuilds(input: { status?: BuildStatus; limit: number }): Promise<Build[]>;
  updateBuild(id: string, patch: BuildPatch, now: Date): Promise<void>;

  // Plugin releases
  createRelease(release: PluginRelease): Promise<void>;
  getRelease(id: string): Promise<PluginRelease | null>;
  getReleaseByVersion(version: string): Promise<PluginRelease | null>;
  listReleases(): Promise<PluginRelease[]>;
  updateRelease(id: string, patch: ReleasePatch): Promise<void>;
  deleteRelease(id: string): Promise<void>;

  // Uploaded assets (icons, logos)
  createAsset(asset: Asset): Promise<void>;
  getAsset(id: string): Promise<Asset | null>;

  // Password reset tokens
  createResetToken(token: ResetToken): Promise<void>;
  getResetToken(tokenHash: string): Promise<ResetToken | null>;
  /** Marks the token used; returns false if it was already used (single use, atomic). */
  consumeResetToken(tokenHash: string, now: Date): Promise<boolean>;

  // Hosted API: an app's customers (always scoped by app)
  /** Returns null when the app already has a customer with this phone number. */
  createHostedUser(input: { appId: string; phone: string; name: string; email: string | null; city: string | null; now: Date }): Promise<HostedUser | null>;
  getHostedUser(appId: string, id: number): Promise<HostedUser | null>;
  getHostedUserByPhone(appId: string, phone: string): Promise<HostedUser | null>;
  updateHostedUser(appId: string, id: number, patch: HostedUserPatch, now: Date): Promise<void>;
  /** Deletes the customer with their devices, sign-ins and notifications. */
  deleteHostedUser(appId: string, id: number): Promise<void>;

  createHostedDevice(device: HostedDevice): Promise<void>;
  getHostedDevice(appId: string, id: string): Promise<HostedDevice | null>;
  findHostedDevice(appId: string, userId: number, deviceId: string): Promise<HostedDevice | null>;
  /** A customer's devices, most recently seen first. */
  listHostedDevices(appId: string, userId: number): Promise<HostedDevice[]>;
  updateHostedDevice(appId: string, id: string, patch: HostedDevicePatch): Promise<void>;
  /** Signs the device out: deletes it and its refresh tokens. */
  deleteHostedDevice(appId: string, id: string): Promise<void>;
  /** Devices with a push token: every customer's, or only these customers'. */
  listHostedPushDevices(appId: string, userIds: number[] | null): Promise<HostedDevice[]>;
  /** Forgets a push token Firebase reported as no longer valid. */
  clearHostedPushToken(appId: string, token: string): Promise<void>;

  createHostedRefreshToken(token: HostedRefreshToken): Promise<void>;
  /** Deletes and returns the token (single use, atomic); null when it was already used or never existed. */
  takeHostedRefreshToken(tokenHash: string): Promise<HostedRefreshToken | null>;

  createHostedChallenge(challenge: HostedChallenge): Promise<void>;
  getHostedChallenge(tokenHash: string): Promise<HostedChallenge | null>;
  /** Counts one more wrong or right attempt; returns the attempts so far. */
  addHostedChallengeAttempt(tokenHash: string): Promise<number>;
  deleteHostedChallenge(tokenHash: string): Promise<void>;
  /** Drops expired challenges and refresh tokens. */
  purgeHostedExpired(now: Date): Promise<void>;

  createHostedNotification(input: Omit<HostedNotification, "id">): Promise<HostedNotification>;
  /** The customer's notifications (their own and everyone's) since `since`, newest first. */
  listHostedNotifications(input: {
    appId: string;
    userId: number;
    since: Date;
    page: number;
    perPage: number;
  }): Promise<{ items: HostedNotification[]; total: number }>;
  countHostedNotificationsAfter(input: { appId: string; userId: number; after: Date }): Promise<number>;
  /** Everyone's notifications of an app, newest first, for the dashboard. */
  listHostedBroadcasts(appId: string, limit: number): Promise<HostedNotification[]>;
  countHostedUsers(appId: string): Promise<number>;

  // Platform settings (admin)
  /**
   * Books a time for a staff member: null when an active appointment of
   * theirs overlaps it (checked and written as one step, so two customers
   * can't take the same time).
   */
  createBookingAppointment(input: Omit<BookingAppointment, "id">): Promise<BookingAppointment | null>;
  getBookingAppointment(appId: string, id: number): Promise<BookingAppointment | null>;
  updateBookingAppointment(appId: string, id: number, patch: BookingAppointmentPatch): Promise<void>;
  /**
   * An app's appointments. `scope` upcoming: active ones from `now`, soonest
   * first; past: the rest, newest first. Without scope, every status in the
   * window [startFrom, startBefore), soonest first.
   */
  listBookingAppointments(input: {
    appId: string;
    userId?: number;
    scope?: { kind: "upcoming" | "past"; now: Date };
    statuses?: BookingStatus[];
    startFrom?: Date;
    startBefore?: Date;
    offset: number;
    limit: number;
  }): Promise<{ items: BookingAppointment[]; total: number }>;
  /** Enrols once; false when they already were. */
  enrollInCourse(input: CourseEnrollment): Promise<boolean>;
  listCourseEnrollments(input: { appId: string; userId?: number; courseId?: number }): Promise<CourseEnrollment[]>;
  /** Saves a lesson's video position, and marks it complete when `completedAt` is given (never un-completes). */
  saveLessonProgress(input: LessonProgress): Promise<void>;
  listLessonProgress(input: { appId: string; userId: number; courseId?: number }): Promise<LessonProgress[]>;
  /** Paid orders sold through Yallapp's account (with a commission), newest first, every shop. */
  listMarketplaceOrders(limit: number): Promise<CatalogOrder[]>;
  createPlanPayment(payment: PlanPayment): Promise<void>;
  getPlanPaymentByToken(tokenHash: string): Promise<PlanPayment | null>;
  /** Pending to paid, once: false when it was no longer pending. */
  payPlanPayment(id: string, paymentId: string, now: Date): Promise<boolean>;
  /** Pending to failed. */
  failPlanPayment(id: string): Promise<void>;
  /** Newest first; one client's, or everyone's. */
  listPlanPayments(input: { clientId?: string; limit: number }): Promise<PlanPayment[]>;
  listPlatformSettings(): Promise<PlatformSetting[]>;
  /** Saves a setting, or removes it (back to the Netlify variables) when `value` is null. */
  setPlatformSetting<K extends PlatformSettingKey>(key: K, value: PlatformSettingValues[K] | null, updatedBy: string, now: Date): Promise<void>;

  // Catalog (apps without a website)
  listCatalogCategories(appId: string): Promise<CatalogCategory[]>;
  createCatalogCategory(input: { appId: string; name: string; now: Date }): Promise<CatalogCategory>;
  renameCatalogCategory(appId: string, id: number, name: string): Promise<void>;
  /** Also removes the category from its products. */
  deleteCatalogCategory(appId: string, id: number, now: Date): Promise<void>;
  /** Every product of the app, newest first. */
  listCatalogProducts(appId: string): Promise<CatalogProduct[]>;
  getCatalogProduct(appId: string, id: number): Promise<CatalogProduct | null>;
  createCatalogProduct(input: CatalogProductInput, now: Date): Promise<CatalogProduct>;
  updateCatalogProduct(appId: string, id: number, input: Partial<CatalogProductInput>, now: Date): Promise<void>;
  deleteCatalogProduct(appId: string, id: number): Promise<void>;
  createCatalogOrder(input: Omit<CatalogOrder, "id">): Promise<CatalogOrder>;
  getCatalogOrder(appId: string, id: number): Promise<CatalogOrder | null>;
  getCatalogOrderByToken(tokenHash: string): Promise<CatalogOrder | null>;
  updateCatalogOrder(appId: string, id: number, patch: CatalogOrderPatch): Promise<void>;
  /**
   * Marks a pending order paid ("processing") and takes its quantities from
   * stock, once: false when the order wasn't pending.
   */
  payCatalogOrder(appId: string, id: number, paymentId: string, now: Date): Promise<boolean>;
  /** Newest first; `statuses` limits the list (the app shows paid orders only). */
  listCatalogOrders(input: {
    appId: string;
    userId?: number;
    statuses?: CatalogOrderStatus[];
    offset: number;
    limit: number;
  }): Promise<{ items: CatalogOrder[]; total: number }>;

  // Rate limits: fixed windows
  /** Records one hit in the window starting at `windowStart` and returns the hits so far. */
  hitRateLimit(bucket: string, windowStart: number, now: Date): Promise<number>;

  // 11.7 Admin team and audit log
  /** Everyone in admin_members with their user, oldest first. */
  listAdminMembers(): Promise<AdminMemberRow[]>;
  getAdminMember(userId: string): Promise<AdminMember | null>;
  /** Adds the member, or replaces their role. */
  saveAdminMember(member: AdminMember): Promise<void>;
  deleteAdminMember(userId: string): Promise<void>;
  createAuditEntry(entry: Omit<AuditEntry, "id">): Promise<AuditEntry>;
  /** Newest first. */
  listAuditEntries(query: AuditQuery): Promise<{ items: AuditEntry[]; total: number }>;

  // 11.1 Overview
  /** Every client's app. */
  listApps(): Promise<App[]>;
  /** Builds queued at or after `since`, newest first. */
  listBuildsSince(since: Date): Promise<Build[]>;
  /** Plan payments paid at or after `since`. */
  listPaidPlanPaymentsSince(since: Date): Promise<PlanPayment[]>;
  /** Orders sold through Yallapp's account (with a commission) paid at or after `since`. */
  listMarketplaceOrdersSince(since: Date): Promise<CatalogOrder[]>;
  /** Customers per hosted app, by app ID (apps without customers are left out). */
  countHostedUsersByApp(): Promise<Record<string, number>>;

  // 11.2 Client page
  /** An app's customers, newest first; `query` matches the name, phone or email. */
  listHostedUsers(input: { appId: string; query?: string; offset: number; limit: number }): Promise<{ items: HostedUser[]; total: number }>;
}
