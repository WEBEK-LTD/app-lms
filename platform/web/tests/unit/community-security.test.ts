import { describe, expect, it } from "vitest";
import { newMember } from "@/lib/community/base/accounts";
import { linkedMail } from "@/lib/community/base/linking";
import { communityOrigins, cookieRequestAllowed } from "@/lib/community/csrf";
import { safeHref } from "@/lib/content/markdown";
import { api, joinWithEmail, makeYallappStaff, NOW, testCommunity, type TestCommunity } from "./community-support";

/** A member made in the store (past the sign-up limits per IP). */
async function made(c: TestCommunity, n: number) {
  return c.deps.store.base.createMember(newMember({ email: `m${n}@made.test`, emailVerified: true, passwordHash: null, displayName: `Made ${n}`, username: `made${n}`, language: "en", now: NOW }));
}

/**
 * 231 The security pass over Yallapp Community's base: the website's
 * cookie signs in a change only from the community's own pages; Apple or
 * Google proving an email takes over an account whose joiner never did;
 * reserved usernames and names that pass for Yallapp's team; limits on
 * follows, friend requests, reports, pictures and links; the linked
 * account's owner is emailed; a markdown link can't hide another site.
 */
type ErrorBody = { error: { code: string; fields?: Record<string, string> } };

describe("231 security: cross-site requests with the website's cookie", () => {
  const origins = communityOrigins("https://community.yallapp.com.tr", "https://yallapp.com.tr");
  const h = (entries: Record<string, string>) => new Headers(entries);

  it("takes the cookie on a change only from the community's own origins", () => {
    expect(cookieRequestAllowed("GET", h({ origin: "https://evil.test" }), origins)).toBe(true);
    expect(cookieRequestAllowed("POST", h({ origin: "https://community.yallapp.com.tr" }), origins)).toBe(true);
    expect(cookieRequestAllowed("DELETE", h({ origin: "https://yallapp.com.tr" }), origins)).toBe(true);
    // Another subdomain of yallapp.com.tr is the same site for SameSite=Lax, but not ours.
    expect(cookieRequestAllowed("POST", h({ origin: "https://shop.yallapp.com.tr" }), origins)).toBe(false);
    expect(cookieRequestAllowed("PUT", h({ origin: "https://evil.test" }), origins)).toBe(false);
    expect(cookieRequestAllowed("PATCH", h({ origin: "null" }), origins)).toBe(false);
    // Without an Origin, only the browser's own same-origin says so.
    expect(cookieRequestAllowed("POST", h({ "sec-fetch-site": "same-origin" }), origins)).toBe(true);
    expect(cookieRequestAllowed("POST", h({ "sec-fetch-site": "same-site" }), origins)).toBe(false);
    expect(cookieRequestAllowed("POST", h({}), origins)).toBe(false);
  });
});

describe("231 security: accounts", () => {
  it("Google proving an email takes over an account joined with it but never confirmed: the old password and devices go", async () => {
    const c = await testCommunity();
    // Someone joins with the owner's address first and keeps the password.
    const squatter = await joinWithEmail(c, "Squatter", { email: "owner@members.test" });
    const token = await c.idToken("google", { sub: "owner-google", email: "owner@members.test", email_verified: true, name: "Real Owner" });
    const r = await api<{ member: { id: string; has_password: boolean; email_verified: boolean } }>(c, "POST", "/auth/google", { body: { id_token: token } });
    expect(r.status).toBe(200);
    expect(r.body.member).toMatchObject({ id: squatter.id, has_password: false, email_verified: true });
    expect((await api(c, "GET", "/me", { token: squatter.token })).status).toBe(401);
    expect((await api(c, "POST", "/auth/refresh", { body: { refresh_token: squatter.refresh } })).status).toBe(401);
    expect((await api(c, "POST", "/auth/email/log-in", { body: { email: "owner@members.test", password: "correct horse battery" } })).status).toBe(401);
  });

  it("a confirmed account keeps its password when its owner adds Google", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Confirmed");
    await c.deps.store.base.updateMember(me.id, { emailVerified: true });
    await api(c, "POST", "/auth/google", { body: { id_token: await c.idToken("google", { sub: "g-confirmed", email: me.email, email_verified: true }) } });
    expect((await api(c, "GET", "/me", { token: me.token })).status).toBe(200);
    expect((await api(c, "POST", "/auth/email/log-in", { body: { email: me.email, password: "correct horse battery" } })).status).toBe(200);
  });

  it("keeps Yallapp's usernames and names for its team", async () => {
    const c = await testCommunity();
    for (const username of ["yallapp", "yallapp_support", "admin", "support.1", "moderator"]) {
      const r = await api<ErrorBody>(c, "POST", "/auth/email/sign-up", { body: { email: `${username}@members.test`, password: "long enough pass", display_name: "Someone", username } });
      expect(r.body.error.fields, username).toEqual({ username: "This username is reserved." });
    }
    const named = await api<ErrorBody>(c, "POST", "/auth/email/sign-up", { body: { email: "team@members.test", password: "long enough pass", display_name: "Yallapp Team" } });
    expect(named.body.error.fields).toEqual({ display_name: "Choose a name that isn't Yallapp's." });
    // A name that only looks like a reserved one isn't caught ("modern", "adminah" would be: "admin" + letters isn't).
    expect((await api(c, "POST", "/auth/email/sign-up", { body: { email: "m@members.test", password: "long enough pass", display_name: "Modern Maker", username: "modern" } })).status).toBe(201);
    const me = await joinWithEmail(c, "Plain");
    expect((await api(c, "PATCH", "/me", { token: me.token, body: { display_name: "Yalla App Support" } })).status).toBe(400);
    // Yallapp's team may.
    await c.deps.store.base.updateMember(me.id, { role: "team" });
    expect((await api(c, "PATCH", "/me", { token: me.token, body: { display_name: "Yallapp Team", username: "yallapp.team" } })).body).toMatchObject({ display_name: "Yallapp Team", username: "yallapp.team", team: true });
    // A name from Google that passes for the team isn't taken as it is.
    const g = await api<{ member: { display_name: string; username: string } }>(c, "POST", "/auth/google", { body: { id_token: await c.idToken("google", { sub: "g-imp", name: "Yallapp Support" }) } });
    expect(g.body.member.display_name).toBe("Member");
  });
});

