import type { Course, CourseSetup, LearningPath } from "../data/types";
import { withCourse } from "./edit";

/**
 * 113.7 Courses that come before others: a course's prerequisites (courses
 * to finish before enrolling in it) and learning paths (courses one after
 * another, shown with the student's progress; a path taken in order makes
 * each course wait for the one before it). Shared by the hosted API and the
 * dashboard's Courses pages; the forms' checks are here so they can be
 * tested.
 */

type Values = Record<string, string>;
type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export const PATH_LIMITS = { title: 120, description: 2000, courses: 30, paths: 50, prerequisites: 10 } as const;

/** The active paths, each with the courses still in the academy (in its order). */
export function activePaths(setup: CourseSetup, isShown: (course: Course) => boolean): (LearningPath & { courses: Course[] })[] {
  return (setup.paths ?? [])
    .filter((p) => p.active)
    .map((p) => ({ ...p, courses: p.courseIds.map((id) => setup.courses.find((c) => c.id === id)).filter((c): c is Course => c !== undefined && isShown(c)) }))
    .filter((p) => p.courses.length > 0);
}

/**
 * The courses to finish before this one: its own prerequisites, and in an
 * active path taken in order, the course before it in the path. Each once,
 * never the course itself.
 */
export function requiredCourses(setup: CourseSetup, courseId: number): number[] {
  const course = setup.courses.find((c) => c.id === courseId);
  const out = new Set(course?.prerequisites ?? []);
  for (const path of setup.paths ?? []) {
    if (!path.active || !path.inOrder) continue;
    const at = path.courseIds.indexOf(courseId);
    if (at > 0) out.add(path.courseIds[at - 1]!);
  }
  out.delete(courseId);
  return [...out].filter((id) => setup.courses.some((c) => c.id === id));
}

/** The required courses the student hasn't finished. */
export function missingCourses(setup: CourseSetup, courseId: number, finished: ReadonlySet<number>): number[] {
  return requiredCourses(setup, courseId).filter((id) => !finished.has(id));
}

// The dashboard's forms

/** The prerequisites chosen on a course's form: other courses of the academy, each once. */
export function parsePrerequisites(setup: CourseSetup, courseId: number | null, ids: number[]): { ok: true; value: number[] } | { ok: false; error: string } {
  const chosen = [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id !== courseId && setup.courses.some((c) => c.id === id)))];
  if (chosen.length > PATH_LIMITS.prerequisites) return { ok: false, error: `Choose up to ${PATH_LIMITS.prerequisites} courses.` };
  // A course can't wait for one that waits for it.
  if (courseId !== null && chosen.some((id) => waitsFor(setup, id, courseId, new Set()))) return { ok: false, error: "A course you chose needs this course first." };
  return { ok: true, value: chosen };
}

function waitsFor(setup: CourseSetup, from: number, target: number, seen: Set<number>): boolean {
  if (seen.has(from)) return false;
  seen.add(from);
  const before = setup.courses.find((c) => c.id === from)?.prerequisites ?? [];
  return before.includes(target) || before.some((id) => waitsFor(setup, id, target, seen));
}

export function savePrerequisites(setup: CourseSetup, courseId: number, ids: number[]): { ok: true; setup: CourseSetup } | { ok: false; error: string } {
  if (!setup.courses.some((c) => c.id === courseId)) return { ok: false, error: "This course no longer exists." };
  const parsed = parsePrerequisites(setup, courseId, ids);
  if (!parsed.ok) return parsed;
  return { ok: true, setup: withCourse(setup, courseId, (c) => ({ ...c, prerequisites: parsed.value })) };
}

export function parsePath(v: Values, setup: CourseSetup, courseIds: number[]): Parsed<Omit<LearningPath, "id">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").trim();
  if (title.length < 2 || title.length > PATH_LIMITS.title) errors.title = "Enter a title of up to 120 characters.";
  const description = (v.description ?? "").trim();
  if (description.length > PATH_LIMITS.description) errors.description = "Use at most 2000 characters.";
  const ids = [...new Set(courseIds.filter((id) => setup.courses.some((c) => c.id === id)))];
  if (ids.length < 2 || ids.length > PATH_LIMITS.courses) errors.courseIds = "Choose 2 to 30 courses.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, description, courseIds: ids, inOrder: v.inOrder === "on", active: v.active === "on" } };
}

/**
 * Adds a path (or with `v.id` saves one). `order` is the courses' places as
 * the owner numbered them ("1", "2", …): the path follows those numbers,
 * then the courses' order on the form.
 */
export function savePath(setup: CourseSetup, v: Values, courseIds: number[]): { ok: true; setup: CourseSetup; path: LearningPath; added: boolean } | { ok: false; message?: string; errors?: Record<string, string> } {
  const parsed = parsePath(v, setup, courseIds);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const paths = setup.paths ?? [];
  const id = v.id ? Number(v.id) : null;
  if (id !== null && !paths.some((p) => p.id === id)) return { ok: false, message: "This learning path no longer exists." };
  if (id === null && paths.length >= PATH_LIMITS.paths) return { ok: false, message: "You have the most learning paths an academy can have." };
  const path: LearningPath = { id: id ?? setup.nextId, ...parsed.value };
  const next = { ...setup, paths: id === null ? [...paths, path] : paths.map((p) => (p.id === id ? path : p)) };
  return { ok: true, setup: id === null ? { ...next, nextId: setup.nextId + 1 } : next, path, added: id === null };
}

/** The courses chosen on the path's form, by the places the owner gave them (`place-<id>`), then as listed. */
export function orderedChoice(chosen: number[], places: Record<number, string>): number[] {
  const place = (id: number) => {
    const n = Number(places[id]);
    return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
  };
  return chosen.map((id, i) => ({ id, i })).sort((a, b) => place(a.id) - place(b.id) || a.i - b.i).map((x) => x.id);
}

export function deletePath(setup: CourseSetup, pathId: number): CourseSetup {
  return { ...setup, paths: (setup.paths ?? []).filter((p) => p.id !== pathId) };
}
