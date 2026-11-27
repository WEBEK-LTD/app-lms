import type { CommunityContext } from "../api/http";
import type { ContentAdapter } from "../content-kinds";
import type { SocialContentKind } from "./service";

/**
 * 232 Area B's lines of the moderation table (lib/community/content-kinds.ts):
 * posts, their comments (a showcase comment is the same row), stories and
 * showcase items, for the queue, reports and spam rules. The routes module
 * is loaded on first use, so the table doesn't pull the API in.
 */
type Ctx = Pick<CommunityContext, "deps" | "store" | "now">;

/** A context without a request (the queue, a report): nobody signed in, English. */
function asContext(ctx: Ctx): CommunityContext {
  const full = ctx as Partial<CommunityContext>;
  return { member: null, session: null, lang: "en", params: {}, query: new URLSearchParams(), json: () => ({}), ...full, req: full.req ?? ({} as CommunityContext["req"]) } as CommunityContext;
}

function adapter(kind: SocialContentKind): ContentAdapter {
  return {
    async info(ctx, id) {
      const { socialEnvFor } = await import("../api/social-routes");
      const { contentInfo } = await import("./service");
      const got = await contentInfo(socialEnvFor(asContext(ctx)), kind, id);
      return got && { authorId: got.memberId, title: (got.text || got.title).slice(0, 500), link: got.link, removed: got.status === "removed" };
    },
    async setStatus(ctx, id, status) {
      const { socialEnvFor } = await import("../api/social-routes");
      const { setStatus } = await import("./service");
      await setStatus(socialEnvFor(asContext(ctx)), kind, id, status);
    },
  };
}

export const postContent = adapter("post");
export const postCommentContent = adapter("post_comment");
export const storyContent = adapter("story");
export const showcaseContent: ContentAdapter = {
  ...adapter("showcase"),
  /** A challenge entry's card: ShowcaseSummary. */
  async summary(ctx, id) {
    const { showcaseSummaryOf } = await import("../api/social-routes");
    return showcaseSummaryOf(ctx, id);
  },
};
