import { adminRoleOf } from "../admin/team";
import type { AdminRole } from "../admin/permissions";
import type { DataStore } from "../data/store";
import type { CommunityMember } from "./types";

/**
 * 231 Who runs the community (the coordinator's decision, 24 November
 * 2026): a member whose linked Yallapp account is on Yallapp's own team,
 * by the same check as Yallapp's admin (lib/admin/team.ts adminRoleOf),
 * asked again on every request; nothing is stored, so leaving Yallapp's
 * team, or unlinking, ends it at once.
 *
 * - Community admin: the account is an owner or admin of Yallapp's admin.
 * - "Yallapp Team" (official answers, the team's names): also support, or
 *   a member an admin gave the role "team" (community_members.role).
 *   The stored role "admin" means nothing any more.
 * Area C adds its moderators on top (lib/community/trust/roles.ts).
 */
const ADMINS: readonly AdminRole[] = ["owner", "admin"];
const TEAM: readonly AdminRole[] = ["owner", "admin", "support"];

/** Lookups made in one request, so a page of authors asks once per account. */
const cache = new WeakMap<object, Map<string, Promise<AdminRole | null>>>();

/**
 * The member's role on Yallapp's own team through their linked account; null
 * for none, no link, or a link not made by the full flow: joining or signing
 * in with "Continue with Yallapp", or the one-tap suggested link, never makes
 * anyone run the community, whatever the account is.
 */
export function yallappStaffRole(scope: object, platform: DataStore, member: Pick<CommunityMember, "yallappUserId" | "yallappLinkVia">): Promise<AdminRole | null> {
  const userId = member.yallappUserId;
  if (!userId || member.yallappLinkVia !== "link") return Promise.resolve(null);
  let roles = cache.get(scope);
  if (!roles) cache.set(scope, (roles = new Map()));
  let role = roles.get(userId);
  if (!role) {
    role = platform.getUserById(userId).then((user) => (user ? adminRoleOf(platform, user) : null));
    roles.set(userId, role);
  }
  return role;
}

export async function isCommunityAdmin(scope: object, platform: DataStore, member: Pick<CommunityMember, "yallappUserId" | "yallappLinkVia" | "status">): Promise<boolean> {
  if (member.status !== "active") return false;
  const role = await yallappStaffRole(scope, platform, member);
  return role !== null && ADMINS.includes(role);
}

export async function isYallappTeam(scope: object, platform: DataStore, member: Pick<CommunityMember, "yallappUserId" | "yallappLinkVia" | "role">): Promise<boolean> {
  if (member.role === "team") return true;
  const role = await yallappStaffRole(scope, platform, member);
  return role !== null && TEAM.includes(role);
}
