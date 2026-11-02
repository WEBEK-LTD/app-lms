import type { DataStore } from "../data/store";
import type { App, Course, CourseSetup } from "../data/types";
import { paidOrders, salesByCourse } from "../teachers/earnings";
import { atRisk, type StudentProgress } from "./report";
import { lessonsOf } from "./setup";

/**
 * 112.5 A course at a glance, on its Students page: students who enrolled in
 * the last 30 days, how many finished, the average progress, who is at risk,
 * the sales on the payment page after coupons and refunds, and the lessons
 * students open most.
 */

const DAY = 86_400_000;

export interface CourseInsights {
  students: number;
  newStudents30: number;
  finished: number;
  /** Of the students, in percent. */
  completionRate: number;
  averageProgress: number;
  atRisk: number;
  sales: number;
  /** After coupons, less refunds, in the courses' currency. */
  netCents: number;
  lessons: { lessonId: number; title: string; started: number; completed: number }[];
}

export async function courseInsights(store: DataStore, app: Pick<App, "id">, setup: CourseSetup, course: Course, rows: readonly StudentProgress[], now: Date): Promise<CourseInsights> {
  const students = rows.length;
  const finished = rows.filter((r) => r.completedAt).length;
  const sold = course.priceCents > 0 ? salesByCourse(await paidOrders(store, app, new Date(0), now), setup).get(course.id) : undefined;
  const lessons = lessonsOf(course)
    .map((l) => ({ lessonId: l.id, title: l.title, started: rows.filter((r) => r.startedLessons.includes(l.id)).length, completed: rows.filter((r) => r.completedLessons.includes(l.id)).length }))
    .filter((l) => l.started > 0)
    .sort((a, b) => b.started - a.started || b.completed - a.completed)
    .slice(0, 5);
  return {
    students,
    newStudents30: rows.filter((r) => now.getTime() - r.enrolledAt.getTime() <= 30 * DAY).length,
    finished,
    completionRate: students ? Math.round((finished / students) * 100) : 0,
    averageProgress: students ? Math.round(rows.reduce((sum, r) => sum + r.percent, 0) / students) : 0,
    atRisk: rows.filter((r) => atRisk(r, now)).length,
    sales: sold?.sales ?? 0,
    netCents: sold ? sold.salesCents - sold.refundsCents : 0,
    lessons,
  };
}
