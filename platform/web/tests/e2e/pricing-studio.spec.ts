import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";

/**
 * Roadmap 146: the pricing page shows the app and Studio side by side. The
 * team prices a Studio plan in Admin › Plans by the month, with 1 year, 2
 * years and lifetime typed, 3 years kept at its suggested price and 6 months
 * switched off, and a regular plan by the year (prices the test types, as
 * the owner would: none of them is Yallapp's). A visitor sees the two
 * products at the top, one billing period for both (lifetime among them),
 * Studio's cards with the price per month and the saving like the regular
 * ones, both explained with real screens, how they differ, and every
 * feature of the app's plans in a fold; the addresses other pages link to
 * still land. A Studio project pays its plan for 2 years on (a fake)
 * Kashier. The team puts everything back at the end.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.146", "x-country": "EG" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Sahel Parcels", email: `sahel-${suffix}@studio.test`, password: "sahel-parcels-strong-password-1" };
const STUDIO = "studio_2";
/** Screens for the owner, desktop and phone, light and dark, English and Arabic: only when PRICING_SHOTS_DIR is set. */
const SHOTS = process.env.PRICING_SHOTS_DIR;
let kashier: FakeGateway;
let admin: Page;
let own: Page;

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.pricingAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await admin.close();
  await own?.close();
  await kashier.close();
});

const visitor = (browser: Browser) => browser.newPage({ extraHTTPHeaders });

test("the team prices a Studio plan for every period, and a regular plan by the year", async () => {
  await admin.goto("/admin/settings/payments");
  const k = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  await k.getByLabel("Merchant ID").fill("MID-1460-146");
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("kashier-test-secret");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Kashier account saved.")).toBeVisible();

  // A Studio plan: Admin › Plans › Yallapp Studio has the regular plans' periods.
  await admin.goto(`/admin/plans?family=studio&plan=${STUDIO}`);
  const plan = admin.locator(`section[aria-labelledby="h-${STUDIO}"]`);
  await plan.getByLabel("Name", { exact: true }).first().fill("Studio Pro");
  await plan.getByLabel("Tagline", { exact: true }).first().fill("Design freely, sell everywhere");
  await plan.getByLabel("A price").check();
  await plan.getByLabel("Price in EGP").fill("600");
  // Studio's plans are billed by the month unless the team chooses otherwise.
  await expect(plan.getByLabel("Billed")).toHaveValue("1");
  await plan.getByLabel("Offer 6 months").uncheck();
  for (const [period, price] of [
    ["1 year", "6000"],
    ["2 years", "10800"],
    ["lifetime", "18000"],
  ] as const) {
    await plan.getByLabel(`Offer ${period}`).check();
    await plan.getByLabel(`EGP for ${period}`, { exact: true }).fill(price);
  }
  // 3 years starts on its suggestion, 3 years of the yearly price × 0.75, kept as the team's when saved.
  await expect(plan.getByLabel("EGP for 3 years", { exact: true })).toHaveValue("13500.00");
  await expect(plan.locator('[data-period-status="24"]')).toHaveText(/^EGP\s450 a month · saves 25% against 1 month$/);
  await plan.getByLabel("Offered").check();
  await plan.getByRole("button", { name: "Save plan" }).click();
  await expect(plan.getByText("Studio Pro saved and offered. Studio projects can choose it now.")).toBeVisible();
  await admin.reload();
  await expect(admin.locator(`[data-studio-plan="${STUDIO}"]`)).toContainText("1 month · 1 year · 2 years · 3 years · Lifetime");
  await expect(admin.locator(`[data-studio-plan="${STUDIO}"]`)).not.toContainText("6 months");

  // A regular plan priced by the year: its other periods at their suggested prices.
  await admin.goto("/admin/plans?plan=pro");
  const pro = admin.getByRole("region", { name: "Pro", exact: true });
  await pro.getByLabel("A price").check();
  await pro.getByLabel("Price in EGP").fill("4800");
  await pro.getByLabel("Billed").selectOption("12");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(admin.getByText("Pro saved. The pricing page shows it now.")).toBeVisible();
});

