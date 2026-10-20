import type {
  Activation,
  App,
  AppLayoutRecord,
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
// 11.3, 11.4, 11.6 and 11.8
import type { Announcement, AnnouncementPatch, Coupon, CouponPatch, CouponRedemption, EmailTemplateRecord, SiteContentRecord } from "./types";
// 14.1 We publish for you
import type { PublishingEvent, PublishingRequest } from "./types";
// 13 Owner notices
import type { OwnerNotice, OwnerNoticeKind, OwnerNoticePatch } from "./types";
// 16 Demo apps
import type { DemoPurgeCounts } from "./types";
// 23 News & blog
import type { Article, ArticleCategory, ArticleInput, NewsSettings } from "./types";
// 28 Events & tickets
import type { CheckInResult, EventInput, EventRecord, EventSettings, EventTicket, TicketClaim, TicketClaimRefusal, TicketType, TicketTypeInput } from "./types";
// 34 Yallapp sign-in for own API apps
import type { AppAuthKey } from "./types";
// 63
import type { CourseAnswer, CourseAnswerInput, CourseQuestion, CourseQuestionInput, CourseQuestionStatus, CourseReview, CourseReviewPatch, MemberCheckIn } from "./types";
// 29 Charity & donations
import type { AnalyticsDailyRecord, AnalyticsDailyRow, AnalyticsEventRow, AnalyticsMetric } from "../analytics/types";
import type { Campaign, CampaignInput, Donation, DonationInput, DonationPatch, DonationSettings, DonationStatus } from "./types";
// 46 Links and crash reports
import type { AppLinkTarget, CrashIssue, CrashIssueStatus, CrashReportInput } from "./types";
// 49
import type { ApiWebhook, ApiWebhookPatch } from "./types";
// 47 Refunds
import type { PaymentRefund, RefundKind } from "./types";
// 51 Media and storage
import type { MediaFile, MediaFilePatch, MediaKind, MediaStatus, StoragePack, StoragePackPatch } from "./types";
// 10.7 Listings
// 58 Yallapp Business
import type { OwnerDevice, OwnerDevicePatch } from "./types";
// 60 Team members for clients
import type { TeamActivity, TeamInvitation, TeamInvitationPatch, TeamMember, TeamMemberRow } from "./types";
// 61
import type { BookingAppointmentMove, PaidTotals, ScheduledNotification, ScheduledNotificationPatch, ScheduledNotificationStatus } from "./types";
// 66 Deleting a Yallapp account
import type { AccountDeletionClose, AccountDeletionRequest, AccountDeletionStatus } from "./types";
import type { Listing, ListingFavorite, ListingInput, ListingInquiry, ListingInquiryMessage, ListingInquiryRow, ListingInquiryStatus, ListingSettings } from "./types";

export type ClientFilter = "all" | "pending" | "active" | "expired";

/** One app of a client in the admin list: its license, the site that license is on, its latest build. */
export interface ClientAppRow {
  /** Null for a license given before the account's first app (no app yet). */
  app: App | null;
  license: License | null;
  activation: Activation | null;
  latestBuild: Build | null;
}

export interface ClientRow {
  client: Client;
  user: User;
  /** The license that lasts longest: it decides the account's state (clientAccountState). */
  license: License | null;
  /** The account's apps, oldest first, then a license without an app if there is one. */
  apps: ClientAppRow[];
}

/** A client who asked the team to set up WordPress for their app. */
export interface SetupRequestRow {
  client: Client;
  user: User;
  app: App;
}

/** createBuild with `exclusive`: the app already has a build in the queue or running. */
export class BuildRunningError extends Error {
  constructor() {
    super("This app already has a build in progress.");
    this.name = "BuildRunningError";
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

/** A device of a hosted-API customer: what the API may change. */
export type HostedDevicePatch = Partial<Pick<HostedDevice, "platform" | "name" | "appVersion" | "pushToken" | "pushProvider" | "pushPreferences" | "lastSeenAt">>;

export type ClaimResult = { ok: true; activation: Activation } | { ok: false; existing: Activation };

export type UserPatch = Partial<Pick<User, "name" | "passwordHash" | "sessionVersion" | "lastSignInAt" | "language">>;
export type ClientPatch = Partial<Pick<Client, "whatsapp" | "siteUrl" | "status" | "paymentNote" | "activatedAt" | "country">>;
export type LicensePatch = Partial<Pick<License, "plan" | "expiresAt" | "keyHash" | "keyEncrypted" | "keyLast4" | "nextPlan" | "nextPlanAt">>;
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
  /** 52 `country`: the request's, at sign-up (null when unknown). */
  createClient(input: { userId: string; whatsapp: string; siteUrl: string; country?: string | null; now: Date }): Promise<Client>;
  getClientById(id: string): Promise<Client | null>;
  getClientByUserId(userId: string): Promise<Client | null>;
  updateClient(id: string, patch: ClientPatch, now: Date): Promise<void>;
  listClients(input: { filter: ClientFilter; query?: string; now: Date }): Promise<ClientRow[]>;
  countClients(now: Date): Promise<Record<ClientFilter, number>>;
  /** Open WordPress set-up requests, oldest first. */
  listSetupRequests(): Promise<SetupRequestRow[]>;

  // Licenses: one per app
  /** Fails when the app (or, with no app, the account) already has a license, or the key is taken. */
  createLicense(license: License): Promise<void>;
  getLicenseById(id: string): Promise<License | null>;
  /**
   * The license of one of the client's apps; with `appId` null, the license
   * given before the account's first app existed. Never another client's.
   */
  getLicenseForApp(clientId: string, appId: string | null): Promise<License | null>;
  /** Every license of the client's apps. */
  listLicensesByClient(clientId: string): Promise<License[]>;
  getLicenseByHash(keyHash: string): Promise<License | null>;
  updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void>;

  // Activations (one site per license)
  getActivation(licenseId: string): Promise<Activation | null>;
  /** Binds the license to a site unless it is bound to another one. Atomic. */
  claimActivation(activation: Activation): Promise<ClaimResult>;
  touchActivation(licenseId: string, patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "store" | "bookings" | "lastCheckedAt">): Promise<void>;
  deleteActivation(licenseId: string): Promise<void>;

  // Apps: an account can have several
  /**
   * Adds an app to the client's account. Their first app also takes the
   * license and plan payments made before it existed (app ID null).
   */
  createApp(app: App): Promise<void>;
  /** The client's apps, oldest first. */
  listAppsByClient(clientId: string): Promise<App[]>;
  getAppById(id: string): Promise<App | null>;
  updateApp(id: string, patch: AppPatch, now: Date): Promise<void>;
  /**
   * Saves pipeline-created signing keys only if none of the given kinds is
   * saved yet, atomically. Returns false (and saves nothing) otherwise.
   */
  saveSigningKeys(appId: string, keys: SigningKeysPatch, now: Date): Promise<boolean>;

  // Builds
  /**
   * Assigns the app's next build number and version code. With `exclusive`,
   * throws BuildRunningError (and saves nothing) when the app already has a
   * queued or building build, checked in the same transaction as the insert.
   */
  createBuild(build: Omit<Build, "number" | "versionCode">, options?: { exclusive?: boolean }): Promise<Build>;
  getBuild(id: string): Promise<Build | null>;
  /** An app's builds, newest first. */
  listBuildsByApp(appId: string, limit: number): Promise<Build[]>;
  /** Oldest first (the pipeline's queue), or newest first with `newestFirst` (the admin's lists). */
  listBuilds(input: { status?: BuildStatus; limit: number; newestFirst?: boolean }): Promise<Build[]>;
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
  /** Null when the number (or, for an email account, the address) already has an account. */
  createHostedUser(input: { appId: string; phone: string | null; name: string; email: string | null; city: string | null; now: Date }): Promise<HostedUser | null>;
  getHostedUser(appId: string, id: number): Promise<HostedUser | null>;
  getHostedUserByPhone(appId: string, phone: string): Promise<HostedUser | null>;
  /** 18 The account made by email sign-in with this (lowercase) address: one without a phone. */
  getHostedEmailUser(appId: string, email: string): Promise<HostedUser | null>;
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
  /** 19 The app's users who signed up by email (no phone number): they can't sign in when email sign-in is off. */
  countHostedEmailOnlyUsers(appId: string): Promise<number>;

  // 34 Keys that sign the access tokens of own API apps Yallapp signs people in to
  /** The app's keys, newest first: the ones signing now (not retired) and the retired ones not yet deleted. */
  listAppAuthKeys(appId: string): Promise<AppAuthKey[]>;
  createAppAuthKey(key: AppAuthKey): Promise<void>;
  /** Retires the app's current keys: they stop signing (their private keys are dropped), their public keys stay until deleted. */
  retireAppAuthKeys(appId: string, now: Date): Promise<void>;
  /** Deletes the app's keys retired before `before`. */
  deleteAppAuthKeysRetiredBefore(appId: string, before: Date): Promise<void>;

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
   * 61 Moves a pending or approved appointment to a new time (and maybe
   * another staff member): false, with nothing changed, when it is no longer
   * active or another active appointment of that staff member overlaps the
   * new time (checked and written as one step, as booking is).
   */
  moveBookingAppointment(appId: string, id: number, move: BookingAppointmentMove): Promise<boolean>;
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

  // 27 Group classes and memberships
  /** Adds a class; null when its timetable entry already has a class at that start. */
  createClassSession(input: Omit<ClassSession, "id">): Promise<ClassSession | null>;
  getClassSession(appId: string, id: number): Promise<ClassSession | null>;
  /** An app's classes starting in [startFrom, startBefore), soonest first. */
  listClassSessions(input: { appId: string; startFrom?: Date; startBefore?: Date }): Promise<ClassSession[]>;
  /** Changes a class; the capacity never goes below the spots already taken. */
  updateClassSession(appId: string, id: number, patch: ClassSessionPatch): Promise<void>;
  /** Removes a class nobody has a spot in; false when someone has. */
  deleteClassSession(appId: string, id: number): Promise<boolean>;
  /**
   * Books a spot, as one step: only while the class is on, bookable and has
   * a spot left (never more spots than its capacity, also when many book at
   * once), using a credit of the customer's membership when one is needed.
   * A spot already booked is answered again without using anything.
   */
  bookClass(input: BookClassInput): Promise<BookClassResult>;
  /** Gives a customer's spot back, with the credit it used; null when they have none. */
  cancelClassBooking(input: { appId: string; sessionId: number; userId: number; now: Date }): Promise<ClassBooking | null>;
  /** Calls a class off: every spot is given back with its credit. Returns the spots that were booked. */
  cancelClassSession(appId: string, id: number, now: Date): Promise<ClassBooking[]>;
  listClassBookings(input: { appId: string; sessionIds?: number[]; userId?: number; status?: ClassBookingStatus }): Promise<ClassBooking[]>;
  createMembership(input: Omit<Membership, "id">): Promise<Membership>;
  getMembership(appId: string, id: number): Promise<Membership | null>;
  /** An app's memberships (or one customer's), newest first. */
  listMemberships(input: { appId: string; userId?: number; limit?: number }): Promise<Membership[]>;
  updateMembership(appId: string, id: number, patch: MembershipPatch): Promise<void>;
  /** Adds classes to a membership with credits (unlimited ones stay unlimited). */
  addMembershipCredits(appId: string, id: number, credits: number, now: Date): Promise<void>;
  /**
   * 63 Checks a member in for the day: once per app user and day (the
   * database's unique key), so of two scans at once one wins; the other gets
   * the check-in that is there.
   */
  checkInMember(input: Omit<MemberCheckIn, "id">): Promise<{ ok: true; checkIn: MemberCheckIn } | { ok: false; checkIn: MemberCheckIn }>;
  /** 63 A day's check-ins (the gym's day), the latest first. */
  listMemberCheckIns(appId: string, day: string): Promise<MemberCheckIn[]>;
  /** 63 How many members came in on the gym's day. */
  countMemberCheckInsOnDay(appId: string, day: string): Promise<number>;
  /**
   * 63 A page of the app's memberships (or of these app users'), those that
   * can get in now first (active, started, not ended), then newest first.
   */
  listMembershipsPage(input: { appId: string; userIds?: number[]; now: Date; offset: number; limit: number }): Promise<{ items: Membership[]; total: number }>;
  /** 63 The membership whose member code has this hash (an indexed lookup). */
  findMembershipByCodeHash(appId: string, codeHash: string): Promise<Membership | null>;
  /** 63 Memberships that can get in now and whose code hash isn't stored yet (made before it was). */
  listMembershipsWithoutCodeHash(appId: string, now: Date, limit: number): Promise<Membership[]>;
  setMembershipCodeHash(appId: string, id: number, codeHash: string): Promise<void>;
  /**
   * 64 Freezes an active membership from `from` until `until` (null: until
   * unfrozen) and sets its end to `endsAt`, in one conditional update: only
   * while it's active, has no freeze now or to come and still ends at
   * `previousEndsAt` (one of two at once wins). False when it didn't.
   */
  freezeMembership(appId: string, id: number, input: { from: Date; until: Date | null; endsAt: Date | null; previousEndsAt: Date | null; now: Date }): Promise<boolean>;
  /**
   * 64 Removes the freeze that was read (`from` and `until`, while it isn't
   * over, on an active membership still ending at `previousEndsAt`) and sets
   * the end to `endsAt`, once (false when anything changed meanwhile).
   */
  unfreezeMembership(appId: string, id: number, input: { from: Date; until: Date | null; endsAt: Date | null; previousEndsAt: Date | null; now: Date }): Promise<boolean>;

  // 63 Course questions and reviews (lib/courses/community.ts)
  /** Writes or replaces the student's review of the course (one each); the business's reply and hiding stay. */
  saveCourseReview(input: { appId: string; courseId: number; userId: number; rating: number; text: string; now: Date }): Promise<CourseReview>;
  getCourseReview(appId: string, id: number): Promise<CourseReview | null>;
  getCourseReviewOf(appId: string, courseId: number, userId: number): Promise<CourseReview | null>;
  /** Newest first. `hidden` filters by it; `unreplied`: without a reply. */
  listCourseReviews(input: { appId: string; courseIds?: number[]; hidden?: boolean; unreplied?: boolean; offset: number; limit: number }): Promise<{ items: CourseReview[]; total: number }>;
  /** How many shown reviews each course has of each rating. */
  countCourseRatings(appId: string): Promise<{ courseId: number; rating: number; count: number }[]>;
  updateCourseReview(appId: string, id: number, patch: CourseReviewPatch): Promise<void>;
  createCourseQuestion(input: CourseQuestionInput): Promise<CourseQuestion>;
  getCourseQuestion(appId: string, id: number): Promise<CourseQuestion | null>;
  /**
   * `created`: newest question first (the app); `updated`: latest activity first (the business).
   * 64 `hidden` filters by it; `viewerId`: the shown ones and that student's own (the app).
   */
  listCourseQuestions(input: {
    appId: string;
    courseIds?: number[];
    status?: CourseQuestionStatus;
    hidden?: boolean;
    viewerId?: number;
    order: "created" | "updated";
    offset: number;
    limit: number;
  }): Promise<{ items: CourseQuestion[]; total: number }>;
  /** Adds an answer and sets the question's status and time, together. */
  addCourseAnswer(input: CourseAnswerInput, status: CourseQuestionStatus): Promise<CourseAnswer>;
  /** 64 Hides a question from everyone but its author, or shows it again; false when it isn't the app's. */
  setCourseQuestionHidden(appId: string, id: number, hidden: boolean): Promise<boolean>;
  /** 64 Hides a student's answer under the question, or shows it again; false when there's no such student's answer. */
  setCourseAnswerHidden(appId: string, questionId: number, id: number, hidden: boolean): Promise<boolean>;
  /** Oldest first. */
  listCourseAnswers(appId: string, questionId: number): Promise<CourseAnswer[]>;

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
  /** Newest first; one client's, one app's, or everyone's. */
  listPlanPayments(input: { clientId?: string; appId?: string; limit: number }): Promise<PlanPayment[]>;
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

  // 47 Refunds
  /**
   * Records a refund and applies it to its order or donation, in one
   * transaction: it is added to `refundedCents` only while that stays within
   * the total (otherwise nothing is written and null comes back); all of it
   * makes the status "refunded"; a marketplace order's commission goes down
   * by the refund's `commissionCents`; a donation's campaign total goes down
   * by it, and a fully refunded donation's donor stops counting unless they
   * gave another paid donation to the campaign.
   */
  recordRefund(input: Omit<PaymentRefund, "id">): Promise<PaymentRefund | null>;
  /** The refunds of these orders or donations, oldest first. */
  listRefunds(appId: string, kind: RefundKind, targetIds: number[]): Promise<PaymentRefund[]>;
  /** 47 Takes a course away (a refunded purchase); its progress stays. False when they weren't in it. */
  leaveCourse(appId: string, userId: number, courseId: number): Promise<boolean>;

  // Rate limits: fixed windows
  /** Records one hit in the window starting at `windowStart` and returns the hits so far. */
  hitRateLimit(bucket: string, windowStart: number, now: Date): Promise<number>;
  /** The hits recorded in the window starting at `windowStart` (0 when none), without adding one. */
  peekRateLimit(bucket: string, windowStart: number): Promise<number>;

  // 10.7 Listings (Real estate apps)
  /** Every listing of the app, any status, newest first. */
  listListings(appId: string): Promise<Listing[]>;
  getListing(appId: string, id: number): Promise<Listing | null>;
  createListing(input: ListingInput, now: Date): Promise<Listing>;
  updateListing(appId: string, id: number, patch: Partial<ListingInput>, now: Date): Promise<void>;
  /** The office's settings; null until saved (the defaults apply). */
  getListingSettings(appId: string): Promise<ListingSettings | null>;
  saveListingSettings(appId: string, settings: ListingSettings, now: Date): Promise<void>;
  /** Adds once; adding again keeps the first date. */
  addListingFavorite(favorite: ListingFavorite): Promise<void>;
  removeListingFavorite(appId: string, userId: number, listingId: number): Promise<void>;
  /** A user's favorites, newest first. */
  listListingFavorites(appId: string, userId: number): Promise<ListingFavorite[]>;
  createListingInquiry(input: Omit<ListingInquiry, "id">): Promise<ListingInquiry>;
  getListingInquiry(appId: string, id: number): Promise<ListingInquiry | null>;
  /** The user's open conversation about the listing, if any. */
  findOpenListingInquiry(appId: string, userId: number, listingId: number): Promise<ListingInquiry | null>;
  updateListingInquiry(appId: string, id: number, patch: Partial<Pick<ListingInquiry, "status" | "updatedAt">>): Promise<void>;
  /** Adds a message and moves the conversation's `updatedAt` to it. */
  addListingInquiryMessage(input: Omit<ListingInquiryMessage, "id" | "readAt">): Promise<ListingInquiryMessage>;
  /** A conversation's messages, oldest first. */
  listListingInquiryMessages(appId: string, inquiryId: number): Promise<ListingInquiryMessage[]>;
  /** Marks the messages `from` one side as read by the other. */
  markListingInquiryRead(appId: string, inquiryId: number, from: "user" | "office", now: Date): Promise<void>;
  /** Conversations, latest message first: one user's, or the whole office's. */
  listListingInquiries(input: {
    appId: string;
    userId?: number;
    status?: ListingInquiryStatus;
    offset: number;
    limit: number;
  }): Promise<{ items: ListingInquiryRow[]; total: number }>;
  /** Conversations with user messages the office hasn't read. */
  countUnreadListingInquiries(appId: string): Promise<number>;

  // 23 News & blog apps: articles written in the dashboard
  /** Every article of the app, any status, newest first. */
  listArticles(appId: string): Promise<Article[]>;
  getArticle(appId: string, id: number): Promise<Article | null>;
  createArticle(input: ArticleInput, now: Date): Promise<Article>;
  updateArticle(appId: string, id: number, patch: Partial<ArticleInput>, now: Date): Promise<void>;
  deleteArticle(appId: string, id: number): Promise<void>;
  /** The app's article categories, in their order. */
  listArticleCategories(appId: string): Promise<ArticleCategory[]>;
  createArticleCategory(input: Omit<ArticleCategory, "id">): Promise<ArticleCategory>;
  updateArticleCategory(appId: string, id: number, patch: Partial<Pick<ArticleCategory, "name" | "position">>): Promise<void>;
  /** Deletes the category; articles keep their other categories. */
  deleteArticleCategory(appId: string, id: number): Promise<void>;
  /** How articles show in the app; null until saved (the defaults apply). */
  getNewsSettings(appId: string): Promise<NewsSettings | null>;
  saveNewsSettings(appId: string, settings: NewsSettings, now: Date): Promise<void>;

  // 28 Events & tickets apps
  /** Every event of the app, any status, soonest first. */
  listEvents(appId: string): Promise<EventRecord[]>;
  getEvent(appId: string, id: number): Promise<EventRecord | null>;
  createEvent(input: EventInput, now: Date): Promise<EventRecord>;
  updateEvent(appId: string, id: number, patch: Partial<EventInput>, now: Date): Promise<void>;
  /** Deletes the event with its ticket types and tickets. */
  deleteEvent(appId: string, id: number): Promise<void>;
  /** The ticket types of the app, or of one event, in their order. */
  listTicketTypes(appId: string, eventId?: number): Promise<TicketType[]>;
  createTicketType(input: TicketTypeInput, now: Date): Promise<TicketType>;
  updateTicketType(appId: string, id: number, patch: Partial<Omit<TicketTypeInput, "appId" | "eventId">>): Promise<void>;
  /** Deletes the ticket type with its tickets. */
  deleteTicketType(appId: string, id: number): Promise<void>;
  /**
   * Takes places for tickets, atomically: the tickets that hold a place (valid,
   * used, and pending ones until their hold ends) of the event and of the
   * ticket type are counted, and the new ones are written only if every one of
   * them fits both limits; two claims never see the same free places. Refused
   * when the event isn't published or the ticket type isn't the event's.
   */
  claimTickets(claim: TicketClaim): Promise<{ ok: true; tickets: EventTicket[] } | { ok: false; reason: TicketClaimRefusal }>;
  /** Places taken per ticket type (valid, used and pending tickets until their hold ends), for what's left. */
  countTicketPlaces(appId: string, now: Date): Promise<{ eventId: number; ticketTypeId: number; count: number }[]>;
  /** Tickets of the app, by event, holder or order, oldest first. */
  listTickets(input: { appId: string; eventId?: number; userId?: number; orderId?: number }): Promise<EventTicket[]>;
  getTicketByCode(appId: string, code: string): Promise<EventTicket | null>;
  /**
   * A paid order's pending tickets become valid (once). 49 Tickets whose hold
   * ended before the payment was confirmed become valid only while their
   * places are still free (counted like a claim, atomically); otherwise
   * they're cancelled. Returns how many were issued and how many released.
   */
  issueOrderTickets(appId: string, orderId: number, now: Date): Promise<{ issued: number; released: number }>;
  /** 49 An order's pending tickets whose hold hasn't ended are held until then; returns how many. */
  holdOrderTickets(appId: string, orderId: number, until: Date, now: Date): Promise<number>;
  /** Marks a valid ticket used, once: a second check-in is refused with the ticket as it is. */
  checkInTicket(appId: string, code: string, now: Date): Promise<CheckInResult>;
  /** Cancels valid tickets (these, or every one of an event); returns how many. Their places go back on sale. */
  cancelTickets(appId: string, input: { ids?: number[]; eventId?: number; /** 47 Marks them refunded too. */ refunded?: boolean }, now: Date): Promise<number>;
  /** How events show and sell in the app; null until saved (the defaults apply). */
  getEventSettings(appId: string): Promise<EventSettings | null>;
  saveEventSettings(appId: string, settings: EventSettings, now: Date): Promise<void>;
  // 29 Charity & donations apps: campaigns and donations
  /** Every campaign of the app, any status, newest first. */
  listCampaigns(appId: string): Promise<Campaign[]>;
  getCampaign(appId: string, id: number): Promise<Campaign | null>;
  createCampaign(input: CampaignInput, now: Date): Promise<Campaign>;
  /** Never changes what was raised: only paying a donation does. */
  updateCampaign(appId: string, id: number, patch: Partial<CampaignInput>, now: Date): Promise<void>;
  /** Deletes the campaign; its donations stay, with its title. */
  deleteCampaign(appId: string, id: number): Promise<void>;
  /** Sets what a campaign has raised outright: only for the demo apps' sample campaigns (16). */
  setCampaignTotals(appId: string, id: number, totals: Pick<Campaign, "raisedCents" | "donorCount">): Promise<void>;
  createDonation(input: DonationInput): Promise<Donation>;
  getDonation(appId: string, id: number): Promise<Donation | null>;
  getDonationByToken(tokenHash: string): Promise<Donation | null>;
  getDonationByReceipt(receiptCode: string): Promise<Donation | null>;
  updateDonation(appId: string, id: number, patch: DonationPatch): Promise<void>;
  /**
   * Marks a pending donation paid and, in the same transaction, adds it to
   * its campaign's total, and counts the donor once per email address. With
   * `count` false (demo donations) the campaign stays as it is. False when it
   * wasn't pending.
   */
  payDonation(appId: string, id: number, paymentId: string, now: Date, options?: { count?: boolean }): Promise<boolean>;
  /** Newest first; by campaign, app user or status. */
  listDonations(input: {
    appId: string;
    campaignId?: number;
    userId?: number;
    statuses?: DonationStatus[];
    offset: number;
    limit: number;
  }): Promise<{ items: Donation[]; total: number }>;
  /** App users with a paid donation to the campaign (for campaign updates). */
  listCampaignDonorUserIds(appId: string, campaignId: number): Promise<number[]>;
  /** How the app takes donations; null until saved (the defaults apply). */
  getDonationSettings(appId: string): Promise<DonationSettings | null>;
  saveDonationSettings(appId: string, settings: DonationSettings, now: Date): Promise<void>;

  // 10.4 Pages, looks and languages
  getAppLayout(appId: string): Promise<AppLayoutRecord | null>;
  /** Creates or replaces the app's layout. */
  saveAppLayout(layout: AppLayoutRecord): Promise<void>;

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
  /** Every app of every client. */
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


  // 11.3 Website content
  listSiteContent(): Promise<SiteContentRecord[]>;
  getSiteContent(key: string): Promise<SiteContentRecord | null>;
  /** Saves a page's texts, or removes the edit (back to the text in code) when `fields` is null. */
  setSiteContent(key: string, fields: Record<string, string> | null, updatedBy: string, now: Date): Promise<void>;

  // 11.4 Email templates
  listEmailTemplates(): Promise<EmailTemplateRecord[]>;
  getEmailTemplate(key: string): Promise<EmailTemplateRecord | null>;
  /** Saves an email's subject and body, or removes the edit (back to the default) when `template` is null. */
  setEmailTemplate(key: string, template: { subject: string; body: string } | null, updatedBy: string, now: Date): Promise<void>;

  // 11.6 Coupons
  /** False (and nothing saved) when another coupon has the same code. */
  createCoupon(coupon: Coupon): Promise<boolean>;
  /** False (and nothing saved) when another coupon has the new code. */
  updateCoupon(id: string, patch: CouponPatch, now: Date): Promise<boolean>;
  getCoupon(id: string): Promise<Coupon | null>;
  /** `code` in upper case. */
  getCouponByCode(code: string): Promise<Coupon | null>;
  /** Newest first. */
  listCoupons(): Promise<Coupon[]>;
  createCouponRedemption(redemption: CouponRedemption): Promise<void>;
  /** Moves a pending redemption (by its plan payment) to redeemed or failed. */
  settleCouponRedemption(paymentId: string, status: "redeemed" | "failed", now: Date): Promise<void>;
  /** Newest first: a coupon's, a client's, or both. */
  listCouponRedemptions(input: { couponId?: string; clientId?: string }): Promise<CouponRedemption[]>;

  // 11.8 Announcements
  createAnnouncement(announcement: Announcement): Promise<void>;
  updateAnnouncement(id: string, patch: AnnouncementPatch, now: Date): Promise<void>;
  /** Also forgets who dismissed it (57: and who read it). */
  deleteAnnouncement(id: string): Promise<void>;
  getAnnouncement(id: string): Promise<Announcement | null>;
  /** Newest start first. */
  listAnnouncements(): Promise<Announcement[]>;
  /** Hides an announcement from a client's dashboard banner (once; again is a no-op). */
  dismissAnnouncement(input: { announcementId: string; clientId: string; now: Date }): Promise<void>;
  /** The announcements a client dismissed. */
  listDismissedAnnouncementIds(clientId: string): Promise<string[]>;

  // 57 The dashboard's bell: what each person read (per user; lib/updates.ts makes the item keys)
  /** Marks items read for a user (`announcement:<id>`, `notice:<id>`, …); an item read before keeps its first time. */
  markUpdatesRead(input: { userId: string; items: string[]; now: Date }): Promise<void>;
  /** Which of these items the user read. */
  listReadUpdates(userId: string, items: string[]): Promise<string[]>;

  // 14.1 We publish for you
  getPublishingRequest(appId: string): Promise<PublishingRequest | null>;
  /** Saves the whole request: inserts it, or replaces the app's. */
  savePublishingRequest(request: PublishingRequest): Promise<void>;
  /** Apps whose client asked us to publish them ("managed"), oldest request first. */
  listManagedPublishingRequests(): Promise<PublishingRequest[]>;
  addPublishingEvent(event: Omit<PublishingEvent, "id">): Promise<PublishingEvent>;
  /** An app's status changes, newest first. */
  listPublishingEvents(appId: string): Promise<PublishingEvent[]>;

  // 13 Plans, limits and owner notices
  /** Every license of every client (the daily job: reminders and due plan changes). */
  listLicenses(): Promise<License[]>;
  /** Null (and nothing saved) when the app already has a notice with this dedupe key. */
  createOwnerNotice(notice: Omit<OwnerNotice, "id">): Promise<OwnerNotice | null>;
  /** Newest first: a client's notices, one app's, or only the open ones (neither dismissed nor resolved). */
  listOwnerNotices(input: { clientId: string; appId?: string; open?: boolean; limit?: number }): Promise<OwnerNotice[]>;
  /** How many notices of this kind the app ever had (for the next crossing's dedupe key). */
  countOwnerNotices(appId: string, kind: OwnerNoticeKind): Promise<number>;
  /** Only the client's own notice changes. */
  updateOwnerNotice(clientId: string, id: number, patch: OwnerNoticePatch): Promise<void>;
  /** Marks the app's open notices of these kinds resolved. */
  resolveOwnerNotices(appId: string, kinds: OwnerNoticeKind[], now: Date): Promise<void>;

  // 46 Links that open the app and crash reports
  /** Every app with a package name or bundle ID, with what its link files need (oldest first). */
  listAppLinkTargets(): Promise<AppLinkTarget[]>;
  /**
   * Adds reports to their groups (one per app and fingerprint): counts, last
   * seen, versions and platforms; a resolved group seen again opens again.
   * Adds the runs to the day's counts. One transaction.
   */
  recordCrashReports(appId: string, reports: CrashReportInput[], runs: { day: string; sessions: number; crashed: number }): Promise<void>;
  /** Groups, last seen first: one app's, or every app's for the team. */
  listCrashIssues(input: { appId?: string; status?: CrashIssueStatus; limit: number }): Promise<CrashIssue[]>;
  getCrashIssue(id: string): Promise<CrashIssue | null>;
  setCrashIssueStatus(id: string, status: CrashIssueStatus, now: Date): Promise<void>;
  /** The runs and the runs with a crash of an app since a day (YYYY-MM-DD, UTC), inclusive. */
  crashSessionTotals(appId: string, sinceDay: string): Promise<{ sessions: number; crashed: number }>;

  // 49 Signed notices to an app's own API
  createApiWebhook(webhook: ApiWebhook): Promise<void>;
  getApiWebhook(id: string): Promise<ApiWebhook | null>;
  /** Pending notices due at `now`, oldest first. */
  listDueApiWebhooks(now: Date, limit: number): Promise<ApiWebhook[]>;
  /**
   * Takes a pending notice due at `now` for one try: moves its next try to
   * `until`, so another run doesn't send it at the same time. False when it
   * isn't pending and due any more.
   */
  claimApiWebhook(id: string, until: Date, now: Date): Promise<boolean>;
  updateApiWebhook(id: string, patch: ApiWebhookPatch): Promise<void>;
  /** An app's notices, newest first. */
  listApiWebhooks(appId: string, limit: number): Promise<ApiWebhook[]>;
  /** Deletes notices created before `before`; returns how many. */
  purgeApiWebhooks(before: Date): Promise<number>;

  // 16 Demo apps
  /**
   * Deletes what app users did in one app before `before`: orders, appointments,
   * conversations with the office (and their messages), favorites, enrolments,
   * lesson progress, notifications to one user, and devices not seen since
   * (signed out). Users, products, courses and listings stay. Only ever called
   * for demo apps (lib/demo/cleanup.ts checks).
   */
  purgeDemoActivity(appId: string, before: Date): Promise<DemoPurgeCounts>;

  // 44 Analytics for app owners (lib/analytics). Days are UTC, YYYY-MM-DD.
  insertAnalyticsEvents(events: AnalyticsEventRow[]): Promise<void>;
  /** The raw events of one app and day. */
  listAnalyticsEvents(appId: string, day: string): Promise<AnalyticsEventRow[]>;
  /** Distinct installs with any event from `fromDay` to `toDay` (both included). */
  countAnalyticsActive(appId: string, fromDay: string, toDay: string): Promise<number>;
  /** Of the installs first opened on `cohortDay`, how many have an event on `day`. */
  countAnalyticsReturning(appId: string, cohortDay: string, day: string): Promise<number>;
  /** Sets daily totals (each metric and key replaces what the day had). */
  saveAnalyticsDaily(appId: string, day: string, rows: AnalyticsDailyRow[]): Promise<void>;
  /** Adds to one daily total (search counts, pushes sent, late-event marks). */
  addAnalyticsDaily(appId: string, day: string, row: AnalyticsDailyRow): Promise<void>;
  listAnalyticsDaily(appId: string, fromDay: string, toDay: string, metrics?: AnalyticsMetric[]): Promise<AnalyticsDailyRecord[]>;
  /** The days from `fromDay` on with raw events of the app. */
  listAnalyticsEventDays(appId: string, fromDay: string): Promise<string[]>;
  /** Apps with raw events on `fromDay` or later. */
  listAnalyticsAppIds(fromDay: string): Promise<string[]>;
  /** Deletes raw events of days before `beforeDay`; returns how many. */
  purgeAnalyticsEvents(beforeDay: string): Promise<number>;

  // 51 Videos and pictures hosted by Yallapp (lib/media)
  createMediaFile(file: MediaFile): Promise<void>;
  /** One app's file. */
  getMediaFile(appId: string, id: string): Promise<MediaFile | null>;
  /** Any app's file, for its public link and the plugin's signed links (the caller checks the app). */
  getMediaFileById(id: string): Promise<MediaFile | null>;
  /** Newest first. */
  listMediaFiles(appId: string, input?: { kind?: MediaKind; status?: MediaStatus; limit?: number }): Promise<MediaFile[]>;
  updateMediaFile(appId: string, id: string, patch: MediaFilePatch): Promise<void>;
  deleteMediaFile(appId: string, id: string): Promise<void>;
  /** Bytes the app's files take, uploads in progress included (their announced size). */
  mediaUsage(appId: string): Promise<number>;
  /** Uploads of every app not finished since `before` (the daily job cancels them). */
  listStaleMediaUploads(before: Date, limit: number): Promise<MediaFile[]>;
  createStoragePack(pack: StoragePack): Promise<void>;
  /** An app's packs, the latest ending first. */
  listStoragePacks(appId: string): Promise<StoragePack[]>;
  updateStoragePack(id: string, patch: StoragePackPatch): Promise<void>;
  deleteStoragePack(appId: string, id: string): Promise<void>;
  /** Packs of every app that ended before `now` and whose end the owner wasn't told of yet. */
  listEndedStoragePacks(now: Date, limit: number): Promise<StoragePack[]>;

  // 58 Yallapp Business: devices signed in with the dashboard's account (lib/owner)
  createOwnerDevice(device: OwnerDevice): Promise<void>;
  getOwnerDevice(id: string): Promise<OwnerDevice | null>;
  /** The device whose current refresh token has this hash. */
  findOwnerDeviceByRefresh(refreshHash: string): Promise<OwnerDevice | null>;
  /**
   * Replaces the device's refresh token, only while it still has `oldHash`
   * (atomic: of two renewals with the same token, one wins). False otherwise.
   */
  rotateOwnerRefresh(id: string, oldHash: string, next: { refreshHash: string; refreshExpiresAt: Date; lastSeenAt: Date }): Promise<boolean>;
  updateOwnerDevice(id: string, patch: OwnerDevicePatch): Promise<void>;
  /** A person's devices, the one used last first. */
  listOwnerDevices(userId: string): Promise<OwnerDevice[]>;
  /** Signs a device out; false when it isn't this person's. */
  deleteOwnerDevice(userId: string, id: string): Promise<boolean>;
  /** Signs every device of a person out; returns how many. */
  deleteOwnerDevices(userId: string): Promise<number>;
  /** Forgets a push token on every device but `exceptId` (a token moved, or the push service says it's gone). */
  clearOwnerPushToken(token: string, exceptId: string | null): Promise<void>;
  /** Deletes devices whose refresh token ended before `now`; returns how many. */
  purgeOwnerDevices(now: Date): Promise<number>;
  /** 60 Signs out a person's devices signed in to one client (a member removed from its team); returns how many. */
  deleteOwnerDevicesOfClient(userId: string, clientId: string): Promise<number>;
  /** 60 The devices signed in to a client, of anyone (the owner and the team): for pushes. */
  listOwnerDevicesOfClient(clientId: string): Promise<OwnerDevice[]>;

  // 60 Team members for clients (lib/team)
  /** The client's members with their accounts, in the order they joined. */
  listTeamMembers(clientId: string): Promise<TeamMemberRow[]>;
  getTeamMember(clientId: string, userId: string): Promise<TeamMember | null>;
  /** Every client a person is a member of (not their own), in the order they joined. */
  listMembershipsOfUser(userId: string): Promise<TeamMember[]>;
  /** Adds or replaces a member (client and user are the key). */
  saveTeamMember(member: TeamMember): Promise<void>;
  /** False when they weren't a member. */
  deleteTeamMember(clientId: string, userId: string): Promise<boolean>;
  createTeamInvitation(invitation: TeamInvitation): Promise<void>;
  /** The client's invitation; never another client's. */
  getTeamInvitation(clientId: string, id: string): Promise<TeamInvitation | null>;
  getTeamInvitationByToken(tokenHash: string): Promise<TeamInvitation | null>;
  /** Invitations neither accepted nor cancelled (expired ones too), newest first. */
  listOpenTeamInvitations(clientId: string): Promise<TeamInvitation[]>;
  updateTeamInvitation(clientId: string, id: string, patch: TeamInvitationPatch): Promise<void>;
  /**
   * Marks the invitation accepted only while it is open, unexpired and still
   * has `tokenHash` (atomic: single use). False otherwise.
   */
  acceptTeamInvitation(id: string, tokenHash: string, now: Date): Promise<boolean>;
  addTeamActivity(entry: Omit<TeamActivity, "id">): Promise<void>;
  /** Newest first. */
  listTeamActivity(clientId: string, input: { limit: number; offset?: number; actorId?: string }): Promise<{ items: TeamActivity[]; total: number }>;

  // 61 Today's numbers counted by the database, for a window [from, to)
  /** Paid orders (in progress, completed, cancelled or refunded) whose payment came in the window. */
  sumPaidCatalogOrders(appId: string, from: Date, to: Date): Promise<PaidTotals>;
  /** Paid (or since refunded) donations whose payment came in the window. */
  sumPaidDonations(appId: string, from: Date, to: Date): Promise<PaidTotals>;
  /** App users who signed up in the window. */
  countHostedUsersCreated(appId: string, from: Date, to: Date): Promise<number>;
  /** Tickets issued (valid or used) and tickets checked in, in the window. */
  countTicketsInWindow(appId: string, from: Date, to: Date): Promise<{ issued: number; checkedIn: number }>;

  // 61 Notifications to an app's users sent later (lib/hosted/scheduled-notifications.ts)
  createScheduledNotification(input: Omit<ScheduledNotification, "id">): Promise<ScheduledNotification>;
  getScheduledNotification(appId: string, id: number): Promise<ScheduledNotification | null>;
  /** The app's notifications in these statuses, soonest first. */
  listScheduledNotifications(appId: string, statuses: ScheduledNotificationStatus[]): Promise<ScheduledNotification[]>;
  /** Waiting ones of every app whose time came (`sendAt` at or before `now`), soonest first. */
  listDueScheduledNotifications(now: Date, limit: number): Promise<ScheduledNotification[]>;
  /** Taken by the job before `before` and still `sending`, of every app. */
  listStaleScheduledNotifications(before: Date): Promise<ScheduledNotification[]>;
  /** Changes it only while its status is `expect` (atomic); false otherwise, with nothing changed. */
  updateScheduledNotification(appId: string, id: number, expect: ScheduledNotificationStatus, patch: ScheduledNotificationPatch): Promise<boolean>;

  // 61 Announcements pushed to the owners' phones when they start
  /** Marks the announcement pushed, only if it wasn't yet (atomic); false otherwise. */
  claimAnnouncementPush(id: string, now: Date): Promise<boolean>;

  // 66 Requests to delete a Yallapp account (lib/account/deletion.ts)
  /** Saves a new pending request; false (nothing saved) when the client already has one open (atomic: of two at once, one wins). */
  createAccountDeletionRequest(request: AccountDeletionRequest): Promise<boolean>;
  getAccountDeletionRequest(id: string): Promise<AccountDeletionRequest | null>;
  /** The client's open (pending) request, if any. */
  getOpenAccountDeletionRequest(clientId: string): Promise<AccountDeletionRequest | null>;
  /** Requests in these statuses (all when empty), newest first; at most `limit`. */
  listAccountDeletionRequests(statuses: AccountDeletionStatus[], limit: number): Promise<AccountDeletionRequest[]>;
  /** Closes the request only while it is pending (atomic); false otherwise, with nothing changed. */
  closeAccountDeletionRequest(id: string, close: AccountDeletionClose): Promise<boolean>;
}
