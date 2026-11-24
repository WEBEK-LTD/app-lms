import "server-only";
import * as qa from "@/lib/community/qa";
import type {
  ActiveMember, AdminMember, AuditRow, BadgeKind, BadgeRow, FeedTab, GoldStatus, MemberRef, ModerationRow, Notice, Page, Profile, QuestionDetail, QuestionSummary, ReportRow, Result, Section,
  SettingsView, SiteStats, TutorialDetail, TutorialSummary, VerificationRow, Viewer,
} from "./data";
import type { CmLang } from "./words";

/**
 * 231 The seam between the website and the community modules: each function
 * here forwards to area A's (members, social), B's (questions, tutorials,
 * @/lib/community/qa) or C's (badges, moderation, notifications,
 * @/lib/community/trust) module. The pages call only these.
 */

/** What a write of the trust module answers: done, or why not (a code and, for forms, the fields' messages). */
export type SeamResult = Result | { ok: false; code: string; errors?: Record<string, string> };

export class NotReady extends Error {
  constructor() {
    super("not_ready");
  }
}

/** The design's section colours, in the sections' order. */
const SECTION_COLORS = ["#FF5A1F", "#6B5BFF", "#18A56B", "#E5A019", "#E23F72", "#3FA9F5"];

export function sectionColor(s: { sort: number }): string {
  return SECTION_COLORS[Math.abs(s.sort) % SECTION_COLORS.length] ?? "#FF5A1F";
}

/** A read that finds nothing (a removed question, an unknown address) is null, not an error. */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof qa.QaError && (e.code === "not_found" || e.code === "forbidden")) return null;
    throw e;
  }
}

export async function communityViewer(_lang: CmLang): Promise<Viewer | null> {
  return null;
}

export async function siteStats(): Promise<SiteStats> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const q = await qa.qaStats({ since });
  return { members: 0, answeredRate: q.answeredRate, apps: 0, newQuestions: q.newCount };
}

export async function sections(lang: CmLang, viewerId: string | null): Promise<Section[]> {
  return qa.listSections(viewerId, lang);
}

export async function questions(q: { viewerId: string | null; lang: CmLang; tab: FeedTab; section?: string; tag?: string; cursor?: string; limit?: number }): Promise<Page<QuestionSummary>> {
  return qa.listQuestions(q);
}

export async function question(idOrSlug: string, o: { viewerId: string | null; lang: CmLang; countView?: boolean }): Promise<QuestionDetail | null> {
  return orNull(qa.getQuestion(idOrSlug, o));
}

export async function similar(q: { title: string; section?: string; limit?: number; viewerId: string | null; lang: CmLang }): Promise<QuestionSummary[]> {
  return qa.similarQuestions(q);
}

export async function tutorials(q: { viewerId: string | null; lang: CmLang; section?: string; level?: string; language?: string; kind?: string; cursor?: string; limit?: number }): Promise<Page<TutorialSummary>> {
  return qa.listTutorials({
    ...q,
    level: qa.TUTORIAL_LEVELS.find((l) => l === q.level),
    language: q.language === "en" || q.language === "ar" || q.language === "tr" ? q.language : undefined,
    kind: q.kind === "article" || q.kind === "video" ? q.kind : undefined,
  });
}

export async function tutorial(slug: string, o: { viewerId: string | null; lang: CmLang; countView?: boolean }): Promise<TutorialDetail | null> {
  return orNull(qa.getTutorial(slug, o));
}

export async function search(q: { q: string; viewerId: string | null; lang: CmLang; limit?: number }): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[]; members: MemberRef[] }> {
  const found = await qa.search(q);
  return { questions: found.questions, tutorials: found.tutorials, members: [] };
}

export async function waiting(q: { viewerId: string | null; lang: CmLang; limit: number }): Promise<{ items: QuestionSummary[]; total: number; inMySections: number }> {
  return qa.waitingForAnswer(q);
}

export async function activeMembers(q: { limit: number }): Promise<ActiveMember[]> {
  return qa.activeMembers({ days: 7, limit: q.limit });
}

export async function profile(_handle: string, _o: { viewerId: string | null; lang: CmLang }): Promise<Profile | null> {
  return null;
}

export async function memberList(_handle: string, _list: "followers" | "following" | "friends", _o: { viewerId: string | null; cursor?: string }): Promise<Page<MemberRef>> {
  return { items: [], next: null };
}

export async function notices(_viewerId: string, _o: { cursor?: string }): Promise<Page<Notice> & { unread: number }> {
  return { items: [], next: null, unread: 0 };
}

// ----- Writes. Each takes the signed-in member's id; the modules check what they may do. -----

export type AskResult = { slug: string; status: "published" | "pending" };

export async function askQuestion(viewerId: string, input: { section: string; tags: string[]; title: string; body: string; lang: CmLang }): Promise<AskResult> {
  const r = await qa.askQuestion(viewerId, input);
  return { slug: r.question.slug, status: r.status === "published" ? "published" : "pending" };
}

export async function answerQuestion(viewerId: string, questionId: string, input: { body: string; lang: CmLang }): Promise<{ status: "published" | "pending" }> {
  const a = await qa.answerQuestion(viewerId, questionId, input);
  return { status: a.status === "published" ? "published" : "pending" };
}

