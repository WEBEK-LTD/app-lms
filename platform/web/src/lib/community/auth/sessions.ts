import { newId, randomToken, sha256Hex } from "../../crypto/tokens";
import type { CommunityBaseStore } from "../store/base";
import type { CommunityMember, CommunitySession } from "../types";

/**
 * 231 The community's sessions: each sign-in is a device with an access
 * token (15 minutes) and a refresh token (60 days, renewed each time it is
 * used). Both are random secrets kept only as SHA-256 hashes. A member's
 * `sessionVersion` going up (a new password, a suspension) ends them all.
 */
export const ACCESS_TTL_MS = 15 * 60 * 1000;
export const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;
/** How often a member's "last active" is written while they use the community. */
const ACTIVE_EVERY_MS = 60 * 60 * 1000;

export interface DeviceInfo {
  name: string;
  platform: CommunitySession["platform"];
}

export interface IssuedTokens {
  session: CommunitySession;
  accessToken: string;
  refreshToken: string;
}

export function readDevice(value: unknown): DeviceInfo {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const platform = raw.platform === "ios" || raw.platform === "android" ? raw.platform : "web";
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 100) : platform === "web" ? "Browser" : platform === "ios" ? "iPhone" : "Android";
  return { name, platform };
}

function newTokens(now: Date) {
  const accessToken = `yca_${randomToken(32)}`;
  const refreshToken = `ycr_${randomToken(32)}`;
  return {
    accessToken,
    refreshToken,
    accessHash: sha256Hex(accessToken),
    refreshHash: sha256Hex(refreshToken),
    accessExpiresAt: new Date(now.getTime() + ACCESS_TTL_MS),
    refreshExpiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
  };
}

/** A new device for the member. */
export async function openSession(store: CommunityBaseStore, member: CommunityMember, device: DeviceInfo, now: Date): Promise<IssuedTokens> {
  const { accessToken, refreshToken, ...hashes } = newTokens(now);
  const session: CommunitySession = {
    id: newId(),
    memberId: member.id,
    name: device.name,
    platform: device.platform,
    ...hashes,
    sessionVersion: member.sessionVersion,
    createdAt: now,
    lastSeenAt: now,
  };
  await store.createSession(session);
  return { session, accessToken, refreshToken };
}

/** New tokens for a refresh token still valid; the old ones stop working. Null when it isn't. */
export async function refreshSession(store: CommunityBaseStore, refreshToken: string, now: Date): Promise<(IssuedTokens & { member: CommunityMember }) | null> {
  const session = await store.getSessionByRefresh(sha256Hex(refreshToken));
  if (!session || session.refreshExpiresAt.getTime() <= now.getTime()) return null;
  const member = await store.getMember(session.memberId);
  if (!member || member.status === "deleted" || member.sessionVersion !== session.sessionVersion) {
    await store.deleteSession(session.id);
    return null;
  }
  const { accessToken, refreshToken: next, ...hashes } = newTokens(now);
  await store.updateSession(session.id, { ...hashes, lastSeenAt: now });
  return { session: { ...session, ...hashes, lastSeenAt: now }, accessToken, refreshToken: next, member };
}

/** The member and device of an access token still valid; null otherwise. */
export async function authenticate(store: CommunityBaseStore, accessToken: string, now: Date): Promise<{ member: CommunityMember; session: CommunitySession } | null> {
  const session = await store.getSessionByAccess(sha256Hex(accessToken));
  if (!session || session.accessExpiresAt.getTime() <= now.getTime()) return null;
  const member = await store.getMember(session.memberId);
  if (!member || member.status === "deleted" || member.sessionVersion !== session.sessionVersion) return null;
  if (now.getTime() - member.lastActiveAt.getTime() >= ACTIVE_EVERY_MS) {
    await store.updateMember(member.id, { lastActiveAt: now });
    member.lastActiveAt = now;
  }
  if (now.getTime() - session.lastSeenAt.getTime() >= ACTIVE_EVERY_MS) await store.updateSession(session.id, { lastSeenAt: now });
  return { member, session };
}

/** The answer to a sign-in or a refresh (docs: Session). */
export function tokensBody(tokens: IssuedTokens) {
  return {
    access_token: tokens.accessToken,
    access_expires_at: tokens.session.accessExpiresAt.toISOString(),
    refresh_token: tokens.refreshToken,
    refresh_expires_at: tokens.session.refreshExpiresAt.toISOString(),
  };
}
