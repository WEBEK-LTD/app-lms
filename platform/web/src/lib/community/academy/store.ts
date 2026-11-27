/**
 * 233 Yallapp Academy's data (area B, migration 0170): courses, their
 * lessons (video or article) and quizzes, who may open a course (free, or
 * bought on the website: area C's checkout calls grantCourseAccess),
 * progress and certificates. A course's price is stored here for the
 * website's checkout only and never leaves lib/community/academy through
 * the Community API: the app shows a lock, never a price.
 */

export type CourseStatus = "draft" | "published";
export type LessonKind = "video" | "article";
export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type AccessSource = "free" | "bought" | "granted";

export interface CourseRecord {
  id: string;
  tenant: string;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  level: CourseLevel;
  language: "en" | "ar" | "tr";
  status: CourseStatus;
  /** The admin marked it free: every member opens it. */
  free: boolean;
  /** For the website's checkout only (minor units, e.g. kuruş). */
  priceMinor: number | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface LessonRecord {
  id: string;
  courseId: string;
  position: number;
  title: string;
  kind: LessonKind;
  /** An article's Markdown; a video's notes. */
  body: string;
  videoUrl: string | null;
  durationSeconds: number;
  /** Opens for everyone, as a taste of a locked course. */
  preview: boolean;
  createdAt: Date;
}

export interface QuizQuestionRecord {
  id: string;
  lessonId: string;
  position: number;
  prompt: string;
  options: string[];
  /** The right option's index; never sent to the app. */
  answer: number;
}

export interface AccessRecord {
  tenant: string;
  memberId: string;
  courseId: string;
  source: AccessSource;
  /** The checkout's reference for a bought course (area C), so a repeat changes nothing. */
  ref: string | null;
  grantedAt: Date;
}

export interface ProgressRecord {
  memberId: string;
  lessonId: string;
  courseId: string;
  completedAt: Date | null;
  /** The best quiz score, 0–100; null before a try. */
  quizScore: number | null;
  attempts: number;
}

export interface CertificateRecord {
  id: string;
  tenant: string;
  /** The public code: /academy/certificates/{code}. */
  code: string;
  memberId: string;
  courseId: string;
  /** As they were on the day, so the certificate never changes. */
  memberName: string;
  courseTitle: string;
  issuedAt: Date;
}

export interface AcademyStore {
  createCourse(course: CourseRecord): Promise<void>;
  getCourse(id: string): Promise<CourseRecord | null>;
  getCourseBySlug(tenant: string, slug: string): Promise<CourseRecord | null>;
  updateCourse(id: string, patch: Partial<Omit<CourseRecord, "id" | "tenant">>): Promise<void>;
  listCourses(tenant: string, statuses: readonly CourseStatus[]): Promise<CourseRecord[]>;

  createLesson(lesson: LessonRecord): Promise<void>;
  getLesson(id: string): Promise<LessonRecord | null>;
  updateLesson(id: string, patch: Partial<Omit<LessonRecord, "id" | "courseId">>): Promise<void>;
  deleteLesson(id: string): Promise<void>;
  /** By position. */
  listLessons(courseIds: readonly string[]): Promise<LessonRecord[]>;

  /** Replaces a lesson's quiz. */
  setQuiz(lessonId: string, questions: readonly QuizQuestionRecord[]): Promise<void>;
  /** By lesson, then position. */
  quizOf(lessonIds: readonly string[]): Promise<QuizQuestionRecord[]>;

  /** False when the member could already open it (nothing changes). */
  grantAccess(access: AccessRecord): Promise<boolean>;
  accessOf(memberId: string, courseIds?: readonly string[]): Promise<AccessRecord[]>;

  /** Insert or replace a member's progress on a lesson. */
  saveProgress(progress: ProgressRecord): Promise<void>;
  progressOf(memberId: string, courseIds: readonly string[]): Promise<ProgressRecord[]>;

  /** False when the member already has this course's certificate. */
  createCertificate(certificate: CertificateRecord): Promise<boolean>;
  certificateFor(memberId: string, courseId: string): Promise<CertificateRecord | null>;
  certificateByCode(code: string): Promise<CertificateRecord | null>;
}
