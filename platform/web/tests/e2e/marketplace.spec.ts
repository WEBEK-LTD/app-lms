import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * A shop without a website and without an iyzico account sells through
 * Yallapp's (a fake iyzico here): iyzico registers it as a sub-merchant, the
 * customer pays, and completing the order releases the shop's share minus
 * Yallapp's commission (roadmap 9.5).
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const shop = { name: "Olive Corner", email: `olive-${suffix}@shop.test`, password: "olive-strong-password-1" };
const started = new Map<string, { callbackUrl: string; basketId: string; price: string; basketItems: { subMerchantKey?: string; subMerchantPrice?: string; price: string }[] }>();
const subMerchants: Record<string, unknown>[] = [];
const approved: string[] = [];
let server: Server;
let admin: Page;
let own: Page;
let api = "";

test.beforeAll(async ({ browser }) => {
  const base = `http://localhost:${E2E.iyzicoPort}`;
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const url = new URL(request.url ?? "/", base);
      const send = (json: unknown) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(json));
      const input = body ? (JSON.parse(body) as Record<string, unknown>) : {};
      if (url.pathname === "/payment/bin/check") return send({ status: "success" });
      if (url.pathname === "/onboarding/submerchant") {
        subMerchants.push(input);
        return send({ status: "success", subMerchantKey: `sub-${subMerchants.length}` });
      }
      if (url.pathname.endsWith("/checkoutform/initialize/auth/ecom")) {
        const token = `mp-iyzi-${started.size + 1}`;
        started.set(token, input as never);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const payment = started.get(String(input.token))!;
        return send({
          status: "success",
          paymentStatus: "SUCCESS",
          paymentId: "6060",
          paidPrice: Number(payment.price),
          basketId: payment.basketId,
          itemTransactions: payment.basketItems.map((_, i) => ({ paymentTransactionId: `tx-${i + 1}` })),
        });
      }
      if (url.pathname === "/payment/iyzipos/item/approve") {
        approved.push(String(input.paymentTransactionId));
        return send({ status: "success" });
      }
      if (url.pathname === "/pay") {
        const token = url.searchParams.get("token")!;
        response.writeHead(200, { "content-type": "text/html" }).end(
          `<!doctype html><title>iyzico</title><form method="post" action="${started.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`,
        );
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.iyzicoPort, resolve));

  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(shop.name);
  await own.getByLabel("Email").fill(shop.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 31");
  await own.getByLabel("Your website (optional)").fill(`https://olive-${suffix}.shop.test`);
  await own.getByLabel("Password", { exact: true }).fill(shop.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.settingsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
  await new Promise((resolve) => server.close(resolve));
});

