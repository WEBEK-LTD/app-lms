import { expect, test } from "@playwright/test";

/**
 * 124 Black Friday's page in English, Arabic and Turkish, on a 360 px phone
 * and a wide screen: the offer, the countdown, the code, the tabs, and no
 * sideways scroll. The e2e server has no saved occasion, so the page shows
 * lib/occasions' Black Friday 2026 (its state follows today's date).
 */

/**
 * How far the page's own content (main) reaches past the window. The site's
 * header is measured by tests/e2e/public.spec.ts: in Turkish at 1280 px its
 * longer labels already pass the edge on every page, the pricing page too.
 */
const mainOverflow = () => {
  const width = document.documentElement.clientWidth;
  let over = 0;
  for (const el of document.querySelectorAll("main *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    over = Math.max(over, r.right - width, -r.left);
  }
  return over;
};

const PAGES = [
  { path: "/black-friday", lang: "en", dir: "ltr", title: /Black Friday/ },
  { path: "/ar/black-friday", lang: "ar", dir: "rtl", title: /الجمعة البيضاء/ },
  { path: "/tr/black-friday", lang: "tr", dir: "ltr", title: /Kara Cuma/ },
] as const;

for (const width of [360, 1280]) {
  test.describe(`Black Friday at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const page of PAGES) {
      test(`${page.path} renders in its language without horizontal scroll`, async ({ page: tab }) => {
        const response = await tab.goto(page.path);
        expect(response?.status()).toBe(200);
        await expect(tab.locator("html")).toHaveAttribute("lang", page.lang);
        await expect(tab.locator("html")).toHaveAttribute("dir", page.dir);
        const h1 = tab.getByRole("heading", { level: 1 });
        await expect(h1).toHaveCount(1);
        await expect(h1).toContainText(page.title);
        const state = await tab.locator("[data-occasion-state]").getAttribute("data-occasion-state");
        if (state === "live" || state === "upcoming") {
          await expect(tab.getByRole("timer")).toBeVisible();
          await expect(tab.locator("[data-coupon-code]").first()).toContainText("BLACKFRIDAY50");
        } else {
          await expect(tab.getByRole("timer")).toHaveCount(0);
        }
        if (width === 360) {
          const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow).toBeLessThanOrEqual(0);
        }
        expect(await tab.evaluate(mainOverflow)).toBeLessThanOrEqual(1);
        // The plans' families and the kinds of app switch with their tabs.
        const families = tab.getByRole("tablist").first();
        await families.getByRole("tab").nth(1).click();
        await expect(tab.locator('[data-plan-family="studio"], [data-studio-on-request]').first()).toBeVisible();
        const kinds = tab.getByRole("tablist").nth(1);
        await kinds.getByRole("tab").nth(2).click();
        await expect(kinds.getByRole("tab").nth(2)).toHaveAttribute("aria-selected", "true");
        await expect(tab.locator("[data-kind]:visible")).toHaveCount(1);
        expect(await tab.evaluate(mainOverflow)).toBeLessThanOrEqual(1);
        const ld = await tab.locator('script[type="application/ld+json"]').allTextContents();
        expect(ld.join("")).toContain('"FAQPage"');
      });
    }
  });
}
