import "server-only";
import type {
  ActiveMember, FeedTab, MemberRef, Notice, Page, Profile, QuestionDetail, QuestionSummary, Section, SiteStats, TutorialDetail, TutorialSummary, Viewer,
} from "./data";
import type { CmLang } from "./words";

/**
 * 231 The seam between the website and the community modules: each function
 * here forwards to area A's (members, social), B's (questions, tutorials) or
 * C's (badges, moderation, notifications) module. Until a module is merged,
 * its reads return nothing and its writes refuse, so no page shows made-up
 * content.
 */

export class NotReady extends Error {
  constructor() {
    super("not_ready");
  }
}

export async function communityViewer(_lang: CmLang): Promise<Viewer | null> {
  return null;
}

export async function siteStats(): Promise<SiteStats> {
  return { members: 0, answeredRate: 0, apps: 0, newQuestions: 0 };
}

export async function sections(_lang: CmLang, _viewerId: string | null): Promise<Section[]> {
  return [];
}

export async function questions(_q: { viewerId: string | null; lang: CmLang; tab: FeedTab; section?: string; tag?: string; cursor?: string; limit?: number }): Promise<Page<QuestionSummary>> {
  return { items: [], next: null };
}

export async function question(_idOrSlug: string, _o: { viewerId: string | null; lang: CmLang }): Promise<QuestionDetail | null> {
  return null;
}

export async function similar(_q: { title: string; section?: string; limit?: number }): Promise<QuestionSummary[]> {
  return [];
}

export async function tutorials(_q: { lang: CmLang; section?: string; level?: string; language?: string; kind?: string; cursor?: string; limit?: number }): Promise<Page<TutorialSummary>> {
  return { items: [], next: null };
}

export async function tutorial(_slug: string, _o: { viewerId: string | null; lang: CmLang }): Promise<TutorialDetail | null> {
  return null;
}

export async function search(_q: { q: string; lang: CmLang; limit?: number }): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[]; members: MemberRef[] }> {
  return { questions: [], tutorials: [], members: [] };
}

export async function waiting(_q: { viewerId: string | null; lang: CmLang; limit: number }): Promise<QuestionSummary[]> {
  return [];
}

export async function activeMembers(_q: { limit: number }): Promise<ActiveMember[]> {
  return [];
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

export async function askQuestion(_viewerId: string, _input: { section: string; tags: string[]; title: string; body: string }): Promise<AskResult> {
  throw new NotReady();
}

export async function answerQuestion(_viewerId: string, _questionId: string, _input: { body: string }): Promise<{ status: "published" | "pending" }> {
  throw new NotReady();
}

export async function replyToAnswer(_viewerId: string, _answerId: string, _input: { body: string }): Promise<void> {
  throw new NotReady();
}

export async function vote(_viewerId: string, _target: { kind: "question" | "answer"; id: string; value: -1 | 0 | 1 }): Promise<void> {
  throw new NotReady();
}

export async function acceptAnswer(_viewerId: string, _answerId: string, _on: boolean): Promise<void> {
  throw new NotReady();
}

export async function bookmark(_viewerId: string, _target: { kind: "question" | "tutorial"; id: string }, _on: boolean): Promise<void> {
  throw new NotReady();
}

export async function report(_viewerId: string, _target: { kind: "question" | "answer" | "reply" | "member" | "tutorial"; id: string; reason: string; note?: string }): Promise<void> {
  throw new NotReady();
}

export async function followSection(_viewerId: string, _slug: string, _on: boolean): Promise<void> {
  throw new NotReady();
}

export async function saved(_viewerId: string, _lang: CmLang): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[] }> {
  return { questions: [], tutorials: [] };
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
