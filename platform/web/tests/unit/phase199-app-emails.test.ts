import { describe, expect, it } from "vitest";
import { appCodeEmail, appWelcomeEmail, type AppBrand } from "@/lib/email/app-user-emails";

/**
 * 199 The owner: the emails an app sends its users (the welcome, the code to
 * sign in or set a new password) premium like the receipt, with the app's
 * logo and name, never Yallapp's.
 */
const brand: AppBrand = { lang: "en", appName: "Rose Hour", logoUrl: "https://yallapp.com.tr/api/v1/assets/logo-1", brand: "#8E2B4E" };

describe("199 the app's emails to its users", () => {
  it("the code: large in the HTML and in the text, with its expiry, the app's logo and name, light and dark", () => {
    const email = appCodeEmail(brand, { code: "482913", minutes: 5 });
    expect(email.subject).toBe("482913 is your Rose Hour code");
    expect(email.html).toMatch(/class="ylp-code"[^>]*font-size:34px[^>]*letter-spacing:8px[^>]*>482913</);
    expect(email.text).toContain("482913");
    expect(email.text).toContain("It expires in 5 minutes");
    expect(email.html).toContain('<img src="https://yallapp.com.tr/api/v1/assets/logo-1"');
    expect(email.html).toContain("Sent by Rose Hour");
    expect(email.html).toContain('<meta name="color-scheme" content="light dark">');
    expect(email.html).toContain("@media (prefers-color-scheme: dark)");
  });

  it("a reset code says so", () => {
    const email = appCodeEmail(brand, { code: "111222", minutes: 5, purpose: "reset" });
    expect(email.html).toContain("Reset your password");
    expect(email.text).toContain("choose a new password");
  });

  it("the welcome: the app's name and logo, the customer's name, no link", () => {
    const email = appWelcomeEmail(brand, { name: "Sara" });
    expect(email.subject).toBe("Welcome to Rose Hour");
    expect(email.html).toContain("Hi Sara,");
    expect(email.html).toContain('<img src="https://yallapp.com.tr/api/v1/assets/logo-1"');
    expect(email.html).not.toContain("<a ");
    expect(email.text).toContain("Thank you for joining Rose Hour");
  });

  it("in Arabic right to left, in Turkish in Turkish; without a logo, the app's name in its colour", () => {
    const ar = appCodeEmail({ ...brand, lang: "ar" }, { code: "482913", minutes: 5 });
    expect(ar.html).toContain('<html lang="ar" dir="rtl"');
    expect(ar.html).toContain('dir="ltr"');
    expect(ar.text).toContain("تنتهي صلاحيته خلال 5 دقائق");
    expect(appWelcomeEmail({ ...brand, lang: "ar" }, { name: "سارة" }).html).toContain("مرحبًا بك في Rose Hour");
    expect(appWelcomeEmail({ ...brand, lang: "tr" }, { name: "Elif" }).subject).toContain("hoş geldiniz");
    const plain = appWelcomeEmail({ ...brand, logoUrl: null }, { name: "Sara" }).html;
    expect(plain).not.toContain("<img");
    expect(plain).toMatch(/class="ylp-brand"[^>]*color:#8E2B4E[^>]*>Rose Hour</);
  });
});
