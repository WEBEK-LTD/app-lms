import type { CommunityContext } from "./api/http";
import { challengeSubmissionContent, eventCommentContent, eventContent } from "./engage/content";
import { postCommentContent, postContent, showcaseContent, storyContent } from "./social/content";
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

export const CONTENT_KINDS: Partial<Record<Exclude<CommunityTargetType, "member">, ContentAdapter>> = {
  // Area B
  post: postContent,
  post_comment: postCommentContent,
  showcase_comment: postCommentContent,
  story: storyContent,
  showcase: showcaseContent,
  // Area C
  event: eventContent,
  event_comment: eventCommentContent,
  challenge_submission: challengeSubmissionContent,
};
