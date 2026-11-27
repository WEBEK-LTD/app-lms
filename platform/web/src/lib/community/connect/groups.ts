import { randomBytes } from "node:crypto";
import { newId } from "../../crypto/tokens";
import { fail, noContent, ok, pageOf, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { notify } from "../api/trust-hooks";
import type { MemberSummaryView } from "../api/views";
import { isCommunityAdmin } from "../staff";
import { trustDepsOf } from "../trust/context";
import { getSettings, moderateNew } from "../trust/service";
import { mayCreateGroups } from "../trust/settings";
import { YALLAPP_TENANT } from "../types";
import { invalidIf, limitConnect, namedMember, pageOfRows, storePicture, summaries, text } from "./common";
import type { Group, GroupMember, GroupRole } from "./types";

/**
 * 232.5 Groups: public (anyone joins) or private (a request its owner or
 * moderators accept). Who creates them follows the admin setting "Who can
 * create groups"; a new member's group waits for review like their first
 * posts. Each has one owner (who hands it over before leaving) and
 * moderators. Its posts and questions are area B's, with `group_id`
 * (`readableGroup` tells B whether the viewer may read them).
 */

const ROLES: readonly GroupRole[] = ["owner", "moderator", "member"];

/** A slug from the name: Latin letters and digits, with a short random part when the name has none. */
function slugOf(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base.length >= 3 ? base : `group-${randomBytes(3).toString("hex")}`;
}

/** Whether the viewer runs the community (Yallapp's admins, or a client app's from its dashboard). */
async function communityAdmin(ctx: CommunityContext): Promise<boolean> {
  if (!ctx.member) return false;
  return ctx.deps.tenant === YALLAPP_TENANT ? isCommunityAdmin(ctx.req, ctx.deps.platform, ctx.member) : ctx.req.tenantAdmin === true;
}

async function groupInPath(ctx: CommunityContext): Promise<Group> {
  const ref = ctx.params.group ?? "";
  const store = ctx.store.connect;
  const group = (await store.getGroup(ref)) ?? (await store.getGroupBySlug(ref.toLowerCase()));
  if (!group || group.status === "removed") fail(404, "not_found");
  if (group.status === "pending") {
    // Waiting for review: its owner and the community's admins see it.
    const mine = ctx.member && (await store.getGroupMember(group.id, ctx.member.id))?.status === "active";
    if (!mine && !(await communityAdmin(ctx))) fail(404, "not_found");
  }
  return group;
}

async function standingOf(ctx: CommunityContext, group: Group): Promise<GroupMember | null> {
  return ctx.member ? ctx.store.connect.getGroupMember(group.id, ctx.member.id) : null;
}

function standingView(m: GroupMember | null) {
  return { role: m?.status === "active" ? m.role : null, requested: m?.status === "requested" };
}

async function groupView(ctx: CommunityContext, group: Group, people?: Map<string, MemberSummaryView>) {
  const owner = (people ?? (await summaries(ctx, [group.ownerId]))).get(group.ownerId)!;
  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    description: group.description,
    visibility: group.visibility,
    cover_url: group.coverUrl,
    owner,
    member_count: group.memberCount,
    post_count: group.postCount,
    status: group.status,
    standing: standingView(await standingOf(ctx, group)),
    created_at: group.createdAt.toISOString(),
  };
}

/** The viewer's role in the group, or null; moderators and the owner run it, and so do the community's admins. */
async function runs(ctx: MemberContext, group: Group): Promise<boolean> {
  const m = await ctx.store.connect.getGroupMember(group.id, ctx.member.id);
  return (m?.status === "active" && (m.role === "owner" || m.role === "moderator")) || (await communityAdmin(ctx));
}

/**
 * For area B: whether the viewer may read the group's posts and questions
 * (a public group: anyone; a private one: its members and the community's
 * admins), and may write in it (its members). 404 for no such group.
 */
export async function readableGroup(ctx: CommunityContext, groupRef: string): Promise<{ group: Group; canRead: boolean; canPost: boolean }> {
  const group = await groupInPath({ ...ctx, params: { ...ctx.params, group: groupRef } });
  const m = await standingOf(ctx, group);
  const member = m?.status === "active";
  const canRead = group.visibility === "public" || member || (await communityAdmin(ctx));
  return { group, canRead, canPost: member && group.status === "active" };
}

/** For area B: a post or question in the group was added (+1) or removed (-1); the group is active now. */
export async function groupPosted(ctx: CommunityContext, groupId: string, delta: number): Promise<void> {
  const group = await ctx.store.connect.getGroup(groupId);
  if (group) await ctx.store.connect.updateGroup(groupId, { postCount: Math.max(0, group.postCount + delta), ...(delta > 0 ? { lastActiveAt: ctx.now } : {}) });
}

// ------------------------------------------------------------ handlers

export async function listGroups(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const mine = ctx.query.get("mine") === "true" || ctx.query.get("mine") === "1";
  if (mine && !ctx.member) fail(401, "invalid_token");
  const rows = await ctx.store.connect.listGroups({ q: ctx.query.get("q") ?? undefined, memberId: mine ? ctx.member!.id : undefined, offset, limit });
  const people = await summaries(ctx, rows.map((g) => g.ownerId));
  const items = [];
  for (const g of rows.slice(0, limit)) items.push(await groupView(ctx, g, people));
  return ok({ items, next_cursor: rows.length > limit ? String(offset + limit) : null });
}

