import { withQa } from "../qa/hooks";
import * as qa from "../qa/service";
import { QaError, type CommunityLang, type QuestionFilterName, type QuestionSort, type TutorialKind, type TutorialLevel, type VoteValue } from "../qa/types";
import { CommunityError, noContent, ok, requireMember, str, tooMany, type CommunityContext, type CommunityResult, type CommunityRoute } from "./http";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { hasWord } from "../i18n";
import { isYallappTeam } from "../staff";
import { qaHooksFor } from "./qa-hooks";

/**
 * 231 Area B's routes (docs/api/community.yaml: Q&A, Tutorials, Search).
 * Each runs with the call's store and hooks (`withQa`), answers in the
 * API's snake_case, and turns the Q&A's errors into the API's: the field at
 * fault with its message in the reader's language ("qa.invalid.{field}").
 */

const LANGS = ["en", "ar", "tr"] as const;
const FILTERS = ["all", "unanswered", "answered", "official", "following", "for_you"] as const;
const SORTS = ["active", "newest", "votes"] as const;

type Handler = (ctx: CommunityContext) => Promise<CommunityResult>;

/** Per member an hour (writes), per IP a minute (public search): enough for anyone, too few to spam or scrape with. */
export const QA_LIMITS = {
  ask: { name: "community-qa-ask:member", limit: 10, windowSeconds: 60 * 60 },
  answer: { name: "community-qa-answer:member", limit: 30, windowSeconds: 60 * 60 },
  reply: { name: "community-qa-reply:member", limit: 60, windowSeconds: 60 * 60 },
  edit: { name: "community-qa-edit:member", limit: 60, windowSeconds: 60 * 60 },
  vote: { name: "community-qa-vote:member", limit: 200, windowSeconds: 60 * 60 },
  save: { name: "community-qa-save:member", limit: 300, windowSeconds: 60 * 60 },
  follow: { name: "community-qa-follow:member", limit: 120, windowSeconds: 60 * 60 },
  publish: { name: "community-qa-publish:member", limit: 30, windowSeconds: 60 * 60 },
  search: { name: "community-qa-search:ip", limit: 60, windowSeconds: 60 },
  similar: { name: "community-qa-similar:ip", limit: 120, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/** One more of the rule: per the signed-in member for writes, per IP for public reads; 429 too_many_attempts past it. */
async function limit(ctx: CommunityContext, rule: keyof typeof QA_LIMITS): Promise<void> {
  const subject = rule === "search" || rule === "similar" ? ctx.deps.ip : (ctx.member?.id ?? ctx.deps.ip);
  const hit = await hitRateLimit(ctx.deps.platform, QA_LIMITS[rule], subject, ctx.now);
  if (!hit.allowed) tooMany(hit.retryAfter);
}

/** The handler after one more of the rule. */
const limited =
  (rule: keyof typeof QA_LIMITS, handler: Handler): Handler =>
  async (ctx) => {
    await limit(ctx, rule);
    return handler(ctx);
  };

/** Runs a handler with this call's Q&A store and hooks; a vote refused is 400 (docs: NotAllowed), other refusals 403. */
function run(handler: Handler, options: { refusedStatus?: number } = {}): Handler {
  return async (ctx) => {
    try {
      return await withQa(ctx.store.qa, qaHooksFor(ctx), () => handler(ctx));
    } catch (error) {
      if (!(error instanceof QaError)) throw error;
      const status = error.code === "not_allowed" ? (options.refusedStatus ?? 403) : error.status;
      const field = error.field ? snake(error.field) : null;
      const fields = error.code === "invalid_request" && field ? { [field]: hasWord(`qa.invalid.${field}`) ? `qa.invalid.${field}` : "error.invalid_request" } : undefined;
      throw new CommunityError(status, error.code === "conflict" ? "invalid_request" : error.code, fields);
    }
  };
}

const viewer = (ctx: CommunityContext) => ctx.member?.id ?? null;
const lang = (ctx: CommunityContext): CommunityLang => ctx.lang;
const oneOf = <T extends string>(values: readonly T[], value: string | null | undefined): T | undefined => (values as readonly string[]).includes(value ?? "") ? (value as T) : undefined;
const limitOf = (ctx: CommunityContext, fallback = 20, max = 50) => Math.min(max, Math.max(1, Number.parseInt(ctx.query.get("limit") ?? "", 10) || fallback));
const tagsIn = (value: unknown): string[] | undefined => (Array.isArray(value) ? value.filter((t): t is string => typeof t === "string") : undefined);
const voteOf = (body: Record<string, unknown>): VoteValue => (body.value === 1 || body.value === -1 || body.value === 0 ? body.value : (NaN as VoteValue));

// ——— Snake case on the wire ———

function snake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** The Q&A's objects as the API shows them: snake_case keys, dates as ISO text. */
export function wire(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(wire);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [snake(k), wire(v)]));
  return value;
}

