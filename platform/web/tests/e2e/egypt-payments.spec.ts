import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeFawaterk, startFakeKashier, type FakeGateway } from "./fake-gateways";
import { solidPng } from "./png";

/** 175 A shop that has prices already chooses what a new currency does to them: here, keep the numbers. */
async function keepPrices(p: Page) {
  const keep = p.getByLabel("Keep the numbers as they are");
  if (await keep.isVisible()) await keep.check();
}


/**
 * Roadmap 37: Kashier and Fawaterk next to iyzico. The team adds Yallapp's
 * Kashier and Fawaterk accounts and picks the provider; a new client pays
 * their plan in Egyptian pounds on Kashier, then extends it on Fawaterk; a
 * shop with its own Kashier keys takes an order (153 in Kashier's form,
 * inside our payment page). Each payment page is a fake (fake-gateways.ts)
 * that posts its signed webhook and sends the browser back; our server
 * reads the payment back before marking it paid.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-ups never use up the shared sign-up limit of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.237" };
test.use({ extraHTTPHeaders });

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
  await expect(page).toHaveURL(/\/start$/);
  // 121 Active from the start: the first plan is paid on the Plan page.
  await page.goto("/dashboard/license");
}

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  fawaterk = await startFakeFawaterk(E2E.fawaterkPort);
  admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.paymentsAdminEmail, E2E.adminPassword);
  own = await browser.newPage({ extraHTTPHeaders });
});

test.afterAll(async () => {
  await admin.close();
  await own.close();
  await kashier.close();
  await fawaterk.close();
});

test("the team adds Yallapp's Kashier and Fawaterk accounts", async () => {
  await admin.goto("/admin/settings/payments");
  // 72 No provider to choose for shop sales: Yallapp never takes them.
  await expect(admin.getByRole("region", { name: "Yallapp's payment provider" })).toHaveCount(0);

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

  // 52 Plans go through Kashier, in pounds, until the team chooses another gateway.
  await expect(admin.getByRole("region", { name: "Yallapp's plan payments" })).toContainText(/Now: Kashier[,( ]/);

  await admin.goto("/admin/plans?plan=pro");
  const pro = admin.getByRole("region", { name: "Pro" });
  await pro.getByLabel("A price").check();
  await pro.getByLabel("Price in EGP").fill("12000");
  await pro.getByLabel("Billed").selectOption("12");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(pro.getByText("Pro saved.")).toBeVisible();
});

test("a new client pays the plan in Egyptian pounds on Kashier", async () => {
  await signUp(own, client, "+20 100 123 4567");
  await expect(own.getByRole("heading", { name: "Pay by card" })).toBeVisible();
  // 121 On the Plan page, in the payment form (the plans above show the price too).
  await expect(own.locator("#renew").getByText(/EGP\s12,000 \/ year/)).toBeVisible();
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
  await admin.goto("/admin/settings/payments");
  // 52 Plans have their own gateway.
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("fawaterk");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's Fawaterk account.")).toBeVisible();

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
  await expect(rows.filter({ hasText: "Kashier" })).toContainText(/EGP\s12,000/);
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

  // 121 Without an app yet: the choice of editor or Studio first.

  await page.getByRole("link", { name: "Start from an empty app" }).click();
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  // 132.10 Products has its own pages: the shop's settings, payments and the products.
  await page.getByRole("navigation", { name: "Products", exact: true }).getByRole("link", { name: /^Settings/ }).click();

  // Prices in Egyptian pounds.
  await page.getByLabel("Currency", { exact: true }).selectOption("EGP");
  await keepPrices(page);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();

  await page.getByRole("navigation", { name: "Products", exact: true }).getByRole("link", { name: /^Payments/ }).click();
  // 132.120 The Products tab opens the one Payments page.
  await expect(page).toHaveURL(/\/(dashboard|studio\/project)\/payments$/);
  const payments = page.getByRole("region", { name: "Card payments" });
  // 132.180 Nothing connected yet: the gateway's keys open from its row.
  await payments.getByRole("button", { name: "Connect", exact: true }).click();
  await payments.locator('[data-gateway="kashier"]').click();
  await payments.getByLabel("Merchant ID").fill("MID-7777-001");
  await payments.getByLabel("Payment API key").fill("shop-kashier-api-key");
  await payments.getByLabel("Secret key").fill("shop-kashier-secret");
  await payments.getByText("Test mode keys").click();
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Kashier keys saved.")).toBeVisible();
  await expect(payments.getByText("On · your Kashier account · sandbox (test payments)")).toBeVisible();

  // 132.120 Back from the one Payments page by the menu.
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Lotus Bouquet");
  await page.getByLabel("Price (EGP)", { exact: true }).fill("850");
  await page.locator('input[name="images"]').setInputFiles({ name: "lotus.png", mimeType: "image/png", buffer: solidPng(64, 64, [240, 170, 200]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Lotus Bouquet”.");
  // 132.152 Its page, from its inspector.
  await page.getByRole("button", { name: /^Lotus Bouquet/ }).click();
  await page.getByRole("link", { name: "Edit product" }).click();
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
  // 153 Kashier's card form in this page: its session's page in a frame, under the details.
  await expect(page.getByRole("heading", { name: "Your card" })).toBeVisible();
  await expect(page.getByText("Enter your card to pay E£1,700.00. It goes straight to Kashier: the shop never sees its number.")).toBeVisible();
  await expect(page).toHaveURL(/\/pay\/[\w-]+$/);
  const form = page.frameLocator("iframe[data-kashier-embedded]");
  await expect(form.getByText("Total 1700.00")).toBeVisible();
  await form.getByRole("button", { name: "Pay with test card" }).click();
  // Kashier tells the page where it's done; the page goes on to our return address, which reads the payment back.
  await expect(page).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
  expect(kashier.paidInFrame).toHaveLength(1);
  // The shop's own keys took this payment, not Yallapp's.
  expect(kashier.calls.filter((c) => c.path === "/v3/payment/sessions").map((c) => c.authorization)).toEqual(["kashier-test-secret", "shop-kashier-secret"]);

  await signIn(page, shop.email, shop.password);
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  const order = page.getByRole("listitem").filter({ hasText: "Mona Hassan" });
  await expect(order).toContainText("E£1,700.00");
  await expect(order).toContainText("Lotus Bouquet × 2");

  // 132.33 Kashier's signed webhook was noted; 132.34 Test connection with the saved keys says it all works.
  expect(kashier.webhooks.at(-1)!.status).toBe(200);
  await page.getByRole("link", { name: "Products", exact: true }).click();
  // 132.10 The shop's payments are on their own tab.
  await page.getByRole("navigation", { name: "Products", exact: true }).getByRole("link", { name: /^Payments/ }).click();
  const saved = page.getByRole("region", { name: "Card payments" });
  // 132.145 Connected, the gateway's keys open from its row.
  await saved.getByRole("button", { name: "Edit" }).click();
  await expect(saved.getByTestId("gateway-saved")).toContainText("Saved: Kashier");
  await expect(saved.getByTestId("gateway-saved")).toContainText("Webhook working · last one");
  await expect(saved.getByText("Saved: …cret. Leave it empty to keep it.")).toBeVisible();
  await saved.getByRole("button", { name: "Test connection" }).click();
  const results = saved.getByTestId("gateway-test-results");
  await expect(results).toContainText("Everything works.");
  await expect(results).toContainText("Keys valid: Kashier accepted them.");
  await expect(results).toContainText("Mode: Test. No real money moves.");
  await expect(results).toContainText("Currency supported: Kashier takes EGP.");
  await expect(results).toContainText("Kashier gets its webhook address with each payment: nothing to set up at Kashier.");
  await expect(results).toContainText("Webhook working: the last one arrived");
  // A wrong secret typed in: Kashier refuses it, nothing is saved.
  await saved.getByLabel("Secret key").fill("wrong");
  await saved.getByRole("button", { name: "Test connection" }).click();
  await expect(results).toContainText("Kashier didn't accept the keys.");
  await expect(saved.getByTestId("gateway-saved")).toContainText("Saved: Kashier");
  await expect(page.locator("body")).not.toContainText("shop-kashier-secret");
});

test("the team puts the settings back", async () => {
  await admin.goto("/admin/plans?plan=pro");
  await admin.getByRole("region", { name: "Pro" }).getByRole("button", { name: "Back to the default plan" }).click();
  await admin.goto("/admin/settings/payments");
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("kashier");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's Kashier account.")).toBeVisible();
  await admin.getByRole("region", { name: "Yallapp's Kashier account" }).getByRole("button", { name: "Remove keys" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's Kashier account" })).toContainText("Now: not set.");
  await admin.getByRole("region", { name: "Yallapp's Fawaterk account" }).getByRole("button", { name: "Remove key" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's Fawaterk account" })).toContainText("Now: not set.");
});
