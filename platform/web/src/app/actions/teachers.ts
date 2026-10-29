"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { withCourse } from "@/lib/courses/edit";
import { courseSetup } from "@/lib/courses/setup";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, CourseSetup } from "@/lib/data/types";
import { notifyDeps } from "@/lib/delivery/flow";
import { formValues, type FormState } from "@/lib/forms";
import { hostedSettings } from "@/lib/hosted/service";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { imageType } from "@/lib/images";
import { publishCourse, returnCourse } from "@/lib/teachers/courses";
import { parseTeacherForm, teacherShareBp } from "@/lib/teachers/forms";
import { tellFollowers, tellTeacherReviewed } from "@/lib/teachers/notify";
import { isTeachersApp } from "@/lib/teachers/service";

/**
 * 105.3 The Teachers, Courses to review and Teacher statements pages of an
 * academy with many teachers: its teachers and their shares, applications to
 * teach, and publishing or sending back a teacher's course.
 */

const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const NOTE_MAX = 500;
const TEACHERS_MAX = 500;

async function requireTeachersApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("catalog");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || !isTeachersApp(context.app)) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  for (const path of ["/dashboard/teachers", "/dashboard/courses"]) revalidatePath(path, "layout");
}

function emailOnly(app: App): boolean {
  const methods = hostedSignInMethods(app);
  return methods.length === 1 && methods[0] === "email";
}

/** The teacher's photo (PNG or JPEG) kept as an asset, or none. */
async function photo(context: ClientContext, file: FormDataEntryValue | null, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > PHOTO_MAX_BYTES) return { error: "The photo can be up to 3 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return { error: "Photos must be PNG or JPEG files." };
  const assetId = newId();
  const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
  await getBlobStore().put(blobKey, data, type.contentType);
  await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
  return { assetId };
}

export async function saveTeacherAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTeachersApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getTeacher(app.id, id) : null;
  if (id !== null && !existing) return { message: "This teacher doesn't exist anymore." };
  const parsed = parseTeacherForm(values, hostedSettings(app).defaultCountryCode, emailOnly(app));
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (!existing && (await store.listTeachers(app.id)).length >= TEACHERS_MAX) return { message: `You can have up to ${TEACHERS_MAX} teachers.`, values };
  const picture = await photo(context, formData.get("photo"), now);
  if ("error" in picture) return { errors: { photo: picture.error }, values };
  const photoAssetId = picture.assetId ?? (formData.get("removePhoto") === "on" ? null : (existing?.photoAssetId ?? null));
  const { name, phone, email, bio, subjects, shareBp, featured } = parsed.value;
  if (existing) {
    // Saving an application approves it.
    const saved = await store.updateTeacher(app.id, existing.id, { name, phone, email, bio, subjects, shareBp, featured, photoAssetId, ...(existing.status === "applied" ? { status: "active" as const, note: null } : {}) }, now);
    if (!saved.ok) return { errors: { phone: "You already have a teacher with this number or email." }, values };
  } else {
    const created = await store.createTeacher({ appId: app.id, name, phone, email, userId: null, photoAssetId, bio, subjects, status: "active", shareBp, featured }, now);
    if (!created.ok) return { errors: { phone: "You already have a teacher with this number or email." }, values };
  }
  await recordStaffChange(context, `${existing ? "Edited" : "Added"} the teacher ${name}`);
  refresh();
  return existing ? { ok: true, message: "Saved.", values } : { ok: true, message: "Added. They sign in to the app with this number and see the Teacher tab.", values: {} };
}

export async function setTeacherStatusAction(formData: FormData): Promise<void> {
  const context = await requireTeachersApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const teacher = Number.isSafeInteger(id) ? await store.getTeacher(context.app.id, id) : null;
  if (!teacher || teacher.status === "applied" || teacher.status === "declined") return;
  const active = formData.get("active") === "true";
  await store.updateTeacher(context.app.id, teacher.id, { status: active ? "active" : "suspended" }, new Date());
  await recordStaffChange(context, `${active ? "Allowed" : "Suspended"} the teacher ${teacher.name}`);
  refresh();
}

export async function deleteTeacherAction(formData: FormData): Promise<void> {
  const context = await requireTeachersApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const teacher = Number.isSafeInteger(id) ? await store.getTeacher(context.app.id, id) : null;
  if (!teacher) return;
  await store.deleteTeacher(context.app.id, teacher.id);
  // Their courses become the academy's, keeping the teacher's name on them.
  const setup = courseSetup(context.app);
  await store.updateApp(context.app.id, { courseSetup: { ...setup, courses: setup.courses.map((c) => (c.teacherId === teacher.id ? { ...c, teacherId: null, instructorName: c.instructorName ?? teacher.name } : c)) } }, new Date());
  await recordStaffChange(context, `Deleted the teacher ${teacher.name}`);
  refresh();
}

