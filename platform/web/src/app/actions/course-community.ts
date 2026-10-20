"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { answerAsBusiness, removeReviewReply, replyToReview, setAnswerHidden, setQuestionHidden, setReviewHidden } from "@/lib/courses/community";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { recordCommunity } from "@/lib/team/activity";
import type { TeamPermission } from "@/lib/team/permissions";

/**
 * 63 Courses › Questions (the Messages area) and Reviews (Catalog & content)
 * of academies whose courses are managed here: the same functions as the
 * Owner API (lib/courses/community.ts), with the activity on the Team page.
 */

async function requireCoursesApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "courses") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const courseTitle = (app: App, courseId: number) => courseSetup(app).courses.find((c) => c.id === courseId)?.title ?? "";

export async function answerQuestionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCoursesApp("messages");
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const question = Number.isSafeInteger(id) ? await store.getCourseQuestion(app.id, id) : null;
  if (!question) return { message: "This question no longer exists." };
  const text = String(formData.get("text") ?? "");
  const now = new Date();
  const course = courseSetup(app).courses.find((c) => c.id === question.courseId) ?? null;
  const result = await answerAsBusiness({ store, app, now, account: serviceAccountOf(app, encryptionKey()) }, question, course, text);
  if (!result.ok) return { errors: { text: result.error }, ...(text.trim() ? { values: { text } } : {}) };
  await recordCommunity(store, { clientId: context.client.id, appId: app.id, actor: actorOf(context), what: "answer", id: question.id, course: course?.title ?? "" }, now);
  revalidatePath("/dashboard/courses/questions", "layout");
  return { ok: true, message: "Your answer is in the app. The student was told." };
}

async function ownQuestion(formData: FormData) {
  const context = await requireCoursesApp("messages");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const question = Number.isSafeInteger(id) ? await store.getCourseQuestion(context.app.id, id) : null;
  return { context, store, question };
}

/** 64 Hides a question from everyone but its author, or shows it again. */
export async function setQuestionHiddenAction(formData: FormData): Promise<void> {
  const { context, store, question } = await ownQuestion(formData);
  const hidden = formData.get("hidden") === "1";
  if (question && question.hidden !== hidden) {
    await setQuestionHidden(store, question, hidden);
    await recordCommunity(
      store,
      { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), what: hidden ? "hideQuestion" : "showQuestion", id: question.id, course: courseTitle(context.app, question.courseId) },
      new Date(),
    );
  }
  revalidatePath("/dashboard/courses/questions", "layout");
}

/** 64 Hides a student's answer from everyone but its author, or shows it again. */
export async function setAnswerHiddenAction(formData: FormData): Promise<void> {
  const { context, store, question } = await ownQuestion(formData);
  const hidden = formData.get("hidden") === "1";
  const answerId = Number(formData.get("answerId"));
  const answer = question ? (await store.listCourseAnswers(context.app.id, question.id)).find((a) => a.id === answerId) : undefined;
  if (question && answer && answer.hidden !== hidden) {
    const result = await setAnswerHidden(store, question, answer, hidden);
    if (result.ok) {
      await recordCommunity(
        store,
        { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), what: hidden ? "hideAnswer" : "showAnswer", id: answer.id, course: courseTitle(context.app, question.courseId) },
        new Date(),
      );
    }
  }
  revalidatePath("/dashboard/courses/questions", "layout");
}

async function ownReview(formData: FormData) {
  const context = await requireCoursesApp("catalog");
  const store = await getStore();
  const id = Number(formData.get("id"));
  const review = Number.isSafeInteger(id) ? await store.getCourseReview(context.app.id, id) : null;
  return { context, store, review };
}

export async function replyReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, store, review } = await ownReview(formData);
  if (!review) return { message: "This review no longer exists." };
  const text = String(formData.get("text") ?? "");
  const now = new Date();
  const result = await replyToReview(store, review, text, now);
  if (!result.ok) return { errors: { text: result.error }, ...(text.trim() ? { values: { text } } : {}) };
  await recordCommunity(store, { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), what: "reply", id: review.id, course: courseTitle(context.app, review.courseId) }, now);
  revalidatePath("/dashboard/courses/reviews");
  return { ok: true, message: "Your reply is under the review in the app." };
}

export async function removeReviewReplyAction(formData: FormData): Promise<void> {
  const { store, review } = await ownReview(formData);
  if (review) await removeReviewReply(store, review, new Date());
  revalidatePath("/dashboard/courses/reviews");
}

export async function setReviewHiddenAction(formData: FormData): Promise<void> {
  const { context, store, review } = await ownReview(formData);
  const hidden = formData.get("hidden") === "1";
  if (review && review.hidden !== hidden) {
    const now = new Date();
    await setReviewHidden(store, review, hidden, now);
    await recordCommunity(store, { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), what: hidden ? "hide" : "show", id: review.id, course: courseTitle(context.app, review.courseId) }, now);
  }
  revalidatePath("/dashboard/courses/reviews");
}
