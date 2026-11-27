import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { qaHooksFor } from "@/lib/community/api/qa-hooks";
import type { CommunityContext } from "@/lib/community/api/http";
import { communityDeps } from "@/lib/community/deps";
import { languageFromHeader } from "@/lib/community/i18n";
import { ipFromHeaders } from "@/lib/http";
import * as qa from "@/lib/community/qa";
import { clearCommunityCookies, currentCommunityMember, setCommunityCookies } from "@/lib/community/session";
import { communityApi } from "@/lib/community/site-client";
import type {
  ActiveMember, Answer, AuditRow, BadgeKind, BadgeRow, FeedTab, GoldStatus, MemberRef, ModerationRow, Notice, Page, Profile, QuestionDetail, QuestionSummary, ReportRow, Result, Section,
  SettingsView, SiteStats, TutorialDetail, TutorialSummary, VerificationRow, Viewer,
} from "./data";
import { cmHref, cmLinks } from "./links";
import type { CmLang } from "./words";

/**
 * 231 The seam between the website and the community modules: each function
 * here forwards to area A's (members, social), B's (questions, tutorials,
 * @/lib/community/qa) or C's (badges, moderation, notifications,
 * @/lib/community/trust) module. The pages call only these.
 */

/** What a write of the trust module answers: done, or why not (a code and, for forms, the fields' messages). */
export type SeamResult = Result | { ok: false; code: string; errors?: Record<string, string> };


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

/**
 * The Q&A module's calls on this request's store, with area A's members,
 * blocks and points and area C's moderation and notices (the hooks the API
 * gives it), as the signed-in member.
 */
const qaContext = cache(async (): Promise<CommunityContext> => {
  const [list, signed] = await Promise.all([headers(), currentCommunityMember()]);
  const deps = await communityDeps({ ip: ipFromHeaders(list) });
  return {
    deps,
    req: { method: "GET", path: [], query: new URLSearchParams(), body: undefined, form: null, token: signed?.accessToken ?? null, acceptLanguage: list.get("accept-language") },
    store: deps.store,
    now: deps.now,
    member: signed?.member ?? null,
    session: signed?.session ?? null,
    lang: signed?.member.language ?? languageFromHeader(list.get("accept-language")),
    params: {},
    query: new URLSearchParams(),
    json: () => ({}),
  };
});

async function inQa<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = await qaContext();
  return qa.withQa(ctx.store.qa, qaHooksFor(ctx), fn);
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
  const q = await inQa(() => qa.qaStats({ since }));
  return { members: 0, answeredRate: q.answeredRate, apps: 0, newQuestions: q.newCount };
}

export async function sections(lang: CmLang, viewerId: string | null): Promise<Section[]> {
  const list = await inQa(() => qa.listSections({ kind: "qa", viewerId, lang }));
  return list.map((s, i) => ({ slug: s.slug, name: s.name, icon: s.icon, sort: i, questionCount: s.count, followed: s.followed }));
}

export async function questions(q: { viewerId: string | null; lang: CmLang; tab: FeedTab; section?: string; tag?: string; author?: string; cursor?: string; limit?: number }): Promise<Page<QuestionSummary>> {
  const { tab, ...rest } = q;
  return pageOf(await inQa(() => qa.listQuestions({ ...rest, ...TAB[tab] })), questionOf);
}

export async function question(idOrSlug: string, o: { viewerId: string | null; lang: CmLang; countView?: boolean }): Promise<QuestionDetail | null> {
  const q = await orNull(inQa(() => qa.getQuestion(idOrSlug, o)));
  if (!q) return null;
  return { ...questionOf(q), body: q.body, myVote: q.myVote, mine: q.canAccept, answers: q.answers.map(answerOf) };
}

export async function similar(q: { title: string; section?: string; limit?: number; viewerId: string | null; lang: CmLang }): Promise<QuestionSummary[]> {
  return (await inQa(() => qa.similarQuestions(q))).map(questionOf);
}

