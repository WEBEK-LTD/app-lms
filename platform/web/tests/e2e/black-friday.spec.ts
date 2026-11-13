import { expect, test } from "@playwright/test";

/**
 * 124 Black Friday's page in English, Arabic and Turkish, on a 360 px phone
 * and a wide screen: the offer, the countdown, the code, the plans' switch,
 * the shop window's shelf, everything included, no sideways scroll, and the
 * page complete and still with reduced motion. The e2e server has no saved occasion, so the page shows
 * lib/occasions' Black Friday 2026 (its state follows today's date).
 */

/**
 * How far the page's own content (main) reaches past the window. The site's
 * header is measured by tests/e2e/public.spec.ts (it fits at 1280 px in every
 * language: when Turkish's labels didn't, the page scrolled sideways and moved main with it).
 * What bleeds past the edges on purpose, clipped by its scene (the sale
 * tape, the night sky, the phones at the opening's sides, the shelf that
 * scrolls), is marked `data-bleed` and left out.
 */
const mainOverflow = () => {
  const width = document.documentElement.clientWidth;
  let over = 0;
  for (const el of document.querySelectorAll("main *")) {
    if (el.closest("[data-bleed]")) continue;
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
        // The plans' families switch with their tabs, by click and by keyboard.
        const families = tab.getByRole("tablist").first();
        await families.getByRole("tab").nth(1).click();
        await expect(tab.locator('[data-plan-family="studio"], [data-studio-on-request]').first()).toBeVisible();
        await families.getByRole("tab").nth(1).press("Home");
        await expect(families.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
        await expect(tab.locator('[data-plan-family="regular"]')).toBeVisible();
        // The shop window: every kind on the shelf, which its button moves along in the page's direction.
        const kinds = tab.locator("[data-kind]");
        expect(await kinds.count()).toBeGreaterThanOrEqual(12);
        const shelf = tab.getByRole("region", { name: /Kinds of app|أنواع التطبيقات|Uygulama türleri/ });
        await shelf.scrollIntoViewIfNeeded();
        const before = await shelf.evaluate((el) => el.scrollLeft);
        await tab.locator("[data-shelf-next]").click();
        await expect.poll(async () => Math.abs((await shelf.evaluate((el) => el.scrollLeft)) - before)).toBeGreaterThan(100);
        const moved = await shelf.evaluate((el) => el.scrollLeft);
        expect(page.dir === "rtl" ? moved < before : moved > before).toBe(true);
        // Every part of "everything included" opens to its items.
        const group = tab.locator("[data-included]").first();
        await group.locator("summary").click();
        await expect(group.locator("li").first()).toBeVisible();
        expect(await tab.evaluate(mainOverflow)).toBeLessThanOrEqual(1);
        const ld = await tab.locator('script[type="application/ld+json"]').allTextContents();
        expect(ld.join("")).toContain('"FAQPage"');
      });
    }
  });
}

test.describe("Black Friday with reduced motion", () => {
  test.use({ viewport: { width: 360, height: 780 }, contextOptions: { reducedMotion: "reduce" } });

  test("every scene stands still and complete: nothing pinned, nothing hidden", async ({ page: tab }) => {
    await tab.goto("/ar/black-friday");
    await expect(tab.locator("[data-bf]")).toHaveAttribute("data-motion", "reduced");
    const hidden = await tab.evaluate(() => [...document.querySelectorAll("[data-reveal], [data-print]")].filter((el) => Number(getComputedStyle(el).opacity) < 1 || getComputedStyle(el).clipPath !== "none").length);
    expect(hidden).toBe(0);
    const pinned = await tab.evaluate(() => [...document.querySelectorAll("main *")].filter((el) => getComputedStyle(el).position === "sticky").length);
    expect(pinned).toBe(0);
    expect(await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
