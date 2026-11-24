import { and, asc, count, desc, eq, exists, gte, inArray, isNotNull, like, max, notInArray, or, sql, sum, type SQL } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import type mysql from "mysql2/promise";
import {
  communityAnswers,
  communityBookmarks,
  communityPointEvents,
  communityQuestions,
  communityQuestionTags,
  communityReplies,
  communitySectionFollows,
  communitySections,
  communityTags,
  communityTutorials,
  communityVotes,
} from "../../db/community-schema";
import type { AnswerRecord, PointEvent, PointReason, QaStore, QuestionFilter, QuestionOrder, QuestionRecord, ReplyRecord, SectionRecord, TagRecord, TutorialFilter, TutorialRecord } from "./store";
import type { BookmarkKind, CommunityLang, ContentStatus, SectionKind, VoteKind, VoteValue } from "./types";
import { randomUUID } from "node:crypto";

/**
 * 231 The Q&A and tutorials in the database (MySQL or MariaDB): the
 * community_* tables of lib/db/community-schema.ts (migrations 0155 and
 * 0156). Text matching uses the tables' case-insensitive collation.
 */

type Db = MySql2Database<Record<string, never>>;

const isDuplicate = (e: unknown) => {
  let current: unknown = e;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    if ((current as { code?: string }).code === "ER_DUP_ENTRY") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
};

