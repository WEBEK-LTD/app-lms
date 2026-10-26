import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";

/**
 * 90.1 Quiz attempts on MySQL or MariaDB: an attempt is submitted once even
 * when two server instances submit it at the same moment, and attempts go
 * with the student's account and with a course started again. Runs only
 * with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-12T10:00:00Z");

describe.skipIf(!url)("90.1 quiz attempts on MySQL", () => {
  const pools = Array.from({ length: 4 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  it("submits an attempt once, lists it, and deletes attempts with a restart or the account", async () => {
    const store = stores[0]!;
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(store, { name: "Lale Academy", email: `p90-${suffix}@academy.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", connector: { kind: "courses" } };
    await store.createApp(app);
    const user = (await store.createHostedUser({ appId: app.id, phone: `+90532${Math.floor(Math.random() * 1e7)}`, name: "Deniz", email: null, city: null, now: NOW }))!;

    const base = { appId: app.id, userId: user.id, courseId: 10, quizId: 15, answers: null, scorePercent: null, passed: null, startedAt: NOW, submittedAt: null };
    const attempt = await store.createQuizAttempt(base);
    expect(await store.getQuizAttempt(app.id, attempt.id)).toMatchObject({ quizId: 15, submittedAt: null, answers: null });
    // Another app never sees it.
    expect(await store.getQuizAttempt(randomUUID(), attempt.id)).toBeNull();

    const later = new Date(NOW.getTime() + 60_000);
    const results = await Promise.all(stores.map((s, i) => s.submitQuizAttempt(app.id, attempt.id, { answers: { "1": [String.fromCharCode(97 + i)] }, scorePercent: 50, passed: true, submittedAt: later })));
    expect(results.filter(Boolean)).toHaveLength(1);
    const saved = await store.getQuizAttempt(app.id, attempt.id);
    expect(saved).toMatchObject({ scorePercent: 50, passed: true, submittedAt: later });
    expect(Object.keys(saved!.answers!)).toEqual(["1"]);

    await store.createQuizAttempt({ ...base, courseId: 20, quizId: 25 });
    expect(await store.listQuizAttempts({ appId: app.id, userId: user.id })).toHaveLength(2);
    expect(await store.listQuizAttempts({ appId: app.id, userId: user.id, courseId: 10 })).toHaveLength(1);
    expect(await store.listQuizAttempts({ appId: app.id, userId: user.id, quizId: 25 })).toHaveLength(1);

    // Starting course 10 again clears its attempts only.
    expect(await store.deleteQuizAttempts({ appId: app.id, userId: user.id, courseId: 10 })).toBe(1);
    expect((await store.listQuizAttempts({ appId: app.id, userId: user.id })).map((a) => a.quizId)).toEqual([25]);

    await store.deleteHostedUser(app.id, user.id);
    expect(await store.listQuizAttempts({ appId: app.id, userId: user.id })).toEqual([]);
  });
});
