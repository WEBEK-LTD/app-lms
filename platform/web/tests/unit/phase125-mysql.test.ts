import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { AccountManagerCallInput, App } from "@/lib/data/types";

/**
 * 125 On MySQL or MariaDB: a person's Prime alerts saved and read back, each
 * alert push taken once however many runs try at the same moment, the old
 * ones cleared; a team member's contact card; a client's account manager;
 * and calls with the manager, one per free time even when eight people ask
 * for it at once, a cancelled call freeing its time. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-11-13T10:00:00Z");

describe.skipIf(!url)("125 Prime's alerts and VIP's account managers on MySQL", () => {
  const pools = Array.from({ length: 8 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup() {
    const store = stores[0]!;
    const suffix = randomUUID().slice(0, 8);
    const { user, client } = await registerClient(store, { name: "Leyla", email: `p125-${suffix}@cafe.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted", connector: { kind: "restaurants" } };
    await store.createApp(app);
    const manager = await store.createUser({ email: `p125-manager-${suffix}@webek.test`, name: "Selin", passwordHash: null, now: NOW });
    return { store, user, client, app, manager, suffix };
  }

  it("keeps each person's alerts, and takes each push once", async () => {
    const { store, user, client, app, suffix } = await setup();
    expect(await store.getPrimeAlerts(user.id, app.id)).toBeNull();
    const alerts = { userId: user.id, appId: app.id, clientId: client.id, alerts: [{ kind: "order_waiting" as const, on: true, minutes: 5, amountCents: null, byTime: null, stars: null }], briefOn: false, briefTime: "08:30", updatedAt: NOW };
    await store.savePrimeAlerts(alerts);
    await store.savePrimeAlerts({ ...alerts, briefOn: true, briefTime: "07:45" });
    expect(await store.getPrimeAlerts(user.id, app.id)).toEqual({ ...alerts, briefOn: true, briefTime: "07:45" });
    expect((await store.listPrimeAlerts()).some((a) => a.userId === user.id && a.appId === app.id)).toBe(true);
    // Eight runs at the same moment: one pushes.
    const key = `alert:${user.id}:${app.id}:order_waiting:f1:${suffix}`;
    const claims = await Promise.all(stores.map((s) => s.claimPrimeSend(key, NOW)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await store.claimPrimeSend(key, NOW)).toBe(false);
    // Old claims go; the key can be taken again.
    expect(await store.deletePrimeSendsBefore(new Date(NOW.getTime() + 1000))).toBeGreaterThanOrEqual(1);
    expect(await store.claimPrimeSend(key, NOW)).toBe(true);
  });

  it("keeps a team member's contact card and a client's account manager", async () => {
    const { store, client, manager } = await setup();
    const profile = { userId: manager.id, photo: null, whatsapp: "+905321112233", phone: null, hours: { days: [1, 2, 3, 4, 7], from: "10:00", to: "18:00", timezone: "Europe/Istanbul" }, accountManager: true, updatedBy: "admin@webek.test", updatedAt: NOW };
    await store.saveStaffProfile(profile);
    await store.saveStaffProfile({ ...profile, phone: "+902121112233" });
    expect(await store.getStaffProfile(manager.id)).toEqual({ ...profile, phone: "+902121112233" });
    expect((await store.listStaffProfiles()).find((p) => p.userId === manager.id)?.accountManager).toBe(true);
    await store.updateClient(client.id, { accountManagerId: manager.id }, NOW);
    expect((await store.getClientById(client.id))!.accountManagerId).toBe(manager.id);
    await store.updateClient(client.id, { accountManagerId: null }, NOW);
    expect((await store.getClientById(client.id))!.accountManagerId).toBeNull();
  });

  it("makes one call per free time of the manager, and a cancelled call frees it", async () => {
    const { store, user, client, manager } = await setup();
    const input = (time: string): AccountManagerCallInput => ({ clientId: client.id, managerId: manager.id, requestedBy: user.id, requesterName: "Leyla", date: "2026-11-17", time, note: null, status: "requested", createdAt: NOW, updatedAt: NOW });
    const made = await Promise.all(stores.map((s) => s.createAccountManagerCall(input("10:30"))));
    const calls = made.filter((c) => c !== null);
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(await store.getAccountManagerCall(call.id)).toEqual(call);
    const other = (await store.createAccountManagerCall(input("11:00")))!;
    // Moved onto a taken time: refused; to a free one: done.
    expect(await store.updateAccountManagerCall(other.id, { time: "10:30", status: "moved", updatedAt: NOW })).toBe(false);
    expect(await store.updateAccountManagerCall(other.id, { time: "11:30", status: "moved", updatedAt: NOW })).toBe(true);
    expect((await store.listAccountManagerCalls({ clientId: client.id })).map((c) => [c.time, c.status])).toEqual([
      ["10:30", "requested"],
      ["11:30", "moved"],
    ]);
    // Cancelled: the time is free again.
    expect(await store.updateAccountManagerCall(call.id, { status: "cancelled", updatedAt: NOW })).toBe(true);
    expect(await store.createAccountManagerCall(input("10:30"))).not.toBeNull();
    expect((await store.listAccountManagerCalls({ managerId: manager.id, statuses: ["requested", "moved"], fromDate: "2026-11-17" })).map((c) => c.time)).toEqual(["10:30", "11:30"]);
    expect(await store.listAccountManagerCalls({ managerId: manager.id, statuses: [] })).toEqual([]);
  });
});
