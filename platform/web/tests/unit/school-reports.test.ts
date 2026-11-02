import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type SchoolReport, type SchoolReportField, type SchoolSyllabusTopic, type SchoolSyllabusUnit, type User } from "@/lib/data/types";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { pushSchoolReportSent } from "@/lib/school/report-notify";
import { schoolSettingsOf } from "@/lib/school/settings";
import { parseSyllabusCsv, plannedDays, schoolGrades, subjectProgress, syllabusGradeOf } from "@/lib/school/syllabus";
import { checkAnswers, moveField, nextFieldId, parseFieldForm, parseTemplateForm, reviewReport, sendReport, shareReport, suggestedTemplate } from "@/lib/school/teacher-reports";
import { expectContract } from "./contract";
import { days, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

describe("113.5 the syllabus and the class's progress", () => {
  const unit = (id: number, position: number): SchoolSyllabusUnit => ({ id, appId: "a", subjectId: 1, grade: "Grade 5", title: `Unit ${id}`, position, createdAt: NOW, updatedAt: NOW });
  const topic = (id: number, unitId: number, startsOn: string, endsOn: string, position = id): SchoolSyllabusTopic => ({ id, appId: "a", unitId, title: `Topic ${id}`, startsOn, endsOn, position, createdAt: NOW, updatedAt: NOW });
  const units = [unit(2, 2), unit(1, 1)];
  const topics = [topic(10, 1, "2026-09-27", "2026-10-01"), topic(11, 1, "2026-10-04", "2026-10-08"), topic(12, 2, "2026-10-11", "2026-10-15"), topic(13, 2, "2026-10-18", "2026-10-22")];

  it("says where the plan is and whether the class is behind, on plan or ahead", () => {
    const behind = subjectProgress({ id: 1, name: "Mathematics" }, units, topics, [{ appId: "a", classId: 5, topicId: 10, coveredOn: "2026-09-30", note: null, teacherId: null, updatedAt: NOW }], "2026-10-12");
    expect(behind.units.map((u) => [u.unit.id, u.topics.map((t) => t.topic.id)])).toEqual([
      [1, [10, 11]],
      [2, [12, 13]],
    ]);
    expect(behind).toMatchObject({ total: 4, covered: 1, due: 2, percent: 25, plannedPercent: 50, behindBy: 1, status: "behind", planned: { id: 12 }, lastCovered: { topic: { id: 10 }, coveredOn: "2026-09-30" } });
    expect(behind.units[1]!.topics[0]).toMatchObject({ due: false, now: true });
    const covered = (ids: number[]) => ids.map((topicId) => ({ appId: "a", classId: 5, topicId, coveredOn: "2026-10-12", note: null, teacherId: null, updatedAt: NOW }));
    expect(subjectProgress({ id: 1, name: "M" }, units, topics, covered([10, 11]), "2026-10-12")).toMatchObject({ status: "on_plan", behindBy: 0 });
    expect(subjectProgress({ id: 1, name: "M" }, units, topics, covered([10, 11, 12]), "2026-10-12")).toMatchObject({ status: "ahead", percent: 75 });
    // After the last day of the year's plan, nothing is "now": the next one is none.
    expect(subjectProgress({ id: 1, name: "M" }, units, topics, [], "2026-12-01")).toMatchObject({ planned: null, due: 4, behindBy: 4 });
  });

  it("follows the class's grade, else its name; checks planned days", () => {
    expect(syllabusGradeOf({ grade: " Grade 5 ", name: "5 A" })).toBe("Grade 5");
    expect(syllabusGradeOf({ grade: null, name: "KG 1" })).toBe("KG 1");
    expect(schoolGrades([{ grade: "Grade 5", name: "5 A" }, { grade: "Grade 5", name: "5 B" }, { grade: null, name: "KG 1" }])).toEqual(["Grade 5", "KG 1"]);
    expect(plannedDays("2026-10-04", "2026-10-08")).toEqual({ startsOn: "2026-10-04", endsOn: "2026-10-08" });
    expect(plannedDays("2026-10-08", "2026-10-04")).toBeNull();
    expect(plannedDays("2026-10-04", "2028-10-04")).toBeNull();
  });

  it("reads a syllabus sheet with from and to, or a week", () => {
    const parsed = parseSyllabusCsv(
      "Grade,Subject,Unit,Topic,From,To,Week\nGrade 5,Mathematics,Fractions,Adding fractions,2026-10-04,2026-10-08,\nGrade 5,Mathematics,Fractions,Subtracting,,,2026-10-11\nGrade 5,,Fractions,Oops,2026-10-04,2026-10-08,\nGrade 5,Science,Plants,Leaves,2026-10-08,2026-10-04,",
    );
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.rows.map((r) => [r.line, r.unit, r.topic, r.startsOn, r.endsOn])).toEqual([
      [2, "Fractions", "Adding fractions", "2026-10-04", "2026-10-08"],
      [3, "Fractions", "Subtracting", "2026-10-11", "2026-10-17"],
    ]);
    expect(parsed.problems).toEqual(["Line 4: give the grade, the subject, the unit and the topic.", "Line 5: give the days as dates like 2026-10-04, the first not after the last."]);
    expect(parseSyllabusCsv("grade,subject,topic\nGrade 5,Maths,x")).toEqual({ ok: false, message: "The file needs the columns grade, subject, unit, topic, and from and to (or week)." });
  });
});

