import { customType, datetime, index, int, mysqlTable, primaryKey, uniqueIndex, varchar, boolean, text } from "drizzle-orm/mysql-core";
import type { CommentTarget, LinkPreview, MediaKind, ReactionKind, ReactionTarget, SocialStatus } from "../community/social/store";
import type { AccessSource, CourseLevel, CourseStatus, LessonKind } from "../community/academy/store";
import { communityMembers } from "./community-schema";

/**
 * 232–233 Area B's tables for phases 2 and 3 (migrations 0169–0178), beside
 * phase 1's (community-schema.ts): posts, comments, likes and saves,
 * stories and who saw them, the showcase (0169); courses, lessons,
 * quizzes, enrolments, progress and certificates (0170). Every row is a
 * tenant's: "yallapp" for Yallapp Community, a client app's id for its own.
 */

const jsonText = <T>(name: string) =>
  customType<{ data: T; driverData: string }>({
    dataType: () => "longtext",
    toDriver: (value) => JSON.stringify(value),
    fromDriver: (value) => JSON.parse(value) as T,
  })(name);

const id = (name: string) => varchar(name, { length: 36 });
const time = (name: string) => datetime(name, { mode: "date", fsp: 3 });
const tenant = () => varchar("tenant_id", { length: 36 }).notNull().default("yallapp");
const member = (name: string) =>
  id(name)
    .notNull()
    .references(() => communityMembers.id, { onDelete: "cascade" });

// ---------------------------------------------------------------- 232 posts and stories

export const communityMedia = mysqlTable(
  "community_media",
  {
    id: id("id").primaryKey(),
    tenant: tenant(),
    ownerId: member("owner_id"),
    kind: varchar("kind", { length: 8 }).notNull().$type<MediaKind>(),
    url: varchar("url", { length: 512 }).notNull(),
    posterUrl: varchar("poster_url", { length: 512 }),
    contentType: varchar("content_type", { length: 40 }).notNull(),
    size: int("size").notNull(),
    usedBy: varchar("used_by", { length: 60 }),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_media_owner").on(t.ownerId, t.createdAt)],
);

export const communityPosts = mysqlTable(
  "community_posts",
  {
    id: id("id").primaryKey(),
    tenant: tenant(),
    authorId: member("author_id"),
    groupId: id("group_id"),
    body: text("body").notNull(),
    mediaIds: jsonText<string[]>("media_ids").notNull(),
    link: jsonText<LinkPreview | null>("link"),
    status: varchar("status", { length: 10 }).notNull().$type<SocialStatus>(),
    likeCount: int("like_count").notNull().default(0),
    commentCount: int("comment_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_posts_feed").on(t.tenant, t.status, t.createdAt), index("community_posts_author").on(t.authorId, t.createdAt), index("community_posts_group").on(t.groupId, t.createdAt)],
);

export const communityPostComments = mysqlTable(
  "community_post_comments",
  {
    id: id("id").primaryKey(),
    tenant: tenant(),
    targetType: varchar("target_type", { length: 10 }).notNull().$type<CommentTarget>(),
    targetId: id("target_id").notNull(),
    parentId: id("parent_id"),
    authorId: member("author_id"),
    body: text("body").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<SocialStatus>(),
    likeCount: int("like_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_post_comments_target").on(t.targetType, t.targetId, t.parentId, t.createdAt), index("community_post_comments_parent").on(t.parentId)],
);

/** Likes and saves: one row per member, kind and target, so a repeat counts once. */
export const communityReactions = mysqlTable(
  "community_reactions",
  {
    memberId: member("member_id"),
    kind: varchar("kind", { length: 6 }).notNull().$type<ReactionKind>(),
    targetType: varchar("target_type", { length: 10 }).notNull().$type<ReactionTarget>(),
    targetId: id("target_id").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.kind, t.targetType, t.targetId] }), index("community_reactions_saved").on(t.memberId, t.kind, t.targetType, t.createdAt)],
);

