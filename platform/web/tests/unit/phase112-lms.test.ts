import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { encrypt } from "@/lib/crypto/encryption";
import { assignmentValues, deleteItem, liveValues, moveItem, moveTopic, parseAssignment, parseLive, renameTopic, saveAssignment, saveLive } from "@/lib/courses/builder";
import { parseCourse, parseLesson } from "@/lib/courses/forms";
import { parseGrade, parsePhones } from "@/lib/courses/grading";
import { courseInsights } from "@/lib/courses/insights";
import { courseProgress, foldAnswer, lessonOpensAt, scoreQuiz, shuffled, topicItems, waitingForPrevious } from "@/lib/courses/learning";
import { parseQuestions, parseQuiz, questionsText } from "@/lib/courses/quizzes";
import { assignmentSummaries, atRisk, courseReport, courseReportCsv } from "@/lib/courses/report";
import { lessonsOf } from "@/lib/courses/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App, AssignmentSubmission, Course, CourseQuiz, CourseSetup, LessonProgress } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { notifyGraded, runAutoNotifications } from "@/lib/hosted/auto-notifications";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { sendPush } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { expectContract } from "./contract";
import { days, KEY, NOW, setupClient } from "./helpers";

/**
 * 112.5 The academy's LMS: the course builder (items in order, sections
 * moved and renamed, lessons that open on a day, courses taken in order),
 * quizzes with written answers, shuffled and reviewed, assignments handed in
 * and graded, live classes, the gradebook, students at risk, many students
 * at once and the course at a glance.
 */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const MINUTE = 60_000;

const QUIZ: CourseQuiz = {
  id: 15,
  title: "Check yourself",
  passPercent: 50,
  attemptsAllowed: null,
  timeLimitMinutes: null,
  shuffle: true,
  showAnswers: true,
  questions: [
    { id: 1, text: "Merhaba means…", type: "single_choice", options: [{ id: "a", text: "Hello", correct: true }, { id: "b", text: "Goodbye", correct: false }, { id: "c", text: "Thanks", correct: false }] },
    { id: 2, text: "Write “thank you” in Turkish", type: "short_answer", options: [], accepted: ["Teşekkürler", "Teşekkür ederim"] },
  ],
};

function academy(): CourseSetup {
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
        sequential: true,
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [
          {
            id: 11,
            title: "Hello",
            lessons: [
              { id: 12, title: "Greetings", videoUrl: null, text: "Merhaba!", durationMinutes: 8, preview: false },
              { id: 13, title: "Numbers", videoUrl: null, text: "Bir, iki, üç.", durationMinutes: 5, preview: false },
            ],
            quizzes: [QUIZ],
            assignments: [{ id: 16, title: "Introduce yourself", instructions: "Write three sentences about you.", dueDays: 7, maxPoints: 20, passPoints: 10 }],
            live: [{ id: 17, title: "Speaking club", startsAt: new Date(NOW.getTime() + 3 * 3_600_000).toISOString(), durationMinutes: 60, meetingUrl: "https://meet.example.com/abc", notes: "Bring questions." }],
            // The owner's order: the live class first, then the quiz before the second lesson.
            order: [17, 12, 15, 13, 16],
          },
        ],
      },
    ],
    nextId: 40,
  };
}

const course = (): Course => academy().courses[0]!;

