import type { BookingStaff, IntakeAnswer, IntakeField } from "../data/types";
import { isDate } from "./time";

/**
 * 21 A clinic's intake form: questions asked when booking, set on the
 * Services & team page, and the answers checked when the app books.
 * Answers are health data: they are kept with the appointment, shown to the
 * patient and on the dashboard, and never put in an email, push or text.
 */

export const INTAKE_TYPES = ["text", "textarea", "date", "choice"] as const satisfies readonly IntakeField["type"][];

export const INTAKE_TYPE_LABELS: Record<IntakeField["type"], string> = {
  text: "Short answer",
  textarea: "Long answer",
  date: "Date",
  choice: "One of a list",
};

export const MAX_INTAKE_FIELDS = 20;
export const MAX_OPTIONS = 20;
/** The longest answer of each type. */
export const ANSWER_MAX: Record<IntakeField["type"], number> = { text: 200, textarea: 2000, date: 10, choice: 80 };

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The questions as the app gets them (`BookingsConfig.intake_fields`). */
export function intakeFieldsJson(fields: IntakeField[]) {
  return fields.map((f) => ({ id: f.id, label: f.label, type: f.type, ...(f.type === "choice" ? { options: f.options } : {}), required: f.required }));
}

/**
 * Checks the answers sent with a booking against the questions: required
 * ones are there, each fits its type and length, choices are one of their
 * options. Unknown keys are ignored; empty answers to optional questions are
 * left out. The answers keep the question as it was asked.
 */
export function checkAnswers(fields: IntakeField[], raw: unknown): Parsed<IntakeAnswer[] | null> {
  if (fields.length === 0) return { ok: true, value: null };
  if (raw !== undefined && raw !== null && (typeof raw !== "object" || Array.isArray(raw))) {
    return { ok: false, errors: { answers: "Please answer the questions again." } };
  }
  const given = (raw ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const answers: IntakeAnswer[] = [];
  for (const field of fields) {
    const value = Object.prototype.hasOwnProperty.call(given, field.id) ? given[field.id] : undefined;
    if (value !== undefined && value !== null && typeof value !== "string") {
      errors[field.id] = "Please answer this again.";
      continue;
    }
    const text = (value ?? "").trim();
    if (!text) {
      if (field.required) errors[field.id] = field.type === "choice" ? "Please choose one." : "Please answer this.";
      continue;
    }
    if (text.length > ANSWER_MAX[field.type]) errors[field.id] = `Please use at most ${ANSWER_MAX[field.type]} characters.`;
    else if (field.type === "date" && !isDate(text)) errors[field.id] = "Please choose a date.";
    else if (field.type === "choice" && !field.options.includes(text)) errors[field.id] = "Please choose one of the options.";
    else answers.push({ id: field.id, label: field.label, value: text });
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: answers };
}

/** A question's key from its label, unique among the others: "Reason for visit" is reason_for_visit. */
export function fieldIdFor(label: string, taken: string[]): string {
  const base =
    label
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32)
      .replace(/_+$/, "") || "question";
  let id = base;
  for (let n = 2; taken.includes(id); n += 1) id = `${base}_${n}`;
  return id;
}

/** The Services & team page's question form: `label`, `type`, `options` (one per line) and `required`. */
export function parseIntakeField(v: Record<string, string>, fields: IntakeField[], editing: IntakeField | null): Parsed<IntakeField> {
  const errors: Record<string, string> = {};
  const label = (v.label ?? "").trim();
  if (label.length < 2 || label.length > 120) errors.label = "Enter a question of up to 120 characters.";
  const type = INTAKE_TYPES.find((t) => t === v.type);
  if (!type) errors.type = "Choose the kind of answer.";
  const options = [
    ...new Set(
      (v.options ?? "")
        .split(/\r?\n/)
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  ];
  if (type === "choice") {
    if (options.length < 2 || options.length > MAX_OPTIONS) errors.options = `Write 2 to ${MAX_OPTIONS} options, one per line.`;
    else if (options.some((o) => o.length > 80)) errors.options = "Keep each option to 80 characters.";
  }
  if (!editing && fields.length >= MAX_INTAKE_FIELDS) errors.label = `A form can have up to ${MAX_INTAKE_FIELDS} questions.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  const id = editing?.id ?? fieldIdFor(label, fields.map((f) => f.id));
  return { ok: true, value: { id, label, type: type!, options: type === "choice" ? options : [], required: v.required === "on" } };
}

/** "Orthodontics, Implants" or one per line: a staff member's specialties or languages. */
function list(value: string | undefined, max: number, length: number): string[] | null {
  const items = [
    ...new Set(
      (value ?? "")
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  return items.length > max || items.some((s) => s.length > length) ? null : items;
}

/** A staff member's profile fields on the Services & team page: `specialties`, `languages` (comma separated) and `bio`. */
export function parseStaffProfile(v: Record<string, string>): Parsed<Required<Pick<BookingStaff, "specialties" | "languages" | "bio">>> {
  const errors: Record<string, string> = {};
  const specialties = list(v.specialties, 10, 80);
  if (!specialties) errors.specialties = "Write up to 10, separated by commas, each up to 80 characters.";
  const languages = list(v.languages, 10, 40);
  if (!languages) errors.languages = "Write up to 10, separated by commas, each up to 40 characters.";
  const bio = (v.bio ?? "").trim();
  if (bio.length > 2000) errors.bio = "Use at most 2000 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { specialties: specialties!, languages: languages!, bio: bio || null } };
}
