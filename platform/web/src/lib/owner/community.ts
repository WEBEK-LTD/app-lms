import { courseSetup } from "../courses/setup";
import { answerAsBusiness, countOpenQuestions, questionFilter, ratingSummary, removeReviewReply, replyToReview, setAnswerHidden, setQuestionHidden, setReviewHidden } from "../courses/community";
import type { App, Course, CourseQuestion, CourseReview } from "../data/types";
import { serviceAccountOf } from "../hosted/notify";
import { recordCommunity } from "../team/activity";
import { bodyObject, intParam, invalid, iso, notFound, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { appScope } from "./sales";

/**
 * 63 Course questions (the Messages area) and reviews (Catalog & content) of
 * courses managed in Yallapp, with the dashboard's rules (lib/courses/community.ts).
 */

function courses(app: App): Map<number, Course> {
  return new Map(courseSetup(app).courses.map((c) => [c.id, c]));
}

async function names(ctx: OwnerContext, appId: string, ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  for (const id of new Set(ids)) out.set(id, (await ctx.deps.store.getHostedUser(appId, id))?.name ?? "");
  return out;
}

function questionJson(q: CourseQuestion, course: Course | undefined, person: string) {
  return {
    id: q.id,
    course_id: q.courseId,
    course_title: course?.title ?? "",
    person,
    text: q.text,
    status: q.status,
    hidden: q.hidden,
    answer_count: q.answerCount,
    created_at: q.createdAt.toISOString(),
    updated_at: q.updatedAt.toISOString(),
  };
}

export async function listQuestions(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "questions");
  const page = paging(ctx.req.query);
  const status = ctx.req.query.get("status");
  if (status !== null && status !== "open" && status !== "answered" && status !== "hidden") throw invalid({ status: "The request isn't valid." });
  const { store } = ctx.deps;
  // 64 Waiting and answered are the questions shown in the app; hidden ones have their own list.
  const [{ items, total }, open] = await Promise.all([
    store.listCourseQuestions({ appId: app.id, ...questionFilter(status ?? "all"), order: "updated", offset: page.offset, limit: page.perPage }),
    countOpenQuestions(store, app.id),
  ]);
  const all = courses(app);
  const people = await names(ctx, app.id, items.map((q) => q.userId));
  return { status: 200, body: { ...pageJson(page, total), open, items: items.map((q) => questionJson(q, all.get(q.courseId), people.get(q.userId) ?? "")) } };
}

async function ownQuestion(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "questions");
  const question = await ctx.deps.store.getCourseQuestion(app.id, intParam(params.question_id));
  if (!question) throw notFound();
  return { app, question };
}

async function questionDetail(ctx: OwnerContext, app: App, id: number) {
  const { store } = ctx.deps;
  const question = (await store.getCourseQuestion(app.id, id))!;
  const answers = await store.listCourseAnswers(app.id, id);
  const people = await names(ctx, app.id, [question.userId, ...answers.flatMap((a) => (a.userId === null ? [] : [a.userId]))]);
  const course = courses(app).get(question.courseId);
  const business = course?.instructorName ?? app.appName ?? ctx.k("Instructor");
  return {
    ...questionJson(question, course, people.get(question.userId) ?? ""),
    answers: answers.map((a) => ({
      id: a.id,
      from: a.userId === null ? "business" : "student",
      name: a.userId === null ? business : (people.get(a.userId) ?? ""),
      text: a.text,
      hidden: a.hidden,
      created_at: a.createdAt.toISOString(),
    })),
  };
}

export async function getQuestion(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, question } = await ownQuestion(ctx, params);
  return { status: 200, body: await questionDetail(ctx, app, question.id) };
}

export async function answerQuestion(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, question } = await ownQuestion(ctx, params);
  const { deps } = ctx;
  const course = courses(app).get(question.courseId) ?? null;
  const result = await answerAsBusiness({ store: deps.store, app, now: deps.now, account: serviceAccountOf(app, deps.encryptionKey), send: deps.sendPush }, question, course, bodyObject(ctx.req.body).text);
  if (!result.ok) throw invalid({ text: result.error });
  await recordCommunity(deps.store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, what: "answer", id: question.id, course: course?.title ?? "" }, deps.now);
  return { status: 201, body: await questionDetail(ctx, app, question.id) };
}

