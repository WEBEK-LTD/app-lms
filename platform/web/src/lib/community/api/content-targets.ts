import { connectContentInfo, isConnectKind } from "../connect/content";
import { withQa } from "../qa/hooks";
import { contentInfo, type QaContentKind } from "../qa/service";
import { contentInfo as socialInfo, type SocialContentKind } from "../social/service";
import type { CommunityTargetType } from "../types";
import type { CommunityContext } from "./http";

const QA_KINDS: Record<string, QaContentKind> = { question: "question", answer: "answer", reply: "reply", comment: "reply", tutorial: "tutorial" };
/** 232 Area B's phase 2 content a report can name: posts, their comments, the showcase, stories. */
const SOCIAL: readonly string[] = ["post", "post_comment", "showcase", "story"] satisfies SocialContentKind[];

/**
 * 231 Whether a question, answer, tutorial or comment (a reply to an
 * answer) exists and who wrote it, for reports. Members are area A's own.
 * 232–234 And area A's groups, jobs, reviews and conversations, and area
 * B's posts, a post's comments, showcase items and stories.
 */
export async function contentTarget(ctx: CommunityContext, type: Exclude<CommunityTargetType, "member">, id: string): Promise<{ authorId: string } | null> {
  if (isConnectKind(type)) {
    const got = await connectContentInfo(ctx.store, type, id);
    return got && !got.removed ? { authorId: got.authorId } : null;
  }
  if (SOCIAL.includes(type)) {
    const { socialEnvFor } = await import("./social-routes");
    const info = await socialInfo(socialEnvFor(ctx), type as SocialContentKind, id);
    return info && info.status !== "removed" ? { authorId: info.memberId } : null;
  }
  const qa = QA_KINDS[type];
  if (!qa) return null;
  const info = await withQa(ctx.store.qa, {}, () => contentInfo(qa, id));
  return info && info.status !== "removed" ? { authorId: info.memberId } : null;
}
