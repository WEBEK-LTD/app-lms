import { addDays, isDate } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, SchoolClass, SchoolSubject, SchoolSyllabusTopic, SchoolSyllabusUnit, SchoolTopicProgress } from "../data/types";
import { parseCsv, ImportFormatError } from "../import/table";

/**
 * 113.5 The syllabus of each subject per grade (its units, and their lessons
 * or topics with the days the plan gives each) and each class's progress
 * through it: a topic covered on a day, with a note. A class follows the
 * syllabus of its grade (`SchoolClass.grade`, else its own name). The plan
 * says a topic is due once its last day has passed; a class that covered
 * fewer of its topics than are due is behind the plan.
 */

export const SYLLABUS_LIMITS = {
  unitsPerSubject: 60,
  topicsPerUnit: 60,
  title: 200,
  note: 500,
  /** The longest a topic's planned days run. */
  topicDays: 366,
  importRows: 2000,
} as const;

/** The grade whose syllabus a class follows. */
export const syllabusGradeOf = (klass: Pick<SchoolClass, "grade" | "name">): string => klass.grade?.trim() || klass.name;

/** The school's grades, as its classes name them, in the classes' order. */
export function schoolGrades(classes: readonly Pick<SchoolClass, "grade" | "name">[]): string[] {
  return [...new Set(classes.map(syllabusGradeOf))];
}

export type ProgressStatus = "behind" | "on_plan" | "ahead";

export interface TopicProgress {
  topic: SchoolSyllabusTopic;
  covered: SchoolTopicProgress | null;
  /** The plan says it is done by now (its last day has passed). */
  due: boolean;
  /** Today is one of its planned days. */
  now: boolean;
}

export interface UnitProgress {
  unit: SchoolSyllabusUnit;
  topics: TopicProgress[];
}

