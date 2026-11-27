import { describe, expect, it } from "vitest";
import { grantCourseAccess, setCoursePrice } from "@/lib/community/academy/service";
import { api, joinWithEmail, makeYallappStaff, testCommunity } from "./community-support";

/**
 * 233 Yallapp Academy through the Community API (/api/community/v1): the
 * admin's authoring, a free course to its certificate, a locked one opened
 * by the website's grant, and never a price, a buy button or a payment
 * link in any answer the app gets.
 */

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function setup() {
  const c = await testCommunity({ providers: false });
  const admin = await joinWithEmail(c, "Academy Admin");
  await makeYallappStaff(c, admin.id);
  const nour = await joinWithEmail(c, "Nour Learner");
  return { c, admin, nour };
}

describe("233 Community academy API", () => {
  it("authors a course (admins only), learns it, passes the quiz and checks the certificate", async () => {
    const { c, admin, nour } = await setup();
    const body = { title: "Build your first app", summary: "Step by step.", level: "beginner", language: "en", free: true };
    expect((await api(c, "POST", "/admin/academy/courses", { token: nour.token, body })).status).toBe(403);
    const course = await api<Json>(c, "POST", "/admin/academy/courses", { token: admin.token, body });
    expect(course.status, JSON.stringify(course.body)).toBe(201);
    const id = course.body.id;
    const withLesson = await api<Json>(c, "POST", `/admin/academy/courses/${id}/lessons`, { token: admin.token, body: { title: "Your first screen", kind: "article", body: "Open Studio and choose a template. ".repeat(8) } });
    expect(withLesson.status, JSON.stringify(withLesson.body)).toBe(201);
    const lessonId = withLesson.body.lessons[0].id;
    expect((await api<Json>(c, "PUT", `/admin/academy/lessons/${lessonId}/quiz`, { token: admin.token, body: { questions: [{ prompt: "Where do you start?", options: ["Studio", "Settings"], answer: 0 }] } })).body.lessons[0].quiz).toHaveLength(1);
    expect((await api<Json>(c, "GET", "/academy/courses")).body.items).toEqual([]);
    expect((await api<Json>(c, "PATCH", `/admin/academy/courses/${id}`, { token: admin.token, body: { status: "published" } })).body.status).toBe("published");

    const list = await api<Json>(c, "GET", "/academy/courses", { token: nour.token });
    expect(list.body).toMatchObject({ items: [{ id, access: "open", lesson_count: 1, progress: null }], next_cursor: null });
    const detail = await api<Json>(c, "GET", `/academy/courses/${course.body.slug}`, { token: nour.token });
    expect(detail.body).toMatchObject({ description: "Step by step.", lessons: [{ id: lessonId, kind: "article", minutes: 1, done: false }], quizzes: [{ id: lessonId, after_lesson_id: lessonId, passed: false }], certificate: null });
    const lesson = await api<Json>(c, "GET", `/academy/courses/${id}/lessons/${lessonId}`, { token: nour.token });
    expect(lesson.body).toMatchObject({ id: lessonId, course_id: id, kind: "article", video_url: null, done: false });
    const quizView = await api<Json>(c, "GET", `/academy/courses/${id}/quizzes/${lessonId}`, { token: nour.token });
    expect(quizView.body).toMatchObject({ id: lessonId, passed: false, questions: [{ text: "Where do you start?", options: [{ id: "0", text: "Studio" }, { id: "1", text: "Settings" }] }] });
    expect(JSON.stringify(quizView.body)).not.toContain("answer");
    expect((await api<Json>(c, "POST", `/academy/courses/${id}/lessons/${lessonId}/complete`, { token: nour.token })).body.error.fields).toHaveProperty("quiz");
    const qid = quizView.body.questions[0].id;
    const wrong = await api<Json>(c, "POST", `/academy/courses/${id}/quizzes/${lessonId}/attempts`, { token: nour.token, body: { answers: { [qid]: ["1"] } } });
    expect(wrong.body).toMatchObject({ score: 0, passed: false, correct: { [qid]: false }, progress: { course_id: id, completed: false, certificate: null } });
    const quiz = await api<Json>(c, "POST", `/academy/courses/${id}/quizzes/${lessonId}/attempts`, { token: nour.token, body: { answers: { [qid]: ["0"] } } });
    expect(quiz.body).toMatchObject({ score: 1, passed: true, correct: { [qid]: true }, progress: { course_id: id, progress: 1, completed: true } });
    const code = quiz.body.progress.certificate.code;
    const cert = await api<Json>(c, "GET", `/academy/certificates/${code}`);
    expect(cert.body).toMatchObject({ code, member_name: "Nour Learner", course_title: "Build your first app", verify_url: expect.stringContaining(`/academy/certificates/${code}`), pdf_url: expect.stringContaining(`/api/community/academy/certificates/${code}/pdf`) });
    expect((await api<Json>(c, "GET", "/academy/mine", { token: nour.token })).body.items).toMatchObject([{ id, progress: 1 }]);
    expect((await api<Json>(c, "GET", "/academy/certificates", { token: nour.token })).body.items.map((x: Json) => x.code)).toEqual([code]);
    expect((await api(c, "GET", "/academy/mine")).status).toBe(401);
  });

  it("shows a paid course locked with no price, until the website's checkout grants it", async () => {
    const { c, admin, nour } = await setup();
    const course = (await api<Json>(c, "POST", "/admin/academy/courses", { token: admin.token, body: { title: "Grow your shop", summary: "", level: "intermediate", language: "tr", status: "published" } })).body;
    const lessons = (await api<Json>(c, "POST", `/admin/academy/courses/${course.id}/lessons`, { token: admin.token, body: { title: "Your customers", kind: "video", video_url: "https://youtu.be/abc", duration_seconds: 300 } })).body.lessons;
    await setCoursePrice(c.deps.store.qa.academy, "yallapp", course.id, { priceMinor: 49900, currency: "TRY" });

    const seen = await api<Json>(c, "GET", `/academy/courses/${course.slug}`, { token: nour.token });
    expect(seen.body).toMatchObject({ access: "locked", progress: null, lessons: [{ title: "Your customers", locked: true }] });
    const refused = await api<Json>(c, "GET", `/academy/courses/${course.id}/lessons/${lessons[0].id}`, { token: nour.token });
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("course_locked");
    expect((await api(c, "POST", `/academy/courses/${course.id}/lessons/${lessons[0].id}/complete`, { token: nour.token })).status).toBe(403);
    // Nothing the app reads sells anything.
    const answers = [seen.body, (await api<Json>(c, "GET", "/academy/courses")).body, (await api<Json>(c, "GET", `/admin/academy/courses/${course.id}`, { token: admin.token })).body];
    for (const a of answers) expect(JSON.stringify(a)).not.toMatch(/price|currency|49900|checkout|payment|purchase|buy_url/i);

    expect(await grantCourseAccess(c.deps.store.qa.academy, { tenant: "yallapp", memberId: nour.id, courseId: course.id, source: "bought", ref: "cs_test_1" })).toBe(true);
    expect((await api<Json>(c, "GET", `/academy/courses/${course.id}`, { token: nour.token })).body).toMatchObject({ access: "open", lessons: [{ locked: false }] });
    expect((await api<Json>(c, "POST", `/academy/courses/${course.id}/lessons/${lessons[0].id}/complete`, { token: nour.token })).body).toMatchObject({ progress: 1, completed: true, certificate: { code: expect.any(String) } });
  });
});
