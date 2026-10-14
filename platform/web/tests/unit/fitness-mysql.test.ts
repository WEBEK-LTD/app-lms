import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { ClassSession } from "@/lib/data/types";
import type mysql from "mysql2/promise";
import { NOW } from "./helpers";

/**
 * 27 Spots in a class booked at the same moment from several server
 * instances (one connection each, as on Netlify), on a real MySQL or
 * MariaDB database with the migrations applied. Runs when
 * TEST_DATABASE_URL is set, for example:
 *   TEST_DATABASE_URL=mysql://user:pass@localhost/yallapp_test npx vitest run tests/unit/fitness-mysql.test.ts
 */
const url = process.env.TEST_DATABASE_URL;
const pools: mysql.Pool[] = [];

afterAll(async () => {
  await Promise.all(pools.map((p) => p.end()));
});

function stores(n: number): MysqlStore[] {
  return Array.from({ length: n }, () => {
    const pool = createPool({ url: url!, ssl: "disabled" });
    pools.push(pool);
    return new MysqlStore(pool);
  });
}

describe.skipIf(!url)("classes on MySQL or MariaDB", () => {
  it("never overbooks when many book at once, and never uses the last credit twice", async () => {
    const instances = stores(8);
    const store = instances[0]!;
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const { client } = await registerClient(store, { name: "Pulse Studio", email: `pulse-${suffix}@gym.test`, whatsapp: "+905446731942", siteUrl: "https://pulse.test", password: null }, NOW);
    const app = { ...newApp(client.id, null, NOW, "booking", "fitness"), backend: "hosted" as const, connector: { kind: "bookings" as const } };
    await store.createApp(app);
    const start = new Date(NOW.getTime() + 2 * 86_400_000);
    const session = (await store.createClassSession({
      appId: app.id,
      templateId: 1,
      serviceId: 1,
      staffId: 1,
      serviceName: "Yoga flow",
      staffName: "Selin",
      startAt: start,
      endAt: new Date(start.getTime() + 3_600_000),
      capacity: 3,
      bookedCount: 0,
      status: "scheduled",
      createdAt: NOW,
      updatedAt: NOW,
    })) as ClassSession;
    expect(session.id).toBeGreaterThan(0);
    // The same class again is not made twice.
    expect(await store.createClassSession({ ...session, id: undefined } as unknown as Omit<ClassSession, "id">)).toBeNull();

    const users = [];
    for (let i = 0; i < 16; i += 1) {
      const user = (await store.createHostedUser({ appId: app.id, phone: `+9053200000${String(i).padStart(2, "0")}`, name: `Member ${i}`, email: null, city: null, now: NOW }))!;
      await store.createMembership({
        appId: app.id,
        userId: user.id,
        planId: 1,
        planName: "Monthly unlimited",
        period: "month",
        creditsLeft: null,
        status: "active",
        startsAt: NOW,
        endsAt: new Date(NOW.getTime() + 30 * 86_400_000),
        orderId: null,
        createdAt: NOW,
        updatedAt: NOW,
      });
      users.push(user);
    }
    const results = await Promise.all(
      users.map((u, i) =>
        instances[i % instances.length]!.bookClass({
          appId: app.id,
          sessionId: session.id,
          userId: u.id,
          customerName: u.name,
          customerPhone: u.phone,
          customerEmail: null,
          membershipRequired: true,
          bookableFrom: NOW,
          now: NOW,
        }),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok && r.reason === "full")).toHaveLength(13);
    expect((await store.getClassSession(app.id, session.id))!.bookedCount).toBe(3);
    expect(await store.listClassBookings({ appId: app.id, sessionIds: [session.id], status: "booked" })).toHaveLength(3);

    // One credit left, three classes booked from three instances at once: one gets it.
    const last = (await store.createHostedUser({ appId: app.id, phone: "+905330000001", name: "Last credit", email: null, city: null, now: NOW }))!;
    const pack = await store.createMembership({
      appId: app.id,
      userId: last.id,
      planId: 2,
      planName: "Pack",
      period: "pack",
      creditsLeft: 1,
      status: "active",
      startsAt: NOW,
      endsAt: null,
      orderId: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const others: ClassSession[] = [];
    for (let i = 1; i <= 3; i += 1) {
      const at = new Date(start.getTime() + i * 86_400_000);
      others.push((await store.createClassSession({ ...session, id: undefined, startAt: at, endAt: new Date(at.getTime() + 3_600_000), bookedCount: 0 } as unknown as Omit<ClassSession, "id">))!);
    }
    const tries = await Promise.all(
      others.map((s, i) =>
        instances[i]!.bookClass({ appId: app.id, sessionId: s.id, userId: last.id, customerName: "Last credit", customerPhone: null, customerEmail: null, membershipRequired: true, bookableFrom: NOW, now: NOW }),
      ),
    );
    expect(tries.filter((t) => t.ok)).toHaveLength(1);
    expect(tries.filter((t) => !t.ok && t.reason === "no_credits")).toHaveLength(2);
    expect((await store.getMembership(app.id, pack.id))!.creditsLeft).toBe(0);

    // Cancelling gives the spot and the credit back; calling a class off does too.
    const won = others[tries.findIndex((t) => t.ok)]!;
    expect(await store.cancelClassBooking({ appId: app.id, sessionId: won.id, userId: last.id, now: NOW })).toMatchObject({ status: "cancelled" });
    expect((await store.getMembership(app.id, pack.id))!.creditsLeft).toBe(1);
    expect((await store.getClassSession(app.id, won.id))!.bookedCount).toBe(0);
    expect((await store.bookClass({ appId: app.id, sessionId: won.id, userId: last.id, customerName: "Last credit", customerPhone: null, customerEmail: null, membershipRequired: true, bookableFrom: NOW, now: NOW })).ok).toBe(true);
    const released = await store.cancelClassSession(app.id, won.id, NOW);
    expect(released.map((b) => b.userId)).toEqual([last.id]);
    expect((await store.getMembership(app.id, pack.id))!.creditsLeft).toBe(1);
    expect(await store.getClassSession(app.id, won.id)).toMatchObject({ status: "cancelled", bookedCount: 0 });

    // The demo clean-up frees spots and recounts the classes.
    const purged = await store.purgeDemoActivity(app.id, new Date(NOW.getTime() + 1000));
    expect(purged.classBookings).toBeGreaterThanOrEqual(4);
    expect((await store.getClassSession(app.id, session.id))!.bookedCount).toBe(0);
  }, 60_000);
});
