import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { localToUtc } from "@/lib/bookings/time";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type SchoolCheckinSettings } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import {
  checkinBoard,
  checkinSettingsOf,
  correctCheckin,
  dayState,
  DEFAULT_STAFF_TIMES,
  DEFAULT_STUDENT_TIMES,
  distanceM,
  gateCode,
  gateCodes,
  gatePayload,
  gateSecret,
  gateWindow,
  monthCsv,
  monthRange,
  monthReport,
  proofOf,
  readGateCode,
  timesFor,
} from "@/lib/school/checkin";
import { answerLeave, postAnnouncement } from "@/lib/school/flow";
import { checkinFormValues, parseCheckinSettings, parseCorrectionForm, parseNewsForm, parsePersonForm } from "@/lib/school/forms";
import { schoolSettingsOf } from "@/lib/school/settings";
import { parseWorkForm, readLeaveInput } from "@/lib/school/staff";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const SECRET = "test-hosted-secret";
const ZONE = "Africa/Cairo";
const SCHOOL = { lat: 30.0444, lng: 31.2357 };
/** About 60 m from the school's place, and about 1.1 km. */
const INSIDE = { lat: 30.0449, lng: 31.2359 };
const OUTSIDE = { lat: 30.0544, lng: 31.2357 };
const at = (time: string, date = "2026-10-12") => localToUtc(date, time, ZONE);

