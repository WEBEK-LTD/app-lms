import { describe, expect, it } from "vitest";
import { parseAssignment, parseRubric, rubricText } from "@/lib/courses/builder";
import { parseCourse } from "@/lib/courses/forms";
import { badgesOf, coursePoints, leaderboard, POINTS, shortName, streaks } from "@/lib/courses/gamification";
import { maySubmit, parseGrade, rubricResult, rubricScore } from "@/lib/courses/grading";
import { attemptEndsAt, courseProgress, examStatus, finalScore, resultsHidden } from "@/lib/courses/learning";
import { orderedChoice, parsePrerequisites, requiredCourses, savePath } from "@/lib/courses/paths";
import { examValues, parseQuiz } from "@/lib/courses/quizzes";
import type { Course, CourseQuiz, CourseSetup, LessonProgress, QuizAttempt } from "@/lib/data/types";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import type { PlanInfo } from "@/lib/plans";
import { expectContract } from "./contract";
import { days, NOW, setupClient } from "./helpers";

/**
 * 113.7 More of a real LMS: prerequisites and learning paths, points and
 * badges with the leaderboard, rubrics and another try, timed exams, notes
 * and bookmarks, the lesson's discussion, and the rules to complete a course.
 */

// The hosted academy of 112.5's tests, and a student who signs up.
const SECRET = "test-certificate-secret";
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

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
        certificateSigner: "Dr. Sara Adel",
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [{ id: 11, title: "Hello", lessons: [{ id: 12, title: "Greetings", videoUrl: null, text: "Merhaba!", durationMinutes: 8, preview: false }] }],
      },
    ],
    nextId: 40,
  };
}

