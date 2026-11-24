import type { QaHooks } from "../qa/hooks";
import type { MemberSummary } from "../qa/types";
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
 * Area C's side: a new post's status (moderateNew: a new member's first
 * posts and the spam filter hold it) and the notices (notify). Until area C
 * fills it, every post shows and nothing is sent.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- area C fills it in
export function trustForQa(_ctx: CommunityContext): Partial<Pick<QaHooks, "moderate" | "notify">> {
  return {};
}

function fromView(v: MemberSummaryView): Omit<MemberSummary, "rank"> {
  return { id: v.id, username: v.username, displayName: v.display_name, avatarUrl: v.avatar_url, headline: v.headline, topBadge: v.top_badge, team: v.team, deleted: v.deleted };
}