describe("113.5 report templates and answers", () => {
  const fields: SchoolReportField[] = [
    { id: "f1", label: "Behaviour", type: "rating", options: [], required: true },
    { id: "f2", label: "Level", type: "choice", options: ["Good", "Needs support"], required: false },
    { id: "f3", label: "Next steps", type: "text", options: [], required: true },
  ];

  it("checks templates and their fields", () => {
    expect(parseTemplateForm({ name: "End of term", kind: "student" })).toEqual({ ok: true, value: { kind: "student", name: "End of term" } });
    expect(parseTemplateForm({ name: "", kind: "school" })).toMatchObject({ ok: false, errors: { name: expect.any(String), kind: "Choose a report on a student or on a class." } });
    expect(parseFieldForm({ label: "Level", type: "choice", options: "Good\nNeeds support\nGood" }, fields)).toEqual({ ok: true, value: { id: "f4", label: "Level", type: "choice", options: ["Good", "Needs support"], required: false } });
    expect(parseFieldForm({ label: "Level", type: "choice", options: "Good" }, fields)).toMatchObject({ ok: false, errors: { options: "Give 2 to 12 choices, one per line." } });
    expect(parseFieldForm({ label: "Behaviour", type: "rating", required: "on" }, [])).toEqual({ ok: true, value: { id: "f1", label: "Behaviour", type: "rating", options: [], required: true } });
    expect(nextFieldId([{ id: "f2" }, { id: "f9" }, { id: "x" }])).toBe("f10");
    expect(moveField(fields, "f2", -1).map((f) => f.id)).toEqual(["f2", "f1", "f3"]);
    expect(moveField(fields, "f1", -1).map((f) => f.id)).toEqual(["f1", "f2", "f3"]);
    const ready = suggestedTemplate("student", { name: "Student report", labels: ["Level", "Behaviour", "Attendance", "Strengths", "Next"] });
    expect(ready.fields.map((f) => [f.id, f.type, f.required])).toEqual([
      ["f1", "rating", true],
      ["f2", "rating", true],
      ["f3", "text", false],
      ["f4", "text", false],
      ["f5", "text", false],
    ]);
  });

  it("keeps a draft's answers and needs the required ones to send", () => {
    expect(checkAnswers(fields, { f1: 4, f2: "Good", f3: " Read more. ", other: "x" }, true)).toEqual({ ok: true, answers: { f1: 4, f2: "Good", f3: "Read more." } });
    expect(checkAnswers(fields, { f1: "", f3: "" }, false)).toEqual({ ok: true, answers: {} });
    expect(checkAnswers(fields, { f1: 6 }, false)).toEqual({ ok: false, message: "“Behaviour” is a rating from 1 to 5." });
    expect(checkAnswers(fields, { f2: "Excellent" }, false)).toEqual({ ok: false, message: "Choose one of the choices of “Level”." });
    expect(checkAnswers(fields, { f1: 3 }, true)).toEqual({ ok: false, message: "Fill in “Next steps” before sending." });
  });
});

