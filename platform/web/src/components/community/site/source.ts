import "server-only";
import * as qa from "@/lib/community/qa";
import { clearCommunityCookies, currentCommunityMember, setCommunityCookies } from "@/lib/community/session";
import { communityApi } from "@/lib/community/site-client";
import type {
  ActiveMember, Answer, AdminMember, AuditRow, BadgeKind, BadgeRow, FeedTab, GoldStatus, MemberRef, ModerationRow, Notice, Page, Profile, QuestionDetail, QuestionSummary, ReportRow, Result, Section,
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
    if (e instanceof qa.QaError && (e.code === "not_found" || e.code === "not_allowed")) return null;
    throw e;
  }
}

// ----- From the Q&A module's shapes to the website's -----

export function memberOf(m: qa.MemberSummary): MemberRef {
  return { id: m.id, name: m.displayName, handle: m.deleted ? null : m.username, avatarUrl: m.avatarUrl, badge: m.topBadge, staff: m.team, rank: m.rank };
}

const sectionRef = (s: { slug: string; name: string }) => ({ slug: s.slug, name: s.name });

function questionOf(q: qa.QuestionSummary): QuestionSummary {
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    excerpt: q.excerpt,
    section: sectionRef(q.section),
    tags: q.tags.map((t) => ({ slug: t.slug, name: t.name })),
    author: memberOf(q.author),
    createdAt: q.createdAt,
    views: q.viewCount,
    answerCount: q.answerCount,
    hasAccepted: q.accepted,
    score: q.score,
    bookmarked: q.bookmarked,
    status: q.status,
  };
}

function answerOf(a: qa.Answer): Answer {
  return {
    id: a.id,
    body: a.body,
    author: memberOf(a.author),
    official: a.official,
    accepted: a.accepted,
    score: a.score,
    myVote: a.myVote,
    replyCount: a.replyCount,
    replies: a.replies.map((r) => ({ id: r.id, body: r.body, author: memberOf(r.author), createdAt: r.createdAt })),
    createdAt: a.createdAt,
    status: a.status,
  };
}

function tutorialOf(t: qa.TutorialSummary): TutorialSummary {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    kind: t.kind,
    section: sectionRef(t.section),
    level: t.level,
    language: t.language,
    durationSec: t.durationSeconds,
    coverUrl: t.coverUrl,
    author: memberOf(t.author),
    createdAt: t.publishedAt,
    bookmarked: t.bookmarked,
  };
}

const pageOf = <A, B>(p: qa.Page<A>, f: (a: A) => B): Page<B> => ({ items: p.items.map(f), next: p.nextCursor });

/** The feed's tabs as the Q&A's filters and orders. */
const TAB: Record<FeedTab, { filter?: qa.QuestionFilterName; sort?: qa.QuestionSort }> = {
  for_you: { filter: "for_you" },
  latest: { sort: "newest" },
  active: { sort: "active" },
  unanswered: { filter: "unanswered", sort: "newest" },
};


export async function siteStats(): Promise<SiteStats> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const q = await qa.qaStats({ since });
  return { members: 0, answeredRate: q.answeredRate, apps: 0, newQuestions: q.newCount };
}

export async function sections(lang: CmLang, viewerId: string | null): Promise<Section[]> {
  const list = await qa.listSections({ kind: "qa", viewerId, lang });
  return list.map((s, i) => ({ slug: s.slug, name: s.name, icon: s.icon, sort: i, questionCount: s.count, followed: s.followed }));
}

export async function questions(q: { viewerId: string | null; lang: CmLang; tab: FeedTab; section?: string; tag?: string; author?: string; cursor?: string; limit?: number }): Promise<Page<QuestionSummary>> {
  const { tab, ...rest } = q;
  return pageOf(await qa.listQuestions({ ...rest, ...TAB[tab] }), questionOf);
}

export async function question(idOrSlug: string, o: { viewerId: string | null; lang: CmLang; countView?: boolean }): Promise<QuestionDetail | null> {
  const q = await orNull(qa.getQuestion(idOrSlug, o));
  if (!q) return null;
  return { ...questionOf(q), body: q.body, myVote: q.myVote, mine: q.canAccept, answers: q.answers.map(answerOf) };
}

export async function similar(q: { title: string; section?: string; limit?: number; viewerId: string | null; lang: CmLang }): Promise<QuestionSummary[]> {
  return (await qa.similarQuestions(q)).map(questionOf);
}

