import { CONTENT_KINDS } from "../content-kinds";
import { withQa } from "../qa/hooks";
import { contentInfo } from "../qa/service";
import type { CommunityTargetType } from "../types";
import type { CommunityContext } from "./http";

/**
 * 231 Whether a question, answer, tutorial or comment (a reply to an
 * answer) exists and who wrote it, for reports. Members are area A's own.
 */
export async function contentTarget(ctx: CommunityContext, type: Exclude<CommunityTargetType, "member">, id: string): Promise<{ authorId: string } | null> {
  // 232–235 The kinds phases 2 to 5 add, from their areas' table.
  const adapter = CONTENT_KINDS[type];
  if (adapter) {
    const got = await adapter.info(ctx, id);
    return got && !got.removed && got.authorId ? { authorId: got.authorId } : null;
  }
  if (type !== "question" && type !== "answer" && type !== "reply" && type !== "tutorial" && type !== "comment") return null;
  const info = await withQa(ctx.store.qa, {}, () => contentInfo(type === "comment" ? "reply" : type, id));
  return info && info.status !== "removed" ? { authorId: info.memberId } : null;
}
