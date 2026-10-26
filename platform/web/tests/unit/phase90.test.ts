import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { parseCourse, parseLesson } from "@/lib/courses/forms";
import { accessEndsAt, certificateCode, courseProgress, lessonOpensAt, readCertificateCode, scoreQuiz, topicItems } from "@/lib/courses/learning";
import { deleteQuiz, parseQuestions, parseQuiz, questionsText, saveQuiz } from "@/lib/courses/quizzes";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, CourseQuiz, CourseSetup, QuizAttempt } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { expectContract } from "./contract";
import { days, NOW, setupClient } from "./helpers";

/**
 * 90.1 Academies without a website: quizzes at the end of sections, files
 * with lessons, lessons that open some days after enrolling, access that
 * ends, and certificates for students who finish.
 */

const SECRET = "test-certificate-secret";
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

const QUIZ: CourseQuiz = {
  id: 15,
  title: "Check yourself",
  passPercent: 50,
  attemptsAllowed: 2,
  timeLimitMinutes: 10,
  questions: [
    { id: 1, text: "Merhaba means…", type: "single_choice", options: [{ id: "a", text: "Hello", correct: true }, { id: "b", text: "Goodbye", correct: false }] },
    { id: 2, text: "Numbers", type: "multiple_choice", options: [{ id: "a", text: "bir", correct: true }, { id: "b", text: "iki", correct: true }, { id: "c", text: "kedi", correct: false }] },
  ],
};

function academy(): CourseSetup {
  return {
    currency: "TRY",
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
        accessDays: 30,
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [
          {
            id: 11,
            title: "Hello",
            lessons: [
              { id: 12, title: "Greetings", videoUrl: null, text: "Merhaba!", durationMinutes: 8, preview: false, attachments: [{ name: "Word list", url: "https://cdn.example.com/words.pdf" }] },
              { id: 13, title: "Numbers", videoUrl: null, text: "Bir, iki, üç.", durationMinutes: 5, preview: false, dripDays: 7 },
            ],
            quizzes: [QUIZ],
          },
        ],
      },
    ],
    nextId: 40,
  };
}

describe("90.1 learning rules", () => {
  it("opens drip lessons and ends access some days after enrolling", () => {
    expect(lessonOpensAt({}, NOW)).toBeNull();
    expect(lessonOpensAt({ dripDays: 0 }, NOW)).toBeNull();
    expect(lessonOpensAt({ dripDays: 3 }, NOW)).toEqual(days(3));
    expect(accessEndsAt({ accessDays: null }, NOW)).toBeNull();
    expect(accessEndsAt({ accessDays: 30 }, NOW)).toEqual(days(30));
  });

  it("counts a question only when exactly its right answers were chosen", () => {
    expect(scoreQuiz(QUIZ, { "1": ["a"], "2": ["a", "b"] })).toEqual({ scorePercent: 100, passed: true });
    expect(scoreQuiz(QUIZ, { "1": ["a"], "2": ["a"] })).toEqual({ scorePercent: 50, passed: true });
    expect(scoreQuiz(QUIZ, { "1": ["a", "b"], "2": ["a", "b", "c"] })).toEqual({ scorePercent: 0, passed: false });
    expect(scoreQuiz(QUIZ, {})).toEqual({ scorePercent: 0, passed: false });
  });

  it("puts a section's quizzes after its lessons and counts them in progress", () => {
    const course = academy().courses[0]!;
    expect(topicItems(course.topics[0]!).map((i) => i.kind)).toEqual(["lesson", "lesson", "quiz"]);
    const progress = new Map([
      [12, { appId: "a", userId: 1, courseId: 10, lessonId: 12, positionSeconds: 0, watchedPercent: 100, completedAt: days(1), updatedAt: days(1) }],
      [13, { appId: "a", userId: 1, courseId: 10, lessonId: 13, positionSeconds: 0, watchedPercent: 100, completedAt: days(8), updatedAt: days(8) }],
    ]);
    expect(courseProgress(course, progress, [])).toMatchObject({ completed_items: 2, total_items: 3, percent: 67, course_completed: false, completed_at: null });
    const passed = { quizId: 15, passed: true, submittedAt: days(9) } as QuizAttempt;
    const failed = { quizId: 15, passed: false, submittedAt: days(10) } as QuizAttempt;
    expect(courseProgress(course, progress, [failed])).toMatchObject({ course_completed: false });
    expect(courseProgress(course, progress, [passed, failed])).toMatchObject({ completed_items: 3, percent: 100, course_completed: true, completed_at: days(9).toISOString() });
  });

  it("signs certificate codes so they can't be made up", () => {
    const code = certificateCode(SECRET, "app-1", 7, 10);
    expect(readCertificateCode(SECRET, "app-1", code)).toEqual({ userId: 7, courseId: 10 });
    expect(readCertificateCode(SECRET, "app-2", code)).toBeNull();
    expect(readCertificateCode("another-secret", "app-1", code)).toBeNull();
    expect(readCertificateCode(SECRET, "app-1", code.replace(/^7-/, "8-"))).toBeNull();
    expect(readCertificateCode(SECRET, "app-1", "7-10-short")).toBeNull();
  });
});

