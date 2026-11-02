import { centsToDecimal, formatCents } from "../../catalog/money";
import { couponDiscount, normalizeCouponCode } from "../../catalog/coupons";
import { PAY_LINK_MINUTES, paymentsSetUp } from "../../catalog/settings";
import { DOWNLOAD_CHECK_MAX, DOWNLOAD_KEEP_DAYS, DOWNLOAD_LINK_MINUTES, isVideoFile } from "../../courses/downloads";
import { findLesson, lessonsOf, courseSetup, videoSource } from "../../courses/setup";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import { bundleCourses, compareAtCents, orderBundle, shownBundles } from "../../courses/bundles";
import type { App, AssignmentSubmission, CatalogOrderLine, Course, CourseBundle, CourseAssignment, CourseCohort, CourseLesson, CourseLiveSession, CourseQuestion, CourseQuiz, CourseReview, CourseSetup, HostedUser, LessonNote, LessonProgress, QuizAttempt, Teacher } from "../../data/types";
import { appZone } from "../../analytics/zone";
import { utcToLocal } from "../../bookings/time";
import { badgesOf, classLearners, coursePoints, learningDays, LEADERBOARD_TOP, leaderboard, streaks, earnedIn } from "../../courses/gamification";
import { attemptsOf, maySubmit, rubricJson, rubricResult } from "../../courses/grading";
import { NOTE_LIMIT, NOTES_PER_LESSON, readNote } from "../../courses/notes";
import { activePaths, missingCourses } from "../../courses/paths";
import { isTeachersApp, teacherOf } from "../../teachers/service";
import {
  accessEndsAt,
  answeredRight,
  attemptEndsAt,
  EXAM_GRACE_SECONDS,
  examStatus,
  resultsHidden,
  assignmentDone,
  assignmentDueAt,
  assignmentsOf,
  certificateCode,
  certificateUrl,
  courseItems,
  courseProgress,
  findAssignment,
  findLiveSession,
  findQuiz,
  itemCounts,
  itemDone,
  lessonOpensAt,
  liveJoinOpen,
  liveSessionsOf,
  liveStatus,
  quizzesOf,
  scoreQuiz,
  attemptQuestions,
  quizQuestionCount,
  shuffled,
  topicItems,
  waitingForPrevious,
  type Learner,
  type TopicItem,
} from "../../courses/learning";
import { completeUpload, kindOf, MEDIA_KINDS, mediaLink, startUpload, uploadUrl } from "../../media/files";
import type { MediaStorage } from "../../media/storage";
import { signingSecret } from "../../env";
import { answersFor, QUESTION_LIMIT, ratingSummary, readCommunityText, readReview, REVIEW_LIMIT } from "../../courses/community";
import type { RateLimitRule } from "../../rate-limit";
import { hitRateLimit } from "../../rate-limit";
import { descriptionHtml, myOrdersRoute, payUrl } from "./catalog";
import { error, intParam } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";
import type { ResolvedMedia } from "../../media/files";
import { productIdFor } from "../../store-billing/products";
import { readyIn } from "../../store-billing/hosted";

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
  /** 100.3 Paid courses are bought through Google Play and the App Store (the app sells in the app); no payment page then. */
  storeBilling?: boolean;
  /** 51 Videos from the Media library; without it, a Yallapp link is a plain address. */
  media?: CoursesMedia;
  /** 63 Tells the business of a question, or a student writing again under one (a push to its phones); failures don't fail it. */
  onQuestion?: (input: { question: CourseQuestion; course: Course; user: HostedUser; text: string; followUp: boolean }) => Promise<void>;
  /** 63 Tells the business of a new review. */
  onReview?: (input: { review: CourseReview; course: Course; user: HostedUser }) => Promise<void>;
  /** 90.1 Signs certificate codes; read from the environment when left out. */
  signingSecret?: string;
  /** 105.3 A student asked (or wrote again) in a teacher's course: the teacher hears of it. */
  onTeacherQuestion?: (input: { teacher: Teacher; question: CourseQuestion; course: Course; text: string }) => Promise<void>;
  /** 105.3 A teacher answered: the student hears of it. */
  onTeacherAnswer?: (input: { teacher: Teacher; question: CourseQuestion; course: Course; text: string }) => Promise<void>;
  /** 112.5 Files students hand in for assignments, into the app's Media library; without it they hand in text only. */
  uploads?: { storage: MediaStorage; chunkBytes: number; limitBytes: () => Promise<number | null> };
}

type Ratings = { courseId: number; rating: number; count: number }[];

/** 73 Students may start a finished course again unless the owner turned it off for the course. */
export const canRestart = (course: Pick<Course, "canRestart">): boolean => course.canRestart !== false;

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const noCourse = () => error(404, "not_found", "Course not found.");
const notYet = () => error(403, "previous_not_done", "Finish what comes before it in the course first.");
/** 113.7 */
const prerequisites = () => error(403, "prerequisites_not_met", "Finish the courses this one needs first.");
const noGamification = () => error(403, "feature_disabled", "Points and badges aren't on in this app.");
/** 112.5 Assignment files: a photo or a PDF. */
const ASSIGNMENT_KINDS = MEDIA_KINDS.filter((k) => k.kind === "image" || k.kind === "pdf");
const UPLOAD_LIMIT: RateLimitRule = { name: "course_upload", limit: 60, windowSeconds: 3600 };
const SUBMIT_LIMIT: RateLimitRule = { name: "course_submit", limit: 60, windowSeconds: 3600 };
/** 112.5 Coupons tried: a few an hour, so codes can't be guessed. */
const COUPON_LIMIT: RateLimitRule = { name: "course_coupon", limit: 20, windowSeconds: 3600 };
/** 113.1 The payment ID of an order a coupon made free: nothing was charged. */
export const FREE_COUPON_PAYMENT_ID = "coupon";
const noBundle = () => error(404, "not_found", "Bundle not found.");

/** 113.1 What a checkout or a coupon is for: a course, or a bundle with its published courses. */
type Sale = { kind: "course"; course: Course } | { kind: "bundle"; bundle: CourseBundle; courses: Course[] };
const priceOf = (sale: Sale) => (sale.kind === "course" ? sale.course.priceCents : sale.bundle.priceCents);

/**
 * Courses managed in the Yallapp dashboard, served like the plugin's LMS
 * endpoints: courses, topics and lessons from the app's course setup,
 * enrolments and progress from their tables. Free courses are enrolled in
 * from the app; paid ones are bought on Android on the payment page (never
 * on iOS), with the shop's card payment settings.
 */
export class CoursesConnector implements Connector {
  private readonly setup: CourseSetup;
  /** 112.5 The student's cohort in each course they're in (read with their enrolments). */
  private cohortIds = new Map<number, number | null>();
  /** 105.3 The academy's teachers by ID, read once per request in an academy with many teachers. */
  private teachers = new Map<number, Teacher>();

  constructor(private readonly deps: CoursesDeps) {
    this.setup = courseSetup(deps.app);
  }

  private get canSell(): boolean {
    // 16 A demo academy "sells" on its payment page, which charges nothing.
    // 100.3 Not when the stores sell the courses.
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false && this.deps.storeBilling !== true;
  }

  /** 100.3 The store product that sells the course on this platform, when it's ready there. */
  private async storeProduct(c: Course, platform: string | null): Promise<string | null> {
    if (this.deps.storeBilling !== true || (platform !== "android" && platform !== "ios")) return null;
    const product = await this.deps.store.getStoreProduct(this.deps.app.id, productIdFor("course", c.id));
    return product && readyIn(product, platform) ? product.productId : null;
  }

  async config() {
    return {
      features: {
        lms: "yallapp",
        lms_version: "1",
        pro: false,
        // 90.1 Quizzes and certificates of courses managed in Yallapp.
        certificates: this.setup.courses.some((c) => c.active && c.certificate === true),
        quizzes: this.setup.courses.some((c) => c.active && quizzesOf(c).length > 0),
        // 112.5 Assignments and live classes.
        assignments: this.setup.courses.some((c) => c.active && assignmentsOf(c).length > 0),
        live_classes: this.setup.courses.some((c) => c.active && liveSessionsOf(c).length > 0),
        wishlist: false,
        // 63 Reviews and questions, answered from the dashboard and Yallapp Business.
        reviews: true,
        qna: true,
        downloads: this.deps.downloads === true,
        // 96.3 The student's course orders, with their receipts (the app shows them on Android, where courses are sold).
        orders: true,
        // 113.7 Learning paths, points and badges (the academy's choice), notes and bookmarks, the lessons' discussions.
        learning_paths: activePaths(this.setup, (c) => c.active && !c.teacherStage).length > 0,
        gamification: this.setup.gamification === true,
        notes: true,
        lesson_discussion: true,
        // 113.1 Course bundles shown in the app.
        bundles: shownBundles(this.setup).length > 0,
      },
      purchases: { enroll_button: this.canSell, free_enrollment: true },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    await this.loadTeachers();
    const mine = myOrdersRoute(this.deps, request);
    if (mine) return mine;
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
        return this.certificates(request);
      case "GET /me/quiz-attempts":
        return this.myAttempts(request);
      case "POST /auth/checkout-link":
        return this.checkoutLink(request);
      case "POST /me/downloads/check":
        return this.checkDownloads(request);
      // 112.5
      case "GET /me/live-sessions":
        return this.myLiveSessions(request);
      case "POST /course-uploads":
        return this.startCourseUpload(request);
      // 113.7
      case "GET /learning-paths":
        return this.paths(request);
      case "GET /me/achievements":
        return this.achievements(request);
      // 113.1
      case "GET /bundles":
        return this.bundles(request);
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
      // 112.5 A coupon for a paid course, checked before buying it.
      if (request.method === "POST" && third === "coupon" && request.path.length === 3) return course ? this.checkCoupon(request, { kind: "course", course }) : noCourse();
      // 73 Start a finished course again.
      if (request.method === "POST" && third === "restart" && request.path.length === 3) return this.restart(request, course);
      // 113.7 The course's leaderboard, and the student's notes in it.
      if (request.method === "GET" && third === "leaderboard" && request.path.length === 3) return this.courseLeaderboard(request, course);
      if (request.method === "GET" && third === "notes" && request.path.length === 3) return this.courseNotes(request, course);
    }
    // 113.1 A bundle, and a coupon for it.
    if (first === "bundles" && second) {
      const bundle = this.bundle(Number(second));
      if (request.method === "GET" && request.path.length === 2) return bundle ? this.bundleDetail(request, bundle) : noBundle();
      if (request.method === "POST" && third === "coupon" && request.path.length === 3) return bundle ? this.checkCoupon(request, this.bundleSale(bundle)) : noBundle();
    }
    if (first === "questions" && second) {
      if (request.method === "GET" && request.path.length === 2) return this.thread(request, Number(second));
      if (request.method === "POST" && third === "answers" && request.path.length === 3) return this.reply(request, Number(second));
      // 113.7 Pinned, or deleted by the course's teacher (or its author).
      if (request.method === "DELETE" && request.path.length === 2) return this.deleteQuestion(request, Number(second));
      if (request.method === "PUT" && third === "pin" && request.path.length === 3) return this.pin(request, Number(second));
      if (request.method === "DELETE" && third === "answers" && request.path.length === 4) return this.deleteAnswer(request, Number(second), Number(request.path[3]));
    }
    // 113.7 Learning paths and notes.
    if (first === "learning-paths" && second && request.method === "GET" && request.path.length === 2) return this.path(request, Number(second));
    if (first === "notes" && second && request.path.length === 2) {
      if (request.method === "PATCH") return this.editNote(request, Number(second));
      if (request.method === "DELETE") return this.removeNote(request, Number(second));
    }
    // 90.1 Quizzes.
    if (first === "quizzes" && second) {
      const found = findQuiz(this.setup, Number(second));
      const ok = found && found.course.active ? found : null;
      if (request.method === "GET" && request.path.length === 2) return this.quiz(request, ok);
      if (request.method === "POST" && third === "attempts" && request.path.length === 3) return this.startAttempt(request, ok);
      if (request.method === "POST" && third === "attempts" && request.path[4] === "submit" && request.path.length === 5) return this.submitAttempt(request, ok, Number(request.path[3]));
    }
    // 112.5 Assignments, their files and live classes.
    if (first === "assignments" && second) {
      const found = findAssignment(this.setup, Number(second));
      const ok = found && found.course.active && !found.course.teacherStage ? found : null;
      if (request.method === "GET" && request.path.length === 2) return this.assignment(request, ok);
      if (request.method === "PUT" && third === "submission" && request.path.length === 3) return this.submitAssignment(request, ok);
    }
    if (first === "course-uploads" && second && request.method === "POST" && request.path.length === 3 && (third === "resume" || third === "complete")) return this.courseUpload(request, second, third);
    if (first === "live-sessions" && second && request.method === "GET" && request.path.length === 2) {
      const found = findLiveSession(this.setup, Number(second));
      return this.liveSession(request, found && found.course.active && !found.course.teacherStage ? found : null);
    }
    if (first === "lessons" && second) {
      const found = findLesson(this.setup, Number(second));
      const ok = found && found.course.active ? found : null;
      if (request.method === "GET" && request.path.length === 2) return this.lesson(request, ok);
      if (request.method === "PUT" && third === "progress" && request.path.length === 3) return this.progress(request, ok);
      if (request.method === "POST" && third === "complete" && request.path.length === 3) return this.complete(request, ok);
      if (request.method === "POST" && third === "download" && request.path.length === 3) return this.download(request, ok);
      // 113.7 The student's notes and bookmark.
      if (request.method === "GET" && third === "notes" && request.path.length === 3) return this.lessonNotes(request, ok);
      if (request.method === "POST" && third === "notes" && request.path.length === 3) return this.addNote(request, ok);
      if ((request.method === "PUT" || request.method === "DELETE") && third === "bookmark" && request.path.length === 3) return this.bookmark(request, ok, request.method === "PUT");
    }
    return null;
  }

