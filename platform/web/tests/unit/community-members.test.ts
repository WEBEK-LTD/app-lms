import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { confirmLink, pendingLink } from "@/lib/community/base/linking";
import { api, joinWithEmail, NOW, testCommunity, type TestCommunity } from "./community-support";

/**
 * 231 Members of Yallapp Community (docs/api/community.yaml: Me, Members,
 * Social, Reports, Config): the profile and its edits, the picture, the
 * devices, deleting the account; follow (one way), friends (request, then
 * accept), block (nothing goes between the two), reports once per target;
 * linking a Yallapp account and the apps that come with it; the sections
 * with what is coming soon.
 */
type ErrorBody = { error: { code: string; fields?: Record<string, string> } };
type Rel = { following: boolean; followed_by: boolean; friend: string; friend_request_id: string | null; blocked: boolean };
type Page = { items: { id: string; relationship?: Rel }[]; next_cursor: string | null };

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

async function yallappOwner(c: TestCommunity, appNames: string[]) {
  const { user, client } = await registerClient(c.deps.platform, { name: "Leqaa Owner", email: `owner-${appNames.length}@yallapp.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  for (const name of appNames) await c.deps.platform.createApp({ ...newApp(client.id, null, NOW, "store"), appName: name, androidPackage: `tr.example.${name.toLowerCase()}` });
  return user;
}

describe("231 the member's own profile", () => {
  it("edits the profile and settings, and checks what is sent", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Mohamed Ali");
    const r = await api(c, "PATCH", "/me", {
      token: me.token,
      body: { headline: "Flutter developer", bio: "I build stores.", skills: ["Flutter", "Studio", "flutter"], links: [{ label: "Portfolio", url: "https://mo.test" }], language: "ar", theme: "dark", username: "mo_ali" },
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ headline: "Flutter developer", bio: "I build stores.", skills: ["Flutter", "Studio"], links: [{ label: "Portfolio", url: "https://mo.test" }], language: "ar", theme: "dark", username: "mo_ali" });
    const bad = await api<ErrorBody>(c, "PATCH", "/me", { token: me.token, body: { username: "No Spaces", links: [{ label: "x", url: "javascript:alert(1)" }], theme: "pink" } });
    expect(bad.status).toBe(400);
    // The member's language is Arabic now: the API answers in it.
    expect(bad.body.error.fields).toEqual({ username: "استخدم من 3 إلى 30 حرفًا إنجليزيًا صغيرًا أو أرقامًا أو نقاطًا أو شرطات سفلية.", "links.0.url": "أدخل رابطًا صحيحًا (https://…).", theme: "غير صالح." });
    const other = await joinWithEmail(c, "Nour");
    const taken = await api<ErrorBody>(c, "PATCH", "/me", { token: other.token, body: { username: "mo_ali" } });
    expect(taken.status).toBe(409);
    expect((await api(c, "GET", "/members/@mo_ali")).body).toMatchObject({ id: me.id, display_name: "Mohamed Ali", headline: "Flutter developer" });
  });

  it("uploads a picture only when the bytes are a JPEG, PNG or WebP, and removes it", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Lina");
    const form = new FormData();
    form.set("file", new File([PNG], "me.png", { type: "image/png" }));
    const r = await api<{ avatar_url: string }>(c, "PUT", "/me/avatar", { token: me.token, form });
    expect(r.status).toBe(200);
    expect(r.body.avatar_url).toMatch(new RegExp(`^https://yallapp.test/api/community/files/${me.id}-\\d+\\.png$`));
    expect([...c.uploads.keys()][0]).toMatch(/^community\/avatars\//);
    const fake = new FormData();
    fake.set("file", new File(["<svg/>"], "me.png", { type: "image/png" }));
    expect(((await api<ErrorBody>(c, "PUT", "/me/avatar", { token: me.token, form: fake })).body as ErrorBody).error.code).toBe("invalid_image");
    expect((await api(c, "DELETE", "/me/avatar", { token: me.token })).body).toMatchObject({ avatar_url: null });
  });

  it("changes the password (other devices sign out), and lists and signs out devices", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Omar");
    const phone = await api<{ access_token: string }>(c, "POST", "/auth/email/log-in", { body: { email: me.email, password: "correct horse battery", device: { name: "Pixel", platform: "android" } } });
    const sessions = await api<{ items: { id: string; name: string; current: boolean }[] }>(c, "GET", "/me/sessions", { token: me.token });
    expect(sessions.body.items).toHaveLength(2);
    expect((await api(c, "PUT", "/me/password", { token: me.token, body: { current_password: "wrong", new_password: "new password here" } })).status).toBe(401);
    expect((await api(c, "PUT", "/me/password", { token: me.token, body: { current_password: "correct horse battery", new_password: "new password here" } })).status).toBe(204);
    expect((await api(c, "GET", "/me", { token: me.token })).status).toBe(200);
    expect((await api(c, "GET", "/me", { token: phone.body.access_token })).status).toBe(401);
    const left = await api<{ items: { id: string }[] }>(c, "GET", "/me/sessions", { token: me.token });
    expect(left.body.items).toHaveLength(1);
    expect((await api(c, "DELETE", "/me/sessions/00000000-0000-0000-0000-000000000000", { token: me.token })).status).toBe(404);
  });

  it("deletes the account with the password: gone, with its follows", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Can");
    const friend = await joinWithEmail(c, "Deniz");
    await api(c, "PUT", `/members/${friend.id}/follow`, { token: me.token });
    expect((await api(c, "DELETE", "/me", { token: me.token, body: { password: "nope nope" } })).status).toBe(401);
    expect((await api(c, "DELETE", "/me", { token: me.token, body: { password: "correct horse battery" } })).status).toBe(204);
    expect((await api(c, "GET", `/members/${me.id}`)).status).toBe(404);
    expect((await api(c, "GET", `/members/${friend.id}`)).body).toMatchObject({ counts: { followers: 0 } });
    expect((await api(c, "POST", "/auth/email/log-in", { body: { email: me.email, password: "correct horse battery" } })).status).toBe(401);
  });
});

