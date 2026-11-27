import { describe, expect, it } from "vitest";
import { encodeJwt } from "@/lib/hosted/jwt";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { api, joinWithEmail, makeYallappStaff, NOW, testCommunity, type TestCommunity } from "./community-support";

/**
 * 232–234 Area A's phase 2–4 API: messages (one-to-one and group chats,
 * photos, replies, read state, blocks, polling, reports), groups (public
 * and private, requests, roles, the creation policy), pros (profiles, hire
 * requests opening a thread, reviews once done) and jobs (post, apply,
 * applicants, moderation of a new member's first ones). And the tenant
 * key: a client app's community shares nothing with Yallapp Community.
 */
type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const later = (c: TestCommunity, ms: number) => c.at(new Date(c.deps.now.getTime() + ms));

/** Members who already had posts approved: their content isn't held as a new member's. */
async function trusted(c: TestCommunity, name: string) {
  const m = await joinWithEmail(c, name);
  await c.deps.store.base.updateMember(m.id, { approvedPosts: 5 });
  return m;
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe("232.4 messages", () => {
  it("one conversation per pair; text, a photo, a reply; unread and read; polling with after", async () => {
    const c = await testCommunity();
    const [ali, bea] = [await joinWithEmail(c, "Ali Kaya"), await joinWithEmail(c, "Bea Novak")];
    const started = await api<J>(c, "POST", "/messages/conversations", { token: ali.token, body: { member_ids: [`@${bea.username}`], body: "Hi Bea!" } });
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({ kind: "direct", title: null, unread: 0, blocked: false });
    expect(started.body.members.map((m: J) => m.id).sort()).toEqual([ali.id, bea.id].sort());
    // The same pair again: the same conversation.
    const again = await api<J>(c, "POST", "/messages/conversations", { token: bea.token, body: { member_ids: [ali.id] } });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(started.body.id);
    expect(again.body.unread).toBe(1);
    const id = started.body.id as string;

    expect((await api<J>(c, "GET", "/messages/unread", { token: bea.token })).body).toEqual({ conversations: 1 });
    later(c, 1000);
    const form = new FormData();
    form.set("body", "Here's the screen");
    form.append("photos", new File([PNG], "a.png", { type: "image/png" }));
    const first = (await api<J>(c, "GET", `/messages/conversations/${id}/messages`, { token: bea.token })).body.items[0];
    form.set("reply_to_id", first.id);
    const photo = await api<J>(c, "POST", `/messages/conversations/${id}/messages`, { token: bea.token, form });
    expect(photo.status).toBe(201);
    expect(photo.body).toMatchObject({ body: "Here's the screen", reply_to: { id: first.id, excerpt: "Hi Bea!" }, deleted: false });
    expect(photo.body.photos).toHaveLength(1);
    expect(c.uploads.size).toBe(1);
    // Sending reads up to one's own message; Ali has one unread.
    expect((await api<J>(c, "GET", "/messages/unread", { token: bea.token })).body).toEqual({ conversations: 0 });
    expect((await api<J>(c, "GET", "/messages/conversations", { token: ali.token })).body.items[0]).toMatchObject({ id, unread: 1, last_message: { id: photo.body.id } });
    // Polling: only what came after the first message, oldest first.
    later(c, 1000);
    await api(c, "POST", `/messages/conversations/${id}/messages`, { token: ali.token, body: { body: "Nice" } });
    const polled = await api<J>(c, "GET", `/messages/conversations/${id}/messages?after=${first.id}`, { token: ali.token });
    expect(polled.body.items.map((m: J) => m.body)).toEqual(["Here's the screen", "Nice"]);
    // Read state.
    await api(c, "POST", `/messages/conversations/${id}/read`, { token: bea.token, body: {} });
    const seen = await api<J>(c, "GET", `/messages/conversations/${id}`, { token: ali.token });
    expect(seen.body.read_by[bea.id]).toBe(polled.body.items[1].id);
    // Deleting one's own message; never another's.
    expect((await api(c, "DELETE", `/messages/conversations/${id}/messages/${photo.body.id}`, { token: ali.token })).status).toBe(403);
    expect((await api(c, "DELETE", `/messages/conversations/${id}/messages/${photo.body.id}`, { token: bea.token })).status).toBe(204);
    const list = await api<J>(c, "GET", `/messages/conversations/${id}/messages`, { token: ali.token });
    expect(list.body.items.find((m: J) => m.id === photo.body.id)).toMatchObject({ body: "", photos: [], deleted: true });
    // Someone outside the conversation finds nothing.
    const cem = await joinWithEmail(c, "Cem Yilmaz");
    expect((await api(c, "GET", `/messages/conversations/${id}`, { token: cem.token })).status).toBe(404);
    expect((await api(c, "POST", `/messages/conversations/${id}/messages`, { token: cem.token, body: { body: "hey" } })).status).toBe(404);
  });

  it("group chats up to 10 people; leave; a block makes a one-to-one read-only and hides it; report", async () => {
    const c = await testCommunity();
    const people = [];
    for (const n of ["Ada", "Ben", "Cyd", "Dov", "Eda", "Fay", "Gus", "Hal", "Ivy", "Jon", "Kai"]) people.push(await joinWithEmail(c, `${n} Test`));
    const [ada, ben, cyd] = people as unknown as [J, J, J];
    const group = await api<J>(c, "POST", "/messages/conversations", { token: ada.token, body: { member_ids: [ben.id, cyd.id], title: "Launch team" } });
    expect(group.status).toBe(201);
    expect(group.body).toMatchObject({ kind: "group", title: "Launch team" });
    expect(group.body.members).toHaveLength(3);
    // Ten in all at most.
    const tooMany = await api<J>(c, "POST", `/messages/conversations/${group.body.id}/members`, { token: ada.token, body: { member_ids: people.slice(3).map((p) => p.id) } });
    expect(tooMany.status).toBe(400);
    const added = await api<J>(c, "POST", `/messages/conversations/${group.body.id}/members`, { token: ben.token, body: { member_ids: people.slice(3, 10).map((p) => p.id) } });
    expect(added.body.members).toHaveLength(10);
    expect((await api(c, "PATCH", `/messages/conversations/${group.body.id}`, { token: cyd.token, body: { title: "Launch!" } })).status).toBe(200);
    expect((await api(c, "DELETE", `/messages/conversations/${group.body.id}/members/me`, { token: cyd.token })).status).toBe(204);
    expect((await api(c, "GET", `/messages/conversations/${group.body.id}`, { token: cyd.token })).status).toBe(404);

    // A block: the one-to-one goes read-only and out of the list, and no new one starts.
    const direct = await api<J>(c, "POST", "/messages/conversations", { token: ada.token, body: { member_ids: [ben.id], body: "Hello" } });
    await api(c, "PUT", `/members/${ben.id}/block`, { token: ada.token });
    expect((await api(c, "POST", `/messages/conversations/${direct.body.id}/messages`, { token: ben.token, body: { body: "Why?" } })).status).toBe(400);
    expect((await api<J>(c, "GET", "/messages/conversations", { token: ben.token })).body.items.map((x: J) => x.id)).not.toContain(direct.body.id);
    expect((await api(c, "POST", "/messages/conversations", { token: ben.token, body: { member_ids: [ada.id] } })).status).toBe(400);
    expect((await api(c, "POST", "/messages/conversations", { token: ben.token, body: { member_ids: [ada.id, cyd.id] } })).status).toBe(400);

    // Reported as a whole, once; the moderators see it in their reports.
    const reported = await api<J>(c, "POST", `/messages/conversations/${group.body.id}/report`, { token: ben.token, body: { reason: "spam", note: "Ads" } });
    expect(reported.status).toBe(201);
    expect((await api(c, "POST", `/messages/conversations/${group.body.id}/report`, { token: ben.token, body: { reason: "spam" } })).status).toBe(409);
    expect((await c.deps.store.base.listReports("open", 0, 10)).map((r) => [r.targetType, r.targetId])).toEqual([["conversation", group.body.id]]);
  });
});

describe("232.5 groups", () => {
  it("public and private groups: join, requests, roles, the owner hands it over; who may create follows the setting", async () => {
    const c = await testCommunity();
    const [owner, nia, omar] = [await trusted(c, "Group Owner"), await joinWithEmail(c, "Nia Park"), await joinWithEmail(c, "Omar Said")];
    const made = await api<J>(c, "POST", "/groups", { token: owner.token, body: { name: "Flutter Istanbul", description: "Meetups and help.", visibility: "private" } });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ slug: "flutter-istanbul", visibility: "private", member_count: 1, status: "active", standing: { role: "owner", requested: false } });
    // The same name again: its own slug.
    expect((await api<J>(c, "POST", "/groups", { token: owner.token, body: { name: "Flutter Istanbul" } })).body.slug).toBe("flutter-istanbul-2");

    // Private: a request, then accepted.
    expect((await api<J>(c, "PUT", "/groups/flutter-istanbul/membership", { token: nia.token })).body).toEqual({ role: null, requested: true });
    expect((await api(c, "GET", "/groups/flutter-istanbul/members", { token: nia.token })).status).toBe(403);
    const requests = await api<J>(c, "GET", "/groups/flutter-istanbul/requests", { token: owner.token });
    expect(requests.body.items.map((r: J) => r.member.id)).toEqual([nia.id]);
    expect((await api(c, "GET", "/groups/flutter-istanbul/requests", { token: nia.token })).status).toBe(403);
    expect((await api<J>(c, "POST", `/groups/flutter-istanbul/requests/@${nia.username}/accept`, { token: owner.token })).body).toMatchObject({ role: "member", member: { id: nia.id } });
    const joined = await api<J>(c, "GET", "/groups/flutter-istanbul", { token: nia.token });
    expect(joined.body).toMatchObject({ member_count: 2, standing: { role: "member" } });
    expect((await api<J>(c, "GET", "/groups?mine=true", { token: nia.token })).body.items.map((g: J) => g.slug)).toEqual(["flutter-istanbul"]);

    // Roles: a moderator, then the owner hands the group over and stays as a moderator.
    expect((await api(c, "PATCH", `/groups/flutter-istanbul/members/${nia.id}`, { token: nia.token, body: { role: "moderator" } })).status).toBe(403);
    await api(c, "PATCH", `/groups/flutter-istanbul/members/${nia.id}`, { token: owner.token, body: { role: "moderator" } });
    expect((await api(c, "PATCH", "/groups/flutter-istanbul", { token: nia.token, body: { description: "Monthly meetups." } })).status).toBe(200);
    expect((await api<J>(c, "DELETE", "/groups/flutter-istanbul/membership", { token: owner.token })).body).toMatchObject({ error: { code: "owner_must_transfer" } });
    await api(c, "PATCH", `/groups/flutter-istanbul/members/${nia.id}`, { token: owner.token, body: { role: "owner" } });
    const members = await api<J>(c, "GET", "/groups/flutter-istanbul/members", { token: nia.token });
    expect(members.body.items.map((m: J) => [m.member.id, m.role])).toEqual([
      [nia.id, "owner"],
      [owner.id, "moderator"],
    ]);
    // Made public: anyone joins at once.
    await api(c, "PATCH", "/groups/flutter-istanbul", { token: nia.token, body: { visibility: "public" } });
    expect((await api<J>(c, "PUT", "/groups/flutter-istanbul/membership", { token: omar.token })).body).toEqual({ role: "member", requested: false });
    expect((await api<J>(c, "GET", "/groups?q=flutter", {})).body.items.map((g: J) => g.slug)).toContain("flutter-istanbul");

    // "Who can create groups": chosen people only.
    await c.deps.store.trust.saveSettingsDoc({ groups_create_policy: "chosen", groups_create_members: [] }, { at: NOW, by: null });
    expect((await api(c, "POST", "/groups", { token: omar.token, body: { name: "Omar's group" } })).status).toBe(403);
  });

  it("a new member's group waits for review; approved, it opens", async () => {
    const c = await testCommunity();
    const newbie = await joinWithEmail(c, "New Comer");
    const made = await api<J>(c, "POST", "/groups", { token: newbie.token, body: { name: "Brand new group" } });
    expect(made.body.status).toBe("pending");
    expect((await api<J>(c, "GET", "/groups", {})).body.items).toEqual([]);
    const other = await joinWithEmail(c, "Some One");
    expect((await api(c, "GET", `/groups/${made.body.id}`, { token: other.token })).status).toBe(404);
    const admin = await joinWithEmail(c, "Admin Person");
    await makeYallappStaff(c, admin.id);
    const queue = await api<J>(c, "GET", "/admin/moderation", { token: admin.token });
    const item = queue.body.items.find((i: J) => i.target_id === made.body.id);
    expect(item).toMatchObject({ target_type: "group" });
    expect((await api(c, "POST", `/admin/moderation/${item.id}`, { token: admin.token, body: { decision: "approve" } })).status).toBe(200);
    expect((await api<J>(c, "GET", `/groups/${made.body.id}`, { token: other.token })).body.status).toBe("active");
  });
});

