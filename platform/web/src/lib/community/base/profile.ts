import { hashPassword, verifyPassword } from "../../auth/password";
import { fail, noContent, ok, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { onYallappLinkChanged } from "../api/trust-hooks";
import { meView } from "../api/views";
import { limitMember } from "./accounts";
import type { CommunityMember } from "../types";
import { isDuplicate } from "../store/db";
import { Fields, readDisplayName, readLanguage, readLinks, readPassword, readSkills, readText, readTheme, readUsername } from "./validate";

/**
 * 231 The signed-in member's own account: their profile and settings, the
 * picture, the password, the devices, and deleting the account.
 */

export async function getMe(ctx: MemberContext): Promise<CommunityResult> {
  return ok(await meView(ctx, ctx.member));
}

export async function patchMe(ctx: MemberContext): Promise<CommunityResult> {
  const body = ctx.json();
  const fields = new Fields();
  const patch: Partial<CommunityMember> = {};
  const team = ctx.member.role !== "member";
  const displayName = readDisplayName(body.display_name, fields, { required: body.display_name !== undefined, team });
  if (displayName !== undefined) patch.displayName = displayName;
  const username = readUsername(body.username, fields, "username", team);
  if (username !== undefined) patch.username = username;
  const headline = readText(body.headline, fields, "headline", 80);
  if (headline !== undefined) patch.headline = headline;
  const bio = readText(body.bio, fields, "bio", 1000);
  if (bio !== undefined) patch.bio = bio;
  const skills = readSkills(body.skills, fields);
  if (skills !== undefined) patch.skills = skills;
  const links = readLinks(body.links, fields);
  if (links !== undefined) patch.links = links;
  const language = readLanguage(body.language, fields);
  if (language !== undefined) patch.language = language;
  const theme = readTheme(body.theme, fields);
  if (theme !== undefined) patch.theme = theme;
  fields.check();
  const store = ctx.store.base;
  if (patch.username && patch.username !== ctx.member.username) {
    const holder = await store.getMemberByUsername(patch.username);
    if (holder && holder.id !== ctx.member.id) fail(409, "username_taken");
  }
  let member: CommunityMember | null;
  try {
    member = await store.updateMember(ctx.member.id, { ...patch, updatedAt: ctx.now });
  } catch (error) {
    if (isDuplicate(error)) fail(409, "username_taken");
    throw error;
  }
  if (!member) fail(401, "invalid_token");
  return ok(await meView({ ...ctx, lang: member.language }, member));
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const AVATAR_MAX = 5 * 1024 * 1024;

/** The first bytes of a JPEG, PNG or WebP: the type the bytes are, whatever the upload says. */
export function imageTypeOf(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function putAvatar(ctx: MemberContext): Promise<CommunityResult> {
  const upload = ctx.deps.upload;
  if (!upload) fail(503, "uploads_unavailable");
  await limitMember(ctx, "avatar");
  const file = ctx.req.form?.get("file");
  if (!file || typeof file === "string") fail(400, "invalid_image");
  if (file.size > AVATAR_MAX) fail(400, "too_large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageTypeOf(bytes);
  if (!type) fail(400, "invalid_image");
  const url = await upload(`community/avatars/${ctx.member.id}-${ctx.now.getTime()}.${IMAGE_TYPES[type]}`, bytes, type);
  const member = await ctx.store.base.updateMember(ctx.member.id, { avatarUrl: url, updatedAt: ctx.now });
  return ok(await meView(ctx, member ?? ctx.member));
}

export async function deleteAvatar(ctx: MemberContext): Promise<CommunityResult> {
  const member = await ctx.store.base.updateMember(ctx.member.id, { avatarUrl: null, updatedAt: ctx.now });
  return ok(await meView(ctx, member ?? ctx.member));
}

export async function putPassword(ctx: MemberContext): Promise<CommunityResult> {
  const body = ctx.json();
  const fields = new Fields();
  const next = readPassword(body.new_password, fields, "new_password");
  fields.check();
  if (ctx.member.passwordHash) {
    const current = typeof body.current_password === "string" ? body.current_password : "";
    if (!(await verifyPassword(ctx.member.passwordHash, current))) fail(401, "invalid_credentials");
  }
  const version = ctx.member.sessionVersion + 1;
  await ctx.store.base.updateMember(ctx.member.id, { passwordHash: await hashPassword(next), sessionVersion: version, updatedAt: ctx.now });
  // This device stays signed in; the others sign in again.
  await ctx.store.base.deleteSessions(ctx.member.id, ctx.session.id);
  await ctx.store.base.updateSession(ctx.session.id, { sessionVersion: version });
  return noContent();
}

export async function listSessions(ctx: MemberContext): Promise<CommunityResult> {
  const sessions = await ctx.store.base.listSessions(ctx.member.id);
  return ok({
    items: sessions.map((s) => ({
      id: s.id,
      name: s.name,
      platform: s.platform,
      created_at: s.createdAt.toISOString(),
      last_seen_at: s.lastSeenAt.toISOString(),
      current: s.id === ctx.session.id,
    })),
  });
}

export async function deleteSession(ctx: MemberContext): Promise<CommunityResult> {
  const sessions = await ctx.store.base.listSessions(ctx.member.id);
  if (!sessions.some((s) => s.id === ctx.params.session_id)) fail(404, "not_found");
  await ctx.store.base.deleteSession(ctx.params.session_id!);
  return noContent();
}

/**
 * Deletes the account at once: the member's row and, with it, their
 * identities, devices, follows, friendships, blocks and reports. What they
 * wrote stays, shown as from "Deleted member".
 */
export async function deleteMe(ctx: MemberContext): Promise<CommunityResult> {
  const body = ctx.json();
  if (ctx.member.passwordHash) {
    const password = typeof body.password === "string" ? body.password : "";
    if (!(await verifyPassword(ctx.member.passwordHash, password))) fail(401, "invalid_credentials");
  } else if (body.confirm !== "DELETE") {
    fail(400, "invalid_request", { confirm: "field.required" });
  }
  const linked = ctx.member.yallappUserId !== null;
  await ctx.store.base.deleteMember(ctx.member.id);
  if (linked) await onYallappLinkChanged(ctx, ctx.member.id);
  return noContent();
}

/** A member by `id` or `@username` (active or suspended; deleted ones are gone). */
export async function findMember(ctx: CommunityContext, ref: string): Promise<CommunityMember | null> {
  const store = ctx.store.base;
  const member = ref.startsWith("@") ? await store.getMemberByUsername(ref.slice(1)) : await store.getMember(ref);
  return member && member.status !== "deleted" ? member : null;
}
