import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type UniMeeting } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import { schoolSettingsOf } from "@/lib/school/settings";
import { parseCourseForm, parseCoursesCsv, parseSectionForm, parseTermForm, parseUniStudentsCsv, parseScaleText } from "@/lib/university/forms";
import { academicRecord, uniData } from "@/lib/university/records";
import {
  checkAdd,
  creditLimits,
  DEFAULT_SCALE,
  gpaOf,
  letterFor,
  meetingsClash,
  missingPrerequisites,
  passedCodes,
  registrationPhase,
  seatsLeft,
  standingOf,
  studyPlan,
} from "@/lib/university/rules";
import { currentTerm, registrationTerm, uniSettingsOf } from "@/lib/university/settings";
import { loadTranscript, readTranscriptCode, renderTranscriptPdf, transcriptCode } from "@/lib/university/transcript";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const at = (weekday: number, start: string, end: string): UniMeeting => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return { weekday, startMinute: m(start), endMinute: m(end), room: null };
};

describe("113.9 a university's rules", () => {
  const scale = DEFAULT_SCALE;

  it("turns percents into letters and works out the credit-weighted GPA", () => {
    expect(letterFor(scale, 92)).toBe("A");
    expect(letterFor(scale, 87)).toBe("A-");
    expect(letterFor(scale, 59.5)).toBe("D");
    expect(letterFor(scale, 12)).toBe("F");
    // (4 × 3 + 3 × 4 + 0 × 2) / 9; a withdrawal doesn't count.
    expect(gpaOf([{ credits: 3, grade: "A" }, { credits: 4, grade: "B" }, { credits: 2, grade: "F" }, { credits: 3, grade: "W" }], scale)).toBe(2.67);
    expect(gpaOf([{ credits: 3, grade: "W" }], scale)).toBeNull();
    expect(gpaOf([], scale)).toBeNull();
  });

  it("counts a course taken again once, by its latest grade", () => {
    const rows = [
      { courseId: 1, credits: 3, grade: "F", termStartsOn: "2025-09-01", code: "CS101" },
      { courseId: 1, credits: 3, grade: "B", termStartsOn: "2026-02-01", code: "CS101" },
      { courseId: 2, credits: 4, grade: "A", termStartsOn: "2025-09-01", code: "MA101" },
    ];
    expect(standingOf(rows, scale)).toEqual({ gpa: 3.57, creditsEarned: 7, creditsAttempted: 7 });
    expect([...passedCodes(rows, scale)].sort()).toEqual(["CS101", "MA101"]);
    expect([...passedCodes(rows.slice(0, 1), scale)]).toEqual([]);
  });

  it("finds lectures that clash and prerequisites not passed", () => {
    expect(meetingsClash([at(1, "09:00", "10:30")], [at(1, "10:00", "11:00")])).toBe(true);
    // Back to back, or another day, isn't a clash.
    expect(meetingsClash([at(1, "09:00", "10:30")], [at(1, "10:30", "12:00")])).toBe(false);
    expect(meetingsClash([at(1, "09:00", "10:30")], [at(2, "09:00", "10:30")])).toBe(false);
    expect(missingPrerequisites({ prerequisites: ["CS101", "ma101"] }, new Set(["CS101"]))).toEqual(["ma101"]);
  });

  it("checks a section before it is added: the same course, clashes, prerequisites, credits and seats", () => {
    const cs201 = { id: 2, code: "CS201", credits: 3, prerequisites: ["CS101"] };
    const held = [{ section: { id: 10, code: "01", meetings: [at(1, "09:00", "10:30")] }, course: { id: 5, code: "PH101", credits: 6 } }];
    const base = { section: { id: 20, meetings: [at(2, "09:00", "10:30")], seats: 30 }, course: cs201, held, passed: new Set(["CS101"]), maxCredits: 12, taken: 3, waitlistOn: true };
    expect(checkAdd(base)).toEqual({ problems: [], waitlist: false });
    expect(checkAdd({ ...base, section: { ...base.section, meetings: [at(1, "10:00", "11:00")] } }).problems).toEqual([{ code: "clash", detail: "PH101-01" }]);
    expect(checkAdd({ ...base, passed: new Set() }).problems).toEqual([{ code: "prerequisites", detail: "CS101" }]);
    expect(checkAdd({ ...base, maxCredits: 8 }).problems).toEqual([{ code: "credits", detail: "8" }]);
    // Full: the waiting list when nothing else is in the way, else full.
    expect(checkAdd({ ...base, taken: 30 })).toEqual({ problems: [], waitlist: true });
    expect(checkAdd({ ...base, taken: 30, waitlistOn: false }).problems).toEqual([{ code: "full", detail: "" }]);
    expect(checkAdd({ ...base, held: [...held, { section: { id: 21, code: "02", meetings: [] }, course: { id: 2, code: "CS201", credits: 3 } }] }).problems[0]).toEqual({ code: "taken", detail: "CS201-02" });
    expect(seatsLeft({ seats: 2 }, 5)).toBe(0);
    expect(creditLimits(null)).toEqual({ min: 0, max: 30 });
    expect(creditLimits({ minTermCredits: 12, maxTermCredits: 18 })).toEqual({ min: 12, max: 18 });
  });

  it("knows where registration is, which term is current, and the study plan", () => {
    const term = { id: 1, registrationOpens: "2026-10-01", registrationCloses: "2026-10-20", dropUntil: "2026-11-01", startsOn: "2027-02-01", endsOn: "2027-06-01" };
    expect(["2026-09-30", "2026-10-01", "2026-10-21", "2026-11-02"].map((d) => registrationPhase(term, d))).toEqual(["before", "open", "drop", "closed"]);
    const fall = { ...term, id: 2, startsOn: "2026-09-01", endsOn: "2027-01-15", registrationOpens: "2026-08-01", registrationCloses: "2026-08-20", dropUntil: "2026-09-15" } as never;
    const spring = { ...term, appId: "a", name: "Spring", academicYear: "2026/2027", createdAt: NOW } as never;
    expect(currentTerm([spring, fall], { currentTermId: null }, "2026-10-12")).toBe(fall);
    expect(registrationTerm([spring, fall], { currentTermId: null }, "2026-10-12")).toBe(spring);
    expect(currentTerm([spring, fall], { currentTermId: 1 }, "2026-10-12")).toBe(spring);
    const courses = new Map([
      [1, { id: 1, code: "CS101", title: "Programming", credits: 3 }],
      [2, { id: 2, code: "CS201", title: "Data structures", credits: 3 }],
      [3, { id: 3, code: "MA101", title: "Calculus", credits: 4 }],
    ]);
    const plan = studyPlan(
      {
        creditsRequired: 120,
        plan: [
          { courseId: 2, year: 1, required: true },
          { courseId: 1, year: 1, required: true },
          { courseId: 3, year: 2, required: false },
          { courseId: 99, year: 2, required: true },
        ],
      },
      courses,
      { passed: new Set(["CS101"]), inProgress: new Set([2]), grades: new Map([[1, "A"]]) },
    );
    expect(plan.rows.map((r) => [r.course.code, r.status, r.grade])).toEqual([
      ["CS101", "done", "A"],
      ["CS201", "in_progress", null],
      ["MA101", "left", null],
    ]);
    expect(plan.credits).toEqual({ required: 120, done: 3, inProgress: 3, left: 4 });
  });

  it("reads the dashboard's forms and sheets", () => {
    expect(parseCourseForm({ code: " cs201 ", title: "Data structures", credits: "3", departmentId: "", prerequisites: "cs101, MA101" }, [])).toEqual({
      ok: true,
      value: { code: "CS201", title: "Data structures", credits: 3, departmentId: null, prerequisites: ["CS101", "MA101"], description: "" },
    });
    expect(parseCourseForm({ code: "CS201", title: "", credits: "0", prerequisites: "CS201" }, [])).toMatchObject({ ok: false, errors: { title: expect.any(String), credits: expect.any(String), prerequisites: expect.any(String) } });
    expect(parseTermForm({ name: "Spring 2027", academicYear: "2026/2027", startsOn: "2027-02-01", endsOn: "2027-06-01", registrationOpens: "2026-10-20", registrationCloses: "2026-10-01", dropUntil: "2026-11-01" })).toMatchObject({
      ok: false,
      errors: { registrationCloses: expect.any(String) },
    });
    expect(parseSectionForm({ courseId: "1", code: "01", seats: "40", lecturerId: "", meetings: "1 09:00-10:30 B2\n3 09:00-10:30" }, [1], [])).toEqual({
      ok: true,
      value: { courseId: 1, code: "01", seats: 40, lecturerId: null, meetings: [{ ...at(1, "09:00", "10:30"), room: "B2" }, at(3, "09:00", "10:30")] },
    });
    expect(parseSectionForm({ courseId: "1", code: "01", seats: "40", meetings: "8 09:00-10:30" }, [1], [])).toMatchObject({ ok: false, errors: { meetings: expect.any(String) } });
    expect(parseScaleText("A 4 90\nB 3 80\nF 0 0\nW 0 - nogpa")).toEqual({
      ok: true,
      value: [
        { letter: "A", points: 4, minPercent: 90, gpa: true, passes: true },
        { letter: "B", points: 3, minPercent: 80, gpa: true, passes: true },
        { letter: "F", points: 0, minPercent: 0, gpa: true, passes: false },
        { letter: "W", points: 0, minPercent: null, gpa: false, passes: false },
      ],
    });
    const courses = parseCoursesCsv("code,title,credits,department,prerequisites\nCS101,Programming,3,CS,\nCS201,Data structures,3,CS,CS101\n,No code,3,,\n");
    if (!courses.ok) throw new Error(courses.message);
    expect(courses.rows.map((r) => [r.line, r.code, r.credits, r.department, r.prerequisites])).toEqual([
      [2, "CS101", 3, "CS", []],
      [3, "CS201", 3, "CS", ["CS101"]],
    ]);
    expect(courses.problems).toEqual(["Line 4: give the course a code, a title and its credits."]);
    const students = parseUniStudentsCsv("code,program,advisor,start_year\n1023,CS,+201110000000,2025/2026\n");
    if (!students.ok) throw new Error(students.message);
    expect(students.rows).toEqual([{ line: 2, code: "1023", program: "CS", advisor: "+201110000000", startYear: "2025/2026" }]);
  });
});

