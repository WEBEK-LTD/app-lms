import { randomUUID } from "node:crypto";
import { qaHooks, qaScope, type ModeratedKind } from "./hooks";
import { MemoryQaStore } from "./memory";
import type { AnswerRecord, QaStore, QuestionFilter, QuestionOrder, QuestionRecord, ReplyRecord, SectionRecord, TagRecord, TutorialRecord } from "./store";
import { LIMITS, POINTS, SIMILAR_MIN, cursorOf, excerpt, offsetOf, rankOf, similarity, slugify, tagOf, words } from "./text";
import {
  QaError,
  type Answer,
  type BookmarkKind,
  type CommunityLang,
  type ContentStatus,
  type MemberQaStats,
  type MemberSummary,
  type Page,
  type Question,
  type QuestionFilterName,
  type QuestionSort,
  type QuestionSummary,
  type Reply,
  type Section,
  type SectionKind,
  type Tag,
  type Tutorial,
  type TutorialKind,
  type TutorialLevel,
  type TutorialSummary,
  type VoteKind,
  type VoteValue,
} from "./types";

/**
 * 231 Yallapp Community's Q&A and official tutorials (area B): asking with
 * the similar questions first, answering (official answers from Yallapp's
 * team), replies, votes and their points, accepting, editing and deleting
 * one's own, sections and tags, the filters and sorts, search, saved posts
 * and the team's tutorials (articles and videos by section, level and
 * language). The site calls these directly; the app through the API
 * (lib/community/api/qa-routes.ts, docs/api/community.yaml).
 */

// ——— The store ———

let store: QaStore | null = null;

/** The Q&A's storage: the request's (the API runs each call in `qaScope`), else the one set, else memory. */
export function qaStore(): QaStore {
  return qaScope.getStore()?.store ?? (store ??= new MemoryQaStore());
}
/** The storage outside a request (tests, scripts); null goes back to a new memory one. */
export function setQaStore(next: QaStore | null): void {
  store = next;
}

const SHOWN: readonly ContentStatus[] = ["published"];

// ——— Points ———

/** Gives points and tells area A the member's total (their profile's points). */
/** Gives points once per reason and ref; the member's profile moves only by what was recorded. */
async function award(e: Parameters<QaStore["addPoints"]>[0]): Promise<void> {
  if ((await qaStore().addPoints(e)) && e.points) await qaHooks().pointsChanged(e.memberId, e.points);
}
/** Takes back what that reason and ref gave, by exactly what was taken. */
async function unaward(memberId: string, reason: Parameters<QaStore["removePoints"]>[1], ref: string): Promise<void> {
  const taken = await qaStore().removePoints(memberId, reason, ref);
  if (taken) await qaHooks().pointsChanged(memberId, -taken);
}

// ——— Sections ———

/** The sections the community starts with, for questions and for tutorials (the desktop mockup's "My sections" and the questions' chips). */
export const DEFAULT_SECTIONS: readonly Omit<SectionRecord, "id" | "kind">[] = [
  { slug: "stores", icon: "storefront", position: 10, names: { en: "Stores", ar: "المتاجر", tr: "Mağazalar" } },
  { slug: "studio", icon: "design_services", position: 20, names: { en: "Studio", ar: "Studio", tr: "Studio" } },
  { slug: "restaurants", icon: "restaurant", position: 30, names: { en: "Restaurants & delivery", ar: "المطاعم والتوصيل", tr: "Restoranlar ve teslimat" } },
  { slug: "publishing", icon: "rocket_launch", position: 40, names: { en: "Publishing to the stores", ar: "النشر على المتاجر", tr: "Mağazalarda yayınlama" } },
  { slug: "payments", icon: "payments", position: 50, names: { en: "Payments", ar: "الدفع", tr: "Ödemeler" } },
  { slug: "courses", icon: "school", position: 60, names: { en: "Courses & academies", ar: "الدورات والأكاديميات", tr: "Kurslar ve akademiler" } },
  { slug: "design", icon: "palette", position: 70, names: { en: "Design", ar: "التصميم", tr: "Tasarım" } },
  { slug: "general", icon: "forum", position: 80, names: { en: "General", ar: "عام", tr: "Genel" } },
];

/** Each store's sections are added once, the first time it is used. */
const seeded = new WeakMap<QaStore, Promise<void>>();
function ensureSections(): Promise<void> {
  const target = qaStore();
  let done = seeded.get(target);
  if (!done) {
    done = (async () => {
      for (const kind of ["qa", "tutorial"] as const) {
        const had = new Set((await target.listSections(kind)).map((s) => s.slug));
        for (const s of DEFAULT_SECTIONS) if (!had.has(s.slug)) await target.upsertSection({ ...s, kind, id: randomUUID() });
      }
    })().catch((e: unknown) => {
      seeded.delete(target);
      throw e;
    });
    seeded.set(target, done);
  }
  return done;
}

async function sectionsOf(kind: SectionKind): Promise<{ byId: Map<string, SectionRecord>; bySlug: Map<string, SectionRecord> }> {
  await ensureSections();
  const all = await qaStore().listSections(kind);
  return { byId: new Map(all.map((s) => [s.id, s])), bySlug: new Map(all.map((s) => [s.slug, s])) };
}

const sectionOf = (s: SectionRecord | undefined, lang: CommunityLang, count = 0, followed = false): Section =>
  s ? { slug: s.slug, name: s.names[lang] || s.names.en, icon: s.icon, count, comingSoon: false, followed } : { slug: "general", name: "General", icon: "forum", count, comingSoon: false, followed };

/** The Q&A's or the tutorials' sections in order, each with its count and (for questions) whether the viewer follows it. */
export async function listSections(input: { kind?: SectionKind; viewerId: string | null; lang: CommunityLang }): Promise<Section[]> {
  const kind = input.kind ?? "qa";
  const { byId } = await sectionsOf(kind);
  const counts = await qaStore().counts();
  const followed = new Set(input.viewerId && kind === "qa" ? await qaStore().followedSectionIds(input.viewerId) : []);
  return [...byId.values()].map((s) => sectionOf(s, input.lang, (kind === "qa" ? counts.questionSections : counts.tutorialSections)[s.id] ?? 0, followed.has(s.id)));
}

/** The Q&A sections the member follows ("My sections" in the nav). */
export async function mySections(input: { viewerId: string; lang: CommunityLang }): Promise<Section[]> {
  return (await listSections({ ...input, kind: "qa" })).filter((s) => s.followed);
}

export async function followSection(viewerId: string | null, slug: string, on: boolean, now = new Date()): Promise<void> {
  const member = signedIn(viewerId);
  const section = (await sectionsOf("qa")).bySlug.get(slug);
  if (!section) throw new QaError("not_found", "There's no such section.");
  await qaStore().setSectionFollow(member, section.id, on, now);
}

