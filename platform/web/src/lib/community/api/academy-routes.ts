import { hitRateLimit } from "../../rate-limit";
import * as academy from "../academy/service";
import { QaError } from "../qa/types";
import type { AcademyEnv } from "../academy/service";
import { requireCommunityRole } from "../trust/roles";
import { CommunityError, noContent, ok, requireMember, tooMany, type CommunityContext, type CommunityResult, type CommunityRoute } from "./http";
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
type Json = Record<string, unknown>;

/** A locked course answers 403 course_locked (the contract's code). */
const lockedAs403 =
  (handler: Handler): Handler =>
  async (ctx) => {
    try {
      return await handler(ctx);
    } catch (error) {
      if (error instanceof QaError && error.field === "locked") throw new CommunityError(403, "course_locked");
      throw error;
    }
  };

const minutes = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));
const fraction = (p: { completed: number; total: number } | null) => (p && p.completed > 0 && p.total > 0 ? Math.round((p.completed / p.total) * 1000) / 1000 : null);

/** CourseSummary: open or locked, never a price. */
const summaryOut = (c: academy.CourseView): Json => ({ id: c.id, slug: c.slug, title: c.title, summary: c.summary, cover_url: c.coverUrl, level: c.level, language: c.language, lesson_count: c.lessonCount, duration_minutes: minutes(c.durationSeconds), access: c.access === "locked" ? "locked" : "open", progress: fraction(c.progress) });

async function certificateOut(ctx: CommunityContext, code: string | null): Promise<Json | null> {
  if (!code) return null;
  const c = await academy.certificate(env(ctx), code);
  return { code: c.code, member_name: c.memberName, course_title: c.courseTitle, course_slug: c.courseSlug, issued_at: c.issuedAt, ...(wire(certificateLinks(ctx.deps.siteUrl, ctx.deps.yallappUrl, c.code)) as Json) };
}

async function progressOut(ctx: CommunityContext, courseId: string, r: academy.CompleteResult): Promise<Json> {
  return { course_id: courseId, progress: fraction(r.progress) ?? 0, completed: r.progress.total > 0 && r.progress.completed === r.progress.total, certificate: await certificateOut(ctx, r.certificateCode) };
}

/** The course and the lesson named in the path; a lesson of another course is not found. */
async function lessonIn(ctx: CommunityContext) {
  const course = await academy.getCourse(env(ctx), viewer(ctx), ctx.params.course!);
  const lesson = course.lessons.find((l) => l.id === ctx.params.lesson_id || l.id === ctx.params.quiz_id);
  if (!lesson) throw new QaError("not_found", "There's no such lesson.");
  return { course, lesson };
}

