import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { renderCertificatePdf } from "@/lib/courses/certificate-pdf";
import { certificateLanguage, loadCertificate } from "@/lib/courses/certificates";
import { attemptQuestions, certificateCode, quizQuestionCount } from "@/lib/courses/learning";
import { BANK_FIRST_ID, parseQuiz, questionsText, saveQuestionBank } from "@/lib/courses/quizzes";
import type { App, CourseSetup } from "@/lib/data/types";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import { DEFAULT_CATALOG_SETTINGS } from "@/lib/data/types";
import { KEY } from "./helpers";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { days, NOW, setupClient } from "./helpers";
import { deleteCohort, saveCohort } from "@/lib/courses/builder";
import { courseReport } from "@/lib/courses/report";
import { learningStart } from "@/lib/courses/learning";

/**
 * 112.5, round 2: the certificate as a PDF file, the question bank, cohorts,
 * grading in the Teacher tab, report cards in the school app.
 */

const SECRET = "test-certificate-secret";
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

export function academy(): CourseSetup {
  return {
    currency: "EGP",
    categories: [],
    courses: [
      {
        id: 10,
        title: "Turkish for Beginners",
        description: "",
        imageAssetId: null,
        priceCents: 0,
        categoryIds: [],
        instructorName: null,
        level: null,
        active: true,
        certificate: true,
        certificateSigner: "Dr. Sara Adel",
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [{ id: 11, title: "Hello", lessons: [{ id: 12, title: "Greetings", videoUrl: null, text: "Merhaba!", durationMinutes: 8, preview: false }] }],
      },
    ],
    nextId: 40,
  };
}

/** A hosted academy and a student who signs up, with calls checked against the contract. */
export async function hostedAcademy(setup: () => CourseSetup = academy, options: { patch?: Partial<App>; plan?: PlanInfo } = {}) {
  const { store } = await setupClient();
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const app: App = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", appName: "Lale Academy", websiteDoneAt: NOW, connector: { kind: "courses" }, courseSetup: setup(), ...options.patch };
  await store.createApp(app);
  const sender = new LogSender();
  const state = { now: NOW, app };
  const context = (): HostedContext => ({
    store,
    app: state.app,
    active: true,
    ...(options.plan ? { plan: options.plan } : {}),
    now: state.now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CoursesConnector({ store, app: state.app, assetUrl: (id) => id, platformUrl: "https://yallapp.test", signingSecret: SECRET }),
  });
  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; params?: string[]; query?: Record<string, string>; lang?: string } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
      ...(options.lang ? { headers: new Headers({ "accept-language": options.lang }) } : {}),
    });
    expectContract(method, route, result);
    return result;
  }
  async function signUp(phone = "5321234567", name = "Deniz Aksoy", countryCode = "+90") {
    state.now = new Date(state.now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: countryCode, phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`${countryCode}${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; refresh_token: string; user: { id: number } };
  }
  return { store, state, call, signUp };
}

describe("112.5 the certificate as a PDF file", () => {
  let h: Awaited<ReturnType<typeof hostedAcademy>>;
  beforeEach(async () => {
    h = await hostedAcademy();
  });

  it("lists the PDF with each certificate, in the app's language", async () => {
    const { access_token: token, user } = await h.signUp();
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    await h.call("POST", "/lessons/{lesson_id}/complete", { params: ["12"], token });
    const code = certificateCode(SECRET, h.state.app.id, user.id, 10);
    expect((await h.call("GET", "/me/certificates", { token, lang: "ar" })).body).toMatchObject({
      items: [{ url: `https://yallapp.test/a/${h.state.app.id}/certificate/${code}`, pdf_url: `https://yallapp.test/a/${h.state.app.id}/certificate/${code}/pdf?lang=ar` }],
    });
    expect(await loadCertificate(h.store, SECRET, h.state.app.id, code)).toMatchObject({ name: "Deniz Aksoy", course: { id: 10 } });
    expect(await loadCertificate(h.store, SECRET, h.state.app.id, code.replace(/.$/, "x"))).toBeNull();
  });

  it("makes an A4 PDF in English, Arabic and Turkish", async () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const pdf = await renderCertificatePdf({
        lang,
        academy: lang === "ar" ? "أكاديمية لالا" : "Lale Academy",
        name: lang === "ar" ? "دنيز أكسوي" : "Deniz Aksoy",
        course: "Turkish for Beginners",
        completedAt: NOW,
        code: "1-10-abcdefghijklmnop",
        signer: "Dr. Sara Adel",
        verifyUrl: "https://yallapp.test/a/x/certificate/1-10-abcdefghijklmnop",
        accent: "#7A3EF0",
        logo: null,
      });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(5000);
    }
    expect(certificateLanguage("tr", "ar")).toBe("tr");
    expect(certificateLanguage(null, "ar-EG,ar;q=0.9")).toBe("ar");
    expect(certificateLanguage("de", "fr")).toBe("en");
  });
});

