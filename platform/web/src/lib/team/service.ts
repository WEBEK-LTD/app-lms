import type { Lang } from "@/i18n/config";
import { adminRoleOf } from "../admin/team";
import { appLabel } from "../app/label";
import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Client, TeamInvitation, TeamMember, User } from "../data/types";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { recordTeamActivity, type TeamActor } from "./activity";
import { AREA_NAMES, isTeamArea, OWNER_ACCESS, readAccess, ROLE_NAMES, type AccessInput, type TeamAccess } from "./permissions";

/**
 * 60 Team members for clients: who works with whom, invitations (7 days,
 * single use, the token kept as its SHA-256), joining, changing someone's
 * access and removing them (which signs them out everywhere at once). Used by
 * the dashboard's Team page and the Owner API alike; the checks of who may
 * do these (the owner only) are `teamCan(…, "team")` where they're called.
 */

export const INVITATION_DAYS = 7;
const INVITATION_MS = INVITATION_DAYS * 24 * 60 * 60 * 1000;

/** The access a member row gives. */
export function memberAccess(member: Pick<TeamMember, "role" | "areas" | "appIds">): TeamAccess {
  return { role: member.role, areas: member.areas.filter(isTeamArea), appIds: member.appIds };
}

/** A business someone works on: their own client, or one whose team they are on. */
export interface Business {
  client: Client;
  /** The client's own user. */
  owner: User;
  access: TeamAccess;
  /** Null for the person's own client. */
  member: TeamMember | null;
}

/** What to call a business: its first app's name, else its owner's name. */
export function businessName(owner: Pick<User, "name">, apps: Pick<App, "appName">[]): string {
  const named = apps.map((a) => appLabel(a)).find((name) => name !== "Untitled app");
  return named ?? owner.name;
}

/** Every business the person works on: their own first, then the teams they joined, in that order. */
export async function businessesOf(store: DataStore, user: Pick<User, "id">): Promise<Business[]> {
  const out: Business[] = [];
  const own = await store.getClientByUserId(user.id);
  const self = own ? await store.getUserById(own.userId) : null;
  if (own && self) out.push({ client: own, owner: self, access: OWNER_ACCESS, member: null });
  for (const member of await store.listMembershipsOfUser(user.id)) {
    const client = await store.getClientById(member.clientId);
    const owner = client ? await store.getUserById(client.userId) : null;
    if (client && owner && owner.id !== user.id) out.push({ client, owner, access: memberAccess(member), member });
  }
  return out;
}

/** One business of the person, by its client ID; null when they don't work on it. */
export async function businessFor(store: DataStore, user: Pick<User, "id">, clientId: string): Promise<Business | null> {
  const client = await store.getClientById(clientId);
  if (!client) return null;
  const owner = await store.getUserById(client.userId);
  if (!owner) return null;
  if (client.userId === user.id) return { client, owner, access: OWNER_ACCESS, member: null };
  const member = await store.getTeamMember(clientId, user.id);
  return member ? { client, owner, access: memberAccess(member), member } : null;
}

// Invitations

export interface TeamMail {
  (to: string, values: Record<string, string>, lang: Lang): Promise<unknown>;
}

export interface TeamDeps {
  store: DataStore;
  now: Date;
  /** yallapp.com.tr (APP_URL), for the link. */
  baseUrl: string;
  /** Sends the `team_invitation` email (lib/email/send.ts sendTemplate). */
  mail: TeamMail;
  /** Turns a role (and a date) into the email's language. */
  words: (lang: Lang) => { role: (role: "manager" | "staff") => string; date: (date: Date) => string };
}

export interface InviteInput {
  name: unknown;
  email: unknown;
  role: unknown;
  areas: unknown;
  /** Null for every app. */
  appIds: unknown;
}

export type InviteResult = { ok: true; invitation: TeamInvitation; link: string } | { ok: false; errors?: Record<string, string>; message?: string; retryAfter?: number };

