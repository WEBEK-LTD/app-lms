import { hitRateLimit } from "../../rate-limit";
import * as academy from "../academy/service";
import type { AcademyEnv } from "../academy/service";
import { requireCommunityRole } from "../trust/roles";
import { noContent, ok, requireMember, tooMany, type CommunityContext, type CommunityResult, type CommunityRoute } from "./http";
import { run, wire } from "./qa-routes";
import { tenantOf } from "./social-routes";

/**
 * 233 Yallapp Academy's routes (docs/api/community.yaml, Academy): the
 * courses, their lessons and quizzes, a member's progress, the public
 * certificate check, and the admin's authoring (/admin/academy/*).
 *
 * The app uses these: a course is "free", "owned" or "locked", and no
 * answer ever carries a price, a buy button or a payment link. Buying is
 * on the website only (area C's checkout, then academy.grantCourseAccess).
 */

type Handler = (ctx: CommunityContext) => Promise<CommunityResult>;

export function academyEnvFor(ctx: CommunityContext): AcademyEnv {
  return {
    store: ctx.store.qa.academy,
    tenant: tenantOf(ctx),
    now: ctx.now,
    memberName: async (memberId) => (memberId === ctx.member?.id ? ctx.member : await ctx.store.base.getMember(memberId))?.displayName ?? null,
  };
}

/** Where anyone checks a certificate, and its PDF. */
export function certificateLinks(siteUrl: string, yallappUrl: string, code: string) {
  return { verifyUrl: `${siteUrl.replace(/\/$/, "")}/academy/certificates/${code}`, pdfUrl: `${yallappUrl.replace(/\/$/, "")}/api/community/academy/certificates/${code}/pdf` };
}

const viewer = (ctx: CommunityContext) => ctx.member?.id ?? null;
const env = academyEnvFor;
const items = <T>(list: T[]) => ({ items: wire(list) });

const listCourses: Handler = async (ctx) => ok(items(await academy.listCourses(env(ctx), viewer(ctx))));
const myCourses: Handler = async (ctx) => ok(items(await academy.myCourses(env(ctx), requireMember(ctx).member.id)));
const getCourse: Handler = async (ctx) => ok(wire(await academy.getCourse(env(ctx), viewer(ctx), ctx.params.course!)));
const enroll: Handler = async (ctx) => ok(wire(await academy.enroll(env(ctx), requireMember(ctx).member.id, ctx.params.course!)));
const getLesson: Handler = async (ctx) => ok(wire(await academy.getLesson(env(ctx), viewer(ctx), ctx.params.lesson_id!)));
const complete: Handler = async (ctx) => ok(wire(await academy.completeLesson(env(ctx), requireMember(ctx).member.id, ctx.params.lesson_id!)));
const QUIZ_LIMIT = { name: "community-academy-quiz:member", limit: 30, windowSeconds: 60 * 60 };
const quiz: Handler = async (ctx) => {
  const hit = await hitRateLimit(ctx.deps.platform, QUIZ_LIMIT, ctx.member?.id ?? ctx.deps.ip, ctx.now);
  if (!hit.allowed) tooMany(hit.retryAfter);
  return ok(wire(await academy.submitQuiz(env(ctx), requireMember(ctx).member.id, ctx.params.lesson_id!, ctx.json().answers)));
};
const certificate: Handler = async (ctx) => {
  const c = await academy.certificate(env(ctx), ctx.params.code!);
  return ok(wire({ ...c, ...certificateLinks(ctx.deps.siteUrl, ctx.deps.yallappUrl, c.code) }));
};

// ——— The admin's ———

const admin =
  (handler: Handler): Handler =>
  async (ctx) => {
    await requireCommunityRole(ctx, "admin");
    return handler(ctx);
  };

const courseInput = (b: Record<string, unknown>): academy.CourseInput => ({ title: b.title, summary: b.summary, coverUrl: b.cover_url, level: b.level, language: b.language, status: b.status, free: b.free });
const lessonInput = (b: Record<string, unknown>): academy.LessonInput => ({ title: b.title, kind: b.kind, body: b.body, videoUrl: b.video_url, durationSeconds: b.duration_seconds, preview: b.preview, position: b.position });

const adminCourses: Handler = async (ctx) => ok(items(await academy.adminCourses(env(ctx))));
const adminCourse: Handler = async (ctx) => ok(wire(await academy.adminCourse(env(ctx), ctx.params.course_id!)));
const createCourse: Handler = async (ctx) => ok(wire(await academy.createCourse(env(ctx), courseInput(ctx.json()))), 201);
const updateCourse: Handler = async (ctx) => ok(wire(await academy.updateCourse(env(ctx), ctx.params.course_id!, courseInput(ctx.json()))));
const addLesson: Handler = async (ctx) => ok(wire(await academy.addLesson(env(ctx), ctx.params.course_id!, lessonInput(ctx.json()))), 201);
const updateLesson: Handler = async (ctx) => ok(wire(await academy.updateLesson(env(ctx), ctx.params.lesson_id!, lessonInput(ctx.json()))));
const deleteLesson: Handler = async (ctx) => {
  await academy.deleteLesson(env(ctx), ctx.params.lesson_id!);
  return noContent();
};
const setQuiz: Handler = async (ctx) => ok(wire(await academy.setQuiz(env(ctx), ctx.params.lesson_id!, ctx.json().questions)));

const route = (method: CommunityRoute["method"], path: string, handler: Handler, auth?: CommunityRoute["auth"]): CommunityRoute => ({ method, path, handler: run(handler), ...(auth ? { auth } : {}) });

export const ACADEMY_ROUTES: CommunityRoute[] = [
  route("GET", "/academy/courses", listCourses, "public"),
  route("GET", "/academy/my", myCourses),
  route("GET", "/academy/courses/:course", getCourse, "public"),
  route("POST", "/academy/courses/:course/enroll", enroll),
  route("GET", "/academy/lessons/:lesson_id", getLesson, "public"),
  route("PUT", "/academy/lessons/:lesson_id/complete", complete),
  route("POST", "/academy/lessons/:lesson_id/quiz", quiz),
  route("GET", "/academy/certificates/:code", certificate, "public"),
  route("GET", "/admin/academy/courses", admin(adminCourses)),
  route("POST", "/admin/academy/courses", admin(createCourse)),
  route("GET", "/admin/academy/courses/:course_id", admin(adminCourse)),
  route("PATCH", "/admin/academy/courses/:course_id", admin(updateCourse)),
  route("POST", "/admin/academy/courses/:course_id/lessons", admin(addLesson)),
  route("PATCH", "/admin/academy/lessons/:lesson_id", admin(updateLesson)),
  route("DELETE", "/admin/academy/lessons/:lesson_id", admin(deleteLesson)),
  route("PUT", "/admin/academy/lessons/:lesson_id/quiz", admin(setQuiz)),
];