describe("112.5 a question bank per course", () => {
  const bankText = ["Q: bir", "* 1", "- 2", "", "Q: iki", "* 2", "- 3", "", "Q: üç", "* 3", "- 4", "", "Q: Thank you?", "= Teşekkürler"].join("\n");

  it("reads the bank in the quizzes' format, and a quiz may be the bank alone", () => {
    const saved = saveQuestionBank(academy(), 10, bankText);
    if (!saved.ok) throw new Error(saved.error);
    const bank = saved.setup.courses[0]!.questionBank!;
    expect(bank.map((q) => q.id)).toEqual([BANK_FIRST_ID, BANK_FIRST_ID + 1, BANK_FIRST_ID + 2, BANK_FIRST_ID + 3]);
    expect(bank[3]).toMatchObject({ type: "short_answer", accepted: ["Teşekkürler"] });
    expect(questionsText({ questions: bank })).toBe(bankText);
    expect(saveQuestionBank(academy(), 10, "Q: alone\n* yes")).toMatchObject({ ok: false });
    expect(saveQuestionBank(academy(), 99, bankText)).toMatchObject({ ok: false });
    expect(parseQuiz({ title: "Numbers", questions: "", bankPicks: "2" })).toMatchObject({ ok: true, value: { questions: [], bankPicks: 2 } });
    expect(parseQuiz({ title: "Numbers", questions: "" })).toMatchObject({ ok: false, errors: { questions: expect.any(String) } });
    expect(parseQuiz({ title: "Numbers", questions: "", bankPicks: "99" })).toMatchObject({ ok: false, errors: { bankPicks: expect.any(String) } });
  });

  it("draws the same questions for an attempt each time, different ones across attempts", () => {
    const saved = saveQuestionBank(academy(), 10, bankText);
    if (!saved.ok) throw new Error(saved.error);
    const course = saved.setup.courses[0]!;
    const quiz = { id: 15, title: "Numbers", passPercent: 50, attemptsAllowed: null, timeLimitMinutes: null, bankPicks: 2, questions: [] };
    expect(attemptQuestions(course, quiz, 7).map((q) => q.id)).toEqual(attemptQuestions(course, quiz, 7).map((q) => q.id));
    expect(attemptQuestions(course, quiz, 7)).toHaveLength(2);
    const sets = new Set(Array.from({ length: 12 }, (_, i) => attemptQuestions(course, quiz, i + 1).map((q) => q.id).sort().join(",")));
    expect(sets.size).toBeGreaterThan(1);
    expect(quizQuestionCount(course, { ...quiz, bankPicks: 10 })).toBe(4);
  });

  it("asks and scores an attempt's own questions on the hosted API", async () => {
    const h = await hostedAcademy(() => {
      const setup = academy();
      const saved = saveQuestionBank(setup, 10, bankText);
      if (!saved.ok) throw new Error(saved.error);
      const course = saved.setup.courses[0]!;
      course.topics[0]!.quizzes = [{ id: 15, title: "Numbers", passPercent: 100, attemptsAllowed: null, timeLimitMinutes: null, bankPicks: 3, showAnswers: true, questions: [{ id: 1, text: "sıfır", type: "single_choice", options: [{ id: "a", text: "0", correct: true }, { id: "b", text: "1", correct: false }] }] }];
      return saved.setup;
    });
    const { access_token: token } = await h.signUp();
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect((await h.call("GET", "/quizzes/{quiz_id}", { params: ["15"], token })).body).toMatchObject({ question_count: 4 });
    const attempt = (await h.call("POST", "/quizzes/{quiz_id}/attempts", { params: ["15"], token })).body as { id: number; questions: { id: number; type: string; options: { id: string; label: string }[] }[] };
    expect(attempt.questions).toHaveLength(4);
    expect(attempt.questions[0]!.id).toBe(1);
    const bank = h.state.app.courseSetup!.courses[0]!.questionBank!;
    const answers = attempt.questions.map((q) => {
      const question = q.id === 1 ? { type: "single_choice", options: [{ id: "a", correct: true }], accepted: [] } : bank.find((b) => b.id === q.id)!;
      return question.type === "short_answer" ? { question_id: q.id, text: "teşekkürler" } : { question_id: q.id, option_ids: question.options.filter((o) => o.correct).map((o) => o.id) };
    });
    const result = await h.call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", { params: ["15", String(attempt.id)], token, body: { answers } });
    expect(result.body).toMatchObject({ status: "passed", score_percent: 100 });
    expect(((result.body as { review: { question_id: number }[] }).review).map((r) => r.question_id)).toEqual(attempt.questions.map((q) => q.id));
  });
});

