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

/**
 * 231 Area A's data: members and how they sign in, the social graph
 * (follow, friends, block), linking a Yallapp account, reports. The same on
 * the memory store (tests, local runs) and on MySQL (base-mysql.ts); the
 * shared suite tests/unit/community-base-store-suite.ts runs on both.
 *
 * Lists take `offset` and `limit` and answer one more than asked when
 * there are more (callers trim it: `page()` in api/http.ts).
 */
export interface CommunityBaseStore {
  // Members
  createMember(member: CommunityMember): Promise<CommunityMember>;
  getMember(id: string): Promise<CommunityMember | null>;
  getMembers(ids: readonly string[]): Promise<CommunityMember[]>;
  getMemberByEmail(email: string): Promise<CommunityMember | null>;
  getMemberByUsername(username: string): Promise<CommunityMember | null>;
  getMemberByYallappUser(userId: string): Promise<CommunityMember | null>;
  updateMember(id: string, patch: Partial<Omit<CommunityMember, "id" | "createdAt">>): Promise<CommunityMember | null>;
  /** Adds to a member's points (negative takes away); the new total. */
  addPoints(id: string, points: number): Promise<number>;
  deleteMember(id: string): Promise<void>;
  /** By name or username, active members only, best first (search, the admin). */
  searchMembers(q: string, offset: number, limit: number): Promise<CommunityMember[]>;

  // Apple and Google identities
  getIdentity(provider: CommunityIdentity["provider"], subject: string): Promise<CommunityIdentity | null>;
  addIdentity(identity: CommunityIdentity): Promise<void>;
  listIdentities(memberId: string): Promise<CommunityIdentity[]>;

  // Sessions (devices)
  createSession(session: CommunitySession): Promise<void>;
  getSessionByAccess(accessHash: string): Promise<CommunitySession | null>;
  getSessionByRefresh(refreshHash: string): Promise<CommunitySession | null>;
  updateSession(id: string, patch: Partial<Omit<CommunitySession, "id" | "memberId" | "createdAt">>): Promise<void>;
  deleteSession(id: string): Promise<void>;
  /** Every device of the member's, except `keep` when given. */
  deleteSessions(memberId: string, keep?: string): Promise<void>;
  listSessions(memberId: string): Promise<CommunitySession[]>;

  // Email verification and password reset links
  createEmailToken(token: CommunityEmailToken): Promise<void>;
  /** Marks the token used and gives it, once, while it is valid; null otherwise. */
  useEmailToken(tokenHash: string, purpose: CommunityEmailTokenPurpose, now: Date): Promise<CommunityEmailToken | null>;

  // Follow
  follow(followerId: string, followeeId: string, now: Date): Promise<void>;
  unfollow(followerId: string, followeeId: string): Promise<void>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;
  /** Who follows the member, newest first. */
  listFollowers(memberId: string, offset: number, limit: number): Promise<string[]>;
  /** Whom the member follows, newest first. */
  listFollowing(memberId: string, offset: number, limit: number): Promise<string[]>;
  countFollowers(memberId: string): Promise<number>;
  countFollowing(memberId: string): Promise<number>;

  // Friends
  getFriendshipBetween(a: string, b: string): Promise<CommunityFriendship | null>;
  getFriendship(id: string): Promise<CommunityFriendship | null>;
  createFriendship(friendship: CommunityFriendship): Promise<void>;
  acceptFriendship(id: string, now: Date): Promise<void>;
  deleteFriendship(id: string): Promise<void>;
  /** The member's friends' ids, newest friendship first. */
  listFriends(memberId: string, offset: number, limit: number): Promise<string[]>;
  countFriends(memberId: string): Promise<number>;
  /** Pending requests sent to the member (incoming) or by them (outgoing), newest first. */
  listFriendRequests(memberId: string, direction: "incoming" | "outgoing", offset: number, limit: number): Promise<CommunityFriendship[]>;
  countIncomingFriendRequests(memberId: string): Promise<number>;

  // Block
  block(blockerId: string, blockedId: string, now: Date): Promise<void>;
  unblock(blockerId: string, blockedId: string): Promise<void>;
  /** Whether `blockerId` blocked `blockedId`. */
  hasBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  listBlocked(blockerId: string, offset: number, limit: number): Promise<string[]>;
  /** Everyone the member blocked or who blocked them: their content is hidden from the member (areas B and C filter with it). */
  blockedEitherWay(memberId: string): Promise<Set<string>>;

  // Linking a Yallapp account
  createLinkRequest(request: CommunityLinkRequest): Promise<void>;
  getLinkRequest(stateHash: string): Promise<CommunityLinkRequest | null>;
  confirmLinkRequest(stateHash: string, now: Date): Promise<void>;

  // Reports (area C reads and closes them)
  /** Null when the member already reported this target. */
  createReport(report: CommunityReport): Promise<CommunityReport | null>;
  getReport(id: string): Promise<CommunityReport | null>;
  listReports(status: CommunityReportStatus, offset: number, limit: number): Promise<CommunityReport[]>;
  countReportsOn(targetType: CommunityReport["targetType"], targetId: string): Promise<number>;
  updateReport(id: string, patch: Pick<CommunityReport, "status" | "handledBy" | "handledAt">): Promise<void>;
}

/** The pair's key, the same whichever of the two asks: one friendship per two members. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
