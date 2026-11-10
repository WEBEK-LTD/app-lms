import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { behaviourCategories, behaviourTotals, signedPoints, suggestedCategories, tellsParents } from "@/lib/school/behaviour";
import { dayOff, eventDays, eventFor, examFor, monthRange } from "@/lib/school/calendar";
import { parseCategoryForm, parseEventForm, parseExamForm } from "@/lib/school/calendar-forms";
import { publishExams, remindExams, takeAttendance, writeBehaviour } from "@/lib/school/flow";
import { runSchoolReminders } from "@/lib/school/reminders";
import { REVIEW_CLASS_NAME, schoolReviewNotes } from "@/lib/school/review";
import { schoolSettingsOf } from "@/lib/school/settings";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

describe("113.8 the calendar's, exams' and behaviour's forms and rules", () => {
  const classes = [
    { id: 1, grade: "Grade 5" },
    { id: 2, grade: null },
  ];

  it("checks an event, a holiday and an exam", () => {
    expect(parseEventForm({ kind: "event", title: "Science fair", startsOn: "2026-11-05", starts: "09:00", ends: "12:00", place: "Hall", for: "grade:Grade 5", notes: "" }, classes)).toEqual({
      ok: true,
      value: { kind: "event", title: "Science fair", notes: null, startsOn: "2026-11-05", endsOn: "2026-11-05", startMinute: 540, endMinute: 720, place: "Hall", audience: "grade", grade: "Grade 5", classId: null },
    });
    // A holiday is all day, whatever the times say.
    expect(parseEventForm({ kind: "holiday", title: "Mid-term break", startsOn: "2026-11-08", endsOn: "2026-11-12", starts: "09:00", for: "school" }, classes)).toMatchObject({
      ok: true,
      value: { startMinute: null, endMinute: null, endsOn: "2026-11-12", audience: "school" },
    });
    expect(parseEventForm({ kind: "party", title: "", startsOn: "2026-11-08", endsOn: "2026-11-01", for: "grade:Grade 9" }, classes)).toEqual({
      ok: false,
      errors: { kind: "Choose an event, a holiday or exam days.", title: "Give it a title.", endsOn: "It ends on or after the day it starts.", for: "Choose who it is for." },
    });
    expect(parseEventForm({ kind: "event", title: "Trip", startsOn: "2026-11-08", starts: "10:00", ends: "09:00", for: "class:2" }, classes)).toMatchObject({ ok: false, errors: { ends: "It ends after it starts." } });
    expect(parseExamForm({ for: "class:1", subjectId: "7", date: "2026-11-15", starts: "09:00", duration: "90", room: "B2", notes: "Units 1 to 3" }, classes, [7])).toEqual({
      ok: true,
      value: { classId: 1, grade: null, subjectId: 7, date: "2026-11-15", startMinute: 540, durationMinutes: 90, room: "B2", notes: "Units 1 to 3" },
    });
    expect(parseExamForm({ for: "school", subjectId: "8", date: "x", starts: "", duration: "2" }, classes, [7])).toEqual({
      ok: false,
      errors: { for: "Choose a class or a grade.", subjectId: "Choose a subject.", date: "Choose its date.", starts: "Enter the start, like 08:30.", duration: "The exam takes 5 to 480 minutes." },
    });
    expect(parseCategoryForm({ name: "Late to class", kind: "negative", points: "1" })).toEqual({ ok: true, value: { name: "Late to class", kind: "negative", points: -1, active: true } });
    expect(parseCategoryForm({ name: "", kind: "x", points: "500" })).toMatchObject({ ok: false, errors: { name: expect.any(String), kind: "Choose positive or negative.", points: "Points are 0 to 100." } });
  });

  it("knows whom an event and an exam are for, and the days off", async () => {
    const view = { classIds: new Set([1]), grades: new Set(["Grade 5"]), works: false };
    const base = { grade: null, classId: null };
    expect(eventFor({ ...base, audience: "school" }, view)).toBe(true);
    expect(eventFor({ ...base, audience: "staff" }, view)).toBe(false);
    expect(eventFor({ ...base, audience: "staff" }, { ...view, works: true })).toBe(true);
    expect(eventFor({ audience: "grade", grade: "Grade 5", classId: null }, view)).toBe(true);
    expect(eventFor({ audience: "class", grade: null, classId: 2 }, view)).toBe(false);
    expect(examFor({ classId: null, grade: "Grade 5" }, view)).toBe(true);
    expect(examFor({ classId: 2, grade: null }, view)).toBe(false);
    expect(eventDays({ startsOn: "2026-10-30", endsOn: "2026-11-02" })).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(signedPoints("negative", 3)).toBe(-3);
    expect(signedPoints("positive", -2)).toBe(2);
    expect(behaviourTotals([{ kind: "positive", points: 2 }, { kind: "negative", points: -1 }])).toEqual({ points: 1, positive: 1, negative: 1 });
    expect([tellsParents("all", "positive"), tellsParents("negative", "positive"), tellsParents("negative", "negative"), tellsParents("none", "negative")]).toEqual([true, false, true, false]);
    expect(suggestedCategories("ar").map((c) => c.kind)).toEqual(suggestedCategories("en").map((c) => c.kind));
  });
});