describe("112.5 the course builder", () => {
  it("keeps the owner's order of a section's items, and moves items and sections", () => {
    expect(topicItems(course().topics[0]!).map((it) => `${it.kind}:${it.id}`)).toEqual(["live:17", "lesson:12", "quiz:15", "lesson:13", "assignment:16"]);
    expect(lessonsOf(course()).map((l) => l.id)).toEqual([12, 13]);
    // Without an order: lessons, quizzes, assignments, live classes.
    const plain = { ...course().topics[0]!, order: undefined };
    expect(topicItems(plain).map((it) => it.id)).toEqual([12, 13, 15, 16, 17]);

    const moved = moveItem(academy(), 10, 11, 16, -1)!;
    expect(moved.courses[0]!.topics[0]!.order).toEqual([17, 12, 15, 16, 13]);
    expect(moveItem(academy(), 10, 11, 17, -1)).toBeNull();
    expect(moveItem(academy(), 10, 11, 99, 1)).toBeNull();

    const two = { ...academy(), courses: [{ ...course(), topics: [...course().topics, { id: 30, title: "Food", lessons: [] }] }] };
    expect(moveTopic(two, 10, 30, -1)!.courses[0]!.topics.map((t) => t.id)).toEqual([30, 11]);
    expect(moveTopic(two, 10, 11, -1)).toBeNull();
    expect(renameTopic(two, 10, 30, "  Food and drink ")).toMatchObject({ ok: true, setup: { courses: [{ topics: [{ id: 11 }, { title: "Food and drink" }] }] } });
    expect(renameTopic(two, 10, 30, "F")).toMatchObject({ ok: false, errors: { title: expect.any(String) } });

    const gone = deleteItem(academy(), 10, 16).courses[0]!.topics[0]!;
    expect(gone.assignments).toEqual([]);
    expect(gone.order).toEqual([17, 12, 15, 13]);
  });

  it("adds assignments and live classes in the app's time zone, and writes them back the same", () => {
    const zone = "Africa/Cairo";
    expect(parseAssignment({ title: "", instructions: "x", maxPoints: "0", passPoints: "5", dueDays: "999", dueOn: "tomorrow" }, zone)).toMatchObject({
      ok: false,
      errors: { title: expect.any(String), instructions: expect.any(String), maxPoints: expect.any(String), dueDays: expect.any(String), dueOn: expect.any(String) },
    });
    expect(parseAssignment({ title: "Essay", instructions: "Write it.", maxPoints: "10", passPoints: "11" }, zone)).toMatchObject({ ok: false, errors: { passPoints: expect.any(String) } });
    const saved = saveAssignment(academy(), 10, 11, { title: "Essay", instructions: "Write 200 words.", maxPoints: "", passPoints: "60", dueDays: "", dueOn: "2026-10-20" }, zone);
    expect(saved).toMatchObject({ ok: true, added: true, item: { id: 40, maxPoints: 100, passPoints: 60, dueDays: null, dueAt: "2026-10-20T20:59:00.000Z" } });
    if (!saved.ok) throw new Error("not saved");
    expect(saved.setup.nextId).toBe(41);
    expect(assignmentValues(saved.item, zone)).toMatchObject({ dueOn: "2026-10-20", maxPoints: "100", passPoints: "60" });

    expect(parseLive({ title: "Club", date: "2026-10-20", time: "", duration: "2", meetingUrl: "http://zoom.example.com" }, zone)).toMatchObject({
      ok: false,
      errors: { date: expect.any(String), duration: expect.any(String), meetingUrl: expect.any(String) },
    });
    const live = saveLive(academy(), 10, 11, { title: "Club", date: "2026-10-20", time: "19:30", duration: "45", meetingUrl: "https://zoom.us/j/123", notes: "" }, zone);
    expect(live).toMatchObject({ ok: true, item: { startsAt: "2026-10-20T16:30:00.000Z", durationMinutes: 45 } });
    if (!live.ok) throw new Error("not saved");
    expect(liveValues(live.item, zone)).toMatchObject({ date: "2026-10-20", time: "19:30", duration: "45" });
    expect(saveLive(academy(), 10, 99, { title: "Club", date: "2026-10-20", time: "19:30", meetingUrl: "https://zoom.us/j/1" }, zone)).toMatchObject({ ok: false, message: expect.any(String) });
  });

  it("opens a lesson on a day, the later of that day and its drip days", () => {
    const parsed = parseLesson({ title: "Numbers", text: "Bir", opensOn: "2026-10-15" }, () => false, "Europe/Istanbul");
    expect(parsed).toMatchObject({ ok: true, value: { opensAt: "2026-10-14T21:00:00.000Z" } });
    expect(parseLesson({ title: "Numbers", text: "Bir", opensOn: "15/10" })).toMatchObject({ ok: false, errors: { opensOn: expect.any(String) } });
    expect(lessonOpensAt({ opensAt: "2026-10-15T00:00:00.000Z" }, NOW)).toEqual(new Date("2026-10-15T00:00:00.000Z"));
    expect(lessonOpensAt({ opensAt: "2026-10-15T00:00:00.000Z", dripDays: 10 }, NOW)).toEqual(days(10));
    expect(parseCourse({ title: "Course", sequential: "on", certificateSigner: "Dr. Sara Adel" }, academy(), [])).toMatchObject({ ok: true, value: { sequential: true, certificateSigner: "Dr. Sara Adel" } });
  });

  it("opens each item of a course taken in order once the one before is done; live classes don't wait", () => {
    const progress = new Map<number, LessonProgress>();
    expect([...waitingForPrevious(course(), { progress, attempts: [] })]).toEqual([15, 13, 16]);
    progress.set(12, { appId: "a", userId: 1, courseId: 10, lessonId: 12, positionSeconds: 0, completedAt: NOW, updatedAt: NOW });
    expect([...waitingForPrevious(course(), { progress, attempts: [] })]).toEqual([13, 16]);
    expect(waitingForPrevious({ ...course(), sequential: false }, { progress, attempts: [] }).size).toBe(0);
  });
});