describe("113.5 the syllabus and the teachers' reports on the hosted API", () => {
  let store: MemoryStore;
  let owner: User;
  let app: App;
  let sender: LogSender;
  let now: Date;
  const plan: PlanInfo = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
  let classA: number;
  let classB: number;
  let math: number;
  let arabic: number;
  let omar: number;
  let laila: number;
  let mona: number;
  let mathUnit: number;
  let topics: number[];
  let studentTemplate: number;
  let classTemplate: number;

  beforeEach(async () => {
    let client;
    ({ store, client, user: owner } = await setupClient());
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
    classA = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: "Grade 5", homeroomTeacherId: null }, NOW))!.id;
    classB = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 B", grade: "Grade 5", homeroomTeacherId: null }, NOW))!.id;
    const m = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Mathematics" }, NOW);
    const r = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Arabic" }, NOW);
    if (!m.ok || !r.ok) throw new Error("subject");
    math = m.subject.id;
    arabic = r.subject.id;
    omar = await person({ role: "student", name: "Omar Hassan", phone: "+201001000001", classId: classA });
    laila = await person({ role: "student", name: "Laila Hassan", phone: "+201001000002", classId: classB });
    const dad = await person({ role: "parent", name: "Hassan Ali", phone: "+201001000009" });
    await store.setSchoolChildren(app.id, dad, [omar, laila]);
    // Mona teaches mathematics to 5 A only.
    await store.saveSchoolPeriod({ id: null, appId: app.id, classId: classA, subjectId: math, teacherId: mona, weekday: 1, startMinute: 480, endMinute: 525, room: null });
    await store.saveSchoolSettings(app.id, { ...schoolSettingsOf(null, app), term: { name: "First term", startsOn: "2026-09-27", endsOn: "2027-01-20" } });
    // Grade 5's mathematics: two lessons due by 12 October, one this week, one next.
    mathUnit = (await store.saveSchoolSyllabusUnit({ id: null, appId: app.id, subjectId: math, grade: "Grade 5", title: "Fractions" }, NOW))!.id;
    const arabicUnit = (await store.saveSchoolSyllabusUnit({ id: null, appId: app.id, subjectId: arabic, grade: "Grade 5", title: "Reading" }, NOW))!.id;
    topics = [];
    for (const [title, from, to] of [
      ["Halves", "2026-09-27", "2026-10-01"],
      ["Quarters", "2026-10-04", "2026-10-08"],
      ["Adding fractions", "2026-10-11", "2026-10-15"],
      ["Subtracting fractions", "2026-10-18", "2026-10-22"],
    ] as const) {
      topics.push((await store.saveSchoolSyllabusTopic({ id: null, appId: app.id, unitId: mathUnit, title, startsOn: from, endsOn: to }, NOW))!.id);
    }
    await store.saveSchoolSyllabusTopic({ id: null, appId: app.id, unitId: arabicUnit, title: "Short stories", startsOn: "2026-09-27", endsOn: "2026-10-01" }, NOW);
    studentTemplate = (await store.saveSchoolReportTemplate(
      {
        id: null,
        appId: app.id,
        kind: "student",
        name: "End of term report",
        fields: [
          { id: "f1", label: "Academic level", type: "rating", options: [], required: true },
          { id: "f2", label: "Behaviour", type: "choice", options: ["Excellent", "Good", "Needs support"], required: true },
          { id: "f3", label: "What to do next", type: "text", options: [], required: false },
        ],
      },
      NOW,
    ))!.id;
    classTemplate = (await store.saveSchoolReportTemplate({ id: null, appId: app.id, kind: "class", name: "Class summary", fields: [{ id: "f1", label: "Summary", type: "text", options: [], required: true }] }, NOW))!.id;
    sender = new LogSender();
    now = NOW;
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
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return (registered.body as { access_token: string }).access_token;
  }

  it("a teacher marks topics covered; the class is behind the plan until it catches up", async () => {
    const teacher = await signUp("1110000000", "Mona");
    const route = "/classroom/classes/{class_id}/syllabus";
    const first = (await call("GET", route, { params: [String(classA)], token: teacher })).body;
    // Only the subject she teaches there.
    expect(first).toMatchObject({
      class_name: "Grade 5 A",
      grade: "Grade 5",
      today: "2026-10-12",
      subjects: [{ subject: "Mathematics", total: 4, covered: 0, due: 2, percent: 0, planned_percent: 50, behind_by: 2, status: "behind", planned_topic: { title: "Adding fractions" } }],
    });
    expect((first as { subjects: unknown[] }).subjects).toHaveLength(1);
    expect((await call("GET", route, { params: [String(classB)], token: teacher })).status).toBe(404);
    const topicRoute = "/classroom/classes/{class_id}/syllabus/{topic_id}";
    expect((await call("PUT", topicRoute, { params: [String(classA), String(topics[0])], token: teacher, body: { covered_on: "2026-10-13" } })).status).toBe(400);
    const marked = (await call("PUT", topicRoute, { params: [String(classA), String(topics[0])], token: teacher, body: { covered_on: "2026-09-30", note: "With paper folding." } })).body as { subjects: { units: { topics: { covered_on: string | null; note: string | null }[] }[] }[] };
    expect(marked.subjects[0]!.units[0]!.topics[0]).toMatchObject({ covered_on: "2026-09-30", note: "With paper folding.", due: true });
    await call("PUT", topicRoute, { params: [String(classA), String(topics[1])], token: teacher, body: {} });
    const caught = (await call("GET", route, { params: [String(classA)], token: teacher })).body;
    expect(caught).toMatchObject({ subjects: [{ covered: 2, behind_by: 0, status: "on_plan", percent: 50 }] });
    expect((await store.listSchoolTopicProgress(app.id, { classId: classA })).find((p) => p.topicId === topics[1])).toMatchObject({ coveredOn: "2026-10-12", teacherId: mona });
    // Not covered after all.
    const undone = (await call("DELETE", topicRoute, { params: [String(classA), String(topics[1])], token: teacher })).body;
    expect(undone).toMatchObject({ subjects: [{ covered: 1, status: "behind" }] });
    // Arabic isn't hers; a topic of another class's grade isn't there.
    const arabicTopic = (await store.listSchoolSyllabusTopics(app.id)).find((t) => t.title === "Short stories")!;
    expect((await call("PUT", topicRoute, { params: [String(classA), String(arabicTopic.id)], token: teacher, body: {} })).body).toMatchObject({ code: "not_your_class" });
    expect((await call("PUT", topicRoute, { params: [String(classA), "999999"], token: teacher, body: {} })).status).toBe(404);
    // A class of another grade follows another syllabus.
    await store.saveSchoolClass({ appId: app.id, id: classA, name: "Grade 5 A", grade: "Grade 6", homeroomTeacherId: null }, NOW);
    expect((await call("GET", route, { params: [String(classA)], token: teacher })).body).toMatchObject({ grade: "Grade 6", subjects: [] });
  });

  it("a report goes from a draft to the school, back for changes, approved and shared with the parents", async () => {
    const teacher = await signUp("1110000000", "Mona");
    const dad = await signUp("1001000009", "Hassan");
    const student = await signUp("1001000001", "Omar");
    const templates = (await call("GET", "/classroom/report-templates", { token: teacher })).body as { items: { name: string; kind: string }[] };
    expect(templates.items.map((t) => [t.kind, t.name])).toEqual([
      ["class", "Class summary"],
      ["student", "End of term report"],
    ]);
    // Laila isn't in a class she teaches.
    expect((await call("POST", "/classroom/reports", { token: teacher, body: { template_id: studentTemplate, student_id: laila } })).body).toMatchObject({ code: "not_your_class" });
    expect((await call("POST", "/classroom/reports", { token: teacher, body: { template_id: studentTemplate, student_id: omar, answers: { f1: 9 } } })).status).toBe(400);
    const made = await call("POST", "/classroom/reports", { token: teacher, body: { template_id: studentTemplate, student_id: omar, subject_id: math, answers: { f1: 4 } } });
    expect(made.status).toBe(201);
    const draft = made.body as { id: number };
    expect(made.body).toMatchObject({ status: "draft", kind: "student", template_name: "End of term report", student: { id: omar, name: "Omar Hassan" }, class_name: "Grade 5 A", subject: "Mathematics", period: null, answers: { f1: 4 }, comments: [], read: false, shared: false });
    // Behaviour is required.
    expect((await call("POST", "/classroom/reports/{report_id}/send", { params: [String(draft.id)], token: teacher })).body).toMatchObject({ code: "incomplete_report", message: "Fill in “Behaviour” before sending." });
    const edited = await call("PUT", "/classroom/reports/{report_id}", { params: [String(draft.id)], token: teacher, body: { answers: { f1: 4, f2: "Good", f3: "More reading at home." } } });
    expect(edited.body).toMatchObject({ answers: { f1: 4, f2: "Good", f3: "More reading at home." } });
    const sent = await call("POST", "/classroom/reports/{report_id}/send", { params: [String(draft.id)], token: teacher, body: { note: "Ready for the parents' meeting." } });
    expect(sent.body).toMatchObject({ status: "sent", sent_at: expect.any(String), comments: [{ by: "teacher", name: "Mona Adel", text: "Ready for the parents' meeting." }] });
    // With the school now: locked, and not deletable.
    expect((await call("PUT", "/classroom/reports/{report_id}", { params: [String(draft.id)], token: teacher, body: { answers: {} } })).body).toMatchObject({ code: "report_sent" });
    expect((await call("DELETE", "/classroom/reports/{report_id}", { params: [String(draft.id)], token: teacher })).body).toMatchObject({ code: "report_sent" });

    // The administration sends it back, with what to change; the teacher is told.
    const deps = { store, app, now: days(1) };
    const report = (await store.getSchoolReport(app.id, draft.id))!;
    expect(await reviewReport(deps, report, "return", "", "Nile School")).toBeNull();
    const back = (await reviewReport(deps, report, "return", "Say which pages to read.", "Nile School"))!;
    expect(back).toMatchObject({ status: "returned", readAt: days(1), reviewedAt: days(1) });
    const told = (await call("GET", "/me/notifications", { token: teacher })).body as { items: { type: string; title: string; report_id?: number }[] };
    expect(told.items[0]).toMatchObject({ type: "school_report", title: "Your report was sent back", report_id: draft.id });
    const seen = (await call("GET", "/classroom/reports/{report_id}", { params: [String(draft.id)], token: teacher })).body;
    expect(seen).toMatchObject({ status: "returned", read: true, comments: [{ by: "teacher" }, { by: "school", name: "Nile School", text: "Say which pages to read." }] });
    expect(((await call("GET", "/classroom/reports", { token: teacher, query: { status: "returned" } })).body as { items: unknown[] }).items).toHaveLength(1);
    // Changed and sent again; approved; shared with the parents (not the student).
    await call("PUT", "/classroom/reports/{report_id}", { params: [String(draft.id)], token: teacher, body: { answers: { f1: 4, f2: "Good", f3: "Pages 10 to 20 at home." } } });
    await call("POST", "/classroom/reports/{report_id}/send", { params: [String(draft.id)], token: teacher });
    const again = (await store.getSchoolReport(app.id, draft.id))!;
    expect(again).toMatchObject({ status: "sent", readAt: null });
    expect(await shareReport(deps, again, true)).toBeNull();
    const approved = (await reviewReport(deps, again, "approve", "", "Nile School"))!;
    expect(approved.status).toBe("approved");
    expect(((await call("GET", "/school/students/{student_id}/reports", { params: [String(omar)], token: dad })).body as { items: unknown[] }).items).toEqual([]);
    const shared = (await shareReport(deps, approved, true))!;
    expect(shared.sharedAt).toEqual(days(1));
    const forDad = (await call("GET", "/school/students/{student_id}/reports", { params: [String(omar)], token: dad })).body;
    expect(forDad).toMatchObject({ items: [{ id: draft.id, title: "End of term report", teacher_name: "Mona Adel", subject: "Mathematics", answers: { f3: "Pages 10 to 20 at home." }, fields: [{ id: "f1" }, { id: "f2" }, { id: "f3" }] }] });
    expect(JSON.stringify(forDad)).not.toContain("Say which pages");
    expect(((await call("GET", "/me/notifications", { token: dad })).body as { items: { type: string; report_id?: number; student_id?: number }[] }).items[0]).toMatchObject({ type: "school_report_shared", report_id: draft.id, student_id: omar });
    expect((await call("GET", "/school/students/{student_id}/reports", { params: [String(omar)], token: student })).body).toMatchObject({ code: "not_parent" });
    // A student's history for the teacher.
    expect(((await call("GET", "/classroom/reports", { token: teacher, query: { student_id: String(omar) } })).body as { items: { id: number; shared: boolean }[] }).items).toEqual([expect.objectContaining({ id: draft.id, shared: true })]);
    // Sent back after it was shared: no longer shared.
    expect((await reviewReport(deps, shared, "return", "One more change.", "Nile School"))!.sharedAt).toBeNull();
  });

  it("a class report covers the term by default; only drafts are deleted; another teacher's reports aren't there", async () => {
    const teacher = await signUp("1110000000", "Mona");
    expect((await call("POST", "/classroom/reports", { token: teacher, body: { template_id: classTemplate, class_id: classB } })).body).toMatchObject({ code: "not_your_class" });
    const made = (await call("POST", "/classroom/reports", { token: teacher, body: { template_id: classTemplate, class_id: classA, answers: { f1: "A good start." } } })).body as { id: number };
    expect(made).toMatchObject({ kind: "class", student: null, class_id: classA, period: { from: "2026-09-27", to: "2027-01-20" } });
    expect((await call("POST", "/classroom/reports", { token: teacher, body: { template_id: classTemplate, class_id: classA, period_from: "2026-10-10", period_to: "2026-10-01" } })).status).toBe(400);
    const theirs = await store.createSchoolReport({ ...(await store.getSchoolReport(app.id, made.id))!, teacherId: null, teacherName: "Someone else" } as Omit<SchoolReport, "id">);
    expect((await call("GET", "/classroom/reports/{report_id}", { params: [String(theirs.id)], token: teacher })).status).toBe(404);
    expect((await call("DELETE", "/classroom/reports/{report_id}", { params: [String(made.id)], token: teacher })).status).toBe(204);
    expect(await store.getSchoolReport(app.id, made.id)).toBeNull();
  });

  it("tells the administration on Yallapp Business when a report is sent", async () => {
    const ACCOUNT: ServiceAccount = { project_id: "yallapp-business", client_email: "push@yallapp-business.test", private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" };
    const sent: { title: string; body: string; data: Record<string, string> }[] = [];
    const send = (async (_account, targets, message) => {
      sent.push(message);
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush;
    await store.createOwnerDevice({
      id: "11111111-1111-4111-8111-111111111111",
      userId: owner.id,
      clientId: app.clientId,
      name: "Phone",
      platform: "android",
      appVersion: null,
      language: null,
      refreshHash: sha256Hex("x"),
      refreshExpiresAt: days(60),
      sessionVersion: owner.sessionVersion,
      pushToken: "token-1",
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });
    const report = await store.createSchoolReport({
      appId: app.id,
      kind: "student",
      templateId: studentTemplate,
      templateName: "End of term report",
      fields: [{ id: "f1", label: "Level", type: "rating", options: [], required: true }],
      answers: { f1: 5 },
      teacherId: mona,
      teacherName: "Mona Adel",
      studentId: omar,
      classId: classA,
      subjectId: null,
      periodFrom: null,
      periodTo: null,
      status: "draft",
      comments: [],
      sentAt: null,
      readAt: null,
      reviewedAt: null,
      sharedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    let pushed = 0;
    const done = await sendReport(
      {
        store,
        app,
        now: NOW,
        pushOwner: async (push) => {
          pushed = (await push({ store, now: NOW, account: ACCOUNT, send })) as number;
        },
      },
      report,
      { name: "Mona Adel" },
      null,
    );
    expect(done).toMatchObject({ status: "sent", sentAt: NOW });
    expect(pushed).toBe(1);
    expect(sent[0]).toMatchObject({ title: "Mona Adel sent a report", body: "End of term report: Omar Hassan · Grade 5 A", data: { kind: "new_message", app_id: app.id, school_report_id: String(report.id) } });
    // Sent once only.
    expect(await sendReport({ store, app, now: NOW, pushOwner: async () => undefined }, report, { name: "Mona Adel" }, null)).toBeNull();
    expect(await pushSchoolReportSent({ store, now: NOW, account: ACCOUNT, send }, { ...app, demo: true }, report, "")).toBe(0);
  });
});
