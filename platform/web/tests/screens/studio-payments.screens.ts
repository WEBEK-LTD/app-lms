import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeStripe } from "../e2e/fake-stripe-paypal-servers";

/**
 * 132.145, 132.180 Screenshots of the Payments page: a Studio shop from the
 * Shop template with nothing connected (Arabic, light and dark at
 * 1440×900, light at 390 wide), then with Stripe connected (a fake Stripe)
 * and tested, bank transfer and cash on delivery both on, its parts opened
 * (the gateway's keys, How customers pay), and the customer's payment page
 * offering all three. Not part of the test suite; run it with
 * `SCREENS_OUT=<dir> SCREENS_PREFIX=after npx playwright test --config playwright.screens.config.ts studio-payments`
 * (SCREENS_PREFIX=before on main, to compare: the steps it doesn't have are skipped).
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const PREFIX = process.env.SCREENS_PREFIX ?? "after";
const suffix = Date.now().toString(36);
const owner = { name: "Nour Adel", email: `nour-payments-${suffix}@studio.test`, password: "nour-payments-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.145" };

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 2), extraHTTPHeaders });

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** The page's top (the viewport) for the report, and all of it beside it to review. */
async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  fs.mkdirSync(path.join(OUT, "full"), { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-${name}.png`) });
  await page.screenshot({ path: path.join(OUT, "full", `${PREFIX}-${name}.png`), fullPage: true });
}

/** Arabic light and dark at the desktop width, then light on a phone (and its width, for sideways scrolling). */
async function pageShots(page: Page, href: string, name: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(href);
  await shoot(page, `${name}-ar-light-1440`);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await shoot(page, `${name}-ar-dark-1440`);
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await shoot(page, `${name}-ar-light-390`);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  fs.appendFileSync(path.join(OUT, `${PREFIX}-widths.txt`), `${name} phone scrollWidth ${width}\n`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

/** The gateway's keys, opened from its row where they are closed (on main they are always open). */
async function openGateway(page: Page) {
  const card = page.locator("section[aria-labelledby=h-payments]");
  const edit = card.locator("[data-gateway-edit]");
  if ((await edit.count()) && (await edit.getAttribute("aria-expanded")) !== "true") await edit.click();
  return card;
}

test("the Payments page", async ({ page, browser, request }) => {
  test.setTimeout(600_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(owner.name);
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("WhatsApp number").fill("+20 100 000 1450");
  await page.getByLabel("Password", { exact: true }).fill(owner.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-up");
  const admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.studioSetupAdminEmail, E2E.adminPassword);
  await admin.goto("/admin/clients");
  await admin.getByRole("searchbox", { name: "Search clients" }).fill(owner.email);
  await admin.getByRole("button", { name: "Search" }).click();
  await admin.getByRole("link", { name: `Activate ${owner.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await signIn(page, owner.email, owner.password);

  // A Studio shop from the Shop template, on a Studio plan.
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "Store", exact: true }).check();
  await page.getByRole("radio", { name: "No website: everything from here" }).click();
  await page.getByLabel("Project name").fill("Nour Flowers");
  await page.getByRole("radio", { name: "Shop", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });
  await admin.goto(`/admin/clients?q=${encodeURIComponent(owner.email)}`);
  await admin.getByRole("link", { name: owner.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: "Nour Flowers" }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // The app's API, from a product's share link (the product opens in its inspector on the console, its page on main).
  await page.goto("/dashboard/catalog");
  await page.waitForURL(/\/catalog$/);
  const first = page.locator("[data-product]").first();
  if (await first.locator("a[href*='/catalog/']").count()) await first.locator("a[href*='/catalog/']").first().click();
  else {
    await first.locator(".kit-tr-open").first().click();
    await page.getByRole("link", { name: "Edit product" }).click();
  }
  await page.waitForURL(/\/catalog\/\d+$/);
  const share = (await page.getByRole("link", { name: /\/shop\// }).first().textContent())!;
  const api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(share)![1]}`;

  // Arabic, the dashboard's Egyptian.
  await page.context().addCookies([{ name: "yallapp_lang", value: "ar", url: E2E.baseURL }]);
  await page.goto("/studio/project");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");

  // Nothing connected yet.
  await pageShots(page, "/studio/project/payments", "payments");
  // Connect a card gateway: its keys open in their row.
  const connect = page.locator("[data-gateway-connect]");
  if (await connect.count()) {
    await connect.click();
    await expect(page.locator("#gateway-editor")).toBeVisible();
    await shoot(page, "payments-connect-open-ar-light-1440");
  }

  // Stripe connected and tested, bank transfer and cash on delivery on.
  const stripe = await startFakeStripe(E2E.stripePort, { accountName: "Nour Flowers" });
  try {
    await page.goto("/studio/project/payments");
    const card = await openGateway(page);
    await card.locator('[data-gateway="stripe"]').click();
    await card.locator("input[name=publishableKey]").fill("pk_test_51NourFlowersKey");
    await card.locator("input[name=secretKey]").fill("sk_test_51NourFlowersKey");
    await card.locator("form[novalidate] button[type=submit]").first().click();
    await expect(card.getByTestId("gateway-saved")).toBeVisible();
    await card.getByRole("button", { name: "جرّب الاتصال" }).click();
    await expect(card.getByTestId("gateway-test-results")).toBeVisible();

    const other = page.locator("section[aria-labelledby=h-other-payments]");
    const switches = other.getByRole("switch");
    for (let i = 0; i < (await switches.count()); i++) await switches.nth(i).check();
    await other.locator("textarea[name=bankTransfer]").fill("Nour Flowers LLC\nIBAN EG00 0001 0002 0003 0004 0005 06");
    await other.locator("input[name=customName]").fill("الدفع عند الاستلام");
    await other.locator("textarea[name=customInstructions]").fill("ادفع للمندوب لما الورد يوصلك.");
    await other.locator("button[type=submit]").last().click();
    await expect(other.getByRole("status").first()).toBeVisible();

    await pageShots(page, "/studio/project/payments", "payments-connected");
    // Its parts opened on demand (on the console): the gateway's keys (Edit), then How customers pay (Change).
    await page.goto("/studio/project/payments");
    const change = page.locator("[data-how-change]");
    if (await change.count()) {
      await openGateway(page);
      await page.locator("#gateway").scrollIntoViewIfNeeded();
      await shoot(page, "payments-connected-edit-ar-light-1440");
      await page.goto("/studio/project/payments");
      await change.click();
      await page.locator("#how-customers-pay").scrollIntoViewIfNeeded();
      await shoot(page, "payments-connected-how-ar-light-1440");
    }

    // The customer's payment page offers all three.
    const products = (await (await request.get(`${api}/store/products?per_page=5`)).json()) as { items: { id: number }[] };
    const link = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0]!.id, quantity: 1 }] } });
    expect(link.status(), await link.text()).toBe(200);
    const customer = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 2), extraHTTPHeaders: { "x-forwarded-for": "198.51.100.146" } });
    await customer.goto(((await link.json()) as { url: string }).url);
    await expect(customer.locator("input[name=pay-method]")).toHaveCount(3);
    await customer.evaluate(() => document.fonts.ready);
    await customer.waitForTimeout(500);
    await customer.screenshot({ path: path.join(OUT, `${PREFIX}-pay-page-three-ways-390.png`), fullPage: true });
    await customer.close();
  } finally {
    await stripe.close();
  }
});