function readInput(body: Record<string, unknown>, partial: boolean) {
  const fields: Record<string, string> = {};
  const name = body.name !== undefined || !partial ? text(body, "name", { min: 3, max: 80, required: true }, fields) : undefined;
  const description = body.description !== undefined ? text(body, "description", { max: 2000 }, fields) : undefined;
  const visibility = body.visibility;
  if (visibility !== undefined && visibility !== "public" && visibility !== "private") fields.visibility = "field.invalid";
  invalidIf(fields);
  return { name, description, visibility: visibility as Group["visibility"] | undefined };
}

export async function createGroup(ctx: MemberContext): Promise<CommunityResult> {
  const input = readInput(ctx.json(), false);
  const settings = await getSettings(trustDepsOf(ctx));
  const hasBadge = (await summaries(ctx, [ctx.member.id])).get(ctx.member.id)?.top_badge != null;
  if (!mayCreateGroups(settings, { id: ctx.member.id, hasBadge, admin: await communityAdmin(ctx) })) fail(403, "not_allowed");
  await limitConnect(ctx, "group");
  const store = ctx.store.connect;
  const base = slugOf(input.name!);
  const group: Group = {
    id: newId(),
    slug: base,
    name: input.name!,
    description: input.description ?? "",
    visibility: input.visibility ?? "public",
    coverUrl: null,
    ownerId: ctx.member.id,
    status: "active",
    memberCount: 1,
    postCount: 0,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    lastActiveAt: ctx.now,
  };
  const owner: GroupMember = { groupId: group.id, memberId: ctx.member.id, role: "owner", status: "active", joinedAt: ctx.now };
  let made = false;
  for (let n = 1; n <= 20 && !made; n++) {
    group.slug = n === 1 ? base : `${base.slice(0, 56)}-${n}`;
    made = await store.createGroup(group, owner);
  }
  if (!made) fail(409, "not_allowed");
  // A new member's group (and any the spam filter catches) waits for review.
  const moderated = await moderateNew(trustDepsOf(ctx), { memberId: ctx.member.id, targetType: "group", targetId: group.id, text: `${group.name}\n${group.description}` });
  if (moderated.status === "pending") await store.updateGroup(group.id, { status: "pending" });
  return ok(await groupView(ctx, (await store.getGroup(group.id))!), 201);
}

export async function getGroup(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await groupView(ctx, await groupInPath(ctx)));
}

export async function updateGroup(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (!(await runs(ctx, group))) fail(403, "not_allowed");
  const input = readInput(ctx.json(), true);
  await ctx.store.connect.updateGroup(group.id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    updatedAt: ctx.now,
  });
  // Made public: those who asked to join are in.
  if (input.visibility === "public" && group.visibility === "private") {
    for (const r of await ctx.store.connect.listGroupMembers(group.id, { status: "requested", offset: 0, limit: 500 })) await ctx.store.connect.saveGroupMember({ ...r, status: "active", joinedAt: ctx.now });
    await ctx.store.connect.recountGroup(group.id);
  }
  return ok(await groupView(ctx, (await ctx.store.connect.getGroup(group.id))!));
}

export async function deleteGroup(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (group.ownerId !== ctx.member.id && !(await communityAdmin(ctx))) fail(403, "not_allowed");
  await ctx.store.connect.deleteGroup(group.id);
  return noContent();
}

export async function setCover(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (!(await runs(ctx, group))) fail(403, "not_allowed");
  const file = ctx.req.form?.get("file");
  if (!file) fail(400, "invalid_image");
  const url = await storePicture(ctx, file, "file");
  await ctx.store.connect.updateGroup(group.id, { coverUrl: url, updatedAt: ctx.now });
  return ok(await groupView(ctx, (await ctx.store.connect.getGroup(group.id))!));
}

export async function removeCover(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (!(await runs(ctx, group))) fail(403, "not_allowed");
  await ctx.store.connect.updateGroup(group.id, { coverUrl: null, updatedAt: ctx.now });
  return ok(await groupView(ctx, (await ctx.store.connect.getGroup(group.id))!));
}

export async function join(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (group.status !== "active") fail(400, "not_allowed");
  const store = ctx.store.connect;
  const current = await store.getGroupMember(group.id, ctx.member.id);
  if (!current) {
    // Never into a group whose owner blocked them, or that they blocked.
    if ((await ctx.store.base.blockedEitherWay(ctx.member.id)).has(group.ownerId)) fail(400, "not_allowed");
    const status = group.visibility === "public" ? "active" : "requested";
    await store.saveGroupMember({ groupId: group.id, memberId: ctx.member.id, role: "member", status, joinedAt: ctx.now });
    if (status === "active") await store.recountGroup(group.id);
    else {
      const runners = await store.listGroupMembers(group.id, { status: "active", offset: 0, limit: 20 });
      for (const r of runners.filter((m) => m.role !== "member")) {
        await notify(ctx, { memberId: r.memberId, kind: "group_request", actorId: ctx.member.id, targetType: "group", targetId: group.id, data: { title: group.name }, link: `/groups/${group.slug}/requests` });
      }
    }
  }
  return ok(standingView(await store.getGroupMember(group.id, ctx.member.id)));
}

