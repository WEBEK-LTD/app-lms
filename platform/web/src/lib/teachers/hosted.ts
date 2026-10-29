import { formatCents } from "../catalog/money";
import { readReview, REVIEW_LIMIT } from "../courses/community";
import { courseSetup } from "../courses/setup";
import type { DataStore } from "../data/store";
import type { App, Course, CourseLesson, CourseSetup, HostedUser, Teacher } from "../data/types";
import { courierWho } from "../delivery/service";
import { appZone } from "../analytics/zone";
import { CoursesConnector } from "../hosted/connectors/courses";
import { error, intParam } from "../hosted/connectors/common";
import type { Connector, ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { completeUpload, kindOf, MEDIA_KINDS, mediaLink, startUpload, uploadUrl } from "../media/files";
import { storageLimitBytes } from "../media/quota";
import type { MediaStorage } from "../media/storage";
import type { PlanInfo } from "../plans";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { addLesson, addSection, addTeacherCourse, editableByTeacher, growableByTeacher, readCourseInput, removeLesson, submitForReview, teacherCourseJson, updateTeacherCourse } from "./courses";
import { dayRange, EARNINGS_PERIODS, paidOrders, periodDays, statements, type EarningsPeriod } from "./earnings";
import { isReviewTeacher } from "./review";
import { BIO_MAX_LENGTH, coursesOf, headline, isPublished, readSubjects, sharePercent, teacherOf, teacherRating } from "./service";

/**
 * 105.3 The hosted API's Teachers endpoints (students: the academy's
 * teachers, a teacher's page, following and rating, applying to teach) and
 * Teacher endpoints (the teacher's courses, lessons and uploads, students'
 * questions and earnings), for academies with many teachers.
 */

export interface TeachersContext {
  store: DataStore;
  app: App;
  plan: PlanInfo | null | undefined;
  now: Date;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  /** The app's courses connector, for course summaries on a teacher's page. */
  connector: Connector | null | undefined;
  /** The media server, for lesson uploads; null: uploads aren't available. */
  storage: MediaStorage | null;
  chunkBytes: number;
  /** A lesson added to a published course: its students hear of it. */
  onNewLesson?: (course: Course, lesson: CourseLesson) => Promise<void>;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const noTeacher = () => error(404, "not_found", "Teacher not found.");
const noCourse = () => error(404, "not_found", "Course not found.");
const notTeacher = () => error(403, "not_teacher", "This account isn't one of the academy's teachers.");
const notEditable = () => error(409, "not_editable", "This course can't be changed now: it is with the academy, or already published.");
const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const noContent: ConnectorResult = { status: 204 };

const APPLY_LIMIT: RateLimitRule = { name: "teacher_apply", limit: 5, windowSeconds: 24 * 3600 };
const COURSE_LIMIT: RateLimitRule = { name: "teacher_course", limit: 30, windowSeconds: 3600 };
const UPLOAD_LIMIT: RateLimitRule = { name: "teacher_upload", limit: 60, windowSeconds: 3600 };

const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

export async function handleTeachersRoute(ctx: TeachersContext, request: ConnectorRequest): Promise<ConnectorResult | null> {
  const [first, second, third, fourth] = request.path;
  const n = request.path.length;
  const is = (method: string) => request.method === method;
  if (first === "teachers") {
    if (n === 1 && is("GET")) return listTeachers(ctx, request);
    if (n === 2 && second === "application") {
      if (is("GET")) return myApplication(ctx, request);
      if (is("POST")) return apply(ctx, request);
      return null;
    }
    const id = Number(second);
    if (!Number.isSafeInteger(id)) return noTeacher();
    if (n === 2 && is("GET")) return teacherPage(ctx, request, id);
    if (n === 3 && third === "follow" && (is("PUT") || is("DELETE"))) return follow(ctx, request, id, is("PUT"));
    if (n === 3 && third === "reviews" && is("GET")) return reviews(ctx, request, id);
    if (n === 4 && third === "reviews" && fourth === "mine" && is("PUT")) return saveReview(ctx, request, id);
    return null;
  }
  if (first !== "teacher") return null;
  if (!request.user) return signIn();
  const teacher = await teacherOf(ctx.store, ctx.app, request.user, request.now);
  if (!teacher) return notTeacher();
  if (n === 2 && second === "me") {
    if (is("GET")) return ok(await profile(ctx, teacher));
    if (is("PATCH")) return updateMe(ctx, request, teacher);
    return null;
  }
  if (second === "courses") {
    if (n === 2 && is("GET")) return myCourses(ctx, teacher);
    if (n === 2 && is("POST")) return createCourse(ctx, request, teacher);
    const courseId = Number(third);
    const setup = courseSetup(ctx.app);
    const course = Number.isSafeInteger(courseId) ? setup.courses.find((c) => c.id === courseId && c.teacherId === teacher.id) : undefined;
    if (!course) return noCourse();
    if (n === 3 && is("GET")) return ok(await courseJson(ctx, setup, course));
    if (n === 3 && is("PATCH")) return updateCourse(ctx, request, setup, course);
    if (n === 4 && fourth === "submit" && is("POST")) return submit(ctx, setup, course);
    if (n === 4 && fourth === "sections" && is("POST")) return newSection(ctx, request, setup, course);
    if (n === 4 && fourth === "lessons" && is("POST")) return newLesson(ctx, request, setup, course);
    if (n === 5 && fourth === "lessons" && is("DELETE")) return deleteLesson(ctx, setup, course, Number(request.path[4]));
    return null;
  }
  if (second === "uploads") {
    if (n === 2 && is("POST")) return startTeacherUpload(ctx, request, teacher);
    if (n === 4 && fourth === "resume" && is("POST")) return resumeTeacherUpload(ctx, third!);
    if (n === 4 && fourth === "complete" && is("POST")) return completeTeacherUpload(ctx, third!);
    return null;
  }
  if (n === 2 && second === "questions" && is("GET")) return questions(ctx, request, teacher);
  if (n === 2 && second === "earnings" && is("GET")) return earnings(ctx, request, teacher);
  return null;
}

// Students

/** Students of the teacher's published courses, counted once each. */
async function studentCount(ctx: TeachersContext, courses: readonly Course[]): Promise<number> {
  const students = new Set<number>();
  for (const course of courses) for (const e of await ctx.store.listCourseEnrollments({ appId: ctx.app.id, courseId: course.id })) students.add(e.userId);
  return students.size;
}

function photo(ctx: TeachersContext, teacher: Teacher): string | null {
  return teacher.photoAssetId ? ctx.assetUrl(teacher.photoAssetId) : null;
}

function summaryJson(ctx: TeachersContext, teacher: Teacher, setup: CourseSetup, ratings: { teacherId: number; rating: number; count: number }[]) {
  const rated = teacherRating(ratings, teacher.id);
  return {
    id: teacher.id,
    name: teacher.name,
    avatar_url: photo(ctx, teacher),
    headline: headline(teacher.bio),
    subjects: teacher.subjects,
    rating: rated.rating,
    rating_count: rated.count,
    course_count: coursesOf(setup, teacher.id).filter(isPublished).length,
    featured: teacher.featured,
  };
}

async function listTeachers(ctx: TeachersContext, request: ConnectorRequest): Promise<ConnectorResult> {
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 100);
  const search = (request.query.get("search") ?? "").trim().toLowerCase();
  const subject = (request.query.get("subject") ?? "").trim().toLowerCase();
  if (search.length > 100 || subject.length > 60) return error(400, "invalid_request", "The search is too long.");
  const setup = courseSetup(ctx.app);
  const ratings = await ctx.store.countTeacherRatings(ctx.app.id);
  // 105.3 The store reviewers' test teacher isn't one of the academy's.
  const active = (await ctx.store.listTeachers(ctx.app.id, { statuses: ["active"] })).filter((t) => !isReviewTeacher(ctx.app, t));
  const subjects = [...new Set(active.flatMap((t) => t.subjects))].sort((a, b) => a.localeCompare(b));
  const found = active
    .filter((t) => !search || t.name.toLowerCase().includes(search) || t.subjects.some((s) => s.toLowerCase().includes(search)))
    .filter((t) => !subject || t.subjects.some((s) => s.toLowerCase() === subject))
    .map((t) => summaryJson(ctx, t, setup, ratings))
    // Featured first, then the best rated, then by name.
    .sort((a, b) => Number(b.featured) - Number(a.featured) || (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));
  return ok({ page, per_page: perPage, total: found.length, total_pages: Math.max(1, Math.ceil(found.length / perPage)), items: found.slice((page - 1) * perPage, page * perPage), subjects });
}

/** An active teacher of the academy, as students see them. */
async function shownTeacher(ctx: TeachersContext, id: number): Promise<Teacher | null> {
  const teacher = await ctx.store.getTeacher(ctx.app.id, id);
  return teacher && teacher.status === "active" ? teacher : null;
}

function reviewJson(review: { id: number; rating: number; text: string; hidden: boolean; createdAt: Date; userId: number }, user: HostedUser | null | undefined, mine: boolean) {
  return {
    id: review.id,
    rating: review.rating,
    text: review.text,
    author: { name: user?.name ?? "", avatar_url: null, instructor: false },
    created_at: review.createdAt.toISOString(),
    mine,
    hidden: review.hidden,
  };
}

/** Whether the person is a student in one of the teacher's published courses (and isn't the teacher). */
async function mayReview(ctx: TeachersContext, request: ConnectorRequest, teacher: Teacher, setup: CourseSetup): Promise<boolean> {
  if (!request.user || teacher.userId === request.user.id) return false;
  const mine = new Set((await ctx.store.listCourseEnrollments({ appId: ctx.app.id, userId: request.user.id })).map((e) => e.courseId));
  return coursesOf(setup, teacher.id).some((c) => isPublished(c) && mine.has(c.id));
}

async function teacherPage(ctx: TeachersContext, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
  const teacher = await shownTeacher(ctx, id);
  if (!teacher) return noTeacher();
  const setup = courseSetup(ctx.app);
  const published = coursesOf(setup, teacher.id)
    .filter(isPublished)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ratings = await ctx.store.countTeacherRatings(ctx.app.id);
  const followers = (await ctx.store.countTeacherFollowers(ctx.app.id)).find((f) => f.teacherId === teacher.id)?.count ?? 0;
  const own = request.user ? await ctx.store.getTeacherReviewOf(ctx.app.id, teacher.id, request.user.id) : null;
  const courses = ctx.connector instanceof CoursesConnector ? await ctx.connector.summariesFor(request, published) : [];
  return ok({
    ...summaryJson(ctx, teacher, setup, ratings),
    bio: teacher.bio,
    student_count: await studentCount(ctx, published),
    follower_count: followers,
    following: request.user ? await ctx.store.isFollowingTeacher(ctx.app.id, teacher.id, request.user.id) : false,
    can_review: await mayReview(ctx, request, teacher, setup),
    my_review: own ? reviewJson(own, request.user, true) : null,
    courses,
  });
}

async function follow(ctx: TeachersContext, request: ConnectorRequest, id: number, on: boolean): Promise<ConnectorResult> {
  if (!request.user) return signIn();
  const teacher = await shownTeacher(ctx, id);
  if (!teacher) return noTeacher();
  await ctx.store.setTeacherFollow({ appId: ctx.app.id, teacherId: teacher.id, userId: request.user.id, follow: on, now: request.now });
  return noContent;
}

async function reviews(ctx: TeachersContext, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
  const teacher = await shownTeacher(ctx, id);
  if (!teacher) return noTeacher();
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 10, 100);
  const { items, total } = await ctx.store.listTeacherReviews({ appId: ctx.app.id, teacherId: teacher.id, hidden: false, offset: (page - 1) * perPage, limit: perPage });
  const own = request.user ? await ctx.store.getTeacherReviewOf(ctx.app.id, teacher.id, request.user.id) : null;
  // A hidden review reaches its author only, first.
  const list = own?.hidden && page === 1 ? [own, ...items] : items;
  const users = new Map<number, HostedUser | null>();
  for (const r of list) if (!users.has(r.userId)) users.set(r.userId, await ctx.store.getHostedUser(ctx.app.id, r.userId));
  return ok({
    page,
    per_page: perPage,
    total,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
    items: list.map((r) => reviewJson(r, users.get(r.userId), r.userId === request.user?.id)),
  });
}

