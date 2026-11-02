"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { parseCourse } from "@/lib/courses/forms";
import { saveLesson, withCourse } from "@/lib/courses/edit";
import { deleteQuiz, saveQuestionBank, saveQuiz } from "@/lib/courses/quizzes";
import { courseSetup } from "@/lib/courses/setup";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, CatalogCurrency, Course, CourseSetup } from "@/lib/data/types";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { recordStaffChange } from "@/lib/admin/audit";
import { offersDownloads, parseDownloadsChoice } from "@/lib/courses/downloads";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import type { FormState } from "@/lib/forms";
import { parseAnyPhone } from "@/lib/hosted/phone";
import { hostedSettings } from "@/lib/hosted/service";
import { imageType } from "@/lib/images";
import { appUrl, encryptionKey } from "@/lib/env";
import { notifyNewLesson } from "@/lib/hosted/auto-notifications";
import { parseMediaLink } from "@/lib/media/files";
import { askAfterOwnEntry } from "@/lib/samples/lists";
import { appZone } from "@/lib/analytics/zone";
import { deleteItem, moveItem, moveTopic, renameTopic, saveAssignment, saveLive } from "@/lib/courses/builder";
import { findAssignment } from "@/lib/courses/learning";
import { parseGrade, parsePhones } from "@/lib/courses/grading";
import { notifyGraded } from "@/lib/hosted/auto-notifications";

const COURSE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** A client whose courses are managed in the dashboard, or a redirect. */
async function requireCoursesApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("catalog");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "courses") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

async function saveSetup(app: App, setup: CourseSetup): Promise<void> {
  await (await getStore()).updateApp(app.id, { courseSetup: setup }, new Date());
  revalidatePath("/dashboard/courses", "layout");
}

const values = (formData: FormData, names: string[]) => Object.fromEntries(names.map((n) => [n, String(formData.get(n) ?? "").trim()]));


export async function saveCourseAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCoursesApp();
  const { app } = context;
  const v = values(formData, ["id", "title", "description", "price", "instructor", "level"]);
  v.active = formData.get("active") === "on" ? "on" : "";
  // 73 Students can start the course again (on by default).
  v.restart = formData.get("restart") === "on" ? "on" : "";
  // 90.1
  v.certificate = formData.get("certificate") === "on" ? "on" : "";
  v.accessDays = String(formData.get("accessDays") ?? "").trim();
  // 112.5 Taken in order, and who signs the certificate.
  v.sequential = formData.get("sequential") === "on" ? "on" : "";
  v.certificateSigner = String(formData.get("certificateSigner") ?? "").trim();
  const categoryIds = formData.getAll("categoryIds").map(Number);
  v.categoryIds = categoryIds.join(",");
  const setup = courseSetup(app);
  const id = v.id ? Number(v.id) : null;
  const existing = id === null ? null : setup.courses.find((c) => c.id === id);
  if (id !== null && !existing) return { message: "This course no longer exists." };
  const parsed = parseCourse(v, setup, categoryIds);
  if (!parsed.ok) return { errors: parsed.errors, values: v };

  let imageAssetId = existing?.imageAssetId ?? null;
  if (formData.get("removeImage") === "on") imageAssetId = null;
  const file = formData.get("image");
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > COURSE_IMAGE_MAX_BYTES) return { errors: { image: "The image can be up to 2 MB." }, values: v };
    const data = Buffer.from(await file.arrayBuffer());
    const type = imageType(data);
    if (!type) return { errors: { image: "The image must be a PNG or JPEG file." }, values: v };
    const assetId = newId();
    const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
    await getBlobStore().put(blobKey, data, type.contentType);
    await (await getStore()).createAsset({
      id: assetId,
      clientId: context.client.id,
      kind: "product_image",
      blobKey,
      contentType: type.contentType,
      size: data.length,
      createdAt: new Date(),
    });
    imageAssetId = assetId;
  }

  if (existing) {
    await saveSetup(app, withCourse(setup, existing.id, (c) => ({ ...c, ...parsed.value, imageAssetId })));
    return { ok: true, message: `Saved “${parsed.value.title}”.`, values: v };
  }
  const course: Course = { id: setup.nextId, ...parsed.value, imageAssetId, topics: [], createdAt: new Date().toISOString() };
  await saveSetup(app, { ...setup, courses: [...setup.courses, course], nextId: setup.nextId + 1 });
  // 110.2 Their first own course next to the samples: the list asks whether to remove them.
  redirect((await askAfterOwnEntry(await getStore(), app.id, "courses")) ?? `/dashboard/courses/${course.id}`);
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  const id = Number(formData.get("id"));
  const setup = courseSetup(app);
  await saveSetup(app, { ...setup, courses: setup.courses.filter((c) => c.id !== id) });
  redirect("/dashboard/courses");
}