describe("112.5 quizzes", () => {
  it("reads written answers and the quiz's choices, and writes them back the same", () => {
    const text = "Q: Capital of France?\n= Paris\n= paris city\n\nQ: 2 + 2?\n- 3\n* 4";
    const parsed = parseQuestions(text);
    expect(parsed).toMatchObject({ questions: [{ type: "short_answer", options: [], accepted: ["Paris", "paris city"] }, { type: "single_choice" }] });
    expect(questionsText({ questions: (parsed as { questions: CourseQuiz["questions"] }).questions })).toBe(text);
    expect(parseQuestions("Q: Mixed?\n* a\n= b")).toMatchObject({ error: expect.stringContaining("either") });
    expect(parseQuiz({ title: "Quiz", passPercent: "50", questions: text, shuffle: "on", showAnswers: "" })).toMatchObject({ ok: true, value: { shuffle: true, showAnswers: false } });
  });

  it("matches written answers without capitals, accents or extra spaces, and shuffles the same way for an attempt", () => {
    expect(foldAnswer("  TEŞEKKÜRLER! ")).toBe("tesekkurler");
    expect(foldAnswer("أَهْلًا")).toBe(foldAnswer("اهلا"));
    expect(scoreQuiz(QUIZ, { "1": ["a"], "2": ["tesekkur ederim"] })).toEqual({ scorePercent: 100, passed: true });
    expect(scoreQuiz(QUIZ, { "1": ["a"], "2": [""] })).toEqual({ scorePercent: 50, passed: true });
    expect(shuffled([1, 2, 3, 4, 5, 6], "7")).toEqual(shuffled([1, 2, 3, 4, 5, 6], "7"));
    expect([...shuffled([1, 2, 3, 4, 5, 6], "7")].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("112.5 grading and students", () => {
  it("grades within the highest score, and needs a note to send it back", () => {
    expect(parseGrade({ score: "21", outcome: "grade" }, { maxPoints: 20 })).toMatchObject({ ok: false, errors: { score: "Enter a score from 0 to 20." } });
    expect(parseGrade({ score: "18", feedback: " Well done ", outcome: "grade" }, { maxPoints: 20 })).toEqual({ ok: true, value: { status: "graded", score: 18, feedback: "Well done" } });
    expect(parseGrade({ outcome: "return" }, { maxPoints: 20 })).toMatchObject({ ok: false, errors: { feedback: expect.any(String) } });
    expect(parseGrade({ outcome: "return", feedback: "Add a sentence." }, { maxPoints: 20 })).toEqual({ ok: true, value: { status: "returned", score: null, feedback: "Add a sentence." } });
  });

  it("reads phone numbers pasted from a sheet, each once", () => {
    const read = parsePhones("+90 532 123 45 67\n0532 123 45 67, 05329998877;\n", "+90");
    expect(read).toMatchObject({ ok: true, value: [{ e164: "+905321234567" }, { e164: "+905329998877" }] });
    expect(parsePhones("  ", "+90")).toMatchObject({ ok: false });
    expect(parsePhones("+90 532 123 45 67\nhello", "+90")).toMatchObject({ ok: false, error: expect.stringContaining("hello") });
  });
});

describe("112.5 on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let uploads: boolean;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "lms");
    app = { ...base, backend: "hosted", appName: "Lale Academy", websiteDoneAt: NOW, connector: { kind: "courses" }, courseSetup: academy() };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    uploads = false;
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
    connector: new CoursesConnector({
      store,
      app,
      assetUrl: (id) => id,
      platformUrl: "https://yallapp.test",
      signingSecret: "test-certificate-secret",
      ...(uploads ? { uploads: { storage: {} as never, chunkBytes: 5 * 1024 * 1024, limitBytes: async () => null } } : {}),
    }),
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

  async function later(to: Date, session: { refresh_token: string }) {
    now = to;
    const refreshed = (await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).body as { access_token: string; refresh_token: string };
    session.refresh_token = refreshed.refresh_token;
    return refreshed.access_token;
  }

  it("turns on assignments and live classes in the config", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { features: Record<string, unknown> };
    expect(config.features).toMatchObject({ assignments: true, live_classes: true });
  });

  it("takes a student through a course in order: lessons, a reviewed quiz with a written answer, an assignment graded, the certificate", async () => {
    const session = await signUp();
    let token = session.access_token;
    const curriculum = async () => ((await call("GET", "/courses/{course_id}/curriculum", { params: ["10"], token })).body as { topics: { items: Record<string, unknown>[] }[] }).topics[0]!.items;
    expect(await curriculum()).toMatchObject([
      { id: 17, type: "live", locked: true, locked_reason: "not_enrolled" },
      { id: 12, type: "lesson", locked: true, locked_reason: "not_enrolled" },
      { id: 15, type: "quiz" },
      { id: 13, type: "lesson" },
      { id: 16, type: "assignment" },
    ]);
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect(await curriculum()).toMatchObject([
      { id: 17, type: "live", locked: false, in_app: true, starts_at: new Date(NOW.getTime() + 3 * 3_600_000).toISOString() },
      { id: 12, locked: false, locked_reason: null },
      { id: 15, locked: true, locked_reason: "previous_not_done" },
      { id: 13, locked: true, locked_reason: "previous_not_done" },
      { id: 16, type: "assignment", locked: true, locked_reason: "previous_not_done", in_app: true, due_at: days(7, now).toISOString() },
    ]);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["13"], token })).body).toMatchObject({ code: "previous_not_done" });
    expect((await call("POST", "/quizzes/{quiz_id}/attempts", { params: ["15"], token })).body).toMatchObject({ code: "previous_not_done" });
    await call("POST", "/lessons/{lesson_id}/complete", { params: ["12"], token });

    // The quiz: shuffled for the attempt, the same each time; a written answer; the review after it.
    const attempt = (await call("POST", "/quizzes/{quiz_id}/attempts", { params: ["15"], token })).body as { id: number; questions: { id: number; type: string; options: { id: string }[] }[] };
    expect(attempt.questions.map((q) => q.id).sort()).toEqual([1, 2]);
    expect(attempt.questions.find((q) => q.id === 2)).toMatchObject({ type: "short_answer", options: [] });
    expect(JSON.stringify(attempt)).not.toMatch(/Teşekkür|correct|accepted/);
    const result = await call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", {
      params: ["15", String(attempt.id)],
      token,
      body: { answers: [{ question_id: 1, option_ids: ["b"] }, { question_id: 2, text: "teşekkürler" }] },
    });
    expect(result.body).toMatchObject({
      status: "passed",
      score_percent: 50,
      review: [
        { question_id: 1, correct: false, chosen_option_ids: ["b"], right_option_ids: ["a"], text: null },
        { question_id: 2, type: "short_answer", correct: true, text: "teşekkürler", accepted_answers: ["Teşekkürler", "Teşekkür ederim"] },
      ],
    });
    expect((await call("GET", "/quizzes/{quiz_id}", { params: ["15"], token })).body).toMatchObject({ last_result: { review: [{ question_id: 1 }, { question_id: 2 }] } });
    await call("POST", "/lessons/{lesson_id}/complete", { params: ["13"], token });

    // The assignment: handed in, a file refused without uploads, graded below the pass score, sent back, handed in again, graded.
    expect((await call("GET", "/assignments/{assignment_id}", { params: ["16"], token })).body).toMatchObject({
      title: "Introduce yourself",
      max_points: 20,
      pass_points: 10,
      accepts_files: false,
      can_submit: true,
      submission: null,
    });
    expect((await call("PUT", "/assignments/{assignment_id}/submission", { params: ["16"], token, body: {} })).status).toBe(400);
    expect((await call("PUT", "/assignments/{assignment_id}/submission", { params: ["16"], token, body: { upload_id: "00000000-0000-4000-8000-000000000000" } })).status).toBe(400);
    expect((await call("POST", "/course-uploads", { token, body: { name: "a.pdf", size: 10, type: "application/pdf" } })).status).toBe(503);
    token = await later(days(8), session);
    const handed = await call("PUT", "/assignments/{assignment_id}/submission", { params: ["16"], token, body: { text: "Merhaba, ben Deniz." } });
    expect(handed.body).toMatchObject({ submission: { status: "submitted", text: "Merhaba, ben Deniz.", score: null, late: true, file: null }, can_submit: true });
    const [submission] = await store.listAssignmentSubmissions({ appId: app.id, courseId: 10 });
    await store.gradeAssignmentSubmission(app.id, submission!.id, { status: "returned", score: null, feedback: "Add one more sentence.", gradedAt: now, gradedBy: "Owner" });
    expect((await call("GET", "/assignments/{assignment_id}", { params: ["16"], token })).body).toMatchObject({ submission: { status: "returned", feedback: "Add one more sentence." }, can_submit: true });
    await call("PUT", "/assignments/{assignment_id}/submission", { params: ["16"], token, body: { text: "Merhaba, ben Deniz. İstanbul'dayım." } });
    await store.gradeAssignmentSubmission(app.id, submission!.id, { status: "graded", score: 18, feedback: "Great.", gradedAt: now, gradedBy: "Owner" });
    expect((await call("GET", "/assignments/{assignment_id}", { params: ["16"], token })).body).toMatchObject({ submission: { id: submission!.id, status: "graded", score: 18, passed: true }, can_submit: false });
    expect((await call("PUT", "/assignments/{assignment_id}/submission", { params: ["16"], token, body: { text: "Again" } })).body).toMatchObject({ code: "already_graded" });

    // Finished: every lesson, the quiz and the assignment; the certificate.
    expect((await call("GET", "/me/courses", { token, query: { status: "completed" } })).body).toMatchObject({ items: [{ progress: { course_completed: true, total_items: 4, completed_items: 4 } }] });
    expect(((await call("GET", "/me/certificates", { token })).body as { items: unknown[] }).items).toHaveLength(1);

    // Starting again clears the assignment too.
    await call("POST", "/courses/{course_id}/restart", { params: ["10"], token });
    expect(await store.listAssignmentSubmissions({ appId: app.id, courseId: 10 })).toEqual([]);
  });

  it("gives the meeting link from 15 minutes before a live class, and lists the student's live classes", async () => {
    const session = await signUp();
    let token = session.access_token;
    expect((await call("GET", "/live-sessions/{live_id}", { params: ["17"], token })).body).toMatchObject({ code: "not_enrolled" });
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect((await call("GET", "/live-sessions/{live_id}", { params: ["17"], token })).body).toMatchObject({ status: "upcoming", join_url: null, notes: "Bring questions.", recording_url: null });
    expect((await call("GET", "/me/live-sessions", { token })).body).toMatchObject({ total: 1, items: [{ id: 17, course_title: "Turkish for Beginners" }] });
    expect((await call("GET", "/me/live-sessions", { token, query: { when: "past" } })).body).toMatchObject({ total: 0 });
    token = await later(new Date(NOW.getTime() + 3 * 3_600_000 - 10 * MINUTE), session);
    expect((await call("GET", "/live-sessions/{live_id}", { params: ["17"], token })).body).toMatchObject({ status: "upcoming", join_url: "https://meet.example.com/abc" });
    token = await later(new Date(NOW.getTime() + 3 * 3_600_000 + 30 * MINUTE), session);
    expect((await call("GET", "/live-sessions/{live_id}", { params: ["17"], token })).body).toMatchObject({ status: "live", join_url: "https://meet.example.com/abc" });
    app = { ...app, courseSetup: { ...academy(), courses: [{ ...course(), topics: [{ ...course().topics[0]!, live: [{ ...course().topics[0]!.live![0]!, recordingUrl: "https://cdn.example.com/club.mp4" }] }] }] } };
    token = await later(new Date(NOW.getTime() + 5 * 3_600_000), session);
    expect((await call("GET", "/live-sessions/{live_id}", { params: ["17"], token })).body).toMatchObject({ status: "ended", join_url: null, recording_url: "https://cdn.example.com/club.mp4" });
    expect((await call("GET", "/me/live-sessions", { token, query: { when: "past" } })).body).toMatchObject({ total: 1 });
    expect((await call("GET", "/me/live-sessions", { token, query: { when: "soon" } })).status).toBe(400);
    expect((await call("GET", "/live-sessions/{live_id}", { params: ["99"], token })).status).toBe(404);
  });

  it("starts an upload for a photo or a PDF only, for the courses' students", async () => {
    uploads = true;
    const { access_token: token } = await signUp();
    expect((await call("POST", "/course-uploads", { token, body: { name: "a.pdf", size: 10, type: "application/pdf" } })).body).toMatchObject({ code: "not_enrolled" });
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect((await call("POST", "/course-uploads", { token, body: { name: "a.zip", size: 10, type: "application/zip" } })).status).toBe(400);
    expect((await call("POST", "/course-uploads/{upload_id}/complete", { params: ["00000000-0000-4000-8000-000000000000"], token })).status).toBe(404);
  });
});

