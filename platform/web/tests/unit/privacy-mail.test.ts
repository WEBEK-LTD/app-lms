import { describe, expect, it } from "vitest";
import { PRIVACY } from "@/content/legal";
import { AR_LEGAL } from "@/content/ar/legal";
import { TR_LEGAL } from "@/content/tr/legal";
import { MAIL_HISTORY_MONTHS } from "@/lib/mailing/types";

/**
 * 114 The privacy policy says what the email campaigns do (lib/mailing), in
 * English, Arabic and Turkish: who gets them, the open picture and the click
 * redirect, what is kept and for how long (MAIL_HISTORY_MONTHS, the daily job
 * deletes the rest), how to stop, account emails still coming, and refused
 * addresses kept out.
 */
const section = (body: string, heading: string) => {
  const start = body.indexOf(heading);
  expect(start, heading).toBeGreaterThan(-1);
  const end = body.indexOf("\n## ", start + 1);
  return body.slice(start, end === -1 ? undefined : end);
};

describe("114 the privacy policy's emails from Yallapp", () => {
  it("has the section in every language, after the legal basis and before the sharing", () => {
    const pages = [
      { body: PRIVACY.body, heading: "## 5. Emails from Yallapp", next: "## 6. Who we share it with" },
      { body: AR_LEGAL.privacy!.body, heading: "## 5. رسائل Yallapp البريدية", next: "## 6. مع من نشاركها" },
      { body: TR_LEGAL.privacy!.body, heading: "## 5. Yallapp'ten e-postalar", next: "## 6. Kimlerle paylaşıyoruz" },
    ];
    for (const p of pages) {
      expect(p.body.indexOf(p.heading)).toBeLessThan(p.body.indexOf(p.next));
      expect(p.body).toContain("## 12. ");
    }
  });

  it("says what the code does, in English", () => {
    const s = section(PRIVACY.body, "## 5. Emails from Yallapp");
    expect(MAIL_HISTORY_MONTHS).toBe(12);
    for (const words of ["owners of Yallapp accounts", "team members", "small image", "Yallapp address", "the time, the email it was and your address", "12 months", "refuses an address", "unsubscribe link", "unsubscribe button", "Dashboard › Your account", "still come"]) {
      expect(s, words).toContain(words);
    }
    expect(PRIVACY.updated).toBe("4 November 2026");
    expect(section(PRIVACY.body, "## 8. How long we keep it")).toContain("12 months");
  });

  it("says it in Arabic and Turkish too", () => {
    const ar = section(AR_LEGAL.privacy!.body, "## 5. رسائل Yallapp البريدية");
    for (const words of ["أصحاب حسابات Yallapp", "أعضاء في فريقه", "صورة صغيرة", "12 شهرًا", "يرفض خادم البريد", "رابط إلغاء الاشتراك", "لوحة التحكم › حسابك", "ستظل تصلك"]) expect(ar, words).toContain(words);
    const tr = section(TR_LEGAL.privacy!.body, "## 5. Yallapp'ten e-postalar");
    for (const words of ["Yallapp hesaplarının sahiplerine", "ekip üyesi", "küçük bir görsel", "12 ay", "reddettiğinde", "abonelikten çıkma bağlantısını", "Panel › Hesabınız", "gelmeye devam eder"]) expect(tr, words).toContain(words);
    expect(AR_LEGAL.privacy!.updated).toBe("4 نوفمبر 2026");
    expect(TR_LEGAL.privacy!.updated).toBe("4 Kasım 2026");
  });
});
