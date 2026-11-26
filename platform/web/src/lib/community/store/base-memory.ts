import type { CommunityBaseStore } from "./base";
import { pairKey } from "./base";
import type {
  CommunityEmailToken,
  CommunityEmailTokenPurpose,
  CommunityFriendship,
  CommunityIdentity,
  CommunityLinkRequest,
  CommunityYallappSignin,
  CommunityMember,
  CommunityReport,
  CommunityReportStatus,
  CommunitySession,
} from "../types";

/** A thrown duplicate, as MySQL's ER_DUP_ENTRY, so callers handle both stores alike. */
export class DuplicateKeyError extends Error {
  readonly code = "ER_DUP_ENTRY";
  constructor(readonly key: string) {
    super(`Duplicate entry for ${key}`);
  }
}

const copy = <T>(value: T): T => structuredClone(value);
const byNewest = <T extends { createdAt: Date }>(a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime();

/** 231 Area A's data in memory: tests and local runs. */
export class MemoryCommunityBaseStore implements CommunityBaseStore {
  private members = new Map<string, CommunityMember>();
  private identities = new Map<string, CommunityIdentity>();
  private sessions = new Map<string, CommunitySession>();
  private emailTokens = new Map<string, CommunityEmailToken>();
  private follows = new Map<string, { followerId: string; followeeId: string; createdAt: Date }>();
  private friendships = new Map<string, CommunityFriendship>();
  private blocks = new Map<string, { blockerId: string; blockedId: string; createdAt: Date }>();
  private linkRequests = new Map<string, CommunityLinkRequest>();
  private yallappSignins = new Map<string, CommunityYallappSignin>();
  private reports = new Map<string, CommunityReport>();

  // ---------------------------------------------------------------- members

  private assertUnique(member: CommunityMember, except?: string): void {
    for (const other of this.members.values()) {
      if (other.id === except) continue;
      if (member.email && other.email === member.email) throw new DuplicateKeyError("community_members_email_unique");
      if (other.username === member.username) throw new DuplicateKeyError("community_members_username_unique");
      if (member.yallappUserId && other.yallappUserId === member.yallappUserId) throw new DuplicateKeyError("community_members_yallapp_unique");
    }
  }

  async createMember(member: CommunityMember): Promise<CommunityMember> {
    this.assertUnique(member);
    this.members.set(member.id, copy(member));
    return copy(member);
  }

  async getMember(id: string): Promise<CommunityMember | null> {
    const member = this.members.get(id);
    return member ? copy(member) : null;
  }

  async getMembers(ids: readonly string[]): Promise<CommunityMember[]> {
    return ids.flatMap((id) => {
      const member = this.members.get(id);
      return member ? [copy(member)] : [];
    });
  }

  async getMemberByEmail(email: string): Promise<CommunityMember | null> {
    const wanted = email.toLowerCase();
    for (const member of this.members.values()) if (member.email === wanted) return copy(member);
    return null;
  }

  async getMemberByUsername(username: string): Promise<CommunityMember | null> {
    const wanted = username.toLowerCase();
    for (const member of this.members.values()) if (member.username === wanted) return copy(member);
    return null;
  }

  async getMemberByYallappUser(userId: string): Promise<CommunityMember | null> {
    for (const member of this.members.values()) if (member.yallappUserId === userId) return copy(member);
    return null;
  }

  async updateMember(id: string, patch: Partial<Omit<CommunityMember, "id" | "createdAt">>): Promise<CommunityMember | null> {
    const current = this.members.get(id);
    if (!current) return null;
    const next = { ...current, ...copy(patch) };
    this.assertUnique(next, id);
    this.members.set(id, next);
    return copy(next);
  }

  async addPoints(id: string, points: number): Promise<number> {
    const current = this.members.get(id);
    if (!current) return 0;
    current.points += points;
    return current.points;
  }

  async deleteMember(id: string): Promise<void> {
    this.members.delete(id);
    const drop = <V>(map: Map<string, V>, test: (v: V) => boolean) => {
      for (const [key, value] of map) if (test(value)) map.delete(key);
    };
    drop(this.identities, (v) => v.memberId === id);
    drop(this.sessions, (v) => v.memberId === id);
    drop(this.emailTokens, (v) => v.memberId === id);
    drop(this.follows, (v) => v.followerId === id || v.followeeId === id);
    drop(this.friendships, (v) => v.requesterId === id || v.addresseeId === id);
    drop(this.blocks, (v) => v.blockerId === id || v.blockedId === id);
    drop(this.linkRequests, (v) => v.memberId === id);
    drop(this.reports, (v) => v.reporterId === id);
  }

  async searchMembers(q: string, offset: number, limit: number): Promise<CommunityMember[]> {
    const wanted = q.trim().toLowerCase().replace(/^@/, "");
    const score = (m: CommunityMember) => {
      const name = m.displayName.toLowerCase();
      if (m.username === wanted) return 0;
      if (m.username.startsWith(wanted) || name.startsWith(wanted)) return 1;
      return 2;
    };
    return [...this.members.values()]
      .filter((m) => m.status === "active" && (!wanted || m.username.includes(wanted) || m.displayName.toLowerCase().includes(wanted)))
      .sort((a, b) => score(a) - score(b) || b.points - a.points || a.username.localeCompare(b.username))
      .slice(offset, offset + limit + 1)
      .map(copy);
  }

  // ---------------------------------------------------------------- identities

  async getIdentity(provider: CommunityIdentity["provider"], subject: string): Promise<CommunityIdentity | null> {
    const identity = this.identities.get(`${provider}:${subject}`);
    return identity ? copy(identity) : null;
  }

  async addIdentity(identity: CommunityIdentity): Promise<void> {
    const key = `${identity.provider}:${identity.subject}`;
    if (this.identities.has(key)) throw new DuplicateKeyError("community_identities_pk");
    this.identities.set(key, copy(identity));
  }

  async listIdentities(memberId: string): Promise<CommunityIdentity[]> {
    return [...this.identities.values()].filter((i) => i.memberId === memberId).map(copy);
  }

  // ---------------------------------------------------------------- sessions

  async createSession(session: CommunitySession): Promise<void> {
    this.sessions.set(session.id, copy(session));
  }

  async getSessionByAccess(accessHash: string): Promise<CommunitySession | null> {
    for (const s of this.sessions.values()) if (s.accessHash === accessHash) return copy(s);
    return null;
  }

  async getSessionByRefresh(refreshHash: string): Promise<CommunitySession | null> {
    for (const s of this.sessions.values()) if (s.refreshHash === refreshHash) return copy(s);
    return null;
  }

  async updateSession(id: string, patch: Partial<Omit<CommunitySession, "id" | "memberId" | "createdAt">>): Promise<void> {
    const current = this.sessions.get(id);
    if (current) this.sessions.set(id, { ...current, ...copy(patch) });
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteSessions(memberId: string, keep?: string): Promise<void> {
    for (const [id, s] of this.sessions) if (s.memberId === memberId && id !== keep) this.sessions.delete(id);
  }

  async listSessions(memberId: string): Promise<CommunitySession[]> {
    return [...this.sessions.values()]
      .filter((s) => s.memberId === memberId)
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
      .map(copy);
  }

  // ---------------------------------------------------------------- email tokens

  async createEmailToken(token: CommunityEmailToken): Promise<void> {
    this.emailTokens.set(token.tokenHash, copy(token));
  }

  async useEmailToken(tokenHash: string, purpose: CommunityEmailTokenPurpose, now: Date): Promise<CommunityEmailToken | null> {
    const token = this.emailTokens.get(tokenHash);
    if (!token || token.purpose !== purpose || token.usedAt || token.expiresAt.getTime() <= now.getTime()) return null;
    token.usedAt = now;
    return copy(token);
  }

  // ---------------------------------------------------------------- follow

  async follow(followerId: string, followeeId: string, now: Date): Promise<void> {
    const key = `${followerId}>${followeeId}`;
    if (!this.follows.has(key)) this.follows.set(key, { followerId, followeeId, createdAt: now });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    this.follows.delete(`${followerId}>${followeeId}`);
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    return this.follows.has(`${followerId}>${followeeId}`);
  }

  async listFollowers(memberId: string, offset: number, limit: number): Promise<string[]> {
    return [...this.follows.values()]
      .filter((f) => f.followeeId === memberId)
      .sort(byNewest)
      .slice(offset, offset + limit + 1)
      .map((f) => f.followerId);
  }

  async listFollowing(memberId: string, offset: number, limit: number): Promise<string[]> {
    return [...this.follows.values()]
      .filter((f) => f.followerId === memberId)
      .sort(byNewest)
      .slice(offset, offset + limit + 1)
      .map((f) => f.followeeId);
  }

  async countFollowers(memberId: string): Promise<number> {
    return [...this.follows.values()].filter((f) => f.followeeId === memberId).length;
  }

  async countFollowing(memberId: string): Promise<number> {
    return [...this.follows.values()].filter((f) => f.followerId === memberId).length;
  }

  // ---------------------------------------------------------------- friends

  async getFriendshipBetween(a: string, b: string): Promise<CommunityFriendship | null> {
    const key = pairKey(a, b);
    for (const f of this.friendships.values()) if (pairKey(f.requesterId, f.addresseeId) === key) return copy(f);
    return null;
  }

  async getFriendship(id: string): Promise<CommunityFriendship | null> {
    const f = this.friendships.get(id);
    return f ? copy(f) : null;
  }

  async createFriendship(friendship: CommunityFriendship): Promise<void> {
    if (await this.getFriendshipBetween(friendship.requesterId, friendship.addresseeId)) throw new DuplicateKeyError("community_friendships_pair_unique");
    this.friendships.set(friendship.id, copy(friendship));
  }

  async acceptFriendship(id: string, now: Date): Promise<void> {
    const f = this.friendships.get(id);
    if (f) {
      f.status = "accepted";
      f.respondedAt = now;
    }
  }

  async deleteFriendship(id: string): Promise<void> {
    this.friendships.delete(id);
  }

  async listFriends(memberId: string, offset: number, limit: number): Promise<string[]> {
    return [...this.friendships.values()]
      .filter((f) => f.status === "accepted" && (f.requesterId === memberId || f.addresseeId === memberId))
      .sort((a, b) => (b.respondedAt ?? b.createdAt).getTime() - (a.respondedAt ?? a.createdAt).getTime())
      .slice(offset, offset + limit + 1)
      .map((f) => (f.requesterId === memberId ? f.addresseeId : f.requesterId));
  }

  async countFriends(memberId: string): Promise<number> {
    return [...this.friendships.values()].filter((f) => f.status === "accepted" && (f.requesterId === memberId || f.addresseeId === memberId)).length;
  }

  async listFriendRequests(memberId: string, direction: "incoming" | "outgoing", offset: number, limit: number): Promise<CommunityFriendship[]> {
    return [...this.friendships.values()]
      .filter((f) => f.status === "pending" && (direction === "incoming" ? f.addresseeId : f.requesterId) === memberId)
      .sort(byNewest)
      .slice(offset, offset + limit + 1)
      .map(copy);
  }

  async countIncomingFriendRequests(memberId: string): Promise<number> {
    return [...this.friendships.values()].filter((f) => f.status === "pending" && f.addresseeId === memberId).length;
  }

  // ---------------------------------------------------------------- block

  async block(blockerId: string, blockedId: string, now: Date): Promise<void> {
    const key = `${blockerId}>${blockedId}`;
    if (!this.blocks.has(key)) this.blocks.set(key, { blockerId, blockedId, createdAt: now });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    this.blocks.delete(`${blockerId}>${blockedId}`);
  }

  async hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return this.blocks.has(`${blockerId}>${blockedId}`);
  }

  async listBlocked(blockerId: string, offset: number, limit: number): Promise<string[]> {
    return [...this.blocks.values()]
      .filter((b) => b.blockerId === blockerId)
      .sort(byNewest)
      .slice(offset, offset + limit + 1)
      .map((b) => b.blockedId);
  }

  async blockedEitherWay(memberId: string): Promise<Set<string>> {
    const out = new Set<string>();
    for (const b of this.blocks.values()) {
      if (b.blockerId === memberId) out.add(b.blockedId);
      if (b.blockedId === memberId) out.add(b.blockerId);
    }
    return out;
  }

  // ---------------------------------------------------------------- linking

  async createLinkRequest(request: CommunityLinkRequest): Promise<void> {
    this.linkRequests.set(request.stateHash, copy(request));
  }

  async getLinkRequest(stateHash: string): Promise<CommunityLinkRequest | null> {
    const request = this.linkRequests.get(stateHash);
    return request ? copy(request) : null;
  }

  async confirmLinkRequest(stateHash: string, now: Date): Promise<void> {
    const request = this.linkRequests.get(stateHash);
    if (request) request.confirmedAt = now;
  }

  // ---------------------------------------------------------------- "Continue with Yallapp"

  async createYallappSignin(signin: CommunityYallappSignin): Promise<void> {
    this.yallappSignins.set(signin.requestHash, copy(signin));
  }

  async getYallappSignin(requestHash: string): Promise<CommunityYallappSignin | null> {
    const signin = this.yallappSignins.get(requestHash);
    return signin ? copy(signin) : null;
  }

  async approveYallappSignin(requestHash: string, approval: { yallappUserId: string; codeHash: string; expiresAt: Date }, now: Date): Promise<boolean> {
    const signin = this.yallappSignins.get(requestHash);
    if (!signin || signin.approvedAt || signin.expiresAt.getTime() <= now.getTime()) return false;
    Object.assign(signin, approval, { approvedAt: now });
    return true;
  }

  async useYallappSignin(codeHash: string, now: Date): Promise<CommunityYallappSignin | null> {
    for (const signin of this.yallappSignins.values()) {
      if (signin.codeHash !== codeHash) continue;
      if (signin.usedAt || !signin.approvedAt || signin.expiresAt.getTime() <= now.getTime()) return null;
      signin.usedAt = now;
      return copy(signin);
    }
    return null;
  }

  // ---------------------------------------------------------------- reports

  async createReport(report: CommunityReport): Promise<CommunityReport | null> {
    for (const r of this.reports.values()) {
      if (r.reporterId === report.reporterId && r.targetType === report.targetType && r.targetId === report.targetId) return null;
    }
    this.reports.set(report.id, copy(report));
    return copy(report);
  }

  async getReport(id: string): Promise<CommunityReport | null> {
    const report = this.reports.get(id);
    return report ? copy(report) : null;
  }

  async listReports(status: CommunityReportStatus, offset: number, limit: number): Promise<CommunityReport[]> {
    return [...this.reports.values()]
      .filter((r) => r.status === status)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(offset, offset + limit + 1)
      .map(copy);
  }

  async countReportsOn(targetType: CommunityReport["targetType"], targetId: string): Promise<number> {
    return [...this.reports.values()].filter((r) => r.targetType === targetType && r.targetId === targetId).length;
  }

  async updateReport(id: string, patch: Pick<CommunityReport, "status" | "handledBy" | "handledAt">): Promise<void> {
    const report = this.reports.get(id);
    if (report) this.reports.set(id, { ...report, ...copy(patch) });
  }
}