describe("112.5 the gradebook and the course at a glance", () => {
  it("lists each student's assignments, who is at risk, the CSV file and the course's numbers", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app: App = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", connector: { kind: "courses" }, courseSetup: academy() };
    await store.createApp(app);
    const add = async (phone: string, name: string) => (await store.createHostedUser({ appId: app.id, phone, name, email: null, city: null, now: NOW }))!;
    const active = await add("+905320000001", "Ayla");
    const quiet = await add("+905320000002", "Burak");
    await store.enrollInCourse({ appId: app.id, userId: active.id, courseId: 10, source: "free", enrolledAt: days(-20) });
    await store.enrollInCourse({ appId: app.id, userId: quiet.id, courseId: 10, source: "manual", enrolledAt: days(-20) });
    await store.saveLessonProgress({ appId: app.id, userId: active.id, courseId: 10, lessonId: 12, positionSeconds: 40, completedAt: days(-1), updatedAt: days(-1) });
    await store.saveLessonProgress({ appId: app.id, userId: quiet.id, courseId: 10, lessonId: 12, positionSeconds: 10, completedAt: null, updatedAt: days(-10) });
    const handedIn: Omit<AssignmentSubmission, "id"> = { appId: app.id, userId: active.id, courseId: 10, assignmentId: 16, text: "Hi", file: null, status: "graded", score: 15, feedback: null, submittedAt: days(-1), gradedAt: NOW, gradedBy: "Owner" };
    await store.saveAssignmentSubmission(handedIn);
    await store.saveAssignmentSubmission({ ...handedIn, userId: quiet.id, status: "submitted", score: null, gradedAt: null, gradedBy: null });

    const rows = await courseReport(store, app, course());
    const ayla = rows.find((r) => r.userId === active.id)!;
    const burak = rows.find((r) => r.userId === quiet.id)!;
    expect(ayla.assignments).toEqual([{ assignmentId: 16, title: "Introduce yourself", status: "graded", score: 15, maxPoints: 20, passed: true }]);
    expect(burak.assignments[0]).toMatchObject({ status: "submitted", passed: false });
    expect([atRisk(ayla, NOW), atRisk(burak, NOW)]).toEqual([false, false]);
    expect(atRisk({ ...burak, lastActivity: days(-10) }, NOW)).toBe(true);
    expect(atRisk({ ...burak, lastActivity: null }, NOW)).toBe(true);
    expect(assignmentSummaries(course(), rows)).toEqual([{ assignmentId: 16, title: "Introduce yourself", handedIn: 2, waiting: 1, averagePercent: 75 }]);
    const csv = courseReportCsv(course(), rows).split("\r\n");
    expect(csv[0]).toContain("Introduce yourself");
    expect(csv.find((line) => line.startsWith("Ayla"))).toContain("15/20");
    expect(csv.find((line) => line.startsWith("Burak"))).toContain("to grade");
    expect(courseReportCsv(course(), rows, knownTranslator("ar"))).toContain("بانتظار التقييم");

    const insights = await courseInsights(store, app, academy(), course(), rows, NOW);
    expect(insights).toMatchObject({ students: 2, newStudents30: 2, finished: 0, completionRate: 0, lessons: [{ lessonId: 12, started: 2, completed: 1 }] });
    expect(courseProgress(course(), new Map(), [], [{ ...handedIn, id: 1 }])).toMatchObject({ completed_items: 1, total_items: 4 });
  });
});

