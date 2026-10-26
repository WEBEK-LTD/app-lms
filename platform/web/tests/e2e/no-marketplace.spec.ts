import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 72 No marketplace: Yallapp never collects payments for its clients. The
 * team has no option to let shops sell through Yallapp's account (no
 * commission, no provider for it, no switch), a shop without a website only
 * adds its own payment account, and the public pages don't offer it.
 * (Before Phase 72 this spec had a shop join the marketplace, roadmap 9.5.)
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const shop = { name: "Olive Corner", email: `olive-${suffix}@shop.test`, password: "olive-strong-password-1" };
let admin: Page;
let own: Page;

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(shop.name);
  await own.getByLabel("Email").fill(shop.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 31");
  await own.getByLabel("Your website (optional)").fill(`https://olive-${suffix}.shop.test`);
  await own.getByLabel("Password", { exact: true }).fill(shop.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.settingsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
});

test("the admin has no way to turn on selling through Yallapp", async () => {
  await admin.goto("/admin/settings/payments");
  await expect(admin.getByRole("region", { name: "Yallapp's iyzico account" })).toBeVisible();
  await expect(admin.getByRole("region", { name: "Shops selling through Yallapp" })).toHaveCount(0);
  await expect(admin.getByRole("region", { name: "Yallapp's payment provider" })).toHaveCount(0);
  await expect(admin.getByLabel("Commission (%)")).toHaveCount(0);
  await expect(admin.getByRole("main")).not.toContainText(/marketplace/i);

  await admin.goto("/admin/switches");
  await expect(admin.getByText("Paying plans by card", { exact: true })).toBeVisible();
  await expect(admin.getByText("Selling through Yallapp's payment account")).toHaveCount(0);

  await admin.goto(`/admin?q=${encodeURIComponent(shop.email)}`);
  await admin.getByRole("link", { name: `Activate ${shop.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("a shop without a website only adds its own payment account", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();

  await own.getByRole("link", { name: "Products", exact: true }).click();
  const payments = own.getByRole("region", { name: "Card payments" });
  await expect(payments.getByText("Use your own payment account")).toBeVisible();
  await expect(payments.getByLabel("Payment provider")).toBeVisible();
  await expect(payments.getByRole("button", { name: "Sell through Yallapp" })).toHaveCount(0);
  await expect(payments).not.toContainText(/commission|through Yallapp/i);
});

test("the public pages never offer selling through Yallapp's account", async ({ page }) => {
  for (const path of ["/pricing", "/faq", "/terms", "/privacy"]) {
    await page.goto(path);
    await expect(page.getByRole("main"), path).not.toContainText(/marketplace|sub-merchant|commission on (each|your) sale/i);
  }
  // The terms say each business takes its customers' payments in its own account.
  await page.goto("/terms");
  await expect(page.getByRole("main")).toContainText("isn't a party to those sales");
});
