import { centsToDecimal, formatCents } from "../../catalog/money";
import { PAY_LINK_MINUTES, paymentsSetUp } from "../../catalog/settings";
import { DOWNLOAD_CHECK_MAX, DOWNLOAD_KEEP_DAYS, DOWNLOAD_LINK_MINUTES, isVideoFile } from "../../courses/downloads";
import { findLesson, lessonsOf, courseSetup, videoSource } from "../../courses/setup";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import type { App, Course, CourseLesson, CourseQuestion, CourseReview, CourseSetup, HostedUser, LessonProgress } from "../../data/types";
import { answersFor, QUESTION_LIMIT, ratingSummary, readCommunityText, readReview, REVIEW_LIMIT } from "../../courses/community";
import type { RateLimitRule } from "../../rate-limit";
import { hitRateLimit } from "../../rate-limit";
import { descriptionHtml, payUrl } from "./catalog";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";
import type { ResolvedMedia } from "../../media/files";

/** 51 Videos in the app's Media library (a lesson's video address is its Yallapp link). */
export interface CoursesMedia {
  /** Whether the address is a Yallapp media link. */
  isLink(url: string): boolean;
  /** The file signed for playing or saving, or null when it's gone. */
  resolve(url: string, purpose: "play" | "download"): Promise<ResolvedMedia | null>;
}

export interface CoursesDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  /** 13.1 Card payments in the app are in the app's plan (default true); without them paid courses show no purchase action. */
  cardPayments?: boolean;
  /** 45 Lessons may be saved for offline viewing: offline mode in the plan and the owner's choice (default false). */
  downloads?: boolean;
  /** 51 Videos from the Media library; without it, a Yallapp link is a plain address. */
  media?: CoursesMedia;
  /** 63 Tells the business of a question, or a student writing again under one (a push to its phones); failures don't fail it. */
  onQuestion?: (input: { question: CourseQuestion; course: Course; user: HostedUser; text: string; followUp: boolean }) => Promise<void>;
  /** 63 Tells the business of a new review. */
  onReview?: (input: { review: CourseReview; course: Course; user: HostedUser }) => Promise<void>;
}

type Ratings = { courseId: number; rating: number; count: number }[];

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const noCourse = () => error(404, "not_found", "Course not found.");

/**
 * Courses managed in the Yallapp dashboard, served like the plugin's LMS
 * endpoints: courses, topics and lessons from the app's course setup,
 * enrolments and progress from their tables. Free courses are enrolled in
 * from the app; paid ones are bought on Android on the payment page (never
 * on iOS), with the shop's card payment settings.
 */
export class CoursesConnector implements Connector {
  private readonly setup: CourseSetup;

  constructor(private readonly deps: CoursesDeps) {
    this.setup = courseSetup(deps.app);
  }