export async function tutorials(q: { viewerId: string | null; lang: CmLang; section?: string; level?: string; language?: string; kind?: string; cursor?: string; limit?: number }): Promise<Page<TutorialSummary>> {
  const page = await qa.listTutorials({
    ...q,
    level: qa.TUTORIAL_LEVELS.find((l) => l === q.level),
    language: q.language === "en" || q.language === "ar" || q.language === "tr" ? q.language : undefined,
    kind: q.kind === "article" || q.kind === "video" ? q.kind : undefined,
  });
  return pageOf(page, tutorialOf);
}

export async function tutorial(slug: string, o: { viewerId: string | null; lang: CmLang; countView?: boolean }): Promise<TutorialDetail | null> {
  const t = await orNull(qa.getTutorial(slug, o));
  return t ? { ...tutorialOf(t), body: t.body, videoUrl: t.videoUrl } : null;
}

export async function search(q: { q: string; viewerId: string | null; lang: CmLang; limit?: number }): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[]; members: MemberRef[] }> {
  const found = await qa.search(q);
  return { questions: found.questions.map(questionOf), tutorials: found.tutorials.map(tutorialOf), members: found.members.map(memberOf) };
}

export async function waiting(q: { viewerId: string | null; lang: CmLang; limit: number }): Promise<{ items: QuestionSummary[]; total: number }> {
  const r = await qa.waitingForAnswer(q);
  return { items: r.items.map(questionOf), total: r.total };
}

export async function activeMembers(q: { limit: number }): Promise<ActiveMember[]> {
  return (await qa.activeMembers({ days: 7, limit: q.limit })).map((a) => ({ member: memberOf(a.member), points: a.points, acceptedAnswers: a.acceptedAnswers }));
}



export async function notices(_viewerId: string, _o: { cursor?: string }): Promise<Page<Notice> & { unread: number }> {
  return { items: [], next: null, unread: 0 };
}

// ----- Writes. Each takes the signed-in member's id; the modules check what they may do. -----

export type AskResult = { slug: string; status: "published" | "pending" };

