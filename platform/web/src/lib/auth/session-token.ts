import { EncryptJWT, jwtDecrypt } from "jose";
import { createHash } from "node:crypto";

/**
 * Session tokens are JWTs encrypted with A256GCM (JWE, "dir"), keyed from
 * SESSION_SECRET. The browser can't read or change them. They carry the user
 * id, the user's session version and (70) a random session ID whose SHA-256
 * is kept in `user_sessions`: the user and the session are loaded on each
 * request, so a password change (which bumps the version) signs out every
 * session, and signing out (which deletes the session's row) ends that one,
 * a copy of the cookie included.
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
/** 70 How long the step between the password and the authenticator code waits. */
export const TWO_STEP_TTL_SECONDS = 10 * 60;
const ISSUER = "yallapp.com.tr";
const AUDIENCE = "yallapp-session";
const TWO_STEP_AUDIENCE = "yallapp-two-step";

export interface SessionClaims {
  userId: string;
  sessionVersion: number;
  /** 70 The random session ID (only its hash is stored). */
  sessionId: string;
}

/** 70 Someone who gave the right password and still owes the authenticator code. */
export interface TwoStepClaims {
  userId: string;
  sessionVersion: number;
  /** Where to go once signed in (a path on this site), or null for their home. */
  next: string | null;
}

function keyFrom(secret: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(`yallapp-session:${secret}`).digest());
}

async function seal(payload: Record<string, unknown>, subject: string, audience: string, ttl: number, secret: string, now: Date): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttl)
    .encrypt(keyFrom(secret));
}

async function unseal(token: string, audience: string, secret: string, now: Date): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtDecrypt(token, keyFrom(secret), {
      issuer: ISSUER,
      audience,
      currentDate: now,
      contentEncryptionAlgorithms: ["A256GCM"],
      keyManagementAlgorithms: ["dir"],
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function sealSession(claims: SessionClaims, secret: string, now: Date = new Date()): Promise<string> {
  return seal({ sv: claims.sessionVersion, sid: claims.sessionId }, claims.userId, AUDIENCE, SESSION_TTL_SECONDS, secret, now);
}

export async function unsealSession(token: string, secret: string, now: Date = new Date()): Promise<SessionClaims | null> {
  const payload = await unseal(token, AUDIENCE, secret, now);
  if (!payload || typeof payload.sub !== "string" || typeof payload.sv !== "number" || typeof payload.sid !== "string" || !payload.sid) return null;
  return { userId: payload.sub, sessionVersion: payload.sv, sessionId: payload.sid };
}

export async function sealTwoStep(claims: TwoStepClaims, secret: string, now: Date = new Date()): Promise<string> {
  return seal({ sv: claims.sessionVersion, next: claims.next }, claims.userId, TWO_STEP_AUDIENCE, TWO_STEP_TTL_SECONDS, secret, now);
}

export async function unsealTwoStep(token: string, secret: string, now: Date = new Date()): Promise<TwoStepClaims | null> {
  const payload = await unseal(token, TWO_STEP_AUDIENCE, secret, now);
  if (!payload || typeof payload.sub !== "string" || typeof payload.sv !== "number") return null;
  return { userId: payload.sub, sessionVersion: payload.sv, next: typeof payload.next === "string" ? payload.next : null };
}