describe("113.8 the school's calendar, exams and behaviour on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let classA: number;
  let classB: number;
  let math: number;
  let omar: number;
  let laila: number;
  let parent: number;
  let mona: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "school");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile School",
      websiteDoneAt: NOW,
      connector: { kind: "school" },
      timeZone: "Africa/Cairo",
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" },
    };
    await store.createApp(app);
    const person = async (input: { role: "student" | "parent" | "teacher"; name: string; phone: string; classId?: number | null }) => {
      const made = await store.createSchoolPerson({ appId: app.id, role: input.role, name: input.name, phone: input.phone, email: null, classId: input.classId ?? null, code: null, photoAssetId: null, active: true }, NOW);
      if (!made.ok) throw new Error("duplicate");
      return made.person.id;
    };
    mona = await person({ role: "teacher", name: "Mona Adel", phone: "+201110000000" });
    classA = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: "Grade 5", homeroomTeacherId: mona }, NOW))!.id;
    classB = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 6 B", grade: "Grade 6", homeroomTeacherId: null }, NOW))!.id;
    const m = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Mathematics" }, NOW);
    if (!m.ok) throw new Error("subject");
    math = m.subject.id;
    omar = await person({ role: "student", name: "Omar Hassan", phone: "+201001000001", classId: classA });
    laila = await person({ role: "student", name: "Laila Hassan", phone: "+201001000002", classId: classB });
    parent = await person({ role: "parent", name: "Hassan Ali", phone: "+201001000009" });
    await store.setSchoolChildren(app.id, parent, [omar, laila]);
    sender = new LogSender();
    now = NOW;
  });

  const plan: PlanInfo = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
  const context = async (): Promise<HostedContext> => {
    const fresh = (await store.getAppById(app.id))!;
    return { store, app: fresh, active: true, plan, now, ip: "203.0.113.9", secret: "test-hosted-secret", sender, push: false, assetUrl: ASSETS, platformUrl: "https://yallapp.test", connector: null };
  };

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(await context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string, code?: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: code ?? sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  const titles = async (userId: number) => (await store.listHostedNotifications({ appId: app.id, userId, since: new Date(0), page: 1, perPage: 50 })).items.map((n) => [n.title, n.data?.type]);
  const event = (input: Partial<Parameters<MemoryStore["saveSchoolEvent"]>[0]>) =>
    store.saveSchoolEvent({ id: null, appId: app.id, kind: "event", title: "Event", notes: null, startsOn: "2026-10-20", endsOn: "2026-10-20", startMinute: null, endMinute: null, place: null, audience: "school", grade: null, classId: null, ...input }, NOW);

  it("each person sees the events for them; a parent each child's", async () => {
    await event({ title: "Open day", place: "The hall", startMinute: 540, endMinute: 720 });
    await event({ title: "Grade 5 trip", audience: "grade", grade: "Grade 5" });
    await event({ title: "6 B play", audience: "class", classId: classB });
    await event({ title: "Staff meeting", audience: "staff" });
    await event({ kind: "holiday", title: "Mid-term break", startsOn: "2026-10-25", endsOn: "2026-10-29" });
    await event({ title: "Next year", startsOn: "2027-09-01", endsOn: "2027-09-01" });
    const dad = await signUp("1001000009", "Hassan");
    const titlesOf = (body: unknown) => (body as { events: { title: string }[] }).events.map((e) => e.title);
    const forOmar = await call("GET", "/school/calendar", { token: dad.access_token, query: { student_id: String(omar) } });
    expect(forOmar.body).toMatchObject({ from: "2026-10-01", to: "2026-11-11" });
    // All-day ones first on a day.
    expect(titlesOf(forOmar.body)).toEqual(["Grade 5 trip", "Open day", "Mid-term break"]);
    expect((forOmar.body as { events: unknown[] }).events[1]).toEqual({
      id: expect.any(Number),
      kind: "event",
      title: "Open day",
      notes: null,
      starts_on: "2026-10-20",
      ends_on: "2026-10-20",
      all_day: false,
      starts: "09:00",
      ends: "12:00",
      place: "The hall",
      audience: "school",
      for_name: null,
    });
    expect(titlesOf((await call("GET", "/school/calendar", { token: dad.access_token, query: { student_id: String(laila) } })).body)).toEqual(["6 B play", "Open day", "Mid-term break"]);
    // Both children at once, never the staff's.
    expect(titlesOf((await call("GET", "/school/calendar", { token: dad.access_token })).body)).toEqual(["Grade 5 trip", "6 B play", "Open day", "Mid-term break"]);
    // A period of up to 120 days, and only their own children.
    expect(titlesOf((await call("GET", "/school/calendar", { token: dad.access_token, query: { from: "2027-08-01", to: "2027-09-30" } })).body)).toEqual(["Next year"]);
    expect((await call("GET", "/school/calendar", { token: dad.access_token, query: { from: "2026-10-01", to: "2027-09-30" } })).status).toBe(400);
    const stranger = await store.createSchoolPerson({ appId: app.id, role: "student", name: "Youssef", phone: "+201001000003", email: null, classId: classA, code: null, photoAssetId: null, active: true }, NOW);
    if (!stranger.ok) throw new Error("duplicate");
    expect((await call("GET", "/school/calendar", { token: dad.access_token, query: { student_id: String(stranger.person.id) } })).status).toBe(404);
    // The teacher: their class, its grade and the staff's.
    const teacher = await signUp("1110000000", "Mona");
    expect(titlesOf((await call("GET", "/school/calendar", { token: teacher.access_token })).body)).toEqual(["Grade 5 trip", "Staff meeting", "Open day", "Mid-term break"]);
  });

  it("a holiday tells nobody of an absence, and the register says so", async () => {
    await event({ kind: "holiday", title: "National holiday", startsOn: "2026-10-12", endsOn: "2026-10-12" });
    const dad = await signUp("1001000009", "Hassan");
    const teacher = await signUp("1110000000", "Mona");
    const sheet = (await call("GET", "/classroom/classes/{class_id}/attendance", { params: [String(classA)], token: teacher.access_token })).body;
    expect(sheet).toMatchObject({ date: "2026-10-12", day_off: { title: "National holiday" } });
    await call("PUT", "/classroom/classes/{class_id}/attendance", { params: [String(classA)], token: teacher.access_token, body: { date: "2026-10-12", items: [{ student_id: omar, status: "absent" }] } });
    expect(await titles(dad.user.id)).toEqual([]);
    // A holiday of another grade is a school day here.
    expect(await dayOff(store, app.id, "2026-10-12", { id: classB, grade: "Grade 6" })).toMatchObject({ title: "National holiday" });
    await store.deleteSchoolEvent(app.id, (await store.listSchoolEvents(app.id))[0]!.id);
    await event({ kind: "holiday", title: "Grade 6 day off", startsOn: "2026-10-12", endsOn: "2026-10-12", audience: "grade", grade: "Grade 6" });
    expect(await dayOff(store, app.id, "2026-10-12", { id: classA, grade: "Grade 5" })).toBeNull();
    await takeAttendance({ store, app, now: NOW }, { classId: classA, date: "2026-10-12", items: [{ student: (await store.getSchoolPerson(app.id, omar))!, status: "late", note: null }], takenBy: null });
    expect(await titles(dad.user.id)).toEqual([["Omar Hassan was late", "school_absence"]]);
  });

  it("exams: drafts until published, each family told once, then reminded the day before", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const student = await signUp("1001000001", "Omar");
    const exam = (input: { classId?: number | null; grade?: string | null; date: string }) =>
      store.saveSchoolExam({ id: null, appId: app.id, classId: input.classId ?? null, grade: input.grade ?? null, subjectId: math, date: input.date, startMinute: 540, durationMinutes: 90, room: "B2", notes: "Units 1 to 3" }, NOW);
    const forA = (await exam({ classId: classA, date: "2026-10-14" }))!;
    const forGrade6 = (await exam({ grade: "Grade 6", date: "2026-10-15" }))!;
    const past = (await exam({ classId: classA, date: "2026-10-01" }))!;
    const lists = async (id: number) => (await call("GET", "/school/students/{student_id}/exams", { params: [String(id)], token: dad.access_token })).body as { upcoming: { id: number }[]; past: { id: number }[] };
    expect(await lists(omar)).toEqual({ upcoming: [], past: [] });
    expect((await publishExams({ store, app, now: NOW }, [forA.id, forGrade6.id, past.id])).map((e) => e.id)).toEqual([past.id, forA.id, forGrade6.id]);
    // Published once only.
    expect(await publishExams({ store, app, now: NOW }, [forA.id])).toEqual([]);
    const omars = await lists(omar);
    expect(omars.upcoming.map((e) => e.id)).toEqual([forA.id]);
    expect(omars.past.map((e) => e.id)).toEqual([past.id]);
    expect((await call("GET", "/school/students/{student_id}/exams", { params: [String(omar)], token: student.access_token })).body).toMatchObject({
      upcoming: [{ subject: "Mathematics", class_name: "Grade 5 A", grade: "Grade 5", date: "2026-10-14", starts: "09:00", ends: "10:30", duration_minutes: 90, room: "B2", notes: "Units 1 to 3", published: true }],
    });
    expect((await lists(laila)).upcoming.map((e) => e.id)).toEqual([forGrade6.id]);
    // On the calendar too.
    expect(((await call("GET", "/school/calendar", { token: dad.access_token, query: { student_id: String(laila) } })).body as { exams: { id: number }[] }).exams.map((e) => e.id)).toEqual([forGrade6.id]);
    // Omar's two exams in one push; the parent hears of both children's.
    expect(await titles(student.user.id)).toEqual([["Exams' timetable for Omar Hassan", "school_exam"]]);
    expect((await titles(dad.user.id)).map(([t]) => t).sort()).toEqual(["Exams' timetable for Omar Hassan", "Mathematics exam for Laila Hassan"]);

    // The day before, from 17:00 in Cairo (14:00 UTC); once per exam.
    const before = new Date("2026-10-13T13:00:00Z");
    expect(await remindExams({ store, app, now: before })).toBe(0);
    const evening = new Date("2026-10-13T15:00:00Z");
    expect(await runSchoolReminders({ store, now: evening })).toEqual({ exams: 1, slips: 0 });
    expect(await remindExams({ store, app, now: evening })).toBe(0);
    expect((await titles(student.user.id))[0]).toEqual(["Mathematics exam tomorrow", "school_exam"]);
    // A new date: reminded again.
    const moved = (await store.saveSchoolExam({ id: forA.id, appId: app.id, classId: classA, grade: null, subjectId: math, date: "2026-10-16", startMinute: 540, durationMinutes: 90, room: "B2", notes: null }, NOW))!;
    expect(moved).toMatchObject({ published: true, remindedAt: null });
    // The teacher sees their class's exams.
    const teacher = await signUp("1110000000", "Mona");
    expect(((await call("GET", "/classroom/exams", { token: teacher.access_token })).body as { upcoming: { id: number }[] }).upcoming.map((e) => e.id)).toEqual([forA.id]);
    expect((await call("GET", "/classroom/exams", { token: teacher.access_token, query: { class_id: String(classB) } })).status).toBe(404);
  });

  it("behaviour: written by the teacher, the parent told as the school chooses, the record and the class's view", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const teacher = await signUp("1110000000", "Mona");
    // The suggested categories, in the app's language, once.
    const categories = ((await call("GET", "/classroom/behaviour/categories", { token: teacher.access_token })).body as { items: { id: number; name: string; kind: string; points: number }[] }).items;
    expect(categories.map((c) => [c.name, c.points])).toEqual(suggestedCategories("en").map((c) => [c.name, c.points]));
    const good = categories.find((c) => c.kind === "positive")!;
    const bad = categories.find((c) => c.kind === "negative")!;
    const written = await call("POST", "/classroom/behaviour", { token: teacher.access_token, body: { student_id: omar, category_id: good.id, note: "Helped a classmate." } });
    expect(written.status).toBe(201);
    expect(written.body).toMatchObject({ student_id: omar, student_name: "Omar Hassan", class_name: "Grade 5 A", kind: "positive", category: "Helping others", points: 2, note: "Helped a classmate.", teacher_name: "Mona Adel" });
    expect(await titles(dad.user.id)).toEqual([["Omar Hassan: Helping others", "school_behaviour"]]);
    // Laila's class isn't hers; a category the school doesn't have.
    expect((await call("POST", "/classroom/behaviour", { token: teacher.access_token, body: { student_id: laila, category_id: good.id } })).status).toBe(403);
    expect((await call("POST", "/classroom/behaviour", { token: teacher.access_token, body: { student_id: omar, category_id: 99999 } })).status).toBe(400);
    // Only negative notes now.
    await store.saveSchoolSettings(app.id, { ...schoolSettingsOf(await store.getSchoolSettings(app.id), app), behaviourAlerts: "negative" });
    await call("POST", "/classroom/behaviour", { token: teacher.access_token, body: { student_id: omar, category_id: good.id } });
    const late = (await call("POST", "/classroom/behaviour", { token: teacher.access_token, body: { student_id: omar, category_id: bad.id } })).body as { id: number };
    expect((await titles(dad.user.id)).map(([t]) => t)).toEqual(["A note about Omar Hassan", "Omar Hassan: Helping others"]);
    await store.saveSchoolSettings(app.id, { ...schoolSettingsOf(await store.getSchoolSettings(app.id), app), behaviourAlerts: "none" });
    await writeBehaviour({ store, app, now: NOW }, { student: (await store.getSchoolPerson(app.id, omar))!, category: (await behaviourCategories(store, app, NOW)).find((c) => c.kind === "negative")!, note: null, teacherId: null });
    expect(await titles(dad.user.id)).toHaveLength(2);

    const record = (await call("GET", "/school/students/{student_id}/behaviour", { params: [String(omar)], token: dad.access_token })).body;
    expect(record).toMatchObject({ points: 2, positive_count: 2, negative_count: 2, total: 4 });
    expect((record as { items: { teacher_name: string | null }[] }).items.filter((n) => n.teacher_name === null)).toHaveLength(1);
    const klass = (await call("GET", "/classroom/classes/{class_id}/behaviour", { params: [String(classA)], token: teacher.access_token })).body as { students: { student: { id: number }; points: number }[]; recent: unknown[] };
    expect(klass.students.map((s) => [s.student.id, s.points])).toEqual([[omar, 2]]);
    expect(klass.recent).toHaveLength(4);
    expect((await call("GET", "/classroom/classes/{class_id}/behaviour", { params: [String(classB)], token: teacher.access_token })).status).toBe(404);

    // Taken back: her own, on the day; never the school's.
    const schoolNote = (await store.listSchoolBehaviour(app.id, { studentId: omar })).find((n) => n.teacherId === null)!;
    expect((await call("DELETE", "/classroom/behaviour/{note_id}", { params: [String(schoolNote.id)], token: teacher.access_token })).status).toBe(404);
    const old = await store.createSchoolBehaviour({ appId: app.id, studentId: omar, classId: classA, categoryId: null, categoryName: "Late to class", kind: "negative", points: -1, note: null, teacherId: mona, createdAt: new Date(now.getTime() - 25 * 3_600_000) });
    expect((await call("DELETE", "/classroom/behaviour/{note_id}", { params: [String(old.id)], token: teacher.access_token })).status).toBe(409);
    expect((await call("DELETE", "/classroom/behaviour/{note_id}", { params: [String(late.id)], token: teacher.access_token })).status).toBe(204);
    expect(await store.getSchoolBehaviour(app.id, late.id)).toBeNull();
  });

  it("105.4.7b the store review account is a student, their parent, a teacher of a sample class and (113.3) staff", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: "+201009990000", reviewCode: "424242" } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    const reviewer = await signUp("1009990000", "Reviewer", "424242");
    expect(sender.sent.has("+201009990000")).toBe(false);
    expect(((await call("GET", "/me", { token: reviewer.access_token })).body as { roles: string[] }).roles).toEqual(["student", "parent", "teacher", "staff"]);
    // 113.3 On the staff list too: the Staff tab's endpoints answer.
    expect((await call("GET", "/staff/me", { token: reviewer.access_token })).status).toBe(200);
    const me = (await call("GET", "/school/me", { token: reviewer.access_token })).body as { students: { id: number; class_name: string }[] };
    expect(me.students.map((s) => s.class_name)).toEqual([REVIEW_CLASS_NAME]);
    const id = String(me.students[0]!.id);
    // Something on every screen.
    const week = (await call("GET", "/school/students/{student_id}/timetable", { params: [id], token: reviewer.access_token })).body as { days: unknown[] };
    expect(week.days).toHaveLength(7);
    expect(((await call("GET", "/school/students/{student_id}/homework", { params: [id], token: reviewer.access_token })).body as { total: number }).total).toBe(1);
    expect(((await call("GET", "/school/students/{student_id}/homework", { params: [id], token: reviewer.access_token, query: { status: "done" } })).body as { total: number }).total).toBe(1);
    expect(((await call("GET", "/school/students/{student_id}/grades", { params: [id], token: reviewer.access_token })).body as { subjects: unknown[]; upcoming: unknown[] }).subjects).toHaveLength(1);
    expect(((await call("GET", "/school/students/{student_id}/attendance", { params: [id], token: reviewer.access_token })).body as { days: unknown[] }).days).toHaveLength(5);
    expect(((await call("GET", "/school/students/{student_id}/fees", { params: [id], token: reviewer.access_token })).body as { items: { status: string }[] }).items).toEqual([expect.objectContaining({ status: "paid" })]);
    expect(((await call("GET", "/school/students/{student_id}/exams", { params: [id], token: reviewer.access_token })).body as { upcoming: unknown[] }).upcoming).toHaveLength(1);
    // 113.12 A sample payslip of last month, for nothing, in My payslips.
    const payslips = (await call("GET", "/staff/payslips", { token: reviewer.access_token })).body as { items: { month: string; net: { amount: string }; status: string }[] };
    expect(payslips.items).toEqual([expect.objectContaining({ net: expect.objectContaining({ amount: "0.00" }), status: "paid" })]);
    expect(((await call("GET", "/school/students/{student_id}/behaviour", { params: [id], token: reviewer.access_token })).body as { total: number }).total).toBe(2);
    const calendar = (await call("GET", "/school/calendar", { token: reviewer.access_token, query: { student_id: id } })).body as { events: { title: string }[]; exams: unknown[] };
    expect(calendar.events.map((e) => e.title)).toEqual(["Class trip (sample)", "Day off (sample)"]);
    expect(calendar.exams).toHaveLength(1);
    expect(((await call("GET", "/school/announcements", { token: reviewer.access_token })).body as { total: number }).total).toBe(1);
    // The teacher of the review class only.
    const classroom = (await call("GET", "/classroom/me", { token: reviewer.access_token })).body as { classes: { id: number; name: string; student_count: number }[] };
    expect(classroom.classes.map((c) => [c.name, c.student_count])).toEqual([[REVIEW_CLASS_NAME, 3]]);
    expect((await call("GET", "/classroom/classes/{class_id}/attendance", { params: [String(classA)], token: reviewer.access_token })).status).toBe(404);
    // Made once: signing in again adds nothing.
    const people = (await store.listSchoolPeople(app.id)).length;
    await call("GET", "/school/me", { token: reviewer.access_token });
    expect((await store.listSchoolPeople(app.id)).length).toBe(people);
    // The school's own teacher never sees the review class.
    const teacher = await signUp("1110000000", "Mona");
    expect(((await call("GET", "/classroom/me", { token: teacher.access_token })).body as { classes: { name: string }[] }).classes.map((c) => c.name)).toEqual(["Grade 5 A"]);
    // The notes say how to sign in and where each role is.
    const notes = schoolReviewNotes((await store.getAppById(app.id))!)!;
    expect(notes).toContain("Sign in with the phone number +201009990000 and the code 424242");
    expect(notes).toContain("As a student:");
    expect(notes).toContain("As a parent:");
    expect(notes).toContain("As a teacher:");
    expect(notes).toContain("As a member of staff:");
    expect(notes).toContain("Staff tab");
    // 116 A new school has its staff app: the teacher's and staff's parts are in it.
    expect(notes).toContain("in Nile School Staff, the school's separate staff app");
    const same = schoolReviewNotes({ ...(await store.getAppById(app.id))!, staffApp: "same" })!;
    expect(same).toContain("As a teacher: the Classroom tab shows the class");
    expect(same).not.toContain("staff app");
    expect(schoolReviewNotes({ ...app, hostedSettings: { ...app.hostedSettings!, reviewCode: null } })).toBeNull();
  });
});