async function limited(ctx: TeachersContext, request: ConnectorRequest, rule: RateLimitRule): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, rule, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

async function saveReview(ctx: TeachersContext, request: ConnectorRequest, id: number): Promise<ConnectorResult> {
  if (!request.user) return signIn();
  const teacher = await shownTeacher(ctx, id);
  if (!teacher) return noTeacher();
  if (!(await mayReview(ctx, request, teacher, courseSetup(ctx.app)))) return error(403, "not_student", "Join one of this teacher's courses to rate them.");
  const read = readReview(request.body);
  if (!read.ok) return error(400, "invalid_request", read.error);
  const wait = await limited(ctx, request, REVIEW_LIMIT);
  if (wait) return wait;
  const review = await ctx.store.saveTeacherReview({ appId: ctx.app.id, teacherId: teacher.id, userId: request.user.id, rating: read.rating, text: read.text, now: request.now });
  return ok(reviewJson(review, request.user, true));
}

// Applying to teach

/** The teacher row of the person: their application, or the teacher with their number. */
async function applicationOf(ctx: TeachersContext, user: HostedUser): Promise<Teacher | null> {
  return (await ctx.store.findTeacherByUser(ctx.app.id, user.id)) ?? (await ctx.store.findTeacher(ctx.app.id, courierWho(user)));
}

