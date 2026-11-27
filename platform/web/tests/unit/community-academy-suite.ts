import { beforeEach, expect, it } from "vitest";
import * as academy from "@/lib/community/academy/service";
import type { AcademyEnv } from "@/lib/community/academy/service";
import type { AcademyStore } from "@/lib/community/academy/store";

/**
 * 233 Yallapp Academy on one store (memory or MySQL): the admin's
 * authoring, free and locked courses, lessons, quizzes, progress, the
 * certificate, and the website's price and access functions. The members
 * are fixed (karim, nour).
 */
export const NOW = new Date("2026-12-02T09:00:00.000Z");
export const MEMBERS = ["karim", "nour"];

export function communityAcademySuite(setup: () => Promise<AcademyStore>) {
  let env: AcademyEnv;

  beforeEach(async () => {
    env = { store: await setup(), tenant: "yallapp", now: NOW, memberName: async (id) => ({ karim: "Karim Haddad", nour: "Nour Aydın" })[id] ?? null };
  });

  async function course(free: boolean) {
    const c = await academy.createCourse(env, { title: free ? "Build your first app" : "Grow your shop", summary: "Step by step.", level: "beginner", language: "en", free });
    await academy.addLesson(env, c.id, { title: "Welcome", kind: "video", videoUrl: "https://youtu.be/abc", durationSeconds: 120, preview: true });
    const withLesson = await academy.addLesson(env, c.id, { title: "Your first screen", kind: "article", body: "Open Studio and choose a template. ".repeat(10) });
    await academy.setQuiz(env, withLesson.lessons[1]!.id, [
      { prompt: "Where do you start?", options: ["Studio", "Settings"], answer: 0 },
      { prompt: "What do you choose?", options: ["A colour", "A template", "A name"], answer: 1 },
    ]);
    const done = await academy.updateCourse(env, c.id, { status: "published" });
    return { id: done.id, slug: done.slug, preview: done.lessons[0]!.id, quizLesson: done.lessons[1]!.id };
  }

  it("authors a course with lessons and a quiz; drafts stay out of sight", async () => {
    const draft = await academy.createCourse(env, { title: "Draft course", summary: "", level: "advanced", language: "ar" });
    expect(draft).toMatchObject({ status: "draft", free: false, lessons: [] });
    expect(await academy.listCourses(env, null)).toEqual([]);
    await expect(academy.getCourse(env, null, draft.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(academy.addLesson(env, draft.id, { title: "Video", kind: "video", videoUrl: "https://evil.test/v", durationSeconds: 60 })).rejects.toMatchObject({ field: "videoUrl" });
    await expect(academy.setQuiz(env, (await academy.addLesson(env, draft.id, { title: "Read", kind: "article", body: "x ".repeat(30) })).lessons[0]!.id, [{ prompt: "Which?", options: ["a", "b"], answer: 5 }])).rejects.toMatchObject({ field: "questions" });
    const c = await course(true);
    const admin = await academy.adminCourse(env, c.id);
    expect(admin.lessons.map((l) => [l.kind, l.durationSeconds, l.quiz.length])).toEqual([["video", 120, 0], ["article", 60, 2]]);
    expect((await academy.adminCourses(env)).map((x) => x.status).sort()).toEqual(["draft", "published"]);
  });

  it("opens a free course: lessons, a quiz to pass, progress and a certificate once", async () => {
    const c = await course(true);
    const [listed] = await academy.listCourses(env, "karim");
    expect(listed).toMatchObject({ slug: c.slug, access: "free", lessonCount: 2, durationSeconds: 180, progress: { completed: 0, total: 2 }, certificateCode: null });
    // Never a price or an answer in what the app sees.
    const lesson = await academy.getLesson(env, null, c.quizLesson);
    expect(lesson.quiz).toEqual([expect.objectContaining({ prompt: "Where do you start?", options: ["Studio", "Settings"] }), expect.anything()]);
    expect(JSON.stringify([listed, lesson, await academy.getCourse(env, null, c.slug)])).not.toMatch(/price|currency|answer"|checkout|payment/i);

    expect(await academy.completeLesson(env, "karim", c.preview)).toMatchObject({ progress: { completed: 1, total: 2 }, certificateCode: null });
    await expect(academy.completeLesson(env, "karim", c.quizLesson)).rejects.toMatchObject({ field: "quiz" });
    await expect(academy.submitQuiz(env, "karim", c.quizLesson, [0])).rejects.toMatchObject({ field: "answers" });
    expect(await academy.submitQuiz(env, "karim", c.quizLesson, [0, 0])).toMatchObject({ score: 50, passed: false, correct: [true, false], lesson: null });
    const passed = await academy.submitQuiz(env, "karim", c.quizLesson, [0, 1]);
    expect(passed).toMatchObject({ score: 100, passed: true, lesson: { progress: { completed: 2, total: 2 } } });
    const code = passed.lesson!.certificateCode!;
    expect(code).toMatch(/^[A-Z2-9]{10}$/);
    // Again changes nothing: one certificate.
    expect((await academy.completeLesson(env, "karim", c.quizLesson)).certificateCode).toBe(code);
    expect(await academy.certificate(env, code)).toMatchObject({ code, memberName: "Karim Haddad", courseTitle: "Build your first app", courseSlug: c.slug });
    await expect(academy.certificate(env, "NOPE000000")).rejects.toMatchObject({ code: "not_found" });
    expect((await academy.myCourses(env, "karim")).map((x) => [x.id, x.certificateCode])).toEqual([[c.id, code]]);
    expect(await academy.myCourses(env, "nour")).toEqual([]);
    expect((await academy.getLesson(env, "karim", c.quizLesson)).quizScore).toBe(100);
  });

  it("locks a paid course but its preview, until the website's checkout grants it", async () => {
    const c = await course(false);
    expect((await academy.getCourse(env, "nour", c.id)).lessons.map((l) => [l.preview, l.locked])).toEqual([[true, false], [false, true]]);
    expect((await academy.getLesson(env, "nour", c.preview)).title).toBe("Welcome");
    await expect(academy.getLesson(env, "nour", c.quizLesson)).rejects.toMatchObject({ code: "not_allowed", field: "locked" });
    await expect(academy.enroll(env, "nour", c.id)).rejects.toMatchObject({ field: "locked" });
    await expect(academy.completeLesson(env, "nour", c.preview)).rejects.toMatchObject({ field: "locked" });

    // The website (areas C and F): the price, then the checkout's grant.
    expect(await academy.coursePriceForCheckout(env.store, "yallapp", c.id)).toBeNull();
    expect(await academy.setCoursePrice(env.store, "yallapp", c.id, { priceMinor: 49900, currency: "TRY" })).toBe(true);
    await expect(academy.setCoursePrice(env.store, "yallapp", c.id, { priceMinor: 1.5, currency: "try" })).rejects.toMatchObject({ field: "price" });
    expect(await academy.coursePriceForCheckout(env.store, "yallapp", c.id)).toMatchObject({ courseId: c.id, priceMinor: 49900, currency: "TRY" });
    expect(await academy.coursePriceForCheckout(env.store, "other-app", c.id)).toBeNull();
    // Still never in what the app sees.
    expect(JSON.stringify(await academy.getCourse(env, "nour", c.id))).not.toMatch(/49900|TRY|price/);
    expect(await academy.grantCourseAccess(env.store, { tenant: "yallapp", memberId: "nour", courseId: c.id, source: "bought", ref: "cs_test_1" })).toBe(true);
    expect(await academy.grantCourseAccess(env.store, { tenant: "yallapp", memberId: "nour", courseId: c.id, source: "bought", ref: "cs_test_1" })).toBe(false);
    expect((await academy.getCourse(env, "nour", c.id)).access).toBe("owned");
    expect((await academy.getLesson(env, "nour", c.quizLesson)).locked).toBe(false);
    expect((await academy.myCourses(env, "nour")).map((x) => x.access)).toEqual(["owned"]);
    // A free course marked so: open to all, nothing to grant.
    await academy.updateCourse(env, c.id, { free: true });
    expect((await academy.getCourse(env, "karim", c.id)).access).toBe("free");
    expect(await academy.coursePriceForCheckout(env.store, "yallapp", c.id)).toBeNull();
  });

  it("edits and removes lessons, and keeps lesson order", async () => {
    const c = await course(true);
    const edited = await academy.updateLesson(env, c.preview, { title: "Hello", position: 5 });
    expect(edited.lessons.map((l) => l.title)).toEqual(["Your first screen", "Hello"]);
    const after = await academy.deleteLesson(env, c.quizLesson);
    expect(after.lessons.map((l) => l.title)).toEqual(["Hello"]);
    await expect(academy.getLesson(env, null, c.quizLesson)).rejects.toMatchObject({ code: "not_found" });
  });
}