export async function tutorials(q: { viewerId: string | null; lang: CmLang; section?: string; level?: string; language?: string; kind?: string; cursor?: string; limit?: number }): Promise<Page<TutorialSummary>> {
  const page = await inQa(() => qa.listTutorials({
    ...q,
    level: qa.TUTORIAL_LEVELS.find((l) => l === q.level),
    language: q.language === "en" || q.language === "ar" || q.language === "tr" ? q.language : undefined,
    kind: q.kind === "article" || q.kind === "video" ? q.kind : undefined,
  }));
  return pageOf(page, tutorialOf);
}

export async function tutorial(slug: string, o: { viewerId: string | null; lang: CmLang; countView?: boolean }): Promise<TutorialDetail | null> {
  const t = await orNull(inQa(() => qa.getTutorial(slug, o)));
  return t ? { ...tutorialOf(t), body: t.body, videoUrl: t.videoUrl } : null;
}

export async function search(q: { q: string; viewerId: string | null; lang: CmLang; limit?: number }): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[]; members: MemberRef[] }> {
  const found = await inQa(() => qa.search(q));
  return { questions: found.questions.map(questionOf), tutorials: found.tutorials.map(tutorialOf), members: found.members.map(memberOf) };
}

export async function waiting(q: { viewerId: string | null; lang: CmLang; limit: number }): Promise<{ items: QuestionSummary[]; total: number }> {
  const r = await inQa(() => qa.waitingForAnswer(q));
  return { items: r.items.map(questionOf), total: r.total };
}

export async function activeMembers(q: { limit: number }): Promise<ActiveMember[]> {
  return (await inQa(() => qa.activeMembers({ days: 7, limit: q.limit }))).map((a) => ({ member: memberOf(a.member), points: a.points, acceptedAnswers: a.acceptedAnswers }));
}




// ----- Writes. Each takes the signed-in member's id; the modules check what they may do. -----

export type AskResult = { slug: string; status: "published" | "pending" };

export async function askQuestion(viewerId: string, input: { section: string; tags: string[]; title: string; body: string; lang: CmLang }): Promise<AskResult> {
  const q = await inQa(() => qa.askQuestion(viewerId, input));
  return { slug: q.slug, status: q.status === "published" ? "published" : "pending" };
}

export async function answerQuestion(viewerId: string, questionId: string, input: { body: string; lang: CmLang }): Promise<{ status: "published" | "pending" }> {
  const a = await inQa(() => qa.answerQuestion(viewerId, questionId, input));
  return { status: a.status === "published" ? "published" : "pending" };
}

export async function replyToAnswer(viewerId: string, answerId: string, input: { body: string; lang: CmLang }): Promise<void> {
  await inQa(() => qa.replyToAnswer(viewerId, answerId, input));
}

export async function vote(viewerId: string, target: { kind: "question" | "answer"; id: string; value: -1 | 0 | 1 }): Promise<void> {
  await inQa(() => qa.vote(viewerId, target));
}

export async function acceptAnswer(viewerId: string, answerId: string, on: boolean, lang: CmLang): Promise<void> {
  await inQa(() => qa.acceptAnswer(viewerId, answerId, on, lang));
}

export async function bookmark(viewerId: string, target: { kind: "question" | "tutorial"; id: string }, on: boolean): Promise<void> {
  await inQa(() => qa.bookmark(viewerId, { ...target, on }));
}


export async function followSection(viewerId: string, slug: string, on: boolean): Promise<void> {
  await inQa(() => qa.followSection(viewerId, slug, on));
}

export async function saved(viewerId: string, lang: CmLang): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[] }> {
  const r = await inQa(() => qa.saved(viewerId, lang));
  return { questions: r.questions.map(questionOf), tutorials: r.tutorials.map(tutorialOf) };
}








// ----- Members, the social graph, linking and signing in (area A), through the API in-process -----

