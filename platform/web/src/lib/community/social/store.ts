/**
 * 232 Members connect (area B): posts with photos and video, their
 * comments and replies, likes and saves; 24-hour stories and who saw them;
 * the showcase of apps members built. Every record is a tenant's (Yallapp
 * Community is "yallapp"; a client app's community is its app id). Kept in
 * memory for tests and local runs, in the database otherwise (the
 * community_* tables of lib/db/community-schema.ts, migration 0169).
 */

export type SocialStatus = "pending" | "published" | "removed";
export type MediaKind = "image" | "video";

export interface MediaRecord {
  id: string;
  tenant: string;
  ownerId: string;
  kind: MediaKind;
  url: string;
  /** A video's still, chosen by the member; null for an image. */
  posterUrl: string | null;
  contentType: string;
  size: number;
  /** What it was used in ("post:…", "story:…", "showcase:…"); null until then, and then it can't be used again. */
  usedBy: string | null;
  createdAt: Date;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string;
}

export interface PostRecord {
  id: string;
  tenant: string;
  authorId: string;
  /** A group's post (area A's groups); null on the feed. */
  groupId: string | null;
  body: string;
  mediaIds: string[];
  link: LinkPreview | null;
  status: SocialStatus;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentTarget = "post" | "showcase";

export interface CommentRecord {
  id: string;
  tenant: string;
  targetType: CommentTarget;
  targetId: string;
  /** A reply's comment; null for a comment on the post itself. */
  parentId: string | null;
  authorId: string;
  body: string;
  status: SocialStatus;
  likeCount: number;
  createdAt: Date;
}

export interface StoryRecord {
  id: string;
  tenant: string;
  authorId: string;
  mediaId: string;
  status: SocialStatus;
  viewCount: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface ShowcaseRecord {
  id: string;
  tenant: string;
  authorId: string;
  title: string;
  description: string;
  mediaIds: string[];
  /** The kind of app (a shop, a restaurant, courses…), for the gallery's filter. */
  appType: string;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  webUrl: string | null;
  /** The Yallapp app it is, when the member says so; checked against their linked account. */
  yallappAppId: string | null;
  /** "Made with Yallapp": the app is one of the linked account's. */
  verified: boolean;
  status: SocialStatus;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ReactionKind = "like" | "save";
export type ReactionTarget = "post" | "comment" | "showcase";

export interface PostFilter {
  tenant: string;
  statuses: readonly SocialStatus[];
  /** Also the member's own whatever their status. */
  orAuthorId?: string | null;
  authorIds?: readonly string[];
  excludeAuthorIds?: readonly string[];
  /** null: the feed's posts (no group's); a group's id: that group's. */
  groupId?: string | null;
  ids?: readonly string[];
}

export interface ShowcaseFilter {
  tenant: string;
  statuses: readonly SocialStatus[];
  orAuthorId?: string | null;
  authorId?: string;
  appType?: string;
  excludeAuthorIds?: readonly string[];
  ids?: readonly string[];
}

export interface SocialStore {
  // Media
  createMedia(media: MediaRecord): Promise<void>;
  getMedia(ids: readonly string[]): Promise<MediaRecord[]>;
  /** Marks unused media of this owner as used by `by`; the ids it took (any already used, or another's, are left out). */
  useMedia(ownerId: string, ids: readonly string[], by: string): Promise<string[]>;

  // Posts
  createPost(post: PostRecord): Promise<void>;
  getPost(id: string): Promise<PostRecord | null>;
  updatePost(id: string, patch: Partial<Omit<PostRecord, "id" | "tenant">>): Promise<void>;
  /** Newest first. */
  listPosts(filter: PostFilter, page: { offset: number; limit: number }): Promise<PostRecord[]>;

  // Comments
  createComment(comment: CommentRecord): Promise<void>;
  getComment(id: string): Promise<CommentRecord | null>;
  updateComment(id: string, patch: Partial<Pick<CommentRecord, "body" | "status">>): Promise<void>;
  /** Oldest first: a target's comments (parentId null) or a comment's replies. */
  listComments(filter: { targetType: CommentTarget; targetId: string; parentId: string | null; statuses: readonly SocialStatus[]; orAuthorId?: string | null; excludeAuthorIds?: readonly string[] }, page: { offset: number; limit: number }): Promise<CommentRecord[]>;
  /** How many published replies each of these comments has. */
  replyCounts(commentIds: readonly string[]): Promise<Record<string, number>>;

  // Counters, moved by a change in one step (never below 0)
  addCounts(target: ReactionTarget | "post", id: string, by: { likes?: number; comments?: number }): Promise<void>;

  // Likes and saves
  /** Sets one; whether it changed (false: it was already so), so a repeated like counts once. */
  setReaction(memberId: string, kind: ReactionKind, targetType: ReactionTarget, targetId: string, on: boolean, now: Date): Promise<boolean>;
  reactionsOf(memberId: string, kind: ReactionKind, targetType: ReactionTarget, targetIds: readonly string[]): Promise<string[]>;
  /** The member's saved ones of this kind, the last saved first. */
  savedBy(memberId: string, targetType: ReactionTarget, page: { offset: number; limit: number }): Promise<string[]>;

  // Stories
  createStory(story: StoryRecord): Promise<void>;
  getStory(id: string): Promise<StoryRecord | null>;
  updateStory(id: string, patch: Partial<Pick<StoryRecord, "status">>): Promise<void>;
  /** Unexpired ones of these authors, oldest first. */
  listStories(filter: { tenant: string; authorIds: readonly string[]; statuses: readonly SocialStatus[]; now: Date }): Promise<StoryRecord[]>;
  /** Records the view once per viewer (and counts it); whether it was new. */
  addStoryView(storyId: string, viewerId: string, now: Date): Promise<boolean>;
  /** Who saw it, the last first. */
  storyViewers(storyId: string): Promise<{ viewerId: string; viewedAt: Date }[]>;
  /** Of these stories, those the viewer saw. */
  seenStories(viewerId: string, storyIds: readonly string[]): Promise<string[]>;

  // Showcase
  createShowcase(item: ShowcaseRecord): Promise<void>;
  getShowcase(id: string): Promise<ShowcaseRecord | null>;
  updateShowcase(id: string, patch: Partial<Omit<ShowcaseRecord, "id" | "tenant">>): Promise<void>;
  listShowcase(filter: ShowcaseFilter, order: "newest" | "liked", page: { offset: number; limit: number }): Promise<ShowcaseRecord[]>;
}
