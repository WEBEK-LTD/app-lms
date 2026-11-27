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
const TITLE = { min: 5, max: 160 };
const BODY_MAX = 10_000;
const WINNERS_MAX = 10;
const NOTE_MAX = 1000;
/** Voting runs a week after entries close unless the admin says otherwise. */
const VOTING_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;
const PRIZE_POINTS_MAX = 10_000;

type Result<T> = ({ ok: true } & T) | Fail;

function date(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** A challenge's fields as the admin sends them (ChallengeInput); with `current`, only what is sent changes. */
export function parseChallenge(input: unknown, current?: Challenge): { ok: true; value: Pick<Challenge, "title" | "body" | "rewardPoints" | "rewardBadge" | "coverUrl" | "startsAt" | "submitUntil" | "voteUntil"> } | { ok: false; errors: Record<string, string> } {
  const v = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const has = (k: string) => v[k] !== undefined;
  const title = has("title") || !current ? text(v.title) : current.title;
  if (title.length < TITLE.min || title.length > TITLE.max) errors.title = `Give it a title of ${TITLE.min} to ${TITLE.max} characters.`;
  const body = has("rules") || !current ? text(v.rules) : current.body;
  if (body.length < 10 || body.length > BODY_MAX) errors.rules = "Write the rules (at least 10 characters).";
  let coverUrl = current?.coverUrl ?? null;
  if (has("cover_url")) {
    coverUrl = v.cover_url === null || v.cover_url === "" ? null : text(v.cover_url);
    if (coverUrl && (!URL_RE.test(coverUrl) || coverUrl.length > 512)) errors.cover_url = "The cover is a link starting with https://.";
  }
  const rewardPoints = has("reward_points") || !current ? (v.reward_points ?? 0) : current.rewardPoints;
  if (typeof rewardPoints !== "number" || !Number.isInteger(rewardPoints) || rewardPoints < 0 || rewardPoints > PRIZE_POINTS_MAX) errors.reward_points = `Points are a whole number from 0 to ${PRIZE_POINTS_MAX}.`;
  const rewardBadge = has("reward_badge") || !current ? (v.reward_badge ?? null) : current.rewardBadge;
  if (rewardBadge !== null && !(COMMUNITY_BADGES as readonly unknown[]).includes(rewardBadge)) errors.reward_badge = "The badge is gold, green or blue, or none.";
  const pick = (k: string, was: Date | undefined) => (has(k) || !was ? date(v[k]) : was);
  const startsAt = pick("starts_at", current?.startsAt);
  const submitUntil = pick("ends_at", current?.submitUntil);
  const voteUntil = has("voting_ends_at") ? date(v.voting_ends_at) : current && !has("ends_at") ? current.voteUntil : submitUntil ? new Date(submitUntil.getTime() + VOTING_DEFAULT_MS) : null;
  if (!startsAt) errors.starts_at = "Give the start as a date and time.";
  if (!submitUntil) errors.ends_at = "Give the last day for entries.";
  if (has("voting_ends_at") && !voteUntil) errors.voting_ends_at = "Give the last day for votes.";
  if (startsAt && submitUntil && submitUntil <= startsAt) errors.ends_at = "Entries close after the start.";
  if (submitUntil && voteUntil && voteUntil <= submitUntil) errors.voting_ends_at = "Voting closes after entries close.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, body, rewardPoints: rewardPoints as number, rewardBadge: rewardBadge as Challenge["rewardBadge"], coverUrl, startsAt: startsAt!, submitUntil: submitUntil!, voteUntil: voteUntil! } };
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
  const note = text(v.note);
  if (note.length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`;
  if (!errors.showcase_id && showcaseId) {
    const item = await trust.content.info("showcase", showcaseId);
    if (!item || item.authorId !== memberId) errors.showcase_id = "Choose one of your own showcase items.";
  }
  if (Object.keys(errors).length) return fail(400, "invalid_request", "Please check the highlighted fields.", errors);
  const submission = await store.addSubmission({ challengeId, memberId, showcaseId, url, note, status: "pending", createdAt: ctx.now });
  if (!submission) return fail(409, "already_entered", "You have entered this challenge already.");
  const gate = await moderateNew(trust, { memberId, targetType: "challenge_submission", targetId: submission.id, text: [note, url].filter(Boolean).join("\n") || "Entry" });
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
 * The admins pick the winners once entries have closed, in order (first
 * place first): each gets the challenge's points (the ledger's
 * `challenge_won`) and its badge, if it has one (an admin's grant, logged
 * as phase 1's grants are). Done once; each winner is told.
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
  const ids = (input as { entry_ids?: unknown } | null)?.entry_ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > WINNERS_MAX || ids.some((x) => typeof x !== "string")) return fail(400, "invalid_request", `Choose 1 to ${WINNERS_MAX} winners.`, { entry_ids: `Choose 1 to ${WINNERS_MAX} entries.` });
  if (new Set(ids).size !== ids.length) return fail(400, "invalid_request", "Each entry wins once.", { entry_ids: "Each entry wins once." });
  const entries: ChallengeSubmission[] = [];
  for (const id of ids as string[]) {
    const entry = await store.getSubmission(id);
    if (!entry || entry.challengeId !== challengeId || entry.status !== "published") return fail(400, "invalid_request", "Each winner is one of this challenge's entries.", { entry_ids: "Each winner is one of this challenge's entries." });
    entries.push(entry);
  }
  const reward: ChallengeReward = { points: challenge.rewardPoints, badge: challenge.rewardBadge };
  const decided = await store.updateChallenge(challengeId, { winnersAt: ctx.now, updatedAt: ctx.now });
  for (const [i, entry] of entries.entries()) {
    const place = i + 1;
    await store.updateSubmission(entry.id, { place, reward });
    if (reward.points) await awardPoints(ctx, { memberId: entry.memberId, reason: "challenge_won", ref: entry.id, points: reward.points });
    if (reward.badge) await grantBadge(trust, adminId, entry.memberId, { badge: reward.badge, reason: `Challenge winner: ${challenge.title}`.slice(0, 1000) });
    await notify(trust, { memberId: entry.memberId, kind: "challenge_won", actorId: null, targetType: "challenge", targetId: challengeId, data: { title: challenge.title, count: place }, link: `/challenges/${challengeId}` });
  }
  await audit(trust, { actorId: adminId, action: "challenge.winners", targetType: "challenge", targetId: challengeId, details: { winners: entries.map((e, i) => ({ entry: e.id, member: e.memberId, place: i + 1 })), ...reward } });
  return { ok: true, challenge: decided!, winners: await winnersOf(ctx, decided!) };
}