test("the two products side by side, and one period for both: Studio's cards with every period, the price per month and the saving", async ({ browser }) => {
  const page = await visitor(browser);
  await page.goto("/pricing");
  // The two at the top, alike: who each is for, a real screen and its "from" price.
  const products = page.locator("[data-products]");
  await expect(products.locator("[data-product]")).toHaveCount(2);
  const app = products.locator('[data-product="regular"]');
  const studio = products.locator('[data-product="studio"]');
  await expect(app.getByRole("heading", { level: 2, name: "Yallapp app" })).toBeVisible();
  await expect(app).toContainText("Your website or store, turned into an app.");
  await expect(studio.getByRole("heading", { level: 2, name: "Yallapp Studio" })).toBeVisible();
  await expect(studio).toContainText("Design your app freely and run everything from Yallapp.");
  await expect(app.locator('img[src*="store-home"]')).toBeVisible();
  await expect(studio.locator('img[src*="food-delivery-sig-a-home-dark"]')).toBeVisible();
  for (const product of [app, studio]) await expect(product.locator("[data-from-price]")).toContainText(/From\s*EGP\s[\d,]+/);
  // Side by side on a computer, the same size.
  const [a, b] = [(await app.boundingBox())!, (await studio.boundingBox())!];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(Math.abs(a.width - b.width)).toBeLessThan(2);
  await studio.getByRole("link", { name: "See the plans" }).click();
  await expect(page).toHaveURL(/#studio$/);
  await expect(page.locator("#studio")).toBeInViewport();

  // One picker for both, lifetime among its choices.
  const tabs = page.locator("[data-period-bar] [data-period-tabs]");
  for (const key of ["1", "12", "24", "36", "lifetime"]) await expect(tabs.locator(`[data-period="${key}"]`)).toHaveCount(1);
  await expect(page.locator("[data-period-tabs]")).toHaveCount(1);
  await tabs.locator('[data-period="12"]').click();
  await expect(page).toHaveURL(/\/pricing\?period=12#plans$/);
  await expect(tabs.locator('[data-period="12"]')).toHaveAttribute("aria-current", "true");
  const studioCard = page.locator(`#studio [data-studio-plans] [data-plan="${STUDIO}"]`);
  const proCard = page.locator('#regular [data-pricing-plans] [data-plan="pro"]');
  await expect(studioCard).toContainText(/EGP\s6,000\s*\/ year/);
  await expect(studioCard.locator("[data-per-month]")).toContainText(/EGP\s500 a month/);
  await expect(studioCard.locator("[data-per-month]")).toContainText("Save 16%");
  await expect(proCard).toContainText(/EGP\s4,800\s*\/ year/);
  await expect(studio.locator("[data-from-price]")).toContainText(/\/ year/);

  await page.goto("/pricing?period=24");
  await expect(studioCard).toContainText(/EGP\s10,800\s*\/ 2 years/);
  await expect(studioCard.locator("[data-per-month]")).toContainText(/EGP\s450 a month/);
  await expect(studioCard.locator("[data-per-month]")).toContainText("Save 25%");
  // Pro's 2 years at its suggested price (a year × 1.7, to EGP 50).
  await expect(proCard).toContainText(/EGP\s8,150\s*\/ 2 years/);
  await page.goto("/pricing?period=36");
  await expect(studioCard).toContainText(/EGP\s13,500\s*\/ 3 years/);
  // 6 months is switched off for Studio Pro: its own price, and why; Pro has it.
  await page.goto("/pricing?period=6");
  await expect(studioCard).toContainText(/EGP\s600\s*\/ month/);
  await expect(studioCard.locator("[data-not-in-period]")).toHaveText("Not sold for this period");
  await expect(proCard).toContainText(/EGP\s2,700\s*\/ 6 months/);

  // Lifetime: a choice of the same picker, on both products' cards, with what it covers.
  const lifetime = page.locator("#lifetime-offer #lifetime");
  await expect(lifetime.getByRole("heading", { name: "Pay once, yours for life" })).toBeVisible();
  await expect(lifetime.locator('[data-lifetime-from="studio"]')).toContainText(/EGP\s18,000/);
  await expect(lifetime.locator('[data-lifetime-from="regular"]')).toContainText(/EGP\s19,200/);
  await expect(lifetime.locator("[data-lifetime-note]")).toHaveCount(0);
  await lifetime.getByRole("link", { name: "See lifetime prices" }).click();
  await expect(page).toHaveURL(/\/pricing\?period=lifetime#plans$/);
  await expect(studioCard).toContainText(/EGP\s18,000\s*\/ once/);
  await expect(proCard).toContainText(/EGP\s19,200\s*\/ once/);
  await expect(lifetime.locator("[data-lifetime-note]")).toContainText("What lifetime covers");

  // In Arabic, right to left.
  await page.goto("/ar/pricing?period=24");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator('[data-product="regular"]').getByRole("heading", { level: 2 })).toHaveText("تطبيق Yallapp");
  await expect(page.locator(`#studio [data-plan="${STUDIO}"] [data-per-month]`)).toContainText("وفّر 25%");
  await expect(page.locator('[data-period-tabs] [data-period="lifetime"]')).toHaveText(/مدى الحياة$/);
  await page.close();
});

test("each product explained with real screens, how they differ, and every feature in a fold; the addresses still land", async ({ browser }) => {
  const page = await visitor(browser);
  await page.goto("/pricing");
  for (const [product, screens] of [
    ["regular", ["academy-home", "restaurant-menu", "bookings-services"]],
    ["studio", ["taxi-sig-a-home-dark", "school-sig-b-home", "flowers-sig-b-home-dark"]],
  ] as const) {
    const detail = page.locator(`#about-${product}[data-product-detail="${product}"]`);
    for (const screen of screens) await expect(detail.locator(`img[src*="${screen}"]`)).toBeVisible();
    await expect(detail.getByRole("heading", { level: 4, name: "What you get" })).toBeVisible();
    await expect(detail.getByRole("heading", { level: 4, name: "How it works" })).toBeVisible();
    await expect(detail.getByRole("heading", { level: 4, name: "Who it suits" })).toBeVisible();
    await expect(detail.locator("ol > li")).toHaveCount(3);
  }
  await expect(page.locator("#about-studio")).toContainText("The Studio editor and its elements");
  await expect(page.locator("#about-studio [data-studio-choices]")).toContainText("A second app for couriers");
  // How they differ, short; every feature of the app's plans folded, so the page stays short.
  await expect(page.getByRole("table", { name: "Regular apps and Studio projects" })).toBeVisible();
  const fold = page.locator("details[data-compare-all]");
  await expect(fold).not.toHaveAttribute("open");
  const table = page.getByRole("table", { name: "Everything each plan includes" });
  await expect(table).toBeHidden();
  await fold.getByText("Compare plans", { exact: true }).click();
  await expect(table).toBeVisible();
  await expect(table.getByRole("row", { name: /^iOS app/ })).toBeVisible();
  // What's kept: the currency, WhatsApp, the fees and refunds, /compare, the structured data.
  await expect(page.locator("[data-currency-note]")).toHaveText("Prices in Egyptian pounds (EGP). Card payments go through Kashier.");
  await expect(page.locator("#plans").getByRole("link", { name: "Message us on WhatsApp" })).toHaveCount(1);
  await expect(page.locator("[data-fees]").getByRole("link", { name: "Refund policy" })).toHaveAttribute("href", "/refund");
  await expect(page.locator('#differences a[href="/compare"]')).toHaveCount(1);
  expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
  // The addresses other pages link to.
  for (const id of ["plans", "regular", "studio", "lifetime-offer", "lifetime", "about", "differences", "compare"]) await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
  for (const [url, id] of [
    ["/pricing#studio", "studio"],
    ["/pricing#differences", "differences"],
    ["/pricing#regular", "regular"],
    ["/pricing?period=lifetime#lifetime", "lifetime"],
    ["/pricing#lifetime-offer", "lifetime-offer"],
  ] as const) {
    await page.goto(url);
    await expect(page.locator(`[id="${id}"]`), url).toBeInViewport();
  }
  // Studio is never under the long table: its plans come before the comparison.
  const studioTop = (await page.locator("#studio").boundingBox())!.y;
  expect(studioTop).toBeLessThan((await page.locator("#differences").boundingBox())!.y);
  expect(studioTop).toBeLessThan((await page.locator("[data-compare-all]").boundingBox())!.y);

  // On a phone: no sideways scroll, the differences topic by topic.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing?period=12");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator("[data-studio-differences] ul").first()).toBeVisible();
  await expect(page.getByRole("table", { name: "Regular apps and Studio projects" })).toBeHidden();
  await page.goto("/ar/pricing?period=lifetime");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.close();
});

test("a Studio project pays its Studio plan for 2 years on Kashier", async ({ browser }) => {
  own = await visitor(browser);
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 1460");
  await own.getByLabel("Your website (optional)").fill(`https://sahel-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).check();
  await own.getByLabel("Project name").fill("Sahel Parcels");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);

  // The project's plan page: Studio's plans, with the periods the pricing page showed (the period passed along).
  await own.goto("/studio/project/license?period=24#change-plan");
  const change = own.locator("#change-plan");
  await expect(change.locator('[data-period-tabs] [data-period="24"]')).toHaveAttribute("aria-current", "true");
  for (const key of ["1", "12", "24", "36", "lifetime"]) await expect(change.locator(`[data-period-tabs] [data-period="${key}"]`)).toHaveCount(1);
  await expect(change.locator('[data-plan="pro"]')).toHaveCount(0);
  const card = change.locator(`[data-plan="${STUDIO}"]`);
  await expect(card).toContainText(/EGP\s10,800/);
  await card.getByRole("link", { name: "Choose Studio Pro" }).click();
  await expect(own).toHaveURL(new RegExp(`plan=${STUDIO}&period=24#renew$`));
  const pay = own.locator("#renew");
  await expect(pay.locator('[data-period-choice] [data-period="24"] input')).toBeChecked();
  await pay.getByLabel("City").fill("Alexandria");
  await pay.getByLabel("Billing address").fill("3 Corniche Road, Raml Station");
  await pay.getByRole("button", { name: "Pay and activate" }).click();
  await expect(own.getByText("Total 10800.00 EGP")).toBeVisible();
  expect(kashier.started!.at(-1)).toMatchObject({ amount: "10800.00", currency: "EGP" });
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/(studio\/project|dashboard)\/license\?payment=paid$/);
  await expect(own.getByRole("region", { name: "Payments" })).toContainText(/Studio Pro · 2 years · EGP\s10,800/);
});

test("screens of the pricing page for the owner", async ({ browser }) => {
  test.skip(!SHOTS, "Only when PRICING_SHOTS_DIR is set.");
  mkdirSync(SHOTS!, { recursive: true });
  for (const lang of ["en", "ar"] as const) {
    for (const scheme of ["light", "dark"] as const) {
      for (const [device, viewport] of [
        ["desktop", { width: 1440, height: 900 }],
        ["phone", { width: 390, height: 844 }],
      ] as const) {
        const context = await browser.newContext({ colorScheme: scheme, deviceScaleFactor: 2, viewport, extraHTTPHeaders, isMobile: device === "phone", hasTouch: device === "phone" });
        const page = await context.newPage();
        const base = lang === "en" ? "/pricing" : "/ar/pricing";
        await page.goto(`${base}?period=12`);
        // Pictures load as they come into view: scroll through once, then back to the top.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: path.join(SHOTS!, `pricing-${lang}-${device}-${scheme}.png`), fullPage: true });
        // The top of the page as a visitor first sees it, and the plans with lifetime chosen.
        await page.screenshot({ path: path.join(SHOTS!, `pricing-${lang}-${device}-${scheme}-top.png`) });
        await page.goto(`${base}?period=lifetime#plans`);
        await page.waitForLoadState("networkidle");
        await page.locator("#plans").screenshot({ path: path.join(SHOTS!, `pricing-${lang}-${device}-${scheme}-lifetime.png`) });
        await context.close();
      }
    }
  }
});

test("the team puts everything back: Studio Pro not offered, Pro on request, Kashier removed", async ({ browser }) => {
  await admin.goto(`/admin/plans?family=studio&plan=${STUDIO}`);
  const plan = admin.locator(`section[aria-labelledby="h-${STUDIO}"]`);
  await plan.getByLabel("Offered").uncheck();
  await plan.getByRole("button", { name: "Save plan" }).click();
  await expect(plan.getByText("Studio Pro saved. It isn't offered: clients don't see it.")).toBeVisible();
  await admin.goto("/admin/plans?plan=pro");
  await admin.getByRole("button", { name: "Back to the default plan" }).click();
  await expect(admin.getByRole("button", { name: "Back to the default plan" })).toHaveCount(0);
  await admin.goto("/admin/settings/payments");
  await admin.getByRole("region", { name: "Yallapp's Kashier account" }).getByRole("button", { name: "Remove keys" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's Kashier account" })).toContainText("Now: not set.");
  const page = await visitor(browser);
  await page.goto("/pricing");
  await expect(page.locator(`[data-plan="${STUDIO}"]`)).toHaveCount(0);
  await expect(page.locator('#regular [data-plan="pro"]')).toContainText("On request");
  await page.close();
});
