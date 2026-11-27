import { randomInt, randomUUID } from "node:crypto";
import { QaError } from "../qa/types";
import { slugify } from "../qa/text";
import type { AcademyStore, AccessRecord, AccessSource, CertificateRecord, CourseLevel, CourseRecord, CourseStatus, LessonKind, LessonRecord, ProgressRecord, QuizQuestionRecord } from "./store";

/**
 * 233 Yallapp Academy (area B): courses with video and article lessons,
 * quizzes, progress and a certificate anyone can check by its code.
 *
 * What a member may open: a free course, or one they own (bought on the
 * website through area C's checkout, which calls grantCourseAccess). The
 * app and the API show "free", "owned" or "locked" and never a price, a
 * buy button or a payment link; the price lives only behind
 * coursePriceForCheckout and setCoursePrice, for the website.
 */

export interface AcademyEnv {
  store: AcademyStore;
  /** The community: "yallapp", or a client app's id (phase 5). */
  tenant: string;
  now: Date;
  /** A member's name for their certificate. */
  memberName(memberId: string): Promise<string | null>;
  /** 233 A lesson done the first time, a course completed (its certificate issued): area C's points and notices. */
  onEvent?(event: { kind: "lesson_done" | "course_completed"; memberId: string; refId: string; title: string; link: string }): Promise<void>;
}

export const ACADEMY_LIMITS = { titleMin: 3, titleMax: 160, summaryMax: 2000, bodyMax: 100_000, quizMax: 30, optionsMin: 2, optionsMax: 6, passMark: 70 } as const;

export type CourseAccess = "free" | "owned" | "locked";

export interface CourseView {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  level: CourseLevel;
  language: "en" | "ar" | "tr";
  lessonCount: number;
  durationSeconds: number;
  access: CourseAccess;
  /** Lessons done, for a signed-in member who may open it; null otherwise. */
  progress: { completed: number; total: number } | null;
  certificateCode: string | null;
  publishedAt: string | null;
}

export interface LessonSummaryView {
  id: string;
  position: number;
  title: string;
  kind: LessonKind;
  durationSeconds: number;
  preview: boolean;
  locked: boolean;
  hasQuiz: boolean;
  completed: boolean;
}

export interface LessonView extends LessonSummaryView {
  courseId: string;
  body: string;
  videoUrl: string | null;
  /** The questions without their answers. */
  quiz: { id: string; prompt: string; options: string[] }[];
  quizScore: number | null;
}

export interface CertificateView {
  code: string;
  memberName: string;
  courseTitle: string;
  courseSlug: string | null;
  issuedAt: string;
}

const LEVELS: readonly CourseLevel[] = ["beginner", "intermediate", "advanced"];
const LANGS = ["en", "ar", "tr"] as const;
const VIDEO_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|yallapp\.com\.tr|[\w-]+\.yallapp\.com\.tr)\//i;

function text(value: unknown, min: number, max: number, field: string): string {
  const clean = typeof value === "string" ? value.trim() : "";
  if (clean.length < min || clean.length > max) throw new QaError("invalid_request", `Between ${min} and ${max} characters.`, field);
  return clean;
}

const signedIn = (viewerId: string | null): string => {
  if (!viewerId) throw new QaError("invalid_token", "Sign in first.");
  return viewerId;
};

// ——— Reading ———

async function courseOf(env: AcademyEnv, idOrSlug: string, drafts = false): Promise<CourseRecord> {
  const c = (await env.store.getCourse(idOrSlug)) ?? (await env.store.getCourseBySlug(env.tenant, idOrSlug));
  if (!c || c.tenant !== env.tenant || (c.status !== "published" && !drafts)) throw new QaError("not_found", "There's no such course.");
  return c;
}

/** Who may open which of these courses: free, owned or locked. */
async function accessFor(env: AcademyEnv, viewerId: string | null, courses: readonly CourseRecord[]): Promise<Map<string, CourseAccess>> {
  const owned = new Set(viewerId && courses.length ? (await env.store.accessOf(viewerId, courses.map((c) => c.id))).map((a) => a.courseId) : []);
  return new Map(courses.map((c) => [c.id, c.free ? "free" : owned.has(c.id) ? "owned" : "locked"]));
}

