import { randomUUID } from "node:crypto";
import { qaHooks } from "./hooks";
import { MemoryQaStore } from "./memory";
import type { AnswerRecord, QaStore, QuestionFilter, QuestionRecord, ReplyRecord, SectionRecord, TagRecord, TutorialRecord } from "./store";
import { LIMITS, POINTS, SIMILAR_MIN, cursorOf, excerpt, links, offsetOf, rankOf, similarity, slugify, tagOf, words } from "./text";
import {
  QaError,
  type Answer,
  type BookmarkKind,
  type CommunityLang,
  type ContentStatus,
  type MemberQaStats,
  type MemberRef,
  type Page,
  type QuestionDetail,
  type QuestionSummary,
  type QuestionTab,
  type Reply,
  type Section,
  type SectionRef,
  type Tag,
  type TutorialDetail,
  type TutorialKind,
  type TutorialLevel,
  type TutorialSummary,
  type VoteKind,
  type VoteValue,
} from "./types";

/**
 * 231 Yallapp Community's Q&A and official tutorials (area B): asking,
 * answering, voting, accepting, official answers, sections and tags,
 * search and similar questions; the tutorials, articles and videos. The
 * site calls these directly; the API (/api/community/v1) and the app
 * through it.
 */

// ——— The store ———

let store: QaStore | null = null;

/** The Q&A's storage: memory until the database's is set (./sql.ts sets it at start-up; tests set their own). */
export function qaStore(): QaStore {
  return (store ??= new MemoryQaStore());
}
export function setQaStore(next: QaStore | null): void {
  store = next;
  seeded = null;
}

// ——— Sections: the ones the community starts with ———

/** The sections the community starts with (desktop mockup's "My sections" and the questions' chips). */
export const DEFAULT_SECTIONS: readonly Omit<SectionRecord, "id">[] = [
  { slug: "stores", icon: "storefront", sort: 10, names: { en: "Stores", ar: "المتاجر", tr: "Mağazalar" } },
  { slug: "studio", icon: "design_services", sort: 20, names: { en: "Studio", ar: "Studio", tr: "Studio" } },
  { slug: "restaurants", icon: "restaurant", sort: 30, names: { en: "Restaurants & delivery", ar: "المطاعم والتوصيل", tr: "Restoranlar ve teslimat" } },
  { slug: "publishing", icon: "rocket_launch", sort: 40, names: { en: "Publishing to the stores", ar: "النشر على المتاجر", tr: "Mağazalarda yayınlama" } },
  { slug: "payments", icon: "payments", sort: 50, names: { en: "Payments", ar: "الدفع", tr: "Ödemeler" } },
  { slug: "courses", icon: "school", sort: 60, names: { en: "Courses & academies", ar: "الدورات والأكاديميات", tr: "Kurslar ve akademiler" } },
  { slug: "design", icon: "palette", sort: 70, names: { en: "Design", ar: "التصميم", tr: "Tasarım" } },
  { slug: "general", icon: "forum", sort: 80, names: { en: "General", ar: "عام", tr: "Genel" } },
];

let seeded: Promise<void> | null = null;
function ensureSections(): Promise<void> {
  return (seeded ??= (async () => {
    const had = new Set((await qaStore().listSections()).map((s) => s.slug));
    for (const s of DEFAULT_SECTIONS) if (!had.has(s.slug)) await qaStore().upsertSection({ ...s, id: randomUUID() });
  })());
}

async function sectionsBy(): Promise<{ byId: Map<string, SectionRecord>; bySlug: Map<string, SectionRecord> }> {
  await ensureSections();
  const all = await qaStore().listSections();
  return { byId: new Map(all.map((s) => [s.id, s])), bySlug: new Map(all.map((s) => [s.slug, s])) };
}

const sectionRef = (s: SectionRecord | undefined, lang: CommunityLang): SectionRef => (s ? { slug: s.slug, name: s.names[lang] || s.names.en } : { slug: "general", name: "General" });

export async function listSections(viewerId: string | null, lang: CommunityLang): Promise<Section[]> {
  const { byId } = await sectionsBy();
  const counts = await qaStore().countQuestionsBy();
  const followed = new Set(viewerId ? await qaStore().followedSectionIds(viewerId) : []);
  return [...byId.values()].map((s) => ({ ...sectionRef(s, lang), icon: s.icon, sort: s.sort, questionCount: counts.sections[s.id] ?? 0, followed: followed.has(s.id) }));
}

/** The sections the member follows ("My sections" in the nav). */
export async function mySections(viewerId: string, lang: CommunityLang): Promise<Section[]> {
  return (await listSections(viewerId, lang)).filter((s) => s.followed);
}

export async function followSection(viewerId: string | null, slug: string, on: boolean, now = new Date()): Promise<void> {
  const member = signedIn(viewerId);
  const { bySlug } = await sectionsBy();
  const section = bySlug.get(slug);
  if (!section) throw new QaError("not_found", "There's no such section.");
  await qaStore().setSectionFollow(member, section.id, on, now);
}

