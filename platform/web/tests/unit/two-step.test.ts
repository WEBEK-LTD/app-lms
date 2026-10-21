import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import {
  base32Decode,
  base32Encode,
  groupedSecret,
  matchTotp,
  newRecoveryCodes,
  otpauthUri,
  readRecoveryCode,
  readTotpCode,
  totpCode,
  totpStep,
} from "@/lib/auth/totp";
import {
  beginTwoStepSetup,
  checkSecondStep,
  confirmTwoStepSetup,
  hashRecoveryCode,
  hasTwoStep,
  renewRecoveryCodes,
  turnOffTwoStep,
  twoStepContext,
  twoStepStatus,
  waitingSecret,
} from "@/lib/auth/two-step";
import { decrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { User } from "@/lib/data/types";
import { KEY, NOW } from "./helpers";

/**
 * 70 Two-step sign-in: RFC 6238 codes, the setup with its recovery codes,
 * the second step (each code once, attempts limited), turning it off; and
 * the sessions kept on the server (signing out ends a copied cookie, "Sign
 * out of all devices", a password change).
 */

// RFC 6238, appendix B (SHA-1): the secret "12345678901234567890", the last 6 of the 8 digits.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));
const RFC = [
  [59, "287082"],
  [1111111109, "081804"],
  [1111111111, "050471"],
  [1234567890, "005924"],
  [2000000000, "279037"],
  [20000000000, "353130"],
] as const;

describe("70 TOTP codes (RFC 6238)", () => {
  it("matches the RFC's test vectors", () => {
    expect(RFC_SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    for (const [seconds, code] of RFC) expect(totpCode(RFC_SECRET, totpStep(new Date(seconds * 1000)))).toBe(code);
  });

  it("accepts the step before and after, not further, and reads codes as people type them", () => {
    const now = new Date(1111111111 * 1000);
    const step = totpStep(now);
    expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, step), now)).toBe(step);
    expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 1), now)).toBe(step - 1);
    expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 1), now)).toBe(step + 1);
    expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 2), now)).toBeNull();
    expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 2), now)).toBeNull();
    expect(readTotpCode(" 050 471 ")).toBe("050471");
    expect(readTotpCode("05047")).toBeNull();
    expect(readTotpCode("abcdef")).toBeNull();
  });

  it("writes base32, the authenticator address and recovery codes", () => {
    const bytes = Buffer.from([0, 1, 2, 250, 255, 7, 9]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(groupedSecret("ABCDEFGHIJ")).toBe("ABCD EFGH IJ");
    const uri = new URL(otpauthUri("JBSWY3DPEHPK3PXP", "ada+test@academy.test"));
    expect(uri.protocol).toBe("otpauth:");
    expect(uri.host).toBe("totp");
    expect(decodeURIComponent(uri.pathname)).toBe("/Yallapp:ada+test@academy.test");
    expect(Object.fromEntries(uri.searchParams)).toEqual({ secret: "JBSWY3DPEHPK3PXP", issuer: "Yallapp", algorithm: "SHA1", digits: "6", period: "30" });
    const codes = newRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
      expect(readRecoveryCode(code.toUpperCase().replace("-", " "))).toBe(code.replace("-", ""));
    }
    expect(readRecoveryCode("12345-67890")).toBeNull();
  });
});

