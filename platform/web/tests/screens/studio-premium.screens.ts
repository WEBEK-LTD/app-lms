import fs from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext, type Browser, type Locator, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 132.130 Screenshots of Studio's premium pages (components/studio-page):
 * a Studio shop from the Shop template (its sample products), paid and
 * waiting orders placed on its payment page by bank transfer, its Plan and
 * the account, in Arabic (light and dark at 1440×900, light at 390 wide)
 * and the products in English; the orders' empty state before the first
 * order. Not part of the test suite; run it with
 * `SCREENS_OUT=<dir> SCREENS_PREFIX=after npx playwright test --config playwright.screens.config.ts studio-premium`
 * (SCREENS_PREFIX=before on the commit before, to compare).
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const PREFIX = process.env.SCREENS_PREFIX ?? "after";
const suffix = Date.now().toString(36);
const owner = { name: "Nour Adel", email: `nour-premium-${suffix}@studio.test`, password: "nour-premium-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.140" };

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 2), extraHTTPHeaders });

const CUSTOMERS = [
  { name: "Sara Yilmaz", phone: "+90 532 123 45 67", city: "Istanbul", address: "Moda Cd. 12, Kadıköy" },
  { name: "Omar Hassan", phone: "+20 100 222 3344", city: "Cairo", address: "9 Road 9, Maadi" },
  { name: "Layla Mansour", phone: "+20 122 555 7788", city: "Alexandria", address: "14 Fouad St, Downtown" },
  { name: "Deniz Kaya", phone: "+90 533 444 55 66", city: "Izmir", address: "Kordon 5, Alsancak" },
  { name: "Mona Adel", phone: "+20 111 333 9900", city: "Giza", address: "3 Mesaha Sq, Dokki" },
];

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
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-${name}.jpg`), type: "jpeg", quality: 85 });
  await page.screenshot({ path: path.join(OUT, "full", `${PREFIX}-${name}.jpg`), type: "jpeg", quality: 70, fullPage: true });
}

const sideMenu = (page: Page) => page.locator("nav:has([data-studio-search])").first();

async function language(page: Page, lang: "en" | "ar") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio/project");
  await sideMenu(page).getByRole("button", { name: lang === "ar" ? "العربية" : "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

/** A customer orders on the payment page and picks a bank transfer. */
async function order(browser: Browser, request: APIRequestContext, api: string, productId: number, quantity: number, who: (typeof CUSTOMERS)[number], i: number) {
  const link = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: productId, quantity }] } });
  expect(link.status(), await link.text()).toBe(200);
  const customer = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${150 + i}` } });
  await customer.goto(((await link.json()) as { url: string }).url);
  await customer.getByLabel("Full name").fill(who.name);
  await customer.getByLabel("Mobile number").fill(who.phone);
  await customer.getByLabel("Email").fill(`${who.name.split(" ")[0]!.toLowerCase()}-${suffix}@example.com`);
  await customer.getByLabel("City").fill(who.city);
  await customer.getByLabel("Address").fill(who.address);
  await customer.getByRole("radio", { name: "Bank transfer" }).check();
  await customer.getByRole("button", { name: /^Place order/ }).click();
  await expect(customer).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
  await customer.close();
}

