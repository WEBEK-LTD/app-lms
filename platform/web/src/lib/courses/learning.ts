import { createHmac, timingSafeEqual } from "node:crypto";
import type { AssignmentSubmission, Course, CourseEnrollment, CourseAssignment, CourseLesson, CourseLiveSession, CourseQuiz, CourseSetup, CourseTopic, LessonProgress, QuizAttempt } from "../data/types";

/**
 * 90.1 Academies without a website: quizzes at the end of topics, files
 * with lessons, lessons that open some days after enrolling (drip), access
 * that ends some days after enrolling, and certificates for students who
 * finish (every lesson completed and every quiz passed). 112.5 Assignments
 * and live classes in the sections, items in the owner's order, lessons
 * that open on a date, and courses taken in order.
 */

const DAY = 86_400_000;

export const QUIZ_LIMITS = { questions: 50, options: 8, text: 500, title: 120 } as const;

export function quizzesOf(course: Course): CourseQuiz[] {
  return course.topics.flatMap((t) => t.quizzes ?? []);
}

/** 112.5 */
export function assignmentsOf(course: Course): CourseAssignment[] {
  return course.topics.flatMap((t) => t.assignments ?? []);
}

/** 112.5 */
export function liveSessionsOf(course: Course): CourseLiveSession[] {
  return course.topics.flatMap((t) => t.live ?? []);
}

export type TopicItem =
  | { kind: "lesson"; id: number; lesson: CourseLesson }
  | { kind: "quiz"; id: number; quiz: CourseQuiz }
  | { kind: "assignment"; id: number; assignment: CourseAssignment }
  | { kind: "live"; id: number; live: CourseLiveSession };

/** A topic's items in order: 112.5 the owner's (`order`), else its lessons, then its quizzes, assignments and live classes. */
export function topicItems(topic: CourseTopic): TopicItem[] {
  const all: TopicItem[] = [
    ...topic.lessons.map((lesson) => ({ kind: "lesson" as const, id: lesson.id, lesson })),
    ...(topic.quizzes ?? []).map((quiz) => ({ kind: "quiz" as const, id: quiz.id, quiz })),
    ...(topic.assignments ?? []).map((assignment) => ({ kind: "assignment" as const, id: assignment.id, assignment })),
    ...(topic.live ?? []).map((live) => ({ kind: "live" as const, id: live.id, live })),
  ];
  if (!topic.order?.length) return all;
  const rank = new Map(topic.order.map((id, i) => [id, i]));
  return all.map((item, i) => ({ item, i })).sort((a, b) => (rank.get(a.item.id) ?? topic.order!.length + a.i) - (rank.get(b.item.id) ?? topic.order!.length + b.i)).map((x) => x.item);
}

/** 112.5 Every item of the course in order. */
export function courseItems(course: Course): TopicItem[] {
  return course.topics.flatMap(topicItems);
}

/** 112.5 Moves an item one place up or down in its topic; the topic keeps its order from then on. */
export function moveTopicItem(topic: CourseTopic, itemId: number, step: -1 | 1): CourseTopic | null {
  const ids = topicItems(topic).map((it) => it.id);
  const at = ids.indexOf(itemId);
  const to = at + step;
  if (at < 0 || to < 0 || to >= ids.length) return null;
  [ids[at], ids[to]] = [ids[to]!, ids[at]!];
  return { ...topic, order: ids };
}

export function findQuiz(setup: CourseSetup, quizId: number): { course: Course; quiz: CourseQuiz } | null {
  for (const course of setup.courses) {
    const quiz = quizzesOf(course).find((q) => q.id === quizId);
    if (quiz) return { course, quiz };
  }
  return null;
}

/** 112.5 */
export function findAssignment(setup: CourseSetup, assignmentId: number): { course: Course; assignment: CourseAssignment } | null {
  for (const course of setup.courses) {
    const assignment = assignmentsOf(course).find((a) => a.id === assignmentId);
    if (assignment) return { course, assignment };
  }
  return null;
}

/** 112.5 */
export function findLiveSession(setup: CourseSetup, liveId: number): { course: Course; live: CourseLiveSession } | null {
  for (const course of setup.courses) {
    const live = liveSessionsOf(course).find((l) => l.id === liveId);
    if (live) return { course, live };
  }
  return null;
}

/** 112.5 When a student's learning starts: their cohort's first day, else when they enrolled. */
export function learningStart(course: Pick<Course, "cohorts">, enrollment: Pick<CourseEnrollment, "enrolledAt" | "cohortId">): Date {
  const cohort = enrollment.cohortId ? (course.cohorts ?? []).find((c) => c.id === enrollment.cohortId) : undefined;
  return cohort ? new Date(cohort.startsAt) : enrollment.enrolledAt;
}

