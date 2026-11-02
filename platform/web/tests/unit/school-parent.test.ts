import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type SchoolCheckin } from "@/lib/data/types";
import "@/lib/hosted/pages/sources";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import { checkinBoard, dayState, DEFAULT_STUDENT_TIMES, monthReport } from "@/lib/school/checkin";
import { takeAttendance } from "@/lib/school/flow";
import {
  answerExcuse,
  parsePickupNoteForm,
  parsePickupPersonForm,
  parseSlipForm,
  readExcuseInput,
  readPickupNote,
  readPickupPeople,
  readSlipAnswer,
  remindSlips,
  sendSlip,
  slipCounts,
} from "@/lib/school/parent";
import { runSchoolReminders } from "@/lib/school/reminders";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

describe("113.4 the parent's area: its forms and rules", () => {
  const classes = [
    { id: 1, grade: "Grade 5" },
    { id: 2, grade: "Grade 3" },
  ];

  it("checks a permission slip from the dashboard", () => {
    expect(parseSlipForm({ title: "Museum trip", details: "Bring lunch.", dueOn: "2026-11-05", feeNote: "E£150 at the office", audience: "grade:Grade 5" }, classes, "2026-11-02", null)).toEqual({
      ok: true,
      value: { title: "Museum trip", details: "Bring lunch.", dueOn: "2026-11-05", feeNote: "E£150 at the office", audience: "grade", grade: "Grade 5", classId: null },
    });
    expect(parseSlipForm({ title: "", dueOn: "2026-11-01", audience: "class:9" }, classes, "2026-11-02", null)).toEqual({
      ok: false,
      errors: { title: "Give the slip a title.", dueOn: "The due date is today or later.", audience: "Choose whom the slip is for." },
    });
    // A slip already sent keeps a due date that passed.
    expect(parseSlipForm({ title: "Trip", dueOn: "2026-11-01", audience: "school" }, classes, "2026-11-02", { dueOn: "2026-11-01" })).toMatchObject({ ok: true, value: { audience: "school", grade: null, classId: null } });
  });

  it("checks a parent's answer, an excuse and the pick-up", () => {
    expect(readSlipAnswer({ student_id: 4, answer: "yes", signed_name: " Hassan Ali " })).toEqual({ ok: true, value: { studentId: 4, answer: "yes", signedName: "Hassan Ali" } });
    expect(readSlipAnswer({ student_id: 4, answer: "maybe", signed_name: "Hassan" })).toEqual({ ok: false, message: "Answer yes or no." });
    expect(readSlipAnswer({ student_id: 4, answer: "no", signed_name: "" })).toEqual({ ok: false, message: "Sign with your name." });
    expect(readExcuseInput({ starts_on: "2026-11-01", reason: "A fever" }, "2026-11-02")).toEqual({ ok: true, value: { startsOn: "2026-11-01", endsOn: "2026-11-01", reason: "A fever" } });
    expect(readExcuseInput({ starts_on: "2026-11-03", ends_on: "2026-11-01", reason: "x" }, "2026-11-02")).toMatchObject({ ok: false });
    expect(readExcuseInput({ starts_on: "2026-09-01", reason: "x" }, "2026-11-02")).toEqual({ ok: false, message: "An absence can be excused up to 30 days back." });
    expect(readExcuseInput({ starts_on: "2026-11-02", reason: " " }, "2026-11-02")).toEqual({ ok: false, message: "Write the reason for the absence." });
    expect(readPickupPeople({ people: [{ name: "Mona", relation: "Aunt", phone: "+20 100 123 4567" }] })).toEqual({ ok: true, value: [{ name: "Mona", relation: "Aunt", phone: "+20 100 123 4567", photoId: null }] });
    expect(readPickupPeople({ people: [{ name: "Mona" }, { name: "" }] })).toEqual({ ok: false, message: "Person 2: Write their name." });
    expect(readPickupPeople({ people: Array.from({ length: 11 }, () => ({ name: "A" })) })).toEqual({ ok: false, message: "Up to 10 people." });
    expect(readPickupNote({ name: "Uncle Karim" }, "2026-11-02")).toEqual({ ok: true, value: { date: "2026-11-02", name: "Uncle Karim", relation: null, phone: null, note: null } });
    expect(readPickupNote({ name: "Karim", date: "2026-11-01" }, "2026-11-02")).toEqual({ ok: false, message: "Choose today or a day in the next 30 days." });
    expect(parsePickupPersonForm({ name: "Mona", relation: "", phone: "abc" })).toEqual({ ok: false, errors: { name: "Write the phone number with its digits only." } });
    expect(parsePickupNoteForm({ name: "Karim", date: "2026-11-03", relation: "Uncle", phone: "", note: "" }, "2026-11-02")).toEqual({ ok: true, value: { date: "2026-11-03", name: "Karim", relation: "Uncle", phone: null, note: null } });
  });

  it("counts a slip's answers and makes an excused day excused unless the child came in", () => {
    const answer = (studentId: number, a: "yes" | "no") => ({ appId: "a", slipId: 1, studentId, answer: a, signedName: "P", parentId: null, answeredAt: NOW });
    expect(slipCounts([{ id: 1 }, { id: 2 }, { id: 3 }], [answer(1, "yes"), answer(2, "no"), answer(9, "yes")])).toEqual({ yes: 1, no: 1, waiting: 1 });
    const base = { row: null, date: "2026-11-02", today: "2026-11-02", nowMinute: 15 * 60, times: DEFAULT_STUDENT_TIMES, workDay: true, onLeave: false, since: null };
    expect(dayState(base)).toBe("absent");
    expect(dayState({ ...base, excused: true })).toBe("excused");
    const came: SchoolCheckin = { appId: "a", personId: 1, role: "student", date: "2026-11-02", inAt: NOW, inMethod: "qr", outAt: null, outMethod: null, late: false, leftEarly: false, mark: null, corrections: [], updatedAt: NOW };
    expect(dayState({ ...base, row: came, excused: true })).toBe("in");
  });
});

