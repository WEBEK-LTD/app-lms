import type { CourseSetup } from "../data/types";
import { withCourse } from "./edit";
import { topicItems } from "./learning";

/**
 * 132.14 The course builder's drag and drop: the ids asked for that are
 * there, once each, then the others in their current order (one added
 * meanwhile keeps a place).
 */
function ordered(current: number[], ids: number[]): number[] {
  const known = new Set(current);
  const first = [...new Set(ids)].filter((id) => known.has(id));
  const asked = new Set(first);
  return [...first, ...current.filter((id) => !asked.has(id))];
}

/** A course's sections in a new order; null when there is no such course or nothing changes. */
export function reorderTopics(setup: CourseSetup, courseId: number, ids: number[]): CourseSetup | null {
  const course = setup.courses.find((c) => c.id === courseId);
  if (!course) return null;
  const order = ordered(
    course.topics.map((t) => t.id),
    ids,
  );
  if (order.every((id, i) => course.topics[i]!.id === id)) return null;
  const byId = new Map(course.topics.map((t) => [t.id, t]));
  return withCourse(setup, courseId, (c) => ({ ...c, topics: order.map((id) => byId.get(id)!) }));
}

/** A section's lessons, quizzes, assignments and live classes in a new order (kept in `order`); null when nothing changes. */
export function reorderItems(setup: CourseSetup, courseId: number, topicId: number, ids: number[]): CourseSetup | null {
  const topic = setup.courses.find((c) => c.id === courseId)?.topics.find((t) => t.id === topicId);
  if (!topic) return null;
  const current = topicItems(topic).map((it) => it.id);
  const order = ordered(current, ids);
  if (order.every((id, i) => current[i] === id)) return null;
  return withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => (t.id === topicId ? { ...t, order } : t)) }));
}

/** 132.15 The academy's course categories renamed, or in a new order. */
export function renameCourseCategory(setup: CourseSetup, id: number, name: string): CourseSetup | null {
  if (!setup.categories.some((c) => c.id === id)) return null;
  return { ...setup, categories: setup.categories.map((c) => (c.id === id ? { ...c, name } : c)) };
}

export function reorderCourseCategories(setup: CourseSetup, ids: number[]): CourseSetup | null {
  const order = ordered(
    setup.categories.map((c) => c.id),
    ids,
  );
  if (order.every((id, i) => setup.categories[i]!.id === id)) return null;
  const byId = new Map(setup.categories.map((c) => [c.id, c]));
  return { ...setup, categories: order.map((id) => byId.get(id)!) };
}
