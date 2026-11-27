import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { sha256Hex } from "../../crypto/tokens";
import {
  communityChallenges,
  communityChallengeSubmissions,
  communityChallengeVotes,
  communityCourseOrders,
  communityEventComments,
  communityEventRsvps,
  communityEvents,
  communityPoints,
  communityPushDevices,
} from "../../db/community-engage-schema";
import type { BoardRow, Challenge, ChallengeStage, ChallengeSubmission, CommunityEvent, CourseOrder, EngageStore, EventComment, EventKind, Page, PointEntry, PushDevice } from "./store";

/**
 * 232–235 Area C's records on MySQL or MariaDB (migration 0179). The counts
 * kept on a row (votes, RSVPs) change in the same transaction as the row
 * that counts, so they never drift.
 */

type Db = MySql2Database<Record<string, unknown>>;

function paged<T>(rows: T[], offset: number, limit: number): Page<T> {
  return { items: rows.slice(0, limit), next: rows.length > limit ? offset + limit : null };
}

function isDuplicate(error: unknown): boolean {
  const e = error as { code?: string; errno?: number; cause?: { code?: string; errno?: number } };
  return e?.code === "ER_DUP_ENTRY" || e?.errno === 1062 || e?.cause?.code === "ER_DUP_ENTRY" || e?.cause?.errno === 1062;
}

/** affectedRows of an insert, update or delete. */
const affected = (res: unknown): number => (Array.isArray(res) ? ((res[0] as { affectedRows?: number })?.affectedRows ?? 0) : ((res as { affectedRows?: number })?.affectedRows ?? 0));

const challengeOf = (r: typeof communityChallenges.$inferSelect): Challenge => ({ ...r });
const submissionOf = (r: typeof communityChallengeSubmissions.$inferSelect): ChallengeSubmission => ({ ...r, reward: r.reward ?? null });
const eventOf = (r: typeof communityEvents.$inferSelect): CommunityEvent => ({ ...r });
const commentOf = (r: typeof communityEventComments.$inferSelect): EventComment => ({ ...r });
const orderOf = (r: typeof communityCourseOrders.$inferSelect): CourseOrder => ({ ...r });

export class MysqlEngageStore implements EngageStore {
  constructor(private readonly db: Db) {}

  // ——— Push ———
  async saveDevice(d: Omit<PushDevice, "createdAt" | "lastSeenAt">, at: Date) {
    const t = communityPushDevices;
    const tokenHash = sha256Hex(d.token);
    // The same phone under another session (signed in again): that one lets it go.
    await this.db.delete(t).where(and(eq(t.tokenHash, tokenHash), ne(t.sessionId, d.sessionId)));
    await this.db
      .insert(t)
      .values({ ...d, tokenHash, createdAt: at, lastSeenAt: at })
      .onDuplicateKeyUpdate({ set: { tenantId: d.tenantId, memberId: d.memberId, token: d.token, tokenHash, platform: d.platform, lastSeenAt: at } });
  }
  async removeSessionDevice(sessionId: string) {
    const t = communityPushDevices;
    await this.db.delete(t).where(eq(t.sessionId, sessionId));
  }
  async removeTokens(tokens: readonly string[]) {
    if (!tokens.length) return;
    const t = communityPushDevices;
    await this.db.delete(t).where(inArray(t.tokenHash, tokens.map((x) => sha256Hex(x))));
  }
  async devicesOf(memberIds: readonly string[]): Promise<PushDevice[]> {
    if (!memberIds.length) return [];
    const t = communityPushDevices;
    const rows = await this.db.select().from(t).where(inArray(t.memberId, [...memberIds]));
    return rows.map((r) => ({ sessionId: r.sessionId, tenantId: r.tenantId, memberId: r.memberId, token: r.token, platform: r.platform, createdAt: r.createdAt, lastSeenAt: r.lastSeenAt }));
  }

