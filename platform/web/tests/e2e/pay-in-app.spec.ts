import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 170 Paying in the app in the phone's browser sheet (SFSafariViewController,
 * Chrome Custom Tabs), where Apple Pay and Google Pay show. The app opens
 * /pay/<token>/app: the payment's done, failed, pending and closed pages then
 * give "Back to the app" on the app's own address (by itself once paid), and
 * /pay/<token>/status says how it stands. The same pages in a browser (or an
 * app's web view, as apps already in the stores open them) are as before.
 *
 * A shop taking bank transfers: the order is placed with no card gateway, the
 * owner marks it paid or cancels it, so each page is reached for real.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.170" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const shop = { name: "Sheet Atlases", email: `sheet-${suffix}@shop.test`, password: "sheet-atlases-password-1" };
let api = "";
let appId = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** A new order's payment page, as the app gets it from the checkout. */
async function payLink(request: APIRequestContext): Promise<string> {
  const products = await (await request.get(`${api}/store/products`)).json();
  const checkout = await request.post(`${api}/store/checkout-link?platform=ios`, { data: { lines: [{ product_id: products.items[0].id, quantity: 1 }] } });
  return ((await checkout.json()) as { url: string }).url;
}

async function fillAndPlace(page: Page) {
  // Bank transfer is this shop's one way to pay: chosen already when it's the only one.
  if (await page.getByRole("radio").count()) await page.getByRole("radio", { name: "Bank transfer" }).check();
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Mobile number").fill("+90 532 111 22 44");
  await page.getByLabel("Email").fill(`ada-${suffix}@example.com`);
  await page.getByLabel("City").fill("Istanbul");
  await page.getByLabel("Address").fill("Moda Caddesi 12, Kadıköy");
  await page.getByRole("button", { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
}

/** A fresh browser: its own cookies, as a phone's browser sheet or another phone. */
async function fresh(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders });
  return context.newPage();
}

const scheme = () => `yallapp-${appId.replace(/-/g, "")}`;
const backLink = (page: Page) => page.locator("[data-app-return]");
const statusOf = async (request: APIRequestContext, url: string) => (await (await request.get(`${url}/status`)).json()) as { state: string };

test("a shop that takes bank transfers", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(shop.name);
  await page.getByLabel("Email").fill(shop.email);
  await page.getByLabel("WhatsApp number").fill("+44 7700 900170");
  await page.getByLabel("Password", { exact: true }).fill(shop.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/start$/);

  await signIn(page, E2E.payInAppAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(shop.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${shop.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, shop.email, shop.password);
  await page.getByRole("link", { name: "Start from an empty app" }).click();
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("navigation", { name: "Products", exact: true }).getByRole("link", { name: /^Payments/ }).click();
  const other = page.getByRole("region", { name: "Bank transfer and your own method" });
  await other.getByRole("switch", { name: "Bank transfer" }).check();
  await other.getByLabel("Bank details").fill("Sheet Atlases Ltd\nIBAN TR00 0001 0002 0003 0004 0005 06");
  await other.getByRole("button", { name: "Save payment methods" }).click();
  await expect(other.getByText("Payment methods saved.")).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Atlas of Harbours");
  await page.getByLabel("Price (TRY)", { exact: true }).fill("450");
  await page.locator('input[name="images"]').setInputFiles({ name: "atlas.png", mimeType: "image/png", buffer: solidPng(64, 64, [30, 80, 140]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Atlas of Harbours”.");
  await page.getByRole("button", { name: /^Atlas of Harbours/ }).click();
  await page.getByRole("link", { name: "Edit product" }).click();
  const link = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  appId = /\/shop\/([0-9a-f-]{36})\//.exec(link)![1]!;
  api = `${E2E.baseURL}/api/app/${appId}`;
});

test("in a browser (and an app's web view): the pages as before, no way back to an app", async ({ browser, request }) => {
  const url = await payLink(request);
  const page = await fresh(browser);
  await page.goto(`${url}?payment=failed`);
  await expect(page.getByText("The payment didn't go through")).toBeVisible();
  await expect(backLink(page)).toHaveCount(0);
  await page.goto(url);
  await fillAndPlace(page);
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await expect(backLink(page)).toHaveCount(0);
  await expect(page.getByText("Back to the app")).toHaveCount(0);
  await page.context().close();
});

test("from the app's browser sheet: back to the app from the done, failed, pending and closed pages", async ({ browser, request, page: owner }) => {
  test.setTimeout(120_000);
  // The app opens the payment through /app: marked as the app's, then its payment page.
  const url = await payLink(request);
  const token = new URL(url).pathname.split("/")[2]!;
  const sheet = await fresh(browser);
  const entry = await sheet.goto(`${url}/app`);
  expect(entry?.url()).toBe(url);
  const cookie = (await sheet.context().cookies()).find((c) => c.name === "yallapp_app_pay");
  expect(cookie).toMatchObject({ value: "1", path: `/pay/${token}`, httpOnly: true, sameSite: "Lax" });
  expect(await statusOf(request, url)).toEqual({ state: "open" });

  // A failed or pending payment: the page to try again, and the way back (not by itself).
  await sheet.goto(`${url}?payment=failed`);
  await expect(sheet.getByText("The payment didn't go through")).toBeVisible();
  await expect(backLink(sheet)).toHaveAttribute("href", new RegExp(`^${scheme()}://app/pay-return\\?order=\\d+&result=failed$`));
  await expect(backLink(sheet)).not.toHaveAttribute("data-app-return-auto", "");
  await sheet.goto(`${url}?payment=pending`);
  await expect(backLink(sheet)).toHaveAttribute("href", /&result=pending$/);
  // The return link never carries the payment's token.
  expect(await backLink(sheet).getAttribute("href")).not.toContain(token);

  // Placed by bank transfer: the details to read here, and the way back.
  await sheet.goto(url);
  await fillAndPlace(sheet);
  await expect(sheet.getByRole("heading", { name: "Order placed" })).toBeVisible();
  const number = /Your order (\S+) is waiting/.exec((await sheet.locator("main").textContent()) ?? "")![1]!;
  await expect(backLink(sheet)).toHaveAttribute("href", /&result=placed$/);
  await expect(backLink(sheet)).not.toHaveAttribute("data-app-return-auto", "");
  expect(await statusOf(request, url)).toEqual({ state: "awaiting_payment" });

  // The owner marks it paid: the done page goes back to the app by itself.
  await signIn(owner, shop.email, shop.password);
  await owner.goto("/dashboard/orders");
  // The other test's order waits too: this one, by its number.
  const mine = owner.getByRole("region", { name: "Waiting for payment" }).getByRole("listitem").filter({ has: owner.getByRole("button", { name: new RegExp(`^Order ${number}\\b`) }) });
  await mine.getByRole("button", { name: "Mark as paid" }).click();
  await expect.poll(async () => (await statusOf(request, url)).state).toBe("paid");
  await sheet.goto(`${url}/order-received`);
  await expect(sheet.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await expect(backLink(sheet)).toHaveAttribute("href", /&result=paid$/);
  await expect(backLink(sheet)).toHaveAttribute("data-app-return-auto", "");

  // The same paid order in a browser that isn't the app's sheet: as before.
  const elsewhere = await fresh(browser);
  await elsewhere.goto(`${url}/order-received`);
  await expect(elsewhere.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await expect(backLink(elsewhere)).toHaveCount(0);
  await elsewhere.context().close();

  // Cancelled by the owner: the closed note leads back too.
  const second = await payLink(request);
  await sheet.goto(`${second}/app`);
  await fillAndPlace(sheet);
  const secondNumber = /Your order (\S+) is waiting/.exec((await sheet.locator("main").textContent()) ?? "")![1]!;
  await owner.reload();
  const row = owner.getByRole("region", { name: "Waiting for payment" }).getByRole("listitem").filter({ has: owner.getByRole("button", { name: new RegExp(`^Order ${secondNumber}\\b`) }) });
  await row.getByRole("button", { name: new RegExp(`^Order ${secondNumber}\\b`) }).click();
  await row.getByRole("button", { name: "Cancel order" }).click();
  await expect.poll(async () => (await statusOf(request, second)).state).toBe("closed");
  await sheet.goto(second);
  await expect(sheet.getByRole("heading", { name: "Order closed" })).toBeVisible();
  await expect(backLink(sheet)).toHaveAttribute("href", /&result=closed$/);
  // The first payment's cookie is kept to its own pages: this one has its own.
  const paths = (await sheet.context().cookies()).filter((c) => c.name === "yallapp_app_pay").map((c) => c.path);
  expect(paths.sort()).toEqual([`/pay/${token}`, `/pay/${new URL(second).pathname.split("/")[2]}`].sort());
  await sheet.context().close();
});

test("/app and /status refuse what isn't a payment link", async ({ request }) => {
  const entry = await request.get("/pay/nope/app", { maxRedirects: 0 });
  expect(entry.status()).toBe(404);
  expect(entry.headers()["set-cookie"]).toBeUndefined();
  const status = await request.get("/pay/AAAAAAAAAAAAAAAAAAAAAAAA/status");
  expect(status.status()).toBe(404);
  expect(await status.json()).toEqual({ state: "not_found" });
});