const TOO_MANY = "You've sent many invitations. Try again later.";

export const joinLink = (baseUrl: string, token: string) => `${baseUrl.replace(/\/$/, "")}/team/join?token=${encodeURIComponent(token)}`;

async function limitInvites(store: DataStore, clientId: string, email: string, now: Date): Promise<number | null> {
  const [byClient, byEmail] = await Promise.all([hitRateLimit(store, RATE_LIMITS.teamInviteClient, clientId, now), hitRateLimit(store, RATE_LIMITS.teamInviteEmail, email, now)]);
  if (byClient.allowed && byEmail.allowed) return null;
  return Math.max(byClient.allowed ? 0 : byClient.retryAfter, byEmail.allowed ? 0 : byEmail.retryAfter);
}

async function sendInvitation(deps: TeamDeps, invitation: TeamInvitation, token: string, inviter: Pick<User, "name">, business: string): Promise<string> {
  const link = joinLink(deps.baseUrl, token);
  const lang = (["en", "ar", "tr"].includes(invitation.lang) ? invitation.lang : "en") as Lang;
  const words = deps.words(lang);
  await deps.mail(invitation.email, { name: invitation.name, inviter: inviter.name, business, role: words.role(invitation.role), link, expires: words.date(invitation.expiresAt) }, lang).catch((error: unknown) =>
    console.error("[mail] team invitation failed", error instanceof Error ? error.message : String(error)),
  );
  return link;
}

/**
 * Invites someone to the client's team. The email is in the invitee's
 * dashboard language when they have an account, else `lang` (the inviter's).
 * Refused: the owner's own email, someone on the team already, Yallapp's
 * team, an address invited already (resend that one), and too many at once.
 */
export async function inviteMember(
  deps: TeamDeps,
  input: { client: Client; owner: User; apps: App[]; inviter: TeamActor; lang: Lang; values: InviteInput; parse: (values: { name: unknown; email: unknown }) => { ok: true; name: string; email: string } | { ok: false; errors: Record<string, string> } },
): Promise<InviteResult> {
  const { store, now } = deps;
  const parsed = input.parse(input.values);
  const access = readAccess({ role: input.values.role, areas: input.values.areas, appIds: input.values.appIds }, input.apps.map((a) => a.id));
  const errors = { ...(parsed.ok ? {} : parsed.errors), ...(access.ok ? {} : access.errors) };
  if (!parsed.ok || !access.ok) return { ok: false, errors };
  const email = parsed.email;
  if (email === input.owner.email.toLowerCase()) return { ok: false, errors: { email: "That's the owner's own email." } };
  const existing = await store.getUserByEmail(email);
  if (existing) {
    if (await store.getTeamMember(input.client.id, existing.id)) return { ok: false, errors: { email: "This person is on your team already." } };
    if (await adminRoleOf(store, existing)) return { ok: false, errors: { email: "This email is on Yallapp's team. Use another email." } };
  }
  if ((await store.listOpenTeamInvitations(input.client.id)).some((i) => i.email === email && i.expiresAt.getTime() > now.getTime())) {
    return { ok: false, errors: { email: "This email has an invitation already. Send it again from the list." } };
  }
  const wait = await limitInvites(store, input.client.id, email, now);
  if (wait !== null) return { ok: false, message: TOO_MANY, retryAfter: wait };

  const token = randomToken(32);
  const invitation: TeamInvitation = {
    id: newId(),
    clientId: input.client.id,
    email,
    name: parsed.name,
    role: access.access.role,
    areas: access.access.areas,
    appIds: access.access.appIds,
    tokenHash: sha256Hex(token),
    lang: existing && ["en", "ar", "tr"].includes(existing.language ?? "") ? existing.language! : input.lang,
    invitedBy: input.inviter.id,
    expiresAt: new Date(now.getTime() + INVITATION_MS),
    acceptedAt: null,
    cancelledAt: null,
    sentAt: now,
    createdAt: now,
  };
  await store.createTeamInvitation(invitation);
  const link = await sendInvitation(deps, invitation, token, input.inviter, businessName(input.owner, input.apps));
  await recordTeamActivity(store, { clientId: input.client.id, appId: null, actor: input.inviter, action: "team.invite", target: { type: "invitation", id: invitation.id }, summary: `Invited ${email} as ${ROLE_NAMES[invitation.role]}` }, now);
  return { ok: true, invitation, link };
}