/** A word as LIKE's pattern: its own % and _ escaped. */
const likeOf = (w: string) => `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const fullNames = (names: Partial<Record<CommunityLang, string>>): Record<CommunityLang, string> => {
  const en = names.en ?? names.ar ?? names.tr ?? "";
  return { en, ar: names.ar ?? en, tr: names.tr ?? en };
};

export class MysqlQaStore implements QaStore {
  private readonly db: Db;

  /** On a pool, or on the community's drizzle database (lib/community/store/mysql.ts). */
  constructor(source: mysql.Pool | MySql2Database<never>) {
    // Positional: drizzle takes `{ client, mode }` without a schema for the client itself (its config check needs `schema`).
    this.db = "select" in source ? (source as unknown as Db) : (drizzle(source) as Db);
  }

  // ——— Sections and tags ———

  async listSections(kind: SectionKind): Promise<SectionRecord[]> {
    const rows = await this.db.select().from(communitySections).where(eq(communitySections.kind, kind)).orderBy(asc(communitySections.position), asc(communitySections.slug));
    return rows.map((r) => ({ id: r.id, kind: r.kind, slug: r.slug, names: fullNames(r.names), icon: r.icon, position: r.position }));
  }

  async upsertSection(s: SectionRecord): Promise<void> {
    await this.db
      .insert(communitySections)
      .values({ id: s.id, kind: s.kind, slug: s.slug, names: s.names, icon: s.icon, position: s.position, createdAt: new Date() })
      .onDuplicateKeyUpdate({ set: { names: s.names, icon: s.icon, position: s.position } });
  }

  async followedSectionIds(memberId: string): Promise<string[]> {
    return (await this.db.select({ id: communitySectionFollows.sectionId }).from(communitySectionFollows).where(eq(communitySectionFollows.memberId, memberId))).map((r) => r.id);
  }

  async setSectionFollow(memberId: string, sectionId: string, on: boolean, now: Date): Promise<void> {
    if (on) await this.db.insert(communitySectionFollows).ignore().values({ memberId, sectionId, createdAt: now });
    else await this.db.delete(communitySectionFollows).where(and(eq(communitySectionFollows.memberId, memberId), eq(communitySectionFollows.sectionId, sectionId)));
  }

  async listTags(filter: { ids?: readonly string[]; slugs?: readonly string[]; prefix?: string; limit?: number } = {}): Promise<TagRecord[]> {
    const where: SQL[] = [];
    if (filter.ids) {
      if (!filter.ids.length) return [];
      where.push(inArray(communityTags.id, [...filter.ids]));
    }
    if (filter.slugs) {
      if (!filter.slugs.length) return [];
      where.push(inArray(communityTags.slug, [...filter.slugs]));
    }
    if (filter.prefix) {
      const p = `${filter.prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push(or(like(communityTags.slug, p), like(communityTags.name, p))!);
    }
    const q = this.db.select({ id: communityTags.id, slug: communityTags.slug, name: communityTags.name }).from(communityTags).where(and(...where)).orderBy(asc(communityTags.slug));
    return filter.limit ? q.limit(filter.limit) : q;
  }

  async ensureTag(slug: string, name: string, now: Date): Promise<TagRecord> {
    await this.db.insert(communityTags).ignore().values({ id: randomUUID(), slug, name, useCount: 0, createdAt: now });
    const [tag] = await this.db.select({ id: communityTags.id, slug: communityTags.slug, name: communityTags.name }).from(communityTags).where(eq(communityTags.slug, slug)).limit(1);
    return tag!;
  }

  async counts() {
    const [sections, tags, tutorials] = await Promise.all([
      this.db.select({ id: communityQuestions.sectionId, n: count() }).from(communityQuestions).where(eq(communityQuestions.status, "published")).groupBy(communityQuestions.sectionId),
      this.db
        .select({ id: communityQuestionTags.tagId, n: count() })
        .from(communityQuestionTags)
        .innerJoin(communityQuestions, eq(communityQuestions.id, communityQuestionTags.questionId))
        .where(eq(communityQuestions.status, "published"))
        .groupBy(communityQuestionTags.tagId),
      this.db.select({ id: communityTutorials.sectionId, n: count() }).from(communityTutorials).where(eq(communityTutorials.status, "published")).groupBy(communityTutorials.sectionId),
    ]);
    const map = (rows: { id: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r.id, Number(r.n)]));
    return { questionSections: map(sections), tags: map(tags), tutorialSections: map(tutorials) };
  }

  // ——— Questions ———

  private question(r: typeof communityQuestions.$inferSelect, tagIds: string[]): QuestionRecord {
    return {
      id: r.id,
      slug: r.slug,
      sectionId: r.sectionId,
      tagIds,
      title: r.title,
      body: r.body,
      authorId: r.authorId,
      status: r.status as ContentStatus,
      language: r.language,
      viewCount: r.viewCount,
      answerCount: r.answerCount,
      score: r.score,
      acceptedAnswerId: r.acceptedAnswerId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      lastActivityAt: r.lastActivityAt,
    };
  }

  /** Each question's tags in the order they were given (kept in its `tags` column). */
  private async withTags(rows: (typeof communityQuestions.$inferSelect)[]): Promise<QuestionRecord[]> {
    return rows.map((r) => this.question(r, Array.isArray(r.tags) ? r.tags : []));
  }

  private async setTags(questionId: string, tagIds: readonly string[]): Promise<void> {
    await this.db.delete(communityQuestionTags).where(eq(communityQuestionTags.questionId, questionId));
    if (tagIds.length) await this.db.insert(communityQuestionTags).ignore().values(tagIds.map((tagId) => ({ questionId, tagId })));
  }

  async createQuestion(q: QuestionRecord): Promise<QuestionRecord> {
    for (let n = 1; ; n++) {
      const slug = n === 1 ? q.slug : `${q.slug.slice(0, 150)}-${n}`;
      try {
        await this.db.insert(communityQuestions).values({
          id: q.id,
          authorId: q.authorId,
          sectionId: q.sectionId,
          slug,
          title: q.title,
          body: q.body,
          language: q.language,
          // The tags' ids in the order given; community_question_tags finds questions by tag.
          tags: q.tagIds,
          status: q.status,
          acceptedAnswerId: q.acceptedAnswerId,
          score: q.score,
          answerCount: q.answerCount,
          viewCount: q.viewCount,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          lastActivityAt: q.lastActivityAt,
        });
        await this.setTags(q.id, q.tagIds);
        return { ...q, slug };
      } catch (e) {
        if (!isDuplicate(e) || n > 50) throw e;
      }
    }
  }

  async getQuestion(id: string): Promise<QuestionRecord | null> {
    const [row] = await this.withTags(await this.db.select().from(communityQuestions).where(eq(communityQuestions.id, id)).limit(1));
    return row ?? null;
  }

  async getQuestionBySlug(slug: string): Promise<QuestionRecord | null> {
    const [row] = await this.withTags(await this.db.select().from(communityQuestions).where(eq(communityQuestions.slug, slug)).limit(1));
    return row ?? null;
  }

  async updateQuestion(id: string, patch: Partial<Omit<QuestionRecord, "id">>): Promise<void> {
    const { tagIds, viewCount, ...rest } = patch;
    const set: Partial<typeof communityQuestions.$inferInsert> = { ...rest, ...(viewCount !== undefined ? { viewCount } : {}), ...(tagIds ? { tags: tagIds } : {}) };
    if (Object.keys(set).length) await this.db.update(communityQuestions).set(set).where(eq(communityQuestions.id, id));
    if (tagIds) await this.setTags(id, tagIds);
  }

  async addAnswerCount(id: string, by: number, lastActivityAt: Date | null): Promise<void> {
    await this.db
      .update(communityQuestions)
      .set({ answerCount: sql`GREATEST(0, ${communityQuestions.answerCount} + ${by})`, ...(lastActivityAt ? { lastActivityAt } : {}) })
      .where(eq(communityQuestions.id, id));
  }

  private questionWhere(f: QuestionFilter): SQL | undefined {
    const q = communityQuestions;
    const where: (SQL | undefined)[] = [];
    if (f.statuses) where.push(f.orAuthorId != null ? or(inArray(q.status, [...f.statuses]), eq(q.authorId, f.orAuthorId)) : inArray(q.status, [...f.statuses]));
    if (f.sectionIds) where.push(f.sectionIds.length ? inArray(q.sectionId, [...f.sectionIds]) : sql`false`);
    if (f.tagId) where.push(exists(this.db.select({ one: sql`1` }).from(communityQuestionTags).where(and(eq(communityQuestionTags.questionId, q.id), eq(communityQuestionTags.tagId, f.tagId)))));
    if (f.authorIds) where.push(f.authorIds.length ? inArray(q.authorId, [...f.authorIds]) : sql`false`);
    if (f.language) where.push(eq(q.language, f.language));
    if (f.unanswered) where.push(eq(q.answerCount, 0));
    if (f.answered) where.push(isNotNull(q.acceptedAnswerId));
    if (f.official)
      where.push(exists(this.db.select({ one: sql`1` }).from(communityAnswers).where(and(eq(communityAnswers.questionId, q.id), eq(communityAnswers.official, true), eq(communityAnswers.status, "published")))));
    if (f.since) where.push(gte(q.createdAt, f.since));
    if (f.ids) where.push(f.ids.length ? inArray(q.id, [...f.ids]) : sql`false`);
    if (f.excludeAuthorIds?.length) where.push(notInArray(q.authorId, [...f.excludeAuthorIds]));
    for (const w of f.words ?? []) where.push(or(like(q.title, likeOf(w)), like(q.body, likeOf(w))));
    return and(...where);
  }

  async listQuestions(filter: QuestionFilter, order: QuestionOrder, page: { offset: number; limit: number }): Promise<QuestionRecord[]> {
    const q = communityQuestions;
    const by = order === "newest" ? [desc(q.createdAt), desc(q.id)] : order === "active" ? [desc(q.lastActivityAt), desc(q.id)] : [desc(q.score), desc(q.createdAt), desc(q.id)];
    return this.withTags(
      await this.db
        .select()
        .from(q)
        .where(this.questionWhere(filter))
        .orderBy(...by)
        .limit(page.limit)
        .offset(page.offset),
    );
  }

  async countQuestions(filter: QuestionFilter): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(communityQuestions).where(this.questionWhere(filter));
    return Number(row?.n ?? 0);
  }

  async withOfficialAnswer(questionIds: readonly string[]): Promise<string[]> {
    if (!questionIds.length) return [];
    const rows = await this.db
      .selectDistinct({ id: communityAnswers.questionId })
      .from(communityAnswers)
      .where(and(inArray(communityAnswers.questionId, [...questionIds]), eq(communityAnswers.official, true), eq(communityAnswers.status, "published")));
    return rows.map((r) => r.id);
  }

  async addQuestionView(id: string): Promise<void> {
    await this.db.update(communityQuestions).set({ viewCount: sql`${communityQuestions.viewCount} + 1` }).where(eq(communityQuestions.id, id));
  }

  // ——— Answers and replies ———

  private answer(r: typeof communityAnswers.$inferSelect): AnswerRecord {
    return { id: r.id, questionId: r.questionId, body: r.body, authorId: r.authorId, status: r.status as ContentStatus, official: r.official, score: r.score, replyCount: r.replyCount, createdAt: r.createdAt, updatedAt: r.updatedAt };
  }

  async createAnswer(a: AnswerRecord): Promise<AnswerRecord> {
    await this.db.insert(communityAnswers).values({ ...a });
    return { ...a };
  }

  async getAnswer(id: string): Promise<AnswerRecord | null> {
    const [row] = await this.db.select().from(communityAnswers).where(eq(communityAnswers.id, id)).limit(1);
    return row ? this.answer(row) : null;
  }

  async updateAnswer(id: string, patch: Partial<Omit<AnswerRecord, "id">>): Promise<void> {
    if (Object.keys(patch).length) await this.db.update(communityAnswers).set(patch).where(eq(communityAnswers.id, id));
  }

  async addReplyCount(id: string, by: number): Promise<void> {
    await this.db
      .update(communityAnswers)
      .set({ replyCount: sql`GREATEST(0, ${communityAnswers.replyCount} + ${by})` })
      .where(eq(communityAnswers.id, id));
  }

  private shownWhere(status: typeof communityAnswers.status | typeof communityReplies.status, author: typeof communityAnswers.authorId | typeof communityReplies.authorId, f: { statuses?: readonly ContentStatus[]; orAuthorId?: string | null }): SQL | undefined {
    if (!f.statuses) return undefined;
    return f.orAuthorId != null ? or(inArray(status, [...f.statuses]), eq(author, f.orAuthorId)) : inArray(status, [...f.statuses]);
  }

  async listAnswers(questionIds: readonly string[], filter: { statuses?: readonly ContentStatus[]; orAuthorId?: string | null } = {}): Promise<AnswerRecord[]> {
    if (!questionIds.length) return [];
    const a = communityAnswers;
    const rows = await this.db
      .select()
      .from(a)
      .where(and(inArray(a.questionId, [...questionIds]), this.shownWhere(a.status, a.authorId, filter)))
      .orderBy(asc(a.createdAt), asc(a.id));
    return rows.map((r) => this.answer(r));
  }

  async countAnswers(filter: { authorId: string; statuses?: readonly ContentStatus[]; accepted?: boolean }): Promise<number> {
    const a = communityAnswers;
    const where = and(eq(a.authorId, filter.authorId), filter.statuses ? inArray(a.status, [...filter.statuses]) : undefined);
    if (filter.accepted === undefined) {
      const [row] = await this.db.select({ n: count() }).from(a).where(where);
      return Number(row?.n ?? 0);
    }
    const acceptedQuery = exists(this.db.select({ one: sql`1` }).from(communityQuestions).where(eq(communityQuestions.acceptedAnswerId, a.id)));
    const [row] = await this.db
      .select({ n: count() })
      .from(a)
      .where(and(where, filter.accepted ? acceptedQuery : sql`not ${acceptedQuery}`));
    return Number(row?.n ?? 0);
  }

  async answersBy(authorId: string, limit: number): Promise<AnswerRecord[]> {
    const rows = await this.db.select().from(communityAnswers).where(eq(communityAnswers.authorId, authorId)).orderBy(desc(communityAnswers.createdAt), desc(communityAnswers.id)).limit(limit);
    return rows.map((r) => this.answer(r));
  }

  async createReply(r: ReplyRecord): Promise<ReplyRecord> {
    await this.db.insert(communityReplies).values({ ...r });
    return { ...r };
  }

  async getReply(id: string): Promise<ReplyRecord | null> {
    const [row] = await this.db.select().from(communityReplies).where(eq(communityReplies.id, id)).limit(1);
    return row ? { ...row, status: row.status as ContentStatus } : null;
  }

  async updateReply(id: string, patch: Partial<Omit<ReplyRecord, "id">>): Promise<void> {
    if (Object.keys(patch).length) await this.db.update(communityReplies).set(patch).where(eq(communityReplies.id, id));
  }

  async listReplies(answerIds: readonly string[], filter: { statuses?: readonly ContentStatus[]; orAuthorId?: string | null } = {}): Promise<ReplyRecord[]> {
    if (!answerIds.length) return [];
    const r = communityReplies;
    const rows = await this.db
      .select()
      .from(r)
      .where(and(inArray(r.answerId, [...answerIds]), this.shownWhere(r.status, r.authorId, filter)))
      .orderBy(asc(r.createdAt), asc(r.id));
    return rows.map((row) => ({ ...row, status: row.status as ContentStatus }));
  }

  // ——— Votes and bookmarks ———

  async getVote(memberId: string, kind: VoteKind, targetId: string): Promise<VoteValue> {
    const v = communityVotes;
    const [row] = await this.db.select({ value: v.value }).from(v).where(and(eq(v.memberId, memberId), eq(v.targetType, kind), eq(v.targetId, targetId))).limit(1);
    return (row?.value ?? 0) as VoteValue;
  }

  async castVote(memberId: string, kind: VoteKind, targetId: string, value: VoteValue, now: Date): Promise<{ before: VoteValue; score: number }> {
    const post = kind === "question" ? communityQuestions : communityAnswers;
    const v = communityVotes;
    return this.db.transaction(async (tx) => {
      // The post's row first: every vote on it waits here, so the vote read below is the latest.
      const [locked] = await tx.select({ score: post.score }).from(post).where(eq(post.id, targetId)).for("update");
      if (!locked) return { before: 0 as VoteValue, score: 0 };
      const [had] = await tx.select({ value: v.value }).from(v).where(and(eq(v.memberId, memberId), eq(v.targetType, kind), eq(v.targetId, targetId)));
      const before = (had?.value ?? 0) as VoteValue;
      if (value === before) return { before, score: locked.score };
      if (value === 0) await tx.delete(v).where(and(eq(v.memberId, memberId), eq(v.targetType, kind), eq(v.targetId, targetId)));
      else await tx.insert(v).values({ memberId, targetType: kind, targetId, value, createdAt: now }).onDuplicateKeyUpdate({ set: { value, createdAt: now } });
      await tx.update(post).set({ score: sql`${post.score} + ${value - before}` }).where(eq(post.id, targetId));
      return { before, score: locked.score + value - before };
    });
  }

  async votesOf(memberId: string, kind: VoteKind, targetIds: readonly string[]): Promise<Record<string, VoteValue>> {
    const out: Record<string, VoteValue> = Object.fromEntries(targetIds.map((id) => [id, 0 as VoteValue]));
    if (!targetIds.length) return out;
    const v = communityVotes;
    for (const row of await this.db.select({ id: v.targetId, value: v.value }).from(v).where(and(eq(v.memberId, memberId), eq(v.targetType, kind), inArray(v.targetId, [...targetIds])))) out[row.id] = row.value as VoteValue;
    return out;
  }

  async setBookmark(memberId: string, kind: BookmarkKind, targetId: string, on: boolean, now: Date): Promise<void> {
    const b = communityBookmarks;
    if (on) await this.db.insert(b).ignore().values({ memberId, targetType: kind, targetId, createdAt: now });
    else await this.db.delete(b).where(and(eq(b.memberId, memberId), eq(b.targetType, kind), eq(b.targetId, targetId)));
  }

  async bookmarksOf(memberId: string, kind: BookmarkKind, targetIds?: readonly string[]): Promise<string[]> {
    if (targetIds && !targetIds.length) return [];
    const b = communityBookmarks;
    const rows = await this.db
      .select({ id: b.targetId })
      .from(b)
      .where(and(eq(b.memberId, memberId), eq(b.targetType, kind), targetIds ? inArray(b.targetId, [...targetIds]) : undefined))
      .orderBy(desc(b.createdAt), desc(b.targetId));
    return rows.map((r) => r.id);
  }

  // ——— Tutorials ———

  private tutorial(r: typeof communityTutorials.$inferSelect): TutorialRecord {
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      kind: r.kind,
      sectionId: r.sectionId,
      level: r.level,
      language: r.language,
      body: r.body,
      videoUrl: r.videoUrl,
      durationSeconds: r.durationSeconds || (r.durationMinutes ?? 0) * 60,
      coverUrl: r.coverUrl,
      tags: Array.isArray(r.tags) ? r.tags : [],
      authorId: r.authorId,
      official: r.official,
      status: (r.status === "draft" ? "pending" : r.status) as ContentStatus,
      viewCount: r.viewCount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      publishedAt: r.publishedAt,
    };
  }

  async createTutorial(t: TutorialRecord): Promise<TutorialRecord> {
    for (let n = 1; ; n++) {
      const slug = n === 1 ? t.slug : `${t.slug.slice(0, 110)}-${n}`;
      try {
        await this.db.insert(communityTutorials).values({ ...t, slug, durationMinutes: Math.max(1, Math.ceil(t.durationSeconds / 60)) });
        return { ...t, slug };
      } catch (e) {
        if (!isDuplicate(e) || n > 50) throw e;
      }
    }
  }

  async getTutorial(id: string): Promise<TutorialRecord | null> {
    const [row] = await this.db.select().from(communityTutorials).where(eq(communityTutorials.id, id)).limit(1);
    return row ? this.tutorial(row) : null;
  }

  async getTutorialBySlug(slug: string): Promise<TutorialRecord | null> {
    const [row] = await this.db.select().from(communityTutorials).where(eq(communityTutorials.slug, slug)).limit(1);
    return row ? this.tutorial(row) : null;
  }

  async updateTutorial(id: string, patch: Partial<Omit<TutorialRecord, "id">>): Promise<void> {
    const set: Partial<typeof communityTutorials.$inferInsert> = { ...patch, ...(patch.durationSeconds !== undefined ? { durationMinutes: Math.max(1, Math.ceil(patch.durationSeconds / 60)) } : {}) };
    if (Object.keys(set).length) await this.db.update(communityTutorials).set(set).where(eq(communityTutorials.id, id));
  }

  private tutorialWhere(f: TutorialFilter): SQL | undefined {
    const t = communityTutorials;
    const where: (SQL | undefined)[] = [];
    if (f.statuses) where.push(inArray(t.status, [...f.statuses]));
    if (f.sectionId) where.push(eq(t.sectionId, f.sectionId));
    if (f.level) where.push(eq(t.level, f.level));
    if (f.language) where.push(eq(t.language, f.language));
    if (f.kind) where.push(eq(t.kind, f.kind));
    if (f.authorId) where.push(eq(t.authorId, f.authorId));
    if (f.ids) where.push(f.ids.length ? inArray(t.id, [...f.ids]) : sql`false`);
    for (const w of f.words ?? []) where.push(or(like(t.title, likeOf(w)), like(t.summary, likeOf(w)), like(t.body, likeOf(w))));
    return and(...where);
  }

  async listTutorials(filter: TutorialFilter, page: { offset: number; limit: number }): Promise<TutorialRecord[]> {
    const t = communityTutorials;
    const rows = await this.db
      .select()
      .from(t)
      .where(this.tutorialWhere(filter))
      .orderBy(desc(sql`COALESCE(${t.publishedAt}, ${t.createdAt})`), desc(t.id))
      .limit(page.limit)
      .offset(page.offset);
    return rows.map((r) => this.tutorial(r));
  }

  async countTutorials(filter: TutorialFilter): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(communityTutorials).where(this.tutorialWhere(filter));
    return Number(row?.n ?? 0);
  }

  async addTutorialView(id: string): Promise<void> {
    await this.db.update(communityTutorials).set({ viewCount: sql`${communityTutorials.viewCount} + 1` }).where(eq(communityTutorials.id, id));
  }

  // ——— Points ———

  async addPoints(e: PointEvent): Promise<boolean> {
    // Once per member, reason and ref (the unique key of migration 0157): a repeat changes nothing.
    const [result] = await this.db.insert(communityPointEvents).ignore().values({ ...e });
    return (result as { affectedRows?: number }).affectedRows === 1;
  }

  async removePoints(memberId: string, reason: PointReason, ref: string): Promise<number> {
    const p = communityPointEvents;
    return this.db.transaction(async (tx) => {
      const rows = await tx.select({ points: p.points }).from(p).where(and(eq(p.memberId, memberId), eq(p.reason, reason), eq(p.ref, ref))).for("update");
      if (!rows.length) return 0;
      await tx.delete(p).where(and(eq(p.memberId, memberId), eq(p.reason, reason), eq(p.ref, ref)));
      return rows.reduce((total, r) => total + r.points, 0);
    });
  }

  async pointsOf(memberIds: readonly string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
    if (!memberIds.length) return out;
    const p = communityPointEvents;
    for (const row of await this.db.select({ id: p.memberId, n: sum(p.points) }).from(p).where(inArray(p.memberId, [...memberIds])).groupBy(p.memberId)) out[row.id] = Number(row.n ?? 0);
    return out;
  }

  async topEarners(since: Date, limit: number): Promise<{ memberId: string; points: number }[]> {
    const p = communityPointEvents;
    const total = sql<number>`SUM(${p.points})`;
    const rows = await this.db
      .select({ memberId: p.memberId, points: total })
      .from(p)
      .where(gte(p.createdAt, since))
      .groupBy(p.memberId)
      .having(sql`SUM(${p.points}) > 0`)
      .orderBy(desc(total), asc(p.memberId))
      .limit(limit);
    return rows.map((r) => ({ memberId: r.memberId, points: Number(r.points) }));
  }

  async lastActivityOf(memberId: string): Promise<Date | null> {
    const [q, a, r] = await Promise.all([
      this.db.select({ at: max(communityQuestions.createdAt) }).from(communityQuestions).where(eq(communityQuestions.authorId, memberId)),
      this.db.select({ at: max(communityAnswers.createdAt) }).from(communityAnswers).where(eq(communityAnswers.authorId, memberId)),
      this.db.select({ at: max(communityReplies.createdAt) }).from(communityReplies).where(eq(communityReplies.authorId, memberId)),
    ]);
    const dates = [q[0]?.at, a[0]?.at, r[0]?.at].filter((d): d is Date => d instanceof Date);
    return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  }
}
