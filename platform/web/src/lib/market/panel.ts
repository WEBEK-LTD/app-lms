import { randomInt } from "node:crypto";
import { randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, RestaurantStaff } from "../data/types";

/**
 * 115.7 The vendors' web panel on Yallapp's site: its own sign-in, apart
 * from the app owner's dashboard. A vendor's staff member types their email;
 * a six-digit code goes to it (10 minutes, 5 tries); the code opens a
 * session for 12 hours, kept by its hash. Only the app's vendors' active
 * staff with that email can sign in, and only to their own vendor.
 */

export const CODE_MINUTES = 10;
export const CODE_ATTEMPTS = 5;
export const SESSION_HOURS = 12;

export function panelCookie(appId: string): string {
  return `yv_${appId.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

export function normalEmail(text: string): string | null {
  const email = text.trim().toLowerCase();
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(email) ? email : null;
}

/** A sign-in code for the staff member with this email, or null when nobody at the app's vendors has it (said the same way to the person). */
export async function startPanelSignIn(store: DataStore, app: App, email: string, now: Date): Promise<{ token: string; code: string; staff: RestaurantStaff } | null> {
  if (app.connector?.kind !== "restaurants") return null;
  const staff = await store.findRestaurantStaff(app.id, { phone: null, email });
  if (!staff?.active) return null;
  const vendor = await store.getRestaurant(app.id, staff.restaurantId);
  if (!vendor?.active) return null;
  const token = randomToken(24);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await store.createVendorWebChallenge({ tokenHash: sha256Hex(token), appId: app.id, email, codeHash: sha256Hex(`${token}:${code}`), attempts: 0, expiresAt: new Date(now.getTime() + CODE_MINUTES * 60_000), createdAt: now });
  return { token, code, staff };
}

export type PanelCheck = { ok: true; sessionId: string; expiresAt: Date } | { ok: false; error: "expired" | "wrong" | "too_many" };

/** The code typed: a session when it's right. */
export async function finishPanelSignIn(store: DataStore, app: App, token: string, code: string, now: Date): Promise<PanelCheck> {
  const tokenHash = sha256Hex(token);
  const challenge = await store.getVendorWebChallenge(tokenHash);
  if (!challenge || challenge.appId !== app.id || challenge.expiresAt <= now) return { ok: false, error: "expired" };
  if (challenge.attempts >= CODE_ATTEMPTS) return { ok: false, error: "too_many" };
  if (sha256Hex(`${token}:${code.trim()}`) !== challenge.codeHash) {
    const attempts = await store.addVendorWebChallengeAttempt(tokenHash);
    return { ok: false, error: attempts >= CODE_ATTEMPTS ? "too_many" : "wrong" };
  }
  await store.deleteVendorWebChallenge(tokenHash);
  const staff = await store.findRestaurantStaff(app.id, { phone: null, email: challenge.email });
  if (!staff?.active) return { ok: false, error: "expired" };
  const sessionId = randomToken(32);
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3_600_000);
  await store.createVendorWebSession({ idHash: sha256Hex(sessionId), appId: app.id, vendorId: staff.restaurantId, staffId: staff.id, createdAt: now, expiresAt, lastSeenAt: now });
  return { ok: true, sessionId, expiresAt };
}

/** The staff member a session belongs to, while it, they and their vendor are still active. */
export async function panelStaff(store: DataStore, app: App, sessionId: string | undefined, now: Date): Promise<RestaurantStaff | null> {
  if (!sessionId) return null;
  const idHash = sha256Hex(sessionId);
  const session = await store.getVendorWebSession(idHash);
  if (!session || session.appId !== app.id || session.expiresAt <= now) return null;
  const staff = (await store.listRestaurantStaff(app.id, session.vendorId)).find((s) => s.id === session.staffId);
  if (!staff?.active) return null;
  if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60_000) await store.touchVendorWebSession(idHash, now);
  return staff;
}

export async function endPanelSession(store: DataStore, sessionId: string | undefined): Promise<void> {
  if (sessionId) await store.deleteVendorWebSession(sha256Hex(sessionId));
}