  private get canSell(): boolean {
    // 16 A demo academy "sells" on its payment page, which charges nothing.
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  async config() {
    return {
      features: {
        lms: "yallapp",
        lms_version: "1",
        pro: false,
        certificates: false,
        quizzes: false,
        wishlist: false,
        // 63 Reviews and questions, answered from the dashboard and Yallapp Business.
        reviews: true,
        qna: true,
        downloads: this.deps.downloads === true,
      },
      purchases: { enroll_button: this.canSell, free_enrollment: true },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "GET /home":
        return { status: 200, body: { sections: await this.home(request) } };
      case "GET /categories":
        return { status: 200, body: { items: this.categories() } };
      case "GET /courses":
        return this.courses(request);
      case "GET /me/courses":
        return this.myCourses(request);
      case "GET /me/wishlist":
        return request.user ? { status: 200, body: { items: [] } } : signIn();
      case "GET /me/certificates":
        return request.user ? { status: 200, body: { items: [] } } : signIn();
      case "POST /auth/checkout-link":
        return this.checkoutLink(request);
      case "POST /me/downloads/check":
        return this.checkDownloads(request);
    }
    const [first, second, third] = request.path;
    if (first === "me" && second === "wishlist" && third) return error(403, "feature_disabled", "Wishlists aren't available in this app.");
    if (first === "courses" && second) {
      const course = this.course(Number(second));
      // 63 Reviews and questions of a course.
      if (third === "reviews" && request.path.length === 3 && request.method === "GET") return course ? this.reviews(request, course) : noCourse();
      if (third === "reviews" && request.path[3] === "mine" && request.path.length === 4 && request.method === "PUT") return this.saveReview(request, course);
      if (third === "questions" && request.path.length === 3 && request.method === "GET") return this.questions(request, course);
      if (third === "questions" && request.path.length === 3 && request.method === "POST") return this.ask(request, course);
      if (request.method === "GET" && request.path.length === 2) return course ? this.detail(request, course) : noCourse();
      if (request.method === "GET" && third === "curriculum" && request.path.length === 3) return course ? this.curriculum(request, course) : noCourse();
      if (request.method === "POST" && third === "enroll" && request.path.length === 3) return this.enroll(request, course);
    }
    if (first === "questions" && second) {
      if (request.method === "GET" && request.path.length === 2) return this.thread(request, Number(second));
      if (request.method === "POST" && third === "answers" && request.path.length === 3) return this.reply(request, Number(second));
    }
    if (first === "lessons" && second) {
      const found = findLesson(this.setup, Number(second));
      const ok = found && found.course.active ? found : null;
      if (request.method === "GET" && request.path.length === 2) return this.lesson(request, ok);
      if (request.method === "PUT" && third === "progress" && request.path.length === 3) return this.progress(request, ok);
      if (request.method === "POST" && third === "complete" && request.path.length === 3) return this.complete(request, ok);
      if (request.method === "POST" && third === "download" && request.path.length === 3) return this.download(request, ok);
    }
    return null;
  }

  // Data

  private active(): Course[] {
    return this.setup.courses.filter((c) => c.active);
  }

  private course(id: number): Course | null {
    return Number.isSafeInteger(id) ? (this.active().find((c) => c.id === id) ?? null) : null;
  }

  private async enrolled(request: ConnectorRequest): Promise<Set<number>> {
    if (!request.user) return new Set();
    const rows = await this.deps.store.listCourseEnrollments({ appId: this.deps.app.id, userId: request.user.id });
    return new Set(rows.map((e) => e.courseId));
  }

  private async progressOf(request: ConnectorRequest, courseId?: number): Promise<Map<number, LessonProgress>> {
    if (!request.user) return new Map();
    const rows = await this.deps.store.listLessonProgress({ appId: this.deps.app.id, userId: request.user.id, courseId });
    return new Map(rows.map((p) => [p.lessonId, p]));
  }

  // Mapping

  private price(c: Course) {
    if (c.priceCents === 0) return { is_free: true, amount: null, sale_amount: null, currency: null, formatted: null };
    const { currency } = this.setup;
    return { is_free: false, amount: centsToDecimal(c.priceCents), sale_amount: null, currency, formatted: formatCents(c.priceCents, currency) };
  }

  private async ratings(): Promise<Ratings> {
    return this.deps.store.countCourseRatings(this.deps.app.id);
  }

  private summary(c: Course, enrolled: Set<number>, ratings: Ratings = []) {
    const rated = ratingSummary(ratings, c.id);
    return {
      id: c.id,
      title: c.title,
      image_url: c.imageAssetId ? this.deps.assetUrl(c.imageAssetId) : null,
      instructor: { id: 0, name: c.instructorName ?? this.deps.app.appName ?? "Instructor", avatar_url: null, bio: null },
      price: this.price(c),
      lesson_count: lessonsOf(c).length,
      rating: rated.rating,
      rating_count: rated.count,
      enrolled: enrolled.has(c.id),
      wishlisted: false,
    };
  }

  private progressJson(c: Course, progress: Map<number, LessonProgress>) {
    const lessons = lessonsOf(c);
    const done = lessons.filter((l) => progress.get(l.id)?.completedAt).length;
    const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
    const completed = lessons.length > 0 && done === lessons.length;
    // 45 A finished course was finished when its last lesson was completed.
    const last = completed ? Math.max(...lessons.map((l) => progress.get(l.id)?.completedAt?.getTime() ?? 0)) : 0;
    return {
      course_id: c.id,
      completed_items: done,
      total_items: lessons.length,
      percent,
      course_completed: completed,
      completed_at: last > 0 ? new Date(last).toISOString() : null,
    };
  }

  private item(l: CourseLesson, open: boolean, progress: Map<number, LessonProgress>) {
    return {
      id: l.id,
      type: "lesson",
      title: l.title,
      duration_minutes: l.durationMinutes,
      question_count: null,
      preview: l.preview,
      locked: !open && !l.preview,
      completed: Boolean(progress.get(l.id)?.completedAt),
    };
  }

  private myCourse(c: Course, enrolled: Set<number>, progress: Map<number, LessonProgress>, ratings: Ratings = []) {
    const next = lessonsOf(c).find((l) => !progress.get(l.id)?.completedAt);
    return {
      course: this.summary(c, enrolled, ratings),
      progress: this.progressJson(c, progress),
      ...(next ? { next_item: this.item(next, true, progress) } : {}),
      certificate_url: null,
    };
  }

  private categories() {
    const courses = this.active();
    return this.setup.categories
      .map((cat) => ({ id: cat.id, name: cat.name, count: courses.filter((c) => c.categoryIds.includes(cat.id)).length }))
      .filter((cat) => cat.count > 0);
  }

  // Endpoints

  private async home(request: ConnectorRequest) {
    const sections: Record<string, unknown>[] = [];
    const enrolled = await this.enrolled(request);
    const ratings = await this.ratings();
    if (request.user && enrolled.size) {
      const progress = await this.progressOf(request);
      const current = this.active().find((c) => enrolled.has(c.id) && !this.progressJson(c, progress).course_completed);
      if (current) sections.push({ type: "continue_learning", title: "Continue learning", course: this.myCourse(current, enrolled, progress, ratings) });
    }
    const categories = this.categories();
    if (categories.length) sections.push({ type: "categories", title: "Categories", categories });
    const latest = [...this.active()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
    if (latest.length) sections.push({ type: "latest_courses", title: "Latest courses", courses: latest.map((c) => this.summary(c, enrolled, ratings)) });
    return sections;
  }

  private async courses(request: ConnectorRequest): Promise<ConnectorResult> {
    const { query } = request;
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 100);
    const search = (query.get("search") ?? "").trim().toLowerCase();
    const category = Number(query.get("category") ?? 0);
    const price = query.get("price") ?? "all";
    const orderby = query.get("orderby") ?? "newest";
    const enrolled = await this.enrolled(request);
    let all = this.active()
      .filter((c) => !search || c.title.toLowerCase().includes(search))
      .filter((c) => !category || c.categoryIds.includes(category))
      .filter((c) => price === "all" || (price === "free" ? c.priceCents === 0 : c.priceCents > 0));
    if (orderby === "title") all = all.sort((a, b) => a.title.localeCompare(b.title));
    else if (orderby === "popular") {
      const counts = new Map<number, number>();
      for (const e of await this.deps.store.listCourseEnrollments({ appId: this.deps.app.id })) counts.set(e.courseId, (counts.get(e.courseId) ?? 0) + 1);
      all = all.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
    } else all = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const ratings = await this.ratings();
    const items = all.slice((page - 1) * perPage, page * perPage).map((c) => this.summary(c, enrolled, ratings));
    return { status: 200, body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items } };
  }

