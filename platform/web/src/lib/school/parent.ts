import type { Lang } from "@/i18n/config";
import { addDays, isDate, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, HostedUser, SchoolClass, SchoolExcuse, SchoolExcuseStatus, SchoolFileRef, SchoolPerson, SchoolPickup, SchoolPickupNote, SchoolPickupPerson, SchoolSlip, SchoolSlipAnswer, SchoolSlipAudience, SchoolSlipInput } from "../data/types";
import { notifyDeps, type FlowDeps } from "../delivery/flow";
import type { Words } from "../delivery/notify";
import { pushOwnerSafely } from "../owner/push-env";
import { pushToOwner, type OwnerPushDeps } from "../owner/push";
import { eventFor, studentView } from "./calendar";
import { excusedOn } from "./checkin";

export { excusedOn };
import { fileJson, studentJson, type SchoolDirectory } from "./service";
import { schoolSettingsOf } from "./settings";
import { daysBetween } from "./staff";
import { parentUsers, tellUsers } from "./tell";

/**
 * 113.4 The parent's area: permission slips the school sends for a class, a
 * grade or the whole school, signed yes or no by a parent with their name
 * by the due date (the parents told when one comes and reminded the day
 * before from 17:00, `school_slip`); a parent's excuse for a child's
 * absence (a day or several, a reason, a photo or PDF), accepted or
 * declined by the school (`school_excuse`), an accepted one making those
 * days excused in the class register and at the gate; who may pick a child
 * up (name, relation, phone, a photo) and a one-day note ("today X picks
 * up") the school sees on the day's board. Messages are English; the
 * dashboard translates them (`parents.known`).
 */

export const PARENT_LIMITS = {
  slips: 2000,
  title: 120,
  details: 2000,
  feeNote: 200,
  signedName: 120,
  reason: 1000,
  answer: 1000,
  /** An excuse of up to this many days. */
  excuseDays: 60,
  /** People on a child's pick-up list. */
  people: 10,
  name: 120,
  relation: 60,
  phone: 30,
  note: 300,
} as const;

/** An excuse can be sent for up to this many days back (an absence told after it) and ahead. */
export const EXCUSE_DAYS_BACK = 30;
export const EXCUSE_DAYS_AHEAD = 60;
/** A one-day pick-up note is for today or one of the next days. */
export const PICKUP_DAYS_AHEAD = 30;
/** The reminder of a slip due tomorrow goes from this hour, in the school's time zone. */
export const SLIP_REMINDER_HOUR = 17;

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };
type Read<T> = { ok: true; value: T } | { ok: false; message: string };

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const optional = (value: unknown): string | null => text(value) || null;

async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch {
    // The change is saved either way.
  }
}

// A parent's children

/** A parent's active children, in the order the school added them (never the parent themselves). */
export async function childrenOf(store: DataStore, appId: string, parent: SchoolPerson): Promise<SchoolPerson[]> {
  const links = await store.listSchoolFamily(appId, { parentId: parent.id });
  const children = await store.listSchoolPeople(appId, { role: "student", ids: links.map((l) => l.studentId) });
  return children.filter((c) => c.active).sort((a, b) => a.id - b.id);
}

// Permission slips

/** Whether a slip is for the student (their class, their grade, or everyone). */
export function slipFor(slip: Pick<SchoolSlip, "audience" | "grade" | "classId">, student: Pick<SchoolPerson, "classId">, classes: Map<number, SchoolClass>): boolean {
  return eventFor(slip, studentView(student, classes));
}

/** Answers are taken to the end of the due date. */
export const slipOpen = (slip: Pick<SchoolSlip, "dueOn">, today: string) => today <= slip.dueOn;

