import { newId } from "../../crypto/tokens";
import { contentTarget } from "../api/content-targets";
import { fail, noContent, ok, page, pageOf, requireMember, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { notify, onReported } from "../api/trust-hooks";
import { linkedAppView, memberSummaries, profileView, relationshipWith } from "../api/views";
import type { CommunityMember, CommunityReportReason, CommunityTargetType } from "../types";
import { linkedApps } from "../yallapp";
import { isCommunityAdmin } from "../staff";
import { limitMember } from "./accounts";
import { findMember } from "./profile";

/**
 * 231 Profiles and the social graph: follow (one way, no approval), friends
 * (a request, then accept), block. Between two members where one blocked
 * the other, nothing goes: no follow, no request, and the blocked one
 * doesn't find the other's profile (the blocker still does, to unblock).
 */

/** The member named in the path, as the viewer may see them; 404 when they can't. */
async function visibleMember(ctx: CommunityContext): Promise<CommunityMember> {
  const member = await findMember(ctx, ctx.params.member ?? "");
  if (!member) fail(404, "not_found");
  // A suspended member's profile is hidden from everyone but the admins.
  if (member.status === "suspended" && ctx.member?.id !== member.id && !(ctx.member && (await isCommunityAdmin(ctx.req, ctx.deps.platform, ctx.member)))) fail(404, "not_found");
  if (ctx.member && ctx.member.id !== member.id && (await ctx.store.base.hasBlocked(member.id, ctx.member.id))) fail(404, "not_found");
  return member;
}

/** A target the viewer can act on: not themself, not blocked either way. */
async function otherMember(ctx: MemberContext): Promise<CommunityMember> {
  const member = await visibleMember(ctx);
  if (member.id === ctx.member.id) fail(400, "not_allowed");
  return member;
}

async function blockedBetween(ctx: MemberContext, otherId: string): Promise<boolean> {
  const base = ctx.store.base;
  const [mine, theirs] = await Promise.all([base.hasBlocked(ctx.member.id, otherId), base.hasBlocked(otherId, ctx.member.id)]);
  return mine || theirs;
}

async function relationship(ctx: MemberContext, otherId: string) {
  return ok((await relationshipWith(ctx, otherId))!);
}

/** A page of members by id, without those blocked either way from the viewer. */
async function memberPage(ctx: CommunityContext, ids: string[], offset: number, limit: number): Promise<CommunityResult> {
  const hasMore = ids.length > limit;
  let shown = ids.slice(0, limit);
  if (ctx.member) {
    const hidden = await ctx.store.base.blockedEitherWay(ctx.member.id);
    shown = shown.filter((id) => !hidden.has(id));
  }
  const members = await ctx.store.base.getMembers(shown);
  const active = new Set(members.filter((m) => m.status === "active").map((m) => m.id));
  return ok(page(await memberSummaries(ctx, shown.filter((id) => active.has(id)), { relationships: true }), offset, limit, hasMore));
}

// ------------------------------------------------------------ profiles

export async function getProfile(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await visibleMember(ctx);
  return ok(await profileView(ctx, member));
}

export async function listFollowers(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await visibleMember(ctx);
  const { offset, limit } = pageOf(ctx.query);
  return memberPage(ctx, await ctx.store.base.listFollowers(member.id, offset, limit), offset, limit);
}

export async function listFollowing(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await visibleMember(ctx);
  const { offset, limit } = pageOf(ctx.query);
  return memberPage(ctx, await ctx.store.base.listFollowing(member.id, offset, limit), offset, limit);
}

export async function listFriends(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await visibleMember(ctx);
  const { offset, limit } = pageOf(ctx.query);
  return memberPage(ctx, await ctx.store.base.listFriends(member.id, offset, limit), offset, limit);
}

/** The member's apps from their linked Yallapp account: everyone sees the published ones, the member all. */
export async function listApps(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await visibleMember(ctx);
  if (!member.yallappUserId) return ok({ items: [] });
  const apps = await linkedApps(ctx.deps.platform, member.yallappUserId, ctx.now);
  const own = ctx.member?.id === member.id;
  return ok({ items: apps.filter((a) => own || a.appStoreUrl || a.playStoreUrl).map(linkedAppView) });
}

// ------------------------------------------------------------ follow

export async function follow(ctx: MemberContext): Promise<CommunityResult> {
  const member = await otherMember(ctx);
  if (await blockedBetween(ctx, member.id)) fail(400, "not_allowed");
  const already = await ctx.store.base.isFollowing(ctx.member.id, member.id);
  if (!already) {
    await limitMember(ctx, "follow");
    await ctx.store.base.follow(ctx.member.id, member.id, ctx.now);
    await notify(ctx, { memberId: member.id, kind: "follow", actorId: ctx.member.id, targetType: "member", targetId: ctx.member.id });
  }
  return relationship(ctx, member.id);
}

export async function unfollow(ctx: MemberContext): Promise<CommunityResult> {
  const member = await otherMember(ctx);
  await ctx.store.base.unfollow(ctx.member.id, member.id);
  return relationship(ctx, member.id);
}

// ------------------------------------------------------------ friends

export async function befriend(ctx: MemberContext): Promise<CommunityResult> {
  const member = await otherMember(ctx);
  if (await blockedBetween(ctx, member.id)) fail(400, "not_allowed");
  const base = ctx.store.base;
  const existing = await base.getFriendshipBetween(ctx.member.id, member.id);
  if (!existing) {
    await limitMember(ctx, "friend");
    const id = newId();
    await base.createFriendship({ id, requesterId: ctx.member.id, addresseeId: member.id, status: "pending", createdAt: ctx.now, respondedAt: null });
    await notify(ctx, { memberId: member.id, kind: "friend_request", actorId: ctx.member.id, targetType: "friend_request", targetId: id });
  } else if (existing.status === "pending" && existing.addresseeId === ctx.member.id) {
    // They asked already: this accepts.
    await base.acceptFriendship(existing.id, ctx.now);
    await notify(ctx, { memberId: member.id, kind: "friend_accepted", actorId: ctx.member.id, targetType: "member", targetId: ctx.member.id });
  }
  return relationship(ctx, member.id);
}

export async function unfriend(ctx: MemberContext): Promise<CommunityResult> {
  const member = await otherMember(ctx);
  const existing = await ctx.store.base.getFriendshipBetween(ctx.member.id, member.id);
  if (existing) await ctx.store.base.deleteFriendship(existing.id);
  return relationship(ctx, member.id);
}

export async function listFriendRequests(ctx: MemberContext): Promise<CommunityResult> {
  const direction = ctx.query.get("direction") === "outgoing" ? "outgoing" : "incoming";
  const { offset, limit } = pageOf(ctx.query);
  const requests = await ctx.store.base.listFriendRequests(ctx.member.id, direction, offset, limit);
  const hasMore = requests.length > limit;
  const shown = requests.slice(0, limit);
  const hidden = await ctx.store.base.blockedEitherWay(ctx.member.id);
  const visible = shown.filter((r) => !hidden.has(direction === "incoming" ? r.requesterId : r.addresseeId));
  const others = await memberSummaries(
    ctx,
    visible.map((r) => (direction === "incoming" ? r.requesterId : r.addresseeId)),
  );
  return ok(page(visible.map((r, i) => ({ id: r.id, member: others[i], created_at: r.createdAt.toISOString() })), offset, limit, hasMore));
}

async function incomingRequest(ctx: MemberContext) {
  const request = await ctx.store.base.getFriendship(ctx.params.request_id ?? "");
  if (!request || request.status !== "pending" || request.addresseeId !== ctx.member.id) fail(404, "not_found");
  return request;
}

export async function acceptFriendRequest(ctx: MemberContext): Promise<CommunityResult> {
  const request = await incomingRequest(ctx);
  await ctx.store.base.acceptFriendship(request.id, ctx.now);
  await notify(ctx, { memberId: request.requesterId, kind: "friend_accepted", actorId: ctx.member.id, targetType: "member", targetId: ctx.member.id });
  return relationship(ctx, request.requesterId);
}

export async function declineFriendRequest(ctx: MemberContext): Promise<CommunityResult> {
  const request = await incomingRequest(ctx);
  await ctx.store.base.deleteFriendship(request.id);
  return noContent();
}

// ------------------------------------------------------------ block

export async function block(ctx: MemberContext): Promise<CommunityResult> {
  const member = await findMember(ctx, ctx.params.member ?? "");
  if (!member) fail(404, "not_found");
  if (member.id === ctx.member.id) fail(400, "not_allowed");
  const base = ctx.store.base;
  await base.block(ctx.member.id, member.id, ctx.now);
  // Nothing goes between them any more: follows both ways, the friendship or its request.
  await Promise.all([base.unfollow(ctx.member.id, member.id), base.unfollow(member.id, ctx.member.id)]);
  const friendship = await base.getFriendshipBetween(ctx.member.id, member.id);
  if (friendship) await base.deleteFriendship(friendship.id);
  return relationship(ctx, member.id);
}

export async function unblock(ctx: MemberContext): Promise<CommunityResult> {
  const member = await findMember(ctx, ctx.params.member ?? "");
  if (!member) fail(404, "not_found");
  await ctx.store.base.unblock(ctx.member.id, member.id);
  return relationship(ctx, member.id);
}

export async function listBlocks(ctx: MemberContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const ids = await ctx.store.base.listBlocked(ctx.member.id, offset, limit);
  return ok(page(await memberSummaries(ctx, ids.slice(0, limit), { relationships: true }), offset, limit, ids.length > limit));
}

// ------------------------------------------------------------ reports

const REASONS: readonly CommunityReportReason[] = ["spam", "harassment", "hate", "inappropriate", "misinformation", "impersonation", "other"];
// 232–234 Groups, jobs and pro reviews are reported here too (a conversation by its own path); area B adds its posts, stories and showcase items.
const TARGETS: readonly CommunityTargetType[] = ["member", "question", "answer", "reply", "tutorial", "comment", "group", "job", "pro_review"];

export async function report(ctx: CommunityContext): Promise<CommunityResult> {
  const signed = requireMember(ctx);
  const body = ctx.json();
  const targetType = body.target_type as CommunityTargetType;
  const targetId = typeof body.target_id === "string" ? body.target_id.trim() : "";
  const reason = body.reason as CommunityReportReason;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const fields: Record<string, string> = {};
  if (!TARGETS.includes(targetType)) fields.target_type = "field.invalid";
  if (!targetId) fields.target_id = "field.required";
  if (!REASONS.includes(reason)) fields.reason = "field.invalid";
  if (note.length > 1000) fields.note = "field.too_long";
  if (Object.keys(fields).length) fail(400, "invalid_request", fields);
  await limitMember(signed, "report");
  if (targetType === "member") {
    const member = await findMember(ctx, targetId);
    if (!member || member.id === signed.member.id) fail(404, "not_found");
  } else if (!(await contentTarget(ctx, targetType, targetId))) {
    fail(404, "not_found");
  }
  const made = await ctx.store.base.createReport({
    id: newId(),
    reporterId: signed.member.id,
    targetType,
    targetId,
    reason,
    note,
    status: "open",
    handledBy: null,
    handledAt: null,
    createdAt: ctx.now,
  });
  if (!made) fail(409, "already_reported");
  await onReported(ctx, made);
  return ok({ id: made.id }, 201);
}
