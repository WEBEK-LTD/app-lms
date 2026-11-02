import type { DataStore } from "../data/store";
import type { App, AssignmentStatus, Course, CourseEnrollment } from "../data/types";
import { csv } from "../events/forms";
import { accessEndsAt, assignmentDone, assignmentsOf, courseProgress, quizzesOf } from "./learning";

/**
 * 90.2 Progress for the teacher: each student of a course managed in
 * Yallapp, how far they got, their quiz results and when they last learned,
 * on the course's Students page and as a CSV file. 112.5 The gradebook: the
 * assignments' grades too, and students who stopped learning.
 */

/** 112.5 Students who haven't learned for this many days (or never started) are at risk, until they finish. */
export const AT_RISK_DAYS = 7;

/** 112.5 An assignment in a student's row. */
export interface AssignmentResult {
  assignmentId: number;
  title: string;
  /** `missing`: nothing handed in yet. */
  status: AssignmentStatus | "missing";
  score: number | null;
  maxPoints: number;
  passed: boolean;
}

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
  /** 112.5 */
  assignments: AssignmentResult[];
  /** 112.5 The lessons they opened (a saved position or completed) and completed, for the course's insights. */
  startedLessons: number[];
  completedLessons: number[];
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
  const submissions = await store.listAssignmentSubmissions({ appId: app.id, courseId: course.id });
  const assignments = assignmentsOf(course);
  const lessons = course.topics.flatMap((t) => t.lessons);
  const quizzes = quizzesOf(course);
  const rows: StudentProgress[] = [];
  for (const enrollment of enrollments) {
    const user = await store.getHostedUser(app.id, enrollment.userId);
    if (!user) continue;
    const progress = new Map((await store.listLessonProgress({ appId: app.id, userId: user.id, courseId: course.id })).map((p) => [p.lessonId, p]));
    const mine = attempts.filter((a) => a.userId === user.id);
    const handedIn = submissions.filter((s) => s.userId === user.id);
    const result = courseProgress(course, progress, mine, handedIn);
    const times = [...[...progress.values()].map((p) => p.updatedAt.getTime()), ...mine.map((a) => a.submittedAt!.getTime()), ...handedIn.map((s) => s.submittedAt.getTime())];
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
      startedLessons: [...progress.values()].map((p) => p.lessonId),
      completedLessons: [...progress.values()].filter((p) => p.completedAt).map((p) => p.lessonId),
      assignments: assignments.map((a) => {
        const s = handedIn.find((x) => x.assignmentId === a.id);
        return { assignmentId: a.id, title: a.title, status: s?.status ?? "missing", score: s?.status === "graded" ? s.score : null, maxPoints: a.maxPoints, passed: assignmentDone(a, s) };
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

/** 112.5 Not finished, and nothing learned for `days` days (counted from enrolling when they never started). */
export function atRisk(row: Pick<StudentProgress, "completedAt" | "lastActivity" | "enrolledAt">, now: Date, days = AT_RISK_DAYS): boolean {
  if (row.completedAt) return false;
  return now.getTime() - (row.lastActivity ?? row.enrolledAt).getTime() >= days * 86_400_000;
}

/** 112.5 An assignment over the course's students: handed in, waiting for a grade, and the average grade in percent. */
export function assignmentSummaries(course: Course, rows: readonly StudentProgress[]) {
  return assignmentsOf(course).map((a) => {
    const results = rows.map((r) => r.assignments.find((x) => x.assignmentId === a.id)).filter((x): x is AssignmentResult => Boolean(x && x.status !== "missing"));
    const graded = results.filter((x) => x.status === "graded" && x.score !== null);
    return {
      assignmentId: a.id,
      title: a.title,
      handedIn: results.length,
      waiting: results.filter((x) => x.status === "submitted").length,
      averagePercent: graded.length ? Math.round((graded.reduce((sum, x) => sum + x.score! / x.maxPoints, 0) / graded.length) * 100) : null,
    };
  });
}

const day = (at: Date | null) => (at ? at.toISOString().slice(0, 10) : "");

/** The Students page as a CSV file: one row per student, a column per quiz with the best score. `k` puts its words in the downloader's language. */
export function courseReportCsv(course: Course, rows: readonly StudentProgress[], k: (english: string) => string = (english) => english): string {
  const quizzes = quizzesOf(course);
  const assignments = assignmentsOf(course);
  const source = { paid: "Paid", manual: "Added by you", free: "Free" } as const;
  return csv([
    [...["Name", "Phone", "Email", "Enrolled", "How", "Lessons completed", "Progress (%)", "Finished", "Last activity", "Access ends"].map(k), ...quizzes.map((q) => q.title), ...assignments.map((a) => a.title)],
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
      // 112.5 A grade as score/highest; handed in but not graded yet, or sent back.
      ...r.assignments.map((a) => (a.status === "graded" ? `${a.score}/${a.maxPoints}` : a.status === "submitted" ? k("to grade") : a.status === "returned" ? k("sent back") : "")),
    ]),
  ]);
}