/** The active students a slip is for. */
export async function slipStudents(store: DataStore, appId: string, slip: SchoolSlip): Promise<SchoolPerson[]> {
  const [classes, students] = await Promise.all([store.listSchoolClasses(appId), store.listSchoolPeople(appId, { role: "student" })]);
  const byId = new Map(classes.map((c) => [c.id, c]));
  return students.filter((s) => s.active && slipFor(slip, s, byId)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Who a slip is for, in a word: the grade or the class's name, else null (everyone). */
export function slipForName(slip: Pick<SchoolSlip, "audience" | "grade" | "classId">, classes: Map<number, Pick<SchoolClass, "name">>): string | null {
  if (slip.audience === "grade") return slip.grade;
  if (slip.audience === "class") return slip.classId !== null ? (classes.get(slip.classId)?.name ?? null) : null;
  return null;
}

/** A slip as a parent sees it: each of their children it is for, with the answer given. */
export function slipJson(slip: SchoolSlip, children: readonly SchoolPerson[], answers: readonly SchoolSlipAnswer[], dir: Pick<SchoolDirectory, "classes">, today: string) {
  return {
    id: slip.id,
    title: slip.title,
    details: slip.details,
    due_on: slip.dueOn,
    fee_note: slip.feeNote,
    for_name: slipForName(slip, dir.classes),
    open: slipOpen(slip, today),
    created_at: slip.createdAt.toISOString(),
    children: children.map((child) => {
      const answer = answers.find((a) => a.slipId === slip.id && a.studentId === child.id) ?? null;
      return {
        student_id: child.id,
        student_name: child.name,
        answer: answer?.answer ?? null,
        signed_name: answer?.signedName ?? null,
        answered_at: answer?.answeredAt.toISOString() ?? null,
      };
    }),
  };
}

/** A parent's answer from the app, checked. */
export function readSlipAnswer(body: Record<string, unknown>): Read<{ studentId: number; answer: "yes" | "no"; signedName: string }> {
  const studentId = body.student_id;
  if (typeof studentId !== "number" || !Number.isSafeInteger(studentId)) return { ok: false, message: "Choose the child you answer for." };
  if (body.answer !== "yes" && body.answer !== "no") return { ok: false, message: "Answer yes or no." };
  const signedName = text(body.signed_name);
  if (!signedName) return { ok: false, message: "Sign with your name." };
  if (signedName.length > PARENT_LIMITS.signedName) return { ok: false, message: `Your name can be up to ${PARENT_LIMITS.signedName} characters.` };
  return { ok: true, value: { studentId, answer: body.answer, signedName } };
}

/** Who has answered a slip and how, of the students it is for. */
export function slipCounts(students: readonly Pick<SchoolPerson, "id">[], answers: readonly SchoolSlipAnswer[]): { yes: number; no: number; waiting: number } {
  const byStudent = new Map(answers.map((a) => [a.studentId, a.answer]));
  let yes = 0;
  let no = 0;
  for (const s of students) {
    const answer = byStudent.get(s.id);
    if (answer === "yes") yes += 1;
    else if (answer === "no") no += 1;
  }
  return { yes, no, waiting: students.length - yes - no };
}

/** Who a slip is for, from the form's choice: `school`, `grade:Grade 5` or `class:12`. */
function slipAudienceOf(value: string, classes: readonly Pick<SchoolClass, "id" | "grade">[]): { audience: SchoolSlipAudience; grade: string | null; classId: number | null } | null {
  if (value === "school") return { audience: "school", grade: null, classId: null };
  if (value.startsWith("grade:")) {
    const grade = value.slice(6);
    return classes.some((c) => c.grade === grade) ? { audience: "grade", grade, classId: null } : null;
  }
  if (value.startsWith("class:")) {
    const id = Number(value.slice(6));
    return classes.some((c) => c.id === id) ? { audience: "class", grade: null, classId: id } : null;
  }
  return null;
}

export const slipAudienceValue = (slip: Pick<SchoolSlip, "audience" | "grade" | "classId">) =>
  slip.audience === "class" && slip.classId !== null ? `class:${slip.classId}` : slip.audience === "grade" && slip.grade !== null ? `grade:${slip.grade}` : "school";

/** The dashboard's slip form: its title, details, due date, an optional note of a fee, and whom it is for. */
export function parseSlipForm(form: Record<string, string>, classes: readonly Pick<SchoolClass, "id" | "grade">[], today: string, existing: Pick<SchoolSlip, "dueOn"> | null): Parsed<Omit<SchoolSlipInput, "appId">> {
  const errors: Record<string, string> = {};
  const field = (name: string, max: number, empty: string | null) => {
    const value = (form[name] ?? "").trim();
    if (!value && empty) errors[name] = empty;
    else if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
    return value;
  };
  const title = field("title", PARENT_LIMITS.title, "Give the slip a title.");
  const details = field("details", PARENT_LIMITS.details, null);
  const feeNote = field("feeNote", PARENT_LIMITS.feeNote, null);
  const dueOn = (form.dueOn ?? "").trim();
  // A slip already sent keeps a due date that passed; a new one is due today or later.
  if (!isDate(dueOn)) errors.dueOn = "Choose the day answers are due.";
  else if (dueOn < today && dueOn !== existing?.dueOn) errors.dueOn = "The due date is today or later.";
  else if (dueOn > addDays(today, 366)) errors.dueOn = "The due date is within a year.";
  const audience = slipAudienceOf((form.audience ?? "").trim(), classes);
  if (!audience) errors.audience = "Choose whom the slip is for.";
  if (Object.keys(errors).length || !audience) return { ok: false, errors };
  return { ok: true, value: { title, details: details || null, dueOn, feeNote: feeNote || null, ...audience } };
}

const SLIP: Record<Lang, (title: string, due: string) => Words> = {
  en: (title, due) => ({ title: "A permission slip to sign", body: `${title}: answer yes or no by ${due}.` }),
  ar: (title, due) => ({ title: "إذن موافقة للتوقيع", body: `${title}: أجب بنعم أو لا قبل ${due}.` }),
  tr: (title, due) => ({ title: "İmzalanacak bir izin formu", body: `${title}: ${due} tarihine kadar evet ya da hayır deyin.` }),
};

const SLIP_REMINDER: Record<Lang, (title: string) => Words> = {
  en: (title) => ({ title: "A permission slip is due tomorrow", body: `${title}: you haven't answered yet.` }),
  ar: (title) => ({ title: "موعد إذن الموافقة غدًا", body: `${title}: لم تُجب بعد.` }),
  tr: (title) => ({ title: "İzin formunun son günü yarın", body: `${title}: henüz yanıt vermediniz.` }),
};

/** The accounts of the parents of some students, each once. */
async function parentsOf(store: DataStore, students: readonly SchoolPerson[]): Promise<HostedUser[]> {
  const out: HostedUser[] = [];
  for (const student of students) for (const user of await parentUsers(store, student)) if (!out.some((u) => u.id === user.id)) out.push(user);
  return out;
}

/** A new slip (or one changed): saved, and on a new one each parent of its students hears of it once. */
export async function sendSlip(deps: FlowDeps, input: SchoolSlipInput & { id: number | null }): Promise<SchoolSlip | null> {
  const { store, app, now } = deps;
  const slip = await store.saveSchoolSlip(input, now);
  if (!slip || input.id !== null) return slip;
  const parents = await parentsOf(store, await slipStudents(store, app.id, slip));
  await safely(() => tellUsers(notifyDeps(deps), parents, (lang) => SLIP[lang](slip.title, slip.dueOn), { type: "school_slip", slip_id: String(slip.id) }));
  return slip;
}

/** The day before each slip's due date, from 17:00: the parents with a child who hasn't an answer yet; once per slip. */
export async function remindSlips(deps: FlowDeps): Promise<number> {
  const { store, app, now } = deps;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const local = utcToLocal(now, settings.timezone);
  if (Number(local.time.slice(0, 2)) < SLIP_REMINDER_HOUR) return 0;
  const tomorrow = addDays(local.date, 1);
  const slips = (await store.listSchoolSlips(app.id, { from: tomorrow, to: tomorrow })).filter((s) => s.remindedAt === null);
  let reminded = 0;
  for (const slip of slips) {
    if (!(await store.markSchoolSlipReminded(app.id, slip.id, now))) continue;
    reminded += 1;
    const answered = new Set((await store.listSchoolSlipAnswers(app.id, { slipId: slip.id })).map((a) => a.studentId));
    const waiting = (await slipStudents(store, app.id, slip)).filter((s) => !answered.has(s.id));
    const parents = await parentsOf(store, waiting);
    await safely(() => tellUsers(notifyDeps(deps), parents, (lang) => SLIP_REMINDER[lang](slip.title), { type: "school_slip", slip_id: String(slip.id) }));
  }
  return reminded;
}

// Absence excuses

/** An excuse from the app, checked: its first and last days, the reason. */
export function readExcuseInput(body: Record<string, unknown>, today: string): Read<{ startsOn: string; endsOn: string; reason: string }> {
  const startsOn = text(body.starts_on);
  const endsOn = text(body.ends_on) || startsOn;
  if (!isDate(startsOn) || !isDate(endsOn)) return { ok: false, message: "Give the first and the last day, like 2026-11-02." };
  if (endsOn < startsOn) return { ok: false, message: "The last day is on or after the first." };
  if (startsOn < addDays(today, -EXCUSE_DAYS_BACK)) return { ok: false, message: `An absence can be excused up to ${EXCUSE_DAYS_BACK} days back.` };
  if (endsOn > addDays(today, EXCUSE_DAYS_AHEAD)) return { ok: false, message: `An absence can be excused up to ${EXCUSE_DAYS_AHEAD} days ahead.` };
  if (daysBetween(startsOn, endsOn) > PARENT_LIMITS.excuseDays) return { ok: false, message: `Excuse up to ${PARENT_LIMITS.excuseDays} days at a time.` };
  const reason = text(body.reason);
  if (!reason) return { ok: false, message: "Write the reason for the absence." };
  if (reason.length > PARENT_LIMITS.reason) return { ok: false, message: `The reason can be up to ${PARENT_LIMITS.reason} characters.` };
  return { ok: true, value: { startsOn, endsOn, reason } };
}

export function excuseJson(excuse: SchoolExcuse, platformUrl: string, student?: Pick<SchoolPerson, "name"> | null) {
  return {
    id: excuse.id,
    student_id: excuse.studentId,
    ...(student !== undefined ? { student_name: student?.name ?? null } : {}),
    starts_on: excuse.startsOn,
    ends_on: excuse.endsOn,
    days: daysBetween(excuse.startsOn, excuse.endsOn),
    reason: excuse.reason,
    file: excuse.file ? fileJson(excuse.file, platformUrl) : null,
    status: excuse.status,
    answer: excuse.answer,
    answered_at: excuse.answeredAt?.toISOString() ?? null,
    created_at: excuse.createdAt.toISOString(),
  };
}

/** "Excused: a fever" for the register's note of an excused day. */
export const excusedNote = (excuse: Pick<SchoolExcuse, "reason">) => `Excused: ${excuse.reason}`.slice(0, 300);

const EXCUSE: Record<"accepted" | "declined", Record<Lang, (name: string, from: string, to: string) => Words>> = {
  accepted: {
    en: (name, from, to) => ({ title: "Absence excused", body: from === to ? `The school accepted ${name}'s excuse for ${from}.` : `The school accepted ${name}'s excuse from ${from} to ${to}.` }),
    ar: (name, from, to) => ({ title: "قُبل عذر الغياب", body: from === to ? `قبلت المدرسة عذر ${name} عن يوم ${from}.` : `قبلت المدرسة عذر ${name} من ${from} إلى ${to}.` }),
    tr: (name, from, to) => ({ title: "Devamsızlık mazereti kabul edildi", body: from === to ? `Okul ${name} için ${from} mazeretini kabul etti.` : `Okul ${name} için ${from} – ${to} mazeretini kabul etti.` }),
  },
  declined: {
    en: (name) => ({ title: "Excuse not accepted", body: `The school didn't accept ${name}'s excuse. See its note in the app.` }),
    ar: (name) => ({ title: "لم يُقبل العذر", body: `لم تقبل المدرسة عذر ${name}. اطّلع على ملاحظتها في التطبيق.` }),
    tr: (name) => ({ title: "Mazeret kabul edilmedi", body: `Okul ${name} için gönderilen mazereti kabul etmedi. Okulun notu uygulamada.` }),
  },
};

/** A parent sent an excuse: the administration's phones on Yallapp Business. */
export function pushExcuseSent(deps: OwnerPushDeps, app: App, excuse: SchoolExcuse, student: SchoolPerson): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_message",
    (w) => ({
      title: w.t("parents.pushExcuse", { name: student.name }),
      body: excuse.startsOn === excuse.endsOn ? excuse.startsOn : `${excuse.startsOn} – ${excuse.endsOn}`,
    }),
    { app_id: app.id, school_excuse_id: String(excuse.id) },
    "settings",
  );
}