export async function listTags(filter: { section?: string; q?: string; limit?: number } = {}): Promise<Tag[]> {
  const counts = await qaStore().countQuestionsBy();
  const prefix = filter.q ? tagOf(filter.q).slug : undefined;
  let tags = await qaStore().listTags({ prefix: prefix || undefined });
  if (filter.section) {
    const { bySlug } = await sectionsBy();
    const section = bySlug.get(filter.section);
    const inSection = new Set((await qaStore().listQuestions({ statuses: ["published"], sectionIds: section ? [section.id] : [] }, "latest", { offset: 0, limit: 500 })).flatMap((q) => q.tagIds));
    tags = tags.filter((t) => inSection.has(t.id));
  }
  return tags
    .map((t) => ({ slug: t.slug, name: t.name, questionCount: counts.tags[t.id] ?? 0 }))
    .sort((a, b) => b.questionCount - a.questionCount || a.slug.localeCompare(b.slug))
    .slice(0, Math.min(filter.limit ?? 30, 100));
}

// ——— Members ———

function signedIn(viewerId: string | null): string {
  if (!viewerId) throw new QaError("signed_out", "Sign in first.");
  return viewerId;
}

async function membersOf(ids: readonly string[]): Promise<Record<string, MemberRef>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  const [people, points] = await Promise.all([qaHooks().members(unique), qaStore().pointsOf(unique)]);
  const out: Record<string, MemberRef> = {};
  for (const id of unique) {
    const p = people[id] ?? { id, name: "Member", handle: null, avatarUrl: null, badge: null, staff: false };
    out[id] = { ...p, rank: rankOf(points[id] ?? 0) };
  }
  return out;
}

const SHOWN: readonly ContentStatus[] = ["published"];

// ——— Questions ———

function pageOf(limit?: number): number {
  return Math.min(Math.max(1, Math.floor(limit ?? 20)), LIMITS.pageMax);
}

async function summaries(records: QuestionRecord[], viewerId: string | null, lang: CommunityLang): Promise<QuestionSummary[]> {
  const { byId } = await sectionsBy();
  const tagIds = [...new Set(records.flatMap((q) => q.tagIds))];
  const tags = new Map((tagIds.length ? await qaStore().listTags({ ids: tagIds }) : []).map((t) => [t.id, t]));
  const members = await membersOf(records.map((q) => q.authorId));
  const saved = new Set(viewerId && records.length ? await qaStore().bookmarksOf(viewerId, "question", records.map((q) => q.id)) : []);
  return records.map((q) => ({
    id: q.id,
    slug: q.slug,
    title: q.title,
    excerpt: excerpt(q.body),
    section: sectionRef(byId.get(q.sectionId), lang),
    tags: q.tagIds.map((id) => tags.get(id)).filter((t): t is TagRecord => !!t).map((t) => ({ slug: t.slug, name: t.name, questionCount: 0 })),
    author: members[q.authorId]!,
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    lastActivityAt: q.lastActivityAt.toISOString(),
    views: q.views,
    answerCount: q.answerCount,
    hasAccepted: q.acceptedAnswerId !== null,
    score: q.score,
    bookmarked: saved.has(q.id),
  }));
}

/**
 * The questions on a tab: Latest (newest asked), Most active (answered or
 * replied to last), Unanswered (none yet, newest first), For you (the
 * member's sections first, then the rest, by activity; Latest's order
 * without a viewer or sections). By section and tag; blocked members' left
 * out.
 */
export async function listQuestions(input: { viewerId: string | null; lang: CommunityLang; tab?: QuestionTab; section?: string; tag?: string; cursor?: string | null; limit?: number }): Promise<Page<QuestionSummary>> {
  const limit = pageOf(input.limit);
  const offset = offsetOf(input.cursor);
  const { bySlug } = await sectionsBy();
  const filter: QuestionFilter = { statuses: SHOWN, excludeAuthorIds: input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : undefined };
  if (input.section) {
    const s = bySlug.get(input.section);
    if (!s) return { items: [], next: null };
    filter.sectionIds = [s.id];
  }
  if (input.tag) {
    const [t] = await qaStore().listTags({ slugs: [input.tag] });
    if (!t) return { items: [], next: null };
    filter.tagId = t.id;
  }
  const tab = input.tab ?? "latest";
  let records: QuestionRecord[];
  if (tab === "for_you" && input.viewerId && !input.section) {
    const mine = await qaStore().followedSectionIds(input.viewerId);
    if (mine.length) {
      // The member's sections first, then everything else, each by activity.
      const inMine = await qaStore().countQuestions({ ...filter, sectionIds: mine });
      const first = offset < inMine ? await qaStore().listQuestions({ ...filter, sectionIds: mine }, "active", { offset, limit: limit + 1 }) : [];
      const rest =
        first.length > limit
          ? []
          : (await qaStore().listQuestions(filter, "active", { offset: Math.max(0, offset - inMine), limit: limit + 1 + inMine })).filter((q) => !mine.includes(q.sectionId)).slice(0, limit + 1 - first.length);
      records = [...first, ...rest];
    } else records = await qaStore().listQuestions(filter, "active", { offset, limit: limit + 1 });
  } else {
    const order = tab === "active" || tab === "for_you" ? "active" : "latest";
    records = await qaStore().listQuestions({ ...filter, unanswered: tab === "unanswered" || undefined }, order, { offset, limit: limit + 1 });
  }
  const more = records.length > limit;
  return { items: await summaries(records.slice(0, limit), input.viewerId, input.lang), next: more ? cursorOf(offset + limit) : null };
}

