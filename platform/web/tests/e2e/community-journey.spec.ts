import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { all, API, as, heldItem, join as joinWith, joinAsAdmin, json, type Json, type Member } from "./community-helpers";

/**
 * 231 Yallapp Community phase 1, across its areas, on the real server and
 * a MySQL or MariaDB database (E2E_DATABASE_URL): joining by email and
 * editing the profile, following and becoming friends (A); a new member's
 * first posts waiting in moderation until an admin approves them (C), then
 * shown (B); an answer accepted and its points on the profile (B, A); an
 * admin granting Blue by hand with a reason, shown as the member's badge,
 * then revoking it, both in the audit log (C); a report reaching the admins'
 * list (A, C); and the notifications of all of it (C), also in Arabic and
 * Turkish. Also the spam filter (a post with too many links held, an
 * edit into one held again) and a removed post staying hidden. The admin
 * is a member linked to one of the e2e's Yallapp super admins
 * (lib/community/staff.ts), on a fresh database.
 */
test.describe.configure({ mode: "serial" });
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.232" } });

const suffix = Date.now().toString(36);

const join = (request: Parameters<typeof joinWith>[0], name: string) => joinWith(request, name, suffix);

let karim: Member;
let nour: Member;
let omar: Member;
let admin: Member;
let question: Json;
let answer: Json;

test("joining, the profile, following and friends", async ({ browser, request }) => {
  karim = await join(request, "Karim");
  nour = await join(request, "Nour");
  omar = await join(request, "Omar");
  admin = await joinAsAdmin(browser, request, suffix, E2E.communityJourneyAdminEmail);

  const me = await json(request.patch(`${API}/me`, { ...as(karim), data: { headline: "Building a store app", bio: "I sell handmade bags." } }));
  expect(me).toMatchObject({ headline: "Building a store app", bio: "I sell handmade bags." });

  expect((await request.put(`${API}/members/${nour.id}/follow`, as(karim))).status()).toBeLessThan(300);
  expect((await request.put(`${API}/members/${nour.id}/friend`, as(karim))).status()).toBe(200);
  // Asking back accepts.
  expect((await request.put(`${API}/members/${karim.id}/friend`, as(nour))).status()).toBe(200);
  const seen = await json(request.get(`${API}/members/${nour.id}`, as(karim)));
  expect(seen.relationship).toMatchObject({ following: true, friend: "friends" });
  expect(seen.counts.followers).toBe(1);
});

test("a new member's first posts wait for moderation; an admin approves and they show", async ({ request }) => {
  question = await json(
    request.post(`${API}/qa/questions`, {
      ...as(karim),
      data: { title: `How do I add card payments to my store ${suffix}?`, body: "My store is built with Yallapp. Where do I connect a payment gateway?", section: "payments", tags: ["payments"] },
    }),
    201,
  );
  expect(question.status).toBe("pending");
  // Waiting: nobody else sees it, its author does.
  expect((await request.get(`${API}/qa/questions/${question.id}`)).status()).toBe(404);
  expect((await json(request.get(`${API}/qa/questions/${question.id}?view=0`, as(karim)))).status).toBe("pending");
  expect((await request.get(`${API}/qa/questions/${question.id}`, as(nour))).status()).toBe(404);
  expect((await request.get(`${API}/admin/moderation`, as(karim))).status()).toBe(403);

  const item = await heldItem(request, admin, question.id);
  expect(item).toMatchObject({ target_type: "question", status: "open", author: { id: karim.id } });
  await json(request.post(`${API}/admin/moderation/${item!.id}`, { ...as(admin), data: { decision: "approve" } }));

  const shown = await json(request.get(`${API}/qa/questions/${question.id}`));
  expect(shown.status).toBe("published");
  const listed = await json(request.get(`${API}/qa/questions?section=payments&sort=newest`));
  expect(listed.items.map((q: Json) => q.id)).toContain(question.id);
});

test("another member answers, the asker accepts, and the points reach the profile", async ({ request }) => {
  answer = await json(request.post(`${API}/qa/questions/${question.id}/answers`, { ...as(nour), data: { body: "Open Payments in the dashboard, add a gateway and paste its keys." } }), 201);
  expect(answer.status).toBe("pending");
  const item = await heldItem(request, admin, answer.id);
  expect(item).toMatchObject({ target_type: "answer", status: "open" });
  await json(request.post(`${API}/admin/moderation/${item!.id}`, { ...as(admin), data: { decision: "approve" } }));

  const before = (await json(request.get(`${API}/members/${nour.id}`))).points as number;
  const accepted = await json(request.put(`${API}/qa/answers/${answer.id}/accept`, as(karim)));
  expect(accepted).toMatchObject({ accepted: true, accepted_answer_id: answer.id, answer_count: 1 });
  const profile = await json(request.get(`${API}/members/${nour.id}`));
  expect(profile.points - before).toBe(25);
  expect(profile.counts).toMatchObject({ answers: 1, accepted_answers: 1 });
  expect((await json(request.get(`${API}/members/${karim.id}`))).counts.questions).toBe(1);
});

const SPAM = "Get it here: https://a.example/1 https://b.example/2 https://c.example/3 https://d.example/4";

