import type { AssignmentSubmission, CourseAssignment, RubricCriterion } from "../data/types";
import { parseAnyPhone, type Phone } from "../hosted/phone";

/**
 * 112.5 The teacher's side of assignments and students: a grade (or the
 * assignment sent back for another try) and many students added at once by
 * the phone numbers they sign in with, pasted from a sheet.
 */

export const STUDENTS_AT_ONCE = 200;

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/**
 * A grade: a score and a note, or the assignment sent back with a note.
 * 113.7 With a rubric, a level for each criterion (`rubric-<criterion ID>`
 * holds the level's ID), and the score is their points added up.
 */
export function parseGrade(v: Record<string, string>, assignment: Pick<CourseAssignment, "maxPoints" | "rubric">): Parsed<Pick<AssignmentSubmission, "status" | "score" | "feedback" | "rubric">> {
  const errors: Record<string, string> = {};
  const back = v.outcome === "return";
  const feedback = (v.feedback ?? "").trim();
  if (feedback.length > 5000) errors.feedback = "Use at most 5000 characters.";
  const raw = (v.score ?? "").trim();
  let score = raw === "" ? null : Number(raw);
  let rubric: Record<string, number> | null = null;
  if (back) {
    if (!feedback) errors.feedback = "Tell the student what to change.";
  } else if (assignment.rubric?.length) {
    const chosen = Object.fromEntries(assignment.rubric.map((c) => [String(c.id), Number(v[`rubric-${c.id}`])]));
    const scored = rubricScore(assignment.rubric, chosen);
    if (scored === null) errors.rubric = "Choose a level for each criterion.";
    else {
      score = scored;
      rubric = chosen;
    }
  } else if (score === null || !Number.isInteger(score) || score < 0 || score > assignment.maxPoints) {
    errors.score = `Enter a score from 0 to ${assignment.maxPoints}.`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: back ? { status: "returned", score: null, feedback, rubric: null } : { status: "graded", score, feedback: feedback || null, rubric } };
}

/** 113.7 The rubric's score of the levels chosen (a level for every criterion), or null when one is missing. */
export function rubricScore(rubric: readonly RubricCriterion[], chosen: Record<string, number>): number | null {
  let sum = 0;
  for (const c of rubric) {
    const level = c.levels.find((l) => l.id === chosen[String(c.id)]);
    if (!level) return null;
    sum += level.points;
  }
  return sum;
}

/** 113.7 The highest score a rubric gives: each criterion's highest level. */
export function rubricMax(rubric: readonly RubricCriterion[]): number {
  return rubric.reduce((sum, c) => sum + Math.max(0, ...c.levels.map((l) => l.points)), 0);
}

/** 113.7 Each criterion with the level chosen, as the student and the teacher read it. */
export function rubricResult(rubric: readonly RubricCriterion[] | undefined, chosen: Record<string, number> | null) {
  if (!rubric?.length || !chosen) return null;
  return rubric.map((c) => {
    const level = c.levels.find((l) => l.id === chosen[String(c.id)]) ?? null;
    return { criterion_id: c.id, title: c.title, level_id: level?.id ?? null, level_label: level?.label ?? null, points: level?.points ?? 0, max_points: Math.max(0, ...c.levels.map((l) => l.points)) };
  });
}

/** 113.7 A rubric as the app shows it to grade or read. */
export function rubricJson(rubric: readonly RubricCriterion[] | undefined) {
  return rubric?.length ? rubric.map((c) => ({ id: c.id, title: c.title, levels: c.levels.map((l) => ({ id: l.id, label: l.label, points: l.points })) })) : null;
}

/** 113.7 How many times a student may hand an assignment in. */
export const attemptsOf = (assignment: Pick<CourseAssignment, "attemptsAllowed">): number => Math.max(1, assignment.attemptsAllowed ?? 1);

/**
 * 113.7 Whether the student may hand it in (again): before it's graded,
 * when the teacher sent it back, or after a grade while tries are left.
 */
export function maySubmit(assignment: Pick<CourseAssignment, "attemptsAllowed">, submission: Pick<AssignmentSubmission, "status" | "attempt"> | undefined): boolean {
  if (!submission || submission.status !== "graded") return true;
  return submission.attempt < attemptsOf(assignment);
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
