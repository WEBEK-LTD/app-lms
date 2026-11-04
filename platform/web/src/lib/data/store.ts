import type {
  Activation,
  App,
  AppLayoutRecord,
  AppLayoutVersion,
  AppLayoutVersionSummary,
  SavedSection,
  StudioTemplate,
  StudioDesign,
  OwnFont,
  StoreProduct,
  StorePurchaseRecord,
  StorePurchaseEvent,
  StoreBillingItem,
  BillingSession,
  Asset,
  Build,
  BuildStatus,
  CatalogCategory,
  CatalogOrder,
  CatalogOrderPatch,
  CatalogOrderStatus,
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
  AssignmentSubmission,
  AssignmentSubmissionInput,
  LessonBookmark,
  LessonNote,
  CatalogCoupon,
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
import type { PendingPayment, PublishingEvent, PublishingRequest } from "./types";
// 13 Owner notices
import type { OwnerNotice, OwnerNoticeKind, OwnerNoticePatch } from "./types";
// 16 Demo apps
import type { DemoPurgeCounts } from "./types";
import type { PushAudience } from "./types";
// 23 News & blog
import type { Article, ArticleCategory, ArticleInput, NewsSettings } from "./types";
// 28 Events & tickets
import type { CheckInResult, EventInput, EventRecord, EventSettings, EventTicket, TicketClaim, TicketClaimRefusal, TicketType, TicketTypeInput } from "./types";
// 34 Yallapp sign-in for own API apps
import type { AppAuthKey, BuildVariant } from "./types";
// 63
import type { CourseAnswer, CourseAnswerInput, CourseQuestion, CourseQuestionInput, CourseQuestionStatus, CourseReview, CourseReviewPatch, MemberCheckIn } from "./types";
// 29 Charity & donations
import type { AnalyticsDailyRecord, AnalyticsDailyRow, AnalyticsEventRow, AnalyticsMetric } from "../analytics/types";
import type { Campaign, CampaignInput, Donation, DonationInput, DonationPatch, DonationSettings, DonationStatus } from "./types";
// 105.3 Academies with many teachers
import type { Teacher, TeacherInput, TeacherPatch, TeacherReview, TeacherStatus } from "./types";
// 105.4 Schools
import type {
  SchoolAnnouncement,
  SchoolAssessment,
  SchoolAttendance,
  SchoolCheckin,
  SchoolBehaviourCategory,
  SchoolBehaviourNote,
  SchoolClass,
  SchoolEvent,
  SchoolEventInput,
  SchoolExam,
  SchoolExamInput,
  SchoolFamilyLink,
  SchoolFee,
  SchoolReport,
  SchoolReportStatus,
  SchoolReportTemplate,
  SchoolSyllabusTopic,
  SchoolSyllabusUnit,
  SchoolTopicProgress,
  SchoolHomework,
  SchoolLeave,
  SchoolExcuse,
  SchoolPickup,
  SchoolPickupNote,
  SchoolSlip,
  SchoolSlipAnswer,
  SchoolSlipInput,
  SchoolPeriod,
  SchoolPerson,
  SchoolPersonInput,
  SchoolPersonPatch,
  SchoolRole,
  SchoolScore,
  SchoolSettings,
  SchoolSubject,
  SchoolSubmission,
} from "./types";
// 113.10 The school bus; 113.11 the library
import type {
  SchoolBook,
  SchoolBookCopy,
  SchoolBookHold,
  SchoolBookHoldStatus,
  SchoolBookLoan,
  SchoolBusMark,
  SchoolBusRider,
  SchoolBusRoute,
  SchoolBusRun,
  SchoolBusRunStatus,
  SchoolBusStop,
  SchoolBusTrip,
} from "./types";
// 113.12 Salaries
import type { SchoolPayslip, SchoolPayslipStatus, SchoolSalary, SchoolSalaryAdvance, SchoolSalaryMonth } from "./types";
// 113.9 Universities
import type { UniAttendance, UniCourse, UniDepartment, UniEnrolment, UniEnrolmentStatus, UniFaculty, UniProgram, UniRegistration, UniRegistrationStatus, UniSection, UniSettings, UniStudent, UniTerm } from "./types";
// 104 Delivery and courier companies
import type { Courier, CourierInput, CourierPatch, DeliveryService, DeliveryServiceInput, DeliverySettings, Shipment, ShipmentInput, ShipmentPatch, ShipmentQuery, ShipmentStatus } from "./types";
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
  MarketAisle,
  MarketComplaint,
  MarketComplaintInput,
  MarketComplaintPatch,
  MarketComplaintQuery,
  MarketOrder,
  MarketOrderInput,
  MarketOrderPatch,
  MarketOrderQuery,
  MarketOrderStatus,
  WalletEntry,
  MarketDepartment,
  MarketProduct,
  MarketProductInput,
  MarketProductQuery,
} from "./types";
// 105.2 Ride hailing
import type { Ride, RideInput, RidePatch, RideQuery, RideStatementRow, RideStatus, VehicleType, VehicleTypeInput } from "./types";
// 46 Links and crash reports
import type { AppLinkTarget, CrashIssue, CrashIssueStatus, CrashReportInput } from "./types";
// 49
import type { ApiWebhook, ApiWebhookEvent, ApiWebhookPatch } from "./types";
// 47 Refunds
import type { PaymentRefund, RefundKind } from "./types";
// 51 Media and storage
import type { MediaFile, MediaFilePatch, MediaKind, MediaStatus, StoragePack, StoragePackPatch } from "./types";
// 10.7 Listings
// 58 Yallapp Business
import type { OwnerDevice, OwnerDevicePatch } from "./types";
// 114 Email campaigns
import type { MailCampaign, MailCampaignStatus, MailEvent, MailEventStats, MailRecipient, MailRecipientStatus, MailRun, MailSegment, MailSuppression, MailTemplate } from "../mailing/types";
// 104.8.2 Yallapp Courier
import type { CourierAccount, CourierChallenge, CourierDevice, CourierDevicePatch } from "./types";
// 60 Team members for clients
import type { TeamActivity, TeamInvitation, TeamInvitationPatch, TeamMember, TeamMemberRow } from "./types";
// 61
import type { BookingAppointmentMove, PaidTotals, ScheduledNotification, ScheduledNotificationPatch, ScheduledNotificationStatus } from "./types";
import type { CampaignSend, HostedCart, HostedOrderWatch, NotificationCampaign, NotificationCampaignPatch, NotificationCampaignStatus } from "./types";
import type { LoyaltyEntry, LoyaltyReason } from "./types";
// 66 Deleting a Yallapp account
import type { AccountDeletionClose, AccountDeletionRequest, AccountDeletionStatus } from "./types";
// 73 Deleting an app, and the billing records kept when an account goes
import type { AppDeletion, AppDeletionStatus, KeptBillingRecord } from "./types";
import type { ChatConversation, ChatConversationKind, ChatConversationPatch, ChatMember, ChatMemberSource, ChatMessage, ChatParticipant, ChatReport, ChatReportOutcome, ChatSession, ChatUploadInfo } from "./types";
import type { CouponClaimLimits, UserSession, UserTwoFactor } from "./types";
import type { AppError, ClientMilestone, JobRun, MilestoneKind, ProductDay, RekeyCell, TeamAlert, TeamAlertKind, WatchedJob } from "./types";
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
export type HostedDevicePatch = Partial<Pick<HostedDevice, "platform" | "name" | "appVersion" | "pushToken" | "pushProvider" | "pushPreferences" | "lastSeenAt" | "language" | "country" | "appRole" | "courierDeviceId">>;

export type ClaimResult = { ok: true; activation: Activation } | { ok: false; existing: Activation };

