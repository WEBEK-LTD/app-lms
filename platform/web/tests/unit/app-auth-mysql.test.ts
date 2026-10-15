import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";
import { appSignIn, ensureAuthKey, jwksOf, rotateAuthKey, RETIRED_KEY_SECONDS } from "@/lib/hosted/app-auth";
import { KEY } from "./helpers";

/**
 * 34 The signing keys of own API apps on MySQL or MariaDB (`app_auth_keys`):
 * made once, rotated with the old public key kept for a day, deleted after.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date(Math.floor(Date.now() / 1000) * 1000);

describe.skipIf(!url)("34 signing keys on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  it("keeps, rotates and deletes an app's keys", async () => {
    const user = await store.createUser({ email: `keys-${randomUUID()}@yallapp.test`, name: "Owner", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = { ...newApp(client.id, null, NOW, "lms"), backend: "custom_api", apiBaseUrl: "https://api.example.test" };
    await store.createApp(app);

    const first = await ensureAuthKey(store, app.id, KEY, NOW);
    expect((await ensureAuthKey(store, app.id, KEY, NOW)).kid).toBe(first.kid);
    const [saved] = await store.listAppAuthKeys(app.id);
    expect(saved).toEqual(first);

    const signer = appSignIn(store, app.id, { encryptionKey: KEY, platformUrl: "https://yallapp.test", now: () => NOW });
    const token = await signer.sign({ sub: "7", name: "Sara", iat: Math.floor(NOW.getTime() / 1000), exp: Math.floor(NOW.getTime() / 1000) + 900 });

    const later = new Date(NOW.getTime() + 60_000);
    const second = await rotateAuthKey(store, app.id, KEY, later);
    const keys = await store.listAppAuthKeys(app.id);
    expect(keys.map((k) => k.kid)).toEqual([second.kid, first.kid]);
    expect(keys[1]).toMatchObject({ privateKeyEncrypted: null, retiredAt: later });
    expect(jwksOf(keys, later).keys).toHaveLength(2);
    const reader = appSignIn(store, app.id, { encryptionKey: KEY, platformUrl: "https://yallapp.test", now: () => later });
    expect((await reader.verify(token))?.sub).toBe("7");

    await rotateAuthKey(store, app.id, KEY, new Date(later.getTime() + RETIRED_KEY_SECONDS * 1000 + 1000));
    expect((await store.listAppAuthKeys(app.id)).map((k) => k.kid)).not.toContain(first.kid);
  });
});
