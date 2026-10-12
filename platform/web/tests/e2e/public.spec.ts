import { expect, test } from "@playwright/test";

const PAGES: { path: string; heading: RegExp; footer: boolean }[] = [
  { path: "/", heading: /Your Tutor LMS academy, as a mobile app\./, footer: true },
  { path: "/features", heading: /Everything your students need, in their pocket/, footer: true },
  { path: "/how-it-works", heading: /From website to app stores in four steps/, footer: true },
  { path: "/pricing", heading: /Simple plans for your academy/, footer: true },
  { path: "/faq", heading: /Questions, answered/, footer: true },
  { path: "/contact", heading: /Talk to us/, footer: true },
  { path: "/guides/google-play", heading: /Publish on Google Play/, footer: true },
  { path: "/guides/install-plugin", heading: /Install the plugin/, footer: true },
  { path: "/guides/store-rejection", heading: /The store rejected my app/, footer: true },
  { path: "/terms", heading: /Terms of service/, footer: true },
  { path: "/privacy", heading: /Privacy policy/, footer: true },
  { path: "/refund", heading: /Refund policy/, footer: true },
  { path: "/sign-in", heading: /Sign in/, footer: true },
  { path: "/sign-up", heading: /Create your account/, footer: false },
  { path: "/forgot-password", heading: /Reset your password/, footer: true },
  { path: "/this-page-does-not-exist", heading: /We can't find this page/, footer: true },
];

for (const width of [360, 1280]) {
  test.describe(`public pages at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const page of PAGES) {
      test(`${page.path} renders without horizontal scroll`, async ({ page: tab }) => {
        const response = await tab.goto(page.path);
        expect(response?.status()).toBe(page.path === "/this-page-does-not-exist" ? 404 : 200);
        await expect(tab.getByRole("heading", { level: 1, name: page.heading })).toBeVisible();
        const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        if (page.footer) await expect(tab.getByRole("contentinfo")).toContainText("WEBEK LTD");
      });
    }
  });
}

test("the landing page has the Home link, pricing and the full footer", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Compare plans" })).toHaveAttribute("href", "/pricing");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("company no. 16326894");
  await expect(footer).toContainText("71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ");
  await expect(footer.getByRole("link", { name: "+90 544 673 19 42" })).toHaveAttribute("href", "https://wa.me/905446731942");
  await expect(footer.getByRole("link", { name: "Refund policy" })).toHaveAttribute("href", "/refund");
});

test("every menu link opens its own page", async ({ page }) => {
  const pages = [
    { name: "Features", path: "/features" },
    { name: "How it works", path: "/how-it-works" },
    { name: "Pricing", path: "/pricing" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact", path: "/contact" },
  ];
  for (const target of pages) {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: target.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${target.path}$`));
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: target.name, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
  }
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Compare plans" })).toBeVisible();
});

test("the dashboard needs a signed-in user", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
});