async function findQuestion(idOrSlug: string): Promise<QuestionRecord | null> {
  return (await qaStore().getQuestion(idOrSlug)) ?? (await qaStore().getQuestionBySlug(idOrSlug));
}

/** One asked question with its answers, each with its replies; one more view when `countView`. Not found when not shown to the viewer. */
export async function getQuestion(idOrSlug: string, input: { viewerId: string | null; lang: CommunityLang; countView?: boolean }): Promise<QuestionDetail> {
  const q = await findQuestion(idOrSlug);
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  if (!q || (q.status !== "published" && q.authorId !== input.viewerId) || hidden.includes(q.authorId)) throw new QaError("not_found", "There's no such question.");
  if (input.countView && q.status === "published") {
    await qaStore().addQuestionView(q.id);
    q.views += 1;
  }
  const [summary] = await summaries([q], input.viewerId, input.lang);
  const answers = (await qaStore().listAnswers([q.id], { statuses: SHOWN, orAuthorId: input.viewerId })).filter((a) => !hidden.includes(a.authorId));
  const replies = (await qaStore().listReplies(answers.map((a) => a.id), { statuses: SHOWN, orAuthorId: input.viewerId })).filter((r) => !hidden.includes(r.authorId));
  const members = await membersOf([...answers.map((a) => a.authorId), ...replies.map((r) => r.authorId)]);
  const myVotes = input.viewerId ? await qaStore().votesOf(input.viewerId, "answer", answers.map((a) => a.id)) : {};
  const shown: Answer[] = answers.map((a) => ({
    id: a.id,
    questionId: a.questionId,
    body: a.body,
    author: members[a.authorId]!,
    status: a.status,
    official: a.official,
    accepted: q.acceptedAnswerId === a.id,
    score: a.score,
    myVote: myVotes[a.id] ?? 0,
    replyCount: a.replyCount,
    replies: replies.filter((r) => r.answerId === a.id).map((r): Reply => ({ id: r.id, body: r.body, author: members[r.authorId]!, status: r.status, createdAt: r.createdAt.toISOString() })),
    createdAt: a.createdAt.toISOString(),
  }));
  shown.sort((a, b) => Number(b.accepted) - Number(a.accepted) || Number(b.official) - Number(a.official) || b.score - a.score || a.createdAt.localeCompare(b.createdAt));
  return {
    ...summary!,
    body: q.body,
    myVote: input.viewerId ? await qaStore().getVote(input.viewerId, "question", q.id) : 0,
    mine: input.viewerId === q.authorId,
    answers: shown,
  };
}

/** Questions like the one being asked, most alike first: shown before it is posted, so a member finds the answer that's there. */
export async function similarQuestions(input: { title: string; body?: string; section?: string; viewerId: string | null; lang: CommunityLang; limit?: number }): Promise<QuestionSummary[]> {
  const wanted = words(`${input.title} ${input.body ?? ""}`);
  if (wanted.length === 0) return [];
  // The published questions that share at least one of the title's words, then the most alike.
  const titleWords = words(input.title).slice(0, 8);
  const seen = new Map<string, QuestionRecord>();
  for (const w of titleWords.length ? titleWords : wanted.slice(0, 8)) {
    for (const q of await qaStore().listQuestions({ statuses: SHOWN, words: [w] }, "score", { offset: 0, limit: 60 })) seen.set(q.id, q);
  }
  const ranked = [...seen.values()]
    .map((q) => ({ q, s: similarity(input, q) + (input.section && q.acceptedAnswerId ? 0.02 : 0) }))
    .filter((x) => x.s >= SIMILAR_MIN)
    .sort((a, b) => b.s - a.s || Number(b.q.acceptedAnswerId !== null) - Number(a.q.acceptedAnswerId !== null) || b.q.score - a.q.score)
    .slice(0, Math.min(input.limit ?? 5, 10))
    .map((x) => x.q);
  return summaries(ranked, input.viewerId, input.lang);
}

function check(text: string, min: number, max: number, field: string, what: string): string {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length < min) throw new QaError("invalid", `${what} is too short: at least ${min} characters.`, field);
  if (clean.length > max) throw new QaError("invalid", `${what} is too long: at most ${max} characters.`, field);
  return clean;
}

async function moderated(memberId: string, kind: "question" | "answer" | "reply" | "tutorial", text: string): Promise<ContentStatus> {
  const verdict = await qaHooks().moderate({ memberId, kind, text, links: links(text) });
  if (verdict === "rejected") throw new QaError("invalid", "This can't be posted: it looks like spam or links to a site we don't allow.", "body");
  return verdict;
}

