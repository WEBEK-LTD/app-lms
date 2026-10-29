import type { DataStore } from "../data/store";
import type { App, Course, CourseSetup, HostedUser, Teacher } from "../data/types";
import { courierWho } from "../delivery/service";
import { hasFeature, type PlanInfo } from "../plans";
import { reviewTeacherFor } from "./review";

/**
 * 105.3 Academies with many teachers: courses managed in Yallapp (the
 * courses engine) where each course may belong to one of the academy's
 * teachers. The academy reviews a teacher's course before it is published;
 * the teacher's share of its sales is the academy's to set.
 */

export const SUBJECTS_MAX = 8;
export const SUBJECT_MAX_LENGTH = 40;
export const BIO_MAX_LENGTH = 1000;

export type CourseStage = "draft" | "in_review" | "returned" | "published" | "hidden";

/** An academy with many teachers: the Studio kind (vertical `instructors`) of an app whose courses are managed in Yallapp. */
export function isTeachersApp(app: Pick<App, "vertical" | "connector">): boolean {
  return app.vertical === "instructors" && app.connector?.kind === "courses";
}

/**
 * The teachers' endpoints answer: a teachers app on a plan with `instructors`
 * (no plan given: tests and older callers). Yallapp's own demo apps have
 * Studio's project types on any plan.
 */
export function teachersOn(app: Pick<App, "vertical" | "connector" | "demo">, plan?: Pick<PlanInfo, "features"> | null): boolean {
  return isTeachersApp(app) && (plan === undefined || hasFeature(plan, "instructors") || app.demo === true);
}

/** Where a course is: a teacher's before the academy published it, else shown (`published`) or not (`hidden`). */
export function courseStage(course: Pick<Course, "active" | "teacherStage">): CourseStage {
  if (course.teacherStage) return course.teacherStage;
  return course.active ? "published" : "hidden";
}

/** Students see a course once it is active and no longer waiting for the academy. */
export function isPublished(course: Pick<Course, "active" | "teacherStage">): boolean {
  return courseStage(course) === "published";
}

export function coursesOf(setup: CourseSetup, teacherId: number): Course[] {
  return setup.courses.filter((c) => c.teacherId === teacherId);
}

/** The first line of the bio, for lists. */
export function headline(bio: string): string | null {
  const line = bio.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
  if (!line) return null;
  return line.length > 120 ? `${line.slice(0, 119).trimEnd()}…` : line;
}

/** "70" for 7000 basis points, "12.5" for 1250. */
export function sharePercent(bp: number): number {
  return Math.round(bp) / 100;
}

/** Subjects as sent by the app or a form: trimmed, without repeats, each up to 40 characters. */
export function readSubjects(value: unknown, required: boolean): { ok: true; subjects: string[] } | { ok: false; error: string } {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : value === undefined || value === null ? [] : null;
  if (list === null) return { ok: false, error: "subjects must be a list of words." };
  const subjects: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") return { ok: false, error: "subjects must be a list of words." };
    const subject = item.replace(/\s+/g, " ").trim();
    if (!subject) continue;
    if (subject.length > SUBJECT_MAX_LENGTH) return { ok: false, error: `Each subject can be up to ${SUBJECT_MAX_LENGTH} characters.` };
    if (!subjects.some((s) => s.toLowerCase() === subject.toLowerCase())) subjects.push(subject);
  }
  if (subjects.length > SUBJECTS_MAX) return { ok: false, error: `Up to ${SUBJECTS_MAX} subjects.` };
  if (required && subjects.length === 0) return { ok: false, error: "Add at least one subject you teach." };
  return { ok: true, subjects };
}

/**
 * The active teacher the signed-in person is: the one with their number (or
 * email), else the one whose application they sent. The teacher keeps the
 * account they last used, for their answers to show in their name.
 */
export async function teacherOf(store: DataStore, app: Pick<App, "id" | "hostedSettings">, user: HostedUser, now: Date): Promise<Teacher | null> {
  const found = (await store.findTeacher(app.id, courierWho(user))) ?? (await store.findTeacherByUser(app.id, user.id)) ?? (await reviewTeacherFor(store, app, user, now));
  if (!found || found.status !== "active") return null;
  if (found.userId !== user.id) {
    await store.updateTeacher(app.id, found.id, { userId: user.id }, now);
    return { ...found, userId: user.id };
  }
  return found;
}

/** Ratings everyone sees, per teacher: the average and how many. */
export function teacherRating(rows: readonly { teacherId: number; rating: number; count: number }[], teacherId: number): { rating: number | null; count: number } {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    if (row.teacherId !== teacherId) continue;
    sum += row.rating * row.count;
    count += row.count;
  }
  return { rating: count === 0 ? null : Math.round((sum / count) * 10) / 10, count };
}
