import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { AssignmentSubmission, Course, HostedUser, QuizAttempt } from "../data/types";
import { assignmentDone, assignmentsOf, courseProgress, quizzesOf, type Learner } from "./learning";
import { lessonsOf } from "./setup";

/**
 * 113.7 Points and badges, when the academy turns them on (Courses ›
 * Points and badges): points for the lessons a student completed, the
 * quizzes they passed (more for a higher score), the assignments done (by
 * their grade) and each day of a streak (a day of learning after another);
 * badges for firsts and feats; each course's leaderboard (and its cohort's)
 * with first names and an initial only. Worked out from what the student
 * did (lessons, attempts, submissions), so nothing is counted twice and a
 * course started again starts its points again.
 */

export const POINTS = { lesson: 10, quiz: 20, assignment: 20, streakDay: 5 } as const;

/** The badges, in the order the app shows them, with their Material Symbols icon (components/icon-names.ts). */
export const BADGES = [
  { id: "first_lesson", icon: "play_circle" },
  { id: "first_quiz", icon: "quiz" },
  { id: "perfect_quiz", icon: "star" },
  { id: "first_assignment", icon: "task_alt" },
  { id: "streak_7", icon: "bolt" },
  { id: "course_completed", icon: "workspace_premium" },
  { id: "path_completed", icon: "route" },
  { id: "points_500", icon: "emoji_events" },
] as const;

export type BadgeId = (typeof BADGES)[number]["id"];

/** A streak of this many days earns `streak_7`. */
export const STREAK_BADGE_DAYS = 7;
export const POINTS_BADGE = 500;
/** The leaderboard's top. */
export const LEADERBOARD_TOP = 20;

/** The learner's part in a course: what they did and when, with its points. */
export interface Earned {
  lessons: { at: Date; points: number }[];
  quizzes: { at: Date; points: number; score: number }[];
  assignments: { at: Date; points: number }[];
  /** Every moment they learned: lessons completed, attempts and work handed in. */
  times: Date[];
}

export function earnedIn(course: Course, learner: Learner): Earned {
  const lessonIds = new Set(lessonsOf(course).map((l) => l.id));
  const lessons = [...learner.progress.values()].filter((p) => p.courseId === course.id && lessonIds.has(p.lessonId) && p.completedAt).map((p) => ({ at: p.completedAt!, points: POINTS.lesson }));
  const quizzes = quizzesOf(course).flatMap((q) => {
    // A quiz's best passing attempt, scored by how high it was.
    const best = learner.attempts.filter((a) => a.quizId === q.id && a.passed && a.submittedAt).sort((a, b) => (b.scorePercent ?? 0) - (a.scorePercent ?? 0) || a.submittedAt!.getTime() - b.submittedAt!.getTime())[0];
    return best ? [{ at: best.submittedAt!, score: best.scorePercent ?? 0, points: Math.max(1, Math.round((POINTS.quiz * (best.scorePercent ?? 0)) / 100)) }] : [];
  });
  const assignments = assignmentsOf(course).flatMap((a) => {
    const s = (learner.submissions ?? []).find((x) => x.assignmentId === a.id);
    return s && assignmentDone(a, s) ? [{ at: s.gradedAt ?? s.submittedAt, points: Math.max(1, Math.round((POINTS.assignment * Math.min(s.score ?? 0, a.maxPoints)) / a.maxPoints)) }] : [];
  });
  const times = [
    ...lessons.map((l) => l.at),
    ...learner.attempts.filter((a) => a.courseId === course.id && a.submittedAt).map((a) => a.submittedAt!),
    ...(learner.submissions ?? []).filter((s) => s.courseId === course.id).map((s) => s.submittedAt),
  ];
  return { lessons, quizzes, assignments, times };
}

/** The days (YYYY-MM-DD in the academy's time zone) with some learning, oldest first. */
export function learningDays(times: readonly Date[], zone: string): string[] {
  return [...new Set(times.map((t) => utcToLocal(t, zone).date))].sort();
}

/** The streaks of the days: the one going on (to today or yesterday), the longest, and the days that followed another. */
export function streaks(days: readonly string[], today: string): { current: number; best: number; following: number; bestReachedOn: string | null } {
  let best = 0;
  let run = 0;
  let following = 0;
  let bestReachedOn: string | null = null;
  let previous: string | null = null;
  for (const day of days) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    if (run > 1) following++;
    if (run > best) {
      best = run;
      if (run === STREAK_BADGE_DAYS) bestReachedOn = day;
    }
    previous = day;
  }
  const last = days[days.length - 1];
  const current = last && (last === today || addDays(last, 1) === today) ? run : 0;
  return { current, best, following, bestReachedOn };
}