  // Data

  /** Published courses: 105.3 a teacher's once the academy published it. */
  private active(): Course[] {
    return this.setup.courses.filter((c) => c.active && !c.teacherStage);
  }

  /** 105.3 The academy's teachers, for the courses' teacher. */
  async loadTeachers(): Promise<void> {
    if (!isTeachersApp(this.deps.app)) return;
    this.teachers = new Map((await this.deps.store.listTeachers(this.deps.app.id)).map((t) => [t.id, t]));
  }

  /** 105.3 The course's teacher, while they are one of the academy's. */
  private teacherOfCourse(c: Pick<Course, "teacherId">): Teacher | null {
    return c.teacherId ? (this.teachers.get(c.teacherId) ?? null) : null;
  }

  /** 105.3 Course summaries for a teacher's page (`GET /teachers/{id}`). */
  async summariesFor(request: ConnectorRequest, courses: Course[]) {
    if (this.teachers.size === 0) await this.loadTeachers();
    const enrolled = await this.enrolled(request);
    const ratings = await this.ratings();
    return courses.map((c) => this.summary(c, enrolled, ratings));
  }

  private course(id: number): Course | null {
    return Number.isSafeInteger(id) ? (this.active().find((c) => c.id === id) ?? null) : null;
  }

  private async enrolled(request: ConnectorRequest): Promise<Set<number>> {
    return new Set((await this.enrollments(request)).keys());
  }

  /** 90.1 When the student enrolled in each course. */
  private async enrollments(request: ConnectorRequest): Promise<Map<number, Date>> {
    if (!request.user) return new Map();
    const rows = await this.deps.store.listCourseEnrollments({ appId: this.deps.app.id, userId: request.user.id });
    // 112.5 Each course's cohort, for when the student's learning starts.
    this.cohortIds = new Map(rows.map((e) => [e.courseId, e.cohortId ?? null]));
    return new Map(rows.map((e) => [e.courseId, e.enrolledAt]));
  }

  /** 90.1 The student's quiz attempts. */
  private async attemptsOf(request: ConnectorRequest, courseId?: number): Promise<QuizAttempt[]> {
    if (!request.user) return [];
    return this.deps.store.listQuizAttempts({ appId: this.deps.app.id, userId: request.user.id, courseId });
  }

  /** 112.5 The student's assignment submissions. */
  private async submissionsOf(request: ConnectorRequest, courseId?: number): Promise<AssignmentSubmission[]> {
    if (!request.user) return [];
    return this.deps.store.listAssignmentSubmissions({ appId: this.deps.app.id, userId: request.user.id, courseId });
  }

  /** 112.5 Where the student is in a course (or every course). */
  private async learnerOf(request: ConnectorRequest, courseId?: number): Promise<Learner> {
    const [progress, attempts, submissions] = await Promise.all([this.progressOf(request, courseId), this.attemptsOf(request, courseId), this.submissionsOf(request, courseId)]);
    return { progress, attempts: this.visible(attempts, request.now), submissions };
  }

  /** 113.7 An exam's results wait for it to close: until then its attempts count as neither passed nor scored. */
  private visible(attempts: QuizAttempt[], now: Date): QuizAttempt[] {
    return attempts.map((a) => {
      const quiz = findQuiz(this.setup, a.quizId)?.quiz;
      return quiz && a.submittedAt && resultsHidden(quiz, now) ? { ...a, passed: null, scorePercent: null } : a;
    });
  }

  /** 113.7 The courses the student finished (by each course's rules). */
  private finished(learner: Learner, enrolled: Set<number>): Set<number> {
    return new Set(this.active().filter((c) => enrolled.has(c.id) && this.progressJson(c, learner).course_completed).map((c) => c.id));
  }

  /** 113.7 The courses to finish before this one that the student hasn't. */
  private async missing(request: ConnectorRequest, c: Course): Promise<Course[]> {
    const required = missingCourses(this.setup, c.id, new Set());
    if (required.length === 0) return [];
    const done = request.user ? this.finished(await this.learnerOf(request), await this.enrolled(request)) : new Set<number>();
    return required.filter((id) => !done.has(id)).map((id) => this.setup.courses.find((x) => x.id === id)!);
  }

  /** 112.5 The learner's part in one course. */
  private only(learner: Learner, courseId: number): Learner {
    return { progress: learner.progress, attempts: learner.attempts.filter((a) => a.courseId === courseId), submissions: (learner.submissions ?? []).filter((s) => s.courseId === courseId) };
  }

  /** 112.5 The student's cohort in the course, while the course still has it. */
  private cohortOf(course: Course): CourseCohort | null {
    const id = this.cohortIds.get(course.id);
    return id ? ((course.cohorts ?? []).find((c) => c.id === id) ?? null) : null;
  }

  /** 112.5 When the student's learning starts: their cohort's start, else when they enrolled (drip days and due dates count from it). */
  private startOf(course: Course, enrolledAt: Date): Date {
    const cohort = this.cohortOf(course);
    return cohort ? new Date(cohort.startsAt) : enrolledAt;
  }

  /** 112.5 A cohort that hasn't started yet: the course opens to its students on its first day. */
  private notStarted(course: Course, enrolledAt: Date, now: Date): ConnectorResult | null {
    const start = this.startOf(course, enrolledAt);
    return start.getTime() > now.getTime() ? error(403, "not_available_yet", `This course starts on ${start.toISOString().slice(0, 10)}.`) : null;
  }

  /** 90.1 Whether the student's access to the course has ended. */
  private ended(course: Course, enrolledAt: Date | undefined, now: Date): boolean {
    const ends = enrolledAt ? accessEndsAt(course, enrolledAt) : null;
    return ends !== null && ends.getTime() <= now.getTime();
  }

  private certificateFor(request: ConnectorRequest, c: Course, completed: boolean): string | null {
    if (!request.user || !completed || c.certificate !== true) return null;
    const code = certificateCode(this.deps.signingSecret ?? signingSecret(), this.deps.app.id, request.user.id, c.id);
    return certificateUrl(this.deps.platformUrl, this.deps.app.id, code);
  }

  private async progressOf(request: ConnectorRequest, courseId?: number): Promise<Map<number, LessonProgress>> {
    if (!request.user) return new Map();
    const rows = await this.deps.store.listLessonProgress({ appId: this.deps.app.id, userId: request.user.id, courseId });
    return new Map(rows.map((p) => [p.lessonId, p]));
  }

  // Mapping

  private price(c: Pick<Course, "priceCents">) {
    if (c.priceCents === 0) return { is_free: true, amount: null, sale_amount: null, currency: null, formatted: null };
    const { currency } = this.setup;
    return { is_free: false, amount: centsToDecimal(c.priceCents), sale_amount: null, currency, formatted: formatCents(c.priceCents, currency) };
  }

  // 113.1 Bundles

  /** A bundle the app shows. */
  private bundle(id: number): CourseBundle | null {
    return Number.isSafeInteger(id) ? (shownBundles(this.setup).find((b) => b.id === id) ?? null) : null;
  }

  private bundleSale(bundle: CourseBundle): Sale {
    return { kind: "bundle", bundle, courses: bundleCourses(this.setup, bundle) };
  }

  /** `Bundle`: its price, and what its courses cost on their own ("compare at", when more). */
  private bundleJson(bundle: CourseBundle, enrolled: Set<number>) {
    const courses = bundleCourses(this.setup, bundle);
    const compare = compareAtCents(courses);
    const owned = courses.filter((c) => enrolled.has(c.id)).length;
    return {
      id: bundle.id,
      title: bundle.title,
      image_url: bundle.imageAssetId ? this.deps.assetUrl(bundle.imageAssetId) : null,
      course_count: courses.length,
      price: this.price(bundle),
      compare_at: compare > bundle.priceCents ? this.price({ priceCents: compare }) : null,
      owned_count: owned,
      owned: owned === courses.length,
    };
  }

