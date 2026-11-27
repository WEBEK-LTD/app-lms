import type { CommunityContext } from "./api/http";
import { challengeSubmissionContent, eventCommentContent, eventContent } from "./engage/content";
import { contentInfo as socialContentInfo, setStatus as socialSetStatus, type SocialContentKind } from "./social/service";
import type { CommunityTargetType } from "./types";

/**
 * 232–235 What phases 2 to 5 add that can be reported and moderated, in one
 * table: for each kind, who wrote it and what to show the moderator (`info`)
 * and how to hide or show it again (`setStatus`). Phase 1's moderation queue,
 * reports and spam rules (lib/community/trust) read it for every kind not in
 * area B's Q&A, and area A's own (lib/community/connect/content.ts: group,
 * job, pro_review, conversation). B: post, post_comment, story, showcase,
 * showcase_comment; C: event, event_comment, challenge_submission.
 */

export interface ContentInfo {
  authorId: string | null;
  /** What the moderator reads: the post's own words, a title for a long piece. */
  title: string;
  /** Where it is on the site ("/events/…"). */
  link: string;
  /** Removed for good (never shown again, nothing to report). */
  removed?: boolean;
}

export interface ContentAdapter {
  info(ctx: Pick<CommunityContext, "deps" | "store" | "now">, id: string): Promise<ContentInfo | null>;
  setStatus(ctx: Pick<CommunityContext, "deps" | "store" | "now">, id: string, status: "published" | "hidden"): Promise<void>;
  /** The kind's card as the API shows it elsewhere (a challenge entry's showcase item: ShowcaseSummary); area B gives it for showcase. */
  summary?(ctx: CommunityContext, id: string): Promise<unknown>;
}

/** A request's context for B's functions when the call is a job's or a moderator's (no reader of its own). */
function full(ctx: Pick<CommunityContext, "deps" | "store" | "now">): CommunityContext {
  return { member: null, session: null, lang: "en", params: {}, query: new URLSearchParams(), json: () => ({}), ...ctx } as CommunityContext;
}

/** Area B's posts, their comments, stories and showcase items (lib/community/social; a showcase comment is a post_comment row). */
function social(kind: SocialContentKind): ContentAdapter {
  const env = async (ctx: Pick<CommunityContext, "deps" | "store" | "now">) => (await import("./api/social-routes")).socialEnvFor(full(ctx));
  return {
    async info(ctx, id) {
      const got = await socialContentInfo(await env(ctx), kind, id);
      return got ? { authorId: got.memberId, title: (got.text || got.title).slice(0, 140), link: got.link, removed: got.status === "removed" } : null;
    },
    async setStatus(ctx, id, status) {
      await socialSetStatus(await env(ctx), kind, id, status);
    },
    ...(kind === "showcase" ? { summary: async (ctx: CommunityContext, id: string) => (await import("./api/social-routes")).showcaseSummaryOf(ctx, id) } : {}),
  };
}

export const CONTENT_KINDS: Partial<Record<Exclude<CommunityTargetType, "member">, ContentAdapter>> = {
  // Area B
  post: social("post"),
  post_comment: social("post_comment"),
  showcase_comment: social("post_comment"),
  showcase: social("showcase"),
  story: social("story"),
  // Area C
  event: eventContent,
  event_comment: eventCommentContent,
  challenge_submission: challengeSubmissionContent,
};
