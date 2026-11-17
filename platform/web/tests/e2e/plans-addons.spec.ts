import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";

/**
 * Roadmap 133: the team adds a regular plan in Admin › Plans with prices
 * for 1, 6, 12, 24 and 36 months and for life (prices the test types, as
 * the owner would); a visitor in Egypt sees the periods on the pricing page,
 * with the price per month, the saving and the lifetime card; a client
 * chooses 6 months on the Plan page and pays on (a fake) Kashier in pounds,
 * and gets the invoice. A plan priced only by the year gets suggested prices
 * for its other periods (the owner's request), which the team edits, keeps
 * or switches off. The team defines the add-on "+10 pages"; the client
 * buys it on Dashboard › Add-ons and the app's page limit rises. The team
 * puts everything back at the end (the plan archived: a client is on it).
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.133", "x-country": "EG" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Nile Courses", email: `nile-${suffix}@courses.test`, password: "nile-strong-password-1" };
const PLAN = "regular_5";
const SCREENS = process.env.PLANS_SCREENS_DIR;
let kashier: FakeGateway;
let admin: Page;
let own: Page;

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.plansAddonsAdminEmail, E2E.adminPassword);
});

test.afterAll(async () => {
  await admin.close();
  await own?.close();
  await kashier.close();
});

test("the team adds a regular plan with prices for 1, 6, 12, 24 and 36 months and for life", async () => {
  await admin.goto("/admin/settings/payments");
  const k = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  await k.getByLabel("Merchant ID").fill("MID-1330-133");
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("kashier-test-secret");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Kashier account saved.")).toBeVisible();

  // A regular plan more, started from Growth: hidden until it has its own name and is shown.
  await admin.goto("/admin/plans");
  const add = admin.getByRole("form", { name: "Add a regular plan" });
  await add.getByLabel("Start a new plan from").selectOption("growth");
  await add.getByRole("button", { name: "Add a plan" }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/plans\\?plan=${PLAN}&added=1$`));
  await expect(admin.locator(`[data-regular-plan="${PLAN}"]`)).toContainText("Hidden");
  const plan = admin.getByRole("region", { name: "Growth (new)" });
  await plan.locator(`#${PLAN}-name`).fill("Scale");
  await plan.getByLabel("A price").check();
  await plan.getByLabel("Price in EGP").fill("1200");
  await plan.getByLabel("Billed").selectOption("12");
  for (const [period, price] of [
    ["1 month", "120"],
    ["6 months", "650"],
    ["2 years", "2200"],
    ["3 years", "3000"],
    ["lifetime", "9000"],
  ] as const) {
    await plan.getByLabel(`Offer ${period}`).check();
    await plan.getByLabel(`EGP for ${period}`, { exact: true }).fill(price);
  }
  // Worked out from the prices, never typed: 650 for 6 months against 120 a month.
  await expect(plan.locator('[data-period-status="6"]')).toHaveText("EGP 108.33 a month · saves 9% against 1 month".replace(/EGP /g, "EGP "));
  await plan.getByLabel("Shown to clients").check();
  await plan.getByRole("button", { name: "Save plan" }).click();
  // Its heading is its new name now.
  await expect(admin.getByText("Scale saved. The pricing page shows it now.")).toBeVisible();
  await admin.reload();
  const scale = admin.getByRole("region", { name: "Scale" });
  await expect(scale).toContainText("Clients choose: 1 month · 6 months · 1 year · 2 years · 3 years · Lifetime");
  await expect(admin.locator(`[data-regular-plan="${PLAN}"]`)).not.toContainText("Hidden");

  // Its pages: the limit the add-on will raise.
  const limits = admin.getByRole("form", { name: "Scale: features and limits" });
  await limits.getByLabel("Pages in the app").fill("10");
  await limits.getByRole("button", { name: "Save features and limits" }).click();
  await expect(limits.getByText("Scale: features and limits saved.")).toBeVisible();
});

test("the pricing page offers the periods, with the price per month, the saving and the lifetime card", async () => {
  const visitor = await admin.context().browser()!.newPage({ extraHTTPHeaders });
  await visitor.goto("/pricing");
  const tabs = visitor.locator("[data-period-tabs]");
  await expect(tabs.locator("[data-period]")).toHaveText(["Monthly", "6 months", "Yearly", "2 years", "3 years", /Lifetime$/]);
  await tabs.locator('[data-period="6"]').click();
  await expect(visitor).toHaveURL(/\/pricing\?period=6#regular$/);
  const card = visitor.locator(`[data-pricing-plans] [data-plan="${PLAN}"]`);
  await expect(card).toContainText(/EGP\s650\s*\/ 6 months/);
  await expect(card.locator("[data-per-month]")).toContainText(/EGP\s108\.33 a month/);
  await expect(card.locator("[data-per-month]")).toContainText("Save 9%");
  // Growth has no 6-month price: its own.
  await expect(visitor.locator('[data-pricing-plans] [data-plan="growth"]')).toContainText("On request");
  // Lifetime, on its own, to link to.
  const lifetime = visitor.locator("#lifetime");
  await expect(lifetime.getByRole("heading", { name: "Pay once, yours for life" })).toBeVisible();
  await expect(lifetime.locator(`[data-lifetime-plan="${PLAN}"]`)).toContainText(/EGP\s9,000/);
  await expect(lifetime.locator("[data-lifetime-note]")).toContainText("What lifetime covers");
  // In Arabic too.
  await visitor.goto("/ar/pricing?period=lifetime");
  await expect(visitor.locator("#lifetime")).toContainText("ادفع مرة واحدة، وتبقى لك مدى الحياة");
  // The copy of Growth says what's included in Growth's Arabic, not in English.
  const scaleAr = visitor.locator(`#lifetime [data-lifetime-plan="${PLAN}"]`);
  await expect(scaleAr).not.toContainText("app languages");
  await expect(visitor.locator(`#regular [data-plan="${PLAN}"]`)).not.toContainText("Up to 10,000 app users");
  // Five plans: the last row's card in the middle, as wide as the others.
  await visitor.setViewportSize({ width: 1280, height: 900 });
  const box = (id: string) => visitor.locator(`#regular [data-plan="${id}"]`).boundingBox();
  const [first, fifth] = [await box("starter"), await box(PLAN)];
  expect(Math.round(fifth!.width)).toBe(Math.round(first!.width));
  const row = (await visitor.locator("#regular [data-pricing-plans]").boundingBox())!;
  expect(Math.abs(fifth!.x + fifth!.width / 2 - (row.x + row.width / 2))).toBeLessThan(2);
  await visitor.close();
});

test("a plan priced only by the year gets suggested prices for its other periods: the team edits, keeps or switches them off", async ({ browser }) => {
  await admin.goto("/admin/plans?plan=growth");
  const plan = admin.getByRole("region", { name: "Growth", exact: true });
  await plan.getByLabel("A price").check();
  await plan.getByLabel("Price in EGP").fill("1500");
  await plan.getByLabel("Billed").selectOption("12");
  // Worked out from EGP 1,500 a year as it's typed (a month 156.25), rounded to EGP 50, and marked as suggested.
  for (const [period, key, price] of [
    ["1 month", "1", "150.00"],
    ["6 months", "6", "850.00"],
    ["2 years", "24", "2550.00"],
    ["3 years", "36", "3400.00"],
    ["lifetime", "lifetime", "6000.00"],
  ] as const) {
    await expect(plan.getByLabel(`Offer ${period}`)).toBeChecked();
    await expect(plan.getByLabel(`EGP for ${period}`, { exact: true })).toHaveValue(price);
    await expect(plan.locator(`[data-period-suggested="${key}"]`)).toHaveText("Suggested: edit or keep");
  }
  await expect(plan.locator('[data-period-status="6"]')).toHaveText(/^EGP\s141\.67 a month · saves 5% against 1 month$/);
  // The team edits 3 years, switches 2 years off and leaves lifetime to its suggestion (on, no price typed).
  await plan.getByLabel("EGP for 3 years", { exact: true }).fill("3300");
  await expect(plan.locator('[data-period-suggested="36"]')).toHaveCount(0);
  await plan.getByLabel("Offer 2 years").uncheck();
  await plan.getByLabel("EGP for lifetime", { exact: true }).fill("");
  await plan.getByRole("button", { name: "Save plan" }).click();
  await expect(admin.getByText("Growth saved. The pricing page shows it now.")).toBeVisible();
  await admin.reload();
  const growth = admin.getByRole("region", { name: "Growth", exact: true });
  await expect(growth).toContainText("Clients choose: 1 month · 6 months · 1 year · 3 years · Lifetime (1 at a suggested price)");
  // The suggestions kept are the team's own now; 2 years stays off; lifetime is suggested again.
  await expect(growth.getByLabel("EGP for 6 months", { exact: true })).toHaveValue("850.00");
  await expect(growth.locator('[data-period-suggested="6"]')).toHaveCount(0);
  await expect(growth.getByLabel("EGP for 3 years", { exact: true })).toHaveValue("3300.00");
  await expect(growth.getByLabel("Offer 2 years")).not.toBeChecked();
  await expect(growth.getByLabel("EGP for lifetime", { exact: true })).toHaveValue("6000.00");
  await expect(growth.locator('[data-period-suggested="lifetime"]')).toBeVisible();

  // Clients are offered them like any price.
  const visitor = await browser.newPage({ extraHTTPHeaders });
  await visitor.goto("/pricing?period=6");
  await expect(visitor.locator('#regular [data-plan="growth"]')).toContainText(/EGP\s850\s*\/ 6 months/);
  await visitor.goto("/pricing?period=36");
  await expect(visitor.locator('#regular [data-plan="growth"]')).toContainText(/EGP\s3,300\s*\/ 3 years/);
  // 2 years off: its yearly price.
  await visitor.goto("/pricing?period=24");
  await expect(visitor.locator('#regular [data-plan="growth"]')).toContainText(/EGP\s1,500\s*\/ year/);
  await expect(visitor.locator('#lifetime [data-lifetime-plan="growth"]')).toContainText(/EGP\s6,000/);
  await visitor.goto("/ar/pricing?period=6");
  await expect(visitor.locator('#regular [data-plan="growth"]')).toContainText("850");
  await visitor.close();
  if (SCREENS) {
    mkdirSync(SCREENS, { recursive: true });
    for (const scheme of ["light", "dark"] as const) {
      const context = await browser.newContext({ colorScheme: scheme, deviceScaleFactor: 2, viewport: { width: 1280, height: 900 }, extraHTTPHeaders });
      const page = await context.newPage();
      await page.goto("/ar/pricing?period=6");
      await page.locator("#regular").screenshot({ path: path.join(SCREENS, `pricing-suggested-ar-${scheme}.jpg`), type: "jpeg", quality: 85 });
      await page.goto("/ar/pricing?period=lifetime");
      await page.locator("#lifetime").screenshot({ path: path.join(SCREENS, `lifetime-suggested-ar-${scheme}.jpg`), type: "jpeg", quality: 85 });
      await context.close();
    }
    await admin.goto("/admin/plans?plan=growth");
    await admin.locator('[data-plan-periods]').screenshot({ path: path.join(SCREENS, "admin-suggested-periods-en.jpg"), type: "jpeg", quality: 85 });
  }

  // Back to Growth as it comes (On request) for the steps after.
  await admin.goto("/admin/plans?plan=growth");
  await admin.getByRole("button", { name: "Back to the default plan" }).click();
  await expect(admin.getByRole("button", { name: "Back to the default plan" })).toHaveCount(0);
  await admin.reload();
  await expect(admin.getByRole("region", { name: "Growth", exact: true }).getByRole("radio", { name: "On request" })).toBeChecked();
});

test("a client chooses 6 months on the Plan page, pays EGP 650 on Kashier and gets the invoice", async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 1330");
  await own.getByLabel("Your website (optional)").fill(`https://nile-${suffix}.example.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);
  // The app first: the payment is for it.
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await expect(own).toHaveURL(/\/dashboard\/setup/);

  await own.goto("/dashboard/license");
  const change = own.locator("#change-plan");
  await expect(change.locator("[data-period-tabs] [data-period]")).toHaveCount(6);
  await change.locator('[data-period-tabs] [data-period="6"]').click();
  await expect(change.locator(`[data-plan="${PLAN}"]`)).toContainText(/EGP\s650/);
  await expect(change.locator(`[data-plan="${PLAN}"] [data-per-month]`)).toContainText("Save 9%");
  await expect(own.locator("[data-lifetime-offer]").locator(`[data-lifetime-plan="${PLAN}"]`)).toContainText(/EGP\s9,000/);
  await change.locator(`[data-plan="${PLAN}"]`).getByRole("link", { name: "Choose Scale" }).click();
  await expect(own).toHaveURL(new RegExp(`plan=${PLAN}&period=6#renew$`));
  const pay = own.locator("#renew");
  await expect(pay.locator('[data-period-choice] [data-period="6"] input')).toBeChecked();
  await expect(pay.getByText(/EGP\s650 \/ 6 months/)).toBeVisible();
  await pay.getByLabel("City").fill("Cairo");
  await pay.getByLabel("Billing address").fill("12 Tahrir Square, Downtown");
  await pay.getByRole("button", { name: "Pay and activate" }).click();
  await expect(own.getByText("Total 650.00 EGP")).toBeVisible();
  expect(kashier.started!.at(-1)).toMatchObject({ amount: "650.00", currency: "EGP" });
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  const payments = own.getByRole("region", { name: "Payments" });
  await expect(payments).toContainText(/Scale · 6 months · EGP\s650/);
  await payments.getByRole("link", { name: "Receipt" }).click();
  const receipt = own.getByRole("region", { name: "Yallapp plan payment" });
  await expect(receipt).toContainText("Scale, 6 months");
  await expect(receipt).toContainText(/Amount charged\s*EGP\s650/);

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await expect(admin.getByRole("row").filter({ hasText: client.name })).toContainText("Scale");
});

test("the team defines the add-on +10 pages; the client buys it and the app's page limit rises", async () => {
  await admin.goto("/admin/addons?addon=new");
  const form = admin.getByRole("form", { name: "New add-on" });
  await form.getByLabel("Id", { exact: true }).fill("pages-10");
  await form.getByLabel("Type", { exact: true }).selectOption("quantity");
  await form.getByLabel("Adds to").selectOption("pages");
  await form.getByLabel("How much one adds").fill("10");
  await form.getByLabel("Icon").selectOption("layers");
  await form.locator('input[name="enName"]').fill("+10 pages");
  await form.locator('textarea[name="enDescription"]').fill("Ten more pages in your app.");
  await form.getByLabel("1 year", { exact: true }).check();
  await form.getByLabel("EGP, 1 year", { exact: true }).fill("300");
  await form.getByLabel("Can be bought more than once").check();
  await form.getByLabel("Offered to clients").check();
  await form.getByRole("button", { name: "Save add-on" }).click();
  await expect(form.getByText("+10 pages saved and offered to the clients its rules allow.")).toBeVisible();
  await admin.goto("/admin/addons");
  await expect(admin.locator('[data-addon-row="pages-10"]')).toContainText("+10 · Pages");
  // 138 Every plan includes publishing: the publishing service doesn't come with Yallapp any more, and no add-on can switch it on.
  await expect(admin.locator('[data-addon-row="publishing"]')).toHaveCount(0);
  await admin.goto("/admin/addons?addon=new");
  await expect(admin.getByRole("form", { name: "New add-on" }).getByLabel("Also switches on (optional)").locator("option", { hasText: "We publish for you" })).toHaveCount(0);

  await own.goto("/dashboard/addons");
  const card = own.locator('[data-addon="pages-10"]');
  await expect(card).toContainText("+10 pages");
  await expect(card).toContainText(/EGP\s300/);
  await expect(own.locator('[data-addon="publishing"]')).toHaveCount(0);
  await card.getByRole("link", { name: "Choose" }).click();
  const buy = own.locator("#buy");
  await expect(buy.getByRole("heading", { name: "Add +10 pages" })).toBeVisible();
  await expect(buy.locator('[data-period="12"] input')).toBeChecked();
  await buy.getByLabel("City").fill("Cairo");
  await buy.getByLabel("Billing address").fill("12 Tahrir Square, Downtown");
  await buy.getByRole("button", { name: "Pay by card" }).click();
  await expect(own.getByText("Total 300.00 EGP")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/addons\?payment=paid$/);
  await expect(own.getByRole("status").first()).toContainText("Your add-on is on");
  const mine = own.getByRole("region", { name: "Your add-ons" });
  await expect(mine.locator('[data-owned-addon="pages-10"]')).toContainText("+10 pages");
  await expect(mine.locator('[data-owned-addon="pages-10"]')).toContainText("1 year");
  await expect(mine.getByRole("link", { name: "Renew" })).toBeVisible();

  // 10 pages on the plan, 10 more with the add-on.
  await own.goto("/dashboard/license");
  await expect(own.locator('[data-usage-row="pages"]')).toContainText("of 20");
  // The invoice lists it.
  await expect(own.getByRole("region", { name: "Payments" })).toContainText(/Add-on \+10 pages · 1 year · EGP\s300/);
});

test("screens of the plans editor, the periods, the lifetime card and the add-ons", async ({ browser }) => {
  test.skip(!SCREENS, "Only when PLANS_SCREENS_DIR is set.");
  mkdirSync(SCREENS!, { recursive: true });
  const shot = async (b: Browser, url: string, name: string, options: BrowserContextOptions & { selector?: string; state?: Page }) => {
    const context = await b.newContext({ ...options, deviceScaleFactor: 2, viewport: { width: 1280, height: 900 }, extraHTTPHeaders, storageState: options.state ? await options.state.context().storageState() : undefined });
    const page = await context.newPage();
    await page.goto(url);
    const target = options.selector ? page.locator(options.selector).first() : page;
    await target.screenshot({ path: path.join(SCREENS!, `${name}.jpg`), type: "jpeg", quality: 85 });
    await context.close();
  };
  for (const scheme of ["light", "dark"] as const) {
    await shot(browser, `/admin/plans?plan=${PLAN}`, `admin-plans-editor-en-${scheme}`, { colorScheme: scheme, state: admin, selector: "main" });
    await shot(browser, "/pricing?period=6", `pricing-periods-en-${scheme}`, { colorScheme: scheme, selector: "#regular" });
    await shot(browser, "/ar/pricing?period=6", `pricing-periods-ar-${scheme}`, { colorScheme: scheme, selector: "#regular" });
    await shot(browser, "/pricing", `lifetime-card-en-${scheme}`, { colorScheme: scheme, selector: "#lifetime" });
    await shot(browser, "/ar/pricing", `lifetime-card-ar-${scheme}`, { colorScheme: scheme, selector: "#lifetime" });
    await shot(browser, "/dashboard/addons", `dashboard-addons-en-${scheme}`, { colorScheme: scheme, state: own, selector: "main" });
    await shot(browser, "/dashboard/license?period=lifetime#change-plan", `dashboard-lifetime-en-${scheme}`, { colorScheme: scheme, state: own, selector: "[data-lifetime-offer]" });
  }
  // The dashboard in Arabic (Egyptian).
  const ar = await browser.newContext({ storageState: await own.context().storageState(), extraHTTPHeaders });
  await ar.addCookies([{ name: "yallapp_lang", value: "ar", url: E2E.baseURL }]);
  const arState = await ar.newPage();
  for (const scheme of ["light", "dark"] as const) {
    await shot(browser, "/dashboard/addons", `dashboard-addons-ar-${scheme}`, { colorScheme: scheme, state: arState, selector: "main" });
    await shot(browser, "/dashboard/license", `dashboard-lifetime-ar-${scheme}`, { colorScheme: scheme, state: arState, selector: "[data-lifetime-offer]" });
  }
  await ar.close();
});

test("the team puts everything back: the add-on off, the plan archived, Kashier removed", async () => {
  await admin.goto("/admin/addons?addon=pages-10");
  const form = admin.getByRole("form", { name: "Add-on +10 pages" });
  await form.getByLabel("Offered to clients").uncheck();
  await form.getByRole("button", { name: "Save add-on" }).click();
  await expect(form.getByText("+10 pages saved. It isn't offered: clients don't see it.")).toBeVisible();

  // A client is on it: it can't be removed, only archived.
  await admin.goto(`/admin/plans?plan=${PLAN}`);
  await expect(admin.getByRole("button", { name: "Remove this plan" })).toHaveCount(0);
  await admin.locator("[data-plan-status]").getByRole("button", { name: "Archive" }).click();
  await expect(admin.getByText("Archived. New clients don't see it; the apps on it keep it and can renew it.")).toBeVisible();
  await expect(admin.locator(`[data-regular-plan="${PLAN}"]`)).toContainText("Archived");
  const visitor = await admin.context().browser()!.newPage({ extraHTTPHeaders });
  await visitor.goto("/pricing");
  await expect(visitor.locator(`[data-pricing-plans] [data-plan="${PLAN}"]`)).toHaveCount(0);
  await expect(visitor.locator("#lifetime")).toHaveCount(0);
  await visitor.close();
  // The app on it keeps it.
  await own.goto("/dashboard/license");
  // (An app not set up yet shows its license, as a WordPress app's.)
  await expect(own.getByRole("region", { name: /^(Plan|License)$/ })).toContainText("Scale");

  await admin.goto("/admin/settings/payments");
  await admin.getByRole("region", { name: "Yallapp's Kashier account" }).getByRole("button", { name: "Remove keys" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's Kashier account" })).toContainText("Now: not set.");
});
