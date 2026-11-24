/**
 * 231 Yallapp Community: Q&A and official tutorials (area B).
 *
 * The shapes the site (src/app/community), the app (community/) and the
 * API (/api/community/v1) share. Members come from the community's own
 * accounts (area A); a member is shown everywhere as a `MemberRef`.
 */

export type CommunityLang = "en" | "ar" | "tr";
export const COMMUNITY_LANGS: readonly CommunityLang[] = ["en", "ar", "tr"];

/** A member as shown beside what they wrote: name, avatar, their highest badge, and whether they speak for Yallapp. */
export interface MemberRef {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  /** The highest badge only (Gold, then Green, then Blue); null without one. */
  badge: "gold" | "green" | "blue" | null;
  /** A member of the Yallapp team: their answers are official ("Yallapp Team"). */
  staff: boolean;
  /** Their standing in points ("Expert" in the mockup), from `rankOf`. */
  rank: MemberRank;
}

export type MemberRank = "newcomer" | "member" | "contributor" | "expert" | "pro";

/** Where a post is: shown, waiting for a moderator (a new member's first posts, a flagged link), hidden or removed by one. */
export type ContentStatus = "published" | "pending" | "hidden" | "removed";

export interface Section {
  slug: string;
  name: string;
  icon: string;
  sort: number;
  questionCount: number;
  /** Whether the viewer follows it ("My sections"); false without a viewer. */
  followed: boolean;
}

export interface Tag {
  slug: string;
  name: string;
  questionCount: number;
}

export interface SectionRef {
  slug: string;
  name: string;
}

export type QuestionTab = "for_you" | "latest" | "active" | "unanswered";
export const QUESTION_TABS: readonly QuestionTab[] = ["for_you", "latest", "active", "unanswered"];

export interface QuestionSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  section: SectionRef;
  tags: Tag[];
  author: MemberRef;
  status: ContentStatus;
  createdAt: string;
  lastActivityAt: string;
  views: number;
  answerCount: number;
  hasAccepted: boolean;
  /** Ups minus downs. */
  score: number;
  bookmarked: boolean;
}

export interface Reply {
  id: string;
  body: string;
  author: MemberRef;
  status: ContentStatus;
  createdAt: string;
}

export interface Answer {
  id: string;
  questionId: string;
  body: string;
  author: MemberRef;
  status: ContentStatus;
  /** Written by the Yallapp team: shown with the "Yallapp Team · Official" badge. */
  official: boolean;
  accepted: boolean;
  score: number;
  /** The viewer's vote: 1, -1 or 0. */
  myVote: VoteValue;
  replyCount: number;
  replies: Reply[];
  createdAt: string;
}

export interface QuestionDetail extends QuestionSummary {
  body: string;
  myVote: VoteValue;
  /** The asker is the viewer: they may accept an answer. */
  mine: boolean;
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
  section: SectionRef;
  level: TutorialLevel;
  /** The language it is written or spoken in. */
  language: CommunityLang;
  /** A video's length; an article's reading time. */
  durationSec: number;
  coverUrl: string | null;
  author: MemberRef;
  /** Written by the Yallapp team (phase 1: all of them). */
  official: boolean;
  status: ContentStatus;
  createdAt: string;
  views: number;
  bookmarked: boolean;
}

export interface TutorialDetail extends TutorialSummary {
  /** An article's text (Markdown); a video's notes. */
  body: string;
  videoUrl: string | null;
}

export interface Page<T> {
  items: T[];
  /** Pass it back as `cursor` for the next page; null at the end. */
  next: string | null;
}

/** What badges and profiles read of a member's Q&A (area C's Blue badge, A's "1,240 pts"). */
export interface MemberQaStats {
  points: number;
  questions: number;
  answers: number;
  acceptedAnswers: number;
  approvedTutorials: number;
  lastActiveAt: string | null;
}

/** Why a call was refused: the API's error code and its HTTP status. */
export class QaError extends Error {
  constructor(
    readonly code: "not_found" | "forbidden" | "invalid" | "signed_out" | "rate_limited" | "duplicate",
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
  get status(): number {
    return { not_found: 404, forbidden: 403, invalid: 422, signed_out: 401, rate_limited: 429, duplicate: 409 }[this.code];
  }
}