/** A course's points for the learner: its lessons, quizzes, assignments and the streak days spent on it. */
export function coursePoints(course: Course, learner: Learner, zone: string): number {
  const earned = earnedIn(course, learner);
  const sum = (list: { points: number }[]) => list.reduce((n, x) => n + x.points, 0);
  const days = learningDays(earned.times, zone);
  return sum(earned.lessons) + sum(earned.quizzes) + sum(earned.assignments) + streaks(days, "").following * POINTS.streakDay;
}

/** A name for others to see: the first name and the last name's initial ("Sara A."). */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]! : "";
  return last ? `${first} ${[...last][0]!.toLocaleUpperCase()}.` : first;
}

export interface Badge {
  id: BadgeId;
  icon: string;
  earned: boolean;
  earnedAt: Date | null;
}

/** Every badge, earned or not, over the student's courses (each with what they did in it) and the paths they finished. */
export function badgesOf(input: { courses: { course: Course; learner: Learner }[]; zone: string; pathsFinished: number; points: number }): Badge[] {
  const earned = input.courses.map(({ course, learner }) => ({ course, learner, earned: earnedIn(course, learner) }));
  const first = (dates: Date[]) => (dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null);
  const days = learningDays(earned.flatMap((e) => e.earned.times), input.zone);
  const streak = streaks(days, "");
  const completed = earned.flatMap(({ course, learner }) => {
    const p = courseProgress(course, learner.progress, learner.attempts.filter((a) => a.courseId === course.id), (learner.submissions ?? []).filter((s) => s.courseId === course.id));
    return p.course_completed && p.completed_at ? [new Date(p.completed_at)] : [];
  });
  const when: Record<BadgeId, Date | null | false> = {
    first_lesson: first(earned.flatMap((e) => e.earned.lessons.map((l) => l.at))),
    first_quiz: first(earned.flatMap((e) => e.earned.quizzes.map((q) => q.at))),
    perfect_quiz: first(earned.flatMap((e) => e.earned.quizzes.filter((q) => q.score >= 100).map((q) => q.at))),
    first_assignment: first(earned.flatMap((e) => e.earned.assignments.map((a) => a.at))),
    streak_7: streak.best >= STREAK_BADGE_DAYS ? (streak.bestReachedOn ? new Date(`${streak.bestReachedOn}T12:00:00.000Z`) : null) : false,
    course_completed: first(completed),
    path_completed: input.pathsFinished > 0 ? null : false,
    points_500: input.points >= POINTS_BADGE ? null : false,
  };
  return BADGES.map((b) => {
    const at = when[b.id];
    return { id: b.id, icon: b.icon, earned: at !== false && (at !== null || b.id === "streak_7" || b.id === "path_completed" || b.id === "points_500"), earnedAt: at || null };
  });
}

export interface LeaderRow {
  userId: number;
  name: string;
  points: number;
  rank: number;
}

/** The course's students ranked by points (the same points, the same rank), with short names. */
export function leaderboard(rows: { user: Pick<HostedUser, "id" | "name">; points: number }[]): LeaderRow[] {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.user.id - b.user.id);
  let rank = 0;
  let last: number | null = null;
  return sorted.map((row, i) => {
    if (row.points !== last) rank = i + 1;
    last = row.points;
    return { userId: row.user.id, name: shortName(row.user.name), points: row.points, rank };
  });
}

/** Each student's learning in a course, read once for all of them (the leaderboards). */
export async function classLearners(store: Pick<DataStore, "listLessonProgress" | "listQuizAttempts" | "listAssignmentSubmissions">, appId: string, courseId: number): Promise<Map<number, Learner>> {
  const [progress, attempts, submissions] = await Promise.all([
    store.listLessonProgress({ appId, courseId }),
    store.listQuizAttempts({ appId, courseId }),
    store.listAssignmentSubmissions({ appId, courseId }),
  ]);
  const out = new Map<number, { progress: Learner["progress"]; attempts: QuizAttempt[]; submissions: AssignmentSubmission[] }>();
  const of = (userId: number) => {
    let learner = out.get(userId);
    if (!learner) {
      learner = { progress: new Map(), attempts: [], submissions: [] };
      out.set(userId, learner);
    }
    return learner;
  };
  for (const p of progress) of(p.userId).progress.set(p.lessonId, p);
  for (const a of attempts) of(a.userId).attempts.push(a);
  for (const s of submissions) of(s.userId).submissions.push(s);
  return out;
}