const page = <T>(p: { items: T[]; nextCursor: string | null }) => ({ items: wire(p.items), next_cursor: p.nextCursor });

// ——— Q&A ———

const listSections: Handler = async (ctx) => ok({ items: wire(await qa.listSections({ kind: "qa", viewerId: viewer(ctx), lang: lang(ctx) })) });

const followSection =
  (on: boolean): Handler =>
  async (ctx) => {
    const member = requireMember(ctx).member;
    await qa.followSection(member.id, ctx.params.section!, on, ctx.now);
    return noContent();
  };

const listTags: Handler = async (ctx) => ok({ items: wire(await qa.listTags({ q: ctx.query.get("q") ?? undefined, section: ctx.query.get("section") ?? undefined, limit: limitOf(ctx) })) });

const listQuestions: Handler = async (ctx) =>
  ok(
    page(
      await qa.listQuestions({
        viewerId: viewer(ctx),
        lang: lang(ctx),
        filter: oneOf<QuestionFilterName>(FILTERS, ctx.query.get("filter")) ?? "all",
        sort: oneOf<QuestionSort>(SORTS, ctx.query.get("sort")) ?? "active",
        section: ctx.query.get("section") ?? undefined,
        tag: ctx.query.get("tag") ?? undefined,
        author: ctx.query.get("author") ?? undefined,
        language: oneOf(LANGS, ctx.query.get("language")),
        cursor: ctx.query.get("cursor"),
        limit: limitOf(ctx),
      }),
    ),
  );

const ask: Handler = async (ctx) => {
  const member = requireMember(ctx).member;
  const body = ctx.json();
  const question = await qa.askQuestion(
    member.id,
    { section: str(body, "section") ?? "", title: str(body, "title") as string, body: str(body, "body") as string, tags: tagsIn(body.tags), language: oneOf(LANGS, str(body, "language")) ?? lang(ctx), lang: lang(ctx) },
    ctx.now,
  );
  return ok(wire(question), 201);
};

const similar: Handler = async (ctx) =>
  ok({ items: wire(await qa.similarQuestions({ title: ctx.query.get("title") ?? "", body: ctx.query.get("body") ?? undefined, section: ctx.query.get("section") ?? undefined, viewerId: viewer(ctx), lang: lang(ctx), limit: limitOf(ctx, 5, 10) })) });

const getQuestion: Handler = async (ctx) => ok(wire(await qa.getQuestion(ctx.params.question_id!, { viewerId: viewer(ctx), lang: lang(ctx), countView: ctx.query.get("view") !== "0" })));

const editQuestion: Handler = async (ctx) => {
  const body = ctx.json();
  const question = await qa.editQuestion(
    requireMember(ctx).member.id,
    ctx.params.question_id!,
    { title: str(body, "title"), body: str(body, "body"), section: str(body, "section"), tags: tagsIn(body.tags), lang: lang(ctx) },
    ctx.now,
  );
  return ok(wire(question));
};

/** One's own question is deleted; Yallapp's team (lib/community/staff.ts) removes anyone's. */
const deleteQuestion: Handler = async (ctx) => {
  const member = requireMember(ctx).member;
  try {
    await qa.deleteQuestion(member.id, ctx.params.question_id!, ctx.now);
  } catch (error) {
    if (!(error instanceof QaError && error.code === "not_allowed" && (await isYallappTeam(ctx, ctx.deps.platform, member)))) throw error;
    const q = (await ctx.store.qa.getQuestion(ctx.params.question_id!)) ?? (await ctx.store.qa.getQuestionBySlug(ctx.params.question_id!));
    if (!q) throw error;
    await qa.setContentStatus("question", q.id, "removed", ctx.now);
  }
  return noContent();
};

