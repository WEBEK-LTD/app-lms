import { parsePrice } from "../catalog/money";
import type { Course, CourseBundle, CourseSetup, OrderBundle } from "../data/types";

/**
 * 113.1 Course bundles: several of the academy's courses sold together at
 * one price the owner sets on the Bundles page. They live with the courses
 * (`apps.course_setup`), their IDs from the same counter, so a bundle's ID is
 * never a course's. Buying one is a course order whose line is the bundle
 * (`CatalogOrderLine.bundle`); paying it enrols the student in each of its
 * courses they aren't in yet.
 */

/** A bundle needs at least this many courses, and holds at most this many. */
export const BUNDLE_MIN_COURSES = 2;
export const BUNDLE_MAX_COURSES = 50;

export function bundlesOf(setup: Pick<CourseSetup, "bundles">): CourseBundle[] {
  return setup.bundles ?? [];
}

/** A course the academy sells: 105.3 a teacher's once the academy published it. */
const published = (c: Course) => c.active && !c.teacherStage;

/** The bundle's courses the app shows (published ones), in the owner's order. */
export function bundleCourses(setup: Pick<CourseSetup, "courses">, bundle: Pick<CourseBundle, "courseIds">): Course[] {
  const byId = new Map(setup.courses.filter(published).map((c) => [c.id, c]));
  return bundle.courseIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}

/** The bundles the app shows: published, with at least two published courses. */
export function shownBundles(setup: Pick<CourseSetup, "courses" | "bundles">): CourseBundle[] {
  return bundlesOf(setup).filter((b) => b.active && bundleCourses(setup, b).length >= BUNDLE_MIN_COURSES);
}

/** "Compare at": what its courses cost on their own. */
export function compareAtCents(courses: readonly Pick<Course, "priceCents">[]): number {
  return courses.reduce((sum, c) => sum + c.priceCents, 0);
}

/** The bundle's courses on its order line, as they are now; `enrolled`: the student's courses. */
export function orderBundle(courses: readonly Course[], enrolled: ReadonlySet<number>): OrderBundle {
  return { courses: courses.map((c) => ({ courseId: c.id, title: c.title, priceCents: c.priceCents, owned: enrolled.has(c.id) })) };
}

/**
 * What each of a bundle's courses earned of `cents` (its part of an order):
 * in proportion to each course's own price when it was bought, so a teacher
 * whose course costs twice another's gets twice its part; equal parts when
 * every course was free on its own. The parts add up to `cents` exactly (the
 * cents rounding leaves go to the largest remainders).
 */
export function splitBundle(cents: number, courses: readonly { courseId: number; priceCents: number }[]): Map<number, number> {
  const out = new Map<number, number>();
  if (courses.length === 0) return out;
  const total = courses.reduce((sum, c) => sum + Math.max(0, c.priceCents), 0);
  const weight = (c: { priceCents: number }) => (total > 0 ? Math.max(0, c.priceCents) : 1);
  const weights = total > 0 ? total : courses.length;
  const parts = courses.map((c) => {
    const exact = (cents * weight(c)) / weights;
    return { courseId: c.courseId, whole: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = cents - parts.reduce((sum, p) => sum + p.whole, 0);
  for (const p of [...parts].sort((a, b) => b.rest - a.rest)) {
    if (left <= 0) break;
    p.whole += 1;
    left -= 1;
  }
  for (const p of parts) out.set(p.courseId, (out.get(p.courseId) ?? 0) + p.whole);
  return out;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The Bundles page's form: a title, its courses (two or more of the academy's), the owner's price, published or not. */
export function parseBundle(
  v: Record<string, string>,
  courseIds: number[],
  setup: Pick<CourseSetup, "courses">,
): Parsed<Pick<CourseBundle, "title" | "description" | "courseIds" | "priceCents" | "active">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").trim();
  if (title.length < 2 || title.length > 120) errors.title = "Enter a title of up to 120 characters.";
  const description = (v.description ?? "").trim();
  if (description.length > 5000) errors.description = "Use at most 5000 characters.";
  const price = (v.price ?? "").trim() === "" ? null : parsePrice(v.price!);
  if (price === null || price <= 0) errors.price = "Enter the bundle's price, like 900.";
  // Courses still with their teacher (105.3 a draft, in review) aren't the academy's to sell yet.
  const known = new Set(setup.courses.filter((c) => !c.teacherStage).map((c) => c.id));
  const chosen = [...new Set(courseIds)].filter((id) => known.has(id));
  if (chosen.length < BUNDLE_MIN_COURSES) errors.courseIds = "Choose at least two courses.";
  else if (chosen.length > BUNDLE_MAX_COURSES) errors.courseIds = `Choose at most ${BUNDLE_MAX_COURSES} courses.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, description, courseIds: chosen, priceCents: price!, active: v.active === "on" } };
}

/** Adds a bundle (no `id`) or saves one; null when the bundle no longer exists. */
export function saveBundle(
  setup: CourseSetup,
  id: number | null,
  value: Pick<CourseBundle, "title" | "description" | "courseIds" | "priceCents" | "active" | "imageAssetId">,
  now: Date,
): { setup: CourseSetup; bundle: CourseBundle } | null {
  const bundles = bundlesOf(setup);
  if (id === null) {
    const bundle: CourseBundle = { id: setup.nextId, ...value, createdAt: now.toISOString() };
    return { setup: { ...setup, bundles: [...bundles, bundle], nextId: setup.nextId + 1 }, bundle };
  }
  const existing = bundles.find((b) => b.id === id);
  if (!existing) return null;
  const bundle: CourseBundle = { ...existing, ...value };
  return { setup: { ...setup, bundles: bundles.map((b) => (b.id === id ? bundle : b)) }, bundle };
}

export function deleteBundle(setup: CourseSetup, id: number): CourseSetup {
  return { ...setup, bundles: bundlesOf(setup).filter((b) => b.id !== id) };
}
