import type { DashT } from "@/i18n/dashboard";
import type { Course, CourseLesson, CourseQuiz } from "@/lib/data/types";
import { localParts } from "@/lib/courses/builder";
import { topicItems, type TopicItem } from "@/lib/courses/learning";
import { examValues, questionsText } from "@/lib/courses/quizzes";

/** 132.14 What the course editor's curriculum and a lesson's own page share. */

export function lessonValues(l: CourseLesson, zone: string): Record<string, string> {
  return {
    id: String(l.id),
    title: l.title,
    videoUrl: l.videoUrl ?? "",
    text: l.text,
    duration: l.durationMinutes ? String(l.durationMinutes) : "",
    preview: l.preview ? "on" : "",
    dripDays: l.dripDays ? String(l.dripDays) : "",
    opensOn: localParts(l.opensAt, zone).date,
    attachments: (l.attachments ?? []).map((a) => `${a.name} | ${a.url}`).join("\n"),
  };
}

export function quizValues(q: CourseQuiz, zone: string): Record<string, string> {
  return {
    id: String(q.id),
    title: q.title,
    passPercent: String(q.passPercent),
    attemptsAllowed: q.attemptsAllowed ? String(q.attemptsAllowed) : "",
    timeLimit: q.timeLimitMinutes ? String(q.timeLimitMinutes) : "",
    questions: questionsText(q),
    shuffle: q.shuffle ? "on" : "",
    showAnswers: q.showAnswers ? "on" : "",
    bankPicks: q.bankPicks ? String(q.bankPicks) : "",
    // 113.7
    ...examValues(q, zone),
  };
}

/** 112.5 What the row says about an item. */
export function itemMeta(it: TopicItem, t: DashT, zone: string): string {
  if (it.kind === "lesson") {
    const l = it.lesson;
    const kind = l.videoUrl ? t("courses.video") : t("courses.text");
    return [
      l.durationMinutes ? t("courses.lessonMeta", { kind, minutes: l.durationMinutes }) : kind,
      ...(l.preview ? [t("courses.freePreviewMeta")] : []),
      ...(l.dripDays ? [t("courses.opensAfterMeta", { days: l.dripDays })] : []),
      ...(l.opensAt ? [t("lms.opensOnMeta", { date: localParts(l.opensAt, zone).date })] : []),
      ...(l.attachments?.length ? [t("courses.filesMeta", { count: l.attachments.length })] : []),
    ].join(" · ");
  }
  if (it.kind === "quiz") {
    const meta = t("courses.quizMeta", { questions: it.quiz.questions.length, pass: it.quiz.passPercent });
    // 113.7 An exam says when it opens.
    const exam = it.quiz.exam ? ` · ${it.quiz.exam.opensAt ? t("learning.examMeta", { date: localParts(it.quiz.exam.opensAt, zone).date }) : t("learning.examShort")}` : "";
    return (it.quiz.bankPicks ? `${meta} · ${t("lms.bankPicksMeta", { count: it.quiz.bankPicks })}` : meta) + exam;
  }
  if (it.kind === "assignment") {
    const meta = t("lms.assignmentMeta", { points: it.assignment.maxPoints });
    return [meta, ...(it.assignment.rubric?.length ? [t("learning.rubricMeta")] : []), ...((it.assignment.attemptsAllowed ?? 1) > 1 ? [t("learning.triesMeta", { count: it.assignment.attemptsAllowed! })] : [])].join(" · ");
  }
  const { date, time } = localParts(it.live.startsAt, zone);
  return t("lms.liveMeta", { date, time, minutes: it.live.durationMinutes });
}

export const itemTitle = (it: TopicItem) => (it.kind === "lesson" ? it.lesson.title : it.kind === "quiz" ? it.quiz.title : it.kind === "assignment" ? it.assignment.title : it.live.title);

/** Every item of the course in order, with its section. */
export function courseItemsWithTopics(course: Course) {
  return course.topics.flatMap((topic) => topicItems(topic).map((item) => ({ topic, item })));
}