/** Tags, most used first, or those starting with `q`. */
export async function listTags(input: { q?: string; section?: string; limit?: number } = {}): Promise<Tag[]> {
  const counts = await qaStore().counts();
  const prefix = input.q ? tagOf(input.q).slug : undefined;
  let tags = await qaStore().listTags({ prefix: prefix || undefined });
  if (input.section) {
    const section = (await sectionsOf("qa")).bySlug.get(input.section);
    const inSection = new Set((await qaStore().listQuestions({ statuses: SHOWN, sectionIds: section ? [section.id] : [] }, "newest", { offset: 0, limit: 500 })).flatMap((q) => q.tagIds));
    tags = tags.filter((t) => inSection.has(t.id));
  }
  // Only tags on a published question: one made by a held or removed question doesn't show.
  return tags
    .map((t) => ({ slug: t.slug, name: t.name, count: counts.tags[t.id] ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
    .slice(0, Math.min(input.limit ?? 30, 100));
}

// ——— Members ———

function signedIn(viewerId: string | null): string {
  if (!viewerId) throw new QaError("invalid_token", "Sign in first.");
  return viewerId;
}

const DELETED = (id: string): Omit<MemberSummary, "rank"> => ({ id, username: "", displayName: "Deleted member", avatarUrl: null, topBadge: null, team: false, deleted: true });

async function membersOf(ids: readonly string[]): Promise<Record<string, MemberSummary>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  const [people, points] = await Promise.all([qaHooks().members(unique), qaStore().pointsOf(unique)]);
  // Area A's rank (from the member's points, which the ledger keeps in step) when it gives one, else the ledger's.
  return Object.fromEntries(unique.map((id) => [id, { ...(people[id] ?? DELETED(id)), rank: people[id]?.rank ?? rankOf(points[id] ?? 0) }]));
}

async function isTeam(memberId: string): Promise<boolean> {
  return (await qaHooks().members([memberId]))[memberId]?.team === true;
}

// ——— Links (notices, reports, the moderation queue) ———

export const questionLink = (q: Pick<QuestionRecord, "slug">) => `/questions/${encodeURIComponent(q.slug)}`;
export const answerLink = (q: Pick<QuestionRecord, "slug">, answerId: string) => `${questionLink(q)}#a${answerId}`;
export const tutorialLink = (t: Pick<TutorialRecord, "slug">) => `/tutorials/${encodeURIComponent(t.slug)}`;

// ——— Questions ———

const pageOf = (limit?: number) => Math.min(Math.max(1, Math.floor(limit ?? 20)), LIMITS.pageMax);

async function summaries(records: QuestionRecord[], viewerId: string | null, lang: CommunityLang): Promise<QuestionSummary[]> {
  if (!records.length) return [];
  const { byId } = await sectionsOf("qa");
  const tagIds = [...new Set(records.flatMap((q) => q.tagIds))];
  const [tags, members, saved, official] = await Promise.all([
    tagIds.length ? qaStore().listTags({ ids: tagIds }) : Promise.resolve([] as TagRecord[]),
    membersOf(records.map((q) => q.authorId)),
    viewerId ? qaStore().bookmarksOf(viewerId, "question", records.map((q) => q.id)) : Promise.resolve([] as string[]),
    qaStore().withOfficialAnswer(records.map((q) => q.id)),
  ]);
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const savedSet = new Set(saved);
  const officialSet = new Set(official);
  return records.map((q) => ({
    id: q.id,
    slug: q.slug,
    title: q.title,
    excerpt: excerpt(q.body),
    author: members[q.authorId]!,
    section: sectionOf(byId.get(q.sectionId), lang),
    tags: q.tagIds.map((id) => tagById.get(id)).filter((t): t is TagRecord => !!t).map((t) => ({ slug: t.slug, name: t.name, count: 0 })),
    language: q.language,
    score: q.score,
    answerCount: q.answerCount,
    viewCount: q.viewCount,
    accepted: q.acceptedAnswerId !== null,
    hasOfficialAnswer: officialSet.has(q.id),
    status: q.status,
    createdAt: q.createdAt.toISOString(),
    lastActivityAt: q.lastActivityAt.toISOString(),
    bookmarked: savedSet.has(q.id),
  }));
}

export interface ListQuestionsInput {
  viewerId: string | null;
  lang: CommunityLang;
  /** all; unanswered; answered (with an accepted answer); official; following (members the viewer follows); for_you (the viewer's sections first). */
  filter?: QuestionFilterName;
  /** active (answered or replied to last), newest, votes. */
  sort?: QuestionSort;
  section?: string;
  tag?: string;
  author?: string;
  /** Questions this member has a published answer on. */
  answeredBy?: string;
  language?: CommunityLang;
  cursor?: string | null;
  limit?: number;
}

/**
 * A page of questions: by filter, sort, section, tag, author and language;
 * blocked members' left out. The site's tabs: For you (`for_you`), Latest
 * (`sort: newest`), Most active (`sort: active`), Unanswered
 * (`filter: unanswered`).
 */
export async function listQuestions(input: ListQuestionsInput): Promise<Page<QuestionSummary>> {
  const limit = pageOf(input.limit);
  const offset = offsetOf(input.cursor);
  const empty = { items: [], nextCursor: null };
  const filter: QuestionFilter = { statuses: SHOWN, language: input.language, excludeAuthorIds: input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : undefined };
  if (input.section) {
    const s = (await sectionsOf("qa")).bySlug.get(input.section);
    if (!s) return empty;
    filter.sectionIds = [s.id];
  }
  if (input.tag) {
    const [t] = await qaStore().listTags({ slugs: [tagOf(input.tag).slug] });
    if (!t) return empty;
    filter.tagId = t.id;
  }
  if (input.author) filter.authorIds = [input.author];
  if (input.answeredBy) filter.answeredBy = input.answeredBy;
  const name = input.filter ?? "all";
  if (name === "unanswered") filter.unanswered = true;
  if (name === "answered") filter.answered = true;
  if (name === "official") filter.official = true;
  if (name === "following") {
    if (!input.viewerId) return empty;
    const following = await qaHooks().followingIds(input.viewerId);
    if (!following.length) return empty;
    filter.authorIds = filter.authorIds ? filter.authorIds.filter((a) => following.includes(a)) : following;
  }
  const order: QuestionOrder = input.sort === "newest" ? "newest" : input.sort === "votes" ? "votes" : "active";
  let records: QuestionRecord[];
  const mine = name === "for_you" && input.viewerId && !input.section ? await qaStore().followedSectionIds(input.viewerId) : [];
  if (mine.length) {
    // The viewer's sections first, then the others, each in the sort's order.
    const inMine = await qaStore().countQuestions({ ...filter, sectionIds: mine });
    const first = offset < inMine ? await qaStore().listQuestions({ ...filter, sectionIds: mine }, order, { offset, limit: limit + 1 }) : [];
    const others = (await qaStore().listSections("qa")).map((s) => s.id).filter((id) => !mine.includes(id));
    const rest = first.length > limit || !others.length ? [] : await qaStore().listQuestions({ ...filter, sectionIds: others }, order, { offset: Math.max(0, offset - inMine), limit: limit + 1 - first.length });
    records = [...first, ...rest];
  } else records = await qaStore().listQuestions(filter, order, { offset, limit: limit + 1 });
  return { items: await summaries(records.slice(0, limit), input.viewerId, input.lang), nextCursor: records.length > limit ? cursorOf(offset + limit) : null };
}

async function findQuestion(idOrSlug: string): Promise<QuestionRecord | null> {
  return (await qaStore().getQuestion(idOrSlug)) ?? (await qaStore().getQuestionBySlug(idOrSlug));
}

/** How many of an answer's replies come with it (the newest few); the rest with `listReplies`. */
const INLINE_REPLIES = 3;

function replyOf(r: ReplyRecord, members: Record<string, MemberSummary>, viewerId: string | null): Reply {
  return { id: r.id, answerId: r.answerId, body: r.body, author: members[r.authorId]!, status: r.status, createdAt: r.createdAt.toISOString(), canEdit: viewerId === r.authorId };
}

/** One question with its answers (each with its newest replies); one more view when `countView`. Not found when not shown to the viewer. */
export async function getQuestion(idOrSlug: string, input: { viewerId: string | null; lang: CommunityLang; countView?: boolean }): Promise<Question> {
  const q = await findQuestion(idOrSlug);
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  // Removed is gone for everyone; pending only for its author.
  if (!q || q.status === "removed" || (q.status !== "published" && q.authorId !== input.viewerId) || hidden.includes(q.authorId)) throw new QaError("not_found", "There's no such question.");
  if (input.countView && q.status === "published") {
    await qaStore().addQuestionView(q.id);
    q.viewCount += 1;
  }
  const [summary] = await summaries([q], input.viewerId, input.lang);
  const answers = (await qaStore().listAnswers([q.id], { statuses: SHOWN, orAuthorId: input.viewerId })).filter((a) => !hidden.includes(a.authorId) && a.status !== "removed");
  const replies = (await qaStore().listReplies(answers.map((a) => a.id), { statuses: SHOWN, orAuthorId: input.viewerId })).filter((r) => !hidden.includes(r.authorId) && r.status !== "removed");
  const members = await membersOf([...answers.map((a) => a.authorId), ...replies.map((r) => r.authorId)]);
  const myVotes = input.viewerId ? await qaStore().votesOf(input.viewerId, "answer", answers.map((a) => a.id)) : {};
  const shown: Answer[] = answers.map((a) => ({
    id: a.id,
    questionId: a.questionId,
    body: a.body,
    author: members[a.authorId]!,
    official: a.official,
    accepted: q.acceptedAnswerId === a.id,
    score: a.score,
    myVote: myVotes[a.id] ?? 0,
    status: a.status,
    replyCount: a.replyCount,
    replies: replies
      .filter((r) => r.answerId === a.id)
      .slice(-INLINE_REPLIES)
      .map((r) => replyOf(r, members, input.viewerId)),
    canEdit: input.viewerId === a.authorId,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
  shown.sort((a, b) => Number(b.accepted) - Number(a.accepted) || Number(b.official) - Number(a.official) || b.score - a.score || a.createdAt.localeCompare(b.createdAt));
  return {
    ...summary!,
    body: q.body,
    myVote: input.viewerId ? await qaStore().getVote(input.viewerId, "question", q.id) : 0,
    canEdit: input.viewerId === q.authorId,
    canAccept: input.viewerId === q.authorId && q.status === "published",
    acceptedAnswerId: q.acceptedAnswerId,
    answers: shown,
  };
}

/** Questions like the one being asked, most alike first: shown before it is posted, so a member finds the answer that's there. */
export async function similarQuestions(input: { title: string; body?: string; section?: string; viewerId: string | null; lang: CommunityLang; limit?: number }): Promise<QuestionSummary[]> {
  const wanted = words(`${input.title} ${input.body ?? ""}`);
  if (!wanted.length) return [];
  const titleWords = words(input.title).slice(0, 8);
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  const seen = new Map<string, QuestionRecord>();
  for (const w of titleWords.length ? titleWords : wanted.slice(0, 8)) {
    for (const q of await qaStore().listQuestions({ statuses: SHOWN, words: [w], excludeAuthorIds: hidden }, "votes", { offset: 0, limit: 60 })) seen.set(q.id, q);
  }
  const ranked = [...seen.values()]
    .map((q) => ({ q, s: similarity(input, q) }))
    .filter((x) => x.s >= SIMILAR_MIN)
    .sort((a, b) => b.s - a.s || Number(b.q.acceptedAnswerId !== null) - Number(a.q.acceptedAnswerId !== null) || b.q.score - a.q.score)
    .slice(0, Math.min(input.limit ?? 5, 10))
    .map((x) => x.q);
  return summaries(ranked, input.viewerId, input.lang);
}

function check(text: unknown, min: number, max: number, field: string, what: string): string {
  if (typeof text !== "string") throw new QaError("invalid_request", `${what} is required.`, field);
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length < min) throw new QaError("invalid_request", `${what} is too short: at least ${min} characters.`, field);
  if (clean.length > max) throw new QaError("invalid_request", `${what} is too long: at most ${max} characters.`, field);
  return clean;
}

/** Stored as pending first, then moderation (area C) says whether it shows now; its status. */
async function moderated(memberId: string, kind: ModeratedKind, contentId: string, text: string, skip: boolean): Promise<ContentStatus> {
  if (skip) return "published";
  return qaHooks().moderate({ memberId, targetType: kind === "reply" ? "comment" : kind, targetId: contentId, text });
}

/**
 * A published post's words changed: moderation sees them again (an edit into
 * spam or a bad link is held), and a held one waits as pending, out of the
 * lists and counts, until a moderator approves it. The team's edits aren't held.
 */
async function moderateEdit(kind: "question" | "answer", post: { id: string; status: ContentStatus }, member: string, text: string, changed: boolean, now: Date): Promise<void> {
  if (!changed || post.status !== "published") return;
  const status = await moderated(member, kind, post.id, text, await isTeam(member));
  if (status === "pending") await setContentStatus(kind, post.id, "pending", now);
}

async function tagsFor(input: readonly string[] | undefined, now: Date): Promise<TagRecord[]> {
  const names: { slug: string; name: string }[] = [];
  for (const t of (input ?? []).map(tagOf)) if (t.slug && !names.some((n) => n.slug === t.slug)) names.push(t);
  if (names.length > LIMITS.tagsMax) throw new QaError("invalid_request", `At most ${LIMITS.tagsMax} tags.`, "tags");
  return Promise.all(names.map((t) => qaStore().ensureTag(t.slug, t.name, now)));
}

/** Asks a question in a section with up to five tags: shown at once, or once a moderator approves it (a new member's first posts). */
export async function askQuestion(
  viewerId: string | null,
  input: { section: string; title: string; body: string; tags?: readonly string[]; language?: CommunityLang; lang: CommunityLang },
  now = new Date(),
): Promise<Question> {
  const member = signedIn(viewerId);
  const title = check(typeof input.title === "string" ? input.title.replace(/\s+/g, " ") : input.title, LIMITS.titleMin, LIMITS.titleMax, "title", "The title");
  const body = check(input.body, LIMITS.bodyMin, LIMITS.bodyMax, "body", "The question");
  const section = (await sectionsOf("qa")).bySlug.get(input.section);
  if (!section) throw new QaError("invalid_request", "Choose a section.", "section");
  const tags = await tagsFor(input.tags, now);
  const team = await isTeam(member);
  const made = await qaStore().createQuestion({
    id: randomUUID(),
    slug: slugify(title, "question"),
    sectionId: section.id,
    tagIds: tags.map((t) => t.id),
    title,
    body,
    authorId: member,
    status: "pending",
    language: input.language ?? input.lang,
    viewCount: 0,
    answerCount: 0,
    score: 0,
    acceptedAnswerId: null,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });
  const status = await moderated(member, "question", made.id, `${title}\n${body}`, team);
  if (status !== "pending") await qaStore().updateQuestion(made.id, { status });
  return getQuestion(made.id, { viewerId: member, lang: input.lang });
}

/** The asker edits their question: its title, text, section and tags. */
export async function editQuestion(viewerId: string | null, idOrSlug: string, input: { title?: string; body?: string; section?: string; tags?: readonly string[]; lang: CommunityLang }, now = new Date()): Promise<Question> {
  const member = signedIn(viewerId);
  const q = await findQuestion(idOrSlug);
  if (!q || q.status === "removed") throw new QaError("not_found", "There's no such question.");
  if (q.authorId !== member) throw new QaError("not_allowed", "Only the member who asked can change the question.");
  const patch: Partial<QuestionRecord> = { updatedAt: now };
  if (input.title !== undefined) patch.title = check(input.title.replace(/\s+/g, " "), LIMITS.titleMin, LIMITS.titleMax, "title", "The title");
  if (input.body !== undefined) patch.body = check(input.body, LIMITS.bodyMin, LIMITS.bodyMax, "body", "The question");
  if (input.section !== undefined) {
    const section = (await sectionsOf("qa")).bySlug.get(input.section);
    if (!section) throw new QaError("invalid_request", "Choose a section.", "section");
    patch.sectionId = section.id;
  }
  if (input.tags !== undefined) patch.tagIds = (await tagsFor(input.tags, now)).map((t) => t.id);
  await qaStore().updateQuestion(q.id, patch);
  await moderateEdit("question", q, member, `${patch.title ?? q.title}\n${patch.body ?? q.body}`, patch.title !== undefined || patch.body !== undefined, now);
  return getQuestion(q.id, { viewerId: member, lang: input.lang });
}

/** The asker deletes their question (a moderator removes it with `setContentStatus`). */
export async function deleteQuestion(viewerId: string | null, idOrSlug: string, now = new Date()): Promise<void> {
  const member = signedIn(viewerId);
  const q = await findQuestion(idOrSlug);
  if (!q || q.status === "removed") throw new QaError("not_found", "There's no such question.");
  if (q.authorId !== member) throw new QaError("not_allowed", "Only the member who asked can delete the question.");
  await setContentStatus("question", q.id, "removed", now);
}

/**
 * Answers a question. Yallapp's team answers officially ("Yallapp Team"),
 * unless they send `official: false`; anyone else asking for it is refused.
 * The asker is told.
 */
export async function answerQuestion(viewerId: string | null, idOrSlug: string, input: { body: string; official?: boolean; lang: CommunityLang }, now = new Date()): Promise<Answer> {
  const member = signedIn(viewerId);
  const q = await findQuestion(idOrSlug);
  if (!q || q.status !== "published") throw new QaError("not_found", "There's no such question.");
  if ((await qaHooks().hiddenFor(member)).includes(q.authorId)) throw new QaError("not_allowed", "You can't answer this member.");
  const body = check(input.body, LIMITS.answerMin, LIMITS.answerMax, "body", "The answer");
  const team = await isTeam(member);
  if (input.official === true && !team) throw new QaError("not_allowed", "Only Yallapp's team answers officially.", "official");
  const official = team && input.official !== false;
  const answer: AnswerRecord = { id: randomUUID(), questionId: q.id, body, authorId: member, status: "pending", official, score: 0, replyCount: 0, createdAt: now, updatedAt: now };
  await qaStore().createAnswer(answer);
  const status = await moderated(member, "answer", answer.id, body, team);
  if (status === "published") await publishAnswer({ ...answer, status }, q, now);
  return (await getQuestion(q.id, { viewerId: member, lang: input.lang })).answers.find((a) => a.id === answer.id)!;
}

async function publishAnswer(a: AnswerRecord, q: QuestionRecord, now: Date): Promise<void> {
  await qaStore().updateAnswer(a.id, { status: "published" });
  await qaStore().addAnswerCount(q.id, 1, now);
  if (a.authorId !== q.authorId) {
    const actor = (await membersOf([a.authorId]))[a.authorId]!;
    await qaHooks().notify({ memberId: q.authorId, kind: a.official ? "official_answer" : "answer", actorId: a.authorId, targetType: "answer", targetId: a.id, data: { actor: actor.displayName, title: q.title }, link: answerLink(q, a.id) });
  }
}

export async function editAnswer(viewerId: string | null, answerId: string, input: { body: string; lang: CommunityLang }, now = new Date()): Promise<Answer> {
  const member = signedIn(viewerId);
  const a = await qaStore().getAnswer(answerId);
  if (!a || a.status === "removed") throw new QaError("not_found", "There's no such answer.");
  if (a.authorId !== member) throw new QaError("not_allowed", "Only its author can change an answer.");
  const body = check(input.body, LIMITS.answerMin, LIMITS.answerMax, "body", "The answer");
  await qaStore().updateAnswer(a.id, { body, updatedAt: now });
  await moderateEdit("answer", a, member, body, body !== a.body, now);
  return (await getQuestion(a.questionId, { viewerId: member, lang: input.lang })).answers.find((x) => x.id === a.id)!;
}

export async function deleteAnswer(viewerId: string | null, answerId: string, now = new Date()): Promise<void> {
  const member = signedIn(viewerId);
  const a = await qaStore().getAnswer(answerId);
  if (!a || a.status === "removed") throw new QaError("not_found", "There's no such answer.");
  if (a.authorId !== member) throw new QaError("not_allowed", "Only its author can delete an answer.");
  await setContentStatus("answer", a.id, "removed", now);
}

/** An answer's replies, oldest first (the question's page shows the newest few). */
export async function listReplies(answerId: string, input: { viewerId: string | null; cursor?: string | null; limit?: number }): Promise<Page<Reply>> {
  const a = await qaStore().getAnswer(answerId);
  const q = a ? await qaStore().getQuestion(a.questionId) : null;
  if (!a || !q || a.status !== "published" || q.status !== "published") throw new QaError("not_found", "There's no such answer.");
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  const all = (await qaStore().listReplies([a.id], { statuses: SHOWN, orAuthorId: input.viewerId })).filter((r) => !hidden.includes(r.authorId) && r.status !== "removed");
  const offset = offsetOf(input.cursor);
  const limit = pageOf(input.limit);
  const page = all.slice(offset, offset + limit);
  const members = await membersOf(page.map((r) => r.authorId));
  return { items: page.map((r) => replyOf(r, members, input.viewerId)), nextCursor: all.length > offset + limit ? cursorOf(offset + limit) : null };
}

/** A reply under an answer ("💬 5 replies"); the answer's author is told. */
export async function replyToAnswer(viewerId: string | null, answerId: string, input: { body: string; lang: CommunityLang }, now = new Date()): Promise<Reply> {
  const member = signedIn(viewerId);
  const a = await qaStore().getAnswer(answerId);
  const q = a ? await qaStore().getQuestion(a.questionId) : null;
  if (!a || !q || a.status !== "published" || q.status !== "published") throw new QaError("not_found", "There's no such answer.");
  // Neither the answer's author nor the asker blocked (or was blocked by) the member.
  const hidden = await qaHooks().hiddenFor(member);
  if (hidden.includes(a.authorId) || hidden.includes(q.authorId)) throw new QaError("not_allowed", "You can't reply to this member.");
  const body = check(input.body, 1, LIMITS.replyMax, "body", "The reply");
  const reply: ReplyRecord = { id: randomUUID(), answerId: a.id, body, authorId: member, status: "pending", createdAt: now };
  await qaStore().createReply(reply);
  const status = await moderated(member, "reply", reply.id, body, await isTeam(member));
  if (status === "published") await publishReply({ ...reply, status }, a, q, now);
  const members = await membersOf([member]);
  return replyOf({ ...reply, status }, members, member);
}

async function publishReply(r: ReplyRecord, a: AnswerRecord, q: QuestionRecord, now: Date): Promise<void> {
  await qaStore().updateReply(r.id, { status: "published" });
  await qaStore().addReplyCount(a.id, 1);
  await qaStore().updateQuestion(q.id, { lastActivityAt: now });
  if (r.authorId !== a.authorId) {
    const actor = (await membersOf([r.authorId]))[r.authorId]!;
    await qaHooks().notify({ memberId: a.authorId, kind: "reply", actorId: r.authorId, targetType: "reply", targetId: r.id, data: { actor: actor.displayName, title: q.title }, link: answerLink(q, a.id) });
  }
}

export async function deleteReply(viewerId: string | null, replyId: string, now = new Date()): Promise<void> {
  const member = signedIn(viewerId);
  const r = await qaStore().getReply(replyId);
  if (!r || r.status === "removed") throw new QaError("not_found", "There's no such reply.");
  if (r.authorId !== member) throw new QaError("not_allowed", "Only its author can delete a reply.");
  await setContentStatus("reply", r.id, "removed", now);
}

/** Scores at which the author is told their question or answer was voted up (not every vote). */
const VOTE_MILESTONES = [1, 10, 50, 100] as const;

/**
 * The member's vote on a question or answer: up, down, or taken back (0);
 * never on their own. The author earns or loses its points; at 1, 10, 50
 * and 100 they are told.
 */
export async function vote(viewerId: string | null, input: { kind: VoteKind; id: string; value: VoteValue }, now = new Date()): Promise<{ score: number; myVote: VoteValue }> {
  const member = signedIn(viewerId);
  if (![1, -1, 0].includes(input.value)) throw new QaError("invalid_request", "A vote is 1, -1 or 0.", "value");
  const target = input.kind === "question" ? await findQuestion(input.id) : await qaStore().getAnswer(input.id);
  if (!target || target.status !== "published") throw new QaError("not_found", `There's no such ${input.kind}.`);
  // An answer counts only under a question that is shown.
  if (input.kind === "answer" && (await qaStore().getQuestion((target as AnswerRecord).questionId))?.status !== "published") throw new QaError("not_found", "There's no such answer.");
  if (target.authorId === member) throw new QaError("not_allowed", "You can't vote on your own post.");
  if ((await qaHooks().hiddenFor(member)).includes(target.authorId)) throw new QaError("not_allowed", "You can't vote on this member's posts.");
  const { before, score } = await qaStore().castVote(member, input.kind, target.id, input.value, now);
  // The same vote again (or at once in parallel) changes nothing more.
  if (before === input.value) return { score, myVote: input.value };
  // Points: the vote's reason taken back, then given again for the new one.
  const ref = `${input.kind}:${target.id}:${member}`;
  const [up, down] = input.kind === "question" ? (["question_upvoted", "question_downvoted"] as const) : (["answer_upvoted", "answer_downvoted"] as const);
  await unaward(target.authorId, up, ref);
  await unaward(target.authorId, down, ref);
  if (input.value !== 0) {
    const reason = input.value > 0 ? up : down;
    await award({ id: randomUUID(), memberId: target.authorId, reason, points: POINTS[reason], ref, createdAt: now });
  }
  if (input.value === 1 && (VOTE_MILESTONES as readonly number[]).includes(score)) {
    const q = input.kind === "question" ? (target as QuestionRecord) : await qaStore().getQuestion((target as AnswerRecord).questionId);
    if (q) await qaHooks().notify({ memberId: target.authorId, kind: "vote_milestone", actorId: member, targetType: input.kind, targetId: target.id, data: { title: q.title, count: score }, link: input.kind === "question" ? questionLink(q) : answerLink(q, target.id) });
  }
  return { score, myVote: input.value };
}

/** The asker accepts one answer (another taken back) or takes theirs back; the answerer earns 25 points and is told. The question as it is now. */
export async function acceptAnswer(viewerId: string | null, answerId: string, on: boolean, lang: CommunityLang, now = new Date()): Promise<Question> {
  const member = signedIn(viewerId);
  const a = await qaStore().getAnswer(answerId);
  const q = a ? await qaStore().getQuestion(a.questionId) : null;
  if (!a || !q || a.status !== "published" || q.status !== "published") throw new QaError("not_found", "There's no such answer.");
  if (q.authorId !== member) throw new QaError("not_allowed", "Only the member who asked can accept an answer.");
  const previous = q.acceptedAnswerId;
  if (!on) {
    if (previous === a.id) {
      await qaStore().updateQuestion(q.id, { acceptedAnswerId: null });
      await unaward(a.authorId, "answer_accepted", a.id);
      await unaward(member, "accepted_an_answer", q.id);
    }
  } else if (previous !== a.id) {
    if (previous) {
      const old = await qaStore().getAnswer(previous);
      if (old) await unaward(old.authorId, "answer_accepted", old.id);
    }
    await qaStore().updateQuestion(q.id, { acceptedAnswerId: a.id, lastActivityAt: now });
    await unaward(member, "accepted_an_answer", q.id);
    if (a.authorId !== member) {
      await award({ id: randomUUID(), memberId: a.authorId, reason: "answer_accepted", points: POINTS.answer_accepted, ref: a.id, createdAt: now });
      await award({ id: randomUUID(), memberId: member, reason: "accepted_an_answer", points: POINTS.accepted_an_answer, ref: q.id, createdAt: now });
      const actor = (await membersOf([member]))[member]!;
      await qaHooks().notify({ memberId: a.authorId, kind: "answer_accepted", actorId: member, targetType: "answer", targetId: a.id, data: { actor: actor.displayName, title: q.title, count: POINTS.answer_accepted }, link: answerLink(q, a.id) });
    }
  }
  return getQuestion(q.id, { viewerId: member, lang });
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
  const [qIds, tIds] = await Promise.all([qaStore().bookmarksOf(member, "question"), qaStore().bookmarksOf(member, "tutorial")]);
  const qs = qIds.length ? await qaStore().listQuestions({ statuses: SHOWN, ids: qIds }, "newest", { offset: 0, limit: 500 }) : [];
  const ts = tIds.length ? await qaStore().listTutorials({ statuses: SHOWN, ids: tIds }, { offset: 0, limit: 500 }) : [];
  const order = (ids: string[]) => (a: { id: string }, b: { id: string }) => ids.indexOf(a.id) - ids.indexOf(b.id);
  return { questions: (await summaries(qs, member, lang)).sort(order(qIds)), tutorials: (await tutorialSummaries(ts, member, lang)).sort(order(tIds)) };
}

// ——— Moderation (area C's queue, reports and notices) ———

export type QaContentKind = "question" | "answer" | "reply" | "tutorial";

/**
 * Shows, holds or removes a question, answer, reply or tutorial: area C's
 * queue approving ("published") or rejecting ("hidden" or "removed"), a
 * moderator's removal, an author deleting their own. Counts follow: an
 * answer no longer shown no longer counts on its question, nor stays
 * accepted. False when there's no such post.
 */
export async function setContentStatus(kind: QaContentKind, id: string, status: ContentStatus | "hidden", now = new Date()): Promise<boolean> {
  const next: ContentStatus = status === "hidden" ? "removed" : status;
  if (kind === "question") {
    const q = await qaStore().getQuestion(id);
    if (!q) return false;
    if (q.status !== next) await qaStore().updateQuestion(id, { status: next, updatedAt: now });
    return true;
  }
  if (kind === "tutorial") {
    const t = await qaStore().getTutorial(id);
    if (!t) return false;
    if (t.status === next) return true;
    await qaStore().updateTutorial(id, { status: next, updatedAt: now, ...(next === "published" && !t.publishedAt ? { publishedAt: now } : {}) });
    if (next === "published") await award({ id: randomUUID(), memberId: t.authorId, reason: "tutorial_published", points: POINTS.tutorial_published, ref: t.id, createdAt: now });
    else if (t.status === "published") await unaward(t.authorId, "tutorial_published", t.id);
    return true;
  }
  if (kind === "answer") {
    const a = await qaStore().getAnswer(id);
    const q = a ? await qaStore().getQuestion(a.questionId) : null;
    if (!a || !q) return false;
    if (a.status === next) return true;
    if (next === "published") return publishAnswer(a, q, now).then(() => true);
    await qaStore().updateAnswer(id, { status: next });
    if (a.status === "published") {
      await qaStore().addAnswerCount(q.id, -1, null);
      if (q.acceptedAnswerId === a.id) {
        await qaStore().updateQuestion(q.id, { acceptedAnswerId: null });
        await unaward(a.authorId, "answer_accepted", a.id);
      }
    }
    return true;
  }
  const r = await qaStore().getReply(id);
  const a = r ? await qaStore().getAnswer(r.answerId) : null;
  const q = a ? await qaStore().getQuestion(a.questionId) : null;
  if (!r || !a || !q) return false;
  if (r.status === next) return true;
  if (next === "published") return publishReply(r, a, q, now).then(() => true);
  await qaStore().updateReply(id, { status: next });
  if (r.status === "published") await qaStore().addReplyCount(a.id, -1);
  return true;
}

/** What notices, reports and the moderation queue show of a post (area C): its author, a title and its address; null when there's none. */
export async function contentInfo(kind: QaContentKind, id: string): Promise<{ memberId: string; title: string; link: string; status: ContentStatus; text: string } | null> {
  if (kind === "question") {
    const q = await qaStore().getQuestion(id);
    return q && { memberId: q.authorId, title: q.title, link: questionLink(q), status: q.status, text: q.body };
  }
  if (kind === "answer") {
    const a = await qaStore().getAnswer(id);
    const q = a ? await qaStore().getQuestion(a.questionId) : null;
    return a && q && { memberId: a.authorId, title: q.title, link: answerLink(q, a.id), status: a.status, text: a.body };
  }
  if (kind === "reply") {
    const r = await qaStore().getReply(id);
    const a = r ? await qaStore().getAnswer(r.answerId) : null;
    const q = a ? await qaStore().getQuestion(a.questionId) : null;
    return r && a && q && { memberId: r.authorId, title: q.title, link: answerLink(q, a.id), status: r.status, text: r.body };
  }
  const t = await qaStore().getTutorial(id);
  return t && { memberId: t.authorId, title: t.title, link: tutorialLink(t), status: t.status, text: t.body };
}

// ——— Search ———

export type SearchType = "all" | "questions" | "tutorials" | "members" | "tags";

/**
 * Questions, tutorials, members and tags: those with every word searched,
 * or (when none has all) with some, the most first; questions with an
 * accepted answer and more votes first.
 */
export async function search(input: { q: string; type?: SearchType; viewerId: string | null; lang: CommunityLang; section?: string; limit?: number }): Promise<{ questions: QuestionSummary[]; tutorials: TutorialSummary[]; members: MemberSummary[]; tags: Tag[] }> {
  const none = { questions: [], tutorials: [], members: [], tags: [] };
  const text = input.q.trim();
  const wanted = words(text).slice(0, 8);
  if (text.length < LIMITS.searchMin) return none;
  const limit = Math.min(input.limit ?? 10, LIMITS.pageMax);
  const type = input.type ?? "all";
  const want = (t: SearchType) => type === "all" || type === t;
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  const section = input.section ? (await sectionsOf("qa")).bySlug.get(input.section) : undefined;
  if (input.section && !section) return none;
  const hits = (hay: string) => wanted.filter((w) => hay.normalize("NFKC").toLocaleLowerCase("en").includes(w)).length;

  let questions: QuestionRecord[] = [];
  if (want("questions") && wanted.length) {
    const base: QuestionFilter = { statuses: SHOWN, sectionIds: section ? [section.id] : undefined, excludeAuthorIds: hidden };
    let found = await qaStore().listQuestions({ ...base, words: wanted }, "votes", { offset: 0, limit: 100 });
    if (!found.length && wanted.length > 1) {
      const any = new Map<string, QuestionRecord>();
      for (const w of wanted) for (const q of await qaStore().listQuestions({ ...base, words: [w] }, "votes", { offset: 0, limit: 50 })) any.set(q.id, q);
      found = [...any.values()];
    }
    questions = found
      .map((q) => ({ q, s: hits(`${q.title} ${q.body}`) + similarity({ title: text }, q) + (q.acceptedAnswerId ? 0.1 : 0) + Math.min(q.score, 50) / 500 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.q);
  }
  let tutorials: TutorialRecord[] = [];
  if (want("tutorials") && wanted.length) {
    const tutorialSection = input.section ? (await sectionsOf("tutorial")).bySlug.get(input.section) : undefined;
    const base = { statuses: SHOWN, sectionId: tutorialSection?.id };
    tutorials = await qaStore().listTutorials({ ...base, words: wanted }, { offset: 0, limit });
    if (!tutorials.length && wanted.length > 1) {
      const any = new Map<string, TutorialRecord>();
      for (const w of wanted) for (const t of await qaStore().listTutorials({ ...base, words: [w] }, { offset: 0, limit: 50 })) any.set(t.id, t);
      tutorials = [...any.values()].sort((a, b) => hits(`${b.title} ${b.summary} ${b.body}`) - hits(`${a.title} ${a.summary} ${a.body}`)).slice(0, limit);
    }
  }
  const members = want("members") ? (await qaHooks().searchMembers(text, limit)).filter((m) => !hidden.includes(m.id)) : [];
  const ranked = members.length ? await membersOf(members.map((m) => m.id)) : {};
  return {
    questions: await summaries(questions, input.viewerId, input.lang),
    tutorials: await tutorialSummaries(tutorials, input.viewerId, input.lang),
    members: members.map((m) => ({ ...m, rank: m.rank ?? ranked[m.id]?.rank ?? "newcomer" })),
    tags: want("tags") ? await listTags({ q: text, limit }) : [],
  };
}

// ——— The home page and the side rail ———

/** Unanswered questions in the member's sections (all sections without them), newest first, never their own: "Questions waiting for your answer". */
export async function waitingForAnswer(input: { viewerId: string | null; lang: CommunityLang; limit?: number }): Promise<{ items: QuestionSummary[]; total: number; inMySections: boolean }> {
  const mine = input.viewerId ? await qaStore().followedSectionIds(input.viewerId) : [];
  const hidden = input.viewerId ? await qaHooks().hiddenFor(input.viewerId) : [];
  const filter: QuestionFilter = { statuses: SHOWN, unanswered: true, sectionIds: mine.length ? mine : undefined, excludeAuthorIds: [...hidden, ...(input.viewerId ? [input.viewerId] : [])] };
  const [records, total] = await Promise.all([qaStore().listQuestions(filter, "newest", { offset: 0, limit: Math.min(input.limit ?? 3, 20) }), qaStore().countQuestions(filter)]);
  return { items: await summaries(records, input.viewerId, input.lang), total, inMySections: mine.length > 0 };
}

/** The home page's figures: the questions, the share with an answer, those asked since a date ("12 new"). */
export async function qaStats(input: { since: Date }): Promise<{ questions: number; answeredRate: number; newCount: number }> {
  const [all, unanswered, newCount] = await Promise.all([
    qaStore().countQuestions({ statuses: SHOWN }),
    qaStore().countQuestions({ statuses: SHOWN, unanswered: true }),
    qaStore().countQuestions({ statuses: SHOWN, since: input.since }),
  ]);
  return { questions: all, answeredRate: all ? Math.round(((all - unanswered) / all) * 100) : 0, newCount };
}

/** "Most active this week": the members who earned the most points in the last `days`, with their accepted answers. */
export async function activeMembers(input: { days?: number; limit?: number; now?: Date } = {}): Promise<{ member: MemberSummary; points: number; acceptedAnswers: number }[]> {
  const since = new Date((input.now ?? new Date()).getTime() - (input.days ?? 7) * 86_400_000);
  const top = await qaStore().topEarners(since, Math.min(input.limit ?? 3, 20));
  const members = await membersOf(top.map((t) => t.memberId));
  return Promise.all(top.map(async (t) => ({ member: members[t.memberId]!, points: t.points, acceptedAnswers: await qaStore().countAnswers({ authorId: t.memberId, statuses: SHOWN, accepted: true }) })));
}

/** What badges (area C's Blue badge) and profiles (area A's "1,240 pts") read of a member's Q&A. */
export async function memberStats(memberId: string): Promise<MemberQaStats> {
  const [points, questions, answers, accepted, tutorials, last] = await Promise.all([
    qaStore().pointsOf([memberId]),
    qaStore().countQuestions({ statuses: SHOWN, authorIds: [memberId] }),
    qaStore().countAnswers({ authorId: memberId, statuses: SHOWN }),
    qaStore().countAnswers({ authorId: memberId, statuses: SHOWN, accepted: true }),
    qaStore().countTutorials({ statuses: SHOWN, authorId: memberId }),
    qaStore().lastActivityOf(memberId),
  ]);
  return { points: points[memberId] ?? 0, questions, answers, acceptedAnswers: accepted, approvedTutorials: tutorials, lastActiveAt: last?.toISOString() ?? null };
}

/** A member's last few posts' texts, newest first: area C's duplicate-post check. */
export async function recentTexts(memberId: string, limit = 5): Promise<string[]> {
  const [qs, as] = await Promise.all([
    qaStore().listQuestions({ authorIds: [memberId] }, "newest", { offset: 0, limit }),
    qaStore().countAnswers({ authorId: memberId }).then(async (n) => (n ? qaStore().answersBy(memberId, limit) : [])),
  ]);
  return [...qs.map((q) => ({ at: q.createdAt, text: `${q.title}\n${q.body}` })), ...as.map((a) => ({ at: a.createdAt, text: a.body }))]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit)
    .map((x) => x.text);
}

/** The points of several members at once (their rank beside their name). */
export async function pointsOf(memberIds: readonly string[]): Promise<Record<string, number>> {
  return qaStore().pointsOf(memberIds);
}

// ——— Tutorials ———

async function findTutorial(idOrSlug: string): Promise<TutorialRecord | null> {
  return (await qaStore().getTutorial(idOrSlug)) ?? (await qaStore().getTutorialBySlug(idOrSlug));
}

async function tutorialSummaries(records: TutorialRecord[], viewerId: string | null, lang: CommunityLang): Promise<TutorialSummary[]> {
  if (!records.length) return [];
  const { byId } = await sectionsOf("tutorial");
  const [members, saved] = await Promise.all([membersOf(records.map((t) => t.authorId)), viewerId ? qaStore().bookmarksOf(viewerId, "tutorial", records.map((t) => t.id)) : Promise.resolve([] as string[])]);
  const savedSet = new Set(saved);
  return records.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    kind: t.kind,
    level: t.level,
    language: t.language,
    section: sectionOf(byId.get(t.sectionId), lang),
    coverUrl: t.coverUrl,
    durationSeconds: t.durationSeconds,
    durationMinutes: Math.max(1, Math.ceil(t.durationSeconds / 60)),
    official: t.official,
    tags: t.tags,
    author: members[t.authorId]!,
    viewCount: t.viewCount,
    bookmarked: savedSet.has(t.id),
    publishedAt: (t.publishedAt ?? t.createdAt).toISOString(),
    status: t.status,
  }));
}

/** The published tutorials, newest first: by section, level, language and kind. */
export async function listTutorials(input: { viewerId: string | null; lang: CommunityLang; section?: string; level?: TutorialLevel; language?: CommunityLang; kind?: TutorialKind; author?: string; cursor?: string | null; limit?: number }): Promise<Page<TutorialSummary>> {
  const limit = pageOf(input.limit);
  const offset = offsetOf(input.cursor);
  const section = input.section ? (await sectionsOf("tutorial")).bySlug.get(input.section) : undefined;
  if (input.section && !section) return { items: [], nextCursor: null };
  const records = await qaStore().listTutorials({ statuses: SHOWN, sectionId: section?.id, level: input.level, language: input.language, kind: input.kind, authorId: input.author }, { offset, limit: limit + 1 });
  return { items: await tutorialSummaries(records.slice(0, limit), input.viewerId, input.lang), nextCursor: records.length > limit ? cursorOf(offset + limit) : null };
}

/** One tutorial by id or address; one more view when `countView`. */
export async function getTutorial(idOrSlug: string, input: { viewerId: string | null; lang: CommunityLang; countView?: boolean }): Promise<Tutorial> {
  const t = await findTutorial(idOrSlug);
  // The author sees their own while it waits for review.
  const own = !!t && !!input.viewerId && t.authorId === input.viewerId && t.status !== "removed";
  if (!t || (t.status !== "published" && !own)) throw new QaError("not_found", "There's no such tutorial.");
  if (input.countView) {
    await qaStore().addTutorialView(t.id);
    t.viewCount += 1;
  }
  const [summary] = await tutorialSummaries([t], input.viewerId, input.lang);
  // Every tutorial is free, always (the owner): its whole text and video for everyone.
  return { ...summary!, body: t.body, videoUrl: t.videoUrl };
}

const VIDEO_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com|yallapp\.com\.tr|[\w-]+\.yallapp\.com\.tr)\//i;

/**
 * A member writes a tutorial (233): the team's are "Official" and show at
 * once; a member's go through moderation (area C), so the first ones are
 * reviewed. An article (Markdown; its reading time from its length) or a
 * video (its address on YouTube, Vimeo or Yallapp, and its length).
 */
export async function publishTutorial(
  authorId: string | null,
  input: { title: string; summary: string; kind: TutorialKind; section: string; level: TutorialLevel; language: CommunityLang; body: string; videoUrl?: string | null; durationSeconds?: number; coverUrl?: string | null; tags?: readonly string[]; official?: boolean },
  now = new Date(),
): Promise<Tutorial> {
  const author = signedIn(authorId);
  // 233 Members write tutorials too; "Official" stays the team's.
  const team = await isTeam(author);
  if (input.official === true && !team) throw new QaError("not_allowed", "Only Yallapp's team publishes official tutorials.", "official");
  const title = check(typeof input.title === "string" ? input.title.replace(/\s+/g, " ") : input.title, LIMITS.titleMin, LIMITS.titleMax, "title", "The title");
  const summary = check(input.summary, 10, 400, "summary", "The summary");
  if (input.kind !== "article" && input.kind !== "video") throw new QaError("invalid_request", "A tutorial is an article or a video.", "kind");
  if (!["beginner", "intermediate", "advanced"].includes(input.level)) throw new QaError("invalid_request", "Choose a level.", "level");
  if (!["en", "ar", "tr"].includes(input.language)) throw new QaError("invalid_request", "Choose its language.", "language");
  const section = (await sectionsOf("tutorial")).bySlug.get(input.section);
  if (!section) throw new QaError("invalid_request", "Choose a section.", "section");
  if (input.coverUrl && !/^https:\/\//i.test(input.coverUrl)) throw new QaError("invalid_request", "The cover is an https address.", "coverUrl");
  let body: string;
  let videoUrl: string | null = null;
  let durationSeconds: number;
  if (input.kind === "video") {
    if (!input.videoUrl || !VIDEO_HOSTS.test(input.videoUrl)) throw new QaError("invalid_request", "Give the video's address on YouTube, Vimeo or Yallapp.", "videoUrl");
    videoUrl = input.videoUrl;
    durationSeconds = Math.round(input.durationSeconds ?? 0);
    if (durationSeconds < 1 || durationSeconds > 6 * 3600) throw new QaError("invalid_request", "Give the video's length.", "durationSeconds");
    body = (input.body ?? "").trim().slice(0, LIMITS.bodyMax);
  } else {
    body = check(input.body, LIMITS.bodyMin, LIMITS.bodyMax * 5, "body", "The article");
    // About 200 words a minute.
    durationSeconds = Math.max(60, Math.round((body.split(/\s+/).length / 200) * 60));
  }
  const tags = (await tagsFor(input.tags, now)).map((t) => t.slug);
  const created = await qaStore().createTutorial({
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
    durationSeconds,
    coverUrl: input.coverUrl ?? null,
    tags,
    authorId: author,
    official: team && input.official !== false,
    status: "pending",
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  });
  // A member's first ones are reviewed (area C's moderation); the team's show at once. Points come once it's published.
  const status = await moderated(author, "tutorial", created.id, `${title}\n${summary}\n${body}`, team);
  if (status === "published") await setContentStatus("tutorial", created.id, "published", now);
  return getTutorial(created.id, { viewerId: author, lang: input.language });
}