describe("234.1 pros", () => {
  it("a pro profile; a hire request opens a thread; accepted, done, reviewed once (changeable)", async () => {
    const c = await testCommunity();
    const [pro, client] = [await joinWithEmail(c, "Pro Maker"), await joinWithEmail(c, "Client Person")];
    expect((await api(c, "GET", "/me/pro", { token: pro.token })).status).toBe(404);
    const saved = await api<J>(c, "PUT", "/me/pro", {
      token: pro.token,
      body: { headline: "Store apps in a week", about: "Ten years of shops.", services: [{ title: "Store app", description: "Setup and publish", rate: "from $300" }], skills: ["Flutter", "WooCommerce"], availability: "available" },
    });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ headline: "Store apps in a week", rating: null, review_count: 0, portfolio: [] });
    expect((await api<J>(c, "GET", "/pros?skill=flutter", {})).body.items.map((p: J) => p.member.id)).toEqual([pro.id]);
    expect((await api(c, "POST", `/pros/${pro.id}/hire`, { token: pro.token, body: { message: "Hire myself please" } })).status).toBe(400);

    const hire = await api<J>(c, "POST", `/pros/@${pro.username}/hire`, { token: client.token, body: { message: "I need a store app for my shop.", service: "Store app" } });
    expect(hire.status).toBe(201);
    expect(hire.body).toMatchObject({ status: "pending", service: "Store app", client: { id: client.id }, pro: { id: pro.id } });
    const thread = await api<J>(c, "GET", `/messages/conversations/${hire.body.conversation_id}`, { token: pro.token });
    expect(thread.body).toMatchObject({ kind: "hire", hire_request_id: hire.body.id, unread: 1, last_message: { body: "Store app\n\nI need a store app for my shop." } });
    expect((await api<J>(c, "GET", "/pros/requests?box=received", { token: pro.token })).body.items.map((h: J) => h.id)).toEqual([hire.body.id]);

    // Steps: only the pro accepts; reviewed only once done, by the client.
    const req = `/pros/requests/${hire.body.id}`;
    expect((await api(c, "PATCH", req, { token: client.token, body: { status: "accepted" } })).status).toBe(400);
    expect((await api(c, "PUT", `${req}/review`, { token: client.token, body: { rating: 5 } })).status).toBe(400);
    expect((await api<J>(c, "PATCH", req, { token: pro.token, body: { status: "accepted" } })).body.status).toBe("accepted");
    expect((await api<J>(c, "PATCH", req, { token: client.token, body: { status: "done" } })).body.status).toBe("done");
    expect((await api(c, "PUT", `${req}/review`, { token: pro.token, body: { rating: 5 } })).status).toBe(400);
    expect((await api<J>(c, "PUT", `${req}/review`, { token: client.token, body: { rating: 4, text: "Fast and clear." } })).body).toMatchObject({ rating: 4, text: "Fast and clear." });
    await api(c, "PUT", `${req}/review`, { token: client.token, body: { rating: 5, text: "Fast and clear. Recommended." } });
    const profile = await api<J>(c, "GET", `/pros/${pro.id}`, {});
    expect(profile.body).toMatchObject({ rating: 5, review_count: 1, done_count: 1 });
    expect((await api<J>(c, "GET", `/pros/${pro.id}/reviews`, {})).body.items.map((r: J) => r.text)).toEqual(["Fast and clear. Recommended."]);

    // Closed: hidden; opened again with its reviews.
    await api(c, "DELETE", "/me/pro", { token: pro.token });
    expect((await api(c, "GET", `/pros/${pro.id}`, {})).status).toBe(404);
    await api(c, "PUT", "/me/pro", { token: pro.token, body: { headline: "Back again", services: [{ title: "Store app" }], availability: "busy" } });
    expect((await api<J>(c, "GET", `/pros/${pro.id}`, {})).body).toMatchObject({ review_count: 1, availability: "busy" });
  });
});