/** Sends an open invitation again: a new link (the old one stops working) for 7 more days. */
export async function resendInvitation(deps: TeamDeps, input: { client: Client; owner: User; apps: App[]; inviter: TeamActor; id: string }): Promise<InviteResult> {
  const { store, now } = deps;
  const invitation = await store.getTeamInvitation(input.client.id, input.id);
  if (!invitation || invitation.acceptedAt || invitation.cancelledAt) return { ok: false, message: "This invitation isn't open any more." };
  const wait = await limitInvites(store, input.client.id, invitation.email, now);
  if (wait !== null) return { ok: false, message: TOO_MANY, retryAfter: wait };
  const token = randomToken(32);
  const patch = { tokenHash: sha256Hex(token), expiresAt: new Date(now.getTime() + INVITATION_MS), sentAt: now };
  await store.updateTeamInvitation(input.client.id, invitation.id, patch);
  const next = { ...invitation, ...patch };
  const link = await sendInvitation(deps, next, token, input.inviter, businessName(input.owner, input.apps));
  await recordTeamActivity(store, { clientId: input.client.id, appId: null, actor: input.inviter, action: "team.resend", target: { type: "invitation", id: invitation.id }, summary: `Sent the invitation to ${invitation.email} again` }, now);
  return { ok: true, invitation: next, link };
}

/** Cancels an open invitation: its link stops working. False when it isn't open. */
export async function cancelInvitation(store: DataStore, input: { client: Client; actor: TeamActor; id: string }, now: Date): Promise<boolean> {
  const invitation = await store.getTeamInvitation(input.client.id, input.id);
  if (!invitation || invitation.acceptedAt || invitation.cancelledAt) return false;
  await store.updateTeamInvitation(input.client.id, invitation.id, { cancelledAt: now });
  await recordTeamActivity(store, { clientId: input.client.id, appId: null, actor: input.actor, action: "team.cancel", target: { type: "invitation", id: invitation.id }, summary: `Cancelled the invitation to ${invitation.email}` }, now);
  return true;
}

export type InvitationCheck =
  | { ok: true; invitation: TeamInvitation; client: Client; owner: User; apps: App[]; existing: User | null }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** The invitation a link opens, if it can still be used. */
export async function invitationForToken(store: DataStore, token: string, now: Date): Promise<InvitationCheck> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return { ok: false, reason: "invalid" };
  const invitation = await store.getTeamInvitationByToken(sha256Hex(token));
  if (!invitation) return { ok: false, reason: "invalid" };
  if (invitation.acceptedAt || invitation.cancelledAt) return { ok: false, reason: "used" };
  if (invitation.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  const client = await store.getClientById(invitation.clientId);
  const owner = client ? await store.getUserById(client.userId) : null;
  if (!client || !owner) return { ok: false, reason: "invalid" };
  const [apps, existing] = await Promise.all([store.listAppsByClient(client.id), store.getUserByEmail(invitation.email)]);
  return { ok: true, invitation, client, owner, apps, existing };
}

/**
 * Joins the team with the invitation (once: the store marks it accepted
 * only while it is still open). `user` is the invited email's account, its
 * password already checked or just set.
 */