/** Arabic light and dark at the desktop width, then light on a phone. */
async function pageShots(page: Page, href: string, name: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(href);
  await shoot(page, `${name}-ar-light-desktop`);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await shoot(page, `${name}-ar-dark-desktop`);
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await shoot(page, `${name}-ar-light-phone`);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  fs.appendFileSync(path.join(OUT, `${PREFIX}-widths.txt`), `${name} phone scrollWidth ${width}\n`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

test("Studio's premium pages", async ({ page, browser, request }) => {
  test.setTimeout(900_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(owner.name);
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("WhatsApp number").fill("+20 100 000 1320");
  await page.getByLabel("Password", { exact: true }).fill(owner.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-up");
  await signIn(page, E2E.studioSetupAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(owner.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${owner.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");
  await signIn(page, owner.email, owner.password);

  // A Studio shop from the Shop template: its sample products, with their pictures.
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "Store", exact: true }).check();
  await page.getByRole("radio", { name: "No website: everything from here" }).click();
  await page.getByLabel("Project name").fill("Nour Flowers");
  await page.getByRole("radio", { name: "Shop", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });

  // The team activates the project on a Studio plan.
  const admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.studioSetupAdminEmail, E2E.adminPassword);
  await admin.goto(`/admin/clients?q=${encodeURIComponent(owner.email)}`);
  await admin.getByRole("link", { name: owner.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: "Nour Flowers" }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A bank transfer, so customers can order without a card.
  await page.goto("/studio/project/payments");
  const other = page.getByRole("region", { name: "Bank transfer and your own method" });
  await other.getByLabel("Your own method's name").fill("Cash on delivery");
  await other.getByLabel("Bank details").fill("Nour Flowers LLC\nIBAN EG00 0001 0002 0003 0004 0005 06");
  await other.getByLabel("What the customer does").fill("Pay the courier when your flowers arrive.");
  await other.getByRole("button", { name: "Save payment methods" }).click();
  await expect(other.getByText("Payment methods saved.")).toBeVisible();

  // The app's API, from a product's share link.
  await page.goto("/studio/project/catalog");
  await page.locator("[data-product] a[href*='/catalog/']").first().click();
  await page.waitForURL(/\/catalog\/\d+$/);
  const share = (await page.getByRole("link", { name: /\/shop\// }).first().textContent())!;
  const api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(share)![1]}`;

  await language(page, "ar");
  // The empty state, before the first order.
  await page.goto("/studio/project/orders");
  await shoot(page, "orders-empty-ar-light-desktop");

  const listed = await request.get(`${api}/store/products?per_page=20`);
  const products = (await listed.json()) as { items: { id: number }[] };
  expect(products.items, `${api} ${listed.status()} ${JSON.stringify(products).slice(0, 300)}`).toBeTruthy();
  for (const [i, who] of CUSTOMERS.entries()) await order(browser, request, api, products.items[i % products.items.length]!.id, 1 + (i % 2), who, i);

  // Four of five paid; one shipped, one completed. (Since 132.132 an order's details are in its drawer, its row has one action.)
  await page.goto("/studio/project/orders");
  const action = (row: Locator, status: string) => row.locator(`form:has(input[name=status][value=${status}]) button`).filter({ visible: true }).first();
  for (let i = 0; i < 4; i++) {
    await action(page.locator("[data-awaiting]").last(), "processing").click();
    await expect(page.locator("[data-awaiting]")).toHaveCount(4 - i);
  }
  const shipped = page.getByRole("listitem").filter({ hasText: CUSTOMERS[1]!.name }).first();
  const drawer = shipped.locator("button[aria-haspopup=dialog]");
  if (await drawer.count()) await drawer.first().click();
  const shipping = shipped.locator("[data-shipping-form]");
  await shipping.locator("input[name=carrier]").fill("Aramex");
  await shipping.locator("input[name=trackingNumber]").fill("AX-48213377");
  await shipping.getByRole("button").click();
  await expect(shipping.getByRole("status")).toBeVisible();
  await page.reload();
  await action(page.getByRole("listitem").filter({ hasText: CUSTOMERS[0]!.name }).first(), "completed").click();
  await page.waitForTimeout(1500);

  await pageShots(page, "/studio/project/catalog", "catalog");
  await pageShots(page, "/studio/project/orders", "orders");
  await pageShots(page, "/studio/project/license", "license");
  await pageShots(page, "/studio/account", "account");

  // What opens on demand: an order's drawer, and the long help behind "?" (132.130 on).
  await page.goto("/studio/project/orders");
  const open = page.locator("[data-order] button[aria-haspopup=dialog]").first();
  if (await open.count()) {
    await open.click();
    await shoot(page, "orders-drawer-ar-light-desktop");
    await page.keyboard.press("Escape");
    await page.locator("[data-kit-header] button[aria-expanded]").first().click();
    await shoot(page, "orders-help-ar-light-desktop");
  }

  await language(page, "en");
  await page.goto("/studio/project/catalog");
  await shoot(page, "catalog-en-light-desktop");
});
