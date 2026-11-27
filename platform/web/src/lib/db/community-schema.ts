import { boolean, customType, datetime, foreignKey, index, int, mysqlTable, primaryKey, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import type {
  CommunityEmailTokenPurpose,
  CommunityFriendshipStatus,
  CommunityLanguage,
  CommunityMemberStatus,
  CommunityProfileLink,
  CommunityReportReason,
  CommunityReportStatus,
  CommunityRole,
  CommunityTargetType,
  CommunityTheme,
  CommunityYallappLinkVia,
} from "../community/types";

/**
 * 231 Yallapp Community's tables (migration 0155), in the same database as
 * the rest of Yallapp. Community members are their own table: a Yallapp
 * account is not needed, and one can be linked (`yallapp_user_id`).
 *
 * Area A (base): members, identities, sessions, email tokens, follows,
 * friendships, blocks, link requests, reports.
 * Area B (Q&A and tutorials): sections, tags, questions, answers, votes,
 * tutorials.
 * Area C (trust): badges, verification requests, the audit log, settings,
 * the moderation queue, violations, notifications.
 *
 * Times are UTC with milliseconds; ids are UUIDs.
 */

const jsonText = <T>(name: string) =>
  customType<{ data: T; driverData: string }>({
    dataType: () => "longtext",
    toDriver: (value) => JSON.stringify(value),
    fromDriver: (value) => JSON.parse(value) as T,
  })(name);

const id = (name: string) => varchar(name, { length: 36 });
const time = (name: string) => datetime(name, { mode: "date", fsp: 3 });
/**
 * 232–235 The tenant key: whose community a row belongs to, "yallapp"
 * (Yallapp Community) or a client app's id (its own community, phase 5).
 * Every new table has it; of phase 1's, the roots that are listed or
 * looked up by a natural key (members, identities, reports, sections, tags,
 * questions, tutorials, verification requests, the audit log, settings,
 * the moderation queue). The rest hang off a member or content id.
 */
export const tenantColumn = (name = "tenant_id") => varchar(name, { length: 64 }).notNull().default("yallapp");

// ---------------------------------------------------------------- Area A

export const communityMembers = mysqlTable(
  "community_members",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    email: varchar("email", { length: 191 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    passwordHash: varchar("password_hash", { length: 255 }),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    username: varchar("username", { length: 30 }).notNull(),
    bio: text("bio").notNull(),
    skills: jsonText<string[]>("skills").notNull(),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    headline: varchar("headline", { length: 80 }).notNull().default(""),
    links: jsonText<CommunityProfileLink[]>("links").notNull(),
    language: varchar("language", { length: 8 }).notNull().$type<CommunityLanguage>(),
    theme: varchar("theme", { length: 8 }).notNull().default("system").$type<CommunityTheme>(),
    role: varchar("role", { length: 8 }).notNull().default("member").$type<CommunityRole>(),
    status: varchar("status", { length: 12 }).notNull().default("active").$type<CommunityMemberStatus>(),
    points: int("points").notNull().default(0),
    approvedPosts: int("approved_posts").notNull().default(0),
    yallappUserId: id("yallapp_user_id"),
    linkedAt: time("linked_at"),
    yallappLinkVia: varchar("yallapp_link_via", { length: 10 }).$type<CommunityYallappLinkVia>(),
    linkSuggestionDismissedAt: time("link_suggestion_dismissed_at"),
    sessionVersion: int("session_version").notNull().default(1),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    lastActiveAt: time("last_active_at").notNull(),
  },
  (t) => [
    uniqueIndex("community_members_email_unique").on(t.tenantId, t.email),
    uniqueIndex("community_members_username_unique").on(t.tenantId, t.username),
    uniqueIndex("community_members_yallapp_unique").on(t.tenantId, t.yallappUserId),
    index("community_members_points").on(t.tenantId, t.points),
  ],
);

export const communityIdentities = mysqlTable(
  "community_identities",
  {
    tenantId: tenantColumn(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 8 }).notNull().$type<"apple" | "google" | "app">(),
    subject: varchar("subject", { length: 191 }).notNull(),
    email: varchar("email", { length: 191 }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.provider, t.subject] }), index("community_identities_member").on(t.memberId)],
);

