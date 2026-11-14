import type { DashKey, DashT } from "@/i18n/dashboard";
import type { LearningWords } from "@/components/studio/learning";
import type { LiveStatusWords } from "@/components/studio/live-status";
import type { SchoolWords } from "@/components/studio/school";

/**
 * 123 The sample words the canvas's cards show where the app shows the
 * person's own (the student's cards, the greeting header, 128 the order on
 * its way, the family's school day): Studio's words in one language. 128 The
 * editor gets them in each of the project's languages, so the canvas shows
 * them in the language being edited, as the app does, not in the
 * dashboard's.
 */
export interface CanvasWords {
  live: LiveStatusWords;
  learning: LearningWords;
  greeting: { date: string; hello: string };
  school: Omit<SchoolWords, "date">;
}

const LEARNING = ["lessonOf", "minutesLeft", "streak", "days", "live", "liveWhen", "week", "weekChange", "sampleCourse", "sampleTeacher", "sampleLive", "weekdays", "photoChip", "liveAt", "photoCourse"] as const;
const SCHOOL = ["hello", "childOne", "childTwo", "checkedIn", "onTime", "now", "next", "bus", "busRoute"] as const;

export function canvasWords(t: DashT): CanvasWords {
  return {
    live: { title: t("studio.lv_title"), minutes: t("studio.lv_min") },
    learning: Object.fromEntries(LEARNING.map((k) => [k, t(`studio.lw_${k}` as DashKey)])) as unknown as LearningWords,
    greeting: { date: t("studio.greetingDate"), hello: t("studio.greetingHello") },
    school: Object.fromEntries(SCHOOL.map((k) => [k, t(`studio.sw_${k}` as DashKey)])) as unknown as Omit<SchoolWords, "date">,
  };
}