describe("112.5 cohorts: students who start together", () => {
  const withCohort = () => {
    const setup = academy();
    const course = setup.courses[0]!;
    course.cohorts = [{ id: 30, name: "October group", startsAt: days(10).toISOString() }];
    course.topics[0]!.lessons.push({ id: 13, title: "Numbers", videoUrl: null, text: "Bir", durationMinutes: 5, preview: false, dripDays: 3 });
    course.topics[0]!.assignments = [{ id: 16, title: "Introduce yourself", instructions: "Write.", dueDays: 7, maxPoints: 20, passPoints: null }];
    return setup;
  };

  it("adds and deletes cohorts, their first day in the app's time zone", () => {
    expect(saveCohort(academy(), 10, { name: "", startsOn: "" }, "Africa/Cairo")).toMatchObject({ ok: false, errors: { name: expect.any(String), startsOn: expect.any(String) } });
    const saved = saveCohort(academy(), 10, { name: "October group", startsOn: "2026-10-20" }, "Africa/Cairo");
    expect(saved).toMatchObject({ ok: true, item: { id: 40, startsAt: "2026-10-19T21:00:00.000Z" } });
    if (!saved.ok) throw new Error("not saved");
    expect(deleteCohort(saved.setup, 10, 40).courses[0]!.cohorts).toEqual([]);
    const course = withCohort().courses[0]!;
    expect(learningStart(course, { enrolledAt: NOW, cohortId: 30 })).toEqual(days(10));
    expect(learningStart(course, { enrolledAt: NOW, cohortId: 99 })).toEqual(NOW);
    expect(learningStart(course, { enrolledAt: NOW })).toEqual(NOW);
  });

  it("opens the course on the cohort's first day and counts drip days and due dates from it", async () => {
    const h = await hostedAcademy(withCohort);
    const session = await h.signUp();
    const { access_token: token, user } = session;
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    await h.store.setEnrollmentCohort({ appId: h.state.app.id, userId: user.id, courseId: 10, cohortId: 30 });
    expect((await h.call("GET", "/courses/{course_id}", { params: ["10"], token })).body).toMatchObject({ cohort: { id: 30, name: "October group", starts_at: days(10).toISOString() } });
    const items = ((await h.call("GET", "/courses/{course_id}/curriculum", { params: ["10"], token })).body as { topics: { items: Record<string, unknown>[] }[] }).topics[0]!.items;
    expect(items).toMatchObject([
      { id: 12, locked: true, locked_reason: "not_available_yet", available_at: days(10).toISOString() },
      { id: 13, locked: true, locked_reason: "not_available_yet", available_at: days(13).toISOString() },
      { id: 16, type: "assignment", locked: true, locked_reason: "not_available_yet", available_at: days(10).toISOString(), due_at: days(17).toISOString() },
    ]);
    expect((await h.call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ code: "not_available_yet" });
    expect((await h.call("GET", "/assignments/{assignment_id}", { params: ["16"], token })).body).toMatchObject({ code: "not_available_yet" });

    // The cohort's first day: the first lesson opens, the drip lesson three days later.
    h.state.now = new Date(days(10).getTime() + 60_000);
    const refreshed = (await h.call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).body as { access_token: string };
    expect((await h.call("GET", "/lessons/{lesson_id}", { params: ["12"], token: refreshed.access_token })).body).toMatchObject({ id: 12 });
    expect((await h.call("GET", "/lessons/{lesson_id}", { params: ["13"], token: refreshed.access_token })).body).toMatchObject({ code: "not_available_yet" });
    expect((await h.call("GET", "/assignments/{assignment_id}", { params: ["16"], token: refreshed.access_token })).body).toMatchObject({ due_at: days(17).toISOString() });
  });

  it("puts each student's cohort in the gradebook", async () => {
    const h = await hostedAcademy(withCohort);
    const { access_token: token, user } = await h.signUp();
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect(await h.store.setEnrollmentCohort({ appId: h.state.app.id, userId: user.id, courseId: 10, cohortId: 30 })).toBe(true);
    expect(await h.store.setEnrollmentCohort({ appId: h.state.app.id, userId: 999, courseId: 10, cohortId: 30 })).toBe(false);
    const rows = await courseReport(h.store, h.state.app, h.state.app.courseSetup!.courses[0]!);
    expect(rows.map((r) => r.cohortId)).toEqual([30]);
    const gone = { ...h.state.app.courseSetup!.courses[0]!, cohorts: [] };
    expect((await courseReport(h.store, h.state.app, gone)).map((r) => r.cohortId)).toEqual([null]);
  });
});