describe("231 follow, friends and block", () => {
  it("follows one way, with no approval, and lists followers and following", async () => {
    const c = await testCommunity();
    const a = await joinWithEmail(c, "Aya");
    const b = await joinWithEmail(c, "Badr");
    const r = await api<Rel>(c, "PUT", `/members/@${b.username}/follow`, { token: a.token });
    expect(r.body).toEqual({ following: true, followed_by: false, friend: "none", friend_request_id: null, blocked: false });
    expect((await api(c, "PUT", `/members/${a.id}/follow`, { token: a.token })).status).toBe(400);
    const followers = await api<Page>(c, "GET", `/members/${b.id}/followers`, { token: b.token });
    expect(followers.body.items.map((m) => m.id)).toEqual([a.id]);
    expect(followers.body.items[0]!.relationship).toMatchObject({ following: false, followed_by: true });
    expect((await api<Page>(c, "GET", `/members/${a.id}/following`)).body.items.map((m) => m.id)).toEqual([b.id]);
    expect((await api(c, "GET", `/members/${b.id}`)).body).toMatchObject({ counts: { followers: 1, following: 0 } });
    expect((await api<Rel>(c, "DELETE", `/members/${b.id}/follow`, { token: a.token })).body.following).toBe(false);
  });

  it("friends: a request, then accept; asking back accepts; decline and unfriend", async () => {
    const c = await testCommunity();
    const a = await joinWithEmail(c, "Cem");
    const b = await joinWithEmail(c, "Dila");
    const asked = await api<Rel>(c, "PUT", `/members/${b.id}/friend`, { token: a.token });
    expect(asked.body.friend).toBe("requested");
    expect((await api(c, "GET", "/me", { token: b.token })).body).toMatchObject({ pending_friend_requests: 1 });
    const incoming = await api<{ items: { id: string; member: { id: string } }[] }>(c, "GET", "/me/friend-requests", { token: b.token });
    expect(incoming.body.items.map((r) => r.member.id)).toEqual([a.id]);
    expect((await api<{ items: unknown[] }>(c, "GET", "/me/friend-requests?direction=outgoing", { token: a.token })).body.items).toHaveLength(1);
    // Someone else can't accept it.
    const other = await joinWithEmail(c, "Ezgi");
    expect((await api(c, "POST", `/me/friend-requests/${incoming.body.items[0]!.id}/accept`, { token: other.token })).status).toBe(404);
    const accepted = await api<Rel>(c, "POST", `/me/friend-requests/${incoming.body.items[0]!.id}/accept`, { token: b.token });
    expect(accepted.body.friend).toBe("friends");
    expect((await api<Page>(c, "GET", `/members/${a.id}/friends`)).body.items.map((m) => m.id)).toEqual([b.id]);
    expect((await api<Rel>(c, "DELETE", `/members/${a.id}/friend`, { token: b.token })).body.friend).toBe("none");

    // Asking someone who already asked accepts.
    await api(c, "PUT", `/members/${other.id}/friend`, { token: a.token });
    expect((await api<Rel>(c, "PUT", `/members/${a.id}/friend`, { token: other.token })).body.friend).toBe("friends");
    // Declining: the request goes, quietly.
    await api(c, "PUT", `/members/${b.id}/friend`, { token: other.token });
    const req = (await api<{ items: { id: string }[] }>(c, "GET", "/me/friend-requests", { token: b.token })).body.items[0]!;
    expect((await api(c, "POST", `/me/friend-requests/${req.id}/decline`, { token: b.token })).status).toBe(204);
    expect((await api<Rel>(c, "GET", `/members/${b.id}`, { token: other.token })).body).toMatchObject({ relationship: { friend: "none" } });
  });

  it("block: follows and friendship end, nothing new goes, the blocked member can't find the profile", async () => {
    const c = await testCommunity();
    const a = await joinWithEmail(c, "Feyza");
    const b = await joinWithEmail(c, "Gul");
    await api(c, "PUT", `/members/${b.id}/follow`, { token: a.token });
    await api(c, "PUT", `/members/${a.id}/follow`, { token: b.token });
    await api(c, "PUT", `/members/${b.id}/friend`, { token: a.token });
    await api(c, "PUT", `/members/${a.id}/friend`, { token: b.token });
    const blocked = await api<Rel>(c, "PUT", `/members/${b.id}/block`, { token: a.token });
    expect(blocked.body).toEqual({ following: false, followed_by: false, friend: "none", friend_request_id: null, blocked: true });
    expect((await api(c, "PUT", `/members/${a.id}/follow`, { token: b.token })).status).toBe(404);
    expect((await api(c, "PUT", `/members/${a.id}/friend`, { token: b.token })).status).toBe(404);
    expect((await api(c, "GET", `/members/${a.id}`, { token: b.token })).status).toBe(404);
    // The blocker still sees them, to unblock; and others still see both.
    expect((await api(c, "GET", `/members/${b.id}`, { token: a.token })).body).toMatchObject({ relationship: { blocked: true } });
    expect((await api(c, "GET", `/members/${a.id}`)).status).toBe(200);
    expect((await api(c, "PUT", `/members/${b.id}/follow`, { token: a.token })).status).toBe(400);
    expect((await api<Page>(c, "GET", "/me/blocks", { token: a.token })).body.items.map((m) => m.id)).toEqual([b.id]);
    // Lists hide blocked members from each other.
    const third = await joinWithEmail(c, "Hale");
    await api(c, "PUT", `/members/${third.id}/follow`, { token: a.token });
    await api(c, "PUT", `/members/${third.id}/follow`, { token: b.token });
    expect((await api<Page>(c, "GET", `/members/${third.id}/followers`, { token: a.token })).body.items.map((m) => m.id)).toEqual([a.id]);
    expect((await api<Page>(c, "GET", `/members/${third.id}/followers`)).body.items).toHaveLength(2);
    expect((await api<Rel>(c, "DELETE", `/members/${b.id}/block`, { token: a.token })).body.blocked).toBe(false);
    expect((await api(c, "GET", `/members/${a.id}`, { token: b.token })).status).toBe(200);
  });

  it("pages lists with next_cursor", async () => {
    const c = await testCommunity();
    const star = await joinWithEmail(c, "Star");
    for (let i = 0; i < 3; i++) {
      const fan = await joinWithEmail(c, `Fan ${i}`);
      c.at(new Date(NOW.getTime() + (i + 1) * 1000));
      await api(c, "PUT", `/members/${star.id}/follow`, { token: fan.token });
    }
    const first = await api<Page>(c, "GET", `/members/${star.id}/followers?limit=2`);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.next_cursor).toBe("2");
    const second = await api<Page>(c, "GET", `/members/${star.id}/followers?limit=2&cursor=2`);
    expect(second.body.items).toHaveLength(1);
    expect(second.body.next_cursor).toBeNull();
  });
});

