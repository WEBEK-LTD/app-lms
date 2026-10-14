import { randomInt } from "node:crypto";
import { hmacSha256, safeEqual } from "../crypto/tokens";
import type { OtpSender } from "./otp-sender";

/**
 * The admin's test of the sign-in code setting (Settings › Sign-in codes):
 * a real code is sent to the admin's own number with the saved sender, then
 * checked the way the hosted API checks it (by the provider for WABEK). The
 * ticket travels in an encrypted cookie; it holds the number and, for codes
 * we make, only a hash of the code.
 */
export interface OtpTestTicket {
  phone: string;
  /** Null when the provider makes and checks the code (WABEK). */
  codeHash: string | null;
  expiresAt: number;
}

export const OTP_TEST_TTL_SECONDS = 300;

const hash = (secret: string, phone: string, code: string) => hmacSha256(secret, `otp-test:${phone}:${code}`);

/** Sends a test code; throws the sender's error (an OtpSendError says what the provider answered). */
export async function sendTestCode(sender: OtpSender, phone: string, secret: string, now: Date): Promise<OtpTestTicket> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sender.send({ phone, code, appName: "Yallapp test", expiresInSeconds: OTP_TEST_TTL_SECONDS });
  return { phone, codeHash: sender.verify ? null : hash(secret, phone, code), expiresAt: now.getTime() + OTP_TEST_TTL_SECONDS * 1000 };
}

/** Whether the code the admin typed is right; throws when the provider can't check it. */
export async function checkTestCode(
  sender: OtpSender,
  ticket: OtpTestTicket,
  code: string,
  secret: string,
  now: Date,
): Promise<"right" | "wrong" | "expired"> {
  if (ticket.expiresAt <= now.getTime()) return "expired";
  if (!/^\d{4,8}$/.test(code)) return "wrong";
  if (ticket.codeHash === null) {
    if (!sender.verify) return "expired";
    return (await sender.verify({ phone: ticket.phone, code })) ? "right" : "wrong";
  }
  return safeEqual(hash(secret, ticket.phone, code), ticket.codeHash) ? "right" : "wrong";
}