type ApiError = { error?: { code?: string; message?: string; fields?: Record<string, string> } };
type ApiRelationship = { following: boolean; followed_by: boolean; friend: "none" | "requested" | "incoming" | "friends"; friend_request_id?: string | null; blocked: boolean };
export type ApiMember = { id: string; username: string; display_name: string; avatar_url: string | null; top_badge: BadgeKind | null; team: boolean; deleted: boolean; relationship?: ApiRelationship };
type ApiBadge = { kind: BadgeKind; label: string; since: string; company_name?: string | null; app_url?: string | null };
type ApiProfile = ApiMember & {
  bio: string;
  skills: string[];
  badges: ApiBadge[];
  points: number;
  counts: { followers: number; following: number; friends: number; questions: number; answers: number; accepted_answers: number; apps: number };
  joined_at: string;
  yallapp_linked: boolean;
  links?: { label: string; url: string }[];
};
type ApiMe = ApiProfile & { email: string | null; community_role?: "admin" | "moderator" | null; language: CmLang; unread_notifications: number; pending_friend_requests: number; link_suggestion?: { available: boolean } };
type ApiApp = { id: string; name: string; icon_url: string | null; app_store_url: string | null; play_store_url: string | null; from_template: boolean; paid_plan: boolean };

/** A member in the API's paths: "@username", or their id. */
const memberPath = (handleOrId: string) => encodeURIComponent(/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(handleOrId) ? handleOrId : `@${handleOrId.replace(/^@/, "")}`);

const errorCode = (body: unknown): string => (body as ApiError | null)?.error?.code ?? "error";
const errorFields = (body: unknown): Record<string, string> | undefined => (body as ApiError | null)?.error?.fields;

export function apiMember(m: ApiMember): MemberRef {
  return { id: m.id, name: m.display_name, handle: m.deleted ? null : m.username, avatarUrl: m.avatar_url, badge: m.top_badge, staff: m.team, rank: null };
}

/** The signed-in member as the pages show them, with their unread notifications; null when signed out. */
export async function communityViewer(): Promise<Viewer | null> {
  if (!(await currentCommunityMember())) return null;
  const r = await communityApi<ApiMe>("GET", "/me");
  if (r.status !== 200) return null;
  const me = r.body;
  return { ...apiMember(me), handle: me.username, points: me.points, email: me.email, admin: me.community_role === "admin" || me.community_role === "moderator",
    role: me.community_role ?? null, lang: me.language, unread: me.unread_notifications, linkSuggestion: me.link_suggestion?.available === true };
}