export const communityStories = mysqlTable(
  "community_stories",
  {
    id: id("id").primaryKey(),
    tenant: tenant(),
    authorId: member("author_id"),
    mediaId: id("media_id").notNull(),
    status: varchar("status", { length: 10 }).notNull().$type<SocialStatus>(),
    viewCount: int("view_count").notNull().default(0),
    expiresAt: time("expires_at").notNull(),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_stories_author").on(t.tenant, t.authorId, t.expiresAt)],
);

export const communityStoryViews = mysqlTable(
  "community_story_views",
  {
    storyId: id("story_id")
      .notNull()
      .references(() => communityStories.id, { onDelete: "cascade" }),
    viewerId: member("viewer_id"),
    viewedAt: time("viewed_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.viewerId] }), index("community_story_views_viewer").on(t.viewerId)],
);

export const communityShowcase = mysqlTable(
  "community_showcase",
  {
    id: id("id").primaryKey(),
    tenant: tenant(),
    authorId: member("author_id"),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    mediaIds: jsonText<string[]>("media_ids").notNull(),
    appType: varchar("app_type", { length: 30 }).notNull(),
    appStoreUrl: varchar("app_store_url", { length: 500 }),
    playStoreUrl: varchar("play_store_url", { length: 500 }),
    webUrl: varchar("web_url", { length: 500 }),
    yallappAppId: id("yallapp_app_id"),
    verified: boolean("verified").notNull().default(false),
    status: varchar("status", { length: 10 }).notNull().$type<SocialStatus>(),
    likeCount: int("like_count").notNull().default(0),
    commentCount: int("comment_count").notNull().default(0),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
  },
  (t) => [index("community_showcase_gallery").on(t.tenant, t.status, t.createdAt), index("community_showcase_author").on(t.authorId)],
);

// ---------------------------------------------------------------- 233 the Academy

export const communityCourses = mysqlTable(
  "community_courses",
  {
    id: id("id").primaryKey(),
    tenant: tenant(),
    slug: varchar("slug", { length: 140 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    summary: text("summary").notNull(),
    coverUrl: varchar("cover_url", { length: 512 }),
    level: varchar("level", { length: 14 }).notNull().$type<CourseLevel>(),
    language: varchar("language", { length: 2 }).notNull().$type<"en" | "ar" | "tr">(),
    status: varchar("status", { length: 10 }).notNull().$type<CourseStatus>(),
    free: boolean("free").notNull().default(false),
    // The website's checkout only (area C); never in the Community API.
    priceMinor: int("price_minor"),
    currency: varchar("currency", { length: 3 }),
    createdAt: time("created_at").notNull(),
    updatedAt: time("updated_at").notNull(),
    publishedAt: time("published_at"),
  },
  (t) => [uniqueIndex("community_courses_slug").on(t.tenant, t.slug), index("community_courses_list").on(t.tenant, t.status, t.createdAt)],
);

export const communityLessons = mysqlTable(
  "community_lessons",
  {
    id: id("id").primaryKey(),
    courseId: id("course_id")
      .notNull()
      .references(() => communityCourses.id, { onDelete: "cascade" }),
    position: int("position").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    kind: varchar("kind", { length: 8 }).notNull().$type<LessonKind>(),
    body: text("body").notNull(),
    videoUrl: varchar("video_url", { length: 512 }),
    durationSeconds: int("duration_seconds").notNull(),
    preview: boolean("preview").notNull().default(false),
    createdAt: time("created_at").notNull(),
  },
  (t) => [index("community_lessons_course").on(t.courseId, t.position)],
);

export const communityQuizQuestions = mysqlTable(
  "community_quiz_questions",
  {
    id: id("id").primaryKey(),
    lessonId: id("lesson_id")
      .notNull()
      .references(() => communityLessons.id, { onDelete: "cascade" }),
    position: int("position").notNull(),
    prompt: text("prompt").notNull(),
    options: jsonText<string[]>("options").notNull(),
    answer: int("answer").notNull(),
  },
  (t) => [index("community_quiz_questions_lesson").on(t.lessonId, t.position)],
);

export const communityCourseAccess = mysqlTable(
  "community_course_access",
  {
    tenant: tenant(),
    memberId: member("member_id"),
    courseId: id("course_id")
      .notNull()
      .references(() => communityCourses.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 8 }).notNull().$type<AccessSource>(),
    ref: varchar("ref", { length: 120 }),
    grantedAt: time("granted_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.courseId] })],
);

export const communityLessonProgress = mysqlTable(
  "community_lesson_progress",
  {
    memberId: member("member_id"),
    lessonId: id("lesson_id")
      .notNull()
      .references(() => communityLessons.id, { onDelete: "cascade" }),
    courseId: id("course_id").notNull(),
    completedAt: time("completed_at"),
    quizScore: int("quiz_score"),
    attempts: int("attempts").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.lessonId] }), index("community_lesson_progress_course").on(t.memberId, t.courseId)],
);

export const communityCertificates = mysqlTable(
  "community_certificates",
  {
    id: id("id").primaryKey(),
    tenant: tenant(),
    code: varchar("code", { length: 20 }).notNull(),
    memberId: member("member_id"),
    courseId: id("course_id")
      .notNull()
      .references(() => communityCourses.id, { onDelete: "cascade" }),
    memberName: varchar("member_name", { length: 120 }).notNull(),
    courseTitle: varchar("course_title", { length: 160 }).notNull(),
    issuedAt: time("issued_at").notNull(),
  },
  (t) => [uniqueIndex("community_certificates_code").on(t.code), uniqueIndex("community_certificates_member").on(t.memberId, t.courseId)],
);
