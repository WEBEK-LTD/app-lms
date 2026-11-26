import { beforeEach, describe, expect, it } from "vitest";
import type { QaStore } from "@/lib/community/qa";
import {
  QaError,
  acceptAnswer,
  activeMembers,
  answerQuestion,
  askQuestion,
  bookmark,
  contentInfo,
  deleteAnswer,
  deleteQuestion,
  deleteReply,
  editAnswer,
  editQuestion,
  followSection,
  getQuestion,
  getTutorial,
  listQuestions,
  listReplies,
  listSections,
  listTags,
  listTutorials,
  memberStats,
  publishTutorial,
  qaStats,
  replyToAnswer,
  saved,
  search,
  setContentStatus,
  setQaHooks,
  setQaStore,
  similarQuestions,
  vote,
  waitingForAnswer,
  type QaNoticeKind,
} from "@/lib/community/qa";
import { excerpt, links, rankOf, similarity, slugify, words } from "@/lib/community/qa/text";

/**
 * 231 Yallapp Community's Q&A and official tutorials (area B): asking with
 * the similar questions first, answering, official answers from Yallapp's
 * team, replies, votes and their points, accepting, editing and deleting
 * one's own, sections and tags, the filters and sorts, search, moderation's
 * statuses, blocks, saved posts, and the team's tutorials (articles and
 * videos by section, level and language).
 */

