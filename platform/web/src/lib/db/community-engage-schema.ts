import { customType, datetime, foreignKey, index, int, mysqlTable, primaryKey, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { communityMembers } from "./community-schema";

/**
 * 232–235 Yallapp Community, area C's tables for phases 2 to 5 (migration
 * 0179): push devices, the points ledger, challenges, events and live
 * sessions, and the academy's course orders. Every row carries its
 * community's tenant (`tenant_id`, "yallapp" for Yallapp Community itself;
 * a client app's community is its app id).
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
const tenant = () => varchar("tenant_id", { length: 64 }).notNull().default("yallapp");
const member = (name: string) => id(name).notNull().references(() => communityMembers.id, { onDelete: "cascade" });

/** 232 A member's phone for push (Firebase Cloud Messaging through Yallapp's keyless sender). */
export const communityPushDevices = mysqlTable(
  "community_push_devices",
  {
    token: varchar("token", { length: 255 }).primaryKey(),
    tenantId: tenant(),
    memberId: member("member_id"),
    platform: varchar("platform", { length: 8 }).notNull().$type<"android" | "ios">(),
    createdAt: time("created_at").notNull(),
    lastSeenAt: time("last_seen_at").notNull(),
  },
  (t) => [index("community_push_devices_member").on(t.memberId)],
);

/** 233 Every point a member earned or lost, once per thing done (member, reason, ref). */
export const communityPoints = mysqlTable(
  "community_points",
  {
    id: id("id").primaryKey(),
    tenantId: tenant(),
    memberId: member("member_id"),
    reason: varchar("reason", { length: 40 }).notNull(),
    points: int("points").notNull(),
    ref: varchar("ref", { length: 120 }).notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("community_points_once").on(t.memberId, t.reason, t.ref),
    index("community_points_board").on(t.tenantId, t.createdAt),
    index("community_points_day").on(t.memberId, t.reason, t.createdAt),
  ],
);

/** 233 A challenge the admins post: dates, rules and what the winners get. */
export const communityChallenges = mysqlTable(
  "community_challenges",
  {
    id: id("id").primaryKey(),
    tenantId: tenant(),
    title: varchar("title", { length: 140 }).notNull(),
    body: text("body").notNull(),
    prizes: text("prizes").notNull(),
    coverUrl: varchar("cover_url", { length: 512 }),
    startsAt: time("starts_at").notNull(),
    submitUntil: time("submit_until").notNull(),
    voteUntil: time("vote_until").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<"published" | "cancelled">(),
    winnersAt: time("winners_at"),
    createdBy: id("created_by"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_challenges_time").on(t.tenantId, t.status, t.startsAt)],
);

/** 233 A member's entry: one of their showcase items or a link; one per member and challenge. */
export const communityChallengeSubmissions = mysqlTable(
  "community_challenge_submissions",
  {
    id: id("id").primaryKey(),
    challengeId: id("challenge_id").notNull(),
    memberId: id("member_id").notNull(),
    showcaseId: id("showcase_id"),
    url: varchar("url", { length: 500 }),
    title: varchar("title", { length: 140 }).notNull(),
    note: text("note").notNull(),
    votes: int("votes").notNull().default(0),
    place: int("place"),
    reward: jsonText<{ points: number; badge: "gold" | "green" | "blue" | null } | null>("reward"),
    status: varchar("status", { length: 10 }).notNull().$type<"published" | "pending" | "hidden">(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("community_challenge_entry").on(t.challengeId, t.memberId),
    index("community_challenge_entries").on(t.challengeId, t.status, t.votes),
    // Named: MariaDB's names stop at 64 characters.
    foreignKey({ name: "community_challenge_entry_challenge_fk", columns: [t.challengeId], foreignColumns: [communityChallenges.id] }).onDelete("cascade"),
    foreignKey({ name: "community_challenge_entry_member_fk", columns: [t.memberId], foreignColumns: [communityMembers.id] }).onDelete("cascade"),
  ],
);

export const communityChallengeVotes = mysqlTable(
  "community_challenge_votes",
  {
    submissionId: id("submission_id").notNull(),
    memberId: id("member_id").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.submissionId, t.memberId], name: "community_challenge_votes_pk" }),
    foreignKey({ name: "community_challenge_vote_entry_fk", columns: [t.submissionId], foreignColumns: [communityChallengeSubmissions.id] }).onDelete("cascade"),
    foreignKey({ name: "community_challenge_vote_member_fk", columns: [t.memberId], foreignColumns: [communityMembers.id] }).onDelete("cascade"),
  ],
);

/** 234 An event, online or in person, or a live session (an embed URL: no streaming server of our own). Free only. */
export const communityEvents = mysqlTable(
  "community_events",
  {
    id: id("id").primaryKey(),
    tenantId: tenant(),
    groupId: id("group_id"),
    kind: varchar("kind", { length: 10 }).notNull().$type<"online" | "in_person" | "live">(),
    title: varchar("title", { length: 140 }).notNull(),
    body: text("body").notNull(),
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    timeZone: varchar("time_zone", { length: 64 }).notNull(),
    location: varchar("location", { length: 300 }),
    joinUrl: varchar("join_url", { length: 500 }),
    embedUrl: varchar("embed_url", { length: 500 }),
    replayUrl: varchar("replay_url", { length: 500 }),
    coverUrl: varchar("cover_url", { length: 512 }),
    status: varchar("status", { length: 10 }).notNull().$type<"scheduled" | "cancelled">(),
    rsvpCount: int("rsvp_count").notNull().default(0),
    remindedDayAt: time("reminded_day_at"),
    remindedHourAt: time("reminded_hour_at"),
    createdBy: id("created_by"),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_events_time").on(t.tenantId, t.status, t.startsAt), index("community_events_group").on(t.groupId, t.startsAt)],
);

export const communityEventRsvps = mysqlTable(
  "community_event_rsvps",
  {
    eventId: id("event_id")
      .notNull()
      .references(() => communityEvents.id, { onDelete: "cascade" }),
    memberId: member("member_id"),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.memberId], name: "community_event_rsvps_pk" }), index("community_event_rsvps_member").on(t.memberId)],
);

/** 234 Comments during a live session (and on any event), read by polling. */
export const communityEventComments = mysqlTable(
  "community_event_comments",
  {
    id: id("id").primaryKey(),
    eventId: id("event_id")
      .notNull()
      .references(() => communityEvents.id, { onDelete: "cascade" }),
    memberId: member("member_id"),
    body: text("body").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<"published" | "pending" | "hidden">(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_event_comments_event").on(t.eventId, t.createdAt)],
);

/** 233 A course bought on the website, through Yallapp's own website checkout. Access itself is area B's record. */
export const communityCourseOrders = mysqlTable(
  "community_course_orders",
  {
    id: id("id").primaryKey(),
    tenantId: tenant(),
    memberId: member("member_id"),
    courseId: id("course_id").notNull(),
    amountCents: int("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    provider: varchar("provider", { length: 16 }).notNull(),
    providerRef: varchar("provider_ref", { length: 191 }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<"pending" | "paid" | "failed">(),
    createdAt: time("created_at").notNull(),
    paidAt: time("paid_at"),
  },
  (t) => [uniqueIndex("community_course_orders_token").on(t.tokenHash), index("community_course_orders_member").on(t.memberId, t.courseId, t.status)],
);