function applicationJson(teacher: Teacher) {
  const status = teacher.status === "applied" ? "pending" : teacher.status === "declined" ? "declined" : "approved";
  return { status, name: teacher.name, bio: teacher.bio, subjects: teacher.subjects, note: teacher.status === "declined" ? teacher.note : null, created_at: teacher.createdAt.toISOString() };
}

async function myApplication(ctx: TeachersContext, request: ConnectorRequest): Promise<ConnectorResult> {
  if (!request.user) return signIn();
  const found = await applicationOf(ctx, request.user);
  return found ? ok(applicationJson(found)) : error(404, "not_found", "You haven't applied to teach.");
}

async function apply(ctx: TeachersContext, request: ConnectorRequest): Promise<ConnectorResult> {
  if (!request.user) return signIn();
  if (courseSetup(ctx.app).teachersApply !== true) return error(403, "feature_disabled", "The academy isn't taking applications to teach in the app.");
  const body = record(request.body);
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 1 || name.length > 80) return error(400, "invalid_request", "Enter your name, up to 80 characters.");
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  if (bio.length < 1 || bio.length > BIO_MAX_LENGTH) return error(400, "invalid_request", "Say who you are and what you would teach, in up to 1000 characters.");
  const subjects = readSubjects(body.subjects, true);
  if (!subjects.ok) return error(400, "invalid_request", subjects.error);
  const found = await applicationOf(ctx, request.user);
  if (found && found.status !== "declined") return error(409, "already_applied", "You already applied to teach here.");
  const wait = await limited(ctx, request, APPLY_LIMIT);
  if (wait) return wait;
  if (found) {
    await ctx.store.updateTeacher(ctx.app.id, found.id, { name, bio, subjects: subjects.subjects, status: "applied", note: null, userId: request.user.id }, request.now);
    return ok(applicationJson({ ...found, name, bio, subjects: subjects.subjects, status: "applied", note: null, createdAt: found.createdAt }), 201);
  }
  const who = courierWho(request.user);
  const created = await ctx.store.createTeacher(
    { appId: ctx.app.id, name, phone: who.phone, email: who.email, userId: request.user.id, photoAssetId: null, bio, subjects: subjects.subjects, status: "applied", shareBp: 0, featured: false },
    request.now,
  );
  if (!created.ok) return error(409, "already_applied", "You already applied to teach here.");
  return ok(applicationJson(created.teacher), 201);
}