describe("112.5 live class reminders and grades in the app's notifications", () => {
  async function setup() {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Owner", email: "owner-lms@auto.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const account = JSON.stringify({
      type: "service_account",
      project_id: "lms-test",
      client_email: "push@lms-test.iam.gserviceaccount.com",
      private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    });
    const base = newApp(client.id, null, NOW, "lms");
    const app: App = { ...base, backend: "hosted", connector: { kind: "courses" }, courseSetup: academy(), firebaseServiceAccountEncrypted: encrypt(account, KEY, `${SERVICE_ACCOUNT_CONTEXT}:${base.id}`) };
    await store.createApp(app);
    if (!(await store.getLicenseForApp(client.id, app.id))) await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const user = (await store.createHostedUser({ appId: app.id, phone: "+905350000001", name: "Ayla", email: null, city: null, now: NOW }))!;
    await store.createHostedDevice({ id: "row-1", appId: app.id, userId: user.id, deviceId: "install-1", platform: "android", name: "Phone", appVersion: "1.0.0", pushToken: "tok-1", pushPreferences: null, language: "tr", country: null, createdAt: NOW, lastSeenAt: NOW });
    await store.enrollInCourse({ appId: app.id, userId: user.id, courseId: 10, source: "free", enrolledAt: NOW });
    const pushes: { title: string; body: string; data: Record<string, string> }[] = [];
    const send = (async (_account, targets, message) => {
      pushes.push({ title: message.title, body: message.body, data: message.data });
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush;
    return { store, app, user, pushes, deps: (at: Date) => ({ store, key: KEY, now: at, send }) };
  }

  it("reminds the course's students in the hour before a live class, once", async () => {
    const { pushes, deps } = await setup();
    expect(await runAutoNotifications(deps(NOW))).not.toHaveProperty("live_class_soon");
    const soon = new Date(NOW.getTime() + 2.5 * 3_600_000);
    expect(await runAutoNotifications(deps(soon))).toMatchObject({ live_class_soon: 1 });
    expect(await runAutoNotifications(deps(new Date(soon.getTime() + 5 * MINUTE)))).not.toHaveProperty("live_class_soon");
    expect(pushes).toEqual([{ title: expect.stringContaining("Canlı ders"), body: expect.stringContaining("Speaking club"), data: { course_id: "10", live_id: "17", type: "live_class_soon" } }]);
  });

  it("tells the student their assignment was graded or sent back", async () => {
    const { store, app, user, pushes, deps } = await setup();
    const assignment = course().topics[0]!.assignments![0]!;
    await notifyGraded(deps(NOW), app, course(), assignment, { userId: user.id, status: "graded", score: 18, gradedAt: NOW });
    await notifyGraded(deps(NOW), app, course(), assignment, { userId: user.id, status: "returned", score: null, gradedAt: days(1) });
    expect(pushes.map((p) => p.data)).toEqual([
      { course_id: "10", assignment_id: "16", type: "assignment_graded" },
      { course_id: "10", assignment_id: "16", type: "assignment_graded" },
    ]);
    expect(pushes[0]!.body).toContain("18/20");
    const inbox = await store.listHostedNotifications({ appId: app.id, userId: user.id, since: days(-1), page: 1, perPage: 10 });
    expect(inbox.total).toBe(2);
  });
});

describe("112.5 dashboard words", () => {
  it("has every new text in English, Arabic and Turkish", () => {
    const en = getDashT("en");
    for (const lang of ["ar", "tr"] as const) {
      const t = getDashT(lang);
      for (const key of ["lms.assignmentsTitle", "lms.sequential", "lms.addLiveTo", "lms.meetingUrlHint", "lms.insights", "lms.atRiskFilter", "lms.shuffle", "campaigns.auto_live_class_soon"] as const) {
        expect(t(key, { section: "x", count: 2 })).not.toBe(en(key, { section: "x", count: 2 }));
      }
      const known = knownTranslator(lang);
      for (const english of ["Enter a score from 0 to 20.", "Added 3, already enrolled 1.", "Write what the students should do.", "Graded. The student can see it in the app.", "Added “Essay”."]) {
        expect(known(english)).not.toBe(english);
      }
    }
  });
});
