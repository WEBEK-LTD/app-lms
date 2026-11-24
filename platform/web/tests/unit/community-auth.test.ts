import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { api, joinWithEmail, NOW, testCommunity } from "./community-support";

/**
 * 231 Joining and signing in to Yallapp Community (docs/api/community.yaml,
 * Auth): email and password, Sign in with Apple and Google (tokens checked
 * against the providers' keys, the audience and Apple's nonce), renewing
 * and signing out, confirming the email, resetting a password, the limits,
 * a suspended member, and the messages in the reader's language.
 */
type Session = { access_token: string; refresh_token: string; created: boolean; member: Record<string, unknown> & { id: string; username: string } };
type ErrorBody = { error: { code: string; message: string; fields?: Record<string, string> } };

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const linkToken = (text: string) => /token=([\w-]+)/.exec(text)?.[1] ?? "";

describe("231 community auth: email", () => {
  it("joins with email: a member with a username from the name, signed in, a link to confirm the email", async () => {
    const c = await testCommunity();
    const r = await api<Session>(c, "POST", "/auth/email/sign-up", {
      body: { email: "Mohamed@Example.test", password: "correct horse battery", display_name: "Mohamed Ali", device: { name: "iPhone 16", platform: "ios" } },
    });
    expect(r.status).toBe(201);
    expect(r.body.created).toBe(true);
    expect(r.body.member).toMatchObject({ username: "mohamed.ali", display_name: "Mohamed Ali", email: "mohamed@example.test", email_verified: false, has_password: true, providers: ["email"], language: "en", role: "member", top_badge: null });
    expect(c.mail.sent).toHaveLength(1);
    expect(c.mail.sent[0]).toMatchObject({ to: "mohamed@example.test", subject: "Confirm your email for Yallapp Community" });
    expect(c.mail.sent[0]!.text).toContain("https://community.yallapp.test/verify-email?token=");
    const me = await api(c, "GET", "/me", { token: r.body.access_token });
    expect(me.body).toMatchObject({ id: r.body.member.id });
    const sessions = await api<{ items: { name: string; platform: string; current: boolean }[] }>(c, "GET", "/me/sessions", { token: r.body.access_token });
    expect(sessions.body.items).toEqual([expect.objectContaining({ name: "iPhone 16", platform: "ios", current: true })]);
    // The same name again gets a username of its own.
    const twin = await joinWithEmail(c, "Mohamed Ali", { email: "other@example.test" });
    expect(twin.username).toMatch(/^mohamed\.ali\d+$/);
  });

  it("refuses a taken email or username and wrong fields, in the reader's language", async () => {
    const c = await testCommunity();
    await joinWithEmail(c, "Nour", { username: "nour" });
    const again = await api<ErrorBody>(c, "POST", "/auth/email/sign-up", { body: { email: "nour@members.test", password: "another password", display_name: "Nour 2" } });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("email_taken");
    const name = await api<ErrorBody>(c, "POST", "/auth/email/sign-up", { body: { email: "x@members.test", password: "another password", display_name: "X", username: "NOUR" } });
    expect(name.body.error.code).toBe("username_taken");
    const bad = await api<ErrorBody>(c, "POST", "/auth/email/sign-up", { body: { email: "not-an-email", password: "short", display_name: "" }, lang: "ar" });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatchObject({ code: "invalid_request", message: "يُرجى مراجعة الحقول المحددة." });
    expect(bad.body.error.fields).toEqual({ email: "أدخل بريدًا إلكترونيًا صحيحًا.", password: "استخدم 8 أحرف على الأقل.", display_name: "مطلوب." });
    const tr = await api<ErrorBody>(c, "POST", "/auth/email/log-in", { body: { email: "nour@members.test", password: "wrong password" }, lang: "tr-TR,tr;q=0.9" });
    expect(tr.body.error.message).toBe("E-posta veya şifre hatalı.");
  });

  it("logs in, renews the tokens (the old refresh token stops working), and logs out", async () => {
    const c = await testCommunity();
    const joined = await joinWithEmail(c, "Lina");
    const wrong = await api<ErrorBody>(c, "POST", "/auth/email/log-in", { body: { email: joined.email, password: "not it at all" } });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe("invalid_credentials");
    const login = await api<Session>(c, "POST", "/auth/email/log-in", { body: { email: joined.email.toUpperCase(), password: "correct horse battery" } });
    expect(login.status).toBe(200);
    expect(login.body.created).toBe(false);
    const renewed = await api<Session>(c, "POST", "/auth/refresh", { body: { refresh_token: login.body.refresh_token } });
    expect(renewed.status).toBe(200);
    expect((await api(c, "GET", "/me", { token: login.body.access_token })).status).toBe(401);
    expect((await api(c, "GET", "/me", { token: renewed.body.access_token })).status).toBe(200);
    expect((await api(c, "POST", "/auth/refresh", { body: { refresh_token: login.body.refresh_token } })).status).toBe(401);
    expect((await api(c, "POST", "/auth/log-out", { token: renewed.body.access_token })).status).toBe(204);
    expect((await api(c, "GET", "/me", { token: renewed.body.access_token })).status).toBe(401);
    expect((await api(c, "POST", "/auth/refresh", { body: { refresh_token: renewed.body.refresh_token } })).status).toBe(401);
  });

  it("access tokens last 15 minutes; refresh tokens 60 days", async () => {
    const c = await testCommunity();
    const joined = await joinWithEmail(c, "Omar");
    c.at(new Date(NOW.getTime() + 16 * 60 * 1000));
    expect((await api(c, "GET", "/me", { token: joined.token })).status).toBe(401);
    const renewed = await api<Session>(c, "POST", "/auth/refresh", { body: { refresh_token: joined.refresh } });
    expect(renewed.status).toBe(200);
    c.at(new Date(NOW.getTime() + 61 * 24 * 60 * 60 * 1000));
    expect((await api(c, "POST", "/auth/refresh", { body: { refresh_token: renewed.body.refresh_token } })).status).toBe(401);
  });

  it("limits attempts: 8 per email in 15 minutes (joining counts as one)", async () => {
    const c = await testCommunity();
    const joined = await joinWithEmail(c, "Ece");
    const tries = [];
    for (let i = 0; i < 7; i++) tries.push((await api(c, "POST", "/auth/email/log-in", { body: { email: joined.email, password: "wrong password" } })).status);
    expect(tries.every((s) => s === 401)).toBe(true);
    const ninth = await api<ErrorBody>(c, "POST", "/auth/email/log-in", { body: { email: joined.email, password: "correct horse battery" } });
    expect(ninth.status).toBe(429);
    expect(ninth.body.error.code).toBe("too_many_attempts");
  });

  it("confirms the email with the link (once), and resets a forgotten password (every device signs in again)", async () => {
    const c = await testCommunity();
    const joined = await joinWithEmail(c, "Dina");
    const token = linkToken(c.mail.sent[0]!.text);
    expect((await api(c, "POST", "/auth/email/verify", { body: { token } })).status).toBe(204);
    expect((await api(c, "POST", "/auth/email/verify", { body: { token } })).status).toBe(400);
    expect((await api(c, "GET", "/me", { token: joined.token })).body).toMatchObject({ email_verified: true });

    // Unknown addresses get the same answer and no email.
    expect((await api(c, "POST", "/auth/password-reset", { body: { email: "nobody@members.test" } })).status).toBe(204);
    expect((await api(c, "POST", "/auth/password-reset", { body: { email: joined.email } })).status).toBe(204);
    expect(c.mail.sent).toHaveLength(2);
    expect(c.mail.sent[1]).toMatchObject({ to: joined.email, subject: "Reset your Yallapp Community password" });
    const reset = linkToken(c.mail.sent[1]!.text);
    expect((await api(c, "POST", "/auth/password-reset/confirm", { body: { token: reset, password: "a brand new password" } })).status).toBe(204);
    expect((await api(c, "GET", "/me", { token: joined.token })).status).toBe(401);
    expect((await api(c, "POST", "/auth/email/log-in", { body: { email: joined.email, password: "correct horse battery" } })).status).toBe(401);
    expect((await api(c, "POST", "/auth/email/log-in", { body: { email: joined.email, password: "a brand new password" } })).status).toBe(200);
    // An hour later the link is gone; and it works once.
    expect((await api(c, "POST", "/auth/password-reset/confirm", { body: { token: reset, password: "yet another one" } })).status).toBe(400);
  });

  it("a suspended member is refused, but can still read their account and log out", async () => {
    const c = await testCommunity();
    const joined = await joinWithEmail(c, "Can");
    await c.deps.store.base.updateMember(joined.id, { status: "suspended" });
    expect((await api(c, "GET", "/me", { token: joined.token })).body).toMatchObject({ status: "suspended" });
    const patch = await api<ErrorBody>(c, "PATCH", "/me", { token: joined.token, body: { bio: "hi" } });
    expect(patch.status).toBe(403);
    expect(patch.body.error.code).toBe("account_suspended");
    expect((await api(c, "POST", "/auth/email/log-in", { body: { email: joined.email, password: "correct horse battery" } })).status).toBe(403);
    expect((await api(c, "POST", "/auth/log-out", { token: joined.token })).status).toBe(204);
  });
});