test("the spam filter holds a post with too many links; removed, it stays hidden and its author is told", async ({ request }) => {
  const spam = await json(request.post(`${API}/qa/questions`, { ...as(omar), data: { title: `Cheap app installs for your store ${suffix}`, body: SPAM, section: "general" } }), 201);
  expect(spam.status).toBe("pending");
  const item = await heldItem(request, admin, spam.id);
  expect(item).toMatchObject({ target_type: "question", cause: "spam_filter", author: { id: omar.id } });
  await json(request.post(`${API}/admin/moderation/${item!.id}`, { ...as(admin), data: { decision: "remove", note: "Spam links" } }));
  expect((await request.get(`${API}/qa/questions/${spam.id}`)).status()).toBe(404);
  expect((await request.get(`${API}/qa/questions/${spam.id}`, as(omar))).status()).toBe(404);
  expect((await json(request.get(`${API}/search?q=${encodeURIComponent(`cheap installs ${suffix}`)}`))).questions.map((q: Json) => q.id)).not.toContain(spam.id);
  expect((await all(request, `${API}/notifications`, omar)).map((n) => n.kind)).toContain("post_removed");
});

test("an edit of a published question into spam is held again until approved", async ({ request }) => {
  const edited = await json(request.patch(`${API}/qa/questions/${question.id}`, { ...as(karim), data: { body: SPAM } }));
  expect(edited.status).toBe("pending");
  expect((await request.get(`${API}/qa/questions/${question.id}`)).status()).toBe(404);
  const item = await heldItem(request, admin, question.id);
  expect(item).toMatchObject({ cause: "spam_filter" });
  await json(request.post(`${API}/admin/moderation/${item!.id}`, { ...as(admin), data: { decision: "approve" } }));
  expect((await json(request.get(`${API}/qa/questions/${question.id}?view=0`))).status).toBe("published");
});

test("an admin grants Blue with a reason, it shows as the badge, the admin revokes it; both are in the audit log", async ({ request }) => {
  expect((await request.post(`${API}/admin/members/${nour.id}/badges`, { ...as(karim), data: { badge: "blue", reason: "Not an admin" } })).status()).toBe(403);
  const reason = `Helpful answers in Payments ${suffix}`;
  await json(request.post(`${API}/admin/members/${nour.id}/badges`, { ...as(admin), data: { badge: "blue", reason } }), 201);
  expect((await json(request.get(`${API}/members/${nour.id}`))).top_badge).toBe("blue");
  // The badge beside the name where the Q&A shows them too.
  const read = await json(request.get(`${API}/qa/questions/${question.id}?view=0`));
  expect(read.answers[0].author).toMatchObject({ id: nour.id, top_badge: "blue" });

  const revoked = `Granted by mistake ${suffix}`;
  expect((await request.delete(`${API}/admin/members/${nour.id}/badges/blue`, { ...as(admin), data: { reason: revoked } })).status()).toBe(204);
  expect((await json(request.get(`${API}/members/${nour.id}`))).top_badge).toBeNull();

  const log = await all(request, `${API}/admin/audit-log?member=${nour.id}`, admin);
  expect(log.find((e) => e.action === "badge.grant")).toMatchObject({ reason, actor: { id: admin.id }, member: { id: nour.id } });
  expect(log.find((e) => e.action === "badge.revoke")).toMatchObject({ reason: revoked, actor: { id: admin.id } });
});

test("a member reports a question and it reaches the admins' reports", async ({ request }) => {
  const report = await request.post(`${API}/reports`, { ...as(omar), data: { target_type: "question", target_id: question.id, reason: "spam", note: "Looks like an advert" } });
  expect(report.status(), await report.text()).toBe(201);
  expect((await request.post(`${API}/reports`, { ...as(omar), data: { target_type: "question", target_id: question.id, reason: "spam" } })).status()).toBe(409);
  const reports = await all(request, `${API}/admin/reports?status=open`, admin);
  expect(reports.find((r) => r.target_id === question.id)).toMatchObject({ target_type: "question", reason: "spam", reporter: { id: omar.id } });
});

test("the notifications of all of it, in English, Arabic and Turkish", async ({ request }) => {
  const kinds = async (m: Member) => (await all(request, `${API}/notifications`, m)).map((n) => n.kind as string);
  // Karim: his question approved, Nour's answer, Nour's friendship.
  expect(await kinds(karim)).toEqual(expect.arrayContaining(["post_approved", "answer", "friend_accepted"]));
  // Nour: followed, a friend request, her answer approved and accepted, Blue granted and revoked.
  expect(await kinds(nour)).toEqual(expect.arrayContaining(["follow", "friend_request", "post_approved", "answer_accepted", "badge_granted", "badge_revoked"]));

  const textOf = async (m: Member, kind: string) => (await all(request, `${API}/notifications`, m)).find((n) => n.kind === kind)!.text as string;
  const english = await textOf(nour, "answer_accepted");
  await json(request.patch(`${API}/me`, { ...as(nour), data: { language: "ar" } }));
  const arabic = await textOf(nour, "answer_accepted");
  expect(arabic).toMatch(/[؀-ۿ]/);
  await json(request.patch(`${API}/me`, { ...as(nour), data: { language: "tr" } }));
  const turkish = await textOf(nour, "answer_accepted");
  expect(new Set([english, arabic, turkish]).size).toBe(3);
  // The Q&A's own words follow the member's language too.
  const refused = await json(request.post(`${API}/qa/questions`, { ...as(nour), data: { title: "Short", body: "Too short", section: "payments" } }), 400);
  expect(refused.error.fields.title).toBe("10 ile 200 karakter arasında bir başlık yazın.");

  const unread = await json(request.get(`${API}/notifications?unread=1`, as(karim)));
  expect(unread.items.length).toBeGreaterThan(0);
  expect((await request.post(`${API}/notifications/read`, { ...as(karim), data: {} })).status()).toBeLessThan(300);
  expect((await json(request.get(`${API}/notifications?unread=1`, as(karim)))).items).toHaveLength(0);
});
