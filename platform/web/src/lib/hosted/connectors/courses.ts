import { centsToDecimal, formatCents } from "../../catalog/money";
import { PAY_LINK_MINUTES, paymentsSetUp } from "../../catalog/settings";
import { DOWNLOAD_CHECK_MAX, DOWNLOAD_KEEP_DAYS, DOWNLOAD_LINK_MINUTES, isVideoFile } from "../../courses/downloads";
import { findLesson, lessonsOf, courseSetup, videoSource } from "../../courses/setup";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import type { App, Course, CourseLesson, CourseSetup, LessonProgress } from "../../data/types";
import { descriptionHtml, payUrl } from "./catalog";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

interface CoursesDeps {
  store: DataStore;
  app: App;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  /** 13.1 Card payments in the app are in the app's plan (default true); without them paid courses show no purchase action. */
  cardPayments?: boolean;
  /** 45 Lessons may be saved for offline viewing: offline mode in the plan and the owner's choice (default false). */
  downloads?: boolean;
}

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
        reviews: false,
        qna: false,
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
      if (request.method === "GET" && request.path.length === 2) return course ? this.detail(request, course) : noCourse();
      if (request.method === "GET" && third === "curriculum" && request.path.length === 3) return course ? this.curriculum(request, course) : noCourse();
      if (request.method === "POST" && third === "enroll" && request.path.length === 3) return this.enroll(request, course);
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

  private summary(c: Course, enrolled: Set<number>) {
    return {
      id: c.id,
      title: c.title,
      image_url: c.imageAssetId ? this.deps.assetUrl(c.imageAssetId) : null,
      instructor: { id: 0, name: c.instructorName ?? this.deps.app.appName ?? "Instructor", avatar_url: null, bio: null },
      price: this.price(c),
      lesson_count: lessonsOf(c).length,
      rating: null,
      rating_count: 0,
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

  private myCourse(c: Course, enrolled: Set<number>, progress: Map<number, LessonProgress>) {
    const next = lessonsOf(c).find((l) => !progress.get(l.id)?.completedAt);
    return {
      course: this.summary(c, enrolled),
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
    if (request.user && enrolled.size) {
      const progress = await this.progressOf(request);
      const current = this.active().find((c) => enrolled.has(c.id) && !this.progressJson(c, progress).course_completed);
      if (current) sections.push({ type: "continue_learning", title: "Continue learning", course: this.myCourse(current, enrolled, progress) });
    }
    const categories = this.categories();
    if (categories.length) sections.push({ type: "categories", title: "Categories", categories });
    const latest = [...this.active()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
    if (latest.length) sections.push({ type: "latest_courses", title: "Latest courses", courses: latest.map((c) => this.summary(c, enrolled)) });
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
    const items = all.slice((page - 1) * perPage, page * perPage).map((c) => this.summary(c, enrolled));
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
        ...this.summary(c, enrolled),
        description_html: descriptionHtml(c.description),
        duration_minutes: minutes || null,
        level: c.level,
        has_certificate: false,
        qna: false,
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
    const items = mine.slice((page - 1) * perPage, page * perPage).map((c) => this.myCourse(c, enrolled, progress));
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
        ...(lesson.videoUrl
          ? {
              video: {
                source: videoSource(lesson.videoUrl),
                url: lesson.videoUrl,
                expires_at: null,
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
        offline: this.offline(lesson),
      },
    };
  }

  // 45 Offline lessons

  /** Why a lesson can't be saved for offline viewing, or null when it can. */
  private blocker(lesson: CourseLesson): "video_site" | "disabled" | null {
    if (this.deps.downloads !== true) return "disabled";
    return lesson.videoUrl && !isVideoFile(lesson.videoUrl) ? "video_site" : null;
  }

  /** `Lesson.offline`. A video file's size isn't known: it's on the owner's own server. */
  private offline(lesson: CourseLesson) {
    const reason = this.blocker(lesson);
    return { available: reason === null, reason, size_bytes: null };
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
    return {
      status: 200,
      body: {
        lesson_id: lesson.id,
        course_id: course.id,
        files: lesson.videoUrl ? [{ kind: "video", url: lesson.videoUrl, source_url: null, name: null, size_bytes: null, mime_type: null }] : [],
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
