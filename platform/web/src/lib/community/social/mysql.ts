import { and, asc, count, desc, eq, gt, inArray, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { communityMedia, communityPostComments, communityPosts, communityReactions, communityShowcase, communityStories, communityStoryViews } from "../../db/community-b2-schema";
import type { CommentRecord, CommentTarget, MediaRecord, PostFilter, PostRecord, ReactionKind, ReactionTarget, ShowcaseFilter, ShowcaseRecord, SocialStatus, SocialStore, StoryRecord } from "./store";

type Db = MySql2Database<Record<string, never>>;
const affected = (result: unknown) => ((result as [{ affectedRows?: number }])[0]?.affectedRows ?? 0) > 0;

/** 232 Posts, comments, likes, stories and the showcase on MySQL or MariaDB (migration 0169). */
export class MysqlSocialStore implements SocialStore {
  private readonly db: Db;
  constructor(db: unknown) {
    this.db = db as Db;
  }

  // ——— Media ———

  async createMedia(media: MediaRecord): Promise<void> {
    await this.db.insert(communityMedia).values(media);
  }
  async getMedia(ids: readonly string[]): Promise<MediaRecord[]> {
    if (!ids.length) return [];
    return (await this.db.select().from(communityMedia).where(inArray(communityMedia.id, [...ids]))) as MediaRecord[];
  }
  async useMedia(ownerId: string, ids: readonly string[], by: string): Promise<string[]> {
    if (!ids.length) return [];
    const m = communityMedia;
    await this.db.update(m).set({ usedBy: by }).where(and(inArray(m.id, [...ids]), eq(m.ownerId, ownerId), isNull(m.usedBy)));
    const rows = await this.db.select({ id: m.id }).from(m).where(and(inArray(m.id, [...ids]), eq(m.usedBy, by)));
    return rows.map((r) => r.id);
  }

  // ——— Posts ———

  async createPost(post: PostRecord): Promise<void> {
    await this.db.insert(communityPosts).values(post);
  }
  async getPost(id: string): Promise<PostRecord | null> {
    const [row] = await this.db.select().from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
    return (row as PostRecord | undefined) ?? null;
  }
  async updatePost(id: string, patch: Partial<Omit<PostRecord, "id" | "tenant">>): Promise<void> {
    if (Object.keys(patch).length) await this.db.update(communityPosts).set(patch).where(eq(communityPosts.id, id));
  }
  async listPosts(filter: PostFilter, page: { offset: number; limit: number }): Promise<PostRecord[]> {
    const p = communityPosts;
    const where: (SQL | undefined)[] = [eq(p.tenant, filter.tenant), shownWhere(p.status, p.authorId, filter.statuses, filter.orAuthorId)];
    if (filter.authorIds) where.push(filter.authorIds.length ? inArray(p.authorId, [...filter.authorIds]) : sql`false`);
    if (filter.excludeAuthorIds?.length) where.push(notInArray(p.authorId, [...filter.excludeAuthorIds]));
    if (filter.groupId === null) where.push(isNull(p.groupId));
    else if (filter.groupId !== undefined) where.push(eq(p.groupId, filter.groupId));
    if (filter.ids) where.push(filter.ids.length ? inArray(p.id, [...filter.ids]) : sql`false`);
    return (await this.db.select().from(p).where(and(...where)).orderBy(desc(p.createdAt), desc(p.id)).limit(page.limit).offset(page.offset)) as PostRecord[];
  }

  // ——— Comments ———

  async createComment(comment: CommentRecord): Promise<void> {
    await this.db.insert(communityPostComments).values(comment);
  }
  async getComment(id: string): Promise<CommentRecord | null> {
    const [row] = await this.db.select().from(communityPostComments).where(eq(communityPostComments.id, id)).limit(1);
    return (row as CommentRecord | undefined) ?? null;
  }
  async updateComment(id: string, patch: Partial<Pick<CommentRecord, "body" | "status">>): Promise<void> {
    if (Object.keys(patch).length) await this.db.update(communityPostComments).set(patch).where(eq(communityPostComments.id, id));
  }
  async listComments(filter: { targetType: CommentTarget; targetId: string; parentId: string | null; statuses: readonly SocialStatus[]; orAuthorId?: string | null; excludeAuthorIds?: readonly string[] }, page: { offset: number; limit: number }): Promise<CommentRecord[]> {
    const c = communityPostComments;
    const where: (SQL | undefined)[] = [eq(c.targetType, filter.targetType), eq(c.targetId, filter.targetId), filter.parentId ? eq(c.parentId, filter.parentId) : isNull(c.parentId), shownWhere(c.status, c.authorId, filter.statuses, filter.orAuthorId)];
    if (filter.excludeAuthorIds?.length) where.push(notInArray(c.authorId, [...filter.excludeAuthorIds]));
    return (await this.db.select().from(c).where(and(...where)).orderBy(asc(c.createdAt), asc(c.id)).limit(page.limit).offset(page.offset)) as CommentRecord[];
  }
  async replyCounts(commentIds: readonly string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = Object.fromEntries(commentIds.map((id) => [id, 0]));
    if (!commentIds.length) return out;
    const c = communityPostComments;
    for (const row of await this.db.select({ id: c.parentId, n: count() }).from(c).where(and(inArray(c.parentId, [...commentIds]), eq(c.status, "published"))).groupBy(c.parentId)) out[row.id!] = row.n;
    return out;
  }

  // ——— Counters ———

  async addCounts(target: ReactionTarget | "post", id: string, by: { likes?: number; comments?: number }): Promise<void> {
    const table = target === "post" ? communityPosts : target === "showcase" ? communityShowcase : communityPostComments;
    const set: Record<string, SQL> = {};
    if (by.likes) set.likeCount = sql`GREATEST(0, ${table.likeCount} + ${by.likes})`;
    if (by.comments && target !== "comment") {
      const counted = table as typeof communityPosts;
      set.commentCount = sql`GREATEST(0, ${counted.commentCount} + ${by.comments})`;
    }
    if (Object.keys(set).length) await this.db.update(table).set(set as never).where(eq(table.id, id));
  }

  // ——— Likes and saves ———

  async setReaction(memberId: string, kind: ReactionKind, targetType: ReactionTarget, targetId: string, on: boolean, now: Date): Promise<boolean> {
    const r = communityReactions;
    // The row's key decides: an insert that finds it, or a delete that doesn't, changes nothing.
    if (on) return affected(await this.db.insert(r).ignore().values({ memberId, kind, targetType, targetId, createdAt: now }));
    return affected(await this.db.delete(r).where(and(eq(r.memberId, memberId), eq(r.kind, kind), eq(r.targetType, targetType), eq(r.targetId, targetId))));
  }
  async reactionsOf(memberId: string, kind: ReactionKind, targetType: ReactionTarget, targetIds: readonly string[]): Promise<string[]> {
    if (!targetIds.length) return [];
    const r = communityReactions;
    const rows = await this.db.select({ id: r.targetId }).from(r).where(and(eq(r.memberId, memberId), eq(r.kind, kind), eq(r.targetType, targetType), inArray(r.targetId, [...targetIds])));
    return rows.map((row) => row.id);
  }
  async savedBy(memberId: string, targetType: ReactionTarget, page: { offset: number; limit: number }): Promise<string[]> {
    const r = communityReactions;
    const rows = await this.db.select({ id: r.targetId }).from(r).where(and(eq(r.memberId, memberId), eq(r.kind, "save"), eq(r.targetType, targetType))).orderBy(desc(r.createdAt)).limit(page.limit).offset(page.offset);
    return rows.map((row) => row.id);
  }

  // ——— Stories ———

  async createStory(story: StoryRecord): Promise<void> {
    await this.db.insert(communityStories).values(story);
  }
  async getStory(id: string): Promise<StoryRecord | null> {
    const [row] = await this.db.select().from(communityStories).where(eq(communityStories.id, id)).limit(1);
    return (row as StoryRecord | undefined) ?? null;
  }
  async updateStory(id: string, patch: Partial<Pick<StoryRecord, "status">>): Promise<void> {
    if (Object.keys(patch).length) await this.db.update(communityStories).set(patch).where(eq(communityStories.id, id));
  }
  async listStories(filter: { tenant: string; authorIds: readonly string[]; statuses: readonly SocialStatus[]; now: Date }): Promise<StoryRecord[]> {
    if (!filter.authorIds.length || !filter.statuses.length) return [];
    const s = communityStories;
    return (await this.db
      .select()
      .from(s)
      .where(and(eq(s.tenant, filter.tenant), inArray(s.authorId, [...filter.authorIds]), inArray(s.status, [...filter.statuses]), gt(s.expiresAt, filter.now)))
      .orderBy(asc(s.createdAt))) as StoryRecord[];
  }
  async addStoryView(storyId: string, viewerId: string, now: Date): Promise<boolean> {
    const added = affected(await this.db.insert(communityStoryViews).ignore().values({ storyId, viewerId, viewedAt: now }));
    if (added) await this.db.update(communityStories).set({ viewCount: sql`${communityStories.viewCount} + 1` }).where(eq(communityStories.id, storyId));
    return added;
  }
  async storyViewers(storyId: string): Promise<{ viewerId: string; viewedAt: Date }[]> {
    const v = communityStoryViews;
    return this.db.select({ viewerId: v.viewerId, viewedAt: v.viewedAt }).from(v).where(eq(v.storyId, storyId)).orderBy(desc(v.viewedAt));
  }
  async seenStories(viewerId: string, storyIds: readonly string[]): Promise<string[]> {
    if (!storyIds.length) return [];
    const v = communityStoryViews;
    return (await this.db.select({ id: v.storyId }).from(v).where(and(eq(v.viewerId, viewerId), inArray(v.storyId, [...storyIds])))).map((r) => r.id);
  }

  // ——— Showcase ———

  async createShowcase(item: ShowcaseRecord): Promise<void> {
    await this.db.insert(communityShowcase).values(item);
  }
  async getShowcase(id: string): Promise<ShowcaseRecord | null> {
    const [row] = await this.db.select().from(communityShowcase).where(eq(communityShowcase.id, id)).limit(1);
    return (row as ShowcaseRecord | undefined) ?? null;
  }
  async updateShowcase(id: string, patch: Partial<Omit<ShowcaseRecord, "id" | "tenant">>): Promise<void> {
    if (Object.keys(patch).length) await this.db.update(communityShowcase).set(patch).where(eq(communityShowcase.id, id));
  }
  async listShowcase(filter: ShowcaseFilter, order: "newest" | "liked", page: { offset: number; limit: number }): Promise<ShowcaseRecord[]> {
    const s = communityShowcase;
    const where: (SQL | undefined)[] = [eq(s.tenant, filter.tenant), shownWhere(s.status, s.authorId, filter.statuses, filter.orAuthorId)];
    if (filter.authorId) where.push(eq(s.authorId, filter.authorId));
    if (filter.appType) where.push(eq(s.appType, filter.appType));
    if (filter.excludeAuthorIds?.length) where.push(notInArray(s.authorId, [...filter.excludeAuthorIds]));
    if (filter.ids) where.push(filter.ids.length ? inArray(s.id, [...filter.ids]) : sql`false`);
    const orderBy = order === "liked" ? [desc(s.likeCount), desc(s.createdAt), desc(s.id)] : [desc(s.createdAt), desc(s.id)];
    return (await this.db.select().from(s).where(and(...where)).orderBy(...orderBy).limit(page.limit).offset(page.offset)) as ShowcaseRecord[];
  }
}

/** Published (or the given statuses), or the member's own whatever it is short of removed. */
function shownWhere(status: AnyMySqlColumn, authorId: AnyMySqlColumn, statuses: readonly SocialStatus[], orAuthorId?: string | null): SQL | undefined {
  const shown = statuses.length ? inArray(status, [...statuses]) : sql`false`;
  return orAuthorId ? or(shown, and(eq(authorId, orAuthorId), sql`${status} <> 'removed'`)) : shown;
}
