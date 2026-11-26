import { describe, expect, it } from "vitest";
import { checkDelete, FRESH_SIGN_IN_MS, isFreshSignIn } from "@/components/community/site/delete-check";
import { CM_DELETE, CM_PRIVACY } from "@/components/community/site/privacy-words";
import { communitySitemap, COMMUNITY_PUBLIC_PATHS } from "@/components/community/site/seo";
import { CM_LANGS } from "@/components/community/site/words";
import { api, joinWithEmail, testCommunity } from "./community-support";

const NOW = new Date("2026-11-26T10:00:00Z");

/** 231 The Community's privacy page and deleting an account on the website. */
describe("231 deleting the account on the website", () => {
  it("needs the typed DELETE, whatever the sign-in", () => {
    for (const confirm of ["", "delete", "DELET", "yes"]) {
      expect(checkDelete({ hasPassword: true, password: "correct horse battery", confirm, signedInAt: NOW, now: NOW })).toEqual({ ok: false, error: "confirm" });
      expect(checkDelete({ hasPassword: false, password: "", confirm, signedInAt: NOW, now: NOW })).toEqual({ ok: false, error: "confirm" });
    }
    expect(checkDelete({ hasPassword: true, password: "pw", confirm: " DELETE ", signedInAt: null, now: NOW }).ok).toBe(true);
  });

  it("an email member gives the password; an Apple or Google member must have just signed in", () => {
    expect(checkDelete({ hasPassword: true, password: "", confirm: "DELETE", signedInAt: NOW, now: NOW })).toEqual({ ok: false, error: "password" });
    expect(checkDelete({ hasPassword: true, password: "secret", confirm: "DELETE", signedInAt: null, now: NOW })).toEqual({ ok: true, body: { password: "secret" } });
    const old = new Date(NOW.getTime() - FRESH_SIGN_IN_MS - 1000);
    expect(checkDelete({ hasPassword: false, password: "", confirm: "DELETE", signedInAt: old, now: NOW })).toEqual({ ok: false, error: "fresh" });
    expect(checkDelete({ hasPassword: false, password: "", confirm: "DELETE", signedInAt: null, now: NOW })).toEqual({ ok: false, error: "fresh" });
    const fresh = new Date(NOW.getTime() - 60_000);
    expect(checkDelete({ hasPassword: false, password: "", confirm: "DELETE", signedInAt: fresh, now: NOW })).toEqual({ ok: true, body: { confirm: "DELETE" } });
    expect(isFreshSignIn(new Date(NOW.getTime() + 10 * 60_000), NOW)).toBe(false);
  });

  it("a wrong password deletes nothing; the right one deletes the account, and log-in then fails", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Selin");
    const wrong = checkDelete({ hasPassword: true, password: "not my password", confirm: "DELETE", signedInAt: null, now: NOW });
    expect(wrong.ok).toBe(true);
    if (!wrong.ok) return;
    expect((await api(c, "DELETE", "/me", { token: me.token, body: wrong.body })).status).toBe(401);
    expect((await api(c, "GET", `/members/${me.id}`)).status).toBe(200);

    // A missing DELETE never reaches the API: the account is still there.
    expect(checkDelete({ hasPassword: true, password: "correct horse battery", confirm: "", signedInAt: null, now: NOW }).ok).toBe(false);
    expect((await api(c, "GET", `/members/${me.id}`)).status).toBe(200);

    const right = checkDelete({ hasPassword: true, password: "correct horse battery", confirm: "DELETE", signedInAt: null, now: NOW });
    if (!right.ok) throw new Error("expected ok");
    expect((await api(c, "DELETE", "/me", { token: me.token, body: right.body })).status).toBe(204);
    expect((await api(c, "GET", `/members/${me.id}`)).status).toBe(404);
    expect((await api(c, "POST", "/auth/email/log-in", { body: { email: me.email, password: "correct horse battery" } })).status).toBe(401);
  });
});

describe("231 the Community's privacy policy", () => {
  it("is in English, Arabic and Turkish, with the same sections", () => {
    for (const lang of CM_LANGS) {
      expect(CM_PRIVACY[lang].sections).toHaveLength(CM_PRIVACY.en.sections.length);
      expect(CM_DELETE[lang].goes).toHaveLength(CM_DELETE.en.goes.length);
      const all = JSON.stringify(CM_PRIVACY[lang]);
      expect(all).toContain("{email}");
      expect(all).toContain("{delete}");
      expect(all).toContain("30");
    }
  });

  it("says what the code keeps, and no payments, tracking or company registration details", () => {
    const text = JSON.stringify(CM_PRIVACY.en).toLowerCase();
    for (const kept of ["email address", "username", "member id", "profile picture", "questions, answers", "proof of identity", "device's name and platform"]) expect(text).toContain(kept);
    expect(text).toContain("no tracking, analytics or advertising");
    expect(text).toContain("nothing in the community is paid");
    for (const lang of CM_LANGS) {
      const all = JSON.stringify([CM_PRIVACY[lang], CM_DELETE[lang]]);
      expect(all).not.toMatch(/\b(?:price|buy now|checkout|subscribe)\b/i);
      expect(all).not.toMatch(/\b(?:company number|registration number|vat|tax id|mersis)\b/i);
    }
  });

  it("the Community host's sitemap lists its public pages, privacy and deletion included", () => {
    const urls = communitySitemap("https://community.yallapp.com.tr/").map((e) => e.url);
    expect(urls).toHaveLength(COMMUNITY_PUBLIC_PATHS.length);
    expect(urls).toContain("https://community.yallapp.com.tr");
    expect(urls).toContain("https://community.yallapp.com.tr/privacy");
    expect(urls).toContain("https://community.yallapp.com.tr/delete-account");
    expect(urls.some((u) => u.includes("/settings"))).toBe(false);
  });
});
