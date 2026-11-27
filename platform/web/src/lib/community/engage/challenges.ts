import { COMMUNITY_BADGES } from "../trust/badges";
import { audit, fail, grantBadge, moderateNew, notify, requireAdmin, type Fail } from "../trust/service";
import { engageOf, type EngageCtx } from "./context";
import { awardPoints } from "./points";
import { challengeStage, type Challenge, type ChallengeReward, type ChallengeStage, type ChallengeSubmission, type Page } from "./store";

/**
 * 233 Challenges: the admins post one with its dates and rules; while it is
 * open, members enter (one of their showcase items or a link, one entry
 * each, through phase 1's moderation); while voting is open, members vote
 * for others' entries; then the admins pick the winners, who get points
 * and, if the admin chooses, a badge. The home page's card is the open one.
 */

const URL_RE = /^https:\/\/[^\s/$.?#][^\s]*$/i;
const TITLE = { min: 5, max: 140 };
const BODY_MAX = 10_000;
const PRIZES_MAX = 1000;
const WINNERS_MAX = 10;
const PRIZE_POINTS_MAX = 10_000;

type Result<T> = ({ ok: true } & T) | Fail;

function date(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** A challenge's fields as the admin sends them; with `current`, only what is sent changes. */
export function parseChallenge(input: unknown, current?: Challenge): { ok: true; value: Pick<Challenge, "title" | "body" | "prizes" | "coverUrl" | "startsAt" | "submitUntil" | "voteUntil"> } | { ok: false; errors: Record<string, string> } {
  const v = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const has = (k: string) => v[k] !== undefined;
  const title = has("title") || !current ? text(v.title) : current.title;
  if (title.length < TITLE.min || title.length > TITLE.max) errors.title = `Give it a title of ${TITLE.min} to ${TITLE.max} characters.`;
  const body = has("body") || !current ? text(v.body) : current.body;
  if (body.length < 10 || body.length > BODY_MAX) errors.body = "Write the rules (at least 10 characters).";
  const prizes = has("prizes") || !current ? text(v.prizes) : current.prizes;
  if (prizes.length > PRIZES_MAX) errors.prizes = `Keep the prizes under ${PRIZES_MAX} characters.`;
  let coverUrl = current?.coverUrl ?? null;
  if (has("cover_url")) {
    coverUrl = v.cover_url === null || v.cover_url === "" ? null : text(v.cover_url);
    if (coverUrl && (!URL_RE.test(coverUrl) || coverUrl.length > 512)) errors.cover_url = "The cover is a link starting with https://.";
  }
  const pick = (k: string, was: Date | undefined) => (has(k) || !was ? date(v[k]) : was);
  const startsAt = pick("starts_at", current?.startsAt);
  const submitUntil = pick("submit_until", current?.submitUntil);
  const voteUntil = pick("vote_until", current?.voteUntil);
  if (!startsAt) errors.starts_at = "Give the start as a date and time.";
  if (!submitUntil) errors.submit_until = "Give the last day for entries.";
  if (!voteUntil) errors.vote_until = "Give the last day for votes.";
  if (startsAt && submitUntil && submitUntil <= startsAt) errors.submit_until = "Entries close after the start.";
  if (submitUntil && voteUntil && voteUntil <= submitUntil) errors.vote_until = "Voting closes after entries close.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, body, prizes, coverUrl, startsAt: startsAt!, submitUntil: submitUntil!, voteUntil: voteUntil! } };
}

export async function createChallenge(ctx: EngageCtx, adminId: string, input: unknown): Promise<Result<{ challenge: Challenge }>> {
  const { store, tenantId, trust } = engageOf(ctx);
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const parsed = parseChallenge(input);
  if (!parsed.ok) return fail(400, "invalid_request", "Please check the highlighted fields.", parsed.errors);
  const challenge = await store.addChallenge({ ...parsed.value, tenantId, status: "published", winnersAt: null, createdBy: adminId, createdAt: ctx.now, updatedAt: ctx.now });
  await audit(trust, { actorId: adminId, action: "challenge.create", targetType: "challenge", targetId: challenge.id, details: { title: challenge.title } });
  return { ok: true, challenge };
}

/** The admin changes a challenge, or cancels it (`status: "cancelled"`); a cancelled one can be put back. */
export async function updateChallenge(ctx: EngageCtx, adminId: string, id: string, input: unknown): Promise<Result<{ challenge: Challenge }>> {
  const { store, trust } = engageOf(ctx);
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const current = await store.getChallenge(id);
  if (!current || current.tenantId !== engageOf(ctx).tenantId) return fail(404, "not_found", "There's no such challenge.");
  const parsed = parseChallenge(input, current);
  if (!parsed.ok) return fail(400, "invalid_request", "Please check the highlighted fields.", parsed.errors);
  const status = (input as { status?: unknown } | null)?.status;
  if (status !== undefined && status !== "published" && status !== "cancelled") return fail(400, "invalid_request", "status must be published or cancelled.");
  const challenge = (await store.updateChallenge(id, { ...parsed.value, ...(status ? { status } : {}), updatedAt: ctx.now }))!;
  await audit(trust, { actorId: adminId, action: "challenge.update", targetType: "challenge", targetId: id, details: { title: challenge.title, ...(status ? { status } : {}) } });
  return { ok: true, challenge };
}

export async function deleteChallenge(ctx: EngageCtx, adminId: string, id: string): Promise<{ ok: true } | Fail> {
  const { store, trust, tenantId } = engageOf(ctx);
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const current = await store.getChallenge(id);
  if (!current || current.tenantId !== tenantId) return fail(404, "not_found", "There's no such challenge.");
  if (current.winnersAt) return fail(409, "conflict", "A challenge with winners stays; cancel it instead.");
  await store.deleteChallenge(id);
  await audit(trust, { actorId: adminId, action: "challenge.delete", targetType: "challenge", targetId: id, details: { title: current.title } });
  return { ok: true };
}

export async function listChallenges(ctx: EngageCtx, input: { stage?: ChallengeStage; offset: number; limit: number }): Promise<Page<Challenge>> {
  const { store, tenantId } = engageOf(ctx);
  return store.listChallenges({ tenantId, stage: input.stage, now: ctx.now, offset: input.offset, limit: input.limit });
}

export async function getChallenge(ctx: EngageCtx, id: string): Promise<Challenge | null> {
  const { store, tenantId } = engageOf(ctx);
  const c = await store.getChallenge(id);
  return c && c.tenantId === tenantId ? c : null;
}

/** The winners' entries, first place first. */
export async function winnersOf(ctx: EngageCtx, challenge: Challenge): Promise<ChallengeSubmission[]> {
  if (!challenge.winnersAt) return [];
  const all = await ctx.store.engage.listSubmissions({ challengeId: challenge.id, sort: "top", offset: 0, limit: 200, withHidden: true });
  return all.items.filter((s) => s.place !== null).sort((a, b) => a.place! - b.place!);
}

/**
 * A member enters an open challenge: one of their own showcase items or a
 * link to their work, with a title and a note. One entry each. It goes
 * through phase 1's moderation like any post (a new member's waits).
 */
export async function submitEntry(ctx: EngageCtx, memberId: string, challengeId: string, input: unknown): Promise<Result<{ submission: ChallengeSubmission }>> {
  const { store, trust } = engageOf(ctx);
  const challenge = await getChallenge(ctx, challengeId);
  if (!challenge) return fail(404, "not_found", "There's no such challenge.");
  if (challengeStage(challenge, ctx.now) !== "open") return fail(409, "challenge_closed", "This challenge isn't taking entries.");
  const v = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const showcaseId = typeof v.showcase_id === "string" && v.showcase_id.trim() ? v.showcase_id.trim() : null;
  const url = typeof v.url === "string" && v.url.trim() ? v.url.trim() : null;
  if (!showcaseId === !url) errors.showcase_id = "Choose one of your showcase items, or give a link.";
  if (url && (!URL_RE.test(url) || url.length > 500)) errors.url = "The link starts with https://.";
  const title = text(v.title);
  if (title.length < 3 || title.length > TITLE.max) errors.title = `Give your entry a title of 3 to ${TITLE.max} characters.`;
  const note = text(v.note);
  if (note.length > 2000) errors.note = "Keep the note under 2000 characters.";
  if (!errors.showcase_id && showcaseId) {
    const item = await trust.content.info("showcase", showcaseId);
    if (!item || item.authorId !== memberId) errors.showcase_id = "Choose one of your own showcase items.";
  }
  if (Object.keys(errors).length) return fail(400, "invalid_request", "Please check the highlighted fields.", errors);
  const submission = await store.addSubmission({ challengeId, memberId, showcaseId, url, title, note, status: "pending", createdAt: ctx.now });
  if (!submission) return fail(409, "already_entered", "You have entered this challenge already.");
  const gate = await moderateNew(trust, { memberId, targetType: "challenge_submission", targetId: submission.id, text: [title, note, url].filter(Boolean).join("\n") });
  const status = gate.status === "published" ? "published" : "pending";
  const saved = (await store.updateSubmission(submission.id, { status }))!;
  return { ok: true, submission: saved };
}

export async function listEntries(ctx: EngageCtx, challengeId: string, input: { sort: "top" | "new"; offset: number; limit: number }): Promise<Page<ChallengeSubmission> | null> {
  const challenge = await getChallenge(ctx, challengeId);
  if (!challenge) return null;
  return ctx.store.engage.listSubmissions({ challengeId, sort: input.sort, offset: input.offset, limit: input.limit });
}

/** A vote for someone else's entry while voting is open (entries can be voted on while the challenge is open too). */
export async function vote(ctx: EngageCtx, memberId: string, challengeId: string, submissionId: string, on: boolean): Promise<Result<{ votes: number; voted: boolean }>> {
  const { store } = engageOf(ctx);
  const challenge = await getChallenge(ctx, challengeId);
  const entry = challenge ? await store.getSubmission(submissionId) : null;
  if (!challenge || !entry || entry.challengeId !== challengeId || entry.status !== "published") return fail(404, "not_found", "There's no such entry.");
  const stage = challengeStage(challenge, ctx.now);
  if (stage !== "open" && stage !== "voting") return fail(409, "voting_closed", "Voting is closed.");
  if (entry.memberId === memberId) return fail(403, "own_entry", "You can't vote for your own entry.");
  if (on) await store.addVote(submissionId, memberId, ctx.now);
  else await store.removeVote(submissionId, memberId);
  const after = (await store.getSubmission(submissionId))!;
  return { ok: true, votes: after.votes, voted: on };
}

/**
 * The admins pick the winners once voting is over: each a place, points
 * (the ledger's `challenge_won`) and, if chosen, a badge (an admin's grant,
 * logged as phase 1's grants are). Done once; each winner is told.
 */
export async function pickWinners(ctx: EngageCtx, adminId: string, challengeId: string, input: unknown): Promise<Result<{ challenge: Challenge; winners: ChallengeSubmission[] }>> {
  const { store, trust } = engageOf(ctx);
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const challenge = await getChallenge(ctx, challengeId);
  if (!challenge) return fail(404, "not_found", "There's no such challenge.");
  if (challenge.winnersAt) return fail(409, "already_decided", "The winners are already chosen.");
  if (challenge.status === "cancelled") return fail(409, "challenge_closed", "This challenge was cancelled.");
  if (ctx.now < challenge.submitUntil) return fail(409, "challenge_open", "Pick the winners once entries have closed.");
  const list = (input as { winners?: unknown } | null)?.winners;
  if (!Array.isArray(list) || list.length < 1 || list.length > WINNERS_MAX) return fail(400, "invalid_request", `Choose 1 to ${WINNERS_MAX} winners.`);
  const picks: { entry: ChallengeSubmission; place: number; reward: ChallengeReward }[] = [];
  const places = new Set<number>();
  for (const raw of list) {
    const w = (raw ?? {}) as Record<string, unknown>;
    const entry = typeof w.submission_id === "string" ? await store.getSubmission(w.submission_id) : null;
    if (!entry || entry.challengeId !== challengeId || entry.status !== "published") return fail(400, "invalid_request", "Each winner is one of this challenge's entries.");
    if (picks.some((p) => p.entry.id === entry.id)) return fail(400, "invalid_request", "Each entry wins once.");
    const place = w.place;
    if (typeof place !== "number" || !Number.isInteger(place) || place < 1 || place > WINNERS_MAX || places.has(place)) return fail(400, "invalid_request", "Give each winner a different place from 1.");
    places.add(place);
    const points = w.points === undefined ? 0 : w.points;
    if (typeof points !== "number" || !Number.isInteger(points) || points < 0 || points > PRIZE_POINTS_MAX) return fail(400, "invalid_request", `Points are a whole number from 0 to ${PRIZE_POINTS_MAX}.`);
    const badge = w.badge === undefined || w.badge === null ? null : w.badge;
    if (badge !== null && !(COMMUNITY_BADGES as readonly unknown[]).includes(badge)) return fail(400, "invalid_request", "The badge is gold, green or blue.");
    picks.push({ entry, place, reward: { points, badge: badge as ChallengeReward["badge"] } });
  }
  const decided = await store.updateChallenge(challengeId, { winnersAt: ctx.now, updatedAt: ctx.now });
  for (const p of picks) {
    await store.updateSubmission(p.entry.id, { place: p.place, reward: p.reward });
    if (p.reward.points) await awardPoints(ctx, { memberId: p.entry.memberId, reason: "challenge_won", ref: p.entry.id, points: p.reward.points });
    if (p.reward.badge) await grantBadge(trust, adminId, p.entry.memberId, { badge: p.reward.badge, reason: `Challenge winner: ${challenge.title}`.slice(0, 1000) });
    await notify(trust, { memberId: p.entry.memberId, kind: "challenge_won", actorId: null, targetType: "challenge", targetId: challengeId, data: { title: challenge.title, count: p.place }, link: `/challenges/${challengeId}` });
  }
  await audit(trust, { actorId: adminId, action: "challenge.winners", targetType: "challenge", targetId: challengeId, details: { winners: picks.map((p) => ({ submission: p.entry.id, member: p.entry.memberId, place: p.place, ...p.reward })) } });
  return { ok: true, challenge: decided!, winners: await winnersOf(ctx, decided!) };
}
