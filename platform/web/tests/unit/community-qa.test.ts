import { beforeEach, describe, expect, it } from "vitest";
import {
  QaError,
  acceptAnswer,
  activeMembers,
  answerQuestion,
  askQuestion,
  bookmark,
  followSection,
  getQuestion,
  getTutorial,
  listQuestions,
  listSections,
  listTags,
  listTutorials,
  memberStats,
  publishTutorial,
  qaStats,
  qaStore,
  replyToAnswer,
  saved,
  search,
  setContentStatus,
  setQaHooks,
  setQaStore,
  similarQuestions,
  vote,
  waitingForAnswer,
} from "@/lib/community/qa";
import { excerpt, links, rankOf, similarity, slugify, words } from "@/lib/community/qa/text";

/**
 * 231 Yallapp Community's Q&A and official tutorials (area B): asking with
 * the similar questions first, answering, official answers from the
 * Yallapp team, votes and their points, accepting, replies, sections and
 * tags, the tabs, search, moderation's statuses, blocks, and the team's
 * tutorials (articles and videos by section, level and language).
 */

const NOW = new Date("2026-11-24T10:00:00Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
const STAFF = "staff-1";
const people: Record<string, { name: string; staff?: boolean }> = { karim: { name: "Karim Samy" }, nour: { name: "Nour El Hoda" }, omar: { name: "Omar Khaled" }, [STAFF]: { name: "Yallapp Team", staff: true } };
let notices: { to: string; event: string; data: Record<string, string> }[] = [];
let blocks: Record<string, string[]> = {};
let pendingFor = new Set<string>();

beforeEach(() => {
  setQaStore(null);
  notices = [];
  blocks = {};
  pendingFor = new Set();
  setQaHooks(null);
  setQaHooks({
    async members(ids) {
      return Object.fromEntries(ids.filter((id) => people[id]).map((id) => [id, { id, name: people[id]!.name, handle: id, avatarUrl: null, badge: null, staff: people[id]!.staff === true }]));
    },
    async hiddenFor(viewer) {
      return blocks[viewer] ?? [];
    },
    async moderate({ memberId, links: found }) {
      if (found.some((l) => l.includes("spam.example"))) return "rejected";
      return pendingFor.has(memberId) ? "pending" : "published";
    },
    async notify(to, event, data) {
      notices.push({ to, event, data });
    },
  });
});

const ask = (who: string, title: string, extra: Partial<{ section: string; body: string; tags: string[] }> = {}, at = NOW) =>
  askQuestion(who, { section: extra.section ?? "studio", title, body: extra.body ?? `${title} I tried a few things in Studio and nothing worked yet.`, tags: extra.tags ?? [], lang: "en" }, at);

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
    expect([rankOf(0), rankOf(25), rankOf(250), rankOf(1240), rankOf(5000)]).toEqual(["newcomer", "member", "contributor", "expert", "pro"]);
    expect(similarity({ title: "Connect payment gateway store" }, { title: "How to connect a payment gateway to a store" })).toBeGreaterThan(0.5);
    expect(similarity({ title: "Connect payment gateway" }, { title: "Restaurant menu sections" })).toBe(0);
  });
});

describe("231 sections and tags", () => {
  it("start with the community's sections in three languages, each followed or not, counted", async () => {
    const en = await listSections(null, "en");
    expect(en.map((s) => s.slug)).toEqual(["stores", "studio", "restaurants", "publishing", "payments", "courses", "design", "general"]);
    expect((await listSections(null, "ar")).find((s) => s.slug === "stores")!.name).toBe("المتاجر");
    expect((await listSections(null, "tr")).find((s) => s.slug === "payments")!.name).toBe("Ödemeler");
    await followSection("karim", "stores", true, NOW);
    expect((await listSections("karim", "en")).filter((s) => s.followed).map((s) => s.slug)).toEqual(["stores"]);
    await expect(followSection("karim", "nope", true)).rejects.toMatchObject({ code: "not_found" });
    await expect(followSection(null, "stores", true)).rejects.toMatchObject({ code: "signed_out" });
    await ask("karim", "How do I give each template its own product page?", { tags: ["Product page", "product page", "Templates"] });
    expect((await listSections(null, "en")).find((s) => s.slug === "studio")!.questionCount).toBe(1);
    // A tag once, by its address; counted.
    expect(await listTags()).toEqual([
      { slug: "product-page", name: "Product page", questionCount: 1 },
      { slug: "templates", name: "Templates", questionCount: 1 },
    ]);
    expect((await listTags({ q: "prod" })).map((t) => t.slug)).toEqual(["product-page"]);
  });
});