  private async detail(request: ConnectorRequest, c: Course): Promise<ConnectorResult> {
    const enrolled = await this.enrolled(request);
    const ios = request.query.get("platform") === "ios";
    const action = enrolled.has(c.id) ? "continue" : c.priceCents === 0 ? "enroll_free" : !ios && this.canSell ? "checkout" : "none";
    const minutes = lessonsOf(c).reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
    return {
      status: 200,
      body: {
        ...this.summary(c, enrolled, await this.ratings()),
        description_html: descriptionHtml(c.description),
        duration_minutes: minutes || null,
        level: c.level,
        has_certificate: false,
        qna: true,
        categories: this.setup.categories.filter((cat) => c.categoryIds.includes(cat.id)).map((cat) => ({ ...cat, count: 0 })),
        purchase: { action },
        // 45 The student's progress, so a finished course says so. Courses managed in Yallapp have no certificates yet.
        ...(enrolled.has(c.id) ? { progress: this.progressJson(c, await this.progressOf(request, c.id)), certificate_url: null } : {}),
      },
    };
  }

  private async curriculum(request: ConnectorRequest, c: Course): Promise<ConnectorResult> {
    const open = (await this.enrolled(request)).has(c.id);
    const progress = await this.progressOf(request, c.id);
    return {
      status: 200,
      body: { topics: c.topics.map((t) => ({ id: t.id, title: t.title, items: t.lessons.map((l) => this.item(l, open, progress)) })) },
    };
  }

