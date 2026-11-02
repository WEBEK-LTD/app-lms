import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { ownerConversations, ownerSend } from "@/lib/chat/owner";
import { pushChatMessage, recipientsOf } from "@/lib/chat/push";
import type { ChatDeps } from "@/lib/chat/service";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type ChatConversation, type ChatMember, type ChatMessage, type SchoolMessageSettings } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import { parseSchoolMessageSettings, schoolMessageFormValues } from "@/lib/school/forms";
import { adminMayRead, adminSchoolConversations, closeSchoolConversation, DEFAULT_SCHOOL_MESSAGES, departmentsOf, messageWindow, schoolMessagesOf, writeToTeachers } from "@/lib/school/messages";
import { schoolSettingsOf } from "@/lib/school/settings";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const CAIRO = "Africa/Cairo";

describe("113.6 the school's messaging rules", () => {
  it("are off until the school allows them, and the hours are the school's", () => {
    expect(schoolMessagesOf(schoolSettingsOf(null))).toEqual(DEFAULT_SCHOOL_MESSAGES);
    expect(DEFAULT_SCHOOL_MESSAGES.with).toBe("none");
    const hours = { hours: { from: 480, to: 1080, days: [7, 1, 2, 3, 4] } };
    // Monday 2026-10-12 13:00 in Cairo: open.
    expect(messageWindow(hours, CAIRO, NOW)).toEqual({ open: true, opensAt: null });
    // Monday 19:00 Cairo: Tuesday 08:00.
    expect(messageWindow(hours, CAIRO, new Date("2026-10-12T16:00:00Z"))).toEqual({ open: false, opensAt: new Date("2026-10-13T05:00:00Z") });
    // Thursday 19:00 Cairo: Sunday 08:00 (Friday and Saturday aren't school days).
    expect(messageWindow(hours, CAIRO, new Date("2026-10-15T16:00:00Z")).opensAt).toEqual(new Date("2026-10-18T05:00:00Z"));
    // Monday 07:00 Cairo: today at 08:00.
    expect(messageWindow(hours, CAIRO, new Date("2026-10-12T04:00:00Z")).opensAt).toEqual(new Date("2026-10-12T05:00:00Z"));
    expect(messageWindow({ hours: null }, CAIRO, new Date("2026-10-12T23:00:00Z")).open).toBe(true);
    expect(messageWindow({ hours: { from: 480, to: 1080, days: [] } }, CAIRO, NOW)).toEqual({ open: false, opensAt: null });
  });

  it("are read from the settings form", () => {
    expect(parseSchoolMessageSettings({ with: "parents", startedBy: "both", hoursOn: "on", hoursFrom: "08:00", hoursTo: "17:30", day7: "on", day1: "on", classBroadcast: "on", adminReads: "on" })).toEqual({
      ok: true,
      value: { with: "parents", startedBy: "both", hours: { from: 480, to: 1050, days: [1, 7] }, classBroadcast: true, attachments: false, adminReads: true },
    });
    expect(parseSchoolMessageSettings({ with: "parents_students", startedBy: "teacher" })).toMatchObject({ ok: true, value: { hours: null } });
    expect(parseSchoolMessageSettings({ with: "everyone", startedBy: "anyone", hoursOn: "on", hoursFrom: "18:00", hoursTo: "08:00" })).toEqual({
      ok: false,
      errors: { with: "Choose whom teachers may write to.", startedBy: "Choose who may write first.", hoursTo: "The hours end after they start.", days: "Choose at least one day." },
    });
    // Until the school saves its own days, they are the timetable's.
    expect(schoolMessageFormValues(DEFAULT_SCHOOL_MESSAGES, false, [7, 1, 2])).toMatchObject({ with: "none", hoursOn: "on", hoursFrom: "08:00", day7: "on", day1: "on", day3: "" });
    expect(departmentsOf([{ role: "teacher", active: true, department: "Sciences" }, { role: "teacher", active: true, department: " sciences " }, { role: "parent", active: true, department: "X" }] as never)).toEqual(["Sciences"]);
    // 113.3 Staff are in departments too: one `department` field for teachers and staff.
    expect(departmentsOf([{ role: "staff", active: true, department: "Administration" }, { role: "teacher", active: true, department: "Sciences" }, { role: "staff", active: false, department: "Kitchen" }] as never)).toEqual(["Administration", "Sciences"]);
  });
});

