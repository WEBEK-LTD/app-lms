import type { CommentRecord, CommentTarget, MediaRecord, PostFilter, PostRecord, ReactionKind, ReactionTarget, ShowcaseFilter, ShowcaseRecord, SocialStatus, SocialStore, StoryRecord } from "./store";

const copy = <T>(value: T): T => structuredClone(value);
const pageOf = <T>(items: T[], page: { offset: number; limit: number }) => items.slice(page.offset, page.offset + page.limit);
const shown = (statuses: readonly SocialStatus[], status: SocialStatus, authorId: string, orAuthorId?: string | null) => statuses.includes(status) || (!!orAuthorId && authorId === orAuthorId && status !== "removed");

/** 232 Posts, comments, likes, stories and the showcase in memory: tests and local runs. */
export class MemorySocialStore implements SocialStore {
  private media = new Map<string, MediaRecord>();
  private posts = new Map<string, PostRecord>();
  private comments = new Map<string, CommentRecord>();
  private reactions = new Map<string, Date>();
  private stories = new Map<string, StoryRecord>();
  private views = new Map<string, Date>();
  private showcase = new Map<string, ShowcaseRecord>();

  async createMedia(media: MediaRecord) {
    this.media.set(media.id, copy(media));
  }
  async getMedia(ids: readonly string[]) {
    return ids.map((id) => this.media.get(id)).filter((m): m is MediaRecord => !!m).map(copy);
  }
  async useMedia(ownerId: string, ids: readonly string[], by: string) {
    const taken: string[] = [];
    for (const id of ids) {
      const m = this.media.get(id);
      if (m && m.ownerId === ownerId && !m.usedBy) {
        m.usedBy = by;
        taken.push(id);
      }
    }
    return taken;
  }

  async createPost(post: PostRecord) {
    this.posts.set(post.id, copy(post));
  }
  async getPost(id: string) {
    const p = this.posts.get(id);
    return p ? copy(p) : null;
  }
  async updatePost(id: string, patch: Partial<Omit<PostRecord, "id" | "tenant">>) {
    const p = this.posts.get(id);
    if (p) Object.assign(p, copy(patch));
  }
  async listPosts(filter: PostFilter, page: { offset: number; limit: number }) {
    const out = [...this.posts.values()].filter(
      (p) =>
        p.tenant === filter.tenant &&
        shown(filter.statuses, p.status, p.authorId, filter.orAuthorId) &&
        (!filter.authorIds || filter.authorIds.includes(p.authorId)) &&
        !filter.excludeAuthorIds?.includes(p.authorId) &&
        (filter.groupId === undefined || p.groupId === filter.groupId) &&
        (!filter.ids || filter.ids.includes(p.id)),
    );
    out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    return pageOf(out, page).map(copy);
  }

  async createComment(comment: CommentRecord) {
    this.comments.set(comment.id, copy(comment));
  }
  async getComment(id: string) {
    const c = this.comments.get(id);
    return c ? copy(c) : null;
  }
  async updateComment(id: string, patch: Partial<Pick<CommentRecord, "body" | "status">>) {
    const c = this.comments.get(id);
    if (c) Object.assign(c, patch);
  }
  async listComments(filter: { targetType: CommentTarget; targetId: string; parentId: string | null; statuses: readonly SocialStatus[]; orAuthorId?: string | null; excludeAuthorIds?: readonly string[] }, page: { offset: number; limit: number }) {
    const out = [...this.comments.values()].filter(
      (c) => c.targetType === filter.targetType && c.targetId === filter.targetId && c.parentId === filter.parentId && shown(filter.statuses, c.status, c.authorId, filter.orAuthorId) && !filter.excludeAuthorIds?.includes(c.authorId),
    );
    out.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    return pageOf(out, page).map(copy);
  }
  async replyCounts(commentIds: readonly string[]) {
    const out: Record<string, number> = Object.fromEntries(commentIds.map((id) => [id, 0]));
    for (const c of this.comments.values()) if (c.parentId && c.parentId in out && c.status === "published") out[c.parentId]!++;
    return out;
  }

