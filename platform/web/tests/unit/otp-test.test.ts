import { describe, expect, it } from "vitest";
import { LogSender, OtpSendError, type OtpSender } from "@/lib/hosted/otp-sender";
import { checkTestCode, OTP_TEST_TTL_SECONDS, sendTestCode } from "@/lib/hosted/otp-test";
import { NOW } from "./helpers";

const SECRET = "test-session-secret-0123456789abcdef0123456789";
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

describe("the admin's sign-in code test", () => {
  it("sends a code we make and checks it, keeping only its hash", async () => {
    const sender = new LogSender();
    const ticket = await sendTestCode(sender, "+201001234567", SECRET, NOW);
    const code = sender.sent.get("+201001234567")!;
    expect(code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(ticket)).not.toContain(code);
    expect(ticket.expiresAt).toBe(later(OTP_TEST_TTL_SECONDS).getTime());

    expect(await checkTestCode(sender, ticket, code === "000000" ? "000001" : "000000", SECRET, NOW)).toBe("wrong");
    expect(await checkTestCode(sender, ticket, "abc", SECRET, NOW)).toBe("wrong");
    expect(await checkTestCode(sender, ticket, code, SECRET, NOW)).toBe("right");
    expect(await checkTestCode(sender, ticket, code, SECRET, later(OTP_TEST_TTL_SECONDS))).toBe("expired");
  });

  it("lets WABEK check its own code, and passes on its errors", async () => {
    const checked: string[] = [];
    let reachable = true;
    const wabek: OtpSender = {
      async send() {},
      async verify({ code }) {
        if (!reachable) throw new OtpSendError("WABEK answered HTTP 401.");
        checked.push(code);
        return code === "424242";
      },
    };
    const ticket = await sendTestCode(wabek, "+201001234567", SECRET, NOW);
    expect(ticket.codeHash).toBeNull();
    expect(await checkTestCode(wabek, ticket, "111111", SECRET, NOW)).toBe("wrong");
    expect(await checkTestCode(wabek, ticket, "424242", SECRET, NOW)).toBe("right");
    expect(checked).toEqual(["111111", "424242"]);
    reachable = false;
    await expect(checkTestCode(wabek, ticket, "424242", SECRET, NOW)).rejects.toThrow("WABEK answered HTTP 401.");
  });

  it("reports a send that fails", async () => {
    const down: OtpSender = {
      async send() {
        throw new OtpSendError("WABEK answered HTTP 500.");
      },
    };
    await expect(sendTestCode(down, "+201001234567", SECRET, NOW)).rejects.toThrow("WABEK answered HTTP 500.");
  });
});