  // ——— Points ———
  async addPoints(e: Omit<PointEntry, "id">) {
    try {
      await this.db.insert(communityPoints).values({ ...e, id: randomUUID() });
      return true;
    } catch (error) {
      if (isDuplicate(error)) return false;
      throw error;
    }
  }
  async takePoints(memberId: string, reason: string, ref: string) {
    const t = communityPoints;
    return this.db.transaction(async (tx) => {
      const where = and(eq(t.memberId, memberId), eq(t.reason, reason), eq(t.ref, ref));
      const [row] = await tx.select({ points: t.points }).from(t).where(where).for("update");
      if (!row) return 0;
      await tx.delete(t).where(where);
      return row.points;
    });
  }
  async gainedSince(memberId: string, reason: string, since: Date) {
    const t = communityPoints;
    const [row] = await this.db
      .select({ n: sql<string | null>`sum(${t.points})` })
      .from(t)
      .where(and(eq(t.memberId, memberId), eq(t.reason, reason), gt(t.points, 0), gte(t.createdAt, since)));
    return Number(row?.n ?? 0);
  }
  async gainsByReason(memberId: string, since: Date) {
    const t = communityPoints;
    const rows = await this.db
      .select({ reason: t.reason, n: sql<string>`sum(${t.points})` })
      .from(t)
      .where(and(eq(t.memberId, memberId), gt(t.points, 0), gte(t.createdAt, since)))
      .groupBy(t.reason);
    return Object.fromEntries(rows.map((r) => [r.reason, Number(r.n)]));
  }
  async history(memberId: string, offset: number, limit: number) {
    const t = communityPoints;
    const rows = await this.db.select().from(t).where(eq(t.memberId, memberId)).orderBy(desc(t.createdAt), desc(t.id)).limit(limit + 1).offset(offset);
    return paged(rows.map((r) => ({ ...r })), offset, limit);
  }
  private scope(tenantId: string, since: Date | null): SQL {
    const t = communityPoints;
    return since ? and(eq(t.tenantId, tenantId), gte(t.createdAt, since))! : eq(t.tenantId, tenantId);
  }
  async board(tenantId: string, since: Date | null, offset: number, limit: number): Promise<BoardRow[]> {
    const t = communityPoints;
    const total = sql<string>`sum(${t.points})`;
    const rows = await this.db
      .select({ memberId: t.memberId, points: total })
      .from(t)
      .where(this.scope(tenantId, since))
      .groupBy(t.memberId)
      .having(sql`sum(${t.points}) > 0`)
      .orderBy(desc(total), asc(sql`min(${t.createdAt})`), asc(t.memberId))
      .limit(limit)
      .offset(offset);
    return rows.map((r) => ({ memberId: r.memberId, points: Number(r.points) }));
  }
  async memberTotal(tenantId: string, memberId: string, since: Date | null) {
    const t = communityPoints;
    const [row] = await this.db
      .select({ n: sql<string | null>`sum(${t.points})` })
      .from(t)
      .where(and(this.scope(tenantId, since), eq(t.memberId, memberId)));
    return Number(row?.n ?? 0);
  }
  async aheadOf(tenantId: string, points: number, since: Date | null) {
    const t = communityPoints;
    const inner = this.db
      .select({ memberId: t.memberId })
      .from(t)
      .where(this.scope(tenantId, since))
      .groupBy(t.memberId)
      .having(sql`sum(${t.points}) > ${points}`)
      .as("ahead");
    const [row] = await this.db.select({ n: sql<string>`count(*)` }).from(inner);
    return Number(row?.n ?? 0);
  }