describe("112.5 grading in the Teacher tab", () => {
  it("lists the teacher's courses' assignments to grade and grades them", async () => {
    const h = await hostedAcademy(
      () => {
        const setup = academy();
        const course = setup.courses[0]!;
        course.teacherId = 1;
        course.topics[0]!.assignments = [{ id: 16, title: "Introduce yourself", instructions: "Write.", dueDays: null, maxPoints: 20, passPoints: 10 }];
        // Another teacher's course and assignment.
        setup.courses.push({ ...course, id: 50, title: "Someone else's", teacherId: 2, topics: [{ id: 51, title: "One", lessons: [], assignments: [{ id: 52, title: "Theirs", instructions: "Write.", dueDays: null, maxPoints: 10, passPoints: null }] }] });
        return setup;
      },
      { patch: { vertical: "instructors" }, plan: { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "instructors"] } },
    );
    const made = await h.store.createTeacher(
      { appId: h.state.app.id, name: "Salma Fathy", phone: "+905329998877", email: null, userId: null, photoAssetId: null, bio: "", subjects: ["Turkish"], status: "active", shareBp: 7000, featured: false },
      NOW,
    );
    if (!made.ok) throw new Error("teacher");
    expect(made.teacher.id).toBe(1);
    const other = await h.store.createTeacher({ appId: h.state.app.id, name: "Other", phone: "+905320000009", email: null, userId: null, photoAssetId: null, bio: "", subjects: ["X"], status: "active", shareBp: 5000, featured: false }, NOW);
    if (!other.ok) throw new Error("teacher");

    const student = await h.signUp();
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token: student.access_token });
    await h.call("PUT", "/assignments/{assignment_id}/submission", { params: ["16"], token: student.access_token, body: { text: "Merhaba!" } });
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["50"], token: student.access_token });
    await h.call("PUT", "/assignments/{assignment_id}/submission", { params: ["52"], token: student.access_token, body: { text: "Theirs" } });

    const teacher = await h.signUp("5329998877", "Salma Fathy");
    const waiting = (await h.call("GET", "/teacher/submissions", { token: teacher.access_token })).body as { total: number; items: { id: number }[] };
    expect(waiting).toMatchObject({ total: 1, items: [{ assignment_title: "Introduce yourself", student_name: "Deniz Aksoy", text: "Merhaba!", status: "submitted", max_points: 20 }] });
    const id = waiting.items[0]!.id;
    expect((await h.call("PUT", "/teacher/submissions/{submission_id}/grade", { params: [String(id)], token: teacher.access_token, body: { outcome: "grade", score: 25 } })).status).toBe(400);
    expect((await h.call("PUT", "/teacher/submissions/{submission_id}/grade", { params: [String(id)], token: teacher.access_token, body: { outcome: "return" } })).status).toBe(400);
    const graded = await h.call("PUT", "/teacher/submissions/{submission_id}/grade", { params: [String(id)], token: teacher.access_token, body: { outcome: "grade", score: 18, feedback: "Güzel!" } });
    expect(graded.body).toMatchObject({ status: "graded", score: 18, passed: true, feedback: "Güzel!" });
    expect((await h.call("GET", "/teacher/submissions", { token: teacher.access_token })).body).toMatchObject({ total: 0 });
    expect((await h.call("GET", "/teacher/submissions", { token: teacher.access_token, query: { status: "graded" } })).body).toMatchObject({ total: 1 });
    expect((await h.call("GET", "/teacher/submissions", { token: teacher.access_token, query: { status: "x" } })).status).toBe(400);
    // Another teacher's student's work isn't theirs to grade.
    const theirs = (await h.store.listAssignmentSubmissions({ appId: h.state.app.id, assignmentId: 52 }))[0]!;
    expect((await h.call("PUT", "/teacher/submissions/{submission_id}/grade", { params: [String(theirs.id)], token: teacher.access_token, body: { outcome: "grade", score: 5 } })).status).toBe(404);
    expect((await h.call("GET", "/assignments/{assignment_id}", { params: ["16"], token: student.access_token })).body).toMatchObject({ submission: { status: "graded", score: 18 } });
    // Students aren't teachers.
    expect((await h.call("GET", "/teacher/submissions", { token: student.access_token })).status).toBe(403);
  });
});