export async function addCourseCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { errors: { name: "Enter a name of up to 60 characters." }, values: { name } };
  const setup = courseSetup(app);
  await saveSetup(app, { ...setup, categories: [...setup.categories, { id: setup.nextId, name }], nextId: setup.nextId + 1 });
  return { ok: true, message: `Added “${name}”.` };
}

export async function deleteCourseCategoryAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  const id = Number(formData.get("id"));
  const setup = courseSetup(app);
  await saveSetup(app, {
    ...setup,
    categories: setup.categories.filter((c) => c.id !== id),
    courses: setup.courses.map((c) => ({ ...c, categoryIds: c.categoryIds.filter((x) => x !== id) })),
  });
}

export async function saveCourseCurrencyAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const currency = String(formData.get("currency") ?? "") as CatalogCurrency;
  if (!CATALOG_CURRENCIES.includes(currency)) return { errors: { currency: "Choose a currency." } };
  await saveSetup(app, { ...courseSetup(app), currency });
  // The payment page and orders use the shop settings' currency too.
  const store = await getStore();
  await store.updateApp(app.id, { catalogSettings: { ...(app.catalogSettings ?? { shippingCents: 0, freeShippingOverCents: null, payment: null }), currency } }, new Date());
  return { ok: true, message: `Prices are in ${currency}.` };
}

// Sections and lessons

export async function addTopicAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const courseId = Number(formData.get("courseId"));
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2 || title.length > 120) return { errors: { title: "Enter a title of up to 120 characters." }, values: { title } };
  const setup = courseSetup(app);
  if (!setup.courses.some((c) => c.id === courseId)) return { message: "This course no longer exists." };
  await saveSetup(app, { ...withCourse(setup, courseId, (c) => ({ ...c, topics: [...c.topics, { id: setup.nextId, title, lessons: [] }] })), nextId: setup.nextId + 1 });
  return { ok: true, message: `Added the section “${title}”.` };
}

export async function deleteTopicAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  const courseId = Number(formData.get("courseId"));
  const topicId = Number(formData.get("topicId"));
  await saveSetup(app, withCourse(courseSetup(app), courseId, (c) => ({ ...c, topics: c.topics.filter((t) => t.id !== topicId) })));
}

export async function saveLessonAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const courseId = Number(formData.get("courseId"));
  const topicId = Number(formData.get("topicId"));
  const v = values(formData, ["id", "title", "videoUrl", "text", "duration", "dripDays", "opensOn", "attachments"]);
  v.preview = formData.get("preview") === "on" ? "on" : "";
  const saved = saveLesson(courseSetup(app), courseId, topicId, v, (url) => parseMediaLink(url, appUrl()) !== null, await appZone(await getStore(), app));
  if (!saved.ok) return saved.errors ? { errors: saved.errors, values: v } : { message: saved.message };
  await saveSetup(app, saved.setup);
  // 85.3 A new lesson: its course's students hear of it.
  const course = saved.setup.courses.find((c) => c.id === courseId);
  if (saved.added && course) {
    await notifyNewLesson({ store: await getStore(), key: encryptionKey(), now: new Date() }, { ...app, courseSetup: saved.setup }, course, saved.lesson).catch((error: unknown) => {
      console.error("[new lesson]", error instanceof Error ? error.message : String(error));
    });
  }
  return { ok: true, message: saved.added ? `Added “${saved.lesson.title}”.` : `Saved “${saved.lesson.title}”.`, values: saved.added ? undefined : v };
}

export async function deleteLessonAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  const courseId = Number(formData.get("courseId"));
  const lessonId = Number(formData.get("lessonId"));
  await saveSetup(
    app,
    withCourse(courseSetup(app), courseId, (c) => ({ ...c, topics: c.topics.map((t) => ({ ...t, lessons: t.lessons.filter((l) => l.id !== lessonId) })) })),
  );
}

