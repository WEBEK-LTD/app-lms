/**
 * 231 Yallapp Community: Q&A and official tutorials (area B).
 *
 * The shapes of docs/api/community.yaml's Q&A, tutorials and search, in
 * camelCase here and snake_case over the wire. Members come from the
 * community's own accounts (area A): `MemberSummary`, with their Q&A rank.
 */

export type CommunityLang = "en" | "ar" | "tr";
export const COMMUNITY_LANGS: readonly CommunityLang[] = ["en", "ar", "tr"];

export type BadgeKind = "gold" | "green" | "blue";

/** A member wherever they appear (area A's MemberSummary), with their standing in points ("Expert"). */
export interface MemberSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline?: string;
  /** The one badge shown beside the name (Gold, then Green, then Blue); null without one. */
  topBadge: BadgeKind | null;
  /** Yallapp's team: their answers are official ("Yallapp Team"). */
  team: boolean;
  deleted: boolean;
  rank: MemberRank;
  /** The rank in the reader's language ("Expert"), from area A's views. */
  rankLabel?: string;
  /** Area A's level, its name and how far toward the next (0-1), where A gives them. */
  level?: MemberRank;
  levelLabel?: string;
  levelProgress?: number;
}

/** The community's levels (lib/community/levels.ts). */
export type MemberRank = import("../levels").CommunityLevel;

/**
 * Where a post is: shown; waiting for a moderator (a new member's first
 * posts, the spam filter); removed (by its author, or a moderator who
 * rejected or hid it).
 */
export type ContentStatus = "pending" | "published" | "removed";

export type SectionKind = "qa" | "tutorial";

export interface Section {
  slug: string;
  name: string;
  icon: string;
  /** Published questions (or tutorials) in it. */
  count: number;
  comingSoon: boolean;
  /** Whether the viewer follows it ("My sections"); false without a viewer. */
  followed: boolean;
}

export interface Tag {
  slug: string;
  name: string;
  count: number;
}

/** Questions by: all of them; without an answer; with an accepted one; with an official one; by members the viewer follows; the viewer's sections first ("For you"). */
export type QuestionFilterName = "all" | "unanswered" | "answered" | "official" | "following" | "for_you";
export const QUESTION_FILTERS: readonly QuestionFilterName[] = ["all", "unanswered", "answered", "official", "following", "for_you"];
export type QuestionSort = "active" | "newest" | "votes";
export const QUESTION_SORTS: readonly QuestionSort[] = ["active", "newest", "votes"];

export interface QuestionSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: MemberSummary;
  section: Section;
  tags: Tag[];
  language: CommunityLang;
  score: number;
  answerCount: number;
  viewCount: number;
  accepted: boolean;
  hasOfficialAnswer: boolean;
  status: ContentStatus;
  createdAt: string;
  lastActivityAt: string;
  bookmarked: boolean;
}

export interface Reply {
  id: string;
  answerId: string;
  body: string;
  author: MemberSummary;
  status: ContentStatus;
  createdAt: string;
  canEdit: boolean;
}

export interface Answer {
  id: string;
  questionId: string;
  body: string;
  author: MemberSummary;
  /** Written by Yallapp's team: the "Yallapp Team · Official" badge. */
  official: boolean;
  accepted: boolean;
  score: number;
  /** The viewer's vote: 1, -1 or 0. */
  myVote: VoteValue;
  status: ContentStatus;
  replyCount: number;
  /** The last few replies, oldest first (all of them with GET /qa/answers/{id}/replies). */
  replies: Reply[];
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Question extends QuestionSummary {
  body: string;
  myVote: VoteValue;
  canEdit: boolean;
  /** The viewer asked it: they may accept an answer. */
  canAccept: boolean;
  acceptedAnswerId: string | null;
  /** Accepted first, then official, then by score, then oldest. */
  answers: Answer[];
}

export type VoteValue = 1 | -1 | 0;
export type VoteKind = "question" | "answer";
export type BookmarkKind = "question" | "tutorial";

export type TutorialKind = "article" | "video";
export type TutorialLevel = "beginner" | "intermediate" | "advanced";
export const TUTORIAL_LEVELS: readonly TutorialLevel[] = ["beginner", "intermediate", "advanced"];

export interface TutorialSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: TutorialKind;
  level: TutorialLevel;
  /** The language it is written or spoken in. */
  language: CommunityLang;
  section: Section;
  coverUrl: string | null;
  /** A video's length in seconds ("08:24"); an article's reading time in seconds. */
  durationSeconds: number;
  /** Rounded up: "5 min read". */
  durationMinutes: number;
  official: boolean;
  tags: string[];
  author: MemberSummary;
  viewCount: number;
  bookmarked: boolean;
  publishedAt: string;
  /** 233 "pending" while a member's waits for review (only its author sees it then). */
  status: ContentStatus;
}

export interface Tutorial extends TutorialSummary {
  /** An article's text (Markdown); a video's notes. Every tutorial is free. */
  body: string;
  /** A video's address; null for an article. */
  videoUrl: string | null;
}

export interface Page<T> {
  items: T[];
  /** Pass it back as `cursor` for the next page; null at the end. */
  nextCursor: string | null;
}

/** What badges (area C) and profiles (area A) read of a member's Q&A. */
export interface MemberQaStats {
  points: number;
  questions: number;
  answers: number;
  acceptedAnswers: number;
  approvedTutorials: number;
  lastActiveAt: string | null;
}

/** The API's error codes (community.yaml ErrorBody) and their HTTP status. */
export type QaErrorCode = "not_found" | "not_allowed" | "invalid_request" | "invalid_token" | "too_many_attempts" | "conflict";

/** Why a call was refused: the API's error code, its HTTP status and the field at fault. */
export class QaError extends Error {
  constructor(
    readonly code: QaErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
  get status(): number {
    return { not_found: 404, not_allowed: 403, invalid_request: 400, invalid_token: 401, too_many_attempts: 429, conflict: 409 }[this.code];
  }
}
