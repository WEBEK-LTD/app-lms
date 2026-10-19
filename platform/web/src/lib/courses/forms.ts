import { parsePrice } from "../catalog/money";
import type { Course, CourseLesson, CourseSetup } from "../data/types";

/** Checks of the Courses pages' forms, kept apart from the actions so they can be tested. */

type Values = Record<string, string>;
type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export function parseCourse(
  v: Values,
  setup: CourseSetup,
  categoryIds: number[],
): Parsed<Pick<Course, "title" | "description" | "priceCents" | "categoryIds" | "instructorName" | "level" | "active">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").trim();
  if (title.length < 2 || title.length > 120) errors.title = "Enter a title of up to 120 characters.";
  const description = (v.description ?? "").trim();
  if (description.length > 5000) errors.description = "Use at most 5000 characters.";
  const price = (v.price ?? "").trim() === "" ? 0 : parsePrice(v.price!);
  if (price === null) errors.price = "Enter a price, like 450, or leave it empty for a free course.";
  const instructor = (v.instructor ?? "").trim();
  if (instructor.length > 80) errors.instructor = "Use at most 80 characters.";
  const level = (v.level ?? "").trim();
  if (level.length > 40) errors.level = "Use at most 40 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const known = new Set(setup.categories.map((c) => c.id));
  return {
    ok: true,
    value: {
      title,
      description,
      priceCents: price!,
      categoryIds: [...new Set(categoryIds.filter((id) => known.has(id)))],
      instructorName: instructor || null,
      level: level || null,
      active: v.active === "on",
    },
  };
}

/** `isMediaLink`: 51 a Yallapp Media library link (on the platform's own address, http in local runs). */
export function parseLesson(v: Values, isMediaLink: (url: string) => boolean = () => false): Parsed<Omit<CourseLesson, "id">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").trim();
  if (title.length < 2 || title.length > 120) errors.title = "Enter a title of up to 120 characters.";
  const video = (v.videoUrl ?? "").trim();
  if (video && !isMediaLink(video)) {
    try {
      if (new URL(video).protocol !== "https:" || video.length > 500) throw new Error("not https");
    } catch {
      errors.videoUrl = "Enter the video's https address (YouTube, Vimeo or a video file), choose one from Media, or leave it empty.";
    }
  }
  const text = (v.text ?? "").trim();
  if (text.length > 20_000) errors.text = "Use at most 20,000 characters.";
  if (!video && !text && !errors.text) errors.text = "Add a video address or some text.";
  const minutes = (v.duration ?? "").trim() === "" ? null : Number(v.duration);
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)) errors.duration = "Enter 1 to 600 minutes, or leave it empty.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, videoUrl: video || null, text, durationMinutes: minutes, preview: v.preview === "on" } };
}