describe("70 setting it up, signing in with it, turning it off", () => {
  let store: MemoryStore;
  let user: User;
  beforeEach(async () => {
    store = new MemoryStore();
    ({ user } = await registerClient(store, { name: "Ada", email: "ada@academy.test", whatsapp: "+905446731942", siteUrl: "", password: "a long password 123" }, NOW));
  });

  async function turnOn(at = NOW) {
    const secret = (await beginTwoStepSetup(store, user, KEY, at))!;
    const result = await confirmTwoStepSetup(store, user, totpCode(secret, totpStep(at)), KEY, at);
    if (!result.ok) throw new Error(result.error);
    return { secret, codes: result.recoveryCodes };
  }

  it("keeps the secret encrypted, waits for a first right code, and shows 10 recovery codes once", async () => {
    const secret = (await beginTwoStepSetup(store, user, KEY, NOW))!;
    const record = (await store.getTwoFactor(user.id))!;
    expect(record.secretEncrypted).not.toContain(secret);
    expect(decrypt(record.secretEncrypted, KEY, twoStepContext(user.id))).toBe(secret);
    expect(() => decrypt(record.secretEncrypted, KEY, twoStepContext("someone-else"))).toThrow();
    expect(await waitingSecret(store, user.id, KEY)).toBe(secret);
    expect(await twoStepStatus(store, user.id)).toMatchObject({ on: false, waiting: true });
    expect(await hasTwoStep(store, user.id)).toBe(false);

    expect(await confirmTwoStepSetup(store, user, "12345", KEY, NOW)).toEqual({ ok: false, error: "format" });
    const wrong = totpCode(secret, totpStep(NOW) + 5);
    expect(await confirmTwoStepSetup(store, user, wrong, KEY, NOW)).toEqual({ ok: false, error: "wrong" });
    const result = await confirmTwoStepSetup(store, user, totpCode(secret, totpStep(NOW)), KEY, NOW);
    expect(result.ok).toBe(true);
    const codes = (result as { recoveryCodes: string[] }).recoveryCodes;
    expect(codes).toHaveLength(10);
    expect(await twoStepStatus(store, user.id)).toEqual({ on: true, enabledAt: NOW, waiting: false, recoveryLeft: 10 });
    expect(await waitingSecret(store, user.id, KEY)).toBeNull();
    // Kept as hashes only.
    const kept = JSON.stringify([...((store as unknown as { recoveryCodes: Map<string, Map<string, unknown>> }).recoveryCodes.get(user.id)?.keys() ?? [])]);
    for (const code of codes) expect(kept).not.toContain(code.replace("-", ""));
    expect(kept).toContain(hashRecoveryCode(user.id, codes[0]!.replace("-", "")));
    // A setup that is on is never replaced by a new one.
    expect(await beginTwoStepSetup(store, user, KEY, NOW)).toBeNull();
    expect(await confirmTwoStepSetup(store, user, totpCode(secret, totpStep(NOW) + 1), KEY, NOW)).toEqual({ ok: false, error: "on" });
  });

  it("takes each code once, never an older one, and each recovery code once", async () => {
    const { secret, codes } = await turnOn();
    const later = new Date(NOW.getTime() + 30_000);
    // The setup's own code was used.
    expect(await checkSecondStep(store, user, totpCode(secret, totpStep(NOW)), KEY, later)).toEqual({ ok: false, error: "wrong" });
    const code = totpCode(secret, totpStep(later));
    expect(await checkSecondStep(store, user, code, KEY, later)).toEqual({ ok: true, used: "code" });
    expect(await checkSecondStep(store, user, code, KEY, later)).toEqual({ ok: false, error: "wrong" });
    expect(await checkSecondStep(store, user, codes[3]!, KEY, later)).toEqual({ ok: true, used: "recovery" });
    expect(await checkSecondStep(store, user, codes[3]!.toUpperCase(), KEY, later)).toEqual({ ok: false, error: "wrong" });
    expect(await twoStepStatus(store, user.id)).toMatchObject({ recoveryLeft: 9 });
    expect(await checkSecondStep(store, user, "not a code", KEY, later)).toEqual({ ok: false, error: "format" });
  });

  it("counts attempts like passwords: 8 in 15 minutes per person", async () => {
    const { secret } = await turnOn();
    const later = new Date(NOW.getTime() + 60_000);
    // The setup counted one.
    for (let i = 0; i < 7; i++) expect(await checkSecondStep(store, user, "000000", KEY, later)).toEqual({ ok: false, error: "wrong" });
    expect(await checkSecondStep(store, user, totpCode(secret, totpStep(later)), KEY, later)).toEqual({ ok: false, error: "rate" });
    const after = new Date(NOW.getTime() + 16 * 60_000);
    expect(await checkSecondStep(store, user, totpCode(secret, totpStep(after)), KEY, after)).toEqual({ ok: true, used: "code" });
  });

  it("needs the password and a current code to turn it off, and makes new recovery codes for a code", async () => {
    const { secret, codes } = await turnOn();
    const at = (s: number) => new Date(NOW.getTime() + s * 1000);
    const me = (await store.getUserById(user.id))!;
    expect(await turnOffTwoStep(store, me, { password: "wrong password", code: totpCode(secret, totpStep(at(30))) }, KEY, at(30))).toEqual({ ok: false, error: "password" });
    expect(await turnOffTwoStep(store, me, { password: "a long password 123", code: "000000" }, KEY, at(30))).toEqual({ ok: false, error: "wrong" });

    const renewed = await renewRecoveryCodes(store, me, totpCode(secret, totpStep(at(60))), KEY, at(60));
    expect(renewed.ok).toBe(true);
    const fresh = (renewed as { recoveryCodes: string[] }).recoveryCodes;
    // The old codes stopped working; the new ones work.
    expect(await checkSecondStep(store, me, codes[0]!, KEY, at(60))).toEqual({ ok: false, error: "wrong" });
    expect(await turnOffTwoStep(store, me, { password: "a long password 123", code: fresh[0]! }, KEY, at(90))).toEqual({ ok: true });
    expect(await hasTwoStep(store, user.id)).toBe(false);
    expect(await store.getTwoFactor(user.id)).toBeNull();
    expect(await store.countUnusedRecoveryCodes(user.id)).toBe(0);
    expect(await turnOffTwoStep(store, me, { password: "a long password 123", code: "123456" }, KEY, at(120))).toEqual({ ok: false, error: "off" });
  });
});

