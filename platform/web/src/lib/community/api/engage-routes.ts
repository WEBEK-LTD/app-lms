import { CONTENT_KINDS } from "../content-kinds";
import { challengeStage, type Challenge, type ChallengeStage, type ChallengeSubmission, type CommunityEvent, type EventComment, type EventKind, type PointEntry } from "../engage/store";
import * as C from "../engage/challenges";
import * as E from "../engage/events";
import * as P from "../engage/points";
import { registerDevice, unregisterDevice } from "../engage/push";
import { t } from "../i18n";
import { LEVELS } from "../levels";
import { requireCommunityRole, communityRoleOf } from "../trust/roles";
import * as T from "../trust/service";
import { fail, iso, noContent, ok, page, pageOf, type CommunityContext, type CommunityResult, type CommunityRoute, type MemberContext } from "./http";
import { memberSummaries, type MemberSummaryView } from "./views";

/**
 * 232–235 Area C's routes for phases 2 to 5 (docs/api/community.yaml):
 * push tokens (/me/push-tokens), points and the leaderboard (/me/points,
 * /leaderboard, /admin/points), challenges (/challenges*,
 * /admin/challenges*) and events and live sessions (/events*,
 * /admin/events*). The work is in lib/community/engage; these read the
 * request and shape the answer. The academy's checkout is the website's
 * own (not in this API; lib/community/engage/checkout.ts).
 */

const me = (ctx: CommunityContext) => (ctx as MemberContext).member;

/** A service refusal as the API's error, each field named by its own word. */
function unwrap<V>(result: V | T.Fail): V {
  if (!T.isFail(result)) return result;
  const fields = result.errors ? Object.fromEntries(Object.keys(result.errors).map((field) => [field, "trust.field.setting"])) : undefined;
  return fail(result.status, result.status === 403 && result.code === "forbidden" ? "not_admin" : result.code, fields);
}

function staff(handler: CommunityRoute["handler"]): CommunityRoute["handler"] {
  return async (ctx) => {
    await requireCommunityRole(ctx, "admin");
    return handler(ctx);
  };
}

async function summaries(ctx: CommunityContext, ids: (string | null)[]): Promise<Map<string, MemberSummaryView>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  const views = await memberSummaries(ctx, wanted);
  return new Map(wanted.map((id, i) => [id, views[i]!]));
}

const listed = <T>(ctx: CommunityContext, got: { items: T[]; next: number | null }) => {
  const { offset, limit } = pageOf(ctx.query);
  return { offset, limit, hasMore: got.next !== null };
};

// ——— Push ———

async function putPushToken(ctx: CommunityContext): Promise<CommunityResult> {
  const session = (ctx as MemberContext).session;
  unwrap(await registerDevice(ctx, { id: session.id, memberId: session.memberId }, ctx.json()));
  return noContent();
}

async function deletePushToken(ctx: CommunityContext): Promise<CommunityResult> {
  await unregisterDevice(ctx, (ctx as MemberContext).session.id);
  return noContent();
}

// ——— Points and the leaderboard ———

/** What earned it, as the points' history shows it: the thing's kind, from the reason. */
const POINT_TARGETS: Readonly<Record<string, string>> = {
  answer_accepted: "answer",
  answer_upvoted: "answer",
  answer_downvoted: "answer",
  accepted_an_answer: "question",
  question_upvoted: "question",
  question_downvoted: "question",
  tutorial_published: "tutorial",
  post_created: "post",
  post_liked: "post",
  comment_created: "post_comment",
  story_created: "story",
  showcase_created: "showcase",
  showcase_liked: "showcase",
  lesson_done: "lesson",
  course_completed: "course",
  challenge_won: "challenge_submission",
};

function pointView(p: PointEntry) {
  const targetType = POINT_TARGETS[p.reason] ?? null;
  return { action: p.reason, points: p.points, target_type: targetType, target_id: targetType ? p.ref : null, created_at: p.createdAt.toISOString() };
}

function levelView(ctx: CommunityContext, standing: ReturnType<typeof P.levelStanding>) {
  return { key: standing.level, label: t(ctx.lang, `rank.${standing.level}`), progress: standing.progress, next_at: standing.next?.minPoints ?? null };
}

async function myPoints(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const got = await P.myPoints(ctx, me(ctx).id);
  const history = await ctx.store.engage.history(me(ctx).id, offset, limit);
  return ok({ points: got.points, week_points: got.weekPoints, level: levelView(ctx, got.standing), ...page(history.items.map(pointView), offset, limit, history.next !== null) });
}

