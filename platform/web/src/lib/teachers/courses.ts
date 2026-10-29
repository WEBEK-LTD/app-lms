import { centsToDecimal, formatCents, parsePrice } from "../catalog/money";
import { withCourse } from "../courses/edit";
import type { Course, CourseLesson, CourseSetup } from "../data/types";
import { courseStage } from "./service";

/**
 * 105.3 A teacher's courses: made and filled from the Teacher tab, sent for
 * review, and published or sent back by the academy. A draft or returned
 * course is the teacher's to change; once in review it waits; a published
 * course gets new sections and lessons at once, and the academy changes the
 * rest.
 */

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];
const LEVEL_NAMES: Record<Level, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export interface TeacherCourseInput {
  title: string;
  description: string;
  priceCents: number;
  level: string | null;
  categoryIds: number[];
}

type Read<T> = { ok: true; value: T } | { ok: false; error: string };

/** The course fields a teacher sends (TeacherCourseInput in the contract). */
export function readCourseInput(body: unknown, setup: CourseSetup): Read<TeacherCourseInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (title.length < 1 || title.length > 120) return { ok: false, error: "Give the course a title of up to 120 characters." };
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (description.length > 5000) return { ok: false, error: "The description can be up to 5000 characters." };
  const priceText = typeof b.price === "string" ? b.price.trim() : typeof b.price === "number" ? String(b.price) : "";
  const priceCents = priceText === "" ? 0 : parsePrice(priceText);
  if (priceCents === null) return { ok: false, error: "Enter a price like 450, or 0 for a free course." };
  let level: string | null = null;
  if (b.level !== undefined && b.level !== null) {
    if (!LEVELS.includes(b.level as Level)) return { ok: false, error: "The level is beginner, intermediate or advanced." };
    level = LEVEL_NAMES[b.level as Level];
  }
  let categoryIds: number[] = [];
  if (b.category_id !== undefined && b.category_id !== null) {
    const id = Number(b.category_id);
    if (!setup.categories.some((c) => c.id === id)) return { ok: false, error: "Choose one of the academy's categories." };
    categoryIds = [id];
  }
  return { ok: true, value: { title, description, priceCents, level, categoryIds } };
}

/** A new draft of the teacher's. */
export function addTeacherCourse(setup: CourseSetup, teacher: { id: number; name: string }, input: TeacherCourseInput, now: Date): { setup: CourseSetup; course: Course } {
  const course: Course = {
    id: setup.nextId,
    ...input,
    imageAssetId: null,
    instructorName: teacher.name,
    topics: [],
    active: false,
    teacherId: teacher.id,
    teacherStage: "draft",
    reviewNote: null,
    createdAt: now.toISOString(),
  };
  return { setup: { ...setup, courses: [...setup.courses, course], nextId: setup.nextId + 1 }, course };
}

/** Whether the teacher may change the course's details and remove its lessons. */
export function editableByTeacher(course: Course): boolean {
  const stage = courseStage(course);
  return stage === "draft" || stage === "returned";
}

/** Whether the teacher may add sections and lessons: anything but waiting for review. */
export function growableByTeacher(course: Course): boolean {
  return courseStage(course) !== "in_review";
}

export function updateTeacherCourse(setup: CourseSetup, courseId: number, input: TeacherCourseInput): CourseSetup {
  return withCourse(setup, courseId, (c) => ({ ...c, ...input }));
}

export function addSection(setup: CourseSetup, courseId: number, title: string): CourseSetup {
  return { ...withCourse(setup, courseId, (c) => ({ ...c, topics: [...c.topics, { id: setup.nextId, title, lessons: [] }] })), nextId: setup.nextId + 1 };
}

export function addLesson(setup: CourseSetup, courseId: number, sectionId: number, lesson: Omit<CourseLesson, "id">): { setup: CourseSetup; lesson: CourseLesson } {
  const saved: CourseLesson = { id: setup.nextId, ...lesson };
  const next = withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => (t.id === sectionId ? { ...t, lessons: [...t.lessons, saved] } : t)) }));
  return { setup: { ...next, nextId: setup.nextId + 1 }, lesson: saved };
}

export function removeLesson(setup: CourseSetup, courseId: number, lessonId: number): CourseSetup {
  return withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => ({ ...t, lessons: t.lessons.filter((l) => l.id !== lessonId) })) }));
}

export function submitForReview(setup: CourseSetup, courseId: number): CourseSetup {
  return withCourse(setup, courseId, (c) => ({ ...c, teacherStage: "in_review", reviewNote: null, active: false }));
}

/** The academy publishes a teacher's course (or shows a hidden one): students see it at once. */
export function publishCourse(setup: CourseSetup, courseId: number): CourseSetup {
  return withCourse(setup, courseId, (c) => ({ ...c, teacherStage: null, reviewNote: null, active: true }));
}

/** The academy sends a teacher's course back with what to change; it leaves the app until it is published again. */
export function returnCourse(setup: CourseSetup, courseId: number, note: string | null): CourseSetup {
  return withCourse(setup, courseId, (c) => ({ ...c, teacherStage: "returned", reviewNote: note, active: false }));
}

const levelKey = (level: string | null): Level | null => {
  const key = level?.toLowerCase();
  return key && (LEVELS as readonly string[]).includes(key) ? (key as Level) : null;
};

/** How a lesson is shown in the teacher's list. */
export function lessonKind(lesson: CourseLesson): "video" | "pdf" | "text" {
  if (lesson.videoUrl) return "video";
  return lesson.attachments?.length ? "pdf" : "text";
}

/** TeacherCourse in the contract. */
export function teacherCourseJson(course: Course, currency: CourseSetup["currency"], studentCount: number) {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    price: centsToDecimal(course.priceCents),
    price_formatted: formatCents(course.priceCents, currency),
    level: levelKey(course.level),
    category_id: course.categoryIds[0] ?? null,
    stage: courseStage(course),
    review_note: course.reviewNote ?? null,
    student_count: studentCount,
    lesson_count: course.topics.reduce((sum, t) => sum + t.lessons.length, 0),
    sections: course.topics.map((t) => ({
      id: t.id,
      title: t.title,
      lessons: t.lessons.map((l) => ({ id: l.id, title: l.title, kind: lessonKind(l), duration_minutes: l.durationMinutes, preview: l.preview })),
    })),
    created_at: course.createdAt,
  };
}
