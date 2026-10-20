import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { appAreas } from "@/lib/app/areas";
import { checkInMember, findMembers } from "@/lib/bookings/door";
import { memberCode, memberCodeJson, memberKey, readMemberCode } from "@/lib/bookings/member-codes";
import { answerAsBusiness, ratingSummary, readReview } from "@/lib/courses/community";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_SETUP, DEFAULT_CATALOG_SETTINGS, type App, type Client, type CourseSetup, type Membership, type User } from "@/lib/data/types";
import { qrPayload, ticketKey } from "@/lib/events/codes";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedResult } from "@/lib/hosted/service";
import type { OwnerDeps } from "@/lib/owner/http";
import { pushNewQuestion, pushNewReview, type OwnerPushDeps } from "@/lib/owner/push";
import { handleOwner } from "@/lib/owner/service";
import { recordCommunity } from "@/lib/team/activity";
import { allowedAreas, pathPermission, teamCan } from "@/lib/team/permissions";
import { knownTranslator } from "@/i18n/dashboard";
import { expectContract } from "./contract";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 63 Course questions and reviews (the hosted API, the dashboard's rules and
 * the Owner API) and a gym's members at the door (member codes, once a day,
 * every outcome), with Phase 60's team boundaries. Checked against
 * docs/api/openapi.yaml and docs/api/owner.yaml.
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
      { id: 20, title: "Calligraphy", description: "", imageAssetId: null, priceCents: 0, categoryIds: [1], instructorName: null, level: null, active: true, createdAt: "2026-10-02T10:00:00.000Z", topics: [] },
    ],
    nextId: 30,
  };
}

