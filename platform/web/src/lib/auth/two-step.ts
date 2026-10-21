import { decrypt, encrypt } from "../crypto/encryption";
import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { User } from "../data/types";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { verifyPassword } from "./password";
import { matchTotp, newRecoveryCodes, newTotpSecret, readRecoveryCode, readTotpCode } from "./totp";

/**
 * 70 Two-step sign-in with an authenticator app, for Yallapp's team and for
 * clients and their team members: the same rules wherever someone signs in
 * (the website, a team invitation, a password reset, Yallapp Business).
 *
 * - Setting up: a new secret is kept encrypted (`two-step:<user id>` as the
 *   context) and waits; the first right code turns it on and gives 10
 *   recovery codes, shown once and kept as hashes.
 * - Signing in: a code of the current 30-second step (or one either side)
 *   that is newer than the last one used, or an unused recovery code. Each
 *   works once. Attempts count per person (RATE_LIMITS.twoStepUser).
 * - Turning it off needs the password and a current code (or a recovery code).
 */

type Store = Pick<
  DataStore,
  | "getTwoFactor"
  | "saveTwoFactorSetup"
  | "enableTwoFactor"
  | "useTwoFactorStep"
  | "useRecoveryCode"
  | "replaceRecoveryCodes"
  | "countUnusedRecoveryCodes"
  | "deleteTwoFactor"
  | "hitRateLimit"
>;

export const twoStepContext = (userId: string) => `two-step:${userId}`;

export function hashRecoveryCode(userId: string, code: string): string {
  return sha256Hex(`yallapp-recovery:${userId}:${code}`);
}

export interface TwoStepStatus {
  on: boolean;
  enabledAt: Date | null;
  /** A setup waiting for its first code. */
  waiting: boolean;
  recoveryLeft: number;
}

export async function twoStepStatus(store: Pick<Store, "getTwoFactor" | "countUnusedRecoveryCodes">, userId: string): Promise<TwoStepStatus> {
  const record = await store.getTwoFactor(userId);
  const on = Boolean(record?.enabledAt);
  return { on, enabledAt: record?.enabledAt ?? null, waiting: Boolean(record && !record.enabledAt), recoveryLeft: on ? await store.countUnusedRecoveryCodes(userId) : 0 };
}

/** Whether signing in needs the second step. */
export async function hasTwoStep(store: Pick<Store, "getTwoFactor">, userId: string): Promise<boolean> {
  return Boolean((await store.getTwoFactor(userId))?.enabledAt);
}

/** Starts (or starts again) a setup: a new secret that waits for its first code. Null when it is already on. */
export async function beginTwoStepSetup(store: Store, user: Pick<User, "id">, key: Buffer, now: Date): Promise<string | null> {
  const secret = newTotpSecret();
  return (await store.saveTwoFactorSetup(user.id, encrypt(secret, key, twoStepContext(user.id)), now)) ? secret : null;
}

/** The secret of a setup that waits for its first code (for its QR code), or null. */
export async function waitingSecret(store: Pick<Store, "getTwoFactor">, userId: string, key: Buffer): Promise<string | null> {
  const record = await store.getTwoFactor(userId);
  if (!record || record.enabledAt) return null;
  try {
    return decrypt(record.secretEncrypted, key, twoStepContext(userId));
  } catch {
    return null;
  }
}

export type SetupResult = { ok: true; recoveryCodes: string[] } | { ok: false; error: "format" | "wrong" | "none" | "on" | "rate" };

/** Turns the waiting setup on with its first code; gives the recovery codes to show once. */
export async function confirmTwoStepSetup(store: Store, user: Pick<User, "id">, input: string, key: Buffer, now: Date): Promise<SetupResult> {
  if (!readTotpCode(input)) return { ok: false, error: "format" };
  if (!(await hitRateLimit(store, RATE_LIMITS.twoStepUser, user.id, now)).allowed) return { ok: false, error: "rate" };
  const record = await store.getTwoFactor(user.id);
  if (!record) return { ok: false, error: "none" };
  if (record.enabledAt) return { ok: false, error: "on" };
  const secret = decrypt(record.secretEncrypted, key, twoStepContext(user.id));
  const step = matchTotp(secret, input, now);
  if (step === null) return { ok: false, error: "wrong" };
  const codes = newRecoveryCodes();
  const hashes = codes.map((code) => hashRecoveryCode(user.id, readRecoveryCode(code)!));
  if (!(await store.enableTwoFactor(user.id, step, hashes, now))) return { ok: false, error: "on" };
  return { ok: true, recoveryCodes: codes };
}

export type SecondStep = { ok: true; used: "code" | "recovery" } | { ok: false; error: "format" | "wrong" | "rate" | "off" };

/**
 * The second step: an authenticator code or a recovery code. Counts the
 * attempt per person first; a code works once (its step is claimed).
 */
export async function checkSecondStep(store: Store, user: Pick<User, "id">, input: string, key: Buffer, now: Date): Promise<SecondStep> {
  const code = readTotpCode(input);
  const recovery = code ? null : readRecoveryCode(input);
  if (!code && !recovery) return { ok: false, error: "format" };
  if (!(await hitRateLimit(store, RATE_LIMITS.twoStepUser, user.id, now)).allowed) return { ok: false, error: "rate" };
  const record = await store.getTwoFactor(user.id);
  if (!record?.enabledAt) return { ok: false, error: "off" };
  if (recovery) return (await store.useRecoveryCode(user.id, hashRecoveryCode(user.id, recovery), now)) ? { ok: true, used: "recovery" } : { ok: false, error: "wrong" };
  const secret = decrypt(record.secretEncrypted, key, twoStepContext(user.id));
  const step = matchTotp(secret, code!, now);
  if (step === null || !(await store.useTwoFactorStep(user.id, step, now))) return { ok: false, error: "wrong" };
  return { ok: true, used: "code" };
}

export type TurnOffResult = { ok: true } | { ok: false; error: "password" | "format" | "wrong" | "rate" | "off" };

/** Turns it off with the password and a current code (or a recovery code). */
export async function turnOffTwoStep(store: Store, user: Pick<User, "id" | "email" | "passwordHash">, input: { password: string; code: string }, key: Buffer, now: Date): Promise<TurnOffResult> {
  if (!(await hasTwoStep(store, user.id))) return { ok: false, error: "off" };
  // The password counts with the sign-in attempts, as on the sign-in page.
  if (!(await hitRateLimit(store, RATE_LIMITS.signInEmail, user.email, now)).allowed) return { ok: false, error: "rate" };
  if (!(await verifyPassword(user.passwordHash, input.password))) return { ok: false, error: "password" };
  const second = await checkSecondStep(store, user, input.code, key, now);
  if (!second.ok) return { ok: false, error: second.error };
  await store.deleteTwoFactor(user.id);
  return { ok: true };
}

export type NewCodesResult = { ok: true; recoveryCodes: string[] } | { ok: false; error: "format" | "wrong" | "rate" | "off" };

/** Ten new recovery codes for a current code; the old ones stop working. */
export async function renewRecoveryCodes(store: Store, user: Pick<User, "id">, input: string, key: Buffer, now: Date): Promise<NewCodesResult> {
  if (!readTotpCode(input)) return { ok: false, error: "format" };
  const second = await checkSecondStep(store, user, input, key, now);
  if (!second.ok) return { ok: false, error: second.error };
  const codes = newRecoveryCodes();
  await store.replaceRecoveryCodes(
    user.id,
    codes.map((code) => hashRecoveryCode(user.id, readRecoveryCode(code)!)),
    now,
  );
  return { ok: true, recoveryCodes: codes };
}
