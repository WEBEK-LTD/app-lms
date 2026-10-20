import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { App, Course, CourseAnswer, CourseQuestion, CourseReview } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import type { RateLimitRule } from "../rate-limit";

/**
 * 63 Questions and reviews of courses managed in the dashboard. Students ask
 * and review in the app (the hosted API's Community endpoints); the business
 * answers questions and replies to or hides reviews from Dashboard › Courses
 * › Questions and Reviews and from Yallapp Business, through these functions.
 */

export const COMMUNITY_TEXT_MAX = 2000;
/** Questions and answers a student may write in an hour, in one app. */
export const QUESTION_LIMIT = { name: "hosted-question:user", limit: 20, windowSeconds: 60 * 60 } satisfies RateLimitRule;

/** 63 Reviews a student may write or edit in an hour, in one app. */
export const REVIEW_LIMIT = { name: "hosted-review:user", limit: 20, windowSeconds: 60 * 60 } satisfies RateLimitRule;

/** A question, answer or reply as written: trimmed, 1 to 2000 characters. */
export function readCommunityText(value: unknown, empty: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { ok: false, error: empty };
  if (text.length > COMMUNITY_TEXT_MAX) return { ok: false, error: `Use at most ${COMMUNITY_TEXT_MAX} characters.` };
  return { ok: true, text };
}

/** A rating of 1 to 5 and an optional text. */
export function readReview(body: unknown): { ok: true; rating: number; text: string } | { ok: false; error: string } {
  const input = (body ?? {}) as { rating?: unknown; text?: unknown };
  const rating = input.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Choose a rating from 1 to 5." };
  if (input.text !== undefined && input.text !== null && typeof input.text !== "string") return { ok: false, error: "The review isn't valid." };
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (text.length > COMMUNITY_TEXT_MAX) return { ok: false, error: `Use at most ${COMMUNITY_TEXT_MAX} characters.` };
  return { ok: true, rating, text };
}

export interface RatingSummary {
  rating: number | null;
  count: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** The average (one decimal) and the count per star of the shown reviews, of one course or all of them. */
export function ratingSummary(rows: { courseId: number; rating: number; count: number }[], courseId?: number): RatingSummary {
  const counts: RatingSummary["counts"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) {
    if (courseId !== undefined && row.courseId !== courseId) continue;
    if (row.rating >= 1 && row.rating <= 5) counts[row.rating as 1 | 2 | 3 | 4 | 5] += row.count;
  }
  const count = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const total = Object.entries(counts).reduce((sum, [star, n]) => sum + Number(star) * n, 0);
  return { rating: count ? Math.round((total / count) * 10) / 10 : null, count, counts };
}

/** What the student reads when the business answers, in the app's language. */
export function answeredMessage(lang: Lang, courseTitle: string, text: string): { title: string; body: string } {
  switch (lang) {
    case "ar":
      return { title: "وصلتك إجابة على سؤالك", body: `${courseTitle}: ${text}` };
    case "tr":
      return { title: "Sorunuz yanıtlandı", body: `${courseTitle}: ${text}` };
    default:
      return { title: "Your question was answered", body: `${courseTitle}: ${text}` };
  }
}

export interface AnswerDeps {
  store: DataStore;
  app: App;
  now: Date;
  /** The app's Firebase account (serviceAccountOf); null: the inbox only. */
  account: ServiceAccount | null;
  send?: typeof sendPush;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * The business answers a question (Dashboard › Courses › Questions and the
 * Owner API): the answer shows under it in the app in the business's name,
 * the question is answered, and the student is told in their inbox and on
 * their phones.
 */
export async function answerAsBusiness(
  deps: AnswerDeps,
  question: CourseQuestion,
  course: Pick<Course, "title"> | null,
  value: unknown,
): Promise<{ ok: true; answer: CourseAnswer; pushed: number } | { ok: false; error: string }> {
  const read = readCommunityText(value, "Write your answer.");
  if (!read.ok) return read;
  const { store, app, now } = deps;
  const answer = await store.addCourseAnswer({ appId: app.id, questionId: question.id, userId: null, text: read.text, createdAt: now }, "answered");
  const message = answeredMessage(await appLang(store, app.id), course?.title ?? "", read.text);
  const title = clip(message.title, NOTIFICATION_TITLE_MAX);
  const body = clip(course ? message.body : read.text, NOTIFICATION_BODY_MAX);
  const notification = await store.createHostedNotification({ appId: app.id, userId: question.userId, title, body, createdAt: now });
  if (!deps.account) return { ok: true, answer, pushed: 0 };
  const tokens = (await store.listHostedPushDevices(app.id, [question.userId])).map(pushTarget);
  if (tokens.length === 0) return { ok: true, answer, pushed: 0 };
  try {
    const result = await (deps.send ?? sendPush)(
      deps.account,
      tokens,
      { title, body, data: { type: "announcement", notification_id: String(notification.id), course_id: String(question.courseId), question_id: String(question.id) } },
      { now },
    );
    for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    return { ok: true, answer, pushed: result.sent };
  } catch {
    // The inbox has it either way.
    return { ok: true, answer, pushed: 0 };
  }
}

/** The business's public reply under a review (written again replaces it). */
export async function replyToReview(store: DataStore, review: CourseReview, value: unknown, now: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  const read = readCommunityText(value, "Write your reply.");
  if (!read.ok) return read;
  await store.updateCourseReview(review.appId, review.id, { replyText: read.text, replyAt: now, updatedAt: now });
  return { ok: true };
}

export async function removeReviewReply(store: DataStore, review: CourseReview, now: Date): Promise<void> {
  await store.updateCourseReview(review.appId, review.id, { replyText: null, replyAt: null, updatedAt: now });
}

/** Hides a review from everyone but its author, or shows it again. */
export async function setReviewHidden(store: DataStore, review: CourseReview, hidden: boolean, now: Date): Promise<void> {
  await store.updateCourseReview(review.appId, review.id, { hidden, updatedAt: now });
}
