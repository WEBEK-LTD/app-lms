import { withQa } from "../qa/hooks";
import { contentInfo } from "../qa/service";
import { contentInfo as socialInfo, type SocialContentKind } from "../social/service";
import type { CommunityTargetType } from "../types";
import type { CommunityContext } from "./http";

/** 232 Area B's phase 2 content a report can name: posts, their comments, the showcase, stories. */
const SOCIAL: readonly string[] = ["post", "post_comment", "showcase", "story"] satisfies SocialContentKind[];

/**
 * 231 Whether a question, answer, tutorial or comment (a reply to an
 * answer) exists and who wrote it, for reports. Members are area A's own.
 * 232 And a post, a post's comment, a showcase item or a story.
 */
export async function contentTarget(ctx: CommunityContext, type: Exclude<CommunityTargetType, "member">, id: string): Promise<{ authorId: string } | null> {
  if (SOCIAL.includes(type)) {
    const { socialEnvFor } = await import("./social-routes");
    const info = await socialInfo(socialEnvFor(ctx), type as SocialContentKind, id);
    return info && info.status !== "removed" ? { authorId: info.memberId } : null;
  }
  const info = await withQa(ctx.store.qa, {}, () => contentInfo(type === "comment" ? "reply" : (type as "question" | "answer" | "reply" | "tutorial"), id));
  return info && info.status !== "removed" ? { authorId: info.memberId } : null;
}
