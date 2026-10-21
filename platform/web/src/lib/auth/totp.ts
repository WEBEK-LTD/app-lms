import { createHmac, randomBytes, randomInt } from "node:crypto";
import { safeEqual } from "../crypto/tokens";

/**
 * 70 Codes from an authenticator app (TOTP, RFC 6238 over RFC 4226's HOTP):
 * HMAC-SHA1, 30-second steps, 6 digits, the step before and after accepted
 * for a phone whose clock is a little off. The secret is 20 random bytes,
 * shown as base32 (RFC 4648) in the QR code's `otpauth://` address and as
 * text. Recovery codes are 10 one-time codes of 10 characters.
 */

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Steps accepted on either side of the current one. */
export const TOTP_WINDOW = 1;
export const RECOVERY_CODE_COUNT = 10;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Not base32");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new secret: 20 random bytes in base32 (32 characters). */
export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The 30-second step of a moment. */
export function totpStep(now: Date): number {
  return Math.floor(now.getTime() / 1000 / TOTP_PERIOD_SECONDS);
}

/** The code of one step (RFC 4226's dynamic truncation). */
export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1]! & 0x0f;
  const binary = ((mac[offset]! & 0x7f) << 24) | (mac[offset + 1]! << 16) | (mac[offset + 2]! << 8) | mac[offset + 3]!;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/** Six digits as people type them: spaces and dashes left out. Null when it isn't one. */
export function readTotpCode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** The step whose code this is (the current one, or one step on either side), or null. Compares in constant time. */
export function matchTotp(secret: string, code: string, now: Date): number | null {
  const typed = readTotpCode(code);
  if (!typed) return null;
  const current = totpStep(now);
  let found: number | null = null;
  for (let step = current - TOTP_WINDOW; step <= current + TOTP_WINDOW; step++) {
    if (safeEqual(totpCode(secret, step), typed) && found === null) found = step;
  }
  return found;
}

/** The address authenticator apps read from the QR code. */
export function otpauthUri(secret: string, account: string, issuer = "Yallapp"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const query = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD_SECONDS) });
  return `otpauth://totp/${label}?${query.toString()}`;
}

/** The secret in groups of four, easier to type by hand. */
export function groupedSecret(secret: string): string {
  return secret.replace(/(.{4})(?=.)/g, "$1 ");
}

// Recovery codes: lowercase letters and digits without look-alikes (0/o, 1/l/i).
const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Ten new recovery codes, like `k7m2p-x9qa4`. */
export function newRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from({ length: 10 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}

/** A recovery code as typed (any case, with or without the dash and spaces), or null when it can't be one. */
export function readRecoveryCode(input: string): string | null {
  const clean = input.toLowerCase().replace(/[\s-]/g, "");
  return clean.length === 10 && [...clean].every((c) => RECOVERY_ALPHABET.includes(c)) ? clean : null;
}