export const communitySessions = mysqlTable(
  "community_sessions",
  {
    id: id("id").primaryKey(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    platform: varchar("platform", { length: 8 }).notNull().$type<"ios" | "android" | "web">(),
    refreshHash: varchar("refresh_hash", { length: 64 }).notNull(),
    refreshExpiresAt: time("refresh_expires_at").notNull(),
    accessHash: varchar("access_hash", { length: 64 }).notNull(),
    accessExpiresAt: time("access_expires_at").notNull(),
    sessionVersion: int("session_version").notNull(),
    createdAt: time("created_at").notNull(),
    lastSeenAt: time("last_seen_at").notNull(),
  },
  (t) => [
    uniqueIndex("community_sessions_refresh_unique").on(t.refreshHash),
    uniqueIndex("community_sessions_access_unique").on(t.accessHash),
    index("community_sessions_member").on(t.memberId),
  ],
);

export const communityEmailTokens = mysqlTable(
  "community_email_tokens",
  {
    tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 16 }).notNull().$type<CommunityEmailTokenPurpose>(),
    expiresAt: time("expires_at").notNull(),
    usedAt: time("used_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_email_tokens_member").on(t.memberId)],
);

export const communityFollows = mysqlTable(
  "community_follows",
  {
    followerId: id("follower_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    followeeId: id("followee_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followeeId] }), index("community_follows_followee").on(t.followeeId)],
);