const voteOn =
  (kind: "question" | "answer", param: string): Handler =>
  async (ctx) => {
    const result = await qa.vote(requireMember(ctx).member.id, { kind, id: ctx.params[param]!, value: voteOf(ctx.json()) }, ctx.now);
    return ok({ score: result.score, my_vote: result.myVote });
  };

const bookmarkOn =
  (kind: "question" | "tutorial", param: string, on: boolean): Handler =>
  async (ctx) => {
    await qa.bookmark(requireMember(ctx).member.id, { kind, id: ctx.params[param]!, on }, ctx.now);
    return noContent();
  };

const answer: Handler = async (ctx) => {
  const body = ctx.json();
  const official = body.official === true ? true : body.official === false ? false : undefined;
  return ok(wire(await qa.answerQuestion(requireMember(ctx).member.id, ctx.params.question_id!, { body: str(body, "body") as string, official, lang: lang(ctx) }, ctx.now)), 201);
};

const editAnswer: Handler = async (ctx) => ok(wire(await qa.editAnswer(requireMember(ctx).member.id, ctx.params.answer_id!, { body: str(ctx.json(), "body") as string, lang: lang(ctx) }, ctx.now)));

const deleteAnswer: Handler = async (ctx) => {
  await qa.deleteAnswer(requireMember(ctx).member.id, ctx.params.answer_id!, ctx.now);
  return noContent();
};

const accept =
  (on: boolean): Handler =>
  async (ctx) =>
    ok(wire(await qa.acceptAnswer(requireMember(ctx).member.id, ctx.params.answer_id!, on, lang(ctx), ctx.now)));

const listReplies: Handler = async (ctx) => ok(page(await qa.listReplies(ctx.params.answer_id!, { viewerId: viewer(ctx), cursor: ctx.query.get("cursor"), limit: limitOf(ctx) })));

const reply: Handler = async (ctx) => ok(wire(await qa.replyToAnswer(requireMember(ctx).member.id, ctx.params.answer_id!, { body: str(ctx.json(), "body") as string, lang: lang(ctx) }, ctx.now)), 201);

const deleteReply: Handler = async (ctx) => {
  await qa.deleteReply(requireMember(ctx).member.id, ctx.params.reply_id!, ctx.now);
  return noContent();
};

const saved: Handler = async (ctx) => ok(wire(await qa.saved(requireMember(ctx).member.id, lang(ctx))));

/** The Q&A home's side panels: questions waiting for an answer (the viewer's sections first), this week's figures and its most helpful members. */
const home: Handler = async (ctx) => {
  const week = new Date(ctx.now.getTime() - 7 * 86_400_000);
  const [waiting, stats, active] = await Promise.all([
    qa.waitingForAnswer({ viewerId: viewer(ctx), lang: lang(ctx), limit: limitOf(ctx, 5, 20) }),
    qa.qaStats({ since: week }),
    qa.activeMembers({ days: 7, limit: 5, now: ctx.now }),
  ]);
  return ok(wire({ waiting, stats, activeMembers: active }));
};

// ——— Tutorials and search ———

const tutorialSections: Handler = async (ctx) => ok({ items: wire(await qa.listSections({ kind: "tutorial", viewerId: viewer(ctx), lang: lang(ctx) })) });

const listTutorials: Handler = async (ctx) =>
  ok(
    page(
      await qa.listTutorials({
        viewerId: viewer(ctx),
        lang: lang(ctx),
        section: ctx.query.get("section") ?? undefined,
        level: oneOf<TutorialLevel>(["beginner", "intermediate", "advanced"], ctx.query.get("level")),
        kind: oneOf<TutorialKind>(["article", "video"], ctx.query.get("kind")),
        language: oneOf(LANGS, ctx.query.get("language")),
        cursor: ctx.query.get("cursor"),
        limit: limitOf(ctx),
      }),
    ),
  );

const getTutorial: Handler = async (ctx) => ok(wire(await qa.getTutorial(ctx.params.tutorial!, { viewerId: viewer(ctx), lang: lang(ctx), countView: ctx.query.get("view") !== "0" })));

