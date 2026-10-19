"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { parseCourse, parseLesson } from "@/lib/courses/forms";
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
import { appUrl } from "@/lib/env";
import { parseMediaLink } from "@/lib/media/files";

const COURSE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** A client whose courses are managed in the dashboard, or a redirect. */
async function requireCoursesApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
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

function withCourse(setup: CourseSetup, id: number, change: (c: Course) => Course): CourseSetup {
  return { ...setup, courses: setup.courses.map((c) => (c.id === id ? change(c) : c)) };
}

export async function saveCourseAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCoursesApp();
  const { app } = context;
  const v = values(formData, ["id", "title", "description", "price", "instructor", "level"]);
  v.active = formData.get("active") === "on" ? "on" : "";
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
  redirect(`/dashboard/courses/${course.id}`);
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
  const v = values(formData, ["id", "title", "videoUrl", "text", "duration"]);
  v.preview = formData.get("preview") === "on" ? "on" : "";
  const setup = courseSetup(app);
  const topic = setup.courses.find((c) => c.id === courseId)?.topics.find((t) => t.id === topicId);
  if (!topic) return { message: "This section no longer exists." };
  const parsed = parseLesson(v, (url) => parseMediaLink(url, appUrl()) !== null);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  const id = v.id ? Number(v.id) : null;
  if (id !== null && !topic.lessons.some((l) => l.id === id)) return { message: "This lesson no longer exists." };
  const lessons = id === null ? [...topic.lessons, { id: setup.nextId, ...parsed.value }] : topic.lessons.map((l) => (l.id === id ? { id, ...parsed.value } : l));
  const next = withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => (t.id === topicId ? { ...t, lessons } : t)) }));
  await saveSetup(app, id === null ? { ...next, nextId: setup.nextId + 1 } : next);
  return { ok: true, message: id === null ? `Added “${parsed.value.title}”.` : `Saved “${parsed.value.title}”.`, values: id === null ? undefined : v };
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
  const context = await getClientContext();
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