export async function profile(handle: string, o: { viewerId: string | null; lang: CmLang }): Promise<Profile | null> {
  const r = await communityApi<ApiProfile>("GET", `/members/${memberPath(handle)}`);
  if (r.status !== 200) return null;
  const p = r.body;
  const [apps, asked] = await Promise.all([
    communityApi<{ items: ApiApp[] }>("GET", `/members/${memberPath(p.username)}/apps`),
    inQa(() => qa.listQuestions({ viewerId: o.viewerId, lang: o.lang, author: p.id, sort: "newest", limit: 6 })).catch(() => ({ items: [], nextCursor: null })),
  ]);
  const [answered, wrote] = await Promise.all([
    inQa(() => qa.listQuestions({ viewerId: o.viewerId, lang: o.lang, answeredBy: p.id, sort: "newest", limit: 6 })).catch(() => ({ items: [], nextCursor: null })),
    inQa(() => qa.listTutorials({ viewerId: o.viewerId, lang: o.lang, author: p.id, limit: 6 })).catch(() => ({ items: [], nextCursor: null })),
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
    linkedApps: (apps.status === 200 ? apps.body.items : []).map((a) => ({
      id: a.id, name: a.name, iconUrl: a.icon_url, url: a.app_store_url ?? a.play_store_url, green: a.paid_plan,
      platform: a.app_store_url && a.play_store_url ? "both" : a.app_store_url ? "ios" : a.play_store_url ? "android" : null,
    })),
    links: p.links ?? [],
    questionsCount: p.counts.questions,
    linked: p.yallapp_linked === true,
    relation: {
      self: o.viewerId === p.id,
      following: rel?.following ?? false,
      friend: rel?.friend ?? "none",
      friendRequestId: rel?.friend_request_id ?? null,
      blocked: rel?.blocked ?? false,
    },
    questions: asked.items.map(questionOf),
    answered: answered.items.map(questionOf),
    tutorials: wrote.items.map(tutorialOf),
    answersCount: p.counts.answers,
  };
}

export async function memberList(handle: string, list: "followers" | "following" | "friends", o: { viewerId: string | null; cursor?: string }): Promise<Page<MemberRef>> {
  const q = o.cursor ? `?cursor=${encodeURIComponent(o.cursor)}` : "";
  const r = await communityApi<{ items: ApiMember[]; next_cursor: string | null }>("GET", `/members/${memberPath(handle)}/${list}${q}`);
  return r.status === 200 ? { items: r.body.items.map(apiMember), next: r.body.next_cursor } : { items: [], next: null };
}

export async function follow(memberId: string, on: boolean): Promise<void> {
  await communityApi(on ? "PUT" : "DELETE", `/members/${encodeURIComponent(memberId)}/follow`);
}

/** Friends: ask (or accept theirs), accept, decline, cancel a request or end the friendship. */
export async function friend(memberId: string, act: "request" | "accept" | "decline" | "cancel" | "remove", requestId?: string): Promise<void> {
  if (act === "decline" && requestId) await communityApi("POST", `/me/friend-requests/${encodeURIComponent(requestId)}/decline`);
  else await communityApi(act === "request" || act === "accept" ? "PUT" : "DELETE", `/members/${encodeURIComponent(memberId)}/friend`);
}

export async function block(memberId: string, on: boolean): Promise<void> {
  await communityApi(on ? "PUT" : "DELETE", `/members/${encodeURIComponent(memberId)}/block`);
}

export type ProfileEdit = { name: string; handle: string; bio: string; skills: string[]; links: { label: string; url: string }[] };

export async function myProfile(): Promise<(ProfileEdit & { avatarUrl: string | null }) | null> {
  const r = await communityApi<ApiMe>("GET", "/me");
  return r.status === 200 ? { name: r.body.display_name, handle: r.body.username, bio: r.body.bio, skills: r.body.skills, links: r.body.links ?? [], avatarUrl: r.body.avatar_url } : null;
}

export async function updateProfile(edit: ProfileEdit): Promise<SeamResult> {
  const r = await communityApi("PATCH", "/me", { body: { display_name: edit.name, username: edit.handle, bio: edit.bio, skills: edit.skills, links: edit.links } });
  return r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body), errors: errorFields(r.body) };
}

