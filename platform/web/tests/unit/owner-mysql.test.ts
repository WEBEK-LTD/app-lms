import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { sha256Hex } from "@/lib/crypto/tokens";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { OwnerDevice } from "@/lib/data/types";
import type { OwnerDeps } from "@/lib/owner/http";
import { handleOwner } from "@/lib/owner/service";
import { KEY } from "./helpers";

/**
 * 58 Yallapp Business on MySQL or MariaDB (`owner_devices`, migration 0043):
 * signing in, renewing (two renewals with the same token at once: one wins),
 * the devices list, a push token moving, signing out, and the daily purge.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-20T09:00:00.000Z");
const PASSWORD = "owner-mysql-password-1";

describe.skipIf(!url)("58 owner devices on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  const deps = (now = NOW): OwnerDeps => ({
    store,
    now,
    ip: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
    signingSecret: "test-signing-secret-0123456789abcdef0123456789",
    encryptionKey: KEY,
    baseUrl: "https://yallapp.test",
    paymentUrls: {},
    media: null,
    mail: async () => undefined,
  });
  const call = (method: string, path: string, options: { body?: unknown; token?: string; now?: Date } = {}) =>
    handleOwner(deps(options.now), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams(), body: options.body, token: options.token ?? null, acceptLanguage: null });

  async function owner() {
    const email = `owner-${randomUUID()}@mysql.test`;
    const { user, client } = await registerClient(store, { name: "Leyla", email, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: new Date(NOW.getTime() + 30 * 86_400_000), paymentNote: "" }, KEY, NOW);
    const signIn = async (name: string) => {
      const result = await call("POST", "auth/sign-in", { body: { email, password: PASSWORD, device: { name, platform: "ios", app_version: "1.0.0" } } });
      expect(result.status).toBe(200);
      return result.body as { access_token: string; refresh_token: string; device_id: string };
    };
    return { user, client, signIn };
  }

  it("signs in, keeps the refresh token hashed, and lets one of two renewals with the same token win", async () => {
    const { user, signIn } = await owner();
    const session = await signIn("iPhone");
    const device = (await store.getOwnerDevice(session.device_id))!;
    expect(device).toMatchObject({ userId: user.id, name: "iPhone", platform: "ios", appVersion: "1.0.0", refreshHash: sha256Hex(session.refresh_token), pushProvider: "fcm", pushPreferences: null });
    const [a, b] = await Promise.all([
      call("POST", "auth/refresh", { body: { refresh_token: session.refresh_token } }),
      call("POST", "auth/refresh", { body: { refresh_token: session.refresh_token } }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 401]);
    const winner = (a.status === 200 ? a.body : b.body) as { access_token: string; refresh_token: string };
    expect((await call("GET", "me", { token: winner.access_token })).status).toBe(200);
    expect((await call("POST", "auth/refresh", { body: { refresh_token: winner.refresh_token } })).status).toBe(200);
  });

  it("lists devices by last use, moves a push token, keeps choices, and signs out only the person's own", async () => {
    const first = await owner();
    const other = await owner();
    const pixel = await first.signIn("Pixel");
    const later = new Date(NOW.getTime() + 10 * 60_000);
    const iphone = await first.signIn("iPhone");
    await store.updateOwnerDevice(iphone.device_id, { lastSeenAt: later });
    const theirs = await other.signIn("Theirs");
    expect((await store.listOwnerDevices(first.user.id)).map((d) => d.name)).toEqual(["iPhone", "Pixel"]);

    const token = `fcm-${randomUUID()}`;
    expect((await call("PUT", "me/push-token", { token: theirs.access_token, body: { token } })).status).toBe(204);
    expect((await call("PUT", "me/push-token", { token: pixel.access_token, body: { token, provider: "hms" } })).status).toBe(204);
    expect((await store.getOwnerDevice(theirs.device_id))!.pushToken).toBeNull();
    expect(await store.getOwnerDevice(pixel.device_id)).toMatchObject({ pushToken: token, pushProvider: "hms" });
    expect((await call("PUT", "me/push-preferences", { token: pixel.access_token, body: { new_order: false } })).body).toMatchObject({ new_order: false, new_booking: true });
    expect((await store.getOwnerDevice(pixel.device_id))!.pushPreferences).toEqual({ new_order: false });

    expect(await store.deleteOwnerDevice(first.user.id, theirs.device_id)).toBe(false);
    expect((await call("POST", "auth/sign-out-all", { token: pixel.access_token })).status).toBe(204);
    expect(await store.listOwnerDevices(first.user.id)).toEqual([]);
    expect(await store.getOwnerDevice(theirs.device_id)).not.toBeNull();
  });

  it("forgets devices whose refresh token ended", async () => {
    const { user, client } = await owner();
    const ended: OwnerDevice = {
      id: randomUUID(),
      userId: user.id,
      clientId: client.id,
      name: "Old",
      platform: "android",
      appVersion: null,
      language: "tr",
      refreshHash: sha256Hex(randomUUID()),
      refreshExpiresAt: new Date(NOW.getTime() - 1000),
      sessionVersion: user.sessionVersion,
      pushToken: null,
      pushProvider: "fcm",
      pushPreferences: { yallapp_updates: false },
      createdAt: NOW,
      lastSeenAt: NOW,
    };
    await store.createOwnerDevice(ended);
    expect(await store.findOwnerDeviceByRefresh(ended.refreshHash)).toMatchObject({ id: ended.id, language: "tr", pushPreferences: { yallapp_updates: false } });
    expect(await store.purgeOwnerDevices(NOW)).toBeGreaterThanOrEqual(1);
    expect(await store.getOwnerDevice(ended.id)).toBeNull();
  });
});