/** An application to teach: approved with the teacher's share, or declined with a note they read in the app. */
export async function answerApplicationAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTeachersApp();
  const store = await getStore();
  const values = formValues(formData);
  const id = Number(formData.get("id"));
  const teacher = Number.isSafeInteger(id) ? await store.getTeacher(context.app.id, id) : null;
  if (!teacher || teacher.status !== "applied") return { message: "This application was already answered." };
  const now = new Date();
  if (formData.get("decision") === "decline") {
    const note = String(formData.get("note") ?? "").trim().slice(0, NOTE_MAX);
    await store.updateTeacher(context.app.id, teacher.id, { status: "declined", note: note || null }, now);
    await recordStaffChange(context, `Declined ${teacher.name}'s application to teach`);
    refresh();
    return { ok: true, message: "Declined. They can read your note in the app." };
  }
  const shareBp = teacherShareBp(String(formData.get("share") ?? ""));
  if (shareBp === null) return { errors: { share: "Enter the teacher's share of their courses' sales, from 0 to 100%." }, values };
  await store.updateTeacher(context.app.id, teacher.id, { status: "active", shareBp, note: null }, now);
  await recordStaffChange(context, `Approved ${teacher.name} as a teacher`);
  refresh();
  return { ok: true, message: "Approved. They see the Teacher tab next time they open the app." };
}

/** Whether people may apply to teach from the app. */
export async function saveApplicationsAction(formData: FormData): Promise<void> {
  const context = await requireTeachersApp();
  const on = formData.get("on") === "true";
  const setup = courseSetup(context.app);
  await (await getStore()).updateApp(context.app.id, { courseSetup: { ...setup, teachersApply: on } }, new Date());
  await recordStaffChange(context, on ? "Let people apply to teach from the app" : "Stopped applications to teach from the app");
  refresh();
}

/** Publishes a teacher's course, or sends it back with what to change; the teacher hears of it, and on its first publishing their followers do. */
export async function reviewCourseAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTeachersApp();
  const { app } = context;
  const store = await getStore();
  const courseId = Number(formData.get("courseId"));
  const setup = courseSetup((await store.getAppById(app.id)) ?? app);
  const course = setup.courses.find((c) => c.id === courseId && c.teacherId);
  if (!course) return { message: "This course doesn't exist anymore." };
  const teacher = await store.getTeacher(app.id, course.teacherId!);
  const now = new Date();
  let next: CourseSetup;
  let outcome: "published" | "returned";
  if (formData.get("decision") === "return") {
    const note = String(formData.get("note") ?? "").trim();
    if (!note) return { errors: { note: "Say what the teacher should change." }, values: { note } };
    next = returnCourse(setup, course.id, note.slice(0, NOTE_MAX));
    outcome = "returned";
  } else {
    next = publishCourse(setup, course.id);
    outcome = "published";
  }
  await store.updateApp(app.id, { courseSetup: next }, now);
  const saved = next.courses.find((c) => c.id === course.id)!;
  if (teacher) {
    const deps = notifyDeps({ store, app: { ...app, courseSetup: next }, now });
    await tellTeacherReviewed(deps, teacher, saved, outcome).catch(() => 0);
    // Followers hear of a course the first time it is out (not when it comes back from hidden).
    if (outcome === "published" && course.teacherStage) await tellFollowers(deps, teacher, saved).catch(() => 0);
  }
  await recordStaffChange(context, `${outcome === "published" ? "Published" : "Sent back"} the course ${course.title}`);
  refresh();
  return { ok: true, message: outcome === "published" ? "Published. Students see it in the app now." : "Sent back. The teacher reads your note in the app." };
}

/** The teacher a course belongs to (the academy's own when none). */
export async function setCourseTeacherAction(formData: FormData): Promise<void> {
  const context = await requireTeachersApp();
  const { app } = context;
  const store = await getStore();
  const courseId = Number(formData.get("courseId"));
  const teacherText = String(formData.get("teacherId") ?? "");
  const teacher = teacherText ? await store.getTeacher(app.id, Number(teacherText)) : null;
  if (teacherText && !teacher) return;
  const setup = courseSetup(app);
  const course = setup.courses.find((c) => c.id === courseId);
  if (!course) return;
  await store.updateApp(app.id, { courseSetup: withCourse(setup, courseId, (c) => ({ ...c, teacherId: teacher?.id ?? null, instructorName: teacher?.name ?? c.instructorName })) }, new Date());
  await recordStaffChange(context, `Gave the course ${course.title} to ${teacher ? teacher.name : "the academy"}`);
  refresh();
}
