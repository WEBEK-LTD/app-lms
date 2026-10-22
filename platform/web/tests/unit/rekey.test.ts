import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { revealLicenseKey } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { keyContext } from "@/lib/builds/signing";
import { decrypt, encrypt, keyId, keyIdOf, withOldKeys } from "@/lib/crypto/encryption";
import { candidatesIn, encryptedValuesIn, needsRekey, rekeyText } from "@/lib/crypto/rekey";
import { CONTEXT_TEMPLATES, contextsFor, lastRekeyState, runRekey } from "@/lib/jobs/rekey";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { clearPlatformSettingsCache, encryptSetting, resolvedSmtpConfig, yallappIyzicoKeys } from "@/lib/settings/platform";
import { deepHealth } from "@/lib/watch/health";
import { MemoryStore } from "@/lib/data/memory";
import { KEY, NOW, setupClient } from "./helpers";
import { rekeyStoreSuite } from "./rekey-store-suite";

/** A value as written before 79.2: no key ID. */
function sealV1(plain: string, key: Buffer, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

describe("79.2 encrypted values in a text", () => {
  it("finds whole values and JSON strings, and seals those of other keys again", () => {
    const oldKey = randomBytes(32);
    const ring = withOldKeys(randomBytes(32), [oldKey]);
    const a = encrypt("one", oldKey, "app-smtp:app1");
    const b = sealV1("two", oldKey, "app-smtp:app1");
    const c = encrypt("three", ring, "app-smtp:app1");
    const json = JSON.stringify({ passwordEncrypted: a, other: b, fresh: c, note: `not ${a} inside text` });
    expect(encryptedValuesIn(json)).toEqual([a, b, c]);
    expect(encryptedValuesIn(a)).toEqual([a]);
    expect(needsRekey(c, keyId(ring))).toBe(false);
    expect(needsRekey(json, keyId(ring))).toBe(true);

    const result = rekeyText(json, ring, ["", "app-smtp:app2", "app-smtp:app1"], keyId(ring));
    expect(result).toMatchObject({ moved: 2, failed: 0 });
    const out = JSON.parse(result.text) as Record<string, string>;
    expect(keyIdOf(out.passwordEncrypted!)).toBe(keyId(ring));
    expect(keyIdOf(out.other!)).toBe(keyId(ring));
    expect(out.fresh).toBe(c);
    // Text around a value isn't a value: left alone.
    expect(out.note).toBe(`not ${a} inside text`);
    const plainNew = Buffer.from(ring);
    expect(decrypt(out.passwordEncrypted!, plainNew, "app-smtp:app1")).toBe("one");
    expect(decrypt(out.other!, plainNew, "app-smtp:app1")).toBe("two");

    // No context opens it: left as it was, counted.
    expect(rekeyText(a, ring, ["app-smtp:app2"], keyId(ring))).toEqual({ text: a, moved: 0, failed: 1 });
  });

  it("builds the contexts from a row's short strings, JSON included", () => {
    const candidates = candidatesIn([{ id: "app1", clientId: "c1", settings: JSON.stringify({ key: "iyzico", long: "x".repeat(120) }).padEnd(120, " "), at: NOW }]);
    expect(candidates).toEqual(expect.arrayContaining(["app1", "c1", "iyzico", "id", "clientId"]));
    expect(candidates).not.toContain("x".repeat(120));
    const contexts = contextsFor(["app1"]);
    expect(contexts).toEqual(expect.arrayContaining(["", "license-key:app1", "app:payment:app1", "app:app1:google-play", "platform:app1", `${SERVICE_ACCOUNT_CONTEXT}:app1`]));
    expect(contexts).toHaveLength(1 + CONTEXT_TEMPLATES.length);
  });
});

describe("79.2 the rekey job", () => {
  it("moves every stored value to the new key; what it can't open is counted and kept", async () => {
    // Everything written with KEY, the key being replaced.
    const { store, client, license } = await setupClient();
    const app = newApp(client.id, null, NOW);
    await store.createApp({
      ...app,
      googlePlayKeyEncrypted: encrypt('{"type":"service_account"}', KEY, keyContext.googlePlay(app.id)),
      firebaseServiceAccountEncrypted: sealV1('{"project_id":"ada"}', KEY, `${SERVICE_ACCOUNT_CONTEXT}:${app.id}`),
    });
    await store.setPlatformSetting(
      "smtp",
      { host: "mail.yallapp.test", port: 587, secure: false, user: "info", passEncrypted: encryptSetting("smtp", "mail-pass", KEY), from: "Yallapp <info@yallapp.test>" },
      "admin@yallapp.test",
      NOW,
    );
    await store.setPlatformSetting(
      "iyzico",
      { apiKeyEncrypted: sealV1("api", KEY, "platform:iyzico"), secretKeyEncrypted: encryptSetting("iyzico", "secret", KEY), sandbox: true },
      "admin@yallapp.test",
      NOW,
    );
    // Sealed with a context no feature uses: it can't be moved.
    await store.setPlatformSetting(
      "otp",
      { kind: "whatsapp", accessTokenEncrypted: encrypt("meta-token", KEY, "somewhere-else"), phoneNumberId: "1234567", template: "yallapp_code", language: "tr" },
      "admin@yallapp.test",
      NOW,
    );

    const newKey = randomBytes(32);
    const ring = withOldKeys(newKey, [KEY]);
    let clock = NOW.getTime();
    const tick = () => new Date((clock += 1000));
    let runs = 0;
    let state = await runRekey(store, ring, { clock: tick, budgetMs: 0 });
    while (state && !state.done) {
      runs++;
      state = await runRekey(store, ring, { clock: tick, budgetMs: 0 });
    }
    expect(state).toMatchObject({ keyId: keyId(newKey), oldKeyIds: [keyId(KEY)], done: true, moved: 6, failed: 1 });
    expect(runs).toBe(0);
    // Done for these keys: nothing more to do.
    expect(await runRekey(store, ring, { clock: tick })).toBeNull();

    // Everything opens with the new key alone.
    const plainNew = Buffer.from(newKey);
    expect(revealLicenseKey((await store.getLicenseById(license!.id))!, plainNew)).toMatch(/\S{16,}/);
    const saved = (await store.getAppById(app.id))!;
    expect(decrypt(saved.googlePlayKeyEncrypted!, plainNew, keyContext.googlePlay(app.id))).toBe('{"type":"service_account"}');
    expect(decrypt(saved.firebaseServiceAccountEncrypted!, plainNew, `${SERVICE_ACCOUNT_CONTEXT}:${app.id}`)).toBe('{"project_id":"ada"}');
    clearPlatformSettingsCache();
    expect((await resolvedSmtpConfig(store, plainNew))?.pass).toBe("mail-pass");
    expect(await yallappIyzicoKeys(store, plainNew)).toMatchObject({ apiKey: "api", secretKey: "secret" });
    clearPlatformSettingsCache();

    // Admin › Watching: one value stays on the old key.
    const health = await deepHealth({
      store,
      now: NOW,
      mediaGate: null,
      filesHost: null,
      email: true,
      ownerPush: "ok",
      pipelineToken: true,
      dispatchToken: true,
      keys: { keyId: keyId(newKey), oldKeyIds: [keyId(KEY)] },
    });
    expect(health.find((c) => c.key === "keys")).toMatchObject({
      ok: false,
      detail: `The current key's ID is ${keyId(newKey)}. 1 stored values couldn't be moved to it (their context wasn't found): keep ENCRYPTION_KEY_OLD set.`,
    });
  });

  it("goes on where it stopped, a page at a time, and starts again when the keys change", async () => {
    const { store } = await setupClient();
    for (let i = 0; i < 230; i++) {
      const app = newApp("client-x", null, NOW);
      await store.createApp({ ...app, googlePlayKeyEncrypted: encrypt(`key ${i}`, KEY, keyContext.googlePlay(app.id)) });
    }
    const ring = withOldKeys(randomBytes(32), [KEY]);
    const first = await runRekey(store, ring, { budgetMs: 0 });
    expect(first).toMatchObject({ done: false, moved: 100 });
    expect((await lastRekeyState(store))?.cursor).toBe(first!.cursor);
    const second = await runRekey(store, ring, { budgetMs: 0 });
    expect(second).toMatchObject({ done: false, moved: 200 });
    // The license key (setupClient) and the rest.
    expect(await runRekey(store, ring, { budgetMs: 0 })).toMatchObject({ done: true, moved: 231, failed: 0 });

    // The old key removed: one more pass, which finds nothing to move.
    const alone = Buffer.from(ring);
    expect(await runRekey(store, alone)).toMatchObject({ done: true, moved: 0, failed: 0, oldKeyIds: [] });
    expect(await runRekey(store, alone)).toBeNull();
  });

  it("knows every context the platform seals stored values with", () => {
    // Each template gives a different context for the same ID.
    const made = CONTEXT_TEMPLATES.map((t) => t("id1"));
    expect(new Set(made).size).toBe(made.length);
  });
});

describe("79.2 rekey on the memory store", () => {
  const store = new MemoryStore();
  rekeyStoreSuite(() => store);
});
