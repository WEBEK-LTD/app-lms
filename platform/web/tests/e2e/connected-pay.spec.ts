import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeStripe, type FakeServer } from "./fake-stripe-paypal-servers";

/**
 * 134 Pay inside the app for a WooCommerce store (Demo): the owner picks it
 * on Payments once their own Stripe is connected and tested; the plugin (as
 * a request here) asks for the payment page of the priced cart; the
 * customer gives their address, the site (a fake WordPress plugin, signed
 * requests only) prices its shipping, and they pay on Stripe (a fake); the
 * order is made on the site once, marked paid. A site that refuses it
 * leaves the payment "Paid, needs attention": retried, then refunded. Every
 * key here is made up.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.134" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const shop = { name: "Lale Flowers", email: `lale-${suffix}@flowers.test`, password: "lale-strong-password-1" };
const siteUrl = `https://lale-${suffix}.flowers.test`;
const SHOTS = process.env.CONNECTED_PAY_SHOTS ?? "";

interface SiteCall {
  action: string;
  reference: string;
  signed: boolean;
  body: Record<string, unknown>;
}
let stripe: FakeServer;
let wordpress: Server;
let licenseKey = "";
const site = { calls: [] as SiteCall[], refuse: false, orders: new Map<string, number>() };

/** 2x pictures of a part of a page, for the report (CONNECTED_PAY_SHOTS: a folder), in the same session. */
async function shoot(page: Page, file: string, region: string, url = "/dashboard/payments") {
  if (!SHOTS) return;
  const context = await page.context().browser()!.newContext({ deviceScaleFactor: 2, viewport: { width: 1180, height: 1400 }, storageState: await page.context().storageState(), extraHTTPHeaders });
  const shot = await context.newPage();
  await shot.goto(url);
  await shot.getByRole("region", { name: region }).screenshot({ path: `${SHOTS}/${file}` });
  await context.close();
}

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** The plugin's site info. */
const siteInfo = () => ({ license_key: licenseKey, site_url: siteUrl, plugin_version: "0.4.47", wp_version: "6.8", lms: "", store: "woocommerce" });

/** What the plugin sends for the app's cart: two bouquets and a vase as their add-on, a slot with its fee. */
const cart = () => ({
  ...siteInfo(),
  currency: "TRY",
  platform: "android",
  lang: "en",
  lines: [
    { product_id: 41, variation_id: 57, quantity: 2, name: "Red roses - Deluxe", unit_amount: "450.00", total_amount: "900.00", attributes: { attribute_pa_size: "deluxe" }, digital: false },
    { product_id: 88, variation_id: null, quantity: 1, name: "Glass vase", unit_amount: "120.00", total_amount: "120.00", attributes: {}, addon_of: 41, digital: false },
  ],
  coupon: null,
  discount_amount: "0.00",
  fee_amount: "30.00",
  extras: { delivery_date: "2030-02-14", delivery_slot: "s2", slot_label: "16:00–20:00", fee: 30, gift_message: "Happy Valentine's!", recipient: { name: "Ayşe Kaya", phone: "+905309876543", address: "Moda Caddesi 5, Kadıköy", city: "Istanbul", country: "TR" } },
  customer: { user_id: 7, name: "Omar Aziz", email: "omar@example.com", phone: "+905301234567", city: "Istanbul", address: "", country: "TR" },
});

test.beforeAll(async () => {
  stripe = await startFakeStripe(E2E.stripePort, { accountName: "Lale Flowers" });
  // The WordPress site: the plugin's signed paid-orders endpoint, and the license nudges.
  wordpress = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    request.on("end", () => {
      const reply = (status: number, json: unknown) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(json));
      if (request.url !== "/wp-json/yallapp/v1/store/paid-orders") return reply(202, { status: "active" });
      const ts = String(request.headers["yallapp-timestamp"] ?? "");
      const signed = request.headers["yallapp-signature"] === createHmac("sha256", licenseKey.toUpperCase()).update(`yallapp-store-order:${ts}:${raw}`).digest("hex");
      const body = JSON.parse(raw) as Record<string, unknown>;
      site.calls.push({ action: String(body.action), reference: String(body.reference), signed, body });
      if (!signed) return reply(401, { code: "invalid_signature", message: "This request is not signed for this site." });
      const lines = body.lines as { total_amount: string }[];
      const subtotal = lines.reduce((sum, l) => sum + Number(l.total_amount), 0);
      if (body.action === "quote") {
        return reply(200, { currency: "TRY", lines: lines.map((l) => ({ total_amount: l.total_amount, available: true })), discount_amount: "0.00", shipping_amount: "25.00", fee_amount: "30.00", tax_amount: "0.00", total_amount: (subtotal + 55).toFixed(2) });
      }
      if (site.refuse) return reply(409, { code: "out_of_stock", message: "Red roses - Deluxe is out of stock." });
      const reference = String(body.reference);
      const known = site.orders.get(reference);
      if (known) return reply(200, { order_id: known, order_number: String(known), status: "processing", created: false });
      const id = 700 + site.orders.size + 1;
      site.orders.set(reference, id);
      return reply(200, { order_id: id, order_number: String(id), status: "processing", created: true });
    });
  });
  await new Promise<void>((resolve) => wordpress.listen(E2E.wpRefreshPort, resolve));
  if (SHOTS) await mkdir(SHOTS, { recursive: true });
});