describe("231 reports and the sections", () => {
  it("reports a member once; not oneself; not without signing in", async () => {
    const c = await testCommunity();
    const a = await joinWithEmail(c, "Ilker");
    const b = await joinWithEmail(c, "Jale");
    expect((await api(c, "POST", "/reports", { body: { target_type: "member", target_id: b.id, reason: "spam" } })).status).toBe(401);
    const r = await api<{ id: string }>(c, "POST", "/reports", { token: a.token, body: { target_type: "member", target_id: `@${b.username}`, reason: "spam", note: "Sends links to everyone" } });
    expect(r.status).toBe(201);
    expect((await c.deps.store.base.getReport(r.body.id))).toMatchObject({ reporterId: a.id, reason: "spam", status: "open" });
    expect(((await api<ErrorBody>(c, "POST", "/reports", { token: a.token, body: { target_type: "member", target_id: `@${b.username}`, reason: "abuse" } })).body).error.code).toBe("already_reported");
    expect((await api(c, "POST", "/reports", { token: a.token, body: { target_type: "member", target_id: a.id, reason: "spam" } })).status).toBe(404);
    expect((await api(c, "POST", "/reports", { token: a.token, body: { target_type: "planet", target_id: "x", reason: "why" } })).status).toBe(400);
  });

  it("lists the side menu's sections and the tab bar, later ones coming soon, in the reader's language", async () => {
    const c = await testCommunity();
    const r = await api<{ sections: { slug: string; name: string; coming_soon: boolean }[]; tabs: { slug: string; coming_soon: boolean }[]; default_language: string; groups_create_policy: string }>(c, "GET", "/config", { lang: "ar" });
    expect(r.body.default_language).toBe("en");
    expect(r.body.sections.map((s) => s.slug)).toEqual(["home", "qa", "tutorials", "academy", "showcase", "challenges", "groups", "friends", "pros", "events"]);
    expect(r.body.sections.filter((s) => !s.coming_soon).map((s) => s.slug)).toEqual(["home", "qa", "tutorials", "friends"]);
    expect(r.body.sections[1]!.name).toBe("الأسئلة والأجوبة");
    expect(r.body.tabs.map((t) => [t.slug, t.coming_soon])).toEqual([["home", false], ["qa", false], ["create", false], ["learn", false], ["groups", true]]);
    expect(r.body.groups_create_policy).toBe("everyone");
  });
});

