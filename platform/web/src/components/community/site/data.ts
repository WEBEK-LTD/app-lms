import "server-only";
import type { CmLang } from "./words";

/**
 * 231 What the Community website reads and does, in one place: the pages
 * call only these, and these call the community modules (area A's members,
 * B's questions and tutorials, C's badges, moderation and notifications).
 * The shapes follow those modules' contracts (OpenAPI community v1).
 */

export type BadgeKind = "gold" | "green" | "blue";

export type MemberRef = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  /** The highest badge only (Gold, then Green, then Blue). */
  badge: BadgeKind | null;
  staff: boolean;
};

export type Viewer = MemberRef & {
  points: number;
  email: string | null;
  admin: boolean;
  lang: CmLang;
};

export type Section = { slug: string; name: string; icon: string; color: string; questionCount: number; followed?: boolean };

export type QuestionSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  section: { slug: string; name: string };
  tags: string[];
  author: MemberRef;
  createdAt: string;
  views: number;
  answerCount: number;
  hasAccepted: boolean;
  score: number;
  bookmarked: boolean;
};

export type Reply = { id: string; body: string; author: MemberRef; createdAt: string };

export type Answer = {
  id: string;
  body: string;
  author: MemberRef;
  official: boolean;
  accepted: boolean;
  score: number;
  myVote: -1 | 0 | 1;
  replyCount: number;
  replies: Reply[];
  createdAt: string;
};

export type QuestionDetail = QuestionSummary & { body: string; myVote: -1 | 0 | 1; answers: Answer[]; mine: boolean };

export type TutorialSummary = {
  id: string;
  slug: string;
  title: string;
  kind: "article" | "video";
  section: { slug: string; name: string };
  level: "beginner" | "intermediate" | "advanced";
  language: CmLang;
  durationSec: number | null;
  coverUrl: string | null;
  author: MemberRef;
  createdAt: string;
};

export type TutorialDetail = TutorialSummary & { body: string | null; videoUrl: string | null; bookmarked: boolean };

export type Page<T> = { items: T[]; next: string | null };

export type FeedTab = "for_you" | "latest" | "active" | "unanswered";

export type ActiveMember = { member: MemberRef; acceptedAnswers: number; points: number };

export type EarnedBadge = { kind: BadgeKind; since: string; detail: string | null; link: string | null };

export type LinkedApp = { id: string; name: string; iconUrl: string | null; url: string | null };

export type Profile = {
  member: MemberRef;
  bio: string;
  skills: string[];
  joinedAt: string;
  points: number;
  badges: EarnedBadge[];
  followers: number;
  following: number;
  friends: number;
  linkedApps: LinkedApp[];
  /** How the viewer stands with this member. */
  relation: { self: boolean; following: boolean; friend: "none" | "requested" | "incoming" | "friends"; blocked: boolean };
  questions: QuestionSummary[];
  answersCount: number;
};

export type Notice = { id: string; kind: string; text: string; link: string | null; createdAt: string; read: boolean };

export type SiteStats = { members: number; answeredRate: number; apps: number; newQuestions: number };
