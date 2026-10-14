import { describe, expect, it } from "vitest";
import { buildConfigFor, newApp } from "@/lib/app/setup";
import { authenticate, registerClient } from "@/lib/auth/accounts";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkResetToken, completePasswordReset, createPasswordReset } from "@/lib/auth/reset";
import { SESSION_TTL_SECONDS, sealSession, unsealSession } from "@/lib/auth/session-token";
import { MemoryStore } from "@/lib/data/memory";
import { DuplicateEmailError } from "@/lib/data/store";
import { forgotSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validation";
import { NOW } from "./helpers";

const SECRET = "session-secret-for-tests-0123456789abcdef";

describe("session tokens", () => {
  it("round-trips the user id and session version", async () => {
    const token = await sealSession({ userId: "user-1", sessionVersion: 3 }, SECRET, NOW);
    expect(token.split(".")).toHaveLength(5); // compact JWE
    expect(token).not.toContain("user-1");
    expect(await unsealSession(token, SECRET, NOW)).toEqual({ userId: "user-1", sessionVersion: 3 });
  });

  it("rejects expired, tampered or foreign tokens", async () => {
    const token = await sealSession({ userId: "user-1", sessionVersion: 1 }, SECRET, NOW);
    const later = new Date(NOW.getTime() + (SESSION_TTL_SECONDS + 60) * 1000);
    expect(await unsealSession(token, SECRET, later)).toBeNull();
    expect(await unsealSession(token, "another-secret-0123456789abcdef0123456789", NOW)).toBeNull();
    const parts = token.split(".");
    parts[3] = parts[3]!.slice(0, -2) + (parts[3]!.endsWith("A") ? "BB" : "AA");
    expect(await unsealSession(parts.join("."), SECRET, NOW)).toBeNull();
    expect(await unsealSession("not-a-token", SECRET, NOW)).toBeNull();
  });
});

describe("passwords", () => {
  it("hashes with argon2id and verifies", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "correct horse battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong password!")).toBe(false);
    expect(await verifyPassword(null, "anything")).toBe(false);
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});

describe("accounts", () => {
  it("registers a pending client and refuses duplicate emails", async () => {
    const store = new MemoryStore();
    const input = { name: "Ada", email: "Ada@Academy.test", whatsapp: "+905446731942", siteUrl: "https://academy.test", password: "a long password" };
    const { user, client } = await registerClient(store, input, NOW);
    expect(user.email).toBe("ada@academy.test");
    expect(client.status).toBe("pending");
    await expect(registerClient(store, { ...input, email: "ada@academy.test" }, NOW)).rejects.toBeInstanceOf(DuplicateEmailError);

    expect(await authenticate(store, "ada@academy.test", "a long password", NOW)).not.toBeNull();
    expect(await authenticate(store, "ada@academy.test", "wrong password", NOW)).toBeNull();
    expect(await authenticate(store, "nobody@academy.test", "a long password", NOW)).toBeNull();
  });
});

describe("password reset", () => {
  it("is single use, expires, and signs out other sessions", async () => {
    const store = new MemoryStore();
    const { user } = await registerClient(
      store,
      { name: "Ada", email: "ada@academy.test", whatsapp: "+905446731942", siteUrl: "https://academy.test", password: "first password" },
      NOW,
    );
    const request = await createPasswordReset(store, "ADA@academy.test", NOW, { adminEmails: [] });
    expect(request?.isNewAccount).toBe(false);
    const token = request!.token;
    expect((await checkResetToken(store, token, NOW)).ok).toBe(true);
    expect(await checkResetToken(store, token, new Date(NOW.getTime() + 61 * 60 * 1000))).toEqual({ ok: false, reason: "expired" });

    const done = await completePasswordReset(store, token, await hashPassword("second password"), NOW);
    expect(done.ok).toBe(true);
    if (done.ok) expect(done.user.sessionVersion).toBe(user.sessionVersion + 1);
    expect(await completePasswordReset(store, token, "x", NOW)).toEqual({ ok: false, reason: "used" });
    expect(await authenticate(store, "ada@academy.test", "second password", NOW)).not.toBeNull();
    expect(await completePasswordReset(store, "unknown-token-unknown-token", "x", NOW)).toEqual({ ok: false, reason: "invalid" });
  });

  it("says nothing about unknown emails", async () => {
    const store = new MemoryStore();
    expect(await createPasswordReset(store, "nobody@academy.test", NOW, { adminEmails: [] })).toBeNull();
    expect(await store.getUserByEmail("nobody@academy.test")).toBeNull();
  });

  it("creates the account for a super admin's first request", async () => {
    const store = new MemoryStore();
    const request = await createPasswordReset(store, "Owner@Yallapp.test", NOW, { adminEmails: ["owner@yallapp.test"] });
    expect(request?.isNewAccount).toBe(true);
    const user = await store.getUserByEmail("owner@yallapp.test");
    expect(user?.passwordHash).toBeNull();
    expect(await store.getClientByUserId(user!.id)).toBeNull();
  });
});

describe("auth form rules", () => {
  const valid = {
    name: "Ada Lovelace",
    email: " ADA@academy.test ",
    whatsapp: "+90 544 673 19 42",
    siteUrl: "academy.test",
    password: "0123456789",
    terms: "on",
  };

  it("accepts and normalises a valid sign-up", () => {
    const parsed = signUpSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("ada@academy.test");
      expect(parsed.data.whatsapp).toBe("+905446731942");
      expect(parsed.data.siteUrl).toBe("https://academy.test");
    }
  });

  it("lets clients sign up without a website, and new apps then start without one", async () => {
    for (const siteUrl of ["", "   ", undefined]) {
      const parsed = signUpSchema.safeParse({ ...valid, siteUrl });
      expect(parsed.success, String(siteUrl)).toBe(true);
      if (parsed.success) expect(parsed.data.siteUrl).toBe("");
    }
    expect(signUpSchema.safeParse({ ...valid, siteUrl: "not a site" }).success).toBe(false);

    const store = new MemoryStore();
    const parsed = signUpSchema.parse({ ...valid, email: "nosite@shop.test", siteUrl: "" });
    const { client } = await registerClient(store, parsed, NOW);
    expect(client.siteUrl).toBe("");
    const app = newApp(client.id, client.siteUrl, NOW, "store");
    expect(app.siteUrl).toBeNull();
    // The hosted API's config falls back to the platform's address.
    const config = buildConfigFor({ ...app, backend: "hosted" }, client, { name: "1.0.0", code: 1 }, (id) => `https://yallapp.test/${id}`);
    expect(config.site_url).toMatch(/^https?:\/\//);
  });

  it("requires the terms checkbox, a 10-character password and a real email", () => {
    expect(signUpSchema.safeParse({ ...valid, terms: undefined }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, whatsapp: "12" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(forgotSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(resetSchema.safeParse({ token: "x".repeat(43), password: "0123456789", confirm: "0123456780" }).success).toBe(false);
  });
});
