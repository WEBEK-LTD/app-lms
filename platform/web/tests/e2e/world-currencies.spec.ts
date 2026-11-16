import { createServer, type Server } from "node:http";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeStripe, type FakeServer } from "./fake-stripe-paypal-servers";
import { solidPng } from "./png";

/**
 * 135 Every currency. The team reads the day's rates in Admin › Settings ›
 * Currencies (from a fake source). A Studio store picks the Kuwaiti dinar,
 * then the yen, in the searchable picker; its prices show with their digits
 * in the dashboard and on the hosted API. As a shop in Egyptian pounds with
 * Stripe, a customer in another currency sees prices in theirs, pays in
 * pounds by default, then in dinars once the shop charges in customers'
 * currencies; the order keeps both.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.133" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Dana Sweets", email: `currencies-${suffix}@shop.test`, password: "dana-sweets-strong-password-1" };

/** ExchangeRate-API's open access answer, as it sends it: units per dollar. */
const RATES: Record<string, number> = { USD: 1, EGP: 48.5, KWD: 0.306, JPY: 151.2, EUR: 0.92, TRY: 34.1, SAR: 3.75, AED: 3.6725, GBP: 0.79, QAR: 3.64, BHD: 0.376, OMR: 0.3845, JOD: 0.709, IQD: 1310, INR: 84.1, CAD: 1.39, AUD: 1.52, CHF: 0.88, CNY: 7.2, SEK: 10.6, NOK: 10.9, DKK: 6.86, PLN: 4.0, MAD: 9.9, TND: 3.1, DZD: 134 };
let rates: Server;
let stripe: FakeServer;
let own: Page;
let admin: Page;
let api = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test.beforeAll(async ({ browser }) => {
  rates = createServer((request, response) => {
    if (!request.url?.startsWith("/v6/latest/USD")) return response.writeHead(404).end();
    response.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({ result: "success", provider: "https://www.exchangerate-api.com", time_last_update_unix: Math.floor(Date.UTC(2026, 10, 16) / 1000), base_code: "USD", rates: RATES }),
    );
  });
  await new Promise<void>((resolve) => rates.listen(E2E.ratesPort, resolve));
  stripe = await startFakeStripe(E2E.stripePort, { accountName: "Dana Sweets" });
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1280, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0133");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);
});

test.afterAll(async () => {
  await admin?.close();
  await own?.context().close();
  await stripe?.close();
  await new Promise<void>((resolve) => (rates ? rates.close(() => resolve()) : resolve()));
});

test("135.6 Admin › Settings › Currencies reads the day's rates, with their source", async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.currenciesAdminEmail, E2E.adminPassword);
  // The client's plan, for the hosted API below.
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await admin.goto("/admin/settings");
  await admin.getByRole("navigation", { name: "Settings pages" }).getByRole("link", { name: "Currencies" }).click();
  await expect(admin).toHaveURL(/\/admin\/settings\/currencies$/);
  await admin.getByRole("button", { name: "Refresh now" }).click();
  await expect(admin.getByText(/The rates of 2026-11-16 are in: \d+ currencies\./)).toBeVisible();
  await expect(admin.locator("[data-rates-date]")).toHaveText("2026-11-16");
  await expect(admin.getByRole("link", { name: "Rates By Exchange Rate API" })).toHaveAttribute("href", "https://www.exchangerate-api.com");
  await expect(admin.getByRole("row", { name: /Kuwaiti Dinar KWD 3 0\.306/ })).toBeVisible();
});