async function leaderboard(ctx: CommunityContext): Promise<CommunityResult> {
  const period = ctx.query.get("period") ?? "week";
  if (period !== "week" && period !== "all") fail(400, "invalid_request", { period: "trust.field.setting" });
  const { offset, limit } = pageOf(ctx.query);
  const board = await P.leaderboard(ctx, { period, offset, limit, memberId: ctx.member?.id ?? null });
  const people = await summaries(ctx, board.rows.map((r) => r.memberId));
  return ok({
    ...page(
      board.rows.filter((r) => people.has(r.memberId)).map((r) => ({ rank: r.rank, member: people.get(r.memberId)!, points: r.points })),
      offset,
      limit,
      board.next !== null,
    ),
    me: board.me,
  });
}

function rulesView(rules: Record<string, P.PointRule>) {
  return {
    actions: P.POINT_REASONS.map((action) => ({ action, points: rules[action]!.points, daily_cap: rules[action]!.dailyCap })),
    // The levels and their names: fixed (lib/community/levels.ts), shown for the admin's table.
    levels: LEVELS.map((l) => ({ key: l.key, min_points: l.minPoints, name: { en: t("en", `rank.${l.key}`), ar: t("ar", `rank.${l.key}`), tr: t("tr", `rank.${l.key}`) } })),
  };
}

async function getPointRules(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(rulesView(unwrap(await P.adminPointRules(ctx, me(ctx).id)).rules));
}

async function putPointRules(ctx: CommunityContext): Promise<CommunityResult> {
  const body = ctx.json() as { actions?: unknown };
  if (!Array.isArray(body.actions)) fail(400, "invalid_request", { actions: "trust.field.setting" });
  const rules: Record<string, { points?: unknown; daily_cap?: unknown }> = {};
  for (const a of body.actions as Record<string, unknown>[]) {
    if (!a || typeof a.action !== "string") fail(400, "invalid_request", { actions: "trust.field.setting" });
    rules[a.action as string] = { points: a.points, daily_cap: a.daily_cap === undefined ? undefined : a.daily_cap };
  }
  return ok(rulesView(unwrap(await P.updatePointRules(ctx, me(ctx).id, { rules })).rules));
}

// ——— Challenges ———

async function entryViews(ctx: CommunityContext, entries: ChallengeSubmission[]) {
  const people = await summaries(ctx, entries.map((e) => e.memberId));
  const voted = ctx.member ? await ctx.store.engage.votedOf(entries.map((e) => e.id), ctx.member.id) : new Set<string>();
  const showcase = CONTENT_KINDS.showcase?.summary;
  return Promise.all(
    entries
      .filter((e) => people.has(e.memberId))
      .map(async (e) => ({
        id: e.id,
        member: people.get(e.memberId)!,
        showcase: e.showcaseId && showcase ? await showcase(ctx, e.showcaseId) : null,
        url: e.url,
        note: e.note,
        vote_count: e.votes,
        voted: voted.has(e.id),
        ...(e.place !== null ? { place: e.place } : {}),
        created_at: e.createdAt.toISOString(),
      })),
  );
}

async function challengeView(ctx: CommunityContext, c: Challenge) {
  const [count, mine, winners] = await Promise.all([ctx.store.engage.countSubmissions(c.id), ctx.member ? ctx.store.engage.submissionOf(c.id, ctx.member.id) : null, C.winnersOf(ctx, c)]);
  return {
    id: c.id,
    title: c.title,
    rules: c.body,
    cover_url: c.coverUrl,
    status: challengeStage(c, ctx.now),
    starts_at: c.startsAt.toISOString(),
    ends_at: c.submitUntil.toISOString(),
    voting_ends_at: c.voteUntil.toISOString(),
    reward_points: c.rewardPoints,
    reward_badge: c.rewardBadge,
    entry_count: count,
    entered: mine !== null,
    winners: await entryViews(ctx, winners),
  };
}

const STAGES: readonly ChallengeStage[] = ["upcoming", "open", "voting", "closed"];

async function listChallenges(ctx: CommunityContext): Promise<CommunityResult> {
  const status = ctx.query.get("status");
  if (status && !STAGES.includes(status as ChallengeStage)) fail(400, "invalid_request", { status: "trust.field.status" });
  const { offset, limit } = pageOf(ctx.query);
  const got = await C.listChallenges(ctx, { stage: (status as ChallengeStage) || undefined, offset, limit });
  const l = listed(ctx, got);
  return ok(page(await Promise.all(got.items.map((c) => challengeView(ctx, c))), l.offset, l.limit, l.hasMore));
}

async function challengeOf(ctx: CommunityContext): Promise<Challenge> {
  return (await C.getChallenge(ctx, ctx.params.challenge_id ?? "")) ?? fail(404, "not_found");
}

async function getChallenge(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await challengeView(ctx, await challengeOf(ctx)));
}

