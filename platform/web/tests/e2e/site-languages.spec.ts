import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { AR_SITE } from "../../src/content/ar/site";
import { TR_SITE } from "../../src/content/tr/site";
import { messagesFor } from "../../src/i18n";

/**
 * 55 The website in Arabic (/ar) and Turkish (/tr): the pages read right to
 * left in Arabic, the language switcher keeps the page and remembers the
 * choice, a client signs up and in from the Arabic pages and lands on the
 * dashboard, and every page names its other languages for search engines.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the other specs' sign-ups and this one stay under the per-IP limits.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.155" } });

const ar = messagesFor("ar");
const suffix = Date.now().toString(36);
const client = { name: "Nour Academy", email: `nour-${suffix}@school.test`, password: "nour-strong-password-1" };

async function langCookie(page: Page) {
  return (await page.context().cookies()).find((c) => c.name === "yallapp_lang")?.value;
}

test("the Arabic home page reads right to left", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(AR_SITE.home!.title!.slice(0, 12));
  await expect(page.getByRole("navigation", { name: ar.nav.main })).toBeVisible();
  // The page doesn't scroll sideways.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the Turkish home page is in Turkish, and English stays without a prefix", async ({ page }) => {
  await page.goto("/tr");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(TR_SITE.home!.title!);

  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  expect(await langCookie(page)).toBeUndefined();
});

test("the switcher keeps the page and remembers the language", async ({ page }) => {
  await page.goto("/pricing");
  await page.locator("[data-language-menu]").click();
  const arabic = page.locator('[data-lang-link="ar"]').first();
  await expect(arabic).toHaveAttribute("hreflang", "ar");
  await expect(arabic).toHaveAttribute("lang", "ar");
  await arabic.click();
  await expect(page).toHaveURL(/\/ar\/pricing$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await langCookie(page)).toBe("ar");

  await page.locator("[data-language-menu]").click();
  await page.locator('[data-lang-link="tr"]').first().click();
  await expect(page).toHaveURL(/\/tr\/pricing$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  expect(await langCookie(page)).toBe("tr");

  // The footer's list does the same.
  await page.getByRole("contentinfo").locator('[data-lang-link="en"]').click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await langCookie(page)).toBe("en");
});

test("an Arabic docs article and a missing page", async ({ page }) => {
  await page.goto("/ar/docs/getting-started");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Getting started/);

  const missing = await page.goto("/ar/no-such-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.notFound.title);

  const english = await page.goto("/no-such-page");
  expect(english?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a client signs up and in from the Arabic pages", async ({ page }) => {
  await page.goto("/ar/sign-up");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByLabel(ar.auth.fullName).fill(client.name);
  await page.getByLabel(ar.auth.email).fill(client.email);
  await page.getByLabel(ar.auth.whatsapp).fill("+20 100 000 0155");
  await page.getByLabel(ar.auth.password, { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: ar.auth.createButton }).click();
  await expect(page).toHaveURL(/\/pending$/);
  expect(await langCookie(page)).toBe("ar");

  // The team activates it, in the admin (English).
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E.languagesAdminEmail);
  await page.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
  await page.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("growth");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await page.context().clearCookies();
  await page.goto("/ar/sign-in");
  await page.getByLabel(ar.auth.email).fill(client.email);
  await page.getByLabel(ar.auth.password, { exact: true }).fill("not-the-password-1");
  await page.getByRole("button", { name: ar.auth.signIn, exact: true }).click();
  await expect(page.getByText(ar.formErrors.wrongPassword)).toBeVisible();

  await page.getByLabel(ar.auth.password, { exact: true }).fill(client.password);
  await page.getByRole("button", { name: ar.auth.signIn, exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  expect(await langCookie(page)).toBe("ar");
});

test("every page names its other languages", async ({ page }) => {
  await page.goto("/tr/pricing");
  const head = page.locator("head");
  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/tr\/pricing$/);
  await expect(head.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/pricing$/);
  await expect(head.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar\/pricing$/);
  await expect(head.locator('link[rel="alternate"][hreflang="tr"]')).toHaveAttribute("href", /\/tr\/pricing$/);
  await expect(head.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/pricing$/);
  await expect(head.locator('meta[property="og:locale"]')).toHaveAttribute("content", "tr_TR");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/docs/getting-started");
  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/docs\/getting-started$/);
  await expect(head.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar\/docs\/getting-started$/);
});

test("the sitemap lists the three languages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toMatch(/<loc>[^<]*\/ar\/pricing<\/loc>/);
  expect(xml).toMatch(/<loc>[^<]*\/tr\/docs\/getting-started<\/loc>/);
  expect(xml).toMatch(/hreflang="ar"/);
  expect(xml).not.toMatch(/\/ar\/dashboard/);
});
