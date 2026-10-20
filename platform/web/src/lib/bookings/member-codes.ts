import { createHmac } from "node:crypto";
import { hmacSha256, safeEqual } from "../crypto/tokens";
import { CODE_ALPHABET, CODE_LENGTH, formatTicketCode, normalizeTicketCode } from "../events/codes";

/**
 * 63 Member codes: what a gym's member shows at the door, in the customer's
 * app (the QR code) or typed.
 *
 * The design of the event tickets' codes (lib/events/codes.ts): 12
 * characters from the same 32 that can't be mistaken for one another, typed
 * in groups of four, and a key per app made from the platform's signing
 * secret. A member code isn't stored: it is the first 60 bits of an HMAC of
 * the app and the membership with that key, so it can't be guessed, a code
 * of one gym never opens another's door, and the app can keep it to show
 * without a connection. The QR code holds `YM1.<membership>.<code>`.
 */

export const MEMBER_QR_PREFIX = "YM1";

/** The app's key for member codes. */
export function memberKey(signingSecret: string, appId: string): string {
  return hmacSha256(signingSecret, `member-codes:${appId}`);
}

/** The membership's code (32 divides 256, so each byte picks a character evenly). */
export function memberCode(key: string, appId: string, membershipId: number): string {
  const bytes = createHmac("sha256", key).update(`${appId}.${membershipId}`).digest();
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return code;
}

/** What the customer's app shows: the code to type and what its QR code holds. */
export function memberCodeJson(key: string, appId: string, membershipId: number): { code: string; qr_payload: string } {
  const code = memberCode(key, appId, membershipId);
  return { code, qr_payload: `${MEMBER_QR_PREFIX}.${membershipId}.${code}` };
}

export { formatTicketCode as formatMemberCode };

/**
 * What the door read or was typed: a QR code (its membership and code
 * checked with the app's key), a typed code (found among the memberships by
 * the caller), or why it isn't a member code of this app.
 */
export function readMemberCode(key: string, appId: string, input: string): { membershipId: number } | { code: string } | { error: "forged" | "not_a_code" } {
  const value = input.trim();
  if (value.startsWith(`${MEMBER_QR_PREFIX}.`)) {
    const [, id, code, extra] = value.split(".");
    const membershipId = Number(id);
    if (extra !== undefined || !id || !/^\d{1,15}$/.test(id) || !Number.isSafeInteger(membershipId) || !code || !normalizeTicketCode(code)) return { error: "not_a_code" };
    return safeEqual(code, memberCode(key, appId, membershipId)) ? { membershipId } : { error: "forged" };
  }
  const code = normalizeTicketCode(value);
  return code ? { code } : { error: "not_a_code" };
}
