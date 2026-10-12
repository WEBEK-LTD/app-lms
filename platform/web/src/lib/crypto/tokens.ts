import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

/** URL-safe random token with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Compare anyway so the timing doesn't depend on where the lengths differ.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}