/** Asks a question in a section with up to five tags; shown at once, or once a moderator approves it (a new member's first posts). */
export async function askQuestion(
  viewerId: string | null,
  input: { section: string; title: string; body: string; tags?: readonly string[]; lang: CommunityLang },
  now = new Date(),
): Promise<{ question: QuestionDetail; status: ContentStatus }> {
  const member = signedIn(viewerId);
  const title = check(input.title.replace(/\s+/g, " "), LIMITS.titleMin, LIMITS.titleMax, "title", "The title");
  const body = check(input.body, LIMITS.bodyMin, LIMITS.bodyMax, "body", "The question");
  const { bySlug } = await sectionsBy();
  const section = bySlug.get(input.section);
  if (!section) throw new QaError("invalid", "Choose a section.", "section");
  // Each tag once, as it was first written.
  const names: { slug: string; name: string }[] = [];
  for (const t of (input.tags ?? []).map(tagOf)) if (t.slug && !names.some((n) => n.slug === t.slug)) names.push(t);
  if (names.length > LIMITS.tagsMax) throw new QaError("invalid", `At most ${LIMITS.tagsMax} tags.`, "tags");
  const tags = await Promise.all(names.map((t) => qaStore().ensureTag(t.slug, t.name)));
  const status = await moderated(member, "question", `${title}\n${body}`);
  const made = await qaStore().createQuestion({
    id: randomUUID(),
    slug: slugify(title, "question"),
    sectionId: section.id,
    tagIds: tags.map((t) => t.id),
    title,
    body,
    authorId: member,
    status,
    lang: input.lang,
    views: 0,
    answerCount: 0,
    score: 0,
    acceptedAnswerId: null,
    createdAt: now,
    lastActivityAt: now,
  });
  return { question: await getQuestion(made.id, { viewerId: member, lang: input.lang }), status };
}

/** Answers a question; official ("Yallapp Team") when the author is on the team. The asker is told, of an official one too. */
export async function answerQuestion(viewerId: string | null, questionId: string, input: { body: string; lang: CommunityLang }, now = new Date()): Promise<Answer> {
  const member = signedIn(viewerId);
  const q = await findQuestion(questionId);
  if (!q || q.status !== "published") throw new QaError("not_found", "There's no such question.");
  if ((await qaHooks().hiddenFor(member)).includes(q.authorId)) throw new QaError("forbidden", "You can't answer this member.");
  const body = check(input.body, LIMITS.answerMin, LIMITS.answerMax, "body", "The answer");
  const author = (await qaHooks().members([member]))[member];
  const official = author?.staff === true;
  const status = official ? "published" : await moderated(member, "answer", body);
  const answer: AnswerRecord = { id: randomUUID(), questionId: q.id, body, authorId: member, status, official, score: 0, replyCount: 0, createdAt: now };
  await qaStore().createAnswer(answer);
  if (status === "published") await answerShown(q, answer, now);
  return (await getQuestion(q.id, { viewerId: member, lang: input.lang })).answers.find((a) => a.id === answer.id)!;
}

async function answerShown(q: QuestionRecord, a: AnswerRecord, now: Date): Promise<void> {
  const fresh = (await qaStore().getQuestion(q.id))!;
  await qaStore().updateQuestion(q.id, { answerCount: fresh.answerCount + 1, lastActivityAt: now });
  if (a.authorId !== q.authorId) await qaHooks().notify(q.authorId, a.official ? "official_answer" : "answer_posted", { question_id: q.id, question_slug: q.slug, question_title: q.title, answer_id: a.id });
}

/** A reply under an answer; its author is told. */
export async function replyToAnswer(viewerId: string | null, answerId: string, input: { body: string; lang: CommunityLang }, now = new Date()): Promise<Reply> {
  const member = signedIn(viewerId);
  const a = await qaStore().getAnswer(answerId);
  const q = a ? await qaStore().getQuestion(a.questionId) : null;
  if (!a || !q || a.status !== "published" || q.status !== "published") throw new QaError("not_found", "There's no such answer.");
  if ((await qaHooks().hiddenFor(member)).includes(a.authorId)) throw new QaError("forbidden", "You can't reply to this member.");
  const body = check(input.body, 1, LIMITS.replyMax, "body", "The reply");
  const status = await moderated(member, "reply", body);
  const reply: ReplyRecord = { id: randomUUID(), answerId: a.id, body, authorId: member, status, createdAt: now };
  await qaStore().createReply(reply);
  if (status === "published") await replyShown(q, a, reply, now);
  const author = (await membersOf([member]))[member]!;
  return { id: reply.id, body, author, status, createdAt: now.toISOString() };
}

async function replyShown(q: QuestionRecord, a: AnswerRecord, r: ReplyRecord, now: Date): Promise<void> {
  const fresh = (await qaStore().getAnswer(a.id))!;
  await qaStore().updateAnswer(a.id, { replyCount: fresh.replyCount + 1 });
  await qaStore().updateQuestion(q.id, { lastActivityAt: now });
  if (r.authorId !== a.authorId) await qaHooks().notify(a.authorId, "reply_posted", { question_id: q.id, question_slug: q.slug, question_title: q.title, answer_id: a.id, reply_id: r.id });
}

/**
 * The member's vote on a question or answer: up, down, or taken back (0).
 * Never on their own. The author earns or loses its points; the score
 * changes by the difference.
 */