// The teacher

async function profile(ctx: TeachersContext, teacher: Teacher) {
  const setup = courseSetup(ctx.app);
  const rated = teacherRating(await ctx.store.countTeacherRatings(ctx.app.id), teacher.id);
  return {
    id: teacher.id,
    name: teacher.name,
    avatar_url: photo(ctx, teacher),
    bio: teacher.bio,
    subjects: teacher.subjects,
    share_percent: sharePercent(teacher.shareBp),
    rating: rated.rating,
    rating_count: rated.count,
    follower_count: (await ctx.store.countTeacherFollowers(ctx.app.id)).find((f) => f.teacherId === teacher.id)?.count ?? 0,
    student_count: await studentCount(ctx, coursesOf(setup, teacher.id).filter(isPublished)),
  };
}

async function updateMe(ctx: TeachersContext, request: ConnectorRequest, teacher: Teacher): Promise<ConnectorResult> {
  const body = record(request.body);
  const patch: { bio?: string; subjects?: string[] } = {};
  if (body.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.trim().length > BIO_MAX_LENGTH) return error(400, "invalid_request", "The bio can be up to 1000 characters.");
    patch.bio = body.bio.trim();
  }
  if (body.subjects !== undefined) {
    const subjects = readSubjects(body.subjects, false);
    if (!subjects.ok) return error(400, "invalid_request", subjects.error);
    patch.subjects = subjects.subjects;
  }
  await ctx.store.updateTeacher(ctx.app.id, teacher.id, patch, request.now);
  return ok(await profile(ctx, { ...teacher, ...patch }));
}

