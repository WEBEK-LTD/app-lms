import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { itemResolver } from "@/lib/hosted/pages/items";
import "@/lib/hosted/pages/sources";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import { feeReceipt } from "@/lib/school/fees";
import { parseAssessmentForm, parseFeeForm, parsePeopleCsv, parsePeriodForm, parsePersonForm, parseSchoolSettings, parseScore } from "@/lib/school/forms";
import { percentOf } from "@/lib/school/service";
import { feesByCardReady, schoolSettingsOf } from "@/lib/school/settings";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

describe("105.4 school forms and helpers", () => {
  it("checks people, lessons, assessments, fees and settings", () => {
    expect(parsePersonForm({ role: "student", name: "Omar", phone: "01001234567", classId: "3", code: "1023" }, "+20", [3])).toEqual({
      ok: true,
      value: { role: "student", name: "Omar", phone: "+201001234567", email: null, classId: 3, code: "1023", active: true },
    });
    expect(parsePersonForm({ role: "parent", name: "Hassan" }, "+20", [])).toMatchObject({ ok: false, errors: { phone: "Enter the mobile number they sign in with (or an email)." } });
    expect(parsePersonForm({ role: "student", name: "Omar", phone: "0100", classId: "9" }, "+20", [3])).toMatchObject({ ok: false, errors: { phone: "Enter a valid mobile number.", classId: "Choose one of your classes." } });
    expect(parsePeriodForm({ weekday: "1", start: "09:00", end: "08:45", subjectId: "1" }, [1], [])).toMatchObject({ ok: false, errors: { end: "The lesson ends after it starts." } });
    expect(parsePeriodForm({ weekday: "3", start: "08:00", end: "08:45", subjectId: "1", teacherId: "", room: "B2" }, [1], [])).toEqual({
      ok: true,
      value: { weekday: 3, startMinute: 480, endMinute: 525, subjectId: 1, teacherId: null, room: "B2" },
    });
    expect(parseAssessmentForm({ classId: "1", subjectId: "2", kind: "exam", title: "Midterm", date: "2026-11-02", maxScore: "0" }, [1], [2])).toMatchObject({ ok: false, errors: { maxScore: expect.any(String) } });
    expect(parseFeeForm({ title: "Bus", amount: "1500.50", to: "class:1" }, [5], [1])).toEqual({ ok: true, value: { title: "Bus", amountCents: 150050, dueOn: null, studentId: null, classId: 1 } });
    expect(parseFeeForm({ title: "Bus", amount: "0", to: "student:9" }, [5], [1])).toMatchObject({ ok: false, errors: { amount: expect.any(String), to: "Choose a student or a class." } });
    expect(parseSchoolSettings({ timezone: "Africa/Cairo", currency: "EGP", termName: "First term", termStarts: "2026-10-01", termEnds: "2026-09-01" })).toMatchObject({ ok: false, errors: { termEnds: "The term ends after it starts." } });
    expect(parseScore("8,5", 10)).toBe(8.5);
    expect(parseScore("", 10)).toBeNull();
    expect(parseScore("11", 10)).toBe("invalid");
    expect(percentOf([{ score: 8, maxScore: 10 }, { score: 15, maxScore: 20 }])).toBe(76.7);
    expect(percentOf([])).toBeNull();
  });

  it("reads people from a CSV file, line by line", () => {
    const parsed = parsePeopleCsv("role,name,phone,email,class,code,children\nstudent,Omar Hassan,01001234567,,Grade 5 A,1023,\nparent,Hassan Ali,01007654321,,,,1023|1024\nnurse,Mona,0111,,,,\nteacher,Mona Adel,,mona@example.com,,,", "+20");
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.rows.map((r) => [r.line, r.person.role, r.person.name, r.person.phone, r.className, r.children])).toEqual([
      [2, "student", "Omar Hassan", "+201001234567", "Grade 5 A", []],
      [3, "parent", "Hassan Ali", "+201007654321", null, ["1023", "1024"]],
      [5, "teacher", "Mona Adel", null, null, []],
    ]);
    expect(parsed.problems).toEqual(["Line 4: the role is student, parent or teacher."]);
    expect(parsePeopleCsv("name,phone\nOmar,0100", "+20")).toEqual({ ok: false, message: "The file needs the columns role, name, and phone or email." });
  });
});