  private async enroll(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!c) return noCourse();
    if (c.priceCents > 0) return error(403, "purchase_required", "This course isn't free.");
    await this.deps.store.enrollInCourse({ appId: this.deps.app.id, userId: request.user.id, courseId: c.id, source: "free", enrolledAt: request.now });
    const row = (await this.deps.store.listCourseEnrollments({ appId: this.deps.app.id, userId: request.user.id, courseId: c.id }))[0]!;
    return { status: 200, body: { course_id: c.id, enrolled_at: row.enrolledAt.toISOString() } };
  }

  private async myCourses(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const status = request.query.get("status") ?? "in_progress";
    if (status !== "in_progress" && status !== "completed") return error(400, "invalid_request", "Unknown status.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const enrolled = await this.enrolled(request);
    const progress = await this.progressOf(request);
    const order = (await this.deps.store.listCourseEnrollments({ appId: this.deps.app.id, userId: request.user.id })).map((e) => e.courseId);
    const mine = order
      .map((id) => this.course(id))
      .filter((c): c is Course => c !== null)
      .filter((c) => this.progressJson(c, progress).course_completed === (status === "completed"));
    const ratings = await this.ratings();
    const items = mine.slice((page - 1) * perPage, page * perPage).map((c) => this.myCourse(c, enrolled, progress, ratings));
    return { status: 200, body: { page, per_page: perPage, total: mine.length, total_pages: Math.max(1, Math.ceil(mine.length / perPage)), items } };
  }

  private async lesson(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult> {
    if (!found) return error(404, "not_found", "Lesson not found.");
    const { course, lesson } = found;
    const enrolled = (await this.enrolled(request)).has(course.id);
    if (!enrolled && !lesson.preview) return error(403, "not_enrolled", "Enroll in the course to open this lesson.");
    const progress = await this.progressOf(request, course.id);
    const lessons = lessonsOf(course);
    const index = lessons.findIndex((l) => l.id === lesson.id);
    // 51 A video from the Media library plays from a link signed for this request; the app asks again when it expires.
    const hosted = lesson.videoUrl && this.isMedia(lesson.videoUrl) ? await this.deps.media!.resolve(lesson.videoUrl, "play") : null;
    return {
      status: 200,
      body: {
        id: lesson.id,
        course_id: course.id,
        title: lesson.title,
        render_mode: "native",
        html: lesson.text ? descriptionHtml(lesson.text) : null,
        webview_url: null,
        embeds: [],
        embed_height: null,
        ...(lesson.videoUrl && !(this.isMedia(lesson.videoUrl) && !hosted)
          ? {
              video: {
                source: hosted ? "upload" : videoSource(lesson.videoUrl),
                url: hosted ? hosted.url : lesson.videoUrl,
                expires_at: hosted ? hosted.expiresAt.toISOString() : null,
                embed_html: null,
                duration_seconds: lesson.durationMinutes ? lesson.durationMinutes * 60 : null,
                poster_url: null,
              },
            }
          : {}),
        attachments: [],
        completed: Boolean(progress.get(lesson.id)?.completedAt),
        position_seconds: progress.get(lesson.id)?.positionSeconds ?? 0,
        previous_id: lessons[index - 1]?.id ?? null,
        next_id: lessons[index + 1]?.id ?? null,
        offline: this.offline(lesson, hosted),
      },
    };
  }

  private isMedia(url: string): boolean {
    return this.deps.media?.isLink(url) === true;
  }

  // 45 Offline lessons

  /** Why a lesson can't be saved for offline viewing, or null when it can. */
  private blocker(lesson: CourseLesson): "video_site" | "disabled" | null {
    if (this.deps.downloads !== true) return "disabled";
    return lesson.videoUrl && !isVideoFile(lesson.videoUrl) && !this.isMedia(lesson.videoUrl) ? "video_site" : null;
  }

  /** `Lesson.offline`. A video file's size isn't known (it's on the owner's own server), except a Media library file's. */
  private offline(lesson: CourseLesson, hosted: ResolvedMedia | null = null) {
    const reason = this.blocker(lesson);
    return { available: reason === null, reason, size_bytes: hosted?.sizeBytes ?? null };
  }

  /** May the student open this lesson: enrolled in its course, or a free preview. */
  private async mayOpen(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson }): Promise<boolean> {
    return found.lesson.preview || (await this.enrolled(request)).has(found.course.id);
  }

  /**
   * The lesson's files: its video when it's a file (the owner's own address,
   * which the app already plays). The text comes with `GET /lessons/{id}`.
   */
  private async download(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (this.deps.downloads !== true) return error(403, "feature_disabled", "Lessons can't be saved for offline viewing in this app.");
    if (!found) return error(404, "not_found", "Lesson not found.");
    if (!(await this.mayOpen(request, found))) return error(403, "not_enrolled", "Enroll in the course to open this lesson.");
    const { course, lesson } = found;
    if (this.blocker(lesson) === "video_site") {
      return { status: 409, body: { code: "not_downloadable", message: "This lesson's video plays from a video site, so it needs the internet.", details: { reason: "video_site" } } };
    }
    // 51 A Media library video: a 15-minute link to save it, with its size and type.
    const saved = lesson.videoUrl && this.isMedia(lesson.videoUrl) ? await this.deps.media!.resolve(lesson.videoUrl, "download") : null;
    const video = saved
      ? { kind: "video", url: saved.url, source_url: null, name: saved.name, size_bytes: saved.sizeBytes, mime_type: saved.mimeType }
      : lesson.videoUrl && !this.isMedia(lesson.videoUrl)
        ? { kind: "video", url: lesson.videoUrl, source_url: null, name: null, size_bytes: null, mime_type: null }
        : null;
    return {
      status: 200,
      body: {
        lesson_id: lesson.id,
        course_id: course.id,
        files: video ? [video] : [],
        expires_at: new Date(request.now.getTime() + DOWNLOAD_LINK_MINUTES * 60_000).toISOString(),
        keep_days: DOWNLOAD_KEEP_DAYS,
      },
    };
  }

  /** Which saved lessons the student may keep: those they can still open, while downloads are on. */
  private async checkDownloads(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const ids = (request.body as { lesson_ids?: unknown } | null)?.lesson_ids;
    if (!Array.isArray(ids) || ids.length > DOWNLOAD_CHECK_MAX || !ids.every((id) => Number.isSafeInteger(id))) {
      return error(400, "invalid_request", `lesson_ids must be a list of up to ${DOWNLOAD_CHECK_MAX} lesson IDs.`);
    }
    const on = this.deps.downloads === true;
    const enrolled = await this.enrolled(request);
    const allowed: number[] = [];
    const refused: number[] = [];
    for (const id of new Set(ids as number[])) {
      const found = findLesson(this.setup, id);
      const open = on && found !== null && found.course.active && (found.lesson.preview || enrolled.has(found.course.id));
      (open ? allowed : refused).push(id);
    }
    return { status: 200, body: { allowed, refused, downloads: on, keep_days: DOWNLOAD_KEEP_DAYS } };
  }

  private async mayLearn(request: ConnectorRequest, course: Course): Promise<boolean> {
    return (await this.enrolled(request)).has(course.id);
  }

  private async progress(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!found || !(await this.mayLearn(request, found.course))) return error(403, "not_enrolled", "Enroll in the course to save your progress.");
    const body = (request.body ?? {}) as Record<string, unknown>;
    const position = Number(body.position_seconds);
    if (!Number.isInteger(position) || position < 0) return error(400, "invalid_request", "position_seconds must be a whole number.");
    await this.deps.store.saveLessonProgress({
      appId: this.deps.app.id,
      userId: request.user.id,
      courseId: found.course.id,
      lessonId: found.lesson.id,
      positionSeconds: position,
      completedAt: null,
      updatedAt: request.now,
    });
    return { status: 204 };
  }

  private async complete(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!found || !(await this.mayLearn(request, found.course))) return error(403, "not_enrolled", "Enroll in the course to complete lessons.");
    const saved = (await this.progressOf(request, found.course.id)).get(found.lesson.id);
    await this.deps.store.saveLessonProgress({
      appId: this.deps.app.id,
      userId: request.user.id,
      courseId: found.course.id,
      lessonId: found.lesson.id,
      positionSeconds: saved?.positionSeconds ?? 0,
      completedAt: request.now,
      updatedAt: request.now,
    });
    return { status: 200, body: this.progressJson(found.course, await this.progressOf(request, found.course.id)) };
  }

  // 63 Reviews and questions

  private person(user: HostedUser | null | undefined) {
    return { name: user?.name ?? "", avatar_url: null, instructor: false };
  }

  /** The business, as the app shows it under its answers. */
  private business(course: Course | null) {
    return { name: course?.instructorName ?? this.deps.app.appName ?? "Instructor", avatar_url: null, instructor: true };
  }

  private async users(ids: number[]): Promise<Map<number, HostedUser | null>> {
    const out = new Map<number, HostedUser | null>();
    for (const id of new Set(ids)) out.set(id, await this.deps.store.getHostedUser(this.deps.app.id, id));
    return out;
  }

  private reviewJson(r: CourseReview, user: HostedUser | null | undefined, mine: boolean) {
    return {
      id: r.id,
      rating: r.rating,
      text: r.text,
      author: this.person(user),
      created_at: r.createdAt.toISOString(),
      // Hidden reviews reach their author only.
      status: r.hidden ? "hidden" : "approved",
      mine,
      reply: r.replyText ? { text: r.replyText, created_at: (r.replyAt ?? r.updatedAt).toISOString() } : null,
    };
  }

  private async reviews(request: ConnectorRequest, c: Course): Promise<ConnectorResult> {
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 10, 100);
    const { store, app } = this.deps;
    const { items, total } = await store.listCourseReviews({ appId: app.id, courseIds: [c.id], hidden: false, offset: (page - 1) * perPage, limit: perPage });
    const users = await this.users(items.map((r) => r.userId));
    const own = request.user ? await store.getCourseReviewOf(app.id, c.id, request.user.id) : null;
    const rated = ratingSummary(await this.ratings(), c.id);
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
        items: items.map((r) => this.reviewJson(r, users.get(r.userId), r.userId === request.user?.id)),
        summary: { rating: rated.rating, rating_count: rated.count, counts: Object.fromEntries(Object.entries(rated.counts).map(([star, n]) => [star, n])) },
        mine: own ? this.reviewJson(own, request.user, true) : null,
        can_review: request.user !== null && (await this.enrolled(request)).has(c.id),
      },
    };
  }

  private async saveReview(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!c) return noCourse();
    if (!(await this.enrolled(request)).has(c.id)) return error(403, "not_enrolled", "Enroll in the course to review it.");
    const read = readReview(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const wait = await this.limited(request, REVIEW_LIMIT);
    if (wait) return wait;
    const { store, app } = this.deps;
    const before = await store.getCourseReviewOf(app.id, c.id, request.user.id);
    const review = await store.saveCourseReview({ appId: app.id, courseId: c.id, userId: request.user.id, rating: read.rating, text: read.text, now: request.now });
    if (!before) await this.tell(() => this.deps.onReview?.({ review, course: c, user: request.user! }));
    return { status: 200, body: this.reviewJson(review, request.user, true) };
  }

  /** Students in the course ask and answer; others are refused. */
  private async mayTalk(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult | null> {
    if (!request.user) return signIn();
    if (!c) return noCourse();
    return (await this.enrolled(request)).has(c.id) ? null : error(403, "not_enrolled", "Enroll in the course to see and ask questions.");
  }

  private async limited(request: ConnectorRequest, rule: RateLimitRule = QUESTION_LIMIT): Promise<ConnectorResult | null> {
    const result = await hitRateLimit(this.deps.store, rule, `${this.deps.app.id}:${request.user!.id}`, request.now);
    if (result.allowed) return null;
    return { status: 429, body: { code: "rate_limited", message: "You've written a lot in a short time. Please try again later.", retry_after_seconds: result.retryAfter } };
  }

  private questionJson(q: CourseQuestion, user: HostedUser | null | undefined, mine: boolean) {
    // 64 A hidden question reaches its author only, who is told.
    return { id: q.id, course_id: q.courseId, text: q.text, author: this.person(user), created_at: q.createdAt.toISOString(), answer_count: q.answerCount, mine, hidden: q.hidden };
  }

  private async questions(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    const refused = await this.mayTalk(request, c);
    if (refused) return refused;
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const { items, total } = await this.deps.store.listCourseQuestions({
      appId: this.deps.app.id,
      courseIds: [c!.id],
      viewerId: request.user!.id,
      order: "created",
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    const users = await this.users(items.map((q) => q.userId));
    return {
      status: 200,
      body: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), items: items.map((q) => this.questionJson(q, users.get(q.userId), q.userId === request.user!.id)) },
    };
  }

  private async ask(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    const refused = await this.mayTalk(request, c);
    if (refused) return refused;
    const read = readCommunityText((request.body as { text?: unknown } | null)?.text, "Write your question.");
    if (!read.ok) return error(400, "invalid_request", read.error);
    const wait = await this.limited(request);
    if (wait) return wait;
    const question = await this.deps.store.createCourseQuestion({
      appId: this.deps.app.id,
      courseId: c!.id,
      userId: request.user!.id,
      text: read.text,
      status: "open",
      createdAt: request.now,
      updatedAt: request.now,
    });
    await this.tell(() => this.deps.onQuestion?.({ question, course: c!, user: request.user!, text: read.text, followUp: false }));
    return { status: 201, body: this.questionJson(question, request.user, true) };
  }

  /** The question of this app whose course is still open to the student, or the refusal. */
  private async ownQuestion(request: ConnectorRequest, id: number): Promise<{ question: CourseQuestion; course: Course } | ConnectorResult> {
    if (!request.user) return signIn();
    const question = Number.isSafeInteger(id) ? await this.deps.store.getCourseQuestion(this.deps.app.id, id) : null;
    const course = question ? this.course(question.courseId) : null;
    // 64 A question the business hid is its author's only.
    if (!question || !course || (question.hidden && question.userId !== request.user.id)) return error(404, "not_found", "Question not found.");
    const refused = await this.mayTalk(request, course);
    return refused ?? { question, course };
  }

  private async thread(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.ownQuestion(request, id);
    if ("status" in found) return found;
    const { question, course } = found;
    // 64 Hidden answers reach their author only.
    const answers = answersFor(await this.deps.store.listCourseAnswers(this.deps.app.id, question.id), request.user!.id);
    const users = await this.users([question.userId, ...answers.flatMap((a) => (a.userId === null ? [] : [a.userId]))]);
    return {
      status: 200,
      body: {
        ...this.questionJson(question, users.get(question.userId), question.userId === request.user!.id),
        answers: answers.map((a) => ({
          id: a.id,
          text: a.text,
          author: a.userId === null ? this.business(course) : this.person(users.get(a.userId)),
          created_at: a.createdAt.toISOString(),
          mine: a.userId === request.user!.id,
          hidden: a.hidden,
        })),
      },
    };
  }

  private async reply(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.ownQuestion(request, id);
    if ("status" in found) return found;
    const read = readCommunityText((request.body as { text?: unknown } | null)?.text, "Write your answer.");
    if (!read.ok) return error(400, "invalid_request", read.error);
    const wait = await this.limited(request);
    if (wait) return wait;
    const { question, course } = found;
    // A student writing again: the question waits for the business again.
    const answer = await this.deps.store.addCourseAnswer({ appId: this.deps.app.id, questionId: question.id, userId: request.user!.id, text: read.text, createdAt: request.now }, "open");
    // 64 A question the business hid isn't pushed to its phones again.
    if (!question.hidden) await this.tell(() => this.deps.onQuestion?.({ question, course, user: request.user!, text: read.text, followUp: true }));
    return { status: 201, body: { id: answer.id, text: answer.text, author: this.person(request.user), created_at: answer.createdAt.toISOString(), mine: true, hidden: false } };
  }

  /** The business hears of it; a failure never fails what the student did. */
  private async tell(run: () => Promise<void> | undefined): Promise<void> {
    try {
      await run();
    } catch (failure) {
      console.error("[courses] couldn't tell the business", failure instanceof Error ? failure.message : String(failure));
    }
  }

  /** Android only: an order for a paid course, paid on the payment page; paying enrols the student. */
  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android") return error(403, "purchase_not_allowed", "Courses can't be bought in the iPhone app.");
    const course = this.course(Number((request.body as { course_id?: unknown } | null)?.course_id));
    if (!course) return noCourse();
    if (course.priceCents === 0) return error(403, "feature_disabled", "This course is free: enroll in the app.");
    if (!this.canSell) return error(403, "feature_disabled", "This course can't be bought right now.");
    if ((await this.enrolled(request)).has(course.id)) return error(403, "feature_disabled", "You're already enrolled in this course.");
    const token = randomToken(24);
    await this.deps.store.createCatalogOrder({
      appId: this.deps.app.id,
      tokenHash: sha256Hex(token),
      userId: request.user.id,
      status: "pending",
      lines: [{ productId: course.id, name: course.title, quantity: 1, unitCents: course.priceCents, imageAssetId: course.imageAssetId, digital: true }],
      subtotalCents: course.priceCents,
      shippingCents: 0,
      totalCents: course.priceCents,
      currency: this.setup.currency,
      customer: null,
      paymentId: null,
      createdAt: request.now,
      paidAt: null,
      updatedAt: request.now,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    return {
      status: 200,
      body: { url: payUrl(this.deps.platformUrl, token), expires_at: new Date(request.now.getTime() + PAY_LINK_MINUTES * 60_000).toISOString(), open_in: "in_app" },
    };
  }
}
