import { randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { User } from "../data/types";

export const RESET_TTL_MS = 60 * 60 * 1000;

export interface ResetRequest {
  user: User;
  token: string;
  /** True when the account has no password yet (a super admin being set up). */
  isNewAccount: boolean;
}

/**
 * Creates a single-use reset token for the email, if there's an account.
 * Super admins listed in SUPER_ADMIN_EMAILS get an account created on their
 * first request: that's how the first admin signs in.
 */
export async function createPasswordReset(
  store: DataStore,
  email: string,
  now: Date,
  options: { adminEmails: string[] },
): Promise<ResetRequest | null> {
  const normalized = email.trim().toLowerCase();
  let user = await store.getUserByEmail(normalized);
  if (!user) {
    if (!options.adminEmails.includes(normalized)) return null;
    user = await store.createUser({ email: normalized, name: "Yallapp admin", passwordHash: null, now });
  }
  const token = randomToken(32);
  await store.createResetToken({
    tokenHash: sha256Hex(token),
    userId: user.id,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
    usedAt: null,
    createdAt: now,
  });
  return { user, token, isNewAccount: user.passwordHash === null };
}

export type ResetCheck = { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "used" };

export async function checkResetToken(store: DataStore, token: string, now: Date): Promise<ResetCheck> {
  const record = await store.getResetToken(sha256Hex(token));
  if (!record) return { ok: false, reason: "invalid" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, userId: record.userId };
}

/**
 * Sets the new password and signs out every existing session (the session
 * version is bumped). Returns the updated user, or why the token can't be used.
 */
export async function completePasswordReset(
  store: DataStore,
  token: string,
  passwordHash: string,
  now: Date,
): Promise<{ ok: true; user: User } | { ok: false; reason: "invalid" | "expired" | "used" }> {
  const check = await checkResetToken(store, token, now);
  if (!check.ok) return check;
  if (!(await store.consumeResetToken(sha256Hex(token), now))) return { ok: false, reason: "used" };
  const user = await store.getUserById(check.userId);
  if (!user) return { ok: false, reason: "invalid" };
  const sessionVersion = user.sessionVersion + 1;
  await store.updateUser(user.id, { passwordHash, sessionVersion }, now);
  return { ok: true, user: { ...user, passwordHash, sessionVersion, updatedAt: now } };
}