/** 64 Hides a question from others (its author still sees it), or shows it again. */
export async function updateQuestion(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, question } = await ownQuestion(ctx, params);
  const hidden = bodyObject(ctx.req.body).hidden;
  if (typeof hidden !== "boolean") throw invalid({ hidden: "The request isn't valid." });
  const { store, now } = ctx.deps;
  if (hidden !== question.hidden) {
    await setQuestionHidden(store, question, hidden);
    const course = courses(app).get(question.courseId)?.title ?? "";
    await recordCommunity(store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, what: hidden ? "hideQuestion" : "showQuestion", id: question.id, course }, now);
  }
  return { status: 200, body: await questionDetail(ctx, app, question.id) };
}

/** 64 Hides a student's answer from others (its author still sees it), or shows it again. */
export async function updateAnswer(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, question } = await ownQuestion(ctx, params);
  const answerId = intParam(params.answer_id);
  const answer = (await ctx.deps.store.listCourseAnswers(app.id, question.id)).find((a) => a.id === answerId);
  if (!answer) throw notFound();
  const hidden = bodyObject(ctx.req.body).hidden;
  if (typeof hidden !== "boolean") throw invalid({ hidden: "The request isn't valid." });
  const { store, now } = ctx.deps;
  if (hidden !== answer.hidden) {
    const result = await setAnswerHidden(store, question, answer, hidden);
    if (!result.ok) throw invalid({ hidden: result.error }, result.error);
    const course = courses(app).get(question.courseId)?.title ?? "";
    await recordCommunity(store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, what: hidden ? "hideAnswer" : "showAnswer", id: answer.id, course }, now);
  }
  return { status: 200, body: await questionDetail(ctx, app, question.id) };
}

// Reviews

function reviewJson(r: CourseReview, course: Course | undefined, person: string) {
  return {
    id: r.id,
    course_id: r.courseId,
    course_title: course?.title ?? "",
    person,
    rating: r.rating,
    text: r.text,
    hidden: r.hidden,
    reply: r.replyText ? { text: r.replyText, created_at: iso(r.replyAt ?? r.updatedAt) } : null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

export async function listReviews(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "reviews");
  const page = paging(ctx.req.query);
  const filter = ctx.req.query.get("filter") ?? "all";
  if (filter !== "all" && filter !== "unreplied" && filter !== "hidden") throw invalid({ filter: "The request isn't valid." });
  const { store } = ctx.deps;
  const { items, total } = await store.listCourseReviews({
    appId: app.id,
    ...(filter === "hidden" ? { hidden: true } : filter === "unreplied" ? { hidden: false, unreplied: true } : {}),
    offset: page.offset,
    limit: page.perPage,
  });
  const all = courses(app);
  const people = await names(ctx, app.id, items.map((r) => r.userId));
  const rated = ratingSummary(await store.countCourseRatings(app.id));
  return {
    status: 200,
    body: { ...pageJson(page, total), rating: rated.rating, rating_count: rated.count, items: items.map((r) => reviewJson(r, all.get(r.courseId), people.get(r.userId) ?? "")) },
  };
}

async function ownReview(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "reviews");
  const review = await ctx.deps.store.getCourseReview(app.id, intParam(params.review_id));
  if (!review) throw notFound();
  return { app, review };
}

async function reviewAnswer(ctx: OwnerContext, app: App, id: number): Promise<OwnerResult> {
  const review = (await ctx.deps.store.getCourseReview(app.id, id))!;
  const people = await names(ctx, app.id, [review.userId]);
  return { status: 200, body: reviewJson(review, courses(app).get(review.courseId), people.get(review.userId) ?? "") };
}

export async function updateReview(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, review } = await ownReview(ctx, params);
  const hidden = bodyObject(ctx.req.body).hidden;
  if (typeof hidden !== "boolean") throw invalid({ hidden: "The request isn't valid." });
  const { store, now } = ctx.deps;
  if (hidden !== review.hidden) {
    await setReviewHidden(store, review, hidden, now);
    await recordCommunity(store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, what: hidden ? "hide" : "show", id: review.id, course: courses(app).get(review.courseId)?.title ?? "" }, now);
  }
  return reviewAnswer(ctx, app, review.id);
}

export async function replyReview(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, review } = await ownReview(ctx, params);
  const { store, now } = ctx.deps;
  const result = await replyToReview(store, review, bodyObject(ctx.req.body).text, now);
  if (!result.ok) throw invalid({ text: result.error });
  await recordCommunity(store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, what: "reply", id: review.id, course: courses(app).get(review.courseId)?.title ?? "" }, now);
  return reviewAnswer(ctx, app, review.id);
}

export async function deleteReviewReply(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, review } = await ownReview(ctx, params);
  await removeReviewReply(ctx.deps.store, review, ctx.deps.now);
  return reviewAnswer(ctx, app, review.id);
}
