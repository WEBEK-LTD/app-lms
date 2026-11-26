import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { confirmEmail, emailConfirmMail, emailConfirmToken } from "@/lib/auth/email-confirm";
import { completePasswordReset, createPasswordReset } from "@/lib/auth/reset";
import { approveYallappSignin, APP_SIGNIN_REDIRECT, denyYallappSignin, pkceChallenge } from "@/lib/community/base/yallapp-signin";
import { api, joinWithEmail, testCommunity, type TestCommunity } from "./community-support";

/**
 * 231 "Continue with Yallapp" (PKCE S256, a one-time code) and the one-tap
 * link to a Yallapp account with the same verified email; and Yallapp's
 * "Confirm your email", which both trust.
 */

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const SITE_REDIRECT = "https://community.yallapp.test/auth/yallapp/callback";

async function yallappUser(c: TestCommunity, email: string, extra: { verified?: boolean; admin?: boolean; name?: string } = {}) {
  const user = await c.deps.platform.createUser({ email, name: extra.name ?? "Salma Haddad", passwordHash: null, now: c.deps.now });
  if (extra.verified) await c.deps.platform.updateUser(user.id, { emailVerifiedAt: c.deps.now }, c.deps.now);
  if (extra.admin) await c.deps.platform.saveAdminMember({ userId: user.id, role: "owner", addedBy: "owner@yallapp.test", addedAt: c.deps.now, updatedAt: c.deps.now });
  return user;
}

/** The app's side up to the redirect: start, then the Yallapp user approves on the page. */
async function approved(c: TestCommunity, userId: string, options: { redirect?: string; verifier?: string } = {}) {
  const verifier = options.verifier ?? randomBytes(32).toString("base64url");
  const redirect = options.redirect ?? APP_SIGNIN_REDIRECT;
  const start = await api<Json>(c, "POST", "/auth/yallapp/start", { body: { redirect_uri: redirect, code_challenge: pkceChallenge(verifier), code_challenge_method: "S256", state: "state-1234" } });
  expect(start.status, JSON.stringify(start.body)).toBe(200);
  const authorize = new URL(start.body.authorize_url);
  expect(authorize.pathname).toBe("/link-community");
  expect(authorize.searchParams.get("mode")).toBe("signin");
  const request = authorize.searchParams.get("request")!;
  const back = await approveYallappSignin(c.deps, request, userId);
  expect(back).toBeTruthy();
  const url = new URL(back!);
  expect(url.searchParams.get("state")).toBe("state-1234");
  return { code: url.searchParams.get("code")!, verifier, redirect, request, back: back! };
}

const exchange = (c: TestCommunity, body: Json) => api<Json>(c, "POST", "/auth/yallapp", { body: { device: { platform: "ios", name: "iPhone" }, ...body } });