describe("234.2 jobs", () => {
  it("post, apply once, the poster sees applicants and shortlists; a new member's first job waits for review", async () => {
    const c = await testCommunity();
    const [poster, dev] = [await trusted(c, "Job Poster"), await joinWithEmail(c, "Dev Applicant")];
    const job = await api<J>(c, "POST", "/jobs", {
      token: poster.token,
      body: { title: "Flutter developer for a shop app", description: "A store app with WooCommerce, three months.", type: "contract", remote: true, skills: ["Flutter"], budget: "$2,000 a month" },
    });
    expect(job.status).toBe(201);
    expect(job.body).toMatchObject({ status: "open", type: "contract", budget: "$2,000 a month", application_count: 0, applied: false });
    expect((await api<J>(c, "GET", "/jobs?type=contract&skill=flutter", {})).body.items.map((j: J) => j.id)).toEqual([job.body.id]);
    expect((await api(c, "POST", `/jobs/${job.body.id}/applications`, { token: poster.token, body: { message: "Applying to my own job" } })).status).toBe(400);
    const applied = await api<J>(c, "POST", `/jobs/${job.body.id}/applications`, { token: dev.token, body: { message: "I built three shop apps.", links: ["https://dev.example/portfolio"] } });
    expect(applied.status).toBe(201);
    expect((await api(c, "POST", `/jobs/${job.body.id}/applications`, { token: dev.token, body: { message: "Once more, again." } })).status).toBe(409);
    expect((await api<J>(c, "GET", `/jobs/${job.body.id}`, { token: dev.token })).body).toMatchObject({ applied: true, application_count: 0 });
    expect((await api<J>(c, "GET", `/jobs/${job.body.id}`, { token: poster.token })).body.application_count).toBe(1);
    expect((await api(c, "GET", `/jobs/${job.body.id}/applications`, { token: dev.token })).status).toBe(403);
    const applicants = await api<J>(c, "GET", `/jobs/${job.body.id}/applications`, { token: poster.token });
    expect(applicants.body.items.map((a: J) => a.applicant.id)).toEqual([dev.id]);
    expect((await api<J>(c, "PATCH", `/jobs/${job.body.id}/applications/${applied.body.id}`, { token: poster.token, body: { status: "shortlisted" } })).body.status).toBe("shortlisted");
    expect((await api<J>(c, "GET", "/me/job-applications", { token: dev.token })).body.items[0]).toMatchObject({ job_title: "Flutter developer for a shop app", status: "shortlisted" });
    // Closed: off the list, still the poster's.
    await api(c, "PATCH", `/jobs/${job.body.id}`, { token: poster.token, body: { status: "closed" } });
    expect((await api<J>(c, "GET", "/jobs", {})).body.items).toEqual([]);
    expect((await api<J>(c, "GET", "/jobs?mine=true", { token: poster.token })).body.items.map((j: J) => j.status)).toEqual(["closed"]);

    const fresh = await api<J>(c, "POST", "/jobs", { token: dev.token, body: { title: "Designer for app icons", description: "Twenty icons in our brand colours.", type: "freelance" } });
    expect(fresh.body.status).toBe("pending");
    expect((await api(c, "GET", `/jobs/${fresh.body.id}`, { token: poster.token })).status).toBe(404);
  });
});

