import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakePaypal, startFakeStripe, type FakeServer } from "./fake-stripe-paypal-servers";
import { solidPng } from "./png";

/**
 * 96.1 A shop takes payments with its own Stripe account, then its own PayPal
 * account: the keys are checked and kept, the customer pays on their pages
 * (fakes), and our server reads each payment back (PayPal's captured) before
 * the order is paid. Yallapp never takes any of the money.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.196" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const shop = { name: "Harbour Mugs", email: `harbour-${suffix}@shop.test`, password: "harbour-strong-password-1" };
let stripe: FakeServer;
let paypal: FakeServer;
let api = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test.beforeAll(async () => {
  stripe = await startFakeStripe(E2E.stripePort);
  paypal = await startFakePaypal(E2E.paypalPort);
});

test.afterAll(async () => {
  await stripe.close();
  await paypal.close();
});

async function buyTwo(page: Page, request: import("@playwright/test").APIRequestContext, provider: string, total: string) {
  const products = await (await request.get(`${api}/store/products`)).json();
  const checkout = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0].id, quantity: 2 }] } });
  const { url } = (await checkout.json()) as { url: string };
  await page.goto(url);
  await expect(page.getByText(`Card payments are processed securely by ${provider}.`)).toBeVisible();
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Mobile number").fill("+90 532 111 22 33");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("City").fill("London");
  await page.getByLabel("Address").fill("1 Baker Street");
  await page.getByRole("button", { name: `Pay ${total}` }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
}

test("a shop takes an order on its own Stripe, then on its own PayPal", async ({ page, request }) => {
  test.setTimeout(180_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(shop.name);
  await page.getByLabel("Email").fill(shop.email);
  await page.getByLabel("WhatsApp number").fill("+44 7700 900456");
  await page.getByLabel("Password", { exact: true }).fill(shop.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await signIn(page, E2E.gatewaysAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(shop.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${shop.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, shop.email, shop.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByLabel("Currency").selectOption("USD");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();

  // Stripe: the secret key alone, test or live by its prefix (no switch to tick).
  const payments = page.getByRole("region", { name: "Card payments" });
  await expect(payments).toContainText("iyzico, Kashier, Fawaterk, Stripe or PayPal");
  await expect(payments).toContainText("Yallapp never takes any of it.");
  await payments.getByLabel("Payment provider").selectOption("stripe");
  await expect(payments.getByLabel("API key")).toHaveCount(0);
  await expect(payments.getByRole("checkbox")).toHaveCount(0);
  await payments.getByLabel("Secret key").fill("pk_test_publishable123456");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Paste your Stripe secret key: it starts with sk_live_ or sk_test_.")).toBeVisible();
  await payments.getByLabel("Secret key").fill("sk_test_51HarbourMugsKey");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved.")).toBeVisible();
  await expect(payments.getByText("On · your Stripe account · sandbox (test payments)")).toBeVisible();

  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Harbour Mug");
  await page.getByLabel("Price (USD)", { exact: true }).fill("12.50");
  await page.locator('input[name="images"]').setInputFiles({ name: "mug.png", mimeType: "image/png", buffer: solidPng(64, 64, [40, 90, 160]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status")).toContainText("Saved “Harbour Mug”.");
  await page.getByRole("link", { name: /Harbour Mug/ }).click();
  const link = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(link)![1]}`;

  const customer = await page.context().browser()!.newPage({ extraHTTPHeaders });
  await buyTwo(customer, request, "Stripe", "$25.00");
  // The session was made with the shop's own key and read back before the order was paid.
  const sessionCalls = stripe.calls.filter((c) => c.path.startsWith("/v1/checkout/sessions"));
  expect(sessionCalls.map((c) => c.method)).toEqual(expect.arrayContaining(["POST", "GET"]));
  expect(new Set(sessionCalls.map((c) => c.headers.authorization))).toEqual(new Set(["Bearer sk_test_51HarbourMugsKey"]));

  // PayPal: the REST app's client ID and secret, with the sandbox switch.
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await payments.getByLabel("Payment provider").selectOption("paypal");
  await payments.getByLabel("Client ID").fill("AYharbour-client");
  await payments.getByLabel("Secret").fill("harbour-paypal-secret");
  await payments.getByRole("checkbox", { name: /Sandbox credentials/ }).check();
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("PayPal keys saved.")).toBeVisible();
  // The menu still shows the provider just saved.
  await expect(payments.getByLabel("Payment provider")).toHaveValue("paypal");
  await expect(payments.getByText("On · your PayPal account · sandbox (test payments)")).toBeVisible();

  await buyTwo(customer, request, "PayPal", "$25.00");
  // Approved on PayPal's page, then captured by our server once, with the shop's own credentials.
  expect(paypal.calls.filter((c) => c.path.endsWith("/capture"))).toHaveLength(1);
  expect(paypal.calls.find((c) => c.path === "/v1/oauth2/token")!.headers.authorization).toBe(`Basic ${Buffer.from("AYharbour-client:harbour-paypal-secret").toString("base64")}`);
  await customer.close();

  await page.getByRole("link", { name: "Orders", exact: true }).click();
  const orders = page.getByRole("listitem").filter({ hasText: "Ada Lovelace" });
  await expect(orders).toHaveCount(2);
  await expect(orders.first()).toContainText("$25.00");
  await expect(orders.first()).toContainText("Harbour Mug × 2");
});