describe("231 Continue with Yallapp", () => {
  it("makes a member linked to the account the first time, then signs the same one in", async () => {
    const c = await testCommunity({ providers: false });
    const user = await yallappUser(c, "salma@shop.test", { verified: true });
    const first = await approved(c, user.id);
    expect(first.back.startsWith(`${APP_SIGNIN_REDIRECT}?code=`)).toBe(true);
    const made = await exchange(c, { code: first.code, code_verifier: first.verifier, redirect_uri: first.redirect });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    expect(made.body).toMatchObject({ created: true, member: { display_name: "Salma Haddad", email: "salma@shop.test", email_verified: true, providers: ["yallapp"], community_role: null } });
    const member = await c.deps.store.base.getMemberByYallappUser(user.id);
    expect(member).toMatchObject({ yallappLinkVia: "signin", email: "salma@shop.test" });

    const again = await approved(c, user.id, { redirect: SITE_REDIRECT });
    const signed = await exchange(c, { code: again.code, code_verifier: again.verifier, redirect_uri: SITE_REDIRECT });
    expect(signed.status).toBe(200);
    expect(signed.body).toMatchObject({ created: false, member: { id: member!.id } });
  });

  it("refuses a bad, expired or reused code, another redirect and the wrong verifier, all the same way", async () => {
    const c = await testCommunity({ providers: false });
    const user = await yallappUser(c, "salma@shop.test");
    const bad = (r: { status: number; body: Json }) => {
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe("invalid_token");
    };
    let a = await approved(c, user.id);
    bad(await exchange(c, { code: "not-a-code", code_verifier: a.verifier, redirect_uri: a.redirect }));
    // The wrong verifier spends the code: the right one can't use it after.
    bad(await exchange(c, { code: a.code, code_verifier: randomBytes(32).toString("base64url"), redirect_uri: a.redirect }));
    bad(await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: a.redirect }));
    a = await approved(c, user.id);
    bad(await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: SITE_REDIRECT }));
    a = await approved(c, user.id);
    expect((await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: a.redirect })).status).toBe(201);
    bad(await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: a.redirect }));
    // A code lasts 2 minutes.
    a = await approved(c, user.id);
    c.at(new Date(c.deps.now.getTime() + 3 * 60_000));
    bad(await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: a.redirect }));
  });

  it("only sends codes to the site and the app, with S256, and a request is approved once, in time", async () => {
    const c = await testCommunity({ providers: false });
    const user = await yallappUser(c, "salma@shop.test");
    const challenge = pkceChallenge(randomBytes(32).toString("base64url"));
    for (const redirect of ["https://evil.test/auth/yallapp/callback", "yallappcommunity://auth/yallapp/x", `${SITE_REDIRECT}?x=1`]) {
      const r = await api<Json>(c, "POST", "/auth/yallapp/start", { body: { redirect_uri: redirect, code_challenge: challenge, code_challenge_method: "S256", state: "state-1234" } });
      expect(r.status).toBe(400);
      expect(r.body.error.fields).toHaveProperty("redirect_uri");
    }
    const plain = await api<Json>(c, "POST", "/auth/yallapp/start", { body: { redirect_uri: APP_SIGNIN_REDIRECT, code_challenge: challenge, code_challenge_method: "plain", state: "state-1234" } });
    expect(plain.body.error.fields).toHaveProperty("code_challenge");

    const a = await approved(c, user.id);
    expect(await approveYallappSignin(c.deps, a.request, user.id)).toBeNull();
    // Cancelled: the client hears access_denied, and the request can't be approved after.
    const start = await api<Json>(c, "POST", "/auth/yallapp/start", { body: { redirect_uri: APP_SIGNIN_REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state: "state-5678" } });
    const request = new URL(start.body.authorize_url).searchParams.get("request")!;
    expect(await denyYallappSignin(c.deps, request)).toBe(`${APP_SIGNIN_REDIRECT}?error=access_denied&state=state-5678`);
    expect(await approveYallappSignin(c.deps, request, user.id)).toBeNull();
    // A request waits 10 minutes.
    const late = await api<Json>(c, "POST", "/auth/yallapp/start", { body: { redirect_uri: APP_SIGNIN_REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state: "state-9999" } });
    c.at(new Date(c.deps.now.getTime() + 11 * 60_000));
    expect(await approveYallappSignin(c.deps, new URL(late.body.authorize_url).searchParams.get("request")!, user.id)).toBeNull();
  });

  it("never makes a Community admin, even for an admin's Yallapp account", async () => {
    const c = await testCommunity({ providers: false });
    const owner = await yallappUser(c, "owner@yallapp.test", { verified: true, admin: true });
    const a = await approved(c, owner.id);
    const r = await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: a.redirect });
    expect(r.status).toBe(201);
    expect(r.body.member).toMatchObject({ community_role: null, team: false });
    expect((await api(c, "GET", "/admin/settings", { token: r.body.access_token })).status).toBe(403);
  });

  it("doesn't take over a member who has the email: they log in their own way, then link", async () => {
    const c = await testCommunity({ providers: false });
    await joinWithEmail(c, "Salma");
    const user = await yallappUser(c, "salma@members.test", { verified: true });
    const a = await approved(c, user.id);
    const r = await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: a.redirect });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("email_taken");
  });

  it("trusts the account's email only once Yallapp confirmed it; otherwise the community asks for it", async () => {
    const c = await testCommunity({ providers: false });
    const user = await yallappUser(c, "noor@shop.test");
    const a = await approved(c, user.id);
    const r = await exchange(c, { code: a.code, code_verifier: a.verifier, redirect_uri: a.redirect });
    expect(r.body.member).toMatchObject({ email: "noor@shop.test", email_verified: false });
    expect(c.mail.sent.map((m) => m.to)).toContain("noor@shop.test");
  });
});