describe("112.5 coupons for paid courses", () => {
  it("checks a coupon, and the payment page's order charges the price less it", async () => {
    const h = await hostedAcademy(
      () => {
        const setup = academy();
        setup.courses[0]!.priceCents = 450_00;
        return setup;
      },
      { patch: { catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP", payment: encryptPaymentKeys("app", "sandbox-api", "sandbox-secret", true, KEY) } } },
    );
    await h.store.createCatalogCoupon({ appId: h.state.app.id, code: "WELCOME10", kind: "percent", value: 10, minOrderCents: null, endsAt: null, maxUses: 5, active: true, createdAt: NOW });
    await h.store.createCatalogCoupon({ appId: h.state.app.id, code: "FREE", kind: "percent", value: 100, minOrderCents: null, endsAt: null, maxUses: null, active: true, createdAt: NOW });
    const { access_token: token, user } = await h.signUp();
    expect((await h.call("GET", "/courses/{course_id}", { params: ["10"], token, query: { platform: "android" } })).body).toMatchObject({ purchase: { action: "checkout", coupons: true } });
    expect((await h.call("POST", "/courses/{course_id}/coupon", { params: ["10"], token, body: { code: " welcome10 " } })).body).toMatchObject({ code: "WELCOME10", status: "applied", discount: expect.stringContaining("45"), total: expect.stringContaining("405") });
    expect((await h.call("POST", "/courses/{course_id}/coupon", { params: ["10"], token, body: { code: "NOPE" } })).body).toMatchObject({ status: "invalid", message: "This coupon doesn't exist." });
    // 113.1 A coupon that takes the whole price applies: checking out with it enrols at once.
    expect((await h.call("POST", "/courses/{course_id}/coupon", { params: ["10"], token, body: { code: "FREE" } })).body).toMatchObject({ status: "applied", free: true });
    expect((await h.call("POST", "/auth/checkout-link", { token, query: { platform: "android" }, body: { course_id: 10, coupon: "NOPE" } })).body).toMatchObject({ code: "coupon_invalid" });
    const link = await h.call("POST", "/auth/checkout-link", { token, query: { platform: "android" }, body: { course_id: 10, coupon: "welcome10" } });
    expect(link.status).toBe(200);
    const { items } = await h.store.listCatalogOrders({ appId: h.state.app.id, userId: user.id, offset: 0, limit: 5 });
    expect(items[0]).toMatchObject({ subtotalCents: 450_00, totalCents: 405_00, couponCode: "WELCOME10", discountCents: 45_00 });
  });
});
