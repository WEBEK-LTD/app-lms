import { expect, test, type APIRequestContext } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 231 Yallapp Community's Q&A and tutorials (area B) on the real server,
 * through /api/community/v1: two members sign up, one asks after looking at
 * the similar questions, the other answers, the asker votes, replies,
 * accepts and the helper's profile shows the points; saving, search, the
 * home's panels, the tutorials' lists and a refused field in Arabic. The
 * team's official answers and tutorials are held by the unit tests
 * (tests/unit/community-qa-api.test.ts): no API makes a member the team's.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up limits per IP don't reach the other specs.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.231" } });

const API = `${E2E.baseURL}/api/community/v1`;
const suffix = Date.now().toString(36);
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Member {
  id: string;
  token: string;
}

async function join(request: APIRequestContext, name: string): Promise<Member> {
  const r = await request.post(`${API}/auth/email/sign-up`, { data: { email: `${name.toLowerCase()}-${suffix}@community.test`, password: "correct horse battery", display_name: `${name} ${suffix}` } });
  expect(r.status(), await r.text()).toBe(201);
  const body = (await r.json()) as Json;
  return { id: body.member.id, token: body.access_token };
}

const as = (m: Member, extra: Record<string, string> = {}) => ({ headers: { authorization: `Bearer ${m.token}`, ...extra } });

let asker: Member;
let helper: Member;
let question: Json;
let answer: Json;
const title = `How do I connect a payment gateway to my store ${suffix}?`;

test("a member asks a question after the similar ones", async ({ request }) => {
  asker = await join(request, "Karim");
  helper = await join(request, "Nour");

  const sections = (await (await request.get(`${API}/qa/sections`)).json()) as Json;
  expect(sections.items.map((s: Json) => s.slug)).toEqual(expect.arrayContaining(["stores", "payments", "general"]));

  expect((await request.post(`${API}/qa/questions`, { data: { title, body: "x" } })).status()).toBe(401);
  const asked = await request.post(`${API}/qa/questions`, {
    ...as(asker),
    data: { title, body: "I built a store with Yallapp and want card payments at checkout. Where do I start?", section: "payments", tags: ["Payments", "Checkout"] },
  });
  expect(asked.status(), await asked.text()).toBe(201);
  question = (await asked.json()) as Json;
  expect(question).toMatchObject({ status: "published", section: { slug: "payments" }, answers: [], can_edit: true });

  const similar = (await (await request.get(`${API}/qa/questions/similar?title=${encodeURIComponent(`payment gateway store ${suffix}`)}`)).json()) as Json;
  expect(similar.items.map((q: Json) => q.id)).toContain(question.id);

  const unanswered = (await (await request.get(`${API}/qa/questions?section=payments&filter=unanswered&sort=newest`)).json()) as Json;
  expect(unanswered.items.map((q: Json) => q.id)).toContain(question.id);
});

test("another member answers; the asker votes, replies and accepts", async ({ request }) => {
  const answered = await request.post(`${API}/qa/questions/${question.id}/answers`, { ...as(helper), data: { body: "Open Payments in the dashboard and add your gateway's keys." } });
  expect(answered.status(), await answered.text()).toBe(201);
  answer = (await answered.json()) as Json;
  expect(answer).toMatchObject({ official: false, accepted: false, score: 0 });

  // Only the team answers officially; nobody votes on their own post.
  expect((await request.post(`${API}/qa/questions/${question.id}/answers`, { ...as(helper), data: { body: "An official answer from me.", official: true } })).status()).toBe(403);
  expect((await request.put(`${API}/qa/answers/${answer.id}/vote`, { ...as(helper), data: { value: 1 } })).status()).toBe(400);

  const voted = (await (await request.put(`${API}/qa/answers/${answer.id}/vote`, { ...as(asker), data: { value: 1 } })).json()) as Json;
  expect(voted).toEqual({ score: 1, my_vote: 1 });

  const replied = await request.post(`${API}/qa/answers/${answer.id}/replies`, { ...as(asker), data: { body: "Thanks! Where do I find the keys?" } });
  expect(replied.status()).toBe(201);
  const replies = (await (await request.get(`${API}/qa/answers/${answer.id}/replies`)).json()) as Json;
  expect(replies.items).toHaveLength(1);

  expect((await request.put(`${API}/qa/answers/${answer.id}/accept`, as(helper))).status()).toBe(403);
  const accepted = (await (await request.put(`${API}/qa/answers/${answer.id}/accept`, as(asker))).json()) as Json;
  expect(accepted).toMatchObject({ accepted: true, accepted_answer_id: answer.id });
  expect(accepted.answers[0]).toMatchObject({ id: answer.id, accepted: true, reply_count: 1 });

  const profile = (await (await request.get(`${API}/members/${helper.id}`)).json()) as Json;
  expect(profile.points).toBe(30);
  expect(profile.counts).toMatchObject({ answers: 1, accepted_answers: 1 });
});

test("saving, search and the home's panels", async ({ request }) => {
  expect((await request.put(`${API}/qa/questions/${question.id}/bookmark`, as(helper))).status()).toBe(204);
  const saved = (await (await request.get(`${API}/qa/saved`, as(helper))).json()) as Json;
  expect(saved.questions.map((q: Json) => q.id)).toEqual([question.id]);

  const found = (await (await request.get(`${API}/search?q=${encodeURIComponent(`gateway ${suffix}`)}`)).json()) as Json;
  expect(found.questions.map((q: Json) => q.id)).toContain(question.id);
  expect(found).toHaveProperty("tutorials");
  expect(found).toHaveProperty("members");

  const read = (await (await request.get(`${API}/qa/questions/${question.slug}?view=0`, as(helper))).json()) as Json;
  expect(read).toMatchObject({ id: question.id, bookmarked: true, accepted: true });

  const home = await request.get(`${API}/qa/home`, as(helper));
  expect(home.status()).toBe(200);
  expect((await home.json()) as Json).toMatchObject({ waiting: { total: expect.any(Number) }, stats: { questions: expect.any(Number) } });

  const tutorials = (await (await request.get(`${API}/tutorials?kind=video&level=beginner`)).json()) as Json;
  expect(tutorials).toMatchObject({ items: expect.any(Array), next_cursor: null });
  expect(((await (await request.get(`${API}/tutorials/sections`)).json()) as Json).items.length).toBeGreaterThan(0);
});

test("a refused field is explained in the reader's language, and the asker deletes their question", async ({ request }) => {
  const refused = await request.post(`${API}/qa/questions`, { ...as(helper), data: { title: "Short", body: "Too short", section: "payments" } });
  expect(refused.status()).toBe(400);
  const error = ((await refused.json()) as Json).error;
  expect(error.code).toBe("invalid_request");
  expect(error.fields).toHaveProperty("title");

  await request.patch(`${API}/me`, { ...as(helper), data: { language: "ar" } });
  const arabic = ((await (await request.post(`${API}/qa/questions`, { ...as(helper), data: { title: "Short", body: "Too short", section: "payments" } })).json()) as Json).error;
  expect(arabic.fields.title).toBe("اكتب عنوانًا من 10 إلى 200 حرف.");

  expect((await request.delete(`${API}/qa/questions/${question.id}`, as(helper))).status()).toBe(403);
  expect((await request.delete(`${API}/qa/questions/${question.id}`, as(asker))).status()).toBe(204);
  expect((await request.get(`${API}/qa/questions/${question.id}`)).status()).toBe(404);
});
