import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { communityCertificates, communityCourseAccess, communityCourses, communityLessonProgress, communityLessons, communityQuizQuestions } from "../../db/community-b2-schema";
import type { AcademyStore, AccessRecord, CertificateRecord, CourseRecord, CourseStatus, LessonRecord, ProgressRecord, QuizQuestionRecord } from "./store";

type Db = MySql2Database<Record<string, never>>;
const affected = (result: unknown) => ((result as [{ affectedRows?: number }])[0]?.affectedRows ?? 0) > 0;

/** 233 The Academy on MySQL or MariaDB (migration 0170). */
export class MysqlAcademyStore implements AcademyStore {
  private readonly db: Db;
  constructor(db: unknown) {
    this.db = db as Db;
  }

  async createCourse(course: CourseRecord) {
    await this.db.insert(communityCourses).values(course);
  }
  async getCourse(id: string) {
    const [row] = await this.db.select().from(communityCourses).where(eq(communityCourses.id, id)).limit(1);
    return (row as CourseRecord | undefined) ?? null;
  }
  async getCourseBySlug(tenant: string, slug: string) {
    const c = communityCourses;
    const [row] = await this.db.select().from(c).where(and(eq(c.tenant, tenant), eq(c.slug, slug))).limit(1);
    return (row as CourseRecord | undefined) ?? null;
  }
  async updateCourse(id: string, patch: Partial<Omit<CourseRecord, "id" | "tenant">>) {
    if (Object.keys(patch).length) await this.db.update(communityCourses).set(patch).where(eq(communityCourses.id, id));
  }
  async listCourses(tenant: string, statuses: readonly CourseStatus[]) {
    if (!statuses.length) return [];
    const c = communityCourses;
    return (await this.db.select().from(c).where(and(eq(c.tenant, tenant), inArray(c.status, [...statuses]))).orderBy(desc(c.createdAt), desc(c.id))) as CourseRecord[];
  }

  async createLesson(lesson: LessonRecord) {
    await this.db.insert(communityLessons).values(lesson);
  }
  async getLesson(id: string) {
    const [row] = await this.db.select().from(communityLessons).where(eq(communityLessons.id, id)).limit(1);
    return (row as LessonRecord | undefined) ?? null;
  }
  async updateLesson(id: string, patch: Partial<Omit<LessonRecord, "id" | "courseId">>) {
    if (Object.keys(patch).length) await this.db.update(communityLessons).set(patch).where(eq(communityLessons.id, id));
  }
  async deleteLesson(id: string) {
    await this.db.delete(communityLessons).where(eq(communityLessons.id, id));
  }
  async listLessons(courseIds: readonly string[]) {
    if (!courseIds.length) return [];
    const l = communityLessons;
    return (await this.db.select().from(l).where(inArray(l.courseId, [...courseIds])).orderBy(asc(l.position), asc(l.createdAt))) as LessonRecord[];
  }

  async setQuiz(lessonId: string, questions: readonly QuizQuestionRecord[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(communityQuizQuestions).where(eq(communityQuizQuestions.lessonId, lessonId));
      if (questions.length) await tx.insert(communityQuizQuestions).values([...questions]);
    });
  }
  async quizOf(lessonIds: readonly string[]) {
    if (!lessonIds.length) return [];
    const q = communityQuizQuestions;
    return (await this.db.select().from(q).where(inArray(q.lessonId, [...lessonIds])).orderBy(asc(q.lessonId), asc(q.position))) as QuizQuestionRecord[];
  }

  async grantAccess(access: AccessRecord) {
    // The row's key (member, course) decides: a second grant changes nothing.
    return affected(await this.db.insert(communityCourseAccess).ignore().values(access));
  }
  async accessOf(memberId: string, courseIds?: readonly string[]) {
    const a = communityCourseAccess;
    if (courseIds && !courseIds.length) return [];
    return (await this.db
      .select()
      .from(a)
      .where(and(eq(a.memberId, memberId), courseIds ? inArray(a.courseId, [...courseIds]) : undefined))
      .orderBy(desc(a.grantedAt))) as AccessRecord[];
  }

  async saveProgress(progress: ProgressRecord) {
    const { courseId, completedAt, quizScore, attempts } = progress;
    await this.db.insert(communityLessonProgress).values(progress).onDuplicateKeyUpdate({ set: { courseId, completedAt, quizScore, attempts } });
  }
  async progressOf(memberId: string, courseIds: readonly string[]) {
    if (!courseIds.length) return [];
    const p = communityLessonProgress;
    return (await this.db.select().from(p).where(and(eq(p.memberId, memberId), inArray(p.courseId, [...courseIds])))) as ProgressRecord[];
  }

  async createCertificate(certificate: CertificateRecord) {
    return affected(await this.db.insert(communityCertificates).ignore().values(certificate));
  }
  async certificateFor(memberId: string, courseId: string) {
    const c = communityCertificates;
    const [row] = await this.db.select().from(c).where(and(eq(c.memberId, memberId), eq(c.courseId, courseId))).limit(1);
    return (row as CertificateRecord | undefined) ?? null;
  }
  async certificateByCode(code: string) {
    const [row] = await this.db.select().from(communityCertificates).where(eq(communityCertificates.code, code)).limit(1);
    return (row as CertificateRecord | undefined) ?? null;
  }
}
