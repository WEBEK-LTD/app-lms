import { DEFAULT_COURSE_SETUP, type App, type Course, type CourseLesson, type CourseSetup } from "../data/types";

export function courseSetup(app: App): CourseSetup {
  return { ...DEFAULT_COURSE_SETUP, ...(app.courseSetup ?? {}) };
}

export function lessonsOf(course: Course): CourseLesson[] {
  return course.topics.flatMap((t) => t.lessons);
}

/** The course and lesson for a lesson ID. */
export function findLesson(setup: CourseSetup, lessonId: number): { course: Course; lesson: CourseLesson } | null {
  for (const course of setup.courses) {
    const lesson = lessonsOf(course).find((l) => l.id === lessonId);
    if (lesson) return { course, lesson };
  }
  return null;
}

/** Where a lesson's video comes from, as the app's Video.source says. */
export function videoSource(url: string): "youtube" | "vimeo" | "external" {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") return "youtube";
    if (host === "vimeo.com" || host === "player.vimeo.com") return "vimeo";
  } catch {
    // Not a URL: treated as a plain address.
  }
  return "external";
}
