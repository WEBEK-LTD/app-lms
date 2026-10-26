import { createHmac, timingSafeEqual } from "node:crypto";
import type { Course, CourseLesson, CourseQuiz, CourseSetup, CourseTopic, LessonProgress, QuizAttempt } from "../data/types";

/**
 * 90.1 Academies without a website: quizzes at the end of topics, files
 * with lessons, lessons that open some days after enrolling (drip), access
 * that ends some days after enrolling, and certificates for students who
 * finish (every lesson completed and every quiz passed).
 */

const DAY = 86_400_000;

export const QUIZ_LIMITS = { questions: 50, options: 8, text: 500, title: 120 } as const;

export function quizzesOf(course: Course): CourseQuiz[] {
  return course.topics.flatMap((t) => t.quizzes ?? []);
}

/** A topic's items in order: its lessons, then its quizzes. */
export function topicItems(topic: CourseTopic): ({ kind: "lesson"; lesson: CourseLesson } | { kind: "quiz"; quiz: CourseQuiz })[] {
  return [...topic.lessons.map((lesson) => ({ kind: "lesson" as const, lesson })), ...(topic.quizzes ?? []).map((quiz) => ({ kind: "quiz" as const, quiz }))];
}

export function findQuiz(setup: CourseSetup, quizId: number): { course: Course; quiz: CourseQuiz } | null {
  for (const course of setup.courses) {
    const quiz = quizzesOf(course).find((q) => q.id === quizId);
    if (quiz) return { course, quiz };
  }
  return null;
}

/** When the student's access ends; null when it doesn't. */
export function accessEndsAt(course: Pick<Course, "accessDays">, enrolledAt: Date): Date | null {
  return course.accessDays && course.accessDays > 0 ? new Date(enrolledAt.getTime() + course.accessDays * DAY) : null;
}

/** When a drip lesson opens for the student; null when it's open at once. */
export function lessonOpensAt(lesson: Pick<CourseLesson, "dripDays">, enrolledAt: Date): Date | null {
  return lesson.dripDays && lesson.dripDays > 0 ? new Date(enrolledAt.getTime() + lesson.dripDays * DAY) : null;
}

/** The score of the answers (option IDs per question ID): a question counts when exactly its right options were chosen. */
export function scoreQuiz(quiz: CourseQuiz, answers: Record<string, string[]>): { scorePercent: number; passed: boolean } {
  const total = quiz.questions.length;
  if (total === 0) return { scorePercent: 100, passed: true };
  let right = 0;
  for (const question of quiz.questions) {
    const chosen = new Set(answers[String(question.id)] ?? []);
    const correct = question.options.filter((o) => o.correct).map((o) => o.id);
    if (correct.length > 0 && chosen.size === correct.length && correct.every((id) => chosen.has(id))) right++;
  }
  const scorePercent = Math.round((right / total) * 100);
  return { scorePercent, passed: scorePercent >= quiz.passPercent };
}

/** The quizzes the student passed (any submitted attempt that passed). */
export function passedQuizzes(attempts: readonly QuizAttempt[]): Set<number> {
  return new Set(attempts.filter((a) => a.passed).map((a) => a.quizId));
}

/** Progress over the course's lessons and quizzes, and when it was finished. */
export function courseProgress(course: Course, progress: Map<number, LessonProgress>, attempts: readonly QuizAttempt[]) {
  const lessons = course.topics.flatMap((t) => t.lessons);
  const quizzes = quizzesOf(course);
  const passed = passedQuizzes(attempts);
  const lessonsDone = lessons.filter((l) => progress.get(l.id)?.completedAt).length;
  const quizzesDone = quizzes.filter((q) => passed.has(q.id)).length;
  const total = lessons.length + quizzes.length;
  const done = lessonsDone + quizzesDone;
  const completed = total > 0 && done === total;
  const times = [
    ...lessons.map((l) => progress.get(l.id)?.completedAt?.getTime() ?? 0),
    ...attempts.filter((a) => a.passed && a.submittedAt).map((a) => a.submittedAt!.getTime()),
  ];
  const last = completed ? Math.max(0, ...times) : 0;
  return {
    course_id: course.id,
    completed_items: done,
    total_items: total,
    percent: total ? Math.round((done / total) * 100) : 0,
    course_completed: completed,
    completed_at: last > 0 ? new Date(last).toISOString() : null,
  };
}

// Certificates ------------------------------------------------------------------

function mac(secret: string, appId: string, userId: number, courseId: number): string {
  return createHmac("sha256", secret).update(`certificate:${appId}:${userId}:${courseId}`).digest("base64url").slice(0, 16);
}

/** The certificate's code: who and which course, signed so it can't be made up. */
export function certificateCode(secret: string, appId: string, userId: number, courseId: number): string {
  return `${userId}-${courseId}-${mac(secret, appId, userId, courseId)}`;
}

/** The student and course of a certificate code, when it's this app's. */
export function readCertificateCode(secret: string, appId: string, code: string): { userId: number; courseId: number } | null {
  const match = /^(\d{1,15})-(\d{1,9})-([\w-]{16})$/.exec(code);
  if (!match) return null;
  const userId = Number(match[1]);
  const courseId = Number(match[2]);
  const expected = Buffer.from(mac(secret, appId, userId, courseId));
  const given = Buffer.from(match[3]!);
  return expected.length === given.length && timingSafeEqual(expected, given) ? { userId, courseId } : null;
}

export function certificateUrl(platformUrl: string, appId: string, code: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/a/${appId}/certificate/${code}`;
}