async function ownerOf(store: MemoryStore, email: string): Promise<{ user: User; client: Client }> {
  const { user, client } = await registerClient(store, { name: "Leyla Kaya", email, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
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

describe("63 member codes", () => {
  it("are 12 unguessable characters per membership and app, typed in groups, in a QR code of their own", () => {
    const key = memberKey(SECRET, "app-1");
    const code = memberCode(key, "app-1", 42);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
    expect(memberCode(key, "app-1", 42)).toBe(code);
    expect(memberCode(key, "app-1", 43)).not.toBe(code);
    // Another app's key gives another code for the same membership number.
    expect(memberCode(memberKey(SECRET, "app-2"), "app-2", 42)).not.toBe(code);
    expect(memberCodeJson(key, "app-1", 42)).toEqual({ code, qr_payload: `YM1.42.${code}` });
    expect(readMemberCode(key, "app-1", `YM1.42.${code}`)).toEqual({ membershipId: 42 });
    expect(readMemberCode(key, "app-1", `YM1.43.${code}`)).toEqual({ error: "forged" });
    expect(readMemberCode(key, "app-1", `${code.slice(0, 4)}-${code.slice(4, 8)} ${code.slice(8).toLowerCase()}`)).toEqual({ code });
    expect(readMemberCode(key, "app-1", "YM1.x.ABC")).toEqual({ error: "not_a_code" });
    expect(readMemberCode(key, "app-1", "hello")).toEqual({ error: "not_a_code" });
    // A ticket's QR code isn't a member code.
    expect(readMemberCode(key, "app-1", qrPayload(ticketKey(SECRET, "app-1"), "app-1", "K7QM4XP2HD9W"))).toEqual({ error: "not_a_code" });
  });
});

describe("63 the gym's door", () => {
  let store: MemoryStore;
  let gym: App;
  let key: string;

  beforeEach(async () => {
    store = new MemoryStore();
    const { client } = await ownerOf(store, "gym@owner.test");
    gym = await addApp(store, client, { appType: "booking", vertical: "fitness", appName: "Iron Gym", connector: { kind: "bookings" }, bookingSetup: { ...DEFAULT_BOOKING_SETUP, rules: { ...DEFAULT_BOOKING_SETUP.rules, timezone: "Africa/Cairo" } } });
    key = memberKey(SECRET, gym.id);
  });

  const user = async (name: string, phone: string) => (await store.createHostedUser({ appId: gym.id, phone, name, email: null, city: null, now: NOW }))!;

  it("lets a member in once a day, by code, QR code or name, and says why others can't come in", async () => {
    const sara = await user("Sara Adel", "+201001112223");
    const m = await store.createMembership(membership(gym, sara.id));
    const second = await store.createMembership(membership(gym, sara.id, { planName: "Pool" }));
    const door = (input: { scanned?: string; membershipId?: number }, now = NOW) => checkInMember({ store, app: gym, key, ...input, by: "Front desk", now });

    expect(await door({ scanned: memberCode(key, gym.id, m.id) })).toMatchObject({ outcome: "admitted", member: { membershipId: m.id, name: "Sara Adel", planName: "Monthly unlimited", checkedInAt: NOW } });
    // The same day, with the QR code, by name, or with her other membership: in already, with when.
    const later = new Date(NOW.getTime() + 3_600_000);
    expect(await door({ scanned: `YM1.${m.id}.${memberCode(key, gym.id, m.id)}` }, later)).toMatchObject({ outcome: "already_in", member: { checkedInAt: NOW } });
    expect(await door({ membershipId: second.id }, later)).toMatchObject({ outcome: "already_in", member: { checkedInAt: NOW } });
    expect(await store.listMemberCheckIns(gym.id, "2026-10-12")).toHaveLength(1);
    // The next day in Cairo (UTC+3): in again.
    expect(await door({ membershipId: m.id }, new Date("2026-10-12T21:30:00Z"))).toMatchObject({ outcome: "admitted" });
    expect(await store.countMemberCheckIns(gym.id, new Date("2026-10-11T21:00:00Z"), new Date("2026-10-12T21:00:00Z"))).toBe(1);

    const ali = await user("Ali", "+201001112224");
    const ended = await store.createMembership(membership(gym, ali.id, { endsAt: days(-1) }));
    const cancelled = await store.createMembership(membership(gym, ali.id, { status: "cancelled" }));
    const future = await store.createMembership(membership(gym, ali.id, { startsAt: days(2), endsAt: days(32) }));
    const usedUp = await store.createMembership(membership(gym, ali.id, { period: "pack", creditsLeft: 0, endsAt: null }));
    expect(await door({ membershipId: ended.id })).toMatchObject({ outcome: "expired", member: { endsAt: days(-1) } });
    expect((await door({ membershipId: cancelled.id })).outcome).toBe("cancelled");
    expect((await door({ membershipId: future.id })).outcome).toBe("not_started");
    expect((await door({ membershipId: usedUp.id })).outcome).toBe("no_credits");
    expect(await store.listMemberCheckIns(gym.id, "2026-10-12")).toHaveLength(1);
    expect((await door({ scanned: `YM1.${ended.id}.${memberCode(key, gym.id, m.id)}` })).outcome).toBe("forged");
    expect((await door({ scanned: "ZZZZ-ZZZZ-ZZZZ" })).outcome).toBe("not_found");
    expect((await door({ scanned: "no" })).outcome).toBe("not_a_code");
    expect((await door({ membershipId: 99_999 })).outcome).toBe("not_found");
  });

  it("finds members by name, active ones first, with today's check-in", async () => {
    const sara = await user("Sara Adel", "+201001112223");
    const old = await store.createMembership(membership(gym, sara.id, { endsAt: days(-10), createdAt: days(-40) }));
    const now = await store.createMembership(membership(gym, sara.id));
    await checkInMember({ store, app: gym, key, membershipId: now.id, by: "Front desk", now: NOW });
    const found = await findMembers(store, gym, { query: "sara", now: NOW, offset: 0, limit: 10 });
    expect(found.items.map((r) => [r.membership.id, r.status, r.checkedInAt])).toEqual([
      [now.id, "active", NOW],
      [old.id, "expired", NOW],
    ]);
    expect((await findMembers(store, gym, { query: "nobody", now: NOW, offset: 0, limit: 10 })).total).toBe(0);
  });

  it("gives the code only to active members of a gym, in the customer's app", async () => {
    expect(appAreas(gym).memberCheckIn).toBe(true);
    expect(appAreas({ ...gym, vertical: "clinic" }).memberCheckIn).toBe(false);
  });
});

describe("63 course questions and reviews on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let client: Client;
  let sender: LogSender;
  let now: Date;
  let told: { kind: string; followUp?: boolean; text?: string }[];

  beforeEach(async () => {
    store = new MemoryStore();
    ({ client } = await ownerOf(store, "school@owner.test"));
    app = await addApp(store, client, { appType: "lms", appName: "Nour Academy", connector: { kind: "courses" }, courseSetup: academy(), catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    sender = new LogSender();
    now = NOW;
    told = [];
  });

  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; params?: string[]; query?: Record<string, string> } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const connector = new CoursesConnector({
      store,
      app,
      assetUrl: (id) => `https://yallapp.test/a/${id}`,
      platformUrl: "https://yallapp.test",
      onQuestion: async ({ followUp, text }) => void told.push({ kind: "question", followUp, text }),
      onReview: async () => void told.push({ kind: "review" }),
    });
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
    return registered.body as { access_token: string; user: { id: number } };
  }

  it("turns on reviews and questions for the app and each course", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { features: { reviews: boolean; qna: boolean } };
    expect(config.features).toMatchObject({ reviews: true, qna: true });
    expect((await call("GET", "/courses/{course_id}", { params: ["10"] })).body).toMatchObject({ qna: true, rating: null, rating_count: 0 });
  });

  it("takes reviews from enrolled students, with the summary, the business's reply and hidden ones for their author only", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const ayse = await signUp("5321234568", "Ayşe Kaya");
    expect((await call("PUT", "/courses/{course_id}/reviews/mine", { token: deniz.access_token, params: ["10"], body: { rating: 5 } })).body).toMatchObject({ code: "not_enrolled" });
    for (const s of [deniz, ayse]) await call("POST", "/courses/{course_id}/enroll", { token: s.access_token, params: ["10"] });
    expect((await call("PUT", "/courses/{course_id}/reviews/mine", { token: deniz.access_token, params: ["10"], body: { rating: 6 } })).status).toBe(400);
    const saved = await call("PUT", "/courses/{course_id}/reviews/mine", { token: deniz.access_token, params: ["10"], body: { rating: 5, text: "Clear and kind." } });
    expect(saved.body).toMatchObject({ rating: 5, text: "Clear and kind.", status: "approved", mine: true, reply: null, author: { name: "Deniz Aksoy" } });
    // Editing it again isn't a new review for the business.
    await call("PUT", "/courses/{course_id}/reviews/mine", { token: deniz.access_token, params: ["10"], body: { rating: 4, text: "Clear." } });
    await call("PUT", "/courses/{course_id}/reviews/mine", { token: ayse.access_token, params: ["10"], body: { rating: 1, text: "Spam spam" } });
    expect(told.filter((t) => t.kind === "review")).toHaveLength(2);

    const list = await call("GET", "/courses/{course_id}/reviews", { token: deniz.access_token, params: ["10"] });
    expect(list.body).toMatchObject({ total: 2, summary: { rating: 2.5, rating_count: 2, counts: { "1": 1, "4": 1 } }, can_review: true, mine: { rating: 4, mine: true } });

    const review = (await store.getCourseReviewOf(app.id, 10, ayse.user.id))!;
    await store.updateCourseReview(app.id, review.id, { hidden: true });
    const mineReview = (await store.getCourseReviewOf(app.id, 10, deniz.user.id))!;
    await store.updateCourseReview(app.id, mineReview.id, { replyText: "Thank you, Deniz!", replyAt: NOW });
    const after = (await call("GET", "/courses/{course_id}/reviews", { token: deniz.access_token, params: ["10"] })).body as { items: { text: string; reply: unknown }[]; summary: unknown };
    expect(after.items).toEqual([expect.objectContaining({ text: "Clear.", reply: { text: "Thank you, Deniz!", created_at: NOW.toISOString() } })]);
    expect(after.summary).toMatchObject({ rating: 4, rating_count: 1 });
    expect((await call("GET", "/courses/{course_id}/reviews", { token: ayse.access_token, params: ["10"] })).body).toMatchObject({ mine: { status: "hidden", mine: true } });
    expect((await call("GET", "/courses", {})).body).toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ id: 10, rating: 4, rating_count: 1 })]) });
  });

  it("lets enrolled students ask and answer, and the business answer in its name", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    expect((await call("GET", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"] })).body).toMatchObject({ code: "not_enrolled" });
    expect((await call("GET", "/courses/{course_id}/questions", { params: ["10"] })).status).toBe(401);
    await call("POST", "/courses/{course_id}/enroll", { token: deniz.access_token, params: ["10"] });
    expect((await call("POST", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"], body: { text: " " } })).status).toBe(400);
    const asked = await call("POST", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"], body: { text: "How do I say thank you?" } });
    expect(asked).toMatchObject({ status: 201, body: { text: "How do I say thank you?", answer_count: 0, mine: true } });
    const id = (asked.body as { id: number }).id;
    expect(told).toEqual([{ kind: "question", followUp: false, text: "How do I say thank you?" }]);

    const question = (await store.getCourseQuestion(app.id, id))!;
    expect(question.status).toBe("open");
    const answered = await answerAsBusiness({ store, app, now, account: null }, question, academy().courses[0]!, "Shukran!");
    expect(answered).toMatchObject({ ok: true, pushed: 0 });
    expect((await store.getCourseQuestion(app.id, id))!).toMatchObject({ status: "answered", answerCount: 1 });
    // The student is told in their inbox.
    const inbox = await store.listHostedNotifications({ appId: app.id, userId: deniz.user.id, since: new Date(0), page: 1, perPage: 5 });
    expect(inbox.items[0]).toMatchObject({ title: "Your question was answered", body: "Arabic for Beginners: Shukran!" });

    const thread = await call("GET", "/questions/{question_id}", { token: deniz.access_token, params: [String(id)] });
    expect(thread.body).toMatchObject({ answer_count: 1, answers: [{ text: "Shukran!", author: { name: "Nour Saleh", instructor: true }, mine: false }] });
    const again = await call("POST", "/questions/{question_id}/answers", { token: deniz.access_token, params: [String(id)], body: { text: "And please?" } });
    expect(again).toMatchObject({ status: 201, body: { text: "And please?", mine: true } });
    expect((await store.getCourseQuestion(app.id, id))!.status).toBe("open");
    expect(told.at(-1)).toEqual({ kind: "question", followUp: true, text: "And please?" });
    // Another course's student can't read it.
    const other = await signUp("5321234569", "Other");
    expect((await call("GET", "/questions/{question_id}", { token: other.access_token, params: [String(id)] })).status).toBe(403);
  });

  it("limits how much a student writes in an hour", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    await call("POST", "/courses/{course_id}/enroll", { token: deniz.access_token, params: ["10"] });
    for (let i = 0; i < 20; i += 1) expect((await call("POST", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"], body: { text: `Q${i}` } })).status).toBe(201);
    expect((await call("POST", "/courses/{course_id}/questions", { token: deniz.access_token, params: ["10"], body: { text: "One more" } })).status).toBe(429);
  });

  it("reads reviews and summaries", () => {
    expect(readReview({ rating: 3 })).toEqual({ ok: true, rating: 3, text: "" });
    expect(readReview({ rating: 2.5 })).toMatchObject({ ok: false });
    expect(readReview({ rating: 4, text: "x".repeat(2001) })).toMatchObject({ ok: false });
    expect(ratingSummary([{ courseId: 1, rating: 5, count: 2 }, { courseId: 1, rating: 4, count: 1 }, { courseId: 2, rating: 1, count: 1 }], 1)).toEqual({ rating: 4.7, count: 3, counts: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 } });
  });
});

describe("63 the Owner API: questions, reviews and the door", () => {
  let store: MemoryStore;
  let owner: User;
  let client: Client;
  let school: App;
  let gym: App;
  let theirs: App;
  let pushes: { targets: unknown[]; title: string; data: Record<string, string> }[];

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
    sendPush: (async (_a, targets, message) => {
      pushes.push({ targets, title: message.title, data: message.data as Record<string, string> });
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush,
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

  async function teamMember(email: string, name: string, role: "manager" | "staff", areas: string[], appIds: string[] | null) {
    const user = await store.createUser({ email, name, passwordHash: await hashPassword(PASSWORD), now: NOW });
    await store.saveTeamMember({ clientId: client.id, userId: user.id, role, areas, appIds, addedBy: owner.email, createdAt: NOW, updatedAt: NOW });
    return user;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    pushes = [];
    ({ user: owner, client } = await ownerOf(store, "leyla@school.test"));
    school = await addApp(store, client, { appType: "lms", appName: "Nour Academy", connector: { kind: "courses" }, courseSetup: academy(), catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    gym = await addApp(store, client, { appType: "booking", vertical: "fitness", appName: "Iron Gym", connector: { kind: "bookings" }, bookingSetup: { ...DEFAULT_BOOKING_SETUP } });
    theirs = await addApp(store, (await ownerOf(store, "other@else.test")).client, { appType: "lms", appName: "Not yours", connector: { kind: "courses" }, courseSetup: academy() });
  });

  async function student(app: App, name: string, phone: string) {
    return (await store.createHostedUser({ appId: app.id, phone, name, email: null, city: null, now: NOW }))!;
  }

  it("lists questions, answers one with an activity line, and says what waits on Today", async () => {
    const token = await signIn("leyla@school.test");
    const deniz = await student(school, "Deniz", "+905321234567");
    const q = await store.createCourseQuestion({ appId: school.id, courseId: 10, userId: deniz.id, text: "How do I say thank you?", status: "open", answerCount: 0, createdAt: NOW, updatedAt: NOW });
    const me = await call("GET", "/me", { token });
    const features = (me.body.apps as { id: string; features: Record<string, boolean> }[]).find((a) => a.id === school.id)!.features;
    expect(features).toMatchObject({ questions: true, reviews: true, member_check_in: false, inquiries: false });

    const today = await call("GET", "/apps/{app_id}/today", { token, params: { app_id: school.id } });
    expect(today.body.needs_you).toEqual([{ kind: "questions_to_answer", count: 1, title: "1 course question to answer", notice_id: null }]);
    const list = await call("GET", "/apps/{app_id}/questions", { token, params: { app_id: school.id }, query: { status: "open" } });
    expect(list.body).toMatchObject({ open: 1, total: 1, items: [{ id: q.id, course_title: "Arabic for Beginners", person: "Deniz", status: "open" }] });
    expect((await call("POST", "/apps/{app_id}/questions/{question_id}/answers", { token, params: { app_id: school.id, question_id: q.id }, body: { text: "" } })).status).toBe(400);
    const answered = await call("POST", "/apps/{app_id}/questions/{question_id}/answers", { token, params: { app_id: school.id, question_id: q.id }, body: { text: "Shukran!" } });
    expect(answered).toMatchObject({ status: 201, body: { status: "answered", answer_count: 1, answers: [{ from: "business", name: "Nour Saleh", text: "Shukran!" }] } });
    expect((await store.listTeamActivity(client.id, { limit: 1 })).items[0]).toMatchObject({ action: "question.answer", summary: 'Answered a question in "Arabic for Beginners"' });
    expect((await call("GET", "/apps/{app_id}/today", { token, params: { app_id: school.id } })).body.needs_you).toEqual([]);
    // Another client's app is 404, like everything else.
    expect((await call("GET", "/apps/{app_id}/questions", { token, params: { app_id: theirs.id } })).status).toBe(404);
    expect((await call("GET", "/apps/{app_id}/questions", { token, params: { app_id: gym.id } })).body).toMatchObject({ code: "not_available" });
    // In Arabic, the answer's error and Today's line.
    expect((await call("POST", "/apps/{app_id}/questions/{question_id}/answers", { token, params: { app_id: school.id, question_id: q.id }, body: { text: "" }, lang: "ar" })).body).toMatchObject({ errors: { text: "اكتب إجابتك." } });
  });

  it("replies to, hides and shows reviews", async () => {
    const token = await signIn("leyla@school.test");
    const deniz = await student(school, "Deniz", "+905321234567");
    const review = await store.saveCourseReview({ appId: school.id, courseId: 20, userId: deniz.id, rating: 2, text: "Too fast.", now: NOW });
    const list = await call("GET", "/apps/{app_id}/reviews", { token, params: { app_id: school.id }, query: { filter: "unreplied" } });
    expect(list.body).toMatchObject({ rating: 2, rating_count: 1, items: [{ id: review.id, course_title: "Calligraphy", person: "Deniz", hidden: false, reply: null }] });
    const replied = await call("PUT", "/apps/{app_id}/reviews/{review_id}/reply", { token, params: { app_id: school.id, review_id: review.id }, body: { text: "We'll add slower lessons." } });
    expect(replied.body).toMatchObject({ reply: { text: "We'll add slower lessons." } });
    expect((await call("GET", "/apps/{app_id}/reviews", { token, params: { app_id: school.id }, query: { filter: "unreplied" } })).body.total).toBe(0);
    const hidden = await call("PATCH", "/apps/{app_id}/reviews/{review_id}", { token, params: { app_id: school.id, review_id: review.id }, body: { hidden: true } });
    expect(hidden.body).toMatchObject({ hidden: true });
    expect((await call("GET", "/apps/{app_id}/reviews", { token, params: { app_id: school.id } })).body).toMatchObject({ rating: null, rating_count: 0, total: 1 });
    await call("PATCH", "/apps/{app_id}/reviews/{review_id}", { token, params: { app_id: school.id, review_id: review.id }, body: { hidden: false } });
    expect((await call("DELETE", "/apps/{app_id}/reviews/{review_id}/reply", { token, params: { app_id: school.id, review_id: review.id } })).body).toMatchObject({ reply: null });
    expect((await store.listTeamActivity(client.id, { limit: 5 })).items.map((a) => a.action)).toEqual(["review.show", "review.hide", "review.reply"]);
    expect((await call("PATCH", "/apps/{app_id}/reviews/{review_id}", { token, params: { app_id: school.id, review_id: review.id }, body: { hidden: "yes" } })).status).toBe(400);
    expect((await call("PATCH", "/apps/{app_id}/reviews/{review_id}", { token, params: { app_id: school.id, review_id: 9999 }, body: { hidden: true } })).status).toBe(404);
  });

  it("checks members in at the door, lists today's and counts them on Today", async () => {
    const token = await signIn("leyla@school.test");
    const sara = await student(gym, "Sara Adel", "+201001112223");
    const m = await store.createMembership(membership(gym, sara.id));
    const code = memberCode(memberKey(SECRET, gym.id), gym.id, m.id);
    const first = await call("POST", "/apps/{app_id}/members/check-in", { token, params: { app_id: gym.id }, body: { code: `YM1.${m.id}.${code}` } });
    expect(first.body).toMatchObject({ outcome: "admitted", admitted: true, message: "Welcome in", member: { membership_id: m.id, name: "Sara Adel", checked_in_at: NOW.toISOString() } });
    const twice = await call("POST", "/apps/{app_id}/members/check-in", { token, params: { app_id: gym.id }, body: { code }, lang: "ar" });
    expect(twice.body).toMatchObject({ outcome: "already_in", admitted: false });
    expect(twice.body.message).toMatch(/^سجّل حضوره اليوم من قبل الساعة/);
    expect((await call("POST", "/apps/{app_id}/members/check-in", { token, params: { app_id: gym.id }, body: {} })).status).toBe(400);
    const visits = await call("GET", "/apps/{app_id}/members/check-ins", { token, params: { app_id: gym.id } });
    expect(visits.body).toMatchObject({ date: "2026-10-12", count: 1, items: [{ membership_id: m.id, name: "Sara Adel", plan_name: "Monthly unlimited", by: "Leyla Kaya" }] });
    const found = await call("GET", "/apps/{app_id}/members", { token, params: { app_id: gym.id }, query: { q: "sara" } });
    expect(found.body).toMatchObject({ total: 1, items: [{ membership_id: m.id, status: "active", checked_in_at: NOW.toISOString() }] });
    expect((await call("GET", "/apps/{app_id}/today", { token, params: { app_id: gym.id } })).body.counts).toMatchObject({ member_check_ins: 1 });
    expect((await call("GET", "/apps/{app_id}/members", { token, params: { app_id: school.id } })).body).toMatchObject({ code: "not_available" });
  });

  it("follows the team's roles and apps (60)", async () => {
    await teamMember("tutor@school.test", "Tutor", "staff", ["messages"], [school.id]);
    await teamMember("desk@school.test", "Desk", "staff", ["bookings"], [gym.id]);
    const tutor = await signIn("tutor@school.test");
    const desk = await signIn("desk@school.test");
    const tutorApps = (await call("GET", "/me", { token: tutor })).body.apps as { id: string; features: Record<string, boolean> }[];
    expect(tutorApps.map((a) => a.id)).toEqual([school.id]);
    expect(tutorApps[0]!.features).toMatchObject({ questions: true, reviews: false, courses: false });
    expect((await call("GET", "/apps/{app_id}/questions", { token: tutor, params: { app_id: school.id } })).status).toBe(200);
    expect((await call("GET", "/apps/{app_id}/reviews", { token: tutor, params: { app_id: school.id } })).body).toMatchObject({ code: "not_allowed" });
    expect((await call("GET", "/apps/{app_id}/members/check-ins", { token: tutor, params: { app_id: gym.id } })).status).toBe(404);
    expect((await call("GET", "/apps/{app_id}/members/check-ins", { token: desk, params: { app_id: gym.id } })).status).toBe(200);
    expect((await call("GET", "/apps/{app_id}/questions", { token: desk, params: { app_id: school.id } })).status).toBe(404);
  });

  it("pushes a new question to people with Messages and a review to people with Catalog & content", async () => {
    const tutor = await teamMember("tutor@school.test", "Tutor", "staff", ["messages"], null);
    const editor = await teamMember("editor@school.test", "Editor", "staff", ["catalog"], null);
    for (const email of ["leyla@school.test", "tutor@school.test", "editor@school.test"]) {
      const token = await signIn(email);
      await call("PUT", "/me/push-token", { token, body: { token: `fcm-${email}` } });
    }
    const push: OwnerPushDeps = { store, now: NOW, account: ACCOUNT, send: deps().sendPush };
    const deniz = await student(school, "Deniz", "+905321234567");
    const question = await store.createCourseQuestion({ appId: school.id, courseId: 10, userId: deniz.id, text: "Hi?", status: "open", answerCount: 0, createdAt: NOW, updatedAt: NOW });
    expect(await pushNewQuestion(push, school, { question, course: { title: "Arabic for Beginners" }, name: "Deniz", text: "Hi?", followUp: false })).toBe(2);
    expect(pushes.at(-1)).toMatchObject({ title: "New question in Arabic for Beginners", data: { kind: "new_message", question_id: String(question.id), app_id: school.id } });
    const review = await store.saveCourseReview({ appId: school.id, courseId: 10, userId: deniz.id, rating: 5, text: "Great", now: NOW });
    expect(await pushNewReview(push, school, { review, course: { title: "Arabic for Beginners" }, name: "Deniz" })).toBe(2);
    expect(pushes.at(-1)).toMatchObject({ title: "New review of Arabic for Beginners", data: { kind: "new_review", review_id: String(review.id) } });
    void tutor;
    void editor;
  });
});

describe("63 permissions, the dashboard's pages and the activity's words", () => {
  it("maps the new pages and areas", () => {
    expect(pathPermission("/dashboard/courses/questions")).toBe("messages");
    expect(pathPermission("/dashboard/courses/questions/4")).toBe("messages");
    expect(pathPermission("/dashboard/courses/reviews")).toBe("catalog");
    expect(pathPermission("/dashboard/members/check-in")).toBe("bookings");
    const staff = { role: "staff" as const, areas: ["messages" as const], appIds: null };
    const areas = allowedAreas({ ...appAreas({ connector: { kind: "courses" }, backend: "hosted", vertical: null, catalogSettings: null } as never) }, staff, "a");
    expect(areas).toMatchObject({ questions: true, reviews: false, courses: false });
    expect(teamCan({ role: "manager", areas: [], appIds: null }, "bookings", "a")).toBe(true);
  });

  it("writes the activity once in English and shows it in Arabic and Turkish", async () => {
    const store = new MemoryStore();
    const actor = { id: "u1", name: "Tutor", email: "t@x.test" };
    await recordCommunity(store, { clientId: "c1", appId: "a1", actor, what: "answer", id: 1, course: "Arabic for Beginners" }, NOW);
    await recordCommunity(store, { clientId: "c1", appId: "a1", actor, what: "reply", id: 2, course: "Arabic for Beginners" }, NOW);
    await recordCommunity(store, { clientId: "c1", appId: "a1", actor, what: "hide", id: 2, course: "Arabic for Beginners" }, NOW);
    await recordCommunity(store, { clientId: "c1", appId: "a1", actor, what: "show", id: 2, course: "Arabic for Beginners" }, NOW);
    const lines = (await store.listTeamActivity("c1", { limit: 10 })).items.map((a) => a.summary);
    expect(lines.map(knownTranslator("ar"))).toEqual([
      "أظهر تقييمًا لـ «Arabic for Beginners» مجددًا",
      "أخفى تقييمًا لـ «Arabic for Beginners»",
      "ردّ على تقييم لـ «Arabic for Beginners»",
      "أجاب عن سؤال في «Arabic for Beginners»",
    ]);
    expect(knownTranslator("tr")(lines[3]!)).toBe("“Arabic for Beginners” kursunda bir soruyu yanıtladı");
  });
});