/** Yallapp's team publishes an official tutorial. */
const publishTutorial: Handler = async (ctx) => {
  const body = ctx.json();
  const duration = typeof body.duration_seconds === "number" ? body.duration_seconds : undefined;
  const tutorial = await qa.publishTutorial(
    requireMember(ctx).member.id,
    {
      title: str(body, "title") as string,
      summary: str(body, "summary") ?? "",
      kind: str(body, "kind") as TutorialKind,
      section: str(body, "section") ?? "",
      level: str(body, "level") as TutorialLevel,
      language: (str(body, "language") ?? lang(ctx)) as CommunityLang,
      body: str(body, "body") ?? "",
      videoUrl: str(body, "video_url") ?? null,
      durationSeconds: duration,
      coverUrl: str(body, "cover_url") ?? null,
      tags: tagsIn(body.tags),
    },
    ctx.now,
  );
  return ok(wire(tutorial), 201);
};

const search: Handler = async (ctx) =>
  ok(
    wire(
      await qa.search({
        q: ctx.query.get("q") ?? "",
        type: oneOf<qa.SearchType>(["all", "questions", "tutorials", "members", "tags"], ctx.query.get("type")) ?? "all",
        section: ctx.query.get("section") ?? undefined,
        viewerId: viewer(ctx),
        lang: lang(ctx),
        limit: limitOf(ctx, 10),
      }),
    ),
  );

const publicRoute = (method: CommunityRoute["method"], path: string, handler: Handler): CommunityRoute => ({ method, path, auth: "public", handler: run(handler) });
const memberRoute = (method: CommunityRoute["method"], path: string, handler: Handler, options?: { refusedStatus?: number }): CommunityRoute => ({ method, path, handler: run(handler, options) });

export const QA_ROUTES: CommunityRoute[] = [
  // Sections and tags
  publicRoute("GET", "/qa/sections", listSections),
  memberRoute("PUT", "/qa/sections/:section/follow", limited("follow", followSection(true))),
  memberRoute("DELETE", "/qa/sections/:section/follow", limited("follow", followSection(false))),
  publicRoute("GET", "/qa/tags", listTags),
  publicRoute("GET", "/qa/home", home),
  memberRoute("GET", "/qa/saved", saved),
  // Questions
  publicRoute("GET", "/qa/questions", listQuestions),
  memberRoute("POST", "/qa/questions", limited("ask", ask)),
  publicRoute("GET", "/qa/questions/similar", limited("similar", similar)),
  publicRoute("GET", "/qa/questions/:question_id", getQuestion),
  memberRoute("PATCH", "/qa/questions/:question_id", limited("edit", editQuestion)),
  memberRoute("DELETE", "/qa/questions/:question_id", deleteQuestion),
  memberRoute("PUT", "/qa/questions/:question_id/vote", limited("vote", voteOn("question", "question_id")), { refusedStatus: 400 }),
  memberRoute("PUT", "/qa/questions/:question_id/bookmark", limited("save", bookmarkOn("question", "question_id", true))),
  memberRoute("DELETE", "/qa/questions/:question_id/bookmark", limited("save", bookmarkOn("question", "question_id", false))),
  memberRoute("POST", "/qa/questions/:question_id/answers", limited("answer", answer)),
  // Answers and replies
  memberRoute("PATCH", "/qa/answers/:answer_id", limited("edit", editAnswer)),
  memberRoute("DELETE", "/qa/answers/:answer_id", deleteAnswer),
  memberRoute("PUT", "/qa/answers/:answer_id/vote", limited("vote", voteOn("answer", "answer_id")), { refusedStatus: 400 }),
  memberRoute("PUT", "/qa/answers/:answer_id/accept", accept(true)),
  memberRoute("DELETE", "/qa/answers/:answer_id/accept", accept(false)),
  publicRoute("GET", "/qa/answers/:answer_id/replies", listReplies),
  memberRoute("POST", "/qa/answers/:answer_id/replies", limited("reply", reply)),
  memberRoute("DELETE", "/qa/replies/:reply_id", deleteReply),
  // Tutorials
  publicRoute("GET", "/tutorials/sections", tutorialSections),
  publicRoute("GET", "/tutorials", listTutorials),
  memberRoute("POST", "/tutorials", limited("publish", publishTutorial)),
  publicRoute("GET", "/tutorials/:tutorial", getTutorial),
  memberRoute("PUT", "/tutorials/:tutorial/bookmark", limited("save", bookmarkOn("tutorial", "tutorial", true))),
  memberRoute("DELETE", "/tutorials/:tutorial/bookmark", limited("save", bookmarkOn("tutorial", "tutorial", false))),
  // Search
  publicRoute("GET", "/search", limited("search", search)),
];
