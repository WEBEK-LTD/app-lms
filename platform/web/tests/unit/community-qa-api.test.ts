import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { QA_ROUTES } from "@/lib/community/api/qa-routes";
import { api, joinWithEmail, makeYallappStaff, NOW, testCommunity, type TestCommunity } from "./community-support";

/**
 * 231 Area B through the Community API (/api/community/v1): asking with the
 * similar questions, answering, official answers, votes and points on the
 * profile, accepting, replies, bookmarks, search, tutorials, blocks and the
 * errors' fields in the reader's language.
 */

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function setup() {
  const c = await testCommunity({ providers: false });
  const asker = await joinWithEmail(c, "Karim Asker");
  const helper = await joinWithEmail(c, "Nour Helper");
  const team = await joinWithEmail(c, "Tariq Staff");
  // "Yallapp Team": their linked Yallapp account is on Yallapp's support team.
  await makeYallappStaff(c, team.id, "support");
  return { c, asker, helper, team };
}

const QUESTION = { title: "How do I connect a payment gateway to my store?", body: "I built a store with Yallapp and want card payments at checkout. Where do I start?", section: "payments", tags: ["Payments", "Checkout"] };

async function ask(c: TestCommunity, token: string, body: Json = QUESTION) {
  const r = await api<Json>(c, "POST", "/qa/questions", { token, body });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body;
}

