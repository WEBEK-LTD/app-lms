import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { academyShop } from "@/lib/community/engage/academy-shop";
import type { CourseCheckoutGateway } from "@/lib/community/engage/checkout";
import { settleCourseOrder, startCourseCheckout } from "@/lib/community/engage/checkout";
import type { CommunityPushMessage } from "@/lib/community/engage/push";
import { api, joinWithEmail, makeYallappStaff, NOW, testCommunity, type TestCommunity } from "./community-support";

/**
 * 232–233 Area C's work as the other areas use it: pushes for new messages
 * (area A), points through the ledger for posts and the Q&A (area B),
 * phase 1's moderation queue for area B's posts, and the academy's checkout
 * on area B's real course and access records.
 */

let c: TestCommunity;
let pushed: { tokens: string[]; message: CommunityPushMessage }[];
const PHONE = (n: string) => `fcm-${n}-${"b".repeat(140)}`;
const ctx = () => ({ deps: c.deps, store: c.deps.store, now: c.deps.now });

beforeEach(async () => {
  c = await testCommunity();
  pushed = [];
  c.deps.push = async (targets, message) => {
    pushed.push({ tokens: targets.map((t) => t.token), message });
    return { sent: targets.length, invalidTokens: [] };
  };
});

describe("232 a new message reaches the others' phones", () => {
  it("not the author's, not a member who muted it or turned message pushes off, and never across a block", async () => {
    const [nour, ali, sami] = [await joinWithEmail(c, "Nour El Hoda"), await joinWithEmail(c, "Ali Kaya"), await joinWithEmail(c, "Sami Aydın")];
    for (const [m, n] of [[nour, "nour"], [ali, "ali"], [sami, "sami"]] as const) await api(c, "PUT", "/me/push-tokens", { token: m.token, body: { token: PHONE(n), platform: "android" } });
    const chat = await api<{ id: string }>(c, "POST", "/messages/conversations", { token: nour.token, body: { member_ids: [ali.id, sami.id], title: "Studio help" } });
    expect(chat.status).toBe(201);
    expect((await api(c, "POST", `/messages/conversations/${chat.body.id}/messages`, { token: nour.token, body: { body: "Hello both" } })).status).toBe(201);
    expect(pushed.map((p) => p.tokens[0]).sort()).toEqual([PHONE("ali"), PHONE("sami")]);
    expect(pushed[0]!.message).toMatchObject({ title: "Yallapp Community", body: "Nour El Hoda: Hello both", data: { kind: "message", conversation_id: chat.body.id, link: `/messages/${chat.body.id}` } });

    pushed.length = 0;
    await api(c, "PATCH", `/messages/conversations/${chat.body.id}`, { token: ali.token, body: { muted: true } });
    await api(c, "PUT", "/notifications/settings", { token: sami.token, body: { push: { message: false } } });
    await api(c, "POST", `/messages/conversations/${chat.body.id}/messages`, { token: nour.token, body: { body: "Anyone?" } });
    expect(pushed).toEqual([]);

    // A block between them: nothing from the one blocked.
    await api(c, "PUT", "/notifications/settings", { token: sami.token, body: { push: { message: true } } });
    await api(c, "PUT", `/members/${nour.id}/block`, { token: sami.token });
    await api(c, "POST", `/messages/conversations/${chat.body.id}/messages`, { token: nour.token, body: { body: "Still here" } });
    expect(pushed.map((p) => p.tokens[0])).not.toContain(PHONE("sami"));
  });
});

describe("233 points for area B's posts and Q&A go through the ledger", () => {
  it("a post pays post_created within its daily cap; the ledger and the member's total agree", async () => {
    const nour = await joinWithEmail(c, "Nour El Hoda");
    await c.deps.store.base.updateMember(nour.id, { approvedPosts: 2 });
    for (let i = 0; i < 7; i++) expect((await api(c, "POST", "/posts", { token: nour.token, body: { body: `My app update number ${i}` } })).status).toBe(201);
    // 2 a post, at most 10 a day.
    expect((await c.deps.store.base.getMember(nour.id))!.points).toBe(10);
    expect(await c.deps.store.engage.memberTotal("yallapp", nour.id, null)).toBe(10);
  });

  it("a vote on an answer pays answer_upvoted from the admins' table, and taking it back takes it back", async () => {
    const [asker, helper, voter, admin] = [await joinWithEmail(c, "Karim Asker"), await joinWithEmail(c, "Nour Helper"), await joinWithEmail(c, "Ali Voter"), await joinWithEmail(c, "Community Admin")];
    await makeYallappStaff(c, admin.id);
    for (const m of [asker, helper, voter]) await c.deps.store.base.updateMember(m.id, { approvedPosts: 2 });
    await api(c, "PUT", "/admin/points", { token: admin.token, body: { actions: [{ action: "answer_upvoted", points: 7, daily_cap: null }] } });
    const q = await api<{ id: string }>(c, "POST", "/qa/questions", { token: asker.token, body: { title: "How do I connect a payment gateway to my store?", body: "I built a store with Yallapp and want card payments at checkout. Where do I start?", section: "payments", tags: ["Payments"] } });
    const a = await api<{ id: string }>(c, "POST", `/qa/questions/${q.body.id}/answers`, { token: helper.token, body: { body: "Open Settings, then Payments, and connect your provider there." } });
    expect((await api(c, "PUT", `/qa/answers/${a.body.id}/vote`, { token: voter.token, body: { value: 1 } })).status).toBe(200);
    expect((await c.deps.store.base.getMember(helper.id))!.points).toBe(7);
    expect((await api(c, "PUT", `/qa/answers/${a.body.id}/vote`, { token: voter.token, body: { value: 0 } })).status).toBe(200);
    expect((await c.deps.store.base.getMember(helper.id))!.points).toBe(0);
    expect(await c.deps.store.engage.memberTotal("yallapp", helper.id, null)).toBe(0);
  });
});

