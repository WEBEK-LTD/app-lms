import { CONTENT_KINDS } from "../content-kinds";
import { connectContentInfo, isConnectKind } from "../connect/content";
import { withQa } from "../qa/hooks";
import { contentInfo, type QaContentKind } from "../qa/service";
import type { CommunityTargetType } from "../types";
import type { CommunityContext } from "./http";

const QA_KINDS: Record<string, QaContentKind> = { question: "question", answer: "answer", reply: "reply", comment: "reply", tutorial: "tutorial" };

/**
 * 231 Whether a question, answer, tutorial or comment (a reply to an
 * answer) exists and who wrote it, for reports. Members are area A's own.
 * 232–234 And area A's groups, jobs, reviews and conversations; area B's
 * posts, their comments, stories and showcase items.
 */
export async function contentTarget(ctx: CommunityContext, type: Exclude<CommunityTargetType, "member">, id: string): Promise<{ authorId: string } | null> {
  // 232–235 The kinds phases 2 to 5 add, from their areas' table.
  const adapter = CONTENT_KINDS[type];
  if (adapter) {
    const got = await adapter.info(ctx, id);
    return got && !got.removed && got.authorId ? { authorId: got.authorId } : null;
  }
  if (isConnectKind(type)) {
    const got = await connectContentInfo(ctx.store, type, id);
    return got && !got.removed ? { authorId: got.authorId } : null;
  }
  const qa = QA_KINDS[type];
  if (!qa) return null;
  const info = await withQa(ctx.store.qa, {}, () => contentInfo(qa, id));
  return info && info.status !== "removed" ? { authorId: info.memberId } : null;
}