/** A hosted academy and a student who signs up, with calls checked against the contract. */
async function hostedAcademy(setup: () => CourseSetup = academy, options: { patch?: Partial<App>; plan?: PlanInfo } = {}) {
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

const quiz = (id: number, extra: Partial<CourseQuiz> = {}): CourseQuiz => ({
  id,
  title: "Check",
  passPercent: 50,
  attemptsAllowed: null,
  timeLimitMinutes: null,
  questions: [{ id: 1, text: "bir?", type: "single_choice", options: [{ id: "a", text: "1", correct: true }, { id: "b", text: "2", correct: false }] }],
  ...extra,
});

/** Three courses: 10 (a lesson, a quiz, an assignment), 20 and 30. */
function school(): CourseSetup {
  const base = academy();
  const first = base.courses[0]!;
  first.topics[0]!.quizzes = [quiz(13)];
  first.topics[0]!.assignments = [{ id: 14, title: "Write", instructions: "Write a line.", dueDays: null, maxPoints: 10, passPoints: null }];
  const other = (id: number, title: string): Course => ({ ...first, id, title, certificate: false, topics: [{ id: id + 1, title: "One", lessons: [{ id: id + 2, title: `${title} 1`, videoUrl: null, text: "x", durationMinutes: 5, preview: false }] }] });
  return { ...base, courses: [first, other(20, "Turkish 2"), other(30, "Turkish 3")], nextId: 100 };
}

const progress = (lessonId: number, at: Date, courseId = 10): LessonProgress => ({ appId: "a", userId: 1, courseId, lessonId, positionSeconds: 0, completedAt: at, updatedAt: at });
const attempt = (quizId: number, score: number, at: Date, courseId = 10): QuizAttempt => ({ id: quizId * 10 + score, appId: "a", userId: 1, courseId, quizId, answers: {}, scorePercent: score, passed: score >= 50, startedAt: at, submittedAt: at });

describe("113.7 the rules to complete a course", () => {
  it("counts the lessons only, the quizzes too, or everything, and a minimum final score", () => {
    const course = school().courses[0]!;
    const lessons = new Map([[12, progress(12, days(-2))]]);
    const passed = [attempt(13, 60, days(-1))];
    expect(courseProgress({ ...course, completeWhen: "lessons" }, lessons, [])).toMatchObject({ course_completed: true, total_items: 1, complete_when: "lessons" });
    expect(courseProgress({ ...course, completeWhen: "quizzes" }, lessons, [])).toMatchObject({ course_completed: false, total_items: 2 });
    expect(courseProgress({ ...course, completeWhen: "quizzes" }, lessons, passed)).toMatchObject({ course_completed: true, completed_at: days(-1).toISOString() });
    expect(courseProgress(course, lessons, passed)).toMatchObject({ course_completed: false, total_items: 3 });
    // The final score: the quiz's 60 and the assignment's 0 (not graded yet) average 30.
    expect(finalScore(course, { progress: lessons, attempts: passed, submissions: [] })).toBe(30);
    expect(courseProgress({ ...course, completeWhen: "quizzes", minFinalScore: 50 }, lessons, passed)).toMatchObject({ course_completed: false, final_score: 30, min_final_score: 50 });
    const graded = [{ id: 1, appId: "a", userId: 1, courseId: 10, assignmentId: 14, text: "x", file: null, status: "graded" as const, score: 10, feedback: null, submittedAt: NOW, gradedAt: NOW, gradedBy: "T", attempt: 1, rubric: null }];
    expect(courseProgress({ ...course, completeWhen: "quizzes", minFinalScore: 50 }, lessons, passed, graded)).toMatchObject({ course_completed: true, final_score: 80 });
    expect(parseCourse({ title: "Course", completeWhen: "quizzes", minFinalScore: "70" }, school(), [])).toMatchObject({ ok: true, value: { completeWhen: "quizzes", minFinalScore: 70 } });
    expect(parseCourse({ title: "Course", minFinalScore: "120" }, school(), [])).toMatchObject({ ok: false, errors: { minFinalScore: expect.any(String) } });
  });
});

describe("113.7 prerequisites and learning paths", () => {
  it("needs a course's prerequisites and, in a path taken in order, the course before", () => {
    const setup = school();
    setup.courses[2]!.prerequisites = [10];
    const saved = savePath(setup, { title: "Turkish from zero", description: "", inOrder: "on", active: "on" }, orderedChoice([10, 20], { 10: "2", 20: "1" }));
    if (!saved.ok) throw new Error("path");
    expect(saved.path.courseIds).toEqual([20, 10]);
    expect(requiredCourses(saved.setup, 10)).toEqual([20]);
    expect(requiredCourses(saved.setup, 30)).toEqual([10]);
    // A course can't need one that needs it.
    expect(parsePrerequisites(saved.setup, 10, [30])).toMatchObject({ ok: false });
    expect(parsePrerequisites(saved.setup, 20, [10, 10, 999])).toEqual({ ok: true, value: [10] });
    expect(savePath(setup, { title: "One", inOrder: "", active: "on" }, [10])).toMatchObject({ ok: false, errors: { courseIds: expect.any(String) } });
  });

  it("refuses enrolling before the courses it needs, and shows the path with the student's progress", async () => {
    const h = await hostedAcademy(() => {
      const setup = school();
      setup.courses[1]!.prerequisites = [10];
      return { ...setup, paths: [{ id: 90, title: "Turkish from zero", description: "Step by step", courseIds: [10, 20, 30], inOrder: true, active: true }] };
    });
    const { access_token: token } = await h.signUp();
    expect((await h.call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body).toMatchObject({ features: { learning_paths: true, notes: true, lesson_discussion: true, gamification: false } });
    const detail = (await h.call("GET", "/courses/{course_id}", { params: ["20"], token })).body;
    expect(detail).toMatchObject({ prerequisites: [{ id: 10, title: "Turkish for Beginners", completed: false }], prerequisites_met: false, purchase: { action: "none" } });
    const refused = await h.call("POST", "/courses/{course_id}/enroll", { params: ["20"], token });
    expect(refused).toMatchObject({ status: 403, body: { code: "prerequisites_not_met" } });
    expect((await h.call("GET", "/learning-paths/{path_id}", { params: ["90"], token })).body).toMatchObject({ completed_count: 0, courses: [{ locked: false }, { locked: true, after_course_id: 10 }, { locked: true }] });
    // Course 10 by its rules: its lesson, then its quiz and assignment done.
    h.state.app = { ...h.state.app, courseSetup: { ...h.state.app.courseSetup!, courses: h.state.app.courseSetup!.courses.map((c) => (c.id === 10 ? { ...c, completeWhen: "lessons" as const } : c)) } };
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    await h.call("POST", "/lessons/{lesson_id}/complete", { params: ["12"], token });
    expect((await h.call("GET", "/courses/{course_id}", { params: ["20"], token })).body).toMatchObject({ prerequisites_met: true, purchase: { action: "enroll_free" } });
    expect((await h.call("POST", "/courses/{course_id}/enroll", { params: ["20"], token })).status).toBe(200);
    const list = (await h.call("GET", "/learning-paths", { token })).body as { items: { completed_count: number; percent: number; courses: { completed: boolean; locked: boolean }[] }[] };
    expect(list.items[0]).toMatchObject({ completed_count: 1, percent: 33, courses: [{ completed: true }, { completed: false, locked: false }, { locked: true }] });
    expect((await h.call("GET", "/learning-paths/{path_id}", { params: ["91"], token })).status).toBe(404);
  });
});

describe("113.7 timed exams", () => {
  const exam = (opensAt: Date, closesAt: Date, resultsAfterClose = false) => quiz(13, { timeLimitMinutes: 30, attemptsAllowed: 2, exam: { opensAt: opensAt.toISOString(), closesAt: closesAt.toISOString(), resultsAfterClose } });

  it("opens and closes, ends an attempt at its limit or the close, and hides results until it closes", () => {
    const q = exam(days(-1), new Date(NOW.getTime() + 10 * 60_000), true);
    expect(examStatus(q.exam!, days(-2))).toBe("upcoming");
    expect(examStatus(q.exam!, NOW)).toBe("open");
    expect(examStatus(q.exam!, days(1))).toBe("closed");
    expect(attemptEndsAt(q, NOW)).toEqual(new Date(NOW.getTime() + 10 * 60_000));
    expect(attemptEndsAt(q, days(-1))).toEqual(new Date(days(-1).getTime() + 30 * 60_000));
    expect(resultsHidden(q, NOW)).toBe(true);
    expect(resultsHidden(q, days(1))).toBe(false);
    const parsed = parseQuiz({ title: "Final", passPercent: "60", timeLimit: "45", questions: "Q: a?\n* yes\n- no", exam: "on", opensOn: "2026-11-10", opensTime: "09:00", closesOn: "2026-11-10", closesTime: "12:00", resultsAfterClose: "on" }, "Europe/Istanbul");
    expect(parsed).toMatchObject({ ok: true, value: { exam: { opensAt: "2026-11-10T06:00:00.000Z", closesAt: "2026-11-10T09:00:00.000Z", resultsAfterClose: true } } });
    if (parsed.ok) expect(examValues(parsed.value, "Europe/Istanbul")).toMatchObject({ opensOn: "2026-11-10", opensTime: "09:00", closesTime: "12:00", resultsAfterClose: "on" });
    expect(parseQuiz({ title: "Final", questions: "Q: a?\n* yes\n- no", exam: "on", opensOn: "2026-11-10", closesOn: "2026-11-09" }, "UTC")).toMatchObject({ ok: false, errors: { closesOn: expect.any(String) } });
    expect(parseQuiz({ title: "Final", questions: "Q: a?\n* yes\n- no", exam: "on", resultsAfterClose: "on" }, "UTC")).toMatchObject({ ok: false, errors: { closesOn: expect.any(String) } });
  });

  it("starts within the window, resumes the attempt going on, refuses late answers and shows results after it closes", async () => {
    const h = await hostedAcademy(() => {
      const setup = school();
      setup.courses[0]!.topics[0]!.quizzes = [exam(new Date(NOW.getTime() + 10 * 60_000), new Date(NOW.getTime() + 100 * 60_000), true)];
      return setup;
    });
    const session = await h.signUp();
    let token = session.access_token;
    // Later on: the access token renewed, as the app does.
    const jump = async (to: Date) => {
      h.state.now = to;
      const refreshed = (await h.call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).body as { access_token: string; refresh_token: string };
      session.refresh_token = refreshed.refresh_token;
      token = refreshed.access_token;
    };
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect((await h.call("GET", "/quizzes/{quiz_id}", { params: ["13"], token })).body).toMatchObject({ exam: { status: "upcoming", results_after_close: true, in_progress: null } });
    expect((await h.call("POST", "/quizzes/{quiz_id}/attempts", { params: ["13"], token })).body).toMatchObject({ code: "exam_not_open" });
    await jump(new Date(NOW.getTime() + 20 * 60_000));
    const first = (await h.call("POST", "/quizzes/{quiz_id}/attempts", { params: ["13"], token })).body as { id: number; ends_at: string; exam: boolean };
    expect(first).toMatchObject({ exam: true, ends_at: new Date(h.state.now.getTime() + 30 * 60_000).toISOString() });
    // Starting again gives the same attempt back, and it counts as used.
    expect((await h.call("POST", "/quizzes/{quiz_id}/attempts", { params: ["13"], token })).body).toMatchObject({ id: first.id });
    expect((await h.call("GET", "/quizzes/{quiz_id}", { params: ["13"], token })).body).toMatchObject({ attempts_used: 1, exam: { status: "open", in_progress: { attempt_id: first.id } } });
    const right = { answers: [{ question_id: 1, option_ids: ["a"] }] };
    const result = await h.call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", { params: ["13", String(first.id)], token, body: right });
    expect(result.body).toMatchObject({ status: "awaiting_results", score_percent: null, results_at: new Date(NOW.getTime() + 100 * 60_000).toISOString() });
    expect((await h.call("GET", "/courses/{course_id}", { params: ["10"], token })).body).toMatchObject({ progress: { completed_items: 0 } });
    // The second attempt: answers after its time and the grace are refused.
    const second = (await h.call("POST", "/quizzes/{quiz_id}/attempts", { params: ["13"], token })).body as { id: number };
    await jump(new Date(h.state.now.getTime() + 32 * 60_000));
    expect(await h.call("POST", "/quizzes/{quiz_id}/attempts/{attempt_id}/submit", { params: ["13", String(second.id)], token, body: right })).toMatchObject({ status: 409, body: { code: "time_up" } });
    expect((await h.call("POST", "/quizzes/{quiz_id}/attempts", { params: ["13"], token })).status).toBe(409);
    // Once it closes: the results.
    await jump(new Date(NOW.getTime() + 110 * 60_000));
    expect((await h.call("GET", "/quizzes/{quiz_id}", { params: ["13"], token })).body).toMatchObject({ exam: { status: "closed" }, last_result: { status: "failed", score_percent: 0 } });
    const all = (await h.call("GET", "/me/quiz-attempts", { token })).body as { items: { status: string; score_percent: number }[] };
    expect(all.items.map((a) => a.status).sort()).toEqual(["failed", "passed"]);
  });
});

describe("113.7 rubrics and another try", () => {
  const rubricText_ = "Content\n- Excellent | 6\n- Good | 3\n\nSpelling\n- No mistakes | 4\n- A few | 1";

  it("reads a rubric, gives the highest score from it and grades with its levels", () => {
    const parsed = parseRubric(rubricText_);
    if ("error" in parsed) throw new Error(parsed.error);
    expect(parsed.criteria).toEqual([
      { id: 1, title: "Content", levels: [{ id: 1, label: "Excellent", points: 6 }, { id: 2, label: "Good", points: 3 }] },
      { id: 2, title: "Spelling", levels: [{ id: 1, label: "No mistakes", points: 4 }, { id: 2, label: "A few", points: 1 }] },
    ]);
    expect(rubricText(parsed.criteria)).toBe(rubricText_);
    expect(parseRubric("Content\n- Only | 2")).toMatchObject({ error: expect.any(String) });
    expect(parseRubric("- Excellent | 2")).toMatchObject({ error: expect.any(String) });
    const assignment = parseAssignment({ title: "Essay", instructions: "Write it.", maxPoints: "999", passPoints: "6", rubric: rubricText_, attemptsAllowed: "3" }, "UTC");
    expect(assignment).toMatchObject({ ok: true, value: { maxPoints: 10, passPoints: 6, attemptsAllowed: 3 } });
    expect(parseAssignment({ title: "Essay", instructions: "Write it.", passPoints: "11", rubric: rubricText_ }, "UTC")).toMatchObject({ ok: false, errors: { passPoints: expect.any(String) } });
    expect(rubricScore(parsed.criteria, { 1: 2, 2: 1 })).toBe(7);
    expect(rubricScore(parsed.criteria, { 1: 2 })).toBeNull();
    const graded = parseGrade({ outcome: "grade", "rubric-1": "1", "rubric-2": "2", score: "0" }, { maxPoints: 10, rubric: parsed.criteria });
    expect(graded).toEqual({ ok: true, value: { status: "graded", score: 7, feedback: null, rubric: { 1: 1, 2: 2 } } });
    expect(parseGrade({ outcome: "grade", "rubric-1": "1" }, { maxPoints: 10, rubric: parsed.criteria })).toMatchObject({ ok: false, errors: { rubric: expect.any(String) } });
    expect(rubricResult(parsed.criteria, { 1: 1, 2: 2 })).toEqual([
      { criterion_id: 1, title: "Content", level_id: 1, level_label: "Excellent", points: 6, max_points: 6 },
      { criterion_id: 2, title: "Spelling", level_id: 2, level_label: "A few", points: 1, max_points: 4 },
    ]);
    expect(maySubmit({ attemptsAllowed: 2 }, { status: "graded", attempt: 1 })).toBe(true);
    expect(maySubmit({ attemptsAllowed: 2 }, { status: "graded", attempt: 2 })).toBe(false);
    expect(maySubmit({}, { status: "returned", attempt: 1 })).toBe(true);
  });

  it("hands in again after a grade while tries are left, and shows the rubric's result", async () => {
    const parsed = parseRubric(rubricText_);
    if ("error" in parsed) throw new Error(parsed.error);
    const h = await hostedAcademy(() => {
      const setup = school();
      setup.courses[0]!.topics[0]!.assignments = [{ id: 14, title: "Essay", instructions: "Write it.", dueDays: null, maxPoints: 10, passPoints: 6, rubric: parsed.criteria, attemptsAllowed: 2 }];
      return setup;
    });
    const { access_token: token } = await h.signUp();
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect((await h.call("GET", "/assignments/{assignment_id}", { params: ["14"], token })).body).toMatchObject({ rubric: [{ id: 1, title: "Content" }, { id: 2 }], attempts_allowed: 2, attempts_used: 0, can_submit: true });
    const handed = (await h.call("PUT", "/assignments/{assignment_id}/submission", { params: ["14"], token, body: { text: "My essay" } })).body as { submission: { id: number; attempt: number } };
    expect(handed.submission.attempt).toBe(1);
    await h.store.gradeAssignmentSubmission(h.state.app.id, handed.submission.id, { status: "graded", score: 4, feedback: null, gradedAt: h.state.now, gradedBy: "Teacher", rubric: { 1: 2, 2: 2 } });
    const after = (await h.call("GET", "/assignments/{assignment_id}", { params: ["14"], token })).body;
    expect(after).toMatchObject({ can_submit: true, attempts_used: 1, submission: { status: "graded", score: 4, passed: false, rubric_result: [{ level_label: "Good", points: 3 }, { level_label: "A few", points: 1 }] } });
    const again = (await h.call("PUT", "/assignments/{assignment_id}/submission", { params: ["14"], token, body: { text: "Better" } })).body;
    expect(again).toMatchObject({ attempts_used: 2, can_submit: true, submission: { status: "submitted", attempt: 2, score: null, rubric_result: null } });
    await h.store.gradeAssignmentSubmission(h.state.app.id, handed.submission.id, { status: "graded", score: 10, feedback: null, gradedAt: h.state.now, gradedBy: "Teacher", rubric: { 1: 1, 2: 1 } });
    expect((await h.call("GET", "/assignments/{assignment_id}", { params: ["14"], token })).body).toMatchObject({ can_submit: false });
    expect((await h.call("PUT", "/assignments/{assignment_id}/submission", { params: ["14"], token, body: { text: "Third" } })).body).toMatchObject({ code: "already_graded" });
  });
});

describe("113.7 notes, bookmarks and the lesson's discussion", () => {
  it("keeps the student's own notes and bookmarks, private to them", async () => {
    const h = await hostedAcademy(school);
    const { access_token: token } = await h.signUp();
    const { access_token: other } = await h.signUp("5329999999", "Ece Kaya");
    expect((await h.call("POST", "/lessons/{lesson_id}/notes", { params: ["12"], token, body: { text: "Hi" } })).status).toBe(403);
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token: other });
    const note = (await h.call("POST", "/lessons/{lesson_id}/notes", { params: ["12"], token, body: { text: " Merhaba = hello ", position_seconds: 42 } })).body as { id: number };
    expect(note).toMatchObject({ text: "Merhaba = hello", position_seconds: 42, lesson_title: "Greetings" });
    expect((await h.call("POST", "/lessons/{lesson_id}/notes", { params: ["12"], token, body: { text: " " } })).status).toBe(400);
    await h.call("PUT", "/lessons/{lesson_id}/bookmark", { params: ["12"], token });
    expect((await h.call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ bookmarked: true, note_count: 1, discussion_count: 0 });
    expect((await h.call("GET", "/courses/{course_id}/notes", { params: ["10"], token })).body).toMatchObject({ items: [{ id: note.id }], bookmarks: [{ lesson_id: 12, lesson_title: "Greetings" }] });
    // Someone else's note is nowhere to them.
    expect((await h.call("GET", "/courses/{course_id}/notes", { params: ["10"], token: other })).body).toMatchObject({ items: [], bookmarks: [] });
    expect((await h.call("PATCH", "/notes/{note_id}", { params: [String(note.id)], token: other, body: { text: "Mine now" } })).status).toBe(404);
    expect((await h.call("DELETE", "/notes/{note_id}", { params: [String(note.id)], token: other })).status).toBe(404);
    expect((await h.call("PATCH", "/notes/{note_id}", { params: [String(note.id)], token, body: { text: "Merhaba: hello" } })).body).toMatchObject({ text: "Merhaba: hello" });
    await h.call("DELETE", "/lessons/{lesson_id}/bookmark", { params: ["12"], token });
    expect((await h.call("GET", "/lessons/{lesson_id}/notes", { params: ["12"], token })).body).toMatchObject({ bookmarked: false, items: [{ text: "Merhaba: hello" }] });
    expect((await h.call("DELETE", "/notes/{note_id}", { params: [String(note.id)], token })).status).toBe(204);
  });

  it("asks under a lesson, lists its discussion with the pinned first, and lets its author delete", async () => {
    const h = await hostedAcademy(school);
    const { access_token: token } = await h.signUp();
    const { access_token: other } = await h.signUp("5329999999", "Ece Kaya");
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token: other });
    const first = (await h.call("POST", "/courses/{course_id}/questions", { params: ["10"], token, body: { text: "How do I say hi?", lesson_id: 12 } })).body as { id: number };
    expect(first).toMatchObject({ lesson_id: 12, lesson_title: "Greetings", pinned: false });
    h.state.now = new Date(h.state.now.getTime() + 60_000);
    const second = (await h.call("POST", "/courses/{course_id}/questions", { params: ["10"], token: other, body: { text: "And bye?", lesson_id: 12 } })).body as { id: number };
    await h.call("POST", "/courses/{course_id}/questions", { params: ["10"], token, body: { text: "About the course" } });
    expect((await h.call("POST", "/courses/{course_id}/questions", { params: ["10"], token, body: { text: "Elsewhere", lesson_id: 22 } })).status).toBe(400);
    // The academy pins the first one (Dashboard › Questions).
    await h.store.setCourseQuestionPinned(h.state.app.id, first.id, true);
    const listed = (await h.call("GET", "/courses/{course_id}/questions", { params: ["10"], token, query: { lesson_id: "12" } })).body as { items: { id: number; pinned: boolean }[] };
    expect(listed.items.map((q) => [q.id, q.pinned])).toEqual([[first.id, true], [second.id, false]]);
    // A student can't pin, nor delete someone else's.
    expect((await h.call("PUT", "/questions/{question_id}/pin", { params: [String(second.id)], token, body: { pinned: true } })).body).toMatchObject({ code: "not_teacher" });
    expect((await h.call("GET", "/questions/{question_id}", { params: [String(second.id)], token })).body).toMatchObject({ can_moderate: false, can_delete: false });
    expect((await h.call("DELETE", "/questions/{question_id}", { params: [String(second.id)], token })).status).toBe(403);
    const answer = (await h.call("POST", "/questions/{question_id}/answers", { params: [String(second.id)], token, body: { text: "Hoşça kal" } })).body as { id: number };
    expect(((await h.call("GET", "/questions/{question_id}", { params: [String(second.id)], token })).body as { answers: { can_delete: boolean }[] }).answers[0]!.can_delete).toBe(true);
    expect((await h.call("DELETE", "/questions/{question_id}/answers/{answer_id}", { params: [String(second.id), String(answer.id)], token: other })).status).toBe(403);
    expect((await h.call("DELETE", "/questions/{question_id}/answers/{answer_id}", { params: [String(second.id), String(answer.id)], token })).status).toBe(204);
    expect((await h.call("DELETE", "/questions/{question_id}", { params: [String(second.id)], token: other })).status).toBe(204);
    expect((await h.call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ discussion_count: 1 });
  });
});

