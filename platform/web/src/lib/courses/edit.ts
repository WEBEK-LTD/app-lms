import type { Course, CourseLesson, CourseSetup } from "../data/types";
import { parseLesson } from "./forms";

/**
 * Changes to the courses managed in Yallapp (`apps.course_setup`), shared by
 * the dashboard's Courses pages and 58 the Owner API.
 */

/** 110.2 Any change makes a sample course the owner's: it loses its `sample` mark. */
export function withCourse(setup: CourseSetup, id: number, change: (c: Course) => Course): CourseSetup {
  return { ...setup, courses: setup.courses.map((c) => (c.id === id ? owned(change(c)) : c)) };
}

function owned(course: Course): Course {
  if (!("sample" in course)) return course;
  const { sample: _sample, ...rest } = course;
  void _sample;
  return rest;
}

export type LessonSave =
  | { ok: true; setup: CourseSetup; lesson: CourseLesson; added: boolean }
  | { ok: false; message?: string; errors?: Record<string, string> };

/**
 * Adds a lesson to a section (or, with `v.id`, saves one): the lesson
 * form's rules (lib/courses/forms.ts). `isMediaLink` says whether a video
 * address is a file of the app's Media library.
 */
export function saveLesson(setup: CourseSetup, courseId: number, topicId: number, v: Record<string, string>, isMediaLink: (url: string) => boolean): LessonSave {
  const topic = setup.courses.find((c) => c.id === courseId)?.topics.find((t) => t.id === topicId);
  if (!topic) return { ok: false, message: "This section no longer exists." };
  const parsed = parseLesson(v, isMediaLink);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const id = v.id ? Number(v.id) : null;
  if (id !== null && !topic.lessons.some((l) => l.id === id)) return { ok: false, message: "This lesson no longer exists." };
  const lesson: CourseLesson = { id: id ?? setup.nextId, ...parsed.value };
  const lessons = id === null ? [...topic.lessons, lesson] : topic.lessons.map((l) => (l.id === id ? lesson : l));
  const next = withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => (t.id === topicId ? { ...t, lessons } : t)) }));
  return { ok: true, setup: id === null ? { ...next, nextId: setup.nextId + 1 } : next, lesson, added: id === null };
}

/** Publishes a course in the app, or hides it; null when there is no such course. */
export function setCourseActive(setup: CourseSetup, courseId: number, active: boolean): CourseSetup | null {
  if (!setup.courses.some((c) => c.id === courseId)) return null;
  return withCourse(setup, courseId, (c) => ({ ...c, active }));
}
