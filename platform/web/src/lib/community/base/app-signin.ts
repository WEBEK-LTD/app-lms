import { hmacSha256 } from "../../crypto/tokens";
import { decodeJwt } from "../../hosted/jwt";
import { fail, ok, type CommunityContext, type CommunityResult } from "../api/http";
import { meView } from "../api/views";
import { openSession, readDevice, tokensBody } from "../auth/sessions";
import { isDuplicate } from "../store/db";
import { YALLAPP_TENANT, type CommunityMember } from "../types";
import { freeUsername, newMember } from "./accounts";
import { impersonatesTeam } from "./validate";

/**
 * 235 A client app's own community: its members are the app's customers.
 * `POST /auth/app` (on /api/app/{app_id}/community/v1 only) takes the
 * customer's hosted API access token and gives a community session: the
 * member tied to that customer (identity provider "app", the customer's id),
 * made with their name and email the first time. No second sign-up.
 * Apps whose customers sign in through the client's own API (Yallapp signs
 * them in) aren't served yet: 400 not_allowed.
 */

/** The hosted API's signing secret (src/app/api/app/[appId]/[...path]/route.ts), unless the tests give one. */
async function hostedSecret(ctx: CommunityContext): Promise<string> {
  if (ctx.deps.hostedSecret) return ctx.deps.hostedSecret;
  const { signingSecret } = await import("../../env");
  return hmacSha256(signingSecret(), "hosted-api");
}

export async function appSignIn(ctx: CommunityContext): Promise<CommunityResult> {
  if (ctx.deps.tenant === YALLAPP_TENANT) fail(404, "not_found");
  const appId = ctx.deps.tenant;
  const token = ctx.json().access_token;
  if (typeof token !== "string" || !token) fail(401, "invalid_token");
  const platform = ctx.deps.platform;
  const app = await platform.getAppById(appId);
  if (!app) fail(404, "not_found");
  const claims = decodeJwt(token, await hostedSecret(ctx), appId, Math.floor(ctx.now.getTime() / 1000));
  if (!claims) fail(401, "invalid_token");
  // The customer's device must still be signed in, as the hosted API checks it.
  const device = await platform.getHostedDevice(appId, claims.did);
  if (!device || device.userId !== claims.sub) fail(401, "invalid_token");
  const customer = await platform.getHostedUser(appId, claims.sub);
  if (!customer) fail(401, "invalid_token");

  const store = ctx.store.base;
  const subject = String(customer.id);
  const known = await store.getIdentity("app", subject);
  if (known) {
    const member = await store.getMember(known.memberId);
    if (!member || member.status === "deleted") fail(401, "invalid_token");
    return signedIn(ctx, member, false);
  }
  const email = customer.email?.trim().toLowerCase() || null;
  // Another member of this community with the email signs in their own way.
  const sameEmail = email ? await store.getMemberByEmail(email) : null;
  const named = (customer.name || "Member").slice(0, 80);
  const displayName = impersonatesTeam(named) ? "Member" : named;
  const member: CommunityMember = newMember({
    email: sameEmail ? null : email,
    // The app confirmed the customer (their phone or email sign-in).
    emailVerified: !sameEmail && email !== null,
    passwordHash: null,
    displayName,
    username: await freeUsername(store, displayName),
    language: ctx.lang,
    now: ctx.now,
  });
  try {
    await store.createMember(member);
    await store.addIdentity({ memberId: member.id, provider: "app", subject, email, createdAt: ctx.now });
  } catch (error) {
    // The same customer's first sign-in finished a moment before.
    if (!isDuplicate(error)) throw error;
    const raced = await store.getIdentity("app", subject);
    const other = raced ? await store.getMember(raced.memberId) : null;
    if (!other) throw error;
    return signedIn(ctx, other, false);
  }
  return signedIn(ctx, member, true);
}

async function signedIn(ctx: CommunityContext, member: CommunityMember, created: boolean): Promise<CommunityResult> {
  if (member.status === "suspended") fail(403, "account_suspended");
  const tokens = await openSession(ctx.store.base, member, readDevice(ctx.json().device), ctx.now);
  const signed = { ...ctx, member, session: tokens.session, lang: member.language };
  return ok({ ...tokensBody(tokens), created, member: await meView(signed, member) }, created ? 201 : 200);
}