async function listEntries(ctx: CommunityContext): Promise<CommunityResult> {
  const challenge = await challengeOf(ctx);
  const { offset, limit } = pageOf(ctx.query);
  // Most voted first while voting (and after); newest first while entries come in.
  const sort = challengeStage(challenge, ctx.now) === "open" || challengeStage(challenge, ctx.now) === "upcoming" ? "new" : "top";
  const got = (await C.listEntries(ctx, challenge.id, { sort, offset, limit }))!;
  return ok(page(await entryViews(ctx, got.items), offset, limit, got.next !== null));
}

async function postEntry(ctx: CommunityContext): Promise<CommunityResult> {
  const { submission } = unwrap(await C.submitEntry(ctx, me(ctx).id, ctx.params.challenge_id ?? "", ctx.json()));
  const [view] = await entryViews(ctx, [submission]);
  return ok({ ...view, status: submission.status }, 201);
}

async function voteEntry(ctx: CommunityContext, on: boolean): Promise<CommunityResult> {
  const got = unwrap(await C.vote(ctx, me(ctx).id, ctx.params.challenge_id ?? "", ctx.params.entry_id ?? "", on));
  return ok({ count: got.votes, mine: got.voted });
}

async function createChallenge(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await challengeView(ctx, unwrap(await C.createChallenge(ctx, me(ctx).id, ctx.json())).challenge), 201);
}

async function updateChallenge(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await challengeView(ctx, unwrap(await C.updateChallenge(ctx, me(ctx).id, ctx.params.challenge_id ?? "", ctx.json())).challenge));
}

async function deleteChallenge(ctx: CommunityContext): Promise<CommunityResult> {
  unwrap(await C.deleteChallenge(ctx, me(ctx).id, ctx.params.challenge_id ?? ""));
  return noContent();
}

async function pickWinners(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await challengeView(ctx, unwrap(await C.pickWinners(ctx, me(ctx).id, ctx.params.challenge_id ?? "", ctx.json())).challenge));
}

// ——— Events ———

async function eventViews(ctx: CommunityContext, events: CommunityEvent[]) {
  const going = ctx.member ? await ctx.store.engage.rsvpOf(events.map((e) => e.id), ctx.member.id) : new Set<string>();
  const role = ctx.member ? await communityRoleOf(ctx, ctx.member) : null;
  return events.map((e) => {
    const mine = going.has(e.id);
    return {
      id: e.id,
      title: e.title,
      description: e.body,
      kind: e.kind,
      starts_at: e.startsAt.toISOString(),
      ends_at: iso(e.endsAt),
      time_zone: e.timeZone,
      location: e.location,
      // The meeting link only to those going (and the staff).
      join_url: mine || role ? e.joinUrl : null,
      embed_url: e.embedUrl,
      replay_url: e.replayUrl,
      capacity: e.capacity,
      cover_url: e.coverUrl,
      going_count: e.rsvpCount,
      going: mine,
      live_now: E.eventPhase(e, ctx.now) === "live",
      status: e.status,
    };
  });
}

async function eventOf(ctx: CommunityContext): Promise<CommunityEvent> {
  return (await E.getEvent(ctx, ctx.params.event_id ?? "")) ?? fail(404, "not_found");
}

async function listEvents(ctx: CommunityContext): Promise<CommunityResult> {
  const when = ctx.query.get("when") ?? "upcoming";
  if (when !== "upcoming" && when !== "past") fail(400, "invalid_request", { when: "trust.field.setting" });
  const kind = ctx.query.get("kind");
  if (kind && kind !== "online" && kind !== "in_person" && kind !== "live") fail(400, "invalid_request", { kind: "trust.field.setting" });
  const { offset, limit } = pageOf(ctx.query);
  const got = await E.listEvents(ctx, { when, kind: (kind as EventKind) || undefined, offset, limit });
  return ok(page(await eventViews(ctx, got.items), offset, limit, got.next !== null));
}

async function getEvent(ctx: CommunityContext): Promise<CommunityResult> {
  const [view] = await eventViews(ctx, [await eventOf(ctx)]);
  return ok(view);
}

async function rsvp(ctx: CommunityContext, going: boolean): Promise<CommunityResult> {
  unwrap(await E.rsvp(ctx, me(ctx).id, ctx.params.event_id ?? "", going));
  const [view] = await eventViews(ctx, [await eventOf(ctx)]);
  return ok(view);
}

async function attendees(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const got = (await E.attendees(ctx, (await eventOf(ctx)).id, { offset, limit }))!;
  const people = await summaries(ctx, got.items);
  return ok(page(got.items.filter((id) => people.has(id)).map((id) => people.get(id)!), offset, limit, got.next !== null));
}