export async function vote(viewerId: string | null, input: { kind: VoteKind; id: string; value: VoteValue }, now = new Date()): Promise<{ score: number; myVote: VoteValue }> {
  const member = signedIn(viewerId);
  if (![1, -1, 0].includes(input.value)) throw new QaError("invalid", "A vote is 1, -1 or 0.", "value");
  const target = input.kind === "question" ? await qaStore().getQuestion(input.id) : await qaStore().getAnswer(input.id);
  if (!target || target.status !== "published") throw new QaError("not_found", `There's no such ${input.kind}.`);
  if (target.authorId === member) throw new QaError("forbidden", "You can't vote on your own post.");
  const before = await qaStore().setVote(member, input.kind, target.id, input.value, now);
  const score = target.score + input.value - before;
  if (input.kind === "question") await qaStore().updateQuestion(target.id, { score });
  else await qaStore().updateAnswer(target.id, { score });
  // Points: the vote's reason is taken back, then given again for the new one.
  const ref = `${input.kind}:${target.id}:${member}`;
  for (const r of input.kind === "question" ? (["question_upvoted", "question_downvoted"] as const) : (["answer_upvoted", "answer_downvoted"] as const)) await qaStore().removePoints(target.authorId, r, ref);
  if (input.value !== 0) {
    const reason = input.kind === "question" ? (input.value > 0 ? "question_upvoted" : "question_downvoted") : input.value > 0 ? "answer_upvoted" : "answer_downvoted";
    await qaStore().addPoints({ id: randomUUID(), memberId: target.authorId, reason, points: POINTS[reason], ref, createdAt: now });
  }
  return { score, myVote: input.value };
}

/** The asker accepts one answer (another taken back) or takes theirs back. The answerer earns 25 points and is told. */
export async function acceptAnswer(viewerId: string | null, answerId: string, on: boolean, now = new Date()): Promise<{ acceptedAnswerId: string | null }> {
  const member = signedIn(viewerId);
  const a = await qaStore().getAnswer(answerId);
  const q = a ? await qaStore().getQuestion(a.questionId) : null;
  if (!a || !q || a.status !== "published") throw new QaError("not_found", "There's no such answer.");
  if (q.authorId !== member) throw new QaError("forbidden", "Only the member who asked can accept an answer.");
  const previous = q.acceptedAnswerId;
  if (!on) {
    if (previous !== a.id) return { acceptedAnswerId: previous };
    await qaStore().updateQuestion(q.id, { acceptedAnswerId: null });
    await qaStore().removePoints(a.authorId, "answer_accepted", a.id);
    await qaStore().removePoints(member, "accepted_an_answer", q.id);
    return { acceptedAnswerId: null };
  }
  if (previous === a.id) return { acceptedAnswerId: a.id };
  if (previous) {
    const old = await qaStore().getAnswer(previous);
    if (old) await qaStore().removePoints(old.authorId, "answer_accepted", old.id);
  }
  await qaStore().updateQuestion(q.id, { acceptedAnswerId: a.id, lastActivityAt: now });
  if (a.authorId !== member) {
    await qaStore().addPoints({ id: randomUUID(), memberId: a.authorId, reason: "answer_accepted", points: POINTS.answer_accepted, ref: a.id, createdAt: now });
    await qaStore().removePoints(member, "accepted_an_answer", q.id);
    await qaStore().addPoints({ id: randomUUID(), memberId: member, reason: "accepted_an_answer", points: POINTS.accepted_an_answer, ref: q.id, createdAt: now });
    await qaHooks().notify(a.authorId, "answer_accepted", { question_id: q.id, question_slug: q.slug, question_title: q.title, answer_id: a.id, points: String(POINTS.answer_accepted) });
  }
  return { acceptedAnswerId: a.id };
}

/** Saves a question or tutorial for later (the side menu's Saved), or takes it out. */
export async function bookmark(viewerId: string | null, input: { kind: BookmarkKind; id: string; on: boolean }, now = new Date()): Promise<void> {
  const member = signedIn(viewerId);
  const target = input.kind === "question" ? await findQuestion(input.id) : await findTutorial(input.id);
  if (!target || target.status !== "published") throw new QaError("not_found", `There's no such ${input.kind}.`);
  await qaStore().setBookmark(member, input.kind, target.id, input.on, now);
}

/** The member's saved questions and tutorials, the last saved first. */
export async function saved(viewerId: string | null, lang: CommunityLang): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[] }> {
  const member = signedIn(viewerId);
  const qIds = await qaStore().bookmarksOf(member, "question");
  const tIds = await qaStore().bookmarksOf(member, "tutorial");
  const qs = qIds.length ? await qaStore().listQuestions({ statuses: SHOWN, ids: qIds }, "latest", { offset: 0, limit: 200 }) : [];
  const ts = (await Promise.all(tIds.map((id) => qaStore().getTutorial(id)))).filter((t): t is TutorialRecord => !!t && t.status === "published");
  const order = (ids: string[]) => (a: { id: string }, b: { id: string }) => ids.indexOf(a.id) - ids.indexOf(b.id);
  return { questions: (await summaries(qs, member, lang)).sort(order(qIds)), tutorials: (await tutorialSummaries(ts, member, lang)).sort(order(tIds)) };
}

// ——— Moderation (area C's queue) ———

/**
 * A moderator shows, hides or removes a question, answer, reply or
 * tutorial (area C's queue and reports). Counts follow: a hidden answer no
 * longer counts on its question.
 */