/** A new excuse from a parent: saved, and the administration hears of it. */
export async function sendExcuse(deps: FlowDeps & { pushOwner?: typeof pushOwnerSafely }, input: Omit<SchoolExcuse, "id" | "status" | "answer" | "answeredBy" | "answeredAt" | "createdAt" | "updatedAt">, student: SchoolPerson): Promise<SchoolExcuse> {
  const { store, app, now } = deps;
  const excuse = await store.createSchoolExcuse({ ...input, status: "pending", answer: null, answeredBy: null, answeredAt: null, createdAt: now, updatedAt: now });
  await safely(() => (deps.pushOwner ?? pushOwnerSafely)((d) => pushExcuseSent(d, app, excuse, student), store));
  return excuse;
}

/**
 * The school's answer to an excuse while it waits; the child's parents hear
 * of it. Accepted, the days already marked absent in the class register
 * become excused (the days to come are when the teacher takes them, and at
 * the gate the day reads excused). False: answered or withdrawn already.
 */
export async function answerExcuse(deps: FlowDeps, excuse: SchoolExcuse, status: "accepted" | "declined", answer: string | null, by: string): Promise<boolean> {
  const { store, app, now } = deps;
  const changed = await store.updateSchoolExcuse(app.id, excuse.id, { status, answer, answeredBy: by, answeredAt: now, updatedAt: now }, ["pending"]);
  if (!changed) return false;
  const student = await store.getSchoolPerson(app.id, excuse.studentId);
  if (!student) return true;
  if (status === "accepted") {
    const rows = await store.listSchoolAttendance(app.id, { studentId: student.id, from: excuse.startsOn, to: excuse.endsOn });
    const absent = rows.filter((r) => r.status === "absent");
    if (absent.length) await store.saveSchoolAttendance(absent.map((r) => ({ ...r, status: "excused" as const, note: r.note ?? excusedNote(excuse), updatedAt: now })));
  }
  await safely(async () => {
    const users = await parentUsers(store, student);
    await tellUsers(notifyDeps(deps), users, (lang) => EXCUSE[status][lang](student.name, excuse.startsOn, excuse.endsOn), { type: "school_excuse", student_id: String(student.id) });
  });
  return true;
}

