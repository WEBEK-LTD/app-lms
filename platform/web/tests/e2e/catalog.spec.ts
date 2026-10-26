import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";
import { expectReceiptAttached, mailsWithFiles, pdfBehind } from "./receipts";

/**
 * A shop without a website (roadmap 8.6): the client picks "I don't have a
 * website", adds a product and iyzico keys, the app's customer pays on the
 * payment page (against a fake iyzico), and the order reaches the dashboard.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = {
  name: "Tulip House",
  email: `tulip-${suffix}@shop.test`,
  password: "tulip-strong-password-1",
};
let server: Server;
let api = "";
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();

test.beforeAll(async () => {
  const base = `http://localhost:${E2E.iyzicoPort}`;
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const url = new URL(request.url ?? "/", base);
      const send = (json: unknown) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(json));
      if (url.pathname === "/payment/bin/check") return send({ status: "success" });
      if (url.pathname.endsWith("/checkoutform/initialize/auth/ecom")) {
        const input = JSON.parse(body) as { callbackUrl: string; basketId: string; price: string };
        const token = `iyzi-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "777", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        // iyzico's card page, cut down to its last step: it posts the token back to the shop.
        const token = url.searchParams.get("token")!;
        response.writeHead(200, { "content-type": "text/html" }).end(
          `<!doctype html><title>iyzico</title><form method="post" action="${payments.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`,
        );
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.iyzicoPort, resolve));
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("a client without a website sets up their shop", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 03");
  await page.getByLabel("Your website (optional)").fill(`https://tulip-${suffix}.shop.test`);
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await signIn(page, E2E.settingsAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, client.email, client.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await expect(page.getByLabel("Your website", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();

  // 19 Without card payments, the owner is told customers can't pay yet (here and on the overview).
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page.getByText("can't pay for them until you set up Card payments below")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("can't pay for them until you set up Card payments on the Products page")).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByLabel("New category").fill("Bouquets");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByLabel("Category name")).toHaveValue("Bouquets");

  await page.getByLabel("Shipping fee").fill("50");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();

  await page.getByLabel("API key").fill("sandbox-api-key");
  await page.getByLabel("Secret key").fill("sandbox-secret-key");
  await page.getByText("Sandbox keys").click();
  await page.getByRole("button", { name: "Save keys" }).click();
  await expect(page.getByText("iyzico keys saved.")).toBeVisible();
  await expect(page.getByText("On · your iyzico account · sandbox (test payments)")).toBeVisible();

  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Tulip Bouquet");
  await page.getByLabel("Description").fill("Twenty fresh tulips.");
  await page.getByLabel("Sale price (TRY)").fill("500");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByText("Enter a price, like 450 or 450.50.")).toBeVisible();
  await page.getByLabel("Price (TRY)", { exact: true }).fill("400");
  await page.getByLabel("Sale price (TRY)").fill("350");
  await page.getByLabel("Stock").fill("5");
  await page.getByLabel("Bouquets").check();
  await page.locator('input[name="images"]').setInputFiles({ name: "tulips.png", mimeType: "image/png", buffer: solidPng(64, 64, [230, 80, 120]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status")).toContainText("Saved “Tulip Bouquet”.");
  await expect(page.getByRole("link", { name: /Tulip Bouquet/ })).toContainText("₺350.00 · 5 in stock · Bouquets");

  await page.goto("/dashboard/setup?step=website");
  await expect(page.getByRole("radio", { name: /I don't have a website/ })).toBeChecked();

  await page.goto("/dashboard/catalog");
  await page.getByRole("link", { name: /Tulip Bouquet/ }).click();
  const share = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  const [, appId] = /\/shop\/([0-9a-f-]{36})\/\d+$/.exec(share)!;
  api = `${E2E.baseURL}/api/app/${appId}`;
  await page.goto(share);
  await expect(page.getByRole("heading", { name: "Tulip Bouquet" })).toBeVisible();
  await expect(page.getByText("₺350.00")).toBeVisible();
});

test("a customer pays in the app and the order reaches the dashboard", async ({ page, request }) => {
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config).toMatchObject({ store: { currency: "TRY" }, features: { orders: true } });
  const products = await (await request.get(`${api}/store/products`)).json();
  expect(products).toMatchObject({ total: 1, items: [{ name: "Tulip Bouquet", price: { formatted: "₺350.00", on_sale: true } }] });
  const productId = products.items[0].id as number;

  const link = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: productId, quantity: 2 }] } });
  expect(link.status()).toBe(200);
  const { url } = (await link.json()) as { url: string };

  await page.goto(url);
  await expect(page.getByText("Total")).toBeVisible();
  await expect(page.getByRole("region", { name: /Order \d+/ })).toContainText("₺750.00");
  await page.getByLabel("Full name").fill("Sara");
  await page.getByRole("button", { name: "Pay ₺750.00" }).click();
  await expect(page.getByText("Enter your first and last name.")).toBeVisible();
  await page.getByLabel("Full name").fill("Sara Yilmaz");
  await page.getByLabel("Mobile number").fill("0532 123 45 67");
  await page.getByLabel("Email").fill("sara@example.com");
  await page.getByLabel("City").fill("Istanbul");
  await page.getByLabel("Address").fill("Moda Cd. 12, Kadikoy");
  await page.getByRole("button", { name: "Pay ₺750.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  // 71 The receipt as a PDF: on the page, and attached to the customer's email.
  await pdfBehind(page, "Download receipt (PDF)", page.locator("main"));
  await expectReceiptAttached("sara@example.com", /^Your receipt from .+ · order \d+$/);
  // A link we didn't sign opens nothing.
  const href = (await page.getByRole("link", { name: "Download receipt (PDF)" }).getAttribute("href"))!;
  expect((await request.get(`${href.slice(0, -4)}AAAA`)).status()).toBe(404);

  const after = await (await request.get(`${api}/store/products/${productId}`)).json();
  expect(after).toMatchObject({ max_quantity: 3 });

  await signIn(page, client.email, client.password);
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  const order = page.getByRole("listitem").filter({ hasText: "Sara Yilmaz" });
  await expect(order).toContainText("₺750.00");
  await expect(order).toContainText("Tulip Bouquet × 2");
  await expect(order).toContainText("Moda Cd. 12, Kadikoy, Istanbul");
  // 80.4 Shipped with any carrier: a tracking number or link is needed; the customer gets an email.
  const shipping = order.getByRole("region", { name: "Shipping" });
  await shipping.getByLabel("Carrier").fill("Aras Kargo");
  await shipping.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(shipping.getByText("Enter the tracking link, the tracking number or the waybill.")).toBeVisible();
  await shipping.getByLabel("Tracking number").fill("3815602243");
  await shipping.getByLabel("Tracking link").fill("https://kargotakip.example/track?code=3815602243");
  await shipping.getByRole("button", { name: "Mark as shipped" }).click();
  await expect(shipping.getByRole("status")).toContainText("Marked shipped. The customer was told.");
  await page.reload();
  const shippedOrder = page.getByRole("listitem").filter({ hasText: "Sara Yilmaz" });
  await expect(shippedOrder).toContainText("Shipped");
  await expect(shippedOrder.getByRole("region", { name: "Shipping" })).toContainText("3815602243");
  await expect(shippedOrder.getByRole("link", { name: "Open tracking" })).toHaveAttribute("href", "https://kargotakip.example/track?code=3815602243");
  await expect.poll(async () => (await mailsWithFiles("sara@example.com")).some((m) => /^Your order \d+ from .+ was shipped$/.test(m.subject)), { timeout: 15_000 }).toBe(true);

  await shippedOrder.getByRole("button", { name: "Mark completed" }).click();
  await expect(shippedOrder).toContainText("Completed");
});

test("91.3 a signed-in customer asks to return a completed order, and the shop approves it", async ({ page, request }) => {
  await signIn(page, client.email, client.password);
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByLabel("Returns in the app (days)").fill("400");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter a number of days from 1 to 365, or leave it empty for no returns in the app.")).toBeVisible();
  await page.getByLabel("Returns in the app (days)").fill("14");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.store.returns).toEqual({ enabled: true, days: 14 });

  // The customer signs in with their email, and checks out from the app.
  await page.getByRole("link", { name: "App sign-in" }).click();
  await page.getByText("Phone number or email address").click();
  await page.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(page.getByRole("status").first()).toContainText("Saved.");
  const email = `ece-${suffix}@example.com`;
  const device = { id: `e2e-shop-${suffix}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email } })).json()) as { request_id: string };
  const code = (await mailsWithFiles(email)).at(-1)!.subject.slice(0, 6);
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code, device } })).json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Ece Kaya", device } });
  expect(registered.status()).toBe(201);
  const headers = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
  const products = await (await request.get(`${api}/store/products`)).json();
  const link = await request.post(`${api}/store/checkout-link?platform=android`, { headers, data: { lines: [{ product_id: products.items[0].id, quantity: 1 }] } });
  expect(link.status()).toBe(200);
  await page.goto(((await link.json()) as { url: string }).url);
  await page.getByLabel("Full name").fill("Ece Kaya");
  await page.getByLabel("Mobile number").fill("0532 765 43 21");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("City").fill("Izmir");
  await page.getByLabel("Address").fill("Kordon 5, Alsancak");
  await page.getByRole("button", { name: "Pay ₺400.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  const mine = await (await request.get(`${api}/me/orders`, { headers })).json();
  const orderId = mine.items[0].id as number;
  expect(mine.items[0]).toMatchObject({ can_return: false, return_request: null });
  await page.goto("/dashboard/orders");
  await page.getByRole("listitem").filter({ hasText: "Ece Kaya" }).getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Ece Kaya" })).toContainText("Completed");

  // Within the days: once, with a reason; "other" needs a note.
  expect((await request.post(`${api}/me/orders/${orderId}/return`, { headers, data: { reason: "other" } })).status()).toBe(400);
  const returned = await request.post(`${api}/me/orders/${orderId}/return`, { headers, data: { reason: "damaged", note: "The stems were broken." } });
  expect(returned.status()).toBe(200);
  expect(await returned.json()).toMatchObject({ can_return: false, return_request: { status: "requested", reason: "damaged", note: "The stems were broken." } });
  expect((await request.post(`${api}/me/orders/${orderId}/return`, { headers, data: { reason: "damaged" } })).status()).toBe(409);
  // Someone else's order isn't theirs to return.
  expect((await request.post(`${api}/me/orders/${orderId + 1000}/return`, { headers, data: { reason: "damaged" } })).status()).toBe(404);

  await page.reload();
  const order = page.getByRole("listitem").filter({ hasText: "Ece Kaya" });
  const ret = order.getByRole("region", { name: /^Return/ });
  await expect(ret).toContainText("Asked");
  await expect(ret).toContainText("It arrived damaged");
  await expect(ret).toContainText("The stems were broken.");
  await ret.getByLabel("Your reply to the customer").fill("Our courier picks it up on Monday.");
  await ret.getByRole("button", { name: "Approve return" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Ece Kaya" }).getByRole("region", { name: /^Return/ })).toContainText("Approved");
  await expect(page.getByRole("listitem").filter({ hasText: "Ece Kaya" }).getByRole("region", { name: /^Return/ })).toContainText("Your reply: Our courier picks it up on Monday.");

  const after = await (await request.get(`${api}/me/orders/${orderId}`, { headers })).json();
  expect(after.return_request).toMatchObject({ status: "approved", reply: "Our courier picks it up on Monday." });
  const inbox = await (await request.get(`${api}/me/notifications`, { headers })).json();
  expect(inbox.items.some((n: { type: string; order_id?: number; body: string }) => n.type === "order_update" && n.order_id === orderId && n.body.includes("Our courier picks it up on Monday."))).toBe(true);
});

test("91.4 a customer earns loyalty points on a completed order and uses them on the next", async ({ page, request }) => {
  await signIn(page, client.email, client.password);
  await page.getByRole("link", { name: "Products", exact: true }).click();
  const loyalty = page.getByRole("region", { name: "Loyalty points" });
  await loyalty.getByText("Give loyalty points").click();
  await loyalty.getByLabel("Spend for one point (TRY)").fill("10");
  await loyalty.getByLabel("One point is worth (TRY)").fill("0.10");
  await loyalty.getByLabel("Fewest points used at once").fill("abc");
  await loyalty.getByRole("button", { name: "Save loyalty points" }).click();
  await expect(loyalty.getByText("Enter a number of points, like 100.")).toBeVisible();
  await loyalty.getByLabel("Fewest points used at once").fill("10");
  await loyalty.getByRole("button", { name: "Save loyalty points" }).click();
  await expect(loyalty.getByText("Loyalty points saved.")).toBeVisible();
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.store.loyalty).toEqual({ enabled: true, spend_per_point: "10.00", spend_per_point_formatted: "₺10.00", point_value: "0.10", point_value_formatted: "₺0.10", min_points: 10 });

  const email = `deniz-${suffix}@example.com`;
  const device = { id: `e2e-points-${suffix}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email } })).json()) as { request_id: string };
  const code = (await mailsWithFiles(email)).at(-1)!.subject.slice(0, 6);
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code, device } })).json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Deniz Kaya", device } });
  const headers = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
  const productId = ((await (await request.get(`${api}/store/products`)).json()) as { items: { id: number }[] }).items[0]!.id;
  const lines = [{ product_id: productId, quantity: 1 }];
  const pay = async (body: Record<string, unknown>, total: string) => {
    const link = await request.post(`${api}/store/checkout-link?platform=android`, { headers, data: { lines, ...body } });
    expect(link.status()).toBe(200);
    await page.goto(((await link.json()) as { url: string }).url);
    await page.getByLabel("Full name").fill("Deniz Kaya");
    await page.getByLabel("Mobile number").fill("0532 111 22 33");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("City").fill("Ankara");
    await page.getByLabel("Address").fill("Tunali 7, Cankaya");
    await page.getByRole("button", { name: `Pay ${total}` }).click();
    await page.getByRole("button", { name: "Pay with test card" }).click();
    await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  };

  // A first order: no points yet; completed, it earns 35 (₺350 of products).
  expect((await (await request.post(`${api}/store/cart`, { headers, data: { lines, use_points: true } })).json()).points).toEqual({ balance: 0, usable: 0, usable_value: null, applied: false, discount: null });
  await pay({}, "₺400.00");
  await page.goto("/dashboard/orders");
  await page.getByRole("listitem").filter({ hasText: "Deniz Kaya" }).getByRole("button", { name: "Mark completed" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Deniz Kaya" })).toContainText("Earned 35 loyalty points");
  expect(await (await request.get(`${api}/me/points`, { headers })).json()).toMatchObject({ balance: 35, value: "₺3.50", entries: [{ points: 35, reason: "earned" }] });

  // The next order uses them: ₺3.50 off on the payment page, spent once paid.
  expect(await (await request.post(`${api}/store/cart`, { headers, data: { lines, use_points: true } })).json()).toMatchObject({
    points: { balance: 35, usable: 35, usable_value: "₺3.50", applied: true, discount: "₺3.50" },
    total: "₺396.50",
  });
  const link = await request.post(`${api}/store/checkout-link?platform=android`, { headers, data: { lines, use_points: true } });
  await page.goto(((await link.json()) as { url: string }).url);
  await expect(page.getByRole("region", { name: /Order \d+/ })).toContainText("Loyalty points (35)");
  await expect(page.getByRole("region", { name: /Order \d+/ })).toContainText("-₺3.50");
  await pay({ use_points: true }, "₺396.50");
  expect(await (await request.get(`${api}/me/points`, { headers })).json()).toMatchObject({ balance: 0, entries: [{ points: -35, reason: "used" }, { points: 35, reason: "earned" }] });
  await page.goto("/dashboard/orders");
  await expect(page.getByRole("listitem").filter({ hasText: "Deniz Kaya" }).first()).toContainText("Loyalty points (35): -₺3.50");
});

test("91.5 a product in two colours, and KDV inside the prices, from the dashboard to the payment", async ({ page, request }) => {
  await signIn(page, client.email, client.password);
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByLabel("Tax rate (%)").fill("twenty");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter the tax rate as a percentage, like 20 or 7.5, or leave it empty for no tax.")).toBeVisible();
  await page.getByLabel("Tax rate (%)").fill("20");
  await page.getByLabel("Tax name").fill("KDV");
  await page.getByLabel("My prices include the tax").check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();

  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Tulip Vase");
  await page.getByLabel("Price (TRY)", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Add a variation" }).click();
  await page.getByLabel("Variation 1 name").fill("Colour");
  await page.getByLabel("Variation 1 values, separated by commas").fill("Red, White");
  await page.getByRole("button", { name: "Add the 2 missing combinations" }).click();
  await page.getByLabel("Price of White").fill("240");
  await page.getByLabel("Stock of Red").fill("1");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status")).toContainText("Saved “Tulip Vase”.");

  const products = (await (await request.get(`${api}/store/products`)).json()) as { items: { id: number; name: string; type: string; price: { formatted: string } }[] };
  const vase = products.items.find((p) => p.name === "Tulip Vase")!;
  expect(vase).toMatchObject({ type: "variable", price: { formatted: "₺200.00 – ₺240.00" } });
  const detail = await (await request.get(`${api}/store/products/${vase.id}`)).json();
  expect(detail.attributes).toEqual([{ slug: "a1", name: "Colour", variation: true, options: [{ value: "Red", label: "Red" }, { value: "White", label: "White" }] }]);
  const red = (detail.variations as { id: number; attributes: { a1: string } }[]).find((v) => v.attributes.a1 === "Red")!;
  expect(red).toMatchObject({ max_quantity: 1, price: { formatted: "₺200.00" } });

  // ₺200 + ₺50 shipping, of which ₺41.67 is KDV.
  const lines = [{ product_id: vase.id, variation_id: red.id, quantity: 1 }];
  expect(await (await request.post(`${api}/store/cart`, { data: { lines } })).json()).toMatchObject({ total: "₺250.00", tax: null, tax_included: "₺41.67", tax_label: "KDV 20%" });
  const link = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines } });
  await page.goto(((await link.json()) as { url: string }).url);
  const summary = page.getByRole("region", { name: /Order \d+/ });
  await expect(summary).toContainText("Tulip Vase - Red");
  await expect(summary).toContainText("KDV 20%");
  await expect(summary).toContainText("₺41.67");
  await page.getByLabel("Full name").fill("Ayla Demir");
  await page.getByLabel("Mobile number").fill("0532 444 55 66");
  await page.getByLabel("Email").fill(`ayla-${suffix}@example.com`);
  await page.getByLabel("City").fill("Izmir");
  await page.getByLabel("Address").fill("Kordon 3, Alsancak");
  await page.getByRole("button", { name: "Pay ₺250.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  // The red one is sold out; the white one still sells.
  const after = (await (await request.get(`${api}/store/products/${vase.id}`)).json()) as { variations: { attributes: { a1: string }; stock_status: string }[] };
  expect(after.variations.map((v) => [v.attributes.a1, v.stock_status])).toEqual([["Red", "out_of_stock"], ["White", "in_stock"]]);
  await page.goto("/dashboard/orders");
  const order = page.getByRole("listitem").filter({ hasText: "Ayla Demir" });
  await expect(order).toContainText("Tulip Vase - Red");
  await expect(order).toContainText("KDV 20%");
});
