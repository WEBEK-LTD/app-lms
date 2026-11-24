import type { MemberRef } from "./types";

/**
 * 231 What the Q&A needs from the community's other areas, as one seam:
 * the members (area A: accounts, profiles, blocks), moderation and
 * notifications (area C). Each area sets its own (`setQaHooks`); until
 * then, and in tests, these defaults: every member a plain one, every post
 * shown, no notices. Nothing here imports the other areas, so the Q&A
 * builds and tests on its own.
 */

export type ModeratedKind = "question" | "answer" | "reply" | "tutorial";

export interface QaHooks {
  /** The members with these ids as shown beside a post (missing ids left out). */
  members(ids: readonly string[]): Promise<Record<string, Omit<MemberRef, "rank">>>;
  /** The members the viewer blocked or who blocked them: neither sees the other's posts. */
  hiddenFor(viewerId: string): Promise<string[]>;
  /** A new post's status: published, or pending a moderator (a new member's first posts, a bad link); "rejected" refuses it. */
  moderate(input: { memberId: string; kind: ModeratedKind; text: string; links: string[] }): Promise<"published" | "pending" | "rejected">;
  /** Tells a member (the list in the app and email): area C. */
  notify(memberId: string, event: QaEvent, data: Record<string, string>): Promise<void>;
}

export type QaEvent = "answer_posted" | "answer_accepted" | "official_answer" | "reply_posted";

const DEFAULTS: QaHooks = {
  async members(ids) {
    return Object.fromEntries(ids.map((id) => [id, { id, name: "Member", handle: null, avatarUrl: null, badge: null, staff: false }]));
  },
  async hiddenFor() {
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
