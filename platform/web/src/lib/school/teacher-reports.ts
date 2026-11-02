import { isDate } from "../bookings/time";
import type { DataStore } from "../data/store";
import {
  SCHOOL_REPORT_FIELD_TYPES,
  SCHOOL_REPORT_KINDS,
  type App,
  type SchoolPerson,
  type SchoolReport,
  type SchoolReportComment,
  type SchoolReportField,
  type SchoolReportFieldType,
  type SchoolReportKind,
  type SchoolReportStatus,
  type SchoolReportTemplate,
} from "../data/types";
import { notifyDeps, type FlowDeps } from "../delivery/flow";
import { pushOwnerSafely } from "../owner/push-env";
import { pushSchoolReportSent, tellParentsReportShared, tellTeacherReport } from "./report-notify";
import { studentJson, type SchoolDirectory } from "./service";

/**
 * 113.5 The teachers' working reports to the administration (not the report
 * cards of 112.5): on a student (their level, behaviour, attendance,
 * strengths, what to do next) or on a class (a period's summary), written on
 * the school's templates (text, a choice, a rating from 1 to 5). A teacher
 * keeps a draft, then sends it; the administration reads it, comments, sends
 * it back for changes (the teacher changes it and sends it again) or
 * approves it, and may share an approved student report with the student's
 * parents. Who hears of it: the administration (on Yallapp Business) when a
 * report is sent, the teacher when it is commented on, sent back or
 * approved, the parents when one is shared.
 */

export const REPORT_LIMITS = {
  templates: 40,
  fields: 20,
  options: 12,
  templateName: 120,
  label: 120,
  option: 60,
  text: 2000,
  comment: 1000,
  comments: 100,
} as const;

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };
const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

// Templates

export function parseTemplateForm(form: Record<string, string>): Parsed<{ kind: SchoolReportKind; name: string }> {
  const errors: Record<string, string> = {};
  const name = str(form, "name");
  if (!name) errors.name = "Name the template, like End of term report.";
  else if (name.length > REPORT_LIMITS.templateName) errors.name = `Keep it under ${REPORT_LIMITS.templateName} characters.`;
  const kind = str(form, "kind");
  if (!(SCHOOL_REPORT_KINDS as readonly string[]).includes(kind)) errors.kind = "Choose a report on a student or on a class.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { kind: kind as SchoolReportKind, name } };
}

