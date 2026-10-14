import { expect, test } from "@playwright/test";
import { DOCS } from "../../src/content/docs";

const PAGES: { path: string; heading: RegExp; footer: boolean }[] = [
  { path: "/", heading: /Your business, as your own mobile app\./, footer: true },
  { path: "/solutions", heading: /An app for the way your business works/, footer: true },
  { path: "/solutions/academy", heading: /Your academy, in your students' pockets/, footer: true },
  { path: "/solutions/store", heading: /Your shop, one tap away/, footer: true },
  { path: "/solutions/bookings", heading: /Appointments, booked in your own app/, footer: true },
  { path: "/solutions/real-estate", heading: /Your listings, with search, favorites and messages/, footer: true },
  { path: "/features", heading: /Everything your app needs, built in/, footer: true },
  { path: "/integrations", heading: /Your content, from wherever it lives/, footer: true },
  { path: "/how-it-works", heading: /From sign-up to the app stores in five steps/, footer: true },
  { path: "/pricing", heading: /A plan for every app/, footer: true },
  { path: "/faq", heading: /Questions, answered/, footer: true },
  { path: "/contact", heading: /Talk to us/, footer: true },
  { path: "/docs", heading: /Yallapp documentation/, footer: true },
  { path: "/docs/getting-started", heading: /Welcome to Yallapp/, footer: true },
  { path: "/docs/google-play", heading: /Publish on Google Play/, footer: true },
  { path: "/docs/push-notifications", heading: /Push notifications with Firebase/, footer: true },
  { path: "/docs/shopify", heading: /Connect Shopify/, footer: true },
  { path: "/docs/my-own-api", heading: /Connect your own API/, footer: true },
  { path: "/docs/store-rejections", heading: /If the store rejects your app/, footer: true },
  { path: "/developers", heading: /The Yallapp API reference/, footer: true },
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
  await expect(footer.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/docs");
});

test("every menu link opens its own page", async ({ page }) => {
  const pages = [
    { name: "Solutions", path: "/solutions" },
    { name: "Features", path: "/features" },
    { name: "Integrations", path: "/integrations" },
    { name: "How it works", path: "/how-it-works" },
    { name: "Pricing", path: "/pricing" },
    { name: "Docs", path: "/docs" },
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

test("the home page shows the app types, the screens and the comparison", async ({ page }) => {
  await page.goto("/");
  // Every app type links to its own page.
  for (const [name, path] of [
    ["Academy apps", "/solutions/academy"],
    ["Store apps", "/solutions/store"],
    ["Bookings apps", "/solutions/bookings"],
    ["Real estate apps", "/solutions/real-estate"],
  ] as const) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveAttribute("href", path);
  }
  await expect(page.getByRole("table", { name: "A typical app builder compared with Yallapp" })).toBeVisible();
  // App screenshots and dashboard screenshots load.
  for (const alt of ["An academy app's home screen with courses", "The pages and look editor in the Yallapp dashboard"]) {
    const image = page.getByRole("img", { name: alt }).first();
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.getByRole("link", { name: "All integrations" }).click();
  await expect(page).toHaveURL(/\/integrations$/);
  await expect(page.getByRole("heading", { name: "SimplyBook.me" })).toBeVisible();
  await page.getByRole("link", { name: "How to connect Shopify" }).click();
  await expect(page).toHaveURL(/\/docs\/shopify$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connect Shopify" })).toBeVisible();
});

test("the documentation's menu finds and opens articles", async ({ page }) => {
  await page.goto("/docs");
  const menu = page.getByRole("navigation", { name: "Documentation" });
  await menu.getByRole("searchbox").fill("firebase");
  await expect(menu.getByRole("link", { name: "Push notifications with Firebase" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Connect Shopify" })).toHaveCount(0);
  await menu.getByRole("link", { name: "Push notifications with Firebase" }).click();
  await expect(page).toHaveURL(/\/docs\/push-notifications$/);
  await expect(page.getByRole("heading", { level: 1, name: "Push notifications with Firebase" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name: "Push notifications with Firebase" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Headings can be linked to.
  await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Connect Apple push notifications" }).click();
  await expect(page).toHaveURL(/#connect-apple-push-notifications$/);
  // Next article.
  await page.getByRole("link", { name: /^Next: / }).click();
  await expect(page).toHaveURL(/\/docs\/app-users$/);

  // The developer guide links to the reference, which lists the endpoints.
  await page.goto("/docs/my-own-api");
  await expect(page.locator("pre").first()).toContainText("/config?platform=android");
  await page.getByRole("link", { name: "API reference" }).first().click();
  await expect(page).toHaveURL(/\/developers$/);
  await expect(page.getByText("/auth/otp/verify", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download openapi.yaml" })).toHaveAttribute("href", "/developers/openapi.yaml");
});

test("every documentation article fits a 360 px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const article of DOCS) {
    const response = await page.goto(`/docs/${article.slug}`);
    expect(response?.status(), article.slug).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(article.title);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, article.slug).toBeLessThanOrEqual(0);
  }
});

test("the documentation's menu folds away on phones", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/docs/setup-steps");
  const menu = page.getByRole("navigation", { name: "Documentation" });
  await expect(menu.getByRole("link", { name: "Connect Shopify" })).toBeHidden();
  await menu.getByRole("button", { name: "Browse the documentation" }).click();
  await menu.getByRole("link", { name: "Connect Shopify" }).click();
  await expect(page).toHaveURL(/\/docs\/shopify$/);
});

test("the old guide addresses open their documentation article", async ({ page }) => {
  for (const [guide, article] of [
    ["/guides", "/docs"],
    ["/guides/google-play", "/docs/google-play"],
    ["/guides/install-plugin", "/docs/wordpress-plugin"],
    ["/guides/custom-api", "/docs/my-own-api"],
    ["/guides/push-notifications", "/docs/push-notifications"],
    ["/guides/store-rejection", "/docs/store-rejections"],
  ]) {
    await page.goto(guide!);
    await expect(page).toHaveURL(new RegExp(`${article}$`));
  }
});

test("a business signs up without a website", async ({ browser }) => {
  // Sign-ups are limited per address; this one has its own.
  const page = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.88" } });
  await page.goto("/sign-up");
  await expect(page.getByText("Apps can also come from Shopify and other platforms, or from no website at all.")).toBeVisible();
  await page.getByLabel("Full name").fill("Nora Bloom");
  await page.getByLabel("Email").fill(`nora-${Date.now().toString(36)}@bloom.test`);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 88");
  await page.getByLabel("Your website (optional)").fill("not a website");
  await page.getByLabel("Password", { exact: true }).fill("nora-strong-password-1");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a full address, e.g. https://your-site.com, or leave it empty.")).toBeVisible();

  await page.getByLabel("Your website (optional)").fill("");
  await page.getByLabel("Password", { exact: true }).fill("nora-strong-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);
  await page.close();
});

test("the dashboard needs a signed-in user", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
});