async function courseViews(env: AcademyEnv, viewerId: string | null, courses: CourseRecord[]): Promise<CourseView[]> {
  if (!courses.length) return [];
  const ids = courses.map((c) => c.id);
  const [lessons, access, progress] = await Promise.all([env.store.listLessons(ids), accessFor(env, viewerId, courses), viewerId ? env.store.progressOf(viewerId, ids) : Promise.resolve([] as ProgressRecord[])]);
  const certificates = viewerId ? await Promise.all(courses.map((c) => env.store.certificateFor(viewerId, c.id))) : [];
  return courses.map((c, i) => {
    const own = lessons.filter((l) => l.courseId === c.id);
    const done = new Set(progress.filter((p) => p.courseId === c.id && p.completedAt).map((p) => p.lessonId));
    const open = access.get(c.id) !== "locked";
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      coverUrl: c.coverUrl,
      level: c.level,
      language: c.language,
      lessonCount: own.length,
      durationSeconds: own.reduce((n, l) => n + l.durationSeconds, 0),
      access: access.get(c.id)!,
      progress: viewerId && open ? { completed: own.filter((l) => done.has(l.id)).length, total: own.length } : null,
      certificateCode: certificates[i]?.code ?? null,
      publishedAt: c.publishedAt?.toISOString() ?? null,
    };
  });
}

/** The published courses, newest first. */
export async function listCourses(env: AcademyEnv, viewerId: string | null): Promise<CourseView[]> {
  return courseViews(env, viewerId, await env.store.listCourses(env.tenant, ["published"]));
}

/** The courses a member may open and has started or owns: free ones they enrolled in, and bought ones. */
export async function myCourses(env: AcademyEnv, viewerId: string | null): Promise<CourseView[]> {
  const me = signedIn(viewerId);
  const ids = new Set((await env.store.accessOf(me)).map((a) => a.courseId));
  const courses = (await env.store.listCourses(env.tenant, ["published"])).filter((c) => ids.has(c.id));
  return courseViews(env, me, courses);
}

async function lessonSummaries(env: AcademyEnv, viewerId: string | null, course: CourseRecord, open: boolean) {
  const lessons = await env.store.listLessons([course.id]);
  const [quiz, progress] = await Promise.all([env.store.quizOf(lessons.map((l) => l.id)), viewerId ? env.store.progressOf(viewerId, [course.id]) : Promise.resolve([] as ProgressRecord[])]);
  const withQuiz = new Set(quiz.map((q) => q.lessonId));
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  return lessons.map(
    (l): LessonSummaryView => ({
      id: l.id,
      position: l.position,
      title: l.title,
      kind: l.kind,
      durationSeconds: l.durationSeconds,
      preview: l.preview,
      locked: !open && !l.preview,
      hasQuiz: withQuiz.has(l.id),
      completed: done.has(l.id),
    }),
  );
}

/** One course by id or address, with its lessons (a locked one's titles only). */
export async function getCourse(env: AcademyEnv, viewerId: string | null, idOrSlug: string): Promise<CourseView & { lessons: LessonSummaryView[] }> {
  const course = await courseOf(env, idOrSlug);
  const [view] = await courseViews(env, viewerId, [course]);
  return { ...view!, lessons: await lessonSummaries(env, viewerId, course, view!.access !== "locked") };
}

async function lessonAndCourse(env: AcademyEnv, lessonId: string) {
  const lesson = await env.store.getLesson(lessonId);
  const course = lesson ? await env.store.getCourse(lesson.courseId) : null;
  if (!lesson || !course || course.tenant !== env.tenant || course.status !== "published") throw new QaError("not_found", "There's no such lesson.");
  return { lesson, course };
}

async function mayOpen(env: AcademyEnv, viewerId: string | null, course: CourseRecord): Promise<boolean> {
  return (await accessFor(env, viewerId, [course])).get(course.id) !== "locked";
}

/** A lesson to read or watch: a free or owned course's, or a preview. A locked one is refused ("locked"). */
export async function getLesson(env: AcademyEnv, viewerId: string | null, lessonId: string): Promise<LessonView> {
  const { lesson, course } = await lessonAndCourse(env, lessonId);
  const open = await mayOpen(env, viewerId, course);
  if (!open && !lesson.preview) throw new QaError("not_allowed", "This course is locked.", "locked");
  const [summary] = (await lessonSummaries(env, viewerId, course, open)).filter((l) => l.id === lesson.id);
  const quiz = await env.store.quizOf([lesson.id]);
  const progress = viewerId ? (await env.store.progressOf(viewerId, [course.id])).find((p) => p.lessonId === lesson.id) : undefined;
  return {
    ...summary!,
    courseId: course.id,
    body: lesson.body,
    videoUrl: lesson.videoUrl,
    quiz: quiz.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    quizScore: progress?.quizScore ?? null,
  };
}

