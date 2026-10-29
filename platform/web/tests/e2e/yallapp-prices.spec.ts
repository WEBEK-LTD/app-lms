import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";

/**
 * Roadmap 52: Yallapp's prices in Egyptian pounds for Egypt and US dollars
 * elsewhere, charged in pounds through Kashier. The team sets Growth at
 * EGP 1,500 with a rate of 50 pounds to the dollar; the pricing page shows
 * pounds to a visitor from Egypt and $30 to anyone else; a client signing
 * up from the United Kingdom sees $30, is told the charge is EGP 1,500,
 * pays on (a fake) Kashier in pounds, and gets a receipt in pounds.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-ups never use up the shared sign-up limit of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.252" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Thames Tutors", email: `thames-${suffix}@tutors.test`, password: "thames-strong-password-1" };
const CHARGE_LINE = /You'll be charged EGP\s1,500 \(about \$30\); your bank may convert it\./;
let kashier: FakeGateway;
let admin: Page;

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
  await signIn(admin, E2E.pricesAdminEmail, E2E.adminPassword);
});

test.afterAll(async () => {
  await admin.close();
  await kashier.close();
});

test("the team adds Yallapp's Kashier account, the rate, and Growth's price in pounds", async () => {
  await admin.goto("/admin/settings/payments");
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  // Kashier until the team chooses another gateway (other specs may have saved it already).
  await expect(billing).toContainText(/Now: Kashier[,( ]/);
  await expect(billing).toContainText("Yallapp's Kashier account isn't set: card payments for plans are off.");
  const k = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  await k.getByLabel("Merchant ID").fill("MID-5252-525");
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("kashier-test-secret");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Kashier account saved.")).toBeVisible();

  await billing.getByLabel("EGP for 1 US dollar").fill("fifty");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Enter how many Egyptian pounds make one US dollar, like 48.5, or leave it empty.")).toBeVisible();
  await billing.getByLabel("EGP for 1 US dollar").fill("50");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's Kashier account.")).toBeVisible();

  await admin.goto("/admin/plans?plan=growth");
  const growth = admin.getByRole("region", { name: "Growth" });
  await growth.getByLabel("A price").check();
  await growth.getByRole("button", { name: "Save plan" }).click();
  await expect(growth.getByText("Enter the price in Egyptian pounds, or choose On request.")).toBeVisible();
  // The choice stays after the answer.
  await expect(growth.getByLabel("A price")).toBeChecked();
  await growth.getByLabel("Price in EGP").fill("1500");
  await growth.getByLabel("Billed").selectOption("12");
  await growth.getByRole("button", { name: "Save plan" }).click();
  await expect(growth.getByText("Growth saved.")).toBeVisible();
  await admin.reload();
  await expect(admin.getByRole("region", { name: "Growth" })).toContainText(/EGP\s1,500 \/ year · \$30 outside Egypt/);
});

test("the pricing page shows pounds in Egypt and dollars everywhere else", async ({ browser }) => {
  const egypt = await browser.newPage({ extraHTTPHeaders: { ...extraHTTPHeaders, "x-country": "EG" } });
  const response = await egypt.goto("/pricing");
  // No cache keeps the page; Netlify's would keep one copy per country.
  expect(response!.headers()["cache-control"]).toMatch(/private.*no-store|no-store.*private/);
  expect(response!.headers()["netlify-vary"]).toBe("header=X-Yallapp-Client-Country|X-Country|CF-IPCountry|Accept-Language,country=eg");
  const cards = egypt.locator("[data-pricing-plans]");
  await expect(cards).toHaveAttribute("data-currency", "EGP");
  await expect(cards.locator('[data-plan="growth"]')).toContainText(/EGP\s1,500\s*\/ year/);
  await expect(cards.locator('[data-plan="pro"]')).toContainText("On request");
  await expect(egypt.locator("[data-currency-note]")).toContainText("Prices in Egyptian pounds (EGP).");
  expect((await egypt.locator('script[type="application/ld+json"]').allTextContents()).join("")).toContain('"priceCurrency":"EGP"');
  await egypt.close();

  const abroad = await browser.newPage({ extraHTTPHeaders: { ...extraHTTPHeaders, "x-country": "GB" } });
  await abroad.goto("/pricing");
  const growth = abroad.locator('[data-pricing-plans] [data-plan="growth"]');
  await expect(growth).toContainText("$30");
  await expect(growth).not.toContainText("EGP");
  await expect(abroad.locator("[data-currency-note]")).toContainText("Prices in US dollars. Card payments go through Kashier and are charged in Egyptian pounds (EGP)");
  expect((await abroad.locator('script[type="application/ld+json"]').allTextContents()).join("")).toContain('"priceCurrency":"USD"');
  await abroad.goto("/");
  await expect(abroad.locator('[data-pricing-plans] [data-plan="growth"]')).toContainText("$30");
  await abroad.close();

  // Without a country from the host, the browser's language region decides.
  const arabic = await browser.newPage({ extraHTTPHeaders, locale: "ar-EG" });
  await arabic.goto("/pricing");
  await expect(arabic.locator('[data-pricing-plans] [data-plan="growth"]')).toContainText(/EGP\s1,500/);
  await arabic.close();
});

test("a client outside Egypt sees dollars, pays EGP 1,500 on Kashier and gets a receipt in pounds", async ({ browser }) => {
  const own = await browser.newPage({ extraHTTPHeaders: { ...extraHTTPHeaders, "x-country": "GB" } });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+44 7700 900 252");
  await own.getByLabel("Your website (optional)").fill(`https://thames-${suffix}.example.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  await expect(own.getByRole("heading", { name: "Pay by card" })).toBeVisible();
  await expect(own.getByText("$30 / year")).toBeVisible();
  await expect(own.locator("[data-charge-line]")).toHaveText(CHARGE_LINE);
  await expect(own.getByText("You enter your card on Kashier's secure page.")).toBeVisible();
  await own.getByLabel("City").fill("London");
  await own.getByLabel("Billing address").fill("221B Baker Street, Marylebone");
  await own.getByRole("button", { name: "Pay and activate" }).click();
  await expect(own.getByText("Total 1500.00 EGP")).toBeVisible();
  // Kashier was asked for pounds, not dollars.
  expect(kashier.started!.at(-1)).toMatchObject({ amount: "1500.00", currency: "EGP" });
  await own.getByRole("button", { name: "Pay with test card" }).click();

  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("status").first()).toContainText("Payment received.");
  const payments = own.getByRole("region", { name: "Payments" });
  await expect(payments).toContainText(/Growth · 1 year · EGP\s1,500/);
  await payments.getByRole("link", { name: "Receipt" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\/receipts\/[\w-]+$/);
  const receipt = own.getByRole("region", { name: "Yallapp plan payment" });
  await expect(receipt).toContainText(/Amount charged\s*EGP\s1,500/);
  await expect(receipt).toContainText("About $30. Your bank may have converted the charge at its own rate.");
  await expect(receipt).toContainText("Card, through Kashier");
  await expect(receipt).toContainText("Yallapp, Cairo, Egypt");
  await own.close();

  await admin.goto("/admin/payments");
  const row = admin.getByRole("row").filter({ hasText: client.name });
  await expect(row).toContainText(/EGP\s1,500/);
  await expect(row).toContainText("Shown as $30");
});

test("the team puts the settings back", async () => {
  await admin.goto("/admin/plans?plan=growth");
  const reset = admin.getByRole("region", { name: "Growth" }).getByRole("button", { name: "Back to the default plan" });
  await reset.click();
  await expect(reset).toHaveCount(0);
  await admin.goto("/admin/settings/payments");
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("EGP for 1 US dollar").fill("");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's Kashier account.")).toBeVisible();
  await admin.getByRole("region", { name: "Yallapp's Kashier account" }).getByRole("button", { name: "Remove keys" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's Kashier account" })).toContainText("Now: not set.");
});
