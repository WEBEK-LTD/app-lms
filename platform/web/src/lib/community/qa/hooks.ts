import { AsyncLocalStorage } from "node:async_hooks";
import type { QaStore } from "./store";
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
/** Area C's name for what is moderated: a reply is a "comment" there. */
export type ModeratedTarget = "question" | "answer" | "comment" | "tutorial";
/** Area C's notice kinds the Q&A sends: an answer (to the asker), an official one, an accepted one, a reply (to the answer's author), a vote milestone (1, 10, 50, 100 upvotes). */
export type QaNoticeKind = "answer" | "answer_accepted" | "official_answer" | "reply" | "vote_milestone";

/** A member as area A gives them: their rank too when A has it (else the Q&A works it out from its points). */
export type MemberPerson = Omit<MemberSummary, "rank"> & { rank?: MemberSummary["rank"] };

export interface QaHooks {
  /** The members with these ids as shown beside a post; missing ids are shown as deleted. */
  members(ids: readonly string[]): Promise<Record<string, MemberPerson>>;
  /** The members the viewer blocked or who blocked them: neither sees the other's posts. */
  hiddenFor(viewerId: string): Promise<string[]>;
  /** The members the viewer follows (the "following" filter). */
  followingIds(viewerId: string): Promise<string[]>;
  /** Members whose name or username has the text (search's members). */
  searchMembers(q: string, limit: number): Promise<MemberPerson[]>;
  /**
   * A new post's status, called once it is stored as pending (area C's
   * moderateNew: a new member's first posts and the spam filter hold it,
   * and it goes into the queue).
   */
  moderate(input: { memberId: string; targetType: ModeratedTarget; targetId: string; text: string }): Promise<"published" | "pending">;
  /** Tells a member (the list in the app and email): area C's notify. Never about their own doing. */
  /** The member's Q&A points went up or down by `delta` (area A adds it to the member's points, shown on the profile). */
  pointsChanged(memberId: string, delta: number): Promise<void>;
  /** 233 Area C's points ledger (engage/points.ts): when set, it gives the points (its table decides the amount and the daily cap) instead of pointsChanged. */
  award?(input: { memberId: string; reason: string; ref: string }): Promise<unknown>;
  takeBack?(input: { memberId: string; reason: string; ref: string }): Promise<unknown>;
  notify(input: { memberId: string; kind: QaNoticeKind; actorId: string | null; targetType: "question" | "answer" | "reply"; targetId: string; data: { actor?: string; title?: string; count?: number }; link: string }): Promise<void>;
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
  async pointsChanged() {},
};

let current: QaHooks = DEFAULTS;

/**
 * One API call's store and hooks (lib/community/api/qa-routes.ts runs each
 * call in it), so concurrent calls never share a member's language, blocks
 * or store.
 */
export const qaScope = new AsyncLocalStorage<{ store: QaStore; hooks: QaHooks }>();

/** The hooks of the call being answered, else the ones set (tests), else the defaults. */
export function qaHooks(): QaHooks {
  return qaScope.getStore()?.hooks ?? current;
}

/** Runs `fn` with this store and these hooks (the others' defaults fill what's missing). */
export function withQa<T>(store: QaStore, hooks: Partial<QaHooks>, fn: () => Promise<T>): Promise<T> {
  return qaScope.run({ store, hooks: { ...DEFAULTS, ...hooks } }, fn);
}

/** Sets some of the hooks (the others keep theirs); `null` puts the defaults back. */
export function setQaHooks(hooks: Partial<QaHooks> | null): void {
  current = hooks ? { ...current, ...hooks } : DEFAULTS;
}