export async function leave(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  const store = ctx.store.connect;
  const current = await store.getGroupMember(group.id, ctx.member.id);
  if (current?.role === "owner" && current.status === "active") fail(400, "owner_must_transfer");
  if (current) {
    await store.removeGroupMember(group.id, ctx.member.id);
    await store.recountGroup(group.id);
  }
  return ok(standingView(null));
}

async function memberRows(ctx: CommunityContext, rows: GroupMember[], offset: number, limit: number) {
  const people = await summaries(ctx, rows.map((m) => m.memberId));
  return pageOfRows(rows, offset, limit, (m) => ({ member: people.get(m.memberId)!, role: m.role, joined_at: m.joinedAt.toISOString() }));
}

export async function listMembers(ctx: CommunityContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (group.visibility === "private") {
    const m = await standingOf(ctx, group);
    if (m?.status !== "active" && !(await communityAdmin(ctx))) fail(403, "group_private");
  }
  const role = ctx.query.get("role");
  if (role !== null && !ROLES.includes(role as GroupRole)) fail(400, "invalid_request", { role: "field.invalid" });
  const { offset, limit } = pageOf(ctx.query);
  const rows = await ctx.store.connect.listGroupMembers(group.id, { status: "active", role: (role as GroupRole | null) ?? undefined, offset, limit });
  return ok(await memberRows(ctx, rows, offset, limit));
}

export async function listRequests(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (!(await runs(ctx, group))) fail(403, "not_allowed");
  const { offset, limit } = pageOf(ctx.query);
  const rows = await ctx.store.connect.listGroupMembers(group.id, { status: "requested", offset, limit });
  return ok(await memberRows(ctx, rows, offset, limit));
}

async function requestOf(ctx: MemberContext, group: Group): Promise<GroupMember> {
  const member = await namedMember(ctx);
  const request = await ctx.store.connect.getGroupMember(group.id, member.id);
  if (!request || request.status !== "requested") fail(404, "not_found");
  return request;
}

export async function acceptRequest(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (!(await runs(ctx, group))) fail(403, "not_allowed");
  const request = await requestOf(ctx, group);
  const joined: GroupMember = { ...request, status: "active", joinedAt: ctx.now };
  await ctx.store.connect.saveGroupMember(joined);
  await ctx.store.connect.recountGroup(group.id);
  await notify(ctx, { memberId: request.memberId, kind: "group_joined", actorId: ctx.member.id, targetType: "group", targetId: group.id, data: { title: group.name }, link: `/groups/${group.slug}` });
  return ok((await memberRows(ctx, [joined], 0, 1)).items[0]);
}

export async function declineRequest(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (!(await runs(ctx, group))) fail(403, "not_allowed");
  const request = await requestOf(ctx, group);
  await ctx.store.connect.removeGroupMember(group.id, request.memberId);
  return noContent();
}

/** The owner makes a member a moderator or a member again, or hands the group over (`owner`). */
export async function setRole(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  const isOwner = group.ownerId === ctx.member.id;
  if (!isOwner && !(await communityAdmin(ctx))) fail(403, "not_allowed");
  const role = ctx.json().role as GroupRole;
  if (!ROLES.includes(role)) fail(400, "invalid_request", { role: "field.invalid" });
  const member = await namedMember(ctx);
  const store = ctx.store.connect;
  const target = await store.getGroupMember(group.id, member.id);
  if (!target || target.status !== "active" || target.role === "owner") fail(400, "not_allowed");
  if (role === "owner") {
    // Handed over: the old owner stays, as a moderator.
    const old = await store.getGroupMember(group.id, group.ownerId);
    if (old) await store.saveGroupMember({ ...old, role: "moderator" });
    await store.updateGroup(group.id, { ownerId: member.id, updatedAt: ctx.now });
  }
  const changed: GroupMember = { ...target, role };
  await store.saveGroupMember(changed);
  return ok((await memberRows(ctx, [changed], 0, 1)).items[0]);
}

export async function removeMember(ctx: MemberContext): Promise<CommunityResult> {
  const group = await groupInPath(ctx);
  if (!(await runs(ctx, group))) fail(403, "not_allowed");
  const member = await namedMember(ctx);
  const store = ctx.store.connect;
  const target = await store.getGroupMember(group.id, member.id);
  if (!target) fail(404, "not_found");
  if (target.role === "owner") fail(400, "not_allowed");
  // A moderator removes members; only the owner (or an admin) removes a moderator.
  const mine = await store.getGroupMember(group.id, ctx.member.id);
  if (target.role === "moderator" && mine?.role !== "owner" && !(await communityAdmin(ctx))) fail(403, "not_allowed");
  await store.removeGroupMember(group.id, member.id);
  await store.recountGroup(group.id);
  return noContent();
}
