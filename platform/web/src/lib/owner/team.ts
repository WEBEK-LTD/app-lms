import { getDashT } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import type { TeamInvitation } from "../data/types";
import { isTeamArea, OWNER_ACCESS, areasOf } from "../team/permissions";
import { cancelInvitation, inviteMember, removeMember, resendInvitation, updateMember, type TeamDeps } from "../team/service";
import { teamInviteSchema } from "../validation";
import { bodyObject, invalid, notFound, OwnerError, rateLimited, type OwnerContext, type OwnerResult } from "./http";

/**
 * 60 The owner's team from Yallapp Business: the same rules as Dashboard ›
 * Team (lib/team/service.ts). The router lets only the owner in (`team`).
 */

function deps(ctx: OwnerContext): TeamDeps {
  return {
    store: ctx.deps.store,
    now: ctx.deps.now,
    baseUrl: ctx.deps.baseUrl,
    // The route sends the `team_invitation` email; without it (tests that don't care) nothing is sent.
    mail: ctx.deps.teamMail ?? (async () => undefined),
    words: (lang: Lang) => {
      const t = getDashT(lang);
      return { role: (role) => t(`team.roles.${role}`), date: (date) => formatDate(lang, date, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) };
    },
  };
}

function invitationJson(invitation: TeamInvitation, now: Date) {
  return {
    id: invitation.id,
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    areas: invitation.role === "staff" ? invitation.areas.filter(isTeamArea) : [],
    app_ids: invitation.appIds,
    sent_at: invitation.sentAt.toISOString(),
    expires_at: invitation.expiresAt.toISOString(),
    expired: invitation.expiresAt.getTime() <= now.getTime(),
  };
}

/** Role, areas and apps as the request sends them (`app_ids` null or left out: all apps). */
function accessOf(body: Record<string, unknown>) {
  return { role: body.role, areas: Array.isArray(body.areas) ? body.areas : body.areas === undefined ? [] : body.areas, appIds: body.app_ids ?? null };
}

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

/** `GET /team`. */
export async function getTeam(ctx: OwnerContext): Promise<OwnerResult> {
  const { store, now } = ctx.deps;
  const owner = await store.getUserById(ctx.client.userId);
  const [members, invitations] = await Promise.all([store.listTeamMembers(ctx.client.id), store.listOpenTeamInvitations(ctx.client.id)]);
  return {
    status: 200,
    body: {
      members: [
        ...(owner ? [{ user_id: owner.id, name: owner.name, email: owner.email, role: "owner", areas: areasOf(OWNER_ACCESS), app_ids: null, joined_at: null, last_sign_in_at: iso(owner.lastSignInAt) }] : []),
        ...members.map(({ member, user }) => ({
          user_id: user.id,
          name: user.name,
          email: user.email,
          role: member.role,
          areas: member.role === "staff" ? member.areas.filter(isTeamArea) : areasOf(OWNER_ACCESS),
          app_ids: member.appIds,
          joined_at: member.createdAt.toISOString(),
          last_sign_in_at: iso(user.lastSignInAt),
        })),
      ],
      invitations: invitations.map((i) => invitationJson(i, now)),
    },
  };
}

/** `POST /team/invitations`. */
export async function invite(ctx: OwnerContext): Promise<OwnerResult> {
  const body = bodyObject(ctx.req.body);
  const owner = await ctx.deps.store.getUserById(ctx.client.userId);
  if (!owner) throw notFound();
  const result = await inviteMember(deps(ctx), {
    client: ctx.client,
    owner,
    apps: await ctx.deps.store.listAppsByClient(ctx.client.id),
    inviter: ctx.user,
    lang: ctx.lang,
    values: { name: body.name, email: body.email, ...accessOf(body) },
    parse: (input) => {
      const parsed = teamInviteSchema.safeParse({ name: typeof input.name === "string" ? input.name : "", email: typeof input.email === "string" ? input.email : "" });
      return parsed.success ? { ok: true, name: parsed.data.name, email: parsed.data.email } : { ok: false, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "email"), i.message])) };
    },
  });
  if (!result.ok) {
    if (result.retryAfter) throw rateLimited(result.retryAfter, result.message);
    throw invalid(result.errors ?? {}, result.message ?? "The request isn't valid.");
  }
  return { status: 201, body: invitationJson(result.invitation, ctx.deps.now) };
}

/** `POST /team/invitations/{id}/resend`. */
export async function resend(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const owner = await ctx.deps.store.getUserById(ctx.client.userId);
  if (!owner) throw notFound();
  const result = await resendInvitation(deps(ctx), { client: ctx.client, owner, apps: await ctx.deps.store.listAppsByClient(ctx.client.id), inviter: ctx.user, id: params.invitation_id ?? "" });
  if (!result.ok) {
    if (result.retryAfter) throw rateLimited(result.retryAfter, result.message);
    throw notFound();
  }
  return { status: 200, body: invitationJson(result.invitation, ctx.deps.now) };
}

/** `DELETE /team/invitations/{id}`. */
export async function cancel(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  if (!(await cancelInvitation(ctx.deps.store, { client: ctx.client, actor: ctx.user, id: params.invitation_id ?? "" }, ctx.deps.now))) throw notFound();
  return { status: 204 };
}

/** `PATCH /team/members/{user_id}`. */
export async function update(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const body = bodyObject(ctx.req.body);
  const { store, now } = ctx.deps;
  const result = await updateMember(store, { client: ctx.client, apps: await store.listAppsByClient(ctx.client.id), actor: ctx.user, userId: params.user_id ?? "", values: accessOf(body) }, now);
  if (!result.ok) {
    if (result.notFound) throw notFound();
    throw invalid(result.errors);
  }
  const user = await store.getUserById(result.member.userId);
  if (!user) throw notFound();
  const { member } = result;
  return {
    status: 200,
    body: {
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
      areas: member.role === "staff" ? member.areas.filter(isTeamArea) : areasOf(OWNER_ACCESS),
      app_ids: member.appIds,
      joined_at: member.createdAt.toISOString(),
      last_sign_in_at: iso(user.lastSignInAt),
    },
  };
}

/** `DELETE /team/members/{user_id}`: signed out everywhere at once. */
export async function remove(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  if (params.user_id === ctx.user.id) throw new OwnerError(400, "invalid_request", "The request isn't valid.");
  if (!(await removeMember(ctx.deps.store, { client: ctx.client, actor: ctx.user, userId: params.user_id ?? "" }, ctx.deps.now))) throw notFound();
  return { status: 204 };
}
