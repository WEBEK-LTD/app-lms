import { isDate } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, SchoolAssessment, SchoolAttendanceStatus, SchoolPerson, SchoolSettings } from "../data/types";
import { csv } from "../events/forms";
import { percentOf } from "./service";

/**
 * 112.5 A school's gradebook and report cards: for a class over a period
 * (the current term by default), each student's percent in each subject
 * (the share of the marks over that subject's scored exams, quizzes and
 * assignments), their overall percent and their attendance; as a page, a
 * CSV file and one printable report card per student.
 */

export interface Period {
  from: string;
  to: string;
  /** The term's name when the period is the school's current term. */
  term: string | null;
}

/** The period asked for (`from`, `to`), else the current term, else this year so far. */
export function reportPeriod(settings: Pick<SchoolSettings, "term">, query: { from?: string; to?: string }, today: string): Period {
  const from = query.from && isDate(query.from) ? query.from : null;
  const to = query.to && isDate(query.to) ? query.to : null;
  if (from && to && from <= to) {
    const term = settings.term && settings.term.startsOn === from && settings.term.endsOn === to ? settings.term.name : null;
    return { from, to, term };
  }
  if (settings.term) return { from: settings.term.startsOn, to: settings.term.endsOn, term: settings.term.name };
  return { from: `${today.slice(0, 4)}-01-01`, to: today, term: null };
}

export interface SubjectResult {
  subjectId: number;
  name: string;
  /** 0 to 100, one decimal; null without a score. */
  percent: number | null;
  scores: { assessment: SchoolAssessment; score: number; note: string | null }[];
}

export interface ReportRow {
  student: SchoolPerson;
  subjects: SubjectResult[];
  overall: number | null;
  attendance: Record<SchoolAttendanceStatus, number>;
}

export interface Gradebook {
  period: Period;
  subjects: { id: number; name: string }[];
  rows: ReportRow[];
}

/** The class's gradebook over the period; `studentId` for one student's report card. */
export async function classGradebook(store: DataStore, app: Pick<App, "id">, classId: number, period: Period, studentId?: number): Promise<Gradebook> {
  const [subjects, assessments, students, attendance] = await Promise.all([
    store.listSchoolSubjects(app.id),
    store.listSchoolAssessments(app.id, { classId }),
    store.listSchoolPeople(app.id, { role: "student", classId }),
    store.listSchoolAttendance(app.id, { classId, from: period.from, to: period.to }),
  ]);
  const inPeriod = assessments.filter((a) => a.date >= period.from && a.date <= period.to);
  const scores = (await Promise.all(inPeriod.map((a) => store.listSchoolScores(app.id, { assessmentId: a.id })))).flat();
  const byId = new Map(inPeriod.map((a) => [a.id, a]));
  const taught = subjects.filter((s) => inPeriod.some((a) => a.subjectId === s.id)).map((s) => ({ id: s.id, name: s.name }));
  const rows = students
    .filter((s) => s.active && (studentId === undefined || s.id === studentId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((student): ReportRow => {
      const mine = scores.filter((s) => s.studentId === student.id && byId.has(s.assessmentId));
      const results = taught.map((subject) => {
        const of = mine.filter((s) => byId.get(s.assessmentId)!.subjectId === subject.id).map((s) => ({ assessment: byId.get(s.assessmentId)!, score: s.score, note: s.note }));
        of.sort((a, b) => a.assessment.date.localeCompare(b.assessment.date) || a.assessment.id - b.assessment.id);
        return { subjectId: subject.id, name: subject.name, percent: percentOf(of.map((s) => ({ score: s.score, maxScore: s.assessment.maxScore }))), scores: of };
      });
      const counts: Record<SchoolAttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
      for (const day of attendance) if (day.studentId === student.id) counts[day.status]++;
      return {
        student,
        subjects: results,
        overall: percentOf(mine.map((s) => ({ score: s.score, maxScore: byId.get(s.assessmentId)!.maxScore }))),
        attendance: counts,
      };
    });
  return { period, subjects: taught, rows };
}

/** The gradebook as a CSV file; `k` puts its words in the downloader's language. */
export function gradebookCsv(book: Gradebook, k: (english: string) => string = (english) => english): string {
  const pct = (value: number | null) => (value === null ? "" : String(value));
  return csv([
    [k("Student"), k("Code"), ...book.subjects.map((s) => `${s.name} (%)`), k("Overall (%)"), k("Present"), k("Absent"), k("Late"), k("Excused")],
    ...book.rows.map((r) => [
      r.student.name,
      r.student.code ?? "",
      ...r.subjects.map((s) => pct(s.percent)),
      pct(r.overall),
      r.attendance.present,
      r.attendance.absent,
      r.attendance.late,
      r.attendance.excused,
    ]),
  ]);
}
