import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";

/**
 * 123 The time students spend learning, the same on the memory store and on
 * MySQL or MariaDB (migration 0125): seconds added to a day and a course, at
 * most a day's worth, and read back per day from a day on, with all of them.
 */

const NOW = new Date("2026-11-11T09:00:00.000Z");

export function learningTimeStoreSuite(store: () => DataStore) {
  it("adds a student's seconds per day and course, at most a day's worth, and reads them back", async () => {
    const s = store();
    const { client } = await registerClient(s, { name: "Ada", email: `ada-${randomUUID()}@learning.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted" as const };
    await s.createApp(app);
    const user = (await s.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Sara", email: null, city: null, now: NOW }))!;
    const other = (await s.createHostedUser({ appId: app.id, phone: "+905321234568", name: "Omar", email: null, city: null, now: NOW }))!;
    await s.addLearningSeconds({ appId: app.id, userId: user.id, day: "2026-11-11", courseId: 10, seconds: 120, max: 86_400 });
    await s.addLearningSeconds({ appId: app.id, userId: user.id, day: "2026-11-11", courseId: 10, seconds: 60, max: 86_400 });
    await s.addLearningSeconds({ appId: app.id, userId: user.id, day: "2026-11-11", courseId: 11, seconds: 30, max: 86_400 });
    await s.addLearningSeconds({ appId: app.id, userId: user.id, day: "2026-10-01", courseId: 10, seconds: 600, max: 86_400 });
    await s.addLearningSeconds({ appId: app.id, userId: other.id, day: "2026-11-11", courseId: 10, seconds: 999, max: 86_400 });
    // At most a day's worth.
    await s.addLearningSeconds({ appId: app.id, userId: user.id, day: "2026-11-10", courseId: 10, seconds: 300, max: 400 });
    await s.addLearningSeconds({ appId: app.id, userId: user.id, day: "2026-11-10", courseId: 10, seconds: 300, max: 400 });
    expect(await s.learningSeconds({ appId: app.id, userId: user.id, from: "2026-11-05" })).toEqual({ days: { "2026-11-11": 210, "2026-11-10": 400 }, total: 1210 });
    expect(await s.learningSeconds({ appId: app.id, userId: other.id, from: "2026-11-05" })).toEqual({ days: { "2026-11-11": 999 }, total: 999 });
  });
}
