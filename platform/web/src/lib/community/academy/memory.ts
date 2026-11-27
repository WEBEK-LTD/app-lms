import type { AcademyStore, AccessRecord, CertificateRecord, CourseRecord, CourseStatus, LessonRecord, ProgressRecord, QuizQuestionRecord } from "./store";

const copy = <T>(v: T): T => structuredClone(v);

/** 233 The Academy in memory (tests, and the website without a database). */
export class MemoryAcademyStore implements AcademyStore {
  private readonly courses = new Map<string, CourseRecord>();
  private readonly lessons = new Map<string, LessonRecord>();
  private readonly quiz = new Map<string, QuizQuestionRecord[]>();
  private readonly access: AccessRecord[] = [];
  private readonly progress = new Map<string, ProgressRecord>();
  private readonly certificates: CertificateRecord[] = [];

  async createCourse(course: CourseRecord) {
    if ([...this.courses.values()].some((c) => c.tenant === course.tenant && c.slug === course.slug)) throw new Error("Duplicate entry for community_courses_slug");
    this.courses.set(course.id, copy(course));
  }
  async getCourse(id: string) {
    const c = this.courses.get(id);
    return c ? copy(c) : null;
  }
  async getCourseBySlug(tenant: string, slug: string) {
    const c = [...this.courses.values()].find((x) => x.tenant === tenant && x.slug === slug);
    return c ? copy(c) : null;
  }
  async updateCourse(id: string, patch: Partial<Omit<CourseRecord, "id" | "tenant">>) {
    const c = this.courses.get(id);
    if (c) this.courses.set(id, { ...c, ...copy(patch) });
  }
  async listCourses(tenant: string, statuses: readonly CourseStatus[]) {
    return [...this.courses.values()]
      .filter((c) => c.tenant === tenant && statuses.includes(c.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
      .map(copy);
  }

  async createLesson(lesson: LessonRecord) {
    this.lessons.set(lesson.id, copy(lesson));
  }
  async getLesson(id: string) {
    const l = this.lessons.get(id);
    return l ? copy(l) : null;
  }
  async updateLesson(id: string, patch: Partial<Omit<LessonRecord, "id" | "courseId">>) {
    const l = this.lessons.get(id);
    if (l) this.lessons.set(id, { ...l, ...copy(patch) });
  }
  async deleteLesson(id: string) {
    this.lessons.delete(id);
    this.quiz.delete(id);
    for (const [k, p] of this.progress) if (p.lessonId === id) this.progress.delete(k);
  }
  async listLessons(courseIds: readonly string[]) {
    return [...this.lessons.values()]
      .filter((l) => courseIds.includes(l.courseId))
      .sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime())
      .map(copy);
  }

  async setQuiz(lessonId: string, questions: readonly QuizQuestionRecord[]) {
    this.quiz.set(lessonId, copy([...questions]));
  }
  async quizOf(lessonIds: readonly string[]) {
    return lessonIds.flatMap((id) => [...(this.quiz.get(id) ?? [])].sort((a, b) => a.position - b.position)).map(copy);
  }

  async grantAccess(access: AccessRecord) {
    if (this.access.some((a) => a.memberId === access.memberId && a.courseId === access.courseId)) return false;
    this.access.push(copy(access));
    return true;
  }
  async accessOf(memberId: string, courseIds?: readonly string[]) {
    return this.access.filter((a) => a.memberId === memberId && (!courseIds || courseIds.includes(a.courseId))).map(copy);
  }

  async saveProgress(progress: ProgressRecord) {
    this.progress.set(`${progress.memberId}:${progress.lessonId}`, copy(progress));
  }
  async progressOf(memberId: string, courseIds: readonly string[]) {
    return [...this.progress.values()].filter((p) => p.memberId === memberId && courseIds.includes(p.courseId)).map(copy);
  }

  async createCertificate(certificate: CertificateRecord) {
    if (this.certificates.some((c) => c.memberId === certificate.memberId && c.courseId === certificate.courseId)) return false;
    this.certificates.push(copy(certificate));
    return true;
  }
  async certificateFor(memberId: string, courseId: string) {
    const c = this.certificates.find((x) => x.memberId === memberId && x.courseId === courseId);
    return c ? copy(c) : null;
  }
  async certificateByCode(code: string) {
    const c = this.certificates.find((x) => x.code === code);
    return c ? copy(c) : null;
  }
}