test("the team turns on selling through Yallapp", async () => {
  await admin.goto("/admin/settings");
  const iyzico = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await iyzico.getByLabel("API key").fill("sandbox-yallapp-api");
  await iyzico.getByLabel("Secret key").fill("sandbox-yallapp-secret");
  await iyzico.getByRole("button", { name: "Save keys" }).click();
  await expect(iyzico.getByText("iyzico account saved.")).toBeVisible();

  const marketplace = admin.getByRole("region", { name: "Shops selling through Yallapp" });
  await expect(marketplace).toContainText("Now: off.");
  await marketplace.getByLabel("Commission (%)").fill("60");
  await marketplace.getByRole("button", { name: "Save commission" }).click();
  await expect(marketplace.getByText("Enter a percent from 0 to 50")).toBeVisible();
  await marketplace.getByLabel("Commission (%)").fill("10");
  await marketplace.getByRole("button", { name: "Save commission" }).click();
  await expect(marketplace.getByText("Shops can sell through Yallapp for a 10% commission.")).toBeVisible();

  await admin.goto(`/admin?q=${encodeURIComponent(shop.email)}`);
  await admin.getByRole("link", { name: `Activate ${shop.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("a shop without an iyzico account joins and lists a product", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();

  await own.getByRole("link", { name: "Products", exact: true }).click();
  const payments = own.getByRole("region", { name: "Card payments" });
  await expect(payments).toContainText("Yallapp's 10% commission");
  await payments.getByLabel("Shop name").fill("Olive Corner");
  await payments.getByLabel("Your full name").fill("Deniz Aksoy");
  await payments.getByLabel("Email").fill("deniz@olive.test");
  await payments.getByLabel("Mobile number").fill("0533 222 33 44");
  await payments.getByLabel("Address", { exact: true }).fill("Kordon Boyu 5, Alsancak, Izmir");
  await payments.getByLabel("IBAN").fill("TR33 0006 1005 1978 6457 8413 27");
  await payments.getByLabel("T.C. ID number").fill("10000000146");
  await payments.getByRole("button", { name: "Sell through Yallapp" }).click();
  await expect(payments.getByText("Enter a Turkish IBAN")).toBeVisible();
  await payments.getByLabel("IBAN").fill("TR33 0006 1005 1978 6457 8413 26");
  await payments.getByRole("button", { name: "Sell through Yallapp" }).click();
  // Once joined, the form makes way for the status.
  await expect(payments).toContainText("On · through Yallapp, paid to Olive Corner (IBAN ending 1326)");
  expect(subMerchants[0]).toMatchObject({ subMerchantType: "PERSONAL", contactName: "Deniz", contactSurname: "Aksoy", iban: "TR330006100519786457841326" });

  await own.getByRole("link", { name: "Add product" }).click();
  await own.getByLabel("Name", { exact: true }).fill("Olive Oil 1 L");
  await own.getByLabel("Price (TRY)", { exact: true }).fill("400");
  await own.locator('input[name="images"]').setInputFiles({ name: "oil.png", mimeType: "image/png", buffer: solidPng(64, 64, [120, 140, 40]) });
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Olive Oil 1 L”.");
  await own.getByRole("link", { name: /Olive Oil 1 L/ }).click();
  const link = (await own.getByRole("link", { name: /\/shop\// }).textContent())!;
  api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(link)![1]}`;
});

test("a customer pays and the shop's share is released when it completes the order", async ({ page, request }) => {
  const products = await (await request.get(`${api}/store/products`)).json();
  const checkout = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0].id, quantity: 2 }] } });
  const { url } = (await checkout.json()) as { url: string };
  await page.goto(url);
  await page.getByLabel("Full name").fill("Elif Demir");
  await page.getByLabel("Mobile number").fill("0532 987 65 43");
  await page.getByLabel("Email").fill("elif@example.com");
  await page.getByLabel("City").fill("Izmir");
  await page.getByLabel("Address").fill("Kıbrıs Şehitleri Cd. 20, Alsancak");
  await page.getByRole("button", { name: "Pay ₺800.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  expect([...started.values()][0]!.basketItems).toEqual([expect.objectContaining({ price: "800.00", subMerchantKey: "sub-1", subMerchantPrice: "720.00" })]);

  await own.goto("/dashboard/orders");
  const order = own.getByRole("listitem").filter({ hasText: "Elif Demir" });
  await expect(order).toContainText("commission ₺80.00, your share ₺720.00");
  await expect(order).toContainText("after you mark the order completed");
  expect(approved).toEqual([]);
  await order.getByRole("button", { name: "Mark completed" }).click();
  await expect(order).toContainText("Released for payout");
  expect(approved).toEqual(["tx-1"]);

  await admin.goto("/admin/payments");
  const row = admin.getByRole("region", { name: "Shop sales" }).getByRole("row").filter({ hasText: "₺800.00" });
  await expect(row).toContainText("₺80.00");
  await expect(row).toContainText("₺720.00");
  await expect(row).toContainText("Released");
});

test("the team turns it off again", async () => {
  await admin.goto("/admin/settings");
  await admin.getByRole("region", { name: "Shops selling through Yallapp" }).getByRole("button", { name: "Turn off" }).click();
  await admin.getByRole("region", { name: "Yallapp's iyzico account" }).getByRole("button", { name: "Remove keys" }).click();
  await expect(admin.getByRole("region", { name: "Yallapp's iyzico account" })).toContainText("Now: not set.");
});