  async addCounts(target: ReactionTarget | "post", id: string, by: { likes?: number; comments?: number }) {
    const row = target === "post" ? this.posts.get(id) : target === "showcase" ? this.showcase.get(id) : this.comments.get(id);
    if (!row) return;
    if (by.likes) row.likeCount = Math.max(0, row.likeCount + by.likes);
    if (by.comments && "commentCount" in row) row.commentCount = Math.max(0, row.commentCount + by.comments);
  }

  async setReaction(memberId: string, kind: ReactionKind, targetType: ReactionTarget, targetId: string, on: boolean, now: Date) {
    const key = `${memberId}|${kind}|${targetType}|${targetId}`;
    if (on === this.reactions.has(key)) return false;
    if (on) this.reactions.set(key, now);
    else this.reactions.delete(key);
    return true;
  }
  async reactionsOf(memberId: string, kind: ReactionKind, targetType: ReactionTarget, targetIds: readonly string[]) {
    return targetIds.filter((id) => this.reactions.has(`${memberId}|${kind}|${targetType}|${id}`));
  }
  async savedBy(memberId: string, targetType: ReactionTarget, page: { offset: number; limit: number }) {
    const prefix = `${memberId}|save|${targetType}|`;
    const out = [...this.reactions.entries()].filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1].getTime() - a[1].getTime());
    return pageOf(out, page).map(([k]) => k.slice(prefix.length));
  }

  async createStory(story: StoryRecord) {
    this.stories.set(story.id, copy(story));
  }
  async getStory(id: string) {
    const s = this.stories.get(id);
    return s ? copy(s) : null;
  }
  async updateStory(id: string, patch: Partial<Pick<StoryRecord, "status">>) {
    const s = this.stories.get(id);
    if (s) Object.assign(s, patch);
  }
  async listStories(filter: { tenant: string; authorIds: readonly string[]; statuses: readonly SocialStatus[]; now: Date }) {
    return [...this.stories.values()]
      .filter((s) => s.tenant === filter.tenant && filter.authorIds.includes(s.authorId) && filter.statuses.includes(s.status) && s.expiresAt.getTime() > filter.now.getTime())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(copy);
  }
  async addStoryView(storyId: string, viewerId: string, now: Date) {
    const key = `${storyId}|${viewerId}`;
    if (this.views.has(key)) return false;
    this.views.set(key, now);
    const s = this.stories.get(storyId);
    if (s) s.viewCount++;
    return true;
  }
  async storyViewers(storyId: string) {
    return [...this.views.entries()]
      .filter(([k]) => k.startsWith(`${storyId}|`))
      .map(([k, at]) => ({ viewerId: k.slice(storyId.length + 1), viewedAt: at }))
      .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime());
  }
  async seenStories(viewerId: string, storyIds: readonly string[]) {
    return storyIds.filter((id) => this.views.has(`${id}|${viewerId}`));
  }

  async createShowcase(item: ShowcaseRecord) {
    this.showcase.set(item.id, copy(item));
  }
  async getShowcase(id: string) {
    const s = this.showcase.get(id);
    return s ? copy(s) : null;
  }
  async updateShowcase(id: string, patch: Partial<Omit<ShowcaseRecord, "id" | "tenant">>) {
    const s = this.showcase.get(id);
    if (s) Object.assign(s, copy(patch));
  }
  async listShowcase(filter: ShowcaseFilter, order: "newest" | "liked", page: { offset: number; limit: number }) {
    const out = [...this.showcase.values()].filter(
      (s) =>
        s.tenant === filter.tenant &&
        shown(filter.statuses, s.status, s.authorId, filter.orAuthorId) &&
        (!filter.authorId || s.authorId === filter.authorId) &&
        (!filter.appType || s.appType === filter.appType) &&
        !filter.excludeAuthorIds?.includes(s.authorId) &&
        (!filter.ids || filter.ids.includes(s.id)),
    );
    out.sort((a, b) => (order === "liked" ? b.likeCount - a.likeCount : 0) || b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    return pageOf(out, page).map(copy);
  }
}