describe("231 asking", () => {
  it("checks the question, makes its address, and shows the similar ones before it is asked", async () => {
    await expect(ask("karim", "Too short")).rejects.toMatchObject({ code: "invalid", field: "title" });
    await expect(askQuestion("karim", { section: "nowhere", title: "A long enough question title", body: "And a long enough body for it.", lang: "en" })).rejects.toMatchObject({ field: "section" });
    await expect(askQuestion(null, { section: "studio", title: "A long enough question title", body: "And a long enough body for it.", lang: "en" })).rejects.toBeInstanceOf(QaError);
    await expect(ask("karim", "Six tags is one too many here", { tags: ["a1", "b2", "c3", "d4", "e5", "f6"] })).rejects.toMatchObject({ field: "tags" });
    const { question, status } = await ask("karim", "How do I connect the payment gateway to my store?", { section: "payments", tags: ["Payments"] });
    expect(status).toBe("published");
    expect(question).toMatchObject({ slug: "how-do-i-connect-the-payment-gateway-to-my-store", section: { slug: "payments", name: "Payments" }, author: { name: "Karim Samy", rank: "newcomer" }, answerCount: 0, mine: true });
    // The same title again: its own address.
    expect((await ask("nour", "How do I connect the payment gateway to my store?")).question.slug).toBe("how-do-i-connect-the-payment-gateway-to-my-store-2");
    await ask("omar", "Best way to split a restaurant menu into sections?", { section: "restaurants" });
    const similar = await similarQuestions({ title: "Connecting a payment gateway to the store", viewerId: null, lang: "en" });
    expect(similar.map((q) => q.title)).toEqual(["How do I connect the payment gateway to my store?", "How do I connect the payment gateway to my store?"]);
    expect(await similarQuestions({ title: "the and of", viewerId: null, lang: "en" })).toEqual([]);
  });

  it("holds a new member's question for a moderator, refuses spam links, and shows it once approved", async () => {
    pendingFor.add("omar");
    const { question, status } = await ask("omar", "Why was my app rejected by Apple for its icon?", { section: "publishing" });
    expect(status).toBe("pending");
    // Its author sees it; nobody else does, and it isn't listed.
    expect((await getQuestion(question.id, { viewerId: "omar", lang: "en" })).status).toBe("pending");
    await expect(getQuestion(question.id, { viewerId: "karim", lang: "en" })).rejects.toMatchObject({ code: "not_found" });
    expect((await listQuestions({ viewerId: null, lang: "en" })).items).toEqual([]);
    expect(await setContentStatus("question", question.id, "published")).toBe(true);
    expect((await listQuestions({ viewerId: null, lang: "en" })).items.map((q) => q.id)).toEqual([question.id]);
    await expect(ask("karim", "Where do I buy cheap followers for my app?", { body: "Look here https://spam.example/buy now please" })).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("231 answering, official answers, replies, votes and accepting", () => {
  it("orders answers accepted, official, then by votes; tells the asker; gives the points", async () => {
    const { question } = await ask("karim", "How do I give each template its own product page?");
    const nour = await answerQuestion("nour", question.id, { body: "Keep product photos at 3:4 so the gallery fills the screen.", lang: "en" }, later(10));
    const team = await answerQuestion(STAFF, question.id, { body: "In Studio open Pages → Product and pick “From template”.", lang: "en" }, later(20));
    const omar = await answerQuestion("omar", question.id, { body: "I rebuilt mine by hand.", lang: "en" }, later(30));
    expect(team).toMatchObject({ official: true, author: { name: "Yallapp Team", staff: true } });
    expect(nour.official).toBe(false);
    expect(notices.map((n) => [n.to, n.event])).toEqual([
      ["karim", "answer_posted"],
      ["karim", "official_answer"],
      ["karim", "answer_posted"],
    ]);
    // Votes: never one's own; changed and taken back; the author's points follow.
    await expect(vote("nour", { kind: "answer", id: nour.id, value: 1 })).rejects.toMatchObject({ code: "forbidden" });
    expect(await vote("karim", { kind: "answer", id: omar.id, value: 1 })).toEqual({ score: 1, myVote: 1 });
    expect(await vote("nour", { kind: "answer", id: omar.id, value: 1 })).toEqual({ score: 2, myVote: 1 });
    expect(await vote("karim", { kind: "answer", id: omar.id, value: -1 })).toEqual({ score: 0, myVote: -1 });
    expect(await vote("karim", { kind: "answer", id: omar.id, value: 0 })).toEqual({ score: 1, myVote: 0 });
    expect((await memberStats("omar")).points).toBe(5);
    let detail = await getQuestion(question.id, { viewerId: "karim", lang: "en" });
    expect(detail.answers.map((a) => a.id)).toEqual([team.id, omar.id, nour.id]);
    // Only the asker accepts; the answerer earns 25 and is told.
    await expect(acceptAnswer("nour", nour.id, true)).rejects.toMatchObject({ code: "forbidden" });
    expect(await acceptAnswer("karim", nour.id, true, later(40))).toEqual({ acceptedAnswerId: nour.id });
    expect(notices.at(-1)).toMatchObject({ to: "nour", event: "answer_accepted", data: { points: "25" } });
    detail = await getQuestion(question.id, { viewerId: "karim", lang: "en" });
    expect(detail.answers.map((a) => [a.id, a.accepted])).toEqual([
      [nour.id, true],
      [team.id, false],
      [omar.id, false],
    ]);
    expect(detail.hasAccepted).toBe(true);
    expect((await memberStats("nour")).acceptedAnswers).toBe(1);
    expect((await memberStats("nour")).points).toBe(25);
    // Another answer accepted instead: the points move.
    await acceptAnswer("karim", omar.id, true, later(50));
    expect((await memberStats("nour")).points).toBe(0);
    expect((await memberStats("omar")).points).toBe(30);
    await acceptAnswer("karim", omar.id, false);
    expect((await getQuestion(question.id, { viewerId: null, lang: "en" })).hasAccepted).toBe(false);
    // Replies under an answer; its author told.
    const reply = await replyToAnswer("karim", team.id, { body: "Thanks, that worked!", lang: "en" }, later(60));
    expect(reply.author.name).toBe("Karim Samy");
    expect(notices.at(-1)).toMatchObject({ to: STAFF, event: "reply_posted" });
    detail = await getQuestion(question.id, { viewerId: null, lang: "en" });
    expect(detail.answers.find((a) => a.id === team.id)).toMatchObject({ replyCount: 1, replies: [{ body: "Thanks, that worked!" }] });
    expect(detail.answerCount).toBe(3);
    // A moderator hides an answer: it's no longer counted or shown.
    await setContentStatus("answer", omar.id, "hidden");
    detail = await getQuestion(question.id, { viewerId: null, lang: "en" });
    expect(detail.answers.map((a) => a.id)).toEqual([team.id, nour.id]);
    expect(detail.answerCount).toBe(2);
  });

  it("counts a view each time the question is opened, and keeps the viewer's vote on the question", async () => {
    const { question } = await ask("karim", "How do I give each template its own product page?");
    await getQuestion(question.slug, { viewerId: null, lang: "en", countView: true });
    await getQuestion(question.slug, { viewerId: null, lang: "en", countView: true });
    await vote("nour", { kind: "question", id: question.id, value: 1 });
    const q = await getQuestion(question.id, { viewerId: "nour", lang: "en" });
    expect(q).toMatchObject({ views: 2, score: 1, myVote: 1, mine: false });
    expect((await memberStats("karim")).points).toBe(2);
  });
});

describe("231 the tabs, search and the side rail", () => {
  it("lists Latest, Most active, Unanswered and For you, by section and tag, a page at a time", async () => {
    await followSection("nour", "stores", true);
    const a = (await ask("karim", "Can I link a Shopify store with the app?", { section: "stores", tags: ["Shopify"] }, later(1))).question;
    const b = (await ask("omar", "My app was rejected by Apple for its icon", { section: "publishing" }, later(2))).question;
    const c = (await ask("karim", "Best way to split the restaurant menu?", { section: "restaurants" }, later(3))).question;
    await answerQuestion("nour", b.id, { body: "Use a square icon without transparency.", lang: "en" }, later(4));
    const ids = async (tab: "latest" | "active" | "unanswered" | "for_you", viewerId: string | null = null, more = {}) => (await listQuestions({ viewerId, lang: "en", tab, ...more })).items.map((q) => q.id);
    expect(await ids("latest")).toEqual([c.id, b.id, a.id]);
    expect(await ids("active")).toEqual([b.id, c.id, a.id]);
    expect(await ids("unanswered")).toEqual([c.id, a.id]);
    // For you: the member's sections first.
    expect(await ids("for_you", "nour")).toEqual([a.id, b.id, c.id]);
    expect(await ids("latest", null, { section: "stores" })).toEqual([a.id]);
    expect(await ids("latest", null, { tag: "shopify" })).toEqual([a.id]);
    const first = await listQuestions({ viewerId: null, lang: "en", tab: "latest", limit: 2 });
    expect(first.items).toHaveLength(2);
    const second = await listQuestions({ viewerId: null, lang: "en", tab: "latest", limit: 2, cursor: first.next });
    expect(second).toMatchObject({ items: [{ id: a.id }], next: null });
    // Blocked members' questions aren't shown, nor can they be opened.
    blocks.nour = ["karim"];
    expect(await ids("latest", "nour")).toEqual([b.id]);
    await expect(getQuestion(a.id, { viewerId: "nour", lang: "en" })).rejects.toMatchObject({ code: "not_found" });
  });

  it("searches questions and tutorials, and fills the home page and the side rail", async () => {
    await followSection("nour", "stores", true);
    const q1 = (await ask("karim", "Can I link a Shopify store with the app?", { section: "stores" }, later(1))).question;
    await ask("omar", "Why do my store's payments fail with iyzico?", { section: "payments" }, later(2));
    await ask("nour", "Which template suits a bakery store?", { section: "stores" }, later(3));
    await publishTutorial(STAFF, { title: "Connect Shopify to your app", summary: "Bring your Shopify products into the app.", kind: "article", section: "stores", level: "beginner", language: "en", body: "Open Integrations and choose Shopify. ".repeat(20) }, later(5));
    const found = await search({ q: "shopify store", viewerId: null, lang: "en" });
    expect(found.questions.map((q) => q.id)).toEqual([q1.id]);
    expect(found.tutorials.map((t) => t.title)).toEqual(["Connect Shopify to your app"]);
    expect(await search({ q: "x", viewerId: null, lang: "en" })).toEqual({ questions: [], tutorials: [] });
    expect((await search({ q: "shopify", viewerId: null, lang: "en", kinds: ["tutorial"] })).questions).toEqual([]);
    // Waiting for an answer: unanswered in the member's sections, never their own.
    const waiting = await waitingForAnswer({ viewerId: "nour", lang: "en", limit: 3 });
    expect(waiting).toMatchObject({ total: 1, inMySections: 1, items: [{ id: q1.id }] });
    expect((await waitingForAnswer({ viewerId: null, lang: "en" })).total).toBe(3);
    await answerQuestion("nour", q1.id, { body: "Yes, from Integrations.", lang: "en" }, later(6));
    expect(await qaStats({ since: later(2) })).toEqual({ questions: 3, answeredRate: 33, newCount: 2 });
    await acceptAnswer("karim", (await getQuestion(q1.id, { viewerId: null, lang: "en" })).answers[0]!.id, true, later(7));
    const active = await activeMembers({ days: 7, now: later(10) });
    expect(active.map((m) => [m.member.name, m.points, m.acceptedAnswers])).toEqual([
      ["Yallapp Team", 50, 0],
      ["Nour El Hoda", 25, 1],
      ["Karim Samy", 2, 0],
    ]);
  });
});

describe("231 bookmarks", () => {
  it("saves questions and tutorials, the last saved first, and takes them out", async () => {
    const q = (await ask("karim", "Can I link a Shopify store with the app?", { section: "stores" })).question;
    const t = await publishTutorial(STAFF, { title: "Publish your app to Google Play", summary: "From the build to the review.", kind: "video", section: "publishing", level: "intermediate", language: "ar", body: "", videoUrl: "https://www.youtube.com/watch?v=abc", durationSec: 504 }, NOW);
    await bookmark("nour", { kind: "question", id: q.id, on: true }, later(1));
    await bookmark("nour", { kind: "tutorial", id: t.slug, on: true }, later(2));
    expect(await saved("nour", "en")).toMatchObject({ questions: [{ id: q.id, bookmarked: true }], tutorials: [{ id: t.id, bookmarked: true }] });
    await bookmark("nour", { kind: "question", id: q.id, on: false });
    expect((await saved("nour", "en")).questions).toEqual([]);
    await expect(bookmark("nour", { kind: "question", id: "missing", on: true })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("231 official tutorials", () => {
  it("are the team's: articles with their reading time, videos with their length, by section, level, language and kind", async () => {
    await expect(publishTutorial("karim", { title: "My own tutorial title", summary: "Something", kind: "article", section: "studio", level: "beginner", language: "en", body: "x".repeat(40) })).rejects.toMatchObject({ code: "forbidden" });
    await expect(publishTutorial(STAFF, { title: "A video without its address", summary: "A summary here.", kind: "video", section: "studio", level: "beginner", language: "en", body: "", videoUrl: "https://evil.example/v", durationSec: 60 })).rejects.toMatchObject({ field: "videoUrl" });
    const article = await publishTutorial(STAFF, { title: "A different product page per template", summary: "Each template its own product page.", kind: "article", section: "studio", level: "beginner", language: "en", body: "word ".repeat(1000) }, later(1));
    const video = await publishTutorial(STAFF, { title: "صفحة منتج مختلفة لكل تمبلت", summary: "في ثماني دقائق.", kind: "video", section: "studio", level: "intermediate", language: "ar", body: "", videoUrl: "https://youtu.be/xyz", durationSec: 504 }, later(2));
    expect(article).toMatchObject({ kind: "article", durationSec: 300, official: true, author: { name: "Yallapp Team" }, section: { slug: "studio" } });
    expect(video).toMatchObject({ kind: "video", durationSec: 504, videoUrl: "https://youtu.be/xyz", slug: "صفحة-منتج-مختلفة-لكل-تمبلت", language: "ar" });
    const titles = async (f: object) => (await listTutorials({ viewerId: null, lang: "en", ...f })).items.map((t) => t.title);
    expect(await titles({})).toEqual([video.title, article.title]);
    expect(await titles({ level: "beginner" })).toEqual([article.title]);
    expect(await titles({ language: "ar" })).toEqual([video.title]);
    expect(await titles({ kind: "video" })).toEqual([video.title]);
    expect(await titles({ section: "stores" })).toEqual([]);
    expect((await getTutorial(video.slug, { viewerId: null, lang: "en", countView: true })).views).toBe(1);
    expect((await memberStats(STAFF)).approvedTutorials).toBe(2);
    // A tutorial taken down is gone, its points with it.
    await setContentStatus("tutorial", article.id, "hidden");
    await expect(getTutorial(article.id, { viewerId: null, lang: "en" })).rejects.toMatchObject({ code: "not_found" });
    expect((await memberStats(STAFF)).points).toBe(50);
    expect(qaStore()).toBeTruthy();
  });
});