const listCourses: Handler = async (ctx) => {
  const level = ctx.query.get("level");
  const all = (await academy.listCourses(env(ctx), viewer(ctx))).filter((c) => !level || c.level === level);
  const offset = Math.max(0, Number.parseInt(ctx.query.get("cursor") ?? "0", 10) || 0);
  const limit = Math.min(50, Math.max(1, Number.parseInt(ctx.query.get("limit") ?? "", 10) || 20));
  return ok({ items: all.slice(offset, offset + limit).map(summaryOut), next_cursor: all.length > offset + limit ? String(offset + limit) : null });
};
const myCourses: Handler = async (ctx) => ok({ items: (await academy.myCourses(env(ctx), requireMember(ctx).member.id)).map(summaryOut) });
const getCourse: Handler = async (ctx) => {
  const c = await academy.getCourse(env(ctx), viewer(ctx), ctx.params.course!);
  return ok({
    ...summaryOut(c),
    description: c.summary,
    lessons: c.lessons.map((l) => ({ id: l.id, title: l.title, kind: l.kind, minutes: minutes(l.durationSeconds), done: l.completed, preview: l.preview, locked: l.locked })),
    // Each quiz follows its lesson: its id is the lesson's.
    quizzes: c.lessons.filter((l) => l.hasQuiz).map((l) => ({ id: l.id, title: l.title, after_lesson_id: l.id, passed: l.completed })),
    certificate: await certificateOut(ctx, c.certificateCode),
  });
};
const getLesson: Handler = async (ctx) => {
  const { course, lesson } = await lessonIn(ctx);
  const l = await academy.getLesson(env(ctx), viewer(ctx), lesson.id);
  return ok({ id: l.id, course_id: course.id, title: l.title, kind: l.kind, body: l.body, video_url: l.videoUrl, minutes: minutes(l.durationSeconds), done: l.completed, has_quiz: l.hasQuiz });
};
const complete: Handler = async (ctx) => {
  const { course, lesson } = await lessonIn(ctx);
  return ok(await progressOut(ctx, course.id, await academy.completeLesson(env(ctx), requireMember(ctx).member.id, lesson.id)));
};
const getQuiz: Handler = async (ctx) => {
  const { lesson } = await lessonIn(ctx);
  const l = await academy.getLesson(env(ctx), viewer(ctx), lesson.id);
  if (!l.quiz.length) throw new QaError("not_found", "There's no such quiz.");
  if (l.locked) throw new QaError("not_allowed", "This course is locked.", "locked");
  return ok({ id: l.id, title: l.title, passed: l.completed, score: l.quizScore === null ? null : l.quizScore / 100, questions: l.quiz.map((q) => ({ id: q.id, text: q.prompt, options: q.options.map((text, i) => ({ id: String(i), text })) })) });
};
const QUIZ_LIMIT = { name: "community-academy-quiz:member", limit: 30, windowSeconds: 60 * 60 };
const attempt: Handler = async (ctx) => {
  const hit = await hitRateLimit(ctx.deps.platform, QUIZ_LIMIT, ctx.member?.id ?? ctx.deps.ip, ctx.now);
  if (!hit.allowed) tooMany(hit.retryAfter);
  const me = requireMember(ctx).member.id;
  const { course, lesson } = await lessonIn(ctx);
  const l = await academy.getLesson(env(ctx), me, lesson.id);
  // Question id → the chosen option ids; one option per question here.
  const given = ctx.json().answers;
  const map = given && typeof given === "object" && !Array.isArray(given) ? (given as Record<string, unknown>) : {};
  const answers = l.quiz.map((q) => {
    const chosen = map[q.id];
    const first = Array.isArray(chosen) ? chosen[0] : chosen;
    const n = typeof first === "string" && /^\d+$/.test(first) ? Number(first) : typeof first === "number" ? first : -1;
    return Number.isInteger(n) ? n : -1;
  });
  const r = await academy.submitQuiz(env(ctx), me, lesson.id, answers);
  const after: academy.CompleteResult = r.lesson ?? (await academy.getCourse(env(ctx), me, course.id).then((c) => ({ completed: false, progress: c.progress ?? { completed: 0, total: c.lessonCount }, certificateCode: c.certificateCode })));
  return ok({ score: r.score / 100, passed: r.passed, correct: Object.fromEntries(l.quiz.map((q, i) => [q.id, r.correct[i]!])), progress: await progressOut(ctx, course.id, after) });
};
const myCertificates: Handler = async (ctx) => {
  const mine = await academy.myCourses(env(ctx), requireMember(ctx).member.id);
  return ok({ items: (await Promise.all(mine.map((c) => certificateOut(ctx, c.certificateCode)))).filter(Boolean) });
};
const certificate: Handler = async (ctx) => ok(await certificateOut(ctx, ctx.params.code!));

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
  route("GET", "/academy/mine", myCourses),
  route("GET", "/academy/courses/:course", getCourse, "public"),
  route("GET", "/academy/courses/:course/lessons/:lesson_id", lockedAs403(getLesson), "public"),
  route("POST", "/academy/courses/:course/lessons/:lesson_id/complete", lockedAs403(complete)),
  route("GET", "/academy/courses/:course/quizzes/:quiz_id", lockedAs403(getQuiz), "public"),
  route("POST", "/academy/courses/:course/quizzes/:quiz_id/attempts", lockedAs403(attempt)),
  route("GET", "/academy/certificates", myCertificates),
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
