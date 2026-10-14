import { describe, expect, it } from "vitest";
import { LogSender, OtpSendError, type OtpSender } from "@/lib/hosted/otp-sender";
import { checkTestCode, OTP_TEST_TTL_SECONDS, sendTestCode } from "@/lib/hosted/otp-test";
import { NOW } from "./helpers";

const SECRET = "test-session-secret-0123456789abcdef0123456789";
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

describe("the admin's sign-in code test", () => {
  it("sends a code and checks it, keeping only its hash", async () => {
    const sender = new LogSender();
    const ticket = await sendTestCode(sender, "+201001234567", SECRET, NOW);
    const code = sender.sent.get("+201001234567")!;
    expect(code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(ticket)).not.toContain(code);
    expect(ticket.expiresAt).toBe(later(OTP_TEST_TTL_SECONDS).getTime());

    expect(checkTestCode(ticket, code === "000000" ? "000001" : "000000", SECRET, NOW)).toBe("wrong");
    expect(checkTestCode(ticket, "abc", SECRET, NOW)).toBe("wrong");
    expect(checkTestCode(ticket, code, SECRET, NOW)).toBe("right");
    expect(checkTestCode(ticket, code, SECRET, later(OTP_TEST_TTL_SECONDS))).toBe("expired");
  });

  it("reports what the provider answered when the code isn't sent", async () => {
    const down: OtpSender = {
      async send() {
        throw new OtpSendError("WABEK answered HTTP 404 (No connected WhatsApp instance).");
      },
    };
    await expect(sendTestCode(down, "+201001234567", SECRET, NOW)).rejects.toThrow("No connected WhatsApp instance");
  });
});
