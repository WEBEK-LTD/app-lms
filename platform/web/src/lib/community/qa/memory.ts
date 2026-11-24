import type { AnswerRecord, PointEvent, PointReason, QaStore, QuestionFilter, QuestionOrder, QuestionRecord, ReplyRecord, SectionRecord, TagRecord, TutorialRecord } from "./store";
import type { BookmarkKind, ContentStatus, VoteKind, VoteValue } from "./types";
import { randomUUID } from "node:crypto";

/** 231 The Q&A kept in memory: tests and the e2e server (`YALLAPP_DATA=memory`). */
export class MemoryQaStore implements QaStore {
  private sections = new Map<string, SectionRecord>();
  private follows = new Set<string>();
  private tags = new Map<string, TagRecord>();
  private questions = new Map<string, QuestionRecord>();
  private answers = new Map<string, AnswerRecord>();
  private replies = new Map<string, ReplyRecord>();
  private votes = new Map<string, VoteValue>();
  private bookmarks = new Map<string, Date>();
  private tutorials = new Map<string, TutorialRecord>();
  private points: PointEvent[] = [];

  async listSections() {
    return [...this.sections.values()].sort((a, b) => a.sort - b.sort || a.slug.localeCompare(b.slug)).map((s) => structuredClone(s));
  }
  async upsertSection(section: SectionRecord) {
    const same = [...this.sections.values()].find((s) => s.slug === section.slug);
    this.sections.set(same?.id ?? section.id, { ...structuredClone(section), id: same?.id ?? section.id });
  }
  async followedSectionIds(memberId: string) {
    return [...this.follows].filter((k) => k.startsWith(`${memberId}|`)).map((k) => k.split("|")[1]!);
  }
  async setSectionFollow(memberId: string, sectionId: string, on: boolean) {
    if (on) this.follows.add(`${memberId}|${sectionId}`);
    else this.follows.delete(`${memberId}|${sectionId}`);
  }
  async listTags(filter: { ids?: readonly string[]; slugs?: readonly string[]; prefix?: string; limit?: number } = {}) {
    let out = [...this.tags.values()];
    if (filter.ids) out = out.filter((t) => filter.ids!.includes(t.id));
    if (filter.slugs) out = out.filter((t) => filter.slugs!.includes(t.slug));
    if (filter.prefix) out = out.filter((t) => t.slug.startsWith(filter.prefix!) || t.name.toLocaleLowerCase("en").startsWith(filter.prefix!));
    out.sort((a, b) => a.slug.localeCompare(b.slug));
    return (filter.limit ? out.slice(0, filter.limit) : out).map((t) => ({ ...t }));
  }
  async ensureTag(slug: string, name: string) {
    const had = [...this.tags.values()].find((t) => t.slug === slug);
    if (had) return { ...had };
    const tag = { id: randomUUID(), slug, name };
    this.tags.set(tag.id, tag);
    return { ...tag };
  }
  async countQuestionsBy() {
    const sections: Record<string, number> = {};
    const tags: Record<string, number> = {};
    for (const q of this.questions.values()) {
      if (q.status !== "published") continue;
      sections[q.sectionId] = (sections[q.sectionId] ?? 0) + 1;
      for (const t of q.tagIds) tags[t] = (tags[t] ?? 0) + 1;
    }
    return { sections, tags };
  }