export async function acceptInvitation(store: DataStore, token: string, user: User, now: Date): Promise<{ ok: true; client: Client } | { ok: false; reason: "invalid" | "expired" | "used" | "owner" | "staff" }> {
  const check = await invitationForToken(store, token, now);
  if (!check.ok) return check;
  if (user.email.toLowerCase() !== check.invitation.email) return { ok: false, reason: "invalid" };
  if (check.client.userId === user.id) return { ok: false, reason: "owner" };
  if (await adminRoleOf(store, user)) return { ok: false, reason: "staff" };
  if (!(await store.acceptTeamInvitation(check.invitation.id, check.invitation.tokenHash, now))) return { ok: false, reason: "used" };
  const { invitation } = check;
  const current = await store.getTeamMember(invitation.clientId, user.id);
  await store.saveTeamMember({
    clientId: invitation.clientId,
    userId: user.id,
    role: invitation.role,
    areas: invitation.areas,
    appIds: invitation.appIds,
    addedBy: current?.addedBy ?? (await store.getUserById(invitation.invitedBy))?.email ?? check.owner.email,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  });
  await recordTeamActivity(store, { clientId: invitation.clientId, appId: null, actor: user, action: "team.join", target: { type: "member", id: user.id }, summary: `${user.email} joined the team` }, now);
  return { ok: true, client: check.client };
}

// Members

/** Changes a member's role, areas and apps. Their sessions stay: every request reads the access again. */
export async function updateMember(
  store: DataStore,
  input: { client: Client; apps: App[]; actor: TeamActor & { email: string }; userId: string; values: { role: unknown; areas: unknown; appIds: unknown } },
  now: Date,
): Promise<{ ok: true; member: TeamMember } | { ok: false; errors?: Record<string, string>; notFound?: true }> {
  const member = await store.getTeamMember(input.client.id, input.userId);
  if (!member) return { ok: false, notFound: true };
  const access = readAccess(input.values, input.apps.map((a) => a.id));
  if (!access.ok) return { ok: false, errors: access.errors };
  const next: TeamMember = { ...member, ...access.access, addedBy: input.actor.email, updatedAt: now };
  await store.saveTeamMember(next);
  const user = await store.getUserById(member.userId);
  await recordTeamActivity(
    store,
    { clientId: input.client.id, appId: null, actor: input.actor, action: "team.update", target: { type: "member", id: member.userId }, summary: `Changed what ${user?.email ?? "a member"} can do` },
    now,
  );
  return { ok: true, member: next };
}

/**
 * Removes a member and signs them out everywhere at once: their session
 * version goes up (every website session and Yallapp Business device of
 * theirs stops on its next request) and their phones signed in to this
 * business are signed out.
 */
export async function removeMember(store: DataStore, input: { client: Client; actor: TeamActor; userId: string }, now: Date): Promise<boolean> {
  const user = await store.getUserById(input.userId);
  if (!user || !(await store.deleteTeamMember(input.client.id, input.userId))) return false;
  await store.updateUser(user.id, { sessionVersion: user.sessionVersion + 1 }, now);
  await store.deleteOwnerDevicesOfClient(user.id, input.client.id);
  await recordTeamActivity(store, { clientId: input.client.id, appId: null, actor: input.actor, action: "team.remove", target: { type: "member", id: user.id }, summary: `Removed ${user.email} from the team` }, now);
  return true;
}

/** "Staff: Orders & kitchen, Media (Ada Academy)", in English for the activity and the admin. */
export function describeAccess(access: { role: AccessInput["role"]; areas: readonly string[]; appIds: readonly string[] | null }, apps: Pick<App, "id" | "appName">[]): string {
  const areas = access.role === "staff" ? `: ${access.areas.filter(isTeamArea).map((a) => AREA_NAMES[a]).join(", ")}` : "";
  const scoped = access.appIds ? ` (${apps.filter((a) => access.appIds!.includes(a.id)).map((a) => appLabel(a)).join(", ")})` : "";
  return `${ROLE_NAMES[access.role]}${areas}${scoped}`;
}