export async function askQuestion(viewerId: string, input: { section: string; tags: string[]; title: string; body: string; lang: CmLang }): Promise<AskResult> {
  const q = await qa.askQuestion(viewerId, input);
  return { slug: q.slug, status: q.status === "published" ? "published" : "pending" };
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

export async function acceptAnswer(viewerId: string, answerId: string, on: boolean, lang: CmLang): Promise<void> {
  await qa.acceptAnswer(viewerId, answerId, on, lang);
}

export async function bookmark(viewerId: string, target: { kind: "question" | "tutorial"; id: string }, on: boolean): Promise<void> {
  await qa.bookmark(viewerId, { ...target, on });
}


export async function followSection(viewerId: string, slug: string, on: boolean): Promise<void> {
  await qa.followSection(viewerId, slug, on);
}

export async function saved(viewerId: string, lang: CmLang): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[] }> {
  const r = await qa.saved(viewerId, lang);
  return { questions: r.questions.map(questionOf), tutorials: r.tutorials.map(tutorialOf) };
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




// ----- Signing in (area A): the site keeps the session in httpOnly cookies -----







// ----- Members, the social graph, linking and signing in (area A), through the API in-process -----

type ApiError = { error?: { code?: string; message?: string; fields?: Record<string, string> } };
type ApiRelationship = { following: boolean; followed_by: boolean; friend: "none" | "requested" | "incoming" | "friends"; friend_request_id?: string | null; blocked: boolean };
type ApiMember = { id: string; username: string; display_name: string; avatar_url: string | null; top_badge: BadgeKind | null; team: boolean; deleted: boolean; relationship?: ApiRelationship };
type ApiBadge = { kind: BadgeKind; label: string; since: string; company_name?: string | null; app_url?: string | null };
type ApiProfile = ApiMember & {
  bio: string;
  skills: string[];
  badges: ApiBadge[];
  points: number;
  counts: { followers: number; following: number; friends: number; questions: number; answers: number; accepted_answers: number; apps: number };
  joined_at: string;
  yallapp_linked: boolean;
};
type ApiMe = ApiProfile & { email: string | null; role: "member" | "team" | "admin"; language: CmLang; unread_notifications: number; pending_friend_requests: number };
type ApiApp = { id: string; name: string; icon_url: string | null; app_store_url: string | null; play_store_url: string | null; from_template: boolean; paid_plan: boolean };

const errorCode = (body: unknown): string => (body as ApiError | null)?.error?.code ?? "error";
const errorFields = (body: unknown): Record<string, string> | undefined => (body as ApiError | null)?.error?.fields;

function apiMember(m: ApiMember): MemberRef {
  return { id: m.id, name: m.display_name, handle: m.deleted ? null : m.username, avatarUrl: m.avatar_url, badge: m.top_badge, staff: m.team, rank: null };
}

/** The signed-in member as the pages show them, with their unread notifications; null when signed out. */
export async function communityViewer(_lang: CmLang): Promise<Viewer | null> {
  if (!(await currentCommunityMember())) return null;
  const r = await communityApi<ApiMe>("GET", "/me");
  if (r.status !== 200) return null;
  const me = r.body;
  return { ...apiMember(me), handle: me.username, points: me.points, email: me.email, admin: me.role === "admin", lang: me.language, unread: me.unread_notifications };
}

export async function profile(handle: string, o: { viewerId: string | null; lang: CmLang }): Promise<Profile | null> {
  const r = await communityApi<ApiProfile>("GET", `/members/${encodeURIComponent(handle)}`);
  if (r.status !== 200) return null;
  const p = r.body;
  const [apps, asked] = await Promise.all([
    communityApi<{ items: ApiApp[] }>("GET", `/members/${encodeURIComponent(p.username)}/apps`),
    qa.listQuestions({ viewerId: o.viewerId, lang: o.lang, author: p.id, sort: "newest", limit: 6 }).catch(() => ({ items: [], nextCursor: null })),
  ]);
  const rel = p.relationship;
  return {
    member: { ...apiMember(p), handle: p.username },
    bio: p.bio,
    skills: p.skills,
    joinedAt: p.joined_at,
    points: p.points,
    badges: p.badges.map((b) => ({ kind: b.kind, since: b.since, detail: b.company_name ?? null, link: b.app_url ?? null })),
    followers: p.counts.followers,
    following: p.counts.following,
    friends: p.counts.friends,
    linkedApps: (apps.status === 200 ? apps.body.items : []).map((a) => ({ id: a.id, name: a.name, iconUrl: a.icon_url, url: a.app_store_url ?? a.play_store_url })),
    relation: {
      self: o.viewerId === p.id,
      following: rel?.following ?? false,
      friend: rel?.friend ?? "none",
      friendRequestId: rel?.friend_request_id ?? null,
      blocked: rel?.blocked ?? false,
    },
    questions: asked.items.map(questionOf),
    answersCount: p.counts.answers,
  };
}

export async function memberList(handle: string, list: "followers" | "following" | "friends", o: { viewerId: string | null; cursor?: string }): Promise<Page<MemberRef>> {
  const q = o.cursor ? `?cursor=${encodeURIComponent(o.cursor)}` : "";
  const r = await communityApi<{ items: ApiMember[]; next_cursor: string | null }>("GET", `/members/${encodeURIComponent(handle)}/${list}${q}`);
  return r.status === 200 ? { items: r.body.items.map(apiMember), next: r.body.next_cursor } : { items: [], next: null };
}

export async function follow(_viewerId: string, memberId: string, on: boolean): Promise<void> {
  await communityApi(on ? "PUT" : "DELETE", `/members/${encodeURIComponent(memberId)}/follow`);
}

/** Friends: ask (or accept theirs), accept, decline, cancel a request or end the friendship. */
export async function friend(_viewerId: string, memberId: string, act: "request" | "accept" | "decline" | "cancel" | "remove", requestId?: string): Promise<void> {
  if (act === "decline" && requestId) await communityApi("POST", `/me/friend-requests/${encodeURIComponent(requestId)}/decline`);
  else await communityApi(act === "request" || act === "accept" ? "PUT" : "DELETE", `/members/${encodeURIComponent(memberId)}/friend`);
}

export async function block(_viewerId: string, memberId: string, on: boolean): Promise<void> {
  await communityApi(on ? "PUT" : "DELETE", `/members/${encodeURIComponent(memberId)}/block`);
}

export type ProfileEdit = { name: string; handle: string; bio: string; skills: string[] };

export async function myProfile(_viewerId: string): Promise<(ProfileEdit & { avatarUrl: string | null }) | null> {
  const r = await communityApi<ApiMe>("GET", "/me");
  return r.status === 200 ? { name: r.body.display_name, handle: r.body.username, bio: r.body.bio, skills: r.body.skills, avatarUrl: r.body.avatar_url } : null;
}

export async function updateProfile(_viewerId: string, edit: ProfileEdit): Promise<SeamResult> {
  const r = await communityApi("PATCH", "/me", { body: { display_name: edit.name, username: edit.handle, bio: edit.bio, skills: edit.skills } });
  return r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body), errors: errorFields(r.body) };
}

export async function setAvatar(_viewerId: string, file: File | null): Promise<SeamResult> {
  let r;
  if (file) {
    const form = new FormData();
    form.set("file", file);
    r = await communityApi("PUT", "/me/avatar", { form });
  } else {
    r = await communityApi("DELETE", "/me/avatar");
  }
  return r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body) };
}

