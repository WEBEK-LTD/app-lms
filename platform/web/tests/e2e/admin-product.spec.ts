import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 78.2 Admin › Product: a sign-up from a campaign shows in this month's
 * sign-ups and in the sources; the daily job's snapshot fills the clients
 * with a plan running.
 */

const suffix = Date.now().toString(36);
const campaign = `product-${suffix}`;

test("a campaign's sign-up reaches Admin › Product, with the daily snapshot", async ({ browser, request }) => {
  const visitor = await browser.newPage();
  await visitor.goto(`/pricing?utm_source=${campaign}&utm_medium=email`);
  await visitor.locator('a[href="/sign-up"]:visible').first().click();
  await expect(visitor).toHaveURL(/\/sign-up$/);
  await visitor.getByLabel("Full name").fill("Rosa Product");
  await visitor.getByLabel("Email").fill(`rosa-${suffix}@product.test`);
  await visitor.getByLabel("WhatsApp number").fill("+90 544 000 00 31");
  await visitor.getByLabel("Password", { exact: true }).fill("rosa-strong-password-1");
  await visitor.getByRole("checkbox").check();
  await visitor.getByRole("button", { name: "Create account" }).click();
  await expect(visitor).toHaveURL(/\/pending$/);
  await visitor.close();

  const daily = await request.post("/api/internal/daily", { headers: { authorization: `Bearer ${E2E.internalJobSecret}` } });
  expect(daily.ok()).toBe(true);
  const report = await daily.json();
  expect(report.productDay).toMatchObject({ day: new Date().toISOString().slice(0, 10) });
  expect(report.milestones.clients).toBeGreaterThan(0);

  const page = await browser.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E.settingsAdminEmail);
  await page.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
  await page.getByRole("link", { name: "Product", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Product" })).toBeVisible();

  const month = new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const funnel = page.getByRole("table", { name: "Sign-ups by month and the steps they reached" });
  await expect(funnel.getByRole("row").nth(1).getByRole("rowheader")).toHaveText(month);
  expect(Number(await funnel.getByRole("row").nth(1).getByRole("cell").first().textContent())).toBeGreaterThan(0);

  const sources = page.getByRole("table", { name: "Sign-ups by source" });
  await expect(sources.getByRole("row", { name: new RegExp(`${campaign} / email`) })).toContainText("0 (0%)");

  await expect(page.getByRole("table", { name: "Builds by month" }).getByRole("rowheader").first()).toHaveText(month);
  await expect(page.getByRole("table", { name: "Clients with a plan running by month" }).getByRole("rowheader").first()).toHaveText(month);
  await page.close();
});
