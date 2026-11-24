import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "../../auth/password";
import { newId, randomToken, sha256Hex } from "../../crypto/tokens";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { fail, noContent, ok, tooMany, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { meView } from "../api/views";
import { openSession, readDevice, refreshSession, tokensBody } from "../auth/sessions";
import { t } from "../i18n";
import type { CommunityBaseStore } from "../store/base";
import type { CommunityLanguage, CommunityMember } from "../types";
import { isDuplicate } from "../store/db";
import { Fields, readEmail, readLanguage, readPassword, readText, readUsername, usernameBase } from "./validate";

/**
 * 231 Joining and signing in: email and password, Sign in with Apple,
 * Google; renewing tokens, signing out, confirming the email, resetting a
 * forgotten password. The limits: 30 attempts per IP and 8 per email in 15
 * minutes (sign-in, sign-up, reset requests).
 */
export const COMMUNITY_LIMITS = {
  ip: { name: "community-auth:ip", limit: 30, windowSeconds: 15 * 60 },
  email: { name: "community-auth:email", limit: 8, windowSeconds: 15 * 60 },
  resend: { name: "community-verify:member", limit: 3, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

const VERIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

async function limit(ctx: CommunityContext, email?: string): Promise<void> {
  const platform = ctx.deps.platform;
  const results = await Promise.all([
    hitRateLimit(platform, COMMUNITY_LIMITS.ip, ctx.deps.ip, ctx.now),
    ...(email ? [hitRateLimit(platform, COMMUNITY_LIMITS.email, email, ctx.now)] : []),
  ]);
  const refused = results.filter((r) => !r.allowed);
  if (refused.length > 0) tooMany(Math.max(...refused.map((r) => r.retryAfter)));
}

/** A free username from `wanted`, else from the name with a number after it. */
export async function freeUsername(store: CommunityBaseStore, displayName: string): Promise<string> {
  const base = usernameBase(displayName);
  if (!(await store.getMemberByUsername(base))) return base;
  for (let i = 0; i < 20; i++) {
    const candidate = `${base.slice(0, 24)}${randomInt(10, 99_999)}`;
    if (!(await store.getMemberByUsername(candidate))) return candidate;
  }
  return `member${randomInt(100_000, 9_999_999)}`;
}

export function newMember(input: {
  id?: string;
  email: string | null;
  emailVerified: boolean;
  passwordHash: string | null;
  displayName: string;
  username: string;
  language: CommunityLanguage;
  now: Date;
}): CommunityMember {
  return {
    id: input.id ?? newId(),
    email: input.email,
    emailVerified: input.emailVerified,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    username: input.username,
    bio: "",
    skills: [],
    avatarUrl: null,
    headline: "",
    links: [],
    language: input.language,
    theme: "system",
    role: "member",
    status: "active",
    points: 0,
    approvedPosts: 0,
    yallappUserId: null,
    linkedAt: null,
    sessionVersion: 1,
    createdAt: input.now,
    updatedAt: input.now,
    lastActiveAt: input.now,
  };
}

/** Signs the member in on a new device and answers with the tokens and the member (docs: Session). */
async function signedIn(ctx: CommunityContext, member: CommunityMember, created: boolean): Promise<CommunityResult> {
  if (member.status === "suspended") fail(403, "account_suspended");
  const tokens = await openSession(ctx.store.base, member, readDevice(ctx.json().device), ctx.now);
  const signed = { ...ctx, member, session: tokens.session, lang: member.language };
  return ok({ ...tokensBody(tokens), created, member: await meView(signed, member) }, created ? 201 : 200);
}

/** Sends a link to confirm the member's email (7 days). */
export async function sendVerification(ctx: CommunityContext, member: CommunityMember): Promise<void> {
  if (!member.email || member.emailVerified) return;
  const token = randomToken(32);
  await ctx.store.base.createEmailToken({ tokenHash: sha256Hex(token), memberId: member.id, purpose: "verify_email", expiresAt: new Date(ctx.now.getTime() + VERIFY_TTL_MS), usedAt: null, createdAt: ctx.now });
  const link = `${ctx.deps.siteUrl}/verify-email?token=${token}`;
  await ctx.deps.mail({ to: member.email, subject: t(member.language, "mail.verify.subject"), text: t(member.language, "mail.verify.body", { name: member.displayName, link }) });
}

// ------------------------------------------------------------ email

export async function signUp(ctx: CommunityContext): Promise<CommunityResult> {
  const body = ctx.json();
  const fields = new Fields();
  const email = readEmail(body.email, fields);
  const password = readPassword(body.password, fields);
  const displayName = readText(body.display_name, fields, "display_name", 80, { required: true }) ?? "";
  const username = readUsername(body.username, fields);
  const language = readLanguage(body.language, fields) ?? ctx.lang;
  fields.check();
  await limit(ctx, email);
  const store = ctx.store.base;
  if (await store.getMemberByEmail(email)) fail(409, "email_taken");
  if (username && (await store.getMemberByUsername(username))) fail(409, "username_taken");
  const member = newMember({
    email,
    emailVerified: false,
    passwordHash: await hashPassword(password),
    displayName,
    username: username ?? (await freeUsername(store, displayName)),
    language,
    now: ctx.now,
  });
  try {
    await store.createMember(member);
  } catch (error) {
    if (isDuplicate(error)) fail(409, username ? "username_taken" : "email_taken");
    throw error;
  }
  await sendVerification(ctx, member);
  return signedIn(ctx, member, true);
}

export async function logIn(ctx: CommunityContext): Promise<CommunityResult> {
  const body = ctx.json();
  const fields = new Fields();
  const email = readEmail(body.email, fields);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) fields.add("password", "field.required");
  fields.check();
  await limit(ctx, email);
  const member = await ctx.store.base.getMemberByEmail(email);
  const valid = await verifyPassword(member && member.status !== "deleted" ? member.passwordHash : null, password);
  if (!member || !valid) fail(401, "invalid_credentials");
  return signedIn(ctx, member, false);
}

// ------------------------------------------------------------ Apple and Google

async function withProvider(ctx: CommunityContext, provider: "apple" | "google"): Promise<CommunityResult> {
  const verifier = provider === "apple" ? ctx.deps.apple : ctx.deps.google;
  if (!verifier) fail(503, "provider_not_configured");
  const body = ctx.json();
  const idToken = typeof body.id_token === "string" ? body.id_token : "";
  if (!idToken) fail(400, "invalid_request", { id_token: "field.required" });
  await limit(ctx);
  const identity = await verifier(idToken);
  if (!identity) fail(401, "invalid_token");
  // Apple: the token carries the SHA-256 of the nonce the app gave it; the app sends us the raw one.
  if (provider === "apple" && identity.nonce !== null) {
    const nonce = typeof body.nonce === "string" ? body.nonce : "";
    if (!nonce || sha256Hex(nonce) !== identity.nonce) fail(401, "invalid_token");
  }
  const store = ctx.store.base;
  const known = await store.getIdentity(provider, identity.subject);
  if (known) {
    const member = await store.getMember(known.memberId);
    if (!member || member.status === "deleted") fail(401, "invalid_token");
    return signedIn(ctx, member, false);
  }
  // The same verified email as a member's: it is theirs.
  const sameEmail = identity.email && identity.emailVerified ? await store.getMemberByEmail(identity.email) : null;
  if (sameEmail && sameEmail.status !== "deleted") {
    await store.addIdentity({ memberId: sameEmail.id, provider, subject: identity.subject, email: identity.email, createdAt: ctx.now });
    const member = sameEmail.emailVerified ? sameEmail : ((await store.updateMember(sameEmail.id, { emailVerified: true, updatedAt: ctx.now })) ?? sameEmail);
    return signedIn(ctx, member, false);
  }
  const fieldsIn = new Fields();
  const sentName = readText(body.display_name, fieldsIn, "display_name", 80);
  const language = readLanguage(body.language, fieldsIn) ?? ctx.lang;
  const displayName = (sentName || identity.name || identity.email?.split("@")[0] || "Member").slice(0, 80);
  const member = newMember({
    email: identity.email,
    emailVerified: identity.email !== null && identity.emailVerified,
    passwordHash: null,
    displayName,
    username: await freeUsername(store, displayName),
    language,
    now: ctx.now,
  });
  await store.createMember(member);
  await store.addIdentity({ memberId: member.id, provider, subject: identity.subject, email: identity.email, createdAt: ctx.now });
  return signedIn(ctx, member, true);
}

export const withApple = (ctx: CommunityContext) => withProvider(ctx, "apple");
export const withGoogle = (ctx: CommunityContext) => withProvider(ctx, "google");

// ------------------------------------------------------------ tokens

export async function refresh(ctx: CommunityContext): Promise<CommunityResult> {
  const token = ctx.json().refresh_token;
  if (typeof token !== "string" || !token) fail(401, "invalid_token");
  const renewed = await refreshSession(ctx.store.base, token, ctx.now);
  if (!renewed) fail(401, "invalid_token");
  if (renewed.member.status === "suspended") fail(403, "account_suspended");
  const signed = { ...ctx, member: renewed.member, session: renewed.session, lang: renewed.member.language };
  return ok({ ...tokensBody(renewed), created: false, member: await meView(signed, renewed.member) });
}

export async function logOut(ctx: MemberContext): Promise<CommunityResult> {
  await ctx.store.base.deleteSession(ctx.session.id);
  return noContent();
}

// ------------------------------------------------------------ the email's links

export async function verifyEmail(ctx: CommunityContext): Promise<CommunityResult> {
  const token = ctx.json().token;
  const used = typeof token === "string" && token ? await ctx.store.base.useEmailToken(sha256Hex(token), "verify_email", ctx.now) : null;
  if (!used) fail(400, "invalid_token");
  await ctx.store.base.updateMember(used.memberId, { emailVerified: true, updatedAt: ctx.now });
  return noContent();
}

export async function resendVerification(ctx: MemberContext): Promise<CommunityResult> {
  const hit = await hitRateLimit(ctx.deps.platform, COMMUNITY_LIMITS.resend, ctx.member.id, ctx.now);
  if (!hit.allowed) tooMany(hit.retryAfter);
  await sendVerification(ctx, ctx.member);
  return noContent();
}

export async function requestPasswordReset(ctx: CommunityContext): Promise<CommunityResult> {
  const fields = new Fields();
  const email = readEmail(ctx.json().email, fields);
  fields.check();
  await limit(ctx, email);
  const member = await ctx.store.base.getMemberByEmail(email);
  if (member && member.status !== "deleted" && member.email) {
    const token = randomToken(32);
    await ctx.store.base.createEmailToken({ tokenHash: sha256Hex(token), memberId: member.id, purpose: "reset_password", expiresAt: new Date(ctx.now.getTime() + RESET_TTL_MS), usedAt: null, createdAt: ctx.now });
    const link = `${ctx.deps.siteUrl}/reset-password?token=${token}`;
    await ctx.deps.mail({ to: member.email, subject: t(member.language, "mail.reset.subject"), text: t(member.language, "mail.reset.body", { name: member.displayName, link }) });
  }
  return noContent();
}

export async function confirmPasswordReset(ctx: CommunityContext): Promise<CommunityResult> {
  const body = ctx.json();
  const fields = new Fields();
  const password = readPassword(body.password, fields);
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) fields.add("token", "field.required");
  fields.check();
  const used = await ctx.store.base.useEmailToken(sha256Hex(token), "reset_password", ctx.now);
  if (!used) fail(400, "invalid_token");
  const member = await ctx.store.base.getMember(used.memberId);
  if (!member) fail(400, "invalid_token");
  // The link came to the address: it is confirmed too. Every device signs in again.
  await ctx.store.base.updateMember(member.id, { passwordHash: await hashPassword(password), emailVerified: true, sessionVersion: member.sessionVersion + 1, updatedAt: ctx.now });
  await ctx.store.base.deleteSessions(member.id);
  return noContent();
}