export async function setContentStatus(kind: "question" | "answer" | "reply" | "tutorial", id: string, status: ContentStatus, now = new Date()): Promise<boolean> {
  if (kind === "question") {
    const q = await qaStore().getQuestion(id);
    if (!q) return false;
    await qaStore().updateQuestion(id, { status });
    return true;
  }
  if (kind === "tutorial") {
    const t = await qaStore().getTutorial(id);
    if (!t) return false;
    await qaStore().updateTutorial(id, { status, updatedAt: now });
    if (status === "published" && t.status !== "published") await qaStore().addPoints({ id: randomUUID(), memberId: t.authorId, reason: "tutorial_published", points: POINTS.tutorial_published, ref: t.id, createdAt: now });
    if (status !== "published" && t.status === "published") await qaStore().removePoints(t.authorId, "tutorial_published", t.id);
    return true;
  }
  if (kind === "answer") {
    const a = await qaStore().getAnswer(id);
    const q = a ? await qaStore().getQuestion(a.questionId) : null;
    if (!a || !q) return false;
    if (a.status === status) return true;
    await qaStore().updateAnswer(id, { status });
    if (status === "published") await answerShown(q, a, now);
    else if (a.status === "published") {
      await qaStore().updateQuestion(q.id, { answerCount: Math.max(0, q.answerCount - 1), ...(q.acceptedAnswerId === a.id ? { acceptedAnswerId: null } : {}) });
      if (q.acceptedAnswerId === a.id) await qaStore().removePoints(a.authorId, "answer_accepted", a.id);
    }
    return true;
  }
  const r = await qaStore().getReply(id);
  const a = r ? await qaStore().getAnswer(r.answerId) : null;
  const q = a ? await qaStore().getQuestion(a.questionId) : null;
  if (!r || !a || !q) return false;
  if (r.status === status) return true;
  await qaStore().updateReply(id, { status });
  if (status === "published") await replyShown(q, a, r, now);
  else if (r.status === "published") await qaStore().updateAnswer(a.id, { replyCount: Math.max(0, a.replyCount - 1) });
  return true;
}

/** What a moderator reviews of one post (area C's queue): its text, author and where it is. */
export async function contentOf(kind: "question" | "answer" | "reply" | "tutorial", id: string): Promise<{ authorId: string; title: string | null; body: string; status: ContentStatus; questionId: string | null } | null> {
  if (kind === "question") {
    const q = await qaStore().getQuestion(id);
    return q && { authorId: q.authorId, title: q.title, body: q.body, status: q.status, questionId: q.id };
  }
  if (kind === "answer") {
    const a = await qaStore().getAnswer(id);
    return a && { authorId: a.authorId, title: null, body: a.body, status: a.status, questionId: a.questionId };
  }
  if (kind === "reply") {
    const r = await qaStore().getReply(id);
    const a = r ? await qaStore().getAnswer(r.answerId) : null;
    return r && { authorId: r.authorId, title: null, body: r.body, status: r.status, questionId: a?.questionId ?? null };
  }
  const t = await qaStore().getTutorial(id);
  return t && { authorId: t.authorId, title: t.title, body: t.body, status: t.status, questionId: null };
}

// ——— Search ———

