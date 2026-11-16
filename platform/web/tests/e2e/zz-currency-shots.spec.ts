import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/** Not kept: the 133 screenshots for the owner's review, at 2x, into SHOTS_DIR. */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.134" };
const dir = process.env.SHOTS_DIR ?? "test-results/shots";
const suffix = Date.now().toString(36);
const client = { name: "Dana Sweets", email: `shots-${suffix}@shop.test`, password: "dana-sweets-strong-password-1" };
const RATES: Record<string, number> = { USD: 1, EGP: 48.5, KWD: 0.306, JPY: 151.2, EUR: 0.92, TRY: 34.1, SAR: 3.75, AED: 3.6725, GBP: 0.79, QAR: 3.64, BHD: 0.376, OMR: 0.3845, JOD: 0.709, IQD: 1310, INR: 84.1, CAD: 1.39, AUD: 1.52, CHF: 0.88, CNY: 7.2, SEK: 10.6, NOK: 10.9, DKK: 6.86, PLN: 4.0, MAD: 9.9, TND: 3.1, DZD: 134 };
let rates: Server;
let own: Page;

test.beforeAll(async ({ browser }) => {
  rates = createServer((_, response) => {
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ result: "success", time_last_update_unix: Math.floor(Date.UTC(2026, 10, 16) / 1000), base_code: "USD", rates: RATES }));
  });
  await new Promise<void>((resolve) => rates.listen(E2E.ratesPort, resolve));
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0134");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);
  const admin = await browser.newPage({ extraHTTPHeaders, deviceScaleFactor: 2, viewport: { width: 1280, height: 900 } });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.currenciesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.goto("/admin/settings/currencies");
  await admin.getByRole("button", { name: "Refresh now" }).click();
  await expect(admin.getByText(/The rates of 2026-11-16 are in/)).toBeVisible();
  await admin.screenshot({ path: `${dir}/admin-currencies.png`, fullPage: false });
  await admin.close();
});

test.afterAll(async () => {
  await own?.context().close();
  await new Promise<void>((resolve) => rates.close(() => resolve()));
});

test("shots", async () => {
  test.setTimeout(240_000);
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Dana Sweets");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await own.goto("/studio/project/catalog/settings");
  const currency = own.getByLabel("Currency", { exact: true });
  await currency.selectOption("KWD");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Shop settings saved.")).toBeVisible();
  await own.getByRole("searchbox", { name: "Search currencies" }).fill("din");
  await own.locator("section[aria-labelledby=h-shop]").screenshot({ path: `${dir}/picker-en.png` });
  await own.getByRole("searchbox", { name: "Search currencies" }).fill("");
  await own.screenshot({ path: `${dir}/currency-settings-en.png`, fullPage: true });
  for (const [name, price, png] of [
    ["Date maamoul box", "1.250", [180, 120, 60]],
    ["Pistachio baklava", "3.500", [120, 150, 70]],
  ] as const) {
    await own.goto("/studio/project/catalog/new");
    await own.getByLabel("Name", { exact: true }).fill(name);
    await own.getByLabel("Price (KWD)", { exact: true }).fill(price);
    await own.locator('input[name="images"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: solidPng(64, 64, [...png]) });
    await own.getByRole("button", { name: "Add product" }).click();
    await expect(own.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  }
  await own.goto("/studio/project/catalog");
  await own.screenshot({ path: `${dir}/kwd-products-en.png` });
  // Arabic.
  await own.goto("/studio/project/catalog/settings");
  await own.locator("[data-dashboard-languages]:visible").first().getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  await own.goto("/studio/project/catalog/settings");
  await own.getByRole("searchbox").first().fill("دينار");
  await own.locator("section[aria-labelledby=h-shop]").screenshot({ path: `${dir}/picker-ar.png` });
  await own.getByRole("searchbox").first().fill("");
  await own.screenshot({ path: `${dir}/currency-settings-ar.png`, fullPage: true });
  await own.locator("[data-dashboard-languages]:visible").first().getByRole("button", { name: "English" }).click().catch(() => undefined);
});