export const communityFriendships = mysqlTable(
  "community_friendships",
  {
    id: id("id").primaryKey(),
    requesterId: id("requester_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    addresseeId: id("addressee_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    // The pair in a fixed order ("{smaller id}:{larger id}"): one row per two members.
    pairKey: varchar("pair_key", { length: 80 }).notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<CommunityFriendshipStatus>(),
    createdAt: time("created_at").notNull(),
    respondedAt: time("responded_at"),
  },
  (t) => [
    uniqueIndex("community_friendships_pair_unique").on(t.pairKey),
    index("community_friendships_requester").on(t.requesterId),
    index("community_friendships_addressee").on(t.addresseeId),
  ],
);

export const communityBlocks = mysqlTable(
  "community_blocks",
  {
    blockerId: id("blocker_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    blockedId: id("blocked_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("community_blocks_blocked").on(t.blockedId)],
);

export const communityLinkRequests = mysqlTable(
  "community_link_requests",
  {
    stateHash: varchar("state_hash", { length: 64 }).primaryKey(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    expiresAt: time("expires_at").notNull(),
    confirmedAt: time("confirmed_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_link_requests_member").on(t.memberId)],
);

/** "Continue with Yallapp": a sign-in request, approved on yallapp.com.tr, its one-time code exchanged once (migration 0158). */
export const communityYallappSignins = mysqlTable(
  "community_yallapp_signins",
  {
    requestHash: varchar("request_hash", { length: 64 }).primaryKey(),
    redirectUri: varchar("redirect_uri", { length: 200 }).notNull(),
    codeChallenge: varchar("code_challenge", { length: 64 }).notNull(),
    clientState: varchar("client_state", { length: 128 }).notNull(),
    yallappUserId: id("yallapp_user_id"),
    codeHash: varchar("code_hash", { length: 64 }),
    expiresAt: time("expires_at").notNull(),
    approvedAt: time("approved_at"),
    usedAt: time("used_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [uniqueIndex("community_yallapp_signins_code").on(t.codeHash), index("community_yallapp_signins_time").on(t.expiresAt)],
);

export const communityReports = mysqlTable(
  "community_reports",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    reporterId: id("reporter_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 24 }).notNull().$type<CommunityTargetType>(),
    targetId: id("target_id").notNull(),
    reason: varchar("reason", { length: 16 }).notNull().$type<CommunityReportReason>(),
    note: text("note").notNull(),
    status: varchar("status", { length: 10 }).notNull().default("open").$type<CommunityReportStatus>(),
    handledBy: id("handled_by"),
    handledAt: time("handled_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("community_reports_once").on(t.reporterId, t.targetType, t.targetId),
    index("community_reports_status").on(t.tenantId, t.status, t.createdAt),
    index("community_reports_target").on(t.targetType, t.targetId),
  ],
);

// ---------------------------------------------------------------- Area B

/** Q&A and tutorial sections ("Studio", "Store apps", "Publishing"), with their names in en/ar/tr. */
export const communitySections = mysqlTable(
  "community_sections",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    slug: varchar("slug", { length: 60 }).notNull(),
    kind: varchar("kind", { length: 10 }).notNull().$type<"qa" | "tutorial">(),
    names: jsonText<Partial<Record<CommunityLanguage, string>>>("names").notNull(),
    icon: varchar("icon", { length: 60 }).notNull(),
    position: int("position").notNull().default(0),
    createdAt: time("created_at").notNull(),
  },
  (t) => [uniqueIndex("community_sections_slug_unique").on(t.tenantId, t.kind, t.slug)],
);

export const communityTags = mysqlTable(
  "community_tags",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    slug: varchar("slug", { length: 40 }).notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    useCount: int("use_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
  },
  (t) => [uniqueIndex("community_tags_slug_unique").on(t.tenantId, t.slug)],
);

/** Content's moderation state: pending (a new member's first posts, or the spam filter), published, removed. */
type ContentStatus = "pending" | "published" | "removed";

export const communityQuestions = mysqlTable(
  "community_questions",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    authorId: id("author_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    sectionId: id("section_id")
      .notNull()
      .references(() => communitySections.id),
    // 231 (B) Its address on the site (/questions/{slug}), from its title in its own script.
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    language: varchar("language", { length: 8 }).notNull().$type<CommunityLanguage>(),
    tags: jsonText<string[]>("tags").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<ContentStatus>(),
    acceptedAnswerId: id("accepted_answer_id"),
    score: int("score").notNull().default(0),
    answerCount: int("answer_count").notNull().default(0),
    viewCount: int("view_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    lastActivityAt: time("last_activity_at").notNull(),
  },
  (t) => [
    uniqueIndex("community_questions_slug_unique").on(t.tenantId, t.slug),
    index("community_questions_section").on(t.sectionId, t.status, t.lastActivityAt),
    index("community_questions_author").on(t.authorId),
    index("community_questions_status").on(t.status, t.createdAt),
  ],
);

export const communityQuestionTags = mysqlTable(
  "community_question_tags",
  {
    questionId: id("question_id")
      .notNull()
      .references(() => communityQuestions.id, { onDelete: "cascade" }),
    tagId: id("tag_id")
      .notNull()
      .references(() => communityTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.tagId] }), index("community_question_tags_tag").on(t.tagId)],
);

export const communityAnswers = mysqlTable(
  "community_answers",
  {
    id: id("id").primaryKey(),
    questionId: id("question_id")
      .notNull()
      .references(() => communityQuestions.id, { onDelete: "cascade" }),
    authorId: id("author_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    // An answer from Yallapp's team ("Yallapp Team" badge).
    official: boolean("official").notNull().default(false),
    status: varchar("status", { length: 10 }).notNull().$type<ContentStatus>(),
    score: int("score").notNull().default(0),
    // 231 (B) Its published replies ("💬 5 replies").
    replyCount: int("reply_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_answers_question").on(t.questionId, t.status), index("community_answers_author").on(t.authorId)],
);

export const communityVotes = mysqlTable(
  "community_votes",
  {
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 12 }).notNull().$type<"question" | "answer">(),
    targetId: id("target_id").notNull(),
    value: int("value").notNull().$type<1 | -1>(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.targetType, t.targetId] }), index("community_votes_target").on(t.targetType, t.targetId)],
);

export const communityTutorials = mysqlTable(
  "community_tutorials",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    authorId: id("author_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    sectionId: id("section_id")
      .notNull()
      .references(() => communitySections.id),
    kind: varchar("kind", { length: 8 }).notNull().$type<"article" | "video">(),
    level: varchar("level", { length: 12 }).notNull().$type<"beginner" | "intermediate" | "advanced">(),
    language: varchar("language", { length: 8 }).notNull().$type<CommunityLanguage>(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 400 }).notNull(),
    body: text("body").notNull(),
    videoUrl: varchar("video_url", { length: 512 }),
    coverUrl: varchar("cover_url", { length: 512 }),
    durationMinutes: int("duration_minutes"),
    // 231 (B) A video's length to the second ("08:24"); an article's reading time.
    durationSeconds: int("duration_seconds").notNull().default(0),
    viewCount: int("view_count").notNull().default(0),
    tags: jsonText<string[]>("tags").notNull(),
    // Official tutorials are Yallapp's (phase 1 publishes only these); a member's goes through review.
    official: boolean("official").notNull().default(true),
    status: varchar("status", { length: 10 }).notNull().$type<"draft" | ContentStatus>(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    publishedAt: time("published_at"),
  },
  (t) => [
    uniqueIndex("community_tutorials_slug_unique").on(t.tenantId, t.slug),
    index("community_tutorials_section").on(t.sectionId, t.status, t.publishedAt),
    index("community_tutorials_author").on(t.authorId),
  ],
);

/** 231 (B) A reply under an answer (the question screen's "💬 5 replies"): plain text. */
export const communityReplies = mysqlTable(
  "community_replies",
  {
    id: id("id").primaryKey(),
    answerId: id("answer_id")
      .notNull()
      .references(() => communityAnswers.id, { onDelete: "cascade" }),
    authorId: id("author_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    body: varchar("body", { length: 1000 }).notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<ContentStatus>(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_replies_answer").on(t.answerId, t.status, t.createdAt), index("community_replies_author").on(t.authorId)],
);

/** 231 (B) A question or tutorial a member saved for later (the side menu's Saved). */
export const communityBookmarks = mysqlTable(
  "community_bookmarks",
  {
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 12 }).notNull().$type<"question" | "tutorial">(),
    targetId: id("target_id").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.targetType, t.targetId] }), index("community_bookmarks_member").on(t.memberId, t.targetType, t.createdAt)],
);