/** 90.1 A quiz at the end of a section. */
export async function saveQuizAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const courseId = Number(formData.get("courseId"));
  const topicId = Number(formData.get("topicId"));
  const v = values(formData, ["id", "title", "passPercent", "attemptsAllowed", "timeLimit", "questions", "bankPicks"]);
  // 112.5
  v.shuffle = formData.get("shuffle") === "on" ? "on" : "";
  v.showAnswers = formData.get("showAnswers") === "on" ? "on" : "";
  const saved = saveQuiz(courseSetup(app), courseId, topicId, v);
  if (!saved.ok) return saved.errors ? { errors: saved.errors, values: v } : { message: saved.message };
  await saveSetup(app, saved.setup);
  return { ok: true, message: saved.added ? `Added “${saved.quiz.title}”.` : `Saved “${saved.quiz.title}”.`, values: saved.added ? undefined : v };
}

export async function deleteQuizAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  await saveSetup(app, deleteQuiz(courseSetup(app), Number(formData.get("courseId")), Number(formData.get("quizId"))));
}

/** Our client adds a student who paid another way, by the phone number they sign in with. */
export async function addStudentAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const courseId = Number(formData.get("courseId"));
  const phoneText = String(formData.get("phone") ?? "").trim();
  if (!courseSetup(app).courses.some((c) => c.id === courseId)) return { message: "This course no longer exists." };
  const phone = parseAnyPhone(phoneText, hostedSettings(app).defaultCountryCode);
  if (!phone) return { errors: { phone: "Enter the student's mobile number." }, values: { phone: phoneText } };
  const store = await getStore();
  const user = await store.getHostedUserByPhone(app.id, phone.e164);
  if (!user) return { errors: { phone: "No one with this number has signed in to your app yet." }, values: { phone: phoneText } };
  const added = await store.enrollInCourse({ appId: app.id, userId: user.id, courseId, source: "manual", enrolledAt: new Date() });
  revalidatePath(`/dashboard/courses/${courseId}`);
  return { ok: true, message: added ? `${user.name} can now open this course.` : `${user.name} was already enrolled.` };
}

/** 45 Offline downloads on or off (WordPress: or the plugin's own setting). */
export async function saveOfflineDownloadsAction(_: FormState, formData: FormData): Promise<FormState> {
  // 60 An app-wide choice: the owner and managers.
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app || !offersDownloads(app)) redirect("/dashboard");
  const choice = String(formData.get("downloads") ?? "");
  const value = parseDownloadsChoice(choice, app);
  if (value === undefined) return { errors: { downloads: "Choose whether students can save lessons." }, values: { downloads: choice } };
  const before = app.hostedSettings?.offlineDownloads ?? null;
  const next = { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), offlineDownloads: value };
  await (await getStore()).updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(context, "Changed offline downloads for the app", { offlineDownloads: before }, { offlineDownloads: value });
  // 31 The plugin reads the choice from its license status: ask the site to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  revalidatePath("/dashboard/courses");
  const message =
    app.backend === "setup_requested"
      ? "Saved. It applies as soon as your WordPress site and the Yallapp plugin are ready."
      : app.connector?.kind !== "courses"
        ? "Saved. Your website gets it within a minute when it can be reached, otherwise at its next check (twice a day)."
        : value
          ? "Saved. Students can save lessons from the next time the app opens."
          : "Saved. The app deletes saved lessons the next time it opens with a connection.";
  return { ok: true, message, values: { downloads: choice } };
}

// 112.5 The course builder: sections renamed and moved, items in order, assignments and live classes.

export async function renameTopicAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const title = String(formData.get("title") ?? "");
  const renamed = renameTopic(courseSetup(app), Number(formData.get("courseId")), Number(formData.get("topicId")), title);
  if (!renamed.ok) return { errors: renamed.errors, values: { title } };
  await saveSetup(app, renamed.setup);
  return { ok: true, message: "Saved." };
}

export async function moveTopicAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  const moved = moveTopic(courseSetup(app), Number(formData.get("courseId")), Number(formData.get("topicId")), formData.get("step") === "up" ? -1 : 1);
  if (moved) await saveSetup(app, moved);
}

export async function moveItemAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  const moved = moveItem(courseSetup(app), Number(formData.get("courseId")), Number(formData.get("topicId")), Number(formData.get("itemId")), formData.get("step") === "up" ? -1 : 1);
  if (moved) await saveSetup(app, moved);
}

/** An assignment or a live class. */
export async function deleteItemAction(formData: FormData): Promise<void> {
  const { app } = await requireCoursesApp();
  await saveSetup(app, deleteItem(courseSetup(app), Number(formData.get("courseId")), Number(formData.get("itemId"))));
}

const isMedia = (url: string) => parseMediaLink(url, appUrl()) !== null;