describe("90.1 quizzes as the owner writes them", () => {
  const text = "Q: Which planet is the largest?\n- Mars\n* Jupiter\n\nQ: Pick the vowels\n* a\n- b\n* e\n\nQ: The sun is a star\n* True\n- False";

  it("reads questions, answers and their kind, and writes them back the same", () => {
    const parsed = parseQuestions(text);
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.questions.map((q) => q.type)).toEqual(["single_choice", "multiple_choice", "true_false"]);
    expect(parsed.questions[0]!.options).toEqual([
      { id: "a", text: "Mars", correct: false },
      { id: "b", text: "Jupiter", correct: true },
    ]);
    const quiz = parseQuiz({ title: "Space", passPercent: "", attemptsAllowed: "", timeLimit: "", questions: text });
    if (!quiz.ok) throw new Error("not parsed");
    expect(quiz.value).toMatchObject({ passPercent: 70, attemptsAllowed: null, timeLimitMinutes: null });
    expect(questionsText(quiz.value)).toBe(text);
  });

  it("says what's wrong", () => {
    expect(parseQuestions("")).toEqual({ error: "Write at least one question." });
    expect(parseQuestions("Q: Alone\n* Yes")).toEqual({ error: "“Alone” needs at least two answers." });
    expect(parseQuestions("Q: None right\n- a\n- b")).toEqual({ error: "Mark the right answer of “None right” with *." });
    expect(parseQuestions("* stray")).toMatchObject({ error: expect.stringContaining("Start each question with Q:") });
    expect(parseQuiz({ title: "x", passPercent: "101", attemptsAllowed: "0", timeLimit: "601", questions: "" })).toEqual({
      ok: false,
      errors: {
        title: "Enter a title of up to 120 characters.",
        passPercent: "Enter a pass mark from 1 to 100.",
        attemptsAllowed: "Enter 1 to 50 attempts, or leave it empty for no limit.",
        timeLimit: "Enter 1 to 600 minutes, or leave it empty for no time limit.",
        questions: "Write at least one question.",
      },
    });
  });

  it("adds, saves and deletes a section's quiz", () => {
    const setup = academy();
    const added = saveQuiz(setup, 10, 11, { title: "Final", passPercent: "80", attemptsAllowed: "3", timeLimit: "15", questions: text });
    if (!added.ok) throw new Error("not added");
    expect(added).toMatchObject({ added: true, quiz: { id: 40, title: "Final", passPercent: 80, attemptsAllowed: 3, timeLimitMinutes: 15 } });
    expect(added.setup.nextId).toBe(41);
    const saved = saveQuiz(added.setup, 10, 11, { id: "40", title: "Final exam", passPercent: "80", questions: text });
    if (!saved.ok) throw new Error("not saved");
    expect(saved.added).toBe(false);
    expect(saved.setup.courses[0]!.topics[0]!.quizzes!.map((q) => q.title)).toEqual(["Check yourself", "Final exam"]);
    expect(saveQuiz(setup, 10, 99, { title: "Final", questions: text })).toEqual({ ok: false, message: "This section no longer exists." });
    expect(saveQuiz(setup, 10, 11, { id: "99", title: "Final", questions: text })).toEqual({ ok: false, message: "This quiz no longer exists." });
    expect(deleteQuiz(saved.setup, 10, 15).courses[0]!.topics[0]!.quizzes!.map((q) => q.id)).toEqual([40]);
  });

  it("reads the course and lesson settings", () => {
    const course = parseCourse({ title: "Turkish", certificate: "on", accessDays: "90" }, academy(), []);
    expect(course).toMatchObject({ ok: true, value: { certificate: true, accessDays: 90 } });
    expect(parseCourse({ title: "Turkish", accessDays: "0" }, academy(), [])).toMatchObject({ ok: false, errors: { accessDays: expect.any(String) } });
    expect(parseCourse({ title: "Turkish" }, academy(), [])).toMatchObject({ ok: true, value: { certificate: false, accessDays: null } });

    const media = (url: string) => url.startsWith("https://yallapp.test/m/");
    const lesson = parseLesson({ title: "Greetings", text: "Hi", dripDays: "7", attachments: "Word list | https://cdn.example.com/words.pdf\nhttps://yallapp.test/m/slides.pdf" }, media);
    expect(lesson).toMatchObject({
      ok: true,
      value: {
        dripDays: 7,
        attachments: [
          { name: "Word list", url: "https://cdn.example.com/words.pdf" },
          { name: "slides.pdf", url: "https://yallapp.test/m/slides.pdf" },
        ],
      },
    });
    expect(parseLesson({ title: "Greetings", text: "Hi", dripDays: "", attachments: "" })).toMatchObject({ ok: true, value: { title: "Greetings" } });
    expect((parseLesson({ title: "Greetings", text: "Hi" }) as { value: object }).value).not.toHaveProperty("dripDays");
    expect(parseLesson({ title: "Greetings", text: "Hi", attachments: "Notes | http://insecure.example.com/a.pdf" })).toMatchObject({ ok: false, errors: { attachments: expect.any(String) } });
    expect(parseLesson({ title: "Greetings", text: "Hi", dripDays: "400" })).toMatchObject({ ok: false, errors: { dripDays: expect.any(String) } });
  });

  it("has every new dashboard text in English, Arabic and Turkish", () => {
    for (const lang of ["ar", "tr"] as const) {
      const t = getDashT(lang);
      for (const key of ["courses.certificate", "courses.accessDays", "courses.dripDays", "courses.files", "courses.addQuizTo", "courses.questionsHint", "courses.deleteQuiz"] as const) {
        expect(t(key)).not.toBe(getDashT("en")(key));
      }
      const known = knownTranslator(lang);
      expect(known("“Alone” needs at least two answers.")).not.toBe("“Alone” needs at least two answers.");
      expect(known("Enter a pass mark from 1 to 100.")).not.toBe("Enter a pass mark from 1 to 100.");
    }
  });
});

