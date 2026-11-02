import { formatCents } from "@/lib/catalog/money";
import { bundleCourses, compareAtCents } from "@/lib/courses/bundles";
import type { CourseBundle, CourseSetup } from "@/lib/data/types";

/** 113.1 The courses a bundle can hold (not a teacher's still in review), as the form lists them. */
export function bundleChoices(setup: CourseSetup, free: string) {
  return setup.courses.filter((c) => !c.teacherStage).map((c) => ({ id: c.id, title: c.title, price: c.priceCents ? formatCents(c.priceCents, setup.currency) : free, hidden: !c.active }));
}

/** The bundle's published courses and what they cost on their own. */
export function bundleSums(setup: CourseSetup, bundle: CourseBundle) {
  const courses = bundleCourses(setup, bundle);
  return { courses, compareCents: compareAtCents(courses) };
}