describe("113.7 points, badges and the leaderboard", () => {
  it("adds up points for lessons, quizzes by score, assignments by grade and streak days", () => {
    const course = school().courses[0]!;
    const learner = {
      progress: new Map([[12, progress(12, new Date("2026-10-10T09:00:00Z"))]]),
      attempts: [attempt(13, 80, new Date("2026-10-11T09:00:00Z")), attempt(13, 100, new Date("2026-10-12T09:00:00Z"))],
      submissions: [{ id: 1, appId: "a", userId: 1, courseId: 10, assignmentId: 14, text: "x", file: null, status: "graded" as const, score: 5, feedback: null, submittedAt: new Date("2026-10-12T09:00:00Z"), gradedAt: new Date("2026-10-12T10:00:00Z"), gradedBy: "T", attempt: 1, rubric: null }],
    };
    // A lesson, the quiz's best (100), half the assignment, and two days that followed another.
    expect(coursePoints(course, learner, "UTC")).toBe(POINTS.lesson + POINTS.quiz + POINTS.assignment / 2 + 2 * POINTS.streakDay);
    expect(streaks(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06"], "2026-10-07")).toEqual({ current: 2, best: 3, following: 3, bestReachedOn: null });
    expect(streaks(["2026-10-01", "2026-10-02"], "2026-10-04").current).toBe(0);
    const badges = badgesOf({ courses: [{ course, learner }], zone: "UTC", pathsFinished: 0, points: 80 });
    expect(badges.filter((b) => b.earned).map((b) => b.id)).toEqual(["first_lesson", "first_quiz", "perfect_quiz", "first_assignment", "course_completed"]);
    expect(badges.find((b) => b.id === "perfect_quiz")).toMatchObject({ icon: "star", earnedAt: new Date("2026-10-12T09:00:00Z") });
    const week = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 9, 1 + i, 9)));
    const streaked = { progress: new Map(), attempts: week.map((at, i) => ({ ...attempt(13, 10, at), id: i + 1 })), submissions: [] };
    expect(badgesOf({ courses: [{ course, learner: streaked }], zone: "UTC", pathsFinished: 1, points: 600 }).filter((b) => b.earned).map((b) => b.id)).toEqual(["streak_7", "path_completed", "points_500"]);
  });

  it("shows first names and an initial, ranked, with the same rank for the same points", () => {
    expect(shortName("Deniz Aksoy")).toBe("Deniz A.");
    expect(shortName("  Sara  ")).toBe("Sara");
    expect(shortName("محمد أحمد علي")).toBe("محمد ع.");
    expect(leaderboard([
      { user: { id: 1, name: "Ali Veli" }, points: 30 },
      { user: { id: 2, name: "Ece Kaya" }, points: 50 },
      { user: { id: 3, name: "Can Er" }, points: 30 },
    ])).toEqual([
      { userId: 2, name: "Ece K.", points: 50, rank: 1 },
      { userId: 1, name: "Ali V.", points: 30, rank: 2 },
      { userId: 3, name: "Can E.", points: 30, rank: 2 },
    ]);
  });

  it("answers the leaderboard and achievements only when the academy turned them on", async () => {
    const h = await hostedAcademy(() => ({ ...school(), gamification: false }));
    const { access_token: token } = await h.signUp();
    const { access_token: other } = await h.signUp("5329999999", "Ece Kaya");
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    await h.call("POST", "/courses/{course_id}/enroll", { params: ["10"], token: other });
    expect((await h.call("GET", "/me/achievements", { token })).body).toMatchObject({ code: "feature_disabled" });
    expect((await h.call("GET", "/courses/{course_id}/leaderboard", { params: ["10"], token })).body).toMatchObject({ code: "feature_disabled" });
    h.state.app = { ...h.state.app, courseSetup: { ...h.state.app.courseSetup!, gamification: true } };
    await h.call("POST", "/lessons/{lesson_id}/complete", { params: ["12"], token: other });
    const board = (await h.call("GET", "/courses/{course_id}/leaderboard", { params: ["10"], token })).body;
    expect(board).toMatchObject({ scope: "course", total_students: 2, my_rank: 2, my_points: 0, items: [{ rank: 1, name: "Ece K.", points: POINTS.lesson, me: false }, { rank: 2, name: "Deniz A.", points: 0, me: true }] });
    expect(JSON.stringify(board)).not.toContain("Kaya");
    expect((await h.call("GET", "/courses/{course_id}/leaderboard", { params: ["10"], token, query: { scope: "cohort" } })).body).toMatchObject({ scope: "cohort", cohort: null, total_students: 0 });
    expect((await h.call("GET", "/courses/{course_id}/leaderboard", { params: ["20"], token })).status).toBe(403);
    const mine = (await h.call("GET", "/me/achievements", { token: other })).body;
    expect(mine).toMatchObject({ points: POINTS.lesson, streak_days: 1, best_streak: 1, courses: [{ course_id: 10, points: POINTS.lesson }] });
    expect((mine as { badges: { id: string; earned: boolean }[] }).badges.filter((b) => b.earned).map((b) => b.id)).toEqual(["first_lesson"]);
  });
});
