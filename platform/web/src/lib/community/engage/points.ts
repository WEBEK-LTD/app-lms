import { levelOf } from "../levels";
import { audit, fail, refreshAutoBadges, requireAdmin, type Fail } from "../trust/service";
import { engageOf, type EngageCtx } from "./context";
import type { BoardRow } from "./store";

/**
 * 233 Points and levels, in full: every action's points come from one
 * table the admins edit (with a daily cap per action, so nobody farms
 * likes), each point given once per thing done, kept in a ledger (the
 * engage store) that the weekly and all-time leaderboards read. The total
 * on the member (community_members.points) follows every change; the level
 * is read from it (lib/community/levels.ts). Areas A and B call
 * `awardPoints` and `takeBackPoints` with their reason and what earned it.
 */

export interface PointRule {
  points: number;
  /** The most a member gains from this reason in one day (UTC); null: no cap. Only gains count. */
  dailyCap: number | null;
}

/** The defaults: phase 1's (area B's POINTS) and the new ones. The admins change them in /admin/points. */
export const DEFAULT_POINT_RULES: Readonly<Record<string, PointRule>> = {
  answer_accepted: { points: 25, dailyCap: null },
  accepted_an_answer: { points: 2, dailyCap: 20 },
  answer_upvoted: { points: 5, dailyCap: 200 },
  answer_downvoted: { points: -2, dailyCap: null },
  question_upvoted: { points: 2, dailyCap: 100 },
  question_downvoted: { points: -1, dailyCap: null },
  tutorial_published: { points: 50, dailyCap: null },
  post_created: { points: 2, dailyCap: 10 },
  post_liked: { points: 1, dailyCap: 50 },
  showcase_created: { points: 10, dailyCap: 20 },
  lesson_done: { points: 2, dailyCap: 40 },
  course_completed: { points: 20, dailyCap: null },
  // Set per challenge by the admins when they pick the winners (`points` in awardPoints).
  challenge_won: { points: 0, dailyCap: null },
};

export const POINT_REASONS = Object.keys(DEFAULT_POINT_RULES);
const SETTINGS_KEY = "points";
const POINTS_LIMIT = 10_000;

const dayStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/** The week the weekly board counts: from Monday 00:00 UTC. */
export function weekStart(now: Date): Date {
  const day = dayStart(now);
  const back = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - back * 86_400_000);
}

/** The table now: the defaults with the admins' changes on top. */
export async function pointRules(ctx: EngageCtx): Promise<Record<string, PointRule>> {
  const saved = (await ctx.store.trust.getSettingsDoc(SETTINGS_KEY)) as { rules?: Record<string, Partial<PointRule>> } | null;
  const out: Record<string, PointRule> = {};
  for (const reason of POINT_REASONS) {
    const s = saved?.rules?.[reason];
    const d = DEFAULT_POINT_RULES[reason]!;
    out[reason] = { points: typeof s?.points === "number" ? s.points : d.points, dailyCap: s && "dailyCap" in s ? (s.dailyCap ?? null) : d.dailyCap };
  }
  return out;
}

/**
 * Gives a member a reason's points for what earned it (`ref`), once: the
 * table's amount (or `points` for a challenge's prize), within the day's
 * cap. The points given: 0 when capped, already given, or nothing is due.
 */
export async function awardPoints(ctx: EngageCtx, input: { memberId: string; reason: string; ref: string; points?: number }): Promise<number> {
  const rules = await pointRules(ctx);
  const rule = rules[input.reason];
  let points = Math.trunc(input.points ?? rule?.points ?? 0);
  if (!points) return 0;
  const { store, tenantId } = engageOf(ctx);
  if (points > 0 && rule?.dailyCap != null) {
    const room = rule.dailyCap - (await store.gainedSince(input.memberId, input.reason, dayStart(ctx.now)));
    points = Math.min(points, room);
    if (points <= 0) return 0;
  }
  if (!(await store.addPoints({ tenantId, memberId: input.memberId, reason: input.reason, points, ref: input.ref.slice(0, 120), createdAt: ctx.now }))) return 0;
  await ctx.store.base.addPoints(input.memberId, points);
  // Blue's rules read the points.
  await refreshAutoBadges(engageOf(ctx).trust, input.memberId);
  return points;
}

/** Takes back what a reason gave for `ref` (a vote taken back, a post removed). The points taken (0 when none were given). */
export async function takeBackPoints(ctx: EngageCtx, input: { memberId: string; reason: string; ref: string }): Promise<number> {
  const taken = await engageOf(ctx).store.takePoints(input.memberId, input.reason, input.ref.slice(0, 120));
  if (taken) {
    await ctx.store.base.addPoints(input.memberId, -taken);
    await refreshAutoBadges(engageOf(ctx).trust, input.memberId);
  }
  return taken;
}

