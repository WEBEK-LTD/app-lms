import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakePaypal, startFakeStripe, type FakeServer } from "./fake-stripe-paypal-servers";
import { solidPng } from "./png";

/**
 * 96.1 A shop takes payments with its own Stripe account, then its own PayPal
 * account: the keys are checked and kept, the customer pays on their pages
 * (fakes), and our server reads each payment back (PayPal's captured) before
 * the order is paid. Yallapp never takes any of the money. 132.30–132.34
 * Stripe takes both keys of one mode and the webhook's signing secret, its
 * signed webhook reaches our endpoint, and "Test connection" says item by
 * item what works. Every key here is made up.
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

/** What Stripe would send to the endpoint, signed with its secret (docs.stripe.com/webhooks/signature). */
function stripeSigned(body: string, secret: string): string {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

const SIGNING_SECRET = "whsec_HarbourMugsSigningSecret01";

test.beforeAll(async () => {
  stripe = await startFakeStripe(E2E.stripePort, { accountName: "Harbour Mugs" });
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
  const response = await page.goto(url);
  // 155 The payment page lets Stripe's frames use the Payment Request API (Apple Pay, Google Pay), and only it.
  expect(response!.headers()["permissions-policy"]).toBe('camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com" "https://checkout.stripe.com")');
  expect(response!.headers()["x-frame-options"]).toBe("DENY");
  await expect(page.getByText(`Card payments are processed securely by ${provider}.`)).toBeVisible();
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Mobile number").fill("+90 532 111 22 33");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("City").fill("London");
  await page.getByLabel("Address").fill("1 Baker Street");
  await page.getByRole("button", { name: `Pay ${total}` }).click();
  // 144 Stripe: its card form in this page (the fake Stripe.js's), under the details; PayPal: its own page.
  if (provider === "Stripe") {
    await expect(page.getByRole("heading", { name: "Your card" })).toBeVisible();
    await expect(page.getByText(`Enter your card to pay ${total}. It goes straight to Stripe: the shop never sees its number.`)).toBeVisible();
    await expect(page.locator("[data-stripe-embedded] [data-fake-stripe]")).toHaveAttribute("data-fake-stripe", /^pk_test_/);
    await expect(page).toHaveURL(/\/pay\/[\w-]+$/);
  } else {
    // 153 PayPal keeps its own page (its buttons would open PayPal's window, which the apps' web views can't).
    await expect(page).toHaveURL(new RegExp(`^http://localhost:${E2E.paypalPort}/`));
  }
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
  await expect(page).toHaveURL(/\/start$/);

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
  await page.getByLabel("Currency", { exact: true }).selectOption("USD");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();

  // Stripe: 132.30 the publishable and the secret key, test or live by their prefix (no switch to tick), with its guide and its webhook.
  await page.getByRole("navigation", { name: "Products", exact: true }).getByRole("link", { name: /^Payments/ }).click();
  // 132.120 The Products tab opens the one Payments page.
  await expect(page).toHaveURL(/\/(dashboard|studio\/project)\/payments$/);
  const payments = page.getByRole("region", { name: "Card payments" });
  await expect(payments).toContainText("iyzico, Kashier, Fawaterk, Stripe or PayPal");
  await expect(payments).toContainText("Yallapp never takes any of it.");
  // 132.180 Nothing connected yet: the gateway's keys open from its row.
  await payments.getByRole("button", { name: "Connect", exact: true }).click();
  await payments.locator('[data-gateway="stripe"]').click();
  await expect(payments.getByLabel("API key")).toHaveCount(0);
  await expect(payments.getByRole("checkbox")).toHaveCount(0);
  await expect(payments.getByText("How to set up Stripe")).toBeVisible();
  await expect(payments.getByRole("link", { name: "Webhooks" })).toHaveAttribute("href", "https://docs.stripe.com/webhooks");
  const webhookUrl = await payments.getByLabel("Endpoint URL").inputValue();
  expect(webhookUrl).toMatch(new RegExp(`^${E2E.baseURL}/api/pay/stripe/webhook/[0-9a-f-]{36}$`));
  await expect(payments.getByText("checkout.session.completed", { exact: true })).toBeVisible();
  await expect(payments.getByText("checkout.session.async_payment_succeeded", { exact: true })).toBeVisible();
  // 188 And the PaymentIntent the app's PaymentSheet pays.
  await expect(payments.getByText("payment_intent.succeeded", { exact: true })).toBeVisible();
  await payments.getByLabel("Secret key").fill("pk_test_publishable123456");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Paste your Stripe secret key: it starts with sk_live_ or sk_test_.")).toBeVisible();
  await expect(payments.getByText("Paste your Stripe publishable key: it starts with pk_live_ or pk_test_.")).toBeVisible();
  // Both keys of one mode: the badge follows what's typed.
  await payments.getByLabel("Publishable key").fill("pk_live_51HarbourMugsKey");
  await payments.getByLabel("Secret key").fill("sk_test_51HarbourMugsKey");
  await expect(payments.getByTestId("stripe-mode")).toHaveText("Test and live keys mixed");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Use two keys of the same mode: both test (pk_test_ and sk_test_) or both live (pk_live_ and sk_live_).")).toBeVisible();
  await payments.getByLabel("Publishable key").fill("pk_test_51HarbourMugsKey");
  await payments.getByLabel("Secret key").fill("sk_test_51HarbourMugsKey");
  await expect(payments.getByTestId("stripe-mode")).toHaveText("Test mode");

  // 132.34 Test connection before saving: the keys as typed, item by item; no endpoint in Stripe yet.
  await payments.getByRole("button", { name: "Test connection" }).click();
  const results = payments.getByTestId("gateway-test-results");
  await expect(results).toContainText("Stripe account: Harbour Mugs · AE.");
  await expect(results).toContainText("The key can open Stripe's payment page (Checkout), where customers pay.");
  await expect(results).toContainText("Mode: Test. No real money moves.");
  await expect(results).toContainText("Currency supported: Stripe takes USD.");
  await expect(results).toContainText("No webhook signing secret yet.");
  await expect(results).toContainText(`Stripe has no webhook endpoint for ${webhookUrl} in this mode.`);
  // 155 The payment page's domain registered in the shop's Stripe account for Apple Pay and Google Pay, with the keys tested.
  await expect(results).toContainText("Apple Pay and Google Pay: localhost is registered in this Stripe account");
  await expect(results.locator('li[data-tone="fail"]')).toHaveCount(0);

  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved.")).toBeVisible();
  await expect(payments.getByText("On · your Stripe account · sandbox (test payments)")).toBeVisible();
  // 155 Saved: the domain is found registered (not twice), kept, and the summary says the wallets are ready.
  await expect(page.locator("[data-wallets]")).toHaveAttribute("data-wallets", "ready");
  await expect(page.locator("[data-wallets]")).toContainText("Apple Pay and Google Pay: ready. Stripe's card form offers them on localhost, on phones and browsers that have them.");
  const registered = () => stripe.calls.filter((c) => c.method === "POST" && c.path === "/v1/payment_method_domains");
  expect(registered()).toHaveLength(1);
  expect(new URLSearchParams(registered()[0]!.body).get("domain_name")).toBe("localhost");
  expect(registered()[0]!.headers.authorization).toBe("Bearer sk_test_51HarbourMugsKey");
  expect(stripe.domains!.map((d) => `${d.domain_name} ${d.livemode ? "live" : "test"} ${d.apple_pay.status} ${d.google_pay.status}`)).toEqual(["localhost test active active"]);
  await expect(payments.getByTestId("gateway-saved")).toContainText("Saved: Stripe");
  await expect(payments.getByTestId("gateway-saved")).toContainText("Test mode");
  await expect(payments.getByTestId("gateway-saved")).toContainText("Webhook: not received yet");
  // The secret key is shown masked; an empty field keeps it.
  await expect(payments.getByText("Saved: sk_test_…sKey. Leave it empty to keep it.")).toBeVisible();

  // 132.31 The endpoint added in Stripe, and its signing secret saved alone.
  stripe.endpoints!.push({ url: webhookUrl, status: "enabled", enabled_events: ["checkout.session.completed", "checkout.session.async_payment_succeeded", "payment_intent.succeeded"] });
  await payments.getByLabel("Webhook signing secret").fill("not-a-secret");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Paste the webhook's signing secret: it starts with whsec_.")).toBeVisible();
  await payments.getByLabel("Webhook signing secret").fill(SIGNING_SECRET);
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved.")).toBeVisible();
  await expect(payments.getByText("Saved: whsec_…et01. Leave it empty to keep it.")).toBeVisible();

  // 132.120 Back from the one Payments page by the menu.
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Harbour Mug");
  await page.getByLabel("Price (USD)", { exact: true }).fill("12.50");
  await page.locator('input[name="images"]').setInputFiles({ name: "mug.png", mimeType: "image/png", buffer: solidPng(64, 64, [40, 90, 160]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Harbour Mug”.");
  // 132.152 Its page, from its inspector.
  await page.getByRole("button", { name: /^Harbour Mug/ }).click();
  await page.getByRole("link", { name: "Edit product" }).click();
  const link = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(link)![1]}`;

  const customer = await page.context().browser()!.newPage({ extraHTTPHeaders });
  await buyTwo(customer, request, "Stripe", "$25.00");
  // The session was made with the shop's own key and read back before the order was paid, 132.32 at the pinned API version.
  const sessionCalls = stripe.calls.filter((c) => c.path.startsWith("/v1/checkout/sessions"));
  expect(sessionCalls.map((c) => c.method)).toEqual(expect.arrayContaining(["POST", "GET"]));
  expect(new Set(sessionCalls.map((c) => c.headers.authorization))).toEqual(new Set(["Bearer sk_test_51HarbourMugsKey"]));
  expect(new Set(stripe.calls.map((c) => c.headers["stripe-version"]))).toEqual(new Set(["2025-09-30.clover"]));
  // 144 An embedded session (Stripe's form in our page), with its own idempotency key.
  const created = stripe.calls.find((c) => c.method === "POST" && c.path === "/v1/checkout/sessions")!;
  expect(created.headers["idempotency-key"]).toMatch(/^order-\d+-\d+-embedded$/);
  expect(new URLSearchParams(created.body).get("ui_mode")).toBe("embedded");
  // 155 Already registered and kept: the payment didn't ask Stripe about the domain again.
  expect(registered()).toHaveLength(1);
  expect(stripe.calls.filter((c) => c.path.startsWith("/v1/payment_method_domains") && stripe.calls.indexOf(c) > stripe.calls.indexOf(created))).toEqual([]);
  // The other pages keep payments off.
  expect((await request.get("/")).headers()["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=()");

  // 132.31 Stripe's webhook for that session: a forged one is refused, the signed one taken in (the order is already paid).
  const [session] = [...stripe.sessions!.values()].slice(-1);
  const event = JSON.stringify({ id: "evt_harbour_1", object: "event", type: "checkout.session.completed", livemode: false, data: { object: { id: session!.id, object: "checkout.session", client_reference_id: session!.client_reference_id } } });
  const forged = await request.post(webhookUrl, { data: event, headers: { "content-type": "application/json", "stripe-signature": stripeSigned(event, "whsec_SomebodyElsesSecret0001") } });
  expect(forged.status()).toBe(400);
  const hook = await request.post(webhookUrl, { data: event, headers: { "content-type": "application/json", "stripe-signature": stripeSigned(event, SIGNING_SECRET) } });
  expect(hook.status()).toBe(200);
  expect(await hook.json()).toEqual({ received: true, status: "already_paid" });

  // 132.34 Test connection with the saved keys, a test payment made and cancelled: everything works. Back from the product's page by its header's link.
  await page.getByRole("main").getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("navigation", { name: "Products", exact: true }).getByRole("link", { name: /^Payments/ }).click();
  // 132.145 Connected, the gateway's keys open from its row.
  await payments.getByRole("button", { name: "Edit" }).click();
  await expect(payments.getByTestId("gateway-saved")).toContainText("Webhook working · last one");
  await payments.getByRole("checkbox", { name: /Also make a 0.50 USD test payment/ }).check();
  await payments.getByRole("button", { name: "Test connection" }).click();
  await expect(results).toContainText("Everything works.");
  await expect(results).toContainText("Signing secret: it looks right (whsec_…).");
  await expect(results).toContainText("Webhook endpoint found in Stripe, with the right events.");
  await expect(results).toContainText("Webhook working: the last one arrived");
  await expect(results).toContainText(/Test payment made and cancelled \(pi_test_\w+\)/);
  const intent = stripe.calls.find((c) => c.method === "POST" && c.path === "/v1/payment_intents")!;
  expect(new URLSearchParams(intent.body).get("amount")).toBe("50");
  expect(stripe.calls.some((c) => c.method === "POST" && /^\/v1\/payment_intents\/[^/]+\/cancel$/.test(c.path))).toBe(true);
  // The keys never come back to the page.
  await expect(page.locator("body")).not.toContainText("sk_test_51HarbourMugsKey");
  await expect(page.locator("body")).not.toContainText(SIGNING_SECRET);

  // PayPal: the REST app's client ID and secret, with the sandbox switch.
  await payments.locator('[data-gateway="paypal"]').click();
  await payments.getByLabel("Client ID").fill("AYharbour-client");
  await payments.getByLabel("Secret").fill("harbour-paypal-secret");
  await payments.getByRole("checkbox", { name: /Sandbox credentials/ }).check();
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("PayPal keys saved.")).toBeVisible();
  // The menu still shows the provider just saved.
  await expect(payments.locator('[data-gateway="paypal"]')).toHaveAttribute("data-checked", "");
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

/**
 * 188 Inside the app's web view (its `YallappPay` channel), a Stripe payment
 * is handed to the app's own PaymentSheet: the page saves the details and
 * asks the app; the app (here, this test) gets the PaymentIntent with the
 * payment's token and, once Stripe has it paid, the status says so. Cancel:
 * the page offers it again. The app can't take it: Stripe's form in the page.
 */
test("188 a Stripe payment in the app goes to the app's PaymentSheet", async ({ page, request }) => {
  // The shop takes Stripe again (the test before ended on PayPal), with 188's Apple Pay merchant ID.
  await signIn(page, shop.email, shop.password);
  await page.goto("/dashboard/payments");
  const payments = page.getByRole("region", { name: "Card payments" });
  await payments.getByRole("button", { name: "Edit" }).click();
  await payments.locator('[data-gateway="stripe"]').click();
  await payments.getByLabel("Publishable key").fill("pk_test_51HarbourMugsKey");
  await payments.getByLabel("Secret key").fill("sk_test_51HarbourMugsKey");
  await payments.getByLabel("Webhook signing secret").fill(SIGNING_SECRET);
  await payments.getByLabel("Apple Pay merchant ID (optional)").fill("com.harbour.mugs");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Enter the Apple Pay merchant ID as Apple shows it: it starts with merchant., like merchant.com.yourshop.app.")).toBeVisible();
  await payments.getByLabel("Publishable key").fill("pk_test_51HarbourMugsKey");
  await payments.getByLabel("Secret key").fill("sk_test_51HarbourMugsKey");
  await payments.getByLabel("Webhook signing secret").fill(SIGNING_SECRET);
  await payments.getByLabel("Apple Pay merchant ID (optional)").fill("merchant.com.harbour.mugs");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved. Your app can take payments.")).toBeVisible();
  await page.reload();
  await payments.getByRole("button", { name: "Edit" }).click();
  await expect(payments.getByLabel("Apple Pay merchant ID (optional)")).toHaveValue("merchant.com.harbour.mugs");

  const customer = await page.context().browser()!.newPage({ extraHTTPHeaders });
  // The app's web view: the channel the page posts to, and what the app sends back (window.yallappReceive).
  await customer.addInitScript(() => {
    const asks: string[] = [];
    Object.assign(window, { __sheetAsks: asks, YallappPay: { postMessage: (text: string) => asks.push(text) } });
  });
  const asks = () => customer.evaluate(() => (window as unknown as { __sheetAsks: string[] }).__sheetAsks.length);
  const tell = (result: string) => customer.evaluate((r) => window.yallappReceive?.(JSON.stringify({ type: "stripe_sheet", result: r })), result);
  const fillDetails = async () => {
    await customer.getByLabel("Full name").fill("Ada Lovelace");
    await customer.getByLabel("Mobile number").fill("+90 532 111 22 33");
    await customer.getByLabel("Email").fill("ada@example.com");
    await customer.getByLabel("City").fill("London");
    await customer.getByLabel("Address").fill("1 Baker Street");
  };
  const checkout = async () => {
    const products = await (await request.get(`${api}/store/products`)).json();
    const link = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0].id, quantity: 2 }] } });
    const { url } = (await link.json()) as { url: string };
    expect(url).toMatch(/\/pay\/[\w-]+\/in-app$/);
    await customer.goto(url);
    return /\/pay\/([\w-]+)$/.exec(new URL(customer.url()).pathname)![1]!;
  };

  const token = await checkout();
  await fillDetails();
  await customer.getByRole("button", { name: "Pay $25.00" }).click();
  await expect(customer.getByRole("heading", { name: "Pay in the app" })).toBeVisible();
  await expect(customer.getByText("Pay $25.00 by card, Apple Pay or Google Pay in the app's secure Stripe sheet.")).toBeVisible();
  // No Stripe form in the page, and the app was asked once.
  await expect(customer.locator("[data-stripe-embedded]")).toHaveCount(0);
  await expect.poll(asks).toBe(1);

  // The app: the PaymentIntent, by the payment's token.
  const before = stripe.intents!.length;
  const sheet = await request.post(`/pay/${token}/sheet`);
  expect(sheet.status()).toBe(200);
  const ready = await sheet.json();
  expect(ready).toMatchObject({ state: "ready", publishable_key: "pk_test_51HarbourMugsKey", currency: "USD", amount_cents: 2500, merchant_name: expect.any(String), test_mode: true, merchant_country: "AE" });
  expect(JSON.stringify(ready)).not.toContain("sk_test_");
  const intent = stripe.intents![before]!;
  expect(ready.client_secret).toBe(`${intent.id}_secret_fake`);
  expect(intent.form.get("automatic_payment_methods[allow_redirects]")).toBe("never");
  // Asked again: the same PaymentIntent.
  expect((await (await request.post(`/pay/${token}/sheet`)).json()).client_secret).toBe(ready.client_secret);
  expect(stripe.intents!.length).toBe(before + 1);

  // Cancelled in the sheet: the page offers it again, nothing paid.
  await tell("canceled");
  await expect(customer.getByText("The payment wasn't completed. Nothing was charged.")).toBeVisible();
  expect((await (await request.get(`/pay/${token}/status`)).json()).state).toBe("started");
  await customer.getByRole("button", { name: "Pay $25.00" }).click();
  await expect.poll(asks).toBe(2);

  // Paid in the sheet: the status the app reads says so (read back from Stripe), and the order is paid once.
  stripe.payIntent!(intent.id);
  expect(await (await request.get(`/pay/${token}/status`)).json()).toEqual({ state: "paid" });
  await customer.goto(`/pay/${token}`);
  await expect(customer).toHaveURL(new RegExp(`/pay/${token}/order-received$`));
  expect((await (await request.post(`/pay/${token}/sheet`)).json()).state).toBe("paid");

  // An app that can't take it: Stripe's own form in the page, with the same details.
  const other = await checkout();
  await fillDetails();
  await customer.getByRole("button", { name: "Pay $25.00" }).click();
  await expect(customer.getByRole("heading", { name: "Pay in the app" })).toBeVisible();
  await tell("unavailable");
  await expect(customer.getByRole("heading", { name: "Your card" })).toBeVisible();
  await expect(customer.locator("[data-stripe-embedded] [data-fake-stripe]")).toHaveAttribute("data-fake-stripe", /^pk_test_/);
  await customer.getByRole("button", { name: "Pay with test card" }).click();
  await expect(customer).toHaveURL(new RegExp(`/pay/${other}/order-received$`));
  await customer.close();

  // In a browser (no channel): Stripe's form, as before.
  const browser = await page.context().browser()!.newPage({ extraHTTPHeaders });
  const products = await (await request.get(`${api}/store/products`)).json();
  const link = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0].id, quantity: 2 }] } });
  await browser.goto(((await link.json()) as { url: string }).url);
  await browser.getByLabel("Full name").fill("Ada Lovelace");
  await browser.getByLabel("Mobile number").fill("+90 532 111 22 33");
  await browser.getByLabel("Email").fill("ada@example.com");
  await browser.getByLabel("City").fill("London");
  await browser.getByLabel("Address").fill("1 Baker Street");
  await browser.getByRole("button", { name: "Pay $25.00" }).click();
  await expect(browser.getByRole("heading", { name: "Your card" })).toBeVisible();
  await browser.close();
});