export const EXCUSE_STATUSES: readonly SchoolExcuseStatus[] = ["pending", "accepted", "declined", "cancelled"];

// Pick-up

export function pickupPersonJson(person: SchoolPickupPerson, platformUrl: string) {
  return { name: person.name, relation: person.relation, phone: person.phone, photo: person.photo ? fileJson(person.photo, platformUrl) : null, photo_id: person.photo?.fileId ?? null };
}

export function pickupNoteJson(note: SchoolPickupNote) {
  return { date: note.date, name: note.name, relation: note.relation, phone: note.phone, note: note.note, written_by: note.writtenBy, created_at: note.createdAt.toISOString() };
}

/** `GET /parent/children/{id}/pickup`: who may pick the child up, today's note and the next days'. */
export function pickupJson(student: SchoolPerson, dir: Pick<SchoolDirectory, "classes">, assetUrl: (id: string) => string, pickup: SchoolPickup | null, notes: readonly SchoolPickupNote[], today: string, platformUrl: string) {
  const todays = notes.find((n) => n.date === today) ?? null;
  return {
    student: studentJson(student, dir, assetUrl),
    people: (pickup?.people ?? []).map((p) => pickupPersonJson(p, platformUrl)),
    updated_at: pickup?.updatedAt.toISOString() ?? null,
    today: todays ? pickupNoteJson(todays) : null,
    notes: notes.filter((n) => n.date >= today).map(pickupNoteJson),
  };
}

