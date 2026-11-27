import { fail, type Fail } from "../trust/service";
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