export async function setAvatar(file: File | null): Promise<SeamResult> {
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

/** A report goes to the moderators' queue (area C). */
export async function report(target: { kind: "question" | "answer" | "reply" | "member" | "tutorial"; id: string; reason: string; note?: string }): Promise<SeamResult> {
  const r = await communityApi("POST", "/reports", { body: { target_type: target.kind, target_id: target.id, reason: target.reason, note: target.note } });
  return r.status === 201 || r.status === 200 ? { ok: true } : { ok: false, code: errorCode(r.body) };
}

// ----- Linking a Yallapp account: confirmed signed in on yallapp.com.tr -----

export type LinkedAccount = { linked: boolean; since: string | null; apps: number; name: string | null; email: string | null };

export async function linkedAccount(): Promise<LinkedAccount> {
  const r = await communityApi<{ linked: boolean; linked_at: string | null; account_name?: string | null; account_email?: string | null; apps?: unknown[] }>("GET", "/me/yallapp-link");
  return r.status === 200
    ? { linked: r.body.linked, since: r.body.linked_at, apps: r.body.apps?.length ?? 0, name: r.body.account_name ?? null, email: r.body.account_email ?? null }
    : { linked: false, since: null, apps: 0, name: null, email: null };
}

/** Where to send the member to confirm the link (yallapp.com.tr), or null when linking isn't available. */
export async function startLink(): Promise<string | null> {
  const r = await communityApi<{ confirm_url: string }>("POST", "/me/yallapp-link/start", { body: { return_to: "web" } });
  return r.status === 200 && /^https?:\/\//.test(r.body.confirm_url) ? r.body.confirm_url : null;
}

export async function unlink(): Promise<SeamResult> {
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

// ----- Trust (area C): notifications, the Pro Developer request, the admin's tools, through the API -----

type ApiNotification = { id: string; kind: string; text: string; link: string; actor: ApiMember | null; read: boolean; created_at: string };
type ApiVerificationRequest = { id: string; member: ApiMember; full_name: string; portfolio_links: string[]; apps: { id: string; name: string }[]; status: "pending" | "approved" | "rejected"; reason: string | null; created_at: string; reviewed_at: string | null };
type ApiVerificationState = { has_gold: boolean; app_count: number; required_apps: number; yallapp_linked: boolean; can_apply: boolean; apps?: ApiApp[]; request: ApiVerificationRequest | null };
type ApiGrant = { id: string; badge: BadgeKind; source: "auto" | "manual" | "request"; reason: string | null; granted_by: ApiMember | null; granted_at: string; expires_at: string | null; revoked_at: string | null; revoke_reason?: string | null };
type ApiAudit = { id: string; actor: ApiMember | null; action: string; member: ApiMember | null; target_type?: string | null; target_id?: string | null; reason: string | null; created_at: string };
type ApiModeration = { id: string; target_type: string; target_id: string; cause: "first_posts" | "spam_filter" | "reports"; status: "open" | "approved" | "removed"; preview: string; author: ApiMember | null; report_count: number; note?: string | null; created_at: string };
type ApiReport = { id: string; reporter: ApiMember; target_type: string; target_id: string; reason: string; note: string; status: "open" | "actioned" | "dismissed"; created_at: string };
type ApiSettings = {
  blue_badge: { min_account_days: number; min_points: number; min_accepted_answers: number; min_approved_tutorials: number; violation_free_days: number; inactive_days: number };
  groups_create_policy: "everyone" | "badge_holders" | "chosen";
  groups_create_members?: string[];
  spam_filter: { enabled: boolean; blocked_domains: string[]; blocked_words: string[]; max_links: number; hide_after_reports: number };
  first_posts_reviewed?: number;
};
type ApiPage<T> = { items: T[]; next_cursor: string | null };

const cursorQuery = (q: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
  const t = p.toString();
  return t ? `?${t}` : "";
};
const done = (r: { status: number; body: unknown }): SeamResult => (r.status >= 200 && r.status < 300 ? { ok: true } : { ok: false, code: errorCode(r.body), errors: errorFields(r.body) });

/** Where a reported or held post is on the site, when it has its own page. */
function targetLink(type: string, id: string): string | null {
  if (type === "question") return cmLinks.question(id);
  if (type === "tutorial") return cmLinks.tutorial(id);
  // 232–234
  if (type === "post") return cmLinks.post(id);
  if (type === "showcase") return cmLinks.showcaseItem(id);
  if (type === "group") return cmLinks.group(id);
  if (type === "job") return cmLinks.job(id);
  if (type === "conversation") return cmLinks.admin(`conversations/${encodeURIComponent(id)}`);
  return null;
}

export async function notices(o: { cursor?: string }): Promise<Page<Notice> & { unread: number }> {
  const r = await communityApi<ApiPage<ApiNotification> & { unread_count: number }>("GET", `/notifications${cursorQuery({ cursor: o.cursor })}`);
  if (r.status !== 200) return { items: [], next: null, unread: 0 };
  return {
    items: r.body.items.map((n) => ({ id: n.id, kind: n.kind, text: n.text, link: n.link ? cmHref(n.link) : null, actor: n.actor ? apiMember(n.actor) : null, createdAt: n.created_at, read: n.read })),
    next: r.body.next_cursor,
    unread: r.body.unread_count,
  };
}

export async function markNoticesRead(ids: string[] | "all"): Promise<void> {
  await communityApi("POST", "/notifications/read", { body: ids === "all" ? {} : { ids } });
}

/** Which kinds of notification also come by email. */
export async function noticePrefs(): Promise<Record<string, boolean>> {
  const r = await communityApi<{ email: Record<string, boolean> }>("GET", "/notifications/settings");
  return r.status === 200 ? r.body.email : {};
}

export async function setNoticePrefs(email: Record<string, boolean>): Promise<SeamResult> {
  return done(await communityApi("PUT", "/notifications/settings", { body: { email } }));
}

export async function goldStatus(): Promise<GoldStatus> {
  const r = await communityApi<ApiVerificationState>("GET", "/badges/verification");
  if (r.status !== 200) return { hasGold: false, linked: false, appCount: 0, requiredApps: 5, canApply: false, apps: [], request: null };
  const v = r.body;
  return {
    hasGold: v.has_gold,
    linked: v.yallapp_linked,
    appCount: v.app_count,
    requiredApps: v.required_apps,
    canApply: v.can_apply,
    apps: (v.apps ?? []).map((a) => ({ id: a.id, name: a.name, template: a.from_template })),
    request: v.request ? { status: v.request.status, createdAt: v.request.created_at, reviewedAt: v.request.reviewed_at, reason: v.request.reason } : null,
  };
}

/** The request goes with the ID file itself (kept privately: only admins open it, by a link that lasts minutes). */
export async function submitVerification(input: { fullName: string; idProof: File; portfolio: string[] }): Promise<SeamResult> {
  const form = new FormData();
  form.set("full_name", input.fullName);
  form.set("id_proof", input.idProof);
  for (const link of input.portfolio) form.append("portfolio_links", link);
  return done(await communityApi("POST", "/badges/verification", { form }));
}

export async function adminVerifications(q: { status: "pending" | "approved" | "rejected"; cursor?: string }): Promise<Page<VerificationRow>> {
  const r = await communityApi<ApiPage<ApiVerificationRequest>>("GET", `/admin/verification-requests${cursorQuery({ status: q.status, cursor: q.cursor })}`);
  if (r.status !== 200) return { items: [], next: null };
  return {
    items: r.body.items.map((v) => ({ id: v.id, member: apiMember(v.member), fullName: v.full_name, portfolio: v.portfolio_links, apps: v.apps, status: v.status, createdAt: v.created_at, reason: v.reason })),
    next: r.body.next_cursor,
  };
}

export async function idProofLink(requestId: string): Promise<string | null> {
  const r = await communityApi<{ url: string }>("GET", `/admin/verification-requests/${encodeURIComponent(requestId)}/id-proof`);
  return r.status === 200 ? r.body.url : null;
}

export async function decideVerification(id: string, input: { decision: "approve" | "reject"; reason: string }): Promise<SeamResult> {
  return done(await communityApi("POST", `/admin/verification-requests/${encodeURIComponent(id)}`, { body: input }));
}

export async function adminFindMember(handle: string): Promise<(MemberRef & { handle: string; badges: BadgeRow[] }) | null> {
  const found = await communityApi<ApiPage<ApiMember>>("GET", `/admin/members${cursorQuery({ q: handle, limit: "20" })}`);
  const m = found.status === 200 ? found.body.items.find((x) => x.username.toLowerCase() === handle.toLowerCase()) : undefined;
  if (!m) return null;
  const r = await communityApi<{ items: ApiGrant[] }>("GET", `/admin/members/${encodeURIComponent(m.id)}/badges`);
  const badges = r.status === 200 ? r.body.items : [];
  return {
    ...apiMember(m),
    handle: m.username,
    badges: badges.map((b) => ({ id: b.id, badge: b.badge, source: b.source, reason: b.reason, grantedBy: b.granted_by ? apiMember(b.granted_by) : null, grantedAt: b.granted_at, expiresAt: b.expires_at, revokedAt: b.revoked_at, revokeReason: b.revoke_reason ?? null })),
  };
}

export async function grantBadge(memberId: string, input: { badge: BadgeKind; reason: string; expiresAt: string | null }): Promise<SeamResult> {
  return done(await communityApi("POST", `/admin/members/${encodeURIComponent(memberId)}/badges`, { body: { badge: input.badge, reason: input.reason, expires_at: input.expiresAt } }));
}

export async function revokeBadge(memberId: string, badge: BadgeKind, input: { reason: string }): Promise<SeamResult> {
  return done(await communityApi("DELETE", `/admin/members/${encodeURIComponent(memberId)}/badges/${badge}`, { body: input }));
}

export async function adminAudit(q: { cursor?: string }): Promise<Page<AuditRow>> {
  const r = await communityApi<ApiPage<ApiAudit>>("GET", `/admin/audit-log${cursorQuery({ cursor: q.cursor })}`);
  if (r.status !== 200) return { items: [], next: null };
  return {
    items: r.body.items.map((e) => ({ id: e.id, actor: e.actor ? apiMember(e.actor) : null, action: e.action, member: e.member ? apiMember(e.member) : null, target: e.target_type ? `${e.target_type}:${e.target_id ?? ""}` : null, reason: e.reason, at: e.created_at })),
    next: r.body.next_cursor,
  };
}

export async function adminSettings(): Promise<SettingsView | null> {
  const r = await communityApi<ApiSettings>("GET", "/admin/settings");
  if (r.status !== 200) return null;
  const s = r.body;
  const chosen = await Promise.all(
    (s.groups_create_members ?? []).slice(0, 100).map(async (id) => {
      const m = await communityApi<ApiMember>("GET", `/members/${memberPath(id)}`);
      return m.status === 200 ? apiMember(m.body) : { id, name: id, handle: null, avatarUrl: null, badge: null, staff: false, rank: null };
    }),
  );
  return {
    blue: {
      minAccountDays: s.blue_badge.min_account_days,
      minPoints: s.blue_badge.min_points,
      minAcceptedAnswers: s.blue_badge.min_accepted_answers,
      minApprovedTutorials: s.blue_badge.min_approved_tutorials,
      violationFreeDays: s.blue_badge.violation_free_days,
      inactiveDays: s.blue_badge.inactive_days,
    },
    groups: { policy: s.groups_create_policy, chosen },
    spam: { enabled: s.spam_filter.enabled, blockedDomains: s.spam_filter.blocked_domains, blockedWords: s.spam_filter.blocked_words, maxLinks: s.spam_filter.max_links, hideAfterReports: s.spam_filter.hide_after_reports },
    firstPostsReviewed: s.first_posts_reviewed ?? 2,
  };
}

/** The chosen members are given by username; the settings keep their ids. */
export async function updateSettings(input: Omit<SettingsView, "groups"> & { groups: { policy: SettingsView["groups"]["policy"]; chosenHandles: string[] } }): Promise<SeamResult> {
  const ids: string[] = [];
  for (const handle of input.groups.chosenHandles.slice(0, 100)) {
    const m = await communityApi<ApiMember>("GET", `/members/${memberPath(handle)}`);
    if (m.status !== 200) return { ok: false, code: "invalid_request", errors: { groups_create_members: handle } };
    ids.push(m.body.id);
  }
  const b = input.blue;
  return done(
    await communityApi("PUT", "/admin/settings", {
      body: {
        blue_badge: { min_account_days: b.minAccountDays, min_points: b.minPoints, min_accepted_answers: b.minAcceptedAnswers, min_approved_tutorials: b.minApprovedTutorials, violation_free_days: b.violationFreeDays, inactive_days: b.inactiveDays },
        groups_create_policy: input.groups.policy,
        groups_create_members: ids,
        spam_filter: { enabled: input.spam.enabled, blocked_domains: input.spam.blockedDomains, blocked_words: input.spam.blockedWords, max_links: input.spam.maxLinks, hide_after_reports: input.spam.hideAfterReports },
        first_posts_reviewed: input.firstPostsReviewed,
      },
    }),
  );
}

export async function adminModeration(q: { status: "open" | "approved" | "removed"; cursor?: string }): Promise<Page<ModerationRow>> {
  const r = await communityApi<ApiPage<ApiModeration>>("GET", `/admin/moderation${cursorQuery({ status: q.status, cursor: q.cursor })}`);
  if (r.status !== 200) return { items: [], next: null };
  return {
    items: r.body.items.map((m) => ({ id: m.id, targetType: m.target_type, targetId: m.target_id, cause: m.cause, status: m.status, preview: m.preview, author: m.author ? apiMember(m.author) : null, reportCount: m.report_count, note: m.note ?? null, createdAt: m.created_at, link: targetLink(m.target_type, m.target_id) })),
    next: r.body.next_cursor,
  };
}

export async function decideModeration(id: string, input: { decision: "approve" | "remove"; note: string }): Promise<SeamResult> {
  return done(await communityApi("POST", `/admin/moderation/${encodeURIComponent(id)}`, { body: { decision: input.decision, ...(input.note ? { note: input.note } : {}) } }));
}

export async function adminReports(q: { status: "open" | "actioned" | "dismissed"; cursor?: string }): Promise<Page<ReportRow>> {
  const r = await communityApi<ApiPage<ApiReport>>("GET", `/admin/reports${cursorQuery({ status: q.status, cursor: q.cursor })}`);
  if (r.status !== 200) return { items: [], next: null };
  return {
    items: r.body.items.map((x) => ({ id: x.id, reporter: apiMember(x.reporter), targetType: x.target_type, targetId: x.target_id, reason: x.reason, note: x.note, status: x.status, createdAt: x.created_at, link: x.target_type === "member" ? null : targetLink(x.target_type, x.target_id) })),
    next: r.body.next_cursor,
  };
}

export async function resolveReport(id: string, input: { status: "actioned" | "dismissed"; note: string }): Promise<SeamResult> {
  return done(await communityApi("POST", `/admin/reports/${encodeURIComponent(id)}`, { body: { status: input.status, ...(input.note ? { note: input.note } : {}) } }));
}

// ----- Deleting the account (area A's DELETE /me) -----

export type DeletionInfo = { hasPassword: boolean; providers: string[]; signedInAt: Date | null };

/** What the delete form needs: whether the member has a password, how they sign in, and when this browser signed in. */
export async function deletionInfo(): Promise<DeletionInfo | null> {
  const [me, devices] = await Promise.all([
    communityApi<{ has_password?: boolean; providers?: string[] }>("GET", "/me"),
    communityApi<{ items?: { current?: boolean; created_at?: string }[] }>("GET", "/me/sessions"),
  ]);
  if (me.status !== 200 || !me.body) return null;
  const current = devices.status === 200 ? devices.body?.items?.find((d) => d.current) : undefined;
  return {
    hasPassword: me.body.has_password === true,
    providers: me.body.providers ?? [],
    signedInAt: current?.created_at ? new Date(current.created_at) : null,
  };
}

/** Deletes the signed-in member's account, then this browser's sign-in cookies. */
export async function deleteAccount(body: { password: string } | { confirm: "DELETE" }): Promise<SeamResult> {
  const r = await communityApi("DELETE", "/me", { body });
  if (r.status !== 204 && r.status !== 200) return { ok: false, code: errorCode(r.body) };
  await clearCommunityCookies();
  return { ok: true };
}