describe("113.9 a university on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan = PLAN_INFO.pro;
  const ids: Record<string, number> = {};

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "school");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile University",
      websiteDoneAt: NOW,
      connector: { kind: "school" },
      timeZone: "Africa/Cairo",
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" },
    };
    await store.createApp(app);
    const person = async (role: "student" | "parent" | "teacher", name: string, phone: string, code: string | null = null) => {
      const made = await store.createSchoolPerson({ appId: app.id, role, name, phone, email: null, classId: null, code, photoAssetId: null, active: true }, NOW);
      if (!made.ok) throw new Error("duplicate");
      return made.person.id;
    };
    ids.mona = await person("teacher", "Mona Adel", "+201110000000");
    ids.karim = await person("teacher", "Karim Saleh", "+201110000001");
    ids.omar = await person("student", "Omar Hassan", "+201001000001", "1023");
    ids.laila = await person("student", "Laila Hassan", "+201001000002", "1024");
    ids.parent = await person("parent", "Hassan Ali", "+201001000009");
    await store.setSchoolChildren(app.id, ids.parent, [ids.omar]);
    await store.saveSchoolSettings(app.id, schoolSettingsOf(null, app));
    await store.saveUniSettings(app.id, { ...uniSettingsOf(null), enabled: true }, NOW);
    const faculty = (await store.saveUniFaculty({ appId: app.id, id: null, name: "Engineering", code: "ENG" }, NOW))!;
    const dept = (await store.saveUniDepartment({ appId: app.id, id: null, facultyId: faculty.id, name: "Computer Science", code: "CS" }, NOW))!;
    const course = async (code: string, credits: number, prerequisites: string[] = []) => {
      const made = await store.saveUniCourse({ appId: app.id, id: null, departmentId: dept.id, code, title: `${code} title`, credits, prerequisites, description: "" }, NOW);
      if (!made.ok) throw new Error("course");
      return made.course.id;
    };
    ids.cs101 = await course("CS101", 3);
    ids.cs201 = await course("CS201", 3, ["CS101"]);
    ids.cs301 = await course("CS301", 3, ["CS201"]);
    ids.ma101 = await course("MA101", 4);
    ids.ph101 = await course("PH101", 3);
    const program = (await store.saveUniProgram(
      {
        appId: app.id,
        id: null,
        departmentId: dept.id,
        name: "Computer Science",
        code: "BCS",
        degree: "BSc",
        creditsRequired: 120,
        years: 4,
        minTermCredits: 6,
        maxTermCredits: 10,
        plan: [
          { courseId: ids.cs101, year: 1, required: true },
          { courseId: ids.cs201, year: 1, required: true },
          { courseId: ids.ma101, year: 1, required: true },
        ],
      },
      NOW,
    ))!;
    await store.saveUniStudent({ appId: app.id, studentId: ids.omar, programId: program.id, advisorId: ids.mona, startYear: "2025/2026", updatedAt: NOW });
    await store.saveUniStudent({ appId: app.id, studentId: ids.laila, programId: program.id, advisorId: ids.karim, startYear: "2025/2026", updatedAt: NOW });
    const term = async (name: string, startsOn: string, endsOn: string, opens: string, closes: string, drop: string) =>
      (await store.saveUniTerm({ appId: app.id, id: null, name, academicYear: "2026/2027", startsOn, endsOn, registrationOpens: opens, registrationCloses: closes, dropUntil: drop }, NOW))!.id;
    ids.fall = await term("Fall 2025", "2025-09-01", "2026-01-15", "2025-08-01", "2025-08-20", "2025-09-15");
    ids.spring = await term("Spring 2027", "2027-02-01", "2027-06-01", "2026-10-01", "2026-10-20", "2026-11-01");
    const section = async (termId: number, courseId: number, code: string, seats: number, meetings: UniMeeting[], lecturerId: number | null = ids.karim) =>
      (await store.saveUniSection({ appId: app.id, id: null, termId, courseId, code, lecturerId, seats, meetings, resultsPublishedAt: null }, NOW))!.id;
    // Omar passed CS101 last year (published).
    ids.oldCs101 = await section(ids.fall, ids.cs101, "01", 40, [at(1, "09:00", "10:30")]);
    const past = (await store.createUniEnrolment({ appId: app.id, termId: ids.fall, sectionId: ids.oldCs101, courseId: ids.cs101, studentId: ids.omar, status: "enrolled", addedBy: "student", addedAt: NOW, droppedAt: null, grade: "B+", mark: null, gradedAt: NOW, updatedAt: NOW }))!;
    void past;
    const old = (await store.getUniSection(app.id, ids.oldCs101))!;
    await store.saveUniSection({ ...old, resultsPublishedAt: NOW }, NOW);
    ids.cs201s = await section(ids.spring, ids.cs201, "01", 30, [at(1, "09:00", "10:30"), at(3, "09:00", "10:30")], ids.mona);
    ids.cs301s = await section(ids.spring, ids.cs301, "01", 30, [at(2, "09:00", "10:30")]);
    ids.ma101s = await section(ids.spring, ids.ma101, "01", 1, [at(2, "12:00", "14:00")]);
    ids.ph101s = await section(ids.spring, ids.ph101, "01", 30, [at(1, "10:00", "11:00")]);
    sender = new LogSender();
    now = NOW;
    plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school", "university"] };
  });

  const context = async (): Promise<HostedContext> => {
    const fresh = (await store.getAppById(app.id))!;
    return { store, app: fresh, active: true, plan, now, ip: "203.0.113.9", secret: "test-hosted-secret", sender, push: false, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", connector: null };
  };

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: (string | number)[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, String(param));
    const result = await handleHosted(await context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const device = { id: `install-${phone}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device } });
    const registered = await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name, device } });
    return (registered.body as { access_token: string }).access_token;
  }

  const REG = "/school/students/{student_id}/university/registration";

  it("says in Config.school whether the school is a university, with the plan feature", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { school: { university: boolean } };
    expect(config.school.university).toBe(true);
    plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
    expect(((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { school: { university: boolean } }).school.university).toBe(false);
    const omar = await signUp("1001000001", "Omar");
    expect((await call("GET", "/school/students/{student_id}/university", { params: [ids.omar], token: omar })).body).toMatchObject({ code: "not_university" });
  });

  it("a student registers, the advisor sends it back and approves it, a seat opens from the waiting list", async () => {
    const omar = await signUp("1001000001", "Omar");
    const overview = (await call("GET", "/school/students/{student_id}/university", { params: [ids.omar], token: omar })).body;
    expect(overview).toMatchObject({
      program: { name: "Computer Science", degree: "BSc", department: "Computer Science", faculty: "Engineering", min_term_credits: 6, max_term_credits: 10 },
      advisor: { name: "Mona Adel" },
      gpa: 3.3,
      credits_earned: 3,
      current_term: { name: "Spring 2027" },
      registration: { term: { name: "Spring 2027" }, status: "draft", phase: "open", credits: 0 },
    });
    const reg = (await call("GET", REG, { params: [ids.omar], token: omar })).body as { offered: { id: number; can_add: boolean; problems: { code: string }[]; seats_left: number }[] };
    const offered = new Map(reg.offered.map((o) => [o.id, o]));
    expect(offered.get(ids.cs201s)).toMatchObject({ can_add: true, seats_left: 30 });
    expect(offered.get(ids.cs301s)!.problems.map((p) => p.code)).toEqual(["prerequisites"]);

    // Laila takes the last seat of MA101.
    const laila = await signUp("1001000002", "Laila");
    expect((await call("POST", `${REG}/sections`, { params: [ids.laila], token: laila, body: { section_id: ids.ma101s } })).status).toBe(200);

    const added = (await call("POST", `${REG}/sections`, { params: [ids.omar], token: omar, body: { section_id: ids.cs201s } })).body as { mine: { status: string }[]; credits: { taken: number } };
    expect(added.mine.map((m) => m.status)).toEqual(["pending"]);
    expect(added.credits.taken).toBe(3);
    const clash = await call("POST", `${REG}/sections`, { params: [ids.omar], token: omar, body: { section_id: ids.ph101s } });
    expect(clash.body).toMatchObject({ code: "not_allowed_clash", message: "Its lectures are at the same time as CS201-01." });
    expect((await call("POST", `${REG}/sections`, { params: [ids.omar], token: omar, body: { section_id: ids.cs301s } })).body).toMatchObject({ code: "not_allowed_prerequisites" });
    // MA101 is full: the waiting list.
    const waiting = (await call("POST", `${REG}/sections`, { params: [ids.omar], token: omar, body: { section_id: ids.ma101s } })).body as { mine: { status: string; section: { id: number } }[] };
    expect(waiting.mine.find((m) => m.section.id === ids.ma101s)?.status).toBe("waitlisted");

    // A parent sees it but doesn't change it.
    const dad = await signUp("1001000009", "Hassan");
    expect((await call("GET", REG, { params: [ids.omar], token: dad })).status).toBe(200);
    expect((await call("POST", `${REG}/sections`, { params: [ids.omar], token: dad, body: { section_id: ids.cs301s } })).status).toBe(403);

    // 3 credits: fewer than the program's 6.
    expect((await call("POST", `${REG}/submit`, { params: [ids.omar], token: omar })).body).toMatchObject({ code: "credits_low" });
    await store.saveUniProgram({ ...(await store.listUniPrograms(app.id))[0]!, minTermCredits: 3 }, NOW);
    expect((await call("POST", `${REG}/submit`, { params: [ids.omar], token: omar })).body).toMatchObject({ status: "submitted", can_add: false });
    expect((await call("POST", `${REG}/sections`, { params: [ids.omar], token: omar, body: { section_id: ids.cs301s } })).body).toMatchObject({ code: "waiting_for_advisor" });

    // Mona, his advisor, sends it back, then approves it; Karim isn't his advisor.
    const mona = await signUp("1110000000", "Mona");
    const karim = await signUp("1110000001", "Karim");
    expect((await call("GET", "/classroom/university/advisees/{student_id}", { params: [ids.omar], token: karim })).status).toBe(404);
    const list = (await call("GET", "/classroom/university/advisees", { token: mona })).body as { items: { student: { id: number }; status: string; credits: number }[] };
    expect(list.items).toMatchObject([{ student: { id: ids.omar }, status: "submitted", credits: 3 }]);
    const back = await call("POST", "/classroom/university/advisees/{student_id}/return", { params: [ids.omar], token: mona, body: { note: "Add a mathematics course." } });
    expect(back.body).toMatchObject({ status: "returned", note: "Add a mathematics course.", can_decide: false });
    expect((await call("GET", REG, { params: [ids.omar], token: omar })).body).toMatchObject({ status: "returned", note: "Add a mathematics course.", can_add: true });
    await call("POST", `${REG}/submit`, { params: [ids.omar], token: omar });
    const approved = (await call("POST", "/classroom/university/advisees/{student_id}/approve", { params: [ids.omar], token: mona })).body as { status: string; sections: { status: string }[] };
    expect(approved.status).toBe("approved");
    expect(approved.sections.map((s) => s.status).sort()).toEqual(["enrolled", "waitlisted"]);

    // Laila drops MA101: Omar takes the seat, waiting for his advisor again.
    expect((await call("DELETE", `${REG}/sections/{section_id}`, { params: [ids.laila, ids.ma101s], token: laila })).status).toBe(200);
    const after = (await call("GET", REG, { params: [ids.omar], token: omar })).body as { status: string; mine: { status: string; section: { id: number } }[] };
    expect(after.mine.find((m) => m.section.id === ids.ma101s)?.status).toBe("pending");
    expect(after.status).toBe("submitted");

    // His week in Spring 2027.
    const week = (await call("GET", "/school/students/{student_id}/university/timetable", { params: [ids.omar], token: omar, query: { term_id: String(ids.spring) } })).body as { days: { weekday: number; lectures: { course_code: string }[] }[] };
    expect(week.days.map((d) => [d.weekday, d.lectures.map((l) => l.course_code)])).toEqual([
      [1, ["CS201"]],
      [2, ["MA101"]],
      [3, ["CS201"]],
    ]);
  });

  it("a lecturer takes attendance, grades and publishes; the student's results, transcript and study plan follow", async () => {
    // Omar is enrolled in CS201 by the office.
    const data = await uniData(store, app.id);
    const { addSection } = await import("@/lib/university/flow");
    const omarPerson = (await store.getSchoolPerson(app.id, ids.omar))!;
    const spring = data.termById.get(ids.spring)!;
    const added = await addSection({ store, app, now: NOW, data }, { record: await academicRecord(store, data, omarPerson), term: spring, section: (await store.getUniSection(app.id, ids.cs201s))!, by: "office", today: "2026-10-12" });
    expect(added).toMatchObject({ ok: true, value: { status: "enrolled" } });

    const mona = await signUp("1110000000", "Mona");
    const home = (await call("GET", "/classroom/university", { token: mona, query: { term_id: String(ids.spring) } })).body as { sections: { id: number; students: number }[] };
    expect(home.sections).toMatchObject([{ id: ids.cs201s, students: 1 }]);
    // Not her section.
    expect((await call("GET", "/classroom/university/sections/{section_id}", { params: [ids.cs301s], token: mona })).status).toBe(404);
    const taken = await call("PUT", "/classroom/university/sections/{section_id}/attendance", { params: [ids.cs201s], token: mona, body: { date: "2026-10-12", items: [{ student_id: ids.omar, status: "late" }] } });
    expect(taken.body).toMatchObject({ date: "2026-10-12", students: [{ student: { id: ids.omar }, status: "late" }] });
    expect((await call("PUT", "/classroom/university/sections/{section_id}/attendance", { params: [ids.cs201s], token: mona, body: { date: "2026-10-13", items: [] } })).body).toMatchObject({ code: "date_out_of_range" });

    expect((await call("POST", "/classroom/university/sections/{section_id}/publish", { params: [ids.cs201s], token: mona })).body).toMatchObject({ code: "nothing_graded" });
    expect((await call("PUT", "/classroom/university/sections/{section_id}/grades", { params: [ids.cs201s], token: mona, body: { items: [{ student_id: ids.omar, grade: "Z" }] } })).status).toBe(400);
    const graded = (await call("PUT", "/classroom/university/sections/{section_id}/grades", { params: [ids.cs201s], token: mona, body: { items: [{ student_id: ids.omar, mark: 87 }] } })).body;
    expect(graded).toMatchObject({ students: [{ grade: "A-", mark: 87 }], results_published_at: null });

    const omar = await signUp("1001000001", "Omar");
    // Not published yet: only last year's B+.
    expect((await call("GET", "/school/students/{student_id}/university/results", { params: [ids.omar], token: omar })).body).toMatchObject({ gpa: 3.3, terms: [{ term: { name: "Fall 2025" } }] });
    expect((await call("POST", "/classroom/university/sections/{section_id}/publish", { params: [ids.cs201s], token: mona })).body).toMatchObject({ results_published_at: expect.any(String) });
    const results = (await call("GET", "/school/students/{student_id}/university/results", { params: [ids.omar], token: omar })).body;
    expect(results).toMatchObject({
      gpa: 3.5,
      credits_earned: 6,
      credits_required: 120,
      terms: [
        { term: { name: "Spring 2027" }, gpa: 3.7, credits: 3, courses: [{ course_code: "CS201", grade: "A-", points: 3.7, passed: true }] },
        { term: { name: "Fall 2025" }, gpa: 3.3 },
      ],
    });
    const plan = (await call("GET", "/school/students/{student_id}/university/plan", { params: [ids.omar], token: omar })).body as { credits: unknown; years: { courses: { course_code: string; status: string }[] }[] };
    expect(plan.credits).toEqual({ required: 120, done: 6, in_progress: 0, left: 4 });
    expect(plan.years[0]!.courses.map((c) => [c.course_code, c.status])).toEqual([
      ["CS101", "done"],
      ["CS201", "done"],
      ["MA101", "left"],
    ]);

    const transcript = (await call("GET", "/school/students/{student_id}/university/transcript", { params: [ids.omar], token: omar })).body as { pdf_url: string; student: { name: string } };
    expect(transcript.student.name).toBe("Omar Hassan");
    const code = transcript.pdf_url.split("/transcript/")[1]!.replace(/\/pdf$/, "");
    expect(readTranscriptCode("test-hosted-secret", app.id, code, now)).toBe(ids.omar);
    expect(readTranscriptCode("another-secret", app.id, code, now)).toBeNull();
    expect(readTranscriptCode("test-hosted-secret", app.id, code, new Date(now.getTime() + 2 * 3600_000))).toBeNull();
    expect(readTranscriptCode("test-hosted-secret", app.id, transcriptCode("test-hosted-secret", app.id, ids.laila, now), now)).toBe(ids.laila);
    const found = await loadTranscript(store, "test-hosted-secret", app.id, code, now);
    expect(found?.record.standing.gpa).toBe(3.5);
    for (const lang of ["en", "ar", "tr"] as const) {
      const pdf = await renderTranscriptPdf({ lang, school: lang === "ar" ? "جامعة النيل" : "Nile University", accent: "#0E0D24", logo: null, now, found: found! });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    }
  });
});