async function courseJson(ctx: TeachersContext, setup: CourseSetup, course: Course) {
  const students = (await ctx.store.listCourseEnrollments({ appId: ctx.app.id, courseId: course.id })).length;
  return teacherCourseJson(course, setup.currency, students);
}

async function myCourses(ctx: TeachersContext, teacher: Teacher): Promise<ConnectorResult> {
  const setup = courseSetup(ctx.app);
  const items = [];
  for (const course of coursesOf(setup, teacher.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))) items.push(await courseJson(ctx, setup, course));
  return ok({ items, categories: setup.categories.map((c) => ({ id: c.id, name: c.name, count: 0 })), currency: setup.currency });
}

/** Writes the academy's courses, read again first so nothing written meanwhile is lost. */
async function saveSetup(ctx: TeachersContext, change: (setup: CourseSetup) => CourseSetup | null, now: Date): Promise<CourseSetup | null> {
  const fresh = await ctx.store.getAppById(ctx.app.id);
  const next = change(courseSetup(fresh ?? ctx.app));
  if (!next) return null;
  await ctx.store.updateApp(ctx.app.id, { courseSetup: next }, now);
  ctx.app = { ...ctx.app, courseSetup: next };
  return next;
}

async function createCourse(ctx: TeachersContext, request: ConnectorRequest, teacher: Teacher): Promise<ConnectorResult> {
  const read = readCourseInput(request.body, courseSetup(ctx.app));
  if (!read.ok) return error(400, "invalid_request", read.error);
  const wait = await limited(ctx, request, COURSE_LIMIT);
  if (wait) return wait;
  let made: Course | null = null;
  const setup = await saveSetup(
    ctx,
    (s) => {
      const added = addTeacherCourse(s, teacher, read.value, request.now);
      made = added.course;
      return added.setup;
    },
    request.now,
  );
  return ok(await courseJson(ctx, setup!, made!), 201);
}

async function updateCourse(ctx: TeachersContext, request: ConnectorRequest, setup: CourseSetup, course: Course): Promise<ConnectorResult> {
  if (!editableByTeacher(course)) return notEditable();
  const read = readCourseInput(request.body, setup);
  if (!read.ok) return error(400, "invalid_request", read.error);
  const next = await saveSetup(ctx, (s) => updateTeacherCourse(s, course.id, read.value), request.now);
  return ok(await courseJson(ctx, next!, next!.courses.find((c) => c.id === course.id)!));
}

async function submit(ctx: TeachersContext, setup: CourseSetup, course: Course): Promise<ConnectorResult> {
  if (!editableByTeacher(course)) return notEditable();
  if (!course.topics.some((t) => t.lessons.length > 0)) return error(409, "no_lessons", "Add at least one lesson before sending the course for review.");
  const next = await saveSetup(ctx, (s) => submitForReview(s, course.id), ctx.now);
  return ok(await courseJson(ctx, next!, next!.courses.find((c) => c.id === course.id)!));
}

async function newSection(ctx: TeachersContext, request: ConnectorRequest, setup: CourseSetup, course: Course): Promise<ConnectorResult> {
  if (!growableByTeacher(course)) return notEditable();
  const title = typeof record(request.body).title === "string" ? (record(request.body).title as string).trim() : "";
  if (title.length < 1 || title.length > 120) return error(400, "invalid_request", "Give the section a title of up to 120 characters.");
  if (course.topics.length >= 100) return error(400, "invalid_request", "A course can have up to 100 sections.");
  const next = await saveSetup(ctx, (s) => addSection(s, course.id, title), request.now);
  return ok(await courseJson(ctx, next!, next!.courses.find((c) => c.id === course.id)!), 201);
}

