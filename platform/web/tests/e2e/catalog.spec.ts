import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

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

  const after = await (await request.get(`${api}/store/products/${productId}`)).json();
  expect(after).toMatchObject({ max_quantity: 3 });

  await signIn(page, client.email, client.password);
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  const order = page.getByRole("listitem").filter({ hasText: "Sara Yilmaz" });
  await expect(order).toContainText("₺750.00");
  await expect(order).toContainText("Tulip Bouquet × 2");
  await expect(order).toContainText("Moda Cd. 12, Kadikoy, Istanbul");
  await order.getByRole("button", { name: "Mark completed" }).click();
  await expect(order).toContainText("Completed");
});