  async createQuestion(q: QuestionRecord) {
    let slug = q.slug;
    for (let n = 2; [...this.questions.values()].some((x) => x.slug === slug); n++) slug = `${q.slug}-${n}`;
    const made = { ...structuredClone(q), slug };
    this.questions.set(q.id, made);
    return structuredClone(made);
  }
  async getQuestion(id: string) {
    const q = this.questions.get(id);
    return q ? structuredClone(q) : null;
  }
  async getQuestionBySlug(slug: string) {
    const q = [...this.questions.values()].find((x) => x.slug === slug);
    return q ? structuredClone(q) : null;
  }
  async updateQuestion(id: string, patch: Partial<Omit<QuestionRecord, "id">>) {
    const q = this.questions.get(id);
    if (q) this.questions.set(id, { ...q, ...structuredClone(patch) });
  }
  private matches(q: QuestionRecord, f: QuestionFilter): boolean {
    const shown = !f.statuses || f.statuses.includes(q.status) || (f.orAuthorId != null && q.authorId === f.orAuthorId);
    if (!shown) return false;
    if (f.sectionIds && !f.sectionIds.includes(q.sectionId)) return false;
    if (f.tagId && !q.tagIds.includes(f.tagId)) return false;
    if (f.authorId && q.authorId !== f.authorId) return false;
    if (f.unanswered && q.answerCount > 0) return false;
    if (f.since && q.createdAt < f.since) return false;
    if (f.ids && !f.ids.includes(q.id)) return false;
    if (f.excludeAuthorIds?.includes(q.authorId)) return false;
    if (f.words?.length) {
      const text = `${q.title} ${q.body}`.normalize("NFKC").toLocaleLowerCase("en");
      if (!f.words.every((w) => text.includes(w))) return false;
    }
    return true;
  }
  async listQuestions(filter: QuestionFilter, order: QuestionOrder, page: { offset: number; limit: number }) {
    const key: Record<QuestionOrder, (q: QuestionRecord) => number> = {
      latest: (q) => q.createdAt.getTime(),
      active: (q) => q.lastActivityAt.getTime(),
      score: (q) => q.score * 1e13 + q.createdAt.getTime(),
    };
    return [...this.questions.values()]
      .filter((q) => this.matches(q, filter))
      .sort((a, b) => key[order](b) - key[order](a) || b.id.localeCompare(a.id))
      .slice(page.offset, page.offset + page.limit)
      .map((q) => structuredClone(q));
  }
  async countQuestions(filter: QuestionFilter) {
    return [...this.questions.values()].filter((q) => this.matches(q, filter)).length;
  }
  async addQuestionView(id: string) {
    const q = this.questions.get(id);
    if (q) q.views += 1;
  }

