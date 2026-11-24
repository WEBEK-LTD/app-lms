import { withQa } from "../qa/hooks";
import { contentInfo } from "../qa/service";
import type { CommunityTargetType } from "../types";
import type { CommunityContext } from "./http";

/**
 * 231 Whether a question, answer, tutorial or comment (a reply to an
 * answer) exists and who wrote it, for reports. Members are area A's own.
 */
export async function contentTarget(ctx: CommunityContext, type: Exclude<CommunityTargetType, "member">, id: string): Promise<{ authorId: string } | null> {
  const info = await withQa(ctx.store.qa, {}, () => contentInfo(type === "comment" ? "reply" : type, id));
  return info && info.status !== "removed" ? { authorId: info.memberId } : null;
}