// ——— Learning ———

/** A free course: the member starts it (it shows in their courses). A locked one is refused. */
export async function enroll(env: AcademyEnv, viewerId: string | null, courseId: string): Promise<CourseView> {
  const me = signedIn(viewerId);
  const course = await courseOf(env, courseId);
  if (!course.free && !(await mayOpen(env, me, course))) throw new QaError("not_allowed", "This course is locked.", "locked");
  if (course.free) await env.store.grantAccess({ tenant: env.tenant, memberId: me, courseId: course.id, source: "free", ref: null, grantedAt: env.now });
  return (await courseViews(env, me, [course]))[0]!;
}

async function openFor(env: AcademyEnv, viewerId: string | null, lessonId: string) {
  const me = signedIn(viewerId);
  const found = await lessonAndCourse(env, lessonId);
  if (!(await mayOpen(env, me, found.course))) throw new QaError("not_allowed", "This course is locked.", "locked");
  // Learning in a free course starts it.
  if (found.course.free) await env.store.grantAccess({ tenant: env.tenant, memberId: me, courseId: found.course.id, source: "free", ref: null, grantedAt: env.now });
  const progress = (await env.store.progressOf(me, [found.course.id])).find((p) => p.lessonId === lessonId) ?? { memberId: me, lessonId, courseId: found.course.id, completedAt: null, quizScore: null, attempts: 0 };
  return { me, ...found, progress };
}

export interface CompleteResult {
  completed: boolean;
  progress: { completed: number; total: number };
  certificateCode: string | null;
}

/** When every lesson is done: the member's certificate, once. */
async function finish(env: AcademyEnv, me: string, course: CourseRecord): Promise<CompleteResult> {
  const [lessons, progress] = await Promise.all([env.store.listLessons([course.id]), env.store.progressOf(me, [course.id])]);
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  const completed = lessons.filter((l) => done.has(l.id)).length;
  let certificate = await env.store.certificateFor(me, course.id);
  if (!certificate && lessons.length > 0 && completed === lessons.length) {
    const record: CertificateRecord = { id: randomUUID(), tenant: env.tenant, code: certificateCode(), memberId: me, courseId: course.id, memberName: ((await env.memberName(me)) ?? "").slice(0, 120) || "Yallapp member", courseTitle: course.title, issuedAt: env.now };
    if (await env.store.createCertificate(record)) await env.onEvent?.({ kind: "course_completed", memberId: me, refId: course.id, title: course.title, link: `/academy/courses/${course.slug}` });
    certificate = await env.store.certificateFor(me, course.id);
  }
  return { completed: true, progress: { completed, total: lessons.length }, certificateCode: certificate?.code ?? null };
}

/** A lesson done. One with a quiz is done when the quiz is passed. */
export async function completeLesson(env: AcademyEnv, viewerId: string | null, lessonId: string): Promise<CompleteResult> {
  const { me, course, progress } = await openFor(env, viewerId, lessonId);
  const quiz = await env.store.quizOf([lessonId]);
  if (quiz.length && (progress.quizScore ?? 0) < ACADEMY_LIMITS.passMark) throw new QaError("invalid_request", "Pass the lesson's quiz first.", "quiz");
  if (!progress.completedAt) {
    await env.store.saveProgress({ ...progress, completedAt: env.now });
    await env.onEvent?.({ kind: "lesson_done", memberId: me, refId: lessonId, title: course.title, link: `/academy/courses/${course.slug}` });
  }
  return finish(env, me, course);
}

export interface QuizResult {
  score: number;
  passed: boolean;
  /** Whether each answer was right, in the questions' order. */
  correct: boolean[];
  lesson: CompleteResult | null;
}