describe("232–235 the tenant key", () => {
  it("a client app's community shares nothing with Yallapp Community, and has no Yallapp-only routes", async () => {
    const yallapp = await testCommunity();
    const app = await testCommunity({ tenant: "6f0d9a52-3c1e-4d55-9a0a-6b1d2e7c4f10" });
    // One store each, as getCommunityStore(tenant) keeps them; Yallapp's platform is shared.
    app.deps.platform = yallapp.deps.platform;
    const a = await joinWithEmail(yallapp, "Same Person");
    const b = await joinWithEmail(app, "Same Person");
    expect(b.email).toBe(a.email);
    // A token is its own community's only.
    expect((await api(app, "GET", "/me", { token: a.token })).status).toBe(401);
    expect((await api(app, "GET", `/members/${a.id}`, {})).status).toBe(404);
    // Yallapp-only routes: none in a client's community.
    expect((await api(app, "GET", "/me/yallapp-link", { token: b.token })).status).toBe(404);
    expect((await api(app, "POST", "/auth/yallapp/start", { body: {} })).status).toBe(404);
    // Admin routes: only through the client's dashboard (tenantAdmin), never Yallapp's own staff.
    await makeYallappStaff(app, b.id);
    expect((await api(app, "GET", "/admin/moderation", { token: b.token })).status).toBe(403);
  });
});