describe("105.4 schools on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan = PLAN_INFO.pro;
  let classA: number;
  let classB: number;
  let math: number;
  let arabic: number;
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
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP", payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    const person = async (input: { role: "student" | "parent" | "teacher"; name: string; phone: string; classId?: number | null; code?: string }) => {
      const made = await store.createSchoolPerson({ appId: app.id, role: input.role, name: input.name, phone: input.phone, email: null, classId: input.classId ?? null, code: input.code ?? null, photoAssetId: null, active: true }, NOW);
      if (!made.ok) throw new Error("duplicate");
      return made.person.id;
    };
    mona = await person({ role: "teacher", name: "Mona Adel", phone: "+201110000000" });
    const a = await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: "Grade 5", homeroomTeacherId: null }, NOW);
    const b = await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 B", grade: "Grade 5", homeroomTeacherId: null }, NOW);
    classA = a!.id;
    classB = b!.id;
    const m = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Mathematics" }, NOW);
    const r = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Arabic" }, NOW);
    if (!m.ok || !r.ok) throw new Error("subject");
    math = m.subject.id;
    arabic = r.subject.id;
    omar = await person({ role: "student", name: "Omar Hassan", phone: "+201001000001", classId: classA, code: "1023" });
    laila = await person({ role: "student", name: "Laila Hassan", phone: "+201001000002", classId: classB, code: "1024" });
    parent = await person({ role: "parent", name: "Hassan Ali", phone: "+201001000009" });
    await store.setSchoolChildren(app.id, parent, [omar, laila]);
    // Mona teaches mathematics to 5 A on Mondays and Wednesdays.
    await store.saveSchoolPeriod({ id: null, appId: app.id, classId: classA, subjectId: math, teacherId: mona, weekday: 1, startMinute: 480, endMinute: 525, room: "B2" });
    await store.saveSchoolPeriod({ id: null, appId: app.id, classId: classA, subjectId: math, teacherId: mona, weekday: 3, startMinute: 540, endMinute: 585, room: null });
    await store.saveSchoolPeriod({ id: null, appId: app.id, classId: classB, subjectId: arabic, teacherId: null, weekday: 1, startMinute: 480, endMinute: 525, room: null });
    await store.saveSchoolSettings(app.id, { ...schoolSettingsOf(null, app), term: { name: "First term", startsOn: "2026-09-27", endsOn: "2027-01-20" } });
    sender = new LogSender();
    now = NOW;
    plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
  });

  const context = async (): Promise<HostedContext> => {
    const fresh = (await store.getAppById(app.id))!;
    return { store, app: fresh, active: true, plan, now, ip: "203.0.113.9", secret: "test-hosted-secret", sender, push: false, assetUrl: ASSETS, platformUrl: "https://yallapp.test", connector: null };
  };

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(await context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number; roles?: string[] } };
  }

  it("sends Config.school and each person's roles, only with the plan feature", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(config).toMatchObject({ school: { timezone: "Africa/Cairo", currency: "EGP", term: { name: "First term", starts_on: "2026-09-27", ends_on: "2027-01-20" }, absence_alerts: true, fees_by_card: false } });
    const teacher = await signUp("1110000000", "Mona");
    expect((await call("GET", "/me", { token: teacher.access_token })).body).toMatchObject({ roles: ["teacher"] });
    const dad = await signUp("1001000009", "Hassan");
    expect((await call("GET", "/me", { token: dad.access_token })).body).toMatchObject({ roles: ["parent"] });
    const stranger = await signUp("1009999999", "Someone");
    expect((await call("GET", "/me", { token: stranger.access_token })).body).toMatchObject({ roles: [] });
    expect((await call("GET", "/school/me", { token: stranger.access_token })).body).toMatchObject({ code: "not_school_member" });
    expect((await call("GET", "/classroom/me", { token: dad.access_token })).body).toMatchObject({ code: "not_teacher" });
    expect((await call("GET", "/school/me")).status).toBe(401);
    plan = PLAN_INFO.pro;
    const without = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(without).not.toHaveProperty("school");
    expect((await call("GET", "/school/me", { token: dad.access_token })).body).toMatchObject({ code: "feature_disabled" });
  });

  it("a parent follows each child: the timetable and attendance the teacher takes", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const me = (await call("GET", "/school/me", { token: dad.access_token })).body as { roles: string[]; students: { id: number; name: string; class_name: string }[] };
    expect(me).toMatchObject({ name: "Hassan Ali", roles: ["parent"] });
    expect(me.students.map((s) => [s.name, s.class_name])).toEqual([
      ["Omar Hassan", "Grade 5 A"],
      ["Laila Hassan", "Grade 5 B"],
    ]);
    const week = (await call("GET", "/school/students/{student_id}/timetable", { params: [String(omar)], token: dad.access_token })).body;
    expect(week).toEqual({
      days: [
        { weekday: 1, lessons: [{ id: expect.any(Number), starts: "08:00", ends: "08:45", subject: "Mathematics", class_id: classA, class_name: "Grade 5 A", teacher_name: "Mona Adel", room: "B2" }] },
        { weekday: 3, lessons: [expect.objectContaining({ starts: "09:00", subject: "Mathematics" })] },
      ],
    });
    // Another family's child isn't theirs.
    const other = await store.createSchoolPerson({ appId: app.id, role: "student", name: "Youssef", phone: "+201001000003", email: null, classId: classA, code: null, photoAssetId: null, active: true }, NOW);
    if (!other.ok) throw new Error("duplicate");
    expect((await call("GET", "/school/students/{student_id}/timetable", { params: [String(other.person.id)], token: dad.access_token })).status).toBe(404);

    // Mona takes 5 A's attendance today; she doesn't teach 5 B.
    const teacher = await signUp("1110000000", "Mona");
    const classroom = (await call("GET", "/classroom/me", { token: teacher.access_token })).body as { classes: { id: number; student_count: number; subjects: { name: string }[] }[]; today: { subject: string }[] };
    expect(classroom.classes.map((c) => [c.id, c.student_count, c.subjects.map((s) => s.name)])).toEqual([[classA, 2, ["Mathematics"]]]);
    expect(classroom.today.map((l) => l.subject)).toEqual(["Mathematics"]);
    expect((await call("GET", "/classroom/classes/{class_id}/attendance", { params: [String(classB)], token: teacher.access_token })).status).toBe(404);
    const sheet = (await call("GET", "/classroom/classes/{class_id}/attendance", { params: [String(classA)], token: teacher.access_token })).body as { date: string; students: { status: string | null }[] };
    expect(sheet.date).toBe("2026-10-12");
    expect(sheet.students.map((s) => s.status)).toEqual([null, null]);
    const taken = await call("PUT", "/classroom/classes/{class_id}/attendance", {
      params: [String(classA)],
      token: teacher.access_token,
      body: { date: "2026-10-12", items: [{ student_id: omar, status: "absent", note: "Sick" }, { student_id: other.person.id, status: "present" }] },
    });
    expect(taken.body).toMatchObject({ students: [{ student: { id: omar }, status: "absent", note: "Sick" }, { status: "present" }] });
    expect((await call("PUT", "/classroom/classes/{class_id}/attendance", { params: [String(classA)], token: teacher.access_token, body: { date: "2026-10-13", items: [] } })).body).toMatchObject({
      code: "date_out_of_range",
    });
    expect((await call("PUT", "/classroom/classes/{class_id}/attendance", { params: [String(classA)], token: teacher.access_token, body: { date: "2026-10-12", items: [{ student_id: laila, status: "absent" }] } })).status).toBe(400);
    // The family sees it, and was told in the app.
    const days = (await call("GET", "/school/students/{student_id}/attendance", { params: [String(omar)], token: dad.access_token })).body;
    expect(days).toEqual({ from: "2026-09-27", to: "2026-10-12", counts: { present: 0, absent: 1, late: 0, excused: 0 }, days: [{ date: "2026-10-12", status: "absent", note: "Sick" }] });
    const inbox = (await call("GET", "/me/notifications", { token: dad.access_token })).body as { items: { title: string }[] };
    expect(inbox.items[0]).toMatchObject({ title: "Omar Hassan was absent", type: "school_absence", student_id: omar });
  });

  it("homework: given by the teacher, handed in by the student, marked, with each one told", async () => {
    const teacher = await signUp("1110000000", "Mona");
    const student = await signUp("1001000001", "Omar");
    const dad = await signUp("1001000009", "Hassan");
    expect(
      (await call("POST", "/classroom/homework", { token: teacher.access_token, body: { class_id: classA, subject_id: arabic, title: "Read", due_on: "2026-10-14" } })).body,
    ).toMatchObject({ code: "not_your_class" });
    const given = await call("POST", "/classroom/homework", {
      token: teacher.access_token,
      body: { class_id: classA, subject_id: math, title: "Fractions, page 12", text: "Questions 1 to 5.", due_on: "2026-10-14" },
    });
    expect(given.status).toBe(201);
    const homework = given.body as { id: number };
    expect(given.body).toMatchObject({ class_name: "Grade 5 A", subject: "Mathematics", students: 1, handed_in: 0, marked: 0 });
    const due = (await call("GET", "/school/students/{student_id}/homework", { params: [String(omar)], token: student.access_token })).body as { items: { id: number; teacher_name: string; submission: unknown }[] };
    expect(due.items).toEqual([expect.objectContaining({ id: homework.id, title: "Fractions, page 12", due_on: "2026-10-14", teacher_name: "Mona Adel", submission: null })]);
    // The parent sees it but doesn't hand it in.
    expect((await call("PUT", "/school/students/{student_id}/homework/{homework_id}/submission", { params: [String(omar), String(homework.id)], token: dad.access_token, body: { text: "Done" } })).body).toMatchObject({
      code: "not_student",
    });
    expect((await call("PUT", "/school/students/{student_id}/homework/{homework_id}/submission", { params: [String(omar), String(homework.id)], token: student.access_token, body: {} })).status).toBe(400);
    const handed = await call("PUT", "/school/students/{student_id}/homework/{homework_id}/submission", { params: [String(omar), String(homework.id)], token: student.access_token, body: { text: "1) 3/4 2) 1/2" } });
    expect(handed.body).toMatchObject({ submission: { text: "1) 3/4 2) 1/2", late: false, mark: null } });
    expect(((await call("GET", "/school/students/{student_id}/homework", { params: [String(omar)], token: student.access_token })).body as { items: unknown[] }).items).toEqual([]);
    expect(((await call("GET", "/school/students/{student_id}/homework", { params: [String(omar)], token: student.access_token, query: { status: "done" } })).body as { items: unknown[] }).items).toHaveLength(1);
    // Marked by the teacher; the student can't change it after.
    const marked = await call("PUT", "/classroom/homework/{homework_id}/submissions/{student_id}", { params: [String(homework.id), String(omar)], token: teacher.access_token, body: { mark: "9/10", feedback: "Good work." } });
    expect(marked.body).toMatchObject({ handed_in: 1, marked: 1, submissions: [{ student: { id: omar }, submission: { mark: "9/10", feedback: "Good work." } }] });
    expect((await call("PUT", "/school/students/{student_id}/homework/{homework_id}/submission", { params: [String(omar), String(homework.id)], token: student.access_token, body: { text: "again" } })).body).toMatchObject({
      code: "already_marked",
    });
    const told = (await call("GET", "/me/notifications", { token: dad.access_token })).body as { items: { type: string; homework_id?: number }[] };
    expect(told.items.map((n) => [n.type, n.homework_id])).toEqual([
      ["school_grade", undefined],
      ["school_homework", homework.id],
    ]);
  });

  it("grades: an exam's scores and each subject's percentage", async () => {
    const teacher = await signUp("1110000000", "Mona");
    const student = await signUp("1001000001", "Omar");
    const made = await call("POST", "/classroom/assessments", { token: teacher.access_token, body: { class_id: classA, subject_id: math, kind: "quiz", title: "Quiz 1", date: "2026-10-12", max_score: 10 } });
    expect(made.status).toBe(201);
    const quiz = made.body as { id: number };
    await call("POST", "/classroom/assessments", { token: teacher.access_token, body: { class_id: classA, subject_id: math, kind: "exam", title: "Midterm", date: "2026-11-10", max_score: 50 } });
    expect((await call("PUT", "/classroom/assessments/{assessment_id}/scores", { params: [String(quiz.id)], token: teacher.access_token, body: { items: [{ student_id: omar, score: 11 }] } })).status).toBe(400);
    const scored = await call("PUT", "/classroom/assessments/{assessment_id}/scores", { params: [String(quiz.id)], token: teacher.access_token, body: { items: [{ student_id: omar, score: 8.5 }] } });
    expect(scored.body).toMatchObject({ assessment: { scored: 1 }, students: [{ student: { id: omar }, score: 8.5 }] });
    const grades = (await call("GET", "/school/students/{student_id}/grades", { params: [String(omar)], token: student.access_token })).body;
    expect(grades).toMatchObject({
      subjects: [{ subject: "Mathematics", percent: 85, scores: [{ title: "Quiz 1", kind: "quiz", score: 8.5, max_score: 10 }] }],
      upcoming: [{ title: "Quiz 1" }, { title: "Midterm", date: "2026-11-10" }],
    });
  });

  it("fees: due in the app, paid by card into the school's account, with a receipt", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const fee = await store.createSchoolFee({ appId: app.id, studentId: omar, title: "First term tuition", amountCents: 450000, dueOn: "2026-10-31", status: "due", paidAt: null, paidBy: null, orderId: null, receiptCode: null, createdAt: NOW, updatedAt: NOW });
    const list = (await call("GET", "/school/students/{student_id}/fees", { params: [String(omar)], token: dad.access_token })).body;
    expect(list).toMatchObject({ currency: "EGP", due_formatted: "E£4,500.00", can_pay: false, items: [{ id: fee.id, title: "First term tuition", amount: "4500.00", status: "due", receipt_url: null }] });
    expect((await call("POST", "/school/students/{student_id}/fees/{fee_id}/pay", { params: [String(omar), String(fee.id)], token: dad.access_token })).body).toMatchObject({ code: "payments_unavailable" });
    // The school takes fees by card.
    await store.saveSchoolSettings(app.id, { ...schoolSettingsOf(await store.getSchoolSettings(app.id), app), feesByCard: true });
    plan = { ...plan, features: [...plan.features, "card_payments"] };
    expect(feesByCardReady((await store.getAppById(app.id))!, plan, schoolSettingsOf(await store.getSchoolSettings(app.id), app))).toBe(true);
    const pay = await call("POST", "/school/students/{student_id}/fees/{fee_id}/pay", { params: [String(omar), String(fee.id)], token: dad.access_token });
    expect(pay.body).toMatchObject({ payment_url: expect.stringMatching(/^https:\/\/yallapp\.test\/pay\//) });
    const orderId = (await store.getSchoolFee(app.id, fee.id))!.orderId!;
    const order = (await store.getCatalogOrder(app.id, orderId))!;
    expect(order).toMatchObject({ totalCents: 450000, currency: "EGP", lines: [{ productId: fee.id, name: "First term tuition: Omar Hassan" }] });
    await deliverPaidOrder(store, (await store.getAppById(app.id))!, { ...order, status: "processing", paidAt: now }, now);
    const paid = (await call("GET", "/school/students/{student_id}/fees", { params: [String(omar)], token: dad.access_token })).body as { due_formatted: string; items: { status: string; paid_by: string; receipt_url: string }[] };
    expect(paid.due_formatted).toBe("E£0.00");
    expect(paid.items[0]).toMatchObject({ status: "paid", paid_by: "card" });
    const code = paid.items[0]!.receipt_url.split("/fee-receipts/")[1]!;
    expect((await feeReceipt(store, code))!.rows).toEqual([
      ["Reference", `F-${String(fee.id).padStart(6, "0")}`],
      ["Date", now.toISOString().slice(0, 10)],
      ["For", "First term tuition"],
      ["Student", "Omar Hassan"],
      ["Amount", "E£4,500.00"],
      ["Paid", "By card"],
      ["Paid to", "Nile School"],
    ]);
    expect(await feeReceipt(store, "not-a-real-receipt-code")).toBeNull();
    expect((await call("POST", "/school/students/{student_id}/fees/{fee_id}/pay", { params: [String(omar), String(fee.id)], token: dad.access_token })).body).toMatchObject({ code: "already_paid" });
  });

  it("news: to the whole school, a class or one family; the school's on the home page", async () => {
    const teacher = await signUp("1110000000", "Mona");
    const student = await signUp("1001000002", "Laila");
    await store.createSchoolAnnouncement({ appId: app.id, audience: "school", classId: null, studentId: null, title: "Sports day", body: "Thursday, in sports clothes.", teacherId: null, createdAt: NOW });
    now = new Date(now.getTime() + 60_000);
    expect((await call("POST", "/classroom/announcements", { token: teacher.access_token, body: { class_id: classB, title: "x", body: "y" } })).body).toMatchObject({ code: "not_your_class" });
    const posted = await call("POST", "/classroom/announcements", { token: teacher.access_token, body: { class_id: classA, title: "Bring a ruler", body: "For tomorrow's lesson." } });
    expect(posted.body).toMatchObject({ audience: "class", class_name: "Grade 5 A", author: "Mona Adel" });
    // Laila is in 5 B: only the school's news.
    const hers = (await call("GET", "/school/announcements", { token: student.access_token })).body as { items: { title: string; author: string }[] };
    expect(hers.items.map((a) => [a.title, a.author])).toEqual([["Sports day", "Nile School"]]);
    const items = await itemResolver("school_news")!({ appId: app.id, userId: null, lang: "en", store }, { ids: [], limit: 10, sort: "newest", filters: {} } as never);
    expect(items.map((i) => [i.title, i.action])).toEqual([["Sports day", { type: "screen", screen: "school" }]]);
  });
});
