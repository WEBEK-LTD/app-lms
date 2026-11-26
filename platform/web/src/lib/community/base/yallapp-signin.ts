import { createHash } from "node:crypto";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import { adminRoleOf } from "../../admin/team";
import { fail, noContent, ok, tooMany, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { onYallappLinkChanged } from "../api/trust-hooks";
import { meView } from "../api/views";
import { openSession, readDevice, tokensBody } from "../auth/sessions";
import type { CommunityStore } from "../store";
import { isDuplicate } from "../store/db";
import type { CommunityMember } from "../types";
import { freeUsername, newMember, sendVerification } from "./accounts";
import { LINK_PAGE, getLink } from "./linking";
import { impersonatesTeam } from "./validate";
import { isCommunityLanguage } from "../i18n";

/**
 * 231 "Continue with Yallapp": signing in to the community with a Yallapp
 * account, OAuth-style with PKCE (RFC 7636, S256).
 *
 * 1. The app or the site sends its code challenge, its state and where the
 *    code goes (`POST /auth/yallapp/start`): one of `redirectUris` exactly.
 * 2. On yallapp.com.tr/link-community?mode=signin the person, signed in to
 *    Yallapp, approves; they go back with a one-time code (2 minutes).
 * 3. The client exchanges it with its code verifier (`POST /auth/yallapp`):
 *    the member linked to that Yallapp account is signed in, or a new one
 *    is made, linked to it, with the account's name and email.
 *
 * A link made this way never makes anyone run the community: only the full
 * link flow counts (`yallappLinkVia: "link"`, lib/community/staff.ts).
 *
 * And the one-tap link: a member whose verified email is a Yallapp
 * account's verified email is offered to link it (`/me` link_suggestion);
 * never automatically, never for an admin account, never once dismissed.
 */

/** A sign-in request waits 10 minutes for its approval; its code lasts 2. */
export const SIGNIN_TTL_MS = 10 * 60 * 1000;
export const CODE_TTL_MS = 2 * 60 * 1000;
/** The app's return address (its registered scheme). */
export const APP_SIGNIN_REDIRECT = "yallappcommunity://auth/yallapp";
export const SITE_SIGNIN_PATH = "/auth/yallapp/callback";

const LIMITS = {
  start: { name: "community-yallapp-start:ip", limit: 30, windowSeconds: 15 * 60 },
  exchange: { name: "community-yallapp-code:ip", limit: 30, windowSeconds: 15 * 60 },
  suggested: { name: "community-yallapp-suggested:member", limit: 10, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

async function limit(ctx: CommunityContext, rule: keyof typeof LIMITS, subject: string): Promise<void> {
  const hit = await hitRateLimit(ctx.deps.platform, LIMITS[rule], subject, ctx.now);
  if (!hit.allowed) tooMany(hit.retryAfter);
}

/** Where a code may be sent: the community's own site, and the app. Nothing else, exactly. */
export function redirectUris(siteUrl: string): string[] {
  return [`${siteUrl.replace(/\/+$/, "")}${SITE_SIGNIN_PATH}`, APP_SIGNIN_REDIRECT];
}

const base64url = (bytes: Buffer) => bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/** RFC 7636's S256: BASE64URL(SHA-256(verifier)). */
export const pkceChallenge = (verifier: string) => base64url(createHash("sha256").update(verifier, "ascii").digest());

const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;
const STATE = /^[\x21-\x7e]{8,128}$/;

// ------------------------------------------------------------ the API

/** POST /auth/yallapp/start: the address of Yallapp's approval page for this sign-in. */
export async function startYallappSignin(ctx: CommunityContext): Promise<CommunityResult> {
  await limit(ctx, "start", ctx.deps.ip);
  const body = ctx.json();
  const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri : "";
  const challenge = typeof body.code_challenge === "string" ? body.code_challenge : "";
  const state = typeof body.state === "string" ? body.state : "";
  const fields: Record<string, string> = {};
  if (!redirectUris(ctx.deps.siteUrl).includes(redirectUri)) fields.redirect_uri = "field.invalid";
  if (body.code_challenge_method !== "S256" || !CHALLENGE.test(challenge)) fields.code_challenge = "field.invalid";
  if (!STATE.test(state)) fields.state = "field.invalid";
  if (Object.keys(fields).length) fail(400, "invalid_request", fields);
  const request = randomToken(32);
  const expiresAt = new Date(ctx.now.getTime() + SIGNIN_TTL_MS);
  await ctx.store.base.createYallappSignin({ requestHash: sha256Hex(request), redirectUri, codeChallenge: challenge, clientState: state, yallappUserId: null, codeHash: null, expiresAt, approvedAt: null, usedAt: null, createdAt: ctx.now });
  const url = new URL(LINK_PAGE, ctx.deps.yallappUrl);
  url.searchParams.set("mode", "signin");
  url.searchParams.set("request", request);
  return ok({ authorize_url: url.toString(), expires_at: expiresAt.toISOString() });
}

/**
 * POST /auth/yallapp: the code and its verifier for a session. Every way a
 * code fails (unknown, expired, used, another redirect, the wrong verifier)
 * is the same 401, and the code is spent at the first try.
 */
export async function exchangeYallappCode(ctx: CommunityContext): Promise<CommunityResult> {
  await limit(ctx, "exchange", ctx.deps.ip);
  const body = ctx.json();
  const code = typeof body.code === "string" ? body.code : "";
  const verifier = typeof body.code_verifier === "string" ? body.code_verifier : "";
  const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri : "";
  if (!code || !VERIFIER.test(verifier) || !redirectUri) fail(401, "invalid_token");
  const signin = await ctx.store.base.useYallappSignin(sha256Hex(code), ctx.now);
  if (!signin || !signin.yallappUserId || signin.redirectUri !== redirectUri || pkceChallenge(verifier) !== signin.codeChallenge) fail(401, "invalid_token");
  const user = await ctx.deps.platform.getUserById(signin.yallappUserId);
  if (!user) fail(401, "invalid_token");

  const store = ctx.store.base;
  const linked = await store.getMemberByYallappUser(user.id);
  if (linked) {
    if (linked.status === "deleted") fail(401, "invalid_token");
    return signedIn(ctx, linked, false);
  }
  const email = user.email.trim().toLowerCase();
  // Never joined to someone else's account by its email: they log in their own way, then link.
  if (await store.getMemberByEmail(email)) fail(409, "email_taken");
  const verified = (await yallappVerifiedEmail(ctx.deps.platform, user.id)) === email;
  const named = (user.name || email.split("@")[0] || "Member").slice(0, 80);
  const displayName = impersonatesTeam(named) ? "Member" : named;
  const language = isCommunityLanguage(body.language) ? body.language : isCommunityLanguage(user.language) ? user.language : ctx.lang;
  const member: CommunityMember = {
    ...newMember({ email, emailVerified: verified, passwordHash: null, displayName, username: await freeUsername(store, displayName), language, now: ctx.now }),
    yallappUserId: user.id,
    linkedAt: ctx.now,
    yallappLinkVia: "signin",
  };
  try {
    await store.createMember(member);
  } catch (error) {
    // The same account's sign-in finished a moment before: that member it is.
    if (!isDuplicate(error)) throw error;
    const raced = await store.getMemberByYallappUser(user.id);
    if (!raced) fail(409, "email_taken");
    return signedIn(ctx, raced, false);
  }
  await onYallappLinkChanged(ctx, member.id);
  if (!verified) await sendVerification(ctx, member);
  return signedIn(ctx, member, true);
}

async function signedIn(ctx: CommunityContext, member: CommunityMember, created: boolean): Promise<CommunityResult> {
  if (member.status === "suspended") fail(403, "account_suspended");
  const tokens = await openSession(ctx.store.base, member, readDevice(ctx.json().device), ctx.now);
  const signed = { ...ctx, member, session: tokens.session, lang: member.language };
  return ok({ ...tokensBody(tokens), created, member: await meView(signed, member) }, created ? 201 : 200);
}

// ------------------------------------------------------------ yallapp.com.tr's page

export type SigninCheck = { ok: true; redirectUri: string; clientState: string } | { ok: false };

/** The request behind the approval page: in time and not approved yet. */
export async function pendingYallappSignin(store: CommunityStore, request: string, now: Date): Promise<SigninCheck> {
  const signin = request ? await store.base.getYallappSignin(sha256Hex(request)) : null;
  if (!signin || signin.approvedAt || signin.expiresAt.getTime() <= now.getTime()) return { ok: false };
  return { ok: true, redirectUri: signin.redirectUri, clientState: signin.clientState };
}

/** The signed-in Yallapp user approved: the client's address with a fresh one-time code and its state. */
export async function approveYallappSignin(deps: { store: CommunityStore; now: Date }, request: string, yallappUserId: string): Promise<string | null> {
  const pending = await pendingYallappSignin(deps.store, request, deps.now);
  if (!pending.ok) return null;
  const code = randomToken(32);
  const approved = await deps.store.base.approveYallappSignin(sha256Hex(request), { yallappUserId, codeHash: sha256Hex(code), expiresAt: new Date(deps.now.getTime() + CODE_TTL_MS) }, deps.now);
  if (!approved) return null;
  return withParams(pending.redirectUri, { code, state: pending.clientState });
}

/** They said no: the client hears `access_denied` (with its state), and the request can't be approved any more. */
export async function denyYallappSignin(deps: { store: CommunityStore; now: Date }, request: string): Promise<string | null> {
  const pending = await pendingYallappSignin(deps.store, request, deps.now);
  if (!pending.ok) return null;
  await deps.store.base.approveYallappSignin(sha256Hex(request), { yallappUserId: "", codeHash: sha256Hex(randomToken(32)), expiresAt: deps.now }, deps.now);
  return withParams(pending.redirectUri, { error: "access_denied", state: pending.clientState });
}

function withParams(address: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${address}${address.includes("?") ? "&" : "?"}${query}`;
}

// ------------------------------------------------------------ the one-tap link

/**
 * The Yallapp account's email once the person proved it is theirs
 * (`emailVerifiedAt`: a password reset, a team invitation, or "Confirm your
 * email", lib/auth/email-confirm.ts); null until then. Only then does the
 * community trust it: a member made by "Continue with Yallapp" otherwise
 * confirms their email in the community, and no one-tap link is offered.
 */
export async function yallappVerifiedEmail(platform: DataStore, userId: string): Promise<string | null> {
  const user = await platform.getUserById(userId);
  return user?.emailVerifiedAt ? user.email.trim().toLowerCase() : null;
}

/** The Yallapp account a member may link in one tap, or null (never revealed beyond "there is one"). */
async function suggestedAccount(ctx: CommunityContext, member: CommunityMember): Promise<string | null> {
  if (member.yallappUserId || member.linkSuggestionDismissedAt || !member.email || !member.emailVerified || member.status !== "active") return null;
  const platform = ctx.deps.platform;
  const user = await platform.getUserByEmail(member.email);
  if (!user || (await yallappVerifiedEmail(platform, user.id)) !== member.email) return null;
  // An account on Yallapp's own team links only the full way.
  if (await adminRoleOf(platform, user)) return null;
  if (await ctx.store.base.getMemberByYallappUser(user.id)) return null;
  return user.id;
}

/** `/me`'s link_suggestion. */
export async function linkSuggestion(ctx: CommunityContext, member: CommunityMember): Promise<{ available: boolean }> {
  return { available: (await suggestedAccount(ctx, member)) !== null };
}

/** POST /me/yallapp-link/suggested: links the suggested account, checked again now. */
export async function linkSuggested(ctx: MemberContext): Promise<CommunityResult> {
  await limit(ctx, "suggested", ctx.member.id);
  const userId = await suggestedAccount(ctx, ctx.member);
  if (!userId) fail(409, "not_eligible");
  let member: CommunityMember | null;
  try {
    member = await ctx.store.base.updateMember(ctx.member.id, { yallappUserId: userId, linkedAt: ctx.now, yallappLinkVia: "suggested", updatedAt: ctx.now });
  } catch (error) {
    if (isDuplicate(error)) fail(409, "not_eligible");
    throw error;
  }
  await onYallappLinkChanged(ctx, ctx.member.id);
  return getLink({ ...ctx, member: member ?? ctx.member });
}

/** DELETE /me/yallapp-link/suggested: not offered again. */
export async function dismissSuggested(ctx: MemberContext): Promise<CommunityResult> {
  await ctx.store.base.updateMember(ctx.member.id, { linkSuggestionDismissedAt: ctx.now, updatedAt: ctx.now });
  return noContent();
}