  /** 100.3 The store product that sells the bundle on this platform, when it's ready there. */
  private async bundleStoreProduct(bundle: CourseBundle, platform: string | null): Promise<string | null> {
    if (this.deps.storeBilling !== true || (platform !== "android" && platform !== "ios")) return null;
    const product = await this.deps.store.getStoreProduct(this.deps.app.id, productIdFor("bundle", bundle.id));
    return product && readyIn(product, platform) ? product.productId : null;
  }

  /** The shown bundles that hold a course (`CourseDetail.bundles`). */
  private bundlesWith(courseId: number, enrolled: Set<number>) {
    return shownBundles(this.setup)
      .filter((b) => bundleCourses(this.setup, b).some((c) => c.id === courseId))
      .map((b) => this.bundleJson(b, enrolled));
  }

  private async bundles(request: ConnectorRequest): Promise<ConnectorResult> {
    const enrolled = await this.enrolled(request);
    return { status: 200, body: { items: shownBundles(this.setup).map((b) => this.bundleJson(b, enrolled)) } };
  }

  private async bundleDetail(request: ConnectorRequest, bundle: CourseBundle): Promise<ConnectorResult> {
    const enrolled = await this.enrolled(request);
    const json = this.bundleJson(bundle, enrolled);
    const ios = request.query.get("platform") === "ios";
    const storeProduct = json.owned ? null : await this.bundleStoreProduct(bundle, request.query.get("platform"));
    // Like a course's: bought in the store, else on the academy's payment page (Android only).
    const action = json.owned ? "owned" : storeProduct ? "store" : !ios && this.canSell ? "checkout" : "none";
    const ratings = await this.ratings();
    return {
      status: 200,
      body: {
        ...json,
        description_html: descriptionHtml(bundle.description),
        courses: bundleCourses(this.setup, bundle).map((c) => this.summary(c, enrolled, ratings)),
        purchase: { action, store_product_id: storeProduct, ...(action === "checkout" ? { coupons: (await this.deps.store.listCatalogCoupons(this.deps.app.id)).some((c) => c.active) } : {}) },
      },
    };
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
      instructor: this.instructor(c),
      price: this.price(c),
      lesson_count: lessonsOf(c).length,
      rating: rated.rating,
      rating_count: rated.count,
      enrolled: enrolled.has(c.id),
      wishlisted: false,
    };
  }

  /** The course's teacher (105.3 one of the academy's, with their ID), else the academy. */
  private instructor(c: Course) {
    const teacher = this.teacherOfCourse(c);
    if (teacher) return { id: teacher.id, name: teacher.name, avatar_url: teacher.photoAssetId ? this.deps.assetUrl(teacher.photoAssetId) : null, bio: teacher.bio || null };
    return { id: 0, name: c.instructorName ?? this.deps.app.appName ?? "Instructor", avatar_url: null, bio: null };
  }

  /** 45 Progress over the lessons, 90.1 the quizzes and 112.5 assignments; finished when the last of them was. */
  private progressJson(c: Course, learner: Learner) {
    const mine = this.only(learner, c.id);
    return courseProgress(c, mine.progress, mine.attempts, mine.submissions);
  }

  /**
   * An item of the curriculum: a lesson (90.1 locked until its drip day, with
   * when it opens), a quiz, 112.5 an assignment (when it's due) or a live
   * class (when it starts); locked in a course taken in order until the item
   * before is done, with why it's locked.
   */
  private itemJson(it: TopicItem, at: { course: Course; enrolledAt?: Date; now: Date; learner: Learner; waiting?: Set<number> }) {
    const enrolled = at.enrolledAt !== undefined;
    const ended = enrolled && this.ended(at.course, at.enrolledAt, at.now);
    const open = enrolled && !ended;
    const closed = !enrolled ? "not_enrolled" : ended ? "access_ended" : null;
    const after = at.waiting?.has(it.id) ? "previous_not_done" : null;
    // 112.5 A cohort that hasn't started: everything but live classes waits for its first day.
    const start = open ? this.startOf(at.course, at.enrolledAt!) : null;
    const before = start !== null && start.getTime() > at.now.getTime();
    const base = { id: it.id, preview: false, question_count: null, duration_minutes: null as number | null, completed: itemCounts(it) && itemDone(it, at.learner) };
    if (it.kind === "lesson") {
      const l = it.lesson;
      const drip = start ? lessonOpensAt(l, start) : null;
      const opens = before ? new Date(Math.max(start!.getTime(), drip?.getTime() ?? 0)) : drip;
      const later = opens !== null && opens.getTime() > at.now.getTime();
      const reason = l.preview && !open ? null : (closed ?? (later ? "not_available_yet" : after));
      return {
        ...base,
        type: "lesson",
        title: l.title,
        duration_minutes: l.durationMinutes,
        preview: l.preview,
        locked: reason !== null,
        locked_reason: reason,
        ...(later ? { available_at: opens!.toISOString() } : {}),
      };
    }
    const startsLater = before ? { available_at: start!.toISOString() } : {};
    if (it.kind === "quiz") {
      const reason = closed ?? (before ? "not_available_yet" : after);
      return { ...base, ...startsLater, type: "quiz", title: it.quiz.title, duration_minutes: it.quiz.timeLimitMinutes, question_count: quizQuestionCount(at.course, it.quiz), locked: reason !== null, locked_reason: reason };
    }
    if (it.kind === "assignment") {
      const reason = closed ?? (before ? "not_available_yet" : after);
      const due = assignmentDueAt(it.assignment, start ?? at.enrolledAt ?? null);
      return { ...base, ...startsLater, type: "assignment", title: it.assignment.title, locked: reason !== null, locked_reason: reason, due_at: due ? due.toISOString() : null, in_app: true };
    }
    return { ...base, type: "live", title: it.live.title, duration_minutes: it.live.durationMinutes, locked: closed !== null, locked_reason: closed, starts_at: it.live.startsAt, in_app: true };
  }

  private myCourse(c: Course, enrollments: Map<number, Date>, learner: Learner, ratings: Ratings = [], request?: ConnectorRequest) {
    const enrolledAt = enrollments.get(c.id);
    const mine = this.only(learner, c.id);
    const json = this.progressJson(c, learner);
    const next = courseItems(c).find((it) => itemCounts(it) && !itemDone(it, mine));
    const ends = enrolledAt ? accessEndsAt(c, enrolledAt) : null;
    const now = request?.now ?? new Date();
    return {
      course: this.summary(c, new Set(enrollments.keys()), ratings),
      progress: json,
      ...(next ? { next_item: this.itemJson(next, { course: c, enrolledAt, now, learner: mine }) } : {}),
      certificate_url: request ? this.certificateFor(request, c, json.course_completed) : null,
      access_ends_at: ends ? ends.toISOString() : null,
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
    const enrollments = await this.enrollments(request);
    const enrolled = new Set(enrollments.keys());
    const ratings = await this.ratings();
    if (request.user && enrolled.size) {
      const learner = await this.learnerOf(request);
      const current = this.active().find((c) => enrolled.has(c.id) && !this.progressJson(c, learner).course_completed);
      if (current) sections.push({ type: "continue_learning", title: "Continue learning", course: this.myCourse(current, enrollments, learner, ratings, request) });
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
    const enrollments = await this.enrollments(request);
    const enrolled = new Set(enrollments.keys());
    const ios = request.query.get("platform") === "ios";
    // 113.7 Courses to finish first: none to enrol in or buy until they are.
    const required = missingCourses(this.setup, c.id, new Set());
    const missing = enrolled.has(c.id) ? [] : await this.missing(request, c);
    const storeProduct = enrolled.has(c.id) || c.priceCents === 0 || missing.length ? null : await this.storeProduct(c, request.query.get("platform"));
    const action = enrolled.has(c.id) ? "continue" : missing.length ? "none" : c.priceCents === 0 ? "enroll_free" : storeProduct ? "store" : !ios && this.canSell ? "checkout" : "none";
    const minutes = lessonsOf(c).reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
    return {
      status: 200,
      body: {
        ...this.summary(c, enrolled, await this.ratings()),
        description_html: descriptionHtml(c.description),
        duration_minutes: minutes || null,
        level: c.level,
        has_certificate: c.certificate === true,
        qna: true,
        categories: this.setup.categories.filter((cat) => c.categoryIds.includes(cat.id)).map((cat) => ({ ...cat, count: 0 })),
        // 112.5 Coupons are taken on the payment page's checkout.
        purchase: { action, store_product_id: storeProduct, ...(action === "checkout" ? { coupons: (await this.deps.store.listCatalogCoupons(this.deps.app.id)).some((c) => c.active) } : {}) },
        // 73 Whether a student who finished it may start it again (the owner's choice per course, on by default).
        can_restart: canRestart(c),
        // 113.7 The courses to finish first, and whether the student has.
        prerequisites: required.map((id) => {
          const course = this.setup.courses.find((x) => x.id === id)!;
          return { id: course.id, title: course.title, completed: !missing.some((m) => m.id === id) };
        }),
        prerequisites_met: missing.length === 0,
        // 45 The student's progress, so a finished course says so; 90.1 the certificate once earned, and when access ends.
        ...(enrolled.has(c.id) ? await this.enrolledDetail(request, c, enrollments.get(c.id)!) : {}),
        // 113.1 The bundles it is in.
        bundles: this.bundlesWith(c.id, enrolled),
      },
    };
  }

  private async enrolledDetail(request: ConnectorRequest, c: Course, enrolledAt: Date) {
    const progress = this.progressJson(c, await this.learnerOf(request, c.id));
    const ends = accessEndsAt(c, enrolledAt);
    const cohort = this.cohortOf(c);
    return {
      progress,
      certificate_url: this.certificateFor(request, c, progress.course_completed),
      access_ends_at: ends ? ends.toISOString() : null,
      // 112.5 The student's cohort.
      cohort: cohort ? { id: cohort.id, name: cohort.name, starts_at: cohort.startsAt } : null,
    };
  }

  private async curriculum(request: ConnectorRequest, c: Course): Promise<ConnectorResult> {
    const enrolledAt = (await this.enrollments(request)).get(c.id);
    // 90.1 Access that ended locks everything but the free previews.
    const open = enrolledAt !== undefined && !this.ended(c, enrolledAt, request.now);
    const learner = await this.learnerOf(request, c.id);
    // 112.5 A course taken in order: what waits for the item before it.
    const waiting = open ? waitingForPrevious(c, learner) : new Set<number>();
    return {
      status: 200,
      body: {
        topics: c.topics.map((t) => ({
          id: t.id,
          title: t.title,
          items: topicItems(t).map((it) => this.itemJson(it, { course: c, enrolledAt, now: request.now, learner, waiting })),
        })),
      },
    };
  }

  private async enroll(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!c) return noCourse();
    if (c.priceCents > 0) return error(403, "purchase_required", "This course isn't free.");
    if (!(await this.enrolled(request)).has(c.id) && (await this.missing(request, c)).length) return prerequisites();
    await this.deps.store.enrollInCourse({ appId: this.deps.app.id, userId: request.user.id, courseId: c.id, source: "free", enrolledAt: request.now });
    const row = (await this.deps.store.listCourseEnrollments({ appId: this.deps.app.id, userId: request.user.id, courseId: c.id }))[0]!;
    const ends = accessEndsAt(c, row.enrolledAt);
    return { status: 200, body: { course_id: c.id, enrolled_at: row.enrolledAt.toISOString(), access_ends_at: ends ? ends.toISOString() : null } };
  }

  private async myCourses(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const status = request.query.get("status") ?? "in_progress";
    if (status !== "in_progress" && status !== "completed") return error(400, "invalid_request", "Unknown status.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const enrollments = await this.enrollments(request);
    const learner = await this.learnerOf(request);
    const order = (await this.deps.store.listCourseEnrollments({ appId: this.deps.app.id, userId: request.user.id })).map((e) => e.courseId);
    const mine = order
      .map((id) => this.course(id))
      .filter((c): c is Course => c !== null)
      .filter((c) => this.progressJson(c, learner).course_completed === (status === "completed"));
    const ratings = await this.ratings();
    const items = mine.slice((page - 1) * perPage, page * perPage).map((c) => this.myCourse(c, enrollments, learner, ratings, request));
    return { status: 200, body: { page, per_page: perPage, total: mine.length, total_pages: Math.max(1, Math.ceil(mine.length / perPage)), items } };
  }

  private async lesson(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult> {
    if (!found) return error(404, "not_found", "Lesson not found.");
    const { course, lesson } = found;
    const enrolledAt = (await this.enrollments(request)).get(course.id);
    if (enrolledAt === undefined && !lesson.preview) return error(403, "not_enrolled", "Enroll in the course to open this lesson.");
    // 90.1 Access that ended, and a lesson that opens later.
    if (enrolledAt !== undefined && !lesson.preview) {
      if (this.ended(course, enrolledAt, request.now)) return error(403, "access_ended", "Your access to this course has ended.");
      // 112.5 A cohort's students from its first day, the drip days counted from it.
      const waiting = this.notStarted(course, enrolledAt, request.now);
      if (waiting) return waiting;
      const opens = lessonOpensAt(lesson, this.startOf(course, enrolledAt));
      if (opens && opens.getTime() > request.now.getTime()) return error(403, "not_available_yet", `This lesson opens on ${opens.toISOString().slice(0, 10)}.`);
      // 112.5 A course taken in order.
      if (await this.waits(request, course, lesson.id)) return notYet();
    }
    const progress = await this.progressOf(request, course.id);
    const lessons = lessonsOf(course);
    const index = lessons.findIndex((l) => l.id === lesson.id);
    // 113.7 The student's notes and bookmark, and the lesson's discussion.
    const mine = request.user && enrolledAt !== undefined ? await this.mineOn(request.user.id, course.id, lesson.id) : null;
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
        attachments: await this.attachments(lesson),
        completed: Boolean(progress.get(lesson.id)?.completedAt),
        position_seconds: progress.get(lesson.id)?.positionSeconds ?? 0,
        previous_id: lessons[index - 1]?.id ?? null,
        next_id: lessons[index + 1]?.id ?? null,
        offline: this.offline(lesson, hosted),
        ...(mine ? { bookmarked: mine.bookmarked, note_count: mine.notes, discussion_count: mine.discussion } : {}),
      },
    };
  }

  /** 113.7 The student's notes and bookmark on a lesson, and how many questions its discussion has (that they may see). */
  private async mineOn(userId: number, courseId: number, lessonId: number) {
    const { store, app } = this.deps;
    const [notes, bookmarks, discussion] = await Promise.all([
      store.listLessonNotes({ appId: app.id, userId, lessonId }),
      store.listLessonBookmarks({ appId: app.id, userId, courseId }),
      store.listCourseQuestions({ appId: app.id, courseIds: [courseId], lessonId, viewerId: userId, order: "created", offset: 0, limit: 1 }),
    ]);
    return { notes: notes.length, bookmarked: bookmarks.some((b) => b.lessonId === lessonId), discussion: discussion.total };
  }

  /** 90.1 The lesson's files: a Media library file signed for this request (left out when it's gone), an https address as it is. */
  private async attachments(lesson: CourseLesson) {
    const out: { name: string; url: string; size_bytes: number | null; mime_type: string | null }[] = [];
    for (const file of lesson.attachments ?? []) {
      if (this.isMedia(file.url)) {
        const signed = await this.deps.media!.resolve(file.url, "download");
        if (signed) out.push({ name: file.name, url: signed.url, size_bytes: signed.sizeBytes, mime_type: signed.mimeType });
      } else {
        out.push({ name: file.name, url: file.url, size_bytes: null, mime_type: null });
      }
    }
    return out;
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
    const enrolledAt = (await this.enrollments(request)).get(course.id);
    return enrolledAt !== undefined && !this.ended(course, enrolledAt, request.now);
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
    return { status: 200, body: this.progressJson(found.course, await this.learnerOf(request, found.course.id)) };
  }

  /**
   * 73 Starts the course again for the student: their lessons completed and
   * where each video stopped are cleared, and 90.1 their quiz results; the
   * enrollment, reviews and questions stay.
   */
  private async restart(request: ConnectorRequest, course: Course | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!course) return noCourse();
    if (!(await this.mayLearn(request, course))) return error(403, "not_enrolled", "Enroll in the course to start it again.");
    if (!canRestart(course)) return error(403, "restart_disabled", "This course can't be started again.");
    await this.deps.store.deleteLessonProgress({ appId: this.deps.app.id, userId: request.user.id, courseId: course.id });
    // 90.1 Its quiz results too: the quizzes are taken again.
    await this.deps.store.deleteQuizAttempts({ appId: this.deps.app.id, userId: request.user.id, courseId: course.id });
    // 112.5 and their assignments.
    await this.deps.store.deleteAssignmentSubmissions({ appId: this.deps.app.id, userId: request.user.id, courseId: course.id });
    return { status: 200, body: this.progressJson(course, { progress: new Map(), attempts: [] }) };
  }

  // 90.1 Quizzes

  /** 112.5 In a course taken in order, whether the item waits for the one before it. */
  private async waits(request: ConnectorRequest, course: Course, itemId: number): Promise<boolean> {
    if (course.sequential !== true) return false;
    return waitingForPrevious(course, await this.learnerOf(request, course.id)).has(itemId);
  }

  /** The student may take the course's quizzes: enrolled, with access that hasn't ended. */
  private async mayQuiz(request: ConnectorRequest, found: { course: Course; quiz: CourseQuiz } | null): Promise<ConnectorResult | null> {
    if (!request.user) return signIn();
    if (!found) return error(404, "not_found", "Quiz not found.");
    const enrolledAt = (await this.enrollments(request)).get(found.course.id);
    if (enrolledAt === undefined) return error(403, "not_enrolled", "Enroll in the course to take this quiz.");
    if (this.ended(found.course, enrolledAt, request.now)) return error(403, "access_ended", "Your access to this course has ended.");
    return this.notStarted(found.course, enrolledAt, request.now);
  }

  private resultJson(a: QuizAttempt, quiz: CourseQuiz | null, withReview = false, course: Course | null = null, now: Date = new Date()) {
    // 113.7 An exam's results once it closes, when the academy chose so.
    if (quiz && resultsHidden(quiz, now)) {
      return { attempt_id: a.id, quiz_id: a.quizId, quiz_title: quiz.title, status: "awaiting_results", score_percent: null, finished_at: a.submittedAt?.toISOString() ?? null, results_at: quiz.exam!.closesAt };
    }
    return {
      attempt_id: a.id,
      quiz_id: a.quizId,
      quiz_title: quiz?.title ?? "",
      status: a.passed ? "passed" : "failed",
      score_percent: a.scorePercent,
      finished_at: a.submittedAt?.toISOString() ?? null,
      // 112.5 Each question with the student's answer and the right one, when the quiz shows them.
      ...(withReview && quiz?.showAnswers && a.answers ? { review: this.review({ ...quiz, questions: attemptQuestions(course ?? {}, quiz, a.id) }, a.answers) } : {}),
    };
  }

  /** 112.5 The answers' review: what the student chose or wrote, and what was right. */
  private review(quiz: CourseQuiz, answers: Record<string, string[]>) {
    return quiz.questions.map((q) => {
      const given = answers[String(q.id)] ?? [];
      const short = q.type === "short_answer";
      return {
        question_id: q.id,
        title: q.text,
        type: q.type,
        correct: answeredRight(q, given),
        options: q.options.map((o) => ({ id: o.id, label: o.text })),
        chosen_option_ids: short ? [] : given,
        right_option_ids: q.options.filter((o) => o.correct).map((o) => o.id),
        text: short ? (given[0] ?? "") : null,
        accepted_answers: short ? (q.accepted ?? []) : [],
      };
    });
  }

  private async quiz(request: ConnectorRequest, found: { course: Course; quiz: CourseQuiz } | null): Promise<ConnectorResult> {
    const refused = await this.mayQuiz(request, found);
    if (refused) return refused;
    const { course, quiz } = found!;
    const attempts = await this.deps.store.listQuizAttempts({ appId: this.deps.app.id, userId: request.user!.id, quizId: quiz.id });
    const submitted = attempts.filter((a) => a.submittedAt);
    // 113.7 An exam in progress: the attempt to go back to, while its time lasts.
    const open = quiz.exam ? this.openAttempt(quiz, attempts, request.now) : null;
    return {
      status: 200,
      body: {
        id: quiz.id,
        course_id: course.id,
        title: quiz.title,
        question_count: quizQuestionCount(course, quiz),
        time_limit_seconds: quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : null,
        pass_percent: quiz.passPercent,
        attempts_allowed: quiz.attemptsAllowed,
        attempts_used: this.used(quiz, attempts),
        ...(submitted[0] ? { last_result: this.resultJson(submitted[0], quiz, true, course, request.now) } : {}),
        ...(quiz.exam
          ? {
              exam: {
                opens_at: quiz.exam.opensAt,
                closes_at: quiz.exam.closesAt,
                status: examStatus(quiz.exam, request.now),
                results_after_close: quiz.exam.resultsAfterClose,
                in_progress: open ? { attempt_id: open.id, ends_at: attemptEndsAt(quiz, open.startedAt)?.toISOString() ?? null } : null,
              },
            }
          : {}),
      },
    };
  }

  /** 113.7 Attempts used: submitted ones, and for an exam every one started (starting again doesn't give the questions anew). */
  private used(quiz: CourseQuiz, attempts: QuizAttempt[]): number {
    return quiz.exam ? attempts.length : attempts.filter((a) => a.submittedAt).length;
  }

  /** 113.7 An exam's attempt not handed in yet whose time hasn't run out. */
  private openAttempt(quiz: CourseQuiz, attempts: QuizAttempt[], now: Date): QuizAttempt | null {
    return (
      attempts.find((a) => {
        if (a.submittedAt) return false;
        const ends = attemptEndsAt(quiz, a.startedAt);
        return ends === null || now.getTime() < ends.getTime() + EXAM_GRACE_SECONDS * 1000;
      }) ?? null
    );
  }

  private async startAttempt(request: ConnectorRequest, found: { course: Course; quiz: CourseQuiz } | null): Promise<ConnectorResult> {
    const refused = await this.mayQuiz(request, found);
    if (refused) return refused;
    const { course, quiz } = found!;
    if (await this.waits(request, course, quiz.id)) return notYet();
    const attempts = await this.deps.store.listQuizAttempts({ appId: this.deps.app.id, userId: request.user!.id, quizId: quiz.id });
    // 113.7 An exam: within its window only; an attempt in progress goes on where it was (its questions, its end).
    if (quiz.exam) {
      const status = examStatus(quiz.exam, request.now);
      if (status === "upcoming") return error(403, "exam_not_open", `This exam opens on ${quiz.exam.opensAt!.slice(0, 16).replace("T", " ")} UTC.`);
      const open = this.openAttempt(quiz, attempts, request.now);
      if (open) return { status: 201, body: this.attemptJson(course, quiz, open) };
      if (status === "closed") return error(403, "exam_closed", "This exam has closed.");
    }
    const used = this.used(quiz, attempts);
    if (quiz.attemptsAllowed !== null && used >= quiz.attemptsAllowed) return error(409, "conflict", "You've used every attempt at this quiz.");
    const attempt = await this.deps.store.createQuizAttempt({
      appId: this.deps.app.id,
      userId: request.user!.id,
      courseId: course.id,
      quizId: quiz.id,
      answers: null,
      scorePercent: null,
      passed: null,
      startedAt: request.now,
      submittedAt: null,
    });
    return { status: 201, body: this.attemptJson(course, quiz, attempt) };
  }

  /** An attempt's questions, without their answers. */
  private attemptJson(course: Course, quiz: CourseQuiz, attempt: QuizAttempt) {
    const ends = attemptEndsAt(quiz, attempt.startedAt);
    return {
      id: attempt.id,
      quiz_id: quiz.id,
      started_at: attempt.startedAt.toISOString(),
      // 113.7 For an exam, no later than it closes.
      ends_at: ends ? ends.toISOString() : null,
      exam: Boolean(quiz.exam),
      // The right answers stay here: the app gets the options only.
      // 112.5 A shuffled quiz: its questions and their answers in this attempt's own order (true or false stays as it is).
      // 112.5 With the questions drawn from the course's bank for this attempt.
      questions: (quiz.shuffle ? shuffled(attemptQuestions(course, quiz, attempt.id), `${attempt.id}`) : attemptQuestions(course, quiz, attempt.id)).map((q) => ({
        id: q.id,
        type: q.type,
        title: q.text,
        description_html: null,
        render_mode: "native",
        webview_url: null,
        options: (quiz.shuffle && q.type !== "true_false" ? shuffled(q.options, `${attempt.id}:${q.id}`) : q.options).map((o) => ({ id: o.id, label: o.text, image_url: null })),
        points: 1,
      })),
    };
  }

  private async submitAttempt(request: ConnectorRequest, found: { course: Course; quiz: CourseQuiz } | null, attemptId: number): Promise<ConnectorResult> {
    const refused = await this.mayQuiz(request, found);
    if (refused) return refused;
    const { course, quiz: own } = found!;
    const attempt = Number.isSafeInteger(attemptId) ? await this.deps.store.getQuizAttempt(this.deps.app.id, attemptId) : null;
    if (!attempt || attempt.userId !== request.user!.id || attempt.quizId !== own.id) return error(404, "not_found", "Attempt not found.");
    if (attempt.submittedAt) return error(409, "conflict", "This attempt was already submitted.");
    // 112.5 Scored over this attempt's questions: the quiz's own and those drawn from the bank.
    const quiz = { ...own, questions: attemptQuestions(course, own, attempt.id) };
    const list = (request.body as { answers?: unknown } | null)?.answers;
    if (!Array.isArray(list) || list.length > quiz.questions.length + 5) return error(400, "invalid_request", "answers must be a list, one item per question.");
    const answers: Record<string, string[]> = {};
    for (const item of list as { question_id?: unknown; option_ids?: unknown; text?: unknown }[]) {
      if (!item || !Number.isSafeInteger(item.question_id) || (item.option_ids !== undefined && !(Array.isArray(item.option_ids) && item.option_ids.every((o) => typeof o === "string" && o.length <= 40)))) {
        return error(400, "invalid_request", "Each answer has a question_id and the chosen option_ids.");
      }
      // 112.5 A short answer: the text written.
      if (item.text !== undefined && typeof item.text !== "string") return error(400, "invalid_request", "A written answer's text must be text.");
      const question = quiz.questions.find((q) => q.id === item.question_id);
      answers[String(item.question_id)] = question?.type === "short_answer" ? [String(item.text ?? "").trim().slice(0, 500)] : ((item.option_ids as string[] | undefined) ?? []).slice(0, 20);
    }
    // 113.7 An exam's answers after its end and a minute's grace are refused: the attempt closes with none.
    const ends = own.exam ? attemptEndsAt(own, attempt.startedAt) : null;
    if (ends && request.now.getTime() > ends.getTime() + EXAM_GRACE_SECONDS * 1000) {
      await this.deps.store.submitQuizAttempt(this.deps.app.id, attempt.id, { answers: {}, scorePercent: 0, passed: false, submittedAt: request.now });
      return error(409, "time_up", "The time for this exam is over: your answers came too late.");
    }
    // 90.1 After the time limit (with a minute's grace for the network), what's answered counts.
    const result = scoreQuiz(quiz, answers);
    const saved = await this.deps.store.submitQuizAttempt(this.deps.app.id, attempt.id, { answers, scorePercent: result.scorePercent, passed: result.passed, submittedAt: request.now });
    if (!saved) return error(409, "conflict", "This attempt was already submitted.");
    return { status: 200, body: this.resultJson({ ...attempt, answers, ...result, submittedAt: request.now }, own, true, course, request.now) };
  }

  private async myAttempts(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const all = (await this.attemptsOf(request)).filter((a) => a.submittedAt);
    const items = all.slice((page - 1) * perPage, page * perPage).map((a) => this.resultJson(a, findQuiz(this.setup, a.quizId)?.quiz ?? null, false, null, request.now));
    return { status: 200, body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items } };
  }

  // 112.5 Assignments

  /** The student may hand in the course's work: signed in, enrolled, with access that hasn't ended. */
  private async mayWork(request: ConnectorRequest, course: Course | null, missing: string): Promise<ConnectorResult | { enrolledAt: Date }> {
    if (!request.user) return signIn();
    if (!course) return error(404, "not_found", missing);
    const enrolledAt = (await this.enrollments(request)).get(course.id);
    if (enrolledAt === undefined) return error(403, "not_enrolled", "Enroll in the course to open this.");
    if (this.ended(course, enrolledAt, request.now)) return error(403, "access_ended", "Your access to this course has ended.");
    // 112.5 Due dates count from the student's cohort's start.
    return { enrolledAt: this.startOf(course, enrolledAt) };
  }

  private submissionJson(s: AssignmentSubmission, a: CourseAssignment, due: Date | null) {
    return {
      id: s.id,
      text: s.text,
      file: s.file ? { name: s.file.name, url: mediaLink(this.deps.platformUrl, s.file.fileId), kind: s.file.kind } : null,
      status: s.status,
      score: s.status === "graded" ? s.score : null,
      max_points: a.maxPoints,
      passed: s.status === "graded" ? assignmentDone(a, s) : null,
      feedback: s.status === "submitted" ? null : s.feedback,
      submitted_at: s.submittedAt.toISOString(),
      graded_at: s.status === "submitted" ? null : (s.gradedAt?.toISOString() ?? null),
      late: due !== null && s.submittedAt.getTime() > due.getTime(),
      // 113.7 Which try it is, and the rubric's levels the teacher chose.
      attempt: s.attempt,
      rubric_result: s.status === "graded" ? rubricResult(a.rubric, s.rubric) : null,
    };
  }

  private async assignmentJson(request: ConnectorRequest, course: Course, a: CourseAssignment, enrolledAt: Date) {
    const [mine] = await this.deps.store.listAssignmentSubmissions({ appId: this.deps.app.id, userId: request.user!.id, assignmentId: a.id });
    const due = assignmentDueAt(a, enrolledAt);
    return {
      id: a.id,
      course_id: course.id,
      course_title: course.title,
      title: a.title,
      instructions_html: descriptionHtml(a.instructions),
      due_at: due ? due.toISOString() : null,
      max_points: a.maxPoints,
      pass_points: a.passPoints,
      attachments: await this.attachments({ attachments: a.attachments } as CourseLesson),
      accepts_files: this.deps.uploads !== undefined,
      // 113.7 Another try after a grade, while the assignment allows more.
      can_submit: maySubmit(a, mine),
      submission: mine ? this.submissionJson(mine, a, due) : null,
      rubric: rubricJson(a.rubric),
      attempts_allowed: attemptsOf(a),
      attempts_used: mine ? mine.attempt : 0,
    };
  }

  private async assignment(request: ConnectorRequest, found: { course: Course; assignment: CourseAssignment } | null): Promise<ConnectorResult> {
    const may = await this.mayWork(request, found?.course ?? null, "Assignment not found.");
    if ("status" in may) return may;
    const { course, assignment } = found!;
    const waiting = this.notStarted(course, may.enrolledAt, request.now);
    if (waiting) return waiting;
    if (await this.waits(request, course, assignment.id)) return notYet();
    return { status: 200, body: await this.assignmentJson(request, course, assignment, may.enrolledAt) };
  }

  /** A ready photo or PDF of the app's Media library, from the app's uploads (never chat files). */
  private async uploadedFile(id: unknown): Promise<AssignmentSubmission["file"] | undefined> {
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return undefined;
    const file = await this.deps.store.getMediaFile(this.deps.app.id, id);
    if (!file || file.status !== "ready" || file.source === "chat" || (file.kind !== "image" && file.kind !== "pdf")) return undefined;
    return { fileId: file.id, name: file.name, kind: file.kind };
  }

  private async submitAssignment(request: ConnectorRequest, found: { course: Course; assignment: CourseAssignment } | null): Promise<ConnectorResult> {
    const may = await this.mayWork(request, found?.course ?? null, "Assignment not found.");
    if ("status" in may) return may;
    const { course, assignment } = found!;
    const waiting = this.notStarted(course, may.enrolledAt, request.now);
    if (waiting) return waiting;
    if (await this.waits(request, course, assignment.id)) return notYet();
    const body = (request.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (body.text !== undefined && typeof body.text !== "string") return error(400, "invalid_request", "text must be text.");
    if (text.length > 10_000) return error(400, "invalid_request", "The text can be up to 10,000 characters.");
    let file: AssignmentSubmission["file"] = null;
    if (body.upload_id !== undefined && body.upload_id !== null) {
      file = (await this.uploadedFile(body.upload_id)) ?? null;
      if (!file) return error(400, "invalid_request", "This file isn't ready. Send it again.");
    }
    if (!text && !file) return error(400, "invalid_request", "Write your answer or add a photo or a PDF.");
    const [before] = await this.deps.store.listAssignmentSubmissions({ appId: this.deps.app.id, userId: request.user!.id, assignmentId: assignment.id });
    if (!maySubmit(assignment, before)) return error(409, "already_graded", "Your teacher has graded this assignment already.");
    const wait = await this.limited(request, SUBMIT_LIMIT);
    if (wait) return wait;
    await this.deps.store.saveAssignmentSubmission({
      appId: this.deps.app.id,
      userId: request.user!.id,
      courseId: course.id,
      assignmentId: assignment.id,
      text,
      file,
      status: "submitted",
      score: null,
      // A returned assignment keeps the teacher's note until it's graded again.
      feedback: before?.feedback ?? null,
      submittedAt: request.now,
      gradedAt: null,
      gradedBy: null,
      // 113.7 Handed in again after a grade: the next try.
      attempt: before ? (before.status === "graded" ? before.attempt + 1 : before.attempt) : 1,
      rubric: null,
    });
    return { status: 200, body: await this.assignmentJson(request, course, assignment, may.enrolledAt) };
  }

  /** Starts sending a photo or PDF for an assignment, into the app's Media library; sent in chunks as chat files are. */
  private async startCourseUpload(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const uploads = this.deps.uploads;
    if (!uploads) return error(503, "media_unavailable", "Files can't be sent right now.");
    if ((await this.enrolled(request)).size === 0) return error(403, "not_enrolled", "Enroll in a course to send files.");
    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    const size = typeof body.size === "number" ? body.size : Number.NaN;
    const type = typeof body.type === "string" ? body.type : "";
    if (!name || !type) return error(400, "invalid_request", "Send the file's name, size and type.");
    if (!kindOf(type, ASSIGNMENT_KINDS)) return error(400, "invalid_request", "Send a photo (JPEG, PNG or WebP) or a PDF.");
    const wait = await this.limited(request, UPLOAD_LIMIT);
    if (wait) return wait;
    const started = await startUpload(
      { store: this.deps.store, storage: uploads.storage, now: request.now, limitBytes: await uploads.limitBytes(), chunkBytes: uploads.chunkBytes },
      { appId: this.deps.app.id, name: `${request.user.name} · ${name}`.slice(0, 200), size, contentType: type },
    );
    if (!started.ok) {
      if (started.code === "storage_full") return error(413, "storage_full", "There's no room for this file in the academy's storage right now.");
      if (started.code === "too_big") return error(413, "too_big", started.message);
      return error(400, "invalid_request", started.message);
    }
    return { status: 201, body: { id: started.file.id, kind: started.file.kind, upload_url: started.uploadUrl, chunk_bytes: started.chunkBytes, size: started.file.sizeBytes } };
  }

  private async courseUpload(request: ConnectorRequest, id: string, step: "resume" | "complete"): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const uploads = this.deps.uploads;
    if (!uploads) return error(503, "media_unavailable", "Files can't be sent right now.");
    const file = /^[0-9a-f-]{36}$/.test(id) ? await this.deps.store.getMediaFile(this.deps.app.id, id) : null;
    const mine = file && (file.kind === "image" || file.kind === "pdf") && file.source !== "chat" ? file : null;
    if (step === "resume") {
      if (!mine || mine.status !== "uploading") return error(404, "not_found", "Upload not found.");
      return { status: 200, body: { id: mine.id, kind: mine.kind, upload_url: uploadUrl(uploads.storage, mine), chunk_bytes: uploads.chunkBytes, size: mine.sizeBytes } };
    }
    if (!mine) return error(404, "not_found", "Upload not found.");
    if (mine.status === "ready") return { status: 204 };
    const result = await completeUpload({ store: this.deps.store, storage: uploads.storage, now: request.now }, this.deps.app.id, mine.id);
    if (!result.ok) return { status: 409, body: { code: "incomplete", message: result.message, ...(result.offset !== undefined ? { offset: result.offset } : {}) } };
    return { status: 204 };
  }

  // 112.5 Live classes

  private liveJson(course: Course, live: CourseLiveSession, enrolled: boolean, now: Date) {
    const status = liveStatus(live, now);
    return {
      id: live.id,
      course_id: course.id,
      course_title: course.title,
      title: live.title,
      starts_at: live.startsAt,
      ends_at: new Date(Date.parse(live.startsAt) + live.durationMinutes * 60_000).toISOString(),
      duration_minutes: live.durationMinutes,
      notes: live.notes,
      status,
      // The meeting link from 15 minutes before it starts, to the course's students only.
      join_url: enrolled && liveJoinOpen(live, now) ? live.meetingUrl : null,
      recording_url: enrolled && status === "ended" ? (live.recordingUrl ?? null) : null,
    };
  }

  private async liveSession(request: ConnectorRequest, found: { course: Course; live: CourseLiveSession } | null): Promise<ConnectorResult> {
    const may = await this.mayWork(request, found?.course ?? null, "Live class not found.");
    if ("status" in may) return may;
    return { status: 200, body: this.liveJson(found!.course, found!.live, true, request.now) };
  }

  /** The live classes of the student's courses: coming and on now (soonest first), or past (latest first). */
  private async myLiveSessions(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const when = request.query.get("when") ?? "upcoming";
    if (when !== "upcoming" && when !== "past") return error(400, "invalid_request", "when is upcoming or past.");
    const enrollments = await this.enrollments(request);
    const all = this.active()
      .filter((c) => enrollments.has(c.id) && !this.ended(c, enrollments.get(c.id), request.now))
      .flatMap((c) => liveSessionsOf(c).map((live) => ({ course: c, live })))
      .filter(({ live }) => (liveStatus(live, request.now) === "ended") === (when === "past"))
      .sort((a, b) => (when === "past" ? -1 : 1) * (Date.parse(a.live.startsAt) - Date.parse(b.live.startsAt)));
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    const items = all.slice((page - 1) * perPage, page * perPage).map(({ course, live }) => this.liveJson(course, live, true, request.now));
    return { status: 200, body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items } };
  }

  /** 90.1 The certificates of the courses the student finished. */
  private async certificates(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const enrolled = await this.enrolled(request);
    const learner = await this.learnerOf(request);
    const items = [];
    for (const c of this.active()) {
      if (!enrolled.has(c.id) || c.certificate !== true) continue;
      const json = this.progressJson(c, learner);
      const url = this.certificateFor(request, c, json.course_completed);
      // 112.5 With its PDF file, in the app's language.
      if (url) items.push({ course_id: c.id, course_title: c.title, url, pdf_url: `${url}/pdf?lang=${request.lang ?? "en"}`, issued_at: json.completed_at });
    }
    return { status: 200, body: { items } };
  }

  // 63 Reviews and questions

  private person(user: HostedUser | null | undefined) {
    return { name: user?.name ?? "", avatar_url: null, instructor: false };
  }

  /** The business, as the app shows it under its answers. */
  private business(course: Course | null) {
    return { name: course?.instructorName ?? this.deps.app.appName ?? "Instructor", avatar_url: null, instructor: true };
  }

  /** 105.3 An answer's author: the course's teacher when they wrote it, else the student. */
  private answerAuthor(course: Course, userId: number, user: HostedUser | null | undefined) {
    const teacher = this.teacherOfCourse(course);
    if (teacher && teacher.userId === userId) return { name: teacher.name, avatar_url: teacher.photoAssetId ? this.deps.assetUrl(teacher.photoAssetId) : null, instructor: true };
    return this.person(user);
  }

  /** 105.3 The signed-in person is the course's teacher. */
  private async isTeacherOf(request: ConnectorRequest, c: Course): Promise<Teacher | null> {
    const teacher = this.teacherOfCourse(c);
    if (!teacher || !request.user) return null;
    const me = await teacherOf(this.deps.store, this.deps.app, request.user, request.now);
    return me && me.id === teacher.id ? me : null;
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
    if ((await this.enrolled(request)).has(c.id)) return null;
    // 105.3 The course's teacher reads and answers its questions.
    return (await this.isTeacherOf(request, c)) ? null : error(403, "not_enrolled", "Enroll in the course to see and ask questions.");
  }

  private async limited(request: ConnectorRequest, rule: RateLimitRule = QUESTION_LIMIT): Promise<ConnectorResult | null> {
    const result = await hitRateLimit(this.deps.store, rule, `${this.deps.app.id}:${request.user!.id}`, request.now);
    if (result.allowed) return null;
    return { status: 429, body: { code: "rate_limited", message: "You've written a lot in a short time. Please try again later.", retry_after_seconds: result.retryAfter } };
  }

  private questionJson(q: CourseQuestion, user: HostedUser | null | undefined, mine: boolean) {
    // 64 A hidden question reaches its author only, who is told.
    // 113.7 Under a lesson (its discussion), and pinned.
    const lesson = q.lessonId ? findLesson(this.setup, q.lessonId) : null;
    return {
      id: q.id,
      course_id: q.courseId,
      text: q.text,
      author: this.person(user),
      created_at: q.createdAt.toISOString(),
      answer_count: q.answerCount,
      mine,
      hidden: q.hidden,
      lesson_id: q.lessonId,
      lesson_title: lesson?.lesson.title ?? null,
      pinned: q.pinned,
    };
  }

  private async questions(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    const refused = await this.mayTalk(request, c);
    if (refused) return refused;
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 100);
    // 113.7 A lesson's discussion.
    const lessonId = request.query.get("lesson_id") ? Number(request.query.get("lesson_id")) : undefined;
    if (lessonId !== undefined && !lessonsOf(c!).some((l) => l.id === lessonId)) return error(404, "not_found", "Lesson not found.");
    const { items, total } = await this.deps.store.listCourseQuestions({
      appId: this.deps.app.id,
      courseIds: [c!.id],
      viewerId: request.user!.id,
      ...(lessonId !== undefined ? { lessonId } : {}),
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
    // 113.7 Under one of the course's lessons: its discussion.
    const rawLesson = (request.body as { lesson_id?: unknown } | null)?.lesson_id;
    if (rawLesson !== undefined && rawLesson !== null && !(typeof rawLesson === "number" && lessonsOf(c!).some((l) => l.id === rawLesson))) return error(400, "invalid_request", "This lesson isn't in the course.");
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
      lessonId: typeof rawLesson === "number" ? rawLesson : null,
    });
    await this.tell(() => this.deps.onQuestion?.({ question, course: c!, user: request.user!, text: read.text, followUp: false }));
    const teacher = this.teacherOfCourse(c!);
    if (teacher?.status === "active") await this.tell(() => this.deps.onTeacherQuestion?.({ teacher, question, course: c!, text: read.text }));
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
    // 113.7 The course's teacher pins and deletes; a student deletes their own.
    const moderator = (await this.isTeacherOf(request, course)) !== null;
    return {
      status: 200,
      body: {
        ...this.questionJson(question, users.get(question.userId), question.userId === request.user!.id),
        can_moderate: moderator,
        can_delete: moderator || question.userId === request.user!.id,
        answers: answers.map((a) => ({
          id: a.id,
          text: a.text,
          author: a.userId === null ? this.business(course) : this.answerAuthor(course, a.userId, users.get(a.userId)),
          created_at: a.createdAt.toISOString(),
          mine: a.userId === request.user!.id,
          hidden: a.hidden,
          can_delete: moderator || a.userId === request.user!.id,
        })),
      },
    };
  }

  // 113.7 The lessons' discussions: pinned and deleted

  private async pin(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.ownQuestion(request, id);
    if ("status" in found) return found;
    if (!(await this.isTeacherOf(request, found.course))) return error(403, "not_teacher", "Only the course's teacher can pin questions.");
    const pinned = (request.body as { pinned?: unknown } | null)?.pinned;
    if (typeof pinned !== "boolean") return error(400, "invalid_request", "pinned must be true or false.");
    await this.deps.store.setCourseQuestionPinned(this.deps.app.id, found.question.id, pinned);
    return { status: 204 };
  }

  private async deleteQuestion(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.ownQuestion(request, id);
    if ("status" in found) return found;
    if (found.question.userId !== request.user!.id && !(await this.isTeacherOf(request, found.course))) return error(403, "forbidden", "You can delete your own questions only.");
    await this.deps.store.deleteCourseQuestion(this.deps.app.id, found.question.id);
    return { status: 204 };
  }

  private async deleteAnswer(request: ConnectorRequest, id: number, answerId: number): Promise<ConnectorResult> {
    const found = await this.ownQuestion(request, id);
    if ("status" in found) return found;
    const answer = (await this.deps.store.listCourseAnswers(this.deps.app.id, found.question.id)).find((a) => a.id === answerId);
    if (!answer || (answer.hidden && answer.userId !== request.user!.id)) return error(404, "not_found", "Answer not found.");
    if (answer.userId !== request.user!.id && !(await this.isTeacherOf(request, found.course))) return error(403, "forbidden", "You can delete your own answers only.");
    await this.deps.store.deleteCourseAnswer(this.deps.app.id, found.question.id, answer.id);
    return { status: 204 };
  }

  private async reply(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const found = await this.ownQuestion(request, id);
    if ("status" in found) return found;
    const read = readCommunityText((request.body as { text?: unknown } | null)?.text, "Write your answer.");
    if (!read.ok) return error(400, "invalid_request", read.error);
    const wait = await this.limited(request);
    if (wait) return wait;
    const { question, course } = found;
    // 105.3 The course's teacher answers: the question is answered, in the teacher's name.
    const teacher = question.userId === request.user!.id ? null : await this.isTeacherOf(request, course);
    if (teacher) {
      const answer = await this.deps.store.addCourseAnswer({ appId: this.deps.app.id, questionId: question.id, userId: request.user!.id, text: read.text, createdAt: request.now }, "answered");
      await this.tell(() => this.deps.onTeacherAnswer?.({ teacher, question, course, text: read.text }));
      return { status: 201, body: { id: answer.id, text: answer.text, author: this.answerAuthor(course, request.user!.id, request.user), created_at: answer.createdAt.toISOString(), mine: true, hidden: false } };
    }
    // A student writing again: the question waits for the business again.
    const answer = await this.deps.store.addCourseAnswer({ appId: this.deps.app.id, questionId: question.id, userId: request.user!.id, text: read.text, createdAt: request.now }, "open");
    // 64 A question the business hid isn't pushed to its phones again.
    if (!question.hidden) await this.tell(() => this.deps.onQuestion?.({ question, course, user: request.user!, text: read.text, followUp: true }));
    const owner = this.teacherOfCourse(course);
    if (!question.hidden && owner?.status === "active" && question.userId === request.user!.id) await this.tell(() => this.deps.onTeacherQuestion?.({ teacher: owner, question, course, text: read.text }));
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

  // 113.7 Notes and bookmarks: the student's own

  private noteJson(n: LessonNote) {
    const lesson = findLesson(this.setup, n.lessonId);
    return {
      id: n.id,
      course_id: n.courseId,
      lesson_id: n.lessonId,
      lesson_title: lesson?.lesson.title ?? "",
      text: n.text,
      position_seconds: n.positionSeconds,
      created_at: n.createdAt.toISOString(),
      updated_at: n.updatedAt.toISOString(),
    };
  }

  /** The lesson of an enrolled student (notes are kept in the courses they're in). */
  private async noteLesson(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult | { course: Course; lesson: CourseLesson }> {
    if (!request.user) return signIn();
    if (!found) return error(404, "not_found", "Lesson not found.");
    if (!(await this.enrolled(request)).has(found.course.id)) return error(403, "not_enrolled", "Enroll in the course to keep notes.");
    return found;
  }

  private async lessonNotes(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult> {
    const ok = await this.noteLesson(request, found);
    if ("status" in ok) return ok;
    const { store, app } = this.deps;
    const [notes, bookmarks] = await Promise.all([store.listLessonNotes({ appId: app.id, userId: request.user!.id, lessonId: ok.lesson.id }), store.listLessonBookmarks({ appId: app.id, userId: request.user!.id, courseId: ok.course.id })]);
    return { status: 200, body: { lesson_id: ok.lesson.id, bookmarked: bookmarks.some((b) => b.lessonId === ok.lesson.id), items: notes.map((n) => this.noteJson(n)) } };
  }

  private async addNote(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null): Promise<ConnectorResult> {
    const ok = await this.noteLesson(request, found);
    if ("status" in ok) return ok;
    const read = readNote(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const { store, app } = this.deps;
    if ((await store.listLessonNotes({ appId: app.id, userId: request.user!.id, lessonId: ok.lesson.id })).length >= NOTES_PER_LESSON) return error(409, "too_many_notes", `You can keep up to ${NOTES_PER_LESSON} notes on a lesson.`);
    const wait = await this.limited(request, NOTE_LIMIT);
    if (wait) return wait;
    const note = await store.createLessonNote({ appId: app.id, userId: request.user!.id, courseId: ok.course.id, lessonId: ok.lesson.id, text: read.text, positionSeconds: read.positionSeconds, createdAt: request.now, updatedAt: request.now });
    return { status: 201, body: this.noteJson(note) };
  }

  /** The student's own note (anyone else's is not found). */
  private async ownNote(request: ConnectorRequest, id: number): Promise<ConnectorResult | LessonNote> {
    if (!request.user) return signIn();
    const note = Number.isSafeInteger(id) ? await this.deps.store.getLessonNote(this.deps.app.id, id) : null;
    if (!note || note.userId !== request.user.id) return error(404, "not_found", "Note not found.");
    return note;
  }

  private async editNote(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const note = await this.ownNote(request, id);
    if ("status" in note) return note;
    const read = readNote(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    const wait = await this.limited(request, NOTE_LIMIT);
    if (wait) return wait;
    await this.deps.store.updateLessonNote(this.deps.app.id, note.id, { text: read.text, updatedAt: request.now });
    return { status: 200, body: this.noteJson({ ...note, text: read.text, updatedAt: request.now }) };
  }

  private async removeNote(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const note = await this.ownNote(request, id);
    if ("status" in note) return note;
    await this.deps.store.deleteLessonNote(this.deps.app.id, note.id);
    return { status: 204 };
  }

  private async bookmark(request: ConnectorRequest, found: { course: Course; lesson: CourseLesson } | null, on: boolean): Promise<ConnectorResult> {
    const ok = await this.noteLesson(request, found);
    if ("status" in ok) return ok;
    await this.deps.store.setLessonBookmark({ appId: this.deps.app.id, userId: request.user!.id, courseId: ok.course.id, lessonId: ok.lesson.id, on, now: request.now });
    return { status: 204 };
  }

  /** The student's notes and bookmarks in a course, in the course's order of lessons. */
  private async courseNotes(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!c) return noCourse();
    if (!(await this.enrolled(request)).has(c.id)) return error(403, "not_enrolled", "Enroll in the course to keep notes.");
    const { store, app } = this.deps;
    const [notes, bookmarks] = await Promise.all([store.listLessonNotes({ appId: app.id, userId: request.user.id, courseId: c.id }), store.listLessonBookmarks({ appId: app.id, userId: request.user.id, courseId: c.id })]);
    const order = new Map(lessonsOf(c).map((l, i) => [l.id, i]));
    const place = (lessonId: number) => order.get(lessonId) ?? Number.MAX_SAFE_INTEGER;
    return {
      status: 200,
      body: {
        course_id: c.id,
        items: [...notes].sort((a, b) => place(a.lessonId) - place(b.lessonId) || a.createdAt.getTime() - b.createdAt.getTime()).map((n) => this.noteJson(n)),
        bookmarks: bookmarks
          .filter((b) => order.has(b.lessonId))
          .sort((a, b) => place(a.lessonId) - place(b.lessonId))
          .map((b) => ({ lesson_id: b.lessonId, lesson_title: findLesson(this.setup, b.lessonId)?.lesson.title ?? "", created_at: b.createdAt.toISOString() })),
      },
    };
  }

  // 113.7 Learning paths

  private async pathJson(request: ConnectorRequest, path: ReturnType<typeof activePaths>[number], enrolled: Set<number>, learner: Learner, finished: Set<number>, ratings: Ratings) {
    const courses = path.courses.map((c, i) => {
      const before = path.courses[i - 1];
      const progress = enrolled.has(c.id) ? this.progressJson(c, learner) : null;
      return {
        course: this.summary(c, enrolled, ratings),
        completed: finished.has(c.id),
        percent: progress?.percent ?? 0,
        // In a path taken in order, a course waits for the one before it (unless the student is already in it).
        locked: !enrolled.has(c.id) && missingCourses(this.setup, c.id, finished).length > 0,
        ...(path.inOrder && before && !finished.has(before.id) ? { after_course_id: before.id } : {}),
      };
    });
    const done = courses.filter((c) => c.completed).length;
    return {
      id: path.id,
      title: path.title,
      description: path.description,
      in_order: path.inOrder,
      course_count: courses.length,
      completed_count: done,
      percent: courses.length ? Math.round((done / courses.length) * 100) : 0,
      courses,
    };
  }

  private async pathsContext(request: ConnectorRequest) {
    const enrolled = await this.enrolled(request);
    const learner = await this.learnerOf(request);
    return { enrolled, learner, finished: this.finished(learner, enrolled), ratings: await this.ratings() };
  }

  private async paths(request: ConnectorRequest): Promise<ConnectorResult> {
    const at = await this.pathsContext(request);
    const items = [];
    for (const path of activePaths(this.setup, (c) => c.active && !c.teacherStage)) items.push(await this.pathJson(request, path, at.enrolled, at.learner, at.finished, at.ratings));
    return { status: 200, body: { items } };
  }

  private async path(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    const path = activePaths(this.setup, (c) => c.active && !c.teacherStage).find((p) => p.id === id);
    if (!path) return error(404, "not_found", "Learning path not found.");
    const at = await this.pathsContext(request);
    return { status: 200, body: await this.pathJson(request, path, at.enrolled, at.learner, at.finished, at.ratings) };
  }

  // 113.7 Points, badges and leaderboards

  /** Each student's learning in a course, an exam's results hidden until it closes. */
  private async classOf(course: Course, now: Date): Promise<Map<number, Learner>> {
    const out = await classLearners(this.deps.store, this.deps.app.id, course.id);
    for (const [userId, learner] of out) out.set(userId, { ...learner, attempts: this.visible([...learner.attempts], now) });
    return out;
  }

  private async courseLeaderboard(request: ConnectorRequest, c: Course | null): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (!c) return noCourse();
    if (this.setup.gamification !== true) return noGamification();
    const teacher = await this.isTeacherOf(request, c);
    if (!(await this.enrolled(request)).has(c.id) && !teacher) return error(403, "not_enrolled", "Enroll in the course to see its leaderboard.");
    const scope = request.query.get("scope") ?? "course";
    if (scope !== "course" && scope !== "cohort") return error(400, "invalid_request", "scope is course or cohort.");
    const { store, app } = this.deps;
    let enrollments = await store.listCourseEnrollments({ appId: app.id, courseId: c.id });
    // A cohort's board: the student's own cohort.
    const cohort = scope === "cohort" ? this.cohortOf(c) : null;
    if (scope === "cohort") enrollments = enrollments.filter((e) => cohort !== null && e.cohortId === cohort.id);
    const zone = await appZone(store, app);
    const learners = await this.classOf(c, request.now);
    const users = await this.users(enrollments.map((e) => e.userId));
    const rows = leaderboard(
      enrollments.flatMap((e) => {
        const user = users.get(e.userId);
        return user ? [{ user, points: coursePoints(c, learners.get(e.userId) ?? { progress: new Map(), attempts: [], submissions: [] }, zone) }] : [];
      }),
    );
    const me = rows.find((r) => r.userId === request.user!.id) ?? null;
    const shown = rows.slice(0, LEADERBOARD_TOP);
    return {
      status: 200,
      body: {
        course_id: c.id,
        scope,
        cohort: cohort ? { id: cohort.id, name: cohort.name } : null,
        total_students: rows.length,
        my_rank: me?.rank ?? null,
        my_points: me?.points ?? null,
        // First names and an initial only.
        items: [...shown, ...(me && !shown.includes(me) ? [me] : [])].map((r) => ({ rank: r.rank, name: r.name, points: r.points, me: r.userId === request.user!.id })),
      },
    };
  }

  /** The student's points over their courses, their streak and every badge (earned or not). */
  private async achievements(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (this.setup.gamification !== true) return noGamification();
    const zone = await appZone(this.deps.store, this.deps.app);
    const enrolled = await this.enrolled(request);
    const learner = await this.learnerOf(request);
    const mine = this.active().filter((c) => enrolled.has(c.id));
    const courses = mine.map((c) => ({ course: c, learner: this.only(learner, c.id), points: coursePoints(c, this.only(learner, c.id), zone) }));
    const points = courses.reduce((n, c) => n + c.points, 0);
    const finished = this.finished(learner, enrolled);
    const pathsFinished = activePaths(this.setup, (c) => c.active && !c.teacherStage).filter((p) => p.courses.every((c) => finished.has(c.id))).length;
    const days = learningDays(
      courses.flatMap((c) => earnedIn(c.course, c.learner).times),
      zone,
    );
    const streak = streaks(days, utcToLocal(request.now, zone).date);
    return {
      status: 200,
      body: {
        points,
        streak_days: streak.current,
        best_streak: streak.best,
        badges: badgesOf({ courses, zone, pathsFinished, points }).map((b) => ({ id: b.id, icon: b.icon, earned: b.earned, earned_at: b.earnedAt?.toISOString() ?? null })),
        courses: courses.filter((c) => c.points > 0).map((c) => ({ course_id: c.course.id, course_title: c.course.title, points: c.points })),
      },
    };
  }

  /**
   * Android only: an order for a paid course (113.1 or a bundle), paid on the
   * payment page; paying enrols the student. 113.1 A coupon that takes the
   * whole price enrols them at once, with no payment: the order is paid at 0
   * and completed, and counts one use of the coupon.
   */
  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const platform = request.query.get("platform");
    if (platform !== "android") return error(403, "purchase_not_allowed", "Courses can't be bought in the iPhone app.");
    const body = request.body as { course_id?: unknown; bundle_id?: unknown; coupon?: unknown } | null;
    let sale: Sale;
    if (body?.bundle_id !== undefined && body?.bundle_id !== null) {
      const bundle = this.bundle(Number(body.bundle_id));
      if (!bundle) return noBundle();
      sale = this.bundleSale(bundle);
    } else {
      const course = this.course(Number(body?.course_id));
      if (!course) return noCourse();
      if (course.priceCents === 0) return error(403, "feature_disabled", "This course is free: enroll in the app.");
      sale = { kind: "course", course };
    }
    if (!this.canSell) return error(403, "feature_disabled", sale.kind === "course" ? "This course can't be bought right now." : "This bundle can't be bought right now.");
    const enrolled = await this.enrolled(request);
    if (sale.kind === "course" && enrolled.has(sale.course.id)) return error(403, "feature_disabled", "You're already enrolled in this course.");
    if (sale.kind === "bundle" && sale.courses.every((c) => enrolled.has(c.id))) return error(403, "feature_disabled", "You're already enrolled in every course in this bundle.");
    // 113.7 A course waits for its prerequisites; a bundle's course, for those the bundle doesn't bring.
    const waiting = sale.kind === "course" ? [sale.course] : sale.courses.filter((c) => !enrolled.has(c.id));
    const brought = new Set(sale.kind === "bundle" ? sale.courses.map((c) => c.id) : []);
    for (const c of waiting) if ((await this.missing(request, c)).some((m) => !brought.has(m.id))) return prerequisites();
    // 112.5 With a coupon of the academy's: the payment page charges the price less it, and a paid order counts one use.
    const raw = body?.coupon;
    const coupon = raw === undefined || raw === null || raw === "" ? null : await this.saleCoupon(raw, sale, request.now);
    if (coupon && !coupon.ok) return error(400, "coupon_invalid", coupon.message);
    const price = priceOf(sale);
    const discount = coupon?.ok ? coupon.discountCents : 0;
    const line: CatalogOrderLine =
      sale.kind === "course"
        ? { productId: sale.course.id, name: sale.course.title, quantity: 1, unitCents: price, imageAssetId: sale.course.imageAssetId, digital: true }
        : { productId: sale.bundle.id, name: sale.bundle.title, quantity: 1, unitCents: price, imageAssetId: sale.bundle.imageAssetId, digital: true, bundle: orderBundle(sale.courses, enrolled) };
    const token = randomToken(24);
    const order = await this.deps.store.createCatalogOrder({
      // 96.4 The customer's language, for their receipt.
      lang: request.lang ?? null,
      appId: this.deps.app.id,
      tokenHash: sha256Hex(token),
      userId: request.user.id,
      status: "pending",
      lines: [line],
      subtotalCents: price,
      shippingCents: 0,
      totalCents: price - discount,
      ...(coupon?.ok ? { couponCode: coupon.code, discountCents: discount } : {}),
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
    const link = { url: payUrl(this.deps.platformUrl, token), expires_at: new Date(request.now.getTime() + PAY_LINK_MINUTES * 60_000).toISOString(), open_in: "in_app" as const };
    if (order.totalCents > 0) return { status: 200, body: link };
    // 113.1 Free with the coupon: enrolled now. The link shows the order as received (for apps from before 113.1, which open it).
    const courseIds = sale.kind === "course" ? [sale.course.id] : sale.courses.map((c) => c.id);
    await this.deps.store.payCatalogOrder(this.deps.app.id, order.id, FREE_COUPON_PAYMENT_ID, request.now);
    const used = coupon?.ok ? await this.deps.store.getCatalogCouponByCode(this.deps.app.id, coupon.code) : null;
    if (used) await this.deps.store.useCatalogCoupon(this.deps.app.id, used.id);
    for (const courseId of courseIds) await this.deps.store.enrollInCourse({ appId: this.deps.app.id, userId: request.user.id, courseId, source: "free", enrolledAt: request.now });
    await this.deps.store.updateCatalogOrder(this.deps.app.id, order.id, { status: "completed", updatedAt: request.now });
    return { status: 200, body: { ...link, enrolled: true, course_ids: courseIds } };
  }

  /** 112.5 A coupon for a paid course (113.1 or a bundle): what it takes off, or why it doesn't apply; 113.1 all of it makes it free. */
  private async saleCoupon(raw: unknown, sale: Sale, now: Date): Promise<{ ok: true; code: string; discountCents: number } | { ok: false; message: string }> {
    const code = normalizeCouponCode(raw);
    const coupon = code ? await this.deps.store.getCatalogCouponByCode(this.deps.app.id, code) : null;
    const check = couponDiscount(coupon, priceOf(sale), this.setup.currency, now);
    if (!check.ok) return check;
    return { ok: true, code: coupon!.code, discountCents: check.discountCents };
  }

  private async checkCoupon(request: ConnectorRequest, sale: Sale): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    if (sale.kind === "course" && sale.course.priceCents === 0) return error(403, "feature_disabled", "This course is free: enroll in the app.");
    const wait = await this.limited(request, COUPON_LIMIT);
    if (wait) return wait;
    const raw = (request.body as { code?: unknown } | null)?.code;
    const check = await this.saleCoupon(raw, sale, request.now);
    const { currency } = this.setup;
    const price = priceOf(sale);
    const code = typeof raw === "string" ? raw.trim().toUpperCase().slice(0, 50) : "";
    return {
      status: 200,
      body: check.ok
        ? { code: check.code, status: "applied", message: null, price: formatCents(price, currency), discount: formatCents(check.discountCents, currency), total: formatCents(price - check.discountCents, currency), free: check.discountCents >= price }
        : { code, status: "invalid", message: check.message, price: formatCents(price, currency), discount: null, total: formatCents(price, currency), free: false },
    };
  }
}