describe("235 an app's customers in its own community", () => {
  it("POST /auth/app: the customer's app token gives a community session, the same member each time; never in Yallapp Community", async () => {
    const yallapp = await testCommunity();
    const platform = yallapp.deps.platform;
    const { client } = await registerClient(platform, { name: "Shop Owner", email: "owner@shop.test", whatsapp: "+905446731948", siteUrl: "", password: null }, NOW);
    const app = { ...newApp(client.id, null, NOW, "store"), appName: "Petal Shop" };
    await platform.createApp(app);
    const c = await testCommunity({ tenant: app.id });
    c.deps.platform = platform;
    c.deps.hostedSecret = "hosted-secret-for-tests-0123456789abcdef";
    const customer = (await platform.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Leyla Demir", email: "leyla@customer.test", city: null, now: NOW }))!;
    const deviceId = "device-row-1";
    await platform.createHostedDevice({ id: deviceId, appId: app.id, userId: customer.id, deviceId: "install-1", platform: "android", name: "Pixel", appVersion: "1.0.0", pushToken: null, pushPreferences: null, createdAt: NOW, lastSeenAt: NOW } as never);
    const now = Math.floor(NOW.getTime() / 1000);
    const token = encodeJwt({ aud: app.id, sub: customer.id, did: deviceId, iat: now, exp: now + 900 }, c.deps.hostedSecret);

    const first = await api<J>(c, "POST", "/auth/app", { body: { access_token: token } });
    expect(first.status).toBe(201);
    expect(first.body.member).toMatchObject({ display_name: "Leyla Demir", email: "leyla@customer.test", providers: ["app"] });
    const again = await api<J>(c, "POST", "/auth/app", { body: { access_token: token } });
    expect(again.status).toBe(200);
    expect(again.body.member.id).toBe(first.body.member.id);
    expect((await api<J>(c, "GET", "/me", { token: again.body.access_token })).body.id).toBe(first.body.member.id);
    // A token for another app, a forged one, or a signed-out device: 401.
    const other = encodeJwt({ aud: "another-app", sub: customer.id, did: deviceId, iat: now, exp: now + 900 }, c.deps.hostedSecret);
    expect((await api(c, "POST", "/auth/app", { body: { access_token: other } })).status).toBe(401);
    expect((await api(c, "POST", "/auth/app", { body: { access_token: `${token}x` } })).status).toBe(401);
    const gone = encodeJwt({ aud: app.id, sub: customer.id, did: "no-such-device", iat: now, exp: now + 900 }, c.deps.hostedSecret);
    expect((await api(c, "POST", "/auth/app", { body: { access_token: gone } })).status).toBe(401);
    // Yallapp Community has no app sign-in.
    expect((await api(yallapp, "POST", "/auth/app", { body: { access_token: token } })).status).toBe(404);
  });
});