export type BoardPeriod = "week" | "all";

export interface BoardPage {
  rows: (BoardRow & { rank: number })[];
  next: number | null;
  me: { rank: number | null; points: number } | null;
}

/** The leaderboard: this week's points (from Monday, UTC) or all time; the reader's own place too. */
export async function leaderboard(ctx: EngageCtx, input: { period: BoardPeriod; offset: number; limit: number; memberId?: string | null }): Promise<BoardPage> {
  const { store, tenantId } = engageOf(ctx);
  const since = input.period === "week" ? weekStart(ctx.now) : null;
  const got = await store.board(tenantId, since, input.offset, input.limit + 1);
  const rows = got.slice(0, input.limit).map((r, i) => ({ ...r, rank: input.offset + i + 1 }));
  let me: BoardPage["me"] = null;
  if (input.memberId) {
    const points = await store.memberTotal(tenantId, input.memberId, since);
    me = { points, rank: points > 0 ? (await store.aheadOf(tenantId, points, since)) + 1 : null };
  }
  return { rows, next: got.length > input.limit ? input.offset + input.limit : null, me };
}

/** A member's points: in total, this week, their level, and today's gains against each cap. */
export async function myPoints(ctx: EngageCtx, memberId: string) {
  const { store, tenantId } = engageOf(ctx);
  const member = await ctx.store.base.getMember(memberId);
  const points = member?.points ?? 0;
  const [week, today, rules] = await Promise.all([store.memberTotal(tenantId, memberId, weekStart(ctx.now)), store.gainsByReason(memberId, dayStart(ctx.now)), pointRules(ctx)]);
  return {
    points,
    weekPoints: week,
    standing: levelOf(points),
    today: POINT_REASONS.filter((r) => rules[r]!.points > 0 && r !== "challenge_won").map((reason) => ({ reason, earned: today[reason] ?? 0, dailyCap: rules[reason]!.dailyCap })),
  };
}

/** The admins' view of the table. */
export async function adminPointRules(ctx: EngageCtx, adminId: string): Promise<{ ok: true; rules: Record<string, PointRule> } | Fail> {
  const denied = await requireAdmin(engageOf(ctx).trust, adminId);
  if (denied) return denied;
  return { ok: true, rules: await pointRules(ctx) };
}

/** The admins change the table: any of the reasons, its points and its daily cap. Logged with before and after. */
export async function updatePointRules(ctx: EngageCtx, adminId: string, input: unknown): Promise<{ ok: true; rules: Record<string, PointRule> } | Fail> {
  const trust = engageOf(ctx).trust;
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const given = (input as { rules?: unknown } | null)?.rules;
  if (!given || typeof given !== "object" || Array.isArray(given)) return fail(400, "invalid_request", "Send rules: {reason: {points, daily_cap}}.");
  const before = await pointRules(ctx);
  const next: Record<string, PointRule> = { ...before };
  const errors: Record<string, string> = {};
  for (const [reason, raw] of Object.entries(given as Record<string, unknown>)) {
    if (!POINT_REASONS.includes(reason)) {
      errors[reason] = "There's no such reason.";
      continue;
    }
    const v = (raw ?? {}) as { points?: unknown; daily_cap?: unknown };
    const points = v.points === undefined ? before[reason]!.points : v.points;
    const cap = v.daily_cap === undefined ? before[reason]!.dailyCap : v.daily_cap;
    if (typeof points !== "number" || !Number.isInteger(points) || Math.abs(points) > POINTS_LIMIT) errors[reason] = `Points are a whole number between -${POINTS_LIMIT} and ${POINTS_LIMIT}.`;
    else if (cap !== null && (typeof cap !== "number" || !Number.isInteger(cap) || cap < 1 || cap > 1_000_000)) errors[reason] = "The daily cap is a whole number of at least 1, or none.";
    else next[reason] = { points, dailyCap: cap };
  }
  if (Object.keys(errors).length) return fail(400, "invalid_request", "Please check the highlighted rules.", errors);
  await ctx.store.trust.saveSettingsDoc({ rules: next }, { at: ctx.now, by: adminId }, SETTINGS_KEY);
  await audit(trust, { actorId: adminId, action: "points.update", targetType: "settings", targetId: SETTINGS_KEY, details: { before, after: next } });
  return { ok: true, rules: next };
}