  async createAnswer(a: AnswerRecord) {
    this.answers.set(a.id, structuredClone(a));
    return structuredClone(a);
  }
  async getAnswer(id: string) {
    const a = this.answers.get(id);
    return a ? structuredClone(a) : null;
  }
  async updateAnswer(id: string, patch: Partial<Omit<AnswerRecord, "id">>) {
    const a = this.answers.get(id);
    if (a) this.answers.set(id, { ...a, ...structuredClone(patch) });
  }
  async listAnswers(questionIds: readonly string[], filter: { statuses?: readonly ContentStatus[]; orAuthorId?: string | null } = {}) {
    return [...this.answers.values()]
      .filter((a) => questionIds.includes(a.questionId) && (!filter.statuses || filter.statuses.includes(a.status) || (filter.orAuthorId != null && a.authorId === filter.orAuthorId)))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => structuredClone(a));
  }
  async countAnswers(filter: { authorId: string; statuses?: readonly ContentStatus[]; accepted?: boolean }) {
    const accepted = new Set([...this.questions.values()].map((q) => q.acceptedAnswerId).filter(Boolean));
    return [...this.answers.values()].filter((a) => a.authorId === filter.authorId && (!filter.statuses || filter.statuses.includes(a.status)) && (filter.accepted === undefined || accepted.has(a.id) === filter.accepted)).length;
  }
  async createReply(r: ReplyRecord) {
    this.replies.set(r.id, structuredClone(r));
    return structuredClone(r);
  }
  async getReply(id: string) {
    const r = this.replies.get(id);
    return r ? structuredClone(r) : null;
  }
  async updateReply(id: string, patch: Partial<Omit<ReplyRecord, "id">>) {
    const r = this.replies.get(id);
    if (r) this.replies.set(id, { ...r, ...structuredClone(patch) });
  }
  async listReplies(answerIds: readonly string[], filter: { statuses?: readonly ContentStatus[]; orAuthorId?: string | null } = {}) {
    return [...this.replies.values()]
      .filter((r) => answerIds.includes(r.answerId) && (!filter.statuses || filter.statuses.includes(r.status) || (filter.orAuthorId != null && r.authorId === filter.orAuthorId)))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((r) => structuredClone(r));
  }

  async getVote(memberId: string, kind: VoteKind, targetId: string) {
    return this.votes.get(`${memberId}|${kind}|${targetId}`) ?? 0;
  }
  async setVote(memberId: string, kind: VoteKind, targetId: string, value: VoteValue) {
    const key = `${memberId}|${kind}|${targetId}`;
    const before = this.votes.get(key) ?? 0;
    if (value === 0) this.votes.delete(key);
    else this.votes.set(key, value);
    return before;
  }
  async votesOf(memberId: string, kind: VoteKind, targetIds: readonly string[]) {
    return Object.fromEntries(targetIds.map((id) => [id, this.votes.get(`${memberId}|${kind}|${id}`) ?? 0])) as Record<string, VoteValue>;
  }
  async setBookmark(memberId: string, kind: BookmarkKind, targetId: string, on: boolean, now: Date) {
    const key = `${memberId}|${kind}|${targetId}`;
    if (on) this.bookmarks.set(key, now);
    else this.bookmarks.delete(key);
  }
  async bookmarksOf(memberId: string, kind: BookmarkKind, targetIds?: readonly string[]) {
    const prefix = `${memberId}|${kind}|`;
    return [...this.bookmarks.entries()]
      .filter(([k]) => k.startsWith(prefix))
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([k]) => k.slice(prefix.length))
      .filter((id) => !targetIds || targetIds.includes(id));
  }

  async createTutorial(t: TutorialRecord) {
    let slug = t.slug;
    for (let n = 2; [...this.tutorials.values()].some((x) => x.slug === slug); n++) slug = `${t.slug}-${n}`;
    const made = { ...structuredClone(t), slug };
    this.tutorials.set(t.id, made);
    return structuredClone(made);
  }
  async getTutorial(id: string) {
    const t = this.tutorials.get(id);
    return t ? structuredClone(t) : null;
  }
  async getTutorialBySlug(slug: string) {
    const t = [...this.tutorials.values()].find((x) => x.slug === slug);
    return t ? structuredClone(t) : null;
  }
  async updateTutorial(id: string, patch: Partial<Omit<TutorialRecord, "id">>) {
    const t = this.tutorials.get(id);
    if (t) this.tutorials.set(id, { ...t, ...structuredClone(patch) });
  }
  async listTutorials(filter: Parameters<QaStore["listTutorials"]>[0], page: { offset: number; limit: number }) {
    return [...this.tutorials.values()]
      .filter(
        (t) =>
          (!filter.statuses || filter.statuses.includes(t.status)) &&
          (!filter.sectionId || t.sectionId === filter.sectionId) &&
          (!filter.level || t.level === filter.level) &&
          (!filter.language || t.language === filter.language) &&
          (!filter.kind || t.kind === filter.kind) &&
          (!filter.authorId || t.authorId === filter.authorId) &&
          (!filter.words?.length || filter.words.every((w) => `${t.title} ${t.summary} ${t.body}`.normalize("NFKC").toLocaleLowerCase("en").includes(w))),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
      .slice(page.offset, page.offset + page.limit)
      .map((t) => structuredClone(t));
  }
  async addTutorialView(id: string) {
    const t = this.tutorials.get(id);
    if (t) t.views += 1;
  }

  async addPoints(e: PointEvent) {
    this.points.push({ ...e });
  }
  async removePoints(memberId: string, reason: PointReason, ref: string) {
    this.points = this.points.filter((p) => !(p.memberId === memberId && p.reason === reason && p.ref === ref));
  }
  async pointsOf(memberIds: readonly string[]) {
    const out: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
    for (const p of this.points) if (p.memberId in out) out[p.memberId]! += p.points;
    return out;
  }
  async topEarners(since: Date, limit: number) {
    const sums = new Map<string, number>();
    for (const p of this.points) if (p.createdAt >= since) sums.set(p.memberId, (sums.get(p.memberId) ?? 0) + p.points);
    return [...sums.entries()]
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([memberId, points]) => ({ memberId, points }));
  }
  async lastActivityOf(memberId: string) {
    const dates = [
      ...[...this.questions.values()].filter((q) => q.authorId === memberId).map((q) => q.createdAt),
      ...[...this.answers.values()].filter((a) => a.authorId === memberId).map((a) => a.createdAt),
      ...[...this.replies.values()].filter((r) => r.authorId === memberId).map((r) => r.createdAt),
    ];
    return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
  }
}
