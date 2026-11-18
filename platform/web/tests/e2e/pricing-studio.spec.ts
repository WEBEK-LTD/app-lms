import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";

/**
 * Roadmap 146: the pricing page shows the app and Studio side by side; 154
 * in its Day and night look (a night hero, the period picker floating over
 * its edge, compact cards, Studio's plans on a night band, the kinds of apps
 * each makes, a few questions). The
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
  // The two at the top, alike: who each is for, real screens and its "from" price; 154 the app by day, Studio by night, in a night hero.
  const products = page.locator("[data-pricing-hero] [data-products]");
  await expect(products.locator("[data-product]")).toHaveCount(2);
  const app = products.locator('[data-product="regular"]');
  const studio = products.locator('[data-product="studio"]');
  await expect(app.getByRole("heading", { level: 2, name: "Yallapp app" })).toBeVisible();
  await expect(app).toContainText("Your website or store, turned into an app.");
  await expect(studio.getByRole("heading", { level: 2, name: "Yallapp Studio" })).toBeVisible();
  await expect(studio).toContainText("Design your app freely and run everything from Yallapp.");
  await expect(studio).toContainText("Free design");
  for (const screen of ["store-home", "academy-home"]) await expect(app.locator(`img[src*="${screen}"]`)).toBeVisible();
  for (const screen of ["food-delivery-sig-a-home-dark", "lamha-home"]) await expect(studio.locator(`img[src*="${screen}"]`)).toBeVisible();
  for (const product of [app, studio]) await expect(product.locator("[data-from-price]")).toContainText(/From\s*EGP\s[\d,]+/);
  // The hero is the night in light mode too; the app's panel is by day, Studio's by night.
  await expect(page.locator("[data-pricing-hero]")).toHaveCSS("background-color", "rgb(14, 13, 36)");
  await expect(app).toHaveCSS("background-color", "rgb(244, 239, 230)");
  // Side by side on a computer, the same size.
  const [a, b] = [(await app.boundingBox())!, (await studio.boundingBox())!];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(Math.abs(a.width - b.width)).toBeLessThan(2);
  await studio.getByRole("link", { name: "See the plans" }).click();
  await expect(page).toHaveURL(/#studio$/);
  await expect(page.locator("#studio")).toBeInViewport();

  // One picker for both, lifetime among its choices; 154 a white bar floating over the hero's bottom edge, with each period's saving.
  const bar = page.locator("[data-period-bar]");
  const tabs = bar.locator("[data-period-tabs]");
  for (const key of ["1", "12", "24", "36", "lifetime"]) await expect(tabs.locator(`[data-period="${key}"]`)).toHaveCount(1);
  await expect(page.locator("[data-period-tabs]")).toHaveCount(1);
  await page.goto("/pricing");
  const hero = (await page.locator("[data-pricing-hero]").boundingBox())!;
  const barBox = (await bar.boundingBox())!;
  expect(barBox.y).toBeLessThan(hero.y + hero.height);
  expect(barBox.y + barBox.height).toBeGreaterThan(hero.y + hero.height);
  await expect(bar).toHaveCSS("background-color", "rgb(255, 255, 255)");
  // Studio Pro saves 16% on a year and Pro 20%: up to the most; nothing to save by the month; lifetime is paid once.
  await expect(tabs.locator('[data-period="12"] [data-period-hint]')).toHaveText("Save up to 20%");
  await expect(tabs.locator('[data-period="1"] [data-period-hint]')).toHaveCount(0);
  await expect(tabs.locator('[data-period="lifetime"] [data-period-hint]')).toHaveText("Pay once");
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

  // The picker drives both products: their cards and their "from" prices at the top.
  await tabs.locator('[data-period="24"]').click();
  await expect(page).toHaveURL(/\/pricing\?period=24#plans$/);
  await expect(studioCard).toContainText(/EGP\s10,800\s*\/ 2 years/);
  await expect(studioCard.locator("[data-per-month]")).toContainText(/EGP\s450 a month/);
  await expect(studioCard.locator("[data-per-month]")).toContainText("Save 25%");
  // Pro's 2 years at its suggested price (a year × 1.7, to EGP 50).
  await expect(proCard).toContainText(/EGP\s8,150\s*\/ 2 years/);
  await expect(studio.locator("[data-from-price]")).toContainText(/From\s*EGP\s10,800\s*\/ 2 years/);
  await expect(app.locator("[data-from-price]")).toContainText(/From\s*EGP\s8,150\s*\/ 2 years/);
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
  await expect(page.locator('[data-period-tabs] [data-period="lifetime"] [data-period-label]')).toHaveText(/مدى الحياة$/);
  await expect(page.locator('[data-period-tabs] [data-period="lifetime"] [data-period-hint]')).toHaveText("ادفع مرة واحدة");
  await page.close();
});

test("154 compact cards, Studio's plans on a night band, only the plans for sale", async ({ browser }) => {
  const page = await visitor(browser);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/pricing?period=12");
  // The app's plans by day, Studio's on a band that stays dark in both themes.
  await expect(page.locator("#regular")).toHaveCSS("background-color", "rgb(244, 239, 230)");
  await expect(page.locator("#studio")).toHaveCSS("background-color", "rgb(14, 13, 36)");
  const studioCard = page.locator(`#studio [data-plan="${STUDIO}"]`);
  await expect(studioCard).toHaveCSS("background-color", "rgb(23, 21, 47)");
  // Only the plans for sale: Studio Pro alone, none of the design's samples.
  await expect(page.locator("#studio [data-plan]")).toHaveCount(1);
  await expect(page.getByRole("main")).not.toContainText(/Studio Start|Studio Business/);
  // One Studio plan: what every Studio plan has widens to fill the row, its list in columns.
  const basics = page.locator("#studio [data-studio-basics]");
  await expect(basics.getByRole("heading", { name: "Every Studio plan has" })).toBeVisible();
  const [card, wide] = [(await studioCard.boundingBox())!, (await basics.boundingBox())!];
  expect(Math.abs(card.y - wide.y)).toBeLessThan(2);
  expect(wide.width).toBeGreaterThan(card.width * 2.5);
  // Compact: four highlights, the rest folded under "See everything (+N)".
  const pro = page.locator('#regular [data-plan="pro"]');
  await expect(pro.locator(".pr-plan-list").first().locator("li")).toHaveCount(4);
  const more = pro.locator("details[data-plan-more]");
  await expect(more.locator("summary")).toContainText(/See everything\s*\+\d+/);
  await expect(pro.getByText("Automatic store updates", { exact: true })).toBeVisible();
  await expect(more.locator("[data-plan-stores]")).toBeHidden();
  await more.locator("summary").click();
  await expect(more.locator("[data-plan-stores]")).toBeVisible();
  await expect(more.getByRole("list", { name: "Pro limits" })).toBeVisible();
  // A Studio card folds what its plan doesn't include.
  const studioMore = studioCard.locator("details[data-plan-more]");
  await expect(studioMore.locator("[data-not-included]")).toBeHidden();
  await studioMore.locator("summary").click();
  await expect(studioMore.locator("[data-not-included]")).toContainText(/options not on this plan/);
  // Dark mode: the band is deeper than the page.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("#studio")).toHaveCSS("background-color", "rgb(8, 7, 26)");
  await expect(page.locator("[data-pricing-hero]")).toHaveCSS("background-color", "rgb(14, 13, 36)");
  await page.close();
});

test("each product explained with real screens, how they differ, every feature in a fold and a few questions; the addresses still land", async ({ browser }) => {
  const page = await visitor(browser);
  await page.goto("/pricing");
  for (const [product, screens] of [
    ["regular", ["academy-home", "restaurant-menu", "bookings-services"]],
    // 154 Studio's real editor, beside a school by night.
    ["studio", ["studio-editor", "school-sig-b-home-dark"]],
  ] as const) {
    const detail = page.locator(`#about-${product}[data-product-detail="${product}"]`);
    for (const screen of screens) await expect(detail.locator(`img[src*="${screen}"]`)).toBeVisible();
    await expect(detail.getByRole("heading", { level: 4, name: "How it works" })).toBeAttached();
    await expect(detail.locator("ol > li")).toHaveCount(3);
    // What you get and who it suits, folded.
    const more = detail.locator("details[data-about-more]");
    await expect(more.locator("summary h4")).toHaveText("What you get");
    await expect(more.getByRole("heading", { level: 4, name: "Who it suits" })).toBeHidden();
    await more.locator("summary").click();
    await expect(more.getByRole("heading", { level: 4, name: "Who it suits" })).toBeVisible();
  }
  await expect(page.locator("#about-studio")).toContainText("The Studio editor and its elements");
  await expect(page.locator("#about-studio [data-studio-choices]")).toContainText("A second app for couriers");
  // Every kind of app each makes: the common ones, then the rest under "+N more".
  const studioKinds = page.locator("#about-studio [data-kinds]");
  await expect(studioKinds.locator("[data-kind]").first()).toHaveAttribute("data-kind", "store");
  await expect(studioKinds.getByText("Travel: hotels and flights")).toBeHidden();
  await studioKinds.getByText(/^\+\d+ more$/).click();
  for (const kind of ["Travel: hotels and flights", "University", "Flower shop", "Events & tickets", "Bookings", "Charity & donations", "Live taxi on the map"]) await expect(studioKinds.getByText(kind)).toBeVisible();
  await expect(studioKinds.getByText("Show fewer")).toBeVisible();
  await expect(studioKinds.getByRole("link", { name: "Multi-vendor" })).toHaveAttribute("href", "/solutions/multi-vendor");
  const appKinds = page.locator("#about-regular [data-kinds]");
  for (const kind of ["delivery", "food", "marketplace", "rides", "taxi", "school", "instructors", "travel"]) await expect(appKinds.locator(`[data-kind="${kind}"]`)).toHaveCount(0);
  for (const kind of ["store", "academy", "restaurant", "bookings", "clinic", "fitness", "services", "real_estate", "news", "events", "charity"]) await expect(appKinds.locator(`[data-kind="${kind}"]`)).toHaveCount(1);
  // How they differ, short, with Studio's column by night; every feature of the app's plans folded, so the page stays short.
  const differences = page.getByRole("table", { name: "Regular apps and Studio projects" });
  await expect(differences).toBeVisible();
  await expect(differences.getByRole("row")).toHaveCount(7);
  await expect(differences.getByRole("row", { name: /^Plans/ })).toContainText("a Studio project is paid on a Studio plan only");
  await expect(differences.getByRole("columnheader", { name: "Yallapp Studio" })).toHaveCSS("background-color", "rgb(14, 13, 36)");
  const fold = page.locator("details[data-compare-all]");
  await expect(fold).not.toHaveAttribute("open");
  const table = page.getByRole("table", { name: "Everything each plan includes" });
  await expect(table).toBeHidden();
  await fold.getByText("Compare plans", { exact: true }).click();
  await expect(table).toBeVisible();
  await expect(table.getByRole("row", { name: /^iOS app/ })).toBeVisible();
  // "Compare plans" above the app's plans opens the fold too.
  await page.goto("/pricing");
  await page.locator("#regular").getByRole("link", { name: "Compare plans" }).click();
  await expect(page).toHaveURL(/#compare$/);
  await expect(table).toBeVisible();
  // What's kept: the currency, WhatsApp, the fees and refunds, /compare, the structured data.
  await expect(page.locator("[data-currency-note]")).toHaveText("Prices in Egyptian pounds (EGP). Card payments go through Kashier.");
  await expect(page.locator("#plans").getByRole("link", { name: "Message us on WhatsApp" })).toHaveCount(1);
  await expect(page.locator("[data-fees]").getByRole("link", { name: "Refund policy" })).toHaveAttribute("href", "/refund");
  await expect(page.locator('#differences a[href="/compare"]')).toHaveCount(1);
  expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
  // 154 A few questions, answered with the page's own words: the first open.
  const faq = page.locator("[data-pricing-faq]");
  await expect(faq.getByRole("heading", { level: 2, name: "Questions, answered" })).toBeVisible();
  await expect(faq.getByRole("link", { name: "Talk to us on WhatsApp" })).toBeVisible();
  await expect(faq.locator("details[data-faq]")).toHaveCount(4);
  await expect(faq.locator('details[data-faq="lifetime"]')).toHaveAttribute("open", "");
  await expect(faq.locator('details[data-faq="lifetime"]')).toContainText("One payment keeps this plan active for as long as Yallapp runs the service");
  const change = faq.locator('details[data-faq="change"]');
  await expect(change.getByText(/^Upgrade from your dashboard at any time/)).toBeHidden();
  await change.getByText("Can I change my plan later?").click();
  await expect(change.getByText(/^Upgrade from your dashboard at any time/)).toBeVisible();
  await faq.getByText("Who pays the app stores' fees, and can I get a refund?").click();
  await expect(faq.locator('details[data-faq="fees"]').getByRole("link", { name: "Refund policy" })).toHaveAttribute("href", "/refund");
  await faq.getByText("Who counts as an app user?").click();
  await expect(faq.locator('details[data-faq="users"]')).toContainText("App users are the people with an account in your app");
  // The closing band in the night.
  await expect(page.locator('[data-contact-band="glow"]')).toHaveCSS("background-color", "rgb(14, 13, 36)");
  // The addresses other pages link to.
  for (const id of ["plans", "regular", "studio", "lifetime-offer", "lifetime", "about", "differences", "compare"]) await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
  for (const [url, id] of [
    ["/pricing#studio", "studio"],
    ["/pricing#differences", "differences"],
    ["/pricing#regular", "regular"],
    ["/pricing?period=lifetime#lifetime", "lifetime"],
    ["/pricing#lifetime-offer", "lifetime-offer"],
    ["/pricing#about", "about"],
  ] as const) {
    await page.goto(url);
    await expect(page.locator(`[id="${id}"]`), url).toBeInViewport();
  }
  await page.goto("/pricing#compare");
  await expect(page.locator("#compare")).toHaveAttribute("open", "");
  // Studio is never under the long table: its plans come before the comparison.
  const studioTop = (await page.locator("#studio").boundingBox())!.y;
  expect(studioTop).toBeLessThan((await page.locator("#differences").boundingBox())!.y);
  expect(studioTop).toBeLessThan((await page.locator("[data-compare-all]").boundingBox())!.y);

  // On a phone: no sideways scroll; the period picker in rows of three; the differences topic by topic, each over the two answers.
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/pricing?period=12", "/ar/pricing?period=lifetime"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width} px ${path}`).toBeLessThanOrEqual(0);
    }
  }
  await page.goto("/pricing?period=12");
  const [monthly, yearly] = [(await page.locator('[data-period-tabs] [data-period="1"]').boundingBox())!, (await page.locator('[data-period-tabs] [data-period="lifetime"]').boundingBox())!];
  expect(yearly.y).toBeGreaterThan(monthly.y + monthly.height - 2);
  await expect(differences).toBeVisible();
  const topic = (await differences.getByRole("rowheader").first().boundingBox())!;
  const whole = (await differences.boundingBox())!;
  expect(topic.width).toBeGreaterThan(whole.width - 4);
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
  test.setTimeout(600_000);
  mkdirSync(SHOTS!, { recursive: true });
  // Test prices on Starter and Growth too (by the year; Business stays on request), put back below: never Yallapp's.
  for (const [id, name, price] of [
    ["starter", "Starter", "1500"],
    ["growth", "Growth", "3600"],
  ] as const) {
    await admin.goto(`/admin/plans?plan=${id}`);
    const plan = admin.getByRole("region", { name, exact: true });
    await plan.getByLabel("A price").check();
    await plan.getByLabel("Price in EGP").fill(price);
    await plan.getByLabel("Billed").selectOption("12");
    await plan.getByRole("button", { name: "Save plan" }).click();
    await expect(admin.getByText(`${name} saved. The pricing page shows it now.`)).toBeVisible();
  }
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
        await page.evaluate(() => document.fonts.ready);
        // The top of the page as a visitor first sees it, and the whole page.
        await page.screenshot({ path: path.join(SHOTS!, `pricing-${lang}-${device}-${scheme}-top.png`) });
        await page.screenshot({ path: path.join(SHOTS!, `pricing-${lang}-${device}-${scheme}-full.png`), fullPage: true });
        await context.close();
      }
    }
  }
  for (const id of ["starter", "growth"]) {
    await admin.goto(`/admin/plans?plan=${id}`);
    await admin.getByRole("button", { name: "Back to the default plan" }).click();
    await expect(admin.getByRole("button", { name: "Back to the default plan" })).toHaveCount(0);
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