describe("113.6 messages between teachers and families on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan = PLAN_INFO.pro;
  let told: { conversation: ChatConversation; message: ChatMessage; sender: ChatMember | null }[];
  let classA: number;
  let classB: number;
  let mona: number;
  let karim: number;
  let omar: number;
  let laila: number;
  let hassan: number;
  let nadia: number;
  let youssef: number;

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
      timeZone: CAIRO,
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
    };
    await store.createApp(app);
    const person = async (input: { role: "student" | "parent" | "teacher"; name: string; phone: string; classId?: number | null; department?: string }) => {
      const made = await store.createSchoolPerson({ appId: app.id, role: input.role, name: input.name, phone: input.phone, email: null, classId: input.classId ?? null, code: null, photoAssetId: null, active: true, department: input.department ?? null }, NOW);
      if (!made.ok) throw new Error("duplicate");
      return made.person.id;
    };
    mona = await person({ role: "teacher", name: "Mona Adel", phone: "+201110000000", department: "Sciences" });
    karim = await person({ role: "teacher", name: "Karim Said", phone: "+201110000001", department: "Languages" });
    classA = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: "Grade 5", homeroomTeacherId: null }, NOW))!.id;
    classB = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 B", grade: "Grade 5", homeroomTeacherId: karim }, NOW))!.id;
    const math = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Mathematics" }, NOW);
    if (!math.ok) throw new Error("subject");
    omar = await person({ role: "student", name: "Omar Hassan", phone: "+201001000001", classId: classA });
    laila = await person({ role: "student", name: "Laila Hassan", phone: "+201001000002", classId: classB });
    youssef = await person({ role: "student", name: "Youssef Nabil", phone: "+201001000003", classId: classB });
    hassan = await person({ role: "parent", name: "Hassan Ali", phone: "+201001000009" });
    nadia = await person({ role: "parent", name: "Nadia Nabil", phone: "+201001000008" });
    await store.setSchoolChildren(app.id, hassan, [omar, laila]);
    await store.setSchoolChildren(app.id, nadia, [youssef]);
    // Mona teaches mathematics to 5 A; Karim is 5 B's own teacher.
    await store.saveSchoolPeriod({ id: null, appId: app.id, classId: classA, subjectId: math.subject.id, teacherId: mona, weekday: 1, startMinute: 480, endMinute: 525, room: null });
    sender = new LogSender();
    now = NOW;
    plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
    told = [];
  });

  async function allow(messages: Partial<SchoolMessageSettings>) {
    const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
    await store.saveSchoolSettings(app.id, { ...settings, messages: { ...DEFAULT_SCHOOL_MESSAGES, with: "parents", ...messages } });
  }

  const context = async (): Promise<HostedContext> => ({
    store,
    app: (await store.getAppById(app.id))!,
    active: true,
    plan,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: null,
    chat: {
      storage: null,
      chunkBytes: 1024,
      onMessage: async ({ conversation, message, sender: from }) => {
        told.push({ conversation, message, sender: from });
      },
    },
  });

  async function call(method: string, route: string, options: { params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(await context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string): Promise<string> {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    const token = (registered.body as { access_token: string }).access_token;
    // The school knows the account from its first School call.
    await call("GET", "/school/me", { token });
    return token;
  }

  type Messages = { enabled: boolean; contacts: { person_id: number; role: string; name: string; students: string[]; subjects: string[]; conversation_id: string | null; can_write: boolean }[]; office_conversation_id: string | null; class_messages: boolean };
  const messages = async (token: string) => (await call("GET", "/school/messages", { token })).body as Messages;
  const open = (token: string, personId: number) => call("POST", "/school/messages/conversations", { token, body: { person_id: personId } });
  const send = (token: string, conversationId: string, text: string, extra: Record<string, unknown> = {}) =>
    call("POST", "/chat/conversations/{conversation_id}/messages", { token, params: [conversationId], body: { client_id: `c-${text.replace(/\W/g, "")}-${now.getTime()}`, text, ...extra } });
  const conversations = async (token: string) => (await call("GET", "/chat/conversations", { token })).body as { items: { id: string; kind: string; title: string; can_send: boolean; school?: { role: string; note: string | null; students: string[]; admin_reads: boolean } }[] };

  it("is off until the school allows it", async () => {
    const teacher = await signUp("1110000000", "Mona");
    const off = await messages(teacher);
    expect(off).toMatchObject({ enabled: false, with: "none", contacts: [] });
    // The conversation with the school's office is there all the same.
    expect(off.office_conversation_id).toEqual(expect.any(String));
    expect((await open(teacher, hassan)).body).toMatchObject({ code: "messages_not_allowed" });
  });

  it("a teacher writes to the parents of their classes; a parent answers the teacher who wrote first", async () => {
    await allow({ with: "parents", startedBy: "teacher" });
    const teacher = await signUp("1110000000", "Mona");
    const dad = await signUp("1001000009", "Hassan");
    const student = await signUp("1001000001", "Omar");

    const mine = await messages(teacher);
    expect(mine.enabled).toBe(true);
    // Hassan, through Omar in 5 A; never Nadia (5 B) nor a student with "parents" only.
    expect(mine.contacts.map((c) => [c.name, c.role, c.students])).toEqual([["Hassan Ali", "parent", ["Omar Hassan"]]]);
    const theirs = await messages(dad);
    expect(theirs.contacts.map((c) => [c.name, c.role, c.subjects, c.students, c.can_write])).toEqual([
      ["Karim Said", "teacher", [], ["Laila Hassan"], false],
      ["Mona Adel", "teacher", ["Mathematics"], ["Omar Hassan"], false],
    ]);
    expect((await messages(student)).contacts).toEqual([]);

    // The parent opens it, but only the teacher writes first.
    const opened = (await open(dad, mona)).body as { conversation_id: string };
    const listed = (await conversations(dad)).items.find((c) => c.id === opened.conversation_id)!;
    expect(listed).toMatchObject({ kind: "school", title: "Mona Adel", can_send: false, school: { role: "teacher", note: "teacher_first", students: ["Omar Hassan"], admin_reads: false } });
    expect((await send(dad, opened.conversation_id, "Hello")).body).toMatchObject({ code: "teacher_first" });

    // The teacher opens the same conversation and writes; the parent is told and answers.
    const same = (await open(teacher, hassan)).body as { conversation_id: string };
    expect(same.conversation_id).toBe(opened.conversation_id);
    expect((await send(teacher, same.conversation_id, "Omar did well today")).status).toBe(201);
    expect(told.at(-1)).toMatchObject({ conversation: { kind: "school" }, message: { text: "Omar did well today" } });
    const recipients = await recipientsOf(store, told.at(-1)!.conversation, told.at(-1)!.message);
    expect(recipients.map((m) => m.name)).toEqual(["Hassan"]);
    expect((await send(dad, opened.conversation_id, "Thank you")).status).toBe(201);
    const page = (await call("GET", "/chat/conversations/{conversation_id}/messages", { token: teacher, params: [same.conversation_id] })).body as { items: { text: string; mine: boolean }[] };
    expect(page.items.map((m) => [m.text, m.mine])).toEqual([
      ["Thank you", false],
      ["Omar did well today", true],
    ]);
    expect((await conversations(teacher)).items.find((c) => c.id === same.conversation_id)).toMatchObject({ title: "Hassan Ali", can_send: true, school: { role: "parent", note: null } });
  });

  it("keeps people apart: a parent only with their children's teachers, a student only with their own, never with each other", async () => {
    await allow({ with: "parents_students", startedBy: "both" });
    const teacher = await signUp("1110000000", "Mona");
    const dad = await signUp("1001000009", "Hassan");
    const otherParent = await signUp("1001000008", "Nadia");
    const omarToken = await signUp("1001000001", "Omar");
    const lailaToken = await signUp("1001000002", "Laila");

    // Nadia's child is in 5 B: Mona isn't her teacher, Karim is.
    expect((await open(otherParent, mona)).status).toBe(404);
    expect((await open(otherParent, karim)).status).toBe(200);
    // Never a parent with another parent, a student with a student, or a parent with someone else's child.
    expect((await open(dad, nadia)).status).toBe(404);
    expect((await open(omarToken, laila)).status).toBe(404);
    expect((await open(dad, youssef)).status).toBe(404);
    // Students with their own teachers only.
    expect((await open(lailaToken, mona)).status).toBe(404);
    const ownTeacher = (await open(omarToken, mona)).body as { conversation_id: string };
    expect((await send(omarToken, ownTeacher.conversation_id, "A question")).status).toBe(201);
    // A teacher with the families of their classes only.
    expect((await open(teacher, nadia)).status).toBe(404);
    expect((await open(teacher, youssef)).status).toBe(404);

    // Someone else's conversation doesn't exist for them, whatever they try.
    const family = (await open(dad, mona)).body as { conversation_id: string };
    expect((await send(dad, family.conversation_id, "Hi")).status).toBe(201);
    for (const token of [otherParent, omarToken, lailaToken]) {
      expect((await call("GET", "/chat/conversations/{conversation_id}/messages", { token, params: [family.conversation_id] })).status).toBe(404);
      expect((await send(token, family.conversation_id, "Intruder")).status).toBe(404);
      expect((await conversations(token)).items.some((c) => c.id === family.conversation_id)).toBe(false);
    }
    // When the school allows parents only, students can't write any more (their history stays theirs to read).
    await allow({ with: "parents", startedBy: "both" });
    expect((await send(omarToken, ownTeacher.conversation_id, "Again")).body).toMatchObject({ code: "messages_not_allowed" });
    expect((await conversations(omarToken)).items.find((c) => c.id === ownTeacher.conversation_id)).toMatchObject({ can_send: false, school: { note: "not_allowed" } });
    // A child moved to another class: the parent no longer writes to the old teacher.
    await store.updateSchoolPerson(app.id, omar, { classId: classB }, now);
    expect((await send(dad, family.conversation_id, "Still there?")).body).toMatchObject({ code: "messages_not_allowed" });
    // Another app never sees the school's conversations.
    expect(await store.getChatConversation("00000000-0000-0000-0000-000000000000", family.conversation_id)).toBeNull();
  });

  it("refuses messages outside the hours with when one can write again, and files when the school allows text only", async () => {
    await allow({ with: "parents", startedBy: "both", hours: null, attachments: false });
    const dad = await signUp("1001000009", "Hassan");
    const conversation = (await open(dad, mona)).body as { conversation_id: string };
    expect((await send(dad, conversation.conversation_id, "With a file", { upload_id: "11111111-1111-4111-8111-111111111111" })).body).toMatchObject({ code: "attachments_not_allowed" });
    // Monday 13:00 in Cairo, and the school writes from 14:00 on Sunday to Thursday.
    await allow({ with: "parents", startedBy: "both", hours: { from: 840, to: 1080, days: [7, 1, 2, 3, 4] }, attachments: false });
    const late = await send(dad, conversation.conversation_id, "Early");
    expect(late.status).toBe(409);
    expect(late.body).toMatchObject({ code: "outside_hours", message: "Messages can be sent from 14:00 to 18:00 on school days. You can write again on 2026-10-12 at 14:00 (school time)." });
    expect((await messages(dad))).toMatchObject({ open_now: false, opens_at: "2026-10-12T11:00:00.000Z", hours: { from: "14:00", to: "18:00", days: [1, 2, 3, 4, 7] } });
    expect((await conversations(dad)).items.find((c) => c.id === conversation.conversation_id)).toMatchObject({ can_send: false, school: { note: "outside_hours" } });
  });

  it("a teacher writes to a whole class when the school allows it; each answer comes back to them alone", async () => {
    await allow({ with: "parents_students", startedBy: "teacher", classBroadcast: false });
    const teacher = await signUp("1110000000", "Mona");
    const body = { to: "families", client_id: "class-msg-0001", text: "Trip on Thursday" };
    expect((await call("POST", "/classroom/classes/{class_id}/messages", { token: teacher, params: [String(classA)], body })).body).toMatchObject({ code: "class_messages_not_allowed" });
    await allow({ with: "parents_students", startedBy: "teacher", classBroadcast: true });
    expect((await messages(teacher))).toMatchObject({ class_messages: true, classes: [{ id: classA, name: "Grade 5 A" }] });
    expect((await call("POST", "/classroom/classes/{class_id}/messages", { token: teacher, params: [String(classB)], body })).body).toMatchObject({ code: "not_your_class" });
    // Hassan never signed in: not reached yet; Omar is reached.
    const omarToken = await signUp("1001000001", "Omar");
    const sent = await call("POST", "/classroom/classes/{class_id}/messages", { token: teacher, params: [String(classA)], body });
    expect(sent.body).toEqual({ sent: 1, not_in_app: 1 });
    const dad = await signUp("1001000009", "Hassan");
    const again = await call("POST", "/classroom/classes/{class_id}/messages", { token: teacher, params: [String(classA)], body });
    expect(again.body).toEqual({ sent: 2, not_in_app: 0 });
    // The same client_id sent nothing twice to Omar; Hassan got it now. Both may answer (the teacher wrote first).
    const omars = (await conversations(omarToken)).items.filter((c) => c.kind === "school");
    expect(omars).toHaveLength(1);
    const page = (await call("GET", "/chat/conversations/{conversation_id}/messages", { token: omarToken, params: [omars[0]!.id] })).body as { items: { text: string }[] };
    expect(page.items.map((m) => m.text)).toEqual(["Trip on Thursday"]);
    const dads = (await conversations(dad)).items.filter((c) => c.kind === "school");
    expect(dads.map((c) => [c.title, c.can_send])).toEqual([["Mona Adel", true]]);
    expect((await send(dad, dads[0]!.id, "Noted")).status).toBe(201);
    // Parents only: a teacher can't write to the students.
    await allow({ with: "parents", classBroadcast: true });
    expect((await call("POST", "/classroom/classes/{class_id}/messages", { token: teacher, params: [String(classA)], body: { ...body, to: "students" } })).body).toMatchObject({ code: "messages_not_allowed" });
  });

  it("the administration closes conversations, sees reported ones, and reads the rest only when the school says so", async () => {
    await allow({ with: "parents", startedBy: "both" });
    const teacher = await signUp("1110000000", "Mona");
    const dad = await signUp("1001000009", "Hassan");
    const conversation = ((await open(dad, mona)).body as { conversation_id: string }).conversation_id;
    const rude = (await send(dad, conversation, "Something rude")).body as { id: string };
    // The business's inbox and replies never include it.
    const deps: ChatDeps = { store, now, storage: null, chunkBytes: 1024, business: { name: "Nile School", imageUrl: null }, plan, onMessage: async () => undefined };
    const fresh = (await store.getAppById(app.id))!;
    expect((await ownerConversations(deps, fresh, {})).items.some((c) => c.id === conversation)).toBe(false);
    expect(await ownerSend(deps, fresh, conversation, { userId: "u1", name: "Office" }, { client_id: "office-0001", text: "Hi" })).toMatchObject({ ok: false, status: 404 });
    // Private until a message in it is reported.
    expect((await adminSchoolConversations(store, fresh)).items).toEqual([]);
    expect(await adminMayRead(store, fresh, (await store.getChatConversation(app.id, conversation))!)).toBe(false);
    expect(await closeSchoolConversation(store, fresh, conversation, true, "office@nile.test", now)).toBe(false);
    expect((await call("POST", "/chat/messages/{message_id}/report", { token: teacher, params: [rude.id], body: { reason: "abuse" } })).status).toBe(204);
    const reported = await adminSchoolConversations(store, fresh);
    expect(reported.items.map((c) => [c.teacher?.name, c.other?.name, c.reported, c.last?.text])).toEqual([["Mona Adel", "Hassan Ali", true, "Something rude"]]);
    // Closed: both read, neither sends.
    expect(await closeSchoolConversation(store, fresh, conversation, true, "office@nile.test", now)).toBe(true);
    expect((await send(teacher, conversation, "Reply")).body).toMatchObject({ code: "conversation_closed" });
    expect((await conversations(dad)).items.find((c) => c.id === conversation)).toMatchObject({ can_send: false, school: { closed: true, note: "closed" } });
    expect((await call("GET", "/chat/conversations/{conversation_id}/messages", { token: dad, params: [conversation] })).status).toBe(200);
    expect(await closeSchoolConversation(store, fresh, conversation, false, "office@nile.test", now)).toBe(true);
    expect((await send(teacher, conversation, "Let's talk")).status).toBe(201);
    // When the school reads them, every conversation shows, and the app says so.
    const other = ((await open(teacher, hassan)).body as { conversation_id: string }).conversation_id;
    expect(other).toBe(conversation);
    await allow({ with: "parents", startedBy: "both", adminReads: true });
    expect((await adminSchoolConversations(store, fresh)).reads).toBe(true);
    expect((await conversations(dad)).items.find((c) => c.id === conversation)?.school?.admin_reads).toBe(true);
  });

  it("the administration writes to all its teachers or a department, in each teacher's own conversation", async () => {
    const teacher = await signUp("1110000000", "Mona");
    const deps: ChatDeps = { store, now, storage: null, chunkBytes: 1024, business: { name: "Nile School", imageUrl: null }, plan, onMessage: async (input) => void told.push(input) };
    const fresh = (await store.getAppById(app.id))!;
    const sent = await writeToTeachers(deps, fresh, { audience: { kind: "department", name: "sciences" }, text: "Staff meeting at 2", clientId: "staff-1", team: { userId: "u1", name: "Office" } });
    expect(sent).toEqual({ ok: true, value: { sent: 1, notInApp: [] } });
    expect(await writeToTeachers(deps, fresh, { audience: { kind: "all" }, text: "Hello all", clientId: "staff-2", team: { userId: "u1", name: "Office" } })).toEqual({ ok: true, value: { sent: 1, notInApp: ["Karim Said"] } });
    expect(await writeToTeachers(deps, fresh, { audience: { kind: "department", name: "Arts" }, text: "x", clientId: "staff-3", team: { userId: "u1", name: "Office" } })).toMatchObject({ ok: false, status: 404 });
    const office = (await messages(teacher)).office_conversation_id!;
    const page = (await call("GET", "/chat/conversations/{conversation_id}/messages", { token: teacher, params: [office] })).body as { items: { text: string; sender: { kind: string } }[] };
    expect(page.items.map((m) => [m.text, m.sender.kind])).toEqual([
      ["Hello all", "business"],
      ["Staff meeting at 2", "business"],
    ]);
    // The teacher answers there, at any time (no hours for the administration).
    await allow({ with: "none", hours: { from: 1200, to: 1260, days: [3] } });
    expect((await send(teacher, office, "On my way")).status).toBe(201);
  });

  it("113.3 the administration writes to its staff too: all of them, everyone, a department of teachers and staff, or one", async () => {
    const made = await store.createSchoolPerson({ appId: app.id, role: "staff", name: "Samir Fawzy", phone: "+201007775555", email: null, classId: null, code: null, photoAssetId: null, active: true, department: "Sciences", jobTitle: "Lab technician" }, NOW);
    if (!made.ok) throw new Error("staff");
    const samir = await signUp("1007775555", "Samir");
    const teacher = await signUp("1110000000", "Mona");
    const deps: ChatDeps = { store, now, storage: null, chunkBytes: 1024, business: { name: "Nile School", imageUrl: null }, plan, onMessage: async () => undefined };
    const fresh = (await store.getAppById(app.id))!;
    const team = { userId: "u1", name: "Office" };
    expect(await writeToTeachers(deps, fresh, { audience: { kind: "staff" }, text: "Staff only", clientId: "staff-10", team })).toEqual({ ok: true, value: { sent: 1, notInApp: [] } });
    // The department has Mona (a teacher) and Samir (staff).
    expect(await writeToTeachers(deps, fresh, { audience: { kind: "department", name: "Sciences" }, text: "Sciences meeting", clientId: "staff-11", team })).toEqual({ ok: true, value: { sent: 2, notInApp: [] } });
    expect(await writeToTeachers(deps, fresh, { audience: { kind: "everyone" }, text: "Everyone", clientId: "staff-12", team })).toEqual({ ok: true, value: { sent: 2, notInApp: ["Karim Said"] } });
    expect(await writeToTeachers(deps, fresh, { audience: { kind: "teacher", id: made.person.id }, text: "Just you", clientId: "staff-13", team })).toEqual({ ok: true, value: { sent: 1, notInApp: [] } });
    // "All teachers" is still the teachers only.
    expect(await writeToTeachers(deps, fresh, { audience: { kind: "all" }, text: "Teachers", clientId: "staff-14", team })).toEqual({ ok: true, value: { sent: 1, notInApp: ["Karim Said"] } });
    // Samir reads them in his own conversation with the school.
    const office = (await call("GET", "/chat/conversations", { token: samir })).body as { items: { id: string; kind: string }[] };
    const own = office.items.find((c) => c.kind === "direct")!;
    const page = (await call("GET", "/chat/conversations/{conversation_id}/messages", { token: samir, params: [own.id] })).body as { items: { text: string }[] };
    expect(page.items.map((m) => m.text)).toEqual(["Just you", "Everyone", "Sciences meeting", "Staff only"]);
    expect((await call("GET", "/chat/conversations", { token: teacher })).status).toBe(200);
  });

  it("pushes a school message with the sender's name and never to the business's phones", async () => {
    await allow({ with: "parents", startedBy: "both" });
    const dad = await signUp("1001000009", "Hassan");
    await signUp("1110000000", "Mona");
    const conversation = ((await open(dad, mona)).body as { conversation_id: string }).conversation_id;
    await send(dad, conversation, "Hello teacher");
    const last = told.at(-1)!;
    const owner = { pushes: 0 };
    const outcome = await pushChatMessage(
      { store, now, key: Buffer.alloc(32), businessName: "Nile School", owner: { store, now, send: async () => ((owner.pushes += 1), { sent: 1, invalidTokens: [] }) } as never },
      { app: (await store.getAppById(app.id))!, conversation: last.conversation, message: last.message, sender: last.sender },
    );
    expect(outcome.owner).toBe(0);
    expect(owner.pushes).toBe(0);
    expect((await recipientsOf(store, last.conversation, last.message)).map((m) => m.name)).toEqual(["Mona"]);
  });
});
