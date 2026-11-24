import "server-only";
import type { CmLang } from "./words";

/**
 * 231 What the Community website reads and does, in one place: the pages
 * call only these, and these call the community modules (area A's members,
 * B's questions and tutorials, C's badges, moderation and notifications).
 * The shapes follow those modules' contracts (OpenAPI community v1).
 */

export type BadgeKind = "gold" | "green" | "blue";

/** A member wherever they appear: their name, picture, highest badge, whether they are on the Yallapp team, and their standing. */
export type MemberRef = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  badge: BadgeKind | null;
  staff: boolean;
  rank: "newcomer" | "member" | "contributor" | "expert" | "pro" | null;
};

export type Section = { slug: string; name: string; icon: string; sort: number; questionCount: number; followed: boolean };

export type Tag = { slug: string; name: string };

export type QuestionSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  section: { slug: string; name: string };
  tags: Tag[];
  author: MemberRef;
  createdAt: string;
  views: number;
  answerCount: number;
  hasAccepted: boolean;
  score: number;
  bookmarked: boolean;
  status: "pending" | "published" | "removed";
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
  status: "pending" | "published" | "removed";
};

export type QuestionDetail = QuestionSummary & { body: string; myVote: -1 | 0 | 1; answers: Answer[]; mine: boolean };

export type TutorialSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: "article" | "video";
  section: { slug: string; name: string };
  level: "beginner" | "intermediate" | "advanced";
  language: CmLang;
  durationSec: number;
  coverUrl: string | null;
  author: MemberRef;
  createdAt: string;
  bookmarked: boolean;
};

export type TutorialDetail = TutorialSummary & { body: string; videoUrl: string | null };

export type Page<T> = { items: T[]; next: string | null };

export type Viewer = MemberRef & {
  handle: string;
  points: number;
  email: string | null;
  admin: boolean;
  lang: CmLang;
  unread: number;
};

export type FeedTab = "for_you" | "latest" | "active" | "unanswered";

export type ActiveMember = { member: MemberRef; acceptedAnswers: number; points: number };

export type EarnedBadge = { kind: BadgeKind; since: string; detail: string | null; link: string | null };

export type LinkedApp = { id: string; name: string; iconUrl: string | null; url: string | null };

export type Profile = {
  member: MemberRef & { handle: string };
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
  relation: { self: boolean; following: boolean; friend: "none" | "requested" | "incoming" | "friends"; friendRequestId: string | null; blocked: boolean };
  questions: QuestionSummary[];
  answersCount: number;
};

export type Notice = { id: string; kind: string; text: string; link: string | null; createdAt: string; read: boolean };

export type SiteStats = { members: number; answeredRate: number; apps: number; newQuestions: number };

// ----- Trust (area C): badges, verification, admin, moderation, reports -----

export type GoldApp = { id: string; name: string; url: string | null; template: boolean };

export type GoldStatus = {
  canApply: boolean;
  blocked: null | "no_linked_account" | "not_enough_apps" | "pending" | "already_gold";
  apps: GoldApp[];
  minApps: number;
  request: { status: "pending" | "approved" | "rejected"; createdAt: string; decidedAt: string | null; reason: string | null } | null;
};

export type AdminMember = { id: string; name: string; handle: string | null };

export type VerificationRow = {
  id: string;
  member: AdminMember;
  fullName: string;
  idProofUrl: string | null;
  portfolio: string[];
  apps: GoldApp[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reason: string | null;
};

export type BadgeRow = {
  id: string;
  badge: BadgeKind;
  source: string;
  reason: string | null;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
};

export type AuditRow = { id: string; actor: AdminMember | null; action: string; member: AdminMember | null; badge: BadgeKind | null; subject: string | null; reason: string | null; at: string };

export type ModerationRow = { id: string; kind: string; member: AdminMember; reasons: string[]; excerpt: string; title: string | null; link: string | null; status: string; createdAt: string };

export type ReportRow = { id: string; reporter: AdminMember; target: string; targetId: string; targetMember: AdminMember; reason: string; details: string | null; status: string; createdAt: string; link: string | null };

export type SettingsView = {
  blue: { minAccountDays: number; minPoints: number; minAcceptedAnswers: number; minApprovedTutorials: number; cleanDays: number; inactiveDays: number };
  groups: { creators: "everyone" | "badge_holders" | "chosen"; chosen: AdminMember[] };
  moderation: { reviewFirstPosts: number; maxLinks: number; blockedDomains: string[]; blockedWords: string[]; hideAfterReports: number };
};

export type Result = { ok: true } | { ok: false; code: string; errors?: Record<string, string> };
