import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { App, SchoolBehaviourAlerts, SchoolBehaviourCategory, SchoolBehaviourKind, SchoolBehaviourNote, SchoolPerson } from "../data/types";
import type { SchoolDirectory } from "./service";
import { schoolSettingsOf } from "./settings";

/**
 * 113.8 Behaviour: merits and notes on a student, each of a category the
 * school defines (positive or negative, with its points), written by a
 * teacher in the app or by the school in the dashboard. The student and
 * their parents see the record and its points; parents get a push for all
 * of them, only the negative ones, or none, as the school chooses.
 */

export const BEHAVIOUR_LIMITS = { categories: 40, name: 60, note: 500, points: 100 } as const;

/** The categories a school starts with, in the app's language; the school changes them on Behaviour. */
const SUGGESTED: Record<Lang, { name: string; kind: SchoolBehaviourKind; points: number }[]> = {
  en: [
    { name: "Helping others", kind: "positive", points: 2 },
    { name: "Great work", kind: "positive", points: 1 },
    { name: "Taking part", kind: "positive", points: 1 },
    { name: "Late to class", kind: "negative", points: -1 },
    { name: "Homework not done", kind: "negative", points: -1 },
    { name: "Disrupting the class", kind: "negative", points: -2 },
  ],
  ar: [
    { name: "مساعدة الآخرين", kind: "positive", points: 2 },
    { name: "عمل متميز", kind: "positive", points: 1 },
    { name: "مشاركة فعّالة", kind: "positive", points: 1 },
    { name: "التأخر عن الحصة", kind: "negative", points: -1 },
    { name: "عدم حل الواجب", kind: "negative", points: -1 },
    { name: "إزعاج الفصل", kind: "negative", points: -2 },
  ],
  tr: [
    { name: "Başkalarına yardım", kind: "positive", points: 2 },
    { name: "Harika çalışma", kind: "positive", points: 1 },
    { name: "Derse katılım", kind: "positive", points: 1 },
    { name: "Derse geç kalma", kind: "negative", points: -1 },
    { name: "Ödev yapılmadı", kind: "negative", points: -1 },
    { name: "Dersi bölme", kind: "negative", points: -2 },
  ],
};

export function suggestedCategories(lang: Lang) {
  return SUGGESTED[lang];
}

/** Points with their sign: a positive category's are 0 or more, a negative one's 0 or less. */
export function signedPoints(kind: SchoolBehaviourKind, points: number): number {
  const size = Math.min(BEHAVIOUR_LIMITS.points, Math.abs(Math.trunc(points)));
  return kind === "negative" ? -size : size;
}

/** The school's categories; a school that never saved any starts with the suggested ones. */
export async function behaviourCategories(store: DataStore, app: App, now: Date): Promise<SchoolBehaviourCategory[]> {
  const saved = await store.listSchoolBehaviourCategories(app.id);
  if (saved.length > 0) return saved;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  if (settings.behaviourCategoriesSet) return [];
  for (const c of suggestedCategories(await appLang(store, app.id))) await store.saveSchoolBehaviourCategory({ appId: app.id, id: null, ...c, active: true }, now);
  await store.saveSchoolSettings(app.id, { ...settings, behaviourCategoriesSet: true }, now);
  return store.listSchoolBehaviourCategories(app.id);
}

export function behaviourAlertsOf(settings: { behaviourAlerts?: SchoolBehaviourAlerts }): SchoolBehaviourAlerts {
  return settings.behaviourAlerts ?? "all";
}

/** Whether parents are told of a note of this kind. */
export function tellsParents(alerts: SchoolBehaviourAlerts, kind: SchoolBehaviourKind): boolean {
  return alerts === "all" || (alerts === "negative" && kind === "negative");
}

/** A record's points and how many merits and notes it has. */
export function behaviourTotals(notes: readonly Pick<SchoolBehaviourNote, "kind" | "points">[]) {
  return {
    points: notes.reduce((sum, n) => sum + n.points, 0),
    positive: notes.filter((n) => n.kind === "positive").length,
    negative: notes.filter((n) => n.kind === "negative").length,
  };
}

export function categoryJson(category: SchoolBehaviourCategory) {
  return { id: category.id, name: category.name, kind: category.kind, points: category.points };
}

export function behaviourJson(note: SchoolBehaviourNote, dir: Pick<SchoolDirectory, "people" | "classes">) {
  return {
    id: note.id,
    student_id: note.studentId,
    student_name: dir.people.get(note.studentId)?.name ?? "",
    class_name: note.classId !== null ? (dir.classes.get(note.classId)?.name ?? null) : null,
    kind: note.kind,
    category: note.categoryName,
    points: note.points,
    note: note.note,
    teacher_name: note.teacherId !== null ? (dir.people.get(note.teacherId)?.name ?? null) : null,
    created_at: note.createdAt.toISOString(),
  };
}

/** Each student's points and counts over notes, for a class's view and the reports. */
export function totalsByStudent(students: readonly SchoolPerson[], notes: readonly SchoolBehaviourNote[]) {
  return students.map((student) => ({ student, ...behaviourTotals(notes.filter((n) => n.studentId === student.id)) }));
}