/** 231 (B) The Q&A sections a member follows (the nav's "My sections", the For you filter). */
export const communitySectionFollows = mysqlTable(
  "community_section_follows",
  {
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    sectionId: id("section_id")
      .notNull()
      .references(() => communitySections.id, { onDelete: "cascade" }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.sectionId] })],
);

/**
 * 231 (B) The points ledger: each thing that earned or cost a member
 * points ("Answer accepted · +25 points"), so a vote taken back takes its
 * points back (`ref`) and the week's most active are counted from it.
 */
export const communityPointEvents = mysqlTable(
  "community_point_events",
  {
    id: id("id").primaryKey(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 24 }).notNull(),
    points: int("points").notNull(),
    ref: varchar("ref", { length: 120 }).notNull(),
    createdAt: time("created_at").notNull(),
  },
  // Once per member, reason and ref: a repeated award (parallel votes) is ignored (migration 0157).
  (t) => [uniqueIndex("community_point_events_once").on(t.memberId, t.reason, t.ref), index("community_point_events_time").on(t.createdAt)],
);

// ---------------------------------------------------------------- Area C

/** gold: Pro Developer; green: Verified Business; blue: Active Member. */
type BadgeKind = "gold" | "green" | "blue";

/** A badge a member holds or held: granted by its rules (auto) or by an admin (manual). */
export const communityBadges = mysqlTable(
  "community_badges",
  {
    id: id("id").primaryKey(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    badge: varchar("badge", { length: 8 }).notNull().$type<BadgeKind>(),
    source: varchar("source", { length: 8 }).notNull().$type<"auto" | "manual" | "request">(),
    // Green: the company's name and its app's link.
    details: jsonText<{ companyName?: string; appUrl?: string; appId?: string } | null>("details"),
    grantedBy: id("granted_by"),
    // Private: seen by admins only.
    reason: text("reason"),
    // Manual badges only, and optional: they never expire by their rules.
    expiresAt: time("expires_at"),
    grantedAt: time("granted_at").notNull(),
    revokedAt: time("revoked_at"),
    revokedBy: id("revoked_by"),
    revokeReason: text("revoke_reason"),
  },
  (t) => [index("community_badges_member").on(t.memberId, t.revokedAt), index("community_badges_badge").on(t.badge, t.revokedAt)],
);

/** The Gold ("Pro Developer") verification form. */
export const communityVerificationRequests = mysqlTable(
  "community_verification_requests",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    // Its foreign key is named below: the generated name is longer than MySQL's 64 characters.
    memberId: id("member_id").notNull(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    // The ID proof's file in private storage: never public.
    idProofKey: varchar("id_proof_key", { length: 255 }).notNull(),
    portfolioLinks: jsonText<string[]>("portfolio_links").notNull(),
    // The apps from the linked Yallapp account when the form was sent (app ids and names).
    apps: jsonText<{ appId: string; name: string }[]>("apps").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<"pending" | "approved" | "rejected">(),
    reason: text("reason"),
    reviewedBy: id("reviewed_by"),
    reviewedAt: time("reviewed_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    foreignKey({ name: "community_verification_member_fk", columns: [t.memberId], foreignColumns: [communityMembers.id] }).onDelete("cascade"),
    index("community_verification_member").on(t.memberId),
    index("community_verification_status").on(t.tenantId, t.status, t.createdAt),
  ],
);

/** Every grant and revoke of a badge, and the admins' other decisions: who, when, why. */
export const communityAuditLog = mysqlTable(
  "community_audit_log",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    // An admin (a community member with role admin), or null for the rules themselves.
    actorId: id("actor_id"),
    action: varchar("action", { length: 40 }).notNull(),
    memberId: id("member_id"),
    targetType: varchar("target_type", { length: 24 }),
    targetId: id("target_id"),
    reason: text("reason"),
    details: jsonText<Record<string, unknown> | null>("details"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_audit_created").on(t.tenantId, t.createdAt), index("community_audit_member").on(t.memberId, t.createdAt)],
);

/** The community's settings an admin edits (the Blue badge's rules, who can create groups, the spam filter). */
export const communitySettings = mysqlTable(
  "community_settings",
  {
    tenantId: tenantColumn(),
    key: varchar("key", { length: 60 }).notNull(),
    value: jsonText<unknown>("value").notNull(),
    updatedBy: id("updated_by"),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.key] })],
);