describe("231 the one-tap link suggestion", () => {
  async function member(c: TestCommunity, name: string, verified: boolean) {
    const m = await joinWithEmail(c, name);
    if (verified) await c.deps.store.base.updateMember(m.id, { emailVerified: true });
    return m;
  }
  const suggestion = async (c: TestCommunity, token: string) => (await api<Json>(c, "GET", "/me", { token })).body.link_suggestion;

  it("is offered only when both emails are verified, names no one, and links in one tap", async () => {
    const c = await testCommunity({ providers: false });
    const m = await member(c, "Rami", false);
    const user = await yallappUser(c, "rami@members.test", { name: "Rami's Shop" });
    expect(await suggestion(c, m.token)).toEqual({ available: false });
    await c.deps.store.base.updateMember(m.id, { emailVerified: true });
    expect(await suggestion(c, m.token)).toEqual({ available: false });
    expect((await api(c, "POST", "/me/yallapp-link/suggested", { token: m.token })).status).toBe(409);
    await c.deps.platform.updateUser(user.id, { emailVerifiedAt: c.deps.now }, c.deps.now);
    const offered = await api<Json>(c, "GET", "/me", { token: m.token });
    expect(offered.body.link_suggestion).toEqual({ available: true });
    expect(JSON.stringify(offered.body)).not.toContain("Rami's Shop");

    const linked = await api<Json>(c, "POST", "/me/yallapp-link/suggested", { token: m.token });
    expect(linked.status).toBe(200);
    expect(linked.body).toMatchObject({ linked: true, account_name: "Rami's Shop" });
    expect(await c.deps.store.base.getMember(m.id)).toMatchObject({ yallappUserId: user.id, yallappLinkVia: "suggested" });
    expect(await suggestion(c, m.token)).toEqual({ available: false });
  });

  it("is never offered for an account on Yallapp's team, nor once dismissed", async () => {
    const c = await testCommunity({ providers: false });
    const staff = await member(c, "Dana", true);
    await yallappUser(c, "dana@members.test", { verified: true, admin: true });
    expect(await suggestion(c, staff.token)).toEqual({ available: false });
    expect((await api(c, "POST", "/me/yallapp-link/suggested", { token: staff.token })).status).toBe(409);

    const m = await member(c, "Omar", true);
    await yallappUser(c, "omar@members.test", { verified: true });
    expect(await suggestion(c, m.token)).toEqual({ available: true });
    expect((await api(c, "DELETE", "/me/yallapp-link/suggested", { token: m.token })).status).toBe(204);
    expect(await suggestion(c, m.token)).toEqual({ available: false });
    expect((await api(c, "POST", "/me/yallapp-link/suggested", { token: m.token })).status).toBe(409);
  });

  it("a one-tap link to an admin's account would never make an admin: only the full link does", async () => {
    const c = await testCommunity({ providers: false });
    const m = await member(c, "Lina", true);
    const user = await yallappUser(c, "lina@members.test", { verified: true });
    expect((await api(c, "POST", "/me/yallapp-link/suggested", { token: m.token })).status).toBe(200);
    // The account joins Yallapp's team afterwards: the member still doesn't run the community.
    await c.deps.platform.saveAdminMember({ userId: user.id, role: "admin", addedBy: "owner@yallapp.test", addedAt: c.deps.now, updatedAt: c.deps.now });
    expect((await api<Json>(c, "GET", "/me", { token: m.token })).body.community_role).toBeNull();
  });
});

describe("231 Yallapp's Confirm your email", () => {
  it("records the email once, for 24 hours, only for the email it names, at most 3 an hour", async () => {
    const c = await testCommunity({ providers: false });
    const store = c.deps.platform;
    const user = await yallappUser(c, "hana@shop.test");
    const mail = await emailConfirmMail(store, user, c.deps.now);
    expect(mail).toMatchObject({ to: "hana@shop.test", subject: "Confirm your email for Yallapp" });
    const token = new URL(mail!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
    expect(await confirmEmail(store, `${token}x`, c.deps.now)).toEqual({ ok: false, reason: "invalid" });
    expect(await confirmEmail(store, token, new Date(c.deps.now.getTime() + 25 * 3600_000))).toEqual({ ok: false, reason: "expired" });
    expect((await confirmEmail(store, token, c.deps.now)).ok).toBe(true);
    expect((await store.getUserById(user.id))?.emailVerifiedAt).toEqual(c.deps.now);
    expect(await confirmEmail(store, token, c.deps.now)).toEqual({ ok: false, reason: "used" });
    // A link made for another address confirms nothing.
    const other = await yallappUser(c, "other@shop.test");
    expect(await confirmEmail(store, emailConfirmToken({ id: other.id, email: "hana@shop.test" }, c.deps.now), c.deps.now)).toEqual({ ok: false, reason: "invalid" });
    // Asked for again and again: 3 an hour.
    const sent = [];
    for (let i = 0; i < 5; i++) sent.push(await emailConfirmMail(store, other, c.deps.now));
    expect(sent.filter(Boolean)).toHaveLength(3);
  });

  it("a completed password reset confirms the email too", async () => {
    const c = await testCommunity({ providers: false });
    const store = c.deps.platform;
    const user = await yallappUser(c, "zaid@shop.test");
    const reset = await createPasswordReset(store, "zaid@shop.test", c.deps.now, { adminEmails: [] });
    expect((await completePasswordReset(store, reset!.token, "hash", c.deps.now)).ok).toBe(true);
    expect((await store.getUserById(user.id))?.emailVerifiedAt).toEqual(c.deps.now);
  });
});
