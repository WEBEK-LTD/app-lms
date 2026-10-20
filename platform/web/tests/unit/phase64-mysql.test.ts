import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { checkInMember, findMembers } from "@/lib/bookings/door";
import { freezeMembership, unfreezeMembership } from "@/lib/bookings/freeze";
import { memberKey } from "@/lib/bookings/member-codes";
import { questionFilter } from "@/lib/courses/community";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { DEFAULT_BOOKING_SETUP, type App, type Membership } from "@/lib/data/types";
import { recordFreeze } from "@/lib/team/activity";

/**
 * 64 On MySQL or MariaDB: eight people freezing (or unfreezing) a membership
 * at the same moment move its end once; a freeze without an end holds the
 * membership past its end; hidden questions and answers stay out of the
 * students' lists and counts; the Team page's activity pages and filters by
 * person. Runs only with YALLAPP_TEST_DATABASE_URL (a database with the
 * migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-12T10:00:00Z");
const DAY = 86_400_000;
const SECRET = "test-signing-secret-0123456789abcdef0123456789";

describe.skipIf(!url)("64 frozen memberships, hidden questions and the activity on MySQL", () => {
  const pools = Array.from({ length: 8 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup(kind: "bookings" | "courses") {
    const store = stores[0]!;
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(store, { name: "Iron Gym", email: `p64-${suffix}@gym.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App =
      kind === "bookings"
        ? { ...newApp(client.id, null, NOW, "booking", "fitness"), backend: "hosted", connector: { kind: "bookings" }, bookingSetup: { ...DEFAULT_BOOKING_SETUP, rules: { ...DEFAULT_BOOKING_SETUP.rules, timezone: "Europe/Istanbul" } } }
        : { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", connector: { kind: "courses" } };
    await store.createApp(app);
    const user = (await store.createHostedUser({ appId: app.id, phone: `+90532${Math.floor(Math.random() * 1e7)}`, name: "Sara", email: null, city: null, now: NOW }))!;
    return { store, app, user, client };
  }

  const membership = (app: App, userId: number, patch: Partial<Membership> = {}): Omit<Membership, "id"> => ({
    appId: app.id,
    userId,
    planId: 1,
    planName: "Monthly",
    period: "month",
    creditsLeft: null,
    status: "active",
    startsAt: new Date(NOW.getTime() - DAY),
    endsAt: new Date(NOW.getTime() + 20 * DAY),
    orderId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  });

  it("freezes once and unfreezes once when eight people do it at the same moment", async () => {
    const { app, user } = await setup("bookings");
    const m = await stores[0]!.createMembership(membership(app, user.id));
    const frozen = await Promise.all(stores.map((s) => freezeMembership(s, app, m, { from: "2026-10-12", until: "2026-10-22" }, NOW)));
    expect(frozen.filter((r) => r.ok)).toHaveLength(1);
    const after = (await stores[0]!.getMembership(app.id, m.id))!;
    expect(after.endsAt!.getTime() - m.endsAt!.getTime()).toBe(10 * DAY);
    expect(after.frozenFrom).toEqual(new Date("2026-10-11T21:00:00Z"));
    expect(after.frozenUntil).toEqual(new Date("2026-10-21T21:00:00Z"));
    expect((await checkInMember({ store: stores[0]!, app, key: memberKey(SECRET, app.id), membershipId: m.id, by: "Desk", now: NOW })).outcome).toBe("frozen");
    // Back on the 15th: three days frozen.
    const on15 = new Date("2026-10-15T07:00:00Z");
    const back = await Promise.all(stores.map((s) => unfreezeMembership(s, app, after, on15)));
    expect(back.filter((r) => r.ok)).toHaveLength(1);
    const done = (await stores[0]!.getMembership(app.id, m.id))!;
    expect(done).toMatchObject({ frozenFrom: null, frozenUntil: null });
    expect(done.endsAt!.getTime() - m.endsAt!.getTime()).toBe(3 * DAY);
  });

  it("holds a membership frozen without an end past its end, lists it after those who can get in, and finds its code without a hash", async () => {
    const { store, app, user } = await setup("bookings");
    const other = (await store.createHostedUser({ appId: app.id, phone: `+90533${Math.floor(Math.random() * 1e7)}`, name: "Ali", email: null, city: null, now: NOW }))!;
    const m = await store.createMembership(membership(app, user.id, { endsAt: new Date(NOW.getTime() + 2 * DAY), createdAt: new Date(NOW.getTime() + 1000) }));
    await store.createMembership(membership(app, other.id));
    expect((await freezeMembership(store, app, m, { from: "2026-10-12", until: null }, NOW)).ok).toBe(true);
    const later = new Date(NOW.getTime() + 10 * DAY);
    const rows = await findMembers(store, app, { now: later, offset: 0, limit: 10 });
    expect(rows.items.map((r) => [r.membership.userId, r.status])).toEqual([
      [other.id, "active"],
      [user.id, "frozen"],
    ]);
    expect((await store.listMembershipsWithoutCodeHash(app.id, later, 10)).map((x) => x.id)).toContain(m.id);
    // Unfrozen ten days later: the end moves by ten days.
    const frozen = (await store.getMembership(app.id, m.id))!;
    await unfreezeMembership(store, app, frozen, later);
    expect((await store.getMembership(app.id, m.id))!.endsAt!.getTime() - m.endsAt!.getTime()).toBe(10 * DAY);
  });

  it("keeps hidden questions and answers out of the students' lists and counts", async () => {
    const { store, app, user } = await setup("courses");
    const other = (await store.createHostedUser({ appId: app.id, phone: `+90534${Math.floor(Math.random() * 1e7)}`, name: "Deniz", email: null, city: null, now: NOW }))!;
    const spam = await store.createCourseQuestion({ appId: app.id, courseId: 10, userId: user.id, text: "Spam", status: "open", createdAt: NOW, updatedAt: NOW });
    const real = await store.createCourseQuestion({ appId: app.id, courseId: 10, userId: other.id, text: "Why?", status: "open", createdAt: NOW, updatedAt: new Date(NOW.getTime() + 1000) });
    expect(spam.hidden).toBe(false);
    expect(await store.setCourseQuestionHidden(app.id, spam.id, true)).toBe(true);
    expect(await store.setCourseQuestionHidden(app.id, 999_999_999, true)).toBe(false);
    const list = (viewerId: number) => store.listCourseQuestions({ appId: app.id, courseIds: [10], viewerId, order: "created", offset: 0, limit: 10 });
    expect((await list(other.id)).items.map((q) => q.id)).toEqual([real.id]);
    expect((await list(user.id)).total).toBe(2);
    expect((await store.listCourseQuestions({ appId: app.id, ...questionFilter("open"), order: "updated", offset: 0, limit: 10 })).total).toBe(1);
    expect((await store.listCourseQuestions({ appId: app.id, ...questionFilter("hidden"), order: "updated", offset: 0, limit: 10 })).items.map((q) => q.id)).toEqual([spam.id]);

    const rude = await store.addCourseAnswer({ appId: app.id, questionId: real.id, userId: user.id, text: "Rude", createdAt: NOW }, "open");
    const ours = await store.addCourseAnswer({ appId: app.id, questionId: real.id, userId: null, text: "Because.", createdAt: NOW }, "answered");
    expect((await store.getCourseQuestion(app.id, real.id))!.answerCount).toBe(2);
    expect(await store.setCourseAnswerHidden(app.id, real.id, rude.id, true)).toBe(true);
    // The business's own answers aren't hidden, nor an answer under another question.
    expect(await store.setCourseAnswerHidden(app.id, real.id, ours.id, true)).toBe(false);
    expect(await store.setCourseAnswerHidden(app.id, spam.id, rude.id, true)).toBe(false);
    expect((await store.getCourseQuestion(app.id, real.id))!.answerCount).toBe(1);
    expect((await list(other.id)).items[0]!.answerCount).toBe(1);
    expect((await store.listCourseAnswers(app.id, real.id)).map((a) => [a.text, a.hidden])).toEqual([
      ["Rude", true],
      ["Because.", false],
    ]);
  });

  it("pages the Team page's activity newest first and by person", async () => {
    const { store, app, client } = await setup("bookings");
    const owner = (await store.getUserById(client.userId))!;
    const desk = await store.createUser({ email: `desk-${randomUUID().slice(0, 8)}@gym.test`, name: "Desk", passwordHash: null, now: NOW });
    for (let i = 0; i < 60; i += 1) {
      const actor = i % 3 === 0 ? desk : owner;
      await recordFreeze(store, { clientId: client.id, appId: app.id, actor, membershipId: i, name: `M${i}`, frozen: i % 2 === 0 }, new Date(NOW.getTime() + i * 1000));
    }
    const first = await store.listTeamActivity(client.id, { limit: 25 });
    expect(first.total).toBe(60);
    expect(first.items[0]!.targetId).toBe("59");
    const last = await store.listTeamActivity(client.id, { limit: 25, offset: 50 });
    expect(last.items.map((x) => x.targetId).at(-1)).toBe("0");
    expect(last.items).toHaveLength(10);
    const byDesk = await store.listTeamActivity(client.id, { limit: 25, actorId: desk.id });
    expect(byDesk.total).toBe(20);
    expect(byDesk.items.every((x) => x.actorName === "Desk")).toBe(true);
  });
});
