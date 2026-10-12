import { EncryptJWT, jwtDecrypt } from "jose";
import { createHash } from "node:crypto";

/**
 * Session tokens are JWTs encrypted with A256GCM (JWE, "dir"), keyed from
 * SESSION_SECRET. The browser can't read or change them. They carry only the
 * user id and the user's session version; the user is loaded on each request,
 * so a password change (which bumps the version) signs out every session.
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const ISSUER = "yallapp.com.tr";
const AUDIENCE = "yallapp-session";

export interface SessionClaims {
  userId: string;
  sessionVersion: number;
}

function keyFrom(secret: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(`yallapp-session:${secret}`).digest());
}

export async function sealSession(claims: SessionClaims, secret: string, now: Date = new Date()): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new EncryptJWT({ sv: claims.sessionVersion })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .encrypt(keyFrom(secret));
}

export async function unsealSession(token: string, secret: string, now: Date = new Date()): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtDecrypt(token, keyFrom(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      currentDate: now,
      contentEncryptionAlgorithms: ["A256GCM"],
      keyManagementAlgorithms: ["dir"],
    });
    if (typeof payload.sub !== "string" || typeof payload.sv !== "number") return null;
    return { userId: payload.sub, sessionVersion: payload.sv };
  } catch {
    return null;
  }
}