/** Questions and tutorials with every word searched (title or text), questions with an accepted answer and more votes first. */
export async function search(input: { q: string; viewerId: string | null; lang: CommunityLang; section?: string; kinds?: readonly ("question" | "tutorial")[]; limit?: number }): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[] }> {
  const wanted = words(input.q).slice(0, 8);
  if (input.q.trim().length < LIMITS.searchMin || wanted.length === 0) return { questions: [], tutorials: [] };
  const limit = Math.min(input.limit ?? 10, LIMITS.pageMax);
  const kinds = input.kinds?.length ? input.kinds : ["question", "tutorial"];
  const { bySlug } = await sectionsBy();
  const section = input.section ? bySlug.get(input.section) : undefined;
  if (input.section && !section) return { questions: [], tutorials: [] };
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  // Those with every word; without any, those with some, the most words first.
  const matched = <T extends { id: string; title: string }>(lists: T[][], text: (x: T) => string): { x: T; n: number }[] => {
    const all = new Map<string, T>();
    for (const list of lists) for (const x of list) all.set(x.id, x);
    return [...all.values()].map((x) => {
      const hay = text(x).normalize("NFKC").toLocaleLowerCase("en");
      return { x, n: wanted.filter((w) => hay.includes(w)).length };
    });
  };
  let qs: QuestionRecord[] = [];
  if (kinds.includes("question")) {
    const base: QuestionFilter = { statuses: SHOWN, sectionIds: section ? [section.id] : undefined, excludeAuthorIds: hidden };
    let found = await qaStore().listQuestions({ ...base, words: wanted }, "score", { offset: 0, limit: 100 });
    if (!found.length && wanted.length > 1) found = matched(await Promise.all(wanted.map((w) => qaStore().listQuestions({ ...base, words: [w] }, "score", { offset: 0, limit: 50 }))), (q) => `${q.title} ${q.body}`).map((m) => m.x);
    qs = found
      .map((q) => ({ q, s: similarity({ title: input.q }, q) + (q.acceptedAnswerId ? 0.1 : 0) + Math.min(q.score, 50) / 500 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.q);
  }
  let ts: TutorialRecord[] = [];
  if (kinds.includes("tutorial")) {
    const base = { statuses: SHOWN, sectionId: section?.id };
    ts = await qaStore().listTutorials({ ...base, words: wanted }, { offset: 0, limit });
    if (!ts.length && wanted.length > 1)
      ts = matched(await Promise.all(wanted.map((w) => qaStore().listTutorials({ ...base, words: [w] }, { offset: 0, limit: 50 }))), (t) => `${t.title} ${t.summary} ${t.body}`)
        .sort((a, b) => b.n - a.n || b.x.createdAt.getTime() - a.x.createdAt.getTime())
        .slice(0, limit)
        .map((m) => m.x);
  }
  return { questions: await summaries(qs, input.viewerId, input.lang), tutorials: await tutorialSummaries(ts, input.viewerId, input.lang) };
}

// ——— The home page and the side rail ———

/** Unanswered questions in the member's sections (all sections without them), newest first, never their own: "Questions waiting for your answer". */
export async function waitingForAnswer(input: { viewerId: string | null; lang: CommunityLang; limit?: number }): Promise<{ items: QuestionSummary[]; total: number; inMySections: number }> {
  const mine = input.viewerId ? await qaStore().followedSectionIds(input.viewerId) : [];
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  const filter: QuestionFilter = { statuses: SHOWN, unanswered: true, sectionIds: mine.length ? mine : undefined, excludeAuthorIds: [...hidden, ...(input.viewerId ? [input.viewerId] : [])] };
  const records = await qaStore().listQuestions(filter, "latest", { offset: 0, limit: Math.min(input.limit ?? 3, 20) });
  const total = await qaStore().countQuestions(filter);
  return { items: await summaries(records, input.viewerId, input.lang), total, inMySections: mine.length ? total : 0 };
}

/** The home page's figures: the share of questions with an answer, and questions asked since a date ("12 new"). */
export async function qaStats(input: { since: Date }): Promise<{ questions: number; answeredRate: number; newCount: number }> {
  const all = await qaStore().countQuestions({ statuses: SHOWN });
  const unanswered = await qaStore().countQuestions({ statuses: SHOWN, unanswered: true });
  const newCount = await qaStore().countQuestions({ statuses: SHOWN, since: input.since });
  return { questions: all, answeredRate: all ? Math.round(((all - unanswered) / all) * 100) : 0, newCount };
}

/** "Most active this week": the members who earned the most points since `days` ago, with their accepted answers. */
export async function activeMembers(input: { days?: number; limit?: number; now?: Date }): Promise<{ member: MemberRef; points: number; acceptedAnswers: number }[]> {
  const since = new Date((input.now ?? new Date()).getTime() - (input.days ?? 7) * 86_400_000);
  const top = await qaStore().topEarners(since, Math.min(input.limit ?? 3, 20));
  const members = await membersOf(top.map((t) => t.memberId));
  return Promise.all(top.map(async (t) => ({ member: members[t.memberId]!, points: t.points, acceptedAnswers: await qaStore().countAnswers({ authorId: t.memberId, statuses: SHOWN, accepted: true }) })));
}

/** What badges (area C) and profiles (area A) read of a member's Q&A. */
export async function memberStats(memberId: string): Promise<MemberQaStats> {
  const [points, questions, answers, accepted, tutorials, last] = await Promise.all([
    qaStore().pointsOf([memberId]),
    qaStore().countQuestions({ statuses: SHOWN, authorId: memberId }),
    qaStore().countAnswers({ authorId: memberId, statuses: SHOWN }),
    qaStore().countAnswers({ authorId: memberId, statuses: SHOWN, accepted: true }),
    qaStore().listTutorials({ statuses: SHOWN, authorId: memberId }, { offset: 0, limit: 1000 }),
    qaStore().lastActivityOf(memberId),
  ]);
  return { points: points[memberId] ?? 0, questions, answers, acceptedAnswers: accepted, approvedTutorials: tutorials.length, lastActiveAt: last?.toISOString() ?? null };
}

/** A member's own questions and answers on their profile. */
export async function memberQuestions(memberId: string, input: { viewerId: string | null; lang: CommunityLang; cursor?: string | null; limit?: number }): Promise<Page<QuestionSummary>> {
  const limit = pageOf(input.limit);
  const offset = offsetOf(input.cursor);
  const records = await qaStore().listQuestions({ statuses: SHOWN, authorId: memberId }, "latest", { offset, limit: limit + 1 });
  return { items: await summaries(records.slice(0, limit), input.viewerId, input.lang), next: records.length > limit ? cursorOf(offset + limit) : null };
}

// ——— Tutorials ———

async function findTutorial(idOrSlug: string): Promise<TutorialRecord | null> {
  return (await qaStore().getTutorial(idOrSlug)) ?? (await qaStore().getTutorialBySlug(idOrSlug));
}

async function tutorialSummaries(records: TutorialRecord[], viewerId: string | null, lang: CommunityLang): Promise<TutorialSummary[]> {
  const { byId } = await sectionsBy();
  const members = await membersOf(records.map((t) => t.authorId));
  const saved = new Set(viewerId && records.length ? await qaStore().bookmarksOf(viewerId, "tutorial", records.map((t) => t.id)) : []);
  return records.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    kind: t.kind,
    section: sectionRef(byId.get(t.sectionId), lang),
    level: t.level,
    language: t.language,
    durationSec: t.durationSec,
    coverUrl: t.coverUrl,
    author: members[t.authorId]!,
    official: t.official,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    views: t.views,
    bookmarked: saved.has(t.id),
  }));
}

