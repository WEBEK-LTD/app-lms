import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { checkInMember, findMembers } from "@/lib/bookings/door";
import { dayStart, freezeMembership, unfreezeMembership, unfreezeShift } from "@/lib/bookings/freeze";
import { memberKey } from "@/lib/bookings/member-codes";
import { membershipActive, membershipStatus, membershipToUse } from "@/lib/bookings/memberships";
import { answerAsBusiness, setAnswerHidden } from "@/lib/courses/community";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_SETUP, DEFAULT_CATALOG_SETTINGS, type App, type Client, type CourseSetup, type Membership, type User } from "@/lib/data/types";
import { BookingsConnector } from "@/lib/hosted/connectors/bookings";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedResult } from "@/lib/hosted/service";
import type { OwnerDeps } from "@/lib/owner/http";
import { pushNewOrder, type OwnerPushDeps } from "@/lib/owner/push";
import { handleOwner } from "@/lib/owner/service";
import { recordCommunity, recordFreeze } from "@/lib/team/activity";
import { knownTranslator } from "@/i18n/dashboard";
import type { CatalogOrder } from "@/lib/data/types";
import { expectContract } from "./contract";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 64 Hidden course questions and answers (the hosted API, the Owner API and
 * the activity), frozen memberships (the rule, the door, classes, the
 * customer's app and the Owner API), pushes to every phone of someone on
 * several businesses, and the Team page's activity in pages. Checked
 * against docs/api/openapi.yaml and docs/api/owner.yaml.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";
const ACCOUNT: ServiceAccount = { project_id: "yallapp-business", client_email: "push@yallapp-business.test", private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" };
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

function academy(): CourseSetup {
  return {
    currency: "TRY",
    categories: [{ id: 1, name: "Languages" }],
    courses: [
      {
        id: 10,
        title: "Arabic for Beginners",
        description: "",
        imageAssetId: null,
        priceCents: 0,
        categoryIds: [1],
        instructorName: "Nour Saleh",
        level: null,
        active: true,
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [{ id: 11, title: "Hello", lessons: [{ id: 12, title: "Greetings", videoUrl: null, text: "Marhaba", durationMinutes: 5, preview: false }] }],
      },
    ],
    nextId: 30,
  };
}

const GYM_SETUP = {
  ...DEFAULT_BOOKING_SETUP,
  rules: { ...DEFAULT_BOOKING_SETUP.rules, timezone: "Europe/Istanbul" },
  membershipPlans: [{ id: 1, name: "Monthly unlimited", description: "", priceCents: 150_000, period: "month" as const, credits: null, active: true }],
};

async function ownerOf(store: MemoryStore, email: string, name = "Leyla Kaya"): Promise<{ user: User; client: Client }> {
  const { user, client } = await registerClient(store, { name, email, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
  await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "bank transfer" }, KEY, NOW);
  return { user: (await store.getUserById(user.id))!, client: (await store.getClientById(client.id))! };
}

async function addApp(store: MemoryStore, client: Client, app: Partial<App> & Pick<App, "appType">): Promise<App> {
  const full: App = { ...newApp(client.id, null, NOW, app.appType, app.vertical ?? null), backend: "hosted", websiteDoneAt: NOW, ...app };
  await store.createApp(full);
  if (!(await store.getLicenseForApp(client.id, full.id))) await activateClient(store, { clientId: client.id, appId: full.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  return full;
}

function membership(app: App, userId: number, patch: Partial<Membership> = {}): Omit<Membership, "id"> {
  return { appId: app.id, userId, planId: 1, planName: "Monthly unlimited", period: "month", creditsLeft: null, status: "active", startsAt: days(-3), endsAt: days(27), orderId: null, createdAt: days(-3), updatedAt: days(-3), ...patch };
}

const DAY = 86_400_000;

describe("64 frozen memberships", () => {
  let store: MemoryStore;
  let gym: App;

  beforeEach(async () => {
    store = new MemoryStore();
    const { client } = await ownerOf(store, "gym@owner.test");
    gym = await addApp(store, client, { appType: "booking", vertical: "fitness", appName: "Iron Gym", connector: { kind: "bookings" }, bookingSetup: GYM_SETUP });
  });

  const user = async (name: string, phone: string) => (await store.createHostedUser({ appId: gym.id, phone, name, email: null, city: null, now: NOW }))!;

  it("freezes from a day until a day, in the gym's days, and moves the end by the frozen days at once", async () => {
    const sara = await user("Sara Adel", "+905001112223");
    const m = await store.createMembership(membership(gym, sara.id));
    // NOW is 13:00 on 12 October in Istanbul.
    const frozen = await freezeMembership(store, gym, m, { from: "2026-10-14", until: "2026-10-24" }, NOW);
    expect(frozen.ok).toBe(true);
    const after = (await store.getMembership(gym.id, m.id))!;
    expect(after.frozenFrom).toEqual(new Date("2026-10-13T21:00:00Z"));
    expect(after.frozenUntil).toEqual(new Date("2026-10-23T21:00:00Z"));
    expect(after.endsAt!.getTime() - m.endsAt!.getTime()).toBe(10 * DAY);
    // Not frozen yet, then frozen, then back on the day it's back.
    const door = (now: Date) => checkInMember({ store, app: gym, key: memberKey(SECRET, gym.id), membershipId: m.id, by: "Desk", now });
    expect((await door(NOW)).outcome).toBe("admitted");
    expect(await door(new Date("2026-10-15T08:00:00Z"))).toMatchObject({ outcome: "frozen", member: { frozenUntil: new Date("2026-10-23T21:00:00Z") } });
    expect((await door(new Date("2026-10-24T06:00:00Z"))).outcome).toBe("admitted");
    // A second freeze while one is to come is refused.
    expect(await freezeMembership(store, gym, after, { from: "2026-10-20", until: "" }, NOW)).toMatchObject({ ok: false, status: 409 });
  });

  it("checks the days asked for", async () => {
    const m = await store.createMembership(membership(gym, (await user("Ali", "+905001112224")).id));
    const freeze = (from: unknown, until: unknown) => freezeMembership(store, gym, m, { from, until }, NOW);
    expect(await freeze("", "")).toMatchObject({ status: 400, errors: { from: "Choose the first frozen day." } });
    expect(await freeze("2026-10-11", "")).toMatchObject({ errors: { from: "Choose today or a later day." } });
    expect(await freeze("2027-02-01", "")).toMatchObject({ errors: { from: "Choose a day within 90 days." } });
    expect(await freeze("2026-11-20", "")).toMatchObject({ errors: { from: "Choose a day before the membership ends." } });
    expect(await freeze("2026-10-14", "2026-10-14")).toMatchObject({ errors: { until: "Choose a day after the first frozen day." } });
    expect(await freeze("2026-10-14", "2027-12-01")).toMatchObject({ errors: { until: "A freeze lasts at most 365 days." } });
    expect(await freeze("2026-10-14", "soon")).toMatchObject({ errors: { until: "Choose the day it's back, or leave it empty." } });
    const ended = await store.createMembership(membership(gym, m.userId, { endsAt: days(-1) }));
    expect(await freezeMembership(store, gym, ended, { from: "2026-10-12", until: null }, NOW)).toMatchObject({ status: 409, errors: { from: "Only an active membership can be frozen." } });
    // Messages in the dashboard's languages.
    expect(knownTranslator("ar")("Choose a day within 90 days.")).toBe("اختر يومًا خلال 90 يومًا.");
    expect(knownTranslator("tr")("A freeze lasts at most 365 days.")).toBe("Dondurma en fazla 365 gün sürer.");
  });

  it("without an end, holds the membership past its end and moves the end by the days frozen when unfrozen", async () => {
    const m = await store.createMembership(membership(gym, (await user("Deniz", "+905001112225")).id, { endsAt: days(5) }));
    expect((await freezeMembership(store, gym, m, { from: "2026-10-12", until: null }, NOW)).ok).toBe(true);
    const frozen = (await store.getMembership(gym.id, m.id))!;
    expect(frozen.endsAt).toEqual(m.endsAt);
    // 20 days later the old end has passed, but a freeze without an end holds it.
    const later = days(20);
    expect(membershipStatus(frozen, later)).toBe("active");
    expect(membershipActive(frozen, later)).toBe(true);
    expect((await checkInMember({ store, app: gym, key: memberKey(SECRET, gym.id), membershipId: m.id, by: "Desk", now: later })).outcome).toBe("frozen");
    expect(unfreezeShift(gym, frozen, later)).toBe(20);
    const back = await unfreezeMembership(store, gym, frozen, later);
    expect(back.ok).toBe(true);
    const after = (await store.getMembership(gym.id, m.id))!;
    expect(after).toMatchObject({ frozenFrom: null, frozenUntil: null });
    expect(after.endsAt!.getTime() - m.endsAt!.getTime()).toBe(20 * DAY);
    expect((await checkInMember({ store, app: gym, key: memberKey(SECRET, gym.id), membershipId: m.id, by: "Desk", now: later })).outcome).toBe("admitted");
    // Unfrozen twice: the second is refused and the end moves once.
    expect(await unfreezeMembership(store, gym, frozen, later)).toMatchObject({ ok: false, status: 409 });
    expect((await store.getMembership(gym.id, m.id))!.endsAt).toEqual(after.endsAt);
  });

  it("gives back the days a freeze with an end no longer takes, and removes one that hadn't started", async () => {
    const m = await store.createMembership(membership(gym, (await user("Ece", "+905001112226")).id));
    await freezeMembership(store, gym, m, { from: "2026-10-12", until: "2026-10-22" }, NOW);
    const frozen = (await store.getMembership(gym.id, m.id))!;
    // Back on the 15th: three days frozen, seven given back.
    const on15 = new Date("2026-10-15T07:00:00Z");
    expect(unfreezeShift(gym, frozen, on15)).toBe(-7);
    await unfreezeMembership(store, gym, frozen, on15);
    expect((await store.getMembership(gym.id, m.id))!.endsAt!.getTime() - m.endsAt!.getTime()).toBe(3 * DAY);

    const n = await store.createMembership(membership(gym, m.userId, { planName: "Pool" }));
    await freezeMembership(store, gym, n, { from: "2026-10-20", until: "2026-10-25" }, NOW);
    const planned = (await store.getMembership(gym.id, n.id))!;
    expect(unfreezeShift(gym, planned, NOW)).toBe(-5);
    await unfreezeMembership(store, gym, planned, NOW);
    expect((await store.getMembership(gym.id, n.id))!.endsAt).toEqual(n.endsAt);
    // A freeze with an end that is over is no freeze: nothing to unfreeze, and a new one can be set.
    await freezeMembership(store, gym, (await store.getMembership(gym.id, n.id))!, { from: "2026-10-12", until: "2026-10-13" }, NOW);
    const over = (await store.getMembership(gym.id, n.id))!;
    expect(await unfreezeMembership(store, gym, over, days(3))).toMatchObject({ ok: false });
    expect((await freezeMembership(store, gym, over, { from: "2026-10-16", until: null }, days(3))).ok).toBe(true);
  });

  it("freezes once when two people freeze at once", async () => {
    const m = await store.createMembership(membership(gym, (await user("Feyza", "+905001112227")).id));
    const results = await Promise.all([1, 2, 3].map(() => freezeMembership(store, gym, m, { from: "2026-10-12", until: "2026-10-19" }, NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await store.getMembership(gym.id, m.id))!.endsAt!.getTime() - m.endsAt!.getTime()).toBe(7 * DAY);
  });

  it("books no classes on a frozen membership, and says so", () => {
    const m = { id: 1, ...membership(gym, 1), frozenFrom: days(-1), frozenUntil: days(3) } as Membership;
    expect(membershipToUse([m], NOW)).toEqual({ ok: false, reason: "membership_frozen" });
    expect(membershipToUse([m, { ...m, id: 2, frozenFrom: null, frozenUntil: null }], NOW)).toMatchObject({ ok: true, membership: { id: 2 } });
    expect(membershipToUse([], NOW)).toEqual({ ok: false, reason: "membership_required" });
  });

  it("lists frozen members with the others that can't get in, and says Frozen in the customer's app", async () => {
    const sara = await user("Sara Adel", "+905001112223");
    const m = await store.createMembership(membership(gym, sara.id));
    await store.createMembership(membership(gym, (await user("Ali", "+905001112224")).id, { createdAt: days(-5) }));
    await freezeMembership(store, gym, m, { from: "2026-10-12", until: "2026-10-20" }, NOW);
    const rows = await findMembers(store, gym, { now: NOW, offset: 0, limit: 10 });
    expect(rows.items.map((r) => r.status)).toEqual(["active", "frozen"]);
    expect(rows.items[1]!.freeze).toMatchObject({ now: true, until: dayStart(gym, "2026-10-20") });

    const connector = new BookingsConnector({ store, app: gym, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", signingSecret: SECRET });
    const result = (await connector.handle({ method: "GET", path: ["me", "memberships"], query: new URLSearchParams(), body: null, user: sara, now: NOW }))!;
    expectContract("GET", "/me/memberships", result);
    expect((result.body as { items: unknown[] }).items[0]).toMatchObject({
      status: "active",
      frozen: { from: dayStart(gym, "2026-10-12").toISOString(), until: dayStart(gym, "2026-10-20").toISOString() },
      member_code: { code: expect.any(String) },
    });
  });
});

describe("64 hidden questions and answers on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let client: Client;
  let sender: LogSender;
  let now: Date;
  let told: number;

  beforeEach(async () => {
    store = new MemoryStore();
    ({ client } = await ownerOf(store, "school@owner.test"));
    app = await addApp(store, client, { appType: "lms", appName: "Nour Academy", connector: { kind: "courses" }, courseSetup: academy(), catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    sender = new LogSender();
    now = NOW;
    told = 0;
  });

  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; params?: string[]; query?: Record<string, string> } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const connector = new CoursesConnector({ store, app, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", onQuestion: async () => void (told += 1) });
    const result = await handleHosted(
      { store, app, active: true, now, ip: "203.0.113.9", secret: "test-hosted-secret", sender, push: false, assetUrl: (id) => `https://yallapp.test/a/${id}`, platformUrl: "https://yallapp.test", connector },
      { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null },
    );
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const registered = await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name, device: DEVICE } });
    const out = registered.body as { access_token: string; user: { id: number } };
    await call("POST", "/courses/{course_id}/enroll", { token: out.access_token, params: ["10"] });
    return out;
  }

  it("shows a hidden question to its author only, never in others' lists or counts", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const ayse = await signUp("5321234568", "Ayşe Kaya");
    const spam = ((await call("POST", "/courses/{course_id}/questions", { token: ayse.access_token, params: ["10"], body: { text: "Buy followers!" } })).body as { id: number }).id;
    const real = ((await call("POST", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"], body: { text: "How do I say thank you?" } })).body as { id: number }).id;
    await store.setCourseQuestionHidden(app.id, spam, true);

    const forDeniz = (await call("GET", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"] })).body as { total: number; items: { id: number; hidden: boolean }[] };
    expect(forDeniz.total).toBe(1);
    expect(forDeniz.items.map((q) => q.id)).toEqual([real]);
    expect((await call("GET", "/questions/{question_id}", { token: deniz.access_token, params: [String(spam)] })).status).toBe(404);
    expect((await call("POST", "/questions/{question_id}/answers", { token: deniz.access_token, params: [String(spam)], body: { text: "No" } })).status).toBe(404);

    const forAyse = (await call("GET", "/courses/{course_id}/questions", { token: ayse.access_token, params: ["10"] })).body as { total: number; items: { id: number; hidden: boolean; mine: boolean }[] };
    expect(forAyse.total).toBe(2);
    expect(forAyse.items.find((q) => q.id === spam)).toMatchObject({ hidden: true, mine: true });
    expect((await call("GET", "/questions/{question_id}", { token: ayse.access_token, params: [String(spam)] })).body).toMatchObject({ hidden: true, mine: true });
    // Writing again under a hidden question isn't pushed to the business.
    told = 0;
    expect((await call("POST", "/questions/{question_id}/answers", { token: ayse.access_token, params: [String(spam)], body: { text: "Hello?" } })).status).toBe(201);
    expect(told).toBe(0);
  });

  it("shows a hidden answer to its author only and doesn't count it for anyone", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const ayse = await signUp("5321234568", "Ayşe Kaya");
    const id = ((await call("POST", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"], body: { text: "Why?" } })).body as { id: number }).id;
    const rude = ((await call("POST", "/questions/{question_id}/answers", { token: ayse.access_token, params: [String(id)], body: { text: "Rude words" } })).body as { id: number }).id;
    const question = (await store.getCourseQuestion(app.id, id))!;
    await answerAsBusiness({ store, app, now, account: null }, question, null, "Because.");
    const answers = await store.listCourseAnswers(app.id, id);
    expect(await setAnswerHidden(store, question, answers.find((a) => a.id === rude)!, true)).toEqual({ ok: true });
    // The business's own answer can't be hidden.
    expect(await setAnswerHidden(store, question, answers.find((a) => a.userId === null)!, true)).toEqual({ ok: false, error: "Your own answers can't be hidden." });

    const forDeniz = (await call("GET", "/questions/{question_id}", { token: deniz.access_token, params: [String(id)] })).body as { answer_count: number; answers: { text: string }[] };
    expect(forDeniz.answer_count).toBe(1);
    expect(forDeniz.answers.map((a) => a.text)).toEqual(["Because."]);
    const forAyse = (await call("GET", "/questions/{question_id}", { token: ayse.access_token, params: [String(id)] })).body as { answers: { text: string; hidden: boolean; mine: boolean }[] };
    expect(forAyse.answers).toEqual([expect.objectContaining({ text: "Rude words", hidden: true, mine: true }), expect.objectContaining({ text: "Because.", hidden: false })]);
    expect(((await call("GET", "/courses/{course_id}/questions", { token: ayse.access_token, params: ["10"] })).body as { items: { answer_count: number }[] }).items[0]!.answer_count).toBe(1);
  });
});

describe("64 the Owner API: hiding questions and answers, freezing members", () => {
  let store: MemoryStore;
  let owner: User;
  let client: Client;
  let school: App;
  let gym: App;
  let theirs: App;

  const deps = (): OwnerDeps => ({
    store,
    now: NOW,
    ip: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
    signingSecret: SECRET,
    encryptionKey: KEY,
    baseUrl: "https://yallapp.test",
    paymentUrls: {},
    media: null,
    mail: async () => undefined,
  });

  async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string; body?: unknown; query?: Record<string, string>; lang?: string } = {}) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? `{${name}}`));
    const result = await handleOwner(deps(), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null, acceptLanguage: options.lang ?? null });
    expectOwnerContract(method, route, result);
    return result as { status: number; body: Record<string, unknown> };
  }

  async function signIn(email: string) {
    const result = await call("POST", "/auth/sign-in", { body: { email, password: PASSWORD, device: { name: "Pixel 8", platform: "android" } } });
    expect(result.status).toBe(200);
    return (result.body as { access_token: string }).access_token;
  }

  async function teamMember(email: string, name: string, areas: string[], appIds: string[] | null) {
    const user = await store.createUser({ email, name, passwordHash: await hashPassword(PASSWORD), now: NOW });
    await store.saveTeamMember({ clientId: client.id, userId: user.id, role: "staff", areas, appIds, addedBy: owner.email, createdAt: NOW, updatedAt: NOW });
    return user;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    ({ user: owner, client } = await ownerOf(store, "leyla@school.test"));
    school = await addApp(store, client, { appType: "lms", appName: "Nour Academy", connector: { kind: "courses" }, courseSetup: academy(), catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    gym = await addApp(store, client, { appType: "booking", vertical: "fitness", appName: "Iron Gym", connector: { kind: "bookings" }, bookingSetup: GYM_SETUP });
    theirs = await addApp(store, (await ownerOf(store, "other@else.test")).client, { appType: "booking", vertical: "fitness", appName: "Not yours", connector: { kind: "bookings" }, bookingSetup: GYM_SETUP });
  });

  const student = async (app: App, name: string, phone: string) => (await store.createHostedUser({ appId: app.id, phone, name, email: null, city: null, now: NOW }))!;

  it("hides a question and a student's answer, lists hidden ones apart and keeps them out of what waits", async () => {
    const token = await signIn("leyla@school.test");
    const deniz = await student(school, "Deniz", "+905321234567");
    const q = await store.createCourseQuestion({ appId: school.id, courseId: 10, userId: deniz.id, text: "Buy followers!", status: "open", createdAt: NOW, updatedAt: NOW });
    const a = await store.addCourseAnswer({ appId: school.id, questionId: q.id, userId: deniz.id, text: "Cheap!", createdAt: NOW }, "open");
    const params = { app_id: school.id, question_id: q.id };
    const hidden = await call("PATCH", "/apps/{app_id}/questions/{question_id}", { token, params, body: { hidden: true } });
    expect(hidden).toMatchObject({ status: 200, body: { hidden: true, status: "open", answer_count: 1, answers: [{ id: a.id, hidden: false }] } });
    expect((await call("GET", "/apps/{app_id}/questions", { token, params: { app_id: school.id }, query: { status: "open" } })).body).toMatchObject({ open: 0, total: 0 });
    expect((await call("GET", "/apps/{app_id}/questions", { token, params: { app_id: school.id }, query: { status: "hidden" } })).body).toMatchObject({ total: 1, items: [{ id: q.id, hidden: true }] });
    expect((await call("GET", "/apps/{app_id}/questions", { token, params: { app_id: school.id } })).body).toMatchObject({ total: 1 });
    expect((await call("GET", "/apps/{app_id}/today", { token, params: { app_id: school.id } })).body.needs_you).toEqual([]);

    const answer = await call("PATCH", "/apps/{app_id}/questions/{question_id}/answers/{answer_id}", { token, params: { ...params, answer_id: a.id }, body: { hidden: true } });
    expect(answer.body).toMatchObject({ answer_count: 0, answers: [{ id: a.id, hidden: true }] });
    await call("PATCH", "/apps/{app_id}/questions/{question_id}", { token, params, body: { hidden: false } });
    await call("PATCH", "/apps/{app_id}/questions/{question_id}/answers/{answer_id}", { token, params: { ...params, answer_id: a.id }, body: { hidden: false } });
    expect((await store.listTeamActivity(client.id, { limit: 5 })).items.map((x) => x.action)).toEqual(["answer.show", "question.show", "answer.hide", "question.hide"]);

    // The business's own answers can't be hidden; bad bodies and ids; another client's app.
    const ours = await call("POST", "/apps/{app_id}/questions/{question_id}/answers", { token, params, body: { text: "No ads here." } });
    const ourId = (ours.body.answers as { id: number; from: string }[]).find((x) => x.from === "business")!.id;
    expect((await call("PATCH", "/apps/{app_id}/questions/{question_id}/answers/{answer_id}", { token, params: { ...params, answer_id: ourId }, body: { hidden: true }, lang: "tr" })).body).toMatchObject({
      code: "invalid_request",
      message: "Kendi yanıtlarınız gizlenemez.",
    });
    expect((await call("PATCH", "/apps/{app_id}/questions/{question_id}", { token, params, body: { hidden: 1 } })).status).toBe(400);
    expect((await call("PATCH", "/apps/{app_id}/questions/{question_id}/answers/{answer_id}", { token, params: { ...params, answer_id: 9999 }, body: { hidden: true } })).status).toBe(404);
    expect((await call("PATCH", "/apps/{app_id}/questions/{question_id}", { token, params: { app_id: theirs.id, question_id: q.id }, body: { hidden: true } })).status).toBe(404);
  });

  it("freezes and unfreezes a member with the Bookings area, answers 409 when it can't, and the door says Frozen until", async () => {
    const token = await signIn("leyla@school.test");
    const sara = await student(gym, "Sara Adel", "+905001112223");
    const m = await store.createMembership(membership(gym, sara.id));
    const params = { app_id: gym.id, membership_id: m.id };
    expect((await call("PUT", "/apps/{app_id}/members/{membership_id}/freeze", { token, params, body: { from: "2026-10-01" } })).body).toMatchObject({ code: "invalid_request", errors: { from: "Choose today or a later day." } });
    const frozen = await call("PUT", "/apps/{app_id}/members/{membership_id}/freeze", { token, params, body: { from: "2026-10-12", until: "2026-10-19" } });
    expect(frozen.body).toMatchObject({ membership_id: m.id, status: "frozen", frozen: { from: dayStart(gym, "2026-10-12").toISOString(), until: dayStart(gym, "2026-10-19").toISOString() } });
    expect((await call("PUT", "/apps/{app_id}/members/{membership_id}/freeze", { token, params, body: { from: "2026-10-13" } })).body).toMatchObject({ code: "invalid_status" });
    const door = await call("POST", "/apps/{app_id}/members/check-in", { token, params: { app_id: gym.id }, body: { membership_id: m.id } });
    expect(door.body).toMatchObject({ outcome: "frozen", admitted: false, message: "Frozen until 19 Oct 2026", member: { frozen_until: dayStart(gym, "2026-10-19").toISOString() } });
    expect(((await call("POST", "/apps/{app_id}/members/check-in", { token, params: { app_id: gym.id }, body: { membership_id: m.id }, lang: "ar" })).body.message as string).startsWith("مجمّدة حتى")).toBe(true);
    expect((await call("GET", "/apps/{app_id}/members", { token, params: { app_id: gym.id } })).body).toMatchObject({ items: [{ status: "frozen" }] });

    const back = await call("DELETE", "/apps/{app_id}/members/{membership_id}/freeze", { token, params });
    expect(back.body).toMatchObject({ status: "active", frozen: null, ends_at: m.endsAt!.toISOString() });
    expect((await call("DELETE", "/apps/{app_id}/members/{membership_id}/freeze", { token, params })).status).toBe(409);
    const lines = (await store.listTeamActivity(client.id, { limit: 5 })).items;
    expect(lines.map((x) => x.summary)).toEqual(['Unfroze the membership of "Sara Adel"', 'Froze the membership of "Sara Adel"']);
    expect(knownTranslator("ar")(lines[1]!.summary)).toBe("جمّد عضوية «Sara Adel»");

    // Scoped by app: another client's membership id, an app without members, a member without Bookings.
    const other = await store.createMembership(membership(theirs, (await student(theirs, "X", "+905009999999")).id));
    expect((await call("PUT", "/apps/{app_id}/members/{membership_id}/freeze", { token, params: { app_id: theirs.id, membership_id: other.id }, body: { from: "2026-10-12" } })).status).toBe(404);
    expect((await call("PUT", "/apps/{app_id}/members/{membership_id}/freeze", { token, params: { app_id: gym.id, membership_id: other.id }, body: { from: "2026-10-12" } })).status).toBe(404);
    expect((await call("PUT", "/apps/{app_id}/members/{membership_id}/freeze", { token, params: { app_id: school.id, membership_id: m.id }, body: { from: "2026-10-12" } })).body).toMatchObject({ code: "not_available" });
    await teamMember("tutor@school.test", "Tutor", ["messages"], null);
    const tutor = await signIn("tutor@school.test");
    expect((await call("PUT", "/apps/{app_id}/members/{membership_id}/freeze", { token: tutor, params, body: { from: "2026-10-12" } })).body).toMatchObject({ code: "not_allowed" });
    expect((await call("PATCH", "/apps/{app_id}/questions/{question_id}", { token: tutor, params: { app_id: school.id, question_id: 1 }, body: { hidden: true } })).status).toBe(404);
  });
});

describe("64 pushes reach every phone of someone on several businesses", () => {
  it("sends a business's push to its people's phones whatever business they work on, with its name", async () => {
    const store = new MemoryStore();
    const cafe = await ownerOf(store, "leyla@cafe.test");
    const shop = await ownerOf(store, "omar@shop.test", "Omar Said");
    const cafeApp = await addApp(store, cafe.client, { appType: "store", appName: "Moda Café" });
    const otherCafeApp = await addApp(store, cafe.client, { appType: "store", appName: "Moda Bakery" });
    await addApp(store, shop.client, { appType: "store", appName: "Omar's Shop" });
    // Omar works for the café's orders on its first app only; Leyla's manager has everything.
    await store.saveTeamMember({ clientId: cafe.client.id, userId: shop.user.id, role: "staff", areas: ["orders"], appIds: [cafeApp.id], addedBy: cafe.user.email, createdAt: NOW, updatedAt: NOW });
    const phone = async (user: User, clientId: string, id: string, patch: Record<string, unknown> = {}) =>
      store.createOwnerDevice({
        id,
        userId: user.id,
        clientId,
        name: "Phone",
        platform: "android",
        appVersion: "1.0.0",
        language: "en",
        refreshHash: `hash-${id}`,
        refreshExpiresAt: days(30),
        sessionVersion: user.sessionVersion,
        pushToken: `token-${id}`,
        pushProvider: "fcm",
        pushPreferences: null,
        createdAt: NOW,
        lastSeenAt: NOW,
        ...patch,
      });
    await phone(cafe.user, cafe.client.id, "leyla-1");
    // Omar's phones: one working on his own shop, one on the café, one that turned orders off.
    await phone(shop.user, shop.client.id, "omar-own");
    await phone(shop.user, cafe.client.id, "omar-cafe");
    await phone(shop.user, shop.client.id, "omar-quiet", { pushPreferences: { new_order: false } });
    const sent: { targets: string[]; title: string; data: Record<string, string> }[] = [];
    const push: OwnerPushDeps = {
      store,
      now: NOW,
      account: ACCOUNT,
      send: (async (_a, targets, message) => {
        sent.push({ targets: (targets as string[]).slice().sort(), title: message.title, data: message.data as Record<string, string> });
        return { sent: targets.length, invalidTokens: [] };
      }) as typeof sendPush,
    };
    const order = { id: 42, totalCents: 125000, currency: "TRY" } as CatalogOrder;
    expect(await pushNewOrder(push, cafeApp, order)).toBe(3);
    // Each phone hears of it, named as its person knows the business (Me.businesses: the apps they work on).
    expect(sent.map((s) => [s.targets.join(), s.title, s.data.business_name]).sort()).toEqual([
      ["token-leyla-1", "New order 1042", "Moda Bakery"],
      ["token-omar-cafe", "New order 1042", "Moda Café"],
      ["token-omar-own", "Moda Café · New order 1042", "Moda Café"],
    ]);
    expect(sent.every((s) => s.data.business_id === cafe.client.id)).toBe(true);
    // Not his app at the café: nothing reaches Omar.
    sent.length = 0;
    expect(await pushNewOrder(push, otherCafeApp, order)).toBe(1);
    expect(sent.map((s) => s.targets)).toEqual([["token-leyla-1"]]);
    // Removed from the café's team: his phone working on the café is signed out there, his own gets nothing of it.
    await store.deleteTeamMember(cafe.client.id, shop.user.id);
    sent.length = 0;
    expect(await pushNewOrder(push, cafeApp, order)).toBe(1);
    expect(sent.map((s) => s.targets)).toEqual([["token-leyla-1"]]);
  });
});

describe("64 the Team page's activity in pages", () => {
  it("pages the activity newest first and filters it by person", async () => {
    const store = new MemoryStore();
    const actor = (n: number) => ({ id: `u${n % 2}`, name: n % 2 ? "Tutor" : "Owner", email: `p${n % 2}@x.test` });
    for (let i = 0; i < 120; i += 1) await recordCommunity(store, { clientId: "c1", appId: "a1", actor: actor(i), what: "answer", id: i, course: `Course ${i}` }, new Date(NOW.getTime() + i * 1000));
    await recordFreeze(store, { clientId: "c2", appId: "a2", actor: actor(0), membershipId: 1, name: "Elsewhere", frozen: true }, NOW);
    const first = await store.listTeamActivity("c1", { limit: 50 });
    expect(first.total).toBe(120);
    expect(first.items[0]!.summary).toBe('Answered a question in "Course 119"');
    const third = await store.listTeamActivity("c1", { limit: 50, offset: 100 });
    expect(third.items).toHaveLength(20);
    expect(third.items.at(-1)!.summary).toBe('Answered a question in "Course 0"');
    const tutor = await store.listTeamActivity("c1", { limit: 50, actorId: "u1" });
    expect(tutor.total).toBe(60);
    expect(tutor.items.every((x) => x.actorName === "Tutor")).toBe(true);
  });

  it("words the new lines in Arabic and Turkish", async () => {
    const store = new MemoryStore();
    const actor = { id: "u1", name: "Tutor", email: "t@x.test" };
    for (const what of ["hideQuestion", "showQuestion", "hideAnswer", "showAnswer"] as const) await recordCommunity(store, { clientId: "c1", appId: "a1", actor, what, id: 1, course: "Arabic" }, NOW);
    await recordFreeze(store, { clientId: "c1", appId: "a1", actor, membershipId: 1, name: "Sara", frozen: false }, NOW);
    const lines = (await store.listTeamActivity("c1", { limit: 10 })).items.map((a) => a.summary).sort();
    for (const lang of ["ar", "tr"] as const) for (const line of lines) expect(knownTranslator(lang)(line), `${lang}: ${line}`).not.toBe(line);
  });
});
