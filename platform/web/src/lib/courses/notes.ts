import type { RateLimitRule } from "../rate-limit";

/**
 * 113.7 A student's own notes and bookmarks in lessons: private (only they
 * read them), kept per lesson, listed per course.
 */

export const NOTE_TEXT_MAX = 2000;
/** Notes a student may keep on one lesson. */
export const NOTES_PER_LESSON = 100;
/** Notes written or changed in an hour, in one app. */
export const NOTE_LIMIT: RateLimitRule = { name: "lesson_note", limit: 120, windowSeconds: 3600 };

/** A note as written: trimmed, 1 to 2000 characters; with the place in the video it was written at, maybe. */
export function readNote(body: unknown): { ok: true; text: string; positionSeconds: number | null } | { ok: false; error: string } {
  const input = (body ?? {}) as { text?: unknown; position_seconds?: unknown };
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) return { ok: false, error: "Write your note." };
  if (text.length > NOTE_TEXT_MAX) return { ok: false, error: `Use at most ${NOTE_TEXT_MAX} characters.` };
  const position = input.position_seconds;
  if (position !== undefined && position !== null && !(typeof position === "number" && Number.isInteger(position) && position >= 0 && position <= 86_400)) {
    return { ok: false, error: "position_seconds must be a whole number of seconds." };
  }
  return { ok: true, text, positionSeconds: typeof position === "number" ? position : null };
}