/** When the student's access ends; null when it doesn't. */
export function accessEndsAt(course: Pick<Course, "accessDays">, enrolledAt: Date): Date | null {
  return course.accessDays && course.accessDays > 0 ? new Date(enrolledAt.getTime() + course.accessDays * DAY) : null;
}

/** When a drip lesson opens for the student; null when it's open at once. 112.5 With a date too, the later of the two. */
export function lessonOpensAt(lesson: Pick<CourseLesson, "dripDays" | "opensAt">, enrolledAt: Date): Date | null {
  const drip = lesson.dripDays && lesson.dripDays > 0 ? enrolledAt.getTime() + lesson.dripDays * DAY : 0;
  const date = lesson.opensAt ? Date.parse(lesson.opensAt) : 0;
  const at = Math.max(drip, Number.isFinite(date) ? date : 0);
  return at > 0 ? new Date(at) : null;
}

/** 112.5 When an assignment is due for the student; null when it has no due date. */
export function assignmentDueAt(assignment: Pick<CourseAssignment, "dueDays" | "dueAt">, enrolledAt: Date | null): Date | null {
  const times = [
    ...(assignment.dueDays && enrolledAt ? [enrolledAt.getTime() + assignment.dueDays * DAY] : []),
    ...(assignment.dueAt && Number.isFinite(Date.parse(assignment.dueAt)) ? [Date.parse(assignment.dueAt)] : []),
  ];
  return times.length ? new Date(Math.min(...times)) : null;
}

/** 112.5 A live class: coming, on now, or over. */
export function liveStatus(live: Pick<CourseLiveSession, "startsAt" | "durationMinutes">, now: Date): "upcoming" | "live" | "ended" {
  const start = Date.parse(live.startsAt);
  if (now.getTime() < start) return "upcoming";
  return now.getTime() < start + live.durationMinutes * 60_000 ? "live" : "ended";
}

/** 112.5 The meeting link is given from this long before the class until it ends. */
export const LIVE_JOIN_MINUTES = 15;

export function liveJoinOpen(live: Pick<CourseLiveSession, "startsAt" | "durationMinutes">, now: Date): boolean {
  const start = Date.parse(live.startsAt);
  return now.getTime() >= start - LIVE_JOIN_MINUTES * 60_000 && now.getTime() < start + live.durationMinutes * 60_000;
}