  // ——— Challenges ———
  async addChallenge(c: Omit<Challenge, "id">) {
    const row = { ...c, id: randomUUID() };
    await this.db.insert(communityChallenges).values(row);
    return challengeOf(row);
  }
  async getChallenge(id: string) {
    const [row] = await this.db.select().from(communityChallenges).where(eq(communityChallenges.id, id));
    return row ? challengeOf(row) : null;
  }
  async updateChallenge(id: string, patch: Partial<Omit<Challenge, "id" | "tenantId" | "createdAt" | "createdBy">>) {
    if (Object.keys(patch).length) await this.db.update(communityChallenges).set(patch).where(eq(communityChallenges.id, id));
    return this.getChallenge(id);
  }
  async deleteChallenge(id: string) {
    await this.db.delete(communityChallenges).where(eq(communityChallenges.id, id));
  }
  async listChallenges(input: { tenantId: string; stage?: ChallengeStage; now: Date; offset: number; limit: number }) {
    const t = communityChallenges;
    const now = input.now;
    const live = eq(t.status, "published");
    const stage: Record<ChallengeStage, SQL> = {
      upcoming: and(live, gt(t.startsAt, now))!,
      open: and(live, lte(t.startsAt, now), gt(t.submitUntil, now))!,
      voting: and(live, lte(t.submitUntil, now), gt(t.voteUntil, now))!,
      closed: or(eq(t.status, "cancelled"), lte(t.voteUntil, now))!,
    };
    const where = input.stage ? and(eq(t.tenantId, input.tenantId), stage[input.stage]) : eq(t.tenantId, input.tenantId);
    const order = input.stage === "closed" ? [desc(t.voteUntil), asc(t.id)] : [asc(t.startsAt), asc(t.id)];
    const rows = await this.db.select().from(t).where(where).orderBy(...order).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(challengeOf), input.offset, input.limit);
  }
  async addSubmission(s: Omit<ChallengeSubmission, "id" | "votes" | "place" | "reward">) {
    const row = { ...s, id: randomUUID(), votes: 0, place: null, reward: null };
    try {
      await this.db.insert(communityChallengeSubmissions).values(row);
    } catch (error) {
      if (isDuplicate(error)) return null;
      throw error;
    }
    return submissionOf(row);
  }
  async getSubmission(id: string) {
    const [row] = await this.db.select().from(communityChallengeSubmissions).where(eq(communityChallengeSubmissions.id, id));
    return row ? submissionOf(row) : null;
  }
  async listSubmissions(input: { challengeId: string; sort: "top" | "new"; offset: number; limit: number; withHidden?: boolean }) {
    const t = communityChallengeSubmissions;
    const where = input.withHidden ? eq(t.challengeId, input.challengeId) : and(eq(t.challengeId, input.challengeId), eq(t.status, "published"));
    const order = input.sort === "top" ? [desc(t.votes), asc(t.createdAt), asc(t.id)] : [desc(t.createdAt), asc(t.id)];
    const rows = await this.db.select().from(t).where(where).orderBy(...order).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(submissionOf), input.offset, input.limit);
  }
  async countSubmissions(challengeId: string) {
    const t = communityChallengeSubmissions;
    const [row] = await this.db.select({ n: sql<string>`count(*)` }).from(t).where(and(eq(t.challengeId, challengeId), eq(t.status, "published")));
    return Number(row?.n ?? 0);
  }
  async updateSubmission(id: string, patch: Partial<Pick<ChallengeSubmission, "status" | "place" | "reward">>) {
    if (Object.keys(patch).length) await this.db.update(communityChallengeSubmissions).set(patch).where(eq(communityChallengeSubmissions.id, id));
    return this.getSubmission(id);
  }
  async submissionOf(challengeId: string, memberId: string) {
    const t = communityChallengeSubmissions;
    const [row] = await this.db.select().from(t).where(and(eq(t.challengeId, challengeId), eq(t.memberId, memberId)));
    return row ? submissionOf(row) : null;
  }
  async addVote(submissionId: string, memberId: string, at: Date) {
    return this.db.transaction(async (tx) => {
      const s = communityChallengeSubmissions;
      const [entry] = await tx.select({ id: s.id }).from(s).where(eq(s.id, submissionId)).for("update");
      if (!entry) return false;
      try {
        await tx.insert(communityChallengeVotes).values({ submissionId, memberId, createdAt: at });
      } catch (error) {
        if (isDuplicate(error)) return false;
        throw error;
      }
      await tx.update(s).set({ votes: sql`${s.votes} + 1` }).where(eq(s.id, submissionId));
      return true;
    });
  }
  async removeVote(submissionId: string, memberId: string) {
    return this.db.transaction(async (tx) => {
      const s = communityChallengeSubmissions;
      const v = communityChallengeVotes;
      await tx.select({ id: s.id }).from(s).where(eq(s.id, submissionId)).for("update");
      const gone = affected(await tx.delete(v).where(and(eq(v.submissionId, submissionId), eq(v.memberId, memberId))));
      if (!gone) return false;
      await tx.update(s).set({ votes: sql`greatest(${s.votes} - 1, 0)` }).where(eq(s.id, submissionId));
      return true;
    });
  }
  async votedOf(submissionIds: readonly string[], memberId: string) {
    if (!submissionIds.length) return new Set<string>();
    const v = communityChallengeVotes;
    const rows = await this.db.select({ id: v.submissionId }).from(v).where(and(inArray(v.submissionId, [...submissionIds]), eq(v.memberId, memberId)));
    return new Set(rows.map((r) => r.id));
  }

  // ——— Events ———
  async addEvent(e: Omit<CommunityEvent, "id" | "rsvpCount" | "remindedDayAt" | "remindedHourAt">) {
    const row = { ...e, id: randomUUID(), rsvpCount: 0, remindedDayAt: null, remindedHourAt: null };
    await this.db.insert(communityEvents).values(row);
    return eventOf(row);
  }
  async getEvent(id: string) {
    const [row] = await this.db.select().from(communityEvents).where(eq(communityEvents.id, id));
    return row ? eventOf(row) : null;
  }
  async updateEvent(id: string, patch: Partial<Omit<CommunityEvent, "id" | "tenantId" | "createdAt" | "createdBy" | "rsvpCount">>) {
    if (Object.keys(patch).length) await this.db.update(communityEvents).set(patch).where(eq(communityEvents.id, id));
    return this.getEvent(id);
  }
  async deleteEvent(id: string) {
    await this.db.delete(communityEvents).where(eq(communityEvents.id, id));
  }
  async listEvents(input: { tenantId: string; when: "upcoming" | "past"; kind?: EventKind; groupId?: string; now: Date; offset: number; limit: number }) {
    const t = communityEvents;
    const conds: SQL[] = [eq(t.tenantId, input.tenantId), input.when === "upcoming" ? gt(t.endsAt, input.now) : lte(t.endsAt, input.now)];
    if (input.kind) conds.push(eq(t.kind, input.kind));
    if (input.groupId) conds.push(eq(t.groupId, input.groupId));
    const order = input.when === "upcoming" ? [asc(t.startsAt), asc(t.id)] : [desc(t.startsAt), asc(t.id)];
    const rows = await this.db.select().from(t).where(and(...conds)).orderBy(...order).limit(input.limit + 1).offset(input.offset);
    return paged(rows.map(eventOf), input.offset, input.limit);
  }
  async eventsToRemind(which: "day" | "hour", from: Date, to: Date) {
    const t = communityEvents;
    const rows = await this.db
      .select()
      .from(t)
      .where(and(eq(t.status, "scheduled"), gte(t.startsAt, from), lt(t.startsAt, to), isNull(which === "day" ? t.remindedDayAt : t.remindedHourAt)))
      .orderBy(asc(t.startsAt));
    return rows.map(eventOf);
  }
  async addRsvp(eventId: string, memberId: string, at: Date): Promise<boolean | "full"> {
    return this.db.transaction(async (tx) => {
      const e = communityEvents;
      // The row lock keeps the count and the capacity honest when many say "going" at once.
      const [event] = await tx.select({ id: e.id, rsvpCount: e.rsvpCount, capacity: e.capacity }).from(e).where(eq(e.id, eventId)).for("update");
      if (!event) return false;
      const [had] = await tx.select({ m: communityEventRsvps.memberId }).from(communityEventRsvps).where(and(eq(communityEventRsvps.eventId, eventId), eq(communityEventRsvps.memberId, memberId)));
      if (had) return false;
      if (event.capacity !== null && event.rsvpCount >= event.capacity) return "full" as const;
      try {
        await tx.insert(communityEventRsvps).values({ eventId, memberId, createdAt: at });
      } catch (error) {
        if (isDuplicate(error)) return false;
        throw error;
      }
      await tx.update(e).set({ rsvpCount: sql`${e.rsvpCount} + 1` }).where(eq(e.id, eventId));
      return true;
    });
  }
  async removeRsvp(eventId: string, memberId: string) {
    return this.db.transaction(async (tx) => {
      const e = communityEvents;
      const r = communityEventRsvps;
      await tx.select({ id: e.id }).from(e).where(eq(e.id, eventId)).for("update");
      const gone = affected(await tx.delete(r).where(and(eq(r.eventId, eventId), eq(r.memberId, memberId))));
      if (!gone) return false;
      await tx.update(e).set({ rsvpCount: sql`greatest(${e.rsvpCount} - 1, 0)` }).where(eq(e.id, eventId));
      return true;
    });
  }
  async rsvpOf(eventIds: readonly string[], memberId: string) {
    if (!eventIds.length) return new Set<string>();
    const r = communityEventRsvps;
    const rows = await this.db.select({ id: r.eventId }).from(r).where(and(inArray(r.eventId, [...eventIds]), eq(r.memberId, memberId)));
    return new Set(rows.map((x) => x.id));
  }
  async attendees(eventId: string, offset: number, limit: number) {
    const r = communityEventRsvps;
    const rows = await this.db.select({ id: r.memberId }).from(r).where(eq(r.eventId, eventId)).orderBy(asc(r.createdAt), asc(r.memberId)).limit(limit + 1).offset(offset);
    return paged(rows.map((x) => x.id), offset, limit);
  }
  async addEventComment(c: Omit<EventComment, "id">) {
    return this.db.transaction(async (tx) => {
      // The event's row lock puts its comments in one line, each after the last.
      await tx.select({ id: communityEvents.id }).from(communityEvents).where(eq(communityEvents.id, c.eventId)).for("update");
      const [last] = await tx.select({ at: communityEventComments.createdAt }).from(communityEventComments).where(eq(communityEventComments.eventId, c.eventId)).orderBy(desc(communityEventComments.createdAt)).limit(1);
      const lastMs = last ? last.at.getTime() : 0;
      const row = { ...c, id: randomUUID(), createdAt: new Date(Math.max(c.createdAt.getTime(), lastMs + 1)) };
      await tx.insert(communityEventComments).values(row);
      return commentOf(row);
    });
  }
  async getEventComment(id: string) {
    const [row] = await this.db.select().from(communityEventComments).where(eq(communityEventComments.id, id));
    return row ? commentOf(row) : null;
  }
  async listEventComments(eventId: string, input: { after?: string | null; limit: number }) {
    const t = communityEventComments;
    const conds: SQL[] = [eq(t.eventId, eventId), eq(t.status, "published")];
    if (input.after) {
      const after = await this.getEventComment(input.after);
      if (after) conds.push(or(gt(t.createdAt, after.createdAt), and(eq(t.createdAt, after.createdAt), gt(t.id, after.id)))!);
    }
    const rows = await this.db.select().from(t).where(and(...conds)).orderBy(asc(t.createdAt), asc(t.id)).limit(input.limit);
    return rows.map(commentOf);
  }
  async setEventCommentStatus(id: string, status: EventComment["status"]) {
    await this.db.update(communityEventComments).set({ status }).where(eq(communityEventComments.id, id));
  }

  // ——— Course orders ———
  async addOrder(o: Omit<CourseOrder, "id">) {
    const row = { ...o, id: randomUUID() };
    await this.db.insert(communityCourseOrders).values(row);
    return orderOf(row);
  }
  async getOrder(id: string) {
    const [row] = await this.db.select().from(communityCourseOrders).where(eq(communityCourseOrders.id, id));
    return row ? orderOf(row) : null;
  }
  async getOrderByToken(tokenHash: string) {
    const [row] = await this.db.select().from(communityCourseOrders).where(eq(communityCourseOrders.tokenHash, tokenHash));
    return row ? orderOf(row) : null;
  }
  async settleOrder(id: string, input: { status: "paid" | "failed"; at: Date; providerRef?: string | null }) {
    const t = communityCourseOrders;
    const set = { status: input.status, ...(input.status === "paid" ? { paidAt: input.at } : {}), ...(input.providerRef ? { providerRef: input.providerRef } : {}) };
    // Only a pending order settles: the webhook and the redirect may both arrive.
    const changed = affected(await this.db.update(t).set(set).where(and(eq(t.id, id), eq(t.status, "pending"), ne(t.status, input.status))));
    return changed ? this.getOrder(id) : null;
  }
  async setOrderRef(id: string, providerRef: string) {
    await this.db.update(communityCourseOrders).set({ providerRef }).where(eq(communityCourseOrders.id, id));
  }
}
