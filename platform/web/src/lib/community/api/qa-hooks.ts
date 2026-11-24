import { withQa, type MemberPerson, type QaHooks } from "../qa/hooks";
import { trustDepsOf } from "../trust/context";
import { moderateNew, notify } from "../trust/service";
import type { CommunityContext } from "./http";
import { memberSummaries, type MemberSummaryView } from "./views";

/**
 * 231 What the Q&A needs from the other areas for one API call: members
 * as area A shows them (with area C's badge), blocks and follows (A), the
 * points a member's profile shows (A), and moderation and notifications
 * (C: `trustForQa` below, which area C fills from its moderateNew and notify).
 */
export function qaHooksFor(ctx: CommunityContext): Partial<QaHooks> {
  const base = ctx.store.base;
  return {
    async members(ids) {
      const views = await memberSummaries(ctx, ids);
      return Object.fromEntries(views.map((v) => [v.id, fromView(v)]));
    },
    async hiddenFor(viewerId) {
      return [...(await base.blockedEitherWay(viewerId))];
    },
    async followingIds(viewerId) {
      return base.listFollowing(viewerId, 0, 5000);
    },
    async searchMembers(q, limit) {
      const found = await base.searchMembers(q, 0, limit);
      return (await memberSummaries(ctx, found.map((m) => m.id))).map(fromView);
    },
    async pointsChanged(memberId, delta) {
      await base.addPoints(memberId, delta);
    },
    ...trustForQa(ctx),
  };
}

/**
 * Runs Q&A functions for this call with its store and all its hooks
 * (members, blocks, points, moderation, notices). Area C's own calls into
 * the Q&A (approving or removing a post) go through it, so an approved
 * answer still tells the asker and a removed accepted one takes its points
 * back from the profile.
 */
export function withQaFor<T>(ctx: Pick<CommunityContext, "deps" | "store" | "now"> & Partial<CommunityContext>, fn: () => Promise<T>): Promise<T> {
  // Without a reader (area C's own work): members as a signed-out reader sees them; each notice is written in its recipient's language by area C.
  const full = { member: null, session: null, lang: "en", params: {}, query: new URLSearchParams(), json: () => ({}), ...ctx } as CommunityContext;
  return withQa(ctx.store.qa, qaHooksFor(full), fn);
}

/**
 * Area C's side: a new post's status (moderateNew: a new member's first
 * posts and the spam filter hold it, and it goes into the moderation
 * queue) and the notices (notify: the list, and email for the kinds that
 * email).
 */
export function trustForQa(ctx: CommunityContext): Partial<Pick<QaHooks, "moderate" | "notify">> {
  const deps = trustDepsOf(ctx);
  return {
    async moderate(input) {
      return (await moderateNew(deps, input)).status;
    },
    async notify(input) {
      await notify(deps, input);
    },
  };
}

/** Area A's MemberSummary, kept whole (its rank and rank_label too) so the app and site see one shape everywhere. */
function fromView(v: MemberSummaryView): MemberPerson {
  return { id: v.id, username: v.username, displayName: v.display_name, avatarUrl: v.avatar_url, headline: v.headline, topBadge: v.top_badge, team: v.team, deleted: v.deleted, rank: v.rank, rankLabel: v.rank_label, level: v.level, levelLabel: v.level_label, levelProgress: v.level_progress };
}
