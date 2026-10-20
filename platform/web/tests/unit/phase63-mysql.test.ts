import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { checkInMember } from "@/lib/bookings/door";
import { memberCode, memberCodeHash, memberKey } from "@/lib/bookings/member-codes";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { DEFAULT_BOOKING_SETUP, type App } from "@/lib/data/types";

/**
 * 63 On MySQL or MariaDB: a member scanned at two doors (eight server
 * instances, each its own connection) at the same moment is counted once for
 * the day; reviews are one per student and course; answers move a question's
 * count and status together. Runs only with YALLAPP_TEST_DATABASE_URL (a
 * database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-12T10:00:00Z");
const SECRET = "test-signing-secret-0123456789abcdef0123456789";

describe.skipIf(!url)("63 members and course questions on MySQL", () => {
  const pools = Array.from({ length: 8 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup(kind: "bookings" | "courses") {
    const store = stores[0]!;
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(store, { name: "Iron Gym", email: `p63-${suffix}@gym.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App =
      kind === "bookings"
        ? { ...newApp(client.id, null, NOW, "booking", "fitness"), backend: "hosted", connector: { kind: "bookings" }, bookingSetup: { ...DEFAULT_BOOKING_SETUP } }
        : { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", connector: { kind: "courses" } };
    await store.createApp(app);
    const user = (await store.createHostedUser({ appId: app.id, phone: `+90532${Math.floor(Math.random() * 1e7)}`, name: "Sara", email: null, city: null, now: NOW }))!;
    return { store, app, user };
  }

  it("counts a member once when eight doors scan them at the same moment", async () => {
    const { store, app, user } = await setup("bookings");
    const membership = await store.createMembership({ appId: app.id, userId: user.id, planId: 1, planName: "Monthly", period: "month", creditsLeft: null, status: "active", startsAt: new Date(NOW.getTime() - 86_400_000), endsAt: new Date(NOW.getTime() + 20 * 86_400_000), orderId: null, createdAt: NOW, updatedAt: NOW });
    const key = memberKey(SECRET, app.id);
    const code = memberCode(key, app.id, membership.id);
    const scans = await Promise.all(stores.map((s, i) => checkInMember({ store: s, app, key, scanned: i % 2 ? code : `YM1.${membership.id}.${code}`, by: `Door ${i}`, now: NOW })));
    expect(scans.filter((s) => s.outcome === "admitted")).toHaveLength(1);
    expect(scans.filter((s) => s.outcome === "already_in")).toHaveLength(7);
    const admittedAt = scans.find((s) => s.outcome === "admitted")!.member!.checkedInAt!.getTime();
    expect(scans.every((s) => s.member!.checkedInAt!.getTime() === admittedAt)).toBe(true);
    expect(await store.listMemberCheckIns(app.id, "2026-10-12")).toHaveLength(1);
    expect(await store.countMemberCheckInsOnDay(app.id, "2026-10-12")).toBe(1);
    // The next day in Istanbul: once again.
    expect((await checkInMember({ store, app, key, membershipId: membership.id, by: "Door", now: new Date("2026-10-12T21:30:00Z") })).outcome).toBe("admitted");
    // Deleting the account takes its check-ins with it.
    await store.deleteHostedUser(app.id, user.id);
    expect(await store.listMemberCheckIns(app.id, "2026-10-12")).toHaveLength(0);
  });

  it("keeps one review per student and course, and the business's reply when it is edited", async () => {
    const { store, app, user } = await setup("courses");
    const first = await store.saveCourseReview({ appId: app.id, courseId: 10, userId: user.id, rating: 3, text: "OK", now: NOW });
    await store.updateCourseReview(app.id, first.id, { replyText: "Thanks!", replyAt: NOW, updatedAt: NOW });
    const later = new Date(NOW.getTime() + 60_000);
    const edited = await store.saveCourseReview({ appId: app.id, courseId: 10, userId: user.id, rating: 5, text: "Great now", now: later });
    expect(edited).toMatchObject({ id: first.id, rating: 5, text: "Great now", replyText: "Thanks!", hidden: false, createdAt: NOW, updatedAt: later });
    await stores[1]!.saveCourseReview({ appId: app.id, courseId: 20, userId: user.id, rating: 1, text: "", now: NOW });
    expect((await store.countCourseRatings(app.id)).sort((a, b) => a.courseId - b.courseId)).toEqual([
      { courseId: 10, rating: 5, count: 1 },
      { courseId: 20, rating: 1, count: 1 },
    ]);
    await store.updateCourseReview(app.id, first.id, { hidden: true });
    expect(await store.countCourseRatings(app.id)).toEqual([{ courseId: 20, rating: 1, count: 1 }]);
    expect((await store.listCourseReviews({ appId: app.id, hidden: true, offset: 0, limit: 10 })).items.map((r) => r.id)).toEqual([first.id]);
    expect((await store.listCourseReviews({ appId: app.id, unreplied: true, offset: 0, limit: 10 })).total).toBe(1);
  });

  it("adds answers and moves the question's count and status together, from several servers", async () => {
    const { store, app, user } = await setup("courses");
    const question = await store.createCourseQuestion({ appId: app.id, courseId: 10, userId: user.id, text: "Why?", status: "open", createdAt: NOW, updatedAt: NOW });
    await Promise.all(stores.map((s, i) => s.addCourseAnswer({ appId: app.id, questionId: question.id, userId: i === 0 ? null : user.id, text: `A${i}`, createdAt: new Date(NOW.getTime() + i * 1000) }, i === 0 ? "answered" : "open")));
    const saved = (await store.getCourseQuestion(app.id, question.id))!;
    expect(saved.answerCount).toBe(8);
    expect(await store.listCourseAnswers(app.id, question.id)).toHaveLength(8);
    expect((await store.listCourseQuestions({ appId: app.id, order: "updated", offset: 0, limit: 5 })).items[0]!.id).toBe(question.id);
    expect((await store.listCourseQuestions({ appId: app.id, courseIds: [], order: "created", offset: 0, limit: 5 })).total).toBe(0);
    // A student who answered deletes their account: their answers go, and the count follows.
    const other = (await store.createHostedUser({ appId: app.id, phone: `+90533${Math.floor(Math.random() * 1e7)}`, name: "Other", email: null, city: null, now: NOW }))!;
    await store.addCourseAnswer({ appId: app.id, questionId: question.id, userId: other.id, text: "Me too", createdAt: NOW }, "open");
    expect((await store.getCourseQuestion(app.id, question.id))!.answerCount).toBe(9);
    await store.deleteHostedUser(app.id, other.id);
    expect((await store.getCourseQuestion(app.id, question.id))!.answerCount).toBe(8);
    await store.deleteHostedUser(app.id, user.id);
    expect(await store.getCourseQuestion(app.id, question.id)).toBeNull();
  });

  it("pages memberships in SQL, those who can get in first; finds a code by its hash", async () => {
    const { store, app, user } = await setup("bookings");
    const make = (patch: Record<string, unknown>) =>
      store.createMembership({ appId: app.id, userId: user.id, planId: 1, planName: "Monthly", period: "month", creditsLeft: null, status: "active", startsAt: new Date(NOW.getTime() - 86_400_000), endsAt: new Date(NOW.getTime() + 20 * 86_400_000), orderId: null, createdAt: NOW, updatedAt: NOW, ...patch });
    const ended = await make({ endsAt: new Date(NOW.getTime() - 1000), createdAt: new Date(NOW.getTime() + 5000) });
    const cancelled = await make({ status: "cancelled", createdAt: new Date(NOW.getTime() + 4000) });
    const future = await make({ startsAt: new Date(NOW.getTime() + 86_400_000) });
    const actives = [];
    for (let i = 0; i < 12; i += 1) actives.push(await make({ createdAt: new Date(NOW.getTime() - i * 1000) }));
    const page1 = await store.listMembershipsPage({ appId: app.id, now: NOW, offset: 0, limit: 10 });
    expect(page1.total).toBe(15);
    expect(page1.items.map((m) => m.id)).toEqual(actives.slice(0, 10).map((m) => m.id));
    const page2 = await store.listMembershipsPage({ appId: app.id, now: NOW, offset: 10, limit: 10 });
    expect(page2.items.map((m) => m.id).slice(0, 2)).toEqual(actives.slice(10).map((m) => m.id));
    expect(page2.items.slice(2).map((m) => m.id).sort()).toEqual([ended.id, cancelled.id, future.id].sort());
    expect((await store.listMembershipsPage({ appId: app.id, userIds: [], now: NOW, offset: 0, limit: 10 })).total).toBe(0);
    // Only those that can get in and have no hash yet are looked through.
    expect((await store.listMembershipsWithoutCodeHash(app.id, NOW, 100)).map((m) => m.id).sort()).toEqual(actives.map((m) => m.id).sort());
    const key = memberKey(SECRET, app.id);
    const code = memberCode(key, app.id, actives[11]!.id);
    expect((await checkInMember({ store, app, key, scanned: code, by: "Desk", now: NOW })).outcome).toBe("admitted");
    expect((await store.findMembershipByCodeHash(app.id, memberCodeHash(key, app.id, code)))!.id).toBe(actives[11]!.id);
    expect(await store.listMembershipsWithoutCodeHash(app.id, NOW, 100)).toHaveLength(11);
  });
});
