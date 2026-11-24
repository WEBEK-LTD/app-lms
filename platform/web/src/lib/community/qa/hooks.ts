import type { MemberSummary } from "./types";

/**
 * 231 What the Q&A needs from the community's other areas, as one seam:
 * the members (area A: accounts, profiles, follows, blocks), moderation and
 * notifications (area C). Each area sets its own (`setQaHooks`); until
 * then, and in tests, these defaults: every member a plain one, every post
 * shown, no notices. Nothing here imports the other areas, so the Q&A
 * builds and tests on its own.
 */

export type ModeratedKind = "question" | "answer" | "reply" | "tutorial";
export type QaNoticeKind = "answer_posted" | "answer_accepted" | "official_answer" | "reply_posted" | "question_voted" | "answer_voted";

export interface QaHooks {
  /** The members with these ids as shown beside a post; missing ids are shown as deleted. */
  members(ids: readonly string[]): Promise<Record<string, Omit<MemberSummary, "rank">>>;
  /** The members the viewer blocked or who blocked them: neither sees the other's posts. */
  hiddenFor(viewerId: string): Promise<string[]>;
  /** The members the viewer follows (the "following" filter). */
  followingIds(viewerId: string): Promise<string[]>;
  /** Members whose name or username has the text (search's members). */
  searchMembers(q: string, limit: number): Promise<Omit<MemberSummary, "rank">[]>;
  /**
   * A new post's status, called once it is stored as pending (area C's
   * moderateNew: a new member's first posts and the spam filter hold it,
   * and it goes into the queue).
   */
  moderate(input: { memberId: string; kind: ModeratedKind; contentId: string; text: string }): Promise<"published" | "pending">;
  /** Tells a member (the list in the app and email): area C's notify. Never about their own doing. */
  notify(input: { memberId: string; kind: QaNoticeKind; actorId: string | null; data: { actor?: string; title?: string; count?: number }; link: string }): Promise<void>;
}

const DEFAULTS: QaHooks = {
  async members(ids) {
    return Object.fromEntries(ids.map((id) => [id, { id, username: id, displayName: "Member", avatarUrl: null, topBadge: null, team: false, deleted: false }]));
  },
  async hiddenFor() {
    return [];
  },
  async followingIds() {
    return [];
  },
  async searchMembers() {
    return [];
  },
  async moderate() {
    return "published";
  },
  async notify() {},
};

let current: QaHooks = DEFAULTS;

export function qaHooks(): QaHooks {
  return current;
}

/** Sets some of the hooks (the others keep theirs); `null` puts the defaults back. */
export function setQaHooks(hooks: Partial<QaHooks> | null): void {
  current = hooks ? { ...current, ...hooks } : DEFAULTS;
}