describe("232 area B's posts in phase 1's moderation queue", () => {
  it("a new member's post waits, shows its words to the moderator, and approving it publishes it", async () => {
    const [newcomer, admin] = [await joinWithEmail(c, "New Member"), await joinWithEmail(c, "Community Admin")];
    await makeYallappStaff(c, admin.id);
    const post = await api<{ id: string; status: string }>(c, "POST", "/posts", { token: newcomer.token, body: { body: "Hello everyone, my first app is live" } });
    expect(post.body.status).toBe("pending");
    const queue = await api<{ items: { id: string; target_type: string; target_id: string; preview: string }[] }>(c, "GET", "/admin/moderation", { token: admin.token });
    const item = queue.body.items.find((i) => i.target_id === post.body.id)!;
    expect(item).toMatchObject({ target_type: "post", preview: expect.stringContaining("my first app is live") });
    expect((await api(c, "POST", `/admin/moderation/${item.id}`, { token: admin.token, body: { decision: "approve" } })).status).toBe(200);
    expect((await api<{ status: string }>(c, "GET", `/posts/${post.body.id}`)).body.status).toBe("published");
  });
});

describe("233 the academy's checkout on area B's courses", () => {
  it("a priced course is bought once and opens; a free one or one with no price can't be bought", async () => {
    const member = await joinWithEmail(c, "Learner One");
    const academy = c.deps.store.qa.academy;
    const course = (over: Record<string, unknown>) => ({ id: randomUUID(), tenant: "yallapp", slug: `course-${randomUUID().slice(0, 6)}`, title: "Studio from zero", summary: "", coverUrl: null, level: "beginner", language: "en", status: "published", free: false, priceMinor: 1900, currency: "USD", createdAt: NOW, updatedAt: NOW, publishedAt: NOW, ...over }) as never;
    const paid = course({});
    const free = course({ free: true, priceMinor: null, currency: null });
    const unpriced = course({ priceMinor: null, currency: null });
    for (const x of [paid, free, unpriced]) await academy.createCourse(x);
    c.deps.courses = academyShop;
    let token = "";
    const paidRefs = new Set<string>();
    const gateway: CourseCheckoutGateway = {
      account: { provider: "kashier", keys: {} } as never,
      egpPerUsd: 50,
      start: async (_a, request) => ({ url: `https://pay.example/${request.reference}`, providerRef: "ref" }) as never,
      confirm: async (_a, expected) => ({ paid: paidRefs.has(expected.reference), paymentId: "pay-1" }) as never,
      callbackUrls: (p, t) => ((token = t), { returnUrl: `https://yallapp.test/api/pay/${p}/course/${t}`, webhookUrl: null }),
    };
    c.deps.courseCheckout = async () => gateway;
    const id = (x: unknown) => (x as { id: string }).id;
    expect(await startCourseCheckout(ctx(), member.id, id(free), { ip: "203.0.113.7" })).toMatchObject({ ok: false, code: "course_free" });
    expect(await startCourseCheckout(ctx(), member.id, id(unpriced), { ip: "203.0.113.7" })).toMatchObject({ ok: false, code: "checkout_unavailable" });
    const started = await startCourseCheckout(ctx(), member.id, id(paid), { ip: "203.0.113.7" });
    expect(started.ok).toBe(true);
    paidRefs.add(`crs-${(started as { order: { id: string } }).order.id}`);
    expect((await settleCourseOrder(ctx(), token, { provider: "kashier" })).status).toBe("paid");
    expect(await academyShop.owned(ctx(), member.id, id(paid))).toBe(true);
    expect((await academy.accessOf(member.id, [id(paid)]))[0]).toMatchObject({ source: "bought" });
    expect(await startCourseCheckout(ctx(), member.id, id(paid), { ip: "203.0.113.7" })).toMatchObject({ ok: false, code: "already_owned" });
  });
});