describe("113.4 the parent's area on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan = PLAN_INFO.pro;
  let classA: number;
  let classB: number;
  let omar: number;
  let laila: number;
  let other: number;
  let parent: number;

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
    const person = async (input: { role: "student" | "parent" | "teacher" | "staff"; name: string; phone: string; classId?: number | null }) => {
      const made = await store.createSchoolPerson({ appId: app.id, role: input.role, name: input.name, phone: input.phone, email: null, classId: input.classId ?? null, code: null, photoAssetId: null, active: true }, NOW);
      if (!made.ok) throw new Error("duplicate");
      return made.person.id;
    };
    classA = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: "Grade 5", homeroomTeacherId: null }, NOW))!.id;
    classB = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 3 B", grade: "Grade 3", homeroomTeacherId: null }, NOW))!.id;
    omar = await person({ role: "student", name: "Omar Hassan", phone: "+201001000001", classId: classA });
    laila = await person({ role: "student", name: "Laila Hassan", phone: "+201001000002", classId: classB });
    other = await person({ role: "student", name: "Youssef Adel", phone: "+201001000003", classId: classA });
    parent = await person({ role: "parent", name: "Hassan Ali", phone: "+201001000009" });
    await store.setSchoolChildren(app.id, parent, [omar, laila]);
    // A teacher who is also a parent (of Youssef), and a member of staff with no child here.
    const teacher = await person({ role: "teacher", name: "Sara Adel", phone: "+201110000001" });
    const teacherAsParent = await person({ role: "parent", name: "Sara Adel", phone: "+201110000001" });
    await store.setSchoolChildren(app.id, teacherAsParent, [other]);
    void teacher;
    await person({ role: "staff", name: "Nurse Mona", phone: "+201110000002" });
    sender = new LogSender();
    // Monday 2 November, 07:00 in Cairo.
    now = new Date("2026-11-02T05:00:00Z");
    plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
  });

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

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    if ((verified.body as { access_token?: string }).access_token) return (verified.body as { access_token: string }).access_token;
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return (registered.body as { access_token: string }).access_token;
  }

  const inbox = async (token: string) => ((await call("GET", "/me/notifications", { token })).body as { items: { title: string; body: string; type: string; slip_id?: number; student_id?: number }[] }).items;
  const deps = async () => ({ store, app: (await store.getAppById(app.id))!, now, account: null });

  it("is the parents' only: a student, a teacher or staff without children is refused, a teacher who is a parent isn't", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const student = await signUp("1001000001", "Omar");
    const sara = await signUp("1110000001", "Sara");
    const nurse = await signUp("1110000002", "Mona");
    const stranger = await signUp("1009999999", "Nobody");
    expect((await call("GET", "/me", { token: dad })).body).toMatchObject({ roles: ["parent"] });
    expect((await call("GET", "/school/me", { token: sara })).body).toMatchObject({ roles: ["parent", "teacher"] });
    for (const token of [student, nurse]) {
      const refused = await call("GET", "/parent/me", { token });
      expect(refused.status).toBe(403);
      expect(refused.body).toMatchObject({ code: "not_parent" });
      expect((await call("GET", "/parent/children/{student_id}/day", { params: [String(omar)], token })).status).toBe(403);
      expect((await call("PUT", "/parent/children/{student_id}/pickup", { params: [String(omar)], token, body: { people: [] } })).status).toBe(403);
    }
    expect((await call("GET", "/parent/me", { token: stranger })).body).toMatchObject({ code: "not_school_member" });
    expect((await call("GET", "/parent/me", { token: null as unknown as string })).status).toBe(401);
    // The teacher's own child only.
    const mine = (await call("GET", "/parent/me", { token: sara })).body as { children: { id: number }[] };
    expect(mine.children.map((c) => c.id)).toEqual([other]);
    expect((await call("GET", "/parent/children/{student_id}/day", { params: [String(omar)], token: sara })).status).toBe(404);
    // The parent's two, never someone else's.
    const me = (await call("GET", "/parent/me", { token: dad })).body as { name: string; children: { id: number; name: string }[]; messages: boolean };
    expect(me).toMatchObject({ name: "Hassan Ali", messages: false });
    expect(me.children.map((c) => c.name)).toEqual(["Omar Hassan", "Laila Hassan"]);
    expect((await call("GET", "/parent/children/{student_id}/pickup", { params: [String(other)], token: dad })).status).toBe(404);
  });

  it("a slip for a class: the parent is told, signs for the child it is for, is reminded only while one hasn't answered, and can't after the due date", async () => {
    let dad = await signUp("1001000009", "Hassan");
    let sara = await signUp("1110000001", "Sara");
    const slip = (await sendSlip(await deps(), { appId: app.id, id: null, title: "Museum trip", details: "Bring lunch.", dueOn: "2026-11-03", feeNote: "E£150 at the office", audience: "class", grade: null, classId: classA }))!;
    expect((await inbox(dad))[0]).toMatchObject({ title: "A permission slip to sign", type: "school_slip", slip_id: slip.id });
    expect((await inbox(sara))[0]).toMatchObject({ type: "school_slip" });

    const list = (await call("GET", "/parent/slips", { token: dad })).body as { items: { id: number; open: boolean; fee_note: string; for_name: string; children: { student_id: number; answer: string | null }[] }[] };
    expect(list.items).toEqual([expect.objectContaining({ id: slip.id, open: true, fee_note: "E£150 at the office", for_name: "Grade 5 A", children: [expect.objectContaining({ student_id: omar, answer: null })] })]);
    expect(((await call("GET", "/parent/me", { token: dad })).body as { slips_waiting: number }).slips_waiting).toBe(1);
    // Laila isn't in the class: not hers to sign.
    expect((await call("POST", "/parent/slips/{slip_id}/answers", { params: [String(slip.id)], token: dad, body: { student_id: laila, answer: "yes", signed_name: "Hassan Ali" } })).status).toBe(404);
    expect((await call("POST", "/parent/slips/{slip_id}/answers", { params: [String(slip.id)], token: dad, body: { student_id: other, answer: "yes", signed_name: "Hassan Ali" } })).status).toBe(404);

    // The day before the due date, from 17:00: Sara hasn't answered for Youssef, Hassan answers first.
    const signed = await call("POST", "/parent/slips/{slip_id}/answers", { params: [String(slip.id)], token: dad, body: { student_id: omar, answer: "yes", signed_name: "Hassan Ali" } });
    expect(signed.status).toBe(200);
    expect((signed.body as { children: { answer: string; signed_name: string }[] }).children[0]).toMatchObject({ answer: "yes", signed_name: "Hassan Ali" });
    now = new Date("2026-11-02T14:00:00Z");
    expect(await remindSlips(await deps())).toBe(0);
    now = new Date("2026-11-02T15:05:00Z");
    // Signed in again after the hours went by.
    dad = await signUp("1001000009", "Hassan");
    sara = await signUp("1110000001", "Sara");
    const before = (await inbox(dad)).length;
    expect(await runSchoolReminders({ store, now })).toEqual({ exams: 0, slips: 1 });
    expect(await remindSlips(await deps())).toBe(0);
    expect((await inbox(dad)).length).toBe(before);
    expect((await inbox(sara))[0]).toMatchObject({ title: "A permission slip is due tomorrow", type: "school_slip" });

    // After the due date: closed.
    now = new Date("2026-11-04T06:00:00Z");
    dad = await signUp("1001000009", "Hassan");
    const late = await call("POST", "/parent/slips/{slip_id}/answers", { params: [String(slip.id)], token: dad, body: { student_id: omar, answer: "no", signed_name: "Hassan Ali" } });
    expect(late.status).toBe(409);
    expect(late.body).toMatchObject({ code: "slip_closed" });
    expect(((await call("GET", "/parent/slips", { token: dad })).body as { items: { open: boolean }[] }).items[0]!.open).toBe(false);
  });

  it("an excuse: sent with a reason, accepted by the school, those days excused in the register, the attendance and at the gate", async () => {
    const dad = await signUp("1001000009", "Hassan");
    // Omar was marked absent on Sunday 1 November.
    await store.saveSchoolAttendance([{ appId: app.id, classId: classA, studentId: omar, date: "2026-11-01", status: "absent", note: null, takenBy: null, updatedAt: now }]);
    const sent = await call("POST", "/parent/children/{student_id}/excuses", { params: [String(omar)], token: dad, body: { starts_on: "2026-11-01", ends_on: "2026-11-02", reason: "A fever" } });
    expect(sent.status).toBe(201);
    const excuse = sent.body as { id: number; status: string; days: number };
    expect(excuse).toMatchObject({ status: "pending", days: 2 });
    expect((await call("POST", "/parent/children/{student_id}/excuses", { params: [String(omar)], token: dad, body: { starts_on: "2026-11-02", reason: "Again" } })).body).toMatchObject({ code: "excuse_overlaps" });
    expect(((await call("GET", "/parent/children/{student_id}/day", { params: [String(omar)], token: dad })).body as { excuse: { id: number } }).excuse).toMatchObject({ id: excuse.id });

    const saved = (await store.getSchoolExcuse(app.id, excuse.id))!;
    expect(await answerExcuse(await deps(), saved, "accepted", null, "The office")).toBe(true);
    expect(await answerExcuse(await deps(), saved, "declined", "No", "The office")).toBe(false);
    expect((await inbox(dad))[0]).toMatchObject({ title: "Absence excused", type: "school_excuse", student_id: omar });
    // Withdrawing an answered excuse is refused.
    expect((await call("DELETE", "/parent/excuses/{excuse_id}", { params: [String(excuse.id)], token: dad })).body).toMatchObject({ code: "already_answered" });

    // The register: the day before is now excused; today the teacher's "absent" is kept as excused.
    const [sunday] = await store.listSchoolAttendance(app.id, { studentId: omar, from: "2026-11-01", to: "2026-11-01" });
    expect(sunday).toMatchObject({ status: "excused", note: "Excused: A fever" });
    const student = (await store.getSchoolPerson(app.id, omar))!;
    await takeAttendance(await deps(), { classId: classA, date: "2026-11-02", items: [{ student, status: "absent", note: null }], takenBy: null });
    const [monday] = await store.listSchoolAttendance(app.id, { studentId: omar, from: "2026-11-02", to: "2026-11-02" });
    expect(monday).toMatchObject({ status: "excused" });
    const attendance = (await call("GET", "/school/students/{student_id}/attendance", { params: [String(omar)], token: dad, query: { from: "2026-11-01", to: "2026-11-02" } })).body as { counts: { excused: number; absent: number } };
    expect(attendance.counts).toMatchObject({ excused: 2, absent: 0 });

    // At the gate: excused on the day's board and in the month's report.
    now = new Date("2026-11-02T13:00:00Z");
    const fresh = (await store.getAppById(app.id))!;
    const board = await checkinBoard(store, fresh, "2026-11-02", now);
    expect(board.find((b) => b.person.id === omar)).toMatchObject({ state: "excused", excuse: { reason: "A fever" } });
    expect(board.find((b) => b.person.id === other)?.state).toBe("absent");
    const report = await monthReport(store, fresh, "2026-11", now, { personId: omar });
    expect(report.rows[0]).toMatchObject({ excused: 2, absent: 0 });
  });

  it("a waiting excuse is withdrawn; the school's note on a declined one", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const sent = (await call("POST", "/parent/children/{student_id}/excuses", { params: [String(laila)], token: dad, body: { starts_on: "2026-11-05", reason: "A family visit" } })).body as { id: number };
    expect((await call("DELETE", "/parent/excuses/{excuse_id}", { params: [String(sent.id)], token: dad })).status).toBe(204);
    const again = (await call("POST", "/parent/children/{student_id}/excuses", { params: [String(laila)], token: dad, body: { starts_on: "2026-11-05", reason: "A family visit" } })).body as { id: number };
    expect(await answerExcuse(await deps(), (await store.getSchoolExcuse(app.id, again.id))!, "declined", "Not a reason we excuse.", "The office")).toBe(true);
    const list = (await call("GET", "/parent/children/{student_id}/excuses", { params: [String(laila)], token: dad })).body as { items: { status: string; answer: string | null }[] };
    expect(list.items.map((e) => [e.status, e.answer])).toEqual([
      ["declined", "Not a reason we excuse."],
      ["cancelled", null],
    ]);
    expect((await inbox(dad))[0]).toMatchObject({ title: "Excuse not accepted", type: "school_excuse" });
  });

  it("pick-up: the parents' list and today's note, on the day's board", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const saved = await call("PUT", "/parent/children/{student_id}/pickup", {
      params: [String(omar)],
      token: dad,
      body: { people: [{ name: "Mona Ali", relation: "Grandmother", phone: "+20 100 555 1212" }, { name: "Karim Ali", relation: "Uncle" }] },
    });
    expect(saved.status).toBe(200);
    expect((saved.body as { people: { name: string }[] }).people.map((p) => p.name)).toEqual(["Mona Ali", "Karim Ali"]);
    expect((await call("PUT", "/parent/children/{student_id}/pickup", { params: [String(omar)], token: dad, body: { people: [{ name: "X", photo_id: "00000000-0000-0000-0000-000000000000" }] } })).status).toBe(400);
    const noted = (await call("PUT", "/parent/children/{student_id}/pickup/note", { params: [String(omar)], token: dad, body: { name: "Karim Ali", relation: "Uncle", note: "At 13:00" } })).body as { today: { name: string; written_by: string } };
    expect(noted.today).toMatchObject({ name: "Karim Ali", written_by: "Hassan Ali" });
    const day = (await call("GET", "/parent/children/{student_id}/day", { params: [String(omar)], token: dad })).body as { pickup: { people: number; today: { name: string } } };
    expect(day.pickup).toMatchObject({ people: 2, today: { name: "Karim Ali" } });
    const board = await checkinBoard(store, (await store.getAppById(app.id))!, "2026-11-02", now);
    expect(board.find((b) => b.person.id === omar)?.pickup).toMatchObject({ name: "Karim Ali", relation: "Uncle" });
    expect(board.find((b) => b.person.id === laila)?.pickup).toBeNull();
    const taken = (await call("DELETE", "/parent/children/{student_id}/pickup/note", { params: [String(omar)], token: dad })).body as { today: unknown; people: unknown[] };
    expect(taken).toMatchObject({ today: null });
    expect(taken.people).toHaveLength(2);
  });

  it("the child's day at a glance: lessons, homework due, grades, behaviour, books, fees and the next days", async () => {
    const dad = await signUp("1001000009", "Hassan");
    const subject = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Mathematics" }, NOW);
    if (!subject.ok) throw new Error("subject");
    await store.saveSchoolPeriod({ appId: app.id, id: null, classId: classA, subjectId: subject.subject.id, teacherId: null, weekday: 1, startMinute: 480, endMinute: 525, room: "12" });
    await store.createSchoolHomework({ appId: app.id, classId: classA, subjectId: subject.subject.id, teacherId: null, title: "Fractions", text: "Page 12", dueOn: "2026-11-04", files: [], createdAt: NOW });
    const exam = await store.createSchoolAssessment({ appId: app.id, classId: classA, subjectId: subject.subject.id, teacherId: null, kind: "quiz", title: "Quiz 1", date: "2026-10-28", maxScore: 10, createdAt: NOW });
    await store.saveSchoolScores(app.id, exam.id, [{ studentId: omar, score: 8.5, note: null }], NOW);
    await store.createSchoolFee({ appId: app.id, studentId: omar, title: "Bus", amountCents: 50_000, dueOn: null, status: "due", paidAt: null, paidBy: null, orderId: null, receiptCode: null, createdAt: NOW, updatedAt: NOW });
    await store.saveSchoolEvent({ id: null, appId: app.id, kind: "event", title: "Sports day", notes: null, startsOn: "2026-11-05", endsOn: "2026-11-05", startMinute: null, endMinute: null, place: null, audience: "school", grade: null, classId: null }, NOW);
    const day = (await call("GET", "/parent/children/{student_id}/day", { params: [String(omar)], token: dad })).body as Record<string, unknown>;
    expect(day).toMatchObject({
      date: "2026-11-02",
      student: { id: omar, class_name: "Grade 5 A" },
      lessons: [expect.objectContaining({ subject: "Mathematics", starts: "08:00" })],
      homework: { due_count: 1, items: [expect.objectContaining({ title: "Fractions" })] },
      grades: [expect.objectContaining({ title: "Quiz 1", score: 8.5, max_score: 10 })],
      behaviour: { points: 0, latest: null },
      loans: [],
      fees: { due_count: 1 },
      events: [expect.objectContaining({ title: "Sports day" })],
      slips_waiting: 0,
      excuse: null,
    });
  });
});
