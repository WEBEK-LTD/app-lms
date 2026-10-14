import { randomInt } from "node:crypto";
import { hmacSha256, safeEqual } from "../crypto/tokens";

/**
 * 28 Ticket codes and their QR payloads.
 *
 * A code is 12 characters from 32 that can't be mistaken for one another
 * (no I, O, 0 or 1), drawn with the system's secure random generator: 60 bits,
 * so it can't be guessed. People type it at the door in groups of four.
 *
 * The QR code holds `YT1.<code>.<signature>`, the signature being an HMAC of
 * the app and the code with a key of that app (made from the platform's
 * signing secret), so nobody can make a QR code for a code they don't hold,
 * and a ticket of one app never checks in at another's door.
 */

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 12;
export const QR_PREFIX = "YT1";

const CODE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** A new random ticket code. */
export function newTicketCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export function isTicketCode(value: string): boolean {
  return CODE.test(value);
}

/** "K7QM4XP2HD9W" → "K7QM-4XP2-HD9W" */
export function formatTicketCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

/** A code as someone typed it (with spaces or dashes, in lower case), or null when it can't be one. */
export function normalizeTicketCode(typed: string): string | null {
  const code = typed.toUpperCase().replace(/[\s-]/g, "");
  return isTicketCode(code) ? code : null;
}

/** The app's key for ticket signatures. */
export function ticketKey(signingSecret: string, appId: string): string {
  return hmacSha256(signingSecret, `event-tickets:${appId}`);
}

function signature(key: string, appId: string, code: string): string {
  // 16 bytes of the HMAC are plenty against forging, and keep the QR code small.
  return hmacSha256(key, `${appId}.${code}`).slice(0, 22);
}

/** What a ticket's QR code holds. */
export function qrPayload(key: string, appId: string, code: string): string {
  return `${QR_PREFIX}.${code}.${signature(key, appId, code)}`;
}

/**
 * What the check-in read or was typed: a QR payload (its signature checked),
 * a code, or why it isn't a ticket of this app.
 */
export function readCheckIn(key: string, appId: string, input: string): { code: string } | { error: "bad_signature" | "not_a_code" } {
  const value = input.trim();
  if (value.startsWith(`${QR_PREFIX}.`)) {
    const [, code, sig] = value.split(".");
    if (!code || !sig || !isTicketCode(code)) return { error: "not_a_code" };
    return safeEqual(sig, signature(key, appId, code)) ? { code } : { error: "bad_signature" };
  }
  const code = normalizeTicketCode(value);
  return code ? { code } : { error: "not_a_code" };
}