export type UserPatch = Partial<Pick<User, "name" | "passwordHash" | "sessionVersion" | "lastSignInAt" | "language">>;
export type ClientPatch = Partial<Pick<Client, "whatsapp" | "siteUrl" | "status" | "paymentNote" | "activatedAt" | "country">>;
export type LicensePatch = Partial<Pick<License, "plan" | "expiresAt" | "keyHash" | "keyEncrypted" | "keyLast4" | "nextPlan" | "nextPlanAt">>;
export type AppPatch = Partial<Omit<App, "id" | "clientId" | "createdAt" | SigningKeyColumn>>;
/** Signing keys created by the build pipeline. Written only through `saveSigningKeys`, which never replaces one. */
export type SigningKeyColumn = "androidUploadKeyEncrypted" | "iosDistributionEncrypted";
export type SigningKeysPatch = Partial<Record<SigningKeyColumn, string>>;
export type BuildPatch = Partial<
  Pick<Build, "status" | "stages" | "artifacts" | "message" | "logUrl" | "failure" | "sourceCommit" | "startedAt" | "finishedAt">
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
  /** 68 Licenses of an app whose end date is after `from` and not after `to` (plans that ended meanwhile). */
  listLicensesEndedBetween(from: Date, to: Date): Promise<License[]>;
  /**
   * 68 Records that the app's WordPress site is asked to check its license for
   * the end at `expiresAt`, once: true only for the first caller while the
   * license still ends then (a renewal meanwhile changes the end) and that end
   * has passed by `now`. Atomic, so two jobs at once ask the site once.
   */
  claimLicenseEndRefresh(licenseId: string, expiresAt: Date, now: Date): Promise<boolean>;

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
  /** 104.6 The app's own builds, or the courier app's, or every one ("all"). */
  listBuildsByApp(appId: string, limit: number, variant?: BuildVariant | "all"): Promise<Build[]>;
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
  /** 85.1 Every signed-in phone of the app, for choosing a campaign's audience. */
  listAppHostedDevices(appId: string): Promise<HostedDevice[]>;
  /** 85.1 Everyone who signed up to the app, with when. */
  listHostedUserIds(appId: string): Promise<{ id: number; createdAt: Date }[]>;
  /**
   * 85.1 People the app knows something about: who paid for an order
   * ("buyers"), the students of one course or of any ("students"), and whose
   * membership is active now ("members").
   */
  listAudienceUserIds(input: { appId: string; who: "buyers" | "students" | "members"; courseId?: number | null; now: Date }): Promise<number[]>;
  /** Signs the device out: deletes it and its refresh tokens. */
  deleteHostedDevice(appId: string, id: string): Promise<void>;
  /** Devices with a push token: every customer's, or only these customers'. 112.3 `audience`: the customers' pushes (the default) skip the couriers' and drivers' app's devices, the second app's skip the customers' app's; devices with no role get both. */
  listHostedPushDevices(appId: string, userIds: number[] | null, audience?: PushAudience): Promise<HostedDevice[]>;
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
  /** 85.2 The people a targeted notification is for (it is in their inboxes only). */
  addHostedNotificationRecipients(appId: string, notificationId: number, userIds: number[]): Promise<void>;
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
   * 113.7 `lessonId`: a lesson's discussion (null: the course's own questions); `created`: pinned ones first.
   */
  listCourseQuestions(input: {
    appId: string;
    courseIds?: number[];
    status?: CourseQuestionStatus;
    hidden?: boolean;
    viewerId?: number;
    lessonId?: number | null;
    order: "created" | "updated";
    offset: number;
    limit: number;
  }): Promise<{ items: CourseQuestion[]; total: number }>;
  /** 113.7 Pins a question (first in its list) or unpins it; false when it isn't the app's. */
  setCourseQuestionPinned(appId: string, id: number, pinned: boolean): Promise<boolean>;
  /** 113.7 Deletes a question with its answers; false when it isn't the app's. */
  deleteCourseQuestion(appId: string, id: number): Promise<boolean>;
  /** 113.7 Deletes an answer under the question; false when there's no such answer. */
  deleteCourseAnswer(appId: string, questionId: number, id: number): Promise<boolean>;
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
  /** 112.5 Puts an enrolled student in one of the course's cohorts (null: none); false when they aren't enrolled. */
  setEnrollmentCohort(input: { appId: string; userId: number; courseId: number; cohortId: number | null }): Promise<boolean>;
  /** Saves a lesson's video position, and marks it complete when `completedAt` is given (never un-completes). */
  saveLessonProgress(input: LessonProgress): Promise<void>;
  /** 113.7 Without `userId`, every student's (a course's leaderboard). */
  listLessonProgress(input: { appId: string; userId?: number; courseId?: number }): Promise<LessonProgress[]>;
  /** 73 Clears a student's progress in a course (start it again); how many lessons had some. */
  deleteLessonProgress(input: { appId: string; userId: number; courseId: number }): Promise<number>;
  // 90.1 Quiz attempts of courses managed in Yallapp.
  createQuizAttempt(input: Omit<QuizAttempt, "id">): Promise<QuizAttempt>;
  getQuizAttempt(appId: string, id: number): Promise<QuizAttempt | null>;
  /** Records the answers and score of an attempt not yet submitted; false when it already was. */
  submitQuizAttempt(appId: string, id: number, result: Pick<QuizAttempt, "answers" | "scorePercent" | "passed" | "submittedAt">): Promise<boolean>;
  listQuizAttempts(input: { appId: string; userId?: number; courseId?: number; quizId?: number }): Promise<QuizAttempt[]>;
  deleteQuizAttempts(input: { appId: string; userId: number; courseId: number }): Promise<number>;
  // 112.5 Assignments' submissions: one per student and assignment.
  /** Hands in (or again): the text and file, `submitted`, the grade cleared; the row's ID kept. 113.7 With its attempt. */
  saveAssignmentSubmission(input: AssignmentSubmissionInput): Promise<AssignmentSubmission>;
  getAssignmentSubmission(appId: string, id: number): Promise<AssignmentSubmission | null>;
  /** Newest first. */
  listAssignmentSubmissions(input: { appId: string; userId?: number; courseId?: number; assignmentId?: number; status?: AssignmentSubmission["status"] }): Promise<AssignmentSubmission[]>;
  /** Grades a submission, or returns it for another try; false when there's no such submission. */
  gradeAssignmentSubmission(appId: string, id: number, grade: Pick<AssignmentSubmission, "status" | "score" | "feedback" | "gradedAt" | "gradedBy"> & { rubric?: AssignmentSubmission["rubric"] }): Promise<boolean>;
  deleteAssignmentSubmissions(input: { appId: string; userId: number; courseId: number }): Promise<number>;
  // 113.7 A student's notes and bookmarks in lessons.
  createLessonNote(input: Omit<LessonNote, "id">): Promise<LessonNote>;
  getLessonNote(appId: string, id: number): Promise<LessonNote | null>;
  /** Oldest first. */
  listLessonNotes(input: { appId: string; userId: number; courseId?: number; lessonId?: number }): Promise<LessonNote[]>;
  /** False when there's no such note. */
  updateLessonNote(appId: string, id: number, patch: Pick<LessonNote, "text" | "updatedAt">): Promise<boolean>;
  deleteLessonNote(appId: string, id: number): Promise<boolean>;
  /** Bookmarks a lesson (once) or takes the bookmark away. */
  setLessonBookmark(input: Omit<LessonBookmark, "createdAt"> & { on: boolean; now: Date }): Promise<void>;
  /** Newest first. */
  listLessonBookmarks(input: { appId: string; userId: number; courseId?: number }): Promise<LessonBookmark[]>;
  /** Paid orders sold through Yallapp's account (with a commission), newest first, every shop. */
  listMarketplaceOrders(limit: number): Promise<CatalogOrder[]>;
  createPlanPayment(payment: PlanPayment): Promise<void>;
  getPlanPaymentByToken(tokenHash: string): Promise<PlanPayment | null>;
  /** Pending to paid, once: false when it was no longer pending. */
  payPlanPayment(id: string, paymentId: string, now: Date): Promise<boolean>;
  /** Pending to failed. */
  failPlanPayment(id: string): Promise<void>;
  /** Newest first; one client's, one app's, or everyone's. */
  listPlanPayments(input: {
    clientId?: string;
    appId?: string;
    /** 71 Only this one. */
    id?: string;
    /** 95.2 Only these: the invoices are the paid ones. */
    status?: PlanPaymentStatus;
    limit: number;
  }): Promise<PlanPayment[]>;
  listPlatformSettings(): Promise<PlatformSetting[]>;
  /** Saves a setting, or removes it (back to the Netlify variables) when `value` is null. */
  setPlatformSetting<K extends PlatformSettingKey>(key: K, value: PlatformSettingValues[K] | null, updatedBy: string, now: Date): Promise<void>;

  // Catalog (apps without a website)
  listCatalogCategories(appId: string): Promise<CatalogCategory[]>;
  /** 110.2 `sample`: a category made with the sample products. */
  createCatalogCategory(input: { appId: string; name: string; now: Date; sample?: boolean }): Promise<CatalogCategory>;
  renameCatalogCategory(appId: string, id: number, name: string): Promise<void>;
  /** Also removes the category from its products. */
  deleteCatalogCategory(appId: string, id: number, now: Date): Promise<void>;
  /** Every product of the app, newest first. */
  listCatalogProducts(appId: string): Promise<CatalogProduct[]>;
  getCatalogProduct(appId: string, id: number): Promise<CatalogProduct | null>;
  createCatalogProduct(input: CatalogProductInput, now: Date): Promise<CatalogProduct>;
  updateCatalogProduct(appId: string, id: number, input: Partial<CatalogProductInput>, now: Date): Promise<void>;
  deleteCatalogProduct(appId: string, id: number): Promise<void>;
  // 91.1 Coupons of shops without a website.
  listCatalogCoupons(appId: string): Promise<CatalogCoupon[]>;
  getCatalogCouponByCode(appId: string, code: string): Promise<CatalogCoupon | null>;
  /** Null when the shop already has a coupon with this code. */
  createCatalogCoupon(input: Omit<CatalogCoupon, "id" | "usedCount">): Promise<CatalogCoupon | null>;
  setCatalogCouponActive(appId: string, id: number, active: boolean): Promise<void>;
  deleteCatalogCoupon(appId: string, id: number): Promise<void>;
  /** Counts one use of a paid order; false when it was used up. */
  useCatalogCoupon(appId: string, id: number): Promise<boolean>;
  createCatalogOrder(input: Omit<CatalogOrder, "id">): Promise<CatalogOrder>;
  getCatalogOrder(appId: string, id: number): Promise<CatalogOrder | null>;
  getCatalogOrderByToken(tokenHash: string): Promise<CatalogOrder | null>;
  updateCatalogOrder(appId: string, id: number, patch: CatalogOrderPatch): Promise<void>;
  /**
   * Marks a pending order paid ("processing") and takes its quantities from
   * stock, once: false when the order wasn't pending.
   */
  payCatalogOrder(appId: string, id: number, paymentId: string, now: Date): Promise<boolean>;
  /**
   * Newest first; `statuses` limits the list (the app shows paid orders only).
   * 96.2 `manualOnly`: only those to pay by bank transfer or the owner's own
   * method; `awaitingManual`: those still waiting for it too, besides `statuses`.
   */
  listCatalogOrders(input: {
    appId: string;
    userId?: number;
    statuses?: CatalogOrderStatus[];
    manualOnly?: boolean;
    awaitingManual?: boolean;
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
  /** 110.2 Deletes a listing with its favorites and conversations (sample listings; the office archives its own). */
  deleteListing(appId: string, id: number): Promise<void>;
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

  // 104 Delivery and courier companies
  /** How the company prices and works; null until saved (the defaults apply). */
  getDeliverySettings(appId: string): Promise<DeliverySettings | null>;
  saveDeliverySettings(appId: string, settings: DeliverySettings, now: Date): Promise<void>;
  /** In the company's order (position, then oldest). */
  listDeliveryServices(appId: string): Promise<DeliveryService[]>;
  getDeliveryService(appId: string, id: number): Promise<DeliveryService | null>;
  createDeliveryService(input: DeliveryServiceInput, now: Date): Promise<DeliveryService>;
  updateDeliveryService(appId: string, id: number, patch: Partial<DeliveryServiceInput>, now: Date): Promise<void>;
  /** Shipments keep its name. */
  deleteDeliveryService(appId: string, id: number): Promise<void>;
  /** By name. */
  listCouriers(appId: string): Promise<Courier[]>;
  getCourier(appId: string, id: number): Promise<Courier | null>;
  /** The courier with this number (E.164) or, given only an email, this email. */
  findCourier(appId: string, who: { phone: string | null; email: string | null }): Promise<Courier | null>;
  /** 104.8.2 Every company's couriers with this number or email (Yallapp Courier's companies). */
  listCouriersByContact(who: { phone: string | null; email: string | null }): Promise<Courier[]>;
  /** Fails (`duplicate`) when the app has a courier with the same number or email. */
  createCourier(input: CourierInput, now: Date): Promise<{ ok: true; courier: Courier } | { ok: false; reason: "duplicate" }>;
  updateCourier(appId: string, id: number, patch: CourierPatch, now: Date): Promise<{ ok: boolean; reason?: "duplicate" }>;
  /** Their shipments keep the name; jobs not yet delivered go back to waiting for a courier. */
  deleteCourier(appId: string, id: number, now: Date): Promise<void>;
  createShipment(input: ShipmentInput): Promise<Shipment>;
  getShipment(appId: string, id: number): Promise<Shipment | null>;
  listShipments(query: ShipmentQuery): Promise<{ items: Shipment[]; total: number }>;
  /**
   * Changes the shipment only while it is still as `expect` says (its status
   * one of `statuses`, its courier `courierId`), so two couriers taking the
   * same job, or two changes at once, change it once. False when it didn't.
   */
  updateShipment(appId: string, id: number, patch: ShipmentPatch, expect?: { statuses?: ShipmentStatus[]; courierId?: number | null }): Promise<boolean>;

  // 105.3 Academies with many teachers
  /** Featured first, then by name; only those with one of `statuses` when given. */
  listTeachers(appId: string, filter?: { statuses?: TeacherStatus[] }): Promise<Teacher[]>;
  getTeacher(appId: string, id: number): Promise<Teacher | null>;
  /** The teacher with this number (E.164) or, given only an email, this email. */
  findTeacher(appId: string, who: { phone: string | null; email: string | null }): Promise<Teacher | null>;
  /** The teacher whose app user this is (who applied, or used the Teacher screens). */
  findTeacherByUser(appId: string, userId: number): Promise<Teacher | null>;
  /** Fails (`duplicate`) when the app has a teacher with the same number or email. */
  createTeacher(input: TeacherInput, now: Date): Promise<{ ok: true; teacher: Teacher } | { ok: false; reason: "duplicate" }>;
  updateTeacher(appId: string, id: number, patch: TeacherPatch, now: Date): Promise<{ ok: boolean; reason?: "duplicate" }>;
  /** Their follows and reviews go with them; their courses become the academy's. */
  deleteTeacher(appId: string, id: number): Promise<void>;
  setTeacherFollow(input: { appId: string; teacherId: number; userId: number; follow: boolean; now: Date }): Promise<void>;
  isFollowingTeacher(appId: string, teacherId: number, userId: number): Promise<boolean>;
  listTeacherFollowerIds(appId: string, teacherId: number): Promise<number[]>;
  countTeacherFollowers(appId: string): Promise<{ teacherId: number; count: number }[]>;
  /** One per student and teacher: saving again changes it. */
  saveTeacherReview(input: { appId: string; teacherId: number; userId: number; rating: number; text: string; now: Date }): Promise<TeacherReview>;
  getTeacherReview(appId: string, id: number): Promise<TeacherReview | null>;
  getTeacherReviewOf(appId: string, teacherId: number, userId: number): Promise<TeacherReview | null>;
  /** Newest first. */
  listTeacherReviews(input: { appId: string; teacherId?: number; hidden?: boolean; offset: number; limit: number }): Promise<{ items: TeacherReview[]; total: number }>;
  /** The reviews everyone sees, counted per teacher and stars. */
  countTeacherRatings(appId: string): Promise<{ teacherId: number; rating: number; count: number }[]>;
  updateTeacherReview(appId: string, id: number, patch: { hidden: boolean; updatedAt: Date }): Promise<void>;

  // 105.4 Schools
  getSchoolSettings(appId: string): Promise<SchoolSettings | null>;
  saveSchoolSettings(appId: string, settings: SchoolSettings, now: Date): Promise<void>;
  /** In the school's order. */
  listSchoolClasses(appId: string): Promise<SchoolClass[]>;
  /** A new class when `id` is null; false when the class isn't the app's. */
  saveSchoolClass(input: Pick<SchoolClass, "appId" | "name" | "grade" | "homeroomTeacherId"> & { id: number | null }, now: Date): Promise<SchoolClass | null>;
  /** Its students stay, without a class; its timetable, homework and assessments go. */
  deleteSchoolClass(appId: string, id: number): Promise<void>;
  /** By name. */
  listSchoolSubjects(appId: string): Promise<SchoolSubject[]>;
  /** Fails (`duplicate`) when the school has a subject with this name. */
  saveSchoolSubject(input: { appId: string; id: number | null; name: string }, now: Date): Promise<{ ok: true; subject: SchoolSubject } | { ok: false; reason: "duplicate" | "not_found" }>;
  deleteSchoolSubject(appId: string, id: number): Promise<void>;
  /** By name; only those of `role`, of `classId`, or with one of `ids` when given. */
  listSchoolPeople(appId: string, filter?: { role?: SchoolRole; classId?: number; ids?: number[] }): Promise<SchoolPerson[]>;
  getSchoolPerson(appId: string, id: number): Promise<SchoolPerson | null>;
  /** Everyone at the school with this number (E.164) or, given only an email, this email: one per role. */
  findSchoolPeople(appId: string, who: { phone: string | null; email: string | null }): Promise<SchoolPerson[]>;
  /** Fails (`duplicate`) when the school has someone of the same role with the same number or email. */
  createSchoolPerson(input: SchoolPersonInput, now: Date): Promise<{ ok: true; person: SchoolPerson } | { ok: false; reason: "duplicate" }>;
  updateSchoolPerson(appId: string, id: number, patch: SchoolPersonPatch, now: Date): Promise<{ ok: boolean; reason?: "duplicate" }>;
  /** Their family links, marks, submissions, scores and fees go with them. */
  deleteSchoolPerson(appId: string, id: number): Promise<void>;
  /** A parent's children, or a student's parents. */
  listSchoolFamily(appId: string, filter: { parentId?: number; studentId?: number }): Promise<SchoolFamilyLink[]>;
  /** The parent's children become exactly these. */
  setSchoolChildren(appId: string, parentId: number, studentIds: number[]): Promise<void>;
  /** By day and start; only a class's or a teacher's when given. */
  listSchoolPeriods(appId: string, filter?: { classId?: number; teacherId?: number }): Promise<SchoolPeriod[]>;
  /** A new lesson when `id` is null; null when it isn't the app's. */
  saveSchoolPeriod(input: Omit<SchoolPeriod, "id"> & { id: number | null }): Promise<SchoolPeriod | null>;
  deleteSchoolPeriod(appId: string, id: number): Promise<void>;
  /** Newest day first; by class and day, or by student over days. */
  listSchoolAttendance(appId: string, filter: { classId?: number; studentId?: number; from?: string; to?: string }): Promise<SchoolAttendance[]>;
  /** Marks a day, one row per student and day (a new mark replaces the old). */
  saveSchoolAttendance(rows: SchoolAttendance[]): Promise<void>;
  /** Newest first; a class's, a teacher's, or some ids'. */
  listSchoolHomework(appId: string, filter?: { classId?: number; classIds?: number[]; teacherId?: number }): Promise<SchoolHomework[]>;
  getSchoolHomework(appId: string, id: number): Promise<SchoolHomework | null>;
  createSchoolHomework(input: Omit<SchoolHomework, "id">): Promise<SchoolHomework>;
  deleteSchoolHomework(appId: string, id: number): Promise<void>;
  listSchoolSubmissions(appId: string, filter: { homeworkId?: number; studentId?: number; homeworkIds?: number[] }): Promise<SchoolSubmission[]>;
  /** One per student and homework: saving again replaces it. */
  saveSchoolSubmission(submission: SchoolSubmission): Promise<void>;
  /** By date, newest first; a class's, some classes', or a teacher's. */
  listSchoolAssessments(appId: string, filter?: { classId?: number; classIds?: number[]; teacherId?: number }): Promise<SchoolAssessment[]>;
  getSchoolAssessment(appId: string, id: number): Promise<SchoolAssessment | null>;
  createSchoolAssessment(input: Omit<SchoolAssessment, "id">): Promise<SchoolAssessment>;
  deleteSchoolAssessment(appId: string, id: number): Promise<void>;
  listSchoolScores(appId: string, filter: { assessmentId?: number; studentId?: number }): Promise<SchoolScore[]>;
  /** Saves these scores; a null score removes the student's. */
  saveSchoolScores(appId: string, assessmentId: number, rows: { studentId: number; score: number | null; note: string | null }[], now: Date): Promise<void>;
  /** Newest first. */
  listSchoolAnnouncements(appId: string, filter?: { offset?: number; limit?: number }): Promise<SchoolAnnouncement[]>;
  createSchoolAnnouncement(input: Omit<SchoolAnnouncement, "id">): Promise<SchoolAnnouncement>;
  deleteSchoolAnnouncement(appId: string, id: number): Promise<void>;
  /** Newest first; a student's when given. */
  listSchoolFees(appId: string, filter?: { studentId?: number; status?: SchoolFee["status"] }): Promise<SchoolFee[]>;
  getSchoolFee(appId: string, id: number): Promise<SchoolFee | null>;
  getSchoolFeeByReceipt(code: string): Promise<SchoolFee | null>;
  createSchoolFee(input: Omit<SchoolFee, "id">): Promise<SchoolFee>;
  /** Only while the fee is in one of `statuses` when given; false when it wasn't changed. */
  updateSchoolFee(appId: string, id: number, patch: Partial<Pick<SchoolFee, "title" | "amountCents" | "dueOn" | "status" | "paidAt" | "paidBy" | "orderId" | "receiptCode" | "updatedAt">>, expect?: { statuses?: SchoolFee["status"][] }): Promise<boolean>;
  deleteSchoolFee(appId: string, id: number): Promise<void>;
  // 113.2 Checking in and out
  /** By day (newest first) and person; one person's or some people's, one day's or a period's. */
  listSchoolCheckins(appId: string, filter: { personId?: number; personIds?: number[]; date?: string; from?: string; to?: string }): Promise<SchoolCheckin[]>;
  getSchoolCheckin(appId: string, personId: number, date: string): Promise<SchoolCheckin | null>;
  /** One per person and day: saving again replaces it. */
  saveSchoolCheckin(row: SchoolCheckin): Promise<void>;
  // 113.3 Leave requests
  /** Newest first; a person's, of a status, or overlapping a period. */
  listSchoolLeave(appId: string, filter?: { personId?: number; statuses?: SchoolLeave["status"][]; from?: string; to?: string }): Promise<SchoolLeave[]>;
  getSchoolLeave(appId: string, id: number): Promise<SchoolLeave | null>;
  createSchoolLeave(input: Omit<SchoolLeave, "id">): Promise<SchoolLeave>;
  /** Only while the request is in one of `statuses`; false when it wasn't changed. */
  updateSchoolLeave(appId: string, id: number, patch: Partial<Pick<SchoolLeave, "status" | "answer" | "answeredBy" | "answeredAt" | "updatedAt">>, statuses: SchoolLeave["status"][]): Promise<boolean>;

  // 113.4 The parent's area: permission slips, absence excuses and pick-up
  /** By due date, the latest first; due on or after `from` when given. */
  listSchoolSlips(appId: string, filter?: { from?: string; to?: string }): Promise<SchoolSlip[]>;
  getSchoolSlip(appId: string, id: number): Promise<SchoolSlip | null>;
  /** A new slip when `id` is null; a new due date sends its reminder again. Null when it isn't the school's. */
  saveSchoolSlip(input: SchoolSlipInput & { id: number | null }, now: Date): Promise<SchoolSlip | null>;
  /** Its answers go with it. */
  deleteSchoolSlip(appId: string, id: number): Promise<void>;
  /** Marks the reminder sent; false when it already was (another run took it). */
  markSchoolSlipReminded(appId: string, id: number, now: Date): Promise<boolean>;
  /** A slip's answers, or some students' on any slip. */
  listSchoolSlipAnswers(appId: string, filter: { slipId?: number; slipIds?: number[]; studentIds?: number[] }): Promise<SchoolSlipAnswer[]>;
  /** One per slip and student: answering again replaces it. */
  saveSchoolSlipAnswer(row: SchoolSlipAnswer): Promise<void>;
  /** Newest first; a student's, some students', of a status, or overlapping a period. */
  listSchoolExcuses(appId: string, filter?: { studentId?: number; studentIds?: number[]; statuses?: SchoolExcuse["status"][]; from?: string; to?: string }): Promise<SchoolExcuse[]>;
  getSchoolExcuse(appId: string, id: number): Promise<SchoolExcuse | null>;
  createSchoolExcuse(input: Omit<SchoolExcuse, "id">): Promise<SchoolExcuse>;
  /** Only while the excuse is in one of `statuses`; false when it wasn't changed. */
  updateSchoolExcuse(appId: string, id: number, patch: Partial<Pick<SchoolExcuse, "status" | "answer" | "answeredBy" | "answeredAt" | "updatedAt">>, statuses: SchoolExcuse["status"][]): Promise<boolean>;
  getSchoolPickup(appId: string, studentId: number): Promise<SchoolPickup | null>;
  /** One per student: saving again replaces it. */
  saveSchoolPickup(row: SchoolPickup): Promise<void>;
  /** By day, then student; a student's, a day's, or from a day on. */
  listSchoolPickupNotes(appId: string, filter: { studentId?: number; date?: string; from?: string }): Promise<SchoolPickupNote[]>;
  /** One per student and day: saving again replaces it. */
  saveSchoolPickupNote(row: SchoolPickupNote): Promise<void>;
  deleteSchoolPickupNote(appId: string, studentId: number, date: string): Promise<void>;

  // 113.5 The syllabus, each class's progress, and the teachers' reports
  /** In the plan's order; a subject's, a grade's when given. */
  listSchoolSyllabusUnits(appId: string, filter?: { subjectId?: number; grade?: string }): Promise<SchoolSyllabusUnit[]>;
  /** A new unit (last) when `id` is null; null when it isn't the app's. */
  saveSchoolSyllabusUnit(input: Pick<SchoolSyllabusUnit, "appId" | "subjectId" | "grade" | "title"> & { id: number | null; position?: number }, now: Date): Promise<SchoolSyllabusUnit | null>;
  /** Its topics and their progress go with it. */
  deleteSchoolSyllabusUnit(appId: string, id: number): Promise<void>;
  /** In each unit's order; only those of `unitIds` when given. */
  listSchoolSyllabusTopics(appId: string, filter?: { unitIds?: number[]; ids?: number[] }): Promise<SchoolSyllabusTopic[]>;
  /** A new topic (last in its unit) when `id` is null; null when it, or its unit, isn't the app's. */
  saveSchoolSyllabusTopic(input: Pick<SchoolSyllabusTopic, "appId" | "unitId" | "title" | "startsOn" | "endsOn"> & { id: number | null; position?: number }, now: Date): Promise<SchoolSyllabusTopic | null>;
  deleteSchoolSyllabusTopic(appId: string, id: number): Promise<void>;
  /** A class's covered topics, or some topics' in every class. */
  listSchoolTopicProgress(appId: string, filter?: { classId?: number; topicIds?: number[] }): Promise<SchoolTopicProgress[]>;
  /** One per class and topic: saving again replaces it. */
  saveSchoolTopicProgress(row: SchoolTopicProgress): Promise<void>;
  deleteSchoolTopicProgress(appId: string, classId: number, topicId: number): Promise<void>;
  /** By kind, then name. */
  listSchoolReportTemplates(appId: string): Promise<SchoolReportTemplate[]>;
  getSchoolReportTemplate(appId: string, id: number): Promise<SchoolReportTemplate | null>;
  /** A new template when `id` is null; null when it isn't the app's. */
  saveSchoolReportTemplate(input: Pick<SchoolReportTemplate, "appId" | "kind" | "name" | "fields"> & { id: number | null }, now: Date): Promise<SchoolReportTemplate | null>;
  /** Reports written on it keep its name and fields. */
  deleteSchoolReportTemplate(appId: string, id: number): Promise<void>;
  /** Newest change first; a teacher's, a student's, a class's, or in some statuses. */
  listSchoolReports(appId: string, filter?: { teacherId?: number; studentId?: number; classId?: number; statuses?: SchoolReportStatus[] }): Promise<SchoolReport[]>;
  getSchoolReport(appId: string, id: number): Promise<SchoolReport | null>;
  createSchoolReport(input: Omit<SchoolReport, "id">): Promise<SchoolReport>;
  /** Only while the report is in one of `statuses` when given; false when it wasn't changed. */
  updateSchoolReport(
    appId: string,
    id: number,
    patch: Partial<Pick<SchoolReport, "answers" | "subjectId" | "periodFrom" | "periodTo" | "status" | "comments" | "sentAt" | "readAt" | "reviewedAt" | "sharedAt" | "updatedAt">>,
    expect?: { statuses?: SchoolReportStatus[] },
  ): Promise<boolean>;
  deleteSchoolReport(appId: string, id: number): Promise<void>;

  // 113.10 The school bus
  /** In the school's order. */
  listSchoolBusRoutes(appId: string): Promise<SchoolBusRoute[]>;
  getSchoolBusRoute(appId: string, id: number): Promise<SchoolBusRoute | null>;
  /** A new route (last in the order) or a change to one; null when it isn't the school's. */
  saveSchoolBusRoute(input: Pick<SchoolBusRoute, "appId" | "name" | "plate" | "capacity" | "driverId" | "supervisorId" | "active"> & { id: number | null }, now: Date): Promise<SchoolBusRoute | null>;
  /** Its stops, riders, trips and marks go with it. */
  deleteSchoolBusRoute(appId: string, id: number): Promise<void>;
  /** In the route's order. */
  listSchoolBusStops(appId: string, filter?: { routeId?: number }): Promise<SchoolBusStop[]>;
  /** A new stop (last on its route) or a change to one; null when it isn't the school's. */
  saveSchoolBusStop(input: Omit<SchoolBusStop, "id" | "position"> & { id: number | null }): Promise<SchoolBusStop | null>;
  /** Its riders go with it. */
  deleteSchoolBusStop(appId: string, id: number): Promise<void>;
  /** The route's stops in this order (stops left out keep their place after them). */
  orderSchoolBusStops(appId: string, routeId: number, stopIds: number[]): Promise<void>;
  listSchoolBusRiders(appId: string, filter?: { routeId?: number; stopId?: number; studentId?: number; trip?: SchoolBusTrip }): Promise<SchoolBusRider[]>;
  /** Each student's stop for the trip; a null stop takes them off it. */
  setSchoolBusRiders(appId: string, rows: { studentId: number; trip: SchoolBusTrip; stop: Pick<SchoolBusStop, "id" | "routeId"> | null }[]): Promise<void>;
  /** Newest first. */
  listSchoolBusRuns(appId: string, filter?: { routeId?: number; routeIds?: number[]; status?: SchoolBusRunStatus; date?: string; limit?: number }): Promise<SchoolBusRun[]>;
  getSchoolBusRun(appId: string, id: number): Promise<SchoolBusRun | null>;
  /** The route's trip of the day: a new one, else the one there already (`created` false). */
  startSchoolBusRun(input: Omit<SchoolBusRun, "id">): Promise<{ run: SchoolBusRun; created: boolean }>;
  /** Only while it is in `status` when given; false when it wasn't changed. */
  updateSchoolBusRun(appId: string, id: number, patch: Partial<Pick<SchoolBusRun, "status" | "endedAt" | "startedAt" | "startedBy" | "lat" | "lng" | "locatedAt" | "passedStopIds" | "toldStopIds">>, expect?: { status?: SchoolBusRunStatus }): Promise<boolean>;
  listSchoolBusMarks(appId: string, filter: { runId?: number; runIds?: number[]; studentId?: number }): Promise<SchoolBusMark[]>;
  /** One per trip and student. */
  saveSchoolBusMark(mark: SchoolBusMark): Promise<void>;

  // 113.11 The library
  /** By title; `q` matches the title, the author or the ISBN. */
  listSchoolBooks(appId: string, filter?: { q?: string; category?: string; ids?: number[]; limit?: number }): Promise<SchoolBook[]>;
  getSchoolBook(appId: string, id: number): Promise<SchoolBook | null>;
  createSchoolBook(input: Omit<SchoolBook, "id">): Promise<SchoolBook>;
  updateSchoolBook(appId: string, id: number, patch: Partial<Omit<SchoolBook, "id" | "appId" | "createdAt">>): Promise<boolean>;
  /** Its copies, loans and holds go with it. */
  deleteSchoolBook(appId: string, id: number): Promise<void>;
  listSchoolBookCopies(appId: string, filter?: { bookId?: number; bookIds?: number[] }): Promise<SchoolBookCopy[]>;
  /** Codes are matched without case. */
  getSchoolBookCopyByCode(appId: string, code: string): Promise<SchoolBookCopy | null>;
  createSchoolBookCopy(input: Omit<SchoolBookCopy, "id">): Promise<{ ok: true; copy: SchoolBookCopy } | { ok: false; reason: "duplicate" }>;
  /** Its loans go with it. */
  deleteSchoolBookCopy(appId: string, id: number): Promise<void>;
  /** Newest first; `open`: not returned yet (true) or returned (false). */
  listSchoolBookLoans(appId: string, filter?: { bookId?: number; copyId?: number; personId?: number; personIds?: number[]; open?: boolean; limit?: number }): Promise<SchoolBookLoan[]>;
  /** False when the copy is out on another loan. */
  createSchoolBookLoan(input: Omit<SchoolBookLoan, "id">): Promise<{ ok: true; loan: SchoolBookLoan } | { ok: false; reason: "on_loan" }>;
  /** Only while it is open when `open` is given; false when it wasn't changed. */
  updateSchoolBookLoan(appId: string, id: number, patch: Partial<Pick<SchoolBookLoan, "dueOn" | "returnedAt" | "dueToldOn" | "overdueToldOn">>, expect?: { open?: boolean }): Promise<boolean>;
  /** Every school's loans not returned that are due by `dueBy` (YYYY-MM-DD), for the reminders; oldest due first. */
  listDueSchoolBookLoans(dueBy: string, limit: number): Promise<SchoolBookLoan[]>;
  /** Oldest first. */
  listSchoolBookHolds(appId: string, filter?: { bookId?: number; personId?: number; personIds?: number[]; statuses?: SchoolBookHoldStatus[] }): Promise<SchoolBookHold[]>;
  createSchoolBookHold(input: Omit<SchoolBookHold, "id">): Promise<SchoolBookHold>;
  /** Only while it is in one of `statuses` when given; false when it wasn't changed. */
  updateSchoolBookHold(appId: string, id: number, patch: Partial<Pick<SchoolBookHold, "status" | "copyId" | "readyAt" | "expiresAt" | "updatedAt">>, expect?: { statuses?: SchoolBookHoldStatus[] }): Promise<boolean>;
  // 113.12 Salaries, recorded by hand
  listSchoolSalaries(appId: string): Promise<SchoolSalary[]>;
  getSchoolSalary(appId: string, personId: number): Promise<SchoolSalary | null>;
  /** Only for a teacher or staff member of the same school; false otherwise. */
  saveSchoolSalary(salary: SchoolSalary): Promise<boolean>;
  deleteSchoolSalary(appId: string, personId: number): Promise<void>;
  /** By month (newest first), then name. */
  listSchoolPayslips(appId: string, filter?: { month?: string; personId?: number; personIds?: number[]; statuses?: SchoolPayslipStatus[] }): Promise<SchoolPayslip[]>;
  getSchoolPayslip(appId: string, id: number): Promise<SchoolPayslip | null>;
  /** One per person and month. */
  createSchoolPayslip(input: Omit<SchoolPayslip, "id">): Promise<{ ok: true; payslip: SchoolPayslip } | { ok: false; reason: "duplicate" }>;
  /** Only while its status is one of `expect.statuses` and, when given, it was last changed at `expect.updatedAt`; false when it wasn't changed. */
  updateSchoolPayslip(
    appId: string,
    id: number,
    patch: Partial<Omit<SchoolPayslip, "id" | "appId" | "personId" | "month" | "createdAt">>,
    expect: { statuses: SchoolPayslipStatus[]; updatedAt?: Date },
  ): Promise<boolean>;
  /** Only a draft. */
  deleteSchoolPayslip(appId: string, id: number): Promise<boolean>;
  getSchoolSalaryMonth(appId: string, month: string): Promise<SchoolSalaryMonth | null>;
  saveSchoolSalaryMonth(row: SchoolSalaryMonth): Promise<void>;
  /** Newest first. */
  listSchoolSalaryAdvances(appId: string, filter?: { personId?: number; personIds?: number[] }): Promise<SchoolSalaryAdvance[]>;
  getSchoolSalaryAdvance(appId: string, id: number): Promise<SchoolSalaryAdvance | null>;
  createSchoolSalaryAdvance(input: Omit<SchoolSalaryAdvance, "id">): Promise<SchoolSalaryAdvance>;
  /** Only when it was last changed at `expectUpdatedAt`; false when it wasn't changed. */
  updateSchoolSalaryAdvance(appId: string, id: number, patch: Partial<Pick<SchoolSalaryAdvance, "instalmentCents" | "startsMonth" | "repayments" | "updatedAt">>, expectUpdatedAt: Date): Promise<boolean>;
  deleteSchoolSalaryAdvance(appId: string, id: number): Promise<void>;
  // 113.8 The school's calendar, the exams' timetable and behaviour
  /** Events on any day from `from` to `to` (both YYYY-MM-DD), first first. */
  listSchoolEvents(appId: string, filter?: { from?: string; to?: string }): Promise<SchoolEvent[]>;
  getSchoolEvent(appId: string, id: number): Promise<SchoolEvent | null>;
  /** Null when `id` isn't the school's. */
  saveSchoolEvent(input: SchoolEventInput & { id: number | null }, now: Date): Promise<SchoolEvent | null>;
  deleteSchoolEvent(appId: string, id: number): Promise<void>;
  /** By date and time. */
  listSchoolExams(appId: string, filter?: { from?: string; to?: string; published?: boolean }): Promise<SchoolExam[]>;
  getSchoolExam(appId: string, id: number): Promise<SchoolExam | null>;
  /** A new exam is a draft; a saved one keeps whether it is published. Null when `id` isn't the school's. */
  saveSchoolExam(input: SchoolExamInput & { id: number | null }, now: Date): Promise<SchoolExam | null>;
  /** Publishes the drafts among `ids`; returns those it published. */
  publishSchoolExams(appId: string, ids: number[], now: Date): Promise<SchoolExam[]>;
  /** Marks the day-before reminder sent; false when it already was (another run took it). */
  markSchoolExamReminded(appId: string, id: number, now: Date): Promise<boolean>;
  deleteSchoolExam(appId: string, id: number): Promise<void>;
  /** In the school's order. */
  listSchoolBehaviourCategories(appId: string): Promise<SchoolBehaviourCategory[]>;
  /** Null when `id` isn't the school's. */
  saveSchoolBehaviourCategory(input: Pick<SchoolBehaviourCategory, "appId" | "name" | "kind" | "points" | "active"> & { id: number | null }, now: Date): Promise<SchoolBehaviourCategory | null>;
  deleteSchoolBehaviourCategory(appId: string, id: number): Promise<void>;
  /** Newest first; written from `since` and before `until`. */
  listSchoolBehaviour(appId: string, filter?: { studentId?: number; studentIds?: number[]; classId?: number; since?: Date; until?: Date }): Promise<SchoolBehaviourNote[]>;
  getSchoolBehaviour(appId: string, id: number): Promise<SchoolBehaviourNote | null>;
  createSchoolBehaviour(input: Omit<SchoolBehaviourNote, "id">): Promise<SchoolBehaviourNote>;
  deleteSchoolBehaviour(appId: string, id: number): Promise<void>;

  // 105.1 Food delivery from many restaurants
  /** In the company's order; `q` matches the restaurant's name or a dish's. Menus aren't read. */
  listRestaurants(appId: string, filter?: { q?: string }): Promise<Restaurant[]>;
  getRestaurant(appId: string, id: number): Promise<Restaurant | null>;
  getRestaurantMenu(appId: string, id: number): Promise<RestaurantMenu | null>;
  createRestaurant(input: RestaurantInput, menu: RestaurantMenu, now: Date): Promise<Restaurant>;
  updateRestaurant(appId: string, id: number, patch: RestaurantPatch, now: Date): Promise<void>;
  /** Also keeps the dishes' names for search. */
  saveRestaurantMenu(appId: string, id: number, menu: RestaurantMenu, now: Date): Promise<void>;
  /** Its staff go with it; its orders keep its name. */
  deleteRestaurant(appId: string, id: number): Promise<void>;
  /** Adds one rating (1 to 5) to its average, at once. */
  addRestaurantRating(appId: string, id: number, stars: number): Promise<void>;
  /** By name; one restaurant's when `restaurantId` is given. */
  listRestaurantStaff(appId: string, restaurantId?: number): Promise<RestaurantStaff[]>;
  /** The staff member with this number (E.164) or, given only an email, this email. */
  findRestaurantStaff(appId: string, who: { phone: string | null; email: string | null }): Promise<RestaurantStaff | null>;
  /** Fails (`duplicate`) when the app has staff with the same number or email. */
  createRestaurantStaff(input: RestaurantStaffInput, now: Date): Promise<{ ok: true; staff: RestaurantStaff } | { ok: false; reason: "duplicate" }>;
  updateRestaurantStaff(appId: string, id: number, patch: Partial<Pick<RestaurantStaff, "name" | "phone" | "email" | "active">>, now: Date): Promise<{ ok: boolean; reason?: "duplicate" }>;
  deleteRestaurantStaff(appId: string, id: number): Promise<void>;
  // 115.3 The marketplace's catalogs: a grocery's or shop's departments, aisles and products (restaurants keep 105.1's menus).
  listMarketDepartments(appId: string, vendorId: number): Promise<MarketDepartment[]>;
  /** Makes (`id` null) or renames and moves one; null when the vendor isn't the app's or the department isn't the vendor's. */
  saveMarketDepartment(input: Omit<MarketDepartment, "id"> & { id: number | null }): Promise<MarketDepartment | null>;
  /** Its aisles go with it; its products stay, out of any department. */
  deleteMarketDepartment(appId: string, vendorId: number, id: number): Promise<void>;
  listMarketAisles(appId: string, vendorId: number, departmentId?: number): Promise<MarketAisle[]>;
  /** Null when the department (or the aisle) isn't the vendor's. */
  saveMarketAisle(input: Omit<MarketAisle, "id"> & { id: number | null }): Promise<MarketAisle | null>;
  /** Its products stay in its department, out of any aisle. */
  deleteMarketAisle(appId: string, vendorId: number, id: number): Promise<void>;
  /** In stock first, then the vendor's order; `q` searches names, brands and descriptions, `code` a barcode or SKU. */
  listMarketProducts(query: MarketProductQuery): Promise<{ items: MarketProduct[]; total: number }>;
  getMarketProduct(appId: string, id: number): Promise<MarketProduct | null>;
  createMarketProduct(input: MarketProductInput, now: Date): Promise<{ ok: true; product: MarketProduct } | { ok: false; reason: "duplicate_sku" }>;
  updateMarketProduct(appId: string, id: number, patch: Partial<Omit<MarketProductInput, "appId" | "vendorId">>, now: Date): Promise<{ ok: boolean; reason?: "duplicate_sku" }>;
  deleteMarketProduct(appId: string, id: number): Promise<void>;
  /** An import's rows: each updates the vendor's product with its SKU (else its barcode), or is added. */
  upsertMarketProducts(appId: string, vendorId: number, rows: Omit<MarketProductInput, "appId" | "vendorId">[], now: Date): Promise<{ created: number; updated: number }>;
  // 115.3 The marketplace's orders, complaints and wallet.
  createMarketOrder(input: MarketOrderInput): Promise<MarketOrder>;
  getMarketOrder(appId: string, id: number): Promise<MarketOrder | null>;
  listMarketOrders(query: MarketOrderQuery): Promise<{ items: MarketOrder[]; total: number }>;
  /** False when it isn't the app's, or (with `expect`) its status changed meanwhile. */
  updateMarketOrder(appId: string, id: number, patch: MarketOrderPatch, expect?: { statuses?: MarketOrderStatus[] }): Promise<boolean>;
  createMarketComplaint(input: MarketComplaintInput): Promise<MarketComplaint>;
  getMarketComplaint(appId: string, id: number): Promise<MarketComplaint | null>;
  listMarketComplaints(query: MarketComplaintQuery): Promise<{ items: MarketComplaint[]; total: number }>;
  updateMarketComplaint(appId: string, id: number, patch: MarketComplaintPatch): Promise<boolean>;
  /** Adds an entry once per `key` (null when that key is already there); a negative one only when the balance covers it ("insufficient"). */
  addWalletEntry(entry: Omit<WalletEntry, "id">): Promise<{ ok: true; entry: WalletEntry } | { ok: false; reason: "duplicate" | "insufficient" }>;
  walletBalance(appId: string, userId: number): Promise<number>;
  listWalletEntries(appId: string, userId: number, page: { limit: number; offset: number }): Promise<{ items: WalletEntry[]; total: number }>;
  createFoodOrder(input: FoodOrderInput): Promise<FoodOrder>;
  getFoodOrder(appId: string, id: number): Promise<FoodOrder | null>;
  listFoodOrders(query: FoodOrderQuery): Promise<{ items: FoodOrder[]; total: number }>;
  /** Changes the order only while its status is one of `expect.statuses`; false when it didn't (two changes at once change it once). */
  updateFoodOrder(appId: string, id: number, patch: FoodOrderPatch, expect?: { statuses?: FoodOrderStatus[] }): Promise<boolean>;
  /** Delivered orders created in `[since, until)`, per restaurant: for the restaurants' statements. */
  foodStatement(appId: string, since: Date, until: Date): Promise<FoodStatementRow[]>;

  // 105.2 Ride hailing
  /** In the company's order (position, then oldest). */
  listVehicleTypes(appId: string): Promise<VehicleType[]>;
  getVehicleType(appId: string, id: number): Promise<VehicleType | null>;
  createVehicleType(input: VehicleTypeInput, now: Date): Promise<VehicleType>;
  updateVehicleType(appId: string, id: number, patch: Partial<VehicleTypeInput>, now: Date): Promise<void>;
  /** Rides keep its name; drivers of it have none until the company gives them one. */
  deleteVehicleType(appId: string, id: number, now: Date): Promise<void>;
  createRide(input: RideInput): Promise<Ride>;
  getRide(appId: string, id: number): Promise<Ride | null>;
  /** The ride its share link names, in any app; null once it ended (the token is cleared). */
  findRideByShareToken(token: string): Promise<Ride | null>;
  listRides(query: RideQuery): Promise<{ items: Ride[]; total: number }>;
  /**
   * Changes the ride only while it is still as `expect` says (its status one
   * of `statuses`, offered to `offeredTo`, its driver `driverId`), so two
   * drivers, or a driver and the rider, change it once. False when it didn't.
   */
  updateRide(appId: string, id: number, patch: RidePatch, expect?: { statuses?: RideStatus[]; offeredTo?: number | null; driverId?: number | null }): Promise<boolean>;
  /** Rides time moves on, in every app: searching ones, and scheduled ones due by `dueBy`; the oldest first. */
  listDueRides(dueBy: Date, limit: number): Promise<Ride[]>;
  /** Adds one rating (1 to 5) to the driver's average. */
  addDriverRating(appId: string, courierId: number, stars: number, now: Date): Promise<void>;
  /** Completed rides created in `[since, until)`, per driver: for the drivers' statements. */
  rideStatement(appId: string, since: Date, until: Date): Promise<RideStatementRow[]>;

  // 10.4 Pages, looks and languages
  getAppLayout(appId: string): Promise<AppLayoutRecord | null>;
  /** Creates or replaces the app's layout. */
  saveAppLayout(layout: AppLayoutRecord): Promise<void>;
  /** 82.4 Keeps a publish, and only the app's last `keep`. */
  addLayoutVersion(version: AppLayoutVersion, keep: number): Promise<void>;
  /** 82.4 The app's kept publishes, newest first. */
  listLayoutVersions(appId: string): Promise<AppLayoutVersionSummary[]>;
  getLayoutVersion(appId: string, number: number): Promise<AppLayoutVersion | null>;
  /** 84.3 An account's saved sections, newest first. */
  listSavedSections(clientId: string): Promise<SavedSection[]>;
  createSavedSection(section: SavedSection): Promise<void>;
  /** False when the account has no such section. */
  deleteSavedSection(clientId: string, id: string): Promise<boolean>;
  /** 103R An account's own Studio templates, newest first. */
  listStudioTemplates(clientId: string): Promise<StudioTemplate[]>;
  createStudioTemplate(template: StudioTemplate): Promise<void>;
  /** False when the account has no such template. */
  deleteStudioTemplate(clientId: string, id: string): Promise<boolean>;
  /** 108.7 An account's own whole designs, newest first. */
  listStudioDesigns(clientId: string): Promise<StudioDesign[]>;
  createStudioDesign(design: StudioDesign): Promise<void>;
  /** The design, if it is this account's. */
  getStudioDesign(clientId: string, id: string): Promise<StudioDesign | null>;
  deleteStudioDesign(clientId: string, id: string): Promise<boolean>;
  /** 97.2 The app's own fonts, by name. */
  listOwnFonts(appId: string): Promise<OwnFont[]>;
  /** Adds the font, or replaces it (same id, or the app's font with the same name, which keeps its id). */
  saveOwnFont(font: OwnFont): Promise<void>;
  /** False when the app has no such font. */
  deleteOwnFont(appId: string, id: string): Promise<boolean>;
  /** 100.2 The app's store products (courses, then memberships, by title). */
  listStoreProducts(appId: string): Promise<StoreProduct[]>;
  getStoreProduct(appId: string, productId: string): Promise<StoreProduct | null>;
  /** Adds the product, or replaces the app's one with the same product ID (which keeps its id). */
  saveStoreProduct(product: StoreProduct): Promise<void>;
  /** 100.3 A store purchase by its store key (Google: the token's SHA-256; Apple: the original transaction ID). */
  getStorePurchase(appId: string, platform: StorePurchaseRecord["platform"], storeKey: string): Promise<StorePurchaseRecord | null>;
  /** Keeps a new purchase; when one with the same store key is there already (sent twice at once), returns that one instead. */
  createStorePurchase(purchase: StorePurchaseRecord): Promise<StorePurchaseRecord>;
  saveStorePurchase(purchase: StorePurchaseRecord): Promise<void>;
  /** An account's purchases in the app, newest first. */
  listAccountStorePurchases(appId: string, accountSource: StorePurchaseRecord["accountSource"], accountId: string): Promise<StorePurchaseRecord[]>;
  /** Purchases whose access wasn't given or taken on the source yet (changed before `before`), oldest first. */
  listUndeliveredStorePurchases(before: Date, limit: number): Promise<StorePurchaseRecord[]>;
  /** Active memberships whose paid period ends before `before`, soonest first. */
  listEndingStorePurchases(before: Date, limit: number): Promise<StorePurchaseRecord[]>;
  /** 100.6 Keeps a change of a store purchase. */
  addStorePurchaseEvent(event: StorePurchaseEvent): Promise<void>;
  /** 100.6 The app's store purchase changes in [from, to), store tests left out, oldest first. */
  listStorePurchaseEvents(appId: string, from: Date, to: Date): Promise<StorePurchaseEvent[]>;
  /** 100.7 What the owner listed as sold in the app (courses, then plans, by title). */
  listStoreBillingItems(appId: string): Promise<StoreBillingItem[]>;
  /** Adds the item, or replaces the app's one of the same kind and item ID (which keeps its id and creation time). */
  saveStoreBillingItem(item: StoreBillingItem): Promise<void>;
  createBillingSession(session: BillingSession): Promise<void>;
  getBillingSession(tokenHash: string): Promise<BillingSession | null>;

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
  /**
   * 80.3 Payments still pending (orders, plan payments, donations) that were
   * started between `startedAfter` and `startedBefore` and last asked about
   * `checkedBefore` or earlier (or never), with their provider's reference;
   * oldest first.
   */
  listPendingPayments(query: { startedAfter: Date; startedBefore: Date; checkedBefore: Date; limit: number }): Promise<PendingPayment[]>;
  /** 80.3 Notes that the provider was just asked about this pending payment. */
  markPaymentChecked(kind: PendingPayment["kind"], id: string | number, now: Date): Promise<void>;
  /** 80.2 Apps (not demos) whose connections the daily checks last looked at `before` or earlier, or never: never first, then oldest. */
  listAppsToCheck(before: Date, limit: number): Promise<App[]>;
  /** 100.2 Live apps (not demos) whose owner turned in-app purchases on, oldest first. */
  listStoreBillingApps(): Promise<App[]>;
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
  /**
   * 70 Saves the pending (or redeemed) use only while the coupon's limits
   * allow one more, counted under a lock on the coupon (of two at once, one
   * wins the last place); with `payment`, records that payment in the same
   * step. False, with nothing saved, when the coupon is used up.
   */
  claimCouponRedemption(redemption: CouponRedemption, limits: CouponClaimLimits, payment?: PlanPayment): Promise<boolean>;
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
  /** An app's notices, newest first; 100.7 only these events when given. */
  listApiWebhooks(appId: string, limit: number, events?: ApiWebhookEvent[]): Promise<ApiWebhook[]>;
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
  /** 83.2 The installs with an event from `fromDay` on, counted by the app version of each one's latest event. */
  countAnalyticsVersions(appId: string, fromDay: string): Promise<{ version: string; installs: number }[]>;
  /** Sets daily totals (each metric and key replaces what the day had). */
  saveAnalyticsDaily(appId: string, day: string, rows: AnalyticsDailyRow[]): Promise<void>;
  /** Adds to one daily total (search counts, pushes sent, late-event marks). */
  addAnalyticsDaily(appId: string, day: string, row: AnalyticsDailyRow): Promise<void>;
  listAnalyticsDaily(appId: string, fromDay: string, toDay: string, metrics?: AnalyticsMetric[]): Promise<AnalyticsDailyRecord[]>;
  /** The days from `fromDay` on with raw events of the app. */
  listAnalyticsEventDays(appId: string, fromDay: string): Promise<string[]>;
  /** Apps with raw events on `fromDay` or later. */
  listAnalyticsAppIds(fromDay: string): Promise<string[]>;
  /** Deletes raw events of days before `beforeDay` (72 at most `limit` of them, for batches); returns how many. */
  purgeAnalyticsEvents(beforeDay: string, limit?: number): Promise<number>;
  /** 72 Deletes one app's daily totals of days before `beforeDay`, at most `limit` rows; returns how many. */
  purgeAnalyticsDaily(appId: string, beforeDay: string, limit: number): Promise<number>;

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

  // 104.8.2 Yallapp Courier (lib/courier-hub): its accounts, devices and sign-in codes
  getCourierAccount(id: string): Promise<CourierAccount | null>;
  /** The account with this number (or, without one, this email). */
  findCourierAccount(who: { phone: string | null; email: string | null }): Promise<CourierAccount | null>;
  /** Makes the account, or returns the one made with the same number or email a moment before. */
  createCourierAccount(account: CourierAccount): Promise<CourierAccount>;
  updateCourierAccount(id: string, patch: Partial<Pick<CourierAccount, "lastSignInAt">>): Promise<void>;
  /** Deletes the account (its devices go with it; call deleteCourierDevice on each first so their company sessions end). */
  deleteCourierAccount(id: string): Promise<void>;
  createCourierDevice(device: CourierDevice): Promise<void>;
  getCourierDevice(id: string): Promise<CourierDevice | null>;
  /** The device whose current refresh token has this hash. */
  findCourierDeviceByRefresh(refreshHash: string): Promise<CourierDevice | null>;
  /** Replaces the refresh token only while it still has `oldHash` (atomic: of two renewals, one wins). */
  rotateCourierRefresh(id: string, oldHash: string, next: { refreshHash: string; refreshExpiresAt: Date; lastSeenAt: Date }): Promise<boolean>;
  updateCourierDevice(id: string, patch: CourierDevicePatch): Promise<void>;
  /** An account's devices, the one used last first. */
  listCourierDevices(accountId: string): Promise<CourierDevice[]>;
  /** Signs the device out, with every company session it opened (their hosted devices and refresh tokens). */
  deleteCourierDevice(id: string): Promise<void>;
  /** Forgets a push token on every device but `exceptId`. */
  clearCourierPushToken(token: string, exceptId: string | null): Promise<void>;
  /** The company sessions (hosted devices, of any app) the device opened. */
  listHostedDevicesOfCourierDevice(courierDeviceId: string): Promise<HostedDevice[]>;
  createCourierChallenge(challenge: CourierChallenge): Promise<void>;
  getCourierChallenge(tokenHash: string): Promise<CourierChallenge | null>;
  /** Counts a try and returns how many there were. */
  addCourierChallengeAttempt(tokenHash: string): Promise<number>;
  deleteCourierChallenge(tokenHash: string): Promise<void>;
  /** Deletes the codes that expired before `now`. */
  purgeCourierChallenges(now: Date): Promise<void>;

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
  /** 86.1 Refunds made in the window (orders and donations), how many and their sum per currency. */
  sumRefunds(appId: string, from: Date, to: Date): Promise<PaidTotals>;
  /** 86.1 Enrolments in courses managed in Yallapp in the window: all, and those paid for. */
  countEnrollmentsInWindow(appId: string, from: Date, to: Date): Promise<{ total: number; paid: number }>;
  /** 86.1 Appointments booked in the window (when they were made, whatever happened to them since). */
  countAppointmentsMade(appId: string, from: Date, to: Date): Promise<number>;

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

  // 85.3 Automatic notifications
  /** Takes one automatic notice for a person (its kind and what it's about); false when it was already sent. */
  claimAutoNotice(input: { appId: string; kind: string; ref: string; userId: number; now: Date }): Promise<boolean>;
  /** The app says how many items are in a person's cart (0: empty). */
  saveHostedCart(appId: string, userId: number, items: number, now: Date): Promise<void>;
  /** Carts with items that last changed in [after, before) and weren't reminded since, every app's, oldest first. */
  listLeftHostedCarts(after: Date, before: Date, limit: number): Promise<HostedCart[]>;
  /** Marks a cart reminded, unless it changed after `seenAt`; false then. */
  markHostedCartReminded(appId: string, userId: number, seenAt: Date, now: Date): Promise<boolean>;
  /** 91.2 Watches a person's orders on a connected platform until `until` (kept if already later). */
  watchHostedOrders(appId: string, userId: number, until: Date): Promise<void>;
  /** 91.2 Watches still running not looked at since `checkedBefore`, every app's, the longest waiting first. */
  listDueOrderWatches(checkedBefore: Date, now: Date, limit: number): Promise<HostedOrderWatch[]>;
  /** 91.2 What the orders looked like now. */
  saveOrderWatch(appId: string, userId: number, orders: Record<string, string>, checkedAt: Date): Promise<void>;
  /** 91.2 Removes the watches that ended; how many. */
  deleteEndedOrderWatches(now: Date): Promise<number>;

  // 91.4 Loyalty points
  /** A customer's points in the app (0 without any). */
  getLoyaltyBalance(appId: string, userId: number): Promise<number>;
  /**
   * Adds points (positive) or takes them (negative, never below 0) in one
   * step, and keeps the change in the customer's history. Returns the points
   * actually changed (what was taken can be less than asked); nothing is kept
   * for 0.
   */
  changeLoyaltyPoints(input: { appId: string; userId: number; orderId: number | null; points: number; reason: LoyaltyReason; now: Date }): Promise<number>;
  /** The latest changes to a customer's points, newest first. */
  listLoyaltyEntries(appId: string, userId: number, limit: number): Promise<LoyaltyEntry[]>;

  // 85.2 Notification campaigns
  createNotificationCampaign(input: Omit<NotificationCampaign, "id">): Promise<NotificationCampaign>;
  getNotificationCampaign(appId: string, id: number): Promise<NotificationCampaign | null>;
  /** The app's campaigns, newest first. */
  listNotificationCampaigns(appId: string, limit: number): Promise<NotificationCampaign[]>;
  /** Changes one while it has the status expected (any when null); false when it no longer has. */
  updateNotificationCampaign(appId: string, id: number, expect: NotificationCampaignStatus | null, patch: NotificationCampaignPatch): Promise<boolean>;
  deleteNotificationCampaign(appId: string, id: number): Promise<boolean>;
  /** Waiting ones whose time came, every app's, oldest first. */
  listDueNotificationCampaigns(now: Date, limit: number): Promise<NotificationCampaign[]>;
  /** Taken by a run before `before` and not finished. */
  listStaleNotificationCampaigns(before: Date): Promise<NotificationCampaign[]>;
  createCampaignSend(input: Omit<CampaignSend, "id">): Promise<CampaignSend>;
  /** The sends of these campaigns, newest first. */
  listCampaignSends(appId: string, campaignIds: number[]): Promise<CampaignSend[]>;
  /** 85.4 What the WordPress site answered for a send (its inbox notification and people), or removes a send the site never took. */
  updateCampaignSend(appId: string, id: number, patch: Partial<Pick<CampaignSend, "notificationId" | "recipients" | "reportedAt">>): Promise<void>;
  deleteCampaignSend(appId: string, id: number): Promise<void>;
  /** 85.4 A WordPress site's numbers for one of its sends, once: false when it isn't this app's or was reported. */
  /** Null when it isn't this app's or was already reported; else the send as it now is. */
  reportCampaignSend(appId: string, id: number, numbers: { pushed: number; failed: number }, now: Date): Promise<CampaignSend | null>;

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

  // 70 Sessions kept on the server (lib/auth/session.ts)
  createUserSession(session: UserSession): Promise<void>;
  getUserSession(idHash: string): Promise<UserSession | null>;
  deleteUserSession(idHash: string): Promise<void>;
  /** Every session of the person; the number deleted. */
  deleteUserSessions(userId: string): Promise<number>;
  /** Sessions whose time ended (the daily job); the number deleted. */
  deleteExpiredUserSessions(now: Date): Promise<number>;

  // 70 Two-step sign-in (lib/auth/two-step.ts)
  getTwoFactor(userId: string): Promise<UserTwoFactor | null>;
  /** Starts (or starts again) a setup that waits for its first code; never replaces one that is on (false then). */
  saveTwoFactorSetup(userId: string, secretEncrypted: string, now: Date): Promise<boolean>;
  /** Turns a waiting setup on with its first code's step and new recovery codes (atomic: once); false otherwise. */
  enableTwoFactor(userId: string, step: number, recoveryHashes: string[], now: Date): Promise<boolean>;
  /** Claims a code's step: only after the last one used, while it is on (atomic: a code works once). */
  useTwoFactorStep(userId: string, step: number, now: Date): Promise<boolean>;
  /** Marks an unused recovery code used (atomic: once); false when it isn't one of theirs or was used. */
  useRecoveryCode(userId: string, codeHash: string, now: Date): Promise<boolean>;
  /** Replaces every recovery code. */
  replaceRecoveryCodes(userId: string, codeHashes: string[], now: Date): Promise<void>;
  countUnusedRecoveryCodes(userId: string): Promise<number>;
  /** Removes the secret and the recovery codes; false when there was none. */
  deleteTwoFactor(userId: string): Promise<boolean>;

  // 73 Deleting an app (lib/apps/deletion.ts). A deleted app (`apps.deleted_at`) and its license are
  // left out of every other read: getAppById, listAppsByClient, listApps, the licenses and the admin's lists.
  /**
   * Marks the app deleted and saves the record of it, together: false (nothing
   * saved) when the app is gone or already deleted (of two at once, one wins).
   */
  softDeleteApp(deletion: AppDeletion): Promise<boolean>;
  /** Brings back the app of a waiting deletion; false when it isn't waiting any more (restored or purged). */
  restoreDeletedApp(deletionId: string, by: string, now: Date): Promise<boolean>;
  getAppDeletion(id: string): Promise<AppDeletion | null>;
  /** Newest first; `statuses` empty: all of them. */
  listAppDeletions(input: { statuses: AppDeletionStatus[]; clientId?: string; limit: number }): Promise<AppDeletion[]>;
  /** Waiting deletions whose `purgeAfter` has come, oldest first. */
  listDueAppDeletions(now: Date, limit: number): Promise<AppDeletion[]>;
  /** An app whether or not it was deleted (its purge, the admin). */
  getAppIncludingDeleted(id: string): Promise<App | null>;
  /** The client's apps, deleted ones waiting to be purged included, oldest first. */
  listAppsByClientIncludingDeleted(clientId: string): Promise<App[]>;
  /**
   * Deletes the app of a waiting deletion, and every row that goes with it
   * (licenses, builds, content, customers, Media rows…; plan payments stay,
   * without their app), marking the record purged: false when it isn't
   * waiting (restored, or purged by another run).
   */
  purgeDeletedApp(deletionId: string, by: string, now: Date, pendingBuilds: string[]): Promise<boolean>;
  /** Saves a deletion record as it is (an app purged with its account). */
  createAppDeletionRecord(deletion: AppDeletion): Promise<void>;
  /** The build folders still to remove from the files host. */
  setAppDeletionPendingBuilds(id: string, builds: string[]): Promise<void>;
  /** Purged deletions with build folders left on the files host, oldest first. */
  listAppDeletionsWithPendingBuilds(limit: number): Promise<AppDeletion[]>;
  /**
   * The asset IDs an app's rows name: its icon, logo, screenshots and
   * Firebase files, the images of its courses, products, articles, listings,
   * events and campaigns, and its pages. Deleted apps too.
   */
  listAppAssetReferences(appId: string): Promise<string[]>;
  listAssetsByClient(clientId: string): Promise<Asset[]>;
  deleteAsset(id: string): Promise<void>;

  // 73 Deleting a Yallapp account (lib/account/purge.ts)
  /** Saves billing records kept when an account is deleted (again: replaced). */
  keepBillingRecords(records: KeptBillingRecord[]): Promise<void>;
  /** Newest first. */
  listKeptBillingRecords(input: { clientId?: string; limit: number }): Promise<KeptBillingRecord[]>;
  getKeptBillingRecord(id: string): Promise<KeptBillingRecord | null>;
  /**
   * Deletes the person and everything of theirs: their client account, its
   * apps (deleted ones too) and every row of those, its payments (keep them
   * first), team, sessions, two-step sign-in and phones. Their memberships of
   * other businesses' teams go too. Records without foreign keys stay (the
   * audit log, deletion requests, app deletions, kept billing records).
   * False when there was no such person.
   */
  deleteUserAccount(userId: string): Promise<boolean>;

  // 77 Chat (lib/chat). Messages have increasing IDs; a conversation's last message and the
  // business's place are kept on the conversation, each member's place on their participant row.
  /** The member for this person, made or updated with their name and picture (one per app, source and ID). */
  upsertChatMember(input: { appId: string; source: ChatMemberSource; externalId: string; name: string; imageUrl: string | null }, now: Date): Promise<ChatMember>;
  getChatMember(appId: string, id: string): Promise<ChatMember | null>;
  findChatMember(appId: string, source: ChatMemberSource, externalId: string): Promise<ChatMember | null>;
  listChatMembersByIds(appId: string, ids: string[]): Promise<ChatMember[]>;
  setChatMemberBlocked(appId: string, id: string, blockedAt: Date | null, now: Date): Promise<boolean>;
  /** Deletes the member, their conversation with the business, their messages, reports, blocks, sessions and uploads (their files first: the caller). */
  deleteChatMember(appId: string, id: string): Promise<void>;
  /** The person's conversation with the business, made the first time (of two at once, one is made). */
  ensureDirectConversation(appId: string, memberId: string, now: Date): Promise<ChatConversation>;
  /** A course's group, made the first time; its title and picture follow the course's. */
  ensureGroupConversation(input: { appId: string; courseKey: string; title: string; imageUrl: string | null }, now: Date): Promise<ChatConversation>;
  /** 113.6 A school's teacher and a parent or student, made the first time (of two at once, one is made). */
  ensureSchoolConversation(input: { appId: string; teacherId: number; personId: number }, now: Date): Promise<ChatConversation>;
  /** 113.6 The school conversations of these people (on either side); without `personIds`, the app's with a message, most recent first. */
  listSchoolConversations(appId: string, input: { personIds?: number[]; limit: number }): Promise<ChatConversation[]>;
  getChatConversation(appId: string, id: string): Promise<ChatConversation | null>;
  updateChatConversation(id: string, patch: ChatConversationPatch): Promise<void>;
  /** The app's conversations with a message, most recent first. */
  listChatConversations(appId: string, input: { kind?: ChatConversationKind; limit: number }): Promise<ChatConversation[]>;
  /** The conversations the member takes part in (theirs with the business, their groups), with their place in each. */
  listMemberConversations(appId: string, memberId: string): Promise<{ conversation: ChatConversation; participant: ChatParticipant }[]>;
  /** Puts the member in these groups of `kind` group and out of the app's others; the direct one stays. */
  setMemberGroups(appId: string, memberId: string, conversationIds: string[], now: Date): Promise<void>;
  /** Adds the member to the conversation (again: unchanged). */
  addChatParticipant(conversationId: string, memberId: string, now: Date): Promise<void>;
  getChatParticipant(conversationId: string, memberId: string): Promise<ChatParticipant | null>;
  listChatParticipants(conversationId: string): Promise<ChatParticipant[]>;
  /** Moves the member's place forward (never back). */
  setChatRead(conversationId: string, memberId: string, messageId: number): Promise<void>;
  /** Adds a message and moves the conversation's last message to it; the same `clientId` in the conversation gives the message already made. */
  createChatMessage(input: Omit<ChatMessage, "id">): Promise<{ message: ChatMessage; created: boolean }>;
  getChatMessage(appId: string, id: number): Promise<ChatMessage | null>;
  /** `after`: oldest first above that ID; else newest first below `before` (or from the newest). */
  listChatMessages(conversationId: string, input: { after?: number; before?: number; limit: number; hideFrom?: string[] }): Promise<ChatMessage[]>;
  /** Messages after `afterId` not sent by `memberId` (null: the business's place, so messages from members), not deleted. */
  countChatUnread(conversationId: string, afterId: number | null, input: { notFromMember?: string; fromMembersOnly?: boolean; hideFrom?: string[] }): Promise<number>;
  /** Marks it deleted and clears its text and file; false when it was already. */
  deleteChatMessage(appId: string, id: number, now: Date): Promise<boolean>;
  /** Deletes every message of the conversation; returns their files' media IDs. */
  clearChatConversation(appId: string, conversationId: string): Promise<string[]>;
  /** Messages and files of the member (for their account's deletion). */
  listChatMediaOfMember(appId: string, memberId: string): Promise<string[]>;
  /** Deletes the conversation's messages created before `before`; returns their files' media IDs. */
  deleteChatMessagesBefore(conversationId: string, before: Date): Promise<string[]>;
  /** The oldest message's date in each conversation with one older than `olderThan` (retention). */
  listChatConversationsWithMessagesBefore(
    olderThan: Date,
    limit: number,
    input?: { appId?: string; notKeptAt?: Date },
  ): Promise<{ conversation: ChatConversation; oldest: Date }[]>;
  /** A report; again by the same member for the same message: false. */
  createChatReport(report: ChatReport): Promise<boolean>;
  getChatReport(appId: string, id: string): Promise<ChatReport | null>;
  listChatReports(appId: string, input: { status: "open" | "closed"; limit: number }): Promise<ChatReport[]>;
  countOpenChatReports(appId: string): Promise<number>;
  /** Closes the message's open reports with the outcome; returns how many. */
  closeChatReports(appId: string, messageId: number, outcome: ChatReportOutcome, by: string, now: Date): Promise<number>;
  /** The member's own block list (members whose messages they don't see). */
  listChatBlocks(memberId: string): Promise<string[]>;
  setChatBlock(memberId: string, blockedId: string, blocked: boolean, now: Date): Promise<void>;
  createChatSession(session: ChatSession): Promise<void>;
  getChatSession(tokenHash: string): Promise<ChatSession | null>;
  deleteExpiredChatSessions(now: Date): Promise<number>;
  createChatUpload(upload: ChatUploadInfo): Promise<void>;
  getChatUpload(mediaId: string): Promise<ChatUploadInfo | null>;
  /** Uploads not sent in a message, made before `before` (their media IDs). */
  listUnsentChatUploads(before: Date, limit: number): Promise<string[]>;

  // 78 Milestones (lib/milestones)
  /** Adds those not recorded yet (the same client, kind and ref keep the first); returns how many were new. */
  addClientMilestones(rows: ClientMilestone[]): Promise<number>;
  /** A client's milestones, oldest first. */
  listClientMilestones(clientId: string): Promise<ClientMilestone[]>;
  /** Every client's, oldest first: those from `since` on, of these kinds. */
  listMilestones(input: { since?: Date; kinds?: MilestoneKind[] }): Promise<ClientMilestone[]>;
  /** 78.2 Saves the day's snapshot, replacing one saved earlier that day. */
  saveProductDay(day: ProductDay, now: Date): Promise<void>;
  /** The snapshots from `since` (YYYY-MM-DD) on, oldest first. */
  listProductDays(since: string): Promise<ProductDay[]>;

  // 78.3 Watching (lib/watch)
  /** A job starting: its run's ID. */
  startJobRun(job: WatchedJob, startedAt: Date): Promise<number>;
  finishJobRun(id: number, result: { finishedAt: Date; ok: boolean; summary: string | null; error: string | null }): Promise<void>;
  /** Newest first. */
  listJobRuns(input: { job?: WatchedJob; limit: number }): Promise<JobRun[]>;
  /** When each job last finished well. */
  lastGoodJobRuns(): Promise<Partial<Record<WatchedJob, Date>>>;
  deleteJobRunsBefore(before: Date): Promise<number>;
  /**
   * Opens the key's alert, or, when it is open already, counts it again and
   * takes the new title and detail. `created` is true only for a new one (of
   * two at once, one).
   */
  raiseTeamAlert(input: Pick<TeamAlert, "kind" | "key" | "title" | "detail" | "link">, now: Date): Promise<{ alert: TeamAlert; created: boolean }>;
  markTeamAlertEmailed(id: string, at: Date): Promise<void>;
  /** Open ones newest first (by when last seen), or closed ones newest first. */
  listTeamAlerts(input: { open: boolean; limit: number }): Promise<TeamAlert[]>;
  countOpenTeamAlerts(): Promise<number>;
  /** Closes one open alert; false when it isn't open. */
  resolveTeamAlert(id: string, by: string, now: Date): Promise<boolean>;
  /** Closes the kind's open alerts whose key isn't in `keep` (the problem went): how many. */
  resolveTeamAlertsExcept(kind: TeamAlertKind, keep: string[], by: string, now: Date): Promise<number>;

  // 78.4 Errors per app (lib/watch/app-errors.ts)
  /** Counts the error: one row per client, app, source and code, with its last message and time. */
  recordAppError(input: Pick<AppError, "clientId" | "appId" | "source" | "code" | "message">, now: Date): Promise<void>;
  /** Last seen first: a client's, an app's, or every client's. */
  listAppErrors(input: { clientId?: string; appId?: string; since?: Date; limit: number }): Promise<AppError[]>;
  deleteAppErrorsBefore(before: Date): Promise<number>;

  // 79.2 Moving encrypted values to the current key (lib/jobs/rekey.ts)
  /**
   * Cells holding an encrypted value of before 79.2 or one whose key ID isn't
   * `currentKeyId`, from `after` (a position this returned) on. `next` is null
   * once every table was looked at; a page can be short of `limit` and still
   * have a `next`.
   */
  listCellsToRekey(input: { currentKeyId: string; after: string | null; limit: number }): Promise<{ cells: RekeyCell[]; next: string | null }>;
  /** Writes the cell's new text, unless it changed since it was listed. */
  updateRekeyedCell(cell: RekeyCell, text: string): Promise<boolean>;

  // 113.9 Universities (lib/university)
  getUniSettings(appId: string): Promise<UniSettings | null>;
  saveUniSettings(appId: string, settings: UniSettings, now: Date): Promise<void>;
  /** By name. */
  listUniFaculties(appId: string): Promise<UniFaculty[]>;
  /** Null when the faculty to edit isn't the app's. */
  saveUniFaculty(input: Pick<UniFaculty, "appId" | "name" | "code"> & { id: number | null }, now: Date): Promise<UniFaculty | null>;
  /** Its departments go with it. */
  deleteUniFaculty(appId: string, id: number): Promise<void>;
  /** By name. */
  listUniDepartments(appId: string): Promise<UniDepartment[]>;
  saveUniDepartment(input: Pick<UniDepartment, "appId" | "facultyId" | "name" | "code"> & { id: number | null }, now: Date): Promise<UniDepartment | null>;
  /** Its programs go with it; its courses stay without a department. */
  deleteUniDepartment(appId: string, id: number): Promise<void>;
  /** By name. */
  listUniPrograms(appId: string): Promise<UniProgram[]>;
  saveUniProgram(input: Omit<UniProgram, "id" | "createdAt" | "updatedAt"> & { id: number | null }, now: Date): Promise<UniProgram | null>;
  /** Its students stay without a program. */
  deleteUniProgram(appId: string, id: number): Promise<void>;
  /** By code. */
  listUniCourses(appId: string): Promise<UniCourse[]>;
  /** Fails (`duplicate`) when another course has the code. */
  saveUniCourse(
    input: Omit<UniCourse, "id" | "createdAt" | "updatedAt"> & { id: number | null },
    now: Date,
  ): Promise<{ ok: true; course: UniCourse } | { ok: false; reason: "duplicate" | "not_found" }>;
  /** Its sections and their students go with it. */
  deleteUniCourse(appId: string, id: number): Promise<void>;
  /** The latest first. */
  listUniTerms(appId: string): Promise<UniTerm[]>;
  saveUniTerm(input: Omit<UniTerm, "id" | "createdAt"> & { id: number | null }, now: Date): Promise<UniTerm | null>;
  /** Its sections, registrations and their students go with it. */
  deleteUniTerm(appId: string, id: number): Promise<void>;
  /** By the course's id, then the section's code. */
  listUniSections(appId: string, filter?: { termId?: number; courseId?: number; lecturerId?: number; ids?: number[] }): Promise<UniSection[]>;
  getUniSection(appId: string, id: number): Promise<UniSection | null>;
  saveUniSection(input: Omit<UniSection, "id" | "createdAt" | "updatedAt"> & { id: number | null }, now: Date): Promise<UniSection | null>;
  deleteUniSection(appId: string, id: number): Promise<void>;
  listUniStudents(appId: string, filter?: { studentIds?: number[]; advisorId?: number; programId?: number }): Promise<UniStudent[]>;
  /** Adds or replaces the student's row. */
  saveUniStudent(row: UniStudent): Promise<void>;
  listUniRegistrations(appId: string, filter: { termId?: number; studentId?: number; studentIds?: number[]; status?: UniRegistrationStatus }): Promise<UniRegistration[]>;
  /** Adds or replaces the row of the term and student. */
  saveUniRegistration(row: UniRegistration): Promise<void>;
  /** In the order they were added. */
  listUniEnrolments(appId: string, filter: { termId?: number; sectionId?: number; sectionIds?: number[]; studentId?: number; statuses?: UniEnrolmentStatus[] }): Promise<UniEnrolment[]>;
  /** Null when the student has a row in the section already. */
  createUniEnrolment(input: Omit<UniEnrolment, "id">): Promise<UniEnrolment | null>;
  updateUniEnrolment(appId: string, id: number, patch: Partial<Pick<UniEnrolment, "status" | "addedBy" | "addedAt" | "droppedAt" | "grade" | "mark" | "gradedAt">>, now: Date): Promise<boolean>;
  listUniAttendance(appId: string, filter: { sectionId?: number; studentId?: number; from?: string; to?: string }): Promise<UniAttendance[]>;
  /** Adds or replaces each row (one per section, student and day). */
  saveUniAttendance(rows: UniAttendance[]): Promise<void>;

  // 114 Email campaigns (Admin › Email campaigns, lib/mailing)
  /** The latest first; archived ones only with `archived`. */
  listMailCampaigns(filter?: { archived?: boolean }): Promise<MailCampaign[]>;
  getMailCampaign(id: string): Promise<MailCampaign | null>;
  /** Adds or replaces it. */
  saveMailCampaign(campaign: MailCampaign): Promise<void>;
  /**
   * Moves it to `patch.status` only while it's in one of `from`, so two runs
   * (or two admins) never both start, finish or cancel it. False when it wasn't.
   */
  setMailCampaignStatus(
    id: string,
    from: MailCampaignStatus[],
    patch: Partial<Pick<MailCampaign, "startedAt" | "finishedAt" | "recipients" | "scheduledAt" | "timeZone" | "updatedAt">> & { status: MailCampaignStatus },
  ): Promise<boolean>;
  /** Its recipients and their opens and clicks go with it. */
  deleteMailCampaign(id: string): Promise<void>;
  /** By name. */
  listMailSegments(): Promise<MailSegment[]>;
  saveMailSegment(segment: MailSegment): Promise<void>;
  deleteMailSegment(id: string): Promise<void>;
  /** The admin's own designs, the latest first. */
  listMailTemplates(): Promise<MailTemplate[]>;
  getMailTemplate(id: string): Promise<MailTemplate | null>;
  saveMailTemplate(template: MailTemplate): Promise<void>;
  deleteMailTemplate(id: string): Promise<void>;
  /** Adds the addresses the campaign doesn't list yet (it never lists one twice). How many were added. */
  addMailRecipients(rows: Omit<MailRecipient, "id">[]): Promise<number>;
  getMailRecipient(id: number): Promise<MailRecipient | null>;
  /** In the order they were listed. `query`: part of the address or name. */
  listMailRecipients(campaignId: string, filter: { status?: MailRecipientStatus; query?: string; offset: number; limit: number }): Promise<{ items: MailRecipient[]; total: number }>;
  countMailRecipients(campaignId: string): Promise<Record<MailRecipientStatus, number>>;
  /**
   * Takes for this run (`claim`) up to `limit` of the campaign's queued rows
   * due by `now`, in order, marking them "sending" until `leaseUntil`. A row
   * is taken by one run only, also when two run at once.
   */
  claimMailRecipients(campaignId: string, claim: string, limit: number, now: Date, leaseUntil: Date): Promise<MailRecipient[]>;
  /** Writes how a taken row ended, only while it's still this run's. False when it isn't. */
  finishMailRecipient(id: number, claim: string, patch: Pick<MailRecipient, "status" | "error" | "nextAttemptAt" | "sentAt" | "attempts">): Promise<boolean>;
  /**
   * Rows a run took and never finished by their lease's end (the run was
   * lost): failed as "interrupted", never sent again, because they may have gone.
   */
  expireMailRecipientClaims(campaignId: string, now: Date): Promise<number>;
  /** How many of its emails went since then (its rate). */
  countMailSentSince(campaignId: string, since: Date): Promise<number>;
  /** Its rows in these statuses become "skipped" with this reason (a cancelled campaign). */
  skipMailRecipients(campaignId: string, statuses: MailRecipientStatus[], reason: string): Promise<number>;
  addMailEvent(event: MailEvent): Promise<void>;
  mailEventStats(campaignId: string): Promise<MailEventStats>;
  /** Which of these addresses (lower case) are never to be mailed. */
  listMailSuppressed(emails: string[]): Promise<string[]>;
  getMailSuppression(email: string): Promise<MailSuppression | null>;
  /** Keeps the first reason when the address is already there. */
  suppressMail(suppression: MailSuppression): Promise<void>;
  unsuppressMail(email: string): Promise<void>;
  /** The latest first. */
  listMailSuppressions(filter: { query?: string; offset: number; limit: number }): Promise<{ items: MailSuppression[]; total: number }>;
  addMailRun(run: Omit<MailRun, "id">): Promise<void>;
  /** The latest first. */
  listMailRuns(campaignId: string, limit: number): Promise<MailRun[]>;
  /**
   * The history kept for MAIL_HISTORY_MONTHS (the privacy policy): opens,
   * clicks and the other events from before `before`, and the per-person rows
   * and runs of campaigns that finished before it. The campaigns stay, with
   * their totals; the addresses never to be mailed stay too.
   */
  pruneMailHistory(before: Date): Promise<{ events: number; recipients: number; runs: number }>;
}
