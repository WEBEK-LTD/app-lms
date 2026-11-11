import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";

/**
 * 118 On MySQL or MariaDB (migration 0124): usernames are unique in an app,
 * the password sits apart from the user's row, and goes with the account.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-11-11T10:00:00.000Z");

describe.skipIf(!url)("118 Studio passwords on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  async function setup(): Promise<App> {
    const user = await store.createUser({ email: `p118-${randomUUID()}@yallapp.test`, name: "Owner", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", section: "studio", connector: { kind: "catalog" } };
    await store.createApp(app);
    return app;
  }

  it("keeps usernames unique per app and passwords apart from the user, deleted with the account", async () => {
    const app = await setup();
    const other = await setup();
    const layla = await store.createHostedUser({ appId: app.id, phone: null, name: "Layla", email: "layla@example.com", city: null, username: "layla.h", now: NOW });
    expect(layla).toMatchObject({ username: "layla.h", email: "layla@example.com" });
    // Another account can't take the username in the same app; another app can.
    expect(await store.createHostedUser({ appId: app.id, phone: "+905320000001", name: "Copy", email: null, city: null, username: "layla.h", now: NOW })).toBeNull();
    expect(await store.createHostedUser({ appId: other.id, phone: null, name: "Layla", email: "layla@example.com", city: null, username: "layla.h", now: NOW })).not.toBeNull();
    // Accounts without a username don't clash.
    expect(await store.createHostedUser({ appId: app.id, phone: "+905320000002", name: "Omar", email: null, city: null, now: NOW })).not.toBeNull();
    expect(await store.createHostedUser({ appId: app.id, phone: "+905320000003", name: "Ali", email: null, city: null, now: NOW })).not.toBeNull();

    expect((await store.getHostedUserByUsername(app.id, "layla.h"))?.id).toBe(layla!.id);
    expect(await store.getHostedUserPassword(app.id, layla!.id)).toBeNull();
    await store.setHostedUserPassword(app.id, layla!.id, "$argon2id$first", NOW);
    await store.setHostedUserPassword(app.id, layla!.id, "$argon2id$second", NOW);
    expect(await store.getHostedUserPassword(app.id, layla!.id)).toBe("$argon2id$second");
    // Never another app's user, and never on the user's own row.
    expect(await store.getHostedUserPassword(other.id, layla!.id)).toBeNull();
    await store.setHostedUserPassword(other.id, layla!.id, "$argon2id$other", NOW);
    expect(await store.getHostedUserPassword(app.id, layla!.id)).toBe("$argon2id$second");
    expect(Object.keys((await store.getHostedUser(app.id, layla!.id))!)).not.toContain("passwordHash");

    await store.deleteHostedUser(app.id, layla!.id);
    expect(await store.getHostedUserPassword(app.id, layla!.id)).toBeNull();
    expect(await store.getHostedUserByUsername(app.id, "layla.h")).toBeNull();
  });
});
