import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";

/**
 * 78.4 Errors per app in the store, the same on the memory store and on
 * MySQL or MariaDB (migration 0056): counted per client, app, source and
 * code, listed last seen first, purged by age, and gone with their app or
 * account.
 */

const NOW = new Date("2031-06-01T09:00:00.000Z");
const MIN = 60_000;

export function appErrorsStoreSuite(store: () => DataStore) {
  async function clientWithApp() {
    const s = store();
    const { user, client } = await registerClient(s, { name: "Ada", email: `ada-${randomUUID()}@errors.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app = newApp(client.id, null, NOW);
    await s.createApp(app);
    return { user, client, app };
  }

  it("counts each error with its last message and time, per app, source and code", async () => {
    const s = store();
    const { client, app } = await clientWithApp();
    const base = { clientId: client.id, appId: app.id, source: "platform" as const, code: "shop_unavailable" };
    await s.recordAppError({ ...base, message: "first" }, NOW);
    await s.recordAppError({ ...base, message: "second" }, new Date(NOW.getTime() + 5 * MIN));
    await s.recordAppError({ ...base, code: "config_failed", message: "config" }, new Date(NOW.getTime() + MIN));
    await s.recordAppError({ ...base, appId: null, source: "payment", code: "x", message: "the account's" }, new Date(NOW.getTime() + 2 * MIN));

    const all = await s.listAppErrors({ clientId: client.id, limit: 10 });
    expect(all.map((e) => [e.code, e.count])).toEqual([
      ["shop_unavailable", 2],
      ["x", 1],
      ["config_failed", 1],
    ]);
    expect(all[0]).toMatchObject({ clientId: client.id, appId: app.id, message: "second", firstAt: NOW, lastAt: new Date(NOW.getTime() + 5 * MIN) });
    expect(all[1]).toMatchObject({ appId: null, source: "payment" });
    expect((await s.listAppErrors({ appId: app.id, limit: 10 })).map((e) => e.code)).toEqual(["shop_unavailable", "config_failed"]);
    expect((await s.listAppErrors({ clientId: client.id, since: new Date(NOW.getTime() + 2 * MIN), limit: 10 })).map((e) => e.code)).toEqual(["shop_unavailable", "x"]);

    expect(await s.deleteAppErrorsBefore(new Date(NOW.getTime() + 90 * MIN))).toBeGreaterThanOrEqual(3);
    expect(await s.listAppErrors({ clientId: client.id, limit: 10 })).toEqual([]);
  });

  it("goes with its app and account; an unknown app records nothing", async () => {
    const s = store();
    const { user, client, app } = await clientWithApp();
    await s.recordAppError({ clientId: client.id, appId: randomUUID(), source: "server", code: "unhandled", message: "x" }, NOW);
    expect(await s.listAppErrors({ clientId: client.id, limit: 10 })).toEqual([]);
    await s.recordAppError({ clientId: client.id, appId: app.id, source: "server", code: "unhandled", message: "x" }, NOW);
    await s.recordAppError({ clientId: client.id, appId: null, source: "payment", code: "y", message: "y" }, NOW);
    const deletionId = randomUUID();
    await s.softDeleteApp({ id: deletionId, appId: app.id, clientId: client.id, appName: "Ada", reason: "owner", deletedBy: "ada@x.test", deletedAt: NOW, purgeAfter: NOW, status: "waiting", closedAt: null, closedBy: null, pendingBuilds: [] });
    await s.purgeDeletedApp(deletionId, "daily job", NOW, []);
    expect((await s.listAppErrors({ clientId: client.id, limit: 10 })).map((e) => e.code)).toEqual(["y"]);
    await s.deleteUserAccount(user.id);
    expect(await s.listAppErrors({ clientId: client.id, limit: 10 })).toEqual([]);
  });
}