describe("231 security: limits per member", () => {
  it("20 reports an hour, then 429", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Reporter");
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const target = await made(c, i);
      statuses.push((await api(c, "POST", "/reports", { token: me.token, body: { target_type: "member", target_id: target.id, reason: "spam" } })).status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 201)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it("40 friend requests an hour; following again what one follows doesn't count", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Friendly");
    let last = 0;
    for (let i = 0; i < 41; i++) {
      const other = await made(c, i);
      last = (await api(c, "PUT", `/members/${other.id}/friend`, { token: me.token })).status;
      if (i < 40) expect(last).toBe(200);
    }
    expect(last).toBe(429);
    const star = await joinWithEmail(c, "Star");
    for (let i = 0; i < 130; i++) expect((await api(c, "PUT", `/members/${star.id}/follow`, { token: me.token })).status).toBe(200);
  });
});

describe("231 security: linking a Yallapp account", () => {
  it("emails the Yallapp account's owner, in their language, who it was linked to", () => {
    const mail = linkedMail({ name: "Selim", email: "selim@yallapp.test", language: "tr" }, { displayName: "Mohamed Ali", username: "mo" } as never);
    expect(mail.to).toBe("selim@yallapp.test");
    expect(mail.subject).toBe("Yallapp hesabınız Yallapp Topluluğu'na bağlandı");
    expect(mail.text).toContain("Mohamed Ali (@mo)");
    expect(linkedMail({ name: "S", email: "s@x.test", language: null }, { displayName: "M", username: "m" } as never).subject).toBe("Your Yallapp account was linked to Yallapp Community");
  });
});

describe("231 security: links in members' markdown", () => {
  it("keeps a link on the site only when it really is: not /\\host, which browsers open as //host", () => {
    expect(safeHref("/docs")).toBe("/docs");
    expect(safeHref("/\\evil.test")).toBeNull();
    expect(safeHref("//evil.test")).toBeNull();
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("https://yallapp.com.tr/x")).toBe("https://yallapp.com.tr/x");
  });
});

describe("231 who runs the community: a linked Yallapp owner or admin, asked on every request", () => {
  it("the stored role makes no admin; a linked Yallapp admin is one, and stops being one when Yallapp's team drops them", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Would Be Admin");
    await c.deps.store.base.updateMember(me.id, { role: "admin" });
    expect((await api<ErrorBody>(c, "GET", "/admin/settings", { token: me.token })).body.error.code).toBe("not_admin");
    expect((await api(c, "GET", "/me", { token: me.token })).body).toMatchObject({ community_role: null });
    await makeYallappStaff(c, me.id, "admin");
    expect((await api(c, "GET", "/me", { token: me.token })).body).toMatchObject({ community_role: "admin", team: true });
    expect((await api(c, "GET", "/admin/settings", { token: me.token })).status).toBe(200);
    const userId = (await c.deps.store.base.getMember(me.id))!.yallappUserId!;
    await c.deps.platform.deleteAdminMember(userId);
    expect((await api(c, "GET", "/admin/settings", { token: me.token })).status).toBe(403);
  });

  it("Yallapp's support staff are the team (official answers, the team's names) but not admins", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Support Person");
    await makeYallappStaff(c, me.id, "support");
    expect((await api(c, "GET", "/me", { token: me.token })).body).toMatchObject({ community_role: null, team: true });
    expect((await api(c, "PATCH", "/me", { token: me.token, body: { display_name: "Yallapp Support" } })).status).toBe(200);
    expect((await api(c, "GET", "/admin/settings", { token: me.token })).status).toBe(403);
  });
});

describe("231 levels by points", () => {
  it("gives the level, its name and the way to the next, from the one table /config lists", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Climber");
    await c.deps.store.base.addPoints(me.id, 1240);
    expect((await api(c, "GET", `/members/${me.id}`, { lang: "tr" })).body).toMatchObject({ level: "expert", level_label: "Uzman", level_progress: 0.06 });
    const config = await api<{ levels: { key: string; min_points: number }[] }>(c, "GET", "/config");
    expect(config.body.levels.map((l) => [l.key, l.min_points])).toEqual([["newcomer", 0], ["member", 25], ["contributor", 250], ["expert", 1000], ["pro", 5000]]);
    await c.deps.store.base.addPoints(me.id, 10_000);
    expect((await api(c, "GET", `/members/${me.id}`)).body).toMatchObject({ level: "pro", level_progress: 1 });
  });
});