/** A field added to a template: its label, its type, a choice's choices (one per line) and whether it must be filled in. */
export function parseFieldForm(form: Record<string, string>, existing: readonly SchoolReportField[]): Parsed<SchoolReportField> {
  const errors: Record<string, string> = {};
  const label = str(form, "label");
  if (!label) errors.label = "Write the field's label, like Behaviour.";
  else if (label.length > REPORT_LIMITS.label) errors.label = `Keep it under ${REPORT_LIMITS.label} characters.`;
  const type = str(form, "type");
  if (!(SCHOOL_REPORT_FIELD_TYPES as readonly string[]).includes(type)) errors.type = "Choose text, a choice or a rating.";
  const options =
    type === "choice"
      ? [
          ...new Set(
            str(form, "options")
              .split(/\r?\n|[,،]/)
              .map((o) => o.trim())
              .filter(Boolean),
          ),
        ]
      : [];
  if (type === "choice" && (options.length < 2 || options.length > REPORT_LIMITS.options)) errors.options = `Give 2 to ${REPORT_LIMITS.options} choices, one per line.`;
  else if (options.some((o) => o.length > REPORT_LIMITS.option)) errors.options = `Keep each choice under ${REPORT_LIMITS.option} characters.`;
  if (existing.length >= REPORT_LIMITS.fields) errors.label = `A template can have up to ${REPORT_LIMITS.fields} fields.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { id: nextFieldId(existing), label, type: type as SchoolReportFieldType, options, required: form.required === "on" } };
}

/** "f1", "f2"…: one more than the template's highest. */
export function nextFieldId(fields: readonly Pick<SchoolReportField, "id">[]): string {
  const top = Math.max(0, ...fields.map((f) => Number(/^f(\d+)$/.exec(f.id)?.[1] ?? 0)));
  return `f${top + 1}`;
}

/** A field moved one place up or down. */
export function moveField(fields: readonly SchoolReportField[], id: string, by: -1 | 1): SchoolReportField[] {
  const out = [...fields];
  const at = out.findIndex((f) => f.id === id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= out.length) return out;
  [out[at], out[to]] = [out[to]!, out[at]!];
  return out;
}

/** The ready-made templates the Templates page offers, in the dashboard's words. */
export function suggestedTemplate(kind: SchoolReportKind, words: { name: string; labels: string[] }): Pick<SchoolReportTemplate, "kind" | "name" | "fields"> {
  const types: SchoolReportFieldType[] = kind === "student" ? ["rating", "rating", "text", "text", "text"] : ["text", "rating", "text", "text"];
  return {
    kind,
    name: words.name,
    fields: types.map((type, i) => ({ id: `f${i + 1}`, label: words.labels[i] ?? "", type, options: [], required: i < 2 })),
  };
}

// Answers

/**
 * A report's answers, checked against its fields: text up to 2000
 * characters, one of a choice's choices, a rating from 1 to 5. Empty answers
 * are left out; `complete` (to send it) needs every required field.
 */
export function checkAnswers(fields: readonly SchoolReportField[], raw: unknown, complete: boolean): { ok: true; answers: Record<string, string | number> } | { ok: false; message: string } {
  const input = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const answers: Record<string, string | number> = {};
  for (const field of fields) {
    const value = input[field.id];
    if (value === undefined || value === null || value === "") continue;
    if (field.type === "rating") {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, message: `“${field.label}” is a rating from 1 to 5.` };
      answers[field.id] = n;
    } else if (typeof value !== "string") return { ok: false, message: `Write “${field.label}” as text.` };
    else {
      const text = value.trim();
      if (!text) continue;
      if (field.type === "choice" && !field.options.includes(text)) return { ok: false, message: `Choose one of the choices of “${field.label}”.` };
      if (text.length > REPORT_LIMITS.text) return { ok: false, message: `“${field.label}” can be up to ${REPORT_LIMITS.text} characters.` };
      answers[field.id] = text;
    }
  }
  if (complete) {
    const missing = fields.find((f) => f.required && answers[f.id] === undefined);
    if (missing) return { ok: false, message: `Fill in “${missing.label}” before sending.` };
  }
  return { ok: true, answers };
}

/** A report's answers from the dashboard's form (`answer-<field id>`). */
export function answersFromForm(fields: readonly SchoolReportField[], form: Record<string, string>): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.id, str(form, `answer-${f.id}`)]));
}

/** A period given as two dates, the first not after the second; null when none was given. */
export function reportPeriodOf(from: unknown, to: unknown): { from: string; to: string } | null | "invalid" {
  if ((from === undefined || from === null || from === "") && (to === undefined || to === null || to === "")) return null;
  if (typeof from !== "string" || typeof to !== "string" || !isDate(from) || !isDate(to) || from > to) return "invalid";
  return { from, to };
}

// What the app and the dashboard show

export function reportFieldJson(field: SchoolReportField) {
  return { id: field.id, label: field.label, type: field.type, options: field.options, required: field.required };
}

export function reportTemplateJson(template: SchoolReportTemplate) {
  return { id: template.id, kind: template.kind, name: template.name, fields: template.fields.map(reportFieldJson) };
}

const periodJson = (report: Pick<SchoolReport, "periodFrom" | "periodTo">) => (report.periodFrom && report.periodTo ? { from: report.periodFrom, to: report.periodTo } : null);

/** A report as its teacher sees it, with the administration's comments. */
export function teacherReportJson(report: SchoolReport, dir: SchoolDirectory, assetUrl: (id: string) => string) {
  const student = report.studentId !== null ? (dir.people.get(report.studentId) ?? null) : null;
  return {
    id: report.id,
    kind: report.kind,
    status: report.status,
    template_id: report.templateId,
    template_name: report.templateName,
    student: student ? studentJson(student, dir, assetUrl) : null,
    class_id: report.classId,
    class_name: report.classId !== null ? (dir.classes.get(report.classId)?.name ?? null) : null,
    subject_id: report.subjectId,
    subject: report.subjectId !== null ? (dir.subjects.get(report.subjectId)?.name ?? null) : null,
    period: periodJson(report),
    fields: report.fields.map(reportFieldJson),
    answers: report.answers,
    comments: report.comments.map((c) => ({ by: c.by, name: c.name, text: c.text, at: c.at })),
    read: report.readAt !== null,
    shared: report.sharedAt !== null,
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
    sent_at: report.sentAt?.toISOString() ?? null,
    reviewed_at: report.reviewedAt?.toISOString() ?? null,
  };
}

/** A report the school shared with a student's parents: what the teacher wrote, without the school's comments. */
export function sharedReportJson(report: SchoolReport, dir: SchoolDirectory) {
  return {
    id: report.id,
    title: report.templateName,
    teacher_name: report.teacherName,
    subject: report.subjectId !== null ? (dir.subjects.get(report.subjectId)?.name ?? null) : null,
    period: periodJson(report),
    fields: report.fields.map(reportFieldJson),
    answers: report.answers,
    shared_at: report.sharedAt!.toISOString(),
  };
}

/** What a report is about, in a line: the student (and their class), or the class. */
export function reportAbout(report: Pick<SchoolReport, "studentId" | "classId">, dir: Pick<SchoolDirectory, "people" | "classes">): string {
  const student = report.studentId !== null ? dir.people.get(report.studentId)?.name : null;
  const klass = report.classId !== null ? dir.classes.get(report.classId)?.name : null;
  return [student, klass].filter(Boolean).join(" · ");
}

// What changes and who is told

export type ReportFlowDeps = FlowDeps & {
  /** The administration's phones (Yallapp Business); by default from the environment. */
  pushOwner?: typeof pushOwnerSafely;
};

async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch {
    // The change is saved either way.
  }
}

const comment = (by: SchoolReportComment["by"], name: string, text: string, now: Date): SchoolReportComment => ({ by, name: name.slice(0, 120), text: text.slice(0, REPORT_LIMITS.comment), at: now.toISOString() });
const withComment = (report: SchoolReport, next: SchoolReportComment | null) => (next ? [...report.comments, next].slice(-REPORT_LIMITS.comments) : report.comments);

/** The teacher sends a draft, or a report sent back, with an optional note; the administration is told. False when it can't be sent (any longer). */
export async function sendReport(deps: ReportFlowDeps, report: SchoolReport, teacher: Pick<SchoolPerson, "name">, note: string | null): Promise<SchoolReport | null> {
  const { store, app, now } = deps;
  const comments = withComment(report, note ? comment("teacher", teacher.name, note, now) : null);
  const patch = { status: "sent" as const, sentAt: now, readAt: null, comments, updatedAt: now };
  if (!(await store.updateSchoolReport(app.id, report.id, patch, { statuses: ["draft", "returned"] }))) return null;
  const sent = { ...report, ...patch };
  const student = sent.studentId !== null ? await store.getSchoolPerson(app.id, sent.studentId) : null;
  const dir = { people: new Map(student ? [[student.id, student]] : []), classes: new Map((await store.listSchoolClasses(app.id)).map((c) => [c.id, c])) };
  await (deps.pushOwner ?? pushOwnerSafely)((d) => pushSchoolReportSent(d, app, sent, reportAbout(sent, dir)), store);
  return sent;
}

export type ReviewAction = "comment" | "return" | "approve";

/**
 * The administration's answer on a sent (or approved) report: a comment, a
 * send-back for changes (with what to change) or its approval; the teacher
 * is told. Null when the report isn't in a state for it.
 */
export async function reviewReport(deps: ReportFlowDeps, report: SchoolReport, action: ReviewAction, text: string, by: string): Promise<SchoolReport | null> {
  const { store, app, now } = deps;
  const note = text.trim() ? comment("school", by, text.trim(), now) : null;
  const allowed: SchoolReportStatus[] = action === "comment" ? ["sent", "returned", "approved"] : action === "return" ? ["sent", "approved"] : ["sent"];
  if (action === "return" && !note) return null;
  if (action === "comment" && !note) return null;
  const status: SchoolReportStatus = action === "comment" ? report.status : action === "return" ? "returned" : "approved";
  const patch = {
    status,
    comments: withComment(report, note),
    ...(action === "comment" ? {} : { reviewedAt: now }),
    // A report sent back is no longer shared.
    ...(action === "return" ? { sharedAt: null } : {}),
    readAt: report.readAt ?? now,
    updatedAt: now,
  };
  if (!(await store.updateSchoolReport(app.id, report.id, patch, { statuses: allowed }))) return null;
  const next = { ...report, ...patch };
  const teacher = report.teacherId !== null ? await store.getSchoolPerson(app.id, report.teacherId) : null;
  if (teacher) await safely(() => tellTeacherReport(notifyDeps(deps), teacher, next, action));
  return next;
}

/** The administration opened a sent report: the teacher sees it was read. */
export async function markReportRead(store: DataStore, app: Pick<App, "id">, report: SchoolReport, now: Date): Promise<void> {
  if (report.status === "sent" && report.readAt === null) await store.updateSchoolReport(app.id, report.id, { readAt: now }, { statuses: ["sent"] });
}

/** An approved student report shared with the student's parents (they are told), or no longer. */
export async function shareReport(deps: ReportFlowDeps, report: SchoolReport, share: boolean): Promise<SchoolReport | null> {
  const { store, app, now } = deps;
  if (report.kind !== "student" || report.studentId === null) return null;
  if (share && report.sharedAt !== null) return report;
  const patch = { sharedAt: share ? now : null, updatedAt: now };
  if (!(await store.updateSchoolReport(app.id, report.id, patch, { statuses: ["approved"] }))) return null;
  const next = { ...report, ...patch };
  if (share) {
    const student = await store.getSchoolPerson(app.id, report.studentId);
    if (student) await safely(() => tellParentsReportShared(notifyDeps(deps), student, next));
  }
  return next;
}