describe("231 Community Q&A API", () => {
  it("serves exactly the contract's Q&A, tutorials and search paths", () => {
    const contract = parse(readFileSync(new URL("../../../../docs/api/community.yaml", import.meta.url), "utf8")) as { paths: Record<string, Record<string, unknown>> };
    const METHODS = ["get", "post", "put", "patch", "delete"];
    const documented = Object.entries(contract.paths)
      .filter(([path]) => /^\/(qa|tutorials|search)(\/|$)/.test(path))
      .flatMap(([path, ops]) => Object.keys(ops).filter((m) => METHODS.includes(m)).map((m) => `${m.toUpperCase()} ${path.replace(/\{(\w+)\}/g, ":$1")}`))
      .sort();
    expect(QA_ROUTES.map((r) => `${r.method} ${r.path}`).sort()).toEqual(documented);
  });

  it("lists sections and asks a question after the similar ones", async () => {
    const { c, asker, helper } = await setup();
    const sections = await api<Json>(c, "GET", "/qa/sections");
    expect(sections.status).toBe(200);
    expect(sections.body.items.map((s: Json) => s.slug)).toContain("payments");
    expect(sections.body.items[0]).toMatchObject({ coming_soon: false, icon: expect.any(String) });

    expect((await api(c, "POST", "/qa/questions", { body: QUESTION })).status).toBe(401);
    const q = await ask(c, asker.token);
    expect(q).toMatchObject({ title: QUESTION.title, status: "published", section: { slug: "payments" }, answer_count: 0, my_vote: 0, can_edit: true, answers: [] });
    expect(q.tags.map((t: Json) => t.slug)).toEqual(["payments", "checkout"]);
    // A's one MemberSummary: the level, its name and its progress too.
    expect(q.author).toMatchObject({ id: asker.id, display_name: "Karim Asker", team: false, rank: "newcomer", rank_label: expect.any(String), level: "newcomer", level_label: expect.any(String), level_progress: 0 });

    const similar = await api<Json>(c, "GET", `/qa/questions/similar?title=${encodeURIComponent("connect payment gateway store")}`, { token: helper.token });
    expect(similar.body.items.map((s: Json) => s.id)).toEqual([q.id]);

    const list = await api<Json>(c, "GET", "/qa/questions?section=payments&filter=unanswered");
    expect(list.body).toMatchObject({ items: [{ id: q.id, answer_count: 0 }], next_cursor: null });
  });

  it("answers, marks the team's answers official, and keeps others from it", async () => {
    const { c, asker, helper, team } = await setup();
    const q = await ask(c, asker.token);
    const refused = await api<Json>(c, "POST", `/qa/questions/${q.id}/answers`, { token: helper.token, body: { body: "Use the payments screen in the dashboard.", official: true } });
    expect(refused.status).toBe(403);
    const a = await api<Json>(c, "POST", `/qa/questions/${q.id}/answers`, { token: helper.token, body: { body: "Open Payments in the dashboard and add your keys." } });
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ official: false, accepted: false, score: 0 });
    const o = await api<Json>(c, "POST", `/qa/questions/${q.id}/answers`, { token: team.token, body: { body: "From the team: Payments, then Add a gateway, then follow the steps." } });
    expect(o.body).toMatchObject({ official: true, author: { team: true } });

    const shown = await api<Json>(c, "GET", `/qa/questions/${q.id}`);
    expect(shown.body.answers.map((x: Json) => x.id)).toEqual([o.body.id, a.body.id]);
    expect(shown.body).toMatchObject({ answer_count: 2, has_official_answer: true });
    expect((await api<Json>(c, "GET", "/qa/questions?filter=official")).body.items).toHaveLength(1);
  });

  it("votes, accepts and shows the points on the member's profile", async () => {
    const { c, asker, helper } = await setup();
    const q = await ask(c, asker.token);
    const a = (await api<Json>(c, "POST", `/qa/questions/${q.id}/answers`, { token: helper.token, body: { body: "Open Payments in the dashboard and add your keys." } })).body;

    expect((await api<Json>(c, "PUT", `/qa/answers/${a.id}/vote`, { token: helper.token, body: { value: 1 } })).status).toBe(400);
    const voted = await api<Json>(c, "PUT", `/qa/answers/${a.id}/vote`, { token: asker.token, body: { value: 1 } });
    expect(voted.body).toEqual({ score: 1, my_vote: 1 });
    expect((await api<Json>(c, "PUT", `/qa/answers/${a.id}/vote`, { token: asker.token, body: { value: 2 } })).body.error.fields).toHaveProperty("value");

    expect((await api<Json>(c, "PUT", `/qa/answers/${a.id}/accept`, { token: helper.token })).status).toBe(403);
    const accepted = await api<Json>(c, "PUT", `/qa/answers/${a.id}/accept`, { token: asker.token });
    expect(accepted.body).toMatchObject({ accepted: true, accepted_answer_id: a.id });
    expect(accepted.body.answers[0]).toMatchObject({ id: a.id, accepted: true });

    const profile = await api<Json>(c, "GET", `/members/${helper.id}`);
    expect(profile.body.points).toBe(5 + 25);
    expect(profile.body.counts).toMatchObject({ answers: 1, accepted_answers: 1 });

    const undone = await api<Json>(c, "DELETE", `/qa/answers/${a.id}/accept`, { token: asker.token });
    expect(undone.body.accepted).toBe(false);
    expect((await api<Json>(c, "GET", `/members/${helper.id}`)).body.points).toBe(5);
  });

  it("replies to an answer, saves posts and finds them by search", async () => {
    const { c, asker, helper, team } = await setup();
    const q = await ask(c, asker.token);
    const a = (await api<Json>(c, "POST", `/qa/questions/${q.id}/answers`, { token: helper.token, body: { body: "Open Payments in the dashboard and add your keys." } })).body;
    const r = await api<Json>(c, "POST", `/qa/answers/${a.id}/replies`, { token: asker.token, body: { body: "Thanks, where do I find the keys?" } });
    expect(r.status).toBe(201);
    const replies = await api<Json>(c, "GET", `/qa/answers/${a.id}/replies`);
    expect(replies.body).toMatchObject({ items: [{ id: r.body.id, answer_id: a.id }], next_cursor: null });
    expect((await api(c, "DELETE", `/qa/replies/${r.body.id}`, { token: helper.token })).status).toBe(403);
    expect((await api(c, "DELETE", `/qa/replies/${r.body.id}`, { token: asker.token })).status).toBe(204);

    expect((await api(c, "PUT", `/qa/questions/${q.id}/bookmark`, { token: helper.token })).status).toBe(204);
    const t = await api<Json>(c, "POST", "/tutorials", {
      token: team.token,
      body: { title: "Accept card payments in your store", summary: "Add a gateway in five minutes.", kind: "article", section: "payments", level: "beginner", language: "en", body: "Open Payments, then add a gateway and paste your keys. ".repeat(30) },
    });
    expect(t.status, JSON.stringify(t.body)).toBe(201);
    expect(t.body).toMatchObject({ official: true, locked: false, kind: "article", duration_minutes: expect.any(Number) });
    expect((await api(c, "PUT", `/tutorials/${t.body.slug}/bookmark`, { token: helper.token })).status).toBe(204);
    const saved = await api<Json>(c, "GET", "/qa/saved", { token: helper.token });
    expect(saved.body.questions.map((x: Json) => x.id)).toEqual([q.id]);
    expect(saved.body.tutorials.map((x: Json) => x.id)).toEqual([t.body.id]);

    const found = await api<Json>(c, "GET", "/search?q=payments");
    expect(found.body.questions.map((x: Json) => x.id)).toContain(q.id);
    expect(found.body.tutorials.map((x: Json) => x.id)).toContain(t.body.id);
    expect(found.body.tags.map((x: Json) => x.slug)).toContain("payments");
    expect((await api<Json>(c, "GET", "/search?q=nour&type=members")).body.members.map((m: Json) => m.id)).toEqual([helper.id]);
  });

  it("publishes tutorials for the team only and filters them", async () => {
    const { c, helper, team } = await setup();
    const video = { title: "Publish your app to the stores", summary: "From build to review.", kind: "video", section: "publishing", level: "intermediate", language: "ar", body: "", video_url: "https://www.youtube.com/watch?v=abc123", duration_seconds: 540 };
    expect((await api(c, "POST", "/tutorials", { token: helper.token, body: video })).status).toBe(403);
    const t = await api<Json>(c, "POST", "/tutorials", { token: team.token, body: video });
    expect(t.status, JSON.stringify(t.body)).toBe(201);
    expect(t.body).toMatchObject({ kind: "video", duration_seconds: 540, duration_minutes: 9, video_url: video.video_url, level: "intermediate", language: "ar" });
    expect((await api<Json>(c, "GET", "/tutorials?kind=video&level=intermediate")).body.items).toHaveLength(1);
    expect((await api<Json>(c, "GET", "/tutorials?kind=article")).body.items).toHaveLength(0);
    expect((await api<Json>(c, "GET", `/tutorials/${t.body.slug}`)).body.id).toBe(t.body.id);
    expect((await api<Json>(c, "GET", "/tutorials/sections")).body.items.find((s: Json) => s.slug === "publishing").count).toBe(1);
  });

  it("explains a field it can't take in the reader's language", async () => {
    const { c, asker } = await setup();
    // A member's own language wins over the browser's.
    await c.deps.store.base.updateMember(asker.id, { language: "ar" });
    const r = await api<Json>(c, "POST", "/qa/questions", { token: asker.token, lang: "en", body: { ...QUESTION, title: "Short" } });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("invalid_request");
    expect(r.body.error.fields.title).toBe("اكتب عنوانًا من 10 إلى 200 حرف.");
    await c.deps.store.base.updateMember(asker.id, { language: "tr" });
    const tr = await api<Json>(c, "POST", "/qa/questions", { token: asker.token, body: { ...QUESTION, section: "nowhere" } });
    expect(tr.body.error.fields.section).toBe("Bir bölüm seçin.");
  });

  it("limits how often a member asks, and says when to try again", async () => {
    const { c, asker } = await setup();
    for (let i = 0; i < 10; i++) expect((await api(c, "POST", "/qa/questions", { token: asker.token, body: { ...QUESTION, title: `${QUESTION.title} (${i})` } })).status).toBe(201);
    const refused = await api<Json>(c, "POST", "/qa/questions", { token: asker.token, body: { ...QUESTION, title: `${QUESTION.title} (again)` } });
    expect(refused.status).toBe(429);
    expect(refused.body.error.code).toBe("too_many_attempts");
  });

  it("counts a reader's views once in a while, shows only tags in use, and keeps blocked and hidden posts out of replies and votes", async () => {
    const { c, asker, helper, team } = await setup();
    const omar = await joinWithEmail(c, "Omar Third");
    const q = await ask(c, asker.token, { ...QUESTION, tags: ["Gateways"] });
    for (let i = 0; i < 3; i++) await api(c, "GET", `/qa/questions/${q.id}`, { token: helper.token });
    await api(c, "GET", `/qa/questions/${q.id}`);
    expect((await api<Json>(c, "GET", `/qa/questions/${q.id}?view=0`)).body.view_count).toBe(2);
    expect((await api<Json>(c, "GET", "/qa/tags")).body.items.map((t: Json) => t.slug)).toContain("gateways");

    const a = (await api<Json>(c, "POST", `/qa/questions/${q.id}/answers`, { token: helper.token, body: { body: "Open Payments in the dashboard and add your keys." } })).body;
    // The asker blocked Omar: he can't reply under their question, even to someone else's answer.
    await api(c, "PUT", `/members/${omar.id}/block`, { token: asker.token });
    expect((await api(c, "POST", `/qa/answers/${a.id}/replies`, { token: omar.token, body: { body: "Me too!" } })).status).toBe(403);

    // The question removed: its answer takes no votes, and its tag isn't listed.
    expect((await api(c, "DELETE", `/qa/questions/${q.id}`, { token: team.token })).status).toBe(204);
    expect((await api(c, "PUT", `/qa/answers/${a.id}/vote`, { token: omar.token, body: { value: 1 } })).status).toBe(404);
    expect((await api<Json>(c, "GET", "/qa/tags")).body.items.map((t: Json) => t.slug)).not.toContain("gateways");
    expect((await api<Json>(c, "GET", "/search?q=gateways&type=tags")).body.tags).toEqual([]);
  });

  it("has a word in every language for every field the Q&A can refuse", async () => {
    const { allWords } = await import("@/lib/community/i18n");
    const fields = ["title", "body", "summary", "section", "tags", "value", "kind", "level", "language", "cover_url", "video_url", "duration_seconds"];
    for (const lang of ["en", "ar", "tr"] as const) for (const f of fields) expect(allWords()[lang][`qa.invalid.${f}`], `${lang} ${f}`).toBeTruthy();
  });

  it("hides a blocked member's questions and lets the asker or the team delete one", async () => {
    const { c, asker, helper, team } = await setup();
    const q = await ask(c, asker.token);
    expect((await api(c, "PUT", `/members/${asker.id}/block`, { token: helper.token })).status).toBeLessThan(300);
    expect((await api<Json>(c, "GET", "/qa/questions", { token: helper.token })).body.items).toHaveLength(0);
    expect((await api<Json>(c, "GET", "/qa/questions")).body.items).toHaveLength(1);
    expect((await api(c, "POST", `/qa/questions/${q.id}/answers`, { token: helper.token, body: { body: "Open Payments in the dashboard." } })).status).toBe(403);

    expect((await api(c, "DELETE", `/qa/questions/${q.id}`, { token: helper.token })).status).toBe(403);
    const q2 = await ask(c, asker.token, { ...QUESTION, title: "How do I add delivery zones to my restaurant app?", section: "restaurants" });
    expect((await api(c, "DELETE", `/qa/questions/${q2.id}`, { token: team.token })).status).toBe(204);
    expect((await api(c, "GET", `/qa/questions/${q2.id}`)).status).toBe(404);
    expect((await api(c, "DELETE", `/qa/questions/${q.id}`, { token: asker.token })).status).toBe(204);
    expect((await api<Json>(c, "GET", "/qa/questions")).body.items).toHaveLength(0);
  });

  it("answers reports with the content's author, and the home's panels", async () => {
    const { c, asker, helper } = await setup();
    const q = await ask(c, asker.token);
    const report = await api<Json>(c, "POST", "/reports", { token: helper.token, body: { target_type: "question", target_id: q.id, reason: "spam" } });
    expect([201, 204]).toContain(report.status);
    expect((await api<Json>(c, "POST", "/reports", { token: helper.token, body: { target_type: "question", target_id: "00000000-0000-4000-8000-000000000000", reason: "spam" } })).status).toBe(404);

    const home = await api<Json>(c, "GET", "/qa/home", { token: helper.token });
    expect(home.status).toBe(200);
    expect(home.body.waiting).toMatchObject({ total: 1, items: [{ id: q.id }] });
    expect(home.body.stats).toMatchObject({ questions: 1 });
    expect(Array.isArray(home.body.active_members)).toBe(true);
    expect(q.created_at).toBe(NOW.toISOString());
  });
});