/** Content waiting for a moderator: a new member's first posts, the spam filter's catches, reported content. */
export const communityModerationItems = mysqlTable(
  "community_moderation_items",
  {
    id: id("id").primaryKey(),
    tenantId: tenantColumn(),
    targetType: varchar("target_type", { length: 24 }).notNull().$type<CommunityTargetType>(),
    targetId: id("target_id").notNull(),
    authorId: id("author_id"),
    cause: varchar("cause", { length: 16 }).notNull().$type<"first_posts" | "spam_filter" | "reports">(),
    status: varchar("status", { length: 10 }).notNull().$type<"open" | "approved" | "removed">(),
    note: text("note"),
    handledBy: id("handled_by"),
    handledAt: time("handled_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_moderation_status").on(t.tenantId, t.status, t.createdAt), uniqueIndex("community_moderation_target").on(t.targetType, t.targetId, t.cause)],
);

/** A member's violations (content removed, a suspension): the Blue badge needs none in 90 days. */
export const communityViolations = mysqlTable(
  "community_violations",
  {
    id: id("id").primaryKey(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 24 }).notNull(),
    targetType: varchar("target_type", { length: 24 }),
    targetId: id("target_id"),
    createdBy: id("created_by"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_violations_member").on(t.memberId, t.createdAt)],
);

/** The in-app notifications list (email too, per the member's settings; push is phase 2). */
export const communityNotifications = mysqlTable(
  "community_notifications",
  {
    id: id("id").primaryKey(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 40 }).notNull(),
    actorId: id("actor_id"),
    targetType: varchar("target_type", { length: 24 }),
    targetId: id("target_id"),
    data: jsonText<Record<string, unknown> | null>("data"),
    readAt: time("read_at"),
    emailedAt: time("emailed_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_notifications_member").on(t.memberId, t.createdAt), index("community_notifications_unread").on(t.memberId, t.readAt)],
);