export async function saveAssignmentAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const v = values(formData, ["id", "title", "instructions", "maxPoints", "passPoints", "dueDays", "dueOn", "attachments"]);
  const saved = saveAssignment(courseSetup(app), Number(formData.get("courseId")), Number(formData.get("topicId")), v, await appZone(await getStore(), app), isMedia);
  if (!saved.ok) return saved.errors ? { errors: saved.errors, values: v } : { message: saved.message };
  await saveSetup(app, saved.setup);
  return { ok: true, message: saved.added ? `Added “${saved.item.title}”.` : `Saved “${saved.item.title}”.`, values: saved.added ? undefined : v };
}

export async function saveLiveAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const v = values(formData, ["id", "title", "date", "time", "duration", "meetingUrl", "notes", "recordingUrl"]);
  const saved = saveLive(courseSetup(app), Number(formData.get("courseId")), Number(formData.get("topicId")), v, await appZone(await getStore(), app), isMedia);
  if (!saved.ok) return saved.errors ? { errors: saved.errors, values: v } : { message: saved.message };
  await saveSetup(app, saved.setup);
  return { ok: true, message: saved.added ? `Added “${saved.item.title}”.` : `Saved “${saved.item.title}”.`, values: saved.added ? undefined : v };
}

/** 112.5 Grades a student's assignment, or sends it back for another try; the student hears of it. */
export async function gradeSubmissionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCoursesApp();
  const { app } = context;
  const store = await getStore();
  const submission = await store.getAssignmentSubmission(app.id, Number(formData.get("submissionId")));
  const found = submission ? findAssignment(courseSetup(app), submission.assignmentId) : null;
  if (!submission || !found) return { message: "This assignment no longer exists." };
  const v = values(formData, ["score", "feedback", "outcome"]);
  const grade = parseGrade(v, found.assignment);
  if (!grade.ok) return { errors: grade.errors, values: v };
  const now = new Date();
  const by = (context.member ?? context.staff ?? context.user).name;
  await store.gradeAssignmentSubmission(app.id, submission.id, { ...grade.value, gradedAt: now, gradedBy: by });
  await notifyGraded({ store, key: encryptionKey(), now }, app, found.course, found.assignment, { ...submission, ...grade.value, gradedAt: now }).catch((error: unknown) => {
    console.error("[assignment graded]", error instanceof Error ? error.message : String(error));
  });
  revalidatePath(`/dashboard/courses/${found.course.id}/assignments`);
  return { ok: true, message: grade.value.status === "returned" ? "Sent back to the student." : "Graded. The student can see it in the app." };
}

/** 112.5 Several students at once, by the phone numbers they sign in with (pasted from a sheet). */
export async function addStudentsAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const courseId = Number(formData.get("courseId"));
  const text = String(formData.get("phones") ?? "");
  if (!courseSetup(app).courses.some((c) => c.id === courseId)) return { message: "This course no longer exists." };
  const phones = parsePhones(text, hostedSettings(app).defaultCountryCode);
  if (!phones.ok) return { errors: { phones: phones.error }, values: { phones: text } };
  const store = await getStore();
  let added = 0;
  let already = 0;
  const unknown: string[] = [];
  for (const phone of phones.value) {
    const user = await store.getHostedUserByPhone(app.id, phone.e164);
    if (!user) unknown.push(phone.text);
    else if (await store.enrollInCourse({ appId: app.id, userId: user.id, courseId, source: "manual", enrolledAt: new Date() })) added++;
    else already++;
  }
  revalidatePath(`/dashboard/courses/${courseId}`);
  const counted = `Added ${added}, already enrolled ${already}.`;
  if (!unknown.length) return { ok: true, message: counted };
  // The numbers that haven't signed in yet stay in the box, to try again later.
  return { message: `Added ${added}, already enrolled ${already}. Not signed in to your app yet: ${unknown.slice(0, 20).join(", ")}.`, values: { phones: unknown.join("\n") } };
}

/** 112.5 The course's question bank, which its quizzes draw from at random. */
export async function saveQuestionBankAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireCoursesApp();
  const text = String(formData.get("bank") ?? "");
  const saved = saveQuestionBank(courseSetup(app), Number(formData.get("courseId")), text);
  if (!saved.ok) return { errors: { bank: saved.error }, values: { bank: text } };
  await saveSetup(app, saved.setup);
  return { ok: true, message: `Saved ${saved.count} questions.`, values: { bank: text } };
}