/** A try at a lesson's quiz: its score (0–100); passing (70) completes the lesson. */
export async function submitQuiz(env: AcademyEnv, viewerId: string | null, lessonId: string, answers: unknown): Promise<QuizResult> {
  const { me, course, progress } = await openFor(env, viewerId, lessonId);
  const quiz = await env.store.quizOf([lessonId]);
  if (!quiz.length) throw new QaError("not_found", "This lesson has no quiz.");
  if (!Array.isArray(answers) || answers.length !== quiz.length || !answers.every((a) => Number.isInteger(a))) throw new QaError("invalid_request", "Answer every question.", "answers");
  const correct = quiz.map((q, i) => answers[i] === q.answer);
  const score = Math.round((correct.filter(Boolean).length / quiz.length) * 100);
  const passed = score >= ACADEMY_LIMITS.passMark;
  await env.store.saveProgress({ ...progress, attempts: progress.attempts + 1, quizScore: Math.max(score, progress.quizScore ?? 0), completedAt: progress.completedAt ?? (passed ? env.now : null) });
  if (passed && !progress.completedAt) await env.onEvent?.({ kind: "lesson_done", memberId: me, refId: lessonId, title: course.title, link: `/academy/courses/${course.slug}` });
  return { score, passed, correct, lesson: passed ? await finish(env, me, course) : null };
}