test.afterAll(async () => {
  await stripe.close();
  await new Promise<void>((resolve) => wordpress.close(() => resolve()));
});

/** The customer pays the plugin's cart on Yallapp's page: the address first, then the total with shipping, then Stripe. */
async function pay(customer: Page, request: import("@playwright/test").APIRequestContext): Promise<string> {
  const started = await request.post("/api/v1/store/payments", { data: cart() });
  expect(started.status()).toBe(200);
  const { url, gateway } = (await started.json()) as { url: string; gateway: string };
  expect(gateway).toBe("stripe");
  expect(url).toMatch(new RegExp(`^${E2E.baseURL}/pay/`));
  await customer.goto(url);
  await expect(customer.getByText("Shipping and tax for your address are added before you pay.")).toBeVisible();
  await expect(customer.getByText("Card payments are processed securely by Stripe.")).toBeVisible();
  // No bank transfer or own method here: the order is made on the store once it's paid.
  await expect(customer.getByText("How would you like to pay?")).toHaveCount(0);
  await expect(customer.getByLabel("Full name")).toHaveValue("Omar Aziz");
  await customer.getByLabel("Address").fill("Bağdat Caddesi 12, Kadıköy");
  await customer.getByRole("button", { name: /^Pay / }).click();
  // The site priced its shipping for the address: the customer sees the new total before paying.
  await expect(customer.getByText("With the shipping and tax for your address, the total is ₺1,075. Check it, then tap Pay.")).toBeVisible();
  await expect(customer.getByText("Shipping", { exact: true })).toBeVisible();
  await customer.getByRole("button", { name: "Pay ₺1,075" }).click();
  await customer.getByRole("button", { name: "Pay with test card" }).click();
  await expect(customer).toHaveURL(/\/pay\/[\w-]+\/order-received\?shop_order=(placed|confirming)$/);
  return customer.url();
}