test("135.1–135.3 a Studio store sells in Kuwaiti dinars, then in yen, with their digits", async ({ request }) => {
  test.setTimeout(240_000);
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Dana Sweets");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  // The project on a Studio plan, for the hosted API.
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // The searchable picker: the usual ones first, found by name.
  await own.goto("/studio/project/catalog/settings");
  const currency = own.getByLabel("Currency", { exact: true });
  await expect(currency.locator("optgroup").first()).toHaveAttribute("label", "Usual");
  await expect(currency.locator("option").first()).toHaveText("Egyptian Pound · EGP · E£");
  await own.getByRole("searchbox", { name: "Search currencies" }).fill("kuwait");
  // The chosen one stays while searching, so the form never sends another.
  await expect(currency.locator("option", { hasText: "Kuwaiti Dinar · KWD" })).toHaveCount(1);
  await expect(currency.locator("option")).toHaveCount(2);
  await currency.selectOption("KWD");
  await expect(own.getByText("KWD is written with three decimals (1.250); prices go to the hundredth, like 1.250 or 1.260.")).toBeVisible();
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Shop settings saved.")).toBeVisible();
  // After the form's own reset (an error, then a save), the currency chosen stays.
  await own.getByLabel("Returns in the app (days)").fill("400");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Enter a number of days from 1 to 365, or leave it empty for no returns in the app.")).toBeVisible();
  await own.getByLabel("Returns in the app (days)").fill("");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Shop settings saved.")).toBeVisible();
  await expect(currency).toHaveValue("KWD");
  await own.reload();
  await expect(own.getByLabel("Currency", { exact: true })).toHaveValue("KWD");

  await own.goto("/studio/project/catalog/new");
  await own.getByLabel("Name", { exact: true }).fill("Date maamoul box");
  await own.getByLabel("Price (KWD)", { exact: true }).fill("1.250");
  await own.locator('input[name="images"]').setInputFiles({ name: "box.png", mimeType: "image/png", buffer: solidPng(64, 64, [180, 120, 60]) });
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Date maamoul box”.");
  await own.goto("/studio/project/catalog");
  await expect(own.getByText("KWD 1.250").first()).toBeVisible();
  // Its own page: the price as typed, and the shop's address in the app (132.152 from its inspector).
  await own.getByRole("button", { name: /^Date maamoul box/ }).first().click();
  await own.getByRole("link", { name: "Edit product" }).click();
  await expect(own.getByLabel("Price (KWD)", { exact: true })).toHaveValue("1.250");
  const link = (await own.getByRole("link", { name: /\/shop\// }).textContent())!;
  api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(link)![1]}`;

  const listed = async (headers: Record<string, string> = {}) => {
    const response = await request.get(`${api}/store/products`, { headers });
    expect(response.status(), await response.text()).toBe(200);
    return ((await response.json()) as { items: { name: string; price: Record<string, unknown> }[] }).items;
  };
  const [box] = await listed();
  expect(box!.price).toMatchObject({ amount: "1.250", currency: "KWD", formatted: "KWD 1.250" });
  expect(box!.price).not.toHaveProperty("display");
  // A customer in dollars: 1.250 KWD at 0.306 per dollar (each server bundle reads the saved rates again within 30 seconds).
  await expect.poll(async () => (await listed({ "x-currency": "USD" }))[0]!.price.display ?? null, { timeout: 40_000, intervals: [1000] }).not.toBeNull();
  const [inDollars] = await listed({ "x-currency": "USD" });
  expect(inDollars!.price).toMatchObject({ amount: "1.250", currency: "KWD", display: { currency: "USD", amount: "4.08", formatted: "$4.08", rate_date: "2026-11-16" } });

  // The yen: whole amounts; a fraction isn't a price.
  await own.goto("/studio/project/catalog/settings");
  await own.getByRole("searchbox", { name: "Search currencies" }).fill("JPY");
  await own.getByLabel("Currency", { exact: true }).selectOption("JPY");
  await expect(own.getByText("JPY has no decimals: prices are whole amounts, like 1250.")).toBeVisible();
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Shop settings saved.")).toBeVisible();
  await own.goto("/studio/project/catalog/new");
  await own.getByLabel("Name", { exact: true }).fill("Matcha financier");
  await own.getByLabel("Price (JPY)", { exact: true }).fill("1250.5");
  await own.locator('input[name="images"]').setInputFiles({ name: "cake.png", mimeType: "image/png", buffer: solidPng(64, 64, [90, 150, 70]) });
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByText("Enter a price, like 450 or 450.50.")).toBeVisible();
  await own.getByLabel("Price (JPY)", { exact: true }).fill("1,250");
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Matcha financier”.");
  await own.goto("/studio/project/catalog");
  await expect(own.getByText("¥1,250").first()).toBeVisible();
  const yen = (await listed()).find((p) => p.name === "Matcha financier")!;
  expect(yen.price).toMatchObject({ amount: "1250", currency: "JPY", formatted: "¥1,250" });
});

/** Checks out one of `productName` for a customer in `currency`; returns what the API said it charges. */
async function checkout(request: APIRequestContext, productName: string, currency: string) {
  const products = (await (await request.get(`${api}/store/products`, { headers: { "x-currency": currency } })).json()) as { items: { id: number; name: string }[] };
  const product = products.items.find((p) => p.name === productName)!;
  const cart = await (await request.post(`${api}/store/cart`, { data: { lines: [{ product_id: product.id, quantity: 1 }] }, headers: { "x-currency": currency } })).json();
  const link = await (await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: product.id, quantity: 1 }] }, headers: { "x-currency": currency } })).json();
  return { cart, link } as { cart: Record<string, unknown>; link: { url: string; charge: Record<string, unknown> } };
}

async function pay(page: Page, url: string, button: RegExp) {
  await page.goto(url);
  await page.getByLabel("Full name").fill("Mona Adel");
  await page.getByLabel("Mobile number").fill("+20 100 123 4567");
  await page.getByLabel("Email").fill("mona@example.com");
  await page.getByLabel("City").fill("Cairo");
  await page.getByLabel("Address").fill("12 Tahrir Street, Downtown");
  await page.getByRole("button", { name: button }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
}

test("135.5–135.7 a customer in another currency: shown in it, charged in pounds, then in dinars when the shop says so", async ({ browser, request }) => {
  test.setTimeout(240_000);
  // The shop in Egyptian pounds, with its own Stripe.
  await own.goto("/studio/project/catalog/settings");
  await own.getByLabel("Currency", { exact: true }).selectOption("EGP");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Shop settings saved.")).toBeVisible();
  // 132.120 The one Payments page; 132.122 each gateway is a card.
  await own.goto("/studio/project/payments");
  const payments = own.getByRole("region", { name: "Card payments" });
  // 132.180 Nothing connected yet: the gateway's keys open from its row.
  await payments.getByRole("button", { name: "Connect", exact: true }).click();
  await payments.locator('[data-gateway="stripe"]').click();
  await payments.getByLabel("Publishable key").fill("pk_test_51DanaSweetsKey");
  await payments.getByLabel("Secret key").fill("sk_test_51DanaSweetsKey");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved.")).toBeVisible();
  // 135.4 A currency Stripe doesn't take: said under the picker.
  await own.goto("/studio/project/catalog/settings");
  await own.getByLabel("Currency", { exact: true }).selectOption("IQD");
  await expect(own.getByText(/Stripe doesn't take payments in IQD: customers can't pay by card/)).toBeVisible();
  await own.getByLabel("Currency", { exact: true }).selectOption("EGP");
  // The day's rates and their source on the shop's currency settings.
  const customers = own.getByRole("region", { name: "Customers' currencies" });
  await expect(customers).toContainText("The day's rates: 16 November 2026.");
  await expect(customers.getByRole("link", { name: "Rates By Exchange Rate API" })).toBeVisible();
  await expect(customers.getByText("Your card gateway, Stripe, takes")).toBeVisible();

  await own.goto("/studio/project/catalog/new");
  await own.getByLabel("Name", { exact: true }).fill("Basbousa tray");
  await own.getByLabel("Price (EGP)", { exact: true }).fill("600");
  await own.locator('input[name="images"]').setInputFiles({ name: "tray.png", mimeType: "image/png", buffer: solidPng(64, 64, [200, 160, 90]) });
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Basbousa tray”.");

  // In dollars: shown in them; charged in pounds, the dollars approximate.
  const dollars = await checkout(request, "Basbousa tray", "USD");
  expect(dollars.cart).toMatchObject({ total: "E£600.00", display: { currency: "USD", total: "$12.37" }, charge: { currency: "EGP", total: "E£600.00", in_customer_currency: false } });
  expect(dollars.link.charge).toMatchObject({ currency: "EGP", in_customer_currency: false });
  const customer = await browser.newPage({ extraHTTPHeaders });
  await customer.goto(dollars.link.url);
  await expect(customer.locator("[data-pay-customer-currency]")).toHaveText("≈ $12.37 · you pay E£600.00");
  await pay(customer, dollars.link.url, /^Pay E£600\.00$/);
  const egp = [...stripe.sessions!.values()].slice(-1)[0] as unknown as { currency: string; amount_total: number };
  expect(egp).toMatchObject({ currency: "egp", amount_total: 60000 });

  // The shop charges in customers' currencies: in dinars, at the day's rate.
  await own.goto("/studio/project/catalog/settings");
  await customers.getByRole("checkbox", { name: "Charge in the customer's currency when the card gateway takes it" }).check();
  await customers.getByRole("button", { name: "Save" }).click();
  await expect(customers.getByText("Customers' currencies saved.")).toBeVisible();
  const dinars = await checkout(request, "Basbousa tray", "KWD");
  expect(dinars.link.charge).toMatchObject({ currency: "KWD", total: "KWD 3.790", in_customer_currency: true });
  await customer.goto(dinars.link.url);
  await expect(customer.locator("[data-pay-customer-currency]")).toContainText("Charged in KWD: KWD 3.790 (1 EGP = 0.006309 KWD, rates of 2026-11-16)");
  await pay(customer, dinars.link.url, /^Pay KWD.3\.790$/);
  // Stripe counts dinars in thousandths.
  const kwd = [...stripe.sessions!.values()].slice(-1)[0] as unknown as { currency: string; amount_total: number };
  expect(kwd).toMatchObject({ currency: "kwd", amount_total: 3790 });
  // A currency Stripe doesn't take: pounds, and the app is told why.
  const iqd = await checkout(request, "Basbousa tray", "IQD");
  expect(iqd.link.charge).toMatchObject({ currency: "EGP", in_customer_currency: false, reason: "gateway" });
  await customer.close();

  // The dashboard keeps the shop's currency, with what was charged.
  await own.goto("/studio/project/orders");
  const charged = own.locator("[data-order-charged]");
  await expect(charged).toHaveCount(1);
  await expect(charged).toHaveText("Charged KWD 3.790 at 1 EGP = 0.006309 KWD");
  await expect(own.getByText("E£600.00").first()).toBeVisible();
});
