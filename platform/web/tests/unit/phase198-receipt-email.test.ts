import { describe, expect, it } from "vitest";
import { orderReceiptHtml, orderReceiptSubject, orderReceiptText, type OrderReceiptEmailInput } from "@/lib/email/order-receipt-email";

/**
 * 198 The owner: the customer's receipt email premium, by day and by night,
 * with the business's logo, and no link: the attached PDF is the receipt.
 */
const base: OrderReceiptEmailInput = {
  lang: "en",
  shopName: "Rose Hour",
  logoUrl: "https://yallapp.com.tr/api/v1/assets/logo-1",
  brand: "#8E2B4E",
  customerName: "Sara Ali",
  orderNumber: "1024",
  date: "18 November 2026",
  total: "MAD 610.00",
  lines: ["Red roses in a black box × 1: MAD 600.00", "Delivery fee: MAD 10.00"],
  note: null,
};

describe("198 the order receipt email", () => {
  it("has the business's logo, says it has a light and a dark look, and has dark colours", () => {
    const html = orderReceiptHtml(base);
    expect(html).toContain('<img src="https://yallapp.com.tr/api/v1/assets/logo-1"');
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain('<meta name="supported-color-schemes" content="light dark">');
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain("[data-ogsc]");
    // The business's colour as the accent.
    expect(html).toContain("background:#8E2B4E");
  });

  it("without a logo, the business's name in its colour", () => {
    const html = orderReceiptHtml({ ...base, logoUrl: null });
    expect(html).not.toContain("<img");
    expect(html).toMatch(/class="ylp-brand"[^>]*color:#8E2B4E[^>]*>Rose Hour</);
  });

  it("has the order, its lines, total and date, and no link at all", () => {
    const html = orderReceiptHtml(base);
    for (const words of ["#1024", "Red roses in a black box × 1", "MAD 600.00", "Delivery fee", "MAD 610.00", "18 November 2026", "Sara Ali", "attached to this email as a PDF"]) expect(html).toContain(words);
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("/receipts/");
    const text = orderReceiptText(base);
    expect(text).toContain("Total: MAD 610.00");
    expect(text).not.toMatch(/https?:\/\//);
    expect(orderReceiptSubject("en", "Rose Hour", "1024")).toBe("Your receipt from Rose Hour · order 1024");
  });

  it("in Arabic it reads right to left, in Arabic words", () => {
    const html = orderReceiptHtml({ ...base, lang: "ar" });
    expect(html).toContain('<html lang="ar" dir="rtl"');
    expect(html).toContain("شكرًا لطلبك");
    expect(html).toContain("الإجمالي");
    expect(orderReceiptSubject("ar", "Rose Hour", "1024")).toContain("إيصالك");
    expect(orderReceiptText({ ...base, lang: "tr" })).toContain("Toplam: MAD 610.00");
  });

  it("escapes what the business and the customer typed", () => {
    const html = orderReceiptHtml({ ...base, shopName: "A&B <Flowers>", customerName: '"><script>x</script>', logoUrl: null });
    expect(html).toContain("A&amp;B &lt;Flowers&gt;");
    expect(html).not.toContain("<script>x");
  });

  it("an unknown colour falls back to the platform's", () => {
    expect(orderReceiptHtml({ ...base, brand: "red" })).toContain("background:#5B3FD6");
  });
});
