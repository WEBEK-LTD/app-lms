import type { AssignmentSubmission, CourseAssignment } from "../data/types";
import { parseAnyPhone, type Phone } from "../hosted/phone";

/**
 * 112.5 The teacher's side of assignments and students: a grade (or the
 * assignment sent back for another try) and many students added at once by
 * the phone numbers they sign in with, pasted from a sheet.
 */

export const STUDENTS_AT_ONCE = 200;

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export function parseGrade(v: Record<string, string>, assignment: Pick<CourseAssignment, "maxPoints">): Parsed<Pick<AssignmentSubmission, "status" | "score" | "feedback">> {
  const errors: Record<string, string> = {};
  const back = v.outcome === "return";
  const feedback = (v.feedback ?? "").trim();
  if (feedback.length > 5000) errors.feedback = "Use at most 5000 characters.";
  const raw = (v.score ?? "").trim();
  const score = raw === "" ? null : Number(raw);
  if (back) {
    if (!feedback) errors.feedback = "Tell the student what to change.";
  } else if (score === null || !Number.isInteger(score) || score < 0 || score > assignment.maxPoints) {
    errors.score = `Enter a score from 0 to ${assignment.maxPoints}.`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: back ? { status: "returned", score: null, feedback } : { status: "graded", score, feedback: feedback || null } };
}

/** Phone numbers one per line, or separated by commas or semicolons (a sheet's column pasted); each number once. */
export function parsePhones(text: string, defaultCountryCode: string): { ok: true; value: (Phone & { text: string })[] } | { ok: false; error: string } {
  const parts = text
    .split(/[\r\n,;\t]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: false, error: "Paste the students' mobile numbers, one per line." };
  if (parts.length > STUDENTS_AT_ONCE) return { ok: false, error: `Add up to ${STUDENTS_AT_ONCE} students at a time.` };
  const seen = new Set<string>();
  const out: (Phone & { text: string })[] = [];
  for (const part of parts) {
    const phone = parseAnyPhone(part, defaultCountryCode);
    if (!phone) return { ok: false, error: `This isn't a mobile number: ${part.slice(0, 40)}` };
    if (seen.has(phone.e164)) continue;
    seen.add(phone.e164);
    out.push({ ...phone, text: part });
  }
  return { ok: true, value: out };
}
