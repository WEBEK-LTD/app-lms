import type { DataStore } from "../data/store";
import type { App, Course, CourseEnrollment } from "../data/types";
import { csv } from "../events/forms";
import { accessEndsAt, courseProgress, quizzesOf } from "./learning";

/**
 * 90.2 Progress for the teacher: each student of a course managed in
 * Yallapp, how far they got, their quiz results and when they last learned,
 * on the course's Students page and as a CSV file.
 */

export interface QuizResult {
  quizId: number;
  title: string;
  attempts: number;
  /** The best submitted score; null before the first attempt. */
  best: number | null;
  passed: boolean;
}

export interface StudentProgress {
  userId: number;
  name: string;
  phone: string | null;
  email: string | null;
  enrolledAt: Date;
  source: CourseEnrollment["source"];
  lessonsDone: number;
  lessons: number;
  percent: number;
  completedAt: Date | null;
  lastActivity: Date | null;
  accessEndsAt: Date | null;
  quizzes: QuizResult[];
}

export interface QuizSummary {
  quizId: number;
  title: string;
  /** Students who sent at least one attempt. */
  took: number;
  passed: number;
  /** The average of the students' best scores; null when no one took it. */
  averageBest: number | null;
}

export async function courseReport(store: DataStore, app: Pick<App, "id">, course: Course): Promise<StudentProgress[]> {
  const enrollments = await store.listCourseEnrollments({ appId: app.id, courseId: course.id });
  const attempts = (await store.listQuizAttempts({ appId: app.id, courseId: course.id })).filter((a) => a.submittedAt);
  const lessons = course.topics.flatMap((t) => t.lessons);
  const quizzes = quizzesOf(course);
  const rows: StudentProgress[] = [];
  for (const enrollment of enrollments) {
    const user = await store.getHostedUser(app.id, enrollment.userId);
    if (!user) continue;
    const progress = new Map((await store.listLessonProgress({ appId: app.id, userId: user.id, courseId: course.id })).map((p) => [p.lessonId, p]));
    const mine = attempts.filter((a) => a.userId === user.id);
    const result = courseProgress(course, progress, mine);
    const times = [...[...progress.values()].map((p) => p.updatedAt.getTime()), ...mine.map((a) => a.submittedAt!.getTime())];
    rows.push({
      userId: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      enrolledAt: enrollment.enrolledAt,
      source: enrollment.source,
      lessonsDone: lessons.filter((l) => progress.get(l.id)?.completedAt).length,
      lessons: lessons.length,
      percent: result.percent,
      completedAt: result.completed_at ? new Date(result.completed_at) : null,
      lastActivity: times.length ? new Date(Math.max(...times)) : null,
      accessEndsAt: accessEndsAt(course, enrollment.enrolledAt),
      quizzes: quizzes.map((quiz) => {
        const of = mine.filter((a) => a.quizId === quiz.id);
        return {
          quizId: quiz.id,
          title: quiz.title,
          attempts: of.length,
          best: of.length ? Math.max(...of.map((a) => a.scorePercent ?? 0)) : null,
          passed: of.some((a) => a.passed),
        };
      }),
    });
  }
  // The most recently active first; students who never started last, newest enrolment first.
  return rows.sort((a, b) => (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0) || b.enrolledAt.getTime() - a.enrolledAt.getTime());
}

export function quizSummaries(course: Course, rows: readonly StudentProgress[]): QuizSummary[] {
  return quizzesOf(course).map((quiz) => {
    const results = rows.map((r) => r.quizzes.find((q) => q.quizId === quiz.id)).filter((q): q is QuizResult => Boolean(q && q.attempts > 0));
    return {
      quizId: quiz.id,
      title: quiz.title,
      took: results.length,
      passed: results.filter((q) => q.passed).length,
      averageBest: results.length ? Math.round(results.reduce((sum, q) => sum + (q.best ?? 0), 0) / results.length) : null,
    };
  });
}

const day = (at: Date | null) => (at ? at.toISOString().slice(0, 10) : "");

/** The Students page as a CSV file: one row per student, a column per quiz with the best score. `k` puts its words in the downloader's language. */
export function courseReportCsv(course: Course, rows: readonly StudentProgress[], k: (english: string) => string = (english) => english): string {
  const quizzes = quizzesOf(course);
  const source = { paid: "Paid", manual: "Added by you", free: "Free" } as const;
  return csv([
    [...["Name", "Phone", "Email", "Enrolled", "How", "Lessons completed", "Progress (%)", "Finished", "Last activity", "Access ends"].map(k), ...quizzes.map((q) => q.title)],
    ...rows.map((r) => [
      r.name,
      r.phone ?? "",
      r.email ?? "",
      day(r.enrolledAt),
      k(source[r.source] ?? "Free"),
      `${r.lessonsDone}/${r.lessons}`,
      String(r.percent),
      day(r.completedAt),
      day(r.lastActivity),
      day(r.accessEndsAt),
      ...r.quizzes.map((q) => (q.best === null ? "" : `${q.best}%${q.passed ? ` (${k("passed")})` : ""}`)),
    ]),
  ]);
}