/** Each member's email choices: which kinds of notification also come by email. */
export const communityNotificationPrefs = mysqlTable("community_notification_prefs", {
  memberId: id("member_id")
    .primaryKey()
    .references(() => communityMembers.id, { onDelete: "cascade" }),
  email: jsonText<Record<string, boolean>>("email").notNull(),
  updatedAt: time("updated_at").notNull(),
});

// ---------------------------------------------------------------- Area A, phases 2–4 (migration 0160)
// Messages (232.4), groups (232.5), pros (234.1), jobs (234.2): lib/community/connect.

/** A one-to-one conversation, a small group chat, or the thread a hire request opened. */
export const communityConversations = mysqlTable(
  "community_conversations",
  {
    tenantId: tenantColumn(),
    id: id("id").primaryKey(),
    kind: varchar("kind", { length: 8 }).notNull().$type<"direct" | "group" | "hire">(),
    title: varchar("title", { length: 80 }),
    createdBy: id("created_by").notNull(),
    // A one-to-one conversation's pair ("a:b", sorted): one per pair.
    directKey: varchar("direct_key", { length: 80 }),
    hireRequestId: id("hire_request_id"),
    lastMessageAt: time("last_message_at").notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("community_conversations_direct").on(t.tenantId, t.directKey)],
);

export const communityConversationMembers = mysqlTable(
  "community_conversation_members",
  {
    // Its foreign key is named below: the generated name is longer than MySQL's 64 characters.
    conversationId: id("conversation_id").notNull(),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    joinedAt: time("joined_at").notNull(),
    leftAt: time("left_at"),
    hiddenAt: time("hidden_at"),
    lastReadMessageId: id("last_read_message_id"),
    lastReadAt: time("last_read_at"),
    muted: boolean("muted").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.memberId] }),
    foreignKey({ name: "community_conversation_members_conversation_fk", columns: [t.conversationId], foreignColumns: [communityConversations.id] }).onDelete("cascade"),
    index("community_conversation_members_member").on(t.memberId),
  ],
);