export interface SubjectProgress {
  subject: Pick<SchoolSubject, "id" | "name">;
  units: UnitProgress[];
  total: number;
  covered: number;
  /** Topics the plan says are done by today. */
  due: number;
  /** Covered, 0 to 100 (whole numbers). */
  percent: number;
  /** Where the plan says the class should be, 0 to 100. */
  plannedPercent: number;
  /** Due topics not covered yet. */
  behindBy: number;
  status: ProgressStatus;
  /** The topic the plan has for today, else the next one. */
  planned: SchoolSyllabusTopic | null;
  /** The last topic the class covered. */
  lastCovered: { topic: SchoolSyllabusTopic; coveredOn: string } | null;
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

/** A subject's progress for a class on `today`, from its syllabus and the class's covered topics. */
export function subjectProgress(subject: Pick<SchoolSubject, "id" | "name">, units: readonly SchoolSyllabusUnit[], topics: readonly SchoolSyllabusTopic[], covered: readonly SchoolTopicProgress[], today: string): SubjectProgress {
  const byTopic = new Map(covered.map((c) => [c.topicId, c]));
  const out: UnitProgress[] = [...units]
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map((unit) => ({
      unit,
      topics: topics
        .filter((t) => t.unitId === unit.id)
        .sort((a, b) => a.position - b.position || a.id - b.id)
        .map((topic) => ({ topic, covered: byTopic.get(topic.id) ?? null, due: topic.endsOn < today, now: topic.startsOn <= today && today <= topic.endsOn })),
    }));
  const all = out.flatMap((u) => u.topics);
  const total = all.length;
  const done = all.filter((t) => t.covered).length;
  const due = all.filter((t) => t.due).length;
  const behindBy = all.filter((t) => t.due && !t.covered).length;
  const status: ProgressStatus = behindBy > 0 ? "behind" : done > due ? "ahead" : "on_plan";
  const planned = all.find((t) => t.now)?.topic ?? [...all].filter((t) => t.topic.startsOn > today).sort((a, b) => a.topic.startsOn.localeCompare(b.topic.startsOn))[0]?.topic ?? null;
  const last = all.filter((t) => t.covered).sort((a, b) => b.covered!.coveredOn.localeCompare(a.covered!.coveredOn) || b.topic.position - a.topic.position)[0];
  return {
    subject,
    units: out,
    total,
    covered: done,
    due,
    percent: pct(done, total),
    plannedPercent: pct(due, total),
    behindBy,
    status,
    planned,
    lastCovered: last ? { topic: last.topic, coveredOn: last.covered!.coveredOn } : null,
  };
}

export interface ClassProgress {
  klass: SchoolClass;
  grade: string;
  subjects: SubjectProgress[];
}

/** Every subject with a syllabus for the class's grade (or only `subjectIds`), by name. */
export async function classProgress(store: DataStore, app: Pick<App, "id">, klass: SchoolClass, today: string, subjectIds?: readonly number[]): Promise<ClassProgress> {
  const grade = syllabusGradeOf(klass);
  const [subjects, units, covered] = await Promise.all([store.listSchoolSubjects(app.id), store.listSchoolSyllabusUnits(app.id, { grade }), store.listSchoolTopicProgress(app.id, { classId: klass.id })]);
  const topics = await store.listSchoolSyllabusTopics(app.id, { unitIds: units.map((u) => u.id) });
  const out = subjects
    .filter((s) => units.some((u) => u.subjectId === s.id) && (!subjectIds || subjectIds.includes(s.id)))
    .map((s) => subjectProgress(s, units.filter((u) => u.subjectId === s.id), topics, covered, today))
    .filter((p) => p.total > 0 || p.units.length > 0);
  return { klass, grade, subjects: out };
}

/** The whole school: each class and subject, those behind the plan first. */
export async function schoolProgress(store: DataStore, app: Pick<App, "id">, today: string): Promise<{ klass: SchoolClass; progress: SubjectProgress }[]> {
  const classes = await store.listSchoolClasses(app.id);
  const rows = (await Promise.all(classes.map((c) => classProgress(store, app, c, today)))).flatMap((c) => c.subjects.map((progress) => ({ klass: c.klass, progress })));
  const rank: Record<ProgressStatus, number> = { behind: 0, on_plan: 1, ahead: 2 };
  return rows.sort((a, b) => rank[a.progress.status] - rank[b.progress.status] || b.progress.behindBy - a.progress.behindBy || a.klass.position - b.klass.position);
}

/** A topic's planned days, checked: both days, the first not after the last, within a year. */
export function plannedDays(startsOn: string, endsOn: string): { startsOn: string; endsOn: string } | null {
  if (!isDate(startsOn) || !isDate(endsOn) || endsOn < startsOn || addDays(startsOn, SYLLABUS_LIMITS.topicDays) < endsOn) return null;
  return { startsOn, endsOn };
}

// A syllabus from a sheet

/** One row of a syllabus file, checked. */
export interface SyllabusRow {
  line: number;
  grade: string;
  subject: string;
  unit: string;
  topic: string;
  startsOn: string;
  endsOn: string;
}

const SYLLABUS_COLUMNS: Record<string, string[]> = {
  grade: ["grade", "year", "class"],
  subject: ["subject"],
  unit: ["unit", "chapter"],
  topic: ["topic", "lesson", "title"],
  from: ["from", "starts", "start", "starts on"],
  to: ["to", "ends", "end", "ends on"],
  week: ["week", "week of", "week starting"],
};

/** A syllabus file to start from, as the Syllabus page shows it. */
export const SYLLABUS_CSV_EXAMPLE = [
  "grade,subject,unit,topic,from,to",
  "Grade 5,Mathematics,Fractions,Adding fractions,2026-10-04,2026-10-08",
  "Grade 5,Mathematics,Fractions,Subtracting fractions,2026-10-11,2026-10-15",
  "Grade 5,Science,Plants,Parts of a plant,2026-10-04,2026-10-08",
].join("\n");

/**
 * A CSV of the syllabus: grade, subject, unit, topic, and the planned days
 * as `from` and `to`, or `week` (the week's first day, for seven days).
 * Rows with problems are listed by their line; the others are taken.
 */
export function parseSyllabusCsv(text: string): { ok: true; rows: SyllabusRow[]; problems: string[] } | { ok: false; message: string } {
  let table;
  try {
    table = parseCsv(text);
  } catch (e) {
    if (e instanceof ImportFormatError) return { ok: false, message: e.message };
    throw e;
  }
  const at = (name: string) => table.columns.findIndex((c) => SYLLABUS_COLUMNS[name]!.includes(c.trim().toLowerCase()));
  const columns = Object.fromEntries(Object.keys(SYLLABUS_COLUMNS).map((k) => [k, at(k)])) as Record<string, number>;
  if (columns.grade! < 0 || columns.subject! < 0 || columns.unit! < 0 || columns.topic! < 0 || ((columns.from! < 0 || columns.to! < 0) && columns.week! < 0)) {
    return { ok: false, message: "The file needs the columns grade, subject, unit, topic, and from and to (or week)." };
  }
  const rows: SyllabusRow[] = [];
  const problems: string[] = [];
  table.rows.slice(0, SYLLABUS_LIMITS.importRows).forEach((cells, i) => {
    const line = i + 2;
    const cell = (name: string) => (columns[name]! >= 0 ? (cells[columns[name]!] ?? "").trim() : "");
    const [grade, subject, unit, topic] = [cell("grade"), cell("subject"), cell("unit"), cell("topic")];
    if (!grade || !subject || !unit || !topic) {
      problems.push(`Line ${line}: give the grade, the subject, the unit and the topic.`);
      return;
    }
    if (grade.length > 80 || subject.length > 60 || unit.length > SYLLABUS_LIMITS.title || topic.length > SYLLABUS_LIMITS.title) {
      problems.push(`Line ${line}: a name is too long.`);
      return;
    }
    const week = cell("week");
    const from = cell("from") || week;
    const to = cell("to") || (week && isDate(week) ? addDays(week, 6) : "");
    const days = plannedDays(from, to);
    if (!days) {
      problems.push(`Line ${line}: give the days as dates like 2026-10-04, the first not after the last.`);
      return;
    }
    rows.push({ line, grade, subject, unit, topic, ...days });
  });
  if (table.rows.length > SYLLABUS_LIMITS.importRows) problems.push(`Only the first ${SYLLABUS_LIMITS.importRows} rows were read.`);
  return { ok: true, rows, problems };
}