/** A certificate by its public code, for anyone to check. */
export async function certificate(env: AcademyEnv, code: string): Promise<CertificateView> {
  const c = /^[A-Z0-9]{6,20}$/.test(code) ? await env.store.certificateByCode(code) : null;
  if (!c || c.tenant !== env.tenant) throw new QaError("not_found", "There's no such certificate.");
  const course = await env.store.getCourse(c.courseId);
  return { code: c.code, memberName: c.memberName, courseTitle: c.courseTitle, courseSlug: course?.slug ?? null, issuedAt: c.issuedAt.toISOString() };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function certificateCode(): string {
  return Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

// ——— The admin's authoring (no price here: the website sets it, setCoursePrice) ———

export interface CourseInput {
  title?: unknown;
  summary?: unknown;
  coverUrl?: unknown;
  level?: unknown;
  language?: unknown;
  status?: unknown;
  free?: unknown;
}

function coursePatch(input: CourseInput, creating: boolean): Partial<CourseRecord> {
  const patch: Partial<CourseRecord> = {};
  if (creating || input.title !== undefined) patch.title = text(input.title, ACADEMY_LIMITS.titleMin, ACADEMY_LIMITS.titleMax, "title");
  if (creating || input.summary !== undefined) patch.summary = text(input.summary ?? "", 0, ACADEMY_LIMITS.summaryMax, "summary");
  if (input.coverUrl !== undefined) {
    if (input.coverUrl !== null && (typeof input.coverUrl !== "string" || !/^https:\/\//i.test(input.coverUrl))) throw new QaError("invalid_request", "The cover is an https address.", "coverUrl");
    patch.coverUrl = input.coverUrl as string | null;
  }
  if (creating || input.level !== undefined) {
    if (!LEVELS.includes(input.level as CourseLevel)) throw new QaError("invalid_request", "Choose a level.", "level");
    patch.level = input.level as CourseLevel;
  }
  if (creating || input.language !== undefined) {
    if (!LANGS.includes(input.language as never)) throw new QaError("invalid_request", "Choose its language.", "language");
    patch.language = input.language as CourseRecord["language"];
  }
  if (input.status !== undefined) {
    if (input.status !== "draft" && input.status !== "published") throw new QaError("invalid_request", "Draft or published.", "status");
    patch.status = input.status as CourseStatus;
  }
  if (input.free !== undefined) {
    if (typeof input.free !== "boolean") throw new QaError("invalid_request", "Free is true or false.", "free");
    patch.free = input.free;
  }
  return patch;
}

/** The admin's view of a course: any status, its lessons and quizzes with their answers. */
export async function adminCourse(env: AcademyEnv, courseId: string) {
  const course = await courseOf(env, courseId, true);
  const lessons = await env.store.listLessons([course.id]);
  const quiz = await env.store.quizOf(lessons.map((l) => l.id));
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    coverUrl: course.coverUrl,
    level: course.level,
    language: course.language,
    status: course.status,
    free: course.free,
    lessons: lessons.map((l) => ({ id: l.id, position: l.position, title: l.title, kind: l.kind, body: l.body, videoUrl: l.videoUrl, durationSeconds: l.durationSeconds, preview: l.preview, quiz: quiz.filter((q) => q.lessonId === l.id).map((q) => ({ prompt: q.prompt, options: q.options, answer: q.answer })) })),
  };
}

export async function adminCourses(env: AcademyEnv) {
  const courses = await env.store.listCourses(env.tenant, ["draft", "published"]);
  const lessons = await env.store.listLessons(courses.map((c) => c.id));
  return courses.map((c) => ({ id: c.id, slug: c.slug, title: c.title, status: c.status, free: c.free, lessonCount: lessons.filter((l) => l.courseId === c.id).length, updatedAt: c.updatedAt.toISOString() }));
}

export async function createCourse(env: AcademyEnv, input: CourseInput) {
  const patch = coursePatch(input, true);
  const base = slugify(patch.title!, "course");
  let slug = base;
  for (let n = 2; await env.store.getCourseBySlug(env.tenant, slug); n++) slug = `${base}-${n}`;
  const status = patch.status ?? "draft";
  const course: CourseRecord = { id: randomUUID(), tenant: env.tenant, slug, title: patch.title!, summary: patch.summary ?? "", coverUrl: patch.coverUrl ?? null, level: patch.level!, language: patch.language!, status, free: patch.free ?? false, priceMinor: null, currency: null, createdAt: env.now, updatedAt: env.now, publishedAt: status === "published" ? env.now : null };
  await env.store.createCourse(course);
  return adminCourse(env, course.id);
}

export async function updateCourse(env: AcademyEnv, courseId: string, input: CourseInput) {
  const course = await courseOf(env, courseId, true);
  const patch = coursePatch(input, false);
  if (patch.status === "published" && !course.publishedAt) patch.publishedAt = env.now;
  await env.store.updateCourse(course.id, { ...patch, updatedAt: env.now });
  return adminCourse(env, course.id);
}

export interface LessonInput {
  title?: unknown;
  kind?: unknown;
  body?: unknown;
  videoUrl?: unknown;
  durationSeconds?: unknown;
  preview?: unknown;
  position?: unknown;
}

function lessonPatch(input: LessonInput, current: LessonRecord | null): Partial<LessonRecord> {
  const patch: Partial<LessonRecord> = {};
  if (!current || input.title !== undefined) patch.title = text(input.title, ACADEMY_LIMITS.titleMin, ACADEMY_LIMITS.titleMax, "title");
  const kind = (input.kind ?? current?.kind) as LessonKind;
  if (kind !== "video" && kind !== "article") throw new QaError("invalid_request", "A lesson is a video or an article.", "kind");
  patch.kind = kind;
  if (!current || input.body !== undefined) patch.body = text(input.body ?? "", kind === "article" ? 20 : 0, ACADEMY_LIMITS.bodyMax, "body");
  const body = patch.body ?? current!.body;
  if (kind === "video") {
    const url = input.videoUrl ?? current?.videoUrl;
    if (typeof url !== "string" || !VIDEO_HOSTS.test(url)) throw new QaError("invalid_request", "Give the video's address on YouTube, Vimeo or Yallapp.", "videoUrl");
    const seconds = Math.round(Number(input.durationSeconds ?? current?.durationSeconds ?? 0));
    if (!(seconds >= 1 && seconds <= 6 * 3600)) throw new QaError("invalid_request", "Give the video's length.", "durationSeconds");
    patch.videoUrl = url;
    patch.durationSeconds = seconds;
  } else {
    patch.videoUrl = null;
    // About 200 words a minute.
    patch.durationSeconds = Math.max(60, Math.round((body.split(/\s+/).length / 200) * 60));
  }
  if (input.preview !== undefined) patch.preview = input.preview === true;
  if (input.position !== undefined) {
    if (!Number.isInteger(input.position) || (input.position as number) < 0) throw new QaError("invalid_request", "A position is 0 or more.", "position");
    patch.position = input.position as number;
  }
  return patch;
}

export async function addLesson(env: AcademyEnv, courseId: string, input: LessonInput) {
  const course = await courseOf(env, courseId, true);
  const patch = lessonPatch(input, null);
  const existing = await env.store.listLessons([course.id]);
  const lesson: LessonRecord = { id: randomUUID(), courseId: course.id, position: patch.position ?? existing.length, title: patch.title!, kind: patch.kind!, body: patch.body!, videoUrl: patch.videoUrl ?? null, durationSeconds: patch.durationSeconds!, preview: patch.preview ?? false, createdAt: env.now };
  await env.store.createLesson(lesson);
  await env.store.updateCourse(course.id, { updatedAt: env.now });
  return adminCourse(env, course.id);
}

async function adminLesson(env: AcademyEnv, lessonId: string) {
  const lesson = await env.store.getLesson(lessonId);
  const course = lesson ? await env.store.getCourse(lesson.courseId) : null;
  if (!lesson || !course || course.tenant !== env.tenant) throw new QaError("not_found", "There's no such lesson.");
  return { lesson, course };
}

export async function updateLesson(env: AcademyEnv, lessonId: string, input: LessonInput) {
  const { lesson, course } = await adminLesson(env, lessonId);
  await env.store.updateLesson(lesson.id, lessonPatch(input, lesson));
  return adminCourse(env, course.id);
}

export async function deleteLesson(env: AcademyEnv, lessonId: string) {
  const { lesson, course } = await adminLesson(env, lessonId);
  await env.store.deleteLesson(lesson.id);
  return adminCourse(env, course.id);
}

/** Replaces a lesson's quiz: each question's prompt, 2–6 options and the right one. An empty list removes it. */
export async function setQuiz(env: AcademyEnv, lessonId: string, questions: unknown) {
  const { lesson, course } = await adminLesson(env, lessonId);
  if (!Array.isArray(questions) || questions.length > ACADEMY_LIMITS.quizMax) throw new QaError("invalid_request", `At most ${ACADEMY_LIMITS.quizMax} questions.`, "questions");
  const records = questions.map((q: { prompt?: unknown; options?: unknown; answer?: unknown }, position): QuizQuestionRecord => {
    const prompt = text(q?.prompt, 3, 500, "questions");
    const options = Array.isArray(q?.options) ? q.options.map((o) => text(o, 1, 200, "questions")) : [];
    if (options.length < ACADEMY_LIMITS.optionsMin || options.length > ACADEMY_LIMITS.optionsMax) throw new QaError("invalid_request", "Each question has 2 to 6 options.", "questions");
    if (!Number.isInteger(q?.answer) || (q.answer as number) < 0 || (q.answer as number) >= options.length) throw new QaError("invalid_request", "Mark the right option.", "questions");
    return { id: randomUUID(), lessonId: lesson.id, position, prompt, options, answer: q.answer as number };
  });
  await env.store.setQuiz(lesson.id, records);
  return adminCourse(env, course.id);
}

// ——— For the website's checkout (area C) and the admin's price page (area F). Never called by the Community API. ———

/** What the checkout charges for a course; null when it's free, unpriced or not published. */
export async function coursePriceForCheckout(store: AcademyStore, tenant: string, courseId: string): Promise<{ courseId: string; slug: string; title: string; priceMinor: number; currency: string } | null> {
  const c = await store.getCourse(courseId);
  if (!c || c.tenant !== tenant || c.status !== "published" || c.free || c.priceMinor === null || !c.currency) return null;
  return { courseId: c.id, slug: c.slug, title: c.title, priceMinor: c.priceMinor, currency: c.currency };
}

/** The admin sets a course's price in US cents (Studio Market's rule: the gateway converts), or clears it. */
export async function setCoursePrice(store: AcademyStore, tenant: string, courseId: string, price: { priceMinor: number; currency: string } | null, now = new Date()): Promise<boolean> {
  const c = await store.getCourse(courseId);
  if (!c || c.tenant !== tenant) return false;
  if (price && (!Number.isInteger(price.priceMinor) || price.priceMinor < 0 || price.currency !== "USD")) throw new QaError("invalid_request", "A price is a whole number of US cents (the gateway converts).", "price");
  await store.updateCourse(c.id, { priceMinor: price?.priceMinor ?? null, currency: price?.currency ?? null, updatedAt: now });
  return true;
}

/** A member may open a course from now on (a bought one, or one the team gives). Idempotent: false when they already could. */
export async function grantCourseAccess(store: AcademyStore, input: { tenant: string; memberId: string; courseId: string; source: Exclude<AccessSource, "free">; ref: string | null }, now = new Date()): Promise<boolean> {
  const c = await store.getCourse(input.courseId);
  if (!c || c.tenant !== input.tenant) return false;
  const record: AccessRecord = { tenant: input.tenant, memberId: input.memberId, courseId: c.id, source: input.source, ref: input.ref, grantedAt: now };
  return store.grantAccess(record);
}