/** Folds a typed answer for matching: no case, accents' marks (and Arabic's short vowels), or extra spaces. */
export function foldAnswer(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .toLocaleLowerCase("en")
    .replace(/[.,!?؟،;:"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 112.5 Whether a question was answered right: exactly its right options, or a short answer that matches one accepted. */
export function answeredRight(question: CourseQuiz["questions"][number], answer: readonly string[] | undefined): boolean {
  if (question.type === "short_answer") {
    const given = foldAnswer(answer?.[0] ?? "");
    return given !== "" && (question.accepted ?? []).some((a) => foldAnswer(a) === given);
  }
  const chosen = new Set(answer ?? []);
  const correct = question.options.filter((o) => o.correct).map((o) => o.id);
  return correct.length > 0 && chosen.size === correct.length && correct.every((id) => chosen.has(id));
}

/** The score of the answers (option IDs, 112.5 or the typed text, per question ID). */
export function scoreQuiz(quiz: CourseQuiz, answers: Record<string, string[]>): { scorePercent: number; passed: boolean } {
  const total = quiz.questions.length;
  if (total === 0) return { scorePercent: 100, passed: true };
  const right = quiz.questions.filter((q) => answeredRight(q, answers[String(q.id)])).length;
  const scorePercent = Math.round((right / total) * 100);
  return { scorePercent, passed: scorePercent >= quiz.passPercent };
}

/** 112.5 The same order for an attempt each time it's asked for: a shuffle seeded by the attempt. */
export function shuffled<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** 112.5 An attempt's questions: the quiz's own, then those drawn from the course's bank for it (the same each time it's asked for). */
export function attemptQuestions(course: Pick<Course, "questionBank">, quiz: CourseQuiz, attemptId: number): CourseQuiz["questions"] {
  const picks = quiz.bankPicks ?? 0;
  const bank = course.questionBank ?? [];
  if (picks <= 0 || bank.length === 0) return quiz.questions;
  return [...quiz.questions, ...shuffled(bank, `bank:${quiz.id}:${attemptId}`).slice(0, picks)];
}

/** 112.5 How many questions an attempt has. */
export function quizQuestionCount(course: Pick<Course, "questionBank">, quiz: CourseQuiz): number {
  return quiz.questions.length + Math.min(quiz.bankPicks ?? 0, (course.questionBank ?? []).length);
}

/** The quizzes the student passed (any submitted attempt that passed). */
export function passedQuizzes(attempts: readonly QuizAttempt[]): Set<number> {
  return new Set(attempts.filter((a) => a.passed).map((a) => a.quizId));
}

/** 112.5 A graded submission that reached the pass mark (any grade, without one). */
export function assignmentDone(assignment: Pick<CourseAssignment, "passPoints">, submission: Pick<AssignmentSubmission, "status" | "score"> | undefined): boolean {
  return submission?.status === "graded" && (assignment.passPoints === null || (submission.score ?? 0) >= assignment.passPoints);
}

/** 112.5 Where a student is in a course: lessons, quiz attempts and assignment submissions. */
export interface Learner {
  progress: Map<number, LessonProgress>;
  attempts: readonly QuizAttempt[];
  submissions?: readonly AssignmentSubmission[];
}

/** 112.5 Whether the item counts in progress (live classes don't) and whether the student did it. */
export function itemCounts(item: TopicItem): boolean {
  return item.kind !== "live";
}

export function itemDone(item: TopicItem, learner: Learner, passed: Set<number> = passedQuizzes(learner.attempts)): boolean {
  if (item.kind === "lesson") return Boolean(learner.progress.get(item.id)?.completedAt);
  if (item.kind === "quiz") return passed.has(item.id);
  if (item.kind === "assignment") return assignmentDone(item.assignment, (learner.submissions ?? []).find((s) => s.assignmentId === item.id));
  return false;
}

/** 112.5 A course taken in order: the items still waiting for the one before them. */
export function waitingForPrevious(course: Course, learner: Learner): Set<number> {
  const out = new Set<number>();
  if (course.sequential !== true) return out;
  const passed = passedQuizzes(learner.attempts);
  let blocked = false;
  for (const item of courseItems(course)) {
    if (!itemCounts(item)) continue;
    if (blocked) out.add(item.id);
    else if (!itemDone(item, learner, passed)) blocked = true;
  }
  return out;
}

/** Progress over the course's lessons, quizzes and 112.5 assignments, and when it was finished. */
export function courseProgress(course: Course, progress: Map<number, LessonProgress>, attempts: readonly QuizAttempt[], submissions: readonly AssignmentSubmission[] = []) {
  const learner: Learner = { progress, attempts, submissions };
  const passed = passedQuizzes(attempts);
  const items = courseItems(course).filter(itemCounts);
  const total = items.length;
  const done = items.filter((it) => itemDone(it, learner, passed)).length;
  const completed = total > 0 && done === total;
  const lessonIds = new Set(items.filter((it) => it.kind === "lesson").map((it) => it.id));
  const assignmentIds = new Set(items.filter((it) => it.kind === "assignment").map((it) => it.id));
  const times = [
    ...[...progress.values()].filter((p) => lessonIds.has(p.lessonId)).map((p) => p.completedAt?.getTime() ?? 0),
    ...attempts.filter((a) => a.passed && a.submittedAt).map((a) => a.submittedAt!.getTime()),
    ...submissions.filter((s) => assignmentIds.has(s.assignmentId) && s.gradedAt).map((s) => s.gradedAt!.getTime()),
  ];
  const last = completed ? Math.max(0, ...times) : 0;
  return {
    course_id: course.id,
    completed_items: done,
    total_items: total,
    percent: total ? Math.round((done / total) * 100) : 0,
    course_completed: completed,
    completed_at: last > 0 ? new Date(last).toISOString() : null,
  };
}

// Certificates ------------------------------------------------------------------

function mac(secret: string, appId: string, userId: number, courseId: number): string {
  return createHmac("sha256", secret).update(`certificate:${appId}:${userId}:${courseId}`).digest("base64url").slice(0, 16);
}

/** The certificate's code: who and which course, signed so it can't be made up. */
export function certificateCode(secret: string, appId: string, userId: number, courseId: number): string {
  return `${userId}-${courseId}-${mac(secret, appId, userId, courseId)}`;
}

/** The student and course of a certificate code, when it's this app's. */
export function readCertificateCode(secret: string, appId: string, code: string): { userId: number; courseId: number } | null {
  const match = /^(\d{1,15})-(\d{1,9})-([\w-]{16})$/.exec(code);
  if (!match) return null;
  const userId = Number(match[1]);
  const courseId = Number(match[2]);
  const expected = Buffer.from(mac(secret, appId, userId, courseId));
  const given = Buffer.from(match[3]!);
  return expected.length === given.length && timingSafeEqual(expected, given) ? { userId, courseId } : null;
}

export function certificateUrl(platformUrl: string, appId: string, code: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/a/${appId}/certificate/${code}`;
}
