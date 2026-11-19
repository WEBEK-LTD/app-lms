import { describe, expect, it } from "vitest";
import { awaitingPaymentHtml, awaitingPaymentSubject, awaitingPaymentText, bankTransferName, type AwaitingPaymentEmailInput } from "@/lib/email/order-awaiting-payment-email";

/**
 * 200 The owner: the "how to pay" email (bank transfer, cash on delivery)
 * was plain text; it is now in the receipt's premium look.
 */
const base: AwaitingPaymentEmailInput = {
  lang: "en",
  shopName: "Rose Hour",
  logoUrl: "https://yallapp.com.tr/api/v1/assets/logo-1",
  brand: "#8E2B4E",
  customerName: "Sara Ali",
  orderNumber: "1024",
  method: "Bank transfer",
  instructions: "Rose Hour Ltd\nIBAN TR00 0000 0000 0000 0000 0000 00",
  dueDate: "22 November 2026",
  total: "MAD 610.00",
  lines: ["Red roses in a black box × 1: MAD 600.00", "Delivery fee: MAD 10.00"],
};

describe("200 the how-to-pay email", () => {
  it("is in the receipt's look: the logo, light and dark, the business's colour", () => {
    const html = awaitingPaymentHtml(base);
    expect(html).toContain('<img src="https://yallapp.com.tr/api/v1/assets/logo-1"');
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain("[data-ogsc]");
    expect(html).toContain("background:#8E2B4E");
    expect(html).toContain("Sent by Rose Hour");
  });

  it("has the order, its lines and total, the amount by its day and the business's details", () => {
    const html = awaitingPaymentHtml(base);
    expect(html).toContain("#1024");
    expect(html).toContain("Red roses in a black box × 1");
    expect(html).toContain("MAD 600.00");
    expect(html).toContain("MAD 610.00");
    expect(html).toContain("Please pay MAD 610.00 by 22 November 2026:");
    expect(html).toContain("Rose Hour Ltd<br>IBAN TR00 0000 0000 0000 0000 0000 00");
    expect(html).toContain("Give the order number 1024 with your payment.");
    expect(html).not.toMatch(/href=/);
  });

  it("keeps the subject and the details in the text part", () => {
    expect(awaitingPaymentSubject("en", "Rose Hour", "1024")).toBe("Your order 1024 from Rose Hour: how to pay");
    const text = awaitingPaymentText(base);
    expect(text).toContain("You chose to pay by Bank transfer.");
    expect(text).toContain("IBAN TR00 0000 0000 0000 0000 0000 00");
    expect(text).toContain("Total: MAD 610.00");
  });

  it("in Arabic, right to left, and bank transfer in its words", () => {
    const html = awaitingPaymentHtml({ ...base, lang: "ar", method: bankTransferName("ar") });
    expect(html).toContain('<html lang="ar" dir="rtl"');
    expect(html).toContain("بانتظار الدفع");
    expect(html).toContain("التحويل البنكي");
    expect(awaitingPaymentSubject("tr", "Rose Hour", "1024")).toContain("nasıl ödenir");
  });

  it("escapes what the business wrote", () => {
    const html = awaitingPaymentHtml({ ...base, instructions: "<script>x</script>" });
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;script&gt;");
  });
});
