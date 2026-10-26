import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { expectReceiptAttached, pdfBehind } from "./receipts";

/**
 * A new client pays their plan by card into Yallapp's iyzico account (a fake
 * iyzico here) and is activated without the team (roadmap 9.4). 52 With
 * iyzico chosen for plans (Kashier is the default), the plan's dollar price
 * is charged: iyzico takes no Egyptian pounds.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Linden School", email: `linden-${suffix}@school.test`, password: "linden-strong-password-1" };
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();
let server: Server;
let admin: Page;
let own: Page;

test.beforeAll(async ({ browser }) => {
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
        const token = `plan-iyzi-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "5150", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        const token = url.searchParams.get("token")!;
        response.writeHead(200, { "content-type": "text/html" }).end(
          `<!doctype html><title>iyzico</title><p>Total ${payments.get(token)!.price}</p><form method="post" action="${payments.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`,
        );
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.iyzicoPort, resolve));

  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 21");
  await own.getByLabel("Your website (optional)").fill(`https://linden-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
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

test("card payment shows once the team sets the account and a card price", async () => {
  await expect(own.getByRole("heading", { name: "Pay by card" })).toHaveCount(0);

  await admin.goto("/admin/settings/payments");
  const iyzico = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await iyzico.getByLabel("API key").fill("sandbox-yallapp-api");
  await iyzico.getByLabel("Secret key").fill("sandbox-yallapp-secret");
  await iyzico.getByRole("button", { name: "Save keys" }).click();
  await expect(iyzico.getByText("iyzico account saved.")).toBeVisible();
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("iyzico");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's iyzico account.")).toBeVisible();

  await admin.goto("/admin/plans");
  const pro = admin.getByRole("region", { name: "Pro" });
  await pro.getByLabel("A price").check();
  await pro.getByLabel("Price in EGP").fill("4800");
  await pro.getByLabel("Price in USD (optional)").fill("96");
  await pro.getByLabel("Billed").selectOption("12");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(pro.getByText("Pro saved.")).toBeVisible();

  await own.reload();
  await expect(own.getByRole("heading", { name: "Pay by card" })).toBeVisible();
  await expect(own.getByText("$96 / year")).toBeVisible();
  // Charged in the currency shown: nothing to convert.
  await expect(own.locator("[data-charge-line]")).toHaveCount(0);
});

test("a new client pays by card and is activated", async () => {
  await own.getByRole("button", { name: "Pay and activate" }).click();
  await expect(own.getByText("Enter your billing address.")).toBeVisible();
  await own.getByLabel("City").fill("Ankara");
  await own.getByLabel("Billing address").fill("Atatürk Bulvarı 10, Çankaya");
  await own.getByRole("button", { name: "Pay and activate" }).click();
  await expect(own.getByText("Total 96.00")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();

  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("status")).toContainText("Payment received. Your plan is active until");
  await expect(own.getByLabel("License key")).toBeVisible();
  const year = new Date().getUTCFullYear() + 1;
  await expect(own.getByRole("main")).toContainText(String(year));
  await expect(own.getByRole("heading", { name: "Extend by card" })).toBeVisible();
});

test("71 the receipt downloads as a PDF and came with the activation email", async () => {
  // License › Payments, and the receipt page.
  const payments = own.getByRole("region", { name: "Payments" });
  await pdfBehind(own, "Download PDF", payments);
  await payments.getByRole("link", { name: "Receipt" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\/receipts\/[0-9a-f-]+$/);
  await pdfBehind(own, "Download PDF");
  // Another account's receipt, or one that doesn't exist, is not found; signed out, it asks to sign in.
  expect((await own.request.get(`/dashboard/license/receipts/${crypto.randomUUID()}/pdf`)).status()).toBe(404);
  const signedOut = await own.context().browser()!.newContext({ baseURL: E2E.baseURL });
  const anonymous = await signedOut.request.get(new URL(`${own.url()}/pdf`).pathname, { maxRedirects: 0 });
  expect(anonymous.status()).toBe(303);
  await signedOut.close();
  await expectReceiptAttached(client.email, /^Your Yallapp account is active$/);
});

test("the team sees the payment", async () => {
  await admin.goto("/admin/payments");
  const row = admin.getByRole("row", { name: new RegExp(client.name) });
  await expect(row).toContainText("Paid");
  await expect(row).toContainText("$96");
  await expect(row).toContainText("5150");
  // 71 The receipt the client got, as a PDF.
  await pdfBehind(admin, "Receipt PDF", row);
  await row.getByRole("link", { name: client.name }).click();
  await expect(admin.getByRole("complementary")).toContainText("Card payments");
  await expect(admin.getByRole("complementary")).toContainText("Active");
});

test("the team puts the settings back", async () => {
  await admin.goto("/admin/plans");
  await admin.getByRole("region", { name: "Pro" }).getByRole("button", { name: "Back to the default plan" }).click();
  await admin.goto("/admin/settings/payments");
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("kashier");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();
  const iyzico = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await iyzico.getByRole("button", { name: "Remove keys" }).click();
  await expect(iyzico).toContainText("Now: not set.");
});
