import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type CatalogOrder, type CourseSetup } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import { publishCourse, returnCourse } from "@/lib/teachers/courses";
import { dayRange, periodDays, salesByCourse, statements } from "@/lib/teachers/earnings";
import { courseStage, readSubjects, teacherRating } from "@/lib/teachers/service";
import { tellStudentAnswered, tellTeacherQuestion } from "@/lib/teachers/notify";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

function academy(): CourseSetup {
  return {
    currency: "EGP",
    categories: [{ id: 1, name: "Languages" }],
    courses: [
      {
        id: 10,
        title: "The academy's own course",
        description: "",
        imageAssetId: null,
        priceCents: 0,
        categoryIds: [1],
        instructorName: "Nour Academy",
        level: null,
        active: true,
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [{ id: 11, title: "Start", lessons: [{ id: 12, title: "Welcome", videoUrl: null, text: "Hello", durationMinutes: 3, preview: true }] }],
      },
    ],
    nextId: 20,
  };
}

describe("105.3 teachers' helpers", () => {
  it("reads subjects, works out a course's stage and a teacher's rating", () => {
    expect(readSubjects(["Arabic", " arabic ", "Grammar"], true)).toEqual({ ok: true, subjects: ["Arabic", "Grammar"] });
    expect(readSubjects([], true)).toMatchObject({ ok: false });
    expect(readSubjects("Maths, Physics", false)).toEqual({ ok: true, subjects: ["Maths", "Physics"] });
    expect(readSubjects(Array.from({ length: 9 }, (_, i) => `S${i}`), false)).toMatchObject({ ok: false });
    expect(courseStage({ active: true, teacherStage: null })).toBe("published");
    expect(courseStage({ active: false })).toBe("hidden");
    expect(courseStage({ active: false, teacherStage: "in_review" })).toBe("in_review");
    expect(teacherRating([{ teacherId: 1, rating: 5, count: 2 }, { teacherId: 1, rating: 2, count: 1 }, { teacherId: 2, rating: 1, count: 4 }], 1)).toEqual({ rating: 4, count: 3 });
    expect(teacherRating([], 1)).toEqual({ rating: null, count: 0 });
  });

  it("counts each course's sales after coupons and refunds, and the teacher's share", () => {
    const setup = { ...academy(), courses: [...academy().courses, { ...academy().courses[0]!, id: 30, title: "Grammar", teacherId: 7 }] };
    const order = (lines: CatalogOrder["lines"], total: number, refunded = 0) => ({ lines, subtotalCents: lines.reduce((s, l) => s + l.unitCents * l.quantity, 0), totalCents: total, refundedCents: refunded }) as CatalogOrder;
    const line = (productId: number, unitCents: number) => ({ productId, name: "", quantity: 1, unitCents, imageAssetId: null, digital: true });
    // 450.00, then 450.00 with 50.00 off, then 450.00 refunded 100.00.
    const orders = [order([line(30, 450_00)], 450_00), order([line(30, 450_00)], 400_00), order([line(30, 450_00)], 450_00, 100_00)];
    expect(salesByCourse(orders, setup).get(30)).toEqual({ courseId: 30, title: "Grammar", sales: 3, salesCents: 1300_00, refundsCents: 100_00 });
    const [statement] = statements([{ id: 7, shareBp: 7000 } as never], setup, orders);
    // 70% of 1200.00.
    expect(statement).toMatchObject({ sales: 3, salesCents: 1300_00, refundsCents: 100_00, earnedCents: 840_00, academyCents: 360_00 });
    // Last month in Cairo: September when it's October.
    expect(periodDays("last_month", NOW, "Africa/Cairo")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    const range = dayRange("2026-09-01", "2026-09-30", "Africa/Cairo");
    expect(range.start.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-30T21:00:00.000Z");
  });
});

describe("105.3 academies with many teachers on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan = PLAN_INFO.pro;
  let teacherId: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "lms");
    app = {
      ...base,
      backend: "hosted",
      vertical: "instructors",
      appName: "Nour Academy",
      websiteDoneAt: NOW,
      connector: { kind: "courses" },
      courseSetup: academy(),
      timeZone: "Africa/Cairo",
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP", payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    const made = await store.createTeacher(
      { appId: app.id, name: "Salma Fathy", phone: "+201001110000", email: null, userId: null, photoAssetId: "face-1", bio: "Arabic grammar, simply.\nTen years in classrooms.", subjects: ["Arabic", "Grammar"], status: "active", shareBp: 7000, featured: true },
      NOW,
    );
    if (!made.ok) throw new Error("duplicate");
    teacherId = made.teacher.id;
    sender = new LogSender();
    now = NOW;
    plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "instructors"] };
  });

  const context = async (): Promise<HostedContext> => {
    const fresh = (await store.getAppById(app.id))!;
    return {
      store,
      app: fresh,
      active: true,
      plan,
      now,
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender,
      push: false,
      assetUrl: ASSETS,
      platformUrl: "https://yallapp.test",
      connector: new CoursesConnector({ store, app: fresh, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }),
    };
  };

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(await context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number; roles?: string[] } };
  }

  const setupNow = async () => courseSetupOf((await store.getAppById(app.id))!);
  const courseSetupOf = (a: App) => a.courseSetup!;
  const saveSetup = async (change: (s: CourseSetup) => CourseSetup) => store.updateApp(app.id, { courseSetup: change(await setupNow()) }, now);

  /** The teacher makes a course with one lesson and sends it for review. */
  async function teacherCourse(token: string) {
    const made = await call("POST", "/teacher/courses", { token, body: { title: "Arabic grammar", description: "Nahw from the start.", price: "450", level: "beginner", category_id: 1 } });
    expect(made.status).toBe(201);
    const course = made.body as { id: number; stage: string; sections: unknown[] };
    expect(course).toMatchObject({ stage: "draft", price: "450.00", price_formatted: "E£450.00", level: "beginner", category_id: 1, lesson_count: 0 });
    expect((await call("POST", "/teacher/courses/{course_id}/submit", { params: [String(course.id)], token })).body).toMatchObject({ code: "no_lessons" });
    const sectioned = (await call("POST", "/teacher/courses/{course_id}/sections", { params: [String(course.id)], token, body: { title: "The sentence" } })).body as { sections: { id: number }[] };
    const sectionId = sectioned.sections[0]!.id;
    const lessoned = await call("POST", "/teacher/courses/{course_id}/lessons", { params: [String(course.id)], token, body: { section_id: sectionId, title: "Subject and verb", video_url: "https://www.youtube.com/watch?v=nahw1", duration_minutes: 12, preview: true } });
    expect(lessoned.body).toMatchObject({ lesson_count: 1, sections: [{ title: "The sentence", lessons: [{ title: "Subject and verb", kind: "video", duration_minutes: 12, preview: true }] }] });
    return { id: course.id, sectionId };
  }

  it("sends Config.instructors, and the teacher role, only with the plan feature", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(config).toMatchObject({ instructors: { applications: false, timezone: "Africa/Cairo" }, vertical: "instructors" });
    const teacher = await signUp("1001110000", "Salma");
    expect((await call("GET", "/me", { token: teacher.access_token })).body).toMatchObject({ roles: ["teacher"] });
    expect((await call("GET", "/teacher/me", { token: teacher.access_token })).body).toMatchObject({ id: teacherId, name: "Salma Fathy", share_percent: 70, subjects: ["Arabic", "Grammar"], avatar_url: ASSETS("face-1") });
    const student = await signUp("1002220000", "Omar");
    expect((await call("GET", "/me", { token: student.access_token })).body).not.toHaveProperty("roles");
    expect((await call("GET", "/teacher/me", { token: student.access_token })).body).toMatchObject({ code: "not_teacher" });
    // Suspended: no longer a teacher.
    await store.updateTeacher(app.id, teacherId, { status: "suspended" }, now);
    expect((await call("GET", "/teacher/courses", { token: teacher.access_token })).status).toBe(403);
    plan = PLAN_INFO.pro;
    const without = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(without).not.toHaveProperty("instructors");
    expect((await call("GET", "/teachers")).body).toMatchObject({ code: "feature_disabled" });
  });

  it("a teacher's course waits for the academy, then students see it in the teacher's name and follow the teacher", async () => {
    const teacher = await signUp("1001110000", "Salma");
    const { id, sectionId } = await teacherCourse(teacher.access_token);
    expect((await call("POST", "/teacher/courses/{course_id}/submit", { params: [String(id)], token: teacher.access_token })).body).toMatchObject({ stage: "in_review" });
    // With the academy: not changed meanwhile, and not in the app.
    expect((await call("PATCH", "/teacher/courses/{course_id}", { params: [String(id)], token: teacher.access_token, body: { title: "Changed" } })).body).toMatchObject({ code: "not_editable" });
    expect((await call("POST", "/teacher/courses/{course_id}/lessons", { params: [String(id)], token: teacher.access_token, body: { section_id: sectionId, title: "More", text: "x" } })).status).toBe(409);
    const titles = async () => ((await call("GET", "/courses")).body as { items: { title: string }[] }).items.map((c) => c.title);
    expect(await titles()).toEqual(["The academy's own course"]);
    // Sent back, changed, sent again, published.
    await saveSetup((s) => returnCourse(s, id, "Add a description of each lesson."));
    expect((await call("GET", "/teacher/courses/{course_id}", { params: [String(id)], token: teacher.access_token })).body).toMatchObject({ stage: "returned", review_note: "Add a description of each lesson." });
    expect((await call("PATCH", "/teacher/courses/{course_id}", { params: [String(id)], token: teacher.access_token, body: { title: "Arabic grammar, step by step", price: "450" } })).body).toMatchObject({ title: "Arabic grammar, step by step", stage: "returned" });
    expect((await call("POST", "/teacher/courses/{course_id}/submit", { params: [String(id)], token: teacher.access_token })).body).toMatchObject({ stage: "in_review", review_note: null });
    await saveSetup((s) => publishCourse(s, id));
    expect(await titles()).toEqual(["Arabic grammar, step by step", "The academy's own course"]);
    const listed = (await call("GET", "/courses")).body as { items: { id: number; instructor: { id: number; name: string } }[] };
    expect(listed.items.find((c) => c.id === id)!.instructor).toEqual({ id: teacherId, name: "Salma Fathy", avatar_url: ASSETS("face-1"), bio: "Arabic grammar, simply.\nTen years in classrooms." });
    expect(listed.items.find((c) => c.id === 10)!.instructor.id).toBe(0);
    // A published course takes new lessons at once; its details stay the academy's to change.
    expect((await call("POST", "/teacher/courses/{course_id}/lessons", { params: [String(id)], token: teacher.access_token, body: { section_id: sectionId, title: "Practice", text: "Read and mark the verb." } })).body).toMatchObject({ stage: "published", lesson_count: 2 });
    expect((await call("PATCH", "/teacher/courses/{course_id}", { params: [String(id)], token: teacher.access_token, body: { title: "x" } })).status).toBe(409);
    expect((await call("DELETE", "/teacher/courses/{course_id}/lessons/{lesson_id}", { params: [String(id), "999"], token: teacher.access_token })).status).toBe(404);

    // Students: the list, the page, following.
    const student = await signUp("1002220000", "Omar");
    const list = (await call("GET", "/teachers", { token: student.access_token })).body as { items: Record<string, unknown>[]; subjects: string[] };
    expect(list.items).toEqual([{ id: teacherId, name: "Salma Fathy", avatar_url: ASSETS("face-1"), headline: "Arabic grammar, simply.", subjects: ["Arabic", "Grammar"], rating: null, rating_count: 0, course_count: 1, featured: true }]);
    expect(list.subjects).toEqual(["Arabic", "Grammar"]);
    expect(((await call("GET", "/teachers", { query: { search: "physics" } })).body as { items: unknown[] }).items).toEqual([]);
    expect(((await call("GET", "/teachers", { query: { subject: "grammar" } })).body as { items: unknown[] }).items).toHaveLength(1);
    expect((await call("PUT", "/teachers/{teacher_id}/follow", { params: [String(teacherId)], token: student.access_token })).status).toBe(204);
    const page = (await call("GET", "/teachers/{teacher_id}", { params: [String(teacherId)], token: student.access_token })).body as Record<string, unknown>;
    expect(page).toMatchObject({ follower_count: 1, following: true, can_review: false, my_review: null, student_count: 0, courses: [{ id, title: "Arabic grammar, step by step" }] });
    expect((await call("PUT", "/teachers/{teacher_id}/reviews/mine", { params: [String(teacherId)], token: student.access_token, body: { rating: 5 } })).body).toMatchObject({ code: "not_student" });
    // Once a student in one of the teacher's courses, they rate the teacher.
    await store.enrollInCourse({ appId: app.id, userId: student.user.id, courseId: id, source: "manual", enrolledAt: now });
    expect((await call("PUT", "/teachers/{teacher_id}/reviews/mine", { params: [String(teacherId)], token: student.access_token, body: { rating: 4, text: "Clear and patient." } })).body).toMatchObject({ rating: 4, text: "Clear and patient.", author: { name: "Omar", instructor: false }, mine: true });
    expect((await call("GET", "/teachers/{teacher_id}", { params: [String(teacherId)], token: student.access_token })).body).toMatchObject({ rating: 4, rating_count: 1, can_review: true, student_count: 1, my_review: { rating: 4 } });
    expect(((await call("GET", "/teachers/{teacher_id}/reviews", { params: [String(teacherId)] })).body as { items: unknown[] }).items).toHaveLength(1);
    expect((await call("DELETE", "/teachers/{teacher_id}/follow", { params: [String(teacherId)], token: student.access_token })).status).toBe(204);
    expect((await call("GET", "/teachers/{teacher_id}", { params: [String(teacherId)] })).body).toMatchObject({ follower_count: 0, following: false });
    expect((await call("GET", "/teachers/{teacher_id}", { params: ["9999"] })).status).toBe(404);
  });

  it("the teacher answers their students' questions in the teacher's name, and sees what their courses sold", async () => {
    const teacher = await signUp("1001110000", "Salma");
    const { id } = await teacherCourse(teacher.access_token);
    await saveSetup((s) => publishCourse(s, id));
    const student = await signUp("1002220000", "Omar");
    await store.enrollInCourse({ appId: app.id, userId: student.user.id, courseId: id, source: "paid", enrolledAt: now });
    const asked = (await call("POST", "/courses/{course_id}/questions", { params: [String(id)], token: student.access_token, body: { text: "Is the verb always first?" } })).body as { id: number };
    const waiting = (await call("GET", "/teacher/questions", { token: teacher.access_token })).body as { items: Record<string, unknown>[] };
    expect(waiting.items).toEqual([{ id: asked.id, course_id: id, course_title: "Arabic grammar", text: "Is the verb always first?", student_name: "Omar", answered: false, answer_count: 0, updated_at: expect.any(String) }]);
    // The teacher, not enrolled, reads and answers it.
    expect((await call("GET", "/questions/{question_id}", { params: [String(asked.id)], token: teacher.access_token })).status).toBe(200);
    const answer = (await call("POST", "/questions/{question_id}/answers", { params: [String(asked.id)], token: teacher.access_token, body: { text: "Not always: in a nominal sentence the noun comes first." } })).body;
    expect(answer).toMatchObject({ author: { name: "Salma Fathy", instructor: true }, mine: true });
    const thread = (await call("GET", "/questions/{question_id}", { params: [String(asked.id)], token: student.access_token })).body as { answers: { author: { instructor: boolean } }[] };
    expect(thread.answers[0]!.author.instructor).toBe(true);
    expect(((await call("GET", "/teacher/questions", { token: teacher.access_token })).body as { items: { answered: boolean }[] }).items[0]!.answered).toBe(true);
    // Someone else (not in the course) can't answer.
    const other = await signUp("1003330000", "Rana");
    expect((await call("POST", "/questions/{question_id}/answers", { params: [String(asked.id)], token: other.access_token, body: { text: "Hi" } })).status).toBe(403);

    // Sales on the payment page this month: 450.00 and 450.00 with 100.00 refunded; the share is 70%.
    const order = (refunded: number) =>
      store.createCatalogOrder({
        appId: app.id,
        tokenHash: `h-${refunded}`,
        userId: student.user.id,
        status: refunded ? "refunded" : "completed",
        lines: [{ productId: id, name: "Arabic grammar", quantity: 1, unitCents: 450_00, imageAssetId: null, digital: true }],
        subtotalCents: 450_00,
        shippingCents: 0,
        totalCents: 450_00,
        currency: "EGP",
        customer: null,
        paymentId: "PAY",
        createdAt: now,
        paidAt: now,
        updatedAt: now,
        commissionCents: null,
        itemTransactionIds: null,
        payoutApprovedAt: null,
        refundedCents: refunded,
      } as never);
    await order(0);
    await order(100_00);
    expect((await call("GET", "/teacher/earnings", { query: { period: "month" }, token: teacher.access_token })).body).toEqual({
      period: "month",
      from: "2026-10-01",
      to: NOW.toISOString().slice(0, 10),
      sales: 2,
      sales_formatted: "E£900.00",
      refunds_formatted: "E£100.00",
      share_percent: 70,
      earned_formatted: "E£560.00",
      courses: [{ id, title: "Arabic grammar", sales: 2, earned_formatted: "E£560.00" }],
    });
    expect(((await call("GET", "/teacher/earnings", { query: { period: "last_month" }, token: teacher.access_token })).body as { sales: number }).sales).toBe(0);
    expect((await call("GET", "/teacher/earnings", { query: { period: "week" }, token: teacher.access_token })).status).toBe(400);
  });

  it("105.3.6 makes the store review account a test teacher students never see", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: "+201009990000", reviewCode: "424242" } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, now);
    // The reviewers sign in with the fixed code; no message is sent.
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1009990000" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    expect(sender.sent.has("+201009990000")).toBe(false);
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: "424242", device: { ...DEVICE, id: "install-review" } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const reviewer = (await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Reviewer", device: { ...DEVICE, id: "install-review" } } })).body as { access_token: string };
    expect((await call("GET", "/me", { token: reviewer.access_token })).body).toMatchObject({ roles: ["teacher"] });
    expect((await call("GET", "/teacher/me", { token: reviewer.access_token })).body).toMatchObject({ name: "App Review", share_percent: 0 });
    // Its course waits for the academy like any other.
    const { id } = await teacherCourse(reviewer.access_token);
    expect((await call("POST", "/teacher/courses/{course_id}/submit", { params: [String(id)], token: reviewer.access_token })).body).toMatchObject({ stage: "in_review" });
    // Students see the academy's teachers only.
    const listed = (await call("GET", "/teachers")).body as { items: { name: string }[] };
    expect(listed.items.map((t) => t.name)).toEqual(["Salma Fathy"]);
    // Anyone else is no teacher.
    const student = await signUp("1002220000", "Omar");
    expect((await call("GET", "/me", { token: student.access_token })).body).not.toHaveProperty("roles");
    expect(await store.listTeachers(app.id, { statuses: ["active"] })).toHaveLength(2);
  });

  it("people apply to teach when the academy lets them, and wait for its answer", async () => {
    const person = await signUp("1004440000", "Hany");
    const body = { name: "Hany Saad", bio: "Physics teacher for twelve years.", subjects: ["Physics"] };
    expect((await call("POST", "/teachers/application", { token: person.access_token, body })).body).toMatchObject({ code: "feature_disabled" });
    await saveSetup((s) => ({ ...s, teachersApply: true }));
    expect(((await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } })).body as { instructors: unknown }).instructors).toMatchObject({ applications: true });
    expect((await call("GET", "/teachers/application", { token: person.access_token })).status).toBe(404);
    expect((await call("POST", "/teachers/application", { token: person.access_token, body: { ...body, subjects: [] } })).status).toBe(400);
    expect((await call("POST", "/teachers/application", { token: person.access_token, body })).body).toMatchObject({ status: "pending", name: "Hany Saad", subjects: ["Physics"], note: null });
    expect((await call("POST", "/teachers/application", { token: person.access_token, body })).body).toMatchObject({ code: "already_applied" });
    // Not a teacher yet, and not in the list.
    expect((await call("GET", "/teacher/me", { token: person.access_token })).status).toBe(403);
    expect(((await call("GET", "/teachers")).body as { items: unknown[] }).items).toHaveLength(1);
    // Declined with a note: they may apply again.
    const applied = (await store.listTeachers(app.id, { statuses: ["applied"] }))[0]!;
    expect(applied).toMatchObject({ phone: "+201004440000", userId: person.user.id, shareBp: 0 });
    await store.updateTeacher(app.id, applied.id, { status: "declined", note: "We have physics covered." }, now);
    expect((await call("GET", "/teachers/application", { token: person.access_token })).body).toMatchObject({ status: "declined", note: "We have physics covered." });
    expect((await call("POST", "/teachers/application", { token: person.access_token, body: { ...body, subjects: ["Chemistry"] } })).body).toMatchObject({ status: "pending", subjects: ["Chemistry"] });
    // Approved with a share: a teacher.
    await store.updateTeacher(app.id, applied.id, { status: "active", shareBp: 6000 }, now);
    expect((await call("GET", "/teachers/application", { token: person.access_token })).body).toMatchObject({ status: "approved" });
    expect((await call("GET", "/teacher/me", { token: person.access_token })).body).toMatchObject({ share_percent: 60, subjects: ["Chemistry"] });
    expect((await call("PATCH", "/teacher/me", { token: person.access_token, body: { bio: "Chemistry, with experiments.", subjects: ["Chemistry", "Biology"] } })).body).toMatchObject({ bio: "Chemistry, with experiments.", subjects: ["Chemistry", "Biology"] });
  });

  it("uploads wait for the media server; a lesson needs a video, a PDF or text", async () => {
    const teacher = await signUp("1001110000", "Salma");
    expect((await call("POST", "/teacher/uploads", { token: teacher.access_token, body: { name: "lesson.mp4", size: 1000, type: "video/mp4" } })).body).toMatchObject({ code: "media_unavailable" });
    const made = (await call("POST", "/teacher/courses", { token: teacher.access_token, body: { title: "Empty" } })).body as { id: number };
    const sections = (await call("POST", "/teacher/courses/{course_id}/sections", { params: [String(made.id)], token: teacher.access_token, body: { title: "One" } })).body as { sections: { id: number }[] };
    const sectionId = sections.sections[0]!.id;
    expect((await call("POST", "/teacher/courses/{course_id}/lessons", { params: [String(made.id)], token: teacher.access_token, body: { section_id: sectionId, title: "Nothing" } })).status).toBe(400);
    expect((await call("POST", "/teacher/courses/{course_id}/lessons", { params: [String(made.id)], token: teacher.access_token, body: { section_id: sectionId, title: "Bad", video_url: "http://example.com/a.mp4" } })).status).toBe(400);
    expect((await call("POST", "/teacher/courses/{course_id}/lessons", { params: [String(made.id)], token: teacher.access_token, body: { section_id: sectionId, title: "Bad", upload_id: "00000000-0000-4000-8000-000000000000" } })).status).toBe(400);
    const text = (await call("POST", "/teacher/courses/{course_id}/lessons", { params: [String(made.id)], token: teacher.access_token, body: { section_id: sectionId, title: "Notes", text: "Read this." } })).body as { sections: { lessons: { id: number; kind: string }[] }[] };
    expect(text.sections[0]!.lessons[0]!.kind).toBe("text");
    // A draft's lesson can be removed.
    expect((await call("DELETE", "/teacher/courses/{course_id}/lessons/{lesson_id}", { params: [String(made.id), String(text.sections[0]!.lessons[0]!.id)], token: teacher.access_token })).body).toMatchObject({ lesson_count: 0 });
    // Another teacher's course isn't theirs.
    const other = await store.createTeacher({ appId: app.id, name: "Other", phone: "+201005550000", email: null, userId: null, photoAssetId: null, bio: "", subjects: [], status: "active", shareBp: 5000, featured: false }, now);
    if (!other.ok) throw new Error("duplicate");
    const otherSession = await signUp("1005550000", "Other");
    expect((await call("GET", "/teacher/courses/{course_id}", { params: [String(made.id)], token: otherSession.access_token })).status).toBe(404);
    expect(((await call("GET", "/teacher/courses", { token: otherSession.access_token })).body as { items: unknown[] }).items).toEqual([]);
  });

  it("tells the teacher of a question and the student of the teacher's answer, in their inboxes", async () => {
    const teacher = await signUp("1001110000", "Salma");
    const student = await signUp("1002220000", "Omar");
    const t = (await store.getTeacher(app.id, teacherId))!;
    const deps = { store, app, now, account: null };
    await tellTeacherQuestion(deps, { ...t, userId: teacher.user.id }, { id: 30, title: "Grammar" }, { id: 5 }, "Why?");
    await tellStudentAnswered(deps, t, { id: 30, title: "Grammar" }, { id: 5, userId: student.user.id }, "Because.");
    const inbox = async (userId: number) => (await store.listHostedNotifications({ appId: app.id, userId, since: new Date(0), page: 1, perPage: 10 })).items.map((n) => [n.title, n.data?.type]);
    expect(await inbox(teacher.user.id)).toEqual([["A question in Grammar", "teacher_question"]]);
    expect(await inbox(student.user.id)).toEqual([["Salma Fathy answered your question", "announcement"]]);
  });
});