describe("231 community auth: Apple and Google", () => {
  it("Continue with Apple: the first time makes the member (the name sent by the app), then signs them in; the nonce must match", async () => {
    const c = await testCommunity();
    const claims = { sub: "001234.apple", email: "abc@privaterelay.appleid.com", email_verified: "true", is_private_email: "true", nonce: sha256("raw-nonce") };
    const token = await c.idToken("apple", claims);
    const first = await api<Session>(c, "POST", "/auth/apple", { body: { id_token: token, nonce: "raw-nonce", display_name: "Sara Kaya", language: "tr", device: { platform: "ios" } } });
    expect(first.status).toBe(201);
    expect(first.body.member).toMatchObject({ display_name: "Sara Kaya", username: "sara.kaya", email: "abc@privaterelay.appleid.com", email_verified: true, has_password: false, providers: ["apple"], language: "tr" });
    const again = await api<Session>(c, "POST", "/auth/apple", { body: { id_token: token, nonce: "raw-nonce" } });
    expect(again.status).toBe(200);
    expect(again.body.member.id).toBe(first.body.member.id);
    const badNonce = await api<ErrorBody>(c, "POST", "/auth/apple", { body: { id_token: token, nonce: "another" } });
    expect(badNonce.status).toBe(401);
    expect((await api(c, "POST", "/auth/apple", { body: { id_token: token } })).status).toBe(401);
    expect((await api(c, "POST", "/auth/apple", { body: { id_token: "not.a.token" } })).status).toBe(401);
    // A token for Google isn't Apple's.
    expect((await api(c, "POST", "/auth/apple", { body: { id_token: await c.idToken("google", { sub: "g1" }) } })).status).toBe(401);
  });

  it("Continue with Google: a verified email that is a member's signs that member in and confirms it", async () => {
    const c = await testCommunity();
    const joined = await joinWithEmail(c, "Murat");
    const token = await c.idToken("google", { sub: "google-77", email: joined.email, email_verified: true, name: "Murat Y." });
    const r = await api<Session>(c, "POST", "/auth/google", { body: { id_token: token } });
    expect(r.status).toBe(200);
    expect(r.body.created).toBe(false);
    expect(r.body.member).toMatchObject({ id: joined.id, email_verified: true, providers: ["email", "google"] });
    // An unverified email is never taken as a member's: a new member.
    const other = await api<Session>(c, "POST", "/auth/google", { body: { id_token: await c.idToken("google", { sub: "google-88", email: "x@members.test", email_verified: false, name: "Xu" }) } });
    expect(other.status).toBe(201);
    expect(other.body.member).toMatchObject({ display_name: "Xu", email_verified: false });
  });

  it("without the provider's settings, answers 503 provider_not_configured", async () => {
    const c = await testCommunity({ providers: false });
    const r = await api<ErrorBody>(c, "POST", "/auth/google", { body: { id_token: "x" } });
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("provider_not_configured");
  });
});