// Sessions kept on the server: the session helpers with a cookie jar in memory.

const state = vi.hoisted(() => ({ store: null as unknown as MemoryStore, jar: new Map<string, string>() }));
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { name, value: state.jar.get(name)! } : undefined),
    has: (name: string) => state.jar.has(name),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
  headers: async () => new Headers(),
}));

describe("70 sessions kept on the server", () => {
  let user: User;
  beforeEach(async () => {
    state.store = new MemoryStore();
    state.jar = new Map();
    user = await state.store.createUser({ email: "ada@academy.test", name: "Ada", passwordHash: await hashPassword("a long password 123"), now: NOW });
  });

  it("ends a copied cookie when the browser signs out", async () => {
    const { SESSION_COOKIE, endSession, getCurrentUser, startSession } = await import("@/lib/auth/session");
    await startSession(user);
    const copied = state.jar.get(SESSION_COOKIE)!;
    expect((await getCurrentUser())?.id).toBe(user.id);
    await endSession();
    expect(state.jar.has(SESSION_COOKIE)).toBe(false);
    state.jar.set(SESSION_COOKIE, copied);
    expect(await getCurrentUser()).toBeNull();
  });

  it("signs out of every device, Yallapp Business phones too, and a password change still ends every session", async () => {
    const { SESSION_COOKIE, getCurrentUser, signOutEverywhere, startSession } = await import("@/lib/auth/session");
    await startSession(user);
    const first = state.jar.get(SESSION_COOKIE)!;
    await startSession(user);
    const second = state.jar.get(SESSION_COOKIE)!;
    await state.store.createOwnerDevice({
      id: "d1",
      userId: user.id,
      clientId: "c1",
      name: "Pixel",
      platform: "android",
      appVersion: null,
      language: null,
      refreshHash: "h".repeat(64),
      refreshExpiresAt: new Date(Date.now() + 86_400_000),
      sessionVersion: user.sessionVersion,
      pushToken: null,
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });
    expect((await getCurrentUser())?.id).toBe(user.id);
    await signOutEverywhere(user);
    for (const token of [first, second]) {
      state.jar.set(SESSION_COOKIE, token);
      expect(await getCurrentUser()).toBeNull();
    }
    expect(await state.store.listOwnerDevices(user.id)).toEqual([]);

    // A password change (the session version goes up) ends a session even while its row is there.
    const fresh = (await state.store.getUserById(user.id))!;
    await startSession(fresh);
    expect((await getCurrentUser())?.id).toBe(user.id);
    await state.store.updateUser(user.id, { sessionVersion: fresh.sessionVersion + 1 }, NOW);
    expect(await getCurrentUser()).toBeNull();
  });

  it("refuses a session cookie made before sessions were kept (no session ID)", async () => {
    const { SESSION_COOKIE, getCurrentUser } = await import("@/lib/auth/session");
    const { EncryptJWT } = await import("jose");
    const { createHash } = await import("node:crypto");
    const key = new Uint8Array(createHash("sha256").update(`yallapp-session:${process.env.SESSION_SECRET}`).digest());
    const old = await new EncryptJWT({ sv: user.sessionVersion })
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .setSubject(user.id)
      .setIssuer("yallapp.com.tr")
      .setAudience("yallapp-session")
      .setIssuedAt()
      .setExpirationTime("1h")
      .encrypt(key);
    state.jar.set(SESSION_COOKIE, old);
    expect(await getCurrentUser()).toBeNull();
  });

  it("sends someone with two-step sign-in to the code page, and starts the session only after the code", async () => {
    const { SESSION_COOKIE, TWO_STEP_COOKIE, getCurrentUser, pendingTwoStep } = await import("@/lib/auth/session");
    const { afterPassword } = await import("@/lib/auth/sign-in");
    const now = new Date();
    const secret = (await beginTwoStepSetup(state.store, user, KEY, now))!;
    await confirmTwoStepSetup(state.store, user, totpCode(secret, totpStep(now)), KEY, now);
    expect(await afterPassword(user, { lang: "ar", next: "/dashboard" })).toBe("/ar/sign-in/code");
    expect(state.jar.has(SESSION_COOKIE)).toBe(false);
    expect(state.jar.has(TWO_STEP_COOKIE)).toBe(true);
    expect(await getCurrentUser()).toBeNull();
    expect(await pendingTwoStep()).toMatchObject({ user: { id: user.id }, next: "/dashboard" });
    // A password change in between ends the waiting step too.
    await state.store.updateUser(user.id, { sessionVersion: user.sessionVersion + 1 }, NOW);
    expect(await pendingTwoStep()).toBeNull();
  });
});
