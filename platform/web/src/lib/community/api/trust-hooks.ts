/* eslint-disable @typescript-eslint/no-unused-vars -- stubs the other areas fill in */
import type { CommunityReport } from "../types";
import type { CommunityContext } from "./http";

/**
 * 231 Where area A's actions reach area C (trust), which fills these in:
 * the notifications they make, a report reaching the moderators, a Yallapp
 * account linked or unlinked (Gold's apps and Green are checked again), and
 * the groups setting `/config` reads. Until then they do nothing.
 */
export interface CommunityNotice {
  memberId: string;
  kind: "follow" | "friend_request" | "friend_accepted" | "yallapp_linked";
  actorId: string | null;
  targetType?: string | null;
  targetId?: string | null;
  data?: Record<string, unknown>;
}

export async function notify(_ctx: CommunityContext, _notice: CommunityNotice): Promise<void> {}

/** A report was made: the moderation queue counts it (several reports hold the content). */
export async function onReported(_ctx: CommunityContext, _report: CommunityReport): Promise<void> {}

/** A Yallapp account was linked or unlinked: the badges that depend on it are checked again. */
export async function onYallappLinkChanged(_ctx: Pick<CommunityContext, "deps" | "store" | "now">, _memberId: string): Promise<void> {}

/** "Who can create groups" (phase 2 reads it): everyone, badge_holders or chosen. */
export async function groupsCreatePolicy(_ctx: CommunityContext): Promise<"everyone" | "badge_holders" | "chosen"> {
  return "everyone";
}