describe("231 linking a Yallapp account", () => {
  it("starts in the community, confirms on Yallapp signed in, and shows the account's apps", async () => {
    const c = await testCommunity();
    const me = await joinWithEmail(c, "Kerem");
    const owner = await yallappOwner(c, ["Leqaa", "Runway"]);
    expect((await api(c, "GET", "/me/yallapp-link", { token: me.token })).body).toEqual({ linked: false, linked_at: null, account_name: null, apps: [] });
    const start = await api<{ confirm_url: string }>(c, "POST", "/me/yallapp-link/start", { token: me.token, body: { return_to: "app" } });
    const url = new URL(start.body.confirm_url);
    expect(`${url.origin}${url.pathname}`).toBe("https://yallapp.test/link-community");
    expect(url.searchParams.get("return")).toBe("app");
    const state = url.searchParams.get("state")!;
    const pending = await pendingLink(c.deps.store, state, NOW);
    expect(pending).toMatchObject({ ok: true, member: { id: me.id } });
    expect(await confirmLink({ store: c.deps.store, platform: c.deps.platform, now: NOW }, state, owner.id)).toMatchObject({ ok: true });
    // Once only.
    expect(await confirmLink({ store: c.deps.store, platform: c.deps.platform, now: NOW }, state, owner.id)).toEqual({ ok: false, code: "link_expired" });
    const link = await api<{ linked: boolean; account_name: string; apps: { name: string; play_store_url: string; from_template: boolean; paid_plan: boolean }[] }>(c, "GET", "/me/yallapp-link", { token: me.token });
    expect(link.body).toMatchObject({ linked: true, account_name: "Leqaa Owner" });
    expect(link.body.apps.map((a) => a.name).sort()).toEqual(["Leqaa", "Runway"]);
    expect(link.body.apps[0]).toMatchObject({ from_template: false, paid_plan: false });
    expect(link.body.apps[0]!.play_store_url).toMatch(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=tr\.example\./);
    expect((await api(c, "GET", `/members/${me.id}`)).body).toMatchObject({ yallapp_linked: true, counts: { apps: 2 } });
    expect((await api<{ items: unknown[] }>(c, "GET", `/members/${me.id}/apps`)).body.items).toHaveLength(2);

    // The same Yallapp account can't go to a second member.
    const other = await joinWithEmail(c, "Leyla");
    const second = new URL((await api<{ confirm_url: string }>(c, "POST", "/me/yallapp-link/start", { token: other.token })).body.confirm_url).searchParams.get("state")!;
    expect(await confirmLink({ store: c.deps.store, platform: c.deps.platform, now: NOW }, second, owner.id)).toEqual({ ok: false, code: "already_linked" });
    // A link not confirmed in 15 minutes expires.
    expect(await pendingLink(c.deps.store, second, new Date(NOW.getTime() + 16 * 60 * 1000))).toEqual({ ok: false, code: "link_expired" });

    expect((await api(c, "DELETE", "/me/yallapp-link", { token: me.token })).status).toBe(204);
    expect((await api(c, "GET", "/me/yallapp-link", { token: me.token })).body).toMatchObject({ linked: false });
    expect((await api<{ items: unknown[] }>(c, "GET", `/members/${me.id}/apps`)).body.items).toEqual([]);
  });
});