async function newLesson(ctx: TeachersContext, request: ConnectorRequest, setup: CourseSetup, course: Course): Promise<ConnectorResult> {
  if (!growableByTeacher(course)) return notEditable();
  const body = record(request.body);
  const section = course.topics.find((t) => t.id === Number(body.section_id));
  if (!section) return error(400, "invalid_request", "Choose one of the course's sections.");
  if (section.lessons.length >= 200) return error(400, "invalid_request", "A section can have up to 200 lessons.");
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 1 || title.length > 120) return error(400, "invalid_request", "Give the lesson a title of up to 120 characters.");
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length > 5000) return error(400, "invalid_request", "The lesson's text can be up to 5000 characters.");
  const duration = body.duration_minutes === undefined || body.duration_minutes === null ? null : Number(body.duration_minutes);
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 600)) return error(400, "invalid_request", "The length is 1 to 600 minutes.");
  let videoUrl: string | null = null;
  let attachments: { name: string; url: string }[] = [];
  if (typeof body.upload_id === "string" && body.upload_id) {
    const file = await ctx.store.getMediaFile(ctx.app.id, body.upload_id);
    if (!file || file.status !== "ready") return error(400, "invalid_request", "That upload isn't finished. Send the file again.");
    if (file.kind === "video") videoUrl = mediaLink(ctx.platformUrl, file.id);
    else if (file.kind === "pdf") attachments = [{ name: file.name, url: mediaLink(ctx.platformUrl, file.id) }];
    else return error(400, "invalid_request", "A lesson takes a video or a PDF.");
  } else if (typeof body.video_url === "string" && body.video_url.trim()) {
    const url = body.video_url.trim();
    try {
      if (new URL(url).protocol !== "https:" || url.length > 500) throw new Error("not https");
    } catch {
      return error(400, "invalid_request", "Send the video's https address (YouTube, Vimeo or a video file).");
    }
    videoUrl = url;
  }
  if (!videoUrl && attachments.length === 0 && !text) return error(400, "invalid_request", "A lesson needs a video, a PDF or some text.");
  let lessonId = 0;
  const next = await saveSetup(
    ctx,
    (s) => {
      const added = addLesson(s, course.id, section.id, { title, videoUrl, text, durationMinutes: duration, preview: body.preview === true, attachments, dripDays: null });
      lessonId = added.lesson.id;
      return added.setup;
    },
    request.now,
  );
  const saved = next!.courses.find((c) => c.id === course.id)!;
  // A lesson of a published course is live: its students hear of it, as with the academy's lessons.
  if (isPublished(saved)) {
    const lesson = saved.topics.flatMap((t) => t.lessons).find((l) => l.id === lessonId);
    if (lesson) await ctx.onNewLesson?.(saved, lesson);
  }
  return ok(await courseJson(ctx, next!, saved), 201);
}

async function deleteLesson(ctx: TeachersContext, setup: CourseSetup, course: Course, lessonId: number): Promise<ConnectorResult> {
  if (!course.topics.some((t) => t.lessons.some((l) => l.id === lessonId))) return error(404, "not_found", "Lesson not found.");
  if (!editableByTeacher(course)) return notEditable();
  const next = await saveSetup(ctx, (s) => removeLesson(s, course.id, lessonId), ctx.now);
  return ok(await courseJson(ctx, next!, next!.courses.find((c) => c.id === course.id)!));
}

// Uploads (to the academy's Media library)

const TEACHER_KINDS = MEDIA_KINDS.filter((k) => k.kind === "video" || k.kind === "pdf");

async function startTeacherUpload(ctx: TeachersContext, request: ConnectorRequest, teacher: Teacher): Promise<ConnectorResult> {
  if (!ctx.storage) return error(503, "media_unavailable", "Files can't be sent right now.");
  const body = record(request.body);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const size = typeof body.size === "number" ? body.size : Number.NaN;
  const type = typeof body.type === "string" ? body.type : "";
  if (!name || !type) return error(400, "invalid_request", "Send the file's name, size and type.");
  if (!kindOf(type, TEACHER_KINDS)) return error(400, "invalid_request", "Send an MP4, MOV or WebM video, or a PDF.");
  const wait = await limited(ctx, request, UPLOAD_LIMIT);
  if (wait) return wait;
  const limitBytes = storageLimitBytes(ctx.plan ?? null, await ctx.store.listStoragePacks(ctx.app.id), request.now);
  const started = await startUpload({ store: ctx.store, storage: ctx.storage, now: request.now, limitBytes, chunkBytes: ctx.chunkBytes }, { appId: ctx.app.id, name: `${teacher.name} · ${name}`.slice(0, 200), size, contentType: type });
  if (!started.ok) {
    if (started.code === "storage_full") return error(413, "storage_full", "There's no room for this file in the academy's storage right now.");
    if (started.code === "too_big") return error(413, "too_big", started.message);
    return error(400, "invalid_request", started.message);
  }
  return ok({ id: started.file.id, kind: started.file.kind, upload_url: started.uploadUrl, chunk_bytes: started.chunkBytes, size: started.file.sizeBytes }, 201);
}