/** A report goes to the moderators' queue (area C). Replies are reported as comments. */
export async function report(_viewerId: string, target: { kind: "question" | "answer" | "reply" | "member" | "tutorial"; id: string; reason: string; note?: string }): Promise<SeamResult> {
  const r = await communityApi("POST", "/reports", { body: { target_type: target.kind === "reply" ? "comment" : target.kind, target_id: target.id, reason: target.reason, note: target.note } });
  return r.status === 201 || r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body) };
}

// ----- Linking a Yallapp account: confirmed signed in on yallapp.com.tr -----

export async function linkedAccount(_viewerId: string): Promise<{ linked: boolean; since: string | null; apps: number }> {
  const r = await communityApi<{ linked: boolean; linked_at: string | null; apps?: unknown[] }>("GET", "/me/yallapp-link");
  return r.status === 200 ? { linked: r.body.linked, since: r.body.linked_at, apps: r.body.apps?.length ?? 0 } : { linked: false, since: null, apps: 0 };
}

/** Where to send the member to confirm the link (yallapp.com.tr), or null when linking isn't available. */
export async function startLink(_viewerId: string): Promise<string | null> {
  const r = await communityApi<{ confirm_url: string }>("POST", "/me/yallapp-link/start", { body: { return_to: "web" } });
  return r.status === 200 && /^https:\/\//.test(r.body.confirm_url) ? r.body.confirm_url : null;
}

export async function unlink(_viewerId: string): Promise<SeamResult> {
  const r = await communityApi("DELETE", "/me/yallapp-link");
  return r.status === 204 || r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body) };
}

// ----- Signing in: the API makes the session; the site keeps it in httpOnly cookies -----

export type AuthResult = { ok: true; created: boolean } | { ok: false; code: string };

type ApiSession = { access_token: string; access_expires_at: string; refresh_token: string; refresh_expires_at: string; created: boolean };

const DEVICE = { platform: "web", name: "Website" } as const;

async function signedIn(r: { status: number; body: unknown }): Promise<AuthResult> {
  if (r.status !== 200 && r.status !== 201) return { ok: false, code: errorCode(r.body) };
  const session = r.body as ApiSession;
  await setCommunityCookies(session);
  return { ok: true, created: session.created };
}

/**
 * The website's Sign in with Apple Services ID and Google web client id
 * (public ids, from the environment: COMMUNITY_APPLE_WEB_SERVICE_ID and
 * COMMUNITY_GOOGLE_WEB_CLIENT_ID, each also in area A's audience lists);
 * null when not configured.
 */
export function authProviders(): { apple: { clientId: string; redirectUri: string } | null; google: { clientId: string } | null } {
  const apple = process.env.COMMUNITY_APPLE_WEB_SERVICE_ID?.trim();
  const google = process.env.COMMUNITY_GOOGLE_WEB_CLIENT_ID?.trim();
  const site = (process.env.COMMUNITY_SITE_URL?.trim() || "https://community.yallapp.com.tr").replace(/\/+$/, "");
  return { apple: apple ? { clientId: apple, redirectUri: `${site}/sign-in` } : null, google: google ? { clientId: google } : null };
}

export async function signUpEmail(input: { email: string; password: string; name: string; lang: CmLang }): Promise<AuthResult> {
  return signedIn(await communityApi("POST", "/auth/email/sign-up", { body: { email: input.email, password: input.password, display_name: input.name, language: input.lang, device: DEVICE } }));
}

export async function logInEmail(input: { email: string; password: string }): Promise<AuthResult> {
  return signedIn(await communityApi("POST", "/auth/email/log-in", { body: { email: input.email, password: input.password, device: DEVICE } }));
}

export async function continueWith(provider: "apple" | "google", input: { idToken: string; nonce?: string; name?: string; lang: CmLang }): Promise<AuthResult> {
  const body = provider === "apple" ? { id_token: input.idToken, nonce: input.nonce, display_name: input.name, language: input.lang, device: DEVICE } : { id_token: input.idToken, language: input.lang, device: DEVICE };
  return signedIn(await communityApi("POST", `/auth/${provider}`, { body }));
}

export async function requestPasswordReset(email: string): Promise<void> {
  await communityApi("POST", "/auth/password-reset", { body: { email } });
}

export async function confirmPasswordReset(token: string, password: string): Promise<SeamResult> {
  const r = await communityApi("POST", "/auth/password-reset/confirm", { body: { token, password } });
  return r.status === 204 || r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body), errors: errorFields(r.body) };
}

export async function verifyEmail(token: string): Promise<SeamResult> {
  const r = await communityApi("POST", "/auth/email/verify", { body: { token } });
  return r.status === 204 || r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body) };
}

export async function signOut(): Promise<void> {
  await communityApi("POST", "/auth/log-out").catch(() => undefined);
  await clearCommunityCookies();
}