const phoneOk = (phone: string) => /^\+?[0-9 ()-]{5,30}$/.test(phone);

/** One person on the list, checked; the photo is looked up by its id (`photo_id`: a ready image of the school's). */
function readPickupPerson(raw: unknown): Read<{ name: string; relation: string | null; phone: string | null; photoId: string | null }> {
  const item = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const name = text(item.name);
  if (!name) return { ok: false, message: "Write their name." };
  if (name.length > PARENT_LIMITS.name) return { ok: false, message: `The name can be up to ${PARENT_LIMITS.name} characters.` };
  const relation = optional(item.relation);
  if (relation && relation.length > PARENT_LIMITS.relation) return { ok: false, message: `The relation can be up to ${PARENT_LIMITS.relation} characters.` };
  const phone = optional(item.phone);
  if (phone && !phoneOk(phone)) return { ok: false, message: "Write the phone number with its digits only." };
  const photoId = optional(item.photo_id);
  if (photoId && !/^[0-9a-f-]{36}$/.test(photoId)) return { ok: false, message: "This photo isn't ready. Send it again." };
  return { ok: true, value: { name, relation, phone, photoId } };
}

/** The whole list from the app (it replaces the one before), checked. */
export function readPickupPeople(body: Record<string, unknown>): Read<{ name: string; relation: string | null; phone: string | null; photoId: string | null }[]> {
  if (!Array.isArray(body.people)) return { ok: false, message: "Send the people who may pick the child up." };
  if (body.people.length > PARENT_LIMITS.people) return { ok: false, message: `Up to ${PARENT_LIMITS.people} people.` };
  const out: { name: string; relation: string | null; phone: string | null; photoId: string | null }[] = [];
  for (const [i, raw] of body.people.entries()) {
    const read = readPickupPerson(raw);
    if (!read.ok) return { ok: false, message: `Person ${i + 1}: ${read.message}` };
    out.push(read.value);
  }
  return { ok: true, value: out };
}