describe("113.2 the gate's codes", () => {
  const key = gateSecret(SECRET, "app-1", 1);

  it("are six digits and a signed QR payload, new every 30 seconds", () => {
    const now = new Date("2026-10-12T05:00:10Z");
    const [first, second] = gateCodes(key, now, 2);
    expect(first!.code).toMatch(/^\d{6}$/);
    expect(first!.payload).toMatch(/^YG1\.\d+\.[A-Za-z0-9_-]{22}$/);
    expect(second!.startsAt.getTime() - first!.startsAt.getTime()).toBe(30_000);
    expect(first!.startsAt.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(first!.endsAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it("take this window's code and the one before, nothing older, made up or of another school", () => {
    const now = new Date("2026-10-12T05:00:10Z");
    const w = gateWindow(now);
    expect(readGateCode(key, gateCode(key, w), now)).toBe(true);
    expect(readGateCode(key, ` ${gateCode(key, w).slice(0, 3)} ${gateCode(key, w).slice(3)} `, now)).toBe(true);
    expect(readGateCode(key, gateCode(key, w - 1), now)).toBe(true);
    expect(readGateCode(key, gatePayload(key, w), now)).toBe(true);
    // An old one (a photo of the screen a minute later) fails.
    expect(readGateCode(key, gateCode(key, w - 2), now)).toBe(gateCode(key, w - 2) === gateCode(key, w) || gateCode(key, w - 2) === gateCode(key, w - 1));
    expect(readGateCode(key, gatePayload(key, w - 2), now)).toBe(false);
    // A payload with its window changed, or signed with another school's key, fails.
    expect(readGateCode(key, gatePayload(key, w - 5).replace(`.${w - 5}.`, `.${w}.`), now)).toBe(false);
    const other = gateSecret(SECRET, "app-2", 1);
    expect(readGateCode(key, gatePayload(other, w), now)).toBe(false);
    // New codes: the old key's fail.
    expect(readGateCode(gateSecret(SECRET, "app-1", 2), gatePayload(key, w), now)).toBe(false);
    expect(readGateCode(key, "12345", now)).toBe(false);
    expect(readGateCode(key, "YG1.x.y", now)).toBe(false);
  });

  it("measure the area and check what each method needs", () => {
    expect(distanceM(SCHOOL, INSIDE)).toBeLessThan(80);
    expect(distanceM(SCHOOL, OUTSIDE)).toBeGreaterThan(1000);
    const now = new Date("2026-10-12T05:00:10Z");
    const c = (methods: SchoolCheckinSettings["methods"]): SchoolCheckinSettings => ({ ...checkinSettingsOf(schoolSettingsOf(null)), on: true, methods, place: { ...SCHOOL, radiusM: 150 } });
    const code = gateCode(key, gateWindow(now));
    expect(proofOf(c("qr"), key, { code, position: null }, now)).toEqual({ method: "qr" });
    expect(proofOf(c("qr"), key, { code: null, position: INSIDE }, now)).toEqual({ code: "code_needed" });
    expect(proofOf(c("location"), key, { code: null, position: INSIDE }, now)).toEqual({ method: "location" });
    expect(proofOf(c("location"), key, { code: null, position: OUTSIDE }, now)).toMatchObject({ code: "outside_area", distanceM: expect.any(Number) });
    expect(proofOf(c("location"), key, { code, position: null }, now)).toEqual({ code: "location_needed" });
    expect(proofOf(c("either"), key, { code: null, position: INSIDE }, now)).toEqual({ method: "location" });
    expect(proofOf(c("either"), key, { code: "000000", position: INSIDE }, now)).toEqual(code === "000000" ? { method: "qr" } : { code: "invalid_code" });
    expect(proofOf(c("either"), key, { code: null, position: null }, now)).toEqual({ code: "code_needed" });
    expect(proofOf(c("both"), key, { code, position: OUTSIDE }, now)).toMatchObject({ code: "outside_area" });
    expect(proofOf(c("both"), key, { code, position: INSIDE }, now)).toEqual({ method: "qr" });
    expect(proofOf({ ...c("location"), place: null }, key, { code: null, position: INSIDE }, now)).toEqual({ code: "checkin_off" });
  });
});

describe("113.2 a day's state and times", () => {
  it("is late, left, absent, excused, on leave or off", () => {
    const base = { date: "2026-10-12", today: "2026-10-12", nowMinute: 9 * 60, times: DEFAULT_STUDENT_TIMES, workDay: true, onLeave: false, since: null };
    const row = { appId: "a", personId: 1, role: "student" as const, date: "2026-10-12", inAt: NOW, inMethod: "qr" as const, outAt: null, outMethod: null, late: true, leftEarly: false, mark: null, corrections: [], updatedAt: NOW };
    expect(dayState({ ...base, row: null })).toBe("not_yet");
    expect(dayState({ ...base, row: null, nowMinute: 14 * 60 })).toBe("absent");
    expect(dayState({ ...base, row: null, date: "2026-10-11" })).toBe("absent");
    expect(dayState({ ...base, row: null, date: "2026-10-11", since: "2026-10-12" })).toBe("off");
    expect(dayState({ ...base, row: null, workDay: false })).toBe("off");
    expect(dayState({ ...base, row: null, onLeave: true })).toBe("leave");
    expect(dayState({ ...base, row })).toBe("in");
    expect(dayState({ ...base, row: { ...row, outAt: NOW } })).toBe("left");
    expect(dayState({ ...base, row: { ...row, mark: "excused" } })).toBe("excused");
    expect(dayState({ ...base, row: { ...row, mark: "absent" } })).toBe("absent");
  });

  it("gives staff their own hours with the staff's grace, and students the students' times", () => {
    const c = checkinSettingsOf(schoolSettingsOf(null));
    expect(c.days).toEqual([7, 1, 2, 3, 4]);
    expect(checkinSettingsOf(schoolSettingsOf({ ...schoolSettingsOf(null), timezone: "Europe/Istanbul" })).days).toEqual([1, 2, 3, 4, 5]);
    expect(timesFor(c, { workHours: null }, "student")).toEqual(DEFAULT_STUDENT_TIMES);
    expect(timesFor(c, { workHours: null }, "staff")).toEqual(DEFAULT_STAFF_TIMES);
    expect(timesFor(c, { workHours: { days: [1], startMinute: 600, endMinute: 960 } }, "teacher")).toEqual({ startMinute: 600, lateMinute: 630, endMinute: 960, earlyMinute: 945 });
    expect(monthRange("2026-11")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange("2027-02")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });
});

describe("113.2 and 113.3 the dashboard's forms", () => {
  const saved = checkinSettingsOf(schoolSettingsOf(null));
  const form = { ...checkinFormValues(saved), on: "on", methods: "both", lat: "30.0444", lng: "31.2357", radius: "150" };

  it("checks the check-in settings and starts counting the day it is turned on", () => {
    const parsed = parseCheckinSettings(form, saved, "2026-10-12");
    expect(parsed).toMatchObject({ ok: true, value: { on: true, methods: "both", place: { lat: 30.0444, lng: 31.2357, radiusM: 150 }, since: "2026-10-12", gateKey: 1, days: [1, 2, 3, 4, 7] } });
    if (!parsed.ok) throw new Error("parsed");
    expect(parseCheckinSettings(form, parsed.value, "2026-10-20")).toMatchObject({ ok: true, value: { since: "2026-10-12" } });
    expect(parseCheckinSettings({ ...form, lat: "", radius: "5" }, saved, "2026-10-12")).toMatchObject({ ok: false, errors: { lat: expect.any(String), radius: "Enter how far from it counts, from 20 to 5000 metres." } });
    expect(parseCheckinSettings({ ...form, methods: "qr", lat: "", lng: "", radius: "" }, saved, "2026-10-12")).toMatchObject({ ok: true, value: { place: null } });
    expect(parseCheckinSettings({ ...form, studentLate: "07:00" }, saved, "2026-10-12")).toMatchObject({ ok: false, errors: { studentLate: "Late is from the start or after it." } });
    expect(parseCheckinSettings({ ...form, day1: "", day2: "", day3: "", day4: "", day7: "" }, saved, "2026-10-12")).toMatchObject({ ok: false, errors: { days: "Choose the school's days." } });
  });

  it("checks a correction, a worker's hours, staff news and the staff role", () => {
    expect(parseCorrectionForm({ inTime: "07:40", outTime: "", mark: "present", reason: "Forgot to check in" })).toEqual({ ok: true, value: { inTime: "07:40", outTime: null, mark: "present", reason: "Forgot to check in" } });
    expect(parseCorrectionForm({ inTime: "", mark: "present", reason: "" })).toMatchObject({ ok: false, errors: { inTime: "Enter the time they came in.", reason: "Write why it is corrected." } });
    expect(parseCorrectionForm({ inTime: "09:00", outTime: "08:00", mark: "present", reason: "x" })).toMatchObject({ ok: false, errors: { outTime: "They leave after they come in." } });
    expect(parseWorkForm({ jobTitle: "Nurse", department: "Clinic", workDay1: "on", workDay7: "on", workStart: "08:00", workEnd: "15:00", duties: "First aid" })).toEqual({
      ok: true,
      value: { jobTitle: "Nurse", department: "Clinic", workHours: { days: [1, 7], startMinute: 480, endMinute: 900 }, duties: "First aid" },
    });
    expect(parseWorkForm({ workStart: "08:00", workEnd: "07:00" })).toMatchObject({ ok: false, errors: { workEnd: "The day ends after it starts.", workDays: "Choose the days they work." } });
    expect(parseWorkForm({})).toEqual({ ok: true, value: { jobTitle: null, department: null, workHours: null, duties: null } });
    expect(parseNewsForm({ to: "staff", title: "Meeting", body: "Thursday at 2." }, [], [])).toEqual({ ok: true, value: { audience: "staff", classId: null, studentId: null, title: "Meeting", body: "Thursday at 2." } });
    expect(parsePersonForm({ role: "staff", name: "Samir", phone: "01223334445" }, "+20", [])).toMatchObject({ ok: true, value: { role: "staff", classId: null } });
    expect(readLeaveInput({ kind: "sick", starts_on: "2026-10-14", ends_on: "2026-10-13" }, "2026-10-12")).toEqual({ ok: false, message: "The last day is on or after the first." });
    expect(readLeaveInput({ kind: "annual", starts_on: "2026-08-01", ends_on: "2026-08-02" }, "2026-10-12")).toEqual({ ok: false, message: "Leave can be asked for up to 30 days back." });
    expect(readLeaveInput({ kind: "holiday", starts_on: "2026-10-14", ends_on: "2026-10-14" }, "2026-10-12")).toEqual({ ok: false, message: "Choose sick, annual or other leave." });
  });
});

describe("113.2 and 113.3 on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let classA: number;
  let omar: number;
  let mona: number;
  let samir: number;
  const plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school" as const] };

  async function makeSchool(name: string): Promise<App> {
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "school");
    const made: App = {
      ...base,
      backend: "hosted",
      appName: name,
      websiteDoneAt: NOW,
      connector: { kind: "school" },
      timeZone: ZONE,
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" },
    };
    await store.createApp(made);
    return made;
  }

  const person = async (input: { role: "student" | "parent" | "teacher" | "staff"; name: string; phone: string; classId?: number | null; jobTitle?: string; workHours?: { days: number[]; startMinute: number; endMinute: number } }, target = app) => {
    const made = await store.createSchoolPerson(
      { appId: target.id, role: input.role, name: input.name, phone: input.phone, email: null, classId: input.classId ?? null, code: null, photoAssetId: null, active: true, jobTitle: input.jobTitle ?? null, workHours: input.workHours ?? null },
      new Date("2026-10-01T00:00:00Z"),
    );
    if (!made.ok) throw new Error("duplicate");
    return made.person.id;
  };

  async function turnOn(target: App, patch: Partial<SchoolCheckinSettings> = {}) {
    const settings = schoolSettingsOf(await store.getSchoolSettings(target.id), target);
    await store.saveSchoolSettings(target.id, { ...settings, checkin: { ...checkinSettingsOf(settings), on: true, methods: "either", place: { ...SCHOOL, radiusM: 150 }, since: "2026-10-01", ...patch } });
  }

  beforeEach(async () => {
    ({ store } = await setupClient());
    app = await makeSchool("Nile School");
    const a = await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: null, homeroomTeacherId: null }, NOW);
    classA = a!.id;
    mona = await person({ role: "teacher", name: "Mona Adel", phone: "+201110000000", jobTitle: "Mathematics teacher" });
    samir = await person({ role: "staff", name: "Samir Fawzy", phone: "+201220000000", jobTitle: "Nurse", workHours: { days: [7, 1, 2, 3, 4], startMinute: 9 * 60, endMinute: 17 * 60 } });
    omar = await person({ role: "student", name: "Omar Hassan", phone: "+201001000001", classId: classA });
    const dad = await person({ role: "parent", name: "Hassan Ali", phone: "+201001000009" });
    await store.setSchoolChildren(app.id, dad, [omar]);
    sender = new LogSender();
    now = at("07:40");
  });

  const context = async (target = app): Promise<HostedContext> => {
    const fresh = (await store.getAppById(target.id))!;
    return { store, app: fresh, active: true, plan, now, ip: "203.0.113.9", secret: SECRET, sender, push: false, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", connector: null };
  };

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown; target?: App } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(await context(options.target), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string, target = app) {
    const keep = now;
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone }, target });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } }, target });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } }, target });
    now = keep;
    return (registered.body as { access_token: string }).access_token;
  }

  /** A fresh session for someone who signed up already (sessions last minutes). */
  async function signIn(phone: string) {
    const keep = now;
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    now = keep;
    return (verified.body as { access_token: string }).access_token;
  }

  const gateNow = async (target = app) => gateCode(gateSecret(SECRET, target.id, checkinSettingsOf(schoolSettingsOf(await store.getSchoolSettings(target.id), target)).gateKey), gateWindow(now));

  it("a student checks in with the gate's code and out inside the area; the parents are told, late or early", async () => {
    const student = await signUp("1001000001", "Omar");
    const dad = await signUp("1001000009", "Hassan");
    // Off until the school turns it on.
    expect((await call("GET", "/school/checkin", { token: student })).body).toMatchObject({ on: false, role: "student", today: { state: "not_yet" } });
    expect((await call("POST", "/school/checkin", { token: student, body: { action: "in", code: "123456" } })).body).toMatchObject({ code: "checkin_off" });
    await turnOn(app);
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body).toMatchObject({ school: { checkin: { on: true, methods: "either" } } });
    const today = (await call("GET", "/school/checkin", { token: student })).body;
    expect(today).toMatchObject({ on: true, methods: "either", place: { lat: SCHOOL.lat, lng: SCHOOL.lng, radius_m: 150 }, date: "2026-10-12", school_day: true, times: { starts: "07:30", late_from: "08:00", ends: "14:00", early_before: "13:45" } });
    // A parent doesn't check in; an old code and a place outside the area don't work.
    expect((await call("POST", "/school/checkin", { token: dad, body: { action: "in" } })).body).toMatchObject({ code: "not_checkin_member" });
    expect((await call("POST", "/school/checkin", { token: student, body: { action: "out" } })).body).toMatchObject({ code: "not_in" });
    const outside = await call("POST", "/school/checkin", { token: student, body: { action: "in", ...OUTSIDE } });
    expect(outside.status).toBe(403);
    expect(outside.body).toMatchObject({ code: "outside_area", details: { distance_m: expect.any(Number) } });
    const code = await gateNow();
    const wrong = code === "000000" ? "111111" : "000000";
    expect((await call("POST", "/school/checkin", { token: student, body: { action: "in", code: wrong } })).body).toMatchObject({ code: "invalid_code" });
    const checked = await call("POST", "/school/checkin", { token: student, body: { action: "in", code } });
    expect(checked.body).toMatchObject({ result: "on_time", time: "07:40", day: { state: "in", in_time: "07:40", in_method: "qr", late: false } });
    expect((await call("POST", "/school/checkin", { token: student, body: { action: "in", code } })).body).toMatchObject({ code: "already_in" });
    let inbox = (await call("GET", "/me/notifications", { token: dad })).body as { items: { title: string; type: string; student_id?: number }[] };
    expect(inbox.items[0]).toMatchObject({ title: "Omar Hassan arrived at school", type: "school_checkin", student_id: omar });
    // The student isn't told of their own check-in.
    expect(((await call("GET", "/me/notifications", { token: student })).body as { items: unknown[] }).items).toEqual([]);
    now = at("12:30");
    const later = await signIn("1001000001");
    const dadLater = await signIn("1001000009");
    expect((await call("POST", "/school/checkin", { token: later, body: { action: "out", ...INSIDE } })).body).toMatchObject({ result: "left_early", day: { state: "left", out_time: "12:30", out_method: "location", left_early: true } });
    inbox = (await call("GET", "/me/notifications", { token: dadLater })).body as { items: { title: string; type: string }[] };
    expect(inbox.items[0]).toMatchObject({ title: "Omar Hassan left early", type: "school_checkin" });
    // The parent follows the child's month; another child isn't theirs.
    const month = (await call("GET", "/school/students/{student_id}/checkins", { params: [String(omar)], token: dadLater })).body as { counts: Record<string, number>; days: { date: string; state: string }[] };
    expect(month.counts).toMatchObject({ present: 1, left_early: 1, late: 0 });
    expect(month.days[0]).toMatchObject({ date: "2026-10-12", state: "left" });
    expect((await call("GET", "/school/students/{student_id}/checkins", { params: [String(omar)], token: dadLater, query: { month: "2026-13" } })).status).toBe(400);
  });

  it("a teacher checks in late by the staff's times; staff by their own hours; the board and the month count it", async () => {
    await turnOn(app, { methods: "location" });
    const teacher = await signUp("1110000000", "Mona");
    const nurse = await signUp("1220000000", "Samir");
    expect((await call("GET", "/me", { token: nurse })).body).toMatchObject({ roles: ["staff"] });
    now = at("07:40");
    // The staff's day starts at 07:00, late from 07:30.
    expect((await call("POST", "/school/checkin", { token: teacher, body: { action: "in", ...INSIDE } })).body).toMatchObject({ result: "late", day: { late: true } });
    // Samir works from 09:00.
    expect((await call("GET", "/school/checkin", { token: nurse })).body).toMatchObject({ role: "staff", times: { starts: "09:00", late_from: "09:30", ends: "17:00", early_before: "16:45" } });
    expect((await call("POST", "/school/checkin", { token: nurse, body: { action: "in", ...INSIDE } })).body).toMatchObject({ result: "on_time" });
    const board = await checkinBoard(store, (await store.getAppById(app.id))!, "2026-10-12", now);
    expect(board.map((b) => [b.person.name, b.role, b.state, b.row?.late ?? false])).toEqual([
      ["Mona Adel", "teacher", "in", true],
      ["Omar Hassan", "student", "not_yet", false],
      ["Samir Fawzy", "staff", "in", false],
    ]);
    // The day before, nobody came: absent, from when it was turned on.
    const report = await monthReport(store, (await store.getAppById(app.id))!, "2026-10", now);
    const mona = report.rows.find((r) => r.person.name === "Mona Adel")!;
    expect(mona).toMatchObject({ present: 1, late: 1 });
    expect(mona.absent).toBe(mona.days - 1);
    expect(monthCsv(report.rows, () => "")).toContain("Name,Role,Class or job,School days,Present,Late,Left early,Absent,Excused,On leave\r\n");
  });

  it("the office corrects a day, keeping who and why; a correction undoes nothing else", async () => {
    await turnOn(app);
    const student = (await store.getSchoolPerson(app.id, omar))!;
    const fresh = (await store.getAppById(app.id))!;
    const first = await correctCheckin({ store, app: fresh, now }, { person: student, role: "student", date: "2026-10-11", inTime: "07:50", outTime: "14:00", mark: "present", reason: "The phone was off", by: "Office" });
    expect(first).toMatchObject({ inMethod: "office", outMethod: "office", late: false, leftEarly: false, corrections: [{ by: "Office", reason: "The phone was off", change: "In — → 07:50, Out — → 14:00" }] });
    const second = await correctCheckin({ store, app: fresh, now }, { person: student, role: "student", date: "2026-10-11", inTime: "08:10", outTime: "14:00", mark: "present", reason: "Came after the bell", by: "Head teacher" });
    expect(second!.late).toBe(true);
    expect(second!.corrections.map((c) => c.change)).toEqual(["In — → 07:50, Out — → 14:00", "In 07:50 → 08:10"]);
    expect(await correctCheckin({ store, app: fresh, now }, { person: student, role: "student", date: "2026-10-11", inTime: "08:10", outTime: "14:00", mark: "present", reason: "Again", by: "Office" })).toBeNull();
    await correctCheckin({ store, app: fresh, now }, { person: student, role: "student", date: "2026-10-08", inTime: null, outTime: null, mark: "excused", reason: "Doctor's note", by: "Office" });
    const dad = await signUp("1001000009", "Hassan");
    const month = (await call("GET", "/school/students/{student_id}/checkins", { params: [String(omar)], token: dad })).body as { counts: Record<string, number>; days: { date: string; state: string; corrections: { reason: string }[] }[] };
    expect(month.counts).toMatchObject({ present: 1, late: 1, excused: 1 });
    expect(month.days.find((d) => d.date === "2026-10-11")!.corrections.map((c) => c.reason)).toEqual(["The phone was off", "Came after the bell"]);
  });

  it("one school's gate code and check-ins are nothing to another", async () => {
    const other = await makeSchool("Delta School");
    await person({ role: "student", name: "Omar Hassan", phone: "+201001000001" }, other);
    await turnOn(app, { methods: "qr" });
    await turnOn(other, { methods: "qr" });
    const mine = await gateNow(app);
    const theirs = await gateNow(other);
    const there = await signUp("1001000001", "Omar", other);
    if (mine !== theirs) expect((await call("POST", "/school/checkin", { token: there, body: { action: "in", code: mine }, target: other })).body).toMatchObject({ code: "invalid_code" });
    expect((await call("POST", "/school/checkin", { token: there, body: { action: "in", code: theirs }, target: other })).body).toMatchObject({ result: "on_time" });
    // Their check-in isn't on this school's board, and this school's student isn't checked in.
    const board = await checkinBoard(store, (await store.getAppById(app.id))!, "2026-10-12", now);
    expect(board.find((b) => b.person.id === omar)!.row).toBeNull();
    expect((await store.listSchoolCheckins(app.id, { date: "2026-10-12" })).length).toBe(0);
    // A token of the other school opens nothing here.
    expect((await call("GET", "/school/checkin", { token: there })).status).toBe(401);
  });

  it("113.3 staff: their work, leave requests answered in the dashboard, and news for the staff only", async () => {
    const nurse = await signUp("1220000000", "Samir");
    const teacher = await signUp("1110000000", "Mona");
    const student = await signUp("1001000001", "Omar");
    expect((await call("GET", "/staff/me", { token: nurse })).body).toMatchObject({
      name: "Samir Fawzy",
      role: "staff",
      job_title: "Nurse",
      work_hours: { days: [1, 2, 3, 4, 7], starts: "09:00", ends: "17:00" },
      days: [1, 2, 3, 4, 7],
      timetable: { days: [] },
    });
    expect((await call("GET", "/staff/me", { token: teacher })).body).toMatchObject({ role: "teacher", job_title: "Mathematics teacher", work_hours: null, times: { starts: "07:00" } });
    expect((await call("GET", "/staff/me", { token: student })).body).toMatchObject({ code: "not_staff" });
    // A leave request, one that overlaps it, and a withdrawn one.
    const asked = await call("POST", "/staff/leave", { token: nurse, body: { kind: "sick", starts_on: "2026-10-12", ends_on: "2026-10-13", note: "Flu" } });
    expect(asked.status).toBe(201);
    const leave = asked.body as { id: number };
    expect(asked.body).toMatchObject({ kind: "sick", days: 2, status: "pending", answer: null });
    expect((await call("POST", "/staff/leave", { token: nurse, body: { kind: "annual", starts_on: "2026-10-13", ends_on: "2026-10-15" } })).body).toMatchObject({ code: "leave_overlaps" });
    const other = (await call("POST", "/staff/leave", { token: nurse, body: { kind: "other", starts_on: "2026-11-01", ends_on: "2026-11-01" } })).body as { id: number };
    expect((await call("DELETE", "/staff/leave/{leave_id}", { params: [String(other.id)], token: nurse })).status).toBe(204);
    // Not someone else's.
    expect((await call("DELETE", "/staff/leave/{leave_id}", { params: [String(leave.id)], token: teacher })).status).toBe(404);
    // The school approves it; Samir is told, and the days count as leave.
    const saved = (await store.getSchoolLeave(app.id, leave.id))!;
    expect(await answerLeave({ store, app: (await store.getAppById(app.id))!, now }, saved, "approved", "Get well soon", "Office")).toBe(true);
    expect(await answerLeave({ store, app: (await store.getAppById(app.id))!, now }, saved, "refused", "x", "Office")).toBe(false);
    expect((await call("DELETE", "/staff/leave/{leave_id}", { params: [String(leave.id)], token: nurse })).body).toMatchObject({ code: "already_answered" });
    const list = (await call("GET", "/staff/leave", { token: nurse })).body as { items: { id: number; status: string; answer: string | null }[] };
    expect(list.items.map((l) => [l.id, l.status, l.answer])).toEqual([
      [other.id, "cancelled", null],
      [leave.id, "approved", "Get well soon"],
    ]);
    expect(((await call("GET", "/me/notifications", { token: nurse })).body as { items: { title: string; type: string }[] }).items[0]).toMatchObject({ title: "Leave approved", type: "school_leave" });
    await turnOn(app);
    expect((await call("GET", "/school/checkin", { token: nurse })).body).toMatchObject({ today: { state: "leave" } });
    // News for the staff only.
    await postAnnouncement({ store, app: (await store.getAppById(app.id))!, now }, { audience: "staff", classId: null, studentId: null, title: "Staff meeting", body: "Thursday at 2.", teacherId: null });
    expect(((await call("GET", "/staff/announcements", { token: teacher })).body as { items: { title: string; audience: string }[] }).items).toEqual([expect.objectContaining({ title: "Staff meeting", audience: "staff" })]);
    expect(((await call("GET", "/school/announcements", { token: student })).body as { items: unknown[] }).items).toEqual([]);
    expect((await call("GET", "/staff/announcements", { token: student })).status).toBe(403);
    expect(((await call("GET", "/me/notifications", { token: teacher })).body as { items: { type: string }[] }).items[0]).toMatchObject({ type: "school_staff" });
    expect(((await call("GET", "/me/notifications", { token: student })).body as { items: unknown[] }).items).toEqual([]);
    void mona;
    void samir;
  });
});
