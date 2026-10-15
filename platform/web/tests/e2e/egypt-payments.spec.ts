import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeFawaterk, startFakeKashier, type FakeGateway } from "./fake-gateways";
import { solidPng } from "./png";

/**
 * Roadmap 37: Kashier and Fawaterk next to iyzico. The team adds Yallapp's
 * Kashier and Fawaterk accounts and picks the provider; a new client pays
 * their plan in Egyptian pounds on Kashier, then extends it on Fawaterk; a
 * shop with its own Kashier keys takes an order. Each payment page is a
 * fake (fake-gateways.ts) that posts its signed webhook and sends the
 * browser back; our server reads the payment back before marking it paid.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nile Academy", email: `nile-${suffix}@academy.test`, password: "nile-strong-password-1" };
const shop = { name: "Zamalek Flowers", email: `zamalek-${suffix}@shop.test`, password: "zamalek-strong-password-1" };
let kashier: FakeGateway;
let fawaterk: FakeGateway;
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

async function signUp(page: Page, who: { name: string; email: string; password: string }, whatsapp: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("WhatsApp number").fill(whatsapp);
  await page.getByLabel("Your website (optional)").fill(`https://${who.email.split("@")[0]}.example.test`);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);
}

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  fawaterk = await startFakeFawaterk(E2E.fawaterkPort);
  admin = await browser.newPage();
  await signIn(admin, E2E.paymentsAdminEmail, E2E.adminPassword);
  own = await browser.newPage();
});

test.afterAll(async () => {
  await admin.close();
  await own.close();
  await kashier.close();
  await fawaterk.close();
});

test("the team adds Yallapp's Kashier and Fawaterk accounts and picks Kashier", async () => {
  await admin.goto("/admin/settings");
  const provider = admin.getByRole("region", { name: "Yallapp's payment provider" });
  await expect(provider).toContainText("Now: iyzico (the default).");

  const k = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  await expect(k).toContainText("Now: not set.");
  await k.getByLabel("Merchant ID").fill("MID 12");
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("kashier-test-secret");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Enter the merchant ID, like MID-1234-567.")).toBeVisible();
  await k.getByLabel("Merchant ID").fill("MID-1234-567");
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("wrong");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Kashier didn't accept this test secret key.")).toBeVisible();
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("kashier-test-secret");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Kashier account saved.")).toBeVisible();
  await expect(k).toContainText("Test keys for MID-1234-567 saved by");
  await k.getByRole("button", { name: "Test connection" }).click();
  await expect(k.getByText("Connected: Kashier accepts the saved test keys.")).toBeVisible();
  // The keys never come back to the page.
  await expect(admin.locator("body")).not.toContainText("kashier-test-secret");

  const f = admin.getByRole("region", { name: "Yallapp's Fawaterk account" });
  await f.getByLabel("API key").fill("fawaterk-staging-key");
  await f.getByRole("button", { name: "Save key" }).click();
  await expect(f.getByText("Fawaterk account saved.")).toBeVisible();
  await f.getByRole("button", { name: "Test connection" }).click();
  await expect(f.getByText("Connected: Fawaterk accepts the saved test keys.")).toBeVisible();

  await provider.getByLabel("Provider").selectOption("kashier");
  await provider.getByRole("button", { name: "Save provider" }).click();
  await expect(provider.getByText("Payments go to Yallapp's Kashier account.")).toBeVisible();

  await admin.goto("/admin/plans");
  const pro = admin.getByRole("region", { name: "Pro" });
  await pro.getByLabel("Card price").fill("12000");
  await pro.getByLabel("Currency").selectOption("EGP");
  await pro.getByLabel("Billed").selectOption("12");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(pro.getByText("Pro saved.")).toBeVisible();
});

test("a new client pays the plan in Egyptian pounds on Kashier", async () => {
  await signUp(own, client, "+20 100 123 4567");
  await expect(own.getByRole("heading", { name: "Pay by card" })).toBeVisible();
  await expect(own.getByText("E£12,000.00")).toBeVisible();
  await expect(own.getByText("You enter your card on Kashier's secure page.")).toBeVisible();
  await own.getByLabel("City").fill("Cairo");
  await own.getByLabel("Billing address").fill("12 Tahrir Street, Downtown");
  await own.getByRole("button", { name: "Pay and activate" }).click();
  await expect(own.getByText("Total 12000.00")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();

  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("status").first()).toContainText("Payment received. Your plan is active until");
  // Kashier's webhook came first and paid it; the redirect found it paid. Both read the payment back.
  expect(kashier.webhooks).toMatchObject([{ status: 200, body: { received: true, status: "paid" } }]);
  expect(kashier.calls.filter((c) => c.path.endsWith("/payment")).length).toBeGreaterThanOrEqual(1);
  expect(kashier.calls.every((c) => !c.path.startsWith("/v3/") || c.authorization === "kashier-test-secret")).toBe(true);
});

test("with Fawaterk chosen, the client extends the plan there", async () => {
  await admin.goto("/admin/settings");
  const provider = admin.getByRole("region", { name: "Yallapp's payment provider" });
  await provider.getByLabel("Provider").selectOption("fawaterk");
  await provider.getByRole("button", { name: "Save provider" }).click();
  await expect(provider.getByText("Payments go to Yallapp's Fawaterk account.")).toBeVisible();

  await own.goto("/dashboard/license");
  const renew = own.getByRole("region", { name: "Extend by card or change plan" });
  await expect(renew).toContainText("You enter your card on Fawaterk's secure page.");
  await renew.getByLabel("City").fill("Giza");
  await renew.getByLabel("Billing address").fill("5 Pyramids Road, Haram");
  await renew.getByRole("button", { name: "Pay by card" }).click();
  await expect(own.getByText("Total 12000.00")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("main")).toContainText(String(new Date().getUTCFullYear() + 2));
  expect(fawaterk.webhooks).toMatchObject([{ status: 200, body: { received: true, status: "paid" } }]);

  await admin.goto("/admin/payments");
  const rows = admin.getByRole("row", { name: new RegExp(client.name) });
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Kashier" })).toContainText("E£12,000.00");
  await expect(rows.filter({ hasText: "Fawaterk" })).toContainText("Paid");
});

test("a shop with its own Kashier keys takes an order", async ({ page, request }) => {
  await signUp(page, shop, "+20 122 765 4321");
  await admin.goto("/admin/clients");
  await admin.getByRole("searchbox", { name: "Search clients" }).fill(shop.email);
  await admin.getByRole("button", { name: "Search" }).click();
  await admin.getByRole("link", { name: `Activate ${shop.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await signIn(page, shop.email, shop.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();

  // Prices in Egyptian pounds.
  await page.getByLabel("Currency").selectOption("EGP");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();

  const payments = page.getByRole("region", { name: "Card payments" });
  await payments.getByLabel("Payment provider").selectOption("kashier");
  await payments.getByLabel("Merchant ID").fill("MID-7777-001");
  await payments.getByLabel("Payment API key").fill("shop-kashier-api-key");
  await payments.getByLabel("Secret key").fill("shop-kashier-secret");
  await payments.getByText("Test mode keys").click();
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Kashier keys saved.")).toBeVisible();
  await expect(payments.getByText("On · your Kashier account · sandbox (test payments)")).toBeVisible();

  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Lotus Bouquet");
  await page.getByLabel("Price (EGP)", { exact: true }).fill("850");
  await page.locator('input[name="images"]').setInputFiles({ name: "lotus.png", mimeType: "image/png", buffer: solidPng(64, 64, [240, 170, 200]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status")).toContainText("Saved “Lotus Bouquet”.");
  await page.getByRole("link", { name: /Lotus Bouquet/ }).click();
  const link = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  const api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(link)![1]}`;

  const products = await (await request.get(`${api}/store/products`)).json();
  const checkout = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0].id, quantity: 2 }] } });
  const { url } = (await checkout.json()) as { url: string };
  await page.goto(url);
  await expect(page.getByText("Card payments are processed securely by Kashier.")).toBeVisible();
  await page.getByLabel("Full name").fill("Mona Hassan");
  await page.getByLabel("Mobile number").fill("+20 100 222 3344");
  await page.getByLabel("Email").fill("mona@example.com");
  await page.getByLabel("City").fill("Cairo");
  await page.getByLabel("Address").fill("26 July Street, Zamalek");
  await page.getByRole("button", { name: "Pay E£1,700.00" }).click();
  await expect(page.getByText("Total 1700.00")).toBeVisible();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
  // The shop's own keys took this payment, not Yallapp's.
  expect(kashier.calls.filter((c) => c.path === "/v3/payment/sessions").map((c) => c.authorization)).toEqual(["kashier-test-secret", "shop-kashier-secret"]);

  await signIn(page, shop.email, shop.password);
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  const order = page.getByRole("listitem").filter({ hasText: "Mona Hassan" });
  await expect(order).toContainText("E£1,700.00");
  await expect(order).toContainText("Lotus Bouquet × 2");
});

test("the team puts the settings back", async () => {
  await admin.goto("/admin/plans");
  await admin.getByRole("region", { name: "Pro" }).getByRole("button", { name: "Back to the default plan" }).click();
  await admin.goto("/admin/settings");
  const provider = admin.getByRole("region", { name: "Yallapp's payment provider" });
  await provider.getByLabel("Provider").selectOption("iyzico");
  await provider.getByRole("button", { name: "Save provider" }).click();
  await expect(provider.getByText("Payments go to Yallapp's iyzico account.")).toBeVisible();
  await admin.getByRole("region", { name: "Yallapp's Kashier account" }).getByRole("button", { name: "Remove keys" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's Kashier account" })).toContainText("Now: not set.");
  await admin.getByRole("region", { name: "Yallapp's Fawaterk account" }).getByRole("button", { name: "Remove key" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's Fawaterk account" })).toContainText("Now: not set.");
});
