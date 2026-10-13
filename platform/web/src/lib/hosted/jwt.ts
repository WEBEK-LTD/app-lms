import { createHmac } from "node:crypto";
import { safeEqual } from "../crypto/tokens";

/** HS256 JSON Web Tokens for the hosted API's access tokens. */

export interface AccessClaims {
  /** The app the token is for. */
  aud: string;
  /** Customer ID. */
  sub: number;
  /** Device row ID. */
  did: string;
  iat: number;
  exp: number;
}

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

export function encodeJwt(claims: AccessClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${HEADER}.${payload}`).digest("base64url");
  return `${HEADER}.${payload}.${signature}`;
}

/** The claims, or null when the token is malformed, forged, for another app or expired. */
export function decodeJwt(token: string, secret: string, audience: string, nowSeconds: number): AccessClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest("base64url");
  if (!safeEqual(parts[2]!, expected)) return null;
  let claims: Partial<AccessClaims>;
  try {
    claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Partial<AccessClaims>;
  } catch {
    return null;
  }
  if (
    claims.aud !== audience ||
    typeof claims.sub !== "number" ||
    typeof claims.did !== "string" ||
    typeof claims.exp !== "number" ||
    claims.exp <= nowSeconds
  ) {
    return null;
  }
  return claims as AccessClaims;
}
