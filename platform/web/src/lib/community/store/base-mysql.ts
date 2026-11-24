import { and, asc, count, desc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import {
  communityBlocks,
  communityEmailTokens,
  communityFollows,
  communityFriendships,
  communityIdentities,
  communityLinkRequests,
  communityMembers,
  communityReports,
  communitySessions,
} from "../../db/community-schema";
import type { CommunityBaseStore } from "./base";
import { pairKey } from "./base";
import { isDuplicate, type CommunityDb } from "./db";
import type {
  CommunityEmailToken,
  CommunityEmailTokenPurpose,
  CommunityFriendship,
  CommunityIdentity,
  CommunityLinkRequest,
  CommunityMember,
  CommunityReport,
  CommunityReportStatus,
  CommunitySession,
} from "../types";

type FriendshipRow = typeof communityFriendships.$inferSelect;
const friendshipOf = (row: FriendshipRow): CommunityFriendship => ({
  id: row.id,
  requesterId: row.requesterId,
  addresseeId: row.addresseeId,
  status: row.status,
  createdAt: row.createdAt,
  respondedAt: row.respondedAt,
});

/** `%` and `_` in a search typed by a member are letters, not wildcards. */
const likeText = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** 231 Area A's data on MySQL or MariaDB (migration 0155). */
export class MysqlCommunityBaseStore implements CommunityBaseStore {
  constructor(protected readonly db: CommunityDb) {}

  // ---------------------------------------------------------------- members

  async createMember(member: CommunityMember): Promise<CommunityMember> {
    await this.db.insert(communityMembers).values(member);
    return member;
  }

  async getMember(id: string): Promise<CommunityMember | null> {
    const [row] = await this.db.select().from(communityMembers).where(eq(communityMembers.id, id)).limit(1);
    return row ?? null;
  }

  async getMembers(ids: readonly string[]): Promise<CommunityMember[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(communityMembers)
      .where(inArray(communityMembers.id, [...new Set(ids)]));
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }

  async getMemberByEmail(email: string): Promise<CommunityMember | null> {
    const [row] = await this.db.select().from(communityMembers).where(eq(communityMembers.email, email.toLowerCase())).limit(1);
    return row ?? null;
  }

  async getMemberByUsername(username: string): Promise<CommunityMember | null> {
    const [row] = await this.db.select().from(communityMembers).where(eq(communityMembers.username, username.toLowerCase())).limit(1);
    return row ?? null;
  }

  async getMemberByYallappUser(userId: string): Promise<CommunityMember | null> {
    const [row] = await this.db.select().from(communityMembers).where(eq(communityMembers.yallappUserId, userId)).limit(1);
    return row ?? null;
  }

  async updateMember(id: string, patch: Partial<Omit<CommunityMember, "id" | "createdAt">>): Promise<CommunityMember | null> {
    if (Object.keys(patch).length > 0) await this.db.update(communityMembers).set(patch).where(eq(communityMembers.id, id));
    return this.getMember(id);
  }

  async addPoints(id: string, points: number): Promise<number> {
    await this.db
      .update(communityMembers)
      .set({ points: sql`${communityMembers.points} + ${points}` })
      .where(eq(communityMembers.id, id));
    const [row] = await this.db.select({ points: communityMembers.points }).from(communityMembers).where(eq(communityMembers.id, id)).limit(1);
    return row?.points ?? 0;
  }

  async deleteMember(id: string): Promise<void> {
    // The community_* rows that reference the member go with it (ON DELETE CASCADE).
    await this.db.delete(communityMembers).where(eq(communityMembers.id, id));
  }

  async searchMembers(q: string, offset: number, limit: number): Promise<CommunityMember[]> {
    const wanted = q.trim().toLowerCase().replace(/^@/, "");
    const m = communityMembers;
    const match = wanted ? or(like(m.username, likeText(wanted)), like(m.displayName, likeText(wanted))) : undefined;
    return this.db
      .select()
      .from(m)
      .where(and(eq(m.status, "active"), match))
      .orderBy(
        sql`case when ${m.username} = ${wanted} then 0 when ${m.username} like ${`${wanted}%`} or ${m.displayName} like ${`${wanted}%`} then 1 else 2 end`,
        desc(m.points),
        asc(m.username),
      )
      .limit(limit + 1)
      .offset(offset);
  }

  // ---------------------------------------------------------------- identities

  async getIdentity(provider: CommunityIdentity["provider"], subject: string): Promise<CommunityIdentity | null> {
    const t = communityIdentities;
    const [row] = await this.db
      .select()
      .from(t)
      .where(and(eq(t.provider, provider), eq(t.subject, subject)))
      .limit(1);
    return row ?? null;
  }

  async addIdentity(identity: CommunityIdentity): Promise<void> {
    await this.db.insert(communityIdentities).values(identity);
  }

  async listIdentities(memberId: string): Promise<CommunityIdentity[]> {
    return this.db.select().from(communityIdentities).where(eq(communityIdentities.memberId, memberId));
  }

  // ---------------------------------------------------------------- sessions

  async createSession(session: CommunitySession): Promise<void> {
    await this.db.insert(communitySessions).values(session);
  }

  async getSessionByAccess(accessHash: string): Promise<CommunitySession | null> {
    const [row] = await this.db.select().from(communitySessions).where(eq(communitySessions.accessHash, accessHash)).limit(1);
    return row ?? null;
  }

  async getSessionByRefresh(refreshHash: string): Promise<CommunitySession | null> {
    const [row] = await this.db.select().from(communitySessions).where(eq(communitySessions.refreshHash, refreshHash)).limit(1);
    return row ?? null;
  }

  async updateSession(id: string, patch: Partial<Omit<CommunitySession, "id" | "memberId" | "createdAt">>): Promise<void> {
    if (Object.keys(patch).length > 0) await this.db.update(communitySessions).set(patch).where(eq(communitySessions.id, id));
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.delete(communitySessions).where(eq(communitySessions.id, id));
  }

  async deleteSessions(memberId: string, keep?: string): Promise<void> {
    const t = communitySessions;
    await this.db.delete(t).where(and(eq(t.memberId, memberId), keep ? sql`${t.id} <> ${keep}` : undefined));
  }

  async listSessions(memberId: string): Promise<CommunitySession[]> {
    return this.db.select().from(communitySessions).where(eq(communitySessions.memberId, memberId)).orderBy(desc(communitySessions.lastSeenAt));
  }

  // ---------------------------------------------------------------- email tokens

  async createEmailToken(token: CommunityEmailToken): Promise<void> {
    await this.db.insert(communityEmailTokens).values(token);
  }

  async useEmailToken(tokenHash: string, purpose: CommunityEmailTokenPurpose, now: Date): Promise<CommunityEmailToken | null> {
    const t = communityEmailTokens;
    const [result] = await this.db
      .update(t)
      .set({ usedAt: now })
      .where(and(eq(t.tokenHash, tokenHash), eq(t.purpose, purpose), isNull(t.usedAt), gt(t.expiresAt, now)));
    if (result.affectedRows !== 1) return null;
    const [row] = await this.db.select().from(t).where(eq(t.tokenHash, tokenHash)).limit(1);
    return row ?? null;
  }

  // ---------------------------------------------------------------- follow

  async follow(followerId: string, followeeId: string, now: Date): Promise<void> {
    await this.db.insert(communityFollows).ignore().values({ followerId, followeeId, createdAt: now });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    const t = communityFollows;
    await this.db.delete(t).where(and(eq(t.followerId, followerId), eq(t.followeeId, followeeId)));
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const t = communityFollows;
    const [row] = await this.db
      .select({ id: t.followerId })
      .from(t)
      .where(and(eq(t.followerId, followerId), eq(t.followeeId, followeeId)))
      .limit(1);
    return Boolean(row);
  }

  async listFollowers(memberId: string, offset: number, limit: number): Promise<string[]> {
    const t = communityFollows;
    const rows = await this.db
      .select({ id: t.followerId })
      .from(t)
      .where(eq(t.followeeId, memberId))
      .orderBy(desc(t.createdAt))
      .limit(limit + 1)
      .offset(offset);
    return rows.map((r) => r.id);
  }

  async listFollowing(memberId: string, offset: number, limit: number): Promise<string[]> {
    const t = communityFollows;
    const rows = await this.db
      .select({ id: t.followeeId })
      .from(t)
      .where(eq(t.followerId, memberId))
      .orderBy(desc(t.createdAt))
      .limit(limit + 1)
      .offset(offset);
    return rows.map((r) => r.id);
  }

  async countFollowers(memberId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(communityFollows).where(eq(communityFollows.followeeId, memberId));
    return row?.n ?? 0;
  }

  async countFollowing(memberId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(communityFollows).where(eq(communityFollows.followerId, memberId));
    return row?.n ?? 0;
  }

  // ---------------------------------------------------------------- friends

  async getFriendshipBetween(a: string, b: string): Promise<CommunityFriendship | null> {
    const [row] = await this.db.select().from(communityFriendships).where(eq(communityFriendships.pairKey, pairKey(a, b))).limit(1);
    return row ? friendshipOf(row) : null;
  }

  async getFriendship(id: string): Promise<CommunityFriendship | null> {
    const [row] = await this.db.select().from(communityFriendships).where(eq(communityFriendships.id, id)).limit(1);
    return row ? friendshipOf(row) : null;
  }

  async createFriendship(friendship: CommunityFriendship): Promise<void> {
    await this.db.insert(communityFriendships).values({ ...friendship, pairKey: pairKey(friendship.requesterId, friendship.addresseeId) });
  }

  async acceptFriendship(id: string, now: Date): Promise<void> {
    await this.db.update(communityFriendships).set({ status: "accepted", respondedAt: now }).where(eq(communityFriendships.id, id));
  }

  async deleteFriendship(id: string): Promise<void> {
    await this.db.delete(communityFriendships).where(eq(communityFriendships.id, id));
  }

  async listFriends(memberId: string, offset: number, limit: number): Promise<string[]> {
    const t = communityFriendships;
    const rows = await this.db
      .select({ requesterId: t.requesterId, addresseeId: t.addresseeId })
      .from(t)
      .where(and(eq(t.status, "accepted"), or(eq(t.requesterId, memberId), eq(t.addresseeId, memberId))))
      .orderBy(desc(sql`coalesce(${t.respondedAt}, ${t.createdAt})`))
      .limit(limit + 1)
      .offset(offset);
    return rows.map((r) => (r.requesterId === memberId ? r.addresseeId : r.requesterId));
  }

  async countFriends(memberId: string): Promise<number> {
    const t = communityFriendships;
    const [row] = await this.db
      .select({ n: count() })
      .from(t)
      .where(and(eq(t.status, "accepted"), or(eq(t.requesterId, memberId), eq(t.addresseeId, memberId))));
    return row?.n ?? 0;
  }

  async listFriendRequests(memberId: string, direction: "incoming" | "outgoing", offset: number, limit: number): Promise<CommunityFriendship[]> {
    const t = communityFriendships;
    const rows = await this.db
      .select()
      .from(t)
      .where(and(eq(t.status, "pending"), eq(direction === "incoming" ? t.addresseeId : t.requesterId, memberId)))
      .orderBy(desc(t.createdAt))
      .limit(limit + 1)
      .offset(offset);
    return rows.map(friendshipOf);
  }

  async countIncomingFriendRequests(memberId: string): Promise<number> {
    const t = communityFriendships;
    const [row] = await this.db
      .select({ n: count() })
      .from(t)
      .where(and(eq(t.status, "pending"), eq(t.addresseeId, memberId)));
    return row?.n ?? 0;
  }

  // ---------------------------------------------------------------- block

  async block(blockerId: string, blockedId: string, now: Date): Promise<void> {
    await this.db.insert(communityBlocks).ignore().values({ blockerId, blockedId, createdAt: now });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    const t = communityBlocks;
    await this.db.delete(t).where(and(eq(t.blockerId, blockerId), eq(t.blockedId, blockedId)));
  }

  async hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const t = communityBlocks;
    const [row] = await this.db
      .select({ id: t.blockerId })
      .from(t)
      .where(and(eq(t.blockerId, blockerId), eq(t.blockedId, blockedId)))
      .limit(1);
    return Boolean(row);
  }

  async listBlocked(blockerId: string, offset: number, limit: number): Promise<string[]> {
    const t = communityBlocks;
    const rows = await this.db
      .select({ id: t.blockedId })
      .from(t)
      .where(eq(t.blockerId, blockerId))
      .orderBy(desc(t.createdAt))
      .limit(limit + 1)
      .offset(offset);
    return rows.map((r) => r.id);
  }

  async blockedEitherWay(memberId: string): Promise<Set<string>> {
    const t = communityBlocks;
    const rows = await this.db
      .select({ blockerId: t.blockerId, blockedId: t.blockedId })
      .from(t)
      .where(or(eq(t.blockerId, memberId), eq(t.blockedId, memberId)));
    return new Set(rows.map((r) => (r.blockerId === memberId ? r.blockedId : r.blockerId)));
  }

  // ---------------------------------------------------------------- linking

  async createLinkRequest(request: CommunityLinkRequest): Promise<void> {
    await this.db.insert(communityLinkRequests).values(request);
  }

  async getLinkRequest(stateHash: string): Promise<CommunityLinkRequest | null> {
    const [row] = await this.db.select().from(communityLinkRequests).where(eq(communityLinkRequests.stateHash, stateHash)).limit(1);
    return row ?? null;
  }

  async confirmLinkRequest(stateHash: string, now: Date): Promise<void> {
    await this.db.update(communityLinkRequests).set({ confirmedAt: now }).where(eq(communityLinkRequests.stateHash, stateHash));
  }

  // ---------------------------------------------------------------- reports

  async createReport(report: CommunityReport): Promise<CommunityReport | null> {
    try {
      await this.db.insert(communityReports).values(report);
      return report;
    } catch (error) {
      if (isDuplicate(error)) return null;
      throw error;
    }
  }

  async getReport(id: string): Promise<CommunityReport | null> {
    const [row] = await this.db.select().from(communityReports).where(eq(communityReports.id, id)).limit(1);
    return row ?? null;
  }

  async listReports(status: CommunityReportStatus, offset: number, limit: number): Promise<CommunityReport[]> {
    return this.db
      .select()
      .from(communityReports)
      .where(eq(communityReports.status, status))
      .orderBy(asc(communityReports.createdAt))
      .limit(limit + 1)
      .offset(offset);
  }

  async countReportsOn(targetType: CommunityReport["targetType"], targetId: string): Promise<number> {
    const t = communityReports;
    const [row] = await this.db
      .select({ n: count() })
      .from(t)
      .where(and(eq(t.targetType, targetType), eq(t.targetId, targetId)));
    return row?.n ?? 0;
  }

  async updateReport(id: string, patch: Pick<CommunityReport, "status" | "handledBy" | "handledAt">): Promise<void> {
    await this.db.update(communityReports).set(patch).where(eq(communityReports.id, id));
  }
}