/** A one-day pick-up note from the app, checked. */
export function readPickupNote(body: Record<string, unknown>, today: string): Read<Pick<SchoolPickupNote, "date" | "name" | "relation" | "phone" | "note">> {
  const date = text(body.date) || today;
  if (!isDate(date) || date < today || date > addDays(today, PICKUP_DAYS_AHEAD)) return { ok: false, message: `Choose today or a day in the next ${PICKUP_DAYS_AHEAD} days.` };
  const name = text(body.name);
  if (!name) return { ok: false, message: "Write who picks the child up." };
  if (name.length > PARENT_LIMITS.name) return { ok: false, message: `The name can be up to ${PARENT_LIMITS.name} characters.` };
  const relation = optional(body.relation);
  if (relation && relation.length > PARENT_LIMITS.relation) return { ok: false, message: `The relation can be up to ${PARENT_LIMITS.relation} characters.` };
  const phone = optional(body.phone);
  if (phone && !phoneOk(phone)) return { ok: false, message: "Write the phone number with its digits only." };
  const note = optional(body.note);
  if (note && note.length > PARENT_LIMITS.note) return { ok: false, message: `The note can be up to ${PARENT_LIMITS.note} characters.` };
  return { ok: true, value: { date, name, relation, phone, note } };
}

/** The dashboard's pick-up form: a person added to a child's list by the school (a parent called). */
export function parsePickupPersonForm(form: Record<string, string>): Parsed<SchoolPickupPerson> {
  const read = readPickupPerson({ name: form.name, relation: form.relation, phone: form.phone });
  if (!read.ok) return { ok: false, errors: { name: read.message } };
  return { ok: true, value: { name: read.value.name, relation: read.value.relation, phone: read.value.phone, photo: null } };
}

/** The dashboard's one-day note (a parent called the office). */
export function parsePickupNoteForm(form: Record<string, string>, today: string): Parsed<Pick<SchoolPickupNote, "date" | "name" | "relation" | "phone" | "note">> {
  const read = readPickupNote({ date: form.date, name: form.name, relation: form.relation, phone: form.phone, note: form.note }, today);
  if (!read.ok) return { ok: false, errors: { name: read.message } };
  return { ok: true, value: read.value };
}

/** A photo on the pick-up list: a ready image of the school's Media library (from the app's uploads, never chat files). */
export async function pickupPhoto(store: DataStore, appId: string, id: string): Promise<SchoolFileRef | null> {
  const file = await store.getMediaFile(appId, id);
  if (!file || file.status !== "ready" || file.source === "chat" || file.kind !== "image") return null;
  return { fileId: file.id, name: file.name, kind: "image" };
}