async function uploading(ctx: TeachersContext, id: string) {
  const file = /^[0-9a-f-]{36}$/.test(id) ? await ctx.store.getMediaFile(ctx.app.id, id) : null;
  return file && (file.kind === "video" || file.kind === "pdf") && file.source !== "chat" ? file : null;
}

async function resumeTeacherUpload(ctx: TeachersContext, id: string): Promise<ConnectorResult> {
  const file = await uploading(ctx, id);
  if (!file || file.status !== "uploading") return error(404, "not_found", "This upload doesn't exist.");
  if (!ctx.storage) return error(503, "media_unavailable", "Files can't be sent right now.");
  return ok({ id: file.id, kind: file.kind, upload_url: uploadUrl(ctx.storage, file), chunk_bytes: ctx.chunkBytes, size: file.sizeBytes });
}

async function completeTeacherUpload(ctx: TeachersContext, id: string): Promise<ConnectorResult> {
  const file = await uploading(ctx, id);
  if (!file) return error(404, "not_found", "This upload doesn't exist.");
  if (file.status === "ready") return noContent;
  if (!ctx.storage) return error(503, "media_unavailable", "Files can't be sent right now.");
  const result = await completeUpload({ store: ctx.store, storage: ctx.storage, now: ctx.now }, ctx.app.id, file.id);
  if (!result.ok) return { status: 409, body: { code: "incomplete", message: result.message, ...(result.offset !== undefined ? { offset: result.offset } : {}) } };
  return noContent;
}

// Questions and earnings

async function questions(ctx: TeachersContext, request: ConnectorRequest, teacher: Teacher): Promise<ConnectorResult> {
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 100);
  const setup = courseSetup(ctx.app);
  const courses = new Map(coursesOf(setup, teacher.id).map((c) => [c.id, c]));
  if (courses.size === 0) return ok({ page, per_page: perPage, total: 0, total_pages: 1, items: [] });
  const { items } = await ctx.store.listCourseQuestions({ appId: ctx.app.id, courseIds: [...courses.keys()], hidden: false, order: "updated", offset: 0, limit: 500 });
  // Waiting for an answer first, then the newest.
  const sorted = [...items].sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || b.updatedAt.getTime() - a.updatedAt.getTime());
  const shown = sorted.slice((page - 1) * perPage, page * perPage);
  const out = [];
  for (const q of shown) {
    const student = await ctx.store.getHostedUser(ctx.app.id, q.userId);
    out.push({
      id: q.id,
      course_id: q.courseId,
      course_title: courses.get(q.courseId)?.title ?? "",
      text: q.text,
      student_name: student?.name ?? "",
      answered: q.status === "answered",
      answer_count: q.answerCount,
      updated_at: q.updatedAt.toISOString(),
    });
  }
  return ok({ page, per_page: perPage, total: sorted.length, total_pages: Math.max(1, Math.ceil(sorted.length / perPage)), items: out });
}

async function earnings(ctx: TeachersContext, request: ConnectorRequest, teacher: Teacher): Promise<ConnectorResult> {
  const period = request.query.get("period") as EarningsPeriod | null;
  if (!period || !EARNINGS_PERIODS.includes(period)) return error(400, "invalid_request", "Unknown period.");
  const zone = await appZone(ctx.store, ctx.app);
  const { from, to } = periodDays(period, request.now, zone);
  const { start, end } = dayRange(from, to, zone);
  const setup = courseSetup(ctx.app);
  const [statement] = statements([teacher], setup, await paidOrders(ctx.store, ctx.app, start, end));
  const c = setup.currency;
  return ok({
    period,
    from,
    to,
    sales: statement!.sales,
    sales_formatted: formatCents(statement!.salesCents, c),
    refunds_formatted: formatCents(statement!.refundsCents, c),
    share_percent: sharePercent(statement!.shareBp),
    earned_formatted: formatCents(statement!.earnedCents, c),
    courses: statement!.courses.map((row) => ({ id: row.courseId, title: row.title, sales: row.sales, earned_formatted: formatCents(Math.round((Math.max(0, row.salesCents - row.refundsCents) * statement!.shareBp) / 10_000), c) })),
  });
}
