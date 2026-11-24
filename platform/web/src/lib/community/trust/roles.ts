import { fail, type CommunityContext } from "../api/http";
import type { CommunityMember } from "../types";
import { trustDepsOf } from "./context";
import { roleAllows, staffRole, type StaffRole } from "./service";

/**
 * 231 Yallapp Community's staff: who may use the admins' tools. An admin is
 * a member whose linked Yallapp account is a platform admin (the same check
 * as Yallapp's own admin, src/app/admin: owners and admins of its team),
 * checked again on every request, never kept as a flag. Admins can make
 * members moderators: the moderation queue and reports only, no badges and
 * no settings. Every grant and revoke is in the audit log.
 */
export type { StaffRole };

/** The member's staff role now: "admin", "moderator" or null. */
export async function communityRoleOf(ctx: Pick<CommunityContext, "deps" | "store" | "now">, member: Pick<CommunityMember, "id"> | null): Promise<StaffRole | null> {
  return member ? staffRole(trustDepsOf(ctx), member.id) : null;
}

/** 403 not_admin unless the signed-in member has the role (an admin passes a moderator's check too). */
export async function requireCommunityRole(ctx: CommunityContext, need: StaffRole): Promise<StaffRole> {
  const role = await communityRoleOf(ctx, ctx.member);
  if (!roleAllows(role, need)) fail(403, "not_admin");
  return role!;
}