export function communityQaSuite(setup: () => Promise<QaStore>): void {
  const NOW = new Date("2026-11-24T10:00:00Z");
  const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
  const TEAM = "team-1";
  const people: Record<string, { name: string; team?: boolean }> = { karim: { name: "Karim Samy" }, nour: { name: "Nour El Hoda" }, omar: { name: "Omar Khaled" }, [TEAM]: { name: "Yallapp Team", team: true } };
  let notices: { to: string; kind: QaNoticeKind; actor: string | null; link: string; count?: number }[] = [];
  let blocks: Record<string, string[]> = {};
  let following: Record<string, string[]> = {};
  let pendingFor = new Set<string>();
  let moderated: { kind: string; contentId: string }[] = [];

  beforeEach(async () => {
    setQaStore(await setup());
    notices = [];
    blocks = {};
    following = {};
    pendingFor = new Set();
    moderated = [];
    setQaHooks(null);
    setQaHooks({
      async members(ids) {
        return Object.fromEntries(ids.filter((id) => people[id]).map((id) => [id, { id, username: id, displayName: people[id]!.name, avatarUrl: null, topBadge: null, team: people[id]!.team === true, deleted: false }]));
      },
      async hiddenFor(viewer) {
        return blocks[viewer] ?? [];
      },
      async followingIds(viewer) {
        return following[viewer] ?? [];
      },
      async searchMembers(q) {
        return Object.entries(people)
          .filter(([, p]) => p.name.toLowerCase().includes(q.toLowerCase()))
          .map(([id, p]) => ({ id, username: id, displayName: p.name, avatarUrl: null, topBadge: null, team: p.team === true, deleted: false }));
      },
      async moderate({ memberId, targetType, targetId }) {
        moderated.push({ kind: targetType === "comment" ? "reply" : targetType, contentId: targetId });
        return pendingFor.has(memberId) ? "pending" : "published";
      },
      async notify({ memberId, kind, actorId, link, data }) {
        notices.push({ to: memberId, kind, actor: actorId, link, ...(data.count !== undefined ? { count: data.count } : {}) });
      },
    });
  });

  const ask = (who: string, title: string, extra: Partial<{ section: string; body: string; tags: string[] }> = {}, at = NOW) =>
    askQuestion(who, { section: extra.section ?? "studio", title, body: extra.body ?? `${title} I tried a few things in Studio and nothing worked yet.`, tags: extra.tags ?? [], lang: "en" }, at);
  const answer = (who: string, questionId: string, body: string, at = NOW, official?: boolean) => answerQuestion(who, questionId, { body, lang: "en", official }, at);

  describe("231 the text helpers", () => {
    it("make addresses in each script, excerpts without Markdown, and search words without the small ones", () => {
      expect(slugify("How do I give each template its own product page?")).toBe("how-do-i-give-each-template-its-own-product-page");
      expect(slugify("كيف أربط بوابة الدفع بمتجري؟")).toBe("كيف-أربط-بوابة-الدفع-بمتجري");
      expect(slugify("Ürün sayfası nasıl?")).toBe("ürün-sayfası-nasıl");
      expect(slugify("???", "question")).toBe("question");
      expect(excerpt("**Bold** [link](https://x.test) and `code`", 100)).toBe("Bold link and code");
      expect(excerpt("word ".repeat(100), 30).endsWith("…")).toBe(true);
      expect(words("How do I connect THE payment gateway to my store?")).toEqual(["connect", "payment", "gateway", "store"]);
      // Arabic's joined "the" and "and" don't keep a word from being found.
      expect(words("المتجر والدفع")).toEqual(["متجر", "دفع"]);
      expect(links("see https://a.test/x and http://b.test")).toEqual(["https://a.test/x", "http://b.test"]);
      expect([rankOf(0), rankOf(25), rankOf(250), rankOf(1240), rankOf(1375), rankOf(5000)]).toEqual(["newcomer", "member", "contributor", "pro", "expert", "master"]);
      expect(similarity({ title: "Connect payment gateway store" }, { title: "How to connect a payment gateway to a store" })).toBeGreaterThan(0.5);
      expect(similarity({ title: "Connect payment gateway" }, { title: "Restaurant menu sections" })).toBe(0);
    });
  });

  describe("231 sections and tags", () => {
    it("start with the community's sections for questions and for tutorials, in three languages, followed and counted", async () => {
      const en = await listSections({ viewerId: null, lang: "en" });
      expect(en.map((s) => s.slug)).toEqual(["stores", "studio", "restaurants", "publishing", "payments", "courses", "design", "general"]);
      expect(en[0]).toEqual({ slug: "stores", name: "Stores", icon: "storefront", count: 0, comingSoon: false, followed: false });
      expect((await listSections({ viewerId: null, lang: "ar" })).find((s) => s.slug === "stores")!.name).toBe("المتاجر");
      expect((await listSections({ kind: "tutorial", viewerId: null, lang: "tr" })).find((s) => s.slug === "payments")!.name).toBe("Ödemeler");
      await followSection("karim", "stores", true, NOW);
      expect((await listSections({ viewerId: "karim", lang: "en" })).filter((s) => s.followed).map((s) => s.slug)).toEqual(["stores"]);
      await expect(followSection("karim", "nope", true)).rejects.toMatchObject({ code: "not_found" });
      await expect(followSection(null, "stores", true)).rejects.toMatchObject({ code: "invalid_token", status: 401 });
      await ask("karim", "How do I give each template its own product page?", { tags: ["Product page", "product page", "Templates"] });
      expect((await listSections({ viewerId: null, lang: "en" })).find((s) => s.slug === "studio")!.count).toBe(1);
      // A tag once, as first written; counted.
      expect(await listTags()).toEqual([
        { slug: "product-page", name: "Product page", count: 1 },
        { slug: "templates", name: "Templates", count: 1 },
      ]);
      expect((await listTags({ q: "prod" })).map((t) => t.slug)).toEqual(["product-page"]);
    });
  });

  describe("231 asking, editing and deleting", () => {
    it("checks the question, makes its address, and shows the similar ones before it is asked", async () => {
      await expect(ask("karim", "Too short")).rejects.toMatchObject({ code: "invalid_request", field: "title", status: 400 });
      await expect(askQuestion("karim", { section: "nowhere", title: "A long enough question title", body: "And a long enough body for it.", lang: "en" })).rejects.toMatchObject({ field: "section" });
      await expect(askQuestion(null, { section: "studio", title: "A long enough question title", body: "And a long enough body for it.", lang: "en" })).rejects.toBeInstanceOf(QaError);
      await expect(ask("karim", "Six tags is one too many here", { tags: ["a1", "b2", "c3", "d4", "e5", "f6"] })).rejects.toMatchObject({ field: "tags" });
      const question = await ask("karim", "How do I connect the payment gateway to my store?", { section: "payments", tags: ["Payments"] });
      expect(question).toMatchObject({
        slug: "how-do-i-connect-the-payment-gateway-to-my-store",
        section: { slug: "payments", name: "Payments" },
        tags: [{ slug: "payments", name: "Payments" }],
        author: { displayName: "Karim Samy", rank: "newcomer" },
        language: "en",
        status: "published",
        answerCount: 0,
        canEdit: true,
        canAccept: true,
        acceptedAnswerId: null,
      });
      expect(moderated).toEqual([{ kind: "question", contentId: question.id }]);
      // The same title again: its own address.
      expect((await ask("nour", "How do I connect the payment gateway to my store?")).slug).toBe("how-do-i-connect-the-payment-gateway-to-my-store-2");
      await ask("omar", "Best way to split a restaurant menu into sections?", { section: "restaurants" });
      const similar = await similarQuestions({ title: "Connecting a payment gateway to the store", viewerId: null, lang: "en" });
      expect(similar.map((q) => q.title)).toEqual(["How do I connect the payment gateway to my store?", "How do I connect the payment gateway to my store?"]);
      expect(await similarQuestions({ title: "the and of", viewerId: null, lang: "en" })).toEqual([]);
    });

    it("holds a new member's question for a moderator and shows it once approved; the team's skip the queue", async () => {
      pendingFor.add("omar");
      const question = await ask("omar", "Why was my app rejected by Apple for its icon?", { section: "publishing" });
      expect(question.status).toBe("pending");
      // Its author sees it; nobody else does, and it isn't listed.
      expect((await getQuestion(question.id, { viewerId: "omar", lang: "en" })).status).toBe("pending");
      await expect(getQuestion(question.id, { viewerId: "karim", lang: "en" })).rejects.toMatchObject({ code: "not_found" });
      expect((await listQuestions({ viewerId: null, lang: "en" })).items).toEqual([]);
      expect(await contentInfo("question", question.id)).toMatchObject({ memberId: "omar", title: "Why was my app rejected by Apple for its icon?", link: "/questions/why-was-my-app-rejected-by-apple-for-its-icon", status: "pending" });
      expect(await setContentStatus("question", question.id, "published")).toBe(true);
      expect((await listQuestions({ viewerId: null, lang: "en" })).items.map((q) => q.id)).toEqual([question.id]);
      // Rejected from the queue: removed.
      await setContentStatus("question", question.id, "hidden");
      await expect(getQuestion(question.id, { viewerId: null, lang: "en" })).rejects.toMatchObject({ code: "not_found" });
      expect(await setContentStatus("question", "missing", "published")).toBe(false);
      pendingFor.add(TEAM);
      expect((await ask(TEAM, "A question from the Yallapp team itself")).status).toBe("published");
    });

    it("holds an edit of a published question or answer that moderation holds, until it is approved again", async () => {
      const question = await ask("karim", "How do I show delivery fees at checkout?");
      const reply = await answer("nour", question.id, "Settings, then Delivery, then fees by zone.", later(5));
      await acceptAnswer("karim", reply.id, true, "en", later(6));
      expect((await memberStats("nour")).points).toBe(25);
      // Edited into what the spam filter holds.
      pendingFor.add("karim").add("nour");
      expect((await editQuestion("karim", question.id, { body: "Cheap followers here: https://spam.example/buy", lang: "en" }, later(7))).status).toBe("pending");
      expect((await listQuestions({ viewerId: null, lang: "en" })).items).toEqual([]);
      await setContentStatus("question", question.id, "published");
      const edited = await editAnswer("nour", reply.id, { body: "Visit https://spam.example/now for the answer.", lang: "en" }, later(8));
      expect(edited.status).toBe("pending");
      const shown = await getQuestion(question.id, { viewerId: null, lang: "en", countView: false });
      expect(shown).toMatchObject({ answerCount: 0, accepted: false, acceptedAnswerId: null, answers: [] });
      expect((await memberStats("nour")).points).toBe(0);
      // A change that leaves the words as they were isn't moderated again; the team's never are.
      pendingFor = new Set([TEAM]);
      const team = await answer(TEAM, question.id, "From the team: Settings, then Delivery.", later(9));
      expect((await editAnswer(TEAM, team.id, { body: "From the team: Settings, then Delivery, then Fees.", lang: "en" }, later(10))).status).toBe("published");
    });

    it("lets only the asker change or delete a question, and only an author their answer or reply", async () => {
      const q = await ask("karim", "How do I give each template its own product page?", { tags: ["Studio"] });
      await expect(editQuestion("nour", q.id, { title: "Somebody else's new title", lang: "en" })).rejects.toMatchObject({ code: "not_allowed", status: 403 });
      const edited = await editQuestion("karim", q.slug, { title: "How do I give every template its own product page?", tags: ["Product page"], section: "stores", lang: "en" }, later(5));
      expect(edited).toMatchObject({ title: "How do I give every template its own product page?", tags: [{ slug: "product-page" }], section: { slug: "stores" }, slug: q.slug });
      const a = await answer("nour", q.id, "Open Pages and pick Product.");
      await expect(editAnswer("karim", a.id, { body: "Not mine to change", lang: "en" })).rejects.toMatchObject({ code: "not_allowed" });
      expect((await editAnswer("nour", a.id, { body: "Open Pages → Product and pick “From template”.", lang: "en" }, later(6))).body).toBe("Open Pages → Product and pick “From template”.");
      const r = await replyToAnswer("karim", a.id, { body: "Thanks!", lang: "en" });
      await expect(deleteReply("nour", r.id)).rejects.toMatchObject({ code: "not_allowed" });
      await deleteReply("karim", r.id);
      expect((await getQuestion(q.id, { viewerId: null, lang: "en" })).answers[0]).toMatchObject({ replyCount: 0, replies: [] });
      await deleteAnswer("nour", a.id);
      expect((await getQuestion(q.id, { viewerId: null, lang: "en" })).answerCount).toBe(0);
      await expect(deleteQuestion("nour", q.id)).rejects.toMatchObject({ code: "not_allowed" });
      await deleteQuestion("karim", q.id);
      await expect(getQuestion(q.id, { viewerId: "karim", lang: "en" })).rejects.toMatchObject({ code: "not_found" });
    });
  });

  describe("231 answering, official answers, replies, votes and accepting", () => {
    it("orders answers accepted, official, then by votes; tells the asker; gives the points", async () => {
      const question = await ask("karim", "How do I give each template its own product page?");
      const nour = await answer("nour", question.id, "Keep product photos at 3:4 so the gallery fills the screen.", later(10));
      const team = await answer(TEAM, question.id, "In Studio open Pages → Product and pick “From template”.", later(20));
      const omar = await answer("omar", question.id, "I rebuilt mine by hand.", later(30));
      expect(team).toMatchObject({ official: true, author: { displayName: "Yallapp Team", team: true } });
      expect(nour.official).toBe(false);
      // Only the team answers officially; the team may answer as themselves.
      await expect(answer("omar", question.id, "Official, I promise.", later(31), true)).rejects.toMatchObject({ code: "not_allowed", field: "official" });
      const personal = await answer(TEAM, question.id, "And from me personally: try it on a test app first.", later(32), false);
      expect(personal.official).toBe(false);
      expect(notices.map((n) => [n.to, n.kind, n.link])).toEqual([
        ["karim", "answer", `/questions/${question.slug}#a${nour.id}`],
        ["karim", "official_answer", `/questions/${question.slug}#a${team.id}`],
        ["karim", "answer", `/questions/${question.slug}#a${omar.id}`],
        ["karim", "answer", `/questions/${question.slug}#a${personal.id}`],
      ]);
      expect((await getQuestion(question.id, { viewerId: null, lang: "en" })).hasOfficialAnswer).toBe(true);
      // Votes: never one's own; changed and taken back; the author's points follow.
      notices = [];
      await expect(vote("nour", { kind: "answer", id: nour.id, value: 1 })).rejects.toMatchObject({ code: "not_allowed" });
      expect(await vote("karim", { kind: "answer", id: omar.id, value: 1 })).toEqual({ score: 1, myVote: 1 });
      expect(await vote("nour", { kind: "answer", id: omar.id, value: 1 })).toEqual({ score: 2, myVote: 1 });
      expect(await vote("karim", { kind: "answer", id: omar.id, value: -1 })).toEqual({ score: 0, myVote: -1 });
      expect(await vote("karim", { kind: "answer", id: omar.id, value: 0 })).toEqual({ score: 1, myVote: 0 });
      expect((await memberStats("omar")).points).toBe(5);
      // Told at the first upvote, not each time.
      expect(notices.map((n) => [n.to, n.kind, n.count])).toEqual([["omar", "vote_milestone", 1]]);
      let detail = await getQuestion(question.id, { viewerId: "karim", lang: "en" });
      expect(detail.answers.map((a) => a.id)).toEqual([team.id, omar.id, nour.id, personal.id]);
      // Only the asker accepts; the answerer earns 25 and is told.
      await expect(acceptAnswer("nour", nour.id, true, "en")).rejects.toMatchObject({ code: "not_allowed" });
      detail = await acceptAnswer("karim", nour.id, true, "en", later(40));
      expect(notices.at(-1)).toMatchObject({ to: "nour", kind: "answer_accepted", actor: "karim", count: 25 });
      expect(detail.answers.map((a) => [a.id, a.accepted])).toEqual([
        [nour.id, true],
        [team.id, false],
        [omar.id, false],
        [personal.id, false],
      ]);
      expect(detail).toMatchObject({ accepted: true, acceptedAnswerId: nour.id });
      expect((await memberStats("nour"))).toMatchObject({ acceptedAnswers: 1, points: 25 });
      // Another answer accepted instead: the points move.
      await acceptAnswer("karim", omar.id, true, "en", later(50));
      expect((await memberStats("nour")).points).toBe(0);
      expect((await memberStats("omar")).points).toBe(30);
      expect((await memberStats("karim")).points).toBe(2);
      expect((await acceptAnswer("karim", omar.id, false, "en")).accepted).toBe(false);
      // Replies under an answer; its author told; the newest three come with the question, all of them a page at a time.
      for (let i = 1; i <= 4; i++) await replyToAnswer(i % 2 ? "karim" : "nour", team.id, { body: `Reply ${i}`, lang: "en" }, later(60 + i));
      expect(notices.filter((n) => n.kind === "reply").map((n) => n.to)).toEqual([TEAM, TEAM, TEAM, TEAM]);
      detail = await getQuestion(question.id, { viewerId: "karim", lang: "en" });
      expect(detail.answers.find((a) => a.id === team.id)).toMatchObject({ replyCount: 4, replies: [{ body: "Reply 2" }, { body: "Reply 3", canEdit: true }, { body: "Reply 4", canEdit: false }] });
      const firstPage = await listReplies(team.id, { viewerId: null, limit: 3 });
      expect(firstPage.items.map((r) => r.body)).toEqual(["Reply 1", "Reply 2", "Reply 3"]);
      expect((await listReplies(team.id, { viewerId: null, limit: 3, cursor: firstPage.nextCursor })).items.map((r) => r.body)).toEqual(["Reply 4"]);
      // A moderator hides an answer: it's no longer counted or shown.
      await setContentStatus("answer", omar.id, "hidden");
      detail = await getQuestion(question.id, { viewerId: null, lang: "en" });
      expect(detail.answers.map((a) => a.id)).toEqual([team.id, nour.id, personal.id]);
      expect(detail.answerCount).toBe(3);
    });

    it("counts the same vote sent many times at once only once, and its points once", async () => {
      const question = await ask("karim", "How do I stop a double tap voting twice?");
      const reply = await answer("nour", question.id, "The server counts one vote per member, whatever arrives.", later(5));
      const results = await Promise.all(Array.from({ length: 10 }, () => vote("karim", { kind: "answer", id: reply.id, value: 1 })));
      expect(results.every((r) => r.myVote === 1)).toBe(true);
      expect((await getQuestion(question.id, { viewerId: null, lang: "en", countView: false })).answers[0]!.score).toBe(1);
      expect((await memberStats("nour")).points).toBe(5);
      // And taken back once, however many times.
      await Promise.all(Array.from({ length: 5 }, () => vote("karim", { kind: "answer", id: reply.id, value: 0 })));
      expect((await getQuestion(question.id, { viewerId: null, lang: "en", countView: false })).answers[0]!.score).toBe(0);
      expect((await memberStats("nour")).points).toBe(0);
    });

    it("holds a new member's answer for a moderator, tells the asker once it is approved, and counts views", async () => {
      const question = await ask("karim", "How do I give each template its own product page?");
      pendingFor.add("omar");
      const held = await answer("omar", question.id, "Pick From template in Pages.");
      expect(held.status).toBe("pending");
      expect(notices).toEqual([]);
      expect((await getQuestion(question.id, { viewerId: "karim", lang: "en" })).answers).toEqual([]);
      await setContentStatus("answer", held.id, "published");
      expect(notices).toMatchObject([{ to: "karim", kind: "answer" }]);
      expect((await getQuestion(question.id, { viewerId: null, lang: "en" })).answerCount).toBe(1);
      await getQuestion(question.slug, { viewerId: null, lang: "en", countView: true });
      await getQuestion(question.slug, { viewerId: null, lang: "en", countView: true });
      await vote("nour", { kind: "question", id: question.id, value: 1 });
      expect(await getQuestion(question.id, { viewerId: "nour", lang: "en" })).toMatchObject({ viewCount: 2, score: 1, myVote: 1, canEdit: false, canAccept: false });
      expect((await memberStats("karim")).points).toBe(2);
    });
  });

  describe("231 the filters and sorts, search and the side rail", () => {
    it("lists by filter (For you, unanswered, answered, official, following) and sort, by section, tag, author and language, a page at a time", async () => {
      await followSection("nour", "stores", true);
      following.nour = ["omar"];
      const a = await ask("karim", "Can I link a Shopify store with the app?", { section: "stores", tags: ["Shopify"] }, later(1));
      const b = await ask("omar", "My app was rejected by Apple for its icon", { section: "publishing" }, later(2));
      const c = await ask("karim", "Best way to split the restaurant menu?", { section: "restaurants" }, later(3));
      const answered = await answer("nour", b.id, "Use a square icon without transparency.", later(4));
      await answer(TEAM, c.id, "Group dishes by meal, then by kind.", later(5));
      await acceptAnswer("omar", answered.id, true, "en", later(6));
      await vote("nour", { kind: "question", id: a.id, value: 1 });
      const ids = async (more: object, viewerId: string | null = null) => (await listQuestions({ viewerId, lang: "en", ...more })).items.map((q) => q.id);
      expect(await ids({ sort: "newest" })).toEqual([c.id, b.id, a.id]);
      expect(await ids({ sort: "active" })).toEqual([b.id, c.id, a.id]);
      expect(await ids({ sort: "votes" })).toEqual([a.id, c.id, b.id]);
      expect(await ids({ filter: "unanswered" })).toEqual([a.id]);
      expect(await ids({ filter: "answered" })).toEqual([b.id]);
      expect(await ids({ filter: "official" })).toEqual([c.id]);
      expect(await ids({ filter: "following" }, "nour")).toEqual([b.id]);
      expect(await ids({ filter: "following" })).toEqual([]);
      // For you: the member's sections first.
      expect(await ids({ filter: "for_you" }, "nour")).toEqual([a.id, b.id, c.id]);
      expect(await ids({ section: "stores" })).toEqual([a.id]);
      expect(await ids({ tag: "Shopify" })).toEqual([a.id]);
      expect(await ids({ author: "omar" })).toEqual([b.id]);
      // A profile's Answers: the questions the member has a published answer on.
      expect(await ids({ answeredBy: "nour", sort: "newest" })).toEqual([b.id]);
      expect(await ids({ answeredBy: TEAM, sort: "newest" })).toEqual([c.id]);
      expect(await ids({ answeredBy: "karim" })).toEqual([]);
      expect(await ids({ language: "ar" })).toEqual([]);
      const first = await listQuestions({ viewerId: null, lang: "en", sort: "newest", limit: 2 });
      expect(first.items).toHaveLength(2);
      expect(await listQuestions({ viewerId: null, lang: "en", sort: "newest", limit: 2, cursor: first.nextCursor })).toMatchObject({ items: [{ id: a.id }], nextCursor: null });
      // Blocked members' questions aren't shown, nor can they be opened, answered or voted on.
      blocks.nour = ["karim"];
      expect(await ids({ sort: "newest" }, "nour")).toEqual([b.id]);
      await expect(getQuestion(a.id, { viewerId: "nour", lang: "en" })).rejects.toMatchObject({ code: "not_found" });
      await expect(answer("nour", a.id, "Hello there")).rejects.toMatchObject({ code: "not_allowed" });
    });

    it("searches questions, tutorials, members and tags, and fills the home page and the side rail", async () => {
      await followSection("nour", "stores", true);
      const q1 = await ask("karim", "Can I link a Shopify store with the app?", { section: "stores", tags: ["Shopify"] }, later(1));
      await ask("omar", "Why do my store's payments fail with iyzico?", { section: "payments" }, later(2));
      await ask("nour", "Which template suits a bakery store?", { section: "stores" }, later(3));
      await publishTutorial(TEAM, { title: "Connect Shopify to your app", summary: "Bring your Shopify products into the app.", kind: "article", section: "stores", level: "beginner", language: "en", body: "Open Integrations and choose Shopify. ".repeat(20) }, later(5));
      const found = await search({ q: "shopify store", viewerId: null, lang: "en" });
      expect(found.questions.map((q) => q.id)).toEqual([q1.id]);
      // No tutorial has both words: the one with one of them.
      expect(found.tutorials.map((t) => t.title)).toEqual(["Connect Shopify to your app"]);
      expect((await search({ q: "Karim", viewerId: null, lang: "en", type: "members" })).members.map((m) => m.displayName)).toEqual(["Karim Samy"]);
      expect((await search({ q: "shop", viewerId: null, lang: "en", type: "tags" })).tags.map((t) => t.slug)).toEqual(["shopify"]);
      expect(await search({ q: "x", viewerId: null, lang: "en" })).toEqual({ questions: [], tutorials: [], members: [], tags: [] });
      expect((await search({ q: "shopify", viewerId: null, lang: "en", type: "tutorials" })).questions).toEqual([]);
      // Waiting for an answer: unanswered in the member's sections, never their own.
      expect(await waitingForAnswer({ viewerId: "nour", lang: "en", limit: 3 })).toMatchObject({ total: 1, inMySections: true, items: [{ id: q1.id }] });
      expect((await waitingForAnswer({ viewerId: null, lang: "en" })).total).toBe(3);
      const a = await answer("nour", q1.id, "Yes, from Integrations.", later(6));
      expect(await qaStats({ since: later(2) })).toEqual({ questions: 3, answeredRate: 33, newCount: 2 });
      await acceptAnswer("karim", a.id, true, "en", later(7));
      const active = await activeMembers({ days: 7, now: later(10) });
      expect(active.map((m) => [m.member.displayName, m.points, m.acceptedAnswers])).toEqual([
        ["Yallapp Team", 50, 0],
        ["Nour El Hoda", 25, 1],
        ["Karim Samy", 2, 0],
      ]);
    });
  });

  describe("231 saved posts", () => {
    it("saves questions and tutorials, the last saved first, and takes them out", async () => {
      const q = await ask("karim", "Can I link a Shopify store with the app?", { section: "stores" });
      const t = await publishTutorial(TEAM, { title: "Publish your app to Google Play", summary: "From the build to the review.", kind: "video", section: "publishing", level: "intermediate", language: "ar", body: "", videoUrl: "https://www.youtube.com/watch?v=abc", durationSeconds: 504 }, NOW);
      await bookmark("nour", { kind: "question", id: q.id, on: true }, later(1));
      await bookmark("nour", { kind: "tutorial", id: t.slug, on: true }, later(2));
      expect(await saved("nour", "en")).toMatchObject({ questions: [{ id: q.id, bookmarked: true }], tutorials: [{ id: t.id, bookmarked: true }] });
      expect((await getQuestion(q.id, { viewerId: "nour", lang: "en" })).bookmarked).toBe(true);
      await bookmark("nour", { kind: "question", id: q.id, on: false });
      expect((await saved("nour", "en")).questions).toEqual([]);
      await expect(bookmark("nour", { kind: "question", id: "missing", on: true })).rejects.toMatchObject({ code: "not_found" });
    });
  });

  describe("231 official tutorials", () => {
    it("are the team's: articles with their reading time, videos with their length, by section, level, language and kind, never locked or priced", async () => {
      await expect(publishTutorial("karim", { title: "My own tutorial title", summary: "Something here", kind: "article", section: "studio", level: "beginner", language: "en", body: "x".repeat(40) })).rejects.toMatchObject({ code: "not_allowed" });
      await expect(publishTutorial(TEAM, { title: "A video without its address", summary: "A summary here.", kind: "video", section: "studio", level: "beginner", language: "en", body: "", videoUrl: "https://evil.example/v", durationSeconds: 60 })).rejects.toMatchObject({ field: "videoUrl" });
      const article = await publishTutorial(TEAM, { title: "A different product page per template", summary: "Each template its own product page.", kind: "article", section: "studio", level: "beginner", language: "en", body: "word ".repeat(1000), tags: ["Studio", "Product page"] }, later(1));
      const video = await publishTutorial(TEAM, { title: "صفحة منتج مختلفة لكل تمبلت", summary: "في ثماني دقائق.", kind: "video", section: "studio", level: "intermediate", language: "ar", body: "", videoUrl: "https://youtu.be/xyz", durationSeconds: 504 }, later(2));
      expect(article).toMatchObject({ kind: "article", durationSeconds: 300, durationMinutes: 5, official: true, tags: ["studio", "product-page"], author: { displayName: "Yallapp Team" }, section: { slug: "studio" } });
      expect(video).toMatchObject({ kind: "video", durationSeconds: 504, durationMinutes: 9, videoUrl: "https://youtu.be/xyz", slug: "صفحة-منتج-مختلفة-لكل-تمبلت", language: "ar" });
      // Never a price on a tutorial.
      expect(JSON.stringify(video)).not.toMatch(/price|checkout|payment|currency/i);
      const titles = async (f: object) => (await listTutorials({ viewerId: null, lang: "en", ...f })).items.map((t) => t.title);
      expect(await titles({ author: TEAM })).toHaveLength(2);
      expect(await titles({ author: "karim" })).toEqual([]);
      expect(await titles({})).toEqual([video.title, article.title]);
      expect(await titles({ level: "beginner" })).toEqual([article.title]);
      expect(await titles({ language: "ar" })).toEqual([video.title]);
      expect(await titles({ kind: "video" })).toEqual([video.title]);
      expect(await titles({ section: "stores" })).toEqual([]);
      expect((await listSections({ kind: "tutorial", viewerId: null, lang: "en" })).find((s) => s.slug === "studio")!.count).toBe(2);
      expect((await getTutorial(video.slug, { viewerId: null, lang: "en", countView: true })).viewCount).toBe(1);
      expect((await memberStats(TEAM)).approvedTutorials).toBe(2);
      // A tutorial taken down is gone, its points with it.
      await setContentStatus("tutorial", article.id, "hidden");
      await expect(getTutorial(article.id, { viewerId: null, lang: "en" })).rejects.toMatchObject({ code: "not_found" });
      expect((await memberStats(TEAM)).points).toBe(50);
    });
  });
}
