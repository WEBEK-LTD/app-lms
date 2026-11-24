import { afterReported, getSettings, notify as trustNotify, refreshAutoBadges } from "../trust/service";
import { trustDepsOf } from "../trust/context";
import type { CommunityReport } from "../types";
import type { CommunityContext } from "./http";

/**
 * 231 Where area A's actions reach area C (trust): the notifications they
 * make, a report reaching the moderators, a Yallapp account linked or
 * unlinked (Gold's apps and Green are checked again), and the groups
 * setting `/config` reads.
 */
export interface CommunityNotice {
  memberId: string;
  kind: "follow" | "friend_request" | "friend_accepted" | "yallapp_linked";
  actorId: string | null;
  targetType?: string | null;
  targetId?: string | null;
  data?: Record<string, unknown>;
}

/** Tells a member: in their list, and by email for the kinds that email (lib/community/trust/notifications.ts). */
export async function notify(ctx: CommunityContext, notice: CommunityNotice): Promise<void> {
  const actor = notice.actorId ? await ctx.store.base.getMember(notice.actorId) : null;
  const link = notice.kind === "friend_request" ? "/me/friends" : notice.kind === "yallapp_linked" ? "/me" : actor ? `/u/${actor.username}` : "/";
  await trustNotify(trustDepsOf(ctx), {
    memberId: notice.memberId,
    kind: notice.kind,
    actorId: notice.actorId,
    targetType: notice.targetType ?? null,
    targetId: notice.targetId ?? null,
    data: { ...(notice.data ?? {}), ...(actor ? { actor: actor.displayName } : {}) },
    link,
  });
}

/** A report was made: the moderators' list has it, and enough reports on a post hide it until they decide. */
export async function onReported(ctx: CommunityContext, report: CommunityReport): Promise<void> {
  await afterReported(trustDepsOf(ctx), report);
}

/** A Yallapp account was linked or unlinked: the badges that depend on it are checked again. */
export async function onYallappLinkChanged(ctx: Pick<CommunityContext, "deps" | "store" | "now">, memberId: string): Promise<void> {
  await refreshAutoBadges(trustDepsOf(ctx), memberId);
}

/** "Who can create groups" (phase 2 reads it): everyone, badge_holders or chosen. */
export async function groupsCreatePolicy(ctx: CommunityContext): Promise<"everyone" | "badge_holders" | "chosen"> {
  return (await getSettings(trustDepsOf(ctx))).groups_create_policy;
}
