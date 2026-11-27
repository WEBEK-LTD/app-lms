import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import { noContent, ok, type CommunityResult, type MemberContext } from "../api/http";
import { onYallappLinkChanged } from "../api/trust-hooks";
import { linkedAppView } from "../api/views";
import type { CommunityStore } from "../store";
import { isDuplicate } from "../store/db";
import type { CommunityMember } from "../types";
import { isCommunityLanguage, t } from "../i18n";
import type { CommunityMail } from "../mail";
import { linkedApps, yallappAccount } from "../yallapp";
import { limitMember } from "./accounts";

/**
 * 231 Linking a Yallapp account to a community member, OAuth-style: the
 * member starts in the community (`POST /me/yallapp-link/start`), confirms
 * on yallapp.com.tr signed in to Yallapp (/link-community?state=…), and is
 * sent back. One Yallapp account links to one member. The state is a random
 * secret kept as a hash for 15 minutes, used once.
 */
export const LINK_TTL_MS = 15 * 60 * 1000;
export const LINK_PAGE = "/link-community";
/** Where the app gets the browser back once linked. */
export const APP_RETURN_URL = "yallappcommunity://linked";

export async function startLink(ctx: MemberContext): Promise<CommunityResult> {
  await limitMember(ctx, "link");
  const returnTo = ctx.json().return_to === "app" ? "app" : "web";
  const state = randomToken(32);
  const expiresAt = new Date(ctx.now.getTime() + LINK_TTL_MS);
  await ctx.store.base.createLinkRequest({ stateHash: sha256Hex(state), memberId: ctx.member.id, expiresAt, confirmedAt: null, createdAt: ctx.now });
  const url = new URL(LINK_PAGE, ctx.deps.yallappUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("return", returnTo);
  return ok({ confirm_url: url.toString(), expires_at: expiresAt.toISOString() });
}

export async function getLink(ctx: MemberContext): Promise<CommunityResult> {
  const userId = ctx.member.yallappUserId;
  if (!userId) return ok({ linked: false, linked_at: null, account_name: null, account_email: null, apps: [] });
  const [account, apps] = await Promise.all([yallappAccount(ctx.deps.platform, userId), linkedApps(ctx.deps.platform, userId, ctx.now)]);
  return ok({ linked: true, linked_at: ctx.member.linkedAt?.toISOString() ?? null, account_name: account?.name ?? null, account_email: account?.email ?? null, apps: apps.map(linkedAppView) });
}

export async function unlink(ctx: MemberContext): Promise<CommunityResult> {
  if (ctx.member.yallappUserId) {
    await ctx.store.base.updateMember(ctx.member.id, { yallappUserId: null, linkedAt: null, yallappLinkVia: null, updatedAt: ctx.now });
    await onYallappLinkChanged(ctx, ctx.member.id);
  }
  return noContent();
}

export type LinkCheck = { ok: true; member: CommunityMember } | { ok: false; code: "link_expired" | "already_linked" };

/** The link request for a state from the confirm page: still waiting and in time, with its member. */
export async function pendingLink(store: CommunityStore, state: string, now: Date): Promise<LinkCheck> {
  const request = state ? await store.base.getLinkRequest(sha256Hex(state)) : null;
  if (!request || request.confirmedAt || request.expiresAt.getTime() <= now.getTime()) return { ok: false, code: "link_expired" };
  const member = await store.base.getMember(request.memberId);
  if (!member || member.status === "deleted") return { ok: false, code: "link_expired" };
  return { ok: true, member };
}

/**
 * The signed-in Yallapp user confirmed on yallapp.com.tr: their account is
 * the member's now. Refused when it is another member's already.
 */
export async function confirmLink(
  deps: { store: CommunityStore; platform: DataStore; now: Date },
  state: string,
  yallappUserId: string,
): Promise<LinkCheck> {
  const pending = await pendingLink(deps.store, state, deps.now);
  if (!pending.ok) return pending;
  const holder = await deps.store.base.getMemberByYallappUser(yallappUserId);
  if (holder && holder.id !== pending.member.id) return { ok: false, code: "already_linked" };
  let member: CommunityMember | null;
  try {
    member = await deps.store.base.updateMember(pending.member.id, { yallappUserId, linkedAt: deps.now, yallappLinkVia: "link", updatedAt: deps.now });
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, code: "already_linked" };
    throw error;
  }
  await deps.store.base.confirmLinkRequest(sha256Hex(state), deps.now);
  return { ok: true, member: member ?? pending.member };
}

/** 231 The email to the Yallapp account's owner once it is linked (in their dashboard language, else English). */
export function linkedMail(user: { name: string; email: string; language?: string | null }, member: CommunityMember): CommunityMail {
  const lang = isCommunityLanguage(user.language) ? user.language : "en";
  return {
    to: user.email,
    subject: t(lang, "mail.linked.subject"),
    text: t(lang, "mail.linked.body", { name: user.name, member: member.displayName, username: member.username, contact: "info@yallapp.com.tr" }),
  };
}