export async function replyToAnswer(viewerId: string, answerId: string, input: { body: string; lang: CmLang }): Promise<void> {
  await qa.replyToAnswer(viewerId, answerId, input);
}

export async function vote(viewerId: string, target: { kind: "question" | "answer"; id: string; value: -1 | 0 | 1 }): Promise<void> {
  await qa.vote(viewerId, target);
}

export async function acceptAnswer(viewerId: string, answerId: string, on: boolean): Promise<void> {
  await qa.acceptAnswer(viewerId, answerId, on);
}

export async function bookmark(viewerId: string, target: { kind: "question" | "tutorial"; id: string }, on: boolean): Promise<void> {
  await qa.bookmark(viewerId, { ...target, on });
}

export async function report(_viewerId: string, _target: { kind: "question" | "answer" | "reply" | "member" | "tutorial"; id: string; reason: string; note?: string }): Promise<void> {
  throw new NotReady();
}

export async function followSection(viewerId: string, slug: string, on: boolean): Promise<void> {
  await qa.followSection(viewerId, slug, on);
}

export async function saved(viewerId: string, lang: CmLang): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[] }> {
  return qa.saved(viewerId, lang);
}

export async function follow(_viewerId: string, _memberId: string, _on: boolean): Promise<void> {
  throw new NotReady();
}

/** Friends: ask, accept, decline, cancel a request or end the friendship. */
export async function friend(_viewerId: string, _memberId: string, _act: "request" | "accept" | "decline" | "cancel" | "remove"): Promise<void> {
  throw new NotReady();
}

export async function block(_viewerId: string, _memberId: string, _on: boolean): Promise<void> {
  throw new NotReady();
}

export type ProfileEdit = { name: string; handle: string; bio: string; skills: string[] };

export async function myProfile(_viewerId: string): Promise<(ProfileEdit & { avatarUrl: string | null }) | null> {
  return null;
}

export async function updateProfile(_viewerId: string, _edit: ProfileEdit): Promise<void> {
  throw new NotReady();
}

export async function setAvatar(_viewerId: string, _file: File | null): Promise<void> {
  throw new NotReady();
}

// ----- Trust (area C) -----

export async function goldStatus(_viewerId: string): Promise<GoldStatus> {
  return { canApply: false, blocked: "no_linked_account", apps: [], minApps: 5, request: null };
}

export async function uploadIdProof(_viewerId: string, _file: File): Promise<{ ok: true; fileId: string } | { ok: false; code: string }> {
  return { ok: false, code: "not_ready" };
}

export async function submitVerification(_viewerId: string, _input: { fullName: string; idProofFileId: string; portfolio: string[] }): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

export async function markNoticesRead(_viewerId: string, _ids: string[] | "all"): Promise<void> {}

export async function noticePrefs(_viewerId: string): Promise<{ email: boolean }> {
  return { email: true };
}

export async function setNoticePrefs(_viewerId: string, _prefs: { email: boolean }): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

export async function adminVerifications(_adminId: string, _q: { status: "pending" | "approved" | "rejected"; offset: number }): Promise<{ items: VerificationRow[]; total: number }> {
  return { items: [], total: 0 };
}

export async function decideVerification(_adminId: string, _id: string, _input: { decision: "approve" | "reject"; reason: string }): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

export async function adminFindMember(_adminId: string, _handle: string): Promise<(AdminMember & { badges: BadgeRow[] }) | null> {
  return null;
}

export async function grantBadge(_adminId: string, _memberId: string, _input: { badge: BadgeKind; reason: string; expiresAt: string | null }): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

export async function revokeBadge(_adminId: string, _badgeId: string, _input: { reason: string }): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

export async function adminAudit(_adminId: string, _q: { offset: number }): Promise<{ items: AuditRow[]; total: number }> {
  return { items: [], total: 0 };
}

export async function adminSettings(_adminId: string): Promise<SettingsView | null> {
  return null;
}

export async function updateSettings(_adminId: string, _partial: unknown): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

export async function adminModeration(_adminId: string, _q: { status: "pending" | "approved" | "rejected"; offset: number }): Promise<{ items: ModerationRow[]; total: number }> {
  return { items: [], total: 0 };
}

export async function decideModeration(_adminId: string, _id: string, _input: { decision: "approve" | "reject"; reason: string }): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

export async function adminReports(_adminId: string, _q: { status: "open" | "upheld" | "dismissed"; offset: number }): Promise<{ items: ReportRow[]; total: number }> {
  return { items: [], total: 0 };
}

export async function resolveReport(_adminId: string, _id: string, _input: { decision: "uphold" | "dismiss"; note: string; hide: boolean }): Promise<Result> {
  return { ok: false, code: "not_ready" };
}

// ----- Linking a Yallapp account (area A): confirmed signed in on yallapp.com.tr -----

export async function linkedAccount(_viewerId: string): Promise<{ linked: boolean; since: string | null; apps: number }> {
  return { linked: false, since: null, apps: 0 };
}

/** Where to send the member to confirm the link (yallapp.com.tr, signed in there), or null when linking isn't available. */
export async function startLink(_viewerId: string, _back: string): Promise<string | null> {
  return null;
}

export async function unlink(_viewerId: string): Promise<Result> {
  return { ok: false, code: "not_ready" };
}
