import type { BookmarkKind, CommunityLang, ContentStatus, TutorialKind, TutorialLevel, VoteKind, VoteValue } from "./types";

/**
 * 231 The Q&A and tutorials' own storage (area B), apart from the
 * platform's DataStore so the community grows without touching it: kept in
 * memory for tests and the e2e server, in the database otherwise
 * (./sql.ts). Dates are Date; ids are strings (UUIDs).
 */

export interface SectionRecord {
  id: string;
  slug: string;
  names: Record<CommunityLang, string>;
  /** A Material Symbols Rounded name. */
  icon: string;
  sort: number;
}

export interface TagRecord {
  id: string;
  slug: string;
  name: string;
}

export interface QuestionRecord {
  id: string;
  slug: string;
  sectionId: string;
  tagIds: string[];
  title: string;
  body: string;
  authorId: string;
  status: ContentStatus;
  /** The language it is written in, as the asker's app was. */
  lang: CommunityLang;
  views: number;
  /** Published answers only. */
  answerCount: number;
  score: number;
  acceptedAnswerId: string | null;
  createdAt: Date;
  /** Asked, answered or replied to last. */
  lastActivityAt: Date;
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  body: string;
  authorId: string;
  status: ContentStatus;
  official: boolean;
  score: number;
  /** Published replies only. */
  replyCount: number;
  createdAt: Date;
}

export interface ReplyRecord {
  id: string;
  answerId: string;
  body: string;
  authorId: string;
  status: ContentStatus;
  createdAt: Date;
}

export interface TutorialRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: TutorialKind;
  sectionId: string;
  level: TutorialLevel;
  language: CommunityLang;
  body: string;
  videoUrl: string | null;
  durationSec: number;
  coverUrl: string | null;
  authorId: string;
  official: boolean;
  status: ContentStatus;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PointReason = "answer_accepted" | "answer_upvoted" | "answer_downvoted" | "question_upvoted" | "question_downvoted" | "tutorial_published" | "accepted_an_answer";

export interface PointEvent {
  id: string;
  memberId: string;
  reason: PointReason;
  points: number;
  /** What earned it (an answer's or question's id), so taking a vote back takes its points back. */
  ref: string;
  createdAt: Date;
}

export type QuestionOrder = "latest" | "active" | "score";

export interface QuestionFilter {
  statuses?: readonly ContentStatus[];
  /** A member's own questions also when not published yet. */
  orAuthorId?: string | null;
  sectionIds?: readonly string[];
  tagId?: string;
  authorId?: string;
  unanswered?: boolean;
  since?: Date;
  ids?: readonly string[];
  /** Every word in the title or body (lower case, already split). */
  words?: readonly string[];
  excludeAuthorIds?: readonly string[];
}

export interface QaStore {
  // Sections and tags
  listSections(): Promise<SectionRecord[]>;
  upsertSection(section: SectionRecord): Promise<void>;
  followedSectionIds(memberId: string): Promise<string[]>;
  setSectionFollow(memberId: string, sectionId: string, on: boolean, now: Date): Promise<void>;
  listTags(filter?: { ids?: readonly string[]; slugs?: readonly string[]; prefix?: string; limit?: number }): Promise<TagRecord[]>;
  /** The tag with this address, made when there is none. */
  ensureTag(slug: string, name: string): Promise<TagRecord>;
  /** Published questions by section id and by tag id. */
  countQuestionsBy(): Promise<{ sections: Record<string, number>; tags: Record<string, number> }>;

  // Questions
  createQuestion(q: QuestionRecord): Promise<QuestionRecord>;
  getQuestion(id: string): Promise<QuestionRecord | null>;
  getQuestionBySlug(slug: string): Promise<QuestionRecord | null>;
  updateQuestion(id: string, patch: Partial<Omit<QuestionRecord, "id">>): Promise<void>;
  listQuestions(filter: QuestionFilter, order: QuestionOrder, page: { offset: number; limit: number }): Promise<QuestionRecord[]>;
  countQuestions(filter: QuestionFilter): Promise<number>;
  addQuestionView(id: string): Promise<void>;

  // Answers and replies
  createAnswer(a: AnswerRecord): Promise<AnswerRecord>;
  getAnswer(id: string): Promise<AnswerRecord | null>;
  updateAnswer(id: string, patch: Partial<Omit<AnswerRecord, "id">>): Promise<void>;
  listAnswers(questionIds: readonly string[], filter?: { statuses?: readonly ContentStatus[]; orAuthorId?: string | null }): Promise<AnswerRecord[]>;
  countAnswers(filter: { authorId: string; statuses?: readonly ContentStatus[]; accepted?: boolean }): Promise<number>;
  createReply(r: ReplyRecord): Promise<ReplyRecord>;
  getReply(id: string): Promise<ReplyRecord | null>;
  updateReply(id: string, patch: Partial<Omit<ReplyRecord, "id">>): Promise<void>;
  listReplies(answerIds: readonly string[], filter?: { statuses?: readonly ContentStatus[]; orAuthorId?: string | null }): Promise<ReplyRecord[]>;

  // Votes and bookmarks
  getVote(memberId: string, kind: VoteKind, targetId: string): Promise<VoteValue>;
  /** Sets the member's vote (0 takes it back); the previous one. */
  setVote(memberId: string, kind: VoteKind, targetId: string, value: VoteValue, now: Date): Promise<VoteValue>;
  votesOf(memberId: string, kind: VoteKind, targetIds: readonly string[]): Promise<Record<string, VoteValue>>;
  setBookmark(memberId: string, kind: BookmarkKind, targetId: string, on: boolean, now: Date): Promise<void>;
  bookmarksOf(memberId: string, kind: BookmarkKind, targetIds?: readonly string[]): Promise<string[]>;

  // Tutorials
  createTutorial(t: TutorialRecord): Promise<TutorialRecord>;
  getTutorial(id: string): Promise<TutorialRecord | null>;
  getTutorialBySlug(slug: string): Promise<TutorialRecord | null>;
  updateTutorial(id: string, patch: Partial<Omit<TutorialRecord, "id">>): Promise<void>;
  listTutorials(
    filter: { statuses?: readonly ContentStatus[]; sectionId?: string; level?: TutorialLevel; language?: CommunityLang; kind?: TutorialKind; authorId?: string; words?: readonly string[] },
    page: { offset: number; limit: number },
  ): Promise<TutorialRecord[]>;
  addTutorialView(id: string): Promise<void>;

  // Points
  addPoints(e: PointEvent): Promise<void>;
  /** Takes back the points this reason gave for this ref (a vote taken back). */
  removePoints(memberId: string, reason: PointReason, ref: string): Promise<void>;
  pointsOf(memberIds: readonly string[]): Promise<Record<string, number>>;
  /** Points earned since a date, the most first. */
  topEarners(since: Date, limit: number): Promise<{ memberId: string; points: number }[]>;
  lastActivityOf(memberId: string): Promise<Date | null>;
}