/** The published tutorials, newest first: by section, level, language and kind. */
export async function listTutorials(input: { viewerId: string | null; lang: CommunityLang; section?: string; level?: TutorialLevel; language?: CommunityLang; kind?: TutorialKind; cursor?: string | null; limit?: number }): Promise<Page<TutorialSummary>> {
  const limit = pageOf(input.limit);
  const offset = offsetOf(input.cursor);
  const { bySlug } = await sectionsBy();
  const section = input.section ? bySlug.get(input.section) : undefined;
  if (input.section && !section) return { items: [], next: null };
  const records = await qaStore().listTutorials({ statuses: SHOWN, sectionId: section?.id, level: input.level, language: input.language, kind: input.kind }, { offset, limit: limit + 1 });
  return { items: await tutorialSummaries(records.slice(0, limit), input.viewerId, input.lang), next: records.length > limit ? cursorOf(offset + limit) : null };
}

export async function getTutorial(idOrSlug: string, input: { viewerId: string | null; lang: CommunityLang; countView?: boolean }): Promise<TutorialDetail> {
  const t = await findTutorial(idOrSlug);
  if (!t || t.status !== "published") throw new QaError("not_found", "There's no such tutorial.");
  if (input.countView) {
    await qaStore().addTutorialView(t.id);
    t.views += 1;
  }
  const [summary] = await tutorialSummaries([t], input.viewerId, input.lang);
  return { ...summary!, body: t.body, videoUrl: t.videoUrl };
}

const VIDEO_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|yallapp\.com\.tr|[\w-]+\.yallapp\.com\.tr)\//i;

/**
 * The Yallapp team publishes an official tutorial (phase 1: tutorials are
 * the team's): an article (Markdown, its reading time from its length) or
 * a video (its address on YouTube, Vimeo or Yallapp, and its length).
 */
export async function publishTutorial(
  authorId: string | null,
  input: { title: string; summary: string; kind: TutorialKind; section: string; level: TutorialLevel; language: CommunityLang; body: string; videoUrl?: string | null; durationSec?: number; coverUrl?: string | null },
  now = new Date(),
): Promise<TutorialDetail> {
  const author = signedIn(authorId);
  const who = (await qaHooks().members([author]))[author];
  if (!who?.staff) throw new QaError("forbidden", "Only the Yallapp team publishes tutorials.");
  const title = check(input.title.replace(/\s+/g, " "), LIMITS.titleMin, LIMITS.titleMax, "title", "The title");
  const summary = check(input.summary, 10, 300, "summary", "The summary");
  if (!["article", "video"].includes(input.kind)) throw new QaError("invalid", "A tutorial is an article or a video.", "kind");
  if (!["beginner", "intermediate", "advanced"].includes(input.level)) throw new QaError("invalid", "Choose a level.", "level");
  if (!["en", "ar", "tr"].includes(input.language)) throw new QaError("invalid", "Choose its language.", "language");
  const { bySlug } = await sectionsBy();
  const section = bySlug.get(input.section);
  if (!section) throw new QaError("invalid", "Choose a section.", "section");
  let body: string;
  let videoUrl: string | null = null;
  let durationSec: number;
  if (input.kind === "video") {
    if (!input.videoUrl || !VIDEO_HOSTS.test(input.videoUrl)) throw new QaError("invalid", "Give the video's address on YouTube, Vimeo or Yallapp.", "videoUrl");
    videoUrl = input.videoUrl;
    durationSec = Math.round(input.durationSec ?? 0);
    if (durationSec < 1 || durationSec > 6 * 3600) throw new QaError("invalid", "Give the video's length.", "durationSec");
    body = input.body.trim().slice(0, LIMITS.bodyMax);
  } else {
    body = check(input.body, LIMITS.bodyMin, LIMITS.bodyMax * 5, "body", "The article");
    // About 200 words a minute.
    durationSec = Math.max(60, Math.round((body.split(/\s+/).length / 200) * 60));
  }
  const t = await qaStore().createTutorial({
    id: randomUUID(),
    slug: slugify(title, "tutorial"),
    title,
    summary,
    kind: input.kind,
    sectionId: section.id,
    level: input.level,
    language: input.language,
    body,
    videoUrl,
    durationSec,
    coverUrl: input.coverUrl ?? null,
    authorId: author,
    official: true,
    status: "published",
    views: 0,
    createdAt: now,
    updatedAt: now,
  });
  await qaStore().addPoints({ id: randomUUID(), memberId: author, reason: "tutorial_published", points: POINTS.tutorial_published, ref: t.id, createdAt: now });
  return getTutorial(t.id, { viewerId: author, lang: input.language });
}
