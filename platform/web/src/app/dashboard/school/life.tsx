import type { DashT } from "@/i18n/dashboard";
import type { SchoolClass, SchoolEvent } from "@/lib/data/types";

/** 113.8 What the Calendar, Exams and Behaviour pages share. */

/** Who an event can be for: everyone, the staff, a grade or a class. */
export function audienceOptions(classes: readonly SchoolClass[], t: DashT, withSchool = true) {
  const grades = [...new Set(classes.map((c) => c.grade).filter((g): g is string => g !== null))];
  return [
    ...(withSchool ? [{ value: "school", label: t("schoolLife.forSchool") }, { value: "staff", label: t("schoolLife.forStaff") }] : []),
    ...grades.map((g) => ({ value: `grade:${g}`, label: t("schoolLife.forGrade", { grade: g }) })),
    ...classes.map((c) => ({ value: `class:${c.id}`, label: t("schoolLife.forClass", { name: c.name }) })),
  ];
}

export function audienceLabel(item: Pick<SchoolEvent, "audience" | "grade" | "classId">, classes: Map<number, string>, t: DashT): string {
  if (item.audience === "school") return t("schoolLife.forSchool");
  if (item.audience === "staff") return t("schoolLife.forStaff");
  if (item.audience === "grade") return t("schoolLife.forGrade", { grade: item.grade ?? "—" });
  return t("schoolLife.forClass", { name: classes.get(item.classId ?? 0) ?? "—" });
}

/** An event's colour on the calendar, by its kind. */
export const KIND_TONE = { event: "bg-success-bg text-ink", holiday: "bg-peach-soft text-ink", exam: "bg-sand text-ink" } as const;