async function ics(ctx: CommunityContext): Promise<CommunityResult> {
  const event = await eventOf(ctx);
  const file = E.eventIcs(event, ctx.deps.siteUrl, ctx.now);
  return { status: 200, text: file, headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="event-${event.id.slice(0, 8)}.ics"`, "cache-control": "no-store" } };
}

async function commentViews(ctx: CommunityContext, comments: EventComment[]) {
  const people = await summaries(ctx, comments.map((c) => c.memberId));
  return comments
    .filter((c) => people.has(c.memberId))
    .map((c) => ({ id: c.id, author: people.get(c.memberId)!, body: c.body, parent_id: null, like_count: 0, liked: false, replies: [], status: c.status === "hidden" ? "removed" : c.status, created_at: c.createdAt.toISOString() }));
}

async function listComments(ctx: CommunityContext): Promise<CommunityResult> {
  const event = await eventOf(ctx);
  const { limit } = pageOf(ctx.query);
  // Polling: only comments after the last one seen. The live chat reads oldest first.
  const after = ctx.query.get("after") ?? ctx.query.get("cursor");
  const got = (await E.listComments(ctx, event.id, { after, limit: limit + 1 }))!;
  const items = got.slice(0, limit);
  return ok({ items: await commentViews(ctx, items), next_cursor: got.length > limit ? items[items.length - 1]!.id : null });
}

async function postComment(ctx: CommunityContext): Promise<CommunityResult> {
  const { comment } = unwrap(await E.addComment(ctx, me(ctx).id, ctx.params.event_id ?? "", ctx.json()));
  const [view] = await commentViews(ctx, [comment]);
  return ok(view, 201);
}

async function createEvent(ctx: CommunityContext): Promise<CommunityResult> {
  const [view] = await eventViews(ctx, [unwrap(await E.createEvent(ctx, me(ctx).id, ctx.json())).event]);
  return ok(view, 201);
}

async function updateEvent(ctx: CommunityContext): Promise<CommunityResult> {
  const [view] = await eventViews(ctx, [unwrap(await E.updateEvent(ctx, me(ctx).id, ctx.params.event_id ?? "", ctx.json())).event]);
  return ok(view);
}

async function cancelEvent(ctx: CommunityContext): Promise<CommunityResult> {
  unwrap(await E.cancelEvent(ctx, me(ctx).id, ctx.params.event_id ?? ""));
  return noContent();
}

export const ENGAGE_ROUTES: CommunityRoute[] = [
  { method: "PUT", path: "/me/push-tokens", handler: putPushToken },
  { method: "DELETE", path: "/me/push-tokens", handler: deletePushToken },
  { method: "GET", path: "/me/points", handler: myPoints },
  { method: "GET", path: "/leaderboard", auth: "public", handler: leaderboard },
  { method: "GET", path: "/admin/points", handler: staff(getPointRules) },
  { method: "PUT", path: "/admin/points", handler: staff(putPointRules) },
  { method: "GET", path: "/challenges", auth: "public", handler: listChallenges },
  { method: "GET", path: "/challenges/:challenge_id", auth: "public", handler: getChallenge },
  { method: "GET", path: "/challenges/:challenge_id/entries", auth: "public", handler: listEntries },
  { method: "POST", path: "/challenges/:challenge_id/entries", handler: postEntry },
  { method: "PUT", path: "/challenges/:challenge_id/entries/:entry_id/vote", handler: (ctx) => voteEntry(ctx, true) },
  { method: "DELETE", path: "/challenges/:challenge_id/entries/:entry_id/vote", handler: (ctx) => voteEntry(ctx, false) },
  { method: "POST", path: "/admin/challenges", handler: staff(createChallenge) },
  { method: "PATCH", path: "/admin/challenges/:challenge_id", handler: staff(updateChallenge) },
  { method: "DELETE", path: "/admin/challenges/:challenge_id", handler: staff(deleteChallenge) },
  { method: "PUT", path: "/admin/challenges/:challenge_id/winners", handler: staff(pickWinners) },
  { method: "GET", path: "/events", auth: "public", handler: listEvents },
  { method: "GET", path: "/events/:event_id", auth: "public", handler: getEvent },
  { method: "PUT", path: "/events/:event_id/rsvp", handler: (ctx) => rsvp(ctx, true) },
  { method: "DELETE", path: "/events/:event_id/rsvp", handler: (ctx) => rsvp(ctx, false) },
  { method: "GET", path: "/events/:event_id/attendees", auth: "public", handler: attendees },
  { method: "GET", path: "/events/:event_id/ics", auth: "public", handler: ics },
  { method: "GET", path: "/events/:event_id/comments", auth: "public", handler: listComments },
  { method: "POST", path: "/events/:event_id/comments", handler: postComment },
  { method: "POST", path: "/admin/events", handler: staff(createEvent) },
  { method: "PATCH", path: "/admin/events/:event_id", handler: staff(updateEvent) },
  { method: "DELETE", path: "/admin/events/:event_id", handler: staff(cancelEvent) },
];