describe("90.1 on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "lms");
    app = { ...base, backend: "hosted", appName: "Lale Academy", websiteDoneAt: NOW, connector: { kind: "courses" }, courseSetup: academy() };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CoursesConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test", signingSecret: SECRET }),
  });

  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; params?: string[]; query?: Record<string, string> } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp() {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+905321234567")!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Deniz Aksoy", device: DEVICE } });
    return registered.body as { access_token: string; refresh_token: string; user: { id: number } };
  }

  /** Later, with a fresh access token (they last 15 minutes). */
  async function later(to: Date, session: { refresh_token: string }) {
    now = to;
    const refreshed = (await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).body as { access_token: string; refresh_token: string };
    session.refresh_token = refreshed.refresh_token;
    return refreshed.access_token;
  }

  it("turns on quizzes and certificates in the config", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { features: Record<string, unknown> };
    expect(config.features).toMatchObject({ quizzes: true, certificates: true });
  });

  it("takes the student from enrolling to the certificate, then closes the course when access ends", async () => {
    const session = await signUp();
    const { user } = session;
    let token = session.access_token;
    expect((await call("GET", "/quizzes/{quiz_id}", { params: ["15"], token })).body).toMatchObject({ code: "not_enrolled" });
    const enrolled = (await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token })).body;
    const ends = new Date(now.getTime() + 30 * 86_400_000).toISOString();
    expect(enrolled).toMatchObject({ course_id: 10, access_ends_at: ends });

    // The curriculum: the drip lesson is locked until day 7, the quiz comes after the lessons.
    const curriculum = (await call("GET", "/courses/{course_id}/curriculum", { params: ["10"], token })).body as { topics: { items: Record<string, unknown>[] }[] };
    expect(curriculum.topics[0]!.items).toMatchObject([
      { id: 12, type: "lesson", locked: false },
      { id: 13, type: "lesson", locked: true, available_at: new Date(now.getTime() + 7 * 86_400_000).toISOString() },
      { id: 15, type: "quiz", locked: false },
    ]);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({
      attachments: [{ name: "Word list", url: "https://cdn.example.com/words.pdf", size_bytes: null, mime_type: null }],
    });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["13"], token })).body).toMatchObject({ code: "not_available_yet" });

    // The quiz: the right answers never leave the platform.
    expect((await call("GET", "/quizzes/{quiz_id}", { params: ["15"], token })).body).toMatchObject({ question_count: 2, pass_percent: 50, attempts_allowed: 2, attempts_used: 0, time_limit_seconds: 600 });
    const first = await call("POST", "/quizzes/{quiz_id}/attempts", { params: ["15"], token });
    expect(first.status).toBe(201);
    expect(JSON.stringify(first.body)).not.toContain("correct");
    const firstId = (first.body as { id: number }).id;
    const failed = await call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", { params: ["15", String(firstId)], token, body: { answers: [{ question_id: 1, option_ids: ["b"] }] } });
    expect(failed.body).toMatchObject({ status: "failed", score_percent: 0 });
    expect((await call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", { params: ["15", String(firstId)], token, body: { answers: [] } })).status).toBe(409);

    token = await later(days(8), session);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["13"], token })).body).toMatchObject({ id: 13 });
    await call("POST", "/lessons/{lesson_id}/complete", { params: ["12"], token });
    await call("POST", "/lessons/{lesson_id}/complete", { params: ["13"], token });
    expect((await call("GET", "/me/certificates", { token })).body).toEqual({ items: [] });

    const second = (await call("POST", "/quizzes/{quiz_id}/attempts", { params: ["15"], token })).body as { id: number };
    const passed = await call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", {
      params: ["15", String(second.id)],
      token,
      body: { answers: [{ question_id: 1, option_ids: ["a"] }, { question_id: 2, option_ids: ["b", "a"] }] },
    });
    expect(passed.body).toMatchObject({ status: "passed", score_percent: 100 });
    // Both attempts are used.
    expect((await call("POST", "/quizzes/{quiz_id}/attempts", { params: ["15"], token })).status).toBe(409);
    expect((await call("GET", "/me/quiz-attempts", { token })).body).toMatchObject({ total: 2 });

    const code = certificateCode(SECRET, app.id, user.id, 10);
    const url = `https://yallapp.test/a/${app.id}/certificate/${code}`;
    expect((await call("GET", "/me/certificates", { token })).body).toEqual({ items: [{ course_id: 10, course_title: "Turkish for Beginners", url, issued_at: days(8).toISOString() }] });
    expect((await call("GET", "/me/courses", { token, query: { status: "completed" } })).body).toMatchObject({ items: [{ progress: { course_completed: true }, certificate_url: url, access_ends_at: ends }] });

    // After 30 days the course closes.
    token = await later(days(31), session);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ code: "access_ended" });
    expect((await call("GET", "/quizzes/{quiz_id}", { params: ["15"], token })).body).toMatchObject({ code: "access_ended" });
  });

  it("checks the answers it gets", async () => {
    const { access_token: token } = await signUp();
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    const attempt = (await call("POST", "/quizzes/{quiz_id}/attempts", { params: ["15"], token })).body as { id: number };
    expect((await call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", { params: ["15", String(attempt.id)], token, body: { answers: "a" } })).status).toBe(400);
    expect((await call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", { params: ["15", "999"], token, body: { answers: [] } })).status).toBe(404);
    expect((await call("GET", "/quizzes/{quiz_id}", { params: ["99"], token })).status).toBe(404);
    expect((await call("GET", "/quizzes/{quiz_id}", { params: ["15"] })).status).toBe(401);
  });
});
