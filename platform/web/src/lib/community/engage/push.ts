import { communityLang, pushes, DEFAULT_NOTIFICATION_PREFS } from "../trust/notifications";
import { fail, PUSH_TITLE, type Fail } from "../trust/service";
import { engageOf, type EngageCtx } from "./context";
import type { PushPlatform } from "./store";

/**
 * 232 Push for the Community app: a member's phones register their
 * Firebase Cloud Messaging token after sign-in, every notification
 * (lib/community/trust/service.ts notify) goes to them unless the member
 * turned its kind off, and tokens Firebase says are gone are forgotten.
 * Sending is Yallapp's keyless setup (Workload Identity Federation,
 * lib/hosted/push.ts): no key and no Firebase config file in the code.
 */

export interface CommunityPushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

/** Sends one message to these phones; the tokens Firebase no longer knows come back. */
export type CommunityPusher = (targets: { token: string; platform: PushPlatform }[], message: CommunityPushMessage) => Promise<{ sent: number; invalidTokens: string[] }>;

/** The Community app (Android's package and iOS's bundle ID): its pushes never reach another app. */
export const COMMUNITY_APP_ID = "tr.com.yallapp.community";

const TOKEN = /^[A-Za-z0-9:_\-.]{20,4096}$/;

/**
 * PUT /me/push-tokens: the signed-in phone's token, kept for its session (a
 * new one replaces the old). The same phone signed in as someone else moves
 * to them. Signing out forgets it (the row goes with the session).
 */
export async function registerDevice(ctx: EngageCtx, session: { id: string; memberId: string }, input: unknown): Promise<{ ok: true } | Fail> {
  const v = (input ?? {}) as { token?: unknown; platform?: unknown };
  const errors: Record<string, string> = {};
  if (typeof v.token !== "string" || !TOKEN.test(v.token)) errors.token = "Send the phone's push token.";
  if (v.platform !== "android" && v.platform !== "ios") errors.platform = "platform must be android or ios.";
  if (Object.keys(errors).length) return fail(400, "invalid_request", "Please check the highlighted fields.", errors);
  const { store, tenantId } = engageOf(ctx);
  await store.saveDevice({ sessionId: session.id, token: v.token as string, tenantId, memberId: session.memberId, platform: v.platform as PushPlatform }, ctx.now);
  return { ok: true };
}

/** DELETE /me/push-tokens: this phone stops getting pushes (its session stays signed in). */
export async function unregisterDevice(ctx: EngageCtx, sessionId: string): Promise<void> {
  await engageOf(ctx).store.removeSessionDevice(sessionId);
}

/** Pushes one notice to every phone of a member; nothing when push isn't set up here or they have none. */
export async function pushToMember(ctx: EngageCtx, memberId: string, message: CommunityPushMessage): Promise<number> {
  const pusher = ctx.deps.push;
  if (!pusher) return 0;
  const { store } = engageOf(ctx);
  const all = await store.devicesOf([memberId]);
  if (!all.length) return 0;
  // Only phones still signed in: signing out (or out everywhere), or a session that ran out, forgets its token.
  const live = new Set((await ctx.store.base.listSessions(memberId)).filter((x) => x.refreshExpiresAt > ctx.now).map((x) => x.id));
  const gone = all.filter((d) => !live.has(d.sessionId));
  for (const d of gone) await store.removeSessionDevice(d.sessionId);
  const devices = all.filter((d) => live.has(d.sessionId));
  if (!devices.length) return 0;
  const result = await pusher(
    devices.map((d) => ({ token: d.token, platform: d.platform })),
    message,
  );
  if (result.invalidTokens.length) await store.removeTokens(result.invalidTokens);
  return result.sent;
}

const PHOTO: Record<"en" | "ar" | "tr", string> = { en: "Photo", ar: "صورة", tr: "Fotoğraf" };

/**
 * 232 A new message, pushed to everyone else in the conversation who is
 * still in it and hasn't muted it, unless they turned message pushes off or
 * a block stands between them (area A's messages call it after sending).
 * The words are the message's own (a photo says so in their language).
 */
export async function pushNewMessage(ctx: EngageCtx, input: { conversationId: string; authorId: string; authorName: string; body: string; photos: number; recipients: readonly string[] }): Promise<number> {
  if (!ctx.deps.push) return 0;
  let sent = 0;
  for (const memberId of input.recipients) {
    if (memberId === input.authorId) continue;
    const member = await ctx.store.base.getMember(memberId);
    if (!member || member.status !== "active") continue;
    if ((await ctx.store.base.blockedEitherWay(memberId)).has(input.authorId)) continue;
    const prefs = (await ctx.store.trust.getNotificationPrefs(memberId)) ?? DEFAULT_NOTIFICATION_PREFS;
    if (!pushes("message", prefs)) continue;
    const lang = communityLang(member.language);
    const words = input.body.trim() || (input.photos ? PHOTO[lang] : "");
    const body = `${input.authorName}: ${words}`.slice(0, 180);
    sent += await pushToMember(ctx, memberId, { title: PUSH_TITLE, body, data: { kind: "message", conversation_id: input.conversationId, link: `/messages/${input.conversationId}` } });
  }
  return sent;
}
