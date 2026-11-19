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

import { dressMail, needsDressing, yallappBrand } from "@/lib/email/premium-mail";
import { emailTemplate, renderTemplate } from "@/lib/email/templates";

/** 200 The owner: every email that goes out is premium. */
describe("200 every email premium", () => {
  const app = { name: "Rose Hour", logoUrl: "https://yallapp.com.tr/api/v1/assets/logo-1", colour: "#8E2B4E" };

  it("dresses a template's plain words in the app's look, the subject as the heading", () => {
    const rendered = renderTemplate(emailTemplate("order_shipped")!, {
      org_name: "Rose Hour",
      customer_name: "Sara Ali",
      order_number: "1024",
      tracking_lines: "Carrier: Aras Kargo\nFollow it: https://track.example/1024",
    });
    expect(needsDressing(rendered.html)).toBe(true);
    const mail = dressMail({ to: "sara@example.test", ...rendered }, app);
    expect(needsDressing(mail.html)).toBe(false);
    expect(mail.html).toContain('<img src="https://yallapp.com.tr/api/v1/assets/logo-1"');
    expect(mail.html).toContain("@media (prefers-color-scheme: dark)");
    expect(mail.html).toContain("background:#8E2B4E");
    expect(mail.html).toMatch(/<h1[^>]*>Your order 1024 from Rose Hour was shipped<\/h1>/);
    expect(mail.html).toContain("Dear Sara Ali,");
    // An address in the words becomes a link in the app's colour.
    expect(mail.html).toMatch(/<a href="https:\/\/track\.example\/1024" class="ylp-link" style="color:#8E2B4E/);
    expect(mail.html).toContain("Sent by Rose Hour");
    // The words and the subject are the template's.
    expect(mail.subject).toBe(rendered.subject);
    expect(mail.text).toBe(rendered.text);
  });

  it("a link alone on its line is a button", () => {
    const mail = dressMail({ subject: "Set a new password", text: "Hello,\n\nhttps://yallapp.com.tr/reset/abc\n\nThanks" }, yallappBrand("https://yallapp.com.tr"));
    expect(mail.html).toMatch(/<a href="https:\/\/yallapp\.com\.tr\/reset\/abc" style="display:inline-block[^"]*color:#FFFFFF[^>]*>Open the link<\/a>/);
    // Yallapp's own wide logo, and its reversed one for dark mode.
    expect(mail.html).toContain('src="https://yallapp.com.tr/email/yallapp-logo.png"');
    expect(mail.html).toContain('src="https://yallapp.com.tr/email/yallapp-logo-reversed.png"');
  });

  it("keeps a template's Arabic, right to left", () => {
    const rendered = renderTemplate({ subject: "مرحبا", body: "عزيزي سارة،\n\nشكرا" }, {}, "ar");
    const mail = dressMail({ ...rendered }, app);
    expect(mail.html).toContain('<html lang="ar" dir="rtl"');
    expect(mail.html).toContain("أُرسل من Rose Hour");
  });

  it("leaves an email with its own design as it is, and escapes text-only words", () => {
    const own = { subject: "Receipt", text: "x", html: '<!doctype html><html><body class="ylp-page">own</body></html>' };
    expect(dressMail(own, app)).toBe(own);
    const mail = dressMail({ subject: "Hi", text: "<script>alert(1)</script>" }, app);
    expect(mail.html).not.toContain("<script>alert");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("keeps a template's own link, in the brand's colour, without nesting it", () => {
    const mail = dressMail({ subject: "S", text: "t", html: '<html><body data-ylp-plain>See <a href="https://a.example/x">https://a.example/x</a> now</body></html>' }, app);
    expect(mail.html).toContain('<a class="ylp-link" style="color:#8E2B4E');
    expect(mail.html).not.toMatch(/<a [^>]*>[^<]*<a /);
  });
});
