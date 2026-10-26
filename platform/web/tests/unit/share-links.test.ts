import { describe, expect, it } from "vitest";
import { CAMPAIGN_NAME, shareLinks } from "@/app/dashboard/analytics/sources";

const APP = "11111111-2222-4333-8444-555555555555";

describe("86.2 the app's link and QR code to share", () => {
  it("opens the app's home page, the QR code saying it came from one, with the campaign", () => {
    const hosted = { id: APP, backend: "hosted" as const, siteUrl: null };
    expect(shareLinks(hosted, "https://yallapp.com.tr", null)).toEqual({
      link: `https://yallapp.com.tr/a/${APP}/page/home`,
      qr: `https://yallapp.com.tr/a/${APP}/page/home?utm_medium=qr`,
    });
    expect(shareLinks(hosted, "https://yallapp.com.tr/", "menu-2026")).toEqual({
      link: `https://yallapp.com.tr/a/${APP}/page/home?utm_campaign=menu-2026`,
      qr: `https://yallapp.com.tr/a/${APP}/page/home?utm_medium=qr&utm_campaign=menu-2026`,
    });
    // A WordPress app: on the website's own links.
    expect(shareLinks({ id: APP, backend: "wordpress", siteUrl: "https://academy.test/school" }, "https://yallapp.com.tr", "x").link).toBe("https://academy.test/school/a/page/home?utm_campaign=x");
  });

  it("takes the names the contract takes", () => {
    for (const ok of ["summer-sale", "menu.2026", "a", "x_1"]) expect(CAMPAIGN_NAME.test(ok)).toBe(true);
    for (const bad of ["Summer", "-sale", "summer sale", "a".repeat(41), ""]) expect(CAMPAIGN_NAME.test(bad)).toBe(false);
  });
});