export const communityMessages = mysqlTable(
  "community_messages",
  {
    id: id("id").primaryKey(),
    conversationId: id("conversation_id")
      .notNull()
      .references(() => communityConversations.id, { onDelete: "cascade" }),
    authorId: id("author_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    photos: jsonText<string[]>("photos").notNull(),
    replyToId: id("reply_to_id"),
    deletedAt: time("deleted_at"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_messages_time").on(t.conversationId, t.createdAt, t.id)],
);

export const communityGroups = mysqlTable(
  "community_groups",
  {
    tenantId: tenantColumn(),
    id: id("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description").notNull(),
    visibility: varchar("visibility", { length: 8 }).notNull().$type<"public" | "private">(),
    coverUrl: varchar("cover_url", { length: 512 }),
    ownerId: id("owner_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 8 }).notNull().$type<"active" | "pending" | "removed">(),
    memberCount: int("member_count").notNull().default(1),
    postCount: int("post_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    lastActiveAt: time("last_active_at").notNull(),
  },
  (t) => [uniqueIndex("community_groups_slug").on(t.tenantId, t.slug), index("community_groups_active").on(t.tenantId, t.status, t.lastActiveAt)],
);

export const communityGroupMembers = mysqlTable(
  "community_group_members",
  {
    groupId: id("group_id")
      .notNull()
      .references(() => communityGroups.id, { onDelete: "cascade" }),
    memberId: id("member_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 10 }).notNull().$type<"owner" | "moderator" | "member">(),
    status: varchar("status", { length: 10 }).notNull().$type<"active" | "requested">(),
    joinedAt: time("joined_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.memberId] }), index("community_group_members_member").on(t.memberId, t.status)],
);

export const communityPros = mysqlTable(
  "community_pros",
  {
    tenantId: tenantColumn(),
    memberId: id("member_id")
      .primaryKey()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    headline: varchar("headline", { length: 120 }).notNull(),
    about: text("about").notNull(),
    services: jsonText<{ title: string; description: string; rate: string }[]>("services").notNull(),
    skills: jsonText<string[]>("skills").notNull(),
    availability: varchar("availability", { length: 12 }).notNull().$type<"available" | "busy" | "unavailable">(),
    showcaseIds: jsonText<string[]>("showcase_ids").notNull(),
    open: boolean("open").notNull().default(true),
    ratingSum: int("rating_sum").notNull().default(0),
    reviewCount: int("review_count").notNull().default(0),
    doneCount: int("done_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_pros_open").on(t.tenantId, t.open, t.updatedAt)],
);

export const communityHireRequests = mysqlTable(
  "community_hire_requests",
  {
    tenantId: tenantColumn(),
    id: id("id").primaryKey(),
    clientId: id("client_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    proId: id("pro_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    service: varchar("service", { length: 120 }),
    message: text("message").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<"pending" | "accepted" | "declined" | "done" | "cancelled">(),
    conversationId: id("conversation_id").notNull(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_hire_requests_client").on(t.clientId, t.createdAt), index("community_hire_requests_pro").on(t.proId, t.createdAt)],
);

export const communityProReviews = mysqlTable(
  "community_pro_reviews",
  {
    requestId: id("request_id")
      .primaryKey()
      .references(() => communityHireRequests.id, { onDelete: "cascade" }),
    proId: id("pro_id").notNull(),
    authorId: id("author_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    rating: int("rating").notNull(),
    text: text("text").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<"published" | "hidden">(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_pro_reviews_pro").on(t.proId, t.status, t.createdAt)],
);

export const communityJobs = mysqlTable(
  "community_jobs",
  {
    tenantId: tenantColumn(),
    id: id("id").primaryKey(),
    posterId: id("poster_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    type: varchar("type", { length: 12 }).notNull().$type<"full_time" | "part_time" | "contract" | "freelance" | "internship">(),
    remote: boolean("remote").notNull().default(true),
    location: varchar("location", { length: 120 }).notNull().default(""),
    skills: jsonText<string[]>("skills").notNull(),
    budget: varchar("budget", { length: 80 }).notNull().default(""),
    status: varchar("status", { length: 8 }).notNull().$type<"pending" | "open" | "closed" | "removed">(),
    applicationCount: int("application_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_jobs_open").on(t.tenantId, t.status, t.createdAt), index("community_jobs_poster").on(t.posterId)],
);

export const communityJobApplications = mysqlTable(
  "community_job_applications",
  {
    id: id("id").primaryKey(),
    jobId: id("job_id")
      .notNull()
      .references(() => communityJobs.id, { onDelete: "cascade" }),
    applicantId: id("applicant_id")
      .notNull()
      .references(() => communityMembers.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    links: jsonText<string[]>("links").notNull(),
    status: varchar("status", { length: 12 }).notNull().$type<"sent" | "shortlisted" | "declined" | "withdrawn">(),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [uniqueIndex("community_job_applications_once").on(t.jobId, t.applicantId), index("community_job_applications_applicant").on(t.applicantId, t.createdAt)],
);