test("a WooCommerce store's customers pay inside the app: the owner's Stripe, the order made on the site once", async ({ page, request, browser }) => {
  test.setTimeout(240_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(shop.name);
  await page.getByLabel("Email").fill(shop.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 673 1342");
  await page.getByLabel("Your website (optional)").fill(siteUrl);
  await page.getByLabel("Password", { exact: true }).fill(shop.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/start$/);

  await signIn(page, E2E.connectedPayAdminEmail, E2E.adminPassword);
  await page.goto(`/admin/clients?q=${encodeURIComponent(shop.email)}`);
  await page.getByRole("link", { name: `Activate ${shop.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");
  licenseKey = (await page.locator("dd").filter({ hasText: /^YALL-/ }).textContent())!.trim();

  // A store on the owner's WordPress site, its plugin connected.
  await signIn(page, shop.email, shop.password);
  await page.goto((await page.locator('[data-classic] a[href^="/dashboard/app-type"]').getAttribute("href"))!); // the app editor's empty start, under "Other app types"
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Your WordPress website")).toHaveValue(siteUrl);
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  expect((await request.post("/api/v1/licenses/activate", { data: siteInfo() })).status()).toBe(200);

  // Payments: how customers pay. The store's checkout is in use; inside the app needs the gateway tested.
  await page.goto("/dashboard/payments");
  const how = page.getByRole("region", { name: "How customers pay" });
  // 132.180 The way in use on one row; the ways open under Change.
  await expect(how).toContainText("Your store's checkout (WordPress)");
  await how.getByRole("button", { name: "Change" }).click();
  await expect(how.locator('[data-choice="yallapp"]')).toContainText("Only for apps that sell the products you add in Yallapp.");
  await expect(how.locator('[data-choice="platform"]')).toContainText("Your store's checkout (WordPress)");
  await expect(how.locator('[data-choice="platform"]')).toContainText("In use");
  await expect(how.locator('[data-choice="in_app"]')).toContainText("Pay inside the app (Demo)");
  await expect(how.getByRole("radio", { name: /Pay inside the app/ })).toBeDisabled();
  await expect(how.locator("[data-demo-note]")).toContainText("Paying inside the app is new. Try it with a test order first. You can switch back to your store's checkout at any time.");
  await expect(how.locator("[data-gateway-state]")).toHaveAttribute("data-gateway-state", "missing");
  await expect(how).toContainText("Yallapp takes no fee on these payments.");
  // Before the gateway is there, the plugin is told to keep the store's checkout.
  expect(await (await request.post("/api/v1/store/payments", { data: cart() })).json()).toMatchObject({ code: "in_app_payment_off" });

  const payments = page.getByRole("region", { name: "Card payments" });
  // 132.180 Nothing connected yet: the gateway's keys open from its row.
  await payments.getByRole("button", { name: "Connect", exact: true }).click();
  await payments.locator('[data-gateway="stripe"]').click();
  await payments.getByLabel("Publishable key").fill("pk_test_51LaleFlowersKey");
  await payments.getByLabel("Secret key").fill("sk_test_51LaleFlowersKey");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved.")).toBeVisible();
  await expect(how.locator("[data-gateway-state]")).toHaveAttribute("data-gateway-state", "untested");
  await expect(how.getByRole("radio", { name: /Pay inside the app/ })).toBeDisabled();
  // Test connection with the saved keys (the fields left empty) passes: now it can be chosen.
  await payments.getByRole("button", { name: "Test connection" }).click();
  const results = payments.getByTestId("gateway-test-results");
  await expect(results).toContainText("Stripe account: Lale Flowers");
  await expect(results.locator('li[data-tone="fail"]')).toHaveCount(0);
  await page.reload();
  await expect(how.locator("[data-gateway-state]")).toHaveAttribute("data-gateway-state", "tested");
  await how.getByRole("button", { name: "Change" }).click();
  await how.getByRole("radio", { name: /Pay inside the app/ }).check();
  await how.getByRole("button", { name: "Save" }).click();
  await expect(how.getByRole("status")).toContainText("Saved. Customers pay inside the app (Demo).");
  await expect(how.locator('[data-choice="in_app"]')).toContainText("In use");
  await shoot(page, "dashboard-how-customers-pay-en.png", "How customers pay");
  // The plugin hears of it with the license status.
  const status = await (await request.post("/api/v1/licenses/check", { data: siteInfo() })).json();
  expect(status.store_checkout).toEqual({ payment: "in_app", gateway: "stripe", gateway_name: "Stripe" });

  // A customer pays inside the app: the site prices the shipping, then makes the order once, marked paid.
  const customer = await browser.newPage({ extraHTTPHeaders });
  const placed = await pay(customer, request);
  expect(placed).toMatch(/shop_order=placed$/);
  await expect(customer.locator("[data-shop-order]")).toHaveAttribute("data-shop-order", "placed");
  await expect(customer.getByText(/Your payment is received and your order 701 is placed with/)).toBeVisible();
  const creates = site.calls.filter((c) => c.action === "create");
  expect(creates).toHaveLength(1);
  expect(site.calls.every((c) => c.signed)).toBe(true);
  expect(creates[0]!.body).toMatchObject({
    customer_id: 7,
    shipping: { name: "Ayşe Kaya", address: "Moda Caddesi 5, Kadıköy" },
    billing: { name: "Omar Aziz", email: "omar@example.com", address: "Bağdat Caddesi 12, Kadıköy" },
    payment: { gateway: "Stripe", amount: "1075.00", currency: "TRY" },
  });
  expect(String((creates[0]!.body.payment as { note: string }).note)).toMatch(/^Paid in the app via Stripe, reference pi_\w+$/);
  // Stripe's session was the owner's own, for the total the site priced.
  const session = stripe.calls.find((c) => c.method === "POST" && c.path === "/v1/checkout/sessions")!;
  expect(session.headers.authorization).toBe("Bearer sk_test_51LaleFlowersKey");
  expect(new URLSearchParams(session.body).get("line_items[0][price_data][unit_amount]")).toBe("107500");
  // Coming back to the payment page again never makes a second order.
  await customer.goto(placed.replace(/\/order-received.*$/, ""));
  await expect(customer).toHaveURL(/order-received\?shop_order=placed$/);
  expect(site.calls.filter((c) => c.action === "create")).toHaveLength(1);

  // The site refuses the next one (sold out): paid, needs attention; the customer is told the shop will confirm it.
  site.refuse = true;
  const confirming = await pay(customer, request);
  expect(confirming).toMatch(/shop_order=confirming$/);
  await expect(customer.getByText("Payment received")).toBeVisible();
  await expect(customer.getByText(/We received your payment of ₺1,075\. .+ will confirm your order shortly\./)).toBeVisible();

  await page.goto("/dashboard/payments");
  const list = page.getByRole("region", { name: "Payments in the app" });
  await expect(list.getByRole("alert")).toContainText("1 payment in the app needs your attention.");
  const attention = list.locator('[data-in-app-payment="needs_attention"]');
  await expect(attention).toContainText("Paid, needs attention");
  // 132.180 A payment's details and actions in the inspector, opened from its row.
  await attention.getByRole("button").click();
  const details = page.locator('[data-inspector-payment="needs_attention"]');
  await expect(details).toContainText("Your store said: Red roses - Deluxe is out of stock.");
  await expect(list.locator('[data-in-app-payment="placed"]')).toContainText("Order 701 created");
  // Retried while still sold out; then back in stock, the retry makes it.
  await details.getByRole("button", { name: "Retry creating the order" }).click();
  await expect(details.getByRole("alert")).toContainText("Your store still didn't take the order: Red roses - Deluxe is out of stock.");
  site.refuse = false;
  await details.getByRole("button", { name: "Retry creating the order" }).click();
  // Made: it's listed as created (its actions go with "needs attention").
  await expect(list.locator('[data-in-app-payment="placed"]')).toHaveCount(2);
  await expect(list.locator('[data-in-app-payment="needs_attention"]')).toHaveCount(0);

  // One more refused, and refunded through the owner's Stripe instead.
  site.refuse = true;
  await pay(customer, request);
  await page.reload();
  const third = list.locator('[data-in-app-payment="needs_attention"]');
  await third.getByRole("button").click();
  await expect(details).toContainText("Refunds ₺1,075 to the customer through Stripe.");
  await details.getByRole("button", { name: "Refund" }).click();
  await expect(list.locator('[data-in-app-payment="refunded"]')).toContainText("Refunded");
  const refund = stripe.calls.find((c) => c.method === "POST" && c.path === "/v1/refunds")!;
  expect(new URLSearchParams(refund.body).get("amount")).toBe("107500");
  expect(site.orders.size).toBe(2);
  await customer.close();

  // Back to the store's checkout at any time: the plugin hears of it.
  await how.getByRole("button", { name: "Change" }).click();
  await how.getByRole("radio", { name: /Your store's checkout/ }).check();
  await how.getByRole("button", { name: "Save" }).click();
  await expect(how.getByRole("status")).toContainText("Saved. Customers pay on your store's checkout.");
  expect((await (await request.post("/api/v1/licenses/check", { data: siteInfo() })).json()).store_checkout).toBeNull();
  expect(await (await request.post("/api/v1/store/payments", { data: cart() })).json()).toMatchObject({ code: "in_app_payment_off" });

  // In Arabic, the dashboard's words (Egyptian).
  await how.getByRole("radio", { name: /Pay inside the app/ }).check();
  await how.getByRole("button", { name: "Save" }).click();
  await expect(how.getByRole("status")).toContainText("Saved. Customers pay inside the app (Demo).");
  await page.goto("/dashboard/account");
  await page.getByRole("button", { name: "العربية" }).click();
  // The choice is saved by the form's action: wait for it to land before leaving the page (a slower database's save came after the next page otherwise).
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.goto("/dashboard/payments");
  const ar = page.getByRole("region", { name: "العملاء بيدفعوا إزاي" });
  await expect(ar.locator('[data-choice="in_app"]')).toContainText("الدفع جوه التطبيق (تجريبي)");
  await expect(ar.locator("[data-demo-note]")).toContainText("جرّبه بطلب تجريبي الأول");
  await expect(page.getByRole("region", { name: "المدفوعات في التطبيق" })).toContainText("اترجّعت الفلوس");
  await shoot(page, "dashboard-how-customers-pay-ar.png", "العملاء بيدفعوا إزاي");
  await shoot(page, "dashboard-payments-in-app-ar.png", "المدفوعات في التطبيق");
  await page.goto("/dashboard/account");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await shoot(page, "dashboard-payments-in-app-en.png", "Payments in the app");
});
